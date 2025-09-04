import { useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, Plus, FileText, CheckCircle, AlertCircle, X, Eye } from "lucide-react";

interface UploadProgress {
  fileName: string;
  progress: number;
  status: 'uploading' | 'success' | 'error';
}

interface DocumentUploadZoneProps {
  folderName: string;
  onFileUpload: (file: File, folderName: string) => Promise<void>;
  uploadProgress: Record<string, UploadProgress>;
  isUploading: boolean;
  documents: any[];
}

export function DocumentUploadZone({ 
  folderName, 
  onFileUpload, 
  uploadProgress, 
  isUploading,
  documents = []
}: DocumentUploadZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files) return;
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        await onFileUpload(file, folderName);
      } catch (error) {
        console.error(`Error uploading ${file.name}:`, error);
      }
    }
  }, [folderName, onFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const handleClickUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
    e.target.value = ''; // Reset pour permettre la sélection du même fichier
  }, [handleFileSelect]);

  // Filtrer les progrès d'upload pour ce dossier
  const currentFolderProgress = Object.entries(uploadProgress).filter(([key]) => 
    key.startsWith(folderName)
  );

  return (
    <div className="space-y-4">
      {/* Zone de drop/upload */}
      <div 
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer ${
          isDragOver 
            ? 'border-primary bg-primary/5' 
            : isUploading 
              ? 'border-gray-200 bg-gray-50' 
              : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={!isUploading ? handleClickUpload : undefined}
      >
        <Upload className={`h-8 w-8 mx-auto mb-2 ${
          isDragOver ? 'text-primary' : 'text-gray-400'
        }`} />
        <p className={`text-sm font-medium ${
          isDragOver ? 'text-primary' : 'text-gray-600'
        }`}>
          {isDragOver ? 'Relâchez pour uploader' : 'Glissez-déposez vos fichiers ici'}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          ou cliquez pour sélectionner
        </p>
        <Button 
          variant="outline" 
          size="sm" 
          className="mt-3"
          disabled={isUploading}
          onClick={(e) => {
            e.stopPropagation();
            handleClickUpload();
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Ajouter des fichiers
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileInputChange}
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.xls,.xlsx,.dwg"
      />

      {/* Progrès d'upload */}
      {currentFolderProgress.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium text-gray-700">Upload en cours</div>
          {currentFolderProgress.map(([key, progress]) => (
            <div key={key} className="bg-white border rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium truncate">{progress.fileName}</span>
                </div>
                <div className="flex items-center gap-2">
                  {progress.status === 'success' && (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                  {progress.status === 'error' && (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span className="text-xs text-gray-500">{progress.progress}%</span>
                </div>
              </div>
              <Progress value={progress.progress} className="h-2" />
            </div>
          ))}
        </div>
      )}

      {/* Liste des documents existants */}
      <div className="space-y-2">
        <div className="text-sm font-medium text-gray-700 mb-2">
          Fichiers ({documents.length})
        </div>
        {documents.length === 0 ? (
          <div className="text-center py-4 text-gray-500 text-sm">
            Aucun document dans cette section
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map((doc: any, index) => (
              <div key={index} className="flex items-center justify-between bg-white border rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-gray-500" />
                  <div>
                    <div className="text-sm font-medium">{doc.fileName}</div>
                    <div className="text-xs text-gray-500">
                      Uploadé le {new Date(doc.uploadedAt).toLocaleDateString('fr-FR')}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}