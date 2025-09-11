import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts";
import { Badge } from "@/components/ui/badge";

interface TimeSeriesData {
  date: string;
  offersCreated: number;
  offersWon: number;
  forecastRevenue: number;
  teamLoadHours: number;
}

interface ConversionBreakdown {
  [userName: string]: { rate: number; offersCount: number; wonCount: number };
}

interface LoadBreakdown {
  [userName: string]: { percentage: number; hours: number; capacity: number };
}

interface MarginBreakdown {
  [category: string]: number;
}

interface KpiChartsProps {
  timeSeries: TimeSeriesData[];
  conversionByUser: ConversionBreakdown;
  loadByUser: LoadBreakdown;
  marginByCategory: MarginBreakdown;
  granularity: 'day' | 'week';
  loading?: boolean;
}

export default function KpiCharts({
  timeSeries,
  conversionByUser,
  loadByUser,
  marginByCategory,
  granularity,
  loading = false
}: KpiChartsProps) {
  
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (granularity === 'week') {
      return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    }
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'numeric' });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  // Transformation des données pour graphiques
  const conversionData = Object.entries(conversionByUser).map(([name, data]) => ({
    name: name.split(' ')[0], // Prénom seulement pour économiser l'espace
    taux: data.rate,
    offres: data.offersCount,
    gagnees: data.wonCount
  }));

  const loadData = Object.entries(loadByUser).map(([name, data]) => ({
    name: name.split(' ')[0],
    charge: data.percentage,
    heures: data.hours,
    capacite: data.capacity
  }));

  const marginData = Object.entries(marginByCategory).map(([category, margin]) => ({
    name: category,
    marge: margin
  }));

  // Couleurs pour les graphiques
  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1', '#d084d0'];

  const LoadingCard = ({ title }: { title: string }) => (
    <Card className="animate-pulse" data-testid={`chart-${title.toLowerCase().replace(/\s+/g, '-')}-loading`}>
      <CardHeader>
        <div className="h-4 bg-gray-200 rounded w-1/3"></div>
      </CardHeader>
      <CardContent>
        <div className="h-64 bg-gray-200 rounded"></div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LoadingCard title="Évolution CA" />
        <LoadingCard title="Charge Équipes" />
        <LoadingCard title="Taux Conversion" />
        <LoadingCard title="Marges" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Évolution du CA Prévisionnel */}
      <Card className="lg:col-span-2" data-testid="chart-ca-evolution">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Évolution du CA Prévisionnel
            <Badge variant="outline" className="text-xs">
              {granularity === 'week' ? 'Hebdomadaire' : 'Quotidien'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeSeries} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatDate}
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  yAxisId="revenue"
                  orientation="left"
                  tickFormatter={formatCurrency}
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  yAxisId="count"
                  orientation="right"
                  tick={{ fontSize: 12 }}
                />
                <Tooltip 
                  labelFormatter={(value) => `Période: ${formatDate(value)}`}
                  formatter={(value: any, name: string) => {
                    if (name === 'forecastRevenue') return [formatCurrency(value), 'CA Prévisionnel'];
                    if (name === 'offersCreated') return [value, 'Offres Créées'];
                    if (name === 'offersWon') return [value, 'Offres Gagnées'];
                    return [value, name];
                  }}
                />
                <Line 
                  yAxisId="revenue"
                  type="monotone" 
                  dataKey="forecastRevenue" 
                  stroke="#8884d8" 
                  strokeWidth={3}
                  dot={{ fill: '#8884d8', strokeWidth: 2, r: 4 }}
                  name="forecastRevenue"
                />
                <Line 
                  yAxisId="count"
                  type="monotone" 
                  dataKey="offersCreated" 
                  stroke="#82ca9d" 
                  strokeWidth={2}
                  dot={{ fill: '#82ca9d', strokeWidth: 2, r: 3 }}
                  name="offersCreated"
                />
                <Line 
                  yAxisId="count"
                  type="monotone" 
                  dataKey="offersWon" 
                  stroke="#ffc658" 
                  strokeWidth={2}
                  dot={{ fill: '#ffc658', strokeWidth: 2, r: 3 }}
                  name="offersWon"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Charge par Équipe BE */}
      <Card data-testid="chart-team-load">
        <CardHeader>
          <CardTitle>Charge par Équipe BE</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={loadData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip 
                  formatter={(value: any, name: string) => {
                    if (name === 'charge') return [`${value.toFixed(1)}%`, 'Charge'];
                    return [value, name];
                  }}
                  labelFormatter={(value) => `Équipe: ${value}`}
                />
                <Bar 
                  dataKey="charge" 
                  fill="#8884d8"
                  radius={[4, 4, 0, 0]}
                  name="charge"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Taux de Conversion par Utilisateur */}
      <Card data-testid="chart-conversion-rate">
        <CardHeader>
          <CardTitle>Taux de Conversion par Utilisateur</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={conversionData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip 
                  formatter={(value: any, name: string) => {
                    if (name === 'taux') return [`${value.toFixed(1)}%`, 'Taux de Conversion'];
                    if (name === 'offres') return [value, 'Offres Totales'];
                    if (name === 'gagnees') return [value, 'Offres Gagnées'];
                    return [value, name];
                  }}
                  labelFormatter={(value) => `${value}`}
                />
                <Bar 
                  dataKey="taux" 
                  fill="#82ca9d"
                  radius={[4, 4, 0, 0]}
                  name="taux"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Marges par Catégorie */}
      <Card data-testid="chart-margins-category">
        <CardHeader>
          <CardTitle>Marges par Catégorie</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={marginData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, marge }) => `${name}: ${marge.toFixed(1)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="marge"
                >
                  {marginData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: any) => [`${value.toFixed(1)}%`, 'Marge']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Charge par Heures (détail) */}
      <Card data-testid="chart-hours-detail">
        <CardHeader>
          <CardTitle>Détail Heures par Équipe</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(loadByUser).map(([name, data]) => {
              const percentage = data.percentage;
              const status = percentage > 90 ? 'critical' : percentage > 75 ? 'warning' : 'good';
              
              return (
                <div key={name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg" data-testid={`team-detail-${name.toLowerCase().replace(/\s+/g, '-')}`}>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{name}</p>
                    <p className="text-xs text-gray-500">
                      {data.hours.toFixed(0)}h / {data.capacity}h
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={status === 'critical' ? 'destructive' : status === 'warning' ? 'secondary' : 'secondary'}
                      className={status === 'warning' ? 'bg-orange-100 text-orange-800' : status === 'good' ? 'bg-green-100 text-green-800' : ''}
                    >
                      {percentage.toFixed(1)}%
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}