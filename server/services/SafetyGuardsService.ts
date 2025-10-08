import { IStorage } from "../storage-poc";
import { logger } from '../utils/logger';

// ========================================
// ÉTAPE 3 PHASE 3 PERFORMANCE : SAFETY GUARDS & RESOURCE MANAGEMENT
// ========================================

/**
 * Service de protection et gestion des ressources pour preloading prédictif
 * Objectif : Garantir stabilité système sans impact performance
 */

export interface SystemMetrics {
  cpuUsage: number;          // % utilisation CPU
  memoryUsage: number;       // % utilisation mémoire
  activeConnections: number; // Connexions actives
  responseTime: number;      // Temps réponse moyen ms
  errorRate: number;         // % d'erreurs
  lastMeasured: Date;
}

export interface ResourceLimits {
  maxCpuUsage: number;           // % CPU max autorisé
  maxMemoryUsage: number;        // % mémoire max autorisée
  maxConcurrentPreloads: number; // Preloads simultanés max
  maxBackgroundTasks: number;    // Background tasks max
  throttleThreshold: number;     // Seuil déclenchement throttling
}

export interface CircuitBreakerState {
  state: 'closed' | 'open' | 'half-open';
  failureCount: number;
  lastFailureTime: Date | null;
  nextAttemptTime: Date | null;
  successThreshold: number;
  timeoutMinutes: number;
}

export interface AdaptiveConfiguration {
  predictionConfidenceThreshold: number;  // Seuil confiance prédictions
  preloadingAggressiveness: number;       // Niveau agressivité 0-100
  backgroundTaskFrequency: number;        // Fréquence tâches background
  cacheEvictionRate: number;              // Taux éviction cache
  patternDetectionSensitivity: number;    // Sensibilité détection patterns
}

export class SafetyGuardsService {
  private storage: IStorage;
  
  // État système et protection
  private systemMetrics: SystemMetrics;
  private resourceLimits: ResourceLimits;
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private isThrottlingActive = false;
  private adaptiveConfig: AdaptiveConfiguration;
  
  // Monitoring et compteurs
  private activeTasks = new Set<string>();
  private backgroundTasksRunning = 0;
  private concurrentPreloads = 0;
  private throttleStartTime: Date | null = null;
  private lastSystemCheck = new Date();
  
  // Statistiques safety
  private safetyStats = {
    circuitBreakerActivations: 0,
    throttlingActivations: 0,
    resourceLimitReached: 0,
    adaptiveAdjustments: 0,
    rejectedOperations: 0,
    systemOverloads: 0,
    memoryOptimizations: 0,
    lastOverloadTime: null as Date | null
  };

  constructor(storage: IStorage) {
    this.storage = storage;
    
    // Configuration par défaut système BTP français
    this.resourceLimits = {
      maxCpuUsage: 70,           // 70% CPU max
      maxMemoryUsage: 80,        // 80% mémoire max
      maxConcurrentPreloads: 8,  // 8 preloads max simultanés
      maxBackgroundTasks: 4,     // 4 background tasks max
      throttleThreshold: 60      // Throttling à 60% resources
    };

    this.adaptiveConfig = {
      predictionConfidenceThreshold: 65,  // 65% confiance minimum
      preloadingAggressiveness: 70,       // 70% agressivité initiale
      backgroundTaskFrequency: 30,        // 30 minutes par défaut
      cacheEvictionRate: 0.2,             // 20% éviction rate
      patternDetectionSensitivity: 0.8    // 80% sensibilité
    };

    this.systemMetrics = {
      cpuUsage: 0,
      memoryUsage: 0,
      activeConnections: 0,
      responseTime: 0,
      errorRate: 0,
      lastMeasured: new Date()
    };

    // Démarrage monitoring système
    this.startSystemMonitoring();
    
    // Configuration circuit breakers
    this.initializeCircuitBreakers();
    
    logger.info('Service démarré avec protection système BTP', {
      metadata: {
        service: 'SafetyGuardsService',
        operation: 'constructor'
      }
    });
  }

  // ========================================
  // CIRCUIT BREAKERS PROTECTION
  // ========================================

  /**
   * Initialise les circuit breakers pour différents composants
   */
  private initializeCircuitBreakers(): void {
    const breakers = [
      'predictive_engine',
      'context_cache',
      'background_preloader',
      'pattern_detector',
      'heat_map_generator'
    ];

    breakers.forEach(name => {
      this.circuitBreakers.set(name, {
        state: 'closed',
        failureCount: 0,
        lastFailureTime: null,
        nextAttemptTime: null,
        successThreshold: 3,     // 3 succès pour fermer
        timeoutMinutes: 5        // 5 minutes timeout
      });
    });

    logger.info('Circuit breakers initialisés', {
      metadata: {
        service: 'SafetyGuardsService',
        operation: 'initializeCircuitBreakers',
        breakers: breakers
      }
    });
  }

  /**
   * Vérifie l'état d'un circuit breaker avant opération
   */
  checkCircuitBreaker(componentName: string): { allowed: boolean; reason?: string } {
    const breaker = this.circuitBreakers.get(componentName);
    if (!breaker) {
      return { allowed: true };
    }

    const now = new Date();

    switch (breaker.state) {
      case 'closed':
        return { allowed: true };

      case 'open':
        if (breaker.nextAttemptTime && now >= breaker.nextAttemptTime) {
          // Transition vers half-open
          breaker.state = 'half-open';
          logger.info('Circuit breaker transition vers half-open', {
            metadata: {
              service: 'SafetyGuardsService',
              operation: 'checkCircuitBreaker',
              componentName
            }
          });
          return { allowed: true };
        }
        return { 
          allowed: false, 
          reason: `Circuit breaker ouvert jusqu'à ${breaker.nextAttemptTime?.toLocaleTimeString()}` 
        };

      case 'half-open':
        return { allowed: true };

      default:
        return { allowed: true };
    }
  }

  /**
   * Enregistre un succès d'opération
   */
  recordOperationSuccess(componentName: string): void {
    const breaker = this.circuitBreakers.get(componentName);
    if (!breaker) return;

    if (breaker.state === 'half-open') {
      breaker.failureCount = Math.max(0, breaker.failureCount - 1);
      
      if (breaker.failureCount === 0) {
        breaker.state = 'closed';
        breaker.lastFailureTime = null;
        breaker.nextAttemptTime = null;
        logger.info('Circuit breaker fermé après succès', {
          metadata: {
            service: 'SafetyGuardsService',
            operation: 'recordOperationSuccess',
            componentName
          }
        });
      }
    } else if (breaker.state === 'closed') {
      breaker.failureCount = Math.max(0, breaker.failureCount - 1);
    }
  }

  /**
   * Enregistre un échec d'opération
   */
  recordOperationFailure(componentName: string, error: any): void {
    const breaker = this.circuitBreakers.get(componentName);
    if (!breaker) return;

    breaker.failureCount++;
    breaker.lastFailureTime = new Date();

    if (breaker.failureCount >= 5) { // 5 échecs = ouverture
      breaker.state = 'open';
      breaker.nextAttemptTime = new Date(Date.now() + breaker.timeoutMinutes * 60 * 1000);
      this.safetyStats.circuitBreakerActivations++;
      
      logger.warn('Circuit breaker OUVERT après échecs', {
        metadata: {
          service: 'SafetyGuardsService',
          operation: 'recordOperationFailure',
          componentName,
          failureCount: breaker.failureCount
        }
      });
    }
  }

  // ========================================
  // RESOURCE MONITORING & THROTTLING
  // ========================================

  /**
   * Démarre le monitoring système continu
   */
  private startSystemMonitoring(): void {
    // Monitoring toutes les 10 secondes
    setInterval(async () => {
      await this.updateSystemMetrics();
      await this.evaluateThrottling();
      await this.adaptiveResourceManagement();
    }, 10 * 1000);

    // Évaluation intensive toutes les minutes
    setInterval(async () => {
      await this.comprehensiveSystemEvaluation();
    }, 60 * 1000);

    logger.info('Monitoring système démarré (10s/60s intervals)', {
      metadata: {
        service: 'SafetyGuardsService',
        operation: 'startSystemMonitoring'
      }
    });
  }

  /**
   * Met à jour les métriques système
   */
  private async updateSystemMetrics(): Promise<void> {
    try {
      // Simulation métriques réalistes pour démo
      // En production : utiliser monitoring système réel
      const baseLoad = 30 + Math.random() * 20; // 30-50% base
      const taskLoad = this.backgroundTasksRunning * 8; // +8% par background task
      const preloadLoad = this.concurrentPreloads * 5; // +5% par preload

      this.systemMetrics = {
        cpuUsage: Math.min(100, baseLoad + taskLoad + preloadLoad),
        memoryUsage: Math.min(100, 40 + this.activeTasks.size * 3 + Math.random() * 15),
        activeConnections: 10 + this.activeTasks.size,
        responseTime: 150 + (this.isThrottlingActive ? 50 : 0) + Math.random() * 100,
        errorRate: this.isThrottlingActive ? Math.random() * 2 : Math.random() * 0.5,
        lastMeasured: new Date()
      };

    } catch (error) {
      logger.error('Erreur mise à jour métriques système', {
        metadata: {
          service: 'SafetyGuardsService',
          operation: 'updateSystemMetrics',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
    }
  }

  /**
   * Évalue le besoin de throttling
   */
  private async evaluateThrottling(): Promise<void> {
    try {
      const { cpuUsage, memoryUsage, responseTime } = this.systemMetrics;
      const { throttleThreshold, maxCpuUsage, maxMemoryUsage } = this.resourceLimits;

      const shouldThrottle = 
        cpuUsage > throttleThreshold ||
        memoryUsage > throttleThreshold ||
        responseTime > 1000;

      const shouldStopThrottling = 
        cpuUsage < throttleThreshold * 0.8 &&
        memoryUsage < throttleThreshold * 0.8 &&
        responseTime < 500;

      if (!this.isThrottlingActive && shouldThrottle) {
        await this.activateThrottling('System metrics exceeded threshold');
      } else if (this.isThrottlingActive && shouldStopThrottling) {
        await this.deactivateThrottling('System metrics back to normal');
      }

      // Détection surcharge critique
      if (cpuUsage > maxCpuUsage || memoryUsage > maxMemoryUsage) {
        await this.handleCriticalOverload();
      }

    } catch (error) {
      logger.error('Erreur évaluation throttling', {
        metadata: {
          service: 'SafetyGuardsService',
          operation: 'evaluateThrottling',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
    }
  }

  /**
   * Active le throttling système
   */
  private async activateThrottling(reason: string): Promise<void> {
    this.isThrottlingActive = true;
    this.throttleStartTime = new Date();
    this.safetyStats.throttlingActivations++;

    // Réduction agressivité preloading
    this.adaptiveConfig.preloadingAggressiveness *= 0.6; // -40%
    this.adaptiveConfig.backgroundTaskFrequency *= 1.5;  // +50% intervalle
    this.adaptiveConfig.predictionConfidenceThreshold += 10; // +10% seuil

    logger.warn('THROTTLING ACTIVÉ', {
      metadata: {
        service: 'SafetyGuardsService',
        operation: 'activateThrottling',
        reason,
        aggressiveness: this.adaptiveConfig.preloadingAggressiveness
      }
    });
  }

  /**
   * Désactive le throttling système
   */
  private async deactivateThrottling(reason: string): Promise<void> {
    this.isThrottlingActive = false;
    
    const throttleDuration = this.throttleStartTime ? 
      Date.now() - this.throttleStartTime.getTime() : 0;

    this.throttleStartTime = null;

    // Restauration graduelle configuration
    this.adaptiveConfig.preloadingAggressiveness = Math.min(100, this.adaptiveConfig.preloadingAggressiveness * 1.2);
    this.adaptiveConfig.backgroundTaskFrequency *= 0.9;
    this.adaptiveConfig.predictionConfidenceThreshold = Math.max(50, this.adaptiveConfig.predictionConfidenceThreshold - 5);

    logger.info('THROTTLING DÉSACTIVÉ', {
      metadata: {
        service: 'SafetyGuardsService',
        operation: 'deactivateThrottling',
        reason,
        duration: Math.round(throttleDuration/1000)
      }
    });
  }

  /**
   * Gestion surcharge système critique
   */
  private async handleCriticalOverload(): Promise<void> {
    this.safetyStats.systemOverloads++;
    this.safetyStats.lastOverloadTime = new Date();

    logger.error('SURCHARGE CRITIQUE DÉTECTÉE', {
      metadata: {
        service: 'SafetyGuardsService',
        operation: 'handleCriticalOverload',
        cpuUsage: this.systemMetrics.cpuUsage,
        memoryUsage: this.systemMetrics.memoryUsage,
        stack: new Error().stack
      }
    });

    // Actions d'urgence
    await this.emergencyResourceCleanup();
    
    // Arrêt temporaire preloading
    this.adaptiveConfig.preloadingAggressiveness = 0;
    
    // Ouverture circuit breakers préventive
    this.circuitBreakers.forEach((breaker, name) => {
      if (breaker.state === 'closed') {
        breaker.state = 'open';
        breaker.nextAttemptTime = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        logger.warn('Circuit breaker ouvert préventivement', {
          metadata: {
            service: 'SafetyGuardsService',
            operation: 'handleCriticalOverload',
            circuitBreaker: name
          }
        });
      }
    });
  }

  // ========================================
  // ADAPTIVE RESOURCE MANAGEMENT
  // ========================================

  /**
   * Gestion adaptative des ressources selon charge système
   */
  private async adaptiveResourceManagement(): Promise<void> {
    try {
      const { cpuUsage, memoryUsage, responseTime } = this.systemMetrics;
      const adaptationNeeded = this.calculateAdaptationScore();

      if (adaptationNeeded > 0.7) { // Score > 70% = adaptation nécessaire
        await this.performAdaptiveAdjustments(adaptationNeeded);
        this.safetyStats.adaptiveAdjustments++;
      }

    } catch (error) {
      logger.error('Erreur gestion adaptative', {
        metadata: {
          service: 'SafetyGuardsService',
          operation: 'adaptiveResourceManagement',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
    }
  }

  /**
   * Calcule le score d'adaptation nécessaire (0-1)
   */
  private calculateAdaptationScore(): number {
    const { cpuUsage, memoryUsage, responseTime, errorRate } = this.systemMetrics;
    
    // Normalisation des métriques (0-1)
    const cpuScore = Math.min(1, cpuUsage / 100);
    const memoryScore = Math.min(1, memoryUsage / 100);
    const latencyScore = Math.min(1, responseTime / 2000); // 2s max
    const errorScore = Math.min(1, errorRate / 10); // 10% max

    // Score pondéré
    return (cpuScore * 0.3 + memoryScore * 0.3 + latencyScore * 0.25 + errorScore * 0.15);
  }

  /**
   * Effectue les ajustements adaptatifs
   */
  private async performAdaptiveAdjustments(adaptationScore: number): Promise<void> {
    const adjustment = Math.min(0.5, adaptationScore); // Max 50% adjustment

    // Ajustement agressivité preloading
    const newAggressiveness = Math.max(20, this.adaptiveConfig.preloadingAggressiveness * (1 - adjustment));
    this.adaptiveConfig.preloadingAggressiveness = newAggressiveness;

    // Ajustement seuil confiance prédictions
    const confidenceIncrease = adjustment * 20; // Max +10%
    this.adaptiveConfig.predictionConfidenceThreshold = Math.min(90, 
      this.adaptiveConfig.predictionConfidenceThreshold + confidenceIncrease);

    // Ajustement fréquence background tasks
    const frequencyMultiplier = 1 + (adjustment * 2); // Max +100% intervalle
    this.adaptiveConfig.backgroundTaskFrequency *= frequencyMultiplier;

    logger.info('ADAPTATION AUTOMATIQUE', {
      metadata: {
        service: 'SafetyGuardsService',
        operation: 'performAdaptiveAdjustments',
        adaptationScore: (adaptationScore*100).toFixed(1),
        aggressiveness: newAggressiveness.toFixed(1),
        confidenceThreshold: this.adaptiveConfig.predictionConfidenceThreshold.toFixed(1)
      }
    });
  }

  // ========================================
  // MEMORY MANAGEMENT & CLEANUP
  // ========================================

  /**
   * Nettoyage d'urgence des ressources
   */
  private async emergencyResourceCleanup(): Promise<void> {
    try {
      logger.info('Nettoyage d\'urgence ressources', {
        metadata: {
          service: 'SafetyGuardsService',
          operation: 'emergencyResourceCleanup'
        }
      });

      // Arrêt background tasks non-critiques
      const tasksStopped = this.backgroundTasksRunning;
      this.backgroundTasksRunning = 0;

      // Limitation preloads concurrents
      this.concurrentPreloads = Math.min(2, this.concurrentPreloads);

      // Force garbage collection si disponible
      if (global.gc) {
        global.gc();
        this.safetyStats.memoryOptimizations++;
      }

      logger.info('Nettoyage terminé', {
        metadata: {
          service: 'SafetyGuardsService',
          operation: 'emergencyResourceCleanup',
          tasksStopped
        }
      });

    } catch (error) {
      logger.error('Erreur nettoyage d\'urgence', {
        metadata: {
          service: 'SafetyGuardsService',
          operation: 'emergencyResourceCleanup',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
    }
  }

  /**
   * Évaluation système complète périodique
   */
  private async comprehensiveSystemEvaluation(): Promise<void> {
    try {
      const report = {
        systemHealth: this.calculateSystemHealthScore(),
        resourceEfficiency: this.calculateResourceEfficiency(),
        adaptiveConfigOptimal: this.isAdaptiveConfigOptimal(),
        recommendations: this.generateSystemRecommendations()
      };

      // Log santé système si problème détecté
      if (report.systemHealth < 70) {
        logger.warn('Santé système dégradée', {
          metadata: {
            service: 'SafetyGuardsService',
            operation: 'comprehensiveSystemEvaluation',
            systemHealth: report.systemHealth,
            recommendations: report.recommendations.slice(0, 3)
          }
        });
      }

    } catch (error) {
      logger.error('Erreur évaluation système', {
        metadata: {
          service: 'SafetyGuardsService',
          operation: 'comprehensiveSystemEvaluation',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
    }
  }

  // ========================================
  // VALIDATION & AUTHORIZATION
  // ========================================

  /**
   * Vérifie si une opération de preloading est autorisée
   */
  canExecutePreloading(priority: 'low' | 'medium' | 'high' = 'medium'): { allowed: boolean; reason?: string } {
    // Vérification circuit breaker
    const circuitCheck = this.checkCircuitBreaker('background_preloader');
    if (!circuitCheck.allowed) {
      this.safetyStats.rejectedOperations++;
      return circuitCheck;
    }

    // Vérification limites concurrence
    if (this.concurrentPreloads >= this.resourceLimits.maxConcurrentPreloads) {
      this.safetyStats.rejectedOperations++;
      return { 
        allowed: false, 
        reason: `Limite preloads concurrents atteinte (${this.concurrentPreloads}/${this.resourceLimits.maxConcurrentPreloads})` 
      };
    }

    // Vérification throttling selon priorité
    if (this.isThrottlingActive && priority === 'low') {
      this.safetyStats.rejectedOperations++;
      return { 
        allowed: false, 
        reason: 'Throttling actif - priorité basse rejetée' 
      };
    }

    // Vérification système critique
    if (this.systemMetrics.cpuUsage > this.resourceLimits.maxCpuUsage && priority !== 'high') {
      this.safetyStats.rejectedOperations++;
      return { 
        allowed: false, 
        reason: `CPU critique (${this.systemMetrics.cpuUsage.toFixed(1)}%) - seule priorité haute autorisée` 
      };
    }

    return { allowed: true };
  }

  /**
   * Vérifie si une background task peut démarrer
   */
  canExecuteBackgroundTask(taskType: string): { allowed: boolean; reason?: string } {
    // Vérification circuit breaker
    const circuitCheck = this.checkCircuitBreaker('background_preloader');
    if (!circuitCheck.allowed) {
      return circuitCheck;
    }

    // Vérification limite background tasks
    if (this.backgroundTasksRunning >= this.resourceLimits.maxBackgroundTasks) {
      return { 
        allowed: false, 
        reason: `Limite background tasks atteinte (${this.backgroundTasksRunning}/${this.resourceLimits.maxBackgroundTasks})` 
      };
    }

    // Vérification throttling pour tâches non-critiques
    if (this.isThrottlingActive && !['critical', 'emergency'].includes(taskType)) {
      return { 
        allowed: false, 
        reason: 'Throttling actif - tâche non-critique rejetée' 
      };
    }

    return { allowed: true };
  }

  // ========================================
  // TRACKING & REPORTING
  // ========================================

  /**
   * Enregistre le début d'une opération
   */
  registerOperationStart(operationType: 'preload' | 'background_task', operationId: string): void {
    this.activeTasks.add(operationId);
    
    if (operationType === 'preload') {
      this.concurrentPreloads++;
    } else if (operationType === 'background_task') {
      this.backgroundTasksRunning++;
    }
  }

  /**
   * Enregistre la fin d'une opération
   */
  registerOperationEnd(operationType: 'preload' | 'background_task', operationId: string, success: boolean): void {
    this.activeTasks.delete(operationId);
    
    if (operationType === 'preload') {
      this.concurrentPreloads = Math.max(0, this.concurrentPreloads - 1);
    } else if (operationType === 'background_task') {
      this.backgroundTasksRunning = Math.max(0, this.backgroundTasksRunning - 1);
    }

    // Mise à jour circuit breaker
    if (success) {
      this.recordOperationSuccess('background_preloader');
    } else {
      this.recordOperationFailure('background_preloader', 'Operation failed');
    }
  }

  /**
   * Rapport complet safety guards
   */
  getSafetyReport(): any {
    return {
      systemMetrics: { ...this.systemMetrics },
      resourceLimits: { ...this.resourceLimits },
      adaptiveConfig: { ...this.adaptiveConfig },
      throttlingStatus: {
        active: this.isThrottlingActive,
        startTime: this.throttleStartTime,
        duration: this.throttleStartTime ? Date.now() - this.throttleStartTime.getTime() : 0
      },
      circuitBreakers: Array.from(this.circuitBreakers.entries()).map(([name, state]) => ({
        component: name,
        state: state.state,
        failureCount: state.failureCount,
        lastFailure: state.lastFailureTime,
        nextAttempt: state.nextAttemptTime
      })),
      activeOperations: {
        totalTasks: this.activeTasks.size,
        backgroundTasks: this.backgroundTasksRunning,
        concurrentPreloads: this.concurrentPreloads
      },
      statistics: { ...this.safetyStats },
      systemHealth: {
        score: this.calculateSystemHealthScore(),
        efficiency: this.calculateResourceEfficiency(),
        recommendations: this.generateSystemRecommendations().slice(0, 5)
      }
    };
  }

  /**
   * Configuration adaptative actuelle
   */
  getAdaptiveConfiguration(): AdaptiveConfiguration {
    return { ...this.adaptiveConfig };
  }

  // ========================================
  // HELPER METHODS
  // ========================================

  private calculateSystemHealthScore(): number {
    const { cpuUsage, memoryUsage, responseTime, errorRate } = this.systemMetrics;
    
    const cpuScore = Math.max(0, (100 - cpuUsage));
    const memoryScore = Math.max(0, (100 - memoryUsage));
    const latencyScore = Math.max(0, (2000 - responseTime) / 20); // 2s max = 100 points
    const errorScore = Math.max(0, (10 - errorRate) * 10); // 10% max = 100 points

    return Math.round((cpuScore + memoryScore + latencyScore + errorScore) / 4);
  }

  private calculateResourceEfficiency(): number {
    const utilizationScore = (this.systemMetrics.cpuUsage + this.systemMetrics.memoryUsage) / 2;
    const throughputScore = Math.max(0, 100 - this.systemMetrics.responseTime / 10);
    
    return Math.round((utilizationScore * 0.3 + throughputScore * 0.7));
  }

  private isAdaptiveConfigOptimal(): boolean {
    return (
      this.adaptiveConfig.preloadingAggressiveness >= 50 &&
      this.adaptiveConfig.predictionConfidenceThreshold <= 75 &&
      !this.isThrottlingActive
    );
  }

  private generateSystemRecommendations(): string[] {
    const recommendations: string[] = [];
    const { cpuUsage, memoryUsage, responseTime } = this.systemMetrics;

    if (cpuUsage > 80) {
      recommendations.push('🔥 CPU élevé: Réduire agressivité preloading et optimiser algorithmes');
    }
    
    if (memoryUsage > 75) {
      recommendations.push('💾 Mémoire élevée: Activer nettoyage cache et réduire concurrence');
    }
    
    if (responseTime > 1000) {
      recommendations.push('⏱️ Latence élevée: Activer throttling et prioriser requêtes critiques');
    }
    
    if (this.safetyStats.circuitBreakerActivations > 5) {
      recommendations.push('⚡ Circuit breakers fréquents: Réviser seuils et stabilité système');
    }
    
    if (this.isThrottlingActive) {
      recommendations.push('🐌 Throttling actif: Surveiller charge et optimiser ressources');
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ Système optimal: Maintenir configuration actuelle');
    }

    return recommendations;
  }
}

// ========================================
// FACTORY ET SINGLETON
// ========================================

let safetyGuardsInstance: SafetyGuardsService | null = null;

export function getSafetyGuardsService(storage: IStorage): SafetyGuardsService {
  if (!safetyGuardsInstance) {
    safetyGuardsInstance = new SafetyGuardsService(storage);
  }
  return safetyGuardsInstance;
}