/**
 * Dashboard de monitoring pour visualiser les métriques et alertes
 */

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Bell,
  BellOff,
  CheckCircle2,
  Clock,
  Database,
  Gauge,
  Info,
  RefreshCw,
  Server,
  Shield,
  TrendingDown,
  TrendingUp,
  Users,
  Wifi,
  WifiOff,
  XCircle,
  Zap
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

// ========================================
// TYPES
// ========================================

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'critical';
  score: number;
  issues: string[];
  checks: {
    database: {
      status: string;
      responseTime?: number;
    };
    aiServices: {
      status: string;
      providers: {
        anthropic: boolean;
        openai: boolean;
      };
    };
    circuitBreakers: {
      total: number;
      open: number;
      halfOpen: number;
      closed: number;
    };
  };
}

interface Metrics {
  timestamp: string;
  current: {
    errorRate: number;
    responseTimeP95: number;
    throughput: number;
    activeAlerts: number;
  };
  errors: {
    totalErrors: number;
    errorsByCategory: Record<string, number>;
    errorsByLevel: Record<string, number>;
    errorRate: number;
    topErrors: Array<{
      fingerprint: string;
      message: string;
      count: number;
      lastSeen: string;
      category: string;
    }>;
    recentErrors: Array<{
      id: string;
      timestamp: string;
      level: string;
      category: string;
      message: string;
      context?: any;
    }>;
  };
  performance: {
    responseTime: {
      p50: number;
      p95: number;
      p99: number;
      mean: number;
      min: number;
      max: number;
    };
    throughput: {
      requestsPerSecond: number;
      requestsPerMinute: number;
      totalRequests: number;
    };
  };
  business: {
    users: {
      activeUsers: number;
    };
    projects: {
      projectsCreated: number;
    };
    quotes: {
      quotesGenerated: number;
    };
  };
  system: {
    uptime: number;
    cpuUsage: number;
    memoryUsage: {
      percentage: number;
    };
    circuitBreakers: {
      total: number;
      open: number;
      halfOpen: number;
      closed: number;
    };
    rateLimiting: {
      totalHits: number;
      topLimitedEndpoints: Array<{
        endpoint: string;
        hits: number;
      }>;
    };
  };
  trends: {
    errorRateTrend: 'increasing' | 'stable' | 'decreasing';
    performanceTrend: 'improving' | 'stable' | 'degrading';
    trafficTrend: 'increasing' | 'stable' | 'decreasing';
  };
  alerts: Array<{
    id: string;
    name: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    status: string;
    triggeredAt: string;
    message: string;
  }>;
}

// ========================================
// COMPOSANTS UTILITAIRES
// ========================================

/**
 * Carte de métrique avec tendance
 */
function MetricCard({
  title,
  value,
  unit = '',
  trend,
  icon: Icon,
  color = 'blue',
  alert = false
}: {
  title: string;
  value?: number | string;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
  icon?: any;
  color?: string;
  alert?: boolean;
}) {
  const trendIcon = trend === 'up' ? <ArrowUp className="h-4 w-4" /> :
                    trend === 'down' ? <ArrowDown className="h-4 w-4" /> : null;
  
  let trendColor = trend === 'up' ? 'text-red-500' :
                   trend === 'down' ? 'text-green-500' : 'text-gray-500';
  
  if (color === 'green') trendColor = trend === 'up' ? 'text-green-500' : 'text-red-500';
  
  return (
    <Card className={alert ? 'border-red-500' : ''}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          {title}
        </CardTitle>
        {Icon && <Icon className={`h-4 w-4 text-muted-foreground`} />}
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline justify-between">
          <div className="text-2xl font-bold">
            {value ?? '—'}
            {unit && <span className="text-sm font-normal ml-1">{unit}</span>}
          </div>
          {trendIcon && (
            <div className={`flex items-center ${trendColor}`}>
              {trendIcon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Badge de statut avec couleur
 */
function StatusBadge({ 
  status, 
  className = '' 
}: { 
  status: 'healthy' | 'degraded' | 'critical' | 'active' | 'resolved';
  className?: string;
}) {
  const variants = {
    healthy: 'bg-green-100 text-green-800',
    degraded: 'bg-yellow-100 text-yellow-800',
    critical: 'bg-red-100 text-red-800',
    active: 'bg-orange-100 text-orange-800',
    resolved: 'bg-gray-100 text-gray-800'
  };
  
  return (
    <Badge className={`${variants[status]} ${className}`}>
      {status.toUpperCase()}
    </Badge>
  );
}

/**
 * Badge de sévérité
 */
function SeverityBadge({ severity }: { severity: string }) {
  const variants: Record<string, string> = {
    critical: 'bg-red-100 text-red-800',
    high: 'bg-orange-100 text-orange-800',
    medium: 'bg-yellow-100 text-yellow-800',
    low: 'bg-blue-100 text-blue-800',
    error: 'bg-red-100 text-red-800',
    warning: 'bg-yellow-100 text-yellow-800'
  };
  
  return (
    <Badge className={variants[severity] || 'bg-gray-100 text-gray-800'}>
      {severity.toUpperCase()}
    </Badge>
  );
}

// ========================================
// COMPOSANT PRINCIPAL
// ========================================

export default function MonitoringDashboard() {
  const { toast } = useToast();
  const [timeWindow, setTimeWindow] = useState('1hour');
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  // Récupération des métriques
  const { data: metrics, isLoading: metricsLoading, refetch: refetchMetrics } = useQuery<{ success: boolean } & Metrics>({
    queryKey: ['/api/monitoring/metrics'],
    refetchInterval: autoRefresh ? 30000 : false // Refresh toutes les 30s si activé
  });
  
  // Récupération de la santé
  const { data: health, isLoading: healthLoading } = useQuery<HealthStatus>({
    queryKey: ['/api/monitoring/health'],
    refetchInterval: autoRefresh ? 60000 : false // Refresh toutes les 60s
  });
  
  // Récupération de la timeline
  const { data: timeline } = useQuery<{
    success: boolean;
    window: string;
    data: Array<{
      timestamp: string;
      errorCount: number;
      requestCount: number;
      responseTime: number;
      errorRate: number;
    }>;
  }>({
    queryKey: ['/api/monitoring/timeline', timeWindow],
    refetchInterval: autoRefresh ? 30000 : false
  });
  
  // Données formatées pour les graphiques
  const errorChartData = useMemo(() => {
    if (!timeline?.data) return [];
    
    return timeline.data.map(point => ({
      time: new Date(point.timestamp).toLocaleTimeString('fr-FR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      errors: point.errorCount,
      requests: point.requestCount,
      errorRate: point.errorRate.toFixed(2)
    }));
  }, [timeline]);
  
  const categoryPieData = useMemo(() => {
    if (!metrics?.errors.errorsByCategory) return [];
    
    const colors = {
      database: '#ef4444',
      api: '#f97316',
      validation: '#eab308',
      auth: '#06b6d4',
      system: '#8b5cf6',
      business: '#10b981',
      external: '#6366f1'
    };
    
    return Object.entries(metrics.errors.errorsByCategory)
      .filter(([_, count]) => count > 0)
      .map(([category, count]) => ({
        name: category,
        value: count,
        color: colors[category as keyof typeof colors] || '#9ca3af'
      }));
  }, [metrics]);
  
  // Fonction pour acknowledge une alerte
  const acknowledgeAlert = async (alertId: string) => {
    try {
      await apiRequest(`/api/monitoring/alerts/${alertId}/acknowledge`, {
        method: 'POST'
      });
      toast({
        title: 'Alerte reconnue',
        description: 'L\'alerte a été marquée comme reconnue.'
      });
      refetchMetrics();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de reconnaître l\'alerte.',
        variant: 'destructive'
      });
    }
  };
  
  // Test des notifications
  const testNotifications = async () => {
    try {
      const response = await apiRequest('/api/monitoring/test/notifications', {
        method: 'POST'
      });
      toast({
        title: 'Tests effectués',
        description: 'Les tests de notification ont été lancés.'
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de tester les notifications.',
        variant: 'destructive'
      });
    }
  };
  
  // Génération d'une erreur de test
  const generateTestError = async (level: string) => {
    try {
      await apiRequest('/api/monitoring/test/error', {
        method: 'POST',
        body: JSON.stringify({ level })
      });
      toast({
        title: 'Erreur de test générée',
        description: `Une erreur de niveau ${level} a été créée.`
      });
      setTimeout(refetchMetrics, 1000);
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de générer l\'erreur de test.',
        variant: 'destructive'
      });
    }
  };
  
  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}j ${hours}h ${minutes}m`;
  };
  
  if (metricsLoading || healthLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard de Monitoring</h1>
          <p className="text-muted-foreground">
            Surveillance en temps réel des performances et erreurs
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Sélecteur de fenêtre temporelle */}
          <Select value={timeWindow} onValueChange={setTimeWindow}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1hour">1 heure</SelectItem>
              <SelectItem value="6hours">6 heures</SelectItem>
              <SelectItem value="24hours">24 heures</SelectItem>
            </SelectContent>
          </Select>
          
          {/* Auto-refresh toggle */}
          <Button
            variant={autoRefresh ? 'default' : 'outline'}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
            Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
          </Button>
          
          {/* Refresh manuel */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchMetrics()}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Statut de santé global */}
      {health && (
        <Alert className={
          health.status === 'critical' ? 'border-red-500' :
          health.status === 'degraded' ? 'border-yellow-500' : 'border-green-500'
        }>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle className="flex items-center gap-2">
            Statut du système
            <StatusBadge status={health.status} />
            <span className="ml-auto text-sm font-normal">
              Score de santé: {health.score}/100
            </span>
          </AlertTitle>
          {health.issues.length > 0 && (
            <AlertDescription>
              <ul className="mt-2 list-disc list-inside">
                {health.issues.map((issue, i) => (
                  <li key={i}>{issue}</li>
                ))}
              </ul>
            </AlertDescription>
          )}
        </Alert>
      )}
      
      {/* Métriques principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Taux d'erreur"
          value={metrics?.current.errorRate.toFixed(2)}
          unit="err/min"
          trend={
            metrics?.trends.errorRateTrend === 'increasing' ? 'up' :
            metrics?.trends.errorRateTrend === 'decreasing' ? 'down' : 'stable'
          }
          icon={AlertTriangle}
          alert={metrics && metrics.current.errorRate > 5}
        />
        
        <MetricCard
          title="Temps de réponse P95"
          value={metrics?.current.responseTimeP95}
          unit="ms"
          trend={
            metrics?.trends.performanceTrend === 'degrading' ? 'up' :
            metrics?.trends.performanceTrend === 'improving' ? 'down' : 'stable'
          }
          icon={Gauge}
          color="green"
        />
        
        <MetricCard
          title="Throughput"
          value={metrics?.current.throughput.toFixed(1)}
          unit="req/s"
          trend={
            metrics?.trends.trafficTrend === 'increasing' ? 'up' :
            metrics?.trends.trafficTrend === 'decreasing' ? 'down' : 'stable'
          }
          icon={Activity}
        />
        
        <MetricCard
          title="Alertes actives"
          value={metrics?.current.activeAlerts}
          trend={metrics && metrics.current.activeAlerts > 0 ? 'up' : 'stable'}
          icon={Bell}
          alert={metrics && metrics.current.activeAlerts > 0}
        />
      </div>
      
      {/* Alertes actives */}
      {metrics && metrics.alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-orange-500" />
              Alertes Actives ({metrics.alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {metrics.alerts.map(alert => (
                <Alert key={alert.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <SeverityBadge severity={alert.severity} />
                    <div>
                      <div className="font-semibold">{alert.name}</div>
                      <div className="text-sm text-muted-foreground">{alert.message}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Déclenchée à {new Date(alert.triggeredAt).toLocaleTimeString('fr-FR')}
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => acknowledgeAlert(alert.id)}
                  >
                    Reconnaître
                  </Button>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Tabs pour différentes vues */}
      <Tabs defaultValue="errors" className="space-y-4">
        <TabsList>
          <TabsTrigger value="errors">Erreurs</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="system">Système</TabsTrigger>
          <TabsTrigger value="business">Business</TabsTrigger>
          <TabsTrigger value="debug">Debug</TabsTrigger>
        </TabsList>
        
        {/* Tab Erreurs */}
        <TabsContent value="errors" className="space-y-4">
          {/* Graphique des erreurs */}
          <Card>
            <CardHeader>
              <CardTitle>Évolution des erreurs</CardTitle>
              <CardDescription>Nombre d'erreurs et taux d'erreur au fil du temps</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={errorChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="errors" 
                    stroke="#ef4444" 
                    name="Erreurs"
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="errorRate" 
                    stroke="#f97316" 
                    name="Taux d'erreur (%)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          
          <div className="grid gap-4 md:grid-cols-2">
            {/* Distribution des erreurs */}
            <Card>
              <CardHeader>
                <CardTitle>Distribution par catégorie</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={categoryPieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={entry => `${entry.name}: ${entry.value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {categoryPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            {/* Top erreurs */}
            <Card>
              <CardHeader>
                <CardTitle>Top 5 erreurs</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[250px]">
                  <div className="space-y-2">
                    {metrics?.errors.topErrors.slice(0, 5).map((error, i) => (
                      <div key={error.fingerprint} className="border rounded p-2">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline">{error.category}</Badge>
                          <span className="text-sm font-semibold">{error.count}x</span>
                        </div>
                        <p className="text-sm mt-1 truncate">{error.message}</p>
                        <p className="text-xs text-muted-foreground">
                          Dernière vue: {new Date(error.lastSeen).toLocaleTimeString('fr-FR')}
                        </p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
          
          {/* Erreurs récentes */}
          <Card>
            <CardHeader>
              <CardTitle>Erreurs récentes</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {metrics?.errors.recentErrors.map(error => (
                    <div key={error.id} className="border rounded p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <SeverityBadge severity={error.level} />
                        <Badge variant="outline">{error.category}</Badge>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {new Date(error.timestamp).toLocaleString('fr-FR')}
                        </span>
                      </div>
                      <p className="text-sm">{error.message}</p>
                      {error.context?.endpoint && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {error.context.method} {error.context.endpoint}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Tab Performance */}
        <TabsContent value="performance" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <MetricCard
              title="Temps de réponse P50"
              value={metrics?.performance.responseTime.p50}
              unit="ms"
              icon={Clock}
            />
            <MetricCard
              title="Temps de réponse P95"
              value={metrics?.performance.responseTime.p95}
              unit="ms"
              icon={Clock}
            />
            <MetricCard
              title="Temps de réponse P99"
              value={metrics?.performance.responseTime.p99}
              unit="ms"
              icon={Clock}
            />
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Distribution des temps de réponse</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span>Min</span>
                  <span className="font-mono">{metrics?.performance.responseTime.min} ms</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Moyenne</span>
                  <span className="font-mono">{metrics?.performance.responseTime.mean.toFixed(0)} ms</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Max</span>
                  <span className="font-mono">{metrics?.performance.responseTime.max} ms</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Throughput</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span>Requêtes par seconde</span>
                  <span className="font-mono">{metrics?.performance.throughput.requestsPerSecond.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Requêtes par minute</span>
                  <span className="font-mono">{metrics?.performance.throughput.requestsPerMinute}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Total requêtes</span>
                  <span className="font-mono">{metrics?.performance.throughput.totalRequests}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Tab Système */}
        <TabsContent value="system" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Uptime"
              value={metrics?.system.uptime ? formatUptime(metrics.system.uptime) : '—'}
              icon={Server}
            />
            <MetricCard
              title="CPU Usage"
              value={metrics?.system.cpuUsage.toFixed(1)}
              unit="%"
              icon={Zap}
            />
            <MetricCard
              title="Mémoire"
              value={metrics?.system.memoryUsage.percentage.toFixed(1)}
              unit="%"
              icon={Database}
              alert={metrics && metrics.system.memoryUsage.percentage > 85}
            />
            <MetricCard
              title="Circuit Breakers"
              value={`${metrics?.system.circuitBreakers.open}/${metrics?.system.circuitBreakers.total}`}
              icon={metrics?.system.circuitBreakers.open > 0 ? WifiOff : Wifi}
              alert={metrics && metrics.system.circuitBreakers.open > 0}
            />
          </div>
          
          {/* État des services */}
          <Card>
            <CardHeader>
              <CardTitle>État des services</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    Base de données
                  </span>
                  <StatusBadge status={health?.checks.database.status as any || 'degraded'} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Services IA
                  </span>
                  <StatusBadge status={health?.checks.aiServices.status as any || 'degraded'} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Circuit Breakers
                  </span>
                  <span className="text-sm">
                    {health?.checks.circuitBreakers.open} ouverts sur {health?.checks.circuitBreakers.total}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Rate limiting */}
          {metrics && metrics.system.rateLimiting.totalHits > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Rate Limiting</CardTitle>
                <CardDescription>
                  {metrics.system.rateLimiting.totalHits} requêtes bloquées
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {metrics.system.rateLimiting.topLimitedEndpoints.map(endpoint => (
                    <div key={endpoint.endpoint} className="flex items-center justify-between">
                      <span className="text-sm font-mono">{endpoint.endpoint}</span>
                      <Badge variant="outline">{endpoint.hits} hits</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        {/* Tab Business */}
        <TabsContent value="business" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <MetricCard
              title="Utilisateurs actifs"
              value={metrics?.business.users.activeUsers}
              icon={Users}
            />
            <MetricCard
              title="Projets créés"
              value={metrics?.business.projects.projectsCreated}
              icon={Activity}
            />
            <MetricCard
              title="Devis générés"
              value={metrics?.business.quotes.quotesGenerated}
              icon={Activity}
            />
          </div>
        </TabsContent>
        
        {/* Tab Debug */}
        <TabsContent value="debug" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Outils de debug</CardTitle>
              <CardDescription>
                Actions pour tester le système de monitoring
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-2">Générer des erreurs de test</h4>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => generateTestError('warning')}
                  >
                    Warning
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => generateTestError('error')}
                  >
                    Error
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => generateTestError('critical')}
                  >
                    Critical
                  </Button>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium mb-2">Test des notifications</h4>
                <Button
                  size="sm"
                  onClick={testNotifications}
                >
                  Tester toutes les notifications
                </Button>
              </div>
            </CardContent>
          </Card>
          
          {/* Données brutes */}
          <Card>
            <CardHeader>
              <CardTitle>Données brutes (JSON)</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <pre className="text-xs">
                  {JSON.stringify({ health, metrics }, null, 2)}
                </pre>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}