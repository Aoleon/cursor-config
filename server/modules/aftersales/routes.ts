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
import type { Request, Response } from 'express';
import { isAuthenticated } from '../../replitAuth';
import { asyncHandler, createError, sendSuccess } from '../../middleware/errorHandler';
import { validateBody, validateParams, commonParamSchemas } from '../../middleware/validation';
import { rateLimits } from '../../middleware/rate-limiter';
import { logger } from '../../utils/logger';
import type { IStorage } from '../../storage-poc';
import type { EventBus } from '../../eventBus';
import { z } from 'zod';
import {
  insertProjectReserveSchema,
  insertSavInterventionSchema
} from '@shared/schema';

// Validation schema for warranty claims intervention ID
const interventionIdSchema = z.object({
  interventionId: z.string().uuid('ID intervention invalide')
});

export function createAfterSalesRoutes(storage: IStorage, eventBus: EventBus): Router {
  const router = Router();

  logger.info('[AfterSales] Initializing AfterSales routes', {
    metadata: {
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
    asyncHandler(async (req: any, res: Response) => {
      const { projectId } = req.params;

      logger.info('[AfterSales] Récupération réserves projet', {
        metadata: {
          route: '/api/reserves/:projectId',
          method: 'GET',
          projectId,
          userId: req.user?.id
        }
      });

      try {
        const reserves = await storage.getProjectReserves(projectId);
        
        logger.info('[AfterSales] Réserves projet récupérées', {
          metadata: {
            route: '/api/reserves/:projectId',
            method: 'GET',
            projectId,
            reservesCount: reserves?.length || 0,
            userId: req.user?.id
          }
        });

        sendSuccess(res, reserves);
      } catch (error) {
        logger.error('[AfterSales] Erreur récupération réserves projet', {
          metadata: {
            route: '/api/reserves/:projectId',
            method: 'GET',
            projectId,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            userId: req.user?.id
          }
        });
        throw createError.database('Erreur lors de la récupération des réserves');
      }
    })
  );

  // Create project reserve
  router.post('/api/reserves',
    isAuthenticated,
    rateLimits.creation,
    validateBody(insertProjectReserveSchema),
    asyncHandler(async (req: any, res: Response) => {
      const reserveData = req.body;

      logger.info('[AfterSales] Création réserve projet', {
        metadata: {
          route: '/api/reserves',
          method: 'POST',
          projectId: reserveData.projectId,
          userId: req.user?.id
        }
      });

      try {
        const newReserve = await storage.createProjectReserve(reserveData);
        
        logger.info('[AfterSales] Réserve projet créée', {
          metadata: {
            route: '/api/reserves',
            method: 'POST',
            projectId: reserveData.projectId,
            reserveId: newReserve?.id,
            userId: req.user?.id
          }
        });

        sendSuccess(res, newReserve, 201);
      } catch (error) {
        logger.error('[AfterSales] Erreur création réserve projet', {
          metadata: {
            route: '/api/reserves',
            method: 'POST',
            projectId: reserveData.projectId,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            userId: req.user?.id
          }
        });
        throw createError.database('Erreur lors de la création de la réserve');
      }
    })
  );

  // ========================================
  // SAV INTERVENTIONS ROUTES
  // ========================================

  // Get SAV interventions for project
  router.get('/api/sav-interventions/:projectId',
    isAuthenticated,
    rateLimits.general,
    validateParams(commonParamSchemas.projectId),
    asyncHandler(async (req: any, res: Response) => {
      const { projectId } = req.params;

      logger.info('[AfterSales] Récupération interventions SAV', {
        metadata: {
          route: '/api/sav-interventions/:projectId',
          method: 'GET',
          projectId,
          userId: req.user?.id
        }
      });

      try {
        const interventions = await storage.getSavInterventions(projectId);
        
        logger.info('[AfterSales] Interventions SAV récupérées', {
          metadata: {
            route: '/api/sav-interventions/:projectId',
            method: 'GET',
            projectId,
            interventionsCount: interventions?.length || 0,
            userId: req.user?.id
          }
        });

        sendSuccess(res, interventions);
      } catch (error) {
        logger.error('[AfterSales] Erreur récupération interventions SAV', {
          metadata: {
            route: '/api/sav-interventions/:projectId',
            method: 'GET',
            projectId,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            userId: req.user?.id
          }
        });
        throw createError.database('Erreur lors de la récupération des interventions SAV');
      }
    })
  );

  // Create SAV intervention
  router.post('/api/sav-interventions',
    isAuthenticated,
    rateLimits.creation,
    validateBody(insertSavInterventionSchema),
    asyncHandler(async (req: any, res: Response) => {
      const interventionData = req.body;

      logger.info('[AfterSales] Création intervention SAV', {
        metadata: {
          route: '/api/sav-interventions',
          method: 'POST',
          projectId: interventionData.projectId,
          userId: req.user?.id
        }
      });

      try {
        const newIntervention = await storage.createSavIntervention(interventionData);
        
        logger.info('[AfterSales] Intervention SAV créée', {
          metadata: {
            route: '/api/sav-interventions',
            method: 'POST',
            projectId: interventionData.projectId,
            interventionId: newIntervention?.id,
            userId: req.user?.id
          }
        });

        sendSuccess(res, newIntervention, 201);
      } catch (error) {
        logger.error('[AfterSales] Erreur création intervention SAV', {
          metadata: {
            route: '/api/sav-interventions',
            method: 'POST',
            projectId: interventionData.projectId,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            userId: req.user?.id
          }
        });
        throw createError.database('Erreur lors de la création de l\'intervention SAV');
      }
    })
  );

  // ========================================
  // WARRANTY CLAIMS ROUTES
  // ========================================

  // Get warranty claims for intervention
  router.get('/api/warranty-claims/:interventionId',
    isAuthenticated,
    rateLimits.general,
    validateParams(interventionIdSchema),
    asyncHandler(async (req: any, res: Response) => {
      const { interventionId } = req.params;

      logger.info('[AfterSales] Récupération réclamations garantie', {
        metadata: {
          route: '/api/warranty-claims/:interventionId',
          method: 'GET',
          interventionId,
          userId: req.user?.id
        }
      });

      try {
        const claims = await storage.getSavWarrantyClaims(interventionId);
        
        logger.info('[AfterSales] Réclamations garantie récupérées', {
          metadata: {
            route: '/api/warranty-claims/:interventionId',
            method: 'GET',
            interventionId,
            claimsCount: claims?.length || 0,
            userId: req.user?.id
          }
        });

        sendSuccess(res, claims);
      } catch (error) {
        logger.error('[AfterSales] Erreur récupération réclamations garantie', {
          metadata: {
            route: '/api/warranty-claims/:interventionId',
            method: 'GET',
            interventionId,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            userId: req.user?.id
          }
        });
        throw createError.database('Erreur lors de la récupération des réclamations garantie');
      }
    })
  );

  logger.info('[AfterSales] AfterSales routes initialized successfully', {
    metadata: {
      routesCount: 5,
      modules: ['reserves', 'sav-interventions', 'warranty-claims']
    }
  });

  return router;
}
