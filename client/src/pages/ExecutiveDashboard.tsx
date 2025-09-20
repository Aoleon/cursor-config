import { useState, memo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  Minus
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { 
  useExecutiveDashboard, 
  useConversionTrends, 
  useMarginAnalysis,
  useExecutiveAlerts,
  useGenerateSnapshot,
  useExportReport
} from '@/hooks/useAnalytics';
import { formatCurrency, formatPercentage, formatTrend, formatDuration, getProgressColor } from '@/utils/formatters';

// ========================================
// INTERFACES ET TYPES
// ========================================

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
// COMPOSANT EN-TÊTE DASHBOARD
// ========================================

function DashboardHeader() {
  const { data: user } = useQuery({ queryKey: ['/api/auth/user'] });
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

  return (
    <div className="flex justify-between items-center" data-testid="dashboard-header">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Dashboard Dirigeant
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Vue d'ensemble opérationnelle • {new Date().toLocaleDateString('fr-FR')}
        </p>
      </div>
      <div className="flex gap-3">
        <Button 
          variant="outline" 
          onClick={handleExportReport}
          disabled={exportReport.isPending}
          data-testid="button-export-report"
        >
          <Download className="w-4 h-4 mr-2" />
          {exportReport.isPending ? 'Export...' : 'Exporter Rapport'}
        </Button>
        <Button 
          onClick={handleGenerateSnapshot}
          disabled={generateSnapshot.isPending}
          data-testid="button-generate-snapshot"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${generateSnapshot.isPending ? 'animate-spin' : ''}`} />
          {generateSnapshot.isPending ? 'Génération...' : 'Générer Snapshot'}
        </Button>
      </div>
    </div>
  );
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
  const chartData = data || [];
  
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
  const chartData = data || [];
  
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
              {(benchmarks.data?.topPerformers || []).slice(0, 5).map((performer, index: number) => (
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
              <BarChart data={marginAnalysis.data?.byCategory || []}>
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
              <LineChart data={pipeline.data?.forecast_3_months || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip 
                  formatter={(value) => [formatCurrency(value), 'Prévision']}
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
                {(teamMetrics.data || []).map((member: any, index: number) => (
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
              {(alerts.data?.recent_alerts || []).slice(0, 10).map((alert, index: number) => (
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
// COMPOSANT PRINCIPAL DASHBOARD EXÉCUTIF
// ========================================

export default function ExecutiveDashboard() {
  const [activeTab, setActiveTab] = useState('performance');

  return (
    <div className="min-h-screen bg-background">
      <div className="p-6 space-y-6" data-testid="executive-dashboard">
        <DashboardHeader />
        <KPIOverview />
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="performance" data-testid="tab-performance">
              Performance
            </TabsTrigger>
            <TabsTrigger value="pipeline" data-testid="tab-pipeline">
              Pipeline
            </TabsTrigger>
            <TabsTrigger value="operations" data-testid="tab-operations">
              Opérations
            </TabsTrigger>
            <TabsTrigger value="alerts" data-testid="tab-alerts">
              Alertes
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
          <TabsContent value="alerts">
            <AlertsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}