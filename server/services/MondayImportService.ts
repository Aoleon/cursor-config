import { mondayService, MondayItem, ImportMapping, ImportResult } from './MondayService';
import { storage } from '../storage-poc';
import { logger } from '../utils/logger';
import { eventBus } from '../eventBus';
import { EventType } from '../../shared/events';
import { 
  InsertProject, 
  InsertAo, 
  InsertSupplier, 
  InsertProjectTask,
  insertProjectSchema,
  insertAoSchema,
  insertSupplierSchema
} from '../../shared/schema';

export class MondayImportService {
  
  /**
   * Helper to convert all numeric decimal fields to strings for Postgres compatibility
   */
  private coerceDecimalToString(value: any): string | null {
    if (value === null || value === undefined) return null;
    return typeof value === 'number' ? value.toString() : value;
  }
  
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
          
          // Validate data with Zod schema
          const validation = insertProjectSchema.safeParse(projectData);
          if (!validation.success) {
            const errors = validation.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ');
            result.errors.push(`Item ${item.id}: Validation failed - ${errors}`);
            continue;
          }

          // Check if project already exists with this mondayItemId (upsert strategy)
          const existingProject = await storage.getProjectByMondayItemId(item.id);

          // Convert decimal fields back to string for Postgres (Zod transforms them to number)
          const dataForStorage = {
            ...validation.data,
            montantEstime: typeof validation.data.montantEstime === 'number' 
              ? validation.data.montantEstime.toString() 
              : validation.data.montantEstime,
            montantFinal: typeof (validation.data as any).montantFinal === 'number'
              ? (validation.data as any).montantFinal.toString()
              : (validation.data as any).montantFinal,
            budget: typeof (validation.data as any).budget === 'number'
              ? (validation.data as any).budget.toString()
              : (validation.data as any).budget
          };

          let project;
          if (existingProject) {
            // Update existing project
            project = await storage.updateProject(existingProject.id, dataForStorage);
            logger.info('Projet mis à jour depuis Monday', {
              service: 'MondayImportService',
              metadata: {
                operation: 'importBoardAsProjects',
                projectId: project.id,
                mondayItemId: item.id,
                action: 'update'
              }
            });
          } else {
            // Create new project
            project = await storage.createProject(dataForStorage);
          }
          
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
          
          // Validate data with Zod schema
          const validation = insertAoSchema.safeParse(aoData);
          if (!validation.success) {
            const errors = validation.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ');
            result.errors.push(`Item ${item.id}: Validation failed - ${errors}`);
            continue;
          }

          // Check if AO already exists with this mondayItemId (upsert strategy)
          const existingAo = await storage.getAOByMondayItemId(item.id);

          // Convert decimal fields back to string for Postgres (Zod transforms them to number)
          const dataForStorage = {
            ...validation.data,
            montantEstime: typeof validation.data.montantEstime === 'number' 
              ? validation.data.montantEstime.toString() 
              : validation.data.montantEstime,
            amountEstimate: typeof (validation.data as any).amountEstimate === 'number'
              ? (validation.data as any).amountEstimate.toString()
              : (validation.data as any).amountEstimate
          };

          let ao;
          if (existingAo) {
            // Update existing AO
            ao = await storage.updateAo(existingAo.id, dataForStorage);
            logger.info('AO mis à jour depuis Monday', {
              service: 'MondayImportService',
              metadata: {
                operation: 'importBoardAsAOs',
                aoId: ao.id,
                mondayItemId: item.id,
                action: 'update'
              }
            });
          } else {
            // Create new AO
            ao = await storage.createAo(dataForStorage);
          }

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
          
          // Validate data with Zod schema
          const validation = insertSupplierSchema.safeParse(supplierData);
          if (!validation.success) {
            const errors = validation.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ');
            result.errors.push(`Item ${item.id}: Validation failed - ${errors}`);
            continue;
          }

          // Check if Supplier already exists with this mondayItemId (upsert strategy)
          const existingSupplier = await storage.getSupplierByMondayItemId(item.id);

          let supplier;
          if (existingSupplier) {
            // Update existing Supplier
            supplier = await storage.updateSupplier(existingSupplier.id, validation.data);
            logger.info('Fournisseur mis à jour depuis Monday', {
              service: 'MondayImportService',
              metadata: {
                operation: 'importBoardAsSuppliers',
                supplierId: supplier.id,
                mondayItemId: item.id,
                action: 'update'
              }
            });
          } else {
            // Create new Supplier
            supplier = await storage.createSupplier(validation.data);
          }

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

    // Ensure required fields with coerced decimal strings
    return {
      name: mappedData.name || item.name,
      client: mappedData.client || 'Client importé Monday',
      location: mappedData.location || 'À définir',
      status: mappedData.status || 'passation',
      offerId: mappedData.offerId || null,
      description: mappedData.description || null,
      startDate: mappedData.startDate || null,
      endDate: mappedData.endDate || null,
      budget: this.coerceDecimalToString(mappedData.budget),
      montantEstime: this.coerceDecimalToString(mappedData.montantEstime),
      montantFinal: this.coerceDecimalToString(mappedData.montantFinal),
      mondayItemId: item.id
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

    // Ensure required fields with defaults and coerced decimal strings
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
      montantEstime: this.coerceDecimalToString(mappedData.montantEstime),
      amountEstimate: this.coerceDecimalToString(mappedData.amountEstimate),
      isDraft: false,
      mondayItemId: item.id
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
      notes: mappedData.notes || null,
      mondayItemId: item.id
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

  async syncFromMonday(params: {
    boardId: string;
    itemId: string;
    changeType: 'create' | 'update' | 'delete';
    data?: any;
    mondayUpdatedAt?: Date;
  }): Promise<void> {
    const { boardId, itemId, changeType, data, mondayUpdatedAt } = params;
    
    logger.info('[MondayImportService] Sync depuis Monday', {
      service: 'MondayImportService',
      metadata: {
        operation: 'syncFromMonday',
        boardId,
        itemId,
        changeType
      }
    });
    
    try {
      // Get item details from Monday.com
      const item = await mondayService.getItem(itemId);
      
      // Determine entity type based on item characteristics
      // For now, default to project. Could be extended with board mapping logic
      const entityType = this.determineEntityType(item, boardId);
      
      if (changeType === 'delete') {
        // Handle deletion
        if (entityType === 'project') {
          // Note: We would need a deleteProject method in storage
          logger.info('[MondayImportService] Projet suppression détectée', {
            service: 'MondayImportService',
            metadata: {
              operation: 'syncFromMonday',
              itemId,
              changeType: 'delete'
            }
          });
        } else if (entityType === 'ao') {
          logger.info('[MondayImportService] AO suppression détectée', {
            service: 'MondayImportService',
            metadata: {
              operation: 'syncFromMonday',
              itemId,
              changeType: 'delete'
            }
          });
        }
        return;
      }
      
      // Map to Saxium entity
      let saxiumEntity: any;
      let createdId: string | undefined;
      
      if (entityType === 'project') {
        const mapping: ImportMapping = {
          mondayBoardId: boardId,
          targetEntity: 'project',
          columnMappings: [] // Will use default mapping
        };
        
        const projectData = this.mapItemToProject(item, mapping);
        
        if (changeType === 'create') {
          const created = await storage.createProject(projectData);
          createdId = created.id;
          saxiumEntity = created;
        } else if (changeType === 'update') {
          // OPTIMISATION: Use pagination to find existing project by Monday Item ID or name
          const { projects } = await storage.getProjectsPaginated(undefined, undefined, 100, 0);
          const existingProject = projects.find(p => 
            p.mondayItemId === itemId || p.name === item.name
          );
          
          if (existingProject) {
            // CONFLICT DETECTION: Compare timestamps
            const saxiumUpdatedAt = existingProject.updatedAt;
            const mondayTime = mondayUpdatedAt || new Date();
            
            if (saxiumUpdatedAt && saxiumUpdatedAt > mondayTime) {
              // Conflict detected: Saxium is more recent than Monday
              logger.warn('[Conflict] Saxium plus récent que Monday', {
                service: 'MondayImportService',
                metadata: {
                  operation: 'syncFromMonday',
                  projectId: existingProject.id,
                  mondayId: itemId,
                  saxiumUpdatedAt: saxiumUpdatedAt.toISOString(),
                  mondayUpdatedAt: mondayTime.toISOString(),
                  strategy: 'Monday-priority (override)'
                }
              });
              
              // Emit conflict event for audit
              eventBus.emit('monday:sync:conflict', {
                entityType: 'project',
                entityId: existingProject.id,
                mondayId: itemId,
                saxiumUpdatedAt: saxiumUpdatedAt.toISOString(),
                mondayUpdatedAt: mondayTime.toISOString(),
                resolution: 'monday_wins'
              });
            }
            
            // ALWAYS apply Monday changes (Monday-priority strategy)
            saxiumEntity = await storage.updateProject(existingProject.id, projectData);
            createdId = existingProject.id;
          } else {
            // Create if not found
            const created = await storage.createProject(projectData);
            createdId = created.id;
            saxiumEntity = created;
          }
        }
      } else if (entityType === 'ao') {
        const mapping: ImportMapping = {
          mondayBoardId: boardId,
          targetEntity: 'ao',
          columnMappings: []
        };
        
        const aoData = this.mapItemToAO(item, mapping);
        
        if (changeType === 'create') {
          const created = await storage.createAo(aoData);
          createdId = created.id;
          saxiumEntity = created;
        } else if (changeType === 'update') {
          // Try to find existing AO by Monday Item ID or reference
          const aos = await storage.getAos();
          const existingAo = aos.find(a => 
            a.mondayItemId === itemId || a.reference === item.name
          );
          
          if (existingAo) {
            // CONFLICT DETECTION: Compare timestamps
            const saxiumUpdatedAt = existingAo.updatedAt;
            const mondayTime = mondayUpdatedAt || new Date();
            
            if (saxiumUpdatedAt && saxiumUpdatedAt > mondayTime) {
              // Conflict detected: Saxium is more recent than Monday
              logger.warn('[Conflict] Saxium plus récent que Monday', {
                service: 'MondayImportService',
                metadata: {
                  operation: 'syncFromMonday',
                  aoId: existingAo.id,
                  mondayId: itemId,
                  saxiumUpdatedAt: saxiumUpdatedAt.toISOString(),
                  mondayUpdatedAt: mondayTime.toISOString(),
                  strategy: 'Monday-priority (override)'
                }
              });
              
              // Emit conflict event for audit
              eventBus.emit('monday:sync:conflict', {
                entityType: 'ao',
                entityId: existingAo.id,
                mondayId: itemId,
                saxiumUpdatedAt: saxiumUpdatedAt.toISOString(),
                mondayUpdatedAt: mondayTime.toISOString(),
                resolution: 'monday_wins'
              });
            }
            
            // ALWAYS apply Monday changes (Monday-priority strategy)
            saxiumEntity = await storage.updateAo(existingAo.id, aoData);
            createdId = existingAo.id;
          } else {
            // Create if not found
            const created = await storage.createAo(aoData);
            createdId = created.id;
            saxiumEntity = created;
          }
        }
      }
      
      // Emit success event
      if (createdId) {
        // Map entity type to valid RealtimeEvent entity
        const eventEntity = entityType === 'ao' ? 'offer' : entityType;
        
        eventBus.publish({
          id: crypto.randomUUID(),
          type: 'monday:sync:success' as any,
          entity: eventEntity as 'project' | 'offer' | 'supplier',
          entityId: createdId,
          message: `${entityType} synchronisé depuis Monday.com`,
          severity: 'success',
          affectedQueryKeys: [
            [`/api/${entityType}s`],
            [`/api/${entityType}s`, createdId]
          ],
          userId: 'monday-sync',
          timestamp: new Date().toISOString(),
          metadata: {
            mondayId: itemId,
            boardId,
            changeType
          }
        });
      }
      
      logger.info('[MondayImportService] Sync terminée avec succès', {
        service: 'MondayImportService',
        metadata: {
          operation: 'syncFromMonday',
          entityType,
          entityId: createdId,
          mondayId: itemId,
          changeType
        }
      });
    } catch (error) {
      logger.error('[MondayImportService] Erreur sync depuis Monday', {
        service: 'MondayImportService',
        metadata: {
          operation: 'syncFromMonday',
          boardId,
          itemId,
          changeType,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  private determineEntityType(item: MondayItem, boardId: string): 'project' | 'ao' | 'supplier' {
    // Simple heuristic: check if item has fields that suggest it's an AO
    const hasReferenceField = item.column_values.some(cv => 
      cv.id.toLowerCase().includes('ref') || 
      cv.id.toLowerCase().includes('reference')
    );
    
    const hasDateLimiteField = item.column_values.some(cv => 
      cv.id.toLowerCase().includes('date_limite') ||
      cv.id.toLowerCase().includes('deadline')
    );
    
    // If it looks like an AO (has reference and deadline), classify as AO
    if (hasReferenceField && hasDateLimiteField) {
      return 'ao';
    }
    
    // Default to project
    return 'project';
  }
}

export const mondayImportService = new MondayImportService();
