# JLM ERP - Menuiserie Management System

## Overview
JLM ERP POC is a specialized digitalization application for JLM Menuiserie, a carpentry installation company. The POC application aims to digitalize and optimize the management of offer dossiers, cost estimation, and project/planning tracking. It seeks to streamline information flow, reduce redundant data entry, and improve visibility and traceability of key processes. The scope is strictly limited to the POC to validate critical information flows between the Design Office and the field, focusing on eliminating double data entry and establishing formal validation milestones. The core business entity is the "DOSSIER", representing a unique project evolving through all stages from tender to delivery.

## User Preferences
You are an expert autonomous programmer specialized in French carpentry ERP systems, working on JLM Menuiserie's comprehensive business management platform.

**Core Role**: 
- TypeScript full-stack developer with French carpentry domain expertise
- Autonomous problem solver for menuiserie workflow optimization
- Quality-focused developer with proactive error prevention

**Communication Directives**:
- Use simple, everyday language avoiding technical jargon
- Maintain French interface and terminology for carpentry industry
- Provide autonomous work sessions with comprehensive solutions
- Minimize user interruptions unless genuinely blocked

**Technical Standards**:
- Proactive TypeScript error resolution with LSP diagnostics
- Robust data validation using Zod schemas
- Immediate compilation checking after code changes
- Test-driven development with 85%+ backend, 80%+ frontend coverage

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter
- **State Management**: TanStack Query v5
- **UI Library**: Radix UI primitives + shadcn/ui
- **Styling**: Tailwind CSS with custom design tokens
- **Form Management**: React Hook Form + Zod
- **Build System**: Vite

### Backend Architecture
- **Runtime**: Node.js 20 with Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Replit OpenID Connect (OIDC) with Passport.js
- **Session Storage**: PostgreSQL-backed sessions with connect-pg-simple
- **OCR Engine**: Tesseract.js + pdf-parse for intelligent PDF processing

### Critical Design Principles
- **Full-Stack Type Safety**: Shared TypeScript schemas ensure type consistency.
- **Database-First Architecture**: PostgreSQL and Drizzle ORM are the single source of truth.
- **French Carpentry Domain Modeling**: Business entities directly model carpentry workflows.
- **Session-Based Authentication**: Secure, scalable user management.
- **Optimistic UI Updates**: TanStack Query provides immediate UI feedback.
- **Single Form Evolution**: The initial tender (AO) form is the ONLY form that evolves through all workflow stages. No data re-entry, no form duplication. Progressive field addition with validation locking prevents modification of previously validated data. This principle ensures zero redundant data entry and progressive data locking.

### Core Functionalities (POC Scope)
- **User Management**: Simple authentication for Design Office/Field roles with workload indicators.
- **Tender (AO) Sheets**: Assisted data retrieval and OCR import (35+ fields) to prevent double entry.
- **Offer Dossiers & Cost Estimation**: Assisted data retrieval from AO, simplified estimation module (or simulated Batigest connection), DPGF (Detailed Price Breakdown) editing, Design Office status tracking.
- **Supplier Price Requests**: Simplified, read-only requests linked to projects.
- **Project Management**: Five key stages: Study, Planning, Supply (simple), Construction Site, After-Sales Service (simple).
- **Shared Planning**: Simplified Gantt chart, visual alerts for milestones, drag-and-drop tasks.
- **Team Management**: Visualization of internal/subcontractor resources, simplified workload.

### Workflow Management
The system implements a unique, evolving form that progresses through predefined stages: AO → Cost Estimation → Project → Teams → Delivery. Each stage has a dedicated view with context-specific actions and progressive data locking. An intelligent OCR import function is integrated for automatic PDF analysis and field pre-filling.

### Test Architecture & Software Quality
- **Backend Testing**: Vitest + Supertest for unit and API integration tests.
- **Frontend Testing**: Testing Library React + Vitest for components and hooks.
- **E2E Testing**: Playwright for end-to-end testing.
- **API Mocking**: MSW (Mock Service Worker).
- **Comprehensive Testing Policy**: Every feature requires testing across Backend, Routes, Frontend Logic, and UI layers.
- **Coverage Standards**: Minimum 85% backend, 80% frontend. 100% for critical paths.

## External Dependencies

- **Database**: Neon serverless PostgreSQL
- **Frontend Libraries**: `@tanstack/react-query`, `@radix-ui/*`, `react-hook-form`, `wouter`
- **Authentication**: `passport`, `openid-client`, `express-session`, `connect-pg-simple`
- **Testing Tools**: `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `@playwright/test`, `supertest`, `msw`, `jsdom`, `happy-dom`
- **Build & Language Tools**: `vite`, `typescript`, `tailwindcss`, `drizzle-kit`, `tsx`