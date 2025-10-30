/**
 * Stakeholders Module Routes
 * 
 * This module handles all stakeholder-related routes including:
 * - Maîtres d'ouvrage (Project Owners) - CRUD operations
 * - Maîtres d'œuvre (Project Managers) - CRUD operations
 * - Maîtres d'œuvre Contacts - Multi-contact management
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import { isAuthenticated } from '../../replitAuth';
import { asyncHandler } from '../../middleware/errorHandler';
import { validateParams, commonParamSchemas } from '../../middleware/validation';
import { logger } from '../../utils/logger';
import { NotFoundError } from '../../utils/error-handler';
import type { IStorage } from '../../storage-poc';
import type { EventBus } from '../../eventBus';
import { z } from 'zod';

export function createStakeholdersRouter(storage: IStorage, eventBus: EventBus): Router {
  const router = Router();

  // ========================================
  // MAITRES D'OUVRAGE ROUTES - Gestion contacts réutilisables
  // ========================================

  // GET /api/maitres-ouvrage - Récupérer tous les maîtres d'ouvrage
  router.get("/api/maitres-ouvrage", 
    isAuthenticated, 
    asyncHandler(async (req, res) => {
      const maitresOuvrage = await storage.getMaitresOuvrage();
      
      logger.info('[Maîtres Ouvrage] Liste récupérée', { metadata: { count: maitresOuvrage.length } });
      
      res.json(maitresOuvrage);
    })
  );

  // GET /api/maitres-ouvrage/:id - Récupérer un maître d'ouvrage
  router.get("/api/maitres-ouvrage/:id", 
    isAuthenticated, 
    validateParams(commonParamSchemas.id),
    asyncHandler(async (req, res) => {
      const maitreOuvrage = await storage.getMaitreOuvrage(req.params.id);
      if (!maitreOuvrage) {
        throw new NotFoundError(`Maître d'ouvrage ${req.params.id}`);
      }
      
      logger.info('[Maîtres Ouvrage] Détail récupéré', { metadata: { id: req.params.id } });
      
      res.json(maitreOuvrage);
    })
  );

  // POST /api/maitres-ouvrage - Créer un maître d'ouvrage
  router.post("/api/maitres-ouvrage", 
    isAuthenticated, 
    asyncHandler(async (req, res) => {
      const maitreOuvrage = await storage.createMaitreOuvrage(req.body);
      
      logger.info('[Maîtres Ouvrage] Créé', { metadata: { id: maitreOuvrage.id, nom: maitreOuvrage.nom } });
      
      res.status(201).json(maitreOuvrage);
    })
  );

  // PUT /api/maitres-ouvrage/:id - Mettre à jour un maître d'ouvrage
  router.put("/api/maitres-ouvrage/:id", 
    isAuthenticated, 
    validateParams(commonParamSchemas.id),
    asyncHandler(async (req, res) => {
      const maitreOuvrage = await storage.updateMaitreOuvrage(req.params.id, req.body);
      
      logger.info('[Maîtres Ouvrage] Mis à jour', { metadata: { id: req.params.id } });
      
      res.json(maitreOuvrage);
    })
  );

  // DELETE /api/maitres-ouvrage/:id - Supprimer un maître d'ouvrage (soft delete)
  router.delete("/api/maitres-ouvrage/:id", 
    isAuthenticated, 
    validateParams(commonParamSchemas.id),
    asyncHandler(async (req, res) => {
      await storage.deleteMaitreOuvrage(req.params.id);
      
      logger.info('[Maîtres Ouvrage] Supprimé (soft delete)', { metadata: { id: req.params.id } });
      
      res.status(204).send();
    })
  );

  // ========================================
  // MAITRES D'OEUVRE ROUTES - Gestion contacts avec multi-contacts
  // ========================================

  // GET /api/maitres-oeuvre - Récupérer tous les maîtres d'œuvre avec leurs contacts
  router.get("/api/maitres-oeuvre", 
    isAuthenticated, 
    asyncHandler(async (req, res) => {
      const maitresOeuvre = await storage.getMaitresOeuvre();
      
      logger.info('[Maîtres Œuvre] Liste récupérée', { metadata: { count: maitresOeuvre.length } });
      
      res.json(maitresOeuvre);
    })
  );

  // GET /api/maitres-oeuvre/:id - Récupérer un maître d'œuvre avec ses contacts
  router.get("/api/maitres-oeuvre/:id", 
    isAuthenticated, 
    validateParams(commonParamSchemas.id),
    asyncHandler(async (req, res) => {
      const maitreOeuvre = await storage.getMaitreOeuvre(req.params.id);
      if (!maitreOeuvre) {
        throw new NotFoundError(`Maître d'œuvre ${req.params.id}`);
      }
      
      logger.info('[Maîtres Œuvre] Détail récupéré', { metadata: { id: req.params.id } });
      
      res.json(maitreOeuvre);
    })
  );

  // POST /api/maitres-oeuvre - Créer un maître d'œuvre
  router.post("/api/maitres-oeuvre", 
    isAuthenticated, 
    asyncHandler(async (req, res) => {
      const maitreOeuvre = await storage.createMaitreOeuvre(req.body);
      
      logger.info('[Maîtres Œuvre] Créé', { metadata: { id: maitreOeuvre.id, nom: maitreOeuvre.nom } });
      
      res.status(201).json(maitreOeuvre);
    })
  );

  // PUT /api/maitres-oeuvre/:id - Mettre à jour un maître d'œuvre
  router.put("/api/maitres-oeuvre/:id", 
    isAuthenticated, 
    validateParams(commonParamSchemas.id),
    asyncHandler(async (req, res) => {
      const maitreOeuvre = await storage.updateMaitreOeuvre(req.params.id, req.body);
      
      logger.info('[Maîtres Œuvre] Mis à jour', { metadata: { id: req.params.id } });
      
      res.json(maitreOeuvre);
    })
  );

  // DELETE /api/maitres-oeuvre/:id - Supprimer un maître d'œuvre (soft delete)
  router.delete("/api/maitres-oeuvre/:id", 
    isAuthenticated, 
    validateParams(commonParamSchemas.id),
    asyncHandler(async (req, res) => {
      await storage.deleteMaitreOeuvre(req.params.id);
      
      logger.info('[Maîtres Œuvre] Supprimé (soft delete)', { metadata: { id: req.params.id } });
      
      res.status(204).send();
    })
  );

  // ========================================
  // CONTACTS MAITRE OEUVRE ROUTES - Gestion multi-contacts
  // ========================================

  // GET /api/maitres-oeuvre/:maitreOeuvreId/contacts - Récupérer les contacts d'un maître d'œuvre
  router.get("/api/maitres-oeuvre/:maitreOeuvreId/contacts", 
    isAuthenticated, 
    validateParams(z.object({
      maitreOeuvreId: z.string().uuid()
    })),
    asyncHandler(async (req, res) => {
      const contacts = await storage.getContactsMaitreOeuvre(req.params.maitreOeuvreId);
      
      logger.info('[Contacts MO] Liste contacts récupérée', { metadata: { maitreOeuvreId: req.params.maitreOeuvreId, count: contacts.length } });
      
      res.json(contacts);
    })
  );

  // POST /api/maitres-oeuvre/:maitreOeuvreId/contacts - Créer un contact pour un maître d'œuvre
  router.post("/api/maitres-oeuvre/:maitreOeuvreId/contacts", 
    isAuthenticated, 
    validateParams(z.object({
      maitreOeuvreId: z.string().uuid()
    })),
    asyncHandler(async (req, res) => {
      const contact = await storage.createContactMaitreOeuvre({
        ...req.body,
        maitreOeuvreId: req.params.maitreOeuvreId,
      });
      
      logger.info('[Contacts MO] Contact créé', { metadata: { maitreOeuvreId: req.params.maitreOeuvreId, contactId: contact.id } });
      
      res.status(201).json(contact);
    })
  );

  // PUT /api/contacts-maitre-oeuvre/:contactId - Mettre à jour un contact
  router.put("/api/contacts-maitre-oeuvre/:contactId", 
    isAuthenticated, 
    validateParams(z.object({
      contactId: z.string().uuid()
    })),
    asyncHandler(async (req, res) => {
      const contact = await storage.updateContactMaitreOeuvre(req.params.contactId, req.body);
      
      logger.info('[Contacts MO] Contact mis à jour', { metadata: { contactId: req.params.contactId } });
      
      res.json(contact);
    })
  );

  // DELETE /api/contacts-maitre-oeuvre/:contactId - Supprimer un contact (soft delete)
  router.delete("/api/contacts-maitre-oeuvre/:contactId", 
    isAuthenticated, 
    validateParams(z.object({
      contactId: z.string().uuid()
    })),
    asyncHandler(async (req, res) => {
      await storage.deleteContactMaitreOeuvre(req.params.contactId);
      
      logger.info('[Contacts MO] Contact supprimé (soft delete)', { metadata: { contactId: req.params.contactId } });
      
      res.status(204).send();
    })
  );

  return router;
}
