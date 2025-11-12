# Règles Backend - Saxium

## 🏗️ Architecture Backend

### Structure des Modules

```
server/
├── modules/           # Modules métier (migration en cours)
│   ├── auth/
│   ├── documents/
│   ├── chiffrage/
│   └── ...
├── services/          # Services métier
│   ├── AIService.ts
│   ├── ChatbotOrchestrationService.ts
│   ├── DateIntelligenceService.ts
│   └── ...
├── middleware/        # Middleware Express
│   ├── errorHandler.ts
│   ├── validation.ts
│   ├── security.ts
│   └── ...
├── storage/          # Couche données
│   └── storage-poc.ts (interface IStorage)
└── routes-poc.ts     # Legacy (migration en cours)
```

### Pattern de Route Modulaire

```typescript
// server/modules/[module]/routes.ts
import { Router } from 'express';
import type { IStorage } from '../../storage-poc';
import type { EventBus } from '../../eventBus';
import { asyncHandler } from '../../utils/error-handler';
import { validateBody } from '../../middleware/validation';
import { logger } from '../../utils/logger';

export function create[Module]Router(
  storage: IStorage,
  eventBus: EventBus
): Router {
  const router = Router();
  
  router.post('/api/[module]/create',
    validateBody(schema),
    asyncHandler(async (req, res) => {
      logger.info('[Module] Création', {
        metadata: { userId: req.user?.id }
      });
      
      const result = await storage.create[Entity](req.body);
      
      eventBus.publish({
        type: '[entity].created',
        entity: '[entity]',
        entityId: result.id
      });
      
      res.json({ success: true, data: result });
    })
  );
  
  return router;
}
```

### Services Métier

**Pattern de Service:**
```typescript
// server/services/[Service]Service.ts
import type { IStorage } from '../storage-poc';
import { logger } from '../utils/logger';
import { withErrorHandling } from '../utils/error-handler';

export class [Service]Service {
  constructor(
    private storage: IStorage,
    private eventBus: EventBus
  ) {}
  
  async method(params: Params): Promise<Result> {
    return withErrorHandling(
      async () => {
        logger.info('[Service] Méthode', {
          metadata: { params }
        });
        
        // Logique métier
        const result = await this.storage.method(params);
        
        return result;
      },
      {
        operation: 'method',
        service: '[Service]Service',
        metadata: { params }
      }
    );
  }
}
```

### EventBus Pattern

```typescript
// Publication d'événement
eventBus.publish({
  type: 'entity.action',
  entity: 'entity',
  entityId: entity.id,
  severity: 'info',
  timestamp: new Date().toISOString(),
  metadata: { /* données contextuelles */ }
});

// Abonnement
eventBus.subscribe(async (event) => {
  if (event.type === 'entity.action') {
    // Traitement
  }
}, {
  eventTypes: ['entity.action'],
  entities: ['entity']
});
```

### Validation avec Zod

```typescript
import { z } from 'zod';
import { validateBody, validateQuery } from '../middleware/validation';

// Schéma de validation
const createSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email(),
  role: z.enum(['admin', 'user', 'guest'])
});

// Utilisation dans route
router.post('/api/route',
  validateBody(createSchema),
  asyncHandler(async (req, res) => {
    // req.body est validé et typé
    const { name, email, role } = req.body;
  })
);
```

### Rate Limiting

```typescript
import { rateLimits } from '../middleware/rate-limiter';

// Rate limiting global (déjà appliqué dans index.ts)
// Rate limiting spécifique par route
router.post('/api/route',
  rateLimits.processing, // 10 req/min
  asyncHandler(async (req, res) => {
    // ...
  })
);
```

### Circuit Breakers (Services Externes)

```typescript
import { CircuitBreakerManager } from '../utils/circuit-breaker';

const breaker = CircuitBreakerManager.getInstance().getBreaker('service-name', {
  threshold: 5,
  timeout: 60000,
  onOpen: () => logger.warn('Circuit ouvert'),
  onClose: () => logger.info('Circuit fermé')
});

const result = await breaker.execute(() => externalService.call());
```

## 🔒 Sécurité Backend

### RBAC (Role-Based Access Control)

```typescript
import { RBACService } from '../services/RBACService';

// Vérification permission
const hasAccess = await rbacService.checkPermission(
  userId,
  'entity',
  'action'
);

if (!hasAccess) {
  throw new AuthorizationError('Accès refusé');
}

// Filtrage automatique par rôle
const entities = await storage.getEntities();
const filtered = await rbacService.filterByRole(entities, userRole);
```

### Protection SQL Injection

- ✅ Utiliser Drizzle ORM (paramètres préparés automatiques)
- ✅ Valider AST SQL dans SQLEngineService
- ✅ Whitelist tables/colonnes autorisées
- ✅ Blocage DDL/DML (read-only)

### Sanitization

```typescript
import { sanitizeQuery } from '../middleware/security';

// Middleware global (déjà appliqué)
// Sanitization manuelle si nécessaire
const sanitized = sanitizeInput(userInput);
```

## 📊 Performance Backend

### Cache Intelligent

```typescript
import { getContextCacheService } from '../services/ContextCacheService';

const cacheService = getContextCacheService(storage);

// Vérification cache
const cached = await cacheService.get(cacheKey);
if (cached) return cached;

// Génération et mise en cache
const result = await generateResult();
await cacheService.set(cacheKey, result, { ttl: 3600 });
return result;
```

### Optimisation Requêtes

- ✅ Utiliser `KpiRepository` pour requêtes complexes (CTE unique)
- ✅ Éviter requêtes N+1 (utiliser `withTransaction` si nécessaire)
- ✅ Index sur colonnes fréquemment requêtées
- ✅ Pagination pour grandes listes

### Transactions

```typescript
import { withTransaction } from '../utils/database-helpers';

const result = await withTransaction(async (tx) => {
  const entity1 = await storage.createEntity1(data1, tx);
  const entity2 = await storage.createEntity2(data2, tx);
  return { entity1, entity2 };
});
```

## 🧪 Tests Backend

### Pattern de Test

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { asyncHandler } from '../utils/error-handler';

describe('[Service] method', () => {
  it('should handle success case', async () => {
    const result = await service.method(params);
    expect(result).toBeDefined();
  });
  
  it('should throw ValidationError on invalid input', async () => {
    await expect(service.method(invalidParams))
      .rejects.toThrow(ValidationError);
  });
});
```

## 📝 Conventions Backend

### Naming
- **Services:** `PascalCase` + `Service` (ex: `AIService`)
- **Routes:** `kebab-case` (ex: `/api/offers/:id`)
- **Fonctions:** `camelCase` (ex: `createOffer`)
- **Types:** `PascalCase` (ex: `User`, `InsertUser`)

### Imports
```typescript
// 1. Imports externes
import { z } from 'zod';
import { Router } from 'express';

// 2. Imports partagés
import type { User } from '@shared/schema';

// 3. Imports internes (utils, services)
import { logger } from '../utils/logger';
import { asyncHandler } from '../utils/error-handler';

// 4. Imports relatifs
import { createService } from './service';
```

### Fichiers
- **Routes:** `routes.ts` ou `coreRoutes.ts`
- **Services:** `[Name]Service.ts`
- **Types:** `types.ts` dans module
- **Index:** `index.ts` pour exports




