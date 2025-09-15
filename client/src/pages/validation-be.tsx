import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { 
  CheckCircle,
  XCircle,
  Eye,
  FileText,
  User,
  Calendar,
  Euro,
  AlertTriangle,
  Clock
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

// Fonction utilitaire pour formater les dates de façon sécurisée
const formatSafeDate = (dateValue: string | null | undefined, formatStr: string = 'dd/MM/yyyy à HH:mm') => {
  if (!dateValue) return 'Non défini';
  
  const date = new Date(dateValue);
  
  if (isNaN(date.getTime())) {
    console.warn('Date invalide détectée:', dateValue);
    return 'Date invalide';
  }
  
  return format(date, formatStr, { locale: fr });
};

export default function ValidationBE() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Récupérer les offres en attente de validation BE
  const { data: offers, isLoading, error } = useQuery({
    queryKey: ["/api/offers", "validation"],
    queryFn: async () => {
      console.log("🔍 Chargement des offres en attente de validation BE...");
      try {
        const response = await fetch("/api/offers?status=en_attente_validation");
        if (!response.ok) {
          throw new Error(`Erreur HTTP ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        console.log("✅ Données reçues:", data?.length, "offres en attente de validation");
        return data || [];
      } catch (err) {
        console.error("❌ Erreur lors de la récupération des offres:", err);
        throw err;
      }
    },
    retry: 1,
    staleTime: 30000,
  });

  // Mutation pour valider une offre
  const validateOfferMutation = useMutation({
    mutationFn: async ({ offerId, approved }: { offerId: string; approved: boolean }) => {
      console.log(`${approved ? '✅' : '❌'} Validation de l'offre:`, offerId);
      const response = await fetch(`/api/offers/${offerId}/validate`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          approved,
          status: approved ? "validee" : "rejetee",
          validatedAt: new Date().toISOString()
        })
      });
      
      if (!response.ok) {
        throw new Error(`Erreur HTTP ${response.status}: ${response.statusText}`);
      }
      
      return response.json();
    },
    onSuccess: (_, { approved }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/offers", "validation"] });
      queryClient.invalidateQueries({ queryKey: ["/api/offers"] });
      toast({
        title: approved ? "Offre validée" : "Offre rejetée",
        description: approved 
          ? "L'offre peut maintenant passer à l'étape suivante" 
          : "L'offre a été rejetée et nécessite une révision",
      });
    },
    onError: (error: any) => {
      console.error("❌ Erreur lors de la validation:", error);
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la validation",
        variant: "destructive",
      });
    }
  });

  const handleValidateOffer = (offerId: string, approved: boolean) => {
    if (confirm(`Êtes-vous sûr de vouloir ${approved ? 'valider' : 'rejeter'} cette offre ?`)) {
      validateOfferMutation.mutate({ offerId, approved });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "en_attente_validation": return "bg-warning/10 text-warning";
      case "validee": return "bg-success/10 text-success";
      case "rejetee": return "bg-error/10 text-error";
      default: return "bg-surface-muted text-on-surface-muted";
    }
  };

  const getPriorityColor = (isPriority: boolean) => {
    return isPriority ? "bg-error/10 text-error" : "bg-primary/10 text-primary";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex bg-surface">
        <Sidebar />
        <main className="flex-1">
          <Header 
            title="Validation Bureau d'Études"
            breadcrumbs={[
              { label: "Tableau de bord", href: "/dashboard" },
              { label: "Validation BE", href: "/offers/validation" }
            ]}
          />
          <div className="px-6 py-6">
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p>Chargement des offres en attente de validation...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex bg-surface">
        <Sidebar />
        <main className="flex-1">
          <Header 
            title="Validation Bureau d'Études"
            breadcrumbs={[
              { label: "Tableau de bord", href: "/dashboard" },
              { label: "Validation BE", href: "/offers/validation" }
            ]}
          />
          <div className="px-6 py-6">
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
                onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/offers", "validation"] })}
              >
                Réessayer
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-surface">
      <Sidebar />
      <main className="flex-1">
        <Header 
          title="Validation Bureau d'Études"
          breadcrumbs={[
            { label: "Tableau de bord", href: "/dashboard" },
            { label: "Validation BE", href: "/offers/validation" }
          ]}
        />
        
        <div className="px-6 py-6">
          {/* Statistiques */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">En attente</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-warning">{offers?.length || 0}</div>
                <p className="text-xs text-muted-foreground">Offres à valider</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Prioritaires</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-error">
                  {offers?.filter((offer: any) => offer.isPriority).length || 0}
                </div>
                <p className="text-xs text-muted-foreground">Urgentes</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Volume total</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {offers?.reduce((sum: number, offer: any) => sum + (parseFloat(offer.montantEstime) || 0), 0).toLocaleString('fr-FR')} €
                </div>
                <p className="text-xs text-muted-foreground">À valider</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Délai moyen</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">2.5j</div>
                <p className="text-xs text-muted-foreground">Temps de validation</p>
              </CardContent>
            </Card>
          </div>

          {/* Liste des offres */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Offres en attente de validation Bureau d'Études</span>
                <Badge variant="secondary">{offers?.length || 0} offres</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {offers?.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="h-16 w-16 mx-auto mb-4 text-success opacity-50" />
                  <h3 className="text-lg font-semibold mb-2 text-on-surface">
                    Aucune offre en attente de validation
                  </h3>
                  <p className="text-on-surface-muted mb-4">
                    Toutes les offres ont été traitées par le Bureau d'Études.
                  </p>
                  <p className="text-sm text-on-surface-muted">
                    Les nouvelles offres nécessitant une validation apparaîtront ici.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {offers?.map((offer: any) => (
                    <div 
                      key={offer.id} 
                      className="border rounded-lg p-4 hover:bg-surface transition-colors"
                      data-testid={`validation-offer-${offer.id}`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-lg">{offer.reference}</h3>
                            {offer.isPriority && (
                              <Badge className={getPriorityColor(offer.isPriority)}>
                                Prioritaire
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-on-surface-muted">{offer.client}</p>
                          <p className="text-sm text-on-surface-muted">{offer.intituleOperation}</p>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline" className={getStatusColor(offer.status)}>
                            En attente de validation
                          </Badge>
                          {offer.deadline && (
                            <p className="text-xs text-on-surface-muted mt-1">
                              Échéance: {formatSafeDate(offer.deadline, 'dd/MM/yyyy')}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Informations détaillées */}
                      <div className="grid grid-cols-4 gap-4 mb-3 bg-surface p-3 rounded">
                        <div>
                          <p className="text-xs text-on-surface-muted">Montant estimé</p>
                          <p className="font-semibold">
                            {offer.montantEstime ? parseFloat(offer.montantEstime).toLocaleString('fr-FR') : '-'} €
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-on-surface-muted">Type menuiserie</p>
                          <p className="font-semibold capitalize">{offer.menuiserieType || '-'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-on-surface-muted">Responsable BE</p>
                          <p className="font-semibold">
                            {offer.responsibleUser ? 
                              `${offer.responsibleUser.firstName} ${offer.responsibleUser.lastName}` 
                              : 'Non assigné'
                            }
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-on-surface-muted">Créé le</p>
                          <p className="font-semibold">
                            {formatSafeDate(offer.createdAt, 'dd/MM/yyyy')}
                          </p>
                        </div>
                      </div>

                      {/* Actions de validation */}
                      <div className="flex gap-2 justify-end">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => window.location.href = `/offers/${offer.id}`}
                          data-testid={`button-view-offer-${offer.id}`}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Voir détails
                        </Button>
                        
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleValidateOffer(offer.id, false)}
                          disabled={validateOfferMutation.isPending}
                          data-testid={`button-reject-offer-${offer.id}`}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Rejeter
                        </Button>
                        
                        <Button 
                          size="sm"
                          onClick={() => handleValidateOffer(offer.id, true)}
                          disabled={validateOfferMutation.isPending}
                          data-testid={`button-validate-offer-${offer.id}`}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Valider
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}