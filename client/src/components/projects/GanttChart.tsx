import { useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  CalendarDays, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  Move, 
  AlertTriangle, 
  Plus, 
  Link,
  GripHorizontal,
  Clock,
  Calendar,
  TrendingUp,
  ArrowUpDown,
  Users,
  Expand,
  Minimize2
} from "lucide-react";
import { 
  format, 
  addDays, 
  differenceInDays, 
  isWithinInterval,
  eachWeekOfInterval,
  isAfter
} from "date-fns";
import { fr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { useGanttDrag } from "@/hooks/useGanttDrag";
import { useGanttPeriods } from "@/hooks/useGanttPeriods";
import { useGanttWorkload, type ItemWorkload } from "@/hooks/useGanttWorkload";
import { useGanttHierarchy, type HierarchyItem } from "@/hooks/useGanttHierarchy";
import type { GanttProject, GanttMilestone, GanttTask } from "@shared/schema";
import type { GanttItem } from "@/types/gantt";

// Composant mini-histogramme de charge intégré
interface MiniWorkloadHistogramProps {
  itemWorkload: ItemWorkload;
  periodInfo: any;
  viewMode: 'week' | 'month';
  className?: string;
  'data-testid'?: string;
}

const MiniWorkloadHistogram = ({ 
  itemWorkload, 
  periodInfo, 
  viewMode, 
  className = '', 
  'data-testid': dataTestId 
}: MiniWorkloadHistogramProps) => {
  // Générer l'histogramme compact pour la période affichée
  const generateHistogram = () => {
    const bars: JSX.Element[] = [];
    const { dailyDistribution } = itemWorkload;
    
    if (viewMode === 'week') {
      // Histogramme par jour de la semaine
      periodInfo.periodDays.slice(0, 7).forEach((day: Date, index: number) => {
        const dateKey = format(day, 'yyyy-MM-dd');
        const hours = dailyDistribution[dateKey] || 0;
        
        // Calculer l'intensité (0-100%) basée sur 8h max par jour
        const intensity = Math.min(100, (hours / 8) * 100);
        const heightPercent = Math.max(10, intensity); // Min 10% pour visibilité
        
        let barColor = 'bg-gray-200';
        if (intensity > 0) {
          if (intensity <= 50) barColor = 'bg-green-400';
          else if (intensity <= 75) barColor = 'bg-yellow-400';
          else if (intensity <= 90) barColor = 'bg-orange-400';
          else barColor = 'bg-red-400';
        }
        
        bars.push(
          <div 
            key={`bar-${index}`}
            className={`w-1 ${barColor} transition-all hover:opacity-75`}
            style={{ height: `${heightPercent}%` }}
            title={`${format(day, 'EEE', { locale: fr })}: ${hours.toFixed(1)}h`}
          />
        );
      });
    } else {
      // Histogramme par semaine du mois
      const weekCount = Math.min(5, periodInfo.monthWeeksCount || 4);
      for (let week = 0; week < weekCount; week++) {
        // Calculer les heures moyennes pour cette semaine
        const weekStart = addDays(periodInfo.periodStart, week * 7);
        const weekEnd = addDays(weekStart, 6);
        
        let weekHours = 0;
        let weekDays = 0;
        
        for (let d = 0; d < 7; d++) {
          const day = addDays(weekStart, d);
          if (day <= weekEnd && day <= periodInfo.periodEnd) {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayHours = dailyDistribution[dateKey] || 0;
            if (dayHours > 0) {
              weekHours += dayHours;
              weekDays++;
            }
          }
        }
        
        const avgHours = weekDays > 0 ? weekHours / weekDays : 0;
        const intensity = Math.min(100, (avgHours / 8) * 100);
        const heightPercent = Math.max(10, intensity);
        
        let barColor = 'bg-gray-200';
        if (intensity > 0) {
          if (intensity <= 50) barColor = 'bg-green-400';
          else if (intensity <= 75) barColor = 'bg-yellow-400';
          else if (intensity <= 90) barColor = 'bg-orange-400';
          else barColor = 'bg-red-400';
        }
        
        bars.push(
          <div 
            key={`week-bar-${week}`}
            className={`w-2 ${barColor} transition-all hover:opacity-75`}
            style={{ height: `${heightPercent}%` }}
            title={`Semaine ${week + 1}: ${avgHours.toFixed(1)}h/jour en moyenne`}
          />
        );
      }
    }
    
    return bars;
  };
  
  const histogramBars = generateHistogram();
  
  return (
    <div 
      className={`flex items-end space-x-0.5 h-6 px-1 ${className}`}
      data-testid={dataTestId}
      title={`Charge: ${itemWorkload.workloadPercentage.toFixed(1)}% - ${itemWorkload.estimatedPersons} personne(s)`}
    >
      {histogramBars}
    </div>
  );
};

// Composant badge de charge
interface WorkloadBadgeProps {
  itemWorkload: ItemWorkload;
  getItemWorkloadColor: (percentage: number) => string;
  className?: string;
  'data-testid'?: string;
}

const WorkloadBadge = ({ 
  itemWorkload, 
  getItemWorkloadColor, 
  className = '', 
  'data-testid': dataTestId 
}: WorkloadBadgeProps) => {
  const { workloadPercentage, estimatedPersons, priority } = itemWorkload;
  const colorClass = getItemWorkloadColor(workloadPercentage);
  
  const priorityIcons = {
    low: '🟢',
    normal: '🟡', 
    high: '🟠',
    critical: '🔴'
  };
  
  return (
    <div 
      className={`flex items-center space-x-1 px-2 py-1 rounded text-xs font-medium ${colorClass} ${className}`}
      data-testid={dataTestId}
      title={`Charge ${workloadPercentage.toFixed(1)}% (${priority}) - ${estimatedPersons} personne(s) estimée(s)`}
    >
      <span className="text-xs">{priorityIcons[priority]}</span>
      <span>{workloadPercentage.toFixed(0)}%</span>
      <Users className="h-3 w-3" />
      <span>{estimatedPersons}</span>
    </div>
  );
};

interface GanttChartProps {
  projects: GanttProject[];
  milestones: GanttMilestone[];
  tasks?: GanttTask[];
  onDateUpdate?: (itemId: string, newStartDate: Date, newEndDate: Date, type: 'project' | 'milestone' | 'task') => void;
  onTaskCreate?: (task: Partial<GanttTask>) => void;
  onDependencyCreate?: (fromId: string, toId: string) => void;
  'data-testid'?: string;
  enableRealtime?: boolean;
  enableHierarchy?: boolean; // Nouvelle prop pour activer/désactiver la hiérarchie
  defaultExpandedItems?: string[]; // IDs des éléments expanded par défaut
}

export default function GanttChart({ 
  projects, 
  milestones, 
  tasks = [],
  onDateUpdate, 
  onTaskCreate,
  onDependencyCreate,
  'data-testid': dataTestId,
  enableRealtime = false,
  enableHierarchy = true,
  defaultExpandedItems = []
}: GanttChartProps) {
  // États locaux pour les fonctionnalités non extraites
  const [linkMode, setLinkMode] = useState(false);
  const [linkFromId, setLinkFromId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTaskDate, setNewTaskDate] = useState<Date | null>(null);
  const [newTaskName, setNewTaskName] = useState("");
  const [newTaskType, setNewTaskType] = useState<'task' | 'milestone'>('task');
  const [newTaskProject, setNewTaskProject] = useState("");
  
  const { toast } = useToast();

  // Helper pour la validation des dates (null-safe)
  const hasValidDates = useCallback((item: GanttItem): item is GanttItem & { startDate: Date; endDate: Date } => {
    return !!(item.hasValidDates !== false && item.startDate && item.endDate);
  }, []);

  // Hook pour la gestion des périodes et navigation
  const {
    currentPeriod,
    viewMode,
    periodInfo,
    goToPreviousPeriod,
    goToNextPeriod,
    goToCurrentPeriod,
    goToSpecificPeriod,
    setViewMode,
    isCurrentPeriod,
    getPeriodLabel
  } = useGanttPeriods();

  // Préparer TOUS les éléments Gantt (SANS filtrage par date pour construire la hiérarchie complète)
  const allGanttItems: GanttItem[] = useMemo(() => {
    const ganttItems: GanttItem[] = [
      // TOUS les projets, même sans dates (nécessaire pour les relations parent-enfant)
      ...projects.map(project => ({
        id: project.id,
        name: project.name,
        type: 'project' as const,
        startDate: project.startDate ? new Date(project.startDate) : undefined,
        endDate: project.endDate ? new Date(project.endDate) : undefined,
        status: project.status || 'etude',
        responsibleUserId: project.responsibleUserId,
        progress: project.progressPercentage || 0,
        priority: project.priority || 'normale',
        estimatedHours: project.estimatedHours,
        actualHours: project.actualHours,
        dependencies: project.dependencies || [],
        hasValidDates: !!(project.startDate && project.endDate)
      })),
      // TOUS les jalons, même sans date
      ...milestones.map(milestone => ({
        id: milestone.id,
        name: milestone.name,
        type: 'milestone' as const,
        startDate: milestone.date ? new Date(milestone.date) : undefined,
        endDate: milestone.date ? new Date(milestone.date) : undefined,
        status: milestone.status,
        isJalon: true,
        projectId: milestone.project,
        priority: milestone.priority || 'normale',
        dependencies: milestone.dependencies || [],
        hasValidDates: !!milestone.date
      })),
      // TOUTES les tâches, même sans dates
      ...tasks.map(task => ({
        id: task.id,
        name: task.name,
        type: 'task' as const,
        startDate: task.startDate ? new Date(task.startDate) : undefined,
        endDate: task.endDate ? new Date(task.endDate) : undefined,
        status: task.status || 'a_faire',
        projectId: task.projectId,
        parentTaskId: task.parentTaskId,
        estimatedHours: task.estimatedHours,
        actualHours: task.actualHours,
        isJalon: task.isJalon,
        priority: task.priority || 'normale',
        dependencies: task.dependencies || [],
        hasValidDates: !!(task.startDate && task.endDate)
      }))
    ];
    
    return ganttItems;
  }, [projects, milestones, tasks]);

  // Hook pour la gestion du drag/drop avec navigation automatique
  const {
    draggedItem,
    resizeItem,
    dragPreview,
    handleDragStart,
    handleDrop,
    handleDragOver,
    handleDragEnd,
    handleResizeStart,
    ganttRef,
    isNavigating
  } = useGanttDrag({
    ganttItems: allGanttItems, // Utiliser TOUS les éléments pour drag/drop
    periodStart: periodInfo.periodStart,
    periodEnd: periodInfo.periodEnd,
    totalDays: periodInfo.totalDays,
    viewMode,
    currentPeriod,
    linkMode,
    onDateUpdate,
    onPeriodChange: goToSpecificPeriod
  });

  // Hook pour la gestion de la hiérarchie (CRITIQUE : utiliser allGanttItems pour construire la hiérarchie complète)
  const {
    expandedItems,
    toggleExpanded,
    isExpanded,
    expandAll,
    collapseAll,
    hierarchyItems,
    visibleItems,
    getItemLevel,
    hasChildren,
    getChildrenCount,
    totalItems,
    visibleItemsCount,
    expandedItemsCount
  } = useGanttHierarchy({
    ganttItems: allGanttItems, // TOUS les éléments pour hiérarchie complète (fix critique)
    defaultExpandedItems
  });


  // Utiliser les éléments visibles ou plats selon le mode hiérarchique
  // Note: visibleItems sont de type HierarchyItem[] (avec level, hasChildren, etc.)
  // allGanttItems sont de type GanttItem[] (sans ces propriétés)
  const displayItems = enableHierarchy ? visibleItems : allGanttItems;
  
  // CRITIQUE : Créer des versions filtrées pour les fonctions qui nécessitent des dates valides
  const safeDisplayItems = displayItems.filter(hasValidDates);
  const safeAllGanttItems = allGanttItems.filter(hasValidDates);

  // Hook pour les calculs de workload (utiliser displayItems qui peut être hiérarchique ou plat)
  const {
    teamWorkload,
    itemWorkloads,
    getWorkloadColor,
    getWorkloadTooltip,
    getItemWorkloadColor,
    getItemWorkloadTooltip,
    totalEstimatedPersons,
    totalActiveProjects,
    totalPlannedHours
  } = useGanttWorkload({
    ganttItems: displayItems, // Utiliser les éléments affichés (hiérarchique ou plat)
    periodInfo,
    viewMode,
    currentPeriod
  });

  // Utilitaires de calcul pour le rendu
  const getItemColor = useCallback((status: string, type: 'project' | 'milestone' | 'task', priority?: string, isOverdue?: boolean) => {
    if (isOverdue) {
      return "bg-error border-error";
    }
    
    if (priority === 'critique') {
      return "bg-error/80 border-error";
    } else if (priority === 'elevee') {
      return "bg-warning border-warning";
    }
    
    if (type === 'milestone') {
      switch (status) {
        case "completed": return "bg-success border-success";
        case "in-progress": return "bg-primary border-primary";
        case "pending": return "bg-surface-elevated border-border";
        case "overdue": return "bg-error border-error";
        default: return "bg-surface-elevated border-border";
      }
    } else {
      switch (status) {
        case "etude": return "bg-primary border-primary";
        case "planification": return "bg-warning border-warning";
        case "approvisionnement": return "bg-warning border-warning";
        case "chantier": return "bg-success border-success";
        case "sav": return "bg-accent border-accent";
        case "termine": return "bg-success border-success";
        default: return "bg-surface-elevated border-border";
      }
    }
  }, []);

  const getBarPosition = useCallback((startDate: Date, endDate: Date) => {
    const dayWidth = 100 / periodInfo.totalDays;
    const startDayIndex = differenceInDays(startDate, periodInfo.periodStart);
    const duration = differenceInDays(endDate, startDate) + 1;
    const left = Math.max(0, startDayIndex * dayWidth);
    const width = Math.min(100 - left, duration * dayWidth);
    return { left: `${left}%`, width: `${width}%` };
  }, [periodInfo.totalDays, periodInfo.periodStart]);

  const isItemVisible = useCallback((startDate: Date, endDate: Date) => {
    return isWithinInterval(startDate, { start: periodInfo.periodStart, end: periodInfo.periodEnd }) ||
           isWithinInterval(endDate, { start: periodInfo.periodStart, end: periodInfo.periodEnd }) ||
           (startDate <= periodInfo.periodStart && endDate >= periodInfo.periodEnd);
  }, [periodInfo.periodStart, periodInfo.periodEnd]);

  const isOverdue = useCallback((item: GanttItem) => {
    // Protection null safety : retourner false si pas de date de fin
    if (!item.endDate) return false;
    
    const now = new Date();
    if (item.type === 'milestone') {
      return isAfter(now, item.endDate) && item.status !== 'completed';
    }
    return isAfter(now, item.endDate) && item.status !== 'termine' && item.status !== 'completed';
  }, []);

  // Gestion des liaisons de dépendances
  const handleItemClick = (itemId: string) => {
    if (linkMode) {
      if (!linkFromId) {
        setLinkFromId(itemId);
        toast({
          title: "Mode liaison",
          description: "Cliquez sur la tâche de destination pour créer la liaison",
        });
      } else if (linkFromId !== itemId) {
        if (onDependencyCreate) {
          onDependencyCreate(linkFromId, itemId);
          toast({
            title: "Dépendance créée",
            description: "La liaison entre les tâches a été établie",
          });
        }
        setLinkFromId(null);
        setLinkMode(false);
      }
    }
  };

  // Gestion du double-clic pour créer une tâche
  const handleDoubleClick = (e: React.MouseEvent) => {
    if (!ganttRef.current) return;
    
    const rect = ganttRef.current.getBoundingClientRect();
    const relativeX = e.clientX - rect.left;
    const dayWidth = rect.width / periodInfo.totalDays;
    const dayIndex = Math.floor(relativeX / dayWidth);
    
    if (dayIndex >= 0 && dayIndex < periodInfo.totalDays) {
      const clickedDate = addDays(periodInfo.periodStart, dayIndex);
      setNewTaskDate(clickedDate);
      setShowCreateDialog(true);
    }
  };

  // Créer une nouvelle tâche
  const handleCreateTask = () => {
    if (!newTaskName || !newTaskProject) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive"
      });
      return;
    }
    
    const taskDate = newTaskDate || new Date();
    const endDate = newTaskType === 'milestone' ? taskDate : addDays(taskDate, 1);
    
    const newTask: Partial<GanttTask> = {
      name: newTaskName,
      startDate: taskDate,
      endDate: endDate,
      status: 'a_faire',
      projectId: newTaskProject,
      priority: 'normale',
      isJalon: newTaskType === 'milestone'
    };
    
    if (onTaskCreate) {
      onTaskCreate(newTask);
    }
    
    // Reset
    setNewTaskName("");
    setNewTaskType('task');
    setNewTaskProject("");
    setNewTaskDate(null);
    setShowCreateDialog(false);
    
    toast({
      title: "Tâche créée",
      description: `${newTaskType === 'milestone' ? 'Jalon' : 'Tâche'} "${newTaskName}" ajouté(e) au planning`,
    });
  };

  return (
    <Card className="w-full" data-testid={dataTestId}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <CalendarDays className="h-5 w-5" />
            <span>Planning Gantt Interactif</span>
            {enableRealtime && (
              <Badge variant="outline" className="ml-2 text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse" />
                Temps réel
              </Badge>
            )}
            {isNavigating && (
              <Badge variant="outline" className="ml-2 text-blue-600">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-1 animate-pulse" />
                Navigation...
              </Badge>
            )}
          </CardTitle>
          
          <div className="flex items-center space-x-2">
            <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'week' | 'month')}>
              <TabsList className="grid w-fit grid-cols-2">
                <TabsTrigger value="week" className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Semaine
                </TabsTrigger>
                <TabsTrigger value="month" className="flex items-center gap-1">
                  <CalendarDays className="h-4 w-4" />
                  Mois
                </TabsTrigger>
              </TabsList>
            </Tabs>
            
            <Separator orientation="vertical" className="h-6" />
            
            <Button
              variant={linkMode ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setLinkMode(!linkMode);
                setLinkFromId(null);
                if (!linkMode) {
                  toast({
                    title: "Mode liaison activé",
                    description: "Cliquez sur une tâche source puis sur une tâche cible",
                  });
                }
              }}
              data-testid="button-link-mode"
            >
              <Link className="h-4 w-4 mr-1" />
              {linkMode ? "Annuler liaison" : "Créer liaison"}
            </Button>
            
            {/* Contrôles de hiérarchie */}
            {enableHierarchy && (
              <>
                <Separator orientation="vertical" className="h-6" />
                <div className="flex items-center space-x-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={expandAll}
                    disabled={!hierarchyItems.some((item: HierarchyItem) => item.hasChildren)}
                    data-testid="button-expand-all"
                  >
                    <Expand className="h-4 w-4 mr-1" />
                    Tout déplier
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={collapseAll}
                    disabled={expandedItemsCount === 0}
                    data-testid="button-collapse-all"
                  >
                    <Minimize2 className="h-4 w-4 mr-1" />
                    Tout replier
                  </Button>
                  <Badge variant="outline" className="text-xs">
                    {visibleItemsCount}/{totalItems} éléments
                  </Badge>
                </div>
              </>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCreateDialog(true)}
              data-testid="button-create-task"
            >
              <Plus className="h-4 w-4 mr-1" />
              Nouvelle tâche
            </Button>
          </div>
        </div>
        
        {/* Navigation de période */}
        <div className="flex items-center justify-between pt-4">
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={goToPreviousPeriod} data-testid="button-previous-period">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToNextPeriod} data-testid="button-next-period">
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button 
              variant={isCurrentPeriod ? "default" : "outline"} 
              size="sm" 
              onClick={goToCurrentPeriod}
              data-testid="button-current-period"
            >
              Aujourd'hui
            </Button>
          </div>
          
          <div className="text-sm font-medium text-gray-700">
            {getPeriodLabel()}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* En-tête du calendrier */}
        <div className="grid grid-cols-10 gap-1 mb-4">
          <div className="col-span-3 text-sm font-medium text-gray-700 p-2">
            Projet / Tâche
          </div>
          <div 
            className={`col-span-6 grid gap-1 ${viewMode === 'week' ? 'grid-cols-7' : 'grid-cols-none'}`}
            style={viewMode === 'month' ? { gridTemplateColumns: `repeat(${periodInfo.monthWeeksCount}, minmax(0, 1fr))` } : undefined}
          >
            {viewMode === 'week' ? (
              periodInfo.periodDays.map((day) => (
                <div
                  key={day.toISOString()}
                  className="text-center p-1 text-xs font-medium text-gray-500 bg-gray-50 rounded"
                >
                  <div>{format(day, 'EEE', { locale: fr })}</div>
                  <div>{format(day, 'dd')}</div>
                </div>
              ))
            ) : (
              eachWeekOfInterval({ 
                start: periodInfo.periodStart, 
                end: periodInfo.periodEnd 
              }, { weekStartsOn: 1 }).map((week, index) => (
                <div
                  key={week.toISOString()}
                  className="text-center p-1 text-xs font-medium text-gray-500 bg-gray-50 rounded"
                >
                  S{index + 1}
                </div>
              ))
            )}
          </div>
          <div className="col-span-1 text-sm font-medium text-gray-700 p-2 text-center">
            Niveau
          </div>
        </div>

        {/* Zone principale du Gantt avec drag/drop */}
        <div 
          ref={ganttRef}
          className="space-y-1"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDoubleClick={handleDoubleClick}
          data-testid="gantt-chart-area"
        >
          {displayItems.map((item) => {
            // CRITIQUE : Afficher TOUTES les lignes (pour hiérarchie), filtrer seulement les barres
            const itemHasValidDates = hasValidDates(item);
            const shouldRenderBar = itemHasValidDates && isItemVisible(item.startDate, item.endDate);
            const position = itemHasValidDates ? getBarPosition(item.startDate, item.endDate) : { left: '0%', width: '0%' };
            const isItemOverdue = itemHasValidDates ? isOverdue(item) : false;
            const colorClass = getItemColor(item.status, item.type, item.priority, isItemOverdue);
            const isDragged = draggedItem === item.id;
            const itemWorkload = itemWorkloads[item.id];
            
            return (
              <div key={item.id} className="grid grid-cols-10 gap-1 group">
                {/* Nom de l'élément avec hiérarchie */}
                <div className="col-span-3 flex items-center justify-between p-2">
                  <div className="flex items-center space-x-1">
                    {/* Indentation hiérarchique */}
                    {enableHierarchy && (
                      <div style={{ marginLeft: `${(item as HierarchyItem).level * 16}px` }} className="flex items-center">
                        {/* Bouton expand/collapse */}
                        {(item as HierarchyItem).hasChildren ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpanded(item.id);
                            }}
                            className="p-1 hover:bg-gray-100 rounded transition-colors"
                            data-testid={`toggle-${item.id}`}
                          >
                            {isExpanded(item.id) ? (
                              <ChevronDown className="h-3 w-3 text-gray-600" />
                            ) : (
                              <ChevronRight className="h-3 w-3 text-gray-600" />
                            )}
                          </button>
                        ) : (
                          /* Espace pour l'alignement */
                          <div className="w-5 h-5" />
                        )}
                      </div>
                    )}
                    
                    {/* Indicateur visuel du type */}
                    <div className={`w-3 h-3 ${colorClass.includes('bg-') ? colorClass.split(' ')[0] : 'bg-gray-400'} rounded border-2 ${colorClass.includes('border-') ? colorClass.split(' ')[1] || 'border-gray-500' : 'border-gray-500'}`} />
                    
                    {/* Nom avec badge de niveau si hiérarchie */}
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium truncate" title={item.name}>
                        {item.name}
                      </span>
                      
                      {/* Badge de niveau hiérarchique */}
                      {enableHierarchy && (item as HierarchyItem).level > 0 && (
                        <Badge variant="outline" className="text-xs px-1 py-0">
                          L{(item as HierarchyItem).level}
                        </Badge>
                      )}
                      
                      {/* Badge de nombre d'enfants */}
                      {enableHierarchy && (item as HierarchyItem).hasChildren && (
                        <Badge variant="secondary" className="text-xs px-1 py-0">
                          {getChildrenCount(item.id, false)}
                        </Badge>
                      )}
                      
                      {item.priority === 'critique' && (
                        <AlertTriangle className="h-3 w-3 text-red-500" />
                      )}
                    </div>
                  </div>
                  
                  {item.progress !== undefined && (
                    <Badge variant="outline" className="text-xs">
                      {item.progress}%
                    </Badge>
                  )}
                </div>

                {/* Zone Barre Gantt : rendu conditionnel selon shouldRenderBar */}
                <div className="col-span-6 relative h-8 border border-gray-200 rounded bg-gray-50">
                  {shouldRenderBar ? (
                    <div
                      className={`absolute top-0 h-full rounded flex items-center justify-between text-xs font-medium border-2 transition-all cursor-move ${colorClass} hover:shadow-md ${isDragged ? 'opacity-60 z-10' : ''} ${item.id === linkFromId ? 'ring-2 ring-blue-400' : ''}`}
                      style={position}
                      draggable={!linkMode}
                      onDragStart={(e) => handleDragStart(e, item.id)}
                      onDragEnd={handleDragEnd}
                      onClick={() => handleItemClick(item.id)}
                      data-testid={`gantt-bar-${item.id}`}
                    >
                      {/* Handle de resize début */}
                      <div 
                        className="absolute left-0 top-0 w-2 h-full bg-gray-600/30 hover:bg-gray-600/60 cursor-ew-resize opacity-0 group-hover:opacity-100"
                        onMouseDown={(e) => handleResizeStart(e, item.id, 'start')}
                        data-testid={`resize-start-${item.id}`}
                      />
                      
                      {/* Contenu de la barre */}
                      <div className="px-2 flex items-center space-x-1 flex-1 min-w-0">
                        {item.type === 'milestone' && <div className="w-2 h-2 bg-current rounded-full" />}
                        <span className="truncate text-xs">{item.name}</span>
                        {item.dependencies && item.dependencies.length > 0 && (
                          <Link className="h-3 w-3 text-blue-500" />
                        )}
                      </div>
                      
                      {/* Handle de resize fin */}
                      <div 
                        className="absolute right-0 top-0 w-2 h-full bg-gray-600/30 hover:bg-gray-600/60 cursor-ew-resize opacity-0 group-hover:opacity-100"
                        onMouseDown={(e) => handleResizeStart(e, item.id, 'end')}
                        data-testid={`resize-end-${item.id}`}
                      />
                    </div>
                  ) : (
                    /* Élément sans dates ou hors période : afficher placeholder avec info */
                    <div className="flex items-center justify-center h-full text-xs text-gray-400">
                      {item.hasValidDates === false ? "Pas de dates" : "Hors période"}
                    </div>
                  )}
                </div>

                {/* Niveau hiérarchique ou statut */}
                <div className="col-span-1 flex items-center justify-center">
                  {enableHierarchy && (item as HierarchyItem).level > 0 ? (
                    <Badge variant="outline" className="text-xs px-1 py-0">
                      L{(item as HierarchyItem).level}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">
                      {item.progress !== undefined ? `${item.progress}%` : '-'}
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Ligne des effectifs nécessaires selon typologie des tâches */}
        <div className="mt-6 border-t border-gray-300 pt-4">
          <div className="grid grid-cols-10 gap-1 mb-2">
            <div className="col-span-3 text-sm font-medium text-gray-700 p-2">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-blue-600" />
                <span>Effectifs Nécessaires</span>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Par typologie de tâches
              </div>
            </div>
            <div className="col-span-6 relative">
              {/* Graphique des effectifs nécessaires */}
              <div className="h-20 bg-gray-50 border border-gray-200 rounded relative overflow-hidden">
                {(() => {
                  // Calculer les effectifs nécessaires par jour selon la typologie
                  const dailyStaffNeeds: { [key: string]: { total: number, byType: { [key: string]: number } } } = {};
                  let maxStaffNeeded = 0;

                  // Parcourir tous les jours de la période
                  periodInfo.periodDays.forEach((day) => {
                    const dateKey = format(day, 'yyyy-MM-dd');
                    let totalStaff = 0;
                    const byType: { [key: string]: number } = {
                      'Poseurs': 0,
                      'Encadrement': 0
                    };

                    // Calculer les besoins en personnel selon la typologie des tâches
                    Object.entries(itemWorkloads).forEach(([itemId, workload]) => {
                      const item = allGanttItems.find(i => i.id === itemId);
                      if (item && workload.dailyDistribution[dateKey]) {
                        const dailyHours = workload.dailyDistribution[dateKey];
                        
                        // Calcul des effectifs selon le type de tâche et sa complexité
                        let staffMultiplier = 1;
                        let typeCategory = 'Poseurs';
                        
                        // Déterminer la typologie selon le type et statut du projet
                        if (item.type === 'project') {
                          switch (item.status) {
                            case 'etude':
                              typeCategory = 'Encadrement';
                              staffMultiplier = 0.5; // 1 responsable pour 2 projets
                              break;
                            case 'planification':
                              typeCategory = 'Encadrement';
                              staffMultiplier = 0.3;
                              break;
                            case 'approvisionnement':
                              typeCategory = 'Poseurs';
                              staffMultiplier = 0.8;
                              break;
                            case 'chantier':
                              typeCategory = 'Poseurs';
                              // Projets complexes nécessitent plus de poseurs (le chef d'équipe sera ajouté automatiquement)
                              staffMultiplier = (item.priority === 'critique' || item.estimatedHours && item.estimatedHours > 100) ? 1.2 : 1;
                              break;
                            case 'sav':
                              typeCategory = 'Poseurs';
                              staffMultiplier = 0.8; // SAV nécessite moins de personnel
                              break;
                            default:
                              typeCategory = 'Poseurs';
                              staffMultiplier = 1;
                          }
                        } else if (item.type === 'task') {
                          // Logique pour les tâches spécifiques
                          if (item.isJalon) {
                            typeCategory = 'Encadrement';
                            staffMultiplier = 0.2;
                          } else {
                            typeCategory = 'Poseurs';
                            staffMultiplier = 1;
                          }
                        }
                        
                        // Calculer le nombre de personnes nécessaires (8h = 1 personne)
                        const personsNeeded = Math.ceil((dailyHours / 8) * staffMultiplier);
                        byType[typeCategory] += personsNeeded;
                        
                        // Si c'est des poseurs, toujours ajouter un chef d'équipe automatiquement
                        // Ratio : 1 chef pour 3-4 poseurs maximum
                        if (typeCategory === 'Poseurs' && personsNeeded > 0) {
                          const chefEquipe = Math.ceil(personsNeeded / 3.5); // 1 chef pour ~3-4 poseurs
                          byType['Encadrement'] += chefEquipe;
                          totalStaff += personsNeeded + chefEquipe;
                        } else {
                          totalStaff += personsNeeded;
                        }
                      }
                    });

                    dailyStaffNeeds[dateKey] = { total: totalStaff, byType };
                    maxStaffNeeded = Math.max(maxStaffNeeded, totalStaff);
                  });

                  // Générer les barres empilées par type de personnel
                  return periodInfo.periodDays.map((day, index) => {
                    const dateKey = format(day, 'yyyy-MM-dd');
                    const dayStaff = dailyStaffNeeds[dateKey] || { total: 0, byType: {} };
                    
                    const dayWidth = 100 / periodInfo.totalDays;
                    let currentHeight = 0;
                    
                    // Couleurs par type de personnel
                    const typeColors = {
                      'Encadrement': 'bg-purple-500',
                      'Poseurs': 'bg-blue-500'
                    };
                    
                    const segments = Object.entries(dayStaff.byType).map(([type, count]) => {
                      if (count === 0) return null;
                      
                      const segmentHeight = maxStaffNeeded > 0 ? (count / maxStaffNeeded) * 100 : 0;
                      const segment = (
                        <div
                          key={`${index}-${type}`}
                          className={`absolute ${typeColors[type] || 'bg-gray-400'} border-r border-white transition-all hover:opacity-75`}
                          style={{
                            left: `${index * dayWidth}%`,
                            width: `${dayWidth}%`,
                            bottom: `${currentHeight}%`,
                            height: `${segmentHeight}%`
                          }}
                          title={`${format(day, 'dd/MM', { locale: fr })}: ${count} ${type}`}
                        />
                      );
                      currentHeight += segmentHeight;
                      return segment;
                    }).filter(Boolean);
                    
                    return segments;
                  }).flat();
                })()}
                
                {/* Ligne de référence capacité équipe */}
                <div className="absolute top-4 left-0 w-full h-px bg-orange-400 opacity-60" />
                <div className="absolute top-1 left-2 text-xs text-orange-600 font-medium">
                  Capacité équipe actuelle
                </div>
                
                {/* Étiquettes de valeurs */}
                <div className="absolute top-1 right-2 text-xs text-gray-600 font-medium">
                  Max: {(() => {
                    const maxStaff = Math.max(...periodInfo.periodDays.map(day => {
                      const dateKey = format(day, 'yyyy-MM-dd');
                      return Object.values(itemWorkloads).reduce((sum, workload, index) => {
                        const item = allGanttItems[index];
                        const dailyHours = workload.dailyDistribution[dateKey] || 0;
                        const personsNeeded = Math.ceil(dailyHours / 8);
                        return sum + personsNeeded;
                      }, 0);
                    }));
                    return maxStaff;
                  })()} pers.
                </div>
                
                <div className="absolute bottom-1 right-2 text-xs text-gray-600">
                  Moyenne: {(() => {
                    const totalDays = periodInfo.periodDays.length;
                    if (totalDays === 0) return '0';
                    const avgStaff = periodInfo.periodDays.reduce((sum, day) => {
                      const dateKey = format(day, 'yyyy-MM-dd');
                      return sum + Object.values(itemWorkloads).reduce((daySum, workload, index) => {
                        const dailyHours = workload.dailyDistribution[dateKey] || 0;
                        return daySum + Math.ceil(dailyHours / 8);
                      }, 0);
                    }, 0) / totalDays;
                    return avgStaff.toFixed(1);
                  })()} pers.
                </div>
              </div>
            </div>
            <div className="col-span-1 flex flex-col items-center justify-center space-y-1">
              <Badge variant="secondary" className="text-xs">
                {totalEstimatedPersons} ETP
              </Badge>
              <div className="text-xs text-gray-500 text-center">
                Total requis
              </div>
            </div>
          </div>
          
          {/* Légende par type de personnel */}
          <div className="flex items-center justify-center space-x-6 text-xs text-gray-600 mt-2">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-purple-500 rounded" />
              <span>Encadrement</span>
              <span className="text-gray-500">(Étude, Planning, Chefs d'équipe)</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-blue-500 rounded" />
              <span>Poseurs</span>
              <span className="text-gray-500">(Chantier, Pose, SAV - avec chef auto)</span>
            </div>
          </div>
          
          {/* Indicateurs de gestion des effectifs */}
          <div className="grid grid-cols-4 gap-2 mt-4 text-xs">
            <div className="bg-blue-50 p-2 rounded border">
              <div className="font-medium text-blue-700">Pic d'activité</div>
              <div className="text-blue-600">
                {(() => {
                  const peakDay = periodInfo.periodDays.reduce((peak, day) => {
                    const dateKey = format(day, 'yyyy-MM-dd');
                    const dayStaff = Object.values(itemWorkloads).reduce((sum, workload) => 
                      sum + Math.ceil((workload.dailyDistribution[dateKey] || 0) / 8), 0
                    );
                    return dayStaff > peak.staff ? { day, staff: dayStaff } : peak;
                  }, { day: periodInfo.periodDays[0], staff: 0 });
                  
                  return `${format(peakDay.day, 'dd/MM', { locale: fr })} (${peakDay.staff} pers.)`;
                })()}
              </div>
            </div>
            
            <div className="bg-green-50 p-2 rounded border">
              <div className="font-medium text-green-700">Période creuse</div>
              <div className="text-green-600">
                {(() => {
                  const lowDay = periodInfo.periodDays.reduce((low, day) => {
                    const dateKey = format(day, 'yyyy-MM-dd');
                    const dayStaff = Object.values(itemWorkloads).reduce((sum, workload) => 
                      sum + Math.ceil((workload.dailyDistribution[dateKey] || 0) / 8), 0
                    );
                    return dayStaff < low.staff ? { day, staff: dayStaff } : low;
                  }, { day: periodInfo.periodDays[0], staff: 999 });
                  
                  return `${format(lowDay.day, 'dd/MM', { locale: fr })} (${lowDay.staff} pers.)`;
                })()}
              </div>
            </div>
            
            <div className="bg-orange-50 p-2 rounded border">
              <div className="font-medium text-orange-700">Besoins critiques</div>
              <div className="text-orange-600">
                {(() => {
                  const criticalDays = periodInfo.periodDays.filter(day => {
                    const dateKey = format(day, 'yyyy-MM-dd');
                    const dayStaff = Object.values(itemWorkloads).reduce((sum, workload) => 
                      sum + Math.ceil((workload.dailyDistribution[dateKey] || 0) / 8), 0
                    );
                    return dayStaff > 12; // Seuil critique à définir
                  }).length;
                  
                  return `${criticalDays} jour${criticalDays > 1 ? 's' : ''}`;
                })()}
              </div>
            </div>
            
            <div className="bg-purple-50 p-2 rounded border">
              <div className="font-medium text-purple-700">Optimisation</div>
              <div className="text-purple-600">
                {(() => {
                  const variance = (() => {
                    const staffPerDay = periodInfo.periodDays.map(day => {
                      const dateKey = format(day, 'yyyy-MM-dd');
                      return Object.values(itemWorkloads).reduce((sum, workload) => 
                        sum + Math.ceil((workload.dailyDistribution[dateKey] || 0) / 8), 0
                      );
                    });
                    const avg = staffPerDay.reduce((a, b) => a + b, 0) / staffPerDay.length;
                    const variance = staffPerDay.reduce((sum, staff) => sum + Math.pow(staff - avg, 2), 0) / staffPerDay.length;
                    return Math.sqrt(variance);
                  })();
                  
                  return variance < 2 ? 'Lissée' : variance < 4 ? 'Modérée' : 'À lisser';
                })()}
              </div>
            </div>
          </div>
        </div>

        {/* Preview pendant le drag */}
        {dragPreview && (
          <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-50">
            <div className="absolute bg-blue-500/20 border-2 border-blue-500 rounded p-2 text-sm">
              <div className="font-medium">{dragPreview.itemId}</div>
              <div>
                {format(dragPreview.previewStartDate, 'dd/MM/yyyy')} - {format(dragPreview.previewEndDate, 'dd/MM/yyyy')}
              </div>
              {dragPreview.willNavigate && (
                <div className="text-blue-600 font-medium">
                  → Navigation vers {dragPreview.targetPeriod ? format(dragPreview.targetPeriod, 'MMM yyyy') : 'période adjacente'}
                </div>
              )}
              <div className={`text-xs ${dragPreview.isValidPosition ? 'text-green-600' : 'text-red-600'}`}>
                {dragPreview.isValidPosition ? '✓ Position valide' : '✗ Position invalide'}
              </div>
            </div>
          </div>
        )}

        {/* État vide */}
        {safeAllGanttItems.filter((item) => isItemVisible(item.startDate, item.endDate)).length === 0 && (
          <div className="text-center py-12 text-gray-500 col-span-12">
            <CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Aucun projet ou jalon planifié pour cette période</p>
            <div className="flex justify-center space-x-2 mt-4">
              <Button variant="outline" size="sm" onClick={goToCurrentPeriod}>
                Revenir à la période courante
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowCreateDialog(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Créer une tâche
              </Button>
            </div>
          </div>
        )}

      </CardContent>

      {/* Dialog de création de tâche */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créer une nouvelle tâche</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="task-name">Nom de la tâche</Label>
              <Input
                id="task-name"
                value={newTaskName}
                onChange={(e) => setNewTaskName(e.target.value)}
                placeholder="Entrez le nom de la tâche"
                data-testid="input-task-name"
              />
            </div>
            
            <div>
              <Label htmlFor="task-type">Type</Label>
              <Select value={newTaskType} onValueChange={(value: 'task' | 'milestone') => setNewTaskType(value)}>
                <SelectTrigger data-testid="select-task-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="task">Tâche</SelectItem>
                  <SelectItem value="milestone">Jalon</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="task-project">Projet</Label>
              <Select value={newTaskProject} onValueChange={setNewTaskProject}>
                <SelectTrigger data-testid="select-task-project">
                  <SelectValue placeholder="Sélectionnez un projet" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map(project => (
                    <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {newTaskDate && (
              <div>
                <Label>Date sélectionnée</Label>
                <div className="text-sm text-gray-600 p-2 bg-gray-100 rounded">
                  {format(newTaskDate, 'dd/MM/yyyy', { locale: fr })}
                </div>
              </div>
            )}
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Annuler
              </Button>
              <Button 
                onClick={handleCreateTask} 
                disabled={!newTaskName || !newTaskProject}
                data-testid="button-create-task"
              >
                Créer la tâche
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}