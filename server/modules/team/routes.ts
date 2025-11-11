/**
 * Team Module Routes - Team Resource Management
 * 
 * This module handles team resource management:
 * - GET /api/team-resources - List team resources with optional project filter
 * - POST /api/team-resources - Create new team resource
 * - PATCH /api/team-resources/:id - Update team resource
 */

import { Router } from 'express';
import { isAuthenticated } from '../../replitAuth';
import { asyncHandler } from '../../middleware/errorHandler';
import { validateBody, validateParams, commonParamSchemas } from '../../middleware/validation';
import { logger } from '../../utils/logger';
import type { IStorage } from '../../storage-poc';
import type { EventBus } from '../../eventBus';
import { insertTeamResourceSchema, insertBeWorkloadSchema } from '@shared/schema';

// ========================================
// TEAM ROUTER FACTORY
// ========================================

export function createTeamRouter(storage: IStorage, eventBus: EventBus): Router {
  const router = Router();

  // ========================================
  // TEAM RESOURCE ROUTES (3 routes)
  // ========================================

  /**
   * GET /api/team-resources
   * Récupère la liste des ressources d'équipe
   * Support filtre optionnel par projectId
   * 
   * @access authenticated
   */
  router.get("/api/team-resources", 
    isAuthenticated, 
    asyncHandler(async (req, res) => {
      const { projectId } = req.query;
      const resources = await storage.getTeamResources(projectId as string);
      
      logger.info('[TeamResources] Ressources récupérées', { metadata: { projectId, count: resources.length 

            })
 

          );
      
      res.json(resources);
          }
                                  }
                                });

  /**
   * POST /api/team-resources
   * Crée une nouvelle ressource d'équipe
   * 
   * @access authenticated
   */
  router.post("/api/team-resources", 
    isAuthenticated, 
    validateBody(insertTeamResourceSchema),
    asyncHandler(async (req, res) => {
      const resource = await storage.createTeamResource(req.body);
      
      logger.info('[TeamResources] Ressource créée', { metadata: { resourceId: resource.id 

            })
 

          );
      
      res.status(201).json(resource);
          }
                                  }
                                });

  /**
   * PATCH /api/team-resources/:id
   * Met à jour une ressource d'équipe existante
   * 
   * @access authenticated
   */
  router.patch("/api/team-resources/:id", 
    isAuthenticated, 
    validateParams(commonParamSchemas.id),
    validateBody(insertTeamResourceSchema.partial()),
    asyncHandler(async (req, res) => {
      const resource = await storage.updateTeamResource(req.params.id, req.body);
      
      logger.info('[TeamResources] Ressource mise à jour', { metadata: { resourceId: req.params.id 

            })
 

          );
      
      res.json(resource);
          }
                                  }
                                });

  // ========================================
  // BE WORKLOAD ROUTES - Indicateurs charge BE
  // ========================================

  /**
   * GET /api/be-workload
   * Récupère la charge de travail du Bureau d'Études
   * Support filtres optionnels par semaine et année
   * 
   * @query weekNumber?: number - Numéro de semaine
   * @query year?: number - Année
   * @access authenticated
   */
  router.get("/api/be-workload", 
    isAuthenticated, 
    asyncHandler(async (req, res) => {
      const { weekNumber, year } = req.query;
      const workload = await storage.getBeWorkload(
        weekNumber ? parseInt(weekNumber as string) : undefined,
        year ? parseInt(year as string) : undefined
      );
      
      logger.info('[BEWorkload] Charge BE récupérée', { metadata: { weekNumber, year, count: workload.length 

            })
 

          );
      
      res.json(workload);
          }
                                  }
                                });

  /**
   * POST /api/be-workload
   * Crée ou met à jour une entrée de charge de travail BE
   * 
   * @body BeWorkload data (weekNumber, year, capacity, etc.)
   * @access authenticated
   */
  router.post("/api/be-workload", 
    isAuthenticated, 
    validateBody(insertBeWorkloadSchema),
    asyncHandler(async (req, res) => {
      const workload = await storage.createOrUpdateBeWorkload(req.body);
      
      logger.info('[BEWorkload] Charge BE créée/mise à jour', { metadata: { workloadId: workload.id, weekNumber: workload.weekNumber 

            })
 

          );
      
      res.status(201).json(workload);
          }
                                  }
                                });

  return router;
}
