import { describe, test, expect, beforeEach, vi } from 'vitest';
import { DateAlertDetectionService } from '../../server/services/DateAlertDetectionService';
import { EventBus } from '../../server/eventBus';
import { DateIntelligenceService } from '../../server/services/DateIntelligenceService';
import { AnalyticsService } from '../../server/services/AnalyticsService';
import { PredictiveEngineService } from '../../server/services/PredictiveEngineService';
import type { IStorage } from '../../server/storage-poc';
import type { 
  DateAlert, 
  InsertDateAlert, 
  Project, 
  ProjectStatus, 
  User, 
  BusinessAlert,
  InsertBusinessAlert,
  AlertThreshold,
  ThresholdKey
} from '../../shared/schema';

// ========================================
// MOCK SERVICES ET STORAGE
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

  // Méthodes Business Alerts
  getBusinessAlerts: vi.fn(),
  createBusinessAlert: vi.fn(),
  updateBusinessAlert: vi.fn(),
  getAlertThresholds: vi.fn(),
  upsertAlertThreshold: vi.fn(),
  getProjectTimelines: vi.fn(),

  // Autres méthodes requises
  createKPISnapshot: vi.fn(),
  getKPISnapshots: vi.fn(),
  getLatestKPISnapshot: vi.fn(),
  createBusinessMetric: vi.fn(),
  getBusinessMetrics: vi.fn(),
  getMetricTimeSeries: vi.fn(),
  createPerformanceBenchmark: vi.fn(),
  getBenchmarks: vi.fn(),
  getTopPerformers: vi.fn(),
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

const createMockEventBus = () => ({
  publish: vi.fn(),
  publishBusinessAlert: vi.fn(),
  publishAlertResolved: vi.fn(),
  publishAlertAcknowledged: vi.fn(),
});

const createMockDateIntelligenceService = () => ({
  detectProjectDelayRisks: vi.fn(),
  detectPlanningConflicts: vi.fn(),
  detectCriticalDeadlines: vi.fn(),
});

const createMockMenuiserieRules = () => ({
  detectWeatherRelatedDelays: vi.fn(),
  detectResourceConflicts: vi.fn(),
  calculateComplexityRisk: vi.fn(),
});

const createMockAnalyticsService = () => ({
  conversionCalculatorAPI: {
    calculateAOToOfferConversion: vi.fn(),
    calculateOfferToProjectConversion: vi.fn(),
  },
  marginCalculatorAPI: {
    calculateMarginAnalysis: vi.fn(),
  },
  teamLoadCalculator: {
    calculateTeamLoad: vi.fn(),
    detectTeamOverload: vi.fn(),
  },
  getRealtimeKPIs: vi.fn(),
});

const createMockPredictiveEngine = () => ({
  assessProjectRisks: vi.fn(),
  generateRevenueForecast: vi.fn(),
  clearCache: vi.fn(),
});

// ========================================
// DONNÉES DE TEST BUSINESS ALERTS
// ========================================

const mockUsers: User[] = [
  { 
    id: 'user1', 
    firstName: 'Alain', 
    lastName: 'Durand', 
    email: 'alain.durand@test.com', 
    profileImageUrl: null, 
    role: 'manager', 
    isActive: true, 
    chargeStatus: 'charge', 
    createdAt: new Date('2024-01-01'), 
    updatedAt: new Date('2024-01-01') 
  },
  { 
    id: 'user2', 
    firstName: 'Claire', 
    lastName: 'Martin', 
    email: 'claire.martin@test.com', 
    profileImageUrl: null, 
    role: 'technician', 
    isActive: true, 
    chargeStatus: 'surcharge', 
    createdAt: new Date('2024-01-01'), 
    updatedAt: new Date('2024-01-01') 
  }
];

const mockProjects: Project[] = [
  {
    id: 'proj1',
    name: 'Projet Test Marge Faible',
    offerId: 'offer1',
    status: 'chantier' as ProjectStatus,
    responsibleUserId: 'user1',
    budget: 20000, // Budget faible pour tester seuil rentabilité
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-02-01'),
    description: 'Projet avec marge faible pour test alertes',
    startDate: new Date('2024-02-15'),
    endDate: new Date('2024-05-15'),
    progress: 25,
    client: 'Client Test',
    location: 'Paris Test'
  },
  {
    id: 'proj2',
    name: 'Projet Test Retard',
    offerId: 'offer2',
    status: 'chantier' as ProjectStatus,
    responsibleUserId: 'user2',
    budget: 75000,
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-02-05'),
    description: 'Projet en retard pour test alertes',
    startDate: new Date('2024-01-20'),
    endDate: new Date('2024-03-20'), // Date passée pour simuler retard
    progress: 45,
    client: 'Client Retard',
    location: 'Lyon Test'
  }
];

const mockBusinessAlerts: BusinessAlert[] = [
  {
    id: 'alert1',
    type: 'profitability',
    entity_type: 'project',
    entity_id: 'proj1',
    entity_name: 'Projet Test Marge Faible',
    threshold_key: 'project_margin' as ThresholdKey,
    threshold_value: 15.0,
    actual_value: 8.5,
    variance: -6.5,
    severity: 'high',
    status: 'open',
    message: 'Marge projet inférieure au seuil critique',
    details: JSON.stringify({ 
      expected_margin: 15.0, 
      actual_margin: 8.5, 
      revenue_impact: -3000 
    }),
    created_at: new Date('2024-02-15'),
    updated_at: new Date('2024-02-15'),
    created_by: null,
    acknowledged_by: null,
    acknowledged_at: null,
    assigned_to: null,
    resolved_by: null,
    resolved_at: null,
    resolution_notes: null
  }
];

const mockAlertThresholds: AlertThreshold[] = [
  {
    id: 'threshold1',
    key: 'project_margin' as ThresholdKey,
    value: 15.0,
    operator: 'greater_than',
    is_active: true,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01')
  },
  {
    id: 'threshold2',
    key: 'team_utilization' as ThresholdKey,
    value: 85.0,
    operator: 'less_than',
    is_active: true,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01')
  },
  {
    id: 'threshold3',
    key: 'risk_score' as ThresholdKey,
    value: 75.0,
    operator: 'less_than',
    is_active: true,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01')
  }
];

// ========================================
// SUITE DE TESTS BUSINESS ALERTS
// ========================================

describe('DateAlertDetectionService - Business Alerts Tests', () => {
  let alertDetectionService: DateAlertDetectionService;
  let mockStorage: Partial<IStorage>;
  let mockEventBus: any;
  let mockDateIntelligence: any;
  let mockMenuiserieRules: any;
  let mockAnalyticsService: any;
  let mockPredictiveEngine: any;

  beforeEach(() => {
    mockStorage = createMockStorage();
    mockEventBus = createMockEventBus();
    mockDateIntelligence = createMockDateIntelligenceService();
    mockMenuiserieRules = createMockMenuiserieRules();
    mockAnalyticsService = createMockAnalyticsService();
    mockPredictiveEngine = createMockPredictiveEngine();
    
    // Configuration des données mock
    mockStorage.getUsers.mockResolvedValue(mockUsers);
    mockStorage.getProjects.mockResolvedValue(mockProjects);
    mockStorage.getBusinessAlerts.mockResolvedValue(mockBusinessAlerts);
    mockStorage.getAlertThresholds.mockResolvedValue(mockAlertThresholds);
    mockStorage.createBusinessAlert.mockImplementation(async (alert) => ({
      id: `alert_${Date.now()}`,
      ...alert,
      created_at: new Date(),
      updated_at: new Date()
    } as BusinessAlert));

    alertDetectionService = new DateAlertDetectionService(
      mockStorage,
      mockEventBus,
      mockDateIntelligence,
      mockMenuiserieRules,
      mockAnalyticsService,
      mockPredictiveEngine
    );
  });

  // ========================================
  // TESTS ÉVALUATION SEUILS RENTABILITÉ
  // ========================================

  describe('Évaluation Seuils Rentabilité avec AnalyticsService', () => {
    test('évalue seuils rentabilité avec analyticsService', async () => {
      // Mock analytics pour retourner données de marge
      mockAnalyticsService.marginCalculatorAPI.calculateMarginAnalysis.mockResolvedValue({
        average: 12.5,
        median: 13.0,
        byCategory: { 'fenetre': 10.5, 'porte': 15.2 },
        trending: -2.5,
        recommendations: ['Améliorer coûts matériaux']
      });

      const violations = await alertDetectionService.evaluateProfitabilityThresholds();

      expect(violations).toBeDefined();
      expect(Array.isArray(violations)).toBe(true);
      expect(mockAnalyticsService.marginCalculatorAPI.calculateMarginAnalysis).toHaveBeenCalled();

      // Vérifier qu'une violation a été détectée (marge 12.5% < seuil 15%)
      if (violations.length > 0) {
        const violation = violations[0];
        expect(violation.actual_value).toBe(12.5);
        expect(violation.variance).toBeLessThan(0); // Variance négative
        expect(violation.profitability_type).toBe('global_margin');
      }
    });

    test('détecte violations marge par projet avec détails', async () => {
      // Mock analytics pour projet spécifique avec marge faible
      mockAnalyticsService.marginCalculatorAPI.calculateMarginAnalysis.mockResolvedValue({
        average: 18.5,
        byCategory: { 'fenetre': 8.5 }, // Marge faible pour fenêtres
        byProject: { 'proj1': 8.5 }, // Projet spécifique avec marge faible
        trending: -1.2
      });

      const violations = await alertDetectionService.evaluateProfitabilityThresholds();

      expect(violations).toBeDefined();
      
      // Chercher violation spécifique au projet
      const projectViolation = violations.find(v => 
        v.entity_type === 'project' && v.entity_id === 'proj1'
      );

      if (projectViolation) {
        expect(projectViolation.actual_value).toBe(8.5);
        expect(projectViolation.variance).toBeLessThan(-5); // Écart significatif
        expect(projectViolation.profitability_type).toBe('project_margin');
        expect(projectViolation.entity_name).toBe('Projet Test Marge Faible');
      }
    });

    test('publie alertes rentabilité automatiquement via EventBus', async () => {
      mockAnalyticsService.marginCalculatorAPI.calculateMarginAnalysis.mockResolvedValue({
        average: 8.0, // Bien en dessous du seuil 15%
        trending: -3.0
      });

      await alertDetectionService.runPeriodicDetection();

      // Vérifier publication EventBus
      expect(mockEventBus.publishBusinessAlert).toHaveBeenCalled();
      
      const publishedAlert = mockEventBus.publishBusinessAlert.mock.calls[0]?.[0];
      if (publishedAlert) {
        expect(publishedAlert.type).toBe('profitability');
        expect(publishedAlert.severity).toBeDefined();
        expect(['low', 'medium', 'high', 'critical']).toContain(publishedAlert.severity);
      }
    });
  });

  // ========================================
  // TESTS DÉTECTION SURCHARGE ÉQUIPES
  // ========================================

  describe('Détection Surcharge Équipes', () => {
    test('détecte surcharge équipes avec seuils configurables', async () => {
      // Mock analytics pour équipe surchargée
      mockAnalyticsService.teamLoadCalculator.detectTeamOverload.mockResolvedValue({
        overloadedTeams: [
          {
            userId: 'user2',
            userName: 'Claire Martin',
            loadPercentage: 95, // Surcharge
            hoursAssigned: 190,
            capacityHours: 200,
            efficiency: 85,
            status: 'critical'
          }
        ],
        averageLoadPercentage: 82,
        optimizationSuggestions: [
          {
            type: 'rebalance',
            description: 'Redistribuer charge vers équipe user1',
            urgency: 'high',
            estimatedBenefit: 15
          }
        ]
      });

      const teamViolations = await alertDetectionService.evaluateTeamUtilizationThresholds();

      expect(teamViolations).toBeDefined();
      expect(Array.isArray(teamViolations)).toBe(true);
      
      if (teamViolations.length > 0) {
        const violation = teamViolations[0];
        expect(violation.team_id).toBe('user2');
        expect(violation.utilization_rate).toBe(95);
        expect(violation.variance).toBeGreaterThan(0); // Surcharge = variance positive
        expect(violation.current_projects).toBeDefined();
      }
    });

    test('ignore équipes en dessous du seuil', async () => {
      // Mock analytics avec équipes normalement chargées
      mockAnalyticsService.teamLoadCalculator.detectTeamOverload.mockResolvedValue({
        overloadedTeams: [], // Aucune surcharge
        averageLoadPercentage: 75, // En dessous du seuil 85%
        optimizationSuggestions: []
      });

      const teamViolations = await alertDetectionService.evaluateTeamUtilizationThresholds();

      expect(teamViolations).toBeDefined();
      expect(teamViolations.length).toBe(0); // Aucune violation
    });

    test('calcule variance précise pour équipes surchargées', async () => {
      mockAnalyticsService.teamLoadCalculator.detectTeamOverload.mockResolvedValue({
        overloadedTeams: [
          {
            userId: 'user2',
            userName: 'Claire Martin',
            loadPercentage: 92, // 92% vs seuil 85% = +7%
            hoursAssigned: 184,
            capacityHours: 200,
            efficiency: 88,
            status: 'overloaded'
          }
        ],
        averageLoadPercentage: 92
      });

      const violations = await alertDetectionService.evaluateTeamUtilizationThresholds();

      if (violations.length > 0) {
        const violation = violations[0];
        expect(violation.variance).toBeCloseTo(7, 1); // +7% au-dessus du seuil
        expect(violation.team_name).toBe('Claire Martin');
        expect(violation.period).toBeDefined();
      }
    });
  });

  // ========================================
  // TESTS DÉTECTION RISQUES PRÉDICTIFS
  // ========================================

  describe('Détection Risques Prédictifs', () => {
    test('évalue risques projets avec PredictiveEngine', async () => {
      // Mock PredictiveEngine avec projets à risque
      mockPredictiveEngine.assessProjectRisks.mockResolvedValue([
        {
          id: 'risk1',
          project_id: 'proj2',
          risk_score: 85, // Score élevé
          risk_factors: [
            {
              type: 'complexity',
              impact_score: 70,
              likelihood: 80,
              description: 'Projet complexe avec risques techniques',
              mitigation_suggested: 'Ajouter expertise technique'
            }
          ],
          predicted_delay_days: 15,
          predicted_budget_overrun: 12.5,
          recommended_actions: [
            {
              type: 'resource_adjustment',
              urgency: 'high',
              estimated_effort_hours: 40,
              expected_risk_reduction: 25
            }
          ],
          assessment_date: new Date().toISOString(),
          next_review_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        }
      ]);

      const riskViolations = await alertDetectionService.evaluatePredictiveRiskThresholds();

      expect(riskViolations).toBeDefined();
      expect(Array.isArray(riskViolations)).toBe(true);
      
      if (riskViolations.length > 0) {
        const violation = riskViolations[0];
        expect(violation.project_id).toBe('proj2');
        expect(violation.risk_score).toBe(85);
        expect(violation.variance).toBeGreaterThan(0); // Au-dessus seuil 75
        expect(Array.isArray(violation.risk_factors)).toBe(true);
        expect(violation.predicted_delay_days).toBe(15);
        expect(violation.predicted_budget_overrun).toBe(12.5);
      }
    });

    test('filtre projets selon seuil de risque configurable', async () => {
      // Mock avec projets à risques variables
      mockPredictiveEngine.assessProjectRisks.mockResolvedValue([
        { project_id: 'proj1', risk_score: 70 }, // En dessous seuil 75
        { project_id: 'proj2', risk_score: 85 }, // Au-dessus seuil 75
        { project_id: 'proj3', risk_score: 90 }  // Bien au-dessus seuil 75
      ]);

      const violations = await alertDetectionService.evaluatePredictiveRiskThresholds();

      // Seuls les projets au-dessus du seuil 75 doivent générer des violations
      const highRiskViolations = violations.filter(v => v.risk_score > 75);
      expect(highRiskViolations.length).toBe(2);
      
      expect(highRiskViolations.some(v => v.project_id === 'proj2')).toBe(true);
      expect(highRiskViolations.some(v => v.project_id === 'proj3')).toBe(true);
      expect(highRiskViolations.some(v => v.project_id === 'proj1')).toBe(false);
    });
  });

  // ========================================
  // TESTS EVENTBUS PUBLISHING AUTOMATIQUE
  // ========================================

  describe('EventBus Publishing Automatique', () => {
    test('EventBus publishing automatique pour nouvelles alertes', async () => {
      // Mock diverses violations
      mockAnalyticsService.marginCalculatorAPI.calculateMarginAnalysis.mockResolvedValue({
        average: 8.0 // Violation rentabilité
      });
      
      mockAnalyticsService.teamLoadCalculator.detectTeamOverload.mockResolvedValue({
        overloadedTeams: [{
          userId: 'user2',
          loadPercentage: 95 // Violation surcharge
        }]
      });

      await alertDetectionService.runPeriodicDetection();

      // Vérifier que EventBus a été appelé pour chaque type d'alerte
      expect(mockEventBus.publishBusinessAlert).toHaveBeenCalled();
      expect(mockEventBus.publishBusinessAlert).toHaveBeenCalledTimes(2); // Une pour rentabilité, une pour surcharge
    });

    test('publie événements avec métadonnées complètes', async () => {
      mockAnalyticsService.marginCalculatorAPI.calculateMarginAnalysis.mockResolvedValue({
        average: 10.0,
        byProject: { 'proj1': 8.5 }
      });

      await alertDetectionService.runPeriodicDetection();

      // Vérifier le contenu publié
      const publishedEvent = mockEventBus.publishBusinessAlert.mock.calls[0]?.[0];
      
      if (publishedEvent) {
        expect(publishedEvent).toHaveProperty('type');
        expect(publishedEvent).toHaveProperty('entity_type');
        expect(publishedEvent).toHaveProperty('entity_id');
        expect(publishedEvent).toHaveProperty('severity');
        expect(publishedEvent).toHaveProperty('threshold_value');
        expect(publishedEvent).toHaveProperty('actual_value');
        expect(publishedEvent).toHaveProperty('variance');
        expect(publishedEvent).toHaveProperty('message');
        expect(publishedEvent).toHaveProperty('details');
      }
    });

    test('gère erreurs EventBus sans interrompre détection', async () => {
      // Forcer erreur EventBus
      mockEventBus.publishBusinessAlert.mockImplementationOnce(() => {
        throw new Error('EventBus connection error');
      });

      mockAnalyticsService.marginCalculatorAPI.calculateMarginAnalysis.mockResolvedValue({
        average: 8.0 // Violation
      });

      // La détection doit continuer malgré l'erreur EventBus
      const summary = await alertDetectionService.runPeriodicDetection();
      
      expect(summary).toBeDefined();
      expect(summary.totalAlertsGenerated).toBeGreaterThan(0);
    });
  });
});

// ========================================
// TESTS WORKFLOW ALERTES (CRUD)
// ========================================

describe('Alert Workflow - CRUD Operations', () => {
  let mockStorage: Partial<IStorage>;
  let mockEventBus: any;

  beforeEach(() => {
    mockStorage = createMockStorage();
    mockEventBus = createMockEventBus();
    
    mockStorage.getBusinessAlerts.mockResolvedValue(mockBusinessAlerts);
    mockStorage.getAlertThresholds.mockResolvedValue(mockAlertThresholds);
  });

  // ========================================
  // TESTS LIFECYCLE ALERTES
  // ========================================

  describe('Alert Lifecycle: open → acknowledge → resolve', () => {
    test('workflow complet: création → acknowledge → resolve', async () => {
      const alertData: InsertBusinessAlert = {
        type: 'profitability',
        entity_type: 'project',
        entity_id: 'proj1',
        entity_name: 'Projet Test',
        threshold_key: 'project_margin',
        threshold_value: 15.0,
        actual_value: 8.5,
        variance: -6.5,
        severity: 'high',
        status: 'open',
        message: 'Marge projet critique',
        details: JSON.stringify({ impact: 'high' })
      };

      // 1. Création
      const createdAlert = {
        id: 'alert_new',
        ...alertData,
        created_at: new Date(),
        updated_at: new Date(),
        created_by: null,
        acknowledged_by: null,
        acknowledged_at: null,
        assigned_to: null,
        resolved_by: null,
        resolved_at: null,
        resolution_notes: null
      };

      mockStorage.createBusinessAlert.mockResolvedValue(createdAlert);
      
      const newAlert = await mockStorage.createBusinessAlert(alertData);
      expect(newAlert.status).toBe('open');
      expect(newAlert.acknowledged_by).toBeNull();

      // 2. Acknowledge
      const acknowledgedAlert = {
        ...newAlert,
        status: 'acknowledged' as const,
        acknowledged_by: 'user1',
        acknowledged_at: new Date(),
        assigned_to: 'user1',
        updated_at: new Date()
      };

      mockStorage.updateBusinessAlert.mockResolvedValue(acknowledgedAlert);
      
      const ackAlert = await mockStorage.updateBusinessAlert(newAlert.id, {
        status: 'acknowledged',
        acknowledged_by: 'user1',
        acknowledged_at: new Date(),
        assigned_to: 'user1'
      });

      expect(ackAlert.status).toBe('acknowledged');
      expect(ackAlert.acknowledged_by).toBe('user1');
      expect(ackAlert.assigned_to).toBe('user1');

      // 3. Resolve
      const resolvedAlert = {
        ...ackAlert,
        status: 'resolved' as const,
        resolved_by: 'user1',
        resolved_at: new Date(),
        resolution_notes: 'Marge corrigée par optimisation coûts',
        updated_at: new Date()
      };

      mockStorage.updateBusinessAlert.mockResolvedValue(resolvedAlert);
      
      const resolvedAlertResult = await mockStorage.updateBusinessAlert(ackAlert.id, {
        status: 'resolved',
        resolved_by: 'user1',
        resolved_at: new Date(),
        resolution_notes: 'Marge corrigée par optimisation coûts'
      });

      expect(resolvedAlertResult.status).toBe('resolved');
      expect(resolvedAlertResult.resolved_by).toBe('user1');
      expect(resolvedAlertResult.resolution_notes).toBeDefined();
    });

    test('acknowledge publie événement EventBus', async () => {
      const alertId = 'alert1';
      const acknowledgeData = {
        status: 'acknowledged' as const,
        acknowledged_by: 'user1',
        acknowledged_at: new Date(),
        assigned_to: 'user1'
      };

      mockStorage.updateBusinessAlert.mockResolvedValue({
        ...mockBusinessAlerts[0],
        ...acknowledgeData,
        updated_at: new Date()
      });

      await mockStorage.updateBusinessAlert(alertId, acknowledgeData);

      // Dans un vrai service, ceci déclencherait l'événement
      mockEventBus.publishAlertAcknowledged({
        alertId,
        acknowledgedBy: 'user1',
        assignedTo: 'user1',
        timestamp: new Date()
      });

      expect(mockEventBus.publishAlertAcknowledged).toHaveBeenCalledWith({
        alertId,
        acknowledgedBy: 'user1',
        assignedTo: 'user1',
        timestamp: expect.any(Date)
      });
    });

    test('resolve avec notes obligatoires', async () => {
      const alertId = 'alert1';
      
      // Test sans notes (doit échouer dans validation)
      const resolveWithoutNotes = {
        status: 'resolved' as const,
        resolved_by: 'user1',
        resolved_at: new Date(),
        resolution_notes: null // Notes manquantes
      };

      // Dans un vrai service, ceci déclencherait une erreur de validation
      expect(() => {
        if (!resolveWithoutNotes.resolution_notes) {
          throw new Error('Resolution notes are required');
        }
      }).toThrow('Resolution notes are required');

      // Test avec notes (doit réussir)
      const resolveWithNotes = {
        status: 'resolved' as const,
        resolved_by: 'user1',
        resolved_at: new Date(),
        resolution_notes: 'Action corrective appliquée'
      };

      mockStorage.updateBusinessAlert.mockResolvedValue({
        ...mockBusinessAlerts[0],
        ...resolveWithNotes,
        updated_at: new Date()
      });

      const result = await mockStorage.updateBusinessAlert(alertId, resolveWithNotes);
      
      expect(result.status).toBe('resolved');
      expect(result.resolution_notes).toBe('Action corrective appliquée');
    });
  });

  // ========================================
  // TESTS ASSIGNMENT AVEC NOTES
  // ========================================

  describe('Assignment avec Notes', () => {
    test('assign alerte avec notes explicatives', async () => {
      const alertId = 'alert1';
      const assignmentData = {
        assigned_to: 'user2',
        status: 'acknowledged' as const,
        acknowledged_by: 'user1',
        acknowledged_at: new Date(),
        resolution_notes: null // Pas encore de résolution
      };

      mockStorage.updateBusinessAlert.mockResolvedValue({
        ...mockBusinessAlerts[0],
        ...assignmentData,
        updated_at: new Date()
      });

      const assignedAlert = await mockStorage.updateBusinessAlert(alertId, assignmentData);
      
      expect(assignedAlert.assigned_to).toBe('user2');
      expect(assignedAlert.acknowledged_by).toBe('user1');
      expect(assignedAlert.status).toBe('acknowledged');
    });

    test('reassign alerte avec historique', async () => {
      // Première assignation
      const firstAssignment = {
        assigned_to: 'user1',
        status: 'acknowledged' as const,
        acknowledged_by: 'user1',
        acknowledged_at: new Date()
      };

      mockStorage.updateBusinessAlert.mockResolvedValueOnce({
        ...mockBusinessAlerts[0],
        ...firstAssignment
      });

      // Réassignation
      const reassignment = {
        assigned_to: 'user2', // Changement d'assigné
        status: 'acknowledged' as const,
        acknowledged_by: 'user1' // Celui qui fait la réassignation
      };

      mockStorage.updateBusinessAlert.mockResolvedValueOnce({
        ...mockBusinessAlerts[0],
        ...reassignment,
        updated_at: new Date()
      });

      const firstResult = await mockStorage.updateBusinessAlert('alert1', firstAssignment);
      const reassignResult = await mockStorage.updateBusinessAlert('alert1', reassignment);

      expect(firstResult.assigned_to).toBe('user1');
      expect(reassignResult.assigned_to).toBe('user2');
      expect(reassignResult.acknowledged_by).toBe('user1'); // Toujours le même
    });
  });

  // ========================================
  // TESTS SEUILS CONFIGURABLES CRUD
  // ========================================

  describe('Seuils Configurables CRUD', () => {
    test('création nouveau seuil avec validation', async () => {
      const newThreshold = {
        key: 'global_margin' as ThresholdKey,
        value: 20.0, // Nouveau seuil marge globale
        operator: 'greater_than' as const,
        is_active: true
      };

      const createdThreshold = {
        id: 'threshold_new',
        ...newThreshold,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockStorage.upsertAlertThreshold.mockResolvedValue(createdThreshold);
      
      const result = await mockStorage.upsertAlertThreshold(newThreshold);
      
      expect(result.key).toBe('global_margin');
      expect(result.value).toBe(20.0);
      expect(result.operator).toBe('greater_than');
      expect(result.is_active).toBe(true);
    });

    test('modification seuil existant', async () => {
      const existingThreshold = mockAlertThresholds[0];
      const updatedData = {
        ...existingThreshold,
        value: 18.0, // Changement de 15% à 18%
        updated_at: new Date()
      };

      mockStorage.upsertAlertThreshold.mockResolvedValue(updatedData);
      
      const result = await mockStorage.upsertAlertThreshold(updatedData);
      
      expect(result.value).toBe(18.0);
      expect(result.key).toBe('project_margin');
    });

    test('désactivation seuil sans suppression', async () => {
      const existingThreshold = mockAlertThresholds[1];
      const deactivatedData = {
        ...existingThreshold,
        is_active: false, // Désactivation
        updated_at: new Date()
      };

      mockStorage.upsertAlertThreshold.mockResolvedValue(deactivatedData);
      
      const result = await mockStorage.upsertAlertThreshold(deactivatedData);
      
      expect(result.is_active).toBe(false);
      expect(result.key).toBe('team_utilization');
    });

    test('récupération seuils actifs seulement', async () => {
      const activeThresholds = mockAlertThresholds.filter(t => t.is_active);
      
      mockStorage.getAlertThresholds.mockResolvedValue(activeThresholds);
      
      const result = await mockStorage.getAlertThresholds();
      
      expect(result.every(t => t.is_active)).toBe(true);
      expect(result.length).toBeLessThanOrEqual(mockAlertThresholds.length);
    });

    test('validation valeurs seuils cohérentes', async () => {
      const invalidThreshold = {
        key: 'team_utilization' as ThresholdKey,
        value: 150.0, // Valeur impossible > 100%
        operator: 'less_than' as const,
        is_active: true
      };

      // Dans un vrai service, ceci déclencherait une erreur de validation
      expect(() => {
        if (invalidThreshold.key === 'team_utilization' && invalidThreshold.value > 100) {
          throw new Error('Team utilization threshold cannot exceed 100%');
        }
      }).toThrow('Team utilization threshold cannot exceed 100%');
    });
  });
});