import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { 
  Calculator, 
  FileText,
  Send,
  Edit,
  Euro,
  CheckCircle,
  AlertTriangle,
  Download,
  Eye
} from "lucide-react";

export default function Chiffrage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Récupérer les offres en chiffrage
  const { data: offers, isLoading } = useQuery({
    queryKey: ["/api/offers", "chiffrage"],
    queryFn: async () => {
      const response = await fetch("/api/offers?status=en_cours_chiffrage");
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des offres');
      }
      return response.json();
    }
  });

  // Mutation pour valider le chiffrage
  const validateChiffrageMutation = useMutation({
    mutationFn: async (offerId: string) => {
      const response = await fetch(`/api/offers/${offerId}/validate-chiffrage`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          status: "en_attente_validation",
          dpgfGenerated: true,
          validatedAt: new Date()
        })
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/offers", "chiffrage"] });
      toast({
        title: "Chiffrage validé",
        description: "Le devis peut être envoyé au client",
      });
    }
  });

  const getActionButtons = (offer: any) => {
    const actions = [];

    // Actions de base toujours disponibles
    actions.push(
      <Button 
        key="calculator"
        variant="outline" 
        size="sm"
        onClick={() => handleOpenCalculator(offer.id)}
      >
        <Calculator className="h-4 w-4 mr-2" />
        Module chiffrage
      </Button>
    );

    if (offer.dpgfDocument) {
      actions.push(
        <Button 
          key="view-dpgf"
          variant="outline" 
          size="sm"
          onClick={() => handleViewDPGF(offer.id)}
        >
          <Eye className="h-4 w-4 mr-2" />
          Voir DPGF
        </Button>
      );

      actions.push(
        <Button 
          key="download-dpgf"
          variant="outline" 
          size="sm"
          onClick={() => handleDownloadDPGF(offer.id)}
        >
          <Download className="h-4 w-4 mr-2" />
          Télécharger
        </Button>
      );
    }

    // Conditions pour envoyer le devis - basé sur le statut de l'offre
    const canSendQuote = offer.status === 'en_cours_chiffrage' && offer.montantEstime && offer.dpgfDocument;

    if (canSendQuote) {
      actions.push(
        <Button 
          key="send"
          size="sm"
          onClick={() => validateChiffrageMutation.mutate(offer.id)}
        >
          <Send className="h-4 w-4 mr-2" />
          Valider le chiffrage
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
          <AlertTriangle className="h-4 w-4 mr-2" />
          Chiffrage incomplet
        </Button>
      );
    }

    return actions;
  };

  const handleOpenCalculator = (offerId: string) => {
    window.location.href = `/offers/${offerId}/chiffrage`;
  };

  const handleViewDPGF = (offerId: string) => {
    window.open(`/api/offers/${offerId}/dpgf/preview`, '_blank');
  };

  const handleDownloadDPGF = (offerId: string) => {
    window.location.href = `/api/offers/${offerId}/dpgf/download`;
  };

  const getMarginColor = (margin: number) => {
    if (margin < 10) return "text-red-600";
    if (margin < 15) return "text-orange-600";
    return "text-green-600";
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />
      
      <main className="flex-1">
        <Header 
          title="Chiffrage"
          breadcrumbs={[
            { label: "Tableau de bord", href: "/dashboard" },
            { label: "Chiffrage", href: "/workflow/chiffrage" }
          ]}
        />
        
        <div className="px-6 py-6">
          {/* Statistiques */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">En cours</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{offers?.length || 0}</div>
                <p className="text-xs text-muted-foreground">Chiffrages actifs</p>
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
                <p className="text-xs text-muted-foreground">Montant cumulé</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Marge moyenne</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">15.2%</div>
                <p className="text-xs text-muted-foreground">Sur les devis</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">À valider</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {offers?.filter((offer: any) => offer.dpgfDocument && offer.montantEstime).length || 0}
                </div>
                <p className="text-xs text-muted-foreground">Devis prêts</p>
              </CardContent>
            </Card>
          </div>

          {/* Liste des offres en chiffrage */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Offres en phase de chiffrage</span>
                <Badge variant="secondary">{offers?.length || 0} offres</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">Chargement...</div>
              ) : offers?.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Aucune offre en chiffrage actuellement
                </div>
              ) : (
                <div className="space-y-4">
                  {offers?.map((offer: any) => (
                    <div 
                      key={offer.id} 
                      className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-semibold text-lg">{offer.reference}</h3>
                          <p className="text-sm text-gray-600">{offer.client}</p>
                          <p className="text-sm text-gray-500">{offer.intituleOperation}</p>
                        </div>
                        <div className="text-right">
                          {offer.deadline && (
                            <Badge variant="outline" className="mb-1">
                              Échéance: {new Date(offer.deadline).toLocaleDateString('fr-FR')}
                            </Badge>
                          )}
                          <p className="text-sm text-gray-500">
                            Status: {offer.status}
                          </p>
                        </div>
                      </div>

                      {/* Informations financières */}
                      <div className="grid grid-cols-4 gap-4 mb-3 bg-gray-50 p-3 rounded">
                        <div>
                          <p className="text-xs text-gray-500">Montant estimé</p>
                          <p className="font-semibold">
                            {offer.montantEstime ? parseFloat(offer.montantEstime).toLocaleString('fr-FR') : '-'} €
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Prorata éventuel</p>
                          <p className="font-semibold">
                            {offer.prorataEventuel ? parseFloat(offer.prorataEventuel).toLocaleString('fr-FR') : '-'} €
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Heures BE</p>
                          <p className="font-semibold">
                            {offer.beHoursEstimated ? parseFloat(offer.beHoursEstimated) : '-'} h
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Statut</p>
                          <p className="font-semibold text-blue-600">
                            {offer.status === 'en_cours_chiffrage' ? 'En cours' : offer.status}
                          </p>
                        </div>
                      </div>

                      {/* Indicateurs de progression */}
                      <div className="flex items-center gap-4 mb-3">
                        <div className="flex items-center">
                          <Euro className={`h-4 w-4 mr-1 ${offer.montantEstime ? 'text-green-600' : 'text-gray-400'}`} />
                          <span className="text-sm">Montant estimé</span>
                        </div>
                        <div className="flex items-center">
                          <FileText className={`h-4 w-4 mr-1 ${offer.dpgfDocument ? 'text-green-600' : 'text-gray-400'}`} />
                          <span className="text-sm">DPGF généré</span>
                        </div>
                        <div className="flex items-center">
                          <CheckCircle className={`h-4 w-4 mr-1 ${offer.beHoursEstimated ? 'text-green-600' : 'text-gray-400'}`} />
                          <span className="text-sm">Heures BE estimées</span>
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
      </main>
    </div>
  );
}