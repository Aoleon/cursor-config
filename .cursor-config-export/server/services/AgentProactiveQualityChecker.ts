import { logger } from '../utils/logger';
import { withErrorHandling } from '../utils/error-handler';
import { getAgentCodeQualityPredictor } from './AgentCodeQualityPredictor';
import { getAgentAutoReviewer } from './AgentAutoReviewer';
import type { IStorage } from '../storage-poc';

// ========================================
// TYPES ET INTERFACES
// ========================================

export interface ProactiveCheck {
  timestamp: number;
  file: string;
  line?: number;
  issue: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  suggestion: string;
  autoFixable: boolean;
}

export interface ProactiveQualityResult {
  checks: ProactiveCheck[];
  score: number; // 0-100
  passed: boolean;
  recommendations: string[];
}

// ========================================
// AGENT PROACTIVE QUALITY CHECKER
// ========================================

/**
 * Service de vérification proactive pendant écriture
 * Détecte problèmes en temps réel et suggère corrections
 * Améliore qualité pendant développement
 */
export class AgentProactiveQualityChecker {
  private storage: IStorage;
  private qualityPredictor: ReturnType<typeof getAgentCodeQualityPredictor>;
  private autoReviewer: ReturnType<typeof getAgentAutoReviewer>;
  private checkHistory: Map<string, ProactiveCheck[]> = new Map();

  constructor(storage: IStorage) {
    if (!storage) {
      throw new Error('Storage requis pour AgentProactiveQualityChecker');
    }
    this.storage = storage;
    this.qualityPredictor = getAgentCodeQualityPredictor(storage);
    this.autoReviewer = getAgentAutoReviewer(storage);
  }

  /**
   * Vérifie qualité de manière proactive
   */
  async checkProactive(
    file: string,
    code: string,
    context?: {
      task?: string;
      type?: 'feature' | 'fix' | 'refactor' | 'ui' | 'architecture';
    }
  ): Promise<ProactiveQualityResult> {
    return withErrorHandling(
      async () => {
        const checks: ProactiveCheck[] = [];

        // 1. Vérifier patterns problématiques
        const patternChecks = this.checkPatterns(code, file);
        checks.push(...patternChecks);

        // 2. Vérifier conformité standards
        const standardsChecks = this.checkStandards(code, file);
        checks.push(...standardsChecks);

        // 3. Vérifier erreurs courantes
        const errorChecks = this.checkCommonErrors(code, file);
        checks.push(...errorChecks);

        // 4. Prédire qualité si contexte disponible
        if (context?.task) {
          const prediction = await this.qualityPredictor.predictQuality({
            task: context.task,
            type: context.type || 'feature',
            targetFile: file
          });

          // Convertir risques en checks
          for (const risk of prediction.risks) {
            if (risk.probability > 0.5) {
              checks.push({
                timestamp: Date.now(),
                file,
                issue: risk.description,
                severity: risk.severity,
                suggestion: risk.prevention,
                autoFixable: false
              });
            }
          }
        }

        // 5. Calculer score
        const score = this.calculateScore(checks);
        const passed = score >= 80 && checks.filter(c => c.severity === 'critical' || c.severity === 'high').length === 0;

        // 6. Générer recommandations
        const recommendations = this.generateRecommendations(checks);

        // 7. Stocker historique
        this.checkHistory.set(file, checks);

        logger.info('Vérification proactive terminée', {
          metadata: {
            service: 'AgentProactiveQualityChecker',
            operation: 'checkProactive',
            file,
            checksCount: checks.length,
            score,
            passed
          }
        });

        return {
          checks,
          score,
          passed,
          recommendations
        };
      },
      {
        operation: 'checkProactive',
        service: 'AgentProactiveQualityChecker',
        metadata: {}
      }
    );
  }

  /**
   * Vérifie patterns problématiques
   */
  private checkPatterns(code: string, file: string): ProactiveCheck[] {
    const checks: ProactiveCheck[] = [];

    // Pattern: console.log
    if (code.includes('console.log') || code.includes('console.error')) {
      checks.push({
        timestamp: Date.now(),
        file,
        issue: 'Utilisation console.log au lieu de logger',
        severity: 'medium',
        suggestion: 'Remplacer par logger de server/utils/logger.ts',
        autoFixable: true
      });
    }

    // Pattern: try-catch dans route
    if (file.includes('routes') && code.includes('try') && code.includes('catch')) {
      checks.push({
        timestamp: Date.now(),
        file,
        issue: 'try-catch dans route au lieu de asyncHandler',
        severity: 'high',
        suggestion: 'Utiliser asyncHandler wrapper',
        autoFixable: false
      });
    }

    // Pattern: any type
    const anyMatches = code.match(/:\s*any\b/g);
    if (anyMatches && anyMatches.length > 0) {
      checks.push({
        timestamp: Date.now(),
        file,
        issue: `Utilisation type 'any' (${anyMatches.length} occurrence(s))`,
        severity: 'medium',
        suggestion: 'Remplacer par types explicites depuis shared/schema.ts',
        autoFixable: false
      });
    }

    // Pattern: throw new Error()
    if (code.includes('throw new Error(')) {
      checks.push({
        timestamp: Date.now(),
        file,
        issue: 'Erreur générique au lieu d\'erreur typée',
        severity: 'medium',
        suggestion: 'Utiliser ValidationError, NotFoundError, etc. depuis error-handler',
        autoFixable: false
      });
    }

    // Pattern: SQL brut
    if (code.includes('SELECT') || code.includes('INSERT') || code.includes('UPDATE')) {
      checks.push({
        timestamp: Date.now(),
        file,
        issue: 'SQL brut détecté',
        severity: 'high',
        suggestion: 'Utiliser Drizzle ORM au lieu de SQL brut',
        autoFixable: false
      });
    }

    return checks;
  }

  /**
   * Vérifie conformité standards
   */
  private checkStandards(code: string, file: string): ProactiveCheck[] {
    const checks: ProactiveCheck[] = [];

    // Standard: asyncHandler pour routes
    if (file.includes('routes') && !code.includes('asyncHandler')) {
      checks.push({
        timestamp: Date.now(),
        file,
        issue: 'Route sans asyncHandler',
        severity: 'high',
        suggestion: 'Wrapper route avec asyncHandler',
        autoFixable: false
      });
    }

    // Standard: withErrorHandling pour services
    if (file.includes('services') && code.includes('async') && !code.includes('withErrorHandling')) {
      checks.push({
        timestamp: Date.now(),
        file,
        issue: 'Service sans withErrorHandling',
        severity: 'medium',
        suggestion: 'Wrapper méthode avec withErrorHandling',
        autoFixable: false
      });
    }

    // Standard: Validation Zod
    if (code.includes('req.body') && !code.includes('z.object') && !code.includes('parse')) {
      checks.push({
        timestamp: Date.now(),
        file,
        issue: 'Input non validé avec Zod',
        severity: 'high',
        suggestion: 'Valider req.body avec Zod avant traitement',
        autoFixable: false
      });
    }

    return checks;
  }

  /**
   * Vérifie erreurs courantes
   */
  private checkCommonErrors(code: string, file: string): ProactiveCheck[] {
    const checks: ProactiveCheck[] = [];

    // Erreur: await oublié
    const asyncFunctionCalls = code.match(/async\s+\([^)]*\)\s*=>/g);
    if (asyncFunctionCalls) {
      // Vérifier si await est utilisé correctement
      // Logique simplifiée
    }

    // Erreur: Promise non gérée
    if (code.includes('Promise') && !code.includes('await') && !code.includes('.then') && !code.includes('.catch')) {
      checks.push({
        timestamp: Date.now(),
        file,
        issue: 'Promise non gérée',
        severity: 'high',
        suggestion: 'Ajouter await ou gestion erreur',
        autoFixable: false
      });
    }

    return checks;
  }

  /**
   * Calcule score
   */
  private calculateScore(checks: ProactiveCheck[]): number {
    let score = 100;

    for (const check of checks) {
      const penalty = check.severity === 'critical' ? 15 :
                     check.severity === 'high' ? 10 :
                     check.severity === 'medium' ? 5 : 2;
      score -= penalty;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Génère recommandations
   */
  private generateRecommendations(checks: ProactiveCheck[]): string[] {
    const recommendations: string[] = [];

    const criticalChecks = checks.filter(c => c.severity === 'critical');
    const highChecks = checks.filter(c => c.severity === 'high');

    if (criticalChecks.length > 0) {
      recommendations.push(`Corriger ${criticalChecks.length} problème(s) critique(s) avant validation`);
    }

    if (highChecks.length > 0) {
      recommendations.push(`Corriger ${highChecks.length} problème(s) haute priorité`);
    }

    const autoFixable = checks.filter(c => c.autoFixable);
    if (autoFixable.length > 0) {
      recommendations.push(`Corriger automatiquement ${autoFixable.length} problème(s) auto-fixable`);
    }

    return recommendations;
  }

  /**
   * Vérifie qualité continue pendant développement
   */
  async checkContinuous(
    files: string[]
  ): Promise<Map<string, ProactiveQualityResult>> {
    return withErrorHandling(
      async () => {
        const results = new Map<string, ProactiveQualityResult>();

        for (const file of files) {
          // Lire fichier et vérifier
          // Cette méthode serait enrichie avec lecture réelle des fichiers
          const result = await this.checkProactive(file, '');
          results.set(file, result);
        }

        return results;
      },
      {
        operation: 'checkContinuous',
        service: 'AgentProactiveQualityChecker',
        metadata: {}
      }
    );
  }
}

// ========================================
// SINGLETON INSTANCE
// ========================================

let agentProactiveQualityCheckerInstance: AgentProactiveQualityChecker | null = null;

export function getAgentProactiveQualityChecker(storage: IStorage): AgentProactiveQualityChecker {
  if (!agentProactiveQualityCheckerInstance) {
    agentProactiveQualityCheckerInstance = new AgentProactiveQualityChecker(storage);
  }
  return agentProactiveQualityCheckerInstance;
}

