# Monday Migration Service - Migration Guide

**Version:** 2.0.0  
**Date:** October 30, 2025  
**Status:** Production Ready ✅

## Overview

The consolidated `MondayMigrationService` provides a unified API for all Monday.com migration needs, using a Strategy Pattern to support multiple migration approaches:

- **Excel Import Strategy** (Bulk) - Migrate from authentic Excel exports
- **Pattern-Based Strategy** (Incremental) - Generate data based on analyzed patterns
- **API Migration Strategy** (Delta Sync) - Fetch and sync from Monday.com API

## Architecture

### Strategy Pattern

```
MondayMigrationService (Orchestrator)
├── ExcelImportStrategy (Bulk migration from Excel files)
├── PatternBasedStrategy (Incremental migration with patterns)
└── APIMigrationStrategy (Delta sync from Monday API)
```

### Key Components

1. **IMigrationStrategy Interface** - Base contract for all strategies
2. **Strategy Implementations** - Three concrete strategies
3. **Service Orchestrator** - Auto-selects and executes strategies
4. **History Tracking** - Centralized migration history across all strategies
5. **Backward Compatibility Adapter** - Ensures zero breaking changes

---

## Quick Start

### Basic Usage

```typescript
import { MondayMigrationService } from '@/services/consolidated/MondayMigrationService';
import { storage } from '@/storage';

const migrationService = new MondayMigrationService(storage);

// Simple migration with auto-strategy selection
const result = await migrationService.migrate({
  entityType: 'both', // 'aos' | 'projects' | 'both'
  options: {
    dryRun: true, // Preview without inserting
    verbose: true // Detailed logging
  }
});

console.log(`Migrated: ${result.totalMigrated} items`);
console.log(`Errors: ${result.totalErrors}`);
console.log(`Duration: ${result.duration}ms`);
```

---

## Migration Strategies

### 1. Excel Import Strategy (Bulk Migration)

**When to use:**
- One-time bulk import from Excel exports
- Authentic data from Monday.com exports
- Large-scale initial migration (911 AOs + 1000 projects)

**Features:**
- ✅ Reads authentic Excel exports (`.xlsx` files)
- ✅ Batch processing (100 items per batch)
- ✅ Progress tracking
- ✅ Data validation with Zod schemas
- ✅ French date parsing support

**Example:**

```typescript
const config = {
  strategyType: 'excel_import',
  entityType: 'both',
  source: {
    excelFiles: [
      'attached_assets/export-monday/AO_Planning_1758620539.xlsx',
      'attached_assets/export-monday/CHANTIERS_1758620580.xlsx'
    ]
  },
  options: {
    dryRun: false,
    verbose: true
  }
};

const result = await migrationService.migrate(config);
```

**Validation:**

```typescript
// Validate before running
const validation = await migrationService.validateMigration(config);

if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
  return;
}

// Estimate resources
const estimate = await migrationService.estimateMigration(config);
console.log(`Estimated items: ${estimate.estimatedItems}`);
console.log(`Estimated duration: ${estimate.estimatedDuration}ms`);
```

---

### 2. Pattern-Based Strategy (Incremental Migration)

**When to use:**
- Testing with realistic data
- Incremental data generation
- Development and staging environments

**Features:**
- ✅ Generates realistic data based on analyzed patterns
- ✅ Weighted distribution (clients, cities, categories)
- ✅ Batch processing (50 items per batch)
- ✅ Configurable count

**Example:**

```typescript
const config = {
  strategyType: 'pattern_based',
  entityType: 'both',
  source: {
    count: 1911 // 911 AOs + 1000 projects
  },
  options: {
    batchSize: 50,
    verbose: true
  }
};

const result = await migrationService.migrate(config);
```

**Dry-run mode:**

```typescript
// Preview without inserting
const dryRun = await migrationService.migrate({
  ...config,
  options: { dryRun: true }
});

console.log('Dry-run preview:');
console.log(`Would migrate: ${dryRun.totalMigrated} items`);
console.log(`Expected errors: ${dryRun.totalErrors}`);
```

---

### 3. API Migration Strategy (Delta Sync)

**When to use:**
- Real-time sync from Monday.com
- Delta updates (only changed items)
- Continuous integration workflows

**Features:**
- ✅ Fetches directly from Monday.com API
- ✅ Cursor-based pagination
- ✅ Retry logic for rate limits (429)
- ✅ Transform → Validate → Insert pipeline
- ✅ Skip existing items

**Example:**

```typescript
const config = {
  strategyType: 'api_migration',
  entityType: 'projects',
  source: {
    boardId: '3946257560' // Monday.com board ID
  },
  options: {
    skipExisting: true,
    batchSize: 100,
    verbose: true
  }
};

const result = await migrationService.migrate(config);
```

**Handling rate limits:**

```typescript
// Retry logic is built-in for rate limits (429) and server errors (500+)
// withRetry wrapper automatically handles:
// - 3 retries with exponential backoff
// - Rate limit detection (429 status)
// - Server error retry (500+ status)
```

---

## Strategy Auto-Selection

The service automatically selects the best strategy based on your configuration:

```typescript
// Auto-selects: excel_import
await migrationService.migrate({
  entityType: 'aos',
  source: { excelFiles: ['file.xlsx'] }
});

// Auto-selects: api_migration
await migrationService.migrate({
  entityType: 'projects',
  source: { boardId: '123456' }
});

// Auto-selects: pattern_based
await migrationService.migrate({
  entityType: 'both',
  source: { count: 100 }
});

// Auto-selects: pattern_based (default)
await migrationService.migrate({
  entityType: 'aos'
});
```

---

## Migration History

### Track All Migrations

```typescript
// Get all migration history
const allHistory = migrationService.getMigrationHistory();

console.log(`Total migrations: ${allHistory.length}`);
allHistory.forEach(m => {
  console.log(`${m.migrationId}: ${m.strategyUsed} - ${m.totalMigrated} items`);
});
```

### Filter History

```typescript
// Filter by strategy
const excelMigrations = migrationService.getMigrationHistory({
  strategyType: 'excel_import'
});

// Filter by entity type
const aoMigrations = migrationService.getMigrationHistory({
  entityType: 'aos'
});

// Filter by date range
const recentMigrations = migrationService.getMigrationHistory({
  fromDate: new Date('2025-10-01'),
  toDate: new Date('2025-10-31')
});

// Only successful migrations
const successfulMigrations = migrationService.getMigrationHistory({
  successOnly: true
});

// Limit results
const last10 = migrationService.getMigrationHistory({
  limit: 10
});

// Combine filters
const filtered = migrationService.getMigrationHistory({
  strategyType: 'pattern_based',
  entityType: 'both',
  successOnly: true,
  limit: 5
});
```

---

## Validation and Estimation

### Pre-Migration Validation

```typescript
const config = {
  strategyType: 'excel_import',
  entityType: 'both',
  source: {
    excelFiles: ['file.xlsx']
  }
};

// Validate configuration
const validation = await migrationService.validateMigration(config);

if (!validation.valid) {
  console.error('Validation failed:');
  validation.errors.forEach(err => console.error(`  - ${err}`));
  return;
}

if (validation.warnings.length > 0) {
  console.warn('Warnings:');
  validation.warnings.forEach(warn => console.warn(`  - ${warn}`));
}
```

### Estimate Resources

```typescript
// Estimate before running
const estimate = await migrationService.estimateMigration(config);

console.log(`Recommended strategy: ${estimate.strategyRecommended}`);
console.log(`Estimated items: ${estimate.estimatedItems}`);
console.log(`Estimated duration: ${(estimate.estimatedDuration / 1000).toFixed(1)}s`);

// Confirm with user before large migrations
if (estimate.estimatedItems > 1000) {
  const confirm = await askUserConfirmation(
    `This will migrate ${estimate.estimatedItems} items. Continue?`
  );
  if (!confirm) return;
}
```

---

## Error Handling

### Comprehensive Error Reporting

```typescript
const result = await migrationService.migrate(config);

if (!result.success) {
  console.error('Migration failed!');
  console.error(`Total errors: ${result.totalErrors}`);
  
  // AO errors
  if (result.aos) {
    console.error(`AO errors: ${result.aos.errors}`);
    result.aos.failed.forEach(err => {
      console.error(`  - ${err.id}: ${err.error}`);
    });
  }
  
  // Project errors
  if (result.projects) {
    console.error(`Project errors: ${result.projects.errors}`);
    result.projects.failed.forEach(err => {
      console.error(`  - ${err.id}: ${err.error}`);
    });
  }
  
  // Warnings
  if (result.warnings.length > 0) {
    console.warn('Non-blocking warnings:');
    result.warnings.forEach(warn => console.warn(`  - ${warn}`));
  }
}
```

### Retry Failed Items

```typescript
// Extract failed IDs
const failedAOs = result.aos?.failed.map(f => f.id) || [];
const failedProjects = result.projects?.failed.map(f => f.id) || [];

// Retry with different strategy or configuration
if (failedAOs.length > 0) {
  console.log(`Retrying ${failedAOs.length} failed AOs...`);
  // Implement retry logic
}
```

---

## Backward Compatibility

### Using Legacy Services

The backward compatibility adapter ensures zero breaking changes:

```typescript
// Old code (still works!)
import { 
  MondayMigrationService,
  MondayProductionMigrationService,
  MondayProductionFinalService,
  MondayMigrationServiceEnhanced
} from '@/services/consolidated/adapters/mondayMigrationAdapter';

// Legacy API - automatically mapped to new service
const legacyService = new MondayMigrationService(storage);
const result = await legacyService.migrateAosFromAnalysis(911);

// Production service - automatically mapped
const productionService = new MondayProductionMigrationService(storage);
const prodResult = await productionService.migrateProductionData();

// Final service - automatically mapped
const finalService = new MondayProductionFinalService(storage);
const finalResult = await finalService.migrateProductionMondayData();
```

**Deprecation warnings** will be logged, but functionality remains identical.

---

## Migration Workflow Examples

### Example 1: Full Production Migration

```typescript
// Step 1: Validate Excel files
const config = {
  strategyType: 'excel_import',
  entityType: 'both',
  source: {
    excelFiles: [
      'attached_assets/export-monday/AO_Planning_1758620539.xlsx',
      'attached_assets/export-monday/CHANTIERS_1758620580.xlsx'
    ]
  }
};

const validation = await migrationService.validateMigration(config);
if (!validation.valid) {
  throw new Error('Invalid configuration');
}

// Step 2: Estimate
const estimate = await migrationService.estimateMigration(config);
console.log(`Will migrate ${estimate.estimatedItems} items`);

// Step 3: Dry-run
const dryRun = await migrationService.migrate({
  ...config,
  options: { dryRun: true }
});
console.log('Dry-run results:', dryRun);

// Step 4: Actual migration
const result = await migrationService.migrate(config);

// Step 5: Verify
console.log(`Success: ${result.success}`);
console.log(`Migrated: ${result.totalMigrated}/${result.totalLines}`);
console.log(`Errors: ${result.totalErrors}`);
```

### Example 2: Incremental Testing

```typescript
// Generate test data in batches
for (let batch = 0; batch < 5; batch++) {
  const result = await migrationService.migrate({
    strategyType: 'pattern_based',
    entityType: 'aos',
    source: { count: 100 },
    options: {
      batchSize: 50,
      verbose: false
    }
  });
  
  console.log(`Batch ${batch + 1}: ${result.totalMigrated} items migrated`);
  
  // Wait between batches
  await new Promise(resolve => setTimeout(resolve, 1000));
}
```

### Example 3: API Delta Sync

```typescript
// Scheduled sync every hour
setInterval(async () => {
  console.log('Starting delta sync...');
  
  const result = await migrationService.migrate({
    strategyType: 'api_migration',
    entityType: 'both',
    source: {
      boardId: process.env.MONDAY_BOARD_ID
    },
    options: {
      skipExisting: true, // Only new/updated items
      verbose: false
    }
  });
  
  console.log(`Delta sync complete: ${result.totalMigrated} items`);
  
  // Log to monitoring system
  monitoringService.track('monday_delta_sync', {
    migrated: result.totalMigrated,
    errors: result.totalErrors,
    duration: result.duration
  });
  
}, 3600000); // Every hour
```

---

## Performance Best Practices

### 1. Use Batch Sizes Appropriately

```typescript
// Small datasets: Larger batches
await migrationService.migrate({
  strategyType: 'pattern_based',
  entityType: 'aos',
  source: { count: 100 },
  options: { batchSize: 100 } // All at once
});

// Large datasets: Smaller batches for memory efficiency
await migrationService.migrate({
  strategyType: 'excel_import',
  entityType: 'both',
  source: { excelFiles: ['large_file.xlsx'] },
  options: { batchSize: 50 } // 50 items per batch
});
```

### 2. Use Dry-Run for Large Migrations

```typescript
// Always dry-run first for large migrations
if (estimatedItems > 1000) {
  const dryRun = await migrationService.migrate({
    ...config,
    options: { dryRun: true }
  });
  
  if (dryRun.totalErrors > 0) {
    console.error('Dry-run detected errors. Fix before actual run.');
    return;
  }
}
```

### 3. Monitor Progress

```typescript
// Enable verbose logging for large migrations
await migrationService.migrate({
  ...config,
  options: {
    verbose: true, // Logs progress every 100 items
    batchSize: 100
  }
});
```

---

## Troubleshooting

### Issue: Excel file not found

```typescript
// Error: Excel file not found: path/to/file.xlsx

// Solution: Check file path
const validation = await migrationService.validateMigration(config);
if (!validation.valid) {
  console.error('File errors:', validation.errors);
}
```

### Issue: Rate limit exceeded (429)

```typescript
// Retry logic is automatic, but you can adjust:
// - Reduce batchSize
// - Add delays between API calls
// - Check Monday.com API rate limits

await migrationService.migrate({
  strategyType: 'api_migration',
  source: { boardId: '123456' },
  options: {
    batchSize: 50 // Reduce from default 100
  }
});
```

### Issue: Validation errors

```typescript
// Validation failed: invalid date format

// Check data format in Excel
// Ensure French date format: "DD/MM/YYYY"
// Ensure required fields are present
```

---

## API Reference

### MondayMigrationService

#### `migrate(config: MigrationConfig): Promise<MigrationResult>`

Execute migration with automatic strategy selection.

**Parameters:**
- `config.strategyType?` - Strategy to use (auto-detected if omitted)
- `config.entityType` - Type of entities to migrate
- `config.source?` - Source configuration (Excel files, board ID, count)
- `config.options?` - Migration options (dry-run, verbose, batch size, etc.)

**Returns:** `MigrationResult` with detailed statistics

#### `validateMigration(config: MigrationConfig): Promise<MigrationValidationResult>`

Validate migration configuration before execution.

**Returns:** Validation result with errors and warnings

#### `getMigrationHistory(filters?: MigrationHistoryFilters): MigrationResult[]`

Query migration history with optional filters.

**Returns:** Array of migration results

#### `estimateMigration(config: MigrationConfig): Promise<{ strategyRecommended, estimatedItems, estimatedDuration }>`

Estimate migration resources.

**Returns:** Estimation details

---

## Migration Checklist

Before running a production migration:

- [ ] Validate configuration
- [ ] Estimate resources
- [ ] Run dry-run
- [ ] Review dry-run results
- [ ] Backup existing data
- [ ] Execute migration
- [ ] Verify results
- [ ] Check migration history
- [ ] Monitor for errors
- [ ] Clean up if needed

---

## Support and Feedback

For issues, questions, or feedback:
- See `docs/SERVICES_CONSOLIDATION_AUDIT.md` for consolidation strategy
- Review unit tests in `server/tests/services/MondayMigrationService.test.ts`
- Check backward compatibility adapter for legacy API mapping

**Version History:**
- **2.0.0** (Oct 30, 2025) - Initial consolidated service with Strategy Pattern
- Consolidates 4 legacy migration services
- Backward compatible with zero breaking changes
