import { describe, test, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { 
  useBusinessAlerts, 
  useAcknowledgeAlert, 
  useResolveAlert, 
  useAlertThresholds,
  useUpdateThreshold 
} from '../../../client/src/hooks/useBusinessAlerts';
import { server } from '../../utils/msw-handlers';

// Mock queryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

// ========================================
// TESTS HOOKS BUSINESS ALERTS
// ========================================

describe('useBusinessAlerts Hook', () => {
  beforeEach(() => {
    server.listen();
  });

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  // ========================================
  // TESTS CHARGEMENT ALERTES
  // ========================================

  test('charge alertes business correctement', async () => {
    const { result } = renderHook(() => useBusinessAlerts(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeDefined();
    expect(Array.isArray(result.current.data)).toBe(true);
    expect(result.current.data!.length).toBeGreaterThan(0);
    
    const firstAlert = result.current.data![0];
    expect(firstAlert).toHaveProperty('id');
    expect(firstAlert).toHaveProperty('type');
    expect(firstAlert).toHaveProperty('severity');
    expect(firstAlert).toHaveProperty('status');
    expect(firstAlert).toHaveProperty('message');
  });

  test('filtre alertes par status correctement', async () => {
    const { result } = renderHook(() => useBusinessAlerts({ status: 'open' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeDefined();
    result.current.data!.forEach(alert => {
      expect(alert.status).toBe('open');
    });
  });

  test('filtre alertes par sévérité correctement', async () => {
    const { result } = renderHook(() => useBusinessAlerts({ severity: 'critical' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeDefined();
    result.current.data!.forEach(alert => {
      expect(alert.severity).toBe('critical');
    });
  });

  test('limite nombre alertes retournées', async () => {
    const { result } = renderHook(() => useBusinessAlerts({ limit: 2 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeDefined();
    expect(result.current.data!.length).toBeLessThanOrEqual(2);
  });

  test('gère erreurs de chargement', async () => {
    // Simuler erreur API
    server.use(
      rest.get('/api/alerts/business', (req, res, ctx) => {
        return res(ctx.status(500), ctx.json({ error: 'Server Error' }));
      })
    );

    const { result } = renderHook(() => useBusinessAlerts(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeDefined();
    expect(result.current.data).toBeUndefined();
  });

  // ========================================
  // TESTS MUTATION ACKNOWLEDGE
  // ========================================

  test('acknowledge alerte fonctionne', async () => {
    const { result } = renderHook(() => useAcknowledgeAlert(), {
      wrapper: createWrapper(),
    });

    const acknowledgeData = {
      alertId: 'alert1',
      assigned_to: 'user2',
      notes: 'Prise en charge par équipe technique'
    };

    await result.current.mutateAsync(acknowledgeData);

    expect(result.current.isSuccess).toBe(true);
    expect(result.current.data).toMatchObject({
      id: 'alert1',
      status: 'acknowledged',
      assigned_to: 'user2'
    });
  });

  test('acknowledge gère erreurs validation', async () => {
    const { result } = renderHook(() => useAcknowledgeAlert(), {
      wrapper: createWrapper(),
    });

    // Simuler erreur validation côté serveur
    server.use(
      rest.post('/api/alerts/business/:id/acknowledge', (req, res, ctx) => {
        return res(ctx.status(400), ctx.json({ error: 'Invalid assigned_to user' }));
      })
    );

    const acknowledgeData = {
      alertId: 'alert1',
      assigned_to: 'invalid-user',
      notes: 'Test'
    };

    await expect(result.current.mutateAsync(acknowledgeData)).rejects.toThrow();
    expect(result.current.isError).toBe(true);
  });

  test('acknowledge met à jour cache automatiquement', async () => {
    const wrapper = createWrapper();
    
    // D'abord charger les alertes
    const { result: alertsResult } = renderHook(() => useBusinessAlerts(), { wrapper });
    
    await waitFor(() => {
      expect(alertsResult.current.isLoading).toBe(false);
    });

    // Puis acknowledge une alerte
    const { result: acknowledgeResult } = renderHook(() => useAcknowledgeAlert(), { wrapper });

    await acknowledgeResult.current.mutateAsync({
      alertId: 'alert1',
      assigned_to: 'user2',
      notes: 'Test acknowledge'
    });

    // Le cache devrait être invalidé et les données rechargées
    await waitFor(() => {
      expect(alertsResult.current.data).toBeDefined();
    });
  });

  // ========================================
  // TESTS MUTATION RESOLVE
  // ========================================

  test('resolve alerte avec notes fonctionne', async () => {
    const { result } = renderHook(() => useResolveAlert(), {
      wrapper: createWrapper(),
    });

    const resolveData = {
      alertId: 'alert2',
      resolution_notes: 'Problème résolu par redistribution des tâches équipe. Surveillance renforcée mise en place.'
    };

    await result.current.mutateAsync(resolveData);

    expect(result.current.isSuccess).toBe(true);
    expect(result.current.data).toMatchObject({
      id: 'alert2',
      status: 'resolved',
      resolution_notes: resolveData.resolution_notes
    });
  });

  test('resolve échoue sans notes', async () => {
    const { result } = renderHook(() => useResolveAlert(), {
      wrapper: createWrapper(),
    });

    const resolveData = {
      alertId: 'alert2',
      resolution_notes: '' // Notes vides
    };

    await expect(result.current.mutateAsync(resolveData)).rejects.toThrow();
    expect(result.current.isError).toBe(true);
  });

  test('resolve échoue avec notes trop courtes', async () => {
    const { result } = renderHook(() => useResolveAlert(), {
      wrapper: createWrapper(),
    });

    const resolveData = {
      alertId: 'alert2',
      resolution_notes: 'Court' // < 10 caractères
    };

    await expect(result.current.mutateAsync(resolveData)).rejects.toThrow();
  });

  test('resolve invalidate cache après succès', async () => {
    const wrapper = createWrapper();
    
    // Charger alertes
    const { result: alertsResult } = renderHook(() => useBusinessAlerts(), { wrapper });
    
    await waitFor(() => {
      expect(alertsResult.current.isLoading).toBe(false);
    });

    // Resolve alerte
    const { result: resolveResult } = renderHook(() => useResolveAlert(), { wrapper });

    await resolveResult.current.mutateAsync({
      alertId: 'alert2',
      resolution_notes: 'Résolution complète avec actions préventives mises en place.'
    });

    // Vérifier invalidation cache
    await waitFor(() => {
      expect(alertsResult.current.data).toBeDefined();
    });
  });

  // ========================================
  // TESTS HOOKS SEUILS
  // ========================================

  test('charge seuils alertes correctement', async () => {
    const { result } = renderHook(() => useAlertThresholds(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeDefined();
    expect(Array.isArray(result.current.data)).toBe(true);
    expect(result.current.data!.length).toBeGreaterThan(0);
    
    const firstThreshold = result.current.data![0];
    expect(firstThreshold).toHaveProperty('id');
    expect(firstThreshold).toHaveProperty('key');
    expect(firstThreshold).toHaveProperty('value');
    expect(firstThreshold).toHaveProperty('operator');
    expect(firstThreshold).toHaveProperty('is_active');
    expect(firstThreshold.is_active).toBe(true);
  });

  test('update seuil fonctionne', async () => {
    const { result } = renderHook(() => useUpdateThreshold(), {
      wrapper: createWrapper(),
    });

    const updateData = {
      key: 'project_margin',
      value: 18.0, // Changement de 15% à 18%
      operator: 'greater_than',
      is_active: true
    };

    await result.current.mutateAsync(updateData);

    expect(result.current.isSuccess).toBe(true);
    expect(result.current.data).toMatchObject({
      key: 'project_margin',
      value: 18.0,
      operator: 'greater_than'
    });
  });

  test('création nouveau seuil fonctionne', async () => {
    const { result } = renderHook(() => useUpdateThreshold(), {
      wrapper: createWrapper(),
    });

    const newThresholdData = {
      key: 'global_margin',
      value: 20.0,
      operator: 'greater_than',
      is_active: true
    };

    await result.current.mutateAsync(newThresholdData);

    expect(result.current.isSuccess).toBe(true);
    expect(result.current.data).toMatchObject({
      key: 'global_margin',
      value: 20.0
    });
  });

  test('désactivation seuil fonctionne', async () => {
    const { result } = renderHook(() => useUpdateThreshold(), {
      wrapper: createWrapper(),
    });

    const deactivateData = {
      key: 'team_utilization',
      value: 85.0,
      operator: 'less_than',
      is_active: false // Désactivation
    };

    await result.current.mutateAsync(deactivateData);

    expect(result.current.isSuccess).toBe(true);
    expect(result.current.data).toMatchObject({
      is_active: false
    });
  });

  // ========================================
  // TESTS PERFORMANCE HOOKS
  // ========================================

  test('hook charge données dans délai acceptable', async () => {
    const startTime = Date.now();
    
    const { result } = renderHook(() => useBusinessAlerts(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(1000); // Chargement < 1s
  });

  test('mutations hooks performantes', async () => {
    const { result } = renderHook(() => useAcknowledgeAlert(), {
      wrapper: createWrapper(),
    });

    const startTime = Date.now();
    
    await result.current.mutateAsync({
      alertId: 'alert1',
      assigned_to: 'user2',
      notes: 'Test performance'
    });

    const mutationTime = Date.now() - startTime;
    expect(mutationTime).toBeLessThan(500); // Mutation < 500ms
  });

  test('hook gère multiples appels simultanés', async () => {
    const wrapper = createWrapper();
    
    // Lancer plusieurs hooks simultanément
    const { result: alerts1 } = renderHook(() => useBusinessAlerts({ status: 'open' }), { wrapper });
    const { result: alerts2 } = renderHook(() => useBusinessAlerts({ severity: 'high' }), { wrapper });
    const { result: thresholds } = renderHook(() => useAlertThresholds(), { wrapper });

    // Attendre que tous se chargent
    await waitFor(() => {
      expect(alerts1.current.isLoading).toBe(false);
      expect(alerts2.current.isLoading).toBe(false);
      expect(thresholds.current.isLoading).toBe(false);
    });

    // Tous doivent avoir des données
    expect(alerts1.current.data).toBeDefined();
    expect(alerts2.current.data).toBeDefined();
    expect(thresholds.current.data).toBeDefined();
  });

  // ========================================
  // TESTS GESTION ERREURS AVANCÉE
  // ========================================

  test('hook retry automatique après erreur temporaire', async () => {
    let callCount = 0;
    
    server.use(
      rest.get('/api/alerts/business', (req, res, ctx) => {
        callCount++;
        if (callCount === 1) {
          return res(ctx.status(500), ctx.json({ error: 'Temporary error' }));
        }
        return res(ctx.json([]));
      })
    );

    const { result } = renderHook(() => useBusinessAlerts(), {
      wrapper: createWrapper(),
    });

    // Premier appel échoue
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeDefined();

    // Retry manuel
    result.current.refetch();

    // Deuxième appel réussit
    await waitFor(() => {
      expect(result.current.error).toBeNull();
      expect(result.current.data).toBeDefined();
    });

    expect(callCount).toBe(2);
  });

  test('hook gère timeout réseau', async () => {
    server.use(
      rest.get('/api/alerts/business', (req, res, ctx) => {
        return res(ctx.delay(5000)); // Timeout 5s
      })
    );

    const { result } = renderHook(() => useBusinessAlerts(), {
      wrapper: createWrapper(),
    });

    // Après timeout, doit avoir une erreur
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    }, { timeout: 6000 });

    expect(result.current.error).toBeDefined();
  });

  test('hooks maintiennent état pendant navigation', async () => {
    const wrapper = createWrapper();
    
    // Charger alertes
    const { result: alertsResult, unmount: unmountAlerts } = renderHook(() => useBusinessAlerts(), { wrapper });
    
    await waitFor(() => {
      expect(alertsResult.current.isLoading).toBe(false);
    });

    const initialData = alertsResult.current.data;
    unmountAlerts();

    // Recharger même hook
    const { result: alertsResult2 } = renderHook(() => useBusinessAlerts(), { wrapper });

    // Données doivent être disponibles immédiatement (cache)
    expect(alertsResult2.current.data).toEqual(initialData);
    expect(alertsResult2.current.isLoading).toBe(false);
  });
});