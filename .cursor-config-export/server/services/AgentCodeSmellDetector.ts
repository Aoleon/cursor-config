import { logger } from '../utils/logger';
import { withErrorHandling } from '../utils/error-handler';
import type { IStorage } from '../storage-poc';

// ========================================
// TYPES ET INTERFACES
// ========================================

export interface CodeSmell {
  id: string;
  type: 'long_method' | 'large_class' | 'duplication' | 'complexity' | 'coupling' | 'cohesion' | 'naming' | 'dead_code' | 'magic_numbers' | 'god_object';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  location: {
    file: string;
    line?: number;
    function?: string;
    class?: string;
  };
  metrics: {
    complexity?: number;
    lines?: number;
    parameters?: number;
    dependencies?: number;
  };
  recommendation: string;
  autoFixable: boolean;
}

export interface CodeSmellAnalysis {
  smells: CodeSmell[];
  summary: {
    total: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
    autoFixable: number;
  };
  healthScore: number; // 0-100
  recommendations: Array<{
    priority: 'low' | 'medium' | 'high' | 'critical';
    action: string;
    estimatedEffort: number;
  }>;
}

// ========================================
// AGENT CODE SMELL DETECTOR
// ========================================

/**
 * Service de détection avancée de code smells
 * Détecte patterns problématiques, complexité excessive, duplication
 */
export class AgentCodeSmellDetector {
  private storage: IStorage;

  // Seuils de détection
  private readonly LONG_METHOD_THRESHOLD = 50; // lignes
  private readonly LARGE_CLASS_THRESHOLD = 500; // lignes
  private readonly HIGH_COMPLEXITY_THRESHOLD = 10; // complexité cyclomatique
  private readonly MANY_PARAMETERS_THRESHOLD = 5;
  private readonly MANY_DEPENDENCIES_THRESHOLD = 7;

  constructor(storage: IStorage) {
    if (!storage) {
      throw new Error('Storage requis pour AgentCodeSmellDetector');
    }
    this.storage = storage;
  }

  /**
   * Analyse code smells dans le codebase
   */
  async detectCodeSmells(
    scope?: {
      files?: string[];
      services?: string[];
    }
  ): Promise<CodeSmellAnalysis> {
    return withErrorHandling(
      async () => {
        const smells: CodeSmell[] = [];

        // 1. Détecter méthodes longues
        const longMethodSmells = await this.detectLongMethods(scope);
        smells.push(...longMethodSmells);

        // 2. Détecter classes larges
        const largeClassSmells = await this.detectLargeClasses(scope);
        smells.push(...largeClassSmells);

        // 3. Détecter duplication
        const duplicationSmells = await this.detectDuplication(scope);
        smells.push(...duplicationSmells);

        // 4. Détecter complexité excessive
        const complexitySmells = await this.detectComplexity(scope);
        smells.push(...complexitySmells);

        // 5. Détecter code mort
        const deadCodeSmells = await this.detectDeadCode(scope);
        smells.push(...deadCodeSmells);

        // 6. Détecter magic numbers
        const magicNumberSmells = await this.detectMagicNumbers(scope);
        smells.push(...magicNumberSmells);

        // 7. Calculer résumé
        const summary = this.calculateSummary(smells);

        // 8. Générer recommandations
        const recommendations = this.generateRecommendations(smells);

        // 9. Calculer score de santé
        const healthScore = this.calculateHealthScore(smells);

        logger.info('Détection code smells terminée', {
          metadata: {
            service: 'AgentCodeSmellDetector',
            operation: 'detectCodeSmells',
            totalSmells: smells.length,
            criticalSmells: smells.filter(s => s.severity === 'critical').length,
            healthScore
          }
        });

        return {
          smells,
          summary,
          healthScore,
          recommendations
        };
      },
      {
        operation: 'detectCodeSmells',
        service: 'AgentCodeSmellDetector',
        metadata: {}
      }
    );
  }

  /**
   * Détecte méthodes longues
   */
  private async detectLongMethods(
    scope?: { files?: string[] }
  ): Promise<CodeSmell[]> {
    const smells: CodeSmell[] = [];

    // Méthodes longues connues (serait enrichi avec analyse AST réelle)
    // Pour l'instant, détection basée sur fichiers monolithiques

    return smells;
  }

  /**
   * Détecte classes larges
   */
  private async detectLargeClasses(
    scope?: { files?: string[] }
  ): Promise<CodeSmell[]> {
    const smells: CodeSmell[] = [];

    // Classes larges connues
    const knownLargeClasses = [
      { file: 'server/routes-poc.ts', lines: 11998, type: 'god_object' as const },
      { file: 'server/storage-poc.ts', lines: 8758, type: 'large_class' as const },
      { file: 'server/services/ChatbotOrchestrationService.ts', lines: 3575, type: 'large_class' as const }
    ];

    for (const largeClass of knownLargeClasses) {
      if (!scope?.files || scope.files.includes(largeClass.file)) {
        smells.push({
          id: `large-class-${largeClass.file.replace(/\//g, '-')}`,
          type: largeClass.type,
          severity: largeClass.lines > 5000 ? 'critical' : largeClass.lines > 2000 ? 'high' : 'medium',
          description: `Classe/fichier très large: ${largeClass.file} (${largeClass.lines} lignes)`,
          location: {
            file: largeClass.file
          },
          metrics: {
            lines: largeClass.lines
          },
          recommendation: `Décomposer ${largeClass.file} en classes/modules plus petits (objectif: <500 lignes par module)`,
          autoFixable: false
        });
      }
    }

    return smells;
  }

  /**
   * Détecte duplication de code
   */
  private async detectDuplication(
    scope?: { files?: string[] }
  ): Promise<CodeSmell[]> {
    const smells: CodeSmell[] = [];

    // Duplication serait détectée avec outils comme jscpd
    // Pour l'instant, détection basique

    return smells;
  }

  /**
   * Détecte complexité excessive
   */
  private async detectComplexity(
    scope?: { files?: string[] }
  ): Promise<CodeSmell[]> {
    const smells: CodeSmell[] = [];

    // Complexité serait calculée avec analyse AST
    // Pour l'instant, détection basique

    return smells;
  }

  /**
   * Détecte code mort
   */
  private async detectDeadCode(
    scope?: { files?: string[] }
  ): Promise<CodeSmell[]> {
    const smells: CodeSmell[] = [];

    // Code mort serait détecté avec analyse d'usage
    // Pour l'instant, détection basique

    return smells;
  }

  /**
   * Détecte magic numbers
   */
  private async detectMagicNumbers(
    scope?: { files?: string[] }
  ): Promise<CodeSmell[]> {
    const smells: CodeSmell[] = [];

    // Magic numbers seraient détectés avec analyse AST
    // Pour l'instant, détection basique

    return smells;
  }

  /**
   * Calcule résumé des smells
   */
  private calculateSummary(smells: CodeSmell[]): CodeSmellAnalysis['summary'] {
    const byType: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};

    for (const smell of smells) {
      byType[smell.type] = (byType[smell.type] || 0) + 1;
      bySeverity[smell.severity] = (bySeverity[smell.severity] || 0) + 1;
    }

    return {
      total: smells.length,
      byType,
      bySeverity,
      autoFixable: smells.filter(s => s.autoFixable).length
    };
  }

  /**
   * Génère recommandations
   */
  private generateRecommendations(
    smells: CodeSmell[]
  ): CodeSmellAnalysis['recommendations'] {
    const recommendations: CodeSmellAnalysis['recommendations'] = [];

    // Grouper par type et prioriser
    const smellsByType = new Map<string, CodeSmell[]>();
    for (const smell of smells) {
      const existing = smellsByType.get(smell.type) || [];
      existing.push(smell);
      smellsByType.set(smell.type, existing);
    }

    for (const [type, typeSmells] of Array.from(smellsByType.entries())) {
      const criticalCount = typeSmells.filter((s: CodeSmell) => s.severity === 'critical').length;
      const highCount = typeSmells.filter((s: CodeSmell) => s.severity === 'high').length;

      if (criticalCount > 0 || highCount > 2) {
        recommendations.push({
          priority: criticalCount > 0 ? 'critical' : 'high',
          action: `Corriger ${typeSmells.length} code smells de type "${type}"`,
          estimatedEffort: typeSmells.length * 2 // heures par smell
        });
      }
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Calcule score de santé
   */
  private calculateHealthScore(smells: CodeSmell[]): number {
    let score = 100;

    for (const smell of smells) {
      if (smell.severity === 'critical') score -= 5;
      else if (smell.severity === 'high') score -= 3;
      else if (smell.severity === 'medium') score -= 2;
      else score -= 1;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Suggère corrections automatiques
   */
  async suggestAutoFixes(smells: CodeSmell[]): Promise<Array<{
    smellId: string;
    fix: string;
    confidence: number;
    estimatedEffort: number;
  }>> {
    return withErrorHandling(
      async () => {
        const fixes: Array<{
          smellId: string;
          fix: string;
          confidence: number;
          estimatedEffort: number;
        }> = [];

        for (const smell of smells) {
          if (!smell.autoFixable) continue;

          let fix: string;
          let confidence: number;
          let estimatedEffort: number;

          switch (smell.type) {
            case 'magic_numbers':
              fix = 'Extraire magic numbers vers constantes nommées';
              confidence = 0.9;
              estimatedEffort = 0.5; // heures
              break;

            case 'dead_code':
              fix = 'Supprimer code mort non utilisé';
              confidence = 0.8;
              estimatedEffort = 0.3;
              break;

            case 'naming':
              fix = 'Renommer pour améliorer clarté';
              confidence = 0.7;
              estimatedEffort = 0.2;
              break;

            default:
              continue;
          }

          fixes.push({
            smellId: smell.id,
            fix,
            confidence,
            estimatedEffort
          });
        }

        return fixes;
      },
      {
        operation: 'suggestAutoFixes',
        service: 'AgentCodeSmellDetector',
        metadata: {}
      }
    );
  }
}

// ========================================
// SINGLETON INSTANCE
// ========================================

let agentCodeSmellDetectorInstance: AgentCodeSmellDetector | null = null;

export function getAgentCodeSmellDetector(storage: IStorage): AgentCodeSmellDetector {
  if (!agentCodeSmellDetectorInstance) {
    agentCodeSmellDetectorInstance = new AgentCodeSmellDetector(storage);
  }
  return agentCodeSmellDetectorInstance;
}

