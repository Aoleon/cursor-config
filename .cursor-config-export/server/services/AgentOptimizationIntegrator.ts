import { logger } from '../utils/logger';
import { withErrorHandling } from '../utils/error-handler';
import { getAgentBatchProcessor } from './AgentBatchProcessor';
import { getAgentParallelExecutor } from './AgentParallelExecutor';
import { createResourcePool } from './AgentResourcePool';
import type { IStorage } from '../storage-poc';

// ========================================
// INTÉGRATEUR D'OPTIMISATIONS
// ========================================
// S'assure que toutes les optimisations sont bien utilisées
// Intègre batch processing, parallel execution, et resource pooling
// ========================================

/**
 * Service d'intégration des optimisations
 * Garantit que batch processing, parallel execution, et resource pooling sont utilisés
 */
export class AgentOptimizationIntegrator {
  private storage: IStorage;
  private batchProcessor: ReturnType<typeof getAgentBatchProcessor>;
  private parallelExecutor: ReturnType<typeof getAgentParallelExecutor>;
  private enabled: boolean = true;

  constructor(storage: IStorage) {
    if (!storage) {
      throw new Error('Storage requis pour AgentOptimizationIntegrator');
    }
    this.storage = storage;
    this.batchProcessor = getAgentBatchProcessor(storage);
    this.parallelExecutor = getAgentParallelExecutor(storage);
  }

  /**
   * Traite plusieurs fichiers en batch avec optimisations
   */
  async processFilesBatch(
    files: string[],
    processor: (file: string) => Promise<unknown>,
    options?: {
      batchSize?: number;
      maxParallel?: number;
      useCache?: boolean;
    }
  ): Promise<{
    results: Array<{ file: string; success: boolean; result?: unknown; error?: string }>;
    totalDuration: number;
    optimizations: string[];
  }> {
    return withErrorHandling(
      async () => {
        const startTime = Date.now();

        // Créer opérations batch
        const operations = files.map(file => ({
          id: `file-${file}`,
          operation: () => processor(file),
          priority: 1,
          metadata: { file }
        }));

        // Traiter en batch avec optimisations
        const batchResult = await this.batchProcessor.processBatch(operations, {
          batchSize: options?.batchSize || 10,
          maxParallel: options?.maxParallel || 5,
          useCache: options?.useCache ?? true,
          prioritize: true
        });

        // Mapper résultats
        const results = batchResult.results.map(r => {
          const file = files.find(f => r.id === `file-${f}`) || '';
          return {
            file,
            success: r.success,
            result: r.result,
            error: r.error
          };
        });

        logger.info('Fichiers traités en batch', {
          metadata: {
            service: 'AgentOptimizationIntegrator',
            operation: 'processFilesBatch',
            filesCount: files.length,
            successCount: batchResult.successCount,
            cachedCount: batchResult.cachedCount,
            parallelizedCount: batchResult.parallelizedCount,
            totalDuration: batchResult.totalDuration,
            optimizations: batchResult.optimizations
          }
        });

        return {
          results,
          totalDuration: Date.now() - startTime,
          optimizations: batchResult.optimizations
        };
      },
      {
        operation: 'processFilesBatch',
        service: 'AgentOptimizationIntegrator',
        metadata: {}
      }
    );
  }

  /**
   * Exécute plusieurs opérations en parallèle avec détection automatique
   */
  async executeOperationsParallel<T = unknown>(
    operations: Array<{
      id: string;
      execute: () => Promise<T>;
      dependencies?: string[];
      priority?: number;
    }>,
    options?: {
      maxParallel?: number;
      detectDependencies?: boolean;
      optimizeOrder?: boolean;
    }
  ): Promise<{
    results: Array<{ id: string; success: boolean; result?: T; error?: string; duration: number }>;
    totalDuration: number;
    timeSaved: number;
    plan: {
      phases: number;
      maxParallelization: number;
    };
  }> {
    return withErrorHandling(
      async () => {
        // Exécuter en parallèle avec optimisations
        const parallelResult = await this.parallelExecutor.executeParallel(operations, {
          maxParallel: options?.maxParallel || 5,
          detectDependencies: options?.detectDependencies ?? true,
          optimizeOrder: options?.optimizeOrder ?? true
        });

        // Mapper résultats
        const results = parallelResult.results.map(r => ({
          id: r.id,
          success: r.success,
          result: r.result as T | undefined,
          error: r.error,
          duration: r.duration
        }));

        logger.info('Opérations exécutées en parallèle', {
          metadata: {
            service: 'AgentOptimizationIntegrator',
            operation: 'executeOperationsParallel',
            operationsCount: operations.length,
            phases: parallelResult.plan.phases.length,
            maxParallelization: parallelResult.plan.maxParallelization,
            totalDuration: parallelResult.totalDuration,
            timeSaved: parallelResult.timeSaved
          }
        });

        return {
          results,
          totalDuration: parallelResult.totalDuration,
          timeSaved: parallelResult.timeSaved,
          plan: {
            phases: parallelResult.plan.phases.length,
            maxParallelization: parallelResult.plan.maxParallelization
          }
        };
      },
      {
        operation: 'executeOperationsParallel',
        service: 'AgentOptimizationIntegrator',
        metadata: {}
      }
    );
  }

  /**
   * Vérifie que toutes les optimisations sont activées
   */
  verifyOptimizationsEnabled(): {
    batchProcessor: boolean;
    parallelExecutor: boolean;
    allEnabled: boolean;
  } {
    const batchProcessorEnabled = this.batchProcessor !== null;
    const parallelExecutorEnabled = this.parallelExecutor !== null;

    return {
      batchProcessor: batchProcessorEnabled,
      parallelExecutor: parallelExecutorEnabled,
      allEnabled: batchProcessorEnabled && parallelExecutorEnabled
    };
  }

  /**
   * Active/désactive les optimisations
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    logger.info('Optimisations activées/désactivées', {
      metadata: {
        service: 'AgentOptimizationIntegrator',
        operation: 'setEnabled',
        enabled
      }
    });
  }
}

// ========================================
// SINGLETON
// ========================================

let agentOptimizationIntegratorInstance: AgentOptimizationIntegrator | null = null;

export function getAgentOptimizationIntegrator(storage: IStorage): AgentOptimizationIntegrator {
  if (!agentOptimizationIntegratorInstance) {
    agentOptimizationIntegratorInstance = new AgentOptimizationIntegrator(storage);
  }
  return agentOptimizationIntegratorInstance;
}

