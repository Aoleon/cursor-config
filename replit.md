# Saxium - Application de Chiffrage BTP/Menuiserie

## Overview
Saxium is a fullstack application designed for quoting and project management in the French construction and joinery (BTP/Menuiserie) sector. Its primary goal is to enhance operational efficiency through advanced automation and AI capabilities. Key features include OCR analysis of supplier quotes, intelligent planning generation using DateIntelligence, and AI-driven decision-making tools. The project aims to address significant market needs by improving operational efficiency and project management through advanced technology.

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
  - **Batigest Integration System**: A file-based synchronization system with Sage Batigest ERP using `BatigestExportService`, HTML PDF templates, and a PowerShell script for automated polling and import.
- **Database**: PostgreSQL, hosted on Neon, managed with Drizzle ORM for schema definition and migrations.
- **AI**: Integrates Anthropic Claude and OpenAI for advanced functionalities, complemented by Tesseract.js for OCR.
- **Folder Structure**: Divided into `client/` for frontend, `server/` for backend, `shared/` for common code (e.g., Drizzle schema and Zod types), and `attached_assets/` for static assets.
- **Data Architecture - AOs vs Offers**: Differentiates between historical "AOs Monday" (read-only client project requests) and "Offers Saxium" (active working documents). Offers can be linked to AOs. Hybrid ID resolution allows routes to accept either offer ID or AO Monday ID. Chiffrage-Elements are exclusively linked to Offers Saxium. Cache keys for `/api/aos` and `/api/offers` must be consistent (without trailing slash).
- **Error Handling**: A unified system utilizing `error-handler.ts`, `logger.ts`, and `errorHandler.ts` middleware provides typed errors.
- **Business Services**: Includes `DateIntelligenceService` for intelligent project planning, `OCRService` for text extraction, `AIService` for structured quote analysis, and an `EventBus` for inter-service coordination.
- **API Response Handling**: Centralized `normalizeApiResponse<T>()` helper ensures consistent and type-safe handling of all API responses. Frontend `useQuery` hooks extract `.data`. Search parameters are validated backend.
- **Testing Infrastructure**: Includes Vitest for unit tests and Playwright for E2E regression tests, covering critical workflows like AO creation, supplier quotes, and Monday.com synchronization.
- **Retry System**: Unified exponential backoff retry mechanism (`server/utils/retry-helper.ts`) for external API calls.
- **Intelligent Cache System**: Centralized `CacheService` with in-memory adapter (Redis-ready) for frequent queries, proactive invalidation via EventBus, and a monitoring endpoint.
- **Correlation IDs System**: `AsyncLocalStorage`-based request tracing for end-to-end observability, enriching logs and propagating IDs to external APIs.
- **Monday.com Export System**: `MondayExportService` provides idempotent Saxium→Monday export for projects/AOs via EventBus triggers and manual endpoints.
- **Monday.com Webhook System**: Secure webhook endpoint (`/api/monday/webhook`) for Monday→Saxium synchronization with HMAC-SHA256 signature validation, idempotence, rate limiting, and conflict management (Monday-priority strategy).
- **Monday.com UI Sync Indicators**: Visual sync status badges and real-time notifications in the UI, persisted in DB, with a `useMondaySync` hook for WebSocket events and cache invalidation.
- **Draft System**: Allows users to save incomplete forms with conditional backend validation.
- **Technical Alerts & Toast Deduplication**: Consolidated OCR technical alerts and implemented a robust real-time event deduplication system.
- **OCR Lot Extraction**: Enhanced regex patterns in `server/ocrService.ts` to support Unicode characters.
- **SPA Routing Stability** (Oct 2025): Fixed PathError crashes from `/*splat` route via fallback middleware in `server/index.ts`. Fallback activates ONLY when Vite's route fails, preserving HMR. Tested stable across 2+ restarts. Known non-critical warning: `@vitejs/plugin-react can't detect preamble` (app functions normally).
  - **Future Enhancement** (when `server/vite.ts` becomes editable): Return Vite instance from `setupVite()` to enable `vite.transformIndexHtml()` in fallback for full HMR preservation.
- **Zod v4 Migration & Type Safety** (Oct 2025): Completed migration to Zod v4 with zero TypeScript/LSP compilation errors. Key achievements:
  - **Storage Architecture Restoration**: Re-implemented 308 missing methods in DatabaseStorage with EventBus integration for business alerts (createBusinessAlert, listBusinessAlerts, updateBusinessAlertStatus, findSimilarAlerts). MemStorage converted to testing stubs.
  - **DateAlertDetectionService Refactoring**: Eliminated 110 LSP errors through InsertDateAlert type alignment, ProjectStatus enum fix (projectStatusEnum), schema field corrections (dateRemise → dateLimiteRemise), and comprehensive null safety improvements.
  - **Build Optimization**: Removed all 6 duplicate method warnings (storage-poc business alerts + ChatbotOrchestrationService) achieving 0 build warnings.
  - **Production Stability**: Build validated (Vite 28s, ESBuild 142ms), runtime error `evaluateBusinessThresholds is not a function` resolved, 375 projects operational with functional alert generation system.

## External Dependencies
- **Replit Services**: Utilizes Replit for OIDC authentication, PostgreSQL (via `DATABASE_URL`), and Object Storage.
- **External APIs**:
    - **Anthropic Claude**: Used for quote analysis and content generation.
    - **OpenAI**: Employed for embeddings and chat assistance.
    - **SendGrid**: Integrated for transactional email services.