import { useState } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Folder } from "lucide-react";

interface ObjectUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  acceptedFileTypes?: string[];
  onGetUploadParameters: () => Promise<{
    method: "PUT";
    url: string;
  }>;
  onComplete?: (result: { successful: Array<{ uploadURL: string; name: string; size: number }> }) => void;
  buttonClassName?: string;
  children: ReactNode;
}

/**
 * A file upload component that renders as a button and provides file upload functionality
 * for ZIP/PDF files and documents related to offer creation.
 * 
 * Features:
 * - Renders as a customizable button that opens a file picker
 * - Supports ZIP/PDF file types for DCE import
 * - Handles direct upload to object storage via presigned URLs
 * 
 * @param props - Component props
 * @param props.maxNumberOfFiles - Maximum number of files allowed to be uploaded
 *   (default: 1)
 * @param props.maxFileSize - Maximum file size in bytes (default: 50MB)
 * @param props.acceptedFileTypes - Accepted file types (default: .zip,.pdf)
 * @param props.onGetUploadParameters - Function to get upload parameters (method and URL).
 *   Typically used to fetch a presigned URL from the backend server for direct-to-storage
 *   uploads.
 * @param props.onComplete - Callback function called when upload is complete. Typically
 *   used to make post-upload API calls to update server state and set object ACL
 *   policies.
 * @param props.buttonClassName - Optional CSS class name for the button
 * @param props.children - Content to be rendered inside the button
 */
export function ObjectUploader({
  maxNumberOfFiles = 1,
  maxFileSize = 50 * 1024 * 1024, // 50MB default
  acceptedFileTypes = ['.zip', '.pdf'],
  onGetUploadParameters,
  onComplete,
  buttonClassName,
  children,
}: ObjectUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0]; // Single file for now
    
    // Validate file size
    if (file.size > maxFileSize) {
      alert(`Le fichier est trop volumineux. Taille maximum : ${Math.round(maxFileSize / 1024 / 1024)}MB`);
      return;
    }

    // Validate file type
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!acceptedFileTypes.includes(fileExtension)) {
      alert(`Type de fichier non accepté. Types acceptés : ${acceptedFileTypes.join(', ')}`);
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      // Get upload parameters
      const uploadParams = await onGetUploadParameters();
      
      // Upload file using fetch with progress tracking
      const response = await fetch(uploadParams.url, {
        method: uploadParams.method,
        body: file,
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
        },
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      setProgress(100);

      // Call completion callback
      if (onComplete) {
        onComplete({
          successful: [{
            uploadURL: uploadParams.url,
            name: file.name,
            size: file.size
          }]
        });
      }

    } catch (error) {
      console.error('Upload error:', error);
      alert('Erreur lors du téléchargement du fichier');
    } finally {
      setUploading(false);
      setProgress(0);
      // Reset file input
      event.target.value = '';
    }
  };

  return (
    <div>
      <input
        type="file"
        id="file-upload"
        accept={acceptedFileTypes.join(',')}
        onChange={handleFileSelect}
        style={{ display: 'none' }}
        data-testid="file-input-upload"
      />
      
      <Button
        type="button"
        onClick={() => document.getElementById('file-upload')?.click()}
        className={buttonClassName}
        disabled={uploading}
        data-testid="button-file-upload"
      >
        {uploading ? (
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <span>Upload... {progress}%</span>
          </div>
        ) : (
          children
        )}
      </Button>
      
      {uploading && (
        <div className="mt-2 bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}