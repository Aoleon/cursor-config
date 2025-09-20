import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import ExecutiveDashboard from '../../client/src/pages/ExecutiveDashboard';

// Mock des hooks analytics
vi.mock('../../client/src/hooks/useAnalytics', () => ({
  useExecutiveDashboard: vi.fn(),
  useConversionTrends: vi.fn(),
  useMarginAnalysis: vi.fn(),
  useExecutiveAlerts: vi.fn(),
  useGenerateSnapshot: vi.fn(),
  useExportReport: vi.fn(),
}));

// Mock des utilitaires de formatage
vi.mock('../../client/src/utils/formatters', () => ({
  formatCurrency: vi.fn((amount) => `${amount}€`),
  formatPercentage: vi.fn((value) => `${value}%`),
  formatTrend: vi.fn(() => ({ value: 5, direction: 'up', color: 'text-green-600' })),
  formatDuration: vi.fn((days) => `${days}j`),
  getProgressColor: vi.fn(() => 'bg-green-500'),
}));

// Mock Recharts pour éviter les erreurs de rendu
vi.mock('recharts', () => ({
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div data-testid="pie" />,
  Cell: () => <div data-testid="cell" />,
}));

const mockExecutiveDashboardData = {
  kpis: {
    data: {
      conversion_rate_offer_to_project: 65.5,
      conversion_trend: 8.2,
      total_revenue_forecast: 2500000,
      revenue_trend: 12.5,
      avg_delay_days: 12.3,
      delay_trend: -5.1,
      avg_team_load_percentage: 78.5,
      load_trend: 3.2,
      critical_alerts_count: 3,
      performance_score: 85.7,
      last_updated: new Date().toISOString(),
    },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  },
  pipeline: {
    data: {
      ao_count: 45,
      ao_total_value: 3200000,
      offer_count: 28,
      offer_total_value: 2800000,
      project_count: 18,
      project_total_value: 2100000,
      ao_to_offer_rate: 62.2,
      offer_to_project_rate: 64.3,
      global_conversion_rate: 40.0,
      forecast_3_months: [
        { month: 'Jan 2025', predicted_value: 850000, confidence: 85 },
        { month: 'Fév 2025', predicted_value: 920000, confidence: 78 },
        { month: 'Mar 2025', predicted_value: 1100000, confidence: 72 },
      ],
    },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  },
  teamMetrics: {
    data: [
      { userId: '1', userName: 'Jean Dupont', load_percentage: 85, efficiency: 92, projects_count: 5 },
      { userId: '2', userName: 'Marie Martin', load_percentage: 72, efficiency: 88, projects_count: 4 },
      { userId: '3', userName: 'Pierre Bernard', load_percentage: 95, efficiency: 85, projects_count: 6 },
    ],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  },
  benchmarks: {
    data: {
      topPerformers: [
        { name: 'Jean Dupont', score: 92.5 },
        { name: 'Marie Martin', score: 88.3 },
        { name: 'Pierre Bernard', score: 85.7 },
      ],
    },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  },
  isLoading: false,
  refreshAll: vi.fn(),
};

const mockConversionTrends = {
  data: {
    data: [
      { period: 'Nov 2024', conversion_rate: 58.5 },
      { period: 'Déc 2024', conversion_rate: 62.3 },
      { period: 'Jan 2025', conversion_rate: 65.5 },
    ],
  },
  isLoading: false,
  error: null,
  refetch: vi.fn(),
};

const mockMarginAnalysis = {
  data: {
    data: {
      byCategory: [
        { category: 'Fenêtres', margin: 28.5 },
        { category: 'Portes', margin: 32.1 },
        { category: 'Volets', margin: 25.8 },
      ],
    },
  },
  isLoading: false,
  error: null,
  refetch: vi.fn(),
};

const mockExecutiveAlerts = {
  data: {
    total_alerts: 12,
    critical_count: 3,
    warning_count: 6,
    resolved_count: 3,
    avg_resolution_time: 2.5,
    recent_alerts: [
      {
        id: '1',
        title: 'Retard critique sur Projet ABC',
        message: 'Le projet ABC accuse un retard de 15 jours',
        severity: 'critical',
        created_at: new Date().toISOString(),
      },
      {
        id: '2',
        title: 'Surcharge équipe',
        message: 'L\'équipe X dépasse 95% de charge',
        severity: 'warning',
        created_at: new Date().toISOString(),
      },
    ],
  },
  isLoading: false,
  error: null,
  refetch: vi.fn(),
};

const mockGenerateSnapshot = {
  mutateAsync: vi.fn().mockResolvedValue({ success: true }),
  isPending: false,
  error: null,
};

const mockExportReport = {
  mutateAsync: vi.fn().mockResolvedValue(new Blob(['mock pdf'], { type: 'application/pdf' })),
  isPending: false,
  error: null,
};

function TestWrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

describe('ExecutiveDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Configuration des mocks par défaut
    const { useExecutiveDashboard, useConversionTrends, useMarginAnalysis, useExecutiveAlerts, useGenerateSnapshot, useExportReport } = require('../../client/src/hooks/useAnalytics');
    
    useExecutiveDashboard.mockReturnValue(mockExecutiveDashboardData);
    useConversionTrends.mockReturnValue(mockConversionTrends);
    useMarginAnalysis.mockReturnValue(mockMarginAnalysis);
    useExecutiveAlerts.mockReturnValue(mockExecutiveAlerts);
    useGenerateSnapshot.mockReturnValue(mockGenerateSnapshot);
    useExportReport.mockReturnValue(mockExportReport);
  });

  test('should render the main dashboard structure', () => {
    render(
      <TestWrapper>
        <ExecutiveDashboard />
      </TestWrapper>
    );

    expect(screen.getByTestId('executive-dashboard')).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-header')).toBeInTheDocument();
    expect(screen.getByTestId('kpi-overview')).toBeInTheDocument();
  });

  test('should display dashboard header with title and actions', () => {
    render(
      <TestWrapper>
        <ExecutiveDashboard />
      </TestWrapper>
    );

    expect(screen.getByText('Dashboard Dirigeant')).toBeInTheDocument();
    expect(screen.getByText(/Vue d'ensemble opérationnelle/)).toBeInTheDocument();
    expect(screen.getByTestId('button-export-report')).toBeInTheDocument();
    expect(screen.getByTestId('button-generate-snapshot')).toBeInTheDocument();
  });

  test('should display KPI overview cards', async () => {
    render(
      <TestWrapper>
        <ExecutiveDashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('kpi-conversion-rate')).toBeInTheDocument();
      expect(screen.getByTestId('kpi-revenue-forecast')).toBeInTheDocument();
      expect(screen.getByTestId('kpi-avg-delay')).toBeInTheDocument();
      expect(screen.getByTestId('kpi-team-load')).toBeInTheDocument();
    });

    // Vérifier que les valeurs sont affichées
    expect(screen.getByText('Taux Conversion')).toBeInTheDocument();
    expect(screen.getByText('CA Prévisionnel')).toBeInTheDocument();
    expect(screen.getByText('Délai Moyen')).toBeInTheDocument();
    expect(screen.getByText('Charge Équipes')).toBeInTheDocument();
  });

  test('should display loading state for KPIs', () => {
    const { useExecutiveDashboard } = require('@/hooks/useAnalytics');
    useExecutiveDashboard.mockReturnValue({
      ...mockExecutiveDashboardData,
      kpis: { ...mockExecutiveDashboardData.kpis, isLoading: true },
    });

    render(
      <TestWrapper>
        <ExecutiveDashboard />
      </TestWrapper>
    );

    expect(screen.getByTestId('kpi-overview-loading')).toBeInTheDocument();
  });

  test('should handle tab navigation', () => {
    render(
      <TestWrapper>
        <ExecutiveDashboard />
      </TestWrapper>
    );

    // Vérifier que l'onglet Performance est actif par défaut
    expect(screen.getByTestId('performance-tab')).toBeInTheDocument();

    // Cliquer sur l'onglet Pipeline
    fireEvent.click(screen.getByTestId('tab-pipeline'));
    expect(screen.getByTestId('pipeline-tab')).toBeInTheDocument();

    // Cliquer sur l'onglet Opérations
    fireEvent.click(screen.getByTestId('tab-operations'));
    expect(screen.getByTestId('operations-tab')).toBeInTheDocument();

    // Cliquer sur l'onglet Alertes
    fireEvent.click(screen.getByTestId('tab-alerts'));
    expect(screen.getByTestId('alerts-tab')).toBeInTheDocument();
  });

  test('should display performance tab content', () => {
    render(
      <TestWrapper>
        <ExecutiveDashboard />
      </TestWrapper>
    );

    expect(screen.getByText('Évolution Taux Conversion')).toBeInTheDocument();
    expect(screen.getByText('Top Performers')).toBeInTheDocument();
    expect(screen.getByText('Analyse Marges par Catégorie')).toBeInTheDocument();
  });

  test('should display pipeline tab content', () => {
    render(
      <TestWrapper>
        <ExecutiveDashboard />
      </TestWrapper>
    );

    fireEvent.click(screen.getByTestId('tab-pipeline'));

    expect(screen.getByTestId('pipeline-ao')).toBeInTheDocument();
    expect(screen.getByTestId('pipeline-offers')).toBeInTheDocument();
    expect(screen.getByTestId('pipeline-projects')).toBeInTheDocument();
    expect(screen.getByText('Pipeline Forecast 3 Mois')).toBeInTheDocument();
  });

  test('should display operations tab content', () => {
    render(
      <TestWrapper>
        <ExecutiveDashboard />
      </TestWrapper>
    );

    fireEvent.click(screen.getByTestId('tab-operations'));

    expect(screen.getByText('Charge Équipes par Utilisateur')).toBeInTheDocument();
    expect(screen.getByText('Distribution Charge Équipes')).toBeInTheDocument();
  });

  test('should display alerts tab content', () => {
    render(
      <TestWrapper>
        <ExecutiveDashboard />
      </TestWrapper>
    );

    fireEvent.click(screen.getByTestId('tab-alerts'));

    expect(screen.getByText('Résumé des Alertes')).toBeInTheDocument();
    expect(screen.getByText('Alertes Récentes')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument(); // Critical alerts count
  });

  test('should generate snapshot on button click', async () => {
    render(
      <TestWrapper>
        <ExecutiveDashboard />
      </TestWrapper>
    );

    const generateButton = screen.getByTestId('button-generate-snapshot');
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(mockGenerateSnapshot.mutateAsync).toHaveBeenCalledWith({
        type: 'full',
        includeCharts: true,
        format: 'json',
      });
    });
  });

  test('should export report on button click', async () => {
    // Mock URL.createObjectURL and related methods
    global.URL.createObjectURL = vi.fn(() => 'mock-url');
    global.URL.revokeObjectURL = vi.fn();
    
    // Mock document.createElement and related methods
    const mockAnchor = {
      href: '',
      download: '',
      click: vi.fn(),
    };
    vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any);
    vi.spyOn(document.body, 'appendChild').mockImplementation();
    vi.spyOn(document.body, 'removeChild').mockImplementation();

    render(
      <TestWrapper>
        <ExecutiveDashboard />
      </TestWrapper>
    );

    const exportButton = screen.getByTestId('button-export-report');
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(mockExportReport.mutateAsync).toHaveBeenCalledWith('pdf');
    });
  });

  test('should show pending state for generate snapshot', () => {
    const { useGenerateSnapshot } = require('../../client/src/hooks/useAnalytics');
    useGenerateSnapshot.mockReturnValue({
      ...mockGenerateSnapshot,
      isPending: true,
    });

    render(
      <TestWrapper>
        <ExecutiveDashboard />
      </TestWrapper>
    );

    const generateButton = screen.getByTestId('button-generate-snapshot');
    expect(generateButton.textContent).toContain('Génération...');
    expect(generateButton.hasAttribute('disabled')).toBe(true);
  });

  test('should show pending state for export report', () => {
    const { useExportReport } = require('../../client/src/hooks/useAnalytics');
    useExportReport.mockReturnValue({
      ...mockExportReport,
      isPending: true,
    });

    render(
      <TestWrapper>
        <ExecutiveDashboard />
      </TestWrapper>
    );

    const exportButton = screen.getByTestId('button-export-report');
    expect(exportButton.textContent).toContain('Export...');
    expect(exportButton.hasAttribute('disabled')).toBe(true);
  });

  test('should render charts in performance tab', () => {
    render(
      <TestWrapper>
        <ExecutiveDashboard />
      </TestWrapper>
    );

    // Les charts sont mockés, on vérifie qu'ils sont présents
    expect(screen.getAllByTestId('responsive-container')).toHaveLength(1);
  });

  test('should handle team metrics loading state', () => {
    const { useExecutiveDashboard } = require('@/hooks/useAnalytics');
    useExecutiveDashboard.mockReturnValue({
      ...mockExecutiveDashboardData,
      teamMetrics: { ...mockExecutiveDashboardData.teamMetrics, isLoading: true },
    });

    render(
      <TestWrapper>
        <ExecutiveDashboard />
      </TestWrapper>
    );

    fireEvent.click(screen.getByTestId('tab-operations'));
    
    // Vérifier que le skeleton est affiché
    expect(screen.getByTestId('operations-tab')).toBeInTheDocument();
  });

  test('should display formatted KPI values', () => {
    render(
      <TestWrapper>
        <ExecutiveDashboard />
      </TestWrapper>
    );

    // Vérifier que les fonctions de formatage sont utilisées
    const { formatCurrency, formatPercentage, formatDuration } = require('../../client/src/utils/formatters');
    
    expect(formatPercentage).toHaveBeenCalled();
    expect(formatCurrency).toHaveBeenCalled();
    expect(formatDuration).toHaveBeenCalled();
  });

  test('should handle variant styling for KPI cards', () => {
    // Test avec des valeurs qui déclenchent les variants
    const { useExecutiveDashboard } = require('@/hooks/useAnalytics');
    useExecutiveDashboard.mockReturnValue({
      ...mockExecutiveDashboardData,
      kpis: {
        ...mockExecutiveDashboardData.kpis,
        data: {
          ...mockExecutiveDashboardData.kpis.data,
          avg_delay_days: 20, // > 15 should trigger warning
          avg_team_load_percentage: 90, // > 85 should trigger danger
        },
      },
    });

    render(
      <TestWrapper>
        <ExecutiveDashboard />
      </TestWrapper>
    );

    expect(screen.getByTestId('kpi-avg-delay')).toBeInTheDocument();
    expect(screen.getByTestId('kpi-team-load')).toBeInTheDocument();
  });
});

describe('ExecutiveDashboard Error Handling', () => {
  test('should handle API errors gracefully', () => {
    const { useExecutiveDashboard } = require('@/hooks/useAnalytics');
    useExecutiveDashboard.mockReturnValue({
      ...mockExecutiveDashboardData,
      kpis: {
        ...mockExecutiveDashboardData.kpis,
        error: new Error('API Error'),
        isLoading: false,
      },
    });

    render(
      <TestWrapper>
        <ExecutiveDashboard />
      </TestWrapper>
    );

    // L'interface devrait s'afficher malgré l'erreur
    expect(screen.getByTestId('executive-dashboard')).toBeInTheDocument();
  });

  test('should handle empty data gracefully', () => {
    const { useExecutiveDashboard } = require('@/hooks/useAnalytics');
    useExecutiveDashboard.mockReturnValue({
      ...mockExecutiveDashboardData,
      kpis: {
        ...mockExecutiveDashboardData.kpis,
        data: undefined,
      },
      pipeline: {
        ...mockExecutiveDashboardData.pipeline,
        data: undefined,
      },
      teamMetrics: {
        ...mockExecutiveDashboardData.teamMetrics,
        data: undefined,
      },
    });

    render(
      <TestWrapper>
        <ExecutiveDashboard />
      </TestWrapper>
    );

    // L'interface devrait s'afficher avec des valeurs par défaut
    expect(screen.getByTestId('executive-dashboard')).toBeInTheDocument();
    expect(screen.getByTestId('kpi-overview')).toBeInTheDocument();
  });
});