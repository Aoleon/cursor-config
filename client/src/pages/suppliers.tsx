import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Truck, Plus, Phone, Mail, MapPin, Clock, Star } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PhaseNavigation } from "@/components/navigation/phase-navigation";
import Header from "@/components/layout/header";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface SupplierRequest {
  id: string;
  offerId: string;
  supplierName: string;
  productCategory: string;
  requestDate: string;
  responseDate?: string;
  status: 'envoye' | 'en_attente' | 'recu' | 'refuse';
  description: string;
  urgency: 'normale' | 'haute' | 'critique';
  contactEmail?: string;
  contactPhone?: string;
  estimatedAmount?: string;
  notes?: string;
  offer?: {
    reference: string;
    client: string;
  };
}

interface NewSupplierRequest {
  offerId: string;
  supplierName: string;
  productCategory: string;
  description: string;
  urgency: string;
  contactEmail?: string;
  contactPhone?: string;
  estimatedAmount?: string;
  notes?: string;
}

export default function Suppliers() {
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch supplier requests
  const { data: supplierRequests = [], isLoading } = useQuery<SupplierRequest[]>({
    queryKey: ['/api/supplier-requests/'],
  });

  // Fetch offers for dropdown
  const { data: offers = [] } = useQuery({
    queryKey: ['/api/offers/'],
    select: (data: any[]) => data.filter(offer => 
      ['nouveau', 'en_chiffrage', 'en_validation'].includes(offer.status)
    ),
  });

  // Create supplier request mutation
  const createRequestMutation = useMutation({
    mutationFn: async (requestData: NewSupplierRequest) => {
      const response = await fetch('/api/supplier-requests/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });
      if (!response.ok) throw new Error('Failed to create request');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/supplier-requests/'] });
      setShowRequestDialog(false);
      toast({
        title: "Demande envoyée",
        description: "La demande de devis a été envoyée au fournisseur.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer la demande.",
        variant: "destructive",
      });
    },
  });

  const handleCreateRequest = (formData: FormData) => {
    const requestData: NewSupplierRequest = {
      offerId: formData.get('offerId') as string,
      supplierName: formData.get('supplierName') as string,
      productCategory: formData.get('productCategory') as string,
      description: formData.get('description') as string,
      urgency: formData.get('urgency') as string,
      contactEmail: formData.get('contactEmail') as string || undefined,
      contactPhone: formData.get('contactPhone') as string || undefined,
      estimatedAmount: formData.get('estimatedAmount') as string || undefined,
      notes: formData.get('notes') as string || undefined,
    };

    createRequestMutation.mutate(requestData);
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      'envoye': { label: 'Envoyé', variant: 'default' as const },
      'en_attente': { label: 'En Attente', variant: 'secondary' as const },
      'recu': { label: 'Reçu', variant: 'default' as const },
      'refuse': { label: 'Refusé', variant: 'destructive' as const },
    };
    
    const statusInfo = statusMap[status as keyof typeof statusMap] || statusMap.en_attente;
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  const getUrgencyBadge = (urgency: string) => {
    const urgencyMap = {
      'normale': { label: 'Normale', variant: 'outline' as const },
      'haute': { label: 'Haute', variant: 'secondary' as const },
      'critique': { label: 'Critique', variant: 'destructive' as const },
    };
    
    const urgencyInfo = urgencyMap[urgency as keyof typeof urgencyMap] || urgencyMap.normale;
    return <Badge variant={urgencyInfo.variant}>{urgencyInfo.label}</Badge>;
  };

  // Filter requests based on status
  const filteredRequests = supplierRequests.filter(request => 
    statusFilter === "all" || request.status === statusFilter
  );

  // Calculate statistics
  const stats = {
    total: supplierRequests.length,
    pending: supplierRequests.filter(r => r.status === 'en_attente').length,
    received: supplierRequests.filter(r => r.status === 'recu').length,
    avgResponseTime: 3.2, // Placeholder - calculate based on real data
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      <PhaseNavigation />
      <main className="flex-1 overflow-auto">
        <Header 
          title="Fournisseurs"
          breadcrumbs={[
            { label: "Accueil", href: "/" },
            { label: "Fournisseurs" }
          ]}
        />
        
        <div className="px-6 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fournisseurs</h1>
          <p className="text-gray-600">Gestion des demandes de devis et relations fournisseurs</p>
        </div>
        <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle Demande
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleCreateRequest(formData);
            }}>
              <DialogHeader>
                <DialogTitle>Nouvelle Demande de Devis</DialogTitle>
                <DialogDescription>
                  Créer une demande de devis pour un fournisseur
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="offerId">Offre concernée</Label>
                  <Select name="offerId" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une offre" />
                    </SelectTrigger>
                    <SelectContent>
                      {offers.filter((offer: any) => offer.id).map((offer: any) => (
                        <SelectItem key={offer.id} value={offer.id}>
                          {offer.reference} - {offer.client}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supplierName">Nom du Fournisseur</Label>
                  <Input
                    id="supplierName"
                    name="supplierName"
                    placeholder="Nom du fournisseur"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="productCategory">Catégorie de Produit</Label>
                  <Select name="productCategory" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="menuiserie_ext">Menuiserie Extérieure</SelectItem>
                      <SelectItem value="menuiserie_int">Menuiserie Intérieure</SelectItem>
                      <SelectItem value="vitrage">Vitrage</SelectItem>
                      <SelectItem value="quincaillerie">Quincaillerie</SelectItem>
                      <SelectItem value="isolation">Isolation</SelectItem>
                      <SelectItem value="autre">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="urgency">Urgence</Label>
                  <Select name="urgency" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Niveau d'urgence" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normale">Normale</SelectItem>
                      <SelectItem value="haute">Haute</SelectItem>
                      <SelectItem value="critique">Critique</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactEmail">Email de Contact</Label>
                  <Input
                    id="contactEmail"
                    name="contactEmail"
                    type="email"
                    placeholder="contact@fournisseur.fr"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactPhone">Téléphone</Label>
                  <Input
                    id="contactPhone"
                    name="contactPhone"
                    type="tel"
                    placeholder="02 XX XX XX XX"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="estimatedAmount">Montant Estimé (€)</Label>
                  <Input
                    id="estimatedAmount"
                    name="estimatedAmount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="description">Description de la Demande</Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Détails de la demande, spécifications techniques..."
                    rows={3}
                    required
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="notes">Notes Internes</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    placeholder="Notes pour usage interne..."
                    rows={2}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createRequestMutation.isPending}>
                  {createRequestMutation.isPending ? 'Envoi...' : 'Envoyer la Demande'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Demandes</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Truck className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">En Attente</p>
                <p className="text-2xl font-bold text-orange-600">{stats.pending}</p>
              </div>
              <Clock className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Reçus</p>
                <p className="text-2xl font-bold text-green-600">{stats.received}</p>
              </div>
              <Star className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Délai Moyen</p>
                <p className="text-2xl font-bold">{stats.avgResponseTime}j</p>
              </div>
              <Clock className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Truck className="w-5 h-5" />
              Demandes de Devis
            </CardTitle>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrer par statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="envoye">Envoyé</SelectItem>
                <SelectItem value="en_attente">En Attente</SelectItem>
                <SelectItem value="recu">Reçu</SelectItem>
                <SelectItem value="refuse">Refusé</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Chargement...</div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Aucune demande trouvée
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRequests.map((request) => (
                <Card key={request.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-3 flex-1">
                        <div className="flex items-center gap-3">
                          <div className="font-medium text-lg">{request.supplierName}</div>
                          {getStatusBadge(request.status)}
                          {getUrgencyBadge(request.urgency)}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="space-y-1">
                            <p className="text-gray-600">Offre: {request.offer?.reference || 'N/A'}</p>
                            <p className="text-gray-600">Client: {request.offer?.client || 'N/A'}</p>
                            <p className="text-gray-600">Catégorie: {request.productCategory}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-gray-600">Demande: {new Date(request.requestDate).toLocaleDateString()}</p>
                            {request.responseDate && (
                              <p className="text-gray-600">Réponse: {new Date(request.responseDate).toLocaleDateString()}</p>
                            )}
                            {request.estimatedAmount && (
                              <p className="text-gray-600">Montant: {parseFloat(request.estimatedAmount).toLocaleString()} €</p>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <p className="text-sm">{request.description}</p>
                          {request.notes && (
                            <div className="p-2 bg-gray-50 rounded text-sm">
                              <span className="font-medium">Notes: </span>
                              {request.notes}
                            </div>
                          )}
                        </div>

                        {(request.contactEmail || request.contactPhone) && (
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            {request.contactEmail && (
                              <div className="flex items-center gap-1">
                                <Mail className="w-4 h-4" />
                                {request.contactEmail}
                              </div>
                            )}
                            {request.contactPhone && (
                              <div className="flex items-center gap-1">
                                <Phone className="w-4 h-4" />
                                {request.contactPhone}
                              </div>
                            )}
                          </div>
                        )}
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