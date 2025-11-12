import { logger } from '../utils/logger';
import type { IStorage } from '../storage-poc';

// ========================================
// REGISTRY CENTRALISÉ POUR SERVICES AGENT
// ========================================
// Centralise toutes les instances de services agent
// pour éviter duplications et optimiser performances
// ========================================

type ServiceName = 
  | 'fileLockManager'
  | 'cursorHook'
  | 'autoOrchestrator'
  | 'autoTrigger'
  | 'qualityWorkflow'
  | 'preCommitValidator'
  | 'workflowAuditor'
  | 'searchCache'
  | 'performanceOptimizer'
  | 'autoReviewer'
  | 'fastCorrector'
  | 'conflictResolver'
  | 'learningService'
  | 'parameterTuner'
  | 'regressionDetector'
  | 'toolCallAnalyzer'
  | 'intelligentPreloader'
  | 'toolCallOptimizer'
  | 'autoOptimizer'
  | 'performanceMonitor'
  | 'adaptiveScheduler'
  | 'databaseBatcher'
  | 'complexTaskResolver'
  | 'architectureAnalyzer'
  | 'codeSmellDetector'
  | 'migrationPlanner'
  | 'riskAnalyzer'
  | 'orchestrator'
  | 'taskAutomator'
  | 'scriptRunner'
  | 'commandExecutor'
  | 'automationDetector'
  | 'automationSuggester'
  | 'scriptDocumenter'
  | 'batchProcessor'
  | 'parallelExecutor'
  | 'optimizationIntegrator'
  | 'qualityValidator'
  | 'cacheOptimizer'
  | 'toolUsageOptimizer'
  | 'performanceValidator'
  | 'codeQualityEnforcer';

type ServiceInstance = unknown;

/**
 * Registry centralisé pour tous les services agent
 * Assure une seule instance par service (singleton)
 * Optimise les performances en évitant réinitialisations
 */
export class AgentServiceRegistry {
  private static instance: AgentServiceRegistry | null = null;
  private services: Map<ServiceName, ServiceInstance> = new Map();
  private storage: IStorage | null = null;
  private initializationPromises: Map<ServiceName, Promise<ServiceInstance>> = new Map();

  private constructor() {
    // Singleton privé
  }

  /**
   * Récupère l'instance unique du registry
   */
  static getInstance(): AgentServiceRegistry {
    if (!AgentServiceRegistry.instance) {
      AgentServiceRegistry.instance = new AgentServiceRegistry();
    }
    return AgentServiceRegistry.instance;
  }

  /**
   * Initialise le registry avec le storage
   */
  initialize(storage: IStorage): void {
    if (this.storage && this.storage !== storage) {
      logger.warn('AgentServiceRegistry réinitialisé avec nouveau storage', {
        metadata: {
          service: 'AgentServiceRegistry',
          operation: 'initialize'
        }
      });
    }
    this.storage = storage;
  }

  /**
   * Récupère un service (lazy loading)
   */
  async getService<T>(name: ServiceName): Promise<T> {
    if (!this.storage) {
      throw new Error('AgentServiceRegistry non initialisé. Appeler initialize(storage) d\'abord.');
    }

    // Si déjà chargé, retourner directement
    if (this.services.has(name)) {
      return this.services.get(name) as T;
    }

    // Si en cours d'initialisation, attendre
    if (this.initializationPromises.has(name)) {
      return await this.initializationPromises.get(name) as T;
    }

    // Initialiser le service
    const initPromise = this.initializeService(name);
    this.initializationPromises.set(name, initPromise);

    try {
      const service = await initPromise;
      this.services.set(name, service);
      this.initializationPromises.delete(name);
      return service as T;
    } catch (error) {
      this.initializationPromises.delete(name);
      throw error;
    }
  }

  /**
   * Initialise un service spécifique
   */
  private async initializeService(name: ServiceName): Promise<ServiceInstance> {
    if (!this.storage) {
      throw new Error('Storage requis');
    }

    logger.debug('Initialisation service agent', {
      metadata: {
        service: 'AgentServiceRegistry',
        operation: 'initializeService',
        serviceName: name
      }
    });

    switch (name) {
      case 'fileLockManager': {
        const { getAgentFileLockManager } = await import('./AgentFileLockManager');
        return getAgentFileLockManager(this.storage);
      }
      case 'cursorHook': {
        const { getAgentCursorHook } = await import('./AgentCursorHook');
        return getAgentCursorHook(this.storage);
      }
      case 'autoOrchestrator': {
        const { getAgentAutoOrchestrator } = await import('./AgentAutoOrchestrator');
        return getAgentAutoOrchestrator(this.storage);
      }
      case 'autoTrigger': {
        const { getAgentAutoTrigger } = await import('./AgentAutoTrigger');
        return getAgentAutoTrigger(this.storage);
      }
      case 'qualityWorkflow': {
        const { getAgentQualityWorkflow } = await import('./AgentQualityWorkflow');
        return getAgentQualityWorkflow(this.storage);
      }
      case 'preCommitValidator': {
        const { getAgentPreCommitValidator } = await import('./AgentPreCommitValidator');
        return getAgentPreCommitValidator(this.storage);
      }
      case 'workflowAuditor': {
        const { getAgentWorkflowAuditor } = await import('./AgentWorkflowAuditor');
        return getAgentWorkflowAuditor(this.storage);
      }
      case 'searchCache': {
        const { getAgentSearchCacheService } = await import('./AgentSearchCacheService');
        return getAgentSearchCacheService();
      }
      case 'performanceOptimizer': {
        const { getAgentPerformanceOptimizer } = await import('./AgentPerformanceOptimizer');
        return getAgentPerformanceOptimizer(this.storage);
      }
      case 'autoReviewer': {
        const { getAgentAutoReviewer } = await import('./AgentAutoReviewer');
        return getAgentAutoReviewer(this.storage);
      }
      case 'fastCorrector': {
        const { getAgentFastAutoCorrector } = await import('./AgentFastAutoCorrector');
        return getAgentFastAutoCorrector(this.storage);
      }
      case 'conflictResolver': {
        const { getAgentConflictResolver } = await import('./AgentConflictResolver');
        return getAgentConflictResolver(this.storage);
      }
      case 'learningService': {
        const { getAgentLearningService } = await import('./AgentLearningService');
        return getAgentLearningService();
      }
      case 'parameterTuner': {
        const { getAgentParameterTuner } = await import('./AgentParameterTuner');
        return getAgentParameterTuner(this.storage);
      }
      case 'regressionDetector': {
        const { getRegressionDetector } = await import('./RegressionDetector');
        return getRegressionDetector(this.storage);
      }
      case 'toolCallAnalyzer': {
        const { getToolCallAnalyzer } = await import('./ToolCallAnalyzer');
        return getToolCallAnalyzer(this.storage);
      }
      case 'intelligentPreloader': {
        const { getIntelligentPreloader } = await import('./IntelligentPreloader');
        return getIntelligentPreloader(this.storage);
      }
      case 'toolCallOptimizer': {
        const { getToolCallOptimizer } = await import('./ToolCallOptimizer');
        return getToolCallOptimizer(this.storage);
      }
      case 'autoOptimizer': {
        const { getAgentAutoOptimizer } = await import('./AgentAutoOptimizer');
        return getAgentAutoOptimizer(this.storage);
      }
      case 'performanceMonitor': {
        const { getAgentPerformanceMonitor } = await import('./AgentPerformanceMonitor');
        return getAgentPerformanceMonitor(this.storage);
      }
      case 'adaptiveScheduler': {
        const { getAgentAdaptiveScheduler } = await import('./AgentAdaptiveScheduler');
        return getAgentAdaptiveScheduler(this.storage);
      }
      case 'databaseBatcher': {
        const { getAgentDatabaseBatcher } = await import('./AgentDatabaseBatcher');
        return getAgentDatabaseBatcher(this.storage);
      }
      case 'complexTaskResolver': {
        const { getAgentComplexTaskResolver } = await import('./AgentComplexTaskResolver');
        return getAgentComplexTaskResolver(this.storage);
      }
      case 'architectureAnalyzer': {
        const { getAgentArchitectureAnalyzer } = await import('./AgentArchitectureAnalyzer');
        return getAgentArchitectureAnalyzer(this.storage);
      }
      case 'codeSmellDetector': {
        const { getAgentCodeSmellDetector } = await import('./AgentCodeSmellDetector');
        return getAgentCodeSmellDetector(this.storage);
      }
      case 'migrationPlanner': {
        const { getAgentMigrationPlanner } = await import('./AgentMigrationPlanner');
        return getAgentMigrationPlanner(this.storage);
      }
      case 'riskAnalyzer': {
        const { getAgentRiskAnalyzer } = await import('./AgentRiskAnalyzer');
        return getAgentRiskAnalyzer(this.storage);
      }
      case 'orchestrator': {
        const { getAgentOrchestrator } = await import('./AgentOrchestrator');
        return getAgentOrchestrator(this.storage);
      }
      case 'taskAutomator': {
        const { getAgentTaskAutomator } = await import('./AgentTaskAutomator');
        return getAgentTaskAutomator(this.storage);
      }
      case 'scriptRunner': {
        const { getAgentScriptRunner } = await import('./AgentScriptRunner');
        return getAgentScriptRunner(this.storage);
      }
      case 'commandExecutor': {
        const { getAgentCommandExecutor } = await import('./AgentCommandExecutor');
        return getAgentCommandExecutor(this.storage);
      }
      case 'automationDetector': {
        const { getAgentAutomationDetector } = await import('./AgentAutomationDetector');
        return getAgentAutomationDetector(this.storage);
      }
      case 'automationSuggester': {
        const { getAgentAutomationSuggester } = await import('./AgentAutomationSuggester');
        return getAgentAutomationSuggester(this.storage);
      }
      case 'scriptDocumenter': {
        const { getAgentScriptDocumenter } = await import('./AgentScriptDocumenter');
        return getAgentScriptDocumenter(this.storage);
      }
      case 'batchProcessor': {
        const { getAgentBatchProcessor } = await import('./AgentBatchProcessor');
        return getAgentBatchProcessor(this.storage);
      }
      case 'parallelExecutor': {
        const { getAgentParallelExecutor } = await import('./AgentParallelExecutor');
        return getAgentParallelExecutor(this.storage);
      }
      case 'optimizationIntegrator': {
        const { getAgentOptimizationIntegrator } = await import('./AgentOptimizationIntegrator');
        return getAgentOptimizationIntegrator(this.storage);
      }
      case 'qualityValidator': {
        const { getAgentQualityValidator } = await import('./AgentQualityValidator');
        return getAgentQualityValidator(this.storage);
      }
      case 'cacheOptimizer': {
        const { getAgentCacheOptimizer } = await import('./AgentCacheOptimizer');
        return getAgentCacheOptimizer(this.storage);
      }
      case 'toolUsageOptimizer': {
        const { getAgentToolUsageOptimizer } = await import('./AgentToolUsageOptimizer');
        return getAgentToolUsageOptimizer(this.storage);
      }
      case 'performanceValidator': {
        const { getAgentPerformanceValidator } = await import('./AgentPerformanceValidator');
        return getAgentPerformanceValidator(this.storage);
      }
      case 'codeQualityEnforcer': {
        const { getAgentCodeQualityEnforcer } = await import('./AgentCodeQualityEnforcer');
        return getAgentCodeQualityEnforcer(this.storage);
      }
      default:
        throw new Error(`Service inconnu: ${name}`);
    }
  }

  /**
   * Précharge les services les plus utilisés
   */
  async preloadCommonServices(): Promise<void> {
    const commonServices: ServiceName[] = [
      'fileLockManager',
      'cursorHook',
      'searchCache',
      'workflowAuditor',
      'taskAutomator',
      'scriptRunner',
      'batchProcessor',
      'parallelExecutor',
      'optimizationIntegrator'
    ];

    logger.info('Préchargement services agent communs', {
      metadata: {
        service: 'AgentServiceRegistry',
        operation: 'preloadCommonServices',
        services: commonServices
      }
    });

    await Promise.all(
      commonServices.map(serviceName =>
        this.getService(serviceName).catch(error => {
          logger.debug('Erreur préchargement service', {
            metadata: {
              service: 'AgentServiceRegistry',
              operation: 'preloadCommonServices',
              serviceName,
              error: error instanceof Error ? error.message : String(error)
            }
          });
        })
      )
    );
  }

  /**
   * Récupère tous les services chargés
   */
  getLoadedServices(): ServiceName[] {
    return Array.from(this.services.keys());
  }

  /**
   * Vérifie si un service est chargé
   */
  isServiceLoaded(name: ServiceName): boolean {
    return this.services.has(name);
  }

  /**
   * Réinitialise un service (force reload)
   */
  async reloadService(name: ServiceName): Promise<ServiceInstance> {
    this.services.delete(name);
    return await this.getService(name);
  }

  /**
   * Nettoie tous les services (pour tests)
   */
  clear(): void {
    this.services.clear();
    this.initializationPromises.clear();
    logger.info('AgentServiceRegistry nettoyé', {
      metadata: {
        service: 'AgentServiceRegistry',
        operation: 'clear'
      }
    });
  }

  /**
   * Récupère les statistiques du registry
   */
  async getStats(): Promise<{
    loadedServices: number;
    services: ServiceName[];
    pendingInitializations: number;
    automation?: {
      opportunities: number;
      highConfidence: number;
      totalTimeSaved: number;
      suggestions: number;
    };
  }> {
    const stats: {
      loadedServices: number;
      services: ServiceName[];
      pendingInitializations: number;
      automation?: {
        opportunities: number;
        highConfidence: number;
        totalTimeSaved: number;
        suggestions: number;
      };
    } = {
      loadedServices: this.services.size,
      services: Array.from(this.services.keys()),
      pendingInitializations: this.initializationPromises.size
    };

    // Ajouter stats automatisation si services disponibles
    try {
      if (this.storage) {
        const { getAgentAutomationDetector } = await import('./AgentAutomationDetector');
        const { getAgentAutomationSuggester } = await import('./AgentAutomationSuggester');
        
        const detector = getAgentAutomationDetector(this.storage);
        const suggester = getAgentAutomationSuggester(this.storage);

        const detectorStats = detector.getAutomationStats();
        const suggesterStats = suggester.getSuggestionStats();

        stats.automation = {
          opportunities: detectorStats.totalOpportunities,
          highConfidence: detectorStats.highConfidence,
          totalTimeSaved: detectorStats.totalEstimatedTimeSaved,
          suggestions: suggesterStats.totalSuggestions
        };
      }
    } catch (error) {
      logger.debug('Erreur récupération stats automatisation dans registry', {
        metadata: {
          service: 'AgentServiceRegistry',
          operation: 'getStats',
          error: error instanceof Error ? error.message : String(error)
        }
      });
      // Ne pas bloquer si stats automatisation indisponibles
    }

    return stats;
  }
}

// ========================================
// EXPORT SINGLETON
// ========================================

export function getAgentServiceRegistry(): AgentServiceRegistry {
  return AgentServiceRegistry.getInstance();
}

