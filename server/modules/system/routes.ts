/**
 * System Module Routes
 *
 * Expose les endpoints systèmes essentiels (health, utilisateurs, recherche globale,
 * intégration Object Storage).
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler, sendSuccess, createError } from '../../middleware/errorHandler';
import { isAuthenticated } from '../../replitAuth';
import { validateParams, validateQuery } from '../../middleware/validation';
import { rateLimits } from '../../middleware/rate-limiter';
import { logger } from '../../utils/logger';
import type { IStorage } from '../../storage-poc';
import type { EventBus } from '../../eventBus';
import { ObjectStorageService } from '../../objectStorage';

const userIdParams = z.object({ id: z.string().uuid() });
const userQuerySchema = z.object({ role: z.string().optional() });
const globalSearchSchema = z.object({ query: z.string().min(1), limit: z.coerce.number().int().positive().max(100).optional() });

function splitRoles(value?: string): string[] | undefined {
  if (!value) return undefined;
  const roles = value
    .split(',')
    .map((role) => role.trim())
    .filter((role) => role.length > 0);
  return roles.length ? roles : undefined;
}

export function createSystemRoutes(storage: IStorage, _eventBus: EventBus): Router {
  const router = Router();

  router.get(
    '/api/health',
    asyncHandler(async (_req: Request, res: Response) => {
      const payload = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
      };
      res.json(payload);
    })
  );

  router.get(
    '/api/users',
    isAuthenticated,
    rateLimits.general,
    validateQuery(userQuerySchema),
    asyncHandler(async (req: Request, res: Response) => {
      const roles = splitRoles(req.query.role as string | undefined);
      const users = (await storage.getUsers?.()) ?? [];
      const filtered = roles ? users.filter((user: any) => roles.includes(user.role)) : users;
      sendSuccess(res, filtered);
    })
  );

  router.get(
    '/api/users/:id',
    isAuthenticated,
    rateLimits.general,
    validateParams(userIdParams),
    asyncHandler(async (req: Request, res: Response) => {
      const user = await storage.getUser?.(req.params.id);
      if (!user) {
        throw createError.notFound('Utilisateur', req.params.id);
      }
      sendSuccess(res, user);
    })
  );

  router.get(
    '/api/users/current',
    isAuthenticated,
    rateLimits.general,
    asyncHandler(async (req: Request, res: Response) => {
      sendSuccess(res, (req as any).user ?? null);
    })
  );

  router.get(
    '/api/search/global',
    isAuthenticated,
    rateLimits.general,
    validateQuery(globalSearchSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const query = String(req.query.query);
      const limit = Number(req.query.limit ?? 20);

      const [aosResult, offersResult, projectsResult] = await Promise.all([
        storage.getAOsPaginated?.(query, undefined, limit, 0),
        storage.getOffersPaginated?.(query, undefined, limit, 0),
        storage.getProjectsPaginated?.(query, undefined, limit, 0),
      ]);

      const aos = aosResult?.aos ?? [];
      const offers = offersResult?.offers ?? [];
      const projects = projectsResult?.projects ?? [];

      sendSuccess(res, {
        query,
        total: aos.length + offers.length + projects.length,
        aos,
        offers,
        projects,
      });
    })
  );

  router.post(
    '/api/objects/upload',
    isAuthenticated,
    rateLimits.creation,
    asyncHandler(async (req: Request, res: Response) => {
      const storageService = new ObjectStorageService();
      const uploadURL = await storageService.getObjectEntityUploadURL();
      logger.info('[System] URL upload générée', { metadata: { userId: (req as any).user?.id } });
      res.json({ uploadURL });
    })
  );

  return router;
}
