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
  Search, 
  FileText, 
  CheckCircle, 
  Clock, 
  ArrowRight, 
  Calendar, 
  MapPin, 
  User, 
  Euro,
  AlertTriangle,
  Download,
  Upload,
  Eye
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { Project } from "@shared/schema";

export default function ProjectStudy() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedProject, setSelectedProject] = useState<string | null>(null);

  // Récupérer les projets en phase d'étude
  const { data: studyProjects = [], isLoading, error } = useQuery<Project[]>({
    queryKey: ["/api/projects", { status: "etude" }],
    queryFn: async () => {
      const response = await fetch("/api/projects?status=etude");
      if (!response.ok) throw new Error("Failed to fetch study projects");
      return response.json();
    },
  });

  // Mutation pour valider une étude et passer en planification
  const validateStudyMutation = useMutation({
    mutationFn: async (projectId: string) => {
      return await apiRequest(`/api/projects/${projectId}/update-status`, 'POST', {
        status: 'planification',
        validation: {
          phase: 'etude',
          validatedBy: 'current_user',
          validatedAt: new Date().toISOString(),
          comments: 'Étude technique validée'
        }
      });
    },
    onSuccess: (data, projectId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Étude Validée",
        description: "Le projet passe maintenant en phase de planification.",
      });
      setSelectedProject(null);
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de valider l'étude. Veuillez réessayer.",
        variant: "destructive",
      });
    },
  });

  const getProjectProgress = (project: Project) => {
    // En phase étude, calculer le progrès basé sur les documents et validations
    let progress = 20; // Base pour être en phase étude
    
    // Fallback: utiliser project.description comme indicateur de documents
    if (project.description && project.description.length > 0) progress += 20;
    // Fallback: utiliser project.finEtudesValidatedAt comme indicateur de validation technique
    if (project.finEtudesValidatedAt) progress += 30;
    // Fallback: utiliser le statut du projet pour indiquer l'approbation client
    if (project.status === 'planification' || project.status === 'chantier' || project.status === 'sav') progress += 30;
    
    return Math.min(progress, 95); // Max 95% en phase étude
  };

  const getUrgencyLevel = (project: Project) => {
    // Fallback: utiliser project.endDate ou project.dateLivraisonPrevue comme échéance d'étude
    const studyDeadline = project.endDate || project.dateLivraisonPrevue;
    if (!studyDeadline) return 'normal';
    
    const deadline = new Date(studyDeadline);
    const now = new Date();
    const daysDiff = (deadline.getTime() - now.getTime()) / (1000 * 3600 * 24);
    
    if (daysDiff < 3) return 'urgent';
    if (daysDiff < 7) return 'warning';
    return 'normal';
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'warning': return 'bg-orange-100 text-orange-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const getUrgencyLabel = (urgency: string) => {
    switch (urgency) {
      case 'urgent': return 'Urgent';
      case 'warning': return 'Attention';
      default: return 'Normal';
    }
  };

  return (
    <>
        <Header
          title="Projets - Phase d'Étude"
          breadcrumbs={[
            { label: "Accueil", href: "/" },
            { label: "Projets", href: "/projects" },
            { label: "Étude Technique" }
          ]}
          actions={[
            {
              label: "Vue Générale Projets",
              variant: "outline",
              icon: "eye",
              onClick: () => setLocation("/projects")
            }
          ]}
        />

        <div className="px-6 py-6">
          <Tabs defaultValue="list" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="list" className="flex items-center gap-2" data-testid="tab-list">
                <Search className="h-4 w-4" />
                Liste des Études
              </TabsTrigger>
              <TabsTrigger value="urgent" className="flex items-center gap-2" data-testid="tab-urgent">
                <AlertTriangle className="h-4 w-4" />
                Urgences
                {studyProjects.filter(p => getUrgencyLevel(p) === 'urgent').length > 0 && (
                  <Badge variant="destructive" className="ml-1">
                    {studyProjects.filter(p => getUrgencyLevel(p) === 'urgent').length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="ready" className="flex items-center gap-2" data-testid="tab-ready">
                <CheckCircle className="h-4 w-4" />
                Prêtes à Valider
                {studyProjects.filter(p => getProjectProgress(p) >= 80).length > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {studyProjects.filter(p => getProjectProgress(p) >= 80).length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="list" className="space-y-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : studyProjects.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">Aucun projet en phase d'étude.</p>
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
                  {studyProjects.map((project) => {
                    const progress = getProjectProgress(project);
                    const urgency = getUrgencyLevel(project);
                    
                    return (
                      <Card
                        key={project.id}
                        className="hover:shadow-lg transition-shadow cursor-default"
                        data-testid={`project-card-${project.id}`}
                      >
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">{project.name}</CardTitle>
                            <div className="flex gap-2">
                              <Badge className="bg-primary/10 text-primary">
                                Étude
                              </Badge>
                              <Badge className={getUrgencyColor(urgency)}>
                                {getUrgencyLabel(urgency)}
                              </Badge>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setLocation(`/projects/${project.id}`)}
                                data-testid={`button-detail-${project.id}`}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                Voir le détail
                              </Button>
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

                          {project.budget && (
                            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                              <Euro className="w-4 h-4" />
                              <span>{Number(project.budget).toLocaleString('fr-FR')} €</span>
                            </div>
                          )}

                          {(project.endDate || project.dateLivraisonPrevue) && (
                            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                              <Calendar className="w-4 h-4" />
                              <span>
                                Échéance: {format(new Date(project.endDate || project.dateLivraisonPrevue!), 'dd MMM yyyy', { locale: fr })}
                              </span>
                            </div>
                          )}

                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Avancement Étude</span>
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
                            
                            {progress >= 80 && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    className="flex-1"
                                    data-testid={`button-validate-${project.id}`}
                                  >
                                    <CheckCircle className="w-4 h-4 mr-1" />
                                    Valider
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Valider l'Étude Technique</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Êtes-vous sûr de vouloir valider l'étude technique du projet "{project.name}" ?
                                      Le projet passera automatiquement en phase de planification.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => validateStudyMutation.mutate(project.id)}
                                      disabled={validateStudyMutation.isPending}
                                      data-testid={`button-confirm-validate-${project.id}`}
                                    >
                                      {validateStudyMutation.isPending ? (
                                        <>
                                          <Clock className="w-4 h-4 mr-2 animate-spin" />
                                          Validation...
                                        </>
                                      ) : (
                                        <>
                                          <ArrowRight className="w-4 h-4 mr-2" />
                                          Valider et Passer en Planification
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
                    Projets Urgents - Étude
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {studyProjects.filter(p => getUrgencyLevel(p) === 'urgent').length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Aucun projet urgent en phase d'étude.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {studyProjects
                        .filter(p => getUrgencyLevel(p) === 'urgent')
                        .map(project => (
                          <div
                            key={project.id}
                            className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50 cursor-default hover:bg-red-100 transition-colors"
                            data-testid={`urgent-project-${project.id}`}
                          >
                            <div>
                              <h4 className="font-medium text-red-900">{project.name}</h4>
                              <p className="text-sm text-red-700">{project.client} - {project.location}</p>
                              {(project.endDate || project.dateLivraisonPrevue) && (
                                <p className="text-xs text-red-600">
                                  Échéance: {format(new Date(project.endDate || project.dateLivraisonPrevue!), 'dd MMM yyyy', { locale: fr })}
                                </p>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setLocation(`/projects/${project.id}`)}
                                data-testid={`button-urgent-view-${project.id}`}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                Voir le détail
                              </Button>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="ready" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-5 w-5" />
                    Études Prêtes à Valider
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {studyProjects.filter(p => getProjectProgress(p) >= 80).length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Aucune étude prête à être validée.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {studyProjects
                        .filter(p => getProjectProgress(p) >= 80)
                        .map(project => (
                          <div
                            key={project.id}
                            className="flex items-center justify-between p-4 border border-green-200 rounded-lg bg-green-50 cursor-default hover:bg-green-100 transition-colors"
                            data-testid={`ready-project-${project.id}`}
                          >
                            <div>
                              <h4 className="font-medium text-green-900">{project.name}</h4>
                              <p className="text-sm text-green-700">{project.client} - {project.location}</p>
                              <p className="text-xs text-green-600">
                                Avancement: {getProjectProgress(project)}%
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setLocation(`/projects/${project.id}`)}
                                data-testid={`button-ready-view-${project.id}`}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                Voir le détail
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm" data-testid={`button-ready-validate-${project.id}`}>
                                    Valider Étude
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Valider l'Étude</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Valider l'étude technique de "{project.name}" et passer en planification ?
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => validateStudyMutation.mutate(project.id)}
                                      disabled={validateStudyMutation.isPending}
                                    >
                                      Valider
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
          </Tabs>
        </div>
    </>
  );
}