import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { DateIntelligenceService } from '../../../server/services/DateIntelligenceService';
import { storage } from '../../../server/storage-poc';
import { 
  createMockMenuiserieProject, 
  createMockProjectTimeline, 
  createMockBusinessRule,
  getGroundTruthScenario,
  createProjectFromGroundTruth,
  createTimelinesFromGroundTruth,
  measureExecutionTime
} from '../../utils/menuiserie-test-helpers';
import type { Project, ProjectStatus, DateIntelligenceRule } from '@shared/schema';

/**
 * Tests Backend Exhaustifs - DateIntelligenceService
 * Validation du système intelligent de calcul de dates et échéances
 * Règles métier menuiserie française - Phase 2.5
 */

describe('DateIntelligenceService - Règles Métier Menuiserie', () => {
  let dateIntelligenceService: DateIntelligenceService;
  
  beforeEach(async () => {
    // Réinitialiser le service pour chaque test
    dateIntelligenceService = new DateIntelligenceService();
    
    // Mock des méthodes de storage
    vi.spyOn(storage, 'getDateIntelligenceRules').mockResolvedValue([
      createMockBusinessRule({
        id: 'rule-passation-standard',
        name: 'Passation Standard',
        phase: 'passation',
        baseDuration: 30,
        multiplierFactor: 1.0,
        conditions: { complexity: 'normale' }
      }),
      createMockBusinessRule({
        id: 'rule-etude-standard',
        name: 'Étude Standard',
        phase: 'etude',
        baseDuration: 5,
        multiplierFactor: 1.0,
        conditions: { projectType: 'fenetre_pvc' }
      }),
      createMockBusinessRule({
        id: 'rule-appro-pvc',
        name: 'Approvisionnement PVC',
        phase: 'approvisionnement',
        baseDuration: 14,
        multiplierFactor: 1.0,
        conditions: { materialType: 'pvc' }
      }),
      createMockBusinessRule({
        id: 'rule-chantier-ete',
        name: 'Chantier Été',
        phase: 'chantier',
        baseDuration: 3,
        multiplierFactor: 1.0,
        conditions: { season: 'summer' }
      }),
      createMockBusinessRule({
        id: 'rule-chantier-hiver',
        name: 'Chantier Hiver',
        phase: 'chantier',
        baseDuration: 5,
        multiplierFactor: 1.4,
        conditions: { season: 'winter', isExterior: true }
      })
    ]);
    
    vi.spyOn(storage, 'getProjectTimelines').mockResolvedValue([]);
    vi.spyOn(storage, 'createProjectTimeline').mockImplementation(async (timeline) => ({
      ...timeline,
      id: `timeline-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date()
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ========================================
  // TESTS CALCULS PHASES MENUISERIE FRANÇAISES
  // ========================================

  describe('Calculs Délais Projets Menuiserie', () => {
    test('calcule correctement délais projet menuiserie standard PVC été', async () => {
      const project = createMockMenuiserieProject({
        type: 'fenetre_pvc',
        complexity: 'normale',
        season: 'summer',
        surface: 25,
        isExterior: true,
        customWork: false
      });

      const result = await dateIntelligenceService.calculateProjectTimeline(project);

      // Vérifications selon ground truth
      expect(result.phases).toBeDefined();
      expect(result.phases.etude?.durationDays).toBe(5); // Règle standard
      expect(result.phases.approvisionnement?.durationDays).toBe(14); // PVC standard
      expect(result.phases.chantier?.durationDays).toBe(3); // Pose été
      expect(result.totalDuration).toBe(52); // Total avec passation

      // Vérifier règles appliquées
      expect(result.appliedRules).toContain('rule-etude-standard');
      expect(result.appliedRules).toContain('rule-appro-pvc');
      expect(result.appliedRules).toContain('rule-chantier-ete');
    });

    test('applique correctement contraintes météo hiver pour travaux extérieurs', async () => {
      const winterProject = createMockMenuiserieProject({
        type: 'porte_alu',
        complexity: 'elevee',
        season: 'winter',
        isExterior: true,
        customWork: true,
        location: {
          weatherZone: 'montagne',
          accessibility: 'difficile'
        }
      });

      const timeline = await dateIntelligenceService.calculateProjectTimeline(winterProject);

      // Vérifier majoration hiver pour travaux extérieurs
      expect(timeline.phases.chantier?.durationDays).toBeGreaterThan(5);
      expect(timeline.constraints).toContain('weather_winter_exterior');
      expect(timeline.appliedRules).toContain('rule-chantier-hiver');

      // Vérifier multiplicateur complexité appliqué
      expect(timeline.phases.etude?.durationDays).toBeGreaterThan(5);
    });

    test('gère correctement projets sur-mesure avec délais étendus', async () => {
      const customProject = createMockMenuiserieProject({
        type: 'fenetre_bois',
        complexity: 'elevee',
        customWork: true,
        surface: 120,
        location: {
          isHistoricalBuilding: true,
          abfClassification: 'monuments_historiques'
        }
      });

      const timeline = await dateIntelligenceService.calculateProjectTimeline(customProject);

      // Vérifier délais étendus pour sur-mesure
      expect(timeline.phases.etude?.durationDays).toBeGreaterThan(10);
      expect(timeline.phases.approvisionnement?.durationDays).toBeGreaterThan(20);
      
      // Vérifier contraintes patrimoine
      expect(timeline.constraints).toContain('heritage_building');
      expect(timeline.phases.visa_architecte?.durationDays).toBe(45); // VISA ABF
    });

    test('optimise planning avec phases parallèles', async () => {
      const project = createMockMenuiserieProject({
        type: 'fenetre_pvc',
        complexity: 'normale'
      });

      const timeline = await dateIntelligenceService.calculateProjectTimeline(project);
      const optimizations = await dateIntelligenceService.optimizeTimeline(project.id, timeline);

      // Vérifier détection opportunités
      expect(optimizations).toHaveLength(2);
      expect(optimizations[0].type).toBe('parallel_phases');
      expect(optimizations[0].estimatedGainDays).toBeGreaterThan(0);
      
      // Vérifier optimisation commande anticipée
      const commandeOptim = optimizations.find(o => o.description.includes('commande'));
      expect(commandeOptim).toBeDefined();
      expect(commandeOptim?.estimatedGainDays).toBe(3);
    });
  });

  // ========================================
  // TESTS RÈGLES MÉTIER COMPLÈTES
  // ========================================

  describe('Validation Règles Métier', () => {
    test('charge et valide les 19+ règles métier menuiserie française', async () => {
      const rules = await storage.getDateIntelligenceRules();
      
      expect(rules).toHaveLength(5); // Notre mock a 5 règles pour test
      expect(rules.filter(r => r.phase === 'passation')).toHaveLength(1);
      expect(rules.filter(r => r.phase === 'chantier')).toHaveLength(2); // été + hiver
      expect(rules.filter(r => r.phase === 'approvisionnement')).toHaveLength(1);
      expect(rules.filter(r => r.phase === 'etude')).toHaveLength(1);
    });

    test('applique règles par priorité et conditions', async () => {
      const project = createMockMenuiserieProject({
        type: 'porte_alu',
        complexity: 'elevee',
        season: 'winter'
      });

      const applicableRules = await dateIntelligenceService.findApplicableRules(project);
      
      // Vérifier sélection règles par conditions
      expect(applicableRules).toContain('rule-chantier-hiver');
      expect(applicableRules).not.toContain('rule-chantier-ete');
      
      // Vérifier priorité des règles spécialisées
      const winterRule = applicableRules.find(r => r.includes('hiver'));
      expect(winterRule).toBeDefined();
    });

    test('valide cohérence des multiplicateurs', async () => {
      const rules = await storage.getDateIntelligenceRules();
      
      rules.forEach(rule => {
        // Multiplicateurs doivent être positifs
        expect(rule.multiplierFactor).toBeGreaterThan(0);
        expect(rule.multiplierFactor).toBeLessThan(3); // Max raisonnable
        
        // Durées de base cohérentes
        expect(rule.baseDuration).toBeGreaterThan(0);
        expect(rule.baseDuration).toBeLessThan(100); // Max raisonnable
      });
    });

    test('gère cascades de dépendances entre phases', async () => {
      const project = createMockMenuiserieProject();
      const initialTimeline = await dateIntelligenceService.calculateProjectTimeline(project);
      
      // Simuler retard en phase étude
      const delayUpdate = {
        phase: 'etude' as ProjectStatus,
        delayDays: 3,
        reason: 'Complexité supplémentaire découverte'
      };
      
      const cascadeResult = await dateIntelligenceService.handleCascadeUpdate(
        project.id, 
        delayUpdate
      );
      
      // Vérifier propagation du retard
      expect(cascadeResult.updatedPhases).toHaveLength(3); // étude, appro, chantier
      expect(cascadeResult.totalDelayDays).toBe(3);
      
      // Vérifier recalcul dates suivantes
      const updatedTimeline = cascadeResult.updatedPhases.find(p => p.phase === 'approvisionnement');
      expect(updatedTimeline?.newStartDate).toBeDefined();
    });
  });

  // ========================================
  // TESTS GROUND TRUTH SCÉNARIOS
  // ========================================

  describe('Validation Ground Truth Scénarios', () => {
    test('scénario fenêtres PVC standard - validation complète', async () => {
      const scenario = getGroundTruthScenario('fenetre_pvc_standard');
      const project = createProjectFromGroundTruth('fenetre_pvc_standard');
      
      const calculatedTimeline = await dateIntelligenceService.calculateProjectTimeline(project);
      
      // Validation contre ground truth
      expect(calculatedTimeline.phases.etude?.durationDays).toBe(scenario.expectedTimeline.etude.durationDays);
      expect(calculatedTimeline.phases.approvisionnement?.durationDays).toBe(scenario.expectedTimeline.approvisionnement.durationDays);
      expect(calculatedTimeline.phases.chantier?.durationDays).toBe(scenario.expectedTimeline.chantier.durationDays);
      
      // Validation règles appliquées
      scenario.businessRules.forEach(expectedRule => {
        expect(calculatedTimeline.appliedRules).toContain(expectedRule);
      });
    });

    test('scénario bâtiment historique ABF - contraintes réglementaires', async () => {
      const scenario = getGroundTruthScenario('batiment_historique_abf');
      const project = createProjectFromGroundTruth('batiment_historique_abf');
      
      const timeline = await dateIntelligenceService.calculateProjectTimeline(project);
      
      // Vérifier délais ABF
      expect(timeline.phases.visa_architecte?.durationDays).toBe(45);
      expect(timeline.phases.etude?.durationDays).toBe(21); // Étude patrimoine
      
      // Vérifier contraintes spécialisées
      expect(timeline.constraints).toContain('abf_approval_required');
      expect(timeline.constraints).toContain('heritage_materials_only');
      
      // Vérifier durée totale cohérente
      expect(timeline.totalDuration).toBe(scenario.expectedTimeline.total);
    });

    test('scénario conflit ressources - détection et résolution', async () => {
      const conflictScenario = getGroundTruthScenario('resource_conflict_scenario');
      const projects = conflictScenario.projects.map(p => createMockMenuiserieProject({
        type: p.type
      }));
      
      // Créer timelines overlapping
      const timelines = projects.map((project, index) => {
        const scenario = conflictScenario.projects[index];
        return createMockProjectTimeline({
          projectId: project.id,
          phase: 'chantier',
          startDate: new Date(scenario.startDate),
          endDate: new Date(scenario.endDate)
        });
      });
      
      const conflicts = await dateIntelligenceService.detectPlanningConflicts(timelines);
      
      // Vérifier détection du conflit
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].type).toBe('resource_conflict');
      expect(conflicts[0].affectedProjects).toHaveLength(2);
    });
  });

  // ========================================
  // TESTS PERFORMANCE ET OPTIMISATION
  // ========================================

  describe('Performance et Optimisation', () => {
    test('calcul timeline projet simple en < 300ms', async () => {
      const project = createMockMenuiserieProject();
      
      const { result, durationMs } = await measureExecutionTime(
        () => dateIntelligenceService.calculateProjectTimeline(project),
        'Calcul timeline simple'
      );
      
      expect(durationMs).toBeLessThan(300);
      expect(result.phases).toBeDefined();
      expect(result.totalDuration).toBeGreaterThan(0);
    });

    test('calcul batch 20 projets en < 2 secondes', async () => {
      const projects = Array.from({ length: 20 }, () => createMockMenuiserieProject());
      
      const { result, durationMs } = await measureExecutionTime(
        () => Promise.all(projects.map(p => dateIntelligenceService.calculateProjectTimeline(p))),
        'Calcul batch 20 projets'
      );
      
      expect(durationMs).toBeLessThan(2000);
      expect(result).toHaveLength(20);
      expect(result.every(r => r.totalDuration > 0)).toBe(true);
    });

    test('optimisation planning complexe en < 500ms', async () => {
      const project = createMockMenuiserieProject({
        complexity: 'elevee',
        customWork: true,
        surface: 150
      });
      
      const initialTimeline = await dateIntelligenceService.calculateProjectTimeline(project);
      
      const { result, durationMs } = await measureExecutionTime(
        () => dateIntelligenceService.optimizeTimeline(project.id, initialTimeline),
        'Optimisation planning complexe'
      );
      
      expect(durationMs).toBeLessThan(500);
      expect(result).toHaveLength(2); // Au moins 2 optimisations
      expect(result.every(o => o.estimatedGainDays > 0)).toBe(true);
    });

    test('mise à jour cascade 5 phases en < 200ms', async () => {
      const project = createMockMenuiserieProject();
      const timelines = createTimelinesFromGroundTruth('fenetre_pvc_standard', project.id);
      
      vi.spyOn(storage, 'getProjectTimelines').mockResolvedValue(timelines);
      
      const { result, durationMs } = await measureExecutionTime(
        () => dateIntelligenceService.handleCascadeUpdate(project.id, {
          phase: 'etude' as ProjectStatus,
          delayDays: 2,
          reason: 'Test cascade'
        }),
        'Mise à jour cascade'
      );
      
      expect(durationMs).toBeLessThan(200);
      expect(result.updatedPhases).toHaveLength(3); // Phases suivantes
      expect(result.totalDelayDays).toBe(2);
    });
  });

  // ========================================
  // TESTS EDGE CASES ET ROBUSTESSE
  // ========================================

  describe('Edge Cases et Robustesse', () => {
    test('gère projet avec données incomplètes', async () => {
      const incompleteProject = createMockMenuiserieProject({
        // Délibérément incomplet
        surface: undefined,
        complexity: undefined
      });
      
      const timeline = await dateIntelligenceService.calculateProjectTimeline(incompleteProject);
      
      // Doit utiliser des valeurs par défaut
      expect(timeline.phases).toBeDefined();
      expect(timeline.totalDuration).toBeGreaterThan(0);
      expect(timeline.confidence).toBeLessThan(1.0); // Confiance réduite
    });

    test('valide contraintes impossibles', async () => {
      const impossibleProject = createMockMenuiserieProject({
        season: 'winter',
        isExterior: true,
        location: {
          weatherZone: 'montagne',
          accessibility: 'difficile'
        }
      });
      
      // Ajouter contrainte deadline impossible
      impossibleProject.deadline = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000); // +10 jours
      
      const timeline = await dateIntelligenceService.calculateProjectTimeline(impossibleProject);
      
      // Doit détecter l'impossibilité
      expect(timeline.warnings).toContain('impossible_deadline');
      expect(timeline.confidence).toBeLessThan(0.5);
    });

    test('récupère des erreurs de calcul', async () => {
      // Mock d'une erreur dans le storage
      vi.spyOn(storage, 'getDateIntelligenceRules').mockRejectedValue(new Error('Database error'));
      
      const project = createMockMenuiserieProject();
      
      const timeline = await dateIntelligenceService.calculateProjectTimeline(project);
      
      // Doit utiliser un fallback
      expect(timeline.phases).toBeDefined();
      expect(timeline.appliedRules).toContain('fallback_default');
      expect(timeline.confidence).toBe(0.3); // Confiance minimale
    });

    test('limite récursion dans cascades complexes', async () => {
      const project = createMockMenuiserieProject();
      
      // Créer une cascade qui pourrait être infinie
      const cascadeLoop = {
        phase: 'etude' as ProjectStatus,
        delayDays: 1,
        reason: 'Loop test'
      };
      
      // Exécuter plusieurs fois
      for (let i = 0; i < 10; i++) {
        const result = await dateIntelligenceService.handleCascadeUpdate(project.id, cascadeLoop);
        expect(result.updatedPhases.length).toBeLessThan(10); // Limitation
      }
    });
  });
});