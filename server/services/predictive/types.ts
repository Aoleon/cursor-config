/**
 * TYPES - Predictive Engine Types
 * 
 * Shared types for predictive services.
 */

export interface PredictiveRangeQuery {
  start_date: string;
  end_date: string;
  forecast_months: number;
  method?: 'exp_smoothing' | 'moving_average' | 'trend_analysis';
  granularity?: 'month' | 'quarter';
  segment?: string;
}

export interface RiskQueryParams {
  risk_level?: 'low' | 'medium' | 'high' | 'all';
  project_types?: string[];
  user_ids?: string[];
  limit?: number;
  include_predictions?: boolean;
}

export interface BusinessContext {
  analysis_period: {
    start: string;
    end: string;
  };
  focus_areas?: ('revenue' | 'costs' | 'planning' | 'quality')[];
  priority_threshold?: 'low' | 'medium' | 'high';
  department_filter?: string;
}

export interface MonthlyRevenueData {
  period: string;
  total_revenue: number;
  offer_count: number;
  avg_margin: number;
  conversion_rate: number;
  project_types: Record<string, number>;
}

export interface ForecastPoint {
  target_period: string;
  revenue_forecast: number;
  method_used: 'exp_smoothing' | 'moving_average' | 'trend_analysis';
  confidence_score?: number;
}

export interface PredictiveRevenueForecast {
  forecast_point: ForecastPoint;
  confidence_level: number;
  underlying_factors: string[];
  seasonal_adjustment?: number;
  trend_direction: 'up' | 'down' | 'stable';
  volatility_score: number;
}

export interface RiskFactor {
  type: 'complexity' | 'team_load' | 'historical_delay' | 'external' | 'budget';
  description: string;
  impact_score: number;
  likelihood: number;
  mitigation_suggested: string;
}

export interface PreventiveAction {
  type: 'resource_adjustment' | 'timeline_extension' | 'scope_reduction' | 'escalation';
  description: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  estimated_effort_hours: number;
  expected_risk_reduction: number;
}

export interface ProjectRiskAssessment {
  id: string;
  project_id: string;
  risk_score: number;
  risk_factors: RiskFactor[];
  predicted_delay_days: number;
  predicted_budget_overrun: number;
  recommended_actions: PreventiveAction[];
  assessment_date: string;
  next_review_date: string;
}

export interface BusinessRecommendation {
  id: string;
  category: 'revenue' | 'costs' | 'planning' | 'quality' | 'process';
  title: string;
  description: string;
  rationale: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimated_impact: {
    revenue_increase?: number;
    cost_reduction?: number;
    time_savings?: number;
    quality_improvement?: number;
  };
  implementation: {
    effort_estimate_hours: number;
    required_resources: string[];
    timeline_weeks: number;
    success_metrics: string[];
  };
  generated_date: string;
}

