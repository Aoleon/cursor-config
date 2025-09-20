import { describe, test, expect, beforeEach, vi } from 'vitest';
import { AnalyticsService } from '../../server/services/AnalyticsService';
import { EventBus } from '../../server/eventBus';
import type { IStorage, DateRange } from '../../server/storage-poc';
import type { User, Ao, Offer, Project, KpiSnapshot, BusinessMetric, PerformanceBenchmark } from '../../shared/schema';

// ========================================
// MOCK STORAGE COMPLET POUR ANALYTICS
// ========================================

const createMockStorage = (): Partial<IStorage> => ({
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

  // Méthodes Analytics
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

const createMockEventBus = () => ({
  publish: vi.fn(),
  publishAnalyticsCalculated: vi.fn(),
});

// ========================================
// DONNÉES DE TEST COMPLÈTES
// ========================================

const mockUsers: User[] = [
  { 
    id: 'user1', 
    firstName: 'Jean', 
    lastName: 'Dupont', 
    email: 'jean.dupont@test.com', 
    profileImageUrl: null, 
    role: 'manager', 
    isActive: true, 
    chargeStatus: 'disponible', 
    createdAt: new Date('2024-01-01'), 
    updatedAt: new Date('2024-01-01') 
  },
  { 
    id: 'user2', 
    firstName: 'Marie', 
    lastName: 'Martin', 
    email: 'marie.martin@test.com', 
    profileImageUrl: null, 
    role: 'technician', 
    isActive: true, 
    chargeStatus: 'charge', 
    createdAt: new Date('2024-01-01'), 
    updatedAt: new Date('2024-01-01') 
  }
];

const mockAos: Ao[] = [
  {
    id: 'ao1',
    reference: 'AO-2024-001',
    client: 'SCICV Boulogne',
    location: 'Boulogne-Billancourt',
    departement: '92',
    menuiserieType: 'fenetre',
    intituleOperation: 'Remplacement fenêtres résidence',
    budgetEstimatif: 50000,
    datePublication: new Date('2024-01-15'),
    dateFinCandidature: new Date('2024-02-15'),
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
    maitreOuvrageId: 'mo1',
    // Autres champs requis
    maitreOeuvreId: null,
    descriptionProjet: null,
    dateFinRetrait: null,
    critereSelection: null,
    delaiExecution: null,
    modalitePaiement: null,
    modeConsultation: null,
    critereEvaluationTechnique: null,
    critereEvaluationFinancier: null,
    pieceAFournir: null,
    adresseRetrait: null,
    personne: null,
    telephone: null,
    email: null,
    conditionParticipation: null,
    source: null,
    marcheType: null,
    allotissement: null,
    nbrLot: null,
    publicationBoamp: false,
    publicationJoue: false,
    publicationPlateforme: null,
    publieProfilAcheteur: false,
    status: null,
    estimationMontant: null,
    competenceRequise: null,
    selectionComment: null
  },
  {
    id: 'ao2',
    reference: 'AO-2024-002',
    client: 'Mairie de Paris',
    location: 'Paris 15e',
    departement: '75',
    menuiserieType: 'porte',
    intituleOperation: 'Portes école primaire',
    budgetEstimatif: 30000,
    datePublication: new Date('2024-01-20'),
    dateFinCandidature: new Date('2024-02-20'),
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-01-20'),
    maitreOuvrageId: 'mo2',
    // Autres champs
    maitreOeuvreId: null,
    descriptionProjet: null,
    dateFinRetrait: null,
    critereSelection: null,
    delaiExecution: null,
    modalitePaiement: null,
    modeConsultation: null,
    critereEvaluationTechnique: null,
    critereEvaluationFinancier: null,
    pieceAFournir: null,
    adresseRetrait: null,
    personne: null,
    telephone: null,
    email: null,
    conditionParticipation: null,
    source: null,
    marcheType: null,
    allotissement: null,
    nbrLot: null,
    publicationBoamp: false,
    publicationJoue: false,
    publicationPlateforme: null,
    publieProfilAcheteur: false,
    status: null,
    estimationMontant: null,
    competenceRequise: null,
    selectionComment: null
  }
];

const mockOffers: Offer[] = [
  {
    id: 'offer1',
    reference: 'OFF-2024-001',
    aoId: 'ao1',
    status: 'valide',
    menuiserieType: 'fenetre',
    responsibleUserId: 'user1',
    client: 'SCICV Boulogne',
    location: 'Boulogne-Billancourt',
    departement: '92',
    intituleOperation: 'Remplacement fenêtres résidence',
    budgetTotalHt: 45000,
    budgetTotalTtc: 54000,
    createdAt: new Date('2024-01-25'),
    updatedAt: new Date('2024-01-25'),
    aoReference: 'AO-2024-001',
    technicalScore: 85,
    financialScore: 90,
    totalScore: 87.5,
    // Champs requis mais null pour ce test
    description: null,
    dateRemiseOffre: null,
    validityPeriod: null,
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

const mockProjects: Project[] = [
  {
    id: 'proj1',
    name: 'Projet Fenêtres SCICV',
    offerId: 'offer1',
    status: 'chantier',
    responsibleUserId: 'user1',
    budget: 54000,
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-01'),
    description: 'Remplacement fenêtres résidence SCICV',
    startDate: new Date('2024-02-15'),
    endDate: new Date('2024-04-15'),
    progress: 65,
    client: 'SCICV Boulogne',
    location: 'Boulogne-Billancourt'
  }
];

// ========================================
// SUITE DE TESTS ANALYTICS SERVICE
// ========================================

describe('AnalyticsService - Tests Exhaustifs', () => {
  let analyticsService: AnalyticsService;
  let mockStorage: Partial<IStorage>;
  let mockEventBus: any;
  let testPeriod: DateRange;

  beforeEach(() => {
    mockStorage = createMockStorage();
    mockEventBus = createMockEventBus();
    
    // Configuration des données mock
    mockStorage.getUsers.mockResolvedValue(mockUsers);
    mockStorage.getAos.mockResolvedValue(mockAos);
    mockStorage.getOffers.mockResolvedValue(mockOffers);
    mockStorage.getProjects.mockResolvedValue(mockProjects);

    testPeriod = {
      from: new Date('2024-01-01'),
      to: new Date('2024-01-31')
    };

    analyticsService = new AnalyticsService(mockStorage, mockEventBus);
  });

  // ========================================
  // TESTS MÉTRIQUES RENTABILITÉ
  // ========================================

  describe('Métriques de Rentabilité', () => {
    test('calcule métriques rentabilité sans erreur récursion', async () => {
      // Test avec timeout pour détecter récursion infinie
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Récursion infinie détectée!')), 5000);
      });

      const calculationPromise = analyticsService.conversionCalculatorAPI
        .calculateAOToOfferConversion(testPeriod);

      const result = await Promise.race([calculationPromise, timeoutPromise]);

      expect(result).toBeDefined();
      expect(result.rate).toBe(50); // 1 offre sur 2 AOs = 50%
      expect(result.totalInput).toBe(2);
      expect(result.totalOutput).toBe(1);
      expect(typeof result.trend).toBe('number');
    });

    test('calcule marges par catégorie de menuiserie', async () => {
      const margins = await analyticsService.marginCalculatorAPI
        .calculateMarginAnalysis(testPeriod);

      expect(margins).toBeDefined();
      expect(margins.average).toBeGreaterThan(0);
      expect(margins.byCategory).toBeDefined();
      expect(margins.byCategory['fenetre']).toBeDefined();
      expect(margins.trending).toBeDefined();
      expect(Array.isArray(margins.recommendations)).toBe(true);
    });

    test('génère revenue forecast avec confiance', async () => {
      const forecast = await analyticsService.revenueCalculatorAPI
        .calculateRevenueForecast(testPeriod);

      expect(forecast).toBeDefined();
      expect(forecast.amount).toBeGreaterThan(0);
      expect(forecast.confidence).toBeGreaterThanOrEqual(0);
      expect(forecast.confidence).toBeLessThanOrEqual(100);
      expect(forecast.byCategory).toBeDefined();
      expect(Array.isArray(forecast.byMonth)).toBe(true);
      expect(Array.isArray(forecast.riskFactors)).toBe(true);
    });
  });

  // ========================================
  // TESTS TENDANCES SUR 12 MOIS
  // ========================================

  describe('Génération Tendances 12 Mois', () => {
    test('génère tendances sur 12 mois avec données historiques', async () => {
      // Mock données historiques sur 12 mois
      const historicalPeriod = {
        from: new Date('2023-01-01'),
        to: new Date('2024-01-31')
      };

      const trends = await analyticsService.calculateTrendsAnalysis(historicalPeriod, 12);

      expect(trends).toBeDefined();
      expect(trends.conversionTrends).toBeDefined();
      expect(trends.revenueTrends).toBeDefined();
      expect(trends.marginTrends).toBeDefined();
      expect(trends.forecasts).toBeDefined();

      // Vérifier que les tendances couvrent 12 mois
      expect(trends.conversionTrends.monthlyData).toHaveLength(12);
      expect(trends.revenueTrends.monthlyData).toHaveLength(12);
    });

    test('détecte saisonnalité dans les tendances', async () => {
      const trends = await analyticsService.calculateSeasonalityAnalysis(
        new Date('2023-01-01'),
        new Date('2024-01-31')
      );

      expect(trends).toBeDefined();
      expect(trends.seasonalityIndex).toBeDefined();
      expect(trends.peakMonths).toBeDefined();
      expect(trends.lowMonths).toBeDefined();
      expect(trends.adjustmentFactors).toBeDefined();
    });

    test('performance calculation sous 200ms', async () => {
      const startTime = Date.now();
      
      await analyticsService.getRealtimeKPIs();
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(200); // Performance API < 200ms
    });
  });

  // ========================================
  // TESTS BENCHMARKS SECTEUR
  // ========================================

  describe('Benchmarks Secteur Carpentry', () => {
    test('génère benchmarks secteur menuiserie', async () => {
      mockStorage.getBenchmarks.mockResolvedValue([
        {
          id: 'bench1',
          metric: 'conversion_rate',
          value: '65.5',
          sector: 'menuiserie',
          region: 'ile-de-france',
          period: '2024-Q1',
          source: 'CAPEB',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]);

      const benchmarks = await analyticsService.benchmarkCalculatorAPI
        .calculateSectorBenchmarks('menuiserie', testPeriod);

      expect(benchmarks).toBeDefined();
      expect(benchmarks.conversionBenchmark).toBeDefined();
      expect(benchmarks.marginBenchmark).toBeDefined();
      expect(benchmarks.durationBenchmark).toBeDefined();
      expect(benchmarks.qualityBenchmark).toBeDefined();
      expect(benchmarks.positionVsMarket).toBeDefined();
    });

    test('compare performance équipe vs benchmarks', async () => {
      const comparison = await analyticsService.teamPerformanceCalculator
        .compareWithBenchmarks('user1', testPeriod);

      expect(comparison).toBeDefined();
      expect(comparison.userPerformance).toBeDefined();
      expect(comparison.benchmarkData).toBeDefined();
      expect(comparison.performanceGaps).toBeDefined();
      expect(comparison.improvementSuggestions).toBeDefined();
    });

    test('top performers identification', async () => {
      mockStorage.getTopPerformers.mockResolvedValue([
        {
          userId: 'user1',
          userName: 'Jean Dupont',
          metric: 'conversion_rate',
          value: 85.5,
          rank: 1,
          percentile: 95
        }
      ]);

      const topPerformers = await analyticsService.getTopPerformers('conversion_rate', 5);

      expect(topPerformers).toBeDefined();
      expect(Array.isArray(topPerformers)).toBe(true);
      expect(topPerformers.length).toBeGreaterThan(0);
      expect(topPerformers[0]).toHaveProperty('userId');
      expect(topPerformers[0]).toHaveProperty('metric');
      expect(topPerformers[0]).toHaveProperty('rank');
    });
  });

  // ========================================
  // TESTS CHARGE ÉQUIPE ET OPTIMISATION
  // ========================================

  describe('Gestion Charge Équipe', () => {
    test('détecte surcharge équipes avec seuils configurables', async () => {
      const overloadAnalysis = await analyticsService.teamLoadCalculator
        .detectTeamOverload(testPeriod, { maxLoadPercentage: 85 });

      expect(overloadAnalysis).toBeDefined();
      expect(Array.isArray(overloadAnalysis.overloadedTeams)).toBe(true);
      expect(Array.isArray(overloadAnalysis.optimizationSuggestions)).toBe(true);
      expect(overloadAnalysis.averageLoadPercentage).toBeDefined();
    });

    test('génère suggestions optimisation planning', async () => {
      const suggestions = await analyticsService.planningOptimizer
        .generateOptimizationSuggestions(testPeriod);

      expect(suggestions).toBeDefined();
      expect(Array.isArray(suggestions)).toBe(true);
      
      if (suggestions.length > 0) {
        expect(suggestions[0]).toHaveProperty('type');
        expect(suggestions[0]).toHaveProperty('description');
        expect(suggestions[0]).toHaveProperty('urgency');
        expect(suggestions[0]).toHaveProperty('estimatedBenefit');
      }
    });

    test('calcule efficacité équipes avec métriques qualité', async () => {
      const efficiency = await analyticsService.teamEfficiencyCalculator
        .calculateTeamEfficiency('user1', testPeriod);

      expect(efficiency).toBeDefined();
      expect(efficiency.efficiency).toBeGreaterThanOrEqual(0);
      expect(efficiency.efficiency).toBeLessThanOrEqual(100);
      expect(efficiency.deliveredOnTime).toBeDefined();
      expect(efficiency.qualityScore).toBeDefined();
      expect(efficiency.collaborationScore).toBeDefined();
    });
  });

  // ========================================
  // TESTS CACHE ET PERFORMANCE
  // ========================================

  describe('Cache et Performance', () => {
    test('cache évite recalculs multiples', async () => {
      // Premier appel
      await analyticsService.getRealtimeKPIs();
      
      // Reset mock counters
      vi.clearAllMocks();
      
      // Deuxième appel immédiat (devrait utiliser cache)
      await analyticsService.getRealtimeKPIs();
      
      // Vérifier que storage n'a pas été rappelé (utilisation cache)
      expect(mockStorage.getAos).not.toHaveBeenCalled();
      expect(mockStorage.getOffers).not.toHaveBeenCalled();
    });

    test('cache TTL respecté et expiration', async () => {
      // Premier appel
      await analyticsService.getRealtimeKPIs();
      
      // Clear cache explicitement
      analyticsService.clearCache();
      
      // Nouvel appel après clear
      await analyticsService.getRealtimeKPIs();
      
      // Storage devrait être rappelé
      expect(mockStorage.getAos).toHaveBeenCalled();
      expect(mockStorage.getOffers).toHaveBeenCalled();
    });

    test('gestion erreurs sans crash', async () => {
      // Forcer erreur storage
      mockStorage.getAos.mockRejectedValueOnce(new Error('Storage error'));
      
      // Le service ne devrait pas crasher
      const result = await analyticsService.conversionCalculatorAPI
        .calculateAOToOfferConversion(testPeriod);
      
      // Résultat par défaut en cas d'erreur
      expect(result).toBeDefined();
      expect(result.rate).toBe(0);
      expect(result.totalInput).toBe(0);
      expect(result.totalOutput).toBe(0);
    });
  });

  // ========================================
  // TESTS SNAPSHOTS ET PERSISTENCE
  // ========================================

  describe('KPI Snapshots et Persistence', () => {
    test('génère et sauvegarde snapshots KPI', async () => {
      const snapshotData = {
        snapshotDate: new Date(),
        periodFrom: testPeriod.from,
        periodTo: testPeriod.to,
        totalAos: 2,
        totalOffers: 1,
        totalProjects: 1,
        conversionRateAoToOffer: '50.0',
        conversionRateOfferToProject: '100.0',
        avgDelayDays: '0.0',
        totalRevenueForecast: '54000.0',
        avgTeamLoadPercentage: '75.0',
        criticalDeadlinesCount: 0,
        delayedProjectsCount: 0,
        conversionByUser: JSON.stringify({}),
        loadByUser: JSON.stringify({}),
        revenueByCategory: JSON.stringify({}),
        marginByCategory: JSON.stringify({})
      };

      mockStorage.createKPISnapshot.mockResolvedValue({
        id: 'snapshot1',
        ...snapshotData,
        createdAt: new Date()
      } as KpiSnapshot);

      const snapshot = await analyticsService.generateKPISnapshot(testPeriod, 'full');

      expect(snapshot).toBeDefined();
      expect(snapshot.id).toBeDefined();
      expect(snapshot.totalAos).toBe(2);
      expect(snapshot.totalOffers).toBe(1);
      expect(mockStorage.createKPISnapshot).toHaveBeenCalledTimes(1);
    });

    test('récupère historique snapshots avec filtering', async () => {
      const mockSnapshots: KpiSnapshot[] = [
        {
          id: 'snap1',
          snapshotDate: new Date('2024-01-31'),
          periodFrom: new Date('2024-01-01'),
          periodTo: new Date('2024-01-31'),
          totalAos: 2,
          totalOffers: 1,
          totalProjects: 1,
          conversionRateAoToOffer: '50.0',
          conversionRateOfferToProject: '100.0',
          avgDelayDays: '0.0',
          totalRevenueForecast: '54000.0',
          avgTeamLoadPercentage: '75.0',
          criticalDeadlinesCount: 0,
          delayedProjectsCount: 0,
          conversionByUser: '{}',
          loadByUser: '{}',
          revenueByCategory: '{}',
          marginByCategory: '{}',
          createdAt: new Date('2024-01-31')
        }
      ];

      mockStorage.getKPISnapshots.mockResolvedValue(mockSnapshots);

      const snapshots = await analyticsService.getKPIHistory(
        new Date('2024-01-01'),
        new Date('2024-02-01'),
        'monthly'
      );

      expect(snapshots).toBeDefined();
      expect(Array.isArray(snapshots)).toBe(true);
      expect(snapshots.length).toBeGreaterThan(0);
      expect(mockStorage.getKPISnapshots).toHaveBeenCalledTimes(1);
    });
  });

  // ========================================
  // TESTS INTÉGRATION EVENTBUS
  // ========================================

  describe('Intégration EventBus', () => {
    test('publie événements analytics calculés', async () => {
      await analyticsService.getRealtimeKPIs();

      expect(mockEventBus.publishAnalyticsCalculated).toHaveBeenCalled();
      const publishedData = mockEventBus.publishAnalyticsCalculated.mock.calls[0][0];
      
      expect(publishedData).toBeDefined();
      expect(publishedData.timestamp).toBeDefined();
      expect(publishedData.metrics).toBeDefined();
    });

    test('gère erreurs EventBus sans bloquer calculs', async () => {
      // Forcer erreur EventBus
      mockEventBus.publishAnalyticsCalculated.mockImplementationOnce(() => {
        throw new Error('EventBus error');
      });

      // Les calculs doivent continuer malgré l'erreur EventBus
      const result = await analyticsService.getRealtimeKPIs();
      
      expect(result).toBeDefined();
      expect(result.conversionRate).toBeDefined();
    });
  });
});