import { EventEmitter } from 'events';
import type { 
  RealtimeEvent, EventFilter, EventType, 
  BusinessAlertCreatedPayload, BusinessAlertAcknowledgedPayload, 
  BusinessAlertResolvedPayload, BusinessAlertDismissedPayload, 
  BusinessAlertAssignedPayload, AlertThresholdCreatedPayload, 
  AlertThresholdUpdatedPayload, AlertThresholdDeactivatedPayload,
  PredictiveSnapshotSavedPayload
} from '../shared/events';
import { createRealtimeEvent, EventType as EventTypeEnum } from '../shared/events';
import { log } from './vite';
import type { ContextCacheService } from './services/ContextCacheService';

type EventHandler = (event: RealtimeEvent) => void;

interface SubscriptionInfo {
  id: string;
  handler: EventHandler;
  filter?: EventFilter;
  subscribedAt: Date;
}

export class EventBus extends EventEmitter {
  private subscriptions = new Map<string, SubscriptionInfo>();
  private eventHistory: RealtimeEvent[] = [];
  private readonly maxHistorySize = 100; // Garder les 100 derniers événements
  
  // PHASE 2 PERFORMANCE: Intégration cache intelligent
  private contextCacheService: ContextCacheService | null = null;
  private cacheInvalidationEnabled = true;
  private autoInvalidationHooks = new Map<string, (event: RealtimeEvent) => void>();

  constructor() {
    super();
    this.setMaxListeners(50); // Augmenter la limite pour éviter les warnings
    this.setupAutomaticCacheInvalidation();
  }

  /**
   * Publier un événement vers tous les abonnés avec invalidation cache automatique
   */
  public publish(event: RealtimeEvent): void {
    try {
      // PROTECTION: Valider l'événement avant publication
      if (!event || typeof event !== 'object') {
        log(`EventBus: Event invalide ignoré (not an object)`);
        return;
      }
      
      // Assurer que les propriétés critiques existent
      const validatedEvent = {
        ...event,
        type: event.type || 'unknown',
        entity: event.entity || 'unknown',
        entityId: event.entityId || 'unknown',
        severity: event.severity || 'info',
        timestamp: event.timestamp || new Date().toISOString(),
      };
      
      // Ajouter à l'historique
      this.addToHistory(validatedEvent);
      
      // PHASE 2 PERFORMANCE: Invalidation cache automatique
      if (this.cacheInvalidationEnabled && this.contextCacheService) {
        this.processAutomaticCacheInvalidation(validatedEvent);
      }
      
      // Émettre l'événement
      this.emit('event', validatedEvent);
      
      log(`EventBus: Published event ${validatedEvent.type} for ${validatedEvent.entity}:${validatedEvent.entityId}`);
    } catch (error) {
      log(`EventBus: Error publishing event: ${error}`);
    }
  }

  /**
   * S'abonner aux événements avec filtre optionnel
   */
  public subscribe(handler: EventHandler, filter?: EventFilter): string {
    const subscriptionId = crypto.randomUUID();
    
    const subscription: SubscriptionInfo = {
      id: subscriptionId,
      handler,
      filter,
      subscribedAt: new Date(),
    };

    this.subscriptions.set(subscriptionId, subscription);

    // Créer un handler filtré
    const filteredHandler = (event: RealtimeEvent) => {
      if (!filter || this.matchesFilter(event, filter)) {
        try {
          handler(event);
        } catch (error) {
          log(`EventBus: Error in event handler: ${error}`);
        }
      }
    };

    this.on('event', filteredHandler);

    log(`EventBus: New subscription ${subscriptionId} with filter: ${JSON.stringify(filter)}`);
    return subscriptionId;
  }

  /**
   * Se désabonner d'un événement
   */
  public unsubscribe(subscriptionId: string): boolean {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      return false;
    }

    this.subscriptions.delete(subscriptionId);
    // Note: EventEmitter ne permet pas de supprimer un listener spécifique facilement
    // Dans un vrai système, il faudrait garder une référence au handler
    
    log(`EventBus: Unsubscribed ${subscriptionId}`);
    return true;
  }

  /**
   * Vérifier si un événement correspond au filtre
   */
  private matchesFilter(event: RealtimeEvent, filter: EventFilter): boolean {
    // Filtrer par types d'événements
    if (filter.eventTypes && Array.isArray(filter.eventTypes) && !filter.eventTypes.includes(event.type)) {
      return false;
    }

    // Filtrer par entités
    if (filter.entities && Array.isArray(filter.entities) && !filter.entities.includes(event.entity)) {
      return false;
    }

    // Filtrer par IDs d'entité
    if (filter.entityIds && Array.isArray(filter.entityIds) && !filter.entityIds.includes(event.entityId)) {
      return false;
    }

    // Filtrer par projets
    if (filter.projectIds && Array.isArray(filter.projectIds) && event.projectId && !filter.projectIds.includes(event.projectId)) {
      return false;
    }

    // Filtrer par offres
    if (filter.offerIds && Array.isArray(filter.offerIds) && event.offerId && !filter.offerIds.includes(event.offerId)) {
      return false;
    }

    // Filtrer par sévérité
    if (filter.severities && Array.isArray(filter.severities) && !filter.severities.includes(event.severity)) {
      return false;
    }

    // Filtrer par utilisateur
    if (filter.userId && filter.userId !== event.userId) {
      return false;
    }

    return true;
  }

  /**
   * Ajouter un événement à l'historique
   */
  private addToHistory(event: RealtimeEvent): void {
    this.eventHistory.push(event);
    
    // Garder seulement les N derniers événements
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory = this.eventHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Récupérer l'historique des événements (utile pour reconnexion)
   */
  public getRecentEvents(since?: Date, filter?: EventFilter): RealtimeEvent[] {
    let events = this.eventHistory;

    // Filtrer par date si spécifiée
    if (since) {
      events = events.filter(event => new Date(event.timestamp) > since);
    }

    // Appliquer le filtre si spécifié
    if (filter) {
      events = events.filter(event => this.matchesFilter(event, filter));
    }

    return events;
  }

  // ========================================
  // INTÉGRATION CACHE INTELLIGENT PHASE 2 PERFORMANCE
  // ========================================

  /**
   * Configure l'intégration avec le service de cache contextuel
   */
  public integrateWithContextCache(cacheService: ContextCacheService): void {
    this.contextCacheService = cacheService;
    this.cacheInvalidationEnabled = true;
    
    log('[EventBus] Intégration ContextCacheService activée - invalidation automatique disponible');
  }

  /**
   * Active/désactive l'invalidation automatique du cache
   */
  public setCacheInvalidationEnabled(enabled: boolean): void {
    this.cacheInvalidationEnabled = enabled;
    log(`[EventBus] Invalidation cache automatique: ${enabled ? 'ACTIVÉE' : 'DÉSACTIVÉE'}`);
  }

  /**
   * Traite l'invalidation automatique du cache selon l'événement
   */
  private async processAutomaticCacheInvalidation(event: RealtimeEvent): Promise<void> {
    if (!this.contextCacheService) return;

    try {
      const startTime = Date.now();
      
      // Mapping des événements vers les types d'entités et actions
      const invalidationMapping = this.getInvalidationMapping(event);
      
      if (invalidationMapping) {
        await this.contextCacheService.invalidateOnEntityChange(
          invalidationMapping.entityType,
          invalidationMapping.entityId,
          invalidationMapping.changeType,
          invalidationMapping.additionalContext
        );
        
        const duration = Date.now() - startTime;
        log(`[EventBus] Invalidation cache auto: ${invalidationMapping.entityType}:${invalidationMapping.entityId} en ${duration}ms`);
      }
    } catch (error) {
      log(`[EventBus] Erreur invalidation cache automatique: ${error}`);
    }
  }

  /**
   * Génère le mapping d'invalidation selon l'événement
   */
  private getInvalidationMapping(event: RealtimeEvent): {
    entityType: string;
    entityId: string;
    changeType: 'update' | 'delete' | 'status_change';
    additionalContext?: Record<string, any>;
  } | null {
    switch (event.type) {
      // Événements AO
      case EventTypeEnum.AO_STATUS_CHANGED:
        return {
          entityType: 'ao',
          entityId: event.entityId,
          changeType: 'status_change',
          additionalContext: {
            status: event.newStatus,
            previousStatus: event.prevStatus
          }
        };

      // Événements Offres
      case EventTypeEnum.OFFER_STATUS_CHANGED:
      case EventTypeEnum.OFFER_SIGNED:
      case EventTypeEnum.OFFER_VALIDATED:
        return {
          entityType: 'offer',
          entityId: event.entityId,
          changeType: event.type === EventTypeEnum.OFFER_STATUS_CHANGED ? 'status_change' : 'update',
          additionalContext: {
            status: event.newStatus || 'updated',
            previousStatus: event.prevStatus,
            aoId: event.metadata?.aoId,
            complexity: 'medium' // Default complexity for offers
          }
        };

      // Événements Projets
      case EventTypeEnum.PROJECT_CREATED:
      case EventTypeEnum.PROJECT_STATUS_CHANGED:
        return {
          entityType: 'project',
          entityId: event.entityId,
          changeType: event.type === EventTypeEnum.PROJECT_STATUS_CHANGED ? 'status_change' : 'update',
          additionalContext: {
            status: event.newStatus || 'created',
            previousStatus: event.prevStatus,
            offerId: event.offerId,
            phase: event.newStatus,
            complexity: 'complex' // Projects are typically complex
          }
        };

      // Événements Fournisseurs
      case EventTypeEnum.SUPPLIER_QUOTE_RECEIVED:
        return {
          entityType: 'supplier',
          entityId: event.entityId,
          changeType: 'update',
          additionalContext: {
            offerId: event.offerId,
            complexity: 'simple'
          }
        };

      // Événements Tâches
      case EventTypeEnum.TASK_STATUS_CHANGED:
      case EventTypeEnum.TASK_OVERDUE:
        return {
          entityType: 'project', // Les tâches impactent le contexte projet
          entityId: event.projectId || 'unknown',
          changeType: 'update',
          additionalContext: {
            taskId: event.entityId,
            taskStatus: event.newStatus,
            complexity: 'medium'
          }
        };

      default:
        return null; // Pas d'invalidation pour ce type d'événement
    }
  }

  /**
   * Configure les hooks d'invalidation automatique
   */
  private setupAutomaticCacheInvalidation(): void {
    // Hook pour les modifications d'AO
    this.autoInvalidationHooks.set('ao_changes', (event) => {
      if (event.entity === 'ao' || event.entity === 'appel_offres') {
        log(`[EventBus] Hook AO déclenché pour ${event.entityId}`);
      }
    });

    // Hook pour les modifications d'offres
    this.autoInvalidationHooks.set('offer_changes', (event) => {
      if (event.entity === 'offer') {
        log(`[EventBus] Hook Offre déclenché pour ${event.entityId}`);
      }
    });

    // Hook pour les modifications de projets
    this.autoInvalidationHooks.set('project_changes', (event) => {
      if (event.entity === 'project') {
        log(`[EventBus] Hook Projet déclenché pour ${event.entityId}`);
      }
    });

    log('[EventBus] Hooks d\'invalidation automatique configurés');
  }

  /**
   * Helpers pour créer et publier des événements communs
   */

  // Événements Alertes Techniques
  public publishTechnicalAlertActionPerformed(params: {
    alertId: string;
    action: 'acknowledged' | 'validated' | 'bypassed';
    userId?: string;
    metadata?: Record<string, any>;
  }): void {
    const event = createRealtimeEvent({
      type: EventType.TECHNICAL_ALERT,
      entity: 'technical',
      entityId: params.alertId,
      severity: params.action === 'bypassed' ? 'warning' : 'success',
      affectedQueryKeys: [
        ['/api/technical-alerts'],
        ['/api/technical-alerts', params.alertId],
        ['/api/technical-alerts', params.alertId, 'history'],
      ],
      userId: params.userId,
      metadata: {
        action: params.action,
        ...params.metadata,
      },
    });

    this.publish(event);
  }

  public publishTechnicalAlertCreated(params: {
    alertId: string;
    aoId: string;
    aoReference: string;
    score: number;
    triggeredCriteria: string[];
    assignedToUserId?: string;
  }): void {
    const event = createRealtimeEvent({
      type: EventType.TECHNICAL_ALERT,
      entity: 'technical',
      entityId: params.alertId,
      severity: 'warning',
      affectedQueryKeys: [
        ['/api/technical-alerts'],
        ['/api/technical-alerts', params.alertId],
      ],
      userId: params.assignedToUserId,
      metadata: {
        aoId: params.aoId,
        aoReference: params.aoReference,
        score: params.score,
        triggeredCriteria: params.triggeredCriteria,
        action: 'created',
      },
    });

    this.publish(event);
  }

  // Événements Offres
  public publishOfferStatusChanged(params: {
    offerId: string;
    reference?: string;
    prevStatus: string;
    newStatus: string;
    userId?: string;
    projectId?: string;
  }): void {
    const event = createRealtimeEvent({
      type: EventTypeEnum.OFFER_STATUS_CHANGED,
      entity: 'offer',
      entityId: params.offerId,
      prevStatus: params.prevStatus,
      newStatus: params.newStatus,
      severity: this.getStatusChangeSeverity(params.newStatus),
      affectedQueryKeys: [
        ['/api/offers'],
        ['/api/offers', params.offerId],
        ['/api/dashboard/kpis'],
        ['/api/dashboard/stats'],
      ],
      offerId: params.offerId,
      projectId: params.projectId,
      userId: params.userId,
      metadata: {
        reference: params.reference,
      },
    });

    this.publish(event);
  }

  public publishOfferSigned(params: {
    offerId: string;
    reference?: string;
    userId?: string;
    projectId?: string;
  }): void {
    const event = createRealtimeEvent({
      type: EventTypeEnum.OFFER_SIGNED,
      entity: 'offer',
      entityId: params.offerId,
      severity: 'success',
      affectedQueryKeys: [
        ['/api/offers'],
        ['/api/offers', params.offerId],
        ['/api/projects'],
        ['/api/dashboard/kpis'],
        ['/api/dashboard/stats'],
      ],
      offerId: params.offerId,
      projectId: params.projectId,
      userId: params.userId,
      metadata: {
        reference: params.reference,
      },
    });

    this.publish(event);
  }

  public publishOfferValidated(params: {
    offerId: string;
    reference?: string;
    userId?: string;
    validationType?: string;
  }): void {
    const event = createRealtimeEvent({
      type: EventTypeEnum.OFFER_VALIDATED,
      entity: 'offer',
      entityId: params.offerId,
      severity: 'success',
      affectedQueryKeys: [
        ['/api/offers'],
        ['/api/offers', params.offerId],
        ['/api/validation-milestones', 'offer', params.offerId],
        ['/api/dashboard/kpis'],
      ],
      offerId: params.offerId,
      userId: params.userId,
      metadata: {
        reference: params.reference,
        validationType: params.validationType,
      },
    });

    this.publish(event);
  }

  // Événements Analytics
  public publishAnalyticsCalculated(metadata: any): void {
    const event = createRealtimeEvent({
      type: EventTypeEnum.ANALYTICS_CALCULATED, // Type strict 
      entity: "analytics",
      entityId: "analytics-system", 
      severity: 'info',
      message: "Analytics KPIs calculés et mis à jour",
      affectedQueryKeys: [
        ['/api/analytics/kpis'],
        ['/api/analytics/metrics'], 
        ['/api/analytics/snapshots'],
        ['/api/dashboard/kpis']
      ], // QueryKeys cohérents avec frontend TanStack Query
      metadata,
    });

    this.publish(event);
  }

  // Événements Projets
  public publishProjectCreated(params: {
    projectId: string;
    name?: string;
    offerId?: string;
    userId?: string;
  }): void {
    const event = createRealtimeEvent({
      type: EventTypeEnum.PROJECT_CREATED,
      entity: 'project',
      entityId: params.projectId,
      severity: 'success',
      affectedQueryKeys: [
        ['/api/projects'],
        ['/api/projects', params.projectId],
        ['/api/offers', params.offerId || ''],
        ['/api/dashboard/kpis'],
        ['/api/be-workload'],
      ],
      projectId: params.projectId,
      offerId: params.offerId,
      userId: params.userId,
      metadata: {
        name: params.name,
      },
    });

    this.publish(event);
  }

  public publishProjectStatusChanged(params: {
    projectId: string;
    name?: string;
    prevStatus: string;
    newStatus: string;
    userId?: string;
  }): void {
    const event = createRealtimeEvent({
      type: EventTypeEnum.PROJECT_STATUS_CHANGED,
      entity: 'project',
      entityId: params.projectId,
      prevStatus: params.prevStatus,
      newStatus: params.newStatus,
      severity: this.getStatusChangeSeverity(params.newStatus),
      affectedQueryKeys: [
        ['/api/projects'],
        ['/api/projects', params.projectId],
        ['/api/dashboard/kpis'],
        ['/api/be-workload'],
      ],
      projectId: params.projectId,
      userId: params.userId,
      metadata: {
        name: params.name,
      },
    });

    this.publish(event);
  }

  // Événements Tâches
  public publishTaskOverdue(params: {
    taskId: string;
    name?: string;
    projectId?: string;
    delayDays?: number;
    userId?: string;
  }): void {
    const event = createRealtimeEvent({
      type: EventTypeEnum.TASK_OVERDUE,
      entity: 'task',
      entityId: params.taskId,
      severity: 'warning',
      affectedQueryKeys: [
        ['/api/tasks'],
        ['/api/tasks', params.taskId],
        ['/api/projects', params.projectId || ''],
        ['/api/dashboard/kpis'],
      ],
      taskId: params.taskId,
      projectId: params.projectId,
      userId: params.userId,
      metadata: {
        name: params.name,
        delayDays: params.delayDays,
      },
    });

    this.publish(event);
  }

  public publishTaskStatusChanged(params: {
    taskId: string;
    name?: string;
    projectId?: string;
    prevStatus: string;
    newStatus: string;
    userId?: string;
  }): void {
    const event = createRealtimeEvent({
      type: EventTypeEnum.TASK_STATUS_CHANGED,
      entity: 'task',
      entityId: params.taskId,
      prevStatus: params.prevStatus,
      newStatus: params.newStatus,
      severity: params.newStatus === 'termine' ? 'success' : 'info',
      affectedQueryKeys: [
        ['/api/tasks'],
        ['/api/tasks', params.taskId],
        ['/api/projects', params.projectId || ''],
        ['/api/dashboard/kpis'],
      ],
      taskId: params.taskId,
      projectId: params.projectId,
      userId: params.userId,
      metadata: {
        name: params.name,
      },
    });

    this.publish(event);
  }

  // Événements Validations
  public publishValidationMilestoneValidated(params: {
    milestoneId: string;
    milestoneName?: string;
    entityType: 'offer' | 'project';
    entityId: string;
    validatorName?: string;
    userId?: string;
  }): void {
    const event = createRealtimeEvent({
      type: EventTypeEnum.VALIDATION_MILESTONE_VALIDATED,
      entity: 'validation',
      entityId: params.milestoneId,
      severity: 'success',
      affectedQueryKeys: [
        ['/api/validation-milestones'],
        ['/api/validation-milestones', params.entityType, params.entityId],
        [`/api/${params.entityType}s`],
        [`/api/${params.entityType}s`, params.entityId],
        ['/api/dashboard/kpis'],
      ],
      projectId: params.entityType === 'project' ? params.entityId : undefined,
      offerId: params.entityType === 'offer' ? params.entityId : undefined,
      userId: params.userId,
      metadata: {
        milestoneName: params.milestoneName,
        validatorName: params.validatorName,
        entityType: params.entityType,
      },
    });

    this.publish(event);
  }

  // Événements KPI
  public publishKpiRefreshHint(affectedQueryKeys: string[][]): void {
    const event = createRealtimeEvent({
      type: EventTypeEnum.KPI_REFRESH_HINT,
      entity: 'system',
      entityId: 'kpi-system',
      severity: 'info',
      affectedQueryKeys,
    });

    this.publish(event);
  }

  // Événements Fournisseurs
  public publishSupplierQuoteReceived(params: {
    supplierRequestId: string;
    supplierName?: string;
    offerId?: string;
    userId?: string;
  }): void {
    const event = createRealtimeEvent({
      type: EventTypeEnum.SUPPLIER_QUOTE_RECEIVED,
      entity: 'supplier',
      entityId: params.supplierRequestId,
      severity: 'info',
      affectedQueryKeys: [
        ['/api/supplier-requests'],
        ['/api/offers', params.offerId || ''],
        ['/api/dashboard/kpis'],
      ],
      offerId: params.offerId,
      userId: params.userId,
      metadata: {
        supplierName: params.supplierName,
      },
    });

    this.publish(event);
  }

  // Événements Alertes Techniques
  public publishTechnicalAlert(params: {
    aoReference: string;
    score: number;
    triggeredCriteria: string[];
    aoId?: string;
    userId?: string;
    metadata?: Record<string, any>;
  }): void {
    const event = createRealtimeEvent({
      type: EventTypeEnum.TECHNICAL_ALERT,
      entity: 'technical',
      entityId: params.aoReference,
      severity: 'warning',
      title: '🚨 Alerte Technique Détectée',
      message: `Score technique élevé (${params.score}) détecté pour AO ${params.aoReference}. Critères: ${params.triggeredCriteria.join(', ')}`,
      affectedQueryKeys: [
        ['/api/aos'],
        ['/api/aos', params.aoId || ''],
        ['/api/dashboard/alerts'],
        ['/api/technical-alerts'],
      ],
      userId: params.userId,
      metadata: {
        score: params.score,
        triggeredCriteria: params.triggeredCriteria,
        aoReference: params.aoReference,
        ...params.metadata,
      },
    });

    this.publish(event);
  }

  // ========================================
  // ÉVÉNEMENTS CACHE CONTEXTUEL PHASE 2 PERFORMANCE
  // ========================================

  /**
   * Publie un événement de cache hit/miss pour monitoring
   */
  public publishContextCacheEvent(params: {
    entityType: string;
    entityId: string;
    cacheKey: string;
    action: 'hit' | 'miss' | 'invalidated' | 'prewarmed';
    executionTimeMs: number;
    userId?: string;
  }): void {
    const event = createRealtimeEvent({
      type: EventTypeEnum.SYSTEM_CACHE_EVENT,
      entity: 'cache',
      entityId: params.cacheKey,
      severity: params.action === 'miss' ? 'info' : 'success',
      message: `Cache ${params.action} pour ${params.entityType}:${params.entityId} (${params.executionTimeMs}ms)`,
      affectedQueryKeys: [
        ['/api/analytics/cache-metrics'],
        ['/api/system/performance']
      ],
      userId: params.userId,
      metadata: {
        entityType: params.entityType,
        entityId: params.entityId,
        cacheKey: params.cacheKey,
        action: params.action,
        executionTimeMs: params.executionTimeMs
      }
    });

    this.publish(event);
  }

  /**
   * Publie un événement de prewarming de cache
   */
  public publishCachePrewarmingEvent(params: {
    entityTypes: string[];
    contextCount: number;
    executionTimeMs: number;
    isScheduled: boolean;
  }): void {
    const event = createRealtimeEvent({
      type: EventTypeEnum.SYSTEM_CACHE_PREWARMING,
      entity: 'cache',
      entityId: 'prewarming-system',
      severity: 'success',
      title: '🔥 Cache Prewarming Exécuté',
      message: `${params.contextCount} contextes préchargés en ${params.executionTimeMs}ms (${params.entityTypes.join(', ')})`,
      affectedQueryKeys: [
        ['/api/analytics/cache-metrics'],
        ['/api/system/performance'],
        ['/api/chatbot/health']
      ],
      metadata: {
        entityTypes: params.entityTypes,
        contextCount: params.contextCount,
        executionTimeMs: params.executionTimeMs,
        isScheduled: params.isScheduled,
        action: 'prewarming_completed'
      }
    });

    this.publish(event);
  }

  /**
   * Publie un événement d'optimisation de performance détectée
   */
  public publishPerformanceOptimizationEvent(params: {
    optimizationType: 'cache_hit_ratio' | 'query_optimization' | 'index_usage';
    improvementPercent: number;
    beforeValue: number;
    afterValue: number;
    entityType?: string;
  }): void {
    const event = createRealtimeEvent({
      type: EventTypeEnum.SYSTEM_PERFORMANCE_OPTIMIZATION,
      entity: 'performance',
      entityId: params.optimizationType,
      severity: 'success',
      title: '🚀 Optimisation Performance Détectée',
      message: `Amélioration ${params.optimizationType}: +${params.improvementPercent.toFixed(1)}% (${params.beforeValue} → ${params.afterValue})`,
      affectedQueryKeys: [
        ['/api/analytics/performance'],
        ['/api/system/health'],
        ['/api/chatbot/health']
      ],
      metadata: {
        optimizationType: params.optimizationType,
        improvementPercent: params.improvementPercent,
        beforeValue: params.beforeValue,
        afterValue: params.afterValue,
        entityType: params.entityType,
        action: 'optimization_detected'
      }
    });

    this.publish(event);
  }

  // ========================================
  // ÉVÉNEMENTS INTELLIGENCE TEMPORELLE - PHASE 2.2
  // ========================================

  // Timeline calculée intelligemment
  public publishDateIntelligenceTimelineCalculated(params: {
    projectId: string;
    timelineId: string;
    phasesCount: number;
    totalDuration: number;
    constraintsApplied: number;
    calculationMethod: string;
    userId?: string;
  }): void {
    const event = createRealtimeEvent({
      type: EventTypeEnum.DATE_INTELLIGENCE_TIMELINE_CALCULATED,
      entity: 'date_intelligence',
      entityId: params.timelineId,
      severity: 'success',
      title: '🧮 Timeline Intelligence Calculée',
      message: `Timeline intelligente générée: ${params.phasesCount} phases, ${params.totalDuration} jours (${params.constraintsApplied} contraintes appliquées)`,
      affectedQueryKeys: [
        ['/api/projects', params.projectId, 'calculate-timeline'],
        ['/api/projects', params.projectId],
        ['/api/intelligence-rules'],
        ['/api/dashboard/kpis']
      ],
      projectId: params.projectId,
      userId: params.userId,
      metadata: {
        phasesCount: params.phasesCount,
        totalDuration: params.totalDuration,
        constraintsApplied: params.constraintsApplied,
        calculationMethod: params.calculationMethod,
        action: 'timeline_calculated'
      }
    });

    this.publish(event);
  }

  // Recalcul cascade effectué
  public publishDateIntelligenceCascadeRecalculated(params: {
    projectId: string;
    triggeredByPhase: string;
    newDate: Date;
    affectedPhasesCount: number;
    totalImpactDays: number;
    recalculationType: string;
    userId?: string;
  }): void {
    const severity = params.totalImpactDays > 0 ? 'warning' : 'success';
    const impactIcon = params.totalImpactDays > 0 ? '⚠️' : '✅';
    
    const event = createRealtimeEvent({
      type: EventTypeEnum.DATE_INTELLIGENCE_CASCADE_RECALCULATED,
      entity: 'date_intelligence',
      entityId: `cascade_${params.projectId}_${Date.now()}`,
      severity,
      title: `${impactIcon} Recalcul Cascade Effectué`,
      message: `${params.affectedPhasesCount} phases recalculées depuis ${params.triggeredByPhase} (impact: ${params.totalImpactDays > 0 ? '+' : ''}${params.totalImpactDays} jours)`,
      affectedQueryKeys: [
        ['/api/projects', params.projectId, 'recalculate-from', params.triggeredByPhase],
        ['/api/projects', params.projectId],
        ['/api/date-alerts']
      ],
      projectId: params.projectId,
      userId: params.userId,
      metadata: {
        triggeredByPhase: params.triggeredByPhase,
        newDate: params.newDate.toISOString(),
        affectedPhasesCount: params.affectedPhasesCount,
        totalImpactDays: params.totalImpactDays,
        recalculationType: params.recalculationType,
        action: 'cascade_recalculated'
      }
    });

    this.publish(event);
  }

  // Règle métier appliquée
  public publishDateIntelligenceRuleApplied(params: {
    ruleId: string;
    ruleName: string;
    phase: string;
    projectId: string;
    confidence: number;
    impact: number;
    userId?: string;
  }): void {
    const event = createRealtimeEvent({
      type: EventTypeEnum.DATE_INTELLIGENCE_RULE_APPLIED,
      entity: 'date_intelligence',
      entityId: params.ruleId,
      severity: 'info',
      title: '📝 Règle Métier Appliquée',
      message: `Règle "${params.ruleName}" appliquée sur phase ${params.phase} (confiance: ${Math.round(params.confidence * 100)}%)`,
      affectedQueryKeys: [
        ['/api/intelligence-rules'],
        ['/api/projects', params.projectId],
        ['/api/intelligence-rules', params.ruleId]
      ],
      projectId: params.projectId,
      userId: params.userId,
      metadata: {
        ruleId: params.ruleId,
        ruleName: params.ruleName,
        phase: params.phase,
        confidence: params.confidence,
        impact: params.impact,
        action: 'rule_applied'
      }
    });

    this.publish(event);
  }

  // Alerte d'intelligence temporelle créée
  public publishDateIntelligenceAlertCreated(params: {
    alertId: string;
    alertTitle: string;
    entityType: string;
    entityId: string;
    severity: 'info' | 'warning' | 'error';
    projectId?: string;
    userId?: string;
  }): void {
    const severityIcon = {
      info: 'ℹ️',
      warning: '⚠️',
      error: '🚨'
    };
    
    const event = createRealtimeEvent({
      type: EventTypeEnum.DATE_INTELLIGENCE_ALERT_CREATED,
      entity: 'date_intelligence',
      entityId: params.alertId,
      severity: params.severity === 'error' ? 'error' : params.severity === 'warning' ? 'warning' : 'info',
      title: `${severityIcon[params.severity]} Alerte Intelligence Temporelle`,
      message: `Nouvelle alerte: ${params.alertTitle}`,
      affectedQueryKeys: [
        ['/api/date-alerts'],
        ['/api/date-alerts', params.alertId],
        ['/api/dashboard/alerts'],
        ...(params.projectId ? [['/api/projects', params.projectId]] : [])
      ],
      projectId: params.projectId,
      userId: params.userId,
      metadata: {
        alertId: params.alertId,
        alertTitle: params.alertTitle,
        entityType: params.entityType,
        entityId: params.entityId,
        action: 'alert_created'
      }
    });

    this.publish(event);
  }

  // Problème de planification détecté
  public publishDateIntelligencePlanningIssueDetected(params: {
    projectId: string;
    issueType: string;
    severity: 'info' | 'warning' | 'error';
    description: string;
    affectedPhases: string[];
    recommendations: string[];
    userId?: string;
  }): void {
    const event = createRealtimeEvent({
      type: EventTypeEnum.DATE_INTELLIGENCE_PLANNING_ISSUE_DETECTED,
      entity: 'date_intelligence',
      entityId: `issue_${params.projectId}_${Date.now()}`,
      severity: params.severity === 'error' ? 'error' : params.severity === 'warning' ? 'warning' : 'info',
      title: '🛠️ Problème de Planification',
      message: `${params.issueType}: ${params.description} (${params.affectedPhases.length} phases affectées)`,
      affectedQueryKeys: [
        ['/api/projects', params.projectId],
        ['/api/date-alerts'],
        ['/api/dashboard/planning-issues']
      ],
      projectId: params.projectId,
      userId: params.userId,
      metadata: {
        issueType: params.issueType,
        severity: params.severity,
        description: params.description,
        affectedPhases: params.affectedPhases,
        recommendations: params.recommendations,
        action: 'planning_issue_detected'
      }
    });

    this.publish(event);
  }

  // ========================================
  // MÉTHODES SPÉCIALISÉES POUR SYSTÈME DE DÉTECTION D'ALERTES - PHASE 2.3
  // ========================================

  // Nouvelle alerte de détection créée
  public publishDateAlertCreated(params: {
    id: string;
    entity: string;
    entityId: string;
    message: string;
    severity: 'info' | 'warning' | 'critical';
    metadata: {
      alertType: string;
      phase?: string;
      targetDate?: string;
      affectedUsers: string[];
      actionRequired: boolean;
    };
  }): void {
    const severityIcon = {
      info: 'ℹ️',
      warning: '⚠️',
      critical: '🚨'
    };
    
    const event = createRealtimeEvent({
      type: EventTypeEnum.DATE_INTELLIGENCE_ALERT_CREATED,
      entity: params.entity,
      entityId: params.entityId,
      severity: params.severity === 'critical' ? 'error' : params.severity === 'warning' ? 'warning' : 'info',
      title: `${severityIcon[params.severity]} Alerte Détectée`,
      message: params.message,
      affectedQueryKeys: [
        ['/api/date-alerts'],
        ['/api/date-alerts', params.entityId],
        ['/api/dashboard/alerts'],
        ['/api/date-alerts/summary']
      ],
      userId: params.metadata.affectedUsers[0], // Premier utilisateur affecté
      metadata: {
        alertId: params.id,
        alertType: params.metadata.alertType,
        phase: params.metadata.phase,
        targetDate: params.metadata.targetDate,
        affectedUsers: params.metadata.affectedUsers,
        actionRequired: params.metadata.actionRequired,
        action: 'alert_created'
      }
    });

    this.publish(event);
  }

  // Alerte accusée réception
  public publishDateAlertAcknowledged(params: {
    id: string;
    entity: string;
    entityId: string;
    message: string;
    severity: 'info' | 'warning' | 'error';
    userId?: string;
    metadata: {
      alertId: string;
      acknowledgedBy: string;
      acknowledgedAt: string;
      note?: string;
    };
  }): void {
    const event = createRealtimeEvent({
      type: EventTypeEnum.DATE_INTELLIGENCE_ALERT_ACKNOWLEDGED,
      entity: params.entity,
      entityId: params.entityId,
      severity: 'info',
      title: '✅ Alerte Accusée Réception',
      message: params.message,
      affectedQueryKeys: [
        ['/api/date-alerts'],
        ['/api/date-alerts', params.metadata.alertId],
        ['/api/dashboard/alerts']
      ],
      userId: params.userId,
      metadata: {
        alertId: params.metadata.alertId,
        acknowledgedBy: params.metadata.acknowledgedBy,
        acknowledgedAt: params.metadata.acknowledgedAt,
        note: params.metadata.note,
        action: 'alert_acknowledged'
      }
    });

    this.publish(event);
  }

  // Alerte résolue
  public publishDateAlertResolved(params: {
    id: string;
    entity: string;
    entityId: string;
    message: string;
    severity: 'success';
    userId?: string;
    metadata: {
      alertId: string;
      resolvedBy: string;
      resolvedAt: string;
      resolution: string;
    };
  }): void {
    const event = createRealtimeEvent({
      type: EventTypeEnum.DATE_INTELLIGENCE_ALERT_RESOLVED,
      entity: params.entity,
      entityId: params.entityId,
      severity: 'success',
      title: '🎉 Alerte Résolue',
      message: params.message,
      affectedQueryKeys: [
        ['/api/date-alerts'],
        ['/api/date-alerts', params.metadata.alertId],
        ['/api/dashboard/alerts']
      ],
      userId: params.userId,
      metadata: {
        alertId: params.metadata.alertId,
        resolvedBy: params.metadata.resolvedBy,
        resolvedAt: params.metadata.resolvedAt,
        resolution: params.metadata.resolution,
        action: 'alert_resolved'
      }
    });

    this.publish(event);
  }

  // Escalade d'alerte critique
  public publishSystemAlert(params: {
    id: string;
    entity: string;
    entityId: string;
    message: string;
    severity: 'critical';
    metadata: {
      originalAlert: string;
      escalationLevel: string;
      immediateAction: boolean;
    };
  }): void {
    const event = createRealtimeEvent({
      type: EventType.SYSTEM_MAINTENANCE, // Utiliser le type système existant pour escalade
      entity: params.entity,
      entityId: params.entityId,
      severity: 'error',
      title: '🚨 ESCALADE CRITIQUE',
      message: params.message,
      affectedQueryKeys: [
        ['/api/date-alerts'],
        ['/api/dashboard/alerts'],
        ['/api/system/alerts']
      ],
      metadata: {
        originalAlert: params.metadata.originalAlert,
        escalationLevel: params.metadata.escalationLevel,
        immediateAction: params.metadata.immediateAction,
        action: 'critical_escalation'
      }
    });

    this.publish(event);
  }

  // Conflit de ressources détecté
  public publishResourceConflictDetected(params: {
    conflictId: string;
    affectedProjects: string[];
    conflictDate: Date;
    severity: 'minor' | 'major' | 'critical';
    resourceType: string;
    shortfall: number;
  }): void {
    const severityMap = { minor: 'info' as const, major: 'warning' as const, critical: 'error' as const };
    
    const event = createRealtimeEvent({
      type: EventType.DATE_INTELLIGENCE_PLANNING_ISSUE_DETECTED,
      entity: 'date_intelligence',
      entityId: params.conflictId,
      severity: severityMap[params.severity],
      title: '⚡ Conflit de Ressources',
      message: `Conflit ${params.resourceType} le ${params.conflictDate.toLocaleDateString()}. Déficit: ${params.shortfall} équipe(s).`,
      affectedQueryKeys: [
        ['/api/date-alerts'],
        ['/api/dashboard/conflicts'],
        ...params.affectedProjects.map(projectId => ['/api/projects', projectId])
      ],
      metadata: {
        conflictType: 'resource_conflict',
        affectedProjects: params.affectedProjects,
        conflictDate: params.conflictDate.toISOString(),
        resourceType: params.resourceType,
        shortfall: params.shortfall,
        action: 'resource_conflict_detected'
      }
    });

    this.publish(event);
  }

  // Opportunité d'optimisation détectée
  public publishOptimizationOpportunityDetected(params: {
    opportunityId: string;
    entityType: 'project' | 'offer';
    entityId: string;
    opportunityType: string;
    estimatedGainDays: number;
    feasibility: 'high' | 'medium' | 'low';
  }): void {
    const event = createRealtimeEvent({
      type: EventType.DATE_INTELLIGENCE_ALERT_CREATED,
      entity: 'date_intelligence',
      entityId: params.opportunityId,
      severity: 'info',
      title: '💡 Opportunité d\'Optimisation',
      message: `${params.opportunityType} possible. Gain estimé: ${params.estimatedGainDays} jour(s). Faisabilité: ${params.feasibility}.`,
      affectedQueryKeys: [
        ['/api/date-alerts'],
        ['/api/dashboard/optimizations'],
        [`/api/${params.entityType}s`, params.entityId]
      ],
      metadata: {
        opportunityType: params.opportunityType,
        entityType: params.entityType,
        entityId: params.entityId,
        estimatedGainDays: params.estimatedGainDays,
        feasibility: params.feasibility,
        action: 'optimization_detected'
      }
    });

    this.publish(event);
  }

  // Risque de retard détecté
  public publishDelayRiskDetected(params: {
    riskId: string;
    projectId: string;
    phase: string;
    riskLevel: 'low' | 'medium' | 'high';
    riskFactors: string[];
    suggestedActions: string[];
  }): void {
    const severityMap = { low: 'info' as const, medium: 'warning' as const, high: 'error' as const };
    const riskIcons = { low: '🟡', medium: '🟠', high: '🔴' };
    
    const event = createRealtimeEvent({
      type: EventType.DATE_INTELLIGENCE_ALERT_CREATED,
      entity: 'date_intelligence',
      entityId: params.riskId,
      severity: severityMap[params.riskLevel],
      title: `${riskIcons[params.riskLevel]} Risque de Retard - ${params.phase}`,
      message: `Risque ${params.riskLevel} détecté pour la phase ${params.phase}. ${params.riskFactors.length} facteur(s) identifié(s).`,
      affectedQueryKeys: [
        ['/api/date-alerts'],
        ['/api/projects', params.projectId],
        ['/api/dashboard/risks']
      ],
      projectId: params.projectId,
      metadata: {
        riskLevel: params.riskLevel,
        phase: params.phase,
        riskFactors: params.riskFactors,
        suggestedActions: params.suggestedActions,
        action: 'delay_risk_detected'
      }
    });

    this.publish(event);
  }

  // Échéance critique approche
  public publishCriticalDeadlineAlert(params: {
    deadlineId: string;
    entityType: 'project' | 'offer' | 'ao';
    entityId: string;
    entityReference: string;
    deadline: Date;
    daysRemaining: number;
    preparationStatus: string;
    requiredActions: string[];
  }): void {
    const severity = params.daysRemaining <= 1 ? 'error' as const : 
                    params.daysRemaining <= 3 ? 'warning' as const : 'info' as const;
    
    const urgencyIcon = params.daysRemaining <= 1 ? '🚨' : 
                       params.daysRemaining <= 3 ? '⏰' : '📅';
    
    const event = createRealtimeEvent({
      type: EventType.DATE_INTELLIGENCE_ALERT_CREATED,
      entity: 'date_intelligence',
      entityId: params.deadlineId,
      severity,
      title: `${urgencyIcon} Échéance Critique - ${params.entityReference}`,
      message: `Échéance dans ${params.daysRemaining} jour(s). Statut: ${params.preparationStatus}. ${params.requiredActions.length} action(s) requise(s).`,
      affectedQueryKeys: [
        ['/api/date-alerts'],
        [`/api/${params.entityType}s`, params.entityId],
        ['/api/dashboard/deadlines']
      ],
      metadata: {
        entityType: params.entityType,
        entityId: params.entityId,
        entityReference: params.entityReference,
        deadline: params.deadline.toISOString(),
        daysRemaining: params.daysRemaining,
        preparationStatus: params.preparationStatus,
        requiredActions: params.requiredActions,
        action: 'critical_deadline_alert'
      }
    });

    this.publish(event);
  }

  // ========================================
  // PUBLISHERS ALERTES MÉTIER - PHASE 3.1.7.3
  // ========================================

  // === BUSINESS ALERTS PUBLISHERS ===

  async publishBusinessAlertCreated(payload: BusinessAlertCreatedPayload): Promise<void> {
    try {
      const event = createRealtimeEvent({
        type: EventTypeEnum.BUSINESS_ALERT_CREATED,
        entity: 'business_alert',
        entityId: payload.alert_id,
        severity: payload.severity as 'info' | 'warning' | 'error' | 'critical',
        affectedQueryKeys: [
          ['/api/alerts', 'business'], // Liste alertes business
          ['/api/alerts', payload.alert_id], // Alerte spécifique
          ['/api/dashboard', 'alerts'], // Dashboard alertes
          ['/api/notifications', 'alerts'] // Notifications temps réel
        ],
        metadata: {
          alert_id: payload.alert_id,
          alert_type: payload.alert_type,
          entity_type: payload.entity_type,
          entity_id: payload.entity_id,
          entity_name: payload.entity_name,
          severity: payload.severity,
          title: payload.title,
          threshold_value: payload.threshold_value,
          actual_value: payload.actual_value,
          variance: payload.variance,
          triggered_at: payload.triggered_at,
          threshold_id: payload.threshold_id,
          context_data: payload.context_data,
          requires_immediate_notification: payload.severity === 'critical'
        }
      });
      
      this.publish(event);
      
      log(`EventBus: Événement business alert created publié - alert_id: ${payload.alert_id}, type: ${payload.alert_type}, severity: ${payload.severity}`);
      
    } catch (error) {
      log(`EventBus: Erreur publishBusinessAlertCreated: ${error}`);
      throw error;
    }
  }

  async publishBusinessAlertAcknowledged(payload: BusinessAlertAcknowledgedPayload): Promise<void> {
    try {
      const event = createRealtimeEvent({
        type: EventTypeEnum.BUSINESS_ALERT_ACKNOWLEDGED,
        entity: 'business_alert',
        entityId: payload.alert_id,
        severity: 'success',
        prevStatus: payload.previous_status,
        newStatus: payload.new_status,
        affectedQueryKeys: [
          ['/api/alerts', 'business'],
          ['/api/alerts', payload.alert_id],
          ['/api/dashboard', 'alerts'],
          ['/api/alerts', 'status', 'acknowledged'] // Alertes par statut
        ],
        metadata: {
          alert_id: payload.alert_id,
          acknowledged_by: payload.acknowledged_by,
          acknowledged_at: payload.acknowledged_at,
          notes: payload.notes,
          previous_status: payload.previous_status,
          user_action: true
        }
      });
      
      this.publish(event);
      
      log(`EventBus: Alerte accusée réception - alert_id: ${payload.alert_id}, by: ${payload.acknowledged_by}`);
      
    } catch (error) {
      log(`EventBus: Erreur publishBusinessAlertAcknowledged: ${error}`);
      throw error;
    }
  }

  async publishBusinessAlertResolved(payload: BusinessAlertResolvedPayload): Promise<void> {
    try {
      const event = createRealtimeEvent({
        type: EventTypeEnum.BUSINESS_ALERT_RESOLVED,
        entity: 'business_alert',
        entityId: payload.alert_id,
        severity: 'success',
        prevStatus: payload.previous_status,
        newStatus: payload.new_status,
        affectedQueryKeys: [
          ['/api/alerts', 'business'],
          ['/api/alerts', payload.alert_id],
          ['/api/dashboard', 'alerts'],
          ['/api/alerts', 'status', 'resolved'], // Alertes résolues
          ['/api/analytics', 'alerts', 'resolution_metrics'] // Métriques résolution
        ],
        metadata: {
          alert_id: payload.alert_id,
          resolved_by: payload.resolved_by,
          resolved_at: payload.resolved_at,
          resolution_notes: payload.resolution_notes,
          previous_status: payload.previous_status,
          resolution_duration_minutes: payload.resolution_duration_minutes,
          user_action: true
        }
      });
      
      this.publish(event);
      
      log(`EventBus: Alerte résolue - alert_id: ${payload.alert_id}, by: ${payload.resolved_by}, duration: ${payload.resolution_duration_minutes || 'N/A'} min`);
      
    } catch (error) {
      log(`EventBus: Erreur publishBusinessAlertResolved: ${error}`);
      throw error;
    }
  }

  async publishBusinessAlertDismissed(payload: BusinessAlertDismissedPayload): Promise<void> {
    try {
      const event = createRealtimeEvent({
        type: EventTypeEnum.BUSINESS_ALERT_DISMISSED,
        entity: 'business_alert',
        entityId: payload.alert_id,
        severity: 'warning',
        prevStatus: payload.previous_status,
        newStatus: payload.new_status,
        affectedQueryKeys: [
          ['/api/alerts', 'business'],
          ['/api/alerts', payload.alert_id],
          ['/api/dashboard', 'alerts'],
          ['/api/alerts', 'status', 'dismissed'] // Alertes ignorées
        ],
        metadata: {
          alert_id: payload.alert_id,
          dismissed_by: payload.dismissed_by,
          dismissed_at: payload.dismissed_at,
          dismissal_reason: payload.dismissal_reason,
          previous_status: payload.previous_status,
          user_action: true
        }
      });
      
      this.publish(event);
      
      log(`EventBus: Alerte ignorée - alert_id: ${payload.alert_id}, by: ${payload.dismissed_by}`);
      
    } catch (error) {
      log(`EventBus: Erreur publishBusinessAlertDismissed: ${error}`);
      throw error;
    }
  }

  async publishBusinessAlertAssigned(payload: BusinessAlertAssignedPayload): Promise<void> {
    try {
      const event = createRealtimeEvent({
        type: EventTypeEnum.BUSINESS_ALERT_ASSIGNED,
        entity: 'business_alert',
        entityId: payload.alert_id,
        severity: 'info',
        affectedQueryKeys: [
          ['/api/alerts', 'business'],
          ['/api/alerts', payload.alert_id],
          ['/api/alerts', 'assigned', payload.assigned_to], // Alertes assignées à user
          ['/api/dashboard', 'alerts'],
          ['/api/notifications', payload.assigned_to] // Notifications personnelles
        ],
        metadata: {
          alert_id: payload.alert_id,
          assigned_to: payload.assigned_to,
          assigned_by: payload.assigned_by,
          assigned_at: payload.assigned_at,
          previous_assigned_to: payload.previous_assigned_to,
          user_action: true
        }
      });
      
      this.publish(event);
      
      log(`EventBus: Alerte assignée - alert_id: ${payload.alert_id}, to: ${payload.assigned_to}, by: ${payload.assigned_by}`);
      
    } catch (error) {
      log(`EventBus: Erreur publishBusinessAlertAssigned: ${error}`);
      throw error;
    }
  }

  // === THRESHOLDS PUBLISHERS ===

  async publishAlertThresholdCreated(payload: AlertThresholdCreatedPayload): Promise<void> {
    try {
      const event = createRealtimeEvent({
        type: EventTypeEnum.ALERT_THRESHOLD_CREATED,
        entity: 'alert_threshold',
        entityId: payload.threshold_id,
        severity: 'success',
        affectedQueryKeys: [
          ['/api/alerts', 'thresholds'], // Liste seuils
          ['/api/alerts', 'settings'], // Configuration alertes
          ['/api/alerts', 'thresholds', payload.threshold_key], // Seuils par type
          ['/api/dashboard', 'settings'] // Dashboard config
        ],
        metadata: {
          threshold_id: payload.threshold_id,
          threshold_key: payload.threshold_key,
          operator: payload.operator,
          threshold_value: payload.threshold_value,
          scope_type: payload.scope_type,
          scope_entity_id: payload.scope_entity_id,
          severity: payload.severity,
          created_by: payload.created_by,
          is_active: payload.is_active,
          notification_channels: payload.notification_channels,
          admin_action: true
        }
      });
      
      this.publish(event);
      
      log(`EventBus: Seuil alerte créé - threshold_id: ${payload.threshold_id}, key: ${payload.threshold_key}, by: ${payload.created_by}`);
      
    } catch (error) {
      log(`EventBus: Erreur publishAlertThresholdCreated: ${error}`);
      throw error;
    }
  }

  async publishAlertThresholdUpdated(payload: AlertThresholdUpdatedPayload): Promise<void> {
    try {
      const event = createRealtimeEvent({
        type: EventTypeEnum.ALERT_THRESHOLD_UPDATED,
        entity: 'alert_threshold',
        entityId: payload.threshold_id,
        severity: 'info',
        affectedQueryKeys: [
          ['/api/alerts', 'thresholds'],
          ['/api/alerts', 'settings'],
          ['/api/alerts', 'thresholds', payload.threshold_id],
          ['/api/dashboard', 'settings']
        ],
        metadata: {
          threshold_id: payload.threshold_id,
          updated_by: payload.updated_by,
          updated_at: payload.updated_at,
          changes: payload.changes,
          was_active: payload.was_active,
          is_active: payload.is_active,
          activation_changed: payload.was_active !== payload.is_active,
          admin_action: true
        }
      });
      
      this.publish(event);
      
      log(`EventBus: Seuil alerte mis à jour - threshold_id: ${payload.threshold_id}, by: ${payload.updated_by}, changes: ${Object.keys(payload.changes).join(', ')}`);
      
    } catch (error) {
      log(`EventBus: Erreur publishAlertThresholdUpdated: ${error}`);
      throw error;
    }
  }

  async publishAlertThresholdDeactivated(payload: AlertThresholdDeactivatedPayload): Promise<void> {
    try {
      const event = createRealtimeEvent({
        type: EventTypeEnum.ALERT_THRESHOLD_DEACTIVATED,
        entity: 'alert_threshold',
        entityId: payload.threshold_id,
        severity: 'warning',
        affectedQueryKeys: [
          ['/api/alerts', 'thresholds'],
          ['/api/alerts', 'settings'],
          ['/api/alerts', 'thresholds', payload.threshold_id],
          ['/api/dashboard', 'settings']
        ],
        metadata: {
          threshold_id: payload.threshold_id,
          deactivated_by: payload.deactivated_by,
          deactivated_at: payload.deactivated_at,
          reason: payload.reason,
          admin_action: true
        }
      });
      
      this.publish(event);
      
      log(`EventBus: Seuil alerte désactivé - threshold_id: ${payload.threshold_id}, by: ${payload.deactivated_by}`);
      
    } catch (error) {
      log(`EventBus: Erreur publishAlertThresholdDeactivated: ${error}`);
      throw error;
    }
  }

  // === HELPERS DÉCLENCHEURS ÉVALUATION ===

  async publishPredictiveSnapshotSaved(payload: PredictiveSnapshotSavedPayload): Promise<void> {
    try {
      const event = createRealtimeEvent({
        type: EventTypeEnum.PREDICTIVE_SNAPSHOT_SAVED,
        entity: 'system',
        entityId: payload.snapshot_id,
        severity: 'info',
        affectedQueryKeys: [
          ['/api/predictive', payload.calculation_type],
          ['/api/alerts', 'evaluation', 'trigger'] // Déclenche évaluation seuils si besoin
        ],
        metadata: {
          snapshot_id: payload.snapshot_id,
          calculation_type: payload.calculation_type,
          calculated_at: payload.calculated_at,
          values: payload.values,
          triggers_evaluation: payload.triggers_evaluation,
          confidence_score: payload.confidence_score,
          triggers_alert_evaluation: payload.triggers_evaluation
        }
      });
      
      this.publish(event);
      
      if (payload.triggers_evaluation) {
        log(`EventBus: Snapshot prédictif sauvegardé - déclenchement évaluation seuils - type: ${payload.calculation_type}, values_count: ${Object.keys(payload.values).length}`);
      }
      
    } catch (error) {
      log(`EventBus: Erreur publishPredictiveSnapshotSaved: ${error}`);
      throw error;
    }
  }

  /**
   * Utilitaires
   */
  private getStatusChangeSeverity(newStatus: string): 'info' | 'warning' | 'success' | 'error' {
    const successStatuses = ['valide', 'signe', 'termine', 'validee', 'livre'];
    const warningStatuses = ['en_retard', 'archive', 'suspendu'];
    
    if (successStatuses.some(status => newStatus.includes(status))) {
      return 'success';
    }
    
    if (warningStatuses.some(status => newStatus.includes(status))) {
      return 'warning';
    }
    
    return 'info';
  }

  /**
   * Métriques et monitoring
   */
  public getStats() {
    return {
      subscriptionsCount: this.subscriptions.size,
      historySize: this.eventHistory.length,
      listenersCount: this.listenerCount('event'),
    };
  }

  /**
   * Nettoyage
   */
  public cleanup(): void {
    this.subscriptions.clear();
    this.eventHistory = [];
    this.removeAllListeners();
    
    // ÉTAPE 3 : Cleanup preloading prédictif
    this.cleanupPredictiveIntegration();
  }

  // ========================================
  // ÉTAPE 3 PHASE 3 PERFORMANCE : BACKGROUND PRELOADING TASKS
  // ========================================

  // Intégration services prédictifs
  private predictiveEngine: any = null;
  private predictiveTriggersEnabled = true;
  private businessHoursPreloadingEnabled = true;
  private weekendWarmingEnabled = true;
  
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

  /**
   * Configure l'intégration avec PredictiveEngine pour déclencheurs automatiques
   */
  public integratePredictiveEngine(predictiveEngine: any): void {
    this.predictiveEngine = predictiveEngine;
    
    console.log('[EventBus] Intégration PredictiveEngine activée pour déclencheurs automatiques');
    
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
    console.log('[EventBus] Démarrage cycles preloading background...');

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

    console.log('[EventBus] Cycles preloading background configurés et démarrés');
  }

  /**
   * Configure les déclencheurs prédictifs basés sur événements métier
   */
  private setupPredictiveEventTriggers(): void {
    console.log('[EventBus] Configuration déclencheurs prédictifs événementiels...');

    // Déclencheur AO : Prédict étude technique et fournisseurs
    this.subscribe(async (event) => {
      if (event.entity === 'ao' && (event.type === EventTypeEnum.AO_STATUS_CHANGED || event.type === EventTypeEnum.AO_CREATED)) {
        await this.triggerAOWorkflowPreloading(event);
      }
    }, { 
      entities: ['ao'],
      eventTypes: [EventTypeEnum.AO_STATUS_CHANGED, EventTypeEnum.AO_CREATED]
    });

    // Déclencheur Offre : Prédict projet et planning
    this.subscribe(async (event) => {
      if (event.entity === 'offer' && event.type === EventTypeEnum.OFFER_SIGNED) {
        await this.triggerOfferToProjectPreloading(event);
      }
    }, { 
      entities: ['offer'],
      eventTypes: [EventTypeEnum.OFFER_SIGNED, EventTypeEnum.OFFER_VALIDATED]
    });

    // Déclencheur Projet : Prédict chantier et équipes
    this.subscribe(async (event) => {
      if (event.entity === 'project' && event.type === EventTypeEnum.PROJECT_CREATED) {
        await this.triggerProjectWorkflowPreloading(event);
      }
    }, { 
      entities: ['project'],
      eventTypes: [EventTypeEnum.PROJECT_CREATED, EventTypeEnum.PROJECT_STATUS_CHANGED]
    });

    // Déclencheur Tâche : Prédict projet context et dépendances
    this.subscribe(async (event) => {
      if (event.entity === 'task' && event.type === EventTypeEnum.TASK_STATUS_CHANGED) {
        await this.triggerTaskRelatedPreloading(event);
      }
    }, { 
      entities: ['task'],
      eventTypes: [EventTypeEnum.TASK_STATUS_CHANGED, EventTypeEnum.TASK_OVERDUE]
    });

    // Déclencheur Analytics : Prédict dashboard refresh
    this.subscribe(async (event) => {
      if (event.entity === 'analytics' && event.type === EventTypeEnum.ANALYTICS_CALCULATED) {
        await this.triggerAnalyticsDashboardPreloading(event);
      }
    }, { 
      entities: ['analytics'],
      eventTypes: [EventTypeEnum.ANALYTICS_CALCULATED]
    });

    console.log('[EventBus] Déclencheurs prédictifs événementiels configurés');
  }

  /**
   * BUSINESS HOURS PRELOADING : Preloading intelligent pendant horaires business
   */
  private async executeBusinessHoursPreloading(): Promise<void> {
    if (!this.predictiveEngine || !this.contextCacheService) return;

    try {
      const startTime = Date.now();
      console.log('[EventBus] Exécution preloading business hours...');

      // 1. GÉNÉRATION PRÉDICTIONS CONTEXT BUSINESS
      const predictions = await this.predictiveEngine.predictNextEntityAccess();
      const businessPredictions = predictions
        .filter(p => p.confidence >= 65)
        .slice(0, 8); // Top 8 prédictions business hours

      // 2. PRELOADING CONTEXTES PRÉDITS
      const preloadPromises = businessPredictions.map(async (prediction) => {
        try {
          const success = await this.contextCacheService.preloadContextByPrediction(
            prediction.entityType,
            prediction.entityId,
            undefined,
            'medium'
          );
          
          if (success) {
            this.backgroundStats.businessHoursPreloads++;
            this.backgroundStats.totalTriggeredPreloads++;
          }
          
          return success;
        } catch (error) {
          console.warn(`[EventBus] Erreur preloading business hours ${prediction.entityType}:${prediction.entityId}:`, error);
          this.backgroundStats.failedBackgroundTasks++;
          return false;
        }
      });

      const results = await Promise.allSettled(preloadPromises);
      const successCount = results.filter(r => r.status === 'fulfilled' && r.value).length;

      // 3. OPTIMISATION CACHE BUSINESS HOURS
      await this.contextCacheService.integrateHeatMapData();

      this.backgroundStats.lastBusinessHoursRun = new Date();
      const duration = Date.now() - startTime;
      this.backgroundStats.averagePreloadLatency = 
        (this.backgroundStats.averagePreloadLatency + duration) / 2;

      console.log(`[EventBus] Business hours preloading terminé: ${successCount}/${businessPredictions.length} succès en ${duration}ms`);

    } catch (error) {
      console.error('[EventBus] Erreur business hours preloading:', error);
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
      console.log('[EventBus] Exécution weekend warming...');

      // 1. GÉNÉRATION HEAT-MAP PRÉPARATOIRE
      const heatMap = await this.predictiveEngine.generateEntityHeatMap();
      
      // 2. PRELOADING ENTITÉS POPULAIRES POUR LUNDI
      const mondayEntities = heatMap.hotEntities
        .filter(entity => entity.accessCount >= 10)
        .slice(0, 12); // Top 12 pour préparation semaine

      const warmingPromises = mondayEntities.map(async (entity) => {
        try {
          const success = await this.contextCacheService.preloadContextByPrediction(
            entity.entityType,
            entity.entityId,
            undefined,
            'low' // Priorité basse weekend
          );
          
          if (success) {
            this.backgroundStats.totalTriggeredPreloads++;
          }
          
          return success;
        } catch (error) {
          console.warn(`[EventBus] Erreur weekend warming ${entity.entityType}:${entity.entityId}:`, error);
          this.backgroundStats.failedBackgroundTasks++;
          return false;
        }
      });

      const results = await Promise.allSettled(warmingPromises);
      const successCount = results.filter(r => r.status === 'fulfilled' && r.value).length;

      // 3. OPTIMISATION CACHE PRÉ-SEMAINE
      await this.contextCacheService.optimizeLRUWithPredictiveScoring();

      this.backgroundStats.weekendWarmingRuns++;
      this.backgroundStats.lastWeekendWarmingRun = new Date();
      const duration = Date.now() - startTime;

      console.log(`[EventBus] Weekend warming terminé: ${successCount}/${mondayEntities.length} contextes préparés en ${duration}ms`);

    } catch (error) {
      console.error('[EventBus] Erreur weekend warming:', error);
      this.backgroundStats.failedBackgroundTasks++;
    }
  }

  /**
   * PEAK HOURS OPTIMIZATION : Optimisation intensive pendant pics d'activité
   */
  private async executePeakHoursOptimization(): Promise<void> {
    if (!this.predictiveEngine || !this.contextCacheService) return;

    try {
      console.log('[EventBus] Optimisation peak hours...');

      // 1. PRÉDICTIONS HAUTE FRÉQUENCE
      const predictions = await this.predictiveEngine.predictNextEntityAccess();
      const highConfidencePredictions = predictions
        .filter(p => p.confidence >= 80)
        .slice(0, 5); // Focus sur prédictions très fiables

      // 2. PRELOADING PRIORITAIRE
      for (const prediction of highConfidencePredictions) {
        try {
          await this.contextCacheService.preloadContextByPrediction(
            prediction.entityType,
            prediction.entityId,
            undefined,
            'high' // Priorité haute peak hours
          );
          
          this.backgroundStats.totalTriggeredPreloads++;
        } catch (error) {
          console.warn(`[EventBus] Erreur peak hours preloading:`, error);
          this.backgroundStats.failedBackgroundTasks++;
        }
      }

      // 3. ÉVICTION AGGRESSIVE ENTITÉS FROIDES
      await this.contextCacheService.optimizeLRUWithPredictiveScoring();

    } catch (error) {
      console.error('[EventBus] Erreur peak hours optimization:', error);
      this.backgroundStats.failedBackgroundTasks++;
    }
  }

  /**
   * NIGHTLY MAINTENANCE : Maintenance nocturne et préparation jour suivant
   */
  private async executeNightlyMaintenance(): Promise<void> {
    if (!this.predictiveEngine || !this.contextCacheService) return;

    try {
      console.log('[EventBus] Maintenance nocturne...');

      // 1. NETTOYAGE CACHE EXPIRÉ
      await this.contextCacheService.cleanupExpiredEntries();

      // 2. MISE À JOUR PATTERNS BTP
      if (this.predictiveEngine.updateBTPPatterns) {
        await this.predictiveEngine.updateBTPPatterns();
      }

      // 3. PRÉPARATION CONTEXTES JOUR SUIVANT
      const tomorrowPredictions = await this.predictMorningWorkflows();
      
      for (const prediction of tomorrowPredictions.slice(0, 6)) {
        try {
          await this.contextCacheService.preloadContextByPrediction(
            prediction.entityType,
            prediction.entityId,
            undefined,
            'low' // Priorité basse maintenance nocturne
          );
        } catch (error) {
          console.warn(`[EventBus] Erreur preload maintenance nocturne:`, error);
        }
      }

      console.log('[EventBus] Maintenance nocturne terminée');

    } catch (error) {
      console.error('[EventBus] Erreur maintenance nocturne:', error);
      this.backgroundStats.failedBackgroundTasks++;
    }
  }

  // ========================================
  // DÉCLENCHEURS ÉVÉNEMENTIELS SPÉCIALISÉS
  // ========================================

  /**
   * Déclencheur AO : Prédict workflow étude technique
   */
  private async triggerAOWorkflowPreloading(event: RealtimeEvent): Promise<void> {
    if (!this.predictiveTriggersEnabled || !this.contextCacheService) return;

    try {
      console.log(`[EventBus] Déclencheur AO workflow preloading: ${event.entityId}`);

      // Prédict séquence AO → Étude technique → Chiffrage
      const workflowPredictions = [
        { type: 'etude_technique', delay: 20, priority: 'medium' },
        { type: 'chiffrage', delay: 60, priority: 'medium' },
        { type: 'supplier', delay: 30, priority: 'low' }
      ];

      for (const prediction of workflowPredictions) {
        // Planifier preloading avec délai
        setTimeout(async () => {
          try {
            await this.contextCacheService.preloadContextByPrediction(
              prediction.type,
              `PREDICTED_${event.entityId}_${prediction.type}`,
              undefined,
              prediction.priority as any
            );
            
            this.backgroundStats.eventTriggeredPreloads++;
            this.backgroundStats.totalTriggeredPreloads++;
          } catch (error) {
            console.warn(`[EventBus] Erreur preload AO workflow ${prediction.type}:`, error);
            this.backgroundStats.failedBackgroundTasks++;
          }
        }, prediction.delay * 60 * 1000);
      }

    } catch (error) {
      console.error('[EventBus] Erreur déclencheur AO workflow:', error);
      this.backgroundStats.failedBackgroundTasks++;
    }
  }

  /**
   * Déclencheur Offre → Projet : Prédict planning et équipes
   */
  private async triggerOfferToProjectPreloading(event: RealtimeEvent): Promise<void> {
    if (!this.predictiveTriggersEnabled || !this.contextCacheService) return;

    try {
      console.log(`[EventBus] Déclencheur Offre→Projet preloading: ${event.entityId}`);

      // Prédict séquence Offre → Projet → Planning → Équipes
      const projectWorkflow = [
        { type: 'project', delay: 30, priority: 'high' },
        { type: 'planning', delay: 60, priority: 'medium' },
        { type: 'team', delay: 45, priority: 'medium' },
        { type: 'approvisionnement', delay: 90, priority: 'low' }
      ];

      for (const prediction of projectWorkflow) {
        setTimeout(async () => {
          try {
            await this.contextCacheService.preloadContextByPrediction(
              prediction.type,
              `PREDICTED_${event.entityId}_${prediction.type}`,
              undefined,
              prediction.priority as any
            );
            
            this.backgroundStats.eventTriggeredPreloads++;
            this.backgroundStats.totalTriggeredPreloads++;
          } catch (error) {
            console.warn(`[EventBus] Erreur preload offre→projet ${prediction.type}:`, error);
            this.backgroundStats.failedBackgroundTasks++;
          }
        }, prediction.delay * 60 * 1000);
      }

    } catch (error) {
      console.error('[EventBus] Erreur déclencheur offre→projet:', error);
      this.backgroundStats.failedBackgroundTasks++;
    }
  }

  /**
   * Déclencheur Projet : Prédict chantier et livraison
   */
  private async triggerProjectWorkflowPreloading(event: RealtimeEvent): Promise<void> {
    if (!this.predictiveTriggersEnabled || !this.contextCacheService) return;

    try {
      console.log(`[EventBus] Déclencheur Projet workflow preloading: ${event.entityId}`);

      const constructionWorkflow = [
        { type: 'chantier', delay: 180, priority: 'medium' },
        { type: 'controle_qualite', delay: 240, priority: 'medium' },
        { type: 'livraison', delay: 300, priority: 'low' }
      ];

      for (const prediction of constructionWorkflow) {
        setTimeout(async () => {
          try {
            await this.contextCacheService.preloadContextByPrediction(
              prediction.type,
              `PREDICTED_${event.entityId}_${prediction.type}`,
              undefined,
              prediction.priority as any
            );
            
            this.backgroundStats.eventTriggeredPreloads++;
            this.backgroundStats.totalTriggeredPreloads++;
          } catch (error) {
            console.warn(`[EventBus] Erreur preload projet workflow ${prediction.type}:`, error);
            this.backgroundStats.failedBackgroundTasks++;
          }
        }, prediction.delay * 60 * 1000);
      }

    } catch (error) {
      console.error('[EventBus] Erreur déclencheur projet workflow:', error);
      this.backgroundStats.failedBackgroundTasks++;
    }
  }

  /**
   * Déclencheur Tâche : Prédict contexte projet et dépendances
   */
  private async triggerTaskRelatedPreloading(event: RealtimeEvent): Promise<void> {
    if (!this.predictiveTriggersEnabled || !this.contextCacheService || !event.projectId) return;

    try {
      console.log(`[EventBus] Déclencheur Tâche preloading: ${event.entityId} → ${event.projectId}`);

      // Prédict contexte projet et équipe associée
      await this.contextCacheService.preloadContextByPrediction(
        'project',
        event.projectId,
        undefined,
        'medium'
      );
      
      // Prédict équipe si tâche terminée (probable accès suivant)
      if (event.newStatus === 'termine') {
        setTimeout(async () => {
          await this.contextCacheService.preloadContextByPrediction(
            'team',
            `TEAM_${event.projectId}`,
            undefined,
            'low'
          );
        }, 10 * 60 * 1000); // 10 minutes après
      }

      this.backgroundStats.eventTriggeredPreloads += 2;
      this.backgroundStats.totalTriggeredPreloads += 2;

    } catch (error) {
      console.error('[EventBus] Erreur déclencheur tâche:', error);
      this.backgroundStats.failedBackgroundTasks++;
    }
  }

  /**
   * Déclencheur Analytics : Prédict dashboard refresh
   */
  private async triggerAnalyticsDashboardPreloading(event: RealtimeEvent): Promise<void> {
    if (!this.predictiveTriggersEnabled || !this.contextCacheService) return;

    try {
      console.log(`[EventBus] Déclencheur Analytics dashboard preloading`);

      // Prédict accès dashboard et KPIs
      const dashboardContexts = [
        { type: 'dashboard', delay: 5, priority: 'high' },
        { type: 'kpi_summary', delay: 10, priority: 'medium' },
        { type: 'analytics_detailed', delay: 15, priority: 'low' }
      ];

      for (const context of dashboardContexts) {
        setTimeout(async () => {
          try {
            await this.contextCacheService.preloadContextByPrediction(
              context.type,
              'DASHBOARD_CONTEXT',
              undefined,
              context.priority as any
            );
            
            this.backgroundStats.eventTriggeredPreloads++;
            this.backgroundStats.totalTriggeredPreloads++;
          } catch (error) {
            console.warn(`[EventBus] Erreur preload analytics dashboard ${context.type}:`, error);
            this.backgroundStats.failedBackgroundTasks++;
          }
        }, context.delay * 60 * 1000);
      }

    } catch (error) {
      console.error('[EventBus] Erreur déclencheur analytics dashboard:', error);
      this.backgroundStats.failedBackgroundTasks++;
    }
  }

  // ========================================
  // MÉTHODES HELPER BACKGROUND PRELOADING
  // ========================================

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
   * Prédit les workflows du matin pour préparation nocturne
   */
  private async predictMorningWorkflows(): Promise<any[]> {
    // Simulation prédictions workflows matinaux
    const tomorrowMorning = new Date();
    tomorrowMorning.setDate(tomorrowMorning.getDate() + 1);
    tomorrowMorning.setHours(8, 0, 0, 0);

    return [
      { entityType: 'dashboard', entityId: 'MORNING_DASHBOARD', confidence: 85 },
      { entityType: 'ao', entityId: 'RECENT_AO_REVIEW', confidence: 80 },
      { entityType: 'project', entityId: 'ACTIVE_PROJECTS', confidence: 75 },
      { entityType: 'team', entityId: 'DAILY_PLANNING', confidence: 70 },
      { entityType: 'analytics', entityId: 'DAILY_KPI', confidence: 65 },
      { entityType: 'offer', entityId: 'PENDING_OFFERS', confidence: 60 }
    ];
  }

  /**
   * Active/désactive les déclencheurs prédictifs
   */
  public setPredictiveTriggersEnabled(enabled: boolean): void {
    this.predictiveTriggersEnabled = enabled;
    console.log(`[EventBus] Déclencheurs prédictifs ${enabled ? 'ACTIVÉS' : 'DÉSACTIVÉS'}`);
  }

  /**
   * Active/désactive le preloading business hours
   */
  public setBusinessHoursPreloadingEnabled(enabled: boolean): void {
    this.businessHoursPreloadingEnabled = enabled;
    console.log(`[EventBus] Preloading business hours ${enabled ? 'ACTIVÉ' : 'DÉSACTIVÉ'}`);
  }

  /**
   * Active/désactive le weekend warming
   */
  public setWeekendWarmingEnabled(enabled: boolean): void {
    this.weekendWarmingEnabled = enabled;
    console.log(`[EventBus] Weekend warming ${enabled ? 'ACTIVÉ' : 'DÉSACTIVÉ'}`);
  }

  /**
   * Statistiques background preloading pour monitoring
   */
  public getBackgroundPreloadingStats(): typeof this.backgroundStats {
    return { ...this.backgroundStats };
  }

  /**
   * Nettoyage intégration prédictive
   */
  private cleanupPredictiveIntegration(): void {
    // Arrêter tous les intervals
    for (const [name, interval] of this.preloadingIntervals.entries()) {
      clearInterval(interval);
      console.log(`[EventBus] Interval ${name} arrêté`);
    }
    
    this.preloadingIntervals.clear();
    this.backgroundTasksRunning = false;
    
    console.log('[EventBus] Intégration prédictive nettoyée');
  }

}

// Instance singleton
export const eventBus = new EventBus();