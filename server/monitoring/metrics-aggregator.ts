/**
 * Service d'agrégation et d'analyse des métriques
 * Collecte et agrège les métriques de performance et d'erreur
 */

import { logger } from '../utils/logger';
import { getErrorCollector, ErrorMetrics, TimeWindowMetrics, ErrorCategory, ErrorLevel } from './error-collector';
import { getAlertManager, Alert, AlertMetrics } from './alert-manager';
import { CircuitBreakerManager } from '../utils/circuit-breaker';

// ========================================
// TYPES ET INTERFACES
// ========================================

export interface PerformanceMetrics {
  responseTime: {
    p50: number;
    p95: number;
    p99: number;
    mean: number;
    min: number;
    max: number;
  };
  throughput: {
    requestsPerSecond: number;
    requestsPerMinute: number;
    totalRequests: number;
  };
  database: {
    avgQueryTime: number;
    slowQueries: number;
    connectionPoolSize: number;
    activeConnections: number;
  };
  api: {
    aiServiceLatency: number;
    externalApiLatency: number;
    failureRate: number;
  };
}

export interface BusinessMetrics {
  users: {
    activeUsers: number;
    newUsersToday: number;
    totalUsers: number;
    sessionsPerUser: number;
  };
  projects: {
    projectsCreated: number;
    projectsCompleted: number;
    averageCompletionTime: number;
  };
  quotes: {
    quotesGenerated: number;
    quotesConverted: number;
    conversionRate: number;
  };
  documents: {
    documentsProcessed: number;
    ocrProcessed: number;
    averageProcessingTime: number;
  };
}

export interface SystemMetrics {
  uptime: number;
  cpuUsage: number;
  memoryUsage: {
    used: number;
    total: number;
    percentage: number;
  };
  diskUsage: {
    used: number;
    total: number;
    percentage: number;
  };
  circuitBreakers: {
    total: number;
    open: number;
    halfOpen: number;
    closed: number;
  };
  rateLimiting: {
    totalHits: number;
    blockedRequests: number;
    topLimitedEndpoints: Array<{
      endpoint: string;
      hits: number;
    }>;
  };
}

export interface AggregatedMetrics {
  timestamp: Date;
  current: {
    errorRate: number;
    responseTimeP95: number;
    throughput: number;
    activeAlerts: number;
  };
  errors: ErrorMetrics;
  performance: PerformanceMetrics;
  business: BusinessMetrics;
  system: SystemMetrics;
  trends: {
    errorRateTrend: 'increasing' | 'stable' | 'decreasing';
    performanceTrend: 'improving' | 'stable' | 'degrading';
    trafficTrend: 'increasing' | 'stable' | 'decreasing';
  };
  alerts: Alert[];
  timeline: TimeSeriesData[];
}

export interface TimeSeriesData {
  timestamp: Date;
  errorCount: number;
  requestCount: number;
  responseTime: number;
  errorRate: number;
}

// ========================================
// CLASSE PRINCIPALE METRICS AGGREGATOR
// ========================================

export class MetricsAggregator {
  private errorCollector = getErrorCollector();
  private alertManager = getAlertManager();
  private circuitBreakerManager = CircuitBreakerManager.getInstance();
  
  // Stockage des métriques temporelles
  private timeSeriesData: TimeSeriesData[] = [];
  private responseTimes: number[] = [];
  private requestCounts = new Map<string, number>();
  private rateLimitHits = new Map<string, number>();
  
  // Métriques business (simulées pour l'instant)
  private businessData = {
    activeUsers: new Set<string>(),
    projectsCreated: 0,
    quotesGenerated: 0,
    documentsProcessed: 0
  };
  
  // Fenêtres temporelles pour calculs
  private windows = {
    '1min': 60000,
    '5min': 300000,
    '1hour': 3600000,
    '24hours': 86400000
  };
  
  private aggregationInterval: NodeJS.Timeout | null = null;
  private metricsHistory: AggregatedMetrics[] = [];

  constructor() {
    // Démarrer l'agrégation périodique
    this.startAggregation();
  }

  /**
   * Démarre l'agrégation périodique des métriques
   */
  private startAggregation(): void {
    // Agrégation toutes les 30 secondes
    this.aggregationInterval = setInterval(() => {
      this.updateTimeSeries();
    }, 30000);
  }

  /**
   * Met à jour les données de série temporelle
   */
  private updateTimeSeries(): void {
    const now = new Date();
    const errorMetrics = this.errorCollector.getMetrics();
    const requestCount = this.calculateRequestCount();
    const avgResponseTime = this.calculateAverageResponseTime();
    
    const dataPoint: TimeSeriesData = {
      timestamp: now,
      errorCount: errorMetrics.totalErrors,
      requestCount,
      responseTime: avgResponseTime,
      errorRate: requestCount > 0 ? (errorMetrics.totalErrors / requestCount) * 100 : 0
    };
    
    this.timeSeriesData.push(dataPoint);
    
    // Nettoyer les anciennes données (garder 24h)
    const cutoff = new Date(now.getTime() - this.windows['24hours']);
    this.timeSeriesData = this.timeSeriesData.filter(d => d.timestamp > cutoff);
  }

  /**
   * Enregistre un temps de réponse
   */
  recordResponseTime(duration: number): void {
    this.responseTimes.push(duration);
    
    // Limiter la taille du tableau
    if (this.responseTimes.length > 10000) {
      this.responseTimes = this.responseTimes.slice(-5000);
    }
  }

  /**
   * Enregistre une requête
   */
  recordRequest(endpoint: string, method: string): void {
    const key = `${method}:${endpoint}`;
    this.requestCounts.set(key, (this.requestCounts.get(key) || 0) + 1);
  }

  /**
   * Enregistre un hit de rate limit
   */
  recordRateLimitHit(endpoint: string, userId?: string): void {
    const key = `${endpoint}:${userId || 'anonymous'}`;
    this.rateLimitHits.set(key, (this.rateLimitHits.get(key) || 0) + 1);
  }

  /**
   * Enregistre une activité utilisateur
   */
  recordUserActivity(userId: string): void {
    this.businessData.activeUsers.add(userId);
  }

  /**
   * Enregistre une métrique business
   */
  recordBusinessMetric(type: 'project' | 'quote' | 'document'): void {
    switch (type) {
      case 'project':
        this.businessData.projectsCreated++;
        break;
      case 'quote':
        this.businessData.quotesGenerated++;
        break;
      case 'document':
        this.businessData.documentsProcessed++;
        break;
    }
  }

  /**
   * Calcule les percentiles des temps de réponse
   */
  private calculatePercentiles(): PerformanceMetrics['responseTime'] {
    if (this.responseTimes.length === 0) {
      return { p50: 0, p95: 0, p99: 0, mean: 0, min: 0, max: 0 };
    }
    
    const sorted = [...this.responseTimes].sort((a, b) => a - b);
    const len = sorted.length;
    
    return {
      p50: sorted[Math.floor(len * 0.5)],
      p95: sorted[Math.floor(len * 0.95)],
      p99: sorted[Math.floor(len * 0.99)],
      mean: sorted.reduce((a, b) => a + b, 0) / len,
      min: sorted[0],
      max: sorted[len - 1]
    };
  }

  /**
   * Calcule le nombre total de requêtes
   */
  private calculateRequestCount(): number {
    let total = 0;
    this.requestCounts.forEach(count => total += count);
    return total;
  }

  /**
   * Calcule le temps de réponse moyen
   */
  private calculateAverageResponseTime(): number {
    if (this.responseTimes.length === 0) return 0;
    return this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length;
  }

  /**
   * Calcule les métriques de performance
   */
  private getPerformanceMetrics(): PerformanceMetrics {
    const requestCount = this.calculateRequestCount();
    const responseTimeMetrics = this.calculatePercentiles();
    
    return {
      responseTime: responseTimeMetrics,
      throughput: {
        requestsPerSecond: requestCount / 60,
        requestsPerMinute: requestCount,
        totalRequests: requestCount
      },
      database: {
        avgQueryTime: 50,  // À implémenter avec vraies métriques DB
        slowQueries: 0,
        connectionPoolSize: 20,
        activeConnections: 5
      },
      api: {
        aiServiceLatency: 200,  // À implémenter avec vraies métriques
        externalApiLatency: 150,
        failureRate: 0.01
      }
    };
  }

  /**
   * Calcule les métriques business
   */
  private getBusinessMetrics(): BusinessMetrics {
    return {
      users: {
        activeUsers: this.businessData.activeUsers.size,
        newUsersToday: 0,  // À implémenter
        totalUsers: 0,  // À implémenter
        sessionsPerUser: 1.5
      },
      projects: {
        projectsCreated: this.businessData.projectsCreated,
        projectsCompleted: 0,  // À implémenter
        averageCompletionTime: 0  // À implémenter
      },
      quotes: {
        quotesGenerated: this.businessData.quotesGenerated,
        quotesConverted: 0,  // À implémenter
        conversionRate: 0  // À implémenter
      },
      documents: {
        documentsProcessed: this.businessData.documentsProcessed,
        ocrProcessed: 0,  // À implémenter
        averageProcessingTime: 0  // À implémenter
      }
    };
  }

  /**
   * Calcule les métriques système
   */
  private getSystemMetrics(): SystemMetrics {
    const memUsage = process.memoryUsage();
    const totalMem = memUsage.heapTotal;
    const usedMem = memUsage.heapUsed;
    
    // Circuit breakers
    const circuitBreakers = this.circuitBreakerManager.getAllStatuses();
    const cbStats = {
      total: circuitBreakers.length,
      open: circuitBreakers.filter(cb => cb.state === 'open').length,
      halfOpen: circuitBreakers.filter(cb => cb.state === 'half-open').length,
      closed: circuitBreakers.filter(cb => cb.state === 'closed').length
    };
    
    // Rate limiting
    let totalRateLimitHits = 0;
    const topLimited: { endpoint: string; hits: number }[] = [];
    
    this.rateLimitHits.forEach((hits, endpoint) => {
      totalRateLimitHits += hits;
      topLimited.push({ endpoint: endpoint.split(':')[0], hits });
    });
    
    topLimited.sort((a, b) => b.hits - a.hits);
    
    return {
      uptime: process.uptime(),
      cpuUsage: process.cpuUsage().user / 1000000,  // Conversion en secondes
      memoryUsage: {
        used: usedMem,
        total: totalMem,
        percentage: (usedMem / totalMem) * 100
      },
      diskUsage: {
        used: 0,  // À implémenter avec fs
        total: 0,
        percentage: 0
      },
      circuitBreakers: cbStats,
      rateLimiting: {
        totalHits: totalRateLimitHits,
        blockedRequests: totalRateLimitHits,
        topLimitedEndpoints: topLimited.slice(0, 5)
      }
    };
  }

  /**
   * Détermine les tendances
   */
  private calculateTrends(): AggregatedMetrics['trends'] {
    if (this.timeSeriesData.length < 2) {
      return {
        errorRateTrend: 'stable',
        performanceTrend: 'stable',
        trafficTrend: 'stable'
      };
    }
    
    // Comparer les 5 dernières minutes avec les 5 minutes précédentes
    const now = Date.now();
    const recent = this.timeSeriesData.filter(d => 
      now - d.timestamp.getTime() < this.windows['5min']
    );
    const previous = this.timeSeriesData.filter(d  => {
      const age = now - d.timestamp.getTime();
      return age >= this.windows['5min'] && age < this.windows['5min'] * 2;
    });
    
    if (recent.length === 0 || previous.length === 0) {
      return {
        errorRateTrend: 'stable',
        performanceTrend: 'stable',
        trafficTrend: 'stable'
      };
    }
    
    // Calcul des moyennes
    const avgRecentErrors = recent.reduce((sum, d) => sum + d.errorRate, 0) / recent.length;
    const avgPreviousErrors = previous.reduce((sum, d) => sum + d.errorRate, 0) / previous.length;
    
    const avgRecentResponseTime = recent.reduce((sum, d) => sum + d.responseTime, 0) / recent.length;
    const avgPreviousResponseTime = previous.reduce((sum, d) => sum + d.responseTime, 0) / previous.length;
    
    const avgRecentTraffic = recent.reduce((sum, d) => sum + d.requestCount, 0) / recent.length;
    const avgPreviousTraffic = previous.reduce((sum, d) => sum + d.requestCount, 0) / previous.length;
    
    // Déterminer les tendances (seuil de 10% pour changement)
    const errorRateTrend = 
      avgRecentErrors > avgPreviousErrors * 1.1 ? 'increasing' :
      avgRecentErrors < avgPreviousErrors * 0.9 ? 'decreasing' : 'stable';
    
    const performanceTrend = 
      avgRecentResponseTime > avgPreviousResponseTime * 1.1 ? 'degrading' :
      avgRecentResponseTime < avgPreviousResponseTime * 0.9 ? 'improving' : 'stable';
    
    const trafficTrend = 
      avgRecentTraffic > avgPreviousTraffic * 1.1 ? 'increasing' :
      avgRecentTraffic < avgPreviousTraffic * 0.9 ? 'decreasing' : 'stable';
    
    return {
      errorRateTrend,
      performanceTrend,
      trafficTrend
    };
  }

  /**
   * Prépare les métriques pour le gestionnaire d'alertes
   */
  private prepareAlertMetrics(): AlertMetrics {
    const errorMetrics = this.errorCollector.getMetrics();
    const performance = this.getPerformanceMetrics();
    const system = this.getSystemMetrics();
    const trends = this.calculateTrends();
    
    return {
      errorRate: errorMetrics.errorRate,
      errorRateTrend: trends.errorRateTrend,
      totalErrors: errorMetrics.totalErrors,
      criticalErrors: errorMetrics.errorsByLevel.critical || 0,
      dbErrors: errorMetrics.errorsByCategory.database || 0,
      apiErrors: errorMetrics.errorsByCategory.api || 0,
      authErrors: errorMetrics.errorsByCategory.auth || 0,
      validationErrors: errorMetrics.errorsByCategory.validation || 0,
      aiFailures: errorMetrics.errorsByCategory.external || 0,
      rateLimitHits: system.rateLimiting.totalHits,
      circuitBreakersOpen: system.circuitBreakers.open,
      responseTimeP95: performance.responseTime.p95,
      responseTimeP99: performance.responseTime.p99,
      cpuUsage: system.cpuUsage,
      memoryUsage: system.memoryUsage.percentage,
      activeUsers: this.businessData.activeUsers.size
    };
  }

  // ========================================
  // MÉTHODES PUBLIQUES
  // ========================================

  /**
   * Agrège toutes les métriques
   */
  aggregate(): AggregatedMetrics {
    const now = new Date();
    const errorMetrics = this.errorCollector.getMetrics();
    const performance = this.getPerformanceMetrics();
    const business = this.getBusinessMetrics();
    const system = this.getSystemMetrics();
    const trends = this.calculateTrends();
    const alerts = this.alertManager.getActiveAlerts();
    
    // Timeline des 60 dernières minutes
    const timeline = this.timeSeriesData.filter(d => 
      now.getTime() - d.timestamp.getTime() < this.windows['1hour']
    );
    
    const aggregated: AggregatedMetrics = {
      timestamp: now,
      current: {
        errorRate: errorMetrics.errorRate,
        responseTimeP95: performance.responseTime.p95,
        throughput: performance.throughput.requestsPerSecond,
        activeAlerts: alerts.length
      },
      errors: errorMetrics,
      performance,
      business,
      system,
      trends,
      alerts,
      timeline
    };
    
    // Stocker dans l'historique
    this.metricsHistory.push(aggregated);
    
    // Limiter l'historique à 24h
    const cutoff = new Date(now.getTime() - this.windows['24hours']);
    this.metricsHistory = this.metricsHistory.filter(m => m.timestamp > cutoff);
    
    // Configurer les métriques pour le gestionnaire d'alertes
    const alertMetrics = this.prepareAlertMetrics();
    this.alertManager.setMetricsProvider(() => alertMetrics);
    
    return aggregated;
  }

  /**
   * Récupère les métriques d'une fenêtre temporelle spécifique
   */
  getWindowMetrics(window: '1min' | '5min' | '1hour' | '24hours'): TimeWindowMetrics {
    return this.errorCollector.getTimeWindowMetrics(window);
  }

  /**
   * Récupère l'historique des métriques
   */
  getHistory(since?: Date): AggregatedMetrics[] {
    if (since) {
      return this.metricsHistory.filter(m => m.timestamp >= since);
    }
    return [...this.metricsHistory];
  }

  /**
   * Récupère la timeline pour les graphiques
   */
  getTimeline(window: '1hour' | '6hours' | '24hours'): TimeSeriesData[] {
    const now = Date.now();
    const windowMs = window === '1hour' ? this.windows['1hour'] :
                    window === '6hours' ? 6 * this.windows['1hour'] :
                    this.windows['24hours'];
    
    return this.timeSeriesData.filter(d => 
      now - d.timestamp.getTime() < windowMs
    );
  }

  /**
   * Récupère les statistiques de santé du système
   */
  getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'critical';
    score: number;
    issues: string[];
  } {
    const metrics = this.aggregate();
    const issues: string[] = [];
    let score = 100;
    
    // Vérifier le taux d'erreur
    if (metrics.errors.errorRate > 10) {
      issues.push('Taux d\'erreur élevé');
      score -= 30;
    } else if (metrics.errors.errorRate > 5) {
      issues.push('Taux d\'erreur modéré');
      score -= 15;
    }
    
    // Vérifier les performances
    if (metrics.performance.responseTime.p95 > 2000) {
      issues.push('Temps de réponse lent');
      score -= 20;
    }
    
    // Vérifier les circuit breakers
    if (metrics.system.circuitBreakers.open > 0) {
      issues.push(`${metrics.system.circuitBreakers.open} circuit breaker(s) ouvert(s)`);
      score -= 25;
    }
    
    // Vérifier la mémoire
    if (metrics.system.memoryUsage.percentage > 85) {
      issues.push('Utilisation mémoire élevée');
      score -= 15;
    }
    
    // Vérifier les alertes actives
    if (metrics.alerts.length > 0) {
      const criticalAlerts = metrics.alerts.filter(a => a.severity === 'critical');
      if (criticalAlerts.length > 0) {
        issues.push(`${criticalAlerts.length} alerte(s) critique(s)`);
        score -= 30;
      } else {
        issues.push(`${metrics.alerts.length} alerte(s) active(s)`);
        score -= 10;
      }
    }
    
    // Déterminer le statut global
    const status = score >= 80 ? 'healthy' :
                  score >= 50 ? 'degraded' : 'critical';
    
    return {
      status,
      score: Math.max(0, score),
      issues
    };
  }

  /**
   * Réinitialise les métriques
   */
  reset(): void {
    this.timeSeriesData = [];
    this.responseTimes = [];
    this.requestCounts.clear();
    this.rateLimitHits.clear();
    this.businessData = {
      activeUsers: new Set(),
      projectsCreated: 0,
      quotesGenerated: 0,
      documentsProcessed: 0
    };
    this.metricsHistory = [];
    this.errorCollector.reset();
  }

  /**
   * Nettoie et arrête le service
   */
  dispose(): void {
    if (this.aggregationInterval) {
      clearInterval(this.aggregationInterval);
    }
    this.reset();
  }
}

// Instance singleton
let metricsAggregatorInstance: MetricsAggregator | null = null;

export function getMetricsAggregator(): MetricsAggregator {
  if (!metricsAggregatorInstance) {
    metricsAggregatorInstance = new MetricsAggregator();
  }
  return metricsAggregatorInstance;
}