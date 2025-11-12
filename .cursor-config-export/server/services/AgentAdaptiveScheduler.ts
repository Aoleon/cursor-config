import { logger } from '../utils/logger';
import { withErrorHandling } from '../utils/error-handler';
import { getAgentPerformanceMetricsService } from './AgentPerformanceMetricsService';
import { getAgentAutoOptimizer } from './AgentAutoOptimizer';
import { getAgentPerformanceMonitor } from './AgentPerformanceMonitor';
import type { IStorage } from '../storage-poc';

// ========================================
// TYPES ET INTERFACES
// ========================================

export interface ScheduledTask {
  id: string;
  type: 'optimization' | 'monitoring' | 'cleanup' | 'analysis';
  priority: 'low' | 'medium' | 'high' | 'critical';
  execute: () => Promise<unknown>;
  scheduledFor: Date;
  estimatedDuration: number;
  dependencies?: string[];
  retryCount?: number;
  maxRetries?: number;
}

export interface SchedulePlan {
  tasks: ScheduledTask[];
  estimatedTotalDuration: number;
  canParallelize: boolean;
  executionOrder: string[]; // IDs dans ordre d'exécution
}

// ========================================
// AGENT ADAPTIVE SCHEDULER
// ========================================

/**
 * Service de planification adaptative pour l'agent
 * Planifie et optimise l'exécution de tâches selon les performances actuelles
 */
export class AgentAdaptiveScheduler {
  private storage: IStorage;
  private metricsService: ReturnType<typeof getAgentPerformanceMetricsService>;
  private autoOptimizer: ReturnType<typeof getAgentAutoOptimizer>;
  private performanceMonitor: ReturnType<typeof getAgentPerformanceMonitor>;

  private taskQueue: ScheduledTask[] = [];
  private executingTasks: Set<string> = new Set();
  private readonly MAX_CONCURRENT_TASKS = 3;

  constructor(storage: IStorage) {
    if (!storage) {
      throw new Error('Storage requis pour AgentAdaptiveScheduler');
    }
    this.storage = storage;
    this.metricsService = getAgentPerformanceMetricsService(storage);
    this.autoOptimizer = getAgentAutoOptimizer(storage);
    this.performanceMonitor = getAgentPerformanceMonitor(storage);
  }

  /**
   * Planifie une tâche avec optimisation adaptative
   */
  async scheduleTask(task: ScheduledTask): Promise<void> {
    return withErrorHandling(
      async () => {
        // Vérifier si tâche peut être exécutée immédiatement
        const now = new Date();
        if (task.scheduledFor <= now && this.executingTasks.size < this.MAX_CONCURRENT_TASKS) {
          // Exécuter immédiatement
          await this.executeTask(task);
        } else {
          // Ajouter à la queue
          this.taskQueue.push(task);
          this.taskQueue.sort((a, b) => {
            const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
            const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
            if (priorityDiff !== 0) return priorityDiff;
            return a.scheduledFor.getTime() - b.scheduledFor.getTime();
          });

          logger.info('Tâche planifiée', {
            metadata: {
              service: 'AgentAdaptiveScheduler',
              operation: 'scheduleTask',
              taskId: task.id,
              taskType: task.type,
              priority: task.priority,
              scheduledFor: task.scheduledFor.toISOString()
            }
          });
        }
      },
      {
        operation: 'scheduleTask',
        service: 'AgentAdaptiveScheduler',
        metadata: {}
      }
    );
  }

  /**
   * Planifie plusieurs tâches avec optimisation
   */
  async scheduleTasks(tasks: ScheduledTask[]): Promise<SchedulePlan> {
    return withErrorHandling(
      async () => {
        // Analyser dépendances et optimiser ordre
        const plan = this.optimizeSchedule(tasks);

        // Planifier chaque tâche
        for (const taskId of plan.executionOrder) {
          const task = tasks.find(t => t.id === taskId);
          if (task) {
            await this.scheduleTask(task);
          }
        }

        return plan;
      },
      {
        operation: 'scheduleTasks',
        service: 'AgentAdaptiveScheduler',
        metadata: {}
      }
    );
  }

  /**
   * Optimise l'ordre d'exécution des tâches
   */
  private optimizeSchedule(tasks: ScheduledTask[]): SchedulePlan {
    // 1. Grouper par dépendances
    const independentTasks: ScheduledTask[] = [];
    const dependentTasks: ScheduledTask[] = [];

    for (const task of tasks) {
      if (!task.dependencies || task.dependencies.length === 0) {
        independentTasks.push(task);
      } else {
        dependentTasks.push(task);
      }
    }

    // 2. Trier indépendantes par priorité et durée estimée
    independentTasks.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.estimatedDuration - b.estimatedDuration; // Plus courtes en premier
    });

    // 3. Construire ordre d'exécution
    const executionOrder: string[] = [];
    const executed = new Set<string>();

    // Exécuter indépendantes
    for (const task of independentTasks) {
      executionOrder.push(task.id);
      executed.add(task.id);
    }

    // Exécuter dépendantes (après leurs dépendances)
    let remaining = dependentTasks.filter(t => !executed.has(t.id));
    while (remaining.length > 0) {
      const ready = remaining.filter(t => 
        !t.dependencies || t.dependencies.every(dep => executed.has(dep))
      );

      if (ready.length === 0) {
        // Dépendances circulaires ou manquantes - exécuter quand même
        for (const task of remaining) {
          executionOrder.push(task.id);
          executed.add(task.id);
        }
        break;
      }

      ready.sort((a, b) => {
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });

      for (const task of ready) {
        executionOrder.push(task.id);
        executed.add(task.id);
      }

      remaining = remaining.filter(t => !executed.has(t.id));
    }

    const estimatedTotalDuration = tasks.reduce((sum, t) => sum + t.estimatedDuration, 0);
    const canParallelize = independentTasks.length > 1;

    return {
      tasks,
      estimatedTotalDuration,
      canParallelize,
      executionOrder
    };
  }

  /**
   * Exécute une tâche
   */
  private async executeTask(task: ScheduledTask): Promise<void> {
    this.executingTasks.add(task.id);
    const startTime = Date.now();

    try {
      await task.execute();

      logger.info('Tâche exécutée avec succès', {
        metadata: {
          service: 'AgentAdaptiveScheduler',
          operation: 'executeTask',
          taskId: task.id,
          taskType: task.type,
          duration: Date.now() - startTime
        }
      });
    } catch (error) {
      logger.error('Erreur exécution tâche', {
        metadata: {
          service: 'AgentAdaptiveScheduler',
          operation: 'executeTask',
          taskId: task.id,
          taskType: task.type,
          error: error instanceof Error ? error.message : String(error),
          retryCount: task.retryCount || 0
        }
      });

      // Retry si possible
      const retryCount = (task.retryCount || 0) + 1;
      const maxRetries = task.maxRetries || 3;

      if (retryCount < maxRetries) {
        task.retryCount = retryCount;
        task.scheduledFor = new Date(Date.now() + Math.pow(2, retryCount) * 1000); // Exponential backoff
        this.taskQueue.push(task);

        logger.info('Tâche replanifiée pour retry', {
          metadata: {
            service: 'AgentAdaptiveScheduler',
            operation: 'executeTask',
            taskId: task.id,
            retryCount,
            nextExecution: task.scheduledFor.toISOString()
          }
        });
      }
    } finally {
      this.executingTasks.delete(task.id);
    }
  }

  /**
   * Traite la queue de tâches
   */
  async processQueue(): Promise<{
    executed: number;
    failed: number;
    remaining: number;
  }> {
    return withErrorHandling(
      async () => {
        const now = new Date();
        const readyTasks = this.taskQueue.filter(
          t => t.scheduledFor <= now && this.executingTasks.size < this.MAX_CONCURRENT_TASKS
        );

        let executed = 0;
        let failed = 0;

        // Exécuter tâches prêtes (en parallèle si possible)
        const executionPromises = readyTasks.slice(0, this.MAX_CONCURRENT_TASKS - this.executingTasks.size)
          .map(async (task) => {
            this.taskQueue = this.taskQueue.filter(t => t.id !== task.id);
            try {
              await this.executeTask(task);
              executed++;
            } catch (error) {
              failed++;
            }
          });

        await Promise.allSettled(executionPromises);

        return {
          executed,
          failed,
          remaining: this.taskQueue.length
        };
      },
      {
        operation: 'processQueue',
        service: 'AgentAdaptiveScheduler',
        metadata: {}
      }
    );
  }

  /**
   * Planifie des tâches périodiques automatiques
   */
  async schedulePeriodicTasks(): Promise<void> {
    return withErrorHandling(
      async () => {
        const now = Date.now();

        // 1. Monitoring périodique (toutes les 5 minutes)
        await this.scheduleTask({
          id: `monitoring-${now}`,
          type: 'monitoring',
          priority: 'medium',
          execute: async () => {
            await this.performanceMonitor.runPeriodicMonitoring();
          },
          scheduledFor: new Date(now + 5 * 60 * 1000),
          estimatedDuration: 2000
        });

        // 2. Auto-optimisation (toutes les 10 minutes)
        await this.scheduleTask({
          id: `optimization-${now}`,
          type: 'optimization',
          priority: 'high',
          execute: async () => {
            await this.autoOptimizer.runPeriodicOptimization();
          },
          scheduledFor: new Date(now + 10 * 60 * 1000),
          estimatedDuration: 5000
        });

        // 3. Analyse patterns (toutes les 30 minutes)
        await this.scheduleTask({
          id: `analysis-${now}`,
          type: 'analysis',
          priority: 'low',
          execute: async () => {
            try {
              // Utiliser AgentPerformanceMetricsService pour analyse patterns
              const analysis = await this.metricsService.analyzeToolCallPatterns();
              logger.info('Analyse patterns terminée', {
                metadata: {
                  service: 'AgentAdaptiveScheduler',
                  operation: 'schedulePeriodicTasks',
                  patternsCount: analysis.patterns.length,
                  sequencesCount: analysis.sequences.length,
                  recommendationsCount: analysis.recommendations.length
                }
              });
            } catch (error) {
              logger.debug('Erreur analyse patterns', {
                metadata: {
                  service: 'AgentAdaptiveScheduler',
                  operation: 'schedulePeriodicTasks',
                  error: error instanceof Error ? error.message : String(error)
                }
              });
            }
          },
          scheduledFor: new Date(now + 30 * 60 * 1000),
          estimatedDuration: 10000
        });

        logger.info('Tâches périodiques planifiées', {
          metadata: {
            service: 'AgentAdaptiveScheduler',
            operation: 'schedulePeriodicTasks',
            tasksScheduled: 3
          }
        });
      },
      {
        operation: 'schedulePeriodicTasks',
        service: 'AgentAdaptiveScheduler',
        metadata: {}
      }
    );
  }

  /**
   * Récupère l'état de la queue
   */
  getQueueStatus(): {
    total: number;
    executing: number;
    pending: number;
    byPriority: Record<string, number>;
  } {
    const byPriority: Record<string, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    };

    for (const task of this.taskQueue) {
      byPriority[task.priority]++;
    }

    return {
      total: this.taskQueue.length,
      executing: this.executingTasks.size,
      pending: this.taskQueue.length,
      byPriority
    };
  }
}

// ========================================
// SINGLETON INSTANCE
// ========================================

let agentAdaptiveSchedulerInstance: AgentAdaptiveScheduler | null = null;

export function getAgentAdaptiveScheduler(storage: IStorage): AgentAdaptiveScheduler {
  if (!agentAdaptiveSchedulerInstance) {
    agentAdaptiveSchedulerInstance = new AgentAdaptiveScheduler(storage);
  }
  return agentAdaptiveSchedulerInstance;
}

