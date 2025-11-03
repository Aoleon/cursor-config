import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

export interface UploadDocumentOptions {
  aoId: string;
  file: File;
  folderName: string;
  onProgress?: (progress: number) => void;
}

export interface OneDriveUploadResponse {
  documentId: string;
  oneDriveId: string;
  webUrl: string;
  fileName: string;
}

/**
 * Hook pour gérer l'upload de documents vers OneDrive depuis un AO
 * Utilise l'endpoint multipart /api/aos/:aoId/documents/upload-direct
 */
export function useAoDocumentUpload() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const uploadMutation = useMutation<OneDriveUploadResponse, Error, UploadDocumentOptions>({
    mutationFn: async ({ aoId, file, folderName, onProgress }: UploadDocumentOptions) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folderName', folderName);
      formData.append('fileName', file.name);

      // Utiliser XMLHttpRequest pour suivre la progression
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

        xhr.addEventListener('error', () => {
          reject(new Error('Erreur réseau lors de l\'upload'));
        });

        xhr.addEventListener('abort', () => {
          reject(new Error('Upload annulé'));
        });

        xhr.open('POST', `/api/aos/${aoId}/documents/upload-direct`);
        xhr.send(formData);
      });
    },
    onSuccess: (data, variables) => {
      // Invalider le cache des documents de l'AO
      queryClient.invalidateQueries({ queryKey: ['/api/aos', variables.aoId, 'documents'] });
      
      toast({
        title: 'Document uploadé',
        description: `${variables.file.name} a été uploadé sur OneDrive`,
      });
    },
    onError: (error, variables) => {
      toast({
        title: 'Erreur upload',
        description: error.message || 'Impossible d\'uploader le document',
        variant: 'destructive',
      });
    }
  });

  return {
    upload: uploadMutation.mutateAsync,
    isUploading: uploadMutation.isPending,
    error: uploadMutation.error,
    reset: uploadMutation.reset,
  };
}
