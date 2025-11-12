import { logger } from '../utils/logger';
import { withErrorHandling } from '../utils/error-handler';
import { getAgentComplexTaskResolver } from './AgentComplexTaskResolver';
import { getAgentConflictResolver } from './AgentConflictResolver';
import { getAgentArchitectureAnalyzer } from './AgentArchitectureAnalyzer';
import { getAgentCodeSmellDetector } from './AgentCodeSmellDetector';
import { getAgentMigrationPlanner } from './AgentMigrationPlanner';
import { getAgentRiskAnalyzer } from './AgentRiskAnalyzer';
import { getAgentAutoOptimizer } from './AgentAutoOptimizer';
import { getAgentPerformanceMonitor } from './AgentPerformanceMonitor';
import { getAgentAdaptiveScheduler } from './AgentAdaptiveScheduler';
import { getAgentCursorHook } from './AgentCursorHook';
import { getAgentAutoTrigger } from './AgentAutoTrigger';
import { getAgentAutoOrchestrator } from './AgentAutoOrchestrator';
import type { IStorage } from '../storage-poc';

// ========================================
// TYPES ET INTERFACES
// ========================================

export interface AgentCapabilities {
  complexTaskResolution: boolean;
  conflictResolution: boolean;
  architectureAnalysis: boolean;
  codeSmellDetection: boolean;
  migrationPlanning: boolean;
  riskAnalysis: boolean;
  autoOptimization: boolean;
  performanceMonitoring: boolean;
  adaptiveScheduling: boolean;
}

export interface AgentHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  capabilities: AgentCapabilities;
  services: Array<{
    name: string;
    status: 'available' | 'unavailable' | 'error';
    lastCheck: Date;
  }>;
  overallScore: number; // 0-100
}

// ========================================
// AGENT ORCHESTRATOR
// ========================================

/**
 * Service d'orchestration central pour tous les services agent
 * Coordonne les services, vérifie leur santé, optimise leur utilisation
 */
export class AgentOrchestrator {
  private storage: IStorage;
  private services: Map<string, unknown> = new Map();
  private healthChecks: Map<string, Date> = new Map();
  private readonly HEALTH_CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

  constructor(storage: IStorage) {
    if (!storage) {
      throw new Error('Storage requis pour AgentOrchestrator');
    }
    this.storage = storage;
    this.initializeServices();
  }

  /**
   * Initialise tous les services agent
   */
  private initializeServices(): void {
    try {
      this.services.set('complexTaskResolver', getAgentComplexTaskResolver(this.storage));
      this.services.set('conflictResolver', getAgentConflictResolver(this.storage));
      this.services.set('architectureAnalyzer', getAgentArchitectureAnalyzer(this.storage));
      this.services.set('codeSmellDetector', getAgentCodeSmellDetector(this.storage));
      this.services.set('migrationPlanner', getAgentMigrationPlanner(this.storage));
      this.services.set('riskAnalyzer', getAgentRiskAnalyzer(this.storage));
      this.services.set('autoOptimizer', getAgentAutoOptimizer(this.storage));
      this.services.set('performanceMonitor', getAgentPerformanceMonitor(this.storage));
      this.services.set('adaptiveScheduler', getAgentAdaptiveScheduler(this.storage));
      this.services.set('cursorHook', getAgentCursorHook(this.storage));
      this.services.set('autoTrigger', getAgentAutoTrigger(this.storage));
      this.services.set('autoOrchestrator', getAgentAutoOrchestrator(this.storage));

      logger.info('Services agent initialisés', {
        metadata: {
          service: 'AgentOrchestrator',
          operation: 'initializeServices',
          servicesCount: this.services.size
        }
      });
    } catch (error) {
      logger.error('Erreur initialisation services agent', {
        metadata: {
          service: 'AgentOrchestrator',
          operation: 'initializeServices',
          error: error instanceof Error ? error.message : String(error)
        }
      });
      throw error;
    }
  }

  /**
   * Vérifie la santé de tous les services
   */
  async checkHealth(): Promise<AgentHealthStatus> {
    return withErrorHandling(
      async () => {
        const services: AgentHealthStatus['services'] = [];
        let healthyCount = 0;
        let totalCount = 0;

        for (const [name, service] of Array.from(this.services.entries())) {
          totalCount++;
          try {
            // Vérification basique: service existe et n'est pas null
            const isHealthy = service !== null && service !== undefined;
            
            if (isHealthy) {
              healthyCount++;
              services.push({
                name,
                status: 'available',
                lastCheck: new Date()
              });
            } else {
              services.push({
                name,
                status: 'unavailable',
                lastCheck: new Date()
              });
            }

            this.healthChecks.set(name, new Date());
          } catch (error) {
            services.push({
              name,
              status: 'error',
              lastCheck: new Date()
            });
            logger.debug(`Erreur vérification santé service ${name}`, {
              metadata: {
                service: 'AgentOrchestrator',
                operation: 'checkHealth',
                serviceName: name,
                error: error instanceof Error ? error.message : String(error)
              }
            });
          }
        }

        const overallScore = totalCount > 0 ? (healthyCount / totalCount) * 100 : 0;
        const status: AgentHealthStatus['status'] = overallScore >= 90
          ? 'healthy'
          : overallScore >= 70
          ? 'degraded'
          : 'unhealthy';

        const capabilities: AgentCapabilities = {
          complexTaskResolution: services.find(s => s.name === 'complexTaskResolver')?.status === 'available' || false,
          conflictResolution: services.find(s => s.name === 'conflictResolver')?.status === 'available' || false,
          architectureAnalysis: services.find(s => s.name === 'architectureAnalyzer')?.status === 'available' || false,
          codeSmellDetection: services.find(s => s.name === 'codeSmellDetector')?.status === 'available' || false,
          migrationPlanning: services.find(s => s.name === 'migrationPlanner')?.status === 'available' || false,
          riskAnalysis: services.find(s => s.name === 'riskAnalyzer')?.status === 'available' || false,
          autoOptimization: services.find(s => s.name === 'autoOptimizer')?.status === 'available' || false,
          performanceMonitoring: services.find(s => s.name === 'performanceMonitor')?.status === 'available' || false,
          adaptiveScheduling: services.find(s => s.name === 'adaptiveScheduler')?.status === 'available' || false
        };

        return {
          status,
          capabilities,
          services,
          overallScore
        };
      },
      {
        operation: 'checkHealth',
        service: 'AgentOrchestrator',
        metadata: {}
      }
    );
  }

  /**
   * Récupère un service par nom
   */
  getService<T>(serviceName: string): T | null {
    const service = this.services.get(serviceName);
    return (service as T) || null;
  }

  /**
   * Exécute une analyse complète du codebase
   */
  async runFullAnalysis(scope?: {
    files?: string[];
    services?: string[];
    modules?: string[];
  }): Promise<{
    architecture: Awaited<ReturnType<ReturnType<typeof getAgentArchitectureAnalyzer>['analyzeArchitecture']>>;
    codeSmells: Awaited<ReturnType<ReturnType<typeof getAgentCodeSmellDetector>['detectCodeSmells']>>;
    conflicts: Awaited<ReturnType<ReturnType<typeof getAgentConflictResolver>['detectConflicts']>>;
    health: AgentHealthStatus;
  }> {
    return withErrorHandling(
      async () => {
        const architectureAnalyzer = this.getService<ReturnType<typeof getAgentArchitectureAnalyzer>>('architectureAnalyzer');
        const codeSmellDetector = this.getService<ReturnType<typeof getAgentCodeSmellDetector>>('codeSmellDetector');
        const conflictResolver = this.getService<ReturnType<typeof getAgentConflictResolver>>('conflictResolver');

        if (!architectureAnalyzer || !codeSmellDetector || !conflictResolver) {
          throw new Error('Services requis non disponibles');
        }

        // Exécuter analyses en parallèle
        const [architecture, codeSmells, conflicts, health] = await Promise.all([
          architectureAnalyzer.analyzeArchitecture(scope),
          codeSmellDetector.detectCodeSmells(scope),
          conflictResolver.detectConflicts(scope),
          this.checkHealth()
        ]);

        logger.info('Analyse complète terminée', {
          metadata: {
            service: 'AgentOrchestrator',
            operation: 'runFullAnalysis',
            architectureIssues: architecture.issues.length,
            codeSmells: codeSmells.smells.length,
            conflicts: conflicts.length,
            healthScore: health.overallScore
          }
        });

        return {
          architecture,
          codeSmells,
          conflicts,
          health
        };
      },
      {
        operation: 'runFullAnalysis',
        service: 'AgentOrchestrator',
        metadata: {}
      }
    );
  }

  /**
   * Optimise automatiquement le codebase
   */
  async optimizeCodebase(): Promise<{
    optimizations: Awaited<ReturnType<ReturnType<typeof getAgentAutoOptimizer>['applyAutoOptimizations']>>;
    analysis: {
      architecture: Awaited<ReturnType<ReturnType<typeof getAgentArchitectureAnalyzer>['analyzeArchitecture']>>;
      codeSmells: Awaited<ReturnType<ReturnType<typeof getAgentCodeSmellDetector>['detectCodeSmells']>>;
      conflicts: Awaited<ReturnType<ReturnType<typeof getAgentConflictResolver>['detectConflicts']>>;
      health: AgentHealthStatus;
    };
  }> {
    return withErrorHandling(
      async () => {
        const autoOptimizer = this.getService<ReturnType<typeof getAgentAutoOptimizer>>('autoOptimizer');
        
        if (!autoOptimizer) {
          throw new Error('AgentAutoOptimizer non disponible');
        }

        // 1. Analyser codebase
        const analysis = await this.runFullAnalysis();

        // 2. Appliquer optimisations automatiques
        const optimizations = await autoOptimizer.applyAutoOptimizations();

        logger.info('Optimisation codebase terminée', {
          metadata: {
            service: 'AgentOrchestrator',
            operation: 'optimizeCodebase',
            optimizationsApplied: optimizations.applied.filter(a => a.success).length,
            totalBenefit: optimizations.totalActualBenefit
          }
        });

        return {
          optimizations,
          analysis
        };
      },
      {
        operation: 'optimizeCodebase',
        service: 'AgentOrchestrator',
        metadata: {}
      }
    );
  }
}

// ========================================
// SINGLETON INSTANCE
// ========================================

let agentOrchestratorInstance: AgentOrchestrator | null = null;

export function getAgentOrchestrator(storage: IStorage): AgentOrchestrator {
  if (!agentOrchestratorInstance) {
    agentOrchestratorInstance = new AgentOrchestrator(storage);
  }
  return agentOrchestratorInstance;
}

