# Troubleshooting - Saxium

**Guide de résolution de problèmes** courants dans le projet Saxium.

## 🐛 Problèmes Courants

### Backend

#### Erreur: "Cannot find module '../utils/logger'"

**Solution:**
```typescript
// Vérifier le chemin d'import
import { logger } from '../utils/logger'; // ✅ Correct
import { logger } from '@/utils/logger';  // ❌ Incorrect (alias @ non disponible backend)
```

#### Erreur: "asyncHandler is not a function"

**Solution:**
```typescript
// Vérifier l'import
import { asyncHandler } from '../utils/error-handler'; // ✅ Correct
import asyncHandler from '../utils/error-handler';      // ❌ Incorrect (named export)
```

#### Erreur: "ValidationError is not defined"

**Solution:**
```typescript
// Importer depuis error-handler
import { ValidationError, NotFoundError } from '../utils/error-handler';
```

#### Erreur: "Cannot use console.log in server code"

**Solution:**
```typescript
// Remplacer console.log par logger
import { logger } from '../utils/logger';

// ❌ console.log('Message');
// ✅ logger.info('Message', { metadata: { context: 'value' } });
```

#### Erreur: "Route handler must return a value"

**Solution:**
```typescript
// Utiliser asyncHandler (gère automatiquement)
router.post('/api/route', asyncHandler(async (req, res) => {
  // Pas besoin de return
  res.json({ success: true, data: result });
}));
```

### Frontend

#### Erreur: "Cannot read property 'data' of undefined"

**Solution:**
```typescript
// Vérifier loading et error states
const { data, isLoading, error } = useQuery({...});

if (isLoading) return <div>Chargement...</div>;
if (error) return <div>Erreur: {error.message}</div>;
if (!data) return <div>Aucune donnée</div>;

// Maintenant data est défini
return <div>{data.name}</div>;
```

#### Erreur: "QueryClient not found"

**Solution:**
```typescript
// Wrapper avec QueryClientProvider
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

render(
  <QueryClientProvider client={queryClient}>
    <Component />
  </QueryClientProvider>
);
```

#### Erreur: "Component is not defined"

**Solution:**
```typescript
// Vérifier l'import
import { Component } from '@/components/Component'; // ✅ Correct
import Component from '@/components/Component';     // Vérifier si default export
```

### Base de Données

#### Erreur: "Table does not exist"

**Solution:**
```bash
# Pousser le schéma vers la base de données
npm run db:push
```

#### Erreur: "Column does not exist"

**Solution:**
1. Vérifier le schéma dans `shared/schema.ts`
2. Vérifier le nom de la colonne (snake_case)
3. Exécuter `npm run db:push`

#### Erreur: "Type mismatch"

**Solution:**
```typescript
// Vérifier les types
import type { User, InsertUser } from '@shared/schema';

// ✅ Correct
const user: InsertUser = { email: 'user@example.com' };
const created: User = await storage.createUser(user);

// ❌ Incorrect
const user: User = { email: 'user@example.com' }; // User a id, createdAt, etc.
```

### Services IA

#### Erreur: "getAIService is not a function"

**Solution:**
```typescript
// Utiliser getAIService (singleton)
import { getAIService } from '../services/AIService';

const aiService = getAIService(storage); // ✅ Correct
const aiService = new AIService(storage); // ❌ Incorrect
```

#### Erreur: "userRole is required"

**Solution:**
```typescript
// Toujours fournir userRole pour RBAC
const result = await aiService.generateSQL({
  query: 'Requête',
  context: 'Contexte',
  userRole: user.role // ✅ Requis
});
```

#### Erreur: "SQL injection detected"

**Solution:**
```typescript
// Utiliser SQLEngineService (validation automatique)
import { SQLEngineService } from '../services/SQLEngineService';

const result = await sqlEngine.executeNaturalLanguageQuery({
  naturalLanguageQuery: 'Requête en langage naturel',
  userId: user.id,
  userRole: user.role
});

// ❌ Ne jamais exécuter SQL brut
```

## 🔧 Solutions Rapides

### Problème: Tests qui échouent

**Vérifier:**
1. Mocks correctement configurés
2. Async/await correctement gérés
3. Cleanup entre tests (beforeEach/afterEach)

**Solution:**
```typescript
describe('Test', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  it('should work', async () => {
    // Utiliser await pour async
    const result = await service.method();
    expect(result).toBeDefined();
  });
});
```

### Problème: Cache obsolète

**Solution:**
```typescript
// Invalider le cache
queryClient.invalidateQueries({ queryKey: ['entity', id] });

// Ou utiliser staleTime
useQuery({
  queryKey: ['entity', id],
  queryFn: () => apiRequest(`/api/entities/${id}`),
  staleTime: 0 // Toujours considérer comme stale
});
```

### Problème: Erreurs de linting

**Solution:**
```bash
# Vérifier les erreurs
npm run check

# Corriger automatiquement si possible
npm run lint -- --fix
```

### Problème: Types TypeScript incorrects

**Solution:**
```typescript
// Vérifier les imports de types
import type { User } from '@shared/schema';

// Utiliser types corrects
const user: User = await storage.getUser(id);
const newUser: InsertUser = { email: 'user@example.com' };
```

## 📋 Checklist de Débogage

### Avant de Demander de l'Aide

- [ ] Vérifier les imports (chemins corrects)
- [ ] Vérifier les types TypeScript
- [ ] Vérifier les logs (logger structuré)
- [ ] Vérifier la documentation (`server/utils/README-UTILS.md`)
- [ ] Vérifier les règles Cursor (`.cursor/rules/`)
- [ ] Vérifier les fichiers de mémoire (`activeContext.md`, etc.)

### Pour Erreurs Backend

- [ ] Vérifier `asyncHandler` utilisé
- [ ] Vérifier `logger` au lieu de `console.log`
- [ ] Vérifier erreurs typées utilisées
- [ ] Vérifier validation Zod
- [ ] Vérifier types depuis `@shared/schema`

### Pour Erreurs Frontend

- [ ] Vérifier TanStack Query configuré
- [ ] Vérifier loading/error states
- [ ] Vérifier imports UI components
- [ ] Vérifier types depuis `@shared/schema`
- [ ] Vérifier responsive design

### Pour Erreurs Base de Données

- [ ] Vérifier schéma dans `shared/schema.ts`
- [ ] Exécuter `npm run db:push`
- [ ] Vérifier types (User vs InsertUser)
- [ ] Vérifier Drizzle ORM utilisé (pas SQL brut)

## 🔗 Ressources

### Documentation
- `server/utils/README-UTILS.md` - Utilitaires backend
- `projectbrief.md` - Contexte projet
- `activeContext.md` - État actuel
- `.cursor/rules/` - Règles Cursor

### Fichiers de Référence
- `@server/modules/auth/routes.ts` - Exemple route
- `@server/services/AIService.ts` - Exemple service
- `@client/src/components/ui/button.tsx` - Exemple composant

### Logs
- Vérifier logs structurés avec `logger`
- Vérifier correlation IDs pour traçabilité
- Vérifier métadonnées dans logs

---

**Note:** Si le problème persiste, vérifier les fichiers de mémoire et les règles Cursor pour comprendre le contexte du projet.




