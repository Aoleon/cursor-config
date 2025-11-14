/**
 * Analytics Module Type Definitions
 * 
 * This module contains all type definitions related to analytics,
 * KPIs, dashboards, reporting, and predictive analytics.
 */

import type { z } from 'zod';
import type {
  analyticsFiltersSchema,
  snapshotRequestSchema,
  metricQuerySchema,
  benchmarkQuerySchema,
  insertAlertThresholdSchema,
  updateAlertThresholdSchema,
  alertsQuerySchema,
  type AlertThreshold,
  type BusinessAlert,
  type AlertsQuery
} from '@shared/schema';

// Request types
export type AnalyticsFiltersRequest = z.infer<typeof analyticsFiltersSchema>;
export type SnapshotRequest = z.infer<typeof snapshotRequestSchema>;
export type MetricQueryRequest = z.infer<typeof metricQuerySchema>;
export type BenchmarkQueryRequest = z.infer<typeof benchmarkQuerySchema>;

export type CreateAlertThresholdRequest = z.infer<typeof insertAlertThresholdSchema>;
export type UpdateAlertThresholdRequest = z.infer<typeof updateAlertThresholdSchema>;
export type AlertsQueryRequest = z.infer<typeof alertsQuerySchema>;

// KPI types
export interface KPI {
  id: string;
  name: string;
  value: number;
  previousValue?: number;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
  changePercentage?: number;
  target?: number;
  category: string;
  period?: string;
}

export interface KPIDashboard {
  kpis: KPI[];
  lastUpdated: Date;
  period: {
    start: Date;
    end: Date;
  };
  filters?: AnalyticsFiltersRequest;
}

// Metrics types
export interface Metric {
  id: string;
  name: string;
  type: 'gauge' | 'counter' | 'histogram' | 'summary';
  value: number;
  timestamp: Date;
  dimensions?: Record<string, unknown>;
  tags?: string[];
}

export interface MetricSeries {
  metric: string;
  datapoints: Array<{
    timestamp: Date;
    value: number;
  }>;
  aggregation?: 'sum' | 'avg' | 'min' | 'max' | 'count';
}

export interface BusinessMetrics {
  revenue: {
    total: number;
    byMonth: Record<string, number>;
    byClient: Record<string, number>;
    growth: number;
  };
  conversion: {
    rate: number;
    aoToOffer: number;
    offerToProject: number;
    funnel: Array<{
      stage: string;
      count: number;
      percentage: number;
    }>;
  };
  performance: {
    averageProjectDuration: number;
    onTimeDelivery: number;
    clientSatisfaction: number;
    teamUtilization: number;
  };
  pipeline: {
    aoCount: number;
    offerCount: number;
    projectCount: number;
    totalValue: number;
    expectedRevenue: number;
  };
}

// Dashboard types
export interface DashboardStats {
  totalAos: number;
  totalOffers: number;
  totalProjects: number;
  activeProjects: number;
  totalRevenue: number;
  conversionRate: number;
  averageProjectValue: number;
  teamUtilization: number;
}

export interface DashboardWidget {
  id: string;
  type: 'chart' | 'stat' | 'table' | 'map' | 'timeline';
  title: string;
  data: unknown;
  config?: {
    chartType?: 'line' | 'bar' | 'pie' | 'donut' | 'area' | 'scatter';
    colors?: string[];
    showLegend?: boolean;
    showGrid?: boolean;
  };
  position?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface Dashboard {
  id: string;
  name: string;
  description?: string;
  widgets: DashboardWidget[];
  layout?: 'grid' | 'freeform';
  refreshInterval?: number; // in seconds
  filters?: AnalyticsFiltersRequest;
}

// Pipeline analytics
export interface PipelineAnalytics {
  aoCount: number;
  offerCount: number;
  projectCount: number;
  stages: Array<{
    name: string;
    count: number;
    value: number;
    averageTime: number;
    conversion: number;
  }>;
  bottlenecks: Array<{
    stage: string;
    severity: 'low' | 'medium' | 'high';
    impact: number;
    recommendation: string;
  }>;
}

// Predictive analytics types
export interface PredictiveRevenue {
  forecast: Array<{
    date: Date;
    predicted: number;
    lower: number;
    upper: number;
    confidence: number;
  }>;
  factors: Array<{
    name: string;
    impact: number;
    trend: 'positive' | 'negative' | 'neutral';
  }>;
  accuracy: number;
  modelVersion: string;
}

export interface PredictiveRisk {
  projectId: string;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  factors: Array<{
    factor: string;
    contribution: number;
    description: string;
  }>;
  recommendations: string[];
  predictedDelayDays?: number;
  predictedCostOverrun?: number;
}

export interface PredictiveRecommendation {
  id: string;
  type: 'action' | 'optimization' | 'warning';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  description: string;
  expectedImpact?: {
    metric: string;
    improvement: number;
    confidence: number;
  };
  actions?: Array<{
    label: string;
    action: string;
    par: unknown;
  }>;
}

// Snapshot types
export interface AnalyticsSnapshot {
  id: string;
  type: 'revenue' | 'risks' | 'recommendations' | 'full';
  createdAt: Date;
  createdBy: string;
  notes?: string;
  version?: string;
}

// Benchmark types
export interface Benchmark {
  metric: string;
  value: number;
  industry: number;
  percentile: number;
  trend: 'improving' | 'declining' | 'stable';
  recommendations?: string[];
}

// Export types
export interface ExportRequest {
  format: 'csv' | 'excel' | 'pdf' | 'json';
  type: 'kpis' | 'metrics' | 'dashboard' | 'report';
  filters?: AnalyticsFiltersRequest;
  includeCharts?: boolean;
  template?: string;
}

export interface ExportResult {
  filename: string;
  mimeType: string;
  size: number;
  data: Buffer;
  generatedAt: Date;
}

// Real-time analytics
export interface RealtimeMetric {
  metric: string;
  value: number;
  timestamp: Date;
  delta?: number;
  trend?: number[];
}

export interface RealtimeAlert {
  id: string;
  type: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  metric?: string;
  value?: number;
  threshold?: number;
  timestamp: Date;
}

// Bottleneck analysis
export interface Bottleneck {
  id: string;
  process: string;
  stage: string;
  severity: number; // 0-100
  impact: {
    delayDays: number;
    affectedProjects: number;
    costImpact: number;
  };
  causes: string[];
  recommendations: Array<{
    action: string;
    expectedImprovement: number;
    effort: 'low' | 'medium' | 'high';
  }>;
}

// Query parameter types
export interface AnalyticsQueryParams {
  dateFrom?: string;
  dateTo?: string;
  granularity?: 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';
  groupBy?: string[];
  filters?: Record<string, unknown>;
  metrics?: string[];
  limit?: number;
  offset?: number;
}

// Response types
export interface AnalyticsResponse<T = any> {
  data: T;
  metadata?: {
    period?: {
      start: Date;
      end: Date;
    };
    filters?: any;
    totalCount?: number;
    page?: number;
    pageSize?: number;
  };
  timestamp: Date;
}