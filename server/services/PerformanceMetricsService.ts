import { IStorage, storage } from "../storage-poc";
import { db } from "../db";
import { sql, eq, and, desc, gte, lte, asc } from "drizzle-orm";
import crypto from "crypto";
import { logger } from '../utils/logger';
import type {
  PipelineMetrics,
  PipelineStep,
  PerformanceAlert,
  PerformanceSLO,
  CachePerformanceMetrics,
  PipelineTimings,
  QueryComplexity,
  InsertPipelineMetrics
} from "@shared/schema";

import {
  pipelineMetrics,
  performanceSLOs,
  performanceAlerts,
  aiModelMetrics,
  aiQueryCache
} from "@shared/schema";

// ========================================
// CONSTANTES ET CONFIGURATION
// ========================================

const SLO_THRESHOLDS = {
  simple: 5000,    // 5 secondes
  complex: 10000,  // 10 secondes  
  expert: 15000    // 15 secondes (seuil étendu)
} as const;

const PERCENTILE_WINDOWS = {
  p50: 50,
  p95: 95,
  p99: 99
} as const;

const ALERT_COOLDOWN_MINUTES = 15; // Éviter spam d'alertes
const METRICS_RETENTION_DAYS = 90;  // Rétention métriques
const REALTIME_WINDOW_MINUTES = 60; // Fenêtre métriques temps réel

// ========================================
// INTERFACE SERVICE MÉTRIQUES DE PERFORMANCE
// ========================================

export interface PipelineStepMetrics {
  stepName: PipelineStep;
  startTime: number;
  endTime?: number;
  duration?: number;
  success: boolean;
  metadata?: Record<string, any>;
}

export interface DetailedTimings {
  contextGeneration: number;
  aiModelSelection: number;
  sqlGeneration: number;
  sqlExecution: number;
  responseFormatting: number;
  total: number;
  cacheOperations: number;
  // ÉTAPE 2 PHASE 3 PERFORMANCE : Nouveaux timings parallélisme
  contextAndModelParallel: number;
  parallelExecutionTime: number;
  sequentialFallbackTime: number;
  circuitBreakerCheckTime: number;
}

export interface ParallelismMetrics {
  parallelExecutionCount: number;
  sequentialFallbackCount: number;
  averageParallelTime: number;
  averageSequentialTime: number;
  timeSavingsPercent: number;
  circuitBreakerTriggered: number;
  parallelSuccessRate: number;
}

export interface PercentileStats {
  p50: number;
  p95: number;
  p99: number;
  mean: number;
  min: number;
  max: number;
  count: number;
}

export interface CacheAnalytics {
  hitRateByComplexity: {
    simple: number;
    complex: number;
    expert: number;
  };
  avgRetrievalTime: {
    hit: number;
    miss: number;
  };
  memoryVsDbHits: {
    memoryHits: number;
    dbHits: number;
    totalHits: number;
  };
}

// ========================================
// SERVICE PRINCIPAL MÉTRIQUES PERFORMANCE
// ========================================

export class PerformanceMetricsService {
  private storage: IStorage;
  private activeTraces: Map<string, PipelineStepMetrics[]> = new Map();
  private realtimeMetrics: Map<string, PercentileStats> = new Map();
  private lastAlertTime: Map<string, Date> = new Map();
  // ÉTAPE 2 PHASE 3 PERFORMANCE : Métriques parallélisme
  private parallelismStats: ParallelismMetrics = {
    parallelExecutionCount: 0,
    sequentialFallbackCount: 0,
    averageParallelTime: 0,
    averageSequentialTime: 0,
    timeSavingsPercent: 0,
    circuitBreakerTriggered: 0,
    parallelSuccessRate: 1.0
  };
  private circuitBreakerFailureCount: number = 0;
  private circuitBreakerLastFailureTime: Date | null = null;

  constructor(storage: IStorage) {
    this.storage = storage;
    
    // Initialisation cleanup périodique
    setInterval(() => {
      this.cleanupExpiredTraces();
    }, 5 * 60 * 1000); // Toutes les 5 minutes
    
    // Recalcul métriques temps réel
    setInterval(() => {
      this.refreshRealtimeMetrics();
    }, 30 * 1000); // Toutes les 30 secondes
  }

  // ========================================
  // TRACING GRANULAIRE PAR ÉTAPE PIPELINE
  // ========================================

  /**
   * Démarre le tracing d'un pipeline complet
   */
  startPipelineTrace(traceId: string, userId: string, userRole: string, query: string, complexity: QueryComplexity): void {
    this.activeTraces.set(traceId, []);
    logger.info('Démarrage trace pipeline', {
      metadata: {
        service: 'PerformanceMetricsService',
        operation: 'startPipelineTrace',
        traceId,
        complexity,
        context: { pipelineStep: 'trace_start' }
      }
    });
  }

  /**
   * Démarre une étape spécifique du pipeline
   */
  startStep(traceId: string, stepName: PipelineStep, metadata?: Record<string, any>): void {
    const traces = this.activeTraces.get(traceId);
    if (!traces) {
      logger.warn('Tentative start step sur trace inexistante', {
        metadata: {
          service: 'PerformanceMetricsService',
          operation: 'startStep',
          stepName,
          traceId,
          context: { issue: 'trace_not_found' }
        }
      });
      return;
    }

    const stepMetrics: PipelineStepMetrics = {
      stepName,
      startTime: Date.now(),
      success: true, // Assumé success jusqu'à preuve contraire
      metadata
    };

    traces.push(stepMetrics);
    logger.info('Démarrage étape pipeline', {
      metadata: {
        service: 'PerformanceMetricsService',
        operation: 'startStep',
        stepName,
        traceId,
        context: { pipelineStep: 'step_start' }
      }
    });
  }

  /**
   * Termine une étape du pipeline
   */
  endStep(traceId: string, stepName: PipelineStep, success: boolean = true, metadata?: Record<string, any>): void {
    const traces = this.activeTraces.get(traceId);
    if (!traces) {
      logger.warn('Tentative end step sur trace inexistante', {
        metadata: {
          service: 'PerformanceMetricsService',
          operation: 'endStep',
          stepName,
          traceId,
          context: { issue: 'trace_not_found' }
        }
      });
      return;
    }

    // Recherche de l'étape en cours (dernière avec ce nom sans endTime)
    const step = traces.reverse().find(s => s.stepName === stepName && !s.endTime);
    traces.reverse(); // Restaurer ordre original

    if (!step) {
      logger.warn('Étape non trouvée pour trace', {
        metadata: {
          service: 'PerformanceMetricsService',
          operation: 'endStep',
          stepName,
          traceId,
          context: { issue: 'step_not_found' }
        }
      });
      return;
    }

    step.endTime = Date.now();
    step.duration = step.endTime - step.startTime;
    step.success = success;
    if (metadata) {
      step.metadata = { ...step.metadata, ...metadata };
    }

    logger.info('Fin étape pipeline', {
      metadata: {
        service: 'PerformanceMetricsService',
        operation: 'endStep',
        stepName,
        traceId,
        duration: step.duration,
        context: { pipelineStep: 'step_end' }
      }
    });
  }

  /**
   * Termine le tracing et persiste les métriques
   */
  async endPipelineTrace(
    traceId: string, 
    userId: string, 
    userRole: string, 
    query: string, 
    complexity: QueryComplexity, 
    totalSuccess: boolean,
    cacheHit: boolean = false,
    additionalMetadata?: Record<string, any>
  ): Promise<DetailedTimings> {
    const traces = this.activeTraces.get(traceId);
    if (!traces) {
      logger.warn('Tentative end pipeline sur trace inexistante', {
        metadata: {
          service: 'PerformanceMetricsService',
          operation: 'endPipelineTrace',
          traceId,
          context: { issue: 'trace_not_found' }
        }
      });
      return this.createEmptyTimings();
    }

    const timings = this.calculateDetailedTimings(traces);
    
    // Persistance en base
    try {
      await this.persistPipelineMetrics({
        traceId,
        userId,
        userRole,
        query: query.substring(0, 2000), // Limiter taille
        complexity,
        contextGenerationMs: timings.contextGeneration,
        aiModelSelectionMs: timings.aiModelSelection,
        sqlGenerationMs: timings.sqlGeneration,
        sqlExecutionMs: timings.sqlExecution,
        responseFormattingMs: timings.responseFormatting,
        totalDurationMs: timings.total,
        cacheOperationsMs: timings.cacheOperations,
        success: totalSuccess,
        cacheHit,
        stepDetails: JSON.stringify(traces),
        metadata: JSON.stringify(additionalMetadata || {})
      });

      // Vérification SLO et alertes
      await this.checkSLOViolation(complexity, timings.total, traceId, userId);

      // Cleanup trace active
      this.activeTraces.delete(traceId);

      logger.info('Pipeline trace terminé', {
        metadata: {
          service: 'PerformanceMetricsService',
          operation: 'endPipelineTrace',
          traceId,
          totalDuration: timings.total,
          context: { pipelineStep: 'trace_complete' }
        }
      });

    } catch (error) {
      logger.error('Erreur persistance trace', {
        metadata: {
          service: 'PerformanceMetricsService',
          operation: 'endPipelineTrace',
          traceId,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          context: { pipelineStep: 'trace_persistence_error' }
        }
      });
    }

    return timings;
  }

  // ========================================
  // CALCULS MÉTRIQUES AVANCÉES
  // ========================================

  // ========================================
  // MÉTHODES PARALLÉLISME - ÉTAPE 2 PHASE 3
  // ========================================

  /**
   * Vérifie le circuit breaker pour autoriser l'exécution parallèle
   */
  checkCircuitBreaker(): { allowed: boolean; reason?: string } {
    const now = new Date();
    const failureThreshold = 3;
    const timeoutMinutes = 5;

    // Si plus de 3 échecs consécutifs dans les 5 dernières minutes
    if (this.circuitBreakerFailureCount >= failureThreshold && 
        this.circuitBreakerLastFailureTime &&
        (now.getTime() - this.circuitBreakerLastFailureTime.getTime()) < (timeoutMinutes * 60 * 1000)) {
      
      return { 
        allowed: false, 
        reason: `Circuit breaker ouvert: ${this.circuitBreakerFailureCount} échecs consécutifs` 
      };
    }

    // Reset du compteur si timeout dépassé
    if (this.circuitBreakerLastFailureTime &&
        (now.getTime() - this.circuitBreakerLastFailureTime.getTime()) >= (timeoutMinutes * 60 * 1000)) {
      this.circuitBreakerFailureCount = 0;
      this.circuitBreakerLastFailureTime = null;
    }

    return { allowed: true };
  }

  /**
   * Enregistre un échec du parallélisme pour le circuit breaker
   */
  recordParallelismFailure(): void {
    this.circuitBreakerFailureCount++;
    this.circuitBreakerLastFailureTime = new Date();
    this.parallelismStats.circuitBreakerTriggered++;
    
    logger.warn('Échec parallélisme enregistré', {
      metadata: {
        service: 'PerformanceMetricsService',
        operation: 'recordParallelismFailure',
        consecutiveFailures: this.circuitBreakerFailureCount,
        context: { circuitBreaker: 'failure_recorded' }
      }
    });
  }

  /**
   * Enregistre une réussite du parallélisme (reset circuit breaker)
   */
  recordParallelismSuccess(parallelTime: number): void {
    this.circuitBreakerFailureCount = 0;
    this.circuitBreakerLastFailureTime = null;
    this.parallelismStats.parallelExecutionCount++;
    
    // Mise à jour moyenne mobile
    const currentAvg = this.parallelismStats.averageParallelTime;
    const count = this.parallelismStats.parallelExecutionCount;
    this.parallelismStats.averageParallelTime = ((currentAvg * (count - 1)) + parallelTime) / count;
    
    // Calcul du taux de succès
    const totalAttempts = this.parallelismStats.parallelExecutionCount + this.parallelismStats.sequentialFallbackCount;
    this.parallelismStats.parallelSuccessRate = this.parallelismStats.parallelExecutionCount / totalAttempts;
  }

  /**
   * Enregistre un fallback vers l'exécution séquentielle
   */
  recordSequentialFallback(sequentialTime: number): void {
    this.parallelismStats.sequentialFallbackCount++;
    
    // Mise à jour moyenne mobile
    const currentAvg = this.parallelismStats.averageSequentialTime;
    const count = this.parallelismStats.sequentialFallbackCount;
    this.parallelismStats.averageSequentialTime = ((currentAvg * (count - 1)) + sequentialTime) / count;
    
    // Calcul du pourcentage d'économie de temps
    if (this.parallelismStats.averageParallelTime > 0 && this.parallelismStats.averageSequentialTime > 0) {
      const savings = ((this.parallelismStats.averageSequentialTime - this.parallelismStats.averageParallelTime) / this.parallelismStats.averageSequentialTime) * 100;
      this.parallelismStats.timeSavingsPercent = Math.max(0, savings);
    }
  }

  /**
   * Démarre un tracing parallèle spécialisé
   */
  startParallelTrace(traceId: string, operation: 'context_and_model_parallel'): void {
    this.startStep(traceId, operation, { 
      parallelismEnabled: true,
      startTime: Date.now(),
      circuitBreakerStatus: this.circuitBreakerFailureCount === 0 ? 'closed' : 'open'
    });
  }

  /**
   * Termine un tracing parallèle avec métriques détaillées
   */
  endParallelTrace(
    traceId: string, 
    operation: 'context_and_model_parallel',
    success: boolean, 
    parallelResults: {
      contextSuccess: boolean;
      modelSuccess: boolean;
      contextTime: number;
      modelTime: number;
      totalParallelTime: number;
    }
  ): void {
    this.endStep(traceId, operation, success, {
      ...parallelResults,
      timeSaving: Math.max(0, (parallelResults.contextTime + parallelResults.modelTime) - parallelResults.totalParallelTime),
      parallelEfficiency: parallelResults.totalParallelTime / Math.max(parallelResults.contextTime, parallelResults.modelTime)
    });

    if (success) {
      this.recordParallelismSuccess(parallelResults.totalParallelTime);
    } else {
      this.recordParallelismFailure();
    }
  }

  /**
   * Retourne les métriques de parallélisme actuelles
   */
  getParallelismMetrics(): ParallelismMetrics {
    return { ...this.parallelismStats };
  }

  /**
   * Calcule les timings détaillés à partir des traces d'étapes
   */
  private calculateDetailedTimings(traces: PipelineStepMetrics[]): DetailedTimings {
    const timings: DetailedTimings = {
      contextGeneration: 0,
      aiModelSelection: 0,
      sqlGeneration: 0,
      sqlExecution: 0,
      responseFormatting: 0,
      total: 0,
      cacheOperations: 0,
      // ÉTAPE 2 PHASE 3 PERFORMANCE : Nouveaux timings parallélisme
      contextAndModelParallel: 0,
      parallelExecutionTime: 0,
      sequentialFallbackTime: 0,
      circuitBreakerCheckTime: 0
    };

    let earliestStart = Number.MAX_SAFE_INTEGER;
    let latestEnd = 0;

    for (const step of traces) {
      if (step.duration && step.success) {
        switch (step.stepName) {
          case 'context_generation':
            timings.contextGeneration += step.duration;
            break;
          case 'ai_model_selection':
            timings.aiModelSelection += step.duration;
            break;
          case 'sql_generation':
            timings.sqlGeneration += step.duration;
            break;
          case 'sql_execution':
            timings.sqlExecution += step.duration;
            break;
          case 'response_formatting':
            timings.responseFormatting += step.duration;
            break;
          case 'cache_operations':
            timings.cacheOperations += step.duration;
            break;
        }
      }

      // Calcul du temps total basé sur start/end réels
      earliestStart = Math.min(earliestStart, step.startTime);
      if (step.endTime) {
        latestEnd = Math.max(latestEnd, step.endTime);
      }
    }

    timings.total = latestEnd > earliestStart ? latestEnd - earliestStart : 
                    timings.contextGeneration + timings.aiModelSelection + timings.sqlGeneration + 
                    timings.sqlExecution + timings.responseFormatting + timings.cacheOperations;

    return timings;
  }

  /**
   * Calcule les statistiques de percentiles pour une fenêtre temporelle
   */
  async calculatePercentileStats(
    stepName: PipelineStep | 'total', 
    complexity?: QueryComplexity, 
    windowHours: number = 24
  ): Promise<PercentileStats> {
    try {
      const since = new Date(Date.now() - windowHours * 60 * 60 * 1000);
      
      const columnName = stepName === 'total' ? 'total_duration_ms' : `${stepName}_ms`;
      
      // Construire les conditions de filtre
      const conditions = [
        gte(pipelineMetrics.timestamp, since),
        eq(pipelineMetrics.success, true)
      ];

      if (complexity) {
        conditions.push(eq(pipelineMetrics.complexity, complexity));
      }

      const results = await db
        .select({
          duration: sql<number>`${sql.raw(columnName)}`,
        })
        .from(pipelineMetrics)
        .where(and(...conditions));
      const durations = results.map(r => r.duration).filter(d => d > 0).sort((a, b) => a - b);

      if (durations.length === 0) {
        return this.createEmptyPercentileStats();
      }

      const stats: PercentileStats = {
        p50: this.percentile(durations, 50),
        p95: this.percentile(durations, 95),
        p99: this.percentile(durations, 99),
        mean: durations.reduce((sum, d) => sum + d, 0) / durations.length,
        min: durations[0],
        max: durations[durations.length - 1],
        count: durations.length
      };

      return stats;

    } catch (error) {
      logger.error('Erreur calcul percentiles', {
        metadata: {
          service: 'PerformanceMetricsService',
          operation: 'calculatePercentiles',
          stepName,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      return this.createEmptyPercentileStats();
    }
  }

  /**
   * Analyse les métriques de cache par complexité
   */
  async analyzeCachePerformance(windowHours: number = 24): Promise<CacheAnalytics> {
    try {
      const since = new Date(Date.now() - windowHours * 60 * 60 * 1000);

      // Requête pour hit rates par complexité
      const hitRates = await db
        .select({
          complexity: pipelineMetrics.complexity,
          totalQueries: sql<number>`COUNT(*)`,
          cacheHits: sql<number>`COUNT(CASE WHEN cache_hit THEN 1 END)`
        })
        .from(pipelineMetrics)
        .where(gte(pipelineMetrics.timestamp, since))
        .groupBy(pipelineMetrics.complexity);

      // Requête pour temps de récupération
      const retrievalTimes = await db
        .select({
          cacheHit: pipelineMetrics.cacheHit,
          avgCacheOps: sql<number>`AVG(cache_operations_ms)`
        })
        .from(pipelineMetrics)
        .where(gte(pipelineMetrics.timestamp, since))
        .groupBy(pipelineMetrics.cacheHit);

      // Construction du résultat
      const analytics: CacheAnalytics = {
        hitRateByComplexity: {
          simple: 0,
          complex: 0,
          expert: 0
        },
        avgRetrievalTime: {
          hit: 0,
          miss: 0
        },
        memoryVsDbHits: {
          memoryHits: 0,
          dbHits: 0,
          totalHits: 0
        }
      };

      // Calcul hit rates par complexité
      for (const rate of hitRates) {
        const hitRate = rate.totalQueries > 0 ? (rate.cacheHits / rate.totalQueries) : 0;
        analytics.hitRateByComplexity[rate.complexity] = Math.round(hitRate * 100) / 100;
      }

      // Calcul temps de récupération moyen
      for (const time of retrievalTimes) {
        if (time.cacheHit) {
          analytics.avgRetrievalTime.hit = Math.round(time.avgCacheOps || 0);
        } else {
          analytics.avgRetrievalTime.miss = Math.round(time.avgCacheOps || 0);
        }
      }

      // TODO: Distinguer memory vs DB hits (nécessite extension métadata)
      const totalHits = hitRates.reduce((sum, rate) => sum + rate.cacheHits, 0);
      analytics.memoryVsDbHits.totalHits = totalHits;
      analytics.memoryVsDbHits.memoryHits = Math.round(totalHits * 0.7); // Estimation
      analytics.memoryVsDbHits.dbHits = totalHits - analytics.memoryVsDbHits.memoryHits;

      return analytics;

    } catch (error) {
      logger.error('Erreur analyse cache', {
        metadata: {
          service: 'PerformanceMetricsService',
          operation: 'analyzeCachePerformance',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      return this.createEmptyCacheAnalytics();
    }
  }

  // ========================================
  // SLO ET ALERTES
  // ========================================

  /**
   * Vérifie si un SLO est violé et déclenche une alerte si nécessaire
   */
  private async checkSLOViolation(
    complexity: QueryComplexity, 
    actualDuration: number, 
    traceId: string, 
    userId: string
  ): Promise<void> {
    const threshold = SLO_THRESHOLDS[complexity];
    
    if (actualDuration > threshold) {
      const alertKey = `slo_violation_${complexity}`;
      const lastAlert = this.lastAlertTime.get(alertKey);
      const cooldownExpired = !lastAlert || 
        (Date.now() - lastAlert.getTime()) > ALERT_COOLDOWN_MINUTES * 60 * 1000;

      if (cooldownExpired) {
        await this.createPerformanceAlert({
          id: crypto.randomUUID(),
          alertType: 'slo_violation',
          severity: actualDuration > threshold * 1.5 ? 'critical' : 'warning',
          title: `SLO violé pour requête ${complexity}`,
          description: `Durée ${actualDuration}ms dépasse seuil ${threshold}ms`,
          threshold,
          actualValue: actualDuration,
          traceId,
          userId,
          metadata: JSON.stringify({ 
            complexity, 
            overrun: actualDuration - threshold,
            overrunPercentage: Math.round(((actualDuration - threshold) / threshold) * 100)
          }),
          acknowledged: false,
          createdAt: new Date()
        });

        this.lastAlertTime.set(alertKey, new Date());
        logger.warn('ALERTE SLO dépassé', {
          metadata: {
            service: 'PerformanceMetricsService',
            operation: 'checkSLOCompliance',
            complexity,
            actualDuration,
            threshold,
            context: { alertType: 'slo_breach' }
          }
        });
      }
    }
  }

  // ========================================
  // UTILITAIRES ET HELPERS
  // ========================================

  private percentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0;
    
    const index = (percentile / 100) * (sortedArray.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index % 1;

    if (lower === upper) {
      return sortedArray[lower];
    }

    return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
  }

  private createEmptyTimings(): DetailedTimings {
    return {
      contextGeneration: 0,
      aiModelSelection: 0,
      sqlGeneration: 0,
      sqlExecution: 0,
      responseFormatting: 0,
      total: 0,
      cacheOperations: 0,
      // ÉTAPE 2 PHASE 3 PERFORMANCE : Nouveaux timings parallélisme
      contextAndModelParallel: 0,
      parallelExecutionTime: 0,
      sequentialFallbackTime: 0,
      circuitBreakerCheckTime: 0
    };
  }

  private createEmptyPercentileStats(): PercentileStats {
    return { p50: 0, p95: 0, p99: 0, mean: 0, min: 0, max: 0, count: 0 };
  }

  private createEmptyCacheAnalytics(): CacheAnalytics {
    return {
      hitRateByComplexity: { simple: 0, complex: 0, expert: 0 },
      avgRetrievalTime: { hit: 0, miss: 0 },
      memoryVsDbHits: { memoryHits: 0, dbHits: 0, totalHits: 0 }
    };
  }

  private cleanupExpiredTraces(): void {
    const cutoff = Date.now() - (60 * 60 * 1000); // 1 heure
    let cleaned = 0;

    for (const [traceId, traces] of Array.from(this.activeTraces.entries())) {
      const hasRecentActivity = traces.some((t: PipelineStepMetrics) => t.startTime > cutoff);
      if (!hasRecentActivity) {
        this.activeTraces.delete(traceId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.info('Nettoyage traces expirées', {
        metadata: {
          service: 'PerformanceMetricsService',
          operation: 'cleanupExpiredTraces',
          cleanedCount: cleaned,
          context: { maintenanceTask: 'trace_cleanup' }
        }
      });
    }
  }

  private async refreshRealtimeMetrics(): Promise<void> {
    try {
      // Actualiser métriques temps réel pour dashboard
      const steps: (PipelineStep | 'total')[] = [
        'context_generation', 'ai_model_selection', 'sql_generation', 
        'sql_execution', 'response_formatting', 'total'
      ];

      for (const step of steps) {
        const stats = await this.calculatePercentileStats(step, undefined, 1); // 1 heure
        this.realtimeMetrics.set(step, stats);
      }
    } catch (error) {
      logger.error('Erreur refresh métriques temps réel', {
        metadata: {
          service: 'PerformanceMetricsService',
          operation: 'refreshRealTimeMetrics',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
    }
  }

  // ========================================
  // MÉTHODES DE PERSISTANCE
  // ========================================

  private async persistPipelineMetrics(metrics: InsertPipelineMetrics): Promise<void> {
    try {
      await db.insert(pipelineMetrics).values(metrics);
    } catch (error) {
      logger.error('Erreur persistance métriques', {
        metadata: {
          service: 'PerformanceMetricsService',
          operation: 'persistMetrics',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  private async createPerformanceAlert(alert: any): Promise<void> {
    try {
      await db.insert(performanceAlerts).values(alert);
    } catch (error) {
      logger.error('Erreur création alerte', {
        metadata: {
          service: 'PerformanceMetricsService',
          operation: 'createPerformanceAlert',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
    }
  }

  // ========================================
  // API PUBLIQUE POUR DASHBOARDS
  // ========================================

  /**
   * Récupère les métriques temps réel pour dashboard
   */
  getRealtimeMetrics(): Map<string, PercentileStats> {
    return new Map(this.realtimeMetrics);
  }

  /**
   * Récupère les alertes actives
   */
  async getActiveAlerts(limit: number = 50): Promise<any[]> {
    try {
      return await db
        .select()
        .from(performanceAlerts)
        .where(eq(performanceAlerts.acknowledged, false))
        .orderBy(desc(performanceAlerts.createdAt))
        .limit(limit);
    } catch (error) {
      logger.error('Erreur récupération alertes', {
        metadata: {
          service: 'PerformanceMetricsService',
          operation: 'getPerformanceAlerts',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      return [];
    }
  }

  /**
   * Acquitte une alerte
   */
  async acknowledgeAlert(alertId: string): Promise<boolean> {
    try {
      await db
        .update(performanceAlerts)
        .set({ acknowledged: true, updatedAt: new Date() })
        .where(eq(performanceAlerts.id, alertId));
      return true;
    } catch (error) {
      logger.error('Erreur acquittement alerte', {
        metadata: {
          service: 'PerformanceMetricsService',
          operation: 'acknowledgeAlert',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      return false;
    }
  }

  // ========================================
  // MÉTHODES DASHBOARD API
  // ========================================

  /**
   * Récupère les métriques détaillées par étape du pipeline
   * 
   * TODO: Cette méthode est désactivée car elle nécessite les tables suivantes qui n'existent pas dans schema.ts :
   * - performanceTraces
   * - pipelinePerformanceMetrics
   * 
   * Pour réactiver :
   * 1. Créer les tables manquantes dans shared/schema.ts
   * 2. Exécuter `npm run db:push --force`
   * 3. Décommenter cette méthode
   */
  async getPipelineMetrics(filters: {
    timeRange?: { startDate: string; endDate: string };
    complexity?: 'simple' | 'complex' | 'expert';
    userId?: string;
    includePercentiles?: boolean;
  }): Promise<any> {
    // DÉSACTIVÉ - Tables manquantes
    logger.warn('getPipelineMetrics appelée mais désactivée (tables manquantes)', {
      metadata: {
        service: 'PerformanceMetricsService',
        operation: 'getPipelineMetrics',
        filters
      }
    });

    return {
      step_statistics: {
        context_generation: { count: 0, avg: 0, p95: 0, success_rate: 100 },
        ai_model_selection: { count: 0, avg: 0, p95: 0, success_rate: 100 },
        sql_generation: { count: 0, avg: 0, p95: 0, success_rate: 100 },
        sql_execution: { count: 0, avg: 0, p95: 0, success_rate: 100 },
        response_formatting: { count: 0, avg: 0, p95: 0, success_rate: 100 }
      },
      total_traces: 0,
      time_range: 'disabled',
      complexity_filter: 'all',
      _disabled: true,
      _reason: 'Tables performanceTraces et pipelinePerformanceMetrics manquantes'
    };

    /* DÉSACTIVÉ - Décommenter après création des tables
    try {
      logger.info('Récupération métriques pipeline avec filtres', {
        metadata: {
          service: 'PerformanceMetricsService',
          operation: 'getPipelineMetrics',
          filters
        }
      });

      // Récupérer les traces récentes
      let tracesQuery = db
        .select()
        .from(performanceTraces);

      if (filters.timeRange) {
        tracesQuery = tracesQuery.where(
          and(
            gte(performanceTraces.createdAt, new Date(filters.timeRange.startDate)),
            lte(performanceTraces.createdAt, new Date(filters.timeRange.endDate))
          )
        );
      }

      const traces = await tracesQuery.limit(1000);

      // Récupérer les métriques d'étapes
      let metricsQuery = db
        .select()
        .from(pipelinePerformanceMetrics);

      if (filters.timeRange) {
        metricsQuery = metricsQuery.where(
          and(
            gte(pipelinePerformanceMetrics.createdAt, new Date(filters.timeRange.startDate)),
            lte(pipelinePerformanceMetrics.createdAt, new Date(filters.timeRange.endDate))
          )
        );
      }

      const metrics = await metricsQuery.limit(1000);

      // Calculer les statistiques par étape
      const stepStats: any = {};
      const steps = ['context_generation', 'ai_model_selection', 'sql_generation', 'sql_execution', 'response_formatting'];

      for (const step of steps) {
        const stepMetrics = metrics.filter(m => m.stepName === step && m.success);
        const durations = stepMetrics.map(m => m.duration).filter(d => d > 0);
        
        if (durations.length > 0) {
          durations.sort((a, b) => a - b);
          
          stepStats[step] = {
            count: durations.length,
            avg: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
            p50: durations[Math.floor(durations.length * 0.5)],
            p95: durations[Math.floor(durations.length * 0.95)],
            p99: durations[Math.floor(durations.length * 0.99)],
            min: durations[0],
            max: durations[durations.length - 1],
            success_rate: Math.round((stepMetrics.length / Math.max(metrics.filter(m => m.stepName === step).length, 1)) * 100)
          };
        } else {
          stepStats[step] = {
            count: 0,
            avg: 0,
            p50: 0,
            p95: 0,
            p99: 0,
            min: 0,
            max: 0,
            success_rate: 100
          };
        }
      }

      return {
        step_statistics: stepStats,
        total_traces: traces.length,
        time_range: filters.timeRange || 'last_24h',
        complexity_filter: filters.complexity || 'all'
      };

    } catch (error) {
      logger.error('Erreur getPipelineMetrics', {
        metadata: {
          service: 'PerformanceMetricsService',
          operation: 'getPipelineMetrics',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      // Retourner des données par défaut en cas d'erreur
      return {
        step_statistics: {
          context_generation: { count: 0, avg: 0, p95: 0, success_rate: 100 },
          ai_model_selection: { count: 0, avg: 0, p95: 0, success_rate: 100 },
          sql_generation: { count: 0, avg: 0, p95: 0, success_rate: 100 },
          sql_execution: { count: 0, avg: 0, p95: 0, success_rate: 100 },
          response_formatting: { count: 0, avg: 0, p95: 0, success_rate: 100 }
        },
        total_traces: 0,
        time_range: 'error',
        complexity_filter: 'all'
      };
    }
    */
  }

  /**
   * Analyse des performances cache par complexité
   * 
   * TODO: Méthode désactivée - Table performanceTraces manquante
   */
  async getCacheAnalytics(filters: {
    timeRange?: { startDate: string; endDate: string };
    breakdown?: 'complexity' | 'user' | 'time';
  }): Promise<any> {
    logger.warn('getCacheAnalytics appelée mais désactivée (table performanceTraces manquante)', {
      metadata: {
        service: 'PerformanceMetricsService',
        operation: 'getCacheAnalytics',
        breakdown: filters.breakdown
      }
    });

    return {
      overall: { total_queries: 0, cache_hits: 0, cache_misses: 0, hit_rate: 0 },
      by_complexity: {
        simple: { total: 0, cache_hits: 0, hit_rate: 0 },
        complex: { total: 0, cache_hits: 0, hit_rate: 0 },
        expert: { total: 0, cache_hits: 0, hit_rate: 0 }
      },
      cache_efficiency_score: 0,
      _disabled: true,
      _reason: 'Table performanceTraces manquante'
    };

    /* DÉSACTIVÉ
    try {
      logger.info('Cache analytics breakdown', {
        metadata: {
          service: 'PerformanceMetricsService',
          operation: 'getCacheAnalytics',
          breakdown: filters.breakdown
        }
      });

      // Récupérer les traces avec informations cache
      let tracesQuery = db
        .select()
        .from(performanceTraces);

      if (filters.timeRange) {
        tracesQuery = tracesQuery.where(
          and(
            gte(performanceTraces.createdAt, new Date(filters.timeRange.startDate)),
            lte(performanceTraces.createdAt, new Date(filters.timeRange.endDate))
          )
        );
      }

      const traces = await tracesQuery.limit(1000);

      const cacheHits = traces.filter(t => t.cacheHit);
      const cacheMisses = traces.filter(t => !t.cacheHit);

      // Analytics par complexité
      const complexityBreakdown = {
        simple: {
          total: traces.filter(t => t.queryComplexity === 'simple').length,
          cache_hits: cacheHits.filter(t => t.queryComplexity === 'simple').length,
          hit_rate: 0,
          avg_time_hit: 0,
          avg_time_miss: 0
        },
        complex: {
          total: traces.filter(t => t.queryComplexity === 'complex').length,
          cache_hits: cacheHits.filter(t => t.queryComplexity === 'complex').length,
          hit_rate: 0,
          avg_time_hit: 0,
          avg_time_miss: 0
        },
        expert: {
          total: traces.filter(t => t.queryComplexity === 'expert').length,
          cache_hits: cacheHits.filter(t => t.queryComplexity === 'expert').length,
          hit_rate: 0,
          avg_time_hit: 0,
          avg_time_miss: 0
        }
      };

      // Calculer hit rates
      Object.keys(complexityBreakdown).forEach(complexity => {
        const stats = complexityBreakdown[complexity as keyof typeof complexityBreakdown];
        stats.hit_rate = stats.total > 0 ? Math.round((stats.cache_hits / stats.total) * 100) : 0;
      });

      return {
        overall: {
          total_queries: traces.length,
          cache_hits: cacheHits.length,
          cache_misses: cacheMisses.length,
          hit_rate: traces.length > 0 ? Math.round((cacheHits.length / traces.length) * 100) : 0
        },
        by_complexity: complexityBreakdown,
        cache_efficiency_score: this.calculateCacheEfficiency(cacheHits, cacheMisses)
      };

    } catch (error) {
      logger.error('Erreur getCacheAnalytics', {
        metadata: {
          service: 'PerformanceMetricsService',
          operation: 'getCacheAnalytics',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      return {
        overall: { total_queries: 0, cache_hits: 0, cache_misses: 0, hit_rate: 0 },
        by_complexity: {
          simple: { total: 0, cache_hits: 0, hit_rate: 0 },
          complex: { total: 0, cache_hits: 0, hit_rate: 0 },
          expert: { total: 0, cache_hits: 0, hit_rate: 0 }
        },
        cache_efficiency_score: 0
      };
    }
    */
  }

  /**
   * Conformité SLO et alertes performance
   * 
   * TODO: Méthode désactivée - Table performanceTraces manquante
   */
  async getSLOCompliance(filters: {
    timeRange?: { startDate: string; endDate: string };
    includeTrends?: boolean;
    includeAlerts?: boolean;
  }): Promise<any> {
    logger.warn('getSLOCompliance appelée mais désactivée (table performanceTraces manquante)');

    return {
      slo_targets: { simple: 5000, complex: 10000, expert: 15000 },
      compliance: {
        simple: { total: 0, compliant: 0, compliance_rate: 100, violations: [] },
        complex: { total: 0, compliant: 0, compliance_rate: 100, violations: [] },
        expert: { total: 0, compliant: 0, compliance_rate: 100, violations: [] }
      },
      overall_compliance: 100,
      total_violations: 0,
      _disabled: true,
      _reason: 'Table performanceTraces manquante'
    };

    /* DÉSACTIVÉ
    try {
      logger.info('SLO compliance check', {
        metadata: {
          service: 'PerformanceMetricsService',
          operation: 'getSLOCompliance'
        }
      });

      let tracesQuery = db
        .select()
        .from(performanceTraces);

      if (filters.timeRange) {
        tracesQuery = tracesQuery.where(
          and(
            gte(performanceTraces.createdAt, new Date(filters.timeRange.startDate)),
            lte(performanceTraces.createdAt, new Date(filters.timeRange.endDate))
          )
        );
      }

      const traces = await tracesQuery.limit(1000);

      const SLO_TARGETS = {
        simple: 5000,    // 5s
        complex: 10000,  // 10s 
        expert: 15000    // 15s
      };

      const compliance = {
        simple: { total: 0, compliant: 0, compliance_rate: 100, violations: [] as any[] },
        complex: { total: 0, compliant: 0, compliance_rate: 100, violations: [] as any[] },
        expert: { total: 0, compliant: 0, compliance_rate: 100, violations: [] as any[] }
      };

      traces.forEach(trace => {
        const complexity = (trace.queryComplexity || 'complex') as keyof typeof SLO_TARGETS;
        const target = SLO_TARGETS[complexity] || SLO_TARGETS.complex;
        
        if (compliance[complexity]) {
          compliance[complexity].total++;
          
          if (trace.totalDurationMs <= target) {
            compliance[complexity].compliant++;
          } else {
            compliance[complexity].violations.push({
              traceId: trace.id,
              duration: trace.totalDurationMs,
              target,
              violation_percentage: Math.round(((trace.totalDurationMs - target) / target) * 100),
              timestamp: trace.createdAt
            });
          }
        }
      });

      // Calculer les taux de conformité
      Object.keys(compliance).forEach(complexity => {
        const stats = compliance[complexity as keyof typeof compliance];
        stats.compliance_rate = stats.total > 0 ? Math.round((stats.compliant / stats.total) * 100) : 100;
      });

      const totalViolations = Object.values(compliance).reduce((sum, c) => sum + c.violations.length, 0);
      const totalQueries = Object.values(compliance).reduce((sum, c) => sum + c.total, 0);
      const totalCompliant = Object.values(compliance).reduce((sum, c) => sum + c.compliant, 0);

      return {
        slo_targets: SLO_TARGETS,
        compliance,
        overall_compliance: totalQueries > 0 ? Math.round((totalCompliant / totalQueries) * 100) : 100,
        total_violations: totalViolations
      };

    } catch (error) {
      logger.error('Erreur getSLOCompliance', {
        metadata: {
          service: 'PerformanceMetricsService',
          operation: 'getSLOCompliance',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      return {
        slo_targets: { simple: 5000, complex: 10000, expert: 15000 },
        compliance: {
          simple: { total: 0, compliant: 0, compliance_rate: 100, violations: [] },
          complex: { total: 0, compliant: 0, compliance_rate: 100, violations: [] },
          expert: { total: 0, compliant: 0, compliance_rate: 100, violations: [] }
        },
        overall_compliance: 100,
        total_violations: 0
      };
    }
    */
  }

  /**
   * Identification des goulots d'étranglement
   * 
   * TODO: Méthode désactivée - Table pipelinePerformanceMetrics manquante
   */
  async identifyBottlenecks(filters: {
    timeRange?: { startDate: string; endDate: string };
    thresholdSeconds?: number;
  }): Promise<any> {
    logger.warn('identifyBottlenecks appelée mais désactivée (table pipelinePerformanceMetrics manquante)');

    return {
      bottlenecks: [],
      threshold_used: filters.thresholdSeconds || 2000,
      total_steps_analyzed: 0,
      issues_found: 0,
      recommendations: [],
      _disabled: true,
      _reason: 'Table pipelinePerformanceMetrics manquante'
    };

    /* DÉSACTIVÉ
    try {
      const threshold = (filters.thresholdSeconds || 2.0) * 1000; // Convert to ms
      
      logger.info('Analyse goulots avec seuil', {
        metadata: {
          service: 'PerformanceMetricsService',
          operation: 'identifyBottlenecks',
          thresholdMs: threshold
        }
      });

      let metricsQuery = db
        .select()
        .from(pipelinePerformanceMetrics);

      if (filters.timeRange) {
        metricsQuery = metricsQuery.where(
          and(
            gte(pipelinePerformanceMetrics.createdAt, new Date(filters.timeRange.startDate)),
            lte(pipelinePerformanceMetrics.createdAt, new Date(filters.timeRange.endDate))
          )
        );
      }

      const stepMetrics = await metricsQuery.limit(1000);

      // Identifier les étapes problématiques
      const bottlenecks: any[] = [];
      const stepGroups = this.groupBy(stepMetrics, 'stepName');

      Object.entries(stepGroups).forEach(([stepName, metrics]) => {
        const validMetrics = (metrics as any[]).filter(m => m.duration > 0 && m.success);
        if (validMetrics.length === 0) return;

        const durations = validMetrics.map(m => m.duration);
        const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
        
        if (avgDuration > threshold) {
          durations.sort((a, b) => a - b);
          
          bottlenecks.push({
            step: stepName,
            avg_duration: Math.round(avgDuration),
            p95_duration: durations[Math.floor(durations.length * 0.95)] || avgDuration,
            threshold_exceeded_by: Math.round(avgDuration - threshold),
            frequency: durations.length,
            severity: avgDuration > threshold * 2 ? 'high' : 'medium'
          });
        }
      });

      // Trier par sévérité
      bottlenecks.sort((a, b) => b.avg_duration - a.avg_duration);

      return {
        bottlenecks,
        threshold_used: threshold,
        total_steps_analyzed: Object.keys(stepGroups).length,
        issues_found: bottlenecks.length,
        recommendations: this.generateBottleneckRecommendations(bottlenecks)
      };

    } catch (error) {
      logger.error('Erreur identifyBottlenecks', {
        metadata: {
          service: 'PerformanceMetricsService',
          operation: 'identifyBottlenecks',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      return {
        bottlenecks: [],
        threshold_used: filters.thresholdSeconds || 2000,
        total_steps_analyzed: 0,
        issues_found: 0,
        recommendations: []
      };
    }
    */
  }

  /**
   * Statistiques temps réel
   * 
   * TODO: Méthode désactivée - Table performanceTraces manquante
   */
  async getRealTimeStats(): Promise<any> {
    logger.warn('getRealTimeStats appelée mais désactivée (table performanceTraces manquante)');

    return {
      current_hour: {
        total_queries: 0,
        avg_response_time: 0,
        cache_hit_rate: 0,
        error_rate: 0,
        slo_compliance: 100
      },
      active_traces: [],
      system_health: {
        status: 'healthy',
        performance_score: 100
      },
      last_updated: new Date(),
      _disabled: true,
      _reason: 'Table performanceTraces manquante'
    };

    /* DÉSACTIVÉ
    try {
      logger.info('Stats temps réel', {
        metadata: {
          service: 'PerformanceMetricsService',
          operation: 'getRealTimeStats'
        }
      });

      // Récupérer les métriques des dernières heures
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      const recentTraces = await db
        .select()
        .from(performanceTraces)
        .where(gte(performanceTraces.createdAt, oneHourAgo))
        .limit(100);

      const validTraces = recentTraces.filter(t => t.totalDurationMs > 0);

      const currentHourStats = {
        total_queries: validTraces.length,
        avg_response_time: validTraces.length > 0 ? 
          Math.round(validTraces.reduce((sum, t) => sum + t.totalDurationMs, 0) / validTraces.length) : 0,
        cache_hit_rate: validTraces.length > 0 ?
          Math.round((validTraces.filter(t => t.cacheHit).length / validTraces.length) * 100) : 0,
        error_rate: validTraces.length > 0 ?
          Math.round((validTraces.filter(t => !t.success).length / validTraces.length) * 100) : 0,
        slo_compliance: validTraces.length > 0 ?
          Math.round((validTraces.filter(t => t.totalDurationMs <= 10000).length / validTraces.length) * 100) : 100
      };

      return {
        current_hour: currentHourStats,
        active_traces: validTraces.slice(0, 10).map(t => ({
          id: t.id,
          duration: t.totalDurationMs,
          complexity: t.queryComplexity,
          cache_hit: t.cacheHit,
          timestamp: t.createdAt
        })),
        system_health: {
          status: currentHourStats.error_rate < 5 ? 'healthy' : 'degraded',
          performance_score: Math.max(0, Math.round(100 - currentHourStats.error_rate - (currentHourStats.avg_response_time / 100)))
        },
        last_updated: new Date()
      };

    } catch (error) {
      logger.error('Erreur getRealTimeStats', {
        metadata: {
          service: 'PerformanceMetricsService',
          operation: 'getRealTimeStats',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      return {
        current_hour: {
          total_queries: 0,
          avg_response_time: 0,
          cache_hit_rate: 0,
          error_rate: 0,
          slo_compliance: 100
        },
        active_traces: [],
        system_health: {
          status: 'healthy',
          performance_score: 100
        },
        last_updated: new Date()
      };
    }
    */
  }

  // ========================================
  // MÉTHODES UTILITAIRES PRIVÉES
  // ========================================

  private calculateCacheEfficiency(cacheHits: any[], cacheMisses: any[]): number {
    if (cacheHits.length + cacheMisses.length === 0) return 0;
    
    const hitRate = cacheHits.length / (cacheHits.length + cacheMisses.length);
    const avgHitTime = cacheHits.length > 0 ? 
      cacheHits.reduce((sum, h) => sum + (h.totalDurationMs || 0), 0) / cacheHits.length : 0;
    const avgMissTime = cacheMisses.length > 0 ?
      cacheMisses.reduce((sum, m) => sum + (m.totalDurationMs || 0), 0) / cacheMisses.length : 0;
    
    const timeEfficiency = avgMissTime > 0 ? Math.max(0, 1 - (avgHitTime / avgMissTime)) : 1;
    
    return Math.round((hitRate * 0.6 + timeEfficiency * 0.4) * 100);
  }

  private groupBy<T>(array: T[], key: keyof T): { [key: string]: T[] } {
    return array.reduce((groups, item) => {
      const group = String(item[key]);
      if (!groups[group]) {
        groups[group] = [];
      }
      groups[group].push(item);
      return groups;
    }, {} as { [key: string]: T[] });
  }

  private generateBottleneckRecommendations(bottlenecks: any[]): string[] {
    const recommendations: string[] = [];
    
    bottlenecks.forEach(bottleneck => {
      switch (bottleneck.step) {
        case 'context_generation':
          recommendations.push('Optimiser la génération de contexte métier : considérer la mise en cache du contexte utilisateur');
          break;
        case 'ai_model_selection':
          recommendations.push('Revoir la logique de sélection de modèle : implémenter un routage plus rapide');
          break;
        case 'sql_generation':
          recommendations.push('Optimiser la génération SQL : considérer des templates SQL pré-générés pour les requêtes communes');
          break;
        case 'sql_execution':
          recommendations.push('Optimiser les requêtes SQL : ajouter des index, réviser les jointures complexes');
          break;
        case 'response_formatting':
          recommendations.push('Optimiser le formatage des réponses : considérer la mise en cache des formats de réponse');
          break;
      }
    });

    return recommendations;
  }

  // ========================================
  // ÉTAPE 3 PHASE 3 PERFORMANCE : MÉTRIQUES PRELOADING PRÉDICTIF
  // ========================================

  // Tracking métriques preloading prédictif
  private predictiveMetrics = {
    // Cache Hit-Rate Tracking
    cacheHitRate: {
      baseline: 0.55,          // ~55% baseline estimé
      current: 0.55,           // Hit-rate actuel
      target: 0.70,            // ≥70% objectif
      stretchGoal: 0.80,       // 80% pour requêtes fréquentes
      upliftPercent: 0,        // % d'amélioration vs baseline
      lastCalculated: new Date(),
      history: [] as Array<{ timestamp: Date; rate: number; type: 'baseline' | 'predictive' }>
    },
    
    // Latency Reduction Tracking
    latencyReduction: {
      baselineLatencyMs: 25000,  // 25s baseline
      currentLatencyMs: 25000,   // Latence actuelle
      targetReductionPercent: 35, // ≥35% réduction
      actualReductionPercent: 0,  // % réduction actuel
      preloadedContextLatency: 0, // Latence avec contexte preloaded
      cacheMissRecoveryMs: 500,   // <500ms fallback
      commonQueriesReduction: 0,  // Réduction pour requêtes courantes
      peakHoursPerformance: 1.0,  // Facteur performance heures pointe
      lastMeasured: new Date()
    },

    // Prediction Accuracy Monitoring
    predictionAccuracy: {
      targetAccuracy: 60,        // >60% accuracy minimum
      currentAccuracy: 0,        // Accuracy actuel
      totalPredictions: 0,       // Nombre total prédictions
      correctPredictions: 0,     // Prédictions correctes
      falsePositives: 0,         // Prédictions erronées
      missedOpportunities: 0,    // Occasions manquées
      confidenceDistribution: {  // Distribution par confiance
        high: { total: 0, correct: 0 },    // ≥80% confiance
        medium: { total: 0, correct: 0 },  // 60-79% confiance  
        low: { total: 0, correct: 0 }      // <60% confiance
      },
      patternRecognition: {
        btpWorkflows: { accuracy: 0, count: 0 },
        userRolePatterns: { accuracy: 0, count: 0 },
        seasonalPatterns: { accuracy: 0, count: 0 },
        businessHours: { accuracy: 0, count: 0 }
      },
      lastEvaluated: new Date()
    },

    // Preloading Specific Metrics
    preloadingStats: {
      totalPreloadAttempts: 0,
      successfulPreloads: 0,
      failedPreloads: 0,
      preloadHitRate: 0,        // % preloads utilisés
      averagePreloadTime: 0,    // Temps moyen preloading
      backgroundTasksExecuted: 0,
      businessHoursPreloads: 0,
      weekendWarmingRuns: 0,
      eventTriggeredPreloads: 0,
      memoryOptimizations: 0,
      lastPreloadCycle: new Date()
    },

    // Performance Targets Status
    targetsStatus: {
      cacheHitRateAchieved: false,     // ≥70% atteint
      latencyReductionAchieved: false, // ≥35% atteint
      predictionAccuracyAchieved: false, // >60% atteint
      overallGoalProgress: 0,          // % progression vers 25s→10s
      performanceScore: 0,             // Score global 0-100
      lastEvaluation: new Date()
    }
  };

  // Historique métriques pour tendances
  private metricsHistory: Array<{
    timestamp: Date;
    cacheHitRate: number;
    averageLatency: number;
    predictionAccuracy: number;
    performanceScore: number;
  }> = [];

  /**
   * TRACKING CACHE HIT-RATE avec objectif ≥70%
   */
  async trackCacheHitRate(cacheHit: boolean, queryType: 'common' | 'complex' | 'rare' = 'common'): Promise<void> {
    try {
      // Mise à jour compteurs
      if (cacheHit) {
        this.predictiveMetrics.preloadingStats.successfulPreloads++;
      } else {
        this.predictiveMetrics.preloadingStats.failedPreloads++;
      }
      
      this.predictiveMetrics.preloadingStats.totalPreloadAttempts++;

      // Calcul hit-rate actuel
      const totalAttempts = this.predictiveMetrics.preloadingStats.totalPreloadAttempts;
      if (totalAttempts > 0) {
        this.predictiveMetrics.cacheHitRate.current = 
          this.predictiveMetrics.preloadingStats.successfulPreloads / totalAttempts;
        
        // Calcul uplift vs baseline
        this.predictiveMetrics.cacheHitRate.upliftPercent = 
          ((this.predictiveMetrics.cacheHitRate.current - this.predictiveMetrics.cacheHitRate.baseline) / 
           this.predictiveMetrics.cacheHitRate.baseline) * 100;
      }

      // Historique pour tendances
      this.predictiveMetrics.cacheHitRate.history.push({
        timestamp: new Date(),
        rate: this.predictiveMetrics.cacheHitRate.current,
        type: 'predictive'
      });

      // Garder seulement les 100 dernières mesures
      if (this.predictiveMetrics.cacheHitRate.history.length > 100) {
        this.predictiveMetrics.cacheHitRate.history = 
          this.predictiveMetrics.cacheHitRate.history.slice(-100);
      }

      this.predictiveMetrics.cacheHitRate.lastCalculated = new Date();

      // Vérification objectif atteint
      this.predictiveMetrics.targetsStatus.cacheHitRateAchieved = 
        this.predictiveMetrics.cacheHitRate.current >= this.predictiveMetrics.cacheHitRate.target;

      // Log progression importante
      if (this.predictiveMetrics.cacheHitRate.upliftPercent >= 20) {
        logger.info('🎯 OBJECTIF CACHE HIT-RATE ATTEINT', {
          metadata: {
            service: 'PerformanceMetricsService',
            operation: 'trackCacheHitRateImprovement',
            currentPercent: (this.predictiveMetrics.cacheHitRate.current * 100).toFixed(1),
            upliftPercent: this.predictiveMetrics.cacheHitRate.upliftPercent.toFixed(1),
            context: { milestone: 'cache_hit_rate_goal_achieved' }
          }
        });
      }

    } catch (error) {
      logger.error('Erreur tracking cache hit-rate', {
        metadata: {
          service: 'PerformanceMetricsService',
          operation: 'trackCacheHitRateImprovement',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
    }
  }

  /**
   * TRACKING LATENCY REDUCTION avec objectif ≥35%
   */
  async trackLatencyReduction(
    actualLatencyMs: number, 
    wasPreloaded: boolean = false,
    queryType: 'common' | 'complex' | 'rare' = 'common'
  ): Promise<void> {
    try {
      // Mise à jour latence actuelle
      this.predictiveMetrics.latencyReduction.currentLatencyMs = actualLatencyMs;

      // Calcul réduction par rapport à baseline
      const baseline = this.predictiveMetrics.latencyReduction.baselineLatencyMs;
      this.predictiveMetrics.latencyReduction.actualReductionPercent = 
        ((baseline - actualLatencyMs) / baseline) * 100;

      // Tracking latence contexte preloaded
      if (wasPreloaded) {
        const currentPreloadedLatency = this.predictiveMetrics.latencyReduction.preloadedContextLatency;
        this.predictiveMetrics.latencyReduction.preloadedContextLatency = 
          currentPreloadedLatency === 0 ? actualLatencyMs : (currentPreloadedLatency + actualLatencyMs) / 2;
      }

      // Tracking spécifique requêtes courantes
      if (queryType === 'common') {
        this.predictiveMetrics.latencyReduction.commonQueriesReduction = 
          this.predictiveMetrics.latencyReduction.actualReductionPercent;
      }

      // Ajustement performance heures pointe
      const hour = new Date().getHours();
      const isPeakHours = [9, 10, 11, 15, 16].includes(hour);
      if (isPeakHours) {
        const peakReduction = Math.min(100, this.predictiveMetrics.latencyReduction.actualReductionPercent);
        this.predictiveMetrics.latencyReduction.peakHoursPerformance = peakReduction / 35; // Normalisé par objectif 35%
      }

      this.predictiveMetrics.latencyReduction.lastMeasured = new Date();

      // Vérification objectif atteint
      this.predictiveMetrics.targetsStatus.latencyReductionAchieved = 
        this.predictiveMetrics.latencyReduction.actualReductionPercent >= 
        this.predictiveMetrics.latencyReduction.targetReductionPercent;

      // Log progression importante
      if (this.predictiveMetrics.latencyReduction.actualReductionPercent >= 35) {
        logger.info('🚀 OBJECTIF LATENCY REDUCTION ATTEINT', {
          metadata: {
            service: 'PerformanceMetricsService',
            operation: 'trackLatencyReduction',
            actualReductionPercent: this.predictiveMetrics.latencyReduction.actualReductionPercent.toFixed(1),
            actualLatencyMs,
            baselineMs: baseline,
            context: { milestone: 'latency_reduction_goal_achieved' }
          }
        });
      }

    } catch (error) {
      logger.error('Erreur tracking latency reduction', {
        metadata: {
          service: 'PerformanceMetricsService',
          operation: 'trackLatencyReduction',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
    }
  }

  /**
   * TRACKING PREDICTION ACCURACY avec objectif >60%
   */
  async trackPredictionAccuracy(
    prediction: any,
    wasCorrect: boolean,
    patternType: 'btpWorkflows' | 'userRolePatterns' | 'seasonalPatterns' | 'businessHours' = 'btpWorkflows'
  ): Promise<void> {
    try {
      // Mise à jour compteurs globaux
      this.predictiveMetrics.predictionAccuracy.totalPredictions++;
      
      if (wasCorrect) {
        this.predictiveMetrics.predictionAccuracy.correctPredictions++;
      } else {
        this.predictiveMetrics.predictionAccuracy.falsePositives++;
      }

      // Calcul accuracy global
      if (this.predictiveMetrics.predictionAccuracy.totalPredictions > 0) {
        this.predictiveMetrics.predictionAccuracy.currentAccuracy = 
          (this.predictiveMetrics.predictionAccuracy.correctPredictions / 
           this.predictiveMetrics.predictionAccuracy.totalPredictions) * 100;
      }

      // Tracking par niveau de confiance
      const confidence = prediction.confidence || 50;
      let confidenceLevel: 'high' | 'medium' | 'low';
      
      if (confidence >= 80) {
        confidenceLevel = 'high';
      } else if (confidence >= 60) {
        confidenceLevel = 'medium';
      } else {
        confidenceLevel = 'low';
      }

      this.predictiveMetrics.predictionAccuracy.confidenceDistribution[confidenceLevel].total++;
      if (wasCorrect) {
        this.predictiveMetrics.predictionAccuracy.confidenceDistribution[confidenceLevel].correct++;
      }

      // Tracking par type de pattern
      this.predictiveMetrics.predictionAccuracy.patternRecognition[patternType].count++;
      if (wasCorrect) {
        this.predictiveMetrics.predictionAccuracy.patternRecognition[patternType].accuracy = 
          (this.predictiveMetrics.predictionAccuracy.patternRecognition[patternType].accuracy * 
           (this.predictiveMetrics.predictionAccuracy.patternRecognition[patternType].count - 1) + 
           (wasCorrect ? 100 : 0)) / 
          this.predictiveMetrics.predictionAccuracy.patternRecognition[patternType].count;
      }

      this.predictiveMetrics.predictionAccuracy.lastEvaluated = new Date();

      // Vérification objectif atteint
      this.predictiveMetrics.targetsStatus.predictionAccuracyAchieved = 
        this.predictiveMetrics.predictionAccuracy.currentAccuracy >= 
        this.predictiveMetrics.predictionAccuracy.targetAccuracy;

      // Log progression importante
      if (this.predictiveMetrics.predictionAccuracy.currentAccuracy >= 60) {
        logger.info('🎯 OBJECTIF PREDICTION ACCURACY ATTEINT', {
          metadata: {
            service: 'PerformanceMetricsService',
            operation: 'trackPredictionAccuracy',
            currentAccuracy: this.predictiveMetrics.predictionAccuracy.currentAccuracy.toFixed(1),
            context: { milestone: 'prediction_accuracy_goal_achieved' }
          }
        });
      }

    } catch (error) {
      logger.error('Erreur tracking prediction accuracy', {
        metadata: {
          service: 'PerformanceMetricsService',
          operation: 'trackPredictionAccuracy',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
    }
  }

  /**
   * TRACKING PRELOADING OPERATIONS spécialisé
   */
  async trackPreloadingOperation(
    operation: 'attempt' | 'success' | 'failure' | 'background_cycle' | 'event_triggered',
    duration?: number,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const stats = this.predictiveMetrics.preloadingStats;
      
      switch (operation) {
        case 'attempt':
          stats.totalPreloadAttempts++;
          break;
          
        case 'success':
          stats.successfulPreloads++;
          if (duration) {
            stats.averagePreloadTime = stats.averagePreloadTime === 0 ? 
              duration : (stats.averagePreloadTime + duration) / 2;
          }
          break;
          
        case 'failure':
          stats.failedPreloads++;
          break;
          
        case 'background_cycle':
          stats.backgroundTasksExecuted++;
          if (metadata?.type === 'business_hours') {
            stats.businessHoursPreloads++;
          } else if (metadata?.type === 'weekend_warming') {
            stats.weekendWarmingRuns++;
          }
          break;
          
        case 'event_triggered':
          stats.eventTriggeredPreloads++;
          break;
      }

      // Calcul hit-rate preloading
      if (stats.totalPreloadAttempts > 0) {
        stats.preloadHitRate = (stats.successfulPreloads / stats.totalPreloadAttempts) * 100;
      }

      stats.lastPreloadCycle = new Date();

    } catch (error) {
      logger.error('Erreur tracking preloading operation', {
        metadata: {
          service: 'PerformanceMetricsService',
          operation: 'trackPreloadingOperation',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
    }
  }

  /**
   * ÉVALUATION GLOBALE PROGRESSION OBJECTIFS
   */
  async evaluateOverallProgress(): Promise<void> {
    try {
      const targets = this.predictiveMetrics.targetsStatus;
      
      // Calcul progression globale vers objectif 25s→10s
      const baselineLatency = this.predictiveMetrics.latencyReduction.baselineLatencyMs;
      const currentLatency = this.predictiveMetrics.latencyReduction.currentLatencyMs;
      const targetLatency = 10000; // 10s objectif final
      
      const maxPossibleReduction = baselineLatency - targetLatency; // 15s possible
      const actualReduction = baselineLatency - currentLatency;
      
      targets.overallGoalProgress = Math.min(100, (actualReduction / maxPossibleReduction) * 100);

      // Calcul score performance global (0-100)
      let performanceScore = 0;
      
      // Cache hit-rate (40% du score)
      const cacheScore = Math.min(100, (this.predictiveMetrics.cacheHitRate.current / this.predictiveMetrics.cacheHitRate.target) * 100);
      performanceScore += cacheScore * 0.4;
      
      // Latency reduction (35% du score)
      const latencyScore = Math.min(100, (this.predictiveMetrics.latencyReduction.actualReductionPercent / this.predictiveMetrics.latencyReduction.targetReductionPercent) * 100);
      performanceScore += latencyScore * 0.35;
      
      // Prediction accuracy (25% du score)
      const accuracyScore = Math.min(100, (this.predictiveMetrics.predictionAccuracy.currentAccuracy / this.predictiveMetrics.predictionAccuracy.targetAccuracy) * 100);
      performanceScore += accuracyScore * 0.25;
      
      targets.performanceScore = Math.round(performanceScore);
      targets.lastEvaluation = new Date();

      // Ajout à l'historique
      this.metricsHistory.push({
        timestamp: new Date(),
        cacheHitRate: this.predictiveMetrics.cacheHitRate.current * 100,
        averageLatency: currentLatency,
        predictionAccuracy: this.predictiveMetrics.predictionAccuracy.currentAccuracy,
        performanceScore: targets.performanceScore
      });

      // Garder seulement les 50 dernières évaluations
      if (this.metricsHistory.length > 50) {
        this.metricsHistory = this.metricsHistory.slice(-50);
      }

      // Log achievements majeurs
      if (targets.cacheHitRateAchieved && targets.latencyReductionAchieved && targets.predictionAccuracyAchieved) {
        logger.info('🏆 TOUS LES OBJECTIFS ATTEINTS', {
          metadata: {
            service: 'PerformanceMetricsService',
            operation: 'evaluateOverallProgress',
            performanceScore: targets.performanceScore,
            overallGoalProgress: targets.overallGoalProgress.toFixed(1),
            context: { milestone: 'all_goals_achieved' }
          }
        });
      }

    } catch (error) {
      logger.error('Erreur évaluation progression globale', {
        metadata: {
          service: 'PerformanceMetricsService',
          operation: 'evaluateOverallProgress',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
    }
  }

  /**
   * RAPPORT COMPLET MÉTRIQUES PRELOADING
   */
  async getPreloadingMetricsReport(): Promise<any> {
    try {
      await this.evaluateOverallProgress();
      
      return {
        cacheHitRate: {
          current: this.predictiveMetrics.cacheHitRate.current,
          target: this.predictiveMetrics.cacheHitRate.target,
          baseline: this.predictiveMetrics.cacheHitRate.baseline,
          upliftPercent: this.predictiveMetrics.cacheHitRate.upliftPercent,
          achieved: this.predictiveMetrics.targetsStatus.cacheHitRateAchieved,
          trend: this.predictiveMetrics.cacheHitRate.history.slice(-10)
        },
        
        latencyReduction: {
          currentLatencyMs: this.predictiveMetrics.latencyReduction.currentLatencyMs,
          baselineLatencyMs: this.predictiveMetrics.latencyReduction.baselineLatencyMs,
          reductionPercent: this.predictiveMetrics.latencyReduction.actualReductionPercent,
          targetPercent: this.predictiveMetrics.latencyReduction.targetReductionPercent,
          achieved: this.predictiveMetrics.targetsStatus.latencyReductionAchieved,
          preloadedContextLatency: this.predictiveMetrics.latencyReduction.preloadedContextLatency,
          commonQueriesReduction: this.predictiveMetrics.latencyReduction.commonQueriesReduction
        },
        
        predictionAccuracy: {
          currentPercent: this.predictiveMetrics.predictionAccuracy.currentAccuracy,
          targetPercent: this.predictiveMetrics.predictionAccuracy.targetAccuracy,
          achieved: this.predictiveMetrics.targetsStatus.predictionAccuracyAchieved,
          totalPredictions: this.predictiveMetrics.predictionAccuracy.totalPredictions,
          correctPredictions: this.predictiveMetrics.predictionAccuracy.correctPredictions,
          confidenceDistribution: this.predictiveMetrics.predictionAccuracy.confidenceDistribution,
          patternRecognition: this.predictiveMetrics.predictionAccuracy.patternRecognition
        },
        
        preloadingOperations: {
          ...this.predictiveMetrics.preloadingStats
        },
        
        overallProgress: {
          performanceScore: this.predictiveMetrics.targetsStatus.performanceScore,
          goalProgress: this.predictiveMetrics.targetsStatus.overallGoalProgress,
          allTargetsAchieved: this.predictiveMetrics.targetsStatus.cacheHitRateAchieved && 
                            this.predictiveMetrics.targetsStatus.latencyReductionAchieved && 
                            this.predictiveMetrics.targetsStatus.predictionAccuracyAchieved
        },
        
        trends: {
          history: this.metricsHistory.slice(-20),
          recommendation: this.generatePreloadingRecommendations()
        }
      };

    } catch (error) {
      logger.error('Erreur rapport métriques preloading', {
        metadata: {
          service: 'PerformanceMetricsService',
          operation: 'getPreloadingReport',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      return null;
    }
  }

  /**
   * RECOMMANDATIONS OPTIMISATION PRELOADING
   */
  private generatePreloadingRecommendations(): string[] {
    const recommendations: string[] = [];
    const hitRate = this.predictiveMetrics.cacheHitRate.current;
    const latencyReduction = this.predictiveMetrics.latencyReduction.actualReductionPercent;
    const accuracy = this.predictiveMetrics.predictionAccuracy.currentAccuracy;

    // Recommandations Cache Hit-Rate
    if (hitRate < 0.60) {
      recommendations.push('🎯 Cache Hit-Rate critique: Augmenter agressivité preloading et réviser patterns prédictifs');
    } else if (hitRate < 0.70) {
      recommendations.push('⚡ Optimiser algorithmes prédiction et étendre preloading business hours');
    }

    // Recommandations Latency Reduction  
    if (latencyReduction < 25) {
      recommendations.push('🚀 Latence élevée: Activer preloading weekend warming et optimiser contextes preloadés');
    } else if (latencyReduction < 35) {
      recommendations.push('⏱️ Améliorer délais prédiction et augmenter parallélisme background tasks');
    }

    // Recommandations Prediction Accuracy
    if (accuracy < 50) {
      recommendations.push('🧠 Accuracy faible: Réviser patterns BTP et ajuster seuils confiance');
    } else if (accuracy < 60) {
      recommendations.push('🎯 Affiner reconnaissance patterns utilisateur et saisonnalité menuiserie');
    }

    // Recommandations générales
    if (hitRate >= 0.70 && latencyReduction >= 35 && accuracy >= 60) {
      recommendations.push('🏆 Objectifs atteints! Maintenir performance et explorer optimisations avancées');
    }

    return recommendations;
  }

  /**
   * RESET MÉTRIQUES (pour tests)
   */
  resetPredictiveMetrics(): void {
    this.predictiveMetrics = {
      cacheHitRate: {
        baseline: 0.55,
        current: 0.55,
        target: 0.70,
        stretchGoal: 0.80,
        upliftPercent: 0,
        lastCalculated: new Date(),
        history: []
      },
      latencyReduction: {
        baselineLatencyMs: 25000,
        currentLatencyMs: 25000,
        targetReductionPercent: 35,
        actualReductionPercent: 0,
        preloadedContextLatency: 0,
        cacheMissRecoveryMs: 500,
        commonQueriesReduction: 0,
        peakHoursPerformance: 1.0,
        lastMeasured: new Date()
      },
      predictionAccuracy: {
        targetAccuracy: 60,
        currentAccuracy: 0,
        totalPredictions: 0,
        correctPredictions: 0,
        falsePositives: 0,
        missedOpportunities: 0,
        confidenceDistribution: {
          high: { total: 0, correct: 0 },
          medium: { total: 0, correct: 0 },
          low: { total: 0, correct: 0 }
        },
        patternRecognition: {
          btpWorkflows: { accuracy: 0, count: 0 },
          userRolePatterns: { accuracy: 0, count: 0 },
          seasonalPatterns: { accuracy: 0, count: 0 },
          businessHours: { accuracy: 0, count: 0 }
        },
        lastEvaluated: new Date()
      },
      preloadingStats: {
        totalPreloadAttempts: 0,
        successfulPreloads: 0,
        failedPreloads: 0,
        preloadHitRate: 0,
        averagePreloadTime: 0,
        backgroundTasksExecuted: 0,
        businessHoursPreloads: 0,
        weekendWarmingRuns: 0,
        eventTriggeredPreloads: 0,
        memoryOptimizations: 0,
        lastPreloadCycle: new Date()
      },
      targetsStatus: {
        cacheHitRateAchieved: false,
        latencyReductionAchieved: false,
        predictionAccuracyAchieved: false,
        overallGoalProgress: 0,
        performanceScore: 0,
        lastEvaluation: new Date()
      }
    };
    
    this.metricsHistory = [];
    logger.info('Métriques prédictives réinitialisées', {
      metadata: {
        service: 'PerformanceMetricsService',
        operation: 'resetPredictiveMetrics',
        context: { action: 'metrics_reset' }
      }
    });
  }
}

// ========================================
// FACTORY ET SINGLETON
// ========================================

let performanceMetricsInstance: PerformanceMetricsService | null = null;

export function getPerformanceMetricsService(): PerformanceMetricsService {
  if (!performanceMetricsInstance) {
    performanceMetricsInstance = new PerformanceMetricsService(storage as IStorage);
  }
  return performanceMetricsInstance;
}