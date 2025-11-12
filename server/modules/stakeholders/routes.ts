/**
 * Stakeholders Module Routes
 * 
 * This module handles all stakeholder-related routes including:
 * - Maîtres d'ouvrage (Project Owners) - CRUD operations
 * - Maîtres d'œuvre (Project Managers) - CRUD operations
 * - Maîtres d'œuvre Contacts - Multi-contact management
 */

import { Router } from 'express';
import { withErrorHandling } from './utils/error-handler';
import type { Request, Response } from 'express';
import { isAuthenticated } from '../../replitAuth';
import { asyncHandler, sendSuccess, createError } from '../../middleware/errorHandler';
import { validateParams, validateBody, commonParamSchemas } from '../../middleware/validation';
import { rateLimits } from '../../middleware/rate-limiter';
import { logger } from '../../utils/logger';
import { NotFoundError } from '../../utils/error-handler';
import type { IStorage } from '../../storage-poc';
import type { EventBus } from '../../eventBus';
import { insertAoContactsSchema, insertProjectContactsSchema } from '@shared/schema';
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
      
      logger.info('[Maîtres Ouvrage] Liste récupérée', { metadata: {
 count: maitresOuvrage.length
      }
    });
      
      res.json(maitresOuvrage);
          }

                                      });

  // GET /api/maitres-ouvrage/:id - Récupérer un maître d'ouvrage
  router.get("/api/maitres-ouvrage/:id", 
    isAuthenticated, 
    validateParams(commonParamSchemas.id),
    asyncHandler(async (req, res) => {
      const maitreOuvrage = await storage.getMaitreOuvrage(req.params.id);
      if (!maitreOuvrage) {
        throw new NotFoundError(`Maître d'ouvrage ${req.params.id}`);
      }
      
      logger.info('[Maîtres Ouvrage] Détail récupéré', { metadata: {
 id: req.params.id
      }
    });
      
      res.json(maitreOuvrage);
          }

                                      });

  // POST /api/maitres-ouvrage - Créer un maître d'ouvrage
  router.post("/api/maitres-ouvrage", 
    isAuthenticated, 
    asyncHandler(async (req, res) => {
      const maitreOuvrage = await storage.createMaitreOuvrage(req.body);
      
      logger.info('[Maîtres Ouvrage] Créé', { metadata: {
 id: maitreOuvrage.id, nom: maitreOuvrage.nom
      }
    });
      
      res.status(201).json(maitreOuvrage);
          }

                                      });

  // PUT /api/maitres-ouvrage/:id - Mettre à jour un maître d'ouvrage
  router.put("/api/maitres-ouvrage/:id", 
    isAuthenticated, 
    validateParams(commonParamSchemas.id),
    asyncHandler(async (req, res) => {
      const maitreOuvrage = await storage.updateMaitreOuvrage(req.params.id, req.body);
      
      logger.info('[Maîtres Ouvrage] Mis à jour', { metadata: {
 id: req.params.id
      }
    });
      
      res.json(maitreOuvrage);
          }

                                      });

  // DELETE /api/maitres-ouvrage/:id - Supprimer un maître d'ouvrage (soft delete)
  router.delete("/api/maitres-ouvrage/:id", 
    isAuthenticated, 
    validateParams(commonParamSchemas.id),
    asyncHandler(async (req, res) => {
      await storage.deleteMaitreOuvrage(req.params.id);
      
      logger.info('[Maîtres Ouvrage] Supprimé (soft delete)', { metadata: { id: req.params.id 
        });
      
      res.status(204).send();
          }

                                      });

  // ========================================
  // MAITRES D'OEUVRE ROUTES - Gestion contacts avec multi-contacts
  // ========================================

  // GET /api/maitres-oeuvre - Récupérer tous les maîtres d'œuvre avec leurs contacts
  router.get("/api/maitres-oeuvre", 
    isAuthenticated, 
    asyncHandler(async (req, res) => {
      const maitresOeuvre = await storage.getMaitresOeuvre();
      
      logger.info('[Maîtres Œuvre] Liste récupérée', { metadata: {
 count: maitresOeuvre.length
      }
    });
      
      res.json(maitresOeuvre);
          }

                                      });

  // GET /api/maitres-oeuvre/:id - Récupérer un maître d'œuvre avec ses contacts
  router.get("/api/maitres-oeuvre/:id", 
    isAuthenticated, 
    validateParams(commonParamSchemas.id),
    asyncHandler(async (req, res) => {
      const maitreOeuvre = await storage.getMaitreOeuvre(req.params.id);
      if (!maitreOeuvre) {
        throw new NotFoundError(`Maître d'œuvre ${req.params.id}`);
      }
      
      logger.info('[Maîtres Œuvre] Détail récupéré', { metadata: {
 id: req.params.id
      }
    });
      
      res.json(maitreOeuvre);
          }

                                      });

  // POST /api/maitres-oeuvre - Créer un maître d'œuvre
  router.post("/api/maitres-oeuvre", 
    isAuthenticated, 
    asyncHandler(async (req, res) => {
      const maitreOeuvre = await storage.createMaitreOeuvre(req.body);
      
      logger.info('[Maîtres Œuvre] Créé', { metadata: {
 id: maitreOeuvre.id, nom: maitreOeuvre.nom
      }
    });
      
      res.status(201).json(maitreOeuvre);
          }

                                      });

  // PUT /api/maitres-oeuvre/:id - Mettre à jour un maître d'œuvre
  router.put("/api/maitres-oeuvre/:id", 
    isAuthenticated, 
    validateParams(commonParamSchemas.id),
    asyncHandler(async (req, res) => {
      const maitreOeuvre = await storage.updateMaitreOeuvre(req.params.id, req.body);
      
      logger.info('[Maîtres Œuvre] Mis à jour', { metadata: {
 id: req.params.id
      }
    });
      
      res.json(maitreOeuvre);
          }

                                      });

  // DELETE /api/maitres-oeuvre/:id - Supprimer un maître d'œuvre (soft delete)
  router.delete("/api/maitres-oeuvre/:id", 
    isAuthenticated, 
    validateParams(commonParamSchemas.id),
    asyncHandler(async (req, res) => {
      await storage.deleteMaitreOeuvre(req.params.id);
      
      logger.info('[Maîtres Œuvre] Supprimé (soft delete)', { metadata: { id: req.params.id 
        });
      
      res.status(204).send();
          }

                                      });

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
      
      logger.info('[Contacts MO] Liste contacts récupérée', { metadata: {
 maitreOeuvreId: req.params.maitreOeuvreId, count: contacts.length
      }
    });
      
      res.json(contacts);
          }

                                      });

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
      
      logger.info('[Contacts MO] Contact créé', { metadata: {
 maitreOeuvreId: req.params.maitreOeuvreId, contactId: contact.id
      }
    });
      
      res.status(201).json(contact);
          }

                                      });

  // PUT /api/contacts-maitre-oeuvre/:contactId - Mettre à jour un contact
  router.put("/api/contacts-maitre-oeuvre/:contactId", 
    isAuthenticated, 
    validateParams(z.object({
      contactId: z.string().uuid()
    })),
    asyncHandler(async (req, res) => {
      const contact = await storage.updateContactMaitreOeuvre(req.params.contactId, req.body);
      
      logger.info('[Contacts MO] Contact mis à jour', { metadata: {
 contactId: req.params.contactId
      }
    });
      
      res.json(contact);
          }

                                      });

  // DELETE /api/contacts-maitre-oeuvre/:contactId - Supprimer un contact (soft delete)
  router.delete("/api/contacts-maitre-oeuvre/:contactId", 
    isAuthenticated, 
    validateParams(z.object({
      contactId: z.string().uuid()
    })),
    asyncHandler(async (req, res) => {
      await storage.deleteContactMaitreOeuvre(req.params.contactId);
      
      logger.info('[Contacts MO] Contact supprimé (soft delete)', { metadata: { contactId: req.params.contactId 
        });
      
      res.status(204).send();
          }

                                      });

  // ========================================
  // AO CONTACTS ROUTES - Table de liaison AO ↔ Contacts
  // ========================================

  // GET /api/ao-contacts/:aoId - Lister contacts liés à un AO
  router.get("/api/ao-contacts/:aoId",
    isAuthenticated,
    rateLimits.general,
    validateParams(z.object({ aoId: z.string().uuid("ID AO invalide") })),
    asyncHandler(async (req: Request, res: Response) => {
      return withErrorHandling(
    async () => {

        const { aoId } = req.params;
        const contacts = await storage.getAoContacts(aoId);
        sendSuccess(res, contacts);
      
    },
    {
      operation: 'ouvrage',
      service: 'routes',
      metadata: {}
    } );
        throw createError.database("Erreur lors de la récupération des contacts AO");
            }

                      }


                                }


                              }));

  // POST /api/ao-contacts - Créer liaison AO-Contact
  router.post("/api/ao-contacts",
    isAuthenticated,
    rateLimits.creation,
    validateBody(insertAoContactsSchema),
    asyncHandler(async (req: Request, res: Response) => {
      return withErrorHandling(
    async () => {

        const contactData = req.body;
        const newContact = await storage.createAoContact(contactData);
        logger.info('Liaison AO-Contact créée avec succès', { metadata: { aoId: req.body.aoId, contactId: req.body.contactId 

              });
        sendSuccess(res, newContact, 201);
      
    },
    {
      operation: 'ouvrage',
      service: 'routes',
      metadata: {}
    } );
        throw createError.database("Erreur lors de la création de la liaison AO-Contact");
            }

                      }


                                }


                              }));

  // DELETE /api/ao-contacts/:id - Supprimer liaison AO-Contact
  router.delete("/api/ao-contacts/:id",
    isAuthenticated,
    rateLimits.general,
    validateParams(commonParamSchemas.id),
    asyncHandler(async (req: Request, res: Response) => {
      return withErrorHandling(
    async () => {

        const { id } = req.params;
        await storage.deleteAoContact(id);
        logger.info('Liaison AO-Contact supprimée avec succès', { metadata: { id: req.params.id 

              });
        sendSuccess(res, null);
      
    },
    {
      operation: 'ouvrage',
      service: 'routes',
      metadata: {}
    } );
        throw createError.database("Erreur lors de la suppression de la liaison AO-Contact");
            }

                      }


                                }


                              }));

  // ========================================
  // PROJECT CONTACTS ROUTES - Table de liaison Projects ↔ Contacts
  // ========================================

  // GET /api/project-contacts/:projectId - Lister contacts liés à un projet
  router.get("/api/project-contacts/:projectId",
    isAuthenticated,
    rateLimits.general,
    validateParams(z.object({ projectId: z.string().uuid("ID Projet invalide") })),
    asyncHandler(async (req: Request, res: Response) => {
      return withErrorHandling(
    async () => {

        const { projectId } = req.params;
        const contacts = await storage.getProjectContacts(projectId);
        sendSuccess(res, contacts);
      
    },
    {
      operation: 'ouvrage',
      service: 'routes',
      metadata: {}
    } );
        throw createError.database("Erreur lors de la récupération des contacts projet");
            }

                      }


                                }


                              }));

  // POST /api/project-contacts - Créer liaison Project-Contact
  router.post("/api/project-contacts",
    isAuthenticated,
    rateLimits.creation,
    validateBody(insertProjectContactsSchema),
    asyncHandler(async (req: Request, res: Response) => {
      return withErrorHandling(
    async () => {

        const contactData = req.body;
        const newContact = await storage.createProjectContact(contactData);
        logger.info('Liaison Project-Contact créée avec succès', { metadata: { projectId: req.body.projectId, contactId: req.body.contactId 

              });
        sendSuccess(res, newContact, 201);
      
    },
    {
      operation: 'ouvrage',
      service: 'routes',
      metadata: {}
    } );
        throw createError.database("Erreur lors de la création de la liaison Project-Contact");
            }

                      }


                                }


                              }));

  // DELETE /api/project-contacts/:id - Supprimer liaison Project-Contact
  router.delete("/api/project-contacts/:id",
    isAuthenticated,
    rateLimits.general,
    validateParams(commonParamSchemas.id),
    asyncHandler(async (req: Request, res: Response) => {
      return withErrorHandling(
    async () => {

        const { id } = req.params;
        await storage.deleteProjectContact(id);
        logger.info('Liaison Project-Contact supprimée avec succès', { metadata: { id: req.params.id 

              });
        sendSuccess(res, null);
      
    },
    {
      operation: 'ouvrage',
      service: 'routes',
      metadata: {}
    } );
        throw createError.database("Erreur lors de la suppression de la liaison Project-Contact");
            }

                      }


                                }


                              }));

  return router;
}
