import { useMemo } from "react";
import { addDays, format } from "date-fns";
import { fr } from "date-fns/locale";
import type { GanttItem, ViewMode, PeriodInfo } from "@/types/gantt";

export interface WorkloadProject {
  name: string;
  totalHours: number;
  projectDuration: number;
  overlapDays: number;
  proportionalHours: number;
  hoursPerDay: number;
}

export interface WorkloadPeriod {
  totalHours: number;
  estimatedPersons: number;
  activeProjects: number;
  periodStart: Date;
  periodEnd: Date;
  projectDetails: WorkloadProject[];
}

export interface WorkloadCalculation {
  [key: string]: WorkloadPeriod;
}

export interface ItemWorkload {
  itemId: string;
  itemName: string;
  totalHours: number;
  estimatedPersons: number;
  dailyDistribution: { [key: string]: number }; // key: date (YYYY-MM-DD), value: hours
  workloadPercentage: number; // 0-100%
  priority: 'low' | 'normal' | 'high' | 'critical';
}

export interface ItemWorkloadCalculation {
  [itemId: string]: ItemWorkload;
}

export interface UseGanttWorkloadProps {
  ganttItems: GanttItem[];
  periodInfo: PeriodInfo;
  viewMode: ViewMode;
  currentPeriod: Date;
  workingDaysPerWeek?: number;
  hoursPerWorkingDay?: number;
}

export interface UseGanttWorkloadReturn {
  // Calculs de charge
  teamWorkload: WorkloadCalculation;
  itemWorkloads: ItemWorkloadCalculation;
  
  // Utilitaires de présentation
  getWorkloadColor: (estimatedPersons: number) => string;
  getWorkloadTooltip: (workload: WorkloadPeriod) => string;
  getItemWorkloadColor: (workloadPercentage: number) => string;
  getItemWorkloadTooltip: (itemWorkload: ItemWorkload) => string;
  
  // Statistiques globales
  totalEstimatedPersons: number;
  totalActiveProjects: number;
  totalPlannedHours: number;
  
  // Configuration
  weeklyFteHours: number;
  workingDaysPerWeek: number;
  hoursPerWorkingDay: number;
}

export function useGanttWorkload({
  ganttItems,
  periodInfo,
  viewMode,
  currentPeriod,
  workingDaysPerWeek = 5, // Lundi à vendredi
  hoursPerWorkingDay = 8   // 8h par jour ouvrable
}: UseGanttWorkloadProps): UseGanttWorkloadReturn {

  const weeklyFteHours = workingDaysPerWeek * hoursPerWorkingDay; // 40h par semaine

  // Utilitaire pour calculer les jours ouvrables entre deux dates
  const getWorkingDaysBetween = (startDate: Date, endDate: Date): number => {
    let workingDays = 0;
    let current = new Date(startDate);
    
    while (current <= endDate) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Lundi (1) à vendredi (5)
        workingDays++;
      }
      current = addDays(current, 1);
    }
    
    return workingDays;
  };

  // Calcul optimisé de la charge d'équipe par période avec répartition proportionnelle
  const teamWorkload: WorkloadCalculation = useMemo(() => {
    const workloadByPeriod: WorkloadCalculation = {};

    // Filtrer les projets actifs (phases de production) avec dates valides
    const activeProjects = ganttItems.filter(item => 
      item.type === 'project' && 
      ['planification', 'approvisionnement', 'chantier'].includes(item.status) &&
      item.startDate && item.endDate // S'assurer que les dates existent
    );

    if (viewMode === 'week') {
      // Calcul par semaine avec répartition proportionnelle
      periodInfo.periodDays.forEach((day, index) => {
        if (index % 7 === 0) { // Une fois par semaine
          const weekStart = day;
          const weekEnd = addDays(weekStart, 6);
          const weekKey = format(weekStart, 'yyyy-MM-dd');
          
          let totalProportionalHours = 0;
          const projectDetails: WorkloadProject[] = [];
          
          activeProjects.forEach(project => {
            // S'assurer que les dates du projet existent
            if (!project.startDate || !project.endDate) return;
            
            // Vérifier s'il y a intersection entre le projet et la période
            const projectStart = new Date(Math.max(project.startDate.getTime(), weekStart.getTime()));
            const projectEnd = new Date(Math.min(project.endDate.getTime(), weekEnd.getTime()));
            
            if (projectStart <= projectEnd) {
              // Calcul de la durée totale du projet en jours ouvrables
              const projectDurationDays = getWorkingDaysBetween(project.startDate, project.endDate);
              
              // Calcul des jours d'overlap en jours ouvrables
              const overlapWorkingDays = getWorkingDaysBetween(projectStart, projectEnd);
              
              if (overlapWorkingDays > 0) {
                const estimatedHours = typeof project.estimatedHours === 'string' 
                  ? parseFloat(project.estimatedHours) || 0 
                  : project.estimatedHours || 0;
                
                // Répartition proportionnelle : heures par jour ouvrable
                const hoursPerWorkingDay = projectDurationDays > 0 ? estimatedHours / projectDurationDays : 0;
                
                // Heures proportionnelles pour la période d'overlap
                const proportionalHours = hoursPerWorkingDay * overlapWorkingDays;
                
                totalProportionalHours += proportionalHours;
                
                projectDetails.push({
                  name: project.name,
                  totalHours: estimatedHours,
                  projectDuration: projectDurationDays,
                  overlapDays: overlapWorkingDays,
                  proportionalHours: Math.round(proportionalHours * 100) / 100,
                  hoursPerDay: Math.round(hoursPerWorkingDay * 100) / 100
                });
              }
            }
          });
          
          // Estimation du nombre de personnes nécessaires
          const estimatedPersons = Math.ceil(totalProportionalHours / weeklyFteHours);

          workloadByPeriod[weekKey] = {
            totalHours: Math.round(totalProportionalHours * 100) / 100,
            estimatedPersons,
            activeProjects: projectDetails.length,
            periodStart: weekStart,
            periodEnd: weekEnd,
            projectDetails
          };
        }
      });
    } else {
      // Calcul par mois avec répartition proportionnelle
      const monthStart = periodInfo.periodStart;
      const monthEnd = periodInfo.periodEnd;
      const monthKey = format(monthStart, 'yyyy-MM');
      
      let totalProportionalHours = 0;
      const projectDetails: WorkloadProject[] = [];
      
      activeProjects.forEach(project => {
        // S'assurer que les dates du projet existent
        if (!project.startDate || !project.endDate) return;
        
        // Vérifier s'il y a intersection entre le projet et la période
        const projectStart = new Date(Math.max(project.startDate.getTime(), monthStart.getTime()));
        const projectEnd = new Date(Math.min(project.endDate.getTime(), monthEnd.getTime()));
        
        if (projectStart <= projectEnd) {
          // Calcul de la durée totale du projet en jours ouvrables
          const projectDurationDays = getWorkingDaysBetween(project.startDate, project.endDate);
          
          // Calcul des jours d'overlap en jours ouvrables
          const overlapWorkingDays = getWorkingDaysBetween(projectStart, projectEnd);
          
          if (overlapWorkingDays > 0) {
            const estimatedHours = typeof project.estimatedHours === 'string' 
              ? parseFloat(project.estimatedHours) || 0 
              : project.estimatedHours || 0;
            
            // Répartition proportionnelle : heures par jour ouvrable
            const hoursPerWorkingDay = projectDurationDays > 0 ? estimatedHours / projectDurationDays : 0;
            
            // Heures proportionnelles pour la période d'overlap
            const proportionalHours = hoursPerWorkingDay * overlapWorkingDays;
            
            totalProportionalHours += proportionalHours;
            
            projectDetails.push({
              name: project.name,
              totalHours: estimatedHours,
              projectDuration: projectDurationDays,
              overlapDays: overlapWorkingDays,
              proportionalHours: Math.round(proportionalHours * 100) / 100,
              hoursPerDay: Math.round(hoursPerWorkingDay * 100) / 100
            });
          }
        }
      });
      
      // Calcul des jours ouvrables dans le mois
      const monthWorkingDays = getWorkingDaysBetween(monthStart, monthEnd);
      const monthlyFteHours = monthWorkingDays * hoursPerWorkingDay;
      
      // Estimation du nombre de personnes nécessaires
      const estimatedPersons = Math.ceil(totalProportionalHours / monthlyFteHours);

      workloadByPeriod[monthKey] = {
        totalHours: Math.round(totalProportionalHours * 100) / 100,
        estimatedPersons,
        activeProjects: projectDetails.length,
        periodStart: monthStart,
        periodEnd: monthEnd,
        projectDetails
      };
    }

    return workloadByPeriod;
  }, [ganttItems, viewMode, currentPeriod, periodInfo, weeklyFteHours, hoursPerWorkingDay]);

  // Obtenir la couleur selon la charge
  const getWorkloadColor = (estimatedPersons: number): string => {
    if (estimatedPersons === 0) {
      return "bg-gray-300 border-gray-400 text-gray-600"; // Aucune charge
    } else if (estimatedPersons <= 2) {
      return "bg-green-400 border-green-500 text-green-800"; // Charge normale
    } else if (estimatedPersons <= 4) {
      return "bg-yellow-400 border-yellow-500 text-yellow-800"; // Charge élevée
    } else if (estimatedPersons <= 6) {
      return "bg-orange-400 border-orange-500 text-orange-800"; // Charge importante
    } else {
      return "bg-red-400 border-red-500 text-red-800"; // Charge critique
    }
  };

  // Obtenir le tooltip avec détails de calcul amélioré
  const getWorkloadTooltip = (workload: WorkloadPeriod): string => {
    const { totalHours, estimatedPersons, activeProjects, periodStart, periodEnd, projectDetails } = workload;
    const periodLabel = viewMode === 'week' 
      ? `Semaine du ${format(periodStart, 'dd/MM', { locale: fr })} au ${format(periodEnd, 'dd/MM', { locale: fr })}`
      : format(periodStart, 'MMMM yyyy', { locale: fr });
    
    let tooltip = `${periodLabel}\n`;
    tooltip += `${activeProjects} projet${activeProjects > 1 ? 's' : ''} actif${activeProjects > 1 ? 's' : ''}\n`;
    tooltip += `${totalHours}h proportionnelles (jours ouvrables)\n`;
    tooltip += `≈ ${estimatedPersons} personne${estimatedPersons > 1 ? 's' : ''} nécessaire${estimatedPersons > 1 ? 's' : ''} (${hoursPerWorkingDay}h/jour)\n\n`;
    
    tooltip += "Détail par projet :\n";
    projectDetails.forEach(project => {
      tooltip += `• ${project.name}\n`;
      tooltip += `  ${project.totalHours}h ÷ ${project.projectDuration} jours = ${project.hoursPerDay}h/jour\n`;
      tooltip += `  ${project.hoursPerDay}h/jour × ${project.overlapDays} jours = ${project.proportionalHours}h\n`;
    });
    
    const fteHours = viewMode === 'week' ? weeklyFteHours : getWorkingDaysBetween(periodStart, periodEnd) * hoursPerWorkingDay;
    tooltip += `\nFormule : ${totalHours}h ÷ ${fteHours}h = ${estimatedPersons} ETP`;
    
    return tooltip;
  };

  // Calculs de statistiques globales
  const { totalEstimatedPersons, totalActiveProjects, totalPlannedHours } = useMemo(() => {
    const periods = Object.values(teamWorkload);
    
    return {
      totalEstimatedPersons: periods.reduce((total, period) => total + period.estimatedPersons, 0),
      totalActiveProjects: Math.max(...periods.map(p => p.activeProjects), 0),
      totalPlannedHours: ganttItems.reduce((total, item) => {
        const hours = typeof item.estimatedHours === 'string' 
          ? parseFloat(item.estimatedHours) || 0 
          : item.estimatedHours || 0;
        return total + hours;
      }, 0)
    };
  }, [teamWorkload, ganttItems]);

  // Calcul de la charge par élément individuel
  const itemWorkloads: ItemWorkloadCalculation = useMemo(() => {
    const workloadByItem: ItemWorkloadCalculation = {};
    
    ganttItems.forEach(item => {
      // Vérifier que l'item a des dates valides
      if (!item.startDate || !item.endDate) return;
      
      const estimatedHours = typeof item.estimatedHours === 'string' 
        ? parseFloat(item.estimatedHours) || 0 
        : item.estimatedHours || 0;
      
      if (estimatedHours > 0) {
        // Calcul de la durée en jours ouvrables
        const itemDuration = getWorkingDaysBetween(item.startDate, item.endDate);
        const hoursPerDay = itemDuration > 0 ? estimatedHours / itemDuration : estimatedHours;
        
        // Distribution journalière
        const dailyDistribution: { [key: string]: number } = {};
        let current = new Date(item.startDate);
        
        while (current <= item.endDate) {
          const dayOfWeek = current.getDay();
          if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Jours ouvrables
            const dateKey = format(current, 'yyyy-MM-dd');
            dailyDistribution[dateKey] = hoursPerDay;
          }
          current = addDays(current, 1);
        }
        
        // Calcul du nombre de personnes estimées
        const weekDuration = Math.max(1, Math.ceil(itemDuration / 5)); // Nombre de semaines
        const estimatedPersons = Math.ceil(estimatedHours / (weeklyFteHours * weekDuration));
        
        // Calcul du pourcentage de charge (basé sur la capacité équipe)
        const maxCapacityHours = weeklyFteHours * Math.ceil(estimatedPersons) * weekDuration;
        const workloadPercentage = Math.min(100, (estimatedHours / maxCapacityHours) * 100);
        
        // Détermination de la priorité basée sur la charge
        let priority: 'low' | 'normal' | 'high' | 'critical' = 'normal';
        if (workloadPercentage >= 90) {
          priority = 'critical';
        } else if (workloadPercentage >= 70) {
          priority = 'high';
        } else if (workloadPercentage >= 40) {
          priority = 'normal';
        } else {
          priority = 'low';
        }
        
        workloadByItem[item.id] = {
          itemId: item.id,
          itemName: item.name,
          totalHours: estimatedHours,
          estimatedPersons,
          dailyDistribution,
          workloadPercentage,
          priority
        };
      }
    });
    
    return workloadByItem;
  }, [ganttItems, weeklyFteHours]);

  // Utilitaire pour colorer la charge par élément
  const getItemWorkloadColor = (workloadPercentage: number): string => {
    if (workloadPercentage === 0) return "bg-gray-100 border-gray-300 text-gray-500";
    if (workloadPercentage <= 40) return "bg-green-100 border-green-400 text-green-700";
    if (workloadPercentage <= 70) return "bg-yellow-100 border-yellow-400 text-yellow-700";
    if (workloadPercentage <= 90) return "bg-orange-100 border-orange-400 text-orange-700";
    return "bg-red-100 border-red-400 text-red-700";
  };

  // Utilitaire pour le tooltip de charge par élément
  const getItemWorkloadTooltip = (itemWorkload: ItemWorkload): string => {
    const { itemName, totalHours, estimatedPersons, workloadPercentage, priority } = itemWorkload;
    
    const priorityLabels = {
      low: 'Faible',
      normal: 'Normale', 
      high: 'Élevée',
      critical: 'Critique'
    };
    
    return `${itemName}\n` +
           `Charge: ${workloadPercentage.toFixed(1)}% (${priorityLabels[priority]})\n` +
           `Heures totales: ${totalHours}h\n` +
           `Personnel estimé: ${estimatedPersons} personne${estimatedPersons > 1 ? 's' : ''}\n` +
           `Capacité: ${weeklyFteHours}h/semaine par personne`;
  };

  return {
    // Calculs
    teamWorkload,
    itemWorkloads,
    
    // Utilitaires
    getWorkloadColor,
    getWorkloadTooltip,
    getItemWorkloadColor,
    getItemWorkloadTooltip,
    
    // Statistiques
    totalEstimatedPersons,
    totalActiveProjects,
    totalPlannedHours,
    
    // Configuration
    weeklyFteHours,
    workingDaysPerWeek,
    hoursPerWorkingDay
  };
}