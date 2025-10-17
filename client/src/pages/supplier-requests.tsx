import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Send, Clock, CheckCircle, Eye, Package } from "lucide-react";

interface SupplierRequest {
  id: string;
  offerId: string;
  offerReference?: string;
  supplierName: string;
  supplierEmail?: string;
  supplierPhone?: string;
  description?: string;
  status: string;
  requestedItems?: any[];
  createdAt: string;
  updatedAt?: string;
}

export default function SupplierRequests() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Récupérer toutes les demandes fournisseurs
  const { data: requests = [], isLoading, error } = useQuery({
    queryKey: ["/api/supplier-requests"],
    queryFn: async () => {
      console.log("🔍 Chargement des demandes fournisseurs...");
      try {
        const response = await fetch("/api/supplier-requests");
        if (!response.ok) {
          throw new Error(`Erreur HTTP ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        console.log("✅ Données reçues:", data?.length, "demandes fournisseurs");
        return data || [];
      } catch (err) {
        console.error("❌ Erreur lors de la récupération des demandes:", err);
        throw err;
      }
    },
    retry: 1,
    staleTime: 30000,
  });

  // Fonction pour obtenir le badge de statut
  const getStatusBadge = (status: string) => {
    const statusMap = {
      'envoyee': { label: 'Envoyée', variant: 'default' as const, color: 'text-primary', icon: Send },
      'en_attente': { label: 'En attente', variant: 'secondary' as const, color: 'text-warning', icon: Clock },
      'reponse_recue': { label: 'Réponse reçue', variant: 'default' as const, color: 'text-success', icon: CheckCircle },
      'terminee': { label: 'Terminée', variant: 'outline' as const, color: 'text-on-surface-muted', icon: CheckCircle },
    };
    const statusInfo = statusMap[status as keyof typeof statusMap] || { 
      label: status, 
      variant: 'outline' as const, 
      color: 'text-on-surface-muted',
      icon: Package
    };
    
    return (
      <Badge variant={statusInfo.variant} className={`${statusInfo.color} flex items-center gap-1`}>
        <statusInfo.icon className="h-3 w-3" />
        {statusInfo.label}
      </Badge>
    );
  };

  // Fonction utilitaire pour formater les dates
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric'
      });
    } catch {
      return '-';
    }
  };

  // Calcul des statistiques
  const stats = {
    total: requests.length,
    envoyees: requests.filter((req: SupplierRequest) => req.status === 'envoyee').length,
    enAttente: requests.filter((req: SupplierRequest) => req.status === 'en_attente').length,
    recues: requests.filter((req: SupplierRequest) => req.status === 'reponse_recue').length,
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p>Chargement des demandes fournisseurs...</p>
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
            onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/supplier-requests"] })}
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
          <h1 className="text-2xl font-bold">Demandes Fournisseurs</h1>
          <p className="text-muted-foreground">
            Suivi des demandes de prix envoyées aux fournisseurs
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
            <div className="text-2xl font-bold text-on-surface">
              {stats.total}
            </div>
            <p className="text-xs text-muted-foreground">Demandes totales</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Envoyées</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {stats.envoyees}
            </div>
            <p className="text-xs text-muted-foreground">Aux fournisseurs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">En attente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">
              {stats.enAttente}
            </div>
            <p className="text-xs text-muted-foreground">Réponses attendues</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Reçues</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {stats.recues}
            </div>
            <p className="text-xs text-muted-foreground">Réponses reçues</p>
          </CardContent>
        </Card>
      </div>

      {/* Liste des demandes */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Demandes en cours</h2>
        
        {requests.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-on-surface mb-2">Aucune demande fournisseur</h3>
              <p className="text-on-surface-muted mb-4">
                Les demandes de prix fournisseurs seront créées depuis les pages de chiffrage.
              </p>
              <Button variant="outline" onClick={() => window.location.href = "/offers"}>
                Accéder aux offres
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {requests.map((request: SupplierRequest) => (
              <Card key={request.id} className="hover:shadow-md transition-shadow" data-testid={`card-request-${request.id}`}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Package className="h-5 w-5 text-muted-foreground" />
                        {request.supplierName}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Offre: {request.offerReference || request.offerId}
                      </CardDescription>
                    </div>
                    {getStatusBadge(request.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="font-medium text-on-surface-muted">Contact</p>
                      <p>{request.supplierEmail || '-'}</p>
                      <p>{request.supplierPhone || '-'}</p>
                    </div>
                    
                    <div>
                      <p className="font-medium text-gray-600">Description</p>
                      <p className="text-gray-900">
                        {request.description || 'Demande de prix sur lots sélectionnés'}
                      </p>
                    </div>
                    
                    <div>
                      <p className="font-medium text-gray-600">Dates</p>
                      <p>Créée: {formatDate(request.createdAt)}</p>
                      {request.updatedAt && request.updatedAt !== request.createdAt && (
                        <p>Modifiée: {formatDate(request.updatedAt)}</p>
                      )}
                    </div>
                  </div>

                  {/* Lots demandés */}
                  {request.requestedItems && request.requestedItems.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="font-medium text-gray-600 mb-2">Lots concernés:</p>
                      <div className="flex flex-wrap gap-2">
                        {request.requestedItems.map((item: any, index: number) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {item.numero || `Lot ${index + 1}`}: {item.designation || 'Sans désignation'}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.location.href = `/offers/${request.offerId}`}
                      data-testid={`button-view-offer-${request.offerId}`}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Voir l'offre
                    </Button>
                    
                    {request.status === 'en_attente' && (
                      <Button 
                        size="sm"
                        onClick={() => {
                          toast({
                            title: "Relance fournisseur",
                            description: "Fonctionnalité à implémenter",
                          });
                        }}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Relancer
                      </Button>
                    )}
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