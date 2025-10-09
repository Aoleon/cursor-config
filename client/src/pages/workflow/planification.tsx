import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { normalizeApiResponse } from "@/lib/api-helpers";
import Header from "@/components/layout/header";
import { 
  Calendar,
  Users,
  Truck,
  AlertTriangle,
  CheckCircle,
  Clock,
  Target,
  BarChart,
  Edit,
  Play
} from "lucide-react";

export default function Planification() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Récupérer les projets en planification
  const { data: projects, isLoading } = useQuery({
    queryKey: ["/api/projects/planification"],
    queryFn: async () => {
      const response = await fetch("/api/projects?status=planification");
      const result = await response.json();
      return normalizeApiResponse(result);
    }
  });

  // Mutation pour valider la planification
  const validatePlanningMutation = useMutation({
    mutationFn: async (projectId: string) => {
      const response = await fetch(`/api/projects/${projectId}/validate-planning`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          status: "approvisionnement",
          planningValidated: true
        })
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Planning validé",
        description: "Le projet passe en phase d'approvisionnement",
      });
    }
  });

  // Mutation pour démarrer le chantier directement
  const startChantierMutation = useMutation({
    mutationFn: async (projectId: string) => {
      const response = await fetch(`/api/projects/${projectId}/start-chantier`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          status: "chantier",
          startedAt: new Date()
        })
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Chantier démarré",
        description: "Le projet est maintenant en phase chantier",
      });
    }
  });

  const getActionButtons = (project: any) => {
    const actions = [];

    // Modifier le planning
    actions.push(
      <Button 
        key="edit-planning"
        data-testid={`button-edit-planning-${project.id}`}
        variant="outline" 
        size="sm"
        onClick={() => handleEditPlanning(project.id)}
      >
        <Calendar className="h-4 w-4 mr-2" />
        Modifier planning
      </Button>
    );

    // Affecter des équipes
    actions.push(
      <Button 
        key="teams"
        data-testid={`button-manage-teams-${project.id}`}
        variant="outline" 
        size="sm"
        onClick={() => handleManageTeams(project.id)}
      >
        <Users className="h-4 w-4 mr-2" />
        Gérer équipes
      </Button>
    );

    const canProceed = 
      project.tasksCreated && 
      project.teamsAssigned &&
      project.datesValidated;

    if (canProceed) {
      // Passer en approvisionnement
      actions.push(
        <Button 
          key="approve"
          data-testid={`button-validate-planning-${project.id}`}
          variant="outline"
          size="sm"
          onClick={() => validatePlanningMutation.mutate(project.id)}
        >
          <Truck className="h-4 w-4 mr-2" />
          Valider approvisionnement
        </Button>
      );

      // Ou démarrer directement le chantier
      actions.push(
        <Button 
          key="start"
          data-testid={`button-start-chantier-${project.id}`}
          size="sm"
          className="bg-success hover:bg-success/90"
          onClick={() => startChantierMutation.mutate(project.id)}
        >
          <Play className="h-4 w-4 mr-2" />
          Démarrer chantier
        </Button>
      );
    } else {
      actions.push(
        <Button 
          key="incomplete"
          data-testid={`button-incomplete-${project.id}`}
          variant="secondary" 
          size="sm"
          disabled
        >
          <AlertTriangle className="h-4 w-4 mr-2" />
          Planning incomplet
        </Button>
      );
    }

    return actions;
  };

  const handleEditPlanning = (projectId: string) => {
    window.location.href = `/projects/${projectId}/planning`;
  };

  const handleManageTeams = (projectId: string) => {
    window.location.href = `/projects/${projectId}/teams`;
  };

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case 'urgent': return 'text-error';
      case 'high': return 'text-warning';
      case 'normal': return 'text-primary';
      default: return 'text-on-surface-muted';
    }
  };

  return (
    <>
      <Header 
        title="Planification"
        breadcrumbs={[
          { label: "Tableau de bord", href: "/dashboard" },
          { label: "Planification", href: "/workflow/planification" }
        ]}
        />
        
        <div className="px-6 py-6">
          {/* Statistiques */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <Card data-testid="stat-en-planification">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">En planification</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{projects?.length || 0}</div>
                <p className="text-xs text-muted-foreground">Projets actifs</p>
              </CardContent>
            </Card>
            
            <Card data-testid="stat-equipes-affecter">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Équipes à affecter</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {projects?.filter((p: any) => !p.teamsAssigned).length || 0}
                </div>
                <p className="text-xs text-muted-foreground">Ressources manquantes</p>
              </CardContent>
            </Card>

            <Card data-testid="stat-prets-demarrer">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Prêts à démarrer</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {projects?.filter((p: any) => p.readyToStart).length || 0}
                </div>
                <p className="text-xs text-muted-foreground">Planning complet</p>
              </CardContent>
            </Card>

            <Card data-testid="stat-charge-equipes">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Charge équipes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">82%</div>
                <p className="text-xs text-muted-foreground">Taux d'occupation</p>
              </CardContent>
            </Card>
          </div>

          {/* Liste des projets */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Projets en phase de planification</span>
                <Badge variant="secondary">{projects?.length || 0} projets</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div data-testid="loading-state" className="text-center py-8">Chargement...</div>
              ) : projects?.length === 0 ? (
                <div data-testid="empty-state" className="text-center py-8 text-gray-500">
                  Aucun projet en planification actuellement
                </div>
              ) : (
                <div className="space-y-4">
                  {projects?.map((project: any) => (
                    <div 
                      key={project.id} 
                      data-testid={`card-project-${project.id}`}
                      className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 data-testid={`project-reference-${project.id}`} className="font-semibold text-lg">{project.reference}</h3>
                          <p className="text-sm text-gray-600">{project.client}</p>
                          <p className="text-sm text-gray-500">{project.location}</p>
                        </div>
                        <div className="text-right">
                          <Badge data-testid={`priority-badge-${project.id}`} className={getPriorityColor(project.priority)}>
                            {project.priority === 'urgent' ? 'Urgent' : 
                             project.priority === 'high' ? 'Prioritaire' : 'Normal'}
                          </Badge>
                          <p data-testid={`project-montant-${project.id}`} className="text-sm font-semibold mt-1">
                            {project.montantTotal?.toLocaleString('fr-FR')} € HT
                          </p>
                        </div>
                      </div>

                      {/* Planning overview */}
                      <div className="grid grid-cols-4 gap-4 mb-3 bg-gray-50 p-3 rounded">
                        <div>
                          <p className="text-xs text-gray-500">Date début prévue</p>
                          <p data-testid={`project-date-debut-${project.id}`} className="font-semibold">
                            {project.dateDebutPrevue ? 
                              new Date(project.dateDebutPrevue).toLocaleDateString('fr-FR') : 
                              'À définir'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Date fin prévue</p>
                          <p data-testid={`project-date-fin-${project.id}`} className="font-semibold">
                            {project.dateFinPrevue ? 
                              new Date(project.dateFinPrevue).toLocaleDateString('fr-FR') : 
                              'À définir'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Durée</p>
                          <p data-testid={`project-duree-${project.id}`} className="font-semibold">
                            {project.dureeJours || '-'} jours
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Équipes</p>
                          <p data-testid={`project-equipes-${project.id}`} className="font-semibold">
                            {project.teamCount || 0}/{project.teamRequired || 0}
                          </p>
                        </div>
                      </div>

                      {/* Indicateurs */}
                      <div className="flex items-center gap-4 mb-3">
                        <div data-testid={`indicator-tasks-${project.id}`} className="flex items-center">
                          <Target className={`h-4 w-4 mr-1 ${project.tasksCreated ? 'text-green-600' : 'text-gray-400'}`} />
                          <span className="text-sm">Tâches créées</span>
                        </div>
                        <div data-testid={`indicator-teams-${project.id}`} className="flex items-center">
                          <Users className={`h-4 w-4 mr-1 ${project.teamsAssigned ? 'text-green-600' : 'text-gray-400'}`} />
                          <span className="text-sm">Équipes affectées</span>
                        </div>
                        <div data-testid={`indicator-dates-${project.id}`} className="flex items-center">
                          <Calendar className={`h-4 w-4 mr-1 ${project.datesValidated ? 'text-green-600' : 'text-gray-400'}`} />
                          <span className="text-sm">Dates validées</span>
                        </div>
                        <div data-testid={`indicator-supplies-${project.id}`} className="flex items-center">
                          <Truck className={`h-4 w-4 mr-1 ${project.suppliesOrdered ? 'text-green-600' : 'text-gray-400'}`} />
                          <span className="text-sm">Approvisionnement</span>
                        </div>
                      </div>

                      {/* Jalons principaux */}
                      {project.milestones && project.milestones.length > 0 && (
                        <div data-testid={`milestones-${project.id}`} className="mb-3 p-2 bg-blue-50 rounded">
                          <p className="text-sm font-medium mb-1">Jalons principaux:</p>
                          <div className="flex gap-4 text-xs">
                            {project.milestones.map((milestone: any, idx: number) => (
                              <div key={idx} className="flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                <span>{milestone.name}: {new Date(milestone.date).toLocaleDateString('fr-FR')}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

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