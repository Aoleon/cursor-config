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
import { validateBody, validateParams, validateQuery } from '../../middleware/validation';
import { rateLimits } from '../../middleware/security';
import { sendSuccess, sendPaginatedSuccess } from '../../middleware/errorHandler';
import { ValidationError, NotFoundError } from '../../utils/error-handler';
import { logger } from '../../utils/logger';
import type { IStorage } from '../../storage-poc';
import type { EventBus } from '../../eventBus';
import { z } from 'zod';
import {
  analyticsFiltersSchema,
  snapshotRequestSchema,
  metricQuerySchema,
  benchmarkQuerySchema,
  insertAlertThresholdSchema,
  updateAlertThresholdSchema,
  alertsQuerySchema
} from '@shared/schema';
import { AnalyticsService } from '../../services/AnalyticsService';
import { PredictiveEngineService } from '../../services/PredictiveEngineService';
import { getPerformanceMetricsService } from '../../services/PerformanceMetricsService';
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
  const analyticsService = new AnalyticsService(storage, eventBus);
  const predictiveService = new PredictiveEngineService(storage);
  const performanceService = getPerformanceMetricsService();

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
        '/api/dashboard/kpis'
      ]
    }
  });

  return router;
}