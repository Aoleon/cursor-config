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
  ArrowRight,
  ExternalLink,
  Eye
} from "lucide-react";

export default function SuppliersPending() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Récupérer les offres de chiffrage envoyées
  const { data: offers, isLoading, error } = useQuery({
    queryKey: ["/api/offers", "sent-quotes"],
    queryFn: async () => {
      console.log("🔍 Chargement des offres de chiffrage envoyées...");
      try {
        const response = await fetch("/api/offers?status=valide,signe,transforme_en_projet");
        if (!response.ok) {
          throw new Error(`Erreur HTTP ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        console.log("✅ Données reçues:", data?.length, "offres envoyées");
        return data || [];
      } catch (err) {
        console.error("❌ Erreur lors de la récupération des offres:", err);
        throw err;
      }
    },
    retry: 1,
    staleTime: 30000,
  });

  // Récupérer les projets associés
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

  // Fonction pour obtenir le projet associé à une offre
  const getAssociatedProject = (offerId: string) => {
    return projects.find((project: any) => project.offerId === offerId);
  };

  // Fonction pour obtenir le statut badge
  const getStatusBadge = (status: string) => {
    const statusMap = {
      'valide': { label: 'Validé', variant: 'default' as const, color: 'text-blue-600' },
      'signe': { label: 'Signé', variant: 'default' as const, color: 'text-green-600' },
      'transforme_en_projet': { label: 'En projet', variant: 'secondary' as const, color: 'text-purple-600' },
    };
    const statusInfo = statusMap[status as keyof typeof statusMap] || { label: status, variant: 'outline' as const, color: 'text-gray-600' };
    return (
      <Badge variant={statusInfo.variant} className={statusInfo.color}>
        {statusInfo.label}
      </Badge>
    );
  };

  const getActionButtons = (offer: any) => {
    const actions = [];
    const associatedProject = getAssociatedProject(offer.id);

    // Voir détails de l'offre
    actions.push(
      <Button 
        key="view-offer"
        variant="outline" 
        size="sm"
        onClick={() => window.location.href = `/offers/${offer.id}`}
      >
        <Eye className="h-4 w-4 mr-2" />
        Voir offre
      </Button>
    );

    // Accéder au projet si il existe
    if (associatedProject) {
      actions.push(
        <Button 
          key="view-project"
          size="sm"
          onClick={() => window.location.href = `/projects/${associatedProject.id}`}
          data-testid={`button-view-project-${associatedProject.id}`}
        >
          <ArrowRight className="h-4 w-4 mr-2" />
          Voir projet
        </Button>
      );
    }

    // Lien externe si l'offre est signée
    if (offer.status === 'signe') {
      actions.push(
        <Button 
          key="external"
          variant="outline" 
          size="sm"
          onClick={() => toast({
            title: "Accès externe",
            description: "Fonctionnalité à implémenter",
          })}
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Accès client
        </Button>
      );
    }

    return actions;
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

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p>Chargement des offres de chiffrage...</p>
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
            onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/offers", "sent-quotes"] })}
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
          <h1 className="text-2xl font-bold">Offres de Chiffrage Envoyées</h1>
          <p className="text-muted-foreground">
            Suivi des offres validées et leurs projets associés
          </p>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total envoyées</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{offers?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Offres validées</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Signées</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {offers?.filter((offer: any) => offer.status === 'signe').length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Clients acceptés</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">En projets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {offers?.filter((offer: any) => offer.status === 'transforme_en_projet').length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Projets actifs</p>
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
            <span>Offres de chiffrage envoyées</span>
            <Badge variant="secondary">{offers?.length || 0} offres</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {offers?.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Send className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Aucune offre de chiffrage envoyée actuellement</p>
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
                      {getStatusBadge(offer.status)}
                      <p className="text-sm text-gray-500 mt-1">
                        Montant: {offer.montantEstime ? parseFloat(offer.montantEstime).toLocaleString('fr-FR') : '-'} €
                      </p>
                    </div>
                  </div>

                  {/* Informations offre et projet */}
                  <div className="grid grid-cols-4 gap-4 mb-3 bg-gray-50 p-3 rounded">
                    <div>
                      <p className="text-xs text-gray-500">Date validation</p>
                      <p className="font-semibold" data-testid={`text-validation-date-${offer.id}`}>
                        {formatDate(offer.validatedAt)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Date envoi</p>
                      <p className="font-semibold">
                        {formatDate(offer.sentAt || offer.updatedAt)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Projet associé</p>
                      <p className="font-semibold">
                        {getAssociatedProject(offer.id) ? 'Oui' : 'Non'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Statut projet</p>
                      <p className="font-semibold text-purple-600">
                        {getAssociatedProject(offer.id)?.status || '-'}
                      </p>
                    </div>
                  </div>

                  {/* Projet associé */}
                  {getAssociatedProject(offer.id) && (
                    <div className="mb-3">
                      <p className="text-sm font-medium text-purple-600 mb-1">Projet associé :</p>
                      <div className="flex items-center gap-2 p-2 bg-purple-50 rounded">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{getAssociatedProject(offer.id)?.title || `Projet ${offer.reference}`}</p>
                          <p className="text-xs text-gray-600">
                            Statut: {getAssociatedProject(offer.id)?.status} • 
                            Démarrage: {formatDate(getAssociatedProject(offer.id)?.startDate)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Indicateurs de progression */}
                  <div className="flex items-center gap-4 mb-3">
                    <div className="flex items-center">
                      <CheckCircle className="h-4 w-4 mr-1 text-green-600" />
                      <span className="text-sm">Offre validée</span>
                    </div>
                    <div className="flex items-center">
                      <Send className={`h-4 w-4 mr-1 ${offer.status === 'signe' ? 'text-green-600' : 'text-gray-400'}`} />
                      <span className="text-sm">Envoyée client</span>
                    </div>
                    <div className="flex items-center">
                      <ArrowRight className={`h-4 w-4 mr-1 ${getAssociatedProject(offer.id) ? 'text-purple-600' : 'text-gray-400'}`} />
                      <span className="text-sm">Projet créé</span>
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