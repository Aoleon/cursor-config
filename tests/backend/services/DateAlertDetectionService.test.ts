import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { DateAlertDetectionService } from '../../../server/services/DateAlertDetectionService';
import { DateIntelligenceService } from '../../../server/services/DateIntelligenceService';
import { EventBus } from '../../../server/eventBus';
import { storage } from '../../../server/storage-poc';
import { 
  createMockMenuiserieProject, 
  createMockProjectTimeline, 
  createMockDateAlert,
  getGroundTruthScenario,
  measureExecutionTime,
  createMemoryLeakDetector
} from '../../utils/menuiserie-test-helpers';
import type { Project, ProjectStatus, DateAlert } from '@shared/schema';

/**
 * Tests Backend Exhaustifs - DateAlertDetectionService
 * Validation du système de détection proactive d'alertes
 * Spécialisé menuiserie française - Phase 2.5
 */

describe('DateAlertDetectionService - Détection Proactive', () => {
  let detectionService: DateAlertDetectionService;
  let dateIntelligenceService: DateIntelligenceService;
  let eventBus: EventBus;
  let memoryDetector: ReturnType<typeof createMemoryLeakDetector>;
  
  beforeEach(async () => {
    // Initialiser les services
    eventBus = new EventBus();
    dateIntelligenceService = new DateIntelligenceService();
    detectionService = new DateAlertDetectionService(
      storage,
      eventBus,
      dateIntelligenceService,
      {} as any // menuiserieRules mock
    );
    
    memoryDetector = createMemoryLeakDetector();
    
    // Mock des méthodes de storage
    vi.spyOn(storage, 'getProjects').mockResolvedValue([]);
    vi.spyOn(storage, 'getProjectTimelines').mockResolvedValue([]);
    vi.spyOn(storage, 'getDateAlerts').mockResolvedValue([]);
    vi.spyOn(storage, 'createDateAlert').mockImplementation(async (alert) => ({
      ...alert,
      id: `alert-${Date.now()}`,
      createdAt: new Date()
    }));
    
    // Mock EventBus
    vi.spyOn(eventBus, 'publishDateAlertCreated').mockResolvedValue(void 0);
    vi.spyOn(eventBus, 'publishDelayRiskDetected').mockResolvedValue(void 0);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Vérifier les fuites mémoire sur tests longs
    memoryDetector.check();
  });

  // ========================================
  // TESTS DÉTECTION RETARDS
  // ========================================

  describe('Détection Risques de Retard', () => {
    test('détecte risques de retard projet menuiserie avec progression lente', async () => {
      const delayedProject = createMockMenuiserieProject({
        type: 'fenetre_pvc',
        complexity: 'normale'
      });
      delayedProject.status = 'chantier';
      
      const currentTimeline = createMockProjectTimeline({
        projectId: delayedProject.id,
        phase: 'chantier',
        durationDays: 5,
        status: 'in_progress',
        startDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // Commencé il y a 3 jours
      });
      
      vi.spyOn(storage, 'getProjects').mockResolvedValue([delayedProject]);
      vi.spyOn(storage, 'getProjectTimelines').mockResolvedValue([currentTimeline]);
      
      // Mock progress à 30% après 3 jours sur 5 = retard probable
      vi.spyOn(detectionService as any, 'calculateProjectProgress').mockResolvedValue(0.30);
      
      const alerts = await detectionService.detectDelayRisks(delayedProject.id);
      
      expect(alerts).toHaveLength(1);
      expect(alerts[0].alertType).toBe('delay_risk');
      expect(alerts[0].severity).toBe('warning');
      expect(alerts[0].phase).toBe('chantier');
      expect(alerts[0].suggestedActions).toContain('Réaffecter équipe');
    });

    test('détecte contraintes météo pour travaux extérieurs hiver', async () => {
      const winterProject = createMockMenuiserieProject({
        type: 'porte_alu',
        season: 'winter',
        isExterior: true,
        location: {
          weatherZone: 'montagne'
        }
      });
      winterProject.status = 'chantier';
      
      const chantierTimeline = createMockProjectTimeline({
        projectId: winterProject.id,
        phase: 'chantier',
        startDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) // Dans 2 jours
      });
      
      vi.spyOn(storage, 'getProjects').mockResolvedValue([winterProject]);
      vi.spyOn(storage, 'getProjectTimelines').mockResolvedValue([chantierTimeline]);
      
      // Mock prévisions météo défavorables
      vi.spyOn(detectionService as any, 'getWeatherForecast').mockResolvedValue({
        rainDays: 4,
        temperatureRisk: true,
        windRisk: true,
        confidence: 0.85
      });
      
      const alerts = await detectionService.detectWeatherConstraints(winterProject.id);
      
      expect(alerts).toHaveLength(1);
      expect(alerts[0].alertType).toBe('external_constraint');
      expect(alerts[0].severity).toBe('warning');
      expect(alerts[0].message).toContain('météo');
      expect(alerts[0].suggestedActions).toContain('Reporter travaux extérieurs');
    });

    test('évalue correctement facteurs de risque multiples', async () => {
      const complexProject = createMockMenuiserieProject({
        type: 'fenetre_bois',
        complexity: 'elevee',
        customWork: true,
        surface: 120,
        location: {
          accessibility: 'difficile',
          isHistoricalBuilding: true
        }
      });
      
      const riskFactors = await detectionService.evaluateProjectRiskFactors(complexProject);
      
      expect(riskFactors).toHaveLength(4);
      expect(riskFactors.map(f => f.name)).toContain('complexity_high');
      expect(riskFactors.map(f => f.name)).toContain('custom_work');
      expect(riskFactors.map(f => f.name)).toContain('difficult_access');
      expect(riskFactors.map(f => f.name)).toContain('heritage_constraints');
      
      // Vérifier poids des facteurs
      const totalWeight = riskFactors.reduce((sum, f) => sum + f.weight, 0);
      expect(totalWeight).toBeGreaterThan(1.0); // Cumul significatif
    });
  });

  // ========================================
  // TESTS DÉTECTION CONFLITS RESSOURCES
  // ========================================

  describe('Détection Conflits Planning', () => {
    test('détecte conflits équipes menuiserie overlapping', async () => {
      const project1 = createMockMenuiserieProject({ type: 'fenetre_pvc' });
      const project2 = createMockMenuiserieProject({ type: 'porte_alu' });
      
      const timeline1 = createMockProjectTimeline({
        projectId: project1.id,
        phase: 'chantier',
        startDate: new Date('2024-06-15'),
        endDate: new Date('2024-06-18')
      });
      
      const timeline2 = createMockProjectTimeline({
        projectId: project2.id,
        phase: 'chantier',
        startDate: new Date('2024-06-17'), // Overlap de 1 jour
        endDate: new Date('2024-06-20')
      });
      
      // Mock même équipe requise
      vi.spyOn(detectionService as any, 'getRequiredTeams').mockImplementation((timeline) => {
        return ['equipe_pose_1'];
      });
      
      const conflicts = await detectionService.detectPlanningConflicts({
        startDate: new Date('2024-06-15'),
        endDate: new Date('2024-06-20')
      });
      
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].type).toBe('resource_conflict');
      expect(conflicts[0].affectedProjects).toHaveLength(2);
      expect(conflicts[0].conflictDate).toEqual(new Date('2024-06-17'));
      expect(conflicts[0].severity).toBe('major');
    });

    test('propose stratégies résolution conflits', async () => {
      const conflict = {
        type: 'resource_conflict' as const,
        affectedProjects: ['project-1', 'project-2'],
        conflictDate: new Date('2024-06-17'),
        severity: 'major' as const,
        resourceType: 'equipe_pose'
      };
      
      const resolutions = await detectionService.generateConflictResolutions(conflict);
      
      expect(resolutions).toHaveLength(3);
      
      const scheduleShift = resolutions.find(r => r.strategy === 'schedule_shift');
      expect(scheduleShift).toBeDefined();
      expect(scheduleShift?.effort).toBe('low');
      expect(scheduleShift?.effectiveness).toBeGreaterThan(0.8);
      
      const teamReallocation = resolutions.find(r => r.strategy === 'team_reallocation');
      expect(teamReallocation).toBeDefined();
      expect(teamReallocation?.effort).toBe('medium');
    });

    test('détecte violations dépendances entre phases', async () => {
      const project = createMockMenuiserieProject();
      
      const etudeTimeline = createMockProjectTimeline({
        projectId: project.id,
        phase: 'etude',
        startDate: new Date('2024-06-10'),
        endDate: new Date('2024-06-15')
      });
      
      const approTimeline = createMockProjectTimeline({
        projectId: project.id,
        phase: 'approvisionnement',
        startDate: new Date('2024-06-12'), // Commence avant fin étude
        endDate: new Date('2024-06-25')
      });
      
      vi.spyOn(storage, 'getProjectTimelines').mockResolvedValue([etudeTimeline, approTimeline]);
      
      const violations = await detectionService.detectDependencyViolations(project.id);
      
      expect(violations).toHaveLength(1);
      expect(violations[0].type).toBe('dependency_violation');
      expect(violations[0].message).toContain('Approvisionnement commence avant fin étude');
    });
  });

  // ========================================
  // TESTS DÉTECTION ÉCHÉANCES CRITIQUES
  // ========================================

  describe('Détection Échéances Critiques', () => {
    test('identifie échéances ABF pour bâtiments historiques', async () => {
      const historicalProject = createMockMenuiserieProject({
        location: {
          isHistoricalBuilding: true,
          abfClassification: 'monuments_historiques'
        }
      });
      
      const visaTimeline = createMockProjectTimeline({
        projectId: historicalProject.id,
        phase: 'visa_architecte',
        endDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000) // Dans 15 jours
      });
      
      vi.spyOn(storage, 'getProjects').mockResolvedValue([historicalProject]);
      vi.spyOn(storage, 'getProjectTimelines').mockResolvedValue([visaTimeline]);
      
      const criticalDeadlines = await detectionService.detectCriticalDeadlines();
      
      expect(criticalDeadlines).toHaveLength(1);
      expect(criticalDeadlines[0].type).toBe('deadline_critical');
      expect(criticalDeadlines[0].entityType).toBe('project');
      expect(criticalDeadlines[0].daysRemaining).toBe(15);
      expect(criticalDeadlines[0].requiredActions).toContain('Préparer dossier ABF');
    });

    test('calcule buffer temps approprié par type échéance', async () => {
      const deadlines = [
        { authority: 'ABF', type: 'visa', typicalDuration: 45 },
        { authority: 'Mairie', type: 'permis', typicalDuration: 30 },
        { authority: 'Fournisseur', type: 'livraison', typicalDuration: 14 }
      ];
      
      for (const deadline of deadlines) {
        const buffer = detectionService.calculateDeadlineBuffer(deadline.type, deadline.typicalDuration);
        
        if (deadline.authority === 'ABF') {
          expect(buffer).toBeGreaterThan(10); // Buffer important pour ABF
        } else if (deadline.authority === 'Mairie') {
          expect(buffer).toBeGreaterThan(5);
        } else {
          expect(buffer).toBeGreaterThan(2);
        }
      }
    });

    test('priorise alertes selon impact business', async () => {
      const alerts = [
        createMockDateAlert({ 
          alertType: 'deadline_critical', 
          severity: 'critical',
          targetDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
        }),
        createMockDateAlert({ 
          alertType: 'delay_risk', 
          severity: 'warning',
          phase: 'chantier'
        }),
        createMockDateAlert({ 
          alertType: 'optimization', 
          severity: 'info'
        })
      ];
      
      const prioritized = detectionService.prioritizeAlerts(alerts);
      
      expect(prioritized[0].severity).toBe('critical');
      expect(prioritized[0].alertType).toBe('deadline_critical');
      expect(prioritized[2].alertType).toBe('optimization');
    });
  });

  // ========================================
  // TESTS INTÉGRATION EVENTBUS
  // ========================================

  describe('Intégration EventBus', () => {
    test('émet événements alertes via EventBus correctement', async () => {
      const project = createMockMenuiserieProject();
      const alert = createMockDateAlert({
        projectId: project.id,
        alertType: 'delay_risk',
        severity: 'warning'
      });
      
      await detectionService.publishAlert(alert);
      
      expect(eventBus.publishDateAlertCreated).toHaveBeenCalledWith({
        entity: 'date_intelligence',
        entityId: project.id,
        title: alert.title,
        message: alert.message,
        severity: 'warning',
        metadata: {
          alertType: 'delay_risk',
          phase: alert.phase,
          targetDate: alert.targetDate?.toISOString(),
          affectedUsers: [],
          actionRequired: true,
          alert: alert
        }
      });
    });

    test('groupe alertes similaires pour éviter spam', async () => {
      const alerts = [
        createMockDateAlert({ alertType: 'delay_risk', projectId: 'project-1' }),
        createMockDateAlert({ alertType: 'delay_risk', projectId: 'project-1' }),
        createMockDateAlert({ alertType: 'delay_risk', projectId: 'project-2' })
      ];
      
      const grouped = await detectionService.groupSimilarAlerts(alerts);
      
      expect(grouped).toHaveLength(2); // 2 groupes : project-1 et project-2
      expect(grouped.find(g => g.projectId === 'project-1')?.count).toBe(2);
      expect(grouped.find(g => g.projectId === 'project-2')?.count).toBe(1);
    });

    test('respecte throttling pour alertes fréquentes', async () => {
      const project = createMockMenuiserieProject();
      
      // Simuler 5 alertes rapides
      for (let i = 0; i < 5; i++) {
        await detectionService.detectDelayRisks(project.id);
      }
      
      // Vérifier que EventBus n'a été appelé qu'une fois (throttling)
      expect(eventBus.publishDateAlertCreated).toHaveBeenCalledTimes(1);
    });
  });

  // ========================================
  // TESTS DÉTECTION PÉRIODIQUE
  // ========================================

  describe('Détection Périodique', () => {
    test('exécute cycle complet détection sans erreur', async () => {
      const projects = [
        createMockMenuiserieProject({ type: 'fenetre_pvc' }),
        createMockMenuiserieProject({ type: 'porte_alu' }),
        createMockMenuiserieProject({ type: 'fenetre_bois' })
      ];
      
      vi.spyOn(storage, 'getProjects').mockResolvedValue(projects);
      
      const { result, durationMs } = await measureExecutionTime(
        () => detectionService.runPeriodicDetection(),
        'Détection périodique complète'
      );
      
      expect(result.totalAlertsGenerated).toBeGreaterThanOrEqual(0);
      expect(result.alertsByType).toBeDefined();
      expect(result.detectionRunTime).toBeLessThan(30000); // < 30s max
      expect(durationMs).toBeLessThan(15000); // < 15s réel
    });

    test('gère échec partiel détection sans bloquer', async () => {
      const projects = [
        createMockMenuiserieProject(),
        createMockMenuiserieProject()
      ];
      
      vi.spyOn(storage, 'getProjects').mockResolvedValue(projects);
      
      // Mock d'une erreur pour un projet
      vi.spyOn(detectionService, 'detectDelayRisks')
        .mockImplementationOnce(() => { throw new Error('Test error'); })
        .mockResolvedValueOnce([]);
      
      const summary = await detectionService.runPeriodicDetection();
      
      // Doit continuer malgré l'erreur
      expect(summary.totalAlertsGenerated).toBeGreaterThanOrEqual(0);
      expect(summary.recommendations).toContain('Erreurs détectées');
    });

    test('optimise performance avec batch processing', async () => {
      const manyProjects = Array.from({ length: 50 }, () => createMockMenuiserieProject());
      
      vi.spyOn(storage, 'getProjects').mockResolvedValue(manyProjects);
      
      const { durationMs } = await measureExecutionTime(
        () => detectionService.runPeriodicDetection(),
        'Détection batch 50 projets'
      );
      
      // Doit traiter 50 projets en moins de 10 secondes
      expect(durationMs).toBeLessThan(10000);
      
      // Vérifier pas de fuite mémoire
      expect(memoryDetector.check()).toBe(true);
    });
  });

  // ========================================
  // TESTS SUGGESTIONS OPTIMISATION
  // ========================================

  describe('Suggestions Optimisation', () => {
    test('génère suggestions optimisation timeline', async () => {
      const project = createMockMenuiserieProject({
        type: 'fenetre_pvc',
        complexity: 'normale'
      });
      
      const timelines = [
        createMockProjectTimeline({
          projectId: project.id,
          phase: 'etude',
          durationDays: 8 // Plus long que standard (5)
        }),
        createMockProjectTimeline({
          projectId: project.id,
          phase: 'approvisionnement',
          durationDays: 14
        })
      ];
      
      const suggestions = await detectionService.generateOptimizationSuggestions(project.id, timelines);
      
      expect(suggestions).toHaveLength(2); // Au moins 2 optimisations
      
      const parallelOptim = suggestions.find(s => s.type === 'parallel_phases');
      expect(parallelOptim).toBeDefined();
      expect(parallelOptim?.estimatedGainDays).toBeGreaterThan(0);
      
      const earlyStartOptim = suggestions.find(s => s.type === 'early_start');
      expect(earlyStartOptim).toBeDefined();
    });

    test('évalue faisabilité optimisations proposées', async () => {
      const optimization = {
        type: 'parallel_phases' as const,
        description: 'Commencer approvisionnement pendant étude',
        estimatedGainDays: 3,
        requirements: ['Specifications partielles acceptées'],
        risks: ['Risque de modifications']
      };
      
      const feasibility = await detectionService.evaluateOptimizationFeasibility(optimization);
      
      expect(feasibility.feasibility).toMatch(/high|medium|low/);
      expect(feasibility.riskAssessment).toBeDefined();
      expect(feasibility.prerequisites).toHaveLength(1);
    });
  });

  // ========================================
  // TESTS EDGE CASES ET ROBUSTESSE
  // ========================================

  describe('Edge Cases et Robustesse', () => {
    test('gère projets sans timelines définies', async () => {
      const projectWithoutTimelines = createMockMenuiserieProject();
      
      vi.spyOn(storage, 'getProjectTimelines').mockResolvedValue([]);
      
      const alerts = await detectionService.detectDelayRisks(projectWithoutTimelines.id);
      
      // Ne doit pas échouer, mais retourner alerte appropriée
      expect(alerts).toHaveLength(1);
      expect(alerts[0].alertType).toBe('configuration_missing');
      expect(alerts[0].message).toContain('timelines manquantes');
    });

    test('limite récursion détection cascades', async () => {
      const project = createMockMenuiserieProject();
      
      // Créer situation de cascade infinie potentielle
      vi.spyOn(detectionService as any, 'evaluateCascadeImpact')
        .mockImplementation(async () => ({ hasMoreCascades: true, depth: 10 }));
      
      const result = await detectionService.detectCascadeEffects(project.id, {
        phase: 'etude' as ProjectStatus,
        delayDays: 1
      });
      
      // Doit s'arrêter avant récursion infinie
      expect(result.cascadeDepth).toBeLessThan(5);
      expect(result.limitReached).toBe(true);
    });

    test('récupère erreurs API externes gracieusement', async () => {
      // Mock erreur API météo
      vi.spyOn(detectionService as any, 'getWeatherForecast')
        .mockRejectedValue(new Error('Weather API unavailable'));
      
      const project = createMockMenuiserieProject({
        season: 'winter',
        isExterior: true
      });
      
      const alerts = await detectionService.detectWeatherConstraints(project.id);
      
      // Doit générer alerte avec confiance réduite
      expect(alerts).toHaveLength(1);
      expect(alerts[0].message).toContain('données météo indisponibles');
      expect(alerts[0].severity).toBe('info');
    });
  });
});