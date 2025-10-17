# Saxium - Application de Chiffrage BTP/Menuiserie

## Overview
Saxium is a fullstack application designed for quoting and project management in the French construction and joinery (BTP/Menuiserie) sector. Its primary goal is to enhance operational efficiency through advanced automation and AI capabilities. Key features include OCR analysis of supplier quotes, intelligent planning generation using DateIntelligence, and AI-driven decision-making tools. The project aims to address significant market needs in the BTP/Menuiserie sector by improving operational efficiency and project management through advanced technology.

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
The application features a modern fullstack architecture.
- **Frontend**: Built with React, TypeScript, Vite, Wouter for routing, shadcn/ui, Tailwind CSS, and Radix UI. It leverages React Query for data fetching and `react-hook-form` with Zod for form management, incorporating `data-testid` for testing.
- **Backend**: Implemented using Express, TypeScript, and Drizzle ORM.
  - **Modular Routes**: Refactored into 7 modules: `auth`, `chiffrage`, `suppliers`, `projects`, `analytics`, `documents`, and `batigest`.
  - **PDF Template Engine**: A robust system for template-based PDF generation including `PDFTemplateEngine`, `PlaceholderResolver`, `ImageIntegrator`, `LayoutOptimizer`, and `TemplateValidator`.
  - **Batigest Integration System**: A file-based synchronization system with Sage Batigest ERP using `BatigestExportService`, HTML PDF templates, and a PowerShell script for automated polling and import. Frontend provides generators for purchase orders and client quotes, and a real-time dashboard.
- **Database**: PostgreSQL, hosted on Neon, managed with Drizzle ORM for schema definition and migrations.
- **AI**: Integrates Anthropic Claude and OpenAI for advanced functionalities, complemented by Tesseract.js for OCR.
- **Folder Structure**: Divided into `client/` for frontend, `server/` for backend, `shared/` for common code (e.g., Drizzle schema and Zod types), and `attached_assets/` for static assets.
- **Error Handling**: A unified system utilizing `error-handler.ts`, `logger.ts`, and `errorHandler.ts` middleware provides typed errors.
- **Business Services**: Includes `DateIntelligenceService` for intelligent project planning, `OCRService` for text extraction, `AIService` for structured quote analysis, and an `EventBus` for inter-service coordination.
- **API Response Handling**: Centralized `normalizeApiResponse<T>()` helper ensures consistent and type-safe handling of all API responses.
- **Testing Infrastructure**: Includes Vitest for unit tests and Playwright for E2E regression tests.
  - **E2E Workflow Tests**: Comprehensive Playwright tests for critical workflows:
    - `ao-complete.spec.ts`: AO creation → OCR → lots extraction → supplier workflow (100% UI-driven)
    - `fournisseur-quote-complete.spec.ts`: Supplier quote workflow with robust Map-based bookkeeping (hybrid UI/API with TODOs for missing UI components)
    - `monday-sync-bidirectional.spec.ts`: Monday.com sync bidirectionnelle complète (11 scénarios production-ready):
      - Export Saxium → Monday (projets/AOs) avec validation badges UI
      - Import Monday → Saxium via webhook HMAC-SHA256 sécurisé
      - Webhook idempotence renforcé (eventId cache avec timestamps proof)
      - Gestion conflicts Monday-priority avec audit logging
      - Persistence restart-safe (cache rebuild DB)
      - EventBus notifications WebSocket temps-réel
- **Retry System**: Unified exponential backoff retry mechanism (`server/utils/retry-helper.ts`) with automatic retry for network errors, rate limits (429), and server errors (5xx) across all external API services (Monday.com, Claude, OpenAI).
- **Intelligent Cache System**: Centralized CacheService with in-memory adapter (Redis-ready architecture) for frequent queries:
  - Monday.com boards cached (10min TTL)
  - Analytics KPIs/metrics cached (1-2min TTL)
  - EventBus-driven proactive invalidation on data changes
  - Monitoring endpoint `/api/monitoring/cache` for hit/miss metrics
  - Automated cache warmup on startup
- **Correlation IDs System**: AsyncLocalStorage-based request tracing for complete end-to-end observability:
  - Automatic UUID v4 generation for all HTTP requests
  - Transparent logger enrichment with `[cid:xxxxxxxx]` format
  - Header propagation to external APIs (Monday.com, Claude, OpenAI)
  - Monitoring endpoint with `correlationId` filter for debugging
- **Monday.com Export System**: MondayExportService provides idempotent Saxium→Monday export for projects/AOs:
  - Automatic EventBus triggers on `project:created`, `ao:created` events
  - Manual export endpoints with retry logic and correlation tracking
  - GraphQL mutations with exponential backoff (3 retries)
  - Success/failure notifications via EventBus (`monday:export:success`, `monday:export:failed`)
- **Monday.com Webhook System**: Secure webhook endpoint for Monday→Saxium synchronization:
  - POST `/api/monday/webhook` with HMAC-SHA256 signature validation (base64, timing-safe)
  - Idempotence via eventId cache (Set, 1000 events max)
  - Rate limiting (100 requests/minute)
  - Auto-sync via MondayImportService.syncFromMonday() for create/update/delete events
  - EventBus notifications (`monday:webhook:received`, `monday:sync:success`)
  - **Conflict Management MVP**: Monday-priority strategy with timestamp-based conflict detection
    - SyncAuditService for structured audit logging via EventBus
    - Emits `monday:sync:conflict` events when Saxium data is more recent
    - Always applies Monday changes (Monday-priority policy) with conflict logging
- **Monday.com UI Sync Indicators**: Visual sync status badges and real-time notifications:
  - DB persistence via mondaySyncStatus, mondayConflictReason, mondayLastSyncedAt columns (projects/aos)
  - SyncAuditService rebuilds cache from DB at startup (restart-safe states)
  - Event listeners persist sync states (synced/conflict/error) to DB
  - GET `/api/monday/sync-status` endpoint with entityIds filter
  - SyncStatusBadge component (5 états : synced, syncing, error, conflict, notSynced) avec fallback "Not synced" si status undefined, icons Lucide, tooltip, data-testid
  - useMondaySync hook for WebSocket events, toast notifications, React Query cache invalidation
  - Integration in projects.tsx and unified-offers-display.tsx (AOs/Offers/Dashboard) with 30s refetch polling + real-time WebSocket updates
- **Draft System**: Allows users to save incomplete forms (Appel d'Offres) with conditional backend validation and frontend support.
- **Technical Alerts & Toast Deduplication**: Consolidated OCR technical alerts and implemented a robust real-time event deduplication system for notifications using `sessionStorage` persistence.
- **OCR Lot Extraction**: Enhanced regex patterns in `server/ocrService.ts` to support Unicode characters in French AO lot formats.

## External Dependencies
- **Replit Services**: Utilizes Replit for OIDC authentication, PostgreSQL (via `DATABASE_URL`), and Object Storage.
- **External APIs**:
    - **Anthropic Claude**: Used for quote analysis and content generation.
    - **OpenAI**: Employed for embeddings and chat assistance.
    - **SendGrid**: Integrated for transactional email services.