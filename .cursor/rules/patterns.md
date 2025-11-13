# Patterns Réutilisables - Saxium

**Patterns de code réutilisables** pour le projet Saxium.

## 🏗️ Patterns Architecturaux

### Factory Pattern (Modules)

```typescript
// server/modules/[module]/routes.ts
import { Router } from 'express';
import type { IStorage } from '../../storage-poc';
import type { EventBus } from '../../eventBus';

export function create[Module]Router(
  storage: IStorage,
  eventBus: EventBus
): Router {
  const router = Router();
  
  // Routes...
  
  return router;
}

// server/modules/[module]/index.ts
export { create[Module]Router } from './routes';
export type { [Module]Types } from './types';
```

### Service Layer Pattern

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
        
        const result = await this.storage.method(params);
        
        this.eventBus.publish({
          type: '[entity].action',
          entity: '[entity]',
          entityId: result.id
        });
        
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

### Repository Pattern (Storage)

```typescript
// server/storage-poc.ts
export interface IStorage {
  getEntities(): Promise<Entity[]>;
  getEntity(id: string): Promise<Entity | undefined>;
  createEntity(entity: InsertEntity): Promise<Entity>;
  updateEntity(id: string, entity: Partial<InsertEntity>): Promise<Entity>;
  deleteEntity(id: string): Promise<void>;
}

// Implémentation
async getEntities(): Promise<Entity[]> {
  return await db.select().from(entities);
}

async getEntity(id: string): Promise<Entity | undefined> {
  const [entity] = await db.select()
    .from(entities)
    .where(eq(entities.id, id))
    .limit(1);
  return entity;
}
```

## 🔄 Patterns de Données

### Pagination

```typescript
// Storage
async getEntitiesPaginated(
  search?: string,
  status?: string,
  limit: number = 50,
  offset: number = 0
): Promise<{ entities: Entity[]; total: number }> {
  let query = db.select().from(entities);
  
  if (search) {
    query = query.where(ilike(entities.name, `%${search}%`));
  }
  
  if (status) {
    query = query.where(eq(entities.status, status));
  }
  
  const [entities, [{ count }]] = await Promise.all([
    query.limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(entities)
  ]);
  
  return { entities, total: Number(count) };
}

// Route
router.get('/api/entities',
  validateQuery(paginationSchema),
  asyncHandler(async (req, res) => {
    const { search, status, limit = 50, offset = 0 } = req.query;
    const result = await storage.getEntitiesPaginated(search, status, limit, offset);
    res.json({ success: true, data: result });
  })
);
```

### Transactions

```typescript
import { withTransaction } from '../utils/database-helpers';
import type { DrizzleTransaction } from '../storage-poc';

const result = await withTransaction(async (tx) => {
  const entity1 = await storage.createEntity1(data1, tx);
  const entity2 = await storage.createEntity2(data2, tx);
  return { entity1, entity2 };
});
```

### Cache Intelligent

```typescript
import { getContextCacheService } from '../services/ContextCacheService';

const cacheService = getContextCacheService(storage);

// Vérification cache
const cacheKey = `entity:${id}`;
const cached = await cacheService.get(cacheKey);
if (cached) return cached;

// Génération et mise en cache
const result = await generateResult();
await cacheService.set(cacheKey, result, { ttl: 3600 });
return result;
```

## 🎨 Patterns Frontend

### Composant avec Query

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-helpers';
import { useToast } from '@/hooks/use-toast';

export function EntityComponent({ id }: { id: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['entity', id],
    queryFn: () => apiRequest(`/api/entities/${id}`),
    staleTime: 5 * 60 * 1000
  });
  
  const mutation = useMutation({
    mutationFn: (data: UpdateData) =>
      apiRequest(`/api/entities/${id}`, { method: 'PATCH', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entity', id] });
      toast({ title: 'Succès', description: 'Modification réussie' });
    },
    onError: (error) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    }
  });
  
  if (isLoading) return <div>Chargement...</div>;
  if (error) return <div>Erreur: {error.message}</div>;
  if (!data) return <div>Aucune donnée</div>;
  
  return (
    <div>
      {/* Contenu */}
    </div>
  );
}
```

### Form avec React Hook Form

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const schema = z.object({
  name: z.string().min(1, 'Nom requis'),
  email: z.string().email('Email invalide')
});

export function EntityForm({ onSubmit }: { onSubmit: (data: z.infer<typeof schema>) => void }) {
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      email: ''
    }
  });
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nom</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Envoyer</Button>
      </form>
    </Form>
  );
}
```

### Hook Personnalisé avec Query

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-helpers';

export function useEntity(id: string) {
  return useQuery({
    queryKey: ['entity', id],
    queryFn: () => apiRequest(`/api/entities/${id}`),
    enabled: !!id
  });
}

export function useUpdateEntity() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateData }) =>
      apiRequest(`/api/entities/${id}`, { method: 'PATCH', body: data }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['entity', id] });
      queryClient.invalidateQueries({ queryKey: ['entities'] });
    }
  });
}
```

## 🔒 Patterns de Sécurité

### RBAC dans Route

```typescript
import { RBACService } from '../services/RBACService';

router.get('/api/entities/:id',
  asyncHandler(async (req, res) => {
    const hasAccess = await rbacService.checkPermission(
      req.user!.id,
      'entity',
      'read'
    );
    
    if (!hasAccess) {
      throw new AuthorizationError('Accès refusé');
    }
    
    const entity = await storage.getEntity(req.params.id);
    if (!entity) {
      throw new NotFoundError('Entité');
    }
    
    // Filtrage par rôle
    const filtered = await rbacService.filterByRole([entity], req.user!.role);
    
    res.json({ success: true, data: filtered[0] });
  })
);
```

### Validation Input

```typescript
import { z } from 'zod';
import { validateBody, validateQuery } from '../middleware/validation';

const createSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email(),
  role: z.enum(['admin', 'user'])
});

const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50)
});

router.post('/api/entities',
  validateBody(createSchema),
  asyncHandler(async (req, res) => {
    // req.body est validé et typé
  })
);

router.get('/api/entities',
  validateQuery(querySchema),
  asyncHandler(async (req, res) => {
    // req.query est validé et typé
  })
);
```

## 📊 Patterns de Performance

### Lazy Loading

```typescript
// App.tsx
import { lazy, Suspense } from 'react';
import PageLoader from '@/components/PageLoader';

const Dashboard = lazy(() => import('@/pages/dashboard'));
const Offers = lazy(() => import('@/pages/offers'));

function App() {
  return (
    <Suspense fallback={<PageLoader message="Chargement..." />}>
      <Router>
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/offers" component={Offers} />
      </Router>
    </Suspense>
  );
}
```

### Memoization

```typescript
import { useMemo, useCallback } from 'react';

// Memoization calcul coûteux
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(data);
}, [data]);

// Callback stable
const handleClick = useCallback(() => {
  onAction(id);
}, [id, onAction]);
```

### Optimisation Listes

```typescript
import { OptimizedList } from '@/components/optimized/OptimizedList';

<OptimizedList
  items={items}
  renderItem={(item) => <ItemComponent item={item} />}
  keyExtractor={(item) => item.id}
/>
```

## 🧪 Patterns de Tests

### Test Route

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../index';

describe('POST /api/entities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  it('should create entity', async () => {
    const response = await request(app)
      .post('/api/entities')
      .send({ name: 'Test', email: 'test@example.com' })
      .expect(200);
    
    expect(response.body.success).toBe(true);
    expect(response.body.data.name).toBe('Test');
  });
});
```

### Test Service

```typescript
import { describe, it, expect, vi } from 'vitest';
import { Service } from '../services/Service';
import { ValidationError } from '../utils/error-handler';

describe('Service', () => {
  it('should handle success', async () => {
    const service = new Service(mockStorage);
    const result = await service.method(params);
    expect(result).toBeDefined();
  });
  
  it('should throw ValidationError', async () => {
    await expect(service.method(invalidParams))
      .rejects.toThrow(ValidationError);
  });
});
```

## 🔗 Références

- `@systemPatterns.md` - Patterns architecturaux complets
- `@.cursor/rules/backend.md` - Patterns backend
- `@.cursor/rules/frontend.md` - Patterns frontend
- `@.cursor/rules/workflows.md` - Workflows avec patterns

---

**Note:** Ces patterns sont réutilisables et testés. Utiliser comme référence pour maintenir la cohérence du code.





