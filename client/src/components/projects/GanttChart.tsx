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
  Move, 
  AlertTriangle, 
  Plus, 
  Link,
  GripHorizontal,
  Clock,
  Calendar,
  TrendingUp,
  ArrowUpDown,
  Users
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
import { useGanttWorkload } from "@/hooks/useGanttWorkload";
import type { GanttProject, GanttMilestone, GanttTask } from "@shared/schema";
import type { GanttItem } from "@/types/gantt";

interface GanttChartProps {
  projects: GanttProject[];
  milestones: GanttMilestone[];
  tasks?: GanttTask[];
  onDateUpdate?: (itemId: string, newStartDate: Date, newEndDate: Date, type: 'project' | 'milestone' | 'task') => void;
  onTaskCreate?: (task: Partial<GanttTask>) => void;
  onDependencyCreate?: (fromId: string, toId: string) => void;
  'data-testid'?: string;
  enableRealtime?: boolean;
}

export default function GanttChart({ 
  projects, 
  milestones, 
  tasks = [],
  onDateUpdate, 
  onTaskCreate,
  onDependencyCreate,
  'data-testid': dataTestId,
  enableRealtime = false
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

  // Préparer les éléments Gantt
  const ganttItems: GanttItem[] = useMemo(() => [
    ...projects.filter(p => p.startDate && p.endDate).map(project => ({
      id: project.id,
      name: project.name,
      type: 'project' as const,
      startDate: new Date(project.startDate!),
      endDate: new Date(project.endDate!),
      status: project.status || 'etude',
      responsibleUserId: project.responsibleUserId,
      progress: project.progressPercentage || 0,
      priority: project.priority || 'normale',
      estimatedHours: project.estimatedHours,
      actualHours: project.actualHours,
      dependencies: project.dependencies || []
    })),
    ...milestones.filter(m => m.date).map(milestone => ({
      id: milestone.id,
      name: milestone.name,
      type: 'milestone' as const,
      startDate: new Date(milestone.date),
      endDate: new Date(milestone.date),
      status: milestone.status,
      isJalon: true,
      projectId: milestone.project,
      priority: milestone.priority || 'normale',
      dependencies: milestone.dependencies || []
    })),
    ...tasks.filter(t => t.startDate && t.endDate).map(task => ({
      id: task.id,
      name: task.name,
      type: 'task' as const,
      startDate: new Date(task.startDate!),
      endDate: new Date(task.endDate!),
      status: task.status || 'a_faire',
      projectId: task.projectId,
      estimatedHours: task.estimatedHours,
      actualHours: task.actualHours,
      isJalon: task.isJalon,
      priority: task.priority || 'normale',
      dependencies: task.dependencies || []
    }))
  ], [projects, milestones, tasks]);

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
    ganttItems,
    periodStart: periodInfo.periodStart,
    periodEnd: periodInfo.periodEnd,
    totalDays: periodInfo.totalDays,
    viewMode,
    currentPeriod,
    linkMode,
    onDateUpdate,
    onPeriodChange: goToSpecificPeriod
  });

  // Hook pour les calculs de workload
  const {
    teamWorkload,
    getWorkloadColor,
    getWorkloadTooltip,
    totalEstimatedPersons,
    totalActiveProjects,
    totalPlannedHours
  } = useGanttWorkload({
    ganttItems,
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
        <div className="grid grid-cols-12 gap-1 mb-4">
          <div className="col-span-4 text-sm font-medium text-gray-700 p-2">
            Projet / Tâche
          </div>
          <div className={`col-span-8 grid gap-1 ${viewMode === 'week' ? 'grid-cols-7' : `grid-cols-${periodInfo.monthWeeksCount}`}`}>
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
          {ganttItems.filter(item => isItemVisible(item.startDate, item.endDate)).map((item) => {
            const position = getBarPosition(item.startDate, item.endDate);
            const colorClass = getItemColor(item.status, item.type, item.priority, isOverdue(item));
            const isDragged = draggedItem === item.id;
            
            return (
              <div key={item.id} className="grid grid-cols-12 gap-1 group">
                {/* Nom de l'élément */}
                <div className="col-span-4 flex items-center justify-between p-2">
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 ${colorClass.includes('bg-') ? colorClass.split(' ')[0] : 'bg-gray-400'} rounded border-2 ${colorClass.includes('border-') ? colorClass.split(' ')[1] || 'border-gray-500' : 'border-gray-500'}`} />
                    <span className="text-sm font-medium truncate" title={item.name}>
                      {item.name}
                    </span>
                    {item.priority === 'critique' && (
                      <AlertTriangle className="h-3 w-3 text-red-500" />
                    )}
                  </div>
                  {item.progress !== undefined && (
                    <Badge variant="outline" className="text-xs">
                      {item.progress}%
                    </Badge>
                  )}
                </div>

                {/* Barre Gantt avec drag/drop et resize */}
                <div className="col-span-8 relative h-8 border border-gray-200 rounded bg-gray-50">
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
                </div>
              </div>
            );
          })}
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
        {ganttItems.filter(item => isItemVisible(item.startDate, item.endDate)).length === 0 && (
          <div className="text-center py-12 text-gray-500">
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

        {/* Statistiques */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-3">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-sm font-medium">Éléments en retard</span>
            </div>
            <div className="text-lg font-bold text-red-600 mt-1">
              {ganttItems.filter(isOverdue).length}
            </div>
          </Card>
          
          <Card className="p-3">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-medium">Priorité critique</span>
            </div>
            <div className="text-lg font-bold text-orange-600 mt-1">
              {ganttItems.filter(item => item.priority === 'critique').length}
            </div>
          </Card>
          
          <Card className="p-3">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Heures planifiées</span>
            </div>
            <div className="text-lg font-bold text-blue-600 mt-1">
              {totalPlannedHours}h
            </div>
          </Card>
        </div>

        {/* Section Charge d'équipe */}
        <div className="mt-6">
          <Separator className="mb-4" />
          
          <div className="flex items-center space-x-2 mb-4">
            <Users className="h-5 w-5 text-purple-600" />
            <h4 className="text-sm font-medium text-gray-700">Charge d'équipe par période</h4>
            <Badge variant="outline" className="text-xs">
              Projets actifs uniquement
            </Badge>
          </div>

          {/* En-tête de la charge d'équipe */}
          <div className="grid grid-cols-12 gap-1 mb-2">
            <div className="col-span-4 text-sm font-medium text-gray-700 p-2">
              Charge équipe
            </div>
            <div className={`col-span-8 grid gap-1 ${viewMode === 'week' ? 'grid-cols-7' : `grid-cols-${periodInfo.monthWeeksCount}`}`}>
              {viewMode === 'week' ? (
                periodInfo.periodDays.map((day) => (
                  <div
                    key={`workload-header-${day.toISOString()}`}
                    className="text-center p-1 text-xs font-medium text-gray-500 bg-gray-50 rounded"
                  >
                    {format(day, 'EEE', { locale: fr })}
                  </div>
                ))
              ) : (
                eachWeekOfInterval({ 
                  start: periodInfo.periodStart, 
                  end: periodInfo.periodEnd 
                }, { weekStartsOn: 1 }).map((week, index) => (
                  <div
                    key={`workload-header-${week.toISOString()}`}
                    className="text-center p-1 text-xs font-medium text-gray-500 bg-gray-50 rounded"
                  >
                    S{index + 1}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Ligne de charge d'équipe */}
          <div className="grid grid-cols-12 gap-1 group">
            <div className="col-span-4 flex items-center justify-between p-2">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-purple-500 rounded border-2 border-purple-600" />
                <span className="text-sm font-medium">Besoin en personnel</span>
              </div>
              <Badge variant="outline" className="text-xs">
                {totalEstimatedPersons} pers. total
              </Badge>
            </div>

            <div className="col-span-8 relative h-8 border border-gray-200 rounded bg-gray-50">
              {viewMode === 'week' ? (
                periodInfo.periodDays.map((day, dayIndex) => {
                  if (dayIndex % 7 === 0) {
                    const weekKey = format(day, 'yyyy-MM-dd');
                    const workload = teamWorkload[weekKey];
                    
                    if (!workload) return null;
                    
                    const position = getBarPosition(workload.periodStart, workload.periodEnd);
                    const workloadColor = getWorkloadColor(workload.estimatedPersons);
                    const tooltip = getWorkloadTooltip(workload);
                    
                    return (
                      <div
                        key={`workload-bar-${weekKey}`}
                        className={`absolute top-0 h-full rounded flex items-center justify-center text-xs font-medium border-2 transition-all ${workloadColor} hover:shadow-md cursor-help`}
                        style={position}
                        title={tooltip}
                        data-testid={`workload-bar-${weekKey}`}
                      >
                        {workload.estimatedPersons > 0 && (
                          <span className="flex items-center space-x-1">
                            <Users className="h-3 w-3" />
                            <span>{workload.estimatedPersons}</span>
                          </span>
                        )}
                      </div>
                    );
                  }
                  return null;
                })
              ) : (
                (() => {
                  const monthKey = format(periodInfo.periodStart, 'yyyy-MM');
                  const workload = teamWorkload[monthKey];
                  
                  if (!workload) return null;
                  
                  const workloadColor = getWorkloadColor(workload.estimatedPersons);
                  const tooltip = getWorkloadTooltip(workload);
                  
                  return (
                    <div
                      key={`workload-bar-${monthKey}`}
                      className={`absolute top-0 left-0 w-full h-full rounded flex items-center justify-center text-sm font-medium border-2 transition-all ${workloadColor} hover:shadow-md cursor-help`}
                      title={tooltip}
                      data-testid={`workload-bar-${monthKey}`}
                    >
                      {workload.estimatedPersons > 0 && (
                        <span className="flex items-center space-x-2">
                          <Users className="h-4 w-4" />
                          <span>{workload.estimatedPersons} personne{workload.estimatedPersons > 1 ? 's' : ''}</span>
                          <span className="text-xs opacity-70">({workload.totalHours}h)</span>
                        </span>
                      )}
                    </div>
                  );
                })()
              )}
            </div>
          </div>

          {/* Résumé de la charge */}
          <div className="mt-3 p-3 bg-purple-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-400 rounded border border-green-500" />
                <span>1-2 pers. (Normal)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-yellow-400 rounded border border-yellow-500" />
                <span>3-4 pers. (Élevé)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-orange-400 rounded border border-orange-500" />
                <span>5-6 pers. (Important)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-400 rounded border border-red-500" />
                <span>7+ pers. (Critique)</span>
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-600">
              Estimation basée sur 40h/semaine par personne • Projets en phase planification, approvisionnement et chantier
            </div>
          </div>
        </div>

        {/* Légende améliorée */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Légende et actions</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded border-2 border-blue-600" />
                <span>Étude / En cours</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded border-2 border-red-600" />
                <span>En retard / Critique</span>
              </div>
              <div className="flex items-center space-x-2">
                <Move className="h-3 w-3 text-gray-500" />
                <span>Glissez-déposez pour modifier (drag latéral supporté)</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <ArrowUpDown className="h-3 w-3 text-gray-500" />
                <span>Redimensionnez par les bords</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-gray-500">Double-clic</span>
                <span>Créer une nouvelle tâche</span>
              </div>
              <div className="flex items-center space-x-2">
                <Link className="h-3 w-3 text-blue-500" />
                <span>Mode liaison pour dépendances</span>
              </div>
            </div>
          </div>
        </div>
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