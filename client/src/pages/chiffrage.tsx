import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
  Plus,
  Calculator,
  FileText,
  Save,
  CheckCircle,
  Trash2,
  Edit,
  Copy,
  Settings,
  Download,
  Truck,
  Send,
  Eye,
  Check
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

// Schéma pour un élément de chiffrage
const chiffrageElementSchema = z.object({
  category: z.string().min(1, "Catégorie requise"),
  subcategory: z.string().optional().default(""),
  designation: z.string().min(1, "Désignation requise"),
  unit: z.string().min(1, "Unité requise"),
  quantity: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, "Quantité valide requise"),
  unitPrice: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, "Prix unitaire valide requis"),
  coefficient: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, "Coefficient valide requis").default("1.00"),
  marginPercentage: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, "Marge valide requise").default("20.00"),
  supplier: z.string().optional().default(""),
  supplierRef: z.string().optional().default(""),
  isOptional: z.boolean().default(false),
  notes: z.string().optional().default(""),
  position: z.number().default(0),
});

type ChiffrageElementFormData = z.infer<typeof chiffrageElementSchema>;

const categories = [
  { value: "menuiseries_exterieures", label: "Menuiseries extérieures" },
  { value: "menuiseries_interieures", label: "Menuiseries intérieures" },
  { value: "main_oeuvre", label: "Main d'œuvre" },
  { value: "fournitures", label: "Fournitures" },
  { value: "transport", label: "Transport" },
  { value: "autres", label: "Autres" },
];

const units = [
  { value: "m²", label: "m² (mètre carré)" },
  { value: "ml", label: "ml (mètre linéaire)" },
  { value: "u", label: "u (unité)" },
  { value: "h", label: "h (heure)" },
  { value: "j", label: "j (jour)" },
  { value: "kg", label: "kg (kilogramme)" },
  { value: "forfait", label: "forfait" },
];

export default function Chiffrage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showElementDialog, setShowElementDialog] = useState(false);
  const [editingElement, setEditingElement] = useState<any>(null);
  const [showDpgfDialog, setShowDpgfDialog] = useState(false);
  const [showSupplierRequestDialog, setShowSupplierRequestDialog] = useState(false);
  const [selectedLots, setSelectedLots] = useState<string[]>([]);
  const [elementToDelete, setElementToDelete] = useState<any>(null);

  // Récupérer l'offre
  const { data: offer, isLoading: offerLoading } = useQuery<any>({
    queryKey: [`/api/offers/${id}`],
    enabled: !!id,
  });

  // Récupérer les éléments de chiffrage
  const { data: chiffrageElements = [], isLoading: elementsLoading } = useQuery<any[]>({
    queryKey: [`/api/offers/${id}/chiffrage-elements`],
    enabled: !!id,
  });

  // Récupérer le DPGF actuel
  const { data: dpgfDocument, isLoading: dpgfLoading } = useQuery<any>({
    queryKey: [`/api/offers/${id}/dpgf`],
    enabled: !!id,
  });

  // Récupérer les lots de l'AO
  const { data: aoLots = [] } = useQuery<any[]>({
    queryKey: [`/api/aos/${offer?.aoId}/lots`],
    enabled: !!offer?.aoId,
  });

  // Récupérer les demandes fournisseurs
  const { data: supplierRequests = [] } = useQuery<any[]>({
    queryKey: [`/api/offers/${id}/supplier-requests`],
    enabled: !!id,
  });

  // Form pour nouvel élément
  const elementForm = useForm<ChiffrageElementFormData>({
    resolver: zodResolver(chiffrageElementSchema),
    defaultValues: {
      category: "",
      subcategory: "",
      designation: "",
      unit: "u",
      quantity: "1",
      unitPrice: "0",
      coefficient: "1.00",
      marginPercentage: "20.00",
      supplier: "",
      supplierRef: "",
      isOptional: false,
      notes: "",
      position: 0,
    },
  });

  // Mutation pour créer/modifier un élément
  const createElementMutation = useMutation({
    mutationFn: async (data: ChiffrageElementFormData & { id?: string }) => {
      const url = data.id 
        ? `/api/offers/${id}/chiffrage-elements/${data.id}`
        : `/api/offers/${id}/chiffrage-elements`;
      
      // Calculer le prix total
      const qty = parseFloat(data.quantity);
      const price = parseFloat(data.unitPrice);
      const coeff = parseFloat(data.coefficient);
      const totalPrice = qty * price * coeff;

      const payload = {
        offerId: id,
        category: data.category,
        subcategory: data.subcategory || "",
        designation: data.designation,
        unit: data.unit,
        quantity: data.quantity,
        unitPrice: data.unitPrice,
        totalPrice: totalPrice.toString(),
        coefficient: data.coefficient,
        marginPercentage: data.marginPercentage,
        supplier: data.supplier || "",
        supplierRef: data.supplierRef || "",
        position: data.position || 0,
        isOptional: data.isOptional || false,
        notes: data.notes || "",
      };

      console.log("Sending payload:", payload);

      const response = await fetch(url, {
        method: data.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error("Error response:", errorData);
        throw new Error(`Erreur lors de la sauvegarde: ${response.status} ${errorData}`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/offers/${id}/chiffrage-elements`] });
      setShowElementDialog(false);
      setEditingElement(null);
      elementForm.reset();
      toast({
        title: "Élément sauvegardé",
        description: "L'élément de chiffrage a été enregistré avec succès.",
      });
    },
    onError: (error) => {
      console.error("Mutation error:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de sauvegarder l'élément",
        variant: "destructive",
      });
    },
  });

  // Mutation pour supprimer un élément
  const deleteElementMutation = useMutation({
    mutationFn: async (elementId: string) => {
      const response = await fetch(`/api/offers/${id}/chiffrage-elements/${elementId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Erreur lors de la suppression");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/offers/${id}/chiffrage-elements`] });
      toast({
        title: "Élément supprimé",
        description: `Élément "${elementToDelete?.designation}" supprimé avec succès.`,
      });
      setElementToDelete(null);
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'élément",
        variant: "destructive",
      });
      setElementToDelete(null);
    },
  });

  const confirmDeleteElement = () => {
    if (elementToDelete) {
      deleteElementMutation.mutate(elementToDelete.id);
    }
  };

  // Mutation pour générer le DPGF
  const generateDpgfMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/offers/${id}/dpgf/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Erreur lors de la génération du DPGF");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/offers/${id}/dpgf`] });
      toast({
        title: "DPGF généré",
        description: "Le Document Provisoire de Gestion Financière a été généré.",
      });
    },
  });

  // Mutation pour valider la fin d'études
  const validateStudiesMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/offers/${id}/validate-studies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Erreur lors de la validation");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/offers/${id}`] });
      toast({
        title: "Fin d'études validée",
        description: "Le jalon 'Fin d'études' a été validé. Le dossier peut maintenant être transformé en projet.",
      });
    },
  });

  // Mutation pour transformer l'offre en projet
  const transformToProjectMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/offers/${id}/transform-to-project`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Erreur lors de la transformation");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/offers/${id}`] });
      toast({
        title: "Projet créé",
        description: `Le dossier a été transformé en projet (${data.projectId}). Redirection vers le projet...`,
      });
      // Redirection vers le nouveau projet après 2 secondes
      setTimeout(() => {
        window.location.href = `/projects/${data.projectId}`;
      }, 2000);
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de transformer en projet",
        variant: "destructive",
      });
    },
  });

  const handleEditElement = (element: any) => {
    setEditingElement(element);
    elementForm.reset({
      category: element.category,
      subcategory: element.subcategory || "",
      designation: element.designation,
      unit: element.unit,
      quantity: element.quantity?.toString() || "1",
      unitPrice: element.unitPrice?.toString() || "0",
      coefficient: element.coefficient?.toString() || "1.00",
      marginPercentage: element.marginPercentage?.toString() || "20.00",
      supplier: element.supplier || "",
      supplierRef: element.supplierRef || "",
      isOptional: element.isOptional || false,
      notes: element.notes || "",
      position: element.position || 0,
    });
    setShowElementDialog(true);
  };

  const handleSubmitElement = (data: ChiffrageElementFormData) => {
    createElementMutation.mutate({
      ...data,
      id: editingElement?.id,
    });
  };

  const handleViewSupplierRequest = (request: any) => {
    // TODO: Implémenter la vue détaillée du devis
    toast({
      title: "Détail du devis",
      description: `Devis de ${request.supplierName}: ${request.quotationAmount ? Number(request.quotationAmount).toLocaleString('fr-FR') + ' €' : 'En attente'}`,
    });
  };

  const handleMarkAsReceived = async (request: any) => {
    // TODO: Implémenter la mise à jour du statut
    toast({
      title: "Devis reçu",
      description: `Le devis de ${request.supplierName} a été marqué comme reçu.`,
    });
  };

  // Calcul des totaux
  const calculateTotals = () => {
    const totalHT = chiffrageElements.reduce((sum, el) => sum + parseFloat(el.totalPrice || 0), 0);
    const totalTVA = totalHT * 0.20; // 20% TVA
    const totalTTC = totalHT + totalTVA;
    
    return {
      totalHT: totalHT.toFixed(2),
      totalTVA: totalTVA.toFixed(2),
      totalTTC: totalTTC.toFixed(2),
    };
  };

  const totals = calculateTotals();

  if (offerLoading) {
    return <div className="flex items-center justify-center min-h-screen">Chargement...</div>;
  }

  if (!offer) {
    return <div className="flex items-center justify-center min-h-screen">Offre non trouvée</div>;
  }

  return (
    <div className="container mx-auto p-4 sm:p-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
        <Link href="/offers">
          <Button variant="ghost" size="sm" data-testid="button-back">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour aux offres
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Module de Chiffrage</h1>
          <p className="text-muted-foreground">
            Offre {offer.reference} - {offer.client}
          </p>
        </div>
        <div className="ml-auto flex gap-2">
          <Badge variant={offer.status === "en_chiffrage" ? "default" : "secondary"}>
            {offer.status}
          </Badge>
          {offer.finEtudesValidatedAt && (
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              <CheckCircle className="h-4 w-4 mr-1" />
              Fin d'études validée
            </Badge>
          )}
        </div>
      </div>

      <Tabs defaultValue="elements" className="space-y-6">
        <TabsList className="grid grid-cols-1 sm:grid-cols-3 w-full max-w-2xl">
          <TabsTrigger value="elements" data-testid="tab-elements">
            <Calculator className="h-4 w-4 mr-2" />
            Éléments de chiffrage
          </TabsTrigger>
          <TabsTrigger value="suppliers" data-testid="tab-suppliers">
            <Truck className="h-4 w-4 mr-2" />
            Demandes Fournisseurs
          </TabsTrigger>
          <TabsTrigger value="dpgf" data-testid="tab-dpgf">
            <FileText className="h-4 w-4 mr-2" />
            DPGF
          </TabsTrigger>
        </TabsList>

        {/* Onglet Éléments de chiffrage */}
        <TabsContent value="elements" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Éléments de chiffrage</h2>
            <Button onClick={() => setShowElementDialog(true)} data-testid="button-add-element">
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un élément
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Catégorie</TableHead>
                    <TableHead>Désignation</TableHead>
                    <TableHead>Quantité</TableHead>
                    <TableHead>Prix U.</TableHead>
                    <TableHead>Total HT</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {chiffrageElements.map((element) => (
                    <TableRow key={element.id}>
                      <TableCell>
                        <Badge variant="outline">
                          {categories.find(c => c.value === element.category)?.label || element.category}
                        </Badge>
                      </TableCell>
                      <TableCell>{element.designation}</TableCell>
                      <TableCell>{element.quantity} {element.unit}</TableCell>
                      <TableCell>{parseFloat(element.unitPrice).toFixed(2)} €</TableCell>
                      <TableCell className="font-medium">
                        {parseFloat(element.totalPrice).toFixed(2)} €
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditElement(element)}
                                  data-testid={`button-edit-${element.id}`}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Modifier l'élément</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          
                          <TooltipProvider>
                            <Tooltip>
                              <AlertDialog open={elementToDelete?.id === element.id} onOpenChange={(open) => !open && setElementToDelete(null)}>
                                <AlertDialogTrigger asChild>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setElementToDelete(element)}
                                      data-testid={`button-delete-${element.id}`}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                </AlertDialogTrigger>
                                <TooltipContent>
                                  <p>Supprimer l'élément</p>
                                </TooltipContent>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Supprimer l'élément de chiffrage</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Êtes-vous sûr de vouloir supprimer l'élément <strong>"{element.designation}"</strong> ?
                                      Cette action est irréversible et supprimera définitivement cet élément du chiffrage.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                                    <AlertDialogAction onClick={confirmDeleteElement} className="bg-red-600 hover:bg-red-700">
                                      Supprimer
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {chiffrageElements.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Aucun élément de chiffrage. Commencez par ajouter un élément.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Résumé des totaux */}
          <Card>
            <CardHeader>
              <CardTitle>Résumé du chiffrage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{totals.totalHT} €</div>
                  <div className="text-sm text-muted-foreground">Total HT</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{totals.totalTVA} €</div>
                  <div className="text-sm text-muted-foreground">TVA (20%)</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{totals.totalTTC} €</div>
                  <div className="text-sm text-muted-foreground">Total TTC</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              onClick={() => generateDpgfMutation.mutate()}
              disabled={chiffrageElements.length === 0 || generateDpgfMutation.isPending}
              data-testid="button-generate-dpgf"
            >
              <FileText className="h-4 w-4 mr-2" />
              Générer le DPGF
            </Button>
            {!offer.finEtudesValidatedAt && (
              <Button
                onClick={() => validateStudiesMutation.mutate()}
                disabled={!dpgfDocument || validateStudiesMutation.isPending}
                data-testid="button-validate-studies"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Valider fin d'études
              </Button>
            )}
            {offer.finEtudesValidatedAt && offer.status !== "transforme_en_projet" && (
              <Button
                onClick={() => transformToProjectMutation.mutate()}
                disabled={transformToProjectMutation.isPending}
                data-testid="button-transform-to-project"
                className="bg-green-600 hover:bg-green-700"
              >
                <Settings className="h-4 w-4 mr-2" />
                Transformer en projet
              </Button>
            )}
          </div>
        </TabsContent>

        {/* Onglet Demandes Fournisseurs */}
        <TabsContent value="suppliers" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Demandes de Prix Fournisseurs</h2>
            <Button onClick={() => setShowSupplierRequestDialog(true)} data-testid="button-add-supplier-request">
              <Send className="h-4 w-4 mr-2" />
              Nouvelle Demande
            </Button>
          </div>

          {/* Lots de l'AO */}
          <Card>
            <CardHeader>
              <CardTitle>Lots de l'Appel d'Offres</CardTitle>
              <CardDescription>
                Sélectionnez les lots pour lesquels vous souhaitez demander des prix
              </CardDescription>
            </CardHeader>
            <CardContent>
              {aoLots && aoLots.length > 0 ? (
                <div className="grid gap-4">
                  {aoLots.map((lot: any) => (
                    <div key={lot.id} className="flex items-start space-x-2 p-3 border rounded-lg">
                      <input
                        type="checkbox"
                        id={`lot-${lot.id}`}
                        className="mt-1"
                        checked={selectedLots.includes(lot.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedLots([...selectedLots, lot.id]);
                          } else {
                            setSelectedLots(selectedLots.filter(id => id !== lot.id));
                          }
                        }}
                      />
                      <label htmlFor={`lot-${lot.id}`} className="flex-1 cursor-pointer">
                        <div className="font-medium">{lot.numero} - {lot.designation}</div>
                        {lot.montantEstime && (
                          <div className="text-sm text-gray-600">
                            Montant estimé: {Number(lot.montantEstime).toLocaleString('fr-FR')} €
                          </div>
                        )}
                      </label>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">Aucun lot défini pour cet AO</p>
              )}
            </CardContent>
          </Card>

          {/* Liste des demandes envoyées */}
          <Card>
            <CardHeader>
              <CardTitle>Demandes Envoyées</CardTitle>
              <CardDescription>
                Suivi des demandes de prix envoyées aux fournisseurs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fournisseur</TableHead>
                    <TableHead>Lots concernés</TableHead>
                    <TableHead>Date d'envoi</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Montant devis</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {supplierRequests.map((request: any) => (
                    <TableRow key={request.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{request.supplierName}</div>
                          {request.supplierEmail && (
                            <div className="text-sm text-gray-500">{request.supplierEmail}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {request.requestedItems ? 
                            JSON.parse(request.requestedItems).map((item: any) => item.designation).join(', ') :
                            '-'
                          }
                        </div>
                      </TableCell>
                      <TableCell>
                        {format(new Date(request.sentAt), 'dd/MM/yyyy', { locale: fr })}
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          request.status === 'envoyee' ? 'outline' :
                          request.status === 'recue' ? 'default' :
                          'secondary'
                        }>
                          {request.status === 'envoyee' ? 'Envoyée' :
                           request.status === 'recue' ? 'Reçue' :
                           'Analysée'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {request.quotationAmount ? 
                          `${Number(request.quotationAmount).toLocaleString('fr-FR')} €` :
                          '-'
                        }
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewSupplierRequest(request)}
                            data-testid={`button-view-${request.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {request.status === 'envoyee' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMarkAsReceived(request)}
                              data-testid={`button-mark-received-${request.id}`}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {supplierRequests.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Aucune demande de prix envoyée. Commencez par créer une demande.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Résumé des devis reçus */}
          {supplierRequests.filter((r: any) => r.quotationAmount).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Comparatif des Devis Reçus</CardTitle>
                <CardDescription>
                  Analyse des prix reçus par fournisseur
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {supplierRequests
                    .filter((r: any) => r.quotationAmount)
                    .sort((a: any, b: any) => Number(a.quotationAmount) - Number(b.quotationAmount))
                    .map((request: any, index: number) => (
                      <div key={request.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            index === 0 ? 'bg-green-100 text-green-700' :
                            index === 1 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {index + 1}
                          </div>
                          <div>
                            <div className="font-medium">{request.supplierName}</div>
                            <div className="text-sm text-gray-500">
                              Reçu le {format(new Date(request.responseAt || request.sentAt), 'dd/MM/yyyy', { locale: fr })}
                            </div>
                          </div>
                        </div>
                        <div className="text-right sm:text-left">
                          <div className="text-lg font-bold">
                            {Number(request.quotationAmount).toLocaleString('fr-FR')} € HT
                          </div>
                          {index === 0 && (
                            <Badge className="bg-green-100 text-green-700">Meilleur prix</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Onglet DPGF */}
        <TabsContent value="dpgf" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Document Provisoire de Gestion Financière</h2>
            {dpgfDocument && (
              <Button variant="outline" data-testid="button-download-dpgf">
                <Download className="h-4 w-4 mr-2" />
                Télécharger PDF
              </Button>
            )}
          </div>

          {dpgfDocument ? (
            <Card>
              <CardHeader>
                <CardTitle>DPGF - Version {dpgfDocument.version}</CardTitle>
                <CardDescription>
                  Généré le {format(new Date(dpgfDocument.createdAt), "dd MMMM yyyy à HH:mm", { locale: fr })}
                  {dpgfDocument.validatedAt && (
                    <span className="text-green-600 ml-2">
                      • Validé le {format(new Date(dpgfDocument.validatedAt), "dd MMMM yyyy", { locale: fr })}
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* En-tête du DPGF */}
                  <div className="bg-muted p-4 rounded-lg">
                    <h3 className="font-semibold mb-2">Informations du projet</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                      <div>Client: {offer.client}</div>
                      <div>Référence: {offer.reference}</div>
                      <div>Localisation: {offer.location}</div>
                      <div>Type: {offer.menuiserieType}</div>
                    </div>
                  </div>

                  {/* Détail des éléments */}
                  <div className="overflow-x-auto">
                    <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Catégorie</TableHead>
                        <TableHead>Désignation</TableHead>
                        <TableHead>Qté</TableHead>
                        <TableHead>Prix U.</TableHead>
                        <TableHead>Total HT</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {chiffrageElements.map((element) => (
                        <TableRow key={element.id}>
                          <TableCell>
                            {categories.find(c => c.value === element.category)?.label || element.category}
                          </TableCell>
                          <TableCell>{element.designation}</TableCell>
                          <TableCell>{element.quantity} {element.unit}</TableCell>
                          <TableCell>{parseFloat(element.unitPrice).toFixed(2)} €</TableCell>
                          <TableCell>{parseFloat(element.totalPrice).toFixed(2)} €</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    </Table>
                  </div>

                  <Separator />

                  {/* Totaux */}
                  <div className="flex justify-end">
                    <div className="w-full max-w-80 space-y-2">
                      <div className="flex justify-between">
                        <span>Total HT:</span>
                        <span className="font-medium">{parseFloat(dpgfDocument.totalHT).toFixed(2)} €</span>
                      </div>
                      <div className="flex justify-between">
                        <span>TVA (20%):</span>
                        <span className="font-medium">{parseFloat(dpgfDocument.totalTVA).toFixed(2)} €</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-lg font-bold">
                        <span>Total TTC:</span>
                        <span className="text-primary">{parseFloat(dpgfDocument.totalTTC).toFixed(2)} €</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Aucun DPGF généré</h3>
                <p className="text-muted-foreground mb-4">
                  Ajoutez des éléments de chiffrage puis générez le DPGF pour voir le document.
                </p>
                <Button
                  onClick={() => generateDpgfMutation.mutate()}
                  disabled={chiffrageElements.length === 0}
                  data-testid="button-generate-dpgf-empty"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Générer le DPGF
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog pour créer une demande fournisseur */}
      <Dialog open={showSupplierRequestDialog} onOpenChange={setShowSupplierRequestDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nouvelle Demande de Prix Fournisseur</DialogTitle>
            <DialogDescription>
              Envoyez une demande de prix à un fournisseur pour les lots sélectionnés
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Fournisseur *</Label>
              <Input 
                placeholder="Nom du fournisseur"
                id="supplier-name"
                data-testid="input-supplier-name"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Email</Label>
                <Input 
                  type="email"
                  placeholder="email@fournisseur.fr"
                  id="supplier-email"
                  data-testid="input-supplier-email"
                />
              </div>
              <div>
                <Label>Téléphone</Label>
                <Input 
                  placeholder="02 33 XX XX XX"
                  id="supplier-phone"
                  data-testid="input-supplier-phone"
                />
              </div>
            </div>
            <div>
              <Label>Description de la demande</Label>
              <Textarea 
                placeholder="Détails de la demande de prix..."
                id="request-description"
                rows={4}
                data-testid="textarea-request-description"
              />
            </div>
            <div>
              <Label>Lots concernés</Label>
              <div className="text-sm text-gray-600 mt-1">
                {selectedLots.length > 0 ? (
                  <div>
                    {selectedLots.map(lotId => {
                      const lot = aoLots.find((l: any) => l.id === lotId);
                      return lot ? (
                        <Badge key={lotId} variant="secondary" className="mr-2 mb-2">
                          {lot.numero} - {lot.designation}
                        </Badge>
                      ) : null;
                    })}
                  </div>
                ) : (
                  <p className="text-orange-600">Veuillez sélectionner au moins un lot</p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSupplierRequestDialog(false)}>
              Annuler
            </Button>
            <Button 
              onClick={async () => {
                const supplierName = (document.getElementById('supplier-name') as HTMLInputElement)?.value;
                const supplierEmail = (document.getElementById('supplier-email') as HTMLInputElement)?.value;
                const supplierPhone = (document.getElementById('supplier-phone') as HTMLInputElement)?.value;
                const description = (document.getElementById('request-description') as HTMLTextAreaElement)?.value;
                
                if (!supplierName || selectedLots.length === 0) {
                  toast({
                    title: "Erreur",
                    description: "Veuillez remplir le nom du fournisseur et sélectionner au moins un lot",
                    variant: "destructive",
                  });
                  return;
                }
                
                try {
                  const response = await fetch(`/api/offers/${id}/supplier-requests`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      offerId: id,
                      supplierName,
                      supplierEmail,
                      supplierPhone,
                      description,
                      requestedItems: aoLots.filter((l: any) => selectedLots.includes(l.id)),
                      status: 'envoyee',
                    }),
                  });
                  
                  if (response.ok) {
                    queryClient.invalidateQueries({ queryKey: [`/api/offers/${id}/supplier-requests`] });
                    toast({
                      title: "Demande envoyée",
                      description: `La demande a été envoyée à ${supplierName}`,
                    });
                    setShowSupplierRequestDialog(false);
                    setSelectedLots([]);
                  } else {
                    throw new Error('Failed to create supplier request');
                  }
                } catch (error) {
                  toast({
                    title: "Erreur",
                    description: "Impossible d'envoyer la demande",
                    variant: "destructive",
                  });
                }
              }}
              disabled={selectedLots.length === 0}
              data-testid="button-send-supplier-request"
            >
              <Send className="h-4 w-4 mr-2" />
              Envoyer la Demande
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog pour ajouter/modifier un élément */}
      <Dialog open={showElementDialog} onOpenChange={setShowElementDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto mx-4">
          <DialogHeader>
            <DialogTitle>
              {editingElement ? "Modifier l'élément" : "Nouvel élément de chiffrage"}
            </DialogTitle>
            <DialogDescription>
              Renseignez les informations de l'élément de chiffrage.
            </DialogDescription>
          </DialogHeader>

          <Form {...elementForm}>
            <form onSubmit={elementForm.handleSubmit(handleSubmitElement)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={elementForm.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Catégorie *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-category">
                            <SelectValue placeholder="Sélectionnez une catégorie" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.value} value={category.value}>
                              {category.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={elementForm.control}
                  name="subcategory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sous-catégorie</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="ex: Fenêtres, Portes..."
                          data-testid="input-subcategory"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={elementForm.control}
                name="designation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Désignation *</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Description détaillée de l'élément..."
                        data-testid="textarea-designation"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField
                  control={elementForm.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantité *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          step="0.001"
                          placeholder="1"
                          data-testid="input-quantity"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={elementForm.control}
                  name="unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unité *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-unit">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {units.map((unit) => (
                            <SelectItem key={unit.value} value={unit.value}>
                              {unit.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={elementForm.control}
                  name="unitPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prix unitaire *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          data-testid="input-unit-price"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={elementForm.control}
                  name="coefficient"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Coefficient</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          step="0.01"
                          placeholder="1.00"
                          data-testid="input-coefficient"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={elementForm.control}
                  name="marginPercentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Marge (%)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          step="0.01"
                          placeholder="20.00"
                          data-testid="input-margin"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={elementForm.control}
                  name="supplier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fournisseur</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Nom du fournisseur"
                          data-testid="input-supplier"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={elementForm.control}
                  name="supplierRef"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Référence fournisseur</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Référence produit"
                          data-testid="input-supplier-ref"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={elementForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Notes additionnelles..."
                        data-testid="textarea-notes"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowElementDialog(false);
                    setEditingElement(null);
                    elementForm.reset();
                  }}
                  data-testid="button-cancel-element"
                >
                  Annuler
                </Button>
                <Button 
                  type="submit" 
                  disabled={createElementMutation.isPending}
                  data-testid="button-save-element"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {editingElement ? "Modifier" : "Ajouter"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}