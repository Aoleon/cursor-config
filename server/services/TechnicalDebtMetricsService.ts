/**
 * Technical Debt Metrics Service
 * 
 * Tracks and reports technical debt metrics for monitoring and alerting.
 * Provides insights into code quality, architecture health, and technical debt trends.
 */

import { logger } from '../utils/logger';
import type { EventBus } from '../eventBus';

export interface TechnicalDebtMetric {
  category: 'monolithic' | 'duplication' | 'complexity' | 'test_coverage' | 'performance' | 'documentation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  score: number; // 0-100, higher is better
  trend: 'improving' | 'stable' | 'degrading';
  details: {
    count?: number;
    target?: number;
    percentage?: number;
    files?: string[];
  };
  lastUpdated: Date;
}

export interface TechnicalDebtReport {
  overallScore: number; // 0-100
  metrics: TechnicalDebtMetric[];
  trends: {
    period: '7d' | '30d' | '90d';
    change: number; // Percentage change
  };
  recommendations: string[];
  lastCalculated: Date;
}

export class TechnicalDebtMetricsService {
  private metrics: Map<string, TechnicalDebtMetric> = new Map();
  private eventBus?: EventBus;
  private readonly ALERT_THRESHOLD = 60; // Alert if overall score < 60

  constructor(eventBus?: EventBus) {
    this.eventBus = eventBus;
    this.initializeMetrics();
    
    logger.info('Technical Debt Metrics Service initialized', {
      metadata: {
        service: 'TechnicalDebtMetricsService',
        operation: 'constructor'
      }
    });
  }

  /**
   * Initializes default metrics
   */
  private initializeMetrics(): void {
    // Monolithic files metric
    this.metrics.set('monolithic', {
      category: 'monolithic',
      severity: 'low',
      score: 85,
      trend: 'improving',
      details: {
        count: 2,
        target: 0,
        files: ['storage-poc.ts']
      },
      lastUpdated: new Date()
    });

    // Code duplication metric
    this.metrics.set('duplication', {
      category: 'duplication',
      severity: 'medium',
      score: 75,
      trend: 'stable',
      details: {
        percentage: 15
      },
      lastUpdated: new Date()
    });

    // Test coverage metric
    this.metrics.set('test_coverage', {
      category: 'test_coverage',
      severity: 'medium',
      score: 80,
      trend: 'improving',
      details: {
        percentage: 82,
        target: 85
      },
      lastUpdated: new Date()
    });

    // Performance metric
    this.metrics.set('performance', {
      category: 'performance',
      severity: 'low',
      score: 88,
      trend: 'improving',
      details: {
        count: 0 // Slow queries > 20s
      },
      lastUpdated: new Date()
    });
  }

  /**
   * Updates a metric
   */
  updateMetric(category: string, metric: Partial<TechnicalDebtMetric>): void {
    const existing = this.metrics.get(category);
    if (!existing) {
      logger.warn('Metric category not found', {
        metadata: {
          service: 'TechnicalDebtMetricsService',
          operation: 'updateMetric',
          category
        }
      });
      return;
    }

    const updated: TechnicalDebtMetric = {
      ...existing,
      ...metric,
      lastUpdated: new Date()
    };

    this.metrics.set(category, updated);

    logger.info('Technical debt metric updated', {
      metadata: {
        service: 'TechnicalDebtMetricsService',
        operation: 'updateMetric',
        category,
        score: updated.score,
        severity: updated.severity
      }
    });
  }

  /**
   * Generates a comprehensive technical debt report
   */
  generateReport(): TechnicalDebtReport {
    const metrics = Array.from(this.metrics.values());
    const overallScore = this.calculateOverallScore(metrics);
    const recommendations = this.generateRecommendations(metrics);

    const report: TechnicalDebtReport = {
      overallScore,
      metrics,
      trends: {
        period: '30d',
        change: 5 // Placeholder - would be calculated from historical data
      },
      recommendations,
      lastCalculated: new Date()
    };

    // Emit alert if score is below threshold
    if (overallScore < this.ALERT_THRESHOLD && this.eventBus) {
      this.eventBus.emit('technical_debt.alert', {
        type: 'technical_debt.alert',
        severity: 'warning',
        message: `Technical debt score is below threshold: ${overallScore}/100`,
        metadata: {
          overallScore,
          threshold: this.ALERT_THRESHOLD,
          report
        }
      });
    }

    return report;
  }

  /**
   * Calculates overall technical debt score
   */
  private calculateOverallScore(metrics: TechnicalDebtMetric[]): number {
    if (metrics.length === 0) return 100;

    // Weighted average based on severity
    const weights: Record<string, number> = {
      critical: 0.3,
      high: 0.25,
      medium: 0.2,
      low: 0.15
    };

    let totalWeight = 0;
    let weightedSum = 0;

    for (const metric of metrics) {
      const weight = weights[metric.severity] || 0.1;
      weightedSum += metric.score * weight;
      totalWeight += weight;
    }

    return Math.round(weightedSum / totalWeight);
  }

  /**
   * Generates recommendations based on metrics
   */
  private generateRecommendations(metrics: TechnicalDebtMetric[]): string[] {
    const recommendations: string[] = [];

    for (const metric of metrics) {
      if (metric.score < 70) {
        switch (metric.category) {
          case 'monolithic':
            recommendations.push(`Refactor monolithic files: ${metric.details.files?.join(', ')}`);
            break;
          case 'duplication':
            recommendations.push(`Reduce code duplication (currently ${metric.details.percentage}%)`);
            break;
          case 'test_coverage':
            recommendations.push(`Increase test coverage to ${metric.details.target}% (currently ${metric.details.percentage}%)`);
            break;
          case 'performance':
            recommendations.push(`Optimize slow queries (${metric.details.count} queries > 20s)`);
            break;
          case 'documentation':
            recommendations.push('Improve API and module documentation');
            break;
        }
      }
    }

    return recommendations;
  }

  /**
   * Gets current metrics
   */
  getMetrics(): Map<string, TechnicalDebtMetric> {
    return new Map(this.metrics);
  }

  /**
   * Gets metric by category
   */
  getMetric(category: string): TechnicalDebtMetric | undefined {
    return this.metrics.get(category);
  }
}

// Singleton instance
let globalTechnicalDebtMetricsService: TechnicalDebtMetricsService | null = null;

export function getTechnicalDebtMetricsService(eventBus?: EventBus): TechnicalDebtMetricsService {
  if (!globalTechnicalDebtMetricsService) {
    globalTechnicalDebtMetricsService = new TechnicalDebtMetricsService(eventBus);
    logger.info('Technical Debt Metrics Service singleton created', {
      metadata: {
        service: 'TechnicalDebtMetricsService',
        operation: 'getTechnicalDebtMetricsService'
      }
    });
  }
  return globalTechnicalDebtMetricsService;
}

export function resetTechnicalDebtMetricsService(): void {
  globalTechnicalDebtMetricsService = null;
}

