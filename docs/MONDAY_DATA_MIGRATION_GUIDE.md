# Monday Data Service Migration Guide

**Date:** October 30, 2025  
**Version:** 1.0.0  
**Status:** ✅ Complete

## Overview

This guide helps migrate from the legacy data services to the consolidated **MondayDataService**. Phase 1.2 consolidates three services into a unified data transformation pipeline:

| Legacy Service | New Service | Status |
|---|---|---|
| `MondayImportService` | `MondayDataService` | ✅ Consolidated |
| `MondayExportService` | `MondayDataService` | ✅ Consolidated |
| `MondayDataSplitter` | `MondayDataService` | ✅ Consolidated |

**Key Benefits:**
- 🎯 Unified API for all Monday ↔ Saxium data operations
- 📦 Reduced code duplication (~1,800 LOC consolidated)
- 🔧 Consistent error handling and logging
- ✅ Full backward compatibility via adapter
- 🧪 Comprehensive test coverage

---

## Quick Migration

### 1. Update Imports

**Before (Legacy Services):**
```typescript
import { mondayImportService } from '../services/MondayImportService';
import { mondayExportService } from '../services/MondayExportService';
import { mondayDataSplitter } from '../services/MondayDataSplitter';
```

**After (Consolidated Service):**
```typescript
import { mondayDataService } from '../services/consolidated/MondayDataService';
```

### 2. Update Method Calls

#### Import Operations

**Before:**
```typescript
// Import as projects
const result = await mondayImportService.importBoardAsProjects(boardId, mapping);

// Import as AOs
const result = await mondayImportService.importBoardAsAOs(boardId, mapping);

// Import as suppliers
const result = await mondayImportService.importBoardAsSuppliers(boardId, mapping);
```

**After:**
```typescript
// Import as projects
const result = await mondayDataService.importFromMonday(boardId, mapping, 'project');

// Import as AOs
const result = await mondayDataService.importFromMonday(boardId, mapping, 'ao');

// Import as suppliers
const result = await mondayDataService.importFromMonday(boardId, mapping, 'supplier');
```

#### Export Operations

**Before:**
```typescript
// Export project
const mondayId = await mondayExportService.exportProject(projectId);

// Export AO
const mondayId = await mondayExportService.exportAO(aoId);

// Update columns
const mondayId = await mondayExportService.updateItemColumns(boardId, itemId, columnValues);
```

**After:**
```typescript
// Export project
const mondayId = await mondayDataService.exportToMonday('project', projectId);

// Export AO  
const mondayId = await mondayDataService.exportToMonday('ao', aoId);

// Export with options
const mondayId = await mondayDataService.exportToMonday('ao', aoId, {
  boardId: '123456',
  updateIfExists: true,
  syncNewFields: true
});

// Update columns (unchanged)
const mondayId = await mondayDataService.updateItemColumns(boardId, itemId, columnValues);
```

#### Data Splitting

**Before:**
```typescript
// Analyze item
const analysis = await mondayDataSplitter.analyzeItem(itemId, boardId, config);

// Split item
const result = await mondayDataSplitter.splitItem(itemId, boardId, storage, config, dryRun);
```

**After:**
```typescript
// Analyze item
const analysis = await mondayDataService.analyzeItem(itemId, boardId, config);

// Split item
const result = await mondayDataService.splitData(itemId, boardId, {
  config,
  dryRun,
  validateBeforeSplit: true
});
```

---

## API Reference

### Core Methods

#### `importFromMonday()`
Import Monday.com board items as Saxium entities.

```typescript
async importFromMonday(
  boardId: string,
  mapping: ImportMapping,
  targetEntity: 'project' | 'ao' | 'supplier' = 'project'
): Promise<ImportResult>
```

**Parameters:**
- `boardId`: Monday.com board ID
- `mapping`: Column mapping configuration
- `targetEntity`: Target Saxium entity type

**Returns:** `ImportResult`
```typescript
{
  success: boolean;
  importedCount: number;
  errors: string[];
  createdIds: string[];
}
```

**Example:**
```typescript
const mapping: ImportMapping = {
  mondayBoardId: '3946257560',
  targetEntity: 'ao',
  columnMappings: [
    { mondayColumnId: 'status7', saxiumField: 'operationalStatus' },
    { mondayColumnId: 'client', saxiumField: 'client' },
    { mondayColumnId: 'text', saxiumField: 'location' },
  ]
};

const result = await mondayDataService.importFromMonday('3946257560', mapping, 'ao');

if (result.success) {
  console.log(`Imported ${result.importedCount} items`);
  console.log(`Created IDs:`, result.createdIds);
} else {
  console.error(`Errors:`, result.errors);
}
```

#### `exportToMonday()`
Export Saxium entity to Monday.com.

```typescript
async exportToMonday(
  entityType: 'project' | 'ao',
  entityId: string,
  options?: ExportOptions
): Promise<string>
```

**Parameters:**
- `entityType`: Type of entity to export
- `entityId`: Saxium entity ID
- `options`: Export configuration

**Options:**
```typescript
{
  boardId?: string;           // Target board ID (defaults to env var)
  updateIfExists?: boolean;   // Update if already exported (default: false)
  syncNewFields?: boolean;    // Sync new AO fields (default: false)
}
```

**Returns:** Monday.com item ID

**Example:**
```typescript
// Export new AO
const mondayId = await mondayDataService.exportToMonday('ao', 'ao-123');

// Export and sync new fields
const mondayId = await mondayDataService.exportToMonday('ao', 'ao-123', {
  boardId: '3946257560',
  updateIfExists: true,
  syncNewFields: true
});

console.log(`Exported to Monday ID: ${mondayId}`);
```

#### `splitData()`
Split Monday.com item into multiple Saxium entities.

```typescript
async splitData(
  mondayItemOrId: string | any,
  boardId: string,
  options?: SplitOptions
): Promise<SplitResult>
```

**Parameters:**
- `mondayItemOrId`: Monday item ID or pre-fetched item object
- `boardId`: Board ID for configuration lookup
- `options`: Splitting configuration

**Options:**
```typescript
{
  dryRun?: boolean;                // Test without saving (default: false)
  config?: MondaySplitterConfig;   // Custom mapping config
  validateBeforeSplit?: boolean;   // Validate required fields (default: true)
}
```

**Returns:** `SplitResult`
```typescript
{
  success: boolean;
  aoId?: string;
  aoCreated: boolean;
  aoUpdated?: boolean;
  lotsCreated: number;
  contactsCreated: number;
  mastersCreated: number;
  diagnostics: SplitterDiagnostic[];
  extractedData?: any;  // Only populated in dry-run mode
}
```

**Example:**
```typescript
// Dry run to test extraction
const dryRunResult = await mondayDataService.splitData('8826157033', '3946257560', {
  dryRun: true,
  validateBeforeSplit: true
});

if (dryRunResult.success) {
  console.log('Extracted data:', dryRunResult.extractedData);
  console.log('Would create:', {
    ao: !!dryRunResult.extractedData.ao,
    lots: dryRunResult.extractedData.lots.length,
    contacts: dryRunResult.extractedData.contacts.length,
  });
}

// Real split with persistence
const result = await mondayDataService.splitData('8826157033', '3946257560', {
  dryRun: false
});

console.log(`AO created: ${result.aoCreated ? 'Yes' : 'No (updated)'}`);
console.log(`Lots created: ${result.lotsCreated}`);
console.log(`Contacts created: ${result.contactsCreated}`);
console.log(`Masters created: ${result.mastersCreated}`);
```

#### `validateMapping()`
Validate import mapping configuration.

```typescript
validateMapping(mapping: ImportMapping): ValidationResult
```

**Returns:** `ValidationResult`
```typescript
{
  valid: boolean;
  errors: string[];
  warnings: string[];
}
```

**Example:**
```typescript
const mapping: ImportMapping = {
  mondayBoardId: '3946257560',
  targetEntity: 'ao',
  columnMappings: [
    { mondayColumnId: 'status7', saxiumField: 'operationalStatus' },
  ]
};

const validation = mondayDataService.validateMapping(mapping);

if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
}

if (validation.warnings.length > 0) {
  console.warn('Validation warnings:', validation.warnings);
}
```

#### `transformItem()`
Transform single Monday item using mapping.

```typescript
transformItem(
  item: MondayItem,
  mapping: ImportMapping,
  options?: TransformOptions
): any
```

**Options:**
```typescript
{
  validateDates?: boolean;      // Validate and parse Monday date format
  validateEnums?: boolean;      // Validate enum values
  applyDefaults?: boolean;      // Apply default values
  skipInvalidFields?: boolean;  // Skip fields that fail validation
}
```

**Example:**
```typescript
const item = await mondayIntegrationService.getItem('123456');

const transformed = mondayDataService.transformItem(item, mapping, {
  validateDates: true,
  skipInvalidFields: true
});

console.log('Transformed data:', transformed);
```

#### `previewImport()`
Preview import with suggested column mappings.

```typescript
async previewImport(boardId: string, targetEntity: string): Promise<PreviewResult>
```

**Returns:** `PreviewResult`
```typescript
{
  boardName: string;
  itemCount: number;
  columns: any[];
  suggestedMappings: any[];
}
```

**Example:**
```typescript
const preview = await mondayDataService.previewImport('3946257560', 'ao');

console.log(`Board: ${preview.boardName}`);
console.log(`Items: ${preview.itemCount}`);
console.log(`Suggested mappings:`, preview.suggestedMappings);

// Use suggested mappings
const mapping: ImportMapping = {
  mondayBoardId: '3946257560',
  targetEntity: 'ao',
  columnMappings: preview.suggestedMappings.map(s => ({
    mondayColumnId: s.mondayColumnId,
    saxiumField: s.saxiumField
  }))
};
```

---

## Common Patterns

### Import Workflow

```typescript
// 1. Preview import
const preview = await mondayDataService.previewImport(boardId, 'ao');

// 2. Build mapping from suggestions
const mapping: ImportMapping = {
  mondayBoardId: boardId,
  targetEntity: 'ao',
  columnMappings: preview.suggestedMappings.filter(s => s.confidence === 'high')
};

// 3. Validate mapping
const validation = mondayDataService.validateMapping(mapping);
if (!validation.valid) {
  throw new Error(`Invalid mapping: ${validation.errors.join(', ')}`);
}

// 4. Import
const result = await mondayDataService.importFromMonday(boardId, mapping, 'ao');

// 5. Handle results
console.log(`Imported ${result.importedCount}/${preview.itemCount} items`);
if (result.errors.length > 0) {
  console.error('Import errors:', result.errors);
}
```

### Bi-directional Sync

```typescript
// Saxium → Monday (Export)
async function syncToMonday(aoId: string) {
  try {
    const mondayId = await mondayDataService.exportToMonday('ao', aoId, {
      updateIfExists: true,
      syncNewFields: true
    });
    
    console.log(`Synced AO ${aoId} to Monday ${mondayId}`);
  } catch (error) {
    console.error(`Failed to sync AO ${aoId}:`, error);
  }
}

// Monday → Saxium (Import webhook)
async function handleMondayWebhook(payload: any) {
  await mondayDataService.syncFromMonday({
    boardId: payload.boardId,
    itemId: payload.itemId,
    changeType: payload.event.type,
    mondayUpdatedAt: new Date(payload.event.timestamp)
  });
}
```

### Data Splitting Pipeline

```typescript
async function processMonday AoItem(itemId: string, boardId: string) {
  // 1. Analyze opportunities
  const analysis = await mondayDataService.analyzeItem(itemId, boardId);
  
  console.log('Splitting opportunities:', {
    lots: analysis.opportunites.lots,
    contacts: analysis.opportunites.contacts,
    masters: analysis.opportunites.maitresOuvrage + analysis.opportunites.maitresOeuvre
  });
  
  // 2. Dry run to validate
  const dryRun = await mondayDataService.splitData(itemId, boardId, {
    dryRun: true,
    validateBeforeSplit: true
  });
  
  if (!dryRun.success) {
    console.error('Validation failed:', dryRun.diagnostics);
    return;
  }
  
  // 3. Real split
  const result = await mondayDataService.splitData(itemId, boardId);
  
  console.log('Split result:', {
    aoId: result.aoId,
    created: result.aoCreated,
    lots: result.lotsCreated,
    contacts: result.contactsCreated,
    masters: result.mastersCreated
  });
  
  return result;
}
```

---

## Backward Compatibility

For gradual migration, a **backward compatibility adapter** is provided. This allows existing code to work without changes while you migrate to the new API.

### Using the Adapter

```typescript
// Legacy imports still work
import { 
  mondayImportService, 
  mondayExportService, 
  mondayDataSplitter 
} from '../services/consolidated/adapters/mondayDataAdapter';

// All old methods work exactly as before
const result = await mondayImportService.importBoardAsProjects(boardId, mapping);
```

**Note:** The adapter emits deprecation warnings in logs to help identify areas needing migration.

### Gradual Migration Strategy

1. ✅ **Phase 1:** Start using new `MondayDataService` in new code
2. ⏳ **Phase 2:** Migrate existing code file-by-file
3. ⏳ **Phase 3:** Remove adapter once all code is migrated

---

## Breaking Changes

✅ **NONE** - The adapter ensures complete backward compatibility.

If migrating to the new API directly:

| Change | Old API | New API |
|---|---|---|
| Import projects | `importBoardAsProjects()` | `importFromMonday(boardId, mapping, 'project')` |
| Import AOs | `importBoardAsAOs()` | `importFromMonday(boardId, mapping, 'ao')` |
| Export project | `exportProject()` | `exportToMonday('project', projectId)` |
| Export AO | `exportAO()` | `exportToMonday('ao', aoId)` |
| Split item | `splitItem(id, boardId, storage, config, dryRun)` | `splitData(id, boardId, { config, dryRun })` |

---

## Testing Your Migration

### Unit Tests

```typescript
import { describe, it, expect } from 'vitest';
import { mondayDataService } from '../services/consolidated/MondayDataService';

describe('Migration to MondayDataService', () => {
  it('should import Monday items as AOs', async () => {
    const mapping: ImportMapping = {
      mondayBoardId: '123',
      targetEntity: 'ao',
      columnMappings: [
        { mondayColumnId: 'client', saxiumField: 'client' }
      ]
    };
    
    const result = await mondayDataService.importFromMonday('123', mapping, 'ao');
    
    expect(result.success).toBe(true);
    expect(result.importedCount).toBeGreaterThan(0);
  });
});
```

### Integration Tests

```typescript
// Test complete workflow
it('should export AO and sync new fields', async () => {
  const ao = await storage.createAo({
    reference: 'AO-TEST-001',
    menuiserieType: 'fenetre',
    source: 'other',
    dateLivraisonPrevue: new Date('2025-12-01'),
    dateOS: new Date('2025-11-15'),
    cctp: 'Test CCTP'
  });
  
  // Export to Monday
  const mondayId = await mondayDataService.exportToMonday('ao', ao.id, {
    syncNewFields: true
  });
  
  expect(mondayId).toBeTruthy();
  
  // Verify sync
  const updatedAo = await storage.getAo(ao.id);
  expect(updatedAo?.mondayId).toBe(mondayId);
});
```

---

## Troubleshooting

### Issue: Import returns empty results

**Cause:** Mapping configuration doesn't match board columns

**Solution:**
```typescript
// Use preview to check actual column IDs
const preview = await mondayDataService.previewImport(boardId, 'ao');
console.log('Available columns:', preview.columns);

// Build mapping from actual columns
const mapping: ImportMapping = {
  mondayBoardId: boardId,
  targetEntity: 'ao',
  columnMappings: preview.columns.map(col => ({
    mondayColumnId: col.id,
    saxiumField: col.title.toLowerCase().replace(/\s+/g, '_')
  }))
};
```

### Issue: Export fails with "already exported"

**Cause:** Item has existing mondayId and `updateIfExists` is false

**Solution:**
```typescript
// Force update
const mondayId = await mondayDataService.exportToMonday('ao', aoId, {
  updateIfExists: true
});
```

### Issue: Split fails with validation errors

**Cause:** Required fields missing from Monday item

**Solution:**
```typescript
// Disable validation for migration
const result = await mondayDataService.splitData(itemId, boardId, {
  validateBeforeSplit: false
});

// Or check diagnostics
const dryRun = await mondayDataService.splitData(itemId, boardId, {
  dryRun: true
});

console.log('Validation diagnostics:', dryRun.diagnostics.filter(d => d.level === 'error'));
```

---

## Best Practices

### 1. Always Preview Before Import

```typescript
// ❌ Bad: Import without checking
const result = await mondayDataService.importFromMonday(boardId, mapping, 'ao');

// ✅ Good: Preview first
const preview = await mondayDataService.previewImport(boardId, 'ao');
if (preview.itemCount === 0) {
  console.warn('No items to import');
  return;
}

const result = await mondayDataService.importFromMonday(boardId, mapping, 'ao');
```

### 2. Validate Mappings

```typescript
// ✅ Always validate
const validation = mondayDataService.validateMapping(mapping);
if (!validation.valid) {
  throw new Error(`Invalid mapping: ${validation.errors.join(', ')}`);
}
```

### 3. Use Dry Run for Testing

```typescript
// ✅ Test with dry run first
const dryRun = await mondayDataService.splitData(itemId, boardId, {
  dryRun: true
});

if (dryRun.success) {
  // Now do real split
  const result = await mondayDataService.splitData(itemId, boardId);
}
```

### 4. Handle Errors Gracefully

```typescript
try {
  const result = await mondayDataService.importFromMonday(boardId, mapping, 'ao');
  
  if (!result.success) {
    logger.error('Import failed', {
      importedCount: result.importedCount,
      errors: result.errors
    });
    
    // Handle partial success
    if (result.importedCount > 0) {
      logger.info(`Partial import: ${result.importedCount} items imported`);
    }
  }
} catch (error) {
  logger.error('Import exception', { error });
  throw error;
}
```

---

## Support

- **Documentation:** This guide + JSDoc in source code
- **Examples:** `server/tests/services/MondayDataService.test.ts`
- **Audit:** `docs/SERVICES_CONSOLIDATION_AUDIT.md`

---

**Last Updated:** October 30, 2025  
**Version:** 1.0.0 (Phase 1.2 Complete)
