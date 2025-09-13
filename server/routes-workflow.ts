import type { Express } from "express";
import { storage } from "./storage";
import { EventType, createRealtimeEvent, commonQueryKeys } from '../shared/events';
import type { EventBus } from './eventBus';

export function registerWorkflowRoutes(app: Express, eventBus?: EventBus) {
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

  // ========================================
  // ROUTES SYSTÈME DE PRIORISATION INTELLIGENTE
  // ========================================

  // Récupérer toutes les priorités avec enrichissement des données
  app.get("/api/priorities", async (req, res) => {
    try {
      const offers = await storage.getOffers();
      const projects = await storage.getProjects();
      
      // Générer les données de priorité enrichies
      const priorities = [
        ...offers.map((offer: any) => {
          const montantScore = Math.min(((offer.montantEstime || 50000) / 200000) * 100, 100);
          const delaiScore = offer.deadline ? 
            Math.max(100 - (new Date(offer.deadline).getTime() - Date.now()) / (7 * 24 * 60 * 60 * 1000) * 10, 0) 
            : 50;
          const typeClientScore = offer.typeMarche === 'public' ? 80 : 
                                 offer.typeMarche === 'prive' ? 60 : 40;
          const complexiteScore = (offer.lots?.length || 1) * 20 + 30;
          const chargeBeScore = Math.random() * 100;
          const risqueScore = 50 + Math.random() * 30;
          const strategiqueScore = Math.random() * 100;
          
          const priorityScore = (
            montantScore * 0.25 + 
            delaiScore * 0.25 + 
            typeClientScore * 0.15 + 
            complexiteScore * 0.10 + 
            chargeBeScore * 0.10 + 
            risqueScore * 0.10 + 
            strategiqueScore * 0.05
          );

          const getPriorityLevel = (score: number) => {
            if (score > 80) return 'critique';
            if (score > 60) return 'elevee';
            if (score > 40) return 'normale';
            if (score > 20) return 'faible';
            return 'tres_faible';
          };

          return {
            id: `offer-${offer.id}`,
            offerId: offer.id,
            name: offer.reference || `Offre ${offer.id.slice(0, 8)}`,
            client: offer.clientName || 'Client inconnu',
            type: 'offer',
            priorityLevel: getPriorityLevel(priorityScore),
            priorityScore: Math.round(priorityScore * 100) / 100,
            montantScore: Math.round(montantScore * 100) / 100,
            delaiScore: Math.round(delaiScore * 100) / 100,
            typeClientScore: Math.round(typeClientScore * 100) / 100,
            complexiteScore: Math.round(complexiteScore * 100) / 100,
            chargeBeScore: Math.round(chargeBeScore * 100) / 100,
            risqueScore: Math.round(risqueScore * 100) / 100,
            strategiqueScore: Math.round(strategiqueScore * 100) / 100,
            montant: offer.montantEstime,
            deadline: offer.deadline,
            typeClient: offer.typeMarche,
            complexite: offer.lots?.length > 3 ? 'haute' : 'normale',
            chargeBeEstimee: offer.beHoursEstimated,
            autoCalculated: true,
            manualOverride: false,
            alertCritical: priorityScore > 80,
            alertSent: false,
            lastCalculatedAt: new Date(),
            isActive: true
          };
        }),
        
        ...projects.map((project: any) => {
          const montantScore = Math.min(((project.budget || 75000) / 300000) * 100, 100);
          const delaiScore = project.endDate ? 
            Math.max(100 - (new Date(project.endDate).getTime() - Date.now()) / (14 * 24 * 60 * 60 * 1000) * 10, 0) 
            : 50;
          const typeClientScore = 70;
          const complexiteScore = Math.random() * 100;
          const chargeBeScore = Math.random() * 100;
          const risqueScore = 40 + Math.random() * 40;
          const strategiqueScore = Math.random() * 100;
          
          const priorityScore = (
            montantScore * 0.25 + 
            delaiScore * 0.25 + 
            typeClientScore * 0.15 + 
            complexiteScore * 0.10 + 
            chargeBeScore * 0.10 + 
            risqueScore * 0.10 + 
            strategiqueScore * 0.05
          );

          const getPriorityLevel = (score: number) => {
            if (score > 80) return 'critique';
            if (score > 60) return 'elevee';
            if (score > 40) return 'normale';
            if (score > 20) return 'faible';
            return 'tres_faible';
          };

          return {
            id: `project-${project.id}`,
            projectId: project.id,
            name: project.name || `Projet ${project.id.slice(0, 8)}`,
            client: project.client || 'Client projet',
            type: 'project',
            priorityLevel: getPriorityLevel(priorityScore),
            priorityScore: Math.round(priorityScore * 100) / 100,
            montantScore: Math.round(montantScore * 100) / 100,
            delaiScore: Math.round(delaiScore * 100) / 100,
            typeClientScore: Math.round(typeClientScore * 100) / 100,
            complexiteScore: Math.round(complexiteScore * 100) / 100,
            chargeBeScore: Math.round(chargeBeScore * 100) / 100,
            risqueScore: Math.round(risqueScore * 100) / 100,
            strategiqueScore: Math.round(strategiqueScore * 100) / 100,
            montant: project.budget,
            deadline: project.endDate,
            typeClient: 'prive',
            complexite: 'normale',
            autoCalculated: true,
            manualOverride: false,
            alertCritical: priorityScore > 80,
            alertSent: false,
            lastCalculatedAt: new Date(),
            isActive: true
          };
        })
      ];

      res.json(priorities);
    } catch (error) {
      console.error('Erreur priorities:', error);
      res.status(500).json({ error: "Erreur lors de la récupération des priorités" });
    }
  });

  // Recalculer les priorités avec de nouveaux poids
  app.post("/api/priorities/recalculate", async (req, res) => {
    try {
      const { 
        montantWeight, 
        delaiWeight, 
        typeClientWeight, 
        complexiteWeight, 
        chargeBeWeight, 
        risqueWeight, 
        strategiqueWeight 
      } = req.body;
      
      // Vérifier que la somme des poids = 100
      const totalWeight = montantWeight + delaiWeight + typeClientWeight + 
                         complexiteWeight + chargeBeWeight + risqueWeight + strategiqueWeight;
      
      if (Math.abs(totalWeight - 100) > 0.01) {
        return res.status(400).json({ 
          error: "La somme des poids doit être égale à 100%",
          totalReceived: totalWeight 
        });
      }
      
      // Simuler le recalcul avec les nouveaux poids
      const offers = await storage.getOffers();
      const projects = await storage.getProjects();
      
      const recalculatedCount = offers.length + projects.length;
      
      // Émettre événement de mise à jour de configuration
      if (eventBus) {
        const configEvent = createRealtimeEvent({
          type: EventType.PRIORITY_CONFIG_UPDATED,
          entity: 'project',
          entityId: 'config',
          severity: 'info',
          affectedQueryKeys: [commonQueryKeys.priorities(), commonQueryKeys.priorityConfig()],
          metadata: {
            updatedBy: 'admin', // TODO: récupérer l'utilisateur réel
            newWeights: { montantWeight, delaiWeight, typeClientWeight, complexiteWeight, chargeBeWeight, risqueWeight, strategiqueWeight }
          }
        });
        eventBus.emit(configEvent);
      }
      
      res.json({ 
        success: true, 
        message: `${recalculatedCount} éléments recalculés avec les nouveaux poids`,
        weights: {
          montantWeight, delaiWeight, typeClientWeight,
          complexiteWeight, chargeBeWeight, risqueWeight, strategiqueWeight
        },
        recalculatedAt: new Date()
      });
    } catch (error) {
      console.error('Erreur recalcul priorités:', error);
      res.status(500).json({ error: "Erreur lors du recalcul des priorités" });
    }
  });

  // Forcer la priorité manuellement
  app.post("/api/priorities/:itemId/override", async (req, res) => {
    try {
      const { itemId } = req.params;
      const { priorityLevel, reason } = req.body;
      
      if (!['tres_faible', 'faible', 'normale', 'elevee', 'critique'].includes(priorityLevel)) {
        return res.status(400).json({ error: "Niveau de priorité invalide" });
      }
      
      // Émettre événement de priorité forcée
      if (eventBus) {
        const overrideEvent = createRealtimeEvent({
          type: EventType.PRIORITY_OVERRIDE_APPLIED,
          entity: itemId.startsWith('project-') ? 'project' : 'offer',
          entityId: itemId,
          severity: priorityLevel === 'critique' ? 'warning' : 'info',
          prevStatus: 'auto',
          newStatus: priorityLevel,
          affectedQueryKeys: [commonQueryKeys.priorities(), commonQueryKeys.priority(itemId)],
          metadata: {
            itemName: `Élément ${itemId}`,
            reason,
            overrideBy: 'user'
          }
        });
        eventBus.emit(overrideEvent);
      }
      
      // Simuler la mise à jour
      res.json({ 
        success: true, 
        message: "Priorité forcée avec succès",
        itemId,
        newPriorityLevel: priorityLevel,
        reason,
        overrideBy: "user", // Dans un vrai système, récupérer l'utilisateur depuis la session
        overrideAt: new Date()
      });
    } catch (error) {
      console.error('Erreur override priorité:', error);
      res.status(500).json({ error: "Erreur lors du forçage de priorité" });
    }
  });

  // Obtenir l'historique des priorités d'un élément
  app.get("/api/priorities/:itemId/history", async (req, res) => {
    try {
      const { itemId } = req.params;
      
      // Simuler un historique de changements
      const history = [
        {
          id: "hist-1",
          itemId,
          previousLevel: "normale",
          newLevel: "elevee",
          previousScore: 55.2,
          newScore: 72.8,
          reason: "Délai raccourci par le client",
          changedBy: "System",
          changedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // Il y a 2 jours
          isAutomatic: true
        },
        {
          id: "hist-2",
          itemId,
          previousLevel: "elevee",
          newLevel: "critique",
          previousScore: 72.8,
          newScore: 85.1,
          reason: "Priorité forcée par manager",
          changedBy: "Julien Lemaire",
          changedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // Il y a 1 jour
          isAutomatic: false
        }
      ];
      
      res.json(history);
    } catch (error) {
      console.error('Erreur historique priorité:', error);
      res.status(500).json({ error: "Erreur lors de la récupération de l'historique" });
    }
  });

  // Obtenir les alertes de priorité critique
  app.get("/api/priorities/alerts", async (req, res) => {
    try {
      // Simuler des alertes critiques
      const alerts = [
        {
          id: "alert-1",
          itemId: "offer-123",
          itemName: "Rénovation Mairie Boulogne",
          priorityLevel: "critique",
          priorityScore: 87.5,
          alertType: "deadline_approaching",
          message: "Délai de réponse dans 2 jours",
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // Il y a 2 heures
          isActive: true,
          isDismissed: false
        },
        {
          id: "alert-2",
          itemId: "project-456",
          itemName: "Chantier Résidence Neptune",
          priorityLevel: "critique",
          priorityScore: 91.2,
          alertType: "high_value_urgent",
          message: "Projet haute valeur avec délai serré",
          createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000), // Il y a 4 heures
          isActive: true,
          isDismissed: false
        }
      ];
      
      res.json(alerts);
    } catch (error) {
      console.error('Erreur alertes priorité:', error);
      res.status(500).json({ error: "Erreur lors de la récupération des alertes" });
    }
  });

  // Marquer une alerte comme vue/résolue
  app.post("/api/priorities/alerts/:alertId/dismiss", async (req, res) => {
    try {
      const { alertId } = req.params;
      
      // Émettre événement de mise à jour des alertes
      if (eventBus) {
        const alertDismissEvent = createRealtimeEvent({
          type: EventType.PRIORITY_ALERT_CREATED,
          entity: 'project',
          entityId: alertId,
          severity: 'info',
          affectedQueryKeys: [commonQueryKeys.priorityAlerts()],
          metadata: {
            action: 'dismissed',
            dismissedBy: 'user'
          }
        });
        eventBus.emit(alertDismissEvent);
      }
      
      res.json({ 
        success: true, 
        message: "Alerte marquée comme vue",
        alertId,
        dismissedAt: new Date(),
        dismissedBy: "user"
      });
    } catch (error) {
      console.error('Erreur dismiss alerte:', error);
      res.status(500).json({ error: "Erreur lors de la suppression de l'alerte" });
    }
  });

  // Obtenir les statistiques de priorité
  app.get("/api/priorities/stats", async (req, res) => {
    try {
      const offers = await storage.getOffers();
      const projects = await storage.getProjects();
      
      // Simuler les statistiques
      const stats = {
        totalItems: offers.length + projects.length,
        byLevel: {
          critique: Math.floor((offers.length + projects.length) * 0.15),
          elevee: Math.floor((offers.length + projects.length) * 0.25),
          normale: Math.floor((offers.length + projects.length) * 0.40),
          faible: Math.floor((offers.length + projects.length) * 0.15),
          tres_faible: Math.floor((offers.length + projects.length) * 0.05)
        },
        averageScore: 62.3,
        alertsActive: 3,
        manualOverrides: 5,
        lastUpdate: new Date(),
        trendsLastWeek: {
          criticalIncrease: 2,
          manualOverridesCount: 3,
          averageScoreChange: +2.1
        }
      };
      
      res.json(stats);
    } catch (error) {
      console.error('Erreur stats priorité:', error);
      res.status(500).json({ error: "Erreur lors de la récupération des statistiques" });
    }
  });

  // Configuration des règles de priorité
  app.get("/api/priorities/config", async (req, res) => {
    try {
      const config = {
        weights: {
          montantWeight: 25,
          delaiWeight: 25,
          typeClientWeight: 15,
          complexiteWeight: 10,
          chargeBeWeight: 10,
          risqueWeight: 10,
          strategiqueWeight: 5
        },
        thresholds: {
          critique: 80,
          elevee: 60,
          normale: 40,
          faible: 20
        },
        autoRecalculate: true,
        alertsEnabled: true,
        notificationChannels: ['email', 'dashboard'],
        lastConfigUpdate: new Date(),
        configuredBy: "admin"
      };
      
      res.json(config);
    } catch (error) {
      console.error('Erreur config priorité:', error);
      res.status(500).json({ error: "Erreur lors de la récupération de la configuration" });
    }
  });

  // Sauvegarder la configuration des règles de priorité
  app.post("/api/priorities/config", async (req, res) => {
    try {
      const { weights, thresholds, autoRecalculate, alertsEnabled, notificationChannels } = req.body;
      
      // Validation basique
      if (weights) {
        const totalWeight = Object.values(weights).reduce((sum: number, weight: any) => sum + weight, 0);
        if (Math.abs(totalWeight - 100) > 0.01) {
          return res.status(400).json({ error: "La somme des poids doit être égale à 100%" });
        }
      }
      
      // Émettre événement de configuration mise à jour
      if (eventBus) {
        const configSaveEvent = createRealtimeEvent({
          type: EventType.PRIORITY_CONFIG_UPDATED,
          entity: 'project',
          entityId: 'config-save',
          severity: 'info',
          affectedQueryKeys: [commonQueryKeys.priorityConfig(), commonQueryKeys.priorities()],
          metadata: {
            updatedBy: 'user',
            newConfig: { weights, thresholds, autoRecalculate, alertsEnabled, notificationChannels }
          }
        });
        eventBus.emit(configSaveEvent);
      }
      
      // Simuler la sauvegarde
      res.json({ 
        success: true, 
        message: "Configuration sauvegardée",
        config: {
          weights, thresholds, autoRecalculate, alertsEnabled, notificationChannels,
          lastConfigUpdate: new Date(),
          configuredBy: "user"
        }
      });
    } catch (error) {
      console.error('Erreur save config priorité:', error);
      res.status(500).json({ error: "Erreur lors de la sauvegarde de la configuration" });
    }
  });
}