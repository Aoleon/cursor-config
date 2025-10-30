/**
 * BACKWARD COMPATIBILITY ADAPTER - PerformanceMetricsService
 * 
 * Re-exports TechnicalMetricsService as PerformanceMetricsService for backward compatibility
 * Allows gradual migration of 6+ dependent files without breaking changes
 * 
 * DEPRECATION NOTICE: This adapter is temporary
 * - All new code should import from TechnicalMetricsService directly
 * - Existing imports will continue to work during migration period
 * - Adapter will be removed in Phase 4 after all files migrated
 */

import { logger } from '../../../utils/logger';
import { 
  TechnicalMetricsService,
  getTechnicalMetricsService,
  type PipelineStepMetrics,
  type DetailedTimings,
  type ParallelismMetrics,
  type PercentileStats,
  type CacheAnalytics
} from '../TechnicalMetricsService';
import { IStorage } from '../../../storage-poc';
import type {
  PipelineStep,
  QueryComplexity
} from "@shared/schema";

// ========================================
// TYPE RE-EXPORTS (for backward compatibility)
// ========================================

export type {
  PipelineStepMetrics,
  DetailedTimings,
  ParallelismMetrics,
  PercentileStats,
  CacheAnalytics,
  PipelineStep,
  QueryComplexity
};

// ========================================
// PERFORMANCE METRICS SERVICE ADAPTER
// ========================================

/**
 * @deprecated Use TechnicalMetricsService from server/services/consolidated/TechnicalMetricsService instead
 */
export class PerformanceMetricsService {
  private technicalMetrics: TechnicalMetricsService;

  constructor(storage: IStorage) {
    logger.warn('DEPRECATION: PerformanceMetricsService is deprecated. Use TechnicalMetricsService instead.', {
      service: 'PerformanceMetricsService',
      metadata: {
        operation: 'constructor',
        migration: 'Import from server/services/consolidated/TechnicalMetricsService'
      }
    });

    this.technicalMetrics = getTechnicalMetricsService(storage);
  }

  // ========================================
  // PIPELINE TRACING METHODS
  // ========================================

  startPipelineTrace(traceId: string, userId: string, userRole: string, query: string, complexity: QueryComplexity): void {
    this.technicalMetrics.startPipelineTrace(traceId, userId, userRole, query, complexity);
  }

  startStep(traceId: string, stepName: PipelineStep, metadata?: Record<string, any>): void {
    this.technicalMetrics.startStep(traceId, stepName, metadata);
  }

  endStep(traceId: string, stepName: PipelineStep, success: boolean = true, metadata?: Record<string, any>): void {
    this.technicalMetrics.endStep(traceId, stepName, success, metadata);
  }

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
    return this.technicalMetrics.endPipelineTrace(
      traceId, 
      userId, 
      userRole, 
      query, 
      complexity, 
      totalSuccess, 
      cacheHit, 
      additionalMetadata
    );
  }

  // ========================================
  // CIRCUIT BREAKER & PARALLELISM METHODS
  // ========================================

  checkCircuitBreaker(): { allowed: boolean; reason?: string } {
    return this.technicalMetrics.checkCircuitBreaker();
  }

  recordParallelismFailure(): void {
    this.technicalMetrics.recordParallelismFailure();
  }

  recordParallelismSuccess(parallelTime: number): void {
    this.technicalMetrics.recordParallelismSuccess(parallelTime);
  }

  recordSequentialFallback(sequentialTime: number): void {
    this.technicalMetrics.recordSequentialFallback(sequentialTime);
  }

  getParallelismMetrics(): ParallelismMetrics {
    return this.technicalMetrics.getParallelismMetrics();
  }

  // ========================================
  // ANALYTICS METHODS
  // ========================================

  async calculatePercentileStats(
    stepName: PipelineStep | 'total', 
    complexity?: QueryComplexity, 
    windowHours: number = 24
  ): Promise<PercentileStats> {
    return this.technicalMetrics.calculatePercentileStats(stepName, complexity, windowHours);
  }

  async analyzeCachePerformance(windowHours: number = 24): Promise<CacheAnalytics> {
    return this.technicalMetrics.analyzeCachePerformance(windowHours);
  }

  // ========================================
  // DISABLED METHODS (from original service)
  // ========================================

  /**
   * @deprecated This method was disabled in original PerformanceMetricsService due to missing table
   */
  async getPipelineMetrics(filters: any): Promise<any> {
    logger.warn('getPipelineMetrics() called but disabled (missing table)', {
      service: 'PerformanceMetricsService',
      metadata: { operation: 'getPipelineMetrics' }
    });
    return {
      step_statistics: {},
      total_traces: 0,
      time_range: 'disabled',
      complexity_filter: 'all',
      _disabled: true,
      _reason: 'Table performanceTraces missing'
    };
  }

  /**
   * @deprecated This method was disabled in original PerformanceMetricsService due to missing table
   */
  async getCacheAnalytics(filters: any): Promise<any> {
    logger.warn('getCacheAnalytics() called but disabled (missing table)', {
      service: 'PerformanceMetricsService',
      metadata: { operation: 'getCacheAnalytics' }
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
      _reason: 'Table performanceTraces missing'
    };
  }

  /**
   * @deprecated This method was disabled in original PerformanceMetricsService due to missing table
   */
  async getSLOCompliance(filters: any): Promise<any> {
    logger.warn('getSLOCompliance() called but disabled (missing table)', {
      service: 'PerformanceMetricsService',
      metadata: { operation: 'getSLOCompliance' }
    });
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
      _reason: 'Table performanceTraces missing'
    };
  }

  /**
   * @deprecated This method was disabled in original PerformanceMetricsService due to missing table
   */
  async identifyBottlenecks(filters: any): Promise<any> {
    logger.warn('identifyBottlenecks() called but disabled (missing table)', {
      service: 'PerformanceMetricsService',
      metadata: { operation: 'identifyBottlenecks' }
    });
    return {
      bottlenecks: [],
      threshold_used: filters.thresholdSeconds || 2000,
      total_steps_analyzed: 0,
      issues_found: 0,
      recommendations: [],
      _disabled: true,
      _reason: 'Table pipelinePerformanceMetrics missing'
    };
  }

  /**
   * @deprecated This method was disabled in original PerformanceMetricsService due to missing table
   */
  async getRealTimeStats(): Promise<any> {
    logger.warn('getRealTimeStats() called but disabled (missing table)', {
      service: 'PerformanceMetricsService',
      metadata: { operation: 'getRealTimeStats' }
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
      last_updated: new Date(),
      _disabled: true,
      _reason: 'Table performanceTraces missing'
    };
  }
}

/**
 * @deprecated Use getTechnicalMetricsService() instead
 */
export function createPerformanceMetricsService(storage: IStorage): PerformanceMetricsService {
  logger.warn('DEPRECATION: createPerformanceMetricsService() is deprecated. Use getTechnicalMetricsService() instead.', {
    service: 'PerformanceMetricsService',
    metadata: {
      operation: 'createPerformanceMetricsService',
      migration: 'Use getTechnicalMetricsService() from TechnicalMetricsService'
    }
  });
  return new PerformanceMetricsService(storage);
}
