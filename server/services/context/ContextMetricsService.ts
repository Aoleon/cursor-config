/**
 * Context Metrics Service
 * 
 * Extracted from ContextBuilderService to handle metrics tracking.
 * Responsible for tracking query metrics and performance.
 * 
 * Target LOC: ~100-150
 */

export interface QueryMetrics {
  tablesQueried: string[];
  totalQueries: number;
}

export interface PerformanceMetrics {
  executionTimeMs: number;
  tablesQueried: string[];
  cacheHitRate: number;
  dataFreshness: number;
}

export class ContextMetricsService {
  private metrics: QueryMetrics = { tablesQueried: [], totalQueries: 0 };

  /**
   * Tracks a database query
   */
  trackQuery(table: string): void {
    this.metrics.totalQueries += 1;
    if (!this.metrics.tablesQueried.includes(table)) {
      this.metrics.tablesQueried.push(table);
    }
  }

  /**
   * Resets metrics
   */
  resetMetrics(): void {
    this.metrics = { tablesQueried: [], totalQueries: 0 };
  }

  /**
   * Gets current metrics
   */
  getMetrics(): QueryMetrics {
    return { ...this.metrics };
  }

  /**
   * Builds performance metrics for context generation result
   */
  buildPerformance(duration: number): PerformanceMetrics {
    return {
      executionTimeMs: duration,
      tablesQueried: [...this.metrics.tablesQueried],
      cacheHitRate: 0,
      dataFreshness: 1,
    };
  }
}

