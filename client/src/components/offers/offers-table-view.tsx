import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  LayoutGrid, 
  Table as TableIcon, 
  Eye, 
  Edit, 
  Plus,
  FileText,
  TrendingUp,
  Euro
} from 'lucide-react';
import { DataTable, DataTableColumn } from '@/components/ui/data-table';
import UnifiedOffersDisplay from '@/components/offers/unified-offers-display';

interface OffersTableViewProps {
  showCreateButton?: boolean;
  title?: string;
  endpoint?: string;
}

export default function OffersTableView({ 
  showCreateButton = false, 
  title = "Liste des Offres",
  endpoint = "/api/offers" 
}: OffersTableViewProps) {
  const [_, setLocation] = useLocation();

  // Gérer viewMode dans un state local séparé pour éviter les conflits avec les préférences du DataTable
  const [viewMode, setViewMode] = useState<'table' | 'cards'>(() => {
    const stored = localStorage.getItem('offers-view-mode');
    return (stored as 'table' | 'cards') || 'table';
  });

  // Sauvegarder le mode d'affichage
  const handleViewModeChange = (mode: 'table' | 'cards') => {
    setViewMode(mode);
    localStorage.setItem('offers-view-mode', mode);
  };

  // Récupérer les Offres
  const { data: offersResponse, isLoading } = useQuery({
    queryKey: [endpoint],
    queryFn: async () => {
      const response = await fetch(endpoint);
      if (!response.ok) throw new Error(`Erreur ${response.status}`);
      const data = await response.json();
      // Gérer le format API avec total
      if (data && typeof data === 'object' && 'data' in data) {
        return data;
      } else if (Array.isArray(data)) {
        return { data, total: data.length };
      }
      return { data: [], total: 0 };
    },
  });

  const offers = offersResponse?.data || [];
  // Support multiple API response formats: root.total, meta.total, pagination.total, or fallback to array length
  const total = offersResponse?.total ?? offersResponse?.meta?.total ?? offersResponse?.pagination?.total ?? offers.length;

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; label: string }> = {
      brouillon: { color: "bg-surface-muted text-on-surface", label: "Brouillon" },
      en_cours: { color: "bg-warning/10 text-warning", label: "En cours" },
      en_attente_validation: { color: "bg-warning/20 text-warning", label: "En attente validation" },
      validee: { color: "bg-success/10 text-success", label: "Validée" },
      envoyee: { color: "bg-primary/10 text-primary", label: "Envoyée" },
      signee: { color: "bg-success/20 text-success", label: "Signée" },
      refusee: { color: "bg-error/10 text-error", label: "Refusée" },
      perdue: { color: "bg-error/10 text-error", label: "Perdue" },
      archivee: { color: "bg-surface-muted text-on-surface", label: "Archivée" },
    };

    const config = statusConfig[status] || { color: "bg-surface-muted text-on-surface", label: status };
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const getMenuiserieTypeBadge = (type: string) => {
    const typeConfig: Record<string, { color: string; label: string }> = {
      fenetre: { color: "bg-primary/10 text-primary", label: "Fenêtre" },
      fenetres_pvc: { color: "bg-primary/10 text-primary", label: "Fenêtres PVC" },
      fenetres_aluminium: { color: "bg-surface-muted text-on-surface", label: "Fenêtres Alu" },
      porte: { color: "bg-success/10 text-success", label: "Porte" },
      portes_bois: { color: "bg-secondary/20 text-secondary-foreground", label: "Portes Bois" },
      portes_alu: { color: "bg-warning/10 text-warning", label: "Portes Alu" },
      portail: { color: "bg-secondary/20 text-secondary-foreground", label: "Portail" },
      volet: { color: "bg-warning/10 text-warning", label: "Volet" },
      autre: { color: "bg-surface-muted text-on-surface", label: "Autre" },
    };

    const config = typeConfig[type] || { color: "bg-surface-muted text-on-surface", label: type || "Non défini" };
    return <Badge variant="outline" className={config.color}>{config.label}</Badge>;
  };

  const formatCurrency = (value: string | number | null | undefined) => {
    if (value === null || value === undefined) return '-';
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return '-';
    return new Intl.NumberFormat('fr-FR', { 
      style: 'currency', 
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(numValue);
  };

  const formatPercentage = (value: string | number | null | undefined) => {
    if (value === null || value === undefined) return '-';
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return '-';
    return `${numValue.toFixed(1)}%`;
  };

  // Définir les colonnes du tableau
  const columns: DataTableColumn[] = [
    {
      id: 'reference',
      label: 'Référence',
      accessor: 'reference',
      width: '150px',
      render: (value, row) => (
        <div className="font-medium">{value || row.id}</div>
      )
    },
    {
      id: 'intituleOperation',
      label: 'Intitulé',
      accessor: 'intituleOperation',
      width: '250px',
      render: (value, row) => {
        const displayValue = value || row.reference;
        return (
          <div className="max-w-[250px] truncate" title={displayValue}>
            {displayValue || '-'}
          </div>
        );
      }
    },
    {
      id: 'client',
      label: 'Client',
      accessor: 'client',
      width: '180px'
    },
    {
      id: 'menuiserieType',
      label: 'Type',
      accessor: (row) => row.menuiserieType || row.typologie,
      filterType: 'select',
      filterOptions: [
        { label: 'Fenêtre', value: 'fenetre' },
        { label: 'Fenêtres PVC', value: 'fenetres_pvc' },
        { label: 'Fenêtres Alu', value: 'fenetres_aluminium' },
        { label: 'Porte', value: 'porte' },
        { label: 'Portes Bois', value: 'portes_bois' },
        { label: 'Portes Alu', value: 'portes_alu' },
        { label: 'Portail', value: 'portail' },
        { label: 'Volet', value: 'volet' },
        { label: 'Autre', value: 'autre' },
      ],
      width: '140px',
      render: (value) => getMenuiserieTypeBadge(value)
    },
    {
      id: 'montantFinal',
      label: 'Montant HT',
      accessor: 'montantFinal',
      width: '130px',
      render: (value) => (
        <div className="font-medium text-right">{formatCurrency(value)}</div>
      )
    },
    {
      id: 'tauxMarge',
      label: 'Marge',
      accessor: 'tauxMarge',
      width: '100px',
      render: (value) => {
        // Utiliser formatPercentage pour gérer correctement 0 vs null/undefined
        const formatted = formatPercentage(value);
        if (formatted === '-') return <div className="text-right">-</div>;
        return (
          <div className="text-right flex items-center justify-end gap-1">
            <TrendingUp className="h-3 w-3 text-success" />
            <span className="font-medium">{formatted}</span>
          </div>
        );
      }
    },
    {
      id: 'status',
      label: 'Statut',
      accessor: 'status',
      filterType: 'select',
      filterOptions: [
        { label: 'Brouillon', value: 'brouillon' },
        { label: 'En cours', value: 'en_cours' },
        { label: 'En attente validation', value: 'en_attente_validation' },
        { label: 'Validée', value: 'validee' },
        { label: 'Envoyée', value: 'envoyee' },
        { label: 'Signée', value: 'signee' },
        { label: 'Refusée', value: 'refusee' },
        { label: 'Perdue', value: 'perdue' },
        { label: 'Archivée', value: 'archivee' },
      ],
      width: '160px',
      render: (value) => getStatusBadge(value)
    },
    {
      id: 'createdAt',
      label: 'Date création',
      accessor: 'createdAt',
      width: '120px',
      render: (value) => value ? new Date(value).toLocaleDateString('fr-FR') : '-'
    },
    {
      id: 'deadline',
      label: 'Échéance',
      accessor: 'deadline',
      width: '120px',
      render: (value) => value ? new Date(value).toLocaleDateString('fr-FR') : '-'
    },
    {
      id: 'actions',
      label: 'Actions',
      accessor: () => '',
      width: '120px',
      sortable: false,
      render: (_, row) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation(`/offers/${row.id}`)}
            data-testid={`view-offer-${row.id}`}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation(`/offers/${row.id}/edit`)}
            data-testid={`edit-offer-${row.id}`}
          >
            <Edit className="h-4 w-4" />
          </Button>
        </div>
      )
    },
  ];

  // Calculer les variants avant les blocs conditionnels pour éviter les erreurs TypeScript
  const isTableMode = viewMode === 'table';

  // Vue cartes : utiliser le composant existant
  if (viewMode === 'cards') {
    return (
      <div className="space-y-4">
        {/* Toggle */}
        <div className="flex justify-end">
          <div className="flex items-center gap-2 bg-muted p-1 rounded-lg">
            <Button
              variant={isTableMode ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleViewModeChange('table')}
              data-testid="view-mode-table"
            >
              <TableIcon className="h-4 w-4 mr-2" />
              Tableau
            </Button>
            <Button
              variant={!isTableMode ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleViewModeChange('cards')}
              data-testid="view-mode-cards"
            >
              <LayoutGrid className="h-4 w-4 mr-2" />
              Cartes
            </Button>
          </div>
        </div>

        <UnifiedOffersDisplay
          showCreateButton={showCreateButton}
          title={title}
          endpoint={endpoint}
        />
      </div>
    );
  }

  // Affichage loading
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Chargement...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Vue tableau
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              <span data-testid="offers-count">{title} ({total})</span>
            </div>

          <div className="flex items-center gap-2">
            {/* Toggle vue */}
            <div className="flex items-center gap-2 bg-muted p-1 rounded-lg">
              <Button
                variant={isTableMode ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleViewModeChange('table')}
                data-testid="view-mode-table"
              >
                <TableIcon className="h-4 w-4 mr-2" />
                Tableau
              </Button>
              <Button
                variant={!isTableMode ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleViewModeChange('cards')}
                data-testid="view-mode-cards"
              >
                <LayoutGrid className="h-4 w-4 mr-2" />
                Cartes
              </Button>
            </div>

            {showCreateButton && (
              <Button onClick={() => setLocation("/create-offer")} data-testid="button-create-offer">
                <Plus className="h-4 w-4 mr-2" />
                Nouvelle Offre
              </Button>
            )}
          </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            tableId="offers-list"
            columns={columns}
            data={offers}
            emptyMessage="Aucune offre trouvée"
          />
        </CardContent>
      </Card>
    </div>
  );
}
