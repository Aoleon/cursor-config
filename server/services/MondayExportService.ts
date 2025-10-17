import { MondayService, mondayService } from './MondayService';
import { IStorage, storage } from '../storage';
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
      service: 'MondayExportService',
      metadata: {
        operation: 'exportProject',
        projectId,
        correlationId
      }
    });

    // Récupérer le projet
    const project = await this.storage.getProject(projectId);
    
    if (!project) {
      const error = new Error(`Project ${projectId} not found`);
      logger.error('[MondayExportService] Projet non trouvé', {
        service: 'MondayExportService',
        metadata: {
          operation: 'exportProject',
          projectId,
          correlationId
        }
      });
      throw error;
    }

    // Vérifier si déjà exporté (idempotence)
    if (project.mondayId) {
      logger.info('[MondayExportService] Projet déjà exporté', {
        service: 'MondayExportService',
        metadata: {
          operation: 'exportProject',
          projectId,
          mondayId: project.mondayId,
          correlationId
        }
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
    const columnValues: Record<string, any> = {};
    
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
          service: 'MondayExportService',
          metadata: {
            operation: 'exportProject.createItem',
            projectId,
            projectName: project.name,
            correlationId
          }
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
        service: 'MondayExportService',
        metadata: {
          operation: 'exportProject',
          projectId,
          correlationId,
          error: error.message
        }
      });
      throw error;
    }

    // Mettre à jour le projet avec l'ID Monday
    await this.storage.updateProjectMondayId(projectId, mondayItem.id);
    
    logger.info('[MondayExportService] Projet exporté avec succès', {
      service: 'MondayExportService',
      metadata: {
        operation: 'exportProject',
        projectId,
        mondayId: mondayItem.id,
        correlationId
      }
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
      service: 'MondayExportService',
      metadata: {
        operation: 'exportAO',
        aoId,
        correlationId
      }
    });

    // Récupérer l'AO
    const ao = await this.storage.getAo(aoId);
    
    if (!ao) {
      const error = new Error(`AO ${aoId} not found`);
      logger.error('[MondayExportService] AO non trouvé', {
        service: 'MondayExportService',
        metadata: {
          operation: 'exportAO',
          aoId,
          correlationId
        }
      });
      throw error;
    }

    // Vérifier si déjà exporté (idempotence)
    if (ao.mondayId) {
      logger.info('[MondayExportService] AO déjà exporté', {
        service: 'MondayExportService',
        metadata: {
          operation: 'exportAO',
          aoId,
          mondayId: ao.mondayId,
          correlationId
        }
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
    const columnValues: Record<string, any> = {};
    
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
          service: 'MondayExportService',
          metadata: {
            operation: 'exportAO.createItem',
            aoId,
            aoReference: ao.reference,
            correlationId
          }
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
        service: 'MondayExportService',
        metadata: {
          operation: 'exportAO',
          aoId,
          correlationId,
          error: error.message
        }
      });
      throw error;
    }

    // Mettre à jour l'AO avec l'ID Monday
    await this.storage.updateAOMondayId(aoId, mondayItem.id);
    
    logger.info('[MondayExportService] AO exporté avec succès', {
      service: 'MondayExportService',
      metadata: {
        operation: 'exportAO',
        aoId,
        mondayId: mondayItem.id,
        correlationId
      }
    });
    
    return mondayItem.id;
  }
}

// Export singleton instance
export const mondayExportService = new MondayExportService(storage, mondayService);
