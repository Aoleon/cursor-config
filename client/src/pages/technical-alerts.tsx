import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, ShieldCheck, Clock, AlertTriangle, History } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Types pour les alertes techniques
interface TechnicalAlert {
  id: string;
  aoId: string;
  aoReference: string;
  score: number;
  triggeredCriteria: string[];
  status: 'pending' | 'acknowledged' | 'validated' | 'bypassed';
  assignedToUserId: string;
  createdAt: string;
  updatedAt: string;
  validatedAt?: string;
  validatedByUserId?: string;
  bypassUntil?: string;
  bypassReason?: string;
  rawEventData?: any;
}

interface TechnicalAlertHistory {
  id: string;
  alertId: string;
  action: string;
  actorUserId?: string;
  timestamp: string;
  note?: string;
  metadata?: any;
}

// Schema pour bypass
const bypassSchema = z.object({
  duration: z.enum(['24h', '7d', '30d', 'custom']),
  customUntil: z.string().optional(),
  reason: z.string().min(10, "La raison doit contenir au moins 10 caractères"),
});

type BypassFormData = z.infer<typeof bypassSchema>;

// Dialog Bypass
interface BypassDialogProps {
  alert: TechnicalAlert | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (until: string, reason: string) => void;
}

function BypassDialog({ alert, open, onOpenChange, onSave }: BypassDialogProps) {
  const form = useForm<BypassFormData>({
    resolver: zodResolver(bypassSchema),
    defaultValues: {
      duration: '24h',
      reason: ''
    }
  });

  const handleSubmit = (data: BypassFormData) => {
    let until: string;
    
    if (data.duration === 'custom' && data.customUntil) {
      until = data.customUntil;
    } else {
      const now = new Date();
      switch (data.duration) {
        case '24h':
          now.setHours(now.getHours() + 24);
          break;
        case '7d':
          now.setDate(now.getDate() + 7);
          break;
        case '30d':
          now.setDate(now.getDate() + 30);
          break;
      }
      until = now.toISOString();
    }
    
    onSave(until, data.reason);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="bypass-dialog" className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Bypass Temporaire - {alert?.aoReference}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="duration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Durée du bypass</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger data-testid="select-bypass-duration">
                      <SelectValue placeholder="Sélectionner une durée" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="24h">24 heures</SelectItem>
                      <SelectItem value="7d">7 jours</SelectItem>
                      <SelectItem value="30d">30 jours</SelectItem>
                      <SelectItem value="custom">Personnalisé</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            
            {form.watch('duration') === 'custom' && (
              <FormField
                control={form.control}
                name="customUntil"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date et heure de fin</FormLabel>
                    <Input
                      type="datetime-local"
                      {...field}
                      data-testid="input-custom-until"
                    />
                  </FormItem>
                )}
              />
            )}
            
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Raison du bypass</FormLabel>
                  <Textarea
                    {...field}
                    placeholder="Expliquez pourquoi vous souhaitez bypasser cette alerte..."
                    data-testid="textarea-bypass-reason"
                    rows={3}
                  />
                  {form.formState.errors.reason && (
                    <p className="text-sm text-destructive">{form.formState.errors.reason.message}</p>
                  )}
                </FormItem>
              )}
            />
            
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel-bypass"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                data-testid="button-confirm-bypass"
              >
                Confirmer le bypass
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// Helper pour le variant du badge selon le statut
function getStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case 'pending':
      return 'destructive';
    case 'acknowledged':
      return 'secondary';
    case 'validated':
      return 'default';
    case 'bypassed':
      return 'outline';
    default:
      return 'default';
  }
}

// Helper pour le libellé du statut
function getStatusLabel(status: string): string {
  switch (status) {
    case 'pending':
      return 'En attente';
    case 'acknowledged':
      return 'Acknowledgé';
    case 'validated':
      return 'Validé';
    case 'bypassed':
      return 'Bypassé';
    default:
      return status;
  }
}

// Composant principal
export default function TechnicalAlerts() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedAlert, setSelectedAlert] = useState<TechnicalAlert | null>(null);
  const [bypassDialogOpen, setBypassDialogOpen] = useState(false);
  const [selectedAlertHistory, setSelectedAlertHistory] = useState<string | null>(null);

  // Query pour récupérer les alertes techniques
  const { data: alerts, isLoading, error } = useQuery({
    queryKey: ['/api/technical-alerts'],
    queryFn: () => apiRequest('/api/technical-alerts').then(r => r.data),
  });

  // Query pour l'historique d'une alerte
  const { data: history } = useQuery({
    queryKey: ['/api/technical-alerts', selectedAlertHistory, 'history'],
    queryFn: () => selectedAlertHistory 
      ? apiRequest(`/api/technical-alerts/${selectedAlertHistory}/history`).then(r => r.data)
      : null,
    enabled: !!selectedAlertHistory,
  });

  // Mutations pour les actions
  const ackMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/technical-alerts/${id}/ack`, { method: 'PATCH' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/technical-alerts'] });
      toast({
        title: "Alerte acknowledgée",
        description: "L'alerte a été prise en compte avec succès.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'acknowledger l'alerte",
        variant: "destructive",
      });
    }
  });

  const validateMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/technical-alerts/${id}/validate`, { method: 'PATCH' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/technical-alerts'] });
      toast({
        title: "Alerte validée",
        description: "L'alerte a été validée avec succès.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de valider l'alerte",
        variant: "destructive",
      });
    }
  });

  const bypassMutation = useMutation({
    mutationFn: ({ id, until, reason }: { id: string; until: string; reason: string }) =>
      apiRequest(`/api/technical-alerts/${id}/bypass`, {
        method: 'PATCH',
        body: { until, reason }
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/technical-alerts'] });
      setBypassDialogOpen(false);
      setSelectedAlert(null);
      toast({
        title: "Alerte bypassée",
        description: "L'alerte a été bypassée temporairement.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de bypasser l'alerte",
        variant: "destructive",
      });
    }
  });

  // Handlers
  const handleAcknowledge = (alert: TechnicalAlert) => {
    ackMutation.mutate(alert.id);
  };

  const handleValidate = (alert: TechnicalAlert) => {
    validateMutation.mutate(alert.id);
  };

  const handleBypass = (alert: TechnicalAlert) => {
    setSelectedAlert(alert);
    setBypassDialogOpen(true);
  };

  const handleBypassSave = (until: string, reason: string) => {
    if (selectedAlert) {
      bypassMutation.mutate({
        id: selectedAlert.id,
        until,
        reason
      });
    }
  };

  const handleShowHistory = (alertId: string) => {
    setSelectedAlertHistory(alertId);
  };

  // WebSocket notifications - Simulé pour le POC
  useEffect(() => {
    // TODO: Intégrer avec WebSocket provider quand disponible
    const intervalId = setInterval(() => {
      // Refetch périodique pour simuler les notifications temps réel
      queryClient.invalidateQueries({ queryKey: ['/api/technical-alerts'] });
    }, 30000); // Toutes les 30 secondes

    return () => clearInterval(intervalId);
  }, []);

  // Gestion d'erreur
  if (error) {
    return (
      <div className="p-6">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
          <h3 className="text-lg font-semibold mb-2">Erreur de chargement</h3>
          <p className="text-muted-foreground">
            Impossible de charger les alertes techniques. Veuillez réessayer.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Validation Technique</h1>
          <p className="text-muted-foreground">
            Queue de validation pour Julien LAMBOROT
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          {alerts?.length || 0} alerte(s) en attente
        </Badge>
      </div>

      {/* Liste des alertes */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Skeleton className="h-9 w-32" />
                  <Skeleton className="h-9 w-24" />
                  <Skeleton className="h-9 w-24" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : alerts?.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucune alerte en attente</h3>
              <p className="text-muted-foreground">
                Toutes les alertes techniques ont été traitées.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {alerts?.map((alert: TechnicalAlert) => (
            <Card key={alert.id} data-testid={`alert-card-${alert.aoId}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">
                    {alert.aoReference} - Score: {alert.score}
                  </CardTitle>
                  <Badge variant={getStatusVariant(alert.status)} data-testid={`status-badge-${alert.aoId}`}>
                    {getStatusLabel(alert.status)}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  <p>Critères déclenchés: {alert.triggeredCriteria.join(', ')}</p>
                  <p>Créé le: {new Date(alert.createdAt).toLocaleString('fr-FR')}</p>
                  {alert.bypassUntil && (
                    <p className="text-orange-600">
                      Bypassé jusqu'au: {new Date(alert.bypassUntil).toLocaleString('fr-FR')}
                    </p>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {alert.status === 'pending' && (
                    <>
                      <Button
                        onClick={() => handleAcknowledge(alert)}
                        disabled={ackMutation.isPending}
                        data-testid={`button-ack-${alert.aoId}`}
                        variant="outline"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Acknowledge
                      </Button>
                      <Button
                        onClick={() => handleValidate(alert)}
                        disabled={validateMutation.isPending}
                        data-testid={`button-validate-${alert.aoId}`}
                      >
                        <ShieldCheck className="w-4 h-4 mr-2" />
                        Valider
                      </Button>
                      <Button
                        onClick={() => handleBypass(alert)}
                        disabled={bypassMutation.isPending}
                        variant="outline"
                        data-testid={`button-bypass-${alert.aoId}`}
                      >
                        <Clock className="w-4 h-4 mr-2" />
                        Bypass
                      </Button>
                    </>
                  )}
                  {alert.status === 'acknowledged' && (
                    <Button
                      onClick={() => handleValidate(alert)}
                      disabled={validateMutation.isPending}
                      data-testid={`button-validate-${alert.aoId}`}
                    >
                      <ShieldCheck className="w-4 h-4 mr-2" />
                      Valider
                    </Button>
                  )}
                  <Button
                    onClick={() => handleShowHistory(alert.id)}
                    variant="ghost"
                    size="sm"
                    data-testid={`button-history-${alert.aoId}`}
                  >
                    <History className="w-4 h-4 mr-2" />
                    Historique
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog Bypass */}
      <BypassDialog
        alert={selectedAlert}
        open={bypassDialogOpen}
        onOpenChange={setBypassDialogOpen}
        onSave={handleBypassSave}
      />

      {/* Dialog Historique */}
      <Dialog open={!!selectedAlertHistory} onOpenChange={() => setSelectedAlertHistory(null)}>
        <DialogContent data-testid="history-dialog" className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Historique des actions</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {history?.map((entry: TechnicalAlertHistory) => (
              <div key={entry.id} className="border-l-2 border-border pl-4 pb-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{entry.action}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(entry.timestamp).toLocaleString('fr-FR')}
                  </span>
                </div>
                {entry.note && (
                  <p className="text-sm text-muted-foreground mt-1">{entry.note}</p>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}