import { useState, useEffect, useCallback } from "react";
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
import { FileText, Calendar, MapPin, User, Building, CheckCircle2, ArrowLeft, Calculator, Loader2 } from "lucide-react";
import { debounce } from "lodash";

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
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [lots, setLots] = useState<Lot[]>([]);
  
  // État local pour le formulaire qui se sauvegarde automatiquement
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

  // Fonction de sauvegarde automatique avec debounce
  const saveAO = useCallback(
    debounce(async (data: any) => {
      setIsSaving(true);
      try {
        const dateRenduAO = data.dateLimiteRemise ? calculateDateRendu(data.dateLimiteRemise) : undefined;
        
        const aoData = {
          ...data,
          dateRenduAO,
          montantEstime: data.montantEstime ? parseFloat(data.montantEstime) : undefined,
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
        setLastSaved(new Date());
        
        queryClient.invalidateQueries({ queryKey: ["/api/aos"] });
        queryClient.invalidateQueries({ queryKey: ["/api/aos", id] });
        
        toast({
          title: "✓ Sauvegardé",
          description: "Les modifications ont été enregistrées automatiquement",
          duration: 2000,
        });
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
    }, 1500), // Délai de 1.5 secondes avant sauvegarde
    [id, selectedMaitreOuvrage, selectedMaitreOeuvre]
  );

  // Gérer les changements de champs avec sauvegarde automatique
  const handleFieldChange = (field: string, value: any) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);
    saveAO(newData);
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
          title={`AO ${ao.reference}${isSaving ? ' - Sauvegarde...' : lastSaved ? ' ✓' : ''}`}
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
        
        <div className="px-6 py-6 space-y-6">
          {/* Informations de base */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Informations de base</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
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
            <CardContent className="grid gap-4 md:grid-cols-2">
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
            <CardContent className="grid gap-4 md:grid-cols-2">
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
            <CardContent className="space-y-4">
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
            </CardContent>
          </Card>

          {/* Informations techniques et financières */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Building className="h-5 w-5" />
                <span>Informations techniques et financières</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
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
            </CardContent>
          </Card>

          {/* Gestion des lots */}
          <Card>
            <CardHeader>
              <CardTitle>Lots menuiserie</CardTitle>
            </CardHeader>
            <CardContent>
              <LotsManager
                lots={lots}
                onLotsChange={(updatedLots: Lot[]) => {
                  setLots(updatedLots);
                  // Sauvegarder les lots automatiquement
                  // TODO: Implémenter la sauvegarde des lots
                }}
              />
            </CardContent>
          </Card>
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