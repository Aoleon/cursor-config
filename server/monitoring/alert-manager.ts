/**
 * Système de gestion des alertes basé sur des règles configurables
 * Analyse les métriques et déclenche des alertes selon des seuils
 */

import { logger } from '../utils/logger';
import { withErrorHandling } from '../utils/error-handler';
import { ErrorEvent, ErrorMetrics, TimeWindowMetrics } from './error-collector';

// ========================================
// TYPES ET INTERFACES
// ========================================

export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low';
export type AlertAction = 'email' | 'log' | 'webhook' | 'slack';
export type AlertStatus = 'active' | 'resolved' | 'acknowledged';

export interface AlertRule {
  id: string;
  name: string;
  description?: string;
  condition: (metrics: AlertMetrics) => boolean;
  severity: AlertSeverity;
  cooldown: number;  // Minutes avant re-alerte
  action: AlertAction | AlertAction[];
  enabled: boolean;
  metadata?: Record<string, unknown>;
}

export interface Alert {
  id: string;
  ruleId: string;
  name: string;
  severity: AlertSeverity;
  status: AlertStatus;
  triggeredAt: Date;
  resolvedAt?: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  metrics: AlertMetrics;
  message: string;
  details?: Record<string, unknown>;
  notificationsSent: number;
  lastNotificationAt?: Date;
}

export interface AlertMetrics {
  errorRate: number;
  errorRateTrend: 'increasing' | 'stable' | 'decreasing';
  totalErrors: number;
  criticalErrors: number;
  dbErrors: number;
  apiErrors: number;
  authErrors: number;
  validationErrors: number;
  aiFailures: number;
  rateLimitHits: number;
  circuitBreakersOpen: number;
  responseTimeP95?: number;
  responseTimeP99?: number;
  cpuUsage?: number;
  memoryUsage?: number;
  activeUsers?: number;
  [key: string]: unknown;
}

// ========================================
// RÈGLES D'ALERTE PRÉDÉFINIES
// ========================================

const DEFAULT_ALERT_RULES: AlertRule[] = [
  {
    id: 'high_error_rate',
    name: 'Taux d\'erreur élevé',
    description: 'Le taux d\'erreur dépasse 10 erreurs par minute',
    condition: (m) => m.errorRate > 10,
    severity: 'critical',
    cooldown: 15,
    action: ['email', 'slack'],
    enabled: true,
    metadata: {
      threshold: 10,
      unit: 'errors/min'
    }
  },
  {
    id: 'critical_error_surge',
    name: 'Augmentation d\'erreurs critiques',
    description: 'Plus de 5 erreurs critiques en 1 minute',
    condition: (m) => m.criticalErrors > 5,
    severity: 'critical',
    cooldown: 10,
    action: ['email', 'slack'],
    enabled: true
  },
  {
    id: 'database_connection_issues',
    name: 'Problème de connexion base de données',
    description: 'Plus de 5 erreurs de base de données en 5 minutes',
    condition: (m) => m.dbErrors > 5,
    severity: 'critical',
    cooldown: 5,
    action: ['email', 'slack'],
    enabled: true
  },
  {
    id: 'ai_service_failures',
    name: 'Échecs des services IA',
    description: 'Plus de 3 échecs d\'API IA en 5 minutes',
    condition: (m) => m.aiFailures > 3,
    severity: 'high',
    cooldown: 10,
    action: ['log', 'slack'],
    enabled: true
  },
  {
    id: 'rate_limit_threshold',
    name: 'Seuil de rate limiting atteint',
    description: 'Plus de 50 hits de rate limit en 5 minutes',
    condition: (m) => m.rateLimitHits > 50,
    severity: 'medium',
    cooldown: 30,
    action: 'log',
    enabled: true
  },
  {
    id: 'auth_failures',
    name: 'Échecs d\'authentification',
    description: 'Plus de 10 échecs d\'auth en 5 minutes',
    condition: (m) => m.authErrors > 10,
    severity: 'high',
    cooldown: 15,
    action: ['log', 'email'],
    enabled: true,
    metadata: {
      possibleAttack: true
    }
  },
  {
    id: 'circuit_breakers_open',
    name: 'Circuit breakers ouverts',
    description: 'Au moins un circuit breaker est ouvert',
    condition: (m) => m.circuitBreakersOpen > 0,
    severity: 'high',
    cooldown: 5,
    action: ['log', 'slack'],
    enabled: true
  },
  {
    id: 'slow_response_time',
    name: 'Temps de réponse lent',
    description: 'P95 > 2000ms ou P99 > 5000ms',
    condition: (m) => (m.responseTimeP95 || 0) > 2000 || (m.responseTimeP99 || 0) > 5000,
    severity: 'medium',
    cooldown: 20,
    action: 'log',
    enabled: true
  },
  {
    id: 'high_memory_usage',
    name: 'Utilisation mémoire élevée',
    description: 'Utilisation mémoire > 85%',
    condition: (m) => (m.memoryUsage || 0) > 85,
    severity: 'medium',
    cooldown: 30,
    action: 'log',
    enabled: true
  },
  {
    id: 'api_degradation',
    name: 'Dégradation des API',
    description: 'Taux d\'erreur API > 15% du total',
    condition: (m) => m.totalErrors > 0 && (m.apiErrors / m.totalErrors) > 0.15,
    severity: 'high',
    cooldown: 15,
    action: ['log', 'email'],
    enabled: true
  },
  {
    id: 'error_rate_increasing',
    name: 'Augmentation du taux d\'erreur',
    description: 'Le taux d\'erreur augmente rapidement',
    condition: (m) => m.errorRateTrend === 'increasing' && m.errorRate > 5,
    severity: 'medium',
    cooldown: 20,
    action: 'log',
    enabled: true
  },
  {
    id: 'validation_errors_spike',
    name: 'Pic d\'erreurs de validation',
    description: 'Plus de 20 erreurs de validation en 1 minute',
    condition: (m) => m.validationErrors > 20,
    severity: 'low',
    cooldown: 30,
    action: 'log',
    enabled: true
  }
];

// ========================================
// CLASSE PRINCIPALE ALERT MANAGER
// ========================================

export class AlertManager {
  private rules: Map<string, AlertRule> = new Map();
  private activeAlerts: Map<string, Alert> = new Map();
  private alertHistory: Alert[] = [];
  private cooldowns: Map<string, Date> = new Map();
  private metricsProvider?: () => AlertMetrics;
  private notificationCallbacks: Map<AlertAction, (alert: Alert) => Promise<void>> = new Map();
  private checkInterval: NodeJS.Timeout | null = null;
  private checkIntervalMs = 30000;  // Vérifier toutes les 30 secondes

  constructor() {
    // Charger les règles par défaut
    this.loadDefaultRules();
  }

  /**
   * Charge les règles par défaut
   */
  private loadDefaultRules(): void {
    DEFAULT_ALERT_RULES.forEach(rule => {
      this.rules.set(rule.id, rule);
    });
  }

  /**
   * Configure le fournisseur de métriques
   */
  setMetricsProvider(provider: () => AlertMetrics): void {
    this.metricsProvider = provider;
  }

  /**
   * Enregistre un callback pour un type d'action
   */
  registerNotificationHandler(action: AlertAction, handler: (alert: Alert) => Promise<void>): void {
    this.notificationCallbacks.set(action, handler);
  }

  /**
   * Démarre la vérification périodique des alertes
   */
  start(): void {
    if (this.checkInterval) {
      return;  // Déjà démarré
    }

    logger.info('Démarrage du gestionnaire d\'alertes', { metadata: {
        service: 'AlertManager',
        rulesCount: this.rules.size,
        intervalMs: this.checkIntervalMs
            }

            });

    // Vérification immédiate
    this.checkAlerts();

    // Vérifications périodiques
    this.checkInterval = setInterval(() => {
      this.checkAlerts();
    }, this.checkIntervalMs);
  }

  /**
   * Arrête la vérification périodique
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      
      logger.info('Arrêt du gestionnaire d\'alertes', { metadata: {
          service: 'AlertManager'
              }

            });
    }
  }

  /**
   * Vérifie toutes les règles d'alerte
   */
  async checkAlerts(): Promise<void> {
    if (!this.metricsProvider) {
      logger.warn('Aucun fournisseur de métriques configuré');
      return;
    }

    const metrics = this.metricsProvider();
    const now = new Date();

    // Parcourir toutes les règles actives
    for (const rule of this.rules.values()) {
      if (!rule.enabled) {
        continue;
      }

      return withErrorHandling(
    async () => {

        await this.checkRule(rule, metrics, now);
      
    },
    {
      operation: 'async',
      service: 'alert-manager',
      metadata: {}
    });
    }

    // Résoudre les alertes qui ne sont plus déclenchées
    this.resolveInactiveAlerts(metrics);
  }

  /**
   * Vérifie une règle spécifique
   */
  private async checkRule(rule: AlertRule, metrics: AlertMetrics, now: Date): Promise<void> {
    const isTriggered = rule.condition(metrics);
    const existingAlert = this.activeAlerts.get(rule.id);

    if (isTriggered) {
      if (!existingAlert) {
        // Nouvelle alerte
        await this.triggerAlert(rule, metrics, now);
      } else if (this.shouldResendNotification(existingAlert, rule, now)) {
        // Re-envoyer notification si cooldown expiré
        await this.resendNotification(existingAlert, rule);
      }
    } else if (existingAlert && existingAlert.status === 'active') {
      // L'alerte n'est plus déclenchée, la marquer comme résolue
      this.resolveAlert(existingAlert, now);
    }
  }

  /**
   * Déclenche une nouvelle alerte
   */
  private async triggerAlert(rule: AlertRule, metrics: AlertMetrics, now: Date): Promise<void> {
    // Vérifier le cooldown global de la règle
    const cooldownUntil = this.cooldowns.get(rule.id);
    if (cooldownUntil && cooldownUntil > now) {
      return;  // Encore en cooldown
    }

    const alert: Alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      ruleId: rule.id,
      name: rule.name,
      severity: rule.severity,
      status: 'active',
      triggeredAt: now,
      metrics: { ...metrics },
      message: this.formatAlertMessage(rule, metrics),
      details: {
        rule: {
          description: rule.description,
          metadata: rule.metadata
        },
        metrics: this.getRelevantMetrics(rule, metrics)
      },
      notificationsSent: 0,
      lastNotificationAt: undefined
    };

    // Ajouter à la liste des alertes actives
    this.activeAlerts.set(rule.id, alert);
    this.alertHistory.push(alert);

    // Envoyer les notifications
    await this.sendNotifications(alert, rule);

    // Mettre à jour le cooldown
    const cooldownMs = rule.cooldown * 60 * 1000;
    this.cooldowns.set(rule.id, new Date(now.getTime() + cooldownMs));

    logger.warn(`Alerte déclenchée: ${rule.name}`, { metadata: {
        service: 'AlertManager',
        alertId: alert.id,
        severity: alert.severity,
        metrics: alert.details?.metrics
            }

            });
  }

  /**
   * Formate le message d'alerte
   */
  private formatAlertMessage(rule: AlertRule, metrics: AlertMetrics): string {
    let message = rule.description || rule.name;
    
    // Ajouter des détails contextuels
    if (rule.id === 'high_error_rate') {
      message += ` (Actuel: ${metrics.errorRate.toFixed(1)} erreurs/min)`;
    } else if (rule.id === 'critical_error_surge') {
      message += ` (${metrics.criticalErrors} erreurs critiques détectées)`;
    } else if (rule.id === 'database_connection_issues') {
      message += ` (${metrics.dbErrors} erreurs DB)`;
    } else if (rule.id === 'ai_service_failures') {
      message += ` (${metrics.aiFailures} échecs IA)`;
    } else if (rule.id === 'rate_limit_threshold') {
      message += ` (${metrics.rateLimitHits} hits)`;
    } else if (rule.id === 'circuit_breakers_open') {
      message += ` (${metrics.circuitBreakersOpen} circuit(s) ouvert(s))`;
    } else if (rule.id === 'slow_response_time') {
      message += ` (P95: ${metrics.responseTimeP95}ms, P99: ${metrics.responseTimeP99}ms)`;
    }
    
    return message;
  }

  /**
   * Récupère les métriques pertinentes pour une règle
   */
  private getRelevantMetrics(rule: AlertRule, metrics: AlertMetrics): Record<string, unknown> {
    const relevant: Record<string, unknown> = {};
    
    // Métriques communes
    relevant.errorRate = metrics.errorRate;
    relevant.totalErrors = metrics.totalErrors;
    
    // Métriques spécifiques selon la règle
    switch (rule.id) {
      case 'high_error_rate':
      case 'error_rate_increasing':
        relevant.errorRateTrend = metrics.errorRateTrend;
        break;
      case 'critical_error_surge':
        relevant.criticalErrors = metrics.criticalErrors;
        break;
      case 'database_connection_issues':
        relevant.dbErrors = metrics.dbErrors;
        break;
      case 'ai_service_failures':
        relevant.aiFailures = metrics.aiFailures;
        break;
      case 'rate_limit_threshold':
        relevant.rateLimitHits = metrics.rateLimitHits;
        break;
      case 'auth_failures':
        relevant.authErrors = metrics.authErrors;
        break;
      case 'circuit_breakers_open':
        relevant.circuitBreakersOpen = metrics.circuitBreakersOpen;
        break;
      case 'slow_response_time':
        relevant.responseTimeP95 = metrics.responseTimeP95;
        relevant.responseTimeP99 = metrics.responseTimeP99;
        break;
      case 'high_memory_usage':
        relevant.memoryUsage = metrics.memoryUsage;
        relevant.cpuUsage = metrics.cpuUsage;
        break;
      case 'api_degradation':
        relevant.apiErrors = metrics.apiErrors;
        relevant.apiErrorRate = metrics.totalErrors > 0 ? 
          (metrics.apiErrors / metrics.totalErrors * 100).toFixed(1) + '%' : '0%';
        break;
      case 'validation_errors_spike':
        relevant.validationErrors = metrics.validationErrors;
        break;
    }
    
    return relevant;
  }

  /**
   * Envoie les notifications pour une alerte
   */
  private async sendNotifications(alert: Alert, rule: AlertRule): Promise<void> {
    const actions = Array.isArray(rule.action) ? rule.action : [rule.action];
    
    for (const action of actions) {
      const handler = this.notificationCallbacks.get(action);
      
      if (handler) {
        await withErrorHandling(
          async () => {
            await handler(alert);
            alert.notificationsSent++;
            alert.lastNotificationAt = new Date();
          },
          {
            operation: 'sendNotification',
            service: 'alert-manager',
            metadata: { action, alertId: alert.id },
          }
        );
      } else if (action === 'log') {
        // Log par défaut si pas de handler
        this.logAlert(alert);
        alert.notificationsSent++;
        alert.lastNotificationAt = new Date();
      }
    }
  }

  /**
   * Log une alerte
   */
  private logAlert(alert: Alert): void {
    const logLevel = alert.severity === 'critical' ? 'fatal' :
                    alert.severity === 'high' ? 'error' :
                    alert.severity === 'medium' ? 'warn' : 'info';
    
    const logContext = {
      service: 'AlertManager',
      metadata: {
        alertId: alert.id,
        ruleId: alert.ruleId,
        severity: alert.severity,
        status: alert.status,
        metrics: alert.details?.metrics,
      },
    };
    
    const message = `🚨 ALERTE [${alert.severity.toUpperCase()}]: ${alert.message}`;
    
    switch (logLevel) {
      case 'fatal':
        logger.fatal(message, undefined, logContext);
        break;
      case 'error':
        logger.error(message, undefined, logContext);
        break;
      case 'warn':
        logger.warn(message, logContext);
        break;
      default:
        logger.info(message, logContext);
    }
  }

  /**
   * Détermine si une notification doit être renvoyée
   */
  private shouldResendNotification(alert: Alert, rule: AlertRule, now: Date): boolean {
    if (!alert.lastNotificationAt) {
      return false;
    }
    
    const cooldownMs = rule.cooldown * 60 * 1000;
    const nextNotificationTime = new Date(alert.lastNotificationAt.getTime() + cooldownMs);
    
    return now >= nextNotificationTime;
  }

  /**
   * Renvoie une notification pour une alerte existante
   */
  private async resendNotification(alert: Alert, rule: AlertRule): Promise<void> {
    await this.sendNotifications(alert, rule);
    
    logger.info(`Notification renvoyée pour l'alerte: ${alert.name}`, { metadata: {
        service: 'AlertManager',
        alertId: alert.id,
        notificationsSent: alert.notificationsSent
            }

            });
  }

  /**
   * Résout une alerte
   */
  private resolveAlert(alert: Alert, now: Date): void {
    alert.status = 'resolved';
    alert.resolvedAt = now;
    
    logger.info(`Alerte résolue: ${alert.name}`, { metadata: {
        service: 'AlertManager',
        alertId: alert.id,
        duration: now.getTime() - alert.triggeredAt.getTime()
            }

            });
    
    // Retirer de la liste des alertes actives
    this.activeAlerts.delete(alert.ruleId);
  }

  /**
   * Résout les alertes qui ne sont plus actives
   */
  private resolveInactiveAlerts(metrics: AlertMetrics): void {
    const now = new Date();
    
    for (const [ruleId, alert] of this.activeAlerts.entries()) {
      const rule = this.rules.get(ruleId);
      
      if (rule && !rule.condition(metrics) && alert.status === 'active') {
        this.resolveAlert(alert, now);
      }
    }
  }

  /**
   * Reconnaît une alerte (acknowledge)
   */
  acknowledgeAlert(alertId: string, userId: string): boolean {
    const alert = Array.from(this.activeAlerts.values()).find(a => a.id === alertId);
    
    if (alert && alert.status === 'active') {
      alert.status = 'acknowledged';
      alert.acknowledgedAt = new Date();
      alert.acknowledgedBy = userId;
      
      logger.info(`Alerte reconnue: ${alert.name}`, { metadata: {
          service: 'AlertManager',
          alertId: alert.id,
          acknowledgedBy: userId
              }

            });
      
      return true;
    }
    
    return false;
  }

  // ========================================
  // MÉTHODES PUBLIQUES POUR RÉCUPÉRER LES DONNÉES
  // ========================================

  /**
   * Récupère toutes les alertes actives
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * Récupère l'historique des alertes
   */
  getAlertHistory(options?: {
    severity?: AlertSeverity;
    limit?: number;
    since?: Date;
  }): Alert[] {
    let filtered = [...this.alertHistory];
    
    if (options?.severity) {
      filtered = filtered.filter(a => a.severity === options.severity);
    }
    
    if (options?.since) {
      filtered = filtered.filter(a => a.triggeredAt >= options.since!);
    }
    
    if (options?.limit) {
      filtered = filtered.slice(-options.limit);
    }
    
    return filtered.reverse();
  }

  /**
   * Récupère une alerte par ID
   */
  getAlert(alertId: string): Alert | undefined {
    return this.alertHistory.find(a => a.id === alertId);
  }

  /**
   * Récupère toutes les règles
   */
  getRules(): AlertRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Active/désactive une règle
   */
  setRuleEnabled(ruleId: string, enabled: boolean): boolean {
    const rule = this.rules.get(ruleId);
    
    if (rule) {
      rule.enabled = enabled;
      
      logger.info(`Règle ${enabled ? 'activée' : 'désactivée'}: ${rule.name}`, { metadata: {
          service: 'AlertManager',
          ruleId
              }

            });
      
      return true;
    }
    
    return false;
  }

  /**
   * Ajoute une règle personnalisée
   */
  addRule(rule: AlertRule): void {
    this.rules.set(rule.id, rule);
    
    logger.info(`Nouvelle règle ajoutée: ${rule.name}`, { metadata: {
        service: 'AlertManager',
        ruleId: rule.id,
        severity: rule.severity
            }

            });
  }

  /**
   * Supprime une règle
   */
  removeRule(ruleId: string): boolean {
    const rule = this.rules.get(ruleId);
    
    if (rule) {
      this.rules.delete(ruleId);
      this.activeAlerts.delete(ruleId);
      this.cooldowns.delete(ruleId);
      
      logger.info(`Règle supprimée: ${rule.name}`, { metadata: {
          service: 'AlertManager',
          ruleId
              }

            });
      
      return true;
    }
    
    return false;
  }

  /**
   * Réinitialise le gestionnaire
   */
  reset(): void {
    this.activeAlerts.clear();
    this.alertHistory = [];
    this.cooldowns.clear();
  }

  /**
   * Nettoie et arrête le service
   */
  dispose(): void {
    this.stop();
    this.reset();
  }
}

// Instance singleton
let alertManagerInstance: AlertManager | null = null;

export function getAlertManager(): AlertManager {
  if (!alertManagerInstance) {
    alertManagerInstance = new AlertManager();
  }
  return alertManagerInstance;
}