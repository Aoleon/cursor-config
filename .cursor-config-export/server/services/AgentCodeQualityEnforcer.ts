import { logger } from '../utils/logger';
import { withErrorHandling } from '../utils/error-handler';
import type { IStorage } from '../storage-poc';
import { getAgentCodeSmellDetector } from './AgentCodeSmellDetector';
import { getAgentArchitectureAnalyzer } from './AgentArchitectureAnalyzer';
import { getAgentAutoReviewer } from './AgentAutoReviewer';
import { getAgentFastAutoCorrector } from './AgentFastAutoCorrector';

// ========================================
// ENFORCEUR DE QUALITÉ DE CODE
// ========================================
// Enforcement automatique de qualité de code
// Détecte et corrige automatiquement les problèmes
// ========================================

export interface QualityEnforcementResult {
  passed: boolean;
  issuesFound: number;
  issuesFixed: number;
  issuesRemaining: number;
  corrections: Array<{
    file: string;
    issue: string;
    correction: string;
    success: boolean;
  }>;
  blockingIssues: string[];
  warnings: string[];
}

export interface EnforcementOptions {
  autoFix?: boolean; // Corriger automatiquement si possible
  strict?: boolean; // Mode strict (bloque si issues critiques)
  maxIssues?: number; // Nombre max d'issues avant blocage
  skipWarnings?: boolean; // Ignorer warnings
}

/**
 * Service d'enforcement automatique de qualité de code
 * Détecte et corrige automatiquement les problèmes de qualité
 */
export class AgentCodeQualityEnforcer {
  private storage: IStorage;
  private codeSmellDetector: ReturnType<typeof getAgentCodeSmellDetector>;
  private architectureAnalyzer: ReturnType<typeof getAgentArchitectureAnalyzer>;
  private autoReviewer: ReturnType<typeof getAgentAutoReviewer>;
  private fastCorrector: ReturnType<typeof getAgentFastAutoCorrector>;

  constructor(storage: IStorage) {
    if (!storage) {
      throw new Error('Storage requis pour AgentCodeQualityEnforcer');
    }
    this.storage = storage;
    this.codeSmellDetector = getAgentCodeSmellDetector(storage);
    this.architectureAnalyzer = getAgentArchitectureAnalyzer(storage);
    this.autoReviewer = getAgentAutoReviewer(storage);
    this.fastCorrector = getAgentFastAutoCorrector(storage);
  }

  /**
   * Enforce qualité de code sur fichiers
   */
  async enforceQuality(
    files: string[],
    options?: EnforcementOptions
  ): Promise<QualityEnforcementResult> {
    return withErrorHandling(
      async () => {
        const autoFix = options?.autoFix ?? true;
        const strict = options?.strict ?? false;
        const maxIssues = options?.maxIssues ?? 10;
        const skipWarnings = options?.skipWarnings ?? false;

        const corrections: QualityEnforcementResult['corrections'] = [];
        const blockingIssues: string[] = [];
        const warnings: string[] = [];

        // 1. Détecter code smells
        const codeSmells = await this.codeSmellDetector.detectCodeSmells({ files });
        const smellIssues = codeSmells.smells.map(smell => ({
          file: smell.location.file,
          issue: `${smell.type}: ${smell.description}`,
          severity: smell.severity,
          location: smell.location
        }));

        // 2. Auto-review
        const review = await this.autoReviewer.reviewCode(files);
        const reviewIssues = review.issues.map(issue => ({
          file: issue.file,
          issue: `${issue.type}: ${issue.description || 'Issue détectée'}`,
          severity: issue.severity,
          location: { file: issue.file, line: issue.line }
        }));

        // 3. Analyser architecture
        const architecture = await this.architectureAnalyzer.analyzeArchitecture({ files });
        const archIssues = architecture.issues.map(issue => ({
          file: issue.location?.files?.[0] || 'unknown',
          issue: `Architecture: ${issue.description || 'Issue détectée'}`,
          severity: issue.severity,
          location: { file: issue.location?.files?.[0] || 'unknown' }
        }));

        // 4. Combiner toutes les issues
        const allIssues = [...smellIssues, ...reviewIssues, ...archIssues];
        const criticalIssues = allIssues.filter((i: { severity: string }) => i.severity === 'critical');
        const errorIssues = allIssues.filter((i: { severity: string }) => i.severity === 'error');
        const warningIssues = allIssues.filter((i: { severity: string }) => i.severity === 'warning');

        // 5. Auto-correction si activée
        let issuesFixed = 0;
        if (autoFix) {
          const correctionResult = await this.fastCorrector.correctFast(files);

          for (const correction of correctionResult.corrections) {
            corrections.push({
              file: correction.file,
              issue: `${correction.type}: ${correction.original}`,
              correction: correction.corrected,
              success: correction.applied
            });

            if (correction.applied) {
              issuesFixed++;
            }
          }
        }

        // 6. Déterminer issues bloquantes
        if (strict) {
          if (criticalIssues.length > 0) {
            blockingIssues.push(`${criticalIssues.length} issue(s) critique(s) détectée(s)`);
          }
          if (errorIssues.length > maxIssues) {
            blockingIssues.push(`${errorIssues.length} erreur(s) détectée(s) (max: ${maxIssues})`);
          }
        } else {
          // Mode non-strict: seulement issues critiques bloquent
          if (criticalIssues.length > 0) {
            blockingIssues.push(`${criticalIssues.length} issue(s) critique(s) détectée(s)`);
          }
        }

        // 7. Collecter warnings
        if (!skipWarnings) {
          for (const warning of warningIssues) {
            warnings.push(`${(warning as { file: string; issue: string }).file}: ${(warning as { file: string; issue: string }).issue}`);
          }
        }

        const issuesRemaining = allIssues.length - issuesFixed;
        const passed = blockingIssues.length === 0;

        logger.info('Enforcement qualité terminé', {
          metadata: {
            service: 'AgentCodeQualityEnforcer',
            operation: 'enforceQuality',
            filesCount: files.length,
            issuesFound: allIssues.length,
            issuesFixed,
            issuesRemaining,
            passed,
            blockingIssuesCount: blockingIssues.length
          }
        });

        return {
          passed,
          issuesFound: allIssues.length,
          issuesFixed,
          issuesRemaining,
          corrections,
          blockingIssues,
          warnings
        };
      },
      {
        operation: 'enforceQuality',
        service: 'AgentCodeQualityEnforcer',
        metadata: { files }
      }
    );
  }

  /**
   * Enforce qualité avant commit
   */
  async enforcePreCommit(
    files: string[],
    options?: EnforcementOptions
  ): Promise<QualityEnforcementResult> {
    // Mode strict par défaut pour pre-commit
    return this.enforceQuality(files, {
      ...options,
      strict: options?.strict ?? true,
      autoFix: options?.autoFix ?? true
    });
  }

  /**
   * Enforce qualité continue (mode monitoring)
   */
  async enforceContinuous(
    files: string[],
    options?: EnforcementOptions
  ): Promise<QualityEnforcementResult> {
    // Mode non-strict pour monitoring continu
    return this.enforceQuality(files, {
      ...options,
      strict: false,
      autoFix: options?.autoFix ?? true,
      skipWarnings: options?.skipWarnings ?? true
    });
  }

  /**
   * Récupère statistiques d'enforcement
   */
  getEnforcementStats(): {
    totalEnforcements: number;
    totalIssuesFound: number;
    totalIssuesFixed: number;
    avgIssuesPerFile: number;
    successRate: number;
  } {
    // Statistiques basées sur historique (à implémenter si nécessaire)
    return {
      totalEnforcements: 0,
      totalIssuesFound: 0,
      totalIssuesFixed: 0,
      avgIssuesPerFile: 0,
      successRate: 0
    };
  }
}

// ========================================
// SINGLETON
// ========================================

let agentCodeQualityEnforcerInstance: AgentCodeQualityEnforcer | null = null;

export function getAgentCodeQualityEnforcer(storage: IStorage): AgentCodeQualityEnforcer {
  if (!agentCodeQualityEnforcerInstance) {
    agentCodeQualityEnforcerInstance = new AgentCodeQualityEnforcer(storage);
  }
  return agentCodeQualityEnforcerInstance;
}

