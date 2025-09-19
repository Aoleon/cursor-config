import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useWebSocket } from '@/providers/websocket-provider';
import { useRealtimeNotifications } from '@/hooks/use-realtime-notifications';
import type { RealtimeEvent, EventType } from '@shared/events';
import { EventType as EventTypeEnum } from '@shared/events';
import type { DateAlert } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';

// Types spécialisés pour alertes de dates
interface DateAlertEvent extends RealtimeEvent {
  entity: 'date_intelligence';
  metadata: {
    alertType: string;
    phase?: string;
    targetDate?: string;
    affectedUsers?: string[];
    actionRequired?: boolean;
    alert?: DateAlert;
  };
}

interface DateAlertsOptions {
  enableToasts?: boolean;
  showCriticalOnly?: boolean;
  autoAcknowledge?: boolean;
  customAlertHandler?: (alert: DateAlert) => void;
}

const defaultOptions: DateAlertsOptions = {
  enableToasts: true,
  showCriticalOnly: false,
  autoAcknowledge: false,
};

// Hook principal pour la gestion des alertes de dates
export function useDateAlerts(options: DateAlertsOptions = {}) {
  const [alerts, setAlerts] = useState<DateAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const mergedOptions = { ...defaultOptions, ...options };

  // Icônes spécialisées pour alertes de dates
  const getDateAlertIcon = (alertType: string, severity: string): string => {
    switch (alertType) {
      case 'delay_risk':
        return severity === 'critical' ? '🚨' : '⚠️';
      case 'deadline_critical':
        return '📅';
      case 'resource_conflict':
        return '👥';
      case 'external_constraint':
        return '🌧️';
      case 'phase_dependency':
        return '🏛️';
      case 'optimization':
        return '🎯';
      case 'planning_conflict':
        return '📊';
      default:
        return '⏰';
    }
  };

  // Formatage des messages d'alertes spécialisés
  const formatAlertMessage = (alert: DateAlert): { title: string; description: string } => {
    const icon = getDateAlertIcon(alert.alertType, alert.severity);
    
    let title = `${icon} ${alert.title}`;
    let description = alert.message;

    switch (alert.alertType) {
      case 'delay_risk':
        description = `${alert.message} - Actions recommandées disponibles`;
        break;
      case 'deadline_critical':
        const targetDate = alert.targetDate ? new Date(alert.targetDate).toLocaleDateString('fr-FR') : 'N/A';
        description = `Échéance le ${targetDate} - ${alert.message}`;
        break;
      case 'resource_conflict':
        description = `Conflit de ressources détecté - ${alert.message}`;
        break;
      case 'external_constraint':
        description = `🌦️ Contrainte externe - ${alert.message}`;
        break;
      case 'phase_dependency':
        description = `📋 Dépendance de phase - ${alert.message}`;
        break;
      case 'optimization':
        description = `💡 Optimisation possible - ${alert.message}`;
        break;
    }

    return { title, description };
  };

  // Gestionnaire d'événements WebSocket spécialisé
  const handleDateAlertEvent = useCallback((event: RealtimeEvent) => {
    console.log('Date alert event received:', event.type, event.entityId);
    
    // Vérifier que c'est un événement d'alerte de date
    if (event.entity !== 'date_intelligence') {
      return;
    }

    const dateEvent = event as DateAlertEvent;
    
    // Extraire l'alerte des métadonnées ou la reconstruire
    let alert: DateAlert;
    if (dateEvent.metadata?.alert) {
      alert = dateEvent.metadata.alert;
    } else {
      // Reconstruire l'alerte depuis les données de l'événement
      alert = {
        id: `temp-${Date.now()}`,
        entityType: 'project', // par défaut
        entityId: event.entityId,
        alertType: dateEvent.metadata?.alertType || 'unknown',
        title: event.title || 'Alerte de date',
        message: event.message,
        severity: event.severity === 'error' ? 'critical' : 
                 event.severity === 'warning' ? 'warning' : 'info',
        status: 'pending',
        createdAt: new Date(),
        targetDate: dateEvent.metadata?.targetDate ? new Date(dateEvent.metadata.targetDate) : null,
        phase: dateEvent.metadata?.phase || null,
        suggestedActions: [],
        assignedTo: null,
        resolvedAt: null,
        actionTaken: null
      } as DateAlert;
    }

    // Filtrer selon les options
    if (mergedOptions.showCriticalOnly && alert.severity !== 'critical') {
      return;
    }

    // Gestionnaire personnalisé
    if (mergedOptions.customAlertHandler) {
      mergedOptions.customAlertHandler(alert);
      return;
    }

    // Ajouter l'alerte à la liste locale
    setAlerts(prev => [alert, ...prev.filter(a => a.id !== alert.id)]);

    // Afficher le toast
    if (mergedOptions.enableToasts) {
      const { title, description } = formatAlertMessage(alert);
      
      const variant = alert.severity === 'critical' ? 'destructive' : 'default';
      const duration = alert.severity === 'critical' ? 10000 : 
                      alert.severity === 'warning' ? 8000 : 6000;

      toast({
        title,
        description: `${description} ${alert.suggestedActions && alert.suggestedActions.length > 0 ? '(Actions disponibles)' : ''}`,
        variant,
        duration,
        action: alert.severity === 'critical' ? {
          children: "Détails",
          onClick: () => {
            console.log('Show alert details:', alert.id);
            // Ici on pourrait ouvrir une modal ou naviguer vers la page d'alertes
          }
        } : undefined,
      });
    }

    // Invalider le cache des alertes
    queryClient.invalidateQueries({ queryKey: ['api', 'date-alerts'] });
    
  }, [toast, queryClient, mergedOptions]);

  // Actions sur les alertes
  const acknowledgeAlert = useCallback(async (alertId: string, note?: string) => {
    try {
      setLoading(true);
      
      const response = await apiRequest('PUT', `/api/date-alerts/${alertId}/acknowledge`, { note: note || '' });
      
      const data = await response.json();
      if (data.success) {
        // Mettre à jour l'alerte locale
        setAlerts(prev => prev.map(alert => 
          alert.id === alertId 
            ? { ...alert, status: 'acknowledged' as const }
            : alert
        ));

        toast({
          title: "✅ Alerte acquittée",
          description: "L'alerte a été acquittée avec succès",
          variant: "default",
        });

        // Invalider le cache
        queryClient.invalidateQueries({ queryKey: ['api', 'date-alerts'] });
      }
    } catch (error: any) {
      console.error('Erreur acknowledgment alerte:', error);
      toast({
        title: "❌ Erreur",
        description: "Impossible d'acquitter l'alerte",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast, queryClient]);

  const resolveAlert = useCallback(async (alertId: string, actionTaken: string, resolution?: string) => {
    try {
      setLoading(true);
      
      const response = await apiRequest('PUT', `/api/date-alerts/${alertId}/resolve`, { actionTaken, resolution });
      
      const data = await response.json();
      if (data.success) {
        // Supprimer l'alerte de la liste locale (résolue)
        setAlerts(prev => prev.filter(alert => alert.id !== alertId));

        toast({
          title: "✅ Alerte résolue",
          description: "L'alerte a été marquée comme résolue",
          variant: "default",
        });

        // Invalider le cache
        queryClient.invalidateQueries({ queryKey: ['api', 'date-alerts'] });
      }
    } catch (error: any) {
      console.error('Erreur résolution alerte:', error);
      toast({
        title: "❌ Erreur",
        description: "Impossible de résoudre l'alerte",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast, queryClient]);

  const escalateAlert = useCallback(async (alertId: string, escalationLevel: 'manager' | 'director' | 'critical', reason: string, urgency: 'normal' | 'high' | 'immediate' = 'high') => {
    try {
      setLoading(true);
      
      const response = await apiRequest('POST', `/api/date-alerts/${alertId}/escalate`, { escalationLevel, reason, urgency });
      
      const data = await response.json();
      if (data.success) {
        // Mettre à jour l'alerte locale avec escalade
        setAlerts(prev => prev.map(alert => 
          alert.id === alertId 
            ? { ...alert, severity: urgency === 'immediate' ? 'critical' : alert.severity }
            : alert
        ));

        toast({
          title: "⬆️ Alerte escaladée",
          description: `Alerte escaladée au niveau ${escalationLevel}`,
          variant: urgency === 'immediate' ? "destructive" : "default",
        });

        // Invalider le cache
        queryClient.invalidateQueries({ queryKey: ['api', 'date-alerts'] });
      }
    } catch (error: any) {
      console.error('Erreur escalade alerte:', error);
      toast({
        title: "❌ Erreur",
        description: "Impossible d'escalader l'alerte",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast, queryClient]);

  // Déclencher une détection manuelle
  const triggerDetection = useCallback(async (
    detectionType: 'full' | 'delays' | 'conflicts' | 'deadlines' | 'optimizations' = 'full',
    projectId?: string,
    daysAhead?: number
  ) => {
    try {
      setLoading(true);
      
      const response = await apiRequest('POST', '/api/date-alerts/run-detection', { detectionType, projectId, daysAhead });
      
      const data = await response.json();
      if (data.success) {
        toast({
          title: "🔍 Détection lancée",
          description: `Détection ${detectionType} exécutée - ${data.data?.totalAlertsGenerated || 0} alerte(s) générée(s)`,
          variant: "default",
        });

        // Invalider le cache pour récupérer les nouvelles alertes
        queryClient.invalidateQueries({ queryKey: ['api', 'date-alerts'] });
      }
    } catch (error: any) {
      console.error('Erreur détection manuelle:', error);
      toast({
        title: "❌ Erreur détection",
        description: "Impossible de lancer la détection",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast, queryClient]);

  // Utiliser le hook de notifications temps réel
  useRealtimeNotifications({
    enableToasts: false, // On gère les toasts nous-mêmes
    enableCacheInvalidation: false, // On gère l'invalidation nous-mêmes
    customHandler: handleDateAlertEvent,
    eventFilter: {
      entities: ['date_intelligence', 'system'],
      // Types d'événements liés aux alertes de dates
      types: [
        'date_intelligence.alert_created' as EventType,
        'date_intelligence.alert_escalated' as EventType,
        'system.alert_critical' as EventType,
      ]
    }
  });

  return {
    alerts,
    loading,
    acknowledgeAlert,
    resolveAlert,
    escalateAlert,
    triggerDetection,
    // Statistiques
    criticalAlertsCount: (alerts || []).filter(a => a.severity === 'critical').length,
    warningAlertsCount: (alerts || []).filter(a => a.severity === 'warning').length,
    actionRequiredCount: (alerts || []).filter(a => a.suggestedActions && a.suggestedActions.length > 0).length,
  };
}

// Hook spécialisé pour les alertes critiques uniquement
export function useCriticalDateAlerts() {
  return useDateAlerts({
    showCriticalOnly: true,
    enableToasts: true,
  });
}

// Hook pour surveillance passive (sans toasts)
export function useDateAlertsMonitor() {
  return useDateAlerts({
    enableToasts: false,
    autoAcknowledge: false,
  });
}