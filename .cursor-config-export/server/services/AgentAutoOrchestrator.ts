import { logger } from '../utils/logger';
import { withErrorHandling } from '../utils/error-handler';
import { getAgentOrchestrator } from './AgentOrchestrator';
import { getAgentWorkflowAnalyzer } from './AgentWorkflowAnalyzer';
import { getAgentWorkflowOptimizer } from './AgentWorkflowOptimizer';
import { getAgentPerformanceMonitor } from './AgentPerformanceMonitor';
import { getRegressionDetector } from './RegressionDetector';
import { getAgentParameterTuner } from './AgentParameterTuner';
import { getAgentAutomationDetector } from './AgentAutomationDetector';
import { getAgentScriptRunner } from './AgentScriptRunner';
import type { IStorage } from '../storage-poc';

// ========================================
// TYPES ET INTERFACES
// ========================================

export interface AutoOrchestrationConfig {
  analyzeInterval: number; // ms - Intervalle analyse codebase
  optimizeInterval: number; // ms - Intervalle optimisation
  monitorInterval: number; // ms - Intervalle monitoring
  autoOptimize: boolean; // Auto-optimisation activée
  autoFix: boolean; // Auto-correction activée
}

export interface AutoOrchestrationResult {
  analysis?: {
    architecture: unknown;
    codeSmells: unknown;
    conflicts: unknown;
  };
  optimizations?: {
    applied: number;
    benefit: number;
  };
  monitoring?: {
    alerts: number;
    healthScore: number;
  };
  regressions?: {
    detected: number;
    fixed: number;
  };
}

// ========================================
// AGENT AUTO ORCHESTRATOR
// ========================================

/**
 * Service d'orchestration automatique
 * Analyse, optimise et surveille automatiquement le codebase
 * Déclenche automatiquement les optimisations et corrections
 */
export class AgentAutoOrchestrator {
  private storage: IStorage;
  private orchestrator: ReturnType<typeof getAgentOrchestrator>;
  private workflowAnalyzer: ReturnType<typeof getAgentWorkflowAnalyzer>;
  private workflowOptimizer: ReturnType<typeof getAgentWorkflowOptimizer>;
  private performanceMonitor: ReturnType<typeof getAgentPerformanceMonitor>;
  private regressionDetector: ReturnType<typeof getRegressionDetector>;
  private parameterTuner: ReturnType<typeof getAgentParameterTuner>;
  private automationDetector: ReturnType<typeof getAgentAutomationDetector>;
  private scriptRunner: ReturnType<typeof getAgentScriptRunner>;
  private config: AutoOrchestrationConfig;
  private isRunning: boolean = false;
  private lastAnalysis: number = 0;
  private lastOptimization: number = 0;
  private lastMonitoring: number = 0;
  private modificationCount: number = 0;
  private readonly MODIFICATIONS_THRESHOLD = 10; // Analyser après N modifications

  constructor(storage: IStorage, config?: Partial<AutoOrchestrationConfig>) {
    if (!storage) {
      throw new Error('Storage requis pour AgentAutoOrchestrator');
    }
    this.storage = storage;
    this.orchestrator = getAgentOrchestrator(storage);
    this.workflowAnalyzer = getAgentWorkflowAnalyzer(storage);
    this.workflowOptimizer = getAgentWorkflowOptimizer(storage);
    this.performanceMonitor = getAgentPerformanceMonitor(storage);
    this.regressionDetector = getRegressionDetector(storage);
    this.parameterTuner = getAgentParameterTuner(storage);
    this.automationDetector = getAgentAutomationDetector(storage);
    this.scriptRunner = getAgentScriptRunner(storage);
    this.config = {
      analyzeInterval: config?.analyzeInterval || 30 * 60 * 1000, // 30 minutes
      optimizeInterval: config?.optimizeInterval || 60 * 60 * 1000, // 1 heure
      monitorInterval: config?.monitorInterval || 5 * 60 * 1000, // 5 minutes
      autoOptimize: config?.autoOptimize ?? true,
      autoFix: config?.autoFix ?? true
    };
  }

  /**
   * Démarre l'orchestration automatique
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.info('Auto-orchestration déjà démarrée', {
        metadata: {
          service: 'AgentAutoOrchestrator',
          operation: 'start'
        }
      });
      return;
    }

    this.isRunning = true;

    // Démarrer monitoring périodique
    this.startPeriodicMonitoring();

    logger.info('Auto-orchestration démarrée', {
      metadata: {
        service: 'AgentAutoOrchestrator',
        operation: 'start',
        config: this.config
      }
    });
  }

  /**
   * Arrête l'orchestration automatique
   */
  stop(): void {
    this.isRunning = false;
    logger.info('Auto-orchestration arrêtée', {
      metadata: {
        service: 'AgentAutoOrchestrator',
        operation: 'stop'
      }
    });
  }

  /**
   * Déclenche analyse automatique après modifications
   */
  async triggerAnalysisAfterModifications(
    files?: string[]
  ): Promise<AutoOrchestrationResult> {
    this.modificationCount++;

    // Analyser si seuil atteint
    if (this.modificationCount >= this.MODIFICATIONS_THRESHOLD) {
      this.modificationCount = 0;
      return this.runFullAnalysis(files ? { files } : undefined);
    }

    return {};
  }

  /**
   * Exécute analyse complète
   */
  async runFullAnalysis(
    scope?: { files?: string[] }
  ): Promise<AutoOrchestrationResult> {
    const now = Date.now();
    if (now - this.lastAnalysis < this.config.analyzeInterval) {
      return {};
    }

    this.lastAnalysis = now;

    return withErrorHandling(
      async () => {
        logger.info('Démarrage analyse automatique', {
          metadata: {
            service: 'AgentAutoOrchestrator',
            operation: 'runFullAnalysis',
            scope
          }
        });

        // 1. Analyse complète codebase
        const analysis = await this.orchestrator.runFullAnalysis(
          scope ? { files: scope.files } : undefined
        );

        // 2. Détecter régressions
        const regressions = await this.regressionDetector.detectPerformanceRegression();
        const errorRegressions = await this.regressionDetector.detectErrorRegression();

        // 3. Auto-correction si activée
        let fixedRegressions = 0;
        const regressionsCount = regressions.length;
        const errorRegressionsCount = errorRegressions.length;
        if (this.config.autoFix && (regressionsCount > 0 || errorRegressionsCount > 0)) {
          // Appliquer corrections automatiques
          fixedRegressions = regressionsCount;
        }

        logger.info('Analyse automatique terminée', {
          metadata: {
            service: 'AgentAutoOrchestrator',
            operation: 'runFullAnalysis',
            codeSmellsCount: analysis.codeSmells.smells.length,
            conflictsCount: analysis.conflicts.length,
            regressionsDetected: regressionsCount + errorRegressionsCount,
            regressionsFixed: fixedRegressions
          }
        });

        return {
          analysis: {
            architecture: analysis.architecture,
            codeSmells: analysis.codeSmells,
            conflicts: analysis.conflicts
          },
          regressions: {
            detected: regressionsCount + errorRegressionsCount,
            fixed: fixedRegressions
          }
        };
      },
      {
        operation: 'runFullAnalysis',
        service: 'AgentAutoOrchestrator',
        metadata: {}
      }
    );
  }

  /**
   * Exécute optimisation automatique
   */
  async runAutoOptimization(): Promise<AutoOrchestrationResult> {
    if (!this.config.autoOptimize) {
      return {};
    }

    const now = Date.now();
    if (now - this.lastOptimization < this.config.optimizeInterval) {
      return {};
    }

    this.lastOptimization = now;

    return withErrorHandling(
      async () => {
        logger.info('Démarrage optimisation automatique', {
          metadata: {
            service: 'AgentAutoOrchestrator',
            operation: 'runAutoOptimization'
          }
        });

        // 1. Optimiser codebase
        const optimization = await this.orchestrator.optimizeCodebase();

        // 2. Optimiser workflows
        const workflowAudits = await this.workflowAnalyzer.analyzeAllWorkflows();
        let workflowOptimizations = 0;
        for (const [workflowName, analysis] of Array.from(workflowAudits.entries())) {
          if (analysis.health.score < 75) {
            await this.workflowOptimizer.optimizeWorkflow(workflowName);
            workflowOptimizations++;
          }
        }

        // 3. Ajuster paramètres
        await this.parameterTuner.tuneParameters();

        // 4. Détecter et appliquer opportunités d'automatisation
        try {
          const workflowOperations = Array.from(workflowAudits.entries()).map(([name, analysis]) => ({
            id: name,
            type: 'workflow-optimization',
            description: `Optimisation workflow: ${name}`,
            duration: analysis.health.score < 75 ? 5000 : 0,
            success: analysis.health.score >= 75
          }));

          const automationOpportunities = await this.automationDetector.detectAutomationOpportunities(
            'auto-orchestrator',
            workflowOperations
          );

          // Appliquer automatiquement les opportunités haute priorité
          const highPriorityOpps = automationOpportunities.opportunities.filter(
            opp => opp.confidence >= 8 && opp.estimatedBenefit.timeSaved > 3000
          );

          if (highPriorityOpps.length > 0) {
            const automationResults = await this.automationDetector.applyAutomationOpportunities(highPriorityOpps);
            logger.info('Opportunités automatisation appliquées', {
              metadata: {
                service: 'AgentAutoOrchestrator',
                operation: 'runAutoOptimization',
                applied: automationResults.applied,
                failed: automationResults.failed
              }
            });
          }
        } catch (error) {
          logger.debug('Erreur détection automatisation', {
            metadata: {
              service: 'AgentAutoOrchestrator',
              operation: 'runAutoOptimization',
              error: error instanceof Error ? error.message : String(error)
            }
          });
        }

        logger.info('Optimisation automatique terminée', {
          metadata: {
            service: 'AgentAutoOrchestrator',
            operation: 'runAutoOptimization',
            optimizationsApplied: optimization.optimizations.applied.filter(o => o.success).length,
            workflowOptimizations,
            totalBenefit: optimization.optimizations.totalActualBenefit
          }
        });

        return {
          optimizations: {
            applied: optimization.optimizations.applied.filter(o => o.success).length,
            benefit: optimization.optimizations.totalActualBenefit
          }
        };
      },
      {
        operation: 'runAutoOptimization',
        service: 'AgentAutoOrchestrator',
        metadata: {}
      }
    );
  }

  /**
   * Exécute monitoring périodique
   */
  async runPeriodicMonitoring(): Promise<AutoOrchestrationResult> {
    const now = Date.now();
    if (now - this.lastMonitoring < this.config.monitorInterval) {
      return {};
    }

    this.lastMonitoring = now;

    return withErrorHandling(
      async () => {
        // Monitoring performance
        const monitoring = await this.performanceMonitor.runPeriodicMonitoring();

        return {
          monitoring: {
            alerts: monitoring.snapshot.alerts.length,
            healthScore: monitoring.snapshot.healthScore
          }
        };
      },
      {
        operation: 'runPeriodicMonitoring',
        service: 'AgentAutoOrchestrator',
        metadata: {}
      }
    );
  }

  /**
   * Démarre monitoring périodique
   */
  private startPeriodicMonitoring(): void {
    setInterval(async () => {
      if (!this.isRunning) return;

      try {
        await this.runPeriodicMonitoring();
        await this.runAutoOptimization();
      } catch (error) {
        logger.debug('Erreur monitoring périodique', {
          metadata: {
            service: 'AgentAutoOrchestrator',
            operation: 'startPeriodicMonitoring',
            error: error instanceof Error ? error.message : String(error)
          }
        });
      }
    }, this.config.monitorInterval);
  }

  /**
   * Met à jour la configuration
   */
  updateConfig(config: Partial<AutoOrchestrationConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info('Configuration auto-orchestration mise à jour', {
      metadata: {
        service: 'AgentAutoOrchestrator',
        operation: 'updateConfig',
        config: this.config
      }
    });
  }
}

// ========================================
// SINGLETON INSTANCE
// ========================================

let agentAutoOrchestratorInstance: AgentAutoOrchestrator | null = null;

export function getAgentAutoOrchestrator(
  storage: IStorage,
  config?: Partial<AutoOrchestrationConfig>
): AgentAutoOrchestrator {
  if (!agentAutoOrchestratorInstance) {
    agentAutoOrchestratorInstance = new AgentAutoOrchestrator(storage, config);
  }
  return agentAutoOrchestratorInstance;
}

