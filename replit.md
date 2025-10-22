# Saxium - Application de Chiffrage BTP/Menuiserie

## Overview
Saxium is a fullstack application for quoting and project management in the French construction and joinery sector (BTP/Menuiserie). It aims to improve operational efficiency through advanced automation and AI, featuring OCR analysis of supplier quotes, intelligent planning with DateIntelligence, and AI-driven decision-making.

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