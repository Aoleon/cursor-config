/**
 * RISK ANALYZER SERVICE - Project Risk Analysis
 * 
 * Extracted from PredictiveEngineService to reduce file size.
 * Handles project risk detection and assessment.
 * 
 * Target LOC: ~400-500
 */

import { logger } from '../../utils/logger';
import { withErrorHandling } from '../../utils/error-handler';
import type { IStorage } from '../../storage-poc';
import type { RiskQueryParams, ProjectRiskAssessment, RiskFactor, PreventiveAction } from './types';
import crypto from 'crypto';

export class RiskAnalyzerService {
  constructor(private storage: IStorage) {}

  /**
   * Détecte les risques projet
   */
  async detectProjectRisks(params: RiskQueryParams): Promise<ProjectRiskAssessment[]> {
    return withErrorHandling(
      async () => {
        logger.info('Détection risques projet', {
          metadata: {
            service: 'RiskAnalyzerService',
            operation: 'detectProjectRisks',
            riskLevel: params.risk_level || 'all',
            limit: params.limit || 20
          }
        });

        const projects = await this.storage.getProjects();
        const assessments: ProjectRiskAssessment[] = [];

        for (const project of projects) {
          // Filtrer selon les paramètres
          if (params.project_types && !params.project_types.includes(project.menuiserieType || '')) {
            continue;
          }
          
          if (params.user_ids && project.responsibleUserId && !params.user_ids.includes(project.responsibleUserId)) {
            continue;
          }

          // Analyser les risques
          const riskFactors = await this.analyzeProjectRisks(project);
          const riskScore = this.calculateRiskScore(riskFactors);
          
          // Filtrer selon le niveau de risque
          if (params.risk_level && params.risk_level !== 'all') {
            const riskLevel = this.getRiskLevel(riskScore);
            if (riskLevel !== params.risk_level) {
              continue;
            }
          }

          // Prédire délais et budget
          const predictedDelay = params.include_predictions ? await this.predictDelay(project) : 0;
          const predictedBudgetOverrun = params.include_predictions ? await this.predictBudgetOverrun(project) : 0;

          // Générer actions recommandées
          const recommendedActions = this.generatePreventiveActions(riskFactors, riskScore);

          assessments.push({
            id: crypto.randomUUID(),
            project_id: project.id,
            risk_score: riskScore,
            risk_factors: riskFactors,
            predicted_delay_days: predictedDelay,
            predicted_budget_overrun: predictedBudgetOverrun,
            recommended_actions: recommendedActions,
            assessment_date: new Date().toISOString(),
            next_review_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 jours
          });
        }

        // Trier par score de risque décroissant
        assessments.sort((a, b) => b.risk_score - a.risk_score);

        // Limiter les résultats
        const limited = params.limit ? assessments.slice(0, params.limit) : assessments;

        logger.info('Risques détectés', {
          metadata: {
            service: 'RiskAnalyzerService',
            operation: 'detectProjectRisks',
            assessmentsCount: limited.length
          }
        });

        return limited;
      },
      {
        operation: 'detectProjectRisks',
        service: 'RiskAnalyzerService',
        metadata: { riskLevel: params.risk_level }
      }
    ) || [];
  }

  /**
   * Analyse les risques d'un projet
   */
  private async analyzeProjectRisks(project: any): Promise<RiskFactor[]> {
    const factors: RiskFactor[] = [];

    // Risque de complexité
    if (project.complexity && project.complexity > 7) {
      factors.push({
        type: 'complexity',
        description: `Projet de haute complexité (score: ${project.complexity})`,
        impact_score: 70,
        likelihood: 80,
        mitigation_suggested: 'Allouer plus de ressources BE et planifier des revues techniques régulières'
      });
    }

    // Risque de charge équipe
    // TODO: Analyser charge équipe réelle
    factors.push({
      type: 'team_load',
      description: 'Charge équipe à vérifier',
      impact_score: 50,
      likelihood: 60,
      mitigation_suggested: 'Répartir la charge sur plusieurs équipes'
    });

    // Risque historique de retard
    // TODO: Analyser historique projets similaires
    factors.push({
      type: 'historical_delay',
      description: 'Projets similaires ont souvent des retards',
      impact_score: 60,
      likelihood: 70,
      mitigation_suggested: 'Ajouter buffer de 15% sur délais'
    });

    return factors;
  }

  /**
   * Calcule le score de risque global
   */
  private calculateRiskScore(factors: RiskFactor[]): number {
    if (factors.length === 0) return 0;

    const weightedSum = factors.reduce((sum, factor) => {
      return sum + (factor.impact_score * factor.likelihood) / 100;
    }, 0);

    return Math.min(100, Math.round(weightedSum / factors.length));
  }

  /**
   * Obtient le niveau de risque
   */
  private getRiskLevel(score: number): 'low' | 'medium' | 'high' {
    if (score < 40) return 'low';
    if (score < 70) return 'medium';
    return 'high';
  }

  /**
   * Prédit le retard en jours
   */
  private async predictDelay(project: any): Promise<number> {
    // Implémentation simplifiée
    const baseDelay = 5; // Retard de base
    const complexityMultiplier = (project.complexity || 5) / 10;
    return Math.round(baseDelay * (1 + complexityMultiplier));
  }

  /**
   * Prédit le dépassement budgétaire
   */
  private async predictBudgetOverrun(project: any): Promise<number> {
    // Implémentation simplifiée
    return 10; // 10% de dépassement estimé
  }

  /**
   * Génère des actions préventives
   */
  private generatePreventiveActions(factors: RiskFactor[], riskScore: number): PreventiveAction[] {
    const actions: PreventiveAction[] = [];

    if (riskScore > 70) {
      actions.push({
        type: 'escalation',
        description: 'Escalader vers management pour suivi renforcé',
        urgency: 'high',
        estimated_effort_hours: 2,
        expected_risk_reduction: 20
      });
    }

    if (factors.some(f => f.type === 'team_load')) {
      actions.push({
        type: 'resource_adjustment',
        description: 'Ajuster allocation ressources équipe',
        urgency: 'medium',
        estimated_effort_hours: 4,
        expected_risk_reduction: 15
      });
    }

    if (factors.some(f => f.type === 'historical_delay')) {
      actions.push({
        type: 'timeline_extension',
        description: 'Ajouter buffer temporel au planning',
        urgency: 'medium',
        estimated_effort_hours: 1,
        expected_risk_reduction: 10
      });
    }

    return actions;
  }
}

