import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { AlertTriangle, Clock, User, MoreHorizontal, Eye, CheckCircle, AlertCircle, Zap } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useBusinessAlerts, useAcknowledgeAlert, useResolveAlert } from '@/hooks/useBusinessAlerts';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

// Données mock temporaires pour POC
const mockAlerts = [
  {
    id: 'alert_001',
    title: 'Marge bénéficiaire faible',
    message: 'Projet avec marge 12% (seuil: 15%)',
    severity: 'warning',
    alert_type: 'profitability',
    entity_name: 'Fenêtres Villa Moderne',
    status: 'open',
    triggered_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    assigned_to_user_id: null
  },
  {
    id: 'alert_002',
    title: 'Surcharge équipe critique',
    message: 'Équipe Jean-Luc à 110% de charge',
    severity: 'critical',
    alert_type: 'team_overload',
    entity_name: 'Équipe Jean-Luc',
    status: 'open',
    triggered_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    assigned_to_user_id: 'user_1'
  },
  {
    id: 'alert_003',
    title: 'Échéance proche',
    message: 'Deadline projet dans 3 jours',
    severity: 'warning',
    alert_type: 'deadline_critical',
    entity_name: 'Rénovation Bureau',
    status: 'acknowledged',
    triggered_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    assigned_to_user_id: 'user_2'
  }
];

// Schémas de validation
const acknowledgeSchema = z.object({
  notes: z.string().optional()
});

const resolveSchema = z.object({
  resolution_notes: z.string().min(10, 'Les notes de résolution sont requises (min 10 caractères)')
});

type AcknowledgeFormData = z.infer<typeof acknowledgeSchema>;
type ResolveFormData = z.infer<typeof resolveSchema>;

// Utilitaires
const getSeverityIcon = (severity: string) => {
  switch (severity) {
    case 'critical': return <Zap className="h-4 w-4 text-red-500" />;
    case 'warning': return <AlertTriangle className="h-4 w-4 text-orange-500" />;
    case 'info': return <AlertCircle className="h-4 w-4 text-blue-500" />;
    default: return <AlertCircle className="h-4 w-4 text-gray-500" />;
  }
};

const getSeverityVariant = (severity: string) => {
  switch (severity) {
    case 'critical': return 'destructive';
    case 'warning': return 'secondary';
    case 'info': return 'outline';
    default: return 'outline';
  }
};

const getStatusVariant = (status: string) => {
  switch (status) {
    case 'open': return 'destructive';
    case 'acknowledged': return 'secondary';
    case 'resolved': return 'default';
    default: return 'outline';
  }
};

// Dialog Détails Alerte
function AlertDetailsDialog({ alert, children }: { alert: any; children: React.ReactNode }) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl" data-testid="dialog-alert-details">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getSeverityIcon(alert.severity)}
            Détails de l'alerte
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Titre</label>
              <p className="font-medium">{alert.title}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Sévérité</label>
              <Badge variant={getSeverityVariant(alert.severity)} className="capitalize">
                {alert.severity}
              </Badge>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Message</label>
            <p className="text-sm bg-muted p-3 rounded-md">{alert.message}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Entité</label>
              <p className="text-sm">{alert.entity_name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Déclenchée</label>
              <p className="text-sm">
                {formatDistanceToNow(new Date(alert.triggered_at), { locale: fr, addSuffix: true })}
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Dialog Accusé Réception
function AcknowledgeDialog({ alert, children }: { alert: any; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const acknowledgeAlert = useAcknowledgeAlert();
  
  const form = useForm<AcknowledgeFormData>({
    resolver: zodResolver(acknowledgeSchema),
    defaultValues: { notes: '' }
  });

  const onSubmit = async (data: AcknowledgeFormData) => {
    try {
      await acknowledgeAlert.mutateAsync({
        alertId: alert.id,
        notes: data.notes
      });
      setOpen(false);
      form.reset();
    } catch (error) {
      console.error('Erreur accusé réception:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent data-testid="dialog-acknowledge">
        <DialogHeader>
          <DialogTitle>Accusé de réception</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="text-sm bg-muted p-3 rounded-md">
              <strong>{alert.title}</strong>
              <p className="text-muted-foreground mt-1">{alert.message}</p>
            </div>
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (optionnel)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Ajouter des notes..."
                      data-testid="textarea-ack-notes"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setOpen(false)}
                data-testid="button-cancel-ack"
              >
                Annuler
              </Button>
              <Button 
                type="submit" 
                disabled={acknowledgeAlert.isPending}
                data-testid="button-confirm-ack"
              >
                {acknowledgeAlert.isPending ? 'Traitement...' : 'Accuser réception'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// Dialog Résolution
function ResolveDialog({ alert, children }: { alert: any; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const resolveAlert = useResolveAlert();
  
  const form = useForm<ResolveFormData>({
    resolver: zodResolver(resolveSchema),
    defaultValues: { resolution_notes: '' }
  });

  const onSubmit = async (data: ResolveFormData) => {
    try {
      await resolveAlert.mutateAsync({
        alertId: alert.id,
        resolution_notes: data.resolution_notes
      });
      setOpen(false);
      form.reset();
    } catch (error) {
      console.error('Erreur résolution:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent data-testid="dialog-resolve">
        <DialogHeader>
          <DialogTitle>Résoudre l'alerte</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="text-sm bg-muted p-3 rounded-md">
              <strong>{alert.title}</strong>
              <p className="text-muted-foreground mt-1">{alert.message}</p>
            </div>
            <FormField
              control={form.control}
              name="resolution_notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes de résolution *</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Décrivez les actions prises pour résoudre l'alerte..."
                      data-testid="textarea-resolution-notes"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setOpen(false)}
                data-testid="button-cancel-resolve"
              >
                Annuler
              </Button>
              <Button 
                type="submit" 
                disabled={resolveAlert.isPending}
                data-testid="button-confirm-resolve"
              >
                {resolveAlert.isPending ? 'Résolution...' : 'Résoudre'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// Composant principal
export function BusinessAlertsList() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  
  const { data: alertsData, isLoading } = useBusinessAlerts();
  
  // Utiliser les données mock si pas d'API
  const alerts = alertsData?.alerts || mockAlerts;
  
  const filteredAlerts = alerts.filter((alert: any) => {
    if (statusFilter !== 'all' && alert.status !== statusFilter) return false;
    if (severityFilter !== 'all' && alert.severity !== severityFilter) return false;
    return true;
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Liste des Alertes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="business-alerts-list">
      <CardHeader>
        <CardTitle>Liste des Alertes</CardTitle>
        <div className="flex gap-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40" data-testid="filter-status">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous statuts</SelectItem>
              <SelectItem value="open">Ouvertes</SelectItem>
              <SelectItem value="acknowledged">Accusées</SelectItem>
              <SelectItem value="resolved">Résolues</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-40" data-testid="filter-severity">
              <SelectValue placeholder="Sévérité" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes sévérités</SelectItem>
              <SelectItem value="critical">Critique</SelectItem>
              <SelectItem value="warning">Avertissement</SelectItem>
              <SelectItem value="info">Information</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Alerte</TableHead>
              <TableHead>Sévérité</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Entité</TableHead>
              <TableHead>Déclenchée</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAlerts.map((alert: any) => (
              <TableRow key={alert.id} data-testid={`alert-row-${alert.id}`}>
                <TableCell>
                  <div>
                    <div className="font-medium">{alert.title}</div>
                    <div className="text-sm text-muted-foreground truncate max-w-xs">
                      {alert.message}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={getSeverityVariant(alert.severity)} className="capitalize">
                    {alert.severity}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={getStatusVariant(alert.status)} className="capitalize">
                    {alert.status === 'open' ? 'Ouverte' : 
                     alert.status === 'acknowledged' ? 'Accusée' : 'Résolue'}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">{alert.entity_name}</TableCell>
                <TableCell className="text-sm">
                  {formatDistanceToNow(new Date(alert.triggered_at), { locale: fr, addSuffix: true })}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        data-testid={`actions-${alert.id}`}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <AlertDetailsDialog alert={alert}>
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                          <Eye className="w-4 h-4 mr-2" />
                          Voir détails
                        </DropdownMenuItem>
                      </AlertDetailsDialog>
                      
                      {alert.status === 'open' && (
                        <AcknowledgeDialog alert={alert}>
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Accuser réception
                          </DropdownMenuItem>
                        </AcknowledgeDialog>
                      )}
                      
                      {(alert.status === 'open' || alert.status === 'acknowledged') && (
                        <ResolveDialog alert={alert}>
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Résoudre
                          </DropdownMenuItem>
                        </ResolveDialog>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        
        {filteredAlerts.length === 0 && (
          <div className="text-center py-8 text-muted-foreground" data-testid="no-alerts">
            Aucune alerte ne correspond aux filtres sélectionnés.
          </div>
        )}
      </CardContent>
    </Card>
  );
}