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
// ZOD SCHEMA - Based on insertClientQuoteSchema
// ========================================

const clientQuoteFormSchema = z.object({
  reference: z.string().min(1, "Référence requise"),
  aoId: z.string().uuid("AO invalide").optional().nullable(),
  aoLotId: z.string().uuid("Lot invalide").optional().nullable(),
  clientName: z.string().min(1, "Nom du client requis"),
  clientContact: z.string().optional().nullable(),
  clientEmail: z.string().email("Email invalide").optional().nullable(),
  clientPhone: z.string().optional().nullable(),
  clientAddress: z.string().optional().nullable(),
  validityDays: z.number().int().positive().default(30),
  deliveryDelay: z.string().optional().nullable(),
  paymentTerms: z.string().optional().nullable(),
  warranty: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  items: z.array(z.object({
    description: z.string(),
    quantity: z.number().positive(),
    unitPrice: z.number().nonnegative(),
    total: z.number().nonnegative()
  })).min(1, "Au moins un article requis")
});

type ClientQuoteFormData = z.infer<typeof clientQuoteFormSchema>;

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

interface ArticleItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export default function ClientQuoteGenerator() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // ========================================
  // STATE MANAGEMENT
  // ========================================
  
  const [selectedAoId, setSelectedAoId] = useState<string | null>(null);
  const [selectedLotId, setSelectedLotId] = useState<string | null>(null);
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

  const form = useForm<ClientQuoteFormData>({
    resolver: zodResolver(clientQuoteFormSchema),
    defaultValues: {
      reference: `DV-${Date.now()}`,
      aoId: null,
      aoLotId: null,
      clientName: "",
      clientContact: "",
      clientEmail: "",
      clientPhone: "",
      clientAddress: "",
      validityDays: 30,
      deliveryDelay: "4 à 6 semaines",
      paymentTerms: "30 jours nets",
      warranty: "1 an",
      notes: "",
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

  // ========================================
  // PDF PREVIEW MUTATION
  // ========================================

  const previewPdfMutation = useMutation({
    mutationFn: async (data: ClientQuoteFormData) => {
      const payload = {
        ...data,
        validityDate: new Date(Date.now() + data.validityDays * 24 * 60 * 60 * 1000).toISOString(),
        totalHT: totals.totalHT.toString(),
        totalTVA: totals.totalTVA.toString(),
        totalTTC: totals.totalTTC.toString(),
        generatePDF: true,
        exportToBatigest: false
      };

      const response = await fetch("/api/documents/generate-client-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erreur lors de la génération du PDF");
      }

      const blob = await response.blob();
      return URL.createObjectURL(blob);
    },
    onSuccess: (pdfUrl) => {
      setPdfBlob(pdfUrl);
      setIsPdfPreviewOpen(true);
      toast({
        title: "PDF généré",
        description: "Aperçu du devis client disponible"
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

  const createClientQuoteMutation = useMutation({
    mutationFn: async (data: ClientQuoteFormData) => {
      const payload = {
        ...data,
        validityDate: new Date(Date.now() + data.validityDays * 24 * 60 * 60 * 1000).toISOString(),
        totalHT: totals.totalHT.toString(),
        totalTVA: totals.totalTVA.toString(),
        totalTTC: totals.totalTTC.toString(),
        generatePDF: true,
        exportToBatigest: true
      };

      const response = await apiRequest("POST", "/api/documents/generate-client-quote", payload);
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Devis client créé",
        description: `Référence: ${data.reference}. Export Batigest en cours...`
      });
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["/api/client-quotes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/batigest/exports"] });
      
      // Generate fresh reference for next quote
      const freshReference = `DV-${Date.now()}`;
      
      // Reset form with fresh defaults
      form.reset({
        reference: freshReference,
        aoId: null,
        aoLotId: null,
        clientName: "",
        clientContact: "",
        clientEmail: "",
        clientPhone: "",
        clientAddress: "",
        validityDays: 30,
        deliveryDelay: "4 à 6 semaines",
        paymentTerms: "30 jours nets",
        warranty: "1 an",
        notes: "",
        items: []
      });
      
      // Reset ALL UI states for clean slate
      setSelectedAoId(null);
      setSelectedLotId(null);
      setSelectedItems(new Set());
      setIsPdfPreviewOpen(false);
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

  const onSubmit = (data: ClientQuoteFormData) => {
    if (!data.clientName || data.clientName === "") {
      toast({
        title: "Erreur",
        description: "Veuillez saisir le nom du client",
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
    createClientQuoteMutation.mutate(data);
  };

  const handlePreviewPdf = () => {
    const data = form.getValues();
    if (!data.clientName || data.clientName === "") {
      toast({
        title: "Erreur",
        description: "Veuillez saisir le nom du client",
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

  if (isLoadingAos) {
    return (
      <div className="flex items-center justify-center min-h-screen" data-testid="loading-state">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Chargement des données...</p>
        </div>
      </div>
    );
  }

  if (aosError) {
    return (
      <div className="flex items-center justify-center min-h-screen" data-testid="error-state">
        <div className="text-center text-red-500">
          <AlertTriangle className="h-12 w-12 mx-auto mb-2" />
          <p className="font-semibold">Erreur lors du chargement</p>
          <p className="text-sm text-gray-600 mt-1">
            {(aosError as Error)?.message}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="client-quote-generator-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="page-title">Générateur de Devis Client</h1>
          <p className="text-muted-foreground mt-1" data-testid="page-description">
            Créez et exportez des devis clients vers Batigest
          </p>
        </div>
        <Badge variant="outline" data-testid="badge-status">
          {createClientQuoteMutation.isPending ? "Création en cours..." : "Prêt"}
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
              <CardDescription>Sélectionnez l'AO, le lot et saisissez les informations client</CardDescription>
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
                        <Input {...field} placeholder="DV-XXX" data-testid="input-reference" />
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
                        value={selectedAoId || undefined}
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
                        value={selectedLotId || undefined}
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

                {/* Client Name */}
                <FormField
                  control={form.control}
                  name="clientName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom du Client *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Nom de l'entreprise ou du particulier" data-testid="input-client-name" />
                      </FormControl>
                      <FormMessage data-testid="error-client-name" />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Contact */}
                <FormField
                  control={form.control}
                  name="clientContact"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Client</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} placeholder="Nom du contact" data-testid="input-client-contact" />
                      </FormControl>
                      <FormMessage data-testid="error-client-contact" />
                    </FormItem>
                  )}
                />

                {/* Email */}
                <FormField
                  control={form.control}
                  name="clientEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Client</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} type="email" placeholder="email@client.fr" data-testid="input-client-email" />
                      </FormControl>
                      <FormMessage data-testid="error-client-email" />
                    </FormItem>
                  )}
                />

                {/* Phone */}
                <FormField
                  control={form.control}
                  name="clientPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Téléphone Client</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} type="tel" placeholder="01 23 45 67 89" data-testid="input-client-phone" />
                      </FormControl>
                      <FormMessage data-testid="error-client-phone" />
                    </FormItem>
                  )}
                />

                {/* Validity Days */}
                <FormField
                  control={form.control}
                  name="validityDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Validité (jours)</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number" 
                          placeholder="30" 
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 30)}
                          data-testid="input-validity-days" 
                        />
                      </FormControl>
                      <FormDescription>Durée de validité du devis (défaut: 30 jours)</FormDescription>
                      <FormMessage data-testid="error-validity-days" />
                    </FormItem>
                  )}
                />

                {/* Delivery Delay */}
                <FormField
                  control={form.control}
                  name="deliveryDelay"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Délai de livraison</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} placeholder="4 à 6 semaines" data-testid="input-delivery-delay" />
                      </FormControl>
                      <FormMessage data-testid="error-delivery-delay" />
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

                {/* Warranty */}
                <FormField
                  control={form.control}
                  name="warranty"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Garantie</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} placeholder="1 an" data-testid="input-warranty" />
                      </FormControl>
                      <FormMessage data-testid="error-warranty" />
                    </FormItem>
                  )}
                />
              </div>

              {/* Client Address */}
              <FormField
                control={form.control}
                name="clientAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adresse Client</FormLabel>
                    <FormControl>
                      <Textarea {...field} value={field.value || ""} placeholder="Adresse complète du client" data-testid="input-client-address" rows={2} />
                    </FormControl>
                    <FormMessage data-testid="error-client-address" />
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
              disabled={selectedArticles.length === 0 || createClientQuoteMutation.isPending}
              data-testid="button-submit"
            >
              {createClientQuoteMutation.isPending ? (
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
            <DialogTitle data-testid="dialog-title">Aperçu du Devis Client</DialogTitle>
            <DialogDescription data-testid="dialog-description">
              Vérifiez les informations avant de créer le devis
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
              disabled={createClientQuoteMutation.isPending}
              data-testid="button-confirm-create"
            >
              {createClientQuoteMutation.isPending ? (
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
