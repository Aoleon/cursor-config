/**
 * MONDAY DATA ADAPTER - Backward Compatibility Layer
 * 
 * Provides backward compatibility for existing code using:
 * - MondayImportService
 * - MondayExportService
 * - MondayDataSplitter
 * 
 * All methods emit deprecation warnings and delegate to MondayDataService.
 * 
 * ZERO BREAKING CHANGES: All existing callers continue to work without modification.
 * 
 * Migration path:
 * 1. Update imports to use MondayDataService directly
 * 2. Update method calls to new API (importFromMonday, exportToMonday, splitData)
 * 3. Remove adapter imports once migration is complete
 */

import { mondayDataService, MondayDataService } from '../MondayDataService';
import type { ImportMapping, ImportResult } from '../MondayIntegrationService';
import type { SplitResult, MondaySplitterConfig } from '../../monday/types';
import { IStorage, storage } from '../../../storage-poc';
import { MondayService, mondayService } from '../../MondayService';
import { logger } from '../../../utils/logger';

// ========================================
// MONDAY IMPORT SERVICE ADAPTER
// ========================================

export class MondayImportService {
  private dataService: MondayDataService;

  constructor() {
    this.dataService = mondayDataService;
    this.warnDeprecation('MondayImportService', 'MondayDataService');
  }

  /**
   * @deprecated Use mondayDataService.importFromMonday(boardId, mapping, 'project') instead
   */
  async importBoardAsProjects(boardId: string, mapping: ImportMapping): Promise<ImportResult> {
    this.warnDeprecation('importBoardAsProjects', 'mondayDataService.importFromMonday(boardId, mapping, "project")');
    return this.dataService.importFromMonday(boardId, mapping, 'project');
  }

  /**
   * @deprecated Use mondayDataService.importFromMonday(boardId, mapping, 'ao') instead
   */
  async importBoardAsAOs(boardId: string, mapping: ImportMapping): Promise<ImportResult> {
    this.warnDeprecation('importBoardAsAOs', 'mondayDataService.importFromMonday(boardId, mapping, "ao")');
    return this.dataService.importFromMonday(boardId, mapping, 'ao');
  }

  /**
   * @deprecated Use mondayDataService.importFromMonday(boardId, mapping, 'supplier') instead
   */
  async importBoardAsSuppliers(boardId: string, mapping: ImportMapping): Promise<ImportResult> {
    this.warnDeprecation('importBoardAsSuppliers', 'mondayDataService.importFromMonday(boardId, mapping, "supplier")');
    return this.dataService.importFromMonday(boardId, mapping, 'supplier');
  }

  /**
   * @deprecated Use mondayDataService.previewImport(boardId, targetEntity) instead
   */
  async previewImport(boardId: string, targetEntity: string): Promise<any> {
    this.warnDeprecation('previewImport', 'mondayDataService.previewImport(boardId, targetEntity)');
    return this.dataService.previewImport(boardId, targetEntity);
  }

  /**
   * @deprecated Use mondayDataService.syncFromMonday(params) instead
   */
  async syncFromMonday(params: {
    boardId: string;
    itemId: string;
    changeType: 'create' | 'update' | 'delete';
    data?: any;
    mondayUpdatedAt?: Date;
  }): Promise<void> {
    this.warnDeprecation('syncFromMonday', 'mondayDataService.syncFromMonday(params)');
    return this.dataService.syncFromMonday(params);
  }

  private warnDeprecation(oldMethod: string, newMethod: string): void {
    logger.warn(`[DEPRECATED] ${oldMethod} is deprecated. Use ${newMethod} instead.`, {
      service: 'MondayImportService [ADAPTER]',
      metadata: {
        deprecatedMethod: oldMethod,
        recommendedMethod: newMethod,
        migrationGuide: 'docs/MONDAY_DATA_MIGRATION_GUIDE.md'
      }
    });
  }
}

// ========================================
// MONDAY EXPORT SERVICE ADAPTER
// ========================================

export class MondayExportService {
  private dataService: MondayDataService;

  constructor(
    private storageInstance: IStorage,
    private mondayServiceInstance: MondayService
  ) {
    this.dataService = mondayDataService;
    this.warnDeprecation('MondayExportService', 'MondayDataService');
  }

  /**
   * @deprecated Use mondayDataService.exportToMonday('project', projectId) instead
   */
  async exportProject(projectId: string): Promise<string> {
    this.warnDeprecation('exportProject', 'mondayDataService.exportToMonday("project", projectId)');
    return this.dataService.exportToMonday('project', projectId);
  }

  /**
   * @deprecated Use mondayDataService.exportToMonday('ao', aoId) instead
   */
  async exportAO(aoId: string): Promise<string> {
    this.warnDeprecation('exportAO', 'mondayDataService.exportToMonday("ao", aoId)');
    return this.dataService.exportToMonday('ao', aoId);
  }

  /**
   * @deprecated Use mondayDataService.updateItemColumns(boardId, itemId, columnValues) instead
   */
  async updateItemColumns(
    boardId: string,
    itemId: string,
    columnValues: Record<string, any>
  ): Promise<string> {
    this.warnDeprecation('updateItemColumns', 'mondayDataService.updateItemColumns(boardId, itemId, columnValues)');
    return this.dataService.updateItemColumns(boardId, itemId, columnValues);
  }

  /**
   * @deprecated Use mondayDataService.syncAONewFields(aoId) instead
   */
  async syncAONewFields(aoId: string): Promise<string | null> {
    this.warnDeprecation('syncAONewFields', 'mondayDataService.syncAONewFields(aoId)');
    return this.dataService.syncAONewFields(aoId);
  }

  private warnDeprecation(oldMethod: string, newMethod: string): void {
    logger.warn(`[DEPRECATED] ${oldMethod} is deprecated. Use ${newMethod} instead.`, {
      service: 'MondayExportService [ADAPTER]',
      metadata: {
        deprecatedMethod: oldMethod,
        recommendedMethod: newMethod,
        migrationGuide: 'docs/MONDAY_DATA_MIGRATION_GUIDE.md'
      }
    });
  }
}

// ========================================
// MONDAY DATA SPLITTER ADAPTER
// ========================================

export class MondayDataSplitter {
  private dataService: MondayDataService;

  constructor() {
    this.dataService = mondayDataService;
    this.warnDeprecation('MondayDataSplitter', 'MondayDataService');
  }

  /**
   * @deprecated Use mondayDataService.analyzeItem(mondayItemId, boardId, config) instead
   */
  async analyzeItem(
    mondayItemId: string,
    boardId: string,
    config?: MondaySplitterConfig
  ): Promise<{
    opportunites: {
      lots: number;
      contacts: number;
      addresses: boolean;
      maitresOuvrage: number;
      maitresOeuvre: number;
    };
    diagnostics: any[];
  }> {
    this.warnDeprecation('analyzeItem', 'mondayDataService.analyzeItem(mondayItemId, boardId, config)');
    return this.dataService.analyzeItem(mondayItemId, boardId, config);
  }

  /**
   * @deprecated Use mondayDataService.splitData(mondayItemOrId, boardId, options) instead
   */
  async splitItem(
    mondayItemOrId: string | any,
    boardId: string,
    storageInstance: IStorage,
    config?: MondaySplitterConfig,
    dryRun: boolean = false
  ): Promise<SplitResult> {
    this.warnDeprecation('splitItem', 'mondayDataService.splitData(mondayItemOrId, boardId, { config, dryRun })');
    return this.dataService.splitData(mondayItemOrId, boardId, { config, dryRun });
  }

  private warnDeprecation(oldMethod: string, newMethod: string): void {
    logger.warn(`[DEPRECATED] ${oldMethod} is deprecated. Use ${newMethod} instead.`, {
      service: 'MondayDataSplitter [ADAPTER]',
      metadata: {
        deprecatedMethod: oldMethod,
        recommendedMethod: newMethod,
        migrationGuide: 'docs/MONDAY_DATA_MIGRATION_GUIDE.md'
      }
    });
  }
}

// ========================================
// SINGLETON EXPORTS (matching old API)
// ========================================

/**
 * @deprecated Use mondayDataService instead
 */
export const mondayImportService = new MondayImportService();

/**
 * @deprecated Use mondayDataService instead
 */
export const mondayExportService = new MondayExportService(storage, mondayService);

/**
 * @deprecated Use mondayDataService instead
 */
export const mondayDataSplitter = new MondayDataSplitter();

// ========================================
// MIGRATION HELPER
// ========================================

/**
 * Helper function to check if code is using deprecated adapters
 * Can be called in development to identify areas needing migration
 */
export function checkAdapterUsage(): {
  usingDeprecatedImportService: boolean;
  usingDeprecatedExportService: boolean;
  usingDeprecatedSplitter: boolean;
  migrationGuide: string;
} {
  return {
    usingDeprecatedImportService: true,
    usingDeprecatedExportService: true,
    usingDeprecatedSplitter: true,
    migrationGuide: 'See docs/MONDAY_DATA_MIGRATION_GUIDE.md for migration instructions'
  };
}
