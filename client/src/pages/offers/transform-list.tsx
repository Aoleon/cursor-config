import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ArrowRight, Eye, FolderOpen, CheckCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function TransformList() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Mutation pour transformer un AO en projet
  const transformToProjectMutation = useMutation({
    mutationFn: async (aoId: string) => {
      const response = await apiRequest(
        "POST",
        `/api/aos/${aoId}/transform-to-project`,
        {
          transformedBy: "current-user",
          transformedAt: new Date()
        }
      );
      return response.json();
    },
    onSuccess: (data, aoId) => {
      // Invalider les queries reliées
      queryClient.invalidateQueries({ queryKey: ["/api/aos", "transform"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/aos"] });
      
      toast({
        title: "AO transformé en projet",
        description: "Le projet a été créé avec succès et les tâches de base ajoutées",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur de transformation",
        description: error instanceof Error ? error.message : "Erreur inconnue",
        variant: "destructive",
      });
    }
  });

  // Récupérer les AOs prêts à transformer (statut finalise)
  const { data: offers = [], isLoading, error } = useQuery({
    queryKey: ["/api/aos", "transform"],
    queryFn: async () => {
      console.log("🔍 Chargement des AOs prêts à transformer...");
      try {
        const response = await fetch("/api/aos?status=finalise");
        if (!response.ok) {
          throw new Error(`Erreur HTTP ${response.status}: ${response.statusText}`);
        }
        const result = await response.json();
        // L'API retourne { success: true, data: [...] }
        const data = Array.isArray(result) ? result : (result?.data || []);
        console.log("✅ Données reçues:", data?.length, "AOs à transformer");
        return data;
      } catch (err) {
        console.error("❌ Erreur lors de la récupération des AOs:", err);
        throw err;
      }
    },
    retry: 1,
    staleTime: 30000,
  });

  // Récupérer les projets pour vérifier lesquels sont déjà transformés
  const { data: projects = [] } = useQuery({
    queryKey: ["/api/projects"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/projects");
        if (!response.ok) {
          throw new Error(`Erreur HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
      } catch (err) {
        console.error("❌ Erreur lors de la récupération des projets:", err);
        return [];
      }
    },
  });

  // Fonction pour vérifier si une offre est déjà transformée
  const isTransformed = (offerId: string) => {
    return projects.some((project: any) => project.offerId === offerId);
  };

  // Fonction pour obtenir le badge de statut
  const getStatusBadge = (status: string, offerId: string) => {
    if (isTransformed(offerId)) {
      return (
        <Badge variant="default" className="text-success">
          <CheckCircle className="h-3 w-3 mr-1" />
          Transformée
        </Badge>
      );
    }
    
    const statusMap = {
      'finalise': { label: 'Finalisée', variant: 'default' as const, color: 'text-primary' },
      'en_cours_chiffrage': { label: 'En chiffrage', variant: 'secondary' as const, color: 'text-orange-600' },
    };
    const statusInfo = statusMap[status as keyof typeof statusMap] || { 
      label: status, 
      variant: 'outline' as const, 
      color: 'text-on-surface-muted'
    };
    
    return (
      <Badge variant={statusInfo.variant} className={statusInfo.color}>
        {statusInfo.label}
      </Badge>
    );
  };

  // Fonction utilitaire pour formater les dates
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString('fr-FR');
    } catch {
      return '-';
    }
  };

  // Calcul des statistiques
  const stats = {
    total: offers.length,
    finalisees: offers.filter((offer: any) => offer.status === 'finalise').length,
    transformees: offers.filter((offer: any) => isTransformed(offer.id)).length,
    restantes: offers.filter((offer: any) => !isTransformed(offer.id)).length,
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p>Chargement des offres à transformer...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 p-6">
        <div className="text-center py-8 text-error">
          <AlertTriangle className="h-12 w-12 mx-auto mb-2" />
          <p className="font-semibold">Erreur lors du chargement</p>
          <p className="text-sm text-on-surface-muted mt-1">
            {error instanceof Error ? error.message : "Erreur inconnue"}
          </p>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-3"
            onClick={() => window.location.reload()}
          >
            Réessayer
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Transformation en Projets</h1>
          <p className="text-muted-foreground">
            Offres validées prêtes à transformer en projets
          </p>
        </div>
      </div>

      {/* Cartes de statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {stats.total}
            </div>
            <p className="text-xs text-muted-foreground">Offres candidates</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Finalisées</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {stats.finalisees}
            </div>
            <p className="text-xs text-muted-foreground">Validées BE</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Restantes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.restantes}
            </div>
            <p className="text-xs text-muted-foreground">À transformer</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Transformées</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {stats.transformees}
            </div>
            <p className="text-xs text-muted-foreground">En projets</p>
          </CardContent>
        </Card>
      </div>

      {/* Liste des offres */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Offres éligibles</h2>
        
        {offers.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <ArrowRight className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune offre à transformer</h3>
              <p className="text-gray-600 mb-4">
                Les offres doivent d'abord être validées par le Bureau d'Études.
              </p>
              <Button variant="outline" onClick={() => window.location.href = "/offers"}>
                Voir toutes les offres
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {offers.map((offer: any) => {
              const transformed = isTransformed(offer.id);
              
              return (
                <Card key={offer.id} className={`hover:shadow-md transition-shadow ${transformed ? 'bg-green-50 border-green-200' : ''}`} data-testid={`card-offer-${offer.id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <FolderOpen className="h-5 w-5 text-gray-400" />
                          {offer.reference || offer.id}
                          {transformed && <CheckCircle className="h-4 w-4 text-green-600" />}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {offer.client || 'Client non renseigné'}
                        </CardDescription>
                      </div>
                      {getStatusBadge(offer.status, offer.id)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="font-medium text-gray-600">Localisation</p>
                        <p>{offer.location || '-'}</p>
                      </div>
                      
                      <div>
                        <p className="font-medium text-gray-600">Description</p>
                        <p className="text-gray-900">
                          {offer.description || 'Description non renseignée'}
                        </p>
                      </div>
                      
                      <div>
                        <p className="font-medium text-gray-600">Montant final</p>
                        <p>
                          {offer.finalAmount ? 
                            new Intl.NumberFormat('fr-FR', { 
                              style: 'currency', 
                              currency: 'EUR' 
                            }).format(offer.finalAmount) : 
                            '-'
                          }
                        </p>
                      </div>
                      
                      <div>
                        <p className="font-medium text-gray-600">Validation BE</p>
                        <p>{formatDate(offer.finEtudesValidatedAt)}</p>
                      </div>
                    </div>

                    {/* Informations de transformation */}
                    {transformed && (
                      <div className="mt-4 pt-4 border-t bg-green-100 p-3 rounded">
                        <p className="text-sm text-green-700">
                          ✅ Offre déjà transformée en projet
                        </p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => window.location.href = `/offers/${offer.id}`}
                        data-testid={`button-view-offer-${offer.id}`}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Voir détails
                      </Button>
                      
                      {transformed ? (
                        <Button 
                          size="sm"
                          onClick={() => {
                            const project = projects.find((p: any) => p.offerId === offer.id);
                            if (project) {
                              window.location.href = `/projects/${project.id}`;
                            }
                          }}
                          data-testid={`button-view-project-${offer.id}`}
                        >
                          <FolderOpen className="h-4 w-4 mr-2" />
                          Voir projet
                        </Button>
                      ) : (
                        <Button 
                          size="sm"
                          onClick={() => transformToProjectMutation.mutate(offer.id)}
                          disabled={transformToProjectMutation.isPending}
                          data-testid={`button-transform-${offer.id}`}
                        >
                          <ArrowRight className="h-4 w-4 mr-2" />
                          {transformToProjectMutation.isPending ? 'Transformation...' : 'Transformer en projet'}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}