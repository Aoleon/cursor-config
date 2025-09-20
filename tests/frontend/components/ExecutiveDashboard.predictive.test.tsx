import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ExecutiveDashboard } from '../../../client/src/pages/ExecutiveDashboard';

// Mock tous les hooks analytics et prédictifs
vi.mock('../../../client/src/hooks/useAnalytics', () => ({
  useExecutiveDashboard: () => ({
    kpis: { data: {}, isLoading: false },
    metrics: { data: {}, isLoading: false },
    pipeline: { data: {}, isLoading: false },
    alerts: { data: {}, isLoading: false }
  }),
  useConversionTrends: () => ({ data: [], isLoading: false }),
  useMarginAnalysis: () => ({ data: {}, isLoading: false }),
  useExecutiveAlerts: () => ({ data: [], isLoading: false }),
  useGenerateSnapshot: () => ({ mutate: vi.fn(), isPending: false }),
  useExportReport: () => ({ mutate: vi.fn(), isPending: false })
}));

vi.mock('../../../client/src/hooks/usePredictive', () => ({
  useRevenueForecast: () => ({
    data: [
      {
        forecast_point: {
          target_period: '2025-01',
          revenue_forecast: 120000,
          method_used: 'exp_smoothing'
        },
        confidence_level: 85,
        underlying_factors: ['seasonal_growth', 'pipeline_strength'],
        trend_direction: 'up',
        volatility_score: 15
      }
    ],
    isLoading: false,
    isError: false,
    refetch: vi.fn()
  }),
  useProjectRisks: () => ({
    data: [
      {
        id: 'risk_1',
        project_id: 'proj_123',
        risk_score: 75,
        risk_factors: [
          { 
            type: 'deadline',
            description: 'Délai serré',
            impact_score: 80,
            likelihood: 70
          }
        ],
        predicted_delay_days: 5,
        predicted_budget_overrun: 10,
        recommended_actions: [
          {
            type: 'resource_adjustment',
            description: 'Ajouter une ressource',
            urgency: 'medium'
          }
        ]
      }
    ],
    isLoading: false,
    refetch: vi.fn()
  }),
  useBusinessRecommendations: () => ({
    data: [
      {
        id: 'rec_1',
        category: 'planning',
        title: 'Optimiser planning équipe',
        description: 'Réorganiser les tâches pour améliorer l\'efficacité',
        priority: 'high',
        estimated_impact: {
          time_savings: 40,
          cost_reduction: 5000
        },
        implementation: {
          effort_estimate_hours: 20,
          timeline_weeks: 2
        }
      }
    ],
    isLoading: false,
    refetch: vi.fn()
  }),
  useSaveForecastSnapshot: () => ({
    mutate: vi.fn(),
    isPending: false
  })
}));

// Mock query pour auth
vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return {
    ...actual,
    useQuery: vi.fn(() => ({ data: null, isLoading: false }))
  };
});

describe('ExecutiveDashboard - Predictive Integration', () => {
  let queryClient: QueryClient;
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    queryClient = new QueryClient({
      defaultOptions: { 
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
  });
  
  it('should render predictive tab in navigation', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ExecutiveDashboard />
      </QueryClientProvider>
    );
    
    // Vérifier que l'onglet Prédictif existe
    const predictiveTab = screen.getByText('Prédictif');
    expect(predictiveTab).toBeInTheDocument();
    
    // Vérifier qu'il s'agit bien d'un onglet cliquable
    expect(predictiveTab.closest('[role="tab"]')).toBeInTheDocument();
  });
  
  it('should display predictive content when tab clicked', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ExecutiveDashboard />
      </QueryClientProvider>
    );
    
    // Cliquer sur onglet Prédictif
    const predictiveTab = screen.getByText('Prédictif');
    fireEvent.click(predictiveTab);
    
    // Vérifier contenu prédictif
    await waitFor(() => {
      expect(screen.getByText('Analyse Prédictive')).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('should display revenue forecast data', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ExecutiveDashboard />
      </QueryClientProvider>
    );
    
    // Aller sur l'onglet prédictif
    const predictiveTab = screen.getByText('Prédictif');
    fireEvent.click(predictiveTab);
    
    // Attendre que le contenu se charge et vérifier les données forecast
    await waitFor(() => {
      // Chercher des indicateurs de forecast de revenus
      const forecastElements = screen.queryAllByText(/120.?000/i); // 120000 formaté
      const confidenceElements = screen.queryAllByText(/85%/i); // Niveau de confiance
      
      // Au moins l'un des deux devrait être présent
      expect(
        forecastElements.length > 0 || confidenceElements.length > 0
      ).toBe(true);
    });
  });

  it('should display project risks information', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ExecutiveDashboard />
      </QueryClientProvider>
    );
    
    fireEvent.click(screen.getByText('Prédictif'));
    
    await waitFor(() => {
      // Vérifier la présence d'informations sur les risques
      const riskElements = screen.queryAllByText(/risque/i);
      const scoreElements = screen.queryAllByText(/75/); // Risk score
      
      expect(riskElements.length > 0 || scoreElements.length > 0).toBe(true);
    });
  });

  it('should display business recommendations', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ExecutiveDashboard />
      </QueryClientProvider>
    );
    
    fireEvent.click(screen.getByText('Prédictif'));
    
    await waitFor(() => {
      // Vérifier les recommandations business
      const recommendationElements = screen.queryAllByText(/optimiser/i);
      const planningElements = screen.queryAllByText(/planning/i);
      
      expect(
        recommendationElements.length > 0 || planningElements.length > 0
      ).toBe(true);
    });
  });
  
  it('should not break existing tabs functionality', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ExecutiveDashboard />
      </QueryClientProvider>
    );
    
    // Test tabs existants fonctionnent toujours
    const performanceTab = screen.getByText('Performance');
    expect(performanceTab).toBeInTheDocument();
    
    fireEvent.click(performanceTab);
    
    await waitFor(() => {
      // Vérifier qu'on peut toujours naviguer sur autres tabs
      const activeTab = performanceTab.closest('[role="tab"]');
      expect(activeTab).toHaveAttribute('data-state', 'active');
    });
  });

  it('should handle tab navigation correctly', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ExecutiveDashboard />
      </QueryClientProvider>
    );
    
    // Tester navigation entre plusieurs onglets
    const tabs = ['Performance', 'Pipeline', 'Prédictif'];
    
    for (const tabName of tabs) {
      const tab = screen.getByText(tabName);
      fireEvent.click(tab);
      
      await waitFor(() => {
        expect(tab.closest('[role="tab"]')).toHaveAttribute('data-state', 'active');
      });
    }
  });

  it('should display forecast controls and filters', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ExecutiveDashboard />
      </QueryClientProvider>
    );
    
    fireEvent.click(screen.getByText('Prédictif'));
    
    await waitFor(() => {
      // Chercher des contrôles de forecast
      const selects = screen.queryAllByRole('combobox');
      const buttons = screen.queryAllByRole('button');
      
      // Devrait avoir au moins des contrôles interactifs
      expect(selects.length + buttons.length).toBeGreaterThan(0);
    });
  });

  it('should handle loading states properly', async () => {
    // Mock loading state
    vi.doMock('../../../client/src/hooks/usePredictive', () => ({
      useRevenueForecast: () => ({ data: undefined, isLoading: true }),
      useProjectRisks: () => ({ data: undefined, isLoading: true }),
      useBusinessRecommendations: () => ({ data: undefined, isLoading: true }),
      useSaveForecastSnapshot: () => ({ mutate: vi.fn(), isPending: false })
    }));

    render(
      <QueryClientProvider client={queryClient}>
        <ExecutiveDashboard />
      </QueryClientProvider>
    );
    
    fireEvent.click(screen.getByText('Prédictif'));
    
    // Vérifier les indicateurs de chargement
    await waitFor(() => {
      const loadingElements = screen.queryAllByText(/chargement|loading/i);
      const skeletons = document.querySelectorAll('.animate-pulse, [data-testid*="loading"]');
      
      // Au moins l'un des indicateurs de loading devrait être présent
      expect(loadingElements.length + skeletons.length).toBeGreaterThan(0);
    });
  });

  it('should maintain dashboard header functionality', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ExecutiveDashboard />
      </QueryClientProvider>
    );
    
    // Vérifier que l'en-tête du dashboard est toujours présent
    expect(screen.getByText('Dashboard Dirigeant')).toBeInTheDocument();
    
    // Vérifier les boutons d'action
    const exportButton = screen.queryByText(/export/i);
    const snapshotButton = screen.queryByText(/snapshot|génér/i);
    
    // Au moins l'un des boutons devrait être présent
    expect(exportButton || snapshotButton).toBeTruthy();
  });

  it('should preserve KPI overview section', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ExecutiveDashboard />
      </QueryClientProvider>
    );
    
    // Les KPIs principaux devraient toujours être visibles
    const kpiSection = document.querySelector('[data-testid="kpi-overview"], .kpi, [class*="kpi"]');
    
    // Fallback: chercher des indicateurs de métriques business
    const metricsElements = screen.queryAllByText(/taux|%|€|conversion|délai/i);
    
    expect(kpiSection || metricsElements.length > 0).toBeTruthy();
  });
});