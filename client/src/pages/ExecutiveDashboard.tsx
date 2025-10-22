import { useState, memo, lazy, Suspense, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  TrendingUp, 
  TrendingDown, 
  Euro, 
  Clock, 
  Users, 
  Target,
  AlertTriangle,
  Download,
  RefreshCw,
  BarChart3,
  FileText,
  Calendar,
  CheckCircle2,
  XCircle,
  Activity,
  DollarSign,
  Timer,
  ArrowUp,
  ArrowDown,
  Minus,
  Lightbulb,
  Loader2,
  Settings,
  CheckCircle,
  User,
  Brain,
  Wrench
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend } from 'recharts';
import { 
  useExecutiveDashboard, 
  useConversionTrends, 
  useMarginAnalysis,
  useExecutiveAlerts,
  useGenerateSnapshot,
  useExportReport
} from '@/hooks/useAnalytics';
import {
  useRevenueForecast,
  useProjectRisks,
  useBusinessRecommendations,
  useSaveForecastSnapshot
} from '@/hooks/usePredictive';
import { formatCurrency, formatPercentage, formatTrend, formatDuration, getProgressColor } from '@/utils/formatters';
import type { PredictiveRevenueForecast, ProjectRiskAssessment, BusinessRecommendation } from '@shared/schema';
import { BusinessAlertsOverview } from '@/components/BusinessAlertsOverview';
import { BusinessAlertsList } from '@/components/BusinessAlertsList';
import { DateAlertsProvider } from '@/components/alerts/DateAlertsProvider';
import IntelligentHeader from '@/components/navigation/IntelligentHeader';

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Ensures that the input is always a valid array for Recharts
 * Protects against undefined, null, objects, and other non-array values
 */
function ensureArray<T = any>(data: any): T[] {
  if (Array.isArray(data)) {
    return data;
  }
  return [];
}

// Lazy loading des composants spécialisés pour optimiser les performances
const DateIntelligenceDashboard = lazy(() => import('@/pages/DateIntelligenceDashboard'));
const AlertsManagementPanel = lazy(() => import('@/pages/AlertsManagementPanel'));
const BusinessRulesManager = lazy(() => import('@/pages/BusinessRulesManager'));
const InteractiveGanttChart = lazy(() => import('@/components/gantt/InteractiveGanttChart'));

// ========================================
// COMPOSANT SKELETON POUR LAZY LOADING
// ========================================

const TabLoadingSkeleton = memo(() => (
  <div className="space-y-6 p-6">
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>
      <Skeleton className="h-10 w-32" />
    </div>
    
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {[...Array(4)].map((_, i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
            <Skeleton className="h-8 w-16 mb-2" />
            <Skeleton className="h-3 w-12" />
          </CardContent>
        </Card>
      ))}
    </div>
    
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-64 w-full" />
      </CardContent>
    </Card>
  </div>
));

// ========================================
// INTERFACES ET TYPES
// ========================================

interface TopPerformer {
  name: string;
  score: number;
}

interface AlertItem {
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  created_at: string;
}

interface KPICardProps {
  title: string;
  value: string | number;
  trend?: number;
  icon: React.ComponentType<{ className?: string }>;
  variant?: 'default' | 'warning' | 'danger';
  loading?: boolean;
  'data-testid'?: string;
}

interface ChartData {
  name: string;
  value: number;
  [key: string]: any;
}

// ========================================
// COMPOSANT KPI CARD EXÉCUTIF
// ========================================

const ExecutiveKPICard = memo(({ title, value, trend, icon: Icon, variant = 'default', loading = false, ...props }: KPICardProps) => {
  if (loading) {
    return (
      <Card className="animate-pulse" data-testid={`${props['data-testid']}-loading`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
          <Skeleton className="h-8 w-16 mb-2" />
          <Skeleton className="h-3 w-12" />
        </CardContent>
      </Card>
    );
  }

  const getTrendIcon = () => {
    if (trend === undefined) return null;
    if (trend > 5) return <ArrowUp className="w-4 h-4 text-green-600" />;
    if (trend < -5) return <ArrowDown className="w-4 h-4 text-red-600" />;
    return <Minus className="w-4 h-4 text-gray-600" />;
  };

  const getTrendColor = () => {
    if (trend === undefined) return 'text-gray-600';
    if (trend > 0) return 'text-green-600';
    if (trend < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getCardStyle = () => {
    switch (variant) {
      case 'warning': return 'border-orange-200 bg-orange-50 dark:bg-orange-900/20';
      case 'danger': return 'border-red-200 bg-red-50 dark:bg-red-900/20';
      default: return 'border-border bg-card';
    }
  };

  return (
    <Card className={`transition-all hover:shadow-md ${getCardStyle()}`} {...props}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
          <div className="p-2 rounded-lg bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <p className="text-2xl font-bold">{value}</p>
            {trend !== undefined && (
              <div className="flex items-center gap-1">
                {getTrendIcon()}
                <span className={`text-sm font-medium ${getTrendColor()}`}>
                  {Math.abs(trend).toFixed(1)}%
                </span>
              </div>
            )}
          </div>
          
          {variant !== 'default' && (
            <Badge variant={variant === 'danger' ? 'destructive' : 'secondary'} className="text-xs">
              {variant === 'danger' ? 'Critique' : 'Attention'}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

// ========================================
// HOOK POUR ACTIONS HEADER DASHBOARD
// ========================================

function useDashboardHeaderActions() {
  const generateSnapshot = useGenerateSnapshot();
  const exportReport = useExportReport();

  const handleExportReport = async () => {
    try {
      const blob = await exportReport.mutateAsync('pdf');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rapport-dirigeant-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
    }
  };

  const handleGenerateSnapshot = async () => {
    try {
      await generateSnapshot.mutateAsync({
        type: 'full',
        includeCharts: true,
        format: 'json'
      });
    } catch (error) {
      console.error('Erreur lors de la génération:', error);
    }
  };

  return {
    actions: [
      {
        label: exportReport.isPending ? 'Export...' : 'Exporter Rapport',
        icon: 'download',
        variant: 'outline' as const,
        onClick: handleExportReport
      },
      {
        label: generateSnapshot.isPending ? 'Génération...' : 'Générer Snapshot', 
        icon: generateSnapshot.isPending ? 'refresh' : 'plus',
        variant: 'default' as const,
        onClick: handleGenerateSnapshot
      }
    ]
  };
}

// ========================================
// COMPOSANT APERÇU KPI
// ========================================

function KPIOverview() {
  const { kpis } = useExecutiveDashboard();

  if (kpis.isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" data-testid="kpi-overview-loading">
        {[...Array(4)].map((_, i) => (
          <ExecutiveKPICard
            key={i}
            title=""
            value=""
            icon={Activity}
            loading={true}
          />
        ))}
      </div>
    );
  }

  const kpiData = kpis.data;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" data-testid="kpi-overview">
      <ExecutiveKPICard
        title="Taux Conversion"
        value={formatPercentage(kpiData?.conversion_rate_offer_to_project || 0)}
        trend={kpiData?.conversion_trend}
        icon={TrendingUp}
        data-testid="kpi-conversion-rate"
      />
      <ExecutiveKPICard
        title="CA Prévisionnel"
        value={formatCurrency(kpiData?.total_revenue_forecast || 0)}
        trend={kpiData?.revenue_trend}
        icon={Euro}
        data-testid="kpi-revenue-forecast"
      />
      <ExecutiveKPICard
        title="Délai Moyen"
        value={formatDuration(kpiData?.avg_delay_days || 0)}
        trend={kpiData?.delay_trend}
        icon={Clock}
        variant={(kpiData?.avg_delay_days || 0) > 15 ? 'warning' : 'default'}
        data-testid="kpi-avg-delay"
      />
      <ExecutiveKPICard
        title="Charge Équipes"
        value={formatPercentage(kpiData?.avg_team_load_percentage || 0)}
        trend={kpiData?.load_trend}
        icon={Users}
        variant={(kpiData?.avg_team_load_percentage || 0) > 85 ? 'danger' : 'default'}
        data-testid="kpi-team-load"
      />
    </div>
  );
}

// ========================================
// COMPOSANTS GRAPHIQUES RECHARTS
// ========================================

const ConversionTrendChart = memo(({ data }: { data: any[] }) => {
  const chartData = ensureArray(data);
  
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="period" />
        <YAxis />
        <Tooltip 
          formatter={(value) => [`${value}%`, 'Taux Conversion']}
        />
        <Line 
          type="monotone" 
          dataKey="conversion_rate" 
          stroke="#3B82F6" 
          strokeWidth={2}
          dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
});

const TeamLoadChart = memo(({ data }: { data: any[] }) => {
  const chartData = ensureArray(data);
  
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="userName" />
        <YAxis />
        <Tooltip 
          formatter={(value) => [`${value}%`, 'Charge']}
        />
        <Bar 
          dataKey="load_percentage" 
          fill="#10B981"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
});

const PipelineStageCard = memo(({ stage, count, value, conversion, ...props }: {
  stage: string;
  count: number;
  value: string;
  conversion?: number;
  'data-testid'?: string;
}) => (
  <Card {...props}>
    <CardHeader className="pb-3">
      <CardTitle className="text-sm font-medium text-muted-foreground">{stage}</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-2">
        <div className="text-2xl font-bold">{count}</div>
        <div className="text-sm text-muted-foreground">{value}</div>
        {conversion !== undefined && (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {formatPercentage(conversion)} conversion
            </Badge>
          </div>
        )}
      </div>
    </CardContent>
  </Card>
));

// ========================================
// ONGLETS SPÉCIALISÉS
// ========================================

function PerformanceTab() {
  const conversionTrends = useConversionTrends('3M');
  const marginAnalysis = useMarginAnalysis();
  const { benchmarks } = useExecutiveDashboard();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" data-testid="performance-tab">
      <Card>
        <CardHeader>
          <CardTitle>Évolution Taux Conversion</CardTitle>
        </CardHeader>
        <CardContent>
          {conversionTrends.isLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : (
            <ConversionTrendChart data={conversionTrends.data || []} />
          )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Top Performers</CardTitle>
        </CardHeader>
        <CardContent>
          {benchmarks.isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {(benchmarks.data?.topPerformers || []).slice(0, 5).map((performer: TopPerformer, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{index + 1}</Badge>
                    <span className="font-medium">{performer.name}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {formatPercentage(performer.score)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Analyse Marges par Catégorie</CardTitle>
        </CardHeader>
        <CardContent>
          {marginAnalysis.isLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={ensureArray(marginAnalysis.data?.byCategory)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis />
                <Tooltip 
                  formatter={(value: any) => [`${value}%`, 'Marge']}
                />
                <Bar 
                  dataKey="margin" 
                  fill="#8884d8"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PipelineTab() {
  const { pipeline } = useExecutiveDashboard();

  return (
    <div className="space-y-6" data-testid="pipeline-tab">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <PipelineStageCard 
          stage="AO Reçus"
          count={pipeline.data?.ao_count || 0}
          value={formatCurrency(pipeline.data?.ao_total_value || 0)}
          data-testid="pipeline-ao"
        />
        <PipelineStageCard 
          stage="Offres Envoyées"
          count={pipeline.data?.offer_count || 0}
          value={formatCurrency(pipeline.data?.offer_total_value || 0)}
          conversion={pipeline.data?.ao_to_offer_rate}
          data-testid="pipeline-offers"
        />
        <PipelineStageCard 
          stage="Projets Signés"
          count={pipeline.data?.project_count || 0}
          value={formatCurrency(pipeline.data?.project_total_value || 0)}
          conversion={pipeline.data?.offer_to_project_rate}
          data-testid="pipeline-projects"
        />
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Pipeline Forecast 3 Mois</CardTitle>
        </CardHeader>
        <CardContent>
          {pipeline.isLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={ensureArray(pipeline.data?.forecast_3_months)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip 
                  formatter={(value) => [formatCurrency(Number(value)), 'Prévision']}
                />
                <Line 
                  type="monotone" 
                  dataKey="predicted_value" 
                  stroke="#10B981" 
                  strokeWidth={2}
                  dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function OperationsTab() {
  const { teamMetrics } = useExecutiveDashboard();

  return (
    <div className="space-y-6" data-testid="operations-tab">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Charge Équipes par Utilisateur</CardTitle>
          </CardHeader>
          <CardContent>
            {teamMetrics.isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <TeamLoadChart data={teamMetrics.data || []} />
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Distribution Charge Équipes</CardTitle>
          </CardHeader>
          <CardContent>
            {teamMetrics.isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <div className="space-y-4">
                {ensureArray(teamMetrics.data).map((member: any, index: number) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">{member.userName}</span>
                      <span className="text-sm text-muted-foreground">
                        {formatPercentage(member.load_percentage)}
                      </span>
                    </div>
                    <Progress 
                      value={member.load_percentage} 
                      className={`h-2 ${getProgressColor(member.load_percentage)}`}
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function AlertsTab() {
  const alerts = useExecutiveAlerts();

  return (
    <div className="space-y-6" data-testid="alerts-tab">
      <Card>
        <CardHeader>
          <CardTitle>Résumé des Alertes</CardTitle>
        </CardHeader>
        <CardContent>
          {alerts.isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {alerts.data?.critical_count || 0}
                </div>
                <div className="text-sm text-muted-foreground">Critiques</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {alerts.data?.warning_count || 0}
                </div>
                <div className="text-sm text-muted-foreground">Avertissements</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {alerts.data?.resolved_count || 0}
                </div>
                <div className="text-sm text-muted-foreground">Résolues</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {alerts.data?.total_alerts || 0}
                </div>
                <div className="text-sm text-muted-foreground">Total</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Alertes Récentes</CardTitle>
        </CardHeader>
        <CardContent>
          {alerts.isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {(alerts.data?.recent_alerts || []).slice(0, 10).map((alert: AlertItem, index: number) => (
                <div key={index} className="flex items-start gap-3 p-3 rounded-lg border">
                  <div className={`p-1 rounded-full ${
                    alert.severity === 'critical' ? 'bg-red-100 text-red-600' :
                    alert.severity === 'warning' ? 'bg-orange-100 text-orange-600' :
                    'bg-blue-100 text-blue-600'
                  }`}>
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{alert.title}</span>
                      <Badge variant={alert.severity === 'critical' ? 'destructive' : 'secondary'} className="text-xs">
                        {alert.severity}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{alert.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(alert.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ========================================
// COMPOSANTS PRÉDICTIFS - NOUVEAUX
// ========================================

// Skeleton pour risques projets
const ProjectRisksSkeleton = memo(() => (
  <div className="space-y-3">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="border rounded-lg p-3">
        <div className="flex justify-between items-start mb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-6 w-12" />
        </div>
        <Skeleton className="h-3 w-full mb-2" />
        <div className="flex gap-1">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-12" />
        </div>
      </div>
    ))}
  </div>
));

// Skeleton pour recommandations
const RecommendationsSkeleton = memo(() => (
  <div className="space-y-3">
    {[...Array(4)].map((_, i) => (
      <div key={i} className="border rounded-lg p-3">
        <div className="flex justify-between items-start mb-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-5 w-16" />
        </div>
        <Skeleton className="h-3 w-full mb-2" />
        <Skeleton className="h-3 w-24 mb-2" />
        <div className="flex space-x-2">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-24" />
        </div>
      </div>
    ))}
  </div>
));

// Graphique forecasting avec Recharts
const RevenueForecastChart = memo(({ data, method }: {
  data: PredictiveRevenueForecast[];
  method: string;
}) => {
  const chartData = ensureArray(data?.map(d => ({
    month: d.target_period,
    forecast: d.revenue_forecast,
    confidence: d.confidence_level
  })));
  
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis tickFormatter={(value) => formatCurrency(value)} />
          <Tooltip 
            formatter={(value, name) => [
              name === 'forecast' ? formatCurrency(value as number) : `${value}%`,
              name === 'forecast' ? 'CA Prévu' : 'Confiance'
            ]}
          />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="forecast" 
            stroke="#2563eb" 
            strokeWidth={3}
            name="Prévision CA"
          />
          <Line 
            type="monotone" 
            dataKey="confidence" 
            stroke="#16a34a" 
            strokeWidth={2}
            strokeDasharray="5 5"
            name="Niveau Confiance"
          />
        </LineChart>
      </ResponsiveContainer>
      
      {/* Footer méthode */}
      <div className="mt-2 text-sm text-gray-500 dark:text-gray-400 text-center">
        Méthode: {method === 'exp_smoothing' ? 'Lissage Exponentiel' : 
                  method === 'moving_average' ? 'Moyenne Mobile' : 'Analyse Tendance'}
      </div>
    </div>
  );
});

// Table risques projets avec scoring
const ProjectRisksTable = memo(({ risks }: { risks: ProjectRiskAssessment[] }) => {
  return (
    <div className="space-y-3">
      {ensureArray(risks).map((risk) => (
        <div 
          key={risk.id} 
          className="border rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-gray-800"
          data-testid={`risk-item-${risk.project_id}`}
        >
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="font-medium text-sm">Projet {risk.project_id}</div>
              <div className="text-xs text-gray-500 mt-1">
                {risk.predicted_delay_days && `Retard prévu: ${risk.predicted_delay_days}j`}
                {risk.predicted_budget_overrun && ` • Dépassement: ${formatCurrency(risk.predicted_budget_overrun)}`}
              </div>
            </div>
            <div className="text-right">
              <div className={`text-lg font-bold ${
                risk.risk_score >= 90 ? 'text-red-600' :
                risk.risk_score >= 70 ? 'text-orange-600' :
                'text-yellow-600'
              }`}>
                {risk.risk_score}%
              </div>
              <div className="text-xs text-gray-500">Risque</div>
            </div>
          </div>
          
          {/* Facteurs risque principaux */}
          <div className="mt-2 flex flex-wrap gap-1">
            {risk.risk_factors?.slice(0, 3).map((factor, idx) => (
              <span 
                key={idx}
                className={`text-xs px-2 py-1 rounded ${
                  factor.severity === 'critical' ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400' :
                  factor.severity === 'high' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400' :
                  'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400'
                }`}
              >
                {factor.category}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
});

// Liste recommandations avec actions
const RecommendationsList = memo(({ recommendations }: { recommendations: BusinessRecommendation[] }) => {
  const saveSnapshot = useSaveForecastSnapshot();
  
  return (
    <div className="space-y-3">
      {ensureArray(recommendations).map((rec) => (
        <div 
          key={rec.id} 
          className="border rounded-lg p-3"
          data-testid={`recommendation-${rec.id}`}
        >
          <div className="flex justify-between items-start mb-2">
            <h4 className="font-medium text-sm">{rec.title}</h4>
            <span className={`text-xs px-2 py-1 rounded ${
              rec.priority === 'urgent' ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400' :
              rec.priority === 'high' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400' :
              'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
            }`}>
              {rec.priority}
            </span>
          </div>
          
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">{rec.description}</p>
          
          {/* Impact financier */}
          {rec.expected_impact?.financial && (
            <div className="text-xs text-green-600 dark:text-green-400 mb-2">
              Impact: {formatCurrency(rec.expected_impact.financial)}
              {rec.expected_impact.roi_percentage && ` (ROI: ${rec.expected_impact.roi_percentage}%)`}
            </div>
          )}
          
          {/* Actions */}
          <div className="flex space-x-2">
            <Button 
              size="sm" 
              variant="outline"
              className="text-xs"
              data-testid={`btn-implement-${rec.id}`}
            >
              Implémenter
            </Button>
            <Button 
              size="sm" 
              variant="ghost"
              className="text-xs"
              onClick={() => saveSnapshot.mutate({
                forecast_type: 'recommendations',
                data: rec,
                params: { priority: rec.priority },
                notes: `Recommandation ${rec.category}`
              })}
              data-testid={`btn-save-${rec.id}`}
            >
              Sauvegarder
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
});

// Composant onglet prédictif principal
function PredictiveTab() {
  const [forecastMethod, setForecastMethod] = useState<'exp_smoothing' | 'moving_average' | 'trend_analysis'>('exp_smoothing');
  const [forecastMonths, setForecastMonths] = useState(6);
  
  // Hooks données prédictives
  const { data: revenueForecast, isLoading: isLoadingForecast } = useRevenueForecast({
    forecast_months: forecastMonths,
    method: forecastMethod,
    confidence_threshold: 80
  });
  
  const { data: projectRisks, isLoading: isLoadingRisks } = useProjectRisks({
    risk_level: 'medium',
    limit: 10,
    sort_by: 'risk_score'
  });
  
  const { data: recommendations, isLoading: isLoadingRecs } = useBusinessRecommendations({
    priority: 'high'
  });
  
  return (
    <div className="space-y-6" data-testid="tab-predictive">
      {/* Header contrôles */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Analyse Prédictive
        </h2>
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
          {/* Sélecteur méthode forecast */}
          <Select value={forecastMethod} onValueChange={(value: string) => setForecastMethod(value as 'exp_smoothing' | 'moving_average' | 'trend_analysis')}>
            <SelectTrigger className="w-48" data-testid="select-forecast-method">
              <SelectValue placeholder="Méthode prévision" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="exp_smoothing">Lissage Exponentiel</SelectItem>
              <SelectItem value="moving_average">Moyenne Mobile</SelectItem>
              <SelectItem value="trend_analysis">Analyse Tendance</SelectItem>
            </SelectContent>
          </Select>
          
          {/* Sélecteur horizon */}
          <Select value={forecastMonths.toString()} onValueChange={(v) => setForecastMonths(parseInt(v))}>
            <SelectTrigger className="w-32" data-testid="select-forecast-months">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">3 mois</SelectItem>
              <SelectItem value="6">6 mois</SelectItem>
              <SelectItem value="12">12 mois</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Grid sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section Forecasting CA */}
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <span>Prévisions Chiffre d'Affaires</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingForecast ? (
              <div className="h-64 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : (
              <RevenueForecastChart 
                data={revenueForecast || []} 
                method={forecastMethod}
              />
            )}
          </CardContent>
        </Card>
        
        {/* Section Risques Projets */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              <span>Projets à Risque</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingRisks ? (
              <ProjectRisksSkeleton />
            ) : (
              <ProjectRisksTable 
                risks={projectRisks || []} 
              />
            )}
          </CardContent>
        </Card>
        
        {/* Section Recommandations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Lightbulb className="w-5 h-5 text-green-600" />
              <span>Recommandations</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingRecs ? (
              <RecommendationsSkeleton />
            ) : (
              <RecommendationsList 
                recommendations={recommendations || []}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ========================================
// COMPOSANT PRINCIPAL DASHBOARD EXÉCUTIF
// ========================================

export default function ExecutiveDashboard() {
  const [location, setLocation] = useLocation();
  const { actions } = useDashboardHeaderActions();
  
  // ========================================
  // DEEP-LINKING SUPPORT POUR ONGLETS
  // ========================================
  
  // Extraire le paramètre tab de l'URL
  const getTabFromURL = (): string => {
    const searchParams = new URLSearchParams(location.split('?')[1] || '');
    const tabParam = searchParams.get('tab');
    
    // Valider que le tab existe
    const validTabs = ['overview', 'intelligence', 'analytics', 'configuration'];
    return validTabs.includes(tabParam || '') ? tabParam! : 'overview';
  };
  
  const [activeTab, setActiveTab] = useState<string>(getTabFromURL());
  
  // Synchroniser l'onglet actif avec l'URL au chargement
  useEffect(() => {
    const urlTab = getTabFromURL();
    if (urlTab !== activeTab) {
      setActiveTab(urlTab);
    }
  }, [location]);
  
  // Mettre à jour l'URL quand l'onglet change
  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    
    // Mettre à jour l'URL avec le nouveau paramètre tab
    const currentPath = location.split('?')[0];
    const newURL = newTab === 'overview' 
      ? currentPath // Ne pas ajouter ?tab=overview pour l'onglet par défaut
      : `${currentPath}?tab=${newTab}`;
    
    // Utiliser wouter API pour maintenir la synchronisation avec le router
    setLocation(newURL);
  };

  return (
    <DateAlertsProvider>
      <div className="min-h-screen bg-background">
        <IntelligentHeader 
          title="Dashboard Dirigeant"
          actions={actions}
        />
        <div className="p-6 space-y-6" data-testid="executive-dashboard">
          
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview" className="flex items-center gap-2" data-testid="tab-overview">
                <Activity className="h-4 w-4" />
                Vue d'ensemble
              </TabsTrigger>
              <TabsTrigger value="intelligence" className="flex items-center gap-2" data-testid="tab-intelligence">
                <Brain className="h-4 w-4" />
                Intelligence Temporelle
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center gap-2" data-testid="tab-analytics">
                <BarChart3 className="h-4 w-4" />
                Analytics
              </TabsTrigger>
              <TabsTrigger value="configuration" className="flex items-center gap-2" data-testid="tab-configuration">
                <Wrench className="h-4 w-4" />
                Configuration
              </TabsTrigger>
            </TabsList>
            
            {/* ONGLET VUE D'ENSEMBLE - Contenu Executive Dashboard EXISTANT */}
            <TabsContent value="overview" className="space-y-6">
              <KPIOverview />
              
              <Tabs defaultValue="performance" className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="performance" data-testid="tab-performance">
                    Performance
                  </TabsTrigger>
                  <TabsTrigger value="pipeline" data-testid="tab-pipeline">
                    Pipeline
                  </TabsTrigger>
                  <TabsTrigger value="operations" data-testid="tab-operations">
                    Opérations
                  </TabsTrigger>
                  <TabsTrigger value="alerts" className="flex items-center gap-2" data-testid="tab-alerts">
                    <AlertTriangle className="h-4 w-4" />
                    Alertes
                  </TabsTrigger>
                  <TabsTrigger value="predictive" data-testid="tab-predictive">
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Prédictif
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="performance">
                  <PerformanceTab />
                </TabsContent>
                <TabsContent value="pipeline">
                  <PipelineTab />
                </TabsContent>
                <TabsContent value="operations">
                  <OperationsTab />
                </TabsContent>
                <TabsContent value="alerts" className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold tracking-tight">Alertes Métier</h2>
                      <p className="text-muted-foreground">Gestion alertes business configurables</p>
                    </div>
                  </div>
                  
                  <div className="grid gap-6">
                    <BusinessAlertsOverview />
                    <BusinessAlertsList />
                  </div>
                </TabsContent>
                <TabsContent value="predictive">
                  <PredictiveTab />
                </TabsContent>
              </Tabs>
            </TabsContent>
            
            {/* ONGLET INTELLIGENCE TEMPORELLE */}
            <TabsContent value="intelligence" className="space-y-6">
              <Suspense fallback={<TabLoadingSkeleton />}>
                <DateIntelligenceDashboard />
              </Suspense>
            </TabsContent>
            
            {/* ONGLET ANALYTICS */}
            <TabsContent value="analytics" className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">Analytics Avancées</h2>
                  <p className="text-muted-foreground">
                    Planning interactif et métriques avancées de performance
                  </p>
                </div>
              </div>
              
              <Suspense fallback={<TabLoadingSkeleton />}>
                <InteractiveGanttChart />
              </Suspense>
              
              {/* Section métriques avancées intégrée */}
              <div className="grid gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Gestion des Alertes Avancées</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Alert className="mb-4">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        Section critique du panel de gestion des alertes pour vue dirigeant
                      </AlertDescription>
                    </Alert>
                    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
                      <AlertsManagementPanel />
                    </Suspense>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            {/* ONGLET CONFIGURATION */}
            <TabsContent value="configuration" className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">Configuration Dirigeant</h2>
                  <p className="text-muted-foreground">
                    Gestion des règles métier et paramètres intelligence temporelle
                  </p>
                </div>
              </div>
              
              <Suspense fallback={<TabLoadingSkeleton />}>
                <BusinessRulesManager />
              </Suspense>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </DateAlertsProvider>
  );
}