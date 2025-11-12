import { logger } from '../utils/logger';
import { withErrorHandling } from '../utils/error-handler';
import type { IStorage } from '../storage-poc';

// ========================================
// EXÉCUTEUR PARALLÈLE INTELLIGENT
// ========================================
// Parallélise automatiquement les opérations indépendantes
// Détecte dépendances et optimise l'ordre d'exécution
// ========================================

export interface ParallelOperation<T = unknown> {
  id: string;
  execute: () => Promise<T>;
  dependencies?: string[];
  priority?: number;
  estimatedDuration?: number;
  metadata?: Record<string, unknown>;
}

export interface ParallelExecutionResult<T = unknown> {
  id: string;
  success: boolean;
  result?: T;
  error?: string;
  duration: number;
  startTime: number;
  endTime: number;
  parallelized: boolean;
}

export interface ParallelExecutionPlan {
  phases: Array<{
    phase: number;
    operations: string[];
    canParallelize: boolean;
    estimatedDuration: number;
  }>;
  totalEstimatedDuration: number;
  maxParallelization: number;
}

/**
 * Service d'exécution parallèle intelligente
 * Détecte automatiquement les opérations parallélisables
 */
export class AgentParallelExecutor {
  private storage: IStorage;
  private readonly DEFAULT_MAX_PARALLEL = 5;
  private readonly MAX_PARALLEL = 10;
  private executionHistory: Map<string, number> = new Map(); // id -> duration

  constructor(storage: IStorage) {
    if (!storage) {
      throw new Error('Storage requis pour AgentParallelExecutor');
    }
    this.storage = storage;
  }

  /**
   * Exécute des opérations en parallèle de manière intelligente
   */
  async executeParallel<T = unknown>(
    operations: ParallelOperation<T>[],
    options?: {
      maxParallel?: number;
      detectDependencies?: boolean;
      optimizeOrder?: boolean;
    }
  ): Promise<{
    results: ParallelExecutionResult<T>[];
    plan: ParallelExecutionPlan;
    totalDuration: number;
    timeSaved: number;
  }> {
    return withErrorHandling(
      async () => {
        const startTime = Date.now();
        const maxParallel = options?.maxParallel || this.DEFAULT_MAX_PARALLEL;
        const detectDependencies = options?.detectDependencies ?? true;
        const optimizeOrder = options?.optimizeOrder ?? true;

        // 1. Créer plan d'exécution
        const plan = this.createExecutionPlan(operations, {
          maxParallel,
          detectDependencies,
          optimizeOrder
        });

        // 2. Exécuter par phases
        const results: ParallelExecutionResult<T>[] = [];
        const operationMap = new Map(operations.map(op => [op.id, op]));

        for (const phase of plan.phases) {
          if (phase.canParallelize && phase.operations.length > 1) {
            // Exécution parallèle
            const phaseStartTime = Date.now();
            const phaseOps = phase.operations
              .map(id => operationMap.get(id)!)
              .filter(op => op !== undefined);

            const phaseResults = await Promise.allSettled(
              phaseOps.map(async (op) => {
                const opStartTime = Date.now();
                try {
                  const result = await op.execute();
                  const opEndTime = Date.now();

                  return {
                    id: op.id,
                    success: true,
                    result,
                    duration: opEndTime - opStartTime,
                    startTime: opStartTime,
                    endTime: opEndTime,
                    parallelized: true
                  } as ParallelExecutionResult<T>;
                } catch (error) {
                  const opEndTime = Date.now();

                  return {
                    id: op.id,
                    success: false,
                    error: error instanceof Error ? error.message : String(error),
                    duration: opEndTime - opStartTime,
                    startTime: opStartTime,
                    endTime: opEndTime,
                    parallelized: true
                  } as ParallelExecutionResult<T>;
                }
              })
            );

            // Convertir résultats
            for (const settled of phaseResults) {
              if (settled.status === 'fulfilled') {
                results.push(settled.value);
                // Enregistrer durée pour historique
                this.executionHistory.set(settled.value.id, settled.value.duration);
              }
            }
          } else {
            // Exécution séquentielle
            for (const opId of phase.operations) {
              const op = operationMap.get(opId);
              if (!op) continue;

              const opStartTime = Date.now();
              try {
                const result = await op.execute();
                const opEndTime = Date.now();

                results.push({
                  id: op.id,
                  success: true,
                  result,
                  duration: opEndTime - opStartTime,
                  startTime: opStartTime,
                  endTime: opEndTime,
                  parallelized: false
                });

                this.executionHistory.set(op.id, opEndTime - opStartTime);
              } catch (error) {
                const opEndTime = Date.now();

                results.push({
                  id: op.id,
                  success: false,
                  error: error instanceof Error ? error.message : String(error),
                  duration: opEndTime - opStartTime,
                  startTime: opStartTime,
                  endTime: opEndTime,
                  parallelized: false
                });
              }
            }
          }
        }

        const totalDuration = Date.now() - startTime;

        // 3. Calculer temps économisé
        const sequentialEstimate = results.reduce((sum, r) => sum + r.duration, 0);
        const timeSaved = Math.max(0, sequentialEstimate - totalDuration);

        logger.info('Exécution parallèle terminée', {
          metadata: {
            service: 'AgentParallelExecutor',
            operation: 'executeParallel',
            totalOperations: operations.length,
            phases: plan.phases.length,
            parallelizedPhases: plan.phases.filter(p => p.canParallelize).length,
            totalDuration,
            timeSaved,
            efficiency: sequentialEstimate > 0 ? (timeSaved / sequentialEstimate) * 100 : 0
          }
        });

        return {
          results,
          plan,
          totalDuration,
          timeSaved
        };
      },
      {
        operation: 'executeParallel',
        service: 'AgentParallelExecutor',
        metadata: {}
      }
    );
  }

  /**
   * Crée un plan d'exécution optimisé
   */
  private createExecutionPlan<T>(
    operations: ParallelOperation<T>[],
    options: {
      maxParallel: number;
      detectDependencies: boolean;
      optimizeOrder: boolean;
    }
  ): ParallelExecutionPlan {
    const phases: ParallelExecutionPlan['phases'] = [];
    const processed = new Set<string>();
    const operationMap = new Map(operations.map(op => [op.id, op]));

    // Trier par priorité si optimisation activée
    const sortedOps = options.optimizeOrder
      ? [...operations].sort((a, b) => (b.priority || 0) - (a.priority || 0))
      : operations;

    // Créer phases basées sur dépendances
    while (processed.size < operations.length) {
      const phaseOps: string[] = [];
      let phaseEstimatedDuration = 0;

      for (const op of sortedOps) {
        if (processed.has(op.id)) continue;

        // Vérifier si toutes les dépendances sont traitées
        const allDepsProcessed = !op.dependencies || op.dependencies.every(
          depId => processed.has(depId)
        );

        if (allDepsProcessed && phaseOps.length < options.maxParallel) {
          phaseOps.push(op.id);
          processed.add(op.id);
          phaseEstimatedDuration = Math.max(
            phaseEstimatedDuration,
            op.estimatedDuration || this.getEstimatedDuration(op.id)
          );
        }
      }

      if (phaseOps.length > 0) {
        phases.push({
          phase: phases.length + 1,
          operations: phaseOps,
          canParallelize: phaseOps.length > 1 && options.detectDependencies,
          estimatedDuration: phaseEstimatedDuration
        });
      } else {
        // Pas d'opérations disponibles (dépendances circulaires?)
        // Forcer traitement séquentiel
        for (const op of sortedOps) {
          if (!processed.has(op.id)) {
            phases.push({
              phase: phases.length + 1,
              operations: [op.id],
              canParallelize: false,
              estimatedDuration: op.estimatedDuration || this.getEstimatedDuration(op.id)
            });
            processed.add(op.id);
            break;
          }
        }
      }
    }

    const totalEstimatedDuration = phases.reduce(
      (sum, p) => sum + p.estimatedDuration,
      0
    );

    return {
      phases,
      totalEstimatedDuration,
      maxParallelization: Math.max(...phases.map(p => p.operations.length), 1)
    };
  }

  /**
   * Estime la durée d'une opération basée sur l'historique
   */
  private getEstimatedDuration(operationId: string): number {
    return this.executionHistory.get(operationId) || 1000; // 1s par défaut
  }

  /**
   * Analyse si des opérations peuvent être parallélisées
   */
  canParallelize(operations: ParallelOperation[]): {
    canParallelize: boolean;
    reason: string;
    estimatedTimeSaved: number;
  } {
    // Vérifier dépendances
    const hasDependencies = operations.some(op => op.dependencies && op.dependencies.length > 0);
    if (hasDependencies) {
      return {
        canParallelize: false,
        reason: 'Dépendances détectées',
        estimatedTimeSaved: 0
      };
    }

    // Estimer temps économisé
    const sequentialTime = operations.reduce(
      (sum, op) => sum + (op.estimatedDuration || 1000),
      0
    );
    const parallelTime = Math.max(
      ...operations.map(op => op.estimatedDuration || 1000)
    );
    const timeSaved = Math.max(0, sequentialTime - parallelTime);

    return {
      canParallelize: true,
      reason: 'Aucune dépendance, parallélisation possible',
      estimatedTimeSaved: timeSaved
    };
  }
}

// ========================================
// SINGLETON
// ========================================

let agentParallelExecutorInstance: AgentParallelExecutor | null = null;

export function getAgentParallelExecutor(storage: IStorage): AgentParallelExecutor {
  if (!agentParallelExecutorInstance) {
    agentParallelExecutorInstance = new AgentParallelExecutor(storage);
  }
  return agentParallelExecutorInstance;
}

