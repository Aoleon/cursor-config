import { logger } from '../utils/logger';
import { withErrorHandling } from '../utils/error-handler';
import { getAgentLearningService } from './AgentLearningService';
import { getAgentCodeSmellDetector } from './AgentCodeSmellDetector';
import type { IStorage } from '../storage-poc';

// ========================================
// TYPES ET INTERFACES
// ========================================

export interface CodeQualityPrediction {
  predictedScore: number; // 0-100
  confidence: number; // 0-1
  risks: Array<{
    type: 'error' | 'code_smell' | 'architecture' | 'performance' | 'security' | 'maintainability';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    probability: number; // 0-1
    prevention: string;
  }>;
  recommendations: Array<{
    priority: 'low' | 'medium' | 'high' | 'critical';
    action: string;
    description: string;
    estimatedImpact: number; // 0-100
  }>;
  bestPractices: string[];
  patterns: Array<{
    pattern: string;
    quality: 'excellent' | 'good' | 'acceptable' | 'poor';
    recommendation: string;
  }>;
}

export interface CodeContext {
  task: string;
  type: 'feature' | 'fix' | 'refactor' | 'ui' | 'architecture';
  targetFile?: string;
  similarFiles?: string[];
  requirements?: string[];
  constraints?: string[];
}

// ========================================
// AGENT CODE QUALITY PREDICTOR
// ========================================

/**
 * Service de prédiction qualité du code avant écriture
 * Prédit problèmes potentiels et suggère meilleures pratiques
 * Améliore qualité dès la première écriture
 */
export class AgentCodeQualityPredictor {
  private storage: IStorage;
  private learningService: ReturnType<typeof getAgentLearningService>;
  private codeSmellDetector: ReturnType<typeof getAgentCodeSmellDetector>;

  // Patterns de qualité connus
  private readonly QUALITY_PATTERNS = {
    excellent: [
      'asyncHandler pour routes',
      'withErrorHandling pour services',
      'logger au lieu de console',
      'types depuis shared/schema',
      'validation Zod',
      'erreurs typées'
    ],
    poor: [
      'console.log',
      'try-catch dans routes',
      'any types',
      'SQL brut',
      'erreurs génériques'
    ]
  };

  constructor(storage: IStorage) {
    if (!storage) {
      throw new Error('Storage requis pour AgentCodeQualityPredictor');
    }
    this.storage = storage;
    this.learningService = getAgentLearningService();
    this.codeSmellDetector = getAgentCodeSmellDetector(storage);
  }

  /**
   * Prédit qualité du code avant écriture
   */
  async predictQuality(context: CodeContext): Promise<CodeQualityPrediction> {
    return withErrorHandling(
      async () => {
        // 1. Analyser patterns historiques similaires
        const historicalPatterns = await this.analyzeHistoricalPatterns(context);

        // 2. Identifier risques potentiels
        const risks = await this.identifyRisks(context, historicalPatterns);

        // 3. Générer recommandations préventives
        const recommendations = this.generatePreventiveRecommendations(context, risks);

        // 4. Identifier meilleures pratiques
        const bestPractices = this.identifyBestPractices(context);

        // 5. Analyser patterns similaires
        const patterns = await this.analyzeSimilarPatterns(context);

        // 6. Calculer score prédit
        const predictedScore = this.calculatePredictedScore(risks, recommendations, patterns);
        const confidence = this.calculateConfidence(historicalPatterns, context);

        logger.info('Prédiction qualité générée', {
          metadata: {
            service: 'AgentCodeQualityPredictor',
            operation: 'predictQuality',
            task: context.task,
            predictedScore,
            confidence,
            risksCount: risks.length,
            recommendationsCount: recommendations.length
          }
        });

        return {
          predictedScore,
          confidence,
          risks,
          recommendations,
          bestPractices,
          patterns
        };
      },
      {
        operation: 'predictQuality',
        service: 'AgentCodeQualityPredictor',
        metadata: {}
      }
    );
  }

  /**
   * Analyse patterns historiques similaires
   */
  private async analyzeHistoricalPatterns(
    context: CodeContext
  ): Promise<Array<{
    queryType: string;
    successRate: number;
    avgExecutionTime: number;
    commonIssues?: string[];
  }>> {
    try {
      const patterns = await this.learningService.analyzeHistoricalPatterns(30);
      return (patterns.successPatterns || []).map(p => ({
        ...p,
        commonIssues: []
      }));
    } catch (error) {
      logger.debug('Erreur analyse patterns historiques', {
        metadata: {
          service: 'AgentCodeQualityPredictor',
          operation: 'analyzeHistoricalPatterns',
          error: error instanceof Error ? error.message : String(error)
        }
      });
      return [];
    }
  }

  /**
   * Identifie risques potentiels
   */
  private async identifyRisks(
    context: CodeContext,
    historicalPatterns: Array<{
      queryType: string;
      successRate: number;
      avgExecutionTime: number;
      commonIssues?: string[];
    }>
  ): Promise<CodeQualityPrediction['risks']> {
    const risks: CodeQualityPrediction['risks'] = [];

    // Analyser contexte pour identifier risques
    const taskLower = context.task.toLowerCase();

    // Risque: Oubli asyncHandler
    if (context.type === 'feature' && taskLower.includes('route') && !taskLower.includes('asyncHandler')) {
      risks.push({
        type: 'error',
        severity: 'high',
        description: 'Risque d\'oubli asyncHandler pour route',
        probability: 0.7,
        prevention: 'Utiliser asyncHandler wrapper pour toutes les routes'
      });
    }

    // Risque: Oubli validation Zod
    if (context.type === 'feature' && (taskLower.includes('input') || taskLower.includes('form'))) {
      risks.push({
        type: 'error',
        severity: 'medium',
        description: 'Risque d\'oubli validation Zod',
        probability: 0.6,
        prevention: 'Valider tous les inputs avec Zod avant traitement'
      });
    }

    // Risque: Utilisation console.log
    if (taskLower.includes('log') || taskLower.includes('debug')) {
      risks.push({
        type: 'code_smell',
        severity: 'medium',
        description: 'Risque d\'utilisation console.log au lieu de logger',
        probability: 0.5,
        prevention: 'Utiliser logger de server/utils/logger.ts'
      });
    }

    // Risque: Types any
    if (context.type === 'refactor' || context.type === 'feature') {
      risks.push({
        type: 'maintainability',
        severity: 'low',
        description: 'Risque d\'utilisation types any',
        probability: 0.4,
        prevention: 'Utiliser types depuis shared/schema.ts ou définir types explicites'
      });
    }

    // Analyser patterns historiques pour risques récurrents
    for (const pattern of historicalPatterns) {
      if (pattern.successRate < 0.7 && pattern.commonIssues) {
        for (const issue of pattern.commonIssues) {
          risks.push({
            type: 'code_smell',
            severity: 'medium',
            description: `Problème récurrent: ${issue}`,
            probability: 0.6,
            prevention: `Éviter pattern: ${issue}`
          });
        }
      }
    }

    return risks;
  }

  /**
   * Génère recommandations préventives
   */
  private generatePreventiveRecommendations(
    context: CodeContext,
    risks: CodeQualityPrediction['risks']
  ): CodeQualityPrediction['recommendations'] {
    const recommendations: CodeQualityPrediction['recommendations'] = [];

    // Recommandations basées sur type de tâche
    if (context.type === 'feature') {
      recommendations.push({
        priority: 'high',
        action: 'Utiliser asyncHandler',
        description: 'Wrapper toutes les routes avec asyncHandler',
        estimatedImpact: 90
      });
      recommendations.push({
        priority: 'high',
        action: 'Valider avec Zod',
        description: 'Valider tous les inputs avec Zod',
        estimatedImpact: 85
      });
      recommendations.push({
        priority: 'medium',
        action: 'Utiliser logger',
        description: 'Utiliser logger au lieu de console',
        estimatedImpact: 70
      });
    }

    if (context.type === 'refactor') {
      recommendations.push({
        priority: 'high',
        action: 'Préserver fonctionnalité',
        description: 'S\'assurer que refactoring ne casse pas fonctionnalité existante',
        estimatedImpact: 95
      });
      recommendations.push({
        priority: 'medium',
        action: 'Améliorer types',
        description: 'Remplacer any par types explicites',
        estimatedImpact: 75
      });
    }

    // Recommandations basées sur risques
    for (const risk of risks) {
      if (risk.severity === 'critical' || risk.severity === 'high') {
        recommendations.push({
          priority: risk.severity,
          action: risk.prevention,
          description: `Prévenir: ${risk.description}`,
          estimatedImpact: 80
        });
      }
    }

    return recommendations;
  }

  /**
   * Identifie meilleures pratiques
   */
  private identifyBestPractices(context: CodeContext): string[] {
    const practices: string[] = [];

    // Pratiques générales
    practices.push('Utiliser asyncHandler pour routes');
    practices.push('Utiliser withErrorHandling pour services');
    practices.push('Utiliser logger au lieu de console');
    practices.push('Utiliser types depuis shared/schema.ts');
    practices.push('Valider avec Zod avant traitement');
    practices.push('Utiliser erreurs typées (ValidationError, NotFoundError, etc.)');

    // Pratiques selon type
    if (context.type === 'feature') {
      practices.push('Créer tests unitaires');
      practices.push('Documenter avec JSDoc');
      practices.push('Gérer erreurs gracieusement');
    }

    if (context.type === 'refactor') {
      practices.push('Préserver tests existants');
      practices.push('Vérifier non-régression');
      practices.push('Améliorer maintenabilité');
    }

    return practices;
  }

  /**
   * Analyse patterns similaires
   */
  private async analyzeSimilarPatterns(
    context: CodeContext
  ): Promise<CodeQualityPrediction['patterns']> {
    const patterns: CodeQualityPrediction['patterns'] = [];

    // Analyser fichiers similaires si disponibles
    if (context.similarFiles && context.similarFiles.length > 0) {
      try {
        const analysis = await this.codeSmellDetector.detectCodeSmells({
          files: context.similarFiles
        });

        // Identifier patterns de qualité
        for (const smell of analysis.smells) {
          if (smell.severity === 'low') {
            patterns.push({
              pattern: smell.type,
              quality: 'acceptable',
              recommendation: smell.recommendation
            });
          } else if (smell.severity === 'medium') {
            patterns.push({
              pattern: smell.type,
              quality: 'poor',
              recommendation: smell.recommendation
            });
          }
        }
      } catch (error) {
        logger.debug('Erreur analyse patterns similaires', {
          metadata: {
            service: 'AgentCodeQualityPredictor',
            operation: 'analyzeSimilarPatterns',
            error: error instanceof Error ? error.message : String(error)
          }
        });
      }
    }

    return patterns;
  }

  /**
   * Calcule score prédit
   */
  private calculatePredictedScore(
    risks: CodeQualityPrediction['risks'],
    recommendations: CodeQualityPrediction['recommendations'],
    patterns: CodeQualityPrediction['patterns']
  ): number {
    let score = 100;

    // Pénaliser selon risques
    for (const risk of risks) {
      const penalty = risk.severity === 'critical' ? 15 :
                     risk.severity === 'high' ? 10 :
                     risk.severity === 'medium' ? 5 : 2;
      score -= penalty * risk.probability;
    }

    // Bonus selon recommandations appliquées
    const highPriorityRecommendations = recommendations.filter(r => r.priority === 'high');
    score += highPriorityRecommendations.length * 5;

    // Pénaliser selon patterns pauvres
    const poorPatterns = patterns.filter(p => p.quality === 'poor');
    score -= poorPatterns.length * 3;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Calcule confiance de la prédiction
   */
  private calculateConfidence(
    historicalPatterns: Array<unknown>,
    context: CodeContext
  ): number {
    // Plus de patterns historiques = plus de confiance
    let confidence = 0.5;

    if (historicalPatterns.length > 10) {
      confidence = 0.9;
    } else if (historicalPatterns.length > 5) {
      confidence = 0.7;
    }

    // Plus de contexte = plus de confiance
    if (context.targetFile && context.similarFiles && context.similarFiles.length > 0) {
      confidence = Math.min(1, confidence + 0.2);
    }

    return confidence;
  }

  /**
   * Génère template de code de qualité
   */
  async generateQualityTemplate(
    context: CodeContext
  ): Promise<{
    template: string;
    qualityScore: number;
    bestPractices: string[];
  }> {
    return withErrorHandling(
      async () => {
        const prediction = await this.predictQuality(context);
        const template = this.buildTemplate(context, prediction);

        return {
          template,
          qualityScore: prediction.predictedScore,
          bestPractices: prediction.bestPractices
        };
      },
      {
        operation: 'generateQualityTemplate',
        service: 'AgentCodeQualityPredictor',
        metadata: {}
      }
    );
  }

  /**
   * Construit template basé sur contexte et prédiction
   */
  private buildTemplate(
    context: CodeContext,
    prediction: CodeQualityPrediction
  ): string {
    let template = '';

    if (context.type === 'feature' && context.task.toLowerCase().includes('route')) {
      template = `import { asyncHandler } from '../utils/error-handler';
import { logger } from '../utils/logger';
import { z } from 'zod';

// Schema de validation
const ${context.task.split(' ')[0]}Schema = z.object({
  // Définir schéma
});

export const ${context.task.split(' ')[0]}Route = asyncHandler(async (req, res) => {
  // Validation
  const validated = ${context.task.split(' ')[0]}Schema.parse(req.body);
  
  // Logique métier
  logger.info('${context.task}', {
    metadata: {
      // Métadonnées
    }
  });
  
  res.json({ success: true });
});`;
    }

    return template;
  }
}

// ========================================
// SINGLETON INSTANCE
// ========================================

let agentCodeQualityPredictorInstance: AgentCodeQualityPredictor | null = null;

export function getAgentCodeQualityPredictor(storage: IStorage): AgentCodeQualityPredictor {
  if (!agentCodeQualityPredictorInstance) {
    agentCodeQualityPredictorInstance = new AgentCodeQualityPredictor(storage);
  }
  return agentCodeQualityPredictorInstance;
}

