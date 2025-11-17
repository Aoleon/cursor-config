import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  ArrowRight,
  Calendar,
  User,
  Euro
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface ActionItem {
  id: string;
  label: string;
  description?: string;
  priority: 'high' | 'medium' | 'low';
  actionUrl: string;
  icon?: ReactNode;
  dueDate?: string;
}

interface MilestoneItem {
  id: string;
  label: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  completedAt?: string;
  blockedBy?: string;
}

interface RiskItem {
  id: string;
  label: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description?: string;
}

interface ActionableSummaryProps {
  title?: string;
  actions?: ActionItem[];
  milestones?: MilestoneItem[];
  risks?: RiskItem[];
  nextActions?: ActionItem[];
  className?: string;
}

export function ActionableSummary({
  title = "Résumé Actionnable",
  actions = [],
  milestones = [],
  risks = [],
  nextActions = [],
  className = ""
}: ActionableSummaryProps) {
  const getPriorityVariant = (priority: ActionItem['priority']) => {
    switch (priority) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
    }
  };

  const getMilestoneStatusIcon = (status: MilestoneItem['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-primary" />;
      case 'blocked':
        return <AlertTriangle className="h-4 w-4 text-error" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getRiskSeverityVariant = (severity: RiskItem['severity']) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return 'destructive';
      case 'medium':
      case 'low':
        return 'default';
    }
  };

  const hasContent = actions.length > 0 || milestones.length > 0 || risks.length > 0 || nextActions.length > 0;

  if (!hasContent) {
    return null;
  }

  return (
    <Card className={className}>
      <CardContent className="p-6 space-y-4">
        <h3 className="text-lg font-semibold mb-4">{title}</h3>

        {/* Actions Urgentes */}
        {actions.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-on-surface-muted flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-error" />
              Actions Requises
            </h4>
            <div className="space-y-2">
              {actions
                .filter(a => a.priority === 'high')
                .map((action) => (
                  <Alert key={action.id} variant="destructive" className="py-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {action.icon}
                          <span className="font-medium">{action.label}</span>
                          <Badge variant={getPriorityVariant(action.priority)}>
                            Urgent
                          </Badge>
                        </div>
                        {action.description && (
                          <p className="text-sm mt-1">{action.description}</p>
                        )}
                        {action.dueDate && (
                          <p className="text-xs mt-1 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Échéance: {format(new Date(action.dueDate), 'dd/MM/yyyy', { locale: fr })}
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.location.href = action.actionUrl}
                      >
                        Agir <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  </Alert>
                ))}
            </div>
          </div>
        )}

        {/* Jalons */}
        {milestones.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-on-surface-muted">Jalons Clés</h4>
            <div className="space-y-2">
              {milestones.map((milestone) => (
                <div
                  key={milestone.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {getMilestoneStatusIcon(milestone.status)}
                    <div>
                      <p className="text-sm font-medium">{milestone.label}</p>
                      {milestone.status === 'blocked' && milestone.blockedBy && (
                        <p className="text-xs text-on-surface-muted">
                          Bloqué par: {milestone.blockedBy}
                        </p>
                      )}
                      {milestone.status === 'completed' && milestone.completedAt && (
                        <p className="text-xs text-on-surface-muted">
                          Complété le {format(new Date(milestone.completedAt), 'dd/MM/yyyy', { locale: fr })}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge
                    variant={
                      milestone.status === 'completed'
                        ? 'default'
                        : milestone.status === 'blocked'
                        ? 'destructive'
                        : 'secondary'
                    }
                  >
                    {milestone.status === 'completed'
                      ? 'Terminé'
                      : milestone.status === 'blocked'
                      ? 'Bloqué'
                      : milestone.status === 'in_progress'
                      ? 'En cours'
                      : 'En attente'}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Risques */}
        {risks.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-on-surface-muted flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Risques Identifiés
            </h4>
            <div className="space-y-2">
              {risks
                .filter(r => r.severity === 'critical' || r.severity === 'high')
                .map((risk) => (
                  <Alert key={risk.id} variant={getRiskSeverityVariant(risk.severity)}>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{risk.label}</p>
                          {risk.description && (
                            <p className="text-sm mt-1">{risk.description}</p>
                          )}
                        </div>
                        <Badge variant={getRiskSeverityVariant(risk.severity)}>
                          {risk.severity === 'critical' ? 'Critique' : 'Élevé'}
                        </Badge>
                      </div>
                    </AlertDescription>
                  </Alert>
                ))}
            </div>
          </div>
        )}

        {/* Prochaines Actions */}
        {nextActions.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-on-surface-muted">Prochaines Actions</h4>
            <div className="space-y-2">
              {nextActions.slice(0, 3).map((action) => (
                <div
                  key={action.id}
                  className="flex items-center justify-between p-2 border rounded-lg hover:bg-surface-muted transition-colors"
                >
                  <div className="flex items-center gap-2 flex-1">
                    {action.icon || <ArrowRight className="h-4 w-4 text-muted-foreground" />}
                    <div className="flex-1">
                      <p className="text-sm font-medium">{action.label}</p>
                      {action.description && (
                        <p className="text-xs text-on-surface-muted">{action.description}</p>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => window.location.href = action.actionUrl}
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

