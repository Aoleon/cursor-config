import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calculator, Plus, Euro, Clock, User, Building } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/layout/sidebar";
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

interface Quotation {
  id: string;
  offerId: string;
  supplierName: string;
  productCategory: string;
  unitPrice: string;
  quantity: number;
  totalPrice: string;
  deliveryTime: number;
  validityDate: string;
  status: 'en_attente' | 'recu' | 'accepte' | 'refuse';
  createdAt: string;
  notes?: string;
}

interface Offer {
  id: string;
  reference: string;
  client: string;
  location: string;
  menuiserieType: string;
  estimatedAmount: string;
  status: string;
  responsibleUser?: {
    firstName: string;
    lastName: string;
  };
}

export default function Pricing() {
  const [selectedOfferId, setSelectedOfferId] = useState<string>("");
  const [showQuotationDialog, setShowQuotationDialog] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch offers for pricing
  const { data: offers = [], isLoading: offersLoading } = useQuery<Offer[]>({
    queryKey: ['/api/offers/'],
    select: (data) => data.filter(offer => 
      ['brouillon', 'en_cours_chiffrage', 'en_attente_validation'].includes(offer.status)
    ),
  });

  // Fetch quotations for selected offer
  const { data: quotations = [], isLoading: quotationsLoading } = useQuery<Quotation[]>({
    queryKey: ['/api/quotations/', selectedOfferId],
    enabled: !!selectedOfferId,
  });

  // Create quotation mutation
  const createQuotationMutation = useMutation({
    mutationFn: async (quotationData: any) => {
      const response = await fetch('/api/quotations/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(quotationData),
      });
      if (!response.ok) throw new Error('Failed to create quotation');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/quotations/'] });
      setShowQuotationDialog(false);
      toast({
        title: "Devis créé",
        description: "Le devis fournisseur a été ajouté avec succès.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible de créer le devis.",
        variant: "destructive",
      });
    },
  });

  const handleCreateQuotation = (formData: FormData) => {
    const quotationData = {
      offerId: selectedOfferId,
      supplierName: formData.get('supplierName'),
      productCategory: formData.get('productCategory'),
      unitPrice: formData.get('unitPrice'),
      quantity: parseInt(formData.get('quantity') as string),
      totalPrice: formData.get('totalPrice'),
      deliveryTime: parseInt(formData.get('deliveryTime') as string),
      validityDate: formData.get('validityDate'),
      status: 'en_attente',
      notes: formData.get('notes'),
    };

    createQuotationMutation.mutate(quotationData);
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      'en_attente': { label: 'En Attente', variant: 'secondary' as const },
      'recu': { label: 'Reçu', variant: 'default' as const },
      'accepte': { label: 'Accepté', variant: 'default' as const },
      'refuse': { label: 'Refusé', variant: 'destructive' as const },
    };
    
    const statusInfo = statusMap[status as keyof typeof statusMap] || statusMap.en_attente;
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  const selectedOffer = offers.find(offer => offer.id === selectedOfferId);
  const totalQuotations = quotations.reduce((sum, q) => sum + parseFloat(q.totalPrice), 0);

  return (
    <div className="min-h-screen flex bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Header 
          title="Chiffrage"
          breadcrumbs={[
            { label: "Accueil", href: "/" },
            { label: "Chiffrage" }
          ]}
        />
        
        <div className="px-6 py-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sélection d'offre */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="w-5 h-5" />
              Offres à Chiffrer
            </CardTitle>
            <CardDescription>
              Sélectionnez une offre pour gérer ses devis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {offersLoading ? (
                <div className="text-center py-4 text-gray-500">Chargement...</div>
              ) : offers.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  Aucune offre en cours de chiffrage
                </div>
              ) : (
                offers.map((offer) => (
                  <Card 
                    key={offer.id}
                    className={`cursor-pointer transition-colors ${
                      selectedOfferId === offer.id 
                        ? 'ring-2 ring-primary bg-primary/5' 
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedOfferId(offer.id)}
                  >
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <div className="font-medium">{offer.reference}</div>
                        <div className="text-sm text-gray-600">{offer.client}</div>
                        <div className="text-sm text-gray-500">{offer.location}</div>
                        <div className="flex items-center justify-between">
                          <Badge variant="outline">
                            {offer.menuiserieType}
                          </Badge>
                          <span className="text-sm font-medium">
                            {parseFloat(offer.estimatedAmount).toLocaleString()} €
                          </span>
                        </div>
                        {offer.responsibleUser && (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <User className="w-3 h-3" />
                            {offer.responsibleUser.firstName} {offer.responsibleUser.lastName}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Devis fournisseurs */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="w-5 h-5" />
                  Devis Fournisseurs
                </CardTitle>
                <CardDescription>
                  {selectedOffer ? `${selectedOffer.reference} - ${selectedOffer.client}` : 'Sélectionnez une offre'}
                </CardDescription>
              </div>
              {selectedOfferId && (
                <Dialog open={showQuotationDialog} onOpenChange={setShowQuotationDialog}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Nouveau Devis
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      const formData = new FormData(e.target as HTMLFormElement);
                      handleCreateQuotation(formData);
                    }}>
                      <DialogHeader>
                        <DialogTitle>Nouveau Devis Fournisseur</DialogTitle>
                        <DialogDescription>
                          Ajouter un devis pour {selectedOffer?.reference}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid grid-cols-2 gap-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="supplierName">Fournisseur</Label>
                          <Input
                            id="supplierName"
                            name="supplierName"
                            placeholder="Nom du fournisseur"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="productCategory">Catégorie</Label>
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
                          <Label htmlFor="unitPrice">Prix Unitaire (€)</Label>
                          <Input
                            id="unitPrice"
                            name="unitPrice"
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="quantity">Quantité</Label>
                          <Input
                            id="quantity"
                            name="quantity"
                            type="number"
                            min="1"
                            placeholder="1"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="totalPrice">Prix Total (€)</Label>
                          <Input
                            id="totalPrice"
                            name="totalPrice"
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="deliveryTime">Délai (jours)</Label>
                          <Input
                            id="deliveryTime"
                            name="deliveryTime"
                            type="number"
                            min="1"
                            placeholder="30"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="validityDate">Validité du devis</Label>
                          <Input
                            id="validityDate"
                            name="validityDate"
                            type="date"
                            required
                          />
                        </div>
                        <div className="space-y-2 col-span-2">
                          <Label htmlFor="notes">Notes</Label>
                          <Textarea
                            id="notes"
                            name="notes"
                            placeholder="Informations complémentaires..."
                            rows={3}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="submit" disabled={createQuotationMutation.isPending}>
                          {createQuotationMutation.isPending ? 'Création...' : 'Créer le Devis'}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!selectedOfferId ? (
              <div className="text-center py-8 text-gray-500">
                Sélectionnez une offre pour voir ses devis
              </div>
            ) : quotationsLoading ? (
              <div className="text-center py-8 text-gray-500">Chargement...</div>
            ) : quotations.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Aucun devis pour cette offre
              </div>
            ) : (
              <div className="space-y-4">
                {/* Résumé financier */}
                <Card className="bg-blue-50">
                  <CardContent className="p-4">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-blue-600">
                          {quotations.length}
                        </div>
                        <div className="text-sm text-gray-600">Devis</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-green-600">
                          {totalQuotations.toLocaleString()} €
                        </div>
                        <div className="text-sm text-gray-600">Total</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-orange-600">
                          {selectedOffer ? (
                            Math.round((totalQuotations / parseFloat(selectedOffer.estimatedAmount)) * 100)
                          ) : 0}%
                        </div>
                        <div className="text-sm text-gray-600">du Budget</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Liste des devis */}
                <div className="space-y-3">
                  {quotations.map((quotation) => (
                    <Card key={quotation.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="font-medium">{quotation.supplierName}</div>
                            <div className="text-sm text-gray-600">{quotation.productCategory}</div>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Euro className="w-3 h-3" />
                                {parseFloat(quotation.unitPrice).toLocaleString()} € × {quotation.quantity}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {quotation.deliveryTime} jours
                              </span>
                            </div>
                          </div>
                          <div className="text-right space-y-2">
                            <div className="text-xl font-bold">
                              {parseFloat(quotation.totalPrice).toLocaleString()} €
                            </div>
                            {getStatusBadge(quotation.status)}
                          </div>
                        </div>
                        {quotation.notes && (
                          <div className="mt-3 p-2 bg-gray-50 rounded text-sm">
                            {quotation.notes}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
          </div>
        </div>
      </main>
    </div>
  );
}