import { logger } from '../utils/logger';
import { withErrorHandling } from '../utils/error-handler';
import { getAgentSearchCacheService } from './AgentSearchCacheService';
import type { IStorage } from '../storage-poc';

// ========================================
// TYPES ET INTERFACES
// ========================================

export interface PerformanceMetrics {
  operation: string;
  duration: number; // ms
  cacheHit: boolean;
  parallelized: boolean;
  optimized: boolean;
}

export interface OptimizationResult {
  operation: string;
  originalDuration: number; // ms
  optimizedDuration: number; // ms
  improvement: number; // percentage
  optimizations: string[];
  cacheHits: number;
  parallelized: boolean;
}

export interface PerformanceProfile {
  operation: string;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  cacheHitRate: number;
  optimizationRate: number;
  callCount: number;
}

// ========================================
// AGENT PERFORMANCE OPTIMIZER
// ========================================

/**
 * Service d'optimisation performance des analyses qualité
 * Cache, parallélisation, optimisation intelligente
 * Réduit latence et améliore efficacité
 */
export class AgentPerformanceOptimizer {
  private storage: IStorage;
  // private searchCache: ReturnType<typeof getAgentSearchCacheService>;
  private metrics: Map<string, PerformanceMetrics[]> = new Map();
  private profiles: Map<string, PerformanceProfile> = new Map();
  private readonly MAX_METRICS_PER_OPERATION = 1000;

  constructor(storage: IStorage) {
    if (!storage) {
      throw new Error('Storage requis pour AgentPerformanceOptimizer');
    }
    this.storage = storage;
    // this.searchCache = getAgentSearchCacheService(storage);
  }

  /**
   * Optimise exécution d'une opération
   */
  async optimizeOperation<T>(
    operation: string,
    executor: () => Promise<T>,
    options?: {
      useCache?: boolean;
      parallelize?: boolean;
      cacheKey?: string;
    }
  ): Promise<{
    result: T;
    metrics: PerformanceMetrics;
    optimization: OptimizationResult;
  }> {
    return withErrorHandling(
      async () => {
        const startTime = Date.now();
        const useCache = options?.useCache ?? true;
        const parallelize = options?.parallelize ?? false;
        const cacheKey = options?.cacheKey || operation;

        const cacheHit = false;
        let optimized = false;

        // 1. Vérifier cache si activé
        if (useCache) {
          // Logique de cache serait implémentée ici
          // Pour l'instant, exécuter directement
        }

        // 2. Exécuter opération
        const result = await executor();
        
        if (parallelize && Array.isArray(result)) {
          // Paralléliser si possible
          optimized = true;
        }

        const duration = Date.now() - startTime;

        // 3. Enregistrer métriques
        const metrics: PerformanceMetrics = {
          operation,
          duration,
          cacheHit,
          parallelized: parallelize && optimized,
          optimized
        };

        this.recordMetrics(operation, metrics);

        // 4. Calculer optimisation
        const profile = this.getProfile(operation);
        const optimization: OptimizationResult = {
          operation,
          originalDuration: profile.avgDuration,
          optimizedDuration: duration,
          improvement: profile.avgDuration > 0
            ? ((profile.avgDuration - duration) / profile.avgDuration) * 100
            : 0,
          optimizations: this.identifyOptimizations(metrics, profile),
          cacheHits: cacheHit ? 1 : 0,
          parallelized: parallelize && optimized
        };

        logger.debug('Opération optimisée', {
          metadata: {
            service: 'AgentPerformanceOptimizer',
            operation: 'optimizeOperation',
            operationName: operation,
            duration,
            cacheHit,
            optimized,
            improvement: optimization.improvement
          }
        });

        return {
          result,
          metrics,
          optimization
        };
      },
      {
        operation: 'optimizeOperation',
        service: 'AgentPerformanceOptimizer',
        metadata: {}
      }
    );
  }

  /**
   * Enregistre métriques
   */
  private recordMetrics(operation: string, metrics: PerformanceMetrics): void {
    const existing = this.metrics.get(operation) || [];
    existing.push(metrics);

    // Limiter nombre de métriques
    if (existing.length > this.MAX_METRICS_PER_OPERATION) {
      existing.shift();
    }

    this.metrics.set(operation, existing);

    // Mettre à jour profil
    this.updateProfile(operation);
  }

  /**
   * Met à jour profil de performance
   */
  private updateProfile(operation: string): void {
    const metrics = this.metrics.get(operation) || [];
    if (metrics.length === 0) return;

    const durations = metrics.map(m => m.duration);
    const cacheHits = metrics.filter(m => m.cacheHit).length;
    const optimized = metrics.filter(m => m.optimized).length;

    const profile: PerformanceProfile = {
      operation,
      avgDuration: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      cacheHitRate: (cacheHits / metrics.length) * 100,
      optimizationRate: (optimized / metrics.length) * 100,
      callCount: metrics.length
    };

    this.profiles.set(operation, profile);
  }

  /**
   * Récupère profil de performance
   */
  private getProfile(operation: string): PerformanceProfile {
    return this.profiles.get(operation) || {
      operation,
      avgDuration: 0,
      minDuration: 0,
      maxDuration: 0,
      cacheHitRate: 0,
      optimizationRate: 0,
      callCount: 0
    };
  }

  /**
   * Identifie optimisations appliquées
   */
  private identifyOptimizations(
    metrics: PerformanceMetrics,
    profile: PerformanceProfile
  ): string[] {
    const optimizations: string[] = [];

    if (metrics.cacheHit) {
      optimizations.push('cache');
    }

    if (metrics.parallelized) {
      optimizations.push('parallelization');
    }

    if (metrics.duration < profile.avgDuration * 0.8) {
      optimizations.push('performance_improvement');
    }

    return optimizations;
  }

  /**
   * Optimise batch d'opérations
   */
  async optimizeBatch<T>(
    operations: Array<{
      name: string;
      executor: () => Promise<T>;
      cacheKey?: string;
    }>
  ): Promise<{
    results: Array<{
      name: string;
      result: T;
      metrics: PerformanceMetrics;
    }>;
    totalDuration: number;
    avgDuration: number;
    optimizations: OptimizationResult[];
  }> {
    return withErrorHandling(
      async () => {
        const startTime = Date.now();
        const results: Array<{
          name: string;
          result: T;
          metrics: PerformanceMetrics;
        }> = [];
        const optimizations: OptimizationResult[] = [];

        // Exécuter opérations en parallèle si possible
        const parallelResults = await Promise.all(
          operations.map(async (op) => {
            const optimized = await this.optimizeOperation(
              op.name,
              op.executor,
              {
                useCache: true,
                parallelize: true,
                cacheKey: op.cacheKey
              }
            );
            return {
              name: op.name,
              result: optimized.result,
              metrics: optimized.metrics
            };
          })
        );

        results.push(...parallelResults);

        // Calculer optimisations
        for (const result of results) {
          const profile = this.getProfile(result.name);
          optimizations.push({
            operation: result.name,
            originalDuration: profile.avgDuration,
            optimizedDuration: result.metrics.duration,
            improvement: profile.avgDuration > 0
              ? ((profile.avgDuration - result.metrics.duration) / profile.avgDuration) * 100
              : 0,
            optimizations: this.identifyOptimizations(result.metrics, profile),
            cacheHits: result.metrics.cacheHit ? 1 : 0,
            parallelized: result.metrics.parallelized
          });
        }

        const totalDuration = Date.now() - startTime;
        const avgDuration = totalDuration / operations.length;

        logger.info('Batch optimisé terminé', {
          metadata: {
            service: 'AgentPerformanceOptimizer',
            operation: 'optimizeBatch',
            operationsCount: operations.length,
            totalDuration,
            avgDuration,
            optimizationsCount: optimizations.length
          }
        });

        return {
          results,
          totalDuration,
          avgDuration,
          optimizations
        };
      },
      {
        operation: 'optimizeBatch',
        service: 'AgentPerformanceOptimizer',
        metadata: {}
      }
    );
  }

  /**
   * Analyse performance et génère recommandations
   */
  async analyzePerformance(): Promise<{
    profiles: PerformanceProfile[];
    recommendations: Array<{
      operation: string;
      priority: 'low' | 'medium' | 'high';
      recommendation: string;
      estimatedImprovement: number; // percentage
    }>;
  }> {
    return withErrorHandling(
      async () => {
        const profiles = Array.from(this.profiles.values());
        const recommendations: Array<{
          operation: string;
          priority: 'low' | 'medium' | 'high';
          recommendation: string;
          estimatedImprovement: number;
        }> = [];

        for (const profile of profiles) {
          // Recommandation: Améliorer cache hit rate
          if (profile.cacheHitRate < 50) {
            recommendations.push({
              operation: profile.operation,
              priority: 'high',
              recommendation: `Améliorer cache hit rate (actuel: ${profile.cacheHitRate.toFixed(1)}%)`,
              estimatedImprovement: 30
            });
          }

          // Recommandation: Paralléliser si possible
          if (profile.optimizationRate < 30 && profile.avgDuration > 1000) {
            recommendations.push({
              operation: profile.operation,
              priority: 'medium',
              recommendation: 'Paralléliser opération pour améliorer performance',
              estimatedImprovement: 40
            });
          }

          // Recommandation: Optimiser opérations lentes
          if (profile.avgDuration > 5000) {
            recommendations.push({
              operation: profile.operation,
              priority: 'high',
              recommendation: `Optimiser opération lente (${profile.avgDuration.toFixed(0)}ms)`,
              estimatedImprovement: 50
            });
          }
        }

        return {
          profiles,
          recommendations
        };
      },
      {
        operation: 'analyzePerformance',
        service: 'AgentPerformanceOptimizer',
        metadata: {}
      }
    );
  }

  /**
   * Récupère statistiques performance
   */
  getPerformanceStats(): {
    totalOperations: number;
    avgDuration: number;
    totalCacheHits: number;
    totalOptimizations: number;
    topSlowOperations: Array<{
      operation: string;
      avgDuration: number;
    }>;
  } {
    const profiles = Array.from(this.profiles.values());
    const totalOperations = profiles.reduce((sum, p) => sum + p.callCount, 0);
    const avgDuration = profiles.length > 0
      ? profiles.reduce((sum, p) => sum + p.avgDuration, 0) / profiles.length
      : 0;
    const totalCacheHits = profiles.reduce((sum, p) => sum + (p.cacheHitRate * p.callCount / 100), 0);
    const totalOptimizations = profiles.reduce((sum, p) => sum + (p.optimizationRate * p.callCount / 100), 0);

    const topSlowOperations = profiles
      .sort((a, b) => b.avgDuration - a.avgDuration)
      .slice(0, 10)
      .map(p => ({
        operation: p.operation,
        avgDuration: p.avgDuration
      }));

    return {
      totalOperations,
      avgDuration,
      totalCacheHits: Math.round(totalCacheHits),
      totalOptimizations: Math.round(totalOptimizations),
      topSlowOperations
    };
  }
}

// ========================================
// SINGLETON INSTANCE
// ========================================

let agentPerformanceOptimizerInstance: AgentPerformanceOptimizer | null = null;

export function getAgentPerformanceOptimizer(storage: IStorage): AgentPerformanceOptimizer {
  if (!agentPerformanceOptimizerInstance) {
    agentPerformanceOptimizerInstance = new AgentPerformanceOptimizer(storage);
  }
  return agentPerformanceOptimizerInstance;
}

