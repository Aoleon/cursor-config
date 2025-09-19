import { useMemo } from 'react';
import { usePerformanceMetrics } from '@/hooks/use-performance-metrics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  Area,
  AreaChart
} from 'recharts';
import { TrendingUp, BarChart3, PieChart as PieChartIcon, Activity, Clock } from 'lucide-react';

// Couleurs pour les graphiques
const CHART_COLORS = {
  primary: '#3b82f6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  secondary: '#6b7280',
  accent: '#8b5cf6'
};

// Composant pour graphique délais moyens par phase
function DelaysByPhaseChart() {
  const { chartData, isLoading } = usePerformanceMetrics();

  if (isLoading || !chartData?.delaysByPhase) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-1/3"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const data = chartData.delaysByPhase;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Délais Moyens par Phase
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis 
              dataKey="phase" 
              className="text-xs"
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
            />
            <YAxis 
              className="text-xs"
              tick={{ fontSize: 12 }}
              label={{ value: 'Jours', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip 
              formatter={(value: number, name: string) => [
                `${value} jours`,
                name === 'averageDays' ? 'Délai moyen' : name
              ]}
              labelFormatter={(label) => `Phase: ${label?.replace('_', ' ')}`}
              contentStyle={{ 
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px'
              }}
            />
            <Bar 
              dataKey="averageDays" 
              fill={CHART_COLORS.primary}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
        
        {/* Légende avec statistiques */}
        <div className="mt-4 flex justify-center gap-4 text-sm text-muted-foreground">
          <div>Total projets: {data.reduce((acc, item) => acc + item.projectCount, 0)}</div>
          <div>Phases: {data.length}</div>
          <div>Délai moyen global: {Math.round(data.reduce((acc, item) => acc + item.averageDays, 0) / data.length)} jours</div>
        </div>
      </CardContent>
    </Card>
  );
}

// Composant pour graphique tendances temporelles
function TrendsOverTimeChart() {
  const { chartData, isLoading } = usePerformanceMetrics();

  if (isLoading || !chartData?.trendsOverTime) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-1/3"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const data = chartData.trendsOverTime;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Tendances de Performance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis 
              dataKey="period" 
              className="text-xs"
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              yAxisId="percentage"
              orientation="left"
              className="text-xs"
              tick={{ fontSize: 12 }}
              label={{ value: '% À temps', angle: -90, position: 'insideLeft' }}
              domain={[0, 100]}
            />
            <YAxis 
              yAxisId="days"
              orientation="right"
              className="text-xs"
              tick={{ fontSize: 12 }}
              label={{ value: 'Jours retard', angle: 90, position: 'insideRight' }}
            />
            <Tooltip 
              formatter={(value: number, name: string) => {
                if (name === 'onTimePercentage') return [`${value}%`, 'À temps'];
                if (name === 'averageDelay') return [`${value} jours`, 'Retard moyen'];
                return [value, name];
              }}
              contentStyle={{ 
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px'
              }}
            />
            <Legend />
            <Line 
              yAxisId="percentage"
              type="monotone" 
              dataKey="onTimePercentage" 
              stroke={CHART_COLORS.success}
              strokeWidth={2}
              name="À temps (%)"
              dot={{ r: 4 }}
            />
            <Line 
              yAxisId="days"
              type="monotone" 
              dataKey="averageDelay" 
              stroke={CHART_COLORS.warning}
              strokeWidth={2}
              name="Retard moyen (jours)"
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
        
        {/* Statistiques rapides */}
        <div className="mt-4 grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-green-600">
              {data[data.length - 1]?.onTimePercentage || 0}%
            </div>
            <div className="text-xs text-muted-foreground">Actuel à temps</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-orange-600">
              {data[data.length - 1]?.averageDelay || 0}j
            </div>
            <div className="text-xs text-muted-foreground">Retard moyen</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600">
              {data.reduce((acc, item) => acc + item.projectsCompleted, 0)}
            </div>
            <div className="text-xs text-muted-foreground">Projets totaux</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Composant pour graphique distribution succès
function SuccessDistributionChart() {
  const { chartData, isLoading } = usePerformanceMetrics();

  if (isLoading || !chartData?.successDistribution) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-1/3"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const data = chartData.successDistribution;

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        className="text-sm font-medium"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieChartIcon className="h-5 w-5" />
          Distribution Succès Projets
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <ResponsiveContainer width="70%" height={250}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomizedLabel}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number) => [`${value}%`, 'Pourcentage']}
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          
          {/* Légende */}
          <div className="flex flex-col gap-2">
            {data.map((entry, index) => (
              <div key={index} className="flex items-center gap-2">
                <div 
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: entry.color }}
                ></div>
                <div className="text-sm">
                  <div className="font-medium">{entry.name}</div>
                  <div className="text-muted-foreground">{entry.value}%</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Composant pour graphique impact optimisations
function OptimizationImpactChart() {
  const { chartData, isLoading } = usePerformanceMetrics();

  if (isLoading || !chartData?.optimizationImpact) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-1/3"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const data = chartData.optimizationImpact;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Impact des Optimisations
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <defs>
              <linearGradient id="colorGain" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART_COLORS.accent} stopOpacity={0.8}/>
                <stop offset="95%" stopColor={CHART_COLORS.accent} stopOpacity={0.1}/>
              </linearGradient>
              <linearGradient id="colorSuccess" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART_COLORS.success} stopOpacity={0.8}/>
                <stop offset="95%" stopColor={CHART_COLORS.success} stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis 
              dataKey="type" 
              className="text-xs"
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              yAxisId="days"
              orientation="left"
              className="text-xs"
              tick={{ fontSize: 12 }}
              label={{ value: 'Jours', angle: -90, position: 'insideLeft' }}
            />
            <YAxis 
              yAxisId="rate"
              orientation="right"
              className="text-xs"
              tick={{ fontSize: 12 }}
              label={{ value: '% Succès', angle: 90, position: 'insideRight' }}
              domain={[0, 100]}
            />
            <Tooltip 
              formatter={(value: number, name: string) => {
                if (name === 'averageGain') return [`${value} jours`, 'Gain moyen'];
                if (name === 'successRate') return [`${value}%`, 'Taux de succès'];
                return [value, name];
              }}
              contentStyle={{ 
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px'
              }}
            />
            <Legend />
            <Area 
              yAxisId="days"
              type="monotone" 
              dataKey="averageGain" 
              stroke={CHART_COLORS.accent}
              fillOpacity={1}
              fill="url(#colorGain)"
              name="Gain moyen (jours)"
            />
            <Area 
              yAxisId="rate"
              type="monotone" 
              dataKey="successRate" 
              stroke={CHART_COLORS.success}
              fillOpacity={1}
              fill="url(#colorSuccess)"
              name="Taux de succès (%)"
            />
          </AreaChart>
        </ResponsiveContainer>
        
        {/* Statistiques */}
        <div className="mt-4 grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-purple-600">
              {data.reduce((acc, item) => acc + item.implementations, 0)}
            </div>
            <div className="text-xs text-muted-foreground">Optimisations</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">
              {Math.round(data.reduce((acc, item) => acc + item.averageGain, 0))}j
            </div>
            <div className="text-xs text-muted-foreground">Gain total</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600">
              {Math.round(data.reduce((acc, item) => acc + item.successRate, 0) / data.length)}%
            </div>
            <div className="text-xs text-muted-foreground">Succès moyen</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Composant principal TimelinePerformanceCharts
export default function TimelinePerformanceCharts() {
  const { dashboardStats, isLoading } = usePerformanceMetrics();

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-6 bg-muted rounded w-1/3"></div>
                <div className="h-64 bg-muted rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Métriques de performance rapides */}
      {dashboardStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="flex items-center p-6">
              <div className="flex items-center justify-between w-full">
                <div>
                  <p className="text-2xl font-bold">{dashboardStats.projectSuccessRate}%</p>
                  <p className="text-xs text-muted-foreground">Taux de succès</p>
                </div>
                <Badge variant={dashboardStats.projectSuccessRate > 80 ? "default" : "secondary"}>
                  {dashboardStats.onTimeEvolution > 0 ? '+' : ''}{dashboardStats.onTimeEvolution.toFixed(1)}%
                </Badge>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="flex items-center p-6">
              <Clock className="h-8 w-8 text-orange-600 mr-4" />
              <div>
                <p className="text-2xl font-bold">{dashboardStats.averageDelayDays.toFixed(1)}j</p>
                <p className="text-xs text-muted-foreground">Retard moyen</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="flex items-center p-6">
              <TrendingUp className="h-8 w-8 text-green-600 mr-4" />
              <div>
                <p className="text-2xl font-bold">{dashboardStats.optimizationStats.totalGainDays}</p>
                <p className="text-xs text-muted-foreground">Jours optimisés</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="flex items-center p-6">
              <BarChart3 className="h-8 w-8 text-blue-600 mr-4" />
              <div>
                <p className="text-2xl font-bold">{dashboardStats.totalProjects}</p>
                <p className="text-xs text-muted-foreground">Projets analysés</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Graphiques dans des onglets */}
      <Card>
        <CardHeader>
          <CardTitle>Analyses de Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="delays" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="delays" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Délais
              </TabsTrigger>
              <TabsTrigger value="trends" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Tendances
              </TabsTrigger>
              <TabsTrigger value="success" className="flex items-center gap-2">
                <PieChartIcon className="h-4 w-4" />
                Distribution
              </TabsTrigger>
              <TabsTrigger value="optimization" className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Optimisations
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="delays" className="mt-6">
              <DelaysByPhaseChart />
            </TabsContent>
            
            <TabsContent value="trends" className="mt-6">
              <TrendsOverTimeChart />
            </TabsContent>
            
            <TabsContent value="success" className="mt-6">
              <SuccessDistributionChart />
            </TabsContent>
            
            <TabsContent value="optimization" className="mt-6">
              <OptimizationImpactChart />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}