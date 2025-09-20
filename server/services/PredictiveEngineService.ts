import { IStorage, DateRange, MetricFilters } from "../storage-poc";
import { AnalyticsService } from "./AnalyticsService";
import type { 
  Project, ProjectStatus, User, Offer
} from "@shared/schema";
import { addMonths, subMonths, format } from "date-fns";

// ========================================
// TYPES ET INTERFACES PRÉDICTIFS
// ========================================

// Types pour les requêtes prédictives
export interface PredictiveRangeQuery {
  start_date: string; // Format ISO date
  end_date: string;   // Format ISO date
  forecast_months: number; // Nombre de mois à prévoir (3-12)
  method?: 'exp_smoothing' | 'moving_average' | 'trend_analysis';
  granularity?: 'month' | 'quarter'; // Granularité des prévisions
  segment?: string; // Pour segmentation (BE, région, etc.)
}

// Paramètres pour détection de risques
export interface RiskQueryParams {
  risk_level?: 'low' | 'medium' | 'high' | 'all'; // Seuil minimum de risque
  project_types?: string[]; // Types de projets à analyser
  user_ids?: string[]; // Utilisateurs spécifiques
  limit?: number; // Nombre max de résultats
  include_predictions?: boolean; // Inclure prédictions délais/budget
}

// Contexte business pour recommandations
export interface BusinessContext {
  analysis_period: DateRange;
  focus_areas?: ('revenue' | 'costs' | 'planning' | 'quality')[];
  priority_threshold?: 'low' | 'medium' | 'high';
  department_filter?: string;
}

// ========================================
// TYPES DE DONNÉES PRÉDICTIVES
// ========================================

// Données historiques de revenus mensuels
export interface MonthlyRevenueData {
  period: string; // Format YYYY-MM
  total_revenue: number;
  offer_count: number;
  avg_margin: number;
  conversion_rate: number;
  project_types: Record<string, number>; // Revenus par type
}

// Point de prévision revenue
export interface ForecastPoint {
  target_period: string; // Format YYYY-MM
  revenue_forecast: number;
  method_used: 'exp_smoothing' | 'moving_average' | 'trend_analysis';
  confidence_score?: number; // 0-100
}

// Prévision complète avec métadonnées
export interface PredictiveRevenueForecast {
  forecast_point: ForecastPoint;
  confidence_level: number; // 0-100
  underlying_factors: string[]; // Facteurs explicatifs
  seasonal_adjustment?: number; // Ajustement saisonnier
  trend_direction: 'up' | 'down' | 'stable';
  volatility_score: number; // Mesure de volatilité historique
}

// Données historiques de délais projets
export interface DelayData {
  project_id: string;
  project_type: string;
  planned_days: number;
  actual_days: number;
  delay_days: number;
  completion_date: string;
  responsible_user_id?: string;
  complexity_factors: string[];
}

// Facteurs de risque identifiés
export interface RiskFactor {
  type: 'complexity' | 'team_load' | 'historical_delay' | 'external' | 'budget';
  description: string;
  impact_score: number; // 0-100
  likelihood: number; // 0-100
  mitigation_suggested: string;
}

// Actions préventives recommandées
export interface PreventiveAction {
  type: 'resource_adjustment' | 'timeline_extension' | 'scope_reduction' | 'escalation';
  description: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  estimated_effort_hours: number;
  expected_risk_reduction: number; // Pourcentage de réduction du risque
}

// Évaluation complète des risques projet
export interface ProjectRiskAssessment {
  id: string;
  project_id: string;
  risk_score: number; // 0-100
  risk_factors: RiskFactor[];
  predicted_delay_days: number;
  predicted_budget_overrun: number; // Pourcentage
  recommended_actions: PreventiveAction[];
  assessment_date: string; // ISO timestamp
  next_review_date: string; // Prochaine évaluation recommandée
}

// ========================================
// TYPES RECOMMANDATIONS BUSINESS
// ========================================

// Recommandation business actionnable
export interface BusinessRecommendation {
  id: string;
  category: 'revenue' | 'costs' | 'planning' | 'quality' | 'process';
  title: string;
  description: string;
  rationale: string; // Justification basée sur les données
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimated_impact: {
    revenue_increase?: number; // Euros
    cost_reduction?: number;   // Euros
    time_savings?: number;     // Heures
    quality_improvement?: number; // Pourcentage
  };
  implementation: {
    effort_estimate_hours: number;
    required_resources: string[];
    timeline_weeks: number;
    success_metrics: string[];
  };
  generated_date: string; // ISO timestamp
}

// ========================================
// TYPES POUR HISTORIQUES ET ANALYSES
// ========================================

// Historique de charge équipe
export interface TeamLoadHistory {
  user_id: string;
  period: string; // Format YYYY-MM
  utilization_rate: number; // Pourcentage
  hours_assigned: number;
  hours_capacity: number;
  efficiency_score: number;
  project_count: number;
}

// Métriques de performance équipe pour prédictions
export interface TeamPerformanceMetric {
  user_id: string;
  user_name: string;
  avg_project_duration: number; // Jours
  on_time_delivery_rate: number; // Pourcentage
  quality_score: number; // 0-100
  collaboration_effectiveness: number; // 0-100
  historical_delay_pattern: number[]; // Délais par mois sur 12 mois
}

// Benchmarks secteur pour comparaisons
export interface SectorBenchmark {
  industry_avg_conversion: number; // Taux conversion moyen secteur
  avg_duration_benchmark: number; // Durée moyenne projets
  margin_benchmark: number; // Marge moyenne
  quality_benchmark: number; // Score qualité moyen
  efficiency_benchmark: number; // Efficacité moyenne
}

// ========================================
// CACHE INTERFACE
// ========================================

export interface CacheEntry<T> {
  data: T;
  expires: number; // Timestamp
  created: number; // Timestamp de création
  hit_count: number; // Nombre d'accès
}

// ========================================
// SERVICE PRINCIPAL
// ========================================

export class PredictiveEngineService {
  private storage: IStorage;
  private analyticsService: AnalyticsService;
  private cache: Map<string, CacheEntry<any>>;
  private readonly CACHE_TTL_MINUTES = 30;
  private readonly CACHE_MAX_SIZE = 1000;

  constructor(storage: IStorage, analyticsService: AnalyticsService) {
    this.storage = storage;
    this.analyticsService = analyticsService;
    this.cache = new Map();
    
    // Cleanup cache périodique
    setInterval(() => this.cleanupCache(), 5 * 60 * 1000); // Toutes les 5 minutes
    
    console.log('[PredictiveEngine] Service initialisé avec cache TTL:', this.CACHE_TTL_MINUTES, 'minutes');
  }

  // ========================================
  // MÉTHODES PRINCIPALES
  // ========================================

  /**
   * Prévisions de revenus avec algorithmes statistiques
   */
  async forecastRevenue(params: PredictiveRangeQuery): Promise<PredictiveRevenueForecast[]> {
    const cacheKey = this.getCacheKey('forecast_revenue', params);
    const cached = this.getCachedEntry<PredictiveRevenueForecast[]>(cacheKey);
    
    if (cached) {
      console.log('[PredictiveEngine] Cache hit pour forecast revenue');
      return cached;
    }

    try {
      console.log('[PredictiveEngine] Calcul forecast revenue:', params);
      
      // 1. RÉCUPÉRATION DONNÉES HISTORIQUES
      const historicalData = await this.getMonthlyRevenueHistory({
        start_date: params.start_date,
        end_date: params.end_date
      });

      if (historicalData.length === 0) {
        console.log('[PredictiveEngine] Aucune donnée historique trouvée');
        return [];
      }

      // 2. ALGORITHMES FORECASTING
      let forecasts: ForecastPoint[] = [];
      
      switch (params.method || 'exp_smoothing') {
        case 'exp_smoothing':
          forecasts = this.applyExponentialSmoothing(historicalData, params);
          break;
        case 'moving_average':
          forecasts = this.applyMovingAverage(historicalData, params);
          break;
        case 'trend_analysis':
          forecasts = this.applyTrendAnalysis(historicalData, params);
          break;
      }

      // 3. CALCUL CONFIANCE ET MÉTADONNÉES
      const confidence = this.calculateConfidenceLevel(historicalData, forecasts);
      const factors = this.identifyUnderlyingFactors(historicalData);
      const volatility = this.calculateVolatility(historicalData);
      const trend = this.detectTrendDirection(historicalData);

      // 4. CONSTRUCTION RÉSULTATS COMPLETS
      const results: PredictiveRevenueForecast[] = forecasts.map(forecast => ({
        forecast_point: forecast,
        confidence_level: confidence,
        underlying_factors: factors,
        trend_direction: trend,
        volatility_score: volatility
      }));

      // 5. MISE EN CACHE
      this.setCacheEntry(cacheKey, results);
      
      console.log('[PredictiveEngine] Forecast calculé:', results.length, 'prévisions');
      return results;

    } catch (error) {
      console.error('[PredictiveEngine] Erreur calcul forecast revenue:', error);
      return [];
    }
  }

  /**
   * Détection de risques projets avec scoring algorithmique
   */
  async detectProjectRisks(params: RiskQueryParams): Promise<ProjectRiskAssessment[]> {
    const cacheKey = this.getCacheKey('project_risks', params);
    const cached = this.getCachedEntry<ProjectRiskAssessment[]>(cacheKey);
    
    if (cached) {
      console.log('[PredictiveEngine] Cache hit pour project risks');
      return cached;
    }

    try {
      console.log('[PredictiveEngine] Détection risques projets:', params);

      // 1. DONNÉES HISTORIQUES DÉLAIS
      const delayHistory = await this.getProjectDelayHistory({
        start_date: subMonths(new Date(), 12).toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0]
      });

      // 2. PROJETS ACTIFS À ÉVALUER
      const activeProjects = await this.storage.getProjects();
      const filteredProjects = this.filterProjectsByParams(activeProjects, params);
      
      const riskyProjects: ProjectRiskAssessment[] = [];

      // 3. ANALYSE DE CHAQUE PROJET
      for (const project of filteredProjects) {
        const riskScore = this.calculateRiskScore(project, delayHistory);
        
        if (riskScore >= this.getRiskThreshold(params.risk_level)) {
          const riskFactors = this.analyzeRiskFactors(project, delayHistory);
          const predictions = this.predictDelaysAndOverruns(project, delayHistory);
          const actions = this.generatePreventiveActions(riskFactors);

          riskyProjects.push({
            id: `risk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            project_id: project.id,
            risk_score: riskScore,
            risk_factors: riskFactors,
            predicted_delay_days: predictions.delay,
            predicted_budget_overrun: predictions.overrun,
            recommended_actions: actions,
            assessment_date: new Date().toISOString(),
            next_review_date: addMonths(new Date(), 1).toISOString()
          });
        }
      }

      // 4. TRI ET LIMITATION
      const results = riskyProjects
        .sort((a, b) => b.risk_score - a.risk_score)
        .slice(0, params.limit || 20);

      // 5. MISE EN CACHE
      this.setCacheEntry(cacheKey, results);
      
      console.log('[PredictiveEngine] Risques détectés:', results.length, 'projets à risque');
      return results;

    } catch (error) {
      console.error('[PredictiveEngine] Erreur détection risques:', error);
      return [];
    }
  }

  /**
   * Génération de recommandations business actionables
   */
  async generateRecommendations(context: BusinessContext): Promise<BusinessRecommendation[]> {
    const cacheKey = this.getCacheKey('business_recommendations', context);
    const cached = this.getCachedEntry<BusinessRecommendation[]>(cacheKey);
    
    if (cached) {
      console.log('[PredictiveEngine] Cache hit pour recommendations');
      return cached;
    }

    try {
      console.log('[PredictiveEngine] Génération recommandations business:', context);

      const recommendations: BusinessRecommendation[] = [];

      // 1. ANALYSE KPIs ACTUELS via AnalyticsService
      const currentKPIs = await this.getCurrentKPIs(context.analysis_period);
      
      // 2. BENCHMARKS SECTEUR
      const benchmarks = await this.getSectorBenchmarks();

      // 3. GÉNÉRATEURS RECOMMANDATIONS SPÉCIALISÉS

      // REVENUS : Analyse conversion et opportunités
      if (!context.focus_areas || context.focus_areas.includes('revenue')) {
        const revenueRecs = await this.generateRevenueRecommendations(currentKPIs, benchmarks);
        recommendations.push(...revenueRecs);
      }

      // COÛTS : Optimisation délais et ressources
      if (!context.focus_areas || context.focus_areas.includes('costs')) {
        const costRecs = await this.generateCostOptimizationRecommendations(currentKPIs, benchmarks);
        recommendations.push(...costRecs);
      }

      // PLANNING : Charge équipe et optimisation
      if (!context.focus_areas || context.focus_areas.includes('planning')) {
        const planningRecs = await this.generatePlanningRecommendations(context);
        recommendations.push(...planningRecs);
      }

      // QUALITÉ : Amélioration processus
      if (!context.focus_areas || context.focus_areas.includes('quality')) {
        const qualityRecs = await this.generateQualityRecommendations(currentKPIs);
        recommendations.push(...qualityRecs);
      }

      // 4. PRIORISATION ET FILTRAGE
      const filteredRecs = recommendations
        .filter(rec => this.meetsPriorityThreshold(rec, context.priority_threshold))
        .sort((a, b) => this.getPriorityScore(b.priority) - this.getPriorityScore(a.priority))
        .slice(0, 15); // Limiter à 15 recommandations maximum

      // 5. MISE EN CACHE
      this.setCacheEntry(cacheKey, filteredRecs);
      
      console.log('[PredictiveEngine] Recommandations générées:', filteredRecs.length, 'actions');
      return filteredRecs;

    } catch (error) {
      console.error('[PredictiveEngine] Erreur génération recommandations:', error);
      return [];
    }
  }

  // ========================================
  // ALGORITHMES FORECASTING
  // ========================================

  /**
   * Lissage exponentiel pour prévisions (α = 0.3)
   */
  private applyExponentialSmoothing(
    data: MonthlyRevenueData[], 
    params: PredictiveRangeQuery
  ): ForecastPoint[] {
    const alpha = 0.3; // Facteur de lissage
    let smoothedValue = data[0]?.total_revenue || 0;
    
    // Lissage des données historiques
    for (const point of data) {
      smoothedValue = alpha * point.total_revenue + (1 - alpha) * smoothedValue;
    }
    
    // Projection future
    const forecasts: ForecastPoint[] = [];
    for (let i = 1; i <= params.forecast_months; i++) {
      const futureMonth = addMonths(new Date(), i);
      forecasts.push({
        target_period: format(futureMonth, 'yyyy-MM'),
        revenue_forecast: Math.round(smoothedValue),
        method_used: 'exp_smoothing'
      });
    }
    
    return forecasts;
  }

  /**
   * Moyenne mobile sur 3 mois
   */
  private applyMovingAverage(
    data: MonthlyRevenueData[], 
    params: PredictiveRangeQuery
  ): ForecastPoint[] {
    const windowSize = 3;
    const recentData = data.slice(-windowSize);
    
    if (recentData.length === 0) return [];
    
    const avgRevenue = recentData.reduce((sum, d) => sum + d.total_revenue, 0) / recentData.length;
    
    const forecasts: ForecastPoint[] = [];
    for (let i = 1; i <= params.forecast_months; i++) {
      const futureMonth = addMonths(new Date(), i);
      forecasts.push({
        target_period: format(futureMonth, 'yyyy-MM'),
        revenue_forecast: Math.round(avgRevenue),
        method_used: 'moving_average'
      });
    }
    
    return forecasts;
  }

  /**
   * Analyse de tendance avec régression linéaire
   */
  private applyTrendAnalysis(
    data: MonthlyRevenueData[], 
    params: PredictiveRangeQuery
  ): ForecastPoint[] {
    if (data.length < 2) return [];
    
    // Régression linéaire simple y = ax + b
    const n = data.length;
    const xValues = data.map((_, index) => index);
    const yValues = data.map(d => d.total_revenue);
    
    const sumX = xValues.reduce((sum, x) => sum + x, 0);
    const sumY = yValues.reduce((sum, y) => sum + y, 0);
    const sumXY = xValues.reduce((sum, x, i) => sum + (x * yValues[i]), 0);
    const sumXX = xValues.reduce((sum, x) => sum + (x * x), 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // Prévisions basées sur la tendance
    const forecasts: ForecastPoint[] = [];
    for (let i = 1; i <= params.forecast_months; i++) {
      const futureX = n - 1 + i;
      const forecast = slope * futureX + intercept;
      const futureMonth = addMonths(new Date(), i);
      
      forecasts.push({
        target_period: format(futureMonth, 'yyyy-MM'),
        revenue_forecast: Math.max(0, Math.round(forecast)),
        method_used: 'trend_analysis'
      });
    }
    
    return forecasts;
  }

  // ========================================
  // ALGORITHMES SCORING RISQUES
  // ========================================

  /**
   * Calcul du score de risque projet (0-100)
   */
  private calculateRiskScore(project: Project, delayHistory: DelayData[]): number {
    let score = 0;
    
    // FACTEUR 1 : Complexité projet (30%)
    const complexityScore = this.getComplexityScore(project);
    score += complexityScore * 0.3;
    
    // FACTEUR 2 : Historique délais similaires (40%)
    const delayScore = this.getHistoricalDelayScore(project, delayHistory);
    score += delayScore * 0.4;
    
    // FACTEUR 3 : Charge équipe période (20%)
    const teamLoadScore = this.calculateTeamLoadRisk(project);
    score += teamLoadScore * 0.2;
    
    // FACTEUR 4 : Contraintes externes (10%)
    const externalScore = this.calculateExternalRisk(project);
    score += externalScore * 0.1;
    
    return Math.min(100, Math.round(score));
  }

  private getComplexityScore(project: Project): number {
    // Score basé sur montant et type de projet
    const amount = project.montantFinal || project.montantPropose || project.montantEstime || 0;
    let score = 0;
    
    // Score montant (0-50)
    if (amount > 500000) score += 50;
    else if (amount > 200000) score += 35;
    else if (amount > 100000) score += 20;
    else score += 10;
    
    // Score type projet (0-30)
    const complexTypes = ['verriere', 'cloison', 'autre'];
    if (project.menuiserieType && complexTypes.includes(project.menuiserieType)) {
      score += 30;
    } else {
      score += 15;
    }
    
    // Score durée estimée (0-20)
    const estimatedDuration = project.timeline?.estimatedDuration || 30;
    if (estimatedDuration > 90) score += 20;
    else if (estimatedDuration > 60) score += 15;
    else if (estimatedDuration > 30) score += 10;
    else score += 5;
    
    return Math.min(100, score);
  }

  private getHistoricalDelayScore(project: Project, delayHistory: DelayData[]): number {
    // Analyse des projets similaires
    const similarProjects = delayHistory.filter(h => 
      h.project_type === project.menuiserieType &&
      h.responsible_user_id === project.responsibleUserId
    );
    
    if (similarProjects.length === 0) return 30; // Score par défaut
    
    const avgDelay = similarProjects.reduce((sum, p) => sum + p.delay_days, 0) / similarProjects.length;
    return Math.min(100, (avgDelay / 30) * 100); // 30 jours = score max
  }

  private calculateTeamLoadRisk(project: Project): number {
    // Score basé sur la charge actuelle de l'équipe
    // Pour le POC, on utilise un calcul simplifié
    const userId = project.responsibleUserId;
    if (!userId) return 20; // Score par défaut
    
    // Simuler analyse de charge (à terme via AnalyticsService)
    const simulatedLoad = Math.random() * 100; // Simulation
    
    if (simulatedLoad > 90) return 100;
    if (simulatedLoad > 75) return 70;
    if (simulatedLoad > 50) return 40;
    return 20;
  }

  private calculateExternalRisk(project: Project): number {
    // Facteurs externes : saison, contraintes client, etc.
    let score = 0;
    
    // Facteur saisonnier (exemple)
    const currentMonth = new Date().getMonth();
    if ([6, 7, 11, 0].includes(currentMonth)) { // Été et fin d'année
      score += 30;
    }
    
    // Contraintes spécifiques du projet
    const complexStatuses = ['visa_architecte', 'passation'];
    if (project.status && complexStatuses.includes(project.status)) {
      score += 40;
    }
    
    return Math.min(100, score);
  }

  // ========================================
  // MÉTHODES HELPERS POUR ANALYSE
  // ========================================

  /**
   * Analyse les facteurs de risque d'un projet
   */
  private analyzeRiskFactors(project: Project, delayHistory: any[]): RiskFactor[] {
    const factors: RiskFactor[] = [];

    // Analyse complexité
    if (this.getComplexityScore(project) > 70) {
      factors.push({
        type: 'complexity',
        description: 'Projet de haute complexité technique',
        impact_score: 80,
        likelihood: 70,
        mitigation_suggested: 'Renforcer supervision technique et prévoir temps supplémentaire'
      });
    }

    // Analyse charge équipe
    const teamLoadRisk = this.calculateTeamLoadRisk(project);
    if (teamLoadRisk > 60) {
      factors.push({
        type: 'team_load',
        description: 'Surcharge détectée sur équipe responsable',
        impact_score: teamLoadRisk,
        likelihood: 85,
        mitigation_suggested: 'Rééquilibrer charge ou reporter planning'
      });
    }

    // Analyse historique délais
    const historicalRisk = this.getHistoricalDelayScore(project, delayHistory);
    if (historicalRisk > 50) {
      factors.push({
        type: 'historical_delay',
        description: 'Historique de retards sur projets similaires',
        impact_score: historicalRisk,
        likelihood: 60,
        mitigation_suggested: 'Appliquer mesures préventives des projets précédents'
      });
    }

    return factors;
  }

  /**
   * Prédit les retards et dépassements budgétaires
   */
  private predictDelaysAndOverruns(project: Project, delayHistory: any[]): { delay: number; overrun: number } {
    // Analyse basée sur l'historique de projets similaires
    const similarProjects = delayHistory.filter(h => 
      h.project_type === project.menuiserieType
    );

    let avgDelay = 0;
    let avgOverrun = 0;

    if (similarProjects.length > 0) {
      avgDelay = similarProjects.reduce((sum, p) => sum + p.delay_days, 0) / similarProjects.length;
      // Estimation overrun basée sur délais (approximation)
      avgOverrun = avgDelay * 0.8; // 0.8% par jour de retard
    }

    // Ajustement selon complexité du projet actuel
    const complexityFactor = this.getComplexityScore(project) / 100;
    
    return {
      delay: Math.round(avgDelay * (1 + complexityFactor * 0.5)),
      overrun: Math.round(avgOverrun * (1 + complexityFactor * 0.3))
    };
  }

  /**
   * Génère actions préventives basées sur facteurs de risque
   */
  private generatePreventiveActions(riskFactors: RiskFactor[]): PreventiveAction[] {
    const actions: PreventiveAction[] = [];

    for (const factor of riskFactors) {
      switch (factor.type) {
        case 'complexity':
          actions.push({
            type: 'resource_adjustment',
            description: 'Affecter un expert technique senior au projet',
            urgency: 'high',
            estimated_effort_hours: 40,
            expected_risk_reduction: 30
          });
          break;

        case 'team_load':
          actions.push({
            type: 'timeline_extension',
            description: 'Étaler planning pour réduire pic de charge',
            urgency: 'medium',
            estimated_effort_hours: 8,
            expected_risk_reduction: 40
          });
          break;

        case 'historical_delay':
          actions.push({
            type: 'escalation',
            description: 'Mettre en place suivi hebdomadaire renforcé',
            urgency: 'medium',
            estimated_effort_hours: 20,
            expected_risk_reduction: 25
          });
          break;

        default:
          actions.push({
            type: 'resource_adjustment',
            description: 'Révision générale planning et ressources',
            urgency: 'low',
            estimated_effort_hours: 16,
            expected_risk_reduction: 15
          });
      }
    }

    return actions;
  }

  /**
   * Filtre projets selon paramètres de requête
   */
  private filterProjectsByParams(projects: any[], params: RiskQueryParams): any[] {
    let filtered = projects;

    if (params.project_types) {
      filtered = filtered.filter(p => 
        params.project_types!.includes(p.menuiserieType)
      );
    }

    if (params.user_ids) {
      filtered = filtered.filter(p => 
        params.user_ids!.includes(p.responsibleUserId)
      );
    }

    // Seulement projets actifs
    filtered = filtered.filter(p => 
      !['termine', 'archive', 'sav'].includes(p.status)
    );

    return filtered;
  }

  /**
   * Calcule seuil de risque selon niveau demandé
   */
  private getRiskThreshold(level?: string): number {
    switch (level) {
      case 'low': return 20;
      case 'medium': return 40;
      case 'high': return 60;
      default: return 30; // 'all' ou undefined
    }
  }

  // ========================================
  // MÉTHODES POUR RECOMMANDATIONS BUSINESS
  // ========================================

  /**
   * Récupère KPIs actuels via AnalyticsService
   */
  private async getCurrentKPIs(period: DateRange): Promise<any> {
    try {
      // Utilise l'AnalyticsService existant pour éviter duplication
      const conversionMetric = await this.analyticsService.calculatePipelineConversion(period);
      const delayMetric = await this.analyticsService.calculateAverageDelays(period, 'phase');
      
      return {
        conversion_rate: conversionMetric.globalConversion,
        avg_project_duration: delayMetric.average,
        margin_percentage: 20, // Fallback
        team_efficiency: 75    // Fallback
      };
    } catch (error) {
      console.error('[PredictiveEngine] Erreur récupération KPIs:', error);
      // Fallback avec valeurs par défaut
      return {
        conversion_rate: 25,
        avg_project_duration: 45,
        margin_percentage: 20,
        team_efficiency: 75
      };
    }
  }

  /**
   * Récupère benchmarks secteur
   */
  private async getSectorBenchmarks(): Promise<any> {
    try {
      return await this.storage.getSectorBenchmarks();
    } catch (error) {
      console.error('[PredictiveEngine] Erreur récupération benchmarks:', error);
      // Fallback avec benchmarks standards du secteur
      return {
        industry_avg_conversion: 35,
        avg_duration_benchmark: 40,
        margin_benchmark: 25,
        quality_benchmark: 80,
        efficiency_benchmark: 80
      };
    }
  }

  /**
   * Génère recommandations revenue/conversion
   */
  private async generateRevenueRecommendations(currentKPIs: any, benchmarks: any): Promise<BusinessRecommendation[]> {
    const recommendations: BusinessRecommendation[] = [];

    if (currentKPIs.conversion_rate < benchmarks.industry_avg_conversion) {
      const gap = benchmarks.industry_avg_conversion - currentKPIs.conversion_rate;
      
      recommendations.push({
        id: `revenue_conversion_${Date.now()}`,
        category: 'revenue',
        title: 'Améliorer le taux de conversion AO → Offres',
        description: `Taux actuel: ${currentKPIs.conversion_rate}% vs benchmark: ${benchmarks.industry_avg_conversion}%`,
        rationale: `Écart de ${gap.toFixed(1)}% par rapport au secteur représente un potentiel significatif`,
        priority: gap > 15 ? 'high' : 'medium',
        estimated_impact: {
          revenue_increase: gap * 10000, // Estimation simplifiée
          time_savings: 20
        },
        implementation: {
          effort_estimate_hours: 40,
          required_resources: ['Commercial senior', 'Analyst business'],
          timeline_weeks: 8,
          success_metrics: ['Taux conversion +5%', 'CA additionnel +15%']
        },
        generated_date: new Date().toISOString()
      });
    }

    return recommendations;
  }

  /**
   * Génère recommandations optimisation coûts/délais
   */
  private async generateCostOptimizationRecommendations(currentKPIs: any, benchmarks: any): Promise<BusinessRecommendation[]> {
    const recommendations: BusinessRecommendation[] = [];

    if (currentKPIs.avg_project_duration > benchmarks.avg_duration_benchmark) {
      const excessDays = currentKPIs.avg_project_duration - benchmarks.avg_duration_benchmark;
      
      recommendations.push({
        id: `cost_duration_${Date.now()}`,
        category: 'costs',
        title: 'Réduire durée moyenne des projets',
        description: `Durée actuelle: ${currentKPIs.avg_project_duration}j vs benchmark: ${benchmarks.avg_duration_benchmark}j`,
        rationale: `${excessDays} jours en excès par projet impactent rentabilité et satisfaction client`,
        priority: excessDays > 10 ? 'high' : 'medium',
        estimated_impact: {
          cost_reduction: excessDays * 800, // 800€ par jour économisé
          time_savings: excessDays
        },
        implementation: {
          effort_estimate_hours: 60,
          required_resources: ['Chef de projet', 'Responsable planning'],
          timeline_weeks: 12,
          success_metrics: [`Réduction ${Math.round(excessDays/2)}j par projet`, 'Efficacité +20%']
        },
        generated_date: new Date().toISOString()
      });
    }

    return recommendations;
  }

  /**
   * Génère recommandations planning/ressources
   */
  private async generatePlanningRecommendations(context: BusinessContext): Promise<BusinessRecommendation[]> {
    const recommendations: BusinessRecommendation[] = [];

    try {
      const teamLoad = await this.storage.getTeamLoadHistory({
        start_date: subMonths(new Date(), 1).toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0]
      });

      const overloadedMembers = teamLoad.filter(t => t.utilization_rate > 90);
      
      if (overloadedMembers.length > 0) {
        recommendations.push({
          id: `planning_overload_${Date.now()}`,
          category: 'planning',
          title: 'Rééquilibrer charge équipe',
          description: `${overloadedMembers.length} membre(s) en surcharge (>90%)`,
          rationale: 'Surcharge équipe augmente risques retards et qualité',
          priority: 'high',
          estimated_impact: {
            quality_improvement: 25,
            time_savings: 40
          },
          implementation: {
            effort_estimate_hours: 20,
            required_resources: ['Responsable planning', 'RH'],
            timeline_weeks: 4,
            success_metrics: ['Charge <85% pour tous', 'Qualité +15%']
          },
          generated_date: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('[PredictiveEngine] Erreur recommandations planning:', error);
    }

    return recommendations;
  }

  /**
   * Génère recommandations qualité
   */
  private async generateQualityRecommendations(currentKPIs: any): Promise<BusinessRecommendation[]> {
    const recommendations: BusinessRecommendation[] = [];

    // Exemple de recommandation qualité basée sur les données
    if (currentKPIs.team_efficiency < 75) {
      recommendations.push({
        id: `quality_efficiency_${Date.now()}`,
        category: 'quality',
        title: 'Améliorer efficacité équipe',
        description: `Efficacité actuelle: ${currentKPIs.team_efficiency}% (cible: 80%+)`,
        rationale: 'Efficacité faible impacte délais et satisfaction client',
        priority: 'medium',
        estimated_impact: {
          quality_improvement: 20,
          time_savings: 30
        },
        implementation: {
          effort_estimate_hours: 50,
          required_resources: ['Formation continue', 'Coach qualité'],
          timeline_weeks: 16,
          success_metrics: ['Efficacité >80%', 'Satisfaction +25%']
        },
        generated_date: new Date().toISOString()
      });
    }

    return recommendations;
  }

  /**
   * Vérifie si recommandation répond au seuil de priorité
   */
  private meetsPriorityThreshold(rec: BusinessRecommendation, threshold?: string): boolean {
    if (!threshold) return true;
    
    const priorityLevels = { 'low': 1, 'medium': 2, 'high': 3, 'critical': 4 };
    const recLevel = priorityLevels[rec.priority];
    const thresholdLevel = priorityLevels[threshold];
    
    return recLevel >= thresholdLevel;
  }

  /**
   * Score numérique pour tri par priorité
   */
  private getPriorityScore(priority: string): number {
    const scores = { 'low': 1, 'medium': 2, 'high': 3, 'critical': 4 };
    return scores[priority] || 1;
  }

  // ========================================
  // CALCULS MÉTADONNÉES FORECASTING
  // ========================================

  /**
   * Calcule niveau de confiance des prévisions
   */
  private calculateConfidenceLevel(historical: any[], forecasts: any[]): number {
    if (historical.length < 3) return 40; // Confiance faible si peu de données
    
    // Calcul variance données historiques
    const revenues = historical.map(h => h.total_revenue);
    const mean = revenues.reduce((sum, r) => sum + r, 0) / revenues.length;
    const variance = revenues.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / revenues.length;
    const volatility = Math.sqrt(variance) / mean;
    
    // Confiance inversement proportionnelle à la volatilité
    const baseConfidence = Math.max(50, 100 - (volatility * 100));
    
    // Bonus pour nombre de points de données
    const dataBonus = Math.min(20, historical.length * 2);
    
    return Math.min(95, Math.round(baseConfidence + dataBonus));
  }

  /**
   * Identifie facteurs explicatifs des tendances
   */
  private identifyUnderlyingFactors(historical: any[]): string[] {
    const factors: string[] = [];
    
    if (historical.length < 2) return ['Données insuffisantes'];
    
    // Analyse croissance
    const recent = historical.slice(-3);
    const older = historical.slice(0, -3);
    
    if (recent.length > 0 && older.length > 0) {
      const recentAvg = recent.reduce((sum, h) => sum + h.total_revenue, 0) / recent.length;
      const olderAvg = older.reduce((sum, h) => sum + h.total_revenue, 0) / older.length;
      
      if (recentAvg > olderAvg * 1.1) {
        factors.push('Croissance soutenue récente');
      } else if (recentAvg < olderAvg * 0.9) {
        factors.push('Ralentissement activité');
      } else {
        factors.push('Stabilité revenue');
      }
    }
    
    // Analyse saisonnalité (très simplifiée)
    const currentMonth = new Date().getMonth();
    if ([5, 6, 7].includes(currentMonth)) {
      factors.push('Période estivale (impact potentiel)');
    } else if ([10, 11, 0].includes(currentMonth)) {
      factors.push('Fin d\'année (forte activité)');
    }
    
    // Analyse conversion
    const avgConversion = historical.reduce((sum, h) => sum + h.conversion_rate, 0) / historical.length;
    if (avgConversion > 30) {
      factors.push('Taux conversion performant');
    } else if (avgConversion < 20) {
      factors.push('Taux conversion à améliorer');
    }
    
    return factors.length > 0 ? factors : ['Tendances stables'];
  }

  /**
   * Calcule volatilité historique
   */
  private calculateVolatility(historical: any[]): number {
    if (historical.length < 2) return 50;
    
    const revenues = historical.map(h => h.total_revenue);
    const mean = revenues.reduce((sum, r) => sum + r, 0) / revenues.length;
    const variance = revenues.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / revenues.length;
    
    return Math.min(100, Math.round((Math.sqrt(variance) / mean) * 100));
  }

  /**
   * Détecte direction de tendance
   */
  private detectTrendDirection(historical: any[]): 'up' | 'down' | 'stable' {
    if (historical.length < 3) return 'stable';
    
    const recent = historical.slice(-3);
    const revenues = recent.map(h => h.total_revenue);
    
    const isIncreasing = revenues[2] > revenues[1] && revenues[1] > revenues[0];
    const isDecreasing = revenues[2] < revenues[1] && revenues[1] < revenues[0];
    
    if (isIncreasing) return 'up';
    if (isDecreasing) return 'down';
    return 'stable';
  }

  // ========================================
  // GESTION CACHE AVANCÉE
  // ========================================

  /**
   * Génère clé de cache unique
   */
  private getCacheKey(method: string, params: any): string {
    return `predictive_${method}_${JSON.stringify(params)}`;
  }

  /**
   * Récupère entrée du cache si valide
   */
  private getCachedEntry<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }
    
    entry.hit_count++;
    console.log(`[PredictiveEngine] Cache hit pour ${key} (${entry.hit_count} hits)`);
    return entry.data;
  }

  /**
   * Stocke entrée dans le cache
   */
  private setCacheEntry<T>(key: string, data: T, ttlMinutes: number = this.CACHE_TTL_MINUTES): void {
    const now = Date.now();
    
    // Nettoyage si cache plein
    if (this.cache.size >= this.CACHE_MAX_SIZE) {
      this.cleanupCache();
    }
    
    this.cache.set(key, {
      data,
      expires: now + (ttlMinutes * 60 * 1000),
      created: now,
      hit_count: 0
    });
    
    console.log(`[PredictiveEngine] Cache set pour ${key} (TTL: ${ttlMinutes}min)`);
  }

  /**
   * Nettoyage intelligent du cache
   */
  private cleanupCache(): void {
    const now = Date.now();
    let deletedCount = 0;
    
    // Supprimer entrées expirées
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expires) {
        this.cache.delete(key);
        deletedCount++;
      }
    }
    
    // Si encore trop plein, supprimer les moins utilisées
    if (this.cache.size >= this.CACHE_MAX_SIZE * 0.9) {
      const entries = Array.from(this.cache.entries())
        .sort((a, b) => a[1].hit_count - b[1].hit_count);
      
      const toDelete = Math.floor(this.CACHE_MAX_SIZE * 0.2);
      for (let i = 0; i < toDelete && i < entries.length; i++) {
        this.cache.delete(entries[i][0]);
        deletedCount++;
      }
    }
    
    if (deletedCount > 0) {
      console.log(`[PredictiveEngine] Cache cleanup: ${deletedCount} entrées supprimées`);
    }
  }

  /**
   * Statistiques cache pour monitoring
   */
  public getCacheStats(): { size: number; hitRate: number; avgAge: number } {
    const now = Date.now();
    let totalHits = 0;
    let totalEntries = 0;
    let totalAge = 0;
    
    for (const entry of this.cache.values()) {
      totalHits += entry.hit_count;
      totalEntries++;
      totalAge += (now - entry.created);
    }
    
    return {
      size: this.cache.size,
      hitRate: totalEntries > 0 ? (totalHits / totalEntries) : 0,
      avgAge: totalEntries > 0 ? (totalAge / totalEntries) / 1000 : 0 // en secondes
    };
  }

  // ========================================
  // MÉTHODES HELPER RÉUTILISÉES
  // ========================================

  /**
   * Récupère données historiques revenues mensuels via storage
   */
  private async getMonthlyRevenueHistory(params: { start_date: string; end_date: string }): Promise<MonthlyRevenueData[]> {
    try {
      return await this.storage.getMonthlyRevenueHistory(params);
    } catch (error) {
      console.error('[PredictiveEngine] Erreur récupération historique revenues:', error);
      return [];
    }
  }

  /**
   * Récupère données historiques délais projets via storage
   */
  private async getProjectDelayHistory(params: { start_date: string; end_date: string }): Promise<any[]> {
    try {
      return await this.storage.getProjectDelayHistory(params);
    } catch (error) {
      console.error('[PredictiveEngine] Erreur récupération historique délais:', error);
      return [];
    }
  }
}