/**
 * MONDAY MIGRATION SERVICE ENHANCED - PHASE 2
 * 
 * Extension du service de migration Monday.com avec méthodes avancées :
 * - Fetch direct depuis Monday API (pas de données synthétiques)
 * - Transformation avec mapping configuration
 * - Validation Zod rigoureuse
 * - Bulk insert avec gestion doublons
 * - Orchestration complète avec dry-run
 */

import { MondayService, type MondayItem, type MondayColumnValue } from './MondayService';
import { withErrorHandling } from './utils/error-handler';
import { AppError, NotFoundError, ValidationError, AuthorizationError } from './utils/error-handler';
import { IMigrationStorage } from '../storage-migration';
import { logger } from '../utils/logger';
import { withRetry } from '../utils/retry-helper';
import { 
  mondayMigrationMapping, 
  getMappingConfig, 
  validateRequiredFields,
  type EntityType,
  type EntityMappingConfig 
} from '../config/monday-migration-mapping';
import { 
  insertAoSchema, 
  insertProjectSchema, 
  insertSupplierSchema,
  type InsertAo,
  type InsertProject,
  type InsertSupplier
} from '@shared/schema';
import { ZodError } from 'zod';

/**
 * Options pour la migration
 */
export interface MigrationOptions {
  boardId?: string; // Board ID spécifique (sinon utilise config)
  entityType: EntityType; // Type d'entité à migrer
  dryRun?: boolean; // Mode preview sans insertion
  verbose?: boolean; // Logs détaillés
  batchSize?: number; // Taille des batches (défaut: 100)
  skipExisting?: boolean; // Skip items déjà migrés (défaut: true)
}

/**
 * Résultat détaillé de la migration
 */
export interface MigrationReport {
  entityType: EntityType;
  boardId: string;
  startedAt: Date;
  completedAt: Date;
  duration: number; // millisecondes
  
  // Statistiques
  totalFetched: number;
  totalTransformed: number;
  totalValidated: number;
  totalInserted: number;
  totalSkipped: number;
  totalErrors: number;
  
  // Détails
  successful: string[]; // IDs créés
  skipped: Array<{ mondayId: string; reason: string }>;
  errors: Array<{ mondayId: string; field?: string; error: string }>;
  missingFields: Array<{ mondayId: string; fields: string[] }>;
  
  // Mode dry-run
  isDryRun: boolean;
  
  // Preview données transformées (dry-run only)
  preview?: unknown[];
}

/**
 * Service Enhanced pour migration Monday → Saxium
 */
export class MondayMigrationServiceEnhanced {
  private mondayService: MondayService;

  constructor(private storage: IMigrationStorage) {
    this.mondayService = new MondayService();
  }

  /**
   * MÉTHODE PRINCIPALE D'ORCHESTRATION
   * Exécute la migration complète avec toutes les étapes
   */
  async migrate(options: MigrationOptions): Promise<MigrationReport> {
    const startedAt = new Date();
    
    logger.info('Démarrage migration Monday → Saxium', {
      metadata: {
        service: 'MondayMigrationServiceEnhanced',
        operation: 'migrate',
        entityType: options.entityType,
        boardId: options.boardId,
        dryRun: options.dryRun,
        verbose: options.verbose
      }
    });

    const report: MigrationReport = {
      entityType: options.entityType,
      boardId: options.boardId || getMappingConfig(options.entityType).boardId || '',
      startedAt,
      completedAt: new Date(),
      duration: 0,
      totalFetched: 0,
      totalTransformed: 0,
      totalValidated: 0,
      totalInserted: 0,
      totalSkipped: 0,
      totalErrors: 0,
      successful: [],
      skipped: [],
      errors: [],
      missingFields: [],
      isDryRun: options.dryRun || false,
      preview: options.dryRun ? [] : undefined
    };

    return withErrorHandling(
    async () => {

      // Étape 1: Fetch items depuis Monday.com
      const items = await this.fetchAllItems(
        report.boardId, 
        options.entityType,
        options.verbose
      );
      report.totalFetched = items.length;

      logger.info('Items fetched depuis Monday', {
        metadata: {
          service: 'MondayMigrationServiceEnhanced',
          operation: 'migrate',
          totalFetched: report.totalFetched
        }
      });

      // Étape 2: Transform & Validate
      const transformedI: unknown[]ny[] = [];
      
      for (const item of items) {
        try {
          // Transform avec mapping config
          const transformed = await this.transformItem(item, options.entityType);
          report.totalTransformed++;

          // Validate avec Zod schema
          const validated = await this.validateItem(transformed, options.entityType);
          report.totalValidated++;

          transformedItems.push({ original: item, transformed: validated });

        
    },
    {
      operation: 'API',
service: 'MondayMigrationServiceEnhanced',;
      metadata: {}
    }
  );
            });
          }
        }
      }

      // Étape 3: Dry-run preview OU Bulk insert
      if (options.dryRun) {
        report.preview = transformedItems.slice(0, 10).map(t => t.transformed);
        
        logger.info('Mode dry-run: migration simulée', {
          metadata: {
            service: 'MondayMigrationServiceEnhanced',
            operation: 'migrate',
            totalValidated: report.totalValidated,
            previewCount: report.preview.length
          }
        });

      } else {
        // Bulk insert avec skip doublons
        const insertResult = await this.bulkInsert(
          transformedItems.map(t => t.transformed),
          options.entityType,
          {
            batchSize: options.batchSize || 100,
            skipExisting: options.skipExisting !== false,
            verbose: options.verbose
          }
        );

        report.totalInserted = insertResult.inserted;
        report.totalSkipped = insertResult.skipped;
        report.successful = insertResult.successful;
        report.skipped = insertResult.skippedDetails;
        report.errors.push(...insertResult.errors);
      }

      // Finaliser rapport
      report.completedAt = new Date();
      report.duration = report.completedAt.getTime() - startedAt.getTime();

      logger.info('Migration terminée', {
        metadata: {
          service: 'MondayMigrationServiceEnhanced',
          operation: 'migrate',
          duration: report.duration,
          totalInserted: report.totalInserted,
          totalErrors: report.totalErrors,
          totalSkipped: report.totalSkipped
        }
      });

      return report;

    } catch (error) {
      report.completedAt = new Date();
      report.duration = report.completedAt.getTime() - startedAt.getTime();

      logger.error('Erreur migration Monday → Saxium', {
        metadata: {
          service: 'MondayMigrationServiceEnhanced',
          operation: 'migrate',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });

      throw error;
    }
  }

  /**
   * FETCH ALL ITEMS depuis Monday board avec pagination
   * Utilise MondayService.getBoardItemsPaginated() qui gère la pagination par curseur
   */
  async fetchAllItems(
    boardId: string,
    entityType: EntityType,
    verbose?: boolean
  ): Promise<MondayItem[]> {
    logger.info('Fetch items Monday.com avec pagination', {
      metadata: {
        service: 'MondayMigrationServiceEnhanced',
        operation: 'fetchAllItems',
        boardId,
        entityType
      }
    });

    return withErrorHandling(
    async () => {

      // Utiliser la méthode paginée avec curseur du MondayService
      const items = await withRetry(
        () => this.mondayService.getBoardItemsPaginated(boardId),
        {
          maxRetries: 3,
          initialDelay: 1000,
          retryCondition: (error: unknown) => {
            // Retry sur rate limits et erreurs serveur
            return error?.response?.status === 429 || error?.response?.status >= 500;
          }
        }
      );

      logger.info('Fetch terminé', {
        metadata: {
          service: 'MondayMigrationServiceEnhanced',
          operation: 'fetchAllItems',
          totalItems: items.length
        }
      });

      return items;

    
    },
    {
      operation: 'API',
      service: 'MondayMigrationServiceEnhanced',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  /**
   * TRANSFORM ITEM Monday → Saxium
   * Applique mapping configuration et transformations
   */
  async transformItem(item: MondayItem, entityType: EntityType): Promise<unknown> {
    const config = getMappingConfig(entityType);
    const transformed: unknown = {};

    // CRITIQUE: Préserver Monday item ID natif AVANT mapping pour transformations
    // L'ID Monday natif (ex: 18115615455) doit être disponible pour les transformations
    const originalMondayId = item.id;
    
    // CRITIQUE: Ajouter mondayItemId AVANT le mapping des colonnes
    // Permet aux transformations (comme reference) d'utiliser mondayItemId
    transformed.mondayItemId = originalMondayId;

    // Extraire valeurs des colonnes Monday
    const columnValues = this.extractColumnValues(item);

    // Appliquer column mappings
    for (const [mondayColumn, saxiumField] of Object.entries(config.columnMappings)) {
      let value = columnValues.get(mondayColumn);

      // Appliquer enum mapping si défini
      if (value && config.enumMappings[saxiumField]) {
        const enumMapping = config.enumMappings[saxiumField];
        value = enumMapping[value] || value;
      }

      // Appliquer transformation custom si définie (même si value est undefined pour valeurs par défaut)
      if (config.transformations?.[saxiumField]) {
        value = config.transformations[saxiumField](value, transformed);
      }

      transformed[saxiumField] = value;
    }

    // CRITIQUE: Appliquer transformations pour required fields non encore définis
    // Permet de générer des valeurs par défaut pour les champs requis
    for (const requiredField of config.requiredFields) {
      // Si le champ n'a pas de valeur ET qu'il a une transformation définie
      if (!transformed[requiredField] && config.transformations?.[requiredField]) {
        const defaultValue = config.transformations[requiredField](undefined, transformed);
        if (defaultValue !== undefined) {
          transformed[requiredField] = defaultValue;
        }
      }
    }

    // Ajouter champs Monday pour traçabilité
    for (const mondayField of config.mondayFields) {
      if (mondayField === 'mondayId') {
        transformed.mondayId = item.id; // Monday item ID
      }
    }

    // Ajouter nom item Monday comme fallback description
    if (!transformed.description && item.name) {
      transformed.description = `Migré depuis Monday.com: ${item.name}`;
    }

    return transformed;
  }

  /**
   * VALIDATE ITEM avec Zod schema
   * Retourne données validées ou throw ZodError
   */
  async validateItem(data: unknown, entityType: EntityType): Pro<unknown>unknown> {
    const schemas = {
      aos: insertAoSchema,
      projects: insertProjectSchema,
      suppliers: insertSupplierSchema
    };

    const schema = schemas[entityType];
    
    return withErrorHandling(
    async () => {

      // Validation Zod stricte
      return schema.parse(data);
      
    
    },
    {
      operation: 'API',
      service: 'MondayMigrationServiceEnhanced',
      metadata: {}
    }
  );
      throw error;
    }
  }

  /**
   * BULK INSERT avec gestion doublons - OPTIMISÉ AVEC BATCHES PARALLÈLES
   * Skip items si mondayId existe déjà
   * Utilise Promise.allSettled pour traiter 20 items en parallèle par batch
   */
  async bulkInsert(
 : unknown[]s: unknown[],
    entityType: EntityType,
    options: {
      batchSize?: number;
      skipExisting?: boolean;
      verbose?: boolean;
    } = {}
  ): Promise<{
    inserted: number;
    skipped: number;
    successful: string[];
    skippedDetails: Array<{ mondayId: string; reason: string }>;
    errors: Array<{ mondayId: string; error: string }>;
  }> {
    const PARALLEL_BATCH_SIZE = 20; // Process 20 items in parallel per batch
    const result = {
      inserted: 0,
      skipped: 0,
      successful: [] as string[],
      skippedDetails: [] as Array<{ mondayId: string; reason: string }>,
      errors: [] as Array<{ mondayId: string; error: string }>
    };

    logger.info('Démarrage bulk insert (parallel batches)', {
      metadata: {
        service: 'MondayMigrationServiceEnhanced',
        operation: 'bulkInsert',
        totalItems: items.length,
        parallelBatchSize: PARALLEL_BATCH_SIZE,
        skipExisting: options.skipExisting
      }
    });

    const totalBatches = Math.ceil(items.length / PARALLEL_BATCH_SIZE);
    let batchNumber = 0;

    // Traiter par batches parallèles
    for (let i = 0; i < items.length; i += PARALLEL_BATCH_SIZE) {
      batchNumber++;
      const batch = items.slice(i, i + PARALLEL_BATCH_SIZE);

      // Process batch items in parallel using Promise.allSettled
      const results = await Promise.allSettled(
        batch.map(async (item) => {
          // Check for duplicates if skip enabled
          if (options.skipExisting && item.mondayId) {
            const exists = await this.checkIfExists(item.mondayId, entityType);
            
            if (exists) {
              return {
                status: 'skipped' as const,
                mondayId: item.mondayId,
                reason: 'Already exists in database'
              };
            }
          }

          // Insert via storage interface
          const created = await this.insertEntity(item, entityType);
          return {
            status: 'inserted' as const,
            id: created.id,
            mondayId: item.mondayId
          };
        })
      );

      // Process settled results
      for (let j = 0; j < results.length; j++) {
        const settledResult = results[j];
        const item = batch[j];

        if (settledResult.status === 'fulfilled') {
          const value = settledResult.value;
          if (value.status === 'skipped') {
            result.skipped++;
            result.skippedDetails.push({
              mondayId: value.mondayId,
              reason: value.reason
            });
          } else if (value.status === 'inserted') {
            result.inserted++;
            result.successful.push(value.id);
          }
        } else {
          // Rejected promise = error
          result.errors.push({
            mondayId: item.mondayId || 'unknown',
            error: settledResult.reason instanceof Error 
              ? settledResult.reason.message 
              : String(settledResult.reason)
          });

          if (options.verbose) {
            logger.warn('Erreur insertion item', {
              metadata: {
                service: 'MondayMigrationServiceEnhanced',
                operation: 'bulkInsert',
                mondayId: item.mondayId,
                error: settledResult.reason instanceof Error 
                  ? settledResult.reason.message 
                  : String(settledResult.reason)
              }
            });
          }
        }
      }

      // Progress logging with percentage
      const processedSoFar = Math.min(i + PARALLEL_BATCH_SIZE, items.length);
      const percentage = ((processedSoFar / items.length) * 100).toFixed(1);

      logger.info(`Batch ${batchNumber}/${totalBatches}: ${processedSoFar}/${items.length} items (${percentage}%)`, {
        metadata: {
          service: 'MondayMigrationServiceEnhanced',
          operation: 'bulkInsert',
          batchNumber,
          totalBatches,
          processedSoFar,
          total: items.length,
          percentage,
          inserted: result.inserted,
          skipped: result.skipped,
          errors: result.errors.length
        }
      });
    }

    logger.info('Bulk insert terminé', {
      metadata: {
        service: 'MondayMigrationServiceEnhanced',
        operation: 'bulkInsert',
        inserted: result.inserted,
        skipped: result.skipped,
        errors: result.errors.length
      }
    });

    return result;
  }

  /**
   * Extrait valeurs colonnes Monday en Map
   */
  private extractColumnValues(item: MondayItem): Map<string, unknown> {
    const values = new Map<st, unknunknown>unknown>();

    for (const columnValue of item.column_values || []) {
      // Utiliser la méthode extractColumnValue de MondayService
      // qui gère tous les types Monday (status, dropdown, people, numbers, date, etc.)
      const value = this.mondayService.extractColumnValue(columnValue);
      values.set(columnValue.id, value);
    }

    return values;
  }

  /**
   * Vérifie si entity existe déjà (via mondayId)
   */
  private async checkIfExists(mondayId: string, entityType: EntityType): Promise<boolean> {
    return withErrorHandling(
    async () => {

      switch (entityType) {
        case 'aos': {
          const aos = await this.storage.getAos();
          return aos.some(ao => ao.mondayId === mondayId || ao.mondayItemId === mondayId);
        }
        case 'projects': {
          const projects = await this.storage.getProjects();
          return projects.some(p => p.mondayId === mondayId || p.mondayItemId === mondayId);
        }
        case 'suppliers': {
          const suppliers = await this.storage.getSuppliers();
          return suppliers.some(s => s.mondayItemId === mondayId);
        }
        default:
          return false;
      }
    
    },
    {
      operation: 'API',
      service: 'MondayMigrationServiceEnhanced',
      metadata: {}
    }
  );
      });
      return false;
    }
  }

  /**
   * Insère entity via storage interface
   */
  private async insertEntity(: unknown, unknown, entityType: EntityType):<unknunknown>unknown<any> {
    switch (entityType) {
      case 'aos':
        return await this.storage.createAo(data as InsertAo);
      case 'projects':
        return await this.storage.createProject(data as InsertProject);
      case 'suppliers':
        return await this.storage.createSupplier(data as InsertSupplier);
      default:
        throw new AppError(`Unknown entity type: ${entityType}`, 500);
    }
  }
}

// Export singleton
let enhancedService: MondayMigrationServiceEnhanced | null = null;

export function getMondayMigrationServiceEnhanced(storage: IMigrationStorage): MondayMigrationServiceEnhanced {
  if (!enhancedService) {
    enhancedService = new MondayMigrationServiceEnhanced(storage);
  }
  return enhancedService;
}
