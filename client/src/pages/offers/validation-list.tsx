import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, Eye, FolderOpen, Clock } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function ValidationList() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Mutation pour valider les études d'une offre
  const validateStudiesMutation = useMutation({
    mutationFn: async (offerId: string) => {
      const response = await apiRequest(
        "POST",
        `/api/offers/${offerId}/validate-studies`,
        {
          validatedBy: "current-user",
          validatedAt: new Date()
        }
      );
      return response.json();
    },
    onSuccess: (data, offerId) => {
      // Invalider les queries reliées
      queryClient.invalidateQueries({ queryKey: ["/api/offers", { status: "en_attente_validation" }] });
      queryClient.invalidateQueries({ queryKey: ["/api/offers", { status: "fin_etudes_validee" }] });
      queryClient.invalidateQueries({ queryKey: ["/api/offers"] });
      
      toast({
        title: "Fin d'études validée",
        description: "L'offre peut maintenant être transformée en projet",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur de validation",
        description: error instanceof Error ? error.message : "Erreur inconnue",
        variant: "destructive",
      });
    }
  });

  // Récupérer les offres en attente de validation
  const { data: offers = [], isLoading, error } = useQuery({
    queryKey: ["/api/offers", { status: "en_attente_validation" }],
    queryFn: async () => {
      console.log("🔍 Chargement des offres en attente de validation...");
      try {
        // Récupérer uniquement les offres en statut "en_attente_validation"
        // Une offre doit passer explicitement de "en_cours_chiffrage" à "en_attente_validation"
        // quand le chiffrage est terminé et elle est prête pour validation
        const response = await fetch("/api/offers?status=en_attente_validation");
        const result = await response.json();
        
        // L'API retourne { success: true, data: [...] }
        const offersData = Array.isArray(result) ? result : (result?.data || []);
        
        console.log("✅ Données reçues:", {
          attenteValidation: offersData?.length || 0,
          total: offersData?.length || 0
        });
        return offersData;
      } catch (err) {
        console.error("❌ Erreur lors de la récupération des offres:", err);
        throw err;
      }
    },
    retry: 1,
    staleTime: 30000,
  });

  // Fonction pour obtenir le badge de statut
  const getStatusBadge = (status: string) => {
    const statusMap = {
      'en_attente_validation': { label: 'Prêt pour validation', variant: 'secondary' as const, color: 'text-orange-600' },
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
    // Toutes les offres sont en attente de validation puisque c'est le seul statut récupéré
    enAttenteValidation: offers.length,
    retard: offers.filter((offer: any) => {
      if (!offer.deadlineDate) return false;
      return new Date(offer.deadlineDate) < new Date();
    }).length,
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p>Chargement des offres en attente de bouclage...</p>
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
          <h1 className="text-2xl font-bold">Bouclage</h1>
          <p className="text-muted-foreground">
            Offres chiffrées en attente de bouclage (anciennement Validation BE)
          </p>
        </div>
      </div>

      {/* Cartes de statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">En attente validation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {stats.enAttenteValidation}
            </div>
            <p className="text-xs text-muted-foreground">Dossiers à valider</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">En retard</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats.retard}
            </div>
            <p className="text-xs text-muted-foreground">Échéance dépassée</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Prêts pour validation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.total}
            </div>
            <p className="text-xs text-muted-foreground">Chiffrage terminé</p>
          </CardContent>
        </Card>
      </div>

      {/* Liste des offres */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Offres en attente de validation</h2>
        
        {offers.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-on-surface mb-2">Aucune offre à valider</h3>
              <p className="text-on-surface-muted mb-4">
                Aucune offre n'est actuellement en attente de validation. Les offres en cours de chiffrage apparaîtront ici une fois le chiffrage terminé.
              </p>
              <Button variant="outline" onClick={() => window.location.href = "/offers"}>
                Voir toutes les offres
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {offers.map((offer: any) => {
              const isLate = offer.deadlineDate && new Date(offer.deadlineDate) < new Date();
              
              return (
                <Card key={offer.id} className={`hover:shadow-md transition-shadow ${isLate ? 'border-l-4 border-red-500' : ''}`}>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <FolderOpen className="h-5 w-5 text-gray-400" />
                          {offer.reference || offer.id}
                          {isLate && <Clock className="h-4 w-4 text-error" />}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {offer.client || 'Client non renseigné'}
                        </CardDescription>
                      </div>
                      <div className="flex flex-col gap-1 items-end">
                        {getStatusBadge(offer.status)}
                        {isLate && (
                          <Badge variant="destructive" className="text-xs">
                            En retard
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="font-medium text-on-surface-muted">Localisation</p>
                        <p>{offer.location || '-'}</p>
                      </div>
                      
                      <div>
                        <p className="font-medium text-on-surface-muted">Description</p>
                        <p className="text-on-surface">
                          {offer.description || 'Description non renseignée'}
                        </p>
                      </div>
                      
                      <div>
                        <p className="font-medium text-on-surface-muted">Montant chiffré</p>
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
                        <p className="font-medium text-on-surface-muted">Échéance</p>
                        <p className={isLate ? 'text-red-600 font-medium' : ''}>
                          {formatDate(offer.deadlineDate)}
                        </p>
                      </div>
                    </div>

                    {/* Informations de validation */}
                    {offer.finEtudesValidatedAt && (
                      <div className="mt-4 pt-4 border-t bg-green-50 p-3 rounded">
                        <p className="text-sm text-green-700">
                          ✅ Fin d'études validée le {formatDate(offer.finEtudesValidatedAt)}
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
                      
                      {offer.status === 'en_attente_validation' && !offer.finEtudesValidatedAt && (
                        <Button 
                          size="sm"
                          onClick={() => validateStudiesMutation.mutate(offer.id)}
                          disabled={validateStudiesMutation.isPending}
                          data-testid={`button-validate-${offer.id}`}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          {validateStudiesMutation.isPending ? 'Validation...' : 'Valider fin d\'études'}
                        </Button>
                      )}
                      
                      {offer.finEtudesValidatedAt && (
                        <Badge variant="outline" className="text-green-600">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Validée
                        </Badge>
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