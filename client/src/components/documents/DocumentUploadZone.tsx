import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAoDocumentUpload } from '@/hooks/use-ao-document-upload';
import { cn } from '@/lib/utils';

interface UploadingFile {
  file: File;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  errorMessage?: string;
}

interface DocumentUploadZoneProps {
  aoId: string;
  onUploadComplete?: () => void;
}

const DOCUMENT_CATEGORIES = [
  { value: '01-DCE-Cotes-Photos', label: 'DCE, Côtes & Photos' },
  { value: '02-Etudes-fournisseurs', label: 'Études Fournisseurs' },
  { value: '03-Devis-pieces-administratives', label: 'Devis & Pièces Admin' },
] as const;

/**
 * Zone de drag & drop pour uploader des documents vers OneDrive
 */
export function DocumentUploadZone({ aoId, onUploadComplete }: DocumentUploadZoneProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>(DOCUMENT_CATEGORIES[0].value);
  const [uploadingFiles, setUploadingFiles] = useState<Map<string, UploadingFile>>(new Map());
  const { upload } = useAoDocumentUpload();

  const handleDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!selectedCategory) {
      return;
    }

    // Initialiser les fichiers en cours d'upload
    const newUploadingFiles = new Map(uploadingFiles);
    for (const file of acceptedFiles) {
      newUploadingFiles.set(file.name, {
        file,
        progress: 0,
        status: 'uploading',
      });
    }
    setUploadingFiles(newUploadingFiles);

    // Uploader chaque fichier
    for (const file of acceptedFiles) {
      try {
        await upload({
          aoId,
          file,
          folderName: selectedCategory,
          onProgress: (progress) => {
            setUploadingFiles(prev => {
              const updated = new Map(prev);
              const fileState = updated.get(file.name);
              if (fileState) {
                updated.set(file.name, {
                  ...fileState,
                  progress: Math.round(progress),
                });
              }
              return updated;
            });
          },
        });

        // Marquer comme succès
        setUploadingFiles(prev => {
          const updated = new Map(prev);
          const fileState = updated.get(file.name);
          if (fileState) {
            updated.set(file.name, {
              ...fileState,
              status: 'success',
              progress: 100,
            });
          }
          return updated;
        });

        // Retirer après 2 secondes
        setTimeout(() => {
          setUploadingFiles(prev => {
            const updated = new Map(prev);
            updated.delete(file.name);
            return updated;
          });
        }, 2000);

        onUploadComplete?.();
      } catch (error) {
        // Marquer comme erreur
        setUploadingFiles(prev => {
          const updated = new Map(prev);
          const fileState = updated.get(file.name);
          if (fileState) {
            updated.set(file.name, {
              ...fileState,
              status: 'error',
              errorMessage: error instanceof Error ? error.message : 'Erreur inconnue',
            });
          }
          return updated;
        });
      }
    }
  }, [aoId, selectedCategory, upload, uploadingFiles, onUploadComplete]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleDrop,
    maxSize: 50 * 1024 * 1024, // 50MB
    multiple: true,
  });

  const removeFile = (fileName: string) => {
    setUploadingFiles(prev => {
      const updated = new Map(prev);
      updated.delete(fileName);
      return updated;
    });
  };

  return (
    <div className="space-y-4">
      {/* Sélection de catégorie */}
      <div className="flex items-center gap-3">
        <label htmlFor="category-select" className="text-sm font-medium whitespace-nowrap">
          Catégorie :
        </label>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger id="category-select" className="w-full" data-testid="select-document-category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DOCUMENT_CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Zone de drop */}
      <Card>
        <CardContent className="p-0">
          <div
            {...getRootProps()}
            className={cn(
              'border-2 border-dashed rounded-lg p-8 transition-colors cursor-pointer',
              'hover:border-primary/50 hover:bg-accent/50',
              isDragActive && 'border-primary bg-primary/5',
              !selectedCategory && 'opacity-50 cursor-not-allowed'
            )}
            data-testid="dropzone-upload"
          >
            <input {...getInputProps()} disabled={!selectedCategory} />
            <div className="flex flex-col items-center justify-center text-center gap-2">
              <Upload className="w-10 h-10 text-muted-foreground" />
              <div className="text-sm">
                {isDragActive ? (
                  <p className="font-medium text-primary">Déposez les fichiers ici...</p>
                ) : (
                  <>
                    <p className="font-medium">
                      Glissez-déposez vos fichiers ici ou cliquez pour parcourir
                    </p>
                    <p className="text-muted-foreground mt-1">
                      Maximum 50 MB par fichier
                    </p>
                  </>
                )}
              </div>
              {!selectedCategory && (
                <p className="text-sm text-destructive mt-2">
                  Veuillez sélectionner une catégorie
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liste des fichiers en cours d'upload */}
      {uploadingFiles.size > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Fichiers en cours</h4>
          {Array.from(uploadingFiles.entries()).map(([fileName, fileState]) => (
            <Card key={fileName}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <File className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{fileName}</p>
                    {fileState.status === 'uploading' && (
                      <Progress value={fileState.progress} className="mt-2 h-1" />
                    )}
                    {fileState.status === 'error' && fileState.errorMessage && (
                      <p className="text-xs text-destructive mt-1">{fileState.errorMessage}</p>
                    )}
                  </div>

                  <div className="flex-shrink-0">
                    {fileState.status === 'uploading' && (
                      <span className="text-xs text-muted-foreground">{fileState.progress}%</span>
                    )}
                    {fileState.status === 'success' && (
                      <CheckCircle2 className="w-5 h-5 text-green-600" data-testid={`icon-success-${fileName}`} />
                    )}
                    {fileState.status === 'error' && (
                      <AlertCircle className="w-5 h-5 text-destructive" data-testid={`icon-error-${fileName}`} />
                    )}
                  </div>

                  {fileState.status === 'error' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(fileName)}
                      data-testid={`button-remove-${fileName}`}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
