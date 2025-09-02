import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Save, 
  FileText, 
  MapPin, 
  Calendar, 
  User, 
  Building, 
  Package, 
  Euro, 
  Settings, 
  CheckCircle,
  AlertCircle,
  ArrowLeft
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

// Schéma de validation pour le formulaire complet
const createOfferSchema = z.object({
  // Informations générales AO
  reference: z.string().min(1, "Référence requise"),
  aoId: z.string().optional(),
  intituleOperation: z.string().optional(),
  
  // Localisation
  client: z.string().min(1, "Client requis"),
  location: z.string().min(1, "Localisation requise"),
  
  // Dates clés
  dateRenduAO: z.string().optional(),
  dateAcceptationAO: z.string().optional(),
  demarragePrevu: z.string().optional(),
  deadline: z.string().optional(),
  
  // Maître d'ouvrage
  maitreOuvrageNom: z.string().optional(),
  maitreOuvrageAdresse: z.string().optional(),
  maitreOuvrageContact: z.string().optional(),
  maitreOuvrageEmail: z.string().email().optional().or(z.literal("")),
  maitreOuvragePhone: z.string().optional(),
  
  // Maître d'œuvre
  maitreOeuvre: z.string().optional(),
  maitreOeuvreContact: z.string().optional(),
  
  // Lot et menuiserie
  lotConcerne: z.string().optional(),
  menuiserieType: z.enum(["fenetre", "porte", "portail", "volet", "cloison", "verriere", "autre"]),
  
  // Montant et marché
  montantEstime: z.string().optional(),
  typeMarche: z.enum(["public", "prive", "ao_restreint", "ao_ouvert", "marche_negocie", "procedure_adaptee"]).optional(),
  prorataEventuel: z.string().optional(),
  
  // Éléments techniques
  bureauEtudes: z.string().optional(),
  bureauControle: z.string().optional(),
  sps: z.string().optional(),
  
  // Suivi BE
  responsibleUserId: z.string().optional(),
  isPriority: z.boolean().default(false),
  beHoursEstimated: z.string().optional(),
  
  // Pièces obligatoires
  urssafValide: z.boolean().default(false),
  assuranceDecennaleValide: z.boolean().default(false),
  ribValide: z.boolean().default(false),
  qualificationsValides: z.boolean().default(false),
  planAssuranceQualiteValide: z.boolean().default(false),
  fichesTechniquesTransmises: z.boolean().default(false),
});

type CreateOfferFormData = z.infer<typeof createOfferSchema>;

export default function CreateOffer() {
  const { toast } = useToast();
  const [_, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [selectedAoId, setSelectedAoId] = useState<string>("");

  // Récupérer les AO pour le sélecteur
  const { data: aos = [], isLoading: aosLoading } = useQuery<any[]>({
    queryKey: ["/api/aos"],
  });

  // Récupérer les utilisateurs pour le responsable
  const { data: users = [], isLoading: usersLoading } = useQuery<any[]>({
    queryKey: ["/api/users"],
  });

  // Configuration du formulaire
  const form = useForm<CreateOfferFormData>({
    resolver: zodResolver(createOfferSchema),
    defaultValues: {
      reference: "",
      aoId: "",
      intituleOperation: "",
      client: "",
      location: "",
      menuiserieType: "fenetre",
      isPriority: false,
      urssafValide: false,
      assuranceDecennaleValide: false,
      ribValide: false,
      qualificationsValides: false,
      planAssuranceQualiteValide: false,
      fichesTechniquesTransmises: false,
    },
  });

  // Mutation pour créer l'offre
  const createOfferMutation = useMutation({
    mutationFn: async (data: CreateOfferFormData) => {
      return await apiRequest("/api/offers", {
        method: "POST",
        body: JSON.stringify(data),
        headers: {
          "Content-Type": "application/json",
        },
      });
    },
    onSuccess: (newOffer: any) => {
      toast({
        title: "Dossier d'offre créé",
        description: `Le dossier ${newOffer.reference} a été créé avec succès.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/offers"] });
      setLocation("/offers");
    },
    onError: (error: any) => {
      console.error("Error creating offer:", error);
      toast({
        title: "Erreur",
        description: "Impossible de créer le dossier d'offre.",
        variant: "destructive",
      });
    },
  });

  // Pré-remplissage automatique depuis AO sélectionné
  useEffect(() => {
    if (selectedAoId && aos.length > 0) {
      const selectedAo = aos.find(ao => ao.id === selectedAoId);
      if (selectedAo) {
        // Générer une référence automatique basée sur l'AO
        const currentYear = new Date().getFullYear();
        const aoNumber = selectedAo.reference.split('-').pop() || '001';
        const newReference = `OFF-${currentYear}-${aoNumber}`;
        
        // Pré-remplir le formulaire avec les données de l'AO
        form.reset({
          ...form.getValues(),
          aoId: selectedAo.id,
          reference: newReference,
          client: selectedAo.client || "",
          location: selectedAo.location || "",
          intituleOperation: selectedAo.intituleOperation || selectedAo.description || "",
          menuiserieType: selectedAo.menuiserieType || "fenetre",
          montantEstime: selectedAo.montantEstime || "",
          maitreOuvrageNom: selectedAo.maitreOuvrageNom || selectedAo.client || "",
          maitreOuvrageAdresse: selectedAo.maitreOuvrageAdresse || "",
          maitreOuvrageContact: selectedAo.maitreOuvrageContact || "",
          maitreOuvrageEmail: selectedAo.maitreOuvrageEmail || "",
          maitreOuvragePhone: selectedAo.maitreOuvragePhone || "",
          maitreOeuvre: selectedAo.maitreOeuvre || "",
          maitreOeuvreContact: selectedAo.maitreOeuvreContact || "",
          lotConcerne: selectedAo.lotConcerne || "",
          typeMarche: selectedAo.typeMarche || undefined,
          prorataEventuel: selectedAo.prorataEventuel || "",
          bureauEtudes: selectedAo.bureauEtudes || "",
          bureauControle: selectedAo.bureauControle || "",
          sps: selectedAo.sps || "",
          dateRenduAO: selectedAo.dateRenduAO ? format(new Date(selectedAo.dateRenduAO), 'yyyy-MM-dd') : "",
          dateAcceptationAO: selectedAo.dateAcceptationAO ? format(new Date(selectedAo.dateAcceptationAO), 'yyyy-MM-dd') : "",
          demarragePrevu: selectedAo.demarragePrevu ? format(new Date(selectedAo.demarragePrevu), 'yyyy-MM-dd') : "",
        });

        toast({
          title: "Pré-remplissage automatique",
          description: `Données récupérées depuis l'AO ${selectedAo.reference}`,
        });
      }
    }
  }, [selectedAoId, aos, form, toast]);

  const onSubmit = (data: CreateOfferFormData) => {
    createOfferMutation.mutate(data);
  };

  // Calculer le pourcentage de complétude du formulaire
  const getFormCompleteness = (): number => {
    const values = form.getValues();
    const totalFields = Object.keys(createOfferSchema.shape).length;
    const completedFields = Object.entries(values).filter(([_, value]) => {
      if (typeof value === 'boolean') return true; // Les booléens sont toujours "complétés"
      if (typeof value === 'string') return value.trim() !== '';
      return value != null;
    }).length;
    
    return Math.round((completedFields / totalFields) * 100);
  };

  const completeness = getFormCompleteness();

  return (
    <div className="min-h-screen flex bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Header 
          title="Création Dossier d'Offre"
          breadcrumbs={[
            { label: "Accueil", href: "/" },
            { label: "Offres", href: "/offers" },
            { label: "Nouvelle Offre" }
          ]}
          actions={[
            {
              label: "Retour",
              variant: "outline",
              icon: "arrow-left",
              onClick: () => setLocation("/offers")
            }
          ]}
        />
        
        <div className="px-6 py-6">
          {/* Barre de progression et sélection AO */}
          <div className="mb-6 space-y-4">
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Récupération assistée depuis AO</CardTitle>
                    <p className="text-sm text-gray-500 mt-1">
                      Sélectionnez un appel d'offres pour pré-remplir automatiquement le formulaire (zéro double saisie)
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary">{completeness}%</div>
                    <div className="text-sm text-gray-500">Complétude</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4 mt-4">
                  <Label htmlFor="ao-select" className="whitespace-nowrap">Appel d'offres :</Label>
                  <Select value={selectedAoId} onValueChange={setSelectedAoId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Sélectionner un AO existant pour pré-remplir..." />
                    </SelectTrigger>
                    <SelectContent>
                      {aos.map((ao) => (
                        <SelectItem key={ao.id} value={ao.id}>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{ao.reference}</span>
                            <span>-</span>
                            <span>{ao.client}</span>
                            <span>-</span>
                            <span className="text-gray-500">{ao.location}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <Progress value={completeness} className="h-2 mt-4" />
              </CardHeader>
            </Card>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* 1. Informations générales */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>Informations générales</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="reference">Référence du dossier *</Label>
                    <Input
                      id="reference"
                      data-testid="input-reference"
                      {...form.register("reference")}
                      placeholder="OFF-2025-001"
                    />
                    {form.formState.errors.reference && (
                      <p className="text-sm text-red-600 mt-1">{form.formState.errors.reference.message}</p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="intituleOperation">Intitulé de l'opération</Label>
                    <Input
                      id="intituleOperation"
                      data-testid="input-intitule-operation"
                      {...form.register("intituleOperation")}
                      placeholder="Description du projet"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 2. Localisation et dates */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MapPin className="h-5 w-5" />
                  <span>Localisation et dates clés</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="client">Client *</Label>
                    <Input
                      id="client"
                      data-testid="input-client"
                      {...form.register("client")}
                      placeholder="Nom du client"
                    />
                    {form.formState.errors.client && (
                      <p className="text-sm text-red-600 mt-1">{form.formState.errors.client.message}</p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="location">Commune / Localisation *</Label>
                    <Input
                      id="location"
                      data-testid="input-location"
                      {...form.register("location")}
                      placeholder="Ville, département"
                    />
                    {form.formState.errors.location && (
                      <p className="text-sm text-red-600 mt-1">{form.formState.errors.location.message}</p>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="dateRenduAO">Date rendu AO</Label>
                    <Input
                      id="dateRenduAO"
                      data-testid="input-date-rendu-ao"
                      type="date"
                      {...form.register("dateRenduAO")}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="dateAcceptationAO">Date acceptation AO</Label>
                    <Input
                      id="dateAcceptationAO"
                      data-testid="input-date-acceptation-ao"
                      type="date"
                      {...form.register("dateAcceptationAO")}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="demarragePrevu">Démarrage prévu</Label>
                    <Input
                      id="demarragePrevu"
                      data-testid="input-demarrage-prevu"
                      type="date"
                      {...form.register("demarragePrevu")}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="deadline">Échéance BE</Label>
                    <Input
                      id="deadline"
                      data-testid="input-deadline"
                      type="date"
                      {...form.register("deadline")}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 3. Maître d'ouvrage */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span>Maître d'ouvrage</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="maitreOuvrageNom">Nom</Label>
                    <Input
                      id="maitreOuvrageNom"
                      data-testid="input-maitre-ouvrage-nom"
                      {...form.register("maitreOuvrageNom")}
                      placeholder="Nom du maître d'ouvrage"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="maitreOuvrageContact">Contact principal</Label>
                    <Input
                      id="maitreOuvrageContact"
                      data-testid="input-maitre-ouvrage-contact"
                      {...form.register("maitreOuvrageContact")}
                      placeholder="Nom du contact"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="maitreOuvrageAdresse">Adresse</Label>
                  <Textarea
                    id="maitreOuvrageAdresse"
                    data-testid="textarea-maitre-ouvrage-adresse"
                    {...form.register("maitreOuvrageAdresse")}
                    placeholder="Adresse complète"
                    rows={2}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="maitreOuvrageEmail">Email</Label>
                    <Input
                      id="maitreOuvrageEmail"
                      data-testid="input-maitre-ouvrage-email"
                      type="email"
                      {...form.register("maitreOuvrageEmail")}
                      placeholder="email@exemple.fr"
                    />
                    {form.formState.errors.maitreOuvrageEmail && (
                      <p className="text-sm text-red-600 mt-1">{form.formState.errors.maitreOuvrageEmail.message}</p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="maitreOuvragePhone">Téléphone</Label>
                    <Input
                      id="maitreOuvragePhone"
                      data-testid="input-maitre-ouvrage-phone"
                      {...form.register("maitreOuvragePhone")}
                      placeholder="01 23 45 67 89"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 4. Maître d'œuvre et éléments techniques */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Building className="h-5 w-5" />
                  <span>Maître d'œuvre et éléments techniques</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="maitreOeuvre">Maître d'œuvre</Label>
                    <Input
                      id="maitreOeuvre"
                      data-testid="input-maitre-oeuvre"
                      {...form.register("maitreOeuvre")}
                      placeholder="Nom du maître d'œuvre"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="maitreOeuvreContact">Contact maître d'œuvre</Label>
                    <Input
                      id="maitreOeuvreContact"
                      data-testid="input-maitre-oeuvre-contact"
                      {...form.register("maitreOeuvreContact")}
                      placeholder="Contact"
                    />
                  </div>
                </div>
                
                <Separator />
                
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="bureauEtudes">Bureau d'Études</Label>
                    <Input
                      id="bureauEtudes"
                      data-testid="input-bureau-etudes"
                      {...form.register("bureauEtudes")}
                      placeholder="BE"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="bureauControle">Bureau de Contrôle</Label>
                    <Input
                      id="bureauControle"
                      data-testid="input-bureau-controle"
                      {...form.register("bureauControle")}
                      placeholder="BC"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="sps">SPS</Label>
                    <Input
                      id="sps"
                      data-testid="input-sps"
                      {...form.register("sps")}
                      placeholder="Service Prévention Sécurité"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 5. Lot et spécifications techniques */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Package className="h-5 w-5" />
                  <span>Lot concerné et spécifications</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="lotConcerne">Lot concerné</Label>
                    <Input
                      id="lotConcerne"
                      data-testid="input-lot-concerne"
                      {...form.register("lotConcerne")}
                      placeholder="ex: Lot 08 - Menuiseries"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="menuiserieType">Type de menuiserie *</Label>
                    <Select value={form.watch("menuiserieType")} onValueChange={(value: any) => form.setValue("menuiserieType", value)}>
                      <SelectTrigger data-testid="select-menuiserie-type">
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
                    <Label htmlFor="typeMarche">Type de marché</Label>
                    <Select value={form.watch("typeMarche") || ""} onValueChange={(value: any) => form.setValue("typeMarche", value || undefined)}>
                      <SelectTrigger data-testid="select-type-marche">
                        <SelectValue placeholder="Sélectionner..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">Public</SelectItem>
                        <SelectItem value="prive">Privé</SelectItem>
                        <SelectItem value="ao_restreint">AO restreint</SelectItem>
                        <SelectItem value="ao_ouvert">AO ouvert</SelectItem>
                        <SelectItem value="marche_negocie">Marché négocié</SelectItem>
                        <SelectItem value="procedure_adaptee">Procédure adaptée</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 6. Montant et conditions financières */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Euro className="h-5 w-5" />
                  <span>Montant et conditions financières</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="montantEstime">Montant estimé HT (€)</Label>
                    <Input
                      id="montantEstime"
                      data-testid="input-montant-estime"
                      type="number"
                      step="0.01"
                      {...form.register("montantEstime")}
                      placeholder="0.00"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="prorataEventuel">Prorata éventuel (%)</Label>
                    <Input
                      id="prorataEventuel"
                      data-testid="input-prorata-eventuel"
                      type="number"
                      step="0.01"
                      {...form.register("prorataEventuel")}
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 7. Suivi Bureau d'Études */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="h-5 w-5" />
                  <span>Suivi Bureau d'Études</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="responsibleUserId">Responsable BE</Label>
                    <Select value={form.watch("responsibleUserId") || ""} onValueChange={(value: any) => form.setValue("responsibleUserId", value || undefined)}>
                      <SelectTrigger data-testid="select-responsible-user">
                        <SelectValue placeholder="Sélectionner..." />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.firstName} {user.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="beHoursEstimated">Charge estimée (h)</Label>
                    <Input
                      id="beHoursEstimated"
                      data-testid="input-be-hours-estimated"
                      type="number"
                      step="0.5"
                      {...form.register("beHoursEstimated")}
                      placeholder="0.0"
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2 pt-6">
                    <Checkbox
                      id="isPriority"
                      data-testid="checkbox-is-priority"
                      checked={form.watch("isPriority")}
                      onCheckedChange={(checked: boolean) => form.setValue("isPriority", checked)}
                    />
                    <Label htmlFor="isPriority" className="text-sm font-medium">
                      Marquer comme prioritaire
                    </Label>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 8. Pièces obligatoires (checklist) */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5" />
                  <span>Pièces obligatoires</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="urssafValide"
                        data-testid="checkbox-urssaf-valide"
                        checked={form.watch("urssafValide")}
                        onCheckedChange={(checked: boolean) => form.setValue("urssafValide", checked)}
                      />
                      <Label htmlFor="urssafValide" className="text-sm">URSSAF à jour</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="assuranceDecennaleValide"
                        data-testid="checkbox-assurance-decennale-valide"
                        checked={form.watch("assuranceDecennaleValide")}
                        onCheckedChange={(checked: boolean) => form.setValue("assuranceDecennaleValide", checked)}
                      />
                      <Label htmlFor="assuranceDecennaleValide" className="text-sm">Assurance décennale</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="ribValide"
                        data-testid="checkbox-rib-valide"
                        checked={form.watch("ribValide")}
                        onCheckedChange={(checked: boolean) => form.setValue("ribValide", checked)}
                      />
                      <Label htmlFor="ribValide" className="text-sm">RIB</Label>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="qualificationsValides"
                        data-testid="checkbox-qualifications-valides"
                        checked={form.watch("qualificationsValides")}
                        onCheckedChange={(checked: boolean) => form.setValue("qualificationsValides", checked)}
                      />
                      <Label htmlFor="qualificationsValides" className="text-sm">Qualifications</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="planAssuranceQualiteValide"
                        data-testid="checkbox-plan-assurance-qualite-valide"
                        checked={form.watch("planAssuranceQualiteValide")}
                        onCheckedChange={(checked: boolean) => form.setValue("planAssuranceQualiteValide", checked)}
                      />
                      <Label htmlFor="planAssuranceQualiteValide" className="text-sm">Plan assurance qualité</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="fichesTechniquesTransmises"
                        data-testid="checkbox-fiches-techniques-transmises"
                        checked={form.watch("fichesTechniquesTransmises")}
                        onCheckedChange={(checked: boolean) => form.setValue("fichesTechniquesTransmises", checked)}
                      />
                      <Label htmlFor="fichesTechniquesTransmises" className="text-sm">Fiches techniques transmises</Label>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex items-center justify-between pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation("/offers")}
                data-testid="button-cancel"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Annuler
              </Button>
              
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-500">
                  Formulaire complété à {completeness}%
                </div>
                <Button
                  type="submit"
                  disabled={createOfferMutation.isPending}
                  data-testid="button-submit"
                >
                  {createOfferMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Création...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Créer le dossier d'offre
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}