import { EventEmitter } from 'events';
import type { RealtimeEvent, EventFilter, EventType } from '../shared/events';
import { createRealtimeEvent, EventType as EventTypeEnum } from '../shared/events';
import { log } from './vite';

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

  constructor() {
    super();
    this.setMaxListeners(50); // Augmenter la limite pour éviter les warnings
  }

  /**
   * Publier un événement vers tous les abonnés
   */
  public publish(event: RealtimeEvent): void {
    try {
      // Ajouter à l'historique
      this.addToHistory(event);
      
      // Émettre l'événement
      this.emit('event', event);
      
      log(`EventBus: Published event ${event.type} for ${event.entity}:${event.entityId}`);
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
    if (filter.eventTypes && !filter.eventTypes.includes(event.type)) {
      return false;
    }

    // Filtrer par entités
    if (filter.entities && !filter.entities.includes(event.entity)) {
      return false;
    }

    // Filtrer par IDs d'entité
    if (filter.entityIds && !filter.entityIds.includes(event.entityId)) {
      return false;
    }

    // Filtrer par projets
    if (filter.projectIds && event.projectId && !filter.projectIds.includes(event.projectId)) {
      return false;
    }

    // Filtrer par offres
    if (filter.offerIds && event.offerId && !filter.offerIds.includes(event.offerId)) {
      return false;
    }

    // Filtrer par sévérité
    if (filter.severities && !filter.severities.includes(event.severity)) {
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

  /**
   * Helpers pour créer et publier des événements communs
   */

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
  }
}

// Instance singleton
export const eventBus = new EventBus();