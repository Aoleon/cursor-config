import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ChevronLeft, ChevronRight, Calendar, User as UserIcon, Clock, MapPin, Folder, Target } from "lucide-react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isWithinInterval, differenceInDays, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import GanttChart from "@/components/projects/GanttChart";
import type { ProjectTask, User } from "@shared/schema";

interface TimelineViewProps {
  selectedProjectId?: string;
}

export default function TimelineView({ selectedProjectId }: TimelineViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"list" | "gantt">("list");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: projectsData, isLoading: projectsLoading } = useQuery<any>({
    queryKey: ["/api/projects"],
  });
  const projects = projectsData?.data || [];
  
  // Mutation pour mettre à jour les dates des projets
  const updateProjectMutation = useMutation({
    mutationFn: async ({ projectId, startDate, endDate }: { projectId: string; startDate: Date; endDate: Date }) => {
      return await apiRequest('PATCH', `/api/projects/${projectId}`, {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Projet mis à jour",
        description: "Les dates du projet ont été modifiées avec succès.",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour les dates du projet.",
        variant: "destructive",
      });
    },
  });

  // Mutation pour mettre à jour les dates des tâches
  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, startDate, endDate }: { taskId: string; startDate: Date; endDate: Date }) => {
      return await apiRequest('PATCH', `/api/tasks/${taskId}`, {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/all"] });
      toast({
        title: "Tâche mise à jour",
        description: "Les dates de la tâche ont été modifiées avec succès.",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour les dates de la tâche.",
        variant: "destructive",
      });
    },
  });

  const { data: allTasksData, isLoading: tasksLoading } = useQuery<any>({
    queryKey: ["/api/tasks/all"],
    queryFn: async () => {
      const response = await fetch("/api/tasks/all");
      if (!response.ok) throw new Error("Failed to fetch tasks");
      return response.json();
    },
  });
  const allTasks = allTasksData?.data || [];

  const filteredProjects = selectedProjectId 
    ? projects.filter(p => p.id === selectedProjectId)
    : projects;

  const getTasksForProject = (projectId: string) => {
    return allTasks.filter(task => task.projectId === projectId);
  };

  const getProjectProgress = (projectId: string) => {
    const tasks = getTasksForProject(projectId);
    if (tasks.length === 0) return 0;
    
    const completedTasks = tasks.filter(task => task.status === 'termine').length;
    return Math.round((completedTasks / tasks.length) * 100);
  };

  const getProjectTimespan = (project: any) => {
    const tasks = getTasksForProject(project.id);
    if (tasks.length === 0) return null;

    const sortedTasks = tasks.sort((a, b) => {
      const aDate = a.startDate ? new Date(a.startDate).getTime() : 0;
      const bDate = b.startDate ? new Date(b.startDate).getTime() : 0;
      return aDate - bDate;
    });
    const firstTask = sortedTasks[0];
    const lastTask = sortedTasks[sortedTasks.length - 1];

    return {
      start: firstTask.startDate ? new Date(firstTask.startDate) : new Date(),
      end: lastTask.endDate ? new Date(lastTask.endDate) : new Date(),
      duration: firstTask.startDate && lastTask.endDate ? differenceInDays(new Date(lastTask.endDate), new Date(firstTask.startDate)) : 0
    };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "a_faire": return "bg-surface-muted text-on-surface-muted border-border";
      case "en_cours": return "bg-primary/10 text-primary border-primary/20";
      case "termine": return "bg-success/10 text-success border-success/20";
      case "en_retard": return "bg-error/10 text-error border-error/20";
      default: return "bg-surface-muted text-on-surface-muted border-border";
    }
  };

  const getProjectStatusColor = (status: string) => {
    switch (status) {
      case "etude": return "bg-primary/5 border-primary/20 text-primary";
      case "planification": return "bg-warning/5 border-warning/20 text-warning";
      case "approvisionnement": return "bg-accent/5 border-accent/20 text-accent";
      case "chantier": return "bg-success/5 border-success/20 text-success";
      case "sav": return "bg-secondary/5 border-secondary/20 text-secondary-foreground";
      default: return "bg-surface-muted border-border text-on-surface";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "a_faire": return "À faire";
      case "en_cours": return "En cours";
      case "termine": return "Terminé";
      case "en_retard": return "En retard";
      case "etude": return "Étude";
      case "planification": return "Planification";
      case "approvisionnement": return "Approvisionnement";
      case "chantier": return "Chantier";
      case "sav": return "SAV";
      default: return status;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "haute": return "border-l-error bg-error/5";
      case "moyenne": return "border-l-warning bg-warning/5";
      case "faible": return "border-l-success bg-success/5";
      default: return "border-l-border bg-surface-muted";
    }
  };

  if (projectsLoading || tasksLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête et contrôles */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Folder className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-2xl font-semibold text-on-surface">Timeline des Projets</h2>
            <p className="text-sm text-on-surface-muted">
              {filteredProjects.length} projet{filteredProjects.length > 1 ? 's' : ''} • {allTasks.length} tâche{allTasks.length > 1 ? 's' : ''}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("list")}
          >
            Vue Liste
          </Button>
          <Button
            variant={viewMode === "gantt" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("gantt")}
          >
            Vue Gantt
          </Button>
        </div>
      </div>

      {/* Vue Liste détaillée */}
      {viewMode === "list" && (
        <div className="space-y-6">
          {filteredProjects.map((project) => {
            const projectTasks = getTasksForProject(project.id);
            const progress = getProjectProgress(project.id);
            const timespan = getProjectTimespan(project);
            
            return (
              <Card key={project.id} className={`border-2 ${getProjectStatusColor(project.status)}`}>
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-3">
                        <CardTitle className="text-xl font-semibold">{project.name}</CardTitle>
                        <Badge variant="outline" className={getProjectStatusColor(project.status)}>
                          {getStatusLabel(project.status)}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-6 text-sm text-on-surface-muted">
                        <div className="flex items-center space-x-1">
                          <MapPin className="h-4 w-4" />
                          <span>{project.location}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <UserIcon className="h-4 w-4" />
                          <span>{project.responsibleUser?.firstName} {project.responsibleUser?.lastName}</span>
                        </div>
                        {timespan && (
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-4 w-4" />
                            <span>
                              {format(timespan.start, 'dd/MM/yyyy', { locale: fr })} - {format(timespan.end, 'dd/MM/yyyy', { locale: fr })}
                              <span className="ml-2 text-on-surface-muted">({timespan.duration} jours)</span>
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-on-surface">{progress}%</div>
                      <div className="text-sm text-on-surface-muted">Progression</div>
                    </div>
                  </div>
                  
                  {progress > 0 && (
                    <div className="mt-4">
                      <Progress value={progress} className="h-2" />
                    </div>
                  )}
                </CardHeader>
                
                <CardContent>
                  {projectTasks.length > 0 ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-on-surface">Tâches du projet</h4>
                        <span className="text-sm text-on-surface-muted">
                          {projectTasks.filter(t => t.status === 'termine').length} / {projectTasks.length} terminées
                        </span>
                      </div>
                      
                      <div className="grid gap-3">
                        {projectTasks
                          .sort((a, b) => {
                            const aDate = a.startDate ? new Date(a.startDate).getTime() : 0;
                            const bDate = b.startDate ? new Date(b.startDate).getTime() : 0;
                            return aDate - bDate;
                          })
                          .map((task) => (
                          <div key={task.id} className={`p-4 rounded-lg border-l-4 ${getPriorityColor('normale')}`}>
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-3 mb-2">
                                  <h5 className="font-medium text-on-surface">{task.name}</h5>
                                  <Badge variant="outline" className={`text-xs ${getStatusColor(task.status || 'a_faire')}`}>
                                    {getStatusLabel(task.status || 'a_faire')}
                                  </Badge>
                                </div>
                                
                                {task.description && (
                                  <p className="text-sm text-on-surface-muted mb-3">{task.description}</p>
                                )}
                                
                                <div className="flex items-center space-x-4 text-xs text-on-surface-muted">
                                  <div className="flex items-center space-x-1">
                                    <Calendar className="h-3 w-3" />
                                    <span>
                                      {task.startDate ? (typeof task.startDate === 'string' ? format(parseISO(task.startDate), 'dd/MM', { locale: fr }) : format(task.startDate, 'dd/MM', { locale: fr })) : 'N/A'} → {task.endDate ? (typeof task.endDate === 'string' ? format(parseISO(task.endDate), 'dd/MM', { locale: fr }) : format(task.endDate, 'dd/MM', { locale: fr })) : 'N/A'}
                                    </span>
                                  </div>
                                  
                                  {task.assignedUser && (
                                    <div className="flex items-center space-x-1">
                                      <UserIcon className="h-3 w-3" />
                                      <span>{task.assignedUser.firstName} {task.assignedUser.lastName}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              {task.assignedUser && (
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback className="text-xs bg-primary/10">
                                    {task.assignedUser.firstName?.[0]}{task.assignedUser.lastName?.[0]}
                                  </AvatarFallback>
                                </Avatar>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>Aucune tâche assignée à ce projet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Vue Gantt interactive complète */}
      {viewMode === "gantt" && (
        <div className="space-y-4">
          <GanttChart 
            projects={filteredProjects}
            milestones={[]} 
            onDateUpdate={(itemId, newStartDate, newEndDate, type) => {
              if (type === 'project') {
                updateProjectMutation.mutate({
                  projectId: itemId,
                  startDate: newStartDate,
                  endDate: newEndDate,
                });
              } else {
                updateTaskMutation.mutate({
                  taskId: itemId,
                  startDate: newStartDate,
                  endDate: newEndDate,
                });
              }
            }}
            enableRealtime={true}
            data-testid="timeline-gantt-chart"
          />
        </div>
      )}

      {filteredProjects.length === 0 && (
        <div className="text-center py-12">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun projet à afficher</h3>
          <p className="text-gray-500">
            {selectedProjectId 
              ? "Le projet sélectionné n'a pas été trouvé." 
              : "Créez un projet à partir d'une offre signée pour commencer."}
          </p>
        </div>
      )}
    </div>
  );
}