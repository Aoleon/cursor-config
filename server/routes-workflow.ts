import type { Express } from "express";
import { storage } from "./storage-poc";
import { EventType, createRealtimeEvent, commonQueryKeys } from '../shared/events';
import type { EventBus } from './eventBus';
import { isAuthenticated } from "./replitAuth";
import { validateQuery, validateBody } from "./middleware/validation";
import { sendSuccess, asyncHandler } from "./middleware/errorHandler";
import { z } from "zod";
import { logger } from "./utils/logger";
import { ValidationError, NotFoundError, DatabaseError } from "./utils/error-handler";
import {
  validateEtudeSchema,
  validateChiffrageSchema,
  relanceSchema,
  validatePlanningSchema,
  startChantierSchema,
  finishProjectSchema
} from "./validation-schemas";

const projectStatusValues = [
  "passation", "etude", "visa_architecte", "planification", 
  "approvisionnement", "chantier", "sav"
] as const;

const priorityLevelValues = [
  "tres_faible", "faible", "normale", "elevee", "critique"
] as const;

const workflowProjectsQuerySchema = z.object({
  status: z.enum(projectStatusValues).optional()
});

const sendDevisSchema = z.object({
  method: z.string().min(1, "Méthode d'envoi requise")
});

const projectIssueSchema = z.object({
  issue: z.string().min(1, "Description du problème requise")
});

const recalculatePrioritiesSchema = z.object({
  montantWeight: z.number().min(0).max(100),
  delaiWeight: z.number().min(0).max(100),
  typeClientWeight: z.number().min(0).max(100),
  complexiteWeight: z.number().min(0).max(100),
  chargeBeWeight: z.number().min(0).max(100),
  risqueWeight: z.number().min(0).max(100),
  strategiqueWeight: z.number().min(0).max(100)
});

const priorityOverrideSchema = z.object({
  priorityLevel: z.enum(priorityLevelValues),
  reason: z.string().min(1, "Raison du changement requise")
});

const priorityConfigSchema = z.object({
  weights: z.object({
    montantWeight: z.number().min(0).max(100),
    delaiWeight: z.number().min(0).max(100),
    typeClientWeight: z.number().min(0).max(100),
    complexiteWeight: z.number().min(0).max(100),
    chargeBeWeight: z.number().min(0).max(100),
    risqueWeight: z.number().min(0).max(100),
    strategiqueWeight: z.number().min(0).max(100)
  }).optional(),
  thresholds: z.object({
    critique: z.number().min(0).max(100),
    elevee: z.number().min(0).max(100),
    normale: z.number().min(0).max(100),
    faible: z.number().min(0).max(100)
  }).optional(),
  autoRecalculate: z.boolean().optional(),
  alertsEnabled: z.boolean().optional(),
  notificationChannels: z.array(z.string()).optional()
});

export function registerWorkflowRoutes(app: Express, eventBus?: EventBus) {
  // ========================================
  // ROUTES ÉTUDE TECHNIQUE
  // ========================================
  
  app.get("/api/aos/etude", isAuthenticated, asyncHandler(async (req, res) => {
    const aos = await storage.getAos();
    const aosEtude = aos.filter((ao: any) => 
      ao.status === 'etude' || ao.status === 'en_cours_chiffrage'
    );
    
    const enrichedAos = aosEtude.map((ao: any) => ({
      ...ao,
      cctpAnalyzed: Math.random() > 0.3,
      technicalDetailsComplete: Math.random() > 0.4,
      plansAnalyzed: Math.random() > 0.5,
      lotsValidated: Math.random() > 0.3,
      daysInStudy: Math.floor(Math.random() * 10),
      priority: Math.random() > 0.7 ? 'urgent' : 'normal'
    }));
    
    logger.info('[Workflow] AOs en étude récupérés', { metadata: { count: enrichedAos.length 

        }
                });
    
    res.json(enrichedAos);
        }

                  }


                            }


                          }));

  app.post("/api/aos/:id/validate-etude", 
    isAuthenticated,
    validateBody(validateEtudeSchema),
    asyncHandler(async (req, res) => {
    const aoId = req.params.id;
    
    const existingAo = await storage.getAo(aoId);
    if (!existingAo) {
      throw new NotFoundError("AO non trouvé");
    }
    
    await storage.updateAo(aoId, { status: 'en_cours_chiffrage' });
    
    logger.info('[Workflow] Étude technique validée', { metadata: { aoId, newStatus: 'en_cours_chiffrage' 

        }
                });
    
    res.json({ 
      success: true, 
      message: "Étude technique validée, passage au chiffrage",
      aoId,
      newStatus: 'en_cours_chiffrage'

          });
        }

                  }


                            }


                          }));

  // ========================================
  // ROUTES CHIFFRAGE
  // ========================================

  app.get("/api/aos/chiffrage", isAuthenticated, asyncHandler(async (req, res) => {
    const aos = await storage.getAos();
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
    
    const filtered = aosChiffrage.filter((ao: any) => ao.status !== 'draft');
    
    logger.info('[Workflow] AOs en chiffrage récupérés', { metadata: { count: filtered.length 
        }
            });
    
    res.json(filtered);
        }

                  }


                            }


                          }));

  app.post("/api/aos/:id/validate-chiffrage", 
    isAuthenticated,
    validateBody(validateChiffrageSchema),
    asyncHandler(async (req, res) => {
    const aoId = req.params.id;
    
    logger.info('[Workflow] Chiffrage validé', { metadata: { aoId 

        }
                });
    
    res.json({ 
      success: true, 
      message: "Chiffrage validé, devis prêt à envoyer",
      aoId,
      newStatus: 'devis_pret'

          });
        }

                  }


                            }


                          }));

  // ========================================
  // ROUTES ENVOI DEVIS
  // ========================================

  app.get("/api/aos/devis-ready", isAuthenticated, asyncHandler(async (req, res) => {
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
    
    logger.info('[Workflow] Devis prêts récupérés', { metadata: { count: devisReady.length 

        }
                });
    
    res.json(devisReady);
        }

                  }


                            }


                          }));

  app.post("/api/aos/:id/send-devis", isAuthenticated, validateBody(sendDevisSchema), asyncHandler(async (req, res) => {
    const { method } = req.body;
    const aoId = req.params.id;
    
    logger.info('[Workflow] Devis envoyé', { metadata: { aoId, method 

        }
                });
    
    res.json({ 
      success: true, 
      message: `Devis envoyé par ${method}`,
      aoId,
      sentAt: new Date()
    });
        }

                  }


                            }


                          }));

  app.post("/api/aos/:id/relance", 
    isAuthenticated,
    validateBody(relanceSchema),
    asyncHandler(async (req, res) => {
    const aoId = req.params.id;
    
    logger.info('[Workflow] Relance client effectuée', { metadata: { aoId 

        }
                });
    
    res.json({ 
      success: true, 
      message: "Relance client effectuée",
      aoId,
      relanceDate: new Date()

          });
        }

                  }


                            }


                          }));

  // ========================================
  // ROUTES PROJETS & PLANIFICATION
  // ========================================

  app.get("/api/workflow/projects", 
    isAuthenticated, 
    validateQuery(workflowProjectsQuerySchema),
    asyncHandler(async (req, res) => {
      const { status } = req.query;
      // OPTIMISATION: Use pagination instead of loading 375 projects
      const { projects } = await storage.getProjectsPaginated(undefined, status as string, 1000, 0);
      
      const enrichedProjects = projects.map((project: any) => {
        const baseProject = {
          ...project,
          reference: project.aoReference || `PRJ-${project.id.slice(0, 8)}`,
          client: project.clientName || "Client",
          location: project.location || "Localisation",
          montantTotal: project.totalAmount || Math.floor(Math.random() * 200000) + 50000
        };

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

      const filteredProjects = status 
        ? enrichedProjects.filter((p: any) => p.status === status)
        : enrichedProjects;
      
      logger.info('[Workflow] Projets récupérés', { metadata: { count: filteredProjects.length, status 
        }
            });
      
      sendSuccess(res, filteredProjects);
          }
                                      }
                                    });

  app.get("/api/projects/planning", isAuthenticated, asyncHandler(async (req, res) => {
    // OPTIMISATION: Use pagination instead of loading 375 projects
    const { projects } = await storage.getProjectsPaginated(undefined, undefined, 1000, 0);
    
    const planningData = projects.map((project: any) => ({
      ...project,
      reference: project.aoReference || `PRJ-${project.id.slice(0, 8)}`,
      client: project.clientName || "Client",
      location: project.location || "Localisation",
      montantTotal: project.totalAmount || Math.floor(Math.random() * 200000) + 50000,
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
      estimatedHours: Math.floor(Math.random() * 500) + 100,
      milestones: [
        { 
          name: "Démarrage", 
          date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          status: 'pending',
          isJalon: true
        },
        { 
          name: "Mi-parcours", 
          date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          status: 'pending',
          isJalon: true
        },
        { 
          name: "Finalisation", 
          date: new Date(Date.now() + 50 * 24 * 60 * 60 * 1000),
          status: 'pending',
          isJalon: true
        }
      ],
      resourcesAllocated: Math.random() > 0.6,
      capacityUtilization: Math.floor(Math.random() * 100),
      workloadDistribution: {
        encadrement: Math.floor(Math.random() * 20) + 10,
        poseurs: Math.floor(Math.random() * 40) + 20
            }

                      }


                                }


                              }));
    
    logger.info('[Workflow] Planning projets récupéré', { metadata: { count: planningData.length 
        }
            });
    
    res.json(planningData);
        }

                  }


                            }


                          }));

  app.post("/api/projects/:id/validate-planning", 
    isAuthenticated,
    validateBody(validatePlanningSchema),
    asyncHandler(async (req, res) => {
    const projectId = req.params.id;
    
    logger.info('[Workflow] Planification validée', { metadata: { projectId 

        }
                });
    
    res.json({ 
      success: true, 
      message: "Planification validée",
      projectId,
      newStatus: 'approvisionnement'

          });
        }

                  }


                            }


                          }));

  app.post("/api/projects/:id/start-chantier", 
    isAuthenticated,
    validateBody(startChantierSchema),
    asyncHandler(async (req, res) => {
    const projectId = req.params.id;
    
    logger.info('[Workflow] Chantier démarré', { metadata: { projectId 

        }
                });
    
    res.json({ 
      success: true, 
      message: "Chantier démarré",
      projectId,
      newStatus: 'chantier',
      startedAt: new Date()

          });
        }

                  }


                            }


                          }));

  app.post("/api/projects/:id/finish", 
    isAuthenticated,
    validateBody(finishProjectSchema),
    asyncHandler(async (req, res) => {
    const projectId = req.params.id;
    
    logger.info('[Workflow] Chantier terminé', { metadata: { projectId 

        }
                });
    
    res.json({ 
      success: true, 
      message: "Chantier terminé, passage en SAV",
      projectId,
      newStatus: 'sav',
      finishedAt: new Date()

          });
        }

                  }


                            }


                          }));

  app.post("/api/projects/:id/issue", isAuthenticated, validateBody(projectIssueSchema), asyncHandler(async (req, res) => {
    const { issue } = req.body;
    const projectId = req.params.id;
    
    logger.info('[Workflow] Problème signalé sur chantier', { metadata: { projectId, issue 

        }
                });
    
    res.json({ 
      success: true, 
      message: "Problème signalé",
      projectId,
      issue,
      reportedAt: new Date()

          });
        }

                  }


                            }


                          }));

  // ========================================
  // ROUTES PREVIEW/DOWNLOAD (migrées avec asyncHandler)
  // ========================================

  app.get("/api/aos/:id/dpgf/preview", asyncHandler(async (req, res) => {
    const aoId = req.params.id;
    
    logger.info('[Workflow] Aperçu DPGF demandé', { metadata: { aoId 

        }
                });
    
    res.send(`
      <html>
        <head><title>Aperçu DPGF</title></head>
        <body>
          <h1>Aperçu DPGF</h1>
          <p>Document DPGF pour l'AO ${aoId}</p>
          <p>Ce serait un PDF généré dans une vraie application</p>
        </body>
      </html>
    `);
        }

                  }


                            }


                          }));

  app.get("/api/aos/:id/dpgf/download", asyncHandler(async (req, res) => {
    const aoId = req.params.id;
    
    logger.info('[Workflow] Téléchargement DPGF', { metadata: { aoId 

        }
                });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="dpgf-${aoId}.pdf"`);
    res.send("Contenu PDF simulé");
        }

                  }


                            }


                          }));

  app.get("/api/aos/:id/devis/preview", asyncHandler(async (req, res) => {
    const aoId = req.params.id;
    
    logger.info('[Workflow] Aperçu devis demandé', { metadata: { aoId 

        }
                });
    
    res.send(`
      <html>
        <head><title>Aperçu Devis</title></head>
        <body>
          <h1>Aperçu Devis</h1>
          <p>Devis pour l'AO ${aoId}</p>
        </body>
      </html>
    `);
        }

                  }


                            }


                          }));

  app.get("/api/aos/:id/devis/download", asyncHandler(async (req, res) => {
    const aoId = req.params.id;
    
    logger.info('[Workflow] Téléchargement devis', { metadata: { aoId 

        }
                });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="devis-${aoId}.pdf"`);
    res.send("Contenu Devis PDF simulé");
        }

                  }


                            }


                          }));

  // ========================================
  // ROUTES SYSTÈME DE PRIORISATION INTELLIGENTE
  // ========================================

  app.get("/api/priorities", asyncHandler(async (req, res) => {
    // OPTIMISATION: Use pagination instead of loading ALL offers and projects
    const [offersResult, projectsResult] = await Promise.all([
      storage.getOffersPaginated(undefined, undefined, 1000, 0),
      storage.getProjectsPaginated(undefined, undefined, 1000, 0)
    ]);
    const offers = offersResult.offers;
    const projects = projectsResult.projects;
    
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

    logger.info('[Workflow] Priorités récupérées', { metadata: { count: priorities.length 
        }
            });

    res.json(priorities);
        }

                  }


                            }


                          }));

  app.post("/api/priorities/recalculate", isAuthenticated, validateBody(recalculatePrioritiesSchema), asyncHandler(async (req, res) => {
    const { 
      montantWeight, 
      delaiWeight, 
      typeClientWeight, 
      complexiteWeight, 
      chargeBeWeight, 
      risqueWeight, 
      strategiqueWeight 
    } = req.body;
    
    const totalWeight = montantWeight + delaiWeight + typeClientWeight + 
                       complexiteWeight + chargeBeWeight + risqueWeight + strategiqueWeight;
    
    if (Math.abs(totalWeight - 100) > 0.01) {
      throw new ValidationError(`La somme des poids doit être égale à 100% (reçu: ${totalWeight}%)`);
    }
    
    // OPTIMISATION: Use pagination to get counts instead of loading all data
    const [offersResult, projectsResult] = await Promise.all([
      storage.getOffersPaginated(undefined, undefined, 1, 0),
      storage.getProjectsPaginated(undefined, undefined, 1, 0)
    ]);
    
    const recalculatedCount = offersResult.total + projectsResult.total;
    
    if (eventBus) {
      const configEvent = createRealtimeEvent({
        type: EventType.PRIORITY_CONFIG_UPDATED,
        entity: 'project',
        entityId: 'config',
        severity: 'info',
        affectedQueryKeys: [commonQueryKeys.priorities(), commonQueryKeys.priorityConfig()],
        metadata: {
          updatedBy: 'admin',
          newWeights: { montantWeight, delaiWeight, typeClientWeight, complexiteWeight, chargeBeWeight, risqueWeight, strategiqueWeight 
        }
              );
      eventBus.publish(configEvent);
    }
    
    logger.info('[Workflow] Priorités recalculées', { metadata: { recalculatedCount, weights: { montantWeight, delaiWeight, typeClientWeight, complexiteWeight, chargeBeScore: chargeBeWeight, risqueWeight, strategiqueWeight 
        }
            });
    
    res.json({ 
      success: true, 
      message: `${recalculatedCount} éléments recalculés avec les nouveaux poids`,
      weights: {
        montantWeight, delaiWeight, typeClientWeight,
        complexiteWeight, chargeBeWeight, risqueWeight, strategiqueWeight
      },
      recalculatedAt: new Date()
    });
        }

                  }


                            }


                          }));

  app.post("/api/priorities/:itemId/override", isAuthenticated, validateBody(priorityOverrideSchema), asyncHandler(async (req, res) => {
    const { itemId } = req.params;
    const { priorityLevel, reason } = req.body;
    
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
        });
      eventBus.publish(overrideEvent);
    }
    
    logger.info('[Workflow] Priorité forcée manuellement', { metadata: { itemId, newPriorityLevel: priorityLevel, reason 
        }
            });
    
    res.json({ 
      success: true, 
      message: "Priorité forcée avec succès",
      itemId,
      newPriorityLevel: priorityLevel,
      reason,
      overrideBy: "user",
      overrideAt: new Date()

          });
        }

                  }


                            }


                          }));

  app.get("/api/priorities/:itemId/history", asyncHandler(async (req, res) => {
    const { itemId } = req.params;
    
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
        changedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
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
        changedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        isAutomatic: false
      }
    ];
    
    logger.info('[Workflow] Historique priorité récupéré', { metadata: { itemId, count: history.length 
        }
            });
    
    res.json(history);
        }

                  }


                            }


                          }));

  app.get("/api/priorities/alerts", asyncHandler(async (req, res) => {
    const alerts = [
      {
        id: "alert-1",
        itemId: "offer-123",
        itemName: "Rénovation Mairie Boulogne",
        priorityLevel: "critique",
        priorityScore: 87.5,
        alertType: "deadline_approaching",
        message: "Délai de réponse dans 2 jours",
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
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
        createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
        isActive: true,
        isDismissed: false
      }
    ];
    
    logger.info('[Workflow] Alertes priorité récupérées', { metadata: { count: alerts.length 
        }
            });
    
    res.json(alerts);
        }

                  }


                            }


                          }));

  app.post("/api/priorities/alerts/:alertId/dismiss", asyncHandler(async (req, res) => {
    const { alertId } = req.params;
    
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
        });
      eventBus.publish(alertDismissEvent);
    }
    
    logger.info('[Workflow] Alerte priorité marquée comme vue', { metadata: { alertId 

        }
                });
    
    res.json({ 
      success: true, 
      message: "Alerte marquée comme vue",
      alertId,
      dismissedAt: new Date(),
      dismissedBy: "user"

          });
        }

                  }


                            }


                          }));

  app.get("/api/priorities/stats", asyncHandler(async (req, res) => {
    // OPTIMISATION: Use pagination to get counts instead of loading 375 projects
    const [offersResult, projectsResult] = await Promise.all([
      storage.getOffersPaginated(undefined, undefined, 1, 0),
      storage.getProjectsPaginated(undefined, undefined, 1, 0)
    ]);
    
    const totalItems = offersResult.total + projectsResult.total;
    
    const stats = {
      totalItems,
      byLevel: {
        critique: Math.floor(totalItems * 0.15),
        elevee: Math.floor(totalItems * 0.25),
        normale: Math.floor(totalItems * 0.40),
        faible: Math.floor(totalItems * 0.15),
        tres_faible: Math.floor(totalItems * 0.05)
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
    
    logger.info('[Workflow] Stats priorité récupérées', { metadata: { totalItems: stats.totalItems 
        }
            });
    
    res.json(stats);
        }

                  }


                            }


                          }));

  app.get("/api/priorities/config", asyncHandler(async (req, res) => {
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
    
    logger.info('[Workflow] Configuration priorité récupérée', { metadata: { configuredBy: config.configuredBy 
        }
            });
    
    res.json(config);
        }

                  }


                            }


                          }));

  app.post("/api/priorities/config", isAuthenticated, validateBody(priorityConfigSchema), asyncHandler(async (req, res) => {
    const { weights, thresholds, autoRecalculate, alertsEnabled, notificationChannels } = req.body;
    
    if (weights) {
      const totalWeight = Object.values(weights).reduce((sum: number, weight: any) => sum + weight, 0);
      if (Math.abs(totalWeight - 100) > 0.01) {
        throw new ValidationError("La somme des poids doit être égale à 100%");
      }
    }
    
    if (eventBus) {
      const configSaveEvent = createRealtimeEvent({
        type: EventType.PRIORITY_CONFIG_UPDATED,
        entity: 'project',
        entityId: 'config-save',
        severity: 'info',
        affectedQueryKeys: [commonQueryKeys.priorityConfig(), commonQueryKeys.priorities()],
        metadata: {
          updatedBy: 'user',
          newConfig: { weights, thresholds, autoRecalculate, alertsEnabled, notificationChannels 
        }
              );
      eventBus.publish(configSaveEvent);
    }
    
    logger.info('[Workflow] Configuration priorité sauvegardée', { metadata: { weights, thresholds, autoRecalculate, alertsEnabled 
        }
            });
    
    res.json({ 
      success: true, 
      message: "Configuration sauvegardée",
      config: {
        weights, thresholds, autoRecalculate, alertsEnabled, notificationChannels,
        lastConfigUpdate: new Date(),
        configuredBy: "user"
      });
        }

                  }


                            }


                          }));
}
