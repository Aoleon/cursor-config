import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useWebSocket } from '@/providers/websocket-provider';
import type { RealtimeEvent, EventType } from '@shared/events';
import { EventType as EventTypeEnum, eventMessageTemplates } from '@shared/events';

interface NotificationOptions {
  enableToasts?: boolean;
  enableCacheInvalidation?: boolean;
  customHandler?: (event: RealtimeEvent) => void;
  eventFilter?: {
    types?: EventType[];
    entities?: string[];
    severities?: ('info' | 'warning' | 'success' | 'error')[];
  };
}

const defaultOptions: NotificationOptions = {
  enableToasts: true,
  enableCacheInvalidation: true,
};

export function useRealtimeNotifications(options: NotificationOptions = {}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isConnected, lastEvent } = useWebSocket();
  
  const mergedOptions = { ...defaultOptions, ...options };

  const getToastVariant = (severity: RealtimeEvent['severity']) => {
    switch (severity) {
      case 'success':
        return 'default'; // shadcn/ui uses 'default' for success
      case 'error':
        return 'destructive';
      case 'warning':
        return 'default'; // You can customize this if you have a warning variant
      case 'info':
      default:
        return 'default';
    }
  };

  const getToastDuration = (severity: RealtimeEvent['severity']) => {
    switch (severity) {
      case 'error':
        return 10000; // 10s for errors (longer visibility)
      case 'warning':
        return 8000; // 8s for warnings
      case 'success':
        return 6000; // 6s for success
      case 'info':
      default:
        return 5000; // 5s for info
    }
  };

  const getEventIcon = (eventType: EventType): string => {
    switch (eventType) {
      case EventTypeEnum.OFFER_SIGNED:
        return '✅';
      case EventTypeEnum.OFFER_VALIDATED:
        return '🎯';
      case EventTypeEnum.OFFER_STATUS_CHANGED:
        return '📋';
      case EventTypeEnum.PROJECT_CREATED:
        return '🚀';
      case EventTypeEnum.PROJECT_STATUS_CHANGED:
        return '📊';
      case EventTypeEnum.TASK_OVERDUE:
        return '⚠️';
      case EventTypeEnum.TASK_STATUS_CHANGED:
        return '✓';
      case EventTypeEnum.TASK_DEADLINE_APPROACHING:
        return '📅';
      case EventTypeEnum.VALIDATION_MILESTONE_VALIDATED:
        return '✅';
      case EventTypeEnum.VALIDATION_MILESTONE_REJECTED:
        return '❌';
      case EventTypeEnum.CHIFFRAGE_COMPLETED:
        return '💰';
      case EventTypeEnum.SUPPLIER_QUOTE_RECEIVED:
        return '📦';
      case EventTypeEnum.SUPPLIER_REQUEST_SENT:
        return '📤';
      case EventTypeEnum.SUPPLIER_RESPONSE_RECEIVED:
        return '📥';
      case EventTypeEnum.KPI_REFRESH_HINT:
        return '📊';
      case EventTypeEnum.SYSTEM_MAINTENANCE:
        return '🔧';
      default:
        return '📢';
    }
  };

  const shouldShowEvent = (event: RealtimeEvent): boolean => {
    const { eventFilter } = mergedOptions;
    
    if (!eventFilter) return true;
    
    // Filter by event types
    if (eventFilter.types && !eventFilter.types.includes(event.type)) {
      return false;
    }
    
    // Filter by entities
    if (eventFilter.entities && !eventFilter.entities.includes(event.entity)) {
      return false;
    }
    
    // Filter by severities
    if (eventFilter.severities && !eventFilter.severities.includes(event.severity)) {
      return false;
    }
    
    return true;
  };

  const handleRealtimeEvent = useCallback((event: RealtimeEvent) => {
    console.log('Realtime notification received:', event.type, event.entityId);
    
    // Apply filtering
    if (!shouldShowEvent(event)) {
      return;
    }
    
    // Custom handler has priority
    if (mergedOptions.customHandler) {
      mergedOptions.customHandler(event);
      return;
    }
    
    // Show toast notification
    if (mergedOptions.enableToasts) {
      const template = eventMessageTemplates[event.type];
      const { title, message } = template ? template(event) : { 
        title: event.title || 'Notification', 
        message: event.message 
      };
      
      const icon = getEventIcon(event.type);
      
      toast({
        title: `${icon} ${title}`,
        description: event.entity === 'offer' && event.offerId ? 
          `${message} (Cliquer pour voir le détail)` : 
          message,
        variant: getToastVariant(event.severity),
        duration: getToastDuration(event.severity),
      });
    }
    
    // Invalidate affected query cache
    if (mergedOptions.enableCacheInvalidation && event.affectedQueryKeys) {
      event.affectedQueryKeys.forEach((queryKey) => {
        console.log('Invalidating query cache:', queryKey);
        queryClient.invalidateQueries({ 
          queryKey,
          exact: false // Allow partial matches for hierarchical keys
        });
      });
    }
    
  }, [toast, queryClient, mergedOptions]);

  // Listen to WebSocket events
  useEffect(() => {
    if (lastEvent) {
      handleRealtimeEvent(lastEvent);
    }
  }, [lastEvent, handleRealtimeEvent]);

  return {
    isConnected,
    lastEvent,
    handleEvent: handleRealtimeEvent,
  };
}

// Specialized hooks for specific use cases

export function useOfferNotifications() {
  return useRealtimeNotifications({
    eventFilter: {
      entities: ['offer'],
      types: [
        EventTypeEnum.OFFER_STATUS_CHANGED,
        EventTypeEnum.OFFER_SIGNED,
        EventTypeEnum.OFFER_VALIDATED,
        EventTypeEnum.OFFER_CREATED
      ]
    }
  });
}

export function useProjectNotifications() {
  return useRealtimeNotifications({
    eventFilter: {
      entities: ['project'],
      types: [
        EventTypeEnum.PROJECT_CREATED,
        EventTypeEnum.PROJECT_STATUS_CHANGED,
        EventTypeEnum.PROJECT_TASK_ASSIGNED
      ]
    }
  });
}

export function useTaskNotifications() {
  return useRealtimeNotifications({
    eventFilter: {
      entities: ['task'],
      types: [
        EventTypeEnum.TASK_OVERDUE,
        EventTypeEnum.TASK_STATUS_CHANGED,
        EventTypeEnum.TASK_DEADLINE_APPROACHING
      ]
    }
  });
}

export function useValidationNotifications() {
  return useRealtimeNotifications({
    eventFilter: {
      entities: ['validation'],
      types: [
        EventTypeEnum.VALIDATION_MILESTONE_VALIDATED,
        EventTypeEnum.VALIDATION_MILESTONE_REJECTED
      ]
    }
  });
}

export function useKpiNotifications() {
  return useRealtimeNotifications({
    enableToasts: false, // KPI updates are silent
    eventFilter: {
      entities: ['system'],
      types: [EventTypeEnum.KPI_REFRESH_HINT]
    }
  });
}

// Hook for critical notifications only (errors, overdue tasks, etc.)
export function useCriticalNotifications() {
  return useRealtimeNotifications({
    eventFilter: {
      severities: ['error', 'warning'],
      types: [
        EventTypeEnum.TASK_OVERDUE,
        EventTypeEnum.VALIDATION_MILESTONE_REJECTED,
        EventTypeEnum.SYSTEM_MAINTENANCE
      ]
    }
  });
}