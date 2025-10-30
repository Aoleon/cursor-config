/**
 * MONDAY MIGRATION SERVICES - BACKWARD COMPATIBILITY ADAPTER
 * 
 * Provides backward compatibility for legacy migration services:
 * - MondayMigrationService (legacy orchestrator)
 * - MondayProductionMigrationService (pattern-based)
 * - MondayProductionFinalService (Excel import)
 * - MondayMigrationServiceEnhanced (API migration)
 * 
 * All methods are mapped to the new consolidated MondayMigrationService
 * with appropriate strategy selection.
 * 
 * @deprecated Use MondayMigrationService from server/services/consolidated/MondayMigrationService.ts
 * @version 2.0.0
 * @date Oct 30, 2025
 */

import { IStorage } from '../../../storage-poc';
import { IMigrationStorage } from '../../../storage-migration';
import { 
  MondayMigrationService,
  type MigrationConfig,
  type MigrationResult
} from '../MondayMigrationService';
import { logger } from '../../../utils/logger';

// ========================================
// LEGACY TYPES (for compatibility)
// ========================================

export interface LegacyMigrationResult {
  source: 'audit_analysis' | 'production_analysis' | 'authentic_monday_exports';
  entityType: 'aos' | 'projects';
  migrated: number;
  errors: number;
  duration: number;
  validationPassed: boolean;
  details: {
    successful: string[];
    failed: Array<{ id: string; error: string }>;
  };
}

export interface ProductionMigrationResult {
  success: boolean;
  source: 'production_analysis';
  totalLines: number;
  totalMigrated: number;
  errors: number;
  duration: number;
  aos: {
    migrated: number;
    errors: number;
  };
  projects: {
    migrated: number;
    errors: number;
  };
}

export interface ProductionFinalMigrationResult {
  success: boolean;
  source: 'authentic_monday_exports';
  totalLines: number;
  totalMigrated: number;
  errors: number;
  duration: number;
  filesProcessed: string[];
  aos: {
    migrated: number;
    errors: number;
  };
  projects: {
    migrated: number;
    errors: number;
  };
}

export interface MigrationOptions {
  boardId?: string;
  entityType: 'aos' | 'projects' | 'suppliers';
  dryRun?: boolean;
  verbose?: boolean;
  batchSize?: number;
  skipExisting?: boolean;
}

export interface MigrationReport {
  entityType: string;
  boardId: string;
  startedAt: Date;
  completedAt: Date;
  duration: number;
  totalFetched: number;
  totalTransformed: number;
  totalValidated: number;
  totalInserted: number;
  totalSkipped: number;
  totalErrors: number;
  successful: string[];
  skipped: Array<{ mondayId: string; reason: string }>;
  errors: Array<{ mondayId: string; field?: string; error: string }>;
  missingFields: Array<{ mondayId: string; fields: string[] }>;
  isDryRun: boolean;
  preview?: any[];
}

// ========================================
// ADAPTER: LEGACY MondayMigrationService
// ========================================

/**
 * @deprecated Use MondayMigrationService from server/services/consolidated/MondayMigrationService.ts
 * Legacy service adapter - maps to new consolidated service
 */
export class MondayMigrationServiceLegacyAdapter {
  private consolidatedService: MondayMigrationService;

  constructor(private storage: IStorage) {
    this.consolidatedService = new MondayMigrationService(storage);
    
    logger.warn('DEPRECATION WARNING: MondayMigrationService (legacy) is deprecated', {
      metadata: {
        service: 'MondayMigrationServiceLegacyAdapter',
        message: 'Please migrate to MondayMigrationService from server/services/consolidated/MondayMigrationService.ts',
        migration: 'Use migrate() with strategyType: "pattern_based"'
      }
    });
  }

  /**
   * @deprecated Use consolidatedService.migrate({ strategyType: 'pattern_based', entityType: 'aos' })
   */
  async migrateAosFromAnalysis(count: number = 911): Promise<LegacyMigrationResult> {
    logger.warn('DEPRECATION: migrateAosFromAnalysis() is deprecated', {
      metadata: {
        service: 'MondayMigrationServiceLegacyAdapter',
        method: 'migrateAosFromAnalysis',
        alternative: 'migrate({ strategyType: "pattern_based", entityType: "aos" })'
      }
    });

    const config: MigrationConfig = {
      strategyType: 'pattern_based',
      entityType: 'aos',
      source: { count }
    };

    const result = await this.consolidatedService.migrate(config);

    return this.mapToLegacyResult(result, 'aos');
  }

  /**
   * @deprecated Use consolidatedService.migrate({ strategyType: 'pattern_based', entityType: 'projects' })
   */
  async migrateChantiersFromAnalysis(count: number = 1000): Promise<LegacyMigrationResult> {
    logger.warn('DEPRECATION: migrateChantiersFromAnalysis() is deprecated', {
      metadata: {
        service: 'MondayMigrationServiceLegacyAdapter',
        method: 'migrateChantiersFromAnalysis',
        alternative: 'migrate({ strategyType: "pattern_based", entityType: "projects" })'
      }
    });

    const config: MigrationConfig = {
      strategyType: 'pattern_based',
      entityType: 'projects',
      source: { count }
    };

    const result = await this.consolidatedService.migrate(config);

    return this.mapToLegacyResult(result, 'projects');
  }

  /**
   * @deprecated Use consolidatedService.migrate({ strategyType: 'excel_import' })
   */
  async migrateFromRealMondayData(): Promise<ProductionFinalMigrationResult> {
    logger.warn('DEPRECATION: migrateFromRealMondayData() is deprecated', {
      metadata: {
        service: 'MondayMigrationServiceLegacyAdapter',
        method: 'migrateFromRealMondayData',
        alternative: 'migrate({ strategyType: "excel_import", entityType: "both" })'
      }
    });

    const config: MigrationConfig = {
      strategyType: 'excel_import',
      entityType: 'both'
    };

    const result = await this.consolidatedService.migrate(config);

    return this.mapToProductionFinalResult(result);
  }

  private mapToLegacyResult(result: MigrationResult, entityType: 'aos' | 'projects'): LegacyMigrationResult {
    const entityResult = entityType === 'aos' ? result.aos : result.projects;
    
    return {
      source: 'audit_analysis',
      entityType,
      migrated: entityResult?.migrated || 0,
      errors: entityResult?.errors || 0,
      duration: result.duration,
      validationPassed: result.success,
      details: {
        successful: entityResult?.successful || [],
        failed: entityResult?.failed || []
      }
    };
  }

  private mapToProductionFinalResult(result: MigrationResult): ProductionFinalMigrationResult {
    return {
      success: result.success,
      source: 'authentic_monday_exports',
      totalLines: result.totalLines,
      totalMigrated: result.totalMigrated,
      errors: result.totalErrors,
      duration: result.duration,
      filesProcessed: result.filesProcessed || [],
      aos: {
        migrated: result.aos?.migrated || 0,
        errors: result.aos?.errors || 0
      },
      projects: {
        migrated: result.projects?.migrated || 0,
        errors: result.projects?.errors || 0
      }
    };
  }
}

// ========================================
// ADAPTER: MondayProductionMigrationService
// ========================================

/**
 * @deprecated Use MondayMigrationService from server/services/consolidated/MondayMigrationService.ts
 * Pattern-based migration adapter
 */
export class MondayProductionMigrationServiceAdapter {
  private consolidatedService: MondayMigrationService;

  constructor(private storage: IStorage) {
    this.consolidatedService = new MondayMigrationService(storage);
    
    logger.warn('DEPRECATION WARNING: MondayProductionMigrationService is deprecated', {
      metadata: {
        service: 'MondayProductionMigrationServiceAdapter',
        message: 'Please migrate to MondayMigrationService with pattern_based strategy',
        migration: 'Use migrate() with strategyType: "pattern_based"'
      }
    });
  }

  /**
   * @deprecated Use consolidatedService.migrate({ strategyType: 'pattern_based', entityType: 'both' })
   */
  async migrateProductionData(): Promise<ProductionMigrationResult> {
    logger.warn('DEPRECATION: migrateProductionData() is deprecated', {
      metadata: {
        service: 'MondayProductionMigrationServiceAdapter',
        method: 'migrateProductionData',
        alternative: 'migrate({ strategyType: "pattern_based", entityType: "both" })'
      }
    });

    const config: MigrationConfig = {
      strategyType: 'pattern_based',
      entityType: 'both',
      source: { count: 1911 }
    };

    const result = await this.consolidatedService.migrate(config);

    return {
      success: result.success,
      source: 'production_analysis',
      totalLines: result.totalLines,
      totalMigrated: result.totalMigrated,
      errors: result.totalErrors,
      duration: result.duration,
      aos: {
        migrated: result.aos?.migrated || 0,
        errors: result.aos?.errors || 0
      },
      projects: {
        migrated: result.projects?.migrated || 0,
        errors: result.projects?.errors || 0
      }
    };
  }
}

// ========================================
// ADAPTER: MondayProductionFinalService
// ========================================

/**
 * @deprecated Use MondayMigrationService from server/services/consolidated/MondayMigrationService.ts
 * Excel import migration adapter
 */
export class MondayProductionFinalServiceAdapter {
  private consolidatedService: MondayMigrationService;

  constructor(private storage: IStorage) {
    this.consolidatedService = new MondayMigrationService(storage);
    
    logger.warn('DEPRECATION WARNING: MondayProductionFinalService is deprecated', {
      metadata: {
        service: 'MondayProductionFinalServiceAdapter',
        message: 'Please migrate to MondayMigrationService with excel_import strategy',
        migration: 'Use migrate() with strategyType: "excel_import"'
      }
    });
  }

  /**
   * @deprecated Use consolidatedService.migrate({ strategyType: 'excel_import', entityType: 'both' })
   */
  async migrateProductionMondayData(): Promise<ProductionFinalMigrationResult> {
    logger.warn('DEPRECATION: migrateProductionMondayData() is deprecated', {
      metadata: {
        service: 'MondayProductionFinalServiceAdapter',
        method: 'migrateProductionMondayData',
        alternative: 'migrate({ strategyType: "excel_import", entityType: "both" })'
      }
    });

    const config: MigrationConfig = {
      strategyType: 'excel_import',
      entityType: 'both'
    };

    const result = await this.consolidatedService.migrate(config);

    return {
      success: result.success,
      source: 'authentic_monday_exports',
      totalLines: result.totalLines,
      totalMigrated: result.totalMigrated,
      errors: result.totalErrors,
      duration: result.duration,
      filesProcessed: result.filesProcessed || [],
      aos: {
        migrated: result.aos?.migrated || 0,
        errors: result.aos?.errors || 0
      },
      projects: {
        migrated: result.projects?.migrated || 0,
        errors: result.projects?.errors || 0
      }
    };
  }

  /**
   * @deprecated Use consolidatedService.validateMigration()
   */
  async validateAuthenticDataIntegrity(): Promise<{
    success: boolean;
    totalFiles: number;
    totalLines: number;
    validLines: number;
    errors: number;
    warnings: number;
    filesProcessed: string[];
  }> {
    logger.warn('DEPRECATION: validateAuthenticDataIntegrity() is deprecated', {
      metadata: {
        service: 'MondayProductionFinalServiceAdapter',
        method: 'validateAuthenticDataIntegrity',
        alternative: 'validateMigration({ strategyType: "excel_import" })'
      }
    });

    const config: MigrationConfig = {
      strategyType: 'excel_import',
      entityType: 'both'
    };

    const validation = await this.consolidatedService.validateMigration(config);
    const estimate = await this.consolidatedService.estimateMigration(config);

    return {
      success: validation.valid,
      totalFiles: 2, // Default Excel files
      totalLines: estimate.estimatedItems,
      validLines: estimate.estimatedItems,
      errors: validation.errors.length,
      warnings: validation.warnings.length,
      filesProcessed: []
    };
  }
}

// ========================================
// ADAPTER: MondayMigrationServiceEnhanced
// ========================================

/**
 * @deprecated Use MondayMigrationService from server/services/consolidated/MondayMigrationService.ts
 * API migration adapter
 */
export class MondayMigrationServiceEnhancedAdapter {
  private consolidatedService: MondayMigrationService;

  constructor(private storage: IMigrationStorage) {
    this.consolidatedService = new MondayMigrationService(storage);
    
    logger.warn('DEPRECATION WARNING: MondayMigrationServiceEnhanced is deprecated', {
      metadata: {
        service: 'MondayMigrationServiceEnhancedAdapter',
        message: 'Please migrate to MondayMigrationService with api_migration strategy',
        migration: 'Use migrate() with strategyType: "api_migration"'
      }
    });
  }

  /**
   * @deprecated Use consolidatedService.migrate({ strategyType: 'api_migration' })
   */
  async migrate(options: MigrationOptions): Promise<MigrationReport> {
    logger.warn('DEPRECATION: MondayMigrationServiceEnhanced.migrate() is deprecated', {
      metadata: {
        service: 'MondayMigrationServiceEnhancedAdapter',
        method: 'migrate',
        alternative: 'migrate({ strategyType: "api_migration" })'
      }
    });

    const config: MigrationConfig = {
      strategyType: 'api_migration',
      entityType: options.entityType === 'suppliers' ? 'aos' : options.entityType as 'aos' | 'projects',
      source: {
        boardId: options.boardId
      },
      options: {
        dryRun: options.dryRun,
        verbose: options.verbose,
        batchSize: options.batchSize,
        skipExisting: options.skipExisting
      }
    };

    const result = await this.consolidatedService.migrate(config);

    return {
      entityType: result.entityType,
      boardId: config.source?.boardId || '',
      startedAt: result.startedAt,
      completedAt: result.completedAt,
      duration: result.duration,
      totalFetched: result.totalLines,
      totalTransformed: result.totalMigrated,
      totalValidated: result.totalMigrated,
      totalInserted: result.totalMigrated,
      totalSkipped: 0,
      totalErrors: result.totalErrors,
      successful: result.aos?.successful || result.projects?.successful || [],
      skipped: [],
      errors: (result.aos?.failed || result.projects?.failed || []).map(f => ({
        mondayId: f.id,
        error: f.error
      })),
      missingFields: [],
      isDryRun: result.isDryRun,
      preview: []
    };
  }
}

// ========================================
// CONVENIENCE EXPORTS (for drop-in replacement)
// ========================================

/**
 * @deprecated Use MondayMigrationService from server/services/consolidated/MondayMigrationService.ts
 */
export { MondayMigrationServiceLegacyAdapter as MondayMigrationService };

/**
 * @deprecated Use MondayMigrationService with pattern_based strategy
 */
export { MondayProductionMigrationServiceAdapter as MondayProductionMigrationService };

/**
 * @deprecated Use MondayMigrationService with excel_import strategy
 */
export { MondayProductionFinalServiceAdapter as MondayProductionFinalService };

/**
 * @deprecated Use MondayMigrationService with api_migration strategy
 */
export { MondayMigrationServiceEnhancedAdapter as MondayMigrationServiceEnhanced };

// ========================================
// TYPE EXPORTS (for compatibility)
// ========================================

export type {
  LegacyMigrationResult,
  ProductionMigrationResult,
  ProductionFinalMigrationResult,
  MigrationOptions,
  MigrationReport
};
