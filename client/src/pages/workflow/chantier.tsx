import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { normalizeApiResponse } from "@/lib/api-helpers";
import Header from "@/components/layout/header";
import { 
  HardHat,
  AlertTriangle,
  CheckCircle,
  Clock,
  Camera,
  FileText,
  Users,
  TrendingUp,
  Pause,
  Play,
  XCircle
} from "lucide-react";

export default function Chantier() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Récupérer les projets en chantier
  const { data: projects, isLoading } = useQuery({
    queryKey: ["/api/projects/chantier"],
    queryFn: async () => {
      const response = await fetch("/api/projects?status=chantier");
      const result = await response.json();
      return normalizeApiResponse(result);
    }
  });

  // Mutation pour terminer le chantier
  const finishChantierMutation = useMutation({
    mutationFn: async (projectId: string) => {
      const response = await fetch(`/api/projects/${projectId}/finish`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          status: "sav",
          finishedAt: new Date()
        })
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Chantier terminé",
        description: "Le projet passe en phase SAV",
      });
    }
  });

  // Mutation pour signaler un problème
  const reportIssueMutation = useMutation({
    mutationFn: async ({ projectId, issue }: any) => {
      const response = await fetch(`/api/projects/${projectId}/issue`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ issue })
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Problème signalé",
        description: "L'équipe de supervision a été notifiée",
      });
    }
  });

  const getActionButtons = (project: any) => {
    const actions = [];

    // Suivi photo
    actions.push(
      <Button 
        key="photo"
        variant="outline" 
        size="sm"
        onClick={() => handlePhotoReport(project.id)}
        data-testid={`button-photos-${project.id}`}
      >
        <Camera className="h-4 w-4 mr-2" />
        Suivi photo
      </Button>
    );

    // Rapport d'avancement
    actions.push(
      <Button 
        key="report"
        variant="outline" 
        size="sm"
        onClick={() => handleProgressReport(project.id)}
        data-testid={`button-progress-report-${project.id}`}
      >
        <FileText className="h-4 w-4 mr-2" />
        Rapport avancement
      </Button>
    );

    // Gérer l'état du chantier
    if (project.status === 'paused') {
      actions.push(
        <Button 
          key="resume"
          variant="outline"
          size="sm"
          className="text-green-600"
          onClick={() => handleResumeProject(project.id)}
          data-testid={`button-resume-${project.id}`}
        >
          <Play className="h-4 w-4 mr-2" />
          Reprendre
        </Button>
      );
    } else {
      actions.push(
        <Button 
          key="pause"
          variant="outline"
          size="sm"
          className="text-orange-600"
          onClick={() => handlePauseProject(project.id)}
          data-testid={`button-pause-${project.id}`}
        >
          <Pause className="h-4 w-4 mr-2" />
          Suspendre
        </Button>
      );
    }

    // Signaler un problème ou terminer
    if (project.hasIssues) {
      actions.push(
        <Button 
          key="issue"
          variant="destructive"
          size="sm"
          onClick={() => handleViewIssues(project.id)}
          data-testid={`button-view-issues-${project.id}`}
        >
          <AlertTriangle className="h-4 w-4 mr-2" />
          Voir problèmes ({project.issueCount})
        </Button>
      );
    }

    if (project.progress >= 95 && !project.hasBlockingIssues) {
      actions.push(
        <Button 
          key="finish"
          size="sm"
          className="bg-green-600 hover:bg-green-700"
          onClick={() => finishChantierMutation.mutate(project.id)}
          data-testid={`button-finish-${project.id}`}
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          Terminer chantier
        </Button>
      );
    }

    return actions;
  };

  const handlePhotoReport = (projectId: string) => {
    window.location.href = `/projects/${projectId}/photos`;
  };

  const handleProgressReport = (projectId: string) => {
    window.location.href = `/projects/${projectId}/progress`;
  };

  const handlePauseProject = (projectId: string) => {
    toast({
      title: "Chantier suspendu",
      description: "Le chantier a été mis en pause",
    });
  };

  const handleResumeProject = (projectId: string) => {
    toast({
      title: "Chantier repris",
      description: "Le chantier a repris",
    });
  };

  const handleViewIssues = (projectId: string) => {
    window.location.href = `/projects/${projectId}/issues`;
  };

  const getProgressColor = (progress: number) => {
    if (progress < 30) return "bg-red-600";
    if (progress < 70) return "bg-orange-600";
    return "bg-green-600";
  };

  const getStatusBadge = (project: any) => {
    if (project.status === 'paused') {
      return <Badge variant="secondary">Suspendu</Badge>;
    }
    if (project.hasBlockingIssues) {
      return <Badge variant="destructive">Bloqué</Badge>;
    }
    if (project.isDelayed) {
      return <Badge className="bg-orange-600">En retard</Badge>;
    }
    return <Badge className="bg-green-600">En cours</Badge>;
  };

  return (
    <>
      <Header 
        title="Chantiers en Cours"
        breadcrumbs={[
          { label: "Tableau de bord", href: "/dashboard" },
          { label: "Chantiers", href: "/workflow/chantier" }
        ]}
        />
        
        <div className="px-6 py-6">
          {/* Statistiques */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <Card data-testid="stat-chantiers-actifs">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Actifs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-actifs-value">{projects?.length || 0}</div>
                <p className="text-xs text-muted-foreground">Chantiers en cours</p>
              </CardContent>
            </Card>
            
            <Card data-testid="stat-chantiers-retard">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">En retard</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600" data-testid="stat-retard-value">
                  {projects?.filter((p: any) => p.isDelayed).length || 0}
                </div>
                <p className="text-xs text-muted-foreground">Délais dépassés</p>
              </CardContent>
            </Card>

            <Card data-testid="stat-problemes">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Problèmes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600" data-testid="stat-problemes-value">
                  {projects?.reduce((sum: number, p: any) => sum + (p.issueCount || 0), 0)}
                </div>
                <p className="text-xs text-muted-foreground">À résoudre</p>
              </CardContent>
            </Card>

            <Card data-testid="stat-avancement-moyen">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Avancement moyen</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-avancement-value">
                  {projects?.length ? 
                    Math.round(projects.reduce((sum: number, p: any) => sum + (p.progress || 0), 0) / projects.length) : 0}%
                </div>
                <p className="text-xs text-muted-foreground">Progression globale</p>
              </CardContent>
            </Card>
          </div>

          {/* Liste des chantiers */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Chantiers actifs</span>
                <Badge variant="secondary">{projects?.length || 0} chantiers</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8" data-testid="loading-state">Chargement...</div>
              ) : projects?.length === 0 ? (
                <div className="text-center py-8 text-gray-500" data-testid="empty-state">
                  Aucun chantier en cours actuellement
                </div>
              ) : (
                <div className="space-y-4">
                  {projects?.map((project: any) => (
                    <div 
                      key={project.id} 
                      className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                      data-testid={`card-chantier-${project.id}`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-semibold text-lg flex items-center gap-2" data-testid={`chantier-reference-${project.id}`}>
                            {project.reference}
                            <HardHat className="h-5 w-5 text-orange-600" />
                          </h3>
                          <p className="text-sm text-gray-600" data-testid={`chantier-client-${project.id}`}>{project.client}</p>
                          <p className="text-sm text-gray-500" data-testid={`chantier-location-${project.id}`}>{project.location}</p>
                        </div>
                        <div className="text-right">
                          <div data-testid={`status-badge-${project.id}`}>{getStatusBadge(project)}</div>
                          <p className="text-sm font-semibold mt-1" data-testid={`chantier-montant-${project.id}`}>
                            {project.montantTotal?.toLocaleString('fr-FR')} € HT
                          </p>
                        </div>
                      </div>

                      {/* Progression */}
                      <div className="mb-4">
                        <div className="flex justify-between text-sm mb-1">
                          <span>Avancement global</span>
                          <span className="font-semibold" data-testid={`progress-percentage-${project.id}`}>{project.progress || 0}%</span>
                        </div>
                        <Progress 
                          value={project.progress || 0} 
                          className={`h-2 ${getProgressColor(project.progress || 0)}`}
                          data-testid={`progress-bar-${project.id}`}
                        />
                      </div>

                      {/* Dates et équipes */}
                      <div className="grid grid-cols-4 gap-4 mb-3 bg-gray-50 p-3 rounded">
                        <div>
                          <p className="text-xs text-gray-500">Date début</p>
                          <p className="font-semibold" data-testid={`chantier-date-debut-${project.id}`}>
                            {new Date(project.dateDebut).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Date fin prévue</p>
                          <p className={`font-semibold ${project.isDelayed ? 'text-red-600' : ''}`} data-testid={`chantier-date-fin-${project.id}`}>
                            {new Date(project.dateFinPrevue).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Jours restants</p>
                          <p className="font-semibold" data-testid={`chantier-jours-restants-${project.id}`}>
                            {project.daysRemaining || 0}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Équipes sur site</p>
                          <p className="font-semibold" data-testid={`chantier-equipes-site-${project.id}`}>
                            {project.teamsOnSite || 0} équipes
                          </p>
                        </div>
                      </div>

                      {/* Tâches du jour */}
                      {project.todayTasks && project.todayTasks.length > 0 && (
                        <div className="mb-3 p-2 bg-blue-50 rounded" data-testid={`today-tasks-${project.id}`}>
                          <p className="text-sm font-medium mb-1 flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            Tâches du jour:
                          </p>
                          <ul className="text-sm space-y-1">
                            {project.todayTasks.map((task: any, idx: number) => (
                              <li key={idx} className="flex items-center" data-testid={`task-${idx}-${project.id}`}>
                                {task.completed ? 
                                  <CheckCircle className="h-3 w-3 mr-1 text-green-600" data-testid={`task-completed-icon-${idx}-${project.id}`} /> :
                                  <Clock className="h-3 w-3 mr-1 text-orange-600" data-testid={`task-pending-icon-${idx}-${project.id}`} />
                                }
                                {task.name}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Indicateurs de qualité */}
                      <div className="flex items-center gap-4 mb-3">
                        <div className="flex items-center" data-testid={`indicator-teams-present-${project.id}`}>
                          <Users className={`h-4 w-4 mr-1 ${project.teamsPresent ? 'text-green-600' : 'text-gray-400'}`} />
                          <span className="text-sm">Équipes présentes</span>
                        </div>
                        <div className="flex items-center" data-testid={`indicator-photos-${project.id}`}>
                          <Camera className={`h-4 w-4 mr-1 ${project.photosTaken ? 'text-green-600' : 'text-gray-400'}`} />
                          <span className="text-sm">Suivi photo</span>
                        </div>
                        <div className="flex items-center" data-testid={`indicator-report-${project.id}`}>
                          <FileText className={`h-4 w-4 mr-1 ${project.reportUpdated ? 'text-green-600' : 'text-gray-400'}`} />
                          <span className="text-sm">Rapport à jour</span>
                        </div>
                        <div className="flex items-center" data-testid={`indicator-delays-${project.id}`}>
                          <TrendingUp className={`h-4 w-4 mr-1 ${!project.isDelayed ? 'text-green-600' : 'text-red-600'}`} />
                          <span className="text-sm">Respect délais</span>
                        </div>
                      </div>

                      {/* Actions contextuelles */}
                      <div className="flex gap-2 justify-end">
                        {getActionButtons(project)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
    </>
  );
}