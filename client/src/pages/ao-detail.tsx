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
import { FileText, Calendar, MapPin, User, Building, Save, ArrowLeft, Calculator, Edit, X, CheckCircle, Euro } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Lot {
  id?: string;
  numero: string;
  designation: string;
  menuiserieType?: string;
  montantEstime?: string;
  isSelected: boolean;
  comment?: string;
}

export default function AoDetail() {
  const { toast } = useToast();
  const [_, setLocation] = useLocation();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lots, setLots] = useState<Lot[]>([]);
  const [activeTab, setActiveTab] = useState("informations");
  
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
      return response.json();
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

  // Initialiser les lots
  useEffect(() => {
    if (aoLots.length > 0) {
      const formattedLots = aoLots.map((lot: any) => ({
        id: lot.id,
        numero: lot.numero,
        designation: lot.designation,
        menuiserieType: lot.menuiserieType,
        montantEstime: lot.montantEstime ? lot.montantEstime.toString() : "",
        isSelected: true,
        comment: lot.comment || "",
      }));
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
      <div className="min-h-screen flex bg-gray-50">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-500">Chargement de l'AO...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!ao) {
    return (
      <div className="min-h-screen flex bg-gray-50">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <div className="text-center py-8">
            <p className="text-red-500">AO non trouvé</p>
            <Button onClick={() => setLocation("/offers")} className="mt-4">
              Retour à la liste
            </Button>
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
          title={`AO ${ao.reference}`}
          breadcrumbs={[
            { label: "Accueil", href: "/" },
            { label: "Appels d'Offres", href: "/offers" },
            { label: ao.reference }
          ]}
          actions={[
            {
              label: "Retour",
              variant: "outline",
              icon: "arrow-left",
              onClick: () => setLocation("/offers")
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
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="informations" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Informations
              </TabsTrigger>
              <TabsTrigger value="chiffrage" className="flex items-center gap-2">
                <Euro className="h-4 w-4" />
                Chiffrage
              </TabsTrigger>
              <TabsTrigger value="validation" className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Validation BE
              </TabsTrigger>
            </TabsList>

            <TabsContent value="informations" className="space-y-6 mt-6">
          {/* Barre d'actions en mode édition */}
          {isEditing && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-blue-800">Mode édition activé - Modifiez les champs puis enregistrez</span>
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
                      <Label className="text-sm text-gray-600">Référence</Label>
                      <p className="font-medium">{formData.reference || "Non définie"}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-600">Client</Label>
                      <p className="font-medium">{formData.client || "Non défini"}</p>
                    </div>
                  </div>
                  
                  {formData.intituleOperation && (
                    <div>
                      <Label className="text-sm text-gray-600">Intitulé de l'opération</Label>
                      <p className="font-medium">{formData.intituleOperation}</p>
                    </div>
                  )}
                  
                  <div>
                    <Label className="text-sm text-gray-600">Type de menuiserie</Label>
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
                      <Label className="text-sm text-gray-600">Description</Label>
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
                    <Label className="text-sm text-gray-600">Adresse du chantier</Label>
                    <p className="font-medium">{formData.location || "Non définie"}</p>
                  </div>
                  
                  {formData.departement && (
                    <div>
                      <Label className="text-sm text-gray-600">Département</Label>
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
                  <div>
                    <Label htmlFor="dateLimite">Date limite de remise</Label>
                    <Input
                      id="dateLimite"
                      type="date"
                      value={formData.dateLimiteRemise}
                      onChange={(e) => handleFieldChange("dateLimiteRemise", e.target.value)}
                      data-testid="input-date-limite"
                    />
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
                      <Label className="text-sm text-gray-600">Date limite de remise</Label>
                      <p className="font-medium">{new Date(formData.dateLimiteRemise).toLocaleDateString('fr-FR')}</p>
                    </div>
                  )}
                  
                  {formData.dateSortieAO && (
                    <div>
                      <Label className="text-sm text-gray-600">Date sortie AO</Label>
                      <p className="font-medium">{new Date(formData.dateSortieAO).toLocaleDateString('fr-FR')}</p>
                    </div>
                  )}
                  
                  {formData.dateAcceptationAO && (
                    <div>
                      <Label className="text-sm text-gray-600">Date acceptation</Label>
                      <p className="font-medium">{new Date(formData.dateAcceptationAO).toLocaleDateString('fr-FR')}</p>
                    </div>
                  )}
                  
                  {formData.demarragePrevu && (
                    <div>
                      <Label className="text-sm text-gray-600">Démarrage prévu</Label>
                      <p className="font-medium">{new Date(formData.demarragePrevu).toLocaleDateString('fr-FR')}</p>
                    </div>
                  )}
                  
                  {!formData.dateLimiteRemise && !formData.dateSortieAO && !formData.dateAcceptationAO && !formData.demarragePrevu && (
                    <p className="text-gray-500 text-sm">Aucune date définie</p>
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
                      <Label className="text-sm text-gray-600">Maître d'ouvrage</Label>
                      <p className="font-medium">{selectedMaitreOuvrage.nom}</p>
                      {selectedMaitreOuvrage.ville && (
                        <p className="text-sm text-gray-500">{selectedMaitreOuvrage.ville}</p>
                      )}
                    </div>
                  )}
                  
                  {selectedMaitreOeuvre && (
                    <div>
                      <Label className="text-sm text-gray-600">Maître d'œuvre</Label>
                      <p className="font-medium">{selectedMaitreOeuvre.nom}</p>
                      {selectedMaitreOeuvre.typeOrganisation && (
                        <p className="text-sm text-gray-500">{selectedMaitreOeuvre.typeOrganisation}</p>
                      )}
                    </div>
                  )}
                  
                  {(formData.contactAONom || formData.contactAOEmail || formData.contactAOTelephone) && (
                    <div>
                      <Label className="text-sm text-gray-600">Contact AO</Label>
                      {formData.contactAONom && (
                        <p className="font-medium">{formData.contactAONom}</p>
                      )}
                      {formData.contactAOPoste && (
                        <p className="text-sm text-gray-500">{formData.contactAOPoste}</p>
                      )}
                      <div className="flex flex-col text-sm text-gray-600">
                        {formData.contactAOEmail && <span>{formData.contactAOEmail}</span>}
                        {formData.contactAOTelephone && <span>{formData.contactAOTelephone}</span>}
                      </div>
                    </div>
                  )}
                  
                  {!selectedMaitreOuvrage && !selectedMaitreOeuvre && !formData.contactAONom && !formData.contactAOEmail && (
                    <p className="text-gray-500 text-sm">Aucun contact défini</p>
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
                        <Label className="text-sm text-gray-600">Montant estimé</Label>
                        <p className="font-medium">{parseFloat(formData.montantEstime).toLocaleString('fr-FR')} €</p>
                      </div>
                    )}
                    
                    {formData.typeMarche && (
                      <div>
                        <Label className="text-sm text-gray-600">Type de marché</Label>
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
                        <Label className="text-sm text-gray-600">Bureau d'études</Label>
                        <p className="font-medium">{formData.bureauEtudes}</p>
                      </div>
                    )}
                    
                    {formData.bureauControle && (
                      <div>
                        <Label className="text-sm text-gray-600">Bureau de contrôle</Label>
                        <p className="font-medium">{formData.bureauControle}</p>
                      </div>
                    )}
                    
                    {formData.sps && (
                      <div>
                        <Label className="text-sm text-gray-600">SPS</Label>
                        <p className="font-medium">{formData.sps}</p>
                      </div>
                    )}
                    
                    {formData.source && (
                      <div>
                        <Label className="text-sm text-gray-600">Source AO</Label>
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
                            <span className="text-sm text-gray-500 ml-2">-</span>
                            <span className="text-sm ml-2">{lot.designation}</span>
                          </div>
                          {lot.montantEstime && (
                            <span className="font-medium text-green-600">
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
                  <p className="text-gray-500 text-sm">Aucun lot défini</p>
                )}
              </CardContent>
            </Card>
          )}
            </TabsContent>

            <TabsContent value="chiffrage" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Euro className="h-5 w-5" />
                    <span>Module de chiffrage</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <Euro className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Module de chiffrage</h3>
                    <p className="text-gray-500 mb-6">
                      Transformez cet AO en dossier d'offre pour commencer le chiffrage détaillé.
                    </p>
                    <Button 
                      onClick={() => setLocation(`/create-offer?aoId=${id}`)}
                      className="flex items-center gap-2"
                    >
                      <Calculator className="h-4 w-4" />
                      Créer l'offre de chiffrage
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="validation" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5" />
                    <span>Validation Bureau d'Études</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Statut de validation */}
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-3 w-3 bg-amber-400 rounded-full"></div>
                        <div>
                          <p className="font-medium text-amber-800">En attente de validation</p>
                          <p className="text-sm text-amber-600">L'AO nécessite une validation du Bureau d'Études avant de passer en chiffrage</p>
                        </div>
                      </div>
                    </div>

                    {/* Critères de validation */}
                    <div>
                      <h4 className="font-medium mb-3">Critères de validation</h4>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="h-2 w-2 bg-gray-300 rounded-full"></div>
                          <span className="text-sm">Analyse du CCTP et des plans</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="h-2 w-2 bg-gray-300 rounded-full"></div>
                          <span className="text-sm">Vérification de la faisabilité technique</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="h-2 w-2 bg-gray-300 rounded-full"></div>
                          <span className="text-sm">Validation des lots menuiserie</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="h-2 w-2 bg-gray-300 rounded-full"></div>
                          <span className="text-sm">Estimation préliminaire des coûts</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions de validation */}
                    <div className="flex gap-3 pt-4">
                      <Button variant="outline" className="flex-1">
                        <X className="h-4 w-4 mr-2" />
                        Rejeter l'AO
                      </Button>
                      <Button className="flex-1">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Valider pour chiffrage
                      </Button>
                    </div>

                    {/* Commentaires BE */}
                    <div>
                      <Label htmlFor="commentairesBE">Commentaires du Bureau d'Études</Label>
                      <Textarea
                        id="commentairesBE"
                        placeholder="Ajoutez vos observations et recommandations..."
                        rows={4}
                        className="mt-2"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
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