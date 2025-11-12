import { logger } from '../utils/logger';
import { withErrorHandling } from '../utils/error-handler';
import { getAgentPerformanceMetricsService } from './AgentPerformanceMetricsService';
import { getAgentAutoOptimizer } from './AgentAutoOptimizer';
import { getRegressionDetector } from './RegressionDetector';
import type { IStorage } from '../storage-poc';

// ========================================
// TYPES ET INTERFACES
// ========================================

export interface PerformanceAlert {
  id: string;
  type: 'performance_degradation' | 'error_spike' | 'cache_miss' | 'high_latency' | 'optimization_opportunity';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  currentValue: number;
  threshold: number;
  recommendation: string;
  timestamp: Date;
  autoCorrectable: boolean;
}

export interface PerformanceSnapshot {
  timestamp: Date;
  metrics: {
    toolCalls: {
      total: number;
      cacheHitRate: number;
      avgDuration: number;
    };
    context: {
      averageSize: number;
      optimizations: number;
    };
    parallelization: {
      rate: number;
      timeSaved: number;
    };
    aiRequests: {
      total: number;
      avgResponseTime: number;
      cacheHitRate: number;
    };
    runDuration: {
      average: number;
      current: number;
    };
  };
  alerts: PerformanceAlert[];
  healthScore: number; // 0-100
}

// ========================================
// AGENT PERFORMANCE MONITOR
// ========================================

/**
 * Service de monitoring en temps réel des performances de l'agent
 * Détecte les problèmes, génère des alertes et déclenche des optimisations automatiques
 */
export class AgentPerformanceMonitor {
  private storage: IStorage;
  private metricsService: ReturnType<typeof getAgentPerformanceMetricsService>;
  private autoOptimizer: ReturnType<typeof getAgentAutoOptimizer>;
  private regressionDetector: ReturnType<typeof getRegressionDetector>;

  private readonly MONITORING_INTERVAL_MS = 60 * 1000; // 1 minute
  private readonly ALERT_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes
  private lastMonitoringTime: number = 0;
  private lastAlerts: Map<string, number> = new Map(); // alertId -> timestamp

  // Seuils d'alerte
  private readonly THRESHOLDS = {
    cacheHitRate: { warning: 50, critical: 30 },
    avgResponseTime: { warning: 2000, critical: 5000 },
    errorRate: { warning: 5, critical: 10 },
    parallelizationRate: { warning: 30, critical: 20 },
    runDuration: { warning: 30000, critical: 60000 }
  };

  constructor(storage: IStorage) {
    if (!storage) {
      throw new Error('Storage requis pour AgentPerformanceMonitor');
    }
    this.storage = storage;
    this.metricsService = getAgentPerformanceMetricsService(storage);
    this.autoOptimizer = getAgentAutoOptimizer(storage);
    this.regressionDetector = getRegressionDetector(storage);
  }

  /**
   * Génère un snapshot de performance actuel
   */
  async generateSnapshot(): Promise<PerformanceSnapshot> {
    return withErrorHandling(
      async () => {
        const metrics = this.metricsService.getMetrics();
        const alerts = await this.detectAlerts(metrics);
        const healthScore = this.calculateHealthScore(metrics, alerts);

        const parallelizationRate = metrics.parallelization.totalOperations > 0
          ? (metrics.parallelization.parallelized / metrics.parallelization.totalOperations) * 100
          : 0;

        return {
          timestamp: new Date(),
          metrics: {
            toolCalls: {
              total: metrics.toolCalls.total,
              cacheHitRate: metrics.toolCalls.cacheHitRate,
              avgDuration: metrics.toolCalls.averageDuration
            },
            context: {
              averageSize: metrics.context.averageSize,
              optimizations: metrics.context.optimizations
            },
            parallelization: {
              rate: parallelizationRate,
              timeSaved: metrics.parallelization.averageTimeSaved * metrics.parallelization.parallelized
            },
            aiRequests: {
              total: metrics.aiRequests.total,
              avgResponseTime: metrics.aiRequests.averageResponseTime,
              cacheHitRate: metrics.aiRequests.cached / Math.max(metrics.aiRequests.total, 1) * 100
            },
            runDuration: {
              average: metrics.runDuration.average,
              current: metrics.runDuration.longest
            }
          },
          alerts,
          healthScore
        };
      },
      {
        operation: 'generateSnapshot',
        service: 'AgentPerformanceMonitor',
        metadata: {}
      }
    );
  }

  /**
   * Détecte les alertes de performance
   */
  private async detectAlerts(metrics: ReturnType<typeof this.metricsService.getMetrics>): Promise<PerformanceAlert[]> {
    const alerts: PerformanceAlert[] = [];
    const now = Date.now();

    // 1. Cache hit rate faible
    if (metrics.toolCalls.cacheHitRate < this.THRESHOLDS.cacheHitRate.critical && metrics.toolCalls.total > 10) {
      const alertId = 'cache-hit-rate-critical';
      if (!this.isInCooldown(alertId, now)) {
        alerts.push({
          id: alertId,
          type: 'cache_miss',
          severity: 'critical',
          title: 'Cache Hit Rate Critique',
          description: `Cache hit rate très faible: ${metrics.toolCalls.cacheHitRate.toFixed(1)}%`,
          currentValue: metrics.toolCalls.cacheHitRate,
          threshold: this.THRESHOLDS.cacheHitRate.critical,
          recommendation: 'Augmenter TTL cache ou améliorer clés cache',
          timestamp: new Date(),
          autoCorrectable: true
        });
        this.lastAlerts.set(alertId, now);
      }
    } else if (metrics.toolCalls.cacheHitRate < this.THRESHOLDS.cacheHitRate.warning && metrics.toolCalls.total > 20) {
      const alertId = 'cache-hit-rate-warning';
      if (!this.isInCooldown(alertId, now)) {
        alerts.push({
          id: alertId,
          type: 'cache_miss',
          severity: 'medium',
          title: 'Cache Hit Rate Faible',
          description: `Cache hit rate faible: ${metrics.toolCalls.cacheHitRate.toFixed(1)}%`,
          currentValue: metrics.toolCalls.cacheHitRate,
          threshold: this.THRESHOLDS.cacheHitRate.warning,
          recommendation: 'Vérifier stratégie de cache',
          timestamp: new Date(),
          autoCorrectable: true
        });
        this.lastAlerts.set(alertId, now);
      }
    }

    // 2. Latence élevée
    if (metrics.aiRequests.averageResponseTime > this.THRESHOLDS.avgResponseTime.critical && metrics.aiRequests.total > 5) {
      const alertId = 'high-latency-critical';
      if (!this.isInCooldown(alertId, now)) {
        alerts.push({
          id: alertId,
          type: 'high_latency',
          severity: 'critical',
          title: 'Latence Critique',
          description: `Temps de réponse moyen très élevé: ${metrics.aiRequests.averageResponseTime.toFixed(0)}ms`,
          currentValue: metrics.aiRequests.averageResponseTime,
          threshold: this.THRESHOLDS.avgResponseTime.critical,
          recommendation: 'Optimiser requêtes IA ou augmenter parallélisation',
          timestamp: new Date(),
          autoCorrectable: false
        });
        this.lastAlerts.set(alertId, now);
      }
    }

    // 3. Parallélisation sous-utilisée
    const parallelizationRate = metrics.parallelization.totalOperations > 0
      ? (metrics.parallelization.parallelized / metrics.parallelization.totalOperations) * 100
      : 0;
    if (parallelizationRate < this.THRESHOLDS.parallelizationRate.critical && metrics.parallelization.totalOperations > 10) {
      const alertId = 'parallelization-low';
      if (!this.isInCooldown(alertId, now)) {
        alerts.push({
          id: alertId,
          type: 'optimization_opportunity',
          severity: 'medium',
          title: 'Parallélisation Sous-utilisée',
          description: `Taux de parallélisation faible: ${parallelizationRate.toFixed(1)}%`,
          currentValue: parallelizationRate,
          threshold: this.THRESHOLDS.parallelizationRate.critical,
          recommendation: 'Augmenter parallélisation automatique',
          timestamp: new Date(),
          autoCorrectable: true
        });
        this.lastAlerts.set(alertId, now);
      }
    }

    // 4. Vérifier régressions
    try {
      const regressions = await this.regressionDetector.detectPerformanceRegression(1); // Dernières 24h
      for (const regression of regressions) {
        if (regression.severity === 'critical' || regression.severity === 'high') {
          const alertId = `regression-${regression.metric}`;
          if (!this.isInCooldown(alertId, now)) {
            alerts.push({
              id: alertId,
              type: 'performance_degradation',
              severity: regression.severity,
              title: `Régression: ${regression.metric}`,
              description: regression.description,
              currentValue: regression.currentValue,
              threshold: regression.baselineValue,
              recommendation: regression.recommendations.join('; '),
              timestamp: new Date(),
              autoCorrectable: regression.type === 'cache' || regression.type === 'performance'
            });
            this.lastAlerts.set(alertId, now);
          }
        }
      }
    } catch (error) {
      logger.debug('Erreur détection régressions', {
        metadata: {
          service: 'AgentPerformanceMonitor',
          operation: 'detectAlerts',
          error: error instanceof Error ? error.message : String(error)
        }
      });
    }

    return alerts;
  }

  /**
   * Calcule un score de santé global (0-100)
   */
  private calculateHealthScore(
    metrics: ReturnType<typeof this.metricsService.getMetrics>,
    alerts: PerformanceAlert[]
  ): number {
    let score = 100;

    // Pénalités selon métriques
    const cacheHitRate = metrics.toolCalls.cacheHitRate;
    if (cacheHitRate < 30) score -= 30;
    else if (cacheHitRate < 50) score -= 15;
    else if (cacheHitRate < 70) score -= 5;

    const avgResponseTime = metrics.aiRequests.averageResponseTime;
    if (avgResponseTime > 5000) score -= 25;
    else if (avgResponseTime > 2000) score -= 10;

    const parallelizationRate = metrics.parallelization.totalOperations > 0
      ? (metrics.parallelization.parallelized / metrics.parallelization.totalOperations) * 100
      : 0;
    if (parallelizationRate < 20) score -= 15;
    else if (parallelizationRate < 30) score -= 5;

    // Pénalités selon alertes
    for (const alert of alerts) {
      if (alert.severity === 'critical') score -= 20;
      else if (alert.severity === 'high') score -= 10;
      else if (alert.severity === 'medium') score -= 5;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Vérifie si une alerte est en période de cooldown
   */
  private isInCooldown(alertId: string, now: number): boolean {
    const lastAlertTime = this.lastAlerts.get(alertId);
    if (!lastAlertTime) return false;
    return (now - lastAlertTime) < this.ALERT_COOLDOWN_MS;
  }

  /**
   * Exécute le monitoring périodique
   */
  async runPeriodicMonitoring(): Promise<{
    snapshot: PerformanceSnapshot;
    optimizationsApplied: number;
  }> {
    const now = Date.now();
    if (now - this.lastMonitoringTime < this.MONITORING_INTERVAL_MS) {
      // Trop tôt pour ré-monitorer
      const snapshot = await this.generateSnapshot();
      return { snapshot, optimizationsApplied: 0 };
    }

    this.lastMonitoringTime = now;

    return withErrorHandling(
      async () => {
        // 1. Générer snapshot
        const snapshot = await this.generateSnapshot();

        // 2. Appliquer optimisations automatiques si alertes critiques
        const criticalAlerts = snapshot.alerts.filter(a => 
          a.severity === 'critical' && a.autoCorrectable
        );

        let optimizationsApplied = 0;
        if (criticalAlerts.length > 0) {
          try {
            const result = await this.autoOptimizer.applyAutoOptimizations();
            optimizationsApplied = result.applied.filter(a => a.success).length;

            logger.info('Optimisations automatiques appliquées suite à alertes', {
              metadata: {
                service: 'AgentPerformanceMonitor',
                operation: 'runPeriodicMonitoring',
                criticalAlertsCount: criticalAlerts.length,
                optimizationsApplied,
                totalBenefit: result.totalActualBenefit
              }
            });
          } catch (error) {
            logger.debug('Erreur application optimisations automatiques', {
              metadata: {
                service: 'AgentPerformanceMonitor',
                operation: 'runPeriodicMonitoring',
                error: error instanceof Error ? error.message : String(error)
              }
            });
          }
        }

        return { snapshot, optimizationsApplied };
      },
      {
        operation: 'runPeriodicMonitoring',
        service: 'AgentPerformanceMonitor',
        metadata: {}
      }
    );
  }

  /**
   * Récupère les alertes actives
   */
  async getActiveAlerts(): Promise<PerformanceAlert[]> {
    const snapshot = await this.generateSnapshot();
    return snapshot.alerts;
  }

  /**
   * Récupère le score de santé actuel
   */
  async getHealthScore(): Promise<number> {
    const snapshot = await this.generateSnapshot();
    return snapshot.healthScore;
  }

  /**
   * Génère un rapport de performance
   */
  async generatePerformanceReport(): Promise<{
    snapshot: PerformanceSnapshot;
    trends: {
      cacheHitRate: 'improving' | 'degrading' | 'stable';
      responseTime: 'improving' | 'degrading' | 'stable';
      parallelization: 'improving' | 'degrading' | 'stable';
    };
    recommendations: string[];
  }> {
    return withErrorHandling(
      async () => {
        const snapshot = await this.generateSnapshot();
        const historical = await this.metricsService.exportHistoricalMetrics(
          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          new Date()
        );

        // Analyser tendances (mapper increasing/decreasing vers improving/degrading)
        const mapTrend = (trend: 'increasing' | 'decreasing' | 'stable'): 'improving' | 'degrading' | 'stable' => {
          if (trend === 'increasing') {
            // Pour cacheHitRate, increasing = improving; pour responseTime, increasing = degrading
            return 'stable'; // Sera mappé correctement ci-dessous
          }
          if (trend === 'decreasing') {
            return 'stable'; // Sera mappé correctement ci-dessous
          }
          return 'stable';
        };

        const trends = {
          cacheHitRate: historical.summary.trends.cacheHitRate === 'increasing' ? 'improving' as const :
                       historical.summary.trends.cacheHitRate === 'decreasing' ? 'degrading' as const : 'stable' as const,
          responseTime: historical.summary.trends.responseTime === 'increasing' ? 'degrading' as const :
                       historical.summary.trends.responseTime === 'decreasing' ? 'improving' as const : 'stable' as const,
          parallelization: 'stable' as const // À améliorer avec données réelles
        };

        // Générer recommandations
        const recommendations: string[] = [];
        for (const alert of snapshot.alerts) {
          if (alert.severity === 'critical' || alert.severity === 'high') {
            recommendations.push(alert.recommendation);
          }
        }

        // Ajouter recommandations depuis auto-optimizer
        try {
          const opps = await this.autoOptimizer.analyzeOptimizationOpportunities();
          const highPriorityOpps = opps.filter(o => o.priority === 'high' || o.priority === 'critical');
          for (const opp of highPriorityOpps.slice(0, 5)) {
            recommendations.push(opp.suggestedImprovement);
          }
        } catch (error) {
          logger.debug('Erreur récupération opportunités', {
            metadata: {
              service: 'AgentPerformanceMonitor',
              operation: 'generatePerformanceReport',
              error: error instanceof Error ? error.message : String(error)
            }
          });
        }

        return {
          snapshot,
          trends,
          recommendations: Array.from(new Set(recommendations)) // Dédupliquer
        };
      },
      {
        operation: 'generatePerformanceReport',
        service: 'AgentPerformanceMonitor',
        metadata: {}
      }
    );
  }
}

// ========================================
// SINGLETON INSTANCE
// ========================================

let agentPerformanceMonitorInstance: AgentPerformanceMonitor | null = null;

export function getAgentPerformanceMonitor(storage: IStorage): AgentPerformanceMonitor {
  if (!agentPerformanceMonitorInstance) {
    agentPerformanceMonitorInstance = new AgentPerformanceMonitor(storage);
  }
  return agentPerformanceMonitorInstance;
}

