import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
// import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronLeft, ChevronRight, Calendar, User, Clock, MapPin } from "lucide-react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isWithinInterval } from "date-fns";
import { fr } from "date-fns/locale";

interface TimelineViewProps {
  selectedProjectId?: string;
}

export default function TimelineView({ selectedProjectId }: TimelineViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"month" | "quarter">("month");

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

  const getMonthDays = () => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    return eachDayOfInterval({ start, end });
  };

  const getTasksForProject = (projectId: string) => {
    return allTasks.filter(task => task.projectId === projectId);
  };

  const getTaskPosition = (task: any, monthDays: Date[]) => {
    if (!task.startDate || !task.endDate) return null;

    const taskStart = new Date(task.startDate);
    const taskEnd = new Date(task.endDate);
    const monthStart = monthDays[0];
    const monthEnd = monthDays[monthDays.length - 1];

    if (taskEnd < monthStart || taskStart > monthEnd) {
      return null; // Task not in current month
    }

    const visibleStart = taskStart < monthStart ? monthStart : taskStart;
    const visibleEnd = taskEnd > monthEnd ? monthEnd : taskEnd;

    const startIndex = monthDays.findIndex(day => isSameDay(day, visibleStart));
    const endIndex = monthDays.findIndex(day => isSameDay(day, visibleEnd));

    return {
      left: `${(startIndex / monthDays.length) * 100}%`,
      width: `${((endIndex - startIndex + 1) / monthDays.length) * 100}%`,
      startIndex,
      endIndex,
    };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "a_faire": return "bg-gray-200 text-gray-800";
      case "en_cours": return "bg-blue-200 text-blue-800";
      case "termine": return "bg-green-200 text-green-800";
      case "en_retard": return "bg-red-200 text-red-800";
      default: return "bg-gray-200 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "haute": return "border-l-red-500";
      case "moyenne": return "border-l-yellow-500";
      case "faible": return "border-l-green-500";
      default: return "border-l-gray-300";
    }
  };

  const monthDays = getMonthDays();

  if (projectsLoading || tasksLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
      <div className="space-y-6">
        {/* Navigation et contrôles */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-xl font-semibold">
              {format(currentDate, "MMMM yyyy", { locale: fr })}
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant={viewMode === "month" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("month")}
            >
              Mois
            </Button>
            <Button
              variant={viewMode === "quarter" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("quarter")}
            >
              Trimestre
            </Button>
          </div>
        </div>

        {/* En-tête calendrier */}
        <div className="grid grid-cols-7 gap-1 text-sm font-medium text-gray-500 mb-4">
          {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(day => (
            <div key={day} className="p-2 text-center">
              {day}
            </div>
          ))}
        </div>

        {/* Grille des jours */}
        <div className="grid grid-cols-7 gap-1 mb-6">
          {monthDays.map((day, index) => (
            <div 
              key={day.toISOString()} 
              className={`p-2 h-8 text-sm text-center border ${
                isSameMonth(day, currentDate) 
                  ? 'text-gray-900 bg-white' 
                  : 'text-gray-400 bg-gray-50'
              }`}
            >
              {format(day, 'd')}
            </div>
          ))}
        </div>

        {/* Timeline des projets */}
        <div className="space-y-4">
          {filteredProjects.map((project) => {
            const projectTasks = getTasksForProject(project.id);
            
            return (
              <Card key={project.id} className="relative">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <CardTitle className="text-lg font-medium">{project.name}</CardTitle>
                      <Badge variant="outline" className={getStatusColor(project.status)}>
                        {project.status}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <MapPin className="h-4 w-4" />
                      <span>{project.location}</span>
                      <User className="h-4 w-4 ml-4" />
                      <span>{project.responsibleUser?.firstName} {project.responsibleUser?.lastName}</span>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  {/* Timeline relative pour les tâches */}
                  <div className="relative" style={{ minHeight: `${Math.max(projectTasks.length * 40, 60)}px` }}>
                    {/* Grille des jours en arrière-plan */}
                    <div className="absolute inset-0 grid grid-cols-7 gap-1 opacity-20">
                      {monthDays.map((day, index) => (
                        <div key={index} className="border-l border-gray-300 h-full" />
                      ))}
                    </div>

                    {/* Tâches du projet */}
                    {projectTasks.map((task, taskIndex) => {
                      const position = getTaskPosition(task, monthDays);
                      if (!position) return null;

                      return (
                        <div key={task.id}>
                          {/* <TooltipTrigger asChild> */}
                            <div
                              className={`absolute h-8 rounded px-2 py-1 text-xs font-medium border-l-4 ${getPriorityColor(task.priority)} ${getStatusColor(task.status)} cursor-pointer hover:shadow-md transition-shadow`}
                              style={{
                                top: `${taskIndex * 40 + 10}px`,
                                left: position.left,
                                width: position.width,
                                minWidth: '60px',
                              }}
                            >
                              <div className="flex items-center justify-between h-full">
                                <span className="truncate flex-1">{task.name}</span>
                                {task.assignedUser && (
                                  <Avatar className="h-4 w-4 ml-1">
                                    <AvatarFallback className="text-xs">
                                      {task.assignedUser.firstName?.[0]}{task.assignedUser.lastName?.[0]}
                                    </AvatarFallback>
                                  </Avatar>
                                )}
                              </div>
                            </div>
                          {/* </TooltipTrigger> */}
                          {/* <TooltipContent side="bottom" className="max-w-sm">
                            <div className="space-y-2">
                              <h4 className="font-medium">{task.name}</h4>
                              <p className="text-sm text-gray-600">{task.description}</p>
                              <div className="flex items-center space-x-4 text-xs">
                                <div className="flex items-center">
                                  <Calendar className="h-3 w-3 mr-1" />
                                  {format(new Date(task.startDate), 'dd/MM', { locale: fr })} - {format(new Date(task.endDate), 'dd/MM', { locale: fr })}
                                </div>
                                {task.assignedUser && (
                                  <div className="flex items-center">
                                    <User className="h-3 w-3 mr-1" />
                                    {task.assignedUser.firstName} {task.assignedUser.lastName}
                                  </div>
                                )}
                              </div>
                              <Badge className={getStatusColor(task.status)}>
                                {task.status} - {task.priority}
                              </Badge>
                            </div>
                          </TooltipContent> */}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

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