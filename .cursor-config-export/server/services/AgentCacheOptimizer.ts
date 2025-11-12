import { logger } from '../utils/logger';
import { withErrorHandling } from '../utils/error-handler';
import type { IStorage } from '../storage-poc';
import { getAgentSearchCacheService } from './AgentSearchCacheService';
import { getAgentLearningService } from './AgentLearningService';

// ========================================
// OPTIMISEUR DE CACHE
// ========================================
// Optimise l'utilisation du cache dans tous les services agent
// Analyse patterns d'accès, ajuste TTL, prédit besoins
// ========================================

export interface CacheOptimizationResult {
  optimizations: Array<{
    service: string;
    operation: string;
    optimization: string;
    estimatedBenefit: number; // ms économisés
    confidence: number; // 0-10
  }>;
  totalEstimatedBenefit: number;
  recommendations: Array<{
    priority: 'high' | 'medium' | 'low';
    action: string;
    service: string;
  }>;
}

export interface CacheAccessPattern {
  key: string;
  service: string;
  operation: string;
  accessCount: number;
  hitRate: number;
  avgAccessTime: number;
  lastAccess: number;
  ttl?: number;
  hits?: number;
  misses?: number;
}

/**
 * Service d'optimisation du cache pour services agent
 * Analyse patterns d'accès et optimise stratégies de cache
 */
export class AgentCacheOptimizer {
  private storage: IStorage;
  private searchCache: ReturnType<typeof getAgentSearchCacheService>;
  private learningService: ReturnType<typeof getAgentLearningService>;
  private accessPatterns: Map<string, CacheAccessPattern> = new Map();
  private readonly ANALYSIS_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private lastAnalysis: number = 0;

  constructor(storage: IStorage) {
    if (!storage) {
      throw new Error('Storage requis pour AgentCacheOptimizer');
    }
    this.storage = storage;
    this.searchCache = getAgentSearchCacheService();
    this.learningService = getAgentLearningService();
  }

  /**
   * Enregistre un accès cache
   */
  recordCacheAccess(
    key: string,
    service: string,
    operation: string,
    hit: boolean,
    accessTime: number
  ): void {
    const patternKey = `${service}:${operation}:${key}`;
    const existing = this.accessPatterns.get(patternKey) || {
      key,
      service,
      operation,
      accessCount: 0,
      hitRate: 0,
      avgAccessTime: 0,
      lastAccess: Date.now(),
      hits: 0,
      misses: 0
    };

    existing.accessCount++;
    if (hit) {
      existing.hits = (existing.hits || 0) + 1;
    } else {
      existing.misses = (existing.misses || 0) + 1;
    }
    existing.hitRate = (existing.hits || 0) / existing.accessCount;
    existing.avgAccessTime = (existing.avgAccessTime * (existing.accessCount - 1) + accessTime) / existing.accessCount;
    existing.lastAccess = Date.now();

    this.accessPatterns.set(patternKey, existing);
  }

  /**
   * Analyse et optimise le cache
   */
  async optimizeCache(): Promise<CacheOptimizationResult> {
    return withErrorHandling(
      async () => {
        const now = Date.now();
        if (now - this.lastAnalysis < this.ANALYSIS_INTERVAL) {
          // Trop tôt pour ré-analyser
          return {
            optimizations: [],
            totalEstimatedBenefit: 0,
            recommendations: []
          };
        }

        this.lastAnalysis = now;

        const optimizations: CacheOptimizationResult['optimizations'] = [];
        const recommendations: CacheOptimizationResult['recommendations'] = [];

        // 1. Analyser patterns d'accès
        const patterns = Array.from(this.accessPatterns.values());

        // 2. Identifier patterns à faible hit rate
        const lowHitRatePatterns = patterns.filter(p => p.hitRate < 0.5 && p.accessCount > 5);
        for (const pattern of lowHitRatePatterns) {
          optimizations.push({
            service: pattern.service,
            operation: pattern.operation,
            optimization: `Augmenter TTL pour ${pattern.key} (hit rate: ${(pattern.hitRate * 100).toFixed(1)}%)`,
            estimatedBenefit: pattern.avgAccessTime * pattern.accessCount * 0.3, // 30% amélioration estimée
            confidence: 7
          });

          recommendations.push({
            priority: 'medium',
            action: `Augmenter TTL cache pour ${pattern.operation} dans ${pattern.service}`,
            service: pattern.service
          });
        }

        // 3. Identifier patterns à haute fréquence
        const highFrequencyPatterns = patterns.filter(p => p.accessCount > 20 && p.hitRate > 0.7);
        for (const pattern of highFrequencyPatterns) {
          optimizations.push({
            service: pattern.service,
            operation: pattern.operation,
            optimization: `Précharger ${pattern.key} (${pattern.accessCount} accès, hit rate: ${(pattern.hitRate * 100).toFixed(1)}%)`,
            estimatedBenefit: pattern.avgAccessTime * pattern.accessCount * 0.5, // 50% amélioration estimée
            confidence: 8
          });

          recommendations.push({
            priority: 'high',
            action: `Précharger cache pour ${pattern.operation} dans ${pattern.service}`,
            service: pattern.service
          });
        }

        // 4. Identifier patterns obsolètes
        const stalePatterns = patterns.filter(
          p => Date.now() - p.lastAccess > 30 * 60 * 1000 && p.accessCount < 3
        );
        for (const pattern of stalePatterns) {
          optimizations.push({
            service: pattern.service,
            operation: pattern.operation,
            optimization: `Nettoyer cache obsolète pour ${pattern.key}`,
            estimatedBenefit: 100, // Bénéfice mémoire
            confidence: 6
          });

          recommendations.push({
            priority: 'low',
            action: `Nettoyer cache obsolète pour ${pattern.operation} dans ${pattern.service}`,
            service: pattern.service
          });
        }

        // 5. Analyser avec learning service
        try {
          const { successPatterns } = await this.learningService.analyzeHistoricalPatterns(7);
          for (const pattern of successPatterns) {
            if (pattern.metadata?.cacheHitRate && pattern.metadata.cacheHitRate > 0.8) {
              optimizations.push({
                service: 'learning-based',
                operation: pattern.queryType,
                optimization: `Pattern historique détecté: optimiser cache pour ${pattern.queryType}`,
                estimatedBenefit: pattern.avgExecutionTime * pattern.usageCount * 0.2,
                confidence: 7
              });
            }
          }
        } catch (error) {
          logger.debug('Erreur analyse patterns historiques pour cache', {
            metadata: {
              service: 'AgentCacheOptimizer',
              operation: 'optimizeCache',
              error: error instanceof Error ? error.message : String(error)
            }
          });
        }

        const totalEstimatedBenefit = optimizations.reduce((sum, opt) => sum + opt.estimatedBenefit, 0);

        logger.info('Optimisation cache terminée', {
          metadata: {
            service: 'AgentCacheOptimizer',
            operation: 'optimizeCache',
            optimizationsCount: optimizations.length,
            totalEstimatedBenefit,
            recommendationsCount: recommendations.length
          }
        });

        return {
          optimizations,
          totalEstimatedBenefit,
          recommendations
        };
      },
      {
        operation: 'optimizeCache',
        service: 'AgentCacheOptimizer',
        metadata: {}
      }
    );
  }

  /**
   * Prédit besoins de cache pour une opération
   */
  predictCacheNeeds(service: string, operation: string): {
    shouldCache: boolean;
    recommendedTTL: number; // ms
    confidence: number; // 0-10
  } {
    const patterns = Array.from(this.accessPatterns.values()).filter(
      p => p.service === service && p.operation === operation
    );

    if (patterns.length === 0) {
      return {
        shouldCache: false,
        recommendedTTL: 0,
        confidence: 0
      };
    }

    const avgHitRate = patterns.reduce((sum, p) => sum + p.hitRate, 0) / patterns.length;
    const avgAccessCount = patterns.reduce((sum, p) => sum + p.accessCount, 0) / patterns.length;

    const shouldCache = avgHitRate > 0.3 || avgAccessCount > 5;
    const recommendedTTL = shouldCache
      ? Math.min(30 * 60 * 1000, Math.max(1 * 60 * 1000, avgAccessCount * 1000))
      : 0;
    const confidence = Math.min(10, (avgHitRate * 5 + Math.min(avgAccessCount / 10, 5)));

    return {
      shouldCache,
      recommendedTTL,
      confidence
    };
  }

  /**
   * Nettoie patterns obsolètes
   */
  cleanupStalePatterns(): void {
    const now = Date.now();
    const staleThreshold = 60 * 60 * 1000; // 1 heure

    for (const [key, pattern] of Array.from(this.accessPatterns.entries())) {
      if (now - pattern.lastAccess > staleThreshold && pattern.accessCount < 3) {
        this.accessPatterns.delete(key);
      }
    }

    logger.debug('Patterns cache obsolètes nettoyés', {
      metadata: {
        service: 'AgentCacheOptimizer',
        operation: 'cleanupStalePatterns',
        patternsRemoved: this.accessPatterns.size
      }
    });
  }

  /**
   * Récupère statistiques de cache
   */
  getCacheStats(): {
    totalPatterns: number;
    avgHitRate: number;
    highFrequencyPatterns: number;
    lowHitRatePatterns: number;
  } {
    const patterns = Array.from(this.accessPatterns.values());
    const avgHitRate = patterns.length > 0
      ? patterns.reduce((sum, p) => sum + p.hitRate, 0) / patterns.length
      : 0;

    return {
      totalPatterns: patterns.length,
      avgHitRate,
      highFrequencyPatterns: patterns.filter(p => p.accessCount > 20).length,
      lowHitRatePatterns: patterns.filter(p => p.hitRate < 0.5 && p.accessCount > 5).length
    };
  }
}

// ========================================
// SINGLETON
// ========================================

let agentCacheOptimizerInstance: AgentCacheOptimizer | null = null;

export function getAgentCacheOptimizer(storage: IStorage): AgentCacheOptimizer {
  if (!agentCacheOptimizerInstance) {
    agentCacheOptimizerInstance = new AgentCacheOptimizer(storage);
  }
  return agentCacheOptimizerInstance;
}

