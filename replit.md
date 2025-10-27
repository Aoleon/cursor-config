# Saxium - Application de Chiffrage BTP/Menuiserie

## Overview
Saxium is a fullstack application designed for quoting and project management within the French construction and joinery (BTP/Menuiserie) sector. Its primary goal is to enhance operational efficiency through advanced automation and AI capabilities. Key features include OCR analysis of supplier quotes, intelligent planning facilitated by DateIntelligence, and AI-driven decision-making processes. The project aims to revolutionize traditional workflows in the construction and joinery industry by providing a comprehensive, intelligent, and integrated solution for managing projects from initial quoting to completion.

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
The application employs a modern fullstack architecture. The frontend is built with React, TypeScript, and Vite, utilizing Wouter for routing, shadcn/ui and Tailwind CSS for styling, Radix UI for components, React Query for data fetching, and `react-hook-form` with Zod for form management. The backend is developed with Express and TypeScript, leveraging Drizzle ORM for database interactions.

**Key Architectural Decisions & Features:**

*   **UI/UX Decisions**:
    *   Utilizes shadcn/ui, Tailwind CSS, and Radix UI for a consistent and modern design system.
    *   New "Couverture Mapping" dashboard section provides visual progress bars and detailed breakdowns for Monday.com mapping coverage, enhancing user understanding of data integration status.
    *   Optimized List components (`OptimizedList`, `OptimizedListItem`) and associated hooks (`useOptimizedRenderItem`, `useOptimizedKeyExtractor`) prevent unnecessary re-renders in large lists, ensuring a smooth user experience.
    *   Draft system allows saving incomplete forms with conditional validation.

*   **Technical Implementations**:
    *   **Monday.com Data Mapping Architecture**: Configuration-driven extraction system using board-specific JSON files for dynamic mapping. Supports 10+ column types including derived fields like city and department from postal codes.
    *   **Performance Optimizations**:
        *   **Frontend**: Adaptive caching strategies (by data type), prefetching system (`usePrefetch*` hooks) for common user flows, debouncing and throttling for search/filter operations, and route-based lazy loading for all pages.
        *   **Backend**: Database indexing, production-ready Redis caching (with in-memory fallback), optimized database queries (pagination, aggregations), and network compression (gzip/brotli).
    *   **Error Handling**: Unified system with typed errors, `error-handler.ts`, `logger.ts`, and `errorHandler.ts` middleware.
    *   **API Response Handling**: `normalizeApiResponse<T>()` helper for consistent, type-safe API responses.
    *   **Retry System**: Exponential backoff for external API calls.
    *   **Cache System**: `CacheService` with in-memory adapter (Redis-ready), proactive invalidation, and monitoring endpoint.
    *   **Correlation IDs**: `AsyncLocalStorage`-based request tracing for observability.
    *   **Zod v4 Migration**: Completed for robust data validation and transformations.

*   **Feature Specifications**:
    *   Modular backend routes (`auth`, `chiffrage`, `suppliers`, `projects`, `analytics`, `documents`, `batigest`).
    *   PDF template engine.
    *   Batigest ERP integration.
    *   AI services (`DateIntelligenceService`, `OCRService`, `AIService`).
    *   EventBus for inter-component communication.
    *   Differentiates between "AOs Monday" (read-only client requests) and "Offers Saxium" (active working documents) with hybrid ID resolution.
    *   New AO fields implemented in UI and backend schema: `dateLivraisonPrevue`, `dateOS`, `cctp`.

*   **System Design Choices**:
    *   Fullstack TypeScript for type safety across the application.
    *   PostgreSQL (Neon) with Drizzle ORM for robust data management.
    *   Dedicated `shared/` folder for common types and schemas.
    *   Comprehensive testing with Vitest for unit tests and Playwright for E2E regression tests.

## External Dependencies
*   **Replit Services**: OIDC authentication, PostgreSQL, Object Storage.
*   **External APIs**:
    *   **Anthropic Claude**: For quote analysis and content generation.
    *   **OpenAI**: For embeddings and chat assistance.
    *   **SendGrid**: For transactional email services.
    *   **Monday.com**: For project management and data synchronization (via `MondayExportService` and webhooks).
*   **Libraries**: Tesseract.js for OCR capabilities.