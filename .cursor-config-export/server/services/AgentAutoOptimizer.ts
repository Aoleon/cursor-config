import { logger } from '../utils/logger';
import { withErrorHandling } from '../utils/error-handler';
import { getToolCallAnalyzer } from './ToolCallAnalyzer';
import { getToolCallOptimizer } from './ToolCallOptimizer';
import { getIntelligentPreloader } from './IntelligentPreloader';
import { getAgentParameterTuner } from './AgentParameterTuner';
import { getRegressionDetector } from './RegressionDetector';
import { getAgentPerformanceMetricsService } from './AgentPerformanceMetricsService';
import { getAgentLearningService } from './AgentLearningService';
import { getAgentAutomationDetector } from './AgentAutomationDetector';
import { getAgentScriptRunner } from './AgentScriptRunner';
import type { IStorage } from '../storage-poc';

// ========================================
// TYPES ET INTERFACES
// ========================================

export interface OptimizationOpportunity {
  id: string;
  type: 'parallelization' | 'caching' | 'preloading' | 'parameter_tuning' | 'error_handling' | 'sequence_optimization';
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  currentState: string;
  suggestedImprovement: string;
  estimatedBenefit: number; // en millisecondes économisées
  confidence: number; // 0-1
  autoApplicable: boolean;
}

export interface AutoOptimizationResult {
  opportunities: OptimizationOpportunity[];
  applied: Array<{
    opportunityId: string;
    success: boolean;
    actualBenefit?: number;
    error?: string;
  }>;
  totalEstimatedBenefit: number;
  totalActualBenefit: number;
}

// ========================================
// AGENT AUTO OPTIMIZER
// ========================================

/**
 * Service d'auto-optimisation automatique de l'agent
 * Analyse les performances, identifie opportunités et applique optimisations automatiquement
 */
export class AgentAutoOptimizer {
  private storage: IStorage;
  private toolCallAnalyzer: ReturnType<typeof getToolCallAnalyzer>;
  private toolCallOptimizer: ReturnType<typeof getToolCallOptimizer>;
  private preloader: ReturnType<typeof getIntelligentPreloader>;
  private parameterTuner: ReturnType<typeof getAgentParameterTuner>;
  private regressionDetector: ReturnType<typeof getRegressionDetector>;
  private metricsService: ReturnType<typeof getAgentPerformanceMetricsService>;
  private learningService: ReturnType<typeof getAgentLearningService>;
  private automationDetector: ReturnType<typeof getAgentAutomationDetector>;
  private scriptRunner: ReturnType<typeof getAgentScriptRunner>;

  private readonly AUTO_OPTIMIZE_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
  private lastOptimizationTime: number = 0;

  constructor(storage: IStorage) {
    this.storage = storage;
    this.toolCallAnalyzer = getToolCallAnalyzer(storage);
    this.toolCallOptimizer = getToolCallOptimizer(storage);
    this.preloader = getIntelligentPreloader(storage);
    this.parameterTuner = getAgentParameterTuner(storage);
    this.regressionDetector = getRegressionDetector(storage);
    this.metricsService = getAgentPerformanceMetricsService(storage);
    this.learningService = getAgentLearningService();
    this.automationDetector = getAgentAutomationDetector(storage);
    this.scriptRunner = getAgentScriptRunner(storage);
  }

  /**
   * Analyse complète et identifie toutes les opportunités d'optimisation
   */
  async analyzeOptimizationOpportunities(): Promise<OptimizationOpportunity[]> {
    return withErrorHandling(
      async () => {
        const opportunities: OptimizationOpportunity[] = [];

        // 1. Analyser patterns tool calls
        const toolCallAnalysis = await this.toolCallAnalyzer.analyzePatterns();
        
        // Opportunités depuis recommandations
        for (const rec of toolCallAnalysis.recommendations) {
          opportunities.push({
            id: `tool-call-${rec.type}-${Date.now()}`,
            type: this.mapRecommendationType(rec.type),
            priority: rec.priority,
            description: rec.description,
            currentState: `Pattern inefficace détecté`,
            suggestedImprovement: rec.action,
            estimatedBenefit: rec.estimatedImprovement,
            confidence: 0.7,
            autoApplicable: rec.type === 'cache' || rec.type === 'parallelize'
          });
        }

        // 2. Analyser séquences pour optimisation
        for (const seq of toolCallAnalysis.sequences) {
          if (seq.suggestedOptimization && seq.frequency >= 5) {
            opportunities.push({
              id: `sequence-${seq.sequence.join('-')}-${Date.now()}`,
              type: 'sequence_optimization',
              priority: seq.suggestedOptimization.estimatedImprovement > 5000 ? 'high' : 'medium',
              description: `Séquence [${seq.sequence.join(' -> ')}] peut être optimisée`,
              currentState: `Séquence exécutée ${seq.frequency} fois, durée moyenne ${seq.avgTotalDuration.toFixed(0)}ms`,
              suggestedImprovement: seq.suggestedOptimization.description,
              estimatedBenefit: seq.suggestedOptimization.estimatedImprovement * seq.frequency,
              confidence: 0.8,
              autoApplicable: seq.canBeParallelized || seq.canBeCached
            });
          }
        }

        // 3. Vérifier régressions
        const performanceRegressions = await this.regressionDetector.detectPerformanceRegression(7);
        for (const regression of performanceRegressions) {
          opportunities.push({
            id: `regression-${regression.metric}-${Date.now()}`,
            type: 'parameter_tuning',
            priority: regression.severity === 'critical' ? 'critical' : regression.severity === 'high' ? 'high' : 'medium',
            description: `Régression détectée: ${regression.description}`,
            currentState: `Valeur actuelle: ${regression.currentValue.toFixed(2)}, baseline: ${regression.baselineValue.toFixed(2)}`,
            suggestedImprovement: regression.recommendations.join('; '),
            estimatedBenefit: Math.abs(regression.currentValue - regression.baselineValue) * 10, // Estimation
            confidence: 0.9,
            autoApplicable: regression.type === 'cache' || regression.type === 'performance'
          });
        }

        // 4. Vérifier paramètres à tuner
        const tuningResult = await this.parameterTuner.tuneParameters();
        if (tuningResult.parameters.length > 0) {
          for (const param of tuningResult.parameters) {
            if (param.confidence > 0.7 && param.impact === 'high') {
              opportunities.push({
                id: `parameter-${param.name}-${Date.now()}`,
                type: 'parameter_tuning',
                priority: 'high',
                description: `Paramètre ${param.name} peut être optimisé`,
                currentState: `Valeur actuelle: ${param.currentValue}`,
                suggestedImprovement: `Ajuster à ${param.optimalValue} (${param.reason})`,
                estimatedBenefit: Math.abs(param.optimalValue - param.currentValue) * 100, // Estimation
                confidence: param.confidence,
                autoApplicable: true
              });
            }
          }
        }

        // 5. Analyser métriques pour opportunités
        const metrics = this.metricsService.getMetrics();
        
        // Cache hit rate faible
        if (metrics.toolCalls.cacheHitRate < 50 && metrics.toolCalls.total > 20) {
          opportunities.push({
            id: `cache-hit-rate-${Date.now()}`,
            type: 'caching',
            priority: 'medium',
            description: `Cache hit rate faible: ${metrics.toolCalls.cacheHitRate.toFixed(1)}%`,
            currentState: `${metrics.toolCalls.cached}/${metrics.toolCalls.total} cache hits`,
            suggestedImprovement: 'Augmenter TTL cache ou améliorer clés cache',
            estimatedBenefit: metrics.toolCalls.total * 200 * 0.5, // 50% amélioration estimée
            confidence: 0.6,
            autoApplicable: true
          });
        }

        // Parallélisation sous-utilisée
        const parallelizationRate = metrics.parallelization.totalOperations > 0
          ? (metrics.parallelization.parallelized / metrics.parallelization.totalOperations) * 100
          : 0;
        if (parallelizationRate < 30 && metrics.parallelization.totalOperations > 10) {
          opportunities.push({
            id: `parallelization-${Date.now()}`,
            type: 'parallelization',
            priority: 'medium',
            description: `Parallélisation sous-utilisée: ${parallelizationRate.toFixed(1)}%`,
            currentState: `${metrics.parallelization.parallelized}/${metrics.parallelization.totalOperations} opérations parallélisées`,
            suggestedImprovement: 'Augmenter parallélisation automatique',
            estimatedBenefit: metrics.parallelization.sequential * metrics.parallelization.averageTimeSaved,
            confidence: 0.7,
            autoApplicable: true
          });
        }

        // 6. Détecter opportunités d'automatisation
        try {
          const optimizationOperations = opportunities.map(opp => ({
            id: opp.id,
            type: opp.type,
            description: opp.description,
            duration: opp.estimatedBenefit,
            success: true
          }));

          const automationOpportunities = await this.automationDetector.detectAutomationOpportunities(
            'auto-optimizer',
            optimizationOperations
          );

          // Convertir opportunités d'automatisation en opportunités d'optimisation
          for (const autoOpp of automationOpportunities.opportunities) {
            if (autoOpp.confidence >= 7) {
              opportunities.push({
                id: `automation-${autoOpp.id}`,
                type: autoOpp.type === 'parallel' ? 'parallelization' : 'sequence_optimization',
                priority: autoOpp.confidence >= 8 ? 'high' : 'medium',
                description: `Automatisation: ${autoOpp.description}`,
                currentState: 'Opération manuelle répétitive',
                suggestedImprovement: autoOpp.suggestedAction.script || autoOpp.suggestedAction.command || 'Créer script',
                estimatedBenefit: autoOpp.estimatedBenefit.timeSaved,
                confidence: autoOpp.confidence / 10,
                autoApplicable: true
              });
            }
          }
        } catch (error) {
          logger.debug('Erreur détection automatisation', {
            metadata: {
              service: 'AgentAutoOptimizer',
              operation: 'analyzeOptimizationOpportunities',
              error: error instanceof Error ? error.message : String(error)
            }
          });
        }

        // Trier par priorité et bénéfice estimé
        return opportunities.sort((a, b) => {
          const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
          const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
          if (priorityDiff !== 0) return priorityDiff;
          return b.estimatedBenefit - a.estimatedBenefit;
        });
      },
      {
        operation: 'analyzeOptimizationOpportunities',
        service: 'AgentAutoOptimizer',
        metadata: {}
      }
    );
  }

  /**
   * Applique automatiquement les optimisations applicables
   */
  async applyAutoOptimizations(
    opportunities?: OptimizationOpportunity[]
  ): Promise<AutoOptimizationResult> {
    return withErrorHandling(
      async () => {
        const opps = opportunities || await this.analyzeOptimizationOpportunities();
        const autoApplicable = opps.filter(o => o.autoApplicable && o.confidence > 0.7);
        
        const applied: AutoOptimizationResult['applied'] = [];
        let totalActualBenefit = 0;

        for (const opp of autoApplicable.slice(0, 10)) { // Limiter à 10 optimisations par run
          try {
            let success = false;
            let actualBenefit = 0;

            switch (opp.type) {
              case 'parameter_tuning':
                // Appliquer tuning paramètres
                const tuningResult = await this.parameterTuner.tuneParameters();
                if (tuningResult.applied) {
                  success = true;
                  actualBenefit = tuningResult.totalImprovement;
                }
                break;

              case 'caching':
                // Améliorer cache via ParameterTuner
                const cacheTuning = await this.parameterTuner.tuneParameters();
                const cacheParams = cacheTuning.parameters.filter(p => 
                  p.name.includes('TTL') || p.name.includes('CACHE')
                );
                if (cacheParams.length > 0) {
                  success = true;
                  actualBenefit = cacheParams.reduce((sum, p) => 
                    sum + Math.abs(p.optimalValue - p.currentValue) * 50, 0
                  );
                }
                break;

              case 'parallelization':
                // Les optimisations de parallélisation sont appliquées automatiquement
                // via ToolCallOptimizer lors de l'exécution
                success = true;
                actualBenefit = opp.estimatedBenefit * 0.5; // Estimation conservatrice
                break;

              case 'sequence_optimization':
                // Les optimisations de séquences sont appliquées via ToolCallOptimizer
                // Si c'est une opportunité d'automatisation, utiliser script
                if (opp.id.startsWith('automation-')) {
                  try {
                    // Extraire script depuis description
                    const scriptMatch = opp.suggestedImprovement.match(/scripts\/([^\s]+)/);
                    if (scriptMatch) {
                      const scriptResult = await this.scriptRunner.runScript(scriptMatch[1], {
                        cache: true,
                        retry: true
                      });
                      success = scriptResult.success;
                      actualBenefit = scriptResult.success ? opp.estimatedBenefit * 0.7 : 0;
                    } else {
                      success = true;
                      actualBenefit = opp.estimatedBenefit * 0.6;
                    }
                  } catch (error) {
                    success = false;
                    logger.debug('Erreur exécution script automatisation', {
                      metadata: {
                        service: 'AgentAutoOptimizer',
                        operation: 'applyAutoOptimizations',
                        opportunityId: opp.id,
                        error: error instanceof Error ? error.message : String(error)
                      }
                    });
                  }
                } else {
                  success = true;
                  actualBenefit = opp.estimatedBenefit * 0.6; // Estimation conservatrice
                }
                break;

              default:
                success = false;
            }

            applied.push({
              opportunityId: opp.id,
              success,
              actualBenefit: success ? actualBenefit : undefined
            });

            if (success) {
              totalActualBenefit += actualBenefit;
            }
          } catch (error) {
            applied.push({
              opportunityId: opp.id,
              success: false,
              error: error instanceof Error ? error.message : String(error)
            });
          }
        }

        const totalEstimatedBenefit = autoApplicable.reduce((sum, o) => sum + o.estimatedBenefit, 0);

        logger.info('Auto-optimisations appliquées', {
          metadata: {
            service: 'AgentAutoOptimizer',
            operation: 'applyAutoOptimizations',
            opportunitiesAnalyzed: opps.length,
            autoApplicable: autoApplicable.length,
            applied: applied.filter(a => a.success).length,
            totalEstimatedBenefit,
            totalActualBenefit
          }
        });

        return {
          opportunities: opps,
          applied,
          totalEstimatedBenefit,
          totalActualBenefit
        };
      },
      {
        operation: 'applyAutoOptimizations',
        service: 'AgentAutoOptimizer',
        metadata: {}
      }
    );
  }

  /**
   * Optimise automatiquement une tâche avant exécution
   */
  async optimizeTaskExecution(
    taskDescription: string,
    plannedOperations: Array<{
      id: string;
      toolName: string;
      execute: () => Promise<unknown>;
      dependencies?: string[];
      metadata?: {
        query?: string;
        filePath?: string;
      };
    }>
  ): Promise<{
    optimizedPlan: Awaited<ReturnType<ReturnType<typeof getToolCallOptimizer>['optimizeToolCallPlan']>>;
    preloadCandidates: Awaited<ReturnType<ReturnType<typeof getIntelligentPreloader>['identifyPreloadCandidates']>>;
    predictedTools: Awaited<ReturnType<ReturnType<typeof getToolCallAnalyzer>['predictToolCalls']>>;
  }> {
    return withErrorHandling(
      async () => {
        // 1. Prédire tool calls probables
        const predictedTools = await this.toolCallAnalyzer.predictToolCalls(taskDescription);

        // 2. Identifier candidats préchargement
        const preloadCandidates = await this.preloader.identifyPreloadCandidates(
          taskDescription,
          {
            currentFiles: plannedOperations
              .filter(op => op.metadata?.filePath)
              .map(op => op.metadata!.filePath!),
            recentToolCalls: plannedOperations.map(op => op.toolName)
          }
        );

        // 3. Optimiser plan d'opérations
        const optimizedPlan = await this.toolCallOptimizer.optimizeToolCallPlan(plannedOperations);

        logger.info('Tâche optimisée avant exécution', {
          metadata: {
            service: 'AgentAutoOptimizer',
            operation: 'optimizeTaskExecution',
            taskDescription: taskDescription.substring(0, 100),
            operationsCount: plannedOperations.length,
            predictedToolsCount: predictedTools.length,
            preloadCandidatesCount: preloadCandidates.length,
            estimatedTimeSaved: optimizedPlan.estimatedTimeSaved
          }
        });

        return {
          optimizedPlan: optimizedPlan as Awaited<ReturnType<typeof this.toolCallOptimizer.optimizeToolCallPlan>>,
          preloadCandidates: preloadCandidates as Awaited<ReturnType<typeof this.preloader.identifyPreloadCandidates>>,
          predictedTools: predictedTools as Awaited<ReturnType<typeof this.toolCallAnalyzer.predictToolCalls>>
        };
      },
      {
        operation: 'optimizeTaskExecution',
        service: 'AgentAutoOptimizer',
        metadata: {}
      }
    );
  }

  /**
   * Exécute optimisation périodique automatique
   */
  async runPeriodicOptimization(): Promise<AutoOptimizationResult> {
    const now = Date.now();
    if (now - this.lastOptimizationTime < this.AUTO_OPTIMIZE_INTERVAL_MS) {
      // Trop tôt pour ré-optimiser
      return {
        opportunities: [],
        applied: [],
        totalEstimatedBenefit: 0,
        totalActualBenefit: 0
      };
    }

    this.lastOptimizationTime = now;
    return this.applyAutoOptimizations();
  }

  /**
   * Mappe type de recommandation vers type d'opportunité
   */
  private mapRecommendationType(
    recType: string
  ): OptimizationOpportunity['type'] {
    if (recType === 'parallelize' || recType === 'parallel') return 'parallelization';
    if (recType === 'cache') return 'caching';
    if (recType === 'preload') return 'preloading';
    if (recType === 'optimization') return 'sequence_optimization';
    return 'sequence_optimization';
  }

  /**
   * Génère rapport d'optimisation
   */
  async generateOptimizationReport(): Promise<{
    opportunities: OptimizationOpportunity[];
    metrics: {
      totalToolCalls: number;
      cacheHitRate: number;
      parallelizationRate: number;
      avgResponseTime: number;
    };
    recommendations: Array<{
      priority: string;
      action: string;
      estimatedBenefit: number;
    }>;
  }> {
    return withErrorHandling(
      async () => {
        const opportunities = await this.analyzeOptimizationOpportunities();
        const metrics = this.metricsService.getMetrics();
        const toolCallAnalysis = await this.toolCallAnalyzer.analyzePatterns();

        const recommendations = opportunities
          .filter(o => o.priority === 'high' || o.priority === 'critical')
          .map(o => ({
            priority: o.priority,
            action: o.suggestedImprovement,
            estimatedBenefit: o.estimatedBenefit
          }));

        const parallelizationRate = metrics.parallelization.totalOperations > 0
          ? (metrics.parallelization.parallelized / metrics.parallelization.totalOperations) * 100
          : 0;

        return {
          opportunities,
          metrics: {
            totalToolCalls: metrics.toolCalls.total,
            cacheHitRate: metrics.toolCalls.cacheHitRate,
            parallelizationRate,
            avgResponseTime: metrics.aiRequests.averageResponseTime
          },
          recommendations
        };
      },
      {
        operation: 'generateOptimizationReport',
        service: 'AgentAutoOptimizer',
        metadata: {}
      }
    );
  }
}

// ========================================
// SINGLETON INSTANCE
// ========================================

let agentAutoOptimizerInstance: AgentAutoOptimizer | null = null;

export function getAgentAutoOptimizer(storage: IStorage): AgentAutoOptimizer {
  if (!agentAutoOptimizerInstance) {
    agentAutoOptimizerInstance = new AgentAutoOptimizer(storage);
  }
  return agentAutoOptimizerInstance;
}

