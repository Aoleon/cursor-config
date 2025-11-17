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
  Star, 
  Plus,
  FileText,
  Calendar,
  MapPin,
  Building
} from 'lucide-react';
import { DataTable, DataTableColumn } from '@/components/ui/data-table';
import UnifiedOffersDisplay from '@/components/offers/unified-offers-display';
import { LoadingState } from '@/components/ui/loading-states';

interface AOsTableViewProps {
  showCreateButton?: boolean;
  title?: string;
  endpoint?: string;
}

export default function AOsTableView({ 
  showCreateButton = false, 
  title = "Liste des Appels d'Offres",
  endpoint = "/api/aos" 
}: AOsTableViewProps) {
  const [_, setLocation] = useLocation();

  // Gérer viewMode dans un state local séparé pour éviter les conflits avec les préférences du DataTable
  const [viewMode, setViewMode] = useState<'table' | 'cards'>(() => {
    const stored = localStorage.getItem('aos-view-mode');
    return (stored as 'table' | 'cards') || 'table';
  });

  // Sauvegarder le mode d'affichage
  const handleViewModeChange = (mode: 'table' | 'cards') => {
    setViewMode(mode);
    localStorage.setItem('aos-view-mode', mode);
  };

  // Récupérer les AOs
  const { data: aosData, isLoading } = useQuery({
    queryKey: [endpoint],
    queryFn: async () => {
      const response = await fetch(endpoint);
      if (!response.ok) throw new Error(`Erreur ${response.status}`);
      const data = await response.json();
      return Array.isArray(data) ? data : data.data || [];
    },
  });

  const aos = aosData || [];

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; label: string }> = {
      brouillon: { color: "bg-surface-muted text-on-surface", label: "Brouillon" },
      etude: { color: "bg-primary/10 text-primary", label: "Étude" },
      en_cours_chiffrage: { color: "bg-warning/10 text-warning", label: "En cours chiffrage" },
      finalise: { color: "bg-success/10 text-success", label: "Finalisé" },
      archive: { color: "bg-surface-muted text-on-surface", label: "Archivé" },
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

  // Définir les colonnes du tableau
  const columns: DataTableColumn[] = [
    {
      id: 'reference',
      label: 'Référence',
      accessor: 'reference',
      width: '150px',
      render: (value) => (
        <div className="font-medium font-mono text-sm">{value || '-'}</div>
      )
    },
    {
      id: 'intituleOperation',
      label: 'Intitulé',
      accessor: 'intituleOperation',
      width: '250px',
      render: (value) => (
        <div className="max-w-[250px] truncate" title={value || '-'}>
          {value || '-'}
        </div>
      )
    },
    {
      id: 'client',
      label: 'Client',
      accessor: 'client',
      width: '180px',
      render: (value) => value || '-'
    },
    {
      id: 'menuiserieType',
      label: 'Type',
      accessor: 'menuiserieType',
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
      id: 'status',
      label: 'Statut',
      accessor: 'status',
      filterType: 'select',
      filterOptions: [
        { label: 'Brouillon', value: 'brouillon' },
        { label: 'Étude', value: 'etude' },
        { label: 'En cours chiffrage', value: 'en_cours_chiffrage' },
        { label: 'Finalisé', value: 'finalise' },
        { label: 'Archivé', value: 'archive' },
      ],
      width: '150px',
      render: (value) => getStatusBadge(value)
    },
    {
      id: 'localisation',
      label: 'Localisation',
      accessor: (row) => row.localisation || row.ville,
      width: '180px'
    },
    {
      id: 'dateCreation',
      label: 'Date création',
      accessor: 'createdAt',
      width: '120px',
      render: (value) => value ? new Date(value).toLocaleDateString('fr-FR') : '-'
    },
    {
      id: 'dateLivraisonPrevue',
      label: 'Date livraison',
      accessor: 'dateLivraisonPrevue',
      width: '130px',
      render: (value) => value ? new Date(value).toLocaleDateString('fr-FR') : '-'
    },
    {
      id: 'actions',
      label: 'Actions',
      sortable: false,
      filterable: false,
      width: '120px',
      render: (_, row) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setLocation(`/aos/${row.id}`);
            }}
            data-testid={`button-view-${row.id}`}
          >
            <Eye className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setLocation(`/aos/${row.id}`);
            }}
            data-testid={`button-edit-${row.id}`}
          >
            <Edit className="w-4 h-4" />
          </Button>
        </div>
      )
    }
  ];

  if (isLoading) {
    return (
      <Card data-testid="aos-loading">
        <CardContent className="p-6">
          <LoadingState 
            type="skeleton-list" 
            message="Chargement des AOs..."
            count={5}
          />
        </CardContent>
      </Card>
    );
  }

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

  // Vue tableau
  return (
    <Card data-testid="aos-table-view">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <span data-testid="aos-count">{title} ({aos.length})</span>
          </CardTitle>

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
              <Button onClick={() => setLocation("/create-ao")} data-testid="button-create-ao">
                <Plus className="h-4 w-4 mr-2" />
                Nouvel AO
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <DataTable
          tableId="aos-list"
          columns={columns}
          data={aos}
          onRowClick={(row) => setLocation(`/aos/${row.id}`)}
          emptyMessage="Aucun AO trouvé"
          rowClassName={(row) => row.isPriority ? 'bg-error/5' : ''}
        />
      </CardContent>
    </Card>
  );
}
