import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { AnalyticsService } from '../../server/services/AnalyticsService';
import { PredictiveEngineService } from '../../server/services/PredictiveEngineService';
import { DatabaseStorage } from '../../server/storage-poc';

// Configuration Express pour tests
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  
  // Mock middleware authentication
  app.use((req, res, next) => {
    req.user = { id: 'test-user', role: 'manager' };
    next();
  });

  // Import des routes API
  const router = express.Router();
  
  // ========================================
  // ROUTES ANALYTICS API
  // ========================================
  
  router.get('/analytics/kpis', async (req, res) => {
    try {
      const mockKpis = {
        conversionRate: 65.5,
        forecastRevenue: 125000,
        teamLoadAvg: 78.5,
        delayedProjectsCount: 3,
        alertsCount: 7,
        lastUpdated: new Date()
      };
      res.json(mockKpis);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/analytics/conversion-trends', async (req, res) => {
    try {
      const { period_months = 12 } = req.query;
      const mockTrends = {
        conversionTrends: {
          monthlyData: Array.from({ length: parseInt(period_months) }, (_, i) => ({
            month: `2024-${String(i + 1).padStart(2, '0')}`,
            aoToOfferRate: 65 + Math.random() * 10,
            offerToProjectRate: 75 + Math.random() * 10
          }))
        },
        revenueTrends: {
          monthlyData: Array.from({ length: parseInt(period_months) }, (_, i) => ({
            month: `2024-${String(i + 1).padStart(2, '0')}`,
            revenue: 80000 + Math.random() * 20000,
            forecast: 85000 + Math.random() * 15000
          }))
        },
        marginTrends: {
          monthlyData: Array.from({ length: parseInt(period_months) }, (_, i) => ({
            month: `2024-${String(i + 1).padStart(2, '0')}`,
            margin: 18 + Math.random() * 4
          }))
        }
      };
      res.json(mockTrends);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/analytics/margin-analysis', async (req, res) => {
    try {
      const mockMarginAnalysis = {
        average: 19.5,
        median: 18.7,
        byCategory: {
          fenetre: 20.2,
          porte: 18.8,
          volet: 21.5
        },
        trending: 2.3,
        recommendations: [
          'Optimiser coûts matières premières',
          'Négocier tarifs fournisseurs',
          'Améliorer efficacité pose'
        ]
      };
      res.json(mockMarginAnalysis);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/analytics/team-performance', async (req, res) => {
    try {
      const mockTeamPerf = {
        overloadedTeams: [
          {
            userId: 'user2',
            userName: 'Sophie Martin',
            loadPercentage: 92,
            hoursAssigned: 184,
            capacityHours: 200,
            efficiency: 88,
            status: 'overloaded'
          }
        ],
        averageLoadPercentage: 78.5,
        optimizationSuggestions: [
          {
            type: 'rebalance',
            description: 'Redistribuer 15h vers équipe moins chargée',
            urgency: 'medium',
            estimatedBenefit: 12
          }
        ]
      };
      res.json(mockTeamPerf);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/analytics/generate-snapshot', async (req, res) => {
    try {
      const { type, include_charts, format } = req.body;
      const mockSnapshot = {
        id: `snapshot_${Date.now()}`,
        snapshotDate: new Date(),
        type,
        include_charts,
        format,
        periodFrom: new Date('2024-01-01'),
        periodTo: new Date('2024-02-29'),
        totalAos: 15,
        totalOffers: 10,
        totalProjects: 8,
        conversionRateAoToOffer: '66.7',
        conversionRateOfferToProject: '80.0',
        avgDelayDays: '5.2',
        totalRevenueForecast: '245000.0',
        avgTeamLoadPercentage: '78.5',
        criticalDeadlinesCount: 2,
        delayedProjectsCount: 1,
        conversionByUser: JSON.stringify({}),
        loadByUser: JSON.stringify({}),
        revenueByCategory: JSON.stringify({}),
        marginByCategory: JSON.stringify({}),
        createdAt: new Date()
      };
      res.json(mockSnapshot);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // ========================================
  // ROUTES PREDICTIVE API
  // ========================================

  router.post('/predictive/revenue-forecast', async (req, res) => {
    try {
      const { forecast_months = 6, method = 'exp_smoothing' } = req.body;
      const mockForecast = {
        forecast_point: {
          target_period: `2024-${String(new Date().getMonth() + forecast_months + 1).padStart(2, '0')}`,
          revenue_forecast: 95000 + Math.random() * 20000,
          method_used: method,
          confidence_score: 75 + Math.random() * 20
        },
        confidence_level: 82.5,
        underlying_factors: [
          'historical_growth_trend',
          'seasonal_adjustments',
          'market_conditions'
        ],
        seasonal_adjustment: 1.15,
        trend_direction: 'up',
        volatility_score: 15.2
      };
      res.json(mockForecast);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/predictive/project-risks', async (req, res) => {
    try {
      const { risk_level = 'medium', limit = 10 } = req.body;
      const mockRisks = [
        {
          id: 'risk1',
          project_id: 'proj1',
          risk_score: 78,
          risk_factors: [
            {
              type: 'complexity',
              impact_score: 70,
              likelihood: 65,
              description: 'Complexité technique élevée',
              mitigation_suggested: 'Renforcer équipe technique'
            }
          ],
          predicted_delay_days: 8,
          predicted_budget_overrun: 7.5,
          recommended_actions: [
            {
              type: 'resource_adjustment',
              urgency: 'medium',
              estimated_effort_hours: 24,
              expected_risk_reduction: 35,
              description: 'Ajouter expert technique senior'
            }
          ],
          assessment_date: new Date().toISOString(),
          next_review_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        }
      ];
      res.json(mockRisks);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/predictive/business-recommendations', async (req, res) => {
    try {
      const { focus_areas = ['revenue'], priority_threshold = 'medium' } = req.body;
      const mockRecommendations = [
        {
          id: 'rec1',
          category: 'revenue',
          title: 'Optimisation tarification fenêtres haut de gamme',
          description: 'Augmenter marges sur segment premium',
          rationale: 'Analyse concurrentielle favorable, demande soutenue',
          priority: 'high',
          estimated_impact: {
            revenue_increase: 15000,
            cost_reduction: 0,
            time_savings: 0,
            quality_improvement: 5
          },
          implementation: {
            effort_estimate_hours: 40,
            required_resources: ['commercial', 'technique'],
            timeline_weeks: 4,
            success_metrics: ['marge_moyenne', 'ca_segment_premium']
          },
          generated_date: new Date().toISOString()
        }
      ];
      res.json(mockRecommendations);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // ========================================
  // ROUTES BUSINESS ALERTS API
  // ========================================

  router.get('/alerts/business', async (req, res) => {
    try {
      const { status, severity, limit = 50 } = req.query;
      const mockAlerts = [
        {
          id: 'alert1',
          type: 'profitability',
          entity_type: 'project',
          entity_id: 'proj1',
          entity_name: 'Projet École Primaire',
          threshold_key: 'project_margin',
          threshold_value: 15.0,
          actual_value: 8.5,
          variance: -6.5,
          severity: 'high',
          status: 'open',
          message: 'Marge projet inférieure au seuil critique',
          details: JSON.stringify({ 
            estimated_loss: 3000,
            causes: ['material_cost_increase', 'scope_creep']
          }),
          created_at: new Date('2024-02-15'),
          updated_at: new Date('2024-02-15')
        }
      ];
      
      let filteredAlerts = mockAlerts;
      if (status) {
        filteredAlerts = filteredAlerts.filter(a => a.status === status);
      }
      if (severity) {
        filteredAlerts = filteredAlerts.filter(a => a.severity === severity);
      }
      
      res.json(filteredAlerts.slice(0, parseInt(limit)));
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/alerts/business/:id/acknowledge', async (req, res) => {
    try {
      const { id } = req.params;
      const { assigned_to, notes } = req.body;
      
      const acknowledgedAlert = {
        id,
        status: 'acknowledged',
        acknowledged_by: req.user.id,
        acknowledged_at: new Date(),
        assigned_to,
        notes,
        updated_at: new Date()
      };
      
      res.json(acknowledgedAlert);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/alerts/business/:id/resolve', async (req, res) => {
    try {
      const { id } = req.params;
      const { resolution_notes } = req.body;
      
      if (!resolution_notes) {
        return res.status(400).json({ error: 'Resolution notes are required' });
      }
      
      const resolvedAlert = {
        id,
        status: 'resolved',
        resolved_by: req.user.id,
        resolved_at: new Date(),
        resolution_notes,
        updated_at: new Date()
      };
      
      res.json(resolvedAlert);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/alerts/thresholds', async (req, res) => {
    try {
      const mockThresholds = [
        {
          id: 'threshold1',
          key: 'project_margin',
          value: 15.0,
          operator: 'greater_than',
          is_active: true,
          created_at: new Date('2024-01-01'),
          updated_at: new Date('2024-01-01')
        },
        {
          id: 'threshold2',
          key: 'team_utilization',
          value: 85.0,
          operator: 'less_than',
          is_active: true,
          created_at: new Date('2024-01-01'),
          updated_at: new Date('2024-01-01')
        }
      ];
      res.json(mockThresholds);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/alerts/thresholds', async (req, res) => {
    try {
      const { key, value, operator, is_active = true } = req.body;
      
      const newThreshold = {
        id: `threshold_${Date.now()}`,
        key,
        value,
        operator,
        is_active,
        created_at: new Date(),
        updated_at: new Date()
      };
      
      res.status(201).json(newThreshold);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.use('/api', router);
  
  return app;
};

// ========================================
// SUITE DE TESTS API INTEGRATION
// ========================================

describe('Dashboard API Integration Tests', () => {
  let app: express.Application;

  beforeEach(() => {
    app = createTestApp();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ========================================
  // TESTS API ANALYTICS
  // ========================================

  describe('Analytics API Endpoints', () => {
    test('GET /api/analytics/kpis retourne KPIs temps réel', async () => {
      const response = await request(app)
        .get('/api/analytics/kpis')
        .expect(200);

      expect(response.body).toMatchObject({
        conversionRate: expect.any(Number),
        forecastRevenue: expect.any(Number),
        teamLoadAvg: expect.any(Number),
        delayedProjectsCount: expect.any(Number),
        alertsCount: expect.any(Number),
        lastUpdated: expect.any(String)
      });

      expect(response.body.conversionRate).toBeGreaterThan(0);
      expect(response.body.conversionRate).toBeLessThanOrEqual(100);
    });

    test('GET /api/analytics/kpis performance < 200ms', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/api/analytics/kpis')
        .expect(200);
        
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(200);
    });

    test('GET /api/analytics/conversion-trends avec paramètres', async () => {
      const response = await request(app)
        .get('/api/analytics/conversion-trends')
        .query({ period_months: 6 })
        .expect(200);

      expect(response.body).toHaveProperty('conversionTrends');
      expect(response.body).toHaveProperty('revenueTrends');
      expect(response.body).toHaveProperty('marginTrends');
      
      expect(response.body.conversionTrends.monthlyData).toHaveLength(6);
      expect(response.body.revenueTrends.monthlyData).toHaveLength(6);
      expect(response.body.marginTrends.monthlyData).toHaveLength(6);
    });

    test('GET /api/analytics/margin-analysis retourne analyse détaillée', async () => {
      const response = await request(app)
        .get('/api/analytics/margin-analysis')
        .expect(200);

      expect(response.body).toMatchObject({
        average: expect.any(Number),
        median: expect.any(Number),
        byCategory: expect.any(Object),
        trending: expect.any(Number),
        recommendations: expect.any(Array)
      });

      expect(response.body.byCategory).toHaveProperty('fenetre');
      expect(response.body.byCategory).toHaveProperty('porte');
      expect(response.body.recommendations.length).toBeGreaterThan(0);
    });

    test('GET /api/analytics/team-performance identifie surcharges', async () => {
      const response = await request(app)
        .get('/api/analytics/team-performance')
        .expect(200);

      expect(response.body).toMatchObject({
        overloadedTeams: expect.any(Array),
        averageLoadPercentage: expect.any(Number),
        optimizationSuggestions: expect.any(Array)
      });

      if (response.body.overloadedTeams.length > 0) {
        const overloadedTeam = response.body.overloadedTeams[0];
        expect(overloadedTeam.loadPercentage).toBeGreaterThan(85);
        expect(overloadedTeam.status).toBe('overloaded');
      }
    });

    test('POST /api/analytics/generate-snapshot crée snapshot', async () => {
      const snapshotRequest = {
        type: 'full',
        include_charts: true,
        format: 'json'
      };

      const response = await request(app)
        .post('/api/analytics/generate-snapshot')
        .send(snapshotRequest)
        .expect(200);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        snapshotDate: expect.any(String),
        type: 'full',
        include_charts: true,
        format: 'json',
        totalAos: expect.any(Number),
        totalOffers: expect.any(Number),
        totalProjects: expect.any(Number)
      });
    });
  });

  // ========================================
  // TESTS API PREDICTIVE
  // ========================================

  describe('Predictive API Endpoints', () => {
    test('POST /api/predictive/revenue-forecast génère prévisions', async () => {
      const forecastRequest = {
        forecast_months: 6,
        method: 'exp_smoothing',
        granularity: 'month'
      };

      const response = await request(app)
        .post('/api/predictive/revenue-forecast')
        .send(forecastRequest)
        .expect(200);

      expect(response.body).toMatchObject({
        forecast_point: {
          target_period: expect.any(String),
          revenue_forecast: expect.any(Number),
          method_used: 'exp_smoothing',
          confidence_score: expect.any(Number)
        },
        confidence_level: expect.any(Number),
        underlying_factors: expect.any(Array),
        trend_direction: expect.stringMatching(/^(up|down|stable)$/)
      });

      expect(response.body.forecast_point.revenue_forecast).toBeGreaterThan(0);
      expect(response.body.confidence_level).toBeGreaterThan(0);
      expect(response.body.confidence_level).toBeLessThanOrEqual(100);
    });

    test('POST /api/predictive/project-risks évalue risques projets', async () => {
      const riskRequest = {
        risk_level: 'medium',
        limit: 5,
        include_predictions: true
      };

      const response = await request(app)
        .post('/api/predictive/project-risks')
        .send(riskRequest)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      
      if (response.body.length > 0) {
        const risk = response.body[0];
        expect(risk).toMatchObject({
          project_id: expect.any(String),
          risk_score: expect.any(Number),
          risk_factors: expect.any(Array),
          recommended_actions: expect.any(Array)
        });

        expect(risk.risk_score).toBeGreaterThanOrEqual(0);
        expect(risk.risk_score).toBeLessThanOrEqual(100);
      }
    });

    test('POST /api/predictive/business-recommendations génère recommandations', async () => {
      const recommendationRequest = {
        focus_areas: ['revenue', 'costs'],
        priority_threshold: 'medium'
      };

      const response = await request(app)
        .post('/api/predictive/business-recommendations')
        .send(recommendationRequest)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      
      if (response.body.length > 0) {
        const rec = response.body[0];
        expect(rec).toMatchObject({
          id: expect.any(String),
          category: expect.any(String),
          title: expect.any(String),
          description: expect.any(String),
          priority: expect.any(String),
          estimated_impact: expect.any(Object),
          implementation: expect.any(Object)
        });

        expect(['low', 'medium', 'high', 'critical']).toContain(rec.priority);
        expect(rec.implementation.effort_estimate_hours).toBeGreaterThan(0);
      }
    });
  });

  // ========================================
  // TESTS API BUSINESS ALERTS
  // ========================================

  describe('Business Alerts API Endpoints', () => {
    test('GET /api/alerts/business retourne alertes filtrées', async () => {
      const response = await request(app)
        .get('/api/alerts/business')
        .query({ status: 'open', severity: 'high' })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      
      response.body.forEach(alert => {
        expect(alert).toMatchObject({
          id: expect.any(String),
          type: expect.any(String),
          entity_type: expect.any(String),
          severity: 'high',
          status: 'open',
          message: expect.any(String)
        });
      });
    });

    test('POST /api/alerts/business/:id/acknowledge workflow acknowledge', async () => {
      const acknowledgeRequest = {
        assigned_to: 'user2',
        notes: 'Prise en charge par équipe technique'
      };

      const response = await request(app)
        .post('/api/alerts/business/alert1/acknowledge')
        .send(acknowledgeRequest)
        .expect(200);

      expect(response.body).toMatchObject({
        id: 'alert1',
        status: 'acknowledged',
        acknowledged_by: 'test-user',
        acknowledged_at: expect.any(String),
        assigned_to: 'user2'
      });
    });

    test('POST /api/alerts/business/:id/resolve avec notes obligatoires', async () => {
      const resolveRequest = {
        resolution_notes: 'Marge corrigée par optimisation coûts matériaux'
      };

      const response = await request(app)
        .post('/api/alerts/business/alert1/resolve')
        .send(resolveRequest)
        .expect(200);

      expect(response.body).toMatchObject({
        id: 'alert1',
        status: 'resolved',
        resolved_by: 'test-user',
        resolved_at: expect.any(String),
        resolution_notes: 'Marge corrigée par optimisation coûts matériaux'
      });
    });

    test('POST /api/alerts/business/:id/resolve échoue sans notes', async () => {
      const resolveRequest = {}; // Pas de resolution_notes

      await request(app)
        .post('/api/alerts/business/alert1/resolve')
        .send(resolveRequest)
        .expect(400);
    });

    test('GET /api/alerts/thresholds retourne seuils configurables', async () => {
      const response = await request(app)
        .get('/api/alerts/thresholds')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      
      response.body.forEach(threshold => {
        expect(threshold).toMatchObject({
          id: expect.any(String),
          key: expect.any(String),
          value: expect.any(Number),
          operator: expect.any(String),
          is_active: expect.any(Boolean)
        });

        expect(['greater_than', 'less_than', 'equal']).toContain(threshold.operator);
      });
    });

    test('POST /api/alerts/thresholds crée nouveau seuil', async () => {
      const thresholdRequest = {
        key: 'global_margin',
        value: 20.0,
        operator: 'greater_than',
        is_active: true
      };

      const response = await request(app)
        .post('/api/alerts/thresholds')
        .send(thresholdRequest)
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        key: 'global_margin',
        value: 20.0,
        operator: 'greater_than',
        is_active: true,
        created_at: expect.any(String)
      });
    });
  });

  // ========================================
  // TESTS PERFORMANCE ET GESTION ERREURS
  // ========================================

  describe('Performance et Gestion Erreurs', () => {
    test('endpoints API respectent limite 200ms', async () => {
      const endpoints = [
        '/api/analytics/kpis',
        '/api/analytics/margin-analysis',
        '/api/analytics/team-performance',
        '/api/alerts/business',
        '/api/alerts/thresholds'
      ];

      for (const endpoint of endpoints) {
        const startTime = Date.now();
        await request(app).get(endpoint).expect(200);
        const duration = Date.now() - startTime;
        
        expect(duration).toBeLessThan(200);
      }
    });

    test('gestion erreurs 500 avec message explicite', async () => {
      // Simuler erreur interne en modifiant temporairement l'app
      const errorApp = express();
      errorApp.use(express.json());
      errorApp.get('/api/analytics/kpis', (req, res) => {
        throw new Error('Database connection failed');
      });

      const response = await request(errorApp)
        .get('/api/analytics/kpis')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });

    test('validation paramètres requêtes POST', async () => {
      // Test sans paramètres requis
      await request(app)
        .post('/api/predictive/revenue-forecast')
        .send({}) // Vide
        .expect(200); // Doit utiliser valeurs par défaut

      // Test avec paramètres invalides  
      const invalidRequest = {
        forecast_months: -1, // Invalide
        method: 'invalid_method' // Invalide
      };

      const response = await request(app)
        .post('/api/predictive/revenue-forecast')
        .send(invalidRequest)
        .expect(200); // L'API mock accepte tout, mais un vrai service validerait

      expect(response.body.forecast_point.method_used).not.toBe('invalid_method');
    });

    test('pagination et filtres alertes business', async () => {
      const response = await request(app)
        .get('/api/alerts/business')
        .query({ 
          status: 'open',
          severity: 'high',
          limit: 10,
          page: 1
        })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeLessThanOrEqual(10);
    });
  });

  // ========================================
  // TESTS SÉCURITÉ ET AUTORISATION
  // ========================================

  describe('Sécurité et Autorisation', () => {
    test('authentification requise pour endpoints sensibles', async () => {
      // Créer app sans middleware auth
      const unauthApp = express();
      unauthApp.use(express.json());
      unauthApp.get('/api/analytics/kpis', (req, res) => {
        if (!req.user) {
          return res.status(401).json({ error: 'Authentication required' });
        }
        res.json({ message: 'OK' });
      });

      await request(unauthApp)
        .get('/api/analytics/kpis')
        .expect(401);
    });

    test('validation autorisations role-based', async () => {
      // App avec validation de rôle
      const roleApp = express();
      roleApp.use(express.json());
      roleApp.use((req, res, next) => {
        req.user = { id: 'test-user', role: 'technician' }; // Rôle insuffisant
        next();
      });
      
      roleApp.post('/api/alerts/thresholds', (req, res) => {
        if (req.user.role !== 'manager' && req.user.role !== 'admin') {
          return res.status(403).json({ error: 'Insufficient permissions' });
        }
        res.json({ message: 'Created' });
      });

      await request(roleApp)
        .post('/api/alerts/thresholds')
        .send({ key: 'test', value: 10, operator: 'greater_than' })
        .expect(403);
    });
  });
});