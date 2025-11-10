import { logger } from '../utils/logger';
import { withErrorHandling } from './utils/error-handler';
import { eventBus } from '../eventBus';
import { createRealtimeEvent, EventType } from '../../shared/events';

interface SyncState {
  entityId: string;
  entityType: 'project' | 'ao';
  lastStatus: 'synced' | 'syncing' | 'error' | 'conflict';
  lastSyncedAt: Date;
  mondayId?: string;
  conflictReason?: string;
}

export class SyncAuditService {
  private syncStates = new Map<string, SyncState>();

  constructor() {
    this.setupEventListeners();
    this.rebuildCacheFromDatabase();
    logger.info('[SyncAuditService] Service d\'audit de synchronisation initialisé', {
      service: 'SyncAuditService',
      metadata: {
        operation: 'constructor',
        listeners: ['monday:sync:conflict', 'monday:sync:success', 'monday:export:success', 'monday:export:failed']
      }
    });
  }
  
  /**
   * Rebuild cache from database at startup
   * Utilise les vraies colonnes mondaySyncStatus pour restaurer les états conflict/error
   */
  private async rebuildCacheFromDatabase() {
    return withErrorHandling(
    async () => {

      const { storage } = await import('../storage');
      
      const projects = await storage.getProjects();
      for (const project of projects) {
        if (project.mondaySyncStatus) {
          this.syncStates.set(project.id, {
            entityId: project.id,
            entityType: 'project',
            lastStatus: project.mondaySyncStatus as 'synced' | 'syncing' | 'error' | 'conflict',
            lastSyncedAt: project.mondayLastSyncedAt || new Date(),
            mondayId: project.mondayId || undefined,
            conflictReason: project.mondayConflictReason || undefined
          });
        }
      }
      
      const aos = await storage.getAos();
      for (const ao of aos) {
        if (ao.mondaySyncStatus) {
          this.syncStates.set(ao.id, {
            entityId: ao.id,
            entityType: 'ao',
            lastStatus: ao.mondaySyncStatus as 'synced' | 'syncing' | 'error' | 'conflict',
            lastSyncedAt: ao.mondayLastSyncedAt || new Date(),
            mondayId: ao.mondayId || undefined,
            conflictReason: ao.mondayConflictReason || undefined
          });
        }
      }
      
      logger.info('[SyncAuditService] Cache rebuild completed from DB columns', {
        service: 'SyncAuditService',
        metadata: {
          operation: 'rebuildCacheFromDatabase',
          projectsCount: projects.filter(p => p.mondaySyncStatus).length,
          aosCount: aos.filter(a => a.mondaySyncStatus).length,
          totalSyncStates: this.syncStates.size
        }
      });
    
    },
    {
      operation: 'constructor',
      service: 'SyncAuditService',
      metadata: {}
    }
  );
      });
    }
  }
  
  private setupEventListeners() {
    // Export success - Project or AO successfully exported to Monday
    eventBus.on('monday:export:success', async (event: unknown) => {
      const syncState: SyncState = {
        entityId: event.entityId,
        entityType: event.entityType || 'project',
        lastStatus: 'synced',
        lastSyncedAt: new Date(),
        mondayId: event.mondayId
      };
      
      this.syncStates.set(event.entityId, syncState);
      
      // Persist to DB
      return withErrorHandling(
    async () => {

        const { storage } = await import('../storage');
        if (event.entityType === 'project') {
          await storage.updateProject(event.entityId, {
            mondaySyncStatus: 'synced',
            mondayLastSyncedAt: new Date(),
            mondayId: event.mondayId
          });
        } else if (event.entityType === 'ao') {
          await storage.updateAO(event.entityId, {
            mondaySyncStatus: 'synced',
            mondayLastSyncedAt: new Date(),
            mondayId: event.mondayId
          });
        }
      
    },
    {
      operation: 'constructor',
      service: 'SyncAuditService',
      metadata: {}
    }
  );
        });
      }
      
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
      
      // Broadcast WebSocket event via EventBus
      const realtimeEvent = createRealtimeEvent({
        type: EventType.BATIGEST_EXPORT_SYNCED,
        entity: 'batigest',
        entityId: event.entityId,
        severity: 'success',
        message: `${event.entityType === 'project' ? 'Projet' : 'AO'} synchronisé avec Monday.com`,
        affectedQueryKeys: [
          ['/api/projects'],
          ['/api/aos'],
          ['/api/monday/sync-status']
        ],
        metadata: {
          syncType: 'monday',
          entityType: event.entityType,
          mondayId: event.mondayId,
          status: 'synced'
        }
      });
      
      eventBus.publish(realtimeEvent);
    });
    
    // Sync conflict - Monday data conflicts with Saxium data
    eventBus.on('monday:sync:conflict', async (event: unknown) => {
      const syncState: SyncState = {
        entityId: event.entityId,
        entityType: event.entityType || 'project',
        lastStatus: 'conflict',
        lastSyncedAt: new Date(),
        mondayId: event.mondayId,
        conflictReason: event.resolution
      };
      
      this.syncStates.set(event.entityId, syncState);
      
      // Persist to DB
      return withErrorHandling(
    async () => {

        const { storage } = await import('../storage');
        if (event.entityType === 'project') {
          await storage.updateProject(event.entityId, {
            mondaySyncStatus: 'conflict',
            mondayConflictReason: event.resolution,
            mondayLastSyncedAt: new Date(),
            mondayId: event.mondayId
          });
        } else if (event.entityType === 'ao') {
          await storage.updateAO(event.entityId, {
            mondaySyncStatus: 'conflict',
            mondayConflictReason: event.resolution,
            mondayLastSyncedAt: new Date(),
            mondayId: event.mondayId
          });
        }
      
    },
    {
      operation: 'constructor',
      service: 'SyncAuditService',
      metadata: {}
    }
  );
        });
      }
      
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
      
      // Broadcast WebSocket event via EventBus
      const realtimeEvent = createRealtimeEvent({
        type: EventType.BATIGEST_EXPORT_ERROR,
        entity: 'batigest',
        entityId: event.entityId,
        severity: 'warning',
        message: `Conflit de synchronisation: ${event.resolution}`,
        affectedQueryKeys: [
          ['/api/projects'],
          ['/api/aos'],
          ['/api/monday/sync-status']
        ],
        metadata: {
          syncType: 'monday',
          entityType: event.entityType,
          conflictReason: event.resolution,
          status: 'conflict'
        }
      });
      
      eventBus.publish(realtimeEvent);
    });
    
    // Export failed - Error during export to Monday
    eventBus.on('monday:export:failed', async (event: unknown) => {
      const syncState: SyncState = {
        entityId: event.entityId,
        entityType: event.entityType || 'project',
        lastStatus: 'error',
        lastSyncedAt: new Date(),
        mondayId: event.mondayId
      };
      
      this.syncStates.set(event.entityId, syncState);
      
      // Persist to DB
      return withErrorHandling(
    async () => {

        const { storage } = await import('../storage');
        if (event.entityType === 'project') {
          await storage.updateProject(event.entityId, {
            mondaySyncStatus: 'error',
            mondayConflictReason: event.error,
            mondayLastSyncedAt: new Date(),
            mondayId: event.mondayId
          });
        } else if (event.entityType === 'ao') {
          await storage.updateAO(event.entityId, {
            mondaySyncStatus: 'error',
            mondayConflictReason: event.error,
            mondayLastSyncedAt: new Date(),
            mondayId: event.mondayId
          });
        }
      
    },
    {
      operation: 'constructor',
      service: 'SyncAuditService',
      metadata: {}
    }
  );
        });
      }
      
      logger.error('[SyncAudit] Export échoué', {
        service: 'SyncAuditService',
        metadata: {
          operation: 'export_failed',
          entityType: event.entityType,
          entityId: event.entityId,
          mondayId: event.mondayId,
          error: event.error
        }
      });
      
      // Broadcast WebSocket event via EventBus
      const realtimeEvent = createRealtimeEvent({
        type: EventType.BATIGEST_EXPORT_ERROR,
        entity: 'batigest',
        entityId: event.entityId,
        severity: 'error',
        message: 'Erreur de synchronisation avec Monday.com',
        affectedQueryKeys: [
          ['/api/projects'],
          ['/api/aos'],
          ['/api/monday/sync-status']
        ],
        metadata: {
          syncType: 'monday',
          entityType: event.entityType,
          status: 'error',
          error: event.error
        }
      });
      
      eventBus.publish(realtimeEvent);
    });
    
    // Sync success - Generic sync success event
    eventBus.on('monday:sync:success', (e: unknown)unknown) => {
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
  }
  
  /**
   * Get sync status for a specific entity
   */
  getSyncStatus(entityId: string): SyncState | undefined {
    return this.syncStates.get(entityId);
  }
  
  /**
   * Get all sync statuses
   */
  getAllSyncStatuses(): SyncState[] {
    return Array.from(this.syncStates.values());
  }
}

export const syncAuditService = new SyncAuditService();
