import { Router } from "express";
import { z } from "zod";
import { getAIService } from "../services/AIService";
import { storage } from "../storage";
import { aiQueryRequestSchema } from "@shared/schema";
import type { AiQueryRequest, ContextGenerationConfig } from "@shared/schema";
import type { IStorage } from "../storage-poc";
import { getContextBuilderService } from "../services/ContextBuilderService";
import { getContextCacheService } from "../services/ContextCacheService";

const router = Router();

// ========================================
// ROUTES PRINCIPALES SERVICE IA
// ========================================

/**
 * POST /api/ai/generate-sql
 * Génère du SQL à partir d'une requête naturelle
 */
router.post("/generate-sql", async (req, res) => {
  try {
    // Validation du body de la requête
    const validationResult = aiQueryRequestSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: {
          type: "validation_error",
          message: "Données de requête invalides",
          details: validationResult.error.issues,
          fallbackAttempted: false
        }
      });
    }

    const request: AiQueryRequest = validationResult.data;
    
    // Récupération du service IA
    const aiService = getAIService(storage as IStorage);
    
    // Génération SQL
    const result = await aiService.generateSQL(request);
    
    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
    
  } catch (error) {
    console.error("[AI Routes] Erreur génération SQL:", error);
    res.status(500).json({
      success: false,
      error: {
        type: "unknown",
        message: "Erreur interne du serveur",
        details: error instanceof Error ? error.message : String(error),
        fallbackAttempted: false
      }
    });
  }
});

/**
 * GET /api/ai/usage-stats
 * Récupère les statistiques d'usage du service IA
 */
router.get("/usage-stats", async (req, res) => {
  try {
    const timeRangeDays = parseInt(req.query.days as string) || 30;
    
    if (timeRangeDays < 1 || timeRangeDays > 365) {
      return res.status(400).json({
        error: "Période invalide. Doit être entre 1 et 365 jours."
      });
    }
    
    const aiService = getAIService(storage as IStorage);
    const stats = await aiService.getUsageStats(timeRangeDays);
    
    res.status(200).json({
      success: true,
      data: stats,
      timeRangeDays
    });
    
  } catch (error) {
    console.error("[AI Routes] Erreur récupération stats:", error);
    res.status(500).json({
      success: false,
      error: "Impossible de récupérer les statistiques d'usage"
    });
  }
});

/**
 * POST /api/ai/clean-cache
 * Nettoie le cache expiré
 */
router.post("/clean-cache", async (req, res) => {
  try {
    const aiService = getAIService(storage as IStorage);
    const cleanedCount = await aiService.cleanExpiredCache();
    
    res.status(200).json({
      success: true,
      data: {
        cleanedEntries: cleanedCount,
        message: `${cleanedCount} entrées de cache expirées supprimées`
      }
    });
    
  } catch (error) {
    console.error("[AI Routes] Erreur nettoyage cache:", error);
    res.status(500).json({
      success: false,
      error: "Impossible de nettoyer le cache"
    });
  }
});

/**
 * GET /api/ai/health-check
 * Vérification santé des modèles IA
 */
router.get("/health-check", async (req, res) => {
  try {
    const aiService = getAIService(storage as IStorage);
    const health = await aiService.healthCheck();
    
    const overallHealthy = health.claude && health.database && health.cache;
    
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
      }
    });
    
  } catch (error) {
    console.error("[AI Routes] Erreur health check:", error);
    res.status(503).json({
      success: false,
      data: {
        status: "unhealthy",
        error: "Impossible de vérifier l'état des services IA"
      }
    });
  }
});

// ========================================
// ROUTES AVANCÉES - ADMINISTRATION ET DEBUG
// ========================================

/**
 * POST /api/ai/test-model
 * Test rapide d'un modèle spécifique (pour debug)
 */
router.post("/test-model", async (req, res) => {
  try {
    const testSchema = z.object({
      model: z.enum(["claude_sonnet_4", "gpt_5"]),
      query: z.string().min(1).max(200),
      context: z.string().max(1000).optional().default("")
    });

    const validationResult = testSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: "Données de test invalides",
        details: validationResult.error.issues
      });
    }

    const { model, query, context } = validationResult.data;

    const testRequest: AiQueryRequest = {
      query,
      context,
      userRole: "test",
      forceModel: model,
      useCache: false, // Pas de cache pour les tests
      maxTokens: 500
    };

    const aiService = getAIService(storage as IStorage);
    const result = await aiService.generateSQL(testRequest);

    res.status(200).json({
      success: true,
      testModel: model,
      result
    });

  } catch (error) {
    console.error("[AI Routes] Erreur test modèle:", error);
    res.status(500).json({
      success: false,
      error: "Erreur lors du test du modèle"
    });
  }
});

/**
 * GET /api/ai/model-comparison
 * Compare les performances des modèles sur une période
 */
router.get("/model-comparison", async (req, res) => {
  try {
    const timeRangeDays = parseInt(req.query.days as string) || 7;
    
    if (timeRangeDays < 1 || timeRangeDays > 90) {
      return res.status(400).json({
        error: "Période invalide. Doit être entre 1 et 90 jours pour comparaison."
      });
    }

    // TODO: Implémenter la logique de comparaison détaillée
    // Pour l'instant, retourner les stats générales
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

    res.status(200).json({
      success: true,
      data: comparison
    });

  } catch (error) {
    console.error("[AI Routes] Erreur comparaison modèles:", error);
    res.status(500).json({
      success: false,
      error: "Impossible de comparer les modèles"
    });
  }
});

/**
 * GET /api/ai/cache-stats
 * Statistiques détaillées du cache IA
 */
router.get("/cache-stats", async (req, res) => {
  try {
    // TODO: Implémenter les stats détaillées du cache
    // Pour l'instant, retourner les stats de base
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
        estimated_time_saved_ms: Math.round(stats.avgResponseTime * 0.8 * stats.cacheHitRate) // Estimation
      }
    };

    res.status(200).json({
      success: true,
      data: cacheStats
    });

  } catch (error) {
    console.error("[AI Routes] Erreur stats cache:", error);
    res.status(500).json({
      success: false,
      error: "Impossible de récupérer les statistiques du cache"
    });
  }
});

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
router.get("/context/:entityType/:id", async (req, res) => {
  try {
    const { entityType, id: entityId } = req.params;
    const requestType = (req.query.type as string) || 'summary';
    
    // Validation des paramètres
    const validEntityTypes = ['ao', 'offer', 'project', 'supplier', 'team', 'client'];
    if (!validEntityTypes.includes(entityType)) {
      return res.status(400).json({
        success: false,
        error: {
          type: "validation_error",
          message: `Type d'entité invalide. Types supportés: ${validEntityTypes.join(', ')}`,
          details: { entityType, supportedTypes: validEntityTypes }
        }
      });
    }

    if (!entityId || entityId.trim() === '') {
      return res.status(400).json({
        success: false,
        error: {
          type: "validation_error",
          message: "ID d'entité requis",
          details: { entityId }
        }
      });
    }

    // Récupération du service IA et génération du contexte
    const aiService = getAIService(storage as IStorage);
    const contextData = await aiService.buildEnrichedContext(
      entityType as any,
      entityId,
      requestType as any
    );

    if (contextData) {
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
      });
    } else {
      res.status(404).json({
        success: false,
        error: {
          type: "not_found",
          message: `Impossible de générer le contexte pour ${entityType}:${entityId}`,
          details: { entityType, entityId }
        }
      });
    }

  } catch (error) {
    console.error("[AI Routes] Erreur récupération contexte:", error);
    res.status(500).json({
      success: false,
      error: {
        type: "unknown",
        message: "Erreur interne lors de la génération du contexte",
        details: error instanceof Error ? error.message : String(error)
      }
    });
  }
});

/**
 * POST /api/ai/context-preview
 * Prévisualise un contexte sans le mettre en cache
 */
router.post("/context-preview", async (req, res) => {
  try {
    // Validation de la configuration contexte
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
      return res.status(400).json({
        success: false,
        error: {
          type: "validation_error",
          message: "Configuration de contexte invalide",
          details: validationResult.error.issues
        }
      });
    }

    const config: ContextGenerationConfig = {
      ...validationResult.data,
      requestType: 'full',
      performance: {
        ...validationResult.data.performance,
        cacheStrategy: 'minimal', // Pas de cache pour preview
        freshnessThreshold: 1
      },
      businessSpecialization: {
        menuiserieTypes: ['fenetre', 'porte', 'volet'],
        projectPhases: ['etude', 'chiffrage', 'planification', 'chantier'],
        clientTypes: ['public', 'prive'],
        geographicScope: ['59', '62']
      }
    };

    // Génération directe du contexte (sans cache)
    const contextBuilder = getContextBuilderService(storage as IStorage);
    const result = await contextBuilder.buildContextualData(config);

    if (result.success) {
      res.status(200).json({
        success: true,
        data: result.data,
        performance: result.performance,
        preview: true
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        performance: result.performance
      });
    }

  } catch (error) {
    console.error("[AI Routes] Erreur preview contexte:", error);
    res.status(500).json({
      success: false,
      error: {
        type: "unknown",
        message: "Erreur interne lors de la prévisualisation",
        details: error instanceof Error ? error.message : String(error)
      }
    });
  }
});

/**
 * GET /api/ai/context-stats
 * Récupère les statistiques du cache de contexte
 */
router.get("/context-stats", async (req, res) => {
  try {
    const contextCache = getContextCacheService(storage as IStorage);
    const stats = contextCache.getStats();
    const efficiency = await contextCache.analyzeEfficiencyByEntityType();

    res.status(200).json({
      success: true,
      data: {
        globalStats: stats,
        efficiencyByEntityType: efficiency,
        retrievedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error("[AI Routes] Erreur récupération stats cache:", error);
    res.status(500).json({
      success: false,
      error: "Impossible de récupérer les statistiques du cache"
    });
  }
});

/**
 * POST /api/ai/context-invalidate
 * Invalide le cache de contexte selon différents critères
 */
router.post("/context-invalidate", async (req, res) => {
  try {
    const invalidationSchema = z.object({
      strategy: z.enum(['pattern', 'entity', 'all']),
      pattern: z.string().optional(),
      entityType: z.enum(['ao', 'offer', 'project', 'supplier', 'team', 'client']).optional(),
      entityId: z.string().optional()
    });

    const validationResult = invalidationSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: {
          type: "validation_error",
          message: "Paramètres d'invalidation invalides",
          details: validationResult.error.issues
        }
      });
    }

    const { strategy, pattern, entityType, entityId } = validationResult.data;
    const contextCache = getContextCacheService(storage as IStorage);
    let invalidatedCount = 0;

    switch (strategy) {
      case 'all':
        await contextCache.invalidateAll();
        invalidatedCount = -1; // Toutes les entrées
        break;
        
      case 'pattern':
        if (!pattern) {
          return res.status(400).json({
            success: false,
            error: {
              type: "validation_error",
              message: "Pattern requis pour l'invalidation par pattern"
            }
          });
        }
        invalidatedCount = await contextCache.invalidateByPattern(pattern);
        break;
        
      case 'entity':
        if (!entityType || !entityId) {
          return res.status(400).json({
            success: false,
            error: {
              type: "validation_error",
              message: "EntityType et EntityId requis pour l'invalidation par entité"
            }
          });
        }
        await contextCache.invalidateOnEntityChange(entityType, entityId, 'update');
        invalidatedCount = 1; // Estimation
        break;
    }

    res.status(200).json({
      success: true,
      data: {
        strategy,
        invalidatedCount,
        pattern,
        entityType,
        entityId,
        invalidatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error("[AI Routes] Erreur invalidation cache:", error);
    res.status(500).json({
      success: false,
      error: "Erreur lors de l'invalidation du cache"
    });
  }
});

/**
 * POST /api/ai/context-batch
 * Génère des contextes pour plusieurs entités en lot
 */
router.post("/context-batch", async (req, res) => {
  try {
    const batchSchema = z.object({
      entities: z.array(z.object({
        entityType: z.enum(['ao', 'offer', 'project', 'supplier', 'team', 'client']),
        entityId: z.string().min(1),
        requestType: z.enum(['full', 'summary', 'specific']).default('summary')
      })).max(10), // Limite à 10 entités par batch
      globalConfig: z.object({
        compressionLevel: z.enum(['none', 'light', 'medium', 'high']).default('light'),
        includeTypes: z.array(z.enum(['technique', 'metier', 'relationnel', 'temporel', 'administratif'])).default(['metier', 'relationnel'])
      }).optional()
    });

    const validationResult = batchSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: {
          type: "validation_error",
          message: "Configuration batch invalide",
          details: validationResult.error.issues
        }
      });
    }

    const { entities, globalConfig } = validationResult.data;
    const aiService = getAIService(storage as IStorage);
    const results = [];

    // Traitement en parallèle des entités (avec limite)
    const batchPromises = entities.map(async (entity) => {
      try {
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
      } catch (error) {
        return {
          entityType: entity.entityType,
          entityId: entity.entityId,
          success: false,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    });

    const batchResults = await Promise.all(batchPromises);
    const successCount = batchResults.filter(r => r.success).length;
    const totalTokens = batchResults.reduce((sum, r) => sum + (r.tokensEstimate || 0), 0);

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
      }
    });

  } catch (error) {
    console.error("[AI Routes] Erreur traitement batch:", error);
    res.status(500).json({
      success: false,
      error: "Erreur lors du traitement en lot"
    });
  }
});

export default router;