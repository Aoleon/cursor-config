# Server Modules Architecture

## Overview

This directory contains the modular architecture for the Saxium server application, migrating from the monolithic `routes-poc.ts` (11,647 lines) to a clean, maintainable structure.

## Module Structure

```
server/modules/
├── auth/               # Authentication & Sessions
│   ├── routes.ts      # Auth endpoints
│   ├── types.ts       # Auth TypeScript definitions
│   └── index.ts       # Module exports
│
├── chiffrage/         # DPGF & Pricing Calculations
│   ├── routes.ts      # Chiffrage endpoints
│   ├── services.ts    # Business logic for calculations
│   ├── types.ts       # Chiffrage types
│   └── index.ts       # Module exports
│
├── suppliers/         # Supplier Management
│   ├── routes.ts      # Supplier workflow endpoints
│   ├── services.ts    # OCR analysis, quote sessions
│   ├── types.ts       # Supplier types
│   └── index.ts       # Module exports
│
├── projects/          # Project Management
│   ├── routes.ts      # Project endpoints
│   ├── services.ts    # Timeline management, reserves
│   ├── types.ts       # Project types
│   └── index.ts       # Module exports
│
├── analytics/         # Analytics & Reporting
│   ├── routes.ts      # KPI & dashboard endpoints
│   ├── services.ts    # Analytics calculations
│   ├── types.ts       # Analytics types
│   └── index.ts       # Module exports
│
└── documents/         # Document Processing
    ├── routes.ts      # OCR & PDF endpoints
    ├── services.ts    # Document generation logic
    ├── types.ts       # Document types
    └── index.ts       # Module exports
```

## Migration Strategy

### Current State
- **Monolithic File**: `server/routes-poc.ts` (11,647 lines)
- **Entry Point**: `server/routes.ts` exports from `routes-poc.ts`
- **Registration**: `server/index.ts` calls `registerRoutes(app)`

### Migration Phases

#### Phase 1: Authentication Module ✅ (COMPLETED)
- [x] Create module structure
- [x] Extract auth routes from routes-poc.ts
- [x] Create auth/routes.ts with all auth endpoints
- [x] Create auth/types.ts with TypeScript definitions
- [x] Create auth/index.ts for exports
- [ ] Test auth module functionality
- [ ] Remove auth routes from routes-poc.ts

#### Phase 2: Chiffrage Module (NEXT)
Routes to migrate:
- `/api/chiffrage/*`
- `/api/dpgf/*`
- Pricing calculation endpoints

#### Phase 3: Suppliers Module
Routes to migrate:
- `/api/supplier-workflow/*`
- `/api/supplier-documents/*`
- `/api/supplier-quote-sessions/*`
- OCR analysis endpoints

#### Phase 4: Projects Module
Routes to migrate:
- `/api/projects/*`
- `/api/tasks/*`
- Timeline management endpoints

#### Phase 5: Analytics Module
Routes to migrate:
- `/api/analytics/*`
- `/api/predictive/*`
- `/api/kpis/*`
- Dashboard endpoints

#### Phase 6: Documents Module
Routes to migrate:
- `/api/ocr/*`
- `/api/documents/*`
- PDF generation endpoints

### Integration Approach

1. **Progressive Migration**: Modules are migrated one at a time
2. **Dual Operation**: Both old and new routes work during migration
3. **Factory Pattern**: Each module exports a factory function
4. **Dependency Injection**: Services are passed to modules

### Module Pattern

```typescript
// modules/[module-name]/routes.ts
import { Router } from 'express';
import type { IStorage } from '../../storage-poc';
import type { EventBus } from '../../eventBus';

export function create[ModuleName]Router(
  storage: IStorage, 
  eventBus: EventBus
): Router {
  const router = Router();
  
  // Define routes
  router.get('/api/[module]/*', ...);
  
  return router;
}
```

### Testing Strategy

For each module:
1. Extract routes to module
2. Keep original routes in routes-poc.ts
3. Test module routes work correctly
4. Remove routes from routes-poc.ts
5. Verify no regression

## Route Inventory

### Authentication Routes (auth/)
- `POST /api/login/basic` - Basic auth login (dev only)
- `GET /api/auth/health` - Auth service health check
- `GET /api/auth/user` - Get current user
- `GET /api/debug-auth-state` - Debug auth state (dev only)

### Chiffrage Routes (chiffrage/)
- `GET /api/chiffrage/elements` - Get chiffrage elements
- `POST /api/chiffrage/calculate` - Calculate pricing
- `GET /api/dpgf/documents` - Get DPGF documents
- `POST /api/dpgf/generate` - Generate DPGF

### Supplier Routes (suppliers/)
- `GET /api/supplier-workflow/:aoId/status` - Get workflow status
- `POST /api/supplier-workflow/sessions` - Create quote session
- `POST /api/supplier-documents/:id/analyze` - Analyze supplier docs
- `GET /api/supplier-quote-sessions/:id/comparison` - Compare quotes

### Project Routes (projects/)
- `GET /api/projects` - List projects
- `GET /api/projects/:id` - Get project details
- `POST /api/projects` - Create project
- `PATCH /api/projects/:id` - Update project
- `GET /api/projects/:id/tasks` - Get project tasks

### Analytics Routes (analytics/)
- `GET /api/analytics/metrics` - Get metrics
- `GET /api/analytics/kpis` - Get KPIs
- `GET /api/analytics/pipeline` - Get pipeline data
- `GET /api/predictive/revenue-forecast` - Revenue predictions

### Document Routes (documents/)
- `POST /api/ocr/process-pdf` - Process PDF with OCR
- `POST /api/ocr/create-ao-from-pdf` - Create AO from PDF
- `GET /api/documents/:id` - Get document
- `POST /api/documents/generate-pdf` - Generate PDF

## Best Practices

### Error Handling
```typescript
import { asyncHandler } from '../../middleware/errorHandler';
import { ValidationError, NotFoundError } from '../../utils/error-handler';
import { logger } from '../../utils/logger';

router.get('/api/route', asyncHandler(async (req, res) => {
  // Route logic with automatic error handling
}));
```

### Logging
```typescript
logger.info('[Module] Action completed', {
  metadata: {
    route: req.path,
    method: req.method,
    userId: req.user?.id
  }
});
```

### Validation
```typescript
import { validateBody, validateQuery } from '../../middleware/validation';
import { z } from 'zod';

const schema = z.object({
  field: z.string().min(1)
});

router.post('/api/route', 
  validateBody(schema),
  asyncHandler(async (req, res) => {
    // Validated request body
  })
);
```

## Dependencies

All modules share these core dependencies:
- `express` - Web framework
- `zod` - Schema validation
- `../../storage-poc` - Data storage interface
- `../../eventBus` - Event system
- `../../middleware/*` - Shared middleware
- `../../utils/*` - Shared utilities

## Module Conventions

1. **Naming**: Module names are lowercase, routes are kebab-case
2. **Exports**: Each module exports a factory function
3. **Types**: All types in dedicated types.ts file
4. **Services**: Business logic separated from routes
5. **Tests**: Each module has its own test suite

## Monitoring & Debugging

### Check Module Loading
```bash
grep "Module .* monté" server.log
```

### Verify Route Registration
```bash
curl http://localhost:5000/api/auth/health
```

### Debug Module Issues
Enable debug logging:
```javascript
logger.debug('[ModuleName] Debug info', { metadata: {...} });
```

## Future Improvements

1. **API Versioning**: Add `/v1/` prefix to all routes
2. **OpenAPI Documentation**: Generate from route definitions
3. **Module Dependencies**: Create dependency graph
4. **Performance Monitoring**: Add route-level metrics
5. **Rate Limiting**: Module-specific rate limits

## Migration Checklist

- [x] Create module directory structure
- [x] Create routes-index.ts aggregator
- [x] Extract authentication module
- [ ] Test authentication module
- [ ] Extract chiffrage module
- [ ] Extract suppliers module
- [ ] Extract projects module
- [ ] Extract analytics module
- [ ] Extract documents module
- [ ] Remove migrated routes from routes-poc.ts
- [ ] Update server/routes.ts to use modules
- [ ] Full regression testing
- [ ] Update deployment scripts

## Contact

For questions about the module architecture:
- Technical Lead: Bureau d'Études
- Architecture decisions documented in `/docs/architecture/`