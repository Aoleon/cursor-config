import { vi } from 'vitest';
import type { 
  Project, ProjectTimeline, DateAlert, DateIntelligenceRule,
  ProjectStatus, Offer, Ao
} from '@shared/schema';
import groundTruth from '../fixtures/menuiserie-ground-truth.json';

/**
 * Helpers spécialisés pour les tests du système intelligent de dates
 * Menuiserie française - Phase 2.5
 */

// ========================================
// TYPES POUR LES TESTS
// ========================================

export interface MockProjectContext {
  type?: string;
  surface?: number;
  complexity?: 'normale' | 'elevee';
  season?: 'spring' | 'summer' | 'autumn' | 'winter';
  isExterior?: boolean;
  customWork?: boolean;
  location?: {
    weatherZone?: string;
    accessibility?: string;
    departement?: string;
    isHistoricalBuilding?: boolean;
    abfClassification?: string;
  };
  resources?: {
    teamSize?: number;
    subcontractors?: string[];
    equipmentNeeded?: string[];
  };
}

export interface MockTimelineOptions {
  projectId?: string;
  phase?: ProjectStatus;
  startDate?: Date;
  endDate?: Date;
  durationDays?: number;
  status?: 'planned' | 'in_progress' | 'completed' | 'delayed';
  appliedRules?: string[];
  constraints?: string[];
}

export interface MockAlertOptions {
  alertType?: string;
  severity?: 'info' | 'warning' | 'critical';
  projectId?: string;
  phase?: ProjectStatus;
  targetDate?: Date;
  status?: 'pending' | 'acknowledged' | 'resolved';
  suggestedActions?: string[];
}

// ========================================
// FACTORY FUNCTIONS POUR DONNÉES DE TEST
// ========================================

/**
 * Créer un projet de menuiserie pour les tests
 */
export const createMockMenuiserieProject = (context: MockProjectContext = {}): Project => {
  const baseId = `project-${Math.random().toString(36).substr(2, 9)}`;
  
  return {
    id: baseId,
    reference: `PRJ-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
    offerId: `offer-${baseId}`,
    aoId: `ao-${baseId}`,
    title: `Projet ${context.type || 'menuiserie'} - Test`,
    client: 'Client Test SA',
    location: context.location?.departement ? `Test Location (${context.location.departement})` : 'Test Location (75)',
    estimatedAmount: (Math.random() * 100000 + 50000).toString(),
    status: 'etude' as ProjectStatus,
    responsibleUserId: 'user-test-1',
    teamIds: ['team-test-1'],
    startDate: new Date(),
    deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // +90 jours
    isPriority: false,
    complexity: context.complexity || 'normale',
    surface: context.surface || 30,
    customWork: context.customWork || false,
    isExterior: context.isExterior || true,
    createdAt: new Date(),
    updatedAt: new Date(),
    // Contexte spécialisé pour les tests d'intelligence temporelle
    context: {
      projectType: context.type?.includes('neuf') ? 'neuf' : 'renovation',
      materialTypes: context.type ? [extractMaterialFromType(context.type)] : ['pvc'],
      seasonality: context.season ? {
        season: context.season,
        weatherDependent: context.isExterior || false
      } : undefined,
      location: {
        weatherZone: context.location?.weatherZone || 'tempere',
        accessibility: context.location?.accessibility || 'facile',
        departement: context.location?.departement || '75'
      },
      resources: {
        teamSize: context.resources?.teamSize || 2,
        subcontractors: context.resources?.subcontractors || [],
        equipmentNeeded: context.resources?.equipmentNeeded || ['echafaudage']
      }
    }
  };
};

/**
 * Créer une timeline de projet pour les tests
 */
export const createMockProjectTimeline = (options: MockTimelineOptions = {}): ProjectTimeline => {
  const startDate = options.startDate || new Date();
  const durationDays = options.durationDays || 5;
  const endDate = options.endDate || new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);
  
  return {
    id: `timeline-${Math.random().toString(36).substr(2, 9)}`,
    projectId: options.projectId || 'project-test-1',
    phase: options.phase || 'etude',
    startDate,
    endDate,
    durationDays,
    estimatedDuration: durationDays,
    status: options.status || 'planned',
    appliedRules: options.appliedRules || ['rule_standard'],
    constraints: options.constraints || [],
    riskFactors: [],
    optimizationOpportunities: [],
    createdAt: new Date(),
    updatedAt: new Date()
  };
};

/**
 * Créer une alerte de date pour les tests
 */
export const createMockDateAlert = (options: MockAlertOptions = {}): DateAlert => {
  return {
    id: `alert-${Math.random().toString(36).substr(2, 9)}`,
    entityType: 'project',
    entityId: options.projectId || 'project-test-1',
    alertType: options.alertType || 'delay_risk',
    title: `Test Alert - ${options.alertType || 'delay_risk'}`,
    message: `Test alert message for ${options.phase || 'general'} phase`,
    severity: options.severity || 'warning',
    status: options.status || 'pending',
    targetDate: options.targetDate,
    phase: options.phase,
    suggestedActions: options.suggestedActions || ['Action 1', 'Action 2'],
    assignedTo: null,
    resolvedAt: null,
    actionTaken: null,
    createdAt: new Date()
  };
};

/**
 * Créer une règle métier pour les tests
 */
export const createMockBusinessRule = (overrides = {}): DateIntelligenceRule => {
  return {
    id: `rule-${Math.random().toString(36).substr(2, 9)}`,
    name: 'Test Business Rule',
    description: 'Règle de test pour validation',
    phase: 'etude' as ProjectStatus,
    baseDuration: 5,
    multiplierFactor: 1.0,
    conditions: {
      complexity: 'normale',
      projectType: 'standard'
    },
    priority: 5,
    isActive: true,
    category: 'standard',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  };
};

// ========================================
// SCÉNARIOS GROUND TRUTH
// ========================================

/**
 * Récupérer un scénario ground truth par nom
 */
export const getGroundTruthScenario = (scenarioName: string) => {
  return groundTruth.scenarios[scenarioName as keyof typeof groundTruth.scenarios];
};

/**
 * Créer un projet basé sur un scénario ground truth
 */
export const createProjectFromGroundTruth = (scenarioName: string): Project => {
  const scenario = getGroundTruthScenario(scenarioName);
  if (!scenario) {
    throw new Error(`Scenario ${scenarioName} not found in ground truth`);
  }
  
  return createMockMenuiserieProject({
    type: scenario.project.type,
    surface: scenario.project.surface,
    complexity: scenario.project.complexity as 'normale' | 'elevee',
    season: scenario.project.season as any,
    isExterior: scenario.project.isExterior,
    customWork: scenario.project.customWork,
    location: scenario.project.location
  });
};

/**
 * Créer des timelines basées sur un scénario ground truth
 */
export const createTimelinesFromGroundTruth = (scenarioName: string, projectId: string): ProjectTimeline[] => {
  const scenario = getGroundTruthScenario(scenarioName);
  if (!scenario) {
    throw new Error(`Scenario ${scenarioName} not found in ground truth`);
  }
  
  const timelines: ProjectTimeline[] = [];
  const startDate = new Date();
  let currentDate = new Date(startDate);
  
  Object.entries(scenario.expectedTimeline).forEach(([phase, config]) => {
    if (phase === 'total') return;
    
    const phaseConfig = config as any;
    const endDate = new Date(currentDate.getTime() + phaseConfig.durationDays * 24 * 60 * 60 * 1000);
    
    timelines.push(createMockProjectTimeline({
      projectId,
      phase: phase as ProjectStatus,
      startDate: new Date(currentDate),
      endDate,
      durationDays: phaseConfig.durationDays,
      appliedRules: [phaseConfig.ruleName].filter(Boolean)
    }));
    
    currentDate = new Date(endDate);
  });
  
  return timelines;
};

// ========================================
// HELPERS POUR TESTS DE PERFORMANCE
// ========================================

/**
 * Créer un batch de projets pour tests de performance
 */
export const createProjectBatch = (count: number, baseScenario = 'performance_test_standard'): Project[] => {
  const projects: Project[] = [];
  
  for (let i = 0; i < count; i++) {
    const project = createProjectFromGroundTruth(baseScenario);
    project.id = `perf-project-${i.toString().padStart(4, '0')}`;
    project.reference = `PERF-${i.toString().padStart(4, '0')}`;
    projects.push(project);
  }
  
  return projects;
};

/**
 * Créer un batch de timelines pour tests de performance
 */
export const createTimelineBatch = (count: number): ProjectTimeline[] => {
  const timelines: ProjectTimeline[] = [];
  
  for (let i = 0; i < count; i++) {
    const timeline = createMockProjectTimeline({
      projectId: `perf-project-${Math.floor(i / 5)}`, // 5 timelines par projet
      phase: (['passation', 'etude', 'approvisionnement', 'chantier', 'sav'] as ProjectStatus[])[i % 5]
    });
    timeline.id = `perf-timeline-${i.toString().padStart(4, '0')}`;
    timelines.push(timeline);
  }
  
  return timelines;
};

// ========================================
// MOCKS ET FIXTURES SPÉCIALISÉS
// ========================================

/**
 * Mock du DateIntelligenceService pour les tests
 */
export const createMockDateIntelligenceService = () => {
  return {
    calculateProjectTimeline: vi.fn().mockImplementation(async (project: Project) => {
      // Simuler un calcul réaliste basé sur le type de projet
      const baseScenario = project.context?.projectType === 'neuf' ? 
        'fenetre_pvc_standard' : 'porte_alu_complexe_hiver';
      
      const scenario = getGroundTruthScenario(baseScenario);
      return {
        projectId: project.id,
        phases: scenario.expectedTimeline,
        totalDuration: scenario.expectedTimeline.total,
        appliedRules: scenario.businessRules,
        constraints: scenario.expectedConstraints || [],
        confidence: 0.95
      };
    }),
    
    updateProjectTimeline: vi.fn().mockResolvedValue(true),
    validateBusinessRules: vi.fn().mockResolvedValue([]),
    optimizeTimeline: vi.fn().mockResolvedValue([])
  };
};

/**
 * Mock du DateAlertDetectionService pour les tests
 */
export const createMockDateAlertDetectionService = () => {
  return {
    detectDelayRisks: vi.fn().mockResolvedValue([]),
    detectPlanningConflicts: vi.fn().mockResolvedValue([]),
    detectCriticalDeadlines: vi.fn().mockResolvedValue([]),
    runPeriodicDetection: vi.fn().mockResolvedValue([]),
    generateOptimizationSuggestions: vi.fn().mockResolvedValue([])
  };
};

/**
 * Mock des données de dashboard pour les tests
 */
export const createMockDateAlertsSummary = (overrides = {}) => {
  return {
    totalProjects: 15,
    activeProjects: 12,
    criticalDeadlines: 2,
    delayRisks: 3,
    optimizationOpportunities: 5,
    averageDelayDays: 2.5,
    recentAlerts: [
      createMockDateAlert({ severity: 'critical', alertType: 'deadline_critical' }),
      createMockDateAlert({ severity: 'warning', alertType: 'delay_risk' })
    ],
    ...overrides
  };
};

// ========================================
// HELPERS UTILITAIRES
// ========================================

/**
 * Extraire le type de matériau du type de projet
 */
function extractMaterialFromType(projectType: string): string {
  if (projectType.includes('pvc')) return 'pvc';
  if (projectType.includes('alu')) return 'aluminium';
  if (projectType.includes('bois')) return 'bois';
  if (projectType.includes('acier')) return 'acier';
  return 'pvc'; // défaut
}

/**
 * Attendre qu'une condition soit remplie avec timeout spécialisé
 */
export const waitForIntelligenceCondition = async (
  condition: () => boolean,
  timeout = 10000,
  interval = 200,
  description = 'Intelligence condition'
) => {
  const start = Date.now();
  
  while (Date.now() - start < timeout) {
    if (condition()) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  throw new Error(`${description} not met within ${timeout}ms`);
};

/**
 * Mesurer le temps d'exécution d'une fonction
 */
export const measureExecutionTime = async <T>(
  fn: () => Promise<T>,
  label = 'Function execution'
): Promise<{ result: T; durationMs: number }> => {
  const startTime = performance.now();
  const result = await fn();
  const durationMs = performance.now() - startTime;
  
  console.log(`${label}: ${durationMs.toFixed(2)}ms`);
  
  return { result, durationMs };
};

/**
 * Créer un détecteur de fuite mémoire pour les tests de performance
 */
export const createMemoryLeakDetector = () => {
  const initialMemory = process.memoryUsage();
  
  return {
    check: (threshold = 50 * 1024 * 1024) => { // 50MB par défaut
      const currentMemory = process.memoryUsage();
      const heapIncrease = currentMemory.heapUsed - initialMemory.heapUsed;
      
      if (heapIncrease > threshold) {
        console.warn(`Potential memory leak detected: +${(heapIncrease / 1024 / 1024).toFixed(2)}MB`);
        return false;
      }
      return true;
    },
    
    report: () => {
      const currentMemory = process.memoryUsage();
      return {
        initial: initialMemory,
        current: currentMemory,
        increase: {
          heapUsed: currentMemory.heapUsed - initialMemory.heapUsed,
          external: currentMemory.external - initialMemory.external
        }
      };
    }
  };
};