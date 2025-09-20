import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

// Types pour les filtres analytics
export interface AnalyticsFilters {
  userId?: string;
  departement?: string;
  projectType?: string;
  materialType?: string;
  complexityLevel?: string;
  timeRange?: {
    startDate: Date;
    endDate: Date;
  };
}

// Types pour les métriques
export type MetricType = 'conversion' | 'revenue' | 'delay' | 'team_load' | 'margin' | 'pipeline';

// Types pour les requêtes de snapshot
export interface SnapshotRequest {
  type: 'full' | 'kpi_only' | 'performance_only';
  filters?: AnalyticsFilters;
  includeCharts?: boolean;
  format?: 'json' | 'pdf' | 'excel';
}

// Interface pour les KPIs consolidés
export interface ExecutiveKPIs {
  conversion_rate_offer_to_project: number;
  conversion_trend: number;
  total_revenue_forecast: number;
  revenue_trend: number;
  avg_delay_days: number;
  delay_trend: number;
  avg_team_load_percentage: number;
  load_trend: number;
  critical_alerts_count: number;
  performance_score: number;
  last_updated: string;
}

// Interface pour les métriques de pipeline
export interface PipelineMetrics {
  ao_count: number;
  ao_total_value: number;
  offer_count: number;
  offer_total_value: number;
  project_count: number;
  project_total_value: number;
  ao_to_offer_rate: number;
  offer_to_project_rate: number;
  global_conversion_rate: number;
  forecast_3_months: Array<{
    month: string;
    predicted_value: number;
    confidence: number;
  }>;
}

// Interface pour les métriques d'équipe
export interface TeamMetrics {
  userId: string;
  userName: string;
  load_percentage: number;
  efficiency: number;
  projects_count: number;
  avg_delay: number;
  performance_score: number;
  status: 'optimal' | 'overloaded' | 'underloaded';
}

// Interface pour les alertes
export interface AlertMetrics {
  total_alerts: number;
  critical_count: number;
  warning_count: number;
  resolved_count: number;
  avg_resolution_time: number;
  trend: number;
}

// Hook principal pour les KPIs exécutifs
export function useKPIs(filters?: AnalyticsFilters) {
  return useQuery({
    queryKey: ['/api/analytics/kpis', filters],
    select: (res) => res.data, // Unwrap { success, data, timestamp } -> data
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // Refresh automatique toutes les 5 minutes
  });
}

// Hook pour les métriques détaillées
export function useMetrics(type: MetricType, groupBy?: string, filters?: AnalyticsFilters) {
  return useQuery({
    queryKey: ['/api/analytics/metrics', { metricType: type, groupBy, ...filters }],
    select: (res) => res.data, // Unwrap API response
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Hook pour les métriques de pipeline
export function usePipelineMetrics(filters?: AnalyticsFilters) {
  return useQuery({
    queryKey: ['/api/analytics/pipeline', filters],
    select: (res) => res.data, // Unwrap API response
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
}

// Hook pour les métriques d'équipe
export function useTeamMetrics(groupBy: 'user' | 'department' = 'user', filters?: AnalyticsFilters) {
  return useQuery({
    queryKey: ['/api/analytics/metrics', { metricType: 'team_load', groupBy, ...filters }],
    select: (res) => res.data, // Unwrap API response
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Hook pour les snapshots historiques
export function useSnapshots(period?: string) {
  return useQuery({
    queryKey: ['/api/analytics/snapshots', { period }],
    select: (res) => res.data, // Unwrap API response
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

// Hook pour les benchmarks de performance
export function useBenchmarks(entityType: string, entityId?: string) {
  return useQuery({
    queryKey: ['/api/analytics/benchmarks', { entityType, entityId }],
    select: (res) => res.data, // Unwrap API response
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
}

// Hook pour générer un snapshot
export function useGenerateSnapshot() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (request: SnapshotRequest) => 
      apiRequest('POST', '/api/analytics/snapshot', request),
    onSuccess: () => {
      // Invalider tous les caches analytics après génération
      queryClient.invalidateQueries({ queryKey: ['/api/analytics'] });
    }
  });
}

// Hook pour exporter un rapport
export function useExportReport() {
  return useMutation({
    mutationFn: async (format: 'pdf' | 'excel' | 'csv') => {
      // Use fetch directly for blob responses
      const response = await fetch('/api/analytics/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ format }),
      });
      
      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }
      
      return response.blob();
    }
  });
}

// Hook consolidé pour le dashboard exécutif
export function useExecutiveDashboard(filters?: AnalyticsFilters) {
  const kpis = useKPIs(filters);
  const pipeline = usePipelineMetrics(filters);
  const teamMetrics = useTeamMetrics('user', filters);
  const benchmarks = useBenchmarks('company');
  
  return {
    kpis: {
      data: kpis.data,
      isLoading: kpis.isLoading,
      error: kpis.error,
      refetch: kpis.refetch,
    },
    pipeline: {
      data: pipeline.data,
      isLoading: pipeline.isLoading,
      error: pipeline.error,
      refetch: pipeline.refetch,
    },
    teamMetrics: {
      data: teamMetrics.data,
      isLoading: teamMetrics.isLoading,
      error: teamMetrics.error,
      refetch: teamMetrics.refetch,
    },
    benchmarks: {
      data: benchmarks.data,
      isLoading: benchmarks.isLoading,
      error: benchmarks.error,
      refetch: benchmarks.refetch,
    },
    // Statut global de chargement
    isLoading: kpis.isLoading || pipeline.isLoading || teamMetrics.isLoading,
    // Refresh général
    refreshAll: () => {
      kpis.refetch();
      pipeline.refetch();
      teamMetrics.refetch();
      benchmarks.refetch();
    }
  };
}

// Hook pour les données temps réel (plus fréquent)
export function useRealtimeExecutiveData() {
  return useQuery({
    queryKey: ['/api/analytics/realtime'],
    select: (res) => res.data, // Unwrap API response
    refetchInterval: 2 * 60 * 1000, // 2 minutes
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

// Hook pour les alertes executive
export function useExecutiveAlerts() {
  return useQuery({
    queryKey: ['/api/analytics/alerts'],
    select: (res) => res.data, // Unwrap API response
    refetchInterval: 3 * 60 * 1000, // 3 minutes
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Hook pour les tendances de conversion
export function useConversionTrends(period: '1M' | '3M' | '6M' | '1Y' = '3M') {
  return useQuery({
    queryKey: ['/api/analytics/metrics', { metricType: 'conversion', groupBy: 'month', period }],
    select: (res) => res.data, // Unwrap API response
    staleTime: 30 * 60 * 1000, // 30 minutes - données moins volatiles
  });
}

// Hook pour l'analyse des marges par catégorie
export function useMarginAnalysis() {
  return useQuery({
    queryKey: ['/api/analytics/metrics', { metricType: 'margin', groupBy: 'category' }],
    select: (res) => res.data, // Unwrap API response
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

// Hook pour détecter les goulots d'étranglement
export function useBottleneckAnalysis() {
  return useQuery({
    queryKey: ['/api/analytics/bottlenecks'],
    select: (res) => res.data, // Unwrap API response
    staleTime: 20 * 60 * 1000, // 20 minutes
  });
}