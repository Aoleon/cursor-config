import { MondayIntegrationService } from './consolidated/MondayIntegrationService';
import type { IStorage } from '../storage';
import { storage } from '../storage';
import { logger } from '../utils/logger';
import { getCorrelationId } from '../middleware/correlation';
import { withRetry } from '../utils/retry-helper';

export class MondayExportService {
  constructor(
    private storage: IStorage,
    private mondayService: MondayService
  ) {}
  
  /**
   * Export un projet vers Monday.com
   * Idempotent: retourne l'ID Monday existant si déjà exporté
   */
  async exportProject(projectId: string): Promise<string> {
    const correlationId = getCorrelationId();
    
    logger.info('[MondayExportService] Début export projet', {
      metadata: {
        module: 'MondayExportService', {
        operation: 'exportProject',
        projectId,
        correlationId

          });

    // Récupérer le projet
    const project = await this.storage.getProject(projectId);
    
    if (!project) {
      const error = new Error(`Project ${projectId} not found`);
      logger.error('[MondayExportService] Projet non trouvé', {
      metadata: {
        module: 'MondayExportService', {
          operation: 'exportProject',
          projectId,
          correlationId

            });
      throw error;
    }

    // Vérifier si déjà exporté (idempotence)
    if (project.mondayId) {
      logger.info('[MondayExportService] Projet déjà exporté', {
      metadata: {
        module: 'MondayExportService', {
          operation: 'exportProject',
          projectId,
          mondayId: project.mondayId,
          correlationId

            });
      return project.mondayId;
    }
    
    // Mutation GraphQL pour créer un item Monday.com
    const mutation = `
      mutation CreateItem($boardId: ID!, $itemName: String!, $columnValues: JSON) {
        create_item(board_id: $boardId, item_name: $itemName, column_values: $columnValues) {
          id
        }
      }
    `;
    
    // Préparer les valeurs des colonnes Monday.com
    const columnValues: Record<string, unknown> = {};
    
    if (project.status) {
      columnValues.status = { label: project.status };
    }
    
    if (project.startDate) {
      columnValues.date = project.startDate.toISOString().split('T')[0];
    }
    
    if (project.location) {
      columnValues.location = project.location;
    }
    
    if (project.client) {
      columnValues.client = project.client;
    }
    
    if (project.budget) {
      columnValues.budget = Number(project.budget);
    }

    // Exécuter la mutation avec retry automatique
    const mondayItem = await withRetry(
      async () => {
        logger.info('[MondayExportService] Création item Monday', {
      metadata: {
        module: 'MondayExportService', {
                operation: 'exportProject.createItem',
            projectId,
            projectName: project.name,
            correlationId

              });

        const result = await this.mondayService.executeQuery(mutation, {
          boardId: process.env.MONDAY_PROJECTS_BOARD_ID || '123456',
          itemName: project.name,
          columnValues: JSON.stringify(columnValues)
        });
        
        return result.create_item;
      },
      { 
        maxRetries: 3,
        initialDelay: 1000,
        backoffMultiplier: 2
      }
    );
    
    if (!mondayItem || !mondayItem.id) {
      const error = new Error('Monday.com item creation failed - no ID returned');
      logger.error('[MondayExportService] Échec création item', {
      metadata: {
        module: 'MondayExportService', {
          operation: 'exportProject',
          projectId,
          correlationId,
          error: error.message

            });
      throw error;
    }

    // Mettre à jour le projet avec l'ID Monday
    await this.storage.updateProjectMondayId(projectId, mondayItem.id);
    
    logger.info('[MondayExportService] Projet exporté avec succès', {
      metadata: {
        module: 'MondayExportService', {
        operation: 'exportProject',
        projectId,
        mondayId: mondayItem.id,
        correlationId

          });
    
    return mondayItem.id;
  }
  
  /**
   * Export un AO vers Monday.com
   * Idempotent: retourne l'ID Monday existant si déjà exporté
   */
  async exportAO(aoId: string): Promise<string> {
    const correlationId = getCorrelationId();
    
    logger.info('[MondayExportService] Début export AO', {
      metadata: {
        module: 'MondayExportService', {
        operation: 'exportAO',
        aoId,
        correlationId

          });

    // Récupérer l'AO
    const ao = await this.storage.getAo(aoId);
    
    if (!ao) {
      const error = new Error(`AO ${aoId} not found`);
      logger.error('[MondayExportService] AO non trouvé', {
      metadata: {
        module: 'MondayExportService', {
          operation: 'exportAO',
          aoId,
          correlationId

            });
      throw error;
    }

    // Vérifier si déjà exporté (idempotence)
    if (ao.mondayId) {
      logger.info('[MondayExportService] AO déjà exporté', {
      metadata: {
        module: 'MondayExportService', {
          operation: 'exportAO',
          aoId,
          mondayId: ao.mondayId,
          correlationId

            });
      return ao.mondayId;
    }
    
    // Mutation GraphQL pour créer un item Monday.com
    const mutation = `
      mutation CreateItem($boardId: ID!, $itemName: String!, $columnValues: JSON) {
        create_item(board_id: $boardId, item_name: $itemName, column_values: $columnValues) {
          id
        }
      }
    `;
    
    // Préparer les valeurs des colonnes Monday.com
    const columnValues: Record<st, unknown> = {};
    
    if (ao.status) {
      columnValues.status = { label: ao.status };
    }
    
    if (ao.dateLimiteRemise) {
      columnValues.due_date = ao.dateLimiteRemise.toISOString().split('T')[0];
    }
    
    if (ao.location) {
      columnValues.location = ao.location;
    }
    
    if (ao.client) {
      columnValues.client = ao.client;
    }
    
    if (ao.montantEstime) {
      columnValues.amount = Number(ao.montantEstime);
    }
    
    if (ao.menuiserieType) {
      columnValues.type = ao.menuiserieType;
    }

    // Exécuter la mutation avec retry automatique
    const mondayItem = await withRetry(
      async () => {
        logger.info('[MondayExportService] Création item Monday pour AO', {
      metadata: {
        module: 'MondayExportService', {
                operation: 'exportAO.createItem',
            aoId,
            aoReference: ao.reference,
            correlationId

              });

        const result = await this.mondayService.executeQuery(mutation, {
          boardId: process.env.MONDAY_AOS_BOARD_ID || '789012',
          itemName: `${ao.reference} - ${ao.client || 'Client'}`,
          columnValues: JSON.stringify(columnValues)
        });
        
        return result.create_item;
      },
      { 
        maxRetries: 3,
        initialDelay: 1000,
        backoffMultiplier: 2
      }
    );
    
    if (!mondayItem || !mondayItem.id) {
      const error = new Error('Monday.com item creation failed - no ID returned');
      logger.error('[MondayExportService] Échec création item AO', {
      metadata: {
        module: 'MondayExportService', {
          operation: 'exportAO',
          aoId,
          correlationId,
          error: error.message

            });
      throw error;
    }

    // Mettre à jour l'AO avec l'ID Monday
    await this.storage.updateAOMondayId(aoId, mondayItem.id);
    
    logger.info('[MondayExportService] AO exporté avec succès', {
      metadata: {
        module: 'MondayExportService', {
        operation: 'exportAO',
        aoId,
        mondayId: mondayItem.id,
        correlationId

          });
    
    return mondayItem.id;
  }

  /**
   * Met à jour les colonnes d'un item Monday.com existant
   * Utile pour synchroniser les données Saxium → Monday.com
   * 
   * @param boardId - ID du board Monday.com
   * @param itemId - ID de l'item Monday.com à mettre à jour
   * @param columnValues - Colonnes à mettre à jour { columnId: value }
   * @returns ID de l'item mis à jour
   */
  async updateItemColumns(
    boardId: string,
    itemId: string,
    columnValues: Recor, unknown>unknown>unknown>
  ): Promise<string> {
    const correlationId = getCorrelationId();
    
    logger.info('[MondayExportService] Début mise à jour colonnes item', {
      metadata: {
        module: 'MondayExportService', {
        operation: 'updateItemColumns',
        boardId,
        itemId,
        columnsCount: Object.keys(columnValues).length,
        correlationId

          });

    // Mutation GraphQL pour mettre à jour plusieurs colonnes
    const mutation = `
      mutation ChangeMultipleColumnValues($boardId: ID!, $itemId: ID!, $columnValues: JSON!) {
        change_multiple_column_values(board_id: $boardId, item_id: $itemId, column_values: $columnValues) {
          id
        }
      }
    `;

    // Exécuter la mutation avec retry automatique
    const result = await withRetry(
      async () => {
        logger.debug('[MondayExportService] Exécution mutation change_multiple_column_values', {
      metadata: {
        module: 'MondayExportService', {
                operation: 'updateItemColumns.mutation',
            boardId,
            itemId,
            columnValues,
            correlationId

              });

        const response = await this.mondayService.executeQuery(mutation, {
          boardId,
          itemId,
          columnValues: JSON.stringify(columnValues)
        });
        
        return response.change_multiple_column_values;
      },
      { 
        maxRetries: 3,
        initialDelay: 1000,
        backoffMultiplier: 2
      }
    );
    
    if (!result || !result.id) {
      const error = new Error('Monday.com column update failed - no ID returned');
      logger.error('[MondayExportService] Échec mise à jour colonnes', {
      metadata: {
        module: 'MondayExportService', {
          operation: 'updateItemColumns',
          boardId,
          itemId,
          correlationId,
          error: error.message

            });
      throw error;
    }

    logger.info('[MondayExportService] Colonnes mises à jour avec succès', {
      metadata: {
        module: 'MondayExportService', {
        operation: 'updateItemColumns',
        boardId,
        itemId,
        mondayId: result.id,
        columnsUpdated: Object.keys(columnValues),
        correlationId

          });
    
    return result.id;
  }

  /**
   * Synchronise les 3 nouveaux champs AO depuis Saxium vers Monday.com
   * - dateLivraisonPrevue → date_mkpcfgja (Date Métrés)
   * - dateOS → date__1 (Date Accord)
   * - cctp → long_text_mkx4zgjd (Commentaire sélection)
   * 
   * @param aoId - ID de l'AO Saxium
   * @returns ID de l'item Monday.com mis à jour
   */
  async syncAONewFields(aoId: string): Promise<string | null> {
    const correlationId = getCorrelationId();
    const BOARD_ID = '3946257560'; // AO Planning 🖥️
    
    logger.info('[MondayExportService] Début sync nouveaux champs AO', {
      metadata: {
        module: 'MondayExportService', {
        operation: 'syncAONewFields',
        aoId,
        correlationId

          });

    // Récupérer l'AO
    const ao = await this.storage.getAo(aoId);
    
    if (!ao) {
      logger.warn('[MondayExportService] AO non trouvé', {
      metadata: {
        module: 'MondayExportService', {
          operation: 'syncAONewFields',
          aoId,
          correlationId

            });
      return null;
    }

    // Vérifier qu'on a bien un mondayId
    if (!ao.mondayId) {
      logger.warn('[MondayExportService] AO sans mondayId - impossible de synchroniser', {
      metadata: {
        module: 'MondayExportService', {
          operation: 'syncAONewFields',
          aoId,
          reference: ao.reference,
          correlationId

            });
      return null;
    }

    // Préparer les valeurs des 3 nouvelles colonnes Monday.com
    const columnValues: Record<string, unknown> = {};
    
    // dateLivraisonPrevue → date_mkpcfgja (Date Métrés)
    if (ao.dateLivraisonPrevue) {
      columnValues.date_mkpcfgja = ao.dateLivraisonPrevue.toISOString().split('T')[0];
      logger.debug('[MondayExportService] Ajout dateLivraisonPrevue', {
      metadata: {
        module: 'MondayExportService', {
          operation: 'syncAONewFields',
          aoId,
          value: columnValues.date_mkpcfgja

            });
    }
    
    // dateOS → date__1 (Date Accord)
    if (ao.dateOS) {
      columnValues.date__1 = ao.dateOS.toISOString().split('T')[0];
      logger.debug('[MondayExportService] Ajout dateOS', {
      metadata: {
        module: 'MondayExportService', {
          operation: 'syncAONewFields',
          aoId,
          value: columnValues.date__1

            });
    }
    
    // cctp → long_text_mkx4zgjd (Commentaire sélection)
    if (ao.cctp) {
      columnValues.long_text_mkx4zgjd = ao.cctp;
      logger.debug('[MondayExportService] Ajout cctp', {
      metadata: {
        module: 'MondayExportService', {
          operation: 'syncAONewFields',
          aoId,
          length: ao.cctp.length

            });
    }

    // Si aucun champ à synchroniser, skip
    if (Object.keys(columnValues).length === 0) {
      logger.info('[MondayExportService] Aucun nouveau champ à synchroniser', {
      metadata: {
        module: 'MondayExportService', {
          operation: 'syncAONewFields',
          aoId,
          mondayId: ao.mondayId,
          correlationId

            });
      return ao.mondayId;
    }

    // Mettre à jour les colonnes Monday.com
    await this.updateItemColumns(BOARD_ID, ao.mondayId, columnValues);
    
    logger.info('[MondayExportService] Nouveaux champs AO synchronisés avec succès', {
      metadata: {
        module: 'MondayExportService', {
        operation: 'syncAONewFields',
        aoId,
        mondayId: ao.mondayId,
        syncedFields: Object.keys(columnValues),
        correlationId

          });
    
    return ao.mondayId;
  }
}

// Export singleton instance
export const mondayExportService = mondaydataService(storage, mondayService);
