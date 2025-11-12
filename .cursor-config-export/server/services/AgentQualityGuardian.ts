import { logger } from '../utils/logger';
import { withErrorHandling } from '../utils/error-handler';
import { getAgentAutoReviewer } from './AgentAutoReviewer';
import { getAgentRiskAnalyzer } from './AgentRiskAnalyzer';
import { getAgentArchitectureAnalyzer } from './AgentArchitectureAnalyzer';
import type { IStorage } from '../storage-poc';

// ========================================
// TYPES ET INTERFACES
// ========================================

export interface QualityGate {
  name: string;
  description: string;
  check: () => Promise<boolean>;
  severity: 'blocking' | 'warning';
  autoFixable: boolean;
}

export interface QualityCheckResult {
  passed: boolean;
  gates: Array<{
    gate: string;
    passed: boolean;
    message: string;
    severity: 'blocking' | 'warning';
  }>;
  overallScore: number; // 0-100
  blockingIssues: number;
  warnings: number;
}

// ========================================
// AGENT QUALITY GUARDIAN
// ========================================

/**
 * Service gardien de qualité automatique
 * Garantit qualité optimale avant validation de toute modification
 * Adapté pour flowdev sans relecture
 */
export class AgentQualityGuardian {
  private storage: IStorage;
  private autoReviewer: ReturnType<typeof getAgentAutoReviewer>;
  private riskAnalyzer: ReturnType<typeof getAgentRiskAnalyzer>;
  private architectureAnalyzer: ReturnType<typeof getAgentArchitectureAnalyzer>;

  // Seuils de qualité stricts
  private readonly MIN_QUALITY_SCORE = 85;
  private readonly BLOCKING_ISSUES_TOLERANCE = 0;

  constructor(storage: IStorage) {
    if (!storage) {
      throw new Error('Storage requis pour AgentQualityGuardian');
    }
    this.storage = storage;
    this.autoReviewer = getAgentAutoReviewer(storage);
    this.riskAnalyzer = getAgentRiskAnalyzer(storage);
    this.architectureAnalyzer = getAgentArchitectureAnalyzer(storage);
  }

  /**
   * Valide qualité du code avant validation
   */
  async validateQuality(
    files: string[],
    context?: {
      changeType?: 'add' | 'modify' | 'remove';
      description?: string;
    }
  ): Promise<QualityCheckResult> {
    return withErrorHandling(
      async () => {
        const gates: QualityGate[] = [
          {
            name: 'code_review',
            description: 'Review automatique du code',
            check: async () => {
              const review = await this.autoReviewer.reviewCode(files);
              return review.passed && review.score >= this.MIN_QUALITY_SCORE;
            },
            severity: 'blocking',
            autoFixable: true
          },
          {
            name: 'no_critical_issues',
            description: 'Aucune issue critique',
            check: async () => {
              const review = await this.autoReviewer.reviewCode(files);
              return review.summary.critical === 0;
            },
            severity: 'blocking',
            autoFixable: false
          },
          {
            name: 'architecture_compliance',
            description: 'Conformité architecturale',
            check: async () => {
              const analysis = await this.architectureAnalyzer.analyzeArchitecture({ files });
              return analysis.healthScore >= 70;
            },
            severity: 'blocking',
            autoFixable: false
          },
          {
            name: 'risk_assessment',
            description: 'Évaluation risques acceptable',
            check: async () => {
              if (!context?.changeType || !context?.description) return true;
              const riskAnalysis = await this.riskAnalyzer.analyzeChangeRisks({
                type: context.changeType,
                target: files[0] || 'unknown',
                description: context.description || ''
              });
              return riskAnalysis.overallRisk !== 'critical';
            },
            severity: 'blocking',
            autoFixable: false
          },
          {
            name: 'code_standards',
            description: 'Conformité standards du projet',
            check: async () => {
              const review = await this.autoReviewer.reviewCode(files, {
                checkStandards: true,
                checkErrors: true,
                checkCodeSmells: false,
                checkArchitecture: false,
                checkSecurity: false,
                checkPerformance: false,
                checkTests: false,
                checkDocumentation: false
              });
              return review.passed;
            },
            severity: 'blocking',
            autoFixable: true
          }
        ];

        const gateResults: QualityCheckResult['gates'] = [];
        let passedCount = 0;
        let blockingFailed = 0;
        let warnings = 0;

        for (const gate of gates) {
          try {
            const passed = await gate.check();
            gateResults.push({
              gate: gate.name,
              passed,
              message: passed ? 'Passé' : gate.description,
              severity: gate.severity
            });

            if (passed) {
              passedCount++;
            } else {
              if (gate.severity === 'blocking') {
                blockingFailed++;
              } else {
                warnings++;
              }
            }
          } catch (error) {
            gateResults.push({
              gate: gate.name,
              passed: false,
              message: `Erreur: ${error instanceof Error ? error.message : String(error)}`,
              severity: gate.severity
            });
            if (gate.severity === 'blocking') {
              blockingFailed++;
            }
          }
        }

        const overallScore = (passedCount / gates.length) * 100;
        const passed = blockingFailed === 0 && overallScore >= this.MIN_QUALITY_SCORE;

        logger.info('Validation qualité terminée', {
          metadata: {
            service: 'AgentQualityGuardian',
            operation: 'validateQuality',
            filesCount: files.length,
            gatesPassed: passedCount,
            gatesTotal: gates.length,
            blockingFailed,
            overallScore,
            passed
          }
        });

        return {
          passed,
          gates: gateResults,
          overallScore,
          blockingIssues: blockingFailed,
          warnings
        };
      },
      {
        operation: 'validateQuality',
        service: 'AgentQualityGuardian',
        metadata: {}
      }
    );
  }

  /**
   * Valide et corrige automatiquement si possible
   */
  async validateAndFix(
    files: string[],
    context?: {
      changeType?: 'add' | 'modify' | 'remove';
      description?: string;
    }
  ): Promise<{
    validation: QualityCheckResult;
    fixes: Array<{
      gate: string;
      fixed: boolean;
      method: string;
    }>;
    finalValidation: QualityCheckResult;
  }> {
    return withErrorHandling(
      async () => {
        // 1. Validation initiale
        const validation = await this.validateQuality(files, context);

        // 2. Auto-corriger gates auto-fixables
        const fixes: Array<{
          gate: string;
          fixed: boolean;
          method: string;
        }> = [];

        const failedGates = validation.gates.filter(g => !g.passed);
        for (const gateResult of failedGates) {
          // Vérifier si gate est auto-fixable et corriger
          // Logique d'auto-correction serait implémentée ici
          fixes.push({
            gate: gateResult.gate,
            fixed: false, // À implémenter avec logique réelle
            method: 'auto-fix'
          });
        }

        // 3. Re-validation après corrections
        const finalValidation = await this.validateQuality(files, context);

        return {
          validation,
          fixes,
          finalValidation
        };
      },
      {
        operation: 'validateAndFix',
        service: 'AgentQualityGuardian',
        metadata: {}
      }
    );
  }

  /**
   * Vérifie qualité continue (à appeler périodiquement)
   */
  async continuousQualityCheck(): Promise<QualityCheckResult> {
    return withErrorHandling(
      async () => {
        // Analyser tous les fichiers modifiés récemment
        // Cette méthode serait enrichie avec détection fichiers modifiés
        const files: string[] = [];

        return this.validateQuality(files);
      },
      {
        operation: 'continuousQualityCheck',
        service: 'AgentQualityGuardian',
        metadata: {}
      }
    );
  }
}

// ========================================
// SINGLETON INSTANCE
// ========================================

let agentQualityGuardianInstance: AgentQualityGuardian | null = null;

export function getAgentQualityGuardian(storage: IStorage): AgentQualityGuardian {
  if (!agentQualityGuardianInstance) {
    agentQualityGuardianInstance = new AgentQualityGuardian(storage);
  }
  return agentQualityGuardianInstance;
}

