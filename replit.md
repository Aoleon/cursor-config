# Saxium - Application de Chiffrage BTP/Menuiserie

## Overview
Saxium is a fullstack application for quoting and project management in the French construction and joinery (BTP/Menuiserie) sector. It aims to enhance operational efficiency through automation and AI, featuring OCR analysis of supplier quotes, intelligent planning via DateIntelligence, and AI-driven decision-making. The project seeks to modernize traditional workflows from quoting to project completion.

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
The application features a modern fullstack architecture. The frontend uses React, TypeScript, Vite, Wouter for routing, shadcn/ui and Tailwind CSS for styling, Radix UI for components, React Query for data fetching, and `react-hook-form` with Zod for form management. The backend is built with Express and TypeScript, using Drizzle ORM for database interactions.

*   **UI/UX Decisions**:
    *   Consistent and modern design using shadcn/ui, Tailwind CSS, and Radix UI.
    *   "Couverture Mapping" dashboard provides visual progress for Monday.com data integration.
    *   Optimized List components prevent re-renders in large lists for a smooth user experience.
    *   Draft system allows saving incomplete forms with conditional validation.
    *   Customizable DataTables for displaying and managing data (e.g., Offers, AOs), featuring column visibility, reordering, sorting, and filtering.

*   **Technical Implementations**:
    *   **Monday.com Data Mapping**: Configuration-driven extraction system using JSON files for dynamic mapping of 10+ column types.
    *   **Performance Optimizations**: Adaptive caching, prefetching, debouncing/throttling, route-based lazy loading (frontend); database indexing, Redis caching, optimized queries, network compression (backend).
    *   **Error Handling**: Unified system with typed errors, dedicated error middleware, and logging.
    *   **API Response Handling**: `normalizeApiResponse<T>()` for consistent, type-safe API responses.
    *   **Retry System**: Exponential backoff for external API calls.
    *   **Cache System**: `CacheService` with in-memory adapter (Redis-ready), proactive invalidation, and monitoring.
    *   **Correlation IDs**: `AsyncLocalStorage`-based request tracing for observability.
    *   **Zod v4 Migration**: For robust data validation and transformations.
    *   **Global Search**: Server-side optimized SQL search across AOs, Offers, and Projects.
    *   **Monday.com Sync**: Bidirectional synchronization for key fields between Saxium and Monday.com.
    *   **Data Extraction**: Robust AO extraction from Monday.com with strict validation and error handling for missing required fields.

*   **Feature Specifications**:
    *   Modular backend routes (`auth`, `chiffrage`, `suppliers`, `projects`, `analytics`, `documents`, `batigest`).
    *   PDF template engine.
    *   Batigest ERP integration.
    *   AI services (`DateIntelligenceService`, `OCRService`, `AIService`).
    *   EventBus for inter-component communication.
    *   Distinction between "AOs Monday" (read-only client requests) and "Offers Saxium" (active working documents) with hybrid ID resolution.
    *   New AO fields: `dateLivraisonPrevue`, `dateOS`, `cctp`.

*   **System Design Choices**:
    *   Fullstack TypeScript for end-to-end type safety.
    *   PostgreSQL (Neon) with Drizzle ORM.
    *   `shared/` folder for common types and schemas.
    *   Vitest for unit tests and Playwright for E2E regression tests.

## External Dependencies
*   **Replit Services**: OIDC authentication, PostgreSQL, Object Storage.
*   **External APIs**:
    *   **Anthropic Claude**: Quote analysis and content generation.
    *   **OpenAI**: Embeddings and chat assistance.
    *   **SendGrid**: Transactional email services.
    *   **Monday.com**: Project management and data synchronization.
*   **Libraries**: Tesseract.js for OCR capabilities.