import { IStorage } from "../storage-poc";
import { db } from "../db";
import { sql, eq, and, desc, gte, lte, asc } from "drizzle-orm";
import crypto from "crypto";
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
    console.log(`[PerformanceMetrics] Démarrage trace pipeline ${traceId} - complexité: ${complexity}`);
  }

  /**
   * Démarre une étape spécifique du pipeline
   */
  startStep(traceId: string, stepName: PipelineStep, metadata?: Record<string, any>): void {
    const traces = this.activeTraces.get(traceId);
    if (!traces) {
      console.warn(`[PerformanceMetrics] Tentative start step ${stepName} sur trace inexistante ${traceId}`);
      return;
    }

    const stepMetrics: PipelineStepMetrics = {
      stepName,
      startTime: Date.now(),
      success: true, // Assumé success jusqu'à preuve contraire
      metadata
    };

    traces.push(stepMetrics);
    console.log(`[PerformanceMetrics] Démarrage étape ${stepName} pour trace ${traceId}`);
  }

  /**
   * Termine une étape du pipeline
   */
  endStep(traceId: string, stepName: PipelineStep, success: boolean = true, metadata?: Record<string, any>): void {
    const traces = this.activeTraces.get(traceId);
    if (!traces) {
      console.warn(`[PerformanceMetrics] Tentative end step ${stepName} sur trace inexistante ${traceId}`);
      return;
    }

    // Recherche de l'étape en cours (dernière avec ce nom sans endTime)
    const step = traces.reverse().find(s => s.stepName === stepName && !s.endTime);
    traces.reverse(); // Restaurer ordre original

    if (!step) {
      console.warn(`[PerformanceMetrics] Étape ${stepName} non trouvée pour trace ${traceId}`);
      return;
    }

    step.endTime = Date.now();
    step.duration = step.endTime - step.startTime;
    step.success = success;
    if (metadata) {
      step.metadata = { ...step.metadata, ...metadata };
    }

    console.log(`[PerformanceMetrics] Fin étape ${stepName} (${step.duration}ms) pour trace ${traceId}`);
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
      console.warn(`[PerformanceMetrics] Tentative end pipeline sur trace inexistante ${traceId}`);
      return this.createEmptyTimings();
    }

    const timings = this.calculateDetailedTimings(traces);
    
    // Persistance en base
    try {
      await this.persistPipelineMetrics({
        id: crypto.randomUUID(),
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
        metadata: JSON.stringify(additionalMetadata || {}),
        timestamp: new Date()
      });

      // Vérification SLO et alertes
      await this.checkSLOViolation(complexity, timings.total, traceId, userId);

      // Cleanup trace active
      this.activeTraces.delete(traceId);

      console.log(`[PerformanceMetrics] Pipeline trace ${traceId} terminé - ${timings.total}ms total`);

    } catch (error) {
      console.error(`[PerformanceMetrics] Erreur persistance trace ${traceId}:`, error);
    }

    return timings;
  }

  // ========================================
  // CALCULS MÉTRIQUES AVANCÉES
  // ========================================

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
      cacheOperations: 0
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
      
      let query = db
        .select({
          duration: sql<number>`${sql.raw(columnName)}`,
        })
        .from(pipelineMetrics)
        .where(and(
          gte(pipelineMetrics.timestamp, since),
          eq(pipelineMetrics.success, true)
        ));

      if (complexity) {
        query = query.where(and(
          gte(pipelineMetrics.timestamp, since),
          eq(pipelineMetrics.success, true),
          eq(pipelineMetrics.complexity, complexity)
        ));
      }

      const results = await query;
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
      console.error(`[PerformanceMetrics] Erreur calcul percentiles pour ${stepName}:`, error);
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
      console.error(`[PerformanceMetrics] Erreur analyse cache:`, error);
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
        console.warn(`[PerformanceMetrics] ALERTE SLO - ${complexity}: ${actualDuration}ms > ${threshold}ms`);
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
      cacheOperations: 0
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

    for (const [traceId, traces] of this.activeTraces.entries()) {
      const hasRecentActivity = traces.some(t => t.startTime > cutoff);
      if (!hasRecentActivity) {
        this.activeTraces.delete(traceId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`[PerformanceMetrics] Nettoyé ${cleaned} traces expirées`);
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
      console.error('[PerformanceMetrics] Erreur refresh métriques temps réel:', error);
    }
  }

  // ========================================
  // MÉTHODES DE PERSISTANCE
  // ========================================

  private async persistPipelineMetrics(metrics: InsertPipelineMetrics): Promise<void> {
    try {
      await db.insert(pipelineMetrics).values(metrics);
    } catch (error) {
      console.error('[PerformanceMetrics] Erreur persistance métriques:', error);
      throw error;
    }
  }

  private async createPerformanceAlert(alert: any): Promise<void> {
    try {
      await db.insert(performanceAlerts).values(alert);
    } catch (error) {
      console.error('[PerformanceMetrics] Erreur création alerte:', error);
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
      console.error('[PerformanceMetrics] Erreur récupération alertes:', error);
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
      console.error('[PerformanceMetrics] Erreur acquittement alerte:', error);
      return false;
    }
  }

  // ========================================
  // MÉTHODES DASHBOARD API
  // ========================================

  /**
   * Récupère les métriques détaillées par étape du pipeline
   */
  async getPipelineMetrics(filters: {
    timeRange?: { startDate: string; endDate: string };
    complexity?: 'simple' | 'complex' | 'expert';
    userId?: string;
    includePercentiles?: boolean;
  }): Promise<any> {
    try {
      console.log('[PerformanceMetrics] Récupération métriques pipeline avec filtres:', filters);

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
      console.error('[PerformanceMetrics] Erreur getPipelineMetrics:', error);
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
  }

  /**
   * Analyse des performances cache par complexité
   */
  async getCacheAnalytics(filters: {
    timeRange?: { startDate: string; endDate: string };
    breakdown?: 'complexity' | 'user' | 'time';
  }): Promise<any> {
    try {
      console.log('[PerformanceMetrics] Cache analytics breakdown:', filters.breakdown);

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
      console.error('[PerformanceMetrics] Erreur getCacheAnalytics:', error);
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
  }

  /**
   * Conformité SLO et alertes performance
   */
  async getSLOCompliance(filters: {
    timeRange?: { startDate: string; endDate: string };
    includeTrends?: boolean;
    includeAlerts?: boolean;
  }): Promise<any> {
    try {
      console.log('[PerformanceMetrics] SLO compliance check');

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
      console.error('[PerformanceMetrics] Erreur getSLOCompliance:', error);
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
  }

  /**
   * Identification des goulots d'étranglement
   */
  async identifyBottlenecks(filters: {
    timeRange?: { startDate: string; endDate: string };
    thresholdSeconds?: number;
  }): Promise<any> {
    try {
      const threshold = (filters.thresholdSeconds || 2.0) * 1000; // Convert to ms
      
      console.log('[PerformanceMetrics] Analyse goulots avec seuil:', threshold, 'ms');

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
      console.error('[PerformanceMetrics] Erreur identifyBottlenecks:', error);
      return {
        bottlenecks: [],
        threshold_used: filters.thresholdSeconds || 2000,
        total_steps_analyzed: 0,
        issues_found: 0,
        recommendations: []
      };
    }
  }

  /**
   * Statistiques temps réel
   */
  async getRealTimeStats(): Promise<any> {
    try {
      console.log('[PerformanceMetrics] Stats temps réel');

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
      console.error('[PerformanceMetrics] Erreur getRealTimeStats:', error);
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
}

// ========================================
// FACTORY ET SINGLETON
// ========================================

let performanceMetricsInstance: PerformanceMetricsService | null = null;

export function getPerformanceMetricsService(storage: IStorage): PerformanceMetricsService {
  if (!performanceMetricsInstance) {
    performanceMetricsInstance = new PerformanceMetricsService(storage);
  }
  return performanceMetricsInstance;
}