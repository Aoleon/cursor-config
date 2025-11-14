/**
 * RECOMMENDATION SERVICE - Business Recommendations
 * 
 * Extracted from PredictiveEngineService to reduce file size.
 * Handles business recommendation generation.
 * 
 * Target LOC: ~400-500
 */

import { logger } from '../../utils/logger';
import { withErrorHandling } from '../../utils/error-handler';
import type { IStorage } from '../../storage-poc';
import type { BusinessContext, BusinessRecommendation } from './types';
import crypto from 'crypto';

export class RecommendationService {
  constructor(private storage: IStorage) {}

  /**
   * Génère des recommandations business
   */
  async generateRecommendations(context: BusinessContext): Promise<BusinessRecommendation[]> {
    return withErrorHandling(
      async () => {
        logger.info('Génération recommandations business', {
          metadata: {
            service: 'RecommendationService',
            operation: 'generateRecommendations',
            focusAreas: context.focus_areas || []
          }
        });

        const recommendations: BusinessRecommendation[] = [];

        // Récupérer KPIs actuels
        const currentKPIs = await this.getCurrentKPIs(context.analysis_period);
        const benchmarks = await this.getSectorBenchmarks();

        // Générer recommandations par domaine
        if (!context.focus_areas || context.focus_areas.includes('revenue')) {
          const revenueRecs = await this.generateRevenueRecommendations(currentKPIs, benchmarks);
          recommendations.push(...revenueRecs);
        }

        if (!context.focus_areas || context.focus_areas.includes('costs')) {
          const costRecs = await this.generateCostOptimizationRecommendations(currentKPIs, benchmarks);
          recommendations.push(...costRecs);
        }

        if (!context.focus_areas || context.focus_areas.includes('planning')) {
          const planningRecs = await this.generatePlanningRecommendations(context);
          recommendations.push(...planningRecs);
        }

        if (!context.focus_areas || context.focus_areas.includes('quality')) {
          const qualityRecs = await this.generateQualityRecommendations(currentKPIs);
          recommendations.push(...qualityRecs);
        }

        // Trier par priorité
        recommendations.sort((a, b) => {
          const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        });

        logger.info('Recommandations générées', {
          metadata: {
            service: 'RecommendationService',
            operation: 'generateRecommendations',
            recommendationsCount: recommendations.length
          }
        });

        return recommendations;
      },
      {
        operation: 'generateRecommendations',
        service: 'RecommendationService',
        metadata: {}
      }
    ) || [];
  }

  /**
   * Récupère les KPIs actuels
   */
  private async getCurrentKPIs(period: { start: string; end: string }): Promise<Record<string, number>> {
    try {
      const projects = await this.storage.getProjects();
      const offers = await this.storage.getOffers();
      
      return {
        total_revenue: projects.reduce((sum, p) => sum + (parseFloat(p.montantFinal || '0')), 0),
        total_offers: offers.length,
        conversion_rate: offers.length > 0 ? (projects.length / offers.length) * 100 : 0,
        avg_project_value: projects.length > 0 ? projects.reduce((sum, p) => sum + (parseFloat(p.montantFinal || '0')), 0) / projects.length : 0
      };
    } catch (error) {
      logger.error('[RecommendationService] Erreur récupération KPIs', {
        metadata: {
          service: 'RecommendationService',
          operation: 'getCurrentKPIs',
          error: error instanceof Error ? error.message : String(error)
        }
      });
      return {};
    }
  }

  /**
   * Récupère les benchmarks secteur
   */
  private async getSectorBenchmarks(): Promise<Record<string, number>> {
    // Benchmarks simplifiés pour menuiserie BTP
    return {
      avg_conversion_rate: 35, // 35% AO → Projet
      avg_margin: 25, // 25% marge moyenne
      avg_project_duration_days: 120
    };
  }

  /**
   * Génère recommandations revenus
   */
  private async generateRevenueRecommendations(
    kpis: Record<string, number>,
    benchmarks: Record<string, number>
  ): Promise<BusinessRecommendation[]> {
    const recommendations: BusinessRecommendation[] = [];

    if (kpis.conversion_rate && kpis.conversion_rate < benchmarks.avg_conversion_rate) {
      recommendations.push({
        id: crypto.randomUUID(),
        category: 'revenue',
        title: 'Améliorer le taux de conversion AO → Projet',
        description: `Le taux de conversion actuel (${kpis.conversion_rate.toFixed(1)}%) est inférieur à la moyenne secteur (${benchmarks.avg_conversion_rate}%)`,
        rationale: 'Améliorer la qualité des offres et le suivi commercial',
        priority: 'high',
        estimated_impact: {
          revenue_increase: 50000, // Estimation
          quality_improvement: 15
        },
        implementation: {
          effort_estimate_hours: 40,
          required_resources: ['commercial', 'chef_projet'],
          timeline_weeks: 8,
          success_metrics: ['Taux conversion > 40%', 'Temps réponse AO < 48h']
        },
        generated_date: new Date().toISOString()
      });
    }

    return recommendations;
  }

  /**
   * Génère recommandations optimisation coûts
   */
  private async generateCostOptimizationRecommendations(
    kpis: Record<string, number>,
    benchmarks: Record<string, number>
  ): Promise<BusinessRecommendation[]> {
    const recommendations: BusinessRecommendation[] = [];

    recommendations.push({
      id: crypto.randomUUID(),
      category: 'costs',
      title: 'Optimiser les délais de projet',
      description: 'Réduire les retards pour diminuer les coûts indirects',
      rationale: 'Les retards génèrent des coûts supplémentaires',
      priority: 'medium',
      estimated_impact: {
        cost_reduction: 20000,
        time_savings: 100
      },
      implementation: {
        effort_estimate_hours: 60,
        required_resources: ['chef_projet', 'be_manager'],
        timeline_weeks: 12,
        success_metrics: ['Réduction retards de 20%', 'Amélioration planning']
      },
      generated_date: new Date().toISOString()
    });

    return recommendations;
  }

  /**
   * Génère recommandations planning
   */
  private async generatePlanningRecommendations(context: BusinessContext): Promise<BusinessRecommendation[]> {
    const recommendations: BusinessRecommendation[] = [];

    recommendations.push({
      id: crypto.randomUUID(),
      category: 'planning',
      title: 'Améliorer la planification des ressources',
      description: 'Optimiser l\'allocation des ressources BE selon la charge',
      rationale: 'Équilibrage de la charge améliore la productivité',
      priority: 'medium',
      estimated_impact: {
        time_savings: 80,
        quality_improvement: 10
      },
      implementation: {
        effort_estimate_hours: 30,
        required_resources: ['be_manager'],
        timeline_weeks: 6,
        success_metrics: ['Charge équilibrée', 'Réduction surcharge']
      },
      generated_date: new Date().toISOString()
    });

    return recommendations;
  }

  /**
   * Génère recommandations qualité
   */
  private async generateQualityRecommendations(kpis: Record<string, number>): Promise<BusinessRecommendation[]> {
    const recommendations: BusinessRecommendation[] = [];

    recommendations.push({
      id: crypto.randomUUID(),
      category: 'quality',
      title: 'Renforcer les contrôles qualité',
      description: 'Mettre en place des revues qualité systématiques',
      rationale: 'Améliorer la qualité réduit les retours et SAV',
      priority: 'medium',
      estimated_impact: {
        quality_improvement: 20,
        cost_reduction: 15000
      },
      implementation: {
        effort_estimate_hours: 40,
        required_resources: ['be_manager', 'chef_projet'],
        timeline_weeks: 10,
        success_metrics: ['Taux défauts < 5%', 'Réduction SAV']
      },
      generated_date: new Date().toISOString()
    });

    return recommendations;
  }
}

