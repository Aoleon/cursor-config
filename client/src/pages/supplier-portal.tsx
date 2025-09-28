import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { getPublicQueryFn } from "@/lib/queryClient"; // CORRECTIF: Fetcher public non-authentifié
import { 
  FileText, 
  Calendar, 
  Clock, 
  Building2, 
  User, 
  Mail, 
  Phone, 
  Upload, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Download,
  Eye,
  Shield,
  RefreshCw
} from "lucide-react";
import SupplierDocumentUpload from "@/components/supplier/SupplierDocumentUpload";

interface SupplierSessionData {
  // Session info
  id: string;
  status: string;
  tokenExpiresAt: string;
  invitedAt: string;
  firstAccessAt: string | null;
  lastAccessAt: string | null;
  submittedAt: string | null;
  
  // AO/Lot details
  ao: {
    id: string;
    reference: string;
    title: string;
    description: string;
    publicationDate: string;
    limitDate: string;
    status: string;
  };
  
  lot: {
    id: string;
    reference: string;
    title: string;
    description: string;
    quantity: number;
    unit: string;
    estimatedPrice: number;
    technicalSpecs: any;
  };
  
  // Supplier info
  supplier: {
    id: string;
    name: string;
    contactEmail: string;
    contactName: string;
    phone: string;
  };
  
  // Documents uploaded
  documents: Array<{
    id: string;
    filename: string;
    originalName: string;
    documentType: string;
    fileSize: number;
    status: string;
    uploadedAt: string;
    validatedAt: string | null;
    validatedBy: string | null;
  }>;
}

export default function SupplierPortal() {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [documentUploadKey, setDocumentUploadKey] = useState(0);

  // CORRECTIF CRITIQUE: Query public isolé du contexte authentifié
  const { 
    data: sessionData, 
    isLoading, 
    error, 
    refetch 
  } = useQuery<SupplierSessionData>({
    queryKey: ['/api/supplier-workflow/sessions/public', token],
    queryFn: getPublicQueryFn, // CORRECTIF: Utiliser fetcher public sans credentials
    enabled: !!token,
    retry: (failureCount, error: any) => {
      // CORRECTIF: Gestion des erreurs de sécurité appropriée
      if (error?.status === 401 || error?.status === 404) {
        return false;
      }
      return failureCount < 3;
    },
    // CORRECTIF: Configuration spécifique pour contexte public
    staleTime: 30000, // Cache court pour les données sensibles
    refetchOnWindowFocus: false,
    refetchInterval: false
  });

  // Effect pour marquer le premier accès
  useEffect(() => {
    if (sessionData && !sessionData.firstAccessAt) {
      // Marquer le premier accès côté serveur
      console.log('[SupplierPortal] Premier accès détecté');
    }
  }, [sessionData]);

  // Fonction pour calculer le temps restant
  const getTimeRemaining = (expirationDate: string) => {
    const now = new Date();
    const expiry = new Date(expirationDate);
    const diff = expiry.getTime() - now.getTime();
    
    if (diff <= 0) {
      return { text: "Expiré", variant: "destructive" as const };
    }
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 1) {
      return { text: `${days} jours restants`, variant: "default" as const };
    } else if (days === 1) {
      return { text: `1 jour et ${hours}h restantes`, variant: "secondary" as const };
    } else if (hours > 12) {
      return { text: `${hours}h restantes`, variant: "secondary" as const };
    } else if (hours > 0) {
      return { text: `${hours}h restantes`, variant: "destructive" as const };
    } else {
      return { text: "Expire bientôt", variant: "destructive" as const };
    }
  };

  // Fonction pour calculer le pourcentage de progression
  const getProgressPercentage = () => {
    if (!sessionData) return 0;
    
    let progress = 25; // Session active
    
    if (sessionData.firstAccessAt) progress += 25; // Premier accès
    if (sessionData.documents.length > 0) progress += 25; // Documents uploadés
    if (sessionData.submittedAt) progress += 25; // Soumission finale
    
    return progress;
  };

  // Gestion d'erreur d'accès
  if (error) {
    const errorStatus = (error as any)?.status;
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
        <Card className="max-w-md w-full" data-testid="error-card">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4">
              <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle className="text-red-600 dark:text-red-400">
              {errorStatus === 401 || errorStatus === 404 ? "Accès non autorisé" : "Erreur de connexion"}
            </CardTitle>
            <CardDescription>
              {errorStatus === 401 || errorStatus === 404 
                ? "Le lien d'accès est invalide ou a expiré."
                : "Impossible de charger les données. Veuillez réessayer."
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            {errorStatus !== 401 && errorStatus !== 404 && (
              <Button 
                onClick={() => refetch()} 
                variant="outline" 
                className="w-full"
                data-testid="button-retry"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Réessayer
              </Button>
            )}
            <p className="text-sm text-muted-foreground">
              Si le problème persiste, contactez le support technique.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Chargement
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header skeleton */}
          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-32 w-full" />
              </div>
            </CardContent>
          </Card>
          
          {/* Content skeleton */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-1/2" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-40 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (!sessionData) {
    return null;
  }

  const timeRemaining = getTimeRemaining(sessionData.tokenExpiresAt);
  const progressPercentage = getProgressPercentage();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header fixe avec informations de session */}
      <div className="sticky top-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Building2 className="w-6 h-6 text-blue-600" />
                <div>
                  <h1 className="text-lg font-semibold text-foreground" data-testid="text-company-name">
                    JLM Menuiserie
                  </h1>
                  <p className="text-sm text-muted-foreground">Portail Fournisseur</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Badge variant={timeRemaining.variant} data-testid="badge-time-remaining">
                <Clock className="w-3 h-3 mr-1" />
                {timeRemaining.text}
              </Badge>
              <div className="text-right">
                <p className="text-sm font-medium" data-testid="text-supplier-name">
                  {sessionData.supplier.name}
                </p>
                <p className="text-xs text-muted-foreground">{sessionData.supplier.contactName}</p>
              </div>
            </div>
          </div>
          
          {/* Barre de progression */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-muted-foreground mb-2">
              <span>Progression de votre soumission</span>
              <span>{progressPercentage}%</span>
            </div>
            <Progress value={progressPercentage} className="h-2" data-testid="progress-submission" />
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        
        {/* Informations AO et Lot */}
        <Card data-testid="card-ao-details">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-xl flex items-center space-x-2">
                  <FileText className="w-5 h-5" />
                  <span data-testid="text-ao-reference">{sessionData.ao.reference}</span>
                </CardTitle>
                <CardDescription className="mt-2" data-testid="text-ao-title">
                  {sessionData.ao.title}
                </CardDescription>
              </div>
              <Badge 
                variant={sessionData.ao.status === 'active' ? 'default' : 'secondary'}
                data-testid="badge-ao-status"
              >
                {sessionData.ao.status === 'active' ? 'Actif' : 'Fermé'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground" data-testid="text-ao-description">
              {sessionData.ao.description}
            </p>
            
            <Separator />
            
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <h4 className="font-medium flex items-center space-x-2">
                  <Calendar className="w-4 h-4" />
                  <span>Dates importantes</span>
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Publication :</span>
                    <span data-testid="text-publication-date">
                      {new Date(sessionData.ao.publicationDate).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date limite :</span>
                    <span className="font-medium" data-testid="text-limit-date">
                      {new Date(sessionData.ao.limitDate).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit', 
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-medium">Lot concerné</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Référence :</span>
                    <span data-testid="text-lot-reference">{sessionData.lot.reference}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Quantité :</span>
                    <span data-testid="text-lot-quantity">
                      {sessionData.lot.quantity} {sessionData.lot.unit}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Estimation :</span>
                    <span data-testid="text-lot-estimated-price">
                      {sessionData.lot.estimatedPrice?.toLocaleString('fr-FR', {
                        style: 'currency',
                        currency: 'EUR'
                      }) || 'Non communiqué'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            {sessionData.lot.description && (
              <>
                <Separator />
                <div>
                  <h4 className="font-medium mb-2">Description du lot</h4>
                  <p className="text-sm text-muted-foreground" data-testid="text-lot-description">
                    {sessionData.lot.description}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Statut et Documents */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Statut de la soumission */}
          <Card data-testid="card-submission-status">
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <Shield className="w-4 h-4" />
                <span>Statut de votre soumission</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Session créée</span>
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm">Premier accès</span>
                  {sessionData.firstAccessAt ? (
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-xs text-muted-foreground">
                        {new Date(sessionData.firstAccessAt).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  ) : (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  )}
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm">Documents uploadés</span>
                  {sessionData.documents.length > 0 ? (
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-xs text-muted-foreground">
                        {sessionData.documents.length} document{sessionData.documents.length > 1 ? 's' : ''}
                      </span>
                    </div>
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-yellow-600" />
                  )}
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm">Soumission finalisée</span>
                  {sessionData.submittedAt ? (
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-xs text-muted-foreground">
                        {new Date(sessionData.submittedAt).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-yellow-600" />
                  )}
                </div>
              </div>
              
              {sessionData.submittedAt && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>Soumission enregistrée</AlertTitle>
                  <AlertDescription>
                    Votre soumission a été finalisée le {new Date(sessionData.submittedAt).toLocaleDateString('fr-FR')}. 
                    Vous recevrez une notification lors de l'évaluation.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Upload de documents */}
          <SupplierDocumentUpload 
            key={documentUploadKey}
            sessionToken={token!}
            sessionData={sessionData}
            onUploadSuccess={() => {
              // Rafraîchir les données après upload
              queryClient.invalidateQueries({ 
                queryKey: ['/api/supplier-workflow/sessions/public', token] 
              });
              setDocumentUploadKey(prev => prev + 1);
            }}
          />
        </div>

        {/* Liste des documents uploadés */}
        {sessionData.documents.length > 0 && (
          <Card data-testid="card-uploaded-documents">
            <CardHeader>
              <CardTitle className="text-lg">Documents uploadés</CardTitle>
              <CardDescription>
                Historique de vos documents soumis pour cette demande de chiffrage.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {sessionData.documents.map((doc) => (
                  <div 
                    key={doc.id} 
                    className="flex items-center justify-between p-3 border rounded-lg"
                    data-testid={`document-item-${doc.id}`}
                  >
                    <div className="flex items-center space-x-3">
                      <FileText className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="font-medium" data-testid={`document-name-${doc.id}`}>
                          {doc.originalName}
                        </p>
                        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                          <span>
                            {(doc.fileSize / 1024 / 1024).toFixed(1)} MB
                          </span>
                          <span>•</span>
                          <span>
                            {new Date(doc.uploadedAt).toLocaleDateString('fr-FR')}
                          </span>
                          <span>•</span>
                          <Badge 
                            variant={doc.status === 'validated' ? 'default' : 'secondary'} 
                            className="text-xs"
                          >
                            {doc.status === 'uploaded' && 'En attente'}
                            {doc.status === 'processing' && 'En traitement'}
                            {doc.status === 'validated' && 'Validé'}
                            {doc.status === 'rejected' && 'Rejeté'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {doc.status === 'validated' && (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      )}
                      {doc.status === 'rejected' && (
                        <XCircle className="w-4 h-4 text-red-600" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instructions et aide */}
        <Card data-testid="card-instructions">
          <CardHeader>
            <CardTitle className="text-lg">Instructions importantes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="font-medium mb-2">Documents requis</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Devis détaillé (obligatoire)</li>
                  <li>• Fiches techniques des produits</li>
                  <li>• Certifications et agréments</li>
                  <li>• Planning prévisionnel</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Contact support</h4>
                <div className="text-sm space-y-2">
                  <div className="flex items-center space-x-2">
                    <Mail className="w-4 h-4" />
                    <span>support@jlm-menuiserie.fr</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Phone className="w-4 h-4" />
                    <span>03 21 XX XX XX</span>
                  </div>
                  <p className="text-muted-foreground mt-2">
                    Disponible du lundi au vendredi, 8h-18h
                  </p>
                </div>
              </div>
            </div>
            
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Important</AlertTitle>
              <AlertDescription>
                Ce lien d'accès est personnel et sécurisé. Ne le partagez pas. 
                Il expire le {new Date(sessionData.tokenExpiresAt).toLocaleDateString('fr-FR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}