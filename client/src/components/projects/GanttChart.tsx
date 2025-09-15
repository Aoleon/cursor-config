import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  differenceInDays, 
  startOfDay, 
  addWeeks, 
  subWeeks, 
  isSameDay, 
  isWithinInterval,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  eachWeekOfInterval,
  isAfter,
  isBefore
} from "date-fns";
import { fr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import type { GanttProject, GanttMilestone, GanttTask, User } from "@shared/schema";

// Type unifié pour tous les éléments Gantt basé sur les types du schema
interface GanttItem {
  id: string;
  name: string;
  type: 'project' | 'milestone' | 'task';
  startDate: Date;
  endDate: Date;
  status: string;
  responsibleUserId?: string | null;
  responsibleUser?: User;
  progress?: number;
  isJalon?: boolean | null;
  projectId?: string;
  dependencies?: string[];
  priority?: 'tres_faible' | 'faible' | 'normale' | 'elevee' | 'critique';
  estimatedHours?: number | string | null;
  actualHours?: number | string | null;
}

type ViewMode = 'week' | 'month';
type ResizeHandle = 'start' | 'end' | null;

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
  const [currentPeriod, setCurrentPeriod] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [resizeItem, setResizeItem] = useState<{ id: string; handle: ResizeHandle } | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [linkMode, setLinkMode] = useState(false);
  const [linkFromId, setLinkFromId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTaskDate, setNewTaskDate] = useState<Date | null>(null);
  const ganttRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // États pour la création de tâche
  const [newTaskName, setNewTaskName] = useState("");
  const [newTaskType, setNewTaskType] = useState<'task' | 'milestone'>('task');
  const [newTaskProject, setNewTaskProject] = useState("");

  // Calculer les périodes selon le mode de vue - OPTIMISÉ avec useMemo
  const { periodStart, periodEnd, periodDays, totalDays, monthWeeksCount } = useMemo(() => {
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

  // Préparer les éléments Gantt avec dépendances et priorités
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

  // Obtenir la couleur selon le statut et la priorité - OPTIMISÉ avec useCallback
  const getItemColor = useCallback((status: string, type: 'project' | 'milestone' | 'task', priority?: string, isOverdue?: boolean) => {
    if (isOverdue) {
      return "bg-red-500 border-red-600"; // Rouge pour les éléments en retard
    }
    
    if (priority === 'critique') {
      return "bg-red-400 border-red-500";
    } else if (priority === 'elevee') {
      return "bg-orange-400 border-orange-500";
    }
    
    if (type === 'milestone') {
      switch (status) {
        case "completed": return "bg-green-500 border-green-600";
        case "in-progress": return "bg-blue-500 border-blue-600";
        case "pending": return "bg-gray-400 border-gray-500";
        case "overdue": return "bg-red-500 border-red-600";
        default: return "bg-gray-400 border-gray-500";
      }
    } else {
      switch (status) {
        case "etude": return "bg-blue-500 border-blue-600";
        case "planification": return "bg-yellow-500 border-yellow-600";
        case "approvisionnement": return "bg-orange-500 border-orange-600";
        case "chantier": return "bg-green-500 border-green-600";
        case "sav": return "bg-purple-500 border-purple-600";
        case "termine": return "bg-green-600 border-green-700";
        default: return "bg-gray-500 border-gray-600";
      }
    }
  }, []);

  // Calculer la position et largeur des barres - OPTIMISÉ avec useCallback
  const getBarPosition = useCallback((startDate: Date, endDate: Date) => {
    const dayWidth = 100 / totalDays;
    
    const startDayIndex = differenceInDays(startDate, periodStart);
    const duration = differenceInDays(endDate, startDate) + 1;
    
    const left = Math.max(0, startDayIndex * dayWidth);
    const width = Math.min(100 - left, duration * dayWidth);
    
    return { left: `${left}%`, width: `${width}%` };
  }, [totalDays, periodStart]);

  // Vérifier si l'élément est visible dans la période courante - OPTIMISÉ avec useCallback
  const isItemVisible = useCallback((startDate: Date, endDate: Date) => {
    return isWithinInterval(startDate, { start: periodStart, end: periodEnd }) ||
           isWithinInterval(endDate, { start: periodStart, end: periodEnd }) ||
           (startDate <= periodStart && endDate >= periodEnd);
  }, [periodStart, periodEnd]);

  // Vérifier si l'élément est en retard - OPTIMISÉ avec useCallback
  const isOverdue = useCallback((item: GanttItem) => {
    const now = new Date();
    if (item.type === 'milestone') {
      return isAfter(now, item.endDate) && item.status !== 'completed';
    }
    return isAfter(now, item.endDate) && item.status !== 'termine' && item.status !== 'completed';
  }, []);

  // Gestion du drag and drop amélioré
  const handleDragStart = (e: React.DragEvent, itemId: string) => {
    if (linkMode) return; // Pas de drag en mode liaison
    
    setDraggedItem(itemId);
    e.dataTransfer.effectAllowed = 'move';
    
    const rect = ganttRef.current?.getBoundingClientRect();
    if (rect) {
      const relativeX = e.clientX - rect.left;
      const dayWidth = rect.width / totalDays;
      setDragOffset(relativeX % dayWidth);
    }
  };

  const handleResizeStart = (e: React.MouseEvent, itemId: string, handle: 'start' | 'end') => {
    e.stopPropagation();
    setResizeItem({ id: itemId, handle });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (resizeItem && ganttRef.current) {
      const rect = ganttRef.current.getBoundingClientRect();
      const relativeX = e.clientX - rect.left;
      const dayWidth = rect.width / totalDays;
      const dayIndex = Math.floor(relativeX / dayWidth);
      
      if (dayIndex >= 0 && dayIndex < totalDays) {
        const newDate = addDays(periodStart, dayIndex);
        const item = ganttItems.find(i => i.id === resizeItem.id);
        
        if (item && onDateUpdate) {
          if (resizeItem.handle === 'start') {
            if (isBefore(newDate, item.endDate)) {
              onDateUpdate(resizeItem.id, newDate, item.endDate, item.type);
            }
          } else {
            if (isAfter(newDate, item.startDate)) {
              onDateUpdate(resizeItem.id, item.startDate, newDate, item.type);
            }
          }
        }
      }
    }
  }, [resizeItem, ganttItems, onDateUpdate, periodStart, totalDays]);

  const handleMouseUp = useCallback(() => {
    setResizeItem(null);
  }, []);

  useEffect(() => {
    if (resizeItem) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizeItem, handleMouseMove, handleMouseUp]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedItem || !ganttRef.current) return;

    const rect = ganttRef.current.getBoundingClientRect();
    const relativeX = e.clientX - rect.left - dragOffset;
    const dayWidth = rect.width / totalDays;
    const dayIndex = Math.floor(relativeX / dayWidth);
    
    if (dayIndex >= 0 && dayIndex < totalDays) {
      const newStartDate = addDays(periodStart, dayIndex);
      const item = ganttItems.find(i => i.id === draggedItem);
      
      if (item) {
        const duration = differenceInDays(item.endDate, item.startDate);
        const newEndDate = addDays(newStartDate, duration);
        
        if (onDateUpdate) {
          onDateUpdate(draggedItem, newStartDate, newEndDate, item.type);
        }
      }
    }
    
    setDraggedItem(null);
    setDragOffset(0);
  };

  // Gestion du double-clic pour créer une tâche
  const handleDoubleClick = (e: React.MouseEvent) => {
    if (!ganttRef.current) return;
    
    const rect = ganttRef.current.getBoundingClientRect();
    const relativeX = e.clientX - rect.left;
    const dayWidth = rect.width / totalDays;
    const dayIndex = Math.floor(relativeX / dayWidth);
    
    if (dayIndex >= 0 && dayIndex < totalDays) {
      const clickedDate = addDays(periodStart, dayIndex);
      setNewTaskDate(clickedDate);
      setShowCreateDialog(true);
    }
  };

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

  // Créer une nouvelle tâche
  const handleCreateTask = () => {
    console.log("handleCreateTask called with:", { newTaskName, newTaskDate, newTaskProject, newTaskType });
    
    if (!newTaskName || !newTaskProject) {
      console.log("Validation failed - missing required fields");
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive"
      });
      return;
    }
    
    // Si pas de date, utiliser aujourd'hui par défaut
    const taskDate = newTaskDate || new Date();
    
    const endDate = newTaskType === 'milestone' 
      ? taskDate 
      : addDays(taskDate, 1); // Tâche d'1 jour par défaut
    
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

  // Navigation dans les périodes
  const goToPreviousPeriod = () => {
    setCurrentPeriod(viewMode === 'week' ? subWeeks(currentPeriod, 1) : subMonths(currentPeriod, 1));
  };
  
  const goToNextPeriod = () => {
    setCurrentPeriod(viewMode === 'week' ? addWeeks(currentPeriod, 1) : addMonths(currentPeriod, 1));
  };
  
  const goToCurrentPeriod = () => setCurrentPeriod(new Date());

  // Configuration de la charge de travail
  const workingDaysPerWeek = 5; // Lundi à vendredi
  const hoursPerWorkingDay = 8; // 8h par jour ouvrable
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
  const calculateTeamWorkload = useMemo(() => {
    const workloadByPeriod: { [key: string]: { 
      totalHours: number; 
      estimatedPersons: number; 
      activeProjects: number; 
      periodStart: Date; 
      periodEnd: Date;
      projectDetails: Array<{
        name: string;
        totalHours: number;
        projectDuration: number;
        overlapDays: number;
        proportionalHours: number;
        hoursPerDay: number;
      }>;
    } } = {};

    // Filtrer les projets actifs (phases de production)
    const activeProjects = ganttItems.filter(item => 
      item.type === 'project' && 
      ['planification', 'approvisionnement', 'chantier'].includes(item.status)
    );

    if (viewMode === 'week') {
      // Calcul par semaine avec répartition proportionnelle
      periodDays.forEach((day, index) => {
        if (index % 7 === 0) { // Une fois par semaine
          const weekStart = day;
          const weekEnd = addDays(weekStart, 6);
          const weekKey = format(weekStart, 'yyyy-MM-dd');
          
          let totalProportionalHours = 0;
          const projectDetails: Array<{
            name: string;
            totalHours: number;
            projectDuration: number;
            overlapDays: number;
            proportionalHours: number;
            hoursPerDay: number;
          }> = [];
          
          activeProjects.forEach(project => {
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
      const monthStart = periodStart;
      const monthEnd = periodEnd;
      const monthKey = format(monthStart, 'yyyy-MM');
      
      let totalProportionalHours = 0;
      const projectDetails: Array<{
        name: string;
        totalHours: number;
        projectDuration: number;
        overlapDays: number;
        proportionalHours: number;
        hoursPerDay: number;
      }> = [];
      
      activeProjects.forEach(project => {
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
  }, [ganttItems, viewMode, currentPeriod, periodDays, periodStart, periodEnd, weeklyFteHours, hoursPerWorkingDay]);

  // Obtenir la couleur selon la charge
  const getWorkloadColor = (estimatedPersons: number) => {
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
  const getWorkloadTooltip = (workload: { 
    totalHours: number; 
    estimatedPersons: number; 
    activeProjects: number; 
    periodStart: Date; 
    periodEnd: Date;
    projectDetails: Array<{
      name: string;
      totalHours: number;
      projectDuration: number;
      overlapDays: number;
      proportionalHours: number;
      hoursPerDay: number;
    }>;
  }) => {
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

  // Calculer la charge d'équipe (déjà mémorisé avec useMemo)
  const teamWorkload = calculateTeamWorkload;

  // Rendu des lignes de dépendances
  const renderDependencyLines = () => {
    if (!ganttRef.current) return null;
    
    const lines: JSX.Element[] = [];
    
    ganttItems.forEach(item => {
      if (item.dependencies && item.dependencies.length > 0) {
        item.dependencies.forEach(depId => {
          const dependency = ganttItems.find(dep => dep.id === depId);
          if (dependency && isItemVisible(dependency.startDate, dependency.endDate) && isItemVisible(item.startDate, item.endDate)) {
            // Calculer les positions pour dessiner la ligne
            // Cette logique serait complexe, simplifions avec une indication visuelle
            lines.push(
              <div
                key={`dep-${depId}-${item.id}`}
                className="absolute inset-0 pointer-events-none"
              >
                <svg className="w-full h-full">
                  <defs>
                    <marker id="arrowhead" markerWidth="10" markerHeight="7" 
                     refX="0" refY="3.5" orient="auto">
                      <polygon points="0 0, 10 3.5, 0 7" fill="blue" opacity="0.6" />
                    </marker>
                  </defs>
                  <line
                    x1="50%"
                    y1="20px"
                    x2="50%"
                    y2="40px"
                    stroke="blue"
                    strokeWidth="2"
                    opacity="0.6"
                    markerEnd="url(#arrowhead)"
                  />
                </svg>
              </div>
            );
          }
        });
      }
    });
    
    return lines;
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
          </CardTitle>
          
          <div className="flex items-center space-x-2">
            <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as ViewMode)}>
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
              data-testid="link-mode-button"
            >
              <Link className="h-4 w-4" />
            </Button>
            
            <Button variant="outline" size="sm" onClick={goToPreviousPeriod}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToCurrentPeriod}>
              Aujourd'hui
            </Button>
            <Button variant="outline" size="sm" onClick={goToNextPeriod}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="text-sm text-gray-600">
          {viewMode === 'week' 
            ? `Semaine du ${format(periodStart, 'dd MMM', { locale: fr })} au ${format(periodEnd, 'dd MMM yyyy', { locale: fr })}`
            : `${format(periodStart, 'MMMM yyyy', { locale: fr })}`
          }
        </div>
      </CardHeader>

      <CardContent>
        {/* En-tête du calendrier */}
        <div className="grid grid-cols-12 gap-1 mb-4">
          <div className="col-span-4 text-sm font-medium text-gray-700 p-2">
            Éléments de planning
          </div>
          <div className={`col-span-8 grid gap-1 ${viewMode === 'week' ? 'grid-cols-7' : `grid-cols-${monthWeeksCount}`}`}>
            {viewMode === 'week' ? (
              // Vue hebdomadaire : afficher chaque jour
              periodDays.map((day) => (
                <div
                  key={day.toISOString()}
                  className={`text-center p-1 text-xs font-medium rounded ${
                    isSameDay(day, new Date()) 
                      ? 'bg-primary text-primary-foreground' 
                      : 'text-gray-700 bg-gray-50'
                  }`}
                >
                  <div>{format(day, 'EEE', { locale: fr })}</div>
                  <div className="text-xs">{format(day, 'd')}</div>
                </div>
              ))
            ) : (
              // Vue mensuelle : afficher les semaines
              eachWeekOfInterval({ 
                start: periodStart, 
                end: periodEnd 
              }, { weekStartsOn: 1 }).map((week, index) => (
                <div
                  key={week.toISOString()}
                  className="text-center p-1 text-xs font-medium text-gray-700 bg-gray-50 rounded"
                >
                  S{index + 1}
                </div>
              ))
            )}
          </div>
        </div>

        <Separator className="mb-4" />

        {/* Zone de planning Gantt */}
        <div 
          ref={ganttRef}
          className="space-y-2 relative"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onDoubleClick={handleDoubleClick}
        >
          {renderDependencyLines()}
          
          {ganttItems
            .filter(item => isItemVisible(item.startDate, item.endDate))
            .sort((a, b) => {
              // Trier par priorité puis par date
              const priorityOrder = { 'critique': 5, 'elevee': 4, 'normale': 3, 'faible': 2, 'tres_faible': 1 };
              const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 3;
              const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 3;
              
              if (aPriority !== bPriority) return bPriority - aPriority;
              return a.startDate.getTime() - b.startDate.getTime();
            })
            .map((item) => {
            const position = getBarPosition(item.startDate, item.endDate);
            const itemIsOverdue = isOverdue(item);
            const statusColor = getItemColor(item.status, item.type, item.priority, itemIsOverdue);
            
            return (
              <div key={item.id} className="grid grid-cols-12 gap-1 group">
                {/* Nom de l'élément avec informations étendues */}
                <div className="col-span-4 flex items-center justify-between p-2">
                  <div className="flex items-center space-x-2 flex-1">
                    {item.type === 'milestone' ? (
                      <div className={`w-3 h-3 rounded-full border-2 ${statusColor}`} />
                    ) : (
                      <div className={`w-3 h-3 rounded border-2 ${statusColor}`} />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-1">
                        <span 
                          className="text-sm font-medium truncate cursor-pointer hover:text-primary"
                          title={item.name}
                          onClick={() => handleItemClick(item.id)}
                        >
                          {item.name}
                        </span>
                        {itemIsOverdue && (
                          <AlertTriangle className="h-3 w-3 text-red-500" />
                        )}
                        {item.priority === 'critique' && (
                          <TrendingUp className="h-3 w-3 text-red-500" />
                        )}
                      </div>
                      
                      {/* Heures estimées vs réelles */}
                      {item.estimatedHours && (
                        <div className="text-xs text-gray-500 mt-1">
                          <Clock className="h-3 w-3 inline mr-1" />
                          {item.estimatedHours}h 
                          {item.actualHours && (
                            <span className={item.actualHours > item.estimatedHours ? 'text-red-500' : 'text-green-600'}>
                              / {item.actualHours}h
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-col space-y-1">
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${
                        item.priority === 'critique' ? 'border-red-500 text-red-700' :
                        item.priority === 'elevee' ? 'border-orange-500 text-orange-700' :
                        'border-gray-500 text-gray-700'
                      }`}
                    >
                      {item.type === 'milestone' ? 'Jalon' : item.type === 'task' ? 'Tâche' : 'Projet'}
                    </Badge>
                    
                    {item.dependencies && item.dependencies.length > 0 && (
                      <div className="text-xs text-blue-600 flex items-center">
                        <Link className="h-2 w-2 mr-1" />
                        {item.dependencies.length}
                      </div>
                    )}
                  </div>
                </div>

                {/* Barre Gantt avec redimensionnement */}
                <div className="col-span-8 relative h-8 border border-gray-200 rounded">
                  <div
                    className={`absolute top-0 h-full rounded flex items-center px-2 text-white text-xs font-medium border-2 transition-all ${statusColor} ${
                      draggedItem === item.id ? 'opacity-50 z-10' : ''
                    } ${linkFromId === item.id ? 'ring-2 ring-blue-400' : ''} group-hover:shadow-md cursor-move`}
                    style={position}
                    draggable={!linkMode}
                    onDragStart={(e) => handleDragStart(e, item.id)}
                    onClick={() => handleItemClick(item.id)}
                    data-testid={`gantt-bar-${item.id}`}
                  >
                    {/* Poignée de redimensionnement gauche */}
                    {item.type !== 'milestone' && (
                      <div
                        className="absolute left-0 top-0 h-full w-2 cursor-ew-resize flex items-center justify-center group-hover:bg-black group-hover:bg-opacity-20"
                        onMouseDown={(e) => handleResizeStart(e, item.id, 'start')}
                        data-testid={`resize-start-${item.id}`}
                      >
                        <GripHorizontal className="h-2 w-2 opacity-0 group-hover:opacity-70" />
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-1 flex-1 min-w-0">
                      <Move className="h-3 w-3 opacity-70 flex-shrink-0" />
                      <span className="truncate flex-1">{item.name}</span>
                    </div>
                    
                    {/* Poignée de redimensionnement droite */}
                    {item.type !== 'milestone' && (
                      <div
                        className="absolute right-0 top-0 h-full w-2 cursor-ew-resize flex items-center justify-center group-hover:bg-black group-hover:bg-opacity-20"
                        onMouseDown={(e) => handleResizeStart(e, item.id, 'end')}
                        data-testid={`resize-end-${item.id}`}
                      >
                        <GripHorizontal className="h-2 w-2 opacity-0 group-hover:opacity-70" />
                      </div>
                    )}
                    
                    {/* Indicateur de progression pour les projets/tâches */}
                    {item.type !== 'milestone' && item.progress !== undefined && (
                      <div className="absolute bottom-0 left-0 h-1 bg-white bg-opacity-30 rounded-b">
                        <div 
                          className="h-full bg-white rounded-b transition-all duration-300"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Message si aucun élément visible */}
        {ganttItems.filter(item => isItemVisible(item.startDate, item.endDate)).length === 0 && (
          <div className="text-center py-8 text-gray-500">
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

        {/* Statistiques et alertes */}
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
              {ganttItems.reduce((total, item) => {
                const hours = typeof item.estimatedHours === 'string' 
                  ? parseFloat(item.estimatedHours) || 0 
                  : item.estimatedHours || 0;
                return total + hours;
              }, 0)}h
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
            <div className={`col-span-8 grid gap-1 ${viewMode === 'week' ? 'grid-cols-7' : `grid-cols-${monthWeeksCount}`}`}>
              {viewMode === 'week' ? (
                // Vue hebdomadaire : afficher chaque jour
                periodDays.map((day) => (
                  <div
                    key={`workload-header-${day.toISOString()}`}
                    className="text-center p-1 text-xs font-medium text-gray-500 bg-gray-50 rounded"
                  >
                    {format(day, 'EEE', { locale: fr })}
                  </div>
                ))
              ) : (
                // Vue mensuelle : afficher les semaines
                eachWeekOfInterval({ 
                  start: periodStart, 
                  end: periodEnd 
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
                {Object.values(teamWorkload).reduce((total, period) => total + period.estimatedPersons, 0)} pers. total
              </Badge>
            </div>

            <div className="col-span-8 relative h-8 border border-gray-200 rounded bg-gray-50">
              {viewMode === 'week' ? (
                // Vue hebdomadaire : afficher par jour
                periodDays.map((day, dayIndex) => {
                  if (dayIndex % 7 === 0) { // Une fois par semaine
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
                // Vue mensuelle : afficher pour tout le mois
                (() => {
                  const monthKey = format(periodStart, 'yyyy-MM');
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
                <span>Glissez-déposez pour modifier</span>
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