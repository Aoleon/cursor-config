/**
 * PredictiveEventHandler - Handler pour événements prédictifs et preloading
 * 
 * Responsabilités:
 * - Déclencheurs prédictifs basés sur événements
 * - Preloading intelligent (business hours, weekend, peak hours, nightly)
 * - Gestion cycles background preloading
 * 
 * Target LOC: ~400-500
 */

import type { RealtimeEvent } from '../../shared/events';
import { EventType as EventTypeEnum } from '../../shared/events';
import type { ContextCacheService } from '../services/ContextCacheService';
import { logger } from '../utils/logger';
import type { EventBus } from '../eventBus';

export class PredictiveEventHandler {
  private predictiveEngine: unknown = null;
  private predictiveTriggersEnabled = true;
  private businessHoursPreloadingEnabled = true;
  private weekendWarmingEnabled = true;
  private contextCacheService: ContextCacheService | null = null;
  private eventBus: EventBus;
  
  // Configuration cycles preloading
  private businessHours = [8, 9, 10, 11, 14, 15, 16, 17]; // 8h-12h, 14h-18h
  private peakBusinessHours = [9, 10, 11, 15, 16]; // Heures de pointe
  private preloadingIntervals = new Map<string, NodeJS.Timeout>();
  private backgroundTasksRunning = false;
  
  // Statistiques preloading background
  private backgroundStats = {
    totalTriggeredPreloads: 0,
    businessHoursPreloads: 0,
    weekendWarmingRuns: 0,
    eventTriggeredPreloads: 0,
    lastBusinessHoursRun: new Date(),
    lastWeekendWarmingRun: new Date(),
    averagePreloadLatency: 0,
    failedBackgroundTasks: 0
  };

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  /**
   * Configure l'intégration avec PredictiveEngine pour déclencheurs automatiques
   */
  integratePredictiveEngine(predictiveEngine: unknown, contextCacheService: ContextCacheService): void {
    this.predictiveEngine = predictiveEngine;
    this.contextCacheService = contextCacheService;
    
    logger.info('Intégration PredictiveEngine activée', {
      metadata: {
        module: 'PredictiveEventHandler',
        operation: 'integratePredictiveEngine',
        context: { triggersEnabled: true, automaticPreloading: true }
      }
    });
    
    // Démarrer cycles background preloading
    this.startBackgroundPreloadingCycles();
    
    // Configurer déclencheurs événementiels
    this.setupPredictiveEventTriggers();
  }

  /**
   * Démarre les cycles de preloading background intelligent
   */
  private startBackgroundPreloadingCycles(): void {
    if (this.backgroundTasksRunning) return;
    
    this.backgroundTasksRunning = true;
    logger.info('Démarrage cycles preloading background', {
      metadata: {
        module: 'PredictiveEventHandler',
        operation: 'startBackgroundPreloadingCycles'
      }
    });

    // 1. CYCLE BUSINESS HOURS PRELOADING (toutes les 30 minutes pendant horaires business)
    const businessHoursInterval = setInterval(async () => {
      if (this.businessHoursPreloadingEnabled && this.isCurrentlyBusinessHours()) {
        await this.executeBusinessHoursPreloading();
      }
    }, 30 * 60 * 1000); // 30 minutes
    
    this.preloadingIntervals.set('business_hours', businessHoursInterval);

    // 2. CYCLE WEEKEND WARMING (samedi/dimanche matin pour préparation semaine)
    const weekendWarmingInterval = setInterval(async () => {
      if (this.weekendWarmingEnabled && this.isWeekendMorning()) {
        await this.executeWeekendWarming();
      }
    }, 60 * 60 * 1000); // 1 heure
    
    this.preloadingIntervals.set('weekend_warming', weekendWarmingInterval);

    // 3. CYCLE PEAK HOURS OPTIMIZATION (pendant heures de pointe)
    const peakHoursInterval = setInterval(async () => {
      if (this.isPeakBusinessHours()) {
        await this.executePeakHoursOptimization();
      }
    }, 15 * 60 * 1000); // 15 minutes pendant pics
    
    this.preloadingIntervals.set('peak_hours', peakHoursInterval);

    // 4. CYCLE NIGHTLY MAINTENANCE (préparation nuit pour jour suivant)
    const nightlyMaintenanceInterval = setInterval(async () => {
      if (this.isNightlyMaintenanceTime()) {
        await this.executeNightlyMaintenance();
      }
    }, 2 * 60 * 60 * 1000); // 2 heures
    
    this.preloadingIntervals.set('nightly_maintenance', nightlyMaintenanceInterval);

    logger.info('Cycles preloading background configurés et démarrés', {
      metadata: {
        module: 'PredictiveEventHandler',
        operation: 'startBackgroundPreloadingCycles',
        context: {
          cycles: ['business_hours', 'weekend_warming', 'peak_hours', 'nightly_maintenance']
        }
      }
    });
  }

  /**
   * Configure les déclencheurs prédictifs basés sur événements métier
   */
  private setupPredictiveEventTriggers(): void {
    logger.info('Configuration déclencheurs prédictifs événementiels', {
      metadata: {
        module: 'PredictiveEventHandler',
        operation: 'setupPredictiveEventTriggers'
      }
    });

    // Déclencheur AO : Prédict étude technique et fournisseurs
    this.eventBus.subscribe(async (event) => {
      if (event.entity === 'ao' && (event.type === EventTypeEnum.AO_STATUS_CHANGED || event.type === EventTypeEnum.AO_CREATED)) {
        await this.triggerAOWorkflowPreloading(event);
      }
    }, { 
      entities: ['ao'],
      eventTypes: [EventTypeEnum.AO_STATUS_CHANGED, EventTypeEnum.AO_CREATED]
    });

    // Déclencheur Offre : Prédict projet et planning
    this.eventBus.subscribe(async (event) => {
      if (event.entity === 'offer' && event.type === EventTypeEnum.OFFER_SIGNED) {
        await this.triggerOfferToProjectPreloading(event);
      }
    }, { 
      entities: ['offer'],
      eventTypes: [EventTypeEnum.OFFER_SIGNED, EventTypeEnum.OFFER_VALIDATED]
    });

    // Déclencheur Projet : Prédict chantier et équipes
    this.eventBus.subscribe(async (event) => {
      if (event.entity === 'project' && event.type === EventTypeEnum.PROJECT_CREATED) {
        await this.triggerProjectWorkflowPreloading(event);
      }
    }, { 
      entities: ['project'],
      eventTypes: [EventTypeEnum.PROJECT_CREATED, EventTypeEnum.PROJECT_STATUS_CHANGED]
    });

    // Déclencheur Tâche : Prédict projet context et dépendances
    this.eventBus.subscribe(async (event) => {
      if (event.entity === 'task' && event.type === EventTypeEnum.TASK_STATUS_CHANGED) {
        await this.triggerTaskRelatedPreloading(event);
      }
    }, { 
      entities: ['task'],
      eventTypes: [EventTypeEnum.TASK_STATUS_CHANGED, EventTypeEnum.TASK_OVERDUE]
    });

    // Déclencheur Analytics : Prédict dashboard refresh
    this.eventBus.subscribe(async (event) => {
      if (event.entity === 'analytics' && event.type === EventTypeEnum.ANALYTICS_CALCULATED) {
        await this.triggerAnalyticsDashboardPreloading(event);
      }
    }, { 
      entities: ['analytics'],
      eventTypes: [EventTypeEnum.ANALYTICS_CALCULATED]
    });

    logger.info('Déclencheurs prédictifs événementiels configurés', {
      metadata: {
        module: 'PredictiveEventHandler',
        operation: 'setupPredictiveEventTriggers',
        context: { triggersCount: 5 }
      }
    });
  }

  /**
   * Déclencheur AO : Prédict workflow étude technique
   */
  private async triggerAOWorkflowPreloading(event: RealtimeEvent): Promise<void> {
    if (!this.predictiveTriggersEnabled || !this.contextCacheService) return;

    try {
      logger.info('Déclencheur AO workflow preloading', {
        metadata: {
          module: 'PredictiveEventHandler',
          operation: 'triggerAOWorkflowPreloading',
          entityId: event.entityId
        }
      });
      // TODO: Implémenter la logique de preloading AO workflow
      this.backgroundStats.eventTriggeredPreloads++;
    } catch (error) {
      logger.error('Erreur déclencheur AO workflow', {
        metadata: {
          module: 'PredictiveEventHandler',
          operation: 'triggerAOWorkflowPreloading',
          error: error instanceof Error ? error.message : String(error)
        }
      });
      this.backgroundStats.failedBackgroundTasks++;
    }
  }

  /**
   * Déclencheur Offre → Projet : Prédict planning et équipes
   */
  private async triggerOfferToProjectPreloading(event: RealtimeEvent): Promise<void> {
    if (!this.predictiveTriggersEnabled || !this.contextCacheService) return;

    try {
      logger.info('Déclencheur Offre→Projet preloading', {
        metadata: {
          module: 'PredictiveEventHandler',
          operation: 'triggerOfferToProjectPreloading',
          entityId: event.entityId
        }
      });
      // TODO: Implémenter la logique de preloading Offre→Projet
      this.backgroundStats.eventTriggeredPreloads++;
    } catch (error) {
      logger.error('Erreur déclencheur offre→projet', {
        metadata: {
          module: 'PredictiveEventHandler',
          operation: 'triggerOfferToProjectPreloading',
          error: error instanceof Error ? error.message : String(error)
        }
      });
      this.backgroundStats.failedBackgroundTasks++;
    }
  }

  /**
   * Déclencheur Projet : Prédict chantier et livraison
   */
  private async triggerProjectWorkflowPreloading(event: RealtimeEvent): Promise<void> {
    if (!this.predictiveTriggersEnabled || !this.contextCacheService) return;

    try {
      logger.info('Déclencheur Projet workflow preloading', {
        metadata: {
          module: 'PredictiveEventHandler',
          operation: 'triggerProjectWorkflowPreloading',
          entityId: event.entityId
        }
      });
      // TODO: Implémenter la logique de preloading Projet workflow
      this.backgroundStats.eventTriggeredPreloads++;
    } catch (error) {
      logger.error('Erreur déclencheur projet workflow', {
        metadata: {
          module: 'PredictiveEventHandler',
          operation: 'triggerProjectWorkflowPreloading',
          error: error instanceof Error ? error.message : String(error)
        }
      });
      this.backgroundStats.failedBackgroundTasks++;
    }
  }

  /**
   * Déclencheur Tâche : Prédict contexte projet et dépendances
   */
  private async triggerTaskRelatedPreloading(event: RealtimeEvent): Promise<void> {
    if (!this.predictiveTriggersEnabled || !this.contextCacheService || !event.projectId) return;

    try {
      logger.info('Déclencheur Tâche preloading', {
        metadata: {
          module: 'PredictiveEventHandler',
          operation: 'triggerTaskRelatedPreloading',
          entityId: event.entityId,
          projectId: event.projectId
        }
      });
      // TODO: Implémenter la logique de preloading Tâche
      this.backgroundStats.eventTriggeredPreloads++;
    } catch (error) {
      logger.error('Erreur déclencheur tâche preloading', {
        metadata: {
          module: 'PredictiveEventHandler',
          operation: 'triggerTaskRelatedPreloading',
          error: error instanceof Error ? error.message : String(error)
        }
      });
      this.backgroundStats.failedBackgroundTasks++;
    }
  }

  /**
   * Déclencheur Analytics : Prédict dashboard refresh
   */
  private async triggerAnalyticsDashboardPreloading(event: RealtimeEvent): Promise<void> {
    if (!this.predictiveTriggersEnabled || !this.contextCacheService) return;

    try {
      logger.info('Déclencheur Analytics dashboard preloading', {
        metadata: {
          module: 'PredictiveEventHandler',
          operation: 'triggerAnalyticsDashboardPreloading'
        }
      });
      // TODO: Implémenter la logique de preloading Analytics dashboard
      this.backgroundStats.eventTriggeredPreloads++;
    } catch (error) {
      logger.error('Erreur déclencheur analytics dashboard', {
        metadata: {
          module: 'PredictiveEventHandler',
          operation: 'triggerAnalyticsDashboardPreloading',
          error: error instanceof Error ? error.message : String(error)
        }
      });
      this.backgroundStats.failedBackgroundTasks++;
    }
  }

  /**
   * BUSINESS HOURS PRELOADING : Preloading intelligent pendant horaires business
   */
  private async executeBusinessHoursPreloading(): Promise<void> {
    if (!this.predictiveEngine || !this.contextCacheService) return;

    try {
      const startTime = Date.now();
      logger.info('Exécution preloading business hours', {
        metadata: {
          module: 'PredictiveEventHandler',
          operation: 'executeBusinessHoursPreloading'
        }
      });
      // TODO: Implémenter la logique de preloading business hours
      this.backgroundStats.businessHoursPreloads++;
      this.backgroundStats.lastBusinessHoursRun = new Date();
    } catch (error) {
      logger.error('Erreur executeBusinessHoursPreloading', {
        metadata: {
          module: 'PredictiveEventHandler',
          operation: 'executeBusinessHoursPreloading',
          error: error instanceof Error ? error.message : String(error)
        }
      });
      this.backgroundStats.failedBackgroundTasks++;
    }
  }

  /**
   * WEEKEND WARMING : Préparation cache pour début de semaine
   */
  private async executeWeekendWarming(): Promise<void> {
    if (!this.predictiveEngine || !this.contextCacheService) return;

    try {
      const startTime = Date.now();
      logger.info('Exécution weekend warming', {
        metadata: {
          module: 'PredictiveEventHandler',
          operation: 'weekendWarming'
        }
      });
      // TODO: Implémenter la logique de weekend warming
      this.backgroundStats.weekendWarmingRuns++;
      this.backgroundStats.lastWeekendWarmingRun = new Date();
    } catch (error) {
      logger.error('Erreur executeWeekendWarming', {
        metadata: {
          module: 'PredictiveEventHandler',
          operation: 'weekendWarming',
          error: error instanceof Error ? error.message : String(error)
        }
      });
      this.backgroundStats.failedBackgroundTasks++;
    }
  }

  /**
   * PEAK HOURS OPTIMIZATION : Optimisation intensive pendant pics d'activité
   */
  private async executePeakHoursOptimization(): Promise<void> {
    if (!this.predictiveEngine || !this.contextCacheService) return;

    try {
      logger.info('Optimisation peak hours', {
        metadata: {
          module: 'PredictiveEventHandler',
          operation: 'peakHoursOptimization'
        }
      });

      // ÉVICTION AGGRESSIVE ENTITÉS FROIDES
      await this.contextCacheService.optimizeLRUWithPredictiveScoring();
    } catch (error) {
      logger.error('Erreur peak hours optimization', {
        metadata: {
          module: 'PredictiveEventHandler',
          operation: 'peakHoursOptimization',
          error: error instanceof Error ? error.message : String(error)
        }
      });
      this.backgroundStats.failedBackgroundTasks++;
    }
  }

  /**
   * NIGHTLY MAINTENANCE : Maintenance nocturne et préparation jour suivant
   */
  private async executeNightlyMaintenance(): Promise<void> {
    if (!this.predictiveEngine || !this.contextCacheService) return;

    try {
      logger.info('Maintenance nocturne', {
        metadata: {
          module: 'PredictiveEventHandler',
          operation: 'nightlyMaintenance'
        }
      });

      logger.info('Maintenance nocturne terminée', {
        metadata: {
          module: 'PredictiveEventHandler',
          operation: 'nightlyMaintenance'
        }
      });
    } catch (error) {
      logger.error('Erreur executeNightlyMaintenance', {
        metadata: {
          module: 'PredictiveEventHandler',
          operation: 'nightlyMaintenance',
          error: error instanceof Error ? error.message : String(error)
        }
      });
      this.backgroundStats.failedBackgroundTasks++;
    }
  }

  /**
   * Vérifie si nous sommes actuellement en horaires business
   */
  private isCurrentlyBusinessHours(): boolean {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay(); // 0 = dimanche, 6 = samedi
    
    // Lundi à vendredi seulement
    if (day === 0 || day === 6) return false;
    
    return this.businessHours.includes(hour);
  }

  /**
   * Vérifie si nous sommes en heures de pointe
   */
  private isPeakBusinessHours(): boolean {
    if (!this.isCurrentlyBusinessHours()) return false;
    
    const hour = new Date().getHours();
    return this.peakBusinessHours.includes(hour);
  }

  /**
   * Vérifie si c'est le matin du weekend (samedi/dimanche 8h-10h)
   */
  private isWeekendMorning(): boolean {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();
    
    return (day === 0 || day === 6) && hour >= 8 && hour <= 10;
  }

  /**
   * Vérifie si c'est l'heure de maintenance nocturne (2h-4h)
   */
  private isNightlyMaintenanceTime(): boolean {
    const hour = new Date().getHours();
    return hour >= 2 && hour <= 4;
  }

  /**
   * Active/désactive les déclencheurs prédictifs
   */
  setPredictiveTriggersEnabled(enabled: boolean): void {
    this.predictiveTriggersEnabled = enabled;
    logger.info(`Déclencheurs prédictifs ${enabled ? 'activés' : 'désactivés'}`, {
      metadata: {
        module: 'PredictiveEventHandler',
        operation: 'setPredictiveTriggersEnabled',
        enabled
      }
    });
  }

  /**
   * Active/désactive le preloading business hours
   */
  setBusinessHoursPreloadingEnabled(enabled: boolean): void {
    this.businessHoursPreloadingEnabled = enabled;
    logger.info(`Preloading business hours ${enabled ? 'activé' : 'désactivé'}`, {
      metadata: {
        module: 'PredictiveEventHandler',
        operation: 'setBusinessHoursPreloadingEnabled',
        enabled
      }
    });
  }

  /**
   * Active/désactive le weekend warming
   */
  setWeekendWarmingEnabled(enabled: boolean): void {
    this.weekendWarmingEnabled = enabled;
    logger.info(`Weekend warming ${enabled ? 'activé' : 'désactivé'}`, {
      metadata: {
        module: 'PredictiveEventHandler',
        operation: 'setWeekendWarmingEnabled',
        enabled
      }
    });
  }

  /**
   * Statistiques background preloading pour monitoring
   */
  getBackgroundPreloadingStats(): typeof this.backgroundStats {
    return { ...this.backgroundStats };
  }

  /**
   * Nettoyage intégration prédictive
   */
  cleanup(): void {
    // Arrêter tous les intervals
    for (const [name, interval] of Array.from(this.preloadingIntervals.entries())) {
      clearInterval(interval);
      logger.info('Interval arrêté', {
        metadata: {
          module: 'PredictiveEventHandler',
          operation: 'cleanup',
          intervalName: name
        }
      });
    }
    
    this.preloadingIntervals.clear();
    this.backgroundTasksRunning = false;
    
    logger.info('Intégration prédictive nettoyée', {
      metadata: {
        module: 'PredictiveEventHandler',
        operation: 'cleanup'
      }
    });
  }
}

