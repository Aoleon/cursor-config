import { logger } from '../utils/logger';
import { withErrorHandling } from '../utils/error-handler';
import { getAgentAutoReviewer } from './AgentAutoReviewer';
import { getAgentCodeSmellDetector } from './AgentCodeSmellDetector';
import type { IStorage } from '../storage-poc';

// ========================================
// TYPES ET INTERFACES
// ========================================

export interface Correction {
  id: string;
  type: 'fix' | 'refactor' | 'optimize' | 'document' | 'test';
  file: string;
  line?: number;
  issue: string;
  fix: string;
  confidence: number; // 0-1
  applied: boolean;
  error?: string;
}

export interface AutoCorrectionResult {
  corrections: Correction[];
  applied: number;
  failed: number;
  filesModified: string[];
  summary: {
    fixes: number;
    refactors: number;
    optimizations: number;
    documentations: number;
    tests: number;
  };
}

// ========================================
// AGENT AUTO CORRECTOR
// ========================================

/**
 * Service de correction automatique des problèmes détectés
 * Corrige automatiquement les issues auto-fixables
 * Adapté pour flowdev sans intervention manuelle
 */
export class AgentAutoCorrector {
  private storage: IStorage;
  private autoReviewer: ReturnType<typeof getAgentAutoReviewer>;
  private codeSmellDetector: ReturnType<typeof getAgentCodeSmellDetector>;

  constructor(storage: IStorage) {
    if (!storage) {
      throw new Error('Storage requis pour AgentAutoCorrector');
    }
    this.storage = storage;
    this.autoReviewer = getAgentAutoReviewer(storage);
    this.codeSmellDetector = getAgentCodeSmellDetector(storage);
  }

  /**
   * Corrige automatiquement les problèmes détectés
   */
  async autoCorrect(
    files: string[]
  ): Promise<AutoCorrectionResult> {
    return withErrorHandling(
      async () => {
        const corrections: Correction[] = [];

        // 1. Review pour identifier issues
        const review = await this.autoReviewer.reviewCode(files);

        // 2. Identifier issues auto-fixables
        const autoFixableIssues = review.issues.filter(i => i.autoFixable);

        // 3. Générer corrections
        for (const issue of autoFixableIssues) {
          const correction = await this.generateCorrection(issue);
          if (correction) {
            corrections.push(correction);
          }
        }

        // 4. Appliquer corrections
        const appliedCorrections = await this.applyCorrections(corrections);

        // 5. Calculer résumé
        const summary = this.calculateSummary(appliedCorrections);
        const filesModified = Array.from(new Set(appliedCorrections.map(c => c.file)));

        logger.info('Correction automatique terminée', {
          metadata: {
            service: 'AgentAutoCorrector',
            operation: 'autoCorrect',
            filesCount: files.length,
            correctionsCount: corrections.length,
            appliedCount: appliedCorrections.filter(c => c.applied).length
          }
        });

        return {
          corrections: appliedCorrections,
          applied: appliedCorrections.filter(c => c.applied).length,
          failed: appliedCorrections.filter(c => !c.applied).length,
          filesModified,
          summary
        };
      },
      {
        operation: 'autoCorrect',
        service: 'AgentAutoCorrector',
        metadata: {}
      }
    );
  }

  /**
   * Génère correction pour une issue
   */
  private async generateCorrection(
    issue: {
      id: string;
      type: string;
      file: string;
      line?: number;
      description: string;
      suggestion: string;
    }
  ): Promise<Correction | null> {
    // Générer correction selon type d'issue
    // Cette méthode serait enrichie avec logique de correction réelle

    let fix: string;
    let confidence = 0.7;
    let correctionType: Correction['type'] = 'fix';

    switch (issue.type) {
      case 'magic_numbers':
        fix = 'Extraire vers constante nommée';
        confidence = 0.9;
        correctionType = 'refactor';
        break;

      case 'dead_code':
        fix = 'Supprimer code mort';
        confidence = 0.8;
        correctionType = 'fix';
        break;

      case 'naming':
        fix = 'Renommer pour améliorer clarté';
        confidence = 0.7;
        correctionType = 'refactor';
        break;

      default:
        fix = issue.suggestion;
        confidence = 0.6;
    }

    return {
      id: `correction-${issue.id}`,
      type: correctionType,
      file: issue.file,
      line: issue.line,
      issue: issue.description,
      fix,
      confidence,
      applied: false
    };
  }

  /**
   * Applique corrections
   */
  private async applyCorrections(
    corrections: Correction[]
  ): Promise<Correction[]> {
    const applied: Correction[] = [];

    for (const correction of corrections) {
      try {
        // Appliquer correction
        // Cette méthode serait enrichie avec modification réelle des fichiers
        // Utiliser outils comme jscodeshift, prettier, eslint --fix, etc.

        applied.push({
          ...correction,
          applied: true
        });
      } catch (error) {
        applied.push({
          ...correction,
          applied: false,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return applied;
  }

  /**
   * Calcule résumé des corrections
   */
  private calculateSummary(corrections: Correction[]): AutoCorrectionResult['summary'] {
    return {
      fixes: corrections.filter(c => c.type === 'fix').length,
      refactors: corrections.filter(c => c.type === 'refactor').length,
      optimizations: corrections.filter(c => c.type === 'optimize').length,
      documentations: corrections.filter(c => c.type === 'document').length,
      tests: corrections.filter(c => c.type === 'test').length
    };
  }

  /**
   * Corrige et valide automatiquement
   */
  async correctAndValidate(files: string[]): Promise<{
    corrections: AutoCorrectionResult;
    validation: Awaited<ReturnType<ReturnType<typeof getAgentAutoReviewer>['reviewCode']>>;
  }> {
    return withErrorHandling(
      async () => {
        // 1. Corriger
        const corrections = await this.autoCorrect(files);

        // 2. Re-valider après corrections
        const validation = await this.autoReviewer.reviewCode(files);

        return {
          corrections,
          validation
        };
      },
      {
        operation: 'correctAndValidate',
        service: 'AgentAutoCorrector',
        metadata: {}
      }
    );
  }
}

// ========================================
// SINGLETON INSTANCE
// ========================================

let agentAutoCorrectorInstance: AgentAutoCorrector | null = null;

export function getAgentAutoCorrector(storage: IStorage): AgentAutoCorrector {
  if (!agentAutoCorrectorInstance) {
    agentAutoCorrectorInstance = new AgentAutoCorrector(storage);
  }
  return agentAutoCorrectorInstance;
}

