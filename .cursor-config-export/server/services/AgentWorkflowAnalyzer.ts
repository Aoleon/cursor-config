import { logger } from '../utils/logger';
import { withErrorHandling } from '../utils/error-handler';
import { getAgentWorkflowAuditor } from './AgentWorkflowAuditor';
import { getAgentWorkflowOptimizer } from './AgentWorkflowOptimizer';
import { getAgentPerformanceOptimizer } from './AgentPerformanceOptimizer';
import { getAgentQualityLearning } from './AgentQualityLearning';
import type { IStorage } from '../storage-poc';

// ========================================
// TYPES ET INTERFACES
// ========================================

export interface WorkflowAnalysis {
  workflowName: string;
  health: {
    score: number; // 0-100
    status: 'excellent' | 'good' | 'acceptable' | 'poor' | 'critical';
    factors: Array<{
      factor: string;
      score: number;
      weight: number;
    }>;
  };
  performance: {
    avgDuration: number;
    p50: number;
    p95: number;
    p99: number;
    trend: 'improving' | 'degrading' | 'stable';
  };
  quality: {
    avgScore: number;
    minScore: number;
    maxScore: number;
    trend: 'improving' | 'degrading' | 'stable';
  };
  reliability: {
    successRate: number;
    errorRate: number;
    failurePatterns: Array<{
      pattern: string;
      frequency: number;
      impact: number;
    }>;
  };
  efficiency: {
    cacheHitRate: number;
    parallelizationRate: number;
    optimizationRate: number;
    wasteRate: number; // % temps perdu
  };
  recommendations: Array<{
    priority: 'low' | 'medium' | 'high' | 'critical';
    category: 'performance' | 'quality' | 'reliability' | 'efficiency';
    action: string;
    estimatedImpact: number;
    effort: number;
  }>;
}

// ========================================
// AGENT WORKFLOW ANALYZER
// ========================================

/**
 * Service d'analyse approfondie des workflows
 * Analyse santé, performance, qualité, fiabilité, efficacité
 * Génère recommandations prioritaires
 */
export class AgentWorkflowAnalyzer {
  private storage: IStorage;
  private workflowAuditor: ReturnType<typeof getAgentWorkflowAuditor>;
  private workflowOptimizer: ReturnType<typeof getAgentWorkflowOptimizer>;
  private performanceOptimizer: ReturnType<typeof getAgentPerformanceOptimizer>;
  private qualityLearning: ReturnType<typeof getAgentQualityLearning>;

  constructor(storage: IStorage) {
    if (!storage) {
      throw new Error('Storage requis pour AgentWorkflowAnalyzer');
    }
    this.storage = storage;
    this.workflowAuditor = getAgentWorkflowAuditor(storage);
    this.workflowOptimizer = getAgentWorkflowOptimizer(storage);
    this.performanceOptimizer = getAgentPerformanceOptimizer(storage);
    this.qualityLearning = getAgentQualityLearning(storage);
  }

  /**
   * Analyse workflow approfondie
   */
  async analyzeWorkflow(
    workflowName: string
  ): Promise<WorkflowAnalysis> {
    return withErrorHandling(
      async () => {
        // 1. Auditer workflow
        const audit = await this.workflowAuditor.auditWorkflow(workflowName);

        // 2. Analyser santé
        const health = this.analyzeHealth(audit);

        // 3. Analyser performance
        const performance = this.analyzePerformance(audit);

        // 4. Analyser qualité
        const quality = this.analyzeQuality(audit);

        // 5. Analyser fiabilité
        const reliability = this.analyzeReliability(audit);

        // 6. Analyser efficacité
        const efficiency = this.analyzeEfficiency(audit);

        // 7. Générer recommandations
        const recommendations = this.generateRecommendations(
          health,
          performance,
          quality,
          reliability,
          efficiency,
          audit
        );

        logger.info('Analyse workflow terminée', {
          metadata: {
            service: 'AgentWorkflowAnalyzer',
            operation: 'analyzeWorkflow',
            workflowName,
            healthScore: health.score,
            avgDuration: performance.avgDuration,
            avgQuality: quality.avgScore,
            successRate: reliability.successRate
          }
        });

        return {
          workflowName,
          health,
          performance,
          quality,
          reliability,
          efficiency,
          recommendations
        };
      },
      {
        operation: 'analyzeWorkflow',
        service: 'AgentWorkflowAnalyzer',
        metadata: {}
      }
    );
  }

  /**
   * Analyse santé workflow
   */
  private analyzeHealth(
    audit: Awaited<ReturnType<ReturnType<typeof getAgentWorkflowAuditor>['auditWorkflow']>>
  ): WorkflowAnalysis['health'] {
    const factors: Array<{
      factor: string;
      score: number;
      weight: number;
    }> = [];

    // Facteur: Success rate
    factors.push({
      factor: 'success_rate',
      score: audit.analysis.successRate * 100,
      weight: 0.3
    });

    // Facteur: Performance
    const performanceScore = audit.analysis.avgDuration < 5000 ? 100 :
                           audit.analysis.avgDuration < 10000 ? 80 :
                           audit.analysis.avgDuration < 20000 ? 60 : 40;
    factors.push({
      factor: 'performance',
      score: performanceScore,
      weight: 0.25
    });

    // Facteur: Qualité
    factors.push({
      factor: 'quality',
      score: audit.analysis.avgQualityScore,
      weight: 0.25
    });

    // Facteur: Bottlenecks
    const bottlenecksScore = audit.analysis.bottlenecks.length === 0 ? 100 :
                             audit.analysis.bottlenecks.length <= 2 ? 80 :
                             audit.analysis.bottlenecks.length <= 5 ? 60 : 40;
    factors.push({
      factor: 'bottlenecks',
      score: bottlenecksScore,
      weight: 0.2
    });

    // Calculer score global
    const score = factors.reduce((sum, f) => sum + (f.score * f.weight), 0);

    // Déterminer statut
    const status: WorkflowAnalysis['health']['status'] = 
      score >= 90 ? 'excellent' :
      score >= 75 ? 'good' :
      score >= 60 ? 'acceptable' :
      score >= 40 ? 'poor' :
      'critical';

    return {
      score,
      status,
      factors
    };
  }

  /**
   * Analyse performance
   */
  private analyzePerformance(
    audit: Awaited<ReturnType<ReturnType<typeof getAgentWorkflowAuditor>['auditWorkflow']>>
  ): WorkflowAnalysis['performance'] {
    const durations = audit.executions
      .filter(e => e.duration !== undefined)
      .map(e => e.duration!)
      .sort((a, b) => a - b);

    const avgDuration = audit.analysis.avgDuration;
    const p50 = durations[Math.floor(durations.length * 0.5)] || avgDuration;
    const p95 = durations[Math.floor(durations.length * 0.95)] || avgDuration;
    const p99 = durations[Math.floor(durations.length * 0.99)] || avgDuration;

    // Analyser tendance (simplifié)
    const recent = durations.slice(-10);
    const older = durations.slice(0, Math.max(0, durations.length - 10));
    const recentAvg = recent.length > 0 ? recent.reduce((sum, d) => sum + d, 0) / recent.length : avgDuration;
    const olderAvg = older.length > 0 ? older.reduce((sum, d) => sum + d, 0) / older.length : avgDuration;

    const trend: 'improving' | 'degrading' | 'stable' = 
      recentAvg < olderAvg * 0.9 ? 'improving' :
      recentAvg > olderAvg * 1.1 ? 'degrading' :
      'stable';

    return {
      avgDuration,
      p50,
      p95,
      p99,
      trend
    };
  }

  /**
   * Analyse qualité
   */
  private analyzeQuality(
    audit: Awaited<ReturnType<ReturnType<typeof getAgentWorkflowAuditor>['auditWorkflow']>>
  ): WorkflowAnalysis['quality'] {
    const qualityScores = audit.executions
      .filter(e => e.qualityScore !== undefined)
      .map(e => e.qualityScore!);

    const avgScore = audit.analysis.avgQualityScore;
    const minScore = qualityScores.length > 0 ? Math.min(...qualityScores) : avgScore;
    const maxScore = qualityScores.length > 0 ? Math.max(...qualityScores) : avgScore;

    // Analyser tendance
    const recent = qualityScores.slice(-10);
    const older = qualityScores.slice(0, Math.max(0, qualityScores.length - 10));
    const recentAvg = recent.length > 0 ? recent.reduce((sum, s) => sum + s, 0) / recent.length : avgScore;
    const olderAvg = older.length > 0 ? older.reduce((sum, s) => sum + s, 0) / older.length : avgScore;

    const trend: 'improving' | 'degrading' | 'stable' = 
      recentAvg > olderAvg * 1.05 ? 'improving' :
      recentAvg < olderAvg * 0.95 ? 'degrading' :
      'stable';

    return {
      avgScore,
      minScore,
      maxScore,
      trend
    };
  }

  /**
   * Analyse fiabilité
   */
  private analyzeReliability(
    audit: Awaited<ReturnType<ReturnType<typeof getAgentWorkflowAuditor>['auditWorkflow']>>
  ): WorkflowAnalysis['reliability'] {
    const successRate = audit.analysis.successRate;
    const errorRate = 1 - successRate;

    // Analyser patterns d'échec
    const failurePatterns: Array<{
      pattern: string;
      frequency: number;
      impact: number;
    }> = [];

    const failedExecutions = audit.executions.filter(e => !e.success);
    const stepFailures = new Map<string, number>();

    for (const execution of failedExecutions) {
      for (const step of execution.steps) {
        if (!step.success) {
          const existing = stepFailures.get(step.name) || 0;
          stepFailures.set(step.name, existing + 1);
        }
      }
    }

    for (const [stepName, count] of Array.from(stepFailures.entries())) {
      failurePatterns.push({
        pattern: `Échec step: ${stepName}`,
        frequency: count,
        impact: (count / failedExecutions.length) * 100
      });
    }

    return {
      successRate,
      errorRate,
      failurePatterns: failurePatterns.sort((a, b) => b.impact - a.impact).slice(0, 5)
    };
  }

  /**
   * Analyse efficacité
   */
  private analyzeEfficiency(
    audit: Awaited<ReturnType<ReturnType<typeof getAgentWorkflowAuditor>['auditWorkflow']>>
  ): WorkflowAnalysis['efficiency'] {
    let totalCacheHits = 0;
    let totalParallelized = 0;
    let totalSteps = 0;

    for (const execution of audit.executions) {
      for (const step of execution.steps) {
        totalSteps++;
        if (step.cacheHit) totalCacheHits++;
        if (step.parallelized) totalParallelized++;
      }
    }

    const cacheHitRate = totalSteps > 0 ? (totalCacheHits / totalSteps) * 100 : 0;
    const parallelizationRate = totalSteps > 0 ? (totalParallelized / totalSteps) * 100 : 0;

    // Calculer optimisation rate (steps avec cache ou parallélisation)
    const optimizationRate = totalSteps > 0
      ? ((totalCacheHits + totalParallelized) / totalSteps) * 100
      : 0;

    // Calculer waste rate (temps perdu dans bottlenecks)
    const totalBottleneckTime = audit.analysis.bottlenecks.reduce(
      (sum, b) => sum + b.avgDuration * b.frequency,
      0
    );
    const totalTime = audit.executions.reduce(
      (sum, e) => sum + (e.duration || 0),
      0
    );
    const wasteRate = totalTime > 0 ? (totalBottleneckTime / totalTime) * 100 : 0;

    return {
      cacheHitRate,
      parallelizationRate,
      optimizationRate,
      wasteRate
    };
  }

  /**
   * Génère recommandations
   */
  private generateRecommendations(
    health: WorkflowAnalysis['health'],
    performance: WorkflowAnalysis['performance'],
    quality: WorkflowAnalysis['quality'],
    reliability: WorkflowAnalysis['reliability'],
    efficiency: WorkflowAnalysis['efficiency'],
    audit: Awaited<ReturnType<ReturnType<typeof getAgentWorkflowAuditor>['auditWorkflow']>>
  ): WorkflowAnalysis['recommendations'] {
    const recommendations: WorkflowAnalysis['recommendations'] = [];

    // Recommandations santé
    if (health.score < 60) {
      recommendations.push({
        priority: 'critical',
        category: 'quality',
        action: `Améliorer santé workflow (score: ${health.score.toFixed(0)})`,
        estimatedImpact: 90,
        effort: 30
      });
    }

    // Recommandations performance
    if (performance.avgDuration > 10000) {
      recommendations.push({
        priority: 'high',
        category: 'performance',
        action: `Réduire durée moyenne (${performance.avgDuration.toFixed(0)}ms)`,
        estimatedImpact: 70,
        effort: 20
      });
    }

    if (performance.trend === 'degrading') {
      recommendations.push({
        priority: 'high',
        category: 'performance',
        action: 'Corriger dégradation performance',
        estimatedImpact: 80,
        effort: 25
      });
    }

    // Recommandations qualité
    if (quality.avgScore < 85) {
      recommendations.push({
        priority: 'high',
        category: 'quality',
        action: `Améliorer qualité moyenne (${quality.avgScore.toFixed(0)}%)`,
        estimatedImpact: 85,
        effort: 25
      });
    }

    if (quality.trend === 'degrading') {
      recommendations.push({
        priority: 'high',
        category: 'quality',
        action: 'Corriger dégradation qualité',
        estimatedImpact: 75,
        effort: 20
      });
    }

    // Recommandations fiabilité
    if (reliability.successRate < 0.8) {
      recommendations.push({
        priority: 'critical',
        category: 'reliability',
        action: `Améliorer success rate (${(reliability.successRate * 100).toFixed(0)}%)`,
        estimatedImpact: 95,
        effort: 30
      });
    }

    if (reliability.failurePatterns.length > 0) {
      const topFailure = reliability.failurePatterns[0];
      recommendations.push({
        priority: 'high',
        category: 'reliability',
        action: `Corriger pattern d'échec: ${topFailure.pattern}`,
        estimatedImpact: topFailure.impact,
        effort: 15
      });
    }

    // Recommandations efficacité
    if (efficiency.cacheHitRate < 50) {
      recommendations.push({
        priority: 'medium',
        category: 'efficiency',
        action: `Améliorer cache hit rate (${efficiency.cacheHitRate.toFixed(0)}%)`,
        estimatedImpact: 50,
        effort: 10
      });
    }

    if (efficiency.parallelizationRate < 30) {
      recommendations.push({
        priority: 'medium',
        category: 'efficiency',
        action: `Améliorer parallélisation (${efficiency.parallelizationRate.toFixed(0)}%)`,
        estimatedImpact: 40,
        effort: 15
      });
    }

    if (efficiency.wasteRate > 30) {
      recommendations.push({
        priority: 'high',
        category: 'efficiency',
        action: `Réduire waste rate (${efficiency.wasteRate.toFixed(0)}%)`,
        estimatedImpact: 60,
        effort: 20
      });
    }

    // Recommandations depuis audit
    for (const rec of audit.recommendations) {
      if (rec.priority === 'high' || rec.priority === 'critical') {
        recommendations.push({
          priority: rec.priority,
          category: 'performance',
          action: rec.action,
          estimatedImpact: rec.estimatedImpact,
          effort: rec.effort
        });
      }
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Analyse tous les workflows
   */
  async analyzeAllWorkflows(): Promise<Map<string, WorkflowAnalysis>> {
    return withErrorHandling(
      async () => {
        const audits = await this.workflowAuditor.auditAllWorkflows();
        const analyses = new Map<string, WorkflowAnalysis>();

        for (const [workflowName, audit] of audits.entries()) {
          const analysis = await this.analyzeWorkflow(workflowName);
          analyses.set(workflowName, analysis);
        }

        return analyses;
      },
      {
        operation: 'analyzeAllWorkflows',
        service: 'AgentWorkflowAnalyzer',
        metadata: {}
      }
    );
  }
}

// ========================================
// SINGLETON INSTANCE
// ========================================

let agentWorkflowAnalyzerInstance: AgentWorkflowAnalyzer | null = null;

export function getAgentWorkflowAnalyzer(storage: IStorage): AgentWorkflowAnalyzer {
  if (!agentWorkflowAnalyzerInstance) {
    agentWorkflowAnalyzerInstance = new AgentWorkflowAnalyzer(storage);
  }
  return agentWorkflowAnalyzerInstance;
}

