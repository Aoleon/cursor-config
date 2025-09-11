import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Calendar, TrendingUp, TrendingDown, DollarSign, Users, Clock, Target, AlertTriangle } from "lucide-react";
import KpiCard from "./kpi-card";
import KpiCharts from "./kpi-charts";

interface ConsolidatedKpis {
  periodSummary: {
    conversionRate: number;
    forecastRevenue: number;
    teamLoadPercentage: number;
    averageDelayDays: number;
    expectedMarginPercentage: number;
    totalDelayedTasks: number;
    totalOffers: number;
    totalWonOffers: number;
  };
  breakdowns: {
    conversionByUser: Record<string, { rate: number; offersCount: number; wonCount: number }>;
    loadByUser: Record<string, { percentage: number; hours: number; capacity: number }>;
    marginByCategory: Record<string, number>;
  };
  timeSeries: Array<{
    date: string;
    offersCreated: number;
    offersWon: number;
    forecastRevenue: number;
    teamLoadHours: number;
  }>;
  metadata: {
    period: { from: string; to: string };
    granularity: 'day' | 'week';
    calculatedAt: string;
    dataPoints: number;
    segment: string;
  };
}

interface ConsolidatedKpiDashboardProps {
  className?: string;
}

export default function ConsolidatedKpiDashboard({ className = "" }: ConsolidatedKpiDashboardProps) {
  // Paramètres par défaut : 30 derniers jours, granularité semaine
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter'>('month');
  const [granularity, setGranularity] = useState<'day' | 'week'>('week');
  
  // Calcul des dates selon la période sélectionnée
  const getDateRange = () => {
    const to = new Date();
    const from = new Date();
    
    switch (period) {
      case 'week':
        from.setDate(to.getDate() - 7);
        break;
      case 'month':
        from.setDate(to.getDate() - 30);
        break;
      case 'quarter':
        from.setDate(to.getDate() - 90);
        break;
    }
    
    return {
      from: from.toISOString().split('T')[0],
      to: to.toISOString().split('T')[0]
    };
  };

  const { from, to } = getDateRange();

  // Query pour récupérer les KPIs consolidés
  const { 
    data: kpis, 
    isLoading, 
    isError, 
    error, 
    refetch, 
    isFetching 
  } = useQuery<ConsolidatedKpis>({
    queryKey: ['/api/dashboard/kpis', { from, to, granularity }],
    refetchInterval: 10000, // Polling toutes les 10 secondes
    staleTime: 5000, // Données considérées fraîches pendant 5 secondes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  });

  // Formatage de la dernière mise à jour
  const formatLastUpdate = (calculatedAt?: string) => {
    if (!calculatedAt) return '';
    
    const updateTime = new Date(calculatedAt);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - updateTime.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return 'À l\'instant';
    if (diffMinutes < 60) return `Il y a ${diffMinutes} min`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    
    return updateTime.toLocaleDateString('fr-FR', { 
      day: 'numeric', 
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // État de chargement complet
  if (isLoading) {
    return (
      <div className={`space-y-6 ${className}`} data-testid="consolidated-kpi-dashboard-loading">
        <div className="flex items-center justify-between">
          <div className="h-8 bg-gray-200 rounded w-64 animate-pulse"></div>
          <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-80 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  // État d'erreur
  if (isError) {
    return (
      <Card className={`${className}`} data-testid="consolidated-kpi-dashboard-error">
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Erreur lors du chargement des KPIs
              </h3>
              <p className="text-gray-600 mt-2">
                {error instanceof Error ? error.message : 'Une erreur inattendue s\'est produite'}
              </p>
            </div>
            <Button onClick={() => refetch()} variant="outline" className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Réessayer
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const summary = kpis?.periodSummary;
  const breakdowns = kpis?.breakdowns;
  const timeSeries = kpis?.timeSeries || [];
  const metadata = kpis?.metadata;

  return (
    <div className={`space-y-6 ${className}`} data-testid="consolidated-kpi-dashboard">
      {/* Header avec contrôles */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900" data-testid="dashboard-title">
            Tableau de Bord KPIs Consolidés
          </h2>
          <p className="text-gray-600 text-sm" data-testid="dashboard-subtitle">
            Métriques de performance temps réel pour le pilotage de l'activité JLM
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Sélecteur de période */}
          <Select value={period} onValueChange={(value: 'week' | 'month' | 'quarter') => setPeriod(value)}>
            <SelectTrigger className="w-32" data-testid="period-selector">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">7 jours</SelectItem>
              <SelectItem value="month">30 jours</SelectItem>
              <SelectItem value="quarter">90 jours</SelectItem>
            </SelectContent>
          </Select>

          {/* Sélecteur de granularité */}
          <Select value={granularity} onValueChange={(value: 'day' | 'week') => setGranularity(value)}>
            <SelectTrigger className="w-32" data-testid="granularity-selector">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Jour</SelectItem>
              <SelectItem value="week">Semaine</SelectItem>
            </SelectContent>
          </Select>

          {/* Bouton refresh manuel */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-2"
            data-testid="refresh-button"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            {isFetching ? 'Actualisation...' : 'Actualiser'}
          </Button>
        </div>
      </div>

      {/* Indicateur dernière mise à jour */}
      {metadata && (
        <div className="flex items-center justify-between bg-gray-50 px-4 py-2 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="w-4 h-4" />
            <span>
              Période: {new Date(metadata.period.from).toLocaleDateString('fr-FR')} - {new Date(metadata.period.to).toLocaleDateString('fr-FR')}
            </span>
            <Badge variant="outline" className="text-xs">
              {metadata.dataPoints} points de données
            </Badge>
          </div>
          <div className="text-sm text-gray-500" data-testid="last-update">
            Dernière mise à jour: {formatLastUpdate(metadata.calculatedAt)}
          </div>
        </div>
      )}

      {/* Cartes KPIs Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard
          title="Taux de Conversion"
          value={summary?.conversionRate || 0}
          format="percentage"
          icon={Target}
          threshold={{ warning: 15, critical: 10 }}
          subtitle={`${summary?.totalWonOffers || 0}/${summary?.totalOffers || 0} offres gagnées`}
          loading={isLoading}
        />

        <KpiCard
          title="CA Prévisionnel"
          value={summary?.forecastRevenue || 0}
          format="currency"
          icon={DollarSign}
          threshold={{ warning: 100000, critical: 50000 }}
          subtitle="Pipeline pondéré"
          loading={isLoading}
        />

        <KpiCard
          title="Charge Équipes BE"
          value={summary?.teamLoadPercentage || 0}
          format="percentage"
          icon={Users}
          threshold={{ warning: 85, critical: 95, reverse: true }}
          subtitle="Capacité utilisée"
          loading={isLoading}
        />

        <KpiCard
          title="Retards Moyens"
          value={summary?.averageDelayDays || 0}
          format="days"
          icon={Clock}
          threshold={{ warning: 5, critical: 10, reverse: true }}
          subtitle={`${summary?.totalDelayedTasks || 0} tâches en retard`}
          loading={isLoading}
          className="border-red-100"
        />
      </div>

      {/* KPIs Secondaires */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <KpiCard
          title="Marge Attendue"
          value={summary?.expectedMarginPercentage || 0}
          format="percentage"
          icon={TrendingUp}
          threshold={{ warning: 15, critical: 10 }}
          subtitle="Moyenne pondérée"
          loading={isLoading}
        />

        <Card data-testid="kpi-summary-stats">
          <CardContent className="p-6">
            <h3 className="font-semibold text-gray-700 mb-4">Résumé de la Période</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Offres créées:</span>
                  <span className="font-medium" data-testid="total-offers">{summary?.totalOffers || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Offres gagnées:</span>
                  <span className="font-medium" data-testid="won-offers">{summary?.totalWonOffers || 0}</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Tâches retard:</span>
                  <span className="font-medium text-red-600" data-testid="delayed-tasks">{summary?.totalDelayedTasks || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Points données:</span>
                  <span className="font-medium" data-testid="data-points">{metadata?.dataPoints || 0}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Graphiques Interactifs */}
      <KpiCharts
        timeSeries={timeSeries}
        conversionByUser={breakdowns?.conversionByUser || {}}
        loadByUser={breakdowns?.loadByUser || {}}
        marginByCategory={breakdowns?.marginByCategory || {}}
        granularity={granularity}
        loading={isLoading}
      />
    </div>
  );
}