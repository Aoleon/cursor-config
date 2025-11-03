import cron from 'node-cron';
import { logger } from '../utils/logger';
import type { IStorage } from '../storage-poc';
import { DocumentSyncService } from './DocumentSyncService';

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
    try {
      const config = await this.storage.getSyncConfig();
      
      if (!config) {
        logger.info('[SyncScheduler] Aucune configuration trouvée, utilisation des valeurs par défaut', {
          metadata: { service: 'SyncScheduler', operation: 'start' }
        });
        return;
      }

      if (!config.isEnabled) {
        logger.info('[SyncScheduler] Synchronisation automatique désactivée', {
          metadata: { service: 'SyncScheduler', operation: 'start' }
        });
        return;
      }

      this.stop();

      const cronExpression = config.cronExpression || '0 */6 * * *';
      
      this.cronJob = cron.schedule(cronExpression, async () => {
        await this.runSync();
      });

      logger.info('[SyncScheduler] Synchronisation automatique démarrée', {
        metadata: {
          service: 'SyncScheduler',
          operation: 'start',
          cronExpression,
          nextRun: this.getNextRun()
        }
      });

      await this.storage.updateSyncConfig({
        nextSyncAt: this.getNextRun()
      });
    } catch (error) {
      logger.error('[SyncScheduler] Erreur démarrage scheduler', {
        metadata: {
          service: 'SyncScheduler',
          operation: 'start',
          error: error instanceof Error ? error.message : String(error)
        }
      });
      throw error;
    }
  }

  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      logger.info('[SyncScheduler] Synchronisation automatique arrêtée', {
        metadata: { service: 'SyncScheduler', operation: 'stop' }
      });
    }
  }

  async restart(): Promise<void> {
    this.stop();
    await this.start();
  }

  private async runSync(): Promise<void> {
    if (this.isRunning) {
      logger.warn('[SyncScheduler] Synchronisation déjà en cours, skip', {
        metadata: { service: 'SyncScheduler', operation: 'runSync' }
      });
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      await this.storage.updateSyncConfig({
        lastSyncStatus: 'running',
        lastSyncAt: new Date()
      });

      logger.info('[SyncScheduler] Début synchronisation automatique', {
        metadata: { service: 'SyncScheduler', operation: 'runSync' }
      });

      const aos = await this.storage.getAos();
      
      let totalDocumentsAdded = 0;
      let totalDocumentsUpdated = 0;
      let totalDocumentsDeleted = 0;
      const errors: string[] = [];

      for (const ao of aos) {
        try {
          const result = await this.documentSyncService.syncAODocuments(ao.id);
          totalDocumentsAdded += result.documentsAdded;
          totalDocumentsUpdated += result.documentsUpdated;
          totalDocumentsDeleted += result.documentsDeleted;
          errors.push(...result.errors);
        } catch (error: any) {
          errors.push(`AO ${ao.reference}: ${error.message}`);
        }
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
          errors,
          duration
        }
      });

      logger.info('[SyncScheduler] Synchronisation automatique terminée', {
        metadata: {
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
          errors: [error instanceof Error ? error.message : String(error)],
          duration
        }
      });

      logger.error('[SyncScheduler] Erreur synchronisation automatique', {
        metadata: {
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

    try {
      const now = new Date();
      const cronExpression = (this.cronJob as any).options?.scheduled ? 
        (this.cronJob as any).options.expression : null;
      
      if (!cronExpression) return null;

      const nextDate = new Date(now.getTime() + 6 * 60 * 60 * 1000);
      return nextDate;
    } catch (error) {
      logger.error('[SyncScheduler] Erreur calcul prochaine exécution', {
        metadata: {
          service: 'SyncScheduler',
          operation: 'getNextRun',
          error: error instanceof Error ? error.message : String(error)
        }
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
