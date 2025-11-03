# Saxium - Application de Chiffrage BTP/Menuiserie

## Overview
Saxium is a fullstack application for quoting and project management in the French construction and joinery (BTP/Menuiserie) sector. Its core purpose is to enhance operational efficiency through automation and AI, including OCR analysis of supplier quotes, intelligent planning, and AI-driven decision-making. The project aims to modernize traditional workflows from initial quoting to project completion, offering a significant boost in productivity and accuracy.

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
*   **Modular Backend**: Routes organized following a factory pattern for core business, operations, analytics, administration, stakeholders, AI & automation, and integrations.
*   **AI Services**: Integration of `DateIntelligenceService`, `OCRService`, and `AIService`.
*   **Error Handling**: Unified system with typed errors, dedicated error middleware, and structured logging with correlation IDs.
*   **Performance Optimizations**: Adaptive caching, prefetching, debouncing/throttling (frontend); database indexing, Redis caching, optimized queries (backend).
*   **Data Synchronization**: Bidirectional sync with Monday.com, configuration-driven data mapping, and OneDrive integration for document management with automatic periodic synchronization.
*   **N+1 Query Optimization**: `KpiRepository` uses a single CTE for analytics.
*   **Asynchronous Operations**: `asyncHandler` pattern for all routes.
*   **API Response Handling**: `normalizeApiResponse<T>()` for consistent, type-safe API responses.
*   **Resilience**: Retry system with exponential backoff and CircuitBreakerManager for external APIs.
*   **Correlation IDs**: `AsyncLocalStorage`-based request tracing.
*   **Global Search**: Server-side optimized SQL search across key entities.
*   **PDF Engine**: Integrated PDF template engine.

**Feature Specifications**:
*   Distinction between "AOs Monday" (read-only client requests) and "Offers Saxium" (active working documents).
*   Batigest ERP integration.
*   EventBus for inter-component communication.
*   Monday.com import fixes and a comprehensive regression test suite.
*   CI/CD pipeline with automated type checking and backend tests.

**System Design Choices**:
*   Fullstack TypeScript for end-to-end type safety.
*   PostgreSQL (Neon) with Drizzle ORM.
*   `shared/` folder for common types and schemas.
*   Vitest for unit tests and Playwright for E2E regression tests.
*   Modular Storage Architecture with Repository Pattern, Unit of Work, and StorageFacade.

## External Dependencies
*   **Replit Services**: OIDC authentication, PostgreSQL, Object Storage.
*   **External APIs**:
    *   **Anthropic Claude**: Quote analysis and content generation.
    *   **OpenAI**: Embeddings and chat assistance.
    *   **SendGrid**: Transactional email services.
    *   **Monday.com**: Project management and data synchronization.
    *   **Microsoft OneDrive**: Centralized document management (GED).
*   **Libraries**: Tesseract.js for OCR capabilities.