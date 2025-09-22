import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { 
  HardHat, 
  Camera, 
  CheckCircle, 
  Clock, 
  ArrowRight, 
  Calendar, 
  MapPin, 
  User, 
  Euro,
  AlertTriangle,
  Users,
  FileImage,
  ClipboardCheck,
  Eye,
  TrendingUp,
  Wrench
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { Project } from "@shared/schema";

export default function ProjectWorksite() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedProject, setSelectedProject] = useState<string | null>(null);

  // Récupérer les projets en phase chantier
  const { data: worksiteProjects = [], isLoading, error } = useQuery<Project[]>({
    queryKey: ["/api/projects", { status: "chantier" }],
    queryFn: async () => {
      const response = await fetch("/api/projects?status=chantier");
      if (!response.ok) throw new Error("Failed to fetch worksite projects");
      return response.json();
    },
  });

  // Récupérer les tâches/jalons pour les projets chantier
  const { data: projectTasks = [] } = useQuery({
    queryKey: ["/api/tasks", "all"],
    queryFn: async () => {
      const response = await fetch("/api/tasks/all");
      if (!response.ok) throw new Error("Failed to fetch project tasks");
      return response.json();
    },
  });

  // Récupérer les équipes disponibles
  const { data: teams = [] } = useQuery({
    queryKey: ["/api/teams"],
    queryFn: async () => {
      const response = await fetch("/api/teams");
      if (!response.ok) throw new Error("Failed to fetch teams");
      return response.json();
    },
  });

  // Mutation pour terminer le chantier et passer au SAV
  const completeWorksiteMutation = useMutation({
    mutationFn: async (projectId: string) => {
      return await apiRequest(`/api/projects/${projectId}/update-status`, 'POST', {
        status: 'sav',
        validation: {
          phase: 'chantier',
          validatedBy: 'current_user',
          validatedAt: new Date().toISOString(),
          comments: 'Chantier terminé, réception validée'
        }
      });
    },
    onSuccess: (data, projectId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Chantier Terminé",
        description: "Le projet passe maintenant en phase SAV.",
      });
      setSelectedProject(null);
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de terminer le chantier. Veuillez réessayer.",
        variant: "destructive",
      });
    },
  });

  const getWorksiteProgress = (project: Project) => {
    // Calculer le progrès basé sur les tâches et jalons
    let progress = 60; // Base pour être en phase chantier
    
    const projectRelatedTasks = projectTasks.filter((task: any) => task.projectId === project.id);
    const totalTasks = projectRelatedTasks.length;
    
    if (totalTasks > 0) {
      const completedTasks = projectRelatedTasks.filter((task: any) => task.status === 'termine').length;
      progress += (completedTasks / totalTasks) * 35;
    } else {
      // Si pas de tâches, estimer basé sur les dates
      if (project.startDate && project.endDate) {
        const start = new Date(project.startDate);
        const end = new Date(project.endDate);
        const now = new Date();
        const total = end.getTime() - start.getTime();
        const elapsed = Math.min(now.getTime() - start.getTime(), total);
        if (total > 0) {
          progress += (elapsed / total) * 35;
        }
      }
    }
    
    return Math.min(progress, 95);
  };

  const getDelayRisk = (project: Project) => {
    if (!project.endDate) return 'normal';
    
    const endDate = new Date(project.endDate);
    const now = new Date();
    const daysRemaining = (endDate.getTime() - now.getTime()) / (1000 * 3600 * 24);
    
    if (daysRemaining < 0) return 'overdue';
    if (daysRemaining < 7) return 'urgent';
    if (daysRemaining < 14) return 'warning';
    return 'normal';
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'warning': return 'bg-orange-100 text-orange-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const getRiskLabel = (risk: string) => {
    switch (risk) {
      case 'overdue': return 'En retard';
      case 'urgent': return 'Urgent';
      case 'warning': return 'Attention';
      default: return 'Dans les temps';
    }
  };

  const getProjectTeam = (projectId: string) => {
    // Trouver l'équipe assignée au projet
    return teams.find((team: any) => 
      team.assignedProjects && team.assignedProjects.includes(projectId)
    );
  };

  const getProjectTasks = (projectId: string) => {
    return projectTasks.filter((task: any) => task.projectId === projectId);
  };

  return (
    <>
        <Header
          title="Projets - Suivi Chantier"
          breadcrumbs={[
            { label: "Accueil", href: "/" },
            { label: "Projets", href: "/projects" },
            { label: "Chantier" }
          ]}
          actions={[
            {
              label: "Planning Gantt",
              variant: "outline",
              icon: "calendar",
              onClick: () => setLocation("/projects/planning")
            },
            {
              label: "Équipes",
              variant: "outline",
              icon: "users",
              onClick: () => setLocation("/teams")
            },
            {
              label: "Vue Générale",
              variant: "outline",
              icon: "eye",
              onClick: () => setLocation("/projects")
            }
          ]}
        />

        <div className="px-6 py-6">
          <Tabs defaultValue="list" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="list" className="flex items-center gap-2" data-testid="tab-list">
                <HardHat className="h-4 w-4" />
                Chantiers en Cours
              </TabsTrigger>
              <TabsTrigger value="urgent" className="flex items-center gap-2" data-testid="tab-urgent">
                <AlertTriangle className="h-4 w-4" />
                Retards & Urgences
                {worksiteProjects.filter(p => ['overdue', 'urgent'].includes(getDelayRisk(p))).length > 0 && (
                  <Badge variant="destructive" className="ml-1">
                    {worksiteProjects.filter(p => ['overdue', 'urgent'].includes(getDelayRisk(p))).length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="completion" className="flex items-center gap-2" data-testid="tab-completion">
                <CheckCircle className="h-4 w-4" />
                Prêts pour Réception
                {worksiteProjects.filter(p => getWorksiteProgress(p) >= 90).length > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {worksiteProjects.filter(p => getWorksiteProgress(p) >= 90).length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="teams" className="flex items-center gap-2" data-testid="tab-teams">
                <Users className="h-4 w-4" />
                Équipes
              </TabsTrigger>
            </TabsList>

            <TabsContent value="list" className="space-y-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : worksiteProjects.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <HardHat className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">Aucun projet en phase chantier.</p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => setLocation("/projects")}
                      data-testid="button-view-all-projects"
                    >
                      Voir tous les projets
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {worksiteProjects.map((project) => {
                    const progress = getWorksiteProgress(project);
                    const risk = getDelayRisk(project);
                    const team = getProjectTeam(project.id);
                    const tasks = getProjectTasks(project.id);
                    
                    return (
                      <Card
                        key={project.id}
                        className="hover:shadow-lg transition-shadow cursor-pointer"
                        data-testid={`project-card-${project.id}`}
                      >
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">{project.name}</CardTitle>
                            <div className="flex gap-2">
                              <Badge className="bg-blue-100 text-blue-800">
                                Chantier
                              </Badge>
                              <Badge className={getRiskColor(risk)}>
                                {getRiskLabel(risk)}
                              </Badge>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            <User className="w-4 h-4" />
                            <span>{project.client}</span>
                          </div>

                          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            <MapPin className="w-4 h-4" />
                            <span>{project.location}</span>
                          </div>

                          {project.endDate && (
                            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                              <Calendar className="w-4 h-4" />
                              <span>
                                Fin prévue: {format(new Date(project.endDate), 'dd MMM yyyy', { locale: fr })}
                              </span>
                            </div>
                          )}

                          {team && (
                            <div className="p-3 bg-muted rounded-lg">
                              <div className="flex items-center gap-2 mb-1">
                                <Users className="w-4 h-4" />
                                <span className="text-sm font-medium">{team.name}</span>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {team.members ? team.members.length : 0} personne(s)
                              </div>
                            </div>
                          )}

                          <div className="p-3 bg-muted rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium">Tâches</span>
                              <span className="text-xs text-muted-foreground">
                                {tasks.filter((t: any) => t.status === 'termine').length}/{tasks.length}
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {tasks.length > 0 ? 
                                `${Math.round((tasks.filter((t: any) => t.status === 'termine').length / tasks.length) * 100)}% terminées` :
                                'Aucune tâche définie'
                              }
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Avancement Chantier</span>
                              <span>{progress}%</span>
                            </div>
                            <Progress value={progress} className="h-2" />
                          </div>

                          <div className="flex gap-2 pt-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setLocation(`/projects/${project.id}`)}
                              className="flex-1"
                              data-testid={`button-view-${project.id}`}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Voir
                            </Button>
                            
                            {progress >= 90 && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    className="flex-1"
                                    data-testid={`button-complete-${project.id}`}
                                  >
                                    <CheckCircle className="w-4 h-4 mr-1" />
                                    Terminer
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Terminer le Chantier</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Le chantier de "{project.name}" est-il terminé et prêt pour la réception ?
                                      Le projet passera automatiquement en phase SAV.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => completeWorksiteMutation.mutate(project.id)}
                                      disabled={completeWorksiteMutation.isPending}
                                      data-testid={`button-confirm-complete-${project.id}`}
                                    >
                                      {completeWorksiteMutation.isPending ? (
                                        <>
                                          <Clock className="w-4 h-4 mr-2 animate-spin" />
                                          Finalisation...
                                        </>
                                      ) : (
                                        <>
                                          <ArrowRight className="w-4 h-4 mr-2" />
                                          Terminer et Passer au SAV
                                        </>
                                      )}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="urgent" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-600">
                    <AlertTriangle className="h-5 w-5" />
                    Chantiers en Retard ou Urgents
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {worksiteProjects.filter(p => ['overdue', 'urgent'].includes(getDelayRisk(p))).length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Aucun chantier en retard ou urgent.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {worksiteProjects
                        .filter(p => ['overdue', 'urgent'].includes(getDelayRisk(p)))
                        .map(project => {
                          const team = getProjectTeam(project.id);
                          const tasks = getProjectTasks(project.id);
                          return (
                            <div
                              key={project.id}
                              className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50"
                              data-testid={`urgent-project-${project.id}`}
                            >
                              <div>
                                <h4 className="font-medium text-red-900">{project.name}</h4>
                                <p className="text-sm text-red-700">{project.client} - {project.location}</p>
                                <div className="text-xs text-red-600 space-y-1">
                                  {project.endDate && (
                                    <p>Échéance: {format(new Date(project.endDate), 'dd MMM yyyy', { locale: fr })}</p>
                                  )}
                                  {team && <p>Équipe: {team.name}</p>}
                                  <p>Avancement: {getWorksiteProgress(project)}%</p>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setLocation(`/projects/${project.id}`)}
                                  data-testid={`button-urgent-view-${project.id}`}
                                >
                                  Voir
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="completion" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-5 w-5" />
                    Chantiers Prêts pour Réception
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {worksiteProjects.filter(p => getWorksiteProgress(p) >= 90).length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Aucun chantier prêt pour réception.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {worksiteProjects
                        .filter(p => getWorksiteProgress(p) >= 90)
                        .map(project => (
                          <div
                            key={project.id}
                            className="flex items-center justify-between p-4 border border-green-200 rounded-lg bg-green-50"
                            data-testid={`completion-project-${project.id}`}
                          >
                            <div>
                              <h4 className="font-medium text-green-900">{project.name}</h4>
                              <p className="text-sm text-green-700">{project.client} - {project.location}</p>
                              <p className="text-xs text-green-600">
                                Chantier: {getWorksiteProgress(project)}% - Prêt pour réception
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setLocation(`/projects/${project.id}`)}
                                data-testid={`button-completion-view-${project.id}`}
                              >
                                Voir
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm" data-testid={`button-completion-complete-${project.id}`}>
                                    Réception
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Finaliser le Chantier</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Valider la réception de "{project.name}" et passer en phase SAV ?
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => completeWorksiteMutation.mutate(project.id)}
                                      disabled={completeWorksiteMutation.isPending}
                                    >
                                      Valider Réception
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="teams" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {teams.length === 0 ? (
                  <Card className="col-span-2">
                    <CardContent className="py-12 text-center">
                      <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <p className="text-muted-foreground">Aucune équipe configurée.</p>
                      <Button
                        variant="outline"
                        className="mt-4"
                        onClick={() => setLocation("/teams")}
                        data-testid="button-manage-teams"
                      >
                        Gérer les Équipes
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  teams.map((team: any) => {
                    const assignedWorksiteProjects = worksiteProjects.filter(p => 
                      team.assignedProjects && team.assignedProjects.includes(p.id)
                    );
                    
                    return (
                      <Card key={team.id} data-testid={`team-card-${team.id}`}>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            {team.name}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div>
                              <p className="text-sm font-medium">Membres:</p>
                              <p className="text-sm text-muted-foreground">
                                {team.members ? team.members.length : 0} personne(s)
                              </p>
                            </div>
                            
                            <div>
                              <p className="text-sm font-medium">Chantiers assignés:</p>
                              {assignedWorksiteProjects.length === 0 ? (
                                <p className="text-sm text-muted-foreground">Aucun chantier assigné</p>
                              ) : (
                                <div className="space-y-1">
                                  {assignedWorksiteProjects.map(project => (
                                    <div key={project.id} className="text-sm">
                                      <span className="font-medium">{project.name}</span>
                                      <span className="text-muted-foreground ml-2">
                                        ({getWorksiteProgress(project)}%)
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
    </>
  );
}