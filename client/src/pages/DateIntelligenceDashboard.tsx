import { useDateAlertsContext } from '@/components/alerts/DateAlertsProvider';
import { useProjectTimelines } from '@/hooks/use-project-timelines';
import { usePerformanceMetrics } from '@/hooks/use-performance-metrics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Calendar, 
  AlertTriangle, 
  Target, 
  TrendingUp, 
  Clock, 
  CheckCircle2,
  XCircle,
  Play,
  BarChart3,
  Users,
  RefreshCw
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'wouter';

// Composant pour les métriques principales
function DateIntelligenceMetrics() {
  const { dashboardData, summaryData, criticalCount, warningCount, actionRequiredCount } = useDateAlertsContext();
  const { dashboardStats, isLoading: metricsLoading } = usePerformanceMetrics();
  const { stats: timelineStats, isLoading: timelinesLoading } = useProjectTimelines();

  if (metricsLoading || timelinesLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-20 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const totalProjects = timelineStats?.active || dashboardStats?.totalProjects || 0;
  const criticalDeadlines = criticalCount || 0;
  const delayRisks = warningCount || 0;
  const optimizationOpportunities = dashboardStats?.optimizationStats?.totalGainDays || 0;
  const averageDelayDays = dashboardStats?.averageDelayDays || 0;

  const metrics = [
    {
      title: "Projets Actifs",
      value: totalProjects,
      icon: Target,
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-900/20",
      description: `${timelineStats?.onTime || 0} à temps`,
    },
    {
      title: "Échéances Critiques",
      value: criticalDeadlines,
      icon: AlertTriangle,
      color: criticalDeadlines > 0 ? "text-red-600" : "text-green-600",
      bgColor: criticalDeadlines > 0 ? "bg-red-50 dark:bg-red-900/20" : "bg-green-50 dark:bg-green-900/20",
      description: "Dans les 7 jours",
      urgent: criticalDeadlines > 0,
    },
    {
      title: "Risques de Retard",
      value: delayRisks,
      icon: Clock,
      color: delayRisks > 0 ? "text-orange-600" : "text-green-600",
      bgColor: delayRisks > 0 ? "bg-orange-50 dark:bg-orange-900/20" : "bg-green-50 dark:bg-green-900/20",
      description: "Surveillance active",
    },
    {
      title: "Optimisations",
      value: `${Math.round(optimizationOpportunities)}j`,
      icon: TrendingUp,
      color: "text-green-600",
      bgColor: "bg-green-50 dark:bg-green-900/20",
      description: "Gain potentiel",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric) => (
        <Card key={metric.title} className={`transition-all duration-200 hover:shadow-md ${metric.urgent ? 'ring-2 ring-red-200 dark:ring-red-800' : ''}`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{metric.title}</p>
                <p className="text-2xl font-bold">{metric.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{metric.description}</p>
              </div>
              <div className={`p-3 rounded-full ${metric.bgColor}`}>
                <metric.icon className={`h-6 w-6 ${metric.color}`} />
              </div>
            </div>
            {metric.urgent && (
              <Alert className="mt-4 border-red-200 bg-red-50 dark:bg-red-900/20">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  Action immédiate requise
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Composant pour les alertes prioritaires
function PriorityAlertsPanel() {
  const { alerts, acknowledgeAlert, escalateAlert } = useDateAlertsContext();

  // Filtrer les alertes les plus importantes (critiques + récentes)
  const priorityAlerts = alerts
    .filter(alert => alert.severity === 'critical' || alert.status === 'pending')
    .sort((a, b) => {
      // Trier par severité puis par date
      if (a.severity !== b.severity) {
        const severityOrder = { critical: 3, high: 2, warning: 1, info: 0 };
        return (severityOrder[b.severity as keyof typeof severityOrder] || 0) - (severityOrder[a.severity as keyof typeof severityOrder] || 0);
      }
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    })
    .slice(0, 5); // Top 5 alertes

  const getSeverityBadge = (severity: string) => {
    const variants = {
      critical: { variant: "destructive" as const, icon: XCircle },
      high: { variant: "destructive" as const, icon: AlertTriangle },
      warning: { variant: "secondary" as const, icon: AlertTriangle },
      info: { variant: "outline" as const, icon: CheckCircle2 },
    };
    const config = variants[severity as keyof typeof variants] || variants.info;
    return { ...config };
  };

  if (priorityAlerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Alertes Prioritaires
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-600" />
            <p className="text-lg font-medium">Aucune alerte critique</p>
            <p className="text-sm">Tous les projets sont en bonne voie</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            Alertes Prioritaires
            <Badge variant="secondary" className="ml-2">
              {priorityAlerts.length}
            </Badge>
          </CardTitle>
          <Link to="/date-intelligence/alerts">
            <Button variant="outline" size="sm" data-testid="link-view-all-alerts">
              Voir toutes
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {priorityAlerts.map((alert) => {
          const { variant, icon: SeverityIcon } = getSeverityBadge(alert.severity);
          
          return (
            <div key={alert.id} className="flex items-start justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
              <div className="flex items-start gap-3 flex-1">
                <SeverityIcon className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={variant} className="text-xs">
                      {alert.severity.toUpperCase()}
                    </Badge>
                    {alert.phase && (
                      <Badge variant="outline" className="text-xs">
                        {alert.phase}
                      </Badge>
                    )}
                  </div>
                  <p className="font-medium text-sm truncate">{alert.title}</p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {alert.message}
                  </p>
                  {alert.targetDate && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Échéance: {new Date(alert.targetDate).toLocaleDateString('fr-FR')}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => acknowledgeAlert(alert.id)}
                  data-testid={`button-ack-alert-${alert.id}`}
                >
                  Acquitter
                </Button>
                {alert.severity === 'critical' && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => escalateAlert(alert.id, 'director', 'Escalade automatique - alerte critique')}
                    data-testid={`button-escalate-alert-${alert.id}`}
                  >
                    Escalader
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

// Composant pour les actions rapides
function QuickActionsPanel() {
  const { triggerDetection } = useDateAlertsContext();
  const { refreshTimelines } = useProjectTimelines();
  const [isDetecting, setIsDetecting] = useState(false);

  const handleTriggerDetection = async (type: 'full' | 'delays' | 'conflicts' | 'deadlines') => {
    setIsDetecting(true);
    try {
      await triggerDetection(type);
    } finally {
      setIsDetecting(false);
    }
  };

  const actions = [
    {
      title: "Détection Complète",
      description: "Analyser tous les risques et opportunités",
      icon: BarChart3,
      action: () => handleTriggerDetection('full'),
      variant: "default" as const,
      testId: "button-detection-full"
    },
    {
      title: "Vérifier Échéances",
      description: "Scanner les échéances critiques",
      icon: Calendar,
      action: () => handleTriggerDetection('deadlines'),
      variant: "outline" as const,
      testId: "button-detection-deadlines"
    },
    {
      title: "Actualiser Planning",
      description: "Recharger les timelines",
      icon: RefreshCw,
      action: refreshTimelines,
      variant: "outline" as const,
      testId: "button-refresh-timelines"
    },
    {
      title: "Conflits Ressources",
      description: "Détecter les conflits inter-projets",
      icon: Users,
      action: () => handleTriggerDetection('conflicts'),
      variant: "outline" as const,
      testId: "button-detection-conflicts"
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Play className="h-5 w-5" />
          Actions Rapides
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {actions.map((action) => (
            <Button
              key={action.title}
              variant={action.variant}
              className="h-auto p-4 flex flex-col items-center text-center"
              onClick={() => action.action()}
              disabled={isDetecting}
              data-testid={action.testId}
            >
              <action.icon className="h-6 w-6 mb-2" />
              <div>
                <div className="font-medium text-sm">{action.title}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {action.description}
                </div>
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Composant principal du dashboard
export default function DateIntelligenceDashboard() {
  const { loading: alertsLoading } = useDateAlertsContext();
  
  if (alertsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* En-tête */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Intelligence Temporelle</h1>
          <p className="text-muted-foreground">
            Dashboard de gestion des échéances et optimisation des délais
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="text-sm">
            Dernière MAJ: {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </Badge>
        </div>
      </div>

      <Separator />

      {/* Métriques principales */}
      <section>
        <DateIntelligenceMetrics />
      </section>

      {/* Alertes prioritaires */}
      <section>
        <PriorityAlertsPanel />
      </section>

      {/* Actions rapides */}
      <section>
        <QuickActionsPanel />
      </section>

      {/* Navigation vers autres sections */}
      <section>
        <Card>
          <CardHeader>
            <CardTitle>Accès Rapides</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Link to="/date-intelligence/gantt">
                <Button variant="outline" className="w-full h-20 flex flex-col" data-testid="link-gantt">
                  <BarChart3 className="h-6 w-6 mb-2" />
                  Planning Gantt
                </Button>
              </Link>
              <Link to="/date-intelligence/alerts">
                <Button variant="outline" className="w-full h-20 flex flex-col" data-testid="link-alerts">
                  <AlertTriangle className="h-6 w-6 mb-2" />
                  Gestion Alertes
                </Button>
              </Link>
              <Link to="/date-intelligence/rules">
                <Button variant="outline" className="w-full h-20 flex flex-col" data-testid="link-rules">
                  <Target className="h-6 w-6 mb-2" />
                  Règles Métier
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}