import { logger } from '../utils/logger';
import { eventBus } from '../eventBus';

export class SyncAuditService {
  constructor() {
    this.setupEventListeners();
    logger.info('[SyncAuditService] Service d\'audit de synchronisation initialisé', {
      service: 'SyncAuditService',
      metadata: {
        operation: 'constructor',
        listeners: ['monday:sync:conflict', 'monday:sync:success', 'monday:export:success']
      }
    });
  }
  
  private setupEventListeners() {
    eventBus.on('monday:sync:conflict', (event: any) => {
      logger.warn('[SyncAudit] Conflict détecté', {
        service: 'SyncAuditService',
        metadata: {
          operation: 'conflict',
          entityType: event.entityType,
          entityId: event.entityId,
          mondayId: event.mondayId,
          saxiumUpdatedAt: event.saxiumUpdatedAt,
          mondayUpdatedAt: event.mondayUpdatedAt,
          resolution: event.resolution,
          strategy: 'monday_wins'
        }
      });
    });
    
    eventBus.on('monday:sync:success', (event: any) => {
      logger.info('[SyncAudit] Sync réussie', {
        service: 'SyncAuditService',
        metadata: {
          operation: 'sync',
          entityType: event.entity,
          entityId: event.entityId,
          mondayId: event.metadata?.mondayId,
          boardId: event.metadata?.boardId,
          changeType: event.metadata?.changeType
        }
      });
    });
    
    eventBus.on('monday:export:success', (event: any) => {
      logger.info('[SyncAudit] Export réussi', {
        service: 'SyncAuditService',
        metadata: {
          operation: 'export',
          entityType: event.entityType,
          entityId: event.entityId,
          mondayId: event.mondayId,
          boardId: event.boardId
        }
      });
    });
  }
}

export const syncAuditService = new SyncAuditService();
