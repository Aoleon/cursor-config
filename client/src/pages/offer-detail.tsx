import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
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
  Star, FileCheck, Settings
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

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
      setIsEditing(false);
      toast({
        title: "Succès",
        description: "Dossier d'offre mis à jour avec succès",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le dossier d'offre",
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
      toast({
        title: "Succès",
        description: "Jalon 'Fin d'études' validé avec succès",
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
      <div className="min-h-screen flex bg-gray-50">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p>Chargement du dossier d'offre...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !offer) {
    return (
      <div className="min-h-screen flex bg-gray-50">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
              <p>Erreur lors du chargement du dossier d'offre</p>
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

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'brouillon': { label: 'Brouillon', variant: 'secondary' as const },
      'en_cours_chiffrage': { label: 'En cours de chiffrage', variant: 'default' as const },
      'en_attente_validation': { label: 'En attente validation', variant: 'destructive' as const },
      'fin_etudes_validee': { label: 'Fin études validée', variant: 'default' as const },
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
    <div className="min-h-screen flex bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Header 
          title={`Dossier d'Offre ${offer.reference}`}
          breadcrumbs={[
            { label: "Accueil", href: "/" },
            { label: "Dossiers d'Offre", href: "/offers" },
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
                    <div className="bg-blue-50 p-4 rounded-lg">
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
                      <div className="bg-green-50 p-3 rounded-lg">
                        <div className="flex items-center gap-2 text-green-700">
                          <CheckCircle className="w-4 h-4" />
                          <span className="text-sm font-medium">Validé</span>
                        </div>
                        <p className="text-xs text-green-600 mt-1">
                          Le {format(new Date(offer.finEtudesValidatedAt), 'dd/MM/yyyy à HH:mm', { locale: fr })}
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
                        <span className="text-gray-500">Estimé:</span>
                        <p>{offer.beHoursEstimated ? `${offer.beHoursEstimated}h` : 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Réel:</span>
                        <p>{offer.beHoursActual ? `${offer.beHoursActual}h` : 'N/A'}</p>
                      </div>
                    </div>
                  </div>
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
                    <p>{format(new Date(offer.createdAt), 'dd/MM/yyyy à HH:mm', { locale: fr })}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Mis à jour le:</span>
                    <p>{format(new Date(offer.updatedAt), 'dd/MM/yyyy à HH:mm', { locale: fr })}</p>
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
                      <p>{format(new Date(offer.deadline), 'dd/MM/yyyy', { locale: fr })}</p>
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