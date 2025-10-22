import { IStorage, DateRange, MetricFilters } from "../storage-poc";
import { EventBus } from "../eventBus";
import type { 
  KpiSnapshot, InsertKpiSnapshot,
  BusinessMetric, InsertBusinessMetric,
  PerformanceBenchmark, InsertPerformanceBenchmark
} from "@shared/schema";
import { projectStatusEnum } from "@shared/schema";

type ProjectStatus = typeof projectStatusEnum.enumValues[number];
import { logger } from '../utils/logger';

// ========================================
// TYPES ET INTERFACES ANALYTICS MÉTIER
// ========================================

export interface BusinessFilters {
  userId?: string;
  departement?: string;
  projectType?: string;
  materialType?: string;
  complexityLevel?: string;
}

export interface ConversionMetric {
  rate: number;
  totalInput: number;
  totalOutput: number;
  trend: number; // % changement vs période précédente
  byUser?: Record<string, { rate: number; inputCount: number; outputCount: number }>;
  byDepartment?: Record<string, number>;
}

export interface PipelineMetric {
  aoToOffer: number;
  offerToProject: number;
  globalConversion: number;
  bottleneckPhase: string;
  trends: {
    aoToOfferTrend: number;
    offerToProjectTrend: number;
  };
}

export interface DelayMetric {
  average: number;
  median: number;
  total: number;
  criticalCount: number;
  byPhase?: Record<ProjectStatus, number>;
  byUser?: Record<string, number>;
  trend: number;
}

export interface DelayedProjectMetric {
  projectId: string;
  projectName: string;
  phase: ProjectStatus;
  delayDays: number;
  impactFinancier: number;
  urgencyScore: number;
  responsibleUserId?: string;
}

export interface TeamDelayMetric {
  userId: string;
  userName: string;
  averageDelay: number;
  onTimePercentage: number;
  totalProjects: number;
  performanceScore: number;
}

export interface RevenueForecast {
  amount: number;
  confidence: number;
  byCategory: Record<string, number>;
  byMonth: Array<{ month: string; forecast: number; probability: number }>;
  riskFactors: string[];
}

export interface CategoryRevenueMetric {
  category: string;
  revenue: number;
  growth: number;
  marketShare: number;
  profitability: number;
}

export interface MarginAnalysisMetric {
  average: number;
  median: number;
  byCategory: Record<string, number>;
  trending: number;
  recommendations: string[];
}

export interface TeamLoadMetric {
  userId: string;
  userName: string;
  loadPercentage: number;
  hoursAssigned: number;
  capacityHours: number;
  efficiency: number;
  status: 'underloaded' | 'optimal' | 'overloaded' | 'critical';
}

export interface TeamEfficiencyMetric {
  userId: string;
  userName: string;
  efficiency: number;
  deliveredOnTime: number;
  qualityScore: number;
  collaborationScore: number;
}

export interface PlanningOptimizationSuggestion {
  type: 'rebalance' | 'hire' | 'delay' | 'prioritize';
  description: string;
  impact: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  estimatedBenefit: number;
}

export interface RealtimeKPIs {
  conversionRate: number;
  forecastRevenue: number;
  teamLoadAvg: number;
  delayedProjectsCount: number;
  alertsCount: number;
  lastUpdated: Date;
}

export interface BenchmarkEntity {
  type: 'user' | 'department' | 'category';
  id: string;
}

// ========================================
// CALCULATEURS SPÉCIALISÉS MÉTIER
// ========================================

class ConversionCalculator {
  constructor(private storage: IStorage) {}

  async calculateAOToOfferConversion(
    period: DateRange, 
    filters?: BusinessFilters,
    disableTrend: boolean = false
  ): Promise<ConversionMetric> {
    try {
      // OPTIMISATION: Utiliser SQL aggregation au lieu de charger 375 objets
      logger.debug('[AnalyticsService] calculateAOToOfferConversion - Using SQL aggregation', {
        metadata: { period, filters }
      });

      const conversionStats = await this.storage.getConversionStats(
        {
          from: period.from.toISOString(),
          to: period.to.toISOString()
        },
        {
          departement: filters?.departement,
          userId: filters?.userId
        }
      );

      const rate = conversionStats.aoToOffer.conversionRate;
      const totalInput = conversionStats.aoToOffer.totalAOs;
      const totalOutput = conversionStats.aoToOffer.totalOffersCreated;

      // Build byUser from conversion stats
      const byUser: Record<string, { rate: number; inputCount: number; outputCount: number }> = {};
      if (conversionStats.aoToOffer.byUser) {
        for (const [userId, stats] of Object.entries(conversionStats.aoToOffer.byUser)) {
          byUser[userId] = {
            rate: stats.rate,
            inputCount: stats.aos,
            outputCount: stats.offers
          };
        }
      }

      // Calculer tendance (période précédente) avec protection anti-récursion
      let trend = 0;
      if (!disableTrend) {
        const previousPeriod = {
          from: new Date(period.from.getTime() - (period.to.getTime() - period.from.getTime())),
          to: period.from
        };
        const previousMetric = await this.calculateAOToOfferConversion(previousPeriod, filters, true);
        trend = previousMetric.rate > 0 ? ((rate - previousMetric.rate) / previousMetric.rate) * 100 : 0;
      }

      return {
        rate,
        totalInput,
        totalOutput,
        trend,
        byUser: Object.keys(byUser).length > 0 ? byUser : undefined
      };

    } catch (error) {
      logger.error('Erreur calcul conversion AO->Offre', {
        metadata: {
          service: 'AnalyticsService',
          operation: 'calculateAOToQuoteConversion',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      return {
        rate: 0,
        totalInput: 0,
        totalOutput: 0,
        trend: 0
      };
    }
  }

  async calculateOfferToProjectConversion(
    period: DateRange, 
    filters?: BusinessFilters,
    disableTrend: boolean = false
  ): Promise<ConversionMetric> {
    try {
      // OPTIMISATION: Utiliser SQL aggregation au lieu de charger 375 objets
      logger.debug('[AnalyticsService] calculateOfferToProjectConversion - Using SQL aggregation', {
        metadata: { period, filters }
      });

      const conversionStats = await this.storage.getConversionStats(
        {
          from: period.from.toISOString(),
          to: period.to.toISOString()
        },
        {
          userId: filters?.userId,
          departement: filters?.departement
        }
      );

      const rate = conversionStats.offerToProject.conversionRate;
      const totalInput = conversionStats.offerToProject.totalOffers;
      const totalOutput = conversionStats.offerToProject.totalSignedOffers;

      // Build byUser from conversion stats
      const byUser: Record<string, { rate: number; inputCount: number; outputCount: number }> = {};
      if (conversionStats.offerToProject.byUser) {
        for (const [userId, stats] of Object.entries(conversionStats.offerToProject.byUser)) {
          byUser[userId] = {
            rate: stats.rate,
            inputCount: stats.offers,
            outputCount: stats.signed
          };
        }
      }

      // Calcul tendance avec protection anti-récursion
      let trend = 0;
      if (!disableTrend) {
        const previousPeriod = {
          from: new Date(period.from.getTime() - (period.to.getTime() - period.from.getTime())),
          to: period.from
        };
        const previousMetric = await this.calculateOfferToProjectConversion(previousPeriod, filters, true);
        trend = previousMetric.rate > 0 ? ((rate - previousMetric.rate) / previousMetric.rate) * 100 : 0;
      }

      return {
        rate,
        totalInput,
        totalOutput,
        trend,
        byUser: Object.keys(byUser).length > 0 ? byUser : undefined
      };

    } catch (error) {
      logger.error('Erreur calcul conversion Offre->Projet', {
        metadata: {
          service: 'AnalyticsService',
          operation: 'calculateQuoteToProjectConversion',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      return {
        rate: 0,
        totalInput: 0,
        totalOutput: 0,
        trend: 0
      };
    }
  }

  async calculatePipelineConversion(period: DateRange): Promise<PipelineMetric> {
    try {
      const [aoToOffer, offerToProject] = await Promise.all([
        this.calculateAOToOfferConversion(period),
        this.calculateOfferToProjectConversion(period)
      ]);

      const globalConversion = (aoToOffer.rate * offerToProject.rate) / 100;
      
      // Identifier goulot d'étranglement
      const bottleneckPhase = aoToOffer.rate < offerToProject.rate ? 'ao_to_offer' : 'offer_to_project';

      return {
        aoToOffer: aoToOffer.rate,
        offerToProject: offerToProject.rate,
        globalConversion,
        bottleneckPhase,
        trends: {
          aoToOfferTrend: aoToOffer.trend,
          offerToProjectTrend: offerToProject.trend
        }
      };

    } catch (error) {
      logger.error('Erreur calcul pipeline conversion', {
        metadata: {
          service: 'AnalyticsService',
          operation: 'calculatePipelineConversion',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      return {
        aoToOffer: 0,
        offerToProject: 0,
        globalConversion: 0,
        bottleneckPhase: 'unknown',
        trends: {
          aoToOfferTrend: 0,
          offerToProjectTrend: 0
        }
      };
    }
  }
}

class DelayCalculator {
  constructor(private storage: IStorage) {}

  async calculateAverageDelays(
    period: DateRange, 
    groupBy: 'phase' | 'user' | 'projectType'
  ): Promise<DelayMetric> {
    try {
      // OPTIMISATION: Utiliser SQL aggregation au lieu de charger tous les projets
      logger.debug('[AnalyticsService] calculateAverageDelays - Using SQL aggregation', {
        metadata: { period, groupBy }
      });

      const delayStats = await this.storage.getProjectDelayStats({
        from: period.from.toISOString(),
        to: period.to.toISOString()
      });

      // Extract grouped data
      const byPhase: Record<ProjectStatus, number> = {} as any;
      const byUser: Record<string, number> = {};

      if (groupBy === 'phase' && delayStats.byPhase) {
        for (const [phase, stats] of Object.entries(delayStats.byPhase)) {
          byPhase[phase as ProjectStatus] = stats.avgDelay;
        }
      }

      // For user grouping, we'll need to fetch team performance stats instead
      if (groupBy === 'user') {
        const teamStats = await this.storage.getTeamPerformanceStats({
          from: period.from.toISOString(),
          to: period.to.toISOString()
        });
        
        for (const userStat of teamStats) {
          byUser[userStat.userId] = userStat.avgDelayDays;
        }
      }

      // Calcul tendance
      const previousPeriod = {
        from: new Date(period.from.getTime() - (period.to.getTime() - period.from.getTime())),
        to: period.from
      };
      const previousMetric = await this.calculateAverageDelays(previousPeriod, groupBy);
      const trend = previousMetric.average > 0 ? 
        ((delayStats.avgDelayDays - previousMetric.average) / previousMetric.average) * 100 : 0;

      return {
        average: delayStats.avgDelayDays,
        median: delayStats.medianDelayDays,
        total: delayStats.totalDelayed * delayStats.avgDelayDays, // Approximation
        criticalCount: delayStats.criticalDelayed,
        byPhase: Object.keys(byPhase).length > 0 ? byPhase : undefined,
        byUser: Object.keys(byUser).length > 0 ? byUser : undefined,
        trend
      };

    } catch (error) {
      logger.error('Erreur calcul délais moyens', {
        metadata: {
          service: 'AnalyticsService',
          operation: 'calculateAverageDelays',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      return {
        average: 0,
        median: 0,
        total: 0,
        criticalCount: 0,
        trend: 0
      };
    }
  }

  async calculateDelayedProjects(severity: 'minor' | 'major' | 'critical'): Promise<DelayedProjectMetric[]> {
    try {
      const timelines = await this.storage.getAllProjectTimelines();
      const projects = await this.storage.getProjects();
      const delayedProjects: DelayedProjectMetric[] = [];

      // Seuils selon sévérité
      const thresholds = {
        minor: 3,    // 3 jours
        major: 7,    // 1 semaine  
        critical: 14 // 2 semaines
      };

      const minDelay = thresholds[severity];

      for (const timeline of timelines) {
        if (timeline.plannedEndDate) {
          const plannedEnd = new Date(timeline.plannedEndDate);
          const now = new Date();
          const actualEnd = timeline.actualEndDate ? new Date(timeline.actualEndDate) : now;
          
          const delayDays = Math.max(0, (actualEnd.getTime() - plannedEnd.getTime()) / (1000 * 60 * 60 * 24));
          
          if (delayDays >= minDelay) {
            const project = projects.find(p => p.id === timeline.projectId);
            if (project) {
              // Calcul impact financier approximatif
              const dailyCost = 500; // Coût journalier moyen estimé
              const impactFinancier = delayDays * dailyCost;
              
              // Score d'urgence basé sur délai et impact
              const urgencyScore = Math.min(100, (delayDays / 30) * 50 + (impactFinancier / 10000) * 50);

              delayedProjects.push({
                projectId: project.id,
                projectName: project.name,
                phase: timeline.phase,
                delayDays,
                impactFinancier,
                urgencyScore,
                responsibleUserId: project.responsibleUserId || undefined
              });
            }
          }
        }
      }

      // Trier par score d'urgence décroissant
      return delayedProjects.sort((a, b) => b.urgencyScore - a.urgencyScore);

    } catch (error) {
      logger.error('Erreur calcul projets en retard', {
        metadata: {
          service: 'AnalyticsService',
          operation: 'calculateDelayedProjects',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      return [];
    }
  }

  async calculateTeamDelayPerformance(period: DateRange): Promise<TeamDelayMetric[]> {
    try {
      const users = await this.storage.getUsers();
      const projects = await this.storage.getProjects();
      const timelines = await this.storage.getAllProjectTimelines();
      
      const teamMetrics: TeamDelayMetric[] = [];

      for (const user of users) {
        // Projets de l'utilisateur dans la période
        const userProjects = projects.filter(p => 
          p.responsibleUserId === user.id && 
          p.createdAt && 
          new Date(p.createdAt) >= period.from && 
          new Date(p.createdAt) <= period.to
        );

        if (userProjects.length === 0) continue;

        // Timelines associées
        const userTimelines = timelines.filter(t => 
          userProjects.some(p => p.id === t.projectId) && 
          t.plannedEndDate && t.actualEndDate
        );

        if (userTimelines.length === 0) continue;

        // Calcul des délais
        const delays = userTimelines.map(t => {
          const planned = new Date(t.plannedEndDate!);
          const actual = new Date(t.actualEndDate!);
          return Math.max(0, (actual.getTime() - planned.getTime()) / (1000 * 60 * 60 * 24));
        });

        const averageDelay = delays.reduce((a, b) => a + b, 0) / delays.length;
        const onTimeCount = delays.filter(d => d <= 1).length; // <= 1 jour = à temps
        const onTimePercentage = (onTimeCount / delays.length) * 100;
        
        // Score de performance (0-100)
        const performanceScore = Math.max(0, 100 - (averageDelay * 5) - ((100 - onTimePercentage) * 0.5));

        teamMetrics.push({
          userId: user.id,
          userName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Unknown',
          averageDelay,
          onTimePercentage,
          totalProjects: userProjects.length,
          performanceScore
        });
      }

      // Trier par score décroissant
      return teamMetrics.sort((a, b) => b.performanceScore - a.performanceScore);

    } catch (error) {
      logger.error('Erreur calcul performance délais équipes', {
        metadata: {
          service: 'AnalyticsService',
          operation: 'calculateTeamDelayPerformance',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      return [];
    }
  }
}

class RevenueCalculator {
  constructor(private storage: IStorage) {}

  async calculateRevenueForecast(
    period: DateRange, 
    confidence: number = 0.8
  ): Promise<RevenueForecast> {
    try {
      // OPTIMISATION: Utiliser SQL aggregations au lieu de charger tous les objets
      logger.debug('[AnalyticsService] calculateRevenueForecast - Using SQL aggregation');
      
      const offerStats = await this.storage.getOfferStats({
        dateFrom: period.from.toISOString(),
        dateTo: period.to.toISOString()
      });

      // Get active offers by status (pipeline revenue)
      const activeStatuses = ['en_cours_chiffrage', 'en_attente_validation', 'valide'];
      let totalActiveAmount = 0;
      for (const status of activeStatuses) {
        if (offerStats.byStatus[status]) {
          totalActiveAmount += offerStats.byStatus[status].totalAmount;
        }
      }

      // For detailed breakdown, we still need individual offers but filter by status
      // This is acceptable as it's much less than loading ALL offers
      const activeOffers = await this.storage.getOffersPaginated({
        limit: 1000,
        offset: 0,
        filters: {
          status: 'en_cours_chiffrage' // Primary active status
        }
      }).then(result => result.offers);

      // Probabilités de conversion par statut
      const conversionProbabilities: Record<string, number> = {
        'en_cours_chiffrage': 0.3,
        'en_attente_validation': 0.6,
        'valide': 0.8,
        'signe': 1.0
      };

      // Calcul forecast
      let totalForecast = 0;
      const byCategory: Record<string, number> = {};
      const byMonth: Array<{ month: string; forecast: number; probability: number }> = [];

      for (const offer of activeOffers) {
        const probability = conversionProbabilities[offer.status || 'en_cours_chiffrage'] || 0;
        const amount = offer.montantFinalHT ? parseFloat(offer.montantFinalHT.toString()) : 
                     (offer.montantEstime ? parseFloat(offer.montantEstime.toString()) : 0);
        
        const forecastAmount = amount * probability;
        totalForecast += forecastAmount;

        // Par catégorie
        const category = offer.menuiserieType || 'unknown';
        if (!byCategory[category]) {
          byCategory[category] = 0;
        }
        byCategory[category] += forecastAmount;
      }

      // Projets signés (revenus confirmés)
      const signedProjects = projects.filter(project => {
        const createdAt = new Date(project.createdAt || 0);
        return createdAt >= period.from && createdAt <= period.to;
      });

      for (const project of signedProjects) {
        const amount = project.budget ? parseFloat(project.budget.toString()) : 0;
        totalForecast += amount;
      }

      // Analyse mensuelle
      const monthsInPeriod = Math.ceil((period.to.getTime() - period.from.getTime()) / (1000 * 60 * 60 * 24 * 30));
      const monthlyForecast = totalForecast / Math.max(1, monthsInPeriod);

      for (let i = 0; i < monthsInPeriod; i++) {
        const monthDate = new Date(period.from);
        monthDate.setMonth(monthDate.getMonth() + i);
        byMonth.push({
          month: monthDate.toISOString().substring(0, 7), // YYYY-MM
          forecast: monthlyForecast,
          probability: confidence
        });
      }

      // Facteurs de risque
      const riskFactors: string[] = [];
      if (activeOffers.length < 5) {
        riskFactors.push("Pipeline faible - moins de 5 offres actives");
      }
      if (confidence < 0.7) {
        riskFactors.push("Confiance faible dans les prévisions");
      }

      return {
        amount: totalForecast,
        confidence,
        byCategory,
        byMonth,
        riskFactors
      };

    } catch (error) {
      logger.error('Erreur calcul forecast revenus', {
        metadata: {
          service: 'AnalyticsService',
          operation: 'forecastRevenue',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      return {
        amount: 0,
        confidence: 0,
        byCategory: {},
        byMonth: [],
        riskFactors: ['Erreur de calcul']
      };
    }
  }

  async calculateRevenueByCategory(period: DateRange): Promise<CategoryRevenueMetric[]> {
    try {
      const projects = await this.storage.getProjects();
      const offers = await this.storage.getOffers();

      // Projets complétés dans la période
      const completedProjects = projects.filter(project => {
        const createdAt = new Date(project.createdAt || 0);
        return createdAt >= period.from && createdAt <= period.to && project.budget;
      });

      // Grouper par catégorie
      const categoryData: Record<string, { revenue: number; count: number }> = {};
      let totalRevenue = 0;

      for (const project of completedProjects) {
        const offer = offers.find(o => o.id === project.offerId);
        const category = offer?.menuiserieType || 'autres';
        const revenue = parseFloat(project.budget?.toString() || '0');

        if (!categoryData[category]) {
          categoryData[category] = { revenue: 0, count: 0 };
        }
        categoryData[category].revenue += revenue;
        categoryData[category].count++;
        totalRevenue += revenue;
      }

      // Calcul métriques par catégorie
      const result: CategoryRevenueMetric[] = [];

      for (const [category, data] of Object.entries(categoryData)) {
        const marketShare = totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0;
        
        // Calcul croissance (période précédente)
        const previousPeriod = {
          from: new Date(period.from.getTime() - (period.to.getTime() - period.from.getTime())),
          to: period.from
        };
        const previousMetrics = await this.calculateRevenueByCategory(previousPeriod);
        const previousCategory = previousMetrics.find(m => m.category === category);
        const growth = previousCategory ? 
          ((data.revenue - previousCategory.revenue) / previousCategory.revenue) * 100 : 0;

        // Profitabilité estimée (simplified)
        const profitability = 25; // 25% marge moyenne estimée

        result.push({
          category,
          revenue: data.revenue,
          growth,
          marketShare,
          profitability
        });
      }

      return result.sort((a, b) => b.revenue - a.revenue);

    } catch (error) {
      logger.error('Erreur calcul revenus par catégorie', {
        metadata: {
          service: 'AnalyticsService',
          operation: 'calculateRevenueByCategoryDetailed',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      return [];
    }
  }

  async calculateMarginAnalysis(period: DateRange): Promise<MarginAnalysisMetric> {
    try {
      // OPTIMISATION: Utiliser SQL aggregations au lieu de charger tous les objets
      logger.debug('[AnalyticsService] calculateMarginAnalysis - Using SQL aggregation');
      
      const [projectStats, offerStats] = await Promise.all([
        this.storage.getProjectStats({
          dateFrom: period.from.toISOString(),
          dateTo: period.to.toISOString()
        }),
        this.storage.getOfferStats({
          dateFrom: period.from.toISOString(),
          dateTo: period.to.toISOString()
        })
      ]);

      if (projectStats.totalCount === 0) {
        return {
          average: 0,
          median: 0,
          byCategory: {},
          trending: 0,
          recommendations: ['Aucune donnée disponible pour la période']
        };
      }

      // Calcul marges simplifiées basées sur agrégats
      // Utilise une estimation de coût standard de 75% du CA pour une marge de 25%
      const estimatedMarginRate = 25; // 25% de marge standard
      const average = estimatedMarginRate;
      const median = estimatedMarginRate;

      // Marges par catégorie basées sur les stats d'offres
      const byCategory: Record<string, number> = {};
      for (const [status, stats] of Object.entries(offerStats.byStatus)) {
        if (stats.count > 0) {
          // Estimation de marge basée sur le statut
          const marginByStatus: Record<string, number> = {
            'signe': 28,           // Projets signés ont généralement meilleures marges
            'valide': 25,          // Marge standard
            'en_attente_validation': 24,
            'en_cours_chiffrage': 23,
            'brouillon': 22
          };
          byCategory[status] = marginByStatus[status] || estimatedMarginRate;
        }
      }

      // Tendance
      const previousPeriod = {
        from: new Date(period.from.getTime() - (period.to.getTime() - period.from.getTime())),
        to: period.from
      };
      const previousAnalysis = await this.calculateMarginAnalysis(previousPeriod);
      const trending = previousAnalysis.average > 0 ? 
        ((average - previousAnalysis.average) / previousAnalysis.average) * 100 : 0;

      // Recommandations
      const recommendations: string[] = [];
      if (average < 20) {
        recommendations.push("Marges faibles - revoir la stratégie de pricing");
      }
      if (trending < -5) {
        recommendations.push("Tendance baissière des marges - optimiser les coûts");
      }
      
      // Identifier catégorie la plus profitable
      const bestCategory = Object.entries(byCategory)
        .sort(([,a], [,b]) => b - a)[0];
      if (bestCategory) {
        recommendations.push(`Focus sur ${bestCategory[0]} (marge: ${bestCategory[1].toFixed(1)}%)`);
      }

      return {
        average,
        median,
        byCategory,
        trending,
        recommendations
      };

    } catch (error) {
      logger.error('Erreur analyse marges', {
        metadata: {
          service: 'AnalyticsService',
          operation: 'analyzeMargins',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      return {
        average: 0,
        median: 0,
        byCategory: {},
        trending: 0,
        recommendations: ['Erreur dans le calcul des marges']
      };
    }
  }
}

class TeamLoadCalculator {
  constructor(private storage: IStorage) {}

  async calculateTeamLoad(period: DateRange): Promise<TeamLoadMetric[]> {
    try {
      const users = await this.storage.getUsers();
      const beWorkload = await this.storage.getBeWorkload();
      const teamResources = await this.storage.getTeamResources();
      
      const teamMetrics: TeamLoadMetric[] = [];
      const standardCapacity = 35; // 35h/semaine standard

      for (const user of users) {
        // Récupérer charge BE pour l'utilisateur
        const userWorkload = beWorkload.filter(w => w.userId === user.id);
        const userResources = teamResources.filter(r => r.userId === user.id);

        // Calcul heures assignées
        let totalAssignedHours = 0;
        for (const workload of userWorkload) {
          totalAssignedHours += parseFloat(workload.plannedHours?.toString() || '0');
        }
        for (const resource of userResources) {
          // Estimate hours from date range if available
          if (resource.startDate && resource.endDate) {
            const days = Math.ceil((new Date(resource.endDate).getTime() - new Date(resource.startDate).getTime()) / (1000 * 60 * 60 * 24));
            totalAssignedHours += (days * 7); // Assume 7 hours per day
          }
        }

        // Capacité théorique (en semaines dans la période)
        const weeksInPeriod = Math.ceil((period.to.getTime() - period.from.getTime()) / (1000 * 60 * 60 * 24 * 7));
        const capacityHours = weeksInPeriod * standardCapacity;

        // Calcul pourcentage de charge
        const loadPercentage = capacityHours > 0 ? (totalAssignedHours / capacityHours) * 100 : 0;

        // Efficacité (ratio heures réalisées / planifiées)
        let totalPlannedHours = 0;
        let totalActualHours = 0;
        for (const workload of userWorkload) {
          totalPlannedHours += parseFloat(workload.plannedHours?.toString() || '0');
          totalActualHours += parseFloat(workload.actualHours?.toString() || '0');
        }
        const efficiency = totalPlannedHours > 0 ? (totalActualHours / totalPlannedHours) * 100 : 100;

        // Statut de charge
        let status: 'underloaded' | 'optimal' | 'overloaded' | 'critical';
        if (loadPercentage < 70) {
          status = 'underloaded';
        } else if (loadPercentage <= 100) {
          status = 'optimal';
        } else if (loadPercentage <= 120) {
          status = 'overloaded';
        } else {
          status = 'critical';
        }

        teamMetrics.push({
          userId: user.id,
          userName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Unknown',
          loadPercentage,
          hoursAssigned: totalAssignedHours,
          capacityHours,
          efficiency,
          status
        });
      }

      return teamMetrics.sort((a, b) => b.loadPercentage - a.loadPercentage);

    } catch (error) {
      logger.error('Erreur calcul charge équipes', {
        metadata: {
          service: 'AnalyticsService',
          operation: 'calculateTeamWorkload',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      return [];
    }
  }

  async calculateTeamEfficiency(period: DateRange): Promise<TeamEfficiencyMetric[]> {
    try {
      const users = await this.storage.getUsers();
      const projects = await this.storage.getProjects();
      const timelines = await this.storage.getAllProjectTimelines();
      
      const efficiencyMetrics: TeamEfficiencyMetric[] = [];

      for (const user of users) {
        // Projets de l'utilisateur
        const userProjects = projects.filter(p => p.responsibleUserId === user.id);
        const userTimelines = timelines.filter(t => 
          userProjects.some(p => p.id === t.projectId)
        );

        if (userTimelines.length === 0) continue;

        // Efficacité temporelle (respect des délais)
        const onTimeProjects = userTimelines.filter(t => {
          if (!t.plannedEndDate || !t.actualEndDate) return false;
          const planned = new Date(t.plannedEndDate);
          const actual = new Date(t.actualEndDate);
          return actual <= planned;
        }).length;

        const efficiency = userTimelines.length > 0 ? (onTimeProjects / userTimelines.length) * 100 : 0;

        // Score qualité (approximation - utiliser 100% par défaut car les champs réserves n'existent pas encore)
        const qualityScore = 100;

        // Score collaboration (simplified)
        const collaborationScore = 85; // Score par défaut

        efficiencyMetrics.push({
          userId: user.id,
          userName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Unknown',
          efficiency,
          deliveredOnTime: (onTimeProjects / Math.max(1, userTimelines.length)) * 100,
          qualityScore,
          collaborationScore
        });
      }

      return efficiencyMetrics.sort((a, b) => b.efficiency - a.efficiency);

    } catch (error) {
      logger.error('Erreur calcul efficacité équipes', {
        metadata: {
          service: 'AnalyticsService',
          operation: 'calculateTeamEfficiency',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      return [];
    }
  }

  async suggestOptimalPlanning(futureWeeks: number = 4): Promise<PlanningOptimizationSuggestion[]> {
    try {
      const currentDate = new Date();
      const futureDate = new Date(currentDate.getTime() + (futureWeeks * 7 * 24 * 60 * 60 * 1000));
      
      const teamLoad = await this.calculateTeamLoad({ from: currentDate, to: futureDate });
      const suggestions: PlanningOptimizationSuggestion[] = [];

      // Analyse charges et suggestions
      const overloadedTeam = teamLoad.filter(member => member.status === 'critical' || member.status === 'overloaded');
      const underloadedTeam = teamLoad.filter(member => member.status === 'underloaded');

      // Suggestions de rééquilibrage
      if (overloadedTeam.length > 0 && underloadedTeam.length > 0) {
        suggestions.push({
          type: 'rebalance',
          description: `Rééquilibrer la charge entre ${overloadedTeam.length} membres surchargés et ${underloadedTeam.length} sous-chargés`,
          impact: `Réduction moyenne de ${Math.round(overloadedTeam.reduce((sum, m) => sum + (m.loadPercentage - 100), 0) / overloadedTeam.length)}% de surcharge`,
          urgency: 'high',
          estimatedBenefit: overloadedTeam.length * 0.15 // 15% improvement per overloaded member
        });
      }

      // Suggestions d'embauche
      const criticalOverload = teamLoad.filter(member => member.status === 'critical');
      if (criticalOverload.length > 2) {
        suggestions.push({
          type: 'hire',
          description: `Embaucher 1-2 ressources supplémentaires pour ${criticalOverload.length} membres en surcharge critique`,
          impact: 'Réduction significative des risques de retard et amélioration qualité',
          urgency: 'critical',
          estimatedBenefit: 0.3 // 30% improvement
        });
      }

      // Suggestions de priorisation
      const averageLoad = teamLoad.reduce((sum, member) => sum + member.loadPercentage, 0) / teamLoad.length;
      if (averageLoad > 110) {
        suggestions.push({
          type: 'prioritize',
          description: 'Reprioriser les projets en cours et décaler les moins critiques',
          impact: 'Amélioration focus sur projets prioritaires',
          urgency: 'medium',
          estimatedBenefit: 0.2 // 20% improvement
        });
      }

      // Suggestions de délais
      if (overloadedTeam.length > teamLoad.length * 0.5) {
        suggestions.push({
          type: 'delay',
          description: 'Négocier des délais supplémentaires avec clients pour projets moins critiques',
          impact: 'Réduction stress équipe et amélioration qualité',
          urgency: 'medium',
          estimatedBenefit: 0.25 // 25% improvement
        });
      }

      return suggestions.sort((a, b) => {
        const urgencyOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return urgencyOrder[b.urgency] - urgencyOrder[a.urgency];
      });

    } catch (error) {
      logger.error('Erreur suggestions planning optimal', {
        metadata: {
          service: 'AnalyticsService',
          operation: 'suggestOptimalPlanning',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      return [];
    }
  }
}

class MarginCalculator {
  constructor(private storage: IStorage) {}

  async calculateMarginAnalysis(period: DateRange): Promise<MarginAnalysisMetric> {
    // Déléguer au RevenueCalculator qui a la même logique
    const revenueCalculator = new RevenueCalculator(this.storage);
    return await revenueCalculator.calculateMarginAnalysis(period);
  }
}

// ========================================
// SERVICE PRINCIPAL ANALYTICS ENTERPRISE
// ========================================

export class AnalyticsService {
  // Architecture modulaire avec calculs spécialisés
  private conversionCalculator!: ConversionCalculator;
  private delayCalculator!: DelayCalculator;
  private revenueCalculator!: RevenueCalculator;
  private teamLoadCalculator!: TeamLoadCalculator;
  private marginCalculator!: MarginCalculator;

  // Cache et performance
  private cache: Map<string, any> = new Map();
  private readonly CACHE_TTL = 1000 * 60 * 30; // 30 minutes

  constructor(
    private storage: IStorage,
    private eventBus: EventBus
  ) {
    this.initializeCalculators();
  }

  private initializeCalculators(): void {
    this.conversionCalculator = new ConversionCalculator(this.storage);
    this.delayCalculator = new DelayCalculator(this.storage);
    this.revenueCalculator = new RevenueCalculator(this.storage);
    this.teamLoadCalculator = new TeamLoadCalculator(this.storage);
    this.marginCalculator = new MarginCalculator(this.storage);
  }

  // ========================================
  // MÉTHODES PRINCIPALES CONSOLIDÉES
  // ========================================

  async generateKPISnapshot(period: DateRange): Promise<KpiSnapshot> {
    try {
      // Calculs parallèles pour performance optimisée
      const [
        conversions,
        delays,
        revenue,
        teamLoad,
        margins
      ] = await Promise.all([
        this.conversionCalculator.calculatePipelineConversion(period),
        this.delayCalculator.calculateAverageDelays(period, 'phase'),
        this.revenueCalculator.calculateRevenueForecast(period),
        this.teamLoadCalculator.calculateTeamLoad(period),
        this.marginCalculator.calculateMarginAnalysis(period)
      ]);

      // Construction snapshot consolidé
      const snapshot: InsertKpiSnapshot = {
        snapshotDate: new Date(),
        periodFrom: period.from,
        periodTo: period.to,
        
        // KPIs consolidés calculés
        totalAos: 0, // Sera calculé séparément
        totalOffers: 0, // Sera calculé séparément  
        totalProjects: 0, // Sera calculé séparément
        conversionRateAoToOffer: conversions.aoToOffer.toString(),
        conversionRateOfferToProject: conversions.offerToProject.toString(),
        avgDelayDays: delays.average.toString(),
        totalRevenueForecast: revenue.amount.toString(),
        avgTeamLoadPercentage: teamLoad.length > 0 ? 
          (teamLoad.reduce((sum, t) => sum + t.loadPercentage, 0) / teamLoad.length).toString() : "0",
        criticalDeadlinesCount: delays.criticalCount,
        delayedProjectsCount: await this.getDelayedProjectsCount(),
        
        // Breakdowns JSON pour flexibilité
        conversionByUser: conversions.aoToOffer ? { /* TODO: implement */ } : {},
        loadByUser: this.buildLoadByUser(teamLoad),
        revenueByCategory: revenue.byCategory,
        marginByCategory: margins.byCategory
      };

      // Sauvegarder snapshot
      const savedSnapshot = await this.storage.createKPISnapshot(snapshot);

      // Publier événement analytics
      this.eventBus.publishAnalyticsCalculated({
        entity: 'analytics',
        entityId: savedSnapshot.id,
        message: `KPIs mis à jour - Snapshot période ${period.from.toISOString().split('T')[0]} → ${period.to.toISOString().split('T')[0]}`,
        severity: 'info',
        metadata: {
          period: period,
          kpis: {
            conversionRate: conversions.globalConversion,
            forecastRevenue: revenue.amount,
            avgTeamLoad: teamLoad.length > 0 ? teamLoad.reduce((sum, t) => sum + t.loadPercentage, 0) / teamLoad.length : 0,
            delayedProjects: delays.criticalCount
          }
        }
      });

      return savedSnapshot;

    } catch (error) {
      logger.error('Erreur génération KPI snapshot', {
        metadata: {
          service: 'AnalyticsService',
          operation: 'generateKpiSnapshot',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw new Error(`Échec génération KPIs: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }

  async getRealtimeKPIs(filters?: BusinessFilters): Promise<RealtimeKPIs> {
    const cacheKey = this.buildCacheKey('realtime', filters);
    
    // Vérifier cache
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.data;
      }
    }

    try {
      // Période dernières 24h pour temps réel
      const now = new Date();
      const yesterday = new Date(now.getTime() - (24 * 60 * 60 * 1000));
      const period = { from: yesterday, to: now };

      // Calculs temps réel optimisés
      const [
        conversions,
        revenue,
        teamLoad,
        delayedCount,
        alertsCount
      ] = await Promise.all([
        this.conversionCalculator.calculatePipelineConversion(period),
        this.revenueCalculator.calculateRevenueForecast(period),
        this.teamLoadCalculator.calculateTeamLoad(period),
        this.getDelayedProjectsCount(),
        this.getActiveAlertsCount()
      ]);

      const kpis: RealtimeKPIs = {
        conversionRate: conversions.globalConversion,
        forecastRevenue: revenue.amount,
        teamLoadAvg: teamLoad.length > 0 ? teamLoad.reduce((sum, t) => sum + t.loadPercentage, 0) / teamLoad.length : 0,
        delayedProjectsCount: delayedCount,
        alertsCount,
        lastUpdated: now
      };

      // Mettre en cache
      this.cache.set(cacheKey, {
        data: kpis,
        timestamp: Date.now()
      });

      return kpis;

    } catch (error) {
      logger.error('Erreur calcul KPIs temps réel', {
        metadata: {
          service: 'AnalyticsService',
          operation: 'calculateRealTimeKPIs',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      return {
        conversionRate: 0,
        forecastRevenue: 0,
        teamLoadAvg: 0,
        delayedProjectsCount: 0,
        alertsCount: 0,
        lastUpdated: new Date()
      };
    }
  }

  async generateBenchmarks(entity: BenchmarkEntity, period: DateRange): Promise<PerformanceBenchmark> {
    try {
      // Calculs spécifiques selon le type d'entité
      let conversionRate = 0;
      let avgDelay = 0;
      let avgMargin = 0;
      let totalRevenue = 0;
      let workloadEfficiency = 0;

      if (entity.type === 'user') {
        // Benchmarks utilisateur
        const userConversions = await this.conversionCalculator.calculateOfferToProjectConversion(period, { userId: entity.id });
        const userDelays = await this.delayCalculator.calculateAverageDelays(period, 'user');
        const userLoad = await this.teamLoadCalculator.calculateTeamLoad(period);
        
        conversionRate = userConversions.rate;
        avgDelay = userDelays.byUser?.[entity.id] || 0;
        const userLoadData = userLoad.find(l => l.userId === entity.id);
        workloadEfficiency = userLoadData?.efficiency || 0;
        
      } else if (entity.type === 'department') {
        // Benchmarks département
        const deptConversions = await this.conversionCalculator.calculatePipelineConversion(period);
        const deptDelays = await this.delayCalculator.calculateAverageDelays(period, 'phase');
        
        conversionRate = deptConversions.globalConversion;
        avgDelay = deptDelays.average;
        
      } else if (entity.type === 'category') {
        // Benchmarks catégorie
        const categoryRevenue = await this.revenueCalculator.calculateRevenueByCategory(period);
        const categoryData = categoryRevenue.find(c => c.category === entity.id);
        
        totalRevenue = categoryData?.revenue || 0;
        avgMargin = categoryData?.profitability || 0;
      }

      // Calcul score de performance global (0-100)
      const performanceScore = this.calculatePerformanceScore({
        conversionRate,
        avgDelay,
        workloadEfficiency,
        avgMargin
      });

      // Génération insights automatiques
      const insights = this.generateInsights({
        conversionRate,
        avgDelay,
        avgMargin,
        totalRevenue,
        workloadEfficiency
      });

      // Recommandations IA
      const recommendations = this.generateRecommendations({
        entityType: entity.type,
        performanceScore,
        conversionRate,
        avgDelay,
        workloadEfficiency
      });

      const benchmark: InsertPerformanceBenchmark = {
        benchmarkType: entity.type === 'user' ? 'user_comparison' : 
                     entity.type === 'department' ? 'department_efficiency' : 'category_performance',
        entityId: entity.id,
        entityType: entity.type,
        conversionRate: conversionRate.toString(),
        avgDelay: avgDelay.toString(),
        avgMargin: avgMargin.toString(),
        totalRevenue: totalRevenue.toString(),
        workloadEfficiency: workloadEfficiency.toString(),
        periodStart: period.from,
        periodEnd: period.to,
        performanceScore: performanceScore.toString(),
        insights,
        recommendations
      };

      return await this.storage.createPerformanceBenchmark(benchmark);

    } catch (error) {
      logger.error('Erreur génération benchmarks', {
        metadata: {
          service: 'AnalyticsService',
          operation: 'generateBenchmarks',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw new Error(`Échec génération benchmarks: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }

  // ========================================
  // MÉTHODES DE CACHE ET PERFORMANCE
  // ========================================

  private buildCacheKey(operation: string, params: any): string {
    const paramsHash = JSON.stringify(params || {});
    const timeWindow = Math.floor(Date.now() / (5 * 60 * 1000)); // 5min windows
    return `analytics_${operation}_${paramsHash}_${timeWindow}`;
  }

  private invalidateCache(pattern: string): void {
    const keysToDelete: string[] = [];
    for (const [key] of this.cache) {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  public clearCache(): void {
    this.cache.clear();
  }

  // ========================================
  // MÉTHODES UTILITAIRES
  // ========================================

  private async getDelayedProjectsCount(): Promise<number> {
    const delayedProjects = await this.delayCalculator.calculateDelayedProjects('minor');
    return delayedProjects.length;
  }

  private async getActiveAlertsCount(): Promise<number> {
    try {
      const alerts = await this.storage.listTechnicalAlerts({ status: 'pending' });
      return alerts.length;
    } catch (error) {
      return 0;
    }
  }

  private buildLoadByUser(teamLoad: TeamLoadMetric[]): Record<string, any> {
    const result: Record<string, any> = {};
    for (const member of teamLoad) {
      result[member.userId] = {
        percentage: member.loadPercentage,
        hours: member.hoursAssigned,
        capacity: member.capacityHours
      };
    }
    return result;
  }

  private calculatePerformanceScore(metrics: {
    conversionRate: number;
    avgDelay: number;
    workloadEfficiency: number;
    avgMargin: number;
  }): number {
    // Score pondéré (0-100)
    const conversionScore = Math.min(100, metrics.conversionRate * 2); // Max 50% conversion = 100 points
    const delayScore = Math.max(0, 100 - (metrics.avgDelay * 5)); // -5 points par jour de retard
    const efficiencyScore = metrics.workloadEfficiency;
    const marginScore = Math.min(100, metrics.avgMargin * 3); // 33% marge = 100 points

    return (conversionScore + delayScore + efficiencyScore + marginScore) / 4;
  }

  private generateInsights(metrics: {
    conversionRate: number;
    avgDelay: number;
    avgMargin: number;
    totalRevenue: number;
    workloadEfficiency: number;
  }): Record<string, any> {
    const insights: Record<string, any> = {};

    if (metrics.conversionRate > 80) {
      insights.conversion = "Excellent taux de conversion";
    } else if (metrics.conversionRate < 30) {
      insights.conversion = "Taux de conversion faible - nécessite attention";
    }

    if (metrics.avgDelay > 7) {
      insights.delays = "Retards importants détectés";
    } else if (metrics.avgDelay < 2) {
      insights.delays = "Excellent respect des délais";
    }

    if (metrics.workloadEfficiency > 90) {
      insights.efficiency = "Efficacité exceptionnelle";
    } else if (metrics.workloadEfficiency < 70) {
      insights.efficiency = "Efficacité en dessous des standards";
    }

    return insights;
  }

  private generateRecommendations(params: {
    entityType: string;
    performanceScore: number;
    conversionRate: number;
    avgDelay: number;
    workloadEfficiency: number;
  }): Record<string, any> {
    const recommendations: Record<string, any> = {};

    if (params.performanceScore < 70) {
      recommendations.urgent = "Performance globale faible - plan d'amélioration requis";
    }

    if (params.conversionRate < 40) {
      recommendations.conversion = "Améliorer processus commercial et suivi prospects";
    }

    if (params.avgDelay > 5) {
      recommendations.planning = "Optimiser planification et allocation ressources";
    }

    if (params.workloadEfficiency < 80) {
      recommendations.efficiency = "Formation et outils pour améliorer productivité";
    }

    return recommendations;
  }

  // ========================================
  // MÉTHODES PUBLIQUES POUR ROUTES
  // ========================================

  async getBusinessMetrics(params: any): Promise<any> {
    try {
      const period: DateRange = {
        from: params.dateFrom ? new Date(params.dateFrom) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        to: params.dateTo ? new Date(params.dateTo) : new Date()
      };

      const [conversions, revenue, teamLoad, margins] = await Promise.all([
        this.conversionCalculator.calculatePipelineConversion(period),
        this.revenueCalculator.calculateRevenueForecast(period),
        this.teamLoadCalculator.calculateTeamLoad(period),
        this.marginCalculator.calculateMarginAnalysis(period)
      ]);

      return {
        revenue: {
          total: revenue.amount,
          byMonth: revenue.byMonth.reduce((acc, m) => ({ ...acc, [m.month]: m.forecast }), {}),
          byClient: {}, // À implémenter
          growth: 0 // À calculer
        },
        conversion: {
          rate: conversions.globalConversion,
          aoToOffer: conversions.aoToOffer,
          offerToProject: conversions.offerToProject,
          funnel: [
            { stage: 'AO', count: 0, percentage: 100 },
            { stage: 'Offre', count: 0, percentage: conversions.aoToOffer },
            { stage: 'Projet', count: 0, percentage: conversions.offerToProject }
          ]
        },
        performance: {
          averageProjectDuration: 0, // À calculer
          onTimeDelivery: 0, // À calculer
          clientSatisfaction: 0, // À calculer
          teamUtilization: teamLoad.length > 0 ? teamLoad.reduce((sum, t) => sum + t.loadPercentage, 0) / teamLoad.length : 0
        },
        pipeline: {
          aoCount: 0, // À calculer
          offerCount: 0, // À calculer
          projectCount: 0, // À calculer
          totalValue: revenue.amount,
          expectedRevenue: revenue.amount
        }
      };
    } catch (error) {
      logger.error('Erreur getBusinessMetrics', {
        metadata: {
          service: 'AnalyticsService',
          operation: 'getBusinessMetrics',
          error: error instanceof Error ? error.message : String(error)
        }
      });
      throw error;
    }
  }

  async getDashboardStats(): Promise<any> {
    try {
      const [aos, offers, projects] = await Promise.all([
        this.storage.getAos(),
        this.storage.getOffers(),
        this.storage.getProjects()
      ]);

      const activeProjects = projects.filter(p => 
        p.status && !['termine', 'archive'].includes(p.status)
      );

      const totalRevenue = projects.reduce((sum, p) => 
        sum + parseFloat(p.budget?.toString() || '0'), 0
      );

      const period: DateRange = {
        from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        to: new Date()
      };

      const conversions = await this.conversionCalculator.calculatePipelineConversion(period);

      return {
        totalAos: aos.length,
        totalOffers: offers.length,
        totalProjects: projects.length,
        activeProjects: activeProjects.length,
        totalRevenue,
        conversionRate: conversions.globalConversion,
        averageProjectValue: projects.length > 0 ? totalRevenue / projects.length : 0,
        teamUtilization: 0 // À calculer
      };
    } catch (error) {
      logger.error('Erreur getDashboardStats', {
        metadata: {
          service: 'AnalyticsService',
          operation: 'getDashboardStats',
          error: error instanceof Error ? error.message : String(error)
        }
      });
      throw error;
    }
  }

  async getDashboardKPIs(): Promise<any> {
    // Alias pour getRealtimeKPIs pour compatibilité
    return this.getRealtimeKPIs();
  }

  async getPipelineAnalytics(filters?: any): Promise<any> {
    try {
      const period: DateRange = {
        from: filters?.dateFrom ? new Date(filters.dateFrom) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        to: filters?.dateTo ? new Date(filters.dateTo) : new Date()
      };

      const [aos, offers, projects, conversions] = await Promise.all([
        this.storage.getAos(),
        this.storage.getOffers(),
        this.storage.getProjects(),
        this.conversionCalculator.calculatePipelineConversion(period)
      ]);

      return {
        aoCount: aos.length,
        offerCount: offers.length,
        projectCount: projects.length,
        stages: [
          {
            name: 'AO',
            count: aos.length,
            value: 0,
            averageTime: 0,
            conversion: conversions.aoToOffer
          },
          {
            name: 'Offre',
            count: offers.length,
            value: 0,
            averageTime: 0,
            conversion: conversions.offerToProject
          },
          {
            name: 'Projet',
            count: projects.length,
            value: 0,
            averageTime: 0,
            conversion: 100
          }
        ],
        bottlenecks: [
          {
            stage: conversions.bottleneckPhase,
            severity: 'medium' as const,
            impact: 0,
            recommendation: 'Améliorer le taux de conversion'
          }
        ]
      };
    } catch (error) {
      logger.error('Erreur getPipelineAnalytics', {
        metadata: {
          service: 'AnalyticsService',
          operation: 'getPipelineAnalytics',
          error: error instanceof Error ? error.message : String(error)
        }
      });
      throw error;
    }
  }

  async getBenchmarks(params: any): Promise<any> {
    try {
      const period: DateRange = {
        from: params?.dateFrom ? new Date(params.dateFrom) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        to: params?.dateTo ? new Date(params.dateTo) : new Date()
      };

      const entity: BenchmarkEntity = {
        type: params?.entityType || 'user',
        id: params?.entityId || 'default'
      };

      return await this.generateBenchmarks(entity, period);
    } catch (error) {
      logger.error('Erreur getBenchmarks', {
        metadata: {
          service: 'AnalyticsService',
          operation: 'getBenchmarks',
          error: error instanceof Error ? error.message : String(error)
        }
      });
      throw error;
    }
  }

  async getRealtimeMetrics(): Promise<any[]> {
    try {
      const kpis = await this.getRealtimeKPIs();
      
      return [
        {
          metric: 'conversion_rate',
          value: kpis.conversionRate,
          timestamp: kpis.lastUpdated,
          delta: 0,
          trend: []
        },
        {
          metric: 'forecast_revenue',
          value: kpis.forecastRevenue,
          timestamp: kpis.lastUpdated,
          delta: 0,
          trend: []
        },
        {
          metric: 'team_load',
          value: kpis.teamLoadAvg,
          timestamp: kpis.lastUpdated,
          delta: 0,
          trend: []
        },
        {
          metric: 'delayed_projects',
          value: kpis.delayedProjectsCount,
          timestamp: kpis.lastUpdated,
          delta: 0,
          trend: []
        }
      ];
    } catch (error) {
      logger.error('Erreur getRealtimeMetrics', {
        metadata: {
          service: 'AnalyticsService',
          operation: 'getRealtimeMetrics',
          error: error instanceof Error ? error.message : String(error)
        }
      });
      throw error;
    }
  }

  async analyzeBottlenecks(): Promise<any[]> {
    try {
      const period: DateRange = {
        from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        to: new Date()
      };

      const [conversions, delays] = await Promise.all([
        this.conversionCalculator.calculatePipelineConversion(period),
        this.delayCalculator.calculateAverageDelays(period, 'phase')
      ]);

      const bottlenecks: any[] = [];

      // Analyser les conversions
      if (conversions.aoToOffer < 50) {
        bottlenecks.push({
          id: 'conversion-ao-offer',
          process: 'conversion',
          stage: 'ao_to_offer',
          severity: 70,
          impact: {
            delayDays: 0,
            affectedProjects: 0,
            costImpact: 0
          },
          causes: ['Taux de conversion faible AO vers Offre'],
          recommendations: [
            {
              action: 'Améliorer qualification des AOs',
              expectedImprovement: 20,
              effort: 'medium' as const
            }
          ]
        });
      }

      // Analyser les délais
      if (delays.average > 5) {
        bottlenecks.push({
          id: 'delays-critical',
          process: 'execution',
          stage: 'all',
          severity: 80,
          impact: {
            delayDays: delays.average,
            affectedProjects: delays.criticalCount,
            costImpact: delays.average * delays.criticalCount * 500
          },
          causes: ['Délais moyens supérieurs à 5 jours'],
          recommendations: [
            {
              action: 'Optimiser la planification',
              expectedImprovement: 30,
              effort: 'high' as const
            }
          ]
        });
      }

      return bottlenecks;
    } catch (error) {
      logger.error('Erreur analyzeBottlenecks', {
        metadata: {
          service: 'AnalyticsService',
          operation: 'analyzeBottlenecks',
          error: error instanceof Error ? error.message : String(error)
        }
      });
      throw error;
    }
  }

  async exportData(request: any): Promise<any> {
    try {
      let data: any;

      switch (request.type) {
        case 'kpis':
          data = await this.getRealtimeKPIs();
          break;
        case 'metrics':
          data = await this.getBusinessMetrics({});
          break;
        case 'dashboard':
          data = await this.getDashboardStats();
          break;
        default:
          data = await this.getRealtimeKPIs();
      }

      const jsonData = JSON.stringify(data, null, 2);
      const buffer = Buffer.from(jsonData, 'utf-8');

      return {
        filename: `analytics-${request.type}-${Date.now()}.${request.format}`,
        mimeType: request.format === 'json' ? 'application/json' : 'text/csv',
        size: buffer.length,
        data: request.format === 'json' ? data : buffer,
        generatedAt: new Date()
      };
    } catch (error) {
      logger.error('Erreur exportData', {
        metadata: {
          service: 'AnalyticsService',
          operation: 'exportData',
          error: error instanceof Error ? error.message : String(error)
        }
      });
      throw error;
    }
  }

  // ========================================
  // API PUBLIQUE POUR CALCULATEURS
  // ========================================

  get conversionCalculatorAPI() {
    return this.conversionCalculator;
  }

  get delayCalculatorAPI() {
    return this.delayCalculator;
  }

  get revenueCalculatorAPI() {
    return this.revenueCalculator;
  }

  get teamLoadCalculatorAPI() {
    return this.teamLoadCalculator;
  }

  get marginCalculatorAPI() {
    return this.marginCalculator;
  }
}

// Extension pour EventBus avec événements analytics
declare module '../eventBus' {
  interface EventBus {
    publishAnalyticsCalculated(params: {
      entity: string;
      entityId: string;
      message: string;
      severity: 'info' | 'warning' | 'error' | 'success';
      metadata?: Record<string, any>;
    }): void;
  }
}