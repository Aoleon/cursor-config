import { rest } from 'msw';
import { setupServer } from 'msw/node';

// ========================================
// MSW HANDLERS POUR MOCKING API CALLS
// ========================================

// Données mock réalistes pour tests
const mockKpisData = {
  conversionRate: 68.5,
  forecastRevenue: 245000,
  teamLoadAvg: 78.5,
  delayedProjectsCount: 3,
  alertsCount: 7,
  lastUpdated: new Date().toISOString()
};

const mockConversionTrends = {
  conversionTrends: {
    monthlyData: [
      { month: '2024-01', aoToOfferRate: 65.2, offerToProjectRate: 72.8 },
      { month: '2024-02', aoToOfferRate: 67.1, offerToProjectRate: 74.3 },
      { month: '2024-03', aoToOfferRate: 68.5, offerToProjectRate: 75.6 },
      { month: '2024-04', aoToOfferRate: 69.8, offerToProjectRate: 76.2 },
      { month: '2024-05', aoToOfferRate: 71.2, offerToProjectRate: 77.5 },
      { month: '2024-06', aoToOfferRate: 70.5, offerToProjectRate: 76.8 }
    ]
  },
  revenueTrends: {
    monthlyData: [
      { month: '2024-01', revenue: 185000, forecast: 190000 },
      { month: '2024-02', revenue: 195000, forecast: 200000 },
      { month: '2024-03', revenue: 210000, forecast: 215000 },
      { month: '2024-04', revenue: 225000, forecast: 230000 },
      { month: '2024-05', revenue: 240000, forecast: 245000 },
      { month: '2024-06', revenue: 245000, forecast: 250000 }
    ]
  }
};

const mockMarginAnalysis = {
  average: 19.2,
  median: 18.7,
  byCategory: {
    fenetre: 20.5,
    porte: 18.8,
    volet: 21.2,
    'renovation-complete': 17.5
  },
  trending: 2.3,
  recommendations: [
    'Optimiser coûts matières premières fenêtres',
    'Négocier tarifs fournisseurs pose',
    'Améliorer efficacité chantiers volets'
  ]
};

const mockRevenueForecast = {
  forecast_point: {
    target_period: '2024-09',
    revenue_forecast: 285000,
    method_used: 'exp_smoothing',
    confidence_score: 82.5
  },
  confidence_level: 85.3,
  underlying_factors: [
    'historical_growth_trend',
    'seasonal_adjustments',
    'market_conditions',
    'portfolio_expansion'
  ],
  seasonal_adjustment: 1.12,
  trend_direction: 'up',
  volatility_score: 12.8
};

const mockProjectRisks = [
  {
    id: 'risk1',
    project_id: 'proj1',
    risk_score: 85,
    risk_factors: [
      {
        type: 'complexity',
        impact_score: 75,
        likelihood: 80,
        description: 'Complexité technique élevée - fenêtres sur-mesure',
        mitigation_suggested: 'Renforcer équipe avec expert technique senior'
      },
      {
        type: 'timeline_pressure',
        impact_score: 70,
        likelihood: 65,
        description: 'Délais serrés imposés par client',
        mitigation_suggested: 'Revoir planning avec phases prioritaires'
      }
    ],
    predicted_delay_days: 12,
    predicted_budget_overrun: 8.5,
    recommended_actions: [
      {
        type: 'resource_adjustment',
        urgency: 'high',
        estimated_effort_hours: 40,
        expected_risk_reduction: 35,
        description: 'Affecter expert technique senior au projet'
      },
      {
        type: 'timeline_extension',
        urgency: 'medium',
        estimated_effort_hours: 8,
        expected_risk_reduction: 25,
        description: 'Négocier extension délai 1 semaine avec client'
      }
    ],
    assessment_date: new Date().toISOString(),
    next_review_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'risk2',
    project_id: 'proj2',
    risk_score: 78,
    risk_factors: [
      {
        type: 'team_load',
        impact_score: 68,
        likelihood: 75,
        description: 'Équipe principale déjà à 90% de charge',
        mitigation_suggested: 'Redistribuer 20h vers équipe secondaire'
      }
    ],
    predicted_delay_days: 8,
    predicted_budget_overrun: 5.2,
    recommended_actions: [
      {
        type: 'resource_adjustment',
        urgency: 'medium',
        estimated_effort_hours: 24,
        expected_risk_reduction: 30,
        description: 'Redistribuer charge vers équipe moins sollicitée'
      }
    ],
    assessment_date: new Date().toISOString(),
    next_review_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
  }
];

const mockBusinessAlerts = [
  {
    id: 'alert1',
    type: 'profitability',
    entity_type: 'project',
    entity_id: 'proj1',
    entity_name: 'Projet École Primaire Versailles',
    threshold_key: 'project_margin',
    threshold_value: 15.0,
    actual_value: 8.5,
    variance: -6.5,
    severity: 'high',
    status: 'open',
    message: 'Marge projet inférieure au seuil critique (8.5% vs 15% requis)',
    details: JSON.stringify({ 
      estimated_loss: 4500,
      causes: ['material_cost_increase', 'scope_creep'],
      recommendations: ['renegotiate_pricing', 'optimize_materials']
    }),
    created_at: new Date('2024-02-15T10:30:00Z'),
    updated_at: new Date('2024-02-15T10:30:00Z'),
    created_by: null,
    acknowledged_by: null,
    acknowledged_at: null,
    assigned_to: null,
    resolved_by: null,
    resolved_at: null,
    resolution_notes: null
  },
  {
    id: 'alert2',
    type: 'team_utilization',
    entity_type: 'team',
    entity_id: 'user2',
    entity_name: 'Sophie Martin - Équipe Technique',
    threshold_key: 'team_utilization',
    threshold_value: 85.0,
    actual_value: 94.5,
    variance: 9.5,
    severity: 'medium',
    status: 'acknowledged',
    message: 'Surcharge équipe détectée (94.5% vs max 85%)',
    details: JSON.stringify({ 
      current_load: 94.5,
      recommended_action: 'redistribute_15h',
      target_team: 'team_alpha'
    }),
    created_at: new Date('2024-02-14T14:15:00Z'),
    updated_at: new Date('2024-02-15T09:00:00Z'),
    created_by: null,
    acknowledged_by: 'user1',
    acknowledged_at: new Date('2024-02-15T09:00:00Z'),
    assigned_to: 'user1',
    resolved_by: null,
    resolved_at: null,
    resolution_notes: null
  },
  {
    id: 'alert3',
    type: 'predictive_risk',
    entity_type: 'project',
    entity_id: 'proj3',
    entity_name: 'Projet Rénovation Hôpital Central',
    threshold_key: 'risk_score',
    threshold_value: 75.0,
    actual_value: 88.0,
    variance: 13.0,
    severity: 'critical',
    status: 'resolved',
    message: 'Risque projet élevé détecté (score 88/100)',
    details: JSON.stringify({ 
      risk_factors: ['complexity', 'timeline_pressure'],
      predicted_delay: 15,
      predicted_overrun: 12.5
    }),
    created_at: new Date('2024-02-10T16:20:00Z'),
    updated_at: new Date('2024-02-14T11:30:00Z'),
    created_by: null,
    acknowledged_by: 'user1',
    acknowledged_at: new Date('2024-02-11T08:00:00Z'),
    assigned_to: 'user2',
    resolved_by: 'user2',
    resolved_at: new Date('2024-02-14T11:30:00Z'),
    resolution_notes: 'Équipe technique renforcée avec expert senior. Planning réajusté avec client (+1 semaine). Risque ramené à 45/100.'
  }
];

const mockAlertThresholds = [
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
  },
  {
    id: 'threshold3',
    key: 'risk_score',
    value: 75.0,
    operator: 'less_than',
    is_active: true,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01')
  },
  {
    id: 'threshold4',
    key: 'global_margin',
    value: 18.0,
    operator: 'greater_than',
    is_active: true,
    created_at: new Date('2024-02-01'),
    updated_at: new Date('2024-02-01')
  }
];

// ========================================
// HANDLERS MSW POUR APIS
// ========================================

export const handlers = [
  // Analytics API
  rest.get('/api/analytics/kpis', (req, res, ctx) => {
    return res(ctx.json(mockKpisData));
  }),

  rest.get('/api/analytics/conversion-trends', (req, res, ctx) => {
    const period_months = req.url.searchParams.get('period_months') || '12';
    const months = parseInt(period_months);
    
    const limitedTrends = {
      ...mockConversionTrends,
      conversionTrends: {
        monthlyData: mockConversionTrends.conversionTrends.monthlyData.slice(-months)
      },
      revenueTrends: {
        monthlyData: mockConversionTrends.revenueTrends.monthlyData.slice(-months)
      }
    };
    
    return res(ctx.json(limitedTrends));
  }),

  rest.get('/api/analytics/margin-analysis', (req, res, ctx) => {
    return res(ctx.json(mockMarginAnalysis));
  }),

  rest.post('/api/analytics/generate-snapshot', (req, res, ctx) => {
    const { type, include_charts, format } = req.body as any;
    
    const snapshot = {
      id: `snapshot_${Date.now()}`,
      type,
      include_charts,
      format,
      snapshotDate: new Date(),
      periodFrom: new Date('2024-01-01'),
      periodTo: new Date('2024-02-29'),
      totalAos: 28,
      totalOffers: 18,
      totalProjects: 12,
      conversionRateAoToOffer: '64.3',
      conversionRateOfferToProject: '66.7',
      avgDelayDays: '8.5',
      totalRevenueForecast: '285000.0',
      avgTeamLoadPercentage: '78.5',
      criticalDeadlinesCount: 3,
      delayedProjectsCount: 2,
      createdAt: new Date()
    };
    
    return res(ctx.json(snapshot));
  }),

  // Predictive API
  rest.post('/api/predictive/revenue-forecast', (req, res, ctx) => {
    const { forecast_months = 6, method = 'exp_smoothing' } = req.body as any;
    
    const forecast = {
      ...mockRevenueForecast,
      forecast_point: {
        ...mockRevenueForecast.forecast_point,
        method_used: method,
        target_period: `2024-${String(new Date().getMonth() + forecast_months + 1).padStart(2, '0')}`
      }
    };
    
    return res(ctx.json(forecast));
  }),

  rest.post('/api/predictive/project-risks', (req, res, ctx) => {
    const { risk_level = 'medium', limit = 10 } = req.body as any;
    
    let filteredRisks = mockProjectRisks;
    
    if (risk_level === 'high') {
      filteredRisks = mockProjectRisks.filter(r => r.risk_score >= 80);
    } else if (risk_level === 'medium') {
      filteredRisks = mockProjectRisks.filter(r => r.risk_score >= 60 && r.risk_score < 80);
    }
    
    return res(ctx.json(filteredRisks.slice(0, limit)));
  }),

  // Business Alerts API
  rest.get('/api/alerts/business', (req, res, ctx) => {
    const status = req.url.searchParams.get('status');
    const severity = req.url.searchParams.get('severity');
    const limit = parseInt(req.url.searchParams.get('limit') || '50');
    
    let filteredAlerts = mockBusinessAlerts;
    
    if (status && status !== 'all') {
      filteredAlerts = filteredAlerts.filter(a => a.status === status);
    }
    
    if (severity && severity !== 'all') {
      filteredAlerts = filteredAlerts.filter(a => a.severity === severity);
    }
    
    return res(ctx.json(filteredAlerts.slice(0, limit)));
  }),

  rest.post('/api/alerts/business/:id/acknowledge', (req, res, ctx) => {
    const { id } = req.params;
    const { assigned_to, notes } = req.body as any;
    
    const acknowledgedAlert = {
      id,
      status: 'acknowledged',
      acknowledged_by: 'test-user',
      acknowledged_at: new Date(),
      assigned_to,
      notes,
      updated_at: new Date()
    };
    
    return res(ctx.json(acknowledgedAlert));
  }),

  rest.post('/api/alerts/business/:id/resolve', (req, res, ctx) => {
    const { id } = req.params;
    const { resolution_notes } = req.body as any;
    
    if (!resolution_notes || resolution_notes.length < 10) {
      return res(
        ctx.status(400),
        ctx.json({ error: 'Resolution notes are required (minimum 10 characters)' })
      );
    }
    
    const resolvedAlert = {
      id,
      status: 'resolved',
      resolved_by: 'test-user',
      resolved_at: new Date(),
      resolution_notes,
      updated_at: new Date()
    };
    
    return res(ctx.json(resolvedAlert));
  }),

  rest.get('/api/alerts/thresholds', (req, res, ctx) => {
    return res(ctx.json(mockAlertThresholds.filter(t => t.is_active)));
  }),

  rest.post('/api/alerts/thresholds', (req, res, ctx) => {
    const { key, value, operator, is_active = true } = req.body as any;
    
    const newThreshold = {
      id: `threshold_${Date.now()}`,
      key,
      value: parseFloat(value),
      operator,
      is_active,
      created_at: new Date(),
      updated_at: new Date()
    };
    
    return res(ctx.status(201), ctx.json(newThreshold));
  }),

  rest.put('/api/alerts/thresholds/:id', (req, res, ctx) => {
    const { id } = req.params;
    const updateData = req.body as any;
    
    const existingThreshold = mockAlertThresholds.find(t => t.id === id);
    if (!existingThreshold) {
      return res(ctx.status(404), ctx.json({ error: 'Threshold not found' }));
    }
    
    const updatedThreshold = {
      ...existingThreshold,
      ...updateData,
      updated_at: new Date()
    };
    
    return res(ctx.json(updatedThreshold));
  }),

  // Error handlers pour tests erreurs
  rest.get('/api/analytics/kpis-error', (req, res, ctx) => {
    return res(ctx.status(500), ctx.json({ error: 'Internal server error' }));
  }),

  rest.get('/api/analytics/timeout', (req, res, ctx) => {
    return res(ctx.delay(5000), ctx.json({})); // Simuler timeout
  }),

  // Handler générique pour tous les autres endpoints
  rest.get('/api/*', (req, res, ctx) => {
    console.warn(`Unhandled API call: ${req.url.pathname}`);
    return res(ctx.status(404), ctx.json({ error: 'Endpoint not found' }));
  }),

  rest.post('/api/*', (req, res, ctx) => {
    console.warn(`Unhandled API call: ${req.url.pathname}`);
    return res(ctx.status(404), ctx.json({ error: 'Endpoint not found' }));
  })
];

// ========================================
// SETUP SERVEUR MSW POUR TESTS
// ========================================

export const server = setupServer(...handlers);

// Helper pour modifier handlers pendant tests
export const updateHandlers = (newHandlers: any[]) => {
  server.use(...newHandlers);
};

// Helper pour reset handlers
export const resetHandlers = () => {
  server.resetHandlers(...handlers);
};

// Helper pour simuler erreurs spécifiques
export const simulateApiError = (endpoint: string, status: number = 500, message: string = 'Server Error') => {
  server.use(
    rest.get(endpoint, (req, res, ctx) => {
      return res(ctx.status(status), ctx.json({ error: message }));
    })
  );
};

// Helper pour simuler latence
export const simulateLatency = (endpoint: string, delay: number = 2000) => {
  server.use(
    rest.get(endpoint, (req, res, ctx) => {
      return res(ctx.delay(delay), ctx.json({}));
    })
  );
};

export default { handlers, server, updateHandlers, resetHandlers, simulateApiError, simulateLatency };