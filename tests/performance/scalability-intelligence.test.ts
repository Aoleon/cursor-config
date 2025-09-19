import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { DateIntelligenceService } from '../../server/services/DateIntelligenceService';
import { DateAlertDetectionService } from '../../server/services/DateAlertDetectionService';
import { storage } from '../../server/storage-poc';
import { eventBus } from '../../server/eventBus';
import { 
  createProjectBatch, 
  createTimelineBatch,
  createMockMenuiserieProject,
  measureExecutionTime,
  createMemoryLeakDetector,
  getGroundTruthScenario
} from '../utils/menuiserie-test-helpers';
import type { Project, ProjectTimeline } from '@shared/schema';

/**
 * Tests Performance et Scalabilité - Système Intelligent
 * Validation des performances avec charges élevées
 * Objectifs: 100+ projets < 5s, 500+ timelines < 10s
 */

describe('Performance Tests - Système Intelligent', () => {
  let dateIntelligenceService: DateIntelligenceService;
  let detectionService: DateAlertDetectionService;
  let memoryDetector: ReturnType<typeof createMemoryLeakDetector>;
  
  beforeEach(async () => {
    // Initialiser les services avec optimisations
    dateIntelligenceService = new DateIntelligenceService();
    detectionService = new DateAlertDetectionService(
      storage,
      eventBus,
      dateIntelligenceService,
      {} as any
    );
    
    memoryDetector = createMemoryLeakDetector();
    
    // Mock optimisé pour les tests de performance
    vi.spyOn(storage, 'getDateIntelligenceRules').mockResolvedValue([
      {
        id: 'perf-rule-1',
        name: 'Règle Performance',
        phase: 'etude',
        baseDuration: 5,
        multiplierFactor: 1.0,
        conditions: {},
        priority: 5,
        isActive: true,
        category: 'standard',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
    
    vi.spyOn(storage, 'createProjectTimeline').mockImplementation(async (timeline) => ({
      ...timeline,
      id: `timeline-${Date.now()}-${Math.random()}`,
      createdAt: new Date(),
      updatedAt: new Date()
    }));
    
    vi.spyOn(storage, 'createDateAlert').mockImplementation(async (alert) => ({
      ...alert,
      id: `alert-${Date.now()}-${Math.random()}`,
      createdAt: new Date()
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Rapport mémoire pour tests de charge
    const memoryReport = memoryDetector.report();
    console.log('Memory usage:', {
      heapIncrease: (memoryReport.increase.heapUsed / 1024 / 1024).toFixed(2) + 'MB',
      externalIncrease: (memoryReport.increase.external / 1024 / 1024).toFixed(2) + 'MB'
    });
  });

  // ========================================
  // TESTS PERFORMANCE CALCULS TIMELINES
  // ========================================

  describe('Performance Calculs Timelines', () => {
    test('calcule timelines 100 projets en moins de 5 secondes', async () => {
      const projects = createProjectBatch(100, 'performance_test_standard');
      
      const { result, durationMs } = await measureExecutionTime(
        () => Promise.all(projects.map(p => dateIntelligenceService.calculateProjectTimeline(p))),
        'Calcul batch 100 projets'
      );
      
      // Validation performance critique
      expect(durationMs).toBeLessThan(5000); // < 5 secondes OBLIGATOIRE
      expect(result).toHaveLength(100);
      expect(result.every(r => r.phases && Object.keys(r.phases).length > 0)).toBe(true);
      expect(result.every(r => r.totalDuration > 0)).toBe(true);
      
      // Validation qualité des calculs
      const avgDuration = result.reduce((sum, r) => sum + r.totalDuration, 0) / result.length;
      expect(avgDuration).toBeGreaterThan(20); // Durée réaliste
      expect(avgDuration).toBeLessThan(200); // Pas aberrant
      
      // Validation mémoire
      expect(memoryDetector.check(100 * 1024 * 1024)).toBe(true); // < 100MB
    });

    test('performance optimisée pour projets complexes', async () => {
      const complexProjects = Array.from({ length: 25 }, () => 
        createMockMenuiserieProject({
          type: 'fenetre_bois',
          complexity: 'elevee',
          customWork: true,
          surface: 150,
          location: {
            isHistoricalBuilding: true,
            abfClassification: 'monuments_historiques'
          }
        })
      );
      
      const { result, durationMs } = await measureExecutionTime(
        () => Promise.all(complexProjects.map(p => dateIntelligenceService.calculateProjectTimeline(p))),
        'Calcul batch 25 projets complexes'
      );
      
      // Projets complexes peuvent prendre plus de temps mais doivent rester raisonnables
      expect(durationMs).toBeLessThan(3000); // < 3 secondes pour 25 complexes
      expect(result).toHaveLength(25);
      
      // Vérifier que la complexité est bien prise en compte
      const avgComplexDuration = result.reduce((sum, r) => sum + r.totalDuration, 0) / result.length;
      expect(avgComplexDuration).toBeGreaterThan(100); // Plus long que standard
    });

    test('gestion parallèle efficace avec worker pool simulation', async () => {
      const batchSize = 20;
      const batches = 5; // 5 batches de 20 = 100 projets
      
      const allProjects = createProjectBatch(batchSize * batches);
      const projectBatches = Array.from({ length: batches }, (_, i) => 
        allProjects.slice(i * batchSize, (i + 1) * batchSize)
      );
      
      const { result, durationMs } = await measureExecutionTime(
        () => Promise.all(
          projectBatches.map(batch => 
            Promise.all(batch.map(p => dateIntelligenceService.calculateProjectTimeline(p)))
          )
        ),
        'Calcul parallèle 5 batches de 20'
      );
      
      // Le traitement par batches doit être efficace
      expect(durationMs).toBeLessThan(6000); // Légère marge pour gestion batches
      expect(result.flat()).toHaveLength(100);
    });

    test('optimisation cache règles métier', async () => {
      const projects = createProjectBatch(50);
      
      // Premier passage - cache froid
      const { durationMs: coldDuration } = await measureExecutionTime(
        () => Promise.all(projects.map(p => dateIntelligenceService.calculateProjectTimeline(p))),
        'Premier passage - cache froid'
      );
      
      // Deuxième passage - cache chaud (même projets)
      const { durationMs: warmDuration } = await measureExecutionTime(
        () => Promise.all(projects.map(p => dateIntelligenceService.calculateProjectTimeline(p))),
        'Deuxième passage - cache chaud'
      );
      
      // Le cache doit améliorer les performances
      expect(warmDuration).toBeLessThan(coldDuration * 0.8); // Au moins 20% plus rapide
    });
  });

  // ========================================
  // TESTS PERFORMANCE DÉTECTION ALERTES
  // ========================================

  describe('Performance Détection Alertes', () => {
    test('détection alertes scalable avec 500+ timelines en moins de 10 secondes', async () => {
      const timelines = createTimelineBatch(500);
      const projects = createProjectBatch(100); // 5 timelines par projet
      
      vi.spyOn(storage, 'getProjects').mockResolvedValue(projects);
      vi.spyOn(storage, 'getProjectTimelines').mockResolvedValue(timelines);
      
      const { result, durationMs } = await measureExecutionTime(
        () => detectionService.runPeriodicDetection(),
        'Détection complète 500 timelines'
      );
      
      // Performance critique
      expect(durationMs).toBeLessThan(10000); // < 10 secondes OBLIGATOIRE
      expect(result.totalAlertsGenerated).toBeGreaterThanOrEqual(0);
      expect(result.detectionRunTime).toBeLessThan(10000);
      
      // Validation mémoire pour charge élevée
      expect(memoryDetector.check(200 * 1024 * 1024)).toBe(true); // < 200MB
    });

    test('détection retards optimisée pour nombreux projets', async () => {
      const projects = createProjectBatch(200);
      
      vi.spyOn(storage, 'getProjects').mockResolvedValue(projects);
      
      const { result, durationMs } = await measureExecutionTime(
        () => Promise.all(projects.map(p => detectionService.detectDelayRisks(p.id))),
        'Détection retards 200 projets'
      );
      
      expect(durationMs).toBeLessThan(8000); // < 8 secondes
      expect(result.flat().length).toBeGreaterThanOrEqual(0);
    });

    test('détection conflits ressources avec plannings denses', async () => {
      // Créer 50 projets avec overlaps intentionnels
      const projects = createProjectBatch(50);
      const timelines = projects.flatMap(p => [
        createMockTimeline({
          projectId: p.id,
          phase: 'chantier',
          startDate: new Date('2024-06-15'),
          endDate: new Date('2024-06-18')
        }),
        createMockTimeline({
          projectId: p.id,
          phase: 'chantier',
          startDate: new Date('2024-06-17'), // Overlap intentionnel
          endDate: new Date('2024-06-20')
        })
      ]);
      
      const { result, durationMs } = await measureExecutionTime(
        () => detectionService.detectPlanningConflicts({
          startDate: new Date('2024-06-01'),
          endDate: new Date('2024-06-30')
        }),
        'Détection conflits planning dense'
      );
      
      expect(durationMs).toBeLessThan(3000); // < 3 secondes
      expect(result.length).toBeGreaterThan(0); // Doit détecter des conflits
    });

    test('optimisation avec early exit sur alertes critiques', async () => {
      const projects = createProjectBatch(100);
      
      // Injecter un projet avec alerte critique immédiate
      const criticalProject = createMockMenuiserieProject({
        type: 'fenetre_pvc'
      });
      criticalProject.deadline = new Date(Date.now() + 24 * 60 * 60 * 1000); // Deadline demain
      projects[0] = criticalProject;
      
      vi.spyOn(storage, 'getProjects').mockResolvedValue(projects);
      
      const { result, durationMs } = await measureExecutionTime(
        () => detectionService.runPeriodicDetection(),
        'Détection avec early exit critique'
      );
      
      // Doit être plus rapide grâce à early exit sur critiques
      expect(durationMs).toBeLessThan(5000); // < 5 secondes
      expect(result.criticalIssues).toBeGreaterThan(0);
    });
  });

  // ========================================
  // TESTS PERFORMANCE INTÉGRATION
  // ========================================

  describe('Performance Intégration Complète', () => {
    test('workflow complet calcul + détection + optimisation sur 50 projets', async () => {
      const projects = createProjectBatch(50);
      
      vi.spyOn(storage, 'getProjects').mockResolvedValue(projects);
      
      const { result, durationMs } = await measureExecutionTime(
        async () => {
          // 1. Calculer timelines
          const timelines = await Promise.all(
            projects.map(p => dateIntelligenceService.calculateProjectTimeline(p))
          );
          
          // 2. Détecter alertes
          const alerts = await detectionService.runPeriodicDetection();
          
          // 3. Générer optimisations
          const optimizations = await Promise.all(
            projects.slice(0, 10).map(p => // Seulement 10 pour optimisation
              detectionService.generateOptimizationSuggestions(p.id, [])
            )
          );
          
          return { timelines, alerts, optimizations };
        },
        'Workflow complet 50 projets'
      );
      
      expect(durationMs).toBeLessThan(12000); // < 12 secondes pour workflow complet
      expect(result.timelines).toHaveLength(50);
      expect(result.alerts).toBeDefined();
      expect(result.optimizations).toHaveLength(10);
    });

    test('performance événements EventBus avec haute fréquence', async () => {
      const eventCount = 1000;
      
      const { durationMs } = await measureExecutionTime(
        async () => {
          const promises = Array.from({ length: eventCount }, async (_, i) => {
            await eventBus.publishDateAlertCreated({
              entity: 'date_intelligence',
              entityId: `project-${i}`,
              title: `Test Event ${i}`,
              message: `Test message ${i}`,
              severity: 'info',
              metadata: {
                alertType: 'test',
                actionRequired: false
              }
            });
          });
          
          await Promise.all(promises);
        },
        `Publication ${eventCount} événements EventBus`
      );
      
      expect(durationMs).toBeLessThan(2000); // < 2 secondes pour 1000 événements
    });

    test('stabilité mémoire sur traitement prolongé', async () => {
      const iterations = 10;
      const projectsPerIteration = 20;
      
      for (let i = 0; i < iterations; i++) {
        const projects = createProjectBatch(projectsPerIteration);
        
        await Promise.all(
          projects.map(p => dateIntelligenceService.calculateProjectTimeline(p))
        );
        
        // Vérifier que la mémoire ne fuit pas
        if (i % 3 === 0) { // Vérification tous les 3 iterations
          expect(memoryDetector.check(150 * 1024 * 1024)).toBe(true); // < 150MB
        }
      }
    });
  });

  // ========================================
  // TESTS CHARGE EXTREME
  // ========================================

  describe('Tests Charge Extrême', () => {
    test('résistance à montée en charge progressive', async () => {
      const loadSteps = [10, 25, 50, 100, 150];
      const results: Array<{ count: number; duration: number }> = [];
      
      for (const count of loadSteps) {
        const projects = createProjectBatch(count);
        
        const { durationMs } = await measureExecutionTime(
          () => Promise.all(projects.map(p => dateIntelligenceService.calculateProjectTimeline(p))),
          `Charge ${count} projets`
        );
        
        results.push({ count, duration: durationMs });
        
        // Vérifier que la dégradation reste linéaire
        if (results.length > 1) {
          const previous = results[results.length - 2];
          const current = results[results.length - 1];
          const growthRatio = current.duration / previous.duration;
          const countRatio = current.count / previous.count;
          
          // La croissance du temps ne doit pas être exponentielle
          expect(growthRatio).toBeLessThan(countRatio * 1.5);
        }
      }
      
      // Le dernier test (150 projets) doit rester dans les limites
      expect(results[results.length - 1].duration).toBeLessThan(8000);
    });

    test('récupération après pic de charge', async () => {
      // Pic de charge élevée
      const heavyProjects = createProjectBatch(200);
      
      await measureExecutionTime(
        () => Promise.all(heavyProjects.map(p => dateIntelligenceService.calculateProjectTimeline(p))),
        'Pic de charge 200 projets'
      );
      
      // Vérifier récupération avec charge normale
      const normalProjects = createProjectBatch(10);
      
      const { durationMs: recoveryTime } = await measureExecutionTime(
        () => Promise.all(normalProjects.map(p => dateIntelligenceService.calculateProjectTimeline(p))),
        'Récupération charge normale'
      );
      
      // Le système doit récupérer ses performances normales
      expect(recoveryTime).toBeLessThan(500); // < 500ms pour 10 projets après pic
    });

    test('limitation automatique sur surcharge', async () => {
      // Simuler surcharge système
      const overloadProjects = createProjectBatch(300);
      
      const { durationMs } = await measureExecutionTime(
        () => Promise.all(overloadProjects.map(p => dateIntelligenceService.calculateProjectTimeline(p))),
        'Test surcharge 300 projets'
      );
      
      // Le système doit avoir des mécanismes de limitation
      expect(durationMs).toBeLessThan(15000); // < 15 secondes même en surcharge
    });
  });

  // ========================================
  // HELPERS POUR TESTS PERFORMANCE
  // ========================================

  function createMockTimeline(options: any = {}) {
    return {
      id: `timeline-${Math.random().toString(36).substr(2, 9)}`,
      projectId: options.projectId || 'project-1',
      phase: options.phase || 'etude',
      startDate: options.startDate || new Date(),
      endDate: options.endDate || new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      durationDays: options.durationDays || 5,
      estimatedDuration: options.durationDays || 5,
      status: options.status || 'planned',
      appliedRules: options.appliedRules || [],
      constraints: options.constraints || [],
      riskFactors: [],
      optimizationOpportunities: [],
      createdAt: new Date(),
      updatedAt: new Date()
    } as ProjectTimeline;
  }
});