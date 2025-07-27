import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Calculator,
  Euro,
  Plus,
  Trash2,
  FileText,
  Clock,
  Users,
  Package,
  Truck,
  Save,
  Download,
  Eye,
} from "lucide-react";

// Schéma Zod pour les composants de prix
const pricingComponentSchema = z.object({
  category: z.enum(["menuiserie", "pose", "fourniture", "transport"]),
  subCategory: z.string().optional(),
  description: z.string().min(1, "Description requise"),
  quantity: z.coerce.number().min(0.01, "Quantité doit être positive"),
  unit: z.string().min(1, "Unité requise"),
  unitPrice: z.coerce.number().min(0, "Prix unitaire doit être positif"),
  supplierPrice: z.coerce.number().optional(),
  margin: z.coerce.number().min(0).max(100).optional(),
  notes: z.string().optional(),
});

const supplierQuotationSchema = z.object({
  supplierName: z.string().min(1, "Nom du fournisseur requis"),
  reference: z.string().optional(),
  quotationDate: z.string().optional(),
  validityDays: z.coerce.number().min(1).max(365).default(30),
  totalAmount: z.coerce.number().min(0, "Montant total requis"),
  status: z.enum(["en_attente", "recu", "valide", "refuse"]).default("en_attente"),
  notes: z.string().optional(),
});

type PricingComponentForm = z.infer<typeof pricingComponentSchema>;
type SupplierQuotationForm = z.infer<typeof supplierQuotationSchema>;

export default function Pricing() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedOfferId, setSelectedOfferId] = useState<string>("");
  const [activeTab, setActiveTab] = useState("components");

  return (
    <div className="min-h-screen flex bg-gray-50">
      <PhaseNavigation />
      <main className="flex-1 overflow-auto">
        <Header 
          title="Chiffrage"
          breadcrumbs={[
            { label: "Accueil", href: "/" },
            { label: "Chiffrage" }
          ]}
        />
        
        <div className="px-6 py-6">
          <PricingContent 
            selectedOfferId={selectedOfferId}
            setSelectedOfferId={setSelectedOfferId}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            toast={toast}
            queryClient={queryClient}
          />
        </div>
      </main>
    </div>
  );
}

function PricingContent({ selectedOfferId, setSelectedOfferId, activeTab, setActiveTab, toast, queryClient }: any) {

  // Récupération des offres en cours de chiffrage
  const { data: offers, isLoading: offersLoading } = useQuery({
    queryKey: ["/api/offers"],
    select: (data: any[]) => data.filter(offer => 
      ["nouveau", "en_chiffrage", "en_validation"].includes(offer.status)
    ),
  });

  // Récupération des composants de prix pour une offre
  const { data: pricingComponents, isLoading: componentsLoading } = useQuery({
    queryKey: ["/api/pricing-components", selectedOfferId],
    enabled: !!selectedOfferId,
  });

  // Récupération des devis fournisseurs pour une offre
  const { data: supplierQuotations, isLoading: quotationsLoading } = useQuery({
    queryKey: ["/api/supplier-quotations", selectedOfferId],
    enabled: !!selectedOfferId,
  });

  // Form pour les composants de prix
  const componentForm = useForm<PricingComponentForm>({
    resolver: zodResolver(pricingComponentSchema),
    defaultValues: {
      category: "menuiserie",
      unit: "u",
      quantity: 1,
      unitPrice: 0,
      margin: 30,
    },
  });

  // Form pour les devis fournisseurs
  const quotationForm = useForm<SupplierQuotationForm>({
    resolver: zodResolver(supplierQuotationSchema),
    defaultValues: {
      validityDays: 30,
      status: "en_attente",
    },
  });

  // Mutation pour créer un composant de prix
  const createComponentMutation = useMutation({
    mutationFn: async (data: PricingComponentForm) => {
      const totalPrice = data.quantity * data.unitPrice;
      return apiRequest(`/api/pricing-components`, {
        method: "POST",
        body: {
          ...data,
          offerId: selectedOfferId,
          totalPrice,
        },
      });
    },
    onSuccess: () => {
      toast({
        title: "Composant ajouté",
        description: "Le composant de prix a été ajouté avec succès",
      });
      componentForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/pricing-components"] });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter le composant",
        variant: "destructive",
      });
    },
  });

  // Mutation pour créer un devis fournisseur
  const createQuotationMutation = useMutation({
    mutationFn: async (data: SupplierQuotationForm) => {
      return apiRequest(`/api/supplier-quotations`, {
        method: "POST",
        body: {
          ...data,
          offerId: selectedOfferId,
          quotationDate: data.quotationDate ? new Date(data.quotationDate) : null,
        },
      });
    },
    onSuccess: () => {
      toast({
        title: "Devis fournisseur ajouté",
        description: "Le devis fournisseur a été ajouté avec succès",
      });
      quotationForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/supplier-quotations"] });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter le devis fournisseur",
        variant: "destructive",
      });
    },
  });

  const onSubmitComponent = (data: PricingComponentForm) => {
    if (!selectedOfferId) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner une offre",
        variant: "destructive",
      });
      return;
    }
    createComponentMutation.mutate(data);
  };

  const onSubmitQuotation = (data: SupplierQuotationForm) => {
    if (!selectedOfferId) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner une offre",
        variant: "destructive",
      });
      return;
    }
    createQuotationMutation.mutate(data);
  };

  // Calcul du total du chiffrage
  const totalPricing = pricingComponents?.reduce((sum: number, comp: any) => 
    sum + parseFloat(comp.totalPrice || 0), 0
  ) || 0;

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "menuiserie": return <Package className="w-4 h-4" />;
      case "pose": return <Users className="w-4 h-4" />;
      case "fourniture": return <Package className="w-4 h-4" />;
      case "transport": return <Truck className="w-4 h-4" />;
      default: return <Calculator className="w-4 h-4" />;
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case "menuiserie": return "Menuiserie";
      case "pose": return "Pose";
      case "fourniture": return "Fourniture";
      case "transport": return "Transport";
      default: return category;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "en_attente": return "bg-yellow-100 text-yellow-800";
      case "recu": return "bg-blue-100 text-blue-800";
      case "valide": return "bg-green-100 text-green-800";
      case "refuse": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "en_attente": return "En attente";
      case "recu": return "Reçu";
      case "valide": return "Validé";
      case "refuse": return "Refusé";
      default: return status;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Chiffrage</h1>
          <p className="text-gray-600">Gestion des prix et devis fournisseurs</p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Eye className="w-4 h-4 mr-2" />
            Aperçu DPGF
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Exporter
          </Button>
        </div>
      </div>

      {/* Sélection de l'offre */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Sélection de l'offre
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Offre à chiffrer
              </label>
              <Select value={selectedOfferId} onValueChange={setSelectedOfferId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une offre" />
                </SelectTrigger>
                <SelectContent>
                  {offers?.map((offer: any) => (
                    <SelectItem key={offer.id} value={offer.id}>
                      {offer.reference} - {offer.client}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {selectedOfferId && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-medium text-blue-900 mb-2">Résumé du chiffrage</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Composants:</span>
                    <span className="font-medium">
                      {pricingComponents?.length || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total:</span>
                    <span className="font-bold text-blue-700">
                      {totalPricing.toLocaleString()} €
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedOfferId && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="components">Composants de prix</TabsTrigger>
            <TabsTrigger value="quotations">Devis fournisseurs</TabsTrigger>
          </TabsList>

          <TabsContent value="components" className="space-y-6">
            {/* Formulaire d'ajout de composant */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="w-5 h-5" />
                  Ajouter un composant
                </CardTitle>
                <CardDescription>
                  Ajoutez les différents éléments du chiffrage
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...componentForm}>
                  <form onSubmit={componentForm.handleSubmit(onSubmitComponent)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={componentForm.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Catégorie</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="menuiserie">Menuiserie</SelectItem>
                                <SelectItem value="pose">Pose</SelectItem>
                                <SelectItem value="fourniture">Fourniture</SelectItem>
                                <SelectItem value="transport">Transport</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={componentForm.control}
                        name="subCategory"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Sous-catégorie</FormLabel>
                            <FormControl>
                              <Input placeholder="Fenêtre, porte..." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={componentForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Input placeholder="Description détaillée" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <FormField
                        control={componentForm.control}
                        name="quantity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Quantité</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={componentForm.control}
                        name="unit"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Unité</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="u">Unité</SelectItem>
                                <SelectItem value="m2">m²</SelectItem>
                                <SelectItem value="ml">ml</SelectItem>
                                <SelectItem value="kg">kg</SelectItem>
                                <SelectItem value="h">heure</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={componentForm.control}
                        name="unitPrice"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Prix unitaire (€)</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={componentForm.control}
                        name="margin"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Marge (%)</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.1" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={componentForm.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Notes supplémentaires..." 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end">
                      <Button 
                        type="submit" 
                        disabled={createComponentMutation.isPending}
                        className="flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        {createComponentMutation.isPending ? "Ajout..." : "Ajouter"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>

            {/* Liste des composants */}
            <Card>
              <CardHeader>
                <CardTitle>Composants du chiffrage</CardTitle>
                <CardDescription>
                  Total: <span className="font-bold text-green-600">
                    {totalPricing.toLocaleString()} €
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                {componentsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Chargement...</p>
                  </div>
                ) : pricingComponents?.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Calculator className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p>Aucun composant ajouté</p>
                    <p className="text-sm">Commencez par ajouter des éléments au chiffrage</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Catégorie</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Quantité</TableHead>
                        <TableHead>Prix unit.</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Marge</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pricingComponents?.map((component: any) => (
                        <TableRow key={component.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getCategoryIcon(component.category)}
                              <Badge variant="outline">
                                {getCategoryLabel(component.category)}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{component.description}</p>
                              {component.subCategory && (
                                <p className="text-sm text-gray-500">
                                  {component.subCategory}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {component.quantity} {component.unit}
                          </TableCell>
                          <TableCell>
                            {parseFloat(component.unitPrice).toLocaleString()} €
                          </TableCell>
                          <TableCell className="font-medium">
                            {parseFloat(component.totalPrice).toLocaleString()} €
                          </TableCell>
                          <TableCell>
                            {component.margin ? `${component.margin}%` : "-"}
                          </TableCell>
                          <TableCell>
                            <Button variant="outline" size="sm">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="quotations" className="space-y-6">
            {/* Formulaire d'ajout de devis fournisseur */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Ajouter un devis fournisseur
                </CardTitle>
                <CardDescription>
                  Enregistrez les devis reçus des fournisseurs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...quotationForm}>
                  <form onSubmit={quotationForm.handleSubmit(onSubmitQuotation)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={quotationForm.control}
                        name="supplierName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Fournisseur</FormLabel>
                            <FormControl>
                              <Input placeholder="Nom du fournisseur" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={quotationForm.control}
                        name="reference"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Référence</FormLabel>
                            <FormControl>
                              <Input placeholder="Référence devis" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={quotationForm.control}
                        name="quotationDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Date du devis</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={quotationForm.control}
                        name="validityDays"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Validité (jours)</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={quotationForm.control}
                        name="totalAmount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Montant total (€)</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={quotationForm.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Statut</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="en_attente">En attente</SelectItem>
                                <SelectItem value="recu">Reçu</SelectItem>
                                <SelectItem value="valide">Validé</SelectItem>
                                <SelectItem value="refuse">Refusé</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={quotationForm.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Notes</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Notes sur le devis..." 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex justify-end">
                      <Button 
                        type="submit" 
                        disabled={createQuotationMutation.isPending}
                        className="flex items-center gap-2"
                      >
                        <Save className="w-4 h-4" />
                        {createQuotationMutation.isPending ? "Enregistrement..." : "Enregistrer"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>

            {/* Liste des devis fournisseurs */}
            <Card>
              <CardHeader>
                <CardTitle>Devis fournisseurs</CardTitle>
              </CardHeader>
              <CardContent>
                {quotationsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Chargement...</p>
                  </div>
                ) : supplierQuotations?.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p>Aucun devis fournisseur</p>
                    <p className="text-sm">Ajoutez des devis reçus des fournisseurs</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {supplierQuotations?.map((quotation: any) => (
                      <div key={quotation.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-medium text-lg">{quotation.supplierName}</h3>
                            {quotation.reference && (
                              <p className="text-sm text-gray-600">
                                Réf: {quotation.reference}
                              </p>
                            )}
                          </div>
                          <Badge className={getStatusColor(quotation.status)}>
                            {getStatusLabel(quotation.status)}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="font-medium">Montant:</span>
                            <span className="ml-2 text-green-600 font-bold">
                              {parseFloat(quotation.totalAmount).toLocaleString()} €
                            </span>
                          </div>
                          {quotation.quotationDate && (
                            <div>
                              <span className="font-medium">Date:</span>
                              <span className="ml-2">
                                {new Date(quotation.quotationDate).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                          <div>
                            <span className="font-medium">Validité:</span>
                            <span className="ml-2">{quotation.validityDays} jours</span>
                          </div>
                        </div>
                        
                        {quotation.notes && (
                          <div className="mt-3 p-2 bg-gray-50 rounded text-sm">
                            {quotation.notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}