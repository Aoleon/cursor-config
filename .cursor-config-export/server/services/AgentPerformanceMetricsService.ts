import { logger } from '../utils/logger';
import { withErrorHandling } from '../utils/error-handler';
import { getTechnicalMetricsService } from './consolidated/TechnicalMetricsService';
import { getToolCallAnalyzer } from './ToolCallAnalyzer';
import type { IStorage } from '../storage-poc';

// ========================================
// TYPES ET INTERFACES
// ========================================

export interface AgentPerformanceMetrics {
  toolCalls: {
    total: number;
    cached: number;
    cacheHitRate: number;
    averageDuration: number;
  };
  context: {
    averageSize: number;
    optimizations: number;
    evictions: number;
    averageOptimizationTime: number;
  };
  parallelization: {
    totalOperations: number;
    parallelized: number;
    sequential: number;
    averageTimeSaved: number;
  };
  checkpointing: {
    totalCheckpoints: number;
    resumed: number;
    averageCheckpointTime: number;
  };
  aiRequests: {
    total: number;
    cached: number;
    batched: number;
    averageResponseTime: number;
  };
  runDuration: {
    average: number;
    longest: number;
    shortest: number;
    totalRuns: number;
  };
}

export interface AgentMetricsSnapshot {
  timestamp: number;
  metrics: AgentPerformanceMetrics;
  sessionId?: string;
}

export interface HistoricalMetrics {
  snapshots: AgentMetricsSnapshot[];
  period: {
    start: Date;
    end: Date;
  };
  summary: {
    avgResponseTime: number;
    avgCacheHitRate: number;
    avgErrorRate: number;
    totalOperations: number;
    trends: {
      responseTime: 'increasing' | 'decreasing' | 'stable';
      cacheHitRate: 'increasing' | 'decreasing' | 'stable';
      errorRate: 'increasing' | 'decreasing' | 'stable';
    };
  };
}

// ========================================
// AGENT PERFORMANCE METRICS SERVICE
// ========================================

/**
 * Service de métriques de performance pour l'agent Cursor
 * Track les métriques de performance et les intègre avec TechnicalMetricsService
 */
export class AgentPerformanceMetricsService {
  private storage: IStorage;
  private technicalMetrics: ReturnType<typeof getTechnicalMetricsService>;
  private toolCallAnalyzer: ReturnType<typeof getToolCallAnalyzer>;
  private currentMetrics: AgentPerformanceMetrics = {
    toolCalls: {
      total: 0,
      cached: 0,
      cacheHitRate: 0,
      averageDuration: 0
    },
    context: {
      averageSize: 0,
      optimizations: 0,
      evictions: 0,
      averageOptimizationTime: 0
    },
    parallelization: {
      totalOperations: 0,
      parallelized: 0,
      sequential: 0,
      averageTimeSaved: 0
    },
    checkpointing: {
      totalCheckpoints: 0,
      resumed: 0,
      averageCheckpointTime: 0
    },
    aiRequests: {
      total: 0,
      cached: 0,
      batched: 0,
      averageResponseTime: 0
    },
    runDuration: {
      average: 0,
      longest: 0,
      shortest: Infinity,
      totalRuns: 0
    }
  };

  private runStartTime: number | null = null;
  private runDurations: number[] = [];
  private snapshots: AgentMetricsSnapshot[] = [];
  private readonly MAX_SNAPSHOTS = 1000; // Limiter nombre de snapshots en mémoire

  constructor(storage: IStorage) {
    if (!storage) {
      throw new Error('Storage requis pour AgentPerformanceMetricsService');
    }
    this.storage = storage;
    this.technicalMetrics = getTechnicalMetricsService(storage);
    this.toolCallAnalyzer = getToolCallAnalyzer(storage);
  }

  /**
   * Enregistre un tool call
   */
  recordToolCall(
    cached: boolean = false,
    duration: number = 0,
    toolName?: string,
    metadata?: {
      query?: string;
      filePath?: string;
      resultCount?: number;
      errorType?: string;
    }
  ): void {
    this.currentMetrics.toolCalls.total++;
    if (cached) {
      this.currentMetrics.toolCalls.cached++;
    }
    
    // Mettre à jour cache hit rate
    this.currentMetrics.toolCalls.cacheHitRate = 
      this.currentMetrics.toolCalls.total > 0
        ? (this.currentMetrics.toolCalls.cached / this.currentMetrics.toolCalls.total) * 100
        : 0;
    
    // Mettre à jour durée moyenne
    if (duration > 0) {
      const currentAvg = this.currentMetrics.toolCalls.averageDuration;
      const total = this.currentMetrics.toolCalls.total;
      this.currentMetrics.toolCalls.averageDuration = 
        ((currentAvg * (total - 1)) + duration) / total;
    }

    // Enregistrer dans ToolCallAnalyzer pour analyse patterns
    if (toolName) {
      this.toolCallAnalyzer.recordToolCall({
        toolName,
        timestamp: Date.now(),
        duration,
        cached,
        success: true, // À améliorer avec tracking erreurs
        metadata
      });
    }
  }

  /**
   * Enregistre une optimisation de contexte
   */
  recordContextOptimization(
    originalSize: number,
    optimizedSize: number,
    optimizationTime: number
  ): void {
    this.currentMetrics.context.optimizations++;
    this.currentMetrics.context.evictions += (originalSize - optimizedSize);
    
    // Mettre à jour taille moyenne
    const currentAvg = this.currentMetrics.context.averageSize;
    const total = this.currentMetrics.context.optimizations;
    this.currentMetrics.context.averageSize = 
      ((currentAvg * (total - 1)) + optimizedSize) / total;
    
    // Mettre à jour temps moyen d'optimisation
    const currentAvgTime = this.currentMetrics.context.averageOptimizationTime;
    this.currentMetrics.context.averageOptimizationTime = 
      ((currentAvgTime * (total - 1)) + optimizationTime) / total;
  }

  /**
   * Enregistre des opérations parallélisées
   */
  recordParallelization(
    totalOperations: number,
    parallelized: number,
    timeSaved: number
  ): void {
    this.currentMetrics.parallelization.totalOperations += totalOperations;
    this.currentMetrics.parallelization.parallelized += parallelized;
    this.currentMetrics.parallelization.sequential += (totalOperations - parallelized);
    
    // Mettre à jour temps moyen économisé
    const currentAvg = this.currentMetrics.parallelization.averageTimeSaved;
    const total = this.currentMetrics.parallelization.parallelized;
    this.currentMetrics.parallelization.averageTimeSaved = 
      total > 0 ? ((currentAvg * (total - 1)) + timeSaved) / total : 0;
  }

  /**
   * Enregistre un checkpoint
   */
  recordCheckpoint(
    checkpointTime: number,
    resumed: boolean = false
  ): void {
    this.currentMetrics.checkpointing.totalCheckpoints++;
    if (resumed) {
      this.currentMetrics.checkpointing.resumed++;
    }
    
    // Mettre à jour temps moyen de checkpoint
    const currentAvg = this.currentMetrics.checkpointing.averageCheckpointTime;
    const total = this.currentMetrics.checkpointing.totalCheckpoints;
    this.currentMetrics.checkpointing.averageCheckpointTime = 
      ((currentAvg * (total - 1)) + checkpointTime) / total;
  }

  /**
   * Enregistre une requête IA
   */
  recordAIRequest(
    cached: boolean = false,
    batched: boolean = false,
    responseTime: number = 0
  ): void {
    this.currentMetrics.aiRequests.total++;
    if (cached) {
      this.currentMetrics.aiRequests.cached++;
    }
    if (batched) {
      this.currentMetrics.aiRequests.batched++;
    }
    
    // Mettre à jour temps de réponse moyen
    if (responseTime > 0) {
      const currentAvg = this.currentMetrics.aiRequests.averageResponseTime;
      const total = this.currentMetrics.aiRequests.total;
      this.currentMetrics.aiRequests.averageResponseTime = 
        ((currentAvg * (total - 1)) + responseTime) / total;
    }
  }

  /**
   * Démarre le tracking d'un run
   */
  startRun(): void {
    this.runStartTime = Date.now();
  }

  /**
   * Termine le tracking d'un run
   */
  endRun(): void {
    if (this.runStartTime === null) {
      return;
    }
    
    const duration = Date.now() - this.runStartTime;
    this.runDurations.push(duration);
    
    // Mettre à jour métriques de durée
    this.currentMetrics.runDuration.totalRuns++;
    this.currentMetrics.runDuration.longest = Math.max(
      this.currentMetrics.runDuration.longest,
      duration
    );
    this.currentMetrics.runDuration.shortest = Math.min(
      this.currentMetrics.runDuration.shortest,
      duration
    );
    
    // Mettre à jour durée moyenne
    const total = this.currentMetrics.runDuration.totalRuns;
    const currentAvg = this.currentMetrics.runDuration.average;
    this.currentMetrics.runDuration.average = 
      ((currentAvg * (total - 1)) + duration) / total;
    
    this.runStartTime = null;
    
    logger.info('Run terminé, métriques enregistrées', {
      metadata: {
        service: 'AgentPerformanceMetricsService',
        operation: 'endRun',
        duration,
        totalRuns: this.currentMetrics.runDuration.totalRuns
      }
    });
  }

  /**
   * Récupère les métriques actuelles
   */
  getMetrics(): AgentPerformanceMetrics {
    return { ...this.currentMetrics };
  }

  /**
   * Crée un snapshot des métriques
   */
  createSnapshot(sessionId?: string): AgentMetricsSnapshot {
    const snapshot: AgentMetricsSnapshot = {
      timestamp: Date.now(),
      metrics: this.getMetrics(),
      sessionId
    };
    
    // Stocker snapshot
    this.snapshots.push(snapshot);
    
    // Limiter nombre de snapshots
    if (this.snapshots.length > this.MAX_SNAPSHOTS) {
      this.snapshots = this.snapshots.slice(-this.MAX_SNAPSHOTS);
    }
    
    return snapshot;
  }

  /**
   * Exporte les métriques historiques pour RegressionDetector
   */
  async exportHistoricalMetrics(
    startDate: Date,
    endDate: Date
  ): Promise<HistoricalMetrics> {
    return withErrorHandling(
      async () => {
        // Filtrer snapshots dans la période
        const filteredSnapshots = this.snapshots.filter(s => {
          const snapshotDate = new Date(s.timestamp);
          return snapshotDate >= startDate && snapshotDate <= endDate;
        });

        if (filteredSnapshots.length === 0) {
          return {
            snapshots: [],
            period: { start: startDate, end: endDate },
            summary: {
              avgResponseTime: 0,
              avgCacheHitRate: 0,
              avgErrorRate: 0,
              totalOperations: 0,
              trends: {
                responseTime: 'stable',
                cacheHitRate: 'stable',
                errorRate: 'stable'
              }
            }
          };
        }

        // Calculer moyennes
        const avgResponseTime = filteredSnapshots.reduce((sum, s) => 
          sum + s.metrics.aiRequests.averageResponseTime, 0
        ) / filteredSnapshots.length;

        const avgCacheHitRate = filteredSnapshots.reduce((sum, s) => 
          sum + s.metrics.toolCalls.cacheHitRate, 0
        ) / filteredSnapshots.length;

        const totalOperations = filteredSnapshots.reduce((sum, s) => 
          sum + s.metrics.toolCalls.total, 0
        );

        // Calculer taux d'erreur (approximation basée sur métriques disponibles)
        const avgErrorRate = 0; // À améliorer avec données réelles

        // Calculer tendances
        const firstHalf = filteredSnapshots.slice(0, Math.floor(filteredSnapshots.length / 2));
        const secondHalf = filteredSnapshots.slice(Math.floor(filteredSnapshots.length / 2));

        const firstHalfAvgResponse = firstHalf.reduce((sum, s) => 
          sum + s.metrics.aiRequests.averageResponseTime, 0
        ) / firstHalf.length;
        const secondHalfAvgResponse = secondHalf.reduce((sum, s) => 
          sum + s.metrics.aiRequests.averageResponseTime, 0
        ) / secondHalf.length;

        const firstHalfAvgCache = firstHalf.reduce((sum, s) => 
          sum + s.metrics.toolCalls.cacheHitRate, 0
        ) / firstHalf.length;
        const secondHalfAvgCache = secondHalf.reduce((sum, s) => 
          sum + s.metrics.toolCalls.cacheHitRate, 0
        ) / secondHalf.length;

        const responseTimeTrend = 
          secondHalfAvgResponse > firstHalfAvgResponse * 1.1 ? 'increasing' :
          secondHalfAvgResponse < firstHalfAvgResponse * 0.9 ? 'decreasing' : 'stable';

        const cacheHitRateTrend = 
          secondHalfAvgCache > firstHalfAvgCache * 1.1 ? 'increasing' :
          secondHalfAvgCache < firstHalfAvgCache * 0.9 ? 'decreasing' : 'stable';

        return {
          snapshots: filteredSnapshots,
          period: { start: startDate, end: endDate },
          summary: {
            avgResponseTime,
            avgCacheHitRate,
            avgErrorRate,
            totalOperations,
            trends: {
              responseTime: responseTimeTrend,
              cacheHitRate: cacheHitRateTrend,
              errorRate: 'stable' // À améliorer avec données réelles
            }
          }
        };
      },
      {
        operation: 'exportHistoricalMetrics',
        service: 'AgentPerformanceMetricsService',
        metadata: { startDate, endDate }
      }
    );
  }

  /**
   * Réinitialise les métriques
   */
  resetMetrics(): void {
    this.currentMetrics = {
      toolCalls: {
        total: 0,
        cached: 0,
        cacheHitRate: 0,
        averageDuration: 0
      },
      context: {
        averageSize: 0,
        optimizations: 0,
        evictions: 0,
        averageOptimizationTime: 0
      },
      parallelization: {
        totalOperations: 0,
        parallelized: 0,
        sequential: 0,
        averageTimeSaved: 0
      },
      checkpointing: {
        totalCheckpoints: 0,
        resumed: 0,
        averageCheckpointTime: 0
      },
      aiRequests: {
        total: 0,
        cached: 0,
        batched: 0,
        averageResponseTime: 0
      },
      runDuration: {
        average: 0,
        longest: 0,
        shortest: Infinity,
        totalRuns: 0
      }
    };
    
    this.runDurations = [];
    this.runStartTime = null;
    
    logger.info('Métriques réinitialisées', {
      metadata: {
        service: 'AgentPerformanceMetricsService',
        operation: 'resetMetrics'
      }
    });
  }

  /**
   * Intègre les métriques avec TechnicalMetricsService
   */
  async integrateWithTechnicalMetrics(): Promise<void> {
    return withErrorHandling(
      async () => {
        // Les métriques de l'agent peuvent être intégrées dans le pipeline de métriques techniques
        // via des appels à TechnicalMetricsService si nécessaire
        
        logger.debug('Métriques agent intégrées avec TechnicalMetricsService', {
          metadata: {
            service: 'AgentPerformanceMetricsService',
            operation: 'integrateWithTechnicalMetrics',
            metrics: this.getMetrics()
          }
        });
      },
      {
        operation: 'integrateWithTechnicalMetrics',
        service: 'AgentPerformanceMetricsService',
        metadata: {}
      }
    );
  }

  /**
   * Analyse les patterns de tool calls pour optimisations
   */
  async analyzeToolCallPatterns(): Promise<ReturnType<typeof this.toolCallAnalyzer.analyzePatterns>> {
    return this.toolCallAnalyzer.analyzePatterns();
  }

  /**
   * Prédit les tool calls probables pour une tâche
   */
  async predictToolCalls(
    taskDescription: string,
    context?: {
      currentFiles?: string[];
      recentToolCalls?: string[];
    }
  ): Promise<ReturnType<typeof this.toolCallAnalyzer.predictToolCalls>> {
    return this.toolCallAnalyzer.predictToolCalls(taskDescription, context);
  }
}

// ========================================
// SINGLETON INSTANCE
// ========================================

let agentPerformanceMetricsServiceInstance: AgentPerformanceMetricsService | null = null;

export function getAgentPerformanceMetricsService(
  storage: IStorage
): AgentPerformanceMetricsService {
  if (!agentPerformanceMetricsServiceInstance) {
    agentPerformanceMetricsServiceInstance = new AgentPerformanceMetricsService(storage);
  }
  return agentPerformanceMetricsServiceInstance;
}

