/**
 * DocumentSyncService
 * Service de synchronisation automatique OneDrive → DB
 * 
 * Fonctionnalités :
 * - Synchronisation manuelle à la demande
 * - Synchronisation automatique sur événements
 * - Détection des documents nouveaux/modifiés/supprimés
 */

import { logger } from '../utils/logger';
import { oneDriveService } from './OneDriveService';
import type { IStorage } from '../storage';
import type { EventBus } from '../eventBus';

interface SyncResult {
  success: boolean;
  documentsAdded: number;
  documentsUpdated: number;
  documentsDeleted: number;
  errors: string[];
}

interface SyncOptions {
  aoId: string;
  aoReference: string;
  force?: boolean; // Force sync même si déjà syncé récemment
}

export class DocumentSyncService {
  private storage: IStorage;
  private eventBus: EventBus;
  private syncInProgress: Set<string> = new Set();

  constructor(storage: IStorage, eventBus: EventBus) {
    this.storage = storage;
    this.eventBus = eventBus;
    logger.info('[DocumentSyncService] Service created');
  }

  /**
   * Synchronise les documents OneDrive vers la DB pour un AO
   */
  async syncDocuments(options: SyncOptions): Promise<SyncResult> {
    const { aoId, aoReference, force = false } = options;

    // Vérifier si une synchronisation est déjà en cours
    if (this.syncInProgress.has(aoId)) {
      logger.warn('[DocumentSyncService] Sync déjà en cours', {
        metadata: { aoId, aoReference }
      });
      return {
        success: false,
        documentsAdded: 0,
        documentsUpdated: 0,
        documentsDeleted: 0,
        errors: ['Synchronisation déjà en cours']
      };
    }

    this.syncInProgress.add(aoId);
    const result: SyncResult = {
      success: true,
      documentsAdded: 0,
      documentsUpdated: 0,
      documentsDeleted: 0,
      errors: []
    };

    try {
      logger.info('[DocumentSyncService] Début synchronisation', {
        metadata: { aoId, aoReference, force }
      });

      // Récupérer les documents existants en DB
      const existingDocs = await this.storage.getDocumentsByEntity('ao', aoId);

      // Map des documents existants par oneDriveId
      const existingDocsMap = new Map(
        existingDocs
          .filter(doc => doc.oneDriveId)
          .map(doc => [doc.oneDriveId!, doc])
      );

      // Chemin OneDrive de base pour l'AO
      const basePath = `OneDrive-JLM/01 - ETUDES AO/AO-${aoReference}`;

      // Catégories de documents à synchroniser
      const categories = [
        '01-DCE-Cotes-Photos',
        '02-Etudes-fournisseurs',
        '03-Devis-pieces-administratives'
      ];

      // Map des fichiers OneDrive trouvés
      const oneDriveFilesMap = new Map<string, any>();

      // Scanner chaque catégorie
      for (const category of categories) {
        try {
          const categoryPath = `${basePath}/${category}`;
          const items = await oneDriveService.listItems(categoryPath);

          // Filtrer uniquement les fichiers (pas les dossiers)
          const files = items.filter(item => 'size' in item);

          for (const file of files) {
            oneDriveFilesMap.set(file.id, { ...file, category });
          }
        } catch (error: any) {
          if (error.message?.includes('404')) {
            // Dossier n'existe pas encore, normal
            logger.debug('[DocumentSyncService] Catégorie non trouvée', {
              metadata: { aoId, category }
            });
          } else {
            result.errors.push(`Erreur scan ${category}: ${error.message}`);
          }
        }
      }

      // Ajouter les nouveaux documents
      for (const [oneDriveId, fileData] of Array.from(oneDriveFilesMap.entries())) {
        if (!existingDocsMap.has(oneDriveId)) {
          try {
            await this.storage.createDocument({
              name: fileData.name,
              originalName: fileData.name,
              filePath: `onedrive/${aoReference}/${fileData.category}/${fileData.name}`,
              category: fileData.category as any,
              uploadedBy: 'system', // TODO: récupérer l'utilisateur qui a uploadé
              metadata: {
                aoId, // Stocké temporairement en metadata
                aoReference
              },
              oneDriveId: fileData.id,
              oneDrivePath: `${basePath}/${fileData.category}/${fileData.name}`,
              oneDriveUrl: fileData.webUrl,
              syncedFromOneDrive: true,
              lastSyncedAt: new Date()
            });
            result.documentsAdded++;
          } catch (error: any) {
            result.errors.push(`Erreur ajout ${fileData.name}: ${error.message}`);
          }
        } else {
          // Mettre à jour lastSyncedAt
          const existingDoc = existingDocsMap.get(oneDriveId)!;
          try {
            await this.storage.updateDocument(existingDoc.id, {
              lastSyncedAt: new Date()
            });
            result.documentsUpdated++;
          } catch (error: any) {
            result.errors.push(`Erreur update ${fileData.name}: ${error.message}`);
          }
        }
      }

      // Marquer comme supprimés les documents qui ne sont plus dans OneDrive
      for (const [oneDriveId, doc] of Array.from(existingDocsMap.entries())) {
        if (!oneDriveFilesMap.has(oneDriveId)) {
          try {
            await this.storage.deleteDocument(doc.id);
            result.documentsDeleted++;
          } catch (error: any) {
            result.errors.push(`Erreur suppression ${doc.name}: ${error.message}`);
          }
        }
      }

      logger.info('[DocumentSyncService] Synchronisation terminée', {
        metadata: {
          aoId,
          aoReference,
          ...result
        }
      });

    } catch (error: any) {
      result.success = false;
      result.errors.push(`Erreur globale: ${error.message}`);
      logger.error('[DocumentSyncService] Erreur synchronisation', error, {
        metadata: { aoId, aoReference }
      });
    } finally {
      this.syncInProgress.delete(aoId);
    }

    return result;
  }

  /**
   * Synchronise tous les AOs d'un seul coup (admin/maintenance)
   */
  async syncAllAOs(): Promise<{ total: number; synced: number; errors: number }> {
    logger.info('[DocumentSyncService] Début sync globale');

    const aos = await this.storage.getAos();
    const results = {
      total: aos.length,
      synced: 0,
      errors: 0
    };

    for (const ao of aos) {
      const result = await this.syncDocuments({
        aoId: ao.id,
        aoReference: ao.reference,
        force: false
      });

      if (result.success) {
        results.synced++;
      } else {
        results.errors++;
      }
    }

    logger.info('[DocumentSyncService] Sync globale terminée', {
      metadata: results
    });

    return results;
  }

  /**
   * Vérifie si une synchronisation est en cours pour un AO
   */
  isSyncInProgress(aoId: string): boolean {
    return this.syncInProgress.has(aoId);
  }
}

// Instance singleton (sera initialisée dans index.ts)
let documentSyncServiceInstance: DocumentSyncService | null = null;

export function initializeDocumentSyncService(storage: IStorage, eventBus: EventBus): DocumentSyncService {
  if (!documentSyncServiceInstance) {
    documentSyncServiceInstance = new DocumentSyncService(storage, eventBus);
    logger.info('[DocumentSyncService] Service initialisé');
  }
  return documentSyncServiceInstance;
}

export function getDocumentSyncService(): DocumentSyncService {
  if (!documentSyncServiceInstance) {
    throw new Error('DocumentSyncService non initialisé');
  }
  return documentSyncServiceInstance;
}
