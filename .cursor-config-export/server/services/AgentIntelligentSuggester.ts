import { logger } from '../utils/logger';
import { withErrorHandling } from '../utils/error-handler';
import { getAgentQualityLearning } from './AgentQualityLearning';
import { getAgentCodeQualityPredictor } from './AgentCodeQualityPredictor';
import type { IStorage } from '../storage-poc';

// ========================================
// TYPES ET INTERFACES
// ========================================

export interface IntelligentSuggestion {
  id: string;
  type: 'prevention' | 'correction' | 'optimization' | 'best_practice';
  priority: 'low' | 'medium' | 'high' | 'critical';
  context: string;
  issue: string;
  suggestion: string;
  confidence: number; // 0-1
  estimatedImpact: number; // 0-100
  estimatedEffort: number; // minutes
  evidence: Array<{
    source: string;
    description: string;
  }>;
  autoApplicable: boolean;
}

export interface SuggestionContext {
  task: string;
  type: 'feature' | 'fix' | 'refactor' | 'ui' | 'architecture';
  currentCode?: string;
  files?: string[];
  qualityScore?: number;
  issues?: Array<{
    type: string;
    severity: string;
    description: string;
  }>;
}

// ========================================
// AGENT INTELLIGENT SUGGESTER
// ========================================

/**
 * Service de suggestions intelligentes basées sur contexte
 * Combine apprentissage, prédiction et patterns pour suggestions précises
 * Améliore qualité avec suggestions contextuelles
 */
export class AgentIntelligentSuggester {
  private storage: IStorage;
  private qualityLearning: ReturnType<typeof getAgentQualityLearning>;
  private qualityPredictor: ReturnType<typeof getAgentCodeQualityPredictor>;

  constructor(storage: IStorage) {
    if (!storage) {
      throw new Error('Storage requis pour AgentIntelligentSuggester');
    }
    this.storage = storage;
    this.qualityLearning = getAgentQualityLearning(storage);
    this.qualityPredictor = getAgentCodeQualityPredictor(storage);
  }

  /**
   * Génère suggestions intelligentes pour contexte
   */
  async generateSuggestions(
    context: SuggestionContext
  ): Promise<IntelligentSuggestion[]> {
    return withErrorHandling(
      async () => {
        const suggestions: IntelligentSuggestion[] = [];

        // 1. Suggestions depuis apprentissage
        const learningInsights = await this.qualityLearning.generateInsights(context.task);
        for (const insight of learningInsights.insights) {
          suggestions.push({
            id: `learning-${Date.now()}-${insight.pattern}`,
            type: 'correction',
            priority: insight.estimatedImpact > 20 ? 'high' : 'medium',
            context: context.task,
            issue: insight.pattern,
            suggestion: insight.recommendation,
            confidence: insight.confidence,
            estimatedImpact: insight.estimatedImpact,
            estimatedEffort: 5,
            evidence: insight.evidence.map(e => ({
              source: 'quality_learning',
              description: `Amélioration ${e.qualityAfter - e.qualityBefore}% dans contexte similaire`
            })),
            autoApplicable: false
          });
        }

        // 2. Suggestions depuis prédiction qualité
        const prediction = await this.qualityPredictor.predictQuality({
          task: context.task,
          type: context.type,
          targetFile: context.files?.[0]
        });

        for (const risk of prediction.risks) {
          if (risk.probability > 0.5) {
            suggestions.push({
              id: `prediction-${Date.now()}-${risk.type}`,
              type: 'prevention',
              priority: risk.severity,
              context: context.task,
              issue: risk.description,
              suggestion: risk.prevention,
              confidence: risk.probability,
              estimatedImpact: risk.severity === 'critical' ? 30 :
                               risk.severity === 'high' ? 20 :
                               risk.severity === 'medium' ? 10 : 5,
              estimatedEffort: 2,
              evidence: [{
                source: 'quality_predictor',
                description: `Risque détecté avec probabilité ${(risk.probability * 100).toFixed(0)}%`
              }],
              autoApplicable: false
            });
          }
        }

        // 3. Suggestions depuis meilleures pratiques
        for (const practice of prediction.bestPractices) {
          suggestions.push({
            id: `best-practice-${Date.now()}-${practice}`,
            type: 'best_practice',
            priority: 'medium',
            context: context.task,
            issue: `Meilleure pratique: ${practice}`,
            suggestion: practice,
            confidence: 0.9,
            estimatedImpact: 15,
            estimatedEffort: 3,
            evidence: [{
              source: 'best_practices',
              description: 'Meilleure pratique recommandée pour ce type de tâche'
            }],
            autoApplicable: false
          });
        }

        // 4. Suggestions depuis issues existantes
        if (context.issues) {
          for (const issue of context.issues) {
            const improvement = await this.qualityLearning.predictImprovement(
              context.task,
              issue.description
            );

            if (improvement.confidence > 0.5) {
              suggestions.push({
                id: `issue-${Date.now()}-${issue.type}`,
                type: 'correction',
                priority: issue.severity as 'low' | 'medium' | 'high' | 'critical',
                context: context.task,
                issue: issue.description,
                suggestion: improvement.recommendedSolution || 'Corriger issue identifiée',
                confidence: improvement.confidence,
                estimatedImpact: improvement.predictedImprovement,
                estimatedEffort: 5,
                evidence: [{
                  source: 'quality_learning',
                  description: `Amélioration prédite: ${improvement.predictedImprovement.toFixed(1)}%`
                }],
                autoApplicable: issue.severity === 'low' || issue.severity === 'medium'
              });
            }
          }
        }

        // 5. Trier et filtrer suggestions
        const sorted = suggestions.sort((a, b) => {
          const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
          const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
          if (priorityDiff !== 0) return priorityDiff;
          return b.estimatedImpact - a.estimatedImpact;
        });

        // Filtrer suggestions avec confiance minimale
        const filtered = sorted.filter(s => s.confidence >= 0.5);

        logger.info('Suggestions intelligentes générées', {
          metadata: {
            service: 'AgentIntelligentSuggester',
            operation: 'generateSuggestions',
            context: context.task,
            suggestionsCount: filtered.length,
            highPriorityCount: filtered.filter(s => s.priority === 'high' || s.priority === 'critical').length
          }
        });

        return filtered;
      },
      {
        operation: 'generateSuggestions',
        service: 'AgentIntelligentSuggester',
        metadata: {}
      }
    );
  }

  /**
   * Génère suggestions prioritaires (top N)
   */
  async generateTopSuggestions(
    context: SuggestionContext,
    topN: number = 5
  ): Promise<IntelligentSuggestion[]> {
    const allSuggestions = await this.generateSuggestions(context);
    return allSuggestions.slice(0, topN);
  }

  /**
   * Génère suggestions auto-applicables
   */
  async generateAutoApplicableSuggestions(
    context: SuggestionContext
  ): Promise<IntelligentSuggestion[]> {
    const allSuggestions = await this.generateSuggestions(context);
    return allSuggestions.filter(s => s.autoApplicable);
  }

  /**
   * Évalue impact potentiel d'une suggestion
   */
  async evaluateSuggestionImpact(
    suggestion: IntelligentSuggestion,
    context: SuggestionContext
  ): Promise<{
    impact: number; // 0-100
    confidence: number; // 0-1
    effort: number; // minutes
    roi: number; // impact / effort
  }> {
    return withErrorHandling(
      async () => {
        // Utiliser apprentissage pour prédire impact
        const improvement = await this.qualityLearning.predictImprovement(
          context.task,
          suggestion.issue
        );

        const impact = improvement.predictedImprovement > 0
          ? improvement.predictedImprovement
          : suggestion.estimatedImpact;

        const confidence = Math.max(suggestion.confidence, improvement.confidence);
        const effort = suggestion.estimatedEffort;
        const roi = effort > 0 ? impact / effort : impact;

        return {
          impact,
          confidence,
          effort,
          roi
        };
      },
      {
        operation: 'evaluateSuggestionImpact',
        service: 'AgentIntelligentSuggester',
        metadata: {}
      }
    );
  }
}

// ========================================
// SINGLETON INSTANCE
// ========================================

let agentIntelligentSuggesterInstance: AgentIntelligentSuggester | null = null;

export function getAgentIntelligentSuggester(storage: IStorage): AgentIntelligentSuggester {
  if (!agentIntelligentSuggesterInstance) {
    agentIntelligentSuggesterInstance = new AgentIntelligentSuggester(storage);
  }
  return agentIntelligentSuggesterInstance;
}

