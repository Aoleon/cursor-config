import { logger } from '../utils/logger';
import { withErrorHandling } from '../utils/error-handler';
import { getAgentLearningService } from './AgentLearningService';
import type { IStorage } from '../storage-poc';

// ========================================
// TYPES ET INTERFACES
// ========================================

export interface QualityPattern {
  id: string;
  context: string;
  issue: string;
  solution: string;
  qualityBefore: number;
  qualityAfter: number;
  improvement: number;
  frequency: number;
  successRate: number;
  lastUsed: Date;
}

export interface LearningInsight {
  pattern: string;
  confidence: number; // 0-1
  recommendation: string;
  estimatedImpact: number; // 0-100
  evidence: Array<{
    context: string;
    qualityBefore: number;
    qualityAfter: number;
  }>;
}

export interface QualityLearningResult {
  patterns: QualityPattern[];
  insights: LearningInsight[];
  recommendations: Array<{
    priority: 'low' | 'medium' | 'high';
    action: string;
    estimatedImprovement: number;
  }>;
}

// ========================================
// AGENT QUALITY LEARNING
// ========================================

/**
 * Service d'apprentissage continu de la qualité
 * Apprend des patterns réussis et échoués
 * Améliore prédictions et suggestions au fil du temps
 */
export class AgentQualityLearning {
  private storage: IStorage;
  private learningService: ReturnType<typeof getAgentLearningService>;
  private qualityPatterns: Map<string, QualityPattern> = new Map();
  private readonly MIN_FREQUENCY_FOR_PATTERN = 3;
  private readonly MIN_SUCCESS_RATE = 0.7;

  constructor(storage: IStorage) {
    if (!storage) {
      throw new Error('Storage requis pour AgentQualityLearning');
    }
    this.storage = storage;
    this.learningService = getAgentLearningService();
  }

  /**
   * Apprend d'un résultat qualité
   */
  async learnFromResult(
    context: string,
    issue: string,
    solution: string,
    qualityBefore: number,
    qualityAfter: number
  ): Promise<void> {
    return withErrorHandling(
      async () => {
        const patternKey = `${context}:${issue}`;
        const existing = this.qualityPatterns.get(patternKey);

        const improvement = qualityAfter - qualityBefore;
        const success = improvement > 0;

        if (existing) {
          // Mettre à jour pattern existant
          existing.frequency++;
          existing.qualityBefore = (existing.qualityBefore + qualityBefore) / 2;
          existing.qualityAfter = (existing.qualityAfter + qualityAfter) / 2;
          existing.improvement = (existing.improvement + improvement) / 2;
          existing.successRate = (existing.successRate * (existing.frequency - 1) + (success ? 1 : 0)) / existing.frequency;
          existing.lastUsed = new Date();
          if (solution && solution !== existing.solution) {
            existing.solution = solution; // Mettre à jour solution si meilleure
          }
        } else {
          // Créer nouveau pattern
          const pattern: QualityPattern = {
            id: `pattern-${Date.now()}`,
            context,
            issue,
            solution,
            qualityBefore,
            qualityAfter,
            improvement,
            frequency: 1,
            successRate: success ? 1 : 0,
            lastUsed: new Date()
          };
          this.qualityPatterns.set(patternKey, pattern);
        }

        logger.debug('Pattern qualité appris', {
          metadata: {
            service: 'AgentQualityLearning',
            operation: 'learnFromResult',
            patternKey,
            improvement,
            success
          }
        });
      },
      {
        operation: 'learnFromResult',
        service: 'AgentQualityLearning',
        metadata: {}
      }
    );
  }

  /**
   * Génère insights d'apprentissage
   */
  async generateInsights(
    context: string
  ): Promise<QualityLearningResult> {
    return withErrorHandling(
      async () => {
        // 1. Identifier patterns pertinents
        const relevantPatterns = this.findRelevantPatterns(context);

        // 2. Générer insights
        const insights = this.generateInsightsFromPatterns(relevantPatterns);

        // 3. Générer recommandations
        const recommendations = this.generateRecommendations(insights);

        logger.info('Insights qualité générés', {
          metadata: {
            service: 'AgentQualityLearning',
            operation: 'generateInsights',
            context,
            patternsCount: relevantPatterns.length,
            insightsCount: insights.length,
            recommendationsCount: recommendations.length
          }
        });

        return {
          patterns: relevantPatterns,
          insights,
          recommendations
        };
      },
      {
        operation: 'generateInsights',
        service: 'AgentQualityLearning',
        metadata: {}
      }
    );
  }

  /**
   * Trouve patterns pertinents pour contexte
   */
  private findRelevantPatterns(context: string): QualityPattern[] {
    const relevant: QualityPattern[] = [];

    for (const pattern of Array.from(this.qualityPatterns.values())) {
      // Vérifier si pattern est pertinent
      if (pattern.context.toLowerCase().includes(context.toLowerCase()) ||
          context.toLowerCase().includes(pattern.context.toLowerCase())) {
        // Filtrer patterns avec fréquence et succès suffisants
        if (pattern.frequency >= this.MIN_FREQUENCY_FOR_PATTERN &&
            pattern.successRate >= this.MIN_SUCCESS_RATE) {
          relevant.push(pattern);
        }
      }
    }

    // Trier par pertinence (fréquence * success rate * improvement)
    return relevant.sort((a, b) => {
      const scoreA = a.frequency * a.successRate * a.improvement;
      const scoreB = b.frequency * b.successRate * b.improvement;
      return scoreB - scoreA;
    });
  }

  /**
   * Génère insights depuis patterns
   */
  private generateInsightsFromPatterns(
    patterns: QualityPattern[]
  ): LearningInsight[] {
    const insights: LearningInsight[] = [];

    // Grouper patterns par issue
    const patternsByIssue = new Map<string, QualityPattern[]>();
    for (const pattern of patterns) {
      const existing = patternsByIssue.get(pattern.issue) || [];
      existing.push(pattern);
      patternsByIssue.set(pattern.issue, existing);
    }

    // Générer insight pour chaque groupe
    for (const [issue, issuePatterns] of Array.from(patternsByIssue.entries())) {
      const avgImprovement = issuePatterns.reduce((sum: number, p: QualityPattern) => sum + p.improvement, 0) / issuePatterns.length;
      const avgSuccessRate = issuePatterns.reduce((sum: number, p: QualityPattern) => sum + p.successRate, 0) / issuePatterns.length;
      const bestSolution = issuePatterns.sort((a: QualityPattern, b: QualityPattern) => b.improvement - a.improvement)[0].solution;

      insights.push({
        pattern: issue,
        confidence: avgSuccessRate,
        recommendation: bestSolution,
        estimatedImpact: avgImprovement,
        evidence: issuePatterns.map((p: QualityPattern) => ({
          context: p.context,
          qualityBefore: p.qualityBefore,
          qualityAfter: p.qualityAfter
        }))
      });
    }

    return insights;
  }

  /**
   * Génère recommandations
   */
  private generateRecommendations(
    insights: LearningInsight[]
  ): Array<{
    priority: 'low' | 'medium' | 'high';
    action: string;
    estimatedImprovement: number;
  }> {
    const recommendations: Array<{
      priority: 'low' | 'medium' | 'high';
      action: string;
      estimatedImprovement: number;
    }> = [];

    for (const insight of insights) {
      const priority: 'low' | 'medium' | 'high' = 
        insight.estimatedImpact > 20 ? 'high' :
        insight.estimatedImpact > 10 ? 'medium' : 'low';

      recommendations.push({
        priority,
        action: insight.recommendation,
        estimatedImprovement: insight.estimatedImpact
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Prédit amélioration qualité pour contexte
   */
  async predictImprovement(
    context: string,
    issue: string
  ): Promise<{
    predictedImprovement: number;
    confidence: number;
    recommendedSolution: string;
  }> {
    return withErrorHandling(
      async () => {
        const patternKey = `${context}:${issue}`;
        const pattern = this.qualityPatterns.get(patternKey);

        if (pattern && pattern.frequency >= this.MIN_FREQUENCY_FOR_PATTERN) {
          return {
            predictedImprovement: pattern.improvement,
            confidence: pattern.successRate,
            recommendedSolution: pattern.solution
          };
        }

        // Chercher patterns similaires
        const similarPatterns = Array.from(this.qualityPatterns.values())
          .filter(p => p.issue === issue || p.context.includes(context) || context.includes(p.context));

        if (similarPatterns.length > 0) {
          const avgImprovement = similarPatterns.reduce((sum, p) => sum + p.improvement, 0) / similarPatterns.length;
          const avgSuccessRate = similarPatterns.reduce((sum, p) => sum + p.successRate, 0) / similarPatterns.length;
          const bestSolution = similarPatterns.sort((a, b) => b.improvement - a.improvement)[0].solution;

          return {
            predictedImprovement: avgImprovement,
            confidence: avgSuccessRate * 0.8, // Réduire confiance pour patterns similaires
            recommendedSolution: bestSolution
          };
        }

        return {
          predictedImprovement: 0,
          confidence: 0,
          recommendedSolution: ''
        };
      },
      {
        operation: 'predictImprovement',
        service: 'AgentQualityLearning',
        metadata: {}
      }
    );
  }

  /**
   * Récupère statistiques apprentissage
   */
  getLearningStats(): {
    totalPatterns: number;
    avgImprovement: number;
    avgSuccessRate: number;
    topPatterns: Array<{
      issue: string;
      frequency: number;
      improvement: number;
      successRate: number;
    }>;
  } {
    const patterns = Array.from(this.qualityPatterns.values());
    const totalPatterns = patterns.length;
    const avgImprovement = patterns.length > 0
      ? patterns.reduce((sum, p) => sum + p.improvement, 0) / patterns.length
      : 0;
    const avgSuccessRate = patterns.length > 0
      ? patterns.reduce((sum, p) => sum + p.successRate, 0) / patterns.length
      : 0;

    const topPatterns = patterns
      .sort((a, b) => (b.frequency * b.successRate * b.improvement) - (a.frequency * a.successRate * a.improvement))
      .slice(0, 10)
      .map(p => ({
        issue: p.issue,
        frequency: p.frequency,
        improvement: p.improvement,
        successRate: p.successRate
      }));

    return {
      totalPatterns,
      avgImprovement,
      avgSuccessRate,
      topPatterns
    };
  }
}

// ========================================
// SINGLETON INSTANCE
// ========================================

let agentQualityLearningInstance: AgentQualityLearning | null = null;

export function getAgentQualityLearning(storage: IStorage): AgentQualityLearning {
  if (!agentQualityLearningInstance) {
    agentQualityLearningInstance = new AgentQualityLearning(storage);
  }
  return agentQualityLearningInstance;
}

