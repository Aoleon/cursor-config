import { rest } from 'msw';
import { 
  createMockDateAlert, 
  createMockProjectTimeline, 
  createMockBusinessRule,
  createMockDateAlertsSummary,
  getGroundTruthScenario 
} from './menuiserie-test-helpers';
import type { ProjectStatus } from '@shared/schema';

/**
 * Handlers MSW pour les APIs d'intelligence temporelle
 * Phase 2.5 - Tests exhaustifs
 */

// ========================================
// ENDPOINTS PROJECT TIMELINES
// ========================================

export const projectTimelinesHandlers = [
  // GET /api/project-timelines
  rest.get('/api/project-timelines', (req, res, ctx) => {
    const projectId = req.url.searchParams.get('projectId');
    
    if (projectId) {
      // Retourner timelines pour un projet spécifique
      const timelines = [
        createMockProjectTimeline({ 
          projectId, 
          phase: 'etude', 
          durationDays: 5 
        }),
        createMockProjectTimeline({ 
          projectId, 
          phase: 'approvisionnement', 
          durationDays: 14 
        }),
        createMockProjectTimeline({ 
          projectId, 
          phase: 'chantier', 
          durationDays: 3 
        })
      ];
      
      return res(ctx.json(timelines));
    }
    
    // Retourner toutes les timelines
    const allTimelines = Array.from({ length: 20 }, (_, i) => 
      createMockProjectTimeline({
        projectId: `project-${i}`,
        phase: (['etude', 'approvisionnement', 'chantier'] as ProjectStatus[])[i % 3],
        durationDays: Math.floor(Math.random() * 10) + 3
      })
    );
    
    return res(ctx.json(allTimelines));
  }),

  // POST /api/project-timelines/calculate
  rest.post('/api/project-timelines/calculate', async (req, res, ctx) => {
    const body = await req.json();
    const { projectId, context } = body;
    
    // Simuler calcul basé sur le contexte
    let scenario = 'fenetre_pvc_standard';
    if (context?.projectType === 'porte_alu') {
      scenario = 'porte_alu_complexe_hiver';
    } else if (context?.location?.isHistoricalBuilding) {
      scenario = 'batiment_historique_abf';
    }
    
    const groundTruth = getGroundTruthScenario(scenario);
    
    return res(ctx.json({
      projectId,
      phases: groundTruth.expectedTimeline,
      totalDuration: groundTruth.expectedTimeline.total,
      appliedRules: groundTruth.businessRules,
      constraints: groundTruth.expectedConstraints || [],
      confidence: 0.95,
      optimizationOpportunities: groundTruth.optimizationOpportunities || []
    }));
  }),

  // PATCH /api/project-timelines/:id
  rest.patch('/api/project-timelines/:id', async (req, res, ctx) => {
    const timelineId = req.params.id;
    const updates = await req.json();
    
    // Simuler mise à jour réussie
    const updatedTimeline = createMockProjectTimeline({
      ...updates,
      projectId: updates.projectId || 'project-1'
    });
    updatedTimeline.id = timelineId as string;
    
    return res(ctx.json(updatedTimeline));
  }),

  // GET /api/project-timelines/stats
  rest.get('/api/project-timelines/stats', (req, res, ctx) => {
    return res(ctx.json({
      active: 15,
      onTime: 12,
      delayed: 2,
      critical: 1,
      averageDelayDays: 2.3,
      totalProjects: 18,
      completionRate: 0.85
    }));
  })
];

// ========================================
// ENDPOINTS DATE ALERTS
// ========================================

export const dateAlertsHandlers = [
  // GET /api/date-alerts
  rest.get('/api/date-alerts', (req, res, ctx) => {
    const severity = req.url.searchParams.get('severity');
    const status = req.url.searchParams.get('status');
    const limit = parseInt(req.url.searchParams.get('limit') || '10');
    
    let alerts = [
      createMockDateAlert({ 
        severity: 'critical', 
        alertType: 'deadline_critical',
        targetDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // +7 jours
      }),
      createMockDateAlert({ 
        severity: 'warning', 
        alertType: 'delay_risk',
        phase: 'chantier'
      }),
      createMockDateAlert({ 
        severity: 'info', 
        alertType: 'optimization',
        phase: 'approvisionnement'
      }),
      createMockDateAlert({ 
        severity: 'warning', 
        alertType: 'resource_conflict'
      }),
      createMockDateAlert({ 
        severity: 'critical', 
        alertType: 'external_constraint',
        phase: 'chantier'
      })
    ];
    
    // Filtrer par severity si spécifié
    if (severity) {
      alerts = alerts.filter(alert => alert.severity === severity);
    }
    
    // Filtrer par status si spécifié
    if (status) {
      alerts = alerts.filter(alert => alert.status === status);
    }
    
    // Limiter le nombre de résultats
    alerts = alerts.slice(0, limit);
    
    return res(ctx.json(alerts));
  }),

  // GET /api/date-alerts/summary
  rest.get('/api/date-alerts/summary', (req, res, ctx) => {
    const summary = createMockDateAlertsSummary({
      totalProjects: 18,
      activeProjects: 15,
      criticalDeadlines: 2,
      delayRisks: 3,
      optimizationOpportunities: 4,
      averageDelayDays: 2.3
    });
    
    return res(ctx.json(summary));
  }),

  // POST /api/date-alerts/:id/acknowledge
  rest.post('/api/date-alerts/:id/acknowledge', async (req, res, ctx) => {
    const alertId = req.params.id;
    const body = await req.json();
    
    const acknowledgedAlert = createMockDateAlert();
    acknowledgedAlert.id = alertId as string;
    acknowledgedAlert.status = 'acknowledged';
    acknowledgedAlert.actionTaken = body.actionTaken || 'Acknowledged by user';
    
    return res(ctx.json(acknowledgedAlert));
  }),

  // POST /api/date-alerts/:id/resolve
  rest.post('/api/date-alerts/:id/resolve', async (req, res, ctx) => {
    const alertId = req.params.id;
    const body = await req.json();
    
    const resolvedAlert = createMockDateAlert();
    resolvedAlert.id = alertId as string;
    resolvedAlert.status = 'resolved';
    resolvedAlert.resolvedAt = new Date();
    resolvedAlert.actionTaken = body.resolution || 'Resolved by user';
    
    return res(ctx.json(resolvedAlert));
  }),

  // POST /api/date-alerts/detect
  rest.post('/api/date-alerts/detect', async (req, res, ctx) => {
    const body = await req.json();
    const { projectId, type } = body;
    
    // Simuler détection selon le type
    let detectedAlerts = [];
    
    if (type === 'delay_risk') {
      detectedAlerts.push(createMockDateAlert({
        alertType: 'delay_risk',
        projectId,
        severity: 'warning',
        phase: 'chantier'
      }));
    } else if (type === 'resource_conflict') {
      detectedAlerts.push(createMockDateAlert({
        alertType: 'resource_conflict',
        projectId,
        severity: 'warning'
      }));
    } else {
      // Détection complète
      detectedAlerts = [
        createMockDateAlert({ alertType: 'delay_risk', projectId }),
        createMockDateAlert({ alertType: 'optimization', projectId })
      ];
    }
    
    return res(ctx.json({
      detectedAlerts,
      totalDetected: detectedAlerts.length,
      detectionTimeMs: Math.floor(Math.random() * 500) + 100,
      confidence: 0.88
    }));
  })
];

// ========================================
// ENDPOINTS BUSINESS RULES
// ========================================

export const businessRulesHandlers = [
  // GET /api/business-rules
  rest.get('/api/business-rules', (req, res, ctx) => {
    const phase = req.url.searchParams.get('phase');
    const category = req.url.searchParams.get('category');
    
    let rules = [
      createMockBusinessRule({
        name: 'Passation Standard',
        phase: 'passation',
        baseDuration: 30,
        category: 'standard'
      }),
      createMockBusinessRule({
        name: 'Étude Complexe',
        phase: 'etude',
        baseDuration: 8,
        multiplierFactor: 1.6,
        category: 'complexe'
      }),
      createMockBusinessRule({
        name: 'Approvisionnement PVC',
        phase: 'approvisionnement',
        baseDuration: 14,
        category: 'materiaux'
      }),
      createMockBusinessRule({
        name: 'Contrainte Météo Hiver',
        phase: 'chantier',
        baseDuration: 5,
        multiplierFactor: 1.4,
        category: 'contraintes'
      }),
      createMockBusinessRule({
        name: 'VISA ABF',
        phase: 'visa_architecte',
        baseDuration: 45,
        category: 'reglementaire'
      })
    ];
    
    // Filtrer par phase si spécifié
    if (phase) {
      rules = rules.filter(rule => rule.phase === phase);
    }
    
    // Filtrer par category si spécifié
    if (category) {
      rules = rules.filter(rule => rule.category === category);
    }
    
    return res(ctx.json(rules));
  }),

  // POST /api/business-rules
  rest.post('/api/business-rules', async (req, res, ctx) => {
    const newRule = await req.json();
    
    const createdRule = createMockBusinessRule({
      ...newRule,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    return res(ctx.status(201), ctx.json(createdRule));
  }),

  // PUT /api/business-rules/:id
  rest.put('/api/business-rules/:id', async (req, res, ctx) => {
    const ruleId = req.params.id;
    const updates = await req.json();
    
    const updatedRule = createMockBusinessRule({
      ...updates,
      updatedAt: new Date()
    });
    updatedRule.id = ruleId as string;
    
    return res(ctx.json(updatedRule));
  }),

  // DELETE /api/business-rules/:id
  rest.delete('/api/business-rules/:id', (req, res, ctx) => {
    return res(ctx.status(204));
  })
];

// ========================================
// ENDPOINTS PERFORMANCE METRICS
// ========================================

export const performanceMetricsHandlers = [
  // GET /api/performance-metrics
  rest.get('/api/performance-metrics', (req, res, ctx) => {
    const period = req.url.searchParams.get('period') || '30d';
    
    return res(ctx.json({
      totalProjects: 157,
      averageDelayDays: 2.1,
      onTimeCompletionRate: 0.87,
      optimizationStats: {
        totalGainDays: 45,
        averageGainPerProject: 2.8,
        implementedOptimizations: 16,
        potentialOptimizations: 23
      },
      performanceByPhase: {
        passation: { averageDays: 32, onTimeRate: 0.92 },
        etude: { averageDays: 6.2, onTimeRate: 0.89 },
        approvisionnement: { averageDays: 16.5, onTimeRate: 0.84 },
        chantier: { averageDays: 4.8, onTimeRate: 0.78 }
      },
      trends: {
        delayTrend: -0.3, // amélioration
        efficiencyTrend: 0.15,
        satisfactionTrend: 0.08
      },
      period,
      lastUpdated: new Date().toISOString()
    }));
  }),

  // GET /api/performance-metrics/load-test
  rest.get('/api/performance-metrics/load-test', (req, res, ctx) => {
    const projectCount = parseInt(req.url.searchParams.get('projectCount') || '100');
    
    // Simuler temps de réponse basé sur la charge
    const simulatedTime = Math.max(100, projectCount * 15 + Math.random() * 200);
    
    return res(
      ctx.delay(Math.min(simulatedTime, 5000)), // Max 5s pour éviter timeout
      ctx.json({
        projectCount,
        calculationTimeMs: simulatedTime,
        memoryUsageMB: 50 + (projectCount * 0.3),
        success: simulatedTime < 5000,
        performance: simulatedTime < 1000 ? 'excellent' : 
                    simulatedTime < 3000 ? 'good' : 'acceptable'
      })
    );
  })
];

// ========================================
// ENDPOINTS SIMULATION ET DEBUG
// ========================================

export const simulationHandlers = [
  // POST /api/simulation/delay
  rest.post('/api/simulation/delay', async (req, res, ctx) => {
    const body = await req.json();
    const { projectId, delayDays = 3 } = body;
    
    // Simuler création alerte de retard
    const delayAlert = createMockDateAlert({
      alertType: 'delay_risk',
      projectId,
      severity: delayDays > 5 ? 'critical' : 'warning',
      phase: 'chantier'
    });
    
    return res(ctx.json({
      simulatedDelay: delayDays,
      generatedAlert: delayAlert,
      impactedPhases: ['chantier'],
      suggestedActions: [
        'Réaffecter équipe',
        'Prolonger horaires',
        'Alerter client'
      ]
    }));
  }),

  // POST /api/simulation/weather-impact
  rest.post('/api/simulation/weather-impact', async (req, res, ctx) => {
    const body = await req.json();
    const { weatherType = 'rain', duration = 3 } = body;
    
    const weatherAlert = createMockDateAlert({
      alertType: 'external_constraint',
      severity: duration > 5 ? 'critical' : 'warning',
      phase: 'chantier'
    });
    
    return res(ctx.json({
      weatherType,
      duration,
      impact: {
        delayDays: Math.ceil(duration * 0.6),
        affectedPhases: ['chantier'],
        costIncrease: duration * 150 // €/jour
      },
      generatedAlert: weatherAlert,
      mitigationActions: [
        'Reporter travaux extérieurs',
        'Préparer protections',
        'Réorganiser planning'
      ]
    }));
  })
];

// ========================================
// HANDLERS COMBINÉS
// ========================================

export const intelligenceHandlers = [
  ...projectTimelinesHandlers,
  ...dateAlertsHandlers,
  ...businessRulesHandlers,
  ...performanceMetricsHandlers,
  ...simulationHandlers
];

export default intelligenceHandlers;