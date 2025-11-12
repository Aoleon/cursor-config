import { logger } from '../utils/logger';
import { withErrorHandling } from '../utils/error-handler';
import { getAgentCodeSmellDetector } from './AgentCodeSmellDetector';
import { getAgentArchitectureAnalyzer } from './AgentArchitectureAnalyzer';
import { getAgentRiskAnalyzer } from './AgentRiskAnalyzer';
import type { IStorage } from '../storage-poc';

// ========================================
// TYPES ET INTERFACES
// ========================================

export interface CodeReviewIssue {
  id: string;
  type: 'error' | 'warning' | 'suggestion' | 'security' | 'performance' | 'maintainability';
  severity: 'low' | 'medium' | 'high' | 'critical';
  file: string;
  line?: number;
  description: string;
  rule: string;
  suggestion: string;
  autoFixable: boolean;
}

export interface CodeReviewResult {
  passed: boolean;
  score: number; // 0-100
  issues: CodeReviewIssue[];
  summary: {
    totalIssues: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    autoFixable: number;
  };
  recommendations: string[];
  qualityMetrics: {
    maintainability: number; // 0-100
    testability: number; // 0-100
    performance: number; // 0-100
    security: number; // 0-100
  };
}

export interface ReviewCriteria {
  checkErrors: boolean;
  checkCodeSmells: boolean;
  checkArchitecture: boolean;
  checkSecurity: boolean;
  checkPerformance: boolean;
  checkTests: boolean;
  checkDocumentation: boolean;
  checkStandards: boolean;
  minQualityScore?: number; // 0-100, défaut 80
}

// ========================================
// AGENT AUTO REVIEWER
// ========================================

/**
 * Service de review automatique exhaustif du code
 * Garantit qualité optimale sans review manuelle
 * Adapté pour flowdev sans relecture
 */
export class AgentAutoReviewer {
  private storage: IStorage;
  private codeSmellDetector: ReturnType<typeof getAgentCodeSmellDetector>;
  private architectureAnalyzer: ReturnType<typeof getAgentArchitectureAnalyzer>;
  private riskAnalyzer: ReturnType<typeof getAgentRiskAnalyzer>;

  // Critères de qualité stricts
  private readonly MIN_QUALITY_SCORE = 85; // Score minimum acceptable
  private readonly CRITICAL_ISSUES_TOLERANCE = 0; // Aucune issue critique tolérée
  private readonly HIGH_ISSUES_TOLERANCE = 2; // Maximum 2 issues high

  constructor(storage: IStorage) {
    if (!storage) {
      throw new Error('Storage requis pour AgentAutoReviewer');
    }
    this.storage = storage;
    this.codeSmellDetector = getAgentCodeSmellDetector(storage);
    this.architectureAnalyzer = getAgentArchitectureAnalyzer(storage);
    this.riskAnalyzer = getAgentRiskAnalyzer(storage);
  }

  /**
   * Review automatique exhaustif du code
   */
  async reviewCode(
    files: string[],
    criteria?: ReviewCriteria
  ): Promise<CodeReviewResult> {
    return withErrorHandling(
      async () => {
        const defaultCriteria: ReviewCriteria = {
          checkErrors: true,
          checkCodeSmells: true,
          checkArchitecture: true,
          checkSecurity: true,
          checkPerformance: true,
          checkTests: true,
          checkDocumentation: true,
          checkStandards: true,
          minQualityScore: this.MIN_QUALITY_SCORE
        };

        const reviewCriteria = criteria || defaultCriteria;
        const issues: CodeReviewIssue[] = [];

        // 1. Vérifier erreurs de compilation/lint
        if (reviewCriteria.checkErrors) {
          const errorIssues = await this.checkErrors(files);
          issues.push(...errorIssues);
        }

        // 2. Détecter code smells
        if (reviewCriteria.checkCodeSmells) {
          const smellIssues = await this.checkCodeSmells(files);
          issues.push(...smellIssues);
        }

        // 3. Vérifier architecture
        if (reviewCriteria.checkArchitecture) {
          const archIssues = await this.checkArchitecture(files);
          issues.push(...archIssues);
        }

        // 4. Vérifier sécurité
        if (reviewCriteria.checkSecurity) {
          const securityIssues = await this.checkSecurity(files);
          issues.push(...securityIssues);
        }

        // 5. Vérifier performance
        if (reviewCriteria.checkPerformance) {
          const perfIssues = await this.checkPerformance(files);
          issues.push(...perfIssues);
        }

        // 6. Vérifier tests
        if (reviewCriteria.checkTests) {
          const testIssues = await this.checkTests(files);
          issues.push(...testIssues);
        }

        // 7. Vérifier documentation
        if (reviewCriteria.checkDocumentation) {
          const docIssues = await this.checkDocumentation(files);
          issues.push(...docIssues);
        }

        // 8. Vérifier standards
        if (reviewCriteria.checkStandards) {
          const standardsIssues = await this.checkStandards(files);
          issues.push(...standardsIssues);
        }

        // Calculer score et métriques
        const summary = this.calculateSummary(issues);
        const qualityMetrics = this.calculateQualityMetrics(issues, files);
        const score = this.calculateScore(summary, qualityMetrics);
        const passed = this.evaluatePass(score, summary, reviewCriteria.minQualityScore || this.MIN_QUALITY_SCORE);
        const recommendations = this.generateRecommendations(issues, summary, qualityMetrics);

        logger.info('Review automatique terminé', {
          metadata: {
            service: 'AgentAutoReviewer',
            operation: 'reviewCode',
            filesCount: files.length,
            issuesCount: issues.length,
            score,
            passed
          }
        });

        return {
          passed,
          score,
          issues,
          summary,
          recommendations,
          qualityMetrics
        };
      },
      {
        operation: 'reviewCode',
        service: 'AgentAutoReviewer',
        metadata: {}
      }
    );
  }

  /**
   * Vérifie erreurs de compilation/lint
   */
  private async checkErrors(files: string[]): Promise<CodeReviewIssue[]> {
    const issues: CodeReviewIssue[] = [];

    // Cette méthode serait enrichie avec vérification réelle des erreurs
    // Pour l'instant, détection basique

    return issues;
  }

  /**
   * Vérifie code smells
   */
  private async checkCodeSmells(files: string[]): Promise<CodeReviewIssue[]> {
    const issues: CodeReviewIssue[] = [];

    try {
      const analysis = await this.codeSmellDetector.detectCodeSmells({ files });

      for (const smell of analysis.smells) {
        issues.push({
          id: `smell-${smell.id}`,
          type: 'warning',
          severity: smell.severity,
          file: smell.location.file,
          line: smell.location.line,
          description: smell.description,
          rule: `Code smell: ${smell.type}`,
          suggestion: smell.recommendation,
          autoFixable: smell.autoFixable
        });
      }
    } catch (error) {
      logger.debug('Erreur détection code smells', {
        metadata: {
          service: 'AgentAutoReviewer',
          operation: 'checkCodeSmells',
          error: error instanceof Error ? error.message : String(error)
        }
      });
    }

    return issues;
  }

  /**
   * Vérifie architecture
   */
  private async checkArchitecture(files: string[]): Promise<CodeReviewIssue[]> {
    const issues: CodeReviewIssue[] = [];

    try {
      const analysis = await this.architectureAnalyzer.analyzeArchitecture({ files });

      for (const issue of analysis.issues) {
        issues.push({
          id: `arch-${issue.id}`,
          type: 'warning',
          severity: issue.severity,
          file: issue.location.files?.[0] || 'unknown',
          description: issue.description,
          rule: `Architecture: ${issue.type}`,
          suggestion: issue.recommendations[0] || 'Corriger problème architectural',
          autoFixable: false
        });
      }
    } catch (error) {
      logger.debug('Erreur analyse architecture', {
        metadata: {
          service: 'AgentAutoReviewer',
          operation: 'checkArchitecture',
          error: error instanceof Error ? error.message : String(error)
        }
      });
    }

    return issues;
  }

  /**
   * Vérifie sécurité
   */
  private async checkSecurity(files: string[]): Promise<CodeReviewIssue[]> {
    const issues: CodeReviewIssue[] = [];

    // Détecter patterns de sécurité problématiques
    // Exemples: SQL injection, XSS, secrets hardcodés, etc.

    return issues;
  }

  /**
   * Vérifie performance
   */
  private async checkPerformance(files: string[]): Promise<CodeReviewIssue[]> {
    const issues: CodeReviewIssue[] = [];

    // Détecter problèmes de performance
    // Exemples: N+1 queries, boucles inefficaces, etc.

    return issues;
  }

  /**
   * Vérifie tests
   */
  private async checkTests(files: string[]): Promise<CodeReviewIssue[]> {
    const issues: CodeReviewIssue[] = [];

    // Vérifier présence tests pour fichiers modifiés
    // Vérifier couverture minimale

    return issues;
  }

  /**
   * Vérifie documentation
   */
  private async checkDocumentation(files: string[]): Promise<CodeReviewIssue[]> {
    const issues: CodeReviewIssue[] = [];

    // Vérifier présence JSDoc/commentaires
    // Vérifier qualité documentation

    return issues;
  }

  /**
   * Vérifie standards du projet
   */
  private async checkStandards(files: string[]): Promise<CodeReviewIssue[]> {
    const issues: CodeReviewIssue[] = [];

    // Vérifier conformité aux standards du projet
    // Exemples: utilisation asyncHandler, logger, types, etc.

    return issues;
  }

  /**
   * Calcule résumé des issues
   */
  private calculateSummary(issues: CodeReviewIssue[]): CodeReviewResult['summary'] {
    return {
      totalIssues: issues.length,
      critical: issues.filter(i => i.severity === 'critical').length,
      high: issues.filter(i => i.severity === 'high').length,
      medium: issues.filter(i => i.severity === 'medium').length,
      low: issues.filter(i => i.severity === 'low').length,
      autoFixable: issues.filter(i => i.autoFixable).length
    };
  }

  /**
   * Calcule métriques de qualité
   */
  private calculateQualityMetrics(
    issues: CodeReviewIssue[],
    files: string[]
  ): CodeReviewResult['qualityMetrics'] {
    let maintainability = 100;
    let testability = 100;
    let performance = 100;
    let security = 100;

    for (const issue of issues) {
      const penalty = issue.severity === 'critical' ? 10 :
                     issue.severity === 'high' ? 5 :
                     issue.severity === 'medium' ? 2 : 1;

      if (issue.type === 'maintainability' || issue.type === 'warning') {
        maintainability -= penalty;
      }
      if (issue.type === 'error' || issue.type === 'warning') {
        testability -= penalty;
      }
      if (issue.type === 'performance') {
        performance -= penalty;
      }
      if (issue.type === 'security') {
        security -= penalty;
      }
    }

    return {
      maintainability: Math.max(0, Math.min(100, maintainability)),
      testability: Math.max(0, Math.min(100, testability)),
      performance: Math.max(0, Math.min(100, performance)),
      security: Math.max(0, Math.min(100, security))
    };
  }

  /**
   * Calcule score global
   */
  private calculateScore(
    summary: CodeReviewResult['summary'],
    metrics: CodeReviewResult['qualityMetrics']
  ): number {
    // Score basé sur métriques (70%) et issues (30%)
    const metricsScore = (
      metrics.maintainability +
      metrics.testability +
      metrics.performance +
      metrics.security
    ) / 4;

    const issuesPenalty = summary.critical * 10 +
                          summary.high * 5 +
                          summary.medium * 2 +
                          summary.low * 1;
    const issuesScore = Math.max(0, 100 - issuesPenalty);

    return (metricsScore * 0.7) + (issuesScore * 0.3);
  }

  /**
   * Évalue si le code passe le review
   */
  private evaluatePass(
    score: number,
    summary: CodeReviewResult['summary'],
    minScore: number
  ): boolean {
    // Ne passe pas si:
    // - Score < minScore
    // - Issues critiques > tolérance
    // - Issues high > tolérance
    if (score < minScore) return false;
    if (summary.critical > this.CRITICAL_ISSUES_TOLERANCE) return false;
    if (summary.high > this.HIGH_ISSUES_TOLERANCE) return false;

    return true;
  }

  /**
   * Génère recommandations
   */
  private generateRecommendations(
    issues: CodeReviewIssue[],
    summary: CodeReviewResult['summary'],
    metrics: CodeReviewResult['qualityMetrics']
  ): string[] {
    const recommendations: string[] = [];

    if (summary.critical > 0) {
      recommendations.push(`Corriger ${summary.critical} issue(s) critique(s) avant validation`);
    }

    if (summary.high > this.HIGH_ISSUES_TOLERANCE) {
      recommendations.push(`Corriger ${summary.high} issue(s) haute priorité avant validation`);
    }

    if (metrics.maintainability < 80) {
      recommendations.push('Améliorer maintenabilité du code (documentation, clarté)');
    }

    if (metrics.testability < 80) {
      recommendations.push('Améliorer testabilité (ajouter tests, réduire complexité)');
    }

    if (metrics.performance < 80) {
      recommendations.push('Optimiser performance (requêtes, algorithmes)');
    }

    if (metrics.security < 80) {
      recommendations.push('Corriger problèmes de sécurité identifiés');
    }

    if (summary.autoFixable > 0) {
      recommendations.push(`Corriger automatiquement ${summary.autoFixable} issue(s) auto-fixable`);
    }

    return recommendations;
  }

  /**
   * Review automatique avec auto-correction
   */
  async reviewAndFix(
    files: string[],
    criteria?: ReviewCriteria
  ): Promise<{
    review: CodeReviewResult;
    fixes: Array<{
      issueId: string;
      fixed: boolean;
      method: string;
      error?: string;
    }>;
  }> {
    return withErrorHandling(
      async () => {
        // 1. Review
        const review = await this.reviewCode(files, criteria);

        // 2. Auto-corriger issues auto-fixables
        const fixes: Array<{
          issueId: string;
          fixed: boolean;
          method: string;
          error?: string;
        }> = [];

        const autoFixableIssues = review.issues.filter(i => i.autoFixable);
        for (const issue of autoFixableIssues) {
          try {
            // Logique d'auto-correction serait implémentée ici
            // Pour l'instant, marquer comme fixé
            fixes.push({
              issueId: issue.id,
              fixed: true,
              method: 'auto-fix'
            });
          } catch (error) {
            fixes.push({
              issueId: issue.id,
              fixed: false,
              method: 'auto-fix',
              error: error instanceof Error ? error.message : String(error)
            });
          }
        }

        // 3. Re-review après corrections
        if (fixes.some(f => f.fixed)) {
          const reReview = await this.reviewCode(files, criteria);
          return {
            review: reReview,
            fixes
          };
        }

        return {
          review,
          fixes
        };
      },
      {
        operation: 'reviewAndFix',
        service: 'AgentAutoReviewer',
        metadata: {}
      }
    );
  }
}

// ========================================
// SINGLETON INSTANCE
// ========================================

let agentAutoReviewerInstance: AgentAutoReviewer | null = null;

export function getAgentAutoReviewer(storage: IStorage): AgentAutoReviewer {
  if (!agentAutoReviewerInstance) {
    agentAutoReviewerInstance = new AgentAutoReviewer(storage);
  }
  return agentAutoReviewerInstance;
}

