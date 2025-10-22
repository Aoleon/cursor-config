import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { isUnauthorizedError } from "@/lib/authUtils";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, MapPin, User, Euro, Kanban, Users, Home, ExternalLink, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import KanbanBoard from "@/components/projects/kanban-board";
import WorkloadPlanner from "@/components/projects/workload-planner";
import TimelineView from "@/components/projects/timeline-view";
import { SyncStatusBadge } from "@/components/monday/SyncStatusBadge";
import { useMondaySync } from "@/hooks/useMondaySync";

export default function Projects() {
  const { toast } = useToast();
  const [_, setLocation] = useLocation();
  const [page, setPage] = useState(1);
  const limit = 20;
  
  // Active les notifications Monday sync
  useMondaySync();
  
  // Authentication temporarily disabled for development
  const { data: projectsData, isLoading: projectsLoading, error } = useQuery<any>({
    queryKey: ["/api/projects", { limit, offset: (page - 1) * limit }],
    queryFn: async ({ queryKey }) => {
      const [url, params] = queryKey as [string, { limit: number; offset: number }];
      const queryParams = new URLSearchParams();
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.offset) queryParams.append('offset', params.offset.toString());
      const response = await fetch(`${url}?${queryParams}`);
      if (!response.ok) throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      return response.json();
    }
  });
  
  // Extraire les données du format API { success: true, data: [...], pagination: {...} }
  const projects = projectsData?.data || [];
  const pagination = projectsData?.pagination || { page: 1, limit: 20, total: 0 };
  
  // Extraire les IDs des projets visibles sur la page actuelle (optimisation)
  const visibleProjectIds = projects.map((p: any) => p.id);
  
  // Récupérer les statuts de synchronisation Monday UNIQUEMENT pour les projets visibles
  // Optimisation: charge ~20 statuts au lieu de 375 (réduction de 95%)
  const { data: syncStatusesData } = useQuery<any>({
    queryKey: ["/api/monday/sync-status", { 
      entityIds: visibleProjectIds.join(','),
      entityType: 'project' // Filter par type pour éviter les statuts AO
    }],
    queryFn: async ({ queryKey }) => {
      const [url, params] = queryKey as [string, { entityIds: string; entityType: string }];
      const queryParams = new URLSearchParams();
      if (params.entityIds) queryParams.append('entityIds', params.entityIds);
      if (params.entityType) queryParams.append('entityType', params.entityType);
      const response = await fetch(`${url}?${queryParams}`);
      if (!response.ok) throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      return response.json();
    },
    refetchInterval: 30000, // Refresh toutes les 30s
    enabled: visibleProjectIds.length > 0, // Only fetch when we have projects
  });
  
  const syncStatuses = syncStatusesData?.data || [];
  
  // Calculer le nombre total de pages
  const totalPages = Math.ceil(pagination.total / pagination.limit) || 1;
  
  // Fonction pour récupérer le statut de sync d'un projet
  const getSyncStatus = (projectId: string) => {
    return syncStatuses.find((s: any) => s.entityId === projectId && s.entityType === 'project');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "etude": return "bg-primary/10 text-primary";
      case "planification": return "bg-warning/10 text-warning";
      case "approvisionnement": return "bg-warning/20 text-warning";
      case "chantier": return "bg-success/10 text-success";
      case "sav": return "bg-secondary/20 text-secondary-foreground";
      default: return "bg-surface-muted text-on-surface";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "etude": return "Étude";
      case "planification": return "Planification";
      case "approvisionnement": return "Approvisionnement";
      case "chantier": return "Chantier";
      case "sav": return "SAV";
      default: return status;
    }
  };

  return (
    <>
      <Header 
        title="Gestion de Projets"
        breadcrumbs={[
          { label: "Accueil", href: "/" },
          { label: "Projets" }
        ]}
        actions={[
          {
            label: "Nouveau Projet",
            variant: "default",
            icon: "plus",
            onClick: () => setLocation('/projects/new')
          }
        ]}
      />
        
        <div className="px-6 py-6">
          <Tabs defaultValue="timeline" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="timeline" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Timeline
              </TabsTrigger>
              <TabsTrigger value="list" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Liste des Projets
              </TabsTrigger>
              <TabsTrigger value="kanban" className="flex items-center gap-2">
                <Kanban className="h-4 w-4" />
                Vue Kanban
              </TabsTrigger>
              <TabsTrigger value="workload" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Plan de Charge
              </TabsTrigger>
            </TabsList>

            <TabsContent value="timeline">
              <TimelineView />
            </TabsContent>

            <TabsContent value="list" className="space-y-6">
              {projectsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : projects.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground">Aucun projet trouvé.</p>
                  </CardContent>
                </Card>
              ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {projects.map((project: any) => (
                  <Card 
                    key={project.id} 
                    className="hover:shadow-card-hover transition-shadow"
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{project.name}</CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(project.status)}>
                            {getStatusLabel(project.status)}
                          </Badge>
                          <SyncStatusBadge
                            status={getSyncStatus(project.id)?.lastStatus}
                            lastSyncedAt={getSyncStatus(project.id)?.lastSyncedAt}
                            mondayId={getSyncStatus(project.id)?.mondayId}
                            conflictReason={getSyncStatus(project.id)?.conflictReason}
                          />
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setLocation(`/projects/${project.id}`)}
                            data-testid={`button-view-detail-${project.id}`}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Voir le détail
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center space-x-2 text-sm text-on-surface-muted">
                        <User className="w-4 h-4" />
                        <span>{project.client}</span>
                      </div>
                      
                      <div className="flex items-center space-x-2 text-sm text-on-surface-muted">
                        <MapPin className="w-4 h-4" />
                        <span>{project.location}</span>
                      </div>
                      
                      {project.budget && (
                        <div className="flex items-center space-x-2 text-sm text-on-surface-muted">
                          <Euro className="w-4 h-4" />
                          <span>{Number(project.budget).toLocaleString('fr-FR')} €</span>
                        </div>
                      )}
                      
                      {project.startDate && (
                        <div className="flex items-center space-x-2 text-sm text-on-surface-muted">
                          <Calendar className="w-4 h-4" />
                          <span>
                            Début: {format(new Date(project.startDate), 'dd MMM yyyy', { locale: fr })}
                          </span>
                        </div>
                      )}
                      
                      {project.endDate && (
                        <div className="flex items-center space-x-2 text-sm text-on-surface-muted">
                          <Calendar className="w-4 w-4" />
                          <span>
                            Fin: {format(new Date(project.endDate), 'dd MMM yyyy', { locale: fr })}
                          </span>
                        </div>
                      )}

                      {project.responsibleUser && (
                        <div className="flex items-center space-x-2 text-sm text-on-surface-muted">
                          <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                            <span className="text-xs font-medium text-white">
                              {`${project.responsibleUser.firstName?.[0] || ''}${project.responsibleUser.lastName?.[0] || ''}`}
                            </span>
                          </div>
                          <span>
                            {project.responsibleUser.firstName} {project.responsibleUser.lastName}
                          </span>
                        </div>
                      )}

                      {/* Section Monday.com - Nouveaux champs Phase 1 */}
                      <div className="flex items-center gap-2 text-sm text-muted-foreground" data-testid={`monday-info-${project.id}`}>
                        {project.geographicZone && (
                          <>
                            <MapPin className="h-4 w-4" />
                            <Badge variant="outline" data-testid={`badge-geographic-zone-${project.id}`}>
                              {project.geographicZone}
                            </Badge>
                          </>
                        )}
                        
                        {project.projectSubtype && (
                          <Badge variant="secondary" data-testid={`badge-project-subtype-${project.id}`}>
                            <Home className="h-4 w-4 mr-1" />
                            {project.projectSubtype}
                          </Badge>
                        )}
                        
                        {(project.buildingCount !== null && project.buildingCount !== undefined) && (
                          <span className="flex items-center gap-1" data-testid={`building-count-${project.id}`}>
                            <Home className="h-4 w-4" />
                            {project.buildingCount} bât.
                          </span>
                        )}
                      </div>

                      {project.mondayProjectId && (
                        <div className="flex items-center gap-2" data-testid={`monday-project-id-${project.id}`}>
                          <ExternalLink className="h-3 w-3 text-muted-foreground" />
                          <Badge variant="outline" className="text-xs">
                            ID: {project.mondayProjectId}
                          </Badge>
                        </div>
                      )}

                      <div className="pt-2">
                        <Progress value={project.status === 'sav' ? 100 : 
                          project.status === 'chantier' ? 80 :
                          project.status === 'approvisionnement' ? 60 :
                          project.status === 'planification' ? 40 : 20} 
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Contrôles de pagination */}
              {pagination.total > limit && (
                <div className="flex items-center justify-between mt-6 pt-6 border-t">
                  <div className="text-sm text-muted-foreground" data-testid="text-page-info">
                    Page {page} sur {totalPages} • Affichage {((page - 1) * limit) + 1}-{Math.min(page * limit, pagination.total)} sur {pagination.total} projets
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                      data-testid="button-pagination-previous"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Précédent
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page + 1)}
                      disabled={page >= totalPages}
                      data-testid="button-pagination-next"
                    >
                      Suivant
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
              )}
            </TabsContent>

            <TabsContent value="kanban" className="space-y-6">
              <KanbanBoard />
            </TabsContent>

            <TabsContent value="workload" className="space-y-6">
              <WorkloadPlanner />
            </TabsContent>
          </Tabs>
        </div>
    </>
  );
}
