import { logger } from '../utils/logger';
import { withErrorHandling } from '../utils/error-handler';
import type { IStorage } from '../storage-poc';
import { getToolCallAnalyzer } from './ToolCallAnalyzer';
import { getAgentLearningService } from './AgentLearningService';
import { getAgentPerformanceMetricsService } from './AgentPerformanceMetricsService';

// ========================================
// OPTIMISEUR D'UTILISATION D'OUTILS
// ========================================
// Optimise l'utilisation des outils dans les services agent
// Détecte sous-utilisation, suggère meilleures pratiques
// ========================================

export interface ToolUsageOptimization {
  tool: string;
  service: string;
  issue: 'underused' | 'overused' | 'inefficient' | 'missing';
  description: string;
  recommendation: string;
  estimatedBenefit: number; // ms économisés ou amélioration qualité
  confidence: number; // 0-10
}

export interface ToolUsageStats {
  tool: string;
  usageCount: number;
  avgExecutionTime: number;
  successRate: number;
  cacheHitRate: number;
  lastUsed: number;
  successCount?: number;
  cacheHitCount?: number;
}

/**
 * Service d'optimisation de l'utilisation des outils
 * Analyse utilisation outils et suggère améliorations
 */
export class AgentToolUsageOptimizer {
  private storage: IStorage;
  private toolCallAnalyzer: ReturnType<typeof getToolCallAnalyzer>;
  private learningService: ReturnType<typeof getAgentLearningService>;
  private metricsService: ReturnType<typeof getAgentPerformanceMetricsService>;
  private toolUsageStats: Map<string, ToolUsageStats> = new Map();
  private readonly ANALYSIS_INTERVAL = 10 * 60 * 1000; // 10 minutes
  private lastAnalysis: number = 0;

  constructor(storage: IStorage) {
    if (!storage) {
      throw new Error('Storage requis pour AgentToolUsageOptimizer');
    }
    this.storage = storage;
    this.toolCallAnalyzer = getToolCallAnalyzer(storage);
    this.learningService = getAgentLearningService();
    this.metricsService = getAgentPerformanceMetricsService(storage);
  }

  /**
   * Enregistre l'utilisation d'un outil
   */
  recordToolUsage(
    tool: string,
    service: string,
    executionTime: number,
    success: boolean,
    cached: boolean
  ): void {
    const statsKey = `${service}:${tool}`;
    const existing = this.toolUsageStats.get(statsKey) || {
      tool,
      usageCount: 0,
      avgExecutionTime: 0,
      successRate: 0,
      cacheHitRate: 0,
      lastUsed: Date.now(),
      successCount: 0,
      cacheHitCount: 0
    };

    existing.usageCount++;
    existing.avgExecutionTime = (existing.avgExecutionTime * (existing.usageCount - 1) + executionTime) / existing.usageCount;
    if (success) {
      existing.successCount = (existing.successCount || 0) + 1;
    }
    if (cached) {
      existing.cacheHitCount = (existing.cacheHitCount || 0) + 1;
    }
    existing.successRate = (existing.successCount || 0) / existing.usageCount;
    existing.cacheHitRate = (existing.cacheHitCount || 0) / existing.usageCount;
    existing.lastUsed = Date.now();

    this.toolUsageStats.set(statsKey, existing);
  }

  /**
   * Analyse et optimise l'utilisation des outils
   */
  async optimizeToolUsage(): Promise<{
    optimizations: ToolUsageOptimization[];
    totalEstimatedBenefit: number;
    recommendations: Array<{
      priority: 'high' | 'medium' | 'low';
      action: string;
      tool: string;
      service: string;
    }>;
  }> {
    return withErrorHandling(
      async () => {
        const now = Date.now();
        if (now - this.lastAnalysis < this.ANALYSIS_INTERVAL) {
          return {
            optimizations: [],
            totalEstimatedBenefit: 0,
            recommendations: []
          };
        }

        this.lastAnalysis = now;

        const optimizations: ToolUsageOptimization[] = [];
        const recommendations: Array<{
          priority: 'high' | 'medium' | 'low';
          action: string;
          tool: string;
          service: string;
        }> = [];

        // 1. Analyser patterns tool calls
        const toolCallAnalysis = await this.toolCallAnalyzer.analyzePatterns();

        // 2. Détecter outils sous-utilisés
        const availableTools = ['codebase_search', 'grep', 'read_file', 'write', 'search_replace', 'run_terminal_cmd'];
        const usedTools = new Set(
          Array.from(this.toolUsageStats.values()).map(s => s.tool)
        );

        for (const tool of availableTools) {
          if (!usedTools.has(tool)) {
            optimizations.push({
              tool,
              service: 'all',
              issue: 'missing',
              description: `Outil ${tool} jamais utilisé`,
              recommendation: `Considérer utiliser ${tool} pour automatiser certaines tâches`,
              estimatedBenefit: 5000, // Estimation basée sur potentiel
              confidence: 5
            });

            recommendations.push({
              priority: 'medium',
              action: `Évaluer utilisation de ${tool}`,
              tool,
              service: 'all'
            });
          }
        }

        // 3. Détecter outils inefficaces
        const stats = Array.from(this.toolUsageStats.values());
        for (const stat of stats) {
          const successRate = (stat.successCount || 0) / stat.usageCount;
          const cacheHitRate = (stat.cacheHitCount || 0) / stat.usageCount;

          if (successRate < 0.7 && stat.usageCount > 5) {
            optimizations.push({
              tool: stat.tool,
              service: 'all',
              issue: 'inefficient',
              description: `Outil ${stat.tool} a un taux de succès faible: ${(successRate * 100).toFixed(1)}%`,
              recommendation: `Améliorer gestion d'erreurs ou validation pour ${stat.tool}`,
              estimatedBenefit: stat.avgExecutionTime * stat.usageCount * 0.3,
              confidence: 8
            });

            recommendations.push({
              priority: 'high',
              action: `Améliorer robustesse de ${stat.tool}`,
              tool: stat.tool,
              service: 'all'
            });
          }

          if (cacheHitRate < 0.3 && stat.usageCount > 10) {
            optimizations.push({
              tool: stat.tool,
              service: 'all',
              issue: 'inefficient',
              description: `Outil ${stat.tool} sous-utilise le cache: ${(cacheHitRate * 100).toFixed(1)}% hit rate`,
              recommendation: `Améliorer stratégie de cache pour ${stat.tool}`,
              estimatedBenefit: stat.avgExecutionTime * stat.usageCount * 0.4,
              confidence: 7
            });

            recommendations.push({
              priority: 'medium',
              action: `Optimiser cache pour ${stat.tool}`,
              tool: stat.tool,
              service: 'all'
            });
          }
        }

        // 4. Analyser avec métriques performance
        const metrics = this.metricsService.getMetrics();
        if (metrics.toolCalls.total > 0) {
          const cacheHitRate = (metrics.toolCalls.cached / metrics.toolCalls.total) * 100;
          if (cacheHitRate < 50) {
            optimizations.push({
              tool: 'all',
              service: 'all',
              issue: 'inefficient',
              description: `Cache hit rate global faible: ${cacheHitRate.toFixed(1)}%`,
              recommendation: 'Améliorer stratégie de cache globale',
              estimatedBenefit: metrics.toolCalls.total * 200 * 0.5, // 50% amélioration estimée
              confidence: 6
            });

            recommendations.push({
              priority: 'high',
              action: 'Optimiser stratégie de cache globale',
              tool: 'all',
              service: 'all'
            });
          }
        }

        // 5. Analyser avec learning service
        try {
          const { successPatterns } = await this.learningService.analyzeHistoricalPatterns(7);
          for (const pattern of successPatterns) {
            if (pattern.metadata?.commonContexts) {
              // Si pattern utilise beaucoup de contexte, suggérer préchargement
              if (pattern.metadata.commonContexts.length > 3) {
                optimizations.push({
                  tool: 'codebase_search',
                  service: 'learning-based',
                  issue: 'underused',
                  description: `Pattern ${pattern.queryType} pourrait bénéficier de préchargement`,
                  recommendation: `Précharger contexte pour ${pattern.queryType}`,
                  estimatedBenefit: pattern.avgExecutionTime * pattern.usageCount * 0.3,
                  confidence: 7
                });
              }
            }
          }
        } catch (error) {
          logger.debug('Erreur analyse patterns pour optimisation outils', {
            metadata: {
              service: 'AgentToolUsageOptimizer',
              operation: 'optimizeToolUsage',
              error: error instanceof Error ? error.message : String(error)
            }
          });
        }

        const totalEstimatedBenefit = optimizations.reduce((sum, opt) => sum + opt.estimatedBenefit, 0);

        logger.info('Optimisation utilisation outils terminée', {
          metadata: {
            service: 'AgentToolUsageOptimizer',
            operation: 'optimizeToolUsage',
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
        operation: 'optimizeToolUsage',
        service: 'AgentToolUsageOptimizer',
        metadata: {}
      }
    );
  }

  /**
   * Suggère meilleur outil pour une tâche
   */
  suggestBestTool(
    task: string,
    context?: {
      files?: string[];
      operationType?: string;
    }
  ): {
    tool: string;
    confidence: number;
    reasoning: string;
  } {
    const taskLower = task.toLowerCase();

    // Mapping basique tâches → outils
    if (taskLower.includes('chercher') || taskLower.includes('search') || taskLower.includes('trouver')) {
      return {
        tool: 'codebase_search',
        confidence: 8,
        reasoning: 'Recherche sémantique recommandée pour cette tâche'
      };
    }

    if (taskLower.includes('grep') || taskLower.includes('pattern') || taskLower.includes('regex')) {
      return {
        tool: 'grep',
        confidence: 9,
        reasoning: 'Recherche pattern exacte recommandée'
      };
    }

    if (taskLower.includes('lire') || taskLower.includes('read') || taskLower.includes('fichier')) {
      return {
        tool: 'read_file',
        confidence: 8,
        reasoning: 'Lecture fichier recommandée'
      };
    }

    if (taskLower.includes('exécuter') || taskLower.includes('run') || taskLower.includes('commande')) {
      return {
        tool: 'run_terminal_cmd',
        confidence: 7,
        reasoning: 'Exécution commande recommandée'
      };
    }

    // Par défaut, codebase_search
    return {
      tool: 'codebase_search',
      confidence: 5,
      reasoning: 'Outil par défaut pour recherche'
    };
  }

  /**
   * Récupère statistiques d'utilisation des outils
   */
  getToolUsageStats(): {
    totalTools: number;
    mostUsed: Array<{ tool: string; usageCount: number }>;
    avgSuccessRate: number;
    avgCacheHitRate: number;
  } {
    const stats = Array.from(this.toolUsageStats.values());
    const avgSuccessRate = stats.length > 0
      ? stats.reduce((sum, s) => sum + ((s.successCount || 0) / s.usageCount), 0) / stats.length
      : 0;
    const avgCacheHitRate = stats.length > 0
      ? stats.reduce((sum, s) => sum + ((s.cacheHitCount || 0) / s.usageCount), 0) / stats.length
      : 0;

    const mostUsed = stats
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 10)
      .map(s => ({ tool: s.tool, usageCount: s.usageCount }));

    return {
      totalTools: stats.length,
      mostUsed,
      avgSuccessRate,
      avgCacheHitRate
    };
  }
}

// ========================================
// SINGLETON
// ========================================

let agentToolUsageOptimizerInstance: AgentToolUsageOptimizer | null = null;

export function getAgentToolUsageOptimizer(storage: IStorage): AgentToolUsageOptimizer {
  if (!agentToolUsageOptimizerInstance) {
    agentToolUsageOptimizerInstance = new AgentToolUsageOptimizer(storage);
  }
  return agentToolUsageOptimizerInstance;
}

