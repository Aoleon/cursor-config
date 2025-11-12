import { logger } from '../utils/logger';
import { withErrorHandling } from '../utils/error-handler';
import { getAgentCursorHook } from './AgentCursorHook';
import { getAgentAutoOrchestrator } from './AgentAutoOrchestrator';
import { getAgentQualityWorkflow } from './AgentQualityWorkflow';
import { getAgentAutonomousWorkflow } from './AgentAutonomousWorkflow';
import { getAgentTaskAutomator } from './AgentTaskAutomator';
import { getAgentAutomationSuggester } from './AgentAutomationSuggester';
import { getAgentScriptRunner } from './AgentScriptRunner';
import { getAgentBatchProcessor } from './AgentBatchProcessor';
import { getAgentParallelExecutor } from './AgentParallelExecutor';
import type { IStorage } from '../storage-poc';

// ========================================
// TYPES ET INTERFACES
// ========================================

export interface TriggerContext {
  task?: string;
  type?: 'feature' | 'fix' | 'refactor' | 'ui' | 'architecture';
  userRequest?: string;
  files?: string[];
  complexity?: 'simple' | 'medium' | 'complex';
}

export interface TriggerResult {
  triggered: boolean;
  workflow?: string;
  success: boolean;
  duration: number;
  metadata?: Record<string, unknown>;
  result?: unknown;
}

// ========================================
// AGENT AUTO TRIGGER
// ========================================

/**
 * Service de déclenchement automatique des workflows
 * Détermine automatiquement quel workflow déclencher selon le contexte
 * Intègre les hooks et l'orchestration automatique
 */
export class AgentAutoTrigger {
  private storage: IStorage;
  private cursorHook: ReturnType<typeof getAgentCursorHook>;
  private autoOrchestrator: ReturnType<typeof getAgentAutoOrchestrator>;
  private qualityWorkflow: ReturnType<typeof getAgentQualityWorkflow>;
  private autonomousWorkflow: ReturnType<typeof getAgentAutonomousWorkflow>;
  private taskAutomator: ReturnType<typeof getAgentTaskAutomator>;
  private automationSuggester: ReturnType<typeof getAgentAutomationSuggester>;
  private scriptRunner: ReturnType<typeof getAgentScriptRunner>;
  private batchProcessor: ReturnType<typeof getAgentBatchProcessor>;
  private parallelExecutor: ReturnType<typeof getAgentParallelExecutor>;
  private enabled: boolean = true;

  constructor(storage: IStorage) {
    if (!storage) {
      throw new Error('Storage requis pour AgentAutoTrigger');
    }
    this.storage = storage;
    this.cursorHook = getAgentCursorHook(storage);
    this.autoOrchestrator = getAgentAutoOrchestrator(storage);
    this.qualityWorkflow = getAgentQualityWorkflow(storage);
    this.autonomousWorkflow = getAgentAutonomousWorkflow(storage);
    this.taskAutomator = getAgentTaskAutomator(storage);
    this.automationSuggester = getAgentAutomationSuggester(storage);
    this.scriptRunner = getAgentScriptRunner(storage);
    this.batchProcessor = getAgentBatchProcessor(storage);
    this.parallelExecutor = getAgentParallelExecutor(storage);
  }

  /**
   * Active/désactive les triggers automatiques
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    logger.info('Triggers automatiques activés/désactivés', {
      metadata: {
        service: 'AgentAutoTrigger',
        operation: 'setEnabled',
        enabled
      }
    });
  }

  /**
   * Déclenche automatiquement workflows selon contexte
   */
  async triggerWorkflows(
    context: TriggerContext
  ): Promise<TriggerResult[]> {
    if (!this.enabled) {
      return [];
    }

    return withErrorHandling(
      async () => {
        const results: TriggerResult[] = [];

        // 0. Analyser automatisation si tâche fournie
        if (context.task || context.userRequest) {
          const taskDescription = context.task || context.userRequest || '';
          try {
            // 0.1. Obtenir suggestions d'automatisation
            const suggestions = await this.automationSuggester.suggestAutomation({
              taskDescription,
              userRequest: taskDescription,
              files: context.files,
              operationType: context.type
            });

            // 0.2. Si suggestion haute confiance, utiliser script suggéré
            if (suggestions.length > 0 && suggestions[0].confidence >= 8 && suggestions[0].suggestedScript) {
              try {
                const scriptResult = await this.scriptRunner.runScript(suggestions[0].suggestedScript, {
                  cache: true,
                  retry: true
                });

                if (scriptResult.success) {
                  this.automationSuggester.recordSuggestionUsed(suggestions[0].suggestedScript);

                  results.push({
                    workflow: 'task-automation-suggestion',
                    triggered: true,
                    success: true,
                    result: {
                      approach: 'suggested-script',
                      script: suggestions[0].suggestedScript,
                      confidence: suggestions[0].confidence,
                      executionResult: scriptResult
                    },
                    duration: scriptResult.executionTime
                  });

                  logger.info('Tâche automatisée via suggestion', {
                    metadata: {
                      service: 'AgentAutoTrigger',
                      operation: 'triggerWorkflows',
                      script: suggestions[0].suggestedScript,
                      confidence: suggestions[0].confidence,
                      timeSaved: suggestions[0].estimatedTimeSaved
                    }
                  });

                  // Si automatisation réussie, ne pas déclencher autres workflows
                  return results;
                }
              } catch (error) {
                logger.debug('Erreur exécution script suggéré', {
                  metadata: {
                    service: 'AgentAutoTrigger',
                    operation: 'triggerWorkflows',
                    script: suggestions[0].suggestedScript,
                    error: error instanceof Error ? error.message : String(error)
                  }
                });
                // Continuer avec analyse normale si script échoue
              }
            }

            // 0.3. Analyse automatisation standard
            const automationAnalysis = await this.taskAutomator.analyzeTaskForAutomation(taskDescription);

            // Si automatisation forte recommandée, automatiser
            if (automationAnalysis.automationRecommendation === 'strong') {
              const automationResult = await this.taskAutomator.automateTask(taskDescription, {
                files: context.files
              });

              if (automationResult.success && automationResult.approach !== 'manual') {
                results.push({
                  workflow: 'task-automation',
                  triggered: true,
                  success: automationResult.success,
                  result: automationResult,
                  duration: automationResult.executionResult?.executionTime || 0
                });

                logger.info('Tâche automatisée automatiquement', {
                  metadata: {
                    service: 'AgentAutoTrigger',
                    operation: 'triggerWorkflows',
                    approach: automationResult.approach,
                    scriptPath: automationResult.scriptPath
                  }
                });

                // Si automatisation réussie, ne pas déclencher autres workflows
                if (automationResult.approach === 'script' || automationResult.approach === 'existing-script') {
                  return results;
                }
              }
            }
          } catch (error) {
            logger.debug('Erreur analyse automatisation', {
              metadata: {
                service: 'AgentAutoTrigger',
                operation: 'triggerWorkflows',
                error: error instanceof Error ? error.message : String(error)
              }
            });
          }
        }

        // 1. Déterminer complexité si non fournie
        const complexity = context.complexity || this.detectComplexity(context);

        // 2. Déclencher workflows en parallèle si possible
        const workflowOps: Array<{
          id: string;
          execute: () => Promise<TriggerResult>;
          priority: number;
        }> = [];

        // Workflow qualité pour modifications simples/moyennes
        if (context.files && context.files.length > 0 && complexity !== 'complex') {
          workflowOps.push({
            id: 'quality-workflow',
            execute: () => this.triggerQualityWorkflow(context),
            priority: 2
          });
        }

        // Workflow autonome pour tâches complexes
        if (complexity === 'complex' && context.task) {
          workflowOps.push({
            id: 'autonomous-workflow',
            execute: () => this.triggerAutonomousWorkflow(context),
            priority: 1
          });
        }

        // Analyse après modifications
        if (context.files && context.files.length > 0) {
          workflowOps.push({
            id: 'analysis',
            execute: () => this.triggerAnalysis(context),
            priority: 3
          });
        }

        // Exécuter workflows en parallèle si indépendants
        if (workflowOps.length > 0) {
          const parallelResults = await this.parallelExecutor.executeParallel(
            workflowOps.map(op => ({
              id: op.id,
              execute: op.execute,
              priority: op.priority,
              dependencies: undefined // Workflows indépendants
            })),
            {
              maxParallel: 5, // Limiter parallélisation
              detectDependencies: true, // Détecter dépendances automatiquement
              optimizeOrder: true // Optimiser ordre d'exécution
            }
          );

          // Mapper résultats avec toutes les métriques
          results.push(...parallelResults.results.map((r: { id: string; success: boolean; duration: number; result?: unknown }) => ({
            workflow: r.id,
            triggered: r.success,
            success: r.success,
            duration: r.duration,
            result: r.result,
            metadata: {
              parallelized: true,
              timeSaved: parallelResults.timeSaved,
              phases: parallelResults.plan.phases.length
            }
          })));

          logger.info('Workflows exécutés en parallèle', {
            metadata: {
              service: 'AgentAutoTrigger',
              operation: 'triggerWorkflows',
              workflowsCount: workflowOps.length,
              phases: parallelResults.plan.phases.length,
              maxParallelization: parallelResults.plan.maxParallelization,
              timeSaved: parallelResults.timeSaved
            }
          });
        }

        logger.info('Workflows automatiques déclenchés', {
          metadata: {
            service: 'AgentAutoTrigger',
            operation: 'triggerWorkflows',
            context,
            resultsCount: results.length,
            triggered: results.filter(r => r.triggered).length
          }
        });

        return results;
      },
      {
        operation: 'triggerWorkflows',
        service: 'AgentAutoTrigger',
        metadata: {}
      }
    );
  }

  /**
   * Déclenche workflow qualité
   */
  private async triggerQualityWorkflow(
    context: TriggerContext
  ): Promise<TriggerResult> {
    const startTime = Date.now();

    try {
      const result = await this.qualityWorkflow.executeFastWorkflow(
        context.task || 'Modification automatique',
        context.files || []
      );

      return {
        triggered: true,
        workflow: 'quality',
        success: result.passed,
        duration: Date.now() - startTime,
        metadata: {
          qualityScore: result.qualityScore,
          passed: result.passed
        }
      };
    } catch (error) {
      logger.debug('Erreur déclenchement workflow qualité', {
        metadata: {
          service: 'AgentAutoTrigger',
          operation: 'triggerQualityWorkflow',
          error: error instanceof Error ? error.message : String(error)
        }
      });
      return {
        triggered: false,
        workflow: 'quality',
        success: false,
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Déclenche workflow autonome
   */
  private async triggerAutonomousWorkflow(
    context: TriggerContext
  ): Promise<TriggerResult> {
    const startTime = Date.now();

    try {
      if (!context.task || !context.files) {
        return {
          triggered: false,
          workflow: 'autonomous',
          success: false,
          duration: Date.now() - startTime
        };
      }

      const result = await this.autonomousWorkflow.executeAutonomous({
        id: `auto-${Date.now()}`,
        type: context.type || 'feature',
        userRequest: context.userRequest || context.task,
        files: context.files
      });

      return {
        triggered: true,
        workflow: 'autonomous',
        success: result.canProceed,
        duration: Date.now() - startTime,
        metadata: {
          qualityScore: result.quality.score,
          alignmentScore: result.alignment.score,
          testsPassed: result.tests.passed
        }
      };
    } catch (error) {
      logger.debug('Erreur déclenchement workflow autonome', {
        metadata: {
          service: 'AgentAutoTrigger',
          operation: 'triggerAutonomousWorkflow',
          error: error instanceof Error ? error.message : String(error)
        }
      });
      return {
        triggered: false,
        workflow: 'autonomous',
        success: false,
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Déclenche analyse automatique
   */
  private async triggerAnalysis(
    context: TriggerContext
  ): Promise<TriggerResult> {
    const startTime = Date.now();

    try {
      const result = await this.autoOrchestrator.triggerAnalysisAfterModifications(
        context.files
      );

      return {
        triggered: Object.keys(result).length > 0,
        workflow: 'analysis',
        success: true,
        duration: Date.now() - startTime,
        metadata: {
          hasAnalysis: !!result.analysis,
          hasOptimizations: !!result.optimizations
        }
      };
    } catch (error) {
      logger.debug('Erreur déclenchement analyse automatique', {
        metadata: {
          service: 'AgentAutoTrigger',
          operation: 'triggerAnalysis',
          error: error instanceof Error ? error.message : String(error)
        }
      });
      return {
        triggered: false,
        workflow: 'analysis',
        success: false,
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Détecte complexité de la tâche
   */
  private detectComplexity(context: TriggerContext): 'simple' | 'medium' | 'complex' {
    // Critères de complexité
    const filesCount = context.files?.length || 0;
    const taskLength = context.task?.length || 0;
    const hasUserRequest = !!context.userRequest;

    if (filesCount > 5 || taskLength > 200 || context.type === 'architecture') {
      return 'complex';
    }
    if (filesCount > 2 || taskLength > 100 || hasUserRequest) {
      return 'medium';
    }
    return 'simple';
  }

  /**
   * Démarre orchestration automatique
   */
  async startAutoOrchestration(): Promise<void> {
    await this.autoOrchestrator.start();
    logger.info('Orchestration automatique démarrée', {
      metadata: {
        service: 'AgentAutoTrigger',
        operation: 'startAutoOrchestration'
      }
    });
  }

  /**
   * Arrête orchestration automatique
   */
  stopAutoOrchestration(): void {
    this.autoOrchestrator.stop();
    logger.info('Orchestration automatique arrêtée', {
      metadata: {
        service: 'AgentAutoTrigger',
        operation: 'stopAutoOrchestration'
      }
    });
  }
}

// ========================================
// SINGLETON INSTANCE
// ========================================

let agentAutoTriggerInstance: AgentAutoTrigger | null = null;

export function getAgentAutoTrigger(storage: IStorage): AgentAutoTrigger {
  if (!agentAutoTriggerInstance) {
    agentAutoTriggerInstance = new AgentAutoTrigger(storage);
  }
  return agentAutoTriggerInstance;
}

