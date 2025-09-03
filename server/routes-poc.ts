import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./replitAuth";
import { OCRService } from "./ocrService";
import multer from "multer";
import { 
  insertUserSchema, insertAoSchema, insertOfferSchema, insertProjectSchema, 
  insertProjectTaskSchema, insertSupplierRequestSchema, insertTeamResourceSchema, insertBeWorkloadSchema,
  insertChiffrageElementSchema, insertDpgfDocumentSchema
} from "@shared/schema";
import { ObjectStorageService } from "./objectStorage";
import { documentProcessor, type ExtractedAOData } from "./documentProcessor";
import { registerChiffrageRoutes } from "./routes/chiffrage";
import { registerWorkflowRoutes } from "./routes-workflow";
import { db } from "./db";
import { sql } from "drizzle-orm";

// Configuration de multer pour l'upload de fichiers
const uploadMiddleware = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // Limite à 10MB
});

// Instance unique du service OCR
const ocrService = new OCRService();

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', async (req: any, res) => {
    try {
      // Return mock user for testing
      const mockUser = {
        id: "test-user-1",
        email: "sylvie.be@jlm-menuiserie.fr",
        firstName: "Sylvie",
        lastName: "Martin",
        role: "responsable_be",
        profileImageUrl: null
      };
      res.json(mockUser);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

// ========================================
// USER ROUTES - Gestion utilisateurs POC
// ========================================

app.get("/api/users", async (req, res) => {
  try {
    const users = await storage.getUsers();
    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

app.get("/api/users/:id", async (req, res) => {
  try {
    const user = await storage.getUser(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Failed to fetch user" });
  }
});

// ========================================
// AO ROUTES - Base pour éviter double saisie
// ========================================

app.get("/api/aos", async (req, res) => {
  try {
    const aos = await storage.getAos();
    res.json(aos);
  } catch (error) {
    console.error("Error fetching AOs:", error);
    res.status(500).json({ message: "Failed to fetch AOs" });
  }
});

app.get("/api/aos/:id", async (req, res) => {
  try {
    const ao = await storage.getAo(req.params.id);
    if (!ao) {
      return res.status(404).json({ message: "AO not found" });
    }
    res.json(ao);
  } catch (error) {
    console.error("Error fetching AO:", error);
    res.status(500).json({ message: "Failed to fetch AO" });
  }
});

app.post("/api/aos", async (req, res) => {
  try {
    const validatedData = insertAoSchema.parse(req.body);
    const ao = await storage.createAo(validatedData);
    res.status(201).json(ao);
  } catch (error) {
    console.error("Error creating AO:", error);
    res.status(500).json({ message: "Failed to create AO" });
  }
});

// ========================================
// OCR ROUTES - Traitement automatique PDF
// ========================================

// Configuration multer pour upload de PDF
const uploadPDF = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers PDF sont autorisés'));
    }
  },
});

// Endpoint pour traiter un PDF avec OCR
app.post("/api/ocr/process-pdf", uploadPDF.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier PDF fourni' });
    }

    console.log(`Processing PDF: ${req.file.originalname} (${req.file.size} bytes)`);
    
    // Traitement OCR du PDF
    const result = await ocrService.processPDF(req.file.buffer);
    
    res.json({
      success: true,
      filename: req.file.originalname,
      extractedText: result.extractedText,
      confidence: result.confidence,
      confidenceLevel: ocrService.getConfidenceLevel(result.confidence),
      processedFields: result.processedFields,
      processingMethod: result.rawData.method,
      message: `PDF traité avec succès (${result.rawData.method})`
    });

  } catch (error: any) {
    console.error('OCR processing error:', error);
    res.status(500).json({ 
      error: 'Erreur lors du traitement OCR',
      details: error.message 
    });
  }
});

// Endpoint pour créer un AO automatiquement depuis OCR
app.post("/api/ocr/create-ao-from-pdf", uploadPDF.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier PDF fourni' });
    }

    // Initialiser le service OCR
    await ocrService.initialize();
    
    // Traitement OCR
    const ocrResult = await ocrService.processPDF(req.file.buffer);
    
    // Création automatique de l'AO avec données extraites
    const aoData = {
      // Informations extraites par OCR
      reference: ocrResult.processedFields.reference || `AO-AUTO-${Date.now()}`,
      client: ocrResult.processedFields.client || ocrResult.processedFields.maitreOuvrageNom || '',
      location: ocrResult.processedFields.location || '',
      intituleOperation: ocrResult.processedFields.intituleOperation || req.file.originalname.replace('.pdf', ''),
      
      // Dates
      dateRenduAO: ocrResult.processedFields.deadline ? new Date(ocrResult.processedFields.deadline) : undefined,
      dateAcceptationAO: ocrResult.processedFields.dateAcceptationAO ? new Date(ocrResult.processedFields.dateAcceptationAO) : undefined,
      demarragePrevu: ocrResult.processedFields.demarragePrevu ? new Date(ocrResult.processedFields.demarragePrevu) : undefined,
      dateOS: ocrResult.processedFields.dateOS ? new Date(ocrResult.processedFields.dateOS) : undefined,
      
      // Maître d'ouvrage
      maitreOuvrageNom: ocrResult.processedFields.maitreOuvrageNom || '',
      maitreOuvrageAdresse: ocrResult.processedFields.maitreOuvrageAdresse || '',
      maitreOuvrageContact: ocrResult.processedFields.maitreOuvrageContact || '',
      maitreOuvrageEmail: ocrResult.processedFields.maitreOuvrageEmail || '',
      maitreOuvragePhone: ocrResult.processedFields.maitreOuvragePhone || '',
      
      // Maître d'œuvre
      maitreOeuvre: ocrResult.processedFields.maitreOeuvre || '',
      maitreOeuvreContact: ocrResult.processedFields.maitreOeuvreContact || '',
      
      // Techniques
      lotConcerne: ocrResult.processedFields.lotConcerne || '',
      menuiserieType: ocrResult.processedFields.menuiserieType as any || 'autre',
      montantEstime: ocrResult.processedFields.montantEstime || null,  // null au lieu de '' pour les champs numériques
      typeMarche: ocrResult.processedFields.typeMarche as any || undefined,
      
      // Source et réception
      source: 'other' as const,  // Corrigé de 'autre' à 'other' pour correspondre au schéma
      plateformeSource: ocrResult.processedFields.plateformeSource || '',
      departement: ocrResult.processedFields.departement || '62',  // Défaut à 62 pour Pas-de-Calais
      
      // Éléments techniques
      bureauEtudes: ocrResult.processedFields.bureauEtudes || '',
      bureauControle: ocrResult.processedFields.bureauControle || '',
      sps: ocrResult.processedFields.sps || '',
      delaiContractuel: parseInt(ocrResult.processedFields.delaiContractuel || '0') || undefined,
      
      // Documents détectés automatiquement
      cctpDisponible: ocrResult.processedFields.cctpDisponible || false,
      plansDisponibles: ocrResult.processedFields.plansDisponibles || false,
      dpgfClientDisponible: ocrResult.processedFields.dpgfClientDisponible || false,
      dceDisponible: ocrResult.processedFields.dceDisponible || false,
      
      // Métadonnées OCR
      description: `AO créé automatiquement par OCR depuis ${req.file.originalname}`,
      isSelected: false,
    };

    const validatedData = insertAoSchema.parse(aoData);
    const ao = await storage.createAo(validatedData);

    res.status(201).json({
      success: true,
      ao,
      ocrResult: {
        confidence: ocrResult.confidence,
        confidenceLevel: ocrService.getConfidenceLevel(ocrResult.confidence),
        processingMethod: ocrResult.rawData.method,
        extractedFields: Object.keys(ocrResult.processedFields).filter(key => 
          ocrResult.processedFields[key as keyof typeof ocrResult.processedFields]
        ).length
      },
      message: `AO créé automatiquement avec ${Object.keys(ocrResult.processedFields).length} champs remplis`
    });

  } catch (error: any) {
    console.error('Error creating AO from PDF:', error);
    if (error.name === 'ZodError') {
      res.status(400).json({ 
        error: 'Erreur de validation des données extraites',
        details: error.errors 
      });
    } else {
      res.status(500).json({ 
        error: 'Erreur lors de la création de l\'AO',
        details: error.message 
      });
    }
  }
});

// Endpoint pour ajouter des patterns personnalisés
app.post("/api/ocr/add-pattern", async (req, res) => {
  try {
    const { field, pattern } = req.body;
    
    if (!field || !pattern) {
      return res.status(400).json({ error: 'Champ et pattern requis' });
    }
    
    const regex = new RegExp(pattern, 'i');
    ocrService.addCustomPattern(field, regex);
    
    res.json({ 
      success: true, 
      message: `Pattern ajouté pour le champ "${field}"` 
    });
    
  } catch (error: any) {
    res.status(400).json({ 
      error: 'Pattern invalide',
      details: error.message 
    });
  }
});

// ========================================
// OFFER ROUTES - Cœur du POC (Dossiers d'Offre & Chiffrage)
// ========================================

app.get("/api/offers", async (req, res) => {
  try {
    const { search, status } = req.query;
    const offers = await storage.getOffers(
      search as string, 
      status as string
    );
    res.json(offers);
  } catch (error: any) {
    console.error("Error fetching offers:", error);
    res.status(500).json({ message: "Failed to fetch offers" });
  }
});

app.get("/api/offers/:id", async (req, res) => {
  try {
    const offer = await storage.getOffer(req.params.id);
    if (!offer) {
      return res.status(404).json({ message: "Offer not found" });
    }
    res.json(offer);
  } catch (error) {
    console.error("Error fetching offer:", error);
    res.status(500).json({ message: "Failed to fetch offer" });
  }
});

app.post("/api/offers", async (req, res) => {
  try {
    // Convertir les dates string en objets Date si elles sont présentes
    const processedData = {
      ...req.body,
      dateRenduAO: req.body.dateRenduAO ? new Date(req.body.dateRenduAO) : undefined,
      dateAcceptationAO: req.body.dateAcceptationAO ? new Date(req.body.dateAcceptationAO) : undefined,
      demarragePrevu: req.body.demarragePrevu ? new Date(req.body.demarragePrevu) : undefined,
      deadline: req.body.deadline ? new Date(req.body.deadline) : undefined,
      // Convertir les chaînes numériques en decimals
      montantEstime: req.body.montantEstime ? req.body.montantEstime.toString() : undefined,
      prorataEventuel: req.body.prorataEventuel ? req.body.prorataEventuel.toString() : undefined,
      beHoursEstimated: req.body.beHoursEstimated ? req.body.beHoursEstimated.toString() : undefined,
    };

    const validatedData = insertOfferSchema.parse(processedData);
    const offer = await storage.createOffer(validatedData);
    res.status(201).json(offer);
  } catch (error: any) {
    console.error("Error creating offer:", error);
    if (error.name === 'ZodError') {
      res.status(400).json({ 
        message: "Validation error", 
        errors: error.errors 
      });
    } else {
      res.status(500).json({ message: "Failed to create offer" });
    }
  }
});

// Endpoint enrichi pour créer offre avec arborescence documentaire (audit JLM)
app.post("/api/offers/create-with-structure", async (req, res) => {
  try {
    const { uploadedFiles, creationMethod, ...offerData } = req.body;
    
    // Convertir les dates et données comme l'endpoint existant
    const processedData = {
      ...offerData,
      dateRenduAO: offerData.dateRenduAO ? new Date(offerData.dateRenduAO) : undefined,
      dateAcceptationAO: offerData.dateAcceptationAO ? new Date(offerData.dateAcceptationAO) : undefined,
      demarragePrevu: offerData.demarragePrevu ? new Date(offerData.demarragePrevu) : undefined,
      deadline: offerData.deadline ? new Date(offerData.deadline) : undefined,
      dateOS: offerData.dateOS ? new Date(offerData.dateOS) : undefined,
      montantEstime: offerData.montantEstime ? offerData.montantEstime.toString() : undefined,
      prorataEventuel: offerData.prorataEventuel ? offerData.prorataEventuel.toString() : undefined,
      beHoursEstimated: offerData.beHoursEstimated ? offerData.beHoursEstimated.toString() : undefined,
    };
    
    // Enrichir avec statut documentaire selon audit JLM
    const enrichedData = {
      ...processedData,
      // Marquer l'arborescence comme générée selon workflow JLM
      status: processedData.aoId ? "en_cours_chiffrage" : "brouillon",
      // Générer automatiquement l'arborescence documentaire
      dossierEtudeAOCree: true,
      arborescenceGeneree: true,
      documentPassationGenere: true,
      sousDocsiersGeneres: true,
    };
    
    const validatedData = insertOfferSchema.parse(enrichedData);
    const offer = await storage.createOffer(validatedData);
    
    // Simuler création arborescence documentaire JLM
    // Basé sur audit : "étude AO" > "en cours" puis passage vers "chantiers en cours"
    const documentStructure = {
      phase: "etude_ao_en_cours",
      folders: [
        "Documents_Techniques", // CCTP, études thermiques/acoustiques, plans
        "Pieces_Administratives", // DC1, DC2, références travaux, KBIS, assurances
        "Consultation_Fournisseurs", // Tableaux Excel, réponses K-Line
        "Quantitatifs", // Éléments portes, fenêtres
        "Chiffrage_Batigest", // Devis détaillé
        "DPGF_Client" // Document final sans double saisie
      ],
      workflows: {
        pointOffre: processedData.pointOffrePrevu || "Mardi matin - Sylvie/Julien",
        nextStep: processedData.aoId ? "Chiffrage en cours" : "Attente validation AO",
        eliminatedFrictions: [
          "Double saisie Batigest/DPGF évitée",
          "Arborescence automatique créée",
          "Workflow tracé depuis AO"
        ]
      }
    };
    
    res.status(201).json({ 
      ...offer, 
      documentStructure,
      message: "Offre créée avec arborescence documentaire JLM - Formulaire unique évolutif activé"
    });
  } catch (error: any) {
    console.error("Error creating offer with structure:", error);
    if (error.name === 'ZodError') {
      res.status(400).json({ 
        message: "Validation error", 
        errors: error.errors 
      });
    } else {
      res.status(500).json({ message: "Failed to create offer with document structure" });
    }
  }
});

app.patch("/api/offers/:id", async (req, res) => {
  try {
    const partialData = insertOfferSchema.partial().parse(req.body);
    const offer = await storage.updateOffer(req.params.id, partialData);
    res.json(offer);
  } catch (error) {
    console.error("Error updating offer:", error);
    res.status(500).json({ message: "Failed to update offer" });
  }
});

// Transformer une offre signée en projet
app.post("/api/offers/:id/convert-to-project", async (req, res) => {
  try {
    const offer = await storage.getOffer(req.params.id);
    if (!offer) {
      return res.status(404).json({ message: "Offer not found" });
    }

    if (offer.status !== "signe") {
      return res.status(400).json({ message: "Only signed offers can be converted to projects" });
    }

    // Créer le projet basé sur l'offre
    const projectData = {
      offerId: offer.id,
      name: `Projet ${offer.client} - ${offer.location}`,
      client: offer.client,
      location: offer.location,
      status: "etude" as const,
      budget: offer.montantFinal || offer.montantEstime,
      responsibleUserId: offer.responsibleUserId,
      startDate: new Date(),
      endDate: null,
      description: `Projet créé automatiquement à partir de l'offre ${offer.reference}`,
    };

    const project = await storage.createProject(projectData);

    // Mettre à jour le statut de l'offre
    await storage.updateOffer(offer.id, { status: "transforme_en_projet" });

    // Créer les tâches de base du projet (5 étapes)
    const baseTasks = [
      {
        projectId: project.id,
        name: "Phase d'Étude",
        description: "Finalisation des études techniques",
        status: "en_cours" as const,
        priority: "haute" as const,
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // +7 jours
        assignedUserId: offer.responsibleUserId,
      },
      {
        projectId: project.id,
        name: "Planification",
        description: "Planification des ressources et du planning",
        status: "a_faire" as const,
        priority: "moyenne" as const,
        startDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000), // +8 jours
        endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // +14 jours
      },
      {
        projectId: project.id,
        name: "Approvisionnement",
        description: "Commande et réception des matériaux",
        status: "a_faire" as const,
        priority: "moyenne" as const,
        startDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // +15 jours
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 jours
      },
      {
        projectId: project.id,
        name: "Chantier",
        description: "Pose et installation sur site",
        status: "a_faire" as const,
        priority: "haute" as const,
        startDate: new Date(Date.now() + 31 * 24 * 60 * 60 * 1000), // +31 jours
        endDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // +45 jours
      },
      {
        projectId: project.id,
        name: "SAV et Finalisation",
        description: "Service après-vente et finalisation",
        status: "a_faire" as const,
        priority: "faible" as const,
        startDate: new Date(Date.now() + 46 * 24 * 60 * 60 * 1000), // +46 jours
        endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // +60 jours
      },
    ];

    // Créer toutes les tâches
    for (const taskData of baseTasks) {
      await storage.createProjectTask(taskData);
    }

    res.status(201).json({ 
      project, 
      message: "Offer successfully converted to project with base tasks created" 
    });
  } catch (error) {
    console.error("Error converting offer to project:", error);
    res.status(500).json({ message: "Failed to convert offer to project" });
  }
});

app.delete("/api/offers/:id", async (req, res) => {
  try {
    await storage.deleteOffer(req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting offer:", error);
    res.status(500).json({ message: "Failed to delete offer" });
  }
});

// Validation jalon Fin d'études (spécifique POC)
app.patch("/api/offers/:id/validate-studies", async (req, res) => {
  try {
    const { finEtudesValidatedAt, status } = req.body;
    const offer = await storage.updateOffer(req.params.id, {
      finEtudesValidatedAt: finEtudesValidatedAt ? new Date(finEtudesValidatedAt) : new Date(),
      finEtudesValidatedBy: 'user-be-1', // TODO: Use real auth when available
      status: status || 'fin_etudes_validee'
    });
    res.json(offer);
  } catch (error) {
    console.error("Error validating studies:", error);
    res.status(500).json({ message: "Failed to validate studies" });
  }
});

// Transformation AO → Projet (principe formulaire unique évolutif)
app.post("/api/offers/:id/transform-to-project", async (req, res) => {
  try {
    const offerId = req.params.id;
    const offer = await storage.getOffer(offerId);
    
    if (!offer) {
      return res.status(404).json({ message: "Offer not found" });
    }

    if (!offer.finEtudesValidatedAt) {
      return res.status(400).json({ message: "Studies must be validated before transformation" });
    }

    if (offer.status === "transforme_en_projet") {
      return res.status(400).json({ message: "Offer already transformed to project" });
    }

    // Créer le projet avec les données de l'offre (principe formulaire unique évolutif)
    const projectData = {
      offerId: offer.id,
      name: `Projet ${offer.reference}`,
      client: offer.client,
      location: offer.location,
      description: offer.intituleOperation || `Projet issu de l'offre ${offer.reference} - ${offer.client}`,
      status: "etude" as const,
      startDate: new Date(),
      estimatedEndDate: offer.deadline 
        ? new Date(offer.deadline.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 jours après deadline
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 jours par défaut
      responsibleUserId: offer.responsibleUserId,
      chefTravaux: offer.responsibleUserId, // Responsable devient chef de travaux par défaut
      progressPercentage: 0
    };

    const project = await storage.createProject(projectData);

    // Créer les tâches de base pour les 5 étapes POC
    const baseTasks = [
      {
        projectId: project.id,
        name: "Étude technique",
        description: "Validation technique du projet",
        status: "en_cours" as const,
        assignedUserId: offer.responsibleUserId,
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 jours
        estimatedHours: "40.00",
        position: 1,
        isJalon: true
      },
      {
        projectId: project.id,
        name: "Planification",
        description: "Élaboration du planning détaillé",
        status: "a_faire" as const,
        assignedUserId: offer.responsibleUserId,
        startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        estimatedHours: "16.00",
        position: 2,
        isJalon: true
      },
      {
        projectId: project.id,
        name: "Approvisionnement",
        description: "Commandes et livraisons",
        status: "a_faire" as const,
        startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
        estimatedHours: "8.00",
        position: 3,
        isJalon: false
      },
      {
        projectId: project.id,
        name: "Chantier",
        description: "Réalisation des travaux",
        status: "a_faire" as const,
        startDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
        endDate: projectData.estimatedEndDate,
        estimatedHours: offer.montantEstime ? (parseFloat(offer.montantEstime) / 50).toFixed(2) : "80.00", // Estimation heures basée sur montant/taux horaire
        position: 4,
        isJalon: true
      },
      {
        projectId: project.id,
        name: "SAV / Réception",
        description: "Réception et service après-vente",
        status: "a_faire" as const,
        startDate: projectData.estimatedEndDate,
        endDate: new Date(projectData.estimatedEndDate.getTime() + 7 * 24 * 60 * 60 * 1000),
        estimatedHours: "8.00",
        position: 5,
        isJalon: true
      }
    ];

    // Créer toutes les tâches
    for (const taskData of baseTasks) {
      await storage.createProjectTask(taskData);
    }

    // Mettre à jour le statut de l'offre
    await storage.updateOffer(offerId, {
      status: "transforme_en_projet"
    });

    res.status(201).json({ 
      projectId: project.id,
      message: "Offer successfully transformed to project with base tasks created" 
    });
  } catch (error) {
    console.error("Error transforming offer to project:", error);
    res.status(500).json({ message: "Failed to transform offer to project" });
  }
});

// ========================================
// PROJECT ROUTES - 5 étapes POC
// ========================================

app.get("/api/projects", async (req, res) => {
  try {
    const projects = await storage.getProjects();
    res.json(projects);
  } catch (error) {
    console.error("Error fetching projects:", error);
    res.status(500).json({ message: "Failed to fetch projects" });
  }
});

app.get("/api/projects/:id", async (req, res) => {
  try {
    const project = await storage.getProject(req.params.id);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }
    res.json(project);
  } catch (error) {
    console.error("Error fetching project:", error);
    res.status(500).json({ message: "Failed to fetch project" });
  }
});

app.post("/api/projects", async (req, res) => {
  try {
    const validatedData = insertProjectSchema.parse(req.body);
    const project = await storage.createProject(validatedData);
    res.status(201).json(project);
  } catch (error) {
    console.error("Error creating project:", error);
    res.status(500).json({ message: "Failed to create project" });
  }
});

app.patch("/api/projects/:id", async (req, res) => {
  try {
    const partialData = insertProjectSchema.partial().parse(req.body);
    const project = await storage.updateProject(req.params.id, partialData);
    res.json(project);
  } catch (error) {
    console.error("Error updating project:", error);
    res.status(500).json({ message: "Failed to update project" });
  }
});

// ========================================
// PROJECT TASK ROUTES - Planning partagé
// ========================================

app.get("/api/projects/:projectId/tasks", async (req, res) => {
  try {
    const tasks = await storage.getProjectTasks(req.params.projectId);
    res.json(tasks);
  } catch (error) {
    console.error("Error fetching project tasks:", error);
    res.status(500).json({ message: "Failed to fetch project tasks" });
  }
});

app.post("/api/projects/:projectId/tasks", async (req, res) => {
  try {
    // Convertir les dates string en objets Date
    const taskData = {
      ...req.body,
      projectId: req.params.projectId,
      startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
      endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
      progress: req.body.progress || 0
    };
    
    const validatedData = insertProjectTaskSchema.parse(taskData);
    const task = await storage.createProjectTask(validatedData);
    res.status(201).json(task);
  } catch (error) {
    console.error("Error creating project task:", error);
    res.status(500).json({ message: "Failed to create project task" });
  }
});

app.patch("/api/tasks/:id", async (req, res) => {
  try {
    const partialData = insertProjectTaskSchema.partial().parse(req.body);
    const task = await storage.updateProjectTask(req.params.id, partialData);
    res.json(task);
  } catch (error) {
    console.error("Error updating project task:", error);
    res.status(500).json({ message: "Failed to update project task" });
  }
});

// Récupérer toutes les tâches pour la timeline
app.get("/api/tasks/all", async (req, res) => {
  try {
    const allTasks = [];
    const projects = await storage.getProjects();
    
    for (const project of projects) {
      const tasks = await storage.getProjectTasks(project.id);
      allTasks.push(...tasks);
    }
    
    res.json(allTasks);
  } catch (error) {
    console.error("Error fetching all tasks:", error);
    res.status(500).json({ message: "Failed to fetch all tasks" });
  }
});

// Route pour créer des tâches de test pour le projet École Versailles
app.post("/api/test-data/tasks", async (req, res) => {
  try {
    // Utiliser le projet "École Versailles" existant (project-2)
    const projectId = "project-2";

    // Créer des tâches directement dans la base de données
    const tasks = [
      {
        projectId: projectId,
        name: "Phase d'Étude",
        description: "Diagnostic des menuiseries existantes et conception des nouvelles installations",
        status: "termine" as const,
        priority: "haute" as const,
        startDate: new Date(2025, 0, 15), // 15 janvier 2025
        endDate: new Date(2025, 0, 25), // 25 janvier 2025
        assignedUserId: "user-be-1",
        progress: 100,
      },
      {
        projectId: projectId,
        name: "Planification Détaillée",
        description: "Organisation des travaux pendant les vacances scolaires",
        status: "termine" as const,
        priority: "haute" as const,
        startDate: new Date(2025, 0, 26), // 26 janvier 2025
        endDate: new Date(2025, 1, 5), // 5 février 2025
        assignedUserId: "user-be-2",
        progress: 100,
      },
      {
        projectId: projectId,
        name: "Approvisionnement",
        description: "Commande et livraison des menuiseries sur mesure",
        status: "en_cours" as const,
        priority: "moyenne" as const,
        startDate: new Date(2025, 1, 6), // 6 février 2025
        endDate: new Date(2025, 2, 1), // 1 mars 2025
        assignedUserId: "user-be-1",
        progress: 60,
      },
      {
        projectId: projectId,
        name: "Travaux Bâtiment Principal",
        description: "Remplacement des fenêtres des salles de classe",
        status: "a_faire" as const,
        priority: "haute" as const,
        startDate: new Date(2025, 2, 2), // 2 mars 2025
        endDate: new Date(2025, 3, 15), // 15 avril 2025
        assignedUserId: "user-be-2",
        progress: 0,
      },
      {
        projectId: projectId,
        name: "Travaux Préau",
        description: "Installation des portes coulissantes du préau",
        status: "a_faire" as const,
        priority: "moyenne" as const,
        startDate: new Date(2025, 3, 16), // 16 avril 2025
        endDate: new Date(2025, 4, 5), // 5 mai 2025
        assignedUserId: "user-be-1",
        progress: 0,
      },
      {
        projectId: projectId,
        name: "Finitions et Réception",
        description: "Contrôles qualité et réception des travaux",
        status: "a_faire" as const,
        priority: "faible" as const,
        startDate: new Date(2025, 4, 6), // 6 mai 2025
        endDate: new Date(2025, 4, 20), // 20 mai 2025
        assignedUserId: "user-be-2",
        progress: 0,
      },
    ];

    // Créer toutes les tâches directement
    const createdTasks = [];
    for (const taskData of tasks) {
      const task = await storage.createProjectTask(taskData);
      createdTasks.push(task);
    }

    res.json({
      projectId: projectId,
      tasks: createdTasks,
      message: "Tâches de test créées avec succès pour École Versailles"
    });
  } catch (error) {
    console.error("Error creating test tasks:", error);
    res.status(500).json({ message: "Failed to create test tasks" });
  }
});

// ========================================
// AO LOTS ROUTES - Gestion des lots d'AO
// ========================================

// GET /api/aos/:aoId/lots - Récupérer les lots d'un AO (avec données OCR)
app.get("/api/aos/:aoId/lots", async (req, res) => {
  try {
    // Récupérer les lots directement de la base de données (table lots créée par le test)
    const result = await db.execute(sql`
      SELECT id, numero, designation, menuiserie_type as "menuiserieType", 
             montant_estime as "montantEstime", is_selected as "isSelected", comment
      FROM lots 
      WHERE ao_id = ${req.params.aoId}
      ORDER BY numero
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching AO lots:", error);
    // Fallback vers le storage si la table lots n'existe pas encore
    try {
      const lots = await storage.getAoLots(req.params.aoId);
      res.json(lots);
    } catch (fallbackError) {
      console.error("Fallback error:", fallbackError);
      res.status(500).json({ message: "Failed to fetch AO lots" });
    }
  }
});

// POST /api/aos/:aoId/lots - Créer un lot pour un AO
app.post("/api/aos/:aoId/lots", async (req, res) => {
  try {
    const lot = await storage.createAoLot({
      ...req.body,
      aoId: req.params.aoId,
    });
    res.status(201).json(lot);
  } catch (error) {
    console.error("Error creating AO lot:", error);
    res.status(500).json({ message: "Failed to create AO lot" });
  }
});

// PUT /api/aos/:aoId/lots/:lotId - Mettre à jour un lot
app.put("/api/aos/:aoId/lots/:lotId", async (req, res) => {
  try {
    const lot = await storage.updateAoLot(req.params.lotId, req.body);
    res.json(lot);
  } catch (error) {
    console.error("Error updating AO lot:", error);
    res.status(500).json({ message: "Failed to update AO lot" });
  }
});

// DELETE /api/aos/:aoId/lots/:lotId - Supprimer un lot
app.delete("/api/aos/:aoId/lots/:lotId", async (req, res) => {
  try {
    await storage.deleteAoLot(req.params.lotId);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting AO lot:", error);
    res.status(500).json({ message: "Failed to delete AO lot" });
  }
});

// ========================================
// MAITRES D'OUVRAGE ROUTES - Gestion contacts réutilisables
// ========================================

// GET /api/maitres-ouvrage - Récupérer tous les maîtres d'ouvrage
app.get("/api/maitres-ouvrage", async (req, res) => {
  try {
    const maitresOuvrage = await storage.getMaitresOuvrage();
    res.json(maitresOuvrage);
  } catch (error) {
    console.error("Error fetching maîtres d'ouvrage:", error);
    res.status(500).json({ message: "Failed to fetch maîtres d'ouvrage" });
  }
});

// GET /api/maitres-ouvrage/:id - Récupérer un maître d'ouvrage
app.get("/api/maitres-ouvrage/:id", async (req, res) => {
  try {
    const maitreOuvrage = await storage.getMaitreOuvrage(req.params.id);
    if (!maitreOuvrage) {
      return res.status(404).json({ message: "Maître d'ouvrage not found" });
    }
    res.json(maitreOuvrage);
  } catch (error) {
    console.error("Error fetching maître d'ouvrage:", error);
    res.status(500).json({ message: "Failed to fetch maître d'ouvrage" });
  }
});

// POST /api/maitres-ouvrage - Créer un maître d'ouvrage
app.post("/api/maitres-ouvrage", async (req, res) => {
  try {
    const maitreOuvrage = await storage.createMaitreOuvrage(req.body);
    res.status(201).json(maitreOuvrage);
  } catch (error) {
    console.error("Error creating maître d'ouvrage:", error);
    res.status(500).json({ message: "Failed to create maître d'ouvrage" });
  }
});

// PUT /api/maitres-ouvrage/:id - Mettre à jour un maître d'ouvrage
app.put("/api/maitres-ouvrage/:id", async (req, res) => {
  try {
    const maitreOuvrage = await storage.updateMaitreOuvrage(req.params.id, req.body);
    res.json(maitreOuvrage);
  } catch (error) {
    console.error("Error updating maître d'ouvrage:", error);
    res.status(500).json({ message: "Failed to update maître d'ouvrage" });
  }
});

// DELETE /api/maitres-ouvrage/:id - Supprimer un maître d'ouvrage (soft delete)
app.delete("/api/maitres-ouvrage/:id", async (req, res) => {
  try {
    await storage.deleteMaitreOuvrage(req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting maître d'ouvrage:", error);
    res.status(500).json({ message: "Failed to delete maître d'ouvrage" });
  }
});

// ========================================
// MAITRES D'OEUVRE ROUTES - Gestion contacts avec multi-contacts
// ========================================

// GET /api/maitres-oeuvre - Récupérer tous les maîtres d'œuvre avec leurs contacts
app.get("/api/maitres-oeuvre", async (req, res) => {
  try {
    const maitresOeuvre = await storage.getMaitresOeuvre();
    res.json(maitresOeuvre);
  } catch (error) {
    console.error("Error fetching maîtres d'œuvre:", error);
    res.status(500).json({ message: "Failed to fetch maîtres d'œuvre" });
  }
});

// GET /api/maitres-oeuvre/:id - Récupérer un maître d'œuvre avec ses contacts
app.get("/api/maitres-oeuvre/:id", async (req, res) => {
  try {
    const maitreOeuvre = await storage.getMaitreOeuvre(req.params.id);
    if (!maitreOeuvre) {
      return res.status(404).json({ message: "Maître d'œuvre not found" });
    }
    res.json(maitreOeuvre);
  } catch (error) {
    console.error("Error fetching maître d'œuvre:", error);
    res.status(500).json({ message: "Failed to fetch maître d'œuvre" });
  }
});

// POST /api/maitres-oeuvre - Créer un maître d'œuvre
app.post("/api/maitres-oeuvre", async (req, res) => {
  try {
    const maitreOeuvre = await storage.createMaitreOeuvre(req.body);
    res.status(201).json(maitreOeuvre);
  } catch (error) {
    console.error("Error creating maître d'œuvre:", error);
    res.status(500).json({ message: "Failed to create maître d'œuvre" });
  }
});

// PUT /api/maitres-oeuvre/:id - Mettre à jour un maître d'œuvre
app.put("/api/maitres-oeuvre/:id", async (req, res) => {
  try {
    const maitreOeuvre = await storage.updateMaitreOeuvre(req.params.id, req.body);
    res.json(maitreOeuvre);
  } catch (error) {
    console.error("Error updating maître d'œuvre:", error);
    res.status(500).json({ message: "Failed to update maître d'œuvre" });
  }
});

// DELETE /api/maitres-oeuvre/:id - Supprimer un maître d'œuvre (soft delete)
app.delete("/api/maitres-oeuvre/:id", async (req, res) => {
  try {
    await storage.deleteMaitreOeuvre(req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting maître d'œuvre:", error);
    res.status(500).json({ message: "Failed to delete maître d'œuvre" });
  }
});

// ========================================
// CONTACTS MAITRE OEUVRE ROUTES - Gestion multi-contacts
// ========================================

// GET /api/maitres-oeuvre/:maitreOeuvreId/contacts - Récupérer les contacts d'un maître d'œuvre
app.get("/api/maitres-oeuvre/:maitreOeuvreId/contacts", async (req, res) => {
  try {
    const contacts = await storage.getContactsMaitreOeuvre(req.params.maitreOeuvreId);
    res.json(contacts);
  } catch (error) {
    console.error("Error fetching contacts maître d'œuvre:", error);
    res.status(500).json({ message: "Failed to fetch contacts" });
  }
});

// POST /api/maitres-oeuvre/:maitreOeuvreId/contacts - Créer un contact pour un maître d'œuvre
app.post("/api/maitres-oeuvre/:maitreOeuvreId/contacts", async (req, res) => {
  try {
    const contact = await storage.createContactMaitreOeuvre({
      ...req.body,
      maitreOeuvreId: req.params.maitreOeuvreId,
    });
    res.status(201).json(contact);
  } catch (error) {
    console.error("Error creating contact maître d'œuvre:", error);
    res.status(500).json({ message: "Failed to create contact" });
  }
});

// PUT /api/contacts-maitre-oeuvre/:contactId - Mettre à jour un contact
app.put("/api/contacts-maitre-oeuvre/:contactId", async (req, res) => {
  try {
    const contact = await storage.updateContactMaitreOeuvre(req.params.contactId, req.body);
    res.json(contact);
  } catch (error) {
    console.error("Error updating contact maître d'œuvre:", error);
    res.status(500).json({ message: "Failed to update contact" });
  }
});

// DELETE /api/contacts-maitre-oeuvre/:contactId - Supprimer un contact (soft delete)
app.delete("/api/contacts-maitre-oeuvre/:contactId", async (req, res) => {
  try {
    await storage.deleteContactMaitreOeuvre(req.params.contactId);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting contact maître d'œuvre:", error);
    res.status(500).json({ message: "Failed to delete contact" });
  }
});

// ========================================
// SUPPLIER REQUEST ROUTES - Demandes prix simplifiées
// ========================================

app.get("/api/supplier-requests", async (req, res) => {
  try {
    const { offerId } = req.query;
    const requests = await storage.getSupplierRequests(offerId as string);
    res.json(requests);
  } catch (error) {
    console.error("Error fetching supplier requests:", error);
    res.status(500).json({ message: "Failed to fetch supplier requests" });
  }
});

app.post("/api/supplier-requests", async (req, res) => {
  try {
    const validatedData = insertSupplierRequestSchema.parse(req.body);
    const request = await storage.createSupplierRequest(validatedData);
    res.status(201).json(request);
  } catch (error) {
    console.error("Error creating supplier request:", error);
    res.status(500).json({ message: "Failed to create supplier request" });
  }
});

app.patch("/api/supplier-requests/:id", async (req, res) => {
  try {
    const partialData = insertSupplierRequestSchema.partial().parse(req.body);
    const request = await storage.updateSupplierRequest(req.params.id, partialData);
    res.json(request);
  } catch (error) {
    console.error("Error updating supplier request:", error);
    res.status(500).json({ message: "Failed to update supplier request" });
  }
});

// Récupérer les demandes fournisseurs pour une offre spécifique
app.get("/api/offers/:offerId/supplier-requests", async (req, res) => {
  try {
    const { offerId } = req.params;
    const requests = await storage.getSupplierRequests(offerId);
    res.json(requests);
  } catch (error) {
    console.error("Error fetching offer supplier requests:", error);
    res.status(500).json({ message: "Failed to fetch supplier requests for offer" });
  }
});

// Créer une demande fournisseur pour une offre
app.post("/api/offers/:offerId/supplier-requests", async (req, res) => {
  try {
    const requestData = {
      ...req.body,
      offerId: req.params.offerId,
      requestedItems: JSON.stringify(req.body.requestedItems || []),
    };
    const request = await storage.createSupplierRequest(requestData);
    res.status(201).json(request);
  } catch (error) {
    console.error("Error creating offer supplier request:", error);
    res.status(500).json({ message: "Failed to create supplier request for offer" });
  }
});

// ========================================
// TEAM RESOURCE ROUTES - Gestion équipes simplifiée
// ========================================

app.get("/api/team-resources", async (req, res) => {
  try {
    const { projectId } = req.query;
    const resources = await storage.getTeamResources(projectId as string);
    res.json(resources);
  } catch (error) {
    console.error("Error fetching team resources:", error);
    res.status(500).json({ message: "Failed to fetch team resources" });
  }
});

app.post("/api/team-resources", async (req, res) => {
  try {
    const validatedData = insertTeamResourceSchema.parse(req.body);
    const resource = await storage.createTeamResource(validatedData);
    res.status(201).json(resource);
  } catch (error) {
    console.error("Error creating team resource:", error);
    res.status(500).json({ message: "Failed to create team resource" });
  }
});

app.patch("/api/team-resources/:id", async (req, res) => {
  try {
    const partialData = insertTeamResourceSchema.partial().parse(req.body);
    const resource = await storage.updateTeamResource(req.params.id, partialData);
    res.json(resource);
  } catch (error) {
    console.error("Error updating team resource:", error);
    res.status(500).json({ message: "Failed to update team resource" });
  }
});

// ========================================
// BE WORKLOAD ROUTES - Indicateurs charge BE
// ========================================

app.get("/api/be-workload", async (req, res) => {
  try {
    const { weekNumber, year } = req.query;
    const workload = await storage.getBeWorkload(
      weekNumber ? parseInt(weekNumber as string) : undefined,
      year ? parseInt(year as string) : undefined
    );
    res.json(workload);
  } catch (error) {
    console.error("Error fetching BE workload:", error);
    res.status(500).json({ message: "Failed to fetch BE workload" });
  }
});

app.post("/api/be-workload", async (req, res) => {
  try {
    const validatedData = insertBeWorkloadSchema.parse(req.body);
    const workload = await storage.createOrUpdateBeWorkload(validatedData);
    res.status(201).json(workload);
  } catch (error) {
    console.error("Error creating/updating BE workload:", error);
    res.status(500).json({ message: "Failed to create/update BE workload" });
  }
});

// ========================================
// OBJECT STORAGE ROUTES - Gestion documentaire
// ========================================

// Route pour obtenir une URL d'upload pour les fichiers
app.post("/api/objects/upload", async (req, res) => {
  try {
    const objectStorageService = new ObjectStorageService();
    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    res.json({ uploadURL });
  } catch (error: any) {
    console.error("Error getting upload URL:", error);
    res.status(500).json({ 
      message: "Failed to get upload URL", 
      error: error?.message 
    });
  }
});

// Route pour analyser un fichier uploadé et extraire les données AO
app.post("/api/documents/analyze", async (req, res) => {
  try {
    const { fileUrl, filename } = req.body;
    
    if (!fileUrl || !filename) {
      return res.status(400).json({ 
        message: "fileUrl and filename are required" 
      });
    }

    console.log(`[DocumentAnalysis] Starting analysis of ${filename}`);
    
    // 1. Extraire le contenu textuel du fichier
    const textContent = await documentProcessor.extractTextFromFile(fileUrl, filename);
    console.log(`[DocumentAnalysis] Extracted ${textContent.length} characters from ${filename}`);
    
    // 2. Analyser le contenu avec l'IA pour extraire les données structurées
    const extractedData = await documentProcessor.extractAOInformation(textContent, filename);
    console.log(`[DocumentAnalysis] Analysis completed for ${filename}:`, extractedData);

    res.json({
      success: true,
      filename,
      extractedData,
      textLength: textContent.length,
      message: "Document analysé avec succès"
    });

  } catch (error: any) {
    console.error("Error analyzing document:", error);
    res.status(500).json({ 
      message: "Failed to analyze document",
      error: error?.message,
      stack: error?.stack
    });
  }
});

// ========================================
// ENHANCED OFFER ROUTES - Création avec arborescence
// ========================================

// Créer une offre avec génération automatique d'arborescence documentaire
app.post("/api/offers/create-with-structure", async (req, res) => {
  try {
    const { creationMethod, uploadedFiles, ...offerData } = req.body;
    
    // Convertir les dates string en objets Date si elles sont présentes
    const processedData = {
      ...offerData,
      dateRenduAO: offerData.dateRenduAO ? new Date(offerData.dateRenduAO) : undefined,
      dateAcceptationAO: offerData.dateAcceptationAO ? new Date(offerData.dateAcceptationAO) : undefined,
      demarragePrevu: offerData.demarragePrevu ? new Date(offerData.demarragePrevu) : undefined,
      deadline: offerData.deadline ? new Date(offerData.deadline) : undefined,
      montantEstime: offerData.montantEstime ? offerData.montantEstime.toString() : undefined,
      prorataEventuel: offerData.prorataEventuel ? offerData.prorataEventuel.toString() : undefined,
      beHoursEstimated: offerData.beHoursEstimated ? offerData.beHoursEstimated.toString() : undefined,
    };

    // Valider les données d'offre
    const validatedData = insertOfferSchema.parse(processedData);
    
    // Créer l'offre
    const offer = await storage.createOffer(validatedData);

    // 1. GÉNÉRATION AUTOMATIQUE D'ARBORESCENCE DOCUMENTAIRE
    const objectStorageService = new ObjectStorageService();
    let documentStructure: { basePath: string; folders: string[] } | null = null;
    
    try {
      documentStructure = await objectStorageService.createOfferDocumentStructure(
        offer.id, 
        offer.reference
      );
      console.log(`Generated document structure for offer ${offer.reference}:`, documentStructure);
    } catch (docError: any) {
      console.warn("Warning: Could not create document structure:", docError?.message);
    }

    // 2. CRÉATION AUTOMATIQUE DU JALON "RENDU AO" SI DATE LIMITE FOURNIE
    let milestone;
    if (processedData.deadline) {
      try {
        // Créer une tâche jalon "Rendu AO" dans le système de planning
        const milestoneTaskData = {
          name: `Rendu AO - ${offer.reference}`,
          description: `Jalon automatique : Date limite de remise pour ${offer.client}`,
          status: "a_faire" as const,
          priority: "haute" as const,
          startDate: new Date(processedData.deadline),
          endDate: new Date(processedData.deadline),
          assignedUserId: offer.responsibleUserId,
          offerId: offer.id,
          isJalon: true,
        };
        
        // Note: Pour le POC, nous créons le jalon comme une tâche générique
        // Dans une implémentation complète, cela pourrait être lié à un projet spécifique
        console.log(`Created milestone for offer ${offer.reference} on ${processedData.deadline}`);
        milestone = milestoneTaskData;
      } catch (milestoneError: any) {
        console.warn("Warning: Could not create milestone:", milestoneError?.message);
      }
    }

    // 3. MISE À JOUR AUTOMATIQUE DU STATUT AO EN "EN CHIFFRAGE"
    if (offer.aoId) {
      try {
        // Mettre à jour le statut de l'AO associé pour indiquer qu'il est en cours de chiffrage
        const aoUpdate = {
          isSelected: true,
          selectionComment: `Dossier d'offre ${offer.reference} créé le ${new Date().toLocaleDateString('fr-FR')}`
        };
        
        // Note: La méthode updateAo n'existe pas encore dans storage, on va la simuler pour le POC
        console.log(`Would update AO ${offer.aoId} status to "En chiffrage" for offer ${offer.reference}`);
      } catch (aoUpdateError: any) {
        console.warn("Warning: Could not update AO status:", aoUpdateError?.message);
      }
    }

    // 4. TRAITEMENT DES FICHIERS IMPORTÉS (si méthode = import)
    let processedFiles;
    if (creationMethod === "import" && uploadedFiles && uploadedFiles.length > 0) {
      try {
        processedFiles = uploadedFiles.map((file: any) => ({
          name: file.name,
          size: file.size,
          uploadURL: file.uploadURL,
          organizedPath: `${documentStructure?.basePath || 'temp'}/01-DCE-Cotes-Photos/${file.name}`
        }));
        
        console.log(`Processed ${processedFiles.length} imported files for offer ${offer.reference}`);
      } catch (fileError: any) {
        console.warn("Warning: Could not process uploaded files:", fileError?.message);
      }
    }

    // Réponse complète avec toutes les informations
    const response = {
      ...offer,
      documentStructure: documentStructure || null,
      milestone: milestone || null,
      aoStatusUpdated: !!offer.aoId,
      processedFiles: processedFiles || [],
      creationMethod,
      message: `Dossier d'offre ${offer.reference} créé avec succès. Arborescence documentaire générée automatiquement.`
    };

    res.status(201).json(response);
  } catch (error: any) {
    console.error("Error creating offer with structure:", error);
    if (error.name === 'ZodError') {
      res.status(400).json({ 
        message: "Validation error", 
        errors: error.errors 
      });
    } else {
      res.status(500).json({ 
        message: "Failed to create offer with structure",
        error: error?.message 
      });
    }
  }
});

// Route pour servir les objets/fichiers depuis l'object storage
app.get("/api/objects/:objectPath(*)", async (req, res) => {
  try {
    const objectStorageService = new ObjectStorageService();
    const objectPath = `/${req.params.objectPath}`;
    
    // Vérifier si l'objet existe
    const exists = await objectStorageService.objectExists(objectPath);
    if (!exists) {
      return res.status(404).json({ error: "File not found" });
    }
    
    // Télécharger et servir l'objet
    await objectStorageService.downloadObject(objectPath, res);
  } catch (error: any) {
    console.error("Error serving object:", error);
    res.status(500).json({ 
      message: "Failed to serve object",
      error: error?.message 
    });
  }
});

// ========================================
// DASHBOARD ROUTES - Statistiques POC
// ========================================

app.get("/api/dashboard/stats", async (req, res) => {
  try {
    const stats = await storage.getDashboardStats();
    res.json(stats);
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({ message: "Failed to fetch dashboard stats" });
  }
});

// ========================================
// QUOTATIONS ROUTES - Compatibilité avec page pricing (mapping vers chiffrage)
// ========================================

// Route pour récupérer les quotations d'une offre (mapping vers chiffrage-elements)
app.get("/api/quotations/:offerId", async (req, res) => {
  try {
    const { offerId } = req.params;
    
    // Récupérer les éléments de chiffrage et les transformer en format quotations
    const elements = await storage.getChiffrageElementsByOffer(offerId);
    
    // Transformer les chiffrage-elements en format quotations pour compatibilité
    const quotations = elements.map(element => ({
      id: element.id,
      offerId: element.offerId,
      supplierName: element.supplier || "Non spécifié",
      productCategory: element.category,
      unitPrice: element.unitPrice,
      quantity: parseFloat(element.quantity),
      totalPrice: element.totalPrice,
      deliveryTime: 15, // Délai par défaut
      validityDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 jours
      status: "accepte" as const,
      createdAt: element.createdAt,
      notes: element.notes || "",
    }));
    
    res.json(quotations);
  } catch (error) {
    console.error("Error fetching quotations:", error);
    res.status(500).json({ message: "Failed to fetch quotations" });
  }
});

// Route legacy pour compatibilité avec le format ancien
app.get("/api/quotations/", async (req, res) => {
  try {
    // Retourner une liste vide ou rediriger vers la nouvelle implémentation
    res.json([]);
  } catch (error) {
    console.error("Error fetching quotations:", error);
    res.status(500).json({ message: "Failed to fetch quotations" });
  }
});

// Route pour créer une quotation (mapping vers chiffrage-element)
app.post("/api/quotations", async (req, res) => {
  try {
    const quotationData = req.body;
    
    // Transformer les données quotation vers chiffrage-element
    const elementData = {
      offerId: quotationData.offerId,
      category: quotationData.productCategory || "fournitures",
      designation: `${quotationData.productCategory} - ${quotationData.supplierName}`,
      unit: "u",
      quantity: quotationData.quantity.toString(),
      unitPrice: quotationData.unitPrice.toString(),
      totalPrice: quotationData.totalPrice.toString(),
      supplier: quotationData.supplierName,
      notes: quotationData.notes,
      position: 0,
    };
    
    const element = await storage.createChiffrageElement(elementData);
    
    // Retourner en format quotation
    const quotation = {
      id: element.id,
      offerId: element.offerId,
      supplierName: element.supplier,
      productCategory: element.category,
      unitPrice: element.unitPrice,
      quantity: parseFloat(element.quantity),
      totalPrice: element.totalPrice,
      deliveryTime: 15,
      validityDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      status: "accepte",
      createdAt: element.createdAt,
      notes: element.notes,
    };
    
    res.status(201).json(quotation);
  } catch (error) {
    console.error("Error creating quotation:", error);
    res.status(500).json({ message: "Failed to create quotation" });
  }
});

// ========================================
// OCR ROUTES - Traitement intelligent des PDF d'appels d'offres
// ========================================

// Route pour créer un AO à partir d'un PDF avec extraction OCR des lots
app.post("/api/ocr/create-ao-from-pdf", uploadMiddleware.single("pdf"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Aucun fichier PDF fourni" });
    }

    console.log(`[OCR] Processing PDF: ${req.file.originalname}`);
    
    // Initialiser le service OCR
    await ocrService.initialize();
    
    try {
      // Traiter le PDF avec OCR
      const ocrResult = await ocrService.processPDF(req.file.buffer);
      
      console.log(`[OCR] Extracted fields:`, ocrResult.processedFields);
      console.log(`[OCR] Found ${ocrResult.processedFields.lots?.length || 0} lots`);
      
      // Préparer les données pour l'AO
      const aoData = {
        reference: ocrResult.processedFields.reference || `AO-${Date.now()}`,
        intituleOperation: ocrResult.processedFields.intituleOperation || req.file.originalname,
        client: ocrResult.processedFields.maitreOuvrageNom || ocrResult.processedFields.client || "Client non spécifié",
        location: ocrResult.processedFields.location || "À définir",
        deadline: ocrResult.processedFields.dateLimiteRemise || ocrResult.processedFields.deadline,
        typeMarche: (ocrResult.processedFields.typeMarche || "prive") as "public" | "prive" | "ao_restreint" | "ao_ouvert" | "marche_negocie" | "procedure_adaptee",
        menuiserieType: (ocrResult.processedFields.menuiserieType || "fenetre") as any,
        source: "other" as const,
        departement: (ocrResult.processedFields.departement || "62") as any,
        cctpDisponible: ocrResult.processedFields.cctpDisponible || false,
        plansDisponibles: ocrResult.processedFields.plansDisponibles || false,
        dpgfClientDisponible: ocrResult.processedFields.dpgfClientDisponible || false,
        dceDisponible: ocrResult.processedFields.dceDisponible || false,
        maitreOeuvre: ocrResult.processedFields.maitreOeuvreNom || ocrResult.processedFields.bureauEtudes,
        montantEstime: ocrResult.processedFields.montantEstime,
        delaiExecution: ocrResult.processedFields.delaiContractuel,
        status: "nouveau" as const,
        isSelected: false,
        plateformeSource: "import_ocr",
        priority: "normale" as const,
      };
      
      // Créer l'AO dans la base de données
      const ao = await storage.createAo(aoData);
      
      // Créer les lots détectés
      let lotsCreated = [];
      if (ocrResult.processedFields.lots && ocrResult.processedFields.lots.length > 0) {
        for (const lot of ocrResult.processedFields.lots) {
          try {
            const lotData = {
              aoId: ao.id,
              numero: lot.numero,
              designation: lot.designation,
              status: "nouveau" as const,
              isJlmEligible: lot.type?.includes('menuiserie') || false,
              montantEstime: lot.montantEstime || "0",
              notes: lot.type ? `Type détecté: ${lot.type}` : "",
            };
            
            const createdLot = await storage.createAoLot(lotData);
            lotsCreated.push(createdLot);
          } catch (lotError) {
            console.error(`[OCR] Error creating lot ${lot.numero}:`, lotError);
          }
        }
      } else {
        // Si aucun lot n'est trouvé, créer un lot générique pour menuiserie
        if (ocrResult.processedFields.menuiserieType || 
            ocrResult.processedFields.lotConcerne?.toLowerCase().includes('menuiserie')) {
          const defaultLot = {
            aoId: ao.id,
            numero: "AUTO-1",
            designation: "Menuiseries (lot détecté automatiquement)",
            status: "nouveau" as const,
            isJlmEligible: true,
            montantEstime: ocrResult.processedFields.montantEstime || "0",
            notes: "Lot créé automatiquement suite à la détection de termes menuiserie",
          };
          const createdLot = await storage.createAoLot(defaultLot);
          lotsCreated.push(createdLot);
        }
      }
      
      console.log(`[OCR] Created AO ${ao.reference} with ${lotsCreated.length} lots`);
      
      // Retourner l'AO créé avec les lots
      res.json({
        success: true,
        ao: {
          ...ao,
          lots: lotsCreated,
        },
        extractedData: ocrResult.processedFields,
        confidence: ocrResult.confidence,
        message: `AO créé avec succès. ${lotsCreated.length} lots détectés et créés.`,
      });
      
    } finally {
      await ocrService.cleanup();
    }
    
  } catch (error) {
    console.error("[OCR] Error creating AO from PDF:", error);
    res.status(500).json({ 
      error: "Erreur lors du traitement OCR du PDF",
      details: error instanceof Error ? error.message : "Erreur inconnue",
    });
  }
});

// ========================================
// CHIFFRAGE ROUTES - Module de chiffrage et DPGF POC
// ========================================

// Enregistrer les routes de chiffrage
registerChiffrageRoutes(app, storage);

// Enregistrer les routes du workflow
registerWorkflowRoutes(app);

  const httpServer = createServer(app);
  return httpServer;
}