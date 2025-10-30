/**
 * BACKWARD COMPATIBILITY ADAPTER - AnalyticsService
 * 
 * Re-exports BusinessAnalyticsService as AnalyticsService for backward compatibility
 * Allows gradual migration of 12+ dependent files without breaking changes
 * 
 * DEPRECATION NOTICE: This adapter is temporary
 * - All new code should import from BusinessAnalyticsService directly
 * - Existing imports will continue to work during migration period
 * - Adapter will be removed in Phase 4 after all files migrated
 */

import { logger } from '../../../utils/logger';
import { 
  BusinessAnalyticsService,
  getBusinessAnalyticsService,
  type BusinessFilters,
  type ConversionMetric,
  type PipelineMetric,
  type DelayMetric,
  type DelayedProjectMetric,
  type TeamDelayMetric,
  type RevenueForecast,
  type CategoryRevenueMetric,
  type MarginAnalysisMetric,
  type TeamLoadMetric,
  type TeamEfficiencyMetric,
  type PlanningOptimizationSuggestion,
  type RealtimeKPIs,
  type BenchmarkEntity
} from '../BusinessAnalyticsService';
import { IStorage, DateRange } from '../../../storage-poc';
import { EventBus } from '../../../eventBus';
import type { 
  KpiSnapshot,
  PerformanceBenchmark
} from "@shared/schema";

// ========================================
// TYPE RE-EXPORTS (for backward compatibility)
// ========================================

export type {
  BusinessFilters,
  ConversionMetric,
  PipelineMetric,
  DelayMetric,
  DelayedProjectMetric,
  TeamDelayMetric,
  RevenueForecast,
  CategoryRevenueMetric,
  MarginAnalysisMetric,
  TeamLoadMetric,
  TeamEfficiencyMetric,
  PlanningOptimizationSuggestion,
  RealtimeKPIs,
  BenchmarkEntity
};

// ========================================
// ANALYTICS SERVICE ADAPTER
// ========================================

/**
 * @deprecated Use BusinessAnalyticsService from server/services/consolidated/BusinessAnalyticsService instead
 */
export class AnalyticsService {
  private businessAnalytics: BusinessAnalyticsService;

  constructor(storage: IStorage, eventBus: EventBus) {
    logger.warn('DEPRECATION: AnalyticsService is deprecated. Use BusinessAnalyticsService instead.', {
      service: 'AnalyticsService',
      metadata: {
        operation: 'constructor',
        migration: 'Import from server/services/consolidated/BusinessAnalyticsService'
      }
    });

    this.businessAnalytics = getBusinessAnalyticsService(storage, eventBus);
  }

  async generateKPISnapshot(period: DateRange): Promise<KpiSnapshot> {
    return this.businessAnalytics.generateKPISnapshot(period);
  }

  async getRealtimeKPIs(filters?: BusinessFilters): Promise<RealtimeKPIs> {
    return this.businessAnalytics.getRealtimeKPIs(filters);
  }

  async generateBenchmarks(entity: BenchmarkEntity, period: DateRange): Promise<PerformanceBenchmark> {
    return this.businessAnalytics.generateBenchmarks(entity, period);
  }

  clearCache(): void {
    this.businessAnalytics.clearCache();
  }

  // Legacy method compatibility - now delegating to real implementations
  async getBusinessMetrics(params: any): Promise<any> {
    return this.businessAnalytics.getBusinessMetrics(params);
  }

  async getDashboardStats(): Promise<any> {
    return this.businessAnalytics.getDashboardStats();
  }

  async getDashboardKPIs(): Promise<any> {
    return this.getRealtimeKPIs();
  }

  async getPipelineAnalytics(filters?: any): Promise<any> {
    return this.businessAnalytics.getPipelineAnalytics(filters);
  }

  async getBenchmarks(params: any): Promise<any> {
    return this.businessAnalytics.getBenchmarks(params);
  }
}

/**
 * @deprecated Use getBusinessAnalyticsService() instead
 */
export function createAnalyticsService(storage: IStorage, eventBus: EventBus): AnalyticsService {
  logger.warn('DEPRECATION: createAnalyticsService() is deprecated. Use getBusinessAnalyticsService() instead.', {
    service: 'AnalyticsService',
    metadata: {
      operation: 'createAnalyticsService',
      migration: 'Use getBusinessAnalyticsService() from BusinessAnalyticsService'
    }
  });
  return new AnalyticsService(storage, eventBus);
}
