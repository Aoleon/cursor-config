/**
 * Analytics Module Routes
 * 
 * This module handles all analytics-related routes including:
 * - KPIs and metrics
 * - Business dashboards
 * - Predictive analytics
 * - Reporting and export
 * - Real-time analytics
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import { isAuthenticated } from '../../replitAuth';
import { asyncHandler } from '../../middleware/errorHandler';
import { validateBody, validateParams, validateQuery, commonParamSchemas } from '../../middleware/validation';
import { rateLimits } from '../../middleware/security';
import { sendSuccess, sendPaginatedSuccess, createError } from '../../middleware/errorHandler';
import { ValidationError, NotFoundError } from '../../utils/error-handler';
import { logger } from '../../utils/logger';
import type { IStorage } from '../../storage-poc';
// storageFacade import removed - using injected storage parameter
import type { EventBus } from '../../eventBus';
import { z } from 'zod';
import {
  analyticsFiltersSchema,
  snapshotRequestSchema,
  metricQuerySchema,
  benchmarkQuerySchema,
  insertAlertThresholdSchema,
  updateAlertThresholdSchema,
  alertsQuerySchema,
  insertMetricsBusinessSchema
} from '@shared/schema';
import { getBusinessAnalyticsService } from '../../services/consolidated/BusinessAnalyticsService';
import { PredictiveEngineService } from '../../services/PredictiveEngineService';
import { getTechnicalMetricsService } from '../../services/consolidated/TechnicalMetricsService';
import { getCacheService, TTL_CONFIG } from '../../services/CacheService';
import type {
  AnalyticsFiltersRequest,
  AnalyticsQueryParams,
  KPIDashboard,
  BusinessMetrics,
  DashboardStats,
  PipelineAnalytics,
  PredictiveRevenue,
  PredictiveRisk,
  PredictiveRecommendation,
  AnalyticsSnapshot,
  Benchmark,
  ExportRequest,
  RealtimeMetric,
  Bottleneck
} from './types';

// Validation schemas
const analyticsQuerySchema = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  granularity: z.enum(['hour', 'day', 'week', 'month', 'quarter', 'year']).optional(),
  groupBy: z.string().optional(),
  metrics: z.string().optional(),
  limit: z.coerce.number().min(1).max(1000).optional().default(100),
  offset: z.coerce.number().min(0).optional().default(0)
});

const exportRequestSchema = z.object({
  format: z.enum(['csv', 'excel', 'pdf', 'json']).default('json'),
  type: z.enum(['kpis', 'metrics', 'dashboard', 'report']).default('kpis'),
  includeCharts: z.boolean().optional().default(false),
  template: z.string().optional()
});

const businessContextSchema = z.object({
  focus_areas: z.string().optional().transform((str) => str ? str.split(',') : ['revenue', 'cost', 'planning']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  department_filter: z.string().optional()
});

export function createAnalyticsRouter(storage: IStorage, eventBus: EventBus): Router {
  const router = Router();
  
  // Initialize services
  const analyticsService = getBusinessAnalyticsService(storage, eventBus);
  const predictiveService = new PredictiveEngineService(storage);
  const performanceService = getTechnicalMetricsService(storage);

  // ========================================
  // KPI ROUTES
  // ========================================

  // Get real-time KPIs
  router.get('/api/analytics/kpis',
    isAuthenticated,
    validateQuery(analyticsFiltersSchema.optional()),
    asyncHandler(async (req: any, res: Response) => {
      const filters: AnalyticsFiltersRequest = req.query;
      const cacheService = getCacheService();
      const cacheKey = cacheService.buildKey('analytics', 'kpis', { userId: req.user?.id, filters });
      
      const cached = await cacheService.get<any>(cacheKey);
      if (cached) {
        logger.debug('[Analytics] KPIs récupérés depuis cache', {
          metadata: {
            route: '/api/analytics/kpis',
            cacheHit: true,
            userId: req.user?.id
          }
        });
        return sendSuccess(res, cached);
      }
      
      logger.info('[Analytics] Récupération KPIs', {
        metadata: {
          route: '/api/analytics/kpis',
          method: 'GET',
          filters,
          userId: req.user?.id
        }
      });

      const kpis = await analyticsService.getRealtimeKPIs(filters);
      
      const dashboard = {
        kpis,
        lastUpdated: new Date(),
        period: {
          start: filters?.dateFrom ? new Date(filters.dateFrom) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          end: filters?.dateTo ? new Date(filters.dateTo) : new Date()
        },
        filters
      };

      await cacheService.set(cacheKey, dashboard, TTL_CONFIG.ANALYTICS_KPI);

      sendSuccess(res, dashboard);
    })
  );

  // ========================================
  // METRICS ROUTES
  // ========================================

  // Get business metrics
  router.get('/api/analytics/metrics',
    isAuthenticated,
    validateQuery(metricQuerySchema.optional()),
    asyncHandler(async (req: any, res: Response) => {
      const params: AnalyticsQueryParams = req.query;
      const cacheService = getCacheService();
      const cacheKey = cacheService.buildKey('analytics', 'metrics', { userId: req.user?.id, params });
      
      const cached = await cacheService.get<{ metrics: any }>(cacheKey);
      if (cached) {
        logger.debug('[Analytics] Métriques récupérées depuis cache', {
          metadata: {
            route: '/api/analytics/metrics',
            cacheHit: true,
            userId: req.user?.id
          }
        });
        return sendSuccess(res, cached);
      }
      
      logger.info('[Analytics] Récupération métriques business', {
        metadata: {
          route: '/api/analytics/metrics',
          method: 'GET',
          params,
          userId: req.user?.id
        }
      });

      const metrics = await analyticsService.getBusinessMetrics({
        ...params,
        groupBy: params.groupBy ? params.groupBy : [],
        metrics: params.metrics ? params.metrics : []
      });

      const response = { metrics };
      await cacheService.set(cacheKey, response, TTL_CONFIG.ANALYTICS_METRICS);

      sendSuccess(res, response);
    })
  );

  // ========================================
  // DASHBOARD ROUTES
  // ========================================

  // Get dashboard stats
  router.get('/api/dashboard/stats',
    isAuthenticated,
    asyncHandler(async (req: any, res: Response) => {
      logger.info('[Analytics] Récupération stats dashboard', {
        metadata: {
          route: '/api/dashboard/stats',
          method: 'GET',
          userId: req.user?.id
        }
      });

      const stats = await analyticsService.getDashboardStats();
      sendSuccess(res, stats);
    })
  );

  // Get dashboard KPIs
  router.get('/api/dashboard/kpis',
    isAuthenticated,
    asyncHandler(async (req: any, res: Response) => {
      logger.info('[Analytics] Récupération KPIs dashboard', {
        metadata: {
          route: '/api/dashboard/kpis',
          method: 'GET',
          userId: req.user?.id
        }
      });

      const kpis = await analyticsService.getDashboardKPIs();
      sendSuccess(res, kpis);
    })
  );

  // ========================================
  // PIPELINE ANALYTICS ROUTES
  // ========================================

  // Get pipeline analytics
  router.get('/api/analytics/pipeline',
    isAuthenticated,
    validateQuery(analyticsFiltersSchema.optional()),
    asyncHandler(async (req: any, res: Response) => {
      const filters: AnalyticsFiltersRequest = req.query;
      
      logger.info('[Analytics] Récupération analytics pipeline', {
        metadata: {
          route: '/api/analytics/pipeline',
          method: 'GET',
          filters,
          userId: req.user?.id
        }
      });

      const pipeline = await analyticsService.getPipelineAnalytics(filters);
      sendSuccess(res, pipeline);
    })
  );

  // ========================================
  // PREDICTIVE ANALYTICS ROUTES
  // ========================================

  // Get revenue predictions
  router.get('/api/predictive/revenue',
    isAuthenticated,
    validateQuery(analyticsQuerySchema),
    asyncHandler(async (req: any, res: Response) => {
      const params: AnalyticsQueryParams = req.query;
      
      logger.info('[Analytics] Récupération prédictions revenus', {
        metadata: {
          route: '/api/predictive/revenue',
          method: 'GET',
          params,
          userId: req.user?.id
        }
      });

      const forecast = await predictiveService.forecastRevenue(params);
      sendSuccess(res, forecast);
    })
  );

  // Get risk predictions
  router.get('/api/predictive/risks',
    isAuthenticated,
    validateQuery(z.object({
      projectId: z.string().uuid().optional(),
      threshold: z.coerce.number().min(0).max(100).optional()
    })),
    asyncHandler(async (req: any, res: Response) => {
      const { projectId, threshold } = req.query;
      
      logger.info('[Analytics] Récupération prédictions risques', {
        metadata: {
          route: '/api/predictive/risks',
          method: 'GET',
          projectId,
          threshold,
          userId: req.user?.id
        }
      });

      const risks = await predictiveService.analyzeRisks({
        projectId,
        threshold: threshold ? parseFloat(threshold) : 50
      });

      sendSuccess(res, risks);
    })
  );

  // Get AI recommendations
  router.get('/api/predictive/recommendations',
    isAuthenticated,
    validateQuery(businessContextSchema.optional()),
    asyncHandler(async (req: any, res: Response) => {
      const context = req.query;
      
      logger.info('[Analytics] Récupération recommandations IA', {
        metadata: {
          route: '/api/predictive/recommendations',
          method: 'GET',
          context,
          userId: req.user?.id
        }
      });

      const recommendations = await predictiveService.generateRecommendations(context);
      sendSuccess(res, recommendations);
    })
  );

  // ========================================
  // SNAPSHOT ROUTES
  // ========================================

  // Get analytics snapshots
  router.get('/api/analytics/snapshots',
    isAuthenticated,
    validateQuery(z.object({
      type: z.enum(['revenue', 'risks', 'recommendations', 'full']).optional(),
      limit: z.coerce.number().min(1).max(50).optional().default(10),
      offset: z.coerce.number().min(0).optional().default(0)
    })),
    asyncHandler(async (req: any, res: Response) => {
      const { type, limit, offset } = req.query;
      
      logger.info('[Analytics] Récupération snapshots', {
        metadata: {
          route: '/api/analytics/snapshots',
          method: 'GET',
          type,
          limit,
          offset,
          userId: req.user?.id
        }
      });

      const snapshots = await storage.getAnalyticsSnapshots({
        type,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      sendPaginatedSuccess(res, snapshots.data, snapshots.total);
    })
  );

  // Save analytics snapshot
  router.post('/api/analytics/snapshot',
    isAuthenticated,
    validateBody(snapshotRequestSchema),
    asyncHandler(async (req: any, res: Response) => {
      const snapshotData = req.body;
      
      logger.info('[Analytics] Sauvegarde snapshot', {
        metadata: {
          route: '/api/analytics/snapshot',
          method: 'POST',
          type: snapshotData.forecast_type,
          userId: req.user?.id
        }
      });

      const snapshot = await storage.createAnalyticsSnapshot({
        ...snapshotData,
        createdBy: req.user?.id
      });

      eventBus.emit('analytics:snapshot:created', {
        snapshotId: snapshot.id,
        type: snapshot.type,
        userId: req.user?.id
      });

      sendSuccess(res, snapshot, 201);
    })
  );

  // Save predictive snapshot
  router.post('/api/predictive/snapshots',
    isAuthenticated,
    validateBody(snapshotRequestSchema),
    asyncHandler(async (req: any, res: Response) => {
      const { forecast_type, data, params, notes } = req.body;
      
      logger.info('[Analytics] Sauvegarde snapshot prédictif', {
        metadata: {
          route: '/api/predictive/snapshots',
          method: 'POST',
          type: forecast_type,
          userId: req.user?.id
        }
      });

      const snapshot = await predictiveService.saveSnapshot({
        type: forecast_type,
        data,
        params,
        notes,
        createdBy: req.user?.id
      });

      sendSuccess(res, snapshot, 201);
    })
  );

  // Get predictive snapshots
  router.get('/api/predictive/snapshots',
    isAuthenticated,
    validateQuery(z.object({
      type: z.enum(['revenue', 'risks', 'recommendations']).optional(),
      limit: z.coerce.number().min(1).max(50).optional().default(10),
      offset: z.coerce.number().min(0).optional().default(0)
    })),
    asyncHandler(async (req: any, res: Response) => {
      const { type, limit, offset } = req.query;
      
      logger.info('[Analytics] Récupération snapshots prédictifs', {
        metadata: {
          route: '/api/predictive/snapshots',
          method: 'GET',
          type,
          userId: req.user?.id
        }
      });

      const snapshots = await predictiveService.getSnapshots({
        type,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      sendPaginatedSuccess(res, snapshots.data, snapshots.total);
    })
  );

  // ========================================
  // BENCHMARK ROUTES
  // ========================================

  // Get benchmarks
  router.get('/api/analytics/benchmarks',
    isAuthenticated,
    validateQuery(benchmarkQuerySchema.optional()),
    asyncHandler(async (req: any, res: Response) => {
      const params = req.query;
      
      logger.info('[Analytics] Récupération benchmarks', {
        metadata: {
          route: '/api/analytics/benchmarks',
          method: 'GET',
          params,
          userId: req.user?.id
        }
      });

      const benchmarks = await analyticsService.getBenchmarks(params);
      sendSuccess(res, benchmarks);
    })
  );

  // ========================================
  // REAL-TIME ANALYTICS ROUTES
  // ========================================

  // Get real-time metrics
  router.get('/api/analytics/realtime',
    isAuthenticated,
    asyncHandler(async (req: any, res: Response) => {
      const cacheService = getCacheService();
      const cacheKey = cacheService.buildKey('analytics', 'realtime', { userId: req.user?.id });
      
      const cached = await cacheService.get<any>(cacheKey);
      if (cached) {
        logger.debug('[Analytics] Métriques temps réel récupérées depuis cache', {
          metadata: {
            route: '/api/analytics/realtime',
            cacheHit: true,
            userId: req.user?.id
          }
        });
        return sendSuccess(res, cached);
      }

      logger.info('[Analytics] Récupération métriques temps réel', {
        metadata: {
          route: '/api/analytics/realtime',
          method: 'GET',
          userId: req.user?.id
        }
      });

      const metrics = await analyticsService.getRealtimeMetrics();
      await cacheService.set(cacheKey, metrics, TTL_CONFIG.ANALYTICS_REALTIME);

      sendSuccess(res, metrics);
    })
  );

  // ========================================
  // ALERTS ROUTES
  // ========================================

  // Get business alerts
  router.get('/api/analytics/alerts',
    isAuthenticated,
    validateQuery(alertsQuerySchema.optional()),
    asyncHandler(async (req: any, res: Response) => {
      const query = req.query;
      
      logger.info('[Analytics] Récupération alertes business', {
        metadata: {
          route: '/api/analytics/alerts',
          method: 'GET',
          query,
          userId: req.user?.id
        }
      });

      const alerts = await storage.getBusinessAlerts(query);
      sendSuccess(res, alerts);
    })
  );

  // Create alert threshold
  router.post('/api/analytics/alerts/thresholds',
    isAuthenticated,
    validateBody(insertAlertThresholdSchema),
    asyncHandler(async (req: any, res: Response) => {
      logger.info('[Analytics] Création seuil alerte', {
        metadata: {
          route: '/api/analytics/alerts/thresholds',
          method: 'POST',
          metric: req.body.metric,
          threshold: req.body.threshold,
          userId: req.user?.id
        }
      });

      const threshold = await storage.createAlertThreshold({
        ...req.body,
        createdBy: req.user?.id
      });

      sendSuccess(res, threshold, 201);
    })
  );

  // Update alert threshold
  router.patch('/api/analytics/alerts/thresholds/:id',
    isAuthenticated,
    validateBody(updateAlertThresholdSchema),
    asyncHandler(async (req: any, res: Response) => {
      const { id } = req.params;
      
      logger.info('[Analytics] Mise à jour seuil alerte', {
        metadata: {
          route: '/api/analytics/alerts/thresholds/:id',
          method: 'PATCH',
          thresholdId: id,
          userId: req.user?.id
        }
      });

      const threshold = await storage.updateAlertThreshold(id, req.body);
      sendSuccess(res, threshold);
    })
  );

  // ========================================
  // BOTTLENECK ANALYSIS ROUTES
  // ========================================

  // Get bottlenecks
  router.get('/api/analytics/bottlenecks',
    isAuthenticated,
    asyncHandler(async (req: any, res: Response) => {
      logger.info('[Analytics] Récupération goulots étranglement', {
        metadata: {
          route: '/api/analytics/bottlenecks',
          method: 'GET',
          userId: req.user?.id
        }
      });

      const bottlenecks = await analyticsService.analyzeBottlenecks();
      sendSuccess(res, bottlenecks);
    })
  );

  // ========================================
  // EXPORT ROUTES
  // ========================================

  // Export analytics data
  router.post('/api/analytics/export',
    isAuthenticated,
    rateLimits.processing,
    validateBody(exportRequestSchema),
    asyncHandler(async (req: any, res: Response) => {
      const exportRequest: ExportRequest = req.body;
      
      logger.info('[Analytics] Export données analytics', {
        metadata: {
          route: '/api/analytics/export',
          method: 'POST',
          format: exportRequest.format,
          type: exportRequest.type,
          userId: req.user?.id
        }
      });

      const result = await analyticsService.exportData(exportRequest);
      
      res.setHeader('Content-Type', result.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.setHeader('Content-Length', result.size.toString());
      
      if (exportRequest.format === 'json') {
        res.json(result.data);
      } else {
        res.send(result.data);
      }
    })
  );

  // ========================================
  // AI PERFORMANCE ROUTES
  // ========================================

  // GET /api/ai-performance/pipeline-metrics - Métriques détaillées pipeline IA
  router.get('/api/ai-performance/pipeline-metrics',
    isAuthenticated,
    validateQuery(z.object({
      timeRange: z.object({
        startDate: z.string().datetime(),
        endDate: z.string().datetime()
      }).optional(),
      complexity: z.enum(['simple', 'complex', 'expert']).optional(),
      userId: z.string().optional(),
      includeP95P99: z.string().default('true').transform(val => val === 'true' || val === '1')
    }).optional()),
    asyncHandler(async (req: any, res: Response) => {
      try {
        const query = req.query || {};
        const timeRange = query.timeRange as { startDate: string; endDate: string } | undefined;
        const complexity = query.complexity as 'simple' | 'complex' | 'expert' | undefined;
        const userId = query.userId as string | undefined;
        const includeP95P99 = query.includeP95P99 === 'true' || query.includeP95P99 === true;
        
        logger.info('Récupération métriques pipeline avec filtres', {
          metadata: { 
            route: '/api/ai-performance/pipeline-metrics',
            method: 'GET',
            filters: req.query,
            userId: req.user?.id
          }
        });
        
        const metrics = await performanceService.getPipelineMetrics({
          timeRange,
          complexity,
          userId,
          includePercentiles: includeP95P99
        });
        
        sendSuccess(res, {
          ...metrics,
          metadata: {
            calculatedAt: new Date(),
            filtersApplied: Object.keys(req.query || {}).length
          }
        });
        
      } catch (error) {
        logger.error('Erreur pipeline metrics', {
          metadata: { 
            route: '/api/ai-performance/pipeline-metrics',
            error: error instanceof Error ? error.message : String(error),
            userId: req.user?.id
          }
        });
        throw createError.database('Erreur lors de la récupération des métriques pipeline');
      }
    })
  );

  // GET /api/ai-performance/cache-analytics - Analytics cache hit/miss par complexité
  router.get('/api/ai-performance/cache-analytics', 
    isAuthenticated,
    validateQuery(z.object({
      timeRange: z.object({
        startDate: z.string().datetime(),
        endDate: z.string().datetime()
      }).optional(),
      breakdown: z.enum(['complexity', 'user', 'time']).default('complexity')
    }).optional()),
    asyncHandler(async (req: any, res: Response) => {
      try {
        const query = req.query || {};
        const timeRange = query.timeRange as { startDate: string; endDate: string } | undefined;
        const breakdown = (query.breakdown as 'complexity' | 'user' | 'time') || 'complexity';
        
        logger.info('Analytics cache avec breakdown', {
          metadata: { 
            route: '/api/ai-performance/cache-analytics',
            method: 'GET',
            breakdown,
            userId: req.user?.id
          }
        });
        
        const cacheAnalytics = await performanceService.getCacheAnalytics({
          timeRange,
          breakdown
        });
        
        sendSuccess(res, {
          ...cacheAnalytics,
          metadata: {
            breakdown,
            calculatedAt: new Date()
          }
        });
        
      } catch (error) {
        logger.error('Erreur cache analytics', {
          metadata: { 
            route: '/api/ai-performance/cache-analytics',
            error: error instanceof Error ? error.message : String(error),
            userId: req.user?.id
          }
        });
        throw createError.database('Erreur lors de l\'analyse des métriques cache');
      }
    })
  );

  // GET /api/ai-performance/slo-compliance - Conformité SLO et alertes
  router.get('/api/ai-performance/slo-compliance',
    isAuthenticated,
    validateQuery(z.object({
      timeRange: z.object({
        startDate: z.string().datetime(),
        endDate: z.string().datetime()
      }).optional(),
      includeTrends: z.string().default('true').transform(val => val === 'true' || val === '1'),
      includeAlerts: z.string().default('true').transform(val => val === 'true' || val === '1')
    }).optional()),
    asyncHandler(async (req: any, res: Response) => {
      try {
        const query = req.query || {};
        const timeRange = query.timeRange as { startDate: string; endDate: string } | undefined;
        const includeTrends = query.includeTrends === 'true' || query.includeTrends === true;
        const includeAlerts = query.includeAlerts === 'true' || query.includeAlerts === true;
        
        logger.info('SLO compliance check', {
          metadata: {
            route: '/api/ai-performance/slo-compliance',
            method: 'GET',
            userId: req.user?.id
          }
        });
        
        const sloMetrics = await performanceService.getSLOCompliance({
          timeRange,
          includeTrends,
          includeAlerts
        });
        
        sendSuccess(res, {
          ...sloMetrics,
          sloTargets: {
            simple: '5s',
            complex: '10s',
            expert: '15s'
          },
          calculatedAt: new Date()
        });
        
      } catch (error) {
        logger.error('Erreur SLO compliance', {
          metadata: { 
            route: '/api/ai-performance/slo-compliance',
            error: error instanceof Error ? error.message : String(error),
            userId: req.user?.id
          }
        });
        throw createError.database('Erreur lors de la vérification de conformité SLO');
      }
    })
  );

  // GET /api/ai-performance/bottlenecks - Identification goulots d'étranglement
  router.get('/api/ai-performance/bottlenecks',
    isAuthenticated,
    validateQuery(z.object({
      timeRange: z.object({
        startDate: z.string().datetime(),
        endDate: z.string().datetime()
      }).optional(),
      threshold: z.coerce.number().min(0.1).max(10).default(2.0)
    }).optional()),
    asyncHandler(async (req: any, res: Response) => {
      try {
        const query = req.query || {};
        const timeRange = query.timeRange as { startDate: string; endDate: string } | undefined;
        const threshold = typeof query.threshold === 'string' ? parseFloat(query.threshold) : (query.threshold as number) || 2.0;
        
        logger.info('Analyse goulots avec seuil', {
          metadata: { 
            route: '/api/ai-performance/bottlenecks',
            method: 'GET',
            threshold,
            userId: req.user?.id
          }
        });
        
        const bottlenecks = await performanceService.identifyBottlenecks({
          timeRange,
          thresholdSeconds: threshold
        });
        
        sendSuccess(res, {
          ...bottlenecks,
          thresholdUsed: threshold,
          analysisDate: new Date()
        });
        
      } catch (error) {
        logger.error('Erreur bottlenecks analysis', {
          metadata: { 
            route: '/api/ai-performance/bottlenecks',
            error: error instanceof Error ? error.message : String(error),
            userId: req.user?.id
          }
        });
        throw createError.database('Erreur lors de l\'identification des goulots d\'étranglement');
      }
    })
  );

  // GET /api/ai-performance/real-time-stats - Statistiques temps réel
  router.get('/api/ai-performance/real-time-stats',
    isAuthenticated,
    asyncHandler(async (req: any, res: Response) => {
      try {
        logger.info('Stats temps réel', {
          metadata: {
            route: '/api/ai-performance/real-time-stats',
            method: 'GET',
            userId: req.user?.id
          }
        });
        
        const realtimeStats = await performanceService.getRealTimeStats();
        
        sendSuccess(res, {
          ...realtimeStats,
          timestamp: new Date(),
          refreshInterval: 30
        });
        
      } catch (error) {
        logger.error('Erreur real-time stats', {
          metadata: { 
            route: '/api/ai-performance/real-time-stats',
            error: error instanceof Error ? error.message : String(error),
            userId: req.user?.id
          }
        });
        throw createError.database('Erreur lors de la récupération des statistiques temps réel');
      }
    })
  );

  // ========================================
  // BUSINESS METRICS ROUTES
  // ========================================

  // GET /api/metrics-business - Liste des métriques business avec filtres
  router.get('/api/metrics-business',
    isAuthenticated,
    rateLimits.general,
    asyncHandler(async (req: any, res: Response) => {
      try {
        const { entity_type, entity_id } = req.query;
        
        logger.info('Récupération métriques business', {
          metadata: {
            route: '/api/metrics-business',
            method: 'GET',
            entity_type,
            entity_id,
            userId: req.user?.id
          }
        });
        
        const metrics = await storage.getMetricsBusiness(entity_type, entity_id);
        sendSuccess(res, metrics);
      } catch (error) {
        logger.error('Erreur getMetricsBusiness', {
          metadata: { 
            route: '/api/metrics-business',
            method: 'GET',
            error: error instanceof Error ? error.message : String(error),
            userId: req.user?.id
          }
        });
        throw createError.database("Erreur lors de la récupération des métriques business");
      }
    })
  );

  // POST /api/metrics-business - Créer nouvelle métrique business
  router.post('/api/metrics-business',
    isAuthenticated,
    rateLimits.general,
    validateBody(insertMetricsBusinessSchema),
    asyncHandler(async (req: any, res: Response) => {
      try {
        const metricData = req.body;
        
        logger.info('Création métrique business', {
          metadata: {
            route: '/api/metrics-business',
            method: 'POST',
            metric_type: metricData.metric_type,
            userId: req.user?.id
          }
        });
        
        const newMetric = await storage.createMetricsBusiness(metricData);
        sendSuccess(res, newMetric, 201);
      } catch (error) {
        logger.error('Erreur createMetricsBusiness', {
          metadata: { 
            route: '/api/metrics-business',
            method: 'POST',
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            userId: req.user?.id
          }
        });
        throw createError.database("Erreur lors de la création de la métrique business");
      }
    })
  );

  // GET /api/metrics-business/:id - Récupérer métrique business par ID
  router.get('/api/metrics-business/:id',
    isAuthenticated,
    validateParams(commonParamSchemas.id),
    asyncHandler(async (req: any, res: Response) => {
      try {
        const { id } = req.params;
        
        logger.info('Récupération métrique business par ID', {
          metadata: {
            route: '/api/metrics-business/:id',
            method: 'GET',
            id,
            userId: req.user?.id
          }
        });
        
        const metric = await storage.getMetricsBusinessById(id);
        if (!metric) {
          throw createError.notFound("Métrique business non trouvée");
        }
        sendSuccess(res, metric);
      } catch (error) {
        logger.error('Erreur getMetricsBusinessById', {
          metadata: { 
            route: '/api/metrics-business/:id',
            method: 'GET',
            id: req.params.id,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            userId: req.user?.id
          }
        });
        throw error;
      }
    })
  );

  // PUT /api/metrics-business/:id - Mettre à jour métrique business
  router.put('/api/metrics-business/:id',
    isAuthenticated,
    rateLimits.general,
    validateParams(commonParamSchemas.id),
    validateBody(insertMetricsBusinessSchema.partial()),
    asyncHandler(async (req: any, res: Response) => {
      try {
        const { id } = req.params;
        const updateData = req.body;
        
        logger.info('Mise à jour métrique business', {
          metadata: {
            route: '/api/metrics-business/:id',
            method: 'PUT',
            id,
            userId: req.user?.id
          }
        });
        
        const updatedMetric = await storage.updateMetricsBusiness(id, updateData);
        sendSuccess(res, updatedMetric);
      } catch (error) {
        logger.error('Erreur updateMetricsBusiness', {
          metadata: { 
            route: '/api/metrics-business/:id',
            method: 'PUT',
            id: req.params.id,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            userId: req.user?.id
          }
        });
        throw createError.database("Erreur lors de la mise à jour de la métrique business");
      }
    })
  );

  // DELETE /api/metrics-business/:id - Supprimer métrique business
  router.delete('/api/metrics-business/:id',
    isAuthenticated,
    rateLimits.general,
    validateParams(commonParamSchemas.id),
    asyncHandler(async (req: any, res: Response) => {
      try {
        const { id } = req.params;
        
        logger.info('Suppression métrique business', {
          metadata: {
            route: '/api/metrics-business/:id',
            method: 'DELETE',
            id,
            userId: req.user?.id
          }
        });
        
        await storage.deleteMetricsBusiness(id);
        sendSuccess(res, null);
      } catch (error) {
        logger.error('Erreur deleteMetricsBusiness', {
          metadata: { 
            route: '/api/metrics-business/:id',
            method: 'DELETE',
            id: req.params.id,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            userId: req.user?.id
          }
        });
        throw createError.database("Erreur lors de la suppression de la métrique business");
      }
    })
  );

  logger.info('[AnalyticsModule] Routes initialisées', {
    metadata: {
      module: 'AnalyticsModule',
      routes: [
        '/api/analytics/kpis',
        '/api/analytics/metrics',
        '/api/analytics/pipeline',
        '/api/analytics/benchmarks',
        '/api/analytics/realtime',
        '/api/analytics/alerts',
        '/api/analytics/bottlenecks',
        '/api/analytics/export',
        '/api/predictive/revenue',
        '/api/predictive/risks',
        '/api/predictive/recommendations',
        '/api/dashboard/stats',
        '/api/dashboard/kpis',
        '/api/ai-performance/pipeline-metrics',
        '/api/ai-performance/cache-analytics',
        '/api/ai-performance/slo-compliance',
        '/api/ai-performance/bottlenecks',
        '/api/ai-performance/real-time-stats',
        '/api/metrics-business',
        'POST /api/metrics-business',
        '/api/metrics-business/:id',
        'PUT /api/metrics-business/:id',
        'DELETE /api/metrics-business/:id'
      ]
    }
  });

  return router;
}