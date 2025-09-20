import { describe, test, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BusinessAlertsOverview } from '../../client/src/components/BusinessAlertsOverview';
import { BusinessAlertsList } from '../../client/src/components/BusinessAlertsList';

// ========================================
// MOCK HOOKS ET SERVICES
// ========================================

// Mock du hook useBusinessAlerts
vi.mock('@/hooks/useBusinessAlerts', () => ({
  useBusinessAlerts: vi.fn(),
  useAcknowledgeAlert: vi.fn(),
  useResolveAlert: vi.fn(),
  useAlertThresholds: vi.fn(),
  useUpdateThreshold: vi.fn(),
}));

// Mock du query client
vi.mock('@/lib/queryClient', () => ({
  queryClient: {
    invalidateQueries: vi.fn(),
  },
  apiRequest: vi.fn(),
}));

// Mock des icônes Lucide
vi.mock('lucide-react', () => ({
  AlertTriangle: () => <div data-testid="icon-alert-triangle" />,
  Clock: () => <div data-testid="icon-clock" />,
  CheckCircle: () => <div data-testid="icon-check-circle" />,
  XCircle: () => <div data-testid="icon-x-circle" />,
  User: () => <div data-testid="icon-user" />,
  Activity: () => <div data-testid="icon-activity" />,
  TrendingUp: () => <div data-testid="icon-trending-up" />,
  TrendingDown: () => <div data-testid="icon-trending-down" />,
  Settings: () => <div data-testid="icon-settings" />,
  Target: () => <div data-testid="icon-target" />
}));

// Mock Recharts
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="chart-container">{children}</div>,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div data-testid="pie" />,
  Cell: () => <div data-testid="pie-cell" />,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />
}));

// ========================================
// DONNÉES DE TEST BUSINESS ALERTS
// ========================================

const mockBusinessAlerts = [
  {
    id: 'alert1',
    type: 'profitability',
    entity_type: 'project',
    entity_id: 'proj1',
    entity_name: 'Projet École Primaire',
    threshold_key: 'project_margin',
    threshold_value: 15.0,
    actual_value: 8.5,
    variance: -6.5,
    severity: 'high',
    status: 'open',
    message: 'Marge projet inférieure au seuil critique',
    details: JSON.stringify({ 
      estimated_loss: 3000,
      causes: ['material_cost_increase', 'scope_creep']
    }),
    created_at: new Date('2024-02-15T10:30:00Z'),
    updated_at: new Date('2024-02-15T10:30:00Z'),
    created_by: null,
    acknowledged_by: null,
    acknowledged_at: null,
    assigned_to: null,
    resolved_by: null,
    resolved_at: null,
    resolution_notes: null
  },
  {
    id: 'alert2',
    type: 'team_utilization',
    entity_type: 'team',
    entity_id: 'user2',
    entity_name: 'Sophie Martin',
    threshold_key: 'team_utilization',
    threshold_value: 85.0,
    actual_value: 95.0,
    variance: 10.0,
    severity: 'medium',
    status: 'acknowledged',
    message: 'Surcharge équipe détectée',
    details: JSON.stringify({ 
      current_load: 95,
      recommended_action: 'redistribute_tasks'
    }),
    created_at: new Date('2024-02-14T14:15:00Z'),
    updated_at: new Date('2024-02-15T09:00:00Z'),
    created_by: null,
    acknowledged_by: 'user1',
    acknowledged_at: new Date('2024-02-15T09:00:00Z'),
    assigned_to: 'user1',
    resolved_by: null,
    resolved_at: null,
    resolution_notes: null
  },
  {
    id: 'alert3',
    type: 'predictive_risk',
    entity_type: 'project',
    entity_id: 'proj3',
    entity_name: 'Projet Hôpital Central',
    threshold_key: 'risk_score',
    threshold_value: 75.0,
    actual_value: 88.0,
    variance: 13.0,
    severity: 'critical',
    status: 'resolved',
    message: 'Risque projet élevé détecté',
    details: JSON.stringify({ 
      risk_factors: ['complexity', 'timeline_pressure'],
      predicted_delay: 15
    }),
    created_at: new Date('2024-02-10T16:20:00Z'),
    updated_at: new Date('2024-02-14T11:30:00Z'),
    created_by: null,
    acknowledged_by: 'user1',
    acknowledged_at: new Date('2024-02-11T08:00:00Z'),
    assigned_to: 'user2',
    resolved_by: 'user2',
    resolved_at: new Date('2024-02-14T11:30:00Z'),
    resolution_notes: 'Équipe technique renforcée, planning réajusté'
  }
];

const mockAlertThresholds = [
  {
    id: 'threshold1',
    key: 'project_margin',
    value: 15.0,
    operator: 'greater_than',
    is_active: true,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01')
  },
  {
    id: 'threshold2',
    key: 'team_utilization',
    value: 85.0,
    operator: 'less_than',
    is_active: true,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01')
  },
  {
    id: 'threshold3',
    key: 'risk_score',
    value: 75.0,
    operator: 'less_than',
    is_active: true,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01')
  }
];

const mockOverviewMetrics = {
  totalAlerts: 15,
  openAlerts: 5,
  acknowledgedAlerts: 7,
  resolvedAlerts: 3,
  criticalAlerts: 2,
  avgResolutionTimeHours: 18.5,
  alertsByType: {
    profitability: 6,
    team_utilization: 4,
    predictive_risk: 5
  },
  alertsBySeverity: {
    low: 3,
    medium: 7,
    high: 4,
    critical: 1
  },
  trendsLastWeek: {
    newAlerts: 8,
    resolvedAlerts: 5,
    trend: '+37.5%'
  }
};

// ========================================
// HELPER FUNCTIONS
// ========================================

const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });
};

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

// ========================================
// SUITE DE TESTS BUSINESS ALERTS OVERVIEW
// ========================================

describe('BusinessAlertsOverview - Tests Exhaustifs', () => {
  let mockHooks: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Configuration des mocks
    mockHooks = {
      useBusinessAlerts: vi.fn(),
      useAcknowledgeAlert: vi.fn(),
      useResolveAlert: vi.fn(),
      useAlertThresholds: vi.fn(),
      useUpdateThreshold: vi.fn(),
    };

    const { 
      useBusinessAlerts, 
      useAcknowledgeAlert, 
      useResolveAlert, 
      useAlertThresholds,
      useUpdateThreshold 
    } = vi.mocked(await import('@/hooks/useBusinessAlerts'));

    // Configuration valeurs par défaut
    useBusinessAlerts.mockReturnValue({
      data: mockBusinessAlerts,
      isLoading: false,
      error: null,
      refetch: vi.fn()
    });

    useAcknowledgeAlert.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({}),
      isPending: false
    });

    useResolveAlert.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({}),
      isPending: false
    });

    useAlertThresholds.mockReturnValue({
      data: mockAlertThresholds,
      isLoading: false,
      error: null
    });

    useUpdateThreshold.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({}),
      isPending: false
    });
  });

  // ========================================
  // TESTS AFFICHAGE MÉTRIQUES OVERVIEW
  // ========================================

  describe('Affichage Métriques Overview', () => {
    test('affiche métriques overview correctement', () => {
      renderWithProviders(<BusinessAlertsOverview />);

      // Métriques principales
      expect(screen.getByTestId('metric-total-alerts')).toBeInTheDocument();
      expect(screen.getByTestId('metric-open-alerts')).toBeInTheDocument();
      expect(screen.getByTestId('metric-critical-alerts')).toBeInTheDocument();
      expect(screen.getByTestId('metric-avg-resolution-time')).toBeInTheDocument();

      // Vérifier valeurs affichées
      expect(screen.getByTestId('metric-total-alerts')).toHaveTextContent('15');
      expect(screen.getByTestId('metric-open-alerts')).toHaveTextContent('5');
      expect(screen.getByTestId('metric-critical-alerts')).toHaveTextContent('2');
    });

    test('affiche répartition par type d\'alerte', () => {
      renderWithProviders(<BusinessAlertsOverview />);

      expect(screen.getByTestId('chart-alerts-by-type')).toBeInTheDocument();
      expect(screen.getByTestId('pie-chart')).toBeInTheDocument();

      // Vérifier légende types
      expect(screen.getByText('Rentabilité')).toBeInTheDocument();
      expect(screen.getByText('Charge équipe')).toBeInTheDocument();
      expect(screen.getByText('Risques prédictifs')).toBeInTheDocument();
    });

    test('affiche répartition par sévérité avec couleurs', () => {
      renderWithProviders(<BusinessAlertsOverview />);

      expect(screen.getByTestId('chart-alerts-by-severity')).toBeInTheDocument();
      
      // Vérifier badges sévérité avec couleurs
      expect(screen.getByTestId('severity-badge-critical')).toBeInTheDocument();
      expect(screen.getByTestId('severity-badge-high')).toBeInTheDocument();
      expect(screen.getByTestId('severity-badge-medium')).toBeInTheDocument();
      expect(screen.getByTestId('severity-badge-low')).toBeInTheDocument();

      // Vérifier couleurs CSS
      const criticalBadge = screen.getByTestId('severity-badge-critical');
      expect(criticalBadge).toHaveClass(/bg-red-/);
    });

    test('affiche tendances dernière semaine', () => {
      renderWithProviders(<BusinessAlertsOverview />);

      expect(screen.getByTestId('trends-last-week')).toBeInTheDocument();
      expect(screen.getByTestId('metric-new-alerts-week')).toHaveTextContent('8');
      expect(screen.getByTestId('metric-resolved-alerts-week')).toHaveTextContent('5');
      expect(screen.getByTestId('trend-percentage')).toHaveTextContent('+37.5%');
      
      // Icône de tendance
      expect(screen.getByTestId('icon-trending-up')).toBeInTheDocument();
    });

    test('data-testid présents pour tous les éléments métriques', () => {
      renderWithProviders(<BusinessAlertsOverview />);

      // Métriques principales
      expect(screen.getByTestId('metric-total-alerts')).toBeInTheDocument();
      expect(screen.getByTestId('metric-open-alerts')).toBeInTheDocument();
      expect(screen.getByTestId('metric-acknowledged-alerts')).toBeInTheDocument();
      expect(screen.getByTestId('metric-resolved-alerts')).toBeInTheDocument();
      expect(screen.getByTestId('metric-critical-alerts')).toBeInTheDocument();
      expect(screen.getByTestId('metric-avg-resolution-time')).toBeInTheDocument();

      // Charts
      expect(screen.getByTestId('chart-alerts-by-type')).toBeInTheDocument();
      expect(screen.getByTestId('chart-alerts-by-severity')).toBeInTheDocument();
      expect(screen.getByTestId('trends-last-week')).toBeInTheDocument();
    });
  });

  // ========================================
  // TESTS LOADING ET ÉTATS D'ERREUR
  // ========================================

  describe('Loading et États d\'Erreur', () => {
    test('affiche skeleton pendant chargement', async () => {
      const { useBusinessAlerts } = vi.mocked(await import('@/hooks/useBusinessAlerts'));
      useBusinessAlerts.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        refetch: vi.fn()
      });

      renderWithProviders(<BusinessAlertsOverview />);

      expect(screen.getByTestId('overview-skeleton')).toBeInTheDocument();
      expect(screen.queryByTestId('metric-total-alerts')).not.toBeInTheDocument();
    });

    test('affiche message erreur si échec chargement', async () => {
      const { useBusinessAlerts } = vi.mocked(await import('@/hooks/useBusinessAlerts'));
      useBusinessAlerts.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Erreur serveur'),
        refetch: vi.fn()
      });

      renderWithProviders(<BusinessAlertsOverview />);

      expect(screen.getByTestId('overview-error')).toBeInTheDocument();
      expect(screen.getByText(/erreur lors du chargement/i)).toBeInTheDocument();
      expect(screen.getByTestId('button-retry-overview')).toBeInTheDocument();
    });

    test('bouton retry fonctionne', async () => {
      const user = userEvent.setup();
      const mockRefetch = vi.fn();
      
      const { useBusinessAlerts } = vi.mocked(await import('@/hooks/useBusinessAlerts'));
      useBusinessAlerts.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Erreur serveur'),
        refetch: mockRefetch
      });

      renderWithProviders(<BusinessAlertsOverview />);

      const retryButton = screen.getByTestId('button-retry-overview');
      await user.click(retryButton);

      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  // ========================================
  // TESTS BUSINESS ALERTS LIST
  // ========================================

  describe('BusinessAlertsList - Affichage et Filtrage', () => {
    test('affiche liste alertes avec informations complètes', () => {
      renderWithProviders(<BusinessAlertsList />);

      // Header liste
      expect(screen.getByTestId('alerts-list-header')).toBeInTheDocument();
      expect(screen.getByTestId('alerts-count')).toHaveTextContent('3 alertes');

      // Alertes individuelles
      expect(screen.getByTestId('alert-item-alert1')).toBeInTheDocument();
      expect(screen.getByTestId('alert-item-alert2')).toBeInTheDocument();
      expect(screen.getByTestId('alert-item-alert3')).toBeInTheDocument();

      // Informations alertes
      const alert1 = screen.getByTestId('alert-item-alert1');
      expect(within(alert1).getByText('Projet École Primaire')).toBeInTheDocument();
      expect(within(alert1).getByText('Marge projet inférieure au seuil critique')).toBeInTheDocument();
      expect(within(alert1).getByTestId('severity-badge-high')).toBeInTheDocument();
      expect(within(alert1).getByTestId('status-badge-open')).toBeInTheDocument();
    });

    test('filtrage par status fonctionne', async () => {
      const user = userEvent.setup();
      renderWithProviders(<BusinessAlertsList />);

      // Filtre par status
      const statusFilter = screen.getByTestId('filter-status');
      await user.selectOptions(statusFilter, 'open');

      // Vérifier que seules les alertes ouvertes sont affichées
      expect(screen.getByTestId('alert-item-alert1')).toBeInTheDocument();
      expect(screen.queryByTestId('alert-item-alert2')).not.toBeInTheDocument();
      expect(screen.queryByTestId('alert-item-alert3')).not.toBeInTheDocument();
    });

    test('filtrage par sévérité fonctionne', async () => {
      const user = userEvent.setup();
      renderWithProviders(<BusinessAlertsList />);

      const severityFilter = screen.getByTestId('filter-severity');
      await user.selectOptions(severityFilter, 'critical');

      // Seule l'alerte critique devrait être visible
      expect(screen.queryByTestId('alert-item-alert1')).not.toBeInTheDocument();
      expect(screen.queryByTestId('alert-item-alert2')).not.toBeInTheDocument();
      expect(screen.getByTestId('alert-item-alert3')).toBeInTheDocument();
    });

    test('tri par date création fonctionne', async () => {
      const user = userEvent.setup();
      renderWithProviders(<BusinessAlertsList />);

      const sortSelect = screen.getByTestId('sort-select');
      await user.selectOptions(sortSelect, 'created_at_desc');

      // Vérifier ordre (plus récent en premier)
      const alertItems = screen.getAllByTestId(/alert-item-/);
      expect(alertItems[0]).toHaveAttribute('data-testid', 'alert-item-alert1'); // 2024-02-15
      expect(alertItems[1]).toHaveAttribute('data-testid', 'alert-item-alert2'); // 2024-02-14
      expect(alertItems[2]).toHaveAttribute('data-testid', 'alert-item-alert3'); // 2024-02-10
    });

    test('recherche par nom entité fonctionne', async () => {
      const user = userEvent.setup();
      renderWithProviders(<BusinessAlertsList />);

      const searchInput = screen.getByTestId('search-entity');
      await user.type(searchInput, 'École');

      // Seule l'alerte de l'école devrait être visible
      expect(screen.getByTestId('alert-item-alert1')).toBeInTheDocument();
      expect(screen.queryByTestId('alert-item-alert2')).not.toBeInTheDocument();
      expect(screen.queryByTestId('alert-item-alert3')).not.toBeInTheDocument();
    });
  });

  // ========================================
  // TESTS WORKFLOW ACKNOWLEDGE
  // ========================================

  describe('Workflow Acknowledge avec Mutation', () => {
    test('workflow acknowledge avec mutation fonctionne', async () => {
      const user = userEvent.setup();
      const mockAcknowledge = vi.fn().mockResolvedValue({
        id: 'alert1',
        status: 'acknowledged',
        acknowledged_by: 'user1',
        acknowledged_at: new Date(),
        assigned_to: 'user2'
      });

      const { useAcknowledgeAlert } = vi.mocked(await import('@/hooks/useBusinessAlerts'));
      useAcknowledgeAlert.mockReturnValue({
        mutateAsync: mockAcknowledge,
        isPending: false
      });

      renderWithProviders(<BusinessAlertsList />);

      // Cliquer sur bouton acknowledge de l'alerte ouverte
      const alert1 = screen.getByTestId('alert-item-alert1');
      const acknowledgeButton = within(alert1).getByTestId('button-acknowledge-alert1');
      
      await user.click(acknowledgeButton);

      // Vérifier ouverture modal acknowledge
      expect(screen.getByTestId('modal-acknowledge-alert')).toBeInTheDocument();
      expect(screen.getByTestId('select-assigned-to')).toBeInTheDocument();
      expect(screen.getByTestId('textarea-acknowledge-notes')).toBeInTheDocument();

      // Remplir le formulaire
      const assignSelect = screen.getByTestId('select-assigned-to');
      await user.selectOptions(assignSelect, 'user2');

      const notesTextarea = screen.getByTestId('textarea-acknowledge-notes');
      await user.type(notesTextarea, 'Prise en charge par équipe technique');

      // Confirmer acknowledge
      const confirmButton = screen.getByTestId('button-confirm-acknowledge');
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockAcknowledge).toHaveBeenCalledWith({
          alertId: 'alert1',
          assigned_to: 'user2',
          notes: 'Prise en charge par équipe technique'
        });
      });
    });

    test('acknowledge button disabled pendant mutation', async () => {
      const { useAcknowledgeAlert } = vi.mocked(await import('@/hooks/useBusinessAlerts'));
      useAcknowledgeAlert.mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: true
      });

      renderWithProviders(<BusinessAlertsList />);

      const alert1 = screen.getByTestId('alert-item-alert1');
      const acknowledgeButton = within(alert1).getByTestId('button-acknowledge-alert1');
      
      expect(acknowledgeButton).toBeDisabled();
      expect(acknowledgeButton).toHaveTextContent(/en cours/i);
    });

    test('gestion erreur acknowledge avec message', async () => {
      const user = userEvent.setup();
      const mockAcknowledge = vi.fn().mockRejectedValue(new Error('Erreur serveur'));

      const { useAcknowledgeAlert } = vi.mocked(await import('@/hooks/useBusinessAlerts'));
      useAcknowledgeAlert.mockReturnValue({
        mutateAsync: mockAcknowledge,
        isPending: false
      });

      renderWithProviders(<BusinessAlertsList />);

      const alert1 = screen.getByTestId('alert-item-alert1');
      const acknowledgeButton = within(alert1).getByTestId('button-acknowledge-alert1');
      
      await user.click(acknowledgeButton);

      const confirmButton = screen.getByTestId('button-confirm-acknowledge');
      await user.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByTestId('error-acknowledge')).toBeInTheDocument();
        expect(screen.getByText(/erreur serveur/i)).toBeInTheDocument();
      });
    });

    test('invalidation cache après acknowledge réussi', async () => {
      const user = userEvent.setup();
      const mockInvalidateQueries = vi.fn();
      
      // Mock query client
      const { queryClient } = vi.mocked(await import('@/lib/queryClient'));
      queryClient.invalidateQueries = mockInvalidateQueries;

      const mockAcknowledge = vi.fn().mockResolvedValue({ success: true });

      const { useAcknowledgeAlert } = vi.mocked(await import('@/hooks/useBusinessAlerts'));
      useAcknowledgeAlert.mockReturnValue({
        mutateAsync: mockAcknowledge,
        isPending: false
      });

      renderWithProviders(<BusinessAlertsList />);

      const alert1 = screen.getByTestId('alert-item-alert1');
      const acknowledgeButton = within(alert1).getByTestId('button-acknowledge-alert1');
      
      await user.click(acknowledgeButton);
      
      const confirmButton = screen.getByTestId('button-confirm-acknowledge');
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockInvalidateQueries).toHaveBeenCalledWith(['business-alerts']);
      });
    });
  });

  // ========================================
  // TESTS WORKFLOW RESOLVE AVEC NOTES OBLIGATOIRES
  // ========================================

  describe('Workflow Resolve avec Notes Obligatoires', () => {
    test('workflow resolve avec notes obligatoires', async () => {
      const user = userEvent.setup();
      const mockResolve = vi.fn().mockResolvedValue({
        id: 'alert2',
        status: 'resolved',
        resolved_by: 'user1',
        resolved_at: new Date(),
        resolution_notes: 'Problème résolu par redistribution des tâches'
      });

      const { useResolveAlert } = vi.mocked(await import('@/hooks/useBusinessAlerts'));
      useResolveAlert.mockReturnValue({
        mutateAsync: mockResolve,
        isPending: false
      });

      renderWithProviders(<BusinessAlertsList />);

      // Cliquer sur bouton resolve de l'alerte acknowledged
      const alert2 = screen.getByTestId('alert-item-alert2');
      const resolveButton = within(alert2).getByTestId('button-resolve-alert2');
      
      await user.click(resolveButton);

      // Vérifier ouverture modal resolve
      expect(screen.getByTestId('modal-resolve-alert')).toBeInTheDocument();
      expect(screen.getByTestId('textarea-resolution-notes')).toBeInTheDocument();

      // Essayer de confirmer sans notes (doit échouer)
      const confirmButton = screen.getByTestId('button-confirm-resolve');
      await user.click(confirmButton);

      // Vérifier message erreur validation
      expect(screen.getByTestId('error-resolution-notes-required')).toBeInTheDocument();
      expect(screen.getByText(/notes de résolution obligatoires/i)).toBeInTheDocument();

      // Ajouter notes de résolution
      const notesTextarea = screen.getByTestId('textarea-resolution-notes');
      await user.type(notesTextarea, 'Problème résolu par redistribution des tâches');

      // Confirmer avec notes
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockResolve).toHaveBeenCalledWith({
          alertId: 'alert2',
          resolution_notes: 'Problème résolu par redistribution des tâches'
        });
      });
    });

    test('validation notes minimum 10 caractères', async () => {
      const user = userEvent.setup();
      renderWithProviders(<BusinessAlertsList />);

      const alert2 = screen.getByTestId('alert-item-alert2');
      const resolveButton = within(alert2).getByTestId('button-resolve-alert2');
      
      await user.click(resolveButton);

      const notesTextarea = screen.getByTestId('textarea-resolution-notes');
      await user.type(notesTextarea, 'Court'); // Trop court

      const confirmButton = screen.getByTestId('button-confirm-resolve');
      await user.click(confirmButton);

      expect(screen.getByTestId('error-resolution-notes-too-short')).toBeInTheDocument();
      expect(screen.getByText(/minimum 10 caractères/i)).toBeInTheDocument();
    });

    test('seules alertes acknowledged peuvent être resolved', () => {
      renderWithProviders(<BusinessAlertsList />);

      // Alerte open - pas de bouton resolve
      const alert1 = screen.getByTestId('alert-item-alert1');
      expect(within(alert1).queryByTestId('button-resolve-alert1')).not.toBeInTheDocument();

      // Alerte acknowledged - bouton resolve présent
      const alert2 = screen.getByTestId('alert-item-alert2');
      expect(within(alert2).getByTestId('button-resolve-alert2')).toBeInTheDocument();

      // Alerte resolved - bouton resolve absent
      const alert3 = screen.getByTestId('alert-item-alert3');
      expect(within(alert3).queryByTestId('button-resolve-alert3')).not.toBeInTheDocument();
    });

    test('affichage notes de résolution pour alertes resolved', () => {
      renderWithProviders(<BusinessAlertsList />);

      const alert3 = screen.getByTestId('alert-item-alert3');
      expect(within(alert3).getByTestId('resolution-notes')).toBeInTheDocument();
      expect(within(alert3).getByText('Équipe technique renforcée, planning réajusté')).toBeInTheDocument();
      expect(within(alert3).getByTestId('resolved-by-info')).toBeInTheDocument();
      expect(within(alert3).getByText(/résolu par user2/i)).toBeInTheDocument();
    });
  });

  // ========================================
  // TESTS SEUILS CONFIGURABLES GESTION
  // ========================================

  describe('Gestion Seuils Configurables', () => {
    test('affiche panneau configuration seuils', async () => {
      const user = userEvent.setup();
      renderWithProviders(<BusinessAlertsList />);

      const configButton = screen.getByTestId('button-configure-thresholds');
      await user.click(configButton);

      expect(screen.getByTestId('panel-threshold-configuration')).toBeInTheDocument();
      expect(screen.getByTestId('threshold-list')).toBeInTheDocument();
    });

    test('liste seuils existants avec valeurs', async () => {
      const user = userEvent.setup();
      renderWithProviders(<BusinessAlertsList />);

      const configButton = screen.getByTestId('button-configure-thresholds');
      await user.click(configButton);

      // Vérifier seuils listés
      expect(screen.getByTestId('threshold-item-project_margin')).toBeInTheDocument();
      expect(screen.getByTestId('threshold-item-team_utilization')).toBeInTheDocument();
      expect(screen.getByTestId('threshold-item-risk_score')).toBeInTheDocument();

      // Vérifier valeurs affichées
      const marginThreshold = screen.getByTestId('threshold-item-project_margin');
      expect(within(marginThreshold).getByText('15%')).toBeInTheDocument();
      expect(within(marginThreshold).getByText('supérieur à')).toBeInTheDocument();
    });

    test('modification seuil existant fonctionne', async () => {
      const user = userEvent.setup();
      const mockUpdateThreshold = vi.fn().mockResolvedValue({ success: true });

      const { useUpdateThreshold } = vi.mocked(await import('@/hooks/useBusinessAlerts'));
      useUpdateThreshold.mockReturnValue({
        mutateAsync: mockUpdateThreshold,
        isPending: false
      });

      renderWithProviders(<BusinessAlertsList />);

      const configButton = screen.getByTestId('button-configure-thresholds');
      await user.click(configButton);

      // Cliquer sur édition seuil marge
      const marginThreshold = screen.getByTestId('threshold-item-project_margin');
      const editButton = within(marginThreshold).getByTestId('button-edit-threshold');
      await user.click(editButton);

      // Modifier valeur
      const valueInput = screen.getByTestId('input-threshold-value');
      await user.clear(valueInput);
      await user.type(valueInput, '18');

      // Sauvegarder
      const saveButton = screen.getByTestId('button-save-threshold');
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockUpdateThreshold).toHaveBeenCalledWith({
          key: 'project_margin',
          value: 18,
          operator: 'greater_than',
          is_active: true
        });
      });
    });

    test('création nouveau seuil fonctionne', async () => {
      const user = userEvent.setup();
      const mockUpdateThreshold = vi.fn().mockResolvedValue({ success: true });

      const { useUpdateThreshold } = vi.mocked(await import('@/hooks/useBusinessAlerts'));
      useUpdateThreshold.mockReturnValue({
        mutateAsync: mockUpdateThreshold,
        isPending: false
      });

      renderWithProviders(<BusinessAlertsList />);

      const configButton = screen.getByTestId('button-configure-thresholds');
      await user.click(configButton);

      // Cliquer sur nouveau seuil
      const newButton = screen.getByTestId('button-new-threshold');
      await user.click(newButton);

      // Remplir formulaire
      const keySelect = screen.getByTestId('select-threshold-key');
      await user.selectOptions(keySelect, 'global_margin');

      const valueInput = screen.getByTestId('input-threshold-value');
      await user.type(valueInput, '20');

      const operatorSelect = screen.getByTestId('select-threshold-operator');
      await user.selectOptions(operatorSelect, 'greater_than');

      // Sauvegarder
      const saveButton = screen.getByTestId('button-save-new-threshold');
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockUpdateThreshold).toHaveBeenCalledWith({
          key: 'global_margin',
          value: 20,
          operator: 'greater_than',
          is_active: true
        });
      });
    });

    test('désactivation seuil fonctionne', async () => {
      const user = userEvent.setup();
      const mockUpdateThreshold = vi.fn().mockResolvedValue({ success: true });

      const { useUpdateThreshold } = vi.mocked(await import('@/hooks/useBusinessAlerts'));
      useUpdateThreshold.mockReturnValue({
        mutateAsync: mockUpdateThreshold,
        isPending: false
      });

      renderWithProviders(<BusinessAlertsList />);

      const configButton = screen.getByTestId('button-configure-thresholds');
      await user.click(configButton);

      // Toggle désactivation
      const marginThreshold = screen.getByTestId('threshold-item-project_margin');
      const toggleSwitch = within(marginThreshold).getByTestId('switch-threshold-active');
      await user.click(toggleSwitch);

      await waitFor(() => {
        expect(mockUpdateThreshold).toHaveBeenCalledWith({
          key: 'project_margin',
          value: 15,
          operator: 'greater_than',
          is_active: false
        });
      });
    });
  });

  // ========================================
  // TESTS PERFORMANCE ET ACCESSIBILITÉ
  // ========================================

  describe('Performance et Accessibilité', () => {
    test('rendu liste 100 alertes performant', async () => {
      // Mock large dataset
      const largeAlertsList = Array.from({ length: 100 }, (_, i) => ({
        ...mockBusinessAlerts[0],
        id: `alert${i}`,
        entity_name: `Projet ${i}`
      }));

      const { useBusinessAlerts } = vi.mocked(await import('@/hooks/useBusinessAlerts'));
      useBusinessAlerts.mockReturnValue({
        data: largeAlertsList,
        isLoading: false,
        error: null,
        refetch: vi.fn()
      });

      const startTime = Date.now();
      renderWithProviders(<BusinessAlertsList />);
      const renderTime = Date.now() - startTime;

      expect(renderTime).toBeLessThan(500); // Rendu < 500ms pour 100 items
      expect(screen.getByTestId('alerts-count')).toHaveTextContent('100 alertes');
    });

    test('pagination fonctionne pour grandes listes', async () => {
      const user = userEvent.setup();
      
      // Mock 50 alertes pour tester pagination
      const manyAlerts = Array.from({ length: 50 }, (_, i) => ({
        ...mockBusinessAlerts[0],
        id: `alert${i}`,
        entity_name: `Projet ${i}`
      }));

      const { useBusinessAlerts } = vi.mocked(await import('@/hooks/useBusinessAlerts'));
      useBusinessAlerts.mockReturnValue({
        data: manyAlerts,
        isLoading: false,
        error: null,
        refetch: vi.fn()
      });

      renderWithProviders(<BusinessAlertsList />);

      // Vérifier pagination
      expect(screen.getByTestId('pagination-controls')).toBeInTheDocument();
      expect(screen.getByTestId('pagination-info')).toHaveTextContent('1-20 sur 50');

      // Page suivante
      const nextButton = screen.getByTestId('button-pagination-next');
      await user.click(nextButton);

      expect(screen.getByTestId('pagination-info')).toHaveTextContent('21-40 sur 50');
    });

    test('navigation clavier fonctionne', async () => {
      const user = userEvent.setup();
      renderWithProviders(<BusinessAlertsList />);

      // Focus premier item
      const firstAlert = screen.getByTestId('alert-item-alert1');
      firstAlert.focus();
      expect(firstAlert).toHaveFocus();

      // Navigation avec flèches
      await user.keyboard('{ArrowDown}');
      const secondAlert = screen.getByTestId('alert-item-alert2');
      expect(secondAlert).toHaveFocus();

      // Activation avec Enter
      await user.keyboard('{Enter}');
      expect(screen.getByTestId('alert-details-alert2')).toBeInTheDocument();
    });

    test('labels ARIA présents pour accessibilité', () => {
      renderWithProviders(<BusinessAlertsList />);

      expect(screen.getByRole('list', { name: /liste des alertes/i })).toBeInTheDocument();
      
      const alertItems = screen.getAllByRole('listitem');
      alertItems.forEach(item => {
        expect(item).toHaveAttribute('aria-labelledby');
      });

      const acknowledgeButtons = screen.getAllByTestId(/button-acknowledge-/);
      acknowledgeButtons.forEach(button => {
        expect(button).toHaveAttribute('aria-label');
      });
    });
  });
});