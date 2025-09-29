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

interface Supplier {
  id: string;
  name: string;
  contact: string;
  email: string;
  phone: string;
  address: string;
  siret: string;
  specialties: string[];
  status: 'actif' | 'inactif' | 'suspendu' | 'blackliste';
  paymentTerms: number;
  deliveryDelay: number;
  rating: number;
  totalOrders: number;
  createdAt: string;
  updatedAt: string;
}

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

interface NewSupplier {
  name: string;
  contact?: string;
  email?: string;
  phone?: string;
  address?: string;
  siret?: string;
  specialties: string[];
  paymentTerms?: number;
  deliveryDelay?: number;
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

interface PaginatedSuppliersResponse {
  success: boolean;
  data: Supplier[];
  timestamp: string;
  meta: {
    page: number;
    limit: number;
    total: number;
  };
}

export default function Suppliers() {
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [showSupplierDetail, setShowSupplierDetail] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch suppliers
  const { data: suppliersResponse, isLoading: suppliersLoading } = useQuery<PaginatedSuppliersResponse>({
    queryKey: ['/api/suppliers/'],
  });
  
  const suppliers = suppliersResponse?.data || [];
  const suppliersMeta = suppliersResponse?.meta;

  // Fetch supplier requests
  const { data: supplierRequestsData, isLoading } = useQuery<any>({
    queryKey: ['/api/supplier-requests/'],
  });
  const supplierRequests = supplierRequestsData?.data || [];

  // Fetch offers for dropdown
  const { data: offersData } = useQuery<any>({
    queryKey: ['/api/offers/'],
  });
  const offers = (offersData?.data || []).filter((offer: any) => 
    ['nouveau', 'en_chiffrage', 'en_validation'].includes(offer.status)
  );

  // Create supplier mutation
  const createSupplierMutation = useMutation({
    mutationFn: async (supplierData: NewSupplier) => {
      const response = await fetch('/api/suppliers/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(supplierData),
      });
      if (!response.ok) throw new Error('Failed to create supplier');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/suppliers/'] });
      setShowRequestDialog(false);
      toast({
        title: "Fournisseur créé",
        description: "Le nouveau fournisseur a été ajouté avec succès.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible de créer le fournisseur.",
        variant: "destructive",
      });
    },
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

  const handleCreateSupplier = (formData: FormData) => {
    const specialtiesStr = formData.get('specialties') as string;
    const specialties = specialtiesStr ? specialtiesStr.split(',').map(s => s.trim()) : [];
    
    const supplierData: NewSupplier = {
      name: formData.get('name') as string,
      contact: formData.get('contact') as string || undefined,
      email: formData.get('email') as string || undefined,
      phone: formData.get('phone') as string || undefined,
      address: formData.get('address') as string || undefined,
      siret: formData.get('siret') as string || undefined,
      specialties: specialties,
      paymentTerms: formData.get('paymentTerms') ? parseInt(formData.get('paymentTerms') as string) : 30,
      deliveryDelay: formData.get('deliveryDelay') ? parseInt(formData.get('deliveryDelay') as string) : 15,
    };

    createSupplierMutation.mutate(supplierData);
  };

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

  // Filter suppliers based on status
  const filteredSuppliers = suppliers.filter(supplier => 
    statusFilter === "all" || supplier.status === statusFilter
  );

  // Filter requests based on status
  const filteredRequests = supplierRequests.filter((request: SupplierRequest) => 
    statusFilter === "all" || request.status === statusFilter
  );

  // Calculate statistics
  const stats = {
    total: supplierRequests.length,
    pending: supplierRequests.filter((r: SupplierRequest) => r.status === 'en_attente').length,
    received: supplierRequests.filter((r: SupplierRequest) => r.status === 'recu').length,
    avgResponseTime: 3.2, // Placeholder - calculate based on real data
  };

  return (
    <>
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
              <h1 className="text-2xl font-bold text-on-surface">Fournisseurs</h1>
              <p className="text-on-surface-muted">Gestion des demandes de devis et relations fournisseurs</p>
            </div>
        <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nouveau fournisseur
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleCreateSupplier(formData);
            }}>
              <DialogHeader>
                <DialogTitle>Nouveau Fournisseur</DialogTitle>
                <DialogDescription>
                  Ajouter un nouveau fournisseur à votre base de données
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nom du Fournisseur *</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Nom de l'entreprise"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact">Personne de Contact</Label>
                  <Input
                    id="contact"
                    name="contact"
                    placeholder="Nom du contact principal"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="contact@fournisseur.fr"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Téléphone</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="02 XX XX XX XX"
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="address">Adresse</Label>
                  <Textarea
                    id="address"
                    name="address"
                    placeholder="Adresse complète"
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="siret">SIRET</Label>
                  <Input
                    id="siret"
                    name="siret"
                    placeholder="12345678901234"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="specialties">Spécialités</Label>
                  <Input
                    id="specialties"
                    name="specialties"
                    placeholder="Menuiserie,Vitrage,Quincaillerie"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paymentTerms">Délai de Paiement (jours)</Label>
                  <Input
                    id="paymentTerms"
                    name="paymentTerms"
                    type="number"
                    placeholder="30"
                    defaultValue="30"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deliveryDelay">Délai de Livraison (jours)</Label>
                  <Input
                    id="deliveryDelay"
                    name="deliveryDelay"
                    type="number"
                    placeholder="15"
                    defaultValue="15"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createSupplierMutation.isPending}>
                  {createSupplierMutation.isPending ? 'Création...' : 'Créer le Fournisseur'}
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
                <p className="text-sm text-on-surface-muted">Total Fournisseurs</p>
                <p className="text-2xl font-bold">{suppliers.length}</p>
              </div>
              <Truck className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-on-surface-muted">Actifs</p>
                <p className="text-2xl font-bold text-success">{suppliers.filter(s => s.status === 'actif').length}</p>
              </div>
              <Star className="w-8 h-8 text-success" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-on-surface-muted">Demandes Total</p>
                <p className="text-2xl font-bold text-warning">{stats.total}</p>
              </div>
              <Clock className="w-8 h-8 text-warning" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-on-surface-muted">Délai Moyen</p>
                <p className="text-2xl font-bold">{stats.avgResponseTime}j</p>
              </div>
              <Clock className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Suppliers List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Truck className="w-5 h-5" />
              Liste des Fournisseurs
            </CardTitle>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrer par statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="actif">Actif</SelectItem>
                <SelectItem value="inactif">Inactif</SelectItem>
                <SelectItem value="suspendu">Suspendu</SelectItem>
                <SelectItem value="blackliste">Blacklisté</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {suppliersLoading ? (
            <div className="text-center py-8 text-on-surface-muted">Chargement...</div>
          ) : filteredSuppliers.length === 0 ? (
            <div className="text-center py-8 text-on-surface-muted">
              Aucun fournisseur trouvé
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSuppliers.map((supplier) => (
                <Card key={supplier.id} className="hover:shadow-md transition-shadow" data-testid={`card-supplier-${supplier.id}`}>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-lg" data-testid={`text-supplier-name-${supplier.id}`}>{supplier.name}</div>
                        <Badge variant={supplier.status === 'actif' ? 'default' : 'secondary'} data-testid={`badge-status-${supplier.id}`}>
                          {supplier.status}
                        </Badge>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        {supplier.email && (
                          <div className="flex items-center gap-2" data-testid={`text-email-${supplier.id}`}>
                            <Mail className="w-4 h-4" />
                            {supplier.email}
                          </div>
                        )}
                        {supplier.phone && (
                          <div className="flex items-center gap-2" data-testid={`text-phone-${supplier.id}`}>
                            <Phone className="w-4 h-4" />
                            {supplier.phone}
                          </div>
                        )}
                        {supplier.address && (
                          <div className="flex items-center gap-2" data-testid={`text-address-${supplier.id}`}>
                            <MapPin className="w-4 h-4" />
                            {supplier.address}
                          </div>
                        )}
                      </div>

                      {supplier.specialties && supplier.specialties.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-sm font-medium">Spécialités:</p>
                          <div className="flex flex-wrap gap-1" data-testid={`specialties-${supplier.id}`}>
                            {supplier.specialties.map((specialty, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {specialty}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2 text-xs text-on-surface-muted">
                        <div>Paiement: {supplier.paymentTerms || 30}j</div>
                        <div>Livraison: {supplier.deliveryDelay || 15}j</div>
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
    </>
  );
}