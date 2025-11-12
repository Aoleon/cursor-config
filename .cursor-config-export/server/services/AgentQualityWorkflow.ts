import crypto from 'crypto';
import { logger } from '../utils/logger';
import { withErrorHandling } from '../utils/error-handler';
import { getAgentCodeQualityPredictor } from './AgentCodeQualityPredictor';
import { getAgentProactiveQualityChecker } from './AgentProactiveQualityChecker';
import { getAgentQualityAnalyzerEnhanced } from './AgentQualityAnalyzerEnhanced';
import { getAgentFastAutoCorrector } from './AgentFastAutoCorrector';
import { getAgentPreCommitValidator } from './AgentPreCommitValidator';
import { getAgentPerformanceOptimizer } from './AgentPerformanceOptimizer';
import { getAgentQualityLearning } from './AgentQualityLearning';
import { getAgentIntelligentSuggester } from './AgentIntelligentSuggester';
import { getAgentQualityFeedbackLoop } from './AgentQualityFeedbackLoop';
import { getAgentBatchQualityProcessor } from './AgentBatchQualityProcessor';
import { getAgentWorkflowAuditor } from './AgentWorkflowAuditor';
import { getAgentWorkflowExecutor } from './AgentWorkflowExecutor';
import type { IStorage } from '../storage-poc';

// ========================================
// TYPES ET INTERFACES
// ========================================

export interface QualityWorkflowResult {
  phase: 'prediction' | 'proactive' | 'analysis' | 'correction' | 'validation';
  status: 'completed' | 'failed' | 'skipped';
  qualityScore: number;
  passed: boolean;
  issues: number;
  corrections: number;
  duration: number; // ms
}

export interface CompleteQualityWorkflow {
  task: string;
  files: string[];
  results: QualityWorkflowResult[];
  finalQuality: number;
  finalPassed: boolean;
  totalDuration: number; // ms
  summary: {
    predictionScore: number;
    proactiveChecks: number;
    analysisScore: number;
    correctionsApplied: number;
    validationPassed: boolean;
  };
}

// ========================================
// AGENT QUALITY WORKFLOW
// ========================================

/**
 * Service de workflow qualité complet
 * Orchestre prédiction, vérification proactive, analyse, correction et validation
 * Garantit qualité optimale dès première écriture et correction rapide
 */
export class AgentQualityWorkflow {
  private storage: IStorage;
  private qualityPredictor: ReturnType<typeof getAgentCodeQualityPredictor>;
  private proactiveChecker: ReturnType<typeof getAgentProactiveQualityChecker>;
  private qualityAnalyzer: ReturnType<typeof getAgentQualityAnalyzerEnhanced>;
  private fastCorrector: ReturnType<typeof getAgentFastAutoCorrector>;
  private preCommitValidator: ReturnType<typeof getAgentPreCommitValidator>;
  private performanceOptimizer: ReturnType<typeof getAgentPerformanceOptimizer>;
  private qualityLearning: ReturnType<typeof getAgentQualityLearning>;
  private intelligentSuggester: ReturnType<typeof getAgentIntelligentSuggester>;
  private feedbackLoop: ReturnType<typeof getAgentQualityFeedbackLoop>;
  private batchProcessor: ReturnType<typeof getAgentBatchQualityProcessor>;
  private workflowAuditor: ReturnType<typeof getAgentWorkflowAuditor>;
  private workflowExecutor: ReturnType<typeof getAgentWorkflowExecutor>;

  constructor(storage: IStorage) {
    if (!storage) {
      throw new Error('Storage requis pour AgentQualityWorkflow');
    }
    this.storage = storage;
    this.qualityPredictor = getAgentCodeQualityPredictor(storage);
    this.proactiveChecker = getAgentProactiveQualityChecker(storage);
    this.qualityAnalyzer = getAgentQualityAnalyzerEnhanced(storage);
    this.fastCorrector = getAgentFastAutoCorrector(storage);
    this.preCommitValidator = getAgentPreCommitValidator(storage);
    this.performanceOptimizer = getAgentPerformanceOptimizer(storage);
    this.qualityLearning = getAgentQualityLearning(storage);
    this.intelligentSuggester = getAgentIntelligentSuggester(storage);
    this.feedbackLoop = getAgentQualityFeedbackLoop(storage);
    this.batchProcessor = getAgentBatchQualityProcessor(storage);
    this.workflowAuditor = getAgentWorkflowAuditor(storage);
    this.workflowExecutor = getAgentWorkflowExecutor(storage);
  }

  /**
   * Exécute workflow qualité complet
   */
  async executeQualityWorkflow(
    task: string,
    files: string[],
    context?: {
      type?: 'feature' | 'fix' | 'refactor' | 'ui' | 'architecture';
      userRequest?: string;
    }
  ): Promise<CompleteQualityWorkflow> {
    return withErrorHandling(
      async () => {
        const startTime = Date.now();
        const results: QualityWorkflowResult[] = [];

        // PHASE 1: Prédiction qualité avant écriture
        let predictionScore = 0;
        try {
          const predictionStart = Date.now();
          const prediction = await this.qualityPredictor.predictQuality({
            task,
            type: context?.type || 'feature',
            targetFile: files[0],
            requirements: context?.userRequest ? [context.userRequest] : []
          });
          predictionScore = prediction.predictedScore;

          results.push({
            phase: 'prediction',
            status: 'completed',
            qualityScore: predictionScore,
            passed: predictionScore >= 85,
            issues: prediction.risks.length,
            corrections: 0,
            duration: Date.now() - predictionStart
          });
        } catch (error) {
          results.push({
            phase: 'prediction',
            status: 'failed',
            qualityScore: 0,
            passed: false,
            issues: 0,
            corrections: 0,
            duration: 0
          });
          logger.debug('Erreur phase prédiction', {
            metadata: {
              service: 'AgentQualityWorkflow',
              operation: 'executeQualityWorkflow',
              error: error instanceof Error ? error.message : String(error)
            }
          });
        }

        // PHASE 2: Vérification proactive pendant écriture
        let proactiveChecks = 0;
        try {
          const proactiveStart = Date.now();
          const proactiveResults = await this.proactiveChecker.checkContinuous(files);
          proactiveChecks = Array.from(proactiveResults.values()).reduce(
            (sum, r) => sum + r.checks.length,
            0
          );

          const proactiveScore = Array.from(proactiveResults.values()).reduce(
            (sum, r) => sum + r.score,
            0
          ) / proactiveResults.size;

          results.push({
            phase: 'proactive',
            status: 'completed',
            qualityScore: proactiveScore,
            passed: Array.from(proactiveResults.values()).every(r => r.passed),
            issues: proactiveChecks,
            corrections: 0,
            duration: Date.now() - proactiveStart
          });
        } catch (error) {
          results.push({
            phase: 'proactive',
            status: 'failed',
            qualityScore: 0,
            passed: false,
            issues: 0,
            corrections: 0,
            duration: 0
          });
        }

        // PHASE 3: Analyse qualité approfondie (optimisée)
        let analysisScore = 0;
        try {
          const analysisStart = Date.now();
          const optimized = await this.performanceOptimizer.optimizeOperation(
            'quality-analysis',
            () => this.qualityAnalyzer.analyzeEnhanced(files, {
              includeTrends: false,
              includeRecommendations: true,
              fastMode: false
            }),
            {
              useCache: true,
              parallelize: true,
              cacheKey: `analysis-${files.join(',')}`
            }
          );
          const analysis = optimized.result;
          analysisScore = analysis.overallScore;

          results.push({
            phase: 'analysis',
            status: 'completed',
            qualityScore: analysisScore,
            passed: analysis.passed,
            issues: analysis.issues.length,
            corrections: 0,
            duration: Date.now() - analysisStart
          });
        } catch (error) {
          results.push({
            phase: 'analysis',
            status: 'failed',
            qualityScore: 0,
            passed: false,
            issues: 0,
            corrections: 0,
            duration: 0
          });
        }

        // PHASE 4: Correction rapide automatique (optimisée)
        let correctionsApplied = 0;
        try {
          const correctionStart = Date.now();
          const optimized = await this.performanceOptimizer.optimizeOperation(
            'quality-correction',
            () => this.fastCorrector.correctFast(files),
            {
              useCache: false,
              parallelize: false
            }
          );
          const correction = optimized.result;
          correctionsApplied = correction.applied;

          // Apprendre de la correction
          if (correction.improvement > 0) {
            await this.qualityLearning.learnFromResult(
              task,
              'quality_improvement',
              'auto_correction',
              correction.qualityBefore,
              correction.qualityAfter
            );
          }

          results.push({
            phase: 'correction',
            status: 'completed',
            qualityScore: correction.qualityAfter,
            passed: correction.improvement > 0,
            issues: correction.failed,
            corrections: correctionsApplied,
            duration: Date.now() - correctionStart
          });
        } catch (error) {
          results.push({
            phase: 'correction',
            status: 'failed',
            qualityScore: 0,
            passed: false,
            issues: 0,
            corrections: 0,
            duration: 0
          });
        }

        // PHASE 5: Validation pré-commit
        let validationPassed = false;
        try {
          const validationStart = Date.now();
          const validation = await this.preCommitValidator.validatePreCommit(files, {
            userRequest: context?.userRequest || task,
            changeType: 'modify',
            description: task
          });
          validationPassed = validation.canCommit;

          results.push({
            phase: 'validation',
            status: validationPassed ? 'completed' : 'failed',
            qualityScore: validation.quality.score,
            passed: validationPassed,
            issues: validation.blockingReasons.length,
            corrections: validation.corrections.applied,
            duration: Date.now() - validationStart
          });
        } catch (error) {
          results.push({
            phase: 'validation',
            status: 'failed',
            qualityScore: 0,
            passed: false,
            issues: 0,
            corrections: 0,
            duration: 0
          });
        }

        // Calculer qualité finale
        const finalQuality = validationPassed
          ? results.find(r => r.phase === 'validation')?.qualityScore || 0
          : analysisScore;

        const finalPassed = validationPassed && finalQuality >= 85;

        // Enregistrer exécution complète pour audit
        const executionId = crypto.randomUUID();
        this.workflowAuditor.recordExecution({
          id: executionId,
          workflowName: 'quality-workflow',
          startTime,
          endTime: Date.now(),
          duration: Date.now() - startTime,
          steps: results.map(r => ({
            id: `step-${r.phase}`,
            name: r.phase,
            type: r.phase as 'prediction' | 'analysis' | 'correction' | 'validation',
            duration: r.duration,
            success: r.status === 'completed'
          })),
          success: finalPassed,
          qualityScore: finalQuality,
          performanceScore: 100 - ((Date.now() - startTime) / 1000), // Score basé sur durée
          bottlenecks: []
        });

        // Enregistrer feedback pour amélioration continue
        try {
          await this.feedbackLoop.processFeedback({
            context: task,
            issue: 'quality_workflow',
            solution: 'workflow_completed',
            qualityBefore: predictionScore,
            qualityAfter: finalQuality,
            duration: Date.now() - startTime,
            success: finalPassed
          });
        } catch (error) {
          logger.debug('Erreur enregistrement feedback', {
            metadata: {
              service: 'AgentQualityWorkflow',
              operation: 'executeQualityWorkflow',
              error: error instanceof Error ? error.message : String(error)
            }
          });
        }

        logger.info('Workflow qualité complet terminé', {
          metadata: {
            service: 'AgentQualityWorkflow',
            operation: 'executeQualityWorkflow',
            task,
            filesCount: files.length,
            finalQuality,
            finalPassed,
            totalDuration: Date.now() - startTime
          }
        });

        return {
          task,
          files,
          results,
          finalQuality,
          finalPassed,
          totalDuration: Date.now() - startTime,
          summary: {
            predictionScore,
            proactiveChecks,
            analysisScore,
            correctionsApplied,
            validationPassed
          }
        };
      },
      {
        operation: 'executeQualityWorkflow',
        service: 'AgentQualityWorkflow',
        metadata: {}
      }
    );
  }

  /**
   * Exécute workflow optimisé (mode rapide)
   */
  async executeFastWorkflow(
    task: string,
    files: string[]
  ): Promise<{
    qualityScore: number;
    passed: boolean;
    corrections: number;
    duration: number;
  }> {
    return withErrorHandling(
      async () => {
        const startTime = Date.now();

        // 1. Analyse rapide
        const fastAnalysis = await this.qualityAnalyzer.analyzeFast(files);

        // 2. Correction rapide si nécessaire
        let corrections = 0;
        if (!fastAnalysis.passed || fastAnalysis.score < 85) {
          const correction = await this.fastCorrector.correctFast(files);
          corrections = correction.applied;
        }

        // 3. Re-analyse rapide
        const finalAnalysis = await this.qualityAnalyzer.analyzeFast(files);

        return {
          qualityScore: finalAnalysis.score,
          passed: finalAnalysis.passed,
          corrections,
          duration: Date.now() - startTime
        };
      },
      {
        operation: 'executeFastWorkflow',
        service: 'AgentQualityWorkflow',
        metadata: {}
      }
    );
  }
}

// ========================================
// SINGLETON INSTANCE
// ========================================

let agentQualityWorkflowInstance: AgentQualityWorkflow | null = null;

export function getAgentQualityWorkflow(storage: IStorage): AgentQualityWorkflow {
  if (!agentQualityWorkflowInstance) {
    agentQualityWorkflowInstance = new AgentQualityWorkflow(storage);
  }
  return agentQualityWorkflowInstance;
}

