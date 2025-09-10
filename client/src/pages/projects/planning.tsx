import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar, Clock, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import GanttChart from "@/components/projects/GanttChart";
import type { Project, ProjectTask } from "@shared/schema";

export default function ProjectPlanningPage() {
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const { toast } = useToast();

  // Récupérer les projets
  const { data: projects = [], isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  // Récupérer toutes les tâches pour les jalons
  const { data: allTasks = [], isLoading: tasksLoading } = useQuery<ProjectTask[]>({
    queryKey: ["/api/tasks/all"],
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

  // Mutation pour mettre à jour les dates des tâches (jalons)
  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, startDate, endDate }: { taskId: string; startDate: Date; endDate: Date }) => {
      return await apiRequest(`/api/tasks/${taskId}`, 'PATCH', {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/all"] });
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

  // Gestionnaire de mise à jour des dates depuis le Gantt
  const handleDateUpdate = (itemId: string, newStartDate: Date, newEndDate: Date, type: 'project' | 'milestone') => {
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
  };

  // Préparer les jalons depuis les tâches
  const milestones = allTasks
    .filter(task => task.isJalon || task.status === 'termine')
    .map(task => ({
      id: task.id,
      name: task.name,
      date: task.startDate,
      status: task.status === 'termine' ? 'completed' : 
              task.status === 'en_cours' ? 'in-progress' : 'pending',
      project: projects.find(p => p.id === task.projectId)?.name || 'Projet inconnu',
      projectId: task.projectId,
    }));

  const getStatusColor = (status: string) => {
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
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Header
          title="Planification - Projets"
          breadcrumbs={[
            { label: "Accueil", href: "/" },
            { label: "Projets", href: "/projects" },
            { label: "Planification" },
          ]}
        />

        <div className="p-6">
          {/* Composant Gantt Chart principal */}
          <div className="mb-6">
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
                data-testid="gantt-chart"
              />
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Jalons Récents</CardTitle>
                  <CardDescription>
                    Liste des jalons importants des projets en cours
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {milestones.length > 0 ? (
                    <div className="space-y-4">
                      {milestones.slice(0, 5).map((milestone) => (
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
                              <p className="font-medium">{milestone.name}</p>
                              <p className="text-sm text-gray-500">
                                {milestone.project}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <span className="text-sm text-gray-600">
                              {new Date(milestone.date).toLocaleDateString("fr-FR")}
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
                      ))}
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
                  <CardTitle>Alertes Planning</CardTitle>
                  <CardDescription>Jalons à surveiller</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
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
                </CardContent>
              </Card>

              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Actions Rapides</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button className="w-full" variant="outline">
                    Ajouter un jalon
                  </Button>
                  <Button className="w-full" variant="outline">
                    Créer une tâche
                  </Button>
                  <Button className="w-full" variant="outline">
                    Exporter planning
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}