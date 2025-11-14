/**
 * Stakeholders Module Routes
 *
 * CRUD simplifié pour :
 * - Maîtres d'ouvrage
 * - Maîtres d'œuvre
 * - Contacts associés aux maîtres d'œuvre
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

const idParamsSchema = z.object({ id: z.string().uuid() });
const maitreOeuvreParamsSchema = z.object({ maitreOeuvreId: z.string().uuid() });
const contactParamsSchema = z.object({ maitreOeuvreId: z.string().uuid(), contactId: z.string().uuid() });

const maitreSchema = z.object({
  nom: z.string().min(1).max(255),
  typeOrganisation: z.string().max(255).optional(),
  adresse: z.string().max(500).optional(),
  codePostal: z.string().max(20).optional(),
  ville: z.string().max(255).optional(),
  telephone: z.string().max(50).optional(),
  email: z.string().email().optional(),
  notes: z.string().max(1000).optional(),
});

const contactSchema = z.object({
  nom: z.string().min(1).max(255),
  fonction: z.string().max(255).optional(),
  telephone: z.string().max(50).optional(),
  email: z.string().email().optional(),
});

export function createStakeholdersRouter(storage: IStorage, _eventBus: EventBus): Router {
  const router = Router();

  // Maîtres d'ouvrage
  router.get(
    '/api/maitres-ouvrage',
    isAuthenticated,
    rateLimits.general,
    asyncHandler(async (_req: Request, res: Response) => {
      const items = await storage.getMaitresOuvrage?.();
      sendSuccess(res, items ?? []);
    })
  );

  router.get(
    '/api/maitres-ouvrage/:id',
    isAuthenticated,
    rateLimits.general,
    validateParams(idParamsSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const item = await storage.getMaitreOuvrage?.(req.params.id);
      if (!item) {
        throw createError.notFound("Maître d'ouvrage", req.params.id);
      }
      sendSuccess(res, item);
    })
  );

  router.post(
    '/api/maitres-ouvrage',
    isAuthenticated,
    rateLimits.creation,
    validateBody(maitreSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const created = await storage.createMaitreOuvrage?.(req.body);
      logger.info('[Stakeholders] maître d\'ouvrage créé', { metadata: { id: created?.id } });
      res.status(201).json(created ?? {});
    })
  );

  router.put(
    '/api/maitres-ouvrage/:id',
    isAuthenticated,
    rateLimits.general,
    validateParams(idParamsSchema),
    validateBody(maitreSchema.partial()),
    asyncHandler(async (req: Request, res: Response) => {
      const updated = await storage.updateMaitreOuvrage?.(req.params.id, req.body);
      logger.info('[Stakeholders] maître d\'ouvrage mis à jour', { metadata: { id: req.params.id } });
      res.json(updated ?? {});
    })
  );

  router.delete(
    '/api/maitres-ouvrage/:id',
    isAuthenticated,
    rateLimits.general,
    validateParams(idParamsSchema),
    asyncHandler(async (req: Request, res: Response) => {
      await storage.deleteMaitreOuvrage?.(req.params.id);
      logger.info('[Stakeholders] maître d\'ouvrage supprimé', { metadata: { id: req.params.id } });
      res.status(204).send();
    })
  );

  // Maîtres d'œuvre
  router.get(
    '/api/maitres-oeuvre',
    isAuthenticated,
    rateLimits.general,
    asyncHandler(async (_req: Request, res: Response) => {
      const items = await storage.getMaitresOeuvre?.();
      sendSuccess(res, items ?? []);
    })
  );

  router.get(
    '/api/maitres-oeuvre/:id',
    isAuthenticated,
    rateLimits.general,
    validateParams(idParamsSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const item = await storage.getMaitreOeuvre?.(req.params.id);
      if (!item) {
        throw createError.notFound("Maître d'œuvre", req.params.id);
      }
      sendSuccess(res, item);
    })
  );

  router.post(
    '/api/maitres-oeuvre',
    isAuthenticated,
    rateLimits.creation,
    validateBody(maitreSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const created = await storage.createMaitreOeuvre?.(req.body);
      logger.info('[Stakeholders] maître d\'œuvre créé', { metadata: { id: created?.id } });
      res.status(201).json(created ?? {});
    })
  );

  router.put(
    '/api/maitres-oeuvre/:id',
    isAuthenticated,
    rateLimits.general,
    validateParams(idParamsSchema),
    validateBody(maitreSchema.partial()),
    asyncHandler(async (req: Request, res: Response) => {
      const updated = await storage.updateMaitreOeuvre?.(req.params.id, req.body);
      logger.info('[Stakeholders] maître d\'œuvre mis à jour', { metadata: { id: req.params.id } });
      res.json(updated ?? {});
    })
  );

  router.delete(
    '/api/maitres-oeuvre/:id',
    isAuthenticated,
    rateLimits.general,
    validateParams(idParamsSchema),
    asyncHandler(async (req: Request, res: Response) => {
      await storage.deleteMaitreOeuvre?.(req.params.id);
      logger.info('[Stakeholders] maître d\'œuvre supprimé', { metadata: { id: req.params.id } });
      res.status(204).send();
    })
  );

  // Contacts Maîtres d'œuvre
  router.get(
    '/api/maitres-oeuvre/:maitreOeuvreId/contacts',
    isAuthenticated,
    rateLimits.general,
    validateParams(maitreOeuvreParamsSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const contacts = await storage.getContactsMaitreOeuvre?.(req.params.maitreOeuvreId);
      sendSuccess(res, contacts ?? []);
    })
  );

  router.post(
    '/api/maitres-oeuvre/:maitreOeuvreId/contacts',
    isAuthenticated,
    rateLimits.creation,
    validateParams(maitreOeuvreParamsSchema),
    validateBody(contactSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const contact = await storage.createContactMaitreOeuvre?.({
        ...req.body,
        maitreOeuvreId: req.params.maitreOeuvreId,
      });
      logger.info('[Stakeholders] contact créé', { metadata: { maitreOeuvreId: req.params.maitreOeuvreId, contactId: contact?.id } });
      res.status(201).json(contact ?? {});
    })
  );

  router.put(
    '/api/maitres-oeuvre/:maitreOeuvreId/contacts/:contactId',
    isAuthenticated,
    rateLimits.general,
    validateParams(contactParamsSchema),
    validateBody(contactSchema.partial()),
    asyncHandler(async (req: Request, res: Response) => {
      const contact = await storage.updateContactMaitreOeuvre?.(req.params.contactId, req.body);
      logger.info('[Stakeholders] contact mis à jour', { metadata: { contactId: req.params.contactId } });
      res.json(contact ?? {});
    })
  );

  router.delete(
    '/api/maitres-oeuvre/:maitreOeuvreId/contacts/:contactId',
    isAuthenticated,
    rateLimits.general,
    validateParams(contactParamsSchema),
    asyncHandler(async (req: Request, res: Response) => {
      await storage.deleteContactMaitreOeuvre?.(req.params.contactId);
      logger.info('[Stakeholders] contact supprimé', { metadata: { contactId: req.params.contactId } });
      res.status(204).send();
    })
  );

  // AO Contacts
  router.get(
    '/api/ao-contacts/:aoId',
    isAuthenticated,
    rateLimits.general,
    validateParams(idParamsSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const contacts = await storage.getAoContacts?.(req.params.aoId);
      sendSuccess(res, contacts ?? []);
    })
  );

  router.post(
    '/api/ao-contacts',
    isAuthenticated,
    rateLimits.creation,
    validateBody(z.object({ aoId: z.string().uuid(), contactId: z.string().uuid() })),
    asyncHandler(async (req: Request, res: Response) => {
      const contact = await storage.createAoContact?.(req.body);
      logger.info('[Stakeholders] liaison AO-Contact créée', { metadata: { aoId: req.body.aoId, contactId: req.body.contactId } });
      res.status(201).json(contact ?? {});
    })
  );

  router.delete(
    '/api/ao-contacts/:id',
    isAuthenticated,
    rateLimits.general,
    validateParams(idParamsSchema),
    asyncHandler(async (req: Request, res: Response) => {
      await storage.deleteAoContact?.(req.params.id);
      logger.info('[Stakeholders] liaison AO-Contact supprimée', { metadata: { id: req.params.id } });
      res.status(204).send();
    })
  );

  // Project Contacts
  router.get(
    '/api/project-contacts/:projectId',
    isAuthenticated,
    rateLimits.general,
    validateParams(idParamsSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const contacts = await storage.getProjectContacts?.(req.params.projectId);
      sendSuccess(res, contacts ?? []);
    })
  );

  router.post(
    '/api/project-contacts',
    isAuthenticated,
    rateLimits.creation,
    validateBody(z.object({ projectId: z.string().uuid(), contactId: z.string().uuid() })),
    asyncHandler(async (req: Request, res: Response) => {
      const contact = await storage.createProjectContact?.(req.body);
      logger.info('[Stakeholders] liaison Project-Contact créée', { metadata: { projectId: req.body.projectId, contactId: req.body.contactId } });
      res.status(201).json(contact ?? {});
    })
  );

  router.delete(
    '/api/project-contacts/:id',
    isAuthenticated,
    rateLimits.general,
    validateParams(idParamsSchema),
    asyncHandler(async (req: Request, res: Response) => {
      await storage.deleteProjectContact?.(req.params.id);
      logger.info('[Stakeholders] liaison Project-Contact supprimée', { metadata: { id: req.params.id } });
      res.status(204).send();
    })
  );

  return router;
}
