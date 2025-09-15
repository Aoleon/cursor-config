import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FileText, Search, Calendar, MapPin, Building, Plus, Star, Eye, Edit } from "lucide-react";

interface UnifiedOffersDisplayProps {
  showCreateButton?: boolean;
  title?: string;
  endpoint?: string; // Pour permettre différents endpoints
}

export default function UnifiedOffersDisplay({ 
  showCreateButton = false, 
  title = "Liste des Appels d'Offres",
  endpoint = "/api/aos" 
}: UnifiedOffersDisplayProps) {
  const [_, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("tous");
  const { toast } = useToast();

  const { data: offers = [], isLoading, isError, error } = useQuery({
    queryKey: [endpoint, search, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter !== "tous") params.append('status', statusFilter);
      const queryString = params.toString();
      const response = await fetch(`${endpoint}${queryString ? `?${queryString}` : ''}`);
      if (!response.ok) throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      const data = await response.json();
      
      // Gérer les différents formats de réponse
      if (data && typeof data === 'object' && 'data' in data) {
        // Format {success: true, data: [...]} pour /api/aos
        return Array.isArray(data.data) ? data.data : [];
      } else if (Array.isArray(data)) {
        // Format direct [...] pour /api/offers
        return data;
      } else {
        // Fallback pour tout autre format
        return [];
      }
    },
  });

  const prioritizeMutation = useMutation({
    mutationFn: async ({ id, isPriority }: { id: string; isPriority: boolean }) => {
      const response = await fetch(`${endpoint}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPriority }),
      });
      if (!response.ok) throw new Error('Failed to update priority');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [endpoint] });
      toast({
        title: "Succès",
        description: "Priorité mise à jour avec succès",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour la priorité",
        variant: "destructive",
      });
    },
  });

  const handleOfferClick = (offerId: string) => {
    // Naviguer vers la route appropriée selon l'endpoint
    if (endpoint === "/api/aos") {
      setLocation(`/aos/${offerId}`);
    } else {
      setLocation(`/offers/${offerId}/edit`);
    }
  };

  const handlePrioritize = (offer: any, e: React.MouseEvent) => {
    e.stopPropagation(); // Empêcher la navigation vers l'offre
    prioritizeMutation.mutate({
      id: offer.id,
      isPriority: !offer.isPriority,
    });
  };

  const getStatusBadge = (offer: any) => {
    // Si prioritaire, toujours afficher en rouge
    if (offer.isPriority) {
      return (
        <Badge className="bg-error/10 text-error">
          <Star className="w-3 h-3 mr-1" />
          Prioritaire
        </Badge>
      );
    }

    // Sinon afficher le statut normal
    const statusConfig = {
      nouveau: { color: "bg-primary/10 text-primary", label: "Nouveau" },
      brouillon: { color: "bg-surface-muted text-on-surface", label: "Brouillon" },
      en_cours: { color: "bg-warning/10 text-warning", label: "En cours" },
      en_cours_chiffrage: { color: "bg-warning/10 text-warning", label: "En cours chiffrage" },
      en_attente_validation: { color: "bg-warning/20 text-warning", label: "En attente validation" },
      fini: { color: "bg-success/10 text-success", label: "Terminé" },
      valide: { color: "bg-success/10 text-success", label: "Validé" },
      perdu: { color: "bg-error/10 text-error", label: "Perdu" },
      archive: { color: "bg-surface-muted text-on-surface", label: "Archivé" },
    };

    const config = statusConfig[offer.status as keyof typeof statusConfig] || 
                  { color: "bg-surface-muted text-on-surface", label: offer.status };

    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    );
  };

  const getMenuiserieTypeBadge = (type: string) => {
    const typeConfig = {
      fenetre: { color: "bg-primary/10 text-primary", label: "Fenêtre" },
      fenetres_pvc: { color: "bg-primary/10 text-primary", label: "Fenêtres PVC" },
      fenetres_aluminium: { color: "bg-surface-muted text-on-surface", label: "Fenêtres Alu" },
      porte: { color: "bg-success/10 text-success", label: "Porte" },
      portes_bois: { color: "bg-secondary/20 text-secondary-foreground", label: "Portes Bois" },
      portes_alu: { color: "bg-warning/10 text-warning", label: "Portes Alu" },
      portail: { color: "bg-secondary/20 text-secondary-foreground", label: "Portail" },
      volet: { color: "bg-warning/10 text-warning", label: "Volet" },
      cloison: { color: "bg-warning/10 text-warning", label: "Cloison" },
      verriere: { color: "bg-primary/20 text-primary", label: "Verrière" },
      mur_rideau: { color: "bg-success/10 text-success", label: "Mur-rideau" },
      bardage: { color: "bg-warning/10 text-warning", label: "Bardage" },
      autre: { color: "bg-surface-muted text-on-surface", label: "Autre" },
    };

    const config = typeConfig[type as keyof typeof typeConfig] || 
                  { color: "bg-surface-muted text-on-surface", label: type || "Non défini" };

    return (
      <Badge variant="outline" className={config.color}>
        {config.label}
      </Badge>
    );
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Non définie";
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  if (isLoading) {
    return (
      <Card data-testid="offers-loading">
        <CardContent className="p-6">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" data-testid="loading-spinner"></div>
            <p className="text-muted-foreground" data-testid="loading-message">Chargement des offres...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card data-testid="offers-error">
        <CardContent className="p-6">
          <div className="text-center py-8">
            <div className="text-error mb-4">⚠️</div>
            <p className="text-on-surface-muted mb-4" data-testid="error-message">
              Impossible de charger les offres.
              {error && ` (${(error as Error).message})`}
            </p>
            <Button 
              onClick={() => window.location.reload()}
              variant="outline"
              data-testid="button-reload-offers"
            >
              Réessayer
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="unified-offers-display">
      <CardHeader>
        <CardTitle className="flex items-center justify-between" data-testid="offers-header">
          <div className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span data-testid="offers-count">{title} ({offers.length})</span>
          </div>
          {showCreateButton && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={() => setLocation("/create-ao")} data-testid="button-create-ao-unified">
                    <Plus className="h-4 w-4 mr-2" />
                    Nouvel AO
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Créer un nouvel appel d'offres</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </CardTitle>
        
        {/* Filtres */}
        <div className="flex flex-col sm:flex-row gap-4 mt-4" data-testid="offers-filters">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par référence, client, localisation..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
                data-testid="input-search-unified"
              />
            </div>
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48" data-testid="select-status-filter-unified">
              <SelectValue placeholder="Filtrer par statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tous">Tous les statuts</SelectItem>
              <SelectItem value="nouveau">Nouveau</SelectItem>
              <SelectItem value="brouillon">Brouillon</SelectItem>
              <SelectItem value="en_cours">En cours</SelectItem>
              <SelectItem value="en_cours_chiffrage">En cours chiffrage</SelectItem>
              <SelectItem value="en_attente_validation">En attente validation</SelectItem>
              <SelectItem value="valide">Validé</SelectItem>
              <SelectItem value="fini">Terminé</SelectItem>
              <SelectItem value="perdu">Perdu</SelectItem>
              <SelectItem value="archive">Archivé</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      
      <CardContent>
        {offers.length === 0 ? (
          <div className="text-center py-12" data-testid="offers-empty-state">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-on-surface mb-2" data-testid="empty-title">
              Aucune offre trouvée
            </h3>
            <p className="text-muted-foreground mb-4" data-testid="empty-description">
              {search || statusFilter !== "tous" 
                ? "Aucune offre ne correspond aux critères de recherche"
                : "Commencez par créer votre première offre"
              }
            </p>
            {showCreateButton && (
              <Button 
                onClick={() => setLocation("/create-ao")}
                data-testid="button-create-first-unified"
              >
                <Plus className="h-4 w-4 mr-2" />
                Créer une offre
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-4" data-testid="offers-list">
            {offers.map((offer: any) => (
              <Card 
                key={offer.id} 
                className="cursor-pointer transition-all hover:shadow-md hover:border-primary/20 border-2 border-transparent"
                onClick={() => handleOfferClick(offer.id)}
                data-testid={`offer-item-${offer.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* En-tête */}
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-semibold text-on-surface text-lg">
                                {offer.reference}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                Créé le {formatDate(offer.createdAt)}
                              </p>
                            </div>
                            {/* Actions */}
                            <div className="flex items-center space-x-1">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (endpoint === "/api/aos") {
                                          setLocation(`/aos/${offer.id}`);
                                        } else {
                                          setLocation(`/offers/${offer.id}`);
                                        }
                                      }}
                                      data-testid={`button-view-${offer.id}`}
                                    >
                                      <Eye className="w-4 h-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Voir les détails de l'offre</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (endpoint === "/api/aos") {
                                          setLocation(`/aos/${offer.id}`);
                                        } else {
                                          setLocation(`/offers/${offer.id}/edit`);
                                        }
                                      }}
                                      data-testid={`button-edit-${offer.id}`}
                                    >
                                      <Edit className="w-4 h-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Modifier l'offre</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className={offer.isPriority ? "text-error hover:text-error" : "text-muted-foreground hover:text-warning"}
                                      onClick={(e) => handlePrioritize(offer, e)}
                                      disabled={prioritizeMutation.isPending}
                                      data-testid={`button-priority-${offer.id}`}
                                    >
                                      <Star className={`w-4 h-4 ${offer.isPriority ? 'fill-current' : ''}`} />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{offer.isPriority ? "Retirer la priorité" : "Marquer comme prioritaire"}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Informations principales */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="flex items-center space-x-2">
                          <Building className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium text-on-surface">
                              {offer.client}
                            </p>
                            <p className="text-xs text-muted-foreground">Client</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium text-on-surface">
                              {offer.location}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Dép. {offer.departement}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium text-on-surface">
                              {formatDate(offer.dateLimiteRemise || offer.deadline)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Date limite remise
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Intitulé de l'opération si présent */}
                      {offer.intituleOperation && (
                        <p className="text-sm text-on-surface-muted mb-3 italic">
                          "{offer.intituleOperation}"
                        </p>
                      )}

                      {/* Badges et montant */}
                      <div className="flex items-center justify-between">
                        <div className="flex flex-wrap items-center gap-2">
                          {getStatusBadge(offer)}
                          {getMenuiserieTypeBadge(offer.menuiserieType)}
                        </div>
                        
                        {(offer.montantEstime || offer.estimatedAmount) && (
                          <div className="text-right">
                            <p className="text-lg font-semibold text-on-surface">
                              {Number(offer.montantEstime || offer.estimatedAmount).toLocaleString('fr-FR')} €
                            </p>
                            <p className="text-xs text-muted-foreground">Montant estimé</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}