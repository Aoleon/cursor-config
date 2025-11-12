/**
 * AgentRuleOptimizer
 * 
 * Service simplifié pour optimiser le chargement des règles basé sur l'usage réel.
 * Version: 1.0.0
 */

import { AgentMetricsService, getAgentMetricsService } from './AgentMetricsService';

interface RuleOptimization {
  ruleName: string;
  currentPriority: 'P0' | 'P1' | 'P2';
  recommendedPriority: 'P0' | 'P1' | 'P2';
  reason: string;
  usageRate: number;
  effectivenessRate: number;
}

interface OptimizationRecommendations {
  rulesToPromote: RuleOptimization[];
  rulesToDemote: RuleOptimization[];
  rulesToRemove: string[];
  rulesToCreate: Array<{ topic: string; reason: string }>;
}

export class AgentRuleOptimizer {
  private metricsService: AgentMetricsService;

  constructor(metricsService?: AgentMetricsService) {
    this.metricsService = metricsService || getAgentMetricsService();
  }

  /**
   * Génère des recommandations d'optimisation basées sur l'usage réel
   */
  async generateOptimizationRecommendations(): Promise<OptimizationRecommendations> {
    const usage = await this.metricsService.loadRuleUsage();
    const stats = await this.metricsService.getStatistics();

    const recommendations: OptimizationRecommendations = {
      rulesToPromote: [],
      rulesToDemote: [],
      rulesToRemove: [],
      rulesToCreate: [],
    };

    // Analyser chaque règle
    for (const [ruleName, ruleData] of Object.entries(usage.rules)) {
      // Promouvoir règles P2 avec usage élevé
      if (
        ruleData.priority === 'P2' &&
        ruleData.usageRate > 0.9 &&
        ruleData.totalLoads > 10
      ) {
        recommendations.rulesToPromote.push({
          ruleName,
          currentPriority: 'P2',
          recommendedPriority: 'P1',
          reason: `Usage élevé (${(ruleData.usageRate * 100).toFixed(1)}%)`,
          usageRate: ruleData.usageRate,
          effectivenessRate: ruleData.usageRate, // Approximation
        });
      }

      // Rétrograder règles P1 avec usage faible
      if (
        ruleData.priority === 'P1' &&
        ruleData.usageRate < 0.3 &&
        ruleData.totalLoads > 10
      ) {
        recommendations.rulesToDemote.push({
          ruleName,
          currentPriority: 'P1',
          recommendedPriority: 'P2',
          reason: `Usage faible (${(ruleData.usageRate * 100).toFixed(1)}%)`,
          usageRate: ruleData.usageRate,
          effectivenessRate: ruleData.usageRate,
        });
      }

      // Considérer suppression règles jamais utilisées
      if (
        ruleData.usageRate === 0 &&
        ruleData.totalLoads > 20 &&
        (Date.now() - new Date(ruleData.lastLoaded).getTime()) >
          30 * 24 * 60 * 60 * 1000 // 30 jours
      ) {
        recommendations.rulesToRemove.push(ruleName);
      }

    return recommendations;
  }

  /**
   * Filtre les règles à charger selon usage réel
   */
  async filterRulesByUsage(
    candidateRules: string[],
    minUsageRate: number = 0.3
  ): Promise<string[]> {
    const usage = await this.metricsService.loadRuleUsage();

    return candidateRules.filter((ruleName) => {
      const ruleData = usage.rules[ruleName];
      if (!ruleData) {
        // Règle nouvelle, inclure par défaut
        return true;
      }
      return ruleData.usageRate >= minUsageRate;
    });
  }

  /**
   * Priorise les règles selon usage réel
   */
  async prioritizeRulesByUsage(
    rules: string[]
  ): Promise<Array<{ rule: string; priority: number }>> {
    const usage = await this.metricsService.loadRuleUsage();

    return rules
      .map((ruleName) => {
        const ruleData = usage.rules[ruleName];
        return {
          rule: ruleName,
          priority: ruleData ? ruleData.usageRate : 0.5, // Default pour nouvelles règles
        };
      })
      .sort((a, b) => b.priority - a.priority);
  }

  /**
   * Obtient les règles recommandées pour un contexte donné
   */
  async getRecommendedRulesForContext(
    context: {
      domain?: 'backend' | 'frontend' | 'database' | 'ai-services';
      complexity?: 'simple' | 'medium' | 'complex';
      taskType?: string;
    }
  ): Promise<string[]> {
    const usage = await this.metricsService.loadRuleUsage();
    const recommended: string[] = [];

    // Filtrer règles par contexte et usage
    for (const [ruleName, ruleData] of Object.entries(usage.rules)) {
      // Vérifier si règle pertinente pour contexte
      const isRelevant = this.isRuleRelevantForContext(ruleName, context);

      // Inclure si pertinente et usage > 0.3
      if (isRelevant && ruleData.usageRate > 0.3) {
        recommended.push(ruleName);
      }

    // Trier par usage décroissant
    recommended.sort((a, b) => {
      const usageA = usage.rules[a]?.usageRate || 0;
      const usageB = usage.rules[b]?.usageRate || 0;
      return usageB - usageA;
    });

    return recommended;
  }

  /**
   * Vérifie si une règle est pertinente pour un contexte
   */
  private isRuleRelevantForContext(
    ruleName: string,
    context: {
      domain?: string;
      complexity?: string;
      taskType?: string;
    }
  ): boolean {
    // Logique simple de détection de pertinence
    if (context.domain === 'backend' && ruleName.includes('backend')) {
      return true;
    }
    if (context.domain === 'frontend' && ruleName.includes('frontend')) {
      return true;
    }
    if (context.domain === 'database' && ruleName.includes('database')) {
      return true;
    }
    if (context.complexity === 'complex' && ruleName.includes('complex')) {
      return true;
    }

    // Règles toujours pertinentes
    if (
      ruleName.includes('core') ||
      ruleName.includes('quality') ||
      ruleName.includes('similar-code')
    ) {
      return true;
    }

    return false;
  }

  /**
   * Analyse l'efficacité des règles
   */
  async analyzeRuleEffectiveness(): Promise<
    Array<{
      rule: string;
      effectivenessRate: number;
      recommendation: 'keep' | 'improve' | 'remove';
    }>
  > {
    const usage = await this.metricsService.loadRuleUsage();
    const stats = await this.metricsService.getStatistics();

    const analysis: Array<{
      rule: string;
      effectivenessRate: number;
      recommendation: 'keep' | 'improve' | 'remove';
    }> = [];

    for (const [ruleName, ruleData] of Object.entries(usage.rules)) {
      const effectivenessRate = ruleData.usageRate; // Approximation

      let recommendation: 'keep' | 'improve' | 'remove' = 'keep';
      if (effectivenessRate < 0.3 && ruleData.totalLoads > 20) {
        recommendation = 'remove';
      } else if (effectivenessRate < 0.5) {
        recommendation = 'improve';
      }

      analysis.push({
        rule: ruleName,
        effectivenessRate,
        recommendation,
      });
    }

    return analysis.sort((a, b) => b.effectivenessRate - a.effectivenessRate);
  }

// Singleton instance
let instance: AgentRuleOptimizer | null = null;

export function getAgentRuleOptimizer(
  metricsService?: AgentMetricsService
): AgentRuleOptimizer {
  if (!instance) {
    instance = new AgentRuleOptimizer(metricsService);
  }
  return instance;
}

