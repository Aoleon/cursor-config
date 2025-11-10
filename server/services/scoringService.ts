import type { 
  SpecialCriteria, 
  TechnicalScoringConfig, 
  TechnicalScoringResult
} from "@shared/schema";
import { defaultTechnicalScoringConfig as defaultConfig } from "@shared/schema";
import { withErrorHandling } from './utils/error-handler';
import { logger } from "../utils/logger";

/**
 * Service de scoring technique pour le système d'alerte automatique JLM
 * 
 * Calcule un score pondéré basé sur 5 critères techniques spéciaux détectés par OCR :
 * - Bâtiment passif (poids: 5)
 * - Isolation renforcée (poids: 3) 
 * - Précadres (poids: 2)
 * - Volets extérieurs (poids: 1)
 * - Coupe-feu (poids: 4)
 * 
 * Algorithme: Score = Σ(poids_i × (critère_i ? 1 : 0))
 * Alerte si score >= seuil (défaut: 5)
 */
export class ScoringService {
  /**
   * Calcule le score technique basé sur les critères spéciaux et la configuration
   */
  static compute(
    specialCriteria: SpecialCriteria, 
    config: TechnicalScoringConfig = defaultConfig
  ): TechnicalScoringResult {
    const details: Record<string, number> = {};
    const triggeredCriteria: string[] = [];
    let totalScore = 0;

    // Calculer la contribution de chaque critère
    const criteriaMapping = {
      batimentPassif: 'batimentPassif',
      isolationRenforcee: 'isolationRenforcee',
      precadres: 'precadres', 
      voletsExterieurs: 'voletsExterieurs',
      coupeFeu: 'coupeFeu'
    } as const;

    for (const [criteriaKey, configKey] of Object.entries(criteriaMapping)) {
      const isTriggered = specialCriteria[criteriaKey as keyof SpecialCriteria] as boolean;
      const weight = config.weights[configKey as keyof typeof config.weights];
      const contribution = isTriggered ? weight : 0;
      
      details[criteriaKey] = contribution;
      totalScore += contribution;
      
      if (isTriggered) {
        triggeredCriteria.push(criteriaKey);
      }
    }

    // Déterminer si une alerte doit être déclenchée
    const shouldAlert = totalScore >= config.threshold;

    logger.info('Calcul scoring technique', {
      metadata: {
        service: 'ScoringService',
        operation: 'compute',
        totalScore,
        threshold: config.threshold,
        triggeredCriteria: triggeredCriteria.join(', ') || 'aucun',
        shouldAlert,
        details
      }
    });

    return {
      totalScore,
      triggeredCriteria,
      shouldAlert,
      details
    };
  }

  /**
   * Retourne la configuration par défaut du scoring technique
   */
  static getDefaultConfig(): TechnicalScoringConfig {
    return { ...defaultConfig };
  }

  /**
   * Valide une configuration de scoring
   */
  static validateConfig(config: TechnicalScoringConfig): boolean {
    return withErrorHandling(
    async () => {

      // Vérifier que tous les poids sont dans la plage valide
      const weights = config.weights;
      const validWeights = Object.values(weights).every(w => w >= 0 && w <= 10);
      
      // Vérifier que le seuil est dans la plage valide
      const validThreshold = config.threshold >= 0 && config.threshold <= 50;
      
      return validWeights && validThreshold;
    
    },
    {
      operation: 'passif',
      service: 'scoringService',
      metadata: {}
    }
  );
      });
      return false;
    }
  }

  /**
   * Calcule le score maximum possible avec une configuration donnée
   */
  static getMaxPossibleScore(config: TechnicalScoringConfig = defaultConfig): number {
    const weights = config.weights;
    return weights.batimentPassif + 
           weights.isolationRenforcee + 
           weights.precadres + 
           weights.voletsExterieurs + 
           weights.coupeFeu;
  }

  /**
   * Créer un exemple de critères pour démonstration/tests
   */
  static createSampleCriteria(scenario: 'none' | 'low' | 'medium' | 'high' | 'critical' = 'medium'): SpecialCriteria {
    switch (scenario) {
      case 'none':
        return {
          batimentPassif: false,
          isolationRenforcee: false,
          precadres: false,
          voletsExterieurs: false,
          coupeFeu: false
        };
      
      case 'low':
        return {
          batimentPassif: false,
          isolationRenforcee: false,
          precadres: true, // 2 points
          voletsExterieurs: true, // 1 point
          coupeFeu: false
        };
      
      case 'medium':
        return {
          batimentPassif: false,
          isolationRenforcee: true, // 3 points
          precadres: true, // 2 points
          voletsExterieurs: false,
          coupeFeu: false
        };
      
      case 'high':
        return {
          batimentPassif: false,
          isolationRenforcee: true, // 3 points
          precadres: true, // 2 points
          voletsExterieurs: true, // 1 point
          coupeFeu: true // 4 points
        };
      
      case 'critical':
        return {
          batimentPassif: true, // 5 points
          isolationRenforcee: true, // 3 points
          precadres: true, // 2 points
          voletsExterieurs: true, // 1 point
          coupeFeu: true // 4 points
        };
      
      default:
        return {
          batimentPassif: false,
          isolationRenforcee: true,
          precadres: true,
          voletsExterieurs: false,
          coupeFeu: false
        };
    }
  }

  /**
   * Obtenir une description textuelle du niveau de score
   */
  static getScoreLevel(score: number, maxScore: number): 'faible' | 'modéré' | 'élevé' | 'critique' {
    const percentage = (score / maxScore) * 100;
    
    if (percentage >= 80) return 'critique';
    if (percentage >= 60) return 'élevé';
    if (percentage >= 30) return 'modéré';
    return 'faible';
  }

  /**
   * Générer un rapport de scoring détaillé pour debug/audit
   */
  static generateReport(
    specialCriteria: SpecialCriteria, 
    config: TechnicalScoringConfig = defaultConfig
  ): string {
    const result = this.compute(specialCriteria, config);
    const maxScore = this.getMaxPossibleScore(config);
    const level = this.getScoreLevel(result.totalScore, maxScore);
    
    return `
=== RAPPORT SCORING TECHNIQUE ===
Score total: ${result.totalScore}/${maxScore} (${((result.totalScore/maxScore)*100).toFixed(1)}%)
Niveau: ${level.toUpperCase()}
Seuil d'alerte: ${config.threshold}
Alerte déclenchée: ${result.shouldAlert ? 'OUI' : 'NON'}

Critères détectés:
${Object.entries(result.details)
  .map(([criteria, score]) => `  - ${criteria}: ${score > 0 ? '✓' : '✗'} (${score} pts)`)
  .join('\n')}

Configuration utilisée:
${Object.entries(config.weights)
  .map(([criteria, weight]) => `  - ${criteria}: ${weight} pts`)
  .join('\n')}
================================`;
  }
}