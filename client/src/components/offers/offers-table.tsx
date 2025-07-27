import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Eye, Edit, Star, Search, Clock, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import CreateOfferModal from "./create-offer-modal";

interface OffersTableProps {
  showCreateButton: boolean;
}

export default function OffersTable({ showCreateButton }: OffersTableProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("tous");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { toast } = useToast();

  const { data: offers = [], isLoading, error } = useQuery({
    queryKey: ["/api/offers", search, statusFilter === "tous" ? "" : statusFilter],
  });

  const prioritizeMutation = useMutation({
    mutationFn: async ({ id, isPriority }: { id: string; isPriority: boolean }) => {
      await apiRequest("PATCH", `/api/offers/${id}`, { isPriority });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/offers"] });
      toast({
        title: "Succès",
        description: "Priorité mise à jour avec succès",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour la priorité",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (error && isUnauthorizedError(error as Error)) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [error, toast]);

  useEffect(() => {
    const handleCreateOffer = () => {
      setIsCreateModalOpen(true);
    };

    window.addEventListener("create-offer", handleCreateOffer);
    return () => window.removeEventListener("create-offer", handleCreateOffer);
  }, []);

  const getStatusBadge = (status: string, isPriority: boolean) => {
    if (isPriority) {
      return (
        <Badge className="bg-red-100 text-red-800">
          <Star className="w-3 h-3 mr-1" />
          Prioritaire
        </Badge>
      );
    }

    switch (status) {
      case "nouveau":
        return (
          <Badge className="bg-gray-100 text-gray-800">
            Nouveau
          </Badge>
        );
      case "en_chiffrage":
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3 mr-1" />
            En chiffrage
          </Badge>
        );
      case "en_validation":
        return (
          <Badge className="bg-orange-100 text-orange-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            En validation
          </Badge>
        );
      case "valide":
        return (
          <Badge className="bg-green-100 text-green-800">
            Validé
          </Badge>
        );
      case "perdu":
        return (
          <Badge className="bg-red-100 text-red-800">
            Perdu
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getMenuiserieTypeBadge = (type: string) => {
    const typeColors = {
      fenetres_pvc: "bg-blue-100 text-blue-800",
      fenetres_aluminium: "bg-gray-100 text-gray-800",
      mur_rideau: "bg-green-100 text-green-800",
      portes_bois: "bg-purple-100 text-purple-800",
      portes_alu: "bg-orange-100 text-orange-800",
      bardage: "bg-yellow-100 text-yellow-800",
    };

    const typeLabels = {
      fenetres_pvc: "Fenêtres PVC",
      fenetres_aluminium: "Fenêtres Alu",
      mur_rideau: "Mur-rideau Alu",
      portes_bois: "Portes Bois",
      portes_alu: "Portes Alu",
      bardage: "Bardage",
    };

    return (
      <Badge className={typeColors[type as keyof typeof typeColors] || "bg-gray-100 text-gray-800"}>
        {typeLabels[type as keyof typeof typeLabels] || type}
      </Badge>
    );
  };

  const handlePrioritize = (offer: any) => {
    prioritizeMutation.mutate({
      id: offer.id,
      isPriority: !offer.isPriority,
    });
  };

  return (
    <>
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-medium text-gray-900">
              Liste des Dossiers d'Offre
            </CardTitle>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Rechercher..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-64 pl-10"
                />
                <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Tous les statuts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tous">Tous les statuts</SelectItem>
                  <SelectItem value="nouveau">Nouveau</SelectItem>
                  <SelectItem value="en_chiffrage">En chiffrage</SelectItem>
                  <SelectItem value="en_validation">En validation</SelectItem>
                  <SelectItem value="valide">Validé</SelectItem>
                  <SelectItem value="perdu">Perdu</SelectItem>
                  <SelectItem value="prioritaire">Prioritaire</SelectItem>
                </SelectContent>
              </Select>
              {showCreateButton && (
                <Button onClick={() => setIsCreateModalOpen(true)}>
                  Nouveau Dossier
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : offers.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-gray-500">Aucun dossier d'offre trouvé.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dossier</TableHead>
                    <TableHead>Client / Projet</TableHead>
                    <TableHead>Type Menuiserie</TableHead>
                    <TableHead>Montant Estimé</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Responsable BE</TableHead>
                    <TableHead>Échéance</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {offers.map((offer: any) => (
                    <TableRow key={offer.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 bg-primary-light rounded-full flex items-center justify-center">
                              <span className="text-xs font-medium text-primary">
                                {offer.reference.split('-').pop()}
                              </span>
                            </div>
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">
                              {offer.reference}
                            </div>
                            <div className="text-sm text-gray-500">
                              Créé le {format(new Date(offer.createdAt), 'dd/MM/yyyy', { locale: fr })}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium text-gray-900">{offer.client}</div>
                        <div className="text-sm text-gray-500">{offer.location}</div>
                      </TableCell>
                      <TableCell>
                        {getMenuiserieTypeBadge(offer.menuiserieType)}
                      </TableCell>
                      <TableCell className="text-sm text-gray-900">
                        €{" "}
                        {offer.estimatedAmount
                          ? Number(offer.estimatedAmount).toLocaleString("fr-FR")
                          : "N/A"}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(offer.status, offer.isPriority)}
                      </TableCell>
                      <TableCell>
                        {offer.responsibleUser ? (
                          <div className="flex items-center">
                            <Avatar className="w-6 h-6 mr-2">
                              <AvatarImage 
                                src={offer.responsibleUser.profileImageUrl} 
                                alt={`${offer.responsibleUser.firstName} ${offer.responsibleUser.lastName}`} 
                              />
                              <AvatarFallback className="text-xs">
                                {`${offer.responsibleUser.firstName?.[0] || ''}${offer.responsibleUser.lastName?.[0] || ''}`}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm text-gray-900">
                              {offer.responsibleUser.firstName} {offer.responsibleUser.lastName}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">Non assigné</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-gray-900">
                        {offer.deadline
                          ? format(new Date(offer.deadline), 'dd/MM/yyyy', { locale: fr })
                          : "N/A"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button variant="ghost" size="sm" className="text-primary hover:text-primary-dark">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-accent hover:text-orange-700">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className={offer.isPriority ? "text-red-600 hover:text-red-700" : "text-success hover:text-green-700"}
                            onClick={() => handlePrioritize(offer)}
                            disabled={prioritizeMutation.isPending}
                          >
                            <Star className={`w-4 h-4 ${offer.isPriority ? 'fill-current' : ''}`} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          {offers.length > 0 && (
            <div className="px-6 py-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  Affichage de <span className="font-medium">1</span> à{" "}
                  <span className="font-medium">{offers.length}</span> sur{" "}
                  <span className="font-medium">{offers.length}</span> résultats
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" disabled>
                    Précédent
                  </Button>
                  <Button variant="outline" size="sm" className="bg-primary text-white">
                    1
                  </Button>
                  <Button variant="outline" size="sm" disabled>
                    Suivant
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <CreateOfferModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
      />
    </>
  );
}
