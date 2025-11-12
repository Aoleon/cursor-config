import { logger } from '../utils/logger';
import { withErrorHandling } from '../utils/error-handler';
import { getAgentComplexTaskResolver } from './AgentComplexTaskResolver';
import { getAgentArchitectureAnalyzer } from './AgentArchitectureAnalyzer';
import { getAgentConflictResolver } from './AgentConflictResolver';
import type { IStorage } from '../storage-poc';

// ========================================
// TYPES ET INTERFACES
// ========================================

export interface MigrationTarget {
  id: string;
  source: string;
  target: string;
  type: 'file' | 'service' | 'module' | 'function';
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimatedEffort: number; // heures
  dependencies: string[];
  risks: Array<{
    type: string;
    description: string;
    probability: number;
    mitigation: string;
  }>;
}

export interface MigrationPlan {
  targets: MigrationTarget[];
  phases: Array<{
    phase: number;
    name: string;
    targets: string[];
    canParallelize: boolean;
    estimatedDuration: number;
    validationSteps: string[];
  }>;
  rollbackStrategy: {
    checkpoints: string[];
    rollbackPlan: string;
  };
  estimatedTotalDuration: number;
  successCriteria: string[];
}

// ========================================
// AGENT MIGRATION PLANNER
// ========================================

/**
 * Service de planification intelligente de migrations
 * Planifie migrations complexes avec gestion risques et validation
 */
export class AgentMigrationPlanner {
  private storage: IStorage;
  private taskResolver: ReturnType<typeof getAgentComplexTaskResolver>;
  private architectureAnalyzer: ReturnType<typeof getAgentArchitectureAnalyzer>;
  private conflictResolver: ReturnType<typeof getAgentConflictResolver>;

  constructor(storage: IStorage) {
    if (!storage) {
      throw new Error('Storage requis pour AgentMigrationPlanner');
    }
    this.storage = storage;
    this.taskResolver = getAgentComplexTaskResolver(storage);
    this.architectureAnalyzer = getAgentArchitectureAnalyzer(storage);
    this.conflictResolver = getAgentConflictResolver(storage);
  }

  /**
   * Planifie une migration complexe
   */
  async planMigration(
    source: string,
    target: string,
    type: MigrationTarget['type']
  ): Promise<MigrationPlan> {
    return withErrorHandling(
      async () => {
        // 1. Analyser source et cible
        const sourceAnalysis = await this.analyzeSource(source);
        const targetAnalysis = await this.analyzeTarget(target);

        // 2. Identifier cibles de migration
        const targets = await this.identifyMigrationTargets(source, target, type);

        // 3. Construire plan par phases
        const phases = this.buildMigrationPhases(targets);

        // 4. Définir stratégie de rollback
        const rollbackStrategy = this.defineRollbackStrategy(targets);

        // 5. Définir critères de succès
        const successCriteria = this.defineSuccessCriteria(targets);

        const estimatedTotalDuration = phases.reduce(
          (sum, p) => sum + p.estimatedDuration,
          0
        );

        logger.info('Plan de migration généré', {
          metadata: {
            service: 'AgentMigrationPlanner',
            operation: 'planMigration',
            source,
            target,
            type,
            targetsCount: targets.length,
            phasesCount: phases.length,
            estimatedTotalDuration
          }
        });

        return {
          targets,
          phases,
          rollbackStrategy,
          estimatedTotalDuration,
          successCriteria
        };
      },
      {
        operation: 'planMigration',
        service: 'AgentMigrationPlanner',
        metadata: { source, target }
      }
    );
  }

  /**
   * Analyse source de migration
   */
  private async analyzeSource(source: string): Promise<{
    complexity: number;
    dependencies: string[];
    risks: string[];
  }> {
    // Analyser complexité et dépendances
    // Cette méthode serait enrichie avec analyse réelle

    return {
      complexity: 0.7,
      dependencies: [],
      risks: []
    };
  }

  /**
   * Analyse cible de migration
   */
  private async analyzeTarget(target: string): Promise<{
    structure: string;
    patterns: string[];
    readiness: number; // 0-1
  }> {
    // Analyser structure cible
    // Cette méthode serait enrichie avec analyse réelle

    return {
      structure: 'modular',
      patterns: ['repository', 'service', 'route'],
      readiness: 0.8
    };
  }

  /**
   * Identifie cibles de migration
   */
  private async identifyMigrationTargets(
    source: string,
    target: string,
    type: MigrationTarget['type']
  ): Promise<MigrationTarget[]> {
    const targets: MigrationTarget[] = [];

    // Exemple: Migration routes-poc.ts vers modules
    if (source === 'server/routes-poc.ts' && target === 'server/modules') {
      // Cibles connues de migration
      const knownTargets = [
        { module: 'chiffrage', priority: 'high' as const, effort: 8 },
        { module: 'suppliers', priority: 'high' as const, effort: 6 },
        { module: 'projects', priority: 'medium' as const, effort: 12 },
        { module: 'analytics', priority: 'medium' as const, effort: 8 }
      ];

      for (const t of knownTargets) {
        targets.push({
          id: `migration-${t.module}`,
          source: `${source} (routes ${t.module})`,
          target: `${target}/${t.module}/routes.ts`,
          type: 'module',
          priority: t.priority,
          estimatedEffort: t.effort,
          dependencies: [],
          risks: [
            {
              type: 'regression',
              description: 'Risque de régression fonctionnelle',
              probability: 0.4,
              mitigation: 'Tests exhaustifs après chaque phase'
            }
          ]
        });
      }
    }

    return targets;
  }

  /**
   * Construit phases de migration
   */
  private buildMigrationPhases(targets: MigrationTarget[]): MigrationPlan['phases'] {
    const phases: MigrationPlan['phases'] = [];

    // Phase 1: Préparation
    phases.push({
      phase: 1,
      name: 'Préparation',
      targets: [],
      canParallelize: false,
      estimatedDuration: 60, // minutes
      validationSteps: [
        'Analyser code source',
        'Identifier dépendances',
        'Créer structure cible',
        'Définir tests de non-régression'
      ]
    });

    // Phase 2: Migration par cible
    let phaseNum = 2;
    for (const target of targets) {
      phases.push({
        phase: phaseNum++,
        name: `Migration ${target.target}`,
        targets: [target.id],
        canParallelize: false, // Migration séquentielle pour sécurité
        estimatedDuration: target.estimatedEffort * 60, // convertir heures en minutes
        validationSteps: [
          `Migrer ${target.source} vers ${target.target}`,
          'Tests unitaires',
          'Tests d\'intégration',
          'Validation fonctionnelle'
        ]
      });
    }

    // Phase finale: Validation globale
    phases.push({
      phase: phaseNum,
      name: 'Validation globale',
      targets: [],
      canParallelize: false,
      estimatedDuration: 120,
      validationSteps: [
        'Tests E2E complets',
        'Validation performance',
        'Review code',
        'Documentation'
      ]
    });

    return phases;
  }

  /**
   * Définit stratégie de rollback
   */
  private defineRollbackStrategy(targets: MigrationTarget[]): MigrationPlan['rollbackStrategy'] {
    const checkpoints: string[] = [];

    // Créer checkpoint avant chaque phase
    for (let i = 0; i < targets.length; i++) {
      checkpoints.push(`checkpoint-phase-${i + 2}`);
    }

    return {
      checkpoints,
      rollbackPlan: 'Rollback via git vers checkpoint précédent si validation échoue'
    };
  }

  /**
   * Définit critères de succès
   */
  private defineSuccessCriteria(targets: MigrationTarget[]): string[] {
    return [
      'Tous les tests passent (unitaires, intégration, E2E)',
      'Aucune régression fonctionnelle',
      'Performance maintenue ou améliorée',
      'Code migré conforme aux patterns cibles',
      'Documentation à jour',
      'Couverture de tests maintenue'
    ];
  }

  /**
   * Génère plan de migration pour routes-poc.ts
   */
  async planRoutesPocMigration(): Promise<MigrationPlan> {
    return this.planMigration(
      'server/routes-poc.ts',
      'server/modules',
      'module'
    );
  }

  /**
   * Génère plan de migration pour storage-poc.ts
   */
  async planStoragePocMigration(): Promise<MigrationPlan> {
    return this.planMigration(
      'server/storage-poc.ts',
      'server/storage',
      'service'
    );
  }

  /**
   * Génère plan de consolidation services
   */
  async planServicesConsolidation(
    services: string[],
    targetService: string
  ): Promise<MigrationPlan> {
    return withErrorHandling(
      async () => {
        const targets: MigrationTarget[] = services.map((service, index) => ({
          id: `consolidation-${service}`,
          source: `server/services/${service}.ts`,
          target: `server/services/consolidated/${targetService}.ts`,
          type: 'service',
          priority: 'high',
          estimatedEffort: 4,
          dependencies: index > 0 ? [`consolidation-${services[index - 1]}`] : [],
          risks: [
            {
              type: 'breaking_change',
              description: 'Risque de breaking change pour usages existants',
              probability: 0.5,
              mitigation: 'Créer adapter/compatibilité, migration progressive'
            }
          ]
        }));

        const phases = this.buildMigrationPhases(targets);
        const rollbackStrategy = this.defineRollbackStrategy(targets);
        const successCriteria = this.defineSuccessCriteria(targets);

        return {
          targets,
          phases,
          rollbackStrategy,
          estimatedTotalDuration: phases.reduce((sum, p) => sum + p.estimatedDuration, 0),
          successCriteria
        };
      },
      {
        operation: 'planServicesConsolidation',
        service: 'AgentMigrationPlanner',
        metadata: {}
      }
    );
  }
}

// ========================================
// SINGLETON INSTANCE
// ========================================

let agentMigrationPlannerInstance: AgentMigrationPlanner | null = null;

export function getAgentMigrationPlanner(storage: IStorage): AgentMigrationPlanner {
  if (!agentMigrationPlannerInstance) {
    agentMigrationPlannerInstance = new AgentMigrationPlanner(storage);
  }
  return agentMigrationPlannerInstance;
}

