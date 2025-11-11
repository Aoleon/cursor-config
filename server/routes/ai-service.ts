import { Router } from "express";
import { withErrorHandling } from './utils/error-handler';
import { z } from "zod";
import { getAIService } from "../services/AIService";
import { storage } from "../storage";
import { aiQueryRequestSchema } from "@shared/schema";
import type { AiQueryRequest, ContextGenerationConfig } from "@shared/schema";
import type { IStorage } from "../storage-poc";
import { getContextBuilderService } from "../services/ContextBuilderService";
import { getContextCacheService } from "../services/ContextCacheService";
import { asyncHandler, ValidationError, NotFoundError } from "../utils/error-handler";
import { logger } from "../utils/logger";

const router = Router();

// ========================================
// ROUTES PRINCIPALES SERVICE IA
// ========================================

/**
 * POST /api/ai/generate-sql
 * Génère du SQL à partir d'une requête naturelle
 */
router.post("/generate-sql", asyncHandler(async (req, res) => {
  const validationResult = aiQueryRequestSchema.safeParse(req.body);
  if (!validationResult.success) {
    throw new ValidationError("Données de requête invalides", validationResult.error.issues);
  }

  const request: AiQueryRequest = validationResult.data;
  logger.info("Génération SQL demandée", { query: request.query, userRole: request.userRole });
  
  const aiService = getAIService(storage as IStorage);
  const result = await aiService.generateSQL(request);
  
  logger.info("Génération SQL terminée", { 
    success: result.success, 
    model: result.metadata?.model,
    responseTime: result.metadata?.responseTime 
  });
  
  res.status(result.success ? 200 : 400).json(result);
            }

                      }


                    }));

/**
 * GET /api/ai/usage-stats
 * Récupère les statistiques d'usage du service IA
 */
router.get("/usage-stats", asyncHandler(async (req, res) => {
  const timeRangeDays = parseInt(req.query.days as string) || 30;
  
  if (timeRangeDays < 1 || timeRangeDays > 365) {
    throw new ValidationError("Période invalide. Doit être entre 1 et 365 jours.");
  }
  
  const aiService = getAIService(storage as IStorage);
  const stats = await aiService.getUsageStats(timeRangeDays);
  
  logger.info("Statistiques d'usage récupérées", { timeRangeDays, totalRequests: stats.totalRequests });
  
  res.status(200).json({
    success: true,
    data: stats,
    timeRangeDays
  });
            }

                      }


                    }));

/**
 * POST /api/ai/clean-cache
 * Nettoie le cache expiré
 */
router.post("/clean-cache", asyncHandler(async (req, res) => {
  const aiService = getAIService(storage as IStorage);
  const cleanedCount = await aiService.cleanExpiredCache();
  
  logger.info("Cache nettoyé", { cleanedEntries: cleanedCount });
  
  res.status(200).json({
    success: true,
    data: {
      cleanedEntries: cleanedCount,
      message: `${cleanedCount} entrées de cache expirées supprimées`
    });
            }

                      }


                    }));

/**
 * GET /api/ai/health-check
 * Vérification santé des modèles IA
 */
router.get("/health-check", asyncHandler(async (req, res) => {
  const aiService = getAIService(storage as IStorage);
  const health = await aiService.healthCheck();
  
  const overallHealthy = health.claude && health.database && health.cache;
  
  logger.info("Health check AI", { overallHealthy, services: health });
  
  res.status(overallHealthy ? 200 : 503).json({
    success: overallHealthy,
    data: {
      status: overallHealthy ? "healthy" : "degraded",
      services: health,
      timestamp: new Date().toISOString(),
      warnings: [
        ...(!health.claude ? ["Claude Sonnet 4 indisponible"] : []),
        ...(!health.gpt ? ["GPT-5 indisponible (optionnel)"] : []),
        ...(!health.database ? ["Base de données inaccessible"] : []),
        ...(!health.cache ? ["Cache indisponible"] : [])
      ]
    });
            }

                      }


                    }));

// ========================================
// ROUTES AVANCÉES - ADMINISTRATION ET DEBUG
// ========================================

/**
 * POST /api/ai/test-model
 * Test rapide d'un modèle spécifique (pour debug)
 */
router.post("/test-model", asyncHandler(async (req, res) => {
  const testSchema = z.object({
    model: z.enum(["claude_sonnet_4", "gpt_5"]),
    query: z.string().min(1).max(200),
    context: z.string().max(1000).optional().default("")
  });

  const validationResult = testSchema.safeParse(req.body);
  if (!validationResult.success) {
    throw new ValidationError("Données de test invalides", validationResult.error.issues);
  }

  const { model, query, context } = validationResult.data;

  const testRequest: AiQueryRequest = {
    query,
    context,
    userRole: "test",
    forceModel: model,
    useCache: false,
    maxTokens: 500
  };

  logger.info("Test modèle IA", { model, query });
  const aiService = getAIService(storage as IStorage);
  const result = await aiService.generateSQL(testRequest);

  res.status(200).json({
    success: true,
    testModel: model,
    result
  });
            }

                      }


                    }));

/**
 * GET /api/ai/model-comparison
 * Compare les performances des modèles sur une période
 */
router.get("/model-comparison", asyncHandler(async (req, res) => {
  const timeRangeDays = parseInt(req.query.days as string) || 7;
  
  if (timeRangeDays < 1 || timeRangeDays > 90) {
    throw new ValidationError("Période invalide. Doit être entre 1 et 90 jours pour comparaison.");
  }

  const aiService = getAIService(storage as IStorage);
  const stats = await aiService.getUsageStats(timeRangeDays);

  const comparison = {
    timeRangeDays,
    claude_sonnet_4: {
      usage_percentage: stats.modelDistribution.claude_sonnet_4 * 100,
      estimated_cost_per_request: stats.estimatedCost / Math.max(stats.totalRequests * stats.modelDistribution.claude_sonnet_4, 1),
      avg_tokens_per_request: stats.totalTokensUsed / Math.max(stats.totalRequests * stats.modelDistribution.claude_sonnet_4, 1)
    },
    gpt_5: {
      usage_percentage: stats.modelDistribution.gpt_5 * 100,
      estimated_cost_per_request: stats.estimatedCost / Math.max(stats.totalRequests * stats.modelDistribution.gpt_5, 1),
      avg_tokens_per_request: stats.totalTokensUsed / Math.max(stats.totalRequests * stats.modelDistribution.gpt_5, 1)
    },
    overall: {
      success_rate: stats.successRate * 100,
      avg_response_time: stats.avgResponseTime,
      cache_hit_rate: stats.cacheHitRate * 100
    }
  };

  logger.info("Comparaison modèles IA récupérée", { timeRangeDays });
  res.status(200).json({
    success: true,
    data: comparison
  });
            }

                      }


                    }));

/**
 * GET /api/ai/cache-stats
 * Statistiques détaillées du cache IA
 */
router.get("/cache-stats", asyncHandler(async (req, res) => {
  const aiService = getAIService(storage as IStorage);
  const stats = await aiService.getUsageStats(30);

  const cacheStats = {
    hit_rate: stats.cacheHitRate * 100,
    total_requests: stats.totalRequests,
    estimated_savings: {
      tokens_saved: Math.round(stats.totalTokensUsed * stats.cacheHitRate),
      cost_saved_euros: Math.round(stats.estimatedCost * stats.cacheHitRate * 100) / 100
    },
    performance_impact: {
      avg_response_time_with_cache: stats.avgResponseTime,
      estimated_time_saved_ms: Math.round(stats.avgResponseTime * 0.8 * stats.cacheHitRate)
    }
  };

  logger.info("Stats cache récupérées", { hit_rate: cacheStats.hit_rate });
  res.status(200).json({
    success: true,
    data: cacheStats
  });
            }

                      }


                    }));

// ========================================
// ROUTES POUR CONFIGURATION ET GESTION
// ========================================

/**
 * GET /api/ai/config
 * Récupère la configuration actuelle du service IA
 */
router.get("/config", (req, res) => {
  const config = {
    models: {
      claude: {
        available: !!process.env.ANTHROPIC_API_KEY,
        model: "claude-sonnet-4-20250514",
        default_for: ["simple", "menuiserie_business"]
      },
      gpt: {
        available: !!process.env.OPENAI_API_KEY,
        model: "gpt-5", 
        default_for: ["complex", "expert"]
      }
    },
    cache: {
      enabled: true,
      expiry_hours: 24,
      cleanup_enabled: true
    },
    rate_limits: {
      requests_per_hour: 100,
      max_tokens_per_request: 8192
    },
    routing_rules: {
      auto_complexity_detection: true,
      menuiserie_specialization: true,
      fallback_enabled: true
    }
  };

  res.status(200).json({
    success: true,
    data: config
  });
});

// ========================================
// NOUVEAUX ENDPOINTS CONTEXTE ENRICHI IA
// ========================================

/**
 * GET /api/ai/context/:entityType/:id
 * Récupère le contexte enrichi pour une entité spécifique
 */
router.get("/context/:entityType/:id", asyncHandler(async (req, res) => {
  const { entityType, id: entityId } = req.params;
  const requestType = (req.query.type as string) || 'summary';
  
  const validEntityTypes = ['ao', 'offer', 'project', 'supplier', 'team', 'client'];
  if (!validEntityTypes.includes(entityType)) {
    throw new ValidationError(
      `Type d'entité invalide. Types supportés: ${validEntityTypes.join(', ')}`,
      { entityType, supportedTypes: validEntityTypes }
    );
  }

  if (!entityId || entityId.trim() === '') {
    throw new ValidationError("ID d'entité requis", { entityId });
  }

  logger.info("Récupération contexte enrichi", { entityType, entityId, requestType });
  
  const aiService = getAIService(storage as IStorage);
  const contextData = await aiService.buildEnrichedContext(
    entityType as any,
    entityId,
    requestType as any
  );

  if (!contextData) {
    throw new NotFoundError(`Impossible de générer le contexte pour ${entityType}:${entityId}`);
  }

  res.status(200).json({
    success: true,
    data: contextData,
    metadata: {
      entityType,
      entityId,
      requestType,
      generatedAt: new Date().toISOString(),
      tokensEstimate: contextData.tokenEstimate,
      compressionLevel: contextData.compressionLevel
        }
          );
            }

                      }


                    }));

/**
 * POST /api/ai/context-preview
 * Prévisualise un contexte sans le mettre en cache
 */
router.post("/context-preview", asyncHandler(async (req, res) => {
  const configSchema = z.object({
    entityType: z.enum(['ao', 'offer', 'project', 'supplier', 'team', 'client']),
    entityId: z.string().min(1),
    contextFilters: z.object({
      includeTypes: z.array(z.enum(['technique', 'metier', 'relationnel', 'temporel', 'administratif'])),
      scope: z.enum(['entity_focused', 'related_entities', 'domain_wide', 'historical']),
      maxDepth: z.number().min(1).max(5).default(2),
      includePredictive: z.boolean().default(true)
    }),
    performance: z.object({
      compressionLevel: z.enum(['none', 'light', 'medium', 'high']).default('light'),
      maxTokens: z.number().min(100).max(10000).default(2000)
    }).optional()
  });

  const validationResult = configSchema.safeParse(req.body);
  if (!validationResult.success) {
    throw new ValidationError("Configuration de contexte invalide", validationResult.error.issues);
  }

  const config: ContextGenerationConfig = {
    ...validationResult.data,
    requestType: 'full',
    performance: {
      compressionLevel: validationResult.data.performance?.compressionLevel || 'light',
      maxTokens: validationResult.data.performance?.maxTokens || 2000,
      cacheStrategy: 'minimal',
      freshnessThreshold: 1
    },
    businessSpecialization: {
      menuiserieTypes: ['fenetre', 'porte', 'volet'],
      projectPhases: ['etude', 'chiffrage', 'planification', 'chantier'],
      clientTypes: ['public', 'prive'],
      geographicScope: ['59', '62']
    }
  };

  logger.info("Preview contexte demandé", { 
    entityType: validationResult.data.entityType, 
    entityId: validationResult.data.entityId 
  });

  const contextBuilder = getContextBuilderService(storage as IStorage);
  const result = await contextBuilder.buildContextualData(config);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      error: result.error,
      performance: result.performance
    });
  }

  res.status(200).json({
    success: true,
    data: result.data,
    performance: result.performance,
    preview: true
  });
            }

                      }


                    }));

/**
 * GET /api/ai/context-stats
 * Récupère les statistiques du cache de contexte
 */
router.get("/context-stats", asyncHandler(async (req, res) => {
  const contextCache = getContextCacheService(storage as IStorage);
  const stats = contextCache.getStats();
  const efficiency = await contextCache.analyzeEfficiencyByEntityType();

  logger.info("Stats cache contexte récupérées", { totalEntries: stats.totalEntries });
  
  res.status(200).json({
    success: true,
    data: {
      globalStats: stats,
      efficiencyByEntityType: efficiency,
      retrievedAt: new Date().toISOString()
    });
            }

                      }


                    }));

/**
 * POST /api/ai/context-invalidate
 * Invalide le cache de contexte selon différents critères
 */
router.post("/context-invalidate", asyncHandler(async (req, res) => {
  const invalidationSchema = z.object({
    strategy: z.enum(['pattern', 'entity', 'all']),
    pattern: z.string().optional(),
    entityType: z.enum(['ao', 'offer', 'project', 'supplier', 'team', 'client']).optional(),
    entityId: z.string().optional()
  });

  const validationResult = invalidationSchema.safeParse(req.body);
  if (!validationResult.success) {
    throw new ValidationError("Paramètres d'invalidation invalides", validationResult.error.issues);
  }

  const { strategy, pattern, entityType, entityId } = validationResult.data;
  const contextCache = getContextCacheService(storage as IStorage);
  let invalidatedCount = 0;

  switch (strategy) {
    case 'all':
      await contextCache.invalidateAll();
      invalidatedCount = -1;
      break;
      
    case 'pattern':
      if (!pattern) {
        throw new ValidationError("Pattern requis pour l'invalidation par pattern");
      }
      invalidatedCount = await contextCache.invalidateByPattern(pattern);
      break;
      
    case 'entity':
      if (!entityType || !entityId) {
        throw new ValidationError("EntityType et EntityId requis pour l'invalidation par entité");
      }
      await contextCache.invalidateOnEntityChange(entityType, entityId, 'update');
      invalidatedCount = 1;
      break;
  }

  logger.info("Cache contexte invalidé", { strategy, invalidatedCount });
  
  res.status(200).json({
    success: true,
    data: {
      strategy,
      invalidatedCount,
      pattern,
      entityType,
      entityId,
      invalidatedAt: new Date().toISOString()
    });
            }

                      }


                    }));

/**
 * POST /api/ai/context-batch
 * Génère des contextes pour plusieurs entités en lot
 */
router.post("/context-batch", asyncHandler(async (req, res) => {
  const batchSchema = z.object({
    entities: z.array(z.object({
      entityType: z.enum(['ao', 'offer', 'project', 'supplier', 'team', 'client']),
      entityId: z.string().min(1),
      requestType: z.enum(['full', 'summary', 'specific']).default('summary')
    })).max(10),
    globalConfig: z.object({
      compressionLevel: z.enum(['none', 'light', 'medium', 'high']).default('light'),
      includeTypes: z.array(z.enum(['technique', 'metier', 'relationnel', 'temporel', 'administratif'])).default(['metier', 'relationnel'])
    }).optional()
  });

  const validationResult = batchSchema.safeParse(req.body);
  if (!validationResult.success) {
    throw new ValidationError("Configuration batch invalide", validationResult.error.issues);
  }

  const { entities, globalConfig } = validationResult.data;
  logger.info("Traitement batch contextes", { entitiesCount: entities.length });
  
  const aiService = getAIService(storage as IStorage);

  const batchPromises = entities.map(async (entity) => {
    return withErrorHandling(
    async () => {

      const contextData = await aiService.buildEnrichedContext(
        entity.entityType as any,
        entity.entityId,
        entity.requestType
      );
      
      return {
        entityType: entity.entityType,
        entityId: entity.entityId,
        success: true,
        data: contextData,
        tokensEstimate: contextData?.tokenEstimate || 0
      };
    
    },
    {
      operation: 'Router',
      service: 'ai-service',
      metadata: {
            })

          ););
      return {
        entityType: entity.entityType,
        entityId: entity.entityId,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    });

  const batchResults = await Promise.all(batchPromises);
  const successCount = batchResults.filter(r => r.success).length;
  const totalTokens = batchResults.reduce((sum, r) => sum + (r.tokensEstimate || 0), 0);

  logger.info("Traitement batch terminé", { 
    totalEntities: entities.length, 
    successCount,
    failureCount: entities.length - successCount
  });

  res.status(200).json({
    success: true,
    data: {
      results: batchResults,
      summary: {
        totalEntities: entities.length,
        successCount,
        failureCount: entities.length - successCount,
        totalTokensEstimate: totalTokens,
        averageTokensPerEntity: totalTokens / entities.length
      },
      processedAt: new Date().toISOString()
    });
            }

                      }


                    }));

export default router;