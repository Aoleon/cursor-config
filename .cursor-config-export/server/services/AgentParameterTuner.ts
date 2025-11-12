import { logger } from '../utils/logger';
import { withErrorHandling } from '../utils/error-handler';
import { getAgentPerformanceMetricsService } from './AgentPerformanceMetricsService';
import { getAgentSearchCacheService } from './AgentSearchCacheService';
import { getAIResponseCacheService } from './AIResponseCacheService';
import { getParallelExecutor } from '../utils/agent-parallel-executor';
import { getAIRequestBatcher } from './AIRequestBatcher';
import { getContextOptimizer } from '../utils/agent-context-optimizer';
import type { IStorage } from '../storage-poc';

// ========================================
// TYPES ET INTERFACES
// ========================================

export interface TunableParameter {
  name: string;
  currentValue: number;
  optimalValue: number;
  minValue: number;
  maxValue: number;
  impact: 'low' | 'medium' | 'high';
  confidence: number;
  reason: string;
}

export interface TuningResult {
  parameters: TunableParameter[];
  totalImprovement: number;
  applied: boolean;
  rollbackNeeded: boolean;
}

export interface ParameterSnapshot {
  timestamp: number;
  parameters: Record<string, number>;
  metrics: {
    cacheHitRate: number;
    avgResponseTime: number;
    errorRate: number;
    costPerRequest: number;
  };
}

// ========================================
// AGENT PARAMETER TUNER
// ========================================

/**
 * Service d'auto-tuning des paramètres de performance pour l'agent
 * Ajuste automatiquement les paramètres selon les métriques observées
 */
export class AgentParameterTuner {
  private storage: IStorage;
  private metricsService: ReturnType<typeof getAgentPerformanceMetricsService>;
  private parameterHistory: ParameterSnapshot[] = [];
  private readonly MIN_SAMPLES_FOR_TUNING = 50;
  private readonly IMPROVEMENT_THRESHOLD = 0.1; // 10% amélioration minimum
  private readonly ROLLBACK_THRESHOLD = 0.15; // 15% dégradation = rollback

  // Paramètres actuels (copies pour modification dynamique)
  private currentTTLs: {
    codebaseSearch: number;
    grep: number;
    aiResponse: number;
  } = {
    codebaseSearch: 3600,
    grep: 1800,
    aiResponse: 7200
  };

  private currentSimilarityThresholds: {
    searchCache: number;
    aiResponse: number;
  } = {
    searchCache: 0.8,
    aiResponse: 0.9
  };

  private currentConcurrency = 5;
  private currentBatchTimeout = 1000;
  private currentMaxFiles = 25;

  constructor(storage: IStorage) {
    this.storage = storage;
    this.metricsService = getAgentPerformanceMetricsService(storage);
  }

  /**
   * Analyse les métriques actuelles pour déterminer paramètres optimaux
   */
  async analyzeCurrentMetrics(): Promise<{
    cacheHitRates: {
      search: number;
      aiResponse: number;
    };
    avgResponseTimes: {
      search: number;
      aiResponse: number;
      parallel: number;
    };
    errorRate: number;
    costPerRequest: number;
  }> {
    return withErrorHandling(
      async () => {
        const searchCache = getAgentSearchCacheService();
        const aiResponseCache = getAIResponseCacheService();
        const parallelExecutor = getParallelExecutor();
        const metrics = this.metricsService.getMetrics();

        const searchStats = await searchCache.getStats();
        const aiResponseStats = await aiResponseCache.getStats();
        const parallelStats = parallelExecutor.getStats();

        const cacheHitRates = {
          search: searchStats.hitRate,
          aiResponse: aiResponseStats.hitRate
        };

        const avgResponseTimes = {
          search: metrics.toolCalls.averageDuration,
          aiResponse: metrics.aiRequests.averageResponseTime,
          parallel: parallelStats.averageDuration
        };

        // Calculer taux d'erreur (approximation)
        const errorRate = metrics.aiRequests.total > 0
          ? (metrics.aiRequests.total - metrics.aiRequests.cached) / metrics.aiRequests.total * 0.1 // Approximation
          : 0;

        // Calculer coût par requête (approximation)
        const costPerRequest = metrics.aiRequests.total > 0
          ? 0.001 // Approximation basique
          : 0;

        return {
          cacheHitRates,
          avgResponseTimes,
          errorRate,
          costPerRequest
        };
      },
      {
        operation: 'analyzeCurrentMetrics',
        service: 'AgentParameterTuner',
        metadata: {}
      }
    );
  }

  /**
   * Calcule TTL optimal pour un cache
   */
  private calculateOptimalTTL(
    currentTTL: number,
    hitRate: number,
    avgAge: number
  ): number {
    // Si hit rate élevé (>80%), augmenter TTL
    if (hitRate > 0.8) {
      return Math.min(currentTTL * 1.5, currentTTL * 2);
    }
    
    // Si hit rate faible (<50%), réduire TTL pour rafraîchir plus souvent
    if (hitRate < 0.5) {
      return Math.max(currentTTL * 0.7, currentTTL * 0.5);
    }
    
    // Ajuster selon âge moyen des entrées
    if (avgAge > currentTTL * 0.8) {
      // Entrées presque expirées, augmenter TTL
      return Math.min(currentTTL * 1.2, currentTTL * 1.5);
    }
    
    return currentTTL;
  }

  /**
   * Calcule seuil de similarité optimal
   */
  private calculateOptimalSimilarityThreshold(
    currentThreshold: number,
    hitRate: number,
    avgSimilarity: number
  ): number {
    // Si hit rate élevé et similarité moyenne élevée, peut réduire seuil
    if (hitRate > 0.7 && avgSimilarity > 0.85) {
      return Math.max(currentThreshold - 0.05, 0.7);
    }
    
    // Si hit rate faible, augmenter seuil pour meilleure qualité
    if (hitRate < 0.5) {
      return Math.min(currentThreshold + 0.05, 0.95);
    }
    
    return currentThreshold;
  }

  /**
   * Calcule concurrence optimale
   */
  private calculateOptimalConcurrency(
    currentConcurrency: number,
    parallelized: number,
    sequential: number,
    avgTimeSaved: number
  ): number {
    const total = parallelized + sequential;
    if (total === 0) return currentConcurrency;

    const parallelizationRate = parallelized / total;
    
    // Si parallélisation efficace (>70% et temps économisé >100ms), augmenter
    if (parallelizationRate > 0.7 && avgTimeSaved > 100) {
      return Math.min(currentConcurrency + 1, 10);
    }
    
    // Si parallélisation inefficace, réduire
    if (parallelizationRate < 0.3 || avgTimeSaved < 50) {
      return Math.max(currentConcurrency - 1, 2);
    }
    
    return currentConcurrency;
  }

  /**
   * Ajuste tous les paramètres selon métriques
   */
  async tuneParameters(): Promise<TuningResult> {
    return withErrorHandling(
      async () => {
        const metrics = await this.analyzeCurrentMetrics();
        const searchCache = getAgentSearchCacheService();
        const aiResponseCache = getAIResponseCacheService();
        const parallelExecutor = getParallelExecutor();
        const contextOptimizer = getContextOptimizer();

        const searchStats = await searchCache.getStats();
        const aiResponseStats = await aiResponseCache.getStats();
        const parallelStats = parallelExecutor.getStats();

        const parameters: TunableParameter[] = [];

        // 1. TTL codebase_search
        const optimalCodebaseTTL = this.calculateOptimalTTL(
          this.currentTTLs.codebaseSearch,
          searchStats.hitRate / 100,
          this.currentTTLs.codebaseSearch * 0.5 // Approximation
        );
        if (Math.abs(optimalCodebaseTTL - this.currentTTLs.codebaseSearch) > 300) {
          parameters.push({
            name: 'AGENT_CODEBASE_SEARCH_TTL',
            currentValue: this.currentTTLs.codebaseSearch,
            optimalValue: optimalCodebaseTTL,
            minValue: 600,
            maxValue: 7200,
            impact: 'medium',
            confidence: 0.7,
            reason: `Hit rate: ${searchStats.hitRate.toFixed(1)}%, TTL optimal: ${optimalCodebaseTTL}s`
          });
        }

        // 2. TTL grep
        const optimalGrepTTL = this.calculateOptimalTTL(
          this.currentTTLs.grep,
          searchStats.hitRate / 100,
          this.currentTTLs.grep * 0.5
        );
        if (Math.abs(optimalGrepTTL - this.currentTTLs.grep) > 180) {
          parameters.push({
            name: 'AGENT_GREP_TTL',
            currentValue: this.currentTTLs.grep,
            optimalValue: optimalGrepTTL,
            minValue: 300,
            maxValue: 3600,
            impact: 'medium',
            confidence: 0.7,
            reason: `Hit rate: ${searchStats.hitRate.toFixed(1)}%, TTL optimal: ${optimalGrepTTL}s`
          });
        }

        // 3. TTL AI response
        const optimalAIResponseTTL = this.calculateOptimalTTL(
          this.currentTTLs.aiResponse,
          aiResponseStats.hitRate / 100,
          this.currentTTLs.aiResponse * 0.5
        );
        if (Math.abs(optimalAIResponseTTL - this.currentTTLs.aiResponse) > 600) {
          parameters.push({
            name: 'AGENT_AI_RESPONSE_TTL',
            currentValue: this.currentTTLs.aiResponse,
            optimalValue: optimalAIResponseTTL,
            minValue: 1800,
            maxValue: 14400,
            impact: 'high',
            confidence: 0.8,
            reason: `Hit rate: ${aiResponseStats.hitRate.toFixed(1)}%, Similarité moyenne: ${aiResponseStats.averageSimilarity.toFixed(3)}`
          });
        }

        // 4. Seuil similarité search cache
        const optimalSearchSimilarity = this.calculateOptimalSimilarityThreshold(
          this.currentSimilarityThresholds.searchCache,
          searchStats.hitRate / 100,
          0.85 // Approximation
        );
        if (Math.abs(optimalSearchSimilarity - this.currentSimilarityThresholds.searchCache) > 0.05) {
          parameters.push({
            name: 'SEARCH_CACHE_SIMILARITY_THRESHOLD',
            currentValue: this.currentSimilarityThresholds.searchCache,
            optimalValue: optimalSearchSimilarity,
            minValue: 0.7,
            maxValue: 0.95,
            impact: 'medium',
            confidence: 0.6,
            reason: `Hit rate: ${searchStats.hitRate.toFixed(1)}%`
          });
        }

        // 5. Seuil similarité AI response
        const optimalAISimilarity = this.calculateOptimalSimilarityThreshold(
          this.currentSimilarityThresholds.aiResponse,
          aiResponseStats.hitRate / 100,
          aiResponseStats.averageSimilarity
        );
        if (Math.abs(optimalAISimilarity - this.currentSimilarityThresholds.aiResponse) > 0.05) {
          parameters.push({
            name: 'AI_RESPONSE_SIMILARITY_THRESHOLD',
            currentValue: this.currentSimilarityThresholds.aiResponse,
            optimalValue: optimalAISimilarity,
            minValue: 0.8,
            maxValue: 0.95,
            impact: 'high',
            confidence: 0.7,
            reason: `Hit rate: ${aiResponseStats.hitRate.toFixed(1)}%, Similarité: ${aiResponseStats.averageSimilarity.toFixed(3)}`
          });
        }

        // 6. Concurrence parallèle
        const avgTimeSaved = parallelStats.totalDuration > 0 
          ? (parallelStats.totalDuration / parallelStats.totalOperations) * 0.3 // Approximation
          : 0;
        const optimalConcurrency = this.calculateOptimalConcurrency(
          this.currentConcurrency,
          parallelStats.parallelized,
          parallelStats.sequential,
          avgTimeSaved
        );
        if (optimalConcurrency !== this.currentConcurrency) {
          parameters.push({
            name: 'PARALLEL_MAX_CONCURRENCY',
            currentValue: this.currentConcurrency,
            optimalValue: optimalConcurrency,
            minValue: 2,
            maxValue: 10,
            impact: 'high',
            confidence: 0.7,
            reason: `Parallélisé: ${parallelStats.parallelized}, Temps économisé estimé: ${avgTimeSaved.toFixed(0)}ms`
          });
        }

        // Calculer amélioration totale estimée
        const totalImprovement = parameters.reduce((sum, p) => {
          const improvement = Math.abs(p.optimalValue - p.currentValue) / p.currentValue;
          return sum + (improvement * (p.impact === 'high' ? 1.0 : p.impact === 'medium' ? 0.5 : 0.25));
        }, 0);

        // Appliquer si amélioration > seuil
        const shouldApply = totalImprovement > this.IMPROVEMENT_THRESHOLD && parameters.length > 0;

        if (shouldApply) {
          await this.applyParameters(parameters);
        }

        logger.info('Tuning paramètres terminé', {
          metadata: {
            service: 'AgentParameterTuner',
            operation: 'tuneParameters',
            parametersCount: parameters.length,
            totalImprovement,
            applied: shouldApply
          }
        });

        return {
          parameters,
          totalImprovement,
          applied: shouldApply,
          rollbackNeeded: false
        };
      },
      {
        operation: 'tuneParameters',
        service: 'AgentParameterTuner',
        metadata: {}
      }
    );
  }

  /**
   * Applique les paramètres optimaux
   */
  private async applyParameters(parameters: TunableParameter[]): Promise<void> {
    // Sauvegarder snapshot avant modification
    const snapshot = await this.createSnapshot();
    this.parameterHistory.push(snapshot);

    // Appliquer chaque paramètre
    for (const param of parameters) {
      switch (param.name) {
        case 'AGENT_CODEBASE_SEARCH_TTL':
          this.currentTTLs.codebaseSearch = Math.round(param.optimalValue);
          break;
        case 'AGENT_GREP_TTL':
          this.currentTTLs.grep = Math.round(param.optimalValue);
          break;
        case 'AGENT_AI_RESPONSE_TTL':
          this.currentTTLs.aiResponse = Math.round(param.optimalValue);
          break;
        case 'SEARCH_CACHE_SIMILARITY_THRESHOLD':
          this.currentSimilarityThresholds.searchCache = param.optimalValue;
          break;
        case 'AI_RESPONSE_SIMILARITY_THRESHOLD':
          this.currentSimilarityThresholds.aiResponse = param.optimalValue;
          break;
        case 'PARALLEL_MAX_CONCURRENCY':
          this.currentConcurrency = Math.round(param.optimalValue);
          break;
      }
    }

    logger.info('Paramètres appliqués', {
      metadata: {
        service: 'AgentParameterTuner',
        operation: 'applyParameters',
        parametersCount: parameters.length,
        snapshotId: snapshot.timestamp
      }
    });
  }

  /**
   * Crée un snapshot des paramètres et métriques actuels
   */
  private async createSnapshot(): Promise<ParameterSnapshot> {
    const metrics = await this.analyzeCurrentMetrics();
    
    return {
      timestamp: Date.now(),
      parameters: {
        codebaseSearchTTL: this.currentTTLs.codebaseSearch,
        grepTTL: this.currentTTLs.grep,
        aiResponseTTL: this.currentTTLs.aiResponse,
        searchSimilarityThreshold: this.currentSimilarityThresholds.searchCache,
        aiSimilarityThreshold: this.currentSimilarityThresholds.aiResponse,
        maxConcurrency: this.currentConcurrency,
        batchTimeout: this.currentBatchTimeout,
        maxFiles: this.currentMaxFiles
      },
      metrics: {
        cacheHitRate: (metrics.cacheHitRates.search + metrics.cacheHitRates.aiResponse) / 2,
        avgResponseTime: (metrics.avgResponseTimes.search + metrics.avgResponseTimes.aiResponse) / 2,
        errorRate: metrics.errorRate,
        costPerRequest: metrics.costPerRequest
      }
    };
  }

  /**
   * Vérifie si rollback nécessaire et effectue rollback si dégradation
   */
  async rollbackIfDegraded(): Promise<boolean> {
    return withErrorHandling(
      async () => {
        if (this.parameterHistory.length < 2) {
          return false; // Pas assez d'historique
        }

        const currentSnapshot = await this.createSnapshot();
        const previousSnapshot = this.parameterHistory[this.parameterHistory.length - 1];

        // Calculer dégradation
        const performanceDegradation = 
          (currentSnapshot.metrics.avgResponseTime - previousSnapshot.metrics.avgResponseTime) / 
          previousSnapshot.metrics.avgResponseTime;
        
        const cacheDegradation = 
          (previousSnapshot.metrics.cacheHitRate - currentSnapshot.metrics.cacheHitRate) / 
          previousSnapshot.metrics.cacheHitRate;

        const errorDegradation = 
          (currentSnapshot.metrics.errorRate - previousSnapshot.metrics.errorRate) / 
          (previousSnapshot.metrics.errorRate || 0.01);

        // Vérifier si dégradation significative
        const needsRollback = 
          performanceDegradation > this.ROLLBACK_THRESHOLD ||
          cacheDegradation > this.ROLLBACK_THRESHOLD ||
          errorDegradation > this.ROLLBACK_THRESHOLD;

        if (needsRollback) {
          // Rollback vers snapshot précédent
          const rollbackSnapshot = this.parameterHistory[this.parameterHistory.length - 2];
          
          this.currentTTLs.codebaseSearch = rollbackSnapshot.parameters.codebaseSearchTTL;
          this.currentTTLs.grep = rollbackSnapshot.parameters.grepTTL;
          this.currentTTLs.aiResponse = rollbackSnapshot.parameters.aiResponseTTL;
          this.currentSimilarityThresholds.searchCache = rollbackSnapshot.parameters.searchSimilarityThreshold;
          this.currentSimilarityThresholds.aiResponse = rollbackSnapshot.parameters.aiSimilarityThreshold;
          this.currentConcurrency = rollbackSnapshot.parameters.maxConcurrency;

          logger.warn('Rollback paramètres effectué', {
            metadata: {
              service: 'AgentParameterTuner',
              operation: 'rollbackIfDegraded',
              performanceDegradation: (performanceDegradation * 100).toFixed(1) + '%',
              cacheDegradation: (cacheDegradation * 100).toFixed(1) + '%',
              errorDegradation: (errorDegradation * 100).toFixed(1) + '%'
            }
          });

          return true;
        }

        return false;
      },
      {
        operation: 'rollbackIfDegraded',
        service: 'AgentParameterTuner',
        metadata: {}
      }
    );
  }

  /**
   * Récupère les paramètres actuels
   */
  getCurrentParameters(): {
    ttl: {
      codebaseSearch: number;
      grep: number;
      aiResponse: number;
    };
    similarityThresholds: {
      searchCache: number;
      aiResponse: number;
    };
    concurrency: number;
    batchTimeout: number;
    maxFiles: number;
  } {
    return {
      ttl: { ...this.currentTTLs },
      similarityThresholds: { ...this.currentSimilarityThresholds },
      concurrency: this.currentConcurrency,
      batchTimeout: this.currentBatchTimeout,
      maxFiles: this.currentMaxFiles
    };
  }

  /**
   * Récupère l'historique des paramètres
   */
  getParameterHistory(): ParameterSnapshot[] {
    return [...this.parameterHistory];
  }
}

// ========================================
// SINGLETON INSTANCE
// ========================================

let agentParameterTunerInstance: AgentParameterTuner | null = null;

export function getAgentParameterTuner(storage: IStorage): AgentParameterTuner {
  if (!agentParameterTunerInstance) {
    agentParameterTunerInstance = new AgentParameterTuner(storage);
  }
  return agentParameterTunerInstance;
}

