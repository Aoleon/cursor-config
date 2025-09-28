import { Router } from "express";
import { z } from "zod";
import { getAIService } from "../services/AIService";
import { storage } from "../storage";
import { aiQueryRequestSchema } from "@shared/schema";
import type { AiQueryRequest } from "@shared/schema";
import type { IStorage } from "../storage-poc";

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

export default router;