/**
 * FORECAST SERVICE - Revenue and Trend Forecasting
 * 
 * Extracted from PredictiveEngineService to reduce file size.
 * Handles revenue forecasting and trend analysis.
 * 
 * Target LOC: ~400-500
 */

import { logger } from '../../utils/logger';
import { withErrorHandling } from '../../utils/error-handler';
import type { IStorage } from '../../storage-poc';
import { addMonths, format } from 'date-fns';
import type { PredictiveRangeQuery, PredictiveRevenueForecast, ForecastPoint, MonthlyRevenueData } from './types';

export class ForecastService {
  constructor(private storage: IStorage) {}

  /**
   * Prévit les revenus futurs
   */
  async forecastRevenue(params: PredictiveRangeQuery): Promise<PredictiveRevenueForecast[]> {
    return withErrorHandling(
      async () => {
        logger.info('Prévision revenus', {
          metadata: {
            service: 'ForecastService',
            operation: 'forecastRevenue',
            forecastMonths: params.forecast_months,
            method: params.method || 'exp_smoothing'
          }
        });

        // Récupérer données historiques
        const historicalData = await this.getHistoricalRevenueData(params);
        
        // Générer prévisions selon la méthode
        const forecasts: PredictiveRevenueForecast[] = [];
        
        const endDate = new Date(params.end_date);
        if (isNaN(endDate.getTime())) {
          throw new Error(`Invalid end_date: ${params.end_date}`);
        }
        
        for (let i = 1; i <= params.forecast_months; i++) {
          const targetDate = addMonths(endDate, i);
          const targetPeriod = format(targetDate, 'yyyy-MM');
          
          let forecastValue = 0;
          let method = params.method || 'exp_smoothing';
          
          switch (method) {
            case 'exp_smoothing':
              forecastValue = this.exponentialSmoothing(historicalData, i);
              break;
            case 'moving_average':
              forecastValue = this.movingAverage(historicalData, i);
              break;
            case 'trend_analysis':
              forecastValue = this.trendAnalysis(historicalData, i);
              break;
          }
          
          const forecastPoint: ForecastPoint = {
            target_period: targetPeriod,
            revenue_forecast: forecastValue,
            method_used: method,
            confidence_score: this.calculateConfidence(historicalData.length, i)
          };
          
          forecasts.push({
            forecast_point: forecastPoint,
            confidence_level: forecastPoint.confidence_score || 70,
            underlying_factors: this.identifyFactors(historicalData),
            seasonal_adjustment: this.calculateSeasonalAdjustment(targetDate),
            trend_direction: this.detectTrend(historicalData),
            volatility_score: this.calculateVolatility(historicalData)
          });
        }
        
        logger.info('Prévisions générées', {
          metadata: {
            service: 'ForecastService',
            operation: 'forecastRevenue',
            forecastsCount: forecasts.length
          }
        });
        
        return forecasts;
      },
      {
        operation: 'forecastRevenue',
        service: 'ForecastService',
        metadata: { forecastMonths: params.forecast_months }
      }
    ) || [];
  }

  /**
   * Récupère les données historiques de revenus
   */
  private async getHistoricalRevenueData(params: PredictiveRangeQuery): Promise<MonthlyRevenueData[]> {
    // Implémentation simplifiée - délègue au storage
    try {
      const projects = await this.storage.getProjects();
      const offers = await this.storage.getOffers();
      
      // Grouper par mois et calculer revenus
      const monthlyData: Map<string, MonthlyRevenueData> = new Map();
      
      // Traiter projets
      for (const project of projects) {
        const createdAt = project.createdAt ? new Date(project.createdAt) : null;
        if (!createdAt || isNaN(createdAt.getTime())) continue;
        const month = format(createdAt, 'yyyy-MM');
        if (!monthlyData.has(month)) {
          monthlyData.set(month, {
            period: month,
            total_revenue: 0,
            offer_count: 0,
            avg_margin: 0,
            conversion_rate: 0,
            project_types: {}
          });
        }
        
        const data = monthlyData.get(month)!;
        if (project.montantFinal) {
          data.total_revenue += parseFloat(project.montantFinal);
        }
      }
      
      // Traiter offres
      for (const offer of offers) {
        const createdAt = offer.createdAt ? new Date(offer.createdAt) : null;
        if (!createdAt || isNaN(createdAt.getTime())) continue;
        const month = format(createdAt, 'yyyy-MM');
        if (!monthlyData.has(month)) {
          monthlyData.set(month, {
            period: month,
            total_revenue: 0,
            offer_count: 0,
            avg_margin: 0,
            conversion_rate: 0,
            project_types: {}
          });
        }
        
        const data = monthlyData.get(month)!;
        data.offer_count++;
      }
      
      return Array.from(monthlyData.values()).sort((a, b) => a.period.localeCompare(b.period));
    } catch (error) {
      logger.error('[ForecastService] Erreur récupération données historiques', {
        metadata: {
          service: 'ForecastService',
          operation: 'getHistoricalRevenueData',
          error: error instanceof Error ? error.message : String(error)
        }
      });
      return [];
    }
  }

  /**
   * Lissage exponentiel
   */
  private exponentialSmoothing(data: MonthlyRevenueData[], periodsAhead: number): number {
    if (data.length === 0) return 0;
    
    const alpha = 0.3; // Facteur de lissage
    let forecast = data[data.length - 1].total_revenue;
    
    for (let i = data.length - 2; i >= 0; i--) {
      forecast = alpha * data[i].total_revenue + (1 - alpha) * forecast;
    }
    
    return Math.max(0, forecast);
  }

  /**
   * Moyenne mobile
   */
  private movingAverage(data: MonthlyRevenueData[], periodsAhead: number): number {
    if (data.length === 0) return 0;
    
    const window = Math.min(3, data.length);
    const recent = data.slice(-window);
    const sum = recent.reduce((acc, d) => acc + d.total_revenue, 0);
    
    return sum / window;
  }

  /**
   * Analyse de tendance
   */
  private trendAnalysis(data: MonthlyRevenueData[], periodsAhead: number): number {
    if (data.length < 2) return data[0]?.total_revenue || 0;
    
    const recent = data.slice(-6); // 6 derniers mois
    const n = recent.length;
    
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;
    
    for (let i = 0; i < n; i++) {
      const x = i + 1;
      const y = recent[i].total_revenue;
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
    }
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    return Math.max(0, intercept + slope * (n + periodsAhead));
  }

  /**
   * Calcule la confiance de la prévision
   */
  private calculateConfidence(dataLength: number, periodsAhead: number): number {
    let confidence = 100;
    
    // Réduire confiance selon nombre de périodes à prévoir
    confidence -= periodsAhead * 5;
    
    // Réduire confiance si peu de données historiques
    if (dataLength < 6) {
      confidence -= (6 - dataLength) * 10;
    }
    
    return Math.max(30, Math.min(100, confidence));
  }

  /**
   * Identifie les facteurs sous-jacents
   */
  private identifyFactors(data: MonthlyRevenueData[]): string[] {
    const factors: string[] = [];
    
    if (data.length >= 3) {
      const recent = data.slice(-3);
      const avg = recent.reduce((acc, d) => acc + d.total_revenue, 0) / recent.length;
      const older = data.slice(-6, -3);
      const olderAvg = older.reduce((acc, d) => acc + d.total_revenue, 0) / older.length;
      
      if (avg > olderAvg * 1.1) {
        factors.push('Croissance récente');
      } else if (avg < olderAvg * 0.9) {
        factors.push('Déclin récent');
      }
    }
    
    return factors;
  }

  /**
   * Calcule l'ajustement saisonnier
   */
  private calculateSeasonalAdjustment(date: Date): number {
    const month = date.getMonth() + 1;
    
    // Facteurs saisonniers BTP (printemps/automne = haute saison)
    if (month >= 3 && month <= 5) return 1.2; // Printemps
    if (month >= 9 && month <= 11) return 1.3; // Automne
    if (month >= 7 && month <= 8) return 0.8; // Été (congés)
    if (month === 12 || month === 1) return 0.7; // Hiver (fêtes)
    
    return 1.0;
  }

  /**
   * Détecte la tendance
   */
  private detectTrend(data: MonthlyRevenueData[]): 'up' | 'down' | 'stable' {
    if (data.length < 3) return 'stable';
    
    const recent = data.slice(-3);
    const older = data.slice(-6, -3);
    
    if (recent.length === 0 || older.length === 0) return 'stable';
    
    const recentAvg = recent.reduce((acc, d) => acc + d.total_revenue, 0) / recent.length;
    const olderAvg = older.reduce((acc, d) => acc + d.total_revenue, 0) / older.length;
    
    if (recentAvg > olderAvg * 1.05) return 'up';
    if (recentAvg < olderAvg * 0.95) return 'down';
    return 'stable';
  }

  /**
   * Calcule la volatilité
   */
  private calculateVolatility(data: MonthlyRevenueData[]): number {
    if (data.length < 2) return 0;
    
    const values = data.map(d => d.total_revenue);
    const mean = values.reduce((acc, v) => acc + v, 0) / values.length;
    const variance = values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    return mean > 0 ? (stdDev / mean) * 100 : 0;
  }
}

