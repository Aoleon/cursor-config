import { mondayService, MondayItem, ImportMapping, ImportResult } from './MondayService';
import { withErrorHandling } from './utils/error-handler';
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
   * IMPORTANT: Preserves null to allow clearing persisted values on re-import
   */
  private coerceDecimalToString(value: unknown): string | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;
    return typeof value === 'number' ? value.toString() : value;
  }

  /**
   * Remove undefined values from object to avoid Drizzle issues
   * IMPORTANT: Preserves null to allow clearing persisted values on re-import
   */
  private removeUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
    return Object.fromEntries(
      Object.entries(obj).filter(([_, v]) => v !== undefined)
    ) as Partial<T>;
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

    return withErrorHandling(
    async () => {

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
          
          // INSTRUMENTATION: Log mapped data before cleaning
          logger.info('🔍 [DEBUG] Mapped project data', {
            service: 'MondayImportService',
            metadata: {
              operation: 'importBoardAsProjects',
              itemId: item.id,
              itemName: item.name,
              projectData
            }
          });
          
          // Remove undefined values before validation
          const cleanedData = this.removeUndefined(projectData);
          
          // INSTRUMENTATION: Log cleaned data before validation
          logger.info('🔍 [DEBUG] Cleaned data before validation', {
            service: 'MondayImportService',
            metadata: {
              operation: 'importBoardAsProjects',
              itemId: item.id,
              cleanedData
            }
          });
          
          // Validate data with Zod schema
          const validation = insertProjectSchema.safeParse(cleanedData);
          if (!validation.success) {
            const errors = validation.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ');
            logger.error('❌ [DEBUG] Validation Zod échouée', {
              service: 'MondayImportService',
              metadata: {
                operation: 'importBoardAsProjects',
                itemId: item.id,
                errors,
                cleanedData,
                validationIssues: validation.error.issues
              }
            });
            result.errors.push(`Item ${item.id}: Validation failed - ${errors}`);
            continue;
          }
          
          // INSTRUMENTATION: Log successful validation
          logger.info('✅ [DEBUG] Validation passed', {
            service: 'MondayImportService',
            metadata: {
              operation: 'importBoardAsProjects',
              itemId: item.id,
              validatedData: validation.data
            }
          });

          // Check if project already exists with this mondayItemId (upsert strategy)
          logger.info('🔍 [DEBUG] Checking for existing project', {
            service: 'MondayImportService',
            metadata: {
              operation: 'importBoardAsProjects',
              itemId: item.id,
              mondayItemId: item.id
            }
          });
          
          const existingProject = await storage.getProjectByMondayItemId(item.id);
          
          logger.info('🔍 [DEBUG] Existing project check result', {
            service: 'MondayImportService',
            metadata: {
              operation: 'importBoardAsProjects',
              itemId: item.id,
              existingProject: existingProject ? { id: existingProject.id, name: existingProject.name } : null
            }
          });

          // Convert decimal fields back to string for Postgres (Zod transforms them to number)
          const dataForStorage = this.removeUndefined({
            ...validation.data,
            montantEstime: typeof validation.data.montantEstime === 'number' 
              ? validation.data.montantEstime.toString() 
              : validation.data.montantEstime,
            montantFinal: typeof (validation.data as unknown).montantFinal === 'number'
              ? (validation.das unknown)unknown).montantFinal.toString()
              : (validatias unknown) as unknown).montantFinal,
            budget: typeof (valias unknown)das unknunknown)unknown).budget === 'number'
              ? (as unknown)ias unknunknown)unknown any).budget.toString()
             as unknown)ias unknunknown)unknowna as any).budget
          });
          
          logger.info('🔍 [DEBUG] Data for storage', {
            service: 'MondayImportService',
            metadata: {
              operation: 'importBoardAsProjects',
              itemId: item.id,
              dataForStorage
            }
          });

          let project;
          let wasUpdate = false;
          
          if (existingProject) {
            // Update existing project
            logger.info('🔍 [DEBUG] Updating existing project', {
              service: 'MondayImportService',
              metadata: {
                operation: 'importBoardAsProjects',
                projectId: existingProject.id,
                itemId: item.id
              }
            });
            project = await storage.updateProject(existingProas unknown),as unknunknown)unknownorage as any);
            wasUpdate = true;
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
            logger.info('🔍 [DEBUG] Creating new project', {
              service: 'MondayImportService',
              metadata: {
                operation: 'importBoardAsProjects',
                itemId: item.id
              }
            });
            
            project = await storage.cas unknown)oas unknunknown)unknownorStorage as any);
            
            logger.info('✅ [DEBUG] Projet créé depuis Monday', {
              service: 'MondayImportService',
              metadata: {
                operation: 'importBoardAsProjects',
                projectId: project.id,
                mondayItemId: item.id,
                action: 'create'
              }
            });
          }
          
          result.importedCount++;
          result.createdIds.push(project.id);

          // Publish appropriate event based on action
          eventBus.publish({
            id: crypto.randomUUID(),
            type: wasUpdate ? EventType.PROJECT_UPDATED : EventType.PROJECT_CREATED,
            entity: 'project',
            entityId: project.id,
            message: `Projet "${project.name}" ${wasUpdate ? 'mis à jour' : 'importé'} depuis Monday.com`,
            severity: 'success',
            affectedQueryKeys: [['/api/projects']],
            userId: 'monday-import',
            timestamp: new Date().toISOString(),
            metadata: {
              source: 'monday.com',
              mondayItemId: item.id,
              boardId,
              action: wasUpdate ? 'update' : 'create'
            }
          });
        
    },
    {
      operation: 'coerceDecimalToString',
service: 'MondayImportService',;
      metadata: {}
    }
  );: ${error.message}`);
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
unknown)unknownatch (e: unknown)any) {
      logger.error('Erreur import Monday', {
        service: 'MondayImportService',
        metadata: {
          operation: 'importBoardAsProjects',
          error: error.message
        }
      });

      throw error;
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

    return withErrorHandling(
    async () => {

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
          
          logger.info('🔍 [DEBUG] Mapped AO data', {
            service: 'MondayImportService',
            metadata: {
              operation: 'importBoardAsAOs',
              itemId: item.id,
              itemName: item.name,
              aoData
            }
          });
          
          // Remove undefined values before validation
          const cleanedData = this.removeUndefined(aoData);
          
          logger.info('🔍 [DEBUG] Cleaned AO data before validation', {
            service: 'MondayImportService',
            metadata: {
              operation: 'importBoardAsAOs',
              itemId: item.id,
              cleanedData
            }
          });
          
          // Validate data with Zod schema
          const validation = insertAoSchema.safeParse(cleanedData);
          if (!validation.success) {
            const errors = validation.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ');
            logger.error('❌ [DEBUG] AO Validation Zod échouée', {
              service: 'MondayImportService',
              metadata: {
                operation: 'importBoardAsAOs',
                itemId: item.id,
                errors,
                cleanedData,
                validationIssues: validation.error.issues
              }
            });
            result.errors.push(`Item ${item.id}: Validation failed - ${errors}`);
            continue;
          }
          
          logger.info('✅ [DEBUG] AO Validation passed', {
            service: 'MondayImportService',
            metadata: {
              operation: 'importBoardAsAOs',
              itemId: item.id,
              validatedData: validation.data
            }
          });

          // Check if AO already exists with this mondayItemId (upsert strategy)
          const existingAo = await storage.getAOByMondayItemId(item.id);

          // Convert decimal fields back to string for Postgres (Zod transforms them to number)
          const dataForStorage = this.removeUndefined({
            ...validation.data,
            montantEstime: typeof validation.data.montantEstime === 'number' 
              ? validation.data.montantEstime.toString() 
              : validation.data.montantEstime,
            amountEsas unknown) as unknown)unknown (validation.data as any).amountEstimate === 'numbeas unknown) as unknown)unknown   ? (validation.data as any).amountEstimate.toStas unknown) as unknown)unknown       : (validation.data as any).amountEstimate
          });

          let ao;
          let wasUpdate = false;
          
          if (existingAo) {
            // Update existing AO
            ao = await stoas unknown)das unknown)unknownexistingAo.id, dataForStorage as any);
            wasUpdate = true;
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
       as unknown) as unknown)unknownt storage.createAo(dataForStorage as any);
            logger.info('AO créé depuis Monday', {
              service: 'MondayImportService',
              metadata: {
                operation: 'importBoardAsAOs',
                aoId: ao.id,
                mondayItemId: item.id,
                action: 'create'
              }
            });
          }

          result.importedCount++;
          result.createdIds.push(ao.id);

          // Publish appropriate event based on action
          eventBus.publish({
            id: crypto.randomUUID(),
            type: wasUpdate ? EventType.OFFER_UPDATED : EventType.OFFER_CREATED,
            entity: 'offer',
            entityId: ao.id,
message: `AO "${ao.reference}" ${wasUpdate ? 'mis à jour' : 'importé'} depuis Monday.com`,;
            severity: 'success',
            affectedQueryKeys: [['/api/aos']],
            userId: 'monday-import',
            timestamp: new Date().toISOString(),
            metadata: {
              source: 'monday.com',
              mondayItemId: item.id,
              boardId,
              action: wasUpdate ? 'update' : 'create'
            }
          });
        
    },
    {
      operation: 'coerceDecimalToString',
      service: 'MondayImportService',
      metadata: {}
    }
  );: ${error.message}`);
          result.success = false;
        }
      unknown)unknown  return result;
    } catc: unknown)or: any) {
      logger.error('Erreur import Monday AOs', {
        service: 'MondayImportService',
        metadata: {
          operation: 'importBoardAsAOs',
          error: error.message
        }
      });

      throw error;
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

    return withErrorHandling(
    async () => {

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
          
          logger.info('🔍 [DEBUG] Mapped Supplier data', {
            service: 'MondayImportService',
            metadata: {
              operation: 'importBoardAsSuppliers',
              itemId: item.id,
              itemName: item.name,
              supplierData
            }
          });
          
          // Remove undefined values before validation
          const cleanedData = this.removeUndefined(supplierData);
          
          logger.info('🔍 [DEBUG] Cleaned Supplier data before validation', {
            service: 'MondayImportService',
            metadata: {
              operation: 'importBoardAsSuppliers',
              itemId: item.id,
              cleanedData
            }
          });
          
          // Validate data with Zod schema
          const validation = insertSupplierSchema.safeParse(cleanedData);
          if (!validation.success) {
            const errors = validation.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ');
            logger.error('❌ [DEBUG] Supplier Validation Zod échouée', {
              service: 'MondayImportService',
              metadata: {
                operation: 'importBoardAsSuppliers',
                itemId: item.id,
                errors,
                cleanedData,
                validationIssues: validation.error.issues
              }
            });
            result.errors.push(`Item ${item.id}: Validation failed - ${errors}`);
            continue;
          }
          
          logger.info('✅ [DEBUG] Supplier Validation passed', {
            service: 'MondayImportService',
            metadata: {
              operation: 'importBoardAsSuppliers',
              itemId: item.id,
              validatedData: validation.data
            }
          });

          // Check if Supplier already exists with this mondayItemId (upsert strategy)
          const existingSupplier = await storage.getSupplierByMondayItemId(item.id);

          // Remove undefined values before storage
          const dataForStorage = this.removeUndefined(validation.data);

          let supplier;
          let wasUpdate = false;
          
          if (existingSupplier) {
            // Update existing Supplier
            supplier = await storageas unknown)unknown)unknownnownr(existingSupplier.id, dataForStorage as any);
            wasUpdate = true;
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
           as unknown)unknown)unknownnownait storage.createSupplier(dataForStorage as any);
            logger.info('Fournisseur créé depuis Monday', {
              service: 'MondayImportService',
              metadata: {
                operation: 'importBoardAsSuppliers',
                supplierId: supplier.id,
                mondayItemId: item.id,
                action: 'create'
              }
            });
          }

          result.importedCount++;
          result.createdIds.push(supplier.id);
        
    },
    {
      operation: 'coerceDecimalToString',
service: 'MondayImportService',;
      metadata: {}
    }
  );: ${error.message}`);
          result.success = false;
    unknown)unknown     }

      return result;
    } : unknown)(error: any) {
      logger.error('Erreur import Monday Fournisseurs', {
        service: 'MondayImportService',
        metadata: {
          operation: 'importBoardAsSuppliers',
          error: error.message
        }
      });

      throw error;
    }
  }

  private mapItemToProject(item: MondayItem, mapping: ImportMapping): InsertProject {
    const mappedData: unknown = {
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
      offerId: mappedData.offerId || undefined,
      description: mappedData.description || undefined,
      startDate: mappedData.startDate || undefined,
      endDate: mappedData.endDate || undefined,
      budget: this.coerceDecimalToString(mappedData.budget),
      montantEstime: this.coerceDecimalToString(mappedData.montantEstime),
      montantFinal: this.coerceDecimalToString(mappedData.montantFinal),
      mondayItemId: item.id
    };
  }

  private mapItemToAO(item: MondayItem, mapping: ImportMapping): InsertAo {
    const mapped: unknown =ny = {
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
    const ma: unknown =a: unknown = {
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
    columns: unknown[];
    suggestedMapp: unknown[]ny[];
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
   : unknown[]s: unknown[],
    targetEntity: 'project' | 'ao' | 'supplierunknown unknown[]'
 unknown[]ny[] {
  : unknown[] maunknown[]s: any[] = [];

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
    data?: unknown;
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
    
    return withErrorHandling(
    async () => {

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
      let saxiumEn: unknown;unknown;
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
          type: 'monday:sync:success' as unknown,
          entity: eventEntity as 'project' | 'offer' | 'supplier',
          entityId: createdId,
message: `${entityType} synchronisé depuis Monday.com`,;
          severity: 'success',
          affectedQueryKeys: [
[`/api/${entityType}s`],;
[`/api/${entityType}s`, createdId];
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
    
    },
    {
      operation: 'coerceDecimalToString',
      service: 'MondayImportService',
      metadata: {}
    }
  );
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
