import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  AlertTriangle, 
  Clock, 
  User, 
  TrendingUp, 
  TrendingDown,
  Calendar,
  CheckCircle2,
  BarChart3,
  Target,
  Activity,
  Zap,
  AlertCircle,
  CheckCircle,
  XCircle,
  PieChart,
  Filter,
  Eye,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, subWeeks, addWeeks } from 'date-fns';
import { fr } from 'date-fns/locale';

interface WorkloadMetrics {
  estimationAccuracy: number;
  averageDelay: number;
  productivityRate: number;
  resourceEfficiency: number;
}

interface PerformanceTrend {
  period: string;
  estimated: number;
  actual: number;
  variance: number;
  efficiency: number;
}

export default function WorkloadPlanner() {
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [activeTab, setActiveTab] = useState<'overview' | 'metrics' | 'trends'>('overview');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('current');
  const [showAlerts, setShowAlerts] = useState(true);

  // Fetch BE workload data
  const { data: beWorkload = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/be-workload/'],
  });

  // Fetch users to display team members
  const { data: users = [] } = useQuery<any[]>({
    queryKey: ['/api/users/'],
  });

  // Fetch project performance metrics
  const { data: projectMetrics = [] } = useQuery<any[]>({
    queryKey: ['/api/projects/metrics'],
  });

  // Fetch historical performance data
  const { data: performanceHistory = [] } = useQuery<PerformanceTrend[]>({
    queryKey: ['/api/workload/performance-history', selectedPeriod],
  });

  const getWorkloadLevel = (loadPercentage: number) => {
    if (loadPercentage < 80) return { level: 'low', color: 'text-green-600', bg: 'bg-green-100' };
    if (loadPercentage < 100) return { level: 'medium', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    return { level: 'high', color: 'text-red-600', bg: 'bg-red-100' };
  };

  const getWorkloadLabel = (loadPercentage: number) => {
    if (loadPercentage < 80) return 'Disponible';
    if (loadPercentage < 100) return 'Occupé';
    return 'Surchargé';
  };

  const currentWeek = new Date();
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });

  // Calculate advanced team statistics with performance metrics
  const teamStats = useMemo(() => {
    const beMembers = users.filter((user: any) => ['responsable_be', 'technicien_be'].includes(user.role));
    const totalMembers = beMembers.length;
    const overloaded = beWorkload.filter((w: any) => parseFloat(w.loadPercentage) > 100).length;
    const available = beWorkload.filter((w: any) => parseFloat(w.loadPercentage) < 80).length;
    const avgLoad = beWorkload.length > 0 
      ? beWorkload.reduce((acc: number, w: any) => acc + parseFloat(w.loadPercentage), 0) / beWorkload.length 
      : 0;
    
    // Calculate performance metrics
    const totalEstimated = beWorkload.reduce((acc: number, w: any) => acc + (w.estimatedHours || w.plannedHours || 0), 0);
    const totalActual = beWorkload.reduce((acc: number, w: any) => acc + (w.actualHours || 0), 0);
    const estimationAccuracy = totalEstimated > 0 ? Math.min((totalEstimated / Math.max(totalActual, 1)) * 100, 100) : 0;
    const productivityRate = totalActual > 0 ? (totalEstimated / totalActual) * 100 : 0;
    
    return {
      totalMembers,
      overloaded,
      available,
      avgLoad: Math.round(avgLoad),
      totalEstimated,
      totalActual,
      estimationAccuracy: Math.round(estimationAccuracy),
      productivityRate: Math.round(productivityRate),
      varianceHours: totalActual - totalEstimated,
      variancePercent: totalEstimated > 0 ? Math.round(((totalActual - totalEstimated) / totalEstimated) * 100) : 0
    };
  }, [users, beWorkload]);
  
  // Calculate performance alerts
  const performanceAlerts = useMemo(() => {
    const alerts = [];
    
    // Estimation accuracy alert
    if (teamStats.estimationAccuracy < 70) {
      alerts.push({
        id: 'estimation-accuracy',
        type: 'warning',
        title: 'Précision d\'estimation faible',
        message: `Seulement ${teamStats.estimationAccuracy}% de précision sur les estimations`,
        severity: teamStats.estimationAccuracy < 50 ? 'critical' : 'warning'
      });
    }
    
    // Productivity rate alert
    if (teamStats.productivityRate < 80) {
      alerts.push({
        id: 'productivity-low',
        type: 'warning', 
        title: 'Productivité en baisse',
        message: `Taux de productivité à ${teamStats.productivityRate}%`,
        severity: 'warning'
      });
    }
    
    // High variance alert
    if (Math.abs(teamStats.variancePercent) > 25) {
      alerts.push({
        id: 'high-variance',
        type: 'error',
        title: 'Écart important détecté',
        message: `${teamStats.variancePercent > 0 ? '+' : ''}${teamStats.variancePercent}% d'écart avec les estimations`,
        severity: 'critical'
      });
    }
    
    return alerts;
  }, [teamStats]);
  
  // Get performance indicator color and icon
  const getPerformanceIndicator = (value: number, type: 'accuracy' | 'productivity' | 'variance') => {
    if (type === 'variance') {
      const absValue = Math.abs(value);
      if (absValue < 10) return { color: 'text-green-600', bg: 'bg-green-100', icon: CheckCircle, status: 'Excellent' };
      if (absValue < 25) return { color: 'text-yellow-600', bg: 'bg-yellow-100', icon: AlertCircle, status: 'Acceptable' };
      return { color: 'text-red-600', bg: 'bg-red-100', icon: XCircle, status: 'Critique' };
    } else {
      if (value >= 90) return { color: 'text-green-600', bg: 'bg-green-100', icon: CheckCircle, status: 'Excellent' };
      if (value >= 75) return { color: 'text-yellow-600', bg: 'bg-yellow-100', icon: AlertCircle, status: 'Bon' };
      if (value >= 60) return { color: 'text-orange-600', bg: 'bg-orange-100', icon: AlertTriangle, status: 'Moyen' };
      return { color: 'text-red-600', bg: 'bg-red-100', icon: XCircle, status: 'Faible' };
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Planificateur de Charge BE
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6" data-testid="workload-planner">
      {/* Performance Alerts */}
      {showAlerts && performanceAlerts.length > 0 && (
        <div className="space-y-3">
          {performanceAlerts.map((alert) => (
            <Card key={alert.id} className={`border-l-4 ${
              alert.severity === 'critical' ? 'border-red-500 bg-red-50' : 'border-orange-500 bg-orange-50'
            }`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <AlertTriangle className={`h-5 w-5 ${
                      alert.severity === 'critical' ? 'text-red-600' : 'text-orange-600'
                    }`} />
                    <div>
                      <h4 className="font-medium">{alert.title}</h4>
                      <p className="text-sm text-gray-600">{alert.message}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAlerts(false)}
                    data-testid="dismiss-alerts"
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Enhanced Statistics Header */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Équipe BE</p>
                <p className="text-2xl font-bold">{teamStats.totalMembers}</p>
              </div>
              <User className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Surchargés</p>
                <p className="text-2xl font-bold text-red-600">{teamStats.overloaded}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Disponibles</p>
                <p className="text-2xl font-bold text-green-600">{teamStats.available}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Charge Moy.</p>
                <p className="text-2xl font-bold">{teamStats.avgLoad}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Précision</p>
                <p className="text-2xl font-bold text-blue-600">{teamStats.estimationAccuracy}%</p>
              </div>
              <Target className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Écart</p>
                <p className={`text-2xl font-bold ${
                  Math.abs(teamStats.variancePercent) <= 10 ? 'text-green-600' : 
                  Math.abs(teamStats.variancePercent) <= 25 ? 'text-orange-600' : 'text-red-600'
                }`}>
                  {teamStats.variancePercent > 0 ? '+' : ''}{teamStats.variancePercent}%
                </p>
              </div>
              {teamStats.variancePercent > 0 ? (
                <ArrowUpRight className="h-8 w-8 text-red-600" />
              ) : teamStats.variancePercent < 0 ? (
                <ArrowDownRight className="h-8 w-8 text-green-600" />
              ) : (
                <Activity className="h-8 w-8 text-blue-600" />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content with Tabs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Analyse de Performance BE
            </CardTitle>
            <div className="flex items-center space-x-4">
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-40" data-testid="period-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current">Période actuelle</SelectItem>
                  <SelectItem value="last-week">Semaine dernière</SelectItem>
                  <SelectItem value="last-month">Mois dernier</SelectItem>
                  <SelectItem value="quarter">Trimestre</SelectItem>
                </SelectContent>
              </Select>
              
              <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'week' | 'month')}>
                <TabsList>
                  <TabsTrigger value="week">Hebdo</TabsTrigger>
                  <TabsTrigger value="month">Mensuel</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
          <p className="text-sm text-gray-600">
            Semaine du {format(weekStart, 'dd/MM', { locale: fr })} au {format(weekEnd, 'dd/MM/yyyy', { locale: fr })}
          </p>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'overview' | 'metrics' | 'trends')}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview" data-testid="tab-overview">
                <Eye className="h-4 w-4 mr-2" />
                Vue d'ensemble
              </TabsTrigger>
              <TabsTrigger value="metrics" data-testid="tab-metrics">
                <BarChart3 className="h-4 w-4 mr-2" />
                Métriques
              </TabsTrigger>
              <TabsTrigger value="trends" data-testid="tab-trends">
                <TrendingUp className="h-4 w-4 mr-2" />
                Tendances
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="mt-6">
              <div className="space-y-4">
                {beWorkload.map((workload: any) => {
                  const loadLevel = getWorkloadLevel(parseFloat(workload.loadPercentage));
                  const estimatedHours = workload.estimatedHours || workload.plannedHours || 0;
                  const actualHours = workload.actualHours || 0;
                  const variance = actualHours - estimatedHours;
                  const variancePercent = estimatedHours > 0 ? Math.round((variance / estimatedHours) * 100) : 0;
                  
                  return (
                    <div key={workload.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={workload.user?.profileImageUrl} />
                            <AvatarFallback>
                              {workload.user?.firstName?.[0]}{workload.user?.lastName?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h4 className="font-medium">
                              {workload.user?.firstName} {workload.user?.lastName}
                            </h4>
                            <p className="text-sm text-gray-600 capitalize">
                              {workload.user?.role?.replace('_', ' ')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge className={`${loadLevel.bg} ${loadLevel.color} border-0`}>
                            {getWorkloadLabel(parseFloat(workload.loadPercentage))}
                          </Badge>
                          {Math.abs(variancePercent) > 25 && (
                            <Badge variant="outline" className="text-red-600 border-red-300">
                              Écart: {variancePercent > 0 ? '+' : ''}{variancePercent}%
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span>Charge: {actualHours}h / {workload.capacityHours}h</span>
                          <span className={loadLevel.color}>
                            {Math.round(parseFloat(workload.loadPercentage))}%
                          </span>
                        </div>
                        <Progress 
                          value={Math.min(parseFloat(workload.loadPercentage), 100)} 
                          className="h-2"
                        />
                        
                        {/* Enhanced Metrics Row */}
                        <div className="grid grid-cols-3 gap-4 pt-2 border-t border-gray-100">
                          <div className="text-center">
                            <div className="text-xs text-gray-500">Estimé</div>
                            <div className="font-medium">{estimatedHours}h</div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-gray-500">Réalisé</div>
                            <div className="font-medium">{actualHours}h</div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-gray-500">Écart</div>
                            <div className={`font-medium ${
                              Math.abs(variancePercent) <= 10 ? 'text-green-600' : 
                              Math.abs(variancePercent) <= 25 ? 'text-orange-600' : 'text-red-600'
                            }`}>
                              {variance > 0 ? '+' : ''}{variance}h
                            </div>
                          </div>
                        </div>
                      </div>

                      {parseFloat(workload.loadPercentage) > 100 && (
                        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" />
                            <span>Surcharge détectée - Redistribution recommandée</span>
                          </div>
                        </div>
                      )}
                      
                      {Math.abs(variancePercent) > 25 && (
                        <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded text-sm text-orange-700">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="h-4 w-4" />
                            <span>Écart important entre estimé et réalisé ({variancePercent > 0 ? '+' : ''}{variancePercent}%)</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {beWorkload.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Aucune donnée de charge BE disponible</p>
                  <p className="text-sm">Les données de workload apparaîtront ici une fois configurées</p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="metrics" className="mt-6">
              <div className="space-y-6">
                {/* Performance Metrics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center space-x-2">
                        <Target className="h-5 w-5" />
                        <span>Précision d'Estimation</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="text-3xl font-bold text-center">
                          {teamStats.estimationAccuracy}%
                        </div>
                        <Progress value={teamStats.estimationAccuracy} className="h-3" />
                        <div className="flex items-center justify-center space-x-2">
                          {(() => {
                            const indicator = getPerformanceIndicator(teamStats.estimationAccuracy, 'accuracy');
                            const Icon = indicator.icon;
                            return (
                              <>
                                <Icon className={`h-4 w-4 ${indicator.color}`} />
                                <Badge className={`${indicator.bg} ${indicator.color} border-0`}>
                                  {indicator.status}
                                </Badge>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center space-x-2">
                        <Zap className="h-5 w-5" />
                        <span>Taux de Productivité</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="text-3xl font-bold text-center">
                          {teamStats.productivityRate}%
                        </div>
                        <Progress value={Math.min(teamStats.productivityRate, 100)} className="h-3" />
                        <div className="flex items-center justify-center space-x-2">
                          {(() => {
                            const indicator = getPerformanceIndicator(teamStats.productivityRate, 'productivity');
                            const Icon = indicator.icon;
                            return (
                              <>
                                <Icon className={`h-4 w-4 ${indicator.color}`} />
                                <Badge className={`${indicator.bg} ${indicator.color} border-0`}>
                                  {indicator.status}
                                </Badge>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center space-x-2">
                        <Activity className="h-5 w-5" />
                        <span>Variance Moyenne</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className={`text-3xl font-bold text-center ${
                          Math.abs(teamStats.variancePercent) <= 10 ? 'text-green-600' : 
                          Math.abs(teamStats.variancePercent) <= 25 ? 'text-orange-600' : 'text-red-600'
                        }`}>
                          {teamStats.variancePercent > 0 ? '+' : ''}{teamStats.variancePercent}%
                        </div>
                        <Progress 
                          value={Math.min(Math.abs(teamStats.variancePercent), 100)} 
                          className="h-3" 
                        />
                        <div className="flex items-center justify-center space-x-2">
                          {(() => {
                            const indicator = getPerformanceIndicator(teamStats.variancePercent, 'variance');
                            const Icon = indicator.icon;
                            return (
                              <>
                                <Icon className={`h-4 w-4 ${indicator.color}`} />
                                <Badge className={`${indicator.bg} ${indicator.color} border-0`}>
                                  {indicator.status}
                                </Badge>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                {/* Detailed Metrics Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <PieChart className="h-5 w-5" />
                      <span>Résumé des Performances</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {teamStats.totalEstimated}h
                        </div>
                        <div className="text-sm text-gray-600">Total Estimé</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">
                          {teamStats.totalActual}h
                        </div>
                        <div className="text-sm text-gray-600">Total Réalisé</div>
                      </div>
                      <div className="text-center">
                        <div className={`text-2xl font-bold ${
                          teamStats.varianceHours >= 0 ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {teamStats.varianceHours > 0 ? '+' : ''}{teamStats.varianceHours}h
                        </div>
                        <div className="text-sm text-gray-600">Écart Heures</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-800">
                          {beWorkload.length}
                        </div>
                        <div className="text-sm text-gray-600">Ressources</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="trends" className="mt-6">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <TrendingUp className="h-5 w-5" />
                      <span>Évolution des Performances</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {performanceHistory.length > 0 ? (
                      <div className="space-y-4">
                        {performanceHistory.map((trend, index) => (
                          <div key={index} className="flex items-center justify-between p-3 border rounded">
                            <div className="flex-1">
                              <div className="font-medium">{trend.period}</div>
                              <div className="text-sm text-gray-600">
                                Estimé: {trend.estimated}h | Réel: {trend.actual}h
                              </div>
                            </div>
                            <div className="flex items-center space-x-3">
                              <div className={`text-right ${
                                trend.variance <= 10 ? 'text-green-600' : 
                                trend.variance <= 25 ? 'text-orange-600' : 'text-red-600'
                              }`}>
                                <div className="font-bold">{trend.variance > 0 ? '+' : ''}{trend.variance}%</div>
                                <div className="text-xs">Écart</div>
                              </div>
                              <div className="text-right text-blue-600">
                                <div className="font-bold">{trend.efficiency}%</div>
                                <div className="text-xs">Efficacité</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Historique des performances disponible prochainement</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Recommendations */}
      {teamStats.overloaded > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-orange-800">Recommandations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-orange-700">
              <p>• {teamStats.overloaded} membre(s) en surcharge détecté(s)</p>
              <p>• Considérer une redistribution des tâches vers les membres disponibles</p>
              <p>• Évaluer l'ajout de ressources temporaires si nécessaire</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}