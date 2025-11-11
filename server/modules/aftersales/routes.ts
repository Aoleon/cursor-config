/**
 * AfterSales Module Routes
 * 
 * This module handles all after-sales related routes including:
 * - Project reserves management
 * - SAV (Service Après-Vente) interventions
 * - Warranty claims tracking
 * 
 * AfterSales operations are critical for maintaining client satisfaction
 * and tracking post-project obligations.
 */

import { Router } from 'express';
import { withErrorHandling } from './utils/error-handler';
import type { Request, Response } from 'express';
import { isAuthenticated } from '../../replitAuth';
import { asyncHandler, createError, sendSuccess } from '../../middleware/errorHandler';
import { validateBody, validateParams, validateQuery, commonParamSchemas } from '../../middleware/validation';
import { rateLimits } from '../../middleware/rate-limiter';
import { logger } from '../../utils/logger';
import type { IStorage } from '../../storage-poc';
import type { EventBus } from '../../eventBus';
import { z } from 'zod';
import {
  insertProjectReserveSchema,
  insertSavInterventionSchema
} from '@shared/schema';
import { insertSavDemandeSchema } from '../../validation-schemas';
import { savWorkflowService } from '../../services/SavWorkflowService';

// Validation schema for warranty claims intervention ID
const interventionIdSchema = z.object({
  interventionId: z.string().uuid('ID intervention invalide')
});

export function createAfterSalesRoutes(storage: IStorage, eventBus: EventBus): Router {
  const router = Router();

  logger.info('[AfterSales] Initializing AfterSales routes', { metadata: {
      routes: [
        'GET /api/reserves/:projectId',
        'POST /api/reserves',
        'GET /api/sav-interventions/:projectId',
        'POST /api/sav-interventions',
        'GET /api/warranty-claims/:interventionId'
      ]
        }
            });

  // ========================================
  // PROJECT RESERVES ROUTES
  // ========================================

  // Get project reserves
  router.get('/api/reserves/:projectId',
    isAuthenticated,
    rateLimits.general,
    validateParams(commonParamSchemas.projectId),
    asyncHandler(async (req: Request, res: Response) => {
      const { projectId } = req.params;

      logger.info('[AfterSales] Récupération réserves projet', { metadata: {
          route: '/api/reserves/:projectId',
          method: 'GET',
          projectId,
          userId: req.user?.id

            })


          );

      return withErrorHandling(
    async () => {

        const reserves = await storage.getProjectReserves(projectId);
        
        logger.info('[AfterSales] Réserves projet récupérées', { metadata: {
            route: '/api/reserves/:projectId',
            method: 'GET',
            projectId,
            reservesCount: reserves?.length || 0,
            userId: req.user?.id

      });

        sendSuccess(res, reserves);
      
    },
    {
      operation: 'SAV',
      service: 'routes',
      metadata: {}
    } );
        throw createError.database('Erreur lors de la récupération des réserves');
            }

                      }


                                }


                              }));

  // Create project reserve
  router.post('/api/reserves',
    isAuthenticated,
    rateLimits.creation,
    validateBody(insertProjectReserveSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const reserveData = req.body;

      logger.info('[AfterSales] Création réserve projet', { metadata: {
          route: '/api/reserves',
          method: 'POST',
          projectId: reserveData.projectId,
          userId: req.user?.id

            })


          );

      return withErrorHandling(
    async () => {

        const newReserve = await storage.createProjectReserve(reserveData);
        
        logger.info('[AfterSales] Réserve projet créée', { metadata: {
            route: '/api/reserves',
            method: 'POST',
            projectId: reserveData.projectId,
            reserveId: newReserve?.id,
            userId: req.user?.id

      });

        sendSuccess(res, newReserve, 201);
      
    },
    {
      operation: 'SAV',
      service: 'routes',
      metadata: {}
    } );
        throw createError.database('Erreur lors de la création de la réserve');
            }

                      }


                                }


                              }));

  // ========================================
  // SAV INTERVENTIONS ROUTES
  // ========================================

  // Get SAV interventions for project
  router.get('/api/sav-interventions/:projectId',
    isAuthenticated,
    rateLimits.general,
    validateParams(commonParamSchemas.projectId),
    asyncHandler(async (req: Request, res: Response) => {
      const { projectId } = req.params;

      logger.info('[AfterSales] Récupération interventions SAV', { metadata: {
          route: '/api/sav-interventions/:projectId',
          method: 'GET',
          projectId,
          userId: req.user?.id

            })


          );

      return withErrorHandling(
    async () => {

        const interventions = await storage.getSavInterventions(projectId);
        
        logger.info('[AfterSales] Interventions SAV récupérées', { metadata: {
            route: '/api/sav-interventions/:projectId',
            method: 'GET',
            projectId,
            interventionsCount: interventions?.length || 0,
            userId: req.user?.id

      });

        sendSuccess(res, interventions);
      
    },
    {
      operation: 'SAV',
      service: 'routes',
      metadata: {}
    } );
        throw createError.database('Erreur lors de la récupération des interventions SAV');
            }

                      }


                                }


                              }));

  // Create SAV intervention
  router.post('/api/sav-interventions',
    isAuthenticated,
    rateLimits.creation,
    validateBody(insertSavInterventionSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const interventionData = req.body;

      logger.info('[AfterSales] Création intervention SAV', { metadata: {
          route: '/api/sav-interventions',
          method: 'POST',
          projectId: interventionData.projectId,
          userId: req.user?.id

            })


          );

      return withErrorHandling(
    async () => {

        const newIntervention = await storage.createSavIntervention(interventionData);
        
        logger.info('[AfterSales] Intervention SAV créée', { metadata: {
            route: '/api/sav-interventions',
            method: 'POST',
            projectId: interventionData.projectId,
            interventionId: newIntervention?.id,
            userId: req.user?.id

      });

        sendSuccess(res, newIntervention, 201);
      
    },
    {
      operation: 'SAV',
      service: 'routes',
      metadata: {}
    } );
        throw createError.database('Erreur lors de la création de l\'intervention SAV');
            }

                      }


                                }


                              }));

  // ========================================
  // WARRANTY CLAIMS ROUTES
  // ========================================

  // Get warranty claims for intervention
  router.get('/api/warranty-claims/:interventionId',
    isAuthenticated,
    rateLimits.general,
    validateParams(interventionIdSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const { interventionId } = req.params;

      logger.info('[AfterSales] Récupération réclamations garantie', { metadata: {
          route: '/api/warranty-claims/:interventionId',
          method: 'GET',
          interventionId,
          userId: req.user?.id

            })


          );

      return withErrorHandling(
    async () => {

        const claims = await storage.getSavWarrantyClaims(interventionId);
        
        logger.info('[AfterSales] Réclamations garantie récupérées', { metadata: {
            route: '/api/warranty-claims/:interventionId',
            method: 'GET',
            interventionId,
            claimsCount: claims?.length || 0,
            userId: req.user?.id

      });

        sendSuccess(res, claims);
      
    },
    {
      operation: 'SAV',
      service: 'routes',
      metadata: {}
    } );
        throw createError.database('Erreur lors de la récupération des réclamations garantie');
            }

                      }


                                }


                              }));

  // ========================================
  // SAV WORKFLOW ROUTES (Fonctionnalité 4)
  // ========================================

  // POST /api/sav/demandes
  router.post('/api/sav/demandes',
    isAuthenticated,
    rateLimits.creation,
    validateBody(insertSavDemandeSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const demande = await savWorkflowService.createDemande(req.body);
      return sendSuccess(res, demande, 201);
          }
        })
      );

  // GET /api/sav/demandes
  router.get('/api/sav/demandes',
    isAuthenticated,
    rateLimits.general,
    validateQuery(z.object({
      projectId: z.string().uuid().optional(),
      status: z.enum(['nouvelle', 'en_analyse', 'materiel_necessaire', 'materiel_commande', 'materiel_livre', 'rdv_planifie', 'en_intervention', 'quitus_recu', 'reserve_levee', 'termine']).optional(),
      demandeType: z.enum(['garantie', 'hors_garantie', 'reserve']).optional(),
      dateFrom: z.string().datetime().optional(),
      dateTo: z.string().datetime().optional()
    })),
    asyncHandler(async (req: Request, res: Response) => {
      const filters = {
        projectId: req.query.projectId as string | undefined,
        status: req.query.status as string | undefined,
        demandeType: req.query.demandeType as string | undefined,
        dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
        dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined
      };
      const demandes = await storage.getSavDemandes(filters);
      return sendSuccess(res, demandes);
          }
        })
      );

  // GET /api/sav/demandes/:id
  router.get('/api/sav/demandes/:id',
    isAuthenticated,
    rateLimits.general,
    validateParams(commonParamSchemas.uuid),
    asyncHandler(async (req: Request, res: Response) => {
      const demande = await storage.getSavDemande(req.params.id);
      if (!demande) {
        throw createError.notFound('Demande SAV non trouvée');
      }
      return sendSuccess(res, demande);
          }
        })
      );

  // POST /api/sav/demandes/:id/commande-materiel
  router.post('/api/sav/demandes/:id/commande-materiel',
    isAuthenticated,
    rateLimits.general,
    validateParams(commonParamSchemas.uuid),
    validateBody(z.object({
      materielId: z.string().uuid(),
      dateLivraisonPrevue: z.string().datetime()
    })),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = req.params;
      const { materielId, dateLivraisonPrevue } = req.body;
      const demande = await savWorkflowService.commandeMateriel(id, materielId, new Date(dateLivraisonPrevue));
      return sendSuccess(res, demande);
          }
        })
      );

  // POST /api/sav/demandes/:id/planifier-rdv
  router.post('/api/sav/demandes/:id/planifier-rdv',
    isAuthenticated,
    rateLimits.general,
    validateParams(commonParamSchemas.uuid),
    validateBody(z.object({
      rdvDate: z.string().datetime()
    })),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = req.params;
      const { rdvDate } = req.body;
      const demande = await savWorkflowService.planifierRdv(id, new Date(rdvDate));
      return sendSuccess(res, demande);
          }
        })
      );

  // POST /api/sav/demandes/:id/valider-quitus
  router.post('/api/sav/demandes/:id/valider-quitus',
    isAuthenticated,
    rateLimits.general,
    validateParams(commonParamSchemas.uuid),
    validateBody(z.object({
      quitusDate: z.string().datetime()
    })),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = req.params;
      const { quitusDate } = req.body;
      const demande = await savWorkflowService.validerQuitus(id, new Date(quitusDate));
      return sendSuccess(res, demande);
          }
        })
      );

  logger.info('[AfterSales] AfterSales routes initialized successfully', { metadata: {
      routesCount: 11,
      modules: ['reserves', 'sav-interventions', 'warranty-claims', 'sav-workflow']
    
        }
                });

  return router;
}
