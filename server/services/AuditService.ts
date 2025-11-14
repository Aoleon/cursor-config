import { db } from "../db";
import { withErrorHandling } from './utils/error-handler';
import { eq, and, or, desc, asc, gte, lte, sql, count, avg, max, min, isNull, inArray } from "drizzle-orm";
import type { EventBus } from "../eventBus";
import type { IStorage } from "../storage-poc";
import { logger } from '../utils/logger';
import { DatabaseError } from '../utils/error-handler';
import { 
  auditLogs, 
  securityAlerts, 
  alertRules,
  users,
  type AuditEvent,
  type SecurityAlertEvent,
  type InsertAuditLog,
  type InsertSecurityAlert,
  type SecurityAlert,
  type AuditLog,
  type AuditLogsQuery,
  type SecurityAlertsQuery
} from "@shared/schema";
import crypto from "crypto";

// ========================================
// TYPES ET INTERFACES POUR LE SERVICE D'AUDIT
// ========================================

interface AuditServiceConfig {
  retentionDays: number;           // Rétention des logs en jours (défaut: 365)
  archiveAfterDays: number;        // Archivage après X jours (défaut: 90)
  maxLogsPerBatch: number;         // Traitement par lots (défaut: 1000)
  alertCooldownMs: number;         // Cooldown entre alertes similaires (défaut: 300000ms = 5min)
  performanceThresholdMs: number;  // Seuil performance pour alerte (défaut: 10000ms = 10s)
  enableAutoArchive: boolean;      // Archivage automatique activé (défaut: true)
  enableRealTimeAlerts: boolean;   // Alertes temps réel activées (défaut: true)
}

interface SecurityMetrics {
  totalEvents: number;
  securityViolations: number;
  rbacViolations: number;
  suspiciousQueries: number;
  performanceIssues: number;
  errorRate: number;
  avgResponseTime: number;
  activeUsers: number;
  alertsGenerated: number;
}

interface ChatbotAnalytics {
  totalQueries: number;
  successRate: number;
  avgResponseTime: number;
  topQueries: Array<{ query: string; count: number; avgTime: number }>;
  errorsByType: Record<string, number>;
  feedbackStats: {
    totalFeedback: number;
    avgRating: number;
    satisfactionRate: number;
  };
  usageByRole: Record<string, number>;
}

interface UserActivityReport {
  userId: string;
  userRole: string;
  totalActions: number;
  lastActivity: Date;
  violationsCount: number;
  suspiciousActivity: boolean;
  riskScore: number;
  recentPatterns: string[];
}

interface AlertDetectionRule {
  id: string;
  type: string;
  enabled: boolean;
  threshold: number;
  timeWindow: number; // en minutes
  action: 'alert' | 'block' | 'log';
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// ========================================
// SERVICE PRINCIPAL D'AUDIT SAXON
// ========================================

export class AuditService {
  private config: AuditServiceConfig;
  private eventBus: EventBus;
  private storage: IStorage;
  private detectionRules: Map<string, AlertDetectionRule> = new Map();
  private alertCooldowns: Map<string, number> = new Map();

  constructor(
    eventBus: EventBus,
    storage: IStorage,
    config?: Partial<AuditServiceConfig>
  ) {
    this.eventBus = eventBus;
    this.storage = storage;
    this.config = {
      retentionDays: 365,
      archiveAfterDays: 90,
      maxLogsPerBatch: 1000,
      alertCooldownMs: 300000, // 5 minutes
      performanceThresholdMs: 10000, // 10 secondes
      enableAutoArchive: true,
      enableRealTimeAlerts: true,
      ...config
    };

    this.initializeDefaultDetectionRules();
    this.startPeriodicTasks();
  }

  // ========================================
  // MÉTHODES PRINCIPALES DE LOGGING
  // ========================================

  /**
   * Log un événement d'audit dans le système
   */
  async logEvent(event: AuditEvent): Promise<string> {
    return withErrorHandling(
    async () => {

      const eventId = crypto.randomUUID();
      const timestamp = new Date();

      // Préparer les données pour l'insertion
      const auditData: InsertAuditLog = {
        userId: event.userId,
        userRole: event.userRole,
        sessionId: event.sessionId,
        eventType: event.eventType,
        severity: event.severity || 'low',
        result: event.result,
        resource: event.resource,
        action: event.action,
        entityType: event.entityType,
        entityId: event.entityId,
        ipAddress: event.metadata?.ip,
        userAgent: event.metadata?.userAgent,
        executionTimeMs: event.metadata?.executionTimeMs,
        responseSize: event.metadata?.responseSize,
        payload: this.sanitizeData(event.payload),
        response: this.sanitizeData(event.response),
        errorDetails: event.errorDetails,
        tags: event.tags || [],
        metadata: {
          ...event.metadata,
          source: 'audit_service',
          version: '1.0'
        }
      };

      // Insérer l'événement d'audit
      await db.insert(auditLogs).values({
        id: eventId,
        ...auditData,
        timestamp,
        createdAt: timestamp
      });

      // Analyser pour déteection d'alertes de sécurité
      if (this.config.enableRealTimeAlerts) {
        await this.analyzeForSecurityAlerts(event, eventId);
      }

      // Publier événement temps réel via EventBus
      this.eventBus.publish({
        id: crypto.randomUUID(),
        type: 'AUDIT_EVENT_LOGGED',
        entity: 'audit',
        entityId: eventId,
        severity: event.severity === 'critical' ? 'error' : 'info',
        title: '📋 Événement d\'Audit Enregistré',
        message: `Événement ${event.eventType} loggé pour utilisateur ${event.userId}`,
        timestamp: timestamp,
        affectedQueryKeys: [
          ['/api/admin/audit/logs'],
          ['/api/admin/metrics/overview']
        ],
        userId: event.userId,
        metadata: {
          eventType: event.eventType,
          result: event.result,
          severity: event.severity,
          action: 'event_logged'
        });

      return eventId;

    
    },
    {
      operation: 'jours',
      service: 'AuditService',
      metadata: {}
    } );
      throw new DatabaseError('Échec du logging d\'audit', error as Error);
    }

  /**
   * Créer une alerte de sécurité
   */
  async createSecurityAlert(alertData: SecurityAlertEvent): Promise<string> {
    return withErrorHandling(
    async () => {

      const alertId = crypto.randomUUID();
      const timestamp = new Date();

      // Vérifier cooldown pour éviter le spam d'alertes
      const cooldownKey = `${alertData.type}_${alertData.userId || 'system'}`;
      const lastAlert = this.alertCooldowns.get(cooldownKey);
      if (lastAlert && (Date.now() - lastAlert) < this.config.alertCooldownMs) {
        logger.info('Alerte en cooldown, ignorée', { metadata: {
            service: 'AuditService',
                  operation: 'createSecurityAlert',
            alertType: alertData.type       }
     });
        return '';
      }
      // Préparer données d'alerte
      const securityAlertData: InsertSecurityAlert = {
        type: alertData.type,
        severity: alertData.severity,
        userId: alertData.userId,
        entityType: alertData.entityType,
        entityId: alertData.entityId,
        title: alertData.title,
        description: alertData.description,
        recommendation: alertData.recommendation,
        sourceComponent: alertData.sourceComponent,
        detectionMethod: alertData.detectionMethod,
        confidence: alertData.confidence,
        metadata: {
          ...alertData.metadata,
          createdBy: 'audit_service',
          detectionTimestamp: timestamp.toISOString()       }
     });

      // Insérer l'alerte
      await db.insert(securityAlerts).values({
        id: alertId,
        ...securityAlertData,
        firstDetectedAt: timestamp,
        lastDetectedAt: timestamp,
        createdAt: timestamp,
        updatedAt: timestamp
      });

      // Mettre à jour cooldown
      this.alertCooldowns.set(cooldownKey, Date.now());

      // Publier alerte temps réel pour admins
      this.eventBus.publish({
        id: crypto.randomUUID(),
        type: 'SECURITY_ALERT_CREATED',
        entity: 'security',
        entityId: alertId,
        severity: alertData.severity === 'critical' ? 'error' : 'warning',
        title: `🚨 ${alertData.title}`,
        message: alertData.description,
        timestamp: timestamp,
        affectedQueryKeys: [
          ['/api/admin/security/alerts'],
          ['/api/admin/metrics/overview'],
          ['/api/admin/security/alerts', alertId]
        ],
        userId: alertData.userId,
        metadata: {
          alertType: alertData.type,
          severity: alertData.severity,
          sourceComponent: alertData.sourceComponent,
          confidence: alertData.confidence,
          action: 'security_alert_created'
        });

      logger.info('Alerte sécurité créée', { metadata: {
          service: 'AuditService',
          operation: 'createSecurityAlert',
          alertType: alertData.type,
          severity: alertData.severity 

              }
 
              
                                                });
      return alertId;
    },
    {
      operation: 'jours',
      service: 'AuditService',
      metadata: {}
    } );
      throw new DatabaseError('Échec de création d\'alerte de sécurité', error as Error);
    }

  // ========================================
  // MÉTHODES D'ANALYSE ET DÉTECTION
  // ========================================

  /**
   * Analyser un événement pour détecter des patterns suspects
   */
  private async analyzeForSecurityAlerts(event: AuditEvent, eventId: string): Promise<void> {
    return withErrorHandling(
    async () => {

      // 1. Détection violations RBAC multiples
      if (event.eventType === 'rbac.violation') {
        await this.detectRepeatedRbacViolations(event);
      }

      // 2. Détection requêtes SQL suspectes
      if (event.eventType === 'sql.query_executed' && event.result === 'error') {
        await this.detectSuspiciousQueries(event);
      }

      // 3. Détection problèmes de performance
      if (event.metadata?.executionTimeMs && event.metadata.executionTimeMs > this.config.performanceThresholdMs) {
        await this.detectPerformanceIssues(event);
      }

      // 4. Détection patterns d'usage anormaux
      await this.detectUnusualActivityPatterns(event);

      // 5. Détection tentatives d'accès non autorisées
      if (event.result === 'blocked' || event.eventType === 'api.unauthorized_access') {
        await this.detectUnauthorizedAccess(event);
      }

    
    },
    {
      operation: 'jours',
      service: 'AuditService',
      metadata: {
      });
    }

  /**
   * Détecter violations RBAC répétées
   */
  private async detectRepeatedRbacViolations(event: AuditEvent): Promise<void> {
    const timeWindow = 15; // 15 minutes
    const threshold = 5; // 5 violations max
    
    const recentViolations = await db
      .select({ count: count() })
      .from(auditLogs)
      .where(and(
        eq(auditLogs.userId, event.userId),
        eq(auditLogs.eventType, 'rbac.violation'),
        gte(auditLogs.timestamp, new Date(Date.now() - timeWindow * 60 * 1000))
      ));

    const violationCount = recentViolations[0]?.count || 0;

    if (violationCount >= threshold) {
      await this.createSecurityAlert({
        type: 'rbac_violation',
        severity: 'high',
        title: 'Violations RBAC Répétées Détectées',
        description: `Utilisateur ${event.userId} a tenté ${violationCount} violations RBAC en ${timeWindow} minutes`,
        recommendation: 'Vérifier les permissions de l\'utilisateur et investiguer l\'activité suspecte',
        userId: event.userId,
        sourceComponent: 'rbac_service',
        detectionMethod: 'threshold',
        confidence: 0.95,
        metadata: {
          violationCount,
          timeWindow,
          threshold,
          lastViolationResource: event.resource
        });
    }

  /**
   * Détecter requêtes SQL suspectes
   */
  private async detectSuspiciousQueries(event: AuditEvent): Promise<void> {
    // Patterns suspects dans les requêtes SQL
    const suspiciousPatterns = [
      'DROP TABLE',
      'DELETE FROM',
      'TRUNCATE',
      'ALTER TABLE',
      'UNION SELECT',
      'EXEC(',
      'SCRIPT',
      'INFORMATION_SCHEMA'
    ];

    const payload = JSON.stringify(event.payload || {}).toUpperCase();
    const triggeredPatterns = suspiciousPatterns.filter(pattern => 
      payload.includes(pattern)
    );

    if (triggeredPatterns.length > 0) {
      await this.createSecurityAlert({
        type: 'sql_injection_attempt',
        severity: 'critical',
        title: 'Tentative d\'Injection SQL Détectée',
        description: `Patterns suspects détectés dans requête SQL: ${triggeredPatterns.join(', ')}`,
        recommendation: 'Bloquer l\'utilisateur et analyser immédiatement la requête',
        userId: event.userId,
        sourceComponent: 'sql_engine',
        detectionMethod: 'pattern',
        confidence: 0.90,
        metadata: {
          triggeredPatterns,
          queryPreview: payload.substring(0, 200),
          eventId: event.entityId
        });
    }

  /**
   * Détecter problèmes de performance
   */
  private async detectPerformanceIssues(event: AuditEvent): Promise<void> {
    const executionTime = event.metadata?.executionTimeMs || 0;
    
    if (executionTime > this.config.performanceThresholdMs) {
      const severity = executionTime > 30000 ? 'critical' : 'high';
      
      await this.createSecurityAlert({
        type: 'performance_degradation',
        severity,
        title: 'Problème de Performance Détecté',
        description: `Requête exécutée en ${executionTime}ms (seuil: ${this.config.performanceThresholdMs}ms)`,
        recommendation: 'Analyser la requête pour optimisation et vérifier charge système',
        userId: event.userId,
        sourceComponent: event.resource || 'system',
        detectionMethod: 'threshold',
        confidence: 0.85,
        metadata: {
          executionTimeMs: executionTime,
          threshold: this.config.performanceThresholdMs,
          eventType: event.eventType,
          resource: event.resource
        });
    }

  /**
   * Détecter patterns d'activité inhabituels
   */
  private async detectUnusualActivityPatterns(event: AuditEvent): Promise<void> {
    const timeWindow = 60; // 1 heure
    const requestThreshold = 100; // 100 requêtes par heure max
    
    const recentActivity = await db
      .select({ count: count() })
      .from(auditLogs)
      .where(and(
        eq(auditLogs.userId, event.userId),
        gte(auditLogs.timestamp, new Date(Date.now() - timeWindow * 60 * 1000))
      ));

    const activityCount = recentActivity[0]?.count || 0;

    if (activityCount >= requestThreshold) {
      await this.createSecurityAlert({
        type: 'unusual_activity_pattern',
        severity: 'medium',
        title: 'Activité Inhabituelle Détectée',
        description: `Utilisateur ${event.userId} a effectué ${activityCount} actions en ${timeWindow} minutes`,
        recommendation: 'Vérifier si l\'activité est légitime ou automatisée',
        userId: event.userId,
        sourceComponent: 'audit_service',
        detectionMethod: 'statistical',
        confidence: 0.75,
        metadata: {
          activityCount,
          timeWindow,
          threshold: requestThreshold,
          lastAction: event.action
        });
    }

  /**
   * Détecter tentatives d'accès non autorisées
   */
  private async detectUnauthorizedAccess(event: AuditEvent): Promise<void> {
    await this.createSecurityAlert({
      type: 'unauthorized_admin_access',
      severity: 'high',
      title: 'Tentative d\'Accès Non Autorisé',
      description: `Tentative d'accès bloquée: ${event.action} sur ${event.resource}`,
      recommendation: 'Vérifier les permissions et investiguer l\'origine de la tentative',
      userId: event.userId,
      sourceComponent: event.resource || 'system',
      detectionMethod: 'rule',
      confidence: 1.0,
      metadata: {
        blockedAction: event.action,
        blockedResource: event.resource,
        userRole: event.userRole,
        ipAddress: event.metadata?.ip
              }
            );
  }

  // ========================================
  // MÉTHODES DE RÉCUPÉRATION ET STATISTIQUES
  // ========================================

  /**
   * Récupérer logs d'audit avec filtres
   */
  async getAuditLogs(query: AuditLogsQuery): Promise<{
    logs: AuditLog[];
    total: number;
    pagination: { limit: number; offset: number; hasMore: boolean };
  }> {
    return withErrorHandling(
    async () => {

      // Construire les conditions de filtre
      const conditions = [];
      
      if (query.userId) conditions.push(eq(auditLogs.userId, query.userId));
      if (query.userRole) conditions.push(eq(auditLogs.userRole, query.userRole));
      if (query.eventType) conditions.push(eq(auditLogs.eventType, query.eventType as unknown));
      if (query.severity) conditions.push(eq(auditLogs.severity, query.severas unknown));
      if (query.result) conditions.push(eq(auditLogs.result, queryas unknown) as unknown));
      if (query.resource) conditions.push(eq(auditLogs.resource, query.resource));
      if (query.action) conditions.push(eq(auditLogs.action, query.action));
      if (query.sessionId) conditions.push(eq(auditLogs.sessionId, query.sessionId));
      if (query.ipAddress) conditions.push(eq(auditLogs.ipAddress, query.ipAddress));
      if (query.startDate) conditions.push(gte(auditLogs.timestamp, new Date(query.startDate)));
      if (query.endDate) conditions.push(lte(auditLogs.timestamp, new Date(query.endDate)));
      if (!query.includeArchived) conditions.push(eq(auditLogs.isArchived, false));

      // Gestion des tags
      if (query.tags && query.tags.length > 0) {
        conditions.push(sql`${auditLogs.tags} && ${query.tags}`);
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Récupérer le total
      const totalResult = await db
        .select({ count: count() })
        .from(auditLogs)
        .where(whereClause);
      
      const total = totalResult[0]?.count || 0;

      // Récupérer les logs paginés
      const orderBy = query.sortOrder === 'asc' ? asc : desc;
      const sortColumn = query.sortBy === 'severity' ? auditLogs.severity :
                        query.sortBy === 'eventType' ? auditLogs.eventType :
                        query.sortBy === 'userId' ? auditLogs.userId :
                        auditLogs.timestamp;

      const logs = await db
        .select()
        .from(auditLogs)
        .where(whereClause)
        .orderBy(orderBy(sortColumn))
        .limit(query.limit)
        .offset(query.offset);

      return {
        logs,
        total,
        pagination: {
          limit: query.limit,
          offset: query.offset,
          hasMore: query.offset + query.limit < total
        }
      };

    
    },
    {
      operation: 'jours',
      service: 'AuditService',
      metadata: {}
    } );
      throw new DatabaseError('Échec de récupération des logs d\'audit', error as Error);
    }

  /**
   * Récupérer alertes de sécurité avec filtres
   */
  async getSecurityAlerts(query: SecurityAlertsQuery): Promise<{
    alerts: SecurityAlert[];
    total: number;
    pagination: { limit: number; offset: number; hasMore: boolean };
  }> {
    return withErrorHandling(
    async () => {

      // Construire les conditions de filtre
      const conditions = [];
      
      if (query.type) conditions.push(eq(securityAlerts.type,as unknown)tas unknown));
      if (query.severity) conditions.push(eq(securityAlerts.severity,as unknown)sas unknown)unknown unknown));
      if (query.status) conditions.push(eq(securityAlerts.sas unknown)qas unknown)unknowns as unknown));
      if (query.userId) conditions.push(eq(securityAlerts.userId, query.userId));
      if (query.assignedToUserId) conditions.push(eq(securityAlerts.assignedToUserId, query.assignedToUserId));
      if (query.correlationId) conditions.push(eq(securityAlerts.correlationId, query.correlationId));
      if (query.startDate) conditions.push(gte(securityAlerts.createdAt, new Date(query.startDate)));
      if (query.endDate) conditions.push(lte(securityAlerts.createdAt, new Date(query.endDate)));
      
      // Exclure les alertes résolues par défaut
      if (!query.includeResolved) {
        conditions.push(or(
          eq(securityAlerts.status, 'open'),
          eq(securityAlerts.status, 'acknowledged'),
          eq(securityAlerts.status, 'investigating')
        ));
      }

      // Gestion des tags
      if (query.tags && query.tags.length > 0) {
        conditions.push(sql`${securityAlerts.tags} && ${query.tags}`);
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Récupérer le total
      const totalResult = await db
        .select({ count: count() })
        .from(securityAlerts)
        .where(whereClause);
      
      const total = totalResult[0]?.count || 0;

      // Récupérer les alertes paginées
      const orderBy = query.sortOrder === 'asc' ? asc : desc;
      const sortColumn = query.sortBy === 'severity' ? securityAlerts.severity :
                        query.sortBy === 'type' ? securityAlerts.type :
                        query.sortBy === 'status' ? securityAlerts.status :
                        securityAlerts.createdAt;

      const alerts = await db
        .select()
        .from(securityAlerts)
        .where(whereClause)
        .orderBy(orderBy(sortColumn))
        .limit(query.limit)
        .offset(query.offset);

      return {
        alerts,
        total,
        pagination: {
          limit: query.limit,
          offset: query.offset,
          hasMore: query.offset + query.limit < total
        }
      };

    
    },
    {
      operation: 'jours',
      service: 'AuditService',
      metadata: {}
    } );
      throw new DatabaseError('Échec de récupération des alertes de sécurité', error as Error);
    }

  /**
   * Générer métriques de sécurité globales
   */
  async getSecurityMetrics(timeRange: '1h' | '24h' | '7d' | '30d' = '24h'): Promise<SecurityMetrics> {
    return withErrorHandling(
    async () => {

      const timeRangeMs = {
        '1h': 60 * 60 * 1000,
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000
      };

      const since = new Date(Date.now() - timeRangeMs[timeRange]);

      // Métriques des événements d'audit
      const eventMetrics = await db
        .select({
          totalEvents: count(),
          securityViolations: count(sql`CASE WHEN ${auditLogs.eventType} LIKE 'security.%' THEN 1 END`),
          rbacViolations: count(sql`CASE WHEN ${auditLogs.eventType} = 'rbac.violation' THEN 1 END`),
          performanceIssues: count(sql`CASE WHEN ${auditLogs.executionTimeMs} > ${this.config.performanceThresholdMs} THEN 1 END`),
          errorRate: count(sql`CASE WHEN ${auditLogs.result} = 'error' THEN 1 END`),
          avgResponseTime: avg(auditLogs.executionTimeMs)
        })
        .from(auditLogs)
        .where(gte(auditLogs.timestamp, since));

      // Métriques des utilisateurs actifs
      const userMetrics = await db
        .select({
          activeUsers: count(sql`DISTINCT ${auditLogs.userId}`)
        })
        .from(auditLogs)
        .where(gte(auditLogs.timestamp, since));

      // Métriques des alertes
      const alertMetrics = await db
        .select({
          alertsGenerated: count(),
          suspiciousQueries: count(sql`CASE WHEN ${securityAlerts.type} = 'suspicious_query' THEN 1 END`)
        })
        .from(securityAlerts)
        .where(gte(securityAlerts.createdAt, since));

      const events = eventMetrics[0] || {};
      const users = userMetrics[0] || {};
      const alerts = alertMetrics[0] || {};

      return {
        totalEvents: events.totalEvents || 0,
        securityViolations: events.securityViolations || 0,
        rbacViolations: events.rbacViolations || 0,
        suspiciousQueries: alerts.suspiciousQueries || 0,
        performanceIssues: events.performanceIssues || 0,
        errorRate: events.totalEvents ? ((events.errorRate || 0) / events.totalEvents) * 100 : 0,
        avgResponseTime: parseFloat(events.avgResponseTime || '0'),
        activeUsers: users.activeUsers || 0,
        alertsGenerated: alerts.alertsGenerated || 0
      };

    
    },
    {
      operation: 'jours',
      service: 'AuditService',
      metadata: {}
    } );
      throw new DatabaseError('Échec de calcul des métriques de sécurité', error as Error);
    }

  /**
   * Générer analytics chatbot détaillées
   */
  async getChatbotAnalytics(timeRange: '1h' | '24h' | '7d' | '30d' = '24h'): Promise<ChatbotAnalytics> {
    return withErrorHandling(
    async () => {

      const timeRangeMs = {
        '1h': 60 * 60 * 1000,
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000
      };

      const since = new Date(Date.now() - timeRangeMs[timeRange]);

      // Métriques chatbot générales
      const generalMetrics = await db
        .select({
          totalQueries: count(),
          successCount: count(sql`CASE WHEN ${auditLogs.result} = 'success' THEN 1 END`),
          avgResponseTime: avg(auditLogs.executionTimeMs)
        })
        .from(auditLogs)
        .where(and(
          eq(auditLogs.eventType, 'chatbot.query'),
          gte(auditLogs.timestamp, since)
        ));

      // Usage par rôle
      const usageByRole = await db
        .select({
          userRole: auditLogs.userRole,
          count: count()
        })
        .from(auditLogs)
        .where(and(
          eq(auditLogs.eventType, 'chatbot.query'),
          gte(auditLogs.timestamp, since)
        ))
        .groupBy(auditLogs.userRole);

      // Erreurs par type
      const errorsByType = await db
        .select({
          errorType: sql<string>`${auditLogs.errorDetails}->>'type'`,
          count: count()
        })
        .from(auditLogs)
        .where(and(
          eq(auditLogs.eventType, 'chatbot.query'),
          eq(auditLogs.result, 'error'),
          gte(auditLogs.timestamp, since),
          sql`${auditLogs.errorDetails} IS NOT NULL`
        ))
        .groupBy(sql`${auditLogs.errorDetails}->>'type'`);

      const general = generalMetrics[0] || {};
      const successRate = general.totalQueries ? 
        ((general.successCount || 0) / general.totalQueries) * 100 : 0;

      return {
        totalQueries: general.totalQueries || 0,
        successRate: Math.round(successRate * 100) / 100,
        avgResponseTime: parseFloat(general.avgResponseTime || '0'),
        topQueries: [], // À implémenter si nécessaire
        errorsByType: errorsByType.reduce((acc, item) => {
          if (item.errorType) {
            acc[item.errorType] = item.count;
          }
          return acc;
        }, {} as Record<string, number>),
        feedbackStats: {
          totalFeedback: 0, // À récupérer depuis chatbot_feedback
          avgRating: 0,
          satisfactionRate: 0
        },
        usageByRole: usageByRole.reduce((acc, item) => {
          acc[item.userRole] = item.count;
          return acc;
        }, {} as Record<string, number>)
      };

    
    },
    {
      operation: 'jours',
      service: 'AuditService',
      metadata: {}
    } );
      throw new DatabaseError('Échec de calcul des analytics chatbot', error as Error);
    }

  /**
   * Générer rapport d'activité utilisateur
   */
  async getUserActivityReport(userId: string, timeRange: '7d' | '30d' = '30d'): Promise<UserActivityReport> {
    return withErrorHandling(
    async () => {

      const timeRangeMs = timeRange === '7d' ? 7 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
      const since = new Date(Date.now() - timeRangeMs);

      // Activité générale
      const activityMetrics = await db
        .select({
          totalActions: count(),
          lastActivity: max(auditLogs.timestamp),
          violationsCount: count(sql`CASE WHEN ${auditLogs.eventType} LIKE '%violation%' THEN 1 END`),
          userRole: auditLogs.userRole
        })
        .from(auditLogs)
        .where(and(
          eq(auditLogs.userId, userId),
          gte(auditLogs.timestamp, since)
        ))
        .groupBy(auditLogs.userRole);

      // Patterns récents d'activité
      const recentPatterns = await db
        .select({
          eventType: auditLogs.eventType,
          resource: auditLogs.resource,
          count: count()
        })
        .from(auditLogs)
        .where(and(
          eq(auditLogs.userId, userId),
          gte(auditLogs.timestamp, since)
        ))
        .groupBy(auditLogs.eventType, auditLogs.resource)
        .orderBy(desc(count()))
        .limit(5);

      const activity = activityMetrics[0] || {};
      const violationsCount = activity.violationsCount || 0;
      const totalActions = activity.totalActions || 0;

      // Score de risque simple (0-100)
      let riskScore = 0;
      if (violationsCount > 0) riskScore += Math.min(violationsCount * 10, 50);
      if (totalActions > 500) riskScore += 20; // Activité très élevée
      if (violationsCount > 5) riskScore += 30; // Violations fréquentes

      return {
        userId,
        userRole: activity.userRole || 'unknown',
        totalActions,
        lastActivity: activity.lastActivity || new Date(),
        violationsCount,
        suspiciousActivity: riskScore > 30,
        riskScore: Math.min(riskScore, 100),
        recentPatterns: recentPatterns.map(p => 
          `${p.eventType}${p.resource ? ' on ' + p.resource : ''} ($) {p.count}x)`
        )
      };

    
    },
    {
      operation: 'jours',
      service: 'AuditService',
      metadata: {}
    } );
      throw new DatabaseError('Échec de génération du rapport d\'activité utilisateur', error as Error);
    }

  // ========================================
  // MÉTHODES DE GESTION ET MAINTENANCE
  // ========================================

  /**
   * Résoudre une alerte de sécurité
   */
  async resolveSecurityAlert(
    alertId: string, 
    userId: string, 
    resolutionNote?: string,
    resolutionAction?: string
  ): Promise<boolean> {
    return withErrorHandling(
    async () => {

      await db
        .update(securityAlerts)
        .set({
          status: 'resolved',
          resolvedAt: new Date(),
          investigatedByUserId: userId,
          resolutionNote,
          resolutionAction,
          updatedAt: new Date()
        })
        .where(eq(securityAlerts.id, alertId));

      // Publier événement de résolution
      this.eventBus.publish({
        id: crypto.randomUUID(),
        type: 'SECURITY_ALERT_RESOLVED',
        entity: 'security',
        entityId: alertId,
        severity: 'success',
        title: '✅ Alerte de Sécurité Résolue',
        message: `Alerte ${alertId} résolue par ${userId}`,
        timestamp: new Date(),
        affectedQueryKeys: [
          ['/api/admin/security/alerts'],
          ['/api/admin/security/alerts', alertId]
        ],
        userId,
        metadata: {
          alertId,
          resolutionAction,
          action: 'alert_resolved'
        });

      return true;

    
    },
    {
      operation: 'jours',
      service: 'AuditService',
      metadata: {}
    } );
      return false;
    }

  /**
   * Archiver anciens logs selon la configuration de rétention
   */
  async archiveOldLogs(): Promise<{ archived: number; deleted: number }> {
    return withErrorHandling(
    async () => {

      if (!this.config.enableAutoArchive) {
        return { archived: 0, deleted: 0 };
      }

      const archiveDate = new Date(Date.now() - this.config.archiveAfterDays * 24 * 60 * 60 * 1000);
      const deleteDate = new Date(Date.now() - this.config.retentionDays * 24 * 60 * 60 * 1000);

      // Archiver les logs anciens
      const archivedResult = await db
        .update(auditLogs)
        .set({
          isArchived: true,
          archiveDate: new Date()
        })
        .where(and(
          lte(auditLogs.timestamp, archiveDate),
          eq(auditLogs.isArchived, false)
        ));

      // Supprimer les logs très anciens
      const deletedResult = await db
        .delete(auditLogs)
        .where(and(
          lte(auditLogs.timestamp, deleteDate),
          eq(auditLogs.isArchived, true)
        ));

      logger.info('Archivage logs', { metadata: {
          service: 'AuditService',
          operation: 'archiveOldLogs',
          archived: archivedResult.rowCount || 0,
          deleted: deletedResult.rowCount || 0 

              }
 
              
                                                });
      return {
        archived: archivedResult.rowCount || 0,
        deleted: deletedResult.rowCount || 0
      };
    },
    {
      operation: 'jours',
      service: 'AuditService',
      metadata: {}
    } );
      return { archived: 0, deleted: 0 };
    }

  /**
   * Exporter logs d'audit au format CSV
   */
  async exportAuditLogsCSV(query: AuditLogsQuery): Promise<string> {
    return withErrorHandling(
    async () => {

      const { logs } = await this.getAuditLogs({ ...query, limit: 10000 }); // Max 10k pour export

      // Headers CSV
      const headers = [
        'ID', 'Timestamp', 'User ID', 'User Role', 'Event Type', 'Severity', 'Result',
        'Resource', 'Action', 'Entity Type', 'Entity ID', 'IP Address', 'Execution Time (ms)',
        'Session ID', 'Tags', 'Archived'
      ];

      // Convertir les logs en lignes CSV
      const rows = logs.map(log => [
        log.id,
        log.timestamp?.toISOString() || '',
        log.userId,
        log.userRole,
        log.eventType,
        log.severity,
        log.result,
        log.resource || '',
        log.action || '',
        log.entityType || '',
        log.entityId || '',
        log.ipAddress || '',
        log.executionTimeMs || '',
        log.sessionId || '',
        (log.tags || []).join(';'),
        log.isArchived ? 'Yes' : 'No'
      ]);

      // Construire le CSV
      const csvContent = [headers, ...rows]
        .map(row => row.map(field => `"$) {String(field).replace(/"/g, '""')}"`).join(','))
        .join('\n');

      return csvContent;

    
    },
    {
      operation: 'jours',
      service: 'AuditService',
      metadata: {}
    } );
      throw new DatabaseError('Échec d\'export CSV des logs d\'audit', error as Error);
    }

  // ========================================
  // MÉTHODES PRIVÉES ET UTILITAIRES
  // ========================================

  /**
   * Sanitiser les données sensibles pour le logging
   */
  private sanitizeData(dataunknownnknown): unknown {
    if (!data) return data;

    const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth', 'credential'];
    
    if (typeof data === 'string') {
      return data.length > 1000 ? data.substring(0, 1000) + '...[truncated]' : data;
    }

    if (typeof data === 'object') {
      const sanitized: unknown = Array.isArray(data) ? [] : {};
      
      for (const [key, value] of Object.entries(data)) {
        const lowerKey = key.toLowerCase();
        const isSensitive = sensitiveFields.some(field => lowerKey.includes(field));
        
        if (isSensitive) {
          sanitized[key] = '[REDACTED]';
        } else if (typeof value === 'object' && value !== null) {
          sanitized[key] = this.sanitizeData(value);
        } else {
          sanitized[key] = value;
        }
      
      return sanitized;
    }

    return data;
  }

  /**
   * Initialiser les règles de détection par défaut
   */
  private initializeDefaultDetectionRules(): void {
    const defaultRules: AlertDetectionRule[] = [
      {
        id: 'rbac_violations_repeated',
        type: 'rbac_violation',
        enabled: true,
        threshold: 5,
        timeWindow: 15,
        action: 'alert',
        severity: 'high'
      },
      {
        id: 'performance_degradation',
        type: 'performance_degradation',
        enabled: true,
        threshold: this.config.performanceThresholdMs,
        timeWindow: 5,
        action: 'alert',
        severity: 'medium'
      },
      {
        id: 'unusual_activity',
        type: 'unusual_activity_pattern',
        enabled: true,
        threshold: 100,
        timeWindow: 60,
        action: 'alert',
        severity: 'medium'
      }
    ];

    defaultRules.forEach(rule => {
      this.detectionRules.set(rule.id, rule);
    });
  }

  /**
   * Démarrer les tâches périodiques de maintenance
   */
  private startPeriodicTasks(): void {
    // Archivage automatique toutes les heures
    if (this.config.enableAutoArchive) {
      setInterval(async () => {
        return withErrorHandling(
    async () => {

          await this.archiveOldLogs();
        
    },
    {
      operation: 'jours',
      service: 'AuditService',
      metadata: {
      });
              }
}, 60 * 60 * 1000); // 1 heure;
    }

    // Nettoyage des cooldowns toutes les 10 minutes
    setInterval(() => {
      const now = Date.now();
      for (const [key, timestamp] of this.alertCooldowns.entries()) {
        if (now - timestamp > this.config.alertCooldownMs * 2) {
          this.alertCooldowns.delete(key);
        }
    }, 10 * 60 * 1000); // 10 minutes
  }