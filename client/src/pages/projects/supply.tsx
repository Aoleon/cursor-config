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
  Package, 
  Truck, 
  CheckCircle, 
  Clock, 
  ArrowRight, 
  Calendar, 
  MapPin, 
  User, 
  Euro,
  AlertTriangle,
  FileText,
  ShoppingCart,
  Eye,
  Phone,
  Mail
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { Project } from "@shared/schema";

export default function ProjectSupply() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedProject, setSelectedProject] = useState<string | null>(null);

  // Récupérer les projets en phase d'approvisionnement
  const { data: supplyProjects = [], isLoading, error } = useQuery<Project[]>({
    queryKey: ["/api/projects", { status: "approvisionnement" }],
    queryFn: async () => {
      const response = await fetch("/api/projects?status=approvisionnement");
      if (!response.ok) throw new Error("Failed to fetch supply projects");
      const result = await response.json();
      // L'API retourne { success: true, data: [...] }
      return Array.isArray(result) ? result : (result?.data || []);
    },
  });

  // Récupérer les demandes fournisseurs pour les projets
  const { data: supplierRequests = [] } = useQuery({
    queryKey: ["/api/supplier-requests"],
    queryFn: async () => {
      const response = await fetch("/api/supplier-requests");
      if (!response.ok) throw new Error("Failed to fetch supplier requests");
      return response.json();
    },
  });

  // Mutation pour progresser vers la phase chantier
  const progressToWorksiteMutation = useMutation({
    mutationFn: async (projectId: string) => {
      return await apiRequest(`/api/projects/${projectId}/update-status`, 'POST', {
        status: 'chantier',
        validation: {
          phase: 'approvisionnement',
          validatedBy: 'current_user',
          validatedAt: new Date().toISOString(),
          comments: 'Approvisionnement terminé, matériaux livrés'
        }
      });
    },
    onSuccess: (data, projectId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Approvisionnement Terminé",
        description: "Le projet passe maintenant en phase chantier.",
      });
      setSelectedProject(null);
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de progresser vers le chantier. Veuillez réessayer.",
        variant: "destructive",
      });
    },
  });

  const getSupplyProgress = (project: Project) => {
    // Calculer le progrès basé sur les commandes et livraisons
    let progress = 40; // Base pour être en phase approvisionnement
    
    const projectRequests = supplierRequests.filter((req: any) => req.projectId === project.id);
    const totalRequests = projectRequests.length;
    
    if (totalRequests > 0) {
      const completedRequests = projectRequests.filter((req: any) => req.status === 'delivered').length;
      const pendingRequests = projectRequests.filter((req: any) => req.status === 'ordered').length;
      
      progress += (completedRequests / totalRequests) * 50;
      progress += (pendingRequests / totalRequests) * 10;
    }
    
    return Math.min(progress, 95);
  };

  const getDeliveryUrgency = (project: Project) => {
    if (!project.startDate) return 'normal';
    
    const startDate = new Date(project.startDate);
    const now = new Date();
    const daysDiff = (startDate.getTime() - now.getTime()) / (1000 * 3600 * 24);
    
    if (daysDiff < 7) return 'urgent';
    if (daysDiff < 14) return 'warning';
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

  const getProjectSupplierRequests = (projectId: string) => {
    return supplierRequests.filter((req: any) => req.projectId === projectId);
  };

  const getSupplierRequestsStatus = (requests: any[]) => {
    if (requests.length === 0) return 'none';
    
    const delivered = requests.filter(r => r.status === 'delivered').length;
    const total = requests.length;
    
    if (delivered === total) return 'completed';
    if (delivered > 0) return 'partial';
    return 'pending';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'partial': return 'bg-yellow-100 text-yellow-800';
      case 'pending': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Livré';
      case 'partial': return 'Partiel';
      case 'pending': return 'En attente';
      default: return 'Aucune';
    }
  };

  return (
    <>
        <Header
          title="Projets - Approvisionnement"
          breadcrumbs={[
            { label: "Accueil", href: "/" },
            { label: "Projets", href: "/projects" },
            { label: "Approvisionnement" }
          ]}
          actions={[
            {
              label: "Demandes Fournisseurs",
              variant: "outline",
              icon: "truck",
              onClick: () => setLocation("/supplier-requests")
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
                <Package className="h-4 w-4" />
                Liste Approvisionnement
              </TabsTrigger>
              <TabsTrigger value="urgent" className="flex items-center gap-2" data-testid="tab-urgent">
                <AlertTriangle className="h-4 w-4" />
                Livraisons Urgentes
                {supplyProjects.filter(p => getDeliveryUrgency(p) === 'urgent').length > 0 && (
                  <Badge variant="destructive" className="ml-1">
                    {supplyProjects.filter(p => getDeliveryUrgency(p) === 'urgent').length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="ready" className="flex items-center gap-2" data-testid="tab-ready">
                <CheckCircle className="h-4 w-4" />
                Prêts pour Chantier
                {supplyProjects.filter(p => getSupplyProgress(p) >= 85).length > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {supplyProjects.filter(p => getSupplyProgress(p) >= 85).length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="orders" className="flex items-center gap-2" data-testid="tab-orders">
                <ShoppingCart className="h-4 w-4" />
                Commandes
              </TabsTrigger>
            </TabsList>

            <TabsContent value="list" className="space-y-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : supplyProjects.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">Aucun projet en phase d'approvisionnement.</p>
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
                  {supplyProjects.map((project) => {
                    const progress = getSupplyProgress(project);
                    const urgency = getDeliveryUrgency(project);
                    const requests = getProjectSupplierRequests(project.id);
                    const requestsStatus = getSupplierRequestsStatus(requests);
                    
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
                              <Badge className="bg-orange-100 text-orange-800">
                                Approvisionnement
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

                          {project.startDate && (
                            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                              <Calendar className="w-4 h-4" />
                              <span>
                                Début chantier: {format(new Date(project.startDate), 'dd MMM yyyy', { locale: fr })}
                              </span>
                            </div>
                          )}

                          <div className="p-3 bg-muted rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium">Commandes</span>
                              <Badge className={getStatusColor(requestsStatus)}>
                                {getStatusLabel(requestsStatus)}
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {requests.length} demande(s) fournisseur
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Avancement Approvisionnement</span>
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
                            
                            {progress >= 85 && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    className="flex-1"
                                    data-testid={`button-progress-${project.id}`}
                                  >
                                    <ArrowRight className="w-4 h-4 mr-1" />
                                    Chantier
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Débuter le Chantier</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      L'approvisionnement de "{project.name}" est terminé. 
                                      Voulez-vous passer le projet en phase chantier ?
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => progressToWorksiteMutation.mutate(project.id)}
                                      disabled={progressToWorksiteMutation.isPending}
                                      data-testid={`button-confirm-progress-${project.id}`}
                                    >
                                      {progressToWorksiteMutation.isPending ? (
                                        <>
                                          <Clock className="w-4 h-4 mr-2 animate-spin" />
                                          Progression...
                                        </>
                                      ) : (
                                        <>
                                          <ArrowRight className="w-4 h-4 mr-2" />
                                          Passer en Phase Chantier
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
                    Livraisons Urgentes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {supplyProjects.filter(p => getDeliveryUrgency(p) === 'urgent').length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Aucune livraison urgente.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {supplyProjects
                        .filter(p => getDeliveryUrgency(p) === 'urgent')
                        .map(project => {
                          const requests = getProjectSupplierRequests(project.id);
                          return (
                            <div
                              key={project.id}
                              className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50 cursor-default hover:bg-red-100 transition-colors"
                              data-testid={`urgent-project-${project.id}`}
                            >
                              <div>
                                <h4 className="font-medium text-red-900">{project.name}</h4>
                                <p className="text-sm text-red-700">{project.client} - {project.location}</p>
                                <p className="text-xs text-red-600">
                                  {requests.length} commande(s) - Début chantier proche
                                </p>
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
                          );
                        })}
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
                    Projets Prêts pour Chantier
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {supplyProjects.filter(p => getSupplyProgress(p) >= 85).length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Aucun projet prêt pour le chantier.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {supplyProjects
                        .filter(p => getSupplyProgress(p) >= 85)
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
                                Approvisionnement: {getSupplyProgress(project)}% - Matériaux livrés
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
                                  <Button size="sm" data-testid={`button-ready-progress-${project.id}`}>
                                    Débuter Chantier
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Débuter le Chantier</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Passer "{project.name}" en phase chantier ?
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => progressToWorksiteMutation.mutate(project.id)}
                                      disabled={progressToWorksiteMutation.isPending}
                                    >
                                      Débuter Chantier
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

            <TabsContent value="orders" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" />
                    Commandes et Livraisons
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {supplierRequests.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Aucune commande en cours.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {supplierRequests
                        .filter((req: any) => supplyProjects.some(p => p.id === req.projectId))
                        .map((request: any) => {
                          const project = supplyProjects.find(p => p.id === request.projectId);
                          return (
                            <div
                              key={request.id}
                              className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                              data-testid={`supplier-request-${request.id}`}
                            >
                              <div>
                                <h4 className="font-medium">{request.materialDescription || 'Matériel'}</h4>
                                <p className="text-sm text-muted-foreground">
                                  {project?.name} - {request.supplierName || 'Fournisseur'}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Quantité: {request.quantity} - Prix: {request.estimatedPrice}€
                                </p>
                              </div>
                              <div className="text-right">
                                <Badge className={getStatusColor(request.status)}>
                                  {request.status === 'delivered' ? 'Livré' :
                                   request.status === 'ordered' ? 'Commandé' : 
                                   request.status === 'quoted' ? 'Devisé' : 'En attente'}
                                </Badge>
                                {request.deliveryDate && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Livraison: {format(new Date(request.deliveryDate), 'dd/MM', { locale: fr })}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
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