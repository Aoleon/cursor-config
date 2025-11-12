import { logger } from '../utils/logger';
import { withErrorHandling } from '../utils/error-handler';
import { db } from '../db';
import { sql, eq, and, gte, desc } from 'drizzle-orm';
import {
  chatbotConversations,
  aiModelMetrics,
  adaptiveLearningPatterns
} from '@shared/schema';
import crypto from 'crypto';

// ========================================
// TYPES ET INTERFACES
// ========================================

export interface SuccessPattern {
  id: string;
  queryType: string;
  model: string;
  complexity: string;
  userRole?: string;
  successRate: number;
  avgExecutionTime: number;
  avgCost: number;
  usageCount: number;
  conditions: string[];
  metadata?: {
    cacheHitRate?: number;
    avgConfidence?: number;
    commonContexts?: string[];
  };
}

export interface FailurePattern {
  id: string;
  queryType: string;
  model: string;
  complexity: string;
  userRole?: string;
  failureRate: number;
  avgExecutionTime: number;
  commonErrors: string[];
  errorTypes: string[];
  frequency: number;
  solutions?: Array<{
    solution: string;
    successRate: number;
    usageCount: number;
  }>;
}

export interface ProblemPrediction {
  type: 'timeout' | 'error' | 'performance' | 'cost' | 'cache';
  probability: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  recommendation: string;
  estimatedImpact?: number;
}

export interface OptimalStrategy {
  model: 'claude_sonnet_4' | 'gpt_5' | 'auto';
  useCache: boolean;
  useBatching: boolean;
  expectedComplexity: 'simple' | 'complex' | 'expert';
  suggestedContextSize: number;
  confidence: number;
  reasoning: string;
  alternatives?: Array<{
    strategy: OptimalStrategy;
    confidence: number;
  }>;
}

export interface LearningResult {
  patternId?: string;
  learned: boolean;
  successPattern?: SuccessPattern;
  failurePattern?: FailurePattern;
  improvements?: string[];
}

// ========================================
// AGENT LEARNING SERVICE
// ========================================

/**
 * Service d'apprentissage adaptatif pour l'agent Cursor
 * Analyse les patterns de succès/échec depuis les historiques et apprend automatiquement
 */
export class AgentLearningService {
  private readonly ANALYSIS_WINDOW_DAYS = 30;
  private readonly MIN_SAMPLES_FOR_PATTERN = 5;
  private readonly SUCCESS_RATE_THRESHOLD = 0.8;
  private readonly FAILURE_RATE_THRESHOLD = 0.3;

  /**
   * Normalise un pattern de requête pour comparaison
   */
  private normalizeQueryPattern(query: string): string {
    return query
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s]/g, '');
  }

  /**
   * Calcule la similarité entre deux requêtes
   */
  private calculateQuerySimilarity(query1: string, query2: string): number {
    const words1 = new Set(this.normalizeQueryPattern(query1).split(/\s+/));
    const words2 = new Set(this.normalizeQueryPattern(query2).split(/\s+/));
    
    const words1Array = Array.from(words1);
    const words2Array = Array.from(words2);
    
    const intersection = new Set(words1Array.filter(x => words2.has(x)));
    const union = new Set([...words1Array, ...words2Array]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * Analyse les patterns historiques depuis chatbotConversations et aiModelMetrics
   */
  async analyzeHistoricalPatterns(
    days: number = this.ANALYSIS_WINDOW_DAYS
  ): Promise<{
    successPatterns: SuccessPattern[];
    failurePatterns: FailurePattern[];
  }> {
    return withErrorHandling(
      async () => {
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        // 1. Analyser chatbotConversations
        const conversations = await db
          .select({
            query: chatbotConversations.query,
            userRole: chatbotConversations.userRole,
            modelUsed: chatbotConversations.modelUsed,
            executionTimeMs: chatbotConversations.executionTimeMs,
            errorOccurred: chatbotConversations.errorOccurred,
            errorType: chatbotConversations.errorType,
            cacheHit: chatbotConversations.cacheHit,
            confidence: chatbotConversations.confidence
          })
          .from(chatbotConversations)
          .where(gte(chatbotConversations.createdAt, since))
          .orderBy(desc(chatbotConversations.createdAt));

        // 2. Analyser aiModelMetrics
        const metrics = await db
          .select({
            modelUsed: aiModelMetrics.modelUsed,
            queryType: aiModelMetrics.queryType,
            complexity: aiModelMetrics.complexity,
            userRole: aiModelMetrics.userRole,
            success: aiModelMetrics.success,
            responseTimeMs: aiModelMetrics.responseTimeMs,
            errorType: aiModelMetrics.errorType,
            cacheStatus: aiModelMetrics.cacheStatus,
            costEstimate: aiModelMetrics.costEstimate
          })
          .from(aiModelMetrics)
          .where(gte(aiModelMetrics.timestamp, since))
          .orderBy(desc(aiModelMetrics.timestamp));

        // 3. Grouper par patterns
        const successPatterns = this.identifySuccessPatterns(conversations, metrics);
        const failurePatterns = this.identifyFailurePatterns(conversations, metrics);

        logger.info('Patterns historiques analysés', {
          metadata: {
            service: 'AgentLearningService',
            operation: 'analyzeHistoricalPatterns',
            days,
            conversationsCount: conversations.length,
            metricsCount: metrics.length,
            successPatternsCount: successPatterns.length,
            failurePatternsCount: failurePatterns.length
          }
        });

        return {
          successPatterns,
          failurePatterns
        };
      },
      {
        operation: 'analyzeHistoricalPatterns',
        service: 'AgentLearningService',
        metadata: { days }
      }
    );
  }

  /**
   * Identifie les patterns de succès
   */
  private identifySuccessPatterns(
    conversations: Array<{
      query: string;
      userRole: string;
      modelUsed: string | null;
      executionTimeMs: number;
      errorOccurred: boolean;
      cacheHit: boolean;
      confidence: string | null;
    }>,
    metrics: Array<{
      modelUsed: string;
      queryType: string;
      complexity: string;
      userRole: string;
      success: boolean;
      responseTimeMs: number;
      cacheStatus: string;
      costEstimate: string;
    }>
  ): SuccessPattern[] {
    const patterns = new Map<string, {
      successes: number;
      total: number;
      executionTimes: number[];
      costs: number[];
      cacheHits: number;
      confidences: number[];
      queries: string[];
    }>();

    // Analyser conversations réussies
    for (const conv of conversations) {
      if (conv.errorOccurred) continue;

      const key = `${conv.userRole}:${conv.modelUsed || 'unknown'}:${this.normalizeQueryPattern(conv.query)}`;
      const pattern = patterns.get(key) || {
        successes: 0,
        total: 0,
        executionTimes: [],
        costs: [],
        cacheHits: 0,
        confidences: [],
        queries: []
      };

      pattern.successes++;
      pattern.total++;
      pattern.executionTimes.push(conv.executionTimeMs);
      if (conv.cacheHit) pattern.cacheHits++;
      if (conv.confidence) pattern.confidences.push(parseFloat(conv.confidence));
      pattern.queries.push(conv.query);

      patterns.set(key, pattern);
    }

    // Analyser métriques réussies
    for (const metric of metrics) {
      if (!metric.success) continue;

      const key = `${metric.userRole}:${metric.modelUsed}:${metric.queryType}:${metric.complexity}`;
      const pattern = patterns.get(key) || {
        successes: 0,
        total: 0,
        executionTimes: [],
        costs: [],
        cacheHits: 0,
        confidences: [],
        queries: []
      };

      pattern.successes++;
      pattern.total++;
      pattern.executionTimes.push(metric.responseTimeMs);
      if (metric.cacheStatus === 'hit') pattern.cacheHits++;
      if (metric.costEstimate) pattern.costs.push(parseFloat(metric.costEstimate));

      patterns.set(key, pattern);
    }

    // Convertir en SuccessPattern
    const successPatterns: SuccessPattern[] = [];

    for (const [key, data] of patterns.entries()) {
      if (data.total < this.MIN_SAMPLES_FOR_PATTERN) continue;

      const successRate = data.successes / data.total;
      if (successRate < this.SUCCESS_RATE_THRESHOLD) continue;

      const [userRole, model, ...queryParts] = key.split(':');
      const queryType = queryParts.join(':');

      successPatterns.push({
        id: crypto.createHash('md5').update(key).digest('hex'),
        queryType: queryType.includes(':') ? queryType.split(':')[0] : 'general',
        model: model || 'unknown',
        complexity: queryType.includes(':') ? queryType.split(':')[1] || 'simple' : 'simple',
        userRole: userRole !== 'unknown' ? userRole : undefined,
        successRate,
        avgExecutionTime: data.executionTimes.reduce((a, b) => a + b, 0) / data.executionTimes.length,
        avgCost: data.costs.length > 0 ? data.costs.reduce((a, b) => a + b, 0) / data.costs.length : 0,
        usageCount: data.total,
        conditions: [],
        metadata: {
          cacheHitRate: data.total > 0 ? data.cacheHits / data.total : 0,
          avgConfidence: data.confidences.length > 0
            ? data.confidences.reduce((a, b) => a + b, 0) / data.confidences.length
            : undefined
        }
      });
    }

    return successPatterns.sort((a, b) => b.successRate - a.successRate);
  }

  /**
   * Identifie les patterns d'échec
   */
  private identifyFailurePatterns(
    conversations: Array<{
      query: string;
      userRole: string;
      modelUsed: string | null;
      executionTimeMs: number;
      errorOccurred: boolean;
      errorType: string | null;
    }>,
    metrics: Array<{
      modelUsed: string;
      queryType: string;
      complexity: string;
      userRole: string;
      success: boolean;
      responseTimeMs: number;
      errorType: string | null;
    }>
  ): FailurePattern[] {
    const patterns = new Map<string, {
      failures: number;
      total: number;
      executionTimes: number[];
      errorTypes: Map<string, number>;
      queries: string[];
    }>();

    // Analyser conversations échouées
    for (const conv of conversations) {
      if (!conv.errorOccurred) continue;

      const key = `${conv.userRole}:${conv.modelUsed || 'unknown'}:${this.normalizeQueryPattern(conv.query)}`;
      const pattern = patterns.get(key) || {
        failures: 0,
        total: 0,
        executionTimes: [],
        errorTypes: new Map<string, number>(),
        queries: []
      };

      pattern.failures++;
      pattern.total++;
      pattern.executionTimes.push(conv.executionTimeMs);
      if (conv.errorType) {
        const count = pattern.errorTypes.get(conv.errorType) || 0;
        pattern.errorTypes.set(conv.errorType, count + 1);
      }
      pattern.queries.push(conv.query);

      patterns.set(key, pattern);
    }

    // Analyser métriques échouées
    for (const metric of metrics) {
      if (metric.success) continue;

      const key = `${metric.userRole}:${metric.modelUsed}:${metric.queryType}:${metric.complexity}`;
      const pattern = patterns.get(key) || {
        failures: 0,
        total: 0,
        executionTimes: [],
        errorTypes: new Map<string, number>(),
        queries: []
      };

      pattern.failures++;
      pattern.total++;
      pattern.executionTimes.push(metric.responseTimeMs);
      if (metric.errorType) {
        const count = pattern.errorTypes.get(metric.errorType) || 0;
        pattern.errorTypes.set(metric.errorType, count + 1);
      }

      patterns.set(key, pattern);
    }

    // Convertir en FailurePattern
    const failurePatterns: FailurePattern[] = [];

    for (const [key, data] of patterns.entries()) {
      if (data.total < this.MIN_SAMPLES_FOR_PATTERN) continue;

      const failureRate = data.failures / data.total;
      if (failureRate < this.FAILURE_RATE_THRESHOLD) continue;

      const [userRole, model, ...queryParts] = key.split(':');
      const queryType = queryParts.join(':');

      const errorTypes = Array.from(data.errorTypes.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([type]) => type);

      failurePatterns.push({
        id: crypto.createHash('md5').update(key).digest('hex'),
        queryType: queryType.includes(':') ? queryType.split(':')[0] : 'general',
        model: model || 'unknown',
        complexity: queryType.includes(':') ? queryType.split(':')[1] || 'simple' : 'simple',
        userRole: userRole !== 'unknown' ? userRole : undefined,
        failureRate,
        avgExecutionTime: data.executionTimes.reduce((a, b) => a + b, 0) / data.executionTimes.length,
        commonErrors: errorTypes.slice(0, 5),
        errorTypes,
        frequency: data.total
      });
    }

    return failurePatterns.sort((a, b) => b.failureRate - a.failureRate);
  }

  /**
   * Prédit les problèmes futurs basés sur les patterns
   */
  async predictProblems(
    query: string,
    userRole: string,
    model?: string,
    complexity?: string
  ): Promise<ProblemPrediction[]> {
    return withErrorHandling(
      async () => {
        const { successPatterns, failurePatterns } = await this.analyzeHistoricalPatterns(7); // 7 derniers jours
        const predictions: ProblemPrediction[] = [];

        const normalizedQuery = this.normalizeQueryPattern(query);

        // 1. Chercher patterns d'échec similaires
        for (const failurePattern of failurePatterns) {
          // Vérifier si requête similaire a échoué
          const similarQueries = await db
            .select({ query: chatbotConversations.query })
            .from(chatbotConversations)
            .where(
              and(
                eq(chatbotConversations.userRole, userRole),
                eq(chatbotConversations.errorOccurred, true),
                gte(chatbotConversations.createdAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
              )
            )
            .limit(20);

          for (const similar of similarQueries) {
            const similarity = this.calculateQuerySimilarity(query, similar.query);
            if (similarity > 0.7) {
              predictions.push({
                type: 'error',
                probability: failurePattern.failureRate * similarity,
                severity: failurePattern.failureRate > 0.5 ? 'high' : 'medium',
                description: `Requête similaire a échoué avec erreurs: ${failurePattern.commonErrors.join(', ')}`,
                recommendation: `Utiliser modèle ${failurePattern.model === 'claude_sonnet_4' ? 'gpt_5' : 'claude_sonnet_4'} ou augmenter timeout`,
                estimatedImpact: failurePattern.avgExecutionTime
              });
            }
          }
        }

        // 2. Détecter risque de timeout
        const avgTime = successPatterns
          .filter(p => p.queryType === 'general' || normalizedQuery.includes(p.queryType.toLowerCase()))
          .map(p => p.avgExecutionTime);
        
        if (avgTime.length > 0) {
          const maxTime = Math.max(...avgTime);
          if (maxTime > 10000) { // > 10s
            predictions.push({
              type: 'timeout',
              probability: 0.6,
              severity: 'medium',
              description: `Requêtes similaires prennent en moyenne ${maxTime}ms`,
              recommendation: 'Utiliser cache ou optimiser requête',
              estimatedImpact: maxTime
            });
          }
        }

        // 3. Détecter risque de coût élevé
        const avgCosts = successPatterns
          .filter(p => p.avgCost > 0)
          .map(p => p.avgCost);
        
        if (avgCosts.length > 0) {
          const maxCost = Math.max(...avgCosts);
          if (maxCost > 0.01) { // > 1 centime
            predictions.push({
              type: 'cost',
              probability: 0.5,
              severity: 'low',
              description: `Coût estimé élevé: ${(maxCost * 100).toFixed(2)} centimes`,
              recommendation: 'Utiliser cache ou modèle moins cher',
              estimatedImpact: maxCost
            });
          }
        }

        // Trier par probabilité × sévérité
        return predictions.sort((a, b) => {
          const scoreA = a.probability * (a.severity === 'critical' ? 4 : a.severity === 'high' ? 3 : a.severity === 'medium' ? 2 : 1);
          const scoreB = b.probability * (b.severity === 'critical' ? 4 : b.severity === 'high' ? 3 : b.severity === 'medium' ? 2 : 1);
          return scoreB - scoreA;
        });
      },
      {
        operation: 'predictProblems',
        service: 'AgentLearningService',
        metadata: { query: query.substring(0, 100), userRole }
      }
    );
  }

  /**
   * Suggère la meilleure stratégie pour une requête
   */
  async suggestOptimalStrategy(
    query: string,
    userRole: string,
    context?: {
      model?: string;
      complexity?: string;
      queryType?: string;
    }
  ): Promise<OptimalStrategy> {
    return withErrorHandling(
      async () => {
        const { successPatterns, failurePatterns } = await this.analyzeHistoricalPatterns(30);
        const normalizedQuery = this.normalizeQueryPattern(query);

        // 1. Chercher patterns de succès similaires
        const similarSuccesses = successPatterns
          .filter(p => {
            if (p.userRole && p.userRole !== userRole) return false;
            if (context?.queryType && p.queryType !== context.queryType) return false;
            return true;
          })
          .sort((a, b) => b.successRate - a.successRate)
          .slice(0, 5);

        // 2. Chercher patterns d'échec similaires
        const similarFailures = failurePatterns
          .filter(p => {
            if (p.userRole && p.userRole !== userRole) return false;
            if (context?.queryType && p.queryType !== context.queryType) return false;
            return true;
          })
          .slice(0, 3);

        // 3. Déterminer modèle optimal
        let optimalModel: 'claude_sonnet_4' | 'gpt_5' | 'auto' = 'auto';
        let modelConfidence = 0.5;

        if (similarSuccesses.length > 0) {
          const bestPattern = similarSuccesses[0];
          if (bestPattern.model === 'claude_sonnet_4' || bestPattern.model === 'gpt_5') {
            optimalModel = bestPattern.model as 'claude_sonnet_4' | 'gpt_5';
            modelConfidence = bestPattern.successRate;
          }
        }

        // Éviter modèles qui ont échoué
        for (const failure of similarFailures) {
          if (failure.model === optimalModel && failure.failureRate > 0.5) {
            optimalModel = optimalModel === 'claude_sonnet_4' ? 'gpt_5' : 'claude_sonnet_4';
            modelConfidence = 0.6;
          }
        }

        // 4. Déterminer utilisation cache
        const useCache = similarSuccesses.some(p => 
          p.metadata?.cacheHitRate && p.metadata.cacheHitRate > 0.5
        );

        // 5. Déterminer utilisation batching
        const useBatching = similarSuccesses.length > 2 && 
          similarSuccesses.every(p => p.avgExecutionTime < 2000);

        // 6. Déterminer complexité attendue
        const expectedComplexity: 'simple' | 'complex' | 'expert' = 
          context?.complexity as 'simple' | 'complex' | 'expert' || 
          (similarSuccesses.length > 0 && similarSuccesses[0].complexity === 'expert' ? 'expert' :
           similarSuccesses.length > 0 && similarSuccesses[0].complexity === 'complex' ? 'complex' : 'simple');

        // 7. Calculer taille contexte suggérée
        const suggestedContextSize = similarSuccesses.length > 0
          ? Math.round(similarSuccesses[0].avgExecutionTime / 100) // Approximation
          : 25;

        const reasoning = similarSuccesses.length > 0
          ? `Basé sur ${similarSuccesses[0].usageCount} requêtes similaires réussies (${(similarSuccesses[0].successRate * 100).toFixed(1)}% succès)`
          : 'Aucun pattern similaire trouvé, utilisation stratégie par défaut';

        return {
          model: optimalModel,
          useCache,
          useBatching,
          expectedComplexity,
          suggestedContextSize: Math.min(30, Math.max(10, suggestedContextSize)),
          confidence: modelConfidence,
          reasoning
        };
      },
      {
        operation: 'suggestOptimalStrategy',
        service: 'AgentLearningService',
        metadata: { query: query.substring(0, 100), userRole }
      }
    );
  }

  /**
   * Apprend d'un résultat (succès ou échec)
   */
  async learnFromResult(
    query: string,
    userRole: string,
    result: {
      success: boolean;
      executionTimeMs: number;
      model?: string;
      queryType?: string;
      complexity?: string;
      errorType?: string;
      cost?: number;
      cacheHit?: boolean;
    }
  ): Promise<LearningResult> {
    return withErrorHandling(
      async () => {
        const normalizedPattern = this.normalizeQueryPattern(query);

        // Chercher pattern existant dans adaptiveLearningPatterns
        const existingPattern = await db
          .select()
          .from(adaptiveLearningPatterns)
          .where(
            and(
              eq(adaptiveLearningPatterns.userRole, userRole),
              eq(adaptiveLearningPatterns.queryPattern, normalizedPattern),
              eq(adaptiveLearningPatterns.isActive, true)
            )
          )
          .limit(1);

        let patternId: string | undefined;

        if (existingPattern.length > 0) {
          // Mettre à jour pattern existant
          const pattern = existingPattern[0];
          const newSuccessRate = this.calculateNewSuccessRate(
            parseFloat(pattern.successRate),
            pattern.usageCount,
            result.success ? 1.0 : 0.0
          );
          const newAvgTime = this.calculateNewAvgTime(
            pattern.avgExecutionTime,
            pattern.usageCount,
            result.executionTimeMs
          );

          await db
            .update(adaptiveLearningPatterns)
            .set({
              successRate: newSuccessRate.toString(),
              avgExecutionTime: newAvgTime,
              usageCount: pattern.usageCount + 1,
              lastUsed: new Date(),
              updatedAt: new Date()
            })
            .where(eq(adaptiveLearningPatterns.id, pattern.id));

          patternId = pattern.id;
        } else {
          // Créer nouveau pattern
          const newPattern = {
            id: crypto.randomUUID(),
            userRole,
            queryPattern: normalizedPattern,
            successRate: result.success ? '1.00' : '0.00',
            avgExecutionTime: result.executionTimeMs,
            usageCount: 1,
            lastUsed: new Date(),
            optimizationSuggestions: result.errorType ? { errorType: result.errorType } : null,
            contextEnhancements: null,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
          };

          await db.insert(adaptiveLearningPatterns).values(newPattern);
          patternId = newPattern.id;
        }

        logger.info('Apprentissage enregistré', {
          metadata: {
            service: 'AgentLearningService',
            operation: 'learnFromResult',
            patternId,
            success: result.success,
            executionTimeMs: result.executionTimeMs
          }
        });

        return {
          patternId,
          learned: true
        };
      },
      {
        operation: 'learnFromResult',
        service: 'AgentLearningService',
        metadata: { query: query.substring(0, 100), userRole, success: result.success }
      }
    );
  }

  /**
   * Calcule nouveau taux de succès
   */
  private calculateNewSuccessRate(
    currentRate: number,
    usageCount: number,
    newResult: number
  ): number {
    return ((currentRate * usageCount) + newResult) / (usageCount + 1);
  }

  /**
   * Calcule nouveau temps moyen
   */
  private calculateNewAvgTime(
    currentAvg: number,
    usageCount: number,
    newTime: number
  ): number {
    return ((currentAvg * usageCount) + newTime) / (usageCount + 1);
  }
}

// ========================================
// SINGLETON INSTANCE
// ========================================

let agentLearningServiceInstance: AgentLearningService | null = null;

export function getAgentLearningService(): AgentLearningService {
  if (!agentLearningServiceInstance) {
    agentLearningServiceInstance = new AgentLearningService();
  }
  return agentLearningServiceInstance;
}

