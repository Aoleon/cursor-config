import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  FileText, Upload, Search, Eye, Download, 
  FolderOpen, FileImage, FileSpreadsheet, File,
  Calendar, User, Filter, Grid, MoreHorizontal
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CompactDocument {
  id: string;
  name: string;
  originalName: string;
  category: string;
  fileSize: number;
  mimeType?: string;
  uploadedAt: string;
  uploadedBy?: string;
  downloadCount?: number;
  viewCount?: number;
  folderName?: string;
}

interface CompactDocumentViewProps {
  documents: Record<string, CompactDocument[]>;
  onFileUpload: (files: FileList, folderName: string) => void;
  onView?: (document: CompactDocument) => void;
  onDownload?: (document: CompactDocument) => void;
  uploadProgress?: number;
  isUploading?: boolean;
  className?: string;
}

const FOLDER_CONFIG = {
  '01-DCE-Cotes-Photos': {
    label: 'DCE & Photos',
    icon: FileImage,
    color: 'bg-primary/10 text-primary border-primary/20',
    shortLabel: 'DCE'
  },
  '02-Etudes-fournisseurs': {
    label: 'Études fournisseurs',
    icon: User,
    color: 'bg-success/10 text-success border-success/20',
    shortLabel: 'Études'
  },
  '03-Devis-pieces-administratives': {
    label: 'Devis & Admin',
    icon: FileSpreadsheet,
    color: 'bg-secondary/20 text-secondary-foreground border-secondary/30',
    shortLabel: 'Devis'
  }
} as const;

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const getFileIcon = (mimeType?: string) => {
  if (!mimeType) return File;
  if (mimeType.startsWith('image/')) return FileImage;
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return FileSpreadsheet;
  return FileText;
};

export function CompactDocumentView({
  documents,
  onFileUpload,
  onView,
  onDownload,
  uploadProgress = 0,
  isUploading = false,
  className
}: CompactDocumentViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');

  // Statistiques globales
  const stats = useMemo(() => {
    const allDocs = Object.values(documents).flat();
    const totalSize = allDocs.reduce((sum, doc) => sum + doc.fileSize, 0);
    const folderCounts = Object.entries(documents).reduce((acc, [folder, docs]) => {
      acc[folder] = docs.length;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: allDocs.length,
      totalSize,
      folderCounts,
      recentUploads: allDocs
        .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
        .slice(0, 3)
    };
  }, [documents]);

  // Documents filtrés
  const filteredDocuments = useMemo(() => {
    const allDocs = Object.entries(documents).flatMap(([folder, docs]) => 
      docs.map(doc => ({ ...doc, folderName: folder }))
    );

    return allDocs.filter(doc => {
      const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          doc.originalName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFolder = selectedFolder === 'all' || doc.folderName === selectedFolder;
      
      return matchesSearch && matchesFolder;
    });
  }, [documents, searchTerm, selectedFolder]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>, folderName: string) => {
    const files = event.target.files;
    if (files) {
      onFileUpload(files, folderName);
    }
    // Reset input
    event.target.value = '';
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Résumé global compact */}
      <div className="bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{stats.total}</div>
              <div className="text-xs text-primary">documents</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-on-surface">{formatFileSize(stats.totalSize)}</div>
              <div className="text-xs text-muted-foreground">taille totale</div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {Object.entries(FOLDER_CONFIG).map(([folderKey, config]) => {
              const count = stats.folderCounts[folderKey] || 0;
              const Icon = config.icon;
              return (
                <div key={folderKey} className={cn('px-3 py-2 rounded-lg border text-sm font-medium', config.color)}>
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{config.shortLabel}</span>
                    <span className="font-bold">{count}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Barre d'outils compacte */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-surface-muted rounded-lg">
        <div className="flex-1 min-w-48">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher des documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-9"
            />
          </div>
        </div>
        
        <Select value={selectedFolder} onValueChange={setSelectedFolder}>
          <SelectTrigger className="w-40 h-9">
            <SelectValue placeholder="Tous les dossiers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les dossiers</SelectItem>
            {Object.entries(FOLDER_CONFIG).map(([folderKey, config]) => (
              <SelectItem key={folderKey} value={folderKey}>
                {config.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center border rounded-lg">
          <Button
            variant={viewMode === 'table' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('table')}
            className="rounded-r-none h-9"
          >
            <Filter className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'grid' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('grid')}
            className="rounded-l-none h-9"
          >
            <Grid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Actions rapides d'upload */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {Object.entries(FOLDER_CONFIG).map(([folderKey, config]) => {
          const Icon = config.icon;
          return (
            <div key={folderKey} className={cn('border-2 border-dashed rounded-lg p-3 transition-colors hover:bg-surface-muted', config.color)}>
              <label htmlFor={`upload-${folderKey}`} className="cursor-pointer block">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <span className="text-sm font-medium">{config.shortLabel}</span>
                    <Badge variant="secondary" className="text-xs">
                      {stats.folderCounts[folderKey] || 0}
                    </Badge>
                  </div>
                  <Upload className="h-4 w-4" />
                </div>
                <input
                  id={`upload-${folderKey}`}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFileUpload(e, folderKey)}
                  disabled={isUploading}
                />
              </label>
            </div>
          );
        })}
      </div>

      {/* Barre de progression d'upload */}
      {isUploading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-900">Upload en cours...</span>
            <span className="text-sm text-blue-700">{uploadProgress}%</span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Liste des documents */}
      {viewMode === 'table' ? (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr className="text-left">
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Document</th>
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Dossier</th>
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Taille</th>
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Ajouté</th>
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredDocuments.map((doc) => {
                    const FileIcon = getFileIcon(doc.mimeType);
                    const folderConfig = FOLDER_CONFIG[doc.folderName as keyof typeof FOLDER_CONFIG];
                    
                    return (
                      <tr key={doc.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <FileIcon className="h-5 w-5 text-muted-foreground" />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-on-surface truncate">
                                {doc.originalName}
                              </p>
                              {doc.name !== doc.originalName && (
                                <p className="text-xs text-muted-foreground truncate">{doc.name}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {folderConfig && (
                            <Badge className={cn('text-xs', folderConfig.color)}>
                              {folderConfig.shortLabel}
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {formatFileSize(doc.fileSize)}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {new Date(doc.uploadedAt).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: '2-digit'
                          })}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            {onView && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onView(doc)}
                                className="h-8 w-8 p-0"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            )}
                            {onDownload && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onDownload(doc)}
                                className="h-8 w-8 p-0"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              
              {filteredDocuments.length === 0 && (
                <div className="text-center py-8">
                  <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">
                    {searchTerm || selectedFolder !== 'all' 
                      ? 'Aucun document ne correspond aux critères de recherche' 
                      : 'Aucun document uploadé pour le moment'
                    }
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        // Vue grille compacte
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredDocuments.map((doc) => {
            const FileIcon = getFileIcon(doc.mimeType);
            const folderConfig = FOLDER_CONFIG[doc.folderName as keyof typeof FOLDER_CONFIG];
            
            return (
              <Card key={doc.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between mb-2">
                    <FileIcon className="h-8 w-8 text-muted-foreground" />
                    <div className="flex items-center gap-1">
                      {onView && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onView(doc)}
                          className="h-6 w-6 p-0"
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                      )}
                      {onDownload && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDownload(doc)}
                          className="h-6 w-6 p-0"
                        >
                          <Download className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  <h4 className="text-sm font-medium text-on-surface mb-1 line-clamp-2">
                    {doc.originalName}
                  </h4>
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{formatFileSize(doc.fileSize)}</span>
                    {folderConfig && (
                      <Badge className={cn('text-xs', folderConfig.color)}>
                        {folderConfig.shortLabel}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="text-xs text-muted-foreground mt-1">
                    {new Date(doc.uploadedAt).toLocaleDateString('fr-FR')}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          
          {filteredDocuments.length === 0 && (
            <div className="col-span-full text-center py-8">
              <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">
                {searchTerm || selectedFolder !== 'all' 
                  ? 'Aucun document ne correspond aux critères de recherche' 
                  : 'Aucun document uploadé pour le moment'
                }
              </p>
            </div>
          )}
        </div>
      )}

      {/* Documents récents en bas */}
      {stats.recentUploads.length > 0 && !searchTerm && selectedFolder === 'all' && (
        <Card>
          <CardContent className="p-4">
            <h4 className="text-sm font-medium text-on-surface mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Derniers ajouts
            </h4>
            <div className="space-y-2">
              {stats.recentUploads.map((doc) => {
                const FileIcon = getFileIcon(doc.mimeType);
                return (
                  <div key={doc.id} className="flex items-center gap-3 text-sm">
                    <FileIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1 truncate">{doc.originalName}</span>
                    <span className="text-muted-foreground text-xs">
                      {new Date(doc.uploadedAt).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}