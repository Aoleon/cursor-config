import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PhaseNavigation } from "@/components/navigation/phase-navigation";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock, User, ArrowRight, AlertTriangle, CheckCircle, Users, Timer } from "lucide-react";
import { format, differenceInDays, addDays, startOfMonth, endOfMonth, eachWeekOfInterval, addMonths } from "date-fns";
import { fr } from "date-fns/locale";

type ViewMode = "timeline" | "gantt" | "calendar";
type TimeRange = "1month" | "3months" | "6months";

interface ProjectWithPhases {
  id: string;
  name: string;
  client: string;
  status: string;
  startDate: string;
  endDate: string;
  responsibleUser?: any;
  phases: ProjectPhase[];
  tasks: ProjectTask[];
}

interface ProjectPhase {
  id: string;
  phase: string;
  responsibleTeam: string;
  responsibleUserId: string;
  responsibleUser?: any;
  startDate: string;
  endDate: string;
  actualStartDate?: string;
  actualEndDate?: string;
  status: string;
  bufferDays: number;
  nextPhase?: string;
  handoffCompleted: boolean;
  handoffNotes?: string;
}

interface ProjectTask {
  id: string;
  name: string;
  phase: string;
  startDate: string;
  endDate: string;
  assignedUserId: string;
  assignedUser?: any;
  progress: number;
  priority: string;
  bufferDays: number;
  handoffDate?: string;
  dependencies: string[];
}

export default function Planning() {
  const [viewMode, setViewMode] = useState<ViewMode>("timeline");
  const [timeRange, setTimeRange] = useState<TimeRange>("3months");
  const [selectedProject, setSelectedProject] = useState<string | null>(null);

  // Récupération des données
  const { data: projects = [], isLoading: projectsLoading } = useQuery<any[]>({
    queryKey: ["/api/projects"],
  });

  const { data: projectPhases = [], isLoading: phasesLoading } = useQuery<any[]>({
    queryKey: ["/api/project-phases"],
  });

  const { data: tasks = [], isLoading: tasksLoading } = useQuery<any[]>({
    queryKey: ["/api/tasks/all"],
  });

  const { data: users = [], isLoading: usersLoading } = useQuery<any[]>({
    queryKey: ["/api/users"],
  });

  // Calcul de la période d'affichage
  const now = new Date();
  const startDate = startOfMonth(now);
  const endDate = (() => {
    switch (timeRange) {
      case "1month": return endOfMonth(now);
      case "3months": return endOfMonth(addMonths(now, 2));
      case "6months": return endOfMonth(addMonths(now, 5));
      default: return endOfMonth(addMonths(now, 2));
    }
  })();

  // Consolidation des données de projet avec phases et tâches
  const projectsWithPhases: ProjectWithPhases[] = projects.map(project => {
    const projectPhasesData = projectPhases
      .filter(phase => phase.projectId === project.id)
      .map(phase => ({
        ...phase,
        responsibleUser: users.find(u => u.id === phase.responsibleUserId)
      }));

    const projectTasks = tasks
      .filter(task => task.projectId === project.id)
      .map(task => ({
        ...task,
        assignedUser: users.find(u => u.id === task.assignedUserId)
      }));

    return {
      ...project,
      phases: projectPhasesData,
      tasks: projectTasks
    };
  });

  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case "etude": return "bg-blue-500";
      case "planification": return "bg-yellow-500";
      case "approvisionnement": return "bg-orange-500";
      case "chantier": return "bg-green-500";
      case "sav": return "bg-purple-500";
      default: return "bg-gray-500";
    }
  };

  const getPhaseLabel = (phase: string) => {
    switch (phase) {
      case "etude": return "Étude";
      case "planification": return "Planification";
      case "approvisionnement": return "Approvisionnement";
      case "chantier": return "Chantier";
      case "sav": return "SAV";
      default: return phase;
    }
  };

  const getTeamLabel = (team: string) => {
    switch (team) {
      case "be": return "Bureau d'Études";
      case "av": return "Avant-Vente";
      case "production": return "Production";
      default: return team;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "in_progress": return <Timer className="w-4 h-4 text-blue-600" />;
      case "delayed": return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default: return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const calculateDatePosition = (date: string, containerWidth: number) => {
    const dateObj = new Date(date);
    const totalDays = differenceInDays(endDate, startDate);
    const daysPassed = differenceInDays(dateObj, startDate);
    return Math.max(0, Math.min(100, (daysPassed / totalDays) * 100));
  };

  const calculateDuration = (startDate: string, endDate: string, containerWidth: number) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const totalDays = differenceInDays(endDate, startDate);
    const duration = differenceInDays(end, start);
    return Math.max(2, (duration / totalDays) * 100);
  };

  const renderTimelineView = () => {
    const filteredProjects = selectedProject 
      ? projectsWithPhases.filter(p => p.id === selectedProject)
      : projectsWithPhases;

    return (
      <div className="space-y-6">
        {/* Timeline Header */}
        <div className="relative">
          <div className="flex justify-between text-xs text-gray-500 mb-2">
            <span>{format(startDate, 'MMM yyyy', { locale: fr })}</span>
            <span>{format(endDate, 'MMM yyyy', { locale: fr })}</span>
          </div>
          <div className="h-8 bg-gray-100 rounded relative">
            {eachWeekOfInterval({ start: startDate, end: endDate }).map((week, index) => (
              <div
                key={index}
                className="absolute border-l border-gray-300 h-full"
                style={{ left: `${calculateDatePosition(week.toISOString(), 100)}%` }}
              >
                <div className="text-xs text-gray-400 mt-1 ml-1">
                  S{format(week, 'w')}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Projects Timeline */}
        {filteredProjects.map((project) => (
          <Card key={project.id} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{project.name}</CardTitle>
                  <p className="text-sm text-gray-600">{project.client}</p>
                </div>
                <Badge variant="outline">
                  {project.phases.length} phases
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {/* Phases Timeline */}
              <div className="space-y-3">
                {project.phases.map((phase, index) => {
                  const nextPhase = project.phases[index + 1];
                  const leftPosition = calculateDatePosition(phase.startDate, 100);
                  const width = calculateDuration(phase.startDate, phase.endDate, 100);
                  
                  return (
                    <div key={phase.id} className="relative">
                      {/* Phase Bar */}
                      <div className="flex items-center mb-2">
                        <div className="w-32 flex-shrink-0">
                          <div className="text-sm font-medium">{getPhaseLabel(phase.phase)}</div>
                          <div className="text-xs text-gray-500">
                            {phase.responsibleUser 
                              ? `${phase.responsibleUser.firstName} ${phase.responsibleUser.lastName}`
                              : getTeamLabel(phase.responsibleTeam)
                            }
                          </div>
                        </div>
                        
                        <div className="flex-1 relative h-8 bg-gray-100 rounded">
                          {/* Phase timeline bar */}
                          <div
                            className={`absolute h-6 top-1 rounded ${getPhaseColor(phase.phase)} flex items-center justify-between px-2`}
                            style={{
                              left: `${leftPosition}%`,
                              width: `${width}%`
                            }}
                          >
                            <span className="text-xs text-white font-medium">
                              {format(new Date(phase.startDate), 'dd/MM')}
                            </span>
                            {getStatusIcon(phase.status)}
                            <span className="text-xs text-white font-medium">
                              {format(new Date(phase.endDate), 'dd/MM')}
                            </span>
                          </div>

                          {/* Buffer visualization */}
                          {phase.bufferDays > 0 && (
                            <div
                              className="absolute h-3 top-0 bg-yellow-300 rounded-sm opacity-60"
                              style={{
                                left: `${leftPosition + width}%`,
                                width: `${(phase.bufferDays / differenceInDays(endDate, startDate)) * 100}%`
                              }}
                              title={`Buffer: ${phase.bufferDays} jours`}
                            >
                              <span className="text-xs text-yellow-800 ml-1">
                                +{phase.bufferDays}j
                              </span>
                            </div>
                          )}

                          {/* Handoff indicator */}
                          {nextPhase && (
                            <div
                              className="absolute top-2 w-0.5 h-4 bg-gray-800"
                              style={{
                                left: `${leftPosition + width + (phase.bufferDays / differenceInDays(endDate, startDate)) * 100}%`
                              }}
                            >
                              <div title={`Handoff vers ${getPhaseLabel(nextPhase.phase)}`}>
                                <ArrowRight className="w-3 h-3 text-gray-800 -mt-1 -ml-1" />
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="w-24 flex-shrink-0 text-right">
                          <div className="flex items-center justify-end space-x-1">
                            {getStatusIcon(phase.status)}
                            {phase.handoffCompleted && (
                              <div title="Handoff terminé">
                                <CheckCircle className="w-3 h-3 text-green-600" />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Tasks for this phase */}
                      {project.tasks
                        .filter(task => task.phase === phase.phase)
                        .map(task => {
                          const taskLeftPosition = calculateDatePosition(task.startDate, 100);
                          const taskWidth = calculateDuration(task.startDate, task.endDate, 100);
                          
                          return (
                            <div key={task.id} className="ml-32 mb-1">
                              <div className="flex items-center text-xs">
                                <div className="w-40 flex-shrink-0 text-gray-600">
                                  {task.name}
                                </div>
                                <div className="flex-1 relative h-4 bg-gray-50 rounded">
                                  <div
                                    className="absolute h-3 top-0.5 bg-blue-200 rounded border border-blue-300"
                                    style={{
                                      left: `${taskLeftPosition}%`,
                                      width: `${taskWidth}%`
                                    }}
                                  >
                                    <div 
                                      className="h-full bg-blue-400 rounded"
                                      style={{ width: `${task.progress}%` }}
                                    ></div>
                                  </div>
                                  
                                  {/* Task buffer */}
                                  {task.bufferDays > 0 && (
                                    <div
                                      className="absolute h-2 top-1 bg-yellow-200 rounded-sm"
                                      style={{
                                        left: `${taskLeftPosition + taskWidth}%`,
                                        width: `${(task.bufferDays / differenceInDays(endDate, startDate)) * 100}%`
                                      }}
                                      title={`Buffer tâche: ${task.bufferDays} jours`}
                                    ></div>
                                  )}
                                </div>
                                <div className="w-20 text-right text-gray-500">
                                  {task.assignedUser 
                                    ? `${task.assignedUser.firstName?.[0]}${task.assignedUser.lastName?.[0]}`
                                    : '-'
                                  }
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  if (projectsLoading || phasesLoading || tasksLoading || usersLoading) {
    return (
      <div className="min-h-screen flex bg-gray-50">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      <PhaseNavigation />
      <main className="flex-1 overflow-auto">
        <Header 
          title="Planning Timeline"
          breadcrumbs={[
            { label: "Accueil", href: "/" },
            { label: "Planning" }
          ]}
          actions={[
            {
              label: "Exporter Planning",
              variant: "outline",
              icon: "download"
            }
          ]}
        />
        
        <div className="px-6 py-6 space-y-6">
          {/* Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Select value={timeRange} onValueChange={(value: TimeRange) => setTimeRange(value)}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Période" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1month">1 mois</SelectItem>
                  <SelectItem value="3months">3 mois</SelectItem>
                  <SelectItem value="6months">6 mois</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedProject || "all"} onValueChange={(value) => setSelectedProject(value === "all" ? null : value)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Tous les projets" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les projets</SelectItem>
                  {projects.map(project => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Calendar className="w-4 h-4" />
              <span>
                {format(startDate, 'dd MMM yyyy', { locale: fr })} - {format(endDate, 'dd MMM yyyy', { locale: fr })}
              </span>
            </div>
          </div>

          {/* Legend */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-6 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-blue-500 rounded"></div>
                  <span>Étude</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                  <span>Planification</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-orange-500 rounded"></div>
                  <span>Approvisionnement</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-green-500 rounded"></div>
                  <span>Chantier</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-purple-500 rounded"></div>
                  <span>SAV</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-yellow-300 rounded opacity-60"></div>
                  <span>Buffer</span>
                </div>
                <div className="flex items-center space-x-2">
                  <ArrowRight className="w-4 h-4 text-gray-800" />
                  <span>Handoff</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timeline View */}
          {renderTimelineView()}
        </div>
      </main>
    </div>
  );
}