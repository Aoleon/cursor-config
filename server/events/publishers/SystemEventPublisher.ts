/**
 * SystemEventPublisher - Publisher pour événements système
 * 
 * Responsabilités:
 * - Publier événements cache (hit/miss/invalidation/prewarming)
 * - Publier événements performance
 * - Publier événements Batigest
 * 
 * Target LOC: ~200-250
 */

import type { RealtimeEvent } from '../../../shared/events';
import { createRealtimeEvent, EventType as EventTypeEnum } from '../../../shared/events';

export class SystemEventPublisher {
  private publish: (event: RealtimeEvent) => void;

  constructor(publishFn: (event: RealtimeEvent) => void) {
    this.publish = publishFn;
  }

  /**
   * Publie un événement de cache hit/miss pour monitoring
   */
  publishContextCacheEvent(params: {
    entityType: string;
    entityId: string;
    cacheKey: string;
    action: 'hit' | 'miss' | 'invalidated' | 'prewarmed';
    executionTimeMs: number;
    userId?: string;
  }): void {
    const event = createRealtimeEvent({
      type: EventTypeEnum.SYSTEM_MAINTENANCE,
      entity: 'system',
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
  publishCachePrewarmingEvent(params: {
    entityTypes: string[];
    contextCount: number;
    executionTimeMs: number;
    isScheduled: boolean;
  }): void {
    const event = createRealtimeEvent({
      type: EventTypeEnum.SYSTEM_MAINTENANCE,
      entity: 'system',
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
  publishPerformanceOptimizationEvent(params: {
    optimizationType: 'cache_hit_ratio' | 'query_optimization' | 'index_usage';
    improvementPercent: number;
    beforeValue: number;
    afterValue: number;
    entityType?: string;
  }): void {
    const event = createRealtimeEvent({
      type: EventTypeEnum.SYSTEM_MAINTENANCE,
      entity: 'system',
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

  /**
   * Publie un événement d'export Batigest en file d'attente
   */
  publishBatigestExportQueued(params: {
    exportId: string;
    documentType: 'purchase_order' | 'client_quote';
    documentId: string;
    userId?: string;
  }): void {
    const event = createRealtimeEvent({
      type: EventTypeEnum.BATIGEST_EXPORT_QUEUED,
      entity: 'batigest',
      entityId: params.exportId,
      severity: 'info',
      affectedQueryKeys: [
        ['/api/batigest/exports/all'],
        ['/api/batigest/stats'],
      ],
      userId: params.userId,
      metadata: {
        documentType: params.documentType,
        documentId: params.documentId,
      },
    });

    this.publish(event);
  }

  /**
   * Publie un événement d'export Batigest synchronisé avec succès
   */
  publishBatigestExportSynced(params: {
    exportId: string;
    documentType: 'purchase_order' | 'client_quote';
    documentId: string;
    userId?: string;
  }): void {
    const event = createRealtimeEvent({
      type: EventTypeEnum.BATIGEST_EXPORT_SYNCED,
      entity: 'batigest',
      entityId: params.exportId,
      severity: 'success',
      affectedQueryKeys: [
        ['/api/batigest/exports/all'],
        ['/api/batigest/stats'],
      ],
      userId: params.userId,
      metadata: {
        documentType: params.documentType,
        documentId: params.documentId,
      },
    });

    this.publish(event);
  }

  /**
   * Publie un événement d'erreur lors de la synchronisation Batigest
   */
  publishBatigestExportError(params: {
    exportId: string;
    documentType: 'purchase_order' | 'client_quote';
    documentId: string;
    error: string;
    userId?: string;
  }): void {
    const event = createRealtimeEvent({
      type: EventTypeEnum.BATIGEST_EXPORT_ERROR,
      entity: 'batigest',
      entityId: params.exportId,
      severity: 'error',
      affectedQueryKeys: [
        ['/api/batigest/exports/all'],
        ['/api/batigest/stats'],
      ],
      userId: params.userId,
      metadata: {
        documentType: params.documentType,
        documentId: params.documentId,
        error: params.error,
      },
    });

    this.publish(event);
  }
}

