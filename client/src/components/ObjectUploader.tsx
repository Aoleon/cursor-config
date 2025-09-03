import { useState } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface ObjectUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  acceptedFileTypes?: string[];
  onGetUploadParameters: () => Promise<{
    method: "PUT";
    url: string;
  }>;
  onComplete?: (result: any) => void;
  buttonClassName?: string;
  children: ReactNode;
}

/**
 * A file upload component that renders as a button and provides file upload functionality.
 * 
 * Features:
 * - Renders as a customizable button that allows file selection
 * - Validates file types and sizes
 * - Handles direct upload to object storage
 * - Provides upload progress feedback
 * 
 * @param props - Component props
 * @param props.maxNumberOfFiles - Maximum number of files allowed (default: 1)
 * @param props.maxFileSize - Maximum file size in bytes (default: 10MB)
 * @param props.acceptedFileTypes - Array of accepted file extensions (default: all)
 * @param props.onGetUploadParameters - Function to get upload parameters (method and URL)
 * @param props.onComplete - Callback function called when upload is complete
 * @param props.buttonClassName - Optional CSS class name for the button
 * @param props.children - Content to be rendered inside the button
 */
export function ObjectUploader({
  maxNumberOfFiles = 1,
  maxFileSize = 10485760, // 10MB default
  acceptedFileTypes = [],
  onGetUploadParameters,
  onComplete,
  buttonClassName,
  children,
}: ObjectUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Validate number of files
    if (files.length > maxNumberOfFiles) {
      toast({
        title: "Trop de fichiers",
        description: `Maximum ${maxNumberOfFiles} fichier(s) autorisé(s)`,
        variant: "destructive",
      });
      return;
    }

    const filesToUpload = Array.from(files);
    
    // Validate each file
    for (const file of filesToUpload) {
      // Check file size
      if (file.size > maxFileSize) {
        toast({
          title: "Fichier trop volumineux",
          description: `Le fichier ${file.name} dépasse la taille limite de ${(maxFileSize / 1024 / 1024).toFixed(0)}MB`,
          variant: "destructive",
        });
        return;
      }

      // Check file type if restrictions exist
      if (acceptedFileTypes.length > 0) {
        const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
        if (!acceptedFileTypes.includes(fileExtension)) {
          toast({
            title: "Type de fichier non autorisé",
            description: `Types autorisés : ${acceptedFileTypes.join(', ')}`,
            variant: "destructive",
          });
          return;
        }
      }
    }

    // Start upload process
    setIsUploading(true);
    const successful = [];

    try {
      for (const file of filesToUpload) {
        try {
          // Get upload parameters
          const { url } = await onGetUploadParameters();

          // Upload file directly to object storage
          const uploadResponse = await fetch(url, {
            method: "PUT",
            body: file,
            headers: {
              'Content-Type': file.type || 'application/octet-stream',
            },
          });

          if (!uploadResponse.ok) {
            throw new Error(`Upload failed for ${file.name}`);
          }

          successful.push({
            name: file.name,
            size: file.size,
            uploadURL: url.split('?')[0], // Remove query parameters
            type: file.type,
          });

          toast({
            title: "Fichier téléchargé",
            description: `${file.name} téléchargé avec succès`,
          });
        } catch (error) {
          console.error(`Error uploading ${file.name}:`, error);
          toast({
            title: "Erreur de téléchargement",
            description: `Échec du téléchargement de ${file.name}`,
            variant: "destructive",
          });
        }
      }

      // Call onComplete with results
      if (onComplete && successful.length > 0) {
        onComplete({ successful });
      }

    } finally {
      setIsUploading(false);
      // Reset the input
      event.target.value = '';
    }
  };

  return (
    <div>
      <input
        type="file"
        multiple={maxNumberOfFiles > 1}
        accept={acceptedFileTypes.join(',')}
        onChange={handleFileChange}
        style={{ display: 'none' }}
        id="file-upload-input"
        disabled={isUploading}
      />
      <Button
        onClick={() => document.getElementById('file-upload-input')?.click()}
        disabled={isUploading}
        className={buttonClassName}
        type="button"
      >
        {isUploading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Téléchargement...
          </>
        ) : (
          children
        )}
      </Button>
    </div>
  );
}