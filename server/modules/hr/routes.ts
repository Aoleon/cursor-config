/**
 * HR Module Routes
 *
 * Gestion des labels employés (lecture, création, suppression).
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler, sendSuccess, createError } from '../../middleware/errorHandler';
import { isAuthenticated } from '../../replitAuth';
import { validateBody, validateParams } from '../../middleware/validation';
import { rateLimits } from '../../middleware/rate-limiter';
import { logger } from '../../utils/logger';
import type { IStorage } from '../../storage-poc';
import type { EventBus } from '../../eventBus';

const employeeIdParams = z.object({ id: z.string().uuid() });
const employeeLabelParams = z.object({ userId: z.string().uuid(), labelId: z.string().uuid() });
const assignLabelBody = z.object({ labelId: z.string().uuid(), assignedBy: z.string().uuid().optional() });

export function createHrRouter(storage: IStorage, eventBus: EventBus): Router {
  const router = Router();

  router.get(
    '/api/employees/:id/labels',
    isAuthenticated,
    rateLimits.general,
    validateParams(employeeIdParams),
    asyncHandler(async (req: Request, res: Response) => {
      const { id: userId } = req.params;

      logger.info('[HR] Récupération labels employé', {
        metadata: { route: '/api/employees/:id/labels', method: 'GET', employeeId: userId, userId: (req as any).user?.id },
      });

      const assignments = await storage.getEmployeeLabelAssignments(userId);
      sendSuccess(res, assignments);
    })
  );

  router.post(
    '/api/employees/:id/labels',
    isAuthenticated,
    rateLimits.creation,
    validateParams(employeeIdParams),
    validateBody(assignLabelBody),
    asyncHandler(async (req: Request, res: Response) => {
      const { id: userId } = req.params;
      const { labelId, assignedBy } = req.body;

      logger.info('[HR] Assignation label employé', {
        metadata: { route: '/api/employees/:id/labels', method: 'POST', employeeId: userId, labelId, userId: (req as any).user?.id },
      });

      try {
        const assignment = await storage.createEmployeeLabelAssignment({ userId, labelId, assignedBy });
        eventBus.emit('employee:label-assigned', {
          userId,
          labelId,
          assignedBy: (req as any).user?.id,
        });
        sendSuccess(res, assignment, "Label employé assigné avec succès");
      } catch (error) {
        logger.error('[HR] Erreur lors de l\'assignation du label', { metadata: { employeeId: userId, labelId, error } });
        throw createError.database("Erreur lors de l'assignation du label employé");
      }
    })
  );

  router.delete(
    '/api/employees/:userId/labels/:labelId',
    isAuthenticated,
    rateLimits.general,
    validateParams(employeeLabelParams),
    asyncHandler(async (req: Request, res: Response) => {
      const { userId, labelId } = req.params;

      logger.info('[HR] Suppression label employé', {
        metadata: { route: '/api/employees/:userId/labels/:labelId', method: 'DELETE', employeeId: userId, labelId, userId: (req as any).user?.id },
      });

      try {
        await storage.deleteEmployeeLabelAssignment(labelId);
        eventBus.emit('employee:label-removed', {
          userId,
          labelId,
          removedBy: (req as any).user?.id,
        });
        sendSuccess(res, null, "Label employé supprimé avec succès");
      } catch (error) {
        logger.error('[HR] Erreur lors de la suppression du label', { metadata: { employeeId: userId, labelId, error } });
        throw createError.database("Erreur lors de la suppression du label employé");
      }
    })
  );

  logger.info('[HR] Routes HR montées avec succès', { metadata: { module: 'HR', routes: 3 } });

  return router;
}
