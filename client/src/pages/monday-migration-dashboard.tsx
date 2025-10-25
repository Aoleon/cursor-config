import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tooltip as ShadcnTooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CalendarDays, Database, TrendingUp, Users, CheckCircle, AlertTriangle, XCircle, Search, Download, RefreshCw, Info } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

// Types pour le dashboard Monday.com
interface DataExplorationSectionProps {
  dataType: string;
  currentPage: number;
  data?: MondayData;
  isLoading: boolean;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onExport: (type: 'aos' | 'projects' | 'personnel') => void;
  onDataTypeChange: (type: string) => void;
  onPageChange: (page: number) => void;
}

interface MigrationStats {
  totalMondayRecords: number;
  migratedAOs: number;
  migratedProjects: number;
  migratedUsers: number;
  migrationSuccessRate: number;
  lastMigrationDate: string;
  breakdown: {
    aos: {
      total: number;
      byCategory: Record<string, number>;
      byStatus: Record<string, number>;
    };
    projects: {
      total: number;
      byStatus: Record<string, number>;
      byRegion: Record<string, number>;
    };
  };
}

interface MondayData {
  aos: any[];
  projects: any[];
  personnel: any[];
  aosMeta?: { total: number; limit: number; offset: number; hasMore: boolean };
  projectsMeta?: { total: number; limit: number; offset: number; hasMore: boolean };
  personnelMeta?: { total: number; limit: number; offset: number; hasMore: boolean };
}

interface MappingCoverageStats {
  totalFields: number;
  mappedFields: number;
  coveragePercent: number;
  gaps: {
    business: number;
    relations: number;
    system: number;
    alias: number;
  };
  criticalGaps: Array<{
    field: string;
    saxiumType: string;
    mondayColumn: string;
    reason: string;
    priority: 'high' | 'medium' | 'low';
    suggestedSolution: string;
  }>;
  boardInfo: {
    boardId: string;
    boardName: string;
    totalColumns: number;
    totalItems: number;
  };
  lastUpdated: string;
}

interface ValidationReport {
  globalScore: number;
  totalRecords: number;
  validatedAt: string;
  aos: {
    totalMondayAOs: number;
    fields: Record<string, {
      mondayCount: number;
      saxiumCount: number;
      status: string;
      percentage: number;
    }>;
  };
  projects: {
    totalMondayProjects: number;
    fields: Record<string, {
      mondayCount: number;
      saxiumCount: number;
      status: string;
      percentage: number;
    }>;
  };
  summary: {
    criticalIssues: number;
    warnings: number;
    successfulMappings: number;
  };
}

interface MigrationLogs {
  logs: Array<{
    id: string;
    level: 'success' | 'warning' | 'error';
    timestamp: string;
    message: string;
    entityType: string;
    entityId: string;
    details: any;
  }>;
  meta: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
    summary: {
      success: number;
      warning: number;
      error: number;
    };
  };
}

// Composant principal du dashboard
export default function MondayMigrationDashboard() {
  const [selectedTab, setSelectedTab] = useState("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [logLevel, setLogLevel] = useState("all");
  const [currentPage, setCurrentPage] = useState(0);
  const [dataType, setDataType] = useState<'aos' | 'projects' | 'personnel'>('aos');
  
  // Requêtes API pour récupérer les données
  const { data: migrationStats, isLoading: statsLoading, refetch: refetchStats } = useQuery<MigrationStats>({
    queryKey: ['/api/monday/migration-stats'],
    refetchInterval: 30000, // Refresh toutes les 30 secondes
  });

  const { data: mondayData, isLoading: dataLoading } = useQuery<MondayData>({
    queryKey: ['/api/monday/all-data', { search: searchTerm, type: dataType, limit: 50, offset: currentPage * 50 }],
    enabled: selectedTab === 'data',
  });

  const { data: validationReport, isLoading: validationLoading } = useQuery<ValidationReport>({
    queryKey: ['/api/monday/validation'],
    enabled: selectedTab === 'validation',
  });

  const { data: migrationLogs, isLoading: logsLoading } = useQuery<MigrationLogs>({
    queryKey: ['/api/monday/logs', { level: logLevel }],
    enabled: selectedTab === 'logs',
  });

  const handleExportData = (type: 'aos' | 'projects' | 'personnel') => {
    // TODO: Implémenter export CSV/Excel
    console.log(`Export ${type} data`);
  };

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="monday-migration-dashboard">
      {/* Header avec titre et actions */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white" data-testid="dashboard-title">
            Dashboard Migration Monday.com
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Suivi temps réel de l'intégration Monday.com → Saxium JLM Menuiserie
          </p>
        </div>
        <Button 
          onClick={() => refetchStats()} 
          variant="outline" 
          className="flex items-center gap-2"
          data-testid="button-refresh-stats"
        >
          <RefreshCw className="h-4 w-4" />
          Actualiser
        </Button>
      </div>

      {/* Cards de métriques principales */}
      <MigrationOverviewCards stats={migrationStats} isLoading={statsLoading} />

      {/* Navigation par onglets */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4" data-testid="dashboard-tabs">
          <TabsTrigger value="overview" data-testid="tab-overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="data" data-testid="tab-data">Données migrées</TabsTrigger>
          <TabsTrigger value="validation" data-testid="tab-validation">Validation</TabsTrigger>
          <TabsTrigger value="logs" data-testid="tab-logs">Logs migration</TabsTrigger>
        </TabsList>

        {/* Onglet Vue d'ensemble */}
        <TabsContent value="overview" className="space-y-6">
          <MappingCoverageSection />
          <MigrationChartsSection stats={migrationStats} isLoading={statsLoading} />
        </TabsContent>

        {/* Onglet Données migrées */}
        <TabsContent value="data" className="space-y-6">
          <DataExplorationSection 
            dataType={dataType}
            currentPage={currentPage}
            data={mondayData} 
            isLoading={dataLoading}
            searchTerm={searchTerm}
            onSearchChange={(term) => {
            setSearchTerm(term);
            setCurrentPage(0); // Reset pagination lors recherche
          }}
            onExport={handleExportData}
            onDataTypeChange={setDataType}
            onPageChange={setCurrentPage}
          />
        </TabsContent>

        {/* Onglet Validation */}
        <TabsContent value="validation" className="space-y-6">
          <ValidationReportSection report={validationReport} isLoading={validationLoading} />
        </TabsContent>

        {/* Onglet Logs */}
        <TabsContent value="logs" className="space-y-6">
          <MigrationLogsViewer 
            logs={migrationLogs} 
            isLoading={logsLoading}
            logLevel={logLevel}
            onLogLevelChange={setLogLevel}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Composant des cards de métriques principales
function MigrationOverviewCards({ stats, isLoading }: { stats?: MigrationStats; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-2 bg-gray-200 rounded w-full"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const aoProgress = stats.migratedAOs > 0 ? (stats.migratedAOs / 800) * 100 : 0;
  const projectProgress = stats.migratedProjects > 0 ? (stats.migratedProjects / 576) * 100 : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" data-testid="dashboard-migration-stats">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">AOs Migrés</CardTitle>
          <Database className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold" data-testid="stat-migrated-aos">
            {stats.migratedAOs}/800+
          </div>
          <Progress value={aoProgress} className="mt-2" />
          <p className="text-xs text-muted-foreground mt-1">
            {aoProgress.toFixed(1)}% des AOs Monday.com
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Projets Migrés</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold" data-testid="stat-migrated-projects">
            {stats.migratedProjects}/576
          </div>
          <Progress value={projectProgress} className="mt-2" />
          <p className="text-xs text-muted-foreground mt-1">
            {projectProgress.toFixed(1)}% des projets Monday.com
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Utilisateurs RH</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold" data-testid="stat-migrated-users">
            {stats.migratedUsers}
          </div>
          <Badge variant="secondary" className="mt-2">
            Phase 1 Complète
          </Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Taux de Succès</CardTitle>
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${getSuccessRateColor(stats.migrationSuccessRate)}`} data-testid="stat-success-rate">
            {stats.migrationSuccessRate}%
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {formatDistanceToNow(new Date(stats.lastMigrationDate), { addSuffix: true, locale: fr })}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// Composant de couverture du mapping Monday → Saxium
function MappingCoverageSection() {
  // Fetch mapping coverage stats from backend
  const { data: mappingResponse, isLoading } = useQuery<{ success: boolean; data: MappingCoverageStats }>({
    queryKey: ['/api/monday/mapping-coverage'],
    refetchInterval: 60000 // Refresh every 60s
  });

  const mappingStats = mappingResponse?.data;

  if (isLoading || !mappingStats) {
    return (
      <Card data-testid="card-mapping-coverage">
        <CardHeader className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3 mt-2"></div>
        </CardHeader>
        <CardContent>
          <div className="h-48 bg-gray-200 rounded"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="card-mapping-coverage">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Couverture Mapping Monday → Saxium
            </CardTitle>
            <CardDescription>
              État du mapping des champs depuis le board AO Planning (41 colonnes)
            </CardDescription>
          </div>
          <Badge variant="default" className="text-lg px-4 py-2">
            {mappingStats.coveragePercent}%
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{mappingStats.mappedFields} / {mappingStats.totalFields} champs mappés</span>
            <span className="text-muted-foreground">
              {mappingStats.totalFields - mappingStats.mappedFields} champs non mappés
            </span>
          </div>
          <Progress value={mappingStats.coveragePercent} className="h-3" />
        </div>

        {/* Breakdown par catégorie */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
          <div className="p-3 border rounded-lg">
            <div className="text-2xl font-bold text-red-600">{mappingStats.gaps.business}</div>
            <div className="text-xs text-muted-foreground">Business critiques</div>
          </div>
          <div className="p-3 border rounded-lg">
            <div className="text-2xl font-bold text-orange-600">{mappingStats.gaps.relations}</div>
            <div className="text-xs text-muted-foreground">Relations entités</div>
          </div>
          <div className="p-3 border rounded-lg">
            <div className="text-2xl font-bold text-gray-400">{mappingStats.gaps.system}</div>
            <div className="text-xs text-muted-foreground">Système (export)</div>
          </div>
          <div className="p-3 border rounded-lg">
            <div className="text-2xl font-bold text-gray-400">{mappingStats.gaps.alias}</div>
            <div className="text-xs text-muted-foreground">Alias (doublons)</div>
          </div>
        </div>

        {/* Critical gaps */}
        <div className="space-y-2 pt-2">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            Champs Business Non Mappés
          </h4>
          <div className="space-y-1">
            {mappingStats.criticalGaps.map((gap, idx) => (
              <div 
                key={idx} 
                className="flex items-start gap-2 p-2 bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded text-sm"
              >
                <Badge 
                  variant={gap.priority === 'high' ? 'destructive' : 'secondary'}
                  className="mt-0.5"
                >
                  {gap.priority === 'high' ? 'P1' : 'P2'}
                </Badge>
                <div className="flex-1">
                  <div className="font-medium font-mono text-xs">{gap.field}</div>
                  <div className="text-xs text-muted-foreground">{gap.reason}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <strong>Solution</strong> : Créer les colonnes manquantes dans Monday.com ou utiliser des colonnes existantes.
            Voir <code className="text-xs">analysis/MONDAY_MAPPING_GAPS_ANALYSIS.md</code> pour détails.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

// Composant des graphiques de la vue d'ensemble
function MigrationChartsSection({ stats, isLoading }: { stats?: MigrationStats; isLoading: boolean }) {
  if (isLoading || !stats) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-gray-200 rounded"></div>
          </CardContent>
        </Card>
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-gray-200 rounded"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Données pour graphique catégories AOs
  const aosCategoryData = Object.entries(stats.breakdown.aos.byCategory).map(([category, count]) => ({
    category,
    count,
    percentage: ((count / stats.breakdown.aos.total) * 100).toFixed(1)
  }));

  // Données pour graphique statuts projets
  const projectsStatusData = Object.entries(stats.breakdown.projects.byStatus).map(([status, count]) => ({
    status,
    count
  }));

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card data-testid="chart-aos-categories">
        <CardHeader>
          <CardTitle>Répartition AOs par Catégorie</CardTitle>
          <CardDescription>Distribution des {stats.breakdown.aos.total} AOs Monday.com migrés</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={aosCategoryData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ category, percentage }) => `${category}: ${percentage}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
              >
                {aosCategoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card data-testid="chart-projects-status">
        <CardHeader>
          <CardTitle>Statuts des Projets</CardTitle>
          <CardDescription>Répartition des {stats.breakdown.projects.total} projets par statut workflow</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={projectsStatusData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="status" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

// Composant d'exploration des données
function DataExplorationSection({ 
  dataType,
  currentPage,
  data, 
  isLoading, 
  searchTerm, 
  onSearchChange, 
  onExport,
  onDataTypeChange,
  onPageChange
}: DataExplorationSectionProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="data-explorer">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Exploration des Données Monday.com</CardTitle>
            <CardDescription>Consultation interactive des données migrées</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10 w-64"
                data-testid="input-search-data"
              />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={dataType} onValueChange={(tab) => {
          onDataTypeChange(tab as 'aos' | 'projects' | 'personnel');
          onPageChange(0); // Reset pagination lors changement onglet
        }}>
          <TabsList>
            <TabsTrigger value="aos" data-testid="data-tab-aos">
              AOs Monday.com ({data?.aos?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="projects" data-testid="data-tab-projects">
              Projets Monday.com ({data?.projects?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="personnel" data-testid="data-tab-personnel">
              Personnel RH ({data?.personnelMeta?.total || data?.personnel?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="aos" className="mt-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">AOs Monday.com</h3>
              <Button 
                onClick={() => onExport('aos')} 
                variant="outline" 
                size="sm"
                data-testid="button-export-aos"
              >
                <Download className="h-4 w-4 mr-2" />
                Exporter CSV
              </Button>
            </div>
            <AOsTable data={data?.aos || []} />
            {data?.aosMeta && (
              <PaginationControls 
                meta={data.aosMeta}
                currentPage={currentPage}
                onPageChange={onPageChange}
              />
            )}
          </TabsContent>

          <TabsContent value="projects" className="mt-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Projets Monday.com</h3>
              <Button 
                onClick={() => onExport('projects')} 
                variant="outline" 
                size="sm"
                data-testid="button-export-projects"
              >
                <Download className="h-4 w-4 mr-2" />
                Exporter CSV
              </Button>
            </div>
            <ProjectsTable data={data?.projects || []} />
            {data?.projectsMeta && (
              <PaginationControls 
                meta={data.projectsMeta}
                currentPage={currentPage}
                onPageChange={onPageChange}
              />
            )}
          </TabsContent>

          <TabsContent value="personnel" className="mt-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Personnel RH Monday.com</h3>
              <Button 
                onClick={() => onExport('personnel')} 
                variant="outline" 
                size="sm"
                data-testid="button-export-personnel"
              >
                <Download className="h-4 w-4 mr-2" />
                Exporter CSV
              </Button>
            </div>
            <PersonnelTable data={data?.personnel || []} />
            {data?.personnelMeta && (
              <PaginationControls 
                meta={data.personnelMeta}
                currentPage={currentPage}
                onPageChange={onPageChange}
              />
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// Table des AOs
function AOsTable({ data }: { data: any[] }) {
  return (
    <div className="border rounded-lg" data-testid="table-monday-aos">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Monday ID</TableHead>
            <TableHead>Référence</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Ville</TableHead>
            <TableHead>Catégorie</TableHead>
            <TableHead>Type Client</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Taille Projet</TableHead>
            <TableHead>Commentaire</TableHead>
            <TableHead>Statut Migration</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((ao) => (
            <TableRow key={ao.id} data-testid={`row-ao-${ao.id}`}>
              <TableCell className="font-mono text-sm">{ao.mondayItemId}</TableCell>
              <TableCell>{ao.reference}</TableCell>
              <TableCell>{ao.clientName}</TableCell>
              <TableCell>{ao.city}</TableCell>
              <TableCell>
                {ao.aoCategory ? (
                  <Badge variant="outline">{ao.aoCategory}</Badge>
                ) : (
                  <TooltipProvider>
                    <ShadcnTooltip>
                      <TooltipTrigger>
                        <Badge variant="secondary" className="text-gray-400 cursor-help">
                          <Info className="h-3 w-3 mr-1" />
                          Non mappé
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Colonne Monday "Catégorie AO" inexistante</p>
                      </TooltipContent>
                    </ShadcnTooltip>
                  </TooltipProvider>
                )}
              </TableCell>
              <TableCell>
                {ao.clientRecurrency ? (
                  <Badge variant="outline">{ao.clientRecurrency}</Badge>
                ) : (
                  <TooltipProvider>
                    <ShadcnTooltip>
                      <TooltipTrigger>
                        <Badge variant="secondary" className="text-gray-400 cursor-help">
                          <Info className="h-3 w-3 mr-1" />
                          Non mappé
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Colonne Monday "Type Client" inexistante</p>
                      </TooltipContent>
                    </ShadcnTooltip>
                  </TooltipProvider>
                )}
              </TableCell>
              <TableCell>
                <Badge variant={getStatusVariant(ao.operationalStatus)}>
                  {ao.operationalStatus}
                </Badge>
              </TableCell>
              <TableCell>{ao.projectSize || '-'}</TableCell>
              <TableCell>
                {ao.selectionComment ? (
                  <span className="text-sm truncate max-w-xs block">{ao.selectionComment}</span>
                ) : (
                  <TooltipProvider>
                    <ShadcnTooltip>
                      <TooltipTrigger>
                        <Badge variant="secondary" className="text-gray-400 cursor-help">
                          <Info className="h-3 w-3 mr-1" />
                          Non mappé
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Colonne Monday "Commentaire sélection" inexistante</p>
                      </TooltipContent>
                    </ShadcnTooltip>
                  </TooltipProvider>
                )}
              </TableCell>
              <TableCell>
                <Badge variant="default" className="bg-green-100 text-green-800">
                  {ao.migrationStatus}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// Table du personnel RH Monday.com - CORRECTION CRITIQUE MODULE RH
function PersonnelTable({ data }: { data: any[] }) {
  return (
    <div className="border rounded-lg" data-testid="table-monday-personnel">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Monday ID</TableHead>
            <TableHead>Prénom</TableHead>
            <TableHead>Nom</TableHead>
            <TableHead>Département</TableHead>
            <TableHead>Compétences</TableHead>
            <TableHead>Véhicule Assigné</TableHead>
            <TableHead>Expiration Certification</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((person) => (
            <TableRow key={person.id} data-testid={`row-personnel-${person.id}`}>
              <TableCell className="font-mono text-sm">{person.mondayPersonnelId || '-'}</TableCell>
              <TableCell>{person.firstName}</TableCell>
              <TableCell>{person.lastName}</TableCell>
              <TableCell>
                <Badge variant="outline">{person.departmentType || '-'}</Badge>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {person.competencies && person.competencies.length > 0 ? (
                    person.competencies.map((comp: string, idx: number) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {comp}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {person.vehicleAssigned ? (
                  <Badge variant="default" className="bg-blue-100 text-blue-800">
                    {person.vehicleAssigned}
                  </Badge>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </TableCell>
              <TableCell>
                {person.certificationExpiry ? (
                  <span className="text-sm">
                    {new Date(person.certificationExpiry).toLocaleDateString('fr-FR')}
                  </span>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// Composant de contrôles de pagination
function PaginationControls({ 
  meta, 
  currentPage, 
  onPageChange 
}: { 
  meta: { total: number; limit: number; offset: number; hasMore: boolean }; 
  currentPage: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.ceil(meta.total / meta.limit);
  
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6">
      <div className="flex justify-between flex-1 sm:hidden">
        <Button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 0}
          variant="outline"
          size="sm"
        >
          Précédent
        </Button>
        <Button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!meta.hasMore}
          variant="outline"
          size="sm"
        >
          Suivant
        </Button>
      </div>
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-gray-700">
            Affichage de <span className="font-medium">{meta.offset + 1}</span> à{' '}
            <span className="font-medium">
              {Math.min(meta.offset + meta.limit, meta.total)}
            </span>{' '}
            sur <span className="font-medium">{meta.total}</span> résultats
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            onClick={() => onPageChange(0)}
            disabled={currentPage === 0}
            variant="outline"
            size="sm"
            data-testid="pagination-first"
          >
            Premier
          </Button>
          <Button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 0}
            variant="outline"
            size="sm"
            data-testid="pagination-prev"
          >
            Précédent
          </Button>
          <span className="text-sm text-gray-700">
            Page {currentPage + 1} sur {totalPages}
          </span>
          <Button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={!meta.hasMore}
            variant="outline"
            size="sm"
            data-testid="pagination-next"
          >
            Suivant
          </Button>
          <Button
            onClick={() => onPageChange(totalPages - 1)}
            disabled={!meta.hasMore}
            variant="outline"
            size="sm"
            data-testid="pagination-last"
          >
            Dernier
          </Button>
        </div>
      </div>
    </div>
  );
}

// Table des projets
function ProjectsTable({ data }: { data: any[] }) {
  return (
    <div className="border rounded-lg" data-testid="table-monday-projects">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Monday ID</TableHead>
            <TableHead>Nom Projet</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Sous-type</TableHead>
            <TableHead>Zone Géographique</TableHead>
            <TableHead>Nb Bâtiments</TableHead>
            <TableHead>Statut Migration</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((project) => (
            <TableRow key={project.id} data-testid={`row-project-${project.id}`}>
              <TableCell className="font-mono text-sm">{project.mondayProjectId}</TableCell>
              <TableCell className="max-w-xs truncate">{project.name}</TableCell>
              <TableCell>{project.clientName}</TableCell>
              <TableCell>
                <Badge variant={getStatusVariant(project.status)}>
                  {project.status}
                </Badge>
              </TableCell>
              <TableCell>
                {project.projectSubtype ? (
                  <Badge variant="outline">{project.projectSubtype}</Badge>
                ) : '-'}
              </TableCell>
              <TableCell>{project.geographicZone || '-'}</TableCell>
              <TableCell>{project.buildingCount || '-'}</TableCell>
              <TableCell>
                <Badge variant="default" className="bg-green-100 text-green-800">
                  {project.migrationStatus}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// Composant rapport de validation
function ValidationReportSection({ report, isLoading }: { report?: ValidationReport; isLoading: boolean }) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!report) return null;

  return (
    <div className="space-y-6" data-testid="validation-report">
      {/* Score global */}
      <Card>
        <CardHeader>
          <CardTitle>Score Global de Validation</CardTitle>
          <CardDescription>
            Validé le {formatDistanceToNow(new Date(report.validatedAt), { addSuffix: true, locale: fr })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="text-4xl font-bold text-green-600" data-testid="validation-global-score">
              {report.globalScore}%
            </div>
            <div className="flex-1">
              <Progress value={report.globalScore} className="h-3" />
              <p className="text-sm text-muted-foreground mt-2">
                {report.totalRecords} enregistrements validés
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Validation AOs */}
      <Card>
        <CardHeader>
          <CardTitle>Validation AOs Monday.com vs Saxium</CardTitle>
          <CardDescription>{report.aos.totalMondayAOs} AOs analysés</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(report.aos.fields).map(([field, validation]) => (
              <FieldComparisonRow 
                key={field} 
                field={field} 
                validation={validation}
                dataTestId={`validation-aos-${field}`}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Validation Projets */}
      <Card>
        <CardHeader>
          <CardTitle>Validation Projets Monday.com vs Saxium</CardTitle>
          <CardDescription>{report.projects.totalMondayProjects} projets analysés</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(report.projects.fields).map(([field, validation]) => (
              <FieldComparisonRow 
                key={field} 
                field={field} 
                validation={validation}
                dataTestId={`validation-projects-${field}`}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Résumé des validations */}
      <Card>
        <CardHeader>
          <CardTitle>Résumé des Validations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{report.summary.criticalIssues}</div>
              <p className="text-sm text-muted-foreground">Problèmes critiques</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{report.summary.warnings}</div>
              <p className="text-sm text-muted-foreground">Avertissements</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{report.summary.successfulMappings}</div>
              <p className="text-sm text-muted-foreground">Mappages réussis</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Ligne de comparaison de champ
function FieldComparisonRow({ 
  field, 
  validation, 
  dataTestId 
}: { 
  field: string; 
  validation: any;
  dataTestId: string;
}) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <CheckCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg" data-testid={dataTestId}>
      <div className="flex items-center gap-3">
        {getStatusIcon(validation.status)}
        <div>
          <p className="font-medium">{field}</p>
          <p className="text-sm text-muted-foreground">
            Monday.com: {validation.mondayCount} | Saxium: {validation.saxiumCount}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-semibold">{validation.percentage}%</p>
        <p className="text-sm text-muted-foreground">Correspondance</p>
      </div>
    </div>
  );
}

// Composant logs de migration
function MigrationLogsViewer({ 
  logs, 
  isLoading, 
  logLevel, 
  onLogLevelChange 
}: { 
  logs?: MigrationLogs; 
  isLoading: boolean;
  logLevel: string;
  onLogLevelChange: (level: string) => void;
}) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!logs) return null;

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <CheckCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getLevelBadgeVariant = (level: string) => {
    switch (level) {
      case 'success':
        return 'default';
      case 'warning':
        return 'secondary';
      case 'error':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <Card data-testid="migration-logs">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Logs de Migration</CardTitle>
            <CardDescription>
              {logs.meta.total} entrées de log - {logs.meta.summary.success} succès, {logs.meta.summary.warning} avertissements, {logs.meta.summary.error} erreurs
            </CardDescription>
          </div>
          <Select value={logLevel} onValueChange={onLogLevelChange}>
            <SelectTrigger className="w-48" data-testid="select-log-level">
              <SelectValue placeholder="Filtrer par niveau" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les niveaux</SelectItem>
              <SelectItem value="success">Succès uniquement</SelectItem>
              <SelectItem value="warning">Avertissements</SelectItem>
              <SelectItem value="error">Erreurs uniquement</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2" data-testid="logs-list">
          {logs.logs.map((log) => (
            <div 
              key={log.id} 
              className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
              data-testid={`log-entry-${log.id}`}
            >
              {getLevelIcon(log.level)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={getLevelBadgeVariant(log.level)} className="text-xs">
                    {log.level.toUpperCase()}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true, locale: fr })}
                  </span>
                </div>
                <p className="text-sm font-medium">{log.message}</p>
                <p className="text-xs text-muted-foreground">
                  {log.entityType}: {log.entityId}
                </p>
              </div>
            </div>
          ))}
        </div>
        
        {logs.meta.hasMore && (
          <div className="mt-4 text-center">
            <Button variant="outline" size="sm">
              Charger plus de logs
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Fonctions utilitaires
function getSuccessRateColor(rate: number): string {
  if (rate >= 90) return "text-green-600";
  if (rate >= 75) return "text-yellow-600";
  return "text-red-600";
}

function getStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status?.toLowerCase()) {
    case 'gagne':
    case 'complete':
    case 'completed':
      return 'default';
    case 'en_cours':
    case 'in_progress':
    case 'etude':
      return 'secondary';
    case 'perdu':
    case 'failed':
    case 'error':
      return 'destructive';
    default:
      return 'outline';
  }
}