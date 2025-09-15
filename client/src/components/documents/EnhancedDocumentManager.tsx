import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  FileText, Upload, Search, Filter, Grid, List, 
  Eye, Download, Link, Tag, Calendar, User,
  FolderOpen, Settings, ChevronDown, ChevronRight,
  FileImage, FileSpreadsheet, File
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Types pour les espaces documentaires
const DOCUMENT_SPACES = [
  { value: 'informations_generales', label: 'Informations générales', icon: FileText, color: 'bg-primary' },
  { value: 'chiffrage', label: 'Chiffrage', icon: FileSpreadsheet, color: 'bg-success' },
  { value: 'etude_technique', label: 'Étude technique', icon: Settings, color: 'bg-accent' },
  { value: 'planification', label: 'Planification', icon: Calendar, color: 'bg-warning' },
  { value: 'chantier', label: 'Chantier', icon: FileImage, color: 'bg-error' },
  { value: 'fournisseurs', label: 'Fournisseurs', icon: User, color: 'bg-warning' },
  { value: 'administratif', label: 'Administratif', icon: FolderOpen, color: 'bg-surface-elevated' },
] as const;

const DOCUMENT_CATEGORIES = [
  { value: 'ao_pdf', label: 'AO PDF', icon: File },
  { value: 'cctp', label: 'CCTP', icon: FileText },
  { value: 'plans', label: 'Plans', icon: FileImage },
  { value: 'devis_client', label: 'Devis client', icon: FileSpreadsheet },
  { value: 'devis_fournisseur', label: 'Devis fournisseur', icon: FileSpreadsheet },
  { value: 'correspondance', label: 'Correspondance', icon: FileText },
  { value: 'autre', label: 'Autre', icon: File },
] as const;

interface DocumentWithLinks {
  id: string;
  name: string;
  originalName: string;
  description?: string;
  category: string;
  fileSize: number;
  mimeType?: string;
  tags: string[];
  uploadedAt: string;
  uploadedBy: string;
  downloadCount: number;
  viewCount: number;
  spaces: string[]; // Espaces où le document apparaît
  isLinkedToCurrent?: boolean; // Si lié à l'entité courante
}

interface EnhancedDocumentManagerProps {
  aoId?: string;
  offerId?: string;
  projectId?: string;
  documents: DocumentWithLinks[];
  onUpload: (files: FileList, spaces: string[], tags: string[]) => void;
  onDownload: (documentId: string) => void;
  onView: (documentId: string) => void;
  onLinkToSpace: (documentId: string, space: string) => void;
  onUnlinkFromSpace: (documentId: string, space: string) => void;
  className?: string;
}

export function EnhancedDocumentManager({
  aoId,
  offerId,
  projectId,
  documents,
  onUpload,
  onDownload,
  onView,
  onLinkToSpace,
  onUnlinkFromSpace,
  className
}: EnhancedDocumentManagerProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpace, setSelectedSpace] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size' | 'views'>('date');
  const [expandedSpaces, setExpandedSpaces] = useState<Set<string>>(new Set(['informations_generales']));
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadSpaces, setUploadSpaces] = useState<string[]>([]);
  const [uploadTags, setUploadTags] = useState<string[]>([]);

  // Filtrage et tri des documents
  const filteredDocuments = useMemo(() => {
    let filtered = documents.filter(doc => {
      const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          doc.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          doc.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesSpace = selectedSpace === 'all' || doc.spaces.includes(selectedSpace);
      const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory;
      
      return matchesSearch && matchesSpace && matchesCategory;
    });

    // Tri
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'date':
          return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
        case 'size':
          return b.fileSize - a.fileSize;
        case 'views':
          return b.viewCount - a.viewCount;
        default:
          return 0;
      }
    });

    return filtered;
  }, [documents, searchTerm, selectedSpace, selectedCategory, sortBy]);

  // Groupement par espaces pour la vue organisée
  const documentsBySpace = useMemo(() => {
    const grouped: Record<string, DocumentWithLinks[]> = {};
    
    DOCUMENT_SPACES.forEach(space => {
      grouped[space.value] = filteredDocuments.filter(doc => 
        doc.spaces.includes(space.value)
      );
    });
    
    return grouped;
  }, [filteredDocuments]);

  const toggleSpaceExpansion = (spaceValue: string) => {
    const newExpanded = new Set(expandedSpaces);
    if (newExpanded.has(spaceValue)) {
      newExpanded.delete(spaceValue);
    } else {
      newExpanded.add(spaceValue);
    }
    setExpandedSpaces(newExpanded);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType?: string) => {
    if (!mimeType) return File;
    if (mimeType.includes('image')) return FileImage;
    if (mimeType.includes('pdf')) return File;
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return FileSpreadsheet;
    return FileText;
  };

  const DocumentCard = ({ doc, compact = false }: { doc: DocumentWithLinks; compact?: boolean }) => {
    const FileIcon = getFileIcon(doc.mimeType);
    const categoryInfo = DOCUMENT_CATEGORIES.find(cat => cat.value === doc.category);

    return (
      <Card className={`hover:shadow-md transition-all duration-200 ${compact ? 'p-3' : ''}`}>
        <CardContent className={`${compact ? 'p-0' : 'p-4'}`}>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <FileIcon className="h-5 w-5 text-primary" />
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-medium text-sm truncate" title={doc.name}>
                    {doc.name}
                  </h4>
                  {doc.description && (
                    <p className="text-xs text-on-surface-muted mt-1 line-clamp-2">
                      {doc.description}
                    </p>
                  )}
                </div>
                
                <div className="flex items-center gap-1 ml-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onView(doc.id)}
                    className="h-8 w-8 p-0"
                    title="Visualiser"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onDownload(doc.id)}
                    className="h-8 w-8 p-0"
                    title="Télécharger"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center gap-2 mt-2">
                {categoryInfo && (
                  <Badge variant="outline" className="text-xs">
                    {categoryInfo.label}
                  </Badge>
                )}
                <span className="text-xs text-on-surface-muted">
                  {formatFileSize(doc.fileSize)}
                </span>
                <span className="text-xs text-on-surface-muted">
                  {doc.viewCount} vues
                </span>
              </div>
              
              {/* Espaces liés */}
              <div className="flex flex-wrap gap-1 mt-2">
                {doc.spaces.map(spaceValue => {
                  const space = DOCUMENT_SPACES.find(s => s.value === spaceValue);
                  return space ? (
                    <Badge 
                      key={spaceValue} 
                      className={`text-xs text-white ${space.color}`}
                      title={space.label}
                    >
                      {space.label}
                    </Badge>
                  ) : null;
                })}
              </div>
              
              {/* Tags */}
              {doc.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {doc.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      <Tag className="h-3 w-3 mr-1" />
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* En-tête avec contrôles */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Gestionnaire de documents</h3>
          <p className="text-sm text-on-surface-muted">
            {filteredDocuments.length} document{filteredDocuments.length !== 1 ? 's' : ''} 
            {documents.length !== filteredDocuments.length && ` sur ${documents.length}`}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button onClick={() => setShowUploadModal(true)} className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Ajouter des documents
          </Button>
          
          <div className="flex items-center border rounded-lg">
            <Button
              size="sm"
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              onClick={() => setViewMode('list')}
              className="rounded-r-none"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              onClick={() => setViewMode('grid')}
              className="rounded-l-none"
            >
              <Grid className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Barre de recherche et filtres */}
      <div className="flex flex-wrap items-center gap-4 p-4 bg-surface-muted rounded-lg">
        <div className="flex-1 min-w-64">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-on-surface-muted" />
            <Input
              placeholder="Rechercher par nom, description ou tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <Select value={selectedSpace} onValueChange={setSelectedSpace}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Tous les espaces" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les espaces</SelectItem>
            {DOCUMENT_SPACES.map(space => (
              <SelectItem key={space.value} value={space.value}>
                {space.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Toutes les catégories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les catégories</SelectItem>
            {DOCUMENT_CATEGORIES.map(cat => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date">Date</SelectItem>
            <SelectItem value="name">Nom</SelectItem>
            <SelectItem value="size">Taille</SelectItem>
            <SelectItem value="views">Vues</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Affichage des documents */}
      <Tabs defaultValue="organized" className="space-y-4">
        <TabsList>
          <TabsTrigger value="organized">Par espaces</TabsTrigger>
          <TabsTrigger value="all">Tous les documents</TabsTrigger>
        </TabsList>
        
        <TabsContent value="organized" className="space-y-4">
          {DOCUMENT_SPACES.map(space => {
            const spaceDocuments = documentsBySpace[space.value] || [];
            if (spaceDocuments.length === 0) return null;
            
            const isExpanded = expandedSpaces.has(space.value);
            const SpaceIcon = space.icon;
            
            return (
              <Card key={space.value}>
                <CardHeader 
                  className="cursor-pointer hover:bg-surface-muted" 
                  onClick={() => toggleSpaceExpansion(space.value)}
                >
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full ${space.color} flex items-center justify-center`}>
                        <SpaceIcon className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <span className="text-base">{space.label}</span>
                        <Badge variant="secondary" className="ml-2">
                          {spaceDocuments.length}
                        </Badge>
                      </div>
                    </div>
                    {isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                  </CardTitle>
                </CardHeader>
                
                {isExpanded && (
                  <CardContent className="pt-0">
                    <div className={viewMode === 'grid' 
                      ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
                      : 'space-y-3'
                    }>
                      {spaceDocuments.map(doc => (
                        <DocumentCard 
                          key={doc.id} 
                          doc={doc} 
                          compact={viewMode === 'grid'} 
                        />
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </TabsContent>
        
        <TabsContent value="all">
          <div className={viewMode === 'grid' 
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
            : 'space-y-3'
          }>
            {filteredDocuments.map(doc => (
              <DocumentCard 
                key={doc.id} 
                doc={doc} 
                compact={viewMode === 'grid'} 
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {filteredDocuments.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <FileText className="h-12 w-12 text-on-surface-muted mx-auto mb-4" />
            <p className="text-on-surface-muted mb-2">Aucun document trouvé</p>
            <p className="text-sm text-on-surface-muted">
              Essayez de modifier vos critères de recherche ou d'ajouter de nouveaux documents
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}