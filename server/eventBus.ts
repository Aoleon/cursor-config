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