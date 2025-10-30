/**
 * Alerts Module Routes
 * 
 * This module handles all alert-related routes including:
 * - Technical Alerts (scoring-based validation queue for technical lead)
 * - Date Intelligence Alerts (temporal anomalies and planning conflicts)
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import { isAuthenticated } from '../../replitAuth';
import { asyncHandler, sendSuccess, sendPaginatedSuccess, createError } from '../../middleware/errorHandler';
import { validateBody, validateParams, validateQuery, commonParamSchemas } from '../../middleware/validation';
import { rateLimits } from '../../middleware/rate-limiter';
import { logger } from '../../utils/logger';
import type { IStorage } from '../../storage-poc';
import type { EventBus } from '../../eventBus';
import { z } from 'zod';
import {
  technicalAlertsFilterSchema,
  bypassTechnicalAlertSchema
} from '@shared/schema';

// Local schemas for date-alerts
const alertsFilterSchema = z.object({
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  status: z.enum(['pending', 'acknowledged', 'resolved', 'expired']).optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  limit: z.coerce.number().default(50),
  offset: z.coerce.number().default(0)
});

const acknowledgeAlertSchema = z.object({
  note: z.string().optional()
});

// Middleware pour vérifier les rôles autorisés pour validation technique
const requireTechnicalValidationRole = (req: any, res: any, next: any) => {
  const userRole = req.session?.user?.role;
  if (!userRole || !['responsable_be', 'admin'].includes(userRole)) {
    return res.status(403).json({
      success: false,
      message: "Accès refusé. Rôle 'responsable_be' ou 'admin' requis."
    });
  }
  next();
};

export function createAlertsRouter(storage: IStorage, eventBus: EventBus): Router {
  const router = Router();
  
  // Import services dynamically to avoid circular dependencies
  let dateAlertDetectionService: any;
  let periodicDetectionScheduler: any;
  
  // Lazy initialization of services
  const getServices = async () => {
    if (!dateAlertDetectionService || !periodicDetectionScheduler) {
      const { DateAlertDetectionService } = await import('../../services/DateAlertDetectionService');
      const { PeriodicDetectionScheduler } = await import('../../services/PeriodicDetectionScheduler');
      const { DateIntelligenceService } = await import('../../services/DateIntelligenceService');
      const { MenuiserieDetectionRules } = await import('../../services/DateAlertDetectionService');
      const { getBusinessAnalyticsService } = await import('../../services/consolidated/BusinessAnalyticsService');
      const { PredictiveEngineService } = await import('../../services/PredictiveEngineService');
      
      const dateIntelligenceService = new DateIntelligenceService(storage);
      const menuiserieRules = new MenuiserieDetectionRules(storage);
      const analyticsService = getBusinessAnalyticsService(storage, eventBus);
      const predictiveEngineService = new PredictiveEngineService(storage);
      
      dateAlertDetectionService = new DateAlertDetectionService(
        storage,
        eventBus,
        dateIntelligenceService,
        menuiserieRules,
        analyticsService,
        predictiveEngineService
      );
      
      periodicDetectionScheduler = new PeriodicDetectionScheduler(
        storage,
        eventBus,
        dateAlertDetectionService,
        dateIntelligenceService
      );
    }
    
    return { dateAlertDetectionService, periodicDetectionScheduler };
  };

  // ========================================
  // TECHNICAL ALERTS ROUTES
  // ========================================

  // GET /api/technical-alerts - Liste des alertes techniques avec filtrage
  router.get("/api/technical-alerts",
    isAuthenticated,
    requireTechnicalValidationRole,
    validateQuery(technicalAlertsFilterSchema),
    asyncHandler(async (req, res) => {
      try {
        const filter = req.query as any;
        const alerts = await storage.listTechnicalAlerts(filter);
        
        sendSuccess(res, alerts);
      } catch (error) {
        logger.error('Erreur récupération alertes techniques', {
          metadata: { error: error instanceof Error ? error.message : String(error) }
        });
        throw createError.database("Erreur lors de la récupération des alertes techniques");
      }
    })
  );

  // GET /api/technical-alerts/:id - Détail d'une alerte technique
  router.get("/api/technical-alerts/:id",
    isAuthenticated,
    requireTechnicalValidationRole,
    validateParams(commonParamSchemas.id),
    asyncHandler(async (req, res) => {
      try {
        const { id } = req.params;
        const alert = await storage.getTechnicalAlert(id);
        
        if (!alert) {
          throw createError.notFound("Alerte technique non trouvée");
        }
        
        sendSuccess(res, alert);
      } catch (error) {
        logger.error('Erreur récupération alerte technique', {
          metadata: { error: error instanceof Error ? error.message : String(error), alertId: req.params.id }
        });
        throw error;
      }
    })
  );

  // PATCH /api/technical-alerts/:id/ack - Acknowledgment d'une alerte
  router.patch("/api/technical-alerts/:id/ack",
    isAuthenticated,
    requireTechnicalValidationRole,
    validateParams(commonParamSchemas.id),
    asyncHandler(async (req, res) => {
      const { id } = req.params;
      try {
        const userId = req.session?.user?.id;
        
        if (!userId) {
          throw createError.unauthorized("Utilisateur non authentifié");
        }
        
        await storage.acknowledgeTechnicalAlert(id, userId);
        
        // Publier événement EventBus
        if (eventBus) {
          eventBus.publishTechnicalAlertActionPerformed({
            alertId: id,
            action: 'acknowledged',
            userId: userId,
          });
        }
        
        sendSuccess(res, { alertId: id });
      } catch (error) {
        logger.error('Erreur acknowledgment alerte technique', {
          metadata: { error: error instanceof Error ? error.message : String(error), alertId: id }
        });
        throw error;
      }
    })
  );

  // PATCH /api/technical-alerts/:id/validate - Validation d'une alerte
  router.patch("/api/technical-alerts/:id/validate",
    isAuthenticated,
    requireTechnicalValidationRole,
    validateParams(commonParamSchemas.id),
    asyncHandler(async (req, res) => {
      const { id } = req.params;
      try {
        const userId = req.session?.user?.id;
        
        if (!userId) {
          throw createError.unauthorized("Utilisateur non authentifié");
        }
        
        await storage.validateTechnicalAlert(id, userId);
        
        // Publier événement EventBus
        if (eventBus) {
          eventBus.publishTechnicalAlertActionPerformed({
            alertId: id,
            action: 'validated',
            userId: userId,
          });
        }
        
        sendSuccess(res, { alertId: id });
      } catch (error) {
        logger.error('Erreur validation alerte technique', {
          metadata: { error: error instanceof Error ? error.message : String(error), alertId: id }
        });
        throw error;
      }
    })
  );

  // PATCH /api/technical-alerts/:id/bypass - Bypass temporaire d'une alerte
  router.patch("/api/technical-alerts/:id/bypass",
    isAuthenticated,
    requireTechnicalValidationRole,
    validateParams(commonParamSchemas.id),
    validateBody(bypassTechnicalAlertSchema),
    asyncHandler(async (req, res) => {
      const { id } = req.params;
      try {
        const { until, reason } = req.body;
        const userId = req.session?.user?.id;
        
        if (!userId) {
          throw createError.unauthorized("Utilisateur non authentifié");
        }
        
        await storage.bypassTechnicalAlert(id, userId, new Date(until), reason);
        
        // Publier événement EventBus
        if (eventBus) {
          eventBus.publishTechnicalAlertActionPerformed({
            alertId: id,
            action: 'bypassed',
            userId: userId,
            metadata: { until, reason }
          });
        }
        
        sendSuccess(res, { alertId: id, until, reason });
      } catch (error) {
        logger.error('Erreur bypass alerte technique', {
          metadata: { error: error instanceof Error ? error.message : String(error), alertId: id }
        });
        throw error;
      }
    })
  );

  // GET /api/technical-alerts/:id/history - Historique des actions sur une alerte
  router.get("/api/technical-alerts/:id/history",
    isAuthenticated,
    requireTechnicalValidationRole,
    validateParams(commonParamSchemas.id),
    asyncHandler(async (req, res) => {
      try {
        const { id } = req.params;
        const history = await storage.listTechnicalAlertHistory(id);
        
        sendSuccess(res, history);
      } catch (error) {
        logger.error('Erreur récupération historique alerte technique', {
          metadata: { error: error instanceof Error ? error.message : String(error), alertId: req.params.id }
        });
        throw createError.database("Erreur lors de la récupération de l'historique");
      }
    })
  );

  // POST /api/technical-alerts/seed - Seeder pour tests E2E (NODE_ENV=test uniquement)
  router.post("/api/technical-alerts/seed",
    asyncHandler(async (req, res) => {
      // Sécurité critique : uniquement en environnement de test
      if (process.env.NODE_ENV !== 'test') {
        return res.status(404).json({ message: "Not found" });
      }
      
      try {
        const alertData = req.body;
        
        // Valider les données d'entrée basiques
        if (!alertData.id || !alertData.aoId || !alertData.aoReference) {
          throw createError.badRequest('Données alerte incomplètes pour seeding');
        }
        
        // Persister dans storage
        const alert = await storage.enqueueTechnicalAlert({
          aoId: alertData.aoId,
          aoReference: alertData.aoReference,
          score: alertData.score || 75,
          triggeredCriteria: alertData.triggeredCriteria || ['test-criteria'],
          status: alertData.status || 'pending',
          assignedToUserId: alertData.assignedToUserId || 'test-user-id',
          rawEventData: {
            source: 'test-seed',
            ...alertData.metadata
          }
        });
        
        logger.info('Test seed alerte créée', {
          metadata: { alertId: alert.id }
        });
        
        res.status(201).json({ 
          success: true, 
          message: 'Alerte test créée',
          alert 
        });
      } catch (error) {
        logger.error('Erreur création alerte test', {
          metadata: { error: error instanceof Error ? error.message : String(error) }
        });
        throw error;
      }
    })
  );

  // ========================================
  // DATE INTELLIGENCE ALERTS ROUTES
  // ========================================

  // GET /api/date-alerts - Récupération alertes
  router.get("/api/date-alerts",
    isAuthenticated,
    validateQuery(alertsFilterSchema),
    asyncHandler(async (req, res) => {
      try {
        const { entityType, entityId, status, severity, limit, offset } = req.query;
        
        logger.info('Récupération alertes avec filtres', {
          metadata: { filters: req.query }
        });
        
        // Construire les filtres pour le storage
        const filters: any = {};
        if (entityType) filters.entityType = entityType;
        if (entityId) filters.entityId = entityId;
        if (status) filters.status = status;
        
        // Récupérer les alertes depuis le storage
        let alerts = await storage.getDateAlerts(filters);
        
        // Appliquer le filtre de sévérité
        if (severity) {
          alerts = alerts.filter(alert => alert.severity === severity);
        }
        
        // Pagination
        const numLimit = Number(limit) || 50;
        const numOffset = Number(offset) || 0;
        const total = alerts.length;
        alerts = alerts.slice(numOffset, numOffset + numLimit);
        
        const result = {
          alerts,
          pagination: {
            total,
            limit: numLimit,
            offset: numOffset,
            hasMore: numOffset + numLimit < total
          },
          metadata: {
            pendingCount: alerts.filter(a => a.status === 'pending').length,
            criticalCount: alerts.filter(a => a.severity === 'critical').length,
            retrievedAt: new Date()
          }
        };
        
        sendPaginatedSuccess(res, result.alerts, { page: Math.floor(numOffset / numLimit) + 1, limit: numLimit, total });
      } catch (error: any) {
        logger.error('Erreur récupération alertes', {
          metadata: { error: error.message, stack: error.stack }
        });
        throw createError.database("Erreur lors de la récupération des alertes");
      }
    })
  );

  // PUT /api/date-alerts/:id/acknowledge - Accusé de réception alerte
  router.put("/api/date-alerts/:id/acknowledge",
    isAuthenticated,
    rateLimits.general,
    validateParams(commonParamSchemas.id),
    validateBody(acknowledgeAlertSchema),
    asyncHandler(async (req, res) => {
      try {
        const { id } = req.params;
        const { note } = req.body;
        const userId = (req as any).user?.id || 'unknown';
        
        logger.info('Acquittement alerte', {
          metadata: { alertId: id, userId }
        });
        
        // Vérifier que l'alerte existe
        const existingAlert = await storage.getDateAlert(id);
        if (!existingAlert) {
          throw createError.notFound("Alerte", id);
        }
        
        // Vérifier le statut actuel
        if (existingAlert.status === 'resolved') {
          throw createError.validation(400, "Impossible d'acquitter une alerte déjà résolue", {
            currentStatus: existingAlert.status,
            alertId: id
          });
        }
        
        // Acquitter l'alerte
        const acknowledgedAlert = await storage.acknowledgeAlert(id, userId);
        
        // Ajouter une note si fournie
        if (note) {
          await storage.updateDateAlert(id, {
            actionTaken: note
          });
        }
        
        logger.info('Alerte acquittée avec succès', {
          metadata: { alertId: id }
        });
        
        sendSuccess(res, acknowledgedAlert);
      } catch (error: any) {
        logger.error('Erreur acquittement alerte', {
          metadata: { error: error.message, stack: error.stack }
        });
        
        // Re-lancer les erreurs AppError
        if (error.statusCode) {
          throw error;
        }
        
        throw createError.database("Erreur lors de l'acquittement de l'alerte", {
          alertId: req.params.id,
          errorType: 'ALERT_ACKNOWLEDGMENT_FAILED'
        });
      }
    })
  );

  // PUT /api/date-alerts/:id/resolve - Résolution d'alerte
  router.put("/api/date-alerts/:id/resolve",
    isAuthenticated,
    rateLimits.general,
    validateParams(commonParamSchemas.id),
    validateBody(z.object({
      actionTaken: z.string().min(1, "Action prise requise"),
      resolution: z.string().optional()
    })),
    asyncHandler(async (req, res) => {
      try {
        const { id } = req.params;
        const { actionTaken, resolution } = req.body;
        const userId = (req as any).user?.id || 'unknown';
        
        logger.info('Résolution alerte', {
          metadata: { alertId: id, userId }
        });
        
        // Vérifier que l'alerte existe
        const existingAlert = await storage.getDateAlert(id);
        if (!existingAlert) {
          throw createError.notFound("Alerte", id);
        }
        
        // Résoudre l'alerte
        const resolvedAlert = await storage.resolveAlert(id, userId, actionTaken);
        
        logger.info('Alerte résolue avec succès', {
          metadata: { alertId: id }
        });
        
        sendSuccess(res, resolvedAlert);
      } catch (error: any) {
        logger.error('Erreur résolution alerte', {
          metadata: { error: error.message, stack: error.stack }
        });
        
        if (error.statusCode) {
          throw error;
        }
        
        throw createError.database("Erreur lors de la résolution de l'alerte", {
          alertId: req.params.id,
          errorType: 'ALERT_RESOLUTION_FAILED'
        });
      }
    })
  );

  // GET /api/date-alerts/dashboard - Dashboard alertes utilisateur
  router.get("/api/date-alerts/dashboard",
    isAuthenticated,
    asyncHandler(async (req, res) => {
      try {
        const userId = (req as any).user?.id;
        logger.info('Récupération dashboard pour utilisateur', {
          metadata: { userId }
        });
        
        const services = await getServices();
        
        // Récupérer toutes les alertes actives
        const activeAlerts = await storage.getDateAlerts({ status: 'pending' });
        
        // Récupérer les métriques du scheduler périodique
        const schedulerMetrics = services.periodicDetectionScheduler.getMetrics();
        
        // Récupérer les profils de risque projets
        const projectRiskProfiles = services.periodicDetectionScheduler.getProjectRiskProfiles();
        
        // Calcul statistiques dashboard
        const criticalAlerts = activeAlerts.filter(a => a.severity === 'critical');
        const warningAlerts = activeAlerts.filter(a => a.severity === 'warning');
        const infoAlerts = activeAlerts.filter(a => a.severity === 'info');
        
        // Alertes par type
        const alertsByType = activeAlerts.reduce((acc, alert) => {
          acc[alert.alertType] = (acc[alert.alertType] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        // Projets à risque élevé
        const highRiskProjects = projectRiskProfiles.filter(p => p.riskScore >= 70);
        const deterioratingProjects = projectRiskProfiles.filter(p => p.trendDirection === 'deteriorating');
        
        // Alertes récentes (24h)
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentAlerts = activeAlerts.filter(a => a.createdAt && new Date(a.createdAt) > yesterday);
        
        // Actions requises
        const actionRequiredAlerts = activeAlerts.filter(a => 
          a.suggestedActions && Array.isArray(a.suggestedActions) && a.suggestedActions.length > 0
        );
        
        const dashboard = {
          overview: {
            totalActiveAlerts: activeAlerts.length,
            criticalAlertsCount: criticalAlerts.length,
            warningAlertsCount: warningAlerts.length,
            infoAlertsCount: infoAlerts.length,
            actionRequiredCount: actionRequiredAlerts.length,
            recentAlertsCount: recentAlerts.length
          },
          alertsByType,
          riskProfiles: {
            totalProjects: projectRiskProfiles.length,
            highRiskProjects: highRiskProjects.length,
            deterioratingProjects: deterioratingProjects.length,
            averageRiskScore: projectRiskProfiles.reduce((sum, p) => sum + p.riskScore, 0) / (projectRiskProfiles.length || 1)
          },
          recentAlerts: recentAlerts.slice(0, 10),
          criticalAlerts: criticalAlerts.slice(0, 5),
          highRiskProjects: highRiskProjects.slice(0, 5),
          systemHealth: {
            detectionSystemRunning: services.periodicDetectionScheduler.isSystemRunning(),
            lastDetectionRun: schedulerMetrics.lastRunAt,
            nextScheduledRun: schedulerMetrics.nextScheduledRun,
            successRate: schedulerMetrics.totalRuns > 0 ? 
              (schedulerMetrics.successfulRuns / schedulerMetrics.totalRuns) : 1,
            averageExecutionTime: schedulerMetrics.averageExecutionTimeMs
          },
          recommendations: [] as string[]
        };
        
        // Génération recommandations
        if (criticalAlerts.length > 0) {
          dashboard.recommendations.push(`${criticalAlerts.length} alerte(s) critique(s) nécessitent une action immédiate`);
        }
        
        if (highRiskProjects.length > 3) {
          dashboard.recommendations.push(`${highRiskProjects.length} projets à risque élevé - révision planning recommandée`);
        }
        
        if (deterioratingProjects.length > 2) {
          dashboard.recommendations.push(`${deterioratingProjects.length} projets en détérioration - surveillance renforcée`);
        }
        
        if (actionRequiredAlerts.length > activeAlerts.length * 0.5) {
          dashboard.recommendations.push('De nombreuses alertes nécessitent des actions - priorisation conseillée');
        }
        
        sendSuccess(res, dashboard);
        
      } catch (error: any) {
        logger.error('Erreur récupération dashboard', {
          metadata: { error: error.message, stack: error.stack }
        });
        throw createError.database("Erreur lors de la récupération du dashboard", {
          errorType: 'DASHBOARD_FETCH_FAILED'
        });
      }
    })
  );

  // POST /api/date-alerts/run-detection - Déclencher détection manuelle
  router.post("/api/date-alerts/run-detection",
    isAuthenticated,
    rateLimits.creation,
    validateBody(z.object({
      detectionType: z.enum(['full', 'delays', 'conflicts', 'deadlines', 'optimizations']).default('full'),
      projectId: z.string().optional(),
      daysAhead: z.number().min(1).max(90).default(7).optional()
    })),
    asyncHandler(async (req, res) => {
      try {
        const { detectionType, projectId, daysAhead } = req.body;
        const userId = (req as any).user?.id;
        
        logger.info('Détection manuelle déclenchée', {
          metadata: { detectionType, userId, projectId }
        });
        
        const services = await getServices();
        
        let results: any = {};
        const startTime = Date.now();
        
        switch (detectionType) {
          case 'full':
            results = await services.dateAlertDetectionService.runPeriodicDetection();
            break;
            
          case 'delays':
            const delayAlerts = await services.dateAlertDetectionService.detectDelayRisks(projectId);
            results = {
              totalAlertsGenerated: delayAlerts.length,
              alertsByType: { delay_risk: delayAlerts.length },
              alerts: delayAlerts,
              detectionType: 'delays'
            };
            break;
            
          case 'conflicts':
            const timeframe = {
              startDate: new Date(),
              endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            };
            const conflictAlerts = await services.dateAlertDetectionService.detectPlanningConflicts(timeframe);
            results = {
              totalAlertsGenerated: conflictAlerts.length,
              alertsByType: { resource_conflict: conflictAlerts.length },
              alerts: conflictAlerts,
              detectionType: 'conflicts'
            };
            break;
            
          case 'deadlines':
            const deadlineAlerts = await services.dateAlertDetectionService.checkCriticalDeadlines(daysAhead);
            results = {
              totalAlertsGenerated: deadlineAlerts.length,
              alertsByType: { deadline_critical: deadlineAlerts.length },
              alerts: deadlineAlerts,
              detectionType: 'deadlines'
            };
            break;
            
          case 'optimizations':
            const optimizationAlerts = await services.dateAlertDetectionService.detectOptimizationOpportunities();
            results = {
              totalAlertsGenerated: optimizationAlerts.length,
              alertsByType: { optimization: optimizationAlerts.length },
              alerts: optimizationAlerts,
              detectionType: 'optimizations'
            };
            break;
        }
        
        const executionTime = Date.now() - startTime;
        
        const response = {
          ...results,
          executionTime,
          triggeredBy: userId,
          triggeredAt: new Date(),
          detectionType,
          projectId: projectId || 'all',
          success: true
        };
        
        logger.info('Détection terminée', {
          metadata: { 
            detectionType, 
            totalAlerts: results.totalAlertsGenerated, 
            executionTime 
          }
        });
        
        sendSuccess(res, response, 201);
        
      } catch (error: any) {
        logger.error('Erreur exécution détection', {
          metadata: { error: error.message, stack: error.stack }
        });
        throw createError.database("Erreur lors de l'exécution de la détection", {
          detectionType: req.body.detectionType,
          errorType: 'MANUAL_DETECTION_FAILED'
        });
      }
    })
  );

  // POST /api/date-alerts/:id/escalate - Escalade manuelle d'alerte
  router.post("/api/date-alerts/:id/escalate",
    isAuthenticated,
    rateLimits.general,
    validateParams(commonParamSchemas.id),
    validateBody(z.object({
      escalationLevel: z.enum(['manager', 'director', 'critical']).default('manager'),
      reason: z.string().min(1, "Raison d'escalade requise"),
      urgency: z.enum(['normal', 'high', 'immediate']).default('high')
    })),
    asyncHandler(async (req, res) => {
      try {
        const { id } = req.params;
        const { escalationLevel, reason, urgency } = req.body;
        const userId = (req as any).user?.id;
        
        logger.info('Escalade alerte', {
          metadata: { alertId: id, escalationLevel, userId }
        });
        
        // Vérifier que l'alerte existe
        const existingAlert = await storage.getDateAlert(id);
        if (!existingAlert) {
          throw createError.notFound("Alerte", id);
        }
        
        // Vérifier que l'alerte peut être escaladée
        if (existingAlert.status === 'resolved') {
          throw createError.validation(400, "Impossible d'escalader une alerte résolue", {
            currentStatus: existingAlert.status,
            alertId: id
          });
        }
        
        // Mettre à jour l'alerte avec l'escalade
        const escalatedAlert = await storage.updateDateAlert(id, {
          severity: urgency === 'immediate' ? 'critical' : existingAlert.severity,
          assignedTo: userId,
          actionTaken: `Escaladée niveau ${escalationLevel} par ${userId}: ${reason}`
        });
        
        // Déclencher la notification d'escalade via EventBus
        await eventBus.publishSystemAlert({
          id: `escalation-manual-${id}-${Date.now()}`,
          entity: 'system',
          entityId: 'manual-escalation',
          message: `🚨 ESCALADE MANUELLE - ${existingAlert.title}`,
          severity: 'critical',
          metadata: {
            originalAlert: id,
            escalationLevel,
            escalatedBy: userId,
            reason,
            urgency,
            immediateAction: urgency === 'immediate'
          }
        });
        
        // Notifier selon le niveau d'escalade
        const escalationTargets = {
          manager: ['manager-group'],
          director: ['manager-group', 'director-group'],
          critical: ['manager-group', 'director-group', 'emergency-group']
        };
        
        const targets = escalationTargets[escalationLevel] || ['manager-group'];
        
        // Notification spécialisée escalade
        eventBus.publish({
          id: `escalation-notification-${id}-${Date.now()}`,
          type: 'date_intelligence.alert_escalated',
          entity: 'date_intelligence',
          entityId: id,
          title: `⬆️ Alerte Escaladée - Niveau ${escalationLevel.toUpperCase()}`,
          message: `Escalade alerte "${existingAlert.title}" - ${reason}`,
          severity: urgency === 'immediate' ? 'error' : 'warning',
          timestamp: new Date().toISOString(),
          userId,
          metadata: {
            originalAlert: existingAlert,
            escalationLevel,
            reason,
            urgency,
            targets,
            escalatedAt: new Date().toISOString(),
            action: 'alert_escalated'
          }
        });
        
        const response = {
          escalatedAlert,
          escalation: {
            level: escalationLevel,
            reason,
            urgency,
            escalatedBy: userId,
            escalatedAt: new Date(),
            targets
          }
        };
        
        logger.info('Alerte escaladée avec succès', {
          metadata: { alertId: id, escalationLevel }
        });
        
        sendSuccess(res, response, `Alerte escaladée au niveau ${escalationLevel}`, 201);
        
      } catch (error: any) {
        logger.error('Erreur escalade alerte', {
          metadata: { error: error.message, stack: error.stack }
        });
        
        if (error.statusCode) {
          throw error;
        }
        
        throw createError.database("Erreur lors de l'escalade de l'alerte", {
          alertId: req.params.id,
          errorType: 'ALERT_ESCALATION_FAILED'
        });
      }
    })
  );

  // GET /api/date-alerts/summary - Résumé alertes par type/criticité
  router.get("/api/date-alerts/summary",
    isAuthenticated,
    validateQuery(z.object({
      period: z.enum(['today', 'week', 'month']).default('today'),
      groupBy: z.enum(['type', 'severity', 'status', 'entity']).default('type'),
      includeResolved: z.boolean().default(false)
    })),
    asyncHandler(async (req, res) => {
      try {
        const { period, groupBy, includeResolved } = req.query;
        
        logger.info('Récupération résumé alertes', {
          metadata: { period, groupBy }
        });
        
        // Calculer la période
        let startDate: Date = new Date();
        switch (period) {
          case 'today':
            startDate = new Date();
            startDate.setHours(0, 0, 0, 0);
            break;
          case 'week':
            startDate = new Date();
            startDate.setDate(startDate.getDate() - 7);
            break;
          case 'month':
            startDate = new Date();
            startDate.setDate(startDate.getDate() - 30);
            break;
          default:
            startDate = new Date();
            startDate.setDate(startDate.getDate() - 30);
            break;
        }
        
        // Récupérer les alertes dans la période
        const allAlerts = await storage.getDateAlerts({});
        const periodAlerts = allAlerts.filter(alert => {
          if (!alert.createdAt) return false;
          const alertDate = new Date(alert.createdAt);
          const isInPeriod = alertDate >= startDate;
          const includeAlert = includeResolved || alert.status !== 'resolved';
          return isInPeriod && includeAlert;
        });
        
        // Grouper selon le critère demandé
        const grouped = periodAlerts.reduce((acc, alert) => {
          let key: string;
          
          switch (groupBy) {
            case 'type':
              key = alert.alertType;
              break;
            case 'severity':
              key = alert.severity;
              break;
            case 'status':
              key = alert.status;
              break;
            case 'entity':
              key = alert.entityType;
              break;
            default:
              key = 'unknown';
          }
          
          if (!acc[key]) {
            acc[key] = {
              count: 0,
              alerts: [],
              criticalCount: 0,
              warningCount: 0,
              infoCount: 0,
              pendingCount: 0,
              acknowledgedCount: 0,
              resolvedCount: 0
            };
          }
          
          acc[key].count++;
          acc[key].alerts.push(alert);
          
          // Compteurs par sévérité
          if (alert.severity === 'critical') acc[key].criticalCount++;
          else if (alert.severity === 'warning') acc[key].warningCount++;
          else acc[key].infoCount++;
          
          // Compteurs par statut
          if (alert.status === 'pending') acc[key].pendingCount++;
          else if (alert.status === 'acknowledged') acc[key].acknowledgedCount++;
          else if (alert.status === 'resolved') acc[key].resolvedCount++;
          
          return acc;
        }, {} as Record<string, any>);
        
        // Calculer les statistiques globales
        const totalAlerts = periodAlerts.length;
        const criticalCount = periodAlerts.filter(a => a.severity === 'critical').length;
        const warningCount = periodAlerts.filter(a => a.severity === 'warning').length;
        const infoCount = periodAlerts.filter(a => a.severity === 'info').length;
        
        const pendingCount = periodAlerts.filter(a => a.status === 'pending').length;
        const acknowledgedCount = periodAlerts.filter(a => a.status === 'acknowledged').length;
        const resolvedCount = periodAlerts.filter(a => a.status === 'resolved').length;
        
        // Top 5 des entités les plus affectées
        const entitiesSummary = periodAlerts.reduce((acc, alert) => {
          const key = `${alert.entityType}:${alert.entityId}`;
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        const topEntities = Object.entries(entitiesSummary)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 5)
          .map(([entity, count]) => ({ entity, count }));
        
        // Tendances (comparaison avec période précédente)
        const previousPeriodStart = new Date(startDate.getTime() - (Date.now() - startDate.getTime()));
        const previousPeriodAlerts = allAlerts.filter(alert => {
          const alertDate = new Date(alert.createdAt);
          return alertDate >= previousPeriodStart && alertDate < startDate;
        });
        
        const trend = totalAlerts - previousPeriodAlerts.length;
        const trendPercentage = previousPeriodAlerts.length > 0 ? 
          ((totalAlerts - previousPeriodAlerts.length) / previousPeriodAlerts.length * 100).toFixed(1) : '0';
        
        const summary = {
          period: {
            name: period,
            startDate,
            endDate: new Date(),
            daysIncluded: Math.ceil((Date.now() - startDate.getTime()) / (24 * 60 * 60 * 1000))
          },
          overview: {
            totalAlerts,
            criticalCount,
            warningCount,
            infoCount,
            pendingCount,
            acknowledgedCount,
            resolvedCount,
            includeResolved
          },
          groupedBy: groupBy,
          grouped,
          topEntities,
          trends: {
            compared_to_previous_period: {
              change: trend,
              percentage: `${trend >= 0 ? '+' : ''}${trendPercentage}%`,
              direction: trend > 0 ? 'increase' : trend < 0 ? 'decrease' : 'stable'
            }
          },
          insights: [] as string[]
        };
        
        // Génération d'insights automatiques
        if (criticalCount > totalAlerts * 0.3) {
          summary.insights.push(`Forte proportion d'alertes critiques (${((criticalCount/totalAlerts)*100).toFixed(1)}%)`);
        }
        
        if (pendingCount > totalAlerts * 0.7) {
          summary.insights.push(`Beaucoup d'alertes en attente de traitement (${((pendingCount/totalAlerts)*100).toFixed(1)}%)`);
        }
        
        if (trend > 5) {
          summary.insights.push(`Augmentation significative des alertes (+${trend}) par rapport à la période précédente`);
        }
        
        if (topEntities.length > 0 && topEntities[0].count > 5) {
          summary.insights.push(`Entité la plus affectée: ${topEntities[0].entity} avec ${topEntities[0].count} alertes`);
        }
        
        logger.info('Résumé généré', {
          metadata: { totalAlerts, groupCount: Object.keys(grouped).length }
        });
        
        sendSuccess(res, summary);
        
      } catch (error: any) {
        logger.error('Erreur génération résumé', {
          metadata: { error: error.message, stack: error.stack }
        });
        throw createError.database("Erreur lors de la génération du résumé", {
          errorType: 'ALERTS_SUMMARY_FAILED'
        });
      }
    })
  );

  return router;
}
