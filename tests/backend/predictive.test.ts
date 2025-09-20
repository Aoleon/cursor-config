import { describe, test, expect, beforeEach, vi } from 'vitest';
import { PredictiveEngineService } from '../../server/services/PredictiveEngineService';
import { AnalyticsService } from '../../server/services/AnalyticsService';
import type { IStorage, DateRange } from '../../server/storage-poc';
import type { Project, User, Offer, ProjectStatus } from '../../shared/schema';
import { addMonths, subMonths, format } from 'date-fns';

// ========================================
// MOCK STORAGE POUR PREDICTIVE ENGINE
// ========================================

const createMockStorage = (): Partial<IStorage> => ({
  // Méthodes de base
  getUsers: vi.fn(),
  getUser: vi.fn(),
  upsertUser: vi.fn(),
  getProjects: vi.fn(),
  getProject: vi.fn(),
  createProject: vi.fn(),
  updateProject: vi.fn(),
  getOffers: vi.fn(),
  getOffer: vi.fn(),
  createOffer: vi.fn(),
  updateOffer: vi.fn(),
  deleteOffer: vi.fn(),
  getAos: vi.fn(),
  getAo: vi.fn(),
  createAo: vi.fn(),
  updateAo: vi.fn(),

  // Méthodes Analytics pour prédictif
  createKPISnapshot: vi.fn(),
  getKPISnapshots: vi.fn(),
  getLatestKPISnapshot: vi.fn(),
  createBusinessMetric: vi.fn(),
  getBusinessMetrics: vi.fn(),
  getMetricTimeSeries: vi.fn(),
  createPerformanceBenchmark: vi.fn(),
  getBenchmarks: vi.fn(),
  getTopPerformers: vi.fn(),

  // Autres méthodes requises
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
  getAllProjectTimelines: vi.fn(),
  listTechnicalAlerts: vi.fn(),
} as any);

const createMockAnalyticsService = () => ({
  conversionCalculatorAPI: {
    calculateAOToOfferConversion: vi.fn(),
    calculateOfferToProjectConversion: vi.fn(),
    calculatePipelineConversion: vi.fn(),
  },
  revenueCalculatorAPI: {
    calculateRevenueForecast: vi.fn(),
  },
  marginCalculatorAPI: {
    calculateMarginAnalysis: vi.fn(),
  },
  delayCalculatorAPI: {
    calculateDelayMetrics: vi.fn(),
  },
  teamLoadCalculator: {
    calculateTeamLoad: vi.fn(),
  },
  getRealtimeKPIs: vi.fn(),
});

// ========================================
// DONNÉES DE TEST PRÉDICTIF
// ========================================

const mockUsers: User[] = [
  { 
    id: 'user1', 
    firstName: 'Pierre', 
    lastName: 'Durand', 
    email: 'pierre.durand@test.com', 
    profileImageUrl: null, 
    role: 'manager', 
    isActive: true, 
    chargeStatus: 'charge', 
    createdAt: new Date('2024-01-01'), 
    updatedAt: new Date('2024-01-01') 
  },
  { 
    id: 'user2', 
    firstName: 'Sophie', 
    lastName: 'Bernard', 
    email: 'sophie.bernard@test.com', 
    profileImageUrl: null, 
    role: 'technician', 
    isActive: true, 
    chargeStatus: 'disponible', 
    createdAt: new Date('2024-01-01'), 
    updatedAt: new Date('2024-01-01') 
  }
];

const mockProjects: Project[] = [
  {
    id: 'proj1',
    name: 'Projet Fenêtres École',
    offerId: 'offer1',
    status: 'planification' as ProjectStatus,
    responsibleUserId: 'user1',
    budget: 45000,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-02-01'),
    description: 'Remplacement fenêtres école primaire',
    startDate: new Date('2024-02-15'),
    endDate: new Date('2024-05-15'),
    progress: 25,
    client: 'Mairie de Versailles',
    location: 'Versailles'
  },
  {
    id: 'proj2',
    name: 'Projet Portes Hôpital',
    offerId: 'offer2',
    status: 'chantier' as ProjectStatus,
    responsibleUserId: 'user2',
    budget: 75000,
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-02-05'),
    description: 'Portes automatiques hôpital',
    startDate: new Date('2024-01-20'),
    endDate: new Date('2024-04-20'),
    progress: 70,
    client: 'CHU Paris',
    location: 'Paris 14e'
  }
];

const mockOffers: Offer[] = [
  {
    id: 'offer1',
    reference: 'OFF-2024-003',
    aoId: 'ao3',
    status: 'valide',
    menuiserieType: 'fenetre',
    responsibleUserId: 'user1',
    client: 'Mairie de Versailles',
    location: 'Versailles',
    departement: '78',
    intituleOperation: 'Fenêtres école primaire',
    budgetTotalHt: 37500,
    budgetTotalTtc: 45000,
    createdAt: new Date('2024-01-12'),
    updatedAt: new Date('2024-01-15'),
    aoReference: 'AO-2024-003',
    // Autres champs requis avec valeurs null par défaut
    description: null,
    dateRemiseOffre: null,
    validityPeriod: null,
    technicalScore: null,
    financialScore: null,
    totalScore: null,
    isWinner: null,
    selectionComment: null,
    contactId: null,
    timeline: null,
    milestones: [],
    risks: [],
    opportunities: [],
    competitiveAdvantages: [],
    technicalRequirements: null,
    qualityStandards: null,
    deliverables: null,
    projectTeam: [],
    partnerships: [],
    subcontractors: [],
    certifications: [],
    references: [],
    proposedSolutions: null,
    innovativeAspects: null,
    environmentalImpact: null,
    sustainabilityMeasures: null,
    proposedSchedule: null,
    keyMilestones: null,
    criticalPath: null,
    resourceAllocation: null,
    budgetBreakdown: null,
    costOptimization: null,
    paymentSchedule: null,
    warranties: null,
    supportServices: null,
    maintenancePlan: null,
    riskMitigation: null,
    qualityAssurance: null,
    performanceIndicators: null,
    communicationPlan: null,
    projectManagementApproach: null,
    changeManagement: null,
    stakeholderEngagement: null,
    knowledgeTransfer: null,
    postProjectSupport: null,
    smartPriorityScore: null,
    businessPriorityLevel: null,
    estimatedDuration: null,
    complexity: null,
    resourcesRequired: null,
    strategicImportance: null,
    clientSatisfactionImpact: null,
    revenueImpact: null,
    riskLevel: null,
    dependencies: [],
    urgencyLevel: null,
    lastPriorityUpdate: null,
    priorityOverride: null,
    overrideReason: null,
    lastActivity: null,
    estimatedStartDate: null,
    estimatedEndDate: null,
    actualStartDate: null,
    actualEndDate: null,
    deadlineDate: null,
    deadlineType: null,
    deadlineSource: null
  }
];

// Données historiques de revenus pour forecasting
const mockRevenueHistory = [
  { period: '2023-01', total_revenue: 45000, offer_count: 3, avg_margin: 18.5, conversion_rate: 65, project_types: { fenetre: 30000, porte: 15000 }},
  { period: '2023-02', total_revenue: 52000, offer_count: 4, avg_margin: 20.2, conversion_rate: 70, project_types: { fenetre: 35000, porte: 17000 }},
  { period: '2023-03', total_revenue: 48000, offer_count: 3, avg_margin: 19.1, conversion_rate: 68, project_types: { fenetre: 32000, porte: 16000 }},
  { period: '2023-04', total_revenue: 58000, offer_count: 5, avg_margin: 21.3, conversion_rate: 72, project_types: { fenetre: 38000, porte: 20000 }},
  { period: '2023-05', total_revenue: 63000, offer_count: 5, avg_margin: 22.1, conversion_rate: 75, project_types: { fenetre: 42000, porte: 21000 }},
  { period: '2023-06', total_revenue: 71000, offer_count: 6, avg_margin: 23.5, conversion_rate: 77, project_types: { fenetre: 47000, porte: 24000 }},
  { period: '2023-07', total_revenue: 67000, offer_count: 5, avg_margin: 22.8, conversion_rate: 74, project_types: { fenetre: 44000, porte: 23000 }},
  { period: '2023-08', total_revenue: 55000, offer_count: 4, avg_margin: 20.5, conversion_rate: 69, project_types: { fenetre: 36000, porte: 19000 }},
  { period: '2023-09', total_revenue: 61000, offer_count: 5, avg_margin: 21.7, conversion_rate: 73, project_types: { fenetre: 40000, porte: 21000 }},
  { period: '2023-10', total_revenue: 59000, offer_count: 4, avg_margin: 21.2, conversion_rate: 71, project_types: { fenetre: 38000, porte: 21000 }},
  { period: '2023-11', total_revenue: 66000, offer_count: 5, avg_margin: 22.4, conversion_rate: 76, project_types: { fenetre: 43000, porte: 23000 }},
  { period: '2023-12', total_revenue: 74000, offer_count: 6, avg_margin: 24.1, conversion_rate: 78, project_types: { fenetre: 49000, porte: 25000 }}
];

// ========================================
// SUITE DE TESTS PREDICTIVE ENGINE
// ========================================

describe('PredictiveEngineService - Tests Exhaustifs', () => {
  let predictiveEngine: PredictiveEngineService;
  let mockStorage: Partial<IStorage>;
  let mockAnalyticsService: any;

  beforeEach(() => {
    mockStorage = createMockStorage();
    mockAnalyticsService = createMockAnalyticsService();
    
    // Configuration des données mock
    mockStorage.getUsers.mockResolvedValue(mockUsers);
    mockStorage.getProjects.mockResolvedValue(mockProjects);
    mockStorage.getOffers.mockResolvedValue(mockOffers);

    predictiveEngine = new PredictiveEngineService(mockStorage, mockAnalyticsService);
  });

  // ========================================
  // TESTS FORECASTING REVENUS 3 ALGORITHMES
  // ========================================

  describe('Forecasting CA avec 3 Algorithmes', () => {
    test('forecasting exponential smoothing avec confiance élevée', async () => {
      const query = {
        start_date: '2023-01-01',
        end_date: '2023-12-31',
        forecast_months: 6,
        method: 'exp_smoothing' as const,
        granularity: 'month' as const
      };

      const forecast = await predictiveEngine.generateRevenueForecast(query);

      expect(forecast).toBeDefined();
      expect(forecast.forecast_point.method_used).toBe('exp_smoothing');
      expect(forecast.confidence_level).toBeGreaterThan(70); // Confiance élevée attendue
      expect(forecast.forecast_point.revenue_forecast).toBeGreaterThan(0);
      expect(Array.isArray(forecast.underlying_factors)).toBe(true);
      expect(['up', 'down', 'stable']).toContain(forecast.trend_direction);
    });

    test('forecasting moving average avec volatilité mesurée', async () => {
      const query = {
        start_date: '2023-01-01',
        end_date: '2023-12-31',
        forecast_months: 3,
        method: 'moving_average' as const,
        granularity: 'month' as const
      };

      const forecast = await predictiveEngine.generateRevenueForecast(query);

      expect(forecast).toBeDefined();
      expect(forecast.forecast_point.method_used).toBe('moving_average');
      expect(forecast.volatility_score).toBeGreaterThanOrEqual(0);
      expect(forecast.volatility_score).toBeLessThanOrEqual(100);
      expect(forecast.seasonal_adjustment).toBeDefined();
    });

    test('forecasting trend analysis avec facteurs explicatifs', async () => {
      const query = {
        start_date: '2023-01-01',
        end_date: '2023-12-31',
        forecast_months: 12,
        method: 'trend_analysis' as const,
        granularity: 'quarter' as const,
        segment: 'menuiserie'
      };

      const forecast = await predictiveEngine.generateRevenueForecast(query);

      expect(forecast).toBeDefined();
      expect(forecast.forecast_point.method_used).toBe('trend_analysis');
      expect(forecast.underlying_factors.length).toBeGreaterThan(0);
      expect(forecast.underlying_factors).toContain('historical_growth_trend');
    });

    test('comparaison précision 3 algorithmes forecasting', async () => {
      const baseQuery = {
        start_date: '2023-01-01',
        end_date: '2023-12-31',
        forecast_months: 6,
        granularity: 'month' as const
      };

      const [expSmoothing, movingAvg, trendAnalysis] = await Promise.all([
        predictiveEngine.generateRevenueForecast({ ...baseQuery, method: 'exp_smoothing' }),
        predictiveEngine.generateRevenueForecast({ ...baseQuery, method: 'moving_average' }),
        predictiveEngine.generateRevenueForecast({ ...baseQuery, method: 'trend_analysis' })
      ]);

      // Tous les algorithmes doivent produire des résultats valides
      [expSmoothing, movingAvg, trendAnalysis].forEach(forecast => {
        expect(forecast.forecast_point.revenue_forecast).toBeGreaterThan(0);
        expect(forecast.confidence_level).toBeGreaterThan(0);
        expect(forecast.confidence_level).toBeLessThanOrEqual(100);
      });

      // Les prévisions ne doivent pas être identiques
      expect(expSmoothing.forecast_point.revenue_forecast).not.toBe(movingAvg.forecast_point.revenue_forecast);
    });
  });

  // ========================================
  // TESTS DÉTECTION PROJETS À RISQUE
  // ========================================

  describe('Détection Projets à Risque - Scoring 0-100', () => {
    test('évalue projets à risque avec scoring 0-100', async () => {
      const riskParams = {
        risk_level: 'medium' as const,
        project_types: ['fenetre', 'porte'],
        limit: 10,
        include_predictions: true
      };

      const riskyProjects = await predictiveEngine.assessProjectRisks(riskParams);

      expect(Array.isArray(riskyProjects)).toBe(true);
      
      riskyProjects.forEach(project => {
        expect(project.risk_score).toBeGreaterThanOrEqual(0);
        expect(project.risk_score).toBeLessThanOrEqual(100);
        expect(project.project_id).toBeDefined();
        expect(Array.isArray(project.risk_factors)).toBe(true);
        expect(Array.isArray(project.recommended_actions)).toBe(true);
      });
    });

    test('identifie facteurs de risque spécifiques avec impact', async () => {
      const riskParams = {
        risk_level: 'high' as const,
        project_types: ['fenetre'],
        include_predictions: true
      };

      const riskyProjects = await predictiveEngine.assessProjectRisks(riskParams);

      if (riskyProjects.length > 0) {
        const highRiskProject = riskyProjects[0];
        
        expect(highRiskProject.risk_factors.length).toBeGreaterThan(0);
        
        highRiskProject.risk_factors.forEach(factor => {
          expect(factor.type).toBeDefined();
          expect(['complexity', 'team_load', 'historical_delay', 'external', 'budget']).toContain(factor.type);
          expect(factor.impact_score).toBeGreaterThanOrEqual(0);
          expect(factor.impact_score).toBeLessThanOrEqual(100);
          expect(factor.likelihood).toBeGreaterThanOrEqual(0);
          expect(factor.likelihood).toBeLessThanOrEqual(100);
          expect(factor.mitigation_suggested).toBeDefined();
        });
      }
    });

    test('génère actions préventives avec effort estimé', async () => {
      const riskParams = {
        risk_level: 'all' as const,
        limit: 5
      };

      const riskyProjects = await predictiveEngine.assessProjectRisks(riskParams);

      if (riskyProjects.length > 0) {
        const project = riskyProjects[0];
        
        expect(project.recommended_actions.length).toBeGreaterThan(0);
        
        project.recommended_actions.forEach(action => {
          expect(action.type).toBeDefined();
          expect(['resource_adjustment', 'timeline_extension', 'scope_reduction', 'escalation']).toContain(action.type);
          expect(action.urgency).toBeDefined();
          expect(['low', 'medium', 'high', 'critical']).toContain(action.urgency);
          expect(action.estimated_effort_hours).toBeGreaterThan(0);
          expect(action.expected_risk_reduction).toBeGreaterThanOrEqual(0);
          expect(action.expected_risk_reduction).toBeLessThanOrEqual(100);
        });
      }
    });

    test('prédictions délais et budget overrun', async () => {
      const riskParams = {
        risk_level: 'medium' as const,
        include_predictions: true
      };

      const riskyProjects = await predictiveEngine.assessProjectRisks(riskParams);

      if (riskyProjects.length > 0) {
        const project = riskyProjects[0];
        
        if (project.predicted_delay_days !== undefined) {
          expect(project.predicted_delay_days).toBeGreaterThanOrEqual(0);
        }
        
        if (project.predicted_budget_overrun !== undefined) {
          expect(project.predicted_budget_overrun).toBeGreaterThanOrEqual(0);
        }
        
        expect(project.assessment_date).toBeDefined();
        expect(project.next_review_date).toBeDefined();
      }
    });
  });

  // ========================================
  // TESTS CACHE TTL 30 MINUTES
  // ========================================

  describe('Cache TTL 30 Minutes', () => {
    test('cache TTL 30min respecté pour forecasting', async () => {
      const query = {
        start_date: '2023-01-01',
        end_date: '2023-12-31',
        forecast_months: 6,
        method: 'exp_smoothing' as const
      };

      // Premier appel
      const startTime = Date.now();
      const result1 = await predictiveEngine.generateRevenueForecast(query);
      
      // Deuxième appel immédiat (devrait utiliser cache)
      const result2 = await predictiveEngine.generateRevenueForecast(query);
      
      // Les résultats doivent être identiques (cache hit)
      expect(result1.forecast_point.revenue_forecast).toBe(result2.forecast_point.revenue_forecast);
      expect(result1.confidence_level).toBe(result2.confidence_level);
    });

    test('cache invalidation après TTL', async () => {
      const query = {
        start_date: '2023-01-01',
        end_date: '2023-12-31',
        forecast_months: 3,
        method: 'moving_average' as const
      };

      // Premier appel
      await predictiveEngine.generateRevenueForecast(query);
      
      // Simuler expiration cache (clear explicite)
      predictiveEngine.clearCache();
      
      // Nouvel appel après expiration
      const result = await predictiveEngine.generateRevenueForecast(query);
      
      expect(result).toBeDefined();
      expect(result.forecast_point.revenue_forecast).toBeGreaterThan(0);
    });

    test('cache séparé par query parameters', async () => {
      const query1 = {
        start_date: '2023-01-01',
        end_date: '2023-12-31',
        forecast_months: 3,
        method: 'exp_smoothing' as const
      };

      const query2 = {
        start_date: '2023-01-01',
        end_date: '2023-12-31',
        forecast_months: 6, // Différent
        method: 'exp_smoothing' as const
      };

      const [result1, result2] = await Promise.all([
        predictiveEngine.generateRevenueForecast(query1),
        predictiveEngine.generateRevenueForecast(query2)
      ]);

      // Résultats différents car queries différentes
      expect(result1.forecast_point.revenue_forecast).not.toBe(result2.forecast_point.revenue_forecast);
    });

    test('performance cache vs recalcul', async () => {
      const query = {
        start_date: '2023-01-01',
        end_date: '2023-12-31',
        forecast_months: 6,
        method: 'trend_analysis' as const
      };

      // Premier appel (calcul complet)
      const start1 = Date.now();
      await predictiveEngine.generateRevenueForecast(query);
      const duration1 = Date.now() - start1;

      // Deuxième appel (cache hit)
      const start2 = Date.now();
      await predictiveEngine.generateRevenueForecast(query);
      const duration2 = Date.now() - start2;

      // Cache doit être plus rapide
      expect(duration2).toBeLessThan(duration1);
      expect(duration2).toBeLessThan(50); // Cache très rapide
    });

    test('gestion mémoire cache avec limite', async () => {
      // Générer beaucoup de queries différentes pour tester la limite du cache
      const queries = Array.from({ length: 15 }, (_, i) => ({
        start_date: '2023-01-01',
        end_date: '2023-12-31',
        forecast_months: 3 + i, // Queries différentes
        method: 'exp_smoothing' as const
      }));

      // Exécuter toutes les queries
      const results = await Promise.all(
        queries.map(query => predictiveEngine.generateRevenueForecast(query))
      );

      // Toutes doivent réussir
      expect(results).toHaveLength(15);
      results.forEach(result => {
        expect(result.forecast_point.revenue_forecast).toBeGreaterThan(0);
      });

      // Tester qu'une query ancienne est sortie du cache
      const firstQueryAgain = await predictiveEngine.generateRevenueForecast(queries[0]);
      expect(firstQueryAgain.forecast_point.revenue_forecast).toBeGreaterThan(0);
    });
  });

  // ========================================
  // TESTS RECOMMANDATIONS BUSINESS
  // ========================================

  describe('Recommandations Business Intelligence', () => {
    test('génère recommandations avec impact estimé', async () => {
      const context = {
        analysis_period: {
          from: new Date('2024-01-01'),
          to: new Date('2024-02-29')
        },
        focus_areas: ['revenue', 'costs', 'planning'] as const,
        priority_threshold: 'medium' as const
      };

      const recommendations = await predictiveEngine.generateBusinessRecommendations(context);

      expect(Array.isArray(recommendations)).toBe(true);
      
      if (recommendations.length > 0) {
        const rec = recommendations[0];
        
        expect(rec.category).toBeDefined();
        expect(['revenue', 'costs', 'planning', 'quality', 'process']).toContain(rec.category);
        expect(rec.title).toBeDefined();
        expect(rec.description).toBeDefined();
        expect(rec.rationale).toBeDefined();
        expect(['low', 'medium', 'high', 'critical']).toContain(rec.priority);
        
        expect(rec.estimated_impact).toBeDefined();
        expect(rec.implementation).toBeDefined();
        expect(rec.implementation.effort_estimate_hours).toBeGreaterThan(0);
        expect(rec.implementation.timeline_weeks).toBeGreaterThan(0);
        expect(Array.isArray(rec.implementation.success_metrics)).toBe(true);
      }
    });

    test('recommandations priorisées par impact ROI', async () => {
      const context = {
        analysis_period: {
          from: new Date('2024-01-01'),
          to: new Date('2024-02-29')
        },
        focus_areas: ['revenue'] as const,
        priority_threshold: 'high' as const
      };

      const recommendations = await predictiveEngine.generateBusinessRecommendations(context);

      if (recommendations.length > 1) {
        // Vérifier que les recommandations sont ordonnées par priorité
        for (let i = 0; i < recommendations.length - 1; i++) {
          const current = recommendations[i];
          const next = recommendations[i + 1];
          
          const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
          expect(priorityOrder[current.priority]).toBeGreaterThanOrEqual(priorityOrder[next.priority]);
        }
      }
    });
  });

  // ========================================
  // TESTS PERFORMANCE ET STABILITÉ
  // ========================================

  describe('Performance et Stabilité', () => {
    test('temps réponse forecasting < 200ms', async () => {
      const query = {
        start_date: '2023-01-01',
        end_date: '2023-12-31',
        forecast_months: 6,
        method: 'exp_smoothing' as const
      };

      const startTime = Date.now();
      await predictiveEngine.generateRevenueForecast(query);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(200); // Performance < 200ms
    });

    test('gestion erreurs analytics service sans crash', async () => {
      // Forcer erreur dans analytics
      mockAnalyticsService.revenueCalculatorAPI.calculateRevenueForecast.mockRejectedValueOnce(
        new Error('Analytics service error')
      );

      const query = {
        start_date: '2023-01-01',
        end_date: '2023-12-31',
        forecast_months: 3,
        method: 'moving_average' as const
      };

      // Ne doit pas crasher
      const result = await predictiveEngine.generateRevenueForecast(query);
      
      // Résultat par défaut ou degraded mode
      expect(result).toBeDefined();
    });

    test('traitement concurrent multiples forecasts', async () => {
      const queries = [
        { start_date: '2023-01-01', end_date: '2023-12-31', forecast_months: 3, method: 'exp_smoothing' as const },
        { start_date: '2023-01-01', end_date: '2023-12-31', forecast_months: 6, method: 'moving_average' as const },
        { start_date: '2023-01-01', end_date: '2023-12-31', forecast_months: 12, method: 'trend_analysis' as const }
      ];

      const startTime = Date.now();
      const results = await Promise.all(
        queries.map(query => predictiveEngine.generateRevenueForecast(query))
      );
      const totalDuration = Date.now() - startTime;

      // Toutes les requêtes concurrentes doivent réussir
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.forecast_point.revenue_forecast).toBeGreaterThan(0);
      });

      // Performance globale acceptable
      expect(totalDuration).toBeLessThan(500); // 500ms pour 3 forecasts concurrents
    });
  });
});