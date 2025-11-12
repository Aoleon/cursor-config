import { logger } from '../utils/logger';
import { withErrorHandling } from '../utils/error-handler';
import { db } from '../db';
import type { IStorage } from '../storage-poc';

// ========================================
// TYPES ET INTERFACES
// ========================================

export interface BatchedQuery<T = unknown> {
  id: string;
  query: () => Promise<T>;
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimatedDuration: number;
  dependencies?: string[];
}

export interface BatchResult<T = unknown> {
  queryId: string;
  success: boolean;
  result?: T;
  error?: Error;
  duration: number;
}

// ========================================
// AGENT DATABASE BATCHER
// ========================================

/**
 * Service de batching intelligent pour requêtes DB
 * Regroupe et optimise les requêtes DB pour améliorer les performances
 */
export class AgentDatabaseBatcher {
  private storage: IStorage;
  private queryQueue: BatchedQuery[] = [];
  private readonly BATCH_TIMEOUT_MS = 100; // 100ms pour regrouper
  private readonly MAX_BATCH_SIZE = 10;
  private batchTimer: NodeJS.Timeout | null = null;
  private processing = false;

  constructor(storage: IStorage) {
    if (!storage) {
      throw new Error('Storage requis pour AgentDatabaseBatcher');
    }
    this.storage = storage;
  }

  /**
   * Ajoute une requête au batch
   */
  async addQuery<T>(query: BatchedQuery<T>): Promise<BatchResult<T>> {
    return new Promise((resolve) => {
      this.queryQueue.push({
        ...query,
        query: async () => {
          try {
            const result = await query.query();
            resolve({
              queryId: query.id,
              success: true,
              result,
              duration: query.estimatedDuration
            });
            return result;
          } catch (error) {
            resolve({
              queryId: query.id,
              success: false,
              error: error instanceof Error ? error : new Error(String(error)),
              duration: query.estimatedDuration
            });
            throw error;
          }
        }
      });

      // Déclencher traitement batch si nécessaire
      this.scheduleBatchProcessing();
    });
  }

  /**
   * Planifie le traitement du batch
   */
  private scheduleBatchProcessing(): void {
    if (this.batchTimer) return; // Déjà planifié
    if (this.processing) return; // Déjà en cours

    this.batchTimer = setTimeout(() => {
      this.processBatch();
    }, this.BATCH_TIMEOUT_MS);
  }

  /**
   * Traite le batch de requêtes
   */
  private async processBatch(): Promise<void> {
    if (this.processing) return;
    if (this.queryQueue.length === 0) {
      this.batchTimer = null;
      return;
    }

    this.processing = true;
    this.batchTimer = null;

    try {
      // Prendre jusqu'à MAX_BATCH_SIZE requêtes
      const batch = this.queryQueue.splice(0, this.MAX_BATCH_SIZE);

      // Grouper par type et optimiser
      const optimizedBatches = this.optimizeBatch(batch);

      // Exécuter batches optimisés
      for (const optimizedBatch of optimizedBatches) {
        if (optimizedBatch.length === 1) {
          // Exécution simple
          await optimizedBatch[0].query();
        } else {
          // Exécution parallèle
          await Promise.allSettled(
            optimizedBatch.map(q => q.query().catch(error => {
              logger.debug('Erreur requête batch', {
                metadata: {
                  service: 'AgentDatabaseBatcher',
                  operation: 'processBatch',
                  queryId: q.id,
                  error: error instanceof Error ? error.message : String(error)
                }
              });
              return null;
            }))
          );
        }
      }

      logger.info('Batch de requêtes traité', {
        metadata: {
          service: 'AgentDatabaseBatcher',
          operation: 'processBatch',
          batchSize: batch.length,
          optimizedBatches: optimizedBatches.length
        }
      });
    } catch (error) {
      logger.error('Erreur traitement batch', {
        metadata: {
          service: 'AgentDatabaseBatcher',
          operation: 'processBatch',
          error: error instanceof Error ? error.message : String(error)
        }
      });
    } finally {
      this.processing = false;

      // Traiter batch suivant si queue non vide
      if (this.queryQueue.length > 0) {
        this.scheduleBatchProcessing();
      }
    }
  }

  /**
   * Optimise un batch de requêtes
   */
  private optimizeBatch<T>(queries: BatchedQuery<T>[]): BatchedQuery<T>[][] {
    // 1. Séparer par dépendances
    const independent: BatchedQuery<T>[] = [];
    const dependent: BatchedQuery<T>[] = [];

    for (const query of queries) {
      if (!query.dependencies || query.dependencies.length === 0) {
        independent.push(query);
      } else {
        dependent.push(query);
      }
    }

    // 2. Grouper indépendantes pour parallélisation
    const batches: BatchedQuery<T>[][] = [];

    // Grouper indépendantes (peuvent être parallélisées)
    if (independent.length > 0) {
      // Limiter taille batch pour éviter surcharge
      for (let i = 0; i < independent.length; i += this.MAX_BATCH_SIZE) {
        batches.push(independent.slice(i, i + this.MAX_BATCH_SIZE));
      }
    }

    // Exécuter dépendantes séquentiellement (après indépendantes)
    for (const query of dependent) {
      batches.push([query]);
    }

    return batches;
  }

  /**
   * Force le traitement immédiat du batch
   */
  async flush(): Promise<void> {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    await this.processBatch();
  }

  /**
   * Récupère les statistiques du batcher
   */
  getStats(): {
    queueSize: number;
    processing: boolean;
    batchesProcessed: number;
  } {
    return {
      queueSize: this.queryQueue.length,
      processing: this.processing,
      batchesProcessed: 0 // À améliorer avec tracking
    };
  }
}

// ========================================
// SINGLETON INSTANCE
// ========================================

let agentDatabaseBatcherInstance: AgentDatabaseBatcher | null = null;

export function getAgentDatabaseBatcher(storage: IStorage): AgentDatabaseBatcher {
  if (!agentDatabaseBatcherInstance) {
    agentDatabaseBatcherInstance = new AgentDatabaseBatcher(storage);
  }
  return agentDatabaseBatcherInstance;
}

