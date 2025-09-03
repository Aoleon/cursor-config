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

  // Récupérer les AOs en chiffrage
  const { data: aos, isLoading } = useQuery({
    queryKey: ["/api/aos/chiffrage"],
    queryFn: async () => {
      const response = await fetch("/api/aos?status=chiffrage");
      return response.json();
    }
  });

  // Mutation pour valider le chiffrage
  const validateChiffrageMutation = useMutation({
    mutationFn: async (aoId: string) => {
      const response = await fetch(`/api/aos/${aoId}/validate-chiffrage`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          status: "devis_envoye",
          dpgfGenerated: true,
          validatedAt: new Date()
        })
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/aos"] });
      toast({
        title: "Chiffrage validé",
        description: "Le devis peut être envoyé au client",
      });
    }
  });

  const getActionButtons = (ao: any) => {
    const actions = [];

    // Actions de base toujours disponibles
    actions.push(
      <Button 
        key="calculator"
        variant="outline" 
        size="sm"
        onClick={() => handleOpenCalculator(ao.id)}
      >
        <Calculator className="h-4 w-4 mr-2" />
        Module chiffrage
      </Button>
    );

    if (ao.dpgfGenerated) {
      actions.push(
        <Button 
          key="view-dpgf"
          variant="outline" 
          size="sm"
          onClick={() => handleViewDPGF(ao.id)}
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
          onClick={() => handleDownloadDPGF(ao.id)}
        >
          <Download className="h-4 w-4 mr-2" />
          Télécharger
        </Button>
      );
    }

    // Conditions pour envoyer le devis
    const canSendQuote = 
      ao.totalCalculated && 
      ao.dpgfGenerated &&
      ao.marginValidated;

    if (canSendQuote) {
      actions.push(
        <Button 
          key="send"
          size="sm"
          onClick={() => validateChiffrageMutation.mutate(ao.id)}
        >
          <Send className="h-4 w-4 mr-2" />
          Envoyer le devis
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

  const handleOpenCalculator = (aoId: string) => {
    window.location.href = `/aos/${aoId}/chiffrage`;
  };

  const handleViewDPGF = (aoId: string) => {
    window.open(`/api/aos/${aoId}/dpgf/preview`, '_blank');
  };

  const handleDownloadDPGF = (aoId: string) => {
    window.location.href = `/api/aos/${aoId}/dpgf/download`;
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
                <div className="text-2xl font-bold">{aos?.length || 0}</div>
                <p className="text-xs text-muted-foreground">Chiffrages actifs</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Volume total</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {aos?.reduce((sum: number, ao: any) => sum + (ao.montantTotal || 0), 0).toLocaleString('fr-FR')} €
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
                <CardTitle className="text-sm font-medium">À envoyer</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {aos?.filter((ao: any) => ao.dpgfGenerated && !ao.sent).length || 0}
                </div>
                <p className="text-xs text-muted-foreground">Devis prêts</p>
              </CardContent>
            </Card>
          </div>

          {/* Liste des AOs en chiffrage */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Dossiers en phase de chiffrage</span>
                <Badge variant="secondary">{aos?.length || 0} dossiers</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">Chargement...</div>
              ) : aos?.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Aucun dossier en chiffrage actuellement
                </div>
              ) : (
                <div className="space-y-4">
                  {aos?.map((ao: any) => (
                    <div 
                      key={ao.id} 
                      className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-semibold text-lg">{ao.reference}</h3>
                          <p className="text-sm text-gray-600">{ao.client}</p>
                          <p className="text-sm text-gray-500">{ao.intituleOperation}</p>
                        </div>
                        <div className="text-right">
                          {ao.deadline && (
                            <Badge variant="outline" className="mb-1">
                              Échéance: {new Date(ao.deadline).toLocaleDateString('fr-FR')}
                            </Badge>
                          )}
                          <p className="text-sm text-gray-500">
                            {ao.lots?.length || 0} lots
                          </p>
                        </div>
                      </div>

                      {/* Informations financières */}
                      <div className="grid grid-cols-4 gap-4 mb-3 bg-gray-50 p-3 rounded">
                        <div>
                          <p className="text-xs text-gray-500">Coût matériaux</p>
                          <p className="font-semibold">
                            {ao.coutMateriaux?.toLocaleString('fr-FR') || '-'} €
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Main d'œuvre</p>
                          <p className="font-semibold">
                            {ao.coutMainOeuvre?.toLocaleString('fr-FR') || '-'} €
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Total HT</p>
                          <p className="font-semibold">
                            {ao.montantTotal?.toLocaleString('fr-FR') || '-'} €
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Marge</p>
                          <p className={`font-semibold ${getMarginColor(ao.margin || 0)}`}>
                            {ao.margin || '-'} %
                          </p>
                        </div>
                      </div>

                      {/* Indicateurs de progression */}
                      <div className="flex items-center gap-4 mb-3">
                        <div className="flex items-center">
                          <Euro className={`h-4 w-4 mr-1 ${ao.totalCalculated ? 'text-green-600' : 'text-gray-400'}`} />
                          <span className="text-sm">Montants calculés</span>
                        </div>
                        <div className="flex items-center">
                          <FileText className={`h-4 w-4 mr-1 ${ao.dpgfGenerated ? 'text-green-600' : 'text-gray-400'}`} />
                          <span className="text-sm">DPGF généré</span>
                        </div>
                        <div className="flex items-center">
                          <CheckCircle className={`h-4 w-4 mr-1 ${ao.marginValidated ? 'text-green-600' : 'text-gray-400'}`} />
                          <span className="text-sm">Marge validée</span>
                        </div>
                      </div>

                      {/* Actions contextuelles */}
                      <div className="flex gap-2 justify-end">
                        {getActionButtons(ao)}
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