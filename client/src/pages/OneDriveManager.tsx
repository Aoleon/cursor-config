import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { 
  FolderIcon, 
  FileIcon, 
  UploadIcon, 
  DownloadIcon, 
  SearchIcon,
  FolderPlusIcon,
  ShareIcon,
  RefreshCwIcon,
  HomeIcon,
  ChevronRightIcon
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface OneDriveItem {
  id: string;
  name: string;
  size?: number;
  mimeType?: string;
  webUrl: string;
  createdDateTime: string;
  lastModifiedDateTime: string;
  isFolder?: boolean;
  itemCount?: number;
}

export default function OneDriveManager() {
  const [currentPath, setCurrentPath] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Récupérer les informations du drive
  const { data: driveInfo, isLoading: isLoadingDrive } = useQuery({
    queryKey: ['/api/onedrive/info']
  });

  // Lister les fichiers du chemin actuel
  const { data: itemsData, isLoading: isLoadingItems, refetch: refetchItems } = useQuery({
    queryKey: ['/api/onedrive/list', currentPath],
    queryFn: async () => {
      const response = await fetch(`/api/onedrive/list?path=${encodeURIComponent(currentPath)}`);
      if (!response.ok) throw new Error('Failed to fetch items');
      return response.json();
    }
  });

  // Recherche
  const { data: searchResults, refetch: performSearch } = useQuery({
    queryKey: ['/api/onedrive/search', searchQuery],
    queryFn: async () => {
      if (!searchQuery) return null;
      const response = await fetch(`/api/onedrive/search?q=${encodeURIComponent(searchQuery)}`);
      if (!response.ok) throw new Error('Search failed');
      return response.json();
    },
    enabled: false
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('path', currentPath);
      formData.append('conflictBehavior', 'rename');

      return apiRequest('/api/onedrive/upload', {
        method: 'POST',
        body: formData,
        headers: {} // Let browser set Content-Type with boundary
      });
    },
    onSuccess: () => {
      toast({
        title: 'Fichier uploadé',
        description: 'Le fichier a été uploadé avec succès sur OneDrive'
      });
      queryClient.invalidateQueries({ queryKey: ['/api/onedrive/list', currentPath] });
      setSelectedFile(null);
      setShowUpload(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur d\'upload',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Create folder mutation
  const createFolderMutation = useMutation({
    mutationFn: async (folderName: string) => {
      return apiRequest('/api/onedrive/folder', {
        method: 'POST',
        body: JSON.stringify({
          name: folderName,
          parentPath: currentPath
        })
      });
    },
    onSuccess: () => {
      toast({
        title: 'Dossier créé',
        description: 'Le dossier a été créé avec succès'
      });
      queryClient.invalidateQueries({ queryKey: ['/api/onedrive/list', currentPath] });
      setNewFolderName('');
      setShowCreateFolder(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur de création',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Download file
  const handleDownload = async (item: OneDriveItem) => {
    try {
      const response = await fetch(`/api/onedrive/download/${item.id}`);
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = item.name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'Téléchargement réussi',
        description: `${item.name} a été téléchargé`
      });
    } catch (error) {
      toast({
        title: 'Erreur de téléchargement',
        description: (error as Error).message,
        variant: 'destructive'
      });
    }
  };

  // Navigate to folder
  const navigateToFolder = (folderName: string) => {
    const newPath = currentPath ? `${currentPath}/${folderName}` : folderName;
    setCurrentPath(newPath);
  };

  // Go back
  const navigateBack = () => {
    const pathParts = currentPath.split('/');
    pathParts.pop();
    setCurrentPath(pathParts.join('/'));
  };

  // Format file size
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  const items = itemsData?.data?.items || [];
  const displayItems = searchQuery && searchResults?.data?.files ? searchResults.data.files : items;

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Gestionnaire OneDrive</h1>
          <p className="text-muted-foreground">
            Gérez vos documents OneDrive directement depuis Saxium
          </p>
        </div>

        {/* Drive Info */}
        {driveInfo?.data && (
          <Card>
            <CardHeader>
              <CardTitle>Informations du Drive</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Propriétaire</p>
                  <p className="font-medium">{driveInfo.data.owner || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Espace utilisé</p>
                  <p className="font-medium">
                    {formatFileSize(driveInfo.data.quota?.used)} / {formatFileSize(driveInfo.data.quota?.total)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Espace disponible</p>
                  <p className="font-medium">{formatFileSize(driveInfo.data.quota?.remaining)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Toolbar */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 flex gap-2">
                <Input
                  placeholder="Rechercher des fichiers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  data-testid="input-search-onedrive"
                />
                <Button
                  onClick={() => performSearch()}
                  disabled={!searchQuery}
                  data-testid="button-search"
                >
                  <SearchIcon className="w-4 h-4" />
                </Button>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Dialog open={showCreateFolder} onOpenChange={setShowCreateFolder}>
                  <DialogTrigger asChild>
                    <Button variant="outline" data-testid="button-create-folder">
                      <FolderPlusIcon className="w-4 h-4 mr-2" />
                      Nouveau dossier
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Créer un nouveau dossier</DialogTitle>
                      <DialogDescription>
                        Le dossier sera créé dans : {currentPath || 'Racine'}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="folder-name">Nom du dossier</Label>
                        <Input
                          id="folder-name"
                          value={newFolderName}
                          onChange={(e) => setNewFolderName(e.target.value)}
                          placeholder="Mon Dossier"
                          data-testid="input-folder-name"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        onClick={() => createFolderMutation.mutate(newFolderName)}
                        disabled={!newFolderName || createFolderMutation.isPending}
                        data-testid="button-confirm-create-folder"
                      >
                        {createFolderMutation.isPending ? 'Création...' : 'Créer'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog open={showUpload} onOpenChange={setShowUpload}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-upload">
                      <UploadIcon className="w-4 h-4 mr-2" />
                      Upload
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Upload un fichier</DialogTitle>
                      <DialogDescription>
                        Le fichier sera uploadé dans : {currentPath || 'Racine'}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="file-upload">Fichier</Label>
                        <Input
                          id="file-upload"
                          type="file"
                          onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                          data-testid="input-file-upload"
                        />
                        {selectedFile && (
                          <p className="text-sm text-muted-foreground">
                            {selectedFile.name} ({formatFileSize(selectedFile.size)})
                          </p>
                        )}
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        onClick={() => selectedFile && uploadMutation.mutate(selectedFile)}
                        disabled={!selectedFile || uploadMutation.isPending}
                        data-testid="button-confirm-upload"
                      >
                        {uploadMutation.isPending ? 'Upload en cours...' : 'Upload'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Button
                  variant="outline"
                  onClick={() => refetchItems()}
                  data-testid="button-refresh"
                >
                  <RefreshCwIcon className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Breadcrumb Navigation */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentPath('')}
                data-testid="button-home"
              >
                <HomeIcon className="w-4 h-4 mr-1" />
                Racine
              </Button>
              
              {currentPath && currentPath.split('/').map((part, index, array) => (
                <div key={index} className="flex items-center gap-2">
                  <ChevronRightIcon className="w-4 h-4 text-muted-foreground" />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentPath(array.slice(0, index + 1).join('/'))}
                    data-testid={`button-breadcrumb-${index}`}
                  >
                    {part}
                  </Button>
                </div>
              ))}

              {currentPath && (
                <>
                  <Separator orientation="vertical" className="h-4 mx-2" />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={navigateBack}
                    data-testid="button-back"
                  >
                    Retour
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* File List */}
        <Card>
          <CardHeader>
            <CardTitle>
              {searchQuery ? 'Résultats de recherche' : 'Fichiers et Dossiers'}
            </CardTitle>
            <CardDescription>
              {displayItems.length} élément(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingItems ? (
              <div className="text-center py-8">Chargement...</div>
            ) : displayItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? 'Aucun résultat trouvé' : 'Ce dossier est vide'}
              </div>
            ) : (
              <div className="space-y-2">
                {displayItems.map((item: OneDriveItem) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors"
                    data-testid={`item-${item.id}`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {item.isFolder || item.itemCount !== undefined ? (
                        <FolderIcon className="w-5 h-5 text-blue-500 flex-shrink-0" />
                      ) : (
                        <FileIcon className="w-5 h-5 text-gray-500 flex-shrink-0" />
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <button
                          onClick={() => {
                            if (item.isFolder || item.itemCount !== undefined) {
                              navigateToFolder(item.name);
                            }
                          }}
                          className="text-left font-medium truncate hover:underline"
                          data-testid={`link-${item.name}`}
                        >
                          {item.name}
                        </button>
                        <div className="flex gap-2 text-xs text-muted-foreground mt-1">
                          {item.size !== undefined && (
                            <span>{formatFileSize(item.size)}</span>
                          )}
                          {item.itemCount !== undefined && (
                            <Badge variant="secondary">{item.itemCount} élément(s)</Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {!item.isFolder && item.itemCount === undefined && (
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownload(item)}
                          data-testid={`button-download-${item.id}`}
                        >
                          <DownloadIcon className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(item.webUrl, '_blank')}
                          data-testid={`button-open-${item.id}`}
                        >
                          <ShareIcon className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
