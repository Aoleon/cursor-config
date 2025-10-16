import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  Download,
  RefreshCcw,
  Eye,
  Activity,
  Calendar,
  Package,
  TrendingUp,
  FileText,
  ShoppingCart
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface BatigestExport {
  id: string;
  documentType: 'bon_commande' | 'devis_client';
  documentReference: string;
  status: 'pending' | 'ready' | 'downloaded' | 'imported' | 'error';
  generatedAt: string;
  downloadedAt?: string | null;
  importedAt?: string | null;
  errorMessage?: string | null;
  retryCount?: number;
  exportData?: {
    xml?: string;
    csv?: string;
    metadata?: any;
  };
}

interface BatigestStats {
  totalExports: number;
  successRate7days: number;
  lastSyncDate: string | null;
  pendingCount: number;
  errorRate: number;
}

interface ExportsResponse {
  data: BatigestExport[];
  total: number;
  page: number;
  limit: number;
}

const STATUS_COLORS = {
  pending: "bg-gray-500",
  ready: "bg-blue-500",
  downloaded: "bg-yellow-500",
  imported: "bg-green-500",
  error: "bg-red-500"
};

const STATUS_LABELS = {
  pending: "En attente",
  ready: "Prêt",
  downloaded: "Téléchargé",
  imported: "Importé",
  error: "Erreur"
};

const DOCUMENT_TYPE_LABELS = {
  bon_commande: "Bon de commande",
  devis_client: "Devis client"
};

export default function BatigestDashboard() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [selectedExport, setSelectedExport] = useState<BatigestExport | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Fetch stats with auto-refresh
  const { data: stats, isLoading: statsLoading } = useQuery<BatigestStats>({
    queryKey: ["/api/batigest/stats"],
    queryFn: async () => {
      const response = await fetch('/api/batigest/stats');
      if (!response.ok) throw new Error('Failed to fetch stats');
      const { data } = await response.json();
      return data;
    },
    refetchInterval: 30000 // Auto-refresh every 30s
  });

  // Fetch exports with filters and pagination
  const { data: exportsData, isLoading: exportsLoading } = useQuery<ExportsResponse>({
    queryKey: ["/api/batigest/exports/all", statusFilter, typeFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (typeFilter !== 'all') params.append('documentType', typeFilter);
      params.append('page', page.toString());
      params.append('limit', '20');
      
      const url = `/api/batigest/exports/all?${params.toString()}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch exports');
      const { data } = await response.json();
      return data;
    },
    refetchInterval: 30000 // Auto-refresh every 30s
  });

  // Download mutation
  const downloadMutation = useMutation({
    mutationFn: async ({ id, format }: { id: string; format: 'xml' | 'csv' }) => {
      const response = await fetch(`/api/batigest/exports/${id}/download?format=${format}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `export-${id}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    onSuccess: () => {
      toast({
        title: "Téléchargement réussi",
        description: "Le fichier a été téléchargé avec succès"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/batigest/exports/all"] });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de télécharger le fichier",
        variant: "destructive"
      });
    }
  });

  // Retry mutation
  const retryMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/batigest/exports/${id}/retry`, {
        method: 'POST',
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Retry failed');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Nouvelle tentative lancée",
        description: "L'export va être retraité"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/batigest/exports/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/batigest/stats"] });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de relancer l'export",
        variant: "destructive"
      });
    }
  });

  const handleViewDetails = (exportItem: BatigestExport) => {
    setSelectedExport(exportItem);
    setDetailsOpen(true);
  };

  // Calculate queue health
  const getQueueHealth = () => {
    if (!stats) return { status: 'unknown', icon: Activity, color: 'text-gray-500' };
    
    if (stats.errorRate > 20) {
      return { status: 'error', icon: XCircle, color: 'text-red-500' };
    } else if (stats.errorRate > 10 || stats.pendingCount > 50) {
      return { status: 'warning', icon: AlertTriangle, color: 'text-yellow-500' };
    }
    return { status: 'healthy', icon: CheckCircle, color: 'text-green-500' };
  };

  const queueHealth = getQueueHealth();
  const HealthIcon = queueHealth.icon;

  // Prepare chart data (last 7 days)
  const chartData = exportsData?.data?.reduce((acc, exp) => {
    const date = format(new Date(exp.generatedAt), 'dd/MM', { locale: fr });
    const existing = acc.find(d => d.date === date);
    if (existing) {
      existing.count += 1;
      if (exp.status === 'imported') existing.imported += 1;
      if (exp.status === 'error') existing.errors += 1;
    } else {
      acc.push({
        date,
        count: 1,
        imported: exp.status === 'imported' ? 1 : 0,
        errors: exp.status === 'error' ? 1 : 0
      });
    }
    return acc;
  }, [] as Array<{ date: string; count: number; imported: number; errors: number }>)?.slice(-7) ?? [];

  const totalPages = exportsData ? Math.ceil(exportsData.total / 20) : 0;

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="batigest-dashboard">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold" data-testid="dashboard-title">
            Dashboard Batigest
          </h1>
          <p className="text-muted-foreground" data-testid="dashboard-subtitle">
            Suivi des synchronisations avec l'agent Windows
          </p>
        </div>
      </div>

      {/* Section 1: KPIs Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="card-queue-health">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Queue Health</CardTitle>
            <HealthIcon className={`h-5 w-5 ${queueHealth.color}`} data-testid="icon-queue-health" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" data-testid="skeleton-queue-health" />
            ) : (
              <div className="text-2xl font-bold capitalize" data-testid="text-queue-health">
                {queueHealth.status}
              </div>
            )}
            <p className="text-xs text-muted-foreground" data-testid="description-queue-health">
              État de la file d'attente
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-last-sync">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dernière Sync</CardTitle>
            <Calendar className="h-5 w-5 text-muted-foreground" data-testid="icon-last-sync" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-32" data-testid="skeleton-last-sync" />
            ) : (
              <div className="text-2xl font-bold" data-testid="text-last-sync">
                {stats?.lastSyncDate 
                  ? format(new Date(stats.lastSyncDate), 'dd/MM/yyyy HH:mm', { locale: fr })
                  : 'N/A'
                }
              </div>
            )}
            <p className="text-xs text-muted-foreground" data-testid="description-last-sync">
              Date et heure
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-pending-exports">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Exports en attente</CardTitle>
            <Package className="h-5 w-5 text-muted-foreground" data-testid="icon-pending-exports" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" data-testid="skeleton-pending-exports" />
            ) : (
              <div className="text-2xl font-bold" data-testid="text-pending-exports">
                {stats?.pendingCount || 0}
              </div>
            )}
            <p className="text-xs text-muted-foreground" data-testid="description-pending-exports">
              En cours de traitement
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-success-rate">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taux de succès 7j</CardTitle>
            <TrendingUp className="h-5 w-5 text-muted-foreground" data-testid="icon-success-rate" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" data-testid="skeleton-success-rate" />
            ) : (
              <div className="text-2xl font-bold" data-testid="text-success-rate">
                {stats?.successRate7days?.toFixed(1) ?? '0.0'}%
              </div>
            )}
            <p className="text-xs text-muted-foreground" data-testid="description-success-rate">
              Derniers 7 jours
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Section 3: Historical Chart (optional) */}
      {chartData.length > 0 && (
        <Card data-testid="card-historical-chart">
          <CardHeader>
            <CardTitle data-testid="chart-title">Évolution des exports (7 derniers jours)</CardTitle>
            <CardDescription data-testid="chart-description">
              Nombre d'exports créés par jour
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300} data-testid="chart-container">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#3b82f6" name="Total" />
                <Bar dataKey="imported" fill="#22c55e" name="Importés" />
                <Bar dataKey="errors" fill="#ef4444" name="Erreurs" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Section 2: Exports Table */}
      <Card data-testid="card-exports-table">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle data-testid="table-title">Exports Batigest</CardTitle>
              <CardDescription data-testid="table-description">
                Liste de tous les exports avec filtres et pagination
              </CardDescription>
            </div>
            <div className="flex gap-4">
              <Select value={statusFilter} onValueChange={setStatusFilter} data-testid="select-status-filter">
                <SelectTrigger className="w-[180px]" data-testid="trigger-status-filter">
                  <SelectValue placeholder="Filtrer par statut" />
                </SelectTrigger>
                <SelectContent data-testid="content-status-filter">
                  <SelectItem value="all" data-testid="option-status-all">Tous les statuts</SelectItem>
                  <SelectItem value="pending" data-testid="option-status-pending">En attente</SelectItem>
                  <SelectItem value="ready" data-testid="option-status-ready">Prêt</SelectItem>
                  <SelectItem value="downloaded" data-testid="option-status-downloaded">Téléchargé</SelectItem>
                  <SelectItem value="imported" data-testid="option-status-imported">Importé</SelectItem>
                  <SelectItem value="error" data-testid="option-status-error">Erreur</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter} data-testid="select-type-filter">
                <SelectTrigger className="w-[180px]" data-testid="trigger-type-filter">
                  <SelectValue placeholder="Filtrer par type" />
                </SelectTrigger>
                <SelectContent data-testid="content-type-filter">
                  <SelectItem value="all" data-testid="option-type-all">Tous les types</SelectItem>
                  <SelectItem value="bon_commande" data-testid="option-type-bc">Bon de commande</SelectItem>
                  <SelectItem value="devis_client" data-testid="option-type-devis">Devis client</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {exportsLoading ? (
            <div className="space-y-3" data-testid="table-loading">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" data-testid={`skeleton-row-${i}`} />
              ))}
            </div>
          ) : (
            <>
              <Table data-testid="table-exports">
                <TableHeader>
                  <TableRow>
                    <TableHead data-testid="header-type">Type</TableHead>
                    <TableHead data-testid="header-reference">Référence</TableHead>
                    <TableHead data-testid="header-status">Statut</TableHead>
                    <TableHead data-testid="header-created">Créé le</TableHead>
                    <TableHead data-testid="header-downloaded">Téléchargé le</TableHead>
                    <TableHead data-testid="header-imported">Importé le</TableHead>
                    <TableHead data-testid="header-actions">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exportsData?.data?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground" data-testid="text-no-data">
                        Aucun export trouvé
                      </TableCell>
                    </TableRow>
                  ) : (
                    exportsData?.data?.map((exp) => (
                      <TableRow key={exp.id} data-testid={`row-export-${exp.id}`}>
                        <TableCell data-testid={`cell-type-${exp.id}`}>
                          <div className="flex items-center gap-2">
                            {exp.documentType === 'bon_commande' ? (
                              <ShoppingCart className="h-4 w-4 text-muted-foreground" data-testid={`icon-type-${exp.id}`} />
                            ) : (
                              <FileText className="h-4 w-4 text-muted-foreground" data-testid={`icon-type-${exp.id}`} />
                            )}
                            {DOCUMENT_TYPE_LABELS[exp.documentType]}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium" data-testid={`cell-reference-${exp.id}`}>
                          {exp.documentReference}
                        </TableCell>
                        <TableCell data-testid={`cell-status-${exp.id}`}>
                          <Badge 
                            className={STATUS_COLORS[exp.status]} 
                            data-testid={`badge-status-${exp.id}`}
                          >
                            {STATUS_LABELS[exp.status]}
                          </Badge>
                        </TableCell>
                        <TableCell data-testid={`cell-created-${exp.id}`}>
                          {format(new Date(exp.generatedAt), 'dd/MM/yyyy HH:mm', { locale: fr })}
                        </TableCell>
                        <TableCell data-testid={`cell-downloaded-${exp.id}`}>
                          {exp.downloadedAt ? format(new Date(exp.downloadedAt), 'dd/MM/yyyy HH:mm', { locale: fr }) : '-'}
                        </TableCell>
                        <TableCell data-testid={`cell-imported-${exp.id}`}>
                          {exp.importedAt ? format(new Date(exp.importedAt), 'dd/MM/yyyy HH:mm', { locale: fr }) : '-'}
                        </TableCell>
                        <TableCell data-testid={`cell-actions-${exp.id}`}>
                          <div className="flex gap-2">
                            {(exp.status === 'ready' || exp.status === 'downloaded') && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => downloadMutation.mutate({ id: exp.id, format: 'xml' })}
                                  data-testid={`button-download-xml-${exp.id}`}
                                  disabled={downloadMutation.isPending}
                                >
                                  <Download className="h-4 w-4 mr-1" />
                                  XML
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => downloadMutation.mutate({ id: exp.id, format: 'csv' })}
                                  data-testid={`button-download-csv-${exp.id}`}
                                  disabled={downloadMutation.isPending}
                                >
                                  <Download className="h-4 w-4 mr-1" />
                                  CSV
                                </Button>
                              </>
                            )}
                            {exp.status === 'error' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => retryMutation.mutate(exp.id)}
                                data-testid={`button-retry-${exp.id}`}
                                disabled={retryMutation.isPending}
                              >
                                <RefreshCcw className="h-4 w-4 mr-1" />
                                Retry
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewDetails(exp)}
                              data-testid={`button-details-${exp.id}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4" data-testid="pagination">
                  <p className="text-sm text-muted-foreground" data-testid="pagination-info">
                    Page {page} sur {totalPages} ({exportsData?.total} exports au total)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      data-testid="button-previous-page"
                    >
                      Précédent
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      data-testid="button-next-page"
                    >
                      Suivant
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen} data-testid="dialog-details">
        <DialogContent className="max-w-2xl" data-testid="dialog-content-details">
          <DialogHeader>
            <DialogTitle data-testid="dialog-title-details">
              Détails de l'export
            </DialogTitle>
            <DialogDescription data-testid="dialog-description-details">
              Informations complètes sur l'export sélectionné
            </DialogDescription>
          </DialogHeader>
          {selectedExport && (
            <div className="space-y-4" data-testid="details-content">
              <div className="grid grid-cols-2 gap-4">
                <div data-testid="detail-type">
                  <p className="text-sm font-medium">Type</p>
                  <p className="text-sm text-muted-foreground">{DOCUMENT_TYPE_LABELS[selectedExport.documentType]}</p>
                </div>
                <div data-testid="detail-reference">
                  <p className="text-sm font-medium">Référence</p>
                  <p className="text-sm text-muted-foreground">{selectedExport.documentReference}</p>
                </div>
                <div data-testid="detail-status">
                  <p className="text-sm font-medium">Statut</p>
                  <Badge className={STATUS_COLORS[selectedExport.status]} data-testid="detail-badge-status">
                    {STATUS_LABELS[selectedExport.status]}
                  </Badge>
                </div>
                <div data-testid="detail-retry-count">
                  <p className="text-sm font-medium">Tentatives</p>
                  <p className="text-sm text-muted-foreground">{selectedExport.retryCount || 0}</p>
                </div>
                <div data-testid="detail-generated">
                  <p className="text-sm font-medium">Généré le</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(selectedExport.generatedAt), 'dd/MM/yyyy HH:mm:ss', { locale: fr })}
                  </p>
                </div>
                <div data-testid="detail-downloaded">
                  <p className="text-sm font-medium">Téléchargé le</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedExport.downloadedAt ? format(new Date(selectedExport.downloadedAt), 'dd/MM/yyyy HH:mm:ss', { locale: fr }) : 'N/A'}
                  </p>
                </div>
                <div data-testid="detail-imported">
                  <p className="text-sm font-medium">Importé le</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedExport.importedAt ? format(new Date(selectedExport.importedAt), 'dd/MM/yyyy HH:mm:ss', { locale: fr }) : 'N/A'}
                  </p>
                </div>
              </div>
              {selectedExport.errorMessage && (
                <div className="p-4 bg-red-50 rounded-lg" data-testid="detail-error">
                  <p className="text-sm font-medium text-red-800">Message d'erreur</p>
                  <p className="text-sm text-red-600 mt-1">{selectedExport.errorMessage}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
