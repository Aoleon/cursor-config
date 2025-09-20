import { describe, test, expect, beforeEach, vi } from 'vitest';
import { AnalyticsService, type ConversionMetric } from '../../../server/services/AnalyticsService';
import { EventBus } from '../../../server/eventBus';
import type { IStorage, DateRange } from '../../../server/storage-poc';
import type { User, Ao, Offer, Project } from '../../../shared/schema';

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
} as any;

const mockEventBus: any = {
  publish: vi.fn(),
  publishAnalyticsCalculated: vi.fn(),
} as any;

describe('AnalyticsService - Sécurité Anti-Récursion', () => {
  let analyticsService: AnalyticsService;
  let testPeriod: DateRange;
  
  // Données de test simplifiées
  const mockUsers: User[] = [
    { 
      id: 'user1', 
      firstName: 'John', 
      lastName: 'Doe', 
      email: 'john@test.com', 
      profileImageUrl: null, 
      role: null, 
      isActive: true, 
      chargeStatus: 'disponible', 
      createdAt: new Date(), 
      updatedAt: new Date() 
    }
  ];

  const mockAos: Ao[] = [
    {
      id: 'ao1',
      reference: 'AO-001',
      client: 'Test Client 1',
      location: 'Paris',
      departement: '75',
      menuiserieType: 'fenetre',
      intituleOperation: 'Test AO 1',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      maitreOuvrageId: 'mo1',
      // Toutes les autres propriétés à null
      maitreOeuvreId: null,
      descriptionProjet: null,
      budgetEstimatif: null,
      datePublication: null,
      dateFinCandidature: null,
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
      reference: 'OFF-001',
      aoId: 'ao1',
      status: 'valide',
      menuiserieType: 'fenetre',
      responsibleUserId: 'user1',
      client: 'Test Client 1',
      location: 'Paris',
      departement: '75',
      intituleOperation: 'Test Offer 1',
      budgetTotalHt: 10000,
      budgetTotalTtc: 12000,
      createdAt: new Date('2024-01-02'),
      updatedAt: new Date('2024-01-02'),
      aoReference: 'AO-001',
      // Toutes les autres propriétés optionnelles à null ou valeurs par défaut
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

  const mockProjects: Project[] = [
    {
      id: 'proj1',
      name: 'Projet Test 1',
      offerId: 'offer1',
      status: 'planification',
      responsibleUserId: 'user1',
      budget: 10000,
      createdAt: new Date('2024-01-17'),
      updatedAt: new Date('2024-01-17'),
      description: null,
      startDate: null,
      endDate: null,
      progress: null,
      client: null,
      location: null
    }
  ];

  beforeEach(() => {
    // Reset tous les mocks
    vi.clearAllMocks();
    
    // Configuration des mocks
    mockStorage.getUsers.mockResolvedValue(mockUsers);
    mockStorage.getAos.mockResolvedValue(mockAos);
    mockStorage.getOffers.mockResolvedValue(mockOffers);
    mockStorage.getProjects.mockResolvedValue(mockProjects);
    mockStorage.createKPISnapshot.mockResolvedValue({ 
      id: 'kpi1', 
      snapshotDate: new Date(),
      periodFrom: new Date('2024-01-01'),
      periodTo: new Date('2024-01-31'),
      totalAos: 1,
      totalOffers: 1,
      totalProjects: 1,
      conversionRateAoToOffer: '100.0',
      conversionRateOfferToProject: '100.0',
      avgDelayDays: '0.0',
      totalRevenueForecast: '12000.0',
      avgTeamLoadPercentage: '85.0',
      criticalDeadlinesCount: 0,
      delayedProjectsCount: 0,
      conversionByUser: {},
      loadByUser: {},
      revenueByCategory: {},
      marginByCategory: {},
      createdAt: new Date()
    });

    // Période de test
    testPeriod = {
      from: new Date('2024-01-01'),
      to: new Date('2024-01-31')
    };

    // Créer l'instance service
    analyticsService = new AnalyticsService(mockStorage, mockEventBus);
  });

  describe('Protection Anti-Récursion - ConversionCalculator', () => {
    
    test('calculateAOToOfferConversion ne devrait PAS causer de récursion infinie', async () => {
      // Setup : Timeout de sécurité pour éviter les tests bloqués
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Test timeout - récursion infinie détectée!')), 5000);
      });

      // Test principal
      const calculationPromise = analyticsService.conversionCalculatorAPI
        .calculateAOToOfferConversion(testPeriod);

      // Race entre calcul et timeout
      const result = await Promise.race([calculationPromise, timeoutPromise]) as ConversionMetric;

      // Vérifications
      expect(result).toBeDefined();
      expect(result.rate).toBeDefined();
      expect(result.totalInput).toBeDefined();
      expect(result.totalOutput).toBeDefined();
      expect(result.trend).toBeDefined(); // Trend calculé SANS récursion
      expect(typeof result.trend).toBe('number');

      // Vérifier que les appels storage sont limités (pas d'explosion récursive)
      expect(mockStorage.getAos).toHaveBeenCalled();
      expect(mockStorage.getOffers).toHaveBeenCalled();
      // Les appels ne devraient pas exploser exponentiellement
      expect(mockStorage.getAos).toHaveBeenCalledTimes(2); // Une fois pour période courante, une fois pour période précédente
    });

    test('calculateOfferToProjectConversion ne devrait PAS causer de récursion infinie', async () => {
      // Setup : Timeout de sécurité
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Test timeout - récursion infinie détectée!')), 5000);
      });

      // Test principal  
      const calculationPromise = analyticsService.conversionCalculatorAPI
        .calculateOfferToProjectConversion(testPeriod);

      // Race entre calcul et timeout
      const result = await Promise.race([calculationPromise, timeoutPromise]) as ConversionMetric;

      // Vérifications
      expect(result).toBeDefined();
      expect(result.rate).toBeDefined();
      expect(result.totalInput).toBeDefined();
      expect(result.totalOutput).toBeDefined();
      expect(result.trend).toBeDefined(); // Trend calculé SANS récursion
      expect(typeof result.trend).toBe('number');
      expect(result.byUser).toBeDefined();

      // Vérifier limitation appels storage 
      expect(mockStorage.getOffers).toHaveBeenCalled();
      expect(mockStorage.getProjects).toHaveBeenCalled();
      expect(mockStorage.getUsers).toHaveBeenCalled();
      // Pas d'explosion exponentielle des appels
      expect(mockStorage.getOffers).toHaveBeenCalledTimes(2); // Période courante + période précédente
    });

    test('calculatePipelineConversion utilise les méthodes sécurisées', async () => {
      // Setup : Timeout de sécurité
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Test timeout - récursion infinie dans pipeline!')), 8000);
      });

      // Test : Le pipeline utilise les deux méthodes potentiellement récursives
      const pipelinePromise = analyticsService.conversionCalculatorAPI
        .calculatePipelineConversion(testPeriod);

      // Race entre calcul et timeout
      const result = await Promise.race([pipelinePromise, timeoutPromise]) as any;

      // Vérifications
      expect(result).toBeDefined();
      expect(result.aoToOffer).toBeDefined();
      expect(result.offerToProject).toBeDefined();
      expect(result.globalConversion).toBeDefined();
      expect(result.bottleneckPhase).toBeDefined();
      expect(result.trends.aoToOfferTrend).toBeDefined();
      expect(result.trends.offerToProjectTrend).toBeDefined();

      // Le calcul global ne devrait pas exploser les appels storage
      expect(mockStorage.getAos).toHaveBeenCalled();
      expect(mockStorage.getOffers).toHaveBeenCalled();
      expect(mockStorage.getProjects).toHaveBeenCalled();
    });
  });

  describe('Validation Flag disableTrend', () => {
    
    test('disableTrend=true devrait désactiver le calcul de tendance', async () => {
      // Test avec disableTrend explicite
      const result = await analyticsService.conversionCalculatorAPI
        .calculateAOToOfferConversion(testPeriod, undefined, true) as ConversionMetric;

      // Avec disableTrend=true, trend devrait être 0 (pas calculé)
      expect(result.trend).toBe(0);
      
      // Vérifier qu'il n'y a eu qu'UN SEUL appel pour les données (pas d'appel récursif pour période précédente)
      expect(mockStorage.getAos).toHaveBeenCalledTimes(1);
      expect(mockStorage.getOffers).toHaveBeenCalledTimes(1);
    });

    test('disableTrend=false devrait calculer la tendance sans récursion', async () => {
      // Test avec disableTrend explicitement false
      const result = await analyticsService.conversionCalculatorAPI
        .calculateAOToOfferConversion(testPeriod, undefined, false) as ConversionMetric;

      // Avec disableTrend=false, trend devrait être calculé
      expect(typeof result.trend).toBe('number');
      
      // Vérifier qu'il y a eu DEUX appels pour les données (période courante + précédente)
      expect(mockStorage.getAos).toHaveBeenCalledTimes(2);
      expect(mockStorage.getOffers).toHaveBeenCalledTimes(2);
    });
  });

  describe('Performance et Stabilité', () => {
    
    test('calculs multiples consécutifs ne devraient pas causer de problèmes mémoire', async () => {
      // Test de stabilité : plusieurs calculs consécutifs
      const promises = Array.from({ length: 3 }, (_, i) => {
        const period = {
          from: new Date(`2024-0${i + 1}-01`),
          to: new Date(`2024-0${i + 1}-28`)
        };
        return analyticsService.conversionCalculatorAPI.calculateAOToOfferConversion(period);
      });

      const results = await Promise.all(promises);
      
      // Tous les calculs doivent réussir
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.rate).toBeDefined();
        expect(result.trend).toBeDefined();
      });

      // Vérifier que le nombre d'appels storage reste raisonnable
      // 3 calculs x 2 appels (courant + précédent) = 6 appels max par méthode storage
      expect(mockStorage.getAos).toHaveBeenCalledTimes(6);
      expect(mockStorage.getOffers).toHaveBeenCalledTimes(6);
    });

    test('gestion des erreurs ne devrait pas causer de récursion', async () => {
      // Setup : forcer une erreur dans storage  
      mockStorage.getAos.mockRejectedValueOnce(new Error('Storage error'));

      // Test : L'erreur ne doit pas causer de récursion infinie dans les retry
      const result = await analyticsService.conversionCalculatorAPI
        .calculateAOToOfferConversion(testPeriod) as ConversionMetric;

      // Même avec l'erreur, on devrait avoir un résultat par défaut
      expect(result).toBeDefined();
      expect(result.rate).toBe(0);
      expect(result.totalInput).toBe(0);
      expect(result.totalOutput).toBe(0);
      expect(result.trend).toBe(0);
    });
  });

  describe('Tests Intégration Cache', () => {
    
    test('cache devrait éviter les recalculs répétés', async () => {
      // Premier appel
      const result1 = await analyticsService.getRealtimeKPIs();
      
      // Deuxième appel immédiat (devrait utiliser le cache)
      const result2 = await analyticsService.getRealtimeKPIs();

      // Les résultats devraient être identiques
      expect(result1).toEqual(result2);
      expect(result1.lastUpdated).toEqual(result2.lastUpdated);
      
      // Vérifier que les méthodes storage n'ont été appelées qu'une seule fois
      // (grâce au cache)
      expect(mockStorage.getAos).toHaveBeenCalledTimes(1); 
      expect(mockStorage.getOffers).toHaveBeenCalledTimes(1);
    });

    test('clearCache devrait forcer un nouveau calcul', async () => {
      // Premier appel
      await analyticsService.getRealtimeKPIs();
      
      // Clear du cache
      analyticsService.clearCache();
      
      // Deuxième appel après clear
      await analyticsService.getRealtimeKPIs();

      // Vérifier que les méthodes storage ont été appelées deux fois
      expect(mockStorage.getAos).toHaveBeenCalledTimes(2);
      expect(mockStorage.getOffers).toHaveBeenCalledTimes(2);
    });
  });
});