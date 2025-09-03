import type { Express } from "express";
import { z } from "zod";
import { insertChiffrageElementSchema, insertDpgfDocumentSchema } from "../../shared/schema";
import type { IStorage } from "../storage";
import { isAuthenticated } from "../replitAuth";

export function registerChiffrageRoutes(app: Express, storage: IStorage) {
  // Récupérer les éléments de chiffrage d'une offre
  app.get("/api/offers/:offerId/chiffrage-elements", async (req, res) => {
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
  app.post("/api/offers/:offerId/chiffrage-elements", async (req, res) => {
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
  app.put("/api/offers/:offerId/chiffrage-elements/:elementId", async (req, res) => {
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
  app.delete("/api/offers/:offerId/chiffrage-elements/:elementId", async (req, res) => {
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
  app.get("/api/offers/:offerId/dpgf", async (req, res) => {
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

  // Générer un DPGF à partir des éléments de chiffrage
  app.post("/api/offers/:offerId/dpgf/generate", async (req, res) => {
    try {
      const { offerId } = req.params;
      const userId = "test-user-1"; // TODO: Get from authenticated user

      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      // Récupérer les éléments de chiffrage
      const elements = await storage.getChiffrageElementsByOffer(offerId);
      
      if (elements.length === 0) {
        return res.status(400).json({ error: "Aucun élément de chiffrage trouvé" });
      }

      // Calculer les totaux
      const totalHT = elements.reduce((sum: number, el: any) => sum + parseFloat(el.totalPrice), 0);
      const totalTVA = totalHT * 0.20; // 20% TVA
      const totalTTC = totalHT + totalTVA;

      // Préparer les données structurées pour le DPGF
      const dpgfData = {
        elements: elements.map((el: any) => ({
          category: el.category,
          subcategory: el.subcategory,
          designation: el.designation,
          quantity: parseFloat(el.quantity),
          unit: el.unit,
          unitPrice: parseFloat(el.unitPrice),
          totalPrice: parseFloat(el.totalPrice),
          coefficient: parseFloat(el.coefficient || '1'),
          marginPercentage: parseFloat(el.marginPercentage || '20'),
          supplier: el.supplier,
          supplierRef: el.supplierRef,
        })),
        totals: {
          totalHT: totalHT.toFixed(2),
          totalTVA: totalTVA.toFixed(2),
          totalTTC: totalTTC.toFixed(2),
        },
        generatedAt: new Date().toISOString(),
      };

      // Vérifier s'il existe déjà un DPGF pour cette offre
      const existingDpgf = await storage.getDpgfDocumentByOffer(offerId);
      
      let dpgf;
      if (existingDpgf) {
        // Mettre à jour le DPGF existant
        dpgf = await storage.updateDpgfDocument(existingDpgf.id, {
          totalHT: totalHT.toString(),
          totalTVA: totalTVA.toString(),
          totalTTC: totalTTC.toString(),
          dpgfData,
          generatedBy: userId,
          batigestRef: `BGT-${Date.now()}`, // Simulation Batigest
          batigestSyncedAt: new Date(),
        });
      } else {
        // Créer un nouveau DPGF
        dpgf = await storage.createDpgfDocument({
          offerId,
          version: "1.0",
          status: "brouillon",
          totalHT: totalHT.toString(),
          totalTVA: totalTVA.toString(),
          totalTTC: totalTTC.toString(),
          dpgfData,
          generatedBy: userId,
          batigestRef: `BGT-${Date.now()}`, // Simulation Batigest
          batigestSyncedAt: new Date(),
        });
      }

      res.status(201).json(dpgf);
    } catch (error) {
      console.error("Error generating DPGF:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Valider la fin d'études d'une offre
  app.post("/api/offers/:offerId/validate-studies", async (req, res) => {
    try {
      const { offerId } = req.params;
      const userId = "test-user-1"; // TODO: Get from authenticated user

      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

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
  app.post("/api/offers/:offerId/convert-to-project", async (req, res) => {
    try {
      const { offerId } = req.params;
      const userId = "test-user-1"; // TODO: Get from authenticated user

      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

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