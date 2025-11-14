/**
 * BusinessAlertEventPublisher - Publisher pour événements alertes métier et thresholds
 * 
 * Responsabilités:
 * - Publier événements alertes métier (created, acknowledged, resolved, dismissed, assigned)
 * - Publier événements thresholds (created, updated, deactivated)
 * - Publier événements snapshots prédictifs
 * 
 * Target LOC: ~300-400
 */

import type { RealtimeEvent } from '../../../shared/events';
import { createRealtimeEvent, EventType as EventTypeEnum } from '../../../shared/events';
import type {
  BusinessAlertCreatedPayload,
  BusinessAlertAcknowledgedPayload,
  BusinessAlertResolvedPayload,
  BusinessAlertDismissedPayload,
  BusinessAlertAssignedPayload,
  AlertThresholdCreatedPayload,
  AlertThresholdUpdatedPayload,
  AlertThresholdDeactivatedPayload,
  PredictiveSnapshotSavedPayload
} from '../../../shared/events';
import { log } from '../../vite';

export class BusinessAlertEventPublisher {
  private publish: (event: RealtimeEvent) => void;

  constructor(publishFn: (event: RealtimeEvent) => void) {
    this.publish = publishFn;
  }

  /**
   * Publie un événement de création d'alerte métier
   */
  async publishBusinessAlertCreated(payload: BusinessAlertCreatedPayload): Promise<void> {
    try {
      const event = createRealtimeEvent({
        type: EventTypeEnum.BUSINESS_ALERT_CREATED,
        entity: 'business_alert',
        entityId: payload.alert_id,
        severity: payload.severity as 'info' | 'warning' | 'error' | 'critical',
        affectedQueryKeys: [
          ['/api/alerts', 'business'],
          ['/api/alerts', payload.alert_id],
          ['/api/dashboard', 'alerts'],
          ['/api/notifications', 'alerts']
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
      log(`EventBus: Erreur lors de la publication de business alert created: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Publie un événement d'alerte métier accusée réception
   */
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
          ['/api/alerts', 'status', 'acknowledged']
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
      
      log(`EventBus: Alerte reconnue - alert_id: ${payload.alert_id}, by: ${payload.acknowledged_by}`);
    } catch (error) {
      log(`EventBus: Erreur lors de la publication de business alert acknowledged: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Publie un événement d'alerte métier résolue
   */
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
          ['/api/alerts', 'status', 'resolved'],
          ['/api/analytics', 'alerts', 'resolution_metrics']
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
      log(`EventBus: Erreur lors de la publication de business alert resolved: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Publie un événement d'alerte métier rejetée
   */
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
          ['/api/alerts', 'status', 'dismissed']
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
      
      log(`EventBus: Alerte rejetée - alert_id: ${payload.alert_id}, by: ${payload.dismissed_by}`);
    } catch (error) {
      log(`EventBus: Erreur lors de la publication de business alert dismissed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Publie un événement d'alerte métier assignée
   */
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
          ['/api/alerts', 'assigned', payload.assigned_to],
          ['/api/dashboard', 'alerts'],
          ['/api/notifications', payload.assigned_to]
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
      
      log(`EventBus: Alerte assignée - alert_id: ${payload.alert_id}, to: ${payload.assigned_to}`);
    } catch (error) {
      log(`EventBus: Erreur lors de la publication de business alert assigned: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Publie un événement de création de threshold
   */
  async publishAlertThresholdCreated(payload: AlertThresholdCreatedPayload): Promise<void> {
    try {
      const event = createRealtimeEvent({
        type: EventTypeEnum.ALERT_THRESHOLD_CREATED,
        entity: 'alert_threshold',
        entityId: payload.threshold_id,
        severity: 'success',
        affectedQueryKeys: [
          ['/api/alerts', 'thresholds'],
          ['/api/alerts', 'settings'],
          ['/api/alerts', 'thresholds', payload.threshold_key],
          ['/api/dashboard', 'settings']
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
      
      log(`EventBus: Seuil d'alerte créé - threshold_id: ${payload.threshold_id}`);
    } catch (error) {
      log(`EventBus: Erreur lors de la publication de alert threshold created: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Publie un événement de mise à jour de threshold
   */
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
      
      log(`EventBus: Seuil d'alerte mis à jour - threshold_id: ${payload.threshold_id}`);
    } catch (error) {
      log(`EventBus: Erreur lors de la publication de alert threshold updated: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Publie un événement de désactivation de threshold
   */
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
      
      log(`EventBus: Seuil d'alerte désactivé - threshold_id: ${payload.threshold_id}`);
    } catch (error) {
      log(`EventBus: Erreur lors de la publication de alert threshold deactivated: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Publie un événement de snapshot prédictif sauvegardé
   */
  async publishPredictiveSnapshotSaved(payload: PredictiveSnapshotSavedPayload): Promise<void> {
    try {
      const event = createRealtimeEvent({
        type: EventTypeEnum.PREDICTIVE_SNAPSHOT_SAVED,
        entity: 'system',
        entityId: payload.snapshot_id,
        severity: 'info',
        affectedQueryKeys: [
          ['/api/predictive', payload.calculation_type],
          ['/api/alerts', 'evaluation', 'trigger']
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
      
      log(`EventBus: Snapshot prédictif sauvegardé - snapshot_id: ${payload.snapshot_id}, type: ${payload.calculation_type}`);
    } catch (error) {
      log(`EventBus: Erreur lors de la publication de predictive snapshot saved: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

