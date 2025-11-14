/**
 * ValidationEventPublisher - Publisher pour événements validations
 * 
 * Responsabilités:
 * - Publier événements validation milestones
 * 
 * Target LOC: ~50-100
 */

import type { RealtimeEvent } from '../../../shared/events';
import { createRealtimeEvent, EventType as EventTypeEnum } from '../../../shared/events';

export class ValidationEventPublisher {
  private publish: (event: RealtimeEvent) => void;

  constructor(publishFn: (event: RealtimeEvent) => void) {
    this.publish = publishFn;
  }

  /**
   * Publie un événement de validation milestone
   */
  publishValidationMilestoneValidated(params: {
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
}

