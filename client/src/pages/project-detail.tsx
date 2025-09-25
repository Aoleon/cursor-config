import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  ArrowLeft, Calendar, Clock, User, MapPin, Euro, 
  CheckCircle, AlertCircle, Play, Pause, Settings, ExternalLink
} from "lucide-react";
import { format, differenceInDays, isAfter, isBefore } from "date-fns";
import { fr } from "date-fns/locale";

interface ProjectTask {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  status: "a_faire" | "en_cours" | "termine" | "en_retard";
  priority: "faible" | "moyenne" | "haute";
  startDate: string;
  endDate: string;
  assignedUserId?: string;
  assignedUser?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  dependencies?: string[];
  progress: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface ProjectDetail {
  id: string;
  offerId?: string;
  name: string;
  client: string;
  location: string;
  status: "etude" | "planification" | "approvisionnement" | "chantier" | "sav";
  startDate?: string;
  endDate?: string;
  budget?: string;
  responsibleUserId?: string;
  chefTravaux?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  // Champs Monday.com Phase 1
  mondayProjectId?: string;
  projectSubtype?: string;
  geographicZone?: string;
  buildingCount?: number;
  responsibleUser?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  chefTravauxUser?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  offer?: {
    id: string;
    reference: string;
    montantFinal?: string;
  };
}

export default function ProjectDetail() {
  const params = useParams();
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const projectId = params.id;

  // Récupérer les détails du projet
  const { data: project, isLoading: projectLoading } = useQuery<ProjectDetail>({
    queryKey: [`/api/projects/${projectId}`],
    enabled: !!projectId,
  });

  // Récupérer les tâches du projet
  const { data: tasks = [], isLoading: tasksLoading } = useQuery<ProjectTask[]>({
    queryKey: [`/api/projects/${projectId}/tasks`],
    enabled: !!projectId,
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, data }: { taskId: string; data: any }) => {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update task');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/tasks`] });
      toast({
        title: "Succès",
        description: "Tâche mise à jour avec succès",
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "etude": return "bg-blue-100 text-blue-800";
      case "planification": return "bg-yellow-100 text-yellow-800";
      case "approvisionnement": return "bg-orange-100 text-orange-800";
      case "chantier": return "bg-green-100 text-green-800";
      case "sav": return "bg-purple-100 text-purple-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getTaskStatusColor = (status: string) => {
    switch (status) {
      case "a_faire": return "bg-gray-100 text-gray-800";
      case "en_cours": return "bg-blue-100 text-blue-800";
      case "termine": return "bg-green-100 text-green-800";
      case "en_retard": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "haute": return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "moyenne": return <Clock className="h-4 w-4 text-yellow-500" />;
      case "faible": return <CheckCircle className="h-4 w-4 text-green-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const calculateProgress = () => {
    if (tasks.length === 0) return 0;
    const completedTasks = tasks.filter(task => task.status === "termine").length;
    return Math.round((completedTasks / tasks.length) * 100);
  };

  const getDurationDisplay = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const duration = differenceInDays(end, start);
    return `${duration} jour${duration > 1 ? 's' : ''}`;
  };

  const isTaskOverdue = (task: ProjectTask) => {
    const now = new Date();
    const endDate = new Date(task.endDate);
    return isAfter(now, endDate) && task.status !== "termine";
  };

  const getTimelinePosition = (startDate: string, endDate: string) => {
    if (!project?.startDate || !project?.endDate) return { left: "0%", width: "100%" };
    
    const projectStart = new Date(project.startDate);
    const projectEnd = new Date(project.endDate);
    const taskStart = new Date(startDate);
    const taskEnd = new Date(endDate);
    
    const projectDuration = differenceInDays(projectEnd, projectStart);
    const startOffset = differenceInDays(taskStart, projectStart);
    const taskDuration = differenceInDays(taskEnd, taskStart);
    
    const left = Math.max(0, (startOffset / projectDuration) * 100);
    const width = Math.min(100 - left, (taskDuration / projectDuration) * 100);
    
    return {
      left: `${left}%`,
      width: `${width}%`
    };
  };

  if (projectLoading || tasksLoading) {
    return (
      <>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </>
    );
  }

  if (!project) {
    return (
      <>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
            <p>Projet non trouvé</p>
            <Button 
              variant="outline" 
              onClick={() => setLocation("/projects")}
              className="mt-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour aux projets
            </Button>
          </div>
        </div>
      </>
    );
  }

  const sortedTasks = [...tasks].sort((a, b) => 
    new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  );

  return (
    <>
        <Header 
          title={project.name}
          breadcrumbs={[
            { label: "Accueil", href: "/" },
            { label: "Projets", href: "/projects" },
            { label: project.name }
          ]}
          actions={[
            {
              label: "Retour",
              variant: "outline",
              icon: "arrow-left",
              onClick: () => setLocation("/projects")
            },
            {
              label: "Modifier",
              variant: "outline",
              icon: "edit"
            }
          ]}
        />
        
        <div className="px-6 py-6 space-y-6">
          {/* Vue d'ensemble du projet */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card data-testid="project-overview">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="w-5 h-5" />
                      Vue d'ensemble
                    </CardTitle>
                    <Badge className={getStatusColor(project.status)}>
                      {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-600">Client:</span>
                      <span className="font-medium">{project.client}</span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-600">Lieu:</span>
                      <span className="font-medium">{project.location}</span>
                    </div>
                    
                    {project.budget && (
                      <div className="flex items-center space-x-2">
                        <Euro className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-600">Budget:</span>
                        <span className="font-medium">{parseFloat(project.budget).toLocaleString('fr-FR')} €</span>
                      </div>
                    )}
                    
                    {project.startDate && (
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-600">Début:</span>
                        <span className="font-medium">
                          {format(new Date(project.startDate), 'dd/MM/yyyy', { locale: fr })}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {project.description && (
                    <div className="mt-4">
                      <p className="text-sm text-gray-600">{project.description}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            
            {/* Indicateurs */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Progression</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Avancement global</span>
                      <span>{calculateProgress()}%</span>
                    </div>
                    <Progress value={calculateProgress()} className="h-2" />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{tasks.filter(t => t.status === "termine").length} terminées</span>
                      <span>{tasks.length} tâches total</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Équipe</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {project.responsibleUser && (
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {project.responsibleUser.firstName[0]}{project.responsibleUser.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{project.responsibleUser.firstName} {project.responsibleUser.lastName}</p>
                        <p className="text-xs text-gray-500">Responsable projet</p>
                      </div>
                    </div>
                  )}
                  
                  {project.chefTravauxUser && (
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {project.chefTravauxUser.firstName[0]}{project.chefTravauxUser.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{project.chefTravauxUser.firstName} {project.chefTravauxUser.lastName}</p>
                        <p className="text-xs text-gray-500">Chef de travaux</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Section Informations Monday.com */}
              <Card data-testid="monday-info-section">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ExternalLink className="h-5 w-5" />
                    Informations Monday.com
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div data-testid="monday-project-id-detail">
                      <Label className="text-sm font-medium text-muted-foreground">ID Monday.com</Label>
                      <p className="text-sm">{project.mondayProjectId || "Non défini"}</p>
                    </div>
                    <div data-testid="project-subtype-detail">
                      <Label className="text-sm font-medium text-muted-foreground">Type de projet</Label>
                      <p className="text-sm">{project.projectSubtype || "Non défini"}</p>
                    </div>
                    <div data-testid="geographic-zone-detail">
                      <Label className="text-sm font-medium text-muted-foreground">Zone géographique</Label>
                      <p className="text-sm">{project.geographicZone || "Non définie"}</p>
                    </div>
                    <div data-testid="building-count-detail">
                      <Label className="text-sm font-medium text-muted-foreground">Nombre de bâtiments</Label>
                      <p className="text-sm">{project.buildingCount ?? "Non défini"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
          
          {/* Timeline des tâches */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Timeline du Projet
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sortedTasks.map((task, index) => {
                  const position = getTimelinePosition(task.startDate, task.endDate);
                  const isOverdue = isTaskOverdue(task);
                  
                  return (
                    <div key={task.id} className="relative">
                      {/* Ligne de timeline */}
                      <div className="absolute left-0 top-6 w-full h-1 bg-gray-200 rounded"></div>
                      
                      {/* Barre de tâche */}
                      <div
                        className={`absolute top-5 h-3 rounded cursor-pointer transition-all hover:opacity-80 ${
                          task.status === "termine" ? "bg-green-500" :
                          task.status === "en_cours" ? "bg-blue-500" :
                          isOverdue ? "bg-red-500" : "bg-gray-400"
                        }`}
                        style={position}
                        onClick={() => setSelectedTaskId(selectedTaskId === task.id ? null : task.id)}
                      />
                      
                      {/* Informations de la tâche */}
                      <div className="flex items-center justify-between pt-8">
                        <div className="flex items-center space-x-3">
                          {getPriorityIcon(task.priority)}
                          <div>
                            <h4 className="font-medium">{task.name}</h4>
                            <p className="text-sm text-gray-500">
                              {format(new Date(task.startDate), 'dd/MM', { locale: fr })} - {format(new Date(task.endDate), 'dd/MM', { locale: fr })}
                              <span className="ml-2">({getDurationDisplay(task.startDate, task.endDate)})</span>
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {task.assignedUser && (
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs">
                                {task.assignedUser.firstName[0]}{task.assignedUser.lastName[0]}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <Badge className={getTaskStatusColor(task.status)}>
                            {task.status.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>
                      
                      {/* Détails expanded */}
                      {selectedTaskId === task.id && (
                        <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <h5 className="font-medium mb-2">Description</h5>
                              <p className="text-sm text-gray-600">{task.description || "Aucune description"}</p>
                            </div>
                            <div>
                              <h5 className="font-medium mb-2">Progression</h5>
                              <div className="space-y-2">
                                <Progress value={task.progress || 0} className="h-2" />
                                <p className="text-sm text-gray-600">{task.progress || 0}% terminé</p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex justify-end space-x-2 mt-4">
                            {task.status === "a_faire" && (
                              <Button 
                                size="sm"
                                onClick={() => updateTaskMutation.mutate({ 
                                  taskId: task.id, 
                                  data: { status: "en_cours" } 
                                })}
                              >
                                <Play className="w-4 h-4 mr-1" />
                                Démarrer
                              </Button>
                            )}
                            {task.status === "en_cours" && (
                              <Button 
                                size="sm"
                                variant="outline"
                                onClick={() => updateTaskMutation.mutate({ 
                                  taskId: task.id, 
                                  data: { status: "termine" } 
                                })}
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Terminer
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
    </>
  );
}