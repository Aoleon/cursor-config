import { useState, useMemo } from 'react';
import { useProjectTimelines, type TimeframeOption, type GanttFilters } from '@/hooks/use-project-timelines';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Calendar, 
  Filter, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Info,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Calendar as CalendarIcon
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable, type DragResult } from 'react-beautiful-dnd';
import type { ProjectTimeline } from '@shared/schema';

// Composant pour les contrôles du Gantt
interface GanttControlsProps {
  timeframe: TimeframeOption;
  onTimeframeChange: (timeframe: TimeframeOption) => void;
  filters: GanttFilters;
  onFiltersChange: (filters: GanttFilters) => void;
  onResetFilters: () => void;
}

function GanttControls({ 
  timeframe, 
  onTimeframeChange, 
  filters, 
  onFiltersChange, 
  onResetFilters 
}: GanttControlsProps) {
  const availablePhases = ['passation', 'etude', 'visa_architecte', 'planification', 'approvisionnement', 'chantier', 'sav'];
  const availableStatuses = ['etude', 'planification', 'approvisionnement', 'chantier', 'sav'];

  const hasActiveFilters = filters.phases.length > 0 || filters.statuses.length > 0;

  return (
    <div className="flex flex-wrap items-center gap-4 p-4 bg-muted/50 rounded-lg">
      {/* Sélection de timeframe */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium">Période:</label>
        <Select value={timeframe} onValueChange={onTimeframeChange}>
          <SelectTrigger className="w-36" data-testid="select-timeframe">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1_month">1 Mois</SelectItem>
            <SelectItem value="3_months">3 Mois</SelectItem>
            <SelectItem value="6_months">6 Mois</SelectItem>
            <SelectItem value="1_year">1 Année</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Filtres par phases */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium">Phases:</label>
        <div className="flex items-center gap-2 max-w-xs overflow-x-auto">
          {availablePhases.map((phase) => (
            <div key={phase} className="flex items-center space-x-2">
              <Checkbox
                id={`phase-${phase}`}
                checked={filters.phases.includes(phase)}
                onCheckedChange={(checked) => {
                  const newPhases = checked
                    ? [...filters.phases, phase]
                    : filters.phases.filter(p => p !== phase);
                  onFiltersChange({ ...filters, phases: newPhases });
                }}
                data-testid={`filter-phase-${phase}`}
              />
              <label 
                htmlFor={`phase-${phase}`} 
                className="text-xs font-medium capitalize whitespace-nowrap"
              >
                {phase.replace('_', ' ')}
              </label>
            </div>
          ))}
        </div>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Filtres par statuts */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium">Statuts:</label>
        <div className="flex items-center gap-2 max-w-xs overflow-x-auto">
          {availableStatuses.map((status) => (
            <div key={status} className="flex items-center space-x-2">
              <Checkbox
                id={`status-${status}`}
                checked={filters.statuses.includes(status)}
                onCheckedChange={(checked) => {
                  const newStatuses = checked
                    ? [...filters.statuses, status]
                    : filters.statuses.filter(s => s !== status);
                  onFiltersChange({ ...filters, statuses: newStatuses });
                }}
                data-testid={`filter-status-${status}`}
              />
              <label 
                htmlFor={`status-${status}`} 
                className="text-xs font-medium capitalize whitespace-nowrap"
              >
                {status.replace('_', ' ')}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 ml-auto">
        {hasActiveFilters && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onResetFilters}
            data-testid="button-reset-filters"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Réinitialiser
          </Button>
        )}
        
        <Badge variant="secondary" className="text-xs">
          {filters.phases.length + filters.statuses.length} filtres actifs
        </Badge>
      </div>
    </div>
  );
}

// Composant pour la visualisation Gantt
interface GanttVisualizationProps {
  timelines: ProjectTimeline[];
  timeframe: TimeframeOption;
  filters: GanttFilters;
  onTimelineUpdate: (timelineId: string, updates: any) => void;
  onPhaseClick: (timeline: ProjectTimeline) => void;
}

function GanttVisualization({ 
  timelines, 
  timeframe, 
  filters,
  onTimelineUpdate,
  onPhaseClick 
}: GanttVisualizationProps) {
  // Calcul de la période d'affichage
  const { startDate, endDate, dayWidth } = useMemo(() => {
    const now = new Date();
    const monthsMap = { '1_month': 1, '3_months': 3, '6_months': 6, '1_year': 12 };
    const months = monthsMap[timeframe];
    
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1); // Démarrer un mois avant
    const end = new Date(now.getFullYear(), now.getMonth() + months, 0);
    
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const containerWidth = 800; // Largeur fixe du container
    const width = Math.max(2, containerWidth / totalDays); // Minimum 2px par jour
    
    return { startDate: start, endDate: end, dayWidth: width };
  }, [timeframe]);

  // Génération des barres de timeline
  const getTimelineBar = (timeline: ProjectTimeline) => {
    if (!timeline.startDate || !timeline.endDate) return null;

    const start = new Date(timeline.startDate);
    const end = new Date(timeline.endDate);
    const today = new Date();

    // Calculer la position et la largeur
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const startOffset = Math.max(0, Math.ceil((start.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
    const duration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    
    const leftPercent = (startOffset / totalDays) * 100;
    const widthPercent = (duration / totalDays) * 100;

    // Déterminer la couleur selon l'état
    const isOverdue = end < today;
    const isAtRisk = end < new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000); // Dans les 7 jours
    
    let barColor = 'bg-green-500'; // Par défaut, vert (en cours)
    if (isOverdue) {
      barColor = 'bg-red-500'; // Rouge = en retard
    } else if (isAtRisk) {
      barColor = 'bg-orange-500'; // Orange = à risque
    }

    // Pourcentage de progression (simulé)
    const progressPercent = Math.min(100, Math.max(0, 
      ((today.getTime() - start.getTime()) / (end.getTime() - start.getTime())) * 100
    ));

    return {
      leftPercent,
      widthPercent: Math.max(0.5, widthPercent), // Minimum visible
      barColor,
      progressPercent,
      isOverdue,
      isAtRisk,
      duration,
    };
  };

  if (timelines.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <CalendarIcon className="h-12 w-12 mx-auto mb-4" />
        <p className="text-lg font-medium">Aucune timeline à afficher</p>
        <p className="text-sm">Ajustez les filtres ou vérifiez les données</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* En-tête avec échelle temporelle */}
      <div className="relative overflow-x-auto">
        <div className="min-w-full">
          {/* Échelle des mois */}
          <div className="flex border-b border-muted mb-2 pb-2">
            {Array.from({ length: 12 }, (_, i) => {
              const monthDate = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
              if (monthDate > endDate) return null;
              
              return (
                <div key={i} className="flex-1 text-center text-sm font-medium text-muted-foreground">
                  {monthDate.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
                </div>
              );
            })}
          </div>

          {/* Lignes de timeline avec Drag & Drop */}
          <ScrollArea className="h-96">
            <Droppable droppableId="gantt-timeline">
              {(provided) => (
                <div 
                  className="space-y-3"
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                >
                  {timelines.map((timeline, index) => {
                    const barData = getTimelineBar(timeline);
                    if (!barData) return null;

                    return (
                      <Draggable 
                        key={timeline.id} 
                        draggableId={`${timeline.id}-timeline`} 
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <TooltipProvider>
                            <div 
                              className={`flex items-center group hover:bg-accent/50 p-2 rounded transition-colors ${
                                snapshot.isDragging ? 'bg-accent shadow-lg' : ''
                              }`}
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                            >
                      {/* Label projet/phase */}
                      <div className="w-64 flex-shrink-0 pr-4">
                        <div className="flex items-center gap-2">
                          {barData.isOverdue ? (
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                          ) : barData.isAtRisk ? (
                            <Clock className="h-4 w-4 text-orange-500" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          )}
                          <div>
                            <p className="font-medium text-sm truncate">
                              {timeline.project?.name || 'Projet sans nom'}
                            </p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {timeline.phase?.replace('_', ' ')}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Barre de timeline */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div 
                            className="flex-1 relative h-8 bg-muted rounded cursor-pointer hover:bg-muted-foreground/10"
                            onClick={() => onPhaseClick(timeline)}
                          >
                            {/* Barre principale */}
                            <div
                              className={`absolute top-1 h-6 ${barData.barColor} rounded shadow-sm transition-all group-hover:shadow-md`}
                              style={{
                                left: `${barData.leftPercent}%`,
                                width: `${barData.widthPercent}%`,
                              }}
                            >
                              {/* Barre de progression */}
                              <div
                                className="h-full bg-white/30 rounded"
                                style={{ width: `${barData.progressPercent}%` }}
                              />
                            </div>
                            
                            {/* Ligne "aujourd'hui" */}
                            <div 
                              className="absolute top-0 h-8 w-0.5 bg-red-600 z-10"
                              style={{ left: `${((new Date().getTime() - startDate.getTime()) / (endDate.getTime() - startDate.getTime())) * 100}%` }}
                            />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="text-sm">
                            <p className="font-medium">{timeline.project?.name}</p>
                            <p className="capitalize">{timeline.phase?.replace('_', ' ')}</p>
                            <p>Durée: {barData.duration} jours</p>
                            <p>Début: {timeline.startDate ? new Date(timeline.startDate).toLocaleDateString('fr-FR') : 'N/A'}</p>
                            <p>Fin: {timeline.endDate ? new Date(timeline.endDate).toLocaleDateString('fr-FR') : 'N/A'}</p>
                            {barData.isOverdue && <p className="text-red-500 font-medium">⚠️ En retard</p>}
                            {barData.isAtRisk && !barData.isOverdue && <p className="text-orange-500 font-medium">⏰ À risque</p>}
                          </div>
                        </TooltipContent>
                      </Tooltip>

                      {/* Statut visuel */}
                      <div className="w-16 flex-shrink-0 text-right">
                        <Badge 
                          variant={barData.isOverdue ? "destructive" : barData.isAtRisk ? "secondary" : "default"}
                          className="text-xs"
                        >
                          {barData.isOverdue ? "Retard" : barData.isAtRisk ? "Risque" : "OK"}
                        </Badge>
                      </div>
                            </div>
                          </TooltipProvider>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </ScrollArea>
        </div>
      </div>

      {/* Légende */}
      <div className="flex items-center justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500 rounded"></div>
          <span>En cours</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-orange-500 rounded"></div>
          <span>À risque (7j)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-500 rounded"></div>
          <span>En retard</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-0.5 h-4 bg-red-600"></div>
          <span>Aujourd'hui</span>
        </div>
      </div>
    </div>
  );
}

// Composant principal InteractiveGanttChart
interface InteractiveGanttChartProps {
  className?: string;
}

export default function InteractiveGanttChart({ className }: InteractiveGanttChartProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState<TimeframeOption>('3_months');
  const [filters, setFilters] = useState<GanttFilters>({
    phases: [],
    priorities: [],
    teams: [],
    statuses: [],
  });

  const { timelines, isLoading, updateTimeline, recalculateFromPhase, stats } = useProjectTimelines(filters);

  const handleTimelineUpdate = (timelineId: string, updates: any) => {
    updateTimeline({ timelineId, updates });
  };

  // Fonction pour calculer nouvelle date basée sur position drag & drop
  const calculateDateFromPosition = (positionIndex: number, timeframe: TimeframeOption, startDate: Date, endDate: Date): Date => {
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const dayWidth = positionIndex; // Simplification : 1 position = 1 jour
    const newDate = new Date(startDate.getTime() + (dayWidth * 24 * 60 * 60 * 1000));
    return newDate;
  };

  // Handler pour drag & drop - FONCTIONNALITÉ CRITIQUE
  const handleDragEnd = async (result: DragResult) => {
    if (!result.destination) return;
    
    const { draggableId, destination } = result;
    const [timelineId, phaseType] = draggableId.split('-');
    
    // Calculer nouvelle date basée sur position
    const timelineToUpdate = timelines.find(t => t.id === timelineId);
    if (!timelineToUpdate) return;

    const { startDate: displayStart, endDate: displayEnd } = useMemo(() => {
      const now = new Date();
      const monthsMap = { '1_month': 1, '3_months': 3, '6_months': 6, '1_year': 12 };
      const months = monthsMap[selectedTimeframe];
      
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth() + months, 0);
      
      return { startDate: start, endDate: end };
    }, [selectedTimeframe]);

    const newDate = calculateDateFromPosition(destination.index, selectedTimeframe, displayStart, displayEnd);
    
    try {
      // Mutation optimiste avec mise à jour de la date
      await updateTimeline({
        timelineId,
        updates: { [phaseType]: newDate }
      });
      
      // Recalcul cascade si nécessaire
      if (timelineToUpdate.project?.id) {
        await recalculateFromPhase({ 
          projectId: timelineToUpdate.project.id, 
          fromPhase: phaseType,
          newDate 
        });
      }
    } catch (error) {
      console.error('Erreur lors du drag & drop:', error);
    }
  };

  const handlePhaseClick = (timeline: ProjectTimeline) => {
    console.log('Phase clicked:', timeline);
    // TODO: Ouvrir modal détails ou naviguer vers détail projet
  };

  const handleResetFilters = () => {
    setFilters({
      phases: [],
      priorities: [],
      teams: [],
      statuses: [],
    });
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Planning Interactif
            {stats && (
              <Badge variant="outline" className="ml-2">
                {stats.active} projets actifs
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Info className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-sm max-w-xs">
                    <p className="font-medium mb-2">Aide Planning Gantt</p>
                    <ul className="space-y-1 text-xs">
                      <li>• Cliquez sur une barre pour voir les détails</li>
                      <li>• Utilisez les filtres pour organiser l'affichage</li>
                      <li>• Les couleurs indiquent l'état d'avancement</li>
                      <li>• La ligne rouge marque aujourd'hui</li>
                    </ul>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Contrôles */}
        <GanttControls
          timeframe={selectedTimeframe}
          onTimeframeChange={setSelectedTimeframe}
          filters={filters}
          onFiltersChange={setFilters}
          onResetFilters={handleResetFilters}
        />

        {/* Visualisation avec Drag & Drop */}
        <DragDropContext onDragEnd={handleDragEnd}>
          <GanttVisualization
            timelines={timelines}
            timeframe={selectedTimeframe}
            filters={filters}
            onTimelineUpdate={handleTimelineUpdate}
            onPhaseClick={handlePhaseClick}
          />
        </DragDropContext>
        
        {/* Statistiques rapides */}
        {stats && (
          <div className="flex justify-between items-center pt-4 border-t border-muted text-sm text-muted-foreground">
            <div>Total: {stats.total} timelines</div>
            <div>Actif: {stats.active}</div>
            <div>À temps: {stats.onTime}</div>
            <div>En retard: {stats.delayed}</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}