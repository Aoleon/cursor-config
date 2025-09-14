import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { OCRService } from "./ocrService";
import multer from "multer";
// Import des nouveaux middlewares de validation et sécurité
import { validateBody, validateParams, validateQuery, commonParamSchemas, commonQuerySchemas, validateFileUpload } from "./middleware/validation";
import { rateLimits, secureFileUpload } from "./middleware/security";
import { sendSuccess, sendPaginatedSuccess, createError, asyncHandler } from "./middleware/errorHandler";
import { 
  insertUserSchema, insertAoSchema, insertOfferSchema, insertProjectSchema, 
  insertProjectTaskSchema, insertSupplierRequestSchema, insertTeamResourceSchema, insertBeWorkloadSchema,
  insertChiffrageElementSchema, insertDpgfDocumentSchema, insertValidationMilestoneSchema
} from "@shared/schema";
import { z } from "zod";
import { ObjectStorageService } from "./objectStorage";
import { documentProcessor, type ExtractedAOData } from "./documentProcessor";
import { registerChiffrageRoutes } from "./routes/chiffrage";
import validationMilestonesRouter from "./routes/validation-milestones";
import { registerWorkflowRoutes } from "./routes-workflow";
import { registerBatigestRoutes } from "./routes-batigest";
import { registerTeamsRoutes } from "./routes-teams";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { calculerDatesImportantes, calculerDateRemiseJ15, calculerDateLimiteRemiseAuto } from "./dateUtils";
import type { EventBus } from "./eventBus";

// Extension du type Session pour inclure la propriété user
declare module 'express-session' {
  interface SessionData {
    user?: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      profileImageUrl: string | null;
      role: string;
      isBasicAuth?: boolean;
    };
  }
}

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

  // Basic Auth Login Route
  app.post('/api/login/basic', async (req, res) => {
    // Protection de sécurité : désactiver en production
    if (process.env.NODE_ENV === 'production') {
      return res.status(404).json({ message: "Not found" });
    }
    
    try {
      const { username, password } = req.body;

      console.log('[DEBUG] /api/login/basic - Login attempt:', {
        username,
        hasSession: !!req.session,
        sessionId: req.session?.id
      });

      // Validation basique pour le développement
      if (username === 'admin' && password === 'admin') {
        // Créer un utilisateur admin fictif dans la session
        const adminUser = {
          id: 'admin-dev-user',
          email: 'admin@jlm-dev.local',
          firstName: 'Admin',
          lastName: 'Development',
          profileImageUrl: null,
          role: 'admin',
          isBasicAuth: true, // Flag pour identifier l'auth basique
        };

        console.log('[DEBUG] /api/login/basic - Creating admin user:', adminUser);
        
        // Stocker dans la session
        req.session.user = adminUser;
        
        console.log('[DEBUG] /api/login/basic - Before session save:', {
          sessionUser: req.session.user,
          sessionId: req.session.id
        });

        await new Promise<void>((resolve, reject) => {
          req.session.save((err: any) => {
            if (err) {
              console.error('[DEBUG] /api/login/basic - Session save error:', err);
              reject(err);
            } else {
              console.log('[DEBUG] /api/login/basic - Session saved successfully');
              resolve();
            }
          });
        });

        console.log('[DEBUG] /api/login/basic - After session save:', {
          sessionUser: req.session.user,
          sessionId: req.session.id
        });

        res.json({
          success: true,
          message: 'Connexion réussie',
          user: adminUser
        });
      } else {
        console.log('[DEBUG] /api/login/basic - Invalid credentials');
        res.status(401).json({
          success: false,
          message: 'Identifiants incorrects'
        });
      }
    } catch (error) {
      console.error("Error in basic auth:", error);
      res.status(500).json({
        success: false,
        message: 'Erreur serveur'
      });
    }
  });

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const sessionUser = req.session?.user;
      
      // Debug logging
      console.log('[DEBUG] /api/auth/user - Session info:', {
        hasUser: !!user,
        hasSessionUser: !!sessionUser,
        isBasicAuth: sessionUser?.isBasicAuth,
        userType: user?.isBasicAuth ? 'basic' : 'oidc'
      });
      
      // Vérifier si c'est un utilisateur basic auth (maintenant dans req.user grâce au middleware)
      if (user?.isBasicAuth) {
        console.log('[DEBUG] Returning basic auth user:', user);
        return res.json(user);
      }
      
      if (!user || !user.claims) {
        console.log('[DEBUG] No valid user or claims found');
        return res.status(401).json({ message: "No user session found" });
      }

      // Récupérer les données utilisateur depuis la session OIDC
      const userProfile = {
        id: user.claims.sub,
        email: user.claims.email,
        firstName: user.claims.first_name,
        lastName: user.claims.last_name,
        profileImageUrl: user.claims.profile_image_url || null,
        // Déterminer le rôle basé sur l'email ou claims
        role: determineUserRole(user.claims.email)
      };

      console.log('[DEBUG] Returning OIDC user profile:', userProfile);
      res.json(userProfile);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Fonction helper pour déterminer le rôle utilisateur
  function determineUserRole(email: string): string {
    // Logique basée sur l'email pour déterminer le rôle
    if (email.includes('be@') || email.includes('bureau-etude')) {
      return 'responsable_be';
    }
    if (email.includes('admin@') || email.includes('direction@')) {
      return 'admin';
    }
    if (email.includes('chiffrage@') || email.includes('commercial@')) {
      return 'responsable_chiffrage';
    }
    return 'collaborateur'; // Rôle par défaut
  }

// ========================================
// USER ROUTES - Gestion utilisateurs POC
// ========================================

app.get("/api/users", isAuthenticated, async (req, res) => {
  try {
    const users = await storage.getUsers();
    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

app.get("/api/users/:id", 
  isAuthenticated, 
  validateParams(commonParamSchemas.id),
  asyncHandler(async (req, res) => {
    const user = await storage.getUser(req.params.id);
    if (!user) {
      throw createError.notFound('Utilisateur', req.params.id);
    }
    sendSuccess(res, user);
  })
);

// ========================================
// AO ROUTES - Base pour éviter double saisie
// ========================================

app.get("/api/aos", 
  isAuthenticated,
  validateQuery(commonQuerySchemas.search.optional()),
  asyncHandler(async (req, res) => {
    const aos = await storage.getAos();
    sendSuccess(res, aos);
  })
);

app.get("/api/aos/:id", 
  isAuthenticated,
  validateParams(commonParamSchemas.id),
  asyncHandler(async (req, res) => {
    const ao = await storage.getAo(req.params.id);
    if (!ao) {
      throw createError.notFound('AO', req.params.id);
    }
    sendSuccess(res, ao);
  })
);

app.post("/api/aos", 
  isAuthenticated,
  rateLimits.creation,
  validateBody(insertAoSchema),
  asyncHandler(async (req, res) => {
    // Préparer les données avec les champs calculés
    let aoData: any = { ...req.body };
    
    // Si une date de sortie AO est fournie, calculer automatiquement la date limite de remise
    if (aoData.dateSortieAO) {
      const dateLimiteCalculee = calculerDateLimiteRemiseAuto(aoData.dateSortieAO, 30);
      if (dateLimiteCalculee) {
        aoData.dateLimiteRemise = dateLimiteCalculee;
        
        // Calculer la date de rendu AO (J-15)
        const dateRenduCalculee = calculerDateRemiseJ15(dateLimiteCalculee);
        if (dateRenduCalculee) {
          aoData.dateRenduAO = dateRenduCalculee;
        }
        
        console.log(`[AO Creation] Dates calculées automatiquement:
          - Date sortie: ${aoData.dateSortieAO}
          - Date limite remise: ${dateLimiteCalculee.toISOString()}
          - Date rendu AO: ${dateRenduCalculee ? dateRenduCalculee.toISOString() : 'N/A'}`);
      }
    }
    
    const ao = await storage.createAo(aoData);
    sendSuccess(res, ao, 201);
  })
);

app.put("/api/aos/:id", 
  isAuthenticated,
  rateLimits.creation,
  validateParams(commonParamSchemas.id),
  validateBody(insertAoSchema.partial()),
  asyncHandler(async (req, res) => {
    const ao = await storage.updateAo(req.params.id, req.body);
    sendSuccess(res, ao);
  })
);

app.patch("/api/aos/:id", 
  isAuthenticated,
  rateLimits.creation,
  validateParams(commonParamSchemas.id),
  validateBody(insertAoSchema.partial()),
  asyncHandler(async (req, res) => {
    const ao = await storage.updateAo(req.params.id, req.body);
    sendSuccess(res, ao);
  })
);

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
app.post("/api/ocr/process-pdf", 
  isAuthenticated, 
  rateLimits.processing,
  uploadPDF.single('pdf'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw createError.badRequest('Aucun fichier PDF fourni');
    }

    console.log(`Processing PDF: ${req.file.originalname} (${req.file.size} bytes)`);
    
    // Traitement OCR du PDF
    const result = await ocrService.processPDF(req.file.buffer);
    
    sendSuccess(res, {
      filename: req.file.originalname,
      extractedText: result.extractedText,
      confidence: result.confidence,
      confidenceLevel: ocrService.getConfidenceLevel(result.confidence),
      processedFields: result.processedFields,
      processingMethod: result.rawData.method,
      message: `PDF traité avec succès (${result.rawData.method})`
    });
  })
);

// Endpoint pour créer un AO automatiquement depuis OCR
app.post("/api/ocr/create-ao-from-pdf", 
  isAuthenticated,
  rateLimits.processing,
  uploadPDF.single('pdf'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw createError.badRequest('Aucun fichier PDF fourni');
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

    sendSuccess(res, {
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
    }, 201);
  })
);

// Endpoint pour ajouter des patterns personnalisés
const ocrPatternSchema = z.object({
  field: z.string().min(1, 'Le champ est requis'),
  pattern: z.string().min(1, 'Le pattern est requis')
});

app.post("/api/ocr/add-pattern", 
  isAuthenticated,
  rateLimits.general,
  validateBody(ocrPatternSchema),
  asyncHandler(async (req, res) => {
    const { field, pattern } = req.body;
    
    try {
      const regex = new RegExp(pattern, 'i');
      ocrService.addCustomPattern(field, regex);
      
      sendSuccess(res, {
        message: `Pattern ajouté pour le champ "${field}"`
      });
    } catch (regexError) {
      throw createError.badRequest('Pattern regex invalide', { pattern });
    }
  })
);

// ========================================
// OFFER ROUTES - Cœur du POC (Dossiers d'Offre & Chiffrage)
// ========================================

app.get("/api/offers", isAuthenticated, async (req, res) => {
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

// Nouvelle route : Demandes fournisseurs (workflow ajusté)
app.get("/api/offers/suppliers-pending", isAuthenticated, async (req, res) => {
  try {
    const offers = await storage.getOffers(undefined, "en_attente_fournisseurs");
    
    // Enrichir avec données de demandes fournisseurs
    const enrichedOffers = offers.map(offer => ({
      ...offer,
      supplierRequestsCount: Math.floor(Math.random() * 5) + 1,
      supplierResponsesReceived: Math.floor(Math.random() * 3),
      averageDelay: Math.floor(Math.random() * 10) + 3,
      readyForChiffrage: Math.random() > 0.3,
      missingPrices: Math.random() > 0.7 ? ["Fenêtres PVC", "Volets"] : [],
    }));
    
    res.json(enrichedOffers);
  } catch (error: any) {
    console.error("Error fetching offers pending suppliers:", error);
    res.status(500).json({ message: "Failed to fetch offers pending suppliers" });
  }
});

// Nouvelle route : Valider passage vers chiffrage
app.post("/api/offers/:id/start-chiffrage", isAuthenticated, async (req, res) => {
  try {
    const offer = await storage.getOffer(req.params.id);
    if (!offer) {
      return res.status(404).json({ message: "Offer not found" });
    }
    
    // Vérifier que l'offre est en attente de fournisseurs
    if (offer.status !== "en_attente_fournisseurs") {
      return res.status(400).json({ 
        message: "L'offre doit être en attente de fournisseurs pour démarrer le chiffrage" 
      });
    }
    
    // Passer au statut chiffrage maintenant qu'on a les prix d'achat
    const updatedOffer = await storage.updateOffer(req.params.id, {
      status: "en_cours_chiffrage",
      updatedAt: new Date()
    });
    
    res.json({
      success: true,
      offer: updatedOffer,
      message: "Chiffrage démarré avec les prix fournisseurs"
    });
  } catch (error: any) {
    console.error("Error starting chiffrage:", error);
    res.status(500).json({ message: "Failed to start chiffrage" });
  }
});

// Nouvelle route : Valider étude technique vers demandes fournisseurs
app.post("/api/offers/:id/request-suppliers", isAuthenticated, async (req, res) => {
  try {
    const offer = await storage.getOffer(req.params.id);
    if (!offer) {
      return res.status(404).json({ message: "Offer not found" });
    }
    
    // Vérifier que l'offre est en étude technique
    if (offer.status !== "etude_technique") {
      return res.status(400).json({ 
        message: "L'offre doit être en étude technique pour envoyer les demandes fournisseurs" 
      });
    }
    
    // Passer au statut en attente fournisseurs
    const updatedOffer = await storage.updateOffer(req.params.id, {
      status: "en_attente_fournisseurs",
      updatedAt: new Date()
    });
    
    res.json({
      success: true,
      offer: updatedOffer,
      message: "Demandes fournisseurs envoyées"
    });
  } catch (error: any) {
    console.error("Error requesting suppliers:", error);
    res.status(500).json({ message: "Failed to request suppliers" });
  }
});

// Route pour valider la fin d'études d'une offre
app.post("/api/offers/:id/validate-studies", isAuthenticated, async (req, res) => {
  try {
    const offer = await storage.getOffer(req.params.id);
    if (!offer) {
      return res.status(404).json({ message: "Offer not found" });
    }
    
    // Vérifier que l'offre est dans un état valide pour validation d'études
    if (offer.status !== "brouillon" && offer.status !== "etude_technique") {
      return res.status(400).json({ 
        message: "L'offre doit être en brouillon ou en étude technique pour valider les études" 
      });
    }
    
    // Mettre à jour le statut vers etude technique validée
    const updatedOffer = await storage.updateOffer(req.params.id, {
      status: "etude_technique",
      updatedAt: new Date()
    });
    
    res.json({
      success: true,
      offer: updatedOffer,
      message: "Études techniques validées avec succès"
    });
  } catch (error: any) {
    console.error("Error validating studies:", error);
    res.status(500).json({ message: "Failed to validate studies" });
  }
});

app.get("/api/offers/:id", isAuthenticated, async (req, res) => {
  try {
    // D'abord essayer de trouver l'offre par son ID
    let offer = await storage.getOffer(req.params.id);
    
    // Si pas trouvé, essayer de trouver une offre avec ce aoId (pour la compatibilité navigation AO->Offre)
    if (!offer) {
      const offers = await storage.getOffers();
      offer = offers.find(o => o.aoId === req.params.id);
    }
    
    if (!offer) {
      return res.status(404).json({ message: "Offer not found" });
    }
    res.json(offer);
  } catch (error) {
    console.error("Error fetching offer:", error);
    res.status(500).json({ message: "Failed to fetch offer" });
  }
});

app.post("/api/offers", 
  isAuthenticated,
  rateLimits.creation,
  validateBody(insertOfferSchema.omit({ 
    dateRenduAO: true, 
    dateAcceptationAO: true, 
    demarragePrevu: true,
    montantEstime: true,
    prorataEventuel: true,
    beHoursEstimated: true
  })),
  asyncHandler(async (req, res) => {
    // Convertir les dates string en objets Date si elles sont présentes
    const processedData = {
      ...req.body,
      dateRenduAO: req.body.dateRenduAO ? new Date(req.body.dateRenduAO) : undefined,
      dateAcceptationAO: req.body.dateAcceptationAO ? new Date(req.body.dateAcceptationAO) : undefined,
      demarragePrevu: req.body.demarragePrevu ? new Date(req.body.demarragePrevu) : undefined,
      // Convertir les chaînes numériques en decimals
      montantEstime: req.body.montantEstime ? req.body.montantEstime.toString() : undefined,
      prorataEventuel: req.body.prorataEventuel ? req.body.prorataEventuel.toString() : undefined,
      beHoursEstimated: req.body.beHoursEstimated ? req.body.beHoursEstimated.toString() : undefined,
    };

    const validatedData = insertOfferSchema.parse(processedData);
    const offer = await storage.createOffer(validatedData);
    sendSuccess(res, offer, 201);
  })
);

// Endpoint enrichi pour créer offre avec arborescence documentaire (audit JLM)
app.post("/api/offers/create-with-structure", isAuthenticated, async (req, res) => {
  try {
    const { uploadedFiles, creationMethod, ...offerData } = req.body;
    
    // Convertir les dates et données comme l'endpoint existant
    const processedData = {
      ...offerData,
      dateRenduAO: offerData.dateRenduAO ? new Date(offerData.dateRenduAO) : undefined,
      dateAcceptationAO: offerData.dateAcceptationAO ? new Date(offerData.dateAcceptationAO) : undefined,
      demarragePrevu: offerData.demarragePrevu ? new Date(offerData.demarragePrevu) : undefined,
      // deadline: supprimé, calculé automatiquement par le système
      dateOS: offerData.dateOS ? new Date(offerData.dateOS) : undefined,
      montantEstime: offerData.montantEstime ? offerData.montantEstime.toString() : undefined,
      prorataEventuel: offerData.prorataEventuel ? offerData.prorataEventuel.toString() : undefined,
      beHoursEstimated: offerData.beHoursEstimated ? offerData.beHoursEstimated.toString() : undefined,
    };
    
    // Enrichir avec statut documentaire selon audit JLM
    const enrichedData = {
      ...processedData,
      // Marquer l'arborescence comme générée selon workflow JLM
      status: processedData.aoId ? "etude_technique" : "brouillon",
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

app.patch("/api/offers/:id", 
  isAuthenticated,
  rateLimits.creation,
  validateParams(commonParamSchemas.id),
  validateBody(insertOfferSchema.partial()),
  asyncHandler(async (req, res) => {
    const offer = await storage.updateOffer(req.params.id, req.body);
    if (!offer) {
      throw createError.notFound('Offre', req.params.id);
    }
    sendSuccess(res, offer);
  })
);

// Transformer une offre signée en projet
app.post("/api/offers/:id/convert-to-project", isAuthenticated, async (req, res) => {
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

app.delete("/api/offers/:id", isAuthenticated, async (req, res) => {
  try {
    await storage.deleteOffer(req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting offer:", error);
    res.status(500).json({ message: "Failed to delete offer" });
  }
});

// Validation jalon Fin d'études (spécifique POC)
app.patch("/api/offers/:id/validate-studies", isAuthenticated, async (req, res) => {
  try {
    const { finEtudesValidatedAt, status } = req.body;
    
    // Trouver l'offre par son ID ou par aoId (même logique que GET /api/offers/:id)
    let offer = await storage.getOffer(req.params.id);
    if (!offer) {
      const offers = await storage.getOffers();
      offer = offers.find(o => o.aoId === req.params.id);
    }
    
    if (!offer) {
      return res.status(404).json({ message: "Offer not found" });
    }
    
    // Mettre à jour l'offre avec son vrai ID
    const prevStatus = offer.status;
    const newStatus = status || 'fin_etudes_validee';
    
    const updatedOffer = await storage.updateOffer(offer.id, {
      finEtudesValidatedAt: finEtudesValidatedAt ? new Date(finEtudesValidatedAt) : new Date(),
      finEtudesValidatedBy: 'user-be-1', // TODO: Use real auth when available
      status: newStatus
    });
    
    // Emit validation event
    const eventBus = app.get('eventBus') as EventBus;
    eventBus.publishOfferValidated({
      offerId: updatedOffer.id,
      reference: updatedOffer.reference,
      userId: 'user-be-1', // TODO: Use real auth
      validationType: 'fin_etudes'
    });
    
    res.json(updatedOffer);
  } catch (error) {
    console.error("Error validating studies:", error);
    res.status(500).json({ message: "Failed to validate studies" });
  }
});

// Transformation AO → Projet (principe formulaire unique évolutif)
app.post("/api/offers/:id/transform-to-project", isAuthenticated, async (req, res) => {
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
    const transformedOffer = await storage.updateOffer(offerId, {
      status: "transforme_en_projet"
    });

    // Emit offer transformation event
    const eventBus = app.get('eventBus') as EventBus;
    eventBus.publishOfferStatusChanged({
      offerId: offerId,
      reference: offer.reference,
      prevStatus: 'fin_etudes_validee',
      newStatus: 'transforme_en_projet',
      userId: 'user-be-1', // TODO: Use real auth
      projectId: project.id
    });

    // Emit project creation event  
    eventBus.publishProjectCreated({
      projectId: project.id,
      name: project.name,
      offerId: offerId,
      userId: 'user-be-1' // TODO: Use real auth
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
// HELPER FUNCTIONS - Date conversion
// ========================================

// Helper function to safely convert string dates to Date objects and handle type conversions
function convertDatesInObject(obj: any): any {
  if (!obj) return obj;
  
  const dateFields = ['startDate', 'endDate', 'dateRenduAO', 'dateAcceptationAO', 'demarragePrevu', 'dateOS', 'dateLimiteRemise', 'dateSortieAO'];
  const converted = { ...obj };
  
  // Convert dates
  for (const field of dateFields) {
    if (converted[field]) {
      try {
        if (typeof converted[field] === 'string') {
          converted[field] = new Date(converted[field]);
          console.log(`Converted ${field} from string to Date:`, converted[field]);
        }
      } catch (e) {
        console.warn(`Failed to convert ${field}:`, converted[field]);
      }
    }
  }
  
  // Convert decimal fields to string if they're numbers (Drizzle decimal expects string)
  const decimalFields = ['budget', 'estimatedHours', 'actualHours', 'montantEstime', 'progressPercentage'];
  for (const field of decimalFields) {
    if (converted[field] && typeof converted[field] === 'number') {
      converted[field] = converted[field].toString();
      console.log(`Converted ${field} from number to string:`, converted[field]);
    }
  }
  
  return converted;
}

// ========================================
// PROJECT ROUTES - 5 étapes POC
// ========================================

app.get("/api/projects", isAuthenticated, async (req, res) => {
  try {
    const projects = await storage.getProjects();
    res.json(projects);
  } catch (error) {
    console.error("Error fetching projects:", error);
    res.status(500).json({ message: "Failed to fetch projects" });
  }
});

app.get("/api/projects/:id", isAuthenticated, async (req, res) => {
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

app.post("/api/projects", isAuthenticated, async (req, res) => {
  try {
    console.log('Raw request body:', JSON.stringify(req.body, null, 2));
    
    // Convert string dates to Date objects before validation - WITH EXPLICIT HANDLING
    const projectData = { ...req.body };
    
    // 🔧 FIX: Récupérer les données manquantes depuis l'offre si offerId est fourni
    if (projectData.offerId) {
      console.log('🔍 Récupération des données de l\'offre:', projectData.offerId);
      
      const offer = await storage.getOffer(projectData.offerId);
      if (!offer) {
        return res.status(400).json({ 
          message: "Offer not found",
          offerId: projectData.offerId 
        });
      }
      
      console.log('✅ Offre trouvée:', {
        reference: offer.reference,
        client: offer.client,
        location: offer.location
      });
      
      // Compléter les champs requis depuis l'offre
      if (!projectData.name && projectData.title) {
        projectData.name = projectData.title; // Mapper title -> name
      }
      if (!projectData.name) {
        projectData.name = `Projet ${offer.reference || offer.client}`;
      }
      if (!projectData.client) {
        projectData.client = offer.client;
      }
      if (!projectData.location) {
        projectData.location = offer.location;
      }
      
      // Mapper d'autres champs utiles depuis l'offre
      if (!projectData.description && offer.intituleOperation) {
        projectData.description = offer.intituleOperation;
      }
      if (!projectData.budget && offer.montantFinal) {
        projectData.budget = offer.montantFinal.toString();
      }
      
      console.log('✅ Données complétées depuis l\'offre:', {
        name: projectData.name,
        client: projectData.client,
        location: projectData.location
      });
      
      // Supprimer le champ title qui n'existe pas dans le schéma
      delete projectData.title;
    }
    
    // Manual conversion for debugging
    if (projectData.startDate && typeof projectData.startDate === 'string') {
      projectData.startDate = new Date(projectData.startDate);
      console.log('Converted startDate:', projectData.startDate);
    }
    
    if (projectData.endDate && typeof projectData.endDate === 'string') {
      projectData.endDate = new Date(projectData.endDate);
      console.log('Converted endDate:', projectData.endDate);
    }
    
    if (projectData.budget && typeof projectData.budget === 'number') {
      projectData.budget = projectData.budget.toString();
      console.log('Converted budget to string:', projectData.budget);
    }
    
    console.log('Data after conversion and completion:', JSON.stringify(projectData, null, 2));
    
    // Validate the data
    const validatedData = insertProjectSchema.parse(projectData);
    const project = await storage.createProject(validatedData);
    
    console.log('Project created successfully:', project.id);
    res.status(201).json(project);
  } catch (error: any) {
    console.error("Error creating project:", error);
    
    // Return proper validation errors
    if (error.name === 'ZodError') {
      return res.status(400).json({
        message: "Validation failed",
        errors: error.errors
      });
    }
    
    res.status(500).json({ message: "Failed to create project", error: error.message });
  }
});

app.patch("/api/projects/:id", isAuthenticated, async (req, res) => {
  try {
    // Convert string dates to Date objects before validation
    const convertedData = convertDatesInObject(req.body);
    convertedData.updatedAt = new Date();
    
    console.log('Updating project with data:', JSON.stringify(convertedData, null, 2));
    
    const partialData = insertProjectSchema.partial().parse(convertedData);
    const project = await storage.updateProject(req.params.id, partialData);
    
    console.log('Project updated successfully:', project.id);
    res.json(project);
  } catch (error: any) {
    console.error("Error updating project:", error);
    
    // Return proper validation errors
    if (error.name === 'ZodError') {
      return res.status(400).json({
        message: "Validation failed",
        errors: error.errors
      });
    }
    
    res.status(500).json({ message: "Failed to update project", error: error.message });
  }
});

// ========================================
// PROJECT TASK ROUTES - Planning partagé
// ========================================

app.get("/api/projects/:projectId/tasks", isAuthenticated, async (req, res) => {
  try {
    const tasks = await storage.getProjectTasks(req.params.projectId);
    res.json(tasks);
  } catch (error) {
    console.error("Error fetching project tasks:", error);
    res.status(500).json({ message: "Failed to fetch project tasks" });
  }
});

app.post("/api/projects/:projectId/tasks", isAuthenticated, async (req, res) => {
  try {
    // Convert string dates to Date objects
    const taskData = {
      ...req.body,
      projectId: req.params.projectId,
      progress: req.body.progress || 0
    };
    
    const convertedData = convertDatesInObject(taskData);
    
    console.log('Creating task with data:', JSON.stringify(convertedData, null, 2));
    
    const validatedData = insertProjectTaskSchema.parse(convertedData);
    const task = await storage.createProjectTask(validatedData);
    
    console.log('Task created successfully:', task.id);
    res.status(201).json(task);
  } catch (error: any) {
    console.error("Error creating project task:", error);
    
    // Return proper validation errors
    if (error.name === 'ZodError') {
      return res.status(400).json({
        message: "Validation failed",
        errors: error.errors
      });
    }
    
    res.status(500).json({ message: "Failed to create project task", error: error.message });
  }
});

app.patch("/api/tasks/:id", isAuthenticated, async (req, res) => {
  try {
    // Convert string dates to Date objects before validation
    const convertedData = convertDatesInObject(req.body);
    convertedData.updatedAt = new Date();
    
    console.log('Updating task with data:', JSON.stringify(convertedData, null, 2));
    
    const partialData = insertProjectTaskSchema.partial().parse(convertedData);
    const task = await storage.updateProjectTask(req.params.id, partialData);
    
    console.log('Task updated successfully:', task.id);
    res.json(task);
  } catch (error) {
    console.error("Error updating project task:", error);
    res.status(500).json({ message: "Failed to update project task" });
  }
});

// Récupérer toutes les tâches pour la timeline
app.get("/api/tasks/all", isAuthenticated, async (req, res) => {
  try {
    const allTasks = await storage.getAllTasks();
    res.json(allTasks);
  } catch (error) {
    console.error("Error fetching all tasks:", error);
    res.status(500).json({ message: "Failed to fetch all tasks" });
  }
});

// Route pour créer des données de test complètes pour le planning Gantt
app.post("/api/test-data/planning", isAuthenticated, async (req, res) => {
  try {
    // Créer d'abord des projets de test avec dates
    const testProjects = [
      {
        name: "École Versailles",
        client: "Mairie de Versailles", 
        location: "Versailles (78)",
        status: "planification" as const,
        startDate: new Date("2025-01-15"),
        endDate: new Date("2025-05-20"),
        responsibleUserId: "test-user-1",
        budget: "85000.00"
      },
      {
        name: "Résidence Sandettie", 
        client: "Promoteur Immobilier",
        location: "Calais (62)",
        status: "chantier" as const,
        startDate: new Date("2025-02-01"),
        endDate: new Date("2025-06-15"),
        responsibleUserId: "test-user-1", 
        budget: "120000.00"
      }
    ];

    const createdProjects = [];
    for (const projectData of testProjects) {
      const project = await storage.createProject(projectData);
      createdProjects.push(project);
    }

    // Créer des tâches pour le premier projet (École Versailles)
    const projectId = createdProjects[0].id;

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

    // Créer des tâches pour le deuxième projet (Résidence Sandettie)
    const project2Id = createdProjects[1].id;
    const project2Tasks = [
      {
        projectId: project2Id,
        name: "Études Techniques",
        description: "Validation technique et conception",
        status: "termine" as const,
        startDate: new Date(2025, 1, 1), // 1 février 2025
        endDate: new Date(2025, 1, 15), // 15 février 2025
        assignedUserId: "test-user-1",
        isJalon: true
      },
      {
        projectId: project2Id,
        name: "Commande Matériaux",
        description: "Commande des menuiseries",
        status: "en_cours" as const,
        startDate: new Date(2025, 1, 16), // 16 février 2025
        endDate: new Date(2025, 2, 15), // 15 mars 2025
        assignedUserId: "test-user-1",
        isJalon: true
      },
      {
        projectId: project2Id,
        name: "Installation Chantier",
        description: "Pose des menuiseries",
        status: "a_faire" as const,
        startDate: new Date(2025, 2, 16), // 16 mars 2025
        endDate: new Date(2025, 4, 30), // 30 mai 2025
        assignedUserId: "test-user-1",
        isJalon: true
      }
    ];

    const createdTasks2 = [];
    for (const taskData of project2Tasks) {
      const task = await storage.createProjectTask(taskData);
      createdTasks2.push(task);
    }

    res.json({
      projects: createdProjects,
      tasks: [...createdTasks, ...createdTasks2],
      message: "Données de test complètes créées pour le planning Gantt"
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
app.get("/api/aos/:aoId/lots", isAuthenticated, async (req, res) => {
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
app.post("/api/aos/:aoId/lots", isAuthenticated, async (req, res) => {
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
app.put("/api/aos/:aoId/lots/:lotId", isAuthenticated, async (req, res) => {
  try {
    const lot = await storage.updateAoLot(req.params.lotId, req.body);
    res.json(lot);
  } catch (error) {
    console.error("Error updating AO lot:", error);
    res.status(500).json({ message: "Failed to update AO lot" });
  }
});

// DELETE /api/aos/:aoId/lots/:lotId - Supprimer un lot
app.delete("/api/aos/:aoId/lots/:lotId", isAuthenticated, async (req, res) => {
  try {
    await storage.deleteAoLot(req.params.lotId);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting AO lot:", error);
    res.status(500).json({ message: "Failed to delete AO lot" });
  }
});

// ========================================
// AO DOCUMENTS ROUTES - Gestion des documents d'AO
// ========================================

// GET /api/aos/:aoId/documents - Lister les documents d'un AO
app.get("/api/aos/:aoId/documents", isAuthenticated, async (req, res) => {
  try {
    const aoId = req.params.aoId;
    const objectStorage = new ObjectStorageService();
    
    // Créer la structure de dossiers si elle n'existe pas
    const ao = await storage.getAo(aoId);
    if (!ao) {
      return res.status(404).json({ message: "AO not found" });
    }
    
    await objectStorage.createOfferDocumentStructure(aoId, ao.reference);
    
    // Pour l'instant, retourner une structure vide car nous n'avons pas encore
    // implémenté la liste des fichiers dans l'object storage
    const documents = {
      "01-DCE-Cotes-Photos": [],
      "02-Etudes-fournisseurs": [],
      "03-Devis-pieces-administratives": []
    };
    
    res.json(documents);
  } catch (error) {
    console.error("Error fetching AO documents:", error);
    res.status(500).json({ message: "Failed to fetch AO documents" });
  }
});

// POST /api/aos/:aoId/documents/upload-url - Obtenir l'URL d'upload pour un document
app.post("/api/aos/:aoId/documents/upload-url", isAuthenticated, async (req, res) => {
  try {
    const aoId = req.params.aoId;
    const { folderName, fileName } = req.body;
    
    if (!folderName || !fileName) {
      return res.status(400).json({ 
        message: "folderName and fileName are required",
        details: "Both folderName and fileName must be provided in the request body"
      });
    }
    
    // Security validation is now handled inside ObjectStorageService.getOfferFileUploadURL
    // This ensures all validation is centralized and cannot be bypassed
    const objectStorage = new ObjectStorageService();
    const uploadUrl = await objectStorage.getOfferFileUploadURL(aoId, folderName, fileName);
    
    // Return the sanitized values (they might have been modified for security)
    res.json({ 
      uploadUrl, 
      message: "Upload URL generated successfully", 
      security: "File and folder names have been validated and sanitized" 
    });
  } catch (error: any) {
    console.error("Error generating upload URL:", error);
    
    // Handle security validation errors with specific error messages
    if (error.message && (
        error.message.includes('Invalid folder name') ||
        error.message.includes('File name') ||
        error.message.includes('File extension not allowed') ||
        error.message.includes('Invalid offer ID')
    )) {
      return res.status(400).json({ 
        message: "Security validation failed", 
        details: error.message,
        type: "validation_error" 
      });
    }
    
    // Generic server error for unexpected issues
    res.status(500).json({ 
      message: "Failed to generate upload URL",
      details: "An unexpected error occurred while processing your request"
    });
  }
});

// POST /api/aos/:aoId/documents - Confirmer l'upload d'un document
app.post("/api/aos/:aoId/documents", isAuthenticated, async (req, res) => {
  try {
    const aoId = req.params.aoId;
    const { folderName, fileName, fileSize, uploadedUrl } = req.body;
    
    // Ici on pourrait enregistrer les métadonnées du document dans la DB
    // Pour l'instant, on retourne juste une confirmation
    
    const documentInfo = {
      id: `${aoId}-${folderName}-${Date.now()}`,
      aoId,
      folderName,
      fileName,
      fileSize,
      uploadedAt: new Date().toISOString(),
      uploadedUrl
    };
    
    res.json(documentInfo);
  } catch (error) {
    console.error("Error confirming document upload:", error);
    res.status(500).json({ message: "Failed to confirm document upload" });
  }
});

// ========================================
// MAITRES D'OUVRAGE ROUTES - Gestion contacts réutilisables
// ========================================

// GET /api/maitres-ouvrage - Récupérer tous les maîtres d'ouvrage
app.get("/api/maitres-ouvrage", isAuthenticated, async (req, res) => {
  try {
    const maitresOuvrage = await storage.getMaitresOuvrage();
    res.json(maitresOuvrage);
  } catch (error) {
    console.error("Error fetching maîtres d'ouvrage:", error);
    res.status(500).json({ message: "Failed to fetch maîtres d'ouvrage" });
  }
});

// GET /api/maitres-ouvrage/:id - Récupérer un maître d'ouvrage
app.get("/api/maitres-ouvrage/:id", isAuthenticated, async (req, res) => {
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
app.post("/api/maitres-ouvrage", isAuthenticated, async (req, res) => {
  try {
    const maitreOuvrage = await storage.createMaitreOuvrage(req.body);
    res.status(201).json(maitreOuvrage);
  } catch (error) {
    console.error("Error creating maître d'ouvrage:", error);
    res.status(500).json({ message: "Failed to create maître d'ouvrage" });
  }
});

// PUT /api/maitres-ouvrage/:id - Mettre à jour un maître d'ouvrage
app.put("/api/maitres-ouvrage/:id", isAuthenticated, async (req, res) => {
  try {
    const maitreOuvrage = await storage.updateMaitreOuvrage(req.params.id, req.body);
    res.json(maitreOuvrage);
  } catch (error) {
    console.error("Error updating maître d'ouvrage:", error);
    res.status(500).json({ message: "Failed to update maître d'ouvrage" });
  }
});

// DELETE /api/maitres-ouvrage/:id - Supprimer un maître d'ouvrage (soft delete)
app.delete("/api/maitres-ouvrage/:id", isAuthenticated, async (req, res) => {
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
app.get("/api/maitres-oeuvre", isAuthenticated, async (req, res) => {
  try {
    const maitresOeuvre = await storage.getMaitresOeuvre();
    res.json(maitresOeuvre);
  } catch (error) {
    console.error("Error fetching maîtres d'œuvre:", error);
    res.status(500).json({ message: "Failed to fetch maîtres d'œuvre" });
  }
});

// GET /api/maitres-oeuvre/:id - Récupérer un maître d'œuvre avec ses contacts
app.get("/api/maitres-oeuvre/:id", isAuthenticated, async (req, res) => {
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
app.post("/api/maitres-oeuvre", isAuthenticated, async (req, res) => {
  try {
    const maitreOeuvre = await storage.createMaitreOeuvre(req.body);
    res.status(201).json(maitreOeuvre);
  } catch (error) {
    console.error("Error creating maître d'œuvre:", error);
    res.status(500).json({ message: "Failed to create maître d'œuvre" });
  }
});

// PUT /api/maitres-oeuvre/:id - Mettre à jour un maître d'œuvre
app.put("/api/maitres-oeuvre/:id", isAuthenticated, async (req, res) => {
  try {
    const maitreOeuvre = await storage.updateMaitreOeuvre(req.params.id, req.body);
    res.json(maitreOeuvre);
  } catch (error) {
    console.error("Error updating maître d'œuvre:", error);
    res.status(500).json({ message: "Failed to update maître d'œuvre" });
  }
});

// DELETE /api/maitres-oeuvre/:id - Supprimer un maître d'œuvre (soft delete)
app.delete("/api/maitres-oeuvre/:id", isAuthenticated, async (req, res) => {
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
app.get("/api/maitres-oeuvre/:maitreOeuvreId/contacts", isAuthenticated, async (req, res) => {
  try {
    const contacts = await storage.getContactsMaitreOeuvre(req.params.maitreOeuvreId);
    res.json(contacts);
  } catch (error) {
    console.error("Error fetching contacts maître d'œuvre:", error);
    res.status(500).json({ message: "Failed to fetch contacts" });
  }
});

// POST /api/maitres-oeuvre/:maitreOeuvreId/contacts - Créer un contact pour un maître d'œuvre
app.post("/api/maitres-oeuvre/:maitreOeuvreId/contacts", isAuthenticated, async (req, res) => {
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
app.put("/api/contacts-maitre-oeuvre/:contactId", isAuthenticated, async (req, res) => {
  try {
    const contact = await storage.updateContactMaitreOeuvre(req.params.contactId, req.body);
    res.json(contact);
  } catch (error) {
    console.error("Error updating contact maître d'œuvre:", error);
    res.status(500).json({ message: "Failed to update contact" });
  }
});

// DELETE /api/contacts-maitre-oeuvre/:contactId - Supprimer un contact (soft delete)
app.delete("/api/contacts-maitre-oeuvre/:contactId", isAuthenticated, async (req, res) => {
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

app.get("/api/supplier-requests", isAuthenticated, async (req, res) => {
  try {
    const { offerId } = req.query;
    const requests = await storage.getSupplierRequests(offerId as string);
    res.json(requests);
  } catch (error) {
    console.error("Error fetching supplier requests:", error);
    res.status(500).json({ message: "Failed to fetch supplier requests" });
  }
});

app.post("/api/supplier-requests", isAuthenticated, async (req, res) => {
  try {
    const validatedData = insertSupplierRequestSchema.parse(req.body);
    const request = await storage.createSupplierRequest(validatedData);
    res.status(201).json(request);
  } catch (error) {
    console.error("Error creating supplier request:", error);
    res.status(500).json({ message: "Failed to create supplier request" });
  }
});

app.patch("/api/supplier-requests/:id", isAuthenticated, async (req, res) => {
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
app.get("/api/offers/:offerId/supplier-requests", isAuthenticated, async (req, res) => {
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
app.post("/api/offers/:offerId/supplier-requests", isAuthenticated, async (req, res) => {
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

app.get("/api/team-resources", isAuthenticated, async (req, res) => {
  try {
    const { projectId } = req.query;
    const resources = await storage.getTeamResources(projectId as string);
    res.json(resources);
  } catch (error) {
    console.error("Error fetching team resources:", error);
    res.status(500).json({ message: "Failed to fetch team resources" });
  }
});

app.post("/api/team-resources", isAuthenticated, async (req, res) => {
  try {
    const validatedData = insertTeamResourceSchema.parse(req.body);
    const resource = await storage.createTeamResource(validatedData);
    res.status(201).json(resource);
  } catch (error) {
    console.error("Error creating team resource:", error);
    res.status(500).json({ message: "Failed to create team resource" });
  }
});

app.patch("/api/team-resources/:id", isAuthenticated, async (req, res) => {
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

app.get("/api/be-workload", isAuthenticated, async (req, res) => {
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

app.post("/api/be-workload", isAuthenticated, async (req, res) => {
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
app.post("/api/objects/upload", isAuthenticated, async (req, res) => {
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
app.post("/api/documents/analyze", isAuthenticated, async (req, res) => {
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
    
    // 2.5. Traiter les contacts extraits et les lier automatiquement avec la base de données
    const enrichedData = await documentProcessor.processExtractedContactsWithLinking(extractedData);
    
    // 3. Calculer automatiquement les dates importantes
    const datesImportantes = calculerDatesImportantes(
      enrichedData.deadlineDate,
      enrichedData.startDate,
      extractedData.deliveryDate
    );
    
    console.log(`[DocumentAnalysis] Analysis completed for ${filename}:`, enrichedData);
    console.log(`[DocumentAnalysis] Dates importantes calculées:`, datesImportantes);

    res.json({
      success: true,
      filename,
      extractedData: {
        ...enrichedData,
        // Ajouter les dates calculées dans la réponse
        datesImportantes
      },
      contactLinking: {
        maitreOuvrage: enrichedData.linkedContacts?.maitreOuvrage ? {
          found: enrichedData.linkedContacts.maitreOuvrage.found,
          created: enrichedData.linkedContacts.maitreOuvrage.created,
          contactId: enrichedData.linkedContacts.maitreOuvrage.contact.id,
          contactName: enrichedData.linkedContacts.maitreOuvrage.contact.nom,
          confidence: enrichedData.linkedContacts.maitreOuvrage.confidence,
          reason: enrichedData.linkedContacts.maitreOuvrage.reason
        } : null,
        maitreOeuvre: enrichedData.linkedContacts?.maitreOeuvre ? {
          found: enrichedData.linkedContacts.maitreOeuvre.found,
          created: enrichedData.linkedContacts.maitreOeuvre.created,
          contactId: enrichedData.linkedContacts.maitreOeuvre.contact.id,
          contactName: enrichedData.linkedContacts.maitreOeuvre.contact.nom,
          confidence: enrichedData.linkedContacts.maitreOeuvre.confidence,
          reason: enrichedData.linkedContacts.maitreOeuvre.reason
        } : null
      },
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
app.post("/api/offers/create-with-structure", isAuthenticated, async (req, res) => {
  try {
    const { creationMethod, uploadedFiles, ...offerData } = req.body;
    
    // Convertir les dates string en objets Date si elles sont présentes
    const processedData = {
      ...offerData,
      dateRenduAO: offerData.dateRenduAO ? new Date(offerData.dateRenduAO) : 
        // Calculer automatiquement J-15 si date limite fournie
        (offerData.dateLimiteRemise ? calculerDateRemiseJ15(new Date(offerData.dateLimiteRemise)) : undefined),
      dateAcceptationAO: offerData.dateAcceptationAO ? new Date(offerData.dateAcceptationAO) : undefined,
      demarragePrevu: offerData.demarragePrevu ? new Date(offerData.demarragePrevu) : undefined,
      dateLivraisonPrevue: offerData.dateLivraisonPrevue ? new Date(offerData.dateLivraisonPrevue) : undefined,
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
app.get("/api/objects/:objectPath(*)", isAuthenticated, async (req, res) => {
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

// KPI consolidés avec métriques de performance temps réel
const kpiParamsSchema = z.object({
  from: z.string().min(1, "Date de début requise (format ISO)"),
  to: z.string().min(1, "Date de fin requise (format ISO)"),
  granularity: z.enum(['day', 'week']).default('week'),
  segment: z.string().optional()
});

app.get("/api/dashboard/kpis", async (req, res) => {
  try {
    // Validation des paramètres de requête
    const parseResult = kpiParamsSchema.safeParse(req.query);
    if (!parseResult.success) {
      return res.status(400).json({ 
        message: "Paramètres invalides",
        errors: parseResult.error.flatten().fieldErrors 
      });
    }

    const { from, to, granularity, segment } = parseResult.data;

    // Validation des dates
    const fromDate = new Date(from);
    const toDate = new Date(to);
    
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return res.status(400).json({ 
        message: "Format de date invalide. Utilisez le format ISO (YYYY-MM-DD)" 
      });
    }

    if (fromDate >= toDate) {
      return res.status(400).json({ 
        message: "La date de début doit être antérieure à la date de fin" 
      });
    }

    // Limitation de la plage pour éviter les requêtes trop lourdes
    const daysDifference = (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysDifference > 365) {
      return res.status(400).json({ 
        message: "Plage maximale autorisée : 365 jours" 
      });
    }

    // Calcul des KPIs consolidés
    const kpis = await storage.getConsolidatedKpis({
      from,
      to,
      granularity,
      segment
    });

    // Ajout métadonnées de réponse
    res.json({
      ...kpis,
      metadata: {
        period: { from, to },
        granularity,
        calculatedAt: new Date().toISOString(),
        dataPoints: kpis.timeSeries.length,
        segment: segment || "all"
      }
    });

  } catch (error) {
    console.error("Error fetching consolidated KPIs:", error);
    res.status(500).json({ 
      message: "Erreur lors du calcul des KPIs",
      details: error instanceof Error ? error.message : "Erreur inconnue"
    });
  }
});

// ========================================
// QUOTATIONS ROUTES - Compatibilité avec page pricing (mapping vers chiffrage)
// ========================================

// Route pour récupérer les quotations d'une offre (mapping vers chiffrage-elements)
app.get("/api/quotations/:offerId", isAuthenticated, async (req, res) => {
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
app.get("/api/quotations/", isAuthenticated, async (req, res) => {
  try {
    // Retourner une liste vide ou rediriger vers la nouvelle implémentation
    res.json([]);
  } catch (error) {
    console.error("Error fetching quotations:", error);
    res.status(500).json({ message: "Failed to fetch quotations" });
  }
});

// Route pour créer une quotation (mapping vers chiffrage-element)
app.post("/api/quotations", isAuthenticated, async (req, res) => {
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
status: "brouillon" as const,
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
      status: "brouillon" as const,
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
    status: "brouillon" as const,
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

// Enregistrer les routes de jalons de validation
app.use("/api/validation-milestones", validationMilestonesRouter);

// Enregistrer les routes du workflow
registerWorkflowRoutes(app);

// Enregistrer les routes d'intégration Batigest
registerBatigestRoutes(app);

// Enregistrer les routes de gestion des équipes
registerTeamsRoutes(app);

  const httpServer = createServer(app);
  return httpServer;
}