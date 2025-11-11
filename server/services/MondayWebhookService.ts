import crypto from 'crypto';
import { withErrorHandling } from './utils/error-handler';
import { logger } from '../utils/logger';
import { mondayImportService } from './MondayImportService';
import { eventBus } from '../eventBus';
import type { EventType } from '@shared/events';

export class MondayWebhookService {
  private eventIdCache = new Set<string>();
  
  async processWebhook(payload: unknown): Promise<void> {
    const { event } = payload;
    const eventId = event?.eventId || event?.id;
    
    if (!eventId) {
      logger.warn('[Monday Webhook] Event sans ID reçu', { metadata: {
          module: 'MondayWebhookService',
          operation: 'processWebhook',
          payload 
              }
            });
      return;
    }
    // Idempotence check
    if (this.eventIdCache.has(eventId)) {
      logger.info('[Monday Webhook] Event déjà traité (dupliqué)', { metadata: {
          module: 'MondayWebhookService',
          operation: 'processWebhook',
          eventId 
              }
            });
      return;
    }
    this.eventIdCache.add(eventId);
    
    // Cleanup old events (keep last 1000)
    if (this.eventIdCache.size > 1000) {
      const oldest = Array.from(this.eventIdCache)[0];
      this.eventIdCache.delete(oldest);
      logger.debug('[Monday Webhook] Cache nettoyé', { metadata: {
          module: 'MondayWebhookService',
          operation: 'processWebhook',
          cacheSize: this.eventIdCache.size,
          deletedEventId: oldest 
              }
            });
    }
    // Extract data
    const { pulseId, itemId, boardId, type, columnValues, userId } = event;
    const itemIdentifier = pulseId || itemId;
    
    if (!itemIdentifier || !boardId) {
      logger.error('[Monday Webhook] Event incomplet - itemId ou boardId manquant', { metadata: {
          module: 'MondayWebhookService',
          operation: 'processWebhook',
          eventId,
          event 
              }
            });
      return;
    }
    logger.info('[Monday Webhook] Traitement event Monday', { metadata: {
        module: 'MondayWebhookService',
        operation: 'processWebhook',
        eventId,
        boardId,
        itemId: itemIdentifier,
        type,
        userId 
              }
            });
    return withErrorHandling(
    async () => {
      // Route to MondayImportService
      await mondayImportService.syncFromMonday({
        boardId,
        itemId: itemIdentifier,
        changeType: type as 'create' | 'update' | 'delete',
        data: columnValues
      });
      
      // EventBus notification
      eventBus.publish({
        id: crypto.randomUUID(),
        type: 'monday:webhook:received' as unknown as EventType,
        entity: 'system',
        entityId: itemIdentifier,
        message: `Webhook Monday traité pour item ${itemIdentifier}`,
        severity: 'info',
        affectedQueryKeys: [
          ['/api/monday/items'],
          ['/api/monday/items', itemIdentifier]
        ],
        userId: userId || 'monday-webhook',
        timestamp: new Date().toISOString(),
        metadata: {
          eventId,
          boardId,
          itemId: itemIdentifier,
          type
        });
      
      logger.info('[Monday Webhook] Event traité avec succès', { metadata: {
          module: 'MondayWebhookService',
          operation: 'processWebhook',
          eventId,
          boardId,
          itemId: itemIdentifier 
              }
            });
    },
    {
      operation: 'processWebhook',
      service: 'MondayWebhookService',
      metadata: {}
    } );
      throw error;
    }
  }
}

export const mondayWebhookService = mondayintegrationService();
