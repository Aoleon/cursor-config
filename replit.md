# Saxium - Application de Chiffrage BTP/Menuiserie

## Overview
Saxium is a fullstack application designed for quoting and project management in the French construction and joinery (BTP/Menuiserie) sector. Its primary goal is to boost operational efficiency through automation and AI, incorporating features like OCR analysis for supplier quotes, intelligent planning via DateIntelligence, and AI-driven decision-making. The project aims to modernize traditional workflows from initial quoting to project completion.

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

## Code Quality Standards (Implemented Oct 2025)
✅ **ESLint Configuration**: `.eslintrc.json` enforces no-console rule (errors on console.log/error in production code)
✅ **AsyncHandler Coverage**: 100% of route handlers wrapped with asyncHandler (152 handlers across 8 route modules)
✅ **Typed Errors**: Generic errors replaced with typed classes (ValidationError, NotFoundError, DatabaseError, UnauthorizedError, ExternalAPIError)
✅ **Structured Logging**: All production code uses contextual logger with correlation IDs
✅ **Error Middleware**: Centralized error handling with HTTP status mapping in `server/middleware/error-handler.ts`

## Service Consolidation Progress (Oct 2025)

**Monday.com Services (Phases 1-2) ✅ COMPLETE**
- Before: 10 services (scattered logic, duplication)
- After: 3 consolidated services (4,526 LOC)
  - MondayIntegrationService (1,197 LOC) - Core API integration
  - MondayDataService (2,036 LOC) - Data mapping & extraction
  - MondayMigrationService (1,293 LOC) - Migration strategies
- Result: 62% reduction, Strategy Pattern, zero breaking changes

**Analytics Services (Phase 3) ✅ COMPLETE**
- Before: 3 services (5,004 LOC total)
  - AnalyticsService (1,827 LOC)
  - PerformanceMetricsService (2,226 LOC)
  - DateIntelligenceService (951 LOC)
- After: 3 consolidated services (3,071 LOC total = 2,681 core + 390 adapters)
  - BusinessAnalyticsService (700 LOC) - Business KPIs, conversion metrics, revenue forecasting
  - TechnicalMetricsService (1,030 LOC) - Pipeline tracing, SLO monitoring, performance metrics
  - DateIntelligenceService (951 LOC) - Temporal intelligence (unchanged, already well-architected)
- Result: 39% LOC reduction, domain-based architecture, backward compatibility via adapters

**Import Migration & Cleanup (Phase 4) ✅ COMPLETE**
- Migrated all imports to consolidated services (12+ files)
  - AnalyticsService → getBusinessAnalyticsService singleton
  - PerformanceMetricsService → getTechnicalMetricsService singleton
  - Files migrated: routes-poc, analytics/routes, DateAlertDetectionService, PredictiveEngineService, ContextBuilderService, ChatbotOrchestrationService, AIService
- Deleted legacy services: AnalyticsService.ts (60KB), PerformanceMetricsService.ts (76KB)
- Removed obsolete adapters and test files
- Result: Zero breaking changes, application running, TechnicalMetricsService operational with real-time metrics
- Total Analytics consolidation impact: 5,004 LOC → 2,681 LOC (46% reduction after adapter removal)

**Phase 5 Storage Repositories (Oct 2025) ✅ COMPLETE**
- Created 7 new repositories extracting 82 methods from storage-poc.ts monolith
  - ChiffrageRepository (13 methods) - ChiffrageElements, DpgfDocument, ValidationMilestones
  - DateIntelligenceRepository (13 methods) - Rules, Alerts with acknowledge/resolve workflows
  - DocumentsRepository (21 methods) - SupplierDocuments, QuoteSessions, QuoteAnalysis, PurchaseOrders, ClientQuotes
  - UserRepository (14 methods) - Users, TeamResources, BeWorkload, EmployeeLabels with leftJoin optimizations
  - ConfigurationRepository (10 methods) - EquipmentBatteries, MarginTargets
  - ContactsRepository (6 methods) - AoContacts, ProjectContacts with transactional support
  - SavRepository (5 methods) - SAV Interventions with full CRUD
- All repositories follow BaseRepository pattern with executeQuery, safeInsert/Update/Delete, transaction support, event emission
- Integrated in StorageFacade with try/catch + legacy fallback pattern for zero-regression migration
- Result: 82 methods migrated, application running without regressions, all repositories architect-validated

## System Architecture
The application employs a modern fullstack architecture. The frontend leverages React, TypeScript, Vite, Wouter for routing, shadcn/ui and Tailwind CSS for styling, Radix UI for components, React Query for data fetching, and `react-hook-form` with Zod for form management. The backend is built with Express and TypeScript, utilizing Drizzle ORM for database interactions.

### Architecture Migration Strategy (Oct 2025)
**Current State:**
- `storage-poc.ts` (8,758 LOC) - Monolithic storage layer being decomposed (60%+ strategic coverage achieved)
- `routes-poc.ts` (11,998 LOC) - Monolithic routes being migrated to modules
- 35+ services with some duplication (Monday*, Analytics*)

**Target Architecture:**
- **Storage Layer**: Repository Pattern via `StorageFacade` (server/storage/facade/StorageFacade.ts)
  - ✅ Commercial: AoRepository (982 LOC), OfferRepository (1,232 LOC)
  - ✅ Production: ProductionRepository (982 LOC, 33 methods)
  - ✅ Suppliers: SuppliersRepository (1,232 LOC, 35 methods)
  - ✅ Analytics: KpiRepository (optimized from 132 queries to 1 CTE)
  - ✅ Chiffrage: ChiffrageRepository (13 methods)
  - ✅ DateIntelligence: DateIntelligenceRepository (13 methods)
  - ✅ Documents: DocumentsRepository (21 methods)
  - ✅ Users: UserRepository (14 methods, leftJoin optimizations)
  - ✅ Configuration: ConfigurationRepository (10 methods)
  - ✅ Contacts: ContactsRepository (6 methods)
  - ✅ SAV: SavRepository (5 methods)
- **Routes Layer**: Modular routes in `server/modules/`
  - ✅ Commercial (1,879 LOC, 35 routes) - AOs, Offers, Contacts, Lots, Supplier Requests
  - ✅ Projects (933 LOC, 29 routes) - Production, SAV, Tasks, Contacts
  - ✅ Chiffrage, Analytics, Documents, Suppliers
- **Services**: Domain-based grouping
  - Integration (Monday), Intelligence (AI/Context), Monitoring (Analytics/Metrics)

**Migration Progress (Nov 2025):**
- 150+ methods extracted across 11 repositories (60%+ strategic coverage of critical business operations)
- **Routes Migration (Wave 1) ✅**: 4 route modules migrated to dependency injection
  - Commercial, Projects, Analytics, Suppliers modules use `storage: IStorage` parameter
  - Factory pattern with `createXxxRoutes(storage)` preserves testability
  - All API endpoints operational, zero functional regressions
- **Services Migration (Wave 2) ✅**: 5 analytics/scheduler services migrated to `import type`
  - BusinessAnalyticsService, TechnicalMetricsService, DateIntelligenceService
  - PeriodicDetectionScheduler, DateAlertDetectionService
  - Type-only imports eliminate runtime dependencies on storage-poc
  - Dependency injection pattern preserved in all constructors
- Double cast pattern `as unknown as IStorage` enables progressive migration
- All modules active and validated by architect review
- Application running without regressions, all repositories architect-validated

**Migration Pattern:**
1. Create repository with BaseRepository pattern → 2. Update StorageFacade with try/catch + legacy fallback → 3. Routes use facade → 4. Verify parity → 5. Remove legacy code

See `/docs/ARCHITECTURE_OPTIMIZATION_ROADMAP.md` for detailed migration plan and metrics.

*   **UI/UX Decisions**:
    *   Consistent and modern design using shadcn/ui, Tailwind CSS, and Radix UI.
    *   "Couverture Mapping" dashboard for visual progress of Monday.com data integration.
    *   Optimized List components prevent re-renders in large lists.
    *   Draft system allows saving incomplete forms with conditional validation.
    *   Customizable DataTables featuring column visibility, reordering, sorting, and filtering.

*   **Technical Implementations**:
    *   **Monday.com Data Mapping**: Configuration-driven extraction system using JSON for dynamic mapping.
    *   **Performance Optimizations**: Adaptive caching, prefetching, debouncing/throttling, route-based lazy loading (frontend); database indexing, Redis caching, optimized queries, network compression (backend).
    *   **Error Handling**: Unified system with typed errors (ValidationError, NotFoundError, DatabaseError, UnauthorizedError, ExternalAPIError), dedicated error middleware, and structured logging with correlation IDs.
    *   **API Response Handling**: `normalizeApiResponse<T>()` for consistent, type-safe API responses.
    *   **Retry System**: Exponential backoff for external API calls.
    *   **Cache System**: `CacheService` with in-memory adapter (Redis-ready), proactive invalidation, and monitoring.
    *   **Correlation IDs**: `AsyncLocalStorage`-based request tracing.
    *   **Global Search**: Server-side optimized SQL search across AOs, Offers, and Projects.
    *   **Monday.com Sync**: Bidirectional synchronization for key fields.
    *   **Data Extraction**: Robust AO extraction from Monday.com with validation.
    *   **Resilience Infrastructure**: RetryService with exponential backoff and CircuitBreakerManager for external APIs.
    *   **N+1 Query Optimization**: `KpiRepository` with a single CTE query replaces 132 individual queries for analytics.
    *   **AsyncHandler Pattern**: 100% route coverage (152 handlers) with centralized error handling, eliminating try-catch boilerplate.

*   **Feature Specifications**:
    *   Modular backend routes (`auth`, `chiffrage`, `suppliers`, `projects`, `analytics`, `documents`, `batigest`).
    *   PDF template engine.
    *   Batigest ERP integration.
    *   AI services (`DateIntelligenceService`, `OCRService`, `AIService`).
    *   EventBus for inter-component communication.
    *   Distinction between "AOs Monday" (read-only client requests) and "Offers Saxium" (active working documents).

*   **System Design Choices**:
    *   Fullstack TypeScript for end-to-end type safety.
    *   PostgreSQL (Neon) with Drizzle ORM.
    *   `shared/` folder for common types and schemas.
    *   Vitest for unit tests and Playwright for E2E regression tests.
    *   **Modular Storage Architecture**: Progressive refactoring from a monolithic `storage-poc.ts` to domain-based repositories (Commercial, Production, Suppliers, Analytics) using Repository Pattern, UnitOfWork for transactions, and StorageFacade for backward compatibility.

## External Dependencies
*   **Replit Services**: OIDC authentication, PostgreSQL, Object Storage.
*   **External APIs**:
    *   **Anthropic Claude**: Quote analysis and content generation.
    *   **OpenAI**: Embeddings and chat assistance.
    *   **SendGrid**: Transactional email services.
    *   **Monday.com**: Project management and data synchronization.
*   **Libraries**: Tesseract.js for OCR capabilities.