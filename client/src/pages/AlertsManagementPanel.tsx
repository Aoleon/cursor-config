import { useState, useMemo } from 'react';
import { useDateAlertsContext } from '@/components/alerts/DateAlertsProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  Search,
  MoreVertical,
  ArrowUpCircle,
  CheckCheck,
  Trash2,
  Eye,
  Calendar,
  User,
  AlertOctagon,
  TrendingUp,
  Download,
  RefreshCw,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { DateAlert } from '@shared/schema';

// Types pour les filtres
interface AlertFilter {
  severity: string[];
  type: string[];
  status: string[];
  entityType: string[];
  search: string;
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
}

// Composant pour les filtres d'alertes
function AlertsFilters({ 
  filters, 
  onChange 
}: { 
  filters: AlertFilter; 
  onChange: (filters: AlertFilter) => void; 
}) {
  const severityOptions = [
    { value: 'critical', label: 'Critique', color: 'text-red-600' },
    { value: 'high', label: 'Élevé', color: 'text-orange-600' },
    { value: 'warning', label: 'Avertissement', color: 'text-yellow-600' },
    { value: 'info', label: 'Information', color: 'text-blue-600' },
  ];

  const typeOptions = [
    { value: 'delay_risk', label: 'Risque de retard' },
    { value: 'deadline_critical', label: 'Échéance critique' },
    { value: 'resource_conflict', label: 'Conflit ressources' },
    { value: 'external_constraint', label: 'Contrainte externe' },
    { value: 'phase_dependency', label: 'Dépendance phase' },
    { value: 'optimization', label: 'Optimisation' },
  ];

  const statusOptions = [
    { value: 'pending', label: 'En attente', icon: Clock },
    { value: 'acknowledged', label: 'Acquittée', icon: CheckCircle2 },
    { value: 'resolved', label: 'Résolue', icon: CheckCheck },
    { value: 'expired', label: 'Expirée', icon: XCircle },
  ];

  const toggleFilter = <T extends keyof AlertFilter>(
    filterKey: T,
    value: string,
    currentFilters: AlertFilter[T]
  ) => {
    if (Array.isArray(currentFilters)) {
      const newFilters = currentFilters.includes(value)
        ? currentFilters.filter(item => item !== value)
        : [...currentFilters, value];
      onChange({ ...filters, [filterKey]: newFilters });
    }
  };

  const resetFilters = () => {
    onChange({
      severity: [],
      type: [],
      status: ['pending'], // Garder pending par défaut
      entityType: [],
      search: '',
      dateRange: { start: null, end: null },
    });
  };

  const activeFiltersCount = [
    ...filters.severity,
    ...filters.type,
    ...filters.status,
    ...filters.entityType,
  ].length + (filters.search ? 1 : 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtres
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{activeFiltersCount} filtres</Badge>
            <Button variant="outline" size="sm" onClick={resetFilters} data-testid="button-reset-filters">
              <RefreshCw className="h-4 w-4 mr-2" />
              Réinitialiser
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Recherche textuelle */}
        <div>
          <Label htmlFor="search">Recherche</Label>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="search"
              placeholder="Rechercher par titre, message, projet..."
              value={filters.search}
              onChange={(e) => onChange({ ...filters, search: e.target.value })}
              className="pl-8"
              data-testid="input-search-alerts"
            />
          </div>
        </div>

        <Tabs defaultValue="severity" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="severity">Sévérité</TabsTrigger>
            <TabsTrigger value="type">Type</TabsTrigger>
            <TabsTrigger value="status">Statut</TabsTrigger>
          </TabsList>

          {/* Filtres par sévérité */}
          <TabsContent value="severity" className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              {severityOptions.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`severity-${option.value}`}
                    checked={filters.severity.includes(option.value)}
                    onCheckedChange={() => toggleFilter('severity', option.value, filters.severity)}
                    data-testid={`filter-severity-${option.value}`}
                  />
                  <label
                    htmlFor={`severity-${option.value}`}
                    className={`text-sm font-medium ${option.color}`}
                  >
                    {option.label}
                  </label>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Filtres par type */}
          <TabsContent value="type" className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              {typeOptions.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`type-${option.value}`}
                    checked={filters.type.includes(option.value)}
                    onCheckedChange={() => toggleFilter('type', option.value, filters.type)}
                    data-testid={`filter-type-${option.value}`}
                  />
                  <label htmlFor={`type-${option.value}`} className="text-sm font-medium">
                    {option.label}
                  </label>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Filtres par statut */}
          <TabsContent value="status" className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              {statusOptions.map((option) => {
                const IconComponent = option.icon;
                return (
                  <div key={option.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`status-${option.value}`}
                      checked={filters.status.includes(option.value)}
                      onCheckedChange={() => toggleFilter('status', option.value, filters.status)}
                      data-testid={`filter-status-${option.value}`}
                    />
                    <label htmlFor={`status-${option.value}`} className="text-sm font-medium flex items-center gap-1">
                      <IconComponent className="h-4 w-4" />
                      {option.label}
                    </label>
                  </div>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// Composant pour les actions en lot
function BulkActionsToolbar({ 
  selectedAlerts, 
  onClearSelection,
  onBulkAction 
}: { 
  selectedAlerts: string[]; 
  onClearSelection: () => void;
  onBulkAction: (action: string, alertIds: string[]) => void;
}) {
  if (selectedAlerts.length === 0) return null;

  return (
    <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
      <CardContent className="flex items-center justify-between p-4">
        <div className="flex items-center gap-2">
          <CheckCheck className="h-4 w-4 text-blue-600" />
          <span className="font-medium text-blue-900 dark:text-blue-100">
            {selectedAlerts.length} alerte(s) sélectionnée(s)
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onBulkAction('acknowledge', selectedAlerts)}
            data-testid="button-bulk-acknowledge"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Acquitter
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onBulkAction('escalate', selectedAlerts)}
            data-testid="button-bulk-escalate"
          >
            <ArrowUpCircle className="h-4 w-4 mr-2" />
            Escalader
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onBulkAction('resolve', selectedAlerts)}
            data-testid="button-bulk-resolve"
          >
            <CheckCheck className="h-4 w-4 mr-2" />
            Résoudre
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            data-testid="button-clear-selection"
          >
            Annuler
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Composant table des alertes
function AlertsTable({ 
  alerts, 
  selectedAlerts,
  onSelectionChange,
  onAcknowledge,
  onResolve,
  onEscalate 
}: {
  alerts: DateAlert[];
  selectedAlerts: string[];
  onSelectionChange: (alertIds: string[]) => void;
  onAcknowledge: (alertId: string, note?: string) => void;
  onResolve: (alertId: string, actionTaken: string) => void;
  onEscalate: (alertId: string, level: 'manager' | 'director', reason: string) => void;
}) {
  const [actionDialog, setActionDialog] = useState<{
    type: 'acknowledge' | 'resolve' | 'escalate' | null;
    alertId: string | null;
  }>({ type: null, alertId: null });
  const [actionNote, setActionNote] = useState('');

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'warning':
        return <AlertOctagon className="h-4 w-4 text-yellow-500" />;
      case 'info':
        return <CheckCircle2 className="h-4 w-4 text-blue-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    const variants: Record<string, any> = {
      critical: 'destructive',
      high: 'destructive',
      warning: 'secondary',
      info: 'outline',
    };
    return variants[severity] || 'outline';
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(alerts.map(alert => alert.id));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectAlert = (alertId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedAlerts, alertId]);
    } else {
      onSelectionChange(selectedAlerts.filter(id => id !== alertId));
    }
  };

  const handleAction = () => {
    if (!actionDialog.alertId) return;

    switch (actionDialog.type) {
      case 'acknowledge':
        onAcknowledge(actionDialog.alertId, actionNote);
        break;
      case 'resolve':
        onResolve(actionDialog.alertId, actionNote);
        break;
      case 'escalate':
        onEscalate(actionDialog.alertId, 'manager', actionNote);
        break;
    }

    setActionDialog({ type: null, alertId: null });
    setActionNote('');
  };

  if (alerts.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
          <p className="text-lg font-medium">Aucune alerte trouvée</p>
          <p className="text-sm text-muted-foreground">
            Aucune alerte ne correspond aux critères de filtrage actuels
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedAlerts.length === alerts.length && alerts.length > 0}
                  onCheckedChange={handleSelectAll}
                  data-testid="checkbox-select-all"
                />
              </TableHead>
              <TableHead>Sévérité</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Projet</TableHead>
              <TableHead>Phase</TableHead>
              <TableHead>Échéance</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Créée</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {alerts.map((alert) => (
              <TableRow key={alert.id} className={selectedAlerts.includes(alert.id) ? 'bg-accent' : ''}>
                <TableCell>
                  <Checkbox
                    checked={selectedAlerts.includes(alert.id)}
                    onCheckedChange={(checked) => handleSelectAlert(alert.id, checked as boolean)}
                    data-testid={`checkbox-alert-${alert.id}`}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getSeverityIcon(alert.severity)}
                    <Badge variant={getSeverityBadge(alert.severity)} className="text-xs">
                      {alert.severity.toUpperCase()}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm font-medium">
                    {alert.alertType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium text-sm truncate max-w-32" title={alert.title}>
                      {alert.title}
                    </p>
                    <p className="text-xs text-muted-foreground truncate max-w-32" title={alert.message}>
                      {alert.message}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  {alert.phase && (
                    <Badge variant="outline" className="text-xs capitalize">
                      {alert.phase.replace('_', ' ')}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {alert.targetDate ? (
                    <div className="text-sm">
                      <p>{format(new Date(alert.targetDate), 'dd/MM/yyyy', { locale: fr })}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(alert.targetDate), { locale: fr, addSuffix: true })}
                      </p>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">N/A</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={alert.status === 'pending' ? 'secondary' : 'outline'} className="text-xs">
                    {alert.status === 'pending' ? 'En attente' : 
                     alert.status === 'acknowledged' ? 'Acquittée' :
                     alert.status === 'resolved' ? 'Résolue' : 'Expirée'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="text-xs text-muted-foreground">
                    {alert.createdAt ? formatDistanceToNow(new Date(alert.createdAt), { locale: fr, addSuffix: true }) : 'N/A'}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {alert.status === 'pending' && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setActionDialog({ type: 'acknowledge', alertId: alert.id });
                          }}
                          data-testid={`button-ack-${alert.id}`}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setActionDialog({ type: 'resolve', alertId: alert.id });
                          }}
                          data-testid={`button-resolve-${alert.id}`}
                        >
                          <CheckCheck className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setActionDialog({ type: 'escalate', alertId: alert.id });
                          }}
                          data-testid={`button-escalate-${alert.id}`}
                        >
                          <ArrowUpCircle className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Dialog d'action */}
      <Dialog 
        open={actionDialog.type !== null} 
        onOpenChange={(open) => !open && setActionDialog({ type: null, alertId: null })}
      >
        <DialogContent data-testid="dialog-alert-action">
          <DialogHeader>
            <DialogTitle>
              {actionDialog.type === 'acknowledge' && 'Acquitter l\'alerte'}
              {actionDialog.type === 'resolve' && 'Résoudre l\'alerte'}
              {actionDialog.type === 'escalate' && 'Escalader l\'alerte'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="action-note">
                {actionDialog.type === 'resolve' ? 'Actions prises' : 'Note (optionnelle)'}
              </Label>
              <Textarea
                id="action-note"
                placeholder={
                  actionDialog.type === 'resolve' 
                    ? "Décrivez les actions prises pour résoudre l'alerte..." 
                    : "Ajouter une note explicative..."
                }
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
                data-testid="textarea-action-note"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setActionDialog({ type: null, alertId: null })}
                data-testid="button-cancel-action"
              >
                Annuler
              </Button>
              <Button
                onClick={handleAction}
                data-testid="button-confirm-action"
              >
                Confirmer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Composant principal AlertsManagementPanel
export default function AlertsManagementPanel() {
  const { alerts, acknowledgeAlert, resolveAlert, escalateAlert, refreshDashboard } = useDateAlertsContext();
  
  const [filters, setFilters] = useState<AlertFilter>({
    severity: [],
    type: [],
    status: ['pending'],
    entityType: [],
    search: '',
    dateRange: { start: null, end: null },
  });
  
  const [selectedAlerts, setSelectedAlerts] = useState<string[]>([]);

  // Filtrage des alertes
  const filteredAlerts = useMemo(() => {
    return alerts.filter(alert => {
      // Filtre par sévérité
      if (filters.severity.length > 0 && !filters.severity.includes(alert.severity)) {
        return false;
      }
      
      // Filtre par type
      if (filters.type.length > 0 && !filters.type.includes(alert.alertType)) {
        return false;
      }
      
      // Filtre par statut
      if (filters.status.length > 0 && alert.status && !filters.status.includes(alert.status)) {
        return false;
      }
      
      // Recherche textuelle
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        const searchableText = [
          alert.title,
          alert.message,
          alert.phase || '',
          alert.entityId || '',
        ].filter(Boolean).join(' ').toLowerCase();
        
        if (!searchableText.includes(searchTerm)) {
          return false;
        }
      }
      
      return true;
    });
  }, [alerts, filters]);

  // Actions en lot
  const handleBulkAction = async (action: string, alertIds: string[]) => {
    try {
      switch (action) {
        case 'acknowledge':
          for (const id of alertIds) {
            await acknowledgeAlert(id, 'Action en lot');
          }
          break;
        case 'resolve':
          for (const id of alertIds) {
            await resolveAlert(id, 'Résolution en lot');
          }
          break;
        case 'escalate':
          for (const id of alertIds) {
            await escalateAlert(id, 'manager', 'Escalade en lot');
          }
          break;
      }
      setSelectedAlerts([]);
      refreshDashboard();
    } catch (error) {
      console.error('Erreur action en lot:', error);
    }
  };

  // Statistiques des alertes
  const alertStats = useMemo(() => {
    const totalAlerts = filteredAlerts.length;
    const criticalAlerts = filteredAlerts.filter(a => a.severity === 'critical').length;
    const pendingAlerts = filteredAlerts.filter(a => a.status === 'pending').length;
    
    return { totalAlerts, criticalAlerts, pendingAlerts };
  }, [filteredAlerts]);

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* En-tête */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestion des Alertes</h1>
          <p className="text-muted-foreground">
            Surveillance et résolution des alertes du système d'intelligence temporelle
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={refreshDashboard} data-testid="button-refresh">
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
          <Button variant="outline" data-testid="button-export">
            <Download className="h-4 w-4 mr-2" />
            Exporter
          </Button>
        </div>
      </div>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center p-6">
            <AlertTriangle className="h-8 w-8 text-blue-600 mr-4" />
            <div>
              <p className="text-2xl font-bold">{alertStats.totalAlerts}</p>
              <p className="text-xs text-muted-foreground">Alertes filtrées</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center p-6">
            <XCircle className="h-8 w-8 text-red-600 mr-4" />
            <div>
              <p className="text-2xl font-bold">{alertStats.criticalAlerts}</p>
              <p className="text-xs text-muted-foreground">Alertes critiques</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center p-6">
            <Clock className="h-8 w-8 text-orange-600 mr-4" />
            <div>
              <p className="text-2xl font-bold">{alertStats.pendingAlerts}</p>
              <p className="text-xs text-muted-foreground">En attente</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtres */}
      <AlertsFilters filters={filters} onChange={setFilters} />

      {/* Actions en lot */}
      <BulkActionsToolbar 
        selectedAlerts={selectedAlerts}
        onClearSelection={() => setSelectedAlerts([])}
        onBulkAction={handleBulkAction}
      />

      {/* Table des alertes */}
      <AlertsTable
        alerts={filteredAlerts}
        selectedAlerts={selectedAlerts}
        onSelectionChange={setSelectedAlerts}
        onAcknowledge={acknowledgeAlert}
        onResolve={resolveAlert}
        onEscalate={escalateAlert}
      />
    </div>
  );
}