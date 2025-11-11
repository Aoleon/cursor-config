# Anti-Patterns - Saxium

**Référence:** [Cursor Rules Documentation](https://docs.cursor.com/context/rules)  
**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

Ce fichier consolide tous les anti-patterns du projet organisés par domaine pour faciliter la détection et la correction automatique.

## 🎯 Objectif

Consolider tous les anti-patterns dispersés dans les fichiers de règles pour :
- Faciliter la détection automatique
- Améliorer la correction automatique
- Centraliser les exemples de code à éviter

## 🚫 Anti-Patterns par Domaine

### Backend

#### 1. Gestion d'Erreurs

**❌ MAUVAIS - try-catch dans route**
```typescript
router.post('/api/route', async (req, res) => {
  try {
    const data = await service.method(req.body);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: 'Erreur' });
  }
});
```

**✅ CORRECT - Utiliser asyncHandler**
```typescript
router.post('/api/route',
  asyncHandler(async (req, res) => {
    const data = await service.method(req.body);
    res.json({ success: true, data });
  })
);
```

**Référence:** `@.cursor/rules/backend.md` - Patterns backend

#### 2. Logging

**❌ MAUVAIS - console.log**
```typescript
console.log('Data:', data);
console.error('Error:', error);
```

**✅ CORRECT - Utiliser logger**
```typescript
import { logger } from '../utils/logger';

logger.info('Data processed', {
  metadata: { dataId: data.id }
});

logger.error('Error occurred', {
  metadata: { error: error.message }
});
```

**Référence:** `@.cursor/rules/backend.md` - Patterns backend

#### 3. Erreurs Typées

**❌ MAUVAIS - Erreur générique**
```typescript
throw new Error('Something went wrong');
```

**✅ CORRECT - Erreur typée**
```typescript
import { ValidationError, NotFoundError } from '../utils/error-handler';

throw new ValidationError('Invalid input', fieldErrors);
throw new NotFoundError('Resource not found');
```

**Référence:** `@.cursor/rules/backend.md` - Patterns backend

#### 4. Validation

**❌ MAUVAIS - Pas de validation**
```typescript
router.post('/api/route', async (req, res) => {
  const data = req.body; // ❌ Pas de validation
  await service.method(data);
});
```

**✅ CORRECT - Validation Zod**
```typescript
import { validateBody } from '../middleware/validation';
import { z } from 'zod';

const schema = z.object({
  field: z.string().min(1)
});

router.post('/api/route',
  validateBody(schema),
  asyncHandler(async (req, res) => {
    const data = req.body; // ✅ Validé
    await service.method(data);
  })
);
```

**Référence:** `@.cursor/rules/backend.md` - Patterns backend

### Base de Données

#### 1. SQL Brut

**❌ MAUVAIS - SQL brut**
```typescript
const result = await db.query('SELECT * FROM users WHERE id = $1', [id]);
const result = await db.query(`SELECT * FROM users WHERE name = '${name}'`); // ❌ Injection SQL
```

**✅ CORRECT - Drizzle ORM**
```typescript
import { eq } from 'drizzle-orm';
import { users } from '@shared/schema';

const result = await db
  .select()
  .from(users)
  .where(eq(users.id, id));
```

**Référence:** `@.cursor/rules/database.md` - Règles base de données

#### 2. Migrations SQL Manuelles

**❌ MAUVAIS - Migration SQL manuelle**
```sql
-- ❌ Ne pas créer migrations SQL manuelles
CREATE TABLE users (...);
ALTER TABLE users ADD COLUMN email VARCHAR(255);
```

**✅ CORRECT - Modifier schéma et push**
```typescript
// Modifier shared/schema.ts
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull()
});

// Puis exécuter
npm run db:push
```

**Référence:** `@.cursor/rules/database.md` - Règles base de données

#### 3. Requêtes N+1

**❌ MAUVAIS - Requêtes N+1**
```typescript
const users = await db.select().from(users);
for (const user of users) {
  const profile = await db.select().from(profiles).where(eq(profiles.userId, user.id)); // ❌ N+1
}
```

**✅ CORRECT - Requête join**
```typescript
const usersWithProfiles = await db
  .select()
  .from(users)
  .leftJoin(profiles, eq(profiles.userId, users.id));
```

**Référence:** `@.cursor/rules/database.md` - Règles base de données

### Frontend

#### 1. Server State dans Context

**❌ MAUVAIS - Server state dans Context**
```typescript
const [data, setData] = useState(null);

useEffect(() => {
  fetch('/api/data').then(res => res.json()).then(setData);
}, []);
```

**✅ CORRECT - TanStack Query**
```typescript
import { useQuery } from '@tanstack/react-query';

const { data, isLoading } = useQuery({
  queryKey: ['data'],
  queryFn: () => fetch('/api/data').then(res => res.json())
});
```

**Référence:** `@.cursor/rules/frontend.md` - Patterns frontend

#### 2. Styles Inline

**❌ MAUVAIS - Styles inline**
```typescript
<div style={{ color: 'red', fontSize: '16px' }}>Content</div>
```

**✅ CORRECT - Tailwind CSS**
```typescript
<div className="text-red-500 text-base">Content</div>
```

**Référence:** `@.cursor/rules/frontend.md` - Patterns frontend

#### 3. Composants UI Custom

**❌ MAUVAIS - Créer composant UI custom si équivalent existe**
```typescript
// ❌ Si Button existe dans @/components/ui/button.tsx
function MyButton() {
  return <button>Click me</button>;
}
```

**✅ CORRECT - Utiliser composant UI existant**
```typescript
import { Button } from '@/components/ui/button';

<Button onClick={handleClick}>Click me</Button>
```

**Référence:** `@.cursor/rules/frontend.md` - Patterns frontend

### Services IA

#### 1. SQL Brut dans Services IA

**❌ MAUVAIS - SQL brut**
```typescript
const result = await db.query('SELECT * FROM users WHERE role = $1', [userRole]);
```

**✅ CORRECT - SQLEngineService**
```typescript
import { SQLEngineService } from '../services/SQLEngineService';

const result = await sqlEngine.executeNaturalLanguageQuery({
  naturalLanguageQuery: query,
  userId: user.id,
  userRole: user.role
});
```

**Référence:** `@.cursor/rules/ai-services.md` - Services IA

#### 2. Nouvelles Instances de Services IA

**❌ MAUVAIS - Créer nouvelle instance**
```typescript
const aiService = new AIService(storage, eventBus);
```

**✅ CORRECT - Utiliser getter**
```typescript
import { getAIService } from '../services/AIService';

const aiService = getAIService(storage);
```

**Référence:** `@.cursor/rules/ai-services.md` - Services IA

### Types TypeScript

#### 1. Types `any`

**❌ MAUVAIS - Types `any`**
```typescript
function process(data: any): any {
  return data.value;
}
```

**✅ CORRECT - Types stricts**
```typescript
interface Data {
  value: string;
}

function process(data: Data): string {
  return data.value;
}
```

**Référence:** `@.cursor/rules/code-quality.md` - Standards qualité code

#### 2. Types `unknown` mal utilisés

**❌ MAUVAIS - `unknown` sans validation**
```typescript
function process(data: unknown) {
  return data.value; // ❌ Erreur TypeScript
}
```

**✅ CORRECT - Validation avec type guard**
```typescript
function isData(data: unknown): data is Data {
  return typeof data === 'object' && data !== null && 'value' in data;
}

function process(data: unknown) {
  if (!isData(data)) {
    throw new ValidationError('Invalid data');
  }
  return data.value; // ✅ TypeScript sait que data est Data
}
```

**Référence:** `@.cursor/rules/code-quality.md` - Standards qualité code

### Code Quality

#### 1. Code Dupliqué

**❌ MAUVAIS - Code dupliqué**
```typescript
const formatted1 = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR'
}).format(montant1);

const formatted2 = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR'
}).format(montant2);
```

**✅ CORRECT - Fonction réutilisable**
```typescript
function formatCurrency(montant: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR'
  }).format(montant);
}

const formatted1 = formatCurrency(montant1);
const formatted2 = formatCurrency(montant2);
```

**Référence:** `@.cursor/rules/code-quality.md` - Standards qualité code

#### 2. Fonctions Trop Longues

**❌ MAUVAIS - Fonction > 100 lignes**
```typescript
async function processEverything() {
  // 200 lignes de code...
  // Difficile à maintenir et tester
}
```

**✅ CORRECT - Diviser en fonctions plus petites**
```typescript
async function processEverything() {
  const data = await fetchData();
  const processed = await processData(data);
  const result = await saveResult(processed);
  return result;
}

async function fetchData() { /* ... */ }
async function processData(data: Data) { /* ... */ }
async function saveResult(result: Result) { /* ... */ }
```

**Référence:** `@.cursor/rules/code-quality.md` - Standards qualité code

#### 3. Magic Numbers

**❌ MAUVAIS - Magic numbers**
```typescript
if (user.age > 18) {
  // ...
}

setTimeout(() => {
  // ...
}, 5000);
```

**✅ CORRECT - Constantes nommées**
```typescript
const MIN_AGE = 18;
const TIMEOUT_MS = 5000;

if (user.age > MIN_AGE) {
  // ...
}

setTimeout(() => {
  // ...
}, TIMEOUT_MS);
```

**Référence:** `@.cursor/rules/code-quality.md` - Standards qualité code

### Tests

#### 1. Tests Trop Larges

**❌ MAUVAIS - Test trop large**
```typescript
it('should process everything', async () => {
  // Test de 100 lignes testant plusieurs choses
});
```

**✅ CORRECT - Tests focalisés**
```typescript
it('should fetch data', async () => {
  // Test focalisé sur fetch
});

it('should process data', async () => {
  // Test focalisé sur process
});
```

**Référence:** `@.cursor/rules/testing.md` - Patterns tests

#### 2. Dépendances entre Tests

**❌ MAUVAIS - Tests dépendants**
```typescript
let sharedData;

it('should create data', async () => {
  sharedData = await createData();
});

it('should use shared data', async () => {
  // ❌ Dépend de test précédent
  await useData(sharedData);
});
```

**✅ CORRECT - Tests indépendants**
```typescript
it('should create data', async () => {
  const data = await createData();
  expect(data).toBeDefined();
});

it('should use data', async () => {
  const data = await createData(); // ✅ Indépendant
  await useData(data);
});
```

**Référence:** `@.cursor/rules/testing.md` - Patterns tests

### Contexte et Recherche

#### 1. Trop de Fichiers dans le Contexte

**❌ MAUVAIS - Inclure 20+ fichiers**
```
@file1.ts
@file2.ts
@file3.ts
... (20+ fichiers)
```

**✅ CORRECT - Limiter à 5-10 fichiers pertinents**
```
@server/modules/auth/routes.ts - Exemple route modulaire
@server/utils/error-handler.ts - Gestion erreurs
@.cursor/rules/backend.md - Patterns backend
```

**Référence:** `@.cursor/rules/context-usage.md` - Utilisation optimale du contexte

#### 2. Fichiers Non Pertinents

**❌ MAUVAIS - Inclure fichiers non pertinents**
```
@client/src/components/Button.tsx - Pour modification backend
@server/services/AIService.ts - Pour modification frontend
```

**✅ CORRECT - Inclure uniquement fichiers pertinents**
```
// Pour modification backend
@server/modules/auth/routes.ts
@server/utils/error-handler.ts
@.cursor/rules/backend.md
```

**Référence:** `@.cursor/rules/context-usage.md` - Utilisation optimale du contexte

## 🔍 Détection Automatique

### Scripts de Détection

**Référence:** `@.cursor/rules/auto-detection.md` - Détection automatique des anti-patterns

**Patterns à détecter:**
- `console.log` / `console.error` dans code serveur
- `try-catch` dans routes Express
- `throw new Error()` générique
- SQL brut (requêtes SQL directes)
- Types `any` utilisés
- Code dupliqué
- Fonctions > 100 lignes
- Magic numbers

### Correction Automatique

**Référence:** `@.cursor/rules/auto-detection.md` - Correction automatique

**Corrections automatiques:**
- Remplacer `console.log` par `logger`
- Remplacer `try-catch` dans routes par `asyncHandler`
- Remplacer `throw new Error()` par erreurs typées
- Remplacer SQL brut par Drizzle ORM
- Remplacer types `any` par types stricts

## 📊 Checklist Anti-Patterns

### Avant Commit

- [ ] Pas de `console.log`/`error` dans code serveur
- [ ] Pas de `try-catch` dans routes
- [ ] Pas de `throw new Error()` générique
- [ ] Pas de SQL brut
- [ ] Pas de types `any`
- [ ] Pas de code dupliqué significatif
- [ ] Pas de fonctions > 100 lignes
- [ ] Pas de magic numbers

### Code Review

- [ ] Vérifier anti-patterns backend
- [ ] Vérifier anti-patterns frontend
- [ ] Vérifier anti-patterns database
- [ ] Vérifier anti-patterns services IA
- [ ] Vérifier anti-patterns types TypeScript
- [ ] Vérifier anti-patterns code quality
- [ ] Vérifier anti-patterns tests

## 🔗 Références

### Règles par Domaine

- `@.cursor/rules/backend.md` - Anti-patterns backend
- `@.cursor/rules/frontend.md` - Anti-patterns frontend
- `@.cursor/rules/database.md` - Anti-patterns database
- `@.cursor/rules/ai-services.md` - Anti-patterns services IA
- `@.cursor/rules/code-quality.md` - Anti-patterns code quality
- `@.cursor/rules/testing.md` - Anti-patterns tests

### Détection et Correction

- `@.cursor/rules/auto-detection.md` - Détection automatique
- `@.cursor/rules/quality-checklist.md` - Checklist qualité

### Exemples

- `@.cursor/rules/examples.md` - Exemples concrets
- `@.cursor/rules/workflows.md` - Workflows détaillés

---

**Note:** Ce fichier consolide tous les anti-patterns du projet. Pour les détails par domaine, consultez les fichiers de règles référencés.

**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

