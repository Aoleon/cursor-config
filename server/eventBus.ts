import { EventEmitter } from 'events';
import { withErrorHandling } from './utils/error-handler';
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
import { logger } from './utils/logger';
import { AlertEventPublisher } from './events/publishers/AlertEventPublisher';
import { ProjectEventPublisher } from './events/publishers/ProjectEventPublisher';
import { OfferEventPublisher } from './events/publishers/OfferEventPublisher';
import { SystemEventPublisher } from './events/publishers/SystemEventPublisher';
import { DateIntelligenceEventPublisher } from './events/publishers/DateIntelligenceEventPublisher';
import { AnalyticsEventPublisher } from './events/publishers/AnalyticsEventPublisher';
import { ValidationEventPublisher } from './events/publishers/ValidationEventPublisher';
import { SupplierEventPublisher } from './events/publishers/SupplierEventPublisher';
import { RiskEventPublisher } from './events/publishers/RiskEventPublisher';
import { BusinessAlertEventPublisher } from './events/publishers/BusinessAlertEventPublisher';

type EventHandler = (event: RealtimeEvent) => void;

interface SubscriptionInfo {
  id: string;
  handler: EventHandler;
  filter?: EventFilter;
  subscribedAt: Date;
  listener: (event: RealtimeEvent) => void;
}

export class EventBus extends EventEmitter {
  private subscriptions = new Map<string, SubscriptionInfo>();
  private eventHistory: RealtimeEvent[] = [];
  private readonly maxHistorySize = 100; // Garder les 100 derniers événements
  
  // PHASE 2 PERFORMANCE: Intégration cache intelligent
  private contextCacheService: ContextCacheService | null = null;
  private cacheInvalidationEnabled = true;
  private autoInvalidationHooks = new Map<string, (event: RealtimeEvent) => void>();

  // Event Publishers par domaine
  private alertEventPublisher: AlertEventPublisher;
  private projectEventPublisher: ProjectEventPublisher;
  private offerEventPublisher: OfferEventPublisher;
  private systemEventPublisher: SystemEventPublisher;
  private dateIntelligenceEventPublisher: DateIntelligenceEventPublisher;
  private analyticsEventPublisher: AnalyticsEventPublisher;
  private validationEventPublisher: ValidationEventPublisher;
  private supplierEventPublisher: SupplierEventPublisher;
  private riskEventPublisher: RiskEventPublisher;
  private businessAlertEventPublisher: BusinessAlertEventPublisher;

  constructor() {
    super();
    this.setMaxListeners(50); // Augmenter la limite pour éviter les warnings
    this.setupAutomaticCacheInvalidation();
    
    // Initialiser les Event Publishers
    this.alertEventPublisher = new AlertEventPublisher((event) => this.publish(event));
    this.projectEventPublisher = new ProjectEventPublisher(
      (event) => this.publish(event),
      (status) => this.getStatusChangeSeverity(status)
    );
    this.offerEventPublisher = new OfferEventPublisher(
      (event) => this.publish(event),
      (status) => this.getStatusChangeSeverity(status)
    );
    this.systemEventPublisher = new SystemEventPublisher((event) => this.publish(event));
    this.dateIntelligenceEventPublisher = new DateIntelligenceEventPublisher((event) => this.publish(event));
    this.analyticsEventPublisher = new AnalyticsEventPublisher((event) => this.publish(event));
    this.validationEventPublisher = new ValidationEventPublisher((event) => this.publish(event));
    this.supplierEventPublisher = new SupplierEventPublisher((event) => this.publish(event));
    this.riskEventPublisher = new RiskEventPublisher((event) => this.publish(event));
    this.businessAlertEventPublisher = new BusinessAlertEventPublisher((event) => this.publish(event));
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
      log(`EventBus: Erreur lors de la publication d'événement: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * S'abonner aux événements avec filtre optionnel
   */
  public subscribe(handler: EventHandler, filter?: EventFilter): string {
    const subscriptionId = crypto.randomUUID();
    
    // Créer un handler filtré
    const filteredHandler = (event: RealtimeEvent) => {
      if (!filter || this.matchesFilter(event, filter)) {
        try {
          handler(event);
        } catch (error) {
          log(`EventBus: Erreur dans handler d'événement: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    };

    const subscription: SubscriptionInfo = {
      id: subscriptionId,
      handler,
      filter,
      subscribedAt: new Date(),
      listener: filteredHandler,
    };

    this.subscriptions.set(subscriptionId, subscription);
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

    // Supprimer le listener de l'EventEmitter
    this.off('event', subscription.listener);
    this.subscriptions.delete(subscriptionId);
    
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
      log(`[EventBus] Erreur lors de l'invalidation automatique du cache: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Génère le mapping d'invalidation selon l'événement
   */
  private getInvalidationMapping(event: RealtimeEvent): {
    entityType: string;
    entityId: string;
    changeType: 'update' | 'delete' | 'status_change';
    additionalContext?: Record<string, unknown>;
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
    metadata?: Record<string, unknown>;
  }): void {
    this.alertEventPublisher.publishTechnicalAlertActionPerformed(params);
  }

  public publishTechnicalAlertCreated(params: {
    alertId: string;
    aoId: string;
    aoReference: string;
    score: number;
    triggeredCriteria: string[];
    assignedToUserId?: string;
  }): void {
    this.alertEventPublisher.publishTechnicalAlertCreated(params);
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
    this.offerEventPublisher.publishOfferStatusChanged(params);
  }

  public publishOfferSigned(params: {
    offerId: string;
    reference?: string;
    userId?: string;
    projectId?: string;
  }): void {
    this.offerEventPublisher.publishOfferSigned(params);
  }

  public publishOfferValidated(params: {
    offerId: string;
    reference?: string;
    userId?: string;
    validationType?: string;
  }): void {
    this.offerEventPublisher.publishOfferValidated(params);
  }

  // Événements Analytics
  public publishAnalyticsCalculated(metadata: unknown): void {
    this.analyticsEventPublisher.publishAnalyticsCalculated(metadata);
  }

  // Événements Projets
  public publishProjectCreated(params: {
    projectId: string;
    name?: string;
    offerId?: string;
    userId?: string;
  }): void {
    this.projectEventPublisher.publishProjectCreated(params);
  }

  public publishProjectStatusChanged(params: {
    projectId: string;
    name?: string;
    prevStatus: string;
    newStatus: string;
    userId?: string;
  }): void {
    this.projectEventPublisher.publishProjectStatusChanged(params);
  }

  // Événements Tâches
  public publishTaskOverdue(params: {
    taskId: string;
    name?: string;
    projectId?: string;
    delayDays?: number;
    userId?: string;
  }): void {
    this.projectEventPublisher.publishTaskOverdue(params);
  }

  public publishTaskStatusChanged(params: {
    taskId: string;
    name?: string;
    projectId?: string;
    prevStatus: string;
    newStatus: string;
    userId?: string;
  }): void {
    this.projectEventPublisher.publishTaskStatusChanged(params);
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
    this.validationEventPublisher.publishValidationMilestoneValidated(params);
  }

  // Événements KPI
  public publishKpiRefreshHint(affectedQueryKeys: string[][]): void {
    this.analyticsEventPublisher.publishKpiRefreshHint(affectedQueryKeys);
  }

  // Événements Fournisseurs
  public publishSupplierQuoteReceived(params: {
    supplierRequestId: string;
    supplierName?: string;
    offerId?: string;
    userId?: string;
  }): void {
    this.supplierEventPublisher.publishSupplierQuoteReceived(params);
  }

  // Événements Alertes Techniques
  public publishTechnicalAlert(params: {
    aoReference: string;
    score: number;
    triggeredCriteria: string[];
    aoId?: string;
    userId?: string;
    metadata?: Record<string, unknown>;
  }): void {
    this.alertEventPublisher.publishTechnicalAlert({
      alertId: params.aoReference,
      message: `Score technique élevé (${params.score}) détecté pour AO ${params.aoReference}. Critères: ${params.triggeredCriteria.join(', ')}`,
      severity: 'warning',
      metadata: {
        aoId: params.aoId,
        score: params.score,
        triggeredCriteria: params.triggeredCriteria,
        aoReference: params.aoReference,
        ...params.metadata,
      },
    });
  }

  // ========================================
  // ÉVÉNEMENTS BATIGEST ERP SYNCHRONIZATION
  // ========================================

  // Export mis en queue pour synchronisation
  public publishBatigestExportQueued(params: {
    exportId: string;
    documentType: 'purchase_order' | 'client_quote';
    documentId: string;
    userId?: string;
  }): void {
    this.systemEventPublisher.publishBatigestExportQueued(params);
  }

  // Export synchronisé avec succès
  public publishBatigestExportSynced(params: {
    exportId: string;
    documentType: 'purchase_order' | 'client_quote';
    documentId: string;
    userId?: string;
  }): void {
    this.systemEventPublisher.publishBatigestExportSynced(params);
  }

  // Erreur lors de la synchronisation
  public publishBatigestExportError(params: {
    exportId: string;
    documentType: 'purchase_order' | 'client_quote';
    documentId: string;
    error: string;
    userId?: string;
  }): void {
    this.systemEventPublisher.publishBatigestExportError(params);
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
    this.systemEventPublisher.publishContextCacheEvent(params);
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
    this.systemEventPublisher.publishCachePrewarmingEvent(params);
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
    this.systemEventPublisher.publishPerformanceOptimizationEvent(params);
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
    this.dateIntelligenceEventPublisher.publishDateIntelligenceTimelineCalculated(params);
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
    this.dateIntelligenceEventPublisher.publishDateIntelligenceCascadeRecalculated(params);
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
    this.dateIntelligenceEventPublisher.publishDateIntelligenceRuleApplied(params);
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
    this.dateIntelligenceEventPublisher.publishDateIntelligenceAlertCreated(params);
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
    this.dateIntelligenceEventPublisher.publishDateIntelligencePlanningIssueDetected(params);
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
    this.alertEventPublisher.publishDateAlertCreated(params);
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
    this.alertEventPublisher.publishDateAlertAcknowledged(params);
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
    this.alertEventPublisher.publishDateAlertResolved(params);
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
    this.alertEventPublisher.publishSystemAlert(params);
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
    this.riskEventPublisher.publishResourceConflictDetected(params);
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
    this.riskEventPublisher.publishOptimizationOpportunityDetected(params);
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
    this.riskEventPublisher.publishDelayRiskDetected(params);
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
    this.alertEventPublisher.publishCriticalDeadlineAlert({
      entity: params.entityType,
      entityId: params.entityId,
      deadline: params.deadline.toISOString(),
      daysRemaining: params.daysRemaining,
      affectedUsers: [], // TODO: Récupérer depuis params si disponible
      metadata: {
        deadlineId: params.deadlineId,
        entityReference: params.entityReference,
        preparationStatus: params.preparationStatus,
        requiredActions: params.requiredActions,
      },
    });
  }

  // ========================================
  // PUBLISHERS ALERTES MÉTIER - PHASE 3.1.7.3
  // ========================================

  // === BUSINESS ALERTS PUBLISHERS ===

  async publishBusinessAlertCreated(payload: BusinessAlertCreatedPayload): Promise<void> {
    await this.businessAlertEventPublisher.publishBusinessAlertCreated(payload);
  }

  async publishBusinessAlertAcknowledged(payload: BusinessAlertAcknowledgedPayload): Promise<void> {
    await this.businessAlertEventPublisher.publishBusinessAlertAcknowledged(payload);
  }

  async publishBusinessAlertResolved(payload: BusinessAlertResolvedPayload): Promise<void> {
    await this.businessAlertEventPublisher.publishBusinessAlertResolved(payload);
  }

  async publishBusinessAlertDismissed(payload: BusinessAlertDismissedPayload): Promise<void> {
    await this.businessAlertEventPublisher.publishBusinessAlertDismissed(payload);
  }

  async publishBusinessAlertAssigned(payload: BusinessAlertAssignedPayload): Promise<void> {
    await this.businessAlertEventPublisher.publishBusinessAlertAssigned(payload);
  }

  // === THRESHOLDS PUBLISHERS ===

  async publishAlertThresholdCreated(payload: AlertThresholdCreatedPayload): Promise<void> {
    await this.businessAlertEventPublisher.publishAlertThresholdCreated(payload);
  }

  async publishAlertThresholdUpdated(payload: AlertThresholdUpdatedPayload): Promise<void> {
    await this.businessAlertEventPublisher.publishAlertThresholdUpdated(payload);
  }

  async publishAlertThresholdDeactivated(payload: AlertThresholdDeactivatedPayload): Promise<void> {
    await this.businessAlertEventPublisher.publishAlertThresholdDeactivated(payload);
  }

  // === HELPERS DÉCLENCHEURS ÉVALUATION ===

  async publishPredictiveSnapshotSaved(payload: PredictiveSnapshotSavedPayload): Promise<void> {
    await this.businessAlertEventPublisher.publishPredictiveSnapshotSaved(payload);
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
  private predictiveEngine: unknown = null;
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
  public integratePredictiveEngine(predictiveEngine: unknown): void {
    this.predictiveEngine = predictiveEngine;
    
    logger.info('Intégration PredictiveEngine activée', {
      metadata: {
        module: 'EventBus',
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
    logger.info('Démarrage cycles preloading background', { metadata: {
        module: 'EventBus',
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

    logger.info('Cycles preloading background configurés et démarrés', { metadata: {
        module: 'EventBus',
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
    logger.info('Configuration déclencheurs prédictifs événementiels', { metadata: {
        module: 'EventBus',
        operation: 'setupPredictiveEventTriggers'
            }

            });

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

    logger.info('Déclencheurs prédictifs événementiels configurés', {
      metadata: {
        module: 'EventBus',
        operation: 'setupPredictiveEventTriggers',
        context: { triggersCount: 5 }
              }

                                                                                  });
  }

  /**
   * BUSINESS HOURS PRELOADING : Preloading intelligent pendant horaires business
   */
  private async executeBusinessHoursPreloading(): Promise<void> {
    if (!this.predictiveEngine || !this.contextCacheService) return;

    try {
      const startTime = Date.now();
      logger.info('Exécution preloading business hours', { metadata: {
          module: 'EventBus',
          operation: 'executeBusinessHoursPreloading'
              }

            });
      // TODO: Implémenter la logique de preloading business hours
    } catch (error) {
      logger.error('Erreur executeBusinessHoursPreloading', { metadata: {
          module: 'EventBus',
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
      logger.info('Exécution weekend warming', { metadata: {
          module: 'EventBus',
          operation: 'weekendWarming'
              }

            });
      // TODO: Implémenter la logique de weekend warming
    } catch (error) {
      logger.error('Erreur executeWeekendWarming', { metadata: {
          module: 'EventBus',
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
      logger.info('Optimisation peak hours', { metadata: {
          module: 'EventBus',
          operation: 'peakHoursOptimization'
              }

            });

      // 3. ÉVICTION AGGRESSIVE ENTITÉS FROIDES
      await this.contextCacheService.optimizeLRUWithPredictiveScoring();
    } catch (error) {
      logger.error('Erreur peak hours optimization', { metadata: {
          module: 'EventBus',
          operation: 'peakHoursOptimization',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
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
      logger.info('Maintenance nocturne', { metadata: {
          module: 'EventBus',
          operation: 'nightlyMaintenance'
              }

            });

      logger.info('Maintenance nocturne terminée', { metadata: {
          module: 'EventBus',
          operation: 'nightlyMaintenance'
              }

            });
    } catch (error) {
      logger.error('Erreur executeNightlyMaintenance', { metadata: {
          module: 'EventBus',
          operation: 'nightlyMaintenance',
          error: error instanceof Error ? error.message : String(error)
              }

            });
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
      logger.info('Déclencheur AO workflow preloading', { metadata: {
          module: 'EventBus',
          operation: 'triggerAOWorkflowPreloading',
          entityId: event.entityId
              }

            });
      // TODO: Implémenter la logique de preloading AO workflow
    } catch (error) {
      logger.error('Erreur déclencheur AO workflow', { metadata: {
          module: 'EventBus',
          operation: 'triggerAOWorkflowPreloading',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
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
      logger.info('Déclencheur Offre→Projet preloading', { metadata: {
          module: 'EventBus',
          operation: 'triggerOfferToProjectPreloading',
          entityId: event.entityId
              }

            });
      // TODO: Implémenter la logique de preloading Offre→Projet
    } catch (error) {
      logger.error('Erreur déclencheur offre→projet', { metadata: {
          module: 'EventBus',
          operation: 'triggerOfferToProjectPreloading',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
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
      logger.info('Déclencheur Projet workflow preloading', { metadata: {
          module: 'EventBus',
          operation: 'triggerProjectWorkflowPreloading',
          entityId: event.entityId
              }

            });
      // TODO: Implémenter la logique de preloading Projet workflow
    } catch (error) {
      logger.error('Erreur déclencheur projet workflow', { metadata: {
          module: 'EventBus',
          operation: 'triggerProjectWorkflowPreloading',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
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
      logger.info('Déclencheur Tâche preloading', { metadata: {
          module: 'EventBus',
          operation: 'triggerTaskRelatedPreloading',
          entityId: event.entityId,
          projectId: event.projectId
              }

            });
      // TODO: Implémenter la logique de preloading Tâche
    } catch (error) {
      logger.error('Erreur déclencheur tâche preloading', { metadata: {
          module: 'EventBus',
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
      logger.info('Déclencheur Analytics dashboard preloading', { metadata: {
          module: 'EventBus',
          operation: 'triggerAnalyticsDashboardPreloading'
              }

            });
      // TODO: Implémenter la logique de preloading Analytics dashboard
    } catch (error) {
      logger.error('Erreur déclencheur analytics dashboard', { metadata: {
          module: 'EventBus',
          operation: 'triggerAnalyticsDashboardPreloading',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
              }

            });
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
  private async predictMorningWorkflows(): Promise<unknown[]> {
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
    logger.info(`Déclencheurs prédictifs ${enabled ? 'activés' : 'désactivés'}`, { metadata: {
        module: 'EventBus',
        operation: 'setPredictiveTriggersEnabled',
        enabled
            }

            });
  }

  /**
   * Active/désactive le preloading business hours
   */
  public setBusinessHoursPreloadingEnabled(enabled: boolean): void {
    this.businessHoursPreloadingEnabled = enabled;
    logger.info(`Preloading business hours ${enabled ? 'activé' : 'désactivé'}`, { metadata: {
        module: 'EventBus',
        operation: 'setBusinessHoursPreloadingEnabled',
        enabled
            }

            });
  }

  /**
   * Active/désactive le weekend warming
   */
  public setWeekendWarmingEnabled(enabled: boolean): void {
    this.weekendWarmingEnabled = enabled;
    logger.info(`Weekend warming ${enabled ? 'activé' : 'désactivé'}`, { metadata: {
        module: 'EventBus',
        operation: 'setWeekendWarmingEnabled',
        enabled
            }

            });
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
    for (const [name, interval] of Array.from(this.preloadingIntervals.entries())) {
      clearInterval(interval);
      logger.info('Interval arrêté', { metadata: {
          module: 'EventBus',
          operation: 'cleanupPredictiveIntegration',
          intervalName: name
              }

            });
    }
    
    this.preloadingIntervals.clear();
    this.backgroundTasksRunning = false;
    
    logger.info('Intégration prédictive nettoyée', { metadata: {
        module: 'EventBus',
        operation: 'cleanupPredictiveIntegration'
            }

            });
  }

}

// Instance singleton
export const eventBus = new EventBus();