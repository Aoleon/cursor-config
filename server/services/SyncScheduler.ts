import cron from 'node-cron';
import { withErrorHandling } from './utils/error-handler';
import { logger } from '../utils/logger';
import type { IStorage } from '../storage-poc';
import { DocumentSyncService } from './DocumentSyncService';
import type { SyncError } from './DocumentSyncService';

export class SyncScheduler {
  private cronJob: cron.ScheduledTask | null = null;
  private storage: IStorage;
  private documentSyncService: DocumentSyncService;
  private isRunning = false;

  constructor(storage: IStorage, documentSyncService: DocumentSyncService) {
    this.storage = storage;
    this.documentSyncService = documentSyncService;
  }

  async start(): Promise<void> {
    return withErrorHandling(
    async () => {

      let config = await this.storage.getSyncConfig();
      
      if (!config) {
        logger.info('[SyncScheduler] Aucune configuration trouvée, création config par défaut', { metadata: { service: 'SyncScheduler', operation: 'start' 
        
        config = await this.storage.updateSyncConfig({
          isEnabled: false,
          cronExpression: '0 */6 * * *',
          updatedBy: 'system'
        });
      }

      if (!config.isEnabled) {
        logger.info('[SyncScheduler] Synchronisation automatique désactivée', { metadata: { service: 'SyncScheduler', operation: 'start' 
        return;
      }

      this.stop();

      const cronExpression = config.cronExpression || '0 */6 * * *';
      
      this.cronJob = cron.schedule(cronExpression, async () => {
        await this.runSync();
      });

      logger.info('[SyncScheduler] Synchronisation automatique démarrée', { metadata: {
          service: 'SyncScheduler',
          operation: 'start',
          cronExpression,
          nextRun: this.getNextRun() 
              }
            });
      await this.storage.updateSyncConfig({
        nextSyncAt: this.getNextRun()
      });
    
    },
    {
      operation: 'constructor',
      service: 'SyncScheduler',
      metadata: {}
    } );
      throw error;
    }
  }

  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      logger.info('[SyncScheduler] Synchronisation automatique arrêtée', { metadata: { service: 'SyncScheduler', operation: 'stop' 
    }
  }

  async restart(): Promise<void> {
    this.stop();
    await this.start();
  }

  // ROBUST-1: Standardisé pour utiliser la signature correcte de DocumentSyncService
  private async syncAOWithTimeout(aoId: string, aoReference: string, timeoutMs: number = 60000): Promise<{ documentsAdded: number; documentsUpdated: number; documentsDeleted: number; errors: SyncError[] }> {
    return Promise.race([
      this.documentSyncService.syncDocuments({ aoId, aoReference }),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error(`Timeout après ${timeoutMs}ms`)), timeoutMs)
      )
    ]);
  }

  private async runSync(): Promise<void> {
    if (this.isRunning) {
      logger.warn('[SyncScheduler] Synchronisation déjà en cours, skip', { metadata: { service: 'SyncScheduler', operation: 'runSync' 
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    return withErrorHandling(
    async () => {

      await this.storage.updateSyncConfig({
        lastSyncStatus: 'running',
        lastSyncAt: new Date()
      });

      logger.info('[SyncScheduler] Début synchronisation automatique', { metadata: { service: 'SyncScheduler', operation: 'runSync' 

      const aos = await this.storage.getAos();
      
      let totalDocumentsAdded = 0;
      let totalDocumentsUpdated = 0;
      let totalDocumentsDeleted = 0;
      const errors: SyncError[] = [];
      const AO_SYNC_TIMEOUT_MS = 120000;

      logger.info('[SyncScheduler] Synchronisation de tous les AOs', { metadata: { service: 'SyncScheduler', totalAOs: aos.length 

      for (const ao of aos) {
        try {
          const result = await this.syncAOWithTimeout(ao.id, ao.reference, AO_SYNC_TIMEOUT_MS);
          totalDocumentsAdded += result.documentsAdded;
          totalDocumentsUpdated += result.documentsUpdated;
          totalDocumentsDeleted += result.documentsDeleted;
          errors.push(...result.errors);
          
          logger.debug('[SyncScheduler] AO synchronisé', { metadata: {
              aoId: ao.id,
              aoReference: ao.reference,
              documentsAdded: result.documentsAdded,
              documentsUpdated: result.documentsUpdated 
              }
            });
    },
    {
      operation: 'constructor',
service: 'SyncScheduler',
      metadata: { } });
      }

      const duration = Date.now() - startTime;

      await this.storage.updateSyncConfig({
        lastSyncStatus: errors.length > 0 ? 'error' : 'success',
        lastSyncAt: new Date(),
        nextSyncAt: this.getNextRun(),
        lastSyncResult: {
          totalAOs: aos.length,
          totalDocuments: totalDocumentsAdded + totalDocumentsUpdated,
          documentsAdded: totalDocumentsAdded,
          documentsUpdated: totalDocumentsUpdated,
          documentsDeleted: totalDocumentsDeleted,
          errors: errors.map(e => e.message), // Convert to string[] for storage
          duration
        });

      logger.info('[SyncScheduler] Synchronisation automatique terminée', { metadata: {
          service: 'SyncScheduler',
          operation: 'runSync',
          totalAOs: aos.length,
          documentsAdded: totalDocumentsAdded,
          documentsUpdated: totalDocumentsUpdated,
          documentsDeleted: totalDocumentsDeleted,
          errors: errors.length,
          duration 
              }
            });
    } catch (error) {
      const duration = Date.now() - startTime;
      await this.storage.updateSyncConfig({
        lastSyncStatus: 'error',
        lastSyncAt: new Date(),
        nextSyncAt: this.getNextRun(),
        lastSyncResult: {
          errors: [error instanceof Error ? error.message : String(error)], // Already string format for storage
          duration
        });

      logger.error('[SyncScheduler] Erreur synchronisation automatique', { metadata: {
          service: 'SyncScheduler',
          operation: 'runSync',
          error: error instanceof Error ? error.message : String(error) 
              }
            });
    } finally {
      this.isRunning = false;
    }
  }

  private getNextRun(): Date | null {
    if (!this.cronJob) return null;

    return withErrorHandling(
    async () => {

      const now = new Date();
      const cronJobOptions = (this.cronJob as unknown as { options?: { scheduled?: boolean; expression?: string })?.options;
      const cronExpression = cronJobOptions?.scheduled ? cronJobOptions.expression : null;
      
      if (!cronExpression) return null;

      const nextDate = new Date(now.getTime() + 6 * 60 * 60 * 1000);
      return nextDate;
    
    },
    {
      operation: 'constructor',
      service: 'SyncScheduler',
      metadata: {
      });
      return null;
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      isScheduled: this.cronJob !== null,
      nextRun: this.getNextRun()
    };
  }
}
