import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar, Clock, AlertTriangle, CheckCircle, Loader2, Target, Zap, BarChart3, Eye, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/layout/header";
import GanttChart from "@/components/projects/GanttChart";
import SmartPrioritization from "@/components/projects/SmartPrioritization";
import WorkloadPlanner from "@/components/projects/workload-planner";
import type { Project, ProjectTask, PriorityItem, CriticalAlert } from "@shared/schema";

export default function ProjectPlanningPage() {
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'planning' | 'priorities' | 'workload'>('planning');
  const { toast } = useToast();
  const queryClient = useQueryClient(); // OPTIMISÉ: Hook au lieu du module-level queryClient

  // Récupérer les projets
  const { data: projects = [], isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ['/api', 'projects'],
  });

  // Récupérer toutes les tâches pour les jalons
  const { data: allTasks = [], isLoading: tasksLoading } = useQuery<ProjectTask[]>({
    queryKey: ['/api', 'tasks', 'all'],
  });

  // Récupérer les priorités pour les alertes
  const { data: priorities = [] } = useQuery<PriorityItem[]>({
    queryKey: ['/api', 'priorities'],
  });

  // Récupérer les alertes critiques
  const { data: criticalAlerts = [] } = useQuery<CriticalAlert[]>({
    queryKey: ['/api', 'priorities', 'alerts'],
  });

  // Mutation pour mettre à jour les dates des projets
  const updateProjectMutation = useMutation({
    mutationFn: async ({ projectId, startDate, endDate }: { projectId: string; startDate: Date; endDate: Date }) => {
      return await apiRequest(`/api/projects/${projectId}`, 'PATCH', {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api', 'projects'] });
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

  // Mutation pour mettre à jour les dates des tâches (jalons)
  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, startDate, endDate }: { taskId: string; startDate: Date; endDate: Date }) => {
      return await apiRequest(`/api/tasks/${taskId}`, 'PATCH', {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api', 'tasks', 'all'] });
      toast({
        title: "Jalon mis à jour",
        description: "Les dates du jalon ont été modifiées avec succès.",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour les dates du jalon.",
        variant: "destructive",
      });
    },
  });

  // Mutation pour créer une nouvelle tâche
  const createTaskMutation = useMutation({
    mutationFn: async (newTask: Partial<ProjectTask>) => {
      if (!newTask.projectId) {
        throw new Error('Project ID is required to create a task');
      }
      return await apiRequest(`/api/projects/${newTask.projectId}/tasks`, 'POST', newTask);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api', 'tasks', 'all'] });
      queryClient.invalidateQueries({ queryKey: ['/api', 'projects'] });
      toast({
        title: "Tâche créée",
        description: "La nouvelle tâche a été ajoutée au planning avec succès.",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de créer la tâche. Veuillez réessayer.",
        variant: "destructive",
      });
    },
  });

  // Gestionnaire de création de tâche depuis le Gantt - OPTIMISÉ avec useCallback
  const handleTaskCreate = useCallback((newTask: Partial<ProjectTask>) => {
    createTaskMutation.mutate(newTask);
  }, [createTaskMutation]);

  // Gestionnaire de mise à jour des dates depuis le Gantt - OPTIMISÉ avec useCallback
  const handleDateUpdate = useCallback((itemId: string, newStartDate: Date, newEndDate: Date, type: 'project' | 'milestone' | 'task') => {
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
  }, [updateProjectMutation, updateTaskMutation]);

  // Fonction de mapping des statuts vers GanttMilestone valides
  const mapStatusToGantt = useCallback((status: string): 'completed' | 'in-progress' | 'pending' | 'overdue' => {
    switch (status) {
      case 'termine':
        return 'completed';
      case 'en_cours':
        return 'in-progress';
      case 'en_retard':
        return 'overdue';
      default:
        return 'pending';
    }
  }, []);

  // Préparer les jalons depuis les tâches - OPTIMISÉ avec useMemo
  const milestones = useMemo(() => allTasks
    .filter(task => task.isJalon || task.status === 'termine')
    .map(task => ({
      id: task.id,
      name: task.name || `Tâche ${task.id?.slice(0,8)}`,
      date: task.startDate || new Date(),
      status: mapStatusToGantt(task.status || 'a_faire'),
      project: projects.find(p => p.id === task.projectId)?.name || 'Projet inconnu',
      projectId: task.projectId,
    })), [allTasks, projects, mapStatusToGantt]);

  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "in-progress":
        return "bg-blue-100 text-blue-800";
      case "pending":
        return "bg-gray-100 text-gray-800";
      case "overdue":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  }, []);

  return (
    <>
        <Header
          title="Planification - Projets"
          breadcrumbs={[
            { label: "Accueil", href: "/" },
            { label: "Projets", href: "/projects" },
            { label: "Planification" },
          ]}
        />

        <div className="p-6">
          {/* Alertes de priorité critique en haut */}
          {criticalAlerts.length > 0 && (
            <div className="mb-6">
              <Card className="border-red-200 bg-red-50">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center space-x-2 text-red-800">
                    <AlertTriangle className="h-5 w-5" />
                    <span>Alertes Priorité Critique</span>
                    <Badge variant="destructive">{criticalAlerts.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {criticalAlerts.slice(0, 3).map((alert: CriticalAlert) => (
                      <div key={alert.id} className="flex items-center justify-between p-2 bg-white rounded border border-red-200">
                        <div>
                          <p className="font-medium text-red-900">{alert.itemName}</p>
                          <p className="text-sm text-red-700">{alert.message}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-red-800">{alert.priorityScore}</div>
                          <div className="text-xs text-red-600">Score</div>
                        </div>
                      </div>
                    ))}
                    {criticalAlerts.length > 3 && (
                      <Button 
                        variant="outline" 
                        className="w-full mt-2"
                        onClick={() => setActiveTab('priorities')}
                        data-testid="view-all-alerts"
                      >
                        Voir toutes les alertes ({criticalAlerts.length})
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Navigation par onglets */}
          <Card className="mb-6">
            <CardContent className="p-0">
              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
                <TabsList className="grid w-full grid-cols-3 rounded-none border-b">
                  <TabsTrigger value="planning" className="flex items-center space-x-2" data-testid="tab-planning">
                    <Calendar className="h-4 w-4" />
                    <span>Planning Gantt</span>
                  </TabsTrigger>
                  <TabsTrigger value="priorities" className="flex items-center space-x-2" data-testid="tab-priorities">
                    <Target className="h-4 w-4" />
                    <span>Priorisation</span>
                    {priorities.filter((p: PriorityItem) => p.priorityLevel === 'critique').length > 0 && (
                      <Badge variant="destructive" className="ml-1">
                        {priorities.filter((p: PriorityItem) => p.priorityLevel === 'critique').length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="workload" className="flex items-center space-x-2" data-testid="tab-workload">
                    <BarChart3 className="h-4 w-4" />
                    <span>Charge BE</span>
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="planning" className="p-6">
                  {projectsLoading || tasksLoading ? (
                    <Card>
                      <CardContent className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin" />
                        <span className="ml-2">Chargement du planning...</span>
                      </CardContent>
                    </Card>
                  ) : (
                    <GanttChart 
                      projects={projects}
                      milestones={milestones}
                      onDateUpdate={handleDateUpdate}
                      onTaskCreate={handleTaskCreate}
                      enableRealtime={true}
                      data-testid="gantt-chart"
                    />
                  )}
                </TabsContent>
                
                <TabsContent value="priorities" className="p-6">
                  <SmartPrioritization 
                    enableNotifications={true}
                    onPriorityUpdate={(itemId, newPriority) => {
                      // Invalider les caches pour mettre à jour les vues
                      queryClient.invalidateQueries({ queryKey: ['/api', 'priorities'] });
                      queryClient.invalidateQueries({ queryKey: ['/api', 'priorities', 'alerts'] });
                      toast({
                        title: "Priorité mise à jour",
                        description: `La priorité de l'élément a été modifiée`,
                      });
                    }}
                    data-testid="smart-prioritization"
                  />
                </TabsContent>
                
                <TabsContent value="workload" className="p-6">
                  <WorkloadPlanner />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Vue d'ensemble et statistiques */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Jalons Récents</span>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setActiveTab('planning')}
                      data-testid="view-gantt"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Voir Gantt
                    </Button>
                  </CardTitle>
                  <CardDescription>
                    Liste des jalons importants des projets en cours
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {milestones.length > 0 ? (
                    <div className="space-y-4">
                      {milestones.slice(0, 5).map((milestone) => {
                        // Trouver la priorité correspondante
                        const priority = priorities.find((p: any) => 
                          p.projectId === milestone.projectId
                        );
                        
                        return (
                          <div
                            key={milestone.id}
                            className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                            data-testid={`milestone-${milestone.id}`}
                          >
                            <div className="flex items-center space-x-3">
                              {milestone.status === "completed" ? (
                                <CheckCircle className="h-5 w-5 text-green-600" />
                              ) : milestone.status === "in-progress" ? (
                                <Clock className="h-5 w-5 text-blue-600" />
                              ) : (
                                <Calendar className="h-5 w-5 text-gray-400" />
                              )}
                              <div>
                                <div className="flex items-center space-x-2">
                                  <p className="font-medium">{milestone.name}</p>
                                  {priority && (
                                    <Badge 
                                      variant={priority.priorityLevel === 'critique' ? 'destructive' : 'outline'}
                                      className="text-xs"
                                    >
                                      {priority.priorityLevel === 'critique' ? 'CRITIQUE' : 
                                       priority.priorityLevel === 'elevee' ? 'HAUTE' : 
                                       priority.priorityLevel.toUpperCase()}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-gray-500">
                                  {milestone.project}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-3">
                              <span className="text-sm text-gray-600">
                                {milestone.date ? new Date(milestone.date).toLocaleDateString("fr-FR") : "Date non définie"}
                              </span>
                              <Badge className={getStatusColor(milestone.status)}>
                                {milestone.status === "completed"
                                  ? "Terminé"
                                  : milestone.status === "in-progress"
                                  ? "En cours"
                                  : "À venir"}
                              </Badge>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>Aucun jalon planifié</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Alertes & Priorités</span>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setActiveTab('priorities')}
                      data-testid="view-priorities"
                    >
                      <Target className="h-4 w-4 mr-1" />
                      Gérer
                    </Button>
                  </CardTitle>
                  <CardDescription>Jalons et priorités à surveiller</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Alertes de priorité critique */}
                  {criticalAlerts.slice(0, 2).map((alert: any) => (
                    <div key={alert.id} className="flex items-start space-x-2">
                      <AlertTriangle className="h-4 w-4 text-red-500 mt-1" />
                      <div>
                        <p className="text-sm font-medium text-red-900">
                          {alert.itemName}
                        </p>
                        <p className="text-xs text-red-600">
                          Score: {alert.priorityScore} - {alert.message}
                        </p>
                      </div>
                    </div>
                  ))}
                  
                  {/* Alertes planning traditionnelles */}
                  <div className="flex items-start space-x-2">
                    <AlertTriangle className="h-4 w-4 text-orange-500 mt-1" />
                    <div>
                      <p className="text-sm font-medium">
                        Commande matériaux imminente
                      </p>
                      <p className="text-xs text-gray-500">
                        5 jours restants - Résidence Sandettie
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-1" />
                    <div>
                      <p className="text-sm font-medium">
                        Validation BE complétée
                      </p>
                      <p className="text-xs text-gray-500">
                        École Jean Jaurès - Aujourd'hui
                      </p>
                    </div>
                  </div>
                  
                  {/* Résumé des priorités */}
                  <div className="pt-3 border-t border-gray-200">
                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div>
                        <div className="text-lg font-bold text-red-600">
                          {priorities.filter((p: any) => p.priorityLevel === 'critique').length}
                        </div>
                        <div className="text-xs text-gray-600">Critiques</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-orange-600">
                          {priorities.filter((p: any) => p.priorityLevel === 'elevee').length}
                        </div>
                        <div className="text-xs text-gray-600">Élevées</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Actions Rapides</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button className="w-full" variant="outline" onClick={() => setActiveTab('planning')}>
                    <Calendar className="h-4 w-4 mr-2" />
                    Voir Planning Gantt
                  </Button>
                  <Button className="w-full" variant="outline" onClick={() => setActiveTab('priorities')}>
                    <Target className="h-4 w-4 mr-2" />
                    Analyser Priorités
                  </Button>
                  <Button className="w-full" variant="outline" onClick={() => setActiveTab('workload')}>
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Gérer Charges BE
                  </Button>
                  <Button className="w-full" variant="outline">
                    <Zap className="h-4 w-4 mr-2" />
                    Exporter Données
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
    </>
  );
}