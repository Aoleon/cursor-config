import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useDateAlerts } from '@/hooks/use-date-alerts';
import type { DateAlert } from '@shared/schema';

interface DateAlertsContextValue {
  alerts: DateAlert[];
  loading: boolean;
  criticalCount: number;
  warningCount: number;
  actionRequiredCount: number;
  // Actions
  acknowledgeAlert: (alertId: string, note?: string) => Promise<void>;
  resolveAlert: (alertId: string, actionTaken: string, resolution?: string) => Promise<void>;
  escalateAlert: (alertId: string, escalationLevel: 'manager' | 'director' | 'critical', reason: string, urgency?: 'normal' | 'high' | 'immediate') => Promise<void>;
  triggerDetection: (detectionType?: 'full' | 'delays' | 'conflicts' | 'deadlines' | 'optimizations', projectId?: string, daysAhead?: number) => Promise<void>;
  // Dashboard data
  dashboardData: any;
  refreshDashboard: () => void;
  // Summary data  
  summaryData: any;
  refreshSummary: () => void;
}

const DateAlertsContext = createContext<DateAlertsContextValue | null>(null);

interface DateAlertsProviderProps {
  children: React.ReactNode;
  enableRealtimeToasts?: boolean;
}

export function DateAlertsProvider({ 
  children, 
  enableRealtimeToasts = true 
}: DateAlertsProviderProps) {
  const queryClient = useQueryClient();
  
  // Hook principal pour alertes temps réel
  const {
    alerts,
    loading,
    acknowledgeAlert,
    resolveAlert,
    escalateAlert,
    triggerDetection,
    criticalAlertsCount,
    warningAlertsCount,
    actionRequiredCount
  } = useDateAlerts({
    enableToasts: enableRealtimeToasts,
    showCriticalOnly: false
  });

  // Requête pour dashboard
  const {
    data: dashboardData,
    refetch: refreshDashboard,
  } = useQuery({
    queryKey: ['api', 'date-alerts', 'dashboard'],
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // Actualisation auto toutes les 10 minutes
  });

  // Requête pour résumé des alertes
  const {
    data: summaryData,
    refetch: refreshSummary,
  } = useQuery({
    queryKey: ['api', 'date-alerts', 'summary?period=today&groupBy=type'],
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // Actualisation auto toutes les 5 minutes
  });

  // Auto-refresh intelligent basé sur les nouvelles alertes
  useEffect(() => {
    if (alerts.length > 0) {
      // Si de nouvelles alertes arrivent, actualiser le dashboard après un délai
      const timer = setTimeout(() => {
        refreshDashboard();
        refreshSummary();
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [alerts.length, refreshDashboard, refreshSummary]);

  const value: DateAlertsContextValue = {
    alerts,
    loading,
    criticalCount: criticalAlertsCount,
    warningCount: warningAlertsCount,
    actionRequiredCount,
    acknowledgeAlert,
    resolveAlert,
    escalateAlert,
    triggerDetection,
    dashboardData: dashboardData?.data || {},
    refreshDashboard,
    summaryData: summaryData?.data || {},
    refreshSummary,
  };

  return (
    <DateAlertsContext.Provider value={value}>
      {children}
    </DateAlertsContext.Provider>
  );
}

// Hook pour utiliser le contexte des alertes de dates
export const useDateAlertsContext = (): DateAlertsContextValue => {
  const context = useContext(DateAlertsContext);
  if (!context) {
    throw new Error('useDateAlertsContext must be used within a DateAlertsProvider');
  }
  return context;
};

// Hook pour statistiques rapides
export const useDateAlertsStats = () => {
  const context = useDateAlertsContext();
  return {
    totalAlerts: context.alerts.length,
    criticalCount: context.criticalCount,
    warningCount: context.warningCount,
    actionRequiredCount: context.actionRequiredCount,
    hasActiveAlerts: context.alerts.length > 0,
    hasCriticalAlerts: context.criticalCount > 0,
    needsAttention: context.actionRequiredCount > 0,
  };
};

// Hook pour actions rapides
export const useDateAlertsActions = () => {
  const context = useDateAlertsContext();
  return {
    acknowledgeAlert: context.acknowledgeAlert,
    resolveAlert: context.resolveAlert,
    escalateAlert: context.escalateAlert,
    triggerDetection: context.triggerDetection,
  };
};