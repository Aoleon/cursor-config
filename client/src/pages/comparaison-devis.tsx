import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  ArrowLeft, 
  Download, 
  Filter, 
  SortAsc, 
  SortDesc,
  RefreshCw,
  Eye,
  Edit,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  TrendingUp,
  TrendingDown,
  Target,
  FileText,
  Euro,
  Calendar,
  Award,
  Settings,
  MessageSquare,
  Star,
  ThumbsUp,
  ThumbsDown,
  BarChart3
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { ExportPdfButton } from "@/components/comparaison/ExportPdfButton";
import { ScoringSystem } from "@/components/comparaison/ScoringSystem";

// Types pour la comparaison des devis
interface SupplierComparison {
  supplierId: string;
  supplierName: string;
  supplierInfo: {
    email?: string;
    phone?: string;
    city?: string;
    specializations?: string[];
  };
  sessionId: string;
  sessionStatus: string;
  analysisId?: string | null; // CORRECTION CRITIQUE: Ajouter analysisId pour les notes
  invitedAt?: string;
  submittedAt?: string;
  ocrData?: {
    totalAmountHT?: number;
    totalAmountTTC?: number;
    vatRate?: number;
    currency?: string;
    deliveryDelay?: number;
    paymentTerms?: string;
    validityPeriod?: number;
    materials?: any;
    lineItems?: any[];
    confidence?: number;
    qualityScore?: number;
    completenessScore?: number;
    requiresManualReview?: boolean;
    analyzedAt?: string;
    analysisEngine?: string;
  };
  analysisStats: {
    totalAnalyses: number;
    completedAnalyses: number;
    failedAnalyses: number;
    averageQuality: number;
    averageCompleteness: number;
    requiresReview: number;
  };
  documents: Array<{
    id: string;
    filename: string;
    originalName: string;
    documentType: string;
    isMainQuote: boolean;
    uploadedAt: string;
  }>;
  notes?: string;
  lastReviewedAt?: string;
  reviewedBy?: string;
}

interface ComparisonMetrics {
  totalSuppliers: number;
  validAnalyses: number;
  priceRange?: {
    min: number;
    max: number;
    average: number;
  };
  deliveryRange?: {
    min: number;
    max: number;
    average: number;
  };
  bestPrice?: number;
  fastestDelivery?: number;
}

interface ComparisonData {
  aoLotId: string;
  lot: {
    id: string;
    numero: string;
    designation: string;
    menuiserieType?: string;
    montantEstime?: number;
  };
  suppliers: SupplierComparison[];
  metrics: ComparisonMetrics;
  sortedBy: string;
  sortOrder: string;
  generatedAt: string;
}

// Options de tri
const SORT_OPTIONS = [
  { value: 'price', label: 'Prix HT', icon: Euro },
  { value: 'delivery', label: 'Délai livraison', icon: Calendar },
  { value: 'quality', label: 'Qualité OCR', icon: Award },
  { value: 'completeness', label: 'Complétude', icon: BarChart3 }
];

// Options de statut pour filtrage
const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'Tous les statuts' },
  { value: 'completed', label: 'Analysé' },
  { value: 'pending', label: 'En cours' },
  { value: 'failed', label: 'Échec' }
];

// Options de vue
const VIEW_MODES = [
  { value: 'summary', label: 'Résumé' },
  { value: 'detailed', label: 'Détaillé' }
];

export default function ComparaisonDevis() {
  const { aoLotId } = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // États locaux
  const [sortBy, setSortBy] = useState('price');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'summary' | 'detailed'>('summary');
  const [includeRawOcr, setIncludeRawOcr] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);
  const [showNotesDialog, setShowNotesDialog] = useState(false);
  const [editingNotes, setEditingNotes] = useState('');
  const [editingAnalysisId, setEditingAnalysisId] = useState<string | null>(null);

  // Requête principale pour récupérer les données de comparaison
  const { 
    data: comparisonData, 
    isLoading, 
    error, 
    refetch 
  } = useQuery<ComparisonData>({
    queryKey: ['/api/ao-lots', aoLotId, 'comparison', { sortBy, sortOrder, status: statusFilter, includeRawOcr }],
    enabled: !!aoLotId,
  });

  // Mutation pour sélectionner un fournisseur
  const selectSupplierMutation = useMutation({
    mutationFn: async (data: { supplierId: string; analysisId?: string; selectionReason?: string; notes?: string }) => {
      const response = await fetch(`/api/ao-lots/${aoLotId}/select-supplier`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Erreur lors de la sélection');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Fournisseur sélectionné",
        description: "Le fournisseur a été sélectionné avec succès.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ao-lots', aoLotId, 'comparison'] });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible de sélectionner le fournisseur.",
        variant: "destructive",
      });
    }
  });

  // Mutation pour mettre à jour les notes
  const updateNotesMutation = useMutation({
    mutationFn: async (data: { analysisId: string; notes: string; isInternal?: boolean }) => {
      const response = await fetch(`/api/supplier-quote-analysis/${data.analysisId}/notes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: data.notes, isInternal: data.isInternal || false })
      });
      if (!response.ok) throw new Error('Erreur lors de la mise à jour');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Notes mises à jour",
        description: "Les notes ont été sauvegardées avec succès.",
      });
      setShowNotesDialog(false);
      setEditingNotes('');
      setEditingAnalysisId(null);
      queryClient.invalidateQueries({ queryKey: ['/api/ao-lots', aoLotId, 'comparison'] });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder les notes.",
        variant: "destructive",
      });
    }
  });

  // Fonction pour formater les prix
  const formatPrice = (price?: number, currency: string = 'EUR') => {
    if (price == null) return '-';
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency,
    }).format(price);
  };

  // Fonction pour formater les délais
  const formatDelay = (days?: number) => {
    if (days == null) return '-';
    if (days === 0) return 'Immédiat';
    if (days === 1) return '1 jour';
    return `${days} jours`;
  };

  // Fonction pour obtenir le badge de qualité OCR
  const getQualityBadge = (score?: number, requiresReview?: boolean) => {
    if (requiresReview) {
      return <Badge variant="destructive" data-testid="badge-quality-review">Révision requise</Badge>;
    }
    if (score == null) return <Badge variant="secondary" data-testid="badge-quality-none">Non analysé</Badge>;
    
    if (score >= 80) return <Badge variant="default" className="bg-green-100 text-green-800" data-testid="badge-quality-excellent">Excellent ({score}%)</Badge>;
    if (score >= 60) return <Badge variant="default" className="bg-yellow-100 text-yellow-800" data-testid="badge-quality-good">Bon ({score}%)</Badge>;
    if (score >= 40) return <Badge variant="default" className="bg-orange-100 text-orange-800" data-testid="badge-quality-average">Moyen ({score}%)</Badge>;
    return <Badge variant="destructive" data-testid="badge-quality-poor">Faible ({score}%)</Badge>;
  };

  // Fonction pour déterminer si c'est la meilleure offre
  const isBestOffer = (supplier: SupplierComparison, metric: 'price' | 'delivery') => {
    if (!comparisonData) return false;
    
    const validSuppliers = comparisonData.suppliers.filter(s => s.ocrData);
    if (validSuppliers.length === 0) return false;
    
    if (metric === 'price') {
      const prices = validSuppliers.map(s => s.ocrData!.totalAmountHT).filter(p => p != null);
      if (prices.length === 0) return false;
      const minPrice = Math.min(...prices);
      return supplier.ocrData?.totalAmountHT === minPrice;
    }
    
    if (metric === 'delivery') {
      const delays = validSuppliers.map(s => s.ocrData!.deliveryDelay).filter(d => d != null);
      if (delays.length === 0) return false;
      const minDelay = Math.min(...delays);
      return supplier.ocrData?.deliveryDelay === minDelay;
    }
    
    return false;
  };


  // Fonction pour ouvrir le dialog de notes - CORRECTION CRITIQUE
  const openNotesDialog = (supplier: SupplierComparison) => {
    // Vérifier qu'on a une analyse et un analysisId valide
    if (supplier.ocrData && supplier.analysisId) {
      setEditingNotes(supplier.notes || '');
      setEditingAnalysisId(supplier.analysisId); // CORRECTION: Utiliser analysisId au lieu de sessionId
      setShowNotesDialog(true);
    } else {
      toast({
        title: "Erreur",
        description: "Aucune analyse valide trouvée pour ce fournisseur.",
        variant: "destructive",
      });
    }
  };

  if (!aoLotId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">ID de lot manquant</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center" data-testid="loading-comparison">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Chargement de la comparaison...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card>
          <CardContent className="p-6 text-center">
            <XCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 mb-4">Erreur lors du chargement</p>
            <Button onClick={() => refetch()} data-testid="button-retry">
              Réessayer
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!comparisonData || comparisonData.suppliers.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/aos" data-testid="link-back-aos">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Button>
            </Link>
            <h1 className="text-2xl font-semibold">Comparaison des devis</h1>
          </div>
        </div>
        
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">Aucun devis à comparer</h3>
            <p className="text-muted-foreground mb-4">
              Aucun fournisseur n'a encore soumis de devis pour ce lot.
            </p>
            <Button variant="outline" data-testid="button-manage-suppliers">
              Gérer les fournisseurs
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* En-tête avec navigation et actions */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Link href="/aos" data-testid="link-back-aos">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold" data-testid="title-comparison">
              Comparaison des devis
            </h1>
            <p className="text-sm text-muted-foreground">
              Lot {comparisonData.lot.numero} - {comparisonData.lot.designation}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <ExportPdfButton comparisonData={comparisonData} />
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetch()}
            data-testid="button-refresh"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Métriques globales */}
      {comparisonData.metrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card data-testid="card-total-suppliers">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Fournisseurs</p>
                  <p className="text-2xl font-semibold">{comparisonData.metrics.totalSuppliers}</p>
                </div>
                <Target className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card data-testid="card-valid-analyses">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Analyses validées</p>
                  <p className="text-2xl font-semibold">{comparisonData.metrics.validAnalyses}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          {comparisonData.metrics.bestPrice && (
            <Card data-testid="card-best-price">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Meilleur prix</p>
                    <p className="text-2xl font-semibold">{formatPrice(comparisonData.metrics.bestPrice)}</p>
                  </div>
                  <TrendingDown className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
          )}
          
          {comparisonData.metrics.fastestDelivery && (
            <Card data-testid="card-fastest-delivery">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Délai le plus court</p>
                    <p className="text-2xl font-semibold">{formatDelay(comparisonData.metrics.fastestDelivery)}</p>
                  </div>
                  <Clock className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Filtres et options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtres et options
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Tri */}
            <div className="space-y-2">
              <Label htmlFor="sort-by">Trier par</Label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger data-testid="select-sort-by">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <option.icon className="h-4 w-4" />
                        {option.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Ordre de tri */}
            <div className="space-y-2">
              <Label htmlFor="sort-order">Ordre</Label>
              <Select value={sortOrder} onValueChange={(value: 'asc' | 'desc') => setSortOrder(value)}>
                <SelectTrigger data-testid="select-sort-order">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">
                    <div className="flex items-center gap-2">
                      <SortAsc className="h-4 w-4" />
                      Croissant
                    </div>
                  </SelectItem>
                  <SelectItem value="desc">
                    <div className="flex items-center gap-2">
                      <SortDesc className="h-4 w-4" />
                      Décroissant
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filtre par statut */}
            <div className="space-y-2">
              <Label htmlFor="status-filter">Statut analyses</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger data-testid="select-status-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_FILTER_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Mode de vue */}
            <div className="space-y-2">
              <Label htmlFor="view-mode">Mode d'affichage</Label>
              <Select value={viewMode} onValueChange={(value: 'summary' | 'detailed') => setViewMode(value)}>
                <SelectTrigger data-testid="select-view-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VIEW_MODES.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="mt-4 flex items-center space-x-2">
            <Switch
              id="include-raw-ocr"
              checked={includeRawOcr}
              onCheckedChange={setIncludeRawOcr}
              data-testid="switch-include-raw-ocr"
            />
            <Label htmlFor="include-raw-ocr">Inclure les données OCR brutes</Label>
          </div>
        </CardContent>
      </Card>

      {/* Tableau de comparaison - Desktop */}
      <div className="hidden md:block">
        <Card>
          <CardHeader>
            <CardTitle>Comparaison des offres</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table data-testid="table-comparison">
                <TableHeader>
                <TableRow>
                  <TableHead className="w-48 sticky left-0 bg-background">Critères</TableHead>
                  {comparisonData.suppliers.map((supplier) => (
                    <TableHead key={supplier.supplierId} className="min-w-64 text-center">
                      <div className="space-y-1">
                        <div className="font-semibold" data-testid={`supplier-name-${supplier.supplierId}`}>
                          {supplier.supplierName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {supplier.supplierInfo.city && `${supplier.supplierInfo.city} • `}
                          {supplier.analysisStats.completedAnalyses} analyse(s)
                        </div>
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Ligne prix HT */}
                <TableRow data-testid="row-price">
                  <TableCell className="font-medium sticky left-0 bg-background">
                    <div className="flex items-center gap-2">
                      <Euro className="h-4 w-4" />
                      Prix HT
                    </div>
                  </TableCell>
                  {comparisonData.suppliers.map((supplier) => (
                    <TableCell key={supplier.supplierId} className="text-center" data-testid={`row-supplier-${supplier.supplierId}`}>
                      <div className={cn(
                        "font-semibold p-2 rounded",
                        isBestOffer(supplier, 'price') && "bg-green-100 text-green-800"
                      )} data-testid={`amount-supplier-${supplier.supplierId}`}>
                        {formatPrice(supplier.ocrData?.totalAmountHT)}
                        {isBestOffer(supplier, 'price') && (
                          <Badge variant="default" className="ml-2 bg-green-600" data-testid="badge-best-supplier">
                            Meilleur prix
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                  ))}
                </TableRow>

                {/* Ligne prix TTC */}
                <TableRow>
                  <TableCell className="font-medium sticky left-0 bg-background">
                    <div className="flex items-center gap-2">
                      <Euro className="h-4 w-4" />
                      Prix TTC
                    </div>
                  </TableCell>
                  {comparisonData.suppliers.map((supplier) => (
                    <TableCell key={supplier.supplierId} className="text-center" data-testid={`price-ttc-${supplier.supplierId}`}>
                      {formatPrice(supplier.ocrData?.totalAmountTTC)}
                      {supplier.ocrData?.vatRate && (
                        <div className="text-xs text-muted-foreground">TVA {supplier.ocrData.vatRate}%</div>
                      )}
                    </TableCell>
                  ))}
                </TableRow>

                {/* Ligne délai de livraison */}
                <TableRow>
                  <TableCell className="font-medium sticky left-0 bg-background">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Délai livraison
                    </div>
                  </TableCell>
                  {comparisonData.suppliers.map((supplier) => (
                    <TableCell key={supplier.supplierId} className="text-center">
                      <div className={cn(
                        "p-2 rounded",
                        isBestOffer(supplier, 'delivery') && "bg-blue-100 text-blue-800"
                      )} data-testid={`delivery-${supplier.supplierId}`}>
                        {formatDelay(supplier.ocrData?.deliveryDelay)}
                        {isBestOffer(supplier, 'delivery') && (
                          <Star className="h-4 w-4 inline ml-1" />
                        )}
                      </div>
                    </TableCell>
                  ))}
                </TableRow>

                {/* Ligne conditions de paiement */}
                <TableRow>
                  <TableCell className="font-medium sticky left-0 bg-background">
                    Conditions paiement
                  </TableCell>
                  {comparisonData.suppliers.map((supplier) => (
                    <TableCell key={supplier.supplierId} className="text-center text-sm" data-testid={`payment-terms-${supplier.supplierId}`}>
                      {supplier.ocrData?.paymentTerms || '-'}
                    </TableCell>
                  ))}
                </TableRow>

                {/* Ligne validité */}
                <TableRow>
                  <TableCell className="font-medium sticky left-0 bg-background">
                    Validité du devis
                  </TableCell>
                  {comparisonData.suppliers.map((supplier) => (
                    <TableCell key={supplier.supplierId} className="text-center text-sm" data-testid={`validity-${supplier.supplierId}`}>
                      {supplier.ocrData?.validityPeriod ? `${supplier.ocrData.validityPeriod} jours` : '-'}
                    </TableCell>
                  ))}
                </TableRow>

                {/* Ligne qualité OCR */}
                <TableRow>
                  <TableCell className="font-medium sticky left-0 bg-background">
                    <div className="flex items-center gap-2">
                      <Award className="h-4 w-4" />
                      Qualité OCR
                    </div>
                  </TableCell>
                  {comparisonData.suppliers.map((supplier) => (
                    <TableCell key={supplier.supplierId} className="text-center" data-testid={`score-supplier-${supplier.supplierId}`}>
                      {getQualityBadge(supplier.ocrData?.qualityScore, supplier.ocrData?.requiresManualReview)}
                      {supplier.ocrData?.confidence && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Confiance: {supplier.ocrData.confidence}%
                        </div>
                      )}
                    </TableCell>
                  ))}
                </TableRow>

                {/* Ligne actions */}
                <TableRow>
                  <TableCell className="font-medium sticky left-0 bg-background">
                    Actions
                  </TableCell>
                  {comparisonData.suppliers.map((supplier) => (
                    <TableCell key={supplier.supplierId} className="text-center">
                      <div className="flex flex-col gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openNotesDialog(supplier)}
                          data-testid={`button-notes-${supplier.supplierId}`}
                        >
                          <MessageSquare className="h-4 w-4 mr-1" />
                          Notes
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="default"
                              disabled={!supplier.ocrData}
                              data-testid={`button-select-supplier-${supplier.supplierId}`}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Sélectionner
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmer la sélection</AlertDialogTitle>
                              <AlertDialogDescription>
                                Voulez-vous sélectionner {supplier.supplierName} pour ce lot ?
                                Prix: {formatPrice(supplier.ocrData?.totalAmountHT)}
                                Délai: {formatDelay(supplier.ocrData?.deliveryDelay)}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => selectSupplierMutation.mutate({
                                  supplierId: supplier.supplierId,
                                  selectionReason: `Sélectionné via comparaison - Prix: ${formatPrice(supplier.ocrData?.totalAmountHT)}`
                                })}
                                data-testid={`button-confirm-select-${supplier.supplierId}`}
                              >
                                Confirmer
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  ))}
                </TableRow>
              </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Vue mobile - Cards empilées */}
      <div className="md:hidden space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Comparaison des offres (mobile)</CardTitle>
            <p className="text-sm text-muted-foreground">
              {comparisonData.suppliers.length} fournisseur(s) à comparer
            </p>
          </CardHeader>
        </Card>
        
        {comparisonData.suppliers.map((supplier, index) => (
          <Card key={supplier.supplierId} className="w-full" data-testid={`mobile-card-${supplier.supplierId}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{supplier.supplierName}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {supplier.supplierInfo.city && `${supplier.supplierInfo.city} • `}
                    {supplier.analysisStats.completedAnalyses} analyse(s)
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary">
                    #{index + 1}
                  </div>
                  {getQualityBadge(supplier.ocrData?.qualityScore, supplier.ocrData?.requiresManualReview)}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Prix */}
              <div className="grid grid-cols-2 gap-4">
                <div className={cn(
                  "p-3 rounded-lg border-2",
                  isBestOffer(supplier, 'price') 
                    ? "border-green-200 bg-green-50" 
                    : "border-gray-200 bg-gray-50"
                )}>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Prix HT</div>
                  <div className="text-lg font-bold flex items-center gap-1">
                    {formatPrice(supplier.ocrData?.totalAmountHT)}
                    {isBestOffer(supplier, 'price') && (
                      <Star className="h-4 w-4 text-green-600" />
                    )}
                  </div>
                </div>
                
                <div className={cn(
                  "p-3 rounded-lg border-2",
                  isBestOffer(supplier, 'delivery') 
                    ? "border-blue-200 bg-blue-50" 
                    : "border-gray-200 bg-gray-50"
                )}>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Délai</div>
                  <div className="text-lg font-bold flex items-center gap-1">
                    {formatDelay(supplier.ocrData?.deliveryDelay)}
                    {isBestOffer(supplier, 'delivery') && (
                      <Star className="h-4 w-4 text-blue-600" />
                    )}
                  </div>
                </div>
              </div>

              {/* Détails supplémentaires */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Prix TTC:</span>
                  <span className="font-medium">{formatPrice(supplier.ocrData?.totalAmountTTC)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Paiement:</span>
                  <span className="font-medium">{supplier.ocrData?.paymentTerms || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Validité:</span>
                  <span className="font-medium">
                    {supplier.ocrData?.validityPeriod ? `${supplier.ocrData.validityPeriod} jours` : '-'}
                  </span>
                </div>
              </div>

              {/* Actions mobile */}
              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => openNotesDialog(supplier)}
                  data-testid={`mobile-button-notes-${supplier.supplierId}`}
                >
                  <MessageSquare className="h-4 w-4 mr-1" />
                  Notes
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="default"
                      className="flex-1"
                      disabled={!supplier.ocrData}
                      data-testid={`mobile-button-select-${supplier.supplierId}`}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Sélectionner
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirmer la sélection</AlertDialogTitle>
                      <AlertDialogDescription>
                        Voulez-vous sélectionner {supplier.supplierName} pour ce lot ?<br/>
                        Prix: {formatPrice(supplier.ocrData?.totalAmountHT)}<br/>
                        Délai: {formatDelay(supplier.ocrData?.deliveryDelay)}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => selectSupplierMutation.mutate({
                          supplierId: supplier.supplierId,
                          selectionReason: `Sélectionné via comparaison mobile - Prix: ${formatPrice(supplier.ocrData?.totalAmountHT)}`
                        })}
                        data-testid={`mobile-button-confirm-select-${supplier.supplierId}`}
                      >
                        Confirmer
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Système de notation personnalisé */}
      <ScoringSystem 
        suppliers={comparisonData.suppliers}
        metrics={comparisonData.metrics}
      />

      {/* Vue détaillée en mode avancé */}
      {viewMode === 'detailed' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {comparisonData.suppliers.map((supplier) => (
            <Card key={supplier.supplierId} data-testid={`card-detailed-${supplier.supplierId}`}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{supplier.supplierName}</span>
                  {getQualityBadge(supplier.ocrData?.qualityScore, supplier.ocrData?.requiresManualReview)}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Informations fournisseur */}
                <div>
                  <h4 className="font-medium mb-2">Informations fournisseur</h4>
                  <div className="text-sm space-y-1">
                    {supplier.supplierInfo.email && (
                      <p>Email: {supplier.supplierInfo.email}</p>
                    )}
                    {supplier.supplierInfo.phone && (
                      <p>Tél: {supplier.supplierInfo.phone}</p>
                    )}
                    {supplier.supplierInfo.city && (
                      <p>Ville: {supplier.supplierInfo.city}</p>
                    )}
                    {supplier.supplierInfo.specializations && supplier.supplierInfo.specializations.length > 0 && (
                      <div>
                        <p>Spécialisations:</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {supplier.supplierInfo.specializations.map((spec, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">{spec}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Détails de l'offre */}
                {supplier.ocrData && (
                  <div>
                    <h4 className="font-medium mb-2">Détails de l'offre</h4>
                    <div className="text-sm space-y-2">
                      <div className="flex justify-between">
                        <span>Prix HT:</span>
                        <span className="font-medium">{formatPrice(supplier.ocrData.totalAmountHT)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Prix TTC:</span>
                        <span className="font-medium">{formatPrice(supplier.ocrData.totalAmountTTC)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Délai:</span>
                        <span>{formatDelay(supplier.ocrData.deliveryDelay)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Validité:</span>
                        <span>{supplier.ocrData.validityPeriod ? `${supplier.ocrData.validityPeriod} jours` : '-'}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Statistiques d'analyse */}
                <div>
                  <h4 className="font-medium mb-2">Analyse OCR</h4>
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span>Analyses complètes:</span>
                      <span>{supplier.analysisStats.completedAnalyses}/{supplier.analysisStats.totalAnalyses}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Qualité moyenne:</span>
                      <span>{supplier.analysisStats.averageQuality}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Complétude moyenne:</span>
                      <span>{supplier.analysisStats.averageCompleteness}%</span>
                    </div>
                  </div>
                </div>

                {/* Documents */}
                <div>
                  <h4 className="font-medium mb-2">Documents ({supplier.documents.length})</h4>
                  <div className="space-y-1">
                    {supplier.documents.slice(0, 3).map((doc) => (
                      <div key={doc.id} className="text-xs flex items-center justify-between">
                        <span className="truncate">{doc.originalName}</span>
                        {doc.isMainQuote && (
                          <Badge variant="secondary" className="text-xs">Principal</Badge>
                        )}
                      </div>
                    ))}
                    {supplier.documents.length > 3 && (
                      <p className="text-xs text-muted-foreground">
                        +{supplier.documents.length - 3} autres documents
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog pour les notes */}
      <Dialog open={showNotesDialog} onOpenChange={setShowNotesDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter/Modifier des notes</DialogTitle>
            <DialogDescription>
              Ajoutez des commentaires ou observations sur cette analyse.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Saisissez vos notes ici..."
              value={editingNotes}
              onChange={(e) => setEditingNotes(e.target.value)}
              rows={6}
              data-testid="textarea-notes"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowNotesDialog(false)}
              data-testid="button-cancel-notes"
            >
              Annuler
            </Button>
            <Button
              onClick={() => {
                if (editingAnalysisId) {
                  updateNotesMutation.mutate({
                    analysisId: editingAnalysisId,
                    notes: editingNotes,
                    isInternal: false
                  });
                }
              }}
              disabled={updateNotesMutation.isPending}
              data-testid="button-save-notes"
            >
              {updateNotesMutation.isPending ? "Sauvegarde..." : "Sauvegarder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}