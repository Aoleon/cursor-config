/**
 * OfferEventPublisher - Publisher pour événements offres
 * 
 * Responsabilités:
 * - Publier événements changement statut offre
 * - Publier événements signature offre
 * - Publier événements validation offre
 * 
 * Target LOC: ~100-150
 */

import type { RealtimeEvent } from '../../../shared/events';
import { createRealtimeEvent, EventType as EventTypeEnum } from '../../../shared/events';

export class OfferEventPublisher {
  private publish: (event: RealtimeEvent) => void;
  private getStatusChangeSeverity: (status: string) => 'info' | 'warning' | 'error' | 'success';

  constructor(
    publishFn: (event: RealtimeEvent) => void,
    getStatusChangeSeverityFn: (status: string) => 'info' | 'warning' | 'error' | 'success'
  ) {
    this.publish = publishFn;
    this.getStatusChangeSeverity = getStatusChangeSeverityFn;
  }

  /**
   * Publie un événement de changement de statut d'offre
   */
  publishOfferStatusChanged(params: {
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

  /**
   * Publie un événement de signature d'offre
   */
  publishOfferSigned(params: {
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

  /**
   * Publie un événement de validation d'offre
   */
  publishOfferValidated(params: {
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
}

