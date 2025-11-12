import { logger } from '../utils/logger';
import { withErrorHandling } from '../utils/error-handler';
import type { IStorage } from '../storage-poc';

// ========================================
// PROCESSOR DE BATCH
// ========================================
// Traite plusieurs opérations en lot de manière optimisée
// Regroupe, parallélise, et optimise les opérations similaires
// ========================================

export interface BatchOperation<T = unknown> {
  id: string;
  operation: () => Promise<T>;
  priority?: number;
  dependencies?: string[];
  metadata?: Record<string, unknown>;
}

export interface BatchResult<T = unknown> {
  id: string;
  success: boolean;
  result?: T;
  error?: string;
  duration: number;
  cached?: boolean;
  parallelized?: boolean;
}

export interface BatchProcessingResult {
  results: BatchResult[];
  totalDuration: number;
  successCount: number;
  failedCount: number;
  cachedCount: number;
  parallelizedCount: number;
  optimizations: string[];
}

/**
 * Service de traitement par lot pour opérations agent
 * Regroupe, optimise et parallélise les opérations
 */
export class AgentBatchProcessor {
  private storage: IStorage;
  private readonly DEFAULT_BATCH_SIZE = 10;
  private readonly MAX_PARALLEL = 5;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private operationCache: Map<string, { result: unknown; timestamp: number }> = new Map();

  constructor(storage: IStorage) {
    if (!storage) {
      throw new Error('Storage requis pour AgentBatchProcessor');
    }
    this.storage = storage;
  }

  /**
   * Traite un batch d'opérations de manière optimisée
   */
  async processBatch<T = unknown>(
    operations: BatchOperation<T>[],
    options?: {
      batchSize?: number;
      maxParallel?: number;
      useCache?: boolean;
      prioritize?: boolean;
    }
  ): Promise<BatchProcessingResult> {
    return withErrorHandling(
      async () => {
        const startTime = Date.now();
        const batchSize = options?.batchSize || this.DEFAULT_BATCH_SIZE;
        const maxParallel = options?.maxParallel || this.MAX_PARALLEL;
        const useCache = options?.useCache ?? true;
        const prioritize = options?.prioritize ?? true;

        // 1. Nettoyer cache expiré
        if (useCache) {
          this.cleanupCache();
        }

        // 2. Trier par priorité si demandé
        const sortedOperations = prioritize
          ? this.sortByPriority(operations)
          : operations;

        // 3. Grouper par dépendances
        const groups = this.groupByDependencies(sortedOperations);

        // 4. Traiter groupes séquentiellement, opérations en parallèle dans chaque groupe
        const results: BatchResult[] = [];
        const optimizations: string[] = [];

        for (const group of groups) {
          // Traiter groupe par sous-batches
          for (let i = 0; i < group.length; i += batchSize) {
            const batch = group.slice(i, i + batchSize);

            // Vérifier cache pour chaque opération
            const cacheResults: Map<string, BatchResult> = new Map();
            const operationsToExecute: BatchOperation[] = [];

            for (const op of batch) {
              if (useCache) {
                const cached = this.getCachedResult(op.id);
                if (cached) {
                  cacheResults.set(op.id, {
                    id: op.id,
                    success: true,
                    result: cached,
                    duration: 0,
                    cached: true
                  });
                  continue;
                }
              }
              operationsToExecute.push(op);
            }

            // Exécuter opérations non cachées en parallèle (limité)
            const executionResults = await this.executeBatch(
              operationsToExecute,
              maxParallel
            );

            // Combiner résultats
            results.push(...Array.from(cacheResults.values()));
            results.push(...executionResults);

            // Mettre en cache résultats réussis
            if (useCache) {
              for (const result of executionResults) {
                if (result.success && result.result !== undefined) {
                  this.cacheResult(result.id, result.result);
                }
              }
            }
          }
        }

        // 5. Calculer statistiques
        const successCount = results.filter(r => r.success).length;
        const failedCount = results.filter(r => !r.success).length;
        const cachedCount = results.filter(r => r.cached).length;
        const parallelizedCount = results.filter(r => r.parallelized).length;

        if (cachedCount > 0) {
          optimizations.push(`Cache: ${cachedCount} opérations`);
        }
        if (parallelizedCount > 0) {
          optimizations.push(`Parallélisation: ${parallelizedCount} opérations`);
        }
        if (groups.length > 1) {
          optimizations.push(`Groupement: ${groups.length} groupes`);
        }

        const totalDuration = Date.now() - startTime;

        logger.info('Batch traité', {
          metadata: {
            service: 'AgentBatchProcessor',
            operation: 'processBatch',
            totalOperations: operations.length,
            successCount,
            failedCount,
            cachedCount,
            parallelizedCount,
            totalDuration,
            optimizations
          }
        });

        return {
          results,
          totalDuration,
          successCount,
          failedCount,
          cachedCount,
          parallelizedCount,
          optimizations
        };
      },
      {
        operation: 'processBatch',
        service: 'AgentBatchProcessor',
        metadata: {}
      }
    );
  }

  /**
   * Exécute un batch d'opérations en parallèle (limité)
   */
  private async executeBatch<T>(
    operations: BatchOperation<T>[],
    maxParallel: number
  ): Promise<BatchResult<T>[]> {
    const results: BatchResult<T>[] = [];

    // Exécuter par groupes de maxParallel
    for (let i = 0; i < operations.length; i += maxParallel) {
      const batch = operations.slice(i, i + maxParallel);

      const batchResults = await Promise.allSettled(
        batch.map(async (op) => {
          const startTime = Date.now();
          try {
            const result = await op.operation();
            const duration = Date.now() - startTime;

            return {
              id: op.id,
              success: true,
              result,
              duration,
              parallelized: batch.length > 1
            } as BatchResult<T>;
          } catch (error) {
            const duration = Date.now() - startTime;

            return {
              id: op.id,
              success: false,
              error: error instanceof Error ? error.message : String(error),
              duration,
              parallelized: batch.length > 1
            } as BatchResult<T>;
          }
        })
      );

      // Convertir Promise.allSettled en BatchResult[]
      for (const settled of batchResults) {
        if (settled.status === 'fulfilled') {
          results.push(settled.value);
        } else {
          results.push({
            id: 'unknown',
            success: false,
            error: settled.reason?.message || String(settled.reason),
            duration: 0,
            parallelized: batch.length > 1
          });
        }
      }
    }

    return results;
  }

  /**
   * Trie les opérations par priorité
   */
  private sortByPriority<T>(operations: BatchOperation<T>[]): BatchOperation<T>[] {
    return [...operations].sort((a, b) => {
      const priorityA = a.priority || 0;
      const priorityB = b.priority || 0;
      return priorityB - priorityA; // Priorité décroissante
    });
  }

  /**
   * Groupe les opérations par dépendances
   */
  private groupByDependencies<T>(operations: BatchOperation<T>[]): BatchOperation<T>[][] {
    const groups: BatchOperation<T>[][] = [];
    const processed = new Set<string>();
    const operationMap = new Map(operations.map(op => [op.id, op]));

    for (const op of operations) {
      if (processed.has(op.id)) continue;

      const group: BatchOperation<T>[] = [];
      const toProcess = [op];

      while (toProcess.length > 0) {
        const current = toProcess.shift()!;
        if (processed.has(current.id)) continue;

        // Vérifier si toutes les dépendances sont traitées
        const allDepsProcessed = !current.dependencies || current.dependencies.every(
          depId => processed.has(depId)
        );

        if (allDepsProcessed) {
          group.push(current);
          processed.add(current.id);
        } else {
          // Ajouter dépendances non traitées
          if (current.dependencies) {
            for (const depId of current.dependencies) {
              if (!processed.has(depId) && operationMap.has(depId)) {
                toProcess.push(operationMap.get(depId)!);
              }
            }
          }
        }
      }

      if (group.length > 0) {
        groups.push(group);
      }
    }

    return groups;
  }

  /**
   * Récupère résultat depuis cache
   */
  private getCachedResult(id: string): unknown | null {
    const cached = this.operationCache.get(id);
    if (!cached) return null;

    if (Date.now() > cached.timestamp + this.CACHE_TTL) {
      this.operationCache.delete(id);
      return null;
    }

    return cached.result;
  }

  /**
   * Met en cache un résultat
   */
  private cacheResult(id: string, result: unknown): void {
    this.operationCache.set(id, {
      result,
      timestamp: Date.now()
    });
  }

  /**
   * Nettoie le cache expiré
   */
  private cleanupCache(): void {
    const now = Date.now();
    for (const [id, cached] of Array.from(this.operationCache.entries())) {
      if (now > cached.timestamp + this.CACHE_TTL) {
        this.operationCache.delete(id);
      }
    }
  }

  /**
   * Vide le cache
   */
  clearCache(): void {
    this.operationCache.clear();
    logger.info('Cache batch vidé', {
      metadata: {
        service: 'AgentBatchProcessor',
        operation: 'clearCache'
      }
    });
  }
}

// ========================================
// SINGLETON
// ========================================

let agentBatchProcessorInstance: AgentBatchProcessor | null = null;

export function getAgentBatchProcessor(storage: IStorage): AgentBatchProcessor {
  if (!agentBatchProcessorInstance) {
    agentBatchProcessorInstance = new AgentBatchProcessor(storage);
  }
  return agentBatchProcessorInstance;
}

