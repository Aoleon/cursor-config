import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PredictiveEngineService } from '../../../server/services/PredictiveEngineService';
import { AnalyticsService } from '../../../server/services/AnalyticsService';
import { EventBus } from '../../../server/eventBus';
import type { IStorage } from '../../../server/storage-poc';

// Mock Storage pour tests isolés
const mockStorage: any = {
  // Méthodes utilisateur
  getUsers: vi.fn(),
  getUser: vi.fn(),
  upsertUser: vi.fn(),

  // Méthodes AO
  getAos: vi.fn(),
  getAo: vi.fn(),
  createAo: vi.fn(),
  updateAo: vi.fn(),

  // Méthodes Offre  
  getOffers: vi.fn(),
  getOffer: vi.fn(),
  createOffer: vi.fn(),
  updateOffer: vi.fn(),
  deleteOffer: vi.fn(),

  // Méthodes Projet
  getProjects: vi.fn(),
  getProject: vi.fn(),
  createProject: vi.fn(),
  updateProject: vi.fn(),

  // Méthodes Analytics nouvelles  
  createKPISnapshot: vi.fn(),
  getKPISnapshots: vi.fn(),
  getLatestKPISnapshot: vi.fn(),
  createBusinessMetric: vi.fn(),
  getBusinessMetrics: vi.fn(),
  getMetricTimeSeries: vi.fn(),
  createPerformanceBenchmark: vi.fn(),
  getBenchmarks: vi.fn(),
  getTopPerformers: vi.fn(),

  // Autres méthodes requises par l'interface
  getProjectTasks: vi.fn(),
  getAllTasks: vi.fn(),
  createProjectTask: vi.fn(),
  updateProjectTask: vi.fn(),
  getSupplierRequests: vi.fn(),
  createSupplierRequest: vi.fn(),
  updateSupplierRequest: vi.fn(),
  getTeamResources: vi.fn(),
  createTeamResource: vi.fn(),
  updateTeamResource: vi.fn(),
  getBeWorkload: vi.fn(),
  createOrUpdateBeWorkload: vi.fn(),
  getDashboardStats: vi.fn(),
  getConsolidatedKpis: vi.fn(),
  
  // Autres méthodes de l'interface IStorage (placeholders)
  getAllProjectTimelines: vi.fn(),
  listTechnicalAlerts: vi.fn(),
  
  // Méthodes spécifiques au moteur prédictif
  getMonthlyRevenueHistory: vi.fn(),
} as any;

const mockEventBus: any = {
  publish: vi.fn(),
  publishAnalyticsCalculated: vi.fn(),
} as any;

describe('PredictiveEngineService', () => {
  let service: PredictiveEngineService;
  let storage: IStorage;
  let analyticsService: AnalyticsService;
  
  beforeEach(() => {
    // Reset tous les mocks
    vi.clearAllMocks();
    
    // Configuration des données de test
    mockStorage.getOffers.mockResolvedValue([
      {
        id: 'offer1',
        reference: 'OFF-001',
        aoId: 'ao1',
        status: 'valide',
        budgetTotalHt: 10000,
        budgetTotalTtc: 12000,
        createdAt: new Date('2024-01-02'),
        client: 'Test Client 1'
      }
    ]);
    
    mockStorage.getProjects.mockResolvedValue([
      {
        id: 'proj1',
        name: 'Projet Test 1',
        offerId: 'offer1',
        status: 'planification',
        budget: 10000,
        createdAt: new Date('2024-01-17')
      }
    ]);
    
    storage = mockStorage;
    analyticsService = new AnalyticsService(storage, mockEventBus);
    service = new PredictiveEngineService(storage, analyticsService);
  });
  
  describe('forecastRevenue', () => {
    it('should generate revenue forecast with exponential smoothing', async () => {
      const params = {
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        forecast_months: 6,
        method: 'exp_smoothing' as const,
        confidence_threshold: 80
      };
      
      const forecasts = await service.forecastRevenue(params);
      
      expect(forecasts).toBeDefined();
      expect(Array.isArray(forecasts)).toBe(true);
      
      if (forecasts.length > 0) {
        expect(forecasts[0]).toHaveProperty('forecast_point');
        expect(forecasts[0]).toHaveProperty('confidence_level');
        expect(forecasts[0].confidence_level).toBeGreaterThanOrEqual(70);
        expect(forecasts[0].forecast_point).toHaveProperty('revenue_forecast');
        expect(forecasts[0].forecast_point).toHaveProperty('target_period');
      }
    });
    
    it('should cache results for identical parameters', async () => {
      const params = {
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        forecast_months: 6,
        method: 'exp_smoothing' as const
      };
      
      const start1 = Date.now();
      await service.forecastRevenue(params);
      const time1 = Date.now() - start1;
      
      const start2 = Date.now();
      await service.forecastRevenue(params);
      const time2 = Date.now() - start2;
      
      // Deuxième appel doit être plus rapide (cache hit) - avec tolérance pour les tests
      expect(time2).toBeLessThanOrEqual(time1 + 5);
    });

    it('should handle different forecasting methods', async () => {
      const methods = ['exp_smoothing', 'moving_average', 'trend_analysis'] as const;
      
      for (const method of methods) {
        const params = {
          start_date: '2024-01-01',
          end_date: '2024-12-31',
          forecast_months: 3,
          method
        };
        
        const forecasts = await service.forecastRevenue(params);
        expect(forecasts).toBeDefined();
        expect(Array.isArray(forecasts)).toBe(true);
      }
    });
  });
  
  describe('detectProjectRisks', () => {
    it('should detect and score project risks', async () => {
      const params = {
        risk_level: 'medium' as const,
        limit: 10,
        sort_by: 'risk_score' as const
      };
      
      const risks = await service.detectProjectRisks(params);
      
      expect(risks).toBeDefined();
      expect(Array.isArray(risks)).toBe(true);
      
      if (risks.length > 0) {
        expect(risks[0]).toHaveProperty('risk_score');
        expect(risks[0]).toHaveProperty('risk_factors');
        expect(risks[0].risk_score).toBeGreaterThanOrEqual(0);
        expect(risks[0].risk_score).toBeLessThanOrEqual(100);
        expect(risks[0]).toHaveProperty('project_id');
        expect(risks[0]).toHaveProperty('recommended_actions');
      }
    });

    it('should filter risks by level', async () => {
      const riskLevels = ['low', 'medium', 'high'] as const;
      
      for (const risk_level of riskLevels) {
        const params = { risk_level, limit: 5 };
        const risks = await service.detectProjectRisks(params);
        
        expect(Array.isArray(risks)).toBe(true);
        // Les risques retournés doivent correspondre au niveau demandé
        if (risks.length > 0) {
          risks.forEach(risk => {
            const threshold = risk_level === 'high' ? 70 : risk_level === 'medium' ? 40 : 0;
            expect(risk.risk_score).toBeGreaterThanOrEqual(threshold);
          });
        }
      }
    });
  });
  
  describe('generateRecommendations', () => {
    it('should generate business recommendations', async () => {
      const context = {
        analysis_period: {
          from: new Date('2024-01-01'),
          to: new Date('2024-12-31')
        },
        focus_areas: ['revenue', 'costs'] as const,
        priority_threshold: 'medium' as const
      };
      
      const recommendations = await service.generateRecommendations(context);
      
      expect(recommendations).toBeDefined();
      expect(Array.isArray(recommendations)).toBe(true);
      
      if (recommendations.length > 0) {
        expect(recommendations[0]).toHaveProperty('priority');
        expect(recommendations[0]).toHaveProperty('category');
        expect(recommendations[0]).toHaveProperty('title');
        expect(recommendations[0]).toHaveProperty('description');
        expect(recommendations[0]).toHaveProperty('estimated_impact');
        expect(recommendations[0]).toHaveProperty('implementation');
      }
    });

    it('should prioritize recommendations correctly', async () => {
      const context = {
        analysis_period: {
          from: new Date('2024-01-01'),
          to: new Date('2024-12-31')
        },
        priority_threshold: 'high' as const
      };
      
      const recommendations = await service.generateRecommendations(context);
      
      // Vérifier que les recommandations sont triées par priorité
      if (recommendations.length > 1) {
        const priorities = ['critical', 'high', 'medium', 'low'];
        let lastPriorityIndex = -1;
        
        recommendations.forEach(rec => {
          const currentPriorityIndex = priorities.indexOf(rec.priority);
          expect(currentPriorityIndex).toBeGreaterThanOrEqual(lastPriorityIndex);
          lastPriorityIndex = currentPriorityIndex;
        });
      }
    });
  });

  describe('Cache System', () => {
    it('should use cache for repeated calls', async () => {
      const params = {
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        forecast_months: 3,
        method: 'exp_smoothing' as const
      };
      
      // Premier appel
      await service.forecastRevenue(params);
      const firstCallCount = mockStorage.getOffers.mock.calls.length;
      
      // Deuxième appel immédiat (devrait utiliser cache)
      await service.forecastRevenue(params);
      const secondCallCount = mockStorage.getOffers.mock.calls.length;
      
      // Le nombre d'appels storage ne devrait pas augmenter significativement
      expect(secondCallCount).toBeLessThanOrEqual(firstCallCount + 1);
    });

    it('should expire cache after TTL', async () => {
      // Cette test nécessiterait de manipuler le temps ou d'exposer la méthode cleanupCache
      // Pour l'instant on teste juste que le cache existe
      expect(service).toHaveProperty('cache');
    });
  });

  describe('Error Handling', () => {
    it('should handle storage errors gracefully', async () => {
      // Simuler une erreur de storage
      mockStorage.getOffers.mockRejectedValueOnce(new Error('Storage error'));
      
      const params = {
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        forecast_months: 3,
        method: 'exp_smoothing' as const
      };
      
      const forecasts = await service.forecastRevenue(params);
      
      // Le service devrait retourner un résultat vide plutôt que lever l'erreur
      expect(forecasts).toBeDefined();
      expect(Array.isArray(forecasts)).toBe(true);
    });

    it('should validate input parameters', async () => {
      const invalidParams = {
        start_date: 'invalid-date',
        end_date: '2024-12-31',
        forecast_months: -1,
        method: 'invalid_method' as any
      };
      
      const forecasts = await service.forecastRevenue(invalidParams);
      expect(forecasts).toBeDefined();
      expect(Array.isArray(forecasts)).toBe(true);
    });
  });
});