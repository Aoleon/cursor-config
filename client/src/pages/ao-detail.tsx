import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { FileText, Calendar, MapPin, User, Building, Save, ArrowLeft } from "lucide-react";

// Schéma de validation pour l'édition d'AO
const editAoSchema = z.object({
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
  
  // Contacts spécifiques à cet AO
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

type EditAoFormData = z.infer<typeof editAoSchema>;

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
  const [lots, setLots] = useState<Lot[]>([]);

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

  const form = useForm<EditAoFormData>({
    resolver: zodResolver(editAoSchema),
    defaultValues: {
      reference: "",
      client: "",
      location: "",
      departement: "",
      menuiserieType: "fenetre",
      source: "website",
    },
  });

  // Initialiser le formulaire quand les données sont chargées
  useEffect(() => {
    if (ao) {
      form.reset({
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
        typeMarche: ao.typeMarche || undefined,
        bureauEtudes: ao.bureauEtudes || "",
        bureauControle: ao.bureauControle || "",
        sps: ao.sps || "",
        source: ao.source || "website",
        description: ao.description || "",
      });

      // Charger les contacts sélectionnés
      if (ao.maitreOuvrageId) {
        // Charger les détails du maître d'ouvrage
        fetch(`/api/maitres-ouvrage/${ao.maitreOuvrageId}`)
          .then(res => res.json())
          .then(data => setSelectedMaitreOuvrage(data))
          .catch(console.error);
      }

      if (ao.maitreOeuvreId) {
        // Charger les détails du maître d'œuvre
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

  const updateAoMutation = useMutation({
    mutationFn: async (data: EditAoFormData) => {
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
      
      return response.json();
    },
    onSuccess: async (updatedAo) => {
      // Mettre à jour les lots si nécessaire
      // TODO: Implémenter la sauvegarde des lots
      
      queryClient.invalidateQueries({ queryKey: ["/api/aos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/aos", id] });
      
      toast({
        title: "AO mis à jour",
        description: `L'appel d'offres ${updatedAo.reference} a été mis à jour avec succès`,
      });
    },
    onError: (error: any) => {
      console.error("Error updating AO:", error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour l'appel d'offres",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EditAoFormData) => {
    updateAoMutation.mutate(data);
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
            <Button onClick={() => setLocation("/aos")} className="mt-4">
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
            }
          ]}
        />
        
        <div className="px-6 py-6">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Mêmes sections que create-ao.tsx mais avec les données pré-remplies */}
            {/* ... sections similaires ... */}
            
            {/* Actions de sauvegarde */}
            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation("/offers")}
                data-testid="button-cancel"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Button>
              <Button
                type="submit"
                disabled={updateAoMutation.isPending}
                data-testid="button-save-ao"
              >
                <Save className="h-4 w-4 mr-2" />
                {updateAoMutation.isPending ? "Sauvegarde..." : "Sauvegarder"}
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