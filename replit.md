# Saxium - Application de Chiffrage BTP/Menuiserie

## Overview
Saxium is a fullstack application for quoting and project management in the French construction and joinery sector (BTP/Menuiserie). It aims to improve operational efficiency through advanced automation and AI, featuring OCR analysis of supplier quotes, intelligent planning with DateIntelligence, and AI-driven decision-making.

## Recent Changes

### TypeScript Deployment Fix (Oct 23, 2025)
**Problem**: Replit deployment blocked by 105 TypeScript LSP errors preventing production build
**Solution**: Systematic TypeScript corrections in EventBus and related files
- **EventBus.ts** (28 errors fixed):
  - Added type casting for implicit `any` parameters in filter/map operations
  - Added null checks (`!`) for contextCacheService in predictive preloading methods
  - Converted MapIterator to Array.from() for TypeScript compatibility
- **Build Status**: ✅ Production build now succeeds (`npm run build` passes)
- **Deployment**: ✅ Replit deployment now unblocked
- **Validation**: Architect review confirmed no regressions, healthy runtime behavior

### Monday.com Mapping Enhancement (Oct 27, 2025)
- **Coverage**: 42/51 fields mapped (82.4%) - **+3 colonnes créées** ✅
- **Colonnes créées** (27 Oct 2025):
  - `dropdown_mkx4j6dh` - Catégorie AO (Neuf, Rénovation, Extension, Réhabilitation, Surélévation, Maintenance, Autre)
  - `dropdown_mkx4b61f` - Type Client (Nouveau, Récurrent, Fidèle, Occasionnel, Prospect)
  - `long_text_mkx4s0qw` - Commentaire sélection
- **Board updated**: AO Planning 🖥️ (41 → 47 colonnes)
- **Gap business**: 0 (tous les champs business mappés) ✅
- **New Mappings** (Oct 23): +19 fields including dates, contacts, technical entities, amounts
- **New Column Types**: phone, email, people, hoursTodays transformation
- **Derived Fields**: city + departement extracted from location.address via postal code regex
- **Testing**: Dry-run script `tsx scripts/test-monday-mapping.ts <itemId>` for validation

### Monday.com Frontend Display Improvements (Oct 27, 2025)
- **Coverage Dashboard Added**: New "Couverture Mapping" section in migration dashboard
  - Displays **82.4%** mapping coverage with visual progress bar (backend hook)
  - Breakdown by category: **0 business gaps** ✅, 2 relations, 5 system, 2 alias
  - Auto-refresh every 60s via React Query
  - Lists previously unmapped fields (aoCategory, clientRecurrency, selectionComment) - **NOW COMPLETED** ✅
- **Unmapped Fields UX**: 3 colonnes (aoCategory, clientRecurrency, selectionComment) avec pattern badge conditionnel + tooltip
  - Si mappé : Badge avec valeur / Texte direct
  - Si non mappé (colonnes vides) : Badge "Non mappé" + Info icon + tooltip explicatif
- **Documentation**: Created `MONDAY_MAPPING_GAPS_ANALYSIS.md` with 3 proposed solutions (SOLUTION A IMPLEMENTED)
- **Import Resolution**: Fixed Tooltip conflict (Recharts vs shadcn/ui) with separate imports

### Monday.com Boards & Re-extraction (Oct 27, 2025)
- **Workspace Investigation**: 81 boards discovered in Monday.com workspace (script: `tsx scripts/list-all-monday-boards.ts`)
- **Production Board**: 3946257560 (AO Planning 🖥️) - **833 items**, 47 columns, full 82.4% mapping configuration
- **Template Board**: 8952933832 (Modèle MEXT) - 3 items, 14 columns, limited hardcoded config (5 fields only)
- **Data Issue Resolved**: 
  - Deleted invalid AO template (board 8952934063 doesn't exist - it was an item ID, not a board ID)
  - Created diagnostic script: `tsx scripts/find-monday-item-board.ts <itemId>` to identify parent board
- **Re-extraction API**: New endpoint `POST /api/monday/re-extract-aos` for bulk re-import ✅
  - **Test mode**: `{testMode: true}` limits to 5 AOs for validation
  - **Full mode**: Processes all 836 AOs in batches of 50
  - **Complete extraction**: Uses `MondayDataSplitter.splitItem()` to update AO + contacts + lots + maîtres
  - **Performance optimized**: ~830 Monday API calls (vs 1,600+ before) - eliminated double-fetch by passing pre-fetched items
  - **Rate limit protection**: 1s pause between 50-item batches to respect Monday.com complexity limits
  - **Transaction safety**: All updates atomic (rollback on error)
  - **Validation**: Architect review confirmed acceptable runtime and data integrity for 800+ items

## User Preferences
- Always read `server/utils/README-UTILS.md` before modifying server code.
- Use `asyncHandler` for all new routes.
- Log with context instead of `console.log`/`error`.
- Use typed errors instead of generic `throw new Error`.
- Test after each significant modification.
- Do NOT modify `package.json`, `vite.config.ts`, `drizzle.config.ts` directly.
- Do NOT change ID column types in the schema (serial ↔ varchar).
- Do NOT use `console.log`/`error` in server code (use logger).
- Do NOT create manual SQL migrations (use `db:push`).
- Do NOT add `try-catch` in routes (`asyncHandler` handles it).

## System Architecture
The application uses a modern fullstack architecture with a React, TypeScript, Vite frontend and an Express, TypeScript, Drizzle ORM backend.

### Monday.com Data Mapping Architecture (Oct 2025)

**Configuration-Driven Extraction System**:
- **Board-Specific Configs**: JSON files in `server/services/monday/boardConfigs/` define mappings per Monday board
- **Dynamic Loading**: `getBoardConfig(boardId)` loads appropriate config, fallback to hardcoded defaults
- **Supported Boards**: 
  - `3946257560` (AO Planning 🖥️) - Production board with 828 items, 47 columns → **42 fields mapped (82.4% couverture)**
  - `8952933832` (Modèle MEXT) - Template board (empty), legacy config

**Extractor Pipeline**:
1. **AOBaseExtractor**: Core field mapping (client, location, dates, amounts, statuses)
   - Iterates over `config.mappings.base + config.mappings.metadata`
   - Handles 10+ column types: text, numbers, date, status, dropdown, timeline, location
   - Enum mappings: Monday values → Saxium enums (priority, typeMarche, menuiserieType)
   - Boolean transforms: status values → boolean flags (isSelected)
   - Array wrapping: single values → tags array
   - Default values: source=other, menuiserieType=autre, status=etude
   - Draft detection: isDraft=true if client/montantEstime/dateLimiteRemise missing
2. **ContactExtractor**: People columns → contacts table (MOA, architects)
3. **LotExtractor**: Subitems → lots table
4. **MasterExtractor**: Detects master projects

**Column Type Transformations** (10 types supportés):
- `text` → String
- `numbers` → parseFloat + transformations (hoursTodays: heures→jours via Math.ceil(parsed/8))
- `date` → Date instance with timezone
- `timeline` → {from, to} → split into dateSortieAO + dateLimiteRemise
- `status/dropdown` → Enum mapping via `enumMapping` config + object unwrapping (handles `{text: "..."}` and `{label: "..."}`)
- `location` → Extract address + **derived fields**: city + departement via regex code postal
- `phone` → Extract phone.phone (nouvelle colonne type)
- `email` → Extract email.email or email.text (nouvelle colonne type)
- `people` → Extract people[0].name pour contactAO, skip pour contacts multiples (ContactExtractor)
- `subitems` → Handled by LotExtractor

**Testing**:
```bash
# Test mapping on real Monday item (dry-run, no DB save)
tsx scripts/test-monday-mapping.ts <mondayItemId>

# Example with AO Planning item
tsx scripts/test-monday-mapping.ts 7952357208
```

**Mapping Matrix**: `analysis/MONDAY_TO_SAXIUM_MAPPING_MATRIX.md` tracks 51 Saxium mappable fields
- **Couverture actuelle** : 42/51 champs mappés (**82.4%**) - Objectif Phase 1 (59%) **LARGEMENT DÉPASSÉ** ✅
- **+3 colonnes créées** (Oct 27): aoCategory (dropdown), clientRecurrency (dropdown), selectionComment (long_text)
- **+19 nouveaux mappings** (Oct 23): dates multiples (8), contacts AO (4), entités techniques (3), montants (2), métadonnées (2)
- **+4 nouveaux types** supportés: phone, email, people (contactAO), transformation hoursTodays
- **Extraction dérivée** : city + departement depuis location.address (regex code postal)
- **Champs restants** : 9/51 (0 business ✅, 2 relations, 5 export système, 2 alias)

-   **Frontend**: React, TypeScript, Vite, Wouter, shadcn/ui, Tailwind CSS, Radix UI, React Query, `react-hook-form` with Zod.
-   **Backend**: Express, TypeScript, Drizzle ORM. Features modular routes (`auth`, `chiffrage`, `suppliers`, `projects`, `analytics`, `documents`, `batigest`), a PDF template engine, and Batigest ERP integration.
-   **Database**: PostgreSQL (Neon) with Drizzle ORM.
-   **AI**: Integrates Anthropic Claude, OpenAI, and Tesseract.js for OCR.
-   **Folder Structure**: `client/`, `server/`, `shared/`, `attached_assets/`.
-   **Data Architecture**: Differentiates between "AOs Monday" (read-only client requests) and "Offers Saxium" (active working documents), supporting hybrid ID resolution.
-   **Error Handling**: Unified system with typed errors, `error-handler.ts`, `logger.ts`, and `errorHandler.ts` middleware.
-   **Business Services**: `DateIntelligenceService`, `OCRService`, `AIService`, and `EventBus`.
-   **API Response Handling**: `normalizeApiResponse<T>()` helper for consistent, type-safe API responses.
-   **Testing**: Vitest for unit tests, Playwright for E2E regression tests.
-   **Retry System**: Exponential backoff for external API calls.
-   **Cache System**: `CacheService` with in-memory adapter (Redis-ready), proactive invalidation, and monitoring endpoint.
-   **Correlation IDs**: `AsyncLocalStorage`-based request tracing for observability.
-   **Monday.com Integration**: `MondayExportService` (Saxium→Monday) and secure webhook system (Monday→Saxium) with UI sync indicators.
-   **Draft System**: Allows saving incomplete forms with conditional validation.
-   **Performance Optimizations**:
    -   **Database Indexing**: 17 indexes added across 5 core tables for improved query performance.
    -   **Redis Cache Integration**: Production-ready Redis caching layer with automatic adapter selection and graceful fallback to in-memory.
    -   **Frontend Lazy Loading**: Route-based code splitting for all 52 pages using `React.lazy()`, significantly reducing initial bundle size and improving TTI.
    -   **Database Query Optimization**: Implemented backend pagination (`LIMIT`/`OFFSET`, `LEFT JOIN`) and SQL aggregations for analytics, eliminating N+1 queries and bulk data loads.
    -   **Network Compression**: Express compression middleware (gzip/brotli) activated for API responses, reducing transfer sizes.
-   **Zod v4 Migration**: Completed migration to Zod v4, restoring storage architecture, refactoring `DateAlertDetectionService`, optimizing build, and enhancing production stability with business validations and data transformations.

## External Dependencies
-   **Replit Services**: OIDC authentication, PostgreSQL, Object Storage.
-   **External APIs**:
    -   **Anthropic Claude**: Quote analysis, content generation.
    -   **OpenAI**: Embeddings, chat assistance.
    -   **SendGrid**: Transactional emails.