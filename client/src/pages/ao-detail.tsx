import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { LotsManager } from "@/components/ao/LotsManager";
import { ContactSelector } from "@/components/contacts/ContactSelector";
import { MaitreOuvrageForm } from "@/components/contacts/MaitreOuvrageForm";
import { MaitreOeuvreForm } from "@/components/contacts/MaitreOeuvreForm";
import { FileText, Calendar, MapPin, User, Building, Save, ArrowLeft, Calculator, Edit, X, CheckCircle, Euro, Trash2, Plus, Settings, Upload, Download, FolderOpen, Eye } from "lucide-react";
import { useAoDocuments } from "@/hooks/use-ao-documents";
import { DocumentUploadZone } from "@/components/ao/DocumentUploadZone";
import { EnhancedDocumentManager } from "@/components/documents/EnhancedDocumentManager";
import { CompactDocumentView } from "@/components/documents/CompactDocumentView";
import { EnhancedBeValidation } from "@/components/validation/EnhancedBeValidation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Lot {
  id?: string;
  numero: string;
  designation: string;
  menuiserieType?: string;
  montantEstime?: string;
  isSelected: boolean;
  status?: string;
  comment?: string;
  // Nouvelles propriétés techniques extraites depuis les commentaires
  quantite?: number;
  materiau?: string;
  vitrage?: string;
  localisation?: string;
  couleur?: string;
  dimensions?: string;
  performanceThermique?: string;
  performanceAcoustique?: string;
  normes?: string[];
  accessoires?: string;
  delaiLivraison?: string;
  uniteOeuvre?: string;
}

const LOT_STATUS_OPTIONS = [
  { value: "brouillon", label: "Brouillon", color: "bg-surface-muted text-on-surface" },
  { value: "en_attente_fournisseur", label: "En attente fournisseur", color: "bg-warning/10 text-warning" },
  { value: "pre_devis_recu", label: "Pré-devis reçu", color: "bg-primary/10 text-primary" },
  { value: "chiffrage_final_recu", label: "Chiffrage final reçu", color: "bg-accent/10 text-accent" },
  { value: "chiffrage_valide", label: "Chiffrage validé", color: "bg-success/10 text-success" },
  { value: "commande_en_cours", label: "Commande en cours", color: "bg-warning/10 text-warning" },
  { value: "en_attente_livraison", label: "En attente de livraison", color: "bg-primary/10 text-primary" },
  { value: "livre", label: "Livré", color: "bg-success/10 text-success" },
  { value: "sav", label: "SAV", color: "bg-error/10 text-error" }
];

const getStatusLabel = (status?: string) => {
  const option = LOT_STATUS_OPTIONS.find(opt => opt.value === status);
  return option || { value: status || "brouillon", label: status || "Brouillon", color: "bg-surface-muted text-on-surface" };
};

export default function AoDetail() {
  const { toast } = useToast();
  const [_, setLocation] = useLocation();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lots, setLots] = useState<Lot[]>([]);
  const [activeTab, setActiveTab] = useState("informations");
  const [isEditingChiffrage, setIsEditingChiffrage] = useState(false);
  const [editingLotId, setEditingLotId] = useState<string | null>(null);
  const [showAddLot, setShowAddLot] = useState(false);
  const [compactDocumentView, setCompactDocumentView] = useState(true);
  const [newLot, setNewLot] = useState<Partial<Lot>>({
    numero: "",
    designation: "",
    menuiserieType: "fenetre",
    montantEstime: "",
    status: "brouillon",
    isSelected: true,
    comment: ""
  });
  
  // Hook pour la gestion des documents
  const {
    documents: aoDocuments,
    isLoading: isLoadingDocuments,
    uploadFile,
    uploadProgress,
    stats: documentStats,
    isUploading
  } = useAoDocuments(id || "");
  
  // État local pour le formulaire
  const [formData, setFormData] = useState({
    reference: "",
    client: "",
    location: "",
    departement: "",
    intituleOperation: "",
    dateLimiteRemise: "",
    dateSortieAO: "",
    dateAcceptationAO: "",
    demarragePrevu: "",
    maitreOuvrageId: "",
    maitreOeuvreId: "",
    contactAONom: "",
    contactAOPoste: "",
    contactAOTelephone: "",
    contactAOEmail: "",
    menuiserieType: "fenetre",
    montantEstime: "",
    typeMarche: "",
    bureauEtudes: "",
    bureauControle: "",
    sps: "",
    source: "website",
    description: "",
    prorataEventuel: "",
    delaiContractuel: "",
  });

  // États pour la gestion des contacts
  const [selectedMaitreOuvrage, setSelectedMaitreOuvrage] = useState<any>(null);
  const [selectedMaitreOeuvre, setSelectedMaitreOeuvre] = useState<any>(null);
  const [showMaitreOuvrageForm, setShowMaitreOuvrageForm] = useState(false);
  const [showMaitreOeuvreForm, setShowMaitreOeuvreForm] = useState(false);

  // Charger les données de l'AO
  const { data: ao, isLoading } = useQuery({
    queryKey: ["/api/aos", id],
    queryFn: async () => {
      const response = await fetch(`/api/aos/${id}`);
      if (!response.ok) throw new Error('Failed to fetch AO');
      const result = await response.json();
      // L'API retourne {success: true, data: {...}}, on extrait les données
      return result.data || result;
    },
    enabled: !!id,
  });

  // Charger l'offre associée si elle existe
  const { data: relatedOffer } = useQuery({
    queryKey: ["/api/offers/by-ao", id],
    queryFn: async () => {
      const response = await fetch(`/api/offers?aoId=${id}`);
      if (!response.ok) return null;
      const offers = await response.json();
      return offers && offers.length > 0 ? offers[0] : null;
    },
    enabled: !!id,
  });

  // Charger les lots de l'AO
  const { data: aoLots = [] } = useQuery({
    queryKey: ["/api/aos", id, "lots"],
    queryFn: async () => {
      const response = await fetch(`/api/aos/${id}/lots`);
      if (!response.ok) throw new Error('Failed to fetch AO lots');
      return response.json();
    },
    enabled: !!id,
  });

  // Initialiser le formulaire quand les données sont chargées
  useEffect(() => {
    if (ao) {
      setFormData({
        reference: ao.reference || "",
        client: ao.client || "",
        location: ao.location || "",
        departement: ao.departement || "",
        intituleOperation: ao.intituleOperation || "",
        dateLimiteRemise: ao.dateLimiteRemise ? ao.dateLimiteRemise.split('T')[0] : "",
        dateSortieAO: ao.dateSortieAO ? ao.dateSortieAO.split('T')[0] : "",
        dateAcceptationAO: ao.dateAcceptationAO ? ao.dateAcceptationAO.split('T')[0] : "",
        demarragePrevu: ao.demarragePrevu ? ao.demarragePrevu.split('T')[0] : "",
        maitreOuvrageId: ao.maitreOuvrageId || "",
        maitreOeuvreId: ao.maitreOeuvreId || "",
        contactAONom: ao.contactAONom || "",
        contactAOPoste: ao.contactAOPoste || "",
        contactAOTelephone: ao.contactAOTelephone || "",
        contactAOEmail: ao.contactAOEmail || "",
        menuiserieType: ao.menuiserieType || "fenetre",
        montantEstime: ao.montantEstime ? ao.montantEstime.toString() : "",
        typeMarche: ao.typeMarche || "",
        bureauEtudes: ao.bureauEtudes || "",
        bureauControle: ao.bureauControle || "",
        sps: ao.sps || "",
        source: ao.source || "website",
        description: ao.description || "",
        prorataEventuel: ao.prorataEventuel ? ao.prorataEventuel.toString() : "",
        delaiContractuel: ao.delaiContractuel ? ao.delaiContractuel.toString() : "",
      });

      // Charger les contacts sélectionnés
      if (ao.maitreOuvrageId) {
        fetch(`/api/maitres-ouvrage/${ao.maitreOuvrageId}`)
          .then(res => res.json())
          .then(data => setSelectedMaitreOuvrage(data))
          .catch(console.error);
      }

      if (ao.maitreOeuvreId) {
        fetch(`/api/maitres-oeuvre/${ao.maitreOeuvreId}`)
          .then(res => res.json())
          .then(data => setSelectedMaitreOeuvre(data))
          .catch(console.error);
      }
    }
  }, [ao]);

  // Fonction pour extraire les informations techniques depuis le commentaire
  const parseCommentTechnicalInfo = (comment: string) => {
    const info: any = {};
    if (!comment) return info;
    
    // Extraction de la quantité
    const quantiteMatch = comment.match(/Quantité[^:]*:\s*(\d+)/);
    if (quantiteMatch) info.quantite = parseInt(quantiteMatch[1]);
    
    // Extraction du matériau
    const materiauMatch = comment.match(/Matériau[^:]*:\s*([^\n]+)/);
    if (materiauMatch) info.materiau = materiauMatch[1].trim();
    
    // Extraction du vitrage
    const vitrageMatch = comment.match(/Vitrage[^:]*:\s*([^\n]+)/);
    if (vitrageMatch) info.vitrage = vitrageMatch[1].trim();
    
    // Extraction de la localisation
    const localisationMatch = comment.match(/Localisation[^:]*:\s*([^\n]+)/);
    if (localisationMatch) info.localisation = localisationMatch[1].trim();
    
    // Extraction de la couleur
    const couleurMatch = comment.match(/Couleur[^:]*:\s*([^\n]+)/);
    if (couleurMatch) info.couleur = couleurMatch[1].trim();
    
    // Extraction des dimensions
    const dimensionsMatch = comment.match(/Dimensions?[^:]*:\s*([^\n]+)/);
    if (dimensionsMatch) info.dimensions = dimensionsMatch[1].trim();
    
    // Extraction des performances
    const thermMatch = comment.match(/Thermique[^:]*:\s*([^\n]+)/);
    if (thermMatch) info.performanceThermique = thermMatch[1].trim();
    
    const acoustMatch = comment.match(/Acoustique[^:]*:\s*([^\n]+)/);
    if (acoustMatch) info.performanceAcoustique = acoustMatch[1].trim();
    
    // Extraction des normes
    const normesMatch = comment.match(/Normes?[^:]*:\s*([^\n]+)/);
    if (normesMatch) info.normes = normesMatch[1].split(',').map(n => n.trim());
    
    // Extraction des accessoires
    const accessoiresMatch = comment.match(/Accessoires[^:]*:\s*([^\n]+)/);
    if (accessoiresMatch) info.accessoires = accessoiresMatch[1].trim();
    
    // Extraction du délai
    const delaiMatch = comment.match(/DÉLAI[^:]*:\s*([^\n]+)/);
    if (delaiMatch) info.delaiLivraison = delaiMatch[1].trim();
    
    // Extraction de l'unité
    const uniteMatch = comment.match(/UNITÉ[^:]*:\s*([^\n]+)/);
    if (uniteMatch) info.uniteOeuvre = uniteMatch[1].trim();
    
    return info;
  };
  
  // Initialiser les lots avec extraction des informations techniques
  useEffect(() => {
    if (aoLots.length > 0) {
      const formattedLots = aoLots.map((lot: any) => {
        const technicalInfo = parseCommentTechnicalInfo(lot.comment || "");
        return {
          id: lot.id,
          numero: lot.numero,
          designation: lot.designation,
          menuiserieType: lot.menuiserieType,
          montantEstime: lot.montantEstime ? lot.montantEstime.toString() : "",
          isSelected: true,
          comment: lot.comment || "",
          status: "brouillon", // Par défaut
          ...technicalInfo
        };
      });
      setLots(formattedLots);
    }
  }, [aoLots]);

  // Calcul automatique de la date de rendu
  const calculateDateRendu = (dateLimiteRemise: string): string => {
    if (!dateLimiteRemise) return "";
    const dateLimite = new Date(dateLimiteRemise);
    const dateRendu = new Date(dateLimite);
    dateRendu.setDate(dateRendu.getDate() - 3); // 3 jours avant la limite
    return dateRendu.toISOString().split('T')[0];
  };

  // Fonction de sauvegarde manuelle
  const saveAO = async () => {
    setIsSaving(true);
    try {
      const dateRenduAO = formData.dateLimiteRemise ? calculateDateRendu(formData.dateLimiteRemise) : undefined;
      
      const aoData = {
        ...formData,
        dateRenduAO,
        montantEstime: formData.montantEstime ? parseFloat(formData.montantEstime) : undefined,
        prorataEventuel: formData.prorataEventuel ? parseFloat(formData.prorataEventuel) : undefined,
        delaiContractuel: formData.delaiContractuel ? parseInt(formData.delaiContractuel) : undefined,
        maitreOuvrageId: selectedMaitreOuvrage?.id,
        maitreOeuvreId: selectedMaitreOeuvre?.id,
      };
      
      const response = await fetch(`/api/aos/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(aoData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update AO');
      }
      
      const result = await response.json();
      
      queryClient.invalidateQueries({ queryKey: ["/api/aos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/aos", id] });
      
      toast({
        title: "✓ Sauvegardé",
        description: "Les modifications ont été enregistrées avec succès",
      });
      
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving AO:", error);
      toast({
        title: "Erreur de sauvegarde",
        description: "Les modifications n'ont pas pu être sauvegardées",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Gérer les changements de champs en mode édition
  const handleFieldChange = (field: string, value: any) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex bg-surface-muted">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Chargement de l'AO...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!ao) {
    return (
      <div className="min-h-screen flex bg-surface-muted">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <div className="text-center py-8">
            <p className="text-error">AO non trouvé</p>
            <Button onClick={() => setLocation("/aos")} className="mt-4">
              Retour à la liste
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-surface-muted">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Header 
          title={`AO ${ao?.reference || 'Chargement...'}`}
          breadcrumbs={[
            { label: "Accueil", href: "/" },
            { label: "Appels d'Offres", href: "/aos" },
            { label: ao?.reference || "Chargement..." }
          ]}
          actions={[
            {
              label: "Retour",
              variant: "outline",
              icon: "arrow-left",
              onClick: () => setLocation("/aos")
            },
            relatedOffer ? {
              label: "Voir Chiffrage",
              variant: "default",
              icon: "calculator",
              onClick: () => setLocation(`/offers/${relatedOffer.id}/chiffrage`)
            } : {
              label: "Créer Offre",
              variant: "default",
              icon: "calculator",
              onClick: () => setLocation(`/create-offer?aoId=${id}`)
            }
          ]}
        />
        
        <div className="px-6 py-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="informations" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Informations
              </TabsTrigger>
              <TabsTrigger value="chiffrage" className="flex items-center gap-2">
                <Euro className="h-4 w-4" />
                Chiffrage
              </TabsTrigger>
              <TabsTrigger value="documents" className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4" />
                Documents
              </TabsTrigger>
              <TabsTrigger value="validation" className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Validation BE
              </TabsTrigger>
            </TabsList>

            <TabsContent value="informations" className="space-y-6 mt-6">
          {/* Barre d'actions en mode édition */}
          {isEditing && (
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit className="h-4 w-4 text-primary" />
                <span className="text-sm text-primary">Mode édition activé - Modifiez les champs puis enregistrez</span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsEditing(false);
                    // Réinitialiser le formulaire avec les données originales
                    if (ao) {
                      setFormData({
                        reference: ao.reference || "",
                        client: ao.client || "",
                        location: ao.location || "",
                        departement: ao.departement || "",
                        intituleOperation: ao.intituleOperation || "",
                        dateLimiteRemise: ao.dateLimiteRemise ? ao.dateLimiteRemise.split('T')[0] : "",
                        dateSortieAO: ao.dateSortieAO ? ao.dateSortieAO.split('T')[0] : "",
                        dateAcceptationAO: ao.dateAcceptationAO ? ao.dateAcceptationAO.split('T')[0] : "",
                        demarragePrevu: ao.demarragePrevu ? ao.demarragePrevu.split('T')[0] : "",
                        maitreOuvrageId: ao.maitreOuvrageId || "",
                        maitreOeuvreId: ao.maitreOeuvreId || "",
                        contactAONom: ao.contactAONom || "",
                        contactAOPoste: ao.contactAOPoste || "",
                        contactAOTelephone: ao.contactAOTelephone || "",
                        contactAOEmail: ao.contactAOEmail || "",
                        menuiserieType: ao.menuiserieType || "fenetre",
                        montantEstime: ao.montantEstime ? ao.montantEstime.toString() : "",
                        typeMarche: ao.typeMarche || "",
                        bureauEtudes: ao.bureauEtudes || "",
                        bureauControle: ao.bureauControle || "",
                        sps: ao.sps || "",
                        source: ao.source || "website",
                        description: ao.description || "",
                        prorataEventuel: ao.prorataEventuel ? ao.prorataEventuel.toString() : "",
                        delaiContractuel: ao.delaiContractuel ? ao.delaiContractuel.toString() : "",
                      });
                    }
                  }}
                >
                  <X className="h-4 w-4 mr-1" />
                  Annuler
                </Button>
                <Button
                  size="sm"
                  onClick={saveAO}
                  disabled={isSaving}
                >
                  <Save className="h-4 w-4 mr-1" />
                  {isSaving ? "Enregistrement..." : "Enregistrer"}
                </Button>
              </div>
            </div>
          )}
          
          {!isEditing && (
            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={() => setIsEditing(true)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Modifier l'AO
              </Button>
            </div>
          )}
          {/* Informations de base */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Informations de base</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="reference">Référence AO *</Label>
                    <Input
                      id="reference"
                      value={formData.reference}
                      onChange={(e) => handleFieldChange("reference", e.target.value)}
                      placeholder="Référence de l'appel d'offres"
                      data-testid="input-reference"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="client">Client *</Label>
                    <Input
                      id="client"
                      value={formData.client}
                      onChange={(e) => handleFieldChange("client", e.target.value)}
                      placeholder="Nom du client"
                      data-testid="input-client"
                    />
                  </div>

                  <div>
                    <Label htmlFor="intitule">Intitulé de l'opération</Label>
                    <Input
                      id="intitule"
                      value={formData.intituleOperation}
                      onChange={(e) => handleFieldChange("intituleOperation", e.target.value)}
                      placeholder="Intitulé de l'opération"
                      data-testid="input-intitule"
                    />
                  </div>

                  <div>
                    <Label htmlFor="type">Type de menuiserie *</Label>
                    <Select 
                      value={formData.menuiserieType} 
                      onValueChange={(value) => handleFieldChange("menuiserieType", value)}
                    >
                      <SelectTrigger id="type" data-testid="select-menuiserie-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fenetre">Fenêtre</SelectItem>
                        <SelectItem value="porte">Porte</SelectItem>
                        <SelectItem value="portail">Portail</SelectItem>
                        <SelectItem value="volet">Volet</SelectItem>
                        <SelectItem value="cloison">Cloison</SelectItem>
                        <SelectItem value="verriere">Verrière</SelectItem>
                        <SelectItem value="autre">Autre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="md:col-span-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => handleFieldChange("description", e.target.value)}
                      placeholder="Description détaillée de l'appel d'offres"
                      rows={3}
                      data-testid="textarea-description"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <Label className="text-sm text-on-surface-muted">Référence</Label>
                      <p className="font-medium">{formData.reference || "Non définie"}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-on-surface-muted">Client</Label>
                      <p className="font-medium">{formData.client || "Non défini"}</p>
                    </div>
                  </div>
                  
                  {formData.intituleOperation && (
                    <div>
                      <Label className="text-sm text-on-surface-muted">Intitulé de l'opération</Label>
                      <p className="font-medium">{formData.intituleOperation}</p>
                    </div>
                  )}
                  
                  <div>
                    <Label className="text-sm text-on-surface-muted">Type de menuiserie</Label>
                    <p className="font-medium">
                      {formData.menuiserieType === "fenetre" && "Fenêtre"}
                      {formData.menuiserieType === "porte" && "Porte"}
                      {formData.menuiserieType === "portail" && "Portail"}
                      {formData.menuiserieType === "volet" && "Volet"}
                      {formData.menuiserieType === "cloison" && "Cloison"}
                      {formData.menuiserieType === "verriere" && "Verrière"}
                      {formData.menuiserieType === "autre" && "Autre"}
                    </p>
                  </div>
                  
                  {formData.description && (
                    <div>
                      <Label className="text-sm text-on-surface-muted">Description</Label>
                      <p className="text-sm">{formData.description}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Localisation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MapPin className="h-5 w-5" />
                <span>Localisation</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <Label htmlFor="location">Adresse du chantier *</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => handleFieldChange("location", e.target.value)}
                      placeholder="Adresse complète du chantier"
                      data-testid="input-location"
                    />
                  </div>

                  <div>
                    <Label htmlFor="departement">Département *</Label>
                    <Input
                      id="departement"
                      value={formData.departement}
                      onChange={(e) => handleFieldChange("departement", e.target.value)}
                      placeholder="Ex: 59"
                      data-testid="input-departement"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm text-on-surface-muted">Adresse du chantier</Label>
                    <p className="font-medium">{formData.location || "Non définie"}</p>
                  </div>
                  
                  {formData.departement && (
                    <div>
                      <Label className="text-sm text-on-surface-muted">Département</Label>
                      <p className="font-medium">{formData.departement}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dates importantes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>Dates importantes</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="bg-primary/10 p-3 rounded-lg border border-primary/20">
                    <Label className="text-sm text-on-surface-muted">Date limite de remise</Label>
                    <div className="flex items-center space-x-2 mt-1">
                      <div className="w-3 h-3 bg-primary rounded-full"></div>
                      <p className="font-medium text-primary">Calculée automatiquement par le système</p>
                    </div>
                    <p className="text-xs text-primary mt-1">
                      💡 Base : Date sortie AO + 30 jours (ajustable selon le type d'AO)
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="dateSortie">Date sortie AO</Label>
                    <Input
                      id="dateSortie"
                      type="date"
                      value={formData.dateSortieAO}
                      onChange={(e) => handleFieldChange("dateSortieAO", e.target.value)}
                      data-testid="input-date-sortie"
                    />
                  </div>

                  <div>
                    <Label htmlFor="dateAcceptation">Date acceptation</Label>
                    <Input
                      id="dateAcceptation"
                      type="date"
                      value={formData.dateAcceptationAO}
                      onChange={(e) => handleFieldChange("dateAcceptationAO", e.target.value)}
                      data-testid="input-date-acceptation"
                    />
                  </div>

                  <div>
                    <Label htmlFor="demarrage">Démarrage prévu</Label>
                    <Input
                      id="demarrage"
                      type="date"
                      value={formData.demarragePrevu}
                      onChange={(e) => handleFieldChange("demarragePrevu", e.target.value)}
                      data-testid="input-demarrage"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {formData.dateLimiteRemise && (
                    <div>
                      <Label className="text-sm text-on-surface-muted">Date limite de remise</Label>
                      <p className="font-medium">{new Date(formData.dateLimiteRemise).toLocaleDateString('fr-FR')}</p>
                    </div>
                  )}
                  
                  {formData.dateSortieAO && (
                    <div>
                      <Label className="text-sm text-on-surface-muted">Date sortie AO</Label>
                      <p className="font-medium">{new Date(formData.dateSortieAO).toLocaleDateString('fr-FR')}</p>
                    </div>
                  )}
                  
                  {formData.dateAcceptationAO && (
                    <div>
                      <Label className="text-sm text-on-surface-muted">Date acceptation</Label>
                      <p className="font-medium">{new Date(formData.dateAcceptationAO).toLocaleDateString('fr-FR')}</p>
                    </div>
                  )}
                  
                  {formData.demarragePrevu && (
                    <div>
                      <Label className="text-sm text-on-surface-muted">Démarrage prévu</Label>
                      <p className="font-medium">{new Date(formData.demarragePrevu).toLocaleDateString('fr-FR')}</p>
                    </div>
                  )}
                  
                  {!formData.dateLimiteRemise && !formData.dateSortieAO && !formData.dateAcceptationAO && !formData.demarragePrevu && (
                    <p className="text-muted-foreground text-sm">Aucune date définie</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contacts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>Contacts</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <div className="space-y-4">
                  {/* Sélection du maître d'ouvrage */}
                  <div>
                    <Label>Maître d'ouvrage</Label>
                    <ContactSelector
                      type="maitre-ouvrage"
                      selectedContactId={selectedMaitreOuvrage?.id}
                      onContactSelect={(contactId: string, contact: any) => {
                        setSelectedMaitreOuvrage(contact);
                        handleFieldChange("maitreOuvrageId", contactId);
                      }}
                      onCreateNew={() => setShowMaitreOuvrageForm(true)}
                    />
                  </div>

                  {/* Sélection du maître d'œuvre */}
                  <div>
                    <Label>Maître d'œuvre</Label>
                    <ContactSelector
                      type="maitre-oeuvre"
                      selectedContactId={selectedMaitreOeuvre?.id}
                      onContactSelect={(contactId: string, contact: any) => {
                        setSelectedMaitreOeuvre(contact);
                        handleFieldChange("maitreOeuvreId", contactId);
                      }}
                      onCreateNew={() => setShowMaitreOeuvreForm(true)}
                    />
                  </div>

                  {/* Contact spécifique AO */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label htmlFor="contactNom">Contact AO - Nom</Label>
                      <Input
                        id="contactNom"
                        value={formData.contactAONom}
                        onChange={(e) => handleFieldChange("contactAONom", e.target.value)}
                        placeholder="Nom du contact pour cet AO"
                        data-testid="input-contact-nom"
                      />
                    </div>

                    <div>
                      <Label htmlFor="contactPoste">Contact AO - Poste</Label>
                      <Input
                        id="contactPoste"
                        value={formData.contactAOPoste}
                        onChange={(e) => handleFieldChange("contactAOPoste", e.target.value)}
                        placeholder="Poste du contact"
                        data-testid="input-contact-poste"
                      />
                    </div>

                    <div>
                      <Label htmlFor="contactTel">Contact AO - Téléphone</Label>
                      <Input
                        id="contactTel"
                        value={formData.contactAOTelephone}
                        onChange={(e) => handleFieldChange("contactAOTelephone", e.target.value)}
                        placeholder="Téléphone du contact"
                        data-testid="input-contact-tel"
                      />
                    </div>

                    <div>
                      <Label htmlFor="contactEmail">Contact AO - Email</Label>
                      <Input
                        id="contactEmail"
                        type="email"
                        value={formData.contactAOEmail}
                        onChange={(e) => handleFieldChange("contactAOEmail", e.target.value)}
                        placeholder="Email du contact"
                        data-testid="input-contact-email"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedMaitreOuvrage && (
                    <div>
                      <Label className="text-sm text-on-surface-muted">Maître d'ouvrage</Label>
                      <p className="font-medium">{selectedMaitreOuvrage.nom}</p>
                      {selectedMaitreOuvrage.ville && (
                        <p className="text-sm text-muted-foreground">{selectedMaitreOuvrage.ville}</p>
                      )}
                    </div>
                  )}
                  
                  {selectedMaitreOeuvre && (
                    <div>
                      <Label className="text-sm text-on-surface-muted">Maître d'œuvre</Label>
                      <p className="font-medium">{selectedMaitreOeuvre.nom}</p>
                      {selectedMaitreOeuvre.typeOrganisation && (
                        <p className="text-sm text-muted-foreground">{selectedMaitreOeuvre.typeOrganisation}</p>
                      )}
                    </div>
                  )}
                  
                  {(formData.contactAONom || formData.contactAOEmail || formData.contactAOTelephone) && (
                    <div>
                      <Label className="text-sm text-on-surface-muted">Contact AO</Label>
                      {formData.contactAONom && (
                        <p className="font-medium">{formData.contactAONom}</p>
                      )}
                      {formData.contactAOPoste && (
                        <p className="text-sm text-muted-foreground">{formData.contactAOPoste}</p>
                      )}
                      <div className="flex flex-col text-sm text-on-surface-muted">
                        {formData.contactAOEmail && <span>{formData.contactAOEmail}</span>}
                        {formData.contactAOTelephone && <span>{formData.contactAOTelephone}</span>}
                      </div>
                    </div>
                  )}
                  
                  {!selectedMaitreOuvrage && !selectedMaitreOeuvre && !formData.contactAONom && !formData.contactAOEmail && (
                    <p className="text-muted-foreground text-sm">Aucun contact défini</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Informations techniques et financières */}
          {(isEditing || formData.montantEstime || formData.bureauEtudes || formData.bureauControle || formData.sps || formData.typeMarche) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Building className="h-5 w-5" />
                  <span>Informations techniques et financières</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label htmlFor="montant">Montant estimé (€)</Label>
                      <Input
                        id="montant"
                        type="number"
                        value={formData.montantEstime}
                        onChange={(e) => handleFieldChange("montantEstime", e.target.value)}
                        placeholder="Montant estimé en euros"
                        data-testid="input-montant"
                      />
                    </div>

                    <div>
                      <Label htmlFor="typeMarche">Type de marché</Label>
                      <Select 
                        value={formData.typeMarche} 
                        onValueChange={(value) => handleFieldChange("typeMarche", value)}
                      >
                        <SelectTrigger id="typeMarche" data-testid="select-type-marche">
                          <SelectValue placeholder="Sélectionner le type de marché" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="public">Public</SelectItem>
                          <SelectItem value="prive">Privé</SelectItem>
                          <SelectItem value="ao_restreint">AO Restreint</SelectItem>
                          <SelectItem value="ao_ouvert">AO Ouvert</SelectItem>
                          <SelectItem value="marche_negocie">Marché Négocié</SelectItem>
                          <SelectItem value="procedure_adaptee">Procédure Adaptée</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="bureauEtudes">Bureau d'études</Label>
                      <Input
                        id="bureauEtudes"
                        value={formData.bureauEtudes}
                        onChange={(e) => handleFieldChange("bureauEtudes", e.target.value)}
                        placeholder="Nom du bureau d'études"
                        data-testid="input-bureau-etudes"
                      />
                    </div>

                    <div>
                      <Label htmlFor="bureauControle">Bureau de contrôle</Label>
                      <Input
                        id="bureauControle"
                        value={formData.bureauControle}
                        onChange={(e) => handleFieldChange("bureauControle", e.target.value)}
                        placeholder="Nom du bureau de contrôle"
                        data-testid="input-bureau-controle"
                      />
                    </div>

                    <div>
                      <Label htmlFor="sps">SPS</Label>
                      <Input
                        id="sps"
                        value={formData.sps}
                        onChange={(e) => handleFieldChange("sps", e.target.value)}
                        placeholder="Nom du coordinateur SPS"
                        data-testid="input-sps"
                      />
                    </div>

                    <div>
                      <Label htmlFor="source">Source de l'AO *</Label>
                      <Select 
                        value={formData.source} 
                        onValueChange={(value) => handleFieldChange("source", value)}
                      >
                        <SelectTrigger id="source" data-testid="select-source">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mail">Email</SelectItem>
                          <SelectItem value="phone">Téléphone</SelectItem>
                          <SelectItem value="website">Site Web</SelectItem>
                          <SelectItem value="partner">Partenaire</SelectItem>
                          <SelectItem value="other">Autre</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {formData.montantEstime && (
                      <div>
                        <Label className="text-sm text-on-surface-muted">Montant estimé</Label>
                        <p className="font-medium">{parseFloat(formData.montantEstime).toLocaleString('fr-FR')} €</p>
                      </div>
                    )}
                    
                    {formData.typeMarche && (
                      <div>
                        <Label className="text-sm text-on-surface-muted">Type de marché</Label>
                        <p className="font-medium">
                          {formData.typeMarche === "public" && "Public"}
                          {formData.typeMarche === "prive" && "Privé"}
                          {formData.typeMarche === "ao_restreint" && "AO Restreint"}
                          {formData.typeMarche === "ao_ouvert" && "AO Ouvert"}
                          {formData.typeMarche === "marche_negocie" && "Marché Négocié"}
                          {formData.typeMarche === "procedure_adaptee" && "Procédure Adaptée"}
                        </p>
                      </div>
                    )}
                    
                    {formData.bureauEtudes && (
                      <div>
                        <Label className="text-sm text-on-surface-muted">Bureau d'études</Label>
                        <p className="font-medium">{formData.bureauEtudes}</p>
                      </div>
                    )}
                    
                    {formData.bureauControle && (
                      <div>
                        <Label className="text-sm text-on-surface-muted">Bureau de contrôle</Label>
                        <p className="font-medium">{formData.bureauControle}</p>
                      </div>
                    )}
                    
                    {formData.sps && (
                      <div>
                        <Label className="text-sm text-on-surface-muted">SPS</Label>
                        <p className="font-medium">{formData.sps}</p>
                      </div>
                    )}
                    
                    {formData.source && (
                      <div>
                        <Label className="text-sm text-on-surface-muted">Source AO</Label>
                        <p className="font-medium">
                          {formData.source === "mail" && "Email"}
                          {formData.source === "phone" && "Téléphone"}
                          {formData.source === "website" && "Site Web"}
                          {formData.source === "partner" && "Partenaire"}
                          {formData.source === "other" && "Autre"}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Gestion des lots */}
          {(isEditing || lots.length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle>Lots menuiserie</CardTitle>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <LotsManager
                    lots={lots}
                    onLotsChange={(updatedLots: Lot[]) => {
                      setLots(updatedLots);
                      // Sauvegarder les lots automatiquement
                      // TODO: Implémenter la sauvegarde des lots
                    }}
                  />
                ) : lots.length > 0 ? (
                  <div className="space-y-3">
                    {lots.map((lot, index) => (
                      <div key={lot.id || index} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="font-medium">{lot.numero}</Label>
                            <span className="text-sm text-muted-foreground ml-2">-</span>
                            <span className="text-sm ml-2">{lot.designation}</span>
                          </div>
                          {lot.montantEstime && (
                            <span className="font-medium text-success">
                              {parseFloat(lot.montantEstime).toLocaleString('fr-FR')} €
                            </span>
                          )}
                        </div>
                        {lot.menuiserieType && (
                          <div className="mt-2">
                            <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                              {lot.menuiserieType === "fenetre" && "Fenêtre"}
                              {lot.menuiserieType === "porte" && "Porte"}
                              {lot.menuiserieType === "portail" && "Portail"}
                              {lot.menuiserieType === "volet" && "Volet"}
                              {lot.menuiserieType === "cloison" && "Cloison"}
                              {lot.menuiserieType === "verriere" && "Verrière"}
                              {lot.menuiserieType === "autre" && "Autre"}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">Aucun lot défini</p>
                )}
              </CardContent>
            </Card>
          )}
            </TabsContent>

            <TabsContent value="chiffrage" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Euro className="h-5 w-5" />
                      <span>Chiffrage automatisé par OCR</span>
                      <span className="text-sm font-normal text-warning bg-warning/10 px-2 py-1 rounded">BROUILLON</span>
                    </div>
                    <div className="flex gap-2">
                      {isEditingChiffrage ? (
                        <>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setIsEditingChiffrage(false)}
                          >
                            <X className="h-4 w-4 mr-2" />
                            Annuler
                          </Button>
                          <Button 
                            size="sm"
                            onClick={() => {
                              // Sauvegarder les modifications
                              setIsEditingChiffrage(false);
                              toast({ title: "Chiffrage sauvegardé", description: "Les modifications ont été enregistrées." });
                            }}
                          >
                            <Save className="h-4 w-4 mr-2" />
                            Sauvegarder
                          </Button>
                        </>
                      ) : (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setIsEditingChiffrage(true)}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Modifier le chiffrage
                        </Button>
                      )}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Statut d'extraction */}
                    <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-3 w-3 bg-primary rounded-full"></div>
                        <div>
                          <p className="font-medium text-primary">Données OCR disponibles</p>
                          <p className="text-sm text-primary">Les informations ont été extraites automatiquement des documents PDF de l'AO</p>
                        </div>
                      </div>
                    </div>

                    {/* Lots extraits par OCR */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold text-lg flex items-center gap-2">
                          <FileText className="h-5 w-5" />
                          Lots menuiserie ({lots.length})
                        </h4>
                        <div className="flex gap-2">
                          {!showAddLot && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setShowAddLot(true)}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Ajouter un lot
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      {/* Formulaire d'ajout de lot */}
                      {showAddLot && (
                        <Card className="mb-4 border-2 border-dashed border-primary/30 bg-primary/10">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-3">
                              <h5 className="font-medium text-primary">Nouveau lot</h5>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => {
                                  setShowAddLot(false);
                                  setNewLot({
                                    numero: "",
                                    designation: "",
                                    menuiserieType: "fenetre",
                                    montantEstime: "",
                                    status: "brouillon",
                                    isSelected: true,
                                    comment: ""
                                  });
                                }}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="grid md:grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="newLotNumero">Numéro du lot</Label>
                                <Input
                                  id="newLotNumero"
                                  value={newLot.numero || ""}
                                  onChange={(e) => setNewLot({...newLot, numero: e.target.value})}
                                  placeholder="Ex: Lot 03, Lot A..."
                                />
                              </div>
                              <div>
                                <Label htmlFor="newLotMontant">Montant estimé (€)</Label>
                                <Input
                                  id="newLotMontant"
                                  type="number"
                                  value={newLot.montantEstime || ""}
                                  onChange={(e) => setNewLot({...newLot, montantEstime: e.target.value})}
                                  placeholder="0"
                                />
                              </div>
                              <div className="md:col-span-2">
                                <Label htmlFor="newLotDesignation">Désignation</Label>
                                <Input
                                  id="newLotDesignation"
                                  value={newLot.designation || ""}
                                  onChange={(e) => setNewLot({...newLot, designation: e.target.value})}
                                  placeholder="Description du lot"
                                />
                              </div>
                              <div>
                                <Label htmlFor="newLotType">Type de menuiserie</Label>
                                <Select 
                                  value={newLot.menuiserieType || "fenetre"} 
                                  onValueChange={(value) => setNewLot({...newLot, menuiserieType: value})}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="fenetre">Fenêtre</SelectItem>
                                    <SelectItem value="porte">Porte</SelectItem>
                                    <SelectItem value="portail">Portail</SelectItem>
                                    <SelectItem value="volet">Volet</SelectItem>
                                    <SelectItem value="cloison">Cloison</SelectItem>
                                    <SelectItem value="verriere">Verrière</SelectItem>
                                    <SelectItem value="autre">Autre</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label htmlFor="newLotStatus">Statut</Label>
                                <Select 
                                  value={newLot.status || "brouillon"} 
                                  onValueChange={(value) => setNewLot({...newLot, status: value})}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {LOT_STATUS_OPTIONS.map(option => (
                                      <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div className="flex gap-2 mt-4">
                              <Button 
                                onClick={() => {
                                  if (newLot.numero && newLot.designation) {
                                    const newLotWithId = {
                                      ...newLot,
                                      id: `temp-${Date.now()}`,
                                      isSelected: true
                                    } as Lot;
                                    setLots([...lots, newLotWithId]);
                                    setShowAddLot(false);
                                    setNewLot({
                                      numero: "",
                                      designation: "",
                                      menuiserieType: "fenetre",
                                      montantEstime: "",
                                      status: "brouillon",
                                      isSelected: true,
                                      comment: ""
                                    });
                                    toast({ title: "Lot ajouté", description: "Le nouveau lot a été ajouté avec succès." });
                                  }
                                }}
                                disabled={!newLot.numero || !newLot.designation}
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Ajouter le lot
                              </Button>
                              <Button 
                                variant="outline" 
                                onClick={() => {
                                  setShowAddLot(false);
                                  setNewLot({
                                    numero: "",
                                    designation: "",
                                    menuiserieType: "fenetre",
                                    montantEstime: "",
                                    status: "brouillon",
                                    isSelected: true,
                                    comment: ""
                                  });
                                }}
                              >
                                Annuler
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                      
                      {lots.length > 0 ? (
                        <div className="space-y-4">
                          {lots.map((lot, index) => {
                            const isEditing = editingLotId === (lot.id || index.toString());
                            const statusInfo = getStatusLabel(lot.status);
                            
                            return (
                              <div key={lot.id || index} className="border rounded-lg p-5 bg-white shadow-sm hover:shadow-md transition-all duration-200">
                                <div className="flex items-center justify-between mb-4">
                                  <div className="flex items-center gap-3">
                                    <div className={`h-3 w-3 rounded-full ${statusInfo.value === 'brouillon' ? 'bg-gray-400' : statusInfo.value === 'livre' ? 'bg-success/100' : 'bg-primary'}`}></div>
                                    <div className="flex-1">
                                      <div className="flex items-center gap-3 mb-1">
                                        <span className="font-semibold text-lg">{lot.numero}</span>
                                        <span className="text-muted-foreground">•</span>
                                        <span className="text-on-surface">{lot.designation}</span>
                                        {/* Statut très visible dans l'en-tête */}
                                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border-2 ${statusInfo.color} ${statusInfo.color.includes('red') ? 'border-red-300' : statusInfo.color.includes('green') ? 'border-green-300' : statusInfo.color.includes('blue') ? 'border-blue-300' : statusInfo.color.includes('yellow') ? 'border-yellow-300' : statusInfo.color.includes('orange') ? 'border-orange-300' : statusInfo.color.includes('purple') ? 'border-purple-300' : 'border-border'}`}>
                                          <div className={`h-2 w-2 rounded-full mr-2 ${statusInfo.color.includes('red') ? 'bg-red-500' : statusInfo.color.includes('green') ? 'bg-success/100' : statusInfo.color.includes('blue') ? 'bg-primary' : statusInfo.color.includes('yellow') ? 'bg-yellow-500' : statusInfo.color.includes('orange') ? 'bg-orange-500' : statusInfo.color.includes('purple') ? 'bg-purple-500' : 'bg-surface-muted0'}`}></div>
                                          {statusInfo.label}
                                        </span>
                                      </div>
                                      {lot.quantite && (
                                        <div className="text-sm text-on-surface-muted">
                                          {lot.quantite} élément{lot.quantite > 1 ? 's' : ''} • {lot.materiau || 'Matériau non spécifié'}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {lot.montantEstime && (
                                      <div className="text-right mr-4">
                                        <span className="text-lg font-bold text-success">
                                          {parseFloat(lot.montantEstime).toLocaleString('fr-FR')} €
                                        </span>
                                        <p className="text-xs text-muted-foreground">Montant estimé</p>
                                      </div>
                                    )}
                                    {isEditing ? (
                                      <div className="flex gap-1">
                                        <Button 
                                          size="sm" 
                                          onClick={() => {
                                            setEditingLotId(null);
                                            toast({ title: "Lot sauvegardé", description: "Les modifications ont été enregistrées." });
                                          }}
                                        >
                                          <Save className="h-4 w-4" />
                                        </Button>
                                        <Button 
                                          variant="outline" 
                                          size="sm" 
                                          onClick={() => setEditingLotId(null)}
                                        >
                                          <X className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    ) : (
                                      <div className="flex gap-1">
                                        <Button 
                                          variant="outline" 
                                          size="sm" 
                                          onClick={() => setEditingLotId(lot.id || index.toString())}
                                          title="Éditer ce lot"
                                        >
                                          <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button 
                                          variant="outline" 
                                          size="sm" 
                                          onClick={() => {
                                            const updatedLots = lots.filter((_, i) => i !== index);
                                            setLots(updatedLots);
                                            toast({ title: "Lot supprimé", description: "Le lot a été supprimé avec succès." });
                                          }}
                                          title="Supprimer ce lot"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Informations techniques détaillées */}
                                <div className="space-y-6">
                                  {/* Informations générales */}
                                  <div>
                                    <h6 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                      <Settings className="h-4 w-4" />
                                      Informations générales
                                    </h6>
                                    <div className="grid md:grid-cols-3 gap-4">
                                      <div>
                                        <Label className="text-sm text-on-surface-muted font-medium">Quantité</Label>
                                        {isEditing ? (
                                          <Input
                                            type="number"
                                            value={lot.quantite || ""}
                                            onChange={(e) => {
                                              const updatedLots = lots.map((l, i) => 
                                                i === index ? { ...l, quantite: parseInt(e.target.value) || 0 } : l
                                              );
                                              setLots(updatedLots);
                                            }}
                                            placeholder="Nombre d'éléments"
                                            className="mt-1"
                                          />
                                        ) : (
                                          <p className="font-medium mt-1">
                                            {lot.quantite ? `${lot.quantite} éléments` : <span className="text-on-surface-muted">Non spécifié</span>}
                                          </p>
                                        )}
                                      </div>
                                      
                                      <div>
                                        <Label className="text-sm text-on-surface-muted font-medium">Montant estimé (€)</Label>
                                        {isEditing ? (
                                          <Input
                                            type="number"
                                            value={lot.montantEstime || ""}
                                            onChange={(e) => {
                                              const updatedLots = lots.map((l, i) => 
                                                i === index ? { ...l, montantEstime: e.target.value } : l
                                              );
                                              setLots(updatedLots);
                                            }}
                                            placeholder="Montant en €"
                                            className="mt-1"
                                          />
                                        ) : (
                                          <p className="font-medium mt-1 text-success">
                                            {lot.montantEstime ? `${parseFloat(lot.montantEstime).toLocaleString('fr-FR')} €` : <span className="text-on-surface-muted">Non défini</span>}
                                          </p>
                                        )}
                                      </div>
                                      
                                      <div>
                                        <Label className="text-sm text-on-surface-muted font-medium">Statut du lot</Label>
                                        {isEditing ? (
                                          <Select 
                                            value={lot.status || "brouillon"} 
                                            onValueChange={(value) => {
                                              const updatedLots = lots.map((l, i) => 
                                                i === index ? { ...l, status: value } : l
                                              );
                                              setLots(updatedLots);
                                            }}
                                          >
                                            <SelectTrigger className="mt-1">
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              {LOT_STATUS_OPTIONS.map(option => (
                                                <SelectItem key={option.value} value={option.value}>
                                                  {option.label}
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        ) : (
                                          <div className="mt-1">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
                                              {statusInfo.label}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Informations matériaux */}
                                  <div>
                                    <h6 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                      <Building className="h-4 w-4" />
                                      Matériaux et finitions
                                    </h6>
                                    <div className="grid md:grid-cols-4 gap-4">
                                      <div>
                                        <Label className="text-sm text-on-surface-muted font-medium">Matériau</Label>
                                        {isEditing ? (
                                          <Input
                                            value={lot.materiau || ""}
                                            onChange={(e) => {
                                              const updatedLots = lots.map((l, i) => 
                                                i === index ? { ...l, materiau: e.target.value } : l
                                              );
                                              setLots(updatedLots);
                                            }}
                                            placeholder="Ex: Aluminium, PVC, Bois"
                                            className="mt-1"
                                          />
                                        ) : (
                                          <p className="font-medium mt-1">
                                            {lot.materiau || <span className="text-on-surface-muted">Non spécifié</span>}
                                          </p>
                                        )}
                                      </div>
                                      
                                      <div>
                                        <Label className="text-sm text-on-surface-muted font-medium">Vitrage</Label>
                                        {isEditing ? (
                                          <Input
                                            value={lot.vitrage || ""}
                                            onChange={(e) => {
                                              const updatedLots = lots.map((l, i) => 
                                                i === index ? { ...l, vitrage: e.target.value } : l
                                              );
                                              setLots(updatedLots);
                                            }}
                                            placeholder="Ex: Double vitrage"
                                            className="mt-1"
                                          />
                                        ) : (
                                          <p className="font-medium mt-1">
                                            {lot.vitrage || <span className="text-on-surface-muted">N/A</span>}
                                          </p>
                                        )}
                                      </div>
                                      
                                      <div>
                                        <Label className="text-sm text-on-surface-muted font-medium">Couleur</Label>
                                        {isEditing ? (
                                          <Input
                                            value={lot.couleur || ""}
                                            onChange={(e) => {
                                              const updatedLots = lots.map((l, i) => 
                                                i === index ? { ...l, couleur: e.target.value } : l
                                              );
                                              setLots(updatedLots);
                                            }}
                                            placeholder="Ex: RAL 7016"
                                            className="mt-1"
                                          />
                                        ) : (
                                          <p className="font-medium mt-1">
                                            {lot.couleur || <span className="text-on-surface-muted">Non spécifiée</span>}
                                          </p>
                                        )}
                                      </div>
                                      
                                      <div>
                                        <Label className="text-sm text-on-surface-muted font-medium">Dimensions</Label>
                                        {isEditing ? (
                                          <Input
                                            value={lot.dimensions || ""}
                                            onChange={(e) => {
                                              const updatedLots = lots.map((l, i) => 
                                                i === index ? { ...l, dimensions: e.target.value } : l
                                              );
                                              setLots(updatedLots);
                                            }}
                                            placeholder="Ex: 135x120 cm"
                                            className="mt-1"
                                          />
                                        ) : (
                                          <p className="font-medium mt-1">
                                            {lot.dimensions || <span className="text-on-surface-muted">Non spécifiées</span>}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Performances et localisation */}
                                  <div>
                                    <h6 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                      <MapPin className="h-4 w-4" />
                                      Performances et localisation
                                    </h6>
                                    <div className="grid md:grid-cols-3 gap-4">
                                      <div>
                                        <Label className="text-sm text-on-surface-muted font-medium">Localisation</Label>
                                        {isEditing ? (
                                          <Input
                                            value={lot.localisation || ""}
                                            onChange={(e) => {
                                              const updatedLots = lots.map((l, i) => 
                                                i === index ? { ...l, localisation: e.target.value } : l
                                              );
                                              setLots(updatedLots);
                                            }}
                                            placeholder="Ex: Façade Sud"
                                            className="mt-1"
                                          />
                                        ) : (
                                          <p className="font-medium mt-1">
                                            {lot.localisation || <span className="text-on-surface-muted">Non spécifiée</span>}
                                          </p>
                                        )}
                                      </div>
                                      
                                      <div>
                                        <Label className="text-sm text-on-surface-muted font-medium">Performance thermique</Label>
                                        {isEditing ? (
                                          <Input
                                            value={lot.performanceThermique || ""}
                                            onChange={(e) => {
                                              const updatedLots = lots.map((l, i) => 
                                                i === index ? { ...l, performanceThermique: e.target.value } : l
                                              );
                                              setLots(updatedLots);
                                            }}
                                            placeholder="Ex: Uw ≤ 1,4 W/m².K"
                                            className="mt-1"
                                          />
                                        ) : (
                                          <p className="font-medium mt-1">
                                            {lot.performanceThermique || <span className="text-on-surface-muted">N/A</span>}
                                          </p>
                                        )}
                                      </div>
                                      
                                      <div>
                                        <Label className="text-sm text-on-surface-muted font-medium">Performance acoustique</Label>
                                        {isEditing ? (
                                          <Input
                                            value={lot.performanceAcoustique || ""}
                                            onChange={(e) => {
                                              const updatedLots = lots.map((l, i) => 
                                                i === index ? { ...l, performanceAcoustique: e.target.value } : l
                                              );
                                              setLots(updatedLots);
                                            }}
                                            placeholder="Ex: Rw ≥ 35 dB"
                                            className="mt-1"
                                          />
                                        ) : (
                                          <p className="font-medium mt-1">
                                            {lot.performanceAcoustique || <span className="text-on-surface-muted">N/A</span>}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Informations contractuelles */}
                                  <div>
                                    <h6 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                      <Calendar className="h-4 w-4" />
                                      Informations contractuelles
                                    </h6>
                                    <div className="grid md:grid-cols-3 gap-4">
                                      <div>
                                        <Label className="text-sm text-on-surface-muted font-medium">Délai de livraison</Label>
                                        {isEditing ? (
                                          <Input
                                            value={lot.delaiLivraison || ""}
                                            onChange={(e) => {
                                              const updatedLots = lots.map((l, i) => 
                                                i === index ? { ...l, delaiLivraison: e.target.value } : l
                                              );
                                              setLots(updatedLots);
                                            }}
                                            placeholder="Ex: 8 semaines"
                                            className="mt-1"
                                          />
                                        ) : (
                                          <p className="font-medium mt-1">
                                            {lot.delaiLivraison || <span className="text-on-surface-muted">Non spécifié</span>}
                                          </p>
                                        )}
                                      </div>
                                      
                                      <div>
                                        <Label className="text-sm text-on-surface-muted font-medium">Unité d'œuvre</Label>
                                        {isEditing ? (
                                          <Input
                                            value={lot.uniteOeuvre || ""}
                                            onChange={(e) => {
                                              const updatedLots = lots.map((l, i) => 
                                                i === index ? { ...l, uniteOeuvre: e.target.value } : l
                                              );
                                              setLots(updatedLots);
                                            }}
                                            placeholder="Ex: À l'unité"
                                            className="mt-1"
                                          />
                                        ) : (
                                          <p className="font-medium mt-1">
                                            {lot.uniteOeuvre || <span className="text-on-surface-muted">Non spécifiée</span>}
                                          </p>
                                        )}
                                      </div>
                                      
                                      <div>
                                        <Label className="text-sm text-on-surface-muted font-medium">Source</Label>
                                        <p className="font-medium text-primary mt-1 flex items-center gap-1">
                                          <div className="h-2 w-2 bg-primary rounded-full"></div>
                                          {lot.id?.includes('temp-') ? 'Manuel' : 'OCR'}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Accessoires et normes */}
                                  {(lot.accessoires || lot.normes) && (
                                    <div>
                                      <h6 className="font-semibold text-gray-800 mb-3">Accessoires et normes</h6>
                                      <div className="grid md:grid-cols-2 gap-4">
                                        {lot.accessoires && (
                                          <div>
                                            <Label className="text-sm text-on-surface-muted font-medium">Accessoires</Label>
                                            <p className="text-sm text-gray-700 mt-1">{lot.accessoires}</p>
                                          </div>
                                        )}
                                        {lot.normes && lot.normes.length > 0 && (
                                          <div>
                                            <Label className="text-sm text-on-surface-muted font-medium">Normes</Label>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                              {lot.normes.map((norme, idx) => (
                                                <span key={idx} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                                                  {norme}
                                                </span>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                                
                                {/* Commentaires techniques (bruts depuis l'OCR) */}
                                {lot.comment && (
                                  <div className="mt-6 pt-4 border-t border-border">
                                    <details className="group">
                                      <summary className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                                        <FileText className="h-4 w-4" />
                                        Données brutes OCR (cliquez pour voir)
                                        <div className="ml-auto group-open:rotate-180 transition-transform">
                                          ▼
                                        </div>
                                      </summary>
                                      <div className="mt-3 p-3 bg-surface-muted rounded-lg text-sm font-mono text-on-surface-muted whitespace-pre-line border">
                                        {lot.comment}
                                      </div>
                                    </details>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          
                          {/* Résumé avancé des lots */}
                          <div className="bg-gradient-to-r from-success/10 to-primary/10 border border-success/20 rounded-lg p-6 mt-6">
                            <h4 className="font-semibold text-gray-800 mb-4">Résumé des lots</h4>
                            
                            {/* Statistiques principales */}
                            <div className="grid md:grid-cols-4 gap-4 mb-6">
                              <div className="text-center">
                                <p className="text-2xl font-bold text-primary">{lots.length}</p>
                                <p className="text-sm text-on-surface-muted">Lots totaux</p>
                              </div>
                              <div className="text-center">
                                <p className="text-2xl font-bold text-success">
                                  {lots.filter(lot => ['chiffrage_valide', 'commande_en_cours', 'livre'].includes(lot.status || '')).length}
                                </p>
                                <p className="text-sm text-on-surface-muted">Validés</p>
                              </div>
                              <div className="text-center">
                                <p className="text-2xl font-bold text-warning">
                                  {lots.filter(lot => ['brouillon', 'en_attente_fournisseur'].includes(lot.status || 'brouillon')).length}
                                </p>
                                <p className="text-sm text-on-surface-muted">En attente</p>
                              </div>
                              <div className="text-center">
                                <div>
                                  <span className="text-2xl font-bold text-success">
                                    {lots.reduce((total, lot) => {
                                      return total + (lot.montantEstime ? parseFloat(lot.montantEstime) : 0);
                                    }, 0).toLocaleString('fr-FR')} €
                                  </span>
                                  <p className="text-xs text-on-surface-muted">Total estimé HT</p>
                                </div>
                              </div>
                            </div>
                            
                            {/* Détail des statuts */}
                            <div className="border-t border-border pt-4">
                              <h5 className="font-medium text-gray-700 mb-3">Répartition par statut</h5>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {LOT_STATUS_OPTIONS.map(statusOption => {
                                  const count = lots.filter(lot => lot.status === statusOption.value || (!lot.status && statusOption.value === 'brouillon')).length;
                                  if (count === 0) return null;
                                  return (
                                    <div key={statusOption.value} className="flex items-center justify-between bg-white rounded-lg p-3 border">
                                      <div className="flex items-center gap-2">
                                        <div className={`h-3 w-3 rounded-full ${statusOption.color.includes('red') ? 'bg-red-500' : statusOption.color.includes('green') ? 'bg-success/100' : statusOption.color.includes('blue') ? 'bg-primary' : statusOption.color.includes('yellow') ? 'bg-yellow-500' : statusOption.color.includes('orange') ? 'bg-orange-500' : statusOption.color.includes('purple') ? 'bg-purple-500' : 'bg-surface-muted0'}`}></div>
                                        <span className="text-sm font-medium">{statusOption.label}</span>
                                      </div>
                                      <span className="text-sm font-bold text-on-surface-muted">{count}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8 border-2 border-dashed border-border rounded-lg bg-surface-muted">
                          <FileText className="h-16 w-16 text-on-surface-muted mx-auto mb-4" />
                          <p className="text-lg font-medium text-on-surface-muted mb-2">Aucun lot détecté par l'OCR</p>
                          <p className="text-sm text-on-surface-muted mb-4">Les documents PDF n'ont pas révélé de lots menuiserie exploitables</p>
                          <Button variant="outline" className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Re-analyser les documents
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Actions de chiffrage */}
                    <div className="bg-gradient-to-r from-primary/10 to-success/10 border border-primary/20 rounded-lg p-6">
                      <h4 className="font-semibold mb-4 flex items-center gap-2">
                        <Calculator className="h-5 w-5" />
                        Actions de chiffrage
                      </h4>
                      <div className="grid md:grid-cols-2 gap-4">
                        <Button 
                          onClick={() => setLocation(`/create-offer?aoId=${id}`)}
                          className="flex items-center gap-2 h-auto py-3"
                          disabled={lots.length === 0}
                          size="lg"
                        >
                          <Calculator className="h-5 w-5" />
                          <div className="text-left">
                            <div className="font-medium">Créer l'offre complète</div>
                            <div className="text-xs opacity-90">Pré-remplie avec les données OCR</div>
                          </div>
                        </Button>
                        
                        <Button 
                          variant="outline" 
                          className="flex items-center gap-2 h-auto py-3"
                          size="lg"
                        >
                          <FileText className="h-5 w-5" />
                          <div className="text-left">
                            <div className="font-medium">Re-analyser les PDF</div>
                            <div className="text-xs text-on-surface-muted">Nouvelle extraction OCR</div>
                          </div>
                        </Button>
                      </div>
                      
                      {lots.length === 0 && (
                        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                          <p className="text-sm text-amber-700 flex items-center gap-2">
                            <div className="h-2 w-2 bg-amber-500 rounded-full"></div>
                            Aucun lot détecté : Vérifiez les documents PDF ou ajoutez manuellement des lots
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Informations complémentaires OCR */}
                    <div>
                      <h4 className="font-medium mb-3">Données extraites du CCTP</h4>
                      <div className="grid md:grid-cols-2 gap-4">
                        {formData.bureauEtudes && (
                          <div>
                            <Label className="text-sm text-on-surface-muted">Bureau d'études</Label>
                            <p className="font-medium">{formData.bureauEtudes}</p>
                          </div>
                        )}
                        
                        {formData.bureauControle && (
                          <div>
                            <Label className="text-sm text-on-surface-muted">Bureau de contrôle</Label>
                            <p className="font-medium">{formData.bureauControle}</p>
                          </div>
                        )}
                        
                        {formData.sps && (
                          <div>
                            <Label className="text-sm text-on-surface-muted">Coordinateur SPS</Label>
                            <p className="font-medium">{formData.sps}</p>
                          </div>
                        )}
                        
                        {formData.montantEstime && (
                          <div>
                            <Label className="text-sm text-on-surface-muted">Budget estimé global</Label>
                            <p className="font-medium">{parseFloat(formData.montantEstime).toLocaleString('fr-FR')} €</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="documents" className="space-y-6 mt-6">
              {/* Bascule entre vue compacte et détaillée */}
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Documents du dossier</h3>
                <div className="flex items-center gap-2">
                  <Button
                    variant={compactDocumentView ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCompactDocumentView(true)}
                  >
                    Vue synthétique
                  </Button>
                  <Button
                    variant={!compactDocumentView ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCompactDocumentView(false)}
                  >
                    Vue détaillée
                  </Button>
                </div>
              </div>

              {compactDocumentView ? (
                <CompactDocumentView
                  documents={aoDocuments}
                  onFileUpload={(files: FileList, folderName: string) => {
                    // Adapter la FileList vers des uploads individuels
                    Array.from(files).forEach(file => {
                      uploadFile(file, folderName).catch(console.error);
                    });
                  }}
                  uploadProgress={Object.keys(uploadProgress).length > 0 ? 50 : 0}
                  isUploading={isUploading}
                  onView={(doc) => console.log('View document:', doc)}
                  onDownload={(doc) => console.log('Download document:', doc)}
                />
              ) : (
                <div className="grid gap-6">
                  {/* Section 1: DCE, Côtes et Photos */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <FolderOpen className="h-5 w-5" />
                        <span>01 - DCE, Côtes et Photos</span>
                      </CardTitle>
                      <p className="text-sm text-on-surface-muted">Documents de consultation des entreprises, côtes et photos du site</p>
                    </CardHeader>
                    <CardContent>
                      <DocumentUploadZone
                        folderName="01-DCE-Cotes-Photos"
                        onFileUpload={uploadFile}
                        uploadProgress={uploadProgress}
                        isUploading={isUploading}
                        documents={aoDocuments['01-DCE-Cotes-Photos'] || []}
                      />
                    </CardContent>
                  </Card>

                  {/* Section 2: Études fournisseurs */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <FolderOpen className="h-5 w-5" />
                        <span>02 - Études fournisseurs</span>
                      </CardTitle>
                      <p className="text-sm text-on-surface-muted">Devis, catalogues et documentations techniques des fournisseurs</p>
                    </CardHeader>
                    <CardContent>
                      <DocumentUploadZone
                        folderName="02-Etudes-fournisseurs"
                        onFileUpload={uploadFile}
                        uploadProgress={uploadProgress}
                        isUploading={isUploading}
                        documents={aoDocuments['02-Etudes-fournisseurs'] || []}
                      />
                    </CardContent>
                  </Card>

                  {/* Section 3: Devis et pièces administratives */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <FolderOpen className="h-5 w-5" />
                        <span>03 - Devis et pièces administratives</span>
                      </CardTitle>
                      <p className="text-sm text-on-surface-muted">Devis JLM, pièces administratives et documents contractuels</p>
                    </CardHeader>
                    <CardContent>
                      <DocumentUploadZone
                        folderName="03-Devis-pieces-administratives"
                        onFileUpload={uploadFile}
                        uploadProgress={uploadProgress}
                        isUploading={isUploading}
                        documents={aoDocuments['03-Devis-pieces-administratives'] || []}
                      />
                    </CardContent>
                  </Card>

                  {/* Résumé des documents */}
                  <Card className="bg-surface-muted border-border">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">Résumé des documents</h4>
                          <p className="text-sm text-on-surface-muted">Total des fichiers stockés pour ce dossier</p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-gray-900">{documentStats.total}</div>
                          <div className="text-xs text-on-surface-muted">documents</div>
                        </div>
                      </div>
                      
                      <div className="mt-4 pt-3 border-t border-border">
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div>
                            <div className="text-lg font-semibold text-gray-700">{documentStats['dce-photos']}</div>
                            <div className="text-xs text-on-surface-muted">DCE & Photos</div>
                          </div>
                          <div>
                            <div className="text-lg font-semibold text-gray-700">{documentStats.etudes}</div>
                            <div className="text-xs text-on-surface-muted">Études</div>
                          </div>
                          <div>
                            <div className="text-lg font-semibold text-gray-700">{documentStats['devis-admin']}</div>
                            <div className="text-xs text-on-surface-muted">Devis & Admin</div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>

            <TabsContent value="validation" className="space-y-6 mt-6">
              {ao && (
                <EnhancedBeValidation
                  offerId={ao.id}
                  validationType="fin_etudes"
                  onValidationComplete={(result) => {
                    console.log('Validation completed:', result);
                    toast({
                      title: "Validation complétée",
                      description: "La validation BE a été effectuée avec succès.",
                    });
                    // Optionnel: mettre à jour le statut de l'AO
                    // queryClient.invalidateQueries({ queryKey: [`/api/aos/${id}`] });
                  }}
                  className=""
                />
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Formulaires de création de contacts */}
      <MaitreOuvrageForm
        isOpen={showMaitreOuvrageForm}
        onClose={() => setShowMaitreOuvrageForm(false)}
        onSuccess={(newMaitreOuvrage) => {
          setSelectedMaitreOuvrage(newMaitreOuvrage);
          handleFieldChange("maitreOuvrageId", newMaitreOuvrage.id);
        }}
      />

      <MaitreOeuvreForm
        isOpen={showMaitreOeuvreForm}
        onClose={() => setShowMaitreOeuvreForm(false)}
        onSuccess={(newMaitreOeuvre) => {
          setSelectedMaitreOeuvre(newMaitreOeuvre);
          handleFieldChange("maitreOeuvreId", newMaitreOeuvre.id);
        }}
      />
    </div>
  );
}