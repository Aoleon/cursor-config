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
import { buildAoPath, buildAoCategoryPath, getAoCategories } from '../config/onedrive.config';
import type { IStorage } from '../storage';
import type { EventBus } from '../eventBus';

// ROBUST-3: Types d'erreurs détaillés
export interface SyncError {
  type: 'category_scan' | 'document_create' | 'document_update' | 'document_delete' | 'onedrive_api' | 'unknown';
  category?: string;
  documentName?: string;
  message: string;
  originalError?: any;
}

export interface SyncResult {
  success: boolean;
  documentsAdded: number;
  documentsUpdated: number;
  documentsDeleted: number;
  errors: SyncError[];
  categoriesScanned: number;
  categoriesFailed: number;
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
        errors: [{
          type: 'unknown',
          message: 'Synchronisation déjà en cours pour cet AO'
        }],
        categoriesScanned: 0,
        categoriesFailed: 0
      };
    }

    this.syncInProgress.add(aoId);
    const result: SyncResult = {
      success: true,
      documentsAdded: 0,
      documentsUpdated: 0,
      documentsDeleted: 0,
      errors: [],
      categoriesScanned: 0,
      categoriesFailed: 0
    };

    try {
      logger.info('[DocumentSyncService] Début synchronisation', {
        metadata: { aoId, aoReference, force }
      });

      // PERF-5 FIX: Invalider le cache OneDrive avant sync pour garantir données fraîches
      const basePath = buildAoPath(aoReference);
      const categories = getAoCategories();
      
      // Invalider cache pour chaque catégorie
      for (const category of categories) {
        const categoryPath = buildAoCategoryPath(aoReference, category);
        await oneDriveService.invalidateCache(categoryPath);
      }

      logger.debug('[DocumentSyncService] Cache OneDrive invalidé', {
        metadata: { aoId, aoReference, categoriesInvalidated: categories.length }
      });

      // Récupérer les documents existants en DB
      const existingDocs = await this.storage.getDocumentsByEntity('ao', aoId);

      // Map des documents existants par oneDriveId
      const existingDocsMap = new Map(
        existingDocs
          .filter(doc => doc.oneDriveId)
          .map(doc => [doc.oneDriveId!, doc])
      );

      // Map des fichiers OneDrive trouvés
      const oneDriveFilesMap = new Map<string, any>();

      // PERF-3: Scanner toutes les catégories en parallèle
      const categoryPromises = categories.map(async (category) => {
        try {
          // ROBUST-2: Utiliser helper pour construire le path
          const categoryPath = buildAoCategoryPath(aoReference, category);
          const items = await oneDriveService.listItems(categoryPath);

          // Filtrer uniquement les fichiers (pas les dossiers)
          const files = items.filter(item => 'size' in item && !item.deleted);

          return { category, files, error: null };
        } catch (error: any) {
          if (error.message?.includes('404')) {
            // Dossier n'existe pas encore, normal
            logger.debug('[DocumentSyncService] Catégorie non trouvée', {
              metadata: { aoId, category }
            });
            return { category, files: [], error: null };
          } else {
            return { category, files: [], error: error.message };
          }
        }
      });

      // Attendre toutes les catégories en parallèle
      const categoryResults = await Promise.all(categoryPromises);

      // Agréger les résultats (ROBUST-3: Error handling granulaire)
      for (const { category, files, error } of categoryResults) {
        result.categoriesScanned++;
        if (error) {
          result.categoriesFailed++;
          result.errors.push({
            type: 'category_scan',
            category,
            message: error,
            originalError: error
          });
          logger.warn('[DocumentSyncService] Erreur scan catégorie', {
            metadata: { aoId, aoReference, category, error }
          });
        }
        for (const file of files) {
          oneDriveFilesMap.set(file.id, { ...file, category });
        }
      }

      logger.info('[DocumentSyncService] Scan OneDrive terminé', {
        metadata: {
          aoId,
          categories: categories.length,
          filesFound: oneDriveFilesMap.size
        }
      });

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
                aoId, // ✅ Association AO stockée dans metadata pour getDocumentsByEntity
                aoReference,
                syncSource: 'onedrive-sync'
              },
              oneDriveId: fileData.id,
              oneDrivePath: `${basePath}/${fileData.category}/${fileData.name}`,
              oneDriveUrl: fileData.webUrl,
              syncedFromOneDrive: true,
              lastSyncedAt: new Date()
            });
            result.documentsAdded++;
            logger.debug('[DocumentSyncService] Document ajouté', {
              metadata: { aoId, documentName: fileData.name, category: fileData.category }
            });
          } catch (error: any) {
            // ROBUST-3: Error typing et logging détaillé
            result.errors.push({
              type: 'document_create',
              category: fileData.category,
              documentName: fileData.name,
              message: error.message || String(error),
              originalError: error
            });
            logger.error('[DocumentSyncService] Erreur création document', {
              metadata: { aoId, documentName: fileData.name, error: error.message }
            });
          }
        } else {
          // ✅ Mettre à jour les métadonnées (nom, path, url, category, filePath) + lastSyncedAt
          const existingDoc = existingDocsMap.get(oneDriveId)!;
          const currentMetadata = (existingDoc.metadata as any) || {};
          const needsBackfill = !currentMetadata.aoId; // Documents synchro avant la correction aoId
          const needsUpdate = 
            existingDoc.name !== fileData.name ||
            existingDoc.oneDrivePath !== `${basePath}/${fileData.category}/${fileData.name}` ||
            existingDoc.oneDriveUrl !== fileData.webUrl ||
            existingDoc.filePath !== `onedrive/${aoReference}/${fileData.category}/${fileData.name}` ||
            existingDoc.category !== fileData.category;

          try {
            await this.storage.updateDocument(existingDoc.id, {
              name: fileData.name,
              originalName: fileData.name,
              filePath: `onedrive/${aoReference}/${fileData.category}/${fileData.name}`,
              category: fileData.category as any,
              oneDrivePath: `${basePath}/${fileData.category}/${fileData.name}`,
              oneDriveUrl: fileData.webUrl,
              metadata: {
                ...currentMetadata,
                aoId, // ✅ Backfill aoId manquant dans metadata pour documents legacy
                aoReference
              },
              lastSyncedAt: new Date()
            });
            if (needsBackfill) {
              logger.info('[DocumentSyncService] Backfill aoId effectué', {
                metadata: { documentId: existingDoc.id, aoId }
              });
            }
            if (needsUpdate) {
              logger.info('[DocumentSyncService] Métadonnées mises à jour', {
                metadata: { 
                  documentId: existingDoc.id, 
                  oldName: existingDoc.name, 
                  newName: fileData.name,
                  oldCategory: existingDoc.category,
                  newCategory: fileData.category
                }
              });
            }
            result.documentsUpdated++;
          } catch (error: any) {
            // ROBUST-3: Error typing et logging détaillé
            result.errors.push({
              type: 'document_update',
              category: fileData.category,
              documentName: fileData.name,
              message: error.message || String(error),
              originalError: error
            });
            logger.error('[DocumentSyncService] Erreur mise à jour document', {
              metadata: { aoId, documentId: existingDoc.id, documentName: fileData.name, error: error.message }
            });
          }
        }
      }

      // Marquer comme supprimés les documents qui ne sont plus dans OneDrive
      for (const [oneDriveId, doc] of Array.from(existingDocsMap.entries())) {
        if (!oneDriveFilesMap.has(oneDriveId)) {
          try {
            await this.storage.deleteDocument(doc.id);
            result.documentsDeleted++;
            logger.debug('[DocumentSyncService] Document supprimé', {
              metadata: { aoId, documentId: doc.id, documentName: doc.name }
            });
          } catch (error: any) {
            // ROBUST-3: Error typing et logging détaillé
            result.errors.push({
              type: 'document_delete',
              documentName: doc.name,
              message: error.message || String(error),
              originalError: error
            });
            logger.error('[DocumentSyncService] Erreur suppression document', {
              metadata: { aoId, documentId: doc.id, documentName: doc.name, error: error.message }
            });
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
      // ROBUST-3: Error typing pour erreur globale
      result.errors.push({
        type: 'unknown',
        message: `Erreur globale de synchronisation: ${error.message || String(error)}`,
        originalError: error
      });
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
