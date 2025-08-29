import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ChevronLeft, ChevronRight, Calendar, User, Clock, MapPin, Folder, Target } from "lucide-react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isWithinInterval, differenceInDays, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

interface TimelineViewProps {
  selectedProjectId?: string;
}

export default function TimelineView({ selectedProjectId }: TimelineViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"list" | "gantt">("list");

  const { data: projects = [], isLoading: projectsLoading } = useQuery<any[]>({
    queryKey: ["/api/projects"],
  });

  const { data: allTasks = [], isLoading: tasksLoading } = useQuery<any[]>({
    queryKey: ["/api/tasks/all"],
    queryFn: async () => {
      const response = await fetch("/api/tasks/all");
      if (!response.ok) throw new Error("Failed to fetch tasks");
      return response.json();
    },
  });

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

    const sortedTasks = tasks.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    const firstTask = sortedTasks[0];
    const lastTask = sortedTasks[sortedTasks.length - 1];

    return {
      start: new Date(firstTask.startDate),
      end: new Date(lastTask.endDate),
      duration: differenceInDays(new Date(lastTask.endDate), new Date(firstTask.startDate))
    };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "a_faire": return "bg-gray-100 text-gray-700 border-gray-300";
      case "en_cours": return "bg-blue-100 text-blue-700 border-blue-300";
      case "termine": return "bg-green-100 text-green-700 border-green-300";
      case "en_retard": return "bg-red-100 text-red-700 border-red-300";
      default: return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  const getProjectStatusColor = (status: string) => {
    switch (status) {
      case "etude": return "bg-blue-50 border-blue-200 text-blue-800";
      case "planification": return "bg-yellow-50 border-yellow-200 text-yellow-800";
      case "approvisionnement": return "bg-orange-50 border-orange-200 text-orange-800";
      case "chantier": return "bg-green-50 border-green-200 text-green-800";
      case "sav": return "bg-purple-50 border-purple-200 text-purple-800";
      default: return "bg-gray-50 border-gray-200 text-gray-800";
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
      case "haute": return "border-l-red-500 bg-red-50";
      case "moyenne": return "border-l-yellow-500 bg-yellow-50";
      case "faible": return "border-l-green-500 bg-green-50";
      default: return "border-l-gray-300 bg-gray-50";
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
            <h2 className="text-2xl font-semibold text-gray-900">Timeline des Projets</h2>
            <p className="text-sm text-gray-500">
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
                      <div className="flex items-center space-x-6 text-sm text-gray-600">
                        <div className="flex items-center space-x-1">
                          <MapPin className="h-4 w-4" />
                          <span>{project.location}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <User className="h-4 w-4" />
                          <span>{project.responsibleUser?.firstName} {project.responsibleUser?.lastName}</span>
                        </div>
                        {timespan && (
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-4 w-4" />
                            <span>
                              {format(timespan.start, 'dd/MM/yyyy', { locale: fr })} - {format(timespan.end, 'dd/MM/yyyy', { locale: fr })}
                              <span className="ml-2 text-gray-500">({timespan.duration} jours)</span>
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900">{progress}%</div>
                      <div className="text-sm text-gray-500">Progression</div>
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
                        <h4 className="font-medium text-gray-900">Tâches du projet</h4>
                        <span className="text-sm text-gray-500">
                          {projectTasks.filter(t => t.status === 'termine').length} / {projectTasks.length} terminées
                        </span>
                      </div>
                      
                      <div className="grid gap-3">
                        {projectTasks
                          .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
                          .map((task) => (
                          <div key={task.id} className={`p-4 rounded-lg border-l-4 ${getPriorityColor(task.priority)}`}>
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-3 mb-2">
                                  <h5 className="font-medium text-gray-900">{task.name}</h5>
                                  <Badge variant="outline" className={`text-xs ${getStatusColor(task.status)}`}>
                                    {getStatusLabel(task.status)}
                                  </Badge>
                                </div>
                                
                                {task.description && (
                                  <p className="text-sm text-gray-600 mb-3">{task.description}</p>
                                )}
                                
                                <div className="flex items-center space-x-4 text-xs text-gray-500">
                                  <div className="flex items-center space-x-1">
                                    <Calendar className="h-3 w-3" />
                                    <span>
                                      {format(parseISO(task.startDate), 'dd/MM', { locale: fr })} → {format(parseISO(task.endDate), 'dd/MM', { locale: fr })}
                                    </span>
                                  </div>
                                  
                                  {task.assignedUser && (
                                    <div className="flex items-center space-x-1">
                                      <User className="h-3 w-3" />
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

      {/* Vue Gantt simplifiée */}
      {viewMode === "gantt" && (
        <div className="space-y-4">
          <div className="text-center py-8 text-gray-500">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">Vue Gantt</h3>
            <p>Fonctionnalité en cours de développement</p>
            <p className="text-sm mt-2">Utilisez la vue liste pour visualiser les projets et leurs tâches</p>
          </div>
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