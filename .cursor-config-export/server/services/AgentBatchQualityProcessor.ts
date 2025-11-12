import { logger } from '../utils/logger';
import { withErrorHandling } from '../utils/error-handler';
import { getAgentQualityAnalyzerEnhanced } from './AgentQualityAnalyzerEnhanced';
import { getAgentFastAutoCorrector } from './AgentFastAutoCorrector';
import { getAgentPerformanceOptimizer } from './AgentPerformanceOptimizer';
import type { IStorage } from '../storage-poc';

// ========================================
// TYPES ET INTERFACES
// ========================================

export interface BatchQualityTask {
  id: string;
  files: string[];
  priority: 'low' | 'medium' | 'high';
  context?: string;
}

export interface BatchQualityResult {
  taskId: string;
  qualityScore: number;
  passed: boolean;
  issues: number;
  corrections: number;
  duration: number; // ms
}

export interface BatchProcessingResult {
  tasks: BatchQualityResult[];
  totalDuration: number;
  avgDuration: number;
  totalIssues: number;
  totalCorrections: number;
  successRate: number;
  avgQualityScore: number;
}

// ========================================
// AGENT BATCH QUALITY PROCESSOR
// ========================================

/**
 * Service de traitement par lots optimisé pour qualité
 * Traite plusieurs fichiers en parallèle avec optimisation
 * Améliore efficacité et performance
 */
export class AgentBatchQualityProcessor {
  private storage: IStorage;
  private qualityAnalyzer: ReturnType<typeof getAgentQualityAnalyzerEnhanced>;
  private fastCorrector: ReturnType<typeof getAgentFastAutoCorrector>;
  private performanceOptimizer: ReturnType<typeof getAgentPerformanceOptimizer>;
  private readonly MAX_PARALLEL_TASKS = 5;
  private readonly BATCH_TIMEOUT_MS = 30000; // 30 secondes

  constructor(storage: IStorage) {
    if (!storage) {
      throw new Error('Storage requis pour AgentBatchQualityProcessor');
    }
    this.storage = storage;
    this.qualityAnalyzer = getAgentQualityAnalyzerEnhanced(storage);
    this.fastCorrector = getAgentFastAutoCorrector(storage);
    this.performanceOptimizer = getAgentPerformanceOptimizer(storage);
  }

  /**
   * Traite batch de tâches qualité
   */
  async processBatch(
    tasks: BatchQualityTask[]
  ): Promise<BatchProcessingResult> {
    return withErrorHandling(
      async () => {
        const startTime = Date.now();
        const results: BatchQualityResult[] = [];

        // Trier par priorité
        const sortedTasks = tasks.sort((a, b) => {
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        });

        // Traiter par groupes parallèles
        for (let i = 0; i < sortedTasks.length; i += this.MAX_PARALLEL_TASKS) {
          const batch = sortedTasks.slice(i, i + this.MAX_PARALLEL_TASKS);
          
          const batchResults = await Promise.all(
            batch.map(task => this.processTask(task))
          );

          results.push(...batchResults);
        }

        // Calculer statistiques
        const totalDuration = Date.now() - startTime;
        const avgDuration = results.length > 0
          ? results.reduce((sum, r) => sum + r.duration, 0) / results.length
          : 0;
        const totalIssues = results.reduce((sum, r) => sum + r.issues, 0);
        const totalCorrections = results.reduce((sum, r) => sum + r.corrections, 0);
        const successCount = results.filter(r => r.passed).length;
        const successRate = results.length > 0 ? successCount / results.length : 0;
        const avgQualityScore = results.length > 0
          ? results.reduce((sum, r) => sum + r.qualityScore, 0) / results.length
          : 0;

        logger.info('Batch qualité traité', {
          metadata: {
            service: 'AgentBatchQualityProcessor',
            operation: 'processBatch',
            tasksCount: tasks.length,
            totalDuration,
            avgDuration,
            successRate,
            avgQualityScore
          }
        });

        return {
          tasks: results,
          totalDuration,
          avgDuration,
          totalIssues,
          totalCorrections,
          successRate,
          avgQualityScore
        };
      },
      {
        operation: 'processBatch',
        service: 'AgentBatchQualityProcessor',
        metadata: {}
      }
    );
  }

  /**
   * Traite une tâche qualité
   */
  private async processTask(
    task: BatchQualityTask
  ): Promise<BatchQualityResult> {
    const startTime = Date.now();

    try {
      // 1. Analyse rapide
      const fastAnalysis = await this.performanceOptimizer.optimizeOperation(
        `analyze-${task.id}`,
        () => this.qualityAnalyzer.analyzeFast(task.files),
        {
          useCache: true,
          parallelize: true
        }
      );

      const qualityScore = fastAnalysis.result.score;
      const passed = fastAnalysis.result.passed;
      const issues = fastAnalysis.result.criticalIssues;

      // 2. Correction si nécessaire
      let corrections = 0;
      if (!passed || qualityScore < 85) {
        const correction = await this.performanceOptimizer.optimizeOperation(
          `correct-${task.id}`,
          () => this.fastCorrector.correctFast(task.files),
          {
            useCache: false,
            parallelize: false
          }
        );
        corrections = correction.result.applied;
      }

      const duration = Date.now() - startTime;

      return {
        taskId: task.id,
        qualityScore,
        passed,
        issues,
        corrections,
        duration
      };
    } catch (error) {
      logger.error('Erreur traitement tâche batch', {
        metadata: {
          service: 'AgentBatchQualityProcessor',
          operation: 'processTask',
          taskId: task.id,
          error: error instanceof Error ? error.message : String(error)
        }
      });

      return {
        taskId: task.id,
        qualityScore: 0,
        passed: false,
        issues: 0,
        corrections: 0,
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Traite batch avec correction automatique
   */
  async processBatchWithCorrection(
    tasks: BatchQualityTask[],
    minQuality: number = 85
  ): Promise<BatchProcessingResult> {
    return withErrorHandling(
      async () => {
        const startTime = Date.now();
        const results: BatchQualityResult[] = [];

        // Trier par priorité
        const sortedTasks = tasks.sort((a, b) => {
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        });

        // Traiter avec correction itérative
        for (const task of sortedTasks) {
          let iteration = 0;
          let result: BatchQualityResult;

          do {
            iteration++;
            result = await this.processTask(task);

            // Corriger si qualité insuffisante
            if (!result.passed || result.qualityScore < minQuality) {
              if (iteration < 3) {
                await this.fastCorrector.correctFast(task.files);
              }
            }
          } while ((!result.passed || result.qualityScore < minQuality) && iteration < 3);

          results.push(result);
        }

        // Calculer statistiques
        const totalDuration = Date.now() - startTime;
        const avgDuration = results.length > 0
          ? results.reduce((sum, r) => sum + r.duration, 0) / results.length
          : 0;
        const totalIssues = results.reduce((sum, r) => sum + r.issues, 0);
        const totalCorrections = results.reduce((sum, r) => sum + r.corrections, 0);
        const successCount = results.filter(r => r.passed).length;
        const successRate = results.length > 0 ? successCount / results.length : 0;
        const avgQualityScore = results.length > 0
          ? results.reduce((sum, r) => sum + r.qualityScore, 0) / results.length
          : 0;

        return {
          tasks: results,
          totalDuration,
          avgDuration,
          totalIssues,
          totalCorrections,
          successRate,
          avgQualityScore
        };
      },
      {
        operation: 'processBatchWithCorrection',
        service: 'AgentBatchQualityProcessor',
        metadata: {}
      }
    );
  }

  /**
   * Traite batch optimisé (mode rapide)
   */
  async processBatchFast(
    tasks: BatchQualityTask[]
  ): Promise<BatchProcessingResult> {
    return withErrorHandling(
      async () => {
        const startTime = Date.now();

        // Traiter toutes les tâches en parallèle avec optimisation
        const optimized = await this.performanceOptimizer.optimizeBatch(
          tasks.map(task => ({
            name: `quality-${task.id}`,
            executor: async () => {
              const analysis = await this.qualityAnalyzer.analyzeFast(task.files);
              return {
                taskId: task.id,
                qualityScore: analysis.score,
                passed: analysis.passed,
                issues: analysis.criticalIssues,
                corrections: 0,
                duration: 0
              };
            },
            cacheKey: `quality-${task.id}`
          }))
        );

        const results: BatchQualityResult[] = optimized.results.map(r => r.result as BatchQualityResult);

        // Calculer statistiques
        const totalDuration = Date.now() - startTime;
        const avgDuration = optimized.avgDuration;
        const totalIssues = results.reduce((sum, r) => sum + r.issues, 0);
        const totalCorrections = results.reduce((sum, r) => sum + r.corrections, 0);
        const successCount = results.filter(r => r.passed).length;
        const successRate = results.length > 0 ? successCount / results.length : 0;
        const avgQualityScore = results.length > 0
          ? results.reduce((sum, r) => sum + r.qualityScore, 0) / results.length
          : 0;

        return {
          tasks: results,
          totalDuration,
          avgDuration,
          totalIssues,
          totalCorrections,
          successRate,
          avgQualityScore
        };
      },
      {
        operation: 'processBatchFast',
        service: 'AgentBatchQualityProcessor',
        metadata: {}
      }
    );
  }
}

// ========================================
// SINGLETON INSTANCE
// ========================================

let agentBatchQualityProcessorInstance: AgentBatchQualityProcessor | null = null;

export function getAgentBatchQualityProcessor(storage: IStorage): AgentBatchQualityProcessor {
  if (!agentBatchQualityProcessorInstance) {
    agentBatchQualityProcessorInstance = new AgentBatchQualityProcessor(storage);
  }
  return agentBatchQualityProcessorInstance;
}

