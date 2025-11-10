/**
 * TECHNICAL METRICS SERVICE - Consolidated Performance Monitoring
 * 
 * Consolidates technical performance monitoring from PerformanceMetricsService:
 * - Pipeline step tracing and performance analysis
 * - SLO tracking and violation alerts
 * - Circuit breaker patterns for parallelism
 * - Cache hit-rate analytics
 * - Percentile statistics (p50, p95, p99)
 * - Real-time performance metrics
 * 
 * Dependencies:
 * - IStorage: Storage operations
 * - db: Direct database access for metrics tables
 * - Schema tables: pipelineMetrics, performanceSLOs, performanceAlerts
 * 
 * Target LOC: ~1,800-2,000 (from 2,226, removing disabled methods)
 */

import type { IStorage } from "../../storage-poc";
import { withErrorHandling } from './utils/error-handler';
import { db } from "../../db";
import { sql, eq, and, desc, gte, lte } from "drizzle-orm";
import crypto from "crypto";
import { logger } from '../../utils/logger';
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
// CONSTANTS
// ========================================

const SLO_THRESHOLDS = {
  simple: 5000,    // 5 seconds
  complex: 10000,  // 10 seconds  
  expert: 15000    // 15 seconds
} as const;

const ALERT_COOLDOWN_MINUTES = 15;
const METRICS_RETENTION_DAYS = 90;
const REALTIME_WINDOW_MINUTES = 60;

// ========================================
// TYPE DEFINITIONS
// ========================================

export interface PipelineStepMetrics {
  stepName: PipelineStep;
  startTime: number;
  endTime?: number;
  duration?: number;
  success: boolean;
  metadata?: Record<string, unknown>;
}

export interface DetailedTimings {
  contextGeneration: number;
  aiModelSelection: number;
  sqlGeneration: number;
  sqlExecution: number;
  responseFormatting: number;
  total: number;
  cacheOperations: number;
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
// TECHNICAL METRICS SERVICE
// ========================================

export class TechnicalMetricsService {
  private storage: IStorage;
  private activeTraces: Map<string, PipelineStepMetrics[]> = new Map();
  private realtimeMetrics: Map<string, PercentileStats> = new Map();
  private lastAlertTime: Map<string, Date> = new Map();
  
  // Parallelism tracking
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
    
    // Periodic cleanup
    setInterval(() => {
      this.cleanupExpiredTraces();
    }, 5 * 60 * 1000); // Every 5 minutes
    
    // Refresh real-time metrics
    setInterval(() => {
      this.refreshRealtimeMetrics();
    }, 30 * 1000); // Every 30 seconds

    logger.info('TechnicalMetricsService initialized', {
      service: 'TechnicalMetricsService',
      metadata: { operation: 'constructor' }
    });
  }

  // ========================================
  // PIPELINE TRACING
  // ========================================

  /**
   * Start pipeline trace
   */
  startPipelineTrace(traceId: string, userId: string, userRole: string, query: string, complexity: QueryComplexity): void {
    this.activeTraces.set(traceId, []);
    logger.info('Pipeline trace started', {
      metadata: {
        service: 'TechnicalMetricsService',
        operation: 'startPipelineTrace',
        traceId,
        complexity
      }
    });
  }

  /**
   * Start pipeline step
   */
  startStep(traceId: string, stepName: PipelineStep, metadata?: Record<st, unknown>unknown>): void {
    const traces = this.activeTraces.get(traceId);
    if (!traces) {
      logger.warn('Attempt to start step on non-existent trace', {
        metadata: {
          service: 'TechnicalMetricsService',
          operation: 'startStep',
          stepName,
          traceId
        }
      });
      return;
    }

    const stepMetrics: PipelineStepMetrics = {
      stepName,
      startTime: Date.now(),
      success: true,
      metadata
    };

    traces.push(stepMetrics);
  }

  /**
   * End pipeline step
   */
  endStep(traceId: string, stepName: PipelineStep, success: boolean = true, metadata?: Recor, unknown>unknown>unknown>): void {
    const traces = this.activeTraces.get(traceId);
    if (!traces) {
      logger.warn('Attempt to end step on non-existent trace', {
        metadata: {
          service: 'TechnicalMetricsService',
          operation: 'endStep',
          stepName,
          traceId
        }
      });
      return;
    }

    const step = traces.reverse().find(s => s.stepName === stepName && !s.endTime);
    traces.reverse();

    if (!step) {
      logger.warn('Step not found for trace', {
        metadata: {
          service: 'TechnicalMetricsService',
          operation: 'endStep',
          stepName,
          traceId
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
  }

  /**
   * End pipeline trace and persist metrics
   */
  async endPipelineTrace(
    traceId: string, 
    userId: string, 
    userRole: string, 
    query: string, 
    complexity: QueryComplexity, 
    totalSuccess: boolean,
    cacheHit: boolean = false,
    additionalMetadata?: R, unknown>unknown>unknown any>
  ): Promise<DetailedTimings> {
    const traces = this.activeTraces.get(traceId);
    if (!traces) {
      logger.warn('Attempt to end non-existent pipeline trace', {
        metadata: {
          service: 'TechnicalMetricsService',
          operation: 'endPipelineTrace',
          traceId
        }
      });
      return this.createEmptyTimings();
    }

    const timings = this.calculateDetailedTimings(traces);
    
    return withErrorHandling(
    async () => {

      await this.persistPipelineMetrics({
        traceId,
        userId,
        userRole,
        query: query.substring(0, 2000),
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

      await this.checkSLOViolation(complexity, timings.total, traceId, userId);

      this.activeTraces.delete(traceId);

      logger.info('Pipeline trace completed', {
        metadata: {
          service: 'TechnicalMetricsService',
          operation: 'endPipelineTrace',
          traceId,
          totalDuration: timings.total
        }
      });

    
    },
    {
      operation: 'statistics',
      service: 'TechnicalMetricsService',
      metadata: {}
    }
  );
      });
    }

    return timings;
  }

  // ========================================
  // CIRCUIT BREAKER & PARALLELISM
  // ========================================

  /**
   * Check circuit breaker status
   */
  checkCircuitBreaker(): { allowed: boolean; reason?: string } {
    const now = new Date();
    const failureThreshold = 3;
    const timeoutMinutes = 5;

    if (this.circuitBreakerFailureCount >= failureThreshold && 
        this.circuitBreakerLastFailureTime &&
        (now.getTime() - this.circuitBreakerLastFailureTime.getTime()) < (timeoutMinutes * 60 * 1000)) {
      
      return { 
        allowed: false, 
        reason: `Circuit breaker open: ${this.circuitBreakerFailureCount} consecutive failures` 
      };
    }

    if (this.circuitBreakerLastFailureTime &&
        (now.getTime() - this.circuitBreakerLastFailureTime.getTime()) >= (timeoutMinutes * 60 * 1000)) {
      this.circuitBreakerFailureCount = 0;
      this.circuitBreakerLastFailureTime = null;
    }

    return { allowed: true };
  }

  /**
   * Record parallelism failure
   */
  recordParallelismFailure(): void {
    this.circuitBreakerFailureCount++;
    this.circuitBreakerLastFailureTime = new Date();
    this.parallelismStats.circuitBreakerTriggered++;
    
    logger.warn('Parallelism failure recorded', {
      metadata: {
        service: 'TechnicalMetricsService',
        operation: 'recordParallelismFailure',
        consecutiveFailures: this.circuitBreakerFailureCount
      }
    });
  }

  /**
   * Record parallelism success
   */
  recordParallelismSuccess(parallelTime: number): void {
    this.circuitBreakerFailureCount = 0;
    this.circuitBreakerLastFailureTime = null;
    this.parallelismStats.parallelExecutionCount++;
    
    const currentAvg = this.parallelismStats.averageParallelTime;
    const count = this.parallelismStats.parallelExecutionCount;
    this.parallelismStats.averageParallelTime = ((currentAvg * (count - 1)) + parallelTime) / count;
    
    const totalAttempts = this.parallelismStats.parallelExecutionCount + this.parallelismStats.sequentialFallbackCount;
    this.parallelismStats.parallelSuccessRate = this.parallelismStats.parallelExecutionCount / totalAttempts;
  }

  /**
   * Record sequential fallback
   */
  recordSequentialFallback(sequentialTime: number): void {
    this.parallelismStats.sequentialFallbackCount++;
    
    const currentAvg = this.parallelismStats.averageSequentialTime;
    const count = this.parallelismStats.sequentialFallbackCount;
    this.parallelismStats.averageSequentialTime = ((currentAvg * (count - 1)) + sequentialTime) / count;
    
    if (this.parallelismStats.averageParallelTime > 0 && this.parallelismStats.averageSequentialTime > 0) {
      const savings = ((this.parallelismStats.averageSequentialTime - this.parallelismStats.averageParallelTime) / this.parallelismStats.averageSequentialTime) * 100;
      this.parallelismStats.timeSavingsPercent = Math.max(0, savings);
    }
  }

  /**
   * Get parallelism metrics
   */
  getParallelismMetrics(): ParallelismMetrics {
    return { ...this.parallelismStats };
  }

  // ========================================
  // PERCENTILE & CACHE ANALYTICS
  // ========================================

  /**
   * Calculate percentile statistics
   */
  async calculatePercentileStats(
    stepName: PipelineStep | 'total', 
    complexity?: QueryComplexity, 
    windowHours: number = 24
  ): Promise<PercentileStats> {
    return withErrorHandling(
    async () => {

      const since = new Date(Date.now() - windowHours * 60 * 60 * 1000);
      
      const columnName = stepName === 'total' ? 'total_duration_ms' : `${stepName}_ms`;
      
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

    
    },
    {
      operation: 'statistics',
      service: 'TechnicalMetricsService',
      metadata: {}
    }
  );
      });
      return this.createEmptyPercentileStats();
    }
  }

  /**
   * Analyze cache performance
   */
  async analyzeCachePerformance(windowHours: number = 24): Promise<CacheAnalytics> {
    return withErrorHandling(
    async () => {

      const since = new Date(Date.now() - windowHours * 60 * 60 * 1000);

      const hitRates = await db
        .select({
          complexity: pipelineMetrics.complexity,
          totalQueries: sql<number>`COUNT(*)`,
          cacheHits: sql<number>`COUNT(CASE WHEN cache_hit THEN 1 END)`
        })
        .from(pipelineMetrics)
        .where(gte(pipelineMetrics.timestamp, since))
        .groupBy(pipelineMetrics.complexity);

      const retrievalTimes = await db
        .select({
          cacheHit: pipelineMetrics.cacheHit,
          avgCacheOps: sql<number>`AVG(cache_operations_ms)`
        })
        .from(pipelineMetrics)
        .where(gte(pipelineMetrics.timestamp, since))
        .groupBy(pipelineMetrics.cacheHit);

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

      for (const rate of hitRates) {
        const hitRate = rate.totalQueries > 0 ? (rate.cacheHits / rate.totalQueries) : 0;
        analytics.hitRateByComplexity[rate.complexity] = Math.round(hitRate * 100) / 100;
      }

      for (const time of retrievalTimes) {
        if (time.cacheHit) {
          analytics.avgRetrievalTime.hit = Math.round(time.avgCacheOps || 0);
        } else {
          analytics.avgRetrievalTime.miss = Math.round(time.avgCacheOps || 0);
        }
      }

      const totalHits = hitRates.reduce((sum, rate) => sum + rate.cacheHits, 0);
      analytics.memoryVsDbHits.totalHits = totalHits;
      analytics.memoryVsDbHits.memoryHits = Math.round(totalHits * 0.7);
      analytics.memoryVsDbHits.dbHits = totalHits - analytics.memoryVsDbHits.memoryHits;

      return analytics;

    
    },
    {
      operation: 'statistics',
      service: 'TechnicalMetricsService',
      metadata: {}
    }
  );
      });
      return this.createEmptyCacheAnalytics();
    }
  }

  // ========================================
  // PRIVATE HELPER METHODS
  // ========================================

  private calculateDetailedTimings(traces: PipelineStepMetrics[]): DetailedTimings {
    const timings: DetailedTimings = {
      contextGeneration: 0,
      aiModelSelection: 0,
      sqlGeneration: 0,
      sqlExecution: 0,
      responseFormatting: 0,
      total: 0,
      cacheOperations: 0,
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

  private async persistPipelineMetrics(metrics: InsertPipelineMetrics): Promise<void> {
    return withErrorHandling(
    async () => {

      await db.insert(pipelineMetrics).values(metrics);
    
    },
    {
      operation: 'statistics',
      service: 'TechnicalMetricsService',
      metadata: {}
    }
  );
      });
    }
  }

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
          title: `SLO violated for ${complexity} query`,
          description: `Duration ${actualDuration}ms exceeds threshold ${threshold}ms`,
          threshold,
          actualValue: actualDuration,
          traceId,
          userId,
          metadata: JSON.stringify({ complexity, threshold })
        });

        this.lastAlertTime.set(alertKey, new Date());
      }
    }
  }

  private async createPerformanceAlert(alert: unknown): Promise<void> {
    return withErrorHandling(
    async () => {

      await db.insert(performanceAlerts).values(alert);
      logger.warn('Performance alert created', {
        metadata: {
          service: 'TechnicalMetricsService',
          operation: 'createPerformanceAlert',
          alertType: alert.alertType,
          severity: alert.severity
        }
      });
    
    },
    {
      operation: 'statistics',
      service: 'TechnicalMetricsService',
      metadata: {}
    }
  );
      });
    }
  }

  private percentile(sortedArray: number[], percentile: number): number {
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
    return sortedArray[Math.max(0, index)] || 0;
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
      contextAndModelParallel: 0,
      parallelExecutionTime: 0,
      sequentialFallbackTime: 0,
      circuitBreakerCheckTime: 0
    };
  }

  private createEmptyPercentileStats(): PercentileStats {
    return {
      p50: 0,
      p95: 0,
      p99: 0,
      mean: 0,
      min: 0,
      max: 0,
      count: 0
    };
  }

  private createEmptyCacheAnalytics(): CacheAnalytics {
    return {
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
  }

  private cleanupExpiredTraces(): void {
    const now = Date.now();
    const MAX_TRACE_AGE_MS = 60 * 60 * 1000; // 1 hour

    for (const [traceId, traces] of this.activeTraces.entries()) {
      if (traces.length > 0) {
        const oldestTrace = Math.min(...traces.map(t => t.startTime));
        if (now - oldestTrace > MAX_TRACE_AGE_MS) {
          this.activeTraces.delete(traceId);
        }
      }
    }
  }

  private refreshRealtimeMetrics(): void {
    // Placeholder for real-time metrics refresh logic
    logger.debug('Real-time metrics refreshed', {
      service: 'TechnicalMetricsService',
      metadata: { operation: 'refreshRealtimeMetrics' }
    });
  }
}

// ========================================
// SINGLETON EXPORT
// ========================================

let technicalMetricsServiceInstance: TechnicalMetricsService | null = null;

export function getTechnicalMetricsService(storage: IStorage): TechnicalMetricsService {
  if (!technicalMetricsServiceInstance) {
    technicalMetricsServiceInstance = new TechnicalMetricsService(storage);
  }
  return technicalMetricsServiceInstance;
}
