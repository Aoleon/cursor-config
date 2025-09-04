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

  // Mutation pour obtenir l'URL d'upload
  const getUploadUrlMutation = useMutation({
    mutationFn: async ({ folderName, fileName }: { folderName: string; fileName: string }) => {
      const response = await fetch(`/api/aos/${aoId}/documents/upload-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderName, fileName }),
      });
      if (!response.ok) throw new Error('Failed to get upload URL');
      return response.json();
    },
  });

  // Mutation pour confirmer l'upload
  const confirmUploadMutation = useMutation({
    mutationFn: async (data: { folderName: string; fileName: string; fileSize: number; uploadedUrl: string }) => {
      const response = await fetch(`/api/aos/${aoId}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to confirm upload');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/aos/${aoId}/documents`] });
    },
  });

  // Fonction pour uploader un fichier
  const uploadFile = async (file: File, folderName: string) => {
    const uploadId = `${folderName}-${file.name}-${Date.now()}`;
    
    try {
      // Initialiser le progrès
      setUploadProgress(prev => ({
        ...prev,
        [uploadId]: { fileName: file.name, progress: 0, status: 'uploading' }
      }));

      // 1. Obtenir l'URL d'upload
      const { uploadUrl } = await getUploadUrlMutation.mutateAsync({
        folderName,
        fileName: file.name,
      });

      // 2. Uploader le fichier
      const xhr = new XMLHttpRequest();
      
      return new Promise<void>((resolve, reject) => {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(prev => ({
              ...prev,
              [uploadId]: { fileName: file.name, progress, status: 'uploading' }
            }));
          }
        });

        xhr.addEventListener('load', async () => {
          if (xhr.status === 200) {
            try {
              // 3. Confirmer l'upload
              await confirmUploadMutation.mutateAsync({
                folderName,
                fileName: file.name,
                fileSize: file.size,
                uploadedUrl: uploadUrl,
              });

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
                description: `${file.name} a été uploadé avec succès`,
              });

              resolve();
            } catch (error) {
              setUploadProgress(prev => ({
                ...prev,
                [uploadId]: { fileName: file.name, progress: 0, status: 'error' }
              }));
              toast({
                title: "Erreur",
                description: "Erreur lors de la confirmation de l'upload",
                variant: "destructive",
              });
              reject(error);
            }
          } else {
            setUploadProgress(prev => ({
              ...prev,
              [uploadId]: { fileName: file.name, progress: 0, status: 'error' }
            }));
            toast({
              title: "Erreur",
              description: "Erreur lors de l'upload du fichier",
              variant: "destructive",
            });
            reject(new Error('Upload failed'));
          }
        });

        xhr.addEventListener('error', () => {
          setUploadProgress(prev => ({
            ...prev,
            [uploadId]: { fileName: file.name, progress: 0, status: 'error' }
          }));
          toast({
            title: "Erreur",
            description: "Erreur lors de l'upload du fichier",
            variant: "destructive",
          });
          reject(new Error('Upload failed'));
        });

        xhr.open('PUT', uploadUrl);
        xhr.send(file);
      });
    } catch (error) {
      setUploadProgress(prev => ({
        ...prev,
        [uploadId]: { fileName: file.name, progress: 0, status: 'error' }
      }));
      toast({
        title: "Erreur",
        description: "Erreur lors de l'upload",
        variant: "destructive",
      });
      throw error;
    }
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
    isUploading: getUploadUrlMutation.isPending || confirmUploadMutation.isPending,
  };
}