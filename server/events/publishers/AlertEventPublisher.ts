/**
 * AlertEventPublisher - Publisher pour événements d'alertes
 * 
 * Responsabilités:
 * - Publier événements alertes techniques
 * - Publier événements alertes dates
 * - Publier événements alertes système
 * 
 * Target LOC: ~200-300
 */

import type { RealtimeEvent } from '../../../shared/events';
import { createRealtimeEvent, EventType as EventTypeEnum } from '../../../shared/events';
import { logger } from '../../utils/logger';

export class AlertEventPublisher {
  private publish: (event: RealtimeEvent) => void;

  constructor(publishFn: (event: RealtimeEvent) => void) {
    this.publish = publishFn;
  }

  /**
   * Publie un événement d'action sur alerte technique
   */
  publishTechnicalAlertActionPerformed(params: {
    alertId: string;
    action: 'acknowledged' | 'validated' | 'bypassed';
    userId?: string;
    metadata?: Record<string, unknown>;
  }): void {
    const event = createRealtimeEvent({
      type: EventTypeEnum.TECHNICAL_ALERT,
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

  /**
   * Publie un événement de création d'alerte technique
   */
  publishTechnicalAlertCreated(params: {
    alertId: string;
    aoId: string;
    aoReference: string;
    score: number;
    triggeredCriteria: string[];
    assignedToUserId?: string;
  }): void {
    const event = createRealtimeEvent({
      type: EventTypeEnum.TECHNICAL_ALERT,
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

  /**
   * Publie un événement d'alerte technique générique
   */
  publishTechnicalAlert(params: {
    alertId: string;
    message: string;
    severity: 'info' | 'warning' | 'error';
    metadata?: Record<string, unknown>;
  }): void {
    const event = createRealtimeEvent({
      type: EventTypeEnum.TECHNICAL_ALERT,
      entity: 'technical',
      entityId: params.alertId,
      severity: params.severity,
      message: params.message,
      affectedQueryKeys: [
        ['/api/technical-alerts'],
        ['/api/technical-alerts', params.alertId],
      ],
      metadata: {
        ...params.metadata,
      },
    });

    this.publish(event);
  }

  /**
   * Publie un événement de création d'alerte date
   */
  publishDateAlertCreated(params: {
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
      entity: params.entity as 'project' | 'ao' | 'offer' | 'task',
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

  /**
   * Publie un événement d'alerte date accusée réception
   */
  publishDateAlertAcknowledged(params: {
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
      entity: params.entity as 'project' | 'ao' | 'offer' | 'task',
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

  /**
   * Publie un événement d'alerte date résolue
   */
  publishDateAlertResolved(params: {
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
      entity: params.entity as 'project' | 'ao' | 'offer' | 'task',
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

  /**
   * Publie un événement d'alerte système (escalade critique)
   */
  publishSystemAlert(params: {
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
      type: EventTypeEnum.SYSTEM_MAINTENANCE, // Utiliser le type système existant pour escalade
      entity: params.entity as 'project' | 'ao' | 'offer' | 'task' | 'system',
      entityId: params.entityId,
      severity: 'error',
      title: '🚨 ESCALADE CRITIQUE',
      message: params.message,
      affectedQueryKeys: [
        ['/api/system/alerts'],
        ['/api/dashboard/alerts'],
        ['/api/system/health']
      ],
      metadata: {
        originalAlert: params.metadata.originalAlert,
        escalationLevel: params.metadata.escalationLevel,
        immediateAction: params.metadata.immediateAction,
        action: 'system_alert'
      }
    });

    this.publish(event);
  }

  /**
   * Publie un événement d'alerte échéance critique
   */
  publishCriticalDeadlineAlert(params: {
    entity: string;
    entityId: string;
    deadline: string;
    daysRemaining: number;
    affectedUsers: string[];
    metadata?: Record<string, unknown>;
  }): void {
    const event = createRealtimeEvent({
      type: EventTypeEnum.DATE_INTELLIGENCE_ALERT_CREATED,
      entity: params.entity as 'project' | 'ao' | 'offer' | 'task',
      entityId: params.entityId,
      severity: params.daysRemaining <= 0 ? 'error' : params.daysRemaining <= 3 ? 'warning' : 'info',
      title: '⏰ Échéance Critique',
      message: `Échéance dans ${params.daysRemaining} jour(s): ${params.deadline}`,
      affectedQueryKeys: [
        ['/api/date-alerts'],
        ['/api/date-alerts', params.entityId],
        ['/api/dashboard/alerts']
      ],
      userId: params.affectedUsers[0],
      metadata: {
        deadline: params.deadline,
        daysRemaining: params.daysRemaining,
        affectedUsers: params.affectedUsers,
        ...params.metadata,
        action: 'critical_deadline_alert'
      }
    });

    this.publish(event);
  }
}

