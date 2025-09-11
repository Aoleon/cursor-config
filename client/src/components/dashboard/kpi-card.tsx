import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, AlertTriangle } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: number | string;
  previousValue?: number;
  format: 'number' | 'percentage' | 'currency' | 'days';
  icon?: React.ComponentType<{ className?: string }>;
  trend?: 'up' | 'down' | 'stable';
  threshold?: {
    warning: number;
    critical: number;
    reverse?: boolean; // true si valeur élevée = mauvais (ex: retards)
  };
  subtitle?: string;
  loading?: boolean;
  className?: string;
}

export default function KpiCard({
  title,
  value,
  previousValue,
  format,
  icon: Icon,
  trend,
  threshold,
  subtitle,
  loading = false,
  className = ""
}: KpiCardProps) {
  
  const formatValue = (val: number | string) => {
    if (typeof val === 'string') return val;
    
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('fr-FR', {
          style: 'currency',
          currency: 'EUR',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(val);
      case 'percentage':
        return `${val.toFixed(1)}%`;
      case 'days':
        const dayText = val === 1 ? 'jour' : 'jours';
        return `${val.toFixed(1)} ${dayText}`;
      default:
        return new Intl.NumberFormat('fr-FR').format(val);
    }
  };

  const getTrendIcon = () => {
    if (!trend) return null;
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'down': return <TrendingDown className="w-4 h-4 text-red-600" />;
      case 'stable': return <Minus className="w-4 h-4 text-gray-400" />;
      default: return null;
    }
  };

  const getThresholdStatus = () => {
    if (!threshold || typeof value !== 'number') return null;
    
    const { warning, critical, reverse = false } = threshold;
    
    if (reverse) {
      if (value >= critical) return 'critical';
      if (value >= warning) return 'warning';
      return 'good';
    } else {
      if (value <= critical) return 'critical';
      if (value <= warning) return 'warning';
      return 'good';
    }
  };

  const thresholdStatus = getThresholdStatus();
  
  const getStatusColor = () => {
    switch (thresholdStatus) {
      case 'critical': return 'bg-red-100 border-red-200';
      case 'warning': return 'bg-orange-100 border-orange-200';
      case 'good': return 'bg-green-100 border-green-200';
      default: return 'bg-white';
    }
  };

  const getStatusBadge = () => {
    switch (thresholdStatus) {
      case 'critical':
        return <Badge variant="destructive" className="text-xs"><AlertTriangle className="w-3 h-3 mr-1" />Critique</Badge>;
      case 'warning':
        return <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800">Attention</Badge>;
      case 'good':
        return <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">OK</Badge>;
      default:
        return null;
    }
  };

  const calculateTrendPercentage = () => {
    if (!previousValue || typeof value !== 'number') return null;
    const change = ((value - previousValue) / previousValue) * 100;
    return change;
  };

  const trendPercentage = calculateTrendPercentage();

  if (loading) {
    return (
      <Card className={`animate-pulse ${className}`} data-testid={`kpi-card-${title.toLowerCase().replace(/\s+/g, '-')}-loading`}>
        <CardContent className="p-6">
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`shadow-card transition-all hover:shadow-lg ${getStatusColor()} ${className}`} data-testid={`kpi-card-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-600" data-testid={`kpi-title-${title.toLowerCase().replace(/\s+/g, '-')}`}>
            {title}
          </h3>
          <div className="flex items-center gap-2">
            {getStatusBadge()}
            {Icon && (
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Icon className="text-primary w-5 h-5" />
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <p className="text-3xl font-bold text-gray-900" data-testid={`kpi-value-${title.toLowerCase().replace(/\s+/g, '-')}`}>
              {formatValue(value)}
            </p>
            <div className="flex items-center gap-1">
              {getTrendIcon()}
              {trendPercentage !== null && (
                <span className={`text-sm font-medium ${
                  trendPercentage > 0 ? 'text-green-600' : 
                  trendPercentage < 0 ? 'text-red-600' : 
                  'text-gray-500'
                }`} data-testid={`kpi-trend-${title.toLowerCase().replace(/\s+/g, '-')}`}>
                  {trendPercentage > 0 ? '+' : ''}{trendPercentage.toFixed(1)}%
                </span>
              )}
            </div>
          </div>

          {subtitle && (
            <p className="text-sm text-gray-500" data-testid={`kpi-subtitle-${title.toLowerCase().replace(/\s+/g, '-')}`}>
              {subtitle}
            </p>
          )}

          {/* Progress bar pour les pourcentages */}
          {format === 'percentage' && typeof value === 'number' && (
            <div className="mt-3">
              <Progress 
                value={Math.min(value, 100)} 
                className="h-2" 
                data-testid={`kpi-progress-${title.toLowerCase().replace(/\s+/g, '-')}`}
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}