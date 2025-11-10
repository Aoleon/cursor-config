# Tâches Courantes - Saxium

**Guide rapide** pour les tâches courantes du projet Saxium.

## 🎯 Tâches Fréquentes

### 1. Créer une Nouvelle Route API

**Contexte nécessaire:**
```
@server/modules/auth/routes.ts - Exemple route modulaire
@.cursor/rules/backend.md - Règles backend
@.cursor/rules/workflows.md - Workflow création route
@server/utils/README-UTILS.md - Utilitaires
```

**Étapes:**
1. Vérifier si module existe dans `server/modules/`
2. Si oui, ajouter route dans `server/modules/[module]/routes.ts`
3. Si non, créer nouveau module
4. Utiliser `asyncHandler`, `validateBody`, `logger`
5. Tester la route

**Pattern:**
```typescript
router.post('/api/[module]/create',
  validateBody(schema),
  asyncHandler(async (req, res) => {
    logger.info('[Module] Création', { metadata: { userId: req.user?.id } });
    const result = await storage.create[Entity](req.body);
    res.json({ success: true, data: result });
  })
);
```

### 2. Créer un Nouveau Composant React

**Contexte nécessaire:**
```
@client/src/components/ui/button.tsx - Exemple composant UI
@.cursor/rules/frontend.md - Règles frontend
@.cursor/rules/workflows.md - Workflow création composant
@client/src/hooks/useOffer.ts - Exemple hook
```

**Étapes:**
1. Vérifier si composant UI existe dans `@/components/ui/`
2. Si oui, utiliser le composant existant
3. Si non, créer composant dans `client/src/components/`
4. Utiliser TanStack Query pour server state
5. Utiliser React Hook Form + Zod pour formulaires
6. Tester le composant

**Pattern:**
```typescript
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-helpers';
import { Button } from '@/components/ui/button';

export function Component({ id }: { id: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['entity', id],
    queryFn: () => apiRequest(`/api/entities/${id}`)
  });
  
  if (isLoading) return <div>Chargement...</div>;
  return <div>{/* Contenu */}</div>;
}
```

### 3. Ajouter un Champ au Schéma DB

**Contexte nécessaire:**
```
@shared/schema.ts - Schéma actuel
@.cursor/rules/database.md - Règles base de données
@.cursor/rules/workflows.md - Workflow modification schéma
```

**Étapes:**
1. Modifier schéma dans `shared/schema.ts`
2. Exécuter `npm run db:push`
3. Vérifier migrations générées dans `migrations/`
4. Mettre à jour types dans `storage-poc.ts` si nécessaire
5. Tester les requêtes

**Pattern:**
```typescript
// shared/schema.ts
export const entities = pgTable("entities", {
  id: varchar("id", { length: 255 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  newField: varchar("new_field", { length: 255 }), // Nouveau champ
  // ...
});
```

### 4. Créer un Hook Personnalisé

**Contexte nécessaire:**
```
@client/src/hooks/useOffer.ts - Exemple hook
@.cursor/rules/frontend.md - Règles frontend
```

**Étapes:**
1. Créer fichier dans `client/src/hooks/`
2. Utiliser TanStack Query pour server state
3. Exporter hook avec préfixe `use`
4. Tester le hook

**Pattern:**
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

### 5. Ajouter Validation Zod

**Contexte nécessaire:**
```
@server/middleware/validation.ts - Middleware validation
@.cursor/rules/backend.md - Règles backend
```

**Étapes:**
1. Créer schéma Zod
2. Utiliser `validateBody` ou `validateQuery` middleware
3. Tester la validation

**Pattern:**
```typescript
import { z } from 'zod';
import { validateBody } from '../middleware/validation';

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email()
});

router.post('/api/route',
  validateBody(schema),
  asyncHandler(async (req, res) => {
    // req.body est validé et typé
  })
);
```

### 6. Ajouter Logging

**Contexte nécessaire:**
```
@server/utils/logger.ts - Logger structuré
@.cursor/rules/backend.md - Règles backend
```

**Étapes:**
1. Importer `logger` depuis `server/utils/logger.ts`
2. Utiliser `logger.info`, `logger.error`, etc.
3. Inclure métadonnées structurées

**Pattern:**
```typescript
import { logger } from '../utils/logger';

logger.info('[Service] Action', {
  metadata: {
    module: 'ModuleName',
    operation: 'operationName',
    userId: req.user?.id
  }
});
```

### 7. Gérer Erreurs

**Contexte nécessaire:**
```
@server/utils/error-handler.ts - Gestion d'erreurs
@.cursor/rules/backend.md - Règles backend
```

**Étapes:**
1. Utiliser `asyncHandler` pour routes
2. Utiliser erreurs typées (`ValidationError`, `NotFoundError`, etc.)
3. Ne pas créer `try-catch` dans routes

**Pattern:**
```typescript
import { asyncHandler } from '../utils/error-handler';
import { ValidationError, NotFoundError } from '../utils/error-handler';

router.post('/api/route', asyncHandler(async (req, res) => {
  if (!req.body.field) {
    throw new ValidationError('field requis');
  }
  
  const entity = await storage.getEntity(id);
  if (!entity) {
    throw new NotFoundError('Entité');
  }
  
  // ...
}));
```

### 8. Migrer Route vers Module

**Contexte nécessaire:**
```
@server/modules/auth/routes.ts - Exemple migration
@activeContext.md - État migration actuelle
@.cursor/rules/workflows.md - Workflow migration
```

**Étapes:**
1. Identifier route dans `server/routes-poc.ts`
2. Créer/modifier module dans `server/modules/[module]/`
3. Extraire route vers `server/modules/[module]/routes.ts`
4. Tester route migrée
5. Garder route dans `routes-poc.ts` temporairement
6. Supprimer route de `routes-poc.ts` après validation

**Pattern:**
```typescript
// 1. Créer route dans module
// server/modules/[module]/routes.ts
export function create[Module]Router(...) {
  // Route migrée
}

// 2. Enregistrer dans server/routes.ts
import { create[Module]Router } from './modules/[module]';
app.use(create[Module]Router(storage, eventBus));
```

### 9. Créer Test

**Contexte nécessaire:**
```
@.cursor/rules/testing.md - Règles tests
@tests/backend/ - Exemples tests backend
@tests/frontend/ - Exemples tests frontend
```

**Étapes:**
1. Créer test dans `tests/backend/` ou `tests/frontend/`
2. Utiliser patterns établis
3. Vérifier couverture de code
4. S'assurer test passe

**Pattern Backend:**
```typescript
import { describe, it, expect, vi } from 'vitest';
import { asyncHandler } from '../utils/error-handler';

describe('Service', () => {
  it('should handle success', async () => {
    const result = await service.method(params);
    expect(result).toBeDefined();
  });
});
```

**Pattern Frontend:**
```typescript
import { render, screen, waitFor } from '@testing-library/react';
import { Component } from './Component';

describe('Component', () => {
  it('should render', async () => {
    render(<Component id="123" />);
    await waitFor(() => {
      expect(screen.getByText('Expected')).toBeInTheDocument();
    });
  });
});
```

### 10. Optimiser Performance

**Contexte nécessaire:**
```
@.cursor/rules/performance.md - Guide performance
@activeContext.md - Optimisations en cours
```

**Étapes:**
1. Identifier goulot d'étranglement
2. Appliquer optimisation appropriée
3. Mesurer amélioration
4. Documenter optimisation

**Optimisations courantes:**
- Cache intelligent
- Pagination
- Lazy loading
- Memoization
- Code splitting
- Optimisation requêtes SQL

## 🔗 Références Rapides

### Par Tâche

**Créer route API:**
- `@.cursor/rules/workflows.md` - Workflow création route
- `@server/modules/auth/routes.ts` - Exemple route

**Créer composant:**
- `@.cursor/rules/workflows.md` - Workflow création composant
- `@client/src/components/ui/button.tsx` - Exemple composant

**Modifier schéma DB:**
- `@.cursor/rules/workflows.md` - Workflow modification schéma
- `@shared/schema.ts` - Schéma actuel

**Ajouter test:**
- `@.cursor/rules/testing.md` - Règles tests
- `@tests/backend/` - Exemples tests

**Optimiser performance:**
- `@.cursor/rules/performance.md` - Guide performance
- `@activeContext.md` - Optimisations en cours

---

**Note:** Ces tâches sont fréquentes dans le projet. Utiliser comme référence rapide.

