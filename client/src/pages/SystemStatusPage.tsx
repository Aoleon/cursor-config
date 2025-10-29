import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, XCircle, AlertCircle, Activity, Database, Zap, TrendingUp, Clock } from "lucide-react";

interface HealthResponse {
  status: string;
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  database: {
    status: string;
    poolSize: number;
    activeConnections: number;
    idleConnections: number;
  };
  externalServices: {
    monday: string;
    openai: string;
    sendgrid: string;
  };
  circuitBreakers: {
    monday: { state: string; failures: number };
    openai: { state: string; failures: number };
    sendgrid: { state: string; failures: number };
  };
  cache: {
    type: string;
    size: number;
    hitRate?: number;
  };
  analytics: {
    kpiQueryPerformance: {
      queryCount: number;
      avgLatencyMs: number;
      p50LatencyMs: number;
      p95LatencyMs: number;
      p99LatencyMs: number;
      minLatencyMs: number;
      maxLatencyMs: number;
      avgImprovement: number;
      lastQueryMs: number | null;
      lastQueryAt: string | null;
      baselineComparisonMs: number;
      status: string;
      improvement: string;
    };
  };
}

const StatusBadge = ({ status }: { status: string }) => {
  const variants: Record<string, { icon: any; variant: any; label: string }> = {
    healthy: { icon: CheckCircle2, variant: "default", label: "Opérationnel" },
    degraded: { icon: AlertCircle, variant: "warning", label: "Dégradé" },
    unhealthy: { icon: XCircle, variant: "destructive", label: "Hors ligne" },
    not_configured: { icon: AlertCircle, variant: "secondary", label: "Non configuré" },
    closed: { icon: CheckCircle2, variant: "default", label: "Fermé" },
    open: { icon: XCircle, variant: "destructive", label: "Ouvert" },
    half_open: { icon: AlertCircle, variant: "warning", label: "Semi-ouvert" },
  };

  const config = variants[status] || variants.unhealthy;
  const Icon = config.icon;

  return (
    <Badge variant={config.variant as any} className="gap-1" data-testid={`badge-status-${status}`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
};

const PerformanceBadge = ({ status }: { status: string }) => {
  const variants: Record<string, { variant: any; label: string }> = {
    excellent: { variant: "default", label: "Excellent" },
    good: { variant: "default", label: "Bon" },
    acceptable: { variant: "warning", label: "Acceptable" },
    degraded: { variant: "destructive", label: "Dégradé" },
    no_data: { variant: "secondary", label: "Pas de données" },
  };

  const config = variants[status] || variants.no_data;

  return (
    <Badge variant={config.variant as any} data-testid={`badge-performance-${status}`}>
      {config.label}
    </Badge>
  );
};

const ImprovementBadge = ({ improvement }: { improvement: string }) => {
  const variants: Record<string, { variant: any; label: string }> = {
    target_met: { variant: "default", label: "🎯 Objectif atteint" },
    approaching_target: { variant: "warning", label: "⚡ En approche" },
    below_target: { variant: "secondary", label: "📊 Sous l'objectif" },
  };

  const config = variants[improvement] || variants.below_target;

  return (
    <Badge variant={config.variant as any} data-testid={`badge-improvement-${improvement}`}>
      {config.label}
    </Badge>
  );
};

export default function SystemStatusPage() {
  const { data: health, isLoading, error } = useQuery<HealthResponse>({
    queryKey: ["/api/health"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-6" data-testid="container-loading">
        <div className="flex items-center justify-center min-h-[400px]">
          <Activity className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6" data-testid="container-error">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" />
              Erreur de connexion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Impossible de récupérer l'état du système. Veuillez réessayer.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}j ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const formatLatency = (ms: number) => {
    if (ms === 0) return "N/A";
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="page-system-status">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight" data-testid="heading-status">
          État du Système
        </h1>
        <p className="text-muted-foreground" data-testid="text-description">
          Monitoring temps-réel de Saxium - Dernière mise à jour: {health && new Date(health.timestamp).toLocaleString('fr-FR')}
        </p>
      </div>

      {/* Global Status */}
      <Card data-testid="card-global-status">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Statut Global
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">État</p>
              <div data-testid="status-global">
                <StatusBadge status={health?.status || "unhealthy"} />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Uptime</p>
              <p className="text-lg font-semibold" data-testid="text-uptime">
                {health && formatUptime(health.uptime)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Version</p>
              <p className="text-lg font-semibold" data-testid="text-version">{health?.version}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Environnement</p>
              <Badge variant="outline" data-testid="badge-environment">{health?.environment}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Database Status */}
      <Card data-testid="card-database">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Base de Données
          </CardTitle>
          <CardDescription>PostgreSQL (Neon)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">État</p>
              <div data-testid="status-database">
                <StatusBadge status={health?.database.status || "unhealthy"} />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Pool Size</p>
              <p className="text-lg font-semibold" data-testid="text-pool-size">{health?.database.poolSize}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Connexions Actives</p>
              <p className="text-lg font-semibold" data-testid="text-active-connections">{health?.database.activeConnections}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Connexions Idle</p>
              <p className="text-lg font-semibold" data-testid="text-idle-connections">{health?.database.idleConnections}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* External Services */}
      <Card data-testid="card-external-services">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Services Externes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Monday.com</p>
              <div data-testid="status-monday">
                <StatusBadge status={health?.externalServices.monday || "unhealthy"} />
              </div>
              {health?.circuitBreakers.monday && (
                <div className="text-xs text-muted-foreground">
                  Circuit: <StatusBadge status={health.circuitBreakers.monday.state} />
                  {health.circuitBreakers.monday.failures > 0 && (
                    <span className="ml-2">({health.circuitBreakers.monday.failures} échecs)</span>
                  )}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">OpenAI</p>
              <div data-testid="status-openai">
                <StatusBadge status={health?.externalServices.openai || "unhealthy"} />
              </div>
              {health?.circuitBreakers.openai && (
                <div className="text-xs text-muted-foreground">
                  Circuit: <StatusBadge status={health.circuitBreakers.openai.state} />
                  {health.circuitBreakers.openai.failures > 0 && (
                    <span className="ml-2">({health.circuitBreakers.openai.failures} échecs)</span>
                  )}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">SendGrid</p>
              <div data-testid="status-sendgrid">
                <StatusBadge status={health?.externalServices.sendgrid || "unhealthy"} />
              </div>
              {health?.circuitBreakers.sendgrid && (
                <div className="text-xs text-muted-foreground">
                  Circuit: <StatusBadge status={health.circuitBreakers.sendgrid.state} />
                  {health.circuitBreakers.sendgrid.failures > 0 && (
                    <span className="ml-2">({health.circuitBreakers.sendgrid.failures} échecs)</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cache Status */}
      <Card data-testid="card-cache">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Cache
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Type</p>
              <p className="text-lg font-semibold" data-testid="text-cache-type">{health?.cache.type}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Taille</p>
              <p className="text-lg font-semibold" data-testid="text-cache-size">{health?.cache.size} entrées</p>
            </div>
            {health?.cache.hitRate !== undefined && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Taux de succès</p>
                <p className="text-lg font-semibold" data-testid="text-cache-hit-rate">{(health.cache.hitRate * 100).toFixed(1)}%</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* KPI Performance Metrics */}
      {health?.analytics?.kpiQueryPerformance && (
        <Card data-testid="card-kpi-performance">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Performance Analytics KPI
            </CardTitle>
            <CardDescription>
              Optimisation N+1 queries : 132 queries → 1 query (baseline: {health.analytics.kpiQueryPerformance.baselineComparisonMs}ms)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">État Performance</p>
                <div data-testid="status-kpi-performance">
                  <PerformanceBadge status={health.analytics.kpiQueryPerformance.status} />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Amélioration</p>
                <div data-testid="badge-kpi-improvement">
                  <ImprovementBadge improvement={health.analytics.kpiQueryPerformance.improvement} />
                </div>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Queries Total</p>
                <p className="text-2xl font-bold" data-testid="text-query-count">
                  {health.analytics.kpiQueryPerformance.queryCount}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Latence Moyenne</p>
                <p className="text-2xl font-bold" data-testid="text-avg-latency">
                  {formatLatency(health.analytics.kpiQueryPerformance.avgLatencyMs)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">P95 Latence</p>
                <p className="text-2xl font-bold" data-testid="text-p95-latency">
                  {formatLatency(health.analytics.kpiQueryPerformance.p95LatencyMs)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">P99 Latence</p>
                <p className="text-2xl font-bold" data-testid="text-p99-latency">
                  {formatLatency(health.analytics.kpiQueryPerformance.p99LatencyMs)}
                </p>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">P50 (Médiane)</p>
                <p className="text-lg font-semibold" data-testid="text-p50-latency">
                  {formatLatency(health.analytics.kpiQueryPerformance.p50LatencyMs)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Min</p>
                <p className="text-lg font-semibold" data-testid="text-min-latency">
                  {formatLatency(health.analytics.kpiQueryPerformance.minLatencyMs)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Max</p>
                <p className="text-lg font-semibold" data-testid="text-max-latency">
                  {formatLatency(health.analytics.kpiQueryPerformance.maxLatencyMs)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Amélioration Moy.</p>
                <p className="text-lg font-semibold text-green-600 dark:text-green-400" data-testid="text-avg-improvement">
                  {health.analytics.kpiQueryPerformance.avgImprovement > 0 
                    ? `+${health.analytics.kpiQueryPerformance.avgImprovement.toFixed(1)}%`
                    : "N/A"}
                </p>
              </div>
            </div>

            {health.analytics.kpiQueryPerformance.lastQueryAt && (
              <>
                <Separator />
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span data-testid="text-last-query">
                    Dernière query: {formatLatency(health.analytics.kpiQueryPerformance.lastQueryMs!)} 
                    {' '} à {new Date(health.analytics.kpiQueryPerformance.lastQueryAt).toLocaleString('fr-FR')}
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* API Endpoints Reference */}
      <Card data-testid="card-api-endpoints">
        <CardHeader>
          <CardTitle>Endpoints API Disponibles</CardTitle>
          <CardDescription>Endpoints de monitoring et test pour développement</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Health & Monitoring</h3>
            <div className="space-y-1 text-sm font-mono">
              <p className="text-muted-foreground" data-testid="text-endpoint-health">GET /api/health</p>
              <p className="text-muted-foreground" data-testid="text-endpoint-debug-auth">GET /api/debug-auth-state</p>
            </div>
          </div>
          
          <Separator />
          
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">E2E Test Seeding</h3>
            <div className="space-y-1 text-sm font-mono">
              <p className="text-muted-foreground" data-testid="text-endpoint-seed-ao">POST /api/test/seed/ao</p>
              <p className="text-muted-foreground" data-testid="text-endpoint-seed-offer">POST /api/test/seed/offer</p>
              <p className="text-muted-foreground" data-testid="text-endpoint-seed-project">POST /api/test/seed/project</p>
              <p className="text-muted-foreground" data-testid="text-endpoint-delete-ao">DELETE /api/test/seed/ao/:id</p>
              <p className="text-muted-foreground" data-testid="text-endpoint-delete-offer">DELETE /api/test/seed/offer/:id</p>
              <p className="text-muted-foreground" data-testid="text-endpoint-delete-project">DELETE /api/test/seed/project/:id</p>
              <p className="text-muted-foreground" data-testid="text-endpoint-planning">POST /api/test-data/planning</p>
            </div>
          </div>
          
          <Separator />
          
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Business Metrics</h3>
            <div className="space-y-1 text-sm font-mono">
              <p className="text-muted-foreground" data-testid="text-endpoint-metrics-list">GET /api/metrics-business</p>
              <p className="text-muted-foreground" data-testid="text-endpoint-metrics-create">POST /api/metrics-business</p>
              <p className="text-muted-foreground" data-testid="text-endpoint-metrics-get">GET /api/metrics-business/:id</p>
              <p className="text-muted-foreground" data-testid="text-endpoint-metrics-update">PUT /api/metrics-business/:id</p>
              <p className="text-muted-foreground" data-testid="text-endpoint-metrics-delete">DELETE /api/metrics-business/:id</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
