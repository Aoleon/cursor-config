import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Zap, User, CheckCircle } from 'lucide-react';
import { useBusinessAlertsDashboard } from '@/hooks/useBusinessAlerts';

export function BusinessAlertsOverview() {
  const { data: dashboard, isLoading } = useBusinessAlertsDashboard();
  
  // Mock data temporaire si pas d'API
  const summary = (dashboard as any)?.summary || {
    total_open: 7, 
    critical_open: 2, 
    assigned_to_me: 3, 
    resolved_this_week: 12
  };
  
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-4" data-testid="alerts-overview-loading">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="h-20 bg-muted animate-pulse" />
          </Card>
        ))}
      </div>
    );
  }
  
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4" data-testid="alerts-overview">
      <Card data-testid="card-alerts-open">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex justify-between">
            Alertes Ouvertes
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold" data-testid="count-alerts-open">
            {summary.total_open || 0}
          </div>
          <p className="text-xs text-muted-foreground">Total alertes actives</p>
        </CardContent>
      </Card>
      
      <Card data-testid="card-alerts-critical">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex justify-between">
            Critiques
            <Zap className="h-4 w-4 text-red-500" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600" data-testid="count-alerts-critical">
            {summary.critical_open || 0}
          </div>
          <p className="text-xs text-muted-foreground">Action immédiate</p>
        </CardContent>
      </Card>
      
      <Card data-testid="card-alerts-assigned">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex justify-between">
            Assignées à moi
            <User className="h-4 w-4 text-blue-500" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600" data-testid="count-alerts-assigned">
            {summary.assigned_to_me || 0}
          </div>
          <p className="text-xs text-muted-foreground">Mes alertes</p>
        </CardContent>
      </Card>
      
      <Card data-testid="card-alerts-resolved">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex justify-between">
            Résolues (7j)
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600" data-testid="count-alerts-resolved">
            {summary.resolved_this_week || 0}
          </div>
          <p className="text-xs text-muted-foreground">Performance</p>
        </CardContent>
      </Card>
    </div>
  );
}