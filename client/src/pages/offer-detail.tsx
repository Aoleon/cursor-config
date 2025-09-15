import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useKpiInvalidation } from "@/hooks/use-kpi-invalidation";
import { queryClient, apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Save, ArrowLeft, Eye, FileText, Users, Calendar, 
  MapPin, Building, Euro, Clock, AlertCircle, CheckCircle,
  Star, FileCheck, Settings, Database, RotateCcw, RefreshCw
} from "lucide-react";
import { format, isValid } from "date-fns";
import { fr } from "date-fns/locale";

// Fonction utilitaire pour formater les dates de façon sécurisée
const formatSafeDate = (dateValue: string | null | undefined, formatStr: string = 'dd/MM/yyyy à HH:mm') => {
  if (!dateValue) return 'Non défini';
  
  const date = new Date(dateValue);
  
  if (!isValid(date)) {
    console.warn('Date invalide détectée:', dateValue);
    return 'Date invalide';
  }
  
  return format(date, formatStr, { locale: fr });
};

interface OfferDetail {
  id: string;
  reference: string;
  aoId?: string;
  client: string;
  location: string;
  menuiserieType: string;
  montantEstime: string;
  montantFinal?: string;
  status: string;
  responsibleUserId?: string;
  isPriority: boolean;
  dpgfData?: any;
  batigestRef?: string;
  batigestIntegration?: {
    id: string;
    numeroDevis: string;
    montantBatigest: string;
    tauxMarge: string;
    statutBatigest: string;
    lastSyncAt: string;
    syncStatus: string;
  };
  finEtudesValidatedAt?: string;
  finEtudesValidatedBy?: string;
  beHoursEstimated?: string;
  beHoursActual?: string;
  deadline?: string;
  createdAt: string;
  updatedAt: string;
  responsibleUser?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  ao?: {
    id: string;
    reference: string;
    client: string;
    location: string;
    departement: string;
    maitreOeuvre?: string;
    menuiserieType: string;
    montantEstime: string;
    source: string;
    dateOS?: string;
    description?: string;
    cctp?: string;
    delaiContractuel?: number;
  };
}

export default function OfferDetail() {
  const params = useParams();
  const [_, setLocation] = useLocation();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<OfferDetail>>({});
  const { toast } = useToast();
  const kpiInvalidation = useKpiInvalidation();

  const offerId = params.id;

  // Récupérer les détails de l'offre
  const { data: offer, isLoading, error } = useQuery<OfferDetail>({
    queryKey: [`/api/offers/${offerId}`],
    enabled: !!offerId,
  });

  // Récupérer la liste des utilisateurs pour l'assignation
  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
  });

  // Récupérer l'intégration Batigest pour cette offre
  const { data: batigestIntegration, isLoading: isBatigestLoading } = useQuery({
    queryKey: ['/api/batigest/integrations', offerId],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/batigest/integrations');
      const data = await res.json();
      return data.integrations?.find((integration: any) => integration.integration.offerId === offerId);
    },
    enabled: !!offerId,
  });

  // Mutation pour la mise à jour
  const updateMutation = useMutation({
    mutationFn: async (updateData: Partial<OfferDetail>) => {
      const response = await fetch(`/api/offers/${offerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });
      if (!response.ok) throw new Error('Failed to update offer');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/offers/${offerId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/offers"] });
      kpiInvalidation.invalidateKpisAndRelatedData(); // Invalidation automatique KPIs
      setIsEditing(false);
      toast({
        title: "Succès",
        description: "Appel d'offre mis à jour avec succès",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour l'appel d'offre",
        variant: "destructive",
      });
    },
  });

  // Mutation pour valider le jalon "Fin d'études"
  const validateStudiesMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/offers/${offerId}/validate-studies`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          finEtudesValidatedAt: new Date().toISOString(),
          status: 'fin_etudes_validee'
        }),
      });
      if (!response.ok) throw new Error('Failed to validate studies');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/offers/${offerId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/offers"] });
      kpiInvalidation.invalidateKpisAndRelatedData(); // Invalidation automatique KPIs
      toast({
        title: "Succès",
        description: "Jalon 'Fin d'études' validé avec succès",
      });
    },
  });

  // Mutation pour marquer une offre comme signée
  const markSignedMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/offers/${offerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'signe' }),
      });
      if (!response.ok) throw new Error('Failed to mark offer as signed');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/offers/${offerId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/offers"] });
      kpiInvalidation.invalidateKpisAndRelatedData(); // Invalidation automatique KPIs - Impact taux conversion
      toast({
        title: "Succès",
        description: "Offre marquée comme signée",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible de marquer l'offre comme signée",
        variant: "destructive",
      });
    },
  });

  // Mutation pour convertir une offre signée en projet
  const convertToProjectMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/offers/${offerId}/convert-to-project`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to convert offer to project');
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/offers/${offerId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/offers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      kpiInvalidation.invalidateKpisForProjects(); // Invalidation KPIs - Impact charge BE et projets
      toast({
        title: "Succès",
        description: `Projet "${data.project.name}" créé avec succès`,
      });
      // Rediriger vers la page projets
      setLocation("/projects");
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer le projet",
        variant: "destructive",
      });
    },
  });

  // Mutation pour synchroniser avec Batigest
  const syncBatigestMutation = useMutation({
    mutationFn: async (batigestRef: string) => {
      return apiRequest('POST', '/api/batigest/sync-offer', {
        offerId: offerId,
        batigestRef: batigestRef
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/offers/${offerId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/batigest/integrations', offerId] });
      toast({
        title: "Succès",
        description: "Synchronisation Batigest réussie",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la synchronisation Batigest",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (offer && !isEditing) {
      setFormData(offer);
    }
  }, [offer, isEditing]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex bg-surface-muted">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p>Chargement de l'appel d'offre...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !offer) {
    return (
      <div className="min-h-screen flex bg-surface-muted">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <AlertCircle className="h-8 w-8 text-error mx-auto mb-4" />
              <p>Erreur lors du chargement de l'appel d'offre</p>
              <Button 
                variant="outline" 
                onClick={() => setLocation("/offers")}
                className="mt-4"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour aux offres
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  const handleInputChange = (field: keyof OfferDetail, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleMarkSigned = () => {
    markSignedMutation.mutate();
  };

  const handleConvertToProject = () => {
    convertToProjectMutation.mutate();
  };

  const handleSyncBatigest = () => {
    if (formData.batigestRef) {
      syncBatigestMutation.mutate(formData.batigestRef);
    } else {
      toast({
        title: "Erreur",
        description: "Veuillez renseigner une référence Batigest",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'brouillon': { label: 'Brouillon', variant: 'secondary' as const },
      'en_cours_chiffrage': { label: 'En cours de chiffrage', variant: 'default' as const },
      'en_attente_validation': { label: 'En attente validation', variant: 'destructive' as const },
      'fin_etudes_validee': { label: 'Fin études validée', variant: 'default' as const },
      'valide': { label: 'Validé', variant: 'default' as const },
      'signe': { label: 'Signé', variant: 'default' as const },
      'transforme_en_projet': { label: 'Transformé en projet', variant: 'default' as const },
      'termine': { label: 'Terminé', variant: 'default' as const },
      'archive': { label: 'Archivé', variant: 'secondary' as const },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.brouillon;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getMenuiserieTypeLabel = (type: string) => {
    const types = {
      'fenetre': 'Fenêtre',
      'porte': 'Porte',
      'portail': 'Portail',
      'volet': 'Volet',
      'cloison': 'Cloison',
      'verriere': 'Verrière',
      'autre': 'Autre'
    };
    return types[type as keyof typeof types] || type;
  };

  return (
    <div className="min-h-screen flex bg-surface-muted">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Header 
          title={`Appel d'Offre ${offer.reference}`}
          breadcrumbs={[
            { label: "Accueil", href: "/" },
            { label: "Appels d'Offre", href: "/offers" },
            { label: offer.reference }
          ]}
          actions={[
            {
              label: "Retour",
              variant: "outline",
              icon: "arrow-left",
              onClick: () => setLocation("/offers")
            },
            {
              label: isEditing ? "Annuler" : "Modifier",
              variant: "outline",
              icon: "edit",
              onClick: () => {
                if (isEditing) {
                  setFormData(offer);
                }
                setIsEditing(!isEditing);
              }
            },
            ...(isEditing ? [{
              label: "Sauvegarder",
              variant: "default" as const,
              icon: "save" as const,
              onClick: handleSave
            }] : []),
            ...(!isEditing && (offer.status === "en_cours_chiffrage" || offer.status === "en_attente_validation") ? [{
              label: "Chiffrage",
              variant: "default" as const,
              icon: "calculator" as const,
              onClick: () => setLocation(`/offers/${offer.id}/chiffrage`)
            }] : []),
            ...(!isEditing && offer.status === "valide" ? [{
              label: "Marquer Signé",
              variant: "default" as const,
              icon: "check" as const,
              onClick: handleMarkSigned
            }] : []),
            ...(!isEditing && offer.status === "signe" ? [{
              label: "Créer Projet",
              variant: "default" as const,
              icon: "plus" as const,
              onClick: handleConvertToProject
            }] : [])
          ]}
        />
        
        <div className="px-6 py-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Informations principales */}
            <div className="lg:col-span-2 space-y-6">
              <Card data-testid="offer-main-info">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Informations Générales
                  </CardTitle>
                  {offer.isPriority && (
                    <Badge variant="destructive" className="flex items-center gap-1">
                      <Star className="w-3 h-3" />
                      Priorité
                    </Badge>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="reference">Référence</Label>
                      <Input 
                        id="reference"
                        value={formData.reference || ''}
                        onChange={(e) => handleInputChange('reference', e.target.value)}
                        disabled={!isEditing}
                        data-testid="input-reference"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="client">Client</Label>
                      <Input 
                        id="client"
                        value={formData.client || ''}
                        onChange={(e) => handleInputChange('client', e.target.value)}
                        disabled={!isEditing}
                        data-testid="input-client"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="location">Localisation</Label>
                      <Input 
                        id="location"
                        value={formData.location || ''}
                        onChange={(e) => handleInputChange('location', e.target.value)}
                        disabled={!isEditing}
                        data-testid="input-location"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="menuiserie-type">Type de menuiserie</Label>
                      <Select 
                        value={formData.menuiserieType} 
                        onValueChange={(value) => handleInputChange('menuiserieType', value)}
                        disabled={!isEditing}
                      >
                        <SelectTrigger data-testid="select-menuiserie-type">
                          <SelectValue placeholder="Sélectionner un type" />
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
                    
                    <div className="space-y-2">
                      <Label htmlFor="montant-estime">Montant estimé (€)</Label>
                      <Input 
                        id="montant-estime"
                        type="number"
                        step="0.01"
                        value={formData.montantEstime || ''}
                        onChange={(e) => handleInputChange('montantEstime', e.target.value)}
                        disabled={!isEditing}
                        data-testid="input-montant-estime"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="montant-final">Montant final (€)</Label>
                      <Input 
                        id="montant-final"
                        type="number"
                        step="0.01"
                        value={formData.montantFinal || ''}
                        onChange={(e) => handleInputChange('montantFinal', e.target.value)}
                        disabled={!isEditing}
                        data-testid="input-montant-final"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="responsible">Responsable BE</Label>
                    <Select 
                      value={formData.responsibleUserId} 
                      onValueChange={(value) => handleInputChange('responsibleUserId', value)}
                      disabled={!isEditing}
                    >
                      <SelectTrigger data-testid="select-responsible">
                        <SelectValue placeholder="Sélectionner un responsable" />
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

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="priority"
                      checked={formData.isPriority || false}
                      onCheckedChange={(checked) => handleInputChange('isPriority', checked)}
                      disabled={!isEditing}
                      data-testid="switch-priority"
                    />
                    <Label htmlFor="priority">Marquer comme priorité</Label>
                  </div>
                </CardContent>
              </Card>

              {/* Informations AO source si disponible */}
              {offer.ao && (
                <Card data-testid="offer-ao-info">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Eye className="w-5 h-5" />
                      Appel d'Offres Source
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-primary/10 p-4 rounded-lg">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Référence AO:</span>
                          <p>{offer.ao.reference}</p>
                        </div>
                        <div>
                          <span className="font-medium">Département:</span>
                          <p>{offer.ao.departement}</p>
                        </div>
                        <div>
                          <span className="font-medium">Maître d'œuvre:</span>
                          <p>{offer.ao.maitreOeuvre || 'Non renseigné'}</p>
                        </div>
                        <div>
                          <span className="font-medium">Source:</span>
                          <p>{offer.ao.source}</p>
                        </div>
                        {offer.ao.description && (
                          <div className="md:col-span-2">
                            <span className="font-medium">Description:</span>
                            <p>{offer.ao.description}</p>
                          </div>
                        )}
                        {offer.ao.cctp && (
                          <div className="md:col-span-2">
                            <span className="font-medium">CCTP:</span>
                            <p className="text-xs">{offer.ao.cctp}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Panneau latéral */}
            <div className="space-y-6">
              {/* Statut et Actions */}
              <Card data-testid="offer-status-actions">
                <CardHeader>
                  <CardTitle>Statut et Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Statut actuel</Label>
                    {isEditing ? (
                      <Select 
                        value={formData.status} 
                        onValueChange={(value) => handleInputChange('status', value)}
                      >
                        <SelectTrigger data-testid="select-status">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="brouillon">Brouillon</SelectItem>
                          <SelectItem value="en_cours_chiffrage">En cours de chiffrage</SelectItem>
                          <SelectItem value="en_attente_validation">En attente validation</SelectItem>
                          <SelectItem value="fin_etudes_validee">Fin études validée</SelectItem>
                          <SelectItem value="termine">Terminé</SelectItem>
                          <SelectItem value="archive">Archivé</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <div>{getStatusBadge(offer.status)}</div>
                    )}
                  </div>

                  <Separator />

                  {/* Jalon Fin d'études */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Jalon "Fin d'études"</Label>
                    {offer.finEtudesValidatedAt ? (
                      <div className="bg-success/10 p-3 rounded-lg">
                        <div className="flex items-center gap-2 text-success">
                          <CheckCircle className="w-4 h-4" />
                          <span className="text-sm font-medium">Validé</span>
                        </div>
                        <p className="text-xs text-success mt-1">
                          Le {formatSafeDate(offer.finEtudesValidatedAt)}
                        </p>
                      </div>
                    ) : (
                      <Button
                        onClick={() => validateStudiesMutation.mutate()}
                        disabled={validateStudiesMutation.isPending}
                        size="sm"
                        className="w-full"
                        data-testid="button-validate-studies"
                      >
                        <FileCheck className="w-4 h-4 mr-2" />
                        Valider Fin d'études
                      </Button>
                    )}
                  </div>

                  <Separator />

                  {/* Métriques BE */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Heures BE</Label>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Estimé:</span>
                        <p>{offer.beHoursEstimated ? `${offer.beHoursEstimated}h` : 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Réel:</span>
                        <p>{offer.beHoursActual ? `${offer.beHoursActual}h` : 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Intégration Batigest */}
              <Card data-testid="offer-batigest-integration">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="w-4 h-4" />
                    Intégration Batigest
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Champ référence Batigest */}
                  <div className="space-y-2">
                    <Label htmlFor="batigest-ref">Référence Batigest</Label>
                    {isEditing ? (
                      <Input 
                        id="batigest-ref"
                        value={formData.batigestRef || ''}
                        onChange={(e) => handleInputChange('batigestRef', e.target.value)}
                        placeholder="DEV-2024-001 ou AO-2503-21612025-03-05"
                        data-testid="input-batigest-ref"
                      />
                    ) : (
                      <div className="text-sm">
                        {offer.batigestRef || (
                          <span className="text-muted-foreground italic">Non renseigné</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Bouton synchronisation */}
                  {offer.batigestRef && (
                    <Button
                      onClick={handleSyncBatigest}
                      disabled={syncBatigestMutation.isPending || isEditing}
                      size="sm"
                      className="w-full"
                      data-testid="button-sync-batigest"
                    >
                      {syncBatigestMutation.isPending ? (
                        <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <RotateCcw className="w-4 h-4 mr-2" />
                      )}
                      {syncBatigestMutation.isPending ? "Synchronisation..." : "Synchroniser avec Batigest"}
                    </Button>
                  )}

                  {/* Statut intégration */}
                  {isBatigestLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Chargement de l'intégration...
                    </div>
                  ) : batigestIntegration ? (
                    <div className="bg-success/10 dark:bg-green-900/20 p-3 rounded-lg">
                      <div className="flex items-center gap-2 text-success dark:text-success mb-2">
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">Synchronisé</span>
                      </div>
                      
                      <div className="space-y-1 text-xs">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-muted-foreground">N° Devis:</span>
                            <p className="font-medium" data-testid="text-batigest-devis">
                              {batigestIntegration.integration.numeroDevis}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Statut:</span>
                            <p className="font-medium">
                              {batigestIntegration.integration.statutBatigest}
                            </p>
                          </div>
                        </div>
                        
                        {batigestIntegration.integration.montantBatigest && (
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="text-muted-foreground">Montant HT:</span>
                              <p className="font-medium">
                                {new Intl.NumberFormat('fr-FR', {
                                  style: 'currency',
                                  currency: 'EUR'
                                }).format(parseFloat(batigestIntegration.integration.montantBatigest))}
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Marge:</span>
                              <p className="font-medium">
                                {batigestIntegration.integration.tauxMarge}%
                              </p>
                            </div>
                          </div>
                        )}
                        
                        <div className="pt-2 border-t border-success/20 dark:border-success/40">
                          <span className="text-muted-foreground">Dernière sync:</span>
                          <p className="font-medium">
                            {formatSafeDate(batigestIntegration.integration.lastSyncAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : offer.batigestRef ? (
                    <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg">
                      <div className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">Non synchronisé</span>
                      </div>
                      <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                        Référence renseignée mais synchronisation en attente
                      </p>
                    </div>
                  ) : (
                    <div className="bg-surface-muted dark:bg-gray-800 p-3 rounded-lg">
                      <div className="flex items-center gap-2 text-on-surface-muted">
                        <Database className="w-4 h-4" />
                        <span className="text-sm font-medium">Intégration disponible</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Renseignez une référence Batigest pour synchroniser cette offre
                      </p>
                    </div>
                  )}

                  {/* Erreur synchronisation */}
                  {syncBatigestMutation.isError && (
                    <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                      <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">Erreur de synchronisation</span>
                      </div>
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                        {syncBatigestMutation.error?.message || "Erreur inconnue"}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Informations système */}
              <Card data-testid="offer-system-info">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Informations
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-500">Créé le:</span>
                    <p>{formatSafeDate(offer.createdAt)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Mis à jour le:</span>
                    <p>{formatSafeDate(offer.updatedAt)}</p>
                  </div>
                  {offer.batigestRef && (
                    <div>
                      <span className="text-gray-500">Réf. Batigest:</span>
                      <p>{offer.batigestRef}</p>
                    </div>
                  )}
                  {offer.deadline && (
                    <div>
                      <span className="text-gray-500">Échéance:</span>
                      <p>{formatSafeDate(offer.deadline, 'dd/MM/yyyy')}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}