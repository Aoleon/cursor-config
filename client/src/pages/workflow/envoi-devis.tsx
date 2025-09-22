import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/layout/header";
import { 
  Send,
  Mail,
  Clock,
  CheckCircle,
  FileText,
  Eye,
  Download,
  Calendar,
  Phone,
  MessageSquare
} from "lucide-react";

export default function EnvoiDevis() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedAO, setSelectedAO] = useState<any>(null);
  const [showSendModal, setShowSendModal] = useState(false);

  // Récupérer les AOs avec devis prêts
  const { data: aos, isLoading } = useQuery({
    queryKey: ["/api/aos/devis-ready"],
    queryFn: async () => {
      const response = await fetch("/api/aos?status=devis_pret");
      return response.json();
    }
  });

  // Mutation pour envoyer le devis
  const sendDevisMutation = useMutation({
    mutationFn: async ({ aoId, method }: { aoId: string; method: string }) => {
      const response = await fetch(`/api/aos/${aoId}/send-devis`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          method,
          sentAt: new Date(),
          status: "devis_envoye"
        })
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/aos"] });
      toast({
        title: "Devis envoyé",
        description: "Le devis a été envoyé au client avec succès",
      });
      setShowSendModal(false);
    }
  });

  // Mutation pour relancer un client
  const relancerClientMutation = useMutation({
    mutationFn: async (aoId: string) => {
      const response = await fetch(`/api/aos/${aoId}/relance`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          relanceDate: new Date()
        })
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Relance envoyée",
        description: "Le client a été relancé",
      });
    }
  });

  const getActionButtons = (ao: any) => {
    const actions = [];

    // Visualiser le devis
    actions.push(
      <Button 
        key="view"
        variant="outline" 
        size="sm"
        onClick={() => handleViewDevis(ao.id)}
      >
        <Eye className="h-4 w-4 mr-2" />
        Visualiser
      </Button>
    );

    // Télécharger le devis
    actions.push(
      <Button 
        key="download"
        variant="outline" 
        size="sm"
        onClick={() => handleDownloadDevis(ao.id)}
      >
        <Download className="h-4 w-4 mr-2" />
        Télécharger
      </Button>
    );

    if (!ao.devisSent) {
      // Envoyer le devis
      actions.push(
        <Button 
          key="send"
          size="sm"
          onClick={() => handleSendDevis(ao)}
        >
          <Send className="h-4 w-4 mr-2" />
          Envoyer le devis
        </Button>
      );
    } else {
      // Relancer si pas de réponse depuis plus de 7 jours
      const daysSinceSent = Math.floor(
        (Date.now() - new Date(ao.sentAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysSinceSent >= 7 && !ao.clientResponse) {
        actions.push(
          <Button 
            key="relance"
            variant="outline"
            size="sm"
            onClick={() => relancerClientMutation.mutate(ao.id)}
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Relancer ({ao.relanceCount || 0})
          </Button>
        );
      }

      // Marquer comme signé si accepté
      if (ao.clientAccepted) {
        actions.push(
          <Button 
            key="convert"
            size="sm"
            className="bg-success hover:bg-success/90"
            onClick={() => handleConvertToProject(ao.id)}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Transformer en projet
          </Button>
        );
      }
    }

    return actions;
  };

  const handleSendDevis = (ao: any) => {
    setSelectedAO(ao);
    setShowSendModal(true);
  };

  const handleViewDevis = (aoId: string) => {
    window.open(`/api/aos/${aoId}/devis/preview`, '_blank');
  };

  const handleDownloadDevis = (aoId: string) => {
    window.location.href = `/api/aos/${aoId}/devis/download`;
  };

  const handleConvertToProject = (aoId: string) => {
    window.location.href = `/aos/${aoId}/convert-to-project`;
  };

  const getStatusBadge = (ao: any) => {
    if (ao.clientAccepted) {
      return <Badge className="bg-success text-success-foreground">Accepté</Badge>;
    }
    if (ao.clientRefused) {
      return <Badge variant="destructive">Refusé</Badge>;
    }
    if (ao.devisSent) {
      return <Badge variant="secondary">Envoyé</Badge>;
    }
    return <Badge>En attente</Badge>;
  };

  return (
    <>
      <Header 
        title="Envoi des Devis"
        breadcrumbs={[
          { label: "Tableau de bord", href: "/dashboard" },
          { label: "Envoi devis", href: "/workflow/envoi-devis" }
        ]}
        />
        
        <div className="px-6 py-6">
          {/* Statistiques */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">À envoyer</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {aos?.filter((ao: any) => !ao.devisSent).length || 0}
                </div>
                <p className="text-xs text-muted-foreground">Devis prêts</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">En attente</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {aos?.filter((ao: any) => ao.devisSent && !ao.clientResponse).length || 0}
                </div>
                <p className="text-xs text-muted-foreground">Réponse client</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Acceptés</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {aos?.filter((ao: any) => ao.clientAccepted).length || 0}
                </div>
                <p className="text-xs text-muted-foreground">À transformer</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Taux conversion</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">42%</div>
                <p className="text-xs text-muted-foreground">Devis signés</p>
              </CardContent>
            </Card>
          </div>

          {/* Liste des devis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Gestion des devis</span>
                <Badge variant="secondary">{aos?.length || 0} devis</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">Chargement...</div>
              ) : aos?.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Aucun devis prêt à envoyer
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
                          {getStatusBadge(ao)}
                          <p className="text-sm font-semibold mt-1">
                            {ao.montantTotal?.toLocaleString('fr-FR')} € HT
                          </p>
                        </div>
                      </div>

                      {/* Informations de suivi */}
                      <div className="grid grid-cols-3 gap-4 mb-3 text-sm">
                        {ao.devisSent && (
                          <>
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 mr-1 text-gray-500" />
                              <span>Envoyé le {new Date(ao.sentAt).toLocaleDateString('fr-FR')}</span>
                            </div>
                            <div className="flex items-center">
                              <Clock className="h-4 w-4 mr-1 text-gray-500" />
                              <span>{Math.floor((Date.now() - new Date(ao.sentAt).getTime()) / (1000 * 60 * 60 * 24))} jours</span>
                            </div>
                            {ao.relanceCount > 0 && (
                              <div className="flex items-center">
                                <MessageSquare className="h-4 w-4 mr-1 text-gray-500" />
                                <span>{ao.relanceCount} relances</span>
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      {/* Contact client */}
                      {ao.contactEmail && (
                        <div className="flex items-center gap-4 mb-3 text-sm bg-gray-50 p-2 rounded">
                          <div className="flex items-center">
                            <Mail className="h-4 w-4 mr-1 text-gray-500" />
                            <span>{ao.contactEmail}</span>
                          </div>
                          {ao.contactPhone && (
                            <div className="flex items-center">
                              <Phone className="h-4 w-4 mr-1 text-gray-500" />
                              <span>{ao.contactPhone}</span>
                            </div>
                          )}
                        </div>
                      )}

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

        {/* Modal d'envoi */}
        {showSendModal && selectedAO && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-96">
              <h3 className="text-lg font-semibold mb-4">Envoyer le devis</h3>
              <div className="space-y-4">
                <div>
                  <Label>Méthode d'envoi</Label>
                  <div className="space-y-2 mt-2">
                    <Button
                      className="w-full justify-start"
                      variant="outline"
                      onClick={() => {
                        sendDevisMutation.mutate({ 
                          aoId: selectedAO.id, 
                          method: 'email' 
                        });
                      }}
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Par email
                    </Button>
                    <Button
                      className="w-full justify-start"
                      variant="outline"
                      onClick={() => {
                        sendDevisMutation.mutate({ 
                          aoId: selectedAO.id, 
                          method: 'platform' 
                        });
                      }}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Via plateforme
                    </Button>
                    <Button
                      className="w-full justify-start"
                      variant="outline"
                      onClick={() => {
                        sendDevisMutation.mutate({ 
                          aoId: selectedAO.id, 
                          method: 'manual' 
                        });
                      }}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Envoi manuel (marqué comme envoyé)
                    </Button>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <Button 
                  variant="outline" 
                  onClick={() => setShowSendModal(false)}
                >
                  Annuler
                </Button>
              </div>
            </div>
          </div>
        )}
    </>
  );
}