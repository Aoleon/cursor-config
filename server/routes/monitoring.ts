/**
 * Routes API pour le système de monitoring
 * Expose les métriques, erreurs et statut de santé
 */

import { Router, Request, Response } from 'express';
import { withErrorHandling } from './utils/error-handler';
import { logger } from '../utils/logger';
import { getErrorCollector } from '../monitoring/error-collector';
import { getAlertManager } from '../monitoring/alert-manager';
import { getMetricsAggregator } from '../monitoring/metrics-aggregator';
import { getNotifier } from '../monitoring/notifier';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { CircuitBreakerManager } from '../utils/circuit-breaker';
import { getCacheService } from '../services/CacheService';

const router = Router();

// Instances des services de monitoring
const errorCollector = getErrorCollector();
const alertManager = getAlertManager();
const metricsAggregator = getMetricsAggregator();
const notifier = getNotifier();
const circuitBreakerManager = CircuitBreakerManager.getInstance();

// ========================================
// MIDDLEWARE D'AUTHENTIFICATION
// ========================================

/**
 * Middleware pour vérifier l'authentification sur les routes de monitoring
 */
const requireAuth = (req: Request, res: Response, next: any) => {
  const user = (req as any).user || (req as any).session?.user;
  
  if (!user) {
    return res.status(401).json({
      error: 'Non authentifié',
      message: 'Authentification requise pour accéder aux métriques'
    });
  }
  
  // Seuls les admins peuvent voir les métriques détaillées
  if (user.role !== 'admin' && user.role !== 'super_admin') {
    return res.status(403).json({
      error: 'Non autorisé',
      message: 'Accès réservé aux administrateurs'
    });
  }
  
  next();
};

// ========================================
// HEALTH CHECK
// ========================================

/**
 * Endpoint de santé publique (sans auth)
 * GET /api/monitoring/health
 */
router.get('/health', async (req: Request, res: Response) => {
  return withErrorHandling(
    async () => {

    // Vérifier la base de données
    const dbStatus = await checkDatabase();
    
    // Vérifier les services externes
    const aiStatus = checkAIServices();
    
    // Récupérer le statut global
    const healthStatus = metricsAggregator.getHealthStatus();
    
    const health = {
      status: healthStatus.status,
      score: healthStatus.score,
      timestamp: new Date(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      checks: {
        database: dbStatus,
        aiServices: aiStatus,
        circuitBreakers: getCircuitBreakerStatus()
      },
      issues: healthStatus.issues
    };
    
    // Code de réponse selon le statut
    const statusCode = health.status === 'healthy' ? 200 :
                      health.status === 'degraded' ? 503 : 500;
    
    res.status(statusCode).json(health);
    
  
    },
    {
      operation: 'Router',
      service: 'monitoring',
      metadata: {}
    }
  ););
  }
});

// ========================================
// MÉTRIQUES
// ========================================

/**
 * Récupère les métriques agrégées
 * GET /api/monitoring/metrics
 */
router.get('/metrics', requireAuth, (req: Request, res: Response) => {
  return withErrorHandling(
    async () => {

    const metrics = metricsAggregator.aggregate();
    
    // Enregistrer l'accès aux métriques
    metricsAggregator.recordRequest('/api/monitoring/metrics', 'GET');
    
    res.json({
      success: true,
      timestamp: metrics.timestamp,
      current: metrics.current,
      errors: metrics.errors,
      performance: metrics.performance,
      business: metrics.business,
      system: metrics.system,
      trends: metrics.trends,
      alerts: metrics.alerts.map(alert => ({
        id: alert.id,
        name: alert.name,
        severity: alert.severity,
        status: alert.status,
        triggeredAt: alert.triggeredAt,
        message: alert.message
      }))
    });
    
  
    },
    {
      operation: 'Router',
      service: 'monitoring',
      metadata: {}
    }
  ););
  }
});

/**
 * Récupère les métriques d'une fenêtre temporelle
 * GET /api/monitoring/metrics/:window
 */
router.get('/metrics/:window', requireAuth, (req: Request, res: Response) => {
  const { window } = req.params;
  
  // Valider la fenêtre temporelle
  if (!['1min', '5min', '1hour', '24hours'].includes(window)) {
    return res.status(400).json({
      error: 'Fenêtre temporelle invalide',
      validWindows: ['1min', '5min', '1hour', '24hours']
    });
  }
  
  return withErrorHandling(
    async () => {

    const metrics = metricsAggregator.getWindowMetrics(window as any);
    res.json({
      success: true,
      ...metrics
    });
  
    },
    {
      operation: 'Router',
      service: 'monitoring',
      metadata: {}
    }
  ););
  }
});

/**
 * Récupère la timeline pour les graphiques
 * GET /api/monitoring/timeline
 */
router.get('/timeline', requireAuth, (req: Request, res: Response) => {
  const { window = '1hour' } = req.query;
  
  // Valider la fenêtre
  if (!['1hour', '6hours', '24hours'].includes(window as string)) {
    return res.status(400).json({
      error: 'Fenêtre invalide',
      validWindows: ['1hour', '6hours', '24hours']
    });
  }
  
  return withErrorHandling(
    async () => {

    const timeline = metricsAggregator.getTimeline(window as any);
    res.json({
      success: true,
      window,
      data: timeline
    });
  
    },
    {
      operation: 'Router',
      service: 'monitoring',
      metadata: {}
    }
  ););
  }
});

// ========================================
// ERREURS
// ========================================

/**
 * Récupère la liste des erreurs
 * GET /api/monitoring/errors
 */
router.get('/errors', requireAuth, (req: Request, res: Response) => {
  const { 
    category, 
    level, 
    limit = '100',
    since 
  } = req.query;
  
  return withErrorHandling(
    async () => {

    const options: any = {
      limit: parseInt(limit as string, 10)
    };
    
    if (category) options.category = category;
    if (level) options.level = level;
    if (since) options.since = new Date(since as string);
    
    const errors = errorCollector.getErrors(options);
    
    res.json({
      success: true,
      count: errors.length,
      errors: errors.map(err => ({
        id: err.id,
        timestamp: err.timestamp,
        level: err.level,
        category: err.category,
        message: err.message,
        errorCode: err.errorCode,
        fingerprint: err.fingerprint,
        count: err.count,
        context: err.context
      }))
    });
    
  
    },
    {
      operation: 'Router',
      service: 'monitoring',
      metadata: {}
    }
  ););
  }
});

/**
 * Récupère les détails d'une erreur avec stack trace
 * GET /api/monitoring/errors/:errorId
 */
router.get('/errors/:errorId', requireAuth, (req: Request, res: Response) => {
  const { errorId } = req.params;
  
  return withErrorHandling(
    async () => {

    const errors = errorCollector.getErrors({ limit: 1000 });
    const error = errors.find(e => e.id === errorId);
    
    if (!error) {
      return res.status(404).json({
        success: false,
        error: 'Erreur non trouvée'
      });
    }
    
    res.json({
      success: true,
      error: {
        ...error,
        stack: error.stack  // Inclure le stack trace complet
      }
    });
    
  
    },
    {
      operation: 'Router',
      service: 'monitoring',
      metadata: {}
    }
  ););
  }
});

// ========================================
// ALERTES
// ========================================

/**
 * Récupère les alertes actives
 * GET /api/monitoring/alerts
 */
router.get('/alerts', requireAuth, (req: Request, res: Response) => {
  return withErrorHandling(
    async () => {

    const alerts = alertManager.getActiveAlerts();
    
    res.json({
      success: true,
      count: alerts.length,
      alerts: alerts.map(alert => ({
        id: alert.id,
        ruleId: alert.ruleId,
        name: alert.name,
        severity: alert.severity,
        status: alert.status,
        triggeredAt: alert.triggeredAt,
        acknowledgedAt: alert.acknowledgedAt,
        acknowledgedBy: alert.acknowledgedBy,
        message: alert.message,
        notificationsSent: alert.notificationsSent,
        lastNotificationAt: alert.lastNotificationAt,
        details: alert.details
      }))
    });
    
  
    },
    {
      operation: 'Router',
      service: 'monitoring',
      metadata: {}
    }
  ););
  }
});

/**
 * Récupère l'historique des alertes
 * GET /api/monitoring/alerts/history
 */
router.get('/alerts/history', requireAuth, (req: Request, res: Response) => {
  const { severity, limit = '100', since } = req.query;
  
  return withErrorHandling(
    async () => {

    const options: any = {
      limit: parseInt(limit as string, 10)
    };
    
    if (severity) options.severity = severity;
    if (since) options.since = new Date(since as string);
    
    const history = alertManager.getAlertHistory(options);
    
    res.json({
      success: true,
      count: history.length,
      alerts: history
    });
    
  
    },
    {
      operation: 'Router',
      service: 'monitoring',
      metadata: {}
    }
  ););
  }
});

/**
 * Reconnaît une alerte (acknowledge)
 * POST /api/monitoring/alerts/:alertId/acknowledge
 */
router.post('/alerts/:alertId/acknowledge', requireAuth, (req: Request, res: Response) => {
  const { alertId } = req.params;
  const user = (req as any).user || (req as any).session?.user;
  
  return withErrorHandling(
    async () => {

    const success = alertManager.acknowledgeAlert(alertId, user.id || user.email);
    
    if (success) {
      res.json({
        success: true,
        message: 'Alerte reconnue avec succès'
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Alerte non trouvée ou déjà résolue'
      });
    }
    
  
    },
    {
      operation: 'Router',
      service: 'monitoring',
      metadata: {}
    }
  ););
  }
});

/**
 * Récupère les règles d'alerte configurées
 * GET /api/monitoring/alerts/rules
 */
router.get('/alerts/rules', requireAuth, (req: Request, res: Response) => {
  return withErrorHandling(
    async () => {

    const rules = alertManager.getRules();
    
    res.json({
      success: true,
      count: rules.length,
      rules: rules.map(rule => ({
        id: rule.id,
        name: rule.name,
        description: rule.description,
        severity: rule.severity,
        cooldown: rule.cooldown,
        action: rule.action,
        enabled: rule.enabled,
        metadata: rule.metadata
      }))
    });
    
  
    },
    {
      operation: 'Router',
      service: 'monitoring',
      metadata: {}
    }
  ););
  }
});

/**
 * Active/désactive une règle d'alerte
 * PUT /api/monitoring/alerts/rules/:ruleId
 */
router.put('/alerts/rules/:ruleId', requireAuth, (req: Request, res: Response) => {
  const { ruleId } = req.params;
  const { enabled } = req.body;
  
  if (typeof enabled !== 'boolean') {
    return res.status(400).json({
      success: false,
      error: 'Le champ "enabled" doit être un booléen'
    });
  }
  
  return withErrorHandling(
    async () => {

    const success = alertManager.setRuleEnabled(ruleId, enabled);
    
    if (success) {
      res.json({
        success: true,
        message: `Règle ${enabled ? 'activée' : 'désactivée'} avec succès`
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Règle non trouvée'
      });
    }
    
  
    },
    {
      operation: 'Router',
      service: 'monitoring',
      metadata: {}
    }
  ););
  }
});

// ========================================
// TESTS ET SIMULATIONS
// ========================================

/**
 * Teste les notifications (admin uniquement)
 * POST /api/monitoring/test/notifications
 */
router.post('/test/notifications', requireAuth, async (req: Request, res: Response) => {
  return withErrorHandling(
    async () => {

    const results = await notifier.testNotifications();
    
    res.json({
      success: true,
      message: 'Tests de notification effectués',
      results
    });
    
  
    },
    {
      operation: 'Router',
      service: 'monitoring',
      metadata: {}
    }
  ););
  }
});

/**
 * Simule une erreur pour tester le monitoring
 * POST /api/monitoring/test/error
 */
router.post('/test/error', requireAuth, (req: Request, res: Response) => {
  const { 
    level = 'error', 
    category = 'system',
    message = 'Test error from monitoring dashboard'
  } = req.body;
  
  return withErrorHandling(
    async () => {

    // Créer une erreur de test
    const testError = new Error(message);
    (testError as any).code = 'TEST_ERROR';
    
    // Capturer l'erreur
    const event = errorCollector.capture(testError, {
      endpoint: '/api/monitoring/test/error',
      method: 'POST',
      userId: (req as any).user?.id,
      test: true
    });
    
    // Forcer le niveau et la catégorie pour le test
    (event as any).level = level;
    (event as any).category = category;
    
    res.json({
      success: true,
      message: 'Erreur de test générée',
      error: {
        id: event.id,
        level: event.level,
        category: event.category,
        message: event.message
      }
    });
    
  
    },
    {
      operation: 'Router',
      service: 'monitoring',
      metadata: {}
    }
  ););
  }
});

/**
 * Réinitialise les métriques (admin uniquement)
 * POST /api/monitoring/reset
 */
router.post('/reset', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user || (req as any).session?.user;
  
  // Super admin uniquement
  if (user.role !== 'super_admin') {
    return res.status(403).json({
      success: false,
      error: 'Action réservée aux super administrateurs'
    });
  }
  
  return withErrorHandling(
    async () => {

    metricsAggregator.reset();
    errorCollector.reset();
    alertManager.reset();
    
    logger.warn('Métriques de monitoring réinitialisées', {
      metadata: {
        service: 'Monitoring',
        resetBy: user.id || user.email
      }
    });
    
    res.json({
      success: true,
      message: 'Métriques réinitialisées avec succès'
    });
    
  
    },
    {
      operation: 'Router',
      service: 'monitoring',
      metadata: {}
    }
  ););
  }
});

// ========================================
// HELPERS
// ========================================

/**
 * Vérifie le statut de la base de données
 */
async function checkDatabase(): Promise<{
  status: 'healthy' | 'degraded' | 'down';
  responseTime?: number;
  error?: string;
}> {
  const start = Date.now();
  
  return withErrorHandling(
    async () => {

    // Simple requête pour vérifier la connexion
    await db.execute(sql`SELECT 1`);
    
    const responseTime = Date.now() - start;
    
    return {
      status: responseTime < 100 ? 'healthy' : 'degraded',
      responseTime
    };
  
    },
    {
      operation: 'Router',
      service: 'monitoring',
      metadata: {}
    }
  );;
  }
}

/**
 * Vérifie le statut des services IA
 */
function checkAIServices(): {
  status: 'healthy' | 'degraded' | 'down';
  providers: {
    anthropic: boolean;
    openai: boolean;
  };
} {
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  
  return {
    status: hasAnthropic || hasOpenAI ? 'healthy' : 'down',
    providers: {
      anthropic: hasAnthropic,
      openai: hasOpenAI
    }
  };
}

/**
 * Récupère le statut des circuit breakers
 */
function getCircuitBreakerStatus(): {
  total: number;
  open: number;
  halfOpen: number;
  closed: number;
  details: Array<{
    name: string;
    state: string;
    failures: number;
  }>;
} {
  const statuses = circuitBreakerManager.getAllStatuses();
  
  return {
    total: statuses.length,
    open: statuses.filter(s => s.state === 'open').length,
    halfOpen: statuses.filter(s => s.state === 'half-open').length,
    closed: statuses.filter(s => s.state === 'closed').length,
    details: statuses
  };
}

// ========================================
// CACHE MONITORING
// ========================================

/**
 * Récupère les statistiques du cache
 * GET /api/monitoring/cache
 */
router.get('/cache', requireAuth, async (req: Request, res: Response) => {
  return withErrorHandling(
    async () => {

    const cacheService = getCacheService();
    const stats = await cacheService.getStats();
    
    logger.info('Cache stats récupérées', {
      metadata: {
        route: '/api/monitoring/cache',
        method: 'GET',
        userId: (req as any).user?.id
      }
    });
    
    res.json({
      success: true,
      timestamp: new Date(),
      cache: {
        hits: stats.hits,
        misses: stats.misses,
        hitRate: stats.hitRate,
        size: stats.size,
        totalKeys: stats.keys.length,
        keys: stats.keys
      }
    });
  
    },
    {
      operation: 'Router',
      service: 'monitoring',
      metadata: {}
    }
  ););
  }
});

// ========================================
// LOGS MONITORING WITH CORRELATION ID - PHASE 4
// ========================================

/**
 * Endpoint pour récupérer et filtrer les logs par correlation ID
 * GET /api/monitoring/logs?correlationId=xxx&level=error&limit=100
 */
router.get('/logs', requireAuth, async (req: Request, res: Response) => {
  return withErrorHandling(
    async () => {

    const { correlationId, level, limit = '100' } = req.query;
    
    logger.info('Requête de logs avec filtres', {
      metadata: {
        route: '/api/monitoring/logs',
        method: 'GET',
        userId: (req as any).user?.id,
        filters: { correlationId, level, limit }
      }
    });
    
    // Note: Dans une implémentation complète, les logs seraient stockés dans une base de données
    // ou un système de log aggregation (Elasticsearch, Datadog, etc.) qui permettrait
    // de faire des requêtes filtrées. Pour l'instant, on retourne des informations
    // sur le système de correlation ID et comment l'utiliser.
    
    res.json({
      success: true,
      timestamp: new Date(),
      documentation: {
        message: 'Le système de correlation ID est activé',
        usage: {
          description: 'Tous les logs incluent maintenant un correlation ID automatiquement',
          headerName: 'X-Correlation-ID',
          example: 'Les requêtes HTTP incluent un header X-Correlation-ID dans la réponse',
          filtering: {
            byCorrelationId: `GET /api/monitoring/logs?correlationId=${correlationId || 'abc-123-def'}`,
            byLevel: `GET /api/monitoring/logs?level=${level || 'error'}`,
            combined: `GET /api/monitoring/logs?correlationId=${correlationId || 'abc-123-def'}&level=${level || 'error'}&limit=${limit}`
          }
        },
        implementation: {
          middleware: 'Correlation middleware actif - génère ou extrait UUID depuis headers',
          logger: 'Logger enrichi automatiquement avec correlation ID depuis AsyncLocalStorage',
          externalAPIs: 'Propagation vers Monday.com, Claude AI, OpenAI avec header X-Correlation-ID',
          retrySystem: 'Retry logs incluent correlation ID pour traçabilité complète',
          nonHTTP: 'Contextes non-HTTP (startup, cron) gèrent leurs propres correlation IDs'
        }
      },
      filters: {
        correlationId: correlationId || null,
        level: level || null,
        limit: parseInt(limit as string)
      },
      note: 'Pour une implémentation complète avec stockage de logs, intégrer un système de log aggregation comme Elasticsearch, Datadog, ou CloudWatch'
    });
    
  
    },
    {
      operation: 'Router',
      service: 'monitoring',
      metadata: {}
    }
  ););
  }
});

// Démarrer le gestionnaire d'alertes au démarrage
alertManager.start();

// Configurer les handlers de notification
alertManager.registerNotificationHandler('email', async (alert) => {
  await notifier.sendEmail(alert);
});

alertManager.registerNotificationHandler('slack', async (alert) => {
  await notifier.sendToSlack(alert);
});

alertManager.registerNotificationHandler('log', async (alert) => {
  notifier.logAlert(alert);
});

export default router;