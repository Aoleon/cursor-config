# Quick Reference - Saxium

**Référence rapide** pour les patterns et conventions du projet Saxium.

## 🚀 Patterns Rapides

### Route Express

```typescript
import { Router } from 'express';
import { asyncHandler } from '../utils/error-handler';
import { validateBody } from '../middleware/validation';
import { logger } from '../utils/logger';
import { z } from 'zod';

const schema = z.object({ field: z.string().min(1) });

export function createRouter(storage: IStorage, eventBus: EventBus): Router {
  const router = Router();
  
  router.post('/api/route',
    validateBody(schema),
    asyncHandler(async (req, res) => {
      logger.info('[Module] Action', { metadata: { userId: req.user?.id } });
      const result = await storage.method(req.body);
      res.json({ success: true, data: result });
    })
  );
  
  return router;
}
```

### Service Métier

```typescript
import type { IStorage } from '../storage-poc';
import { logger } from '../utils/logger';
import { withErrorHandling } from '../utils/error-handler';

export class Service {
  constructor(private storage: IStorage) {}
  
  async method(params: Params): Promise<Result> {
    return withErrorHandling(
      async () => {
        logger.info('[Service] Méthode', { metadata: { params } });
        return await this.storage.method(params);
      },
      { operation: 'method', service: 'Service' }
    );
  }
}
```

### Composant React

```typescript
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-helpers';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

export function Component({ id }: { id: string }) {
  const { toast } = useToast();
  const { data, isLoading } = useQuery({
    queryKey: ['entity', id],
    queryFn: () => apiRequest(`/api/entities/${id}`)
  });
  
  const mutation = useMutation({
    mutationFn: (data: UpdateData) =>
      apiRequest(`/api/entities/${id}`, { method: 'PATCH', body: data }),
    onSuccess: () => toast({ title: 'Succès' })
  });
  
  if (isLoading) return <div>Chargement...</div>;
  return <div>{/* Contenu */}</div>;
}
```

### Hook Personnalisé

```typescript
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-helpers';

export function useEntity(id: string) {
  return useQuery({
    queryKey: ['entity', id],
    queryFn: () => apiRequest(`/api/entities/${id}`),
    enabled: !!id
  });
}
```

### Test Backend

```typescript
import { describe, it, expect, vi } from 'vitest';
import { asyncHandler } from '../utils/error-handler';
import { ValidationError } from '../utils/error-handler';

describe('Service', () => {
  it('should handle success', async () => {
    const result = await service.method(params);
    expect(result).toBeDefined();
  });
  
  it('should throw ValidationError', async () => {
    await expect(service.method(invalidParams))
      .rejects.toThrow(ValidationError);
  });
});
```

### Test Frontend

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Component } from './Component';

describe('Component', () => {
  it('should render', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <Component id="123" />
      </QueryClientProvider>
    );
    await waitFor(() => {
      expect(screen.getByText('Expected')).toBeInTheDocument();
    });
  });
});
```

## 📋 Imports Standards

### Backend

```typescript
// 1. Externes
import { z } from 'zod';
import { Router } from 'express';

// 2. Partagés
import type { User } from '@shared/schema';

// 3. Internes
import { logger } from '../utils/logger';
import { asyncHandler } from '../utils/error-handler';
import { validateBody } from '../middleware/validation';
```

### Frontend

```typescript
// 1. React
import { useState, useEffect } from 'react';

// 2. Externes
import { useQuery } from '@tanstack/react-query';

// 3. UI
import { Button } from '@/components/ui/button';

// 4. Internes
import { useEntity } from '@/hooks/useEntity';
import { apiRequest } from '@/lib/api-helpers';

// 5. Types
import type { User } from '@shared/schema';
```

## 🔧 Utilitaires Courants

### Logger

```typescript
import { logger } from '../utils/logger';

logger.info('Message', { metadata: { userId: '123' } });
logger.error('Erreur', error, { metadata: { operation: 'op' } });
```

### Erreurs Typées

```typescript
import { ValidationError, NotFoundError } from '../utils/error-handler';

throw new ValidationError('Champ requis');
throw new NotFoundError('Ressource');
```

### Validation Zod

```typescript
import { z } from 'zod';
import { validateBody } from '../middleware/validation';

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email()
});

router.post('/api/route', validateBody(schema), asyncHandler(...));
```

### Storage

```typescript
import type { IStorage } from '../storage-poc';
import type { User, InsertUser } from '@shared/schema';

const user: InsertUser = { email: 'user@example.com' };
const created = await storage.createUser(user);
const found: User | undefined = await storage.getUser(id);
```

## 🎯 Conventions

### Naming
- **Services:** `PascalCase` + `Service` (ex: `AIService`)
- **Routes:** `kebab-case` (ex: `/api/offers/:id`)
- **Composants:** `PascalCase` (ex: `OfferCard`)
- **Hooks:** `camelCase` avec `use` (ex: `useOffer`)
- **Types:** `PascalCase` (ex: `User`, `InsertUser`)

### Fichiers
- **Routes:** `routes.ts` ou `coreRoutes.ts`
- **Services:** `[Name]Service.ts`
- **Composants:** `[Name].tsx`
- **Hooks:** `use-[name].ts`
- **Types:** `types.ts` dans module

## ⚠️ À Éviter

### Backend
- ❌ `console.log`/`error` (utiliser `logger`)
- ❌ `try-catch` dans routes (utiliser `asyncHandler`)
- ❌ `throw new Error()` (utiliser erreurs typées)
- ❌ SQL brut (utiliser Drizzle ORM)

### Frontend
- ❌ Server state dans Context (utiliser TanStack Query)
- ❌ Styles inline (utiliser Tailwind)
- ❌ Composants UI custom si équivalent existe

### Base de Données
- ❌ Migrations SQL manuelles (utiliser `db:push`)
- ❌ SQL brut (utiliser Drizzle ORM)
- ❌ Requêtes N+1 (utiliser `KpiRepository`)

## 🔗 Références Rapides

### Fichiers Essentiels
- `@projectbrief.md` - Objectifs
- `@activeContext.md` - État actuel
- `@server/utils/README-UTILS.md` - Utilitaires
- `@.cursor/rules/core.md` - Règles fondamentales

### Exemples
- `@server/modules/auth/routes.ts` - Route modulaire
- `@server/services/AIService.ts` - Service métier
- `@client/src/components/ui/button.tsx` - Composant UI
- `@client/src/hooks/useOffer.ts` - Hook personnalisé

---

**Note:** Ce fichier est une référence rapide. Pour plus de détails, voir les fichiers de règles complets.





