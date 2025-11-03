import { oneDriveService, type OneDriveFile } from './OneDriveService';
import type { IStorage } from '../storage-poc';
import { logger } from '../utils/logger';
import type { EventBus } from '../eventBus';

export interface SyncOptions {
  basePath?: string; // Chemin de base sur OneDrive
  recursive?: boolean; // Scanner récursivement les sous-dossiers
  aoFoldersOnly?: boolean; // Synchroniser uniquement les dossiers AO
  userId: string; // ID de l'utilisateur qui déclenche la sync
}

export interface SyncResult {
  success: boolean;
  filesScanned: number;
  filesImported: number;
  filesUpdated: number;
  filesSkipped: number;
  errors: string[];
  duration: number;
}

export class OneDriveSyncService {
  private storage: IStorage;
  private eventBus?: EventBus;
  
  // Chemin par défaut pour les dossiers AO selon la documentation
  private readonly DEFAULT_AO_PATH = 'OneDrive-JLM/01 - ETUDES AO - Documents';

  constructor(storage: IStorage, eventBus?: EventBus) {
    this.storage = storage;
    this.eventBus = eventBus;
    logger.info('OneDriveSyncService initialized');
  }

  /**
   * Synchronise les documents depuis OneDrive
   */
  async syncDocuments(options: SyncOptions): Promise<SyncResult> {
    const startTime = Date.now();
    const result: SyncResult = {
      success: false,
      filesScanned: 0,
      filesImported: 0,
      filesUpdated: 0,
      filesSkipped: 0,
      errors: [],
      duration: 0
    };

    try {
      const basePath = options.basePath || this.DEFAULT_AO_PATH;
      
      logger.info('Starting OneDrive synchronization', {
        metadata: { basePath, recursive: options.recursive, userId: options.userId }
      });

      // Scanner le dossier OneDrive
      const files = await this.scanFolder(basePath, options.recursive || false);
      result.filesScanned = files.length;

      logger.info('Files scanned from OneDrive', {
        metadata: { count: files.length, path: basePath }
      });

      // Importer ou mettre à jour chaque fichier
      for (const file of files) {
        try {
          const imported = await this.importFile(file, options.userId);
          
          if (imported === 'imported') {
            result.filesImported++;
          } else if (imported === 'updated') {
            result.filesUpdated++;
          } else {
            result.filesSkipped++;
          }
        } catch (error) {
          logger.error('Failed to import file from OneDrive', error as Error, {
            metadata: { fileName: file.name, fileId: file.id }
          });
          result.errors.push(`${file.name}: ${(error as Error).message}`);
        }
      }

      result.success = result.errors.length === 0;
      result.duration = Date.now() - startTime;

      logger.info('OneDrive synchronization completed', {
        metadata: {
          filesScanned: result.filesScanned,
          filesImported: result.filesImported,
          filesUpdated: result.filesUpdated,
          filesSkipped: result.filesSkipped,
          errors: result.errors.length,
          duration: result.duration
        }
      });

      // Émettre un événement de synchronisation
      if (this.eventBus) {
        this.eventBus.emit('ONEDRIVE_SYNC_COMPLETED', {
          userId: options.userId,
          result
        });
      }

      return result;
    } catch (error) {
      logger.error('OneDrive synchronization failed', error as Error);
      result.success = false;
      result.errors.push((error as Error).message);
      result.duration = Date.now() - startTime;
      return result;
    }
  }

  /**
   * Scanner récursivement un dossier OneDrive
   */
  private async scanFolder(path: string, recursive: boolean): Promise<OneDriveFile[]> {
    const allFiles: OneDriveFile[] = [];

    try {
      const items = await oneDriveService.listItems(path);

      for (const item of items) {
        if ('itemCount' in item) {
          // C'est un dossier (OneDriveFolder a itemCount)
          // Si récursif, scanner le sous-dossier
          if (recursive) {
            const subPath = path ? `${path}/${item.name}` : item.name;
            const subFiles = await this.scanFolder(subPath, recursive);
            allFiles.push(...subFiles);
          }
        } else {
          // C'est un fichier, l'ajouter à la liste
          allFiles.push(item as OneDriveFile);
        }
      }

      return allFiles;
    } catch (error) {
      logger.error('Failed to scan OneDrive folder', error as Error, {
        metadata: { path }
      });
      throw error;
    }
  }

  /**
   * Importer un fichier depuis OneDrive dans la base de données
   */
  private async importFile(file: OneDriveFile, userId: string): Promise<'imported' | 'updated' | 'skipped'> {
    try {
      // Vérifier si le fichier existe déjà (par oneDriveId)
      const existingDocs = await this.storage.getAllDocuments();
      const existingDoc = existingDocs.find((doc: any) => doc.oneDriveId === file.id);

      // Déterminer la catégorie du document basée sur son extension
      const category = this.categorizeFile(file.name);

      if (existingDoc) {
        // Vérifier si le fichier a été modifié
        const lastModified = new Date(file.lastModifiedDateTime);
        const lastSynced = existingDoc.lastSyncedAt ? new Date(existingDoc.lastSyncedAt) : new Date(0);

        if (lastModified <= lastSynced) {
          // Fichier non modifié, skip
          return 'skipped';
        }

        // Mettre à jour le document existant
        await this.storage.updateDocument(existingDoc.id, {
          name: file.name,
          fileSize: file.size,
          oneDriveUrl: file.webUrl,
          lastSyncedAt: new Date(),
          updatedAt: new Date()
        });

        logger.info('Document updated from OneDrive', {
          metadata: { documentId: existingDoc.id, fileName: file.name }
        });

        return 'updated';
      } else {
        // Créer un nouveau document
        const newDoc = await this.storage.createDocument({
          name: file.name,
          originalName: file.name,
          category,
          filePath: file.webUrl, // Utiliser l'URL OneDrive comme filePath
          mimeType: file.mimeType,
          fileSize: file.size,
          uploadedBy: userId,
          oneDriveId: file.id,
          oneDrivePath: file.parentPath,
          oneDriveUrl: file.webUrl,
          syncedFromOneDrive: true,
          lastSyncedAt: new Date()
        });

        logger.info('Document imported from OneDrive', {
          metadata: { documentId: newDoc.id, fileName: file.name }
        });

        // Émettre un événement de création de document
        if (this.eventBus) {
          this.eventBus.emit('DOCUMENT_CREATED', {
            documentId: newDoc.id,
            userId,
            source: 'onedrive_sync'
          });
        }

        return 'imported';
      }
    } catch (error) {
      logger.error('Failed to import OneDrive file', error as Error, {
        metadata: { fileName: file.name, fileId: file.id }
      });
      throw error;
    }
  }

  /**
   * Catégoriser un fichier basé sur son extension
   */
  private categorizeFile(fileName: string): 'ao_pdf' | 'cctp' | 'plans' | 'autre' {
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    const nameLowerCase = fileName.toLowerCase();

    // Patterns de détection
    if (nameLowerCase.includes('cctp') || nameLowerCase.includes('cahier')) {
      return 'cctp';
    }

    if (nameLowerCase.includes('plan') || extension === 'dwg' || extension === 'dxf') {
      return 'plans';
    }

    if (extension === 'pdf') {
      return 'ao_pdf';
    }

    return 'autre';
  }

  /**
   * Associer automatiquement les documents synchronisés aux AO
   */
  async linkDocumentsToAOs(aoFolderPattern?: RegExp): Promise<number> {
    let linkedCount = 0;

    try {
      // Récupérer tous les documents synchronisés depuis OneDrive non liés
      const documents = await this.storage.getAllDocuments();
      const oneDriveDocs = documents.filter((doc: any) => 
        doc.syncedFromOneDrive && doc.oneDrivePath
      );

      // Récupérer tous les AO
      const aos = await this.storage.getAllAOs();

      for (const doc of oneDriveDocs) {
        // Essayer de trouver un AO correspondant basé sur le chemin du fichier
        const matchedAO = this.findMatchingAO(doc.oneDrivePath, aos);

        if (matchedAO) {
          // Créer le lien document-AO
          // Note: Cela nécessiterait une méthode dans le storage pour créer des documentLinks
          // Pour l'instant, on logue juste l'association potentielle
          logger.info('Potential document-AO link found', {
            metadata: {
              documentId: doc.id,
              aoId: matchedAO.id,
              fileName: doc.name,
              aoReference: matchedAO.reference
            }
          });
          linkedCount++;
        }
      }

      return linkedCount;
    } catch (error) {
      logger.error('Failed to link documents to AOs', error as Error);
      throw error;
    }
  }

  /**
   * Trouver un AO correspondant basé sur le chemin du fichier
   */
  private findMatchingAO(filePath: string, aos: any[]): any | null {
    // Logique simple: chercher la référence de l'AO dans le chemin du fichier
    for (const ao of aos) {
      if (ao.reference && filePath.includes(ao.reference)) {
        return ao;
      }
      
      // Essayer aussi avec le nom de l'AO
      if (ao.name && filePath.includes(ao.name)) {
        return ao;
      }
    }

    return null;
  }

  /**
   * Synchroniser un dossier spécifique d'AO
   */
  async syncAOFolder(aoReference: string, userId: string): Promise<SyncResult> {
    const aoPath = `${this.DEFAULT_AO_PATH}/01 - AO EN COURS/${aoReference}`;
    
    return await this.syncDocuments({
      basePath: aoPath,
      recursive: true,
      aoFoldersOnly: true,
      userId
    });
  }
}

// Export singleton instance (nécessite storage et eventBus à l'initialisation)
let syncServiceInstance: OneDriveSyncService | null = null;

export function getOneDriveSyncService(storage: IStorage, eventBus?: EventBus): OneDriveSyncService {
  if (!syncServiceInstance) {
    syncServiceInstance = new OneDriveSyncService(storage, eventBus);
  }
  return syncServiceInstance;
}
