import { logger } from '../utils/logger';
import { withErrorHandling } from '../utils/error-handler';
import { getAgentPerformanceOptimizer } from './AgentPerformanceOptimizer';
import { getAgentQualityLearning } from './AgentQualityLearning';
import type { IStorage } from '../storage-poc';

// ========================================
// TYPES ET INTERFACES
// ========================================

export interface WorkflowStep {
  id: string;
  name: string;
  type: 'prediction' | 'analysis' | 'correction' | 'validation' | 'optimization' | 'other';
  duration: number; // ms
  success: boolean;
  cacheHit?: boolean;
  parallelized?: boolean;
  dependencies?: string[];
  error?: string;
}

export interface WorkflowExecution {
  id: string;
  workflowName: string;
  startTime: number;
  endTime?: number;
  duration?: number; // ms
  steps: WorkflowStep[];
  success: boolean;
  qualityScore?: number;
  performanceScore?: number;
  bottlenecks?: Array<{
    step: string;
    duration: number;
    percentage: number; // % du temps total
  }>;
}

export interface WorkflowAuditResult {
  workflowName: string;
  executions: WorkflowExecution[];
  analysis: {
    avgDuration: number;
    successRate: number;
    avgQualityScore: number;
    avgPerformanceScore: number;
    bottlenecks: Array<{
      step: string;
      avgDuration: number;
      frequency: number;
      impact: number; // 0-100
    }>;
    optimizations: Array<{
      type: 'cache' | 'parallelize' | 'skip' | 'optimize';
      step: string;
      estimatedImprovement: number; // percentage
      description: string;
    }>;
  };
  recommendations: Array<{
    priority: 'low' | 'medium' | 'high' | 'critical';
    action: string;
    estimatedImpact: number; // 0-100
    effort: number; // minutes
  }>;
}

// ========================================
// AGENT WORKFLOW AUDITOR
// ========================================

/**
 * Service d'audit des workflows de l'agent
 * Analyse exécutions, identifie bottlenecks, génère recommandations
 * Améliore compréhension et optimisation des workflows
 */
export class AgentWorkflowAuditor {
  private storage: IStorage;
  private performanceOptimizer: ReturnType<typeof getAgentPerformanceOptimizer>;
  private qualityLearning: ReturnType<typeof getAgentQualityLearning>;
  private executions: Map<string, WorkflowExecution[]> = new Map();
  private readonly MAX_EXECUTIONS_PER_WORKFLOW = 1000;

  constructor(storage: IStorage) {
    if (!storage) {
      throw new Error('Storage requis pour AgentWorkflowAuditor');
    }
    this.storage = storage;
    this.performanceOptimizer = getAgentPerformanceOptimizer(storage);
    this.qualityLearning = getAgentQualityLearning(storage);
  }

  /**
   * Enregistre exécution workflow
   */
  recordExecution(execution: WorkflowExecution): void {
    const existing = this.executions.get(execution.workflowName) || [];
    existing.push(execution);

    // Limiter nombre d'exécutions
    if (existing.length > this.MAX_EXECUTIONS_PER_WORKFLOW) {
      existing.shift();
    }

    this.executions.set(execution.workflowName, existing);
  }

  /**
   * Audit workflow complet
   */
  async auditWorkflow(
    workflowName: string
  ): Promise<WorkflowAuditResult> {
    return withErrorHandling(
      async () => {
        const executions = this.executions.get(workflowName) || [];

        if (executions.length === 0) {
          return {
            workflowName,
            executions: [],
            analysis: {
              avgDuration: 0,
              successRate: 0,
              avgQualityScore: 0,
              avgPerformanceScore: 0,
              bottlenecks: [],
              optimizations: []
            },
            recommendations: []
          };
        }

        // 1. Analyser exécutions
        const analysis = this.analyzeExecutions(executions);

        // 2. Identifier optimisations
        const optimizations = this.identifyOptimizations(executions, analysis);

        // 3. Générer recommandations
        const recommendations = this.generateRecommendations(analysis, optimizations);

        logger.info('Audit workflow terminé', {
          metadata: {
            service: 'AgentWorkflowAuditor',
            operation: 'auditWorkflow',
            workflowName,
            executionsCount: executions.length,
            avgDuration: analysis.avgDuration,
            successRate: analysis.successRate,
            bottlenecksCount: analysis.bottlenecks.length,
            optimizationsCount: optimizations.length
          }
        });

        return {
          workflowName,
          executions,
          analysis: {
            ...analysis,
            optimizations
          },
          recommendations
        };
      },
      {
        operation: 'auditWorkflow',
        service: 'AgentWorkflowAuditor',
        metadata: {}
      }
    );
  }

  /**
   * Analyse exécutions
   */
  private analyzeExecutions(
    executions: WorkflowExecution[]
  ): WorkflowAuditResult['analysis'] {
    const successful = executions.filter(e => e.success);
    const avgDuration = executions.length > 0
      ? executions.reduce((sum, e) => sum + (e.duration || 0), 0) / executions.length
      : 0;
    const successRate = executions.length > 0
      ? successful.length / executions.length
      : 0;
    const avgQualityScore = successful.length > 0 && successful[0].qualityScore !== undefined
      ? successful.reduce((sum, e) => sum + (e.qualityScore || 0), 0) / successful.length
      : 0;
    const avgPerformanceScore = successful.length > 0 && successful[0].performanceScore !== undefined
      ? successful.reduce((sum, e) => sum + (e.performanceScore || 0), 0) / successful.length
      : 0;

    // Identifier bottlenecks
    const stepDurations = new Map<string, number[]>();
    for (const execution of executions) {
      for (const step of execution.steps) {
        const existing = stepDurations.get(step.name) || [];
        existing.push(step.duration);
        stepDurations.set(step.name, existing);
      }
    }

    const bottlenecks: Array<{
      step: string;
      avgDuration: number;
      frequency: number;
      impact: number;
    }> = [];

    for (const [stepName, durations] of Array.from(stepDurations.entries())) {
      const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
      const frequency = durations.length;
      const impact = avgDuration > 0 && avgDuration > 0
        ? (avgDuration / avgDuration) * 100
        : 0;

      if (avgDuration > avgDuration * 0.2) { // Plus de 20% du temps moyen
        bottlenecks.push({
          step: stepName,
          avgDuration,
          frequency,
          impact
        });
      }
    }

    // Trier par impact
    bottlenecks.sort((a, b) => b.impact - a.impact);

    return {
      avgDuration,
      successRate,
      avgQualityScore,
      avgPerformanceScore,
      bottlenecks: bottlenecks.slice(0, 10), // Top 10
      optimizations: []
    };
  }

  /**
   * Identifie optimisations
   */
  private identifyOptimizations(
    executions: WorkflowExecution[],
    analysis: WorkflowAuditResult['analysis']
  ): WorkflowAuditResult['analysis']['optimizations'] {
    const optimizations: WorkflowAuditResult['analysis']['optimizations'] = [];

    // Analyser chaque step
    const stepStats = new Map<string, {
      count: number;
      cacheHits: number;
      parallelized: number;
      avgDuration: number;
    }>();

    for (const execution of executions) {
      for (const step of execution.steps) {
        const existing = stepStats.get(step.name) || {
          count: 0,
          cacheHits: 0,
          parallelized: 0,
          avgDuration: 0
        };
        existing.count++;
        if (step.cacheHit) existing.cacheHits++;
        if (step.parallelized) existing.parallelized++;
        existing.avgDuration = (existing.avgDuration * (existing.count - 1) + step.duration) / existing.count;
        stepStats.set(step.name, existing);
      }
    }

    // Générer optimisations
    for (const [stepName, stats] of Array.from(stepStats.entries())) {
      // Optimisation: Cache
      if (stats.cacheHits / stats.count < 0.5 && stats.avgDuration > 1000) {
        optimizations.push({
          type: 'cache',
          step: stepName,
          estimatedImprovement: 50,
          description: `Activer cache pour ${stepName} (actuel: ${((stats.cacheHits / stats.count) * 100).toFixed(0)}%)`
        });
      }

      // Optimisation: Parallélisation
      if (stats.parallelized / stats.count < 0.3 && stats.avgDuration > 2000) {
        optimizations.push({
          type: 'parallelize',
          step: stepName,
          estimatedImprovement: 40,
          description: `Paralléliser ${stepName} (actuel: ${((stats.parallelized / stats.count) * 100).toFixed(0)}%)`
        });
      }

      // Optimisation: Skip si non critique
      if (stats.avgDuration > 5000 && analysis.successRate > 0.9) {
        optimizations.push({
          type: 'skip',
          step: stepName,
          estimatedImprovement: 100 * (stats.avgDuration / analysis.avgDuration),
          description: `Considérer skip ${stepName} si non critique (durée: ${stats.avgDuration.toFixed(0)}ms)`
        });
      }
    }

    // Optimisations basées sur bottlenecks
    for (const bottleneck of analysis.bottlenecks) {
      if (bottleneck.impact > 30) {
        optimizations.push({
          type: 'optimize',
          step: bottleneck.step,
          estimatedImprovement: bottleneck.impact,
          description: `Optimiser bottleneck ${bottleneck.step} (${bottleneck.impact.toFixed(0)}% du temps)`
        });
      }
    }

    return optimizations;
  }

  /**
   * Génère recommandations
   */
  private generateRecommendations(
    analysis: WorkflowAuditResult['analysis'],
    optimizations: WorkflowAuditResult['analysis']['optimizations']
  ): WorkflowAuditResult['recommendations'] {
    const recommendations: WorkflowAuditResult['recommendations'] = [];

    // Recommandation: Améliorer success rate
    if (analysis.successRate < 0.8) {
      recommendations.push({
        priority: 'high',
        action: `Améliorer success rate (actuel: ${(analysis.successRate * 100).toFixed(0)}%)`,
        estimatedImpact: 90,
        effort: 30
      });
    }

    // Recommandation: Réduire durée
    if (analysis.avgDuration > 10000) {
      recommendations.push({
        priority: 'high',
        action: `Réduire durée moyenne (actuel: ${analysis.avgDuration.toFixed(0)}ms)`,
        estimatedImpact: 80,
        effort: 20
      });
    }

    // Recommandations depuis optimisations
    for (const opt of optimizations) {
      if (opt.estimatedImprovement > 30) {
        recommendations.push({
          priority: opt.estimatedImprovement > 50 ? 'high' : 'medium',
          action: opt.description,
          estimatedImpact: opt.estimatedImprovement,
          effort: 10
        });
      }
    }

    // Recommandation: Améliorer qualité
    if (analysis.avgQualityScore < 85) {
      recommendations.push({
        priority: 'high',
        action: `Améliorer qualité moyenne (actuel: ${analysis.avgQualityScore.toFixed(0)}%)`,
        estimatedImpact: 85,
        effort: 25
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Audit tous les workflows
   */
  async auditAllWorkflows(): Promise<Map<string, WorkflowAuditResult>> {
    return withErrorHandling(
      async () => {
        const results = new Map<string, WorkflowAuditResult>();

        for (const workflowName of this.executions.keys()) {
          const audit = await this.auditWorkflow(workflowName);
          results.set(workflowName, audit);
        }

        return results;
      },
      {
        operation: 'auditAllWorkflows',
        service: 'AgentWorkflowAuditor',
        metadata: {}
      }
    );
  }

  /**
   * Compare workflows
   */
  async compareWorkflows(
    workflowNames: string[]
  ): Promise<{
    comparison: Array<{
      workflow: string;
      avgDuration: number;
      successRate: number;
      qualityScore: number;
      performanceScore: number;
    }>;
    bestWorkflow: string;
    recommendations: string[];
  }> {
    return withErrorHandling(
      async () => {
        const audits = await Promise.all(
          workflowNames.map(name => this.auditWorkflow(name))
        );

        const comparison = audits.map(audit => ({
          workflow: audit.workflowName,
          avgDuration: audit.analysis.avgDuration,
          successRate: audit.analysis.successRate,
          qualityScore: audit.analysis.avgQualityScore,
          performanceScore: audit.analysis.avgPerformanceScore
        }));

        // Identifier meilleur workflow (score composite)
        const scored = comparison.map(c => ({
          ...c,
          score: (c.successRate * 0.4) + 
                 (c.qualityScore / 100 * 0.3) + 
                 (c.performanceScore / 100 * 0.2) + 
                 (1 / (1 + c.avgDuration / 10000) * 0.1)
        }));

        const bestWorkflow = scored.sort((a, b) => b.score - a.score)[0].workflow;

        const recommendations: string[] = [];
        for (const audit of audits) {
          if (audit.workflowName !== bestWorkflow) {
            recommendations.push(
              `Considérer patterns de ${bestWorkflow} pour améliorer ${audit.workflowName}`
            );
          }
        }

        return {
          comparison,
          bestWorkflow,
          recommendations
        };
      },
      {
        operation: 'compareWorkflows',
        service: 'AgentWorkflowAuditor',
        metadata: {}
      }
    );
  }
}

// ========================================
// SINGLETON INSTANCE
// ========================================

let agentWorkflowAuditorInstance: AgentWorkflowAuditor | null = null;

export function getAgentWorkflowAuditor(storage: IStorage): AgentWorkflowAuditor {
  if (!agentWorkflowAuditorInstance) {
    agentWorkflowAuditorInstance = new AgentWorkflowAuditor(storage);
  }
  return agentWorkflowAuditorInstance;
}

