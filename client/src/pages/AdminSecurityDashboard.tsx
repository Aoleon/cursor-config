import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Area, AreaChart 
} from "recharts";
import { 
  Shield, AlertTriangle, Activity, Users, Database, MessageSquare, 
  TrendingUp, TrendingDown, Eye, EyeOff, Download, RefreshCw,
  CheckCircle, XCircle, AlertCircle, Clock, User, FileText
} from "lucide-react";
import { format, parseISO, subHours, subDays } from "date-fns";
import { fr } from "date-fns/locale";

// ========================================
// TYPES ET INTERFACES
// ========================================

interface SecurityMetrics {
  totalEvents: number;
  securityViolations: number;
  rbacViolations: number;
  suspiciousQueries: number;
  performanceIssues: number;
  errorRate: number;
  avgResponseTime: number;
  activeUsers: number;
  alertsGenerated: number;
}

interface ChatbotAnalytics {
  totalQueries: number;
  successRate: number;
  avgResponseTime: number;
  topQueries: Array<{ query: string; count: number; avgTime: number }>;
  errorsByType: Record<string, number>;
  feedbackStats: {
    totalFeedback: number;
    avgRating: number;
    satisfactionRate: number;
  };
  usageByRole: Record<string, number>;
}

interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userRole: string;
  eventType: string;
  resource?: string;
  action?: string;
  result: 'success' | 'error' | 'blocked' | 'timeout' | 'partial';
  severity: 'low' | 'medium' | 'high' | 'critical';
  ipAddress?: string;
  executionTimeMs?: number;
  tags?: string[];
  isArchived: boolean;
}

interface SecurityAlert {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'acknowledged' | 'investigating' | 'resolved' | 'false_positive' | 'suppressed';
  title: string;
  description: string;
  recommendation?: string;
  userId?: string;
  createdAt: string;
  resolvedAt?: string;
  assignedToUserId?: string;
  confidence?: number;
}

interface AdminOverviewData {
  timeRange: '1h' | '24h' | '7d' | '30d';
  security: SecurityMetrics;
  chatbot: ChatbotAnalytics;
  users: {
    totalUsers: number;
    newSessions: number;
  };
  alerts: {
    byStatus: Record<string, number>;
  };
  system: {
    uptime: number;
    timestamp: string;
    executionTimeMs: number;
  };
}

// ========================================
// COMPOSANTS UI RÉUTILISABLES
// ========================================

const MetricCard = ({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  trend = "neutral" as "up" | "down" | "neutral",
  subtitle,
  color = "default" as "default" | "success" | "warning" | "danger"
}: {
  title: string;
  value: string | number;
  change?: string;
  icon: any;
  trend?: "up" | "down" | "neutral";
  subtitle?: string;
  color?: "default" | "success" | "warning" | "danger";
}) => (
  <Card className={`${color === 'danger' ? 'border-red-200 dark:border-red-800' : 
                   color === 'warning' ? 'border-yellow-200 dark:border-yellow-800' :
                   color === 'success' ? 'border-green-200 dark:border-green-800' : ''}`}>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className={`h-4 w-4 ${
        color === 'danger' ? 'text-red-600' :
        color === 'warning' ? 'text-yellow-600' :
        color === 'success' ? 'text-green-600' :
        'text-muted-foreground'
      }`} />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      {change && (
        <div className="flex items-center text-xs mt-1">
          {trend === "up" && <TrendingUp className="h-3 w-3 text-green-600 mr-1" />}
          {trend === "down" && <TrendingDown className="h-3 w-3 text-red-600 mr-1" />}
          <span className={trend === "up" ? "text-green-600" : trend === "down" ? "text-red-600" : "text-muted-foreground"}>
            {change}
          </span>
        </div>
      )}
    </CardContent>
  </Card>
);

const SeverityBadge = ({ severity }: { severity: string }) => {
  const variants = {
    low: { className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300", label: "Faible" },
    medium: { className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300", label: "Moyen" },
    high: { className: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300", label: "Élevé" },
    critical: { className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300", label: "Critique" }
  };
  
  const variant = variants[severity as keyof typeof variants] || variants.low;
  
  return (
    <Badge className={variant.className} variant="outline">
      {variant.label}
    </Badge>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  const variants = {
    open: { className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300", label: "Ouvert" },
    acknowledged: { className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300", label: "Accusé" },
    investigating: { className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300", label: "Investigation" },
    resolved: { className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300", label: "Résolu" },
    false_positive: { className: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300", label: "Faux Positif" },
    suppressed: { className: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300", label: "Supprimé" }
  };
  
  const variant = variants[status as keyof typeof variants] || variants.open;
  
  return (
    <Badge className={variant.className} variant="outline">
      {variant.label}
    </Badge>
  );
};

// ========================================
// COMPOSANT PRINCIPAL DASHBOARD ADMIN
// ========================================

export default function AdminSecurityDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // États locaux
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [auditFilters, setAuditFilters] = useState({
    eventType: '',
    severity: '',
    result: '',
    userId: '',
    limit: 50,
    offset: 0
  });
  const [alertFilters, setAlertFilters] = useState({
    type: '',
    severity: '',
    status: '',
    limit: 50,
    offset: 0
  });

  // ========================================
  // REQUÊTES API
  // ========================================

  // Métriques overview
  const { data: overview, isLoading: overviewLoading, error: overviewError } = useQuery({
    queryKey: ['/api/admin/metrics/overview', timeRange],
    queryFn: async () => {
      const response = await fetch(`/api/admin/metrics/overview?timeRange=${timeRange}&includeBreakdown=true`);
      if (!response.ok) throw new Error('Erreur lors du chargement des métriques');
      const result = await response.json();
      return result.data as AdminOverviewData;
    },
    refetchInterval: autoRefresh ? 30000 : false, // Refresh toutes les 30s si activé
  });

  // Logs d'audit
  const { data: auditLogs, isLoading: auditLoading } = useQuery({
    queryKey: ['/api/admin/audit/logs', auditFilters],
    queryFn: async () => {
      const params = new URLSearchParams({
        ...auditFilters,
        limit: auditFilters.limit.toString(),
        offset: auditFilters.offset.toString()
      });
      Object.keys(params).forEach(key => {
        if (!params.get(key)) params.delete(key);
      });
      
      const response = await fetch(`/api/admin/audit/logs?${params}`);
      if (!response.ok) throw new Error('Erreur lors du chargement des logs');
      const result = await response.json();
      return result.data;
    },
  });

  // Alertes de sécurité
  const { data: securityAlerts, isLoading: alertsLoading } = useQuery({
    queryKey: ['/api/admin/security/alerts', alertFilters],
    queryFn: async () => {
      const params = new URLSearchParams({
        ...alertFilters,
        limit: alertFilters.limit.toString(),
        offset: alertFilters.offset.toString()
      });
      Object.keys(params).forEach(key => {
        if (!params.get(key)) params.delete(key);
      });
      
      const response = await fetch(`/api/admin/security/alerts?${params}`);
      if (!response.ok) throw new Error('Erreur lors du chargement des alertes');
      const result = await response.json();
      return result.data;
    },
    refetchInterval: autoRefresh ? 15000 : false, // Refresh toutes les 15s pour les alertes
  });

  // Analytics chatbot détaillées
  const { data: chatbotAnalytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['/api/admin/chatbot/analytics', timeRange],
    queryFn: async () => {
      const response = await fetch(`/api/admin/chatbot/analytics?timeRange=${timeRange}&includeErrorAnalysis=true&includeFeedbackTrends=true&includeUsagePatterns=true`);
      if (!response.ok) throw new Error('Erreur lors du chargement des analytics chatbot');
      const result = await response.json();
      return result.data;
    },
  });

  // ========================================
  // MUTATIONS
  // ========================================

  // Résoudre une alerte
  const resolveAlertMutation = useMutation({
    mutationFn: async ({ alertId, resolutionNote, resolutionAction }: { 
      alertId: string; 
      resolutionNote?: string; 
      resolutionAction?: string; 
    }) => {
      const response = await fetch('/api/admin/security/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId, resolutionNote, resolutionAction, markAsResolved: true })
      });
      if (!response.ok) throw new Error('Erreur lors de la résolution');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/security/alerts'] });
      toast({ title: "✅ Alerte résolue", description: "L'alerte a été marquée comme résolue" });
    },
    onError: (error) => {
      toast({ 
        title: "❌ Erreur", 
        description: `Impossible de résoudre l'alerte: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  // Export de données
  const exportDataMutation = useMutation({
    mutationFn: async ({ type, format, filters }: { 
      type: 'audit_logs' | 'security_alerts'; 
      format: 'csv' | 'json'; 
      filters?: any; 
    }) => {
      const response = await fetch('/api/admin/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, format, filters })
      });
      if (!response.ok) throw new Error('Erreur lors de l\'export');
      
      // Télécharger le fichier
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}_${format}_${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      return { success: true };
    },
    onSuccess: () => {
      toast({ title: "📥 Export réussi", description: "Le fichier a été téléchargé" });
    },
    onError: (error) => {
      toast({ 
        title: "❌ Erreur d'export", 
        description: `Impossible d'exporter: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  // ========================================
  // HANDLERS D'ÉVÉNEMENTS
  // ========================================

  const handleResolveAlert = (alertId: string) => {
    resolveAlertMutation.mutate({ 
      alertId, 
      resolutionAction: 'manual_resolution',
      resolutionNote: 'Résolu via dashboard admin'
    });
  };

  const handleExportAuditLogs = () => {
    exportDataMutation.mutate({ 
      type: 'audit_logs', 
      format: 'csv', 
      filters: auditFilters 
    });
  };

  const handleRefreshData = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/admin/'] });
    toast({ title: "🔄 Données actualisées", description: "Toutes les données ont été rafraîchies" });
  };

  // ========================================
  // PRÉPARATION DES DONNÉES POUR LES GRAPHIQUES
  // ========================================

  const prepareChartData = () => {
    if (!overview) return {};

    // Données pour le graphique des violations par type
    const violationsData = [
      { name: 'RBAC', value: overview?.security?.rbacViolations || 0, color: '#ef4444' },
      { name: 'SQL Suspectes', value: overview?.security?.suspiciousQueries || 0, color: '#f97316' },
      { name: 'Performance', value: overview?.security?.performanceIssues || 0, color: '#eab308' },
      { name: 'Autres', value: overview?.security?.securityViolations || 0, color: '#6b7280' }
    ];

    // Données d'usage par rôle
    const usageByRoleData = Object.entries(overview?.chatbot?.usageByRole || {}).map(([role, count]) => ({
      role,
      requests: count
    }));

    // Données de performance
    const performanceData = [
      { 
        metric: 'Temps Réponse Moyen', 
        value: overview?.security?.avgResponseTime || 0,
        target: 2000,
        unit: 'ms'
      },
      { 
        metric: 'Taux d\'Erreur', 
        value: overview?.security?.errorRate || 0,
        target: 5,
        unit: '%'
      },
      { 
        metric: 'Taux de Succès Chatbot', 
        value: overview?.chatbot?.successRate || 0,
        target: 95,
        unit: '%'
      }
    ];

    return { violationsData, usageByRoleData, performanceData };
  };

  const { violationsData, usageByRoleData, performanceData } = prepareChartData();

  // ========================================
  // RENDU CONDITIONNEL EN CAS D'ERREUR
  // ========================================

  if (overviewError) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Erreur de chargement</AlertTitle>
          <AlertDescription>
            Impossible de charger le dashboard admin. Vérifiez vos permissions.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // ========================================
  // RENDU PRINCIPAL
  // ========================================

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* En-tête avec contrôles */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-8 w-8 text-blue-600" />
            Dashboard Sécurité Admin
          </h1>
          <p className="text-muted-foreground mt-1">
            Supervision complète de la sécurité et monitoring du système Saxium
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Contrôle auto-refresh */}
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            data-testid="button-auto-refresh"
          >
            {autoRefresh ? <Eye className="h-4 w-4 mr-2" /> : <EyeOff className="h-4 w-4 mr-2" />}
            Auto-refresh
          </Button>

          {/* Sélecteur de période */}
          <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
            <SelectTrigger className="w-32" data-testid="select-time-range">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">1 heure</SelectItem>
              <SelectItem value="24h">24 heures</SelectItem>
              <SelectItem value="7d">7 jours</SelectItem>
              <SelectItem value="30d">30 jours</SelectItem>
            </SelectContent>
          </Select>

          {/* Bouton refresh manuel */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshData}
            disabled={overviewLoading}
            data-testid="button-refresh"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${overviewLoading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>

          {/* Bouton export */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportAuditLogs}
            disabled={exportDataMutation.isPending}
            data-testid="button-export-audit"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Métriques principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Événements Total"
          value={overview?.security.totalEvents || 0}
          icon={Activity}
          subtitle="Dernière période"
          data-testid="metric-total-events"
        />
        <MetricCard
          title="Violations Sécurité"
          value={overview?.security.securityViolations || 0}
          icon={AlertTriangle}
          color={(overview?.security?.securityViolations || 0) > 10 ? "danger" : "warning"}
          subtitle="Incidents détectés"
          data-testid="metric-security-violations"
        />
        <MetricCard
          title="Utilisateurs Actifs"
          value={overview?.security.activeUsers || 0}
          icon={Users}
          color="success"
          subtitle="Sessions actives"
          data-testid="metric-active-users"
        />
        <MetricCard
          title="Temps Réponse Moyen"
          value={`${Math.round(overview?.security.avgResponseTime || 0)}ms`}
          icon={Clock}
          color={(overview?.security?.avgResponseTime || 0) > 2000 ? "warning" : "success"}
          subtitle="Performance système"
          data-testid="metric-avg-response-time"
        />
      </div>

      {/* Contenu principal avec onglets */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" data-testid="tab-overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="security" data-testid="tab-security">Alertes Sécurité</TabsTrigger>
          <TabsTrigger value="audit" data-testid="tab-audit">Logs d'Audit</TabsTrigger>
          <TabsTrigger value="chatbot" data-testid="tab-chatbot">Analytics Chatbot</TabsTrigger>
          <TabsTrigger value="users" data-testid="tab-users">Activité Utilisateurs</TabsTrigger>
        </TabsList>

        {/* Onglet Vue d'ensemble */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Graphique violations par type */}
            <Card className="col-span-2">
              <CardHeader>
                <CardTitle>Répartition des Violations</CardTitle>
                <CardDescription>Types de violations détectées par le système</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={violationsData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {violationsData?.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Métriques système */}
            <Card>
              <CardHeader>
                <CardTitle>État du Système</CardTitle>
                <CardDescription>Indicateurs de santé en temps réel</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Uptime</span>
                    <span>{Math.round((overview?.system.uptime || 0) / 3600)}h</span>
                  </div>
                  <Progress value={100} className="h-2" />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Performance</span>
                    <span className={(overview?.security?.avgResponseTime || 0) > 2000 ? "text-red-600" : "text-green-600"}>
                      {(overview?.security?.avgResponseTime || 0) < 1000 ? "Excellente" : 
                       (overview?.security?.avgResponseTime || 0) < 2000 ? "Bonne" : "Dégradée"}
                    </span>
                  </div>
                  <Progress 
                    value={Math.max(0, 100 - (overview?.security.avgResponseTime || 0) / 50)} 
                    className="h-2" 
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Sécurité</span>
                    <span className={(overview?.security?.securityViolations || 0) > 5 ? "text-red-600" : "text-green-600"}>
                      {(overview?.security?.securityViolations || 0) === 0 ? "Aucune violation" :
                       (overview?.security?.securityViolations || 0) < 5 ? "Sous surveillance" : "Attention requise"}
                    </span>
                  </div>
                  <Progress 
                    value={Math.max(0, 100 - (overview?.security.securityViolations || 0) * 10)} 
                    className="h-2" 
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Usage par rôle */}
          <Card>
            <CardHeader>
              <CardTitle>Usage du Chatbot par Rôle</CardTitle>
              <CardDescription>Répartition des requêtes par type d'utilisateur</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={usageByRoleData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="role" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="requests" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Alertes Sécurité */}
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                Alertes de Sécurité Actives
              </CardTitle>
              <CardDescription>
                Incidents et violations détectés automatiquement
              </CardDescription>
            </CardHeader>
            <CardContent>
              {alertsLoading ? (
                <div className="flex justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin" />
                </div>
              ) : securityAlerts?.alerts?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-600" />
                  <p>Aucune alerte de sécurité active</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {securityAlerts?.alerts?.map((alert: SecurityAlert) => (
                    <div key={alert.id} className="border rounded-lg p-4 space-y-3" data-testid={`alert-${alert.id}`}>
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">{alert.title}</h4>
                            <SeverityBadge severity={alert.severity} />
                            <StatusBadge status={alert.status} />
                          </div>
                          <p className="text-sm text-muted-foreground">{alert.description}</p>
                          {alert.recommendation && (
                            <p className="text-xs text-blue-600 mt-2">💡 {alert.recommendation}</p>
                          )}
                        </div>
                        {alert.status === 'open' && (
                          <Button
                            size="sm"
                            onClick={() => handleResolveAlert(alert.id)}
                            disabled={resolveAlertMutation.isPending}
                            data-testid={`button-resolve-${alert.id}`}
                          >
                            Résoudre
                          </Button>
                        )}
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Type: {alert.type.replace(/_/g, ' ')}</span>
                        <span>Créée: {format(parseISO(alert.createdAt), 'dd/MM/yyyy HH:mm', { locale: fr })}</span>
                        {alert.userId && <span>Utilisateur: {alert.userId}</span>}
                        {alert.confidence && <span>Confiance: {Math.round(alert.confidence * 100)}%</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Logs d'Audit */}
        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Logs d'Audit du Système
              </CardTitle>
              <CardDescription>
                Historique complet des actions utilisateurs et événements système
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filtres */}
              <div className="grid gap-4 md:grid-cols-4 mb-6">
                <Select value={auditFilters.eventType} onValueChange={(value) => 
                  setAuditFilters(prev => ({ ...prev, eventType: value, offset: 0 }))
                }>
                  <SelectTrigger data-testid="filter-event-type">
                    <SelectValue placeholder="Type d'événement" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Tous les types</SelectItem>
                    <SelectItem value="login">Connexion</SelectItem>
                    <SelectItem value="chatbot.query">Requête Chatbot</SelectItem>
                    <SelectItem value="rbac.violation">Violation RBAC</SelectItem>
                    <SelectItem value="admin.action">Action Admin</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={auditFilters.severity} onValueChange={(value) => 
                  setAuditFilters(prev => ({ ...prev, severity: value, offset: 0 }))
                }>
                  <SelectTrigger data-testid="filter-severity">
                    <SelectValue placeholder="Sévérité" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Toutes sévérités</SelectItem>
                    <SelectItem value="low">Faible</SelectItem>
                    <SelectItem value="medium">Moyen</SelectItem>
                    <SelectItem value="high">Élevé</SelectItem>
                    <SelectItem value="critical">Critique</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={auditFilters.result} onValueChange={(value) => 
                  setAuditFilters(prev => ({ ...prev, result: value, offset: 0 }))
                }>
                  <SelectTrigger data-testid="filter-result">
                    <SelectValue placeholder="Résultat" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Tous résultats</SelectItem>
                    <SelectItem value="success">Succès</SelectItem>
                    <SelectItem value="error">Erreur</SelectItem>
                    <SelectItem value="blocked">Bloqué</SelectItem>
                  </SelectContent>
                </Select>

                <Input
                  placeholder="ID Utilisateur"
                  value={auditFilters.userId}
                  onChange={(e) => setAuditFilters(prev => ({ ...prev, userId: e.target.value, offset: 0 }))}
                  data-testid="filter-user-id"
                />
              </div>

              {/* Table des logs */}
              <ScrollArea className="h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Utilisateur</TableHead>
                      <TableHead>Événement</TableHead>
                      <TableHead>Ressource</TableHead>
                      <TableHead>Résultat</TableHead>
                      <TableHead>Sévérité</TableHead>
                      <TableHead>Temps (ms)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <RefreshCw className="h-6 w-6 animate-spin mx-auto" />
                        </TableCell>
                      </TableRow>
                    ) : auditLogs?.logs?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          Aucun log trouvé avec ces filtres
                        </TableCell>
                      </TableRow>
                    ) : (
                      auditLogs?.logs?.map((log: AuditLog) => (
                        <TableRow key={log.id} data-testid={`audit-log-${log.id}`}>
                          <TableCell className="font-mono text-xs">
                            {format(parseISO(log.timestamp), 'dd/MM HH:mm:ss', { locale: fr })}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-medium text-sm">{log.userId}</div>
                              <div className="text-xs text-muted-foreground">{log.userRole}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-medium text-sm">{log.eventType}</div>
                              {log.action && <div className="text-xs text-muted-foreground">{log.action}</div>}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{log.resource || '-'}</TableCell>
                          <TableCell>
                            <Badge variant={log.result === 'success' ? 'default' : 
                                          log.result === 'error' ? 'destructive' : 
                                          'secondary'}>
                              {log.result}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <SeverityBadge severity={log.severity} />
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {log.executionTimeMs || '-'}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>

              {/* Pagination */}
              {auditLogs?.pagination && (
                <div className="flex justify-between items-center mt-4">
                  <div className="text-sm text-muted-foreground">
                    Affichage de {auditFilters.offset + 1} à {Math.min(auditFilters.offset + auditFilters.limit, auditLogs.total)} 
                    sur {auditLogs.total} résultats
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={auditFilters.offset === 0}
                      onClick={() => setAuditFilters(prev => ({ 
                        ...prev, 
                        offset: Math.max(0, prev.offset - prev.limit) 
                      }))}
                      data-testid="button-audit-prev"
                    >
                      Précédent
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!auditLogs.pagination.hasMore}
                      onClick={() => setAuditFilters(prev => ({ 
                        ...prev, 
                        offset: prev.offset + prev.limit 
                      }))}
                      data-testid="button-audit-next"
                    >
                      Suivant
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Analytics Chatbot */}
        <TabsContent value="chatbot" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Métriques chatbot */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Performance Chatbot
                </CardTitle>
                <CardDescription>Métriques de performance et utilisation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="text-2xl font-bold">{overview?.chatbot.totalQueries || 0}</div>
                    <div className="text-sm text-muted-foreground">Requêtes totales</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-2xl font-bold text-green-600">
                      {Math.round(overview?.chatbot.successRate || 0)}%
                    </div>
                    <div className="text-sm text-muted-foreground">Taux de succès</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-2xl font-bold">
                      {Math.round(overview?.chatbot.avgResponseTime || 0)}ms
                    </div>
                    <div className="text-sm text-muted-foreground">Temps réponse moyen</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-2xl font-bold">
                      {overview?.chatbot.feedbackStats.totalFeedback || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Feedbacks reçus</div>
                  </div>
                </div>

                {performanceData && (
                  <div className="space-y-3">
                    <Separator />
                    <h4 className="text-sm font-semibold">Indicateurs de Performance</h4>
                    {performanceData.map((metric, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>{metric.metric}</span>
                          <span className={metric.value > metric.target ? "text-red-600" : "text-green-600"}>
                            {metric.value}{metric.unit}
                          </span>
                        </div>
                        <Progress 
                          value={metric.unit === '%' ? metric.value : Math.min(100, (metric.target / metric.value) * 100)} 
                          className="h-2" 
                        />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Erreurs par type */}
            <Card>
              <CardHeader>
                <CardTitle>Erreurs par Type</CardTitle>
                <CardDescription>Analyse des erreurs chatbot détectées</CardDescription>
              </CardHeader>
              <CardContent>
                {analyticsLoading ? (
                  <div className="flex justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin" />
                  </div>
                ) : Object.keys(overview?.chatbot.errorsByType || {}).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-600" />
                    <p>Aucune erreur détectée</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(overview?.chatbot.errorsByType || {}).map(([type, count]) => (
                      <div key={type} className="flex justify-between items-center">
                        <span className="text-sm">{type.replace(/_/g, ' ')}</span>
                        <Badge variant="destructive">{count}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Graphique d'utilisation temporelle */}
          {chatbotAnalytics?.usagePatterns && (
            <Card>
              <CardHeader>
                <CardTitle>Patterns d'Utilisation</CardTitle>
                <CardDescription>Répartition temporelle des requêtes chatbot</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={chatbotAnalytics.usagePatterns.hourly}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="count" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Onglet Activité Utilisateurs */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Activité des Utilisateurs
              </CardTitle>
              <CardDescription>
                Surveillance et analyse comportementale des utilisateurs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Database className="h-12 w-12 mx-auto mb-4" />
                <p>Fonctionnalité en cours de développement</p>
                <p className="text-xs mt-2">Analyse comportementale et détection d'anomalies</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Toast pour les notifications temps réel */}
      {/* Les toasts sont gérés automatiquement par useToast */}
    </div>
  );
}