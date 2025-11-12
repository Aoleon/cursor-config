import { logger } from '../utils/logger';
import { withErrorHandling } from '../utils/error-handler';
import { getAgentWorkflowOptimizer } from './AgentWorkflowOptimizer';
import { getAgentWorkflowAuditor } from './AgentWorkflowAuditor';
import { getAgentPerformanceOptimizer } from './AgentPerformanceOptimizer';
import type { IStorage } from '../storage-poc';

// ========================================
// TYPES ET INTERFACES
// ========================================

export interface WorkflowStepDefinition {
  id: string;
  name: string;
  executor: () => Promise<unknown>;
  dependencies?: string[];
  cacheable?: boolean;
  parallelizable?: boolean;
  skippable?: boolean;
  critical?: boolean;
  timeout?: number; // ms
}

export interface WorkflowDefinition {
  name: string;
  steps: WorkflowStepDefinition[];
  options?: {
    stopOnError?: boolean;
    retryOnError?: boolean;
    maxRetries?: number;
    timeout?: number;
  };
}

export interface WorkflowExecutionResult {
  workflowName: string;
  success: boolean;
  steps: Array<{
    id: string;
    name: string;
    success: boolean;
    result?: unknown;
    error?: string;
    duration: number;
    cached: boolean;
    parallelized: boolean;
  }>;
  totalDuration: number;
  qualityScore?: number;
  performanceScore?: number;
}

// ========================================
// AGENT WORKFLOW EXECUTOR
// ========================================

/**
 * Service d'exécution optimisée des workflows
 * Exécute workflows avec optimisations automatiques
 * Cache, parallélisation, gestion erreurs, retry
 */
export class AgentWorkflowExecutor {
  private storage: IStorage;
  private workflowOptimizer: ReturnType<typeof getAgentWorkflowOptimizer>;
  private workflowAuditor: ReturnType<typeof getAgentWorkflowAuditor>;
  private performanceOptimizer: ReturnType<typeof getAgentPerformanceOptimizer>;

  constructor(storage: IStorage) {
    if (!storage) {
      throw new Error('Storage requis pour AgentWorkflowExecutor');
    }
    this.storage = storage;
    this.workflowOptimizer = getAgentWorkflowOptimizer(storage);
    this.workflowAuditor = getAgentWorkflowAuditor(storage);
    this.performanceOptimizer = getAgentPerformanceOptimizer(storage);
  }

  /**
   * Exécute workflow avec optimisations
   */
  async executeWorkflow(
    workflow: WorkflowDefinition
  ): Promise<WorkflowExecutionResult> {
    return withErrorHandling(
      async () => {
        const startTime = Date.now();
        const options = workflow.options || {
          stopOnError: true,
          retryOnError: false,
          maxRetries: 0,
          timeout: 60000
        };

        // 1. Créer workflow optimisé
        const optimized = await this.workflowOptimizer.createOptimizedWorkflow(
          workflow.name,
          workflow.steps.map(s => ({
            id: s.id,
            name: s.name,
            executor: s.executor,
            dependencies: s.dependencies
          }))
        );

        // 2. Exécuter steps avec optimisations
        const stepResults: WorkflowExecutionResult['steps'] = [];
        const independentSteps = optimized.steps.filter(s => 
          !s.dependencies || s.dependencies.length === 0
        );
        const dependentSteps = optimized.steps.filter(s => 
          s.dependencies && s.dependencies.length > 0
        );

        // Exécuter steps indépendants en parallèle
        if (independentSteps.length > 0) {
          const parallelResults = await Promise.allSettled(
            independentSteps.map(async (step) => {
              const stepDef = workflow.steps.find(s => s.id === step.id);
              const stepStart = Date.now();

              try {
                const optimized = await this.performanceOptimizer.optimizeOperation(
                  step.name,
                  step.executor,
                  {
                    useCache: step.cacheable ?? stepDef?.cacheable ?? true,
                    parallelize: step.parallelizable ?? stepDef?.parallelizable ?? true
                  }
                );

                return {
                  id: step.id,
                  name: step.name,
                  success: true,
                  result: optimized.result,
                  duration: Date.now() - stepStart,
                  cached: optimized.metrics.cacheHit,
                  parallelized: optimized.metrics.parallelized
                };
              } catch (error) {
                if (options.stopOnError && stepDef?.critical !== false) {
                  throw error;
                }
                return {
                  id: step.id,
                  name: step.name,
                  success: false,
                  error: error instanceof Error ? error.message : String(error),
                  duration: Date.now() - stepStart,
                  cached: false,
                  parallelized: false
                };
              }
            })
          );

          for (const result of parallelResults) {
            if (result.status === 'fulfilled') {
              stepResults.push(result.value);
            } else {
              // Gérer erreur
              stepResults.push({
                id: 'unknown',
                name: 'unknown',
                success: false,
                error: result.reason instanceof Error ? result.reason.message : String(result.reason),
                duration: 0,
                cached: false,
                parallelized: false
              });
            }
          }
        }

        // Exécuter steps dépendants séquentiellement
        for (const step of dependentSteps) {
          const stepDef = workflow.steps.find(s => s.id === step.id);
          const stepStart = Date.now();

          try {
            // Vérifier dépendances satisfaites
            const dependenciesSatisfied = step.dependencies?.every(depId =>
              stepResults.find(r => r.id === depId && r.success) !== undefined
            ) ?? true;

            if (!dependenciesSatisfied && stepDef?.critical !== false) {
              throw new Error(`Dépendances non satisfaites pour ${step.name}`);
            }

            const optimized = await this.performanceOptimizer.optimizeOperation(
              step.name,
              step.executor,
              {
                useCache: step.cacheable ?? stepDef?.cacheable ?? true,
                parallelize: false // Pas de parallélisation si dépendances
              }
            );

            stepResults.push({
              id: step.id,
              name: step.name,
              success: true,
              result: optimized.result,
              duration: Date.now() - stepStart,
              cached: optimized.metrics.cacheHit,
              parallelized: false
            });
          } catch (error) {
            if (options.stopOnError && stepDef?.critical !== false) {
              throw error;
            }
            stepResults.push({
              id: step.id,
              name: step.name,
              success: false,
              error: error instanceof Error ? error.message : String(error),
              duration: Date.now() - stepStart,
              cached: false,
              parallelized: false
            });
          }
        }

        const totalDuration = Date.now() - startTime;
        const success = stepResults.every(r => r.success || !workflow.steps.find(s => s.id === r.id)?.critical);

        // Enregistrer exécution pour audit
        this.workflowAuditor.recordExecution({
          id: `exec-${Date.now()}`,
          workflowName: workflow.name,
          startTime,
          endTime: Date.now(),
          duration: totalDuration,
          steps: stepResults.map(r => ({
            id: r.id,
            name: r.name,
            type: 'other',
            duration: r.duration,
            success: r.success,
            cacheHit: r.cached,
            parallelized: r.parallelized,
            error: r.error
          })),
          success,
          bottlenecks: []
        });

        logger.info('Workflow exécuté', {
          metadata: {
            service: 'AgentWorkflowExecutor',
            operation: 'executeWorkflow',
            workflowName: workflow.name,
            stepsCount: stepResults.length,
            success,
            totalDuration
          }
        });

        return {
          workflowName: workflow.name,
          success,
          steps: stepResults,
          totalDuration
        };
      },
      {
        operation: 'executeWorkflow',
        service: 'AgentWorkflowExecutor',
        metadata: {}
      }
    );
  }

  /**
   * Exécute workflow avec retry automatique
   */
  async executeWorkflowWithRetry(
    workflow: WorkflowDefinition,
    maxRetries: number = 3
  ): Promise<WorkflowExecutionResult> {
    return withErrorHandling(
      async () => {
        let lastResult: WorkflowExecutionResult | null = null;
        let attempt = 0;

        while (attempt < maxRetries) {
          attempt++;
          try {
            const result = await this.executeWorkflow(workflow);
            if (result.success) {
              return result;
            }
            lastResult = result;
          } catch (error) {
            logger.debug('Erreur exécution workflow, retry', {
              metadata: {
                service: 'AgentWorkflowExecutor',
                operation: 'executeWorkflowWithRetry',
                workflowName: workflow.name,
                attempt,
                maxRetries,
                error: error instanceof Error ? error.message : String(error)
              }
            });
          }

          // Attendre avant retry
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          }
        }

        return lastResult || {
          workflowName: workflow.name,
          success: false,
          steps: [],
          totalDuration: 0
        };
      },
      {
        operation: 'executeWorkflowWithRetry',
        service: 'AgentWorkflowExecutor',
        metadata: {}
      }
    );
  }
}

// ========================================
// SINGLETON INSTANCE
// ========================================

let agentWorkflowExecutorInstance: AgentWorkflowExecutor | null = null;

export function getAgentWorkflowExecutor(storage: IStorage): AgentWorkflowExecutor {
  if (!agentWorkflowExecutorInstance) {
    agentWorkflowExecutorInstance = new AgentWorkflowExecutor(storage);
  }
  return agentWorkflowExecutorInstance;
}

