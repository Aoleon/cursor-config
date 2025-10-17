import { mondayService, MondayItem, ImportMapping, ImportResult } from './MondayService';
import { storage } from '../storage-poc';
import { logger } from '../utils/logger';
import { eventBus } from '../eventBus';
import { EventType } from '../../shared/events';
import { 
  InsertProject, 
  InsertAo, 
  InsertSupplier, 
  InsertProjectTask 
} from '../../shared/schema';

export class MondayImportService {
  
  async importBoardAsProjects(
    boardId: string, 
    mapping: ImportMapping
  ): Promise<ImportResult> {
    const result: ImportResult = {
      success: true,
      importedCount: 0,
      errors: [],
      createdIds: []
    };

    try {
      logger.info('Démarrage import Monday board vers Projets', {
        service: 'MondayImportService',
        metadata: {
          operation: 'importBoardAsProjects',
          boardId,
          mappingCount: mapping.columnMappings.length
        }
      });

      const boardData = await mondayService.getBoardData(boardId);
      const items = boardData.items;

      for (const item of items) {
        try {
          const projectData = this.mapItemToProject(item, mapping);
          
          if (!projectData.name) {
            result.errors.push(`Item ${item.id}: nom manquant`);
            continue;
          }

          const project = await storage.createProject(projectData);
          result.importedCount++;
          result.createdIds.push(project.id);

          eventBus.publish({
            id: crypto.randomUUID(),
            type: EventType.PROJECT_CREATED,
            entity: 'project',
            entityId: project.id,
            message: `Projet "${project.name}" importé depuis Monday.com`,
            severity: 'success',
            affectedQueryKeys: [['/api/projects']],
            userId: 'monday-import',
            timestamp: new Date().toISOString(),
            metadata: {
              source: 'monday.com',
              mondayItemId: item.id,
              boardId
            }
          });

          logger.info('Projet créé depuis Monday', {
            service: 'MondayImportService',
            metadata: {
              operation: 'importBoardAsProjects',
              projectId: project.id,
              mondayItemId: item.id
            }
          });
        } catch (error: any) {
          result.errors.push(`Item ${item.id}: ${error.message}`);
          result.success = false;
        }
      }

      logger.info('Import Monday terminé', {
        service: 'MondayImportService',
        metadata: {
          operation: 'importBoardAsProjects',
          importedCount: result.importedCount,
          errorCount: result.errors.length
        }
      });

      return result;
    } catch (error: any) {
      logger.error('Erreur import Monday', {
        service: 'MondayImportService',
        metadata: {
          operation: 'importBoardAsProjects',
          error: error.message
        }
      });

      result.success = false;
      result.errors.push(error.message);
      return result;
    }
  }

  async importBoardAsAOs(
    boardId: string, 
    mapping: ImportMapping
  ): Promise<ImportResult> {
    const result: ImportResult = {
      success: true,
      importedCount: 0,
      errors: [],
      createdIds: []
    };

    try {
      logger.info('Démarrage import Monday board vers AOs', {
        service: 'MondayImportService',
        metadata: {
          operation: 'importBoardAsAOs',
          boardId
        }
      });

      const boardData = await mondayService.getBoardData(boardId);
      const items = boardData.items;

      for (const item of items) {
        try {
          const aoData = this.mapItemToAO(item, mapping);
          
          if (!aoData.reference) {
            result.errors.push(`Item ${item.id}: référence manquante`);
            continue;
          }

          const ao = await storage.createAo(aoData);
          result.importedCount++;
          result.createdIds.push(ao.id);

          eventBus.publish({
            id: crypto.randomUUID(),
            type: EventType.OFFER_CREATED,
            entity: 'offer',
            entityId: ao.id,
            message: `AO "${ao.reference}" importé depuis Monday.com`,
            severity: 'success',
            affectedQueryKeys: [['/api/aos']],
            userId: 'monday-import',
            timestamp: new Date().toISOString(),
            metadata: {
              source: 'monday.com',
              mondayItemId: item.id,
              boardId
            }
          });

          logger.info('AO créé depuis Monday', {
            service: 'MondayImportService',
            metadata: {
              operation: 'importBoardAsAOs',
              aoId: ao.id,
              mondayItemId: item.id
            }
          });
        } catch (error: any) {
          result.errors.push(`Item ${item.id}: ${error.message}`);
          result.success = false;
        }
      }

      return result;
    } catch (error: any) {
      logger.error('Erreur import Monday AOs', {
        service: 'MondayImportService',
        metadata: {
          operation: 'importBoardAsAOs',
          error: error.message
        }
      });

      result.success = false;
      result.errors.push(error.message);
      return result;
    }
  }

  async importBoardAsSuppliers(
    boardId: string, 
    mapping: ImportMapping
  ): Promise<ImportResult> {
    const result: ImportResult = {
      success: true,
      importedCount: 0,
      errors: [],
      createdIds: []
    };

    try {
      logger.info('Démarrage import Monday board vers Fournisseurs', {
        service: 'MondayImportService',
        metadata: {
          operation: 'importBoardAsSuppliers',
          boardId
        }
      });

      const boardData = await mondayService.getBoardData(boardId);
      const items = boardData.items;

      for (const item of items) {
        try {
          const supplierData = this.mapItemToSupplier(item, mapping);
          
          if (!supplierData.name) {
            result.errors.push(`Item ${item.id}: nom fournisseur manquant`);
            continue;
          }

          const supplier = await storage.createSupplier(supplierData);
          result.importedCount++;
          result.createdIds.push(supplier.id);

          logger.info('Fournisseur créé depuis Monday', {
            service: 'MondayImportService',
            metadata: {
              operation: 'importBoardAsSuppliers',
              supplierId: supplier.id,
              mondayItemId: item.id
            }
          });
        } catch (error: any) {
          result.errors.push(`Item ${item.id}: ${error.message}`);
          result.success = false;
        }
      }

      return result;
    } catch (error: any) {
      logger.error('Erreur import Monday Fournisseurs', {
        service: 'MondayImportService',
        metadata: {
          operation: 'importBoardAsSuppliers',
          error: error.message
        }
      });

      result.success = false;
      result.errors.push(error.message);
      return result;
    }
  }

  private mapItemToProject(item: MondayItem, mapping: ImportMapping): InsertProject {
    const mappedData: any = {
      name: item.name
    };

    for (const columnMapping of mapping.columnMappings) {
      const columnValue = item.column_values.find(cv => cv.id === columnMapping.mondayColumnId);
      if (columnValue) {
        const value = mondayService.extractColumnValue(columnValue);
        mappedData[columnMapping.saxiumField] = value;
      }
    }

    // Ensure required fields
    return {
      name: mappedData.name || item.name,
      client: mappedData.client || 'Client importé Monday',
      location: mappedData.location || 'À définir',
      status: mappedData.status || 'passation',
      offerId: mappedData.offerId || null,
      description: mappedData.description || null,
      startDate: mappedData.startDate || null,
      endDate: mappedData.endDate || null,
      budget: mappedData.budget || null
    };
  }

  private mapItemToAO(item: MondayItem, mapping: ImportMapping): InsertAo {
    const mappedData: any = {
      reference: item.name
    };

    for (const columnMapping of mapping.columnMappings) {
      const columnValue = item.column_values.find(cv => cv.id === columnMapping.mondayColumnId);
      if (columnValue) {
        const value = mondayService.extractColumnValue(columnValue);
        mappedData[columnMapping.saxiumField] = value;
      }
    }

    // Ensure required fields with defaults
    return {
      reference: mappedData.reference || item.name,
      menuiserieType: mappedData.menuiserieType || 'fenetre',
      source: mappedData.source || 'other',
      client: mappedData.client || null,
      location: mappedData.location || null,
      departement: mappedData.departement || null,
      dateLimiteRemise: mappedData.dateLimiteRemise || null,
      typeMarche: mappedData.typeMarche || null,
      description: mappedData.description || null,
      montantEstime: mappedData.montantEstime || null,
      isDraft: false
    };
  }

  private mapItemToSupplier(item: MondayItem, mapping: ImportMapping): InsertSupplier {
    const mappedData: any = {
      name: item.name
    };

    for (const columnMapping of mapping.columnMappings) {
      const columnValue = item.column_values.find(cv => cv.id === columnMapping.mondayColumnId);
      if (columnValue) {
        const value = mondayService.extractColumnValue(columnValue);
        mappedData[columnMapping.saxiumField] = value;
      }
    }

    return {
      name: mappedData.name || item.name,
      email: mappedData.email || null,
      phone: mappedData.phone || null,
      address: mappedData.address || null,
      siret: mappedData.siret || null,
      specialties: mappedData.specialties || [],
      rating: mappedData.rating || null,
      notes: mappedData.notes || null
    };
  }

  async previewImport(boardId: string, targetEntity: string): Promise<{
    boardName: string;
    itemCount: number;
    columns: any[];
    suggestedMappings: any[];
  }> {
    const boardData = await mondayService.getBoardData(boardId);
    
    // Suggest column mappings based on column titles
    const suggestedMappings = this.suggestColumnMappings(
      boardData.columns,
      targetEntity as 'project' | 'ao' | 'supplier' | 'task'
    );

    logger.info('Preview import généré', {
      service: 'MondayImportService',
      metadata: {
        operation: 'previewImport',
        boardId,
        boardName: boardData.board.name,
        itemCount: boardData.items.length,
        columnCount: boardData.columns.length
      }
    });

    return {
      boardName: boardData.board.name,
      itemCount: boardData.items.length,
      columns: boardData.columns,
      suggestedMappings
    };
  }

  private suggestColumnMappings(
    columns: any[],
    targetEntity: 'project' | 'ao' | 'supplier' | 'task'
  ): any[] {
    const mappings: any[] = [];

    const mappingRules: Record<string, Record<string, string[]>> = {
      project: {
        name: ['nom', 'name', 'projet', 'project', 'titre', 'title'],
        description: ['description', 'desc', 'détails', 'details'],
        status: ['statut', 'status', 'état', 'state'],
        location: ['lieu', 'location', 'adresse', 'address', 'localisation'],
        startDate: ['début', 'start', 'date début', 'date_debut'],
        endDate: ['fin', 'end', 'date fin', 'date_fin'],
        budget: ['budget', 'montant', 'amount']
      },
      ao: {
        reference: ['référence', 'reference', 'ref', 'numero', 'number'],
        client: ['client', 'maître d\'ouvrage', 'mo'],
        location: ['lieu', 'location', 'adresse', 'address'],
        departement: ['département', 'departement', 'dept'],
        description: ['description', 'objet', 'desc'],
        montantEstime: ['montant', 'budget', 'amount', 'estimé']
      },
      supplier: {
        name: ['nom', 'name', 'fournisseur', 'supplier', 'raison sociale'],
        email: ['email', 'mail', 'e-mail'],
        phone: ['téléphone', 'telephone', 'phone', 'tel'],
        address: ['adresse', 'address'],
        siret: ['siret', 'siren']
      },
      task: {
        name: ['nom', 'name', 'tâche', 'task', 'titre'],
        description: ['description', 'desc', 'détails'],
        status: ['statut', 'status', 'état'],
        assignedUserId: ['assigné', 'assigned', 'responsable']
      }
    };

    const rules = mappingRules[targetEntity] || {};

    for (const column of columns) {
      const columnTitleLower = column.title.toLowerCase();

      for (const [saxiumField, keywords] of Object.entries(rules)) {
        if (keywords.some(keyword => columnTitleLower.includes(keyword))) {
          mappings.push({
            mondayColumnId: column.id,
            mondayColumnTitle: column.title,
            saxiumField,
            confidence: 'high'
          });
          break;
        }
      }
    }

    return mappings;
  }
}

export const mondayImportService = new MondayImportService();
