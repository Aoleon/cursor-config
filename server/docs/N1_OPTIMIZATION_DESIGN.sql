-- ========================================
-- OPTIMISATION N+1 : getConsolidatedKpis()
-- ========================================
-- 
-- PROBLÈME : 12 queries fixes + 4×N queries (boucle timeSeries)
-- Exemple 30 jours : 12 + 120 = 132 queries → 2000ms+
--
-- SOLUTION : Single CTE query avec toutes les agrégations
-- Impact attendu : 132 queries → 1 query (90%+ amélioration)
--
-- ========================================

-- PARAMÈTRES (à remplacer par valeurs réelles lors tests)
-- :fromDate = '2025-01-01'
-- :toDate = '2025-01-31'
-- :granularity = 'day' ou 'week'
-- :incrementDays = 1 (pour 'day') ou 7 (pour 'week')

WITH 
-- ========================================
-- 1. GÉNÉRATION TIME SERIES
-- ========================================
date_series AS (
  SELECT 
    date_trunc(:granularity, generate_series(
      :fromDate::timestamp,
      :toDate::timestamp,
      INTERVAL '1 ' || :granularity
    )) AS period_start,
    date_trunc(:granularity, generate_series(
      :fromDate::timestamp,
      :toDate::timestamp,
      INTERVAL '1 ' || :granularity
    )) + INTERVAL '1 ' || :granularity AS period_end
),

-- ========================================
-- 2. MÉTRIQUES FIXES (hors boucle)
-- ========================================

-- Total offers in period
total_offers_metric AS (
  SELECT 
    COUNT(*) AS total_count,
    COUNT(*) FILTER (WHERE status IN ('signe', 'transforme_en_projet', 'termine')) AS won_count
  FROM offers
  WHERE created_at >= :fromDate
    AND created_at <= :toDate
),

-- Forecast revenue (weighted by status probability)
forecast_metric AS (
  SELECT 
    COALESCE(SUM(
      COALESCE(montant_final, montant_propose, montant_estime, 0) * 
      CASE status
        WHEN 'en_attente_fournisseurs' THEN 0.2
        WHEN 'en_cours_chiffrage' THEN 0.35
        WHEN 'en_attente_validation' THEN 0.55
        WHEN 'fin_etudes_validee' THEN 0.7
        WHEN 'valide' THEN 0.85
        WHEN 'signe' THEN 1.0
        ELSE 0
      END
    ), 0) AS total_forecast_revenue
  FROM offers
  WHERE created_at >= :fromDate
    AND created_at <= :toDate
    AND status IN ('en_attente_fournisseurs', 'en_cours_chiffrage', 'en_attente_validation', 
                   'fin_etudes_validee', 'valide', 'signe')
),

-- Team capacity and load
team_metrics AS (
  SELECT 
    COUNT(*) FILTER (WHERE is_active = true AND (role LIKE '%be%' OR role LIKE '%technicien%')) AS active_be_count,
    COALESCE(SUM(o.be_hours_estimated), 0) AS total_planned_hours
  FROM users u
  LEFT JOIN offers o ON u.id = o.responsible_user_id
    AND o.created_at >= :fromDate
    AND o.created_at <= :toDate
    AND o.be_hours_estimated IS NOT NULL
),

-- Delayed tasks metrics
delay_metrics AS (
  SELECT 
    COUNT(*) AS delayed_tasks_count,
    COALESCE(AVG(EXTRACT(DAY FROM (NOW() - pt.end_date))), 0) AS avg_delay_days
  FROM project_tasks pt
  INNER JOIN projects p ON pt.project_id = p.id
  INNER JOIN offers o ON p.offer_id = o.id
  WHERE o.created_at >= :fromDate
    AND o.created_at <= :toDate
    AND pt.end_date IS NOT NULL
    AND pt.end_date < NOW()
    AND pt.status != 'termine'
),

-- Margin calculation from chiffrage elements
margin_metrics AS (
  SELECT 
    COALESCE(SUM(ce.total_price), 0) AS total_revenue,
    COALESCE(SUM(ce.total_price / (1 + ce.margin_percentage/100)), 0) AS total_cost,
    COALESCE(AVG(o.taux_marge), 20) AS fallback_margin
  FROM chiffrage_elements ce
  INNER JOIN offers o ON ce.offer_id = o.id
  WHERE o.created_at >= :fromDate
    AND o.created_at <= :toDate
),

-- ========================================
-- 3. BREAKDOWNS (GROUP BY aggregations)
-- ========================================

-- Conversion by user
conversion_by_user AS (
  SELECT 
    o.responsible_user_id,
    u.first_name,
    u.last_name,
    COUNT(*) AS total_offers,
    COUNT(*) FILTER (WHERE o.status IN ('signe', 'transforme_en_projet', 'termine')) AS won_offers
  FROM offers o
  LEFT JOIN users u ON o.responsible_user_id = u.id
  WHERE o.created_at >= :fromDate
    AND o.created_at <= :toDate
  GROUP BY o.responsible_user_id, u.first_name, u.last_name
),

-- Load by user (BE/techniciens only)
load_by_user AS (
  SELECT 
    u.id AS user_id,
    u.first_name,
    u.last_name,
    COALESCE(SUM(o.be_hours_estimated), 0) AS total_hours
  FROM users u
  LEFT JOIN offers o ON u.id = o.responsible_user_id
    AND o.created_at >= :fromDate
    AND o.created_at <= :toDate
  WHERE u.is_active = true
    AND (u.role LIKE '%be%' OR u.role LIKE '%technicien%')
  GROUP BY u.id, u.first_name, u.last_name
),

-- Margin by category
margin_by_category AS (
  SELECT 
    menuiserie_type,
    COALESCE(AVG(
      CASE 
        WHEN montant_final > 0 AND montant_estime > 0 
        THEN ((montant_final - montant_estime) / montant_final * 100)
        ELSE taux_marge
      END
    ), 20) AS avg_margin
  FROM offers
  WHERE created_at >= :fromDate
    AND created_at <= :toDate
  GROUP BY menuiserie_type
),

-- ========================================
-- 4. TIME SERIES AGGREGATIONS (remplace la boucle N+1)
-- ========================================

time_series_metrics AS (
  SELECT 
    ds.period_start,
    -- Offers created in period
    COUNT(*) FILTER (WHERE o.created_at >= ds.period_start AND o.created_at < ds.period_end) AS offers_created,
    
    -- Offers won in period (use updated_at as signature date approximation)
    COUNT(*) FILTER (
      WHERE o.updated_at >= ds.period_start 
        AND o.updated_at < ds.period_end
        AND o.status IN ('signe', 'transforme_en_projet', 'termine')
    ) AS offers_won,
    
    -- Forecast revenue for period
    COALESCE(SUM(
      CASE 
        WHEN o.created_at >= ds.period_start AND o.created_at < ds.period_end
        THEN COALESCE(o.montant_final, o.montant_propose, o.montant_estime, 0) * 
          CASE o.status
            WHEN 'en_attente_fournisseurs' THEN 0.2
            WHEN 'en_cours_chiffrage' THEN 0.35
            WHEN 'en_attente_validation' THEN 0.55
            WHEN 'fin_etudes_validee' THEN 0.7
            WHEN 'valide' THEN 0.85
            WHEN 'signe' THEN 1.0
            ELSE 0
          END
        ELSE 0
      END
    ), 0) AS forecast_revenue,
    
    -- Team load hours for period
    COALESCE(SUM(
      CASE 
        WHEN o.created_at >= ds.period_start AND o.created_at < ds.period_end
        THEN o.be_hours_estimated
        ELSE 0
      END
    ), 0) AS team_load_hours
    
  FROM date_series ds
  CROSS JOIN offers o
  WHERE o.created_at >= :fromDate
    AND o.created_at <= :toDate
  GROUP BY ds.period_start
  ORDER BY ds.period_start
)

-- ========================================
-- 5. QUERY FINALE (retourne TOUTES les métriques)
-- ========================================
SELECT 
  -- Period summary metrics
  json_build_object(
    'conversionRate', 
      CASE WHEN tom.total_count > 0 
      THEN (tom.won_count::decimal / tom.total_count) * 100 
      ELSE 0 END,
    'forecastRevenue', fm.total_forecast_revenue,
    'teamLoadPercentage',
      CASE WHEN (tm.active_be_count * 35 * :weeksBetween) > 0
      THEN LEAST((tm.total_planned_hours / (tm.active_be_count * 35 * :weeksBetween)) * 100, 100)
      ELSE 0 END,
    'averageDelayDays', GREATEST(dm.avg_delay_days, 0),
    'expectedMarginPercentage',
      CASE WHEN mm.total_revenue > 0
      THEN ((mm.total_revenue - mm.total_cost) / mm.total_revenue) * 100
      ELSE mm.fallback_margin END,
    'totalDelayedTasks', dm.delayed_tasks_count,
    'totalOffers', tom.total_count,
    'totalWonOffers', tom.won_count
  ) AS period_summary,
  
  -- Breakdowns (as JSON objects for easy parsing)
  (SELECT json_object_agg(
    COALESCE(first_name || ' ' || last_name, 'User ' || responsible_user_id),
    json_build_object(
      'rate', CASE WHEN total_offers > 0 THEN (won_offers::decimal / total_offers) * 100 ELSE 0 END,
      'offersCount', total_offers,
      'wonCount', won_offers
    )
  ) FROM conversion_by_user) AS conversion_by_user,
  
  (SELECT json_object_agg(
    COALESCE(first_name || ' ' || last_name, 'User ' || user_id),
    json_build_object(
      'percentage', CASE WHEN :individualCapacity > 0 THEN LEAST((total_hours / :individualCapacity) * 100, 100) ELSE 0 END,
      'hours', total_hours,
      'capacity', :individualCapacity
    )
  ) FROM load_by_user) AS load_by_user,
  
  (SELECT json_object_agg(
    menuiserie_type,
    avg_margin
  ) FROM margin_by_category WHERE menuiserie_type IS NOT NULL) AS margin_by_category,
  
  -- Time series (as JSON array)
  (SELECT json_agg(
    json_build_object(
      'date', to_char(period_start, 'YYYY-MM-DD'),
      'offersCreated', offers_created,
      'offersWon', offers_won,
      'forecastRevenue', forecast_revenue,
      'teamLoadHours', team_load_hours
    ) ORDER BY period_start
  ) FROM time_series_metrics) AS time_series

FROM 
  total_offers_metric tom,
  forecast_metric fm,
  team_metrics tm,
  delay_metrics dm,
  margin_metrics mm;

-- ========================================
-- GAINS ATTENDUS
-- ========================================
-- Avant : 12 + (4 × 30 jours) = 132 queries → 2000ms+
-- Après : 1 query → 150-250ms
-- Amélioration : 90%+ (8-13x plus rapide)
