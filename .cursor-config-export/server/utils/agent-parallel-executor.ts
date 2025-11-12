import { logger } from './logger';
import { withErrorHandling } from './error-handler';

// ========================================
// TYPES ET INTERFACES
// ========================================

export interface Operation<T = unknown> {
  id: string;
  execute: () => Promise<T>;
  dependencies?: string[];
  priority?: number;
  metadata?: {
    type?: string;
    description?: string;
    estimatedDuration?: number;
  };
}

export interface OperationResult<T = unknown> {
  operationId: string;
  success: boolean;
  result?: T;
  error?: Error;
  duration: number;
}

export interface ParallelExecutionStats {
  totalOperations: number;
  parallelized: number;
  sequential: number;
  totalDuration: number;
  averageDuration: number;
  maxConcurrency: number;
}

// ========================================
// PARALLEL EXECUTOR
// ========================================

/**
 * Exécuteur parallèle pour opérations indépendantes de l'agent
 * Détecte automatiquement les dépendances et groupe les opérations pour parallélisation
 */
export class ParallelExecutor {
  private readonly MAX_CONCURRENCY: number = 5;
  private stats: ParallelExecutionStats = {
    totalOperations: 0,
    parallelized: 0,
    sequential: 0,
    totalDuration: 0,
    averageDuration: 0,
    maxConcurrency: 0
  };

  /**
   * Construit un graphe de dépendances à partir des opérations
   */
  private buildDependencyGraph<T>(
    operations: Operation<T>[]
  ): Map<string, Set<string>> {
    const graph = new Map<string, Set<string>>();
    
    // Initialiser le graphe
    for (const op of operations) {
      graph.set(op.id, new Set());
    }
    
    // Ajouter les dépendances
    for (const op of operations) {
      if (op.dependencies) {
        for (const depId of op.dependencies) {
          const deps = graph.get(op.id);
          if (deps) {
            deps.add(depId);
          }
        }
      }
    }
    
    return graph;
  }

  /**
   * Identifie les groupes d'opérations parallélisables
   * Utilise un tri topologique pour déterminer l'ordre d'exécution
   */
  private identifyParallelGroups<T>(
    operations: Operation<T>[],
    dependencyGraph: Map<string, Set<string>>
  ): Operation<T>[][] {
    const groups: Operation<T>[][] = [];
    const completed = new Set<string>();
    const inProgress = new Set<string>();
    const remaining = new Set(operations.map(op => op.id));
    
    while (remaining.size > 0) {
      // Trouver les opérations sans dépendances non complétées
      const ready: Operation<T>[] = [];
      
      for (const op of operations) {
        if (!remaining.has(op.id)) continue;
        if (inProgress.has(op.id)) continue;
        
        const deps = dependencyGraph.get(op.id);
        if (!deps || deps.size === 0) {
          // Pas de dépendances
          ready.push(op);
        } else {
          // Vérifier si toutes les dépendances sont complétées
          const allDepsCompleted = Array.from(deps).every(depId => 
            completed.has(depId)
          );
          if (allDepsCompleted) {
            ready.push(op);
          }
        }
      }
      
      if (ready.length === 0) {
        // Cycle détecté ou erreur - exécuter séquentiellement
        logger.warn('Cycle détecté dans les dépendances, exécution séquentielle', {
          metadata: {
            service: 'ParallelExecutor',
            operation: 'identifyParallelGroups',
            remaining: Array.from(remaining)
          }
        });
        
        const remainingOps = operations.filter(op => remaining.has(op.id));
        for (const op of remainingOps) {
          groups.push([op]);
          completed.add(op.id);
          remaining.delete(op.id);
        }
        break;
      }
      
      // Limiter la taille du groupe à MAX_CONCURRENCY
      const limitedReady = ready.slice(0, this.MAX_CONCURRENCY);
      groups.push(limitedReady);
      
      // Marquer comme en cours
      for (const op of limitedReady) {
        inProgress.add(op.id);
      }
    }
    
    return groups;
  }

  /**
   * Exécute un groupe d'opérations en parallèle
   */
  private async executeGroup<T>(
    group: Operation<T>[]
  ): Promise<OperationResult<T>[]> {
    const startTime = Date.now();
    
    const results = await Promise.allSettled(
      group.map(async (op) => {
        const opStartTime = Date.now();
        try {
          const result = await op.execute();
          const duration = Date.now() - opStartTime;
          
          return {
            operationId: op.id,
            success: true,
            result,
            duration
          } as OperationResult<T>;
        } catch (error) {
          const duration = Date.now() - opStartTime;
          
          logger.error('Erreur lors de l\'exécution d\'une opération', {
            metadata: {
              service: 'ParallelExecutor',
              operation: 'executeGroup',
              operationId: op.id,
              error: error instanceof Error ? error.message : String(error)
            }
          });
          
          return {
            operationId: op.id,
            success: false,
            error: error instanceof Error ? error : new Error(String(error)),
            duration
          } as OperationResult<T>;
        }
      })
    );
    
    const groupDuration = Date.now() - startTime;
    
    // Convertir PromiseSettledResult en OperationResult
    const operationResults: OperationResult<T>[] = results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          operationId: group[index].id,
          success: false,
          error: result.reason instanceof Error ? result.reason : new Error(String(result.reason)),
          duration: 0
        };
      }
    });
    
    // Mettre à jour les statistiques
    this.stats.parallelized += group.length;
    this.stats.totalDuration += groupDuration;
    
    return operationResults;
  }

  /**
   * Exécute les opérations en parallèle selon leurs dépendances
   */
  async executeParallel<T>(
    operations: Operation<T>[]
  ): Promise<OperationResult<T>[]> {
    return withErrorHandling(
      async () => {
        if (operations.length === 0) {
          return [];
        }
        
        const startTime = Date.now();
        this.stats.totalOperations = operations.length;
        
        // 1. Construire le graphe de dépendances
        const dependencyGraph = this.buildDependencyGraph(operations);
        
        // 2. Identifier les groupes parallélisables
        const groups = this.identifyParallelGroups(operations, dependencyGraph);
        
        logger.debug('Groupes parallélisables identifiés', {
          metadata: {
            service: 'ParallelExecutor',
            operation: 'executeParallel',
            totalOperations: operations.length,
            groupsCount: groups.length,
            maxConcurrency: this.MAX_CONCURRENCY
          }
        });
        
        // 3. Exécuter les groupes séquentiellement, opérations du groupe en parallèle
        const allResults: OperationResult<T>[] = [];
        
        for (let i = 0; i < groups.length; i++) {
          const group = groups[i];
          
          if (group.length === 1) {
            // Opération séquentielle
            this.stats.sequential++;
            const op = group[0];
            const opStartTime = Date.now();
            
            try {
              const result = await op.execute();
              const duration = Date.now() - opStartTime;
              
              allResults.push({
                operationId: op.id,
                success: true,
                result,
                duration
              });
              
              this.stats.totalDuration += duration;
            } catch (error) {
              const duration = Date.now() - opStartTime;
              
              logger.error('Erreur lors de l\'exécution séquentielle', {
                metadata: {
                  service: 'ParallelExecutor',
                  operation: 'executeParallel',
                  operationId: op.id,
                  error: error instanceof Error ? error.message : String(error)
                }
              });
              
              allResults.push({
                operationId: op.id,
                success: false,
                error: error instanceof Error ? error : new Error(String(error)),
                duration
              });
              
              this.stats.totalDuration += duration;
            }
          } else {
            // Groupe parallélisé
            const groupResults = await this.executeGroup(group);
            allResults.push(...groupResults);
          }
        }
        
        const totalDuration = Date.now() - startTime;
        this.stats.averageDuration = this.stats.totalOperations > 0
          ? this.stats.totalDuration / this.stats.totalOperations
          : 0;
        this.stats.maxConcurrency = Math.max(
          this.stats.maxConcurrency,
          groups.reduce((max, group) => Math.max(max, group.length), 0)
        );
        
        logger.info('Exécution parallèle terminée', {
          metadata: {
            service: 'ParallelExecutor',
            operation: 'executeParallel',
            totalOperations: operations.length,
            parallelized: this.stats.parallelized,
            sequential: this.stats.sequential,
            totalDuration,
            averageDuration: this.stats.averageDuration
          }
        });
        
        return allResults;
      },
      {
        operation: 'executeParallel',
        service: 'ParallelExecutor',
        metadata: { operationsCount: operations.length }
      }
    );
  }

  /**
   * Exécute plusieurs recherches codebase_search en parallèle
   */
  async executeParallelSearches(
    searches: Array<{
      id: string;
      query: string;
      targetDirectories: string[];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      searchFn: (query: string, dirs: string[]) => Promise<any>;
    }>
  ): Promise<OperationResult[]> {
    const operations: Operation[] = searches.map(search => ({
      id: search.id,
      execute: async () => await search.searchFn(search.query, search.targetDirectories),
      metadata: {
        type: 'codebase_search',
        description: search.query.substring(0, 100)
      }
    }));
    
    return this.executeParallel(operations);
  }

  /**
   * Exécute plusieurs lectures de fichiers en parallèle
   */
  async executeParallelFileReads(
    fileReads: Array<{
      id: string;
      filePath: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      readFn: (path: string) => Promise<any>;
    }>
  ): Promise<OperationResult[]> {
    const operations: Operation[] = fileReads.map(fileRead => ({
      id: fileRead.id,
      execute: async () => await fileRead.readFn(fileRead.filePath),
      metadata: {
        type: 'read_file',
        description: fileRead.filePath
      }
    }));
    
    return this.executeParallel(operations);
  }

  /**
   * Exécute plusieurs validations en parallèle
   */
  async executeParallelValidations(
    validations: Array<{
      id: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      validateFn: () => Promise<any>;
      dependencies?: string[];
    }>
  ): Promise<OperationResult[]> {
    const operations: Operation[] = validations.map(validation => ({
      id: validation.id,
      execute: validation.validateFn,
      dependencies: validation.dependencies,
      metadata: {
        type: 'validation',
        description: validation.id
      }
    }));
    
    return this.executeParallel(operations);
  }

  /**
   * Récupère les statistiques d'exécution
   */
  getStats(): ParallelExecutionStats {
    return { ...this.stats };
  }

  /**
   * Réinitialise les statistiques
   */
  resetStats(): void {
    this.stats = {
      totalOperations: 0,
      parallelized: 0,
      sequential: 0,
      totalDuration: 0,
      averageDuration: 0,
      maxConcurrency: 0
    };
  }
}

// ========================================
// SINGLETON INSTANCE
// ========================================

let parallelExecutorInstance: ParallelExecutor | null = null;

export function getParallelExecutor(): ParallelExecutor {
  if (!parallelExecutorInstance) {
    parallelExecutorInstance = new ParallelExecutor();
  }
  return parallelExecutorInstance;
}

