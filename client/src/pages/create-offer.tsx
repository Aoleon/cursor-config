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
import Header from "@/components/layout/header";
import { ObjectUploader } from "@/components/ObjectUploader";
import { OCRUploader } from "@/components/OCRUploader";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  ArrowLeft,
  Upload,
  Archive,
  FileCheck
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
  // deadline supprimé : calculé automatiquement par le système
  
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
  
  // Source et réception (audit JLM : plateformes, contacts directs)
  source: z.enum(["mail", "phone", "website", "partner", "other"]).default("website"),
  plateformeSource: z.string().optional(), // BOMP, Marché Online, France Marché
  contactDirect: z.string().optional(), // Contact Julien
  
  // Critères sélection (audit JLM : départements 50/62, distance)
  departement: z.string().optional(), // Focus départements 50 et 62
  distanceKm: z.string().optional(), // Critère de sélection
  
  // Dates manquantes (audit JLM : problèmes date OS, délai contractuel)
  dateOS: z.string().optional(), // Date Ordre de Service (souvent manquante)
  delaiContractuel: z.string().optional(), // En jours (souvent non précisé)
  
  // Documents techniques (audit JLM : CCTP, études, plans, DPGF, DCE)
  cctpDisponible: z.boolean().default(false),
  cctpImprime: z.boolean().default(false), // Sylvie imprime CCTP
  etudesThermiquesDisponibles: z.boolean().default(false),
  etudesAcoustiquesDisponibles: z.boolean().default(false),
  plansDisponibles: z.boolean().default(false),
  dpgfClientDisponible: z.boolean().default(false),
  dceDisponible: z.boolean().default(false),
  
  // Quantitatifs (audit JLM : portes, fenêtres, éléments)
  quantitatifRealise: z.boolean().default(false),
  portesPrevues: z.string().optional(),
  fenetresPrevues: z.string().optional(),
  autresElementsPrevus: z.string().optional(),
  
  // Consultation fournisseurs (audit JLM : K-Line, tableaux Excel)
  fournisseursConsultes: z.string().optional(), // K-Line et autres
  tableauxExcelGeneres: z.boolean().default(false),
  devisDetailleEtabli: z.boolean().default(false), // Sur Batigest
  
  // Documents administratifs (audit JLM : DC1, DC2, références, KBIS, assurances, quitus)
  dc1Complete: z.boolean().default(false),
  dc2Complete: z.boolean().default(false),
  referencesTravauxFournies: z.boolean().default(false),
  kbisValide: z.boolean().default(false),
  assurancesValides: z.boolean().default(false),
  quitusLegalFourni: z.boolean().default(false),
  
  // Workflow et suivi (audit JLM : réunion mardi matin, arborescence)
  pointOffrePrevu: z.string().optional(), // Réunion mardi matin Sylvie/Julien
  dossierEtudeAOCree: z.boolean().default(false),
  arborescenceGeneree: z.boolean().default(false),
  
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
  const [creationMethod, setCreationMethod] = useState<"ao" | "import" | "ocr">("ao");
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ name: string; size: number; uploadURL: string }>>([]);

  // Récupérer les AO pour le sélecteur
  const { data: aos = [], isLoading: aosLoading } = useQuery<any[]>({
    queryKey: ["/api/aos"],
    queryFn: async () => {
      const response = await fetch("/api/aos");
      const result = await response.json();
      
      // Extraire le tableau data si la réponse est encapsulée
      if (result && typeof result === 'object' && 'data' in result) {
        return result.data; // Retourner directement le tableau
      }
      
      // Fallback si c'est déjà un tableau
      return Array.isArray(result) ? result : [];
    }
  });

  // Récupérer les utilisateurs pour le responsable
  const { data: users = [], isLoading: usersLoading } = useQuery<any[]>({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const response = await fetch("/api/users");
      const result = await response.json();
      
      // Extraire le tableau data si la réponse est encapsulée
      if (result && typeof result === 'object' && 'data' in result) {
        return result.data; // Retourner directement le tableau
      }
      
      // Fallback si c'est déjà un tableau
      return Array.isArray(result) ? result : [];
    }
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
      // deadline: supprimé, calculé automatiquement
      demarragePrevu: "",
      maitreOuvrageNom: "",
      maitreOuvrageEmail: "",
      maitreOuvragePhone: "",
      lotConcerne: "",
      bureauEtudes: "",
      isPriority: false,
      // Nouveaux champs basés sur audit JLM
      source: "website",
      plateformeSource: "",
      contactDirect: "",
      departement: "",
      distanceKm: "",
      dateOS: "",
      delaiContractuel: "",
      cctpDisponible: false,
      cctpImprime: false,
      etudesThermiquesDisponibles: false,
      etudesAcoustiquesDisponibles: false,
      plansDisponibles: false,
      dpgfClientDisponible: false,
      dceDisponible: false,
      quantitatifRealise: false,
      portesPrevues: "",
      fenetresPrevues: "",
      autresElementsPrevus: "",
      fournisseursConsultes: "",
      tableauxExcelGeneres: false,
      devisDetailleEtabli: false,
      dc1Complete: false,
      dc2Complete: false,
      referencesTravauxFournies: false,
      kbisValide: false,
      assurancesValides: false,
      quitusLegalFourni: false,
      pointOffrePrevu: "",
      dossierEtudeAOCree: false,
      arborescenceGeneree: false,
      // Champs existants
      urssafValide: false,
      assuranceDecennaleValide: false,
      ribValide: false,
      qualificationsValides: false,
      planAssuranceQualiteValide: false,
      fichesTechniquesTransmises: false,
    },
  });

  // Mutation pour créer l'offre avec arborescence documentaire
  const createOfferMutation = useMutation({
    mutationFn: async (data: CreateOfferFormData & { uploadedFiles?: Array<{name: string; size: number; uploadURL: string}> }) => {
      const response = await fetch("/api/offers/create-with-structure", {
        method: "POST",
        body: JSON.stringify({
          ...data,
          uploadedFiles,
          creationMethod,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to create offer');
      }
      
      return response.json();
    },
    onSuccess: (newOffer: any) => {
      toast({
        title: "Dossier d'offre créé",
        description: `Le dossier ${newOffer.reference} a été créé avec succès. Arborescence documentaire générée automatiquement.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/offers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/aos"] });
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
    // Validation deadline supprimée : calculée automatiquement par le système

    createOfferMutation.mutate({
      ...data,
      uploadedFiles: uploadedFiles.length > 0 ? uploadedFiles : undefined,
    });
  };

  // Gestionnaire pour l'upload de fichiers
  const handleGetUploadParameters = async () => {
    const response = await fetch("/api/objects/upload", { 
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to get upload parameters');
    }
    
    const data = await response.json();
    return {
      method: "PUT" as const,
      url: data.uploadURL,
    };
  };

  const handleUploadComplete = async (result: any) => {
    if (result.successful && result.successful.length > 0) {
      const newFiles = result.successful.map((file: any) => ({
        name: file.name,
        size: file.size,
        uploadURL: file.uploadURL,
      }));
      setUploadedFiles(prev => [...prev, ...newFiles]);
      
      toast({
        title: "Fichier importé",
        description: `${newFiles.length} fichier(s) importé(s) avec succès. Analyse en cours...`,
      });
      
      // Si c'est un import de fichier, analyser automatiquement pour extraire les infos
      if (creationMethod === "import" && newFiles.length > 0) {
        for (const file of newFiles) {
          try {
            // Analyser le fichier avec l'IA pour extraire les données
            const response = await fetch("/api/documents/analyze", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                fileUrl: file.uploadURL,
                filename: file.name,
              }),
            });

            if (!response.ok) {
              throw new Error('Failed to analyze document');
            }

            const analysis = await response.json();
            console.log('Document analysis result:', analysis);

            if (analysis.success && analysis.extractedData) {
              const data = analysis.extractedData;
              console.log('Pré-remplissage des champs avec:', data);
              
              // Créer une nouvelle référence si extraite du document
              let newReference = data.reference;
              if (!newReference && !form.getValues("reference")) {
                // Générer une référence basée sur l'année courante si aucune extraite
                const currentYear = new Date().getFullYear();
                const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
                newReference = `OFF-${currentYear}-${randomNum}`;
              }
              
              // Pré-remplir automatiquement les champs du formulaire (zéro double saisie)
              // Utiliser setValue sans condition pour forcer la mise à jour
              if (newReference) {
                form.setValue("reference", newReference, { shouldValidate: true, shouldDirty: true });
                console.log('Référence mise à jour:', newReference);
              }
              
              if (data.client) {
                form.setValue("client", data.client, { shouldValidate: true, shouldDirty: true });
                console.log('Client mis à jour:', data.client);
              }
              
              if (data.maitreOuvrage) {
                form.setValue("maitreOuvrageNom", data.maitreOuvrage, { shouldValidate: true, shouldDirty: true });
                console.log('Maître d\'ouvrage mis à jour:', data.maitreOuvrage);
              }
              
              if (data.location) {
                form.setValue("location", data.location, { shouldValidate: true, shouldDirty: true });
                console.log('Location mise à jour:', data.location);
              }
              
              if (data.deadlineDate) {
                // Deadline supprimé : calculé automatiquement par le système
                console.log('Date limite détectée par OCR (calculée automatiquement):', data.deadlineDate);
              }
              
              if (data.startDate) {
                const dateOnly = new Date(data.startDate).toISOString().split('T')[0];
                form.setValue("demarragePrevu", dateOnly, { shouldValidate: true, shouldDirty: true });
                console.log('Démarrage prévu mis à jour:', dateOnly);
              }
              
              if (data.estimatedAmount) {
                form.setValue("montantEstime", data.estimatedAmount.toString(), { shouldValidate: true, shouldDirty: true });
                console.log('Montant estimé mis à jour:', data.estimatedAmount);
              }
              
              if (data.description) {
                form.setValue("intituleOperation", data.description, { shouldValidate: true, shouldDirty: true });
                console.log('Intitulé opération mis à jour:', data.description);
              }
              
              if (data.lotsConcernes) {
                form.setValue("lotConcerne", data.lotsConcernes, { shouldValidate: true, shouldDirty: true });
                console.log('Lots concernés mis à jour:', data.lotsConcernes);
              }
              
              if (data.technicalRequirements) {
                form.setValue("bureauEtudes", data.technicalRequirements, { shouldValidate: true, shouldDirty: true });
                console.log('Bureau d\'études mis à jour:', data.technicalRequirements);
              }
              
              if (data.contactPerson) {
                form.setValue("maitreOuvrageContact", data.contactPerson, { shouldValidate: true, shouldDirty: true });
                console.log('Contact maître d\'ouvrage mis à jour:', data.contactPerson);
              }
              
              if (data.contactEmail) {
                form.setValue("maitreOuvrageEmail", data.contactEmail, { shouldValidate: true, shouldDirty: true });
                console.log('Email maître d\'ouvrage mis à jour:', data.contactEmail);
              }
              
              if (data.contactPhone) {
                form.setValue("maitreOuvragePhone", data.contactPhone, { shouldValidate: true, shouldDirty: true });
                console.log('Téléphone maître d\'ouvrage mis à jour:', data.contactPhone);
              }

              // Forcer la mise à jour de l'interface
              form.trigger();

              toast({
                title: "Analyse terminée",
                description: `Informations extraites de ${file.name} et pré-remplies automatiquement.`,
              });
            }

          } catch (error) {
            console.error('Error analyzing document:', error);
            toast({
              title: "Erreur d'analyse",
              description: `Impossible d'analyser ${file.name}. Vous pouvez remplir manuellement.`,
              variant: "destructive",
            });
          }
        }
      }
    }
  };

  // Gestionnaire pour pré-remplir depuis OCR
  const handleOCRFieldsExtracted = (fields: Record<string, any>) => {
    // Générer une référence automatique si pas fournie
    const currentYear = new Date().getFullYear();
    const reference = fields.reference || `OFF-OCR-${currentYear}-${Date.now().toString().slice(-6)}`;
    
    // Pré-remplir le formulaire avec les données OCR
    const updateData = {
      ...form.getValues(),
      reference,
      client: fields.client || fields.maitreOuvrageNom || "",
      location: fields.location || "",
      intituleOperation: fields.intituleOperation || "",
      menuiserieType: fields.menuiserieType || "fenetre",
      montantEstime: fields.montantEstime || "",
      maitreOuvrageNom: fields.maitreOuvrageNom || "",
      maitreOuvrageAdresse: fields.maitreOuvrageAdresse || "",
      maitreOuvrageContact: fields.maitreOuvrageContact || "",
      maitreOuvrageEmail: fields.maitreOuvrageEmail || "",
      maitreOuvragePhone: fields.maitreOuvragePhone || "",
      maitreOeuvre: fields.maitreOeuvre || "",
      maitreOeuvreContact: fields.maitreOeuvreContact || "",
      lotConcerne: fields.lotConcerne || "",
      typeMarche: fields.typeMarche || undefined,
      bureauEtudes: fields.bureauEtudes || "",
      bureauControle: fields.bureauControle || "",
      sps: fields.sps || "",
      // Nouveaux champs OCR
      source: "other" as const,
      plateformeSource: fields.plateformeSource || "",
      departement: fields.departement || "",
      dateOS: fields.dateOS || "",
      delaiContractuel: fields.delaiContractuel || "",
      // deadline: supprimé, calculé automatiquement
      dateRenduAO: fields.dateRenduAO || "",
      dateAcceptationAO: fields.dateAcceptationAO || "",
      demarragePrevu: fields.demarragePrevu || "",
      // Documents détectés
      cctpDisponible: fields.cctpDisponible || false,
      plansDisponibles: fields.plansDisponibles || false,
      dpgfClientDisponible: fields.dpgfClientDisponible || false,
      dceDisponible: fields.dceDisponible || false,
    };

    form.reset(updateData);

    toast({
      title: "Formulaire pré-rempli par OCR",
      description: `${Object.keys(fields).length} champs remplis automatiquement depuis le PDF`,
    });
  };

  // Gestionnaire quand un AO est créé via OCR
  const handleAOCreatedFromOCR = (aoData: any) => {
    toast({
      title: "AO créé automatiquement",
      description: `L'AO ${aoData.reference} a été créé. Vous pouvez maintenant créer l'offre associée.`,
    });
    
    // Recharger la liste des AO et sélectionner le nouveau
    queryClient.invalidateQueries({ queryKey: ["/api/aos"] });
    setSelectedAoId(aoData.id);
    setCreationMethod("ao");
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
    <>
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
          {/* Points d'entrée : AO existant ou import fichier */}
          <div className="mb-6 space-y-4">
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Création de dossier d'offre</CardTitle>
                    <p className="text-sm text-on-surface-muted mt-1">
                      Choisissez votre méthode de création (zéro double saisie garantie)
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary">{completeness}%</div>
                    <div className="text-sm text-on-surface-muted">Complétude</div>
                  </div>
                </div>
                
                <Tabs value={creationMethod} onValueChange={(value: any) => setCreationMethod(value)} className="mt-4">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="ao" className="flex items-center space-x-2">
                      <FileText className="h-4 w-4" />
                      <span>Depuis AO existant</span>
                    </TabsTrigger>
                    <TabsTrigger value="ocr" className="flex items-center space-x-2">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      <span>OCR Intelligent</span>
                    </TabsTrigger>
                    <TabsTrigger value="import" className="flex items-center space-x-2">
                      <Upload className="h-4 w-4" />
                      <span>Import ZIP/PDF</span>
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="ao" className="mt-4 space-y-4">
                    <div className="flex items-center space-x-4">
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
                                <span className="text-on-surface-muted">{ao.location}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="ocr" className="mt-4 space-y-4">
                    <OCRUploader
                      onFieldsExtracted={handleOCRFieldsExtracted}
                      onAOCreated={handleAOCreatedFromOCR}
                      className="w-full"
                    />
                  </TabsContent>
                  
                  <TabsContent value="import" className="mt-4 space-y-4">
                    <div className="border-2 border-dashed border-border rounded-lg p-6">
                      <div className="text-center space-y-4">
                        <div className="flex justify-center">
                          <Archive className="h-12 w-12 text-on-surface-muted" />
                        </div>
                        <div>
                          <h3 className="text-lg font-medium">Import DCE</h3>
                          <p className="text-sm text-on-surface-muted mt-1">
                            Téléchargez un fichier ZIP ou PDF contenant le DCE (Dossier de Consultation des Entreprises)
                          </p>
                        </div>
                        
                        <ObjectUploader
                          maxNumberOfFiles={5}
                          maxFileSize={50 * 1024 * 1024} // 50MB
                          acceptedFileTypes={['.zip', '.pdf', '.doc', '.docx']}
                          onGetUploadParameters={handleGetUploadParameters}
                          onComplete={handleUploadComplete}
                          buttonClassName="w-full"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Sélectionner des fichiers
                        </ObjectUploader>
                        
                        {uploadedFiles.length > 0 && (
                          <div className="mt-4 space-y-2">
                            <h4 className="font-medium text-sm">Fichiers importés :</h4>
                            {uploadedFiles.map((file, index) => (
                              <div key={index} className="flex items-center justify-between bg-success/10 p-2 rounded border">
                                <div className="flex items-center space-x-2">
                                  <FileCheck className="h-4 w-4 text-success" />
                                  <span className="text-sm font-medium">{file.name}</span>
                                  <span className="text-xs text-on-surface-muted">
                                    ({(file.size / 1024 / 1024).toFixed(2)} MB)
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        <p className="text-xs text-on-surface-muted">
                          Types acceptés : ZIP, PDF, DOC, DOCX • Taille max : 50MB par fichier
                        </p>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
                
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
                  
                  <div className="bg-primary/10 p-3 rounded-lg border border-primary/20">
                    <Label className="text-sm text-on-surface-muted">Date limite remise AO</Label>
                    <div className="flex items-center space-x-2 mt-1">
                      <div className="w-3 h-3 bg-primary/100 rounded-full"></div>
                      <p className="font-medium text-primary">Calculée automatiquement par le système</p>
                    </div>
                    <p className="text-xs text-blue-600 mt-1">
                      💡 La date limite est définie automatiquement selon les règles métier (Date sortie AO + 30 jours)
                    </p>
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
                <div className="text-sm text-on-surface-muted space-y-1">
                  <div>Formulaire complété à {completeness}%</div>
                  {creationMethod === "import" && uploadedFiles.length > 0 && (
                    <div className="flex items-center space-x-1 text-success">
                      <FileCheck className="h-3 w-3" />
                      <span className="text-xs">{uploadedFiles.length} fichier(s) importé(s)</span>
                    </div>
                  )}
                </div>
                <Button
                  type="submit"
                  disabled={createOfferMutation.isPending}
                  data-testid="button-submit"
                  className="min-w-[200px]"
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
    </>
  );
}