import express from "express";
import { z } from "zod";
import { eq, and, desc, gte, lte, count, sql } from "drizzle-orm";
import { db } from "./db";
import { IStorage } from "./storage-poc";
import { AuditService } from "./services/AuditService";
import { EventBus } from "./eventBus";
import { isAuthenticated } from "./replitAuth";
import { mondaySimpleSeed } from "./seeders/mondaySeed-simple";
import { 
  auditLogsQuerySchema, 
  securityAlertsQuerySchema,
  type AuditLogsQuery,
  type SecurityAlertsQuery,
  auditLogs,
  securityAlerts,
  users,
  chatbotConversations,
  chatbotFeedback,
  chatbotUsageMetrics
} from "@shared/schema";
import crypto from "crypto";

// Interface pour l'utilisateur authentifié via req.user
interface AuthenticatedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  profileImageUrl: string | null;
  role: string;
  isBasicAuth?: boolean;
  isTestUser?: boolean;
}

// Utilisation d'assertions de type pour req.user

// ========================================
// SCHEMAS DE VALIDATION POUR ENDPOINTS ADMIN
// ========================================

// Schema pour métriques overview
const adminMetricsQuerySchema = z.object({
  timeRange: z.enum(['1h', '24h', '7d', '30d']).default('24h'),
  includeBreakdown: z.boolean().default(false)
});

// Schema pour activité utilisateurs
const userActivityQuerySchema = z.object({
  userId: z.string().optional(),
  timeRange: z.enum(['7d', '30d', '90d']).default('30d'),
  includeViolations: z.boolean().default(true),
  riskThreshold: z.number().min(0).max(100).default(30),
  limit: z.number().min(1).max(1000).default(50),
  offset: z.number().min(0).default(0)
});

// Schema pour analytics chatbot avancées
const chatbotAnalyticsQuerySchema = z.object({
  timeRange: z.enum(['1h', '24h', '7d', '30d']).default('24h'),
  userRole: z.string().optional(),
  includeErrorAnalysis: z.boolean().default(true),
  includeFeedbackTrends: z.boolean().default(true),
  includeUsagePatterns: z.boolean().default(true)
});

// Schema pour résolution d'alerte
const resolveAlertSchema = z.object({
  alertId: z.string().min(1),
  resolutionNote: z.string().optional(),
  resolutionAction: z.string().optional(),
  markAsResolved: z.boolean().default(true)
});

// Schema pour export de données
const exportDataSchema = z.object({
  type: z.enum(['audit_logs', 'security_alerts', 'user_activity']),
  format: z.enum(['csv', 'json']).default('csv'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  filters: z.record(z.any()).optional()
});

// Schema pour seeding Monday.com
const mondaySeedSchema = z.object({
  forceReseed: z.boolean().default(false),
  entitiesOnly: z.array(z.enum(['tempsPose', 'aos', 'projects', 'contacts', 'metricsBusiness'])).optional(),
  validateOnly: z.boolean().default(false),
  includeReconciliation: z.boolean().default(true)
});

// ========================================
// MIDDLEWARE DE SÉCURITÉ ADMIN
// ========================================

/**
 * Middleware pour vérifier les permissions administrateur
 */
const requireAdminPermissions = (requiredPermissions: string[] = ['admin.full_access']) => {
  return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const user = req.user as AuthenticatedUser | undefined;
      if (!user) {
        return res.status(401).json({ 
          success: false, 
          error: 'Authentification requise' 
        });
      }

      // Vérifier si l'utilisateur a les permissions admin
      const userRole = user.role;
      const isAdmin = userRole === 'admin' || userRole === 'super_admin';
      
      if (!isAdmin) {
        // Log tentative d'accès non autorisé
        const auditService: AuditService = req.app.get('auditService');
        if (auditService) {
          await auditService.logEvent({
            userId: user.id,
            userRole: userRole,
            sessionId: req.sessionID,
            eventType: 'api.unauthorized_access',
            resource: req.path,
            action: req.method,
            result: 'blocked',
            severity: 'high',
            metadata: {
              ip: req.ip,
              userAgent: req.get('User-Agent'),
              requiredPermissions,
              attemptedEndpoint: `${req.method} ${req.path}`
            }
          });
        }

        return res.status(403).json({ 
          success: false, 
          error: 'Permissions administrateur requises' 
        });
      }

      // Log accès admin accordé
      const auditService: AuditService = req.app.get('auditService');
      if (auditService) {
        await auditService.logEvent({
          userId: user.id,
          userRole: userRole,
          sessionId: req.sessionID,
          eventType: 'rbac.access_granted',
          resource: req.path,
          action: req.method,
          result: 'success',
          severity: 'low',
          metadata: {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            grantedPermissions: requiredPermissions,
            endpoint: `${req.method} ${req.path}`
          }
        });
      }

      next();
    } catch (error) {
      console.error('[requireAdminPermissions] Erreur:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur de vérification des permissions' 
      });
    }
  };
};

/**
 * Middleware de rate limiting pour endpoints admin
 */
const adminRateLimit = (maxRequests: number = 100, windowMs: number = 60000) => {
  const requests = new Map<string, { count: number; resetTime: number }>();

  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const clientId = `${(req.user as AuthenticatedUser)?.id}_${req.ip}`;
    const now = Date.now();
    
    const userRequests = requests.get(clientId);
    
    if (!userRequests || now > userRequests.resetTime) {
      requests.set(clientId, { count: 1, resetTime: now + windowMs });
      return next();
    }
    
    if (userRequests.count >= maxRequests) {
      return res.status(429).json({
        success: false,
        error: 'Trop de requêtes admin',
        retryAfter: Math.ceil((userRequests.resetTime - now) / 1000)
      });
    }
    
    userRequests.count++;
    next();
  };
};

// ========================================
// FACTORY POUR CRÉER LES ROUTES ADMIN
// ========================================

export function createAdminRoutes(
  storage: IStorage, 
  auditService: AuditService, 
  eventBus: EventBus
): express.Router {
  const router = express.Router();

  // Appliquer les middlewares de sécurité à toutes les routes admin
  // CRITIQUE : Authentification AVANT vérification permissions admin
  router.use(isAuthenticated);
  router.use(requireAdminPermissions());
  router.use(adminRateLimit(200, 60000)); // 200 requêtes par minute max

  // ========================================
  // 1. GET /api/admin/audit/logs - Logs audit paginés avec filtres
  // ========================================
  router.get('/audit/logs', async (req, res) => {
    try {
      const startTime = Date.now();
      
      // Validation des paramètres
      const queryValidation = auditLogsQuerySchema.safeParse(req.query);
      if (!queryValidation.success) {
        return res.status(400).json({
          success: false,
          error: 'Paramètres de requête invalides',
          details: queryValidation.error.errors
        });
      }

      const query: AuditLogsQuery = queryValidation.data;
      
      // Récupérer les logs d'audit
      const result = await auditService.getAuditLogs({
        ...query,
        includeArchived: false
      });
      
      const executionTime = Date.now() - startTime;

      // Log de l'accès aux logs d'audit
      await auditService.logEvent({
        userId: (req.user as AuthenticatedUser).id,
        userRole: (req.user as AuthenticatedUser).role,
        sessionId: req.sessionID,
        eventType: 'admin.action',
        resource: 'audit_logs',
        action: 'READ',
        result: 'success',
        severity: 'low',
        metadata: {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          executionTimeMs: executionTime,
          recordsReturned: result.logs.length,
          totalRecords: result.total,
          filters: query
        }
      });

      res.json({
        success: true,
        data: result,
        execution_time_ms: executionTime
      });

    } catch (error) {
      console.error('[GET /admin/audit/logs] Erreur:', error);
      
      await auditService.logEvent({
        userId: (req.user as AuthenticatedUser)?.id || 'unknown',
        userRole: (req.user as AuthenticatedUser)?.role || 'unknown',
        sessionId: req.sessionID,
        eventType: 'system.error',
        resource: 'audit_logs',
        action: 'READ',
        result: 'error',
        severity: 'medium',
        errorDetails: { message: error instanceof Error ? error.message : 'Unknown error' },
        metadata: { ip: req.ip, userAgent: req.get('User-Agent') }
      });

      res.status(500).json({
        success: false,
        error: 'Erreur lors de la récupération des logs d\'audit'
      });
    }
  });

  // ========================================
  // 2. GET /api/admin/security/alerts - Alertes sécurité actives
  // ========================================
  router.get('/security/alerts', async (req, res) => {
    try {
      const startTime = Date.now();
      
      // Validation des paramètres
      const queryValidation = securityAlertsQuerySchema.safeParse(req.query);
      if (!queryValidation.success) {
        return res.status(400).json({
          success: false,
          error: 'Paramètres de requête invalides',
          details: queryValidation.error.errors
        });
      }

      const query: SecurityAlertsQuery = queryValidation.data;
      
      // Récupérer les alertes de sécurité
      const result = await auditService.getSecurityAlerts(query);
      
      const executionTime = Date.now() - startTime;

      // Log de l'accès aux alertes de sécurité
      await auditService.logEvent({
        userId: (req.user as AuthenticatedUser).id,
        userRole: (req.user as AuthenticatedUser).role,
        sessionId: req.sessionID,
        eventType: 'admin.action',
        resource: 'security_alerts',
        action: 'READ',
        result: 'success',
        severity: 'low',
        metadata: {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          executionTimeMs: executionTime,
          alertsReturned: result.alerts.length,
          totalAlerts: result.total,
          filters: query
        }
      });

      res.json({
        success: true,
        data: result,
        execution_time_ms: executionTime
      });

    } catch (error) {
      console.error('[GET /admin/security/alerts] Erreur:', error);
      
      await auditService.logEvent({
        userId: (req.user as AuthenticatedUser)?.id || 'unknown',
        userRole: (req.user as AuthenticatedUser)?.role || 'unknown',
        sessionId: req.sessionID,
        eventType: 'system.error',
        resource: 'security_alerts',
        action: 'READ',
        result: 'error',
        severity: 'medium',
        errorDetails: { message: error instanceof Error ? error.message : 'Unknown error' },
        metadata: { ip: req.ip, userAgent: req.get('User-Agent') }
      });

      res.status(500).json({
        success: false,
        error: 'Erreur lors de la récupération des alertes de sécurité'
      });
    }
  });

  // ========================================
  // 3. GET /api/admin/metrics/overview - Métriques globales usage
  // ========================================
  router.get('/metrics/overview', async (req, res) => {
    try {
      const startTime = Date.now();
      
      // Validation des paramètres
      const queryValidation = adminMetricsQuerySchema.safeParse(req.query);
      if (!queryValidation.success) {
        return res.status(400).json({
          success: false,
          error: 'Paramètres de requête invalides',
          details: queryValidation.error.errors
        });
      }

      const { timeRange, includeBreakdown } = queryValidation.data;
      
      // Récupérer métriques de sécurité
      const securityMetrics = await auditService.getSecurityMetrics(timeRange);
      
      // Récupérer analytics chatbot
      const chatbotAnalytics = await auditService.getChatbotAnalytics(timeRange);
      
      // Métriques additionnelles via base de données
      const timeRangeMs = {
        '1h': 60 * 60 * 1000,
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000
      };

      const since = new Date(Date.now() - timeRangeMs[timeRange]);

      // Métriques utilisateurs
      const userMetrics = await db
        .select({
          totalUsers: count(sql`DISTINCT ${auditLogs.userId}`),
          newSessions: count(sql`DISTINCT ${auditLogs.sessionId}`)
        })
        .from(auditLogs)
        .where(gte(auditLogs.timestamp, since));

      // Alertes par statut
      const alertsByStatus = await db
        .select({
          status: securityAlerts.status,
          count: count()
        })
        .from(securityAlerts)
        .where(gte(securityAlerts.createdAt, since))
        .groupBy(securityAlerts.status);

      const executionTime = Date.now() - startTime;

      const overview = {
        timeRange,
        security: securityMetrics,
        chatbot: chatbotAnalytics,
        users: userMetrics[0] || { totalUsers: 0, newSessions: 0 },
        alerts: {
          byStatus: alertsByStatus.reduce((acc, item) => {
            acc[item.status] = item.count;
            return acc;
          }, {} as Record<string, number>)
        },
        system: {
          uptime: process.uptime(),
          timestamp: new Date(),
          executionTimeMs: executionTime
        }
      };

      // Log de l'accès aux métriques
      await auditService.logEvent({
        userId: (req.user as AuthenticatedUser).id,
        userRole: (req.user as AuthenticatedUser).role,
        sessionId: req.sessionID,
        eventType: 'admin.action',
        resource: 'metrics_overview',
        action: 'READ',
        result: 'success',
        severity: 'low',
        metadata: {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          executionTimeMs: executionTime,
          timeRange,
          includeBreakdown
        }
      });

      res.json({
        success: true,
        data: overview,
        execution_time_ms: executionTime
      });

    } catch (error) {
      console.error('[GET /admin/metrics/overview] Erreur:', error);
      
      await auditService.logEvent({
        userId: (req.user as AuthenticatedUser)?.id || 'unknown',
        userRole: (req.user as AuthenticatedUser)?.role || 'unknown',
        sessionId: req.sessionID,
        eventType: 'system.error',
        resource: 'metrics_overview',
        action: 'READ',
        result: 'error',
        severity: 'medium',
        errorDetails: { message: error instanceof Error ? error.message : 'Unknown error' },
        metadata: { ip: req.ip, userAgent: req.get('User-Agent') }
      });

      res.status(500).json({
        success: false,
        error: 'Erreur lors de la récupération des métriques'
      });
    }
  });

  // ========================================
  // 4. POST /api/admin/security/resolve - Marquer alerte comme résolue
  // ========================================
  router.post('/security/resolve', async (req, res) => {
    try {
      const startTime = Date.now();
      
      // Validation des données
      const bodyValidation = resolveAlertSchema.safeParse(req.body);
      if (!bodyValidation.success) {
        return res.status(400).json({
          success: false,
          error: 'Données de requête invalides',
          details: bodyValidation.error.errors
        });
      }

      const { alertId, resolutionNote, resolutionAction, markAsResolved } = bodyValidation.data;
      
      // Résoudre l'alerte
      const resolved = await auditService.resolveSecurityAlert(
        alertId,
        (req.user as AuthenticatedUser).id,
        resolutionNote,
        resolutionAction
      );

      if (!resolved) {
        return res.status(404).json({
          success: false,
          error: 'Alerte non trouvée ou déjà résolue'
        });
      }

      const executionTime = Date.now() - startTime;

      // Log de la résolution d'alerte
      await auditService.logEvent({
        userId: (req.user as AuthenticatedUser).id,
        userRole: (req.user as AuthenticatedUser).role,
        sessionId: req.sessionID,
        eventType: 'admin.action',
        resource: 'security_alerts',
        action: 'UPDATE',
        entityType: 'security_alert',
        entityId: alertId,
        result: 'success',
        severity: 'medium',
        metadata: {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          executionTimeMs: executionTime,
          resolutionAction,
          hasNote: !!resolutionNote
        }
      });

      res.json({
        success: true,
        data: {
          alertId,
          resolved: true,
          resolvedBy: (req.user as AuthenticatedUser).id,
          resolvedAt: new Date()
        },
        execution_time_ms: executionTime
      });

    } catch (error) {
      console.error('[POST /admin/security/resolve] Erreur:', error);
      
      await auditService.logEvent({
        userId: (req.user as AuthenticatedUser)?.id || 'unknown',
        userRole: (req.user as AuthenticatedUser)?.role || 'unknown',
        sessionId: req.sessionID,
        eventType: 'system.error',
        resource: 'security_alerts',
        action: 'UPDATE',
        result: 'error',
        severity: 'medium',
        errorDetails: { message: error instanceof Error ? error.message : 'Unknown error' },
        metadata: { ip: req.ip, userAgent: req.get('User-Agent') }
      });

      res.status(500).json({
        success: false,
        error: 'Erreur lors de la résolution de l\'alerte'
      });
    }
  });

  // ========================================
  // 5. GET /api/admin/users/activity - Activité utilisateurs détaillée
  // ========================================
  router.get('/users/activity', async (req, res) => {
    try {
      const startTime = Date.now();
      
      // Validation des paramètres
      const queryValidation = userActivityQuerySchema.safeParse(req.query);
      if (!queryValidation.success) {
        return res.status(400).json({
          success: false,
          error: 'Paramètres de requête invalides',
          details: queryValidation.error.errors
        });
      }

      const { userId, timeRange, includeViolations, riskThreshold, limit, offset } = queryValidation.data;
      
      if (userId) {
        // Rapport détaillé pour un utilisateur spécifique
        const userReport = await auditService.getUserActivityReport(userId, timeRange as '7d' | '30d');
        
        const executionTime = Date.now() - startTime;

        await auditService.logEvent({
          userId: (req.user as AuthenticatedUser).id,
          userRole: (req.user as AuthenticatedUser).role,
          sessionId: req.sessionID,
          eventType: 'admin.action',
          resource: 'user_activity',
          action: 'READ',
          entityType: 'user',
          entityId: userId,
          result: 'success',
          severity: 'low',
          metadata: {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            executionTimeMs: executionTime,
            timeRange,
            reportType: 'single_user'
          }
        });

        res.json({
          success: true,
          data: {
            type: 'single_user',
            user: userReport
          },
          execution_time_ms: executionTime
        });

      } else {
        // Liste des utilisateurs avec activité suspecte
        const timeRangeMs = {
          '7d': 7 * 24 * 60 * 60 * 1000,
          '30d': 30 * 24 * 60 * 60 * 1000,
          '90d': 90 * 24 * 60 * 60 * 1000
        };

        const since = new Date(Date.now() - timeRangeMs[timeRange]);

        // Récupérer statistiques utilisateurs
        const userStats = await db
          .select({
            userId: auditLogs.userId,
            userRole: auditLogs.userRole,
            totalActions: count(),
            lastActivity: sql<Date>`MAX(${auditLogs.timestamp})`,
            violationsCount: count(sql`CASE WHEN ${auditLogs.eventType} LIKE '%violation%' THEN 1 END`),
            errorsCount: count(sql`CASE WHEN ${auditLogs.result} = 'error' THEN 1 END`)
          })
          .from(auditLogs)
          .where(gte(auditLogs.timestamp, since))
          .groupBy(auditLogs.userId, auditLogs.userRole)
          .orderBy(desc(count()))
          .limit(limit)
          .offset(offset);

        const executionTime = Date.now() - startTime;

        await auditService.logEvent({
          userId: (req.user as AuthenticatedUser).id,
          userRole: (req.user as AuthenticatedUser).role,
          sessionId: req.sessionID,
          eventType: 'admin.action',
          resource: 'user_activity',
          action: 'READ',
          result: 'success',
          severity: 'low',
          metadata: {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            executionTimeMs: executionTime,
            timeRange,
            reportType: 'all_users',
            usersReturned: userStats.length
          }
        });

        res.json({
          success: true,
          data: {
            type: 'all_users',
            users: userStats,
            pagination: { limit, offset, hasMore: userStats.length === limit }
          },
          execution_time_ms: executionTime
        });
      }

    } catch (error) {
      console.error('[GET /admin/users/activity] Erreur:', error);
      
      await auditService.logEvent({
        userId: (req.user as AuthenticatedUser)?.id || 'unknown',
        userRole: (req.user as AuthenticatedUser)?.role || 'unknown',
        sessionId: req.sessionID,
        eventType: 'system.error',
        resource: 'user_activity',
        action: 'READ',
        result: 'error',
        severity: 'medium',
        errorDetails: { message: error instanceof Error ? error.message : 'Unknown error' },
        metadata: { ip: req.ip, userAgent: req.get('User-Agent') }
      });

      res.status(500).json({
        success: false,
        error: 'Erreur lors de la récupération de l\'activité utilisateurs'
      });
    }
  });

  // ========================================
  // 6. GET /api/admin/chatbot/analytics - Analytics chatbot avancées
  // ========================================
  router.get('/chatbot/analytics', async (req, res) => {
    try {
      const startTime = Date.now();
      
      // Validation des paramètres
      const queryValidation = chatbotAnalyticsQuerySchema.safeParse(req.query);
      if (!queryValidation.success) {
        return res.status(400).json({
          success: false,
          error: 'Paramètres de requête invalides',
          details: queryValidation.error.errors
        });
      }

      const { timeRange, userRole, includeErrorAnalysis, includeFeedbackTrends, includeUsagePatterns } = queryValidation.data;
      
      // Analytics chatbot de base
      const chatbotAnalytics = await auditService.getChatbotAnalytics(timeRange);
      
      // Analytics avancées depuis les tables dédiées
      const timeRangeMs = {
        '1h': 60 * 60 * 1000,
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000
      };

      const since = new Date(Date.now() - timeRangeMs[timeRange]);

      const advancedAnalytics: any = {
        base: chatbotAnalytics
      };

      // Analyse des erreurs si demandée
      if (includeErrorAnalysis) {
        const errorAnalysis = await db
          .select({
            errorType: sql<string>`${auditLogs.errorDetails}->>'type'`,
            count: count(),
            avgExecutionTime: sql<number>`AVG(${auditLogs.executionTimeMs})`
          })
          .from(auditLogs)
          .where(and(
            eq(auditLogs.eventType, 'chatbot.query'),
            eq(auditLogs.result, 'error'),
            gte(auditLogs.timestamp, since),
            userRole ? eq(auditLogs.userRole, userRole) : sql`TRUE`
          ))
          .groupBy(sql`${auditLogs.errorDetails}->>'type'`)
          .orderBy(desc(count()));

        advancedAnalytics.errorAnalysis = errorAnalysis;
      }

      // Tendances du feedback si demandées
      if (includeFeedbackTrends) {
        const feedbackTrends = await db
          .select({
            date: sql<string>`DATE(${chatbotFeedback.createdAt})`,
            avgRating: sql<number>`AVG(${chatbotFeedback.rating})`,
            totalFeedback: count()
          })
          .from(chatbotFeedback)
          .leftJoin(chatbotConversations, eq(chatbotFeedback.conversationId, chatbotConversations.id))
          .where(and(
            gte(chatbotFeedback.createdAt, since),
            userRole ? eq(chatbotConversations.userRole, userRole) : sql`TRUE`
          ))
          .groupBy(sql`DATE(${chatbotFeedback.createdAt})`)
          .orderBy(sql`DATE(${chatbotFeedback.createdAt})`);

        advancedAnalytics.feedbackTrends = feedbackTrends;
      }

      // Patterns d'usage si demandés
      if (includeUsagePatterns) {
        const usagePatterns = await db
          .select({
            hour: sql<number>`EXTRACT(HOUR FROM ${auditLogs.timestamp})`,
            dayOfWeek: sql<number>`EXTRACT(DOW FROM ${auditLogs.timestamp})`,
            count: count(),
            avgResponseTime: sql<number>`AVG(${auditLogs.executionTimeMs})`
          })
          .from(auditLogs)
          .where(and(
            eq(auditLogs.eventType, 'chatbot.query'),
            gte(auditLogs.timestamp, since),
            userRole ? eq(auditLogs.userRole, userRole) : sql`TRUE`
          ))
          .groupBy(
            sql`EXTRACT(HOUR FROM ${auditLogs.timestamp})`,
            sql`EXTRACT(DOW FROM ${auditLogs.timestamp})`
          )
          .orderBy(sql`EXTRACT(DOW FROM ${auditLogs.timestamp})`, sql`EXTRACT(HOUR FROM ${auditLogs.timestamp})`);

        advancedAnalytics.usagePatterns = {
          hourly: usagePatterns
        };
      }

      const executionTime = Date.now() - startTime;

      // Log de l'accès aux analytics chatbot
      await auditService.logEvent({
        userId: (req.user as AuthenticatedUser).id,
        userRole: (req.user as AuthenticatedUser).role,
        sessionId: req.sessionID,
        eventType: 'admin.action',
        resource: 'chatbot_analytics',
        action: 'READ',
        result: 'success',
        severity: 'low',
        metadata: {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          executionTimeMs: executionTime,
          timeRange,
          userRole,
          includeErrorAnalysis,
          includeFeedbackTrends,
          includeUsagePatterns
        }
      });

      res.json({
        success: true,
        data: advancedAnalytics,
        execution_time_ms: executionTime
      });

    } catch (error) {
      console.error('[GET /admin/chatbot/analytics] Erreur:', error);
      
      await auditService.logEvent({
        userId: (req.user as AuthenticatedUser)?.id || 'unknown',
        userRole: (req.user as AuthenticatedUser)?.role || 'unknown',
        sessionId: req.sessionID,
        eventType: 'system.error',
        resource: 'chatbot_analytics',
        action: 'READ',
        result: 'error',
        severity: 'medium',
        errorDetails: { message: error instanceof Error ? error.message : 'Unknown error' },
        metadata: { ip: req.ip, userAgent: req.get('User-Agent') }
      });

      res.status(500).json({
        success: false,
        error: 'Erreur lors de la récupération des analytics chatbot'
      });
    }
  });

  // ========================================
  // ENDPOINT BONUS: EXPORT DE DONNÉES
  // ========================================
  router.post('/export', async (req, res) => {
    try {
      const startTime = Date.now();
      
      // Validation des données
      const bodyValidation = exportDataSchema.safeParse(req.body);
      if (!bodyValidation.success) {
        return res.status(400).json({
          success: false,
          error: 'Paramètres d\'export invalides',
          details: bodyValidation.error.errors
        });
      }

      const { type, format, startDate, endDate, filters } = bodyValidation.data;
      
      let exportData: string;
      let filename: string;
      let mimeType: string;

      if (type === 'audit_logs') {
        const query: AuditLogsQuery = {
          startDate,
          endDate,
          limit: 10000, // Limite pour éviter la surcharge
          offset: 0,
          sortBy: 'timestamp',
          sortOrder: 'desc',
          includeArchived: false,
          ...filters
        };

        if (format === 'csv') {
          exportData = await auditService.exportAuditLogsCSV(query);
          filename = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
          mimeType = 'text/csv';
        } else {
          const auditQuery = {
            startDate: query.startDate,
            endDate: query.endDate,
            limit: query.limit,
            offset: query.offset,
            sortBy: 'timestamp' as const,
            sortOrder: 'desc' as const,
            includeArchived: false
          };
          const { logs } = await auditService.getAuditLogs(auditQuery);
          exportData = JSON.stringify(logs, null, 2);
          filename = `audit_logs_${new Date().toISOString().split('T')[0]}.json`;
          mimeType = 'application/json';
        }
      } else {
        return res.status(400).json({
          success: false,
          error: 'Type d\'export non supporté'
        });
      }

      const executionTime = Date.now() - startTime;

      // Log de l'export
      await auditService.logEvent({
        userId: (req.user as AuthenticatedUser).id,
        userRole: (req.user as AuthenticatedUser).role,
        sessionId: req.sessionID,
        eventType: 'data.export',
        resource: type,
        action: 'EXPORT',
        result: 'success',
        severity: 'medium',
        metadata: {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          executionTimeMs: executionTime,
          exportType: type,
          format,
          filename,
          dataSize: exportData.length
        }
      });

      // Définir les headers pour le téléchargement
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Length', Buffer.byteLength(exportData));

      res.send(exportData);

    } catch (error) {
      console.error('[POST /admin/export] Erreur:', error);
      
      await auditService.logEvent({
        userId: (req.user as AuthenticatedUser)?.id || 'unknown',
        userRole: (req.user as AuthenticatedUser)?.role || 'unknown',
        sessionId: req.sessionID,
        eventType: 'system.error',
        resource: 'data_export',
        action: 'EXPORT',
        result: 'error',
        severity: 'high',
        errorDetails: { message: error instanceof Error ? error.message : 'Unknown error' },
        metadata: { ip: req.ip, userAgent: req.get('User-Agent') }
      });

      res.status(500).json({
        success: false,
        error: 'Erreur lors de l\'export des données'
      });
    }
  });

  // ========================================
  // 8. POST /api/admin/seed/monday - Seeding intelligent Monday.com
  // ========================================
  router.post('/seed/monday', async (req, res) => {
    try {
      const startTime = Date.now();
      
      // Validation des paramètres
      const bodyValidation = mondaySeedSchema.safeParse(req.body);
      if (!bodyValidation.success) {
        return res.status(400).json({
          success: false,
          error: 'Paramètres de seeding invalides',
          details: bodyValidation.error.errors
        });
      }

      const { forceReseed, entitiesOnly, validateOnly, includeReconciliation } = bodyValidation.data;
      
      // Log du démarrage du seeding
      await auditService.logEvent({
        userId: (req.user as AuthenticatedUser).id,
        userRole: (req.user as AuthenticatedUser).role,
        sessionId: req.sessionID,
        eventType: 'admin.action',
        resource: 'monday_seed',
        action: 'CREATE',
        result: 'success',
        severity: 'high',
        metadata: {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          seedingParams: {
            forceReseed,
            entitiesOnly,
            validateOnly,
            includeReconciliation
          }
        }
      });

      if (validateOnly) {
        // Mode validation seule : vérifier l'état des données existantes
        const validation = {
          summary: await storage.getDashboardStats(), // Utilise méthode existante
          message: "Validation mode: aucune donnée modifiée"
        };

        const executionTime = Date.now() - startTime;

        await auditService.logEvent({
          userId: (req.user as AuthenticatedUser).id,
          userRole: (req.user as AuthenticatedUser).role,
          sessionId: req.sessionID,
          eventType: 'admin.action',
          resource: 'monday_seed',
          action: 'VALIDATE',
          result: 'success',
          severity: 'low',
          metadata: {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            executionTimeMs: executionTime,
            validationResults: validation
          }
        });

        return res.json({
          success: true,
          mode: 'validation_only',
          data: validation,
          execution_time_ms: executionTime
        });
      }

      // Exécution du seeding principal
      const seedResult = await mondaySimpleSeed.executeSeed({ validateOnly });
      
      const executionTime = Date.now() - startTime;

      // Préparer la réponse avec réconciliation si demandée
      const response: any = {
        success: seedResult.success,
        counts: seedResult.counts,
        execution_time_ms: executionTime,
        total_entries_created: Object.values(seedResult.counts).reduce((sum, count) => sum + count, 0)
      };

      if (includeReconciliation && seedResult.reconciliation) {
        response.reconciliation = {
          expected_vs_actual: seedResult.reconciliation,
          analysis_source: "analysis/monday-structure-analysis.json"
        };
      }

      if (seedResult.validation) {
        response.validation = seedResult.validation;
      }

      if (seedResult.errors && seedResult.errors.length > 0) {
        response.warnings = seedResult.errors;
      }

      // Log du résultat du seeding
      await auditService.logEvent({
        userId: (req.user as AuthenticatedUser).id,
        userRole: (req.user as AuthenticatedUser).role,
        sessionId: req.sessionID,
        eventType: 'admin.action',
        resource: 'monday_seed',
        action: 'CREATE',
        result: seedResult.success ? 'success' : 'partial',
        severity: seedResult.success ? 'medium' : 'high',
        metadata: {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          executionTimeMs: executionTime,
          seedingResults: {
            totalEntries: response.total_entries_created,
            entitiesCounts: seedResult.counts,
            hasErrors: seedResult.errors.length > 0,
            errorCount: seedResult.errors.length
          },
          reconciliationIncluded: includeReconciliation
        }
      });

      // Publier événement pour notification temps réel
      if (eventBus) {
        eventBus.publish('admin.monday_seed_completed', {
          data: {
            adminUserId: (req.user as AuthenticatedUser).id,
            success: seedResult.success,
            totalEntries: response.total_entries_created,
            entitiesCounts: seedResult.counts,
            executionTimeMs: executionTime
          }
        });
      }

      res.json(response);

    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error('[POST /admin/seed/monday] Erreur:', error);
      
      await auditService.logEvent({
        userId: (req.user as AuthenticatedUser)?.id || 'unknown',
        userRole: (req.user as AuthenticatedUser)?.role || 'unknown',
        sessionId: req.sessionID,
        eventType: 'system.error',
        resource: 'monday_seed',
        action: 'CREATE',
        result: 'error',
        severity: 'critical',
        errorDetails: { message: error instanceof Error ? error.message : 'Unknown error' },
        metadata: { 
          ip: req.ip, 
          userAgent: req.get('User-Agent'),
          executionTimeMs: executionTime
        }
      });

      res.status(500).json({
        success: false,
        error: 'Erreur lors du seeding Monday.com',
        execution_time_ms: executionTime
      });
    }
  });

  return router;
}