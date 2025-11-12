import { logger } from './logger';
import { withErrorHandling } from './error-handler';
import { getAgentCheckpointManager } from './agent-checkpoint';
import type { Todo } from './agent-checkpoint';

// ========================================
// TYPES ET INTERFACES
// ========================================

export interface StopCheckResult {
  shouldStop: boolean;
  reason: string;
  checks: CheckResult[];
  forcedContinuation: boolean;
  continuationReason?: string;
}

export interface CheckResult {
  name: string;
  passed: boolean;
  details?: {
    [key: string]: unknown;
  };
}

export interface StopDetectionOptions {
  toolCallCount?: number;
  todos?: Todo[];
  responseText?: string;
  errors?: string[];
  warnings?: string[];
  testFailures?: string[];
  incompleteFeatures?: string[];
}

// ========================================
// STOP DETECTOR
// ========================================

/**
 * Détecteur d'arrêt prématuré pour l'agent Cursor
 * Effectue 15+ vérifications exhaustives avant tout arrêt
 */
export class StopDetector {
  private readonly NEXT_STEPS_PHRASES = [
    'prochaines étapes',
    'étapes suivantes',
    'next steps',
    'tâches restantes',
    'il reste',
    'il faudra',
    'actions à faire',
    'ensuite',
    'plus tard',
    'dans un second temps',
    'then',
    'later',
    'il reste à',
    'il faudra faire',
    'prochaine étape',
    'étape suivante',
    'restant',
    'reste à',
    'faudra',
    'sera nécessaire',
    'devra être',
    'à compléter',
    'à finaliser',
    'à terminer'
  ];

  /**
   * Détecte les mentions de "prochaines étapes" dans le texte
   */
  private detectNextStepsMentions(text: string): {
    detected: boolean;
    phrases: string[];
    context: string[];
  } {
    const textLower = text.toLowerCase();
    const detectedPhrases: string[] = [];
    const contextLines: string[] = [];

    for (const phrase of this.NEXT_STEPS_PHRASES) {
      if (textLower.includes(phrase.toLowerCase())) {
        detectedPhrases.push(phrase);
        
        // Extraire contexte (ligne contenant la phrase)
        const lines = text.split('\n');
        for (const line of lines) {
          if (line.toLowerCase().includes(phrase.toLowerCase())) {
            contextLines.push(line.trim());
          }
        }
      }
    }

    return {
      detected: detectedPhrases.length > 0,
      phrases: detectedPhrases,
      context: contextLines
    };
  }

  /**
   * Effectue toutes les vérifications avant arrêt
   */
  async checkBeforeStopping(
    options: StopDetectionOptions = {}
  ): Promise<StopCheckResult> {
    return withErrorHandling(
      async () => {
        const checks: CheckResult[] = [];
        let shouldStop = true;
        let forcedContinuation = false;
        let continuationReason = '';

        // 1. Vérifier todos
        const todosCheck = this.checkTodos(options.todos || []);
        checks.push(todosCheck);
        if (!todosCheck.passed) {
          shouldStop = false;
          forcedContinuation = true;
          continuationReason = `Todos incomplets: ${todosCheck.details?.incompleteCount || 0}`;
        }

        // 2. Vérifier mentions "prochaines étapes" dans la réponse
        if (options.responseText) {
          const nextStepsCheck = this.checkNextStepsMentions(options.responseText);
          checks.push(nextStepsCheck);
          if (nextStepsCheck.details?.detected) {
            shouldStop = false;
            forcedContinuation = true;
            const phrases = Array.isArray(nextStepsCheck.details?.phrases) 
            ? nextStepsCheck.details.phrases.join(', ') 
            : 'non spécifié';
          continuationReason = `Mentions "prochaines étapes" détectées: ${phrases}`;
          }
        }

        // 3. Vérifier erreurs TypeScript
        const errorsCheck = this.checkErrors(options.errors || []);
        checks.push(errorsCheck);
        if (!errorsCheck.passed) {
          shouldStop = false;
          forcedContinuation = true;
          continuationReason = `Erreurs non résolues: ${errorsCheck.details?.errorCount || 0}`;
        }

        // 4. Vérifier warnings
        const warningsCheck = this.checkWarnings(options.warnings || []);
        checks.push(warningsCheck);
        if (!warningsCheck.passed && warningsCheck.details?.criticalWarnings) {
          shouldStop = false;
          forcedContinuation = true;
          continuationReason = `Avertissements critiques: ${warningsCheck.details.criticalWarnings}`;
        }

        // 5. Vérifier tests qui échouent
        const testsCheck = this.checkTestFailures(options.testFailures || []);
        checks.push(testsCheck);
        if (!testsCheck.passed) {
          shouldStop = false;
          forcedContinuation = true;
          continuationReason = `Tests qui échouent: ${testsCheck.details?.failureCount || 0}`;
        }

        // 6. Vérifier fonctionnalités incomplètes
        const featuresCheck = this.checkIncompleteFeatures(options.incompleteFeatures || []);
        checks.push(featuresCheck);
        if (!featuresCheck.passed) {
          shouldStop = false;
          forcedContinuation = true;
          continuationReason = `Fonctionnalités incomplètes: ${featuresCheck.details?.incompleteCount || 0}`;
        }

        // 7. Vérifier tool calls (approche limite)
        const toolCallsCheck = this.checkToolCalls(options.toolCallCount || 0);
        checks.push(toolCallsCheck);
        if (!toolCallsCheck.passed && toolCallsCheck.details?.nearLimit) {
          // Créer checkpoint automatique
          const checkpointManager = getAgentCheckpointManager();
          await checkpointManager.createCheckpoint(
            options.toolCallCount || 0,
            options.todos || [],
            {
              completedTasks: [],
              pendingTasks: [],
              errors: options.errors || [],
              warnings: options.warnings || []
            },
            {
              severity: options.toolCallCount && options.toolCallCount >= 950 ? 'emergency' : 'critical',
              reason: 'Approche limite tool calls'
            }
          );
          shouldStop = false;
          forcedContinuation = true;
          continuationReason = `Checkpoint créé (tool calls: ${options.toolCallCount})`;
        }

        // 8. Vérifier checkpoints en attente
        const checkpointsCheck = await this.checkPendingCheckpoints();
        checks.push(checkpointsCheck);
        if (!checkpointsCheck.passed) {
          shouldStop = false;
          forcedContinuation = true;
          continuationReason = `Checkpoints en attente: ${checkpointsCheck.details?.pendingCount || 0}`;
        }

        // 9. Vérifier dépendances non satisfaites
        const dependenciesCheck = this.checkDependencies(options.todos || []);
        checks.push(dependenciesCheck);
        if (!dependenciesCheck.passed) {
          shouldStop = false;
          forcedContinuation = true;
          continuationReason = `Dépendances non satisfaites: ${dependenciesCheck.details?.unsatisfiedCount || 0}`;
        }

        // 10. Vérifier corrections en cours
        const correctionsCheck = this.checkCorrectionsInProgress(options.todos || []);
        checks.push(correctionsCheck);
        if (!correctionsCheck.passed) {
          shouldStop = false;
          forcedContinuation = true;
          continuationReason = `Corrections en cours: ${correctionsCheck.details?.inProgressCount || 0}`;
        }

        // 11. Vérifier validation complète
        const validationCheck = await this.checkValidation(options);
        checks.push(validationCheck);
        if (!validationCheck.passed) {
          shouldStop = false;
          forcedContinuation = true;
          continuationReason = `Validation incomplète: ${validationCheck.details?.issues || 'non spécifié'}`;
        }

        // 12. Vérifier tâches en attente
        const pendingTasksCheck = this.checkPendingTasks(options.todos || []);
        checks.push(pendingTasksCheck);
        if (!pendingTasksCheck.passed) {
          shouldStop = false;
          forcedContinuation = true;
          continuationReason = `Tâches en attente: ${pendingTasksCheck.details?.pendingCount || 0}`;
        }

        // 13. Vérifier problèmes non résolus
        const issuesCheck = this.checkUnresolvedIssues(options);
        checks.push(issuesCheck);
        if (!issuesCheck.passed) {
          shouldStop = false;
          forcedContinuation = true;
          continuationReason = `Problèmes non résolus: ${issuesCheck.details?.issueCount || 0}`;
        }

        // 14. Vérifier complétion complète
        const completionCheck = this.checkCompletion(options.todos || []);
        checks.push(completionCheck);
        if (!completionCheck.passed) {
          shouldStop = false;
          forcedContinuation = true;
          continuationReason = `Complétion incomplète: ${completionCheck.details?.completionRate || 0}%`;
        }

        // 15. Vérifier cohérence globale
        const coherenceCheck = this.checkCoherence(options);
        checks.push(coherenceCheck);
        if (!coherenceCheck.passed) {
          shouldStop = false;
          forcedContinuation = true;
          continuationReason = `Incohérences détectées: ${coherenceCheck.details?.issues || 'non spécifié'}`;
        }

        const reason = shouldStop
          ? 'Toutes les vérifications ont réussi'
          : `Continuation forcée: ${continuationReason}`;

        logger.info('Vérification avant arrêt terminée', {
          metadata: {
            service: 'StopDetector',
            operation: 'checkBeforeStopping',
            shouldStop,
            forcedContinuation,
            checksPassed: checks.filter(c => c.passed).length,
            checksTotal: checks.length,
            reason
          }
        });

        return {
          shouldStop,
          reason,
          checks,
          forcedContinuation,
          continuationReason: forcedContinuation ? continuationReason : undefined
        };
      },
      {
        operation: 'checkBeforeStopping',
        service: 'StopDetector',
        metadata: {}
      }
    );
  }

  /**
   * Vérifie l'état des todos
   */
  private checkTodos(todos: Todo[]): CheckResult {
    const incomplete = todos.filter(t => 
      t.status === 'in_progress' || t.status === 'pending'
    );

    return {
      name: 'todos',
      passed: incomplete.length === 0,
      details: incomplete.length > 0 ? {
        incompleteCount: incomplete.length,
        totalCount: todos.length,
        incompleteTodos: incomplete.map(t => ({
          id: t.id,
          content: t.content,
          status: t.status
        }))
      } : undefined
    };
  }

  /**
   * Vérifie les mentions de "prochaines étapes"
   */
  private checkNextStepsMentions(text: string): CheckResult {
    const detection = this.detectNextStepsMentions(text);

    return {
      name: 'next-steps-mentions',
      passed: !detection.detected,
      details: detection.detected ? {
        detected: true,
        phrases: detection.phrases,
        context: detection.context
      } : undefined
    };
  }

  /**
   * Vérifie les erreurs
   */
  private checkErrors(errors: string[]): CheckResult {
    return {
      name: 'errors',
      passed: errors.length === 0,
      details: errors.length > 0 ? {
        errorCount: errors.length,
        errors: errors.slice(0, 10) // Limiter à 10 pour éviter logs trop longs
      } : undefined
    };
  }

  /**
   * Vérifie les warnings
   */
  private checkWarnings(warnings: string[]): CheckResult {
    const criticalWarnings = warnings.filter(w => 
      w.toLowerCase().includes('error') || 
      w.toLowerCase().includes('critical') ||
      w.toLowerCase().includes('fatal')
    );

    return {
      name: 'warnings',
      passed: criticalWarnings.length === 0,
      details: criticalWarnings.length > 0 ? {
        criticalWarnings: criticalWarnings.length,
        totalWarnings: warnings.length,
        warnings: criticalWarnings.slice(0, 10)
      } : undefined
    };
  }

  /**
   * Vérifie les tests qui échouent
   */
  private checkTestFailures(testFailures: string[]): CheckResult {
    return {
      name: 'test-failures',
      passed: testFailures.length === 0,
      details: testFailures.length > 0 ? {
        failureCount: testFailures.length,
        failures: testFailures.slice(0, 10)
      } : undefined
    };
  }

  /**
   * Vérifie les fonctionnalités incomplètes
   */
  private checkIncompleteFeatures(incompleteFeatures: string[]): CheckResult {
    return {
      name: 'incomplete-features',
      passed: incompleteFeatures.length === 0,
      details: incompleteFeatures.length > 0 ? {
        incompleteCount: incompleteFeatures.length,
        features: incompleteFeatures.slice(0, 10)
      } : undefined
    };
  }

  /**
   * Vérifie le nombre de tool calls
   */
  private checkToolCalls(toolCallCount: number): CheckResult {
    const nearLimit = toolCallCount >= 900;
    const atLimit = toolCallCount >= 1000;

    return {
      name: 'tool-calls',
      passed: !nearLimit,
      details: nearLimit ? {
        toolCallCount,
        nearLimit,
        atLimit,
        remaining: 1000 - toolCallCount
      } : undefined
    };
  }

  /**
   * Vérifie les checkpoints en attente
   */
  private async checkPendingCheckpoints(): Promise<CheckResult> {
    try {
      const checkpointManager = getAgentCheckpointManager();
      const latestCheckpoint = await checkpointManager.findLatestCheckpoint();
      
      if (latestCheckpoint && latestCheckpoint.progress.completionRate < 1.0) {
        return {
          name: 'pending-checkpoints',
          passed: false,
          details: {
            pendingCount: 1,
            checkpointId: latestCheckpoint.id,
            completionRate: latestCheckpoint.progress.completionRate
          }
        };
      }

      return {
        name: 'pending-checkpoints',
        passed: true
      };
    } catch (error) {
      logger.warn('Erreur lors de la vérification des checkpoints', {
        metadata: {
          service: 'StopDetector',
          operation: 'checkPendingCheckpoints',
          error: error instanceof Error ? error.message : String(error)
        }
      });
      return {
        name: 'pending-checkpoints',
        passed: true // Passer si erreur pour éviter blocage
      };
    }
  }

  /**
   * Vérifie les dépendances non satisfaites
   */
  private checkDependencies(todos: Todo[]): CheckResult {
    const todosWithDeps = todos.filter(t => t.dependencies && t.dependencies.length > 0);
    const unsatisfied: Todo[] = [];

    for (const todo of todosWithDeps) {
      if (todo.dependencies) {
        const allDepsCompleted = todo.dependencies.every(depId => {
          const depTodo = todos.find(t => t.id === depId);
          return depTodo?.status === 'completed';
        });
        if (!allDepsCompleted && (todo.status === 'pending' || todo.status === 'in_progress')) {
          unsatisfied.push(todo);
        }
      }
    }

    return {
      name: 'dependencies',
      passed: unsatisfied.length === 0,
      details: unsatisfied.length > 0 ? {
        unsatisfiedCount: unsatisfied.length,
        todos: unsatisfied.map(t => ({
          id: t.id,
          content: t.content,
          dependencies: t.dependencies
        }))
      } : undefined
    };
  }

  /**
   * Vérifie les corrections en cours
   */
  private checkCorrectionsInProgress(todos: Todo[]): CheckResult {
    const corrections = todos.filter(t => 
      t.status === 'in_progress' && 
      (t.content.toLowerCase().includes('corriger') || 
       t.content.toLowerCase().includes('fix') ||
       t.content.toLowerCase().includes('réparer'))
    );

    return {
      name: 'corrections-in-progress',
      passed: corrections.length === 0,
      details: corrections.length > 0 ? {
        inProgressCount: corrections.length,
        corrections: corrections.map(t => ({
          id: t.id,
          content: t.content
        }))
      } : undefined
    };
  }

  /**
   * Vérifie la validation complète
   */
  private async checkValidation(options: StopDetectionOptions): Promise<CheckResult> {
    // Validation basique: pas d'erreurs, pas de todos incomplets
    const hasErrors = (options.errors || []).length > 0;
    const hasIncompleteTodos = (options.todos || []).some(t => 
      t.status === 'in_progress' || t.status === 'pending'
    );

    return {
      name: 'validation',
      passed: !hasErrors && !hasIncompleteTodos,
      details: hasErrors || hasIncompleteTodos ? {
        issues: hasErrors ? 'Erreurs présentes' : 'Todos incomplets'
      } : undefined
    };
  }

  /**
   * Vérifie les tâches en attente
   */
  private checkPendingTasks(todos: Todo[]): CheckResult {
    const pending = todos.filter(t => t.status === 'pending');

    return {
      name: 'pending-tasks',
      passed: pending.length === 0,
      details: pending.length > 0 ? {
        pendingCount: pending.length,
        tasks: pending.map(t => ({
          id: t.id,
          content: t.content
        }))
      } : undefined
    };
  }

  /**
   * Vérifie les problèmes non résolus
   */
  private checkUnresolvedIssues(options: StopDetectionOptions): CheckResult {
    const issues: string[] = [];
    
    if ((options.errors || []).length > 0) {
      issues.push(`${options.errors!.length} erreurs`);
    }
    if ((options.testFailures || []).length > 0) {
      issues.push(`${options.testFailures!.length} tests qui échouent`);
    }
    if ((options.incompleteFeatures || []).length > 0) {
      issues.push(`${options.incompleteFeatures!.length} fonctionnalités incomplètes`);
    }

    return {
      name: 'unresolved-issues',
      passed: issues.length === 0,
      details: issues.length > 0 ? {
        issueCount: issues.length,
        issues
      } : undefined
    };
  }

  /**
   * Vérifie la complétion complète
   */
  private checkCompletion(todos: Todo[]): CheckResult {
    if (todos.length === 0) {
      return {
        name: 'completion',
        passed: true
      };
    }

    const completed = todos.filter(t => t.status === 'completed').length;
    const completionRate = completed / todos.length;

    return {
      name: 'completion',
      passed: completionRate === 1.0,
      details: completionRate < 1.0 ? {
        completionRate,
        completed,
        total: todos.length,
        remaining: todos.length - completed
      } : undefined
    };
  }

  /**
   * Vérifie la cohérence globale
   */
  private checkCoherence(options: StopDetectionOptions): CheckResult {
    const issues: string[] = [];

    // Vérifier cohérence entre todos et erreurs
    const hasIncompleteTodos = (options.todos || []).some(t => 
      t.status === 'in_progress' || t.status === 'pending'
    );
    const hasErrors = (options.errors || []).length > 0;

    if (hasIncompleteTodos && !hasErrors) {
      // Pas d'erreurs mais todos incomplets - peut être normal
    } else if (hasErrors && !hasIncompleteTodos) {
      issues.push('Erreurs présentes mais tous les todos sont complétés');
    }

    return {
      name: 'coherence',
      passed: issues.length === 0,
      details: issues.length > 0 ? {
        issues
      } : undefined
    };
  }
}

// ========================================
// SINGLETON INSTANCE
// ========================================

let stopDetectorInstance: StopDetector | null = null;

export function getStopDetector(): StopDetector {
  if (!stopDetectorInstance) {
    stopDetectorInstance = new StopDetector();
  }
  return stopDetectorInstance;
}

