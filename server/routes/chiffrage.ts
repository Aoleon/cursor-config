import type { Express } from "express";
import { z } from "zod";
import { insertChiffrageElementSchema, insertDpgfDocumentSchema } from "../../shared/schema";
import type { IStorage } from "../storage-poc";
import { isAuthenticated } from "../replitAuth";
import { DpgfComputeService } from "../services/dpgfComputeService";
import { PdfGeneratorService } from "../services/pdfGeneratorService";
import { asyncHandler, ValidationError, NotFoundError } from "../utils/error-handler";
import { logger } from "../utils/logger";

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
    throw new ValidationError("User not authenticated");
  }
  return user.claims.sub || user.claims.id || "unknown-user";
}

export function registerChiffrageRoutes(app: Express, storage: IStorage) {
  // Récupérer les éléments de chiffrage d'une offre
  app.get("/api/offers/:offerId/chiffrage-elements", isAuthenticated, asyncHandler(async (req, res) => {
    const { offerId } = req.params;
    
    logger.info('[Chiffrage] Récupération éléments chiffrage', { 
      userId: (req.user as any)?.id,
      metadata: { offerId }
    });
    
    const elements = await storage.getChiffrageElementsByOffer(offerId);
    
    logger.info('[Chiffrage] Éléments récupérés', { 
      metadata: { offerId, count: elements.length }
    });
    
    res.json(elements);
  }));

  // Créer un nouvel élément de chiffrage
  app.post("/api/offers/:offerId/chiffrage-elements", isAuthenticated, asyncHandler(async (req, res) => {
    const { offerId } = req.params;
    
    logger.info('[Chiffrage] Création élément chiffrage', { 
      userId: (req.user as any)?.id,
      metadata: { offerId }
    });
    
    // Validation des données
    const validationResult = insertChiffrageElementSchema.safeParse({
      ...req.body,
      offerId,
    });

    if (!validationResult.success) {
      throw new ValidationError("Données d'élément de chiffrage invalides");
    }

    const element = await storage.createChiffrageElement(validationResult.data);
    
    logger.info('[Chiffrage] Élément créé', { 
      metadata: { offerId, elementId: element.id }
    });
    
    res.status(201).json(element);
  }));

  // Mettre à jour un élément de chiffrage
  app.put("/api/offers/:offerId/chiffrage-elements/:elementId", isAuthenticated, asyncHandler(async (req, res) => {
    const { offerId, elementId } = req.params;
    
    logger.info('[Chiffrage] Modification élément chiffrage', { 
      userId: (req.user as any)?.id,
      metadata: { offerId, elementId }
    });
    
    // Validation des données (sans offerId car déjà défini)
    const validationResult = insertChiffrageElementSchema.partial().safeParse(req.body);

    if (!validationResult.success) {
      throw new ValidationError("Données de modification invalides");
    }

    const element = await storage.updateChiffrageElement(elementId, validationResult.data);
    
    logger.info('[Chiffrage] Élément modifié', { 
      metadata: { offerId, elementId }
    });
    
    res.json(element);
  }));

  // Supprimer un élément de chiffrage
  app.delete("/api/offers/:offerId/chiffrage-elements/:elementId", isAuthenticated, asyncHandler(async (req, res) => {
    const { offerId, elementId } = req.params;
    
    logger.info('[Chiffrage] Suppression élément chiffrage', { 
      userId: (req.user as any)?.id,
      metadata: { offerId, elementId }
    });
    
    await storage.deleteChiffrageElement(elementId);
    
    logger.info('[Chiffrage] Élément supprimé', { 
      metadata: { offerId, elementId }
    });
    
    res.status(204).send();
  }));

  // Récupérer le DPGF d'une offre
  app.get("/api/offers/:offerId/dpgf", isAuthenticated, asyncHandler(async (req, res) => {
    const { offerId } = req.params;
    
    logger.info('[Chiffrage] Récupération DPGF', { 
      offerId,
      userId: (req.user as any)?.id 
    });
    
    const dpgf = await storage.getDpgfDocumentByOffer(offerId);
    if (!dpgf) {
      throw new NotFoundError(`DPGF pour offre ${offerId} non trouvé`);
    }
    
    logger.info('[Chiffrage] DPGF récupéré', { 
      offerId,
      dpgfId: dpgf.id 
    });
    
    res.json(dpgf);
  }));

  // Générer un DPGF à partir des éléments de chiffrage avec PDF
  app.post("/api/offers/:offerId/dpgf/generate", isAuthenticated, asyncHandler(async (req, res) => {
    const { offerId } = req.params;
    
    // Validation des paramètres avec Zod
    const validationResult = dpgfParamsSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new ValidationError("Paramètres DPGF invalides");
    }

    const { includeOptional, tvaPercentage } = validationResult.data;
    
    // Récupération de l'utilisateur authentifié
    const userId = getAuthenticatedUserId(req);

    logger.info('[Chiffrage] Génération DPGF', { 
      offerId,
      includeOptional,
      tvaPercentage,
      userId 
    });

    // Récupérer les éléments de chiffrage
    const elements = await storage.getChiffrageElementsByOffer(offerId);
    
    if (elements.length === 0) {
      throw new ValidationError("Aucun élément de chiffrage trouvé");
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
    logger.info('[Chiffrage] Génération PDF DPGF', { metadata: { offerId } });
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
        batigestRef: `BGT-${Date.now()}`,
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
        batigestRef: `BGT-${Date.now()}`,
        batigestSyncedAt: new Date(),
      });
    }

    logger.info('[Chiffrage] DPGF généré avec succès', { 
      offerId,
      dpgfId: dpgf.id,
      pdfFilename: pdfResult.filename,
      pdfSize: pdfResult.size 
    });
    
    // Retourner les métadonnées du DPGF avec info PDF
    res.status(201).json({
      ...dpgf,
      pdfGenerated: true,
      pdfFilename: pdfResult.filename,
      pdfSize: pdfResult.size
    });
  }));

  // Prévisualisation HTML du DPGF
  app.get("/api/offers/:offerId/dpgf/preview", isAuthenticated, asyncHandler(async (req, res) => {
    const { offerId } = req.params;
    
    // Validation des paramètres query avec Zod
    const validationResult = dpgfQuerySchema.safeParse(req.query);
    if (!validationResult.success) {
      throw new ValidationError("Paramètres de prévisualisation invalides");
    }

    const { includeOptional, tvaPercentage } = validationResult.data;

    logger.info('[Chiffrage] Prévisualisation DPGF', { 
      offerId,
      includeOptional,
      tvaPercentage,
      userId: (req.user as any)?.id 
    });

    // Récupérer les éléments de chiffrage
    const elements = await storage.getChiffrageElementsByOffer(offerId);
    
    if (elements.length === 0) {
      throw new NotFoundError("Aucun élément de chiffrage trouvé");
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

    logger.info('[Chiffrage] Prévisualisation générée', { metadata: { offerId } });

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(htmlPreview);
  }));

  // Téléchargement du PDF DPGF
  app.get("/api/offers/:offerId/dpgf/download", isAuthenticated, asyncHandler(async (req, res) => {
    const { offerId } = req.params;
    
    // Validation des paramètres query avec Zod
    const validationResult = dpgfQuerySchema.safeParse(req.query);
    if (!validationResult.success) {
      throw new ValidationError("Paramètres de téléchargement invalides");
    }

    const { includeOptional, tvaPercentage } = validationResult.data;

    logger.info('[Chiffrage] Téléchargement PDF DPGF', { 
      offerId,
      includeOptional,
      tvaPercentage,
      userId: (req.user as any)?.id 
    });

    // Récupérer les éléments de chiffrage
    const elements = await storage.getChiffrageElementsByOffer(offerId);
    
    if (elements.length === 0) {
      throw new NotFoundError("Aucun élément de chiffrage trouvé");
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

    logger.info('[Chiffrage] PDF téléchargé', { 
      offerId,
      filename: pdfResult.filename,
      size: pdfResult.size 
    });
    
    // Envoi du PDF
    res.send(pdfResult.buffer);
  }));

  // Valider la fin d'études d'une offre
  app.post("/api/offers/:offerId/validate-studies", isAuthenticated, asyncHandler(async (req, res) => {
    const { offerId } = req.params;
    
    // Récupération de l'utilisateur authentifié
    const userId = getAuthenticatedUserId(req);

    logger.info('[Chiffrage] Validation fin d\'études', { 
      offerId,
      userId 
    });

    // Vérifier qu'un DPGF existe
    const dpgf = await storage.getDpgfDocumentByOffer(offerId);
    if (!dpgf) {
      throw new ValidationError("Aucun DPGF trouvé. Veuillez d'abord générer le DPGF.");
    }

    // Mettre à jour l'offre avec la validation fin d'études
    const offer = await storage.updateOffer(offerId, {
      finEtudesValidatedAt: new Date(),
      finEtudesValidatedBy: userId,
      status: "fin_etudes_validee",
      montantFinal: dpgf.totalTTC,
    });

    // Mettre à jour le DPGF comme validé
    await storage.updateDpgfDocument(dpgf.id, {
      status: "valide",
      validatedBy: userId,
      validatedAt: new Date(),
    });

    logger.info('[Chiffrage] Fin d\'études validée', { 
      offerId,
      dpgfId: dpgf.id 
    });

    res.json(offer);
  }));

  // Transformer une offre validée en projet
  app.post("/api/offers/:offerId/convert-to-project", isAuthenticated, asyncHandler(async (req, res) => {
    const { offerId } = req.params;
    
    // Récupération de l'utilisateur authentifié
    const userId = getAuthenticatedUserId(req);

    logger.info('[Chiffrage] Conversion offre en projet', { 
      offerId,
      userId 
    });

    // Récupérer l'offre
    const offer = await storage.getOfferById(offerId);
    if (!offer) {
      throw new NotFoundError(`Offre ${offerId} non trouvée`);
    }

    // Vérifier que la fin d'études est validée
    if (!offer.finEtudesValidatedAt) {
      throw new ValidationError("La fin d'études doit être validée avant la conversion en projet");
    }

    // Vérifier qu'il n'y a pas déjà un projet pour cette offre
    const existingProjects = await storage.getProjectsByOffer(offerId);
    if (existingProjects.length > 0) {
      throw new ValidationError("Un projet existe déjà pour cette offre");
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
      chefTravaux: userId,
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
        status: i === 0 ? "en_cours" : "a_faire",
        position: i,
        isJalon: true,
      });
    }

    // Mettre à jour le statut de l'offre
    await storage.updateOffer(offerId, {
      status: "transforme_en_projet",
    });

    logger.info('[Chiffrage] Offre convertie en projet', { 
      offerId,
      projectId: project.id 
    });

    res.status(201).json(project);
  }));
}
