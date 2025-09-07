import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Send, 
  CheckCircle, 
  AlertTriangle, 
  Clock,
  Euro,
  FileText,
  Calculator,
  ArrowRight 
} from "lucide-react";

export default function SuppliersPending() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Récupérer les offres en attente de fournisseurs
  const { data: offers, isLoading } = useQuery({
    queryKey: ["/api/offers", "suppliers-pending"],
    queryFn: async () => {
      const response = await fetch("/api/offers/suppliers-pending");
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des offres');
      }
      return response.json();
    }
  });

  // Mutation pour démarrer le chiffrage
  const startChiffrageMutation = useMutation({
    mutationFn: async (offerId: string) => {
      const response = await fetch(`/api/offers/${offerId}/start-chiffrage`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        }
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/offers", "suppliers-pending"] });
      toast({
        title: "Chiffrage démarré",
        description: "Le chiffrage peut maintenant être effectué avec les prix fournisseurs",
      });
    }
  });

  const getActionButtons = (offer: any) => {
    const actions = [];

    // Toujours afficher l'accès aux demandes fournisseurs
    actions.push(
      <Button 
        key="view-requests"
        variant="outline" 
        size="sm"
        onClick={() => window.location.href = `/offers/${offer.id}/suppliers`}
      >
        <FileText className="h-4 w-4 mr-2" />
        Voir demandes
      </Button>
    );

    // Possibilité de relancer
    actions.push(
      <Button 
        key="resend"
        variant="outline" 
        size="sm"
        onClick={() => handleResendRequests(offer.id)}
      >
        <Send className="h-4 w-4 mr-2" />
        Relancer
      </Button>
    );

    // Démarrer chiffrage si prix reçus
    if (offer.readyForChiffrage) {
      actions.push(
        <Button 
          key="start-chiffrage"
          size="sm"
          onClick={() => startChiffrageMutation.mutate(offer.id)}
          data-testid={`button-start-chiffrage-${offer.id}`}
        >
          <Calculator className="h-4 w-4 mr-2" />
          Démarrer chiffrage
        </Button>
      );
    } else {
      actions.push(
        <Button 
          key="waiting"
          variant="secondary" 
          size="sm"
          disabled
        >
          <Clock className="h-4 w-4 mr-2" />
          En attente prix
        </Button>
      );
    }

    return actions;
  };

  const handleResendRequests = (offerId: string) => {
    toast({
      title: "Relance envoyée",
      description: "Les fournisseurs ont été relancés pour leurs prix",
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="text-center py-8">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Demandes Fournisseurs</h1>
          <p className="text-muted-foreground">
            Suivi des demandes de prix nécessaires avant chiffrage
          </p>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">En attente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{offers?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Offres concernées</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Prêtes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {offers?.filter((offer: any) => offer.readyForChiffrage).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Prix reçus</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Délai moyen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {offers?.length ? Math.round(offers.reduce((sum: number, offer: any) => sum + offer.averageDelay, 0) / offers.length) : 0} j
            </div>
            <p className="text-xs text-muted-foreground">Réponse fournisseurs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Volume</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {offers?.reduce((sum: number, offer: any) => sum + (parseFloat(offer.montantEstime) || 0), 0).toLocaleString('fr-FR')} €
            </div>
            <p className="text-xs text-muted-foreground">Montant total</p>
          </CardContent>
        </Card>
      </div>

      {/* Liste des offres */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Offres en attente de prix fournisseurs</span>
            <Badge variant="secondary">{offers?.length || 0} offres</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {offers?.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Aucune offre en attente de fournisseurs actuellement
            </div>
          ) : (
            <div className="space-y-4">
              {offers?.map((offer: any) => (
                <div 
                  key={offer.id} 
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  data-testid={`card-offer-${offer.id}`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-lg">{offer.reference}</h3>
                      <p className="text-sm text-gray-600">{offer.client}</p>
                      <p className="text-sm text-gray-500">{offer.intituleOperation}</p>
                    </div>
                    <div className="text-right">
                      <Badge 
                        variant={offer.readyForChiffrage ? "default" : "outline"}
                        className="mb-1"
                      >
                        {offer.readyForChiffrage ? "Prêt pour chiffrage" : "En attente"}
                      </Badge>
                      <p className="text-sm text-gray-500">
                        Montant: {offer.montantEstime ? parseFloat(offer.montantEstime).toLocaleString('fr-FR') : '-'} €
                      </p>
                    </div>
                  </div>

                  {/* Informations demandes fournisseurs */}
                  <div className="grid grid-cols-4 gap-4 mb-3 bg-gray-50 p-3 rounded">
                    <div>
                      <p className="text-xs text-gray-500">Demandes envoyées</p>
                      <p className="font-semibold" data-testid={`text-requests-count-${offer.id}`}>
                        {offer.supplierRequestsCount || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Réponses reçues</p>
                      <p className="font-semibold">
                        {offer.supplierResponsesReceived || 0} / {offer.supplierRequestsCount || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Délai moyen</p>
                      <p className="font-semibold">
                        {offer.averageDelay || 0} jours
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Prix manquants</p>
                      <p className="font-semibold text-orange-600">
                        {offer.missingPrices?.length || 0}
                      </p>
                    </div>
                  </div>

                  {/* Prix manquants */}
                  {offer.missingPrices?.length > 0 && (
                    <div className="mb-3">
                      <p className="text-sm font-medium text-orange-600 mb-1">Prix manquants :</p>
                      <div className="flex gap-1 flex-wrap">
                        {offer.missingPrices.map((item: string, index: number) => (
                          <Badge key={index} variant="outline" className="text-orange-600">
                            {item}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Indicateurs de progression */}
                  <div className="flex items-center gap-4 mb-3">
                    <div className="flex items-center">
                      <Send className="h-4 w-4 mr-1 text-blue-600" />
                      <span className="text-sm">Demandes envoyées</span>
                    </div>
                    <div className="flex items-center">
                      <Euro className={`h-4 w-4 mr-1 ${offer.supplierResponsesReceived > 0 ? 'text-green-600' : 'text-gray-400'}`} />
                      <span className="text-sm">Prix reçus</span>
                    </div>
                    <div className="flex items-center">
                      <CheckCircle className={`h-4 w-4 mr-1 ${offer.readyForChiffrage ? 'text-green-600' : 'text-gray-400'}`} />
                      <span className="text-sm">Prêt chiffrage</span>
                    </div>
                  </div>

                  {/* Actions contextuelles */}
                  <div className="flex gap-2 justify-end">
                    {getActionButtons(offer)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}