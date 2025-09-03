import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { LotsManager } from "@/components/ao/LotsManager";
import { ContactSelector } from "@/components/contacts/ContactSelector";
import { MaitreOuvrageForm } from "@/components/contacts/MaitreOuvrageForm";
import { MaitreOeuvreForm } from "@/components/contacts/MaitreOeuvreForm";
import { FileText, Calendar, MapPin, User, Building } from "lucide-react";

// Schéma de validation pour la création d'AO
const createAoSchema = z.object({
  reference: z.string().min(1, "La référence est obligatoire"),
  client: z.string().min(1, "Le client est obligatoire"),
  location: z.string().min(1, "La localisation est obligatoire"),
  departement: z.string().min(1, "Le département est obligatoire"),
  intituleOperation: z.string().optional(),
  
  // Dates simplifiées
  dateLimiteRemise: z.string().optional(),
  dateSortieAO: z.string().optional(),
  dateAcceptationAO: z.string().optional(),
  demarragePrevu: z.string().optional(),
  
  // Relations vers les contacts réutilisables
  maitreOuvrageId: z.string().optional(),
  maitreOeuvreId: z.string().optional(),
  
  // Contacts spécifiques à cet AO (si différents de la fiche principale)
  contactAONom: z.string().optional(),
  contactAOPoste: z.string().optional(),
  contactAOTelephone: z.string().optional(),
  contactAOEmail: z.string().email("Email invalide").optional().or(z.literal("")),
  
  // Informations techniques
  menuiserieType: z.enum(["fenetre", "porte", "portail", "volet", "cloison", "verriere", "autre"]),
  montantEstime: z.string().optional(),
  typeMarche: z.enum(["public", "prive", "ao_restreint", "ao_ouvert", "marche_negocie", "procedure_adaptee"]).optional(),
  
  // Éléments techniques
  bureauEtudes: z.string().optional(),
  bureauControle: z.string().optional(),
  sps: z.string().optional(),
  
  // Source
  source: z.enum(["mail", "phone", "website", "partner", "other"]),
  description: z.string().optional(),
});

type CreateAoFormData = z.infer<typeof createAoSchema>;

interface Lot {
  id?: string;
  numero: string;
  designation: string;
  menuiserieType?: string;
  montantEstime?: string;
  isSelected: boolean;
  comment?: string;
}

export default function CreateAO() {
  const { toast } = useToast();
  const [_, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [lots, setLots] = useState<Lot[]>([]);

  // États pour la gestion des contacts
  const [selectedMaitreOuvrage, setSelectedMaitreOuvrage] = useState<any>(null);
  const [selectedMaitreOeuvre, setSelectedMaitreOeuvre] = useState<any>(null);
  const [showMaitreOuvrageForm, setShowMaitreOuvrageForm] = useState(false);
  const [showMaitreOeuvreForm, setShowMaitreOeuvreForm] = useState(false);

  const form = useForm<CreateAoFormData>({
    resolver: zodResolver(createAoSchema),
    defaultValues: {
      reference: "",
      client: "",
      location: "",
      departement: "",
      menuiserieType: "fenetre",
      source: "website",
    },
  });

  // Calcul automatique de la date de rendu
  const calculateDateRendu = (dateLimiteRemise: string): string => {
    if (!dateLimiteRemise) return "";
    
    const dateLimite = new Date(dateLimiteRemise);
    const dateRendu = new Date(dateLimite);
    dateRendu.setDate(dateRendu.getDate() - 3); // 3 jours avant la limite
    
    return dateRendu.toISOString().split('T')[0];
  };

  const createAoMutation = useMutation({
    mutationFn: async (data: CreateAoFormData) => {
      // Calculer automatiquement la date de rendu
      const dateRenduAO = data.dateLimiteRemise ? calculateDateRendu(data.dateLimiteRemise) : undefined;
      
      const aoData = {
        ...data,
        dateRenduAO,
        montantEstime: data.montantEstime ? parseFloat(data.montantEstime) : undefined,
        maitreOuvrageId: selectedMaitreOuvrage?.id,
        maitreOeuvreId: selectedMaitreOeuvre?.id,
      };
      
      const response = await fetch("/api/aos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(aoData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create AO');
      }
      
      return response.json();
    },
    onSuccess: async (newAo: any) => {
      // Créer les lots associés
      if (lots.length > 0) {
        for (const lot of lots) {
          const response = await fetch(`/api/aos/${newAo.id}/lots`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              numero: lot.numero,
              designation: lot.designation,
              menuiserieType: lot.menuiserieType || undefined,
              montantEstime: lot.montantEstime ? parseFloat(lot.montantEstime) : undefined,
              isSelected: lot.isSelected,
              comment: lot.comment || undefined,
            }),
          });
          
          if (!response.ok) {
            console.error(`Failed to create lot ${lot.numero}`);
          }
        }
      }

      queryClient.invalidateQueries({ queryKey: ["/api/aos"] });
      
      toast({
        title: "AO créé avec succès",
        description: `L'AO ${newAo.reference} a été créé avec ${lots.length} lot${lots.length > 1 ? 's' : ''}`,
      });
      
      setLocation("/");
    },
    onError: (error: any) => {
      console.error("Error creating AO:", error);
      toast({
        title: "Erreur lors de la création",
        description: "Impossible de créer l'AO. Veuillez réessayer.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreateAoFormData) => {
    createAoMutation.mutate(data);
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Header 
          title="Création Appel d'Offres"
          breadcrumbs={[
            { label: "Accueil", href: "/" },
            { label: "AO", href: "/aos" },
            { label: "Nouvel AO" }
          ]}
          actions={[
            {
              label: "Retour",
              variant: "outline",
              icon: "arrow-left",
              onClick: () => setLocation("/aos")
            }
          ]}
        />
        
        <div className="px-6 py-6">
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
                    <Label htmlFor="reference">Référence AO *</Label>
                    <Input
                      id="reference"
                      data-testid="input-reference"
                      {...form.register("reference")}
                      placeholder="AO-2025-001"
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

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="client">Client / Maître d'ouvrage *</Label>
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
                    <Label htmlFor="location">Localisation *</Label>
                    <Input
                      id="location"
                      data-testid="input-location"
                      {...form.register("location")}
                      placeholder="Ville, adresse"
                    />
                    {form.formState.errors.location && (
                      <p className="text-sm text-red-600 mt-1">{form.formState.errors.location.message}</p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="departement">Département *</Label>
                    <Select onValueChange={(value) => form.setValue("departement", value)}>
                      <SelectTrigger data-testid="select-departement">
                        <SelectValue placeholder="Sélectionner..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="50">50 - Manche</SelectItem>
                        <SelectItem value="62">62 - Pas-de-Calais</SelectItem>
                        <SelectItem value="14">14 - Calvados</SelectItem>
                        <SelectItem value="76">76 - Seine-Maritime</SelectItem>
                      </SelectContent>
                    </Select>
                    {form.formState.errors.departement && (
                      <p className="text-sm text-red-600 mt-1">{form.formState.errors.departement.message}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 2. Dates simplifiées */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5" />
                  <span>Dates importantes</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="dateSortieAO">Date de sortie de l'AO</Label>
                    <Input
                      id="dateSortieAO"
                      type="date"
                      data-testid="input-date-sortie"
                      {...form.register("dateSortieAO")}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="dateLimiteRemise">Date limite de remise</Label>
                    <Input
                      id="dateLimiteRemise"
                      type="date"
                      data-testid="input-date-limite-remise"
                      {...form.register("dateLimiteRemise")}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      La date de rendu sera calculée automatiquement (3 jours avant)
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="dateAcceptationAO">Date d'acceptation AO</Label>
                    <Input
                      id="dateAcceptationAO"
                      type="date"
                      data-testid="input-date-acceptation"
                      {...form.register("dateAcceptationAO")}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="demarragePrevu">Date de démarrage prévue</Label>
                    <Input
                      id="demarragePrevu"
                      type="date"
                      data-testid="input-demarrage-prevu"
                      {...form.register("demarragePrevu")}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 3. Gestion des lots */}
            <LotsManager 
              lots={lots}
              onLotsChange={setLots}
            />

            {/* 4. Informations techniques */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Building className="h-5 w-5" />
                  <span>Informations techniques</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="menuiserieType">Type de menuiserie principal *</Label>
                    <Select onValueChange={(value: any) => form.setValue("menuiserieType", value)}>
                      <SelectTrigger data-testid="select-menuiserie-type">
                        <SelectValue placeholder="Sélectionner..." />
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
                    <Label htmlFor="montantEstime">Montant estimé (€)</Label>
                    <Input
                      id="montantEstime"
                      type="number"
                      data-testid="input-montant-estime"
                      {...form.register("montantEstime")}
                      placeholder="0"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="typeMarche">Type de marché</Label>
                    <Select onValueChange={(value: any) => form.setValue("typeMarche", value)}>
                      <SelectTrigger data-testid="select-type-marche">
                        <SelectValue placeholder="Sélectionner..." />
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
                </div>

                <div>
                  <Label htmlFor="description">Description / Remarques</Label>
                  <Textarea
                    id="description"
                    data-testid="textarea-description"
                    {...form.register("description")}
                    placeholder="Description détaillée du projet, remarques particulières..."
                    className="min-h-[80px]"
                  />
                </div>
              </CardContent>
            </Card>

            {/* 5. Contacts réutilisables */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span>Contacts</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label>Maître d'ouvrage</Label>
                    <ContactSelector
                      type="maitre-ouvrage"
                      selectedContactId={selectedMaitreOuvrage?.id}
                      onContactSelect={(contactId, contact) => {
                        setSelectedMaitreOuvrage(contact);
                        form.setValue("maitreOuvrageId", contactId);
                      }}
                      onCreateNew={() => setShowMaitreOuvrageForm(true)}
                      placeholder="Sélectionner un maître d'ouvrage..."
                    />
                  </div>
                  
                  <div className="space-y-3">
                    <Label>Maître d'œuvre</Label>
                    <ContactSelector
                      type="maitre-oeuvre"
                      selectedContactId={selectedMaitreOeuvre?.id}
                      onContactSelect={(contactId, contact) => {
                        setSelectedMaitreOeuvre(contact);
                        form.setValue("maitreOeuvreId", contactId);
                      }}
                      onCreateNew={() => setShowMaitreOeuvreForm(true)}
                      placeholder="Sélectionner un maître d'œuvre..."
                    />
                  </div>
                </div>

                {/* Contact spécifique à cet AO (optionnel) */}
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Contact spécifique pour cet AO (optionnel)</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Si le contact pour cet AO diffère des fiches principales, vous pouvez le préciser ici.
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="contactAONom">Nom du contact</Label>
                      <Input
                        id="contactAONom"
                        {...form.register("contactAONom")}
                        placeholder="Nom du contact spécifique"
                        data-testid="input-contact-ao-nom"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="contactAOPoste">Poste / Fonction</Label>
                      <Input
                        id="contactAOPoste"
                        {...form.register("contactAOPoste")}
                        placeholder="Poste ou fonction"
                        data-testid="input-contact-ao-poste"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <Label htmlFor="contactAOTelephone">Téléphone</Label>
                      <Input
                        id="contactAOTelephone"
                        {...form.register("contactAOTelephone")}
                        placeholder="01 23 45 67 89"
                        data-testid="input-contact-ao-telephone"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="contactAOEmail">Email</Label>
                      <Input
                        id="contactAOEmail"
                        type="email"
                        {...form.register("contactAOEmail")}
                        placeholder="email@exemple.fr"
                        data-testid="input-contact-ao-email"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation("/aos")}
                data-testid="button-cancel"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={createAoMutation.isPending}
                data-testid="button-create-ao"
              >
                {createAoMutation.isPending ? "Création..." : "Créer l'AO"}
              </Button>
            </div>
          </form>
        </div>
      </main>

      {/* Formulaires de création de contacts */}
      <MaitreOuvrageForm
        isOpen={showMaitreOuvrageForm}
        onClose={() => setShowMaitreOuvrageForm(false)}
        onSuccess={(newMaitreOuvrage) => {
          setSelectedMaitreOuvrage(newMaitreOuvrage);
          form.setValue("maitreOuvrageId", newMaitreOuvrage.id);
        }}
      />

      <MaitreOeuvreForm
        isOpen={showMaitreOeuvreForm}
        onClose={() => setShowMaitreOeuvreForm(false)}
        onSuccess={(newMaitreOeuvre) => {
          setSelectedMaitreOeuvre(newMaitreOeuvre);
          form.setValue("maitreOeuvreId", newMaitreOeuvre.id);
        }}
      />
    </div>
  );
}