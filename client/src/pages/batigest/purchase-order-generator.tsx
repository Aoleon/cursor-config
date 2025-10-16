import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  FileText, 
  Send, 
  Eye, 
  CheckCircle, 
  AlertTriangle,
  Loader2,
  Euro,
  Package,
  Calendar,
  User
} from "lucide-react";

// ========================================
// ZOD SCHEMA - Based on insertPurchaseOrderSchema
// ========================================

const purchaseOrderFormSchema = z.object({
  reference: z.string().min(1, "Référence requise"),
  aoId: z.string().uuid("AO invalide").optional().nullable(),
  aoLotId: z.string().uuid("Lot invalide").optional().nullable(),
  supplierId: z.string().uuid("Fournisseur requis"),
  supplierContact: z.string().optional().nullable(),
  supplierEmail: z.string().email("Email invalide").optional().nullable(),
  expectedDeliveryDate: z.string().optional().nullable(),
  paymentTerms: z.string().optional().nullable(),
  warranty: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  deliveryAddress: z.string().optional().nullable(),
  items: z.array(z.object({
    description: z.string(),
    quantity: z.number().positive(),
    unitPrice: z.number().nonnegative(),
    total: z.number().nonnegative()
  })).min(1, "Au moins un article requis")
});

type PurchaseOrderFormData = z.infer<typeof purchaseOrderFormSchema>;

// ========================================
// TYPES
// ========================================

interface AO {
  id: string;
  reference: string;
  titre: string;
  status: string;
}

interface AOLot {
  id: string;
  numero: string;
  designation: string;
  montantEstime: string;
}

interface Supplier {
  id: string;
  nom: string;
  email: string;
  telephone: string;
  status: string;
}

interface ArticleItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export default function PurchaseOrderGenerator() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // ========================================
  // STATE MANAGEMENT
  // ========================================
  
  const [selectedAoId, setSelectedAoId] = useState<string | null>(null);
  const [selectedLotId, setSelectedLotId] = useState<string | null>(null);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);
  const [pdfBlob, setPdfBlob] = useState<string | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);

  // ========================================
  // REACT QUERY - DATA FETCHING
  // ========================================

  // Query pour charger les AOs disponibles
  const { data: aos = [], isLoading: isLoadingAos, error: aosError } = useQuery<AO[]>({
    queryKey: ["/api/aos"],
    enabled: true
  });

  // Query pour charger les lots d'un AO sélectionné
  const { data: aoLots = [], isLoading: isLoadingLots } = useQuery<AOLot[]>({
    queryKey: ["/api/ao-lots", selectedAoId],
    enabled: !!selectedAoId,
    queryFn: async () => {
      if (!selectedAoId) return [];
      const response = await fetch(`/api/aos/${selectedAoId}/lots`);
      if (!response.ok) throw new Error("Erreur lors du chargement des lots");
      return response.json();
    }
  });

  // Query pour charger les fournisseurs
  const { data: suppliers = [], isLoading: isLoadingSuppliers, error: suppliersError } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
    queryFn: async () => {
      const response = await fetch("/api/suppliers");
      if (!response.ok) throw new Error("Erreur lors du chargement des fournisseurs");
      const result = await response.json();
      return Array.isArray(result) ? result : result.data || [];
    }
  });

  // Query pour charger les items d'un lot (chiffrageElements)
  const { data: lotItemsData, isLoading: isLoadingLotItems } = useQuery({
    queryKey: ["/api/ao-lots", selectedLotId, "items"],
    enabled: !!selectedLotId,
    queryFn: async () => {
      if (!selectedLotId) return { data: [] };
      const response = await fetch(`/api/ao-lots/${selectedLotId}/items`);
      if (!response.ok) throw new Error("Erreur lors du chargement des items du lot");
      return response.json();
    },
    select: (response) => {
      const items = response.data || [];
      return items.map((item: any) => ({
        id: item.id,
        description: item.designation || "",
        quantity: Number(item.quantity ?? 0),
        unitPrice: Number(item.unitPrice ?? 0),
        total: Number(item.totalPrice ?? 0)
      }));
    }
  });

  const availableArticles = lotItemsData || [];

  // ========================================
  // FORM SETUP
  // ========================================

  const form = useForm<PurchaseOrderFormData>({
    resolver: zodResolver(purchaseOrderFormSchema),
    defaultValues: {
      reference: `BC-${Date.now()}`,
      aoId: null,
      aoLotId: null,
      supplierId: "",
      supplierContact: "",
      supplierEmail: "",
      expectedDeliveryDate: "",
      paymentTerms: "30 jours nets",
      warranty: "1 an",
      notes: "",
      deliveryAddress: "",
      items: []
    }
  });

  // ========================================
  // CALCULATIONS
  // ========================================

  const selectedArticles = useMemo(() => {
    return availableArticles.filter(article => selectedItems.has(article.id));
  }, [availableArticles, selectedItems]);

  const totals = useMemo(() => {
    const totalHT = selectedArticles.reduce((sum, article) => sum + article.total, 0);
    const totalTVA = totalHT * 0.20;
    const totalTTC = totalHT + totalTVA;
    return { totalHT, totalTVA, totalTTC };
  }, [selectedArticles]);

  // Update form items when selection changes
  useEffect(() => {
    const items = selectedArticles.map(article => ({
      description: article.description,
      quantity: article.quantity,
      unitPrice: article.unitPrice,
      total: article.total
    }));
    form.setValue("items", items);
  }, [selectedArticles, form]);

  // Reset lot and articles when AO changes
  useEffect(() => {
    if (selectedAoId) {
      form.setValue('aoId', selectedAoId);
      form.setValue('aoLotId', null);
      setSelectedLotId(null);
      setSelectedItems(new Set());
    }
  }, [selectedAoId, form]);

  // ========================================
  // HANDLERS
  // ========================================

  const toggleArticleSelection = (articleId: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(articleId)) {
        newSet.delete(articleId);
      } else {
        newSet.add(articleId);
      }
      return newSet;
    });
  };

  const handleAoChange = (aoId: string) => {
    setSelectedAoId(aoId);
    setSelectedLotId(null);
    setSelectedItems(new Set());
    form.setValue("aoId", aoId);
    form.setValue("aoLotId", null);
  };

  const handleLotChange = (lotId: string) => {
    setSelectedLotId(lotId);
    setSelectedItems(new Set());
    form.setValue("aoLotId", lotId);
  };

  const handleSupplierChange = (supplierId: string) => {
    setSelectedSupplierId(supplierId);
    form.setValue("supplierId", supplierId);
    
    // Auto-fill supplier info
    const supplier = suppliers.find(s => s.id === supplierId);
    if (supplier) {
      form.setValue("supplierEmail", supplier.email || "");
      form.setValue("supplierContact", supplier.telephone || "");
    }
  };

  // ========================================
  // PDF PREVIEW MUTATION
  // ========================================

  const previewPdfMutation = useMutation({
    mutationFn: async (data: PurchaseOrderFormData) => {
      const supplier = suppliers.find(s => s.id === data.supplierId);
      
      const payload = {
        ...data,
        supplierName: supplier?.nom || "",
        totalHT: totals.totalHT.toString(),
        totalTVA: totals.totalTVA.toString(),
        totalTTC: totals.totalTTC.toString(),
        generatePDF: true,
        exportToBatigest: false
      };

      const response = await fetch("/api/documents/generate-purchase-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erreur lors de la génération du PDF");
      }

      // Assuming the API returns a PDF blob or URL
      const blob = await response.blob();
      return URL.createObjectURL(blob);
    },
    onSuccess: (pdfUrl) => {
      setPdfBlob(pdfUrl);
      setIsPdfPreviewOpen(true);
      toast({
        title: "PDF généré",
        description: "Aperçu du bon de commande disponible"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // ========================================
  // FINAL SUBMISSION MUTATION
  // ========================================

  const createPurchaseOrderMutation = useMutation({
    mutationFn: async (data: PurchaseOrderFormData) => {
      const supplier = suppliers.find(s => s.id === data.supplierId);
      
      const payload = {
        ...data,
        supplierName: supplier?.nom || "",
        totalHT: totals.totalHT.toString(),
        totalTVA: totals.totalTVA.toString(),
        totalTTC: totals.totalTTC.toString(),
        generatePDF: true,
        exportToBatigest: true
      };

      const response = await apiRequest("POST", "/api/documents/generate-purchase-order", payload);
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Bon de commande créé",
        description: `Référence: ${data.reference}. Export Batigest en cours...`
      });
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/batigest/exports"] });
      
      // Generate fresh reference for next order
      const freshReference = `BC-${Date.now()}`;
      
      // Reset form with fresh defaults
      form.reset({
        reference: freshReference,
        aoId: null,
        aoLotId: null,
        supplierId: "",
        supplierContact: "",
        supplierEmail: "",
        expectedDeliveryDate: "",
        paymentTerms: "30 jours nets",
        warranty: "1 an",
        notes: "",
        items: []
      });
      
      // Reset ALL UI states for clean slate
      setSelectedAoId(null);
      setSelectedLotId(null);
      setSelectedSupplierId("");
      setSelectedItems(new Set());
      setIsPdfPreviewOpen(false);
      
      // Optionally redirect
      // window.location.href = "/batigest";
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // ========================================
  // FORM SUBMISSION
  // ========================================

  const onSubmit = (data: PurchaseOrderFormData) => {
    if (!data.supplierId || data.supplierId === "") {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un fournisseur",
        variant: "destructive"
      });
      return;
    }
    if (selectedArticles.length === 0) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner au moins un article",
        variant: "destructive"
      });
      return;
    }
    createPurchaseOrderMutation.mutate(data);
  };

  const handlePreviewPdf = () => {
    const data = form.getValues();
    if (!data.supplierId || data.supplierId === "") {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un fournisseur",
        variant: "destructive"
      });
      return;
    }
    if (selectedArticles.length === 0) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner au moins un article",
        variant: "destructive"
      });
      return;
    }
    previewPdfMutation.mutate(data);
  };

  // ========================================
  // RENDER
  // ========================================

  if (isLoadingAos || isLoadingSuppliers) {
    return (
      <div className="flex items-center justify-center min-h-screen" data-testid="loading-state">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Chargement des données...</p>
        </div>
      </div>
    );
  }

  if (aosError || suppliersError) {
    return (
      <div className="flex items-center justify-center min-h-screen" data-testid="error-state">
        <div className="text-center text-red-500">
          <AlertTriangle className="h-12 w-12 mx-auto mb-2" />
          <p className="font-semibold">Erreur lors du chargement</p>
          <p className="text-sm text-gray-600 mt-1">
            {(aosError as Error)?.message || (suppliersError as Error)?.message}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="purchase-order-generator-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="page-title">Générateur de Bon de Commande Fournisseur</h1>
          <p className="text-muted-foreground mt-1" data-testid="page-description">
            Créez et exportez des bons de commande vers Batigest
          </p>
        </div>
        <Badge variant="outline" data-testid="badge-status">
          {createPurchaseOrderMutation.isPending ? "Création en cours..." : "Prêt"}
        </Badge>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Main Information Card */}
          <Card data-testid="card-main-info">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Informations Générales
              </CardTitle>
              <CardDescription>Sélectionnez l'AO, le lot et le fournisseur</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Reference */}
                <FormField
                  control={form.control}
                  name="reference"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Référence *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="BC-XXX" data-testid="input-reference" />
                      </FormControl>
                      <FormMessage data-testid="error-reference" />
                    </FormItem>
                  )}
                />

                {/* AO Selection */}
                <FormField
                  control={form.control}
                  name="aoId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Appel d'Offre</FormLabel>
                      <Select 
                        onValueChange={handleAoChange} 
                        value={selectedAoId}
                        disabled={isLoadingAos}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-ao">
                            <SelectValue placeholder="Sélectionner un AO" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {aos.map((ao) => (
                            <SelectItem 
                              key={ao.id} 
                              value={ao.id}
                              data-testid={`select-option-ao-${ao.id}`}
                            >
                              {ao.reference} - {ao.titre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage data-testid="error-ao" />
                    </FormItem>
                  )}
                />

                {/* Lot Selection */}
                <FormField
                  control={form.control}
                  name="aoLotId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lot</FormLabel>
                      <Select 
                        onValueChange={handleLotChange} 
                        value={selectedLotId}
                        disabled={!selectedAoId || isLoadingLots}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-lot">
                            <SelectValue placeholder="Sélectionner un lot" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {aoLots.map((lot) => (
                            <SelectItem 
                              key={lot.id} 
                              value={lot.id}
                              data-testid={`select-option-lot-${lot.id}`}
                            >
                              Lot {lot.numero} - {lot.designation}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>Optionnel - Associer à un lot spécifique</FormDescription>
                      <FormMessage data-testid="error-lot" />
                    </FormItem>
                  )}
                />

                {/* Supplier Selection */}
                <FormField
                  control={form.control}
                  name="supplierId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fournisseur *</FormLabel>
                      <Select 
                        onValueChange={handleSupplierChange} 
                        value={selectedSupplierId}
                        disabled={isLoadingSuppliers}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-supplier">
                            <SelectValue placeholder="Sélectionner un fournisseur" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {suppliers.filter(s => s.status === "actif").map((supplier) => (
                            <SelectItem 
                              key={supplier.id} 
                              value={supplier.id}
                              data-testid={`select-option-supplier-${supplier.id}`}
                            >
                              {supplier.nom}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage data-testid="error-supplier" />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Contact */}
                <FormField
                  control={form.control}
                  name="supplierContact"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Fournisseur</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} placeholder="Téléphone" data-testid="input-contact" />
                      </FormControl>
                      <FormMessage data-testid="error-contact" />
                    </FormItem>
                  )}
                />

                {/* Email */}
                <FormField
                  control={form.control}
                  name="supplierEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Fournisseur</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} type="email" placeholder="email@fournisseur.fr" data-testid="input-email" />
                      </FormControl>
                      <FormMessage data-testid="error-email" />
                    </FormItem>
                  )}
                />

                {/* Expected Delivery Date */}
                <FormField
                  control={form.control}
                  name="expectedDeliveryDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date de livraison souhaitée</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} type="date" data-testid="input-delivery-date" />
                      </FormControl>
                      <FormMessage data-testid="error-delivery-date" />
                    </FormItem>
                  )}
                />

                {/* Payment Terms */}
                <FormField
                  control={form.control}
                  name="paymentTerms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Conditions de paiement</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} placeholder="30 jours nets" data-testid="input-payment-terms" />
                      </FormControl>
                      <FormMessage data-testid="error-payment-terms" />
                    </FormItem>
                  )}
                />
              </div>

              {/* Delivery Address */}
              <FormField
                control={form.control}
                name="deliveryAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adresse de livraison</FormLabel>
                    <FormControl>
                      <Textarea {...field} value={field.value || ""} placeholder="Adresse complète de livraison" data-testid="input-delivery-address" rows={2} />
                    </FormControl>
                    <FormMessage data-testid="error-delivery-address" />
                  </FormItem>
                )}
              />

              {/* Notes */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea {...field} value={field.value || ""} placeholder="Notes additionnelles..." data-testid="input-notes" rows={3} />
                    </FormControl>
                    <FormMessage data-testid="error-notes" />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Articles Selection Card */}
          <Card data-testid="card-articles">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Sélection des Articles
              </CardTitle>
              <CardDescription>
                {selectedLotId 
                  ? `${selectedItems.size} article(s) sélectionné(s)`
                  : "Sélectionnez un lot pour voir les articles disponibles"
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {availableArticles.length > 0 ? (
                <div className="space-y-4">
                  <Table data-testid="table-articles">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12" data-testid="header-select">Sélection</TableHead>
                        <TableHead data-testid="header-description">Désignation</TableHead>
                        <TableHead className="text-right" data-testid="header-quantity">Quantité</TableHead>
                        <TableHead className="text-right" data-testid="header-unit-price">Prix unit. HT</TableHead>
                        <TableHead className="text-right" data-testid="header-total">Total HT</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {availableArticles.map((article) => (
                        <TableRow key={article.id} data-testid={`row-article-${article.id}`}>
                          <TableCell>
                            <Checkbox
                              checked={selectedItems.has(article.id)}
                              onCheckedChange={() => toggleArticleSelection(article.id)}
                              data-testid={`checkbox-article-${article.id}`}
                            />
                          </TableCell>
                          <TableCell data-testid={`text-description-${article.id}`}>
                            {article.description}
                          </TableCell>
                          <TableCell className="text-right" data-testid={`text-quantity-${article.id}`}>
                            {article.quantity}
                          </TableCell>
                          <TableCell className="text-right" data-testid={`text-unit-price-${article.id}`}>
                            {article.unitPrice.toFixed(2)} €
                          </TableCell>
                          <TableCell className="text-right font-medium" data-testid={`text-total-${article.id}`}>
                            {article.total.toFixed(2)} €
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  <Separator />

                  {/* Totals */}
                  <div className="space-y-2" data-testid="totals-section">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total HT:</span>
                      <span className="font-medium" data-testid="text-total-ht">
                        {totals.totalHT.toFixed(2)} €
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">TVA (20%):</span>
                      <span className="font-medium" data-testid="text-total-tva">
                        {totals.totalTVA.toFixed(2)} €
                      </span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total TTC:</span>
                      <span className="text-primary" data-testid="text-total-ttc">
                        {totals.totalTTC.toFixed(2)} €
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground" data-testid="no-articles-message">
                  <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Aucun article disponible</p>
                  <p className="text-sm mt-1">Sélectionnez un lot pour afficher les articles</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end" data-testid="actions-section">
            <Button
              type="button"
              variant="outline"
              onClick={handlePreviewPdf}
              disabled={selectedArticles.length === 0 || previewPdfMutation.isPending}
              data-testid="button-preview-pdf"
            >
              {previewPdfMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Génération...
                </>
              ) : (
                <>
                  <Eye className="mr-2 h-4 w-4" />
                  Prévisualiser le PDF
                </>
              )}
            </Button>
            <Button
              type="submit"
              disabled={selectedArticles.length === 0 || createPurchaseOrderMutation.isPending}
              data-testid="button-submit"
            >
              {createPurchaseOrderMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Création en cours...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Créer et Exporter vers Batigest
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>

      {/* PDF Preview Dialog */}
      <Dialog open={isPdfPreviewOpen} onOpenChange={setIsPdfPreviewOpen}>
        <DialogContent className="max-w-4xl h-[80vh]" data-testid="dialog-pdf-preview">
          <DialogHeader>
            <DialogTitle data-testid="dialog-title">Aperçu du Bon de Commande</DialogTitle>
            <DialogDescription data-testid="dialog-description">
              Vérifiez les informations avant de créer le bon de commande
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden" data-testid="pdf-preview-container">
            {pdfBlob ? (
              <iframe
                src={pdfBlob}
                className="w-full h-full border rounded"
                title="Aperçu PDF"
                data-testid="iframe-pdf-preview"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            )}
          </div>

          <DialogFooter data-testid="dialog-footer">
            <Button 
              variant="outline" 
              onClick={() => setIsPdfPreviewOpen(false)}
              data-testid="button-close-preview"
            >
              Modifier
            </Button>
            <Button 
              onClick={form.handleSubmit(onSubmit)}
              disabled={createPurchaseOrderMutation.isPending}
              data-testid="button-confirm-create"
            >
              {createPurchaseOrderMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Création...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Valider et Créer
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
