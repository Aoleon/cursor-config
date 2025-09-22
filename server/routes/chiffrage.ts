import type { Express } from "express";
import { z } from "zod";
import { insertChiffrageElementSchema, insertDpgfDocumentSchema } from "../../shared/schema";
import type { IStorage } from "../storage-poc";
import { isAuthenticated } from "../replitAuth";
import { DpgfComputeService } from "../services/dpgfComputeService";
import { PdfGeneratorService } from "../services/pdfGeneratorService";

// Schéma de validation pour les paramètres DPGF
const dpgfParamsSchema = z.object({
  includeOptional: z.boolean().optional().default(false),
  tvaPercentage: z.number().min(0).max(100).optional().default(20)
});

const dpgfQuerySchema = z.object({
  includeOptional: z.enum(["true", "false"]).optional().default("false"),
  tvaPercentage: z.string().regex(/^\d+(\.\d+)?$/).optional().default("20")
});

// Helper pour récupérer l'utilisateur authentifié
function getAuthenticatedUserId(req: any): string {
  const user = req.user;
  if (!user || !user.claims) {
    throw new Error("User not authenticated");
  }
  return user.claims.sub || user.claims.id || "unknown-user";
}

export function registerChiffrageRoutes(app: Express, storage: IStorage) {
  // Récupérer les éléments de chiffrage d'une offre
  app.get("/api/offers/:offerId/chiffrage-elements", isAuthenticated, async (req, res) => {
    try {
      const { offerId } = req.params;
      
      const elements = await storage.getChiffrageElementsByOffer(offerId);
      res.json(elements);
    } catch (error) {
      console.error("Error fetching chiffrage elements:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Créer un nouvel élément de chiffrage
  app.post("/api/offers/:offerId/chiffrage-elements", isAuthenticated, async (req, res) => {
    try {
      const { offerId } = req.params;
      
      // Validation des données
      const validatedData = insertChiffrageElementSchema.parse({
        ...req.body,
        offerId,
      });

      const element = await storage.createChiffrageElement(validatedData);
      res.status(201).json(element);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation error", details: error.errors });
      }
      console.error("Error creating chiffrage element:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Mettre à jour un élément de chiffrage
  app.put("/api/offers/:offerId/chiffrage-elements/:elementId", isAuthenticated, async (req, res) => {
    try {
      const { elementId } = req.params;
      
      // Validation des données (sans offerId car déjà défini)
      const validatedData = insertChiffrageElementSchema.partial().parse(req.body);

      const element = await storage.updateChiffrageElement(elementId, validatedData);
      res.json(element);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation error", details: error.errors });
      }
      console.error("Error updating chiffrage element:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Supprimer un élément de chiffrage
  app.delete("/api/offers/:offerId/chiffrage-elements/:elementId", isAuthenticated, async (req, res) => {
    try {
      const { elementId } = req.params;
      
      await storage.deleteChiffrageElement(elementId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting chiffrage element:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Récupérer le DPGF d'une offre
  app.get("/api/offers/:offerId/dpgf", isAuthenticated, async (req, res) => {
    try {
      const { offerId } = req.params;
      
      const dpgf = await storage.getDpgfDocumentByOffer(offerId);
      if (!dpgf) {
        return res.status(404).json({ error: "DPGF not found" });
      }
      
      res.json(dpgf);
    } catch (error) {
      console.error("Error fetching DPGF:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Générer un DPGF à partir des éléments de chiffrage avec PDF
  app.post("/api/offers/:offerId/dpgf/generate", isAuthenticated, async (req, res) => {
    try {
      const { offerId } = req.params;
      
      // Validation des paramètres avec Zod
      const validatedParams = dpgfParamsSchema.parse(req.body);
      const { includeOptional, tvaPercentage } = validatedParams;
      
      // Récupération de l'utilisateur authentifié
      const userId = getAuthenticatedUserId(req);

      console.log(`🔄 Generating DPGF for offer ${offerId}...`);

      // Récupérer les éléments de chiffrage
      const elements = await storage.getChiffrageElementsByOffer(offerId);
      
      if (elements.length === 0) {
        return res.status(400).json({ error: "Aucun élément de chiffrage trouvé" });
      }

      // Récupérer les données contextuelles
      const offer = await storage.getOffer(offerId);
      const [ao, aoLots] = offer?.aoId ? await Promise.all([
        storage.getAo(offer.aoId),
        storage.getAoLots(offer.aoId)
      ]) : [null, []];

      // Calculer les données DPGF avec le service spécialisé
      const dpgfData = await DpgfComputeService.computeDpgf(elements, {
        includeOptional,
        tvaPercentage,
        offer: offer || undefined,
        ao: ao || undefined,
        aoLots: aoLots || []
      });

      // Sérialiser les données pour le stockage
      const serializedData = DpgfComputeService.serializeForStorage(dpgfData);

      // Génération du PDF
      console.log("🔄 Generating DPGF PDF...");
      const pdfResult = await PdfGeneratorService.generateDpgfPdf(dpgfData);
      
      // Vérifier s'il existe déjà un DPGF pour cette offre
      const existingDpgf = await storage.getDpgfDocumentByOffer(offerId);
      
      let dpgf;
      if (existingDpgf) {
        // Mettre à jour le DPGF existant
        dpgf = await storage.updateDpgfDocument(existingDpgf.id, {
          totalHT: dpgfData.totals.totalHT.toString(),
          totalTVA: dpgfData.totals.totalTVA.toString(),
          totalTTC: dpgfData.totals.totalTTC.toString(),
          dpgfData: serializedData,
          generatedBy: userId,
          batigestRef: `BGT-${Date.now()}`, // Simulation Batigest
          batigestSyncedAt: new Date(),
          status: "finalise",
        });
      } else {
        // Créer un nouveau DPGF
        dpgf = await storage.createDpgfDocument({
          offerId,
          version: "1.0",
          status: "finalise",
          totalHT: dpgfData.totals.totalHT.toString(),
          totalTVA: dpgfData.totals.totalTVA.toString(),
          totalTTC: dpgfData.totals.totalTTC.toString(),
          dpgfData: serializedData,
          generatedBy: userId,
          batigestRef: `BGT-${Date.now()}`, // Simulation Batigest
          batigestSyncedAt: new Date(),
        });
      }

      console.log(`✅ DPGF generated successfully: ${pdfResult.filename}`);
      
      // Retourner les métadonnées du DPGF avec info PDF
      res.status(201).json({
        ...dpgf,
        pdfGenerated: true,
        pdfFilename: pdfResult.filename,
        pdfSize: pdfResult.size
      });
    } catch (error) {
      console.error("❌ Error generating DPGF:", error);
      res.status(500).json({ 
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Prévisualisation HTML du DPGF
  app.get("/api/offers/:offerId/dpgf/preview", isAuthenticated, async (req, res) => {
    try {
      const { offerId } = req.params;
      
      // Validation des paramètres query avec Zod
      const validatedQuery = dpgfQuerySchema.parse(req.query);
      const { includeOptional, tvaPercentage } = validatedQuery;

      console.log(`🔄 Generating DPGF preview for offer ${offerId}...`);

      // Récupérer les éléments de chiffrage
      const elements = await storage.getChiffrageElementsByOffer(offerId);
      
      if (elements.length === 0) {
        return res.status(404).json({ error: "Aucun élément de chiffrage trouvé" });
      }

      // Récupérer les données contextuelles
      const offer = await storage.getOffer(offerId);
      const [ao, aoLots] = offer?.aoId ? await Promise.all([
        storage.getAo(offer.aoId),
        storage.getAoLots(offer.aoId)
      ]) : [null, []];

      // Calculer les données DPGF
      const dpgfData = await DpgfComputeService.computeDpgf(elements, {
        includeOptional: includeOptional === "true",
        tvaPercentage: parseFloat(tvaPercentage),
        offer: offer || undefined,
        ao: ao || undefined,
        aoLots: aoLots || []
      });

      // Générer le HTML de prévisualisation
      const htmlPreview = await PdfGeneratorService.generateDpgfPreview(dpgfData);

      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.send(htmlPreview);
    } catch (error) {
      console.error("❌ Error generating DPGF preview:", error);
      res.status(500).json({ 
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Téléchargement du PDF DPGF
  app.get("/api/offers/:offerId/dpgf/download", isAuthenticated, async (req, res) => {
    try {
      const { offerId } = req.params;
      
      // Validation des paramètres query avec Zod
      const validatedQuery = dpgfQuerySchema.parse(req.query);
      const { includeOptional, tvaPercentage } = validatedQuery;

      console.log(`🔄 Generating DPGF PDF download for offer ${offerId}...`);

      // Récupérer les éléments de chiffrage
      const elements = await storage.getChiffrageElementsByOffer(offerId);
      
      if (elements.length === 0) {
        return res.status(404).json({ error: "Aucun élément de chiffrage trouvé" });
      }

      // Récupérer les données contextuelles
      const offer = await storage.getOffer(offerId);
      const [ao, aoLots] = offer?.aoId ? await Promise.all([
        storage.getAo(offer.aoId),
        storage.getAoLots(offer.aoId)
      ]) : [null, []];

      // Calculer les données DPGF
      const dpgfData = await DpgfComputeService.computeDpgf(elements, {
        includeOptional: includeOptional === "true",
        tvaPercentage: parseFloat(tvaPercentage),
        offer: offer || undefined,
        ao: ao || undefined,
        aoLots: aoLots || []
      });

      // Générer le PDF
      const pdfResult = await PdfGeneratorService.generateDpgfPdf(dpgfData);

      // Configuration des en-têtes pour le téléchargement
      res.setHeader("Content-Type", pdfResult.mimeType);
      res.setHeader("Content-Disposition", `attachment; filename="${pdfResult.filename}"`);
      res.setHeader("Content-Length", pdfResult.size);
      res.setHeader("Cache-Control", "no-cache");

      console.log(`✅ DPGF PDF download ready: ${pdfResult.filename}`);
      
      // Envoi du PDF
      res.send(pdfResult.buffer);
    } catch (error) {
      console.error("❌ Error downloading DPGF PDF:", error);
      res.status(500).json({ 
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Valider la fin d'études d'une offre
  app.post("/api/offers/:offerId/validate-studies", isAuthenticated, async (req, res) => {
    try {
      const { offerId } = req.params;
      
      // Récupération de l'utilisateur authentifié
      const userId = getAuthenticatedUserId(req);

      // Vérifier qu'un DPGF existe
      const dpgf = await storage.getDpgfDocumentByOffer(offerId);
      if (!dpgf) {
        return res.status(400).json({ error: "Aucun DPGF trouvé. Veuillez d'abord générer le DPGF." });
      }

      // Mettre à jour l'offre avec la validation fin d'études
      const offer = await storage.updateOffer(offerId, {
        finEtudesValidatedAt: new Date(),
        finEtudesValidatedBy: userId,
        status: "fin_etudes_validee", // Nouveau statut
        montantFinal: dpgf.totalTTC, // Montant final basé sur le DPGF
      });

      // Mettre à jour le DPGF comme validé
      await storage.updateDpgfDocument(dpgf.id, {
        status: "valide",
        validatedBy: userId,
        validatedAt: new Date(),
      });

      res.json(offer);
    } catch (error) {
      console.error("Error validating studies:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Transformer une offre validée en projet
  app.post("/api/offers/:offerId/convert-to-project", isAuthenticated, async (req, res) => {
    try {
      const { offerId } = req.params;
      
      // Récupération de l'utilisateur authentifié
      const userId = getAuthenticatedUserId(req);

      // Récupérer l'offre
      const offer = await storage.getOfferById(offerId);
      if (!offer) {
        return res.status(404).json({ error: "Offre non trouvée" });
      }

      // Vérifier que la fin d'études est validée
      if (!offer.finEtudesValidatedAt) {
        return res.status(400).json({ error: "La fin d'études doit être validée avant la conversion en projet" });
      }

      // Vérifier qu'il n'y a pas déjà un projet pour cette offre
      const existingProjects = await storage.getProjectsByOffer(offerId);
      if (existingProjects.length > 0) {
        return res.status(400).json({ error: "Un projet existe déjà pour cette offre" });
      }

      // Récupérer le DPGF pour le budget
      const dpgf = await storage.getDpgfDocumentByOffer(offerId);

      // Créer le projet
      const project = await storage.createProject({
        offerId,
        name: `Projet ${offer.reference} - ${offer.client}`,
        client: offer.client,
        location: offer.location,
        status: "etude",
        startDate: offer.demarragePrevu,
        budget: dpgf?.totalTTC || offer.montantFinal,
        responsibleUserId: offer.responsibleUserId || userId,
        chefTravaux: userId, // Par défaut, l'utilisateur qui convertit devient chef de travaux
      });

      // Créer les tâches de base du projet (5 étapes POC)
      const baseTasks = [
        { name: "Études", description: "Phase d'études techniques" },
        { name: "Planification", description: "Planification détaillée du projet" },
        { name: "Approvisionnement", description: "Commandes et approvisionnements" },
        { name: "Chantier", description: "Réalisation des travaux" },
        { name: "SAV", description: "Service après-vente" },
      ];

      for (let i = 0; i < baseTasks.length; i++) {
        const task = baseTasks[i];
        await storage.createProjectTask({
          projectId: project.id,
          name: task.name,
          description: task.description,
          status: i === 0 ? "en_cours" : "a_faire", // Première tâche en cours
          position: i,
          isJalon: true, // Toutes les étapes principales sont des jalons
        });
      }

      // Mettre à jour le statut de l'offre
      await storage.updateOffer(offerId, {
        status: "transforme_en_projet",
      });

      res.status(201).json(project);
    } catch (error) {
      console.error("Error converting offer to project:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
}