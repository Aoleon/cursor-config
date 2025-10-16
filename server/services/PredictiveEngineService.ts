import { IStorage, DateRange, MetricFilters } from "../storage-poc";
import { AnalyticsService } from "./AnalyticsService";
import { getSafetyGuardsService } from "./SafetyGuardsService";
import type { 
  Project, ProjectStatus, User, Offer
} from "@shared/schema";
import { addMonths, subMonths, format } from "date-fns";
import { logger } from '../utils/logger';

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
// ÉTAPE 3 PHASE 3 PERFORMANCE : PRELOADING PRÉDICTIF
// ========================================

// Types pour Heat-Map entités
export interface EntityAccessEntry {
  entityType: 'ao' | 'offer' | 'project' | 'user' | 'document';
  entityId: string;
  accessCount: number;
  lastAccessTime: number; // Timestamp
  hourlyDistribution: number[]; // 24 heures
  weeklyPattern: number[]; // 7 jours
  userAccessFrequency: Record<string, number>; // userId -> fréquence
  contextComplexity: 'low' | 'medium' | 'high'; // Complexité du contexte
}

export interface EntityHeatMap {
  hotEntities: EntityAccessEntry[]; // Entités populaires récentes
  coldEntities: string[]; // Entités à éviter cache
  accessTrends: Record<string, number[]>; // Tendances d'accès temporelles
  peakHours: number[]; // Heures de pointe d'accès (0-23)
  businessHoursMultiplier: number; // Multiplicateur horaires business
  seasonalFactor: number; // Facteur saisonnier menuiserie
}

// Types pour Pattern Analysis
export interface UserAccessPattern {
  userId: string;
  userRole: 'admin' | 'technicien_be' | 'commercial' | 'other';
  typicalSequences: string[][]; // Séquences d'accès typiques
  averageSessionDuration: number; // Minutes
  frequentEntityTypes: Record<string, number>; // Type entité -> pourcentage
  timeOfDayPreference: number[]; // Répartition horaire
  workflowPatterns: BTPWorkflowPattern[];
}

export interface BTPWorkflowPattern {
  name: string; // 'AO_to_Offer', 'Offer_to_Project', etc.
  sequence: string[]; // ['ao:123', 'study', 'offer:456', 'project:789']
  averageTimeBetweenSteps: number[]; // Minutes entre chaque étape
  successRate: number; // Pourcentage de complétion
  seasonalVariation: Record<string, number>; // Variation par mois
  complexityImpact: Record<string, number>; // Impact selon complexité
}

// Types pour Preloading Tasks
export interface PreloadingTask {
  id: string;
  entityType: string;
  entityId: string;
  predictedAccessTime: number; // Timestamp prévu
  priority: 'low' | 'medium' | 'high' | 'critical';
  confidence: number; // 0-100
  triggerEvent?: string; // Événement déclencheur
  estimatedExecutionTime: number; // Millisecondes
  maxRetries: number;
  contextConfig: any; // Configuration contexte à preloader
}

export interface PreloadingSchedule {
  activeTasks: PreloadingTask[];
  scheduledTasks: PreloadingTask[];
  completedTasks: PreloadingTask[];
  failedTasks: PreloadingTask[];
  businessHoursSchedule: PreloadingTask[]; // Tâches horaires business
  adaptiveSchedule: PreloadingTask[]; // Tâches adaptatives
}

// Types pour prédictions d'accès
export interface AccessPrediction {
  entityType: string;
  entityId: string;
  predictedAccessTime: number; // Timestamp
  confidence: number; // 0-100
  triggerPattern: string; // Pattern déclencheur
  contextRequirements: string[]; // Types de contexte nécessaires
  userContext: {
    userId?: string;
    role?: string;
    currentWorkflow?: string;
  };
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
  
  // ÉTAPE 3 PHASE 3 PERFORMANCE : Safety Guards intégration
  private safetyGuards: any;

  // ÉTAPE 3 PHASE 3 PERFORMANCE : Preloading prédictif
  private entityAccessLog: Map<string, EntityAccessEntry> = new Map();
  private userAccessPatterns: Map<string, UserAccessPattern> = new Map();
  private btpWorkflowPatterns: Map<string, BTPWorkflowPattern> = new Map();
  private preloadingSchedule: PreloadingSchedule;
  private contextCacheService: any = null; // Référence vers ContextCacheService
  
  // Configuration preloading
  private readonly HEATMAP_RETENTION_HOURS = 72; // 3 jours
  private readonly PATTERN_ANALYSIS_WINDOW_DAYS = 30;
  private readonly PRELOADING_CONFIDENCE_THRESHOLD = 60; // Minimum 60%
  private readonly MAX_CONCURRENT_PRELOADS = 5;
  private readonly BUSINESS_HOURS = [8, 9, 10, 11, 14, 15, 16, 17]; // 8h-12h, 14h-18h
  
  // Safety guards
  private preloadingEnabled = true;
  private currentPreloadingLoad = 0;
  private lastPatternUpdate = 0;

  constructor(storage: IStorage, analyticsService: AnalyticsService) {
    this.storage = storage;
    this.analyticsService = analyticsService;
    this.cache = new Map();
    
    // ÉTAPE 3 PHASE 3 PERFORMANCE : Intégration SafetyGuards
    this.safetyGuards = getSafetyGuardsService(storage);
    
    // Initialisation preloading schedule
    this.preloadingSchedule = {
      activeTasks: [],
      scheduledTasks: [],
      completedTasks: [],
      failedTasks: [],
      businessHoursSchedule: [],
      adaptiveSchedule: []
    };
    
    // Cleanup cache périodique
    setInterval(() => this.cleanupCache(), 5 * 60 * 1000); // Toutes les 5 minutes
    
    // ÉTAPE 3 : Cleanup et mise à jour patterns
    setInterval(() => this.cleanupEntityAccess(), 30 * 60 * 1000); // Toutes les 30 minutes
    setInterval(() => this.updateBTPPatterns(), 2 * 60 * 60 * 1000); // Toutes les 2 heures
    
    logger.info('Service initialisé avec preloading prédictif', {
      metadata: {
        service: 'PredictiveEngineService',
        operation: 'constructor'
      }
    });
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
      logger.info('Cache hit', {
      metadata: {
        service: 'PredictiveEngineService',
        operation: 'forecastRevenue',
        cacheHit: true
      }
    });
      return cached;
    }

    try {
      logger.info('Calcul forecast revenue', {
      metadata: {
        service: 'PredictiveEngineService',
        operation: 'forecastRevenue',
        params
      }
    });
      
      // 1. RÉCUPÉRATION DONNÉES HISTORIQUES
      const historicalData = await this.getMonthlyRevenueHistory({
        start_date: params.start_date,
        end_date: params.end_date
      });

      if (historicalData.length === 0) {
        logger.info('Aucune donnée historique trouvée', {
      metadata: {
        service: 'PredictiveEngineService',
        operation: 'forecastRevenue'
      }
    });
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
      
      logger.info('Forecast calculé', {
      metadata: {
        service: 'PredictiveEngineService',
        operation: 'forecastRevenue',
        forecastCount: results.length
      }
    });
      return results;

    } catch (error) {
      logger.error('Erreur calcul forecast revenue', {
      metadata: {
        service: 'PredictiveEngineService',
        operation: 'forecastRevenue',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }
    });
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
      logger.info('Cache hit', {
      metadata: {
        service: 'PredictiveEngineService',
        operation: 'detectProjectRisks',
        cacheHit: true
      }
    });
      return cached;
    }

    try {
      logger.info('Détection risques projets', {
      metadata: {
        service: 'PredictiveEngineService',
        operation: 'detectProjectRisks',
        params
      }
    });

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
      
      logger.info('Risques détectés', {
      metadata: {
        service: 'PredictiveEngineService',
        operation: 'detectProjectRisks',
        risksCount: results.length
      }
    });
      return results;

    } catch (error) {
      logger.error('Erreur détection risques', {
      metadata: {
        service: 'PredictiveEngineService',
        operation: 'detectProjectRisks',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }
    });
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
      logger.info('Cache hit', {
      metadata: {
        service: 'PredictiveEngineService',
        operation: 'generateBusinessRecommendations',
        cacheHit: true
      }
    });
      return cached;
    }

    try {
      logger.info('Génération recommandations business', {
      metadata: {
        service: 'PredictiveEngineService',
        operation: 'generateBusinessRecommendations',
        context
      }
    });

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
      
      logger.info('Recommandations générées', {
      metadata: {
        service: 'PredictiveEngineService',
        operation: 'generateBusinessRecommendations',
        recommendationsCount: filteredRecs.length
      }
    });
      return filteredRecs;

    } catch (error) {
      logger.error('Erreur génération recommandations', {
      metadata: {
        service: 'PredictiveEngineService',
        operation: 'generateBusinessRecommendations',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }
    });
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
      logger.error('Erreur récupération KPIs', {
      metadata: {
        service: 'PredictiveEngineService',
        operation: 'getCurrentKPIs',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }
    });
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
      logger.error('Erreur récupération benchmarks', {
      metadata: {
        service: 'PredictiveEngineService',
        operation: 'getIndustryBenchmarks',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }
    });
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
      logger.error('Erreur recommandations planning', {
      metadata: {
        service: 'PredictiveEngineService',
        operation: 'generatePlanningRecommendations',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }
    });
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
    logger.info('Cache hit', {
      metadata: {
        service: 'PredictiveEngineService',
        operation: 'getCachedEntry',
        cacheKey: key,
        hitCount: entry.hit_count
      }
    });
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
    
    logger.info('Cache set', {
      metadata: {
        service: 'PredictiveEngineService',
        operation: 'setCacheEntry',
        cacheKey: key,
        ttlMinutes
      }
    });
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
      logger.info('Cache cleanup', {
      metadata: {
        service: 'PredictiveEngineService',
        operation: 'cleanupCache',
        deletedCount
      }
    });
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
      logger.error('Erreur récupération historique revenues', {
      metadata: {
        service: 'PredictiveEngineService',
        operation: 'getMonthlyRevenueHistory',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }
    });
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
      logger.error('Erreur récupération historique délais', {
      metadata: {
        service: 'PredictiveEngineService',
        operation: 'getProjectDelayHistory',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }
    });
      return [];
    }
  }

  // ========================================
  // ÉTAPE 3 PHASE 3 PERFORMANCE : PRELOADING PRÉDICTIF
  // ========================================

  /**
   * Intégration avec ContextCacheService pour preloading
   */
  public integrateWithContextCache(contextCacheService: any): void {
    this.contextCacheService = contextCacheService;
    logger.info('Intégration ContextCacheService activée', {
      metadata: {
        service: 'PredictiveEngineService',
        operation: 'integrateWithContextCache'
      }
    });
  }

  /**
   * MÉTHODE PRINCIPALE 1 : Génération Heat-Map des entités
   * Analyse les accès récents aux entités pour identifier les patterns d'accès
   */
  async generateEntityHeatMap(): Promise<EntityHeatMap> {
    const cacheKey = 'entity_heatmap_current';
    const cached = this.getCachedEntry<EntityHeatMap>(cacheKey);
    
    if (cached) {
      logger.info('Cache hit pour entity heatmap', {
      metadata: {
        service: 'PredictiveEngineService',
        operation: 'generateEntityHeatMap',
        cacheHit: true
      }
    });
      return cached;
    }

    try {
      logger.info('Génération heat-map entités', {
      metadata: {
        service: 'PredictiveEngineService',
        operation: 'generateEntityHeatMap'
      }
    });
      
      // 1. ANALYSE ENTITÉS POPULAIRES RÉCENTES
      const now = Date.now();
      const cutoffTime = now - (this.HEATMAP_RETENTION_HOURS * 60 * 60 * 1000);
      
      const hotEntities: EntityAccessEntry[] = [];
      const coldEntities: string[] = [];
      const accessTrends: Record<string, number[]> = {};
      
      // Analyser les logs d'accès
      for (const [entityKey, accessEntry] of this.entityAccessLog.entries()) {
        if (accessEntry.lastAccessTime > cutoffTime) {
          // Entité active récente
          if (accessEntry.accessCount >= 5) { // Seuil pour entité "chaude"
            hotEntities.push(accessEntry);
          }
          
          // Analyse tendances
          const trend = this.calculateAccessTrend(accessEntry);
          accessTrends[entityKey] = trend;
        } else {
          // Entité froide à éviter en cache
          coldEntities.push(entityKey);
        }
      }

      // 2. IDENTIFICATION HEURES DE POINTE
      const peakHours = this.identifyPeakHours(hotEntities);
      
      // 3. CALCUL MULTIPLICATEURS BUSINESS
      const businessHoursMultiplier = this.calculateBusinessHoursMultiplier();
      const seasonalFactor = this.calculateSeasonalFactor();
      
      // 4. TRI PAR POPULARITÉ ET RÉCENCE
      hotEntities.sort((a, b) => {
        const scoreA = this.calculateEntityPopularityScore(a);
        const scoreB = this.calculateEntityPopularityScore(b);
        return scoreB - scoreA;
      });

      const heatMap: EntityHeatMap = {
        hotEntities: hotEntities.slice(0, 50), // Top 50 entités chaudes
        coldEntities: coldEntities.slice(0, 100), // Top 100 entités froides
        accessTrends,
        peakHours,
        businessHoursMultiplier,
        seasonalFactor
      };

      // 5. MISE EN CACHE
      this.setCacheEntry(cacheKey, heatMap, 15); // Cache 15 minutes

      logger.info('Heat-map générée', {
      metadata: {
        service: 'PredictiveEngineService',
        operation: 'generateEntityHeatMap',
        hotEntitiesCount: hotEntities.length,
        coldEntitiesCount: coldEntities.length
      }
    });
      return heatMap;

    } catch (error) {
      logger.error('Erreur génération heat-map', {
      metadata: {
        service: 'PredictiveEngineService',
        operation: 'generateEntityHeatMap',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }
    });
      
      // Fallback heat-map vide
      return {
        hotEntities: [],
        coldEntities: [],
        accessTrends: {},
        peakHours: this.BUSINESS_HOURS,
        businessHoursMultiplier: 1.0,
        seasonalFactor: 1.0
      };
    }
  }

  /**
   * MÉTHODE PRINCIPALE 2 : Prédiction d'accès aux entités
   * Prédit les prochains accès selon les patterns utilisateur BTP
   */
  async predictNextEntityAccess(
    userId?: string,
    currentContext?: { entityType: string; entityId: string; workflow?: string }
  ): Promise<AccessPrediction[]> {
    try {
      logger.info('Prédiction accès entités', {
      metadata: {
        service: 'PredictiveEngineService',
        operation: 'predictNextEntityAccess',
        userId
      }
    });
      
      const predictions: AccessPrediction[] = [];
      const now = Date.now();
      
      // 1. RÉCUPÉRATION PATTERNS UTILISATEUR
      const userPattern = userId ? this.userAccessPatterns.get(userId) : null;
      
      if (userPattern) {
        // Prédictions basées sur patterns utilisateur spécifiques
        const userPredictions = await this.predictFromUserPatterns(userPattern, currentContext, now);
        predictions.push(...userPredictions);
      }
      
      // 2. PRÉDICTIONS WORKFLOWS BTP TYPIQUES
      const workflowPredictions = await this.predictFromBTPWorkflows(currentContext, now);
      predictions.push(...workflowPredictions);
      
      // 3. PRÉDICTIONS SAISONNALITÉ ET TIMING
      const temporalPredictions = await this.predictFromTemporalPatterns(now);
      predictions.push(...temporalPredictions);
      
      // 4. PRÉDICTIONS BASED ON HEAT-MAP
      const heatMapPredictions = await this.predictFromHeatMap(now);
      predictions.push(...heatMapPredictions);
      
      // 5. FILTRAGE ET SCORING
      const filteredPredictions = predictions
        .filter(p => p.confidence >= this.PRELOADING_CONFIDENCE_THRESHOLD)
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 20); // Top 20 prédictions

      logger.info('Prédictions générées', {
      metadata: {
        service: 'PredictiveEngineService',
        operation: 'predictNextEntityAccess',
        predictionsCount: filteredPredictions.length,
        confidenceThreshold: this.PRELOADING_CONFIDENCE_THRESHOLD
      }
    });
      return filteredPredictions;

    } catch (error) {
      logger.error('Erreur prédiction accès', {
      metadata: {
        service: 'PredictiveEngineService',
        operation: 'predictNextEntityAccess',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }
    });
      return [];
    }
  }

  /**
   * MÉTHODE PRINCIPALE 3 : Programmation des tâches de preloading
   * Planifie les tâches de preloading background adaptatif
   */
  async schedulePreloadTasks(predictions: AccessPrediction[]): Promise<void> {
    if (!this.preloadingEnabled || !this.contextCacheService) {
      logger.info('Preloading désactivé ou ContextCache non disponible', {
      metadata: {
        service: 'PredictiveEngineService',
        operation: 'schedulePreloadTasks'
      }
    });
      return;
    }

    try {
      logger.info('Programmation tâches preloading', {
      metadata: {
        service: 'PredictiveEngineService',
        operation: 'schedulePreloadTasks',
        predictionsCount: predictions.length
      }
    });
      
      const now = Date.now();
      const newTasks: PreloadingTask[] = [];
      
      // 1. CRÉATION TÂCHES SELON PRÉDICTIONS
      for (const prediction of predictions) {
        // Vérifier si pas déjà en cours ou programmée
        const existingTask = this.preloadingSchedule.activeTasks
          .concat(this.preloadingSchedule.scheduledTasks)
          .find(t => t.entityType === prediction.entityType && t.entityId === prediction.entityId);
          
        if (existingTask) {
          continue; // Éviter duplicatas
        }
        
        // Calculer timing optimal
        const delay = Math.max(0, prediction.predictedAccessTime - now - (30 * 1000)); // 30s avant accès prévu
        
        const task: PreloadingTask = {
          id: `preload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          entityType: prediction.entityType,
          entityId: prediction.entityId,
          predictedAccessTime: prediction.predictedAccessTime,
          priority: this.calculateTaskPriority(prediction),
          confidence: prediction.confidence,
          triggerEvent: prediction.triggerPattern,
          estimatedExecutionTime: this.estimatePreloadTime(prediction),
          maxRetries: 2,
          contextConfig: this.generateContextConfig(prediction)
        };
        
        newTasks.push(task);
      }
      
      // 2. AJOUT AUX SCHEDULES APPROPRIÉS
      for (const task of newTasks) {
        if (this.isBusinessHours(task.predictedAccessTime)) {
          this.preloadingSchedule.businessHoursSchedule.push(task);
        } else {
          this.preloadingSchedule.adaptiveSchedule.push(task);
        }
        
        this.preloadingSchedule.scheduledTasks.push(task);
      }
      
      // 3. DÉMARRAGE EXÉCUTION IMMÉDIATE DES TÂCHES PRIORITAIRES
      await this.executeHighPriorityTasks();
      
      // 4. PROGRAMMATION TÂCHES DIFFÉRÉES
      this.scheduleDelayedTasks();
      
      logger.info('Nouvelles tâches programmées', {
      metadata: {
        service: 'PredictiveEngineService',
        operation: 'schedulePreloadTasks',
        newTasksCount: newTasks.length
      }
    });

    } catch (error) {
      logger.error('Erreur programmation tâches preloading', {
      metadata: {
        service: 'PredictiveEngineService',
        operation: 'schedulePreloadTasks',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }
    });
    }
  }

  /**
   * Enregistre un accès à une entité pour le tracking
   */
  public recordEntityAccess(
    entityType: string,
    entityId: string,
    userId?: string,
    contextComplexity: 'low' | 'medium' | 'high' = 'medium'
  ): void {
    const entityKey = `${entityType}:${entityId}`;
    const now = Date.now();
    const currentHour = new Date().getHours();
    const currentDay = new Date().getDay();
    
    let entry = this.entityAccessLog.get(entityKey);
    
    if (!entry) {
      entry = {
        entityType: entityType as any,
        entityId,
        accessCount: 0,
        lastAccessTime: now,
        hourlyDistribution: new Array(24).fill(0),
        weeklyPattern: new Array(7).fill(0),
        userAccessFrequency: {},
        contextComplexity
      };
    }
    
    // Mise à jour statistiques
    entry.accessCount++;
    entry.lastAccessTime = now;
    entry.hourlyDistribution[currentHour]++;
    entry.weeklyPattern[currentDay]++;
    
    if (userId) {
      entry.userAccessFrequency[userId] = (entry.userAccessFrequency[userId] || 0) + 1;
    }
    
    this.entityAccessLog.set(entityKey, entry);
    
    // Mise à jour patterns utilisateur si applicable
    if (userId) {
      this.updateUserAccessPattern(userId, entityType, entityId, now);
    }
  }

  // ========================================
  // MÉTHODES HELPER POUR PRELOADING PRÉDICTIF
  // ========================================

  /**
   * Calcule le score de popularité d'une entité
   */
  private calculateEntityPopularityScore(entry: EntityAccessEntry): number {
    const now = Date.now();
    const ageHours = (now - entry.lastAccessTime) / (60 * 60 * 1000);
    
    // Score basé sur accès récents et fréquence
    const recencyScore = Math.max(0, 100 - (ageHours * 2)); // Dégrade avec le temps
    const frequencyScore = Math.min(100, entry.accessCount * 5); // Max 100
    const complexityBonus = entry.contextComplexity === 'high' ? 20 : 
                          entry.contextComplexity === 'medium' ? 10 : 0;
    
    return recencyScore * 0.4 + frequencyScore * 0.4 + complexityBonus * 0.2;
  }

  /**
   * Identifie les heures de pointe d'accès
   */
  private identifyPeakHours(hotEntities: EntityAccessEntry[]): number[] {
    const hourlyTotals = new Array(24).fill(0);
    
    for (const entity of hotEntities) {
      for (let hour = 0; hour < 24; hour++) {
        hourlyTotals[hour] += entity.hourlyDistribution[hour];
      }
    }
    
    // Identifier heures avec >75% du pic d'activité
    const maxActivity = Math.max(...hourlyTotals);
    const threshold = maxActivity * 0.75;
    
    const peakHours: number[] = [];
    for (let hour = 0; hour < 24; hour++) {
      if (hourlyTotals[hour] >= threshold) {
        peakHours.push(hour);
      }
    }
    
    return peakHours.length > 0 ? peakHours : this.BUSINESS_HOURS;
  }

  /**
   * Calcule la tendance d'accès d'une entité
   */
  private calculateAccessTrend(entry: EntityAccessEntry): number[] {
    // Simuler tendance sur les 7 derniers jours
    const trend: number[] = [];
    const now = Date.now();
    
    for (let i = 6; i >= 0; i--) {
      const dayAccess = entry.weeklyPattern[new Date(now - i * 24 * 60 * 60 * 1000).getDay()];
      trend.push(dayAccess);
    }
    
    return trend;
  }

  /**
   * Calcule multiplicateur horaires business
   */
  private calculateBusinessHoursMultiplier(): number {
    const currentHour = new Date().getHours();
    
    if (this.BUSINESS_HOURS.includes(currentHour)) {
      return 1.5; // 50% de boost pendant horaires business
    }
    
    return 1.0;
  }

  /**
   * Calcule facteur saisonnier menuiserie
   */
  private calculateSeasonalFactor(): number {
    const currentMonth = new Date().getMonth();
    
    // Saisonnalité menuiserie française
    const seasonalFactors = {
      0: 0.8,  // Janvier - ralenti post-fêtes
      1: 0.9,  // Février
      2: 1.1,  // Mars - reprise activité
      3: 1.2,  // Avril - pic printanier
      4: 1.3,  // Mai - forte activité
      5: 1.1,  // Juin
      6: 0.8,  // Juillet - vacances été
      7: 0.7,  // Août - congés
      8: 1.2,  // Septembre - reprise forte
      9: 1.3,  // Octobre - pic automnal
      10: 1.1, // Novembre
      11: 0.9  // Décembre - ralenti fêtes
    };
    
    return seasonalFactors[currentMonth] || 1.0;
  }

  /**
   * Met à jour les patterns d'accès utilisateur
   */
  private updateUserAccessPattern(userId: string, entityType: string, entityId: string, timestamp: number): void {
    let pattern = this.userAccessPatterns.get(userId);
    
    if (!pattern) {
      pattern = {
        userId,
        userRole: 'other', // À déterminer via storage si nécessaire
        typicalSequences: [],
        averageSessionDuration: 0,
        frequentEntityTypes: {},
        timeOfDayPreference: new Array(24).fill(0),
        workflowPatterns: []
      };
    }
    
    // Mise à jour fréquence types d'entités
    pattern.frequentEntityTypes[entityType] = (pattern.frequentEntityTypes[entityType] || 0) + 1;
    
    // Mise à jour préférences horaires
    const hour = new Date(timestamp).getHours();
    pattern.timeOfDayPreference[hour]++;
    
    this.userAccessPatterns.set(userId, pattern);
  }

  /**
   * Prédit accès basé sur patterns utilisateur
   */
  private async predictFromUserPatterns(
    userPattern: UserAccessPattern,
    currentContext: any,
    now: number
  ): Promise<AccessPrediction[]> {
    const predictions: AccessPrediction[] = [];
    
    // Analyser séquences typiques de cet utilisateur
    for (const sequence of userPattern.typicalSequences) {
      if (currentContext && sequence.includes(`${currentContext.entityType}:${currentContext.entityId}`)) {
        // Identifier prochaine étape probable dans la séquence
        const currentIndex = sequence.findIndex(s => s === `${currentContext.entityType}:${currentContext.entityId}`);
        if (currentIndex >= 0 && currentIndex < sequence.length - 1) {
          const nextStep = sequence[currentIndex + 1];
          const [nextEntityType, nextEntityId] = nextStep.split(':');
          
          predictions.push({
            entityType: nextEntityType,
            entityId: nextEntityId,
            predictedAccessTime: now + (5 * 60 * 1000), // 5 minutes
            confidence: 75,
            triggerPattern: 'user_sequence',
            contextRequirements: ['comprehensive'],
            userContext: {
              userId: userPattern.userId,
              role: userPattern.userRole,
              currentWorkflow: currentContext.workflow
            }
          });
        }
      }
    }
    
    return predictions;
  }

  /**
   * ÉTAPE 3 BUSINESS PATTERN RECOGNITION : Prédit accès basé sur workflows BTP typiques
   * Analyse sophistiquée des séquences métier menuiserie française
   */
  private async predictFromBTPWorkflows(currentContext: any, now: number): Promise<AccessPrediction[]> {
    const predictions: AccessPrediction[] = [];
    
    if (!currentContext) return predictions;
    
    // 1. WORKFLOWS BTP MENUISERIE FRANÇAISE SOPHISTIQUÉS
    const menuiserieWorkflows = {
      // Séquence complète AO → Projet → Chantier
      'ao_initial_study': {
        from: 'ao',
        to: 'etude_technique',
        avgDelayMinutes: 20,
        confidence: 85,
        seasonalMultiplier: this.getSeasonalMultiplier('study'),
        userRoleMultiplier: { 'technicien_be': 1.2, 'admin': 1.0, 'commercial': 0.8 }
      },
      'study_to_chiffrage': {
        from: 'etude_technique',
        to: 'chiffrage',
        avgDelayMinutes: 45,
        confidence: 82,
        complexity: 'high',
        businessHoursDependency: true
      },
      'chiffrage_to_offer': {
        from: 'chiffrage',
        to: 'offer',
        avgDelayMinutes: 60,
        confidence: 78,
        requiresValidation: true,
        userRoleMultiplier: { 'commercial': 1.3, 'admin': 1.1, 'technicien_be': 0.7 }
      },
      'offer_negotiation': {
        from: 'offer',
        to: 'negotiation',
        avgDelayMinutes: 90,
        confidence: 70,
        clientInteractionRequired: true
      },
      'offer_to_project': {
        from: 'offer',
        to: 'project',
        avgDelayMinutes: 120,
        confidence: 75,
        dependsOnAcceptation: true,
        seasonalMultiplier: this.getSeasonalMultiplier('project_start')
      },
      'project_to_planning': {
        from: 'project',
        to: 'planning',
        avgDelayMinutes: 30,
        confidence: 80,
        userRoleMultiplier: { 'admin': 1.2, 'technicien_be': 1.0, 'commercial': 0.6 }
      },
      'planning_to_approvisionnement': {
        from: 'planning',
        to: 'approvisionnement',
        avgDelayMinutes: 60,
        confidence: 85,
        supplierDependency: true
      },
      'approvisionnement_to_chantier': {
        from: 'approvisionnement',
        to: 'chantier',
        avgDelayMinutes: 180,
        confidence: 75,
        weatherDependency: true,
        seasonalMultiplier: this.getSeasonalMultiplier('construction')
      },
      'chantier_to_quality_control': {
        from: 'chantier',
        to: 'controle_qualite',
        avgDelayMinutes: 45,
        confidence: 88,
        qualityCheckRequired: true
      },
      'quality_to_livraison': {
        from: 'controle_qualite',
        to: 'livraison',
        avgDelayMinutes: 30,
        confidence: 90,
        finalStep: true
      },

      // Workflows parallèles et alternatifs
      'ao_to_supplier_check': {
        from: 'ao',
        to: 'supplier',
        avgDelayMinutes: 25,
        confidence: 65,
        parallelWorkflow: true
      },
      'project_to_team_assignment': {
        from: 'project',
        to: 'team',
        avgDelayMinutes: 15,
        confidence: 82,
        resourceAllocation: true
      },
      'offer_to_client_meeting': {
        from: 'offer',
        to: 'client_meeting',
        avgDelayMinutes: 240,
        confidence: 60,
        schedulingDependent: true
      }
    };

    // 2. ANALYSE CONTEXTE ACTUEL ET PRÉDICTIONS
    for (const [workflowName, workflow] of Object.entries(menuiserieWorkflows)) {
      if (currentContext.entityType === workflow.from || 
          this.isWorkflowContextMatch(currentContext, workflow)) {
        
        // Calcul confiance ajustée selon facteurs
        let adjustedConfidence = workflow.confidence;
        
        // Ajustement saisonnier
        if (workflow.seasonalMultiplier) {
          adjustedConfidence *= workflow.seasonalMultiplier;
        }
        
        // Ajustement selon rôle utilisateur
        if (workflow.userRoleMultiplier && currentContext.userRole) {
          const roleMultiplier = workflow.userRoleMultiplier[currentContext.userRole] || 1.0;
          adjustedConfidence *= roleMultiplier;
        }
        
        // Ajustement horaires business
        if (workflow.businessHoursDependency) {
          const businessFactor = this.isBusinessHours(now) ? 1.2 : 0.7;
          adjustedConfidence *= businessFactor;
        }
        
        // Calcul délai ajusté
        let adjustedDelay = workflow.avgDelayMinutes;
        
        // Ajustement selon charge système
        if (workflow.complexity === 'high') {
          adjustedDelay *= this.getSystemLoadMultiplier();
        }
        
        // Ajustement saisonnier délai
        if (workflow.seasonalMultiplier) {
          adjustedDelay *= workflow.seasonalMultiplier;
        }

        const prediction: AccessPrediction = {
          entityType: workflow.to,
          entityId: await this.predictEntityId(workflow.to, currentContext),
          predictedAccessTime: now + (adjustedDelay * 60 * 1000),
          confidence: Math.min(95, Math.max(50, adjustedConfidence)),
          triggerPattern: `menuiserie_workflow_${workflowName}`,
          contextRequirements: this.determineContextRequirements(workflow),
          userContext: {
            userId: currentContext.userId,
            role: currentContext.userRole,
            currentWorkflow: workflowName
          }
        };

        // Métadonnées BTP spécialisées
        (prediction as any).btpMetadata = {
          workflowStage: workflow.to,
          estimatedDuration: this.estimateWorkflowStageDuration(workflow.to),
          dependencies: this.getWorkflowDependencies(workflow),
          criticalPath: this.isOnCriticalPath(workflowName),
          resourceRequirements: this.getResourceRequirements(workflow.to)
        };

        predictions.push(prediction);
      }
    }

    // 3. PRÉDICTIONS PATTERNS UTILISATEUR SPÉCIALISÉS
    const userRolePredictions = await this.predictFromUserRolePatterns(currentContext, now);
    predictions.push(...userRolePredictions);

    // 4. PRÉDICTIONS SAISONNALITÉ MENUISERIE
    const seasonalPredictions = await this.predictFromSeasonalPatterns(currentContext, now);
    predictions.push(...seasonalPredictions);

    return predictions;
  }

  /**
   * Prédictions basées sur patterns spécifiques aux rôles utilisateur BTP
   */
  private async predictFromUserRolePatterns(currentContext: any, now: number): Promise<AccessPrediction[]> {
    const predictions: AccessPrediction[] = [];
    const userRole = currentContext.userRole || 'other';
    
    const rolePatterns = {
      'admin': {
        morningRoutine: ['dashboard', 'ao', 'project', 'team'],
        afternoonRoutine: ['report', 'planning', 'supplier'],
        preferredHours: [8, 9, 10, 14, 15, 16],
        avgSessionDuration: 45,
        multitaskingProbability: 0.8
      },
      'technicien_be': {
        morningRoutine: ['ao', 'etude_technique', 'chiffrage'],
        afternoonRoutine: ['planning', 'technical_validation', 'supplier'],
        preferredHours: [8, 9, 10, 11, 14, 15],
        avgSessionDuration: 60,
        technicalFocus: true,
        deepWorkPeriods: [9, 10, 14, 15]
      },
      'commercial': {
        morningRoutine: ['ao', 'client', 'offer'],
        afternoonRoutine: ['client_meeting', 'offer', 'negotiation'],
        preferredHours: [9, 10, 11, 14, 15, 16, 17],
        avgSessionDuration: 30,
        clientInteractionFocus: true,
        travelTime: [11, 12, 16, 17]
      },
      'chef_chantier': {
        morningRoutine: ['chantier', 'planning', 'team'],
        afternoonRoutine: ['chantier', 'progress_report', 'quality_control'],
        preferredHours: [7, 8, 9, 13, 14, 15],
        avgSessionDuration: 20,
        fieldWorkFocus: true,
        mobileAccess: true
      }
    };

    const pattern = rolePatterns[userRole];
    if (!pattern) return predictions;

    const currentHour = new Date(now).getHours();
    
    // Prédictions selon routine matinale/après-midi
    const isAfternoon = currentHour >= 14;
    const routine = isAfternoon ? pattern.afternoonRoutine : pattern.morningRoutine;
    
    for (let i = 0; i < routine.length; i++) {
      const nextEntityType = routine[i];
      const baseDelay = (i + 1) * 15; // 15 min entre chaque étape
      
      let confidence = 70 - (i * 10); // Décroissance confiance
      
      // Boost confiance si dans heures préférées
      if (pattern.preferredHours.includes(currentHour)) {
        confidence += 15;
      }
      
      // Boost pour focus spécialisés
      if (pattern.technicalFocus && ['etude_technique', 'chiffrage', 'planning'].includes(nextEntityType)) {
        confidence += 10;
      }
      if (pattern.clientInteractionFocus && ['client', 'offer', 'negotiation'].includes(nextEntityType)) {
        confidence += 10;
      }
      
      predictions.push({
        entityType: nextEntityType,
        entityId: await this.predictEntityId(nextEntityType, currentContext),
        predictedAccessTime: now + (baseDelay * 60 * 1000),
        confidence: Math.min(90, confidence),
        triggerPattern: `user_role_${userRole}_routine`,
        contextRequirements: pattern.technicalFocus ? ['comprehensive'] : ['standard'],
        userContext: {
          userId: currentContext.userId,
          role: userRole,
          currentWorkflow: `${userRole}_routine`
        }
      });
    }

    return predictions;
  }

  /**
   * Prédictions saisonnalité spécifique menuiserie française
   */
  private async predictFromSeasonalPatterns(currentContext: any, now: number): Promise<AccessPrediction[]> {
    const predictions: AccessPrediction[] = [];
    const currentMonth = new Date(now).getMonth();
    const currentHour = new Date(now).getHours();
    
    // Patterns saisonniers menuiserie française
    const seasonalBehaviors = {
      // Printemps - forte activité
      spring: {
        months: [2, 3, 4], // Mars, Avril, Mai
        peakEntities: ['ao', 'etude_technique', 'offer'],
        averageIncrease: 1.3,
        preferredStartTimes: [8, 9],
        extendedHours: true
      },
      // Été - vacances mais urgences
      summer: {
        months: [5, 6, 7], // Juin, Juillet, Août
        peakEntities: ['chantier', 'livraison'],
        averageIncrease: 0.7,
        reducedHours: [12, 13, 14, 15], // Pause déjeuner étendue
        urgencyMode: true
      },
      // Automne - pic d'activité pré-hiver
      autumn: {
        months: [8, 9, 10], // Sept, Oct, Nov
        peakEntities: ['ao', 'project', 'planning', 'chantier'],
        averageIncrease: 1.4,
        intensiveMode: true,
        extendedHours: true
      },
      // Hiver - ralentissement et planification
      winter: {
        months: [11, 0, 1], // Déc, Jan, Fév
        peakEntities: ['planning', 'etude_technique', 'formation'],
        averageIncrease: 0.8,
        planningFocus: true,
        shortenedDays: true
      }
    };

    // Identifier saison actuelle
    let currentSeason = null;
    for (const [season, config] of Object.entries(seasonalBehaviors)) {
      if (config.months.includes(currentMonth)) {
        currentSeason = { name: season, config };
        break;
      }
    }

    if (!currentSeason) return predictions;

    const { config } = currentSeason;

    // Prédictions selon comportements saisonniers
    for (const entityType of config.peakEntities) {
      let confidence = 65 * config.averageIncrease;
      let delay = 30; // Délai de base 30 minutes

      // Ajustements selon heure
      if (config.preferredStartTimes?.includes(currentHour)) {
        confidence += 15;
        delay = 15; // Plus rapide aux heures préférées
      }

      if (config.reducedHours?.includes(currentHour)) {
        confidence *= 0.6; // Réduction pendant pause déjeuner été
        delay *= 2;
      }

      if (config.extendedHours && (currentHour >= 18 || currentHour <= 7)) {
        confidence *= 1.2; // Boost heures étendues printemps/automne
      }

      // Mode urgence été
      if (config.urgencyMode && entityType === 'chantier') {
        confidence += 20;
        delay *= 0.5;
      }

      // Focus planification hiver
      if (config.planningFocus && ['planning', 'etude_technique'].includes(entityType)) {
        confidence += 15;
      }

      predictions.push({
        entityType,
        entityId: await this.predictEntityId(entityType, currentContext),
        predictedAccessTime: now + (delay * 60 * 1000),
        confidence: Math.min(95, Math.max(50, confidence)),
        triggerPattern: `seasonal_${currentSeason.name}_${entityType}`,
        contextRequirements: config.intensiveMode ? ['comprehensive'] : ['standard'],
        userContext: {
          userId: currentContext.userId,
          currentWorkflow: `seasonal_${currentSeason.name}`
        }
      });
    }

    // Prédictions spéciales événements calendaires
    const specialEvents = this.getSpecialEventPredictions(now, currentMonth);
    predictions.push(...specialEvents);

    return predictions;
  }

  // ========================================
  // MÉTHODES HELPER BUSINESS PATTERN RECOGNITION
  // ========================================

  /**
   * Obtient multiplicateur saisonnier pour type d'activité
   */
  private getSeasonalMultiplier(activityType: string): number {
    const currentMonth = new Date().getMonth();
    
    const seasonalFactors = {
      'study': {
        0: 0.8, 1: 0.9, 2: 1.2, 3: 1.3, 4: 1.4, 5: 1.1,
        6: 0.7, 7: 0.6, 8: 1.3, 9: 1.4, 10: 1.2, 11: 0.9
      },
      'project_start': {
        0: 0.7, 1: 0.8, 2: 1.1, 3: 1.3, 4: 1.4, 5: 1.2,
        6: 0.9, 7: 0.8, 8: 1.3, 9: 1.4, 10: 1.1, 11: 0.8
      },
      'construction': {
        0: 0.6, 1: 0.7, 2: 1.0, 3: 1.2, 4: 1.4, 5: 1.3,
        6: 1.1, 7: 0.9, 8: 1.2, 9: 1.3, 10: 1.0, 11: 0.7
      }
    };

    return seasonalFactors[activityType]?.[currentMonth] || 1.0;
  }

  /**
   * Vérifie correspondance contexte avec workflow
   */
  private isWorkflowContextMatch(context: any, workflow: any): boolean {
    // Vérifications spécialisées selon type de workflow
    if (workflow.requiresValidation && context.userRole !== 'admin' && context.userRole !== 'commercial') {
      return false;
    }
    
    if (workflow.supplierDependency && !context.hasSupplierAccess) {
      return false;
    }
    
    if (workflow.qualityCheckRequired && context.userRole === 'commercial') {
      return false; // Commercial ne fait pas contrôle qualité
    }
    
    return true;
  }

  /**
   * Prédit ID entité selon type et contexte
   */
  private async predictEntityId(entityType: string, context: any): Promise<string> {
    // Logique prédiction ID selon relations métier
    if (context.entityId && context.entityType) {
      // Relations directes
      if (entityType === 'offer' && context.entityType === 'ao') {
        return `OFFER_${context.entityId}_${Date.now()}`;
      }
      if (entityType === 'project' && context.entityType === 'offer') {
        return `PROJECT_${context.entityId}_${Date.now()}`;
      }
      if (entityType === 'chantier' && context.entityType === 'project') {
        return `CHANTIER_${context.entityId}_${Date.now()}`;
      }
    }
    
    // ID générique avec timestamp
    return `${entityType.toUpperCase()}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  /**
   * Calcule multiplicateur charge système
   */
  private getSystemLoadMultiplier(): number {
    // Simulation - en prod, vérifier CPU/mémoire réels
    const currentHour = new Date().getHours();
    
    // Heures de pointe = charge élevée
    if ([9, 10, 11, 14, 15, 16].includes(currentHour)) {
      return 1.3; // 30% plus lent
    }
    
    // Heures creuses = charge normale
    return 1.0;
  }

  /**
   * Détermine exigences contexte selon workflow
   */
  private determineContextRequirements(workflow: any): string[] {
    const requirements: string[] = ['standard'];
    
    if (workflow.complexity === 'high') {
      requirements.push('comprehensive');
    }
    
    if (workflow.technicalFocus) {
      requirements.push('technical');
    }
    
    if (workflow.clientInteractionRequired) {
      requirements.push('relational');
    }
    
    if (workflow.supplierDependency) {
      requirements.push('business');
    }
    
    return [...new Set(requirements)];
  }

  /**
   * Estime durée étape workflow
   */
  private estimateWorkflowStageDuration(stage: string): number {
    const durations = {
      'etude_technique': 120, // 2h
      'chiffrage': 90,       // 1.5h
      'offer': 60,           // 1h
      'planning': 45,        // 45min
      'chantier': 480,       // 8h (journée)
      'controle_qualite': 30, // 30min
      'livraison': 60        // 1h
    };
    
    return durations[stage] || 60; // Default 1h
  }

  /**
   * Obtient dépendances workflow
   */
  private getWorkflowDependencies(workflow: any): string[] {
    const deps: string[] = [];
    
    if (workflow.supplierDependency) deps.push('supplier_availability');
    if (workflow.weatherDependency) deps.push('weather_conditions');
    if (workflow.businessHoursDependency) deps.push('business_hours');
    if (workflow.requiresValidation) deps.push('management_approval');
    if (workflow.clientInteractionRequired) deps.push('client_availability');
    
    return deps;
  }

  /**
   * Vérifie si workflow est sur chemin critique
   */
  private isOnCriticalPath(workflowName: string): boolean {
    const criticalWorkflows = [
      'ao_initial_study',
      'study_to_chiffrage', 
      'chiffrage_to_offer',
      'offer_to_project',
      'project_to_planning',
      'planning_to_approvisionnement'
    ];
    
    return criticalWorkflows.includes(workflowName);
  }

  /**
   * Obtient exigences ressources pour étape
   */
  private getResourceRequirements(stage: string): string[] {
    const requirements = {
      'etude_technique': ['technicien_be', 'logiciel_cao'],
      'chiffrage': ['technicien_be', 'base_prix'],
      'offer': ['commercial', 'templates'],
      'planning': ['chef_projet', 'planning_software'],
      'chantier': ['chef_chantier', 'equipe', 'materiaux'],
      'controle_qualite': ['controleur', 'outils_mesure']
    };
    
    return requirements[stage] || [];
  }

  /**
   * Prédictions événements calendaires spéciaux
   */
  private getSpecialEventPredictions(now: number, month: number): AccessPrediction[] {
    const predictions: AccessPrediction[] = [];
    const day = new Date(now).getDate();
    
    // Fin de mois - reports et bilans
    if (day >= 25) {
      predictions.push({
        entityType: 'report',
        entityId: `MONTHLY_REPORT_${month + 1}`,
        predictedAccessTime: now + (60 * 60 * 1000), // 1h
        confidence: 80,
        triggerPattern: 'end_of_month_reports',
        contextRequirements: ['business'],
        userContext: {}
      });
    }
    
    // Début trimestre - planification
    if ([0, 3, 6, 9].includes(month) && day <= 5) {
      predictions.push({
        entityType: 'planning',
        entityId: `QUARTERLY_PLANNING_Q${Math.floor(month / 3) + 1}`,
        predictedAccessTime: now + (30 * 60 * 1000), // 30min
        confidence: 75,
        triggerPattern: 'quarterly_planning',
        contextRequirements: ['comprehensive'],
        userContext: {}
      });
    }
    
    return predictions;
  }

  /**
   * Prédit accès basé sur patterns temporels
   */
  private async predictFromTemporalPatterns(now: number): Promise<AccessPrediction[]> {
    const predictions: AccessPrediction[] = [];
    const currentHour = new Date().getHours();
    
    // Prédictions horaires business
    if (this.BUSINESS_HOURS.includes(currentHour)) {
      // Pendant heures business, préloader entités populaires
      const heatMap = await this.generateEntityHeatMap();
      
      for (const hotEntity of heatMap.hotEntities.slice(0, 5)) {
        predictions.push({
          entityType: hotEntity.entityType,
          entityId: hotEntity.entityId,
          predictedAccessTime: now + (10 * 60 * 1000), // 10 minutes
          confidence: 60,
          triggerPattern: 'business_hours',
          contextRequirements: ['minimal'],
          userContext: {}
        });
      }
    }
    
    return predictions;
  }

  /**
   * Prédit accès basé sur heat-map actuelle
   */
  private async predictFromHeatMap(now: number): Promise<AccessPrediction[]> {
    const predictions: AccessPrediction[] = [];
    
    try {
      const heatMap = await this.generateEntityHeatMap();
      
      // Préloader entités avec tendance croissante
      for (const [entityKey, trend] of Object.entries(heatMap.accessTrends)) {
        const [entityType, entityId] = entityKey.split(':');
        
        // Détecter tendance croissante
        if (trend.length >= 3) {
          const recent = trend.slice(-3);
          const isIncreasing = recent[2] > recent[1] && recent[1] > recent[0];
          
          if (isIncreasing) {
            predictions.push({
              entityType,
              entityId,
              predictedAccessTime: now + (20 * 60 * 1000), // 20 minutes
              confidence: 65,
              triggerPattern: 'trending_up',
              contextRequirements: ['standard'],
              userContext: {}
            });
          }
        }
      }
    } catch (error) {
      logger.error('Erreur prédiction heat-map', {
      metadata: {
        service: 'PredictiveEngineService',
        operation: 'predictFromHeatMap',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }
    });
    }
    
    return predictions;
  }

  /**
   * Calcule priorité d'une tâche de preloading
   */
  private calculateTaskPriority(prediction: AccessPrediction): 'low' | 'medium' | 'high' | 'critical' {
    if (prediction.confidence >= 90) return 'critical';
    if (prediction.confidence >= 80) return 'high';
    if (prediction.confidence >= 70) return 'medium';
    return 'low';
  }

  /**
   * Estime temps d'exécution preloading
   */
  private estimatePreloadTime(prediction: AccessPrediction): number {
    const complexityMap = {
      'minimal': 500,     // 500ms
      'standard': 1500,   // 1.5s
      'comprehensive': 3000 // 3s
    };
    
    const maxComplexity = Math.max(...prediction.contextRequirements.map(req => 
      complexityMap[req] || 1000
    ));
    
    return maxComplexity;
  }

  /**
   * Génère configuration contexte pour preloading
   */
  private generateContextConfig(prediction: AccessPrediction): any {
    return {
      complexity: prediction.contextRequirements.includes('comprehensive') ? 'comprehensive' :
                 prediction.contextRequirements.includes('standard') ? 'standard' : 'minimal',
      priority: prediction.confidence >= 80 ? 'high' : 'normal',
      timeout: 5000, // 5s timeout
      retryOnError: true
    };
  }

  /**
   * Vérifie si timestamp correspond aux horaires business
   */
  private isBusinessHours(timestamp: number): boolean {
    const hour = new Date(timestamp).getHours();
    return this.BUSINESS_HOURS.includes(hour);
  }

  /**
   * Exécute immédiatement les tâches haute priorité
   */
  private async executeHighPriorityTasks(): Promise<void> {
    if (!this.contextCacheService || this.currentPreloadingLoad >= this.MAX_CONCURRENT_PRELOADS) {
      return;
    }
    
    const highPriorityTasks = this.preloadingSchedule.scheduledTasks
      .filter(task => task.priority === 'critical' || task.priority === 'high')
      .slice(0, this.MAX_CONCURRENT_PRELOADS - this.currentPreloadingLoad);
    
    for (const task of highPriorityTasks) {
      this.executePreloadTask(task).catch(error => {
        logger.error('Erreur tâche preloading', {
      metadata: {
        service: 'PredictiveEngineService',
        operation: 'executeHighPriorityTasks',
        taskId: task.id,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }
    });
      });
    }
  }

  /**
   * Exécute une tâche de preloading individuelle
   */
  private async executePreloadTask(task: PreloadingTask): Promise<void> {
    if (this.currentPreloadingLoad >= this.MAX_CONCURRENT_PRELOADS) {
      return;
    }
    
    this.currentPreloadingLoad++;
    
    try {
      // Déplacer vers tâches actives
      this.preloadingSchedule.activeTasks.push(task);
      this.preloadingSchedule.scheduledTasks = this.preloadingSchedule.scheduledTasks
        .filter(t => t.id !== task.id);
      
      logger.info('Exécution preloading', {
      metadata: {
        service: 'PredictiveEngineService',
        operation: 'executePreloadTask',
        entityType: task.entityType,
        entityId: task.entityId
      }
    });
      
      // Appel ContextCacheService pour preloading (si intégré)
      if (this.contextCacheService && this.contextCacheService.preloadContextByPrediction) {
        await this.contextCacheService.preloadContextByPrediction(
          task.entityType,
          task.entityId,
          task.contextConfig
        );
      }
      
      // Marquer comme complétée
      this.preloadingSchedule.completedTasks.push(task);
      this.preloadingSchedule.activeTasks = this.preloadingSchedule.activeTasks
        .filter(t => t.id !== task.id);
      
      logger.info('Preloading complété', {
      metadata: {
        service: 'PredictiveEngineService',
        operation: 'executePreloadTask',
        entityType: task.entityType,
        entityId: task.entityId
      }
    });
      
    } catch (error) {
      logger.error('Erreur preloading', {
      metadata: {
        service: 'PredictiveEngineService',
        operation: 'executePreloadTask',
        taskId: task.id,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }
    });
      
      // Marquer comme échouée
      this.preloadingSchedule.failedTasks.push(task);
      this.preloadingSchedule.activeTasks = this.preloadingSchedule.activeTasks
        .filter(t => t.id !== task.id);
      
    } finally {
      this.currentPreloadingLoad--;
    }
  }

  /**
   * Programme les tâches différées selon timing optimal
   */
  private scheduleDelayedTasks(): void {
    const delayedTasks = this.preloadingSchedule.scheduledTasks
      .filter(task => task.priority !== 'critical' && task.priority !== 'high');
    
    for (const task of delayedTasks) {
      const delay = Math.max(0, task.predictedAccessTime - Date.now() - (30 * 1000));
      
      setTimeout(() => {
        this.executePreloadTask(task).catch(error => {
          logger.error('Erreur tâche différée', {
      metadata: {
        service: 'PredictiveEngineService',
        operation: 'scheduleDelayedTasks',
        taskId: task.id,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }
    });
        });
      }, delay);
    }
  }

  /**
   * Nettoyage périodique logs d'accès entités
   */
  private cleanupEntityAccess(): void {
    const now = Date.now();
    const cutoffTime = now - (this.HEATMAP_RETENTION_HOURS * 60 * 60 * 1000);
    let deletedCount = 0;
    
    for (const [key, entry] of this.entityAccessLog.entries()) {
      if (entry.lastAccessTime < cutoffTime) {
        this.entityAccessLog.delete(key);
        deletedCount++;
      }
    }
    
    if (deletedCount > 0) {
      logger.info('Cleanup accès entités', {
      metadata: {
        service: 'PredictiveEngineService',
        operation: 'cleanupStaleEntityAccess',
        deletedCount
      }
    });
    }
  }

  /**
   * Mise à jour périodique patterns BTP
   */
  private async updateBTPPatterns(): Promise<void> {
    const now = Date.now();
    
    // Éviter updates trop fréquentes
    if (now - this.lastPatternUpdate < (60 * 60 * 1000)) { // 1 heure minimum
      return;
    }
    
    try {
      logger.info('Mise à jour patterns BTP', {
      metadata: {
        service: 'PredictiveEngineService',
        operation: 'updateBTPPatterns'
      }
    });
      
      // Analyser workflows récents pour mise à jour patterns
      // (Implémentation simplifiée pour POC)
      
      this.lastPatternUpdate = now;
      logger.info('Patterns BTP mis à jour', {
      metadata: {
        service: 'PredictiveEngineService',
        operation: 'updateBTPPatterns'
      }
    });
      
    } catch (error) {
      logger.error('Erreur mise à jour patterns BTP', {
      metadata: {
        service: 'PredictiveEngineService',
        operation: 'updateBTPPatterns',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }
    });
    }
  }

  /**
   * Désactive/active le preloading selon charge système
   */
  public setPreloadingEnabled(enabled: boolean): void {
    this.preloadingEnabled = enabled;
    logger.info('État preloading', {
      metadata: {
        service: 'PredictiveEngineService',
        operation: 'togglePredictivePreloading',
        enabled: enabled ? 'ACTIVÉ' : 'DÉSACTIVÉ'
      }
    });
  }

  /**
   * Statistiques preloading pour monitoring
   */
  public getPreloadingStats(): {
    active: number;
    scheduled: number;
    completed: number;
    failed: number;
    currentLoad: number;
    enabled: boolean;
  } {
    return {
      active: this.preloadingSchedule.activeTasks.length,
      scheduled: this.preloadingSchedule.scheduledTasks.length,
      completed: this.preloadingSchedule.completedTasks.length,
      failed: this.preloadingSchedule.failedTasks.length,
      currentLoad: this.currentPreloadingLoad,
      enabled: this.preloadingEnabled
    };
  }

  // ========================================
  // MÉTHODES PUBLIQUES POUR ROUTES
  // ========================================

  /**
   * Analyse des risques - alias pour detectProjectRisks pour compatibilité routes
   */
  async analyzeRisks(params?: any): Promise<any[]> {
    try {
      const riskParams: RiskQueryParams = {
        risk_level: params?.riskLevel || 'all',
        project_types: params?.projectTypes,
        user_ids: params?.userIds,
        limit: params?.limit || 20,
        include_predictions: params?.includePredictions !== false
      };

      return await this.detectProjectRisks(riskParams);
    } catch (error) {
      logger.error('Erreur analyzeRisks', {
        metadata: {
          service: 'PredictiveEngineService',
          operation: 'analyzeRisks',
          error: error instanceof Error ? error.message : String(error)
        }
      });
      throw error;
    }
  }

  /**
   * Sauvegarde un snapshot d'analyse
   */
  async saveSnapshot(data: any): Promise<any> {
    try {
      const snapshot = {
        id: `snapshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: data.type || 'full',
        data: data,
        params: data.params || {},
        createdAt: new Date(),
        createdBy: data.createdBy || 'system',
        notes: data.notes,
        version: '1.0'
      };

      logger.info('Snapshot sauvegardé', {
        metadata: {
          service: 'PredictiveEngineService',
          operation: 'saveSnapshot',
          snapshotId: snapshot.id,
          type: snapshot.type
        }
      });

      return snapshot;
    } catch (error) {
      logger.error('Erreur saveSnapshot', {
        metadata: {
          service: 'PredictiveEngineService',
          operation: 'saveSnapshot',
          error: error instanceof Error ? error.message : String(error)
        }
      });
      throw error;
    }
  }

  /**
   * Récupère les snapshots d'analyse
   */
  async getSnapshots(params?: any): Promise<any[]> {
    try {
      // Pour l'instant, retourner un tableau vide
      // À implémenter avec storage si nécessaire
      logger.info('Récupération snapshots', {
        metadata: {
          service: 'PredictiveEngineService',
          operation: 'getSnapshots',
          params
        }
      });

      return [];
    } catch (error) {
      logger.error('Erreur getSnapshots', {
        metadata: {
          service: 'PredictiveEngineService',
          operation: 'getSnapshots',
          error: error instanceof Error ? error.message : String(error)
        }
      });
      throw error;
    }
  }
}