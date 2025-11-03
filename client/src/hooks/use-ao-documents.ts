import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface DocumentFolder {
  name: string;
  documents: DocumentFile[];
}

interface DocumentFile {
  id: string;
  fileName: string;
  fileSize: number;
  uploadedAt: string;
  folderName: string;
}

interface UploadProgress {
  fileName: string;
  progress: number;
  status: 'uploading' | 'success' | 'error';
}

export function useAoDocuments(aoId: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploadProgress, setUploadProgress] = useState<Record<string, UploadProgress>>({});

  // Query pour récupérer les documents
  const { data: documents = {}, isLoading } = useQuery({
    queryKey: [`/api/aos/${aoId}/documents`],
    queryFn: async () => {
      const response = await fetch(`/api/aos/${aoId}/documents`);
      if (!response.ok) throw new Error('Failed to fetch documents');
      return response.json();
    },
    enabled: !!aoId,
  });

  // Mutation pour upload direct multipart (nouveau pattern simplifié)
  const uploadMutation = useMutation({
    mutationFn: async ({ file, folderName, onProgress }: { 
      file: File; 
      folderName: string;
      onProgress?: (progress: number) => void;
    }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folderName', folderName);
      formData.append('fileName', file.name);

      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable && onProgress) {
            const percentComplete = (e.loaded / e.total) * 100;
            onProgress(percentComplete);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              resolve(response);
            } catch (err) {
              reject(new Error('Erreur parsing réponse serveur'));
            }
          } else {
            try {
              const errorResponse = JSON.parse(xhr.responseText);
              reject(new Error(errorResponse.message || `Erreur HTTP ${xhr.status}`));
            } catch {
              reject(new Error(`Erreur HTTP ${xhr.status}`));
            }
          }
        });

        xhr.addEventListener('error', () => reject(new Error('Erreur réseau')));
        xhr.addEventListener('abort', () => reject(new Error('Upload annulé')));

        xhr.open('POST', `/api/aos/${aoId}/documents/upload-direct`);
        xhr.send(formData);
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/aos/${aoId}/documents`] });
    },
  });

  // Fonction pour uploader un fichier (utilise le nouveau pattern upload-direct)
  const uploadFile = async (file: File, folderName: string) => {
    const uploadId = `${folderName}-${file.name}-${Date.now()}`;
    
    try {
      // Initialiser le progrès
      setUploadProgress(prev => ({
        ...prev,
        [uploadId]: { fileName: file.name, progress: 0, status: 'uploading' }
      }));

      // Upload direct multipart vers OneDrive
      await uploadMutation.mutateAsync({
        file,
        folderName,
        onProgress: (progress) => {
          setUploadProgress(prev => ({
            ...prev,
            [uploadId]: { fileName: file.name, progress: Math.round(progress), status: 'uploading' }
          }));
        }
      });

      // Marquer comme succès
      setUploadProgress(prev => ({
        ...prev,
        [uploadId]: { fileName: file.name, progress: 100, status: 'success' }
      }));

      // Supprimer le progrès après 2 secondes
      setTimeout(() => {
        setUploadProgress(prev => {
          const updated = { ...prev };
          delete updated[uploadId];
          return updated;
        });
      }, 2000);

      toast({
        title: "Succès",
        description: `${file.name} a été uploadé avec succès sur OneDrive`,
      });
    } catch (error) {
      setUploadProgress(prev => ({
        ...prev,
        [uploadId]: { fileName: file.name, progress: 0, status: 'error' }
      }));
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Erreur lors de l'upload",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Mutation pour synchronisation manuelle OneDrive → DB
  const syncMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/aos/${aoId}/documents/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      const data = await response.json();
      
      // Gérer les erreurs HTTP (409 = sync en cours, 500 = erreur serveur)
      if (!response.ok) {
        throw new Error(data.message || 'Erreur lors de la synchronisation');
      }
      
      // Vérifier success dans la réponse (même en HTTP 200)
      if (!data.success) {
        throw new Error(data.message || data.errors?.join(', ') || 'Synchronisation échouée');
      }
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/aos/${aoId}/documents`] });
      toast({
        title: "Synchronisation terminée",
        description: `${data.documentsAdded} ajoutés, ${data.documentsUpdated} mis à jour, ${data.documentsDeleted} supprimés`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur de synchronisation",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Fonction pour lancer la synchronisation manuelle
  const syncDocuments = () => {
    syncMutation.mutate();
  };

  // Calculer les statistiques
  const stats = {
    total: Object.values(documents).reduce((acc: number, folder: any) => acc + folder.length, 0),
    'dce-photos': documents['01-DCE-Cotes-Photos']?.length || 0,
    'etudes': documents['02-Etudes-fournisseurs']?.length || 0,
    'devis-admin': documents['03-Devis-pieces-administratives']?.length || 0,
  };

  return {
    documents,
    isLoading,
    uploadFile,
    uploadProgress,
    stats,
    isUploading: uploadMutation.isPending,
    syncDocuments,
    isSyncing: syncMutation.isPending,
  };
}