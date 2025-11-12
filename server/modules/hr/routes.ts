/**
 * HR Module Routes
 * 
 * This module handles all HR-related routes including:
 * - Employee label assignments management
 */

import { Router } from 'express';
import { withErrorHandling } from './utils/error-handler';
import type { Request, Response } from 'express';
import { isAuthenticated } from '../../replitAuth';
import { asyncHandler, sendSuccess, createError } from '../../middleware/errorHandler';
import { validateBody, validateParams, commonParamSchemas } from '../../middleware/validation';
import { rateLimits } from '../../middleware/rate-limiter';
import { logger } from '../../utils/logger';
import type { IStorage } from '../../storage-poc';
import type { EventBus } from '../../eventBus';
import { z } from 'zod';

// ========================================
// VALIDATION SCHEMAS
// ========================================

const employeeLabelAssignmentSchema = z.object({
  labelId: z.string().uuid(),
  assignedBy: z.string().uuid().optional()
});

const employeeLabelParamsSchema = z.object({
  userId: z.string().uuid(),
  labelId: z.string().uuid()
});

// ========================================
// HR ROUTER FACTORY
// ========================================

export function createHrRouter(storage: IStorage, eventBus: EventBus): Router {
  const router = Router();

  // ========================================
  // EMPLOYEE LABELS ROUTES
  // ========================================

  /**
   * GET /api/employees/:id/labels
   * Get all label assignments for an employee
   */
  router.get('/api/employees/:id/labels',
    isAuthenticated,
    rateLimits.general,
    validateParams(commonParamSchemas.id),
    asyncHandler(async (req: Request, res: Response) => {
      const { id: userId } = req.params;
      
      logger.info('[HR] Récupération labels employé', { metadata: {

          route: '/api/employees/:id/labels',
          method: 'GET',
          employeeId: userId,
          userId: req.user?.id
      }
    });

      return withErrorHandling(
    async () => {

        const labelAssignments = await storage.getEmployeeLabelAssignments(userId);
        sendSuccess(res, labelAssignments);
      
    },
    {
      operation: 'object',
      service: 'routes',
      metadata: {}
    } );
        throw createError.database('Erreur lors de la récupération des labels employé');
            }

                      }


                                }


                              }));

  /**
   * POST /api/employees/:id/labels
   * Assign a label to an employee
   */
  router.post('/api/employees/:id/labels',
    isAuthenticated,
    rateLimits.creation,
    validateParams(commonParamSchemas.id),
    validateBody(employeeLabelAssignmentSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const { id: userId } = req.params;
      const { labelId, assignedBy } = req.body;
      
      logger.info('[HR] Assignation label employé', { metadata: {

          route: '/api/employees/:id/labels',
          method: 'POST',
          employeeId: userId,
          labelId,
          userId: req.user?.id
      }
    });

      return withErrorHandling(
    async () => {

        const assignment = await storage.createEmployeeLabelAssignment({
          userId,
          labelId,
          assignedBy
        });
        
        eventBus.emit('employee:label-assigned', {
          userId,
          labelId,
          assignedBy: req.user?.id
        });
        
        sendSuccess(res, assignment, 'Label employé assigné avec succès');
      
    },
    {
      operation: 'object',
      service: 'routes',
      metadata: {}
    } );
        throw createError.database('Erreur lors de l\'assignation du label employé');
            }

                      }


                                }


                              }));

  /**
   * DELETE /api/employees/:userId/labels/:labelId
   * Remove a label assignment from an employee
   */
  router.delete('/api/employees/:userId/labels/:labelId',
    isAuthenticated,
    rateLimits.general,
    validateParams(employeeLabelParamsSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const { userId, labelId } = req.params;
      
      logger.info('[HR] Suppression label employé', { metadata: {

          route: '/api/employees/:userId/labels/:labelId',
          method: 'DELETE',
          targetUserId: userId,
          labelId,
          userId: req.user?.id
      }
    });

      return withErrorHandling(
    async () => {

        await storage.deleteEmployeeLabelAssignment(labelId);
        
        eventBus.emit('employee:label-removed', {
          userId,
          labelId,
          removedBy: req.user?.id
        });
        
        sendSuccess(res, null, 'Label employé supprimé avec succès');
      
    },
    {
      operation: 'object',
      service: 'routes',
      metadata: {}
    } );
        throw createError.database('Erreur lors de la suppression du label employé');
            }

                      }


                                }


                              }));

  logger.info('[HR] Routes HR montées avec succès', { metadata: {

      module: 'HR',
      routes: 3
      }
    });

  return router;
}
