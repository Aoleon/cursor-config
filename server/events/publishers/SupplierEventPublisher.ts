/**
 * SupplierEventPublisher - Publisher pour événements fournisseurs
 * 
 * Responsabilités:
 * - Publier événements réception devis fournisseur
 * 
 * Target LOC: ~50-100
 */

import type { RealtimeEvent } from '../../../shared/events';
import { createRealtimeEvent, EventType as EventTypeEnum } from '../../../shared/events';

export class SupplierEventPublisher {
  private publish: (event: RealtimeEvent) => void;

  constructor(publishFn: (event: RealtimeEvent) => void) {
    this.publish = publishFn;
  }

  /**
   * Publie un événement de réception de devis fournisseur
   */
  publishSupplierQuoteReceived(params: {
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
}

