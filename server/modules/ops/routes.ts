/**
 * Ops Module Routes - Development/Maintenance Operations
 * 
 * This module handles sensitive development and maintenance routes:
 * - Test/Seed Routes (6 routes): Create and delete test entities for E2E tests
 * - SQL Routes (3 routes): Execute and validate SQL queries for development
 * 
 * ⚠️ SECURITY WARNING: These routes are SENSITIVE and include production protection
 * - All SQL routes are blocked in production
 * - DELETE seed routes are blocked in production
 * - All operations are logged for audit trails
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import { isAuthenticated } from '../../replitAuth';
import { asyncHandler, sendSuccess, createError } from '../../middleware/errorHandler';
import { validateBody } from '../../middleware/validation';
import { rateLimits } from '../../middleware/rate-limiter';
import { logger } from '../../utils/logger';
import { ValidationError } from '../../utils/error-handler';
import type { IStorage } from '../../storage-poc';
import type { EventBus } from '../../eventBus';
import { db } from '../../db';
import { 
  insertAoSchema, 
  insertOfferSchema, 
  insertProjectSchema,
  sqlQueryRequestSchema,
  sqlValidationRequestSchema,
  aos,
  offers,
  projects,
  type SQLQueryRequest,
  type SQLValidationRequest
} from '@shared/schema';
import { eq } from 'drizzle-orm';
import { SQLEngineService } from '../../services/SQLEngineService';
import { getAIService } from '../../services/AIService';
import { RBACService } from '../../services/RBACService';
import { BusinessContextService } from '../../services/BusinessContextService';
import { timeTrackingService } from '../../services/TimeTrackingService';
import { workloadSimulationService } from '../../services/WorkloadSimulationService';
import { insertTimeTrackingSchema } from '../../validation-schemas';
import { validateParams, validateQuery, commonParamSchemas } from '../../middleware/validation';
import { z } from 'zod';

// ========================================
// OPS ROUTER FACTORY
// ========================================

export function createOpsRouter(storage: IStorage, eventBus: EventBus): Router {
  const router = Router();

  // Initialize required services for SQL routes
  const aiService = getAIService(storage);
  const rbacService = new RBACService(storage);
  const businessContextService = new BusinessContextService(storage, rbacService, eventBus);
  const sqlEngineService = new SQLEngineService(
    aiService,
    rbacService,
    businessContextService,
    eventBus,
    storage
  );

  // ========================================
  // TEST/SEED ROUTES (6 routes)
  // ========================================

  /**
   * POST /api/test/seed/ao
   * Crée un AO avec ID déterministe pour tests E2E
   * Accepte uniquement IDs avec pattern e2e-*
   * 
   * @access development only
   */
  router.post('/api/test/seed/ao', asyncHandler(async (req, res) => {
    const { id, ...data } = req.body;
    
    // Valider que l'ID est au format e2e-*
    if (!id || !id.startsWith('e2e-')) {
      throw new ValidationError('ID must start with "e2e-" for test seeds');
    }

    // ✅ Utiliser insert schema pour validation et defaults
    const validatedData = insertAoSchema.parse({
      ...data,
      // Defaults pour champs requis si absents
      menuiserieType: data.menuiserieType || 'fenetre',
      source: data.source || 'other',
      departement: data.departement || '75',
      // Convertir decimal fields (number → string)
      montantEstime: data.montantEstime ? String(data.montantEstime) : undefined,
      prorataEventuel: data.prorataEventuel ? String(data.prorataEventuel) : undefined,
      amountEstimate: data.amountEstimate ? String(data.amountEstimate) : undefined,
    });

    // ✅ Insert avec données validées
    const ao = await db.insert(aos).values({
      id,
      ...validatedData
    }).returning();

    logger.info('[E2E Seeds] AO de test créé', { metadata: {
 aoId: id, route: '/api/test/seed/ao'
      }
    });

    res.json({ success: true, data: ao[0] 

          });
        }

                  }


                            }


                          }));

  /**
   * POST /api/test/seed/offer
   * Crée une Offer avec ID déterministe pour tests E2E
   * Accepte uniquement IDs avec pattern e2e-*
   * 
   * @access development only
   */
  router.post('/api/test/seed/offer', asyncHandler(async (req, res) => {
    const { id, ...data } = req.body;
    
    // Valider que l'ID est au format e2e-*
    if (!id || !id.startsWith('e2e-')) {
      throw new ValidationError('ID must start with "e2e-" for test seeds');
    }

    // ✅ Utiliser insert schema pour validation et defaults
    const validatedData = insertOfferSchema.parse({
      ...data,
      // Defaults pour champs requis si absents
      menuiserieType: data.menuiserieType || 'fenetre',
      client: data.client || 'Client Test E2E',
      location: data.location || 'Paris, France',
      // Convertir decimal fields (number → string)
      montantEstime: data.montantEstime ? String(data.montantEstime) : undefined,
      montantFinal: data.montantFinal ? String(data.montantFinal) : undefined,
    });

    // ✅ Insert avec données validées
    const offer = await db.insert(offers).values({
      id,
      ...validatedData
    }).returning();

    logger.info('[E2E Seeds] Offer de test créée', { metadata: {
 offerId: id, route: '/api/test/seed/offer'
      }
    });

    res.json({ success: true, data: offer[0] 

          });
        }

                  }


                            }


                          }));

  /**
   * POST /api/test/seed/project
   * Crée un Project avec ID déterministe pour tests E2E
   * Accepte uniquement IDs avec pattern e2e-*
   * 
   * @access development only
   */
  router.post('/api/test/seed/project', asyncHandler(async (req, res) => {
    const { id, ...data } = req.body;
    
    // Valider que l'ID est au format e2e-*
    if (!id || !id.startsWith('e2e-')) {
      throw new ValidationError('ID must start with "e2e-" for test seeds');
    }

    // ✅ Utiliser insert schema pour validation et defaults
    const validatedData = insertProjectSchema.parse({
      ...data,
      // Defaults pour champs requis si absents
      name: data.name || data.nom || 'Project Test E2E',
      client: data.client || 'Client Test E2E',
      location: data.location || 'Paris, France',
      // Convertir decimal fields (number → string)
      budget: data.budget || data.montant ? String(data.budget || data.montant) : undefined,
      montantEstime: data.montantEstime ? String(data.montantEstime) : undefined,
      montantFinal: data.montantFinal ? String(data.montantFinal) : undefined,
      prorataEventuel: data.prorataEventuel ? String(data.prorataEventuel) : undefined,
      contractAmount: data.contractAmount ? String(data.contractAmount) : undefined,
    });

    // ✅ Insert avec données validées
    const project = await db.insert(projects).values({
      id,
      ...validatedData
    }).returning();

    logger.info('[E2E Seeds] Project de test créé', { metadata: {
 projectId: id, route: '/api/test/seed/project'
      }
    });

    res.json({ success: true, data: project[0] 

          });
        }

                  }


                            }


                          }));

  /**
   * DELETE /api/test/seed/ao/:id
   * Supprime un AO de test
   * Accepte uniquement IDs avec pattern e2e-*
   * 
   * ⚠️ PROTECTED IN PRODUCTION
   * @access development only
   */
  router.delete('/api/test/seed/ao/:id', asyncHandler(async (req, res) => {
    // 🔒 Protection production pour opération destructive
    if (process.env.NODE_ENV === 'production') {
      logger.warn('[Ops] Tentative accès route DELETE seed en production', { metadata: {

          route: '/api/test/seed/ao/:id',
          method: 'DELETE',
          environment: 'production'
      }
    });
      return res.status(403).json({ error: 'Route désactivée en production' });
    }

    const { id } = req.params;
    
    // Valider que l'ID est au format e2e-*
    if (!id || !id.startsWith('e2e-')) {
      throw new ValidationError('ID must start with "e2e-" for test seeds');
    }

    await db.delete(aos).where(eq(aos.id, id));
    
    logger.info('[E2E Seeds] AO de test supprimé', { metadata: {
 aoId: id, route: '/api/test/seed/ao/:id'
      }
    });

    res.json({ success: true 

          });
        }

                  }


                            }


                          }));

  /**
   * DELETE /api/test/seed/offer/:id
   * Supprime une Offer de test
   * Accepte uniquement IDs avec pattern e2e-*
   * 
   * ⚠️ PROTECTED IN PRODUCTION
   * @access development only
   */
  router.delete('/api/test/seed/offer/:id', asyncHandler(async (req, res) => {
    // 🔒 Protection production pour opération destructive
    if (process.env.NODE_ENV === 'production') {
      logger.warn('[Ops] Tentative accès route DELETE seed en production', { metadata: {

          route: '/api/test/seed/offer/:id',
          method: 'DELETE',
          environment: 'production'
      }
    });
      return res.status(403).json({ error: 'Route désactivée en production' });
    }

    const { id } = req.params;
    
    // Valider que l'ID est au format e2e-*
    if (!id || !id.startsWith('e2e-')) {
      throw new ValidationError('ID must start with "e2e-" for test seeds');
    }

    await db.delete(offers).where(eq(offers.id, id));
    
    logger.info('[E2E Seeds] Offer de test supprimée', { metadata: {
 offerId: id, route: '/api/test/seed/offer/:id'
      }
    });

    res.json({ success: true 

          });
        }

                  }


                            }


                          }));

  /**
   * DELETE /api/test/seed/project/:id
   * Supprime un Project de test
   * Accepte uniquement IDs avec pattern e2e-*
   * 
   * ⚠️ PROTECTED IN PRODUCTION
   * @access development only
   */
  router.delete('/api/test/seed/project/:id', asyncHandler(async (req, res) => {
    // 🔒 Protection production pour opération destructive
    if (process.env.NODE_ENV === 'production') {
      logger.warn('[Ops] Tentative accès route DELETE seed en production', { metadata: {

          route: '/api/test/seed/project/:id',
          method: 'DELETE',
          environment: 'production'
      }
    });
      return res.status(403).json({ error: 'Route désactivée en production' });
    }

    const { id } = req.params;
    
    // Valider que l'ID est au format e2e-*
    if (!id || !id.startsWith('e2e-')) {
      throw new ValidationError('ID must start with "e2e-" for test seeds');
    }

    await db.delete(projects).where(eq(projects.id, id));
    
    logger.info('[E2E Seeds] Project de test supprimé', { metadata: {
 projectId: id, route: '/api/test/seed/project/:id'
      }
    });

    res.json({ success: true 

          });
        }

                  }


                            }


                          }));

  // ========================================
  // SQL ROUTES (3 routes)
  // ========================================

  /**
   * POST /api/sql/query
   * Exécution requête natural language to SQL
   * 
   * ⚠️ PROTECTED IN PRODUCTION
   * @access development only
   */
  router.post("/api/sql/query", 
    isAuthenticated,
    rateLimits.processing,
    validateBody(sqlQueryRequestSchema),
    asyncHandler(async (req: Request, res: Response) => {
      // 🔒 Protection production pour exécution SQL directe
      if (process.env.NODE_ENV === 'production') {
        logger.warn('[Ops] Tentative accès route SQL query en production', { metadata: {

            route: '/api/sql/query',
            method: 'POST',
            environment: 'production',
                  userId: req.session?.user?.id || req.user?.id
      }
    });
        return res.status(403).json({ error: 'Route désactivée en production' });
      }

      const { naturalLanguageQuery, context, dryRun, maxResults, timeoutMs } = req.body;
      
      // Construction de la requête SQL avec métadonnées utilisateur
      const sqlRequest: SQLQueryRequest = {
        naturalLanguageQuery,
        userId: req.session.user?.id || req.user?.id,
        userRole: req.session.user?.role || req.user?.role || 'user',
        context,
        dryRun,
        maxResults,
        timeoutMs
      };

      logger.info('[Ops] Requête NL reçue', { metadata: {
 
          userRole: sqlRequest.userRole, 
          query: naturalLanguageQuery,
          route: '/api/sql/query'
      }
    });

      // Exécution via le moteur SQL sécurisé
      const result = await sqlEngineService.executeNaturalLanguageQuery(sqlRequest);

      // Réponse standardisée
      if (result.success) {
        sendSuccess(res, {
          sql: result.sql,
          parameters: result.parameters,
          results: result.results,
          executionTime: result.executionTime,
          rbacFiltersApplied: result.rbacFiltersApplied,
          confidence: result.confidence,
          warnings: result.warnings,
          metadata: result.metadata

              });
      } else {
        // Gestion des erreurs sécurisées (ne pas exposer les détails internes)
        const statusCode = result.error?.type === 'rbac' ? 403 : 
                          result.error?.type === 'validation' ? 400 : 500;
        
        res.status(statusCode).json({
          success: false,
          error: result.error?.message || 'Erreur lors de l\'exécution de la requête',
          type: result.error?.type || 'internal',
          warnings: result.warnings
        });
            }

                      }


                                }


                              }));

  /**
   * POST /api/sql/validate
   * Validation SQL sans exécution
   * 
   * ⚠️ PROTECTED IN PRODUCTION
   * @access development only
   */
  router.post("/api/sql/validate",
    isAuthenticated,
    rateLimits.general,
    validateBody(sqlValidationRequestSchema),
    asyncHandler(async (req: Request, res: Response) => {
      // 🔒 Protection production pour validation SQL
      if (process.env.NODE_ENV === 'production') {
        logger.warn('[Ops] Tentative accès route SQL validate en production', { metadata: {

            route: '/api/sql/validate',
            method: 'POST',
            environment: 'production',
                  userId: req.session?.user?.id || req.user?.id
      }
    });
        return res.status(403).json({ error: 'Route désactivée en production' });
      }

      const { sql, parameters } = req.body;
      
      // Construction de la requête de validation
      const validationRequest: SQLValidationRequest = {
        sql,
        parameters,
        userId: req.session.user?.id || req.user?.id,
        userRole: req.session.user?.role || req.user?.role || 'user'
      };

      logger.info('[Ops] Validation SQL demandée', { metadata: {
 
          userRole: validationRequest.userRole,
          route: '/api/sql/validate'
      }
    });

      // Validation via le moteur SQL
      const validationResult = await sqlEngineService.validateSQL(validationRequest);

      sendSuccess(res, {
        isValid: validationResult.isValid,
        isSecure: validationResult.isSecure,
        allowedTables: validationResult.allowedTables,
        deniedTables: validationResult.deniedTables,
        allowedColumns: validationResult.allowedColumns,
        deniedColumns: validationResult.deniedColumns,
        securityViolations: validationResult.securityViolations,
        rbacViolations: validationResult.rbacViolations,
        suggestions: validationResult.suggestions
      });
          }
        })
      );

  /**
   * GET /api/sql/context
   * Récupération contexte base de données pour IA
   * 
   * ⚠️ PROTECTED IN PRODUCTION
   * @access development only
   */
  router.get("/api/sql/context",
    isAuthenticated,
    rateLimits.general,
    asyncHandler(async (req: Request, res: Response) => {
      // 🔒 Protection production pour contexte DB
      if (process.env.NODE_ENV === 'production') {
        logger.warn('[Ops] Tentative accès route SQL context en production', { metadata: {

            route: '/api/sql/context',
            method: 'GET',
            environment: 'production',
                  userId: req.session?.user?.id || req.user?.id
      }
    });
        return res.status(403).json({ error: 'Route désactivée en production' });
      }

      const userId = req.session.user?.id || req.user?.id;
      const userRole = req.session.user?.role || req.user?.role || 'user';

      logger.info('[Ops] Contexte DB demandé', { metadata: {
 
          userRole,
          route: '/api/sql/context'
      }
    });

      // Récupération du contexte filtré par RBAC
      const contextResult = await sqlEngineService.buildDatabaseContext(userId, userRole);

      sendSuccess(res, {
        context: contextResult.context,
        availableTables: contextResult.availableTables,
        rbacFiltersInfo: contextResult.rbacFiltersInfo,
        exampleQueries: contextResult.exampleQueries
      });
          }
        })
      );

  // ========================================
  // TIME TRACKING ROUTES (Fonctionnalité 6)
  // ========================================

  // POST /api/time-tracking
  router.post('/api/time-tracking',
    isAuthenticated,
    rateLimits.creation,
    validateBody(insertTimeTrackingSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const tracking = await timeTrackingService.recordTime({
        ...req.body,
        date: new Date(req.body.date)
      });
      return sendSuccess(res, tracking, 201);
          }
        })
      );

  // GET /api/time-tracking
  router.get('/api/time-tracking',
    isAuthenticated,
    rateLimits.general,
    validateQuery(z.object({
      projectId: z.string().uuid().optional(),
      offerId: z.string().uuid().optional(),
      userId: z.string().uuid().optional(),
      taskType: z.enum(['be', 'admin', 'terrain', 'chiffrage', 'commercial']).optional(),
      dateFrom: z.string().datetime().optional(),
      dateTo: z.string().datetime().optional()
    })),
    asyncHandler(async (req: Request, res: Response) => {
      const filters = {
        projectId: req.query.projectId as string | undefined,
        offerId: req.query.offerId as string | undefined,
        userId: req.query.userId as string | undefined,
        taskType: req.query.taskType as string | undefined,
        dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
        dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined
      };
      const entries = await storage.getTimeTracking(filters);
      return sendSuccess(res, entries);
          }
        })
      );

  // GET /api/projects/:id/time-tracking/summary
  router.get('/api/projects/:id/time-tracking/summary',
    isAuthenticated,
    rateLimits.general,
    validateParams(commonParamSchemas.id),
    asyncHandler(async (req: Request, res: Response) => {
      const projectId = req.params.id;
      const summary = await timeTrackingService.getProjectTimeSummary(projectId);
      return sendSuccess(res, summary);
          }
        })
      );

  // ========================================
  // WORKLOAD SIMULATION ROUTES (Fonctionnalité 7)
  // ========================================

  // GET /api/workload/simulation
  router.get('/api/workload/simulation',
    isAuthenticated,
    rateLimits.general,
    validateQuery(z.object({
      startDate: z.string().datetime(),
      endDate: z.string().datetime()
    })),
    asyncHandler(async (req: Request, res: Response) => {
      const { startDate, endDate } = req.query;
      const simulation = await workloadSimulationService.simulateCharge(
        new Date(startDate as string),
        new Date(endDate as string)
      );
      return sendSuccess(res, simulation);
          }
        })
      );

  // GET /api/workload/current
  router.get('/api/workload/current',
    isAuthenticated,
    rateLimits.general,
    asyncHandler(async (req: Request, res: Response) => {
      const now = new Date();
      const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // +30 jours
      const simulation = await workloadSimulationService.simulateCharge(now, endDate);
      return sendSuccess(res, simulation);
          }
        })
      );

  // GET /api/workload/bottlenecks
  router.get('/api/workload/bottlenecks',
    isAuthenticated,
    rateLimits.general,
    validateQuery(z.object({
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional()
    })),
    asyncHandler(async (req: Request, res: Response) => {
      const startDate = req.query.startDate 
        ? new Date(req.query.startDate as string)
        : new Date();
      const endDate = req.query.endDate
        ? new Date(req.query.endDate as string)
        : new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);
      const simulation = await workloadSimulationService.simulateCharge(startDate, endDate);
      return sendSuccess(res, { bottlenecks: simulation.bottlenecks 
       
       
       });
          }
        })
      );

  return router;
}
