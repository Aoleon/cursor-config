import { useState, useMemo, useCallback } from "react";
import { 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  startOfMonth,
  endOfMonth,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  eachWeekOfInterval
} from "date-fns";
import type { ViewMode, PeriodInfo } from "@/types/gantt";

export interface UseGanttPeriodsProps {
  initialPeriod?: Date;
  initialViewMode?: ViewMode;
}

export interface UseGanttPeriodsReturn {
  // État actuel
  currentPeriod: Date;
  viewMode: ViewMode;
  
  // Informations calculées de la période
  periodInfo: PeriodInfo;
  
  // Actions de navigation
  goToPreviousPeriod: () => void;
  goToNextPeriod: () => void;
  goToCurrentPeriod: () => void;
  goToSpecificPeriod: (date: Date) => void;
  
  // Changement de mode de vue
  setViewMode: (mode: ViewMode) => void;
  
  // Utilitaires
  isCurrentPeriod: boolean;
  getPeriodLabel: () => string;
  getNextPeriodLabel: () => string;
  getPreviousPeriodLabel: () => string;
}

export function useGanttPeriods({
  initialPeriod = new Date(),
  initialViewMode = 'week'
}: UseGanttPeriodsProps = {}): UseGanttPeriodsReturn {
  
  const [currentPeriod, setCurrentPeriod] = useState<Date>(initialPeriod);
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode);

  // Calculer les informations de la période courante
  const periodInfo: PeriodInfo = useMemo(() => {
    const start = viewMode === 'week' 
      ? startOfWeek(currentPeriod, { weekStartsOn: 1 })
      : startOfMonth(currentPeriod);
    
    const end = viewMode === 'week'
      ? endOfWeek(currentPeriod, { weekStartsOn: 1 })
      : endOfMonth(currentPeriod);

    const days = eachDayOfInterval({ start, end });
    
    // Calculer le nombre de semaines pour la vue mensuelle
    const weeksInMonth = viewMode === 'month' 
      ? eachWeekOfInterval({ start, end }, { weekStartsOn: 1 }).length 
      : 0;

    return {
      periodStart: start,
      periodEnd: end,
      periodDays: days,
      totalDays: days.length,
      monthWeeksCount: weeksInMonth
    };
  }, [currentPeriod, viewMode]);

  // Navigation vers la période précédente
  const goToPreviousPeriod = useCallback(() => {
    setCurrentPeriod(prev => 
      viewMode === 'week' ? subWeeks(prev, 1) : subMonths(prev, 1)
    );
  }, [viewMode]);
  
  // Navigation vers la période suivante
  const goToNextPeriod = useCallback(() => {
    setCurrentPeriod(prev => 
      viewMode === 'week' ? addWeeks(prev, 1) : addMonths(prev, 1)
    );
  }, [viewMode]);
  
  // Navigation vers la période courante (aujourd'hui)
  const goToCurrentPeriod = useCallback(() => {
    setCurrentPeriod(new Date());
  }, []);

  // Navigation vers une période spécifique
  const goToSpecificPeriod = useCallback((date: Date) => {
    setCurrentPeriod(date);
  }, []);

  // Vérifier si on est sur la période courante (contient aujourd'hui)
  const isCurrentPeriod = useMemo(() => {
    const now = new Date();
    return now >= periodInfo.periodStart && now <= periodInfo.periodEnd;
  }, [periodInfo.periodStart, periodInfo.periodEnd]);

  // Obtenir le label de la période courante
  const getPeriodLabel = useCallback(() => {
    if (viewMode === 'week') {
      return `Semaine du ${periodInfo.periodStart.toLocaleDateString('fr-FR', { 
        day: '2-digit', 
        month: '2-digit' 
      })} au ${periodInfo.periodEnd.toLocaleDateString('fr-FR', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      })}`;
    } else {
      return periodInfo.periodStart.toLocaleDateString('fr-FR', { 
        month: 'long', 
        year: 'numeric' 
      });
    }
  }, [viewMode, periodInfo.periodStart, periodInfo.periodEnd]);

  // Obtenir le label de la période suivante
  const getNextPeriodLabel = useCallback(() => {
    const nextPeriod = viewMode === 'week' 
      ? addWeeks(currentPeriod, 1) 
      : addMonths(currentPeriod, 1);
    
    if (viewMode === 'week') {
      const nextStart = startOfWeek(nextPeriod, { weekStartsOn: 1 });
      const nextEnd = endOfWeek(nextPeriod, { weekStartsOn: 1 });
      return `Semaine du ${nextStart.toLocaleDateString('fr-FR', { 
        day: '2-digit', 
        month: '2-digit' 
      })} au ${nextEnd.toLocaleDateString('fr-FR', { 
        day: '2-digit', 
        month: '2-digit' 
      })}`;
    } else {
      return nextPeriod.toLocaleDateString('fr-FR', { 
        month: 'long', 
        year: 'numeric' 
      });
    }
  }, [viewMode, currentPeriod]);

  // Obtenir le label de la période précédente
  const getPreviousPeriodLabel = useCallback(() => {
    const prevPeriod = viewMode === 'week' 
      ? subWeeks(currentPeriod, 1) 
      : subMonths(currentPeriod, 1);
    
    if (viewMode === 'week') {
      const prevStart = startOfWeek(prevPeriod, { weekStartsOn: 1 });
      const prevEnd = endOfWeek(prevPeriod, { weekStartsOn: 1 });
      return `Semaine du ${prevStart.toLocaleDateString('fr-FR', { 
        day: '2-digit', 
        month: '2-digit' 
      })} au ${prevEnd.toLocaleDateString('fr-FR', { 
        day: '2-digit', 
        month: '2-digit' 
      })}`;
    } else {
      return prevPeriod.toLocaleDateString('fr-FR', { 
        month: 'long', 
        year: 'numeric' 
      });
    }
  }, [viewMode, currentPeriod]);

  return {
    // État
    currentPeriod,
    viewMode,
    
    // Informations calculées
    periodInfo,
    
    // Navigation
    goToPreviousPeriod,
    goToNextPeriod,
    goToCurrentPeriod,
    goToSpecificPeriod,
    
    // Mode de vue
    setViewMode,
    
    // Utilitaires
    isCurrentPeriod,
    getPeriodLabel,
    getNextPeriodLabel,
    getPreviousPeriodLabel
  };
}