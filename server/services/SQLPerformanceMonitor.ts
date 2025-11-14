/**
 * SQL Performance Monitor Service
 * 
 * Monitors SQL query performance and generates alerts for slow queries.
 * Detects queries exceeding performance thresholds and logs them for analysis.
 * 
 * Target: Detect queries > 20s and generate alerts
 */

import { logger } from '../utils/logger';
import { eventBus } from '../eventBus';
import type { EventBus } from '../eventBus';

export interface SlowQueryAlert {
  query: string;
  duration: number;
  threshold: number;
  timestamp: Date;
  context?: {
    service?: string;
    operation?: string;
    userId?: string;
    entityType?: string;
    entityId?: string;
  };
  recommendations?: string[];
}

export interface QueryPerformanceMetrics {
  query: string;
  duration: number;
  tablesQueried: string[];
  executionPlan?: {
    hasSeqScan: boolean;
    hasNestedLoop: boolean;
    hasIndexScan: boolean;
    estimatedRows: number;
  };
}

export class SQLPerformanceMonitor {
  private readonly SLOW_QUERY_THRESHOLD_MS = 20000; // 20 seconds
  private readonly CRITICAL_QUERY_THRESHOLD_MS = 30000; // 30 seconds
  private slowQueries: SlowQueryAlert[] = [];
  private readonly MAX_ALERTS_HISTORY = 100;

  constructor(private eventBus?: EventBus) {
    logger.info('SQL Performance Monitor initialized', {
      metadata: {
        service: 'SQLPerformanceMonitor',
        operation: 'constructor',
        slowQueryThreshold: this.SLOW_QUERY_THRESHOLD_MS,
        criticalThreshold: this.CRITICAL_QUERY_THRESHOLD_MS
      }
    });
  }

  /**
   * Records a query execution and checks if it exceeds performance thresholds
   */
  recordQuery(metrics: QueryPerformanceMetrics, context?: SlowQueryAlert['context']): void {
    if (metrics.duration < this.SLOW_QUERY_THRESHOLD_MS) {
      return; // Query is within acceptable performance
    }

    const alert: SlowQueryAlert = {
      query: metrics.query,
      duration: metrics.duration,
      threshold: metrics.duration >= this.CRITICAL_QUERY_THRESHOLD_MS 
        ? this.CRITICAL_QUERY_THRESHOLD_MS 
        : this.SLOW_QUERY_THRESHOLD_MS,
      timestamp: new Date(),
      context,
      recommendations: this.generateRecommendations(metrics)
    };

    // Add to history
    this.slowQueries.push(alert);
    if (this.slowQueries.length > this.MAX_ALERTS_HISTORY) {
      this.slowQueries.shift(); // Remove oldest
    }

    // Log alert
    const severity = metrics.duration >= this.CRITICAL_QUERY_THRESHOLD_MS ? 'error' : 'warn';
    logger[severity]('Slow SQL query detected', {
      metadata: {
        service: 'SQLPerformanceMonitor',
        operation: 'recordQuery',
        duration: metrics.duration,
        threshold: alert.threshold,
        query: this.sanitizeQuery(metrics.query),
        context,
        recommendations: alert.recommendations
      }
    });

    // Emit event for monitoring/alerting systems
    if (this.eventBus) {
      this.eventBus.emit('sql.performance.alert', {
        type: 'sql.performance.alert',
        severity: metrics.duration >= this.CRITICAL_QUERY_THRESHOLD_MS ? 'critical' : 'warning',
        message: `Slow SQL query detected: ${metrics.duration}ms (threshold: ${alert.threshold}ms)`,
        metadata: {
          duration: metrics.duration,
          query: this.sanitizeQuery(metrics.query),
          context,
          recommendations: alert.recommendations,
          executionPlan: metrics.executionPlan
        }
      });
    }
  }

  /**
   * Gets recent slow query alerts
   */
  getRecentAlerts(limit: number = 10): SlowQueryAlert[] {
    return this.slowQueries.slice(-limit).reverse();
  }

  /**
   * Gets slow query statistics
   */
  getStatistics(): {
    totalSlowQueries: number;
    criticalQueries: number;
    averageDuration: number;
    maxDuration: number;
  } {
    if (this.slowQueries.length === 0) {
      return {
        totalSlowQueries: 0,
        criticalQueries: 0,
        averageDuration: 0,
        maxDuration: 0
      };
    }

    const criticalQueries = this.slowQueries.filter(
      q => q.duration >= this.CRITICAL_QUERY_THRESHOLD_MS
    ).length;

    const totalDuration = this.slowQueries.reduce((sum, q) => sum + q.duration, 0);
    const maxDuration = Math.max(...this.slowQueries.map(q => q.duration));

    return {
      totalSlowQueries: this.slowQueries.length,
      criticalQueries,
      averageDuration: totalDuration / this.slowQueries.length,
      maxDuration
    };
  }

  /**
   * Generates optimization recommendations based on query metrics
   */
  private generateRecommendations(metrics: QueryPerformanceMetrics): string[] {
    const recommendations: string[] = [];

    if (metrics.executionPlan) {
      if (metrics.executionPlan.hasSeqScan) {
        recommendations.push('Consider adding indexes on filtered columns to avoid sequential scans');
      }
      if (metrics.executionPlan.hasNestedLoop && metrics.executionPlan.estimatedRows > 1000) {
        recommendations.push('Consider optimizing joins or using hash joins for large result sets');
      }
      if (!metrics.executionPlan.hasIndexScan && metrics.executionPlan.estimatedRows > 100) {
        recommendations.push('Consider adding indexes to improve query performance');
      }
    }

    if (metrics.duration >= this.CRITICAL_QUERY_THRESHOLD_MS) {
      recommendations.push('Query exceeds critical threshold - immediate optimization required');
    }

    if (metrics.tablesQueried.length > 5) {
      recommendations.push('Query involves many tables - consider denormalization or materialized views');
    }

    if (recommendations.length === 0) {
      recommendations.push('Review query execution plan and consider query optimization');
    }

    return recommendations;
  }

  /**
   * Sanitizes query for logging (removes sensitive data)
   */
  private sanitizeQuery(query: string): string {
    // Remove potential sensitive data from query string
    return query
      .replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '[CARD_NUMBER]') // Credit card numbers
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]') // Email addresses
      .substring(0, 500); // Limit length
  }
}

// Singleton instance
let globalSQLPerformanceMonitor: SQLPerformanceMonitor | null = null;

export function getSQLPerformanceMonitor(eventBus?: EventBus): SQLPerformanceMonitor {
  if (!globalSQLPerformanceMonitor) {
    globalSQLPerformanceMonitor = new SQLPerformanceMonitor(eventBus);
    logger.info('SQL Performance Monitor singleton created', {
      metadata: {
        service: 'SQLPerformanceMonitor',
        operation: 'getSQLPerformanceMonitor'
      }
    });
  }
  return globalSQLPerformanceMonitor;
}

export function resetSQLPerformanceMonitor(): void {
  globalSQLPerformanceMonitor = null;
}

