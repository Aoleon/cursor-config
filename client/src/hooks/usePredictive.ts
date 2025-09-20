import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import type { PredictiveRevenueForecast, ProjectRiskAssessment, BusinessRecommendation } from '@shared/schema';

// ========================================
// HOOKS PRÉDICTIFS POUR MOTEUR SAXIUM
// ========================================

// Hook pour forecasting revenus avec horizon temporel
export function useRevenueForecast(params?: {
  forecast_months?: number;
  method?: 'exp_smoothing' | 'moving_average' | 'trend_analysis';
  confidence_threshold?: number;
}) {
  return useQuery({
    queryKey: ['/api/predictive/revenue', params],
    select: (res: any) => res.data as PredictiveRevenueForecast[], // Unwrap { success, data, metadata }
    staleTime: 10 * 60 * 1000, // 10min cache (prédictions moins volatiles)
    enabled: !!params, // Seulement si params fournis
  });
}

// Hook pour analyse risques projets avec filtrage
export function useProjectRisks(params?: {
  risk_level?: 'all' | 'medium' | 'high' | 'critical';
  limit?: number;
  sort_by?: 'risk_score' | 'deadline' | 'budget';
}) {
  return useQuery({
    queryKey: ['/api/predictive/risks', params],
    select: (res: any) => res.data as ProjectRiskAssessment[],
    staleTime: 5 * 60 * 1000, // 5min cache (risques plus dynamiques)
  });
}

// Hook pour recommandations business actionables
export function useBusinessRecommendations(params?: {
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  focus_areas?: string[];
}) {
  return useQuery({
    queryKey: ['/api/predictive/recommendations', params],
    select: (res: any) => res.data as BusinessRecommendation[],
    staleTime: 15 * 60 * 1000, // 15min cache (recommandations moins volatiles)
  });
}

// Hook pour listing snapshots historiques
export function useForecastSnapshots(params?: {
  limit?: number;
  type?: string;
}) {
  return useQuery({
    queryKey: ['/api/predictive/snapshots', params],
    select: (res: any) => res.data,
    staleTime: 30 * 60 * 1000, // 30min cache (snapshots historiques)
  });
}

// Mutation pour sauvegarder snapshot forecast
export function useSaveForecastSnapshot() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: {
      forecast_type: 'revenue' | 'risks' | 'recommendations';
      data: any;
      params: any;
      notes?: string;
    }) => {
      return await apiRequest('POST', '/api/predictive/snapshots', data);
    },
    onSuccess: () => {
      // Invalider cache snapshots après sauvegarde
      queryClient.invalidateQueries({ queryKey: ['/api/predictive/snapshots'] });
    }
  });
}

// Hook consolidé pour données prédictives complètes
export function usePredictiveDashboard(params?: {
  forecastMethod?: 'exp_smoothing' | 'moving_average' | 'trend_analysis';
  forecastMonths?: number;
  riskLevel?: 'all' | 'medium' | 'high' | 'critical';
  recommendationPriority?: 'low' | 'medium' | 'high' | 'urgent';
}) {
  const revenueForecast = useRevenueForecast({
    forecast_months: params?.forecastMonths || 6,
    method: params?.forecastMethod || 'exp_smoothing',
    confidence_threshold: 80
  });
  
  const projectRisks = useProjectRisks({
    risk_level: params?.riskLevel || 'medium',
    limit: 10,
    sort_by: 'risk_score'
  });
  
  const recommendations = useBusinessRecommendations({
    priority: params?.recommendationPriority || 'high'
  });
  
  return {
    revenueForecast: {
      data: revenueForecast.data,
      isLoading: revenueForecast.isLoading,
      error: revenueForecast.error,
      refetch: revenueForecast.refetch,
    },
    projectRisks: {
      data: projectRisks.data,
      isLoading: projectRisks.isLoading,
      error: projectRisks.error,
      refetch: projectRisks.refetch,
    },
    recommendations: {
      data: recommendations.data,
      isLoading: recommendations.isLoading,
      error: recommendations.error,
      refetch: recommendations.refetch,
    },
    // Statut global de chargement
    isLoading: revenueForecast.isLoading || projectRisks.isLoading || recommendations.isLoading,
    // Refresh général
    refreshAll: () => {
      revenueForecast.refetch();
      projectRisks.refetch();
      recommendations.refetch();
    }
  };
}

// Hook pour forecasting temps réel (plus fréquent)
export function useRealtimePredictive() {
  return useQuery({
    queryKey: ['/api/predictive/realtime'],
    select: (res: any) => res.data,
    refetchInterval: 3 * 60 * 1000, // 3 minutes
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}