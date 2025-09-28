import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequestPublic } from "@/lib/queryClient"; // CORRECTIF: Utiliser apiRequestPublic
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Loader2,
  FileType,
  FileX,
  RotateCcw
} from "lucide-react";

interface SupplierDocumentUploadProps {
  sessionToken: string;
  sessionData: any;
  onUploadSuccess?: () => void;
}

interface UploadProgress {
  file: File;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  error?: string;
  intervalId?: NodeJS.Timeout; // CORRECTIF: Tracker les intervalles par fichier
}

export default function SupplierDocumentUpload({ 
  sessionToken, 
  sessionData, 
  onUploadSuccess 
}: SupplierDocumentUploadProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);

  // CORRECTIF CRITIQUE: Mutation upload sécurisée avec gestion individuelle des fichiers
  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const results: any[] = [];
      const failedFiles: any[] = [];
      
      // CORRECTIF: Upload parallèle avec gestion individuelle
      const uploadPromises = files.map(async (file, fileIndex) => {
        const progressKey = `${file.name}-${Date.now()}-${fileIndex}`;
        let progressInterval: NodeJS.Timeout | null = null;
        
        try {
          // CORRECTIF: Initialiser le progress individuellement
          setUploadProgress(prev => [...prev, {
            file,
            progress: 0,
            status: 'uploading',
            intervalId: undefined // Sera assigné après
          }]);
          
          const formData = new FormData();
          formData.append('document', file);
          formData.append('sessionToken', sessionToken);
          formData.append('documentType', 'quote'); // Type par défaut corrigé
          
          // CORRECTIF: Progress simulé avec tracking d'interval individuel
          progressInterval = setInterval(() => {
            setUploadProgress(prev => prev.map((item) => 
              item.file.name === file.name && item.status === 'uploading' ? 
                { 
                  ...item, 
                  progress: Math.min(item.progress + 8, 92),
                  intervalId: progressInterval! 
                } : 
                item
            ));
          }, 150);
          
          // CORRECTIF CRITIQUE: Utiliser apiRequestPublic au lieu de fetch
          const response = await apiRequestPublic(
            'POST',
            '/api/supplier-workflow/documents/upload',
            formData
          );
          
          // CORRECTIF CRITIQUE: clearInterval obligatoire sur SUCCÈS
          if (progressInterval) {
            clearInterval(progressInterval);
            progressInterval = null;
          }
          
          const result = await response.json();
          
          // CORRECTIF: Marquer succès individuellement
          setUploadProgress(prev => prev.map((item) => 
            item.file.name === file.name ? 
              { 
                ...item, 
                progress: 100, 
                status: 'success' as const,
                intervalId: undefined
              } : 
              item
          ));
          
          results.push({ file, result, success: true });
          return { file, result, success: true };
          
        } catch (error) {
          // CORRECTIF CRITIQUE: clearInterval obligatoire sur ERREUR
          if (progressInterval) {
            clearInterval(progressInterval);
            progressInterval = null;
          }
          
          const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
          
          // CORRECTIF: Marquer erreur individuellement
          setUploadProgress(prev => prev.map((item) => 
            item.file.name === file.name ? 
              { 
                ...item, 
                progress: 0, 
                status: 'error' as const,
                error: errorMessage,
                intervalId: undefined
              } : 
              item
          ));
          
          failedFiles.push({ file, error: errorMessage });
          return { file, error: errorMessage, success: false };
        }
      });
      
      // Attendre tous les uploads (succès et échecs)
      const uploadResults = await Promise.allSettled(uploadPromises);
      
      // CORRECTIF RESILIENCE: Analyser les résultats
      const successfulUploads = results.filter(r => r.success);
      const hasFailures = failedFiles.length > 0;
      
      // Retourner statistiques pour gestion d'erreur appropriée
      return {
        total: files.length,
        successful: successfulUploads.length,
        failed: failedFiles.length,
        results: successfulUploads,
        errors: failedFiles,
        hasFailures
      };
    },
    onSuccess: (uploadResult) => {
      const { total, successful, failed, hasFailures } = uploadResult;
      
      if (!hasFailures) {
        // CORRECTIF: Succès total
        toast({
          title: "Upload réussi",
          description: `${successful} document${successful > 1 ? 's' : ''} uploadé${successful > 1 ? 's' : ''} avec succès.`,
        });
      } else {
        // CORRECTIF RESILIENCE: Succès partiel
        toast({
          title: "Upload partiellement réussi",
          description: `${successful} sur ${total} fichiers uploadés. ${failed} en échec.`,
          variant: "destructive",
        });
      }
      
      // CORRECTIF: Nettoyer les progress après délai pour feedback utilisateur
      setTimeout(() => {
        setUploadProgress(prev => prev.filter(item => item.status === 'error'));
      }, 4000); // Garder les erreurs plus longtemps
      
      // CORRECTIF: Callback pour rafraîchir les données si au moins un succès
      if (successful > 0 && onUploadSuccess) {
        onUploadSuccess();
      }
    },
    onError: (error) => {
      // CORRECTIF SECURITE: Nettoyage d'urgence des intervalles
      setUploadProgress(prev => {
        prev.forEach(item => {
          if (item.intervalId) {
            clearInterval(item.intervalId);
          }
        });
        return prev.map(item => ({
          ...item,
          status: 'error' as const,
          error: 'Upload interrompu',
          intervalId: undefined
        }));
      });
      
      toast({
        title: "Erreur d'upload",
        description: error instanceof Error ? error.message : "Erreur critique lors de l'upload",
        variant: "destructive",
      });
    }
  });

  // Configuration react-dropzone
  const onDrop = useCallback((acceptedFiles: File[]) => {
    // Validation des fichiers
    const validFiles = acceptedFiles.filter(file => {
      // Vérifier le type MIME
      if (file.type !== 'application/pdf') {
        toast({
          title: "Format non autorisé",
          description: `Le fichier "${file.name}" n'est pas un PDF.`,
          variant: "destructive",
        });
        return false;
      }
      
      // Vérifier la taille (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "Fichier trop volumineux",
          description: `Le fichier "${file.name}" dépasse la limite de 10MB.`,
          variant: "destructive",
        });
        return false;
      }
      
      return true;
    });
    
    if (validFiles.length > 0) {
      uploadMutation.mutate(validFiles);
    }
  }, [sessionToken, toast, uploadMutation]);

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragReject,
    fileRejections
  } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    disabled: uploadMutation.isPending || !sessionData || sessionData.submittedAt
  });

  // Vérifier si la session est expirée
  const isExpired = new Date(sessionData?.tokenExpiresAt) < new Date();
  const isSubmitted = sessionData?.submittedAt;
  const canUpload = !isExpired && !isSubmitted && !uploadMutation.isPending;

  return (
    <Card data-testid="card-document-upload">
      <CardHeader>
        <CardTitle className="text-lg flex items-center space-x-2">
          <Upload className="w-4 h-4" />
          <span>Upload de documents</span>
        </CardTitle>
        <CardDescription>
          Glissez-déposez vos fichiers PDF ou cliquez pour les sélectionner. 
          Maximum 10MB par fichier.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* Zone de drop */}
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
            ${isDragActive && !isDragReject ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10' : ''}
            ${isDragReject ? 'border-red-500 bg-red-50 dark:bg-red-900/10' : ''}
            ${!canUpload ? 'cursor-not-allowed opacity-50' : 'hover:border-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'}
            ${canUpload ? 'border-slate-300 dark:border-slate-600' : 'border-slate-200 dark:border-slate-700'}
          `}
          data-testid="dropzone-upload"
        >
          <input {...getInputProps()} />
          
          <div className="space-y-4">
            {uploadMutation.isPending ? (
              <>
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto" />
                <p className="text-blue-600 font-medium">Upload en cours...</p>
              </>
            ) : isDragActive ? (
              isDragReject ? (
                <>
                  <FileX className="w-10 h-10 text-red-600 mx-auto" />
                  <p className="text-red-600 font-medium">Fichiers non supportés</p>
                  <p className="text-sm text-muted-foreground">
                    Seuls les fichiers PDF sont acceptés
                  </p>
                </>
              ) : (
                <>
                  <FileType className="w-10 h-10 text-blue-600 mx-auto" />
                  <p className="text-blue-600 font-medium">Déposez vos fichiers ici</p>
                </>
              )
            ) : (
              <>
                <FileText className="w-10 h-10 text-slate-400 mx-auto" />
                <div>
                  <p className="font-medium">
                    {canUpload ? 'Glissez-déposez vos fichiers PDF' : 'Upload désactivé'}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {canUpload ? 'ou cliquez pour sélectionner' : 
                     isExpired ? 'Session expirée' :
                     isSubmitted ? 'Soumission déjà finalisée' : 'Upload indisponible'}
                  </p>
                </div>
                {canUpload && (
                  <Button variant="outline" size="sm" data-testid="button-select-files">
                    Sélectionner des fichiers
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Affichage des erreurs de fichiers rejetés */}
        {fileRejections.length > 0 && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Fichiers rejetés</AlertTitle>
            <AlertDescription>
              <ul className="mt-2 space-y-1">
                {fileRejections.map(({ file, errors }) => (
                  <li key={file.name} className="text-sm">
                    <strong>{file.name}</strong>: {errors.map(e => e.message).join(', ')}
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Progress des uploads en cours */}
        {uploadProgress.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Upload en cours</h4>
            {uploadProgress.map((upload, index) => (
              <div key={index} className="space-y-2" data-testid={`upload-progress-${index}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {upload.status === 'uploading' && (
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    )}
                    {upload.status === 'success' && (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    )}
                    {upload.status === 'error' && (
                      <XCircle className="w-4 h-4 text-red-600" />
                    )}
                    <span className="text-sm font-medium">{upload.file.name}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge 
                      variant={
                        upload.status === 'success' ? 'default' : 
                        upload.status === 'error' ? 'destructive' : 'secondary'
                      }
                    >
                      {upload.status === 'uploading' && `${upload.progress}%`}
                      {upload.status === 'success' && 'Terminé'}
                      {upload.status === 'error' && 'Erreur'}
                    </Badge>
                    {/* CORRECTIF RESILIENCE: Bouton retry pour récupération utilisateur */}
                    {upload.status === 'error' && canUpload && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          // Supprimer le fichier en erreur et relancer
                          setUploadProgress(prev => prev.filter((_, i) => i !== index));
                          uploadMutation.mutate([upload.file]);
                        }}
                        data-testid={`button-retry-${index}`}
                        disabled={uploadMutation.isPending}
                      >
                        <RotateCcw className="w-3 h-3 mr-1" />
                        Réessayer
                      </Button>
                    )}
                  </div>
                </div>
                
                {upload.status === 'uploading' && (
                  <Progress value={upload.progress} className="h-2" />
                )}
                
                {upload.status === 'error' && upload.error && (
                  <Alert variant="destructive" className="mt-2">
                    <XCircle className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      <strong>Erreur:</strong> {upload.error}
                      <br />
                      <span className="text-xs opacity-80">
                        Vous pouvez réessayer l'upload de ce fichier avec le bouton ci-dessus.
                      </span>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Instructions */}
        <div className="text-sm text-muted-foreground space-y-2">
          <p><strong>Formats acceptés :</strong> PDF uniquement</p>
          <p><strong>Taille maximum :</strong> 10MB par fichier</p>
          <p><strong>Documents recommandés :</strong></p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Devis détaillé (obligatoire)</li>
            <li>Fiches techniques</li>
            <li>Certifications</li>
            <li>Planning prévisionnel</li>
          </ul>
        </div>

        {/* Statut de session */}
        {!canUpload && (
          <Alert variant={isExpired ? "destructive" : "default"}>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>
              {isExpired ? "Session expirée" : isSubmitted ? "Soumission finalisée" : "Upload indisponible"}
            </AlertTitle>
            <AlertDescription>
              {isExpired && "Votre session d'accès a expiré. Contactez l'équipe JLM pour un nouveau lien."}
              {isSubmitted && "Votre soumission a été finalisée. Vous ne pouvez plus ajouter de documents."}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}