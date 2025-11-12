import { logger } from '../utils/logger';
import { withErrorHandling } from '../utils/error-handler';
import { getAgentLearningService } from './AgentLearningService';
import { getToolCallAnalyzer } from './ToolCallAnalyzer';
import type { IStorage } from '../storage-poc';

// ========================================
// TYPES ET INTERFACES
// ========================================

export interface ComplexTask {
  id: string;
  description: string;
  domain: 'migration' | 'refactoring' | 'optimization' | 'feature' | 'bugfix' | 'debt';
  complexity: 'simple' | 'medium' | 'complex' | 'expert';
  estimatedDuration: number; // en minutes
  dependencies: string[];
  constraints: string[];
  successCriteria: string[];
}

export interface TaskDecomposition {
  task: ComplexTask;
  subtasks: Array<{
    id: string;
    description: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    estimatedDuration: number;
    dependencies: string[];
    requiredTools: string[];
    riskLevel: 'low' | 'medium' | 'high';
  }>;
  executionPlan: {
    phases: Array<{
      phase: number;
      name: string;
      subtasks: string[];
      canParallelize: boolean;
      estimatedDuration: number;
    }>;
    totalEstimatedDuration: number;
    criticalPath: string[];
  };
  riskAssessment: {
    overallRisk: 'low' | 'medium' | 'high' | 'critical';
    risks: Array<{
      type: string;
      description: string;
      probability: number;
      impact: 'low' | 'medium' | 'high';
      mitigation: string;
    }>;
  };
}

export interface ResolutionStrategy {
  approach: 'sequential' | 'parallel' | 'iterative' | 'hybrid';
  reasoning: string;
  estimatedEfficiency: number; // 0-1
  confidence: number; // 0-1
}

// ========================================
// AGENT COMPLEX TASK RESOLVER
// ========================================

/**
 * Service de résolution intelligente de tâches complexes
 * Décompose, planifie et optimise l'exécution de tâches complexes
 */
export class AgentComplexTaskResolver {
  private storage: IStorage;
  private learningService: ReturnType<typeof getAgentLearningService>;
  private toolCallAnalyzer: ReturnType<typeof getToolCallAnalyzer>;

  constructor(storage: IStorage) {
    this.storage = storage;
    this.learningService = getAgentLearningService();
    this.toolCallAnalyzer = getToolCallAnalyzer(storage);
  }

  /**
   * Décompose une tâche complexe en sous-tâches optimisées
   */
  async decomposeTask(task: ComplexTask): Promise<TaskDecomposition> {
    return withErrorHandling(
      async () => {
        // Validation de la tâche
        if (!task.id || !task.description) {
          throw new Error('Tâche invalide: id et description requis');
        }

        // 1. Analyser patterns historiques similaires
        let successPatterns: Array<{
          queryType: string;
          complexity: string;
          successRate: number;
          avgExecutionTime: number;
        }> = [];
        try {
          const patterns = await this.learningService.analyzeHistoricalPatterns(30);
          successPatterns = patterns.successPatterns || [];
        } catch (error) {
          logger.debug('Erreur récupération patterns historiques, continuation sans patterns', {
            metadata: {
              service: 'AgentComplexTaskResolver',
              operation: 'decomposeTask',
              error: error instanceof Error ? error.message : String(error)
            }
          });
        }
        const similarPatterns = this.findSimilarPatterns(task, successPatterns);

        // 2. Identifier sous-tâches selon domaine
        const subtasks = await this.identifySubtasks(task, similarPatterns);

        // 3. Construire plan d'exécution optimisé
        const executionPlan = this.buildExecutionPlan(subtasks, task);

        // 4. Évaluer risques
        const riskAssessment = this.assessRisks(task, subtasks, executionPlan);

        logger.info('Tâche complexe décomposée', {
          metadata: {
            service: 'AgentComplexTaskResolver',
            operation: 'decomposeTask',
            taskId: task.id,
            domain: task.domain,
            complexity: task.complexity,
            subtasksCount: subtasks.length,
            phasesCount: executionPlan.phases.length,
            overallRisk: riskAssessment.overallRisk
          }
        });

        return {
          task,
          subtasks,
          executionPlan,
          riskAssessment
        };
      },
      {
        operation: 'decomposeTask',
        service: 'AgentComplexTaskResolver',
        metadata: { taskId: task.id }
      }
    );
  }

  /**
   * Trouve patterns similaires dans l'historique
   */
  private findSimilarPatterns(
    task: ComplexTask,
    patterns: Array<{
      queryType: string;
      complexity: string;
      successRate: number;
      avgExecutionTime: number;
    }>
  ): Array<{
    queryType: string;
    similarity: number;
    successRate: number;
  }> {
    const similar: Array<{
      queryType: string;
      similarity: number;
      successRate: number;
    }> = [];

    for (const pattern of patterns) {
      const similarity = this.calculateTaskSimilarity(task, pattern);
      if (similarity > 0.5) {
        similar.push({
          queryType: pattern.queryType,
          similarity,
          successRate: pattern.successRate
        });
      }
    }

    return similar.sort((a, b) => b.similarity - a.similarity);
  }

  /**
   * Calcule similarité entre tâche et pattern
   */
  private calculateTaskSimilarity(
    task: ComplexTask,
    pattern: {
      queryType: string;
      complexity: string;
    }
  ): number {
    // Similarité basée sur domaine et complexité
    let similarity = 0;

    // Vérifier correspondance domaine
    if (pattern.queryType.toLowerCase().includes(task.domain)) {
      similarity += 0.4;
    }

    // Vérifier correspondance complexité
    if (pattern.complexity === task.complexity) {
      similarity += 0.3;
    } else if (
      (pattern.complexity === 'complex' && task.complexity === 'expert') ||
      (pattern.complexity === 'medium' && task.complexity === 'complex')
    ) {
      similarity += 0.2;
    }

    // Similarité texte description
    const descWords = new Set(task.description.toLowerCase().split(/\s+/));
    const patternWords = new Set(pattern.queryType.toLowerCase().split(/\s+/));
    const descWordsArray = Array.from(descWords);
    const patternWordsArray = Array.from(patternWords);
    const intersection = new Set(descWordsArray.filter(w => patternWords.has(w)));
    const union = new Set([...descWordsArray, ...patternWordsArray]);
    const textSimilarity = union.size > 0 ? intersection.size / union.size : 0;
    similarity += textSimilarity * 0.3;

    return Math.min(similarity, 1);
  }

  /**
   * Identifie sous-tâches selon domaine et complexité
   */
  private async identifySubtasks(
    task: ComplexTask,
    similarPatterns: Array<{
      queryType: string;
      similarity: number;
      successRate: number;
    }>
  ): Promise<TaskDecomposition['subtasks']> {
    const subtasks: TaskDecomposition['subtasks'] = [];

    switch (task.domain) {
      case 'migration':
        subtasks.push(...this.identifyMigrationSubtasks(task));
        break;
      case 'refactoring':
        subtasks.push(...this.identifyRefactoringSubtasks(task));
        break;
      case 'optimization':
        subtasks.push(...this.identifyOptimizationSubtasks(task));
        break;
      case 'debt':
        subtasks.push(...this.identifyDebtSubtasks(task));
        break;
      default:
        subtasks.push(...this.identifyGenericSubtasks(task));
    }

    // Enrichir avec patterns similaires
    if (similarPatterns.length > 0) {
      const bestPattern = similarPatterns[0];
      if (bestPattern.successRate > 0.8) {
        // Ajouter sous-tâches basées sur pattern réussi
        subtasks.push({
          id: `pattern-based-${Date.now()}`,
          description: `Appliquer pattern réussi: ${bestPattern.queryType}`,
          priority: 'high',
          estimatedDuration: 30,
          dependencies: [],
          requiredTools: ['codebase_search', 'read_file'],
          riskLevel: 'low'
        });
      }
    }

    return subtasks;
  }

  /**
   * Identifie sous-tâches pour migration
   */
  private identifyMigrationSubtasks(task: ComplexTask): TaskDecomposition['subtasks'] {
    const subtasks: TaskDecomposition['subtasks'] = [];

    // Analyse préalable
    subtasks.push({
      id: 'migration-1-analyze',
      description: 'Analyser code source à migrer (structure, dépendances, tests)',
      priority: 'critical',
      estimatedDuration: 60,
      dependencies: [],
      requiredTools: ['codebase_search', 'grep', 'read_file'],
      riskLevel: 'low'
    });

    // Planification
    subtasks.push({
      id: 'migration-2-plan',
      description: 'Créer plan de migration détaillé avec étapes',
      priority: 'critical',
      estimatedDuration: 30,
      dependencies: ['migration-1-analyze'],
      requiredTools: ['codebase_search'],
      riskLevel: 'low'
    });

    // Migration par phases
    subtasks.push({
      id: 'migration-3-implement',
      description: 'Implémenter migration selon plan',
      priority: 'high',
      estimatedDuration: task.estimatedDuration * 0.6,
      dependencies: ['migration-2-plan'],
      requiredTools: ['codebase_search', 'read_file', 'grep'],
      riskLevel: 'medium'
    });

    // Tests
    subtasks.push({
      id: 'migration-4-test',
      description: 'Tests de non-régression et validation',
      priority: 'critical',
      estimatedDuration: task.estimatedDuration * 0.2,
      dependencies: ['migration-3-implement'],
      requiredTools: ['grep', 'read_file'],
      riskLevel: 'high'
    });

    // Documentation
    subtasks.push({
      id: 'migration-5-doc',
      description: 'Documenter changements et patterns',
      priority: 'medium',
      estimatedDuration: 20,
      dependencies: ['migration-4-test'],
      requiredTools: ['read_file'],
      riskLevel: 'low'
    });

    return subtasks;
  }

  /**
   * Identifie sous-tâches pour refactoring
   */
  private identifyRefactoringSubtasks(task: ComplexTask): TaskDecomposition['subtasks'] {
    return [
      {
        id: 'refactor-1-analyze',
        description: 'Analyser code à refactorer (complexité, duplication, dépendances)',
        priority: 'critical',
        estimatedDuration: 45,
        dependencies: [],
        requiredTools: ['codebase_search', 'grep'],
        riskLevel: 'low'
      },
      {
        id: 'refactor-2-design',
        description: 'Concevoir nouvelle structure (patterns, interfaces)',
        priority: 'high',
        estimatedDuration: 30,
        dependencies: ['refactor-1-analyze'],
        requiredTools: ['codebase_search'],
        riskLevel: 'low'
      },
      {
        id: 'refactor-3-implement',
        description: 'Implémenter refactoring avec tests',
        priority: 'high',
        estimatedDuration: task.estimatedDuration * 0.7,
        dependencies: ['refactor-2-design'],
        requiredTools: ['read_file', 'codebase_search'],
        riskLevel: 'high'
      },
      {
        id: 'refactor-4-validate',
        description: 'Valider refactoring (tests, lint, review)',
        priority: 'critical',
        estimatedDuration: task.estimatedDuration * 0.2,
        dependencies: ['refactor-3-implement'],
        requiredTools: ['grep', 'read_file'],
        riskLevel: 'medium'
      }
    ];
  }

  /**
   * Identifie sous-tâches pour optimisation
   */
  private identifyOptimizationSubtasks(task: ComplexTask): TaskDecomposition['subtasks'] {
    return [
      {
        id: 'optim-1-profile',
        description: 'Profiler performance actuelle (bottlenecks, métriques)',
        priority: 'critical',
        estimatedDuration: 30,
        dependencies: [],
        requiredTools: ['codebase_search', 'read_file'],
        riskLevel: 'low'
      },
      {
        id: 'optim-2-identify',
        description: 'Identifier opportunités d\'optimisation',
        priority: 'high',
        estimatedDuration: 20,
        dependencies: ['optim-1-profile'],
        requiredTools: ['codebase_search'],
        riskLevel: 'low'
      },
      {
        id: 'optim-3-implement',
        description: 'Implémenter optimisations',
        priority: 'high',
        estimatedDuration: task.estimatedDuration * 0.6,
        dependencies: ['optim-2-identify'],
        requiredTools: ['read_file', 'codebase_search'],
        riskLevel: 'medium'
      },
      {
        id: 'optim-4-validate',
        description: 'Valider améliorations (benchmarks, tests)',
        priority: 'critical',
        estimatedDuration: task.estimatedDuration * 0.3,
        dependencies: ['optim-3-implement'],
        requiredTools: ['read_file'],
        riskLevel: 'low'
      }
    ];
  }

  /**
   * Identifie sous-tâches pour dette technique
   */
  private identifyDebtSubtasks(task: ComplexTask): TaskDecomposition['subtasks'] {
    return [
      {
        id: 'debt-1-audit',
        description: 'Auditer dette technique (code smells, duplication, complexité)',
        priority: 'critical',
        estimatedDuration: 45,
        dependencies: [],
        requiredTools: ['codebase_search', 'grep'],
        riskLevel: 'low'
      },
      {
        id: 'debt-2-prioritize',
        description: 'Prioriser élimination selon impact et ROI',
        priority: 'high',
        estimatedDuration: 20,
        dependencies: ['debt-1-audit'],
        requiredTools: ['codebase_search'],
        riskLevel: 'low'
      },
      {
        id: 'debt-3-eliminate',
        description: 'Éliminer dette technique priorisée',
        priority: 'high',
        estimatedDuration: task.estimatedDuration * 0.7,
        dependencies: ['debt-2-prioritize'],
        requiredTools: ['read_file', 'codebase_search', 'grep'],
        riskLevel: 'medium'
      },
      {
        id: 'debt-4-validate',
        description: 'Valider élimination (tests, métriques)',
        priority: 'critical',
        estimatedDuration: task.estimatedDuration * 0.2,
        dependencies: ['debt-3-eliminate'],
        requiredTools: ['read_file', 'grep'],
        riskLevel: 'low'
      }
    ];
  }

  /**
   * Identifie sous-tâches génériques
   */
  private identifyGenericSubtasks(task: ComplexTask): TaskDecomposition['subtasks'] {
    return [
      {
        id: 'generic-1-analyze',
        description: 'Analyser besoins et contraintes',
        priority: 'critical',
        estimatedDuration: 30,
        dependencies: [],
        requiredTools: ['codebase_search'],
        riskLevel: 'low'
      },
      {
        id: 'generic-2-design',
        description: 'Concevoir solution',
        priority: 'high',
        estimatedDuration: task.estimatedDuration * 0.2,
        dependencies: ['generic-1-analyze'],
        requiredTools: ['codebase_search', 'read_file'],
        riskLevel: 'low'
      },
      {
        id: 'generic-3-implement',
        description: 'Implémenter solution',
        priority: 'high',
        estimatedDuration: task.estimatedDuration * 0.6,
        dependencies: ['generic-2-design'],
        requiredTools: ['read_file', 'codebase_search'],
        riskLevel: 'medium'
      },
      {
        id: 'generic-4-validate',
        description: 'Valider et tester',
        priority: 'critical',
        estimatedDuration: task.estimatedDuration * 0.2,
        dependencies: ['generic-3-implement'],
        requiredTools: ['read_file', 'grep'],
        riskLevel: 'medium'
      }
    ];
  }

  /**
   * Construit plan d'exécution optimisé
   */
  private buildExecutionPlan(
    subtasks: TaskDecomposition['subtasks'],
    task: ComplexTask
  ): TaskDecomposition['executionPlan'] {
    // 1. Grouper par dépendances
    const phases: Array<{
      phase: number;
      name: string;
      subtasks: string[];
      canParallelize: boolean;
      estimatedDuration: number;
    }> = [];

    const executed = new Set<string>();
    let phaseNum = 1;

    while (executed.size < subtasks.length) {
      // Trouver sous-tâches sans dépendances non exécutées
      const ready = subtasks.filter(
        st => !executed.has(st.id) &&
        (!st.dependencies || st.dependencies.every(dep => executed.has(dep)))
      );

      if (ready.length === 0) {
        // Dépendances circulaires - exécuter quand même
        const remaining = subtasks.filter(st => !executed.has(st.id));
        if (remaining.length > 0) {
          phases.push({
            phase: phaseNum++,
            name: `Phase ${phaseNum - 1} (dépendances résolues)`,
            subtasks: remaining.map(st => st.id),
            canParallelize: remaining.length > 1 && remaining.every(st => st.dependencies.length === 0),
            estimatedDuration: Math.max(...remaining.map(st => st.estimatedDuration))
          });
          remaining.forEach(st => executed.add(st.id));
        }
        break;
      }

      // Trier par priorité
      ready.sort((a, b) => {
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });

      phases.push({
        phase: phaseNum++,
        name: `Phase ${phaseNum - 1}`,
        subtasks: ready.map(st => st.id),
        canParallelize: ready.length > 1,
        estimatedDuration: ready.length > 1
          ? Math.max(...ready.map(st => st.estimatedDuration))
          : ready.reduce((sum, st) => sum + st.estimatedDuration, 0)
      });

      ready.forEach(st => executed.add(st.id));
    }

    // Calculer chemin critique
    const criticalPath = this.calculateCriticalPath(subtasks, phases);

    const totalEstimatedDuration = phases.reduce((sum, p) => sum + p.estimatedDuration, 0);

    return {
      phases,
      totalEstimatedDuration,
      criticalPath
    };
  }

  /**
   * Calcule le chemin critique
   */
  private calculateCriticalPath(
    subtasks: TaskDecomposition['subtasks'],
    phases: Array<{
      phase: number;
      subtasks: string[];
      estimatedDuration: number;
    }>
  ): string[] {
    // Chemin critique = séquence de sous-tâches avec durée totale maximale
    const path: string[] = [];
    const taskMap = new Map(subtasks.map(st => [st.id, st]));

    for (const phase of phases) {
      if (phase.subtasks.length === 1) {
        path.push(phase.subtasks[0]);
      } else {
        // Prendre sous-tâche la plus longue
        const longest = phase.subtasks.reduce((max, id) => {
          const current = taskMap.get(id);
          const maxTask = taskMap.get(max);
          return (current?.estimatedDuration || 0) > (maxTask?.estimatedDuration || 0) ? id : max;
        }, phase.subtasks[0]);
        path.push(longest);
      }
    }

    return path;
  }

  /**
   * Évalue les risques
   */
  private assessRisks(
    task: ComplexTask,
    subtasks: TaskDecomposition['subtasks'],
    executionPlan: TaskDecomposition['executionPlan']
  ): TaskDecomposition['riskAssessment'] {
    const risks: TaskDecomposition['riskAssessment']['risks'] = [];

    // Risque de complexité
    if (task.complexity === 'expert') {
      risks.push({
        type: 'complexity',
        description: 'Tâche très complexe, risque d\'erreurs élevé',
        probability: 0.6,
        impact: 'high',
        mitigation: 'Décomposer en sous-tâches plus petites, tests fréquents'
      });
    }

    // Risque de dépendances
    const highDependencySubtasks = subtasks.filter(st => st.dependencies.length > 2);
    if (highDependencySubtasks.length > 0) {
      risks.push({
        type: 'dependencies',
        description: `${highDependencySubtasks.length} sous-tâches avec nombreuses dépendances`,
        probability: 0.4,
        impact: 'medium',
        mitigation: 'Valider dépendances avant exécution, planifier ordre soigneusement'
      });
    }

    // Risque de durée
    if (executionPlan.totalEstimatedDuration > 240) { // > 4h
      risks.push({
        type: 'duration',
        description: 'Durée estimée très longue, risque de dépassement',
        probability: 0.5,
        impact: 'medium',
        mitigation: 'Créer checkpoints, valider progression régulièrement'
      });
    }

    // Risque selon domaine
    if (task.domain === 'migration' || task.domain === 'refactoring') {
      risks.push({
        type: 'regression',
        description: 'Risque de régression fonctionnelle',
        probability: 0.5,
        impact: 'high',
        mitigation: 'Tests exhaustifs, validation à chaque étape'
      });
    }

    // Calculer risque global
    const highImpactRisks = risks.filter(r => r.impact === 'high');
    const overallRisk = highImpactRisks.length > 0
      ? (highImpactRisks.some(r => r.probability > 0.6) ? 'critical' : 'high')
      : risks.some(r => r.impact === 'medium' && r.probability > 0.5)
      ? 'medium'
      : 'low';

    return {
      overallRisk,
      risks
    };
  }

  /**
   * Recommande stratégie de résolution
   */
  async recommendStrategy(task: ComplexTask): Promise<ResolutionStrategy> {
    return withErrorHandling(
      async () => {
        const decomposition = await this.decomposeTask(task);

        // Analyser plan pour recommander stratégie
        const canParallelize = decomposition.executionPlan.phases.some(p => p.canParallelize);
        const hasManyPhases = decomposition.executionPlan.phases.length > 3;
        const hasHighRisk = decomposition.riskAssessment.overallRisk === 'high' || 
                           decomposition.riskAssessment.overallRisk === 'critical';

        let approach: ResolutionStrategy['approach'];
        let reasoning: string;
        let estimatedEfficiency: number;
        let confidence: number;

        if (hasHighRisk && hasManyPhases) {
          // Approche itérative pour risques élevés
          approach = 'iterative';
          reasoning = 'Risques élevés et nombreuses phases - approche itérative recommandée pour validation progressive';
          estimatedEfficiency = 0.7;
          confidence = 0.8;
        } else if (canParallelize && !hasHighRisk) {
          // Approche parallèle si possible
          approach = 'parallel';
          reasoning = 'Sous-tâches indépendantes détectées - parallélisation recommandée pour efficacité';
          estimatedEfficiency = 0.9;
          confidence = 0.85;
        } else if (hasManyPhases) {
          // Approche hybride
          approach = 'hybrid';
          reasoning = 'Plusieurs phases avec mix de dépendances - approche hybride optimale';
          estimatedEfficiency = 0.8;
          confidence = 0.75;
        } else {
          // Approche séquentielle
          approach = 'sequential';
          reasoning = 'Dépendances strictes - approche séquentielle nécessaire';
          estimatedEfficiency = 0.6;
          confidence = 0.9;
        }

        return {
          approach,
          reasoning,
          estimatedEfficiency,
          confidence
        };
      },
      {
        operation: 'recommendStrategy',
        service: 'AgentComplexTaskResolver',
        metadata: { taskId: task.id }
      }
    );
  }
}

// ========================================
// SINGLETON INSTANCE
// ========================================

let agentComplexTaskResolverInstance: AgentComplexTaskResolver | null = null;

export function getAgentComplexTaskResolver(storage: IStorage): AgentComplexTaskResolver {
  if (!agentComplexTaskResolverInstance) {
    agentComplexTaskResolverInstance = new AgentComplexTaskResolver(storage);
  }
  return agentComplexTaskResolverInstance;
}

