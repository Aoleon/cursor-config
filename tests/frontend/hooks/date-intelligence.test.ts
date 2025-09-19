import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { intelligenceHandlers } from '../../utils/msw-handlers-intelligence';
import { 
  createMockDateAlert, 
  createMockProjectTimeline, 
  createMockDateAlertsSummary,
  createAutoCleanupMock
} from '../../utils/test-helpers';

// Hooks à tester
import { useDateAlerts } from '../../../client/src/hooks/use-date-alerts';
import { useProjectTimelines } from '../../../client/src/hooks/use-project-timelines';
import { useBusinessRules } from '../../../client/src/hooks/use-business-rules';
import { usePerformanceMetrics } from '../../../client/src/hooks/use-performance-metrics';

/**
 * Tests Frontend Hooks - Intelligence Temporelle
 * Validation des hooks React pour le système d'intelligence temporelle
 * Phase 2.5 - Tests exhaustifs
 */

describe('Date Intelligence Hooks', () => {
  const mockCleanup = createAutoCleanupMock();
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const server = setupServer(...intelligenceHandlers);

  beforeEach(() => {
    server.listen();
    queryClient.clear();
  });

  afterEach(() => {
    server.resetHandlers();
    mockCleanup.cleanup();
  });

  // Wrapper pour les hooks avec QueryClient
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  // ========================================
  // TESTS HOOK useDateAlerts
  // ========================================

  describe('useDateAlerts Hook', () => {
    test('charge et affiche alertes correctement', async () => {
      const { result } = renderHook(() => useDateAlerts(), { wrapper });

      // Attendre le chargement initial
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Vérifier les données chargées
      expect(result.current.alerts).toHaveLength(5); // Selon MSW mock
      expect(result.current.alerts[0].severity).toBe('critical');
      expect(result.current.alerts[0].alertType).toBe('deadline_critical');
    });

    test('filtre alertes par severité', async () => {
      const { result } = renderHook(() => useDateAlerts({ 
        showCriticalOnly: true 
      }), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Vérifier filtrage
      const criticalAlerts = result.current.alerts.filter(a => a.severity === 'critical');
      expect(criticalAlerts.length).toBeGreaterThan(0);
      expect(result.current.alerts.every(a => a.severity === 'critical')).toBe(true);
    });

    test('acknowledgeAlert met à jour statut localement', async () => {
      const { result } = renderHook(() => useDateAlerts(), { wrapper });

      await waitFor(() => {
        expect(result.current.alerts.length).toBeGreaterThan(0);
      });

      const alertToAcknowledge = result.current.alerts[0];
      
      await act(async () => {
        await result.current.acknowledgeAlert(alertToAcknowledge.id, 'Test acknowledgment');
      });

      // Vérifier mise à jour optimiste
      const updatedAlert = result.current.alerts.find(a => a.id === alertToAcknowledge.id);
      expect(updatedAlert?.status).toBe('acknowledged');
      expect(updatedAlert?.actionTaken).toBe('Test acknowledgment');
    });

    test('escalateAlert gère escalade correctement', async () => {
      const { result } = renderHook(() => useDateAlerts(), { wrapper });

      await waitFor(() => {
        expect(result.current.alerts.length).toBeGreaterThan(0);
      });

      const alertToEscalate = result.current.alerts.find(a => a.severity === 'warning');
      expect(alertToEscalate).toBeDefined();

      await act(async () => {
        await result.current.escalateAlert(alertToEscalate!.id, 'Escalating due to urgency');
      });

      // Vérifier escalade
      const escalatedAlert = result.current.alerts.find(a => a.id === alertToEscalate!.id);
      expect(escalatedAlert?.severity).toBe('critical');
    });

    test('gère WebSocket events en temps réel', async () => {
      // Mock WebSocket provider
      const mockWebSocket = {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      };

      vi.mock('../../../client/src/providers/websocket-provider', () => ({
        useWebSocket: () => mockWebSocket
      }));

      const { result } = renderHook(() => useDateAlerts({ 
        enableToasts: true 
      }), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Simuler réception événement WebSocket
      const newAlert = createMockDateAlert({
        alertType: 'delay_risk',
        severity: 'warning'
      });

      await act(async () => {
        // Simuler événement WebSocket reçu
        result.current.handleRealtimeAlert(newAlert);
      });

      // Vérifier ajout de l'alerte
      expect(result.current.alerts).toContain(newAlert);
    });

    test('applique throttling sur alertes fréquentes', async () => {
      const { result } = renderHook(() => useDateAlerts(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Simuler plusieurs alertes rapides
      const rapidAlerts = Array.from({ length: 5 }, () => 
        createMockDateAlert({ projectId: 'same-project' })
      );

      await act(async () => {
        rapidAlerts.forEach(alert => {
          result.current.handleRealtimeAlert(alert);
        });
      });

      // Vérifier throttling appliqué (groupement)
      const projectAlerts = result.current.alerts.filter(a => a.entityId === 'same-project');
      expect(projectAlerts.length).toBeLessThan(5); // Groupées
    });
  });

  // ========================================
  // TESTS HOOK useProjectTimelines
  // ========================================

  describe('useProjectTimelines Hook', () => {
    test('charge timelines projet correctement', async () => {
      const { result } = renderHook(() => useProjectTimelines('project-1'), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.timelines).toHaveLength(3); // Selon MSW mock
      expect(result.current.timelines[0].phase).toBe('etude');
      expect(result.current.timelines[1].phase).toBe('approvisionnement');
      expect(result.current.timelines[2].phase).toBe('chantier');
    });

    test('calculateTimeline génère nouvelles timelines', async () => {
      const { result } = renderHook(() => useProjectTimelines(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const projectContext = {
        projectType: 'fenetre_pvc' as const,
        complexity: 'normale' as const,
        surface: 25,
        season: 'summer' as const
      };

      await act(async () => {
        await result.current.calculateTimeline('project-1', projectContext);
      });

      // Vérifier calcul réussi
      expect(result.current.isCalculating).toBe(false);
      expect(result.current.lastCalculationResult).toBeDefined();
      expect(result.current.lastCalculationResult?.phases).toBeDefined();
    });

    test('updateTimeline met à jour phase spécifique', async () => {
      const { result } = renderHook(() => useProjectTimelines('project-1'), { wrapper });

      await waitFor(() => {
        expect(result.current.timelines.length).toBeGreaterThan(0);
      });

      const timelineToUpdate = result.current.timelines[0];
      const newEndDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);

      await act(async () => {
        await result.current.updateTimeline(timelineToUpdate.id, {
          endDate: newEndDate,
          durationDays: 10
        });
      });

      // Vérifier mise à jour optimiste
      const updatedTimeline = result.current.timelines.find(t => t.id === timelineToUpdate.id);
      expect(updatedTimeline?.endDate).toEqual(newEndDate);
      expect(updatedTimeline?.durationDays).toBe(10);
    });

    test('stats calcule métriques correctement', async () => {
      const { result } = renderHook(() => useProjectTimelines(), { wrapper });

      await waitFor(() => {
        expect(result.current.stats).toBeDefined();
      });

      expect(result.current.stats.active).toBe(15);
      expect(result.current.stats.onTime).toBe(12);
      expect(result.current.stats.delayed).toBe(2);
      expect(result.current.stats.critical).toBe(1);
    });

    test('optimizeTimeline propose améliorations', async () => {
      const { result } = renderHook(() => useProjectTimelines('project-1'), { wrapper });

      await waitFor(() => {
        expect(result.current.timelines.length).toBeGreaterThan(0);
      });

      await act(async () => {
        await result.current.optimizeTimeline('project-1');
      });

      // Vérifier optimisations proposées
      expect(result.current.optimizationSuggestions).toBeDefined();
      expect(result.current.optimizationSuggestions.length).toBeGreaterThan(0);
      expect(result.current.optimizationSuggestions[0].estimatedGainDays).toBeGreaterThan(0);
    });
  });

  // ========================================
  // TESTS HOOK useBusinessRules
  // ========================================

  describe('useBusinessRules Hook', () => {
    test('charge règles métier par phase', async () => {
      const { result } = renderHook(() => useBusinessRules(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.rules).toHaveLength(5); // Selon MSW mock
      expect(result.current.rulesByPhase.etude).toBeDefined();
      expect(result.current.rulesByPhase.chantier).toBeDefined();
    });

    test('createRule ajoute nouvelle règle', async () => {
      const { result } = renderHook(() => useBusinessRules(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const newRule = {
        name: 'Test Rule',
        description: 'Rule for testing',
        phase: 'planification' as const,
        baseDuration: 7,
        multiplierFactor: 1.2,
        conditions: { complexity: 'elevee' },
        category: 'test',
        priority: 5
      };

      await act(async () => {
        await result.current.createRule(newRule);
      });

      // Vérifier ajout optimiste
      const addedRule = result.current.rules.find(r => r.name === 'Test Rule');
      expect(addedRule).toBeDefined();
      expect(addedRule?.baseDuration).toBe(7);
    });

    test('updateRule modifie règle existante', async () => {
      const { result } = renderHook(() => useBusinessRules(), { wrapper });

      await waitFor(() => {
        expect(result.current.rules.length).toBeGreaterThan(0);
      });

      const ruleToUpdate = result.current.rules[0];

      await act(async () => {
        await result.current.updateRule(ruleToUpdate.id, {
          baseDuration: 8,
          multiplierFactor: 1.5
        });
      });

      // Vérifier mise à jour
      const updatedRule = result.current.rules.find(r => r.id === ruleToUpdate.id);
      expect(updatedRule?.baseDuration).toBe(8);
      expect(updatedRule?.multiplierFactor).toBe(1.5);
    });

    test('deleteRule supprime règle', async () => {
      const { result } = renderHook(() => useBusinessRules(), { wrapper });

      await waitFor(() => {
        expect(result.current.rules.length).toBeGreaterThan(0);
      });

      const ruleToDelete = result.current.rules[0];
      const initialCount = result.current.rules.length;

      await act(async () => {
        await result.current.deleteRule(ruleToDelete.id);
      });

      // Vérifier suppression
      expect(result.current.rules.length).toBe(initialCount - 1);
      expect(result.current.rules.find(r => r.id === ruleToDelete.id)).toBeUndefined();
    });

    test('validateRule vérifie cohérence', async () => {
      const { result } = renderHook(() => useBusinessRules(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Règle valide
      const validRule = {
        name: 'Valid Rule',
        phase: 'etude' as const,
        baseDuration: 5,
        multiplierFactor: 1.0,
        conditions: {}
      };

      const validationResult = result.current.validateRule(validRule);
      expect(validationResult.isValid).toBe(true);
      expect(validationResult.errors).toHaveLength(0);

      // Règle invalide
      const invalidRule = {
        name: '',
        phase: 'etude' as const,
        baseDuration: -1,
        multiplierFactor: 0,
        conditions: {}
      };

      const invalidResult = result.current.validateRule(invalidRule);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors.length).toBeGreaterThan(0);
    });
  });

  // ========================================
  // TESTS HOOK usePerformanceMetrics
  // ========================================

  describe('usePerformanceMetrics Hook', () => {
    test('charge métriques de performance', async () => {
      const { result } = renderHook(() => usePerformanceMetrics(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.dashboardStats).toBeDefined();
      expect(result.current.dashboardStats.totalProjects).toBe(157);
      expect(result.current.dashboardStats.averageDelayDays).toBe(2.1);
      expect(result.current.dashboardStats.onTimeCompletionRate).toBe(0.87);
    });

    test('trackLoadTest mesure performance', async () => {
      const { result } = renderHook(() => usePerformanceMetrics(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.trackLoadTest(100);
      });

      // Vérifier résultats du test de charge
      expect(result.current.lastLoadTest).toBeDefined();
      expect(result.current.lastLoadTest?.projectCount).toBe(100);
      expect(result.current.lastLoadTest?.success).toBe(true);
    });

    test('getOptimizationStats retourne statistiques', async () => {
      const { result } = renderHook(() => usePerformanceMetrics(), { wrapper });

      await waitFor(() => {
        expect(result.current.dashboardStats).toBeDefined();
      });

      const optimizationStats = result.current.dashboardStats.optimizationStats;
      expect(optimizationStats.totalGainDays).toBe(45);
      expect(optimizationStats.averageGainPerProject).toBe(2.8);
      expect(optimizationStats.implementedOptimizations).toBe(16);
    });

    test('getTrendAnalysis analyse tendances', async () => {
      const { result } = renderHook(() => usePerformanceMetrics(), { wrapper });

      await waitFor(() => {
        expect(result.current.dashboardStats).toBeDefined();
      });

      const trends = result.current.dashboardStats.trends;
      expect(trends.delayTrend).toBe(-0.3); // Amélioration
      expect(trends.efficiencyTrend).toBe(0.15);
      expect(trends.satisfactionTrend).toBe(0.08);
    });
  });

  // ========================================
  // TESTS INTÉGRATION HOOKS
  // ========================================

  describe('Intégration Entre Hooks', () => {
    test('modification timeline déclenche recalcul alertes', async () => {
      const timelinesHook = renderHook(() => useProjectTimelines('project-1'), { wrapper });
      const alertsHook = renderHook(() => useDateAlerts(), { wrapper });

      await waitFor(() => {
        expect(timelinesHook.result.current.isLoading).toBe(false);
        expect(alertsHook.result.current.loading).toBe(false);
      });

      const initialAlertsCount = alertsHook.result.current.alerts.length;

      // Modifier une timeline
      const timeline = timelinesHook.result.current.timelines[0];
      await act(async () => {
        await timelinesHook.result.current.updateTimeline(timeline.id, {
          durationDays: timeline.durationDays + 5 // Retard
        });
      });

      // Vérifier que nouvelles alertes sont générées
      await waitFor(() => {
        expect(alertsHook.result.current.alerts.length).toBeGreaterThanOrEqual(initialAlertsCount);
      });
    });

    test('création règle métier met à jour calculs timelines', async () => {
      const rulesHook = renderHook(() => useBusinessRules(), { wrapper });
      const timelinesHook = renderHook(() => useProjectTimelines(), { wrapper });

      await waitFor(() => {
        expect(rulesHook.result.current.isLoading).toBe(false);
      });

      // Créer nouvelle règle
      const newRule = {
        name: 'Test Acceleration Rule',
        phase: 'chantier' as const,
        baseDuration: 2, // Plus rapide
        multiplierFactor: 0.8,
        conditions: { weather: 'favorable' },
        category: 'optimization',
        priority: 8
      };

      await act(async () => {
        await rulesHook.result.current.createRule(newRule);
      });

      // Recalculer timeline avec nouvelle règle
      await act(async () => {
        await timelinesHook.result.current.calculateTimeline('project-1', {
          projectType: 'fenetre_pvc',
          complexity: 'normale'
        });
      });

      // Vérifier que nouvelle règle est appliquée
      const result = timelinesHook.result.current.lastCalculationResult;
      expect(result?.appliedRules).toContain(newRule.name);
    });

    test('métriques performance reflètent changements temps réel', async () => {
      const metricsHook = renderHook(() => usePerformanceMetrics(), { wrapper });
      const alertsHook = renderHook(() => useDateAlerts(), { wrapper });

      await waitFor(() => {
        expect(metricsHook.result.current.isLoading).toBe(false);
        expect(alertsHook.result.current.loading).toBe(false);
      });

      const initialCritical = metricsHook.result.current.dashboardStats.criticalDeadlines || 0;

      // Simuler nouvelle alerte critique
      const criticalAlert = createMockDateAlert({
        alertType: 'deadline_critical',
        severity: 'critical'
      });

      await act(async () => {
        alertsHook.result.current.handleRealtimeAlert(criticalAlert);
      });

      // Les métriques doivent se mettre à jour
      await waitFor(() => {
        const currentCritical = metricsHook.result.current.dashboardStats.criticalDeadlines || 0;
        expect(currentCritical).toBeGreaterThan(initialCritical);
      });
    });
  });
});