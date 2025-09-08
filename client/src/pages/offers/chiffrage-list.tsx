import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Calculator, Eye, FolderOpen, Euro } from "lucide-react";

export default function ChiffrageList() {
  const { toast } = useToast();

  // Récupérer les offres en attente de chiffrage
  const { data: offers = [], isLoading, error } = useQuery({
    queryKey: ["/api/offers", "chiffrage"],
    queryFn: async () => {
      console.log("🔍 Chargement des offres en attente de chiffrage...");
      try {
        const response = await fetch("/api/offers?status=en_attente_chiffrage,brouillon");
        if (!response.ok) {
          throw new Error(`Erreur HTTP ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        console.log("✅ Données reçues:", data?.length, "offres à chiffrer");
        return data || [];
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
      'brouillon': { label: 'Brouillon', variant: 'secondary' as const, color: 'text-gray-600' },
      'en_attente_chiffrage': { label: 'À chiffrer', variant: 'default' as const, color: 'text-orange-600' },
    };
    const statusInfo = statusMap[status as keyof typeof statusMap] || { 
      label: status, 
      variant: 'outline' as const, 
      color: 'text-gray-600'
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
    brouillon: offers.filter((offer: any) => offer.status === 'brouillon').length,
    attente: offers.filter((offer: any) => offer.status === 'en_attente_chiffrage').length,
    montantTotal: offers.reduce((sum: number, offer: any) => sum + (offer.estimatedAmount || 0), 0),
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p>Chargement des offres à chiffrer...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 p-6">
        <div className="text-center py-8 text-red-500">
          <AlertTriangle className="h-12 w-12 mx-auto mb-2" />
          <p className="font-semibold">Erreur lors du chargement</p>
          <p className="text-sm text-gray-600 mt-1">
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
          <h1 className="text-2xl font-bold">Chiffrage des Offres</h1>
          <p className="text-muted-foreground">
            Liste des offres en attente de chiffrage détaillé
          </p>
        </div>
        <Button onClick={() => window.location.href = "/create-ao"}>
          <FolderOpen className="h-4 w-4 mr-2" />
          Nouvelle offre
        </Button>
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
            <p className="text-xs text-muted-foreground">Offres à traiter</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Brouillons</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">
              {stats.brouillon}
            </div>
            <p className="text-xs text-muted-foreground">À finaliser</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">En attente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {stats.attente}
            </div>
            <p className="text-xs text-muted-foreground">À chiffrer</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Montant estimé</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {new Intl.NumberFormat('fr-FR', { 
                style: 'currency', 
                currency: 'EUR',
                maximumFractionDigits: 0 
              }).format(stats.montantTotal)}
            </div>
            <p className="text-xs text-muted-foreground">Volume total</p>
          </CardContent>
        </Card>
      </div>

      {/* Liste des offres */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Offres à chiffrer</h2>
        
        {offers.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Calculator className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune offre à chiffrer</h3>
              <p className="text-gray-600 mb-4">
                Toutes les offres sont soit en cours de traitement, soit déjà chiffrées.
              </p>
              <Button variant="outline" onClick={() => window.location.href = "/offers"}>
                Voir toutes les offres
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {offers.map((offer: any) => (
              <Card key={offer.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <FolderOpen className="h-5 w-5 text-gray-400" />
                        {offer.reference || offer.id}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {offer.client || 'Client non renseigné'}
                      </CardDescription>
                    </div>
                    {getStatusBadge(offer.status)}
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
                      <p className="font-medium text-gray-600">Montant estimé</p>
                      <p className="flex items-center gap-1">
                        <Euro className="h-3 w-3" />
                        {offer.estimatedAmount ? 
                          new Intl.NumberFormat('fr-FR').format(offer.estimatedAmount) : 
                          '-'
                        }
                      </p>
                    </div>
                    
                    <div>
                      <p className="font-medium text-gray-600">Échéance</p>
                      <p>{formatDate(offer.deadlineDate)}</p>
                    </div>
                  </div>

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
                    
                    <Button 
                      size="sm"
                      onClick={() => window.location.href = `/offers/${offer.id}/chiffrage`}
                      data-testid={`button-chiffrage-${offer.id}`}
                    >
                      <Calculator className="h-4 w-4 mr-2" />
                      Chiffrer
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}