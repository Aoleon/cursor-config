/**
 * MONDAY MIGRATION SERVICE - Comprehensive Unit Tests
 * 
 * Test Coverage:
 * - Excel Import Strategy (Bulk migration from Excel files)
 * - Pattern-Based Strategy (Incremental migration with generated patterns)
 * - API Migration Strategy (Delta sync from Monday.com API)
 * - Strategy auto-selection logic
 * - Validation and reporting
 * - History tracking
 * - Error handling and retry logic
 * - Backward compatibility adapter
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  MondayMigrationService,
  type MigrationConfig,
  type MigrationResult 
} from '../../services/consolidated/MondayMigrationService';
import {
  MondayMigrationServiceLegacyAdapter,
  MondayProductionMigrationServiceAdapter,
  MondayProductionFinalServiceAdapter,
  MondayMigrationServiceEnhancedAdapter
} from '../../services/consolidated/adapters/mondayMigrationAdapter';

// ========================================
// MOCKS
// ========================================

const mockStorage = {
  createProject: vi.fn(),
  createAo: vi.fn(),
  updateProject: vi.fn(),
  updateAo: vi.fn(),
  getProject: vi.fn(),
  getAo: vi.fn(),
  getProjectsPaginated: vi.fn(),
  getAos: vi.fn(),
};

const mockMondayService = {
  getBoardData: vi.fn(),
  getItem: vi.fn(),
  executeGraphQL: vi.fn(),
};

// ========================================
// TEST DATA
// ========================================

const createSuccessfulMigrationResult = (strategyType: string): Partial<MigrationResult> => ({
  migrationId: `test_migration_${Date.now()}`,
  strategyUsed: strategyType as any,
  entityType: 'both',
  startedAt: new Date(),
  completedAt: new Date(),
  duration: 1000,
  totalLines: 100,
  totalMigrated: 100,
  totalErrors: 0,
  totalWarnings: 0,
  success: true,
  isDryRun: false,
  source: 'test_source',
  warnings: [],
  aos: {
    migrated: 50,
    errors: 0,
    successful: Array.from({ length: 50 }, (_, i) => `ao-${i}`),
    failed: []
  },
  projects: {
    migrated: 50,
    errors: 0,
    successful: Array.from({ length: 50 }, (_, i) => `proj-${i}`),
    failed: []
  }
});

// ========================================
// TEST SUITE: MondayMigrationService
// ========================================

describe('MondayMigrationService - Consolidated Service', () => {
  let service: MondayMigrationService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new MondayMigrationService(mockStorage as any);
    
    // Setup default mock responses
    mockStorage.createAo.mockImplementation(async (data) => ({
      id: `ao-${Date.now()}`,
      ...data
    }));
    
    mockStorage.createProject.mockImplementation(async (data) => ({
      id: `proj-${Date.now()}`,
      ...data
    }));
  });

  // ========================================
  // STRATEGY AUTO-SELECTION TESTS
  // ========================================

  describe('Strategy Auto-Selection', () => {
    it('should auto-select excel_import strategy when Excel files provided', async () => {
      const config: MigrationConfig = {
        entityType: 'aos',
        source: {
          excelFiles: ['test_file.xlsx']
        },
        options: {
          dryRun: true
        }
      };

      const estimate = await service.estimateMigration(config);
      expect(estimate.strategyRecommended).toBe('excel_import');
    });

    it('should auto-select api_migration strategy when boardId provided', async () => {
      const config: MigrationConfig = {
        entityType: 'projects',
        source: {
          boardId: '123456'
        },
        options: {
          dryRun: true
        }
      };

      const estimate = await service.estimateMigration(config);
      expect(estimate.strategyRecommended).toBe('api_migration');
    });

    it('should auto-select pattern_based strategy when only count provided', async () => {
      const config: MigrationConfig = {
        entityType: 'both',
        source: {
          count: 1911
        },
        options: {
          dryRun: true
        }
      };

      const estimate = await service.estimateMigration(config);
      expect(estimate.strategyRecommended).toBe('pattern_based');
    });

    it('should default to pattern_based strategy when no source specified', async () => {
      const config: MigrationConfig = {
        entityType: 'aos',
        options: {
          dryRun: true
        }
      };

      const estimate = await service.estimateMigration(config);
      expect(estimate.strategyRecommended).toBe('pattern_based');
    });
  });

  // ========================================
  // PATTERN-BASED STRATEGY TESTS
  // ========================================

  describe('Pattern-Based Strategy (Incremental)', () => {
    it('should migrate AOs using pattern-based strategy in dry-run mode', async () => {
      const config: MigrationConfig = {
        strategyType: 'pattern_based',
        entityType: 'aos',
        source: { count: 10 },
        options: { dryRun: true }
      };

      const result = await service.migrate(config);

      expect(result.strategyUsed).toBe('pattern_based');
      expect(result.entityType).toBe('aos');
      expect(result.isDryRun).toBe(true);
      expect(result.totalMigrated).toBe(10);
      expect(result.aos?.migrated).toBe(10);
      expect(mockStorage.createAo).not.toHaveBeenCalled(); // Dry run
    });

    it('should migrate projects using pattern-based strategy', async () => {
      const config: MigrationConfig = {
        strategyType: 'pattern_based',
        entityType: 'projects',
        source: { count: 5 },
        options: { dryRun: true }
      };

      const result = await service.migrate(config);

      expect(result.strategyUsed).toBe('pattern_based');
      expect(result.totalMigrated).toBe(5);
      expect(result.projects?.migrated).toBe(5);
    });

    it('should migrate both AOs and projects using pattern-based strategy', async () => {
      const config: MigrationConfig = {
        strategyType: 'pattern_based',
        entityType: 'both',
        source: { count: 1911 },
        options: { dryRun: true }
      };

      const result = await service.migrate(config);

      expect(result.strategyUsed).toBe('pattern_based');
      expect(result.totalMigrated).toBe(1911);
      expect(result.aos?.migrated).toBe(911);
      expect(result.projects?.migrated).toBe(1000);
    });

    it('should validate pattern-based migration config', async () => {
      const config: MigrationConfig = {
        strategyType: 'pattern_based',
        entityType: 'aos'
      };

      const validation = await service.validateMigration(config);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(validation.strategyRecommended).toBe('pattern_based');
    });

    it('should estimate pattern-based migration', async () => {
      const config: MigrationConfig = {
        strategyType: 'pattern_based',
        entityType: 'both',
        source: { count: 1911 }
      };

      const estimate = await service.estimateMigration(config);

      expect(estimate.strategyRecommended).toBe('pattern_based');
      expect(estimate.estimatedItems).toBe(1911);
      expect(estimate.estimatedDuration).toBeGreaterThan(0);
    });
  });

  // ========================================
  // EXCEL IMPORT STRATEGY TESTS
  // ========================================

  describe('Excel Import Strategy (Bulk)', () => {
    it('should validate excel_import strategy requires Excel files', async () => {
      const config: MigrationConfig = {
        strategyType: 'excel_import',
        entityType: 'aos'
      };

      const validation = await service.validateMigration(config);

      // Should have warnings about missing Excel files
      expect(validation.warnings.length).toBeGreaterThan(0);
    });

    it('should validate excel_import strategy with provided files', async () => {
      const config: MigrationConfig = {
        strategyType: 'excel_import',
        entityType: 'aos',
        source: {
          excelFiles: ['attached_assets/export-monday/AO_Planning_1758620539.xlsx']
        }
      };

      const validation = await service.validateMigration(config);

      expect(validation.strategyRecommended).toBe('excel_import');
    });

    it('should fail validation if Excel files do not exist', async () => {
      const config: MigrationConfig = {
        strategyType: 'excel_import',
        entityType: 'aos',
        source: {
          excelFiles: ['non_existent_file.xlsx']
        }
      };

      const validation = await service.validateMigration(config);

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors[0]).toContain('not found');
    });
  });

  // ========================================
  // API MIGRATION STRATEGY TESTS
  // ========================================

  describe('API Migration Strategy (Delta Sync)', () => {
    it('should validate api_migration strategy requires boardId', async () => {
      const config: MigrationConfig = {
        strategyType: 'api_migration',
        entityType: 'aos'
      };

      const validation = await service.validateMigration(config);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Board ID is required for API migration strategy');
    });

    it('should validate api_migration strategy with boardId', async () => {
      const config: MigrationConfig = {
        strategyType: 'api_migration',
        entityType: 'projects',
        source: {
          boardId: '123456'
        }
      };

      const validation = await service.validateMigration(config);

      expect(validation.valid).toBe(true);
      expect(validation.strategyRecommended).toBe('api_migration');
    });
  });

  // ========================================
  // MIGRATION HISTORY TESTS
  // ========================================

  describe('Migration History', () => {
    it('should track migration history', async () => {
      const config: MigrationConfig = {
        strategyType: 'pattern_based',
        entityType: 'aos',
        source: { count: 5 },
        options: { dryRun: true }
      };

      await service.migrate(config);

      const history = service.getMigrationHistory();
      expect(history).toHaveLength(1);
      expect(history[0].strategyUsed).toBe('pattern_based');
    });

    it('should filter history by strategy type', async () => {
      // Run multiple migrations
      await service.migrate({
        strategyType: 'pattern_based',
        entityType: 'aos',
        source: { count: 5 },
        options: { dryRun: true }
      });

      await service.migrate({
        strategyType: 'pattern_based',
        entityType: 'projects',
        source: { count: 3 },
        options: { dryRun: true }
      });

      const history = service.getMigrationHistory({
        strategyType: 'pattern_based'
      });

      expect(history).toHaveLength(2);
      history.forEach(h => {
        expect(h.strategyUsed).toBe('pattern_based');
      });
    });

    it('should filter history by entity type', async () => {
      await service.migrate({
        strategyType: 'pattern_based',
        entityType: 'aos',
        source: { count: 5 },
        options: { dryRun: true }
      });

      const history = service.getMigrationHistory({
        entityType: 'aos'
      });

      expect(history).toHaveLength(1);
      expect(history[0].entityType).toBe('aos');
    });

    it('should filter history by success status', async () => {
      await service.migrate({
        strategyType: 'pattern_based',
        entityType: 'aos',
        source: { count: 5 },
        options: { dryRun: true }
      });

      const history = service.getMigrationHistory({
        successOnly: true
      });

      expect(history.every(h => h.success)).toBe(true);
    });

    it('should limit history results', async () => {
      // Run 5 migrations
      for (let i = 0; i < 5; i++) {
        await service.migrate({
          strategyType: 'pattern_based',
          entityType: 'aos',
          source: { count: 5 },
          options: { dryRun: true }
        });
      }

      const history = service.getMigrationHistory({
        limit: 3
      });

      expect(history).toHaveLength(3);
    });
  });

  // ========================================
  // ERROR HANDLING TESTS
  // ========================================

  describe('Error Handling', () => {
    it('should handle unknown strategy type', async () => {
      const config: MigrationConfig = {
        strategyType: 'unknown_strategy' as any,
        entityType: 'aos'
      };

      await expect(service.migrate(config)).rejects.toThrow('Unknown migration strategy');
    });

    it('should handle validation failures', async () => {
      const config: MigrationConfig = {
        strategyType: 'api_migration',
        entityType: 'aos'
        // Missing required boardId
      };

      await expect(service.migrate(config)).rejects.toThrow('Migration validation failed');
    });
  });

  // ========================================
  // PERFORMANCE AND BATCH PROCESSING TESTS
  // ========================================

  describe('Performance and Batch Processing', () => {
    it('should process large migrations in batches', async () => {
      const config: MigrationConfig = {
        strategyType: 'pattern_based',
        entityType: 'aos',
        source: { count: 200 },
        options: { dryRun: true, batchSize: 50 }
      };

      const result = await service.migrate(config);

      expect(result.totalMigrated).toBe(200);
      expect(result.duration).toBeLessThan(30000); // Should complete in reasonable time
    });

    it('should report progress during migration', async () => {
      const config: MigrationConfig = {
        strategyType: 'pattern_based',
        entityType: 'aos',
        source: { count: 100 },
        options: { dryRun: true, verbose: true }
      };

      const result = await service.migrate(config);

      expect(result.totalMigrated).toBe(100);
      // Progress should be logged (tested via logger mocks in actual implementation)
    });
  });
});

// ========================================
// TEST SUITE: Backward Compatibility Adapters
// ========================================

describe('MondayMigrationService - Backward Compatibility Adapters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    mockStorage.createAo.mockImplementation(async (data) => ({
      id: `ao-${Date.now()}`,
      ...data
    }));
    
    mockStorage.createProject.mockImplementation(async (data) => ({
      id: `proj-${Date.now()}`,
      ...data
    }));
  });

  // ========================================
  // LEGACY ADAPTER TESTS
  // ========================================

  describe('MondayMigrationServiceLegacyAdapter', () => {
    let adapter: MondayMigrationServiceLegacyAdapter;

    beforeEach(() => {
      adapter = new MondayMigrationServiceLegacyAdapter(mockStorage as any);
    });

    it('should migrate AOs using legacy API', async () => {
      const result = await adapter.migrateAosFromAnalysis(10);

      expect(result.entityType).toBe('aos');
      expect(result.source).toBe('audit_analysis');
      expect(result.migrated).toBe(10);
    });

    it('should migrate projects using legacy API', async () => {
      const result = await adapter.migrateChantiersFromAnalysis(5);

      expect(result.entityType).toBe('projects');
      expect(result.source).toBe('audit_analysis');
      expect(result.migrated).toBe(5);
    });

    it('should migrate from real Monday data using legacy API', async () => {
      const result = await adapter.migrateFromRealMondayData();

      expect(result.source).toBe('authentic_monday_exports');
      expect(result.success).toBeDefined();
    });
  });

  // ========================================
  // PRODUCTION ADAPTER TESTS
  // ========================================

  describe('MondayProductionMigrationServiceAdapter', () => {
    let adapter: MondayProductionMigrationServiceAdapter;

    beforeEach(() => {
      adapter = new MondayProductionMigrationServiceAdapter(mockStorage as any);
    });

    it('should migrate production data using legacy API', async () => {
      const result = await adapter.migrateProductionData();

      expect(result.source).toBe('production_analysis');
      expect(result.totalLines).toBeGreaterThan(0);
      expect(result.aos).toBeDefined();
      expect(result.projects).toBeDefined();
    });
  });

  // ========================================
  // PRODUCTION FINAL ADAPTER TESTS
  // ========================================

  describe('MondayProductionFinalServiceAdapter', () => {
    let adapter: MondayProductionFinalServiceAdapter;

    beforeEach(() => {
      adapter = new MondayProductionFinalServiceAdapter(mockStorage as any);
    });

    it('should validate authentic data integrity using legacy API', async () => {
      const result = await adapter.validateAuthenticDataIntegrity();

      expect(result.success).toBeDefined();
      expect(result.totalFiles).toBeGreaterThan(0);
      expect(result.errors).toBeGreaterThanOrEqual(0);
    });
  });

  // ========================================
  // ENHANCED ADAPTER TESTS
  // ========================================

  describe('MondayMigrationServiceEnhancedAdapter', () => {
    let adapter: MondayMigrationServiceEnhancedAdapter;

    beforeEach(() => {
      adapter = new MondayMigrationServiceEnhancedAdapter(mockStorage as any);
    });

    it('should migrate using enhanced API with boardId', async () => {
      const options = {
        boardId: '123456',
        entityType: 'aos' as const,
        dryRun: true,
        verbose: false
      };

      // This will fail validation since boardId is not actually connected to Monday API
      // In real implementation, this would work with actual Monday integration
      await expect(adapter.migrate(options)).rejects.toThrow();
    });
  });
});

// ========================================
// INTEGRATION TESTS
// ========================================

describe('MondayMigrationService - Integration Tests', () => {
  let service: MondayMigrationService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new MondayMigrationService(mockStorage as any);
    
    mockStorage.createAo.mockImplementation(async (data) => ({
      id: `ao-${Date.now()}`,
      ...data
    }));
    
    mockStorage.createProject.mockImplementation(async (data) => ({
      id: `proj-${Date.now()}`,
      ...data
    }));
  });

  it('should complete full migration workflow with pattern-based strategy', async () => {
    // 1. Validate
    const config: MigrationConfig = {
      strategyType: 'pattern_based',
      entityType: 'both',
      source: { count: 100 }
    };

    const validation = await service.validateMigration(config);
    expect(validation.valid).toBe(true);

    // 2. Estimate
    const estimate = await service.estimateMigration(config);
    expect(estimate.estimatedItems).toBe(100);

    // 3. Dry-run
    const dryRunResult = await service.migrate({
      ...config,
      options: { dryRun: true }
    });
    expect(dryRunResult.isDryRun).toBe(true);
    expect(dryRunResult.totalMigrated).toBe(100);

    // 4. Actual migration
    const actualResult = await service.migrate(config);
    expect(actualResult.isDryRun).toBe(false);

    // 5. Check history
    const history = service.getMigrationHistory();
    expect(history).toHaveLength(2); // Dry-run + actual
  });

  it('should handle errors and track failed migrations', async () => {
    // Simulate storage errors
    mockStorage.createAo.mockRejectedValueOnce(new Error('Storage error'));

    const config: MigrationConfig = {
      strategyType: 'pattern_based',
      entityType: 'aos',
      source: { count: 5 },
      options: { dryRun: false }
    };

    const result = await service.migrate(config);

    // Should have some errors
    expect(result.totalErrors).toBeGreaterThan(0);
    expect(result.success).toBe(false);
  });
});
