import { useState, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CalendarDays, ChevronLeft, ChevronRight, Move, AlertTriangle } from "lucide-react";
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, differenceInDays, startOfDay, addWeeks, subWeeks, isSameDay, isWithinInterval } from "date-fns";
import { fr } from "date-fns/locale";

interface GanttItem {
  id: string;
  name: string;
  type: 'project' | 'milestone';
  startDate: Date;
  endDate: Date;
  status: string;
  responsibleUser?: any;
  progress?: number;
  isJalon?: boolean;
  projectId?: string;
}

interface GanttChartProps {
  projects: any[];
  milestones: any[];
  onDateUpdate?: (itemId: string, newStartDate: Date, newEndDate: Date, type: 'project' | 'milestone') => void;
  'data-testid'?: string;
}

export default function GanttChart({ projects, milestones, onDateUpdate, 'data-testid': dataTestId }: GanttChartProps) {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const ganttRef = useRef<HTMLDivElement>(null);

  // Calculer les dates de la semaine courante
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Préparer les éléments Gantt
  const ganttItems: GanttItem[] = [
    ...projects.filter(p => p.startDate && p.endDate).map(project => ({
      id: project.id,
      name: project.name,
      type: 'project' as const,
      startDate: new Date(project.startDate),
      endDate: new Date(project.endDate),
      status: project.status,
      responsibleUser: project.responsibleUser,
      progress: project.progressPercentage || 0
    })),
    ...milestones.filter(m => m.date).map(milestone => ({
      id: milestone.id,
      name: milestone.name,
      type: 'milestone' as const,
      startDate: new Date(milestone.date),
      endDate: new Date(milestone.date),
      status: milestone.status,
      isJalon: true,
      projectId: milestone.project
    }))
  ];

  // Obtenir la couleur du statut
  const getStatusColor = (status: string, type: 'project' | 'milestone') => {
    if (type === 'milestone') {
      switch (status) {
        case "completed": return "bg-green-500";
        case "in-progress": return "bg-blue-500";
        case "pending": return "bg-gray-400";
        case "overdue": return "bg-red-500";
        default: return "bg-gray-400";
      }
    } else {
      switch (status) {
        case "etude": return "bg-blue-500";
        case "planification": return "bg-yellow-500";
        case "approvisionnement": return "bg-orange-500";
        case "chantier": return "bg-green-500";
        case "sav": return "bg-purple-500";
        default: return "bg-gray-500";
      }
    }
  };

  // Calculer la position et largeur des barres
  const getBarPosition = (startDate: Date, endDate: Date) => {
    const totalDays = 7; // Semaine de 7 jours
    const dayWidth = 100 / totalDays; // Pourcentage par jour
    
    const startDayIndex = differenceInDays(startDate, weekStart);
    const duration = differenceInDays(endDate, startDate) + 1;
    
    const left = Math.max(0, startDayIndex * dayWidth);
    const width = Math.min(100 - left, duration * dayWidth);
    
    return { left: `${left}%`, width: `${width}%` };
  };

  // Vérifier si l'élément est visible dans la semaine courante
  const isItemVisible = (startDate: Date, endDate: Date) => {
    return isWithinInterval(startDate, { start: weekStart, end: weekEnd }) ||
           isWithinInterval(endDate, { start: weekStart, end: weekEnd }) ||
           (startDate <= weekStart && endDate >= weekEnd);
  };

  // Gestion du drag and drop
  const handleDragStart = (e: React.DragEvent, itemId: string) => {
    setDraggedItem(itemId);
    e.dataTransfer.effectAllowed = 'move';
    
    // Calculer l'offset initial
    const rect = ganttRef.current?.getBoundingClientRect();
    if (rect) {
      const relativeX = e.clientX - rect.left;
      const dayWidth = rect.width / 7;
      setDragOffset(relativeX % dayWidth);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedItem || !ganttRef.current) return;

    const rect = ganttRef.current.getBoundingClientRect();
    const relativeX = e.clientX - rect.left - dragOffset;
    const dayWidth = rect.width / 7;
    const dayIndex = Math.floor(relativeX / dayWidth);
    
    if (dayIndex >= 0 && dayIndex < 7) {
      const newStartDate = addDays(weekStart, dayIndex);
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

  // Navigation dans les semaines
  const goToPreviousWeek = () => setCurrentWeek(subWeeks(currentWeek, 1));
  const goToNextWeek = () => setCurrentWeek(addWeeks(currentWeek, 1));
  const goToCurrentWeek = () => setCurrentWeek(new Date());

  return (
    <Card className="w-full" data-testid={dataTestId}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <CalendarDays className="h-5 w-5" />
            <span>Planning Gantt</span>
          </CardTitle>
          
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={goToPreviousWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToCurrentWeek}>
              Aujourd'hui
            </Button>
            <Button variant="outline" size="sm" onClick={goToNextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="text-sm text-gray-600">
          Semaine du {format(weekStart, 'dd MMM', { locale: fr })} au {format(weekEnd, 'dd MMM yyyy', { locale: fr })}
        </div>
      </CardHeader>

      <CardContent>
        {/* En-tête du calendrier */}
        <div className="grid grid-cols-12 gap-1 mb-4">
          <div className="col-span-4 text-sm font-medium text-gray-700 p-2">
            Éléments de planning
          </div>
          <div className="col-span-8 grid grid-cols-7 gap-1">
            {weekDays.map((day) => (
              <div
                key={day.toISOString()}
                className={`text-center p-2 text-sm font-medium rounded ${
                  isSameDay(day, new Date()) 
                    ? 'bg-primary text-primary-foreground' 
                    : 'text-gray-700 bg-gray-50'
                }`}
              >
                <div>{format(day, 'EEE', { locale: fr })}</div>
                <div className="text-xs">{format(day, 'd')}</div>
              </div>
            ))}
          </div>
        </div>

        <Separator className="mb-4" />

        {/* Zone de planning Gantt */}
        <div 
          ref={ganttRef}
          className="space-y-2"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {ganttItems.filter(item => isItemVisible(item.startDate, item.endDate)).map((item) => {
            const position = getBarPosition(item.startDate, item.endDate);
            const statusColor = getStatusColor(item.status, item.type);
            
            return (
              <div key={item.id} className="grid grid-cols-12 gap-1 group">
                {/* Nom de l'élément */}
                <div className="col-span-4 flex items-center space-x-2 p-2">
                  <div className="flex items-center space-x-2">
                    {item.type === 'milestone' ? (
                      <div className={`w-3 h-3 rounded-full ${statusColor}`} />
                    ) : (
                      <div className={`w-3 h-3 rounded ${statusColor}`} />
                    )}
                    <span className="text-sm font-medium truncate" title={item.name}>
                      {item.name}
                    </span>
                  </div>
                  
                  <Badge variant="outline" className="text-xs ml-auto">
                    {item.type === 'milestone' ? 'Jalon' : 'Projet'}
                  </Badge>
                </div>

                {/* Barre Gantt */}
                <div className="col-span-8 relative h-8 border border-gray-200 rounded">
                  <div
                    className={`absolute top-0 h-full rounded cursor-move flex items-center px-2 text-white text-xs font-medium ${statusColor} ${
                      draggedItem === item.id ? 'opacity-50' : ''
                    } group-hover:shadow-md transition-shadow`}
                    style={position}
                    draggable
                    onDragStart={(e) => handleDragStart(e, item.id)}
                    data-testid={`gantt-bar-${item.id}`}
                  >
                    <Move className="h-3 w-3 mr-1 opacity-70" />
                    <span className="truncate">{item.name}</span>
                    
                    {/* Indicateur de progression pour les projets */}
                    {item.type === 'project' && item.progress !== undefined && (
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
            <p>Aucun projet ou jalon planifié pour cette semaine</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={goToCurrentWeek}>
              Revenir à la semaine courante
            </Button>
          </div>
        )}

        {/* Légende */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Légende</h4>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded" />
                <span>Étude</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-yellow-500 rounded" />
                <span>Planification</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-orange-500 rounded" />
                <span>Approvisionnement</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded" />
                <span>Chantier</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-purple-500 rounded" />
                <span>SAV</span>
              </div>
              <div className="flex items-center space-x-2">
                <Move className="h-3 w-3 text-gray-500" />
                <span>Glissez-déposez pour modifier les dates</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}