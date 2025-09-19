import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  AlertTriangle, 
  Calendar, 
  Clock, 
  Users, 
  Cloud, 
  Building, 
  Target,
  BarChart3,
  CheckCircle,
  ArrowUp,
  X,
  Eye,
  MessageSquare
} from 'lucide-react';
import { useDateAlertsActions } from './DateAlertsProvider';
import type { DateAlert } from '@shared/schema';

// Types pour les props des composants
interface AlertsToastProps {
  alert: DateAlert;
  onDismiss?: () => void;
  showActions?: boolean;
  compact?: boolean;
}

interface AlertActionDialogProps {
  alert: DateAlert;
  actionType: 'acknowledge' | 'resolve' | 'escalate';
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
}

// Icônes spécialisées pour types d'alertes
const getAlertTypeIcon = (alertType: string, severity: string) => {
  const iconClass = severity === 'critical' ? 'text-red-500' : 
                   severity === 'warning' ? 'text-yellow-500' : 'text-blue-500';
                   
  switch (alertType) {
    case 'delay_risk':
      return <AlertTriangle className={`h-5 w-5 ${iconClass}`} />;
    case 'deadline_critical':
      return <Calendar className={`h-5 w-5 ${iconClass}`} />;
    case 'resource_conflict':
      return <Users className={`h-5 w-5 ${iconClass}`} />;
    case 'external_constraint':
      return <Cloud className={`h-5 w-5 ${iconClass}`} />;
    case 'phase_dependency':
      return <Building className={`h-5 w-5 ${iconClass}`} />;
    case 'optimization':
      return <Target className={`h-5 w-5 ${iconClass}`} />;
    case 'planning_conflict':
      return <BarChart3 className={`h-5 w-5 ${iconClass}`} />;
    default:
      return <Clock className={`h-5 w-5 ${iconClass}`} />;
  }
};

// Badge de sévérité avec couleurs
const SeverityBadge = ({ severity }: { severity: string }) => {
  const variants = {
    critical: 'destructive',
    warning: 'secondary',
    info: 'outline'
  } as const;
  
  return (
    <Badge 
      variant={variants[severity as keyof typeof variants] || 'outline'}
      className="text-xs"
      data-testid={`badge-severity-${severity}`}
    >
      {severity.toUpperCase()}
    </Badge>
  );
};

// Badge de statut
const StatusBadge = ({ status }: { status: string }) => {
  const variants = {
    pending: 'destructive',
    acknowledged: 'secondary',
    resolved: 'outline'
  } as const;
  
  const labels = {
    pending: 'EN ATTENTE',
    acknowledged: 'ACQUITTÉE',
    resolved: 'RÉSOLUE'
  };
  
  return (
    <Badge 
      variant={variants[status as keyof typeof variants] || 'outline'}
      className="text-xs"
      data-testid={`badge-status-${status}`}
    >
      {labels[status as keyof typeof labels] || status.toUpperCase()}
    </Badge>
  );
};

// Dialog pour actions sur alertes
const AlertActionDialog = ({ alert, actionType, isOpen, onClose, onSubmit }: AlertActionDialogProps) => {
  const [note, setNote] = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [resolution, setResolution] = useState('');
  const [escalationLevel, setEscalationLevel] = useState<'manager' | 'director' | 'critical'>('manager');
  const [escalationReason, setEscalationReason] = useState('');
  const [urgency, setUrgency] = useState<'normal' | 'high' | 'immediate'>('high');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      let data: any = {};
      
      switch (actionType) {
        case 'acknowledge':
          data = { note };
          break;
        case 'resolve':
          data = { actionTaken, resolution };
          break;
        case 'escalate':
          data = { escalationLevel, reason: escalationReason, urgency };
          break;
      }
      
      await onSubmit(data);
      onClose();
      
      // Reset form
      setNote('');
      setActionTaken('');
      setResolution('');
      setEscalationReason('');
    } catch (error) {
      console.error('Erreur action alerte:', error);
    } finally {
      setLoading(false);
    }
  };

  const titles = {
    acknowledge: 'Acquitter l\'alerte',
    resolve: 'Résoudre l\'alerte',
    escalate: 'Escalader l\'alerte'
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent data-testid={`dialog-alert-${actionType}`}>
        <DialogHeader>
          <DialogTitle>{titles[actionType]}</DialogTitle>
          <DialogDescription>
            Alerte: {alert.title}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {actionType === 'acknowledge' && (
            <div>
              <Label htmlFor="note">Note (optionnelle)</Label>
              <Textarea
                id="note"
                placeholder="Ajouter une note à cette alerte..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                data-testid="input-acknowledge-note"
              />
            </div>
          )}
          
          {actionType === 'resolve' && (
            <>
              <div>
                <Label htmlFor="actionTaken">Action prise *</Label>
                <Textarea
                  id="actionTaken"
                  placeholder="Décrivez l'action qui a été prise pour résoudre cette alerte..."
                  value={actionTaken}
                  onChange={(e) => setActionTaken(e.target.value)}
                  required
                  data-testid="input-resolve-action"
                />
              </div>
              <div>
                <Label htmlFor="resolution">Résolution (optionnelle)</Label>
                <Textarea
                  id="resolution"
                  placeholder="Détails supplémentaires sur la résolution..."
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  data-testid="input-resolve-resolution"
                />
              </div>
            </>
          )}
          
          {actionType === 'escalate' && (
            <>
              <div>
                <Label htmlFor="escalationLevel">Niveau d'escalade</Label>
                <Select value={escalationLevel} onValueChange={setEscalationLevel}>
                  <SelectTrigger data-testid="select-escalation-level">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="director">Directeur</SelectItem>
                    <SelectItem value="critical">Critique (Emergency)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="urgency">Niveau d'urgence</Label>
                <Select value={urgency} onValueChange={setUrgency}>
                  <SelectTrigger data-testid="select-escalation-urgency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">Élevé</SelectItem>
                    <SelectItem value="immediate">Immédiat</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="escalationReason">Raison de l'escalade *</Label>
                <Textarea
                  id="escalationReason"
                  placeholder="Expliquez pourquoi cette alerte nécessite une escalade..."
                  value={escalationReason}
                  onChange={(e) => setEscalationReason(e.target.value)}
                  required
                  data-testid="input-escalation-reason"
                />
              </div>
            </>
          )}
        </div>
        
        <div className="flex justify-end space-x-2">
          <Button 
            variant="outline" 
            onClick={onClose}
            data-testid="button-cancel-action"
          >
            Annuler
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={loading || 
              (actionType === 'resolve' && !actionTaken) ||
              (actionType === 'escalate' && !escalationReason)
            }
            data-testid={`button-submit-${actionType}`}
          >
            {loading ? 'En cours...' : 
             actionType === 'acknowledge' ? 'Acquitter' :
             actionType === 'resolve' ? 'Résoudre' : 'Escalader'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Composant principal toast d'alerte
export const AlertsToast = ({ 
  alert, 
  onDismiss, 
  showActions = true, 
  compact = false 
}: AlertsToastProps) => {
  const { acknowledgeAlert, resolveAlert, escalateAlert } = useDateAlertsActions();
  const [activeDialog, setActiveDialog] = useState<'acknowledge' | 'resolve' | 'escalate' | null>(null);

  // Formatage de la date
  const formatDate = (date: Date | string | null) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Calcul du temps restant pour échéances
  const getTimeRemaining = (targetDate: Date | string | null) => {
    if (!targetDate) return null;
    
    const now = new Date();
    const target = new Date(targetDate);
    const diffTime = target.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return { text: `En retard de ${Math.abs(diffDays)} jour(s)`, color: 'text-red-600' };
    } else if (diffDays === 0) {
      return { text: 'Aujourd\'hui', color: 'text-orange-600' };
    } else if (diffDays === 1) {
      return { text: 'Demain', color: 'text-yellow-600' };
    } else if (diffDays <= 7) {
      return { text: `Dans ${diffDays} jour(s)`, color: 'text-yellow-600' };
    } else {
      return { text: `Dans ${diffDays} jour(s)`, color: 'text-blue-600' };
    }
  };

  const timeRemaining = getTimeRemaining(alert.targetDate);

  const handleAction = async (actionType: 'acknowledge' | 'resolve' | 'escalate', data: any) => {
    try {
      switch (actionType) {
        case 'acknowledge':
          await acknowledgeAlert(alert.id, data.note);
          break;
        case 'resolve':
          await resolveAlert(alert.id, data.actionTaken, data.resolution);
          break;
        case 'escalate':
          await escalateAlert(alert.id, data.escalationLevel, data.reason, data.urgency);
          break;
      }
    } catch (error) {
      console.error(`Erreur ${actionType}:`, error);
    }
  };

  if (compact) {
    return (
      <Card className="w-80 shadow-lg border-l-4 border-l-orange-500" data-testid={`alert-toast-compact-${alert.id}`}>
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {getAlertTypeIcon(alert.alertType, alert.severity)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{alert.title}</p>
                <div className="flex space-x-1 mt-1">
                  <SeverityBadge severity={alert.severity} />
                  <StatusBadge status={alert.status} />
                </div>
              </div>
            </div>
            {onDismiss && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onDismiss}
                data-testid="button-dismiss-compact"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="w-96 shadow-xl border-l-4 border-l-orange-500" data-testid={`alert-toast-${alert.id}`}>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-2">
              {getAlertTypeIcon(alert.alertType, alert.severity)}
              <div>
                <CardTitle className="text-lg">{alert.title}</CardTitle>
                <CardDescription className="text-sm text-muted-foreground">
                  {alert.entityType} • {formatDate(alert.createdAt)}
                </CardDescription>
              </div>
            </div>
            {onDismiss && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onDismiss}
                data-testid="button-dismiss"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          <div className="flex space-x-2">
            <SeverityBadge severity={alert.severity} />
            <StatusBadge status={alert.status} />
          </div>
        </CardHeader>

        <CardContent className="py-2">
          <p className="text-sm text-gray-700 mb-3">{alert.message}</p>
          
          {alert.targetDate && timeRemaining && (
            <div className="flex items-center space-x-2 text-sm mb-3">
              <Calendar className="h-4 w-4" />
              <span>Échéance: {formatDate(alert.targetDate)}</span>
              <span className={`font-medium ${timeRemaining.color}`}>
                ({timeRemaining.text})
              </span>
            </div>
          )}
          
          {alert.phase && (
            <div className="flex items-center space-x-2 text-sm mb-3">
              <BarChart3 className="h-4 w-4" />
              <span>Phase: {alert.phase}</span>
            </div>
          )}

          {alert.suggestedActions && alert.suggestedActions.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-medium text-gray-600 mb-2">Actions recommandées:</p>
              <ScrollArea className="h-16">
                <ul className="text-xs space-y-1">
                  {alert.suggestedActions.map((action, index) => (
                    <li key={index} className="flex items-center space-x-1">
                      <Target className="h-3 w-3 text-blue-500" />
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            </div>
          )}
        </CardContent>

        {showActions && alert.status !== 'resolved' && (
          <CardFooter className="pt-2">
            <div className="flex space-x-2 w-full">
              {alert.status === 'pending' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveDialog('acknowledge')}
                  data-testid="button-acknowledge"
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Acquitter
                </Button>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveDialog('resolve')}
                data-testid="button-resolve"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Résoudre
              </Button>
              
              {alert.severity !== 'critical' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveDialog('escalate')}
                  data-testid="button-escalate"
                >
                  <ArrowUp className="h-4 w-4 mr-1" />
                  Escalader
                </Button>
              )}
            </div>
          </CardFooter>
        )}
      </Card>

      {/* Dialogs pour actions */}
      {activeDialog && (
        <AlertActionDialog
          alert={alert}
          actionType={activeDialog}
          isOpen={true}
          onClose={() => setActiveDialog(null)}
          onSubmit={(data) => handleAction(activeDialog, data)}
        />
      )}
    </>
  );
};

// Composant pour liste d'alertes
interface AlertsListProps {
  alerts: DateAlert[];
  onDismiss?: (alertId: string) => void;
  showActions?: boolean;
  compact?: boolean;
  maxHeight?: string;
}

export const AlertsList = ({ 
  alerts, 
  onDismiss, 
  showActions = true, 
  compact = false,
  maxHeight = "400px"
}: AlertsListProps) => {
  if (alerts.length === 0) {
    return (
      <Card className="w-full" data-testid="alerts-list-empty">
        <CardContent className="p-6 text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <p className="text-muted-foreground">Aucune alerte active</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full" data-testid="alerts-list">
      <ScrollArea className={`w-full`} style={{ maxHeight }}>
        <div className="space-y-3">
          {alerts.map((alert) => (
            <AlertsToast
              key={alert.id}
              alert={alert}
              onDismiss={onDismiss ? () => onDismiss(alert.id) : undefined}
              showActions={showActions}
              compact={compact}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default AlertsToast;