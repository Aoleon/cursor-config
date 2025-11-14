/**
 * Ops Module Routes
 *
 * Fournit un petit ensemble d'endpoints internes pour :
 * - enregistrer du suivi de temps (time tracking)
 * - récupérer un résumé par projet
 * - simuler la charge de travail BE / terrain
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler, sendSuccess, createError } from '../../middleware/errorHandler';
import { isAuthenticated } from '../../replitAuth';
import { validateBody, validateQuery, validateParams } from '../../middleware/validation';
import { rateLimits } from '../../middleware/rate-limiter';
import { logger } from '../../utils/logger';
import type { IStorage } from '../../storage-poc';
import type { EventBus } from '../../eventBus';

const timeTrackingSchema = z.object({
  projectId: z.string().uuid(),
  userId: z.string().uuid(),
  taskType: z.string().min(1),
  hours: z.coerce.number().positive(),
  date: z.coerce.date(),
  description: z.string().max(500).optional(),
});

const workloadQuerySchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

const projectParamsSchema = z.object({ id: z.string().uuid() });

export function createOpsRouter(storage: IStorage, eventBus: EventBus): Router {
  const router = Router();

  router.post(
    '/api/time-tracking',
    isAuthenticated,
    rateLimits.creation,
    validateBody(timeTrackingSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const payload = timeTrackingSchema.parse(req.body);

      const [user, project] = await Promise.all([
        storage.getUser?.(payload.userId),
        storage.getProject?.(payload.projectId),
      ]);

      if (!user) {
        throw createError.notFound('Utilisateur', payload.userId);
      }
      if (!project) {
        throw createError.notFound('Projet', payload.projectId);
      }

      const created = await storage.createTimeTracking?.({
        projectId: payload.projectId,
        userId: payload.userId,
        taskType: payload.taskType,
        hours: payload.hours.toString(),
        date: payload.date,
        description: payload.description,
      });

      eventBus.publish?.({
        type: 'ops:time-tracking:created',
        entity: 'project',
        entityId: payload.projectId,
        severity: 'info',
        timestamp: new Date().toISOString(),
        payload,
      });

      logger.info('[Ops] time tracking enregistré', {
        metadata: { projectId: payload.projectId, userId: payload.userId },
      });

      res.status(201).json(created ?? { success: true });
    })
  );

  router.get(
    '/api/projects/:id/time-tracking/summary',
    isAuthenticated,
    rateLimits.general,
    validateParams(projectParamsSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const { id: projectId } = req.params;
      const project = await storage.getProject?.(projectId);
      if (!project) {
        throw createError.notFound('Projet', projectId);
      }

      const entries = (await storage.getProjectTimeTracking?.(projectId)) ?? [];
      const totalHours = entries.reduce((sum, entry) => sum + Number(entry.hours ?? 0), 0);

      sendSuccess(res, {
        projectId,
        projectName: (project as { name?: string }).name ?? 'Projet',
        totalEntries: entries.length,
        totalHours,
        entries,
      });
    })
  );

  router.get(
    '/api/workload/simulation',
    isAuthenticated,
    rateLimits.general,
    validateQuery(workloadQuerySchema),
    asyncHandler(async (req: Request, res: Response) => {
      const { startDate, endDate } = workloadQuerySchema.parse(req.query);

      const [beWorkload, timeTracking] = await Promise.all([
        storage.getBeWorkload?.(startDate, endDate),
        storage.getTimeTracking?.(startDate, endDate),
      ]);

      sendSuccess(res, {
        period: { startDate, endDate },
        beWorkload: beWorkload ?? [],
        fieldWorkload: timeTracking ?? [],
      });
    })
  );

  router.get(
    '/api/workload/current',
    isAuthenticated,
    rateLimits.general,
    asyncHandler(async (_req: Request, res: Response) => {
      const endDate = new Date();
      const startDate = new Date(endDate);
      startDate.setDate(endDate.getDate() - 30);

      const [beWorkload, timeTracking] = await Promise.all([
        storage.getBeWorkload?.(startDate, endDate),
        storage.getTimeTracking?.(startDate, endDate),
      ]);

      sendSuccess(res, {
        period: { startDate, endDate },
        beWorkload: beWorkload ?? [],
        fieldWorkload: timeTracking ?? [],
      });
    })
  );

  return router;
}
