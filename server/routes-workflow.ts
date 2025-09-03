import type { Express } from "express";
import { storage } from "./storage";

export function registerWorkflowRoutes(app: Express) {
  // ========================================
  // ROUTES ÉTUDE TECHNIQUE
  // ========================================
  
  // Récupérer les AOs en étude technique
  app.get("/api/aos/etude", async (req, res) => {
    try {
      const aos = await storage.getAos();
      // Filtrer les AOs simulés en étude technique
      const aosEtude = aos.filter((ao: any) => 
        ao.status === 'etude' || ao.status === 'en_cours_chiffrage'
      );
      
      // Ajouter des métadonnées pour l'étude technique
      const enrichedAos = aosEtude.map((ao: any) => ({
        ...ao,
        cctpAnalyzed: Math.random() > 0.3,
        technicalDetailsComplete: Math.random() > 0.4,
        plansAnalyzed: Math.random() > 0.5,
        lotsValidated: Math.random() > 0.3,
        daysInStudy: Math.floor(Math.random() * 10),
        priority: Math.random() > 0.7 ? 'urgent' : 'normal'
      }));
      
      res.json(enrichedAos);
    } catch (error) {
      res.status(500).json({ error: "Erreur lors de la récupération des AOs en étude" });
    }
  });

  // Valider l'étude technique d'un AO
  app.post("/api/aos/:id/validate-etude", async (req, res) => {
    try {
      const aoId = req.params.id;
      // Simulation de validation - dans un cas réel, on mettrait à jour le statut en BDD
      res.json({ 
        success: true, 
        message: "Étude technique validée, passage au chiffrage",
        aoId,
        newStatus: 'chiffrage'
      });
    } catch (error) {
      res.status(500).json({ error: "Erreur lors de la validation de l'étude" });
    }
  });

  // ========================================
  // ROUTES CHIFFRAGE
  // ========================================

  // Récupérer les AOs en chiffrage
  app.get("/api/aos/chiffrage", async (req, res) => {
    try {
      const aos = await storage.getAos();
      // Enrichir avec données de chiffrage
      const aosChiffrage = aos.map((ao: any) => ({
        ...ao,
        totalCalculated: Math.random() > 0.3,
        dpgfGenerated: Math.random() > 0.4,
        marginValidated: Math.random() > 0.5,
        coutMateriaux: Math.floor(Math.random() * 50000) + 10000,
        coutMainOeuvre: Math.floor(Math.random() * 30000) + 5000,
        montantTotal: Math.floor(Math.random() * 100000) + 20000,
        margin: Math.floor(Math.random() * 20) + 5,
        deadline: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000),
        lots: [
          { numero: "01", designation: "Menuiseries extérieures", montant: 15000 },
          { numero: "02", designation: "Menuiseries intérieures", montant: 8000 }
        ]
      }));
      
      res.json(aosChiffrage.filter((ao: any) => ao.status !== 'draft'));
    } catch (error) {
      res.status(500).json({ error: "Erreur lors de la récupération des AOs en chiffrage" });
    }
  });

  // Valider le chiffrage
  app.post("/api/aos/:id/validate-chiffrage", async (req, res) => {
    try {
      res.json({ 
        success: true, 
        message: "Chiffrage validé, devis prêt à envoyer",
        aoId: req.params.id,
        newStatus: 'devis_pret'
      });
    } catch (error) {
      res.status(500).json({ error: "Erreur lors de la validation du chiffrage" });
    }
  });

  // ========================================
  // ROUTES ENVOI DEVIS
  // ========================================

  // Récupérer les devis prêts
  app.get("/api/aos/devis-ready", async (req, res) => {
    try {
      const aos = await storage.getAos();
      const devisReady = aos.map((ao: any) => ({
        ...ao,
        devisSent: Math.random() > 0.5,
        clientResponse: Math.random() > 0.6,
        clientAccepted: Math.random() > 0.7,
        clientRefused: false,
        sentAt: new Date(Date.now() - Math.random() * 15 * 24 * 60 * 60 * 1000),
        relanceCount: Math.floor(Math.random() * 3),
        contactEmail: ao.contactAOEmail || "contact@client.fr",
        contactPhone: ao.contactAOTelephone || "01 23 45 67 89",
        montantTotal: parseFloat(ao.montantEstime) || Math.floor(Math.random() * 100000) + 20000
      }));
      
      res.json(devisReady);
    } catch (error) {
      res.status(500).json({ error: "Erreur lors de la récupération des devis" });
    }
  });

  // Envoyer un devis
  app.post("/api/aos/:id/send-devis", async (req, res) => {
    try {
      const { method } = req.body;
      res.json({ 
        success: true, 
        message: `Devis envoyé par ${method}`,
        aoId: req.params.id,
        sentAt: new Date()
      });
    } catch (error) {
      res.status(500).json({ error: "Erreur lors de l'envoi du devis" });
    }
  });

  // Relancer un client
  app.post("/api/aos/:id/relance", async (req, res) => {
    try {
      res.json({ 
        success: true, 
        message: "Relance client effectuée",
        aoId: req.params.id,
        relanceDate: new Date()
      });
    } catch (error) {
      res.status(500).json({ error: "Erreur lors de la relance" });
    }
  });

  // ========================================
  // ROUTES PROJETS & PLANIFICATION
  // ========================================

  // Récupérer les projets par statut
  app.get("/api/projects", async (req, res) => {
    try {
      const { status } = req.query;
      const projects = await storage.getProjects();
      
      // Enrichir les projets selon le statut demandé
      const enrichedProjects = projects.map((project: any) => {
        const baseProject = {
          ...project,
          reference: project.aoReference || `PRJ-${project.id.slice(0, 8)}`,
          client: project.clientName || "Client",
          location: project.location || "Localisation",
          montantTotal: project.totalAmount || Math.floor(Math.random() * 200000) + 50000
        };

        // Enrichissement spécifique selon le statut
        if (status === 'planification') {
          return {
            ...baseProject,
            tasksCreated: Math.random() > 0.3,
            teamsAssigned: Math.random() > 0.4,
            datesValidated: Math.random() > 0.5,
            readyToStart: Math.random() > 0.3,
            priority: Math.random() > 0.7 ? 'urgent' : 'normal',
            dateDebutPrevue: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            dateFinPrevue: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
            dureeJours: Math.floor(Math.random() * 60) + 10,
            teamCount: Math.floor(Math.random() * 3),
            teamRequired: 3,
            milestones: [
              { name: "Démarrage", date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
              { name: "Mi-parcours", date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }
            ]
          };
        } else if (status === 'chantier') {
          return {
            ...baseProject,
            progress: Math.floor(Math.random() * 100),
            isDelayed: Math.random() > 0.7,
            hasIssues: Math.random() > 0.8,
            hasBlockingIssues: false,
            issueCount: Math.floor(Math.random() * 5),
            dateDebut: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            dateFinPrevue: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            daysRemaining: Math.floor(Math.random() * 30),
            teamsOnSite: Math.floor(Math.random() * 4) + 1,
            teamsPresent: true,
            photosTaken: Math.random() > 0.3,
            reportUpdated: Math.random() > 0.4,
            todayTasks: [
              { name: "Pose menuiseries RDC", completed: true },
              { name: "Finitions étage 1", completed: false }
            ]
          };
        }

        return baseProject;
      });

      // Filtrer selon le statut si demandé
      const filteredProjects = status 
        ? enrichedProjects.filter((p: any) => p.status === status)
        : enrichedProjects;
      
      res.json(filteredProjects);
    } catch (error) {
      res.status(500).json({ error: "Erreur lors de la récupération des projets" });
    }
  });

  // Valider la planification
  app.post("/api/projects/:id/validate-planning", async (req, res) => {
    try {
      res.json({ 
        success: true, 
        message: "Planification validée",
        projectId: req.params.id,
        newStatus: 'approvisionnement'
      });
    } catch (error) {
      res.status(500).json({ error: "Erreur lors de la validation de la planification" });
    }
  });

  // Démarrer un chantier
  app.post("/api/projects/:id/start-chantier", async (req, res) => {
    try {
      res.json({ 
        success: true, 
        message: "Chantier démarré",
        projectId: req.params.id,
        newStatus: 'chantier',
        startedAt: new Date()
      });
    } catch (error) {
      res.status(500).json({ error: "Erreur lors du démarrage du chantier" });
    }
  });

  // Terminer un chantier
  app.post("/api/projects/:id/finish", async (req, res) => {
    try {
      res.json({ 
        success: true, 
        message: "Chantier terminé, passage en SAV",
        projectId: req.params.id,
        newStatus: 'sav',
        finishedAt: new Date()
      });
    } catch (error) {
      res.status(500).json({ error: "Erreur lors de la fin du chantier" });
    }
  });

  // Signaler un problème sur chantier
  app.post("/api/projects/:id/issue", async (req, res) => {
    try {
      const { issue } = req.body;
      res.json({ 
        success: true, 
        message: "Problème signalé",
        projectId: req.params.id,
        issue,
        reportedAt: new Date()
      });
    } catch (error) {
      res.status(500).json({ error: "Erreur lors du signalement du problème" });
    }
  });

  // Routes pour les aperçus et téléchargements
  app.get("/api/aos/:id/dpgf/preview", (req, res) => {
    res.send(`
      <html>
        <head><title>Aperçu DPGF</title></head>
        <body>
          <h1>Aperçu DPGF</h1>
          <p>Document DPGF pour l'AO ${req.params.id}</p>
          <p>Ce serait un PDF généré dans une vraie application</p>
        </body>
      </html>
    `);
  });

  app.get("/api/aos/:id/dpgf/download", (req, res) => {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="dpgf-${req.params.id}.pdf"`);
    res.send("Contenu PDF simulé");
  });

  app.get("/api/aos/:id/devis/preview", (req, res) => {
    res.send(`
      <html>
        <head><title>Aperçu Devis</title></head>
        <body>
          <h1>Aperçu Devis</h1>
          <p>Devis pour l'AO ${req.params.id}</p>
        </body>
      </html>
    `);
  });

  app.get("/api/aos/:id/devis/download", (req, res) => {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="devis-${req.params.id}.pdf"`);
    res.send("Contenu Devis PDF simulé");
  });
}