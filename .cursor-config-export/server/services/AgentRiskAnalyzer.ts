import { logger } from '../utils/logger';
import { withErrorHandling } from '../utils/error-handler';
import { getAgentArchitectureAnalyzer } from './AgentArchitectureAnalyzer';
import type { IStorage } from '../storage-poc';

// ========================================
// TYPES ET INTERFACES
// ========================================

export interface Risk {
  id: string;
  type: 'regression' | 'breaking_change' | 'performance' | 'security' | 'data_loss' | 'complexity';
  severity: 'low' | 'medium' | 'high' | 'critical';
  probability: number; // 0-1
  impact: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedAreas: string[];
  mitigation: string[];
  detection: string[];
}

export interface RiskAnalysis {
  risks: Risk[];
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number; // 0-100
  recommendations: Array<{
    priority: 'low' | 'medium' | 'high' | 'critical';
    action: string;
    estimatedEffort: number;
  }>;
}

// ========================================
// AGENT RISK ANALYZER
// ========================================

/**
 * Service d'analyse de risques pour changements
 * Évalue risques avant modifications, migrations, refactorings
 */
export class AgentRiskAnalyzer {
  private storage: IStorage;
  private architectureAnalyzer: ReturnType<typeof getAgentArchitectureAnalyzer>;

  constructor(storage: IStorage) {
    if (!storage) {
      throw new Error('Storage requis pour AgentRiskAnalyzer');
    }
    this.storage = storage;
    this.architectureAnalyzer = getAgentArchitectureAnalyzer(storage);
  }

  /**
   * Analyse risques d'un changement proposé
   */
  async analyzeChangeRisks(
    change: {
      type: 'add' | 'modify' | 'remove' | 'migrate' | 'refactor';
      target: string;
      description: string;
      scope?: string[];
    }
  ): Promise<RiskAnalysis> {
    return withErrorHandling(
      async () => {
        const risks: Risk[] = [];

        // 1. Analyser impact architectural
        const impact = await this.architectureAnalyzer.analyzeChangeImpact({
          type: change.type === 'migrate' || change.type === 'refactor' ? 'modify' : change.type,
          target: change.target,
          description: change.description
        });

        // 2. Détecter risques selon type de changement
        switch (change.type) {
          case 'remove':
            risks.push(...this.analyzeRemovalRisks(change, impact));
            break;
          case 'migrate':
            risks.push(...this.analyzeMigrationRisks(change, impact));
            break;
          case 'refactor':
            risks.push(...this.analyzeRefactoringRisks(change, impact));
            break;
          case 'modify':
            risks.push(...this.analyzeModificationRisks(change, impact));
            break;
          default:
            risks.push(...this.analyzeGenericRisks(change, impact));
        }

        // 3. Calculer risque global
        const overallRisk = this.calculateOverallRisk(risks);
        const riskScore = this.calculateRiskScore(risks);

        // 4. Générer recommandations
        const recommendations = this.generateRiskRecommendations(risks);

        logger.info('Analyse risques terminée', {
          metadata: {
            service: 'AgentRiskAnalyzer',
            operation: 'analyzeChangeRisks',
            changeType: change.type,
            target: change.target,
            risksCount: risks.length,
            overallRisk,
            riskScore
          }
        });

        return {
          risks,
          overallRisk,
          riskScore,
          recommendations
        };
      },
      {
        operation: 'analyzeChangeRisks',
        service: 'AgentRiskAnalyzer',
        metadata: {}
      }
    );
  }

  /**
   * Analyse risques de suppression
   */
  private analyzeRemovalRisks(
    change: { target: string; scope?: string[] },
    impact: { affectedFiles: string[]; riskLevel: string }
  ): Risk[] {
    const risks: Risk[] = [];

    risks.push({
      id: 'risk-removal-breaking',
      type: 'breaking_change',
      severity: 'high',
      probability: 0.7,
      impact: 'high',
      description: `Suppression de ${change.target} peut casser dépendances`,
      affectedAreas: impact.affectedFiles,
      mitigation: [
        'Vérifier toutes les dépendances avant suppression',
        'Créer tests de non-régression',
        'Migration progressive avec période de transition'
      ],
      detection: [
        'Rechercher tous les imports/usages',
        'Exécuter tests complets',
        'Vérifier intégrations externes'
      ]
    });

    return risks;
  }

  /**
   * Analyse risques de migration
   */
  private analyzeMigrationRisks(
    change: { target: string; description: string },
    impact: { affectedFiles: string[]; riskLevel: string }
  ): Risk[] {
    const risks: Risk[] = [];

    risks.push({
      id: 'risk-migration-regression',
      type: 'regression',
      severity: 'high',
      probability: 0.6,
      impact: 'high',
      description: 'Risque de régression fonctionnelle lors migration',
      affectedAreas: impact.affectedFiles,
      mitigation: [
        'Tests exhaustifs avant et après migration',
        'Migration progressive par phases',
        'Checkpoints pour rollback si nécessaire'
      ],
      detection: [
        'Tests unitaires complets',
        'Tests d\'intégration',
        'Tests E2E',
        'Validation manuelle'
      ]
    });

    risks.push({
      id: 'risk-migration-data',
      type: 'data_loss',
      severity: 'critical',
      probability: 0.3,
      impact: 'critical',
      description: 'Risque de perte de données lors migration',
      affectedAreas: [],
      mitigation: [
        'Backup complet avant migration',
        'Validation données après migration',
        'Plan de rollback avec restauration'
      ],
      detection: [
        'Vérification intégrité données',
        'Comparaison avant/après',
        'Tests de non-régression données'
      ]
    });

    return risks;
  }

  /**
   * Analyse risques de refactoring
   */
  private analyzeRefactoringRisks(
    change: { target: string },
    impact: { affectedFiles: string[] }
  ): Risk[] {
    const risks: Risk[] = [];

    risks.push({
      id: 'risk-refactor-behavior',
      type: 'regression',
      severity: 'medium',
      probability: 0.5,
      impact: 'medium',
      description: 'Risque de changement de comportement lors refactoring',
      affectedAreas: impact.affectedFiles,
      mitigation: [
        'Tests exhaustifs avant refactoring',
        'Refactoring par petites étapes',
        'Validation comportement à chaque étape'
      ],
      detection: [
        'Tests unitaires',
        'Tests d\'intégration',
        'Comparaison comportement avant/après'
      ]
    });

    return risks;
  }

  /**
   * Analyse risques de modification
   */
  private analyzeModificationRisks(
    change: { target: string },
    impact: { affectedFiles: string[]; riskLevel: string }
  ): Risk[] {
    const risks: Risk[] = [];

    if (impact.riskLevel === 'high' || impact.riskLevel === 'critical') {
      risks.push({
        id: 'risk-modify-impact',
        type: 'regression',
        severity: impact.riskLevel === 'critical' ? 'high' : 'medium',
        probability: 0.5,
        impact: impact.riskLevel === 'critical' ? 'high' : 'medium',
        description: `Modification de ${change.target} peut impacter ${impact.affectedFiles.length} fichiers`,
        affectedAreas: impact.affectedFiles,
        mitigation: [
          'Analyser impact complet avant modification',
          'Tests de non-régression',
          'Review code approfondi'
        ],
        detection: [
          'Tests unitaires',
          'Tests d\'intégration',
          'Validation fonctionnelle'
        ]
      });
    }

    return risks;
  }

  /**
   * Analyse risques génériques
   */
  private analyzeGenericRisks(
    change: { target: string },
    impact: { affectedFiles: string[] }
  ): Risk[] {
    return [];
  }

  /**
   * Calcule risque global
   */
  private calculateOverallRisk(risks: Risk[]): RiskAnalysis['overallRisk'] {
    const criticalRisks = risks.filter(r => r.severity === 'critical' || r.impact === 'critical');
    const highRisks = risks.filter(r => r.severity === 'high' || r.impact === 'high');

    if (criticalRisks.length > 0) return 'critical';
    if (highRisks.length > 2) return 'high';
    if (highRisks.length > 0 || risks.some(r => r.severity === 'medium' && r.probability > 0.6)) return 'medium';
    return 'low';
  }

  /**
   * Calcule score de risque (0-100)
   */
  private calculateRiskScore(risks: Risk[]): number {
    let score = 0;

    for (const risk of risks) {
      const severityWeight = { critical: 4, high: 3, medium: 2, low: 1 };
      const impactWeight = { critical: 4, high: 3, medium: 2, low: 1 };
      
      const riskValue = severityWeight[risk.severity] * impactWeight[risk.impact] * risk.probability;
      score += riskValue * 5; // Multiplier pour avoir score 0-100
    }

    return Math.min(100, score);
  }

  /**
   * Génère recommandations selon risques
   */
  private generateRiskRecommendations(risks: Risk[]): RiskAnalysis['recommendations'] {
    const recommendations: RiskAnalysis['recommendations'] = [];

    const criticalRisks = risks.filter(r => r.severity === 'critical' || r.impact === 'critical');
    for (const risk of criticalRisks) {
      for (const mitigation of risk.mitigation) {
        recommendations.push({
          priority: 'critical',
          action: mitigation,
          estimatedEffort: 4 // heures
        });
      }
    }

    const highRisks = risks.filter(r => r.severity === 'high' || r.impact === 'high');
    for (const risk of highRisks) {
      recommendations.push({
        priority: 'high',
        action: risk.mitigation[0] || 'Prendre précautions supplémentaires',
        estimatedEffort: 2
      });
    }

    return recommendations;
  }
}

// ========================================
// SINGLETON INSTANCE
// ========================================

let agentRiskAnalyzerInstance: AgentRiskAnalyzer | null = null;

export function getAgentRiskAnalyzer(storage: IStorage): AgentRiskAnalyzer {
  if (!agentRiskAnalyzerInstance) {
    agentRiskAnalyzerInstance = new AgentRiskAnalyzer(storage);
  }
  return agentRiskAnalyzerInstance;
}

