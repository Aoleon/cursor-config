/**
 * AnalyticsEventPublisher - Publisher pour événements analytics et KPIs
 * 
 * Responsabilités:
 * - Publier événements calcul analytics
 * - Publier événements refresh KPIs
 * 
 * Target LOC: ~50-100
 */

import type { RealtimeEvent } from '../../../shared/events';
import { createRealtimeEvent, EventType as EventTypeEnum } from '../../../shared/events';

export class AnalyticsEventPublisher {
  private publish: (event: RealtimeEvent) => void;

  constructor(publishFn: (event: RealtimeEvent) => void) {
    this.publish = publishFn;
  }

  /**
   * Publie un événement de calcul analytics
   */
  publishAnalyticsCalculated(metadata: unknown): void {
    const event = createRealtimeEvent({
      type: EventTypeEnum.ANALYTICS_CALCULATED,
      entity: "analytics",
      entityId: "analytics-system", 
      severity: 'info',
      message: "Analytics KPIs calculés et mis à jour",
      affectedQueryKeys: [
        ['/api/analytics/kpis'],
        ['/api/analytics/metrics'], 
        ['/api/analytics/snapshots'],
        ['/api/dashboard/kpis']
      ],
      metadata,
    });

    this.publish(event);
  }

  /**
   * Publie un événement de hint de refresh KPI
   */
  publishKpiRefreshHint(affectedQueryKeys: string[][]): void {
    const event = createRealtimeEvent({
      type: EventTypeEnum.KPI_REFRESH_HINT,
      entity: 'system',
      entityId: 'kpi-system',
      severity: 'info',
      affectedQueryKeys,
    });

    this.publish(event);
  }
}

