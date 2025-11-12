import { logger } from '../utils/logger';
import { withErrorHandling } from '../utils/error-handler';
import { getAgentQualityGuardian } from './AgentQualityGuardian';
import { getAgentBusinessAlignmentChecker } from './AgentBusinessAlignmentChecker';
import { getAgentAutoTester } from './AgentAutoTester';
import { getAgentAutoCorrector } from './AgentAutoCorrector';
import { getAgentAutoReviewer } from './AgentAutoReviewer';
import type { IStorage } from '../storage-poc';

// ========================================
// TYPES ET INTERFACES
// ========================================

export interface PreCommitValidation {
  passed: boolean;
  checks: Array<{
    check: string;
    passed: boolean;
    message: string;
    severity: 'blocking' | 'warning';
  }>;
  quality: {
    score: number;
    passed: boolean;
  };
  alignment: {
    score: number;
    passed: boolean;
    gaps: string[];
  };
  tests: {
    passed: boolean;
    coverage: number;
    total: number;
    failed: number;
  };
  corrections: {
    applied: number;
    failed: number;
  };
  canCommit: boolean;
  blockingReasons: string[];
}

// ========================================
// AGENT PRE COMMIT VALIDATOR
// ========================================

/**
 * Service de validation pré-commit automatique
 * Garantit qualité optimale avant tout commit
 * Adapté pour flowdev sans relecture - bloque commit si qualité insuffisante
 */
export class AgentPreCommitValidator {
  private storage: IStorage;
  private qualityGuardian: ReturnType<typeof getAgentQualityGuardian>;
  private alignmentChecker: ReturnType<typeof getAgentBusinessAlignmentChecker>;
  private autoTester: ReturnType<typeof getAgentAutoTester>;
  private autoCorrector: ReturnType<typeof getAgentAutoCorrector>;
  private autoReviewer: ReturnType<typeof getAgentAutoReviewer>;

  // Seuils stricts pour validation
  private readonly MIN_QUALITY_SCORE = 85;
  private readonly MIN_ALIGNMENT_SCORE = 80;
  private readonly MIN_TEST_COVERAGE = 80;
  private readonly BLOCK_ON_CRITICAL_ISSUES = true;

  constructor(storage: IStorage) {
    if (!storage) {
      throw new Error('Storage requis pour AgentPreCommitValidator');
    }
    this.storage = storage;
    this.qualityGuardian = getAgentQualityGuardian(storage);
    this.alignmentChecker = getAgentBusinessAlignmentChecker(storage);
    this.autoTester = getAgentAutoTester(storage);
    this.autoCorrector = getAgentAutoCorrector(storage);
    this.autoReviewer = getAgentAutoReviewer(storage);
  }

  /**
   * Valide avant commit avec auto-correction
   */
  async validatePreCommit(
    files: string[],
    context?: {
      userRequest?: string;
      changeType?: 'add' | 'modify' | 'remove';
      description?: string;
    }
  ): Promise<PreCommitValidation> {
    return withErrorHandling(
      async () => {
        const checks: PreCommitValidation['checks'] = [];
        const blockingReasons: string[] = [];

        // 1. Auto-correction préalable
        let corrections = { applied: 0, failed: 0 };
        try {
          const correctionResult = await this.autoCorrector.autoCorrect(files);
          corrections = {
            applied: correctionResult.applied,
            failed: correctionResult.failed
          };
          checks.push({
            check: 'auto_correction',
            passed: correctionResult.failed === 0,
            message: `Corrections appliquées: ${correctionResult.applied}, échouées: ${correctionResult.failed}`,
            severity: 'warning'
          });
        } catch (error) {
          checks.push({
            check: 'auto_correction',
            passed: false,
            message: `Erreur auto-correction: ${error instanceof Error ? error.message : String(error)}`,
            severity: 'warning'
          });
        }

        // 2. Validation qualité
        let qualityPassed = false;
        let qualityScore = 0;
        try {
          const qualityResult = await this.qualityGuardian.validateQuality(files, {
            changeType: context?.changeType,
            description: context?.description
          });
          qualityPassed = qualityResult.passed;
          qualityScore = qualityResult.overallScore;

          checks.push({
            check: 'quality_validation',
            passed: qualityPassed,
            message: `Score qualité: ${qualityScore}% (minimum: ${this.MIN_QUALITY_SCORE}%)`,
            severity: 'blocking'
          });

          if (!qualityPassed) {
            blockingReasons.push(`Qualité insuffisante: ${qualityScore}% < ${this.MIN_QUALITY_SCORE}%`);
          }
        } catch (error) {
          checks.push({
            check: 'quality_validation',
            passed: false,
            message: `Erreur validation qualité: ${error instanceof Error ? error.message : String(error)}`,
            severity: 'blocking'
          });
          blockingReasons.push('Erreur validation qualité');
        }

        // 3. Vérification alignement business
        let alignmentPassed = true;
        let alignmentScore = 100;
        let alignmentGaps: string[] = [];
        if (context?.userRequest) {
          try {
            const alignmentResult = await this.alignmentChecker.checkAlignment(files, {
              userRequest: context.userRequest
            });
            alignmentPassed = alignmentResult.overallAlignment >= this.MIN_ALIGNMENT_SCORE &&
                              alignmentResult.criticalGaps.length === 0;
            alignmentScore = alignmentResult.overallAlignment;
            alignmentGaps = alignmentResult.criticalGaps;

            checks.push({
              check: 'business_alignment',
              passed: alignmentPassed,
              message: `Alignement: ${alignmentScore}% (minimum: ${this.MIN_ALIGNMENT_SCORE}%)`,
              severity: 'blocking'
            });

            if (!alignmentPassed) {
              blockingReasons.push(`Alignement insuffisant: ${alignmentScore}% < ${this.MIN_ALIGNMENT_SCORE}%`);
              if (alignmentGaps.length > 0) {
                blockingReasons.push(`Gaps critiques: ${alignmentGaps.join(', ')}`);
              }
            }
          } catch (error) {
            checks.push({
              check: 'business_alignment',
              passed: false,
              message: `Erreur vérification alignement: ${error instanceof Error ? error.message : String(error)}`,
              severity: 'warning'
            });
          }
        }

        // 4. Tests automatiques
        let testsPassed = true;
        let testCoverage = 100;
        let testTotal = 0;
        let testFailed = 0;
        try {
          const testResult = await this.autoTester.generateAndRunTests(files, {
            userRequest: context?.userRequest
          });
          testsPassed = testResult.overallPassed;
          testCoverage = testResult.coverage.coverage;
          testTotal = testResult.coverage.total;
          testFailed = testResult.coverage.failed;

          checks.push({
            check: 'tests',
            passed: testsPassed && testCoverage >= this.MIN_TEST_COVERAGE,
            message: `Tests: ${testResult.coverage.passed}/${testTotal} passés, couverture: ${testCoverage}%`,
            severity: 'blocking'
          });

          if (!testsPassed) {
            blockingReasons.push(`${testFailed} test(s) échoué(s)`);
          }
          if (testCoverage < this.MIN_TEST_COVERAGE) {
            blockingReasons.push(`Couverture insuffisante: ${testCoverage}% < ${this.MIN_TEST_COVERAGE}%`);
          }
        } catch (error) {
          checks.push({
            check: 'tests',
            passed: false,
            message: `Erreur exécution tests: ${error instanceof Error ? error.message : String(error)}`,
            severity: 'warning'
          });
        }

        // 5. Review final
        let reviewPassed = true;
        try {
          const review = await this.autoReviewer.reviewCode(files);
          reviewPassed = review.passed;

          if (this.BLOCK_ON_CRITICAL_ISSUES && review.summary.critical > 0) {
            reviewPassed = false;
            blockingReasons.push(`${review.summary.critical} issue(s) critique(s) détectée(s)`);
          }

          checks.push({
            check: 'code_review',
            passed: reviewPassed,
            message: `Review: score ${review.score}%, ${review.summary.critical} critique(s), ${review.summary.high} haute(s)`,
            severity: 'blocking'
          });
        } catch (error) {
          checks.push({
            check: 'code_review',
            passed: false,
            message: `Erreur review: ${error instanceof Error ? error.message : String(error)}`,
            severity: 'blocking'
          });
          blockingReasons.push('Erreur review automatique');
        }

        // 6. Décision finale
        const canCommit = qualityPassed &&
                         alignmentPassed &&
                         testsPassed &&
                         testCoverage >= this.MIN_TEST_COVERAGE &&
                         reviewPassed &&
                         blockingReasons.length === 0;

        logger.info('Validation pré-commit terminée', {
          metadata: {
            service: 'AgentPreCommitValidator',
            operation: 'validatePreCommit',
            filesCount: files.length,
            canCommit,
            blockingReasonsCount: blockingReasons.length,
            qualityScore,
            alignmentScore,
            testCoverage
          }
        });

        return {
          passed: canCommit,
          checks,
          quality: {
            score: qualityScore,
            passed: qualityPassed
          },
          alignment: {
            score: alignmentScore,
            passed: alignmentPassed,
            gaps: alignmentGaps
          },
          tests: {
            passed: testsPassed,
            coverage: testCoverage,
            total: testTotal,
            failed: testFailed
          },
          corrections,
          canCommit,
          blockingReasons
        };
      },
      {
        operation: 'validatePreCommit',
        service: 'AgentPreCommitValidator',
        metadata: {}
      }
    );
  }

  /**
   * Valide avec auto-correction itérative jusqu'à passage
   */
  async validateAndFixUntilPass(
    files: string[],
    context?: {
      userRequest?: string;
      changeType?: 'add' | 'modify' | 'remove';
      description?: string;
    },
    maxIterations: number = 3
  ): Promise<{
    validation: PreCommitValidation;
    iterations: number;
    finalStatus: 'passed' | 'failed' | 'max_iterations';
  }> {
    return withErrorHandling(
      async () => {
        let iteration = 0;
        let validation: PreCommitValidation;

        do {
          iteration++;
          validation = await this.validatePreCommit(files, context);

          if (validation.canCommit) {
            return {
              validation,
              iterations: iteration,
              finalStatus: 'passed'
            };
          }

          // Auto-corriger si possible
          if (iteration < maxIterations) {
            await this.autoCorrector.autoCorrect(files);
          }
        } while (iteration < maxIterations && !validation.canCommit);

        return {
          validation,
          iterations: iteration,
          finalStatus: validation.canCommit ? 'passed' : 'max_iterations'
        };
      },
      {
        operation: 'validateAndFixUntilPass',
        service: 'AgentPreCommitValidator',
        metadata: {}
      }
    );
  }
}

// ========================================
// SINGLETON INSTANCE
// ========================================

let agentPreCommitValidatorInstance: AgentPreCommitValidator | null = null;

export function getAgentPreCommitValidator(storage: IStorage): AgentPreCommitValidator {
  if (!agentPreCommitValidatorInstance) {
    agentPreCommitValidatorInstance = new AgentPreCommitValidator(storage);
  }
  return agentPreCommitValidatorInstance;
}

