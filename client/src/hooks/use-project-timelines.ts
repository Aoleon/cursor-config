import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { ProjectTimeline } from '@shared/schema';

export type TimeframeOption = '1_month' | '3_months' | '6_months' | '1_year';

export interface GanttFilters {
  phases: string[];
  priorities: string[];
  teams: string[];
  statuses: string[];
}

export interface TimelineUpdateData {
  startDate?: Date;
  endDate?: Date;
  calculatedDuration?: number;
  notes?: string;
}

// Hook principal pour la gestion des timelines de projet
export function useProjectTimelines(filters?: GanttFilters) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Query pour récupérer toutes les timelines avec filtres
  const {
    data: timelines,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['/api/project-timelines', filters],
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // Auto-refresh 10min
  });

  // Mutation pour mettre à jour une timeline
  const updateTimelineMutation = useMutation({
    mutationFn: ({ timelineId, updates }: { 
      timelineId: string; 
      updates: TimelineUpdateData;
    }) => apiRequest('PATCH', `/api/project-timelines/${timelineId}`, updates),
    
    onSuccess: (data, { timelineId }) => {
      // Invalider et refetch les timelines
      queryClient.invalidateQueries({ queryKey: ['/api/project-timelines'] });
      
      toast({
        title: "✅ Timeline mise à jour",
        description: "Les dates ont été recalculées avec succès",
        variant: "default",
      });
    },
    
    onError: (error: any) => {
      console.error('Erreur mise à jour timeline:', error);
      toast({
        title: "❌ Erreur",
        description: "Impossible de mettre à jour la timeline",
        variant: "destructive",
      });
    }
  });

  // Mutation pour recalculer en cascade à partir d'une phase
  const recalculateFromPhaseMutation = useMutation({
    mutationFn: ({ projectId, fromPhase, newDate }: {
      projectId: string;
      fromPhase: string;
      newDate: Date;
    }) => apiRequest('POST', `/api/projects/${projectId}/recalculate-timeline`, {
      fromPhase,
      newDate: newDate.toISOString(),
      propagateChanges: true
    }),
    
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/project-timelines'] });
      
      const { affectedPhases, totalDelayDays } = data.data || {};
      
      toast({
        title: "🔄 Recalcul en cascade terminé",
        description: `${affectedPhases?.length || 0} phase(s) affectée(s). ${totalDelayDays > 0 ? `Retard: ${totalDelayDays} jours` : 'Aucun retard'}`,
        variant: totalDelayDays > 5 ? "destructive" : "default",
        duration: 8000,
      });
    },
    
    onError: (error: any) => {
      toast({
        title: "❌ Erreur recalcul",
        description: "Impossible de recalculer la timeline",
        variant: "destructive",
      });
    }
  });

  // Utilitaires de filtrage local
  const getFilteredTimelines = (data: ProjectTimeline[] | undefined): ProjectTimeline[] => {
    if (!data || !filters) return data || [];

    return data.filter(timeline => {
      if (filters.phases.length > 0 && !filters.phases.includes(timeline.phase)) {
        return false;
      }
      
      if (filters.statuses.length > 0 && timeline.project?.status && !filters.statuses.includes(timeline.project.status)) {
        return false;
      }

      return true;
    });
  };

  // Statistiques des timelines
  const getTimelineStats = (data: ProjectTimeline[] | undefined) => {
    if (!data) return null;

    const activeTimelines = data.filter(t => t.project?.status && !['termine', 'archive', 'sav'].includes(t.project.status));
    
    return {
      total: data.length,
      active: activeTimelines.length,
      onTime: activeTimelines.filter(t => {
        if (!t.endDate) return true;
        return new Date(t.endDate) >= new Date();
      }).length,
      delayed: activeTimelines.filter(t => {
        if (!t.endDate) return false;
        return new Date(t.endDate) < new Date();
      }).length,
      phases: Object.groupBy(data, t => t.phase),
    };
  };

  return {
    // Données
    timelines: getFilteredTimelines(timelines?.data),
    allTimelines: timelines?.data || [],
    isLoading,
    error,
    
    // Actions
    updateTimeline: updateTimelineMutation.mutate,
    recalculateFromPhase: recalculateFromPhaseMutation.mutate,
    refreshTimelines: refetch,
    
    // États
    isUpdating: updateTimelineMutation.isPending,
    isRecalculating: recalculateFromPhaseMutation.isPending,
    
    // Statistiques
    stats: getTimelineStats(timelines?.data),
  };
}

// Hook spécialisé pour une timeline spécifique
export function useProjectTimeline(timelineId: string) {
  const queryClient = useQueryClient();

  const { data: timeline, isLoading } = useQuery({
    queryKey: ['api', 'project-timelines', timelineId],
    enabled: !!timelineId,
  });

  return {
    timeline: timeline?.data,
    isLoading,
    refresh: () => queryClient.invalidateQueries({ 
      queryKey: ['api', 'project-timelines', timelineId] 
    }),
  };
}

// Hook pour les timelines d'un projet spécifique
export function useProjectTimelinesForProject(projectId: string) {
  const { timelines, isLoading, ...rest } = useProjectTimelines();

  const projectTimelines = timelines.filter(t => t.projectId === projectId);
  
  // Calcul durée totale projet
  const totalProjectDuration = projectTimelines.reduce((acc, t) => {
    return acc + (t.calculatedDuration || 0);
  }, 0);

  // Phases en cours ou en retard
  const currentPhase = projectTimelines.find(t => {
    const now = new Date();
    const start = t.startDate ? new Date(t.startDate) : null;
    const end = t.endDate ? new Date(t.endDate) : null;
    
    return start && end && start <= now && now <= end;
  });

  return {
    ...rest,
    projectTimelines,
    totalProjectDuration,
    currentPhase,
    isLoading,
  };
}