# Monday.com Integration Migration Guide

## Overview

This guide helps you migrate from the legacy Monday.com services to the new consolidated `MondayIntegrationService`.

**Consolidation completed:** October 30, 2025  
**Phase:** Phase 1 - Service Creation & Backward Compatibility  
**Breaking changes:** None (backward compatibility maintained via adapter)

## What Changed?

### Before (3 separate services)
- `MondayService` (709 LOC) - GraphQL execution, caching, types
- `MondayWebhookService` (137 LOC) - Webhook handlers
- `MondaySchemaAnalyzer` (396 LOC) - Board structure analysis

### After (1 unified service)
- `MondayIntegrationService` (~1,100 LOC) - All Monday.com functionality

## Migration Paths

### Option 1: Use Backward Compatibility Adapter (Recommended for now)

**No changes required!** The adapter maintains full backward compatibility.

Your existing code will continue to work:

```typescript
// These imports still work via the adapter
import { mondayService } from '../services/MondayService';
import { mondayWebhookService } from '../services/MondayWebhookService';
import { getMondaySchemaAnalyzer } from '../services/MondaySchemaAnalyzer';

// Existing code continues to work
const boards = await mondayService.getBoards();
await mondayWebhookService.processWebhook(payload);
const analyzer = getMondaySchemaAnalyzer();
```

**Note:** You'll see deprecation warnings in logs to help identify code that should be migrated.

### Option 2: Migrate to New Service (Recommended for new code)

For new code or when updating existing files, use the consolidated service:

```typescript
// New import
import { mondayIntegrationService } from '../services/consolidated/MondayIntegrationService';

// Same functionality, cleaner API
const boards = await mondayIntegrationService.getBoards();
await mondayIntegrationService.handleWebhook(payload);
const structure = await mondayIntegrationService.getBoardStructure('123');
```

## API Mapping Reference

### MondayService → MondayIntegrationService

| Old API | New API | Notes |
|---------|---------|-------|
| `mondayService.getBoards(limit)` | `mondayIntegrationService.getBoards(limit)` | Same signature |
| `mondayService.getBoardColumns(boardId)` | `mondayIntegrationService.getBoardColumns(boardId)` | Same signature |
| `mondayService.getBoardItems(boardId, limit)` | `mondayIntegrationService.getBoardItems(boardId, limit)` | Same signature |
| `mondayService.getBoardItemsPaginated(boardId, limit)` | `mondayIntegrationService.getBoardItemsPaginated(boardId, limit)` | Same signature |
| `mondayService.getBoardData(boardId)` | `mondayIntegrationService.getBoardData(boardId)` | Same signature |
| `mondayService.getItem(itemId)` | `mondayIntegrationService.getItem(itemId)` | Same signature |
| `mondayService.testConnection()` | `mondayIntegrationService.testConnection()` | Same signature |
| `mondayService.extractColumnValue(columnValue)` | `mondayIntegrationService.extractColumnValue(columnValue)` | Same signature |

### MondayWebhookService → MondayIntegrationService

| Old API | New API | Notes |
|---------|---------|-------|
| `mondayWebhookService.processWebhook(payload)` | `mondayIntegrationService.handleWebhook(payload)` | ⚠️ Method renamed |

**Breaking change:** `processWebhook` → `handleWebhook` (adapter handles this)

### MondaySchemaAnalyzer → MondayIntegrationService

| Old API | New API | Notes |
|---------|---------|-------|
| `analyzer.analyzeBoards(boardIds?)` | `mondayIntegrationService.analyzeBoards(boardIds?)` | Same signature |
| `analyzer.analyzeBoardStructure(boardId, boardName?)` | `mondayIntegrationService.getBoardStructure(boardId, boardName?)` | ⚠️ Method renamed |
| `analyzer.suggestMappings(structure, fields)` | `mondayIntegrationService.suggestMappings(structure, fields)` | Same signature |
| `analyzer.invalidateBoardCache(boardId)` | `mondayIntegrationService.invalidateBoardCache(boardId)` | Same signature |
| `getMondaySchemaAnalyzer()` | N/A | Use singleton directly |

**Breaking change:** `analyzeBoardStructure` → `getBoardStructure` (adapter handles this)

## Type Exports

All types are re-exported from the consolidated service:

```typescript
// All these types are available from the new service
import type {
  MondayBoard,
  MondayColumn,
  MondayItem,
  MondayColumnValue,
  MondayBoardData,
  ImportMapping,
  ImportResult,
  BoardColumnMetadata,
  BoardStructure,
  BoardAnalysisResult
} from '../services/consolidated/MondayIntegrationService';
```

## Migration Examples

### Example 1: Simple Board Fetch

**Before:**
```typescript
import { mondayService } from '../services/MondayService';

async function fetchBoards() {
  const boards = await mondayService.getBoards(50);
  return boards;
}
```

**After:**
```typescript
import { mondayIntegrationService } from '../services/consolidated/MondayIntegrationService';

async function fetchBoards() {
  const boards = await mondayIntegrationService.getBoards(50);
  return boards;
}
```

### Example 2: Webhook Processing

**Before:**
```typescript
import { mondayWebhookService } from '../services/MondayWebhookService';

async function handleWebhook(req, res) {
  await mondayWebhookService.processWebhook(req.body);
  res.status(200).send('OK');
}
```

**After:**
```typescript
import { mondayIntegrationService } from '../services/consolidated/MondayIntegrationService';

async function handleWebhook(req, res) {
  await mondayIntegrationService.handleWebhook(req.body);
  res.status(200).send('OK');
}
```

### Example 3: Board Structure Analysis

**Before:**
```typescript
import { getMondaySchemaAnalyzer } from '../services/MondaySchemaAnalyzer';

async function analyzeBoard(boardId: string) {
  const analyzer = getMondaySchemaAnalyzer();
  const structure = await analyzer.analyzeBoardStructure(boardId);
  return structure;
}
```

**After:**
```typescript
import { mondayIntegrationService } from '../services/consolidated/MondayIntegrationService';

async function analyzeBoard(boardId: string) {
  const structure = await mondayIntegrationService.getBoardStructure(boardId);
  return structure;
}
```

### Example 4: Complex Usage with Multiple Methods

**Before:**
```typescript
import { mondayService } from '../services/MondayService';
import { getMondaySchemaAnalyzer } from '../services/MondaySchemaAnalyzer';
import type { MondayBoard } from '../services/MondayService';

async function getBoardWithAnalysis(boardId: string) {
  const data = await mondayService.getBoardData(boardId);
  const analyzer = getMondaySchemaAnalyzer();
  const structure = await analyzer.analyzeBoardStructure(boardId);
  
  return {
    data,
    structure
  };
}
```

**After:**
```typescript
import { mondayIntegrationService } from '../services/consolidated/MondayIntegrationService';
import type { MondayBoardData, BoardStructure } from '../services/consolidated/MondayIntegrationService';

async function getBoardWithAnalysis(boardId: string) {
  const data = await mondayIntegrationService.getBoardData(boardId);
  const structure = await mondayIntegrationService.getBoardStructure(boardId);
  
  return {
    data,
    structure
  };
}
```

## Features Preserved

✅ **All original functionality maintained:**
- GraphQL query execution with retry & circuit breaker (via `resilience.ts`)
- Request caching with configurable TTL (via `CacheService`)
- Correlation ID propagation for tracing (via `correlation.ts`)
- Webhook event deduplication (idempotence)
- Board structure analysis with caching
- Field mapping suggestions
- Column value type extraction

✅ **Performance optimizations:**
- Same caching strategies (10min board list, 5min board detail)
- Efficient pagination for large boards
- Circuit breaker prevents cascading failures

✅ **Logging & observability:**
- Structured logging with context
- Correlation ID tracking
- Operation-level metrics

## Testing

The consolidated service includes comprehensive unit tests:

```bash
# Run Monday integration tests
npm test -- server/tests/services/MondayIntegrationService.test.ts

# Run all backend tests
npm test
```

**Test coverage:**
- ✅ GraphQL execution with mocking
- ✅ Board, column, and item retrieval
- ✅ Caching behavior
- ✅ Webhook handling and idempotence
- ✅ Board structure analysis
- ✅ Field mapping suggestions
- ✅ Error handling and resilience

## Rollout Plan

### Phase 1: Service Creation & Backward Compatibility ✅ **COMPLETE**
- Create `MondayIntegrationService` (Done)
- Create backward compatibility adapter (Done)
- Unit tests (Done)
- Documentation (Done)

### Phase 2: Gradual Migration (Planned)
- Update imports in 23+ dependent files
- Remove deprecation adapter
- Delete old service files

### Phase 3: Optimization (Future)
- Further consolidation with MondayDataService
- Enhanced caching strategies
- Additional performance optimizations

## Troubleshooting

### Issue: "Cannot find module MondayIntegrationService"

**Solution:** Ensure you're importing from the correct path:
```typescript
import { mondayIntegrationService } from '../services/consolidated/MondayIntegrationService';
```

### Issue: TypeScript errors after migration

**Solution:** Make sure to import types from the new service:
```typescript
import type { MondayBoard, MondayItem } from '../services/consolidated/MondayIntegrationService';
```

### Issue: Deprecation warnings in logs

**Expected behavior.** These warnings help identify code using the legacy adapter that should be migrated. They don't affect functionality.

To silence warnings (not recommended):
```typescript
// Still works but shows warnings
import { mondayService } from '../services/MondayService';

// Migrate to remove warnings
import { mondayIntegrationService } from '../services/consolidated/MondayIntegrationService';
```

## Support

For questions or issues related to the Monday.com integration consolidation:

1. Check this migration guide
2. Review `docs/SERVICES_CONSOLIDATION_AUDIT.md` for architecture details
3. Check unit tests in `server/tests/services/MondayIntegrationService.test.ts` for usage examples

## Summary

- ✅ **Backward compatibility:** All existing code continues to work
- ✅ **No breaking changes:** Adapter maintains exact same API
- ✅ **Gradual migration:** Migrate at your own pace
- ✅ **Full test coverage:** Comprehensive unit tests included
- ✅ **Documentation:** Complete API reference and examples

**For new code:** Use `mondayIntegrationService` from `server/services/consolidated/MondayIntegrationService`

**For existing code:** Continue using current imports (they work via adapter) and migrate when convenient
