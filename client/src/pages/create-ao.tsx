import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { FileText, Calendar, MapPin, User, Building, Upload, AlertCircle, CheckCircle, Loader2, RefreshCw } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Schéma de validation pour la création d'AO
const createAoSchema = z.object({
  reference: z.string().min(1, "La référence est obligatoire"),
  client: z.string().min(1, "Le client est obligatoire"),
  location: z.string().min(1, "La localisation est obligatoire"),
  departement: z.string().min(1, "Le département est obligatoire"),
  intituleOperation: z.string().optional(),
  
  // Dates simplifiées
  // dateLimiteRemise: supprimé, calculé automatiquement par le système
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
  const [activeTab, setActiveTab] = useState("import");
  
  // États pour l'import PDF et OCR
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrResult, setOcrResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // États pour la gestion des références dupliquées
  const [duplicateReferenceError, setDuplicateReferenceError] = useState<{
    originalReference: string;
    suggestedReference: string;
    show: boolean;
    retryCount: number;
  } | null>(null);
  
  // Historique des références proposées pour éviter les répétitions (useRef pour éviter les lectures obsolètes)
  const proposedReferencesHistory = useRef<Set<string>>(new Set());
  
  // Système de retry automatique persistant
  const retryCountRef = useRef<number>(0);
  const originalReferenceRef = useRef<string>("");
  const autoRetryEnabled = useRef<boolean>(false);
  const [isAutoRetrying, setIsAutoRetrying] = useState<boolean>(false);

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

  // Calcul automatique de dates supprimé : géré par le backend

  const createAoMutation = useMutation({
    mutationFn: async (data: CreateAoFormData) => {
      // Date limite et date rendu calculées automatiquement par le système
      
      const aoData = {
        ...data,
        // dateRenduAO calculé automatiquement par le backend
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
        // Lire le body une seule fois et tenter de parser en JSON
        const errorText = await response.text();
        console.error('AO creation failed:', response.status, errorText);
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (parseError) {
          errorData = { error: errorText };
        }
        
        const error = new Error('Failed to create AO');
        (error as any).errorData = errorData;
        (error as any).status = response.status;
        throw error;
      }
      
      return response.json();
    },
    onSuccess: async (newAo: any) => {
      console.log('[DEBUG] AO creation success - cleaning up retry states');
      // Nettoyer tous les états de retry lors du succès
      autoRetryEnabled.current = false;
      retryCountRef.current = 0;
      originalReferenceRef.current = "";
      setDuplicateReferenceError(null);
      setIsAutoRetrying(false);
      proposedReferencesHistory.current.clear();
      
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
      
      // Debugging détaillé
      console.log('[DEBUG] Full error object:', {
        error,
        errorData: error.errorData,
        status: error.status,
        hasErrorData: !!error.errorData,
        detailsType: error.errorData?.details?.type,
        autoRetryEnabled: autoRetryEnabled.current,
        retryCount: retryCountRef.current
      });
      
      // Utiliser les données d'erreur déjà parsées
      if (error.errorData) {
        const { errorData, status } = error;
        
        console.log('[DEBUG] Processing error with status:', status, 'and errorData.details:', errorData.details);
        
        // Gestion spécifique des erreurs 409 (conflit de contrainte d'unicité)
        if (status === 409 && errorData.details?.type === 'DUPLICATE_REFERENCE') {
          console.log('[DEBUG] DUPLICATE_REFERENCE detected - initiating retry logic');
          const originalReference = errorData.details?.value || form.getValues('reference');
          
          console.log('[DEBUG] Original reference:', originalReference, 'Current retry enabled:', autoRetryEnabled.current);
          
          // Vérifier si on est dans un cycle d'auto-retry
          if (autoRetryEnabled.current) {
            console.log('[DEBUG] Auto-retry cycle - current count:', retryCountRef.current);
            // C'est un retry automatique - incrémenter le compteur depuis les refs
            const newRetryCount = retryCountRef.current + 1;
            retryCountRef.current = newRetryCount;
            
            console.log('[DEBUG] Incrementing retry count to:', newRetryCount);
            
            if (newRetryCount < 5) {
              console.log('[DEBUG] Continuing auto-retry with original reference:', originalReferenceRef.current);
              // Continuer les retries automatiques avec la référence originale stockée
              handleDuplicateReference(originalReferenceRef.current, newRetryCount, true);
            } else {
              console.log('[DEBUG] Retry limit reached - stopping auto-retry');
              // Limite atteinte, désactiver auto-retry et demander intervention manuelle
              autoRetryEnabled.current = false;
              toast({
                title: "Multiples collisions détectées",
                description: "5 tentatives automatiques ont échoué. Veuillez modifier manuellement la référence.",
                variant: "destructive",
              });
              setDuplicateReferenceError({
                originalReference: originalReferenceRef.current,
                suggestedReference: form.getValues('reference'),
                show: true,
                retryCount: newRetryCount
              });
            }
          } else {
            console.log('[DEBUG] First attempt - initiating auto-retry for reference:', originalReference);
            // Première tentative ou retry manuel - initier les retries automatiques
            initiateAutoRetry(originalReference);
          }
          return;
        }
        
        // Autres erreurs de conflit
        if (status === 409) {
          toast({
            title: "Conflit de données",
            description: errorData.error || "Cette ressource existe déjà.",
            variant: "destructive",
          });
          return;
        }
        
        // Erreurs de validation (400)
        if (status === 400) {
          toast({
            title: "Erreur de validation",
            description: errorData.error || errorData.details?.message || "Certains champs obligatoires sont manquants.",
            variant: "destructive",
          });
          return;
        }
        
        // Autres erreurs avec message spécifique
        toast({
          title: "Erreur lors de la création",
          description: errorData.error || "Impossible de créer l'AO. Veuillez réessayer.",
          variant: "destructive",
        });
        return;
      }
      
      // Erreur générique en dernier recours
      toast({
        title: "Erreur lors de la création",
        description: "Impossible de créer l'AO. Veuillez réessayer.",
        variant: "destructive",
      });
    },
  });

  // Fonction pour générer un suffixe aléatoire base36 de 3 caractères pour réduire les collisions
  const generateRandomSuffix = (): string => {
    return Math.random().toString(36).substring(2, 5).toUpperCase();
  };

  // Fonction pour générer une référence alternative unique
  const generateUniqueReference = (originalReference: string, retryCount: number = 0): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    // Générer un suffixe aléatoire unique
    let randomSuffix: string;
    let proposedReference: string;
    let attempts = 0;
    const maxAttempts = 10;
    
    do {
      randomSuffix = generateRandomSuffix();
      // Si la référence contient déjà un suffixe temporel, la nettoyer
      const cleanedReference = originalReference.replace(/-\d{8}-\d{6}-[A-Z0-9]{3}$/, '').replace(/-\d{8}-\d{6}-[A-Z0-9]{2}$/, '').replace(/-\d{8}-\d{4}$/, '').replace(/-\d{3}$/, '');
      proposedReference = `${cleanedReference}-${year}${month}${day}-${hours}${minutes}${seconds}-${randomSuffix}`;
      attempts++;
    } while (proposedReferencesHistory.current.has(proposedReference) && attempts < maxAttempts);
    
    // Ajouter à l'historique
    proposedReferencesHistory.current.add(proposedReference);
    
    return proposedReference;
  };

  // Fonction pour gérer automatiquement la proposition de nouvelle référence
  const handleDuplicateReference = (originalReference: string, retryCount: number = 0, enableAutoRetry: boolean = false) => {
    console.log('[DEBUG] handleDuplicateReference called with:', {originalReference, retryCount, enableAutoRetry});
    
    const suggestedReference = generateUniqueReference(originalReference, retryCount);
    
    console.log('[DEBUG] Generated suggested reference:', suggestedReference);
    
    // Stocker dans les refs pour persistence
    retryCountRef.current = retryCount;
    originalReferenceRef.current = originalReference;
    autoRetryEnabled.current = enableAutoRetry;
    setIsAutoRetrying(enableAutoRetry && retryCount < 5);
    
    setDuplicateReferenceError({
      originalReference,
      suggestedReference,
      show: true,
      retryCount
    });
    
    // Mettre à jour automatiquement le champ de référence avec la nouvelle valeur
    form.setValue("reference", suggestedReference, { shouldDirty: true });
    
    // Si auto-retry est activé, re-soumettre automatiquement après un court délai
    if (enableAutoRetry && retryCount < 5) {
      console.log('[DEBUG] Auto-retry enabled, scheduling retry in 500ms...');
      setTimeout(() => {
        console.log('[DEBUG] Executing auto-retry with form data...');
        const formData = form.getValues();
        createAoMutation.mutate(formData);
      }, 500); // Délai de 500ms pour éviter la surcharge
    } else {
      console.log('[DEBUG] Not auto-retrying - either disabled or limit reached');
      setIsAutoRetrying(false);
      // Afficher un toast informatif seulement si pas d'auto-retry ou si limite atteinte
      toast({
        title: retryCount >= 5 ? "Multiples collisions détectées" : "Référence alternative proposée",
        description: retryCount >= 5 
          ? "Plusieurs tentatives automatiques ont échoué. Veuillez modifier manuellement la référence."
          : `La référence "${originalReference}" existe déjà. Nouvelle référence proposée : "${suggestedReference}". Vous pouvez accepter et créer directement ou la modifier manuellement.`,
        variant: retryCount >= 5 ? "destructive" : "default"
      });
    }
  };
  
  // Fonction pour initier un retry automatique
  const initiateAutoRetry = (originalReference: string) => {
    console.log('[DEBUG] initiateAutoRetry called with originalReference:', originalReference);
    // Reset du compteur pour une nouvelle série de retries automatiques
    retryCountRef.current = 0;
    originalReferenceRef.current = originalReference;
    autoRetryEnabled.current = true;
    setIsAutoRetrying(true);
    
    console.log('[DEBUG] Starting first auto-retry...');
    // Commencer le premier retry automatique
    handleDuplicateReference(originalReference, 0, true);
  };

  // Fonction pour accepter la référence proposée
  const acceptSuggestedReference = () => {
    setDuplicateReferenceError(null);
    // La référence est déjà mise à jour dans le formulaire
  };

  // Fonction pour accepter la référence proposée ET re-soumettre automatiquement
  const acceptSuggestedReferenceAndSubmit = () => {
    console.log('[DEBUG] acceptSuggestedReferenceAndSubmit called');
    // Désactiver l'auto-retry car l'utilisateur prend le contrôle manuel
    autoRetryEnabled.current = false;
    retryCountRef.current = 0;
    originalReferenceRef.current = "";
    setDuplicateReferenceError(null);
    setIsAutoRetrying(false);
    
    // La référence est déjà mise à jour dans le formulaire, on re-soumet
    const formData = form.getValues();
    console.log('[DEBUG] Re-submitting with accepted reference:', formData.reference);
    createAoMutation.mutate(formData);
  };

  // Fonction pour rejeter et revenir à la référence originale
  const rejectSuggestedReference = () => {
    if (duplicateReferenceError) {
      // Revenir à la référence originale pour permettre l'édition depuis une base connue
      form.setValue("reference", duplicateReferenceError.originalReference, { shouldDirty: true });
    }
    setDuplicateReferenceError(null);
  };

  const onSubmit = (data: CreateAoFormData) => {
    console.log('[DEBUG] onSubmit called with data:', data);
    // Reset du système d'auto-retry pour une nouvelle soumission
    autoRetryEnabled.current = false;
    retryCountRef.current = 0;
    originalReferenceRef.current = "";
    setDuplicateReferenceError(null);
    setIsAutoRetrying(false);
    
    console.log('[DEBUG] Submitting AO creation with reference:', data.reference);
    createAoMutation.mutate(data);
  };

  // Fonction pour gérer l'upload et l'OCR du PDF
  const handlePdfUpload = async () => {
    if (!pdfFile) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un fichier PDF",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);
    setOcrProgress(20);

    const formData = new FormData();
    formData.append("pdf", pdfFile);

    try {
      setOcrProgress(50);
      const response = await fetch("/api/ocr/process-pdf", {
        method: "POST",
        body: formData,
      });

      setOcrProgress(80);

      if (response.ok) {
        const result = await response.json();
        setOcrProgress(100);
        
        // Stocker le résultat OCR
        setOcrResult(result);
        
        // Extraire les données de la structure standardisée du serveur
        const data = result.data || result;
        
        // Pré-remplir le formulaire avec les données extraites
        if (data.processedFields) {
          const fields = data.processedFields;
          
          // Informations générales
          if (fields.reference) {
            form.setValue("reference", fields.reference);
          }
          if (fields.client || fields.maitreOuvrageNom) {
            form.setValue("client", fields.client || fields.maitreOuvrageNom || "");
          }
          if (fields.location) {
            form.setValue("location", fields.location);
          }
          if (fields.intituleOperation) {
            form.setValue("intituleOperation", fields.intituleOperation);
          }
          if (fields.departement) {
            form.setValue("departement", fields.departement);
          }
          
          // Dates
          if (fields.dateSortieAO) {
            form.setValue("dateSortieAO", fields.dateSortieAO);
          }
          if (fields.dateAcceptationAO) {
            form.setValue("dateAcceptationAO", fields.dateAcceptationAO);
          }
          if (fields.demarragePrevu) {
            form.setValue("demarragePrevu", fields.demarragePrevu);
          }
          
          // Informations techniques
          if (fields.menuiserieType) {
            form.setValue("menuiserieType", fields.menuiserieType as any);
          }
          if (fields.montantEstime) {
            form.setValue("montantEstime", fields.montantEstime);
          }
          if (fields.typeMarche) {
            form.setValue("typeMarche", fields.typeMarche as any);
          }
          
          // Éléments techniques
          if (fields.bureauEtudes) {
            form.setValue("bureauEtudes", fields.bureauEtudes);
          }
          if (fields.bureauControle) {
            form.setValue("bureauControle", fields.bureauControle);
          }
          if (fields.sps) {
            form.setValue("sps", fields.sps);
          }
          
          // Ajouter les lots extraits
          if (fields.lots && fields.lots.length > 0) {
            setLots(fields.lots.map((lot: any, index: number) => ({
              numero: lot.numero || `Lot ${index + 1}`,
              designation: lot.designation || "",
              menuiserieType: lot.type || undefined,
              montantEstime: lot.montantEstime || undefined,
              isSelected: true, // Par défaut sélectionné pour analyse
              comment: lot.notes || undefined,
            })));
          }
        }
        
        const lotsCount = data.processedFields?.lots?.length || 0;
        toast({
          title: "Analyse OCR réussie",
          description: `Données extraites avec ${lotsCount} lot${lotsCount > 1 ? 's' : ''} détecté${lotsCount > 1 ? 's' : ''} (confiance: ${data.confidence}%)`,
        });
        
        // Passer automatiquement à l'onglet de formulaire
        setActiveTab("manual");
        
      } else {
        // Gestion spécifique des erreurs 401 - Authentification requise
        if (response.status === 401) {
          toast({
            title: "Authentification requise",
            description: "Vous devez être connecté pour utiliser la fonctionnalité OCR. Redirection vers la page de connexion...",
            variant: "destructive",
          });
          
          // Redirection vers la page de connexion après un court délai
          setTimeout(() => {
            setLocation("/login");
          }, 2000);
          return;
        }
        
        // Pour les autres erreurs, traiter comme erreur OCR/PDF
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || "Erreur lors du traitement du PDF");
      }
    } catch (error) {
      console.error("Erreur OCR:", error);
      toast({
        title: "Erreur lors du traitement OCR",
        description: error instanceof Error ? error.message : "Erreur inconnue lors du traitement du PDF",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
      setOcrProgress(0);
    }
  };

  // Fonction pour gérer le changement de fichier
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPdfFile(e.target.files[0]);
      setOcrResult(null);
    }
  };

  return (
    <div className="min-h-screen flex bg-surface-muted">
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
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="import">
                <Upload className="mr-2 h-4 w-4" />
                Import PDF avec OCR
              </TabsTrigger>
              <TabsTrigger value="manual">
                <FileText className="mr-2 h-4 w-4" />
                Création manuelle
              </TabsTrigger>
            </TabsList>

            {/* Onglet Import PDF */}
            <TabsContent value="import" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Import et Analyse OCR</CardTitle>
                  <CardDescription>
                    Importez un PDF d'appel d'offres pour extraction automatique des données
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                    <Upload className="mx-auto h-12 w-12 text-on-surface-muted" />
                    <p className="mt-2 text-sm text-on-surface-muted">
                      Glissez-déposez un fichier PDF ou cliquez pour parcourir
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => fileInputRef.current?.click()}
                      type="button"
                    >
                      Sélectionner un PDF
                    </Button>
                  </div>

                  {pdfFile && (
                    <div className="flex items-center justify-between p-4 bg-surface-muted rounded-lg">
                      <div className="flex items-center space-x-3">
                        <FileText className="h-8 w-8 text-primary" />
                        <div>
                          <p className="font-medium">{pdfFile.name}</p>
                          <p className="text-sm text-on-surface-muted">
                            {(pdfFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <Button 
                        onClick={handlePdfUpload} 
                        disabled={processing}
                        type="button"
                      >
                        {processing ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Traitement...
                          </>
                        ) : (
                          "Analyser avec OCR"
                        )}
                      </Button>
                    </div>
                  )}

                  {processing && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Traitement OCR en cours...</span>
                        <span>{ocrProgress}%</span>
                      </div>
                      <Progress value={ocrProgress} />
                    </div>
                  )}

                  {ocrResult && (
                    <div className="bg-success/10 p-4 rounded-lg">
                      <div className="flex">
                        <CheckCircle className="h-5 w-5 text-success mr-3" />
                        <div className="text-sm">
                          <p className="font-medium text-success">
                            Analyse OCR réussie
                          </p>
                          <ul className="mt-2 space-y-1 text-success">
                            <li>• Fichier: {ocrResult.filename}</li>
                            <li>• Référence: {ocrResult.processedFields?.reference || "Non détectée"}</li>
                            <li>• Client: {ocrResult.processedFields?.client || ocrResult.processedFields?.maitreOuvrageNom || "Non détecté"}</li>
                            <li>• {ocrResult.processedFields?.lots?.length || 0} lots détectés</li>
                            <li>• Confiance: {ocrResult.confidence}% ({ocrResult.confidenceLevel})</li>
                            <li>• Méthode: {ocrResult.processingMethod}</li>
                          </ul>
                          <p className="mt-2">
                            Passez à l'onglet "Création manuelle" pour vérifier et compléter les données avant de créer l'AO.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex">
                      <AlertCircle className="h-5 w-5 text-blue-400 mr-3" />
                      <div className="text-sm">
                        <p className="font-medium text-blue-900">
                          Fonctionnalités OCR avancées
                        </p>
                        <ul className="mt-2 space-y-1 text-blue-700">
                          <li>• Extraction automatique de 35+ champs</li>
                          <li>• Détection et création des lots</li>
                          <li>• Reconnaissance des contacts et dates</li>
                          <li>• Identification des documents techniques</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Onglet Création manuelle */}
            <TabsContent value="manual" className="space-y-6">
              {/* Alerte pour référence dupliquée */}
              {duplicateReferenceError?.show && (
                <Alert className="border-amber-200 bg-amber-50" data-testid="alert-duplicate-reference">
                  {autoRetryEnabled.current ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  <AlertDescription>
                    <div className="space-y-3">
                      {autoRetryEnabled.current ? (
                        // Mode auto-retry : affichage non-interactif
                        <>
                          <p className="font-medium text-amber-800">
                            🔄 Tentative automatique {duplicateReferenceError.retryCount + 1}/5 en cours...
                          </p>
                          <p className="text-sm text-amber-700">
                            La référence "<span className="font-mono bg-white px-1 rounded">{duplicateReferenceError.originalReference}</span>" existe déjà. 
                            Le système teste automatiquement une nouvelle référence.
                          </p>
                          <p className="text-sm text-amber-700">
                            Référence testée : "<span className="font-mono bg-white px-1 rounded font-medium">{duplicateReferenceError.suggestedReference}</span>"
                          </p>
                          <div className="flex items-center space-x-2 pt-2 text-sm text-amber-600">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            <span>Veuillez patienter, traitement automatique en cours...</span>
                          </div>
                        </>
                      ) : (
                        // Mode manuel : affichage interactif avec boutons d'action
                        <>
                          <p className="font-medium text-amber-800">
                            Référence dupliquée détectée {duplicateReferenceError.retryCount > 0 && `(après ${duplicateReferenceError.retryCount} tentative${duplicateReferenceError.retryCount > 1 ? 's' : ''} automatique${duplicateReferenceError.retryCount > 1 ? 's' : ''})`}
                          </p>
                          <p className="text-sm text-amber-700">
                            La référence "<span className="font-mono bg-white px-1 rounded">{duplicateReferenceError.originalReference}</span>" existe déjà dans la base de données.
                          </p>
                          <p className="text-sm text-amber-700">
                            Nouvelle référence proposée : "<span className="font-mono bg-white px-1 rounded font-medium">{duplicateReferenceError.suggestedReference}</span>"
                          </p>
                          <div className="flex space-x-2 pt-2">
                            <Button
                              type="button"
                              size="sm"
                              onClick={acceptSuggestedReferenceAndSubmit}
                              data-testid="button-accept-and-create"
                              disabled={createAoMutation.isPending}
                            >
                              <CheckCircle className="mr-1 h-3 w-3" />
                              {createAoMutation.isPending ? "Création..." : "Accepter et créer"}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={acceptSuggestedReference}
                              data-testid="button-accept-suggested-reference"
                              disabled={createAoMutation.isPending}
                            >
                              Accepter seulement
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={rejectSuggestedReference}
                              data-testid="button-modify-reference"
                              disabled={createAoMutation.isPending}
                            >
                              Modifier manuellement
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
              
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
                  
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                    <Label className="text-sm text-on-surface-muted">Date limite de remise</Label>
                    <div className="flex items-center space-x-2 mt-1">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <p className="font-medium text-blue-700">Calculée automatiquement par le système</p>
                    </div>
                    <p className="text-xs text-primary mt-1">
                      💡 Base : Date sortie AO + 30 jours | Date rendu calculée à J-15
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
                  <p className="text-sm text-on-surface-muted mb-4">
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
                disabled={createAoMutation.isPending || isAutoRetrying}
                data-testid="button-create-ao"
              >
                {isAutoRetrying ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    🔄 Tentative automatique {retryCountRef.current + 1}/5 en cours...
                  </>
                ) : createAoMutation.isPending ? (
                  "Création..."
                ) : (
                  "Créer l'AO"
                )}
              </Button>
            </div>
          </form>
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