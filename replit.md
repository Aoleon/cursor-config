# Saxium - Application de Chiffrage BTP/Menuiserie

## Overview
Saxium is a fullstack application for quoting and project management in the French construction and joinery (BTP/Menuiserie) sector. Its core purpose is to enhance operational efficiency through automation and AI, including OCR analysis of supplier quotes, intelligent planning via DateIntelligence, and AI-driven decision-making. The project aims to modernize traditional workflows from initial quoting to project completion, offering a significant boost in productivity and accuracy.

## Migration Status (Wave 8 Complete - November 2025)
**Repository Pattern Migration: 91.2% Complete** 🎉
- **Original**: 11,998 LOC in monolithic routes-poc.ts
- **Current**: 1,055 LOC remaining in routes-poc.ts
- **Migrated**: 10,943 LOC across 20 modular routes
- **Active Modules**: 20 production-ready modules following factory pattern
- **Wave 8 Achievement**: -2,489 LOC removed (70.2% reduction in Wave 8 alone)
- **LSP Diagnostics**: Improved 30% (124 → 87 errors in routes-poc.ts)
- **Architecture**: 100% dependency injection, zero TypeScript compilation errors

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
The application features a modern fullstack architecture. The frontend uses React, TypeScript, Vite, Wouter, shadcn/ui, Tailwind CSS, Radix UI, React Query, and `react-hook-form` with Zod. The backend is built with Express and TypeScript, leveraging Drizzle ORM for PostgreSQL.

**UI/UX Decisions**:
*   Consistent and modern design using shadcn/ui, Tailwind CSS, and Radix UI.
*   "Couverture Mapping" dashboard for visual progress of Monday.com data integration.
*   Optimized List components prevent re-renders in large lists.
*   Draft system allows saving incomplete forms with conditional validation.
*   Customizable DataTables featuring column visibility, reordering, sorting, and filtering.

**Technical Implementations**:
*   **Modular Backend (20 Active Modules)**: Routes organized following factory pattern `createXxxRoutes(storage: IStorage, eventBus: EventBus)`:
    - **Core Business**: `chiffrage`, `commercial`, `projects`, `batigest`
    - **Operations**: `suppliers`, `documents`, `aftersales` (NEW in Wave 8 - reserves, SAV, warranty)
    - **Analytics & Performance**: `analytics` (extended in Wave 8 with AI performance metrics)
    - **Administration**: `auth`, `system`, `configuration`, `admin`, `ops`, `team`, `hr`
    - **Stakeholders**: `stakeholders` (extended in Wave 8 with AO/project contacts)
    - **AI & Automation**: `chatbot`, `alerts`, `testing`
    - **Integrations**: `monday` (data sync dashboard, import fixes Nov 2025)
*   **AI Services**: Integration of `DateIntelligenceService`, `OCRService`, and `AIService`.
*   **Error Handling**: Unified system with typed errors, dedicated error middleware, and structured logging with correlation IDs.
*   **Performance Optimizations**: Adaptive caching, prefetching, debouncing/throttling (frontend); database indexing, Redis caching, optimized queries (backend).
*   **Data Synchronization**: Bidirectional sync with Monday.com, configuration-driven data mapping.
*   **N+1 Query Optimization**: `KpiRepository` uses a single CTE for analytics, replacing multiple queries.
*   **Asynchronous Operations**: `asyncHandler` pattern for all routes ensures consistent error handling.
*   **API Response Handling**: `normalizeApiResponse<T>()` for consistent, type-safe API responses.
*   **Resilience**: Retry system with exponential backoff and CircuitBreakerManager for external APIs.
*   **Correlation IDs**: `AsyncLocalStorage`-based request tracing.
*   **Global Search**: Server-side optimized SQL search across key entities.
*   **PDF Engine**: Integrated PDF template engine.

**Feature Specifications**:
*   Distinction between "AOs Monday" (read-only client requests) and "Offers Saxium" (active working documents).
*   Batigest ERP integration.
*   EventBus for inter-component communication.

**Recent Changes (November 2025)**:
*   **OneDrive Integration** ✅ **PRODUCTION-READY**: Intégration OneDrive comme GED centrale (3 novembre 2025)
    - **Routes opérationnelles** (module Commercial):
      - `GET /api/aos/:aoId/documents` : Liste les documents depuis OneDrive (`OneDrive-JLM/01 - ETUDES AO/AO-{reference}/`)
      - `POST /api/aos/:aoId/documents/upload-url` : Prépare l'upload vers OneDrive (legacy, pour compatibilité)
      - `POST /api/aos/:aoId/documents/upload-direct` : Upload multipart avec multer + sauvegarde automatique en DB ✅ **NEW**
      - `POST /api/aos/:aoId/documents` : Confirmation upload avec validation Zod (folderName, fileName, oneDriveId, webUrl requis)
    - **Architecture**: 
      - Import dynamique de `OneDriveService` dans les routes
      - Gestion d'erreurs avec messages explicites (404/503)
      - Multer configuré avec memoryStorage (50MB max)
      - Upload automatique petits fichiers (<4MB) et gros fichiers (≥4MB) avec chunks 320KB
    - **Mapping catégories**: Organisation automatique des documents par dossier (01-DCE-Cotes-Photos, 02-Etudes-fournisseurs, 03-Devis-pieces-administratives)
    - **Schéma DB**: Champs OneDrive (oneDriveId, oneDrivePath, oneDriveUrl, syncedFromOneDrive, lastSyncedAt)
    - **Storage Layer**: 
      - ✅ `createDocument()` implémenté dans IStorage + DatabaseStorage
      - ✅ Sauvegarde automatique des métadonnées après upload OneDrive
    - **OneDrive Service**: 
      - `uploadSmallFile()` pour fichiers <4MB
      - `uploadLargeFile()` pour fichiers ≥4MB avec resumable upload session
      - ✅ **FIX**: Parse final chunk response pour gérer les fichiers renommés (conflit OneDrive)
    - **TODO**: DocumentSyncService pour synchronisation automatique OneDrive → DB
    - **Services**: `OneDriveService` (listItems, uploadSmallFile, uploadLargeFile) et `MicrosoftAuthService` (MSAL authentication)
*   **Monday.com Import Fixes** ✅ **PRODUCTION-READY**: 11 critical corrections to ensure data integrity
    - Added `mondayItemId` tracking in all imports (Projects, AOs, Suppliers)
    - Fixed webhook sync to use correct field (`mondayItemId` vs `mondayId`)
    - Implemented Zod validation before all `storage.create*()` calls
    - Added upsert strategy with O(1) lookup via `getProjectByMondayItemId()`, `getAOByMondayItemId()`, `getSupplierByMondayItemId()`
    - Fixed decimal→string coercion via `coerceDecimalToString()` helper for Postgres compatibility (montantEstime, montantFinal, budget, amountEstimate)
    - Eliminated N+1 queries and full table scans in import loops
    - Implemented all getXxxByMondayItemId() in both DatabaseStorage and MemStorage
    - **NULL-HANDLING FIX**: `coerceDecimalToString()` now preserves `null` (not `undefined`) to allow clearing decimal fields on re-import
    - **DRIZZLE COMPATIBILITY**: `removeUndefined()` applied uniformly before Zod validation and before storage calls for all 3 entities
    - **TELEMETRY ACCURACY**: EventBus now emits correct CREATE vs UPDATE events (PROJECT_CREATED/UPDATED, OFFER_CREATED/UPDATED) with accurate logging
    - **EVENTTYPES FIX**: Added missing `PROJECT_UPDATED`, `OFFER_UPDATED`, `AO_CREATED`, `AO_STATUS_CHANGED` in EventType enum and eventMessageTemplates (fixed "event unknown" bug)
*   **Monday.com Import Regression Test Suite** ✅ **PRODUCTION-READY**: E2E test suite with 100% pass rate
    - **Location**: `tests/integration/monday-import-regression.test.ts`
    - **Status**: **13/13 tests passing (100%)** validated by architect
    - **Coverage**: Projects, AOs, Suppliers imports with EventBus telemetry validation
    - **Test Scenarios**:
      - ✅ Projects Import (3 tests): CREATE/UPDATE events, upsert strategy, NULL handling
      - ✅ AOs Import (2 tests): OFFER_CREATED/UPDATED events, upsert
      - ✅ Suppliers Import (2 tests): import + no duplicates on re-import
      - ✅ Error Handling (3 tests): Zod validation, API failures, removeUndefined
      - ✅ EventBus Telemetry (3 tests): correct types, metadata, no "unknown" events
    - **Purpose**: Prevent regression of 11 critical corrections, continuous validation of import pipeline
    - **CI/CD Integration**: ✅ GitHub Actions configured (`.github/workflows/ci.yml`)
*   **Pipeline CI/CD** ✅ **CONFIGURÉ**: Validation automatique sur push/PR
    - **Workflow**: `.github/workflows/ci.yml` (GitHub Actions)
    - **Déclenchement**: Push ou PR sur branches `main` et `develop`
    - **Jobs**:
      - Type checking TypeScript (`npm run check`)
      - Tests Monday.com import regression (13/13 passing)
      - Tous tests backend avec couverture (seuils: 86% lines/statements/functions, 81% branches)
      - Upload artefacts de couverture (rétention 30 jours)
    - **Cache**: npm cache pour accélérer builds
    - **Documentation**: `TESTING.md` (guide complet CLI, debugging, patterns)
    - **Commandes**:
      ```bash
      # Tests Monday.com uniquement
      npx vitest run --config vitest.backend.config.ts tests/integration/monday-import-regression.test.ts
      
      # Tous tests backend
      npx vitest run --config vitest.backend.config.ts
      
      # Avec couverture
      npx vitest run --coverage --config vitest.backend.config.ts
      ```

**System Design Choices**:
*   Fullstack TypeScript for end-to-end type safety.
*   PostgreSQL (Neon) with Drizzle ORM.
*   `shared/` folder for common types and schemas.
*   Vitest for unit tests and Playwright for E2E regression tests.
*   **Modular Storage Architecture**: Progressive refactoring from a monolithic storage layer to domain-based repositories (Commercial, Production, Suppliers, Analytics, etc.) using the Repository Pattern, Unit of Work for transactions, and StorageFacade for backward compatibility.

## External Dependencies
*   **Replit Services**: OIDC authentication, PostgreSQL, Object Storage.
*   **External APIs**:
    *   **Anthropic Claude**: Quote analysis and content generation.
    *   **OpenAI**: Embeddings and chat assistance.
    *   **SendGrid**: Transactional email services.
    *   **Monday.com**: Project management and data synchronization.
*   **Libraries**: Tesseract.js for OCR capabilities.