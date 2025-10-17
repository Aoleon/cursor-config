import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { 
  Download, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  ArrowRight,
  Database,
  ExternalLink
} from 'lucide-react';

interface MondayBoard {
  id: string;
  name: string;
  description?: string;
  itemsCount?: number;
}

interface MondayColumn {
  id: string;
  title: string;
  type: string;
}

interface ColumnMapping {
  mondayColumnId: string;
  saxiumField: string;
}

interface ImportPreview {
  boardId: string;
  boardName: string;
  columns: MondayColumn[];
  suggestedMappings: ColumnMapping[];
  itemsCount: number;
}

const ENTITY_TYPES = [
  { value: 'project', label: 'Projets', icon: '🏗️' },
  { value: 'ao', label: 'Appels d\'Offres', icon: '📋' },
  { value: 'supplier', label: 'Fournisseurs', icon: '🏭' }
];

const FIELD_OPTIONS: Record<string, { value: string; label: string }[]> = {
  project: [
    { value: 'name', label: 'Nom du projet' },
    { value: 'description', label: 'Description' },
    { value: 'clientName', label: 'Nom client' },
    { value: 'status', label: 'Statut' },
    { value: 'startDate', label: 'Date de début' },
    { value: 'endDate', label: 'Date de fin' },
    { value: 'budget', label: 'Budget' }
  ],
  ao: [
    { value: 'numero', label: 'Numéro AO' },
    { value: 'titre', label: 'Titre' },
    { value: 'client', label: 'Client' },
    { value: 'dateLimite', label: 'Date limite' },
    { value: 'statut', label: 'Statut' },
    { value: 'montantEstime', label: 'Montant estimé' }
  ],
  supplier: [
    { value: 'nom', label: 'Nom fournisseur' },
    { value: 'email', label: 'Email' },
    { value: 'telephone', label: 'Téléphone' },
    { value: 'adresse', label: 'Adresse' },
    { value: 'specialites', label: 'Spécialités' }
  ],
  task: [
    { value: 'title', label: 'Titre tâche' },
    { value: 'description', label: 'Description' },
    { value: 'status', label: 'Statut' },
    { value: 'dueDate', label: 'Date d\'échéance' },
    { value: 'assignee', label: 'Assigné à' }
  ]
};

export default function MondayImportPage() {
  const { toast } = useToast();
  const [selectedBoard, setSelectedBoard] = useState<string | null>(null);
  const [targetEntity, setTargetEntity] = useState<string>('project');
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  // Fetch Monday boards
  const { data: boardsData, isLoading: loadingBoards } = useQuery({
    queryKey: ['/api/monday/boards'],
    enabled: true
  });

  const boards = (boardsData as any)?.data || [];

  // Fetch preview when board selected
  const { data: previewData, isLoading: loadingPreview } = useQuery<any>({
    queryKey: ['/api/monday/boards', selectedBoard, 'preview'],
    queryFn: async () => {
      if (!selectedBoard) return null;
      const response = await fetch(
        `/api/monday/boards/${selectedBoard}/preview?targetEntity=${targetEntity}`
      );
      const data = await response.json();
      return data.data;
    },
    enabled: !!selectedBoard && showPreview
  });

  // Import mutation
  const importMutation = useMutation({
    mutationFn: async (mappingsToUse: ColumnMapping[]) => {
      if (!selectedBoard) throw new Error('Aucun board sélectionné');
      
      const response = await fetch('/api/monday/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          boardId: selectedBoard,
          targetEntity,
          columnMappings: mappingsToUse
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Import failed');
      }
      
      return response.json();
    },
    onSuccess: (data: any) => {
      const result = data.data || data;
      toast({
        title: '✅ Import réussi',
        description: `${result.importedCount} ${targetEntity}(s) importé(s) avec succès`,
        variant: 'default'
      });
      
      // Invalidate relevant caches
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/aos'] });
      queryClient.invalidateQueries({ queryKey: ['/api/suppliers'] });
      
      // Reset
      setSelectedBoard(null);
      setShowPreview(false);
      setColumnMappings([]);
    },
    onError: (error: any) => {
      toast({
        title: '❌ Erreur d\'import',
        description: error.message || 'L\'import a échoué',
        variant: 'destructive'
      });
    }
  });

  const handlePreview = () => {
    if (!selectedBoard) {
      toast({
        title: 'Board manquant',
        description: 'Veuillez sélectionner un board Monday.com',
        variant: 'destructive'
      });
      return;
    }
    setShowPreview(true);
  };

  const handleImport = () => {
    // Use current mappings or suggested mappings if none manually set
    const mappingsToUse = columnMappings.length > 0 
      ? columnMappings 
      : (previewData?.suggestedMappings || []);
    
    // Pass mappings directly to mutation instead of relying on state
    importMutation.mutate(mappingsToUse);
  };

  const updateMapping = (mondayColumnId: string, saxiumField: string) => {
    setColumnMappings(prev => {
      const existing = prev.find(m => m.mondayColumnId === mondayColumnId);
      if (existing) {
        return prev.map(m => 
          m.mondayColumnId === mondayColumnId 
            ? { ...m, saxiumField } 
            : m
        );
      }
      return [...prev, { mondayColumnId, saxiumField }];
    });
  };

  const selectedBoardData = boards.find((b: MondayBoard) => b.id === selectedBoard);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-monday-title">Import Monday.com</h1>
          <p className="text-muted-foreground mt-2" data-testid="text-monday-description">
            Importez vos boards Monday.com vers Saxium
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/monday/boards'] })}
          data-testid="button-refresh-boards"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Actualiser
        </Button>
      </div>

      {/* Step 1: Select Board and Entity Type */}
      <Card data-testid="card-select-board">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            1. Sélection du Board
          </CardTitle>
          <CardDescription>
            Choisissez le board Monday.com et le type d'entité cible
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="board-select">Board Monday.com</Label>
              <Select
                value={selectedBoard || ''}
                onValueChange={setSelectedBoard}
                disabled={loadingBoards}
              >
                <SelectTrigger id="board-select" data-testid="select-monday-board">
                  <SelectValue placeholder="Sélectionner un board..." />
                </SelectTrigger>
                <SelectContent>
                  {boards.map((board: MondayBoard) => (
                    <SelectItem key={board.id} value={board.id} data-testid={`select-option-board-${board.id}`}>
                      {board.name}
                      {board.itemsCount && (
                        <span className="text-muted-foreground ml-2">
                          ({board.itemsCount} items)
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="entity-select">Type d'entité Saxium</Label>
              <Select
                value={targetEntity}
                onValueChange={setTargetEntity}
              >
                <SelectTrigger id="entity-select" data-testid="select-entity-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ENTITY_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value} data-testid={`select-option-entity-${type.value}`}>
                      {type.icon} {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedBoardData && (
            <Alert data-testid="alert-board-info">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Board sélectionné : <strong>{selectedBoardData.name}</strong>
                {selectedBoardData.description && (
                  <span className="block mt-1 text-sm">{selectedBoardData.description}</span>
                )}
              </AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handlePreview}
            disabled={!selectedBoard || loadingPreview}
            className="w-full"
            data-testid="button-preview-import"
          >
            {loadingPreview ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Chargement du preview...
              </>
            ) : (
              <>
                <ExternalLink className="w-4 h-4 mr-2" />
                Prévisualiser l'import
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Step 2: Column Mapping Preview */}
      {showPreview && previewData && (
        <Card data-testid="preview-section">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowRight className="w-5 h-5" />
              2. Mapping des Colonnes
            </CardTitle>
            <CardDescription>
              Associez les colonnes Monday.com aux champs Saxium ({previewData.itemsCount} items à importer)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {previewData.columns?.map((column: MondayColumn) => {
                const suggested = previewData.suggestedMappings?.find(
                  (m: ColumnMapping) => m.mondayColumnId === column.id
                );
                const currentMapping = columnMappings.find(m => m.mondayColumnId === column.id);
                
                return (
                  <div 
                    key={column.id} 
                    className="flex items-center gap-4 p-3 border rounded-lg"
                    data-testid={`mapping-row-${column.id}`}
                  >
                    <div className="flex-1">
                      <div className="font-medium" data-testid={`text-monday-column-${column.id}`}>
                        {column.title}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Type: {column.type}
                      </div>
                    </div>
                    
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    
                    <Select
                      value={currentMapping?.saxiumField || suggested?.saxiumField || ''}
                      onValueChange={(value) => updateMapping(column.id, value)}
                    >
                      <SelectTrigger className="w-[250px]" data-testid={`select-mapping-${column.id}`}>
                        <SelectValue placeholder="Choisir un champ..." />
                      </SelectTrigger>
                      <SelectContent>
                        {FIELD_OPTIONS[targetEntity]?.map(field => (
                          <SelectItem 
                            key={field.value} 
                            value={field.value}
                            data-testid={`select-option-field-${field.value}`}
                          >
                            {field.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {suggested && (
                      <Badge variant="secondary" data-testid={`badge-suggested-${column.id}`}>
                        Suggéré
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>

            {columnMappings.length === 0 && previewData.suggestedMappings?.length > 0 && (
              <Alert className="mt-4" data-testid="alert-auto-mapping">
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  Les mappings suggérés seront appliqués automatiquement lors de l'import
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3: Import Action */}
      {showPreview && previewData && (
        <Card data-testid="card-import-action">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="w-5 h-5" />
              3. Lancer l'Import
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleImport}
              disabled={importMutation.isPending}
              className="w-full"
              size="lg"
              data-testid="button-start-import"
            >
              {importMutation.isPending ? (
                <>
                  <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                  Import en cours...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5 mr-2" />
                  Importer {previewData.itemsCount} items depuis Monday.com
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
