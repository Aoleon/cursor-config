export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function formatTrend(current: number, previous: number): {
  value: number;
  direction: 'up' | 'down' | 'stable';
  color: string;
} {
  const change = ((current - previous) / previous) * 100;
  return {
    value: Math.abs(change),
    direction: change > 5 ? 'up' : change < -5 ? 'down' : 'stable',
    color: change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-600'
  };
}

export function formatDuration(days: number): string {
  if (days === 0) return '0 jour';
  if (days === 1) return '1 jour';
  if (days < 30) return `${Math.round(days)} jours`;
  
  const months = Math.round(days / 30);
  if (months === 1) return '1 mois';
  return `${months} mois`;
}

export function formatCompactNumber(value: number): string {
  if (value < 1000) return value.toString();
  if (value < 1000000) return `${(value / 1000).toFixed(1)}K`;
  return `${(value / 1000000).toFixed(1)}M`;
}

export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('fr-FR');
}

export function formatDateTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('fr-FR') + ' ' + d.toLocaleTimeString('fr-FR', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
}

export function formatRelativeTime(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return "Hier";
  if (diffDays < 7) return `Il y a ${diffDays} jours`;
  if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)} semaines`;
  return `Il y a ${Math.floor(diffDays / 30)} mois`;
}

export function getVariantFromTrend(trend: number): 'default' | 'warning' | 'destructive' {
  if (Math.abs(trend) < 5) return 'default';
  if (trend < -10) return 'destructive';
  if (trend > 10) return 'default';
  return 'warning';
}

export function getProgressColor(percentage: number): string {
  if (percentage >= 85) return 'bg-red-500';
  if (percentage >= 70) return 'bg-yellow-500';
  return 'bg-green-500';
}