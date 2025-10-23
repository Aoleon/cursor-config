import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { 
  Search, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  Database,
  FileCheck,
  Users,
  MapPin,
  Building2,
  Download,
  ExternalLink,
  CheckSquare,
  Square,
  Loader2,
  FileText
} from 'lucide-react';
import { Link } from 'wouter';

interface MondayBoard {
  id: string;
  name: string;
  description?: string;
  itemsCount?: number;
}

interface AnalysisResult {
  boardId: string;
  boardName: string;
  stats: {
    totalItems: number;
    totalLots: number;
    totalContacts: number;
    totalAddresses: number;
    totalMaitresOuvrage: number;
    totalMaitresOeuvre: number;
  };
  items: AnalysisItem[];
}

interface AnalysisItem {
  itemId: string;
  itemName: string;
  opportunities: {
    lots: { count: number; details: any[] };
    contacts: { count: number; details: any[] };
    addresses: { count: number; details: any[] };
    masters: {
      maitresOuvrage: { count: number; details: any[] };
      maitresOeuvre: { count: number; details: any[] };
    };
  };
  diagnostics: any[];
}

interface ImportResult {
  aoId: string;
  aoCreated: boolean;
  lotsCreated: number;
  contactsCreated: number;
  mastersCreated: number;
}

interface ImportSummaryData {
  itemId: string;
  itemName: string;
  result: ImportResult;
  error?: string;
}

export default function MondayImportPage() {
  const { toast } = useToast();
  
  // Step 1: Board selection
  const [selectedBoard, setSelectedBoard] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  
  // Step 2: Item selection
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  
  // Step 3: Import progress
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [currentImportingItem, setCurrentImportingItem] = useState<string | null>(null);
  
  // Step 4: Import summary
  const [importSummary, setImportSummary] = useState<ImportSummaryData[]>([]);
  const [showSummary, setShowSummary] = useState(false);

  // Fetch Monday boards
  const { data: boardsData, isLoading: loadingBoards } = useQuery({
    queryKey: ['/api/monday/boards'],
    enabled: true
  });

  const boards = (boardsData as any)?.data || [];

  // Analyze board mutation
  const analyzeMutation = useMutation({
    mutationFn: async (boardId: string) => {
      const response = await fetch(`/api/monday/boards/${boardId}/analyze?limit=0`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Analyse failed');
      }
      
      return response.json();
    },
    onSuccess: (data: AnalysisResult) => {
      setAnalysisResult(data);
      setSelectedItems(new Set());
      setShowSummary(false);
      toast({
        title: '✅ Analyse terminée',
        description: `${data.stats.totalItems} opportunités détectées dans le board`,
        variant: 'default'
      });
    },
    onError: (error: any) => {
      toast({
        title: '❌ Erreur d\'analyse',
        description: error.message || 'L\'analyse a échoué',
        variant: 'destructive'
      });
    }
  });

  // Import single item
  const importSingleItem = async (boardId: string, itemId: string): Promise<ImportResult> => {
    const response = await apiRequest('/api/monday/import/split', {
      method: 'POST',
      body: JSON.stringify({
        boardId,
        mondayItemId: itemId
      })
    });
    
    if (!response.success) {
      throw new Error(response.error || 'Import failed');
    }
    
    return response.data;
  };

  // Handle batch import
  const handleBatchImport = async () => {
    if (!analysisResult || selectedItems.size === 0) return;
    
    setIsImporting(true);
    setImportProgress(0);
    setImportSummary([]);
    setShowSummary(false);
    
    const itemsToImport = analysisResult.items.filter(item => selectedItems.has(item.itemId));
    const totalItems = itemsToImport.length;
    const summary: ImportSummaryData[] = [];
    
    for (let i = 0; i < itemsToImport.length; i++) {
      const item = itemsToImport[i];
      setCurrentImportingItem(item.itemName);
      
      try {
        const result = await importSingleItem(analysisResult.boardId, item.itemId);
        summary.push({
          itemId: item.itemId,
          itemName: item.itemName,
          result
        });
        
        toast({
          title: result.aoCreated ? '✅ AO créé' : '🔄 AO réutilisé',
          description: `${item.itemName} - ${result.lotsCreated} lots, ${result.contactsCreated} contacts`,
          variant: 'default'
        });
      } catch (error: any) {
        summary.push({
          itemId: item.itemId,
          itemName: item.itemName,
          result: { aoId: '', aoCreated: false, lotsCreated: 0, contactsCreated: 0, mastersCreated: 0 },
          error: error.message
        });
        
        toast({
          title: '❌ Erreur d\'import',
          description: `${item.itemName}: ${error.message}`,
          variant: 'destructive'
        });
      }
      
      setImportProgress(Math.round(((i + 1) / totalItems) * 100));
    }
    
    setImportSummary(summary);
    setShowSummary(true);
    setIsImporting(false);
    setCurrentImportingItem(null);
    
    // Invalidate AO cache
    queryClient.invalidateQueries({ queryKey: ['/api/aos'] });
    
    const successCount = summary.filter(s => !s.error).length;
    toast({
      title: '✅ Import terminé',
      description: `${successCount}/${totalItems} items importés avec succès`,
      variant: 'default'
    });
  };

  // Handle analyze board
  const handleAnalyze = () => {
    if (!selectedBoard) {
      toast({
        title: 'Board manquant',
        description: 'Veuillez sélectionner un board Monday.com',
        variant: 'destructive'
      });
      return;
    }
    analyzeMutation.mutate(selectedBoard);
  };

  // Toggle item selection
  const toggleItemSelection = (itemId: string) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(itemId)) {
      newSelection.delete(itemId);
    } else {
      newSelection.add(itemId);
    }
    setSelectedItems(newSelection);
  };

  // Select all items
  const toggleSelectAll = () => {
    if (!analysisResult) return;
    
    if (selectedItems.size === analysisResult.items.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(analysisResult.items.map(item => item.itemId)));
    }
  };

  const selectedBoardData = boards.find((b: MondayBoard) => b.id === selectedBoard);
  const allSelected = analysisResult && selectedItems.size === analysisResult.items.length;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-monday-title">
            Import Monday.com
          </h1>
          <p className="text-muted-foreground mt-2" data-testid="text-monday-description">
            Analysez et importez vos boards Monday.com vers Saxium avec le nouveau système de split
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            queryClient.invalidateQueries({ queryKey: ['/api/monday/boards'] });
            setAnalysisResult(null);
            setSelectedItems(new Set());
            setShowSummary(false);
          }}
          data-testid="button-refresh-boards"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Réinitialiser
        </Button>
      </div>

      {/* Step 1: Select Board and Analyze */}
      <Card data-testid="card-select-board">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            1. Sélection et Analyse du Board
          </CardTitle>
          <CardDescription>
            Choisissez un board Monday.com et analysez les opportunités d'import
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="board-select">Board Monday.com</Label>
            <Select
              value={selectedBoard || ''}
              onValueChange={setSelectedBoard}
              disabled={loadingBoards || isImporting}
            >
              <SelectTrigger id="board-select" data-testid="select-monday-board">
                <SelectValue placeholder="Sélectionner un board..." />
              </SelectTrigger>
              <SelectContent>
                {boards.map((board: MondayBoard) => (
                  <SelectItem 
                    key={board.id} 
                    value={board.id} 
                    data-testid={`select-option-board-${board.id}`}
                  >
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
            onClick={handleAnalyze}
            disabled={!selectedBoard || analyzeMutation.isPending || isImporting}
            className="w-full"
            data-testid="button-analyze-board"
          >
            {analyzeMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyse en cours...
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                Analyser le Board
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Analysis Loading Skeleton */}
      {analyzeMutation.isPending && (
        <Card data-testid="card-analysis-loading">
          <CardHeader>
            <Skeleton className="h-6 w-[250px]" />
            <Skeleton className="h-4 w-[350px]" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
      )}

      {/* Step 2: Opportunities Table */}
      {analysisResult && !showSummary && (
        <Card data-testid="card-opportunities">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCheck className="w-5 h-5" />
              2. Opportunités Détectées
            </CardTitle>
            <CardDescription>
              {analysisResult.stats.totalItems} items analysés - 
              {' '}{analysisResult.stats.totalLots} lots, 
              {' '}{analysisResult.stats.totalContacts} contacts, 
              {' '}{analysisResult.stats.totalMaitresOuvrage + analysisResult.stats.totalMaitresOeuvre} maîtres
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border" data-testid="table-opportunities">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={toggleSelectAll}
                        data-testid="checkbox-select-all"
                      />
                    </TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <FileText className="w-4 h-4" />
                        Lots
                      </div>
                    </TableHead>
                    <TableHead className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Users className="w-4 h-4" />
                        Contacts
                      </div>
                    </TableHead>
                    <TableHead className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <MapPin className="w-4 h-4" />
                        Adresses
                      </div>
                    </TableHead>
                    <TableHead className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Building2 className="w-4 h-4" />
                        Maîtres
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analysisResult.items.map((item) => {
                    const isSelected = selectedItems.has(item.itemId);
                    const totalMasters = 
                      item.opportunities.masters.maitresOuvrage.count + 
                      item.opportunities.masters.maitresOeuvre.count;
                    
                    return (
                      <TableRow 
                        key={item.itemId} 
                        data-testid={`row-item-${item.itemId}`}
                        className={isSelected ? 'bg-muted/50' : ''}
                      >
                        <TableCell>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleItemSelection(item.itemId)}
                            data-testid={`checkbox-item-${item.itemId}`}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex flex-col">
                            <span data-testid={`text-item-name-${item.itemId}`}>
                              {item.itemName}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              ID: {item.itemId}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge 
                            variant={item.opportunities.lots.count > 0 ? 'default' : 'outline'}
                            data-testid={`badge-lots-${item.itemId}`}
                          >
                            {item.opportunities.lots.count}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge 
                            variant={item.opportunities.contacts.count > 0 ? 'default' : 'outline'}
                            data-testid={`badge-contacts-${item.itemId}`}
                          >
                            {item.opportunities.contacts.count}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge 
                            variant={item.opportunities.addresses.count > 0 ? 'default' : 'outline'}
                            data-testid={`badge-addresses-${item.itemId}`}
                          >
                            {item.opportunities.addresses.count}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge 
                            variant={totalMasters > 0 ? 'default' : 'outline'}
                            data-testid={`badge-masters-${item.itemId}`}
                          >
                            {totalMasters}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-muted-foreground" data-testid="text-selection-count">
                {selectedItems.size} item(s) sélectionné(s)
              </div>
              <Button
                onClick={handleBatchImport}
                disabled={selectedItems.size === 0 || isImporting}
                size="lg"
                data-testid="button-import-selected"
              >
                <Download className="w-4 h-4 mr-2" />
                Importer la sélection ({selectedItems.size})
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Import Progress */}
      {isImporting && (
        <Card data-testid="card-import-progress">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              3. Import en cours...
            </CardTitle>
            <CardDescription>
              Importation des items sélectionnés vers Saxium
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span data-testid="text-current-item">
                  Import en cours : <strong>{currentImportingItem}</strong>
                </span>
                <span data-testid="text-progress-percentage">
                  {importProgress}%
                </span>
              </div>
              <Progress value={importProgress} data-testid="progress-import" />
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Veuillez patienter pendant l'import. Ne fermez pas cette page.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Import Summary */}
      {showSummary && importSummary.length > 0 && (
        <Card data-testid="card-import-summary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              4. Résumé de l'Import
            </CardTitle>
            <CardDescription>
              Résultats détaillés de l'importation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 border rounded-lg" data-testid="stat-total-imported">
                <div className="text-2xl font-bold">
                  {importSummary.filter(s => !s.error).length}
                </div>
                <div className="text-sm text-muted-foreground">Items importés</div>
              </div>
              <div className="p-4 border rounded-lg" data-testid="stat-ao-created">
                <div className="text-2xl font-bold">
                  {importSummary.filter(s => s.result.aoCreated).length}
                </div>
                <div className="text-sm text-muted-foreground">AOs créés</div>
              </div>
              <div className="p-4 border rounded-lg" data-testid="stat-total-lots">
                <div className="text-2xl font-bold">
                  {importSummary.reduce((sum, s) => sum + s.result.lotsCreated, 0)}
                </div>
                <div className="text-sm text-muted-foreground">Lots créés</div>
              </div>
              <div className="p-4 border rounded-lg" data-testid="stat-total-contacts">
                <div className="text-2xl font-bold">
                  {importSummary.reduce((sum, s) => sum + s.result.contactsCreated, 0)}
                </div>
                <div className="text-sm text-muted-foreground">Contacts créés</div>
              </div>
            </div>

            <div className="rounded-md border" data-testid="table-import-results">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>AO</TableHead>
                    <TableHead className="text-center">Lots</TableHead>
                    <TableHead className="text-center">Contacts</TableHead>
                    <TableHead className="text-center">Maîtres</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importSummary.map((summary) => (
                    <TableRow 
                      key={summary.itemId}
                      data-testid={`summary-row-${summary.itemId}`}
                    >
                      <TableCell className="font-medium">
                        {summary.itemName}
                      </TableCell>
                      <TableCell>
                        {summary.error ? (
                          <Badge variant="destructive" data-testid={`badge-error-${summary.itemId}`}>
                            Erreur
                          </Badge>
                        ) : summary.result.aoCreated ? (
                          <Badge variant="default" data-testid={`badge-created-${summary.itemId}`}>
                            Créé
                          </Badge>
                        ) : (
                          <Badge variant="secondary" data-testid={`badge-reused-${summary.itemId}`}>
                            Réutilisé
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {summary.error ? (
                          <span className="text-sm text-muted-foreground">-</span>
                        ) : (
                          <span className="text-sm font-mono">
                            {summary.result.aoId.slice(0, 8)}...
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {summary.result.lotsCreated}
                      </TableCell>
                      <TableCell className="text-center">
                        {summary.result.contactsCreated}
                      </TableCell>
                      <TableCell className="text-center">
                        {summary.result.mastersCreated}
                      </TableCell>
                      <TableCell>
                        {!summary.error && summary.result.aoId && (
                          <Link href={`/ao/${summary.result.aoId}`}>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              data-testid={`button-view-ao-${summary.itemId}`}
                            >
                              <ExternalLink className="w-4 h-4 mr-1" />
                              Voir l'AO
                            </Button>
                          </Link>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {importSummary.some(s => s.error) && (
              <Alert variant="destructive" data-testid="alert-import-errors">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Erreurs détectées :</strong>
                  <ul className="mt-2 list-disc list-inside">
                    {importSummary
                      .filter(s => s.error)
                      .map(s => (
                        <li key={s.itemId}>
                          {s.itemName}: {s.error}
                        </li>
                      ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <Button
              onClick={() => {
                setShowSummary(false);
                setAnalysisResult(null);
                setSelectedItems(new Set());
                setImportSummary([]);
              }}
              variant="outline"
              className="w-full"
              data-testid="button-new-import"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Nouvel Import
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
