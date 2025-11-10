# Règles Workflows - Saxium

## 🔄 Workflows Courants du Projet

### Workflow 1: Créer une Nouvelle Route API

**Étapes:**
1. Vérifier si module existe dans `server/modules/`
2. Si oui, ajouter route dans `server/modules/[module]/routes.ts`
3. Si non, créer nouveau module ou ajouter dans module approprié
4. Utiliser factory pattern: `export function create[Module]Router(...)`
5. Utiliser `asyncHandler`, `validateBody`, `logger`
6. Tester la route

**Pattern:**
```typescript
// server/modules/[module]/routes.ts
import { Router } from 'express';
import type { IStorage } from '../../storage-poc';
import type { EventBus } from '../../eventBus';
import { asyncHandler } from '../../utils/error-handler';
import { validateBody } from '../../middleware/validation';
import { logger } from '../../utils/logger';
import { z } from 'zod';

const schema = z.object({
  field: z.string().min(1)
});

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

**Fichiers de référence:**
- `@server/modules/auth/routes.ts` - Exemple route modulaire
- `@server/utils/README-UTILS.md` - Patterns backend
- `@.cursor/rules/backend.md` - Règles backend

### Workflow 2: Modifier un Service Métier

**Étapes:**
1. Lire `server/utils/README-UTILS.md`
2. Vérifier si service existe dans `server/services/`
3. Utiliser `logger` au lieu de `console.log`
4. Utiliser `withErrorHandling` pour gestion d'erreurs
5. Tester le service

**Pattern:**
```typescript
// server/services/[Service]Service.ts
import type { IStorage } from '../storage-poc';
import { logger } from '../utils/logger';
import { withErrorHandling } from '../utils/error-handler';

export class [Service]Service {
  constructor(private storage: IStorage) {}
  
  async method(params: Params): Promise<Result> {
    return withErrorHandling(
      async () => {
        logger.info('[Service] Méthode', {
          metadata: { params }
        });
        
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

**Fichiers de référence:**
- `@server/services/AIService.ts` - Exemple service
- `@server/utils/README-UTILS.md` - Patterns services
- `@systemPatterns.md` - Patterns de design

### Workflow 3: Ajouter Fonctionnalité IA

**Étapes:**
1. Vérifier services IA existants dans `server/services/`
2. Utiliser `getAIService()` pour obtenir instance (singleton)
3. Toujours fournir `userRole` pour RBAC
4. Utiliser `SQLEngineService` pour SQL sécurisé
5. Tester avec différents rôles utilisateur

**Pattern:**
```typescript
import { getAIService } from '../services/AIService';
import { SQLEngineService } from '../services/SQLEngineService';

const aiService = getAIService(storage);
const sqlEngine = new SQLEngineService(
  aiService,
  rbacService,
  businessContextService,
  eventBus,
  storage
);

const result = await sqlEngine.executeNaturalLanguageQuery({
  naturalLanguageQuery: 'Requête en langage naturel',
  userId: user.id,
  userRole: user.role
});
```

**Fichiers de référence:**
- `@server/services/AIService.ts` - Service IA principal
- `@server/services/ChatbotOrchestrationService.ts` - Orchestration
- `@server/services/SQLEngineService.ts` - SQL sécurisé
- `@.cursor/rules/ai-services.md` - Règles services IA

### Workflow 4: Modifier Schéma Base de Données

**Étapes:**
1. Modifier schéma dans `shared/schema.ts`
2. Utiliser `npm run db:push` pour appliquer changements
3. Vérifier migrations générées dans `migrations/`
4. Mettre à jour types dans `storage-poc.ts` si nécessaire
5. Tester les requêtes

**Pattern:**
```typescript
// shared/schema.ts
export const newTable = pgTable("new_table", {
  id: varchar("id", { length: 255 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export type NewTable = typeof newTable.$inferSelect;
export type InsertNewTable = typeof newTable.$inferInsert;
```

**Fichiers de référence:**
- `@shared/schema.ts` - Schéma actuel
- `@server/storage-poc.ts` - Interface storage
- `@.cursor/rules/database.md` - Règles base de données

### Workflow 5: Créer Composant Frontend

**Étapes:**
1. Vérifier si composant UI existe dans `@/components/ui/`
2. Si oui, utiliser le composant existant
3. Si non, créer composant dans `client/src/components/`
4. Utiliser TanStack Query pour server state
5. Utiliser React Hook Form + Zod pour formulaires
6. Tester le composant

**Pattern:**
```typescript
// client/src/components/[Component].tsx
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-helpers';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

interface ComponentProps {
  id: string;
}

export function Component({ id }: ComponentProps) {
  const { toast } = useToast();
  
  const { data, isLoading } = useQuery({
    queryKey: ['entity', id],
    queryFn: () => apiRequest(`/api/entities/${id}`)
  });
  
  const mutation = useMutation({
    mutationFn: (data: UpdateData) =>
      apiRequest(`/api/entities/${id}`, { method: 'PATCH', body: data }),
    onSuccess: () => {
      toast({ title: 'Succès', description: 'Modification réussie' });
    }
  });
  
  if (isLoading) return <div>Chargement...</div>;
  if (!data) return <div>Aucune donnée</div>;
  
  return (
    <div>
      {/* Contenu */}
    </div>
  );
}
```

**Fichiers de référence:**
- `@client/src/components/ui/button.tsx` - Exemple composant UI
- `@client/src/hooks/useOffer.ts` - Exemple hook
- `@.cursor/rules/frontend.md` - Règles frontend

### Workflow 6: Migrer Route vers Module

**Étapes:**
1. Identifier route dans `server/routes-poc.ts`
2. Créer/modifier module dans `server/modules/[module]/`
3. Extraire route vers `server/modules/[module]/routes.ts`
4. Tester route migrée
5. Garder route dans `routes-poc.ts` temporairement (compatibilité)
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

// 3. Tester
// 4. Supprimer route de routes-poc.ts
```

**Fichiers de référence:**
- `@server/modules/auth/routes.ts` - Exemple migration
- `@server/modules/documents/coreRoutes.ts` - Exemple migration
- `@activeContext.md` - État migration actuelle

### Workflow 7: Ajouter Test

**Étapes:**
1. Identifier type de test (unitaire, E2E)
2. Créer test dans `tests/backend/` ou `tests/frontend/` ou `e2e/`
3. Utiliser patterns établis
4. Vérifier couverture de code
5. S'assurer test passe

**Pattern Backend:**
```typescript
// tests/backend/services/[Service].test.ts
import { describe, it, expect, vi } from 'vitest';
import { [Service]Service } from '../../../server/services/[Service]Service';

describe('[Service]Service', () => {
  it('should handle success case', async () => {
    const service = new [Service]Service(mockStorage);
    const result = await service.method(params);
    expect(result).toBeDefined();
  });
});
```

**Pattern Frontend:**
```typescript
// tests/frontend/components/[Component].test.tsx
import { render, screen } from '@testing-library/react';
import { Component } from './Component';

describe('Component', () => {
  it('should render correctly', () => {
    render(<Component id="123" />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });
});
```

**Fichiers de référence:**
- `@.cursor/rules/testing.md` - Règles tests
- `@tests/backend/` - Exemples tests backend
- `@tests/frontend/` - Exemples tests frontend

## 🎯 Checklist Workflows

### Avant de Commencer
- [ ] Lire `activeContext.md` pour connaître l'état actuel
- [ ] Lire `projectbrief.md` pour comprendre le périmètre
- [ ] Vérifier fichiers de référence pertinents

### Pendant le Développement
- [ ] Suivre patterns établis
- [ ] Utiliser utilitaires partagés
- [ ] Logger avec contexte structuré
- [ ] Gérer erreurs avec types appropriés

### Après le Développement
- [ ] Tester la fonctionnalité
- [ ] Vérifier couverture de code
- [ ] Mettre à jour documentation si nécessaire
- [ ] Vérifier pas de régression

---

**Note:** Ces workflows guident le développement pour maintenir la cohérence et la qualité du code.

