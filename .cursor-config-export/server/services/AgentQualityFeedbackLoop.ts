import { logger } from '../utils/logger';
import { withErrorHandling } from '../utils/error-handler';
import { getAgentQualityLearning } from './AgentQualityLearning';
import { getAgentIntelligentSuggester } from './AgentIntelligentSuggester';
import { getAgentPerformanceOptimizer } from './AgentPerformanceOptimizer';
import type { IStorage } from '../storage-poc';

// ========================================
// TYPES ET INTERFACES
// ========================================

export interface FeedbackData {
  context: string;
  issue: string;
  solution: string;
  qualityBefore: number;
  qualityAfter: number;
  duration: number; // ms
  success: boolean;
}

export interface FeedbackLoopResult {
  learned: boolean;
  patternsUpdated: number;
  suggestionsImproved: number;
  performanceOptimized: boolean;
  nextRecommendations: Array<{
    action: string;
    priority: 'low' | 'medium' | 'high';
    estimatedImpact: number;
  }>;
}

// ========================================
// AGENT QUALITY FEEDBACK LOOP
// ========================================

/**
 * Service de boucle de feedback pour amélioration continue
 * Apprend des résultats, améliore suggestions et optimise performance
 * Améliore qualité et performance de manière continue
 */
export class AgentQualityFeedbackLoop {
  private storage: IStorage;
  private qualityLearning: ReturnType<typeof getAgentQualityLearning>;
  private intelligentSuggester: ReturnType<typeof getAgentIntelligentSuggester>;
  private performanceOptimizer: ReturnType<typeof getAgentPerformanceOptimizer>;
  private feedbackHistory: FeedbackData[] = [];
  private readonly MAX_FEEDBACK_HISTORY = 1000;

  constructor(storage: IStorage) {
    if (!storage) {
      throw new Error('Storage requis pour AgentQualityFeedbackLoop');
    }
    this.storage = storage;
    this.qualityLearning = getAgentQualityLearning(storage);
    this.intelligentSuggester = getAgentIntelligentSuggester(storage);
    this.performanceOptimizer = getAgentPerformanceOptimizer(storage);
  }

  /**
   * Traite feedback et améliore système
   */
  async processFeedback(
    feedback: FeedbackData
  ): Promise<FeedbackLoopResult> {
    return withErrorHandling(
      async () => {
        // 1. Enregistrer feedback
        this.feedbackHistory.push(feedback);
        if (this.feedbackHistory.length > this.MAX_FEEDBACK_HISTORY) {
          this.feedbackHistory.shift();
        }

        // 2. Apprendre du feedback
        let learned = false;
        let patternsUpdated = 0;

        if (feedback.success && feedback.qualityAfter > feedback.qualityBefore) {
          await this.qualityLearning.learnFromResult(
            feedback.context,
            feedback.issue,
            feedback.solution,
            feedback.qualityBefore,
            feedback.qualityAfter
          );
          learned = true;
          patternsUpdated = 1;
        }

        // 3. Optimiser performance si nécessaire
        let performanceOptimized = false;
        if (feedback.duration > 5000) {
          // Analyser performance et optimiser
          const analysis = await this.performanceOptimizer.analyzePerformance();
          if (analysis.recommendations.length > 0) {
            performanceOptimized = true;
          }
        }

        // 4. Générer recommandations suivantes
        const nextRecommendations = await this.generateNextRecommendations(feedback);

        logger.info('Feedback traité', {
          metadata: {
            service: 'AgentQualityFeedbackLoop',
            operation: 'processFeedback',
            context: feedback.context,
            learned,
            patternsUpdated,
            performanceOptimized,
            recommendationsCount: nextRecommendations.length
          }
        });

        return {
          learned,
          patternsUpdated,
          suggestionsImproved: learned ? 1 : 0,
          performanceOptimized,
          nextRecommendations
        };
      },
      {
        operation: 'processFeedback',
        service: 'AgentQualityFeedbackLoop',
        metadata: {}
      }
    );
  }

  /**
   * Génère recommandations suivantes basées sur feedback
   */
  private async generateNextRecommendations(
    feedback: FeedbackData
  ): Promise<Array<{
    action: string;
    priority: 'low' | 'medium' | 'high';
    estimatedImpact: number;
  }>> {
    const recommendations: Array<{
      action: string;
      priority: 'low' | 'medium' | 'high';
      estimatedImpact: number;
    }> = [];

    // Si succès, recommander d'appliquer solution similaire ailleurs
    if (feedback.success) {
      recommendations.push({
        action: `Appliquer solution similaire pour: ${feedback.issue}`,
        priority: 'medium',
        estimatedImpact: feedback.qualityAfter - feedback.qualityBefore
      });
    }

    // Si échec, recommander d'analyser pourquoi
    if (!feedback.success) {
      recommendations.push({
        action: `Analyser échec pour: ${feedback.issue}`,
        priority: 'high',
        estimatedImpact: 20
      });
    }

    // Si performance lente, recommander optimisation
    if (feedback.duration > 5000) {
      recommendations.push({
        action: 'Optimiser performance opération',
        priority: 'high',
        estimatedImpact: 30
      });
    }

    return recommendations;
  }

  /**
   * Traite batch de feedbacks
   */
  async processBatchFeedback(
    feedbacks: FeedbackData[]
  ): Promise<{
    processed: number;
    learned: number;
    patternsUpdated: number;
    performanceOptimized: boolean;
    summary: {
      avgQualityImprovement: number;
      avgDuration: number;
      successRate: number;
    };
  }> {
    return withErrorHandling(
      async () => {
        let learned = 0;
        let patternsUpdated = 0;
        let totalQualityImprovement = 0;
        let totalDuration = 0;
        let successCount = 0;

        for (const feedback of feedbacks) {
          const result = await this.processFeedback(feedback);
          if (result.learned) {
            learned++;
            patternsUpdated += result.patternsUpdated;
          }
          if (feedback.success) {
            successCount++;
            totalQualityImprovement += feedback.qualityAfter - feedback.qualityBefore;
          }
          totalDuration += feedback.duration;
        }

        const avgQualityImprovement = feedbacks.length > 0
          ? totalQualityImprovement / feedbacks.length
          : 0;
        const avgDuration = feedbacks.length > 0
          ? totalDuration / feedbacks.length
          : 0;
        const successRate = feedbacks.length > 0
          ? successCount / feedbacks.length
          : 0;

        // Analyser performance globale
        const performanceAnalysis = await this.performanceOptimizer.analyzePerformance();
        const performanceOptimized = performanceAnalysis.recommendations.length > 0;

        logger.info('Batch feedback traité', {
          metadata: {
            service: 'AgentQualityFeedbackLoop',
            operation: 'processBatchFeedback',
            feedbacksCount: feedbacks.length,
            learned,
            patternsUpdated,
            avgQualityImprovement,
            successRate
          }
        });

        return {
          processed: feedbacks.length,
          learned,
          patternsUpdated,
          performanceOptimized,
          summary: {
            avgQualityImprovement,
            avgDuration,
            successRate
          }
        };
      },
      {
        operation: 'processBatchFeedback',
        service: 'AgentQualityFeedbackLoop',
        metadata: {}
      }
    );
  }

  /**
   * Analyse tendances qualité
   */
  async analyzeQualityTrends(): Promise<{
    trend: 'improving' | 'degrading' | 'stable';
    avgImprovement: number;
    successRate: number;
    topImprovements: Array<{
      context: string;
      improvement: number;
    }>;
  }> {
    return withErrorHandling(
      async () => {
        if (this.feedbackHistory.length < 10) {
          return {
            trend: 'stable',
            avgImprovement: 0,
            successRate: 0,
            topImprovements: []
          };
        }

        // Analyser dernières 50 entrées
        const recent = this.feedbackHistory.slice(-50);
        const successful = recent.filter(f => f.success);
        const avgImprovement = successful.length > 0
          ? successful.reduce((sum, f) => sum + (f.qualityAfter - f.qualityBefore), 0) / successful.length
          : 0;
        const successRate = recent.length > 0
          ? successful.length / recent.length
          : 0;

        // Calculer tendance
        const firstHalf = recent.slice(0, Math.floor(recent.length / 2));
        const secondHalf = recent.slice(Math.floor(recent.length / 2));

        const firstHalfAvg = firstHalf.filter(f => f.success).length > 0
          ? firstHalf.filter(f => f.success).reduce((sum, f) => sum + (f.qualityAfter - f.qualityBefore), 0) / firstHalf.filter(f => f.success).length
          : 0;
        const secondHalfAvg = secondHalf.filter(f => f.success).length > 0
          ? secondHalf.filter(f => f.success).reduce((sum, f) => sum + (f.qualityAfter - f.qualityBefore), 0) / secondHalf.filter(f => f.success).length
          : 0;

        const trend: 'improving' | 'degrading' | 'stable' = 
          secondHalfAvg > firstHalfAvg * 1.1 ? 'improving' :
          secondHalfAvg < firstHalfAvg * 0.9 ? 'degrading' :
          'stable';

        // Top améliorations
        const topImprovements = successful
          .sort((a, b) => (b.qualityAfter - b.qualityBefore) - (a.qualityAfter - a.qualityBefore))
          .slice(0, 5)
          .map(f => ({
            context: f.context,
            improvement: f.qualityAfter - f.qualityBefore
          }));

        return {
          trend,
          avgImprovement,
          successRate,
          topImprovements
        };
      },
      {
        operation: 'analyzeQualityTrends',
        service: 'AgentQualityFeedbackLoop',
        metadata: {}
      }
    );
  }

  /**
   * Récupère statistiques feedback
   */
  getFeedbackStats(): {
    totalFeedbacks: number;
    successRate: number;
    avgQualityImprovement: number;
    avgDuration: number;
  } {
    const total = this.feedbackHistory.length;
    const successful = this.feedbackHistory.filter(f => f.success);
    const successRate = total > 0 ? successful.length / total : 0;
    const avgQualityImprovement = successful.length > 0
      ? successful.reduce((sum, f) => sum + (f.qualityAfter - f.qualityBefore), 0) / successful.length
      : 0;
    const avgDuration = total > 0
      ? this.feedbackHistory.reduce((sum, f) => sum + f.duration, 0) / total
      : 0;

    return {
      totalFeedbacks: total,
      successRate,
      avgQualityImprovement,
      avgDuration
    };
  }
}

// ========================================
// SINGLETON INSTANCE
// ========================================

let agentQualityFeedbackLoopInstance: AgentQualityFeedbackLoop | null = null;

export function getAgentQualityFeedbackLoop(storage: IStorage): AgentQualityFeedbackLoop {
  if (!agentQualityFeedbackLoopInstance) {
    agentQualityFeedbackLoopInstance = new AgentQualityFeedbackLoop(storage);
  }
  return agentQualityFeedbackLoopInstance;
}

