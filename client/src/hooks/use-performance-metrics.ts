import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

// Types pour les métriques de performance
export interface PerformanceMetrics {
  averageDelaysByPhase: PhaseDelayMetric[];
  trendsOverTime: TrendMetric[];
  projectSuccessRate: number;
  totalProjectsAnalyzed: number;
  ruleEffectiveness: RuleEffectivenessMetric[];
  optimizationImpact: OptimizationImpactMetric[];
  detectionAccuracy: DetectionAccuracyMetric;
}

export interface PhaseDelayMetric {
  phase: string;
  averageDays: number;
  median: number;
  standardDeviation: number;
  projectCount: number;
  onTimePercentage: number;
  delayedPercentage: number;
}

export interface TrendMetric {
  month: string;
  year: number;
  onTimePercentage: number;
  averageDelay: number;
  projectsCompleted: number;
  criticalAlertsCount: number;
  optimizationsApplied: number;
}

export interface RuleEffectivenessMetric {
  ruleId: string;
  ruleName: string;
  phase: string;
  applicationCount: number;
  accuracyRate: number; // % de prédictions correctes
  averageDeviation: number; // en jours
  impactOnSuccess: number; // amélioration du taux de succès
}

export interface OptimizationImpactMetric {
  type: 'parallel_phases' | 'resource_reallocation' | 'early_start';
  implementationCount: number;
  averageGainDays: number;
  successRate: number;
  feasibilityRate: number;
}

export interface DetectionAccuracyMetric {
  delayRiskDetection: {
    truePositives: number;
    falsePositives: number;
    trueNegatives: number;
    falseNegatives: number;
    precision: number;
    recall: number;
    f1Score: number;
  };
  criticalDeadlines: {
    detected: number;
    missed: number;
    earlyWarnings: number;
    accuracy: number;
  };
  optimizationOpportunities: {
    identified: number;
    implemented: number;
    successful: number;
    implementationRate: number;
    successRate: number;
  };
}

export interface TimeRange {
  startDate: Date;
  endDate: Date;
}

export interface MetricsFilters {
  timeRange?: TimeRange;
  phases?: string[];
  projectTypes?: string[];
  includeArchived?: boolean;
}

// Hook principal pour les métriques de performance
export function usePerformanceMetrics(filters?: MetricsFilters) {
  const {
    data: performanceData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['/api/performance-metrics', filters],
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 15 * 60 * 1000, // Actualisation 15min
  });

  // Calculs dérivés pour tableaux de bord
  const getDashboardStats = (data: PerformanceMetrics | undefined) => {
    if (!data) return null;

    const currentMonth = data.trendsOverTime[data.trendsOverTime.length - 1];
    const previousMonth = data.trendsOverTime[data.trendsOverTime.length - 2];

    return {
      projectSuccessRate: data.projectSuccessRate,
      totalProjects: data.totalProjectsAnalyzed,
      averageDelayDays: data.averageDelaysByPhase.reduce((acc, phase) => acc + phase.averageDays, 0) / data.averageDelaysByPhase.length,
      
      // Évolutions mensuelles
      onTimeEvolution: currentMonth && previousMonth 
        ? ((currentMonth.onTimePercentage - previousMonth.onTimePercentage) / previousMonth.onTimePercentage) * 100
        : 0,
      
      delayEvolution: currentMonth && previousMonth 
        ? ((currentMonth.averageDelay - previousMonth.averageDelay) / Math.max(previousMonth.averageDelay, 1)) * 100
        : 0,

      // Top phases problématiques
      mostDelayedPhases: data.averageDelaysByPhase
        .sort((a, b) => b.averageDelay - a.averageDelay)
        .slice(0, 3),

      // Efficacité des règles
      topPerformingRules: data.ruleEffectiveness
        .sort((a, b) => b.accuracyRate - a.accuracyRate)
        .slice(0, 5),

      // Impact des optimisations
      optimizationStats: {
        totalGainDays: data.optimizationImpact.reduce((acc, opt) => 
          acc + (opt.implementationCount * opt.averageGainDays), 0),
        averageSuccessRate: data.optimizationImpact.reduce((acc, opt) => 
          acc + opt.successRate, 0) / Math.max(data.optimizationImpact.length, 1),
        mostEffectiveType: data.optimizationImpact.reduce((best, current) => 
          current.averageGainDays > (best?.averageGainDays || 0) ? current : best, null),
      },

      // Précision de détection
      detectionStats: {
        delayDetectionAccuracy: data.detectionAccuracy.delayRiskDetection.precision,
        deadlineDetectionRate: data.detectionAccuracy.criticalDeadlines.accuracy,
        optimizationImplementationRate: data.detectionAccuracy.optimizationOpportunities.implementationRate,
      }
    };
  };

  // Données formatées pour les graphiques
  const getChartData = (data: PerformanceMetrics | undefined) => {
    if (!data) return null;

    return {
      // Graphique barres délais par phase
      delaysByPhase: data.averageDelaysByPhase.map(phase => ({
        phase: phase.phase,
        averageDays: Math.round(phase.averageDays * 10) / 10,
        onTimePercentage: Math.round(phase.onTimePercentage),
        projectCount: phase.projectCount,
      })),

      // Graphique ligne tendances temporelles
      trendsOverTime: data.trendsOverTime.map(trend => ({
        period: `${trend.month} ${trend.year}`,
        onTimePercentage: Math.round(trend.onTimePercentage),
        averageDelay: Math.round(trend.averageDelay * 10) / 10,
        projectsCompleted: trend.projectsCompleted,
        alerts: trend.criticalAlertsCount,
      })),

      // Graphique circulaire distribution succès
      successDistribution: [
        { name: 'À temps', value: data.projectSuccessRate, color: '#10B981' },
        { name: 'En retard', value: 100 - data.projectSuccessRate, color: '#F59E0B' },
      ],

      // Heatmap efficacité des règles
      rulesHeatmap: data.ruleEffectiveness.map(rule => ({
        rule: rule.ruleName.substring(0, 20) + (rule.ruleName.length > 20 ? '...' : ''),
        phase: rule.phase,
        accuracy: Math.round(rule.accuracyRate),
        applications: rule.applicationCount,
        impact: rule.impactOnSuccess,
      })),

      // Graphique impact optimisations
      optimizationImpact: data.optimizationImpact.map(opt => ({
        type: opt.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        implementations: opt.implementationCount,
        averageGain: Math.round(opt.averageGainDays),
        successRate: Math.round(opt.successRate),
        feasibility: Math.round(opt.feasibilityRate),
      })),
    };
  };

  return {
    // Données brutes
    performanceData: performanceData?.data,
    isLoading,
    error,
    
    // Actions
    refreshMetrics: refetch,
    
    // Données calculées
    dashboardStats: getDashboardStats(performanceData?.data),
    chartData: getChartData(performanceData?.data),
  };
}

// Hook pour métriques en temps réel (plus fréquent)
export function useRealtimeMetrics() {
  const {
    data: realtimeData,
    isLoading,
    error
  } = useQuery({
    queryKey: ['api', 'performance-metrics', 'realtime'],
    refetchInterval: 2 * 60 * 1000, // 2 minutes
    staleTime: 1 * 60 * 1000, // 1 minute
  });

  return {
    currentAlerts: realtimeData?.data?.currentAlerts || 0,
    criticalAlerts: realtimeData?.data?.criticalAlerts || 0,
    projectsAtRisk: realtimeData?.data?.projectsAtRisk || 0,
    activeOptimizations: realtimeData?.data?.activeOptimizations || 0,
    systemLoad: realtimeData?.data?.systemLoad || 0,
    lastDetectionRun: realtimeData?.data?.lastDetectionRun,
    isLoading,
    error,
  };
}

// Hook pour métriques d'une phase spécifique
export function usePhaseMetrics(phase: string) {
  const { performanceData, isLoading } = usePerformanceMetrics();

  if (!performanceData || isLoading) {
    return { phaseMetrics: null, isLoading };
  }

  const phaseData = performanceData.averageDelaysByPhase.find(p => p.phase === phase);
  const phaseRules = performanceData.ruleEffectiveness.filter(r => r.phase === phase);
  const phaseTrends = performanceData.trendsOverTime.map(trend => ({
    ...trend,
    phaseSpecificData: `${trend.month} ${trend.year}` // Placeholder pour données phase-spécifiques
  }));

  return {
    phaseMetrics: {
      basic: phaseData,
      rules: phaseRules,
      trends: phaseTrends,
      summary: {
        averageDelay: phaseData?.averageDays || 0,
        successRate: phaseData?.onTimePercentage || 0,
        rulesCount: phaseRules.length,
        avgRuleAccuracy: phaseRules.reduce((acc, r) => acc + r.accuracyRate, 0) / Math.max(phaseRules.length, 1),
      }
    },
    isLoading: false,
  };
}