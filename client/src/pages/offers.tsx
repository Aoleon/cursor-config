import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { FileText, Search, Calendar, MapPin, Building, Plus } from "lucide-react";

export default function Offers() {
  const [_, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("tous");

  const { data: aos = [], isLoading } = useQuery({
    queryKey: ["/api/aos", search, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter !== "tous") params.append('status', statusFilter);
      const queryString = params.toString();
      const response = await fetch(`/api/aos${queryString ? `?${queryString}` : ''}`);
      if (!response.ok) throw new Error('Failed to fetch AOs');
      return response.json();
    },
  });

  const handleAoClick = (aoId: string) => {
    setLocation(`/offers/${aoId}/edit`);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      nouveau: { color: "bg-blue-100 text-blue-800", label: "Nouveau" },
      en_cours: { color: "bg-yellow-100 text-yellow-800", label: "En cours" },
      fini: { color: "bg-green-100 text-green-800", label: "Terminé" },
      archive: { color: "bg-gray-100 text-gray-800", label: "Archivé" },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || 
                  { color: "bg-gray-100 text-gray-800", label: status };

    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    );
  };

  const getMenuiserieTypeBadge = (type: string) => {
    const typeConfig = {
      fenetre: { color: "bg-blue-100 text-blue-800", label: "Fenêtre" },
      porte: { color: "bg-green-100 text-green-800", label: "Porte" },
      portail: { color: "bg-purple-100 text-purple-800", label: "Portail" },
      volet: { color: "bg-orange-100 text-orange-800", label: "Volet" },
      cloison: { color: "bg-yellow-100 text-yellow-800", label: "Cloison" },
      verriere: { color: "bg-indigo-100 text-indigo-800", label: "Verrière" },
      autre: { color: "bg-gray-100 text-gray-800", label: "Autre" },
    };

    const config = typeConfig[type as keyof typeof typeConfig] || 
                  { color: "bg-gray-100 text-gray-800", label: type };

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
      <div className="min-h-screen flex bg-gray-50">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <Header 
            title="Appels d'Offres"
            breadcrumbs={[
              { label: "Accueil", href: "/" },
              { label: "Appels d'Offres" }
            ]}
          />
          <div className="px-6 py-6">
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-gray-500">Chargement des appels d'offres...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Header 
          title="Appels d'Offres"
          breadcrumbs={[
            { label: "Accueil", href: "/" },
            { label: "Appels d'Offres" }
          ]}
          actions={[
            {
              label: "Nouvel AO",
              variant: "default",
              icon: "plus",
              onClick: () => setLocation("/create-ao")
            }
          ]}
        />
        
        <div className="px-6 py-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Liste des Appels d'Offres ({aos.length})</span>
              </CardTitle>
              
              {/* Filtres */}
              <div className="flex flex-col sm:flex-row gap-4 mt-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Rechercher par référence, client, localisation..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-10"
                      data-testid="input-search-aos"
                    />
                  </div>
                </div>
                
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-48" data-testid="select-status-filter">
                    <SelectValue placeholder="Filtrer par statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tous">Tous les statuts</SelectItem>
                    <SelectItem value="nouveau">Nouveau</SelectItem>
                    <SelectItem value="en_cours">En cours</SelectItem>
                    <SelectItem value="fini">Terminé</SelectItem>
                    <SelectItem value="archive">Archivé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            
            <CardContent>
              {aos.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Aucun appel d'offres trouvé
                  </h3>
                  <p className="text-gray-500 mb-4">
                    {search || statusFilter !== "tous" 
                      ? "Aucun AO ne correspond aux critères de recherche"
                      : "Commencez par créer votre premier appel d'offres"
                    }
                  </p>
                  <Button 
                    onClick={() => setLocation("/create-ao")}
                    data-testid="button-create-first-ao"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Créer un AO
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4">
                  {aos.map((ao: any) => (
                    <Card 
                      key={ao.id} 
                      className="cursor-pointer transition-all hover:shadow-md hover:border-primary/20 border-2 border-transparent"
                      onClick={() => handleAoClick(ao.id)}
                      data-testid={`ao-item-${ao.id}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            {/* En-tête */}
                            <div className="flex items-center space-x-3 mb-3">
                              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                                <FileText className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-gray-900 text-lg">
                                  {ao.reference}
                                </h3>
                                <p className="text-sm text-gray-500">
                                  Créé le {formatDate(ao.createdAt)}
                                </p>
                              </div>
                            </div>

                            {/* Informations principales */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                              <div className="flex items-center space-x-2">
                                <Building className="h-4 w-4 text-gray-400" />
                                <div>
                                  <p className="text-sm font-medium text-gray-900">
                                    {ao.client}
                                  </p>
                                  <p className="text-xs text-gray-500">Client</p>
                                </div>
                              </div>
                              
                              <div className="flex items-center space-x-2">
                                <MapPin className="h-4 w-4 text-gray-400" />
                                <div>
                                  <p className="text-sm font-medium text-gray-900">
                                    {ao.location}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    Dép. {ao.departement}
                                  </p>
                                </div>
                              </div>
                              
                              <div className="flex items-center space-x-2">
                                <Calendar className="h-4 w-4 text-gray-400" />
                                <div>
                                  <p className="text-sm font-medium text-gray-900">
                                    {formatDate(ao.dateLimiteRemise)}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    Date limite remise
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Intitulé de l'opération si présent */}
                            {ao.intituleOperation && (
                              <p className="text-sm text-gray-700 mb-3 italic">
                                "{ao.intituleOperation}"
                              </p>
                            )}

                            {/* Badges et montant */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                {getStatusBadge(ao.status)}
                                {getMenuiserieTypeBadge(ao.menuiserieType)}
                              </div>
                              
                              {ao.montantEstime && (
                                <div className="text-right">
                                  <p className="text-lg font-semibold text-gray-900">
                                    {Number(ao.montantEstime).toLocaleString('fr-FR')} €
                                  </p>
                                  <p className="text-xs text-gray-500">Montant estimé</p>
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
        </div>
      </main>
    </div>
  );
}
