/**
 * AgentMetricsService
 * 
 * Service simplifié pour collecter et analyser les métriques de l'agent Cursor.
 * Version: 1.0.0
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

interface TaskMetrics {
  sessionId: string;
  timestamp: string;
  task: {
    id: string;
    description: string;
    complexity: 'simple' | 'medium' | 'complex';
    todosCount: number;
  };
  performance: {
    durationMs: number;
    toolCallsCount: number;
    toolCallsByType: Record<string, number>;
    contextUsage: {
      filesLoaded: number;
      rulesLoaded: number;
      estimatedTokens: number;
    };
  quality: {
    success: boolean;
    typescriptErrorsBefore: number;
    typescriptErrorsAfter: number;
    codeQualityScore: number;
  };
  usage: {
    rulesUsed: string[];
    searchesPerformed: Record<string, number>;
    filesModified: string[];
  };
  efficiency: {
    codeReused: boolean;
    iterationsCount: number;
    proactiveDetections: number;
  };
}

interface RuleUsage {
  rules: Record<string, {
    priority: 'P0' | 'P1' | 'P2';
    totalLoads: number;
    totalUses: number;
    usageRate: number;
    averageLoadsPerTask: number;
    lastLoaded: string;
    lastUsed: string | null;
    contexts: Record<string, number>;
  }>;
  summary: {
    totalRules: number;
    rulesWithHighUsage: number;
    rulesWithLowUsage: number;
    averageUsageRate: number;
  };
}

export class AgentMetricsService {
  private metricsDir: string;
  private metricsFile: string;
  private ruleUsageFile: string;

  constructor(projectRoot: string = process.cwd()) {
    this.metricsDir = join(projectRoot, '.cursor');
    this.metricsFile = join(this.metricsDir, 'agent-metrics.json');
    this.ruleUsageFile = join(this.metricsDir, 'rule-usage.json');
  }

  /**
   * Initialise le service (crée les fichiers nécessaires)
   */
  async initialize(): Promise<void> {
    try {
      if (!existsSync(this.metricsDir)) {
        await mkdir(this.metricsDir, { recursive: true });
      }

      // Initialiser fichiers si n'existent pas
      if (!existsSync(this.metricsFile)) {
        await writeFile(this.metricsFile, JSON.stringify([], null, 2));
      }

      if (!existsSync(this.ruleUsageFile)) {
        const initialUsage: RuleUsage = {
          rules: {},
          summary: {
            totalRules: 0,
            rulesWithHighUsage: 0,
            rulesWithLowUsage: 0,
            averageUsageRate: 0,
          },
        };
        await writeFile(this.ruleUsageFile, JSON.stringify(initialUsage, null, 2));
      }
    } catch (error) {
      console.error('Erreur initialisation AgentMetricsService:', error);
      // Ne pas bloquer si erreur
    }

  /**
   * Enregistre les métriques d'une tâche
   */
  async recordTaskMetrics(metrics: TaskMetrics): Promise<void> {
    try {
      await this.initialize();

      const existing = await this.loadMetrics();
      existing.push(metrics);

      await writeFile(this.metricsFile, JSON.stringify(existing, null, 2));
    } catch (error) {
      console.error('Erreur enregistrement métriques:', error);
      // Ne pas bloquer si erreur
    }

  /**
   * Charge les métriques existantes
   */
  async loadMetrics(): Promise<TaskMetrics[]> {
    try {
      if (!existsSync(this.metricsFile)) {
        return [];
      }

      const content = await readFile(this.metricsFile, 'utf-8');
      return JSON.parse(content) as TaskMetrics[];
    } catch (error) {
      console.error('Erreur chargement métriques:', error);
      return [];
    }

  /**
   * Met à jour l'usage d'une règle
   */
  async updateRuleUsage(
    ruleName: string,
    priority: 'P0' | 'P1' | 'P2',
    context: string,
    wasUsed: boolean
  ): Promise<void> {
    try {
      await this.initialize();

      const usage = await this.loadRuleUsage();

      if (!usage.rules[ruleName]) {
        usage.rules[ruleName] = {
          priority,
          totalLoads: 0,
          totalUses: 0,
          usageRate: 0,
          averageLoadsPerTask: 0,
          lastLoaded: new Date().toISOString(),
          lastUsed: null,
          contexts: {},
        };
      }

      const rule = usage.rules[ruleName];
      rule.totalLoads++;
      rule.lastLoaded = new Date().toISOString();

      if (wasUsed) {
        rule.totalUses++;
        rule.lastUsed = new Date().toISOString();
      }

      rule.usageRate = rule.totalUses / rule.totalLoads;

      if (!rule.contexts[context]) {
        rule.contexts[context] = 0;
      }
      rule.contexts[context]++;

      // Mettre à jour résumé
      this.updateSummary(usage);

      await writeFile(this.ruleUsageFile, JSON.stringify(usage, null, 2));
    } catch (error) {
      console.error('Erreur mise à jour usage règle:', error);
      // Ne pas bloquer si erreur
    }

  /**
   * Charge l'usage des règles
   */
  async loadRuleUsage(): Promise<RuleUsage> {
    try {
      if (!existsSync(this.ruleUsageFile)) {
        return {
          rules: {},
          summary: {
            totalRules: 0,
            rulesWithHighUsage: 0,
            rulesWithLowUsage: 0,
            averageUsageRate: 0,
          },
        };
      }

      const content = await readFile(this.ruleUsageFile, 'utf-8');
      return JSON.parse(content) as RuleUsage;
    } catch (error) {
      console.error('Erreur chargement usage règles:', error);
      return {
        rules: {},
        summary: {
          totalRules: 0,
          rulesWithHighUsage: 0,
          rulesWithLowUsage: 0,
          averageUsageRate: 0,
        },
      };
    }

  /**
   * Met à jour le résumé de l'usage
   */
  private updateSummary(usage: RuleUsage): void {
    const rules = Object.values(usage.rules);
    const totalRules = rules.length;

    const highUsage = rules.filter((r) => r.usageRate > 0.9).length;
    const lowUsage = rules.filter((r) => r.usageRate < 0.3).length;
    const averageUsageRate =
      rules.length > 0
        ? rules.reduce((sum, r) => sum + r.usageRate, 0) / rules.length
        : 0;

    usage.summary = {
      totalRules,
      rulesWithHighUsage: highUsage,
      rulesWithLowUsage: lowUsage,
      averageUsageRate,
    };
  }

  /**
   * Obtient les statistiques agrégées
   */
  async getStatistics(): Promise<{
    totalTasks: number;
    averageDuration: number;
    averageSuccessRate: number;
    averageQualityScore: number;
    mostUsedRules: Array<{ rule: string; usageRate: number }>;
    leastUsedRules: Array<{ rule: string; usageRate: number }>;
  }> {
    const metrics = await this.loadMetrics();
    const usage = await this.loadRuleUsage();

    if (metrics.length === 0) {
      return {
        totalTasks: 0,
        averageDuration: 0,
        averageSuccessRate: 0,
        averageQualityScore: 0,
        mostUsedRules: [],
        leastUsedRules: [],
      };
    }

    const totalTasks = metrics.length;
    const averageDuration =
      metrics.reduce((sum, m) => sum + m.performance.durationMs, 0) /
      totalTasks;
    const averageSuccessRate =
      metrics.filter((m) => m.quality.success).length / totalTasks;
    const averageQualityScore =
      metrics.reduce((sum, m) => sum + m.quality.codeQualityScore, 0) /
      totalTasks;

    const rules = Object.entries(usage.rules)
      .map(([rule, data]) => ({ rule, usageRate: data.usageRate }))
      .sort((a, b) => b.usageRate - a.usageRate);

    const mostUsedRules = rules.slice(0, 5);
    const leastUsedRules = rules.slice(-5).reverse();

    return {
      totalTasks,
      averageDuration,
      averageSuccessRate,
      averageQualityScore,
      mostUsedRules,
      leastUsedRules,
    };
  }

// Singleton instance
let instance: AgentMetricsService | null = null;

export function getAgentMetricsService(
  projectRoot?: string
): AgentMetricsService {
  if (!instance) {
    instance = new AgentMetricsService(projectRoot);
  }
  return instance;
}

