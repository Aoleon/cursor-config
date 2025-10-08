# Saxium - Application de Chiffrage BTP/Menuiserie

## Overview
Saxium is a fullstack application designed for quoting and project management in the French construction and joinery (BTP/Menuiserie) sector. It integrates OCR analysis of supplier quotes, intelligent planning generation with DateIntelligence, and AI-powered decision-making tools. The project aims to streamline operations, enhance efficiency, and provide smart insights for businesses in this industry, offering significant market potential through its advanced automation and AI capabilities.

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
The application uses a modern fullstack architecture.
- **Frontend**: React, TypeScript, Vite, Wouter for routing, shadcn/ui, Tailwind CSS, and Radix UI for the user interface. Frontend patterns emphasize React Query for data fetching and `react-hook-form` with Zod for form management. Interactive and informative elements should include `data-testid` for testing purposes.
- **Backend**: Express, TypeScript, and Drizzle ORM.
- **Database**: PostgreSQL hosted on Neon.
- **AI**: Anthropic Claude and OpenAI for advanced functionalities. OCR uses Tesseract.js.
- **Folder Structure**: `client/` for frontend, `server/` for backend, `shared/` for common code (e.g., Drizzle schema and Zod types), and `attached_assets/` for static assets.
- **Error Handling**: A unified error management system is in place using `error-handler.ts`, `logger.ts`, and `errorHandler.ts` middleware, providing typed errors such as `ValidationError`, `AuthenticationError`, `NotFoundError`, etc.
- **Database Management**: Drizzle ORM is used with `shared/schema.ts` for defining tables and generating insert schemas. Migrations are handled via `npm run db:push`.
- **Business Services**:
    - **DateIntelligenceService**: Generates intelligent planning based on BTP/joinery business rules, calculating deadlines and considering seasonal factors, holidays, and material types.
    - **OCR & AI Analysis**: `OCRService` extracts text from PDFs/images, and `AIService` performs structured analysis of supplier quotes using Claude.
    - **EventBus**: A pub/sub system for inter-service coordination.
- **Technical Implementations**: The project implements a robust error handling system, standardizes API route patterns using `asyncHandler`, and enforces Zod validation for critical POST routes. Development workflow includes `npm run dev` to start both frontend and backend, `npm run db:push` for schema synchronization, and `npm test` for running tests.

## External Dependencies
- **Replit Services**: Auth (Log in with Replit OIDC), PostgreSQL (via `DATABASE_URL`), and Object Storage.
- **APIs Externes**:
    - **Anthropic Claude**: Used for quote analysis and content generation.
    - **OpenAI**: Used for embedding and chat assistance.
    - **SendGrid**: For transactional emails (requires `SENDGRID_API_KEY`).