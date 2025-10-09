import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/layout/header";
import { 
  FileText, 
  Calculator, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  ArrowRight,
  Wrench,
  FileSearch,
  Edit
} from "lucide-react";

export default function EtudeTechnique() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedOffer, setSelectedOffer] = useState<string | null>(null);

  // Récupérer les Offers en étude technique
  const { data: offers, isLoading, error } = useQuery({
    queryKey: ["/api/offers", { status: "etude_technique" }],
    queryFn: async () => {
      const response = await fetch("/api/offers?status=etude_technique");
      if (!response.ok) {
        throw new Error(`Erreur HTTP ${response.status}: ${response.statusText}`);
      }
      const result = await response.json();
      return Array.isArray(result) ? result : [];
    },
    retry: 1,
    staleTime: 30000,
  });

  // Mutation pour valider l'étude technique
  const validateEtudeMutation = useMutation({
    mutationFn: async (offerId: string) => {
      const response = await apiRequest(
        "POST",
        `/api/offers/${offerId}/request-suppliers`,
        { 
          status: "en_attente_fournisseurs",
          validatedBy: "current-user",
          validatedAt: new Date()
        }
      );
      return response.json();
    },
    onSuccess: (data, offerId) => {
      // Invalider les queries reliées
      queryClient.invalidateQueries({ queryKey: ["/api/offers", { status: "etude_technique" }] });
      queryClient.invalidateQueries({ queryKey: ["/api/offers", { status: "en_attente_fournisseurs" }] });
      queryClient.invalidateQueries({ queryKey: ["/api/offers"] });
      
      toast({
        title: "Étude technique validée",
        description: "Le dossier passe en demande de prix fournisseurs",
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

  const getActionButtons = (offer: any) => {
    const actions = [];

    // Actions toujours disponibles en étude
    actions.push(
      <Button 
        key="edit"
        variant="outline" 
        size="sm"
        onClick={() => handleEditOffer(offer.id)}
      >
        <Edit className="h-4 w-4 mr-2" />
        Modifier les détails techniques
      </Button>
    );

    actions.push(
      <Button 
        key="analyze"
        variant="outline" 
        size="sm"
        onClick={() => handleAnalyzeDocs(offer.id)}
      >
        <FileSearch className="h-4 w-4 mr-2" />
        Analyser CCTP/Plans
      </Button>
    );

    // Vérifier les conditions pour passer au chiffrage
    const canProceedToChiffrage = 
      offer.cctpAnalyzed && 
      offer.technicalDetailsComplete &&
      offer.lotsValidated;

    if (canProceedToChiffrage) {
      actions.push(
        <Button 
          key="validate"
          size="sm"
          onClick={() => validateEtudeMutation.mutate(offer.id)}
          disabled={validateEtudeMutation.isPending}
          data-testid={`button-validate-etude-${offer.id}`}
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          {validateEtudeMutation.isPending ? 'Validation...' : 'Valider et passer au chiffrage'}
        </Button>
      );
    } else {
      actions.push(
        <Button 
          key="incomplete"
          variant="secondary" 
          size="sm"
          disabled
        >
          <AlertCircle className="h-4 w-4 mr-2" />
          Étude incomplète
        </Button>
      );
    }

    return actions;
  };

  const handleEditOffer = (offerId: string) => {
    // Navigation vers la page d'édition avec les champs techniques débloqués
    window.location.href = `/offers/${offerId}/edit?mode=technical`;
  };

  const handleAnalyzeDocs = (offerId: string) => {
    // Ouvrir l'interface d'analyse des documents techniques
    setSelectedOffer(offerId);
    toast({
      title: "Analyse des documents",
      description: "Ouverture de l'interface d'analyse CCTP/Plans",
    });
  };

  return (
    <>
      <Header 
        title="Étude Technique"
        breadcrumbs={[
          { label: "Tableau de bord", href: "/dashboard" },
          { label: "Étude technique", href: "/workflow/etude-technique" }
        ]}
        />
        
        <div className="px-6 py-6">
          {/* Statistiques de l'étape */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">En étude</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{offers?.length || 0}</div>
                <p className="text-xs text-muted-foreground">Dossiers actifs</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">À analyser</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {offers?.filter((offer: any) => !offer.cctpAnalyzed).length || 0}
                </div>
                <p className="text-xs text-muted-foreground">Documents techniques</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Prêts à chiffrer</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {offers?.filter((offer: any) => offer.technicalDetailsComplete).length || 0}
                </div>
                <p className="text-xs text-muted-foreground">Études complètes</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Temps moyen</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">2.5</div>
                <p className="text-xs text-muted-foreground">Jours par étude</p>
              </CardContent>
            </Card>
          </div>

          {/* Liste des AOs en étude */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Dossiers en étude technique</span>
                <Badge variant="secondary">{offers?.length || 0} dossiers</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                  <p>Chargement des offres en étude technique...</p>
                </div>
              ) : error ? (
                <div className="text-center py-8 text-red-500">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                  <p className="font-semibold">Erreur lors du chargement</p>
                  <p className="text-sm mt-1">{error instanceof Error ? error.message : 'Erreur inconnue'}</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-3"
                    onClick={() => window.location.reload()}
                  >
                    Réessayer
                  </Button>
                </div>
              ) : offers?.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Aucun dossier en étude technique actuellement
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
                          <p className="text-sm text-gray-500">{offer.location}</p>
                        </div>
                        <div className="text-right">
                          <Badge variant={offer.priority === "urgent" ? "destructive" : "default"}>
                            {offer.priority === "urgent" ? "Urgent" : "Normal"}
                          </Badge>
                          <p className="text-sm text-gray-500 mt-1">
                            Depuis {offer.daysInStudy || 0} jours
                          </p>
                        </div>
                      </div>

                      {/* Indicateurs de progression */}
                      <div className="grid grid-cols-4 gap-2 mb-3">
                        <div className="flex items-center">
                          <FileText className={`h-4 w-4 mr-1 ${offer.cctpAnalyzed ? 'text-green-600' : 'text-gray-400'}`} />
                          <span className="text-sm">CCTP analysé</span>
                        </div>
                        <div className="flex items-center">
                          <Wrench className={`h-4 w-4 mr-1 ${offer.technicalDetailsComplete ? 'text-green-600' : 'text-gray-400'}`} />
                          <span className="text-sm">Détails techniques</span>
                        </div>
                        <div className="flex items-center">
                          <FileSearch className={`h-4 w-4 mr-1 ${offer.plansAnalyzed ? 'text-green-600' : 'text-gray-400'}`} />
                          <span className="text-sm">Plans analysés</span>
                        </div>
                        <div className="flex items-center">
                          <CheckCircle className={`h-4 w-4 mr-1 ${offer.lotsValidated ? 'text-green-600' : 'text-gray-400'}`} />
                          <span className="text-sm">Lots validés</span>
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
    </>
  );
}