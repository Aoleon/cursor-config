# Règles Base de Données - Saxium

## 🗄️ Architecture Base de Données

### Drizzle ORM

**Fichier schéma:** `shared/schema.ts`  
**Config:** `drizzle.config.ts`

**Pattern:**
```typescript
import { db } from '../db';
import { eq, and, desc, sql } from 'drizzle-orm';
import { users, offers } from '@shared/schema';

// ✅ CORRECT - Utiliser Drizzle ORM
const user = await db.select()
  .from(users)
  .where(eq(users.id, userId))
  .limit(1);

// ❌ INCORRECT - SQL brut
const user = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
```

### Types Partagés

**TOUJOURS:**
- ✅ Utiliser types depuis `@shared/schema.ts`
- ✅ Utiliser `Insert[Entity]` pour créations
- ✅ Utiliser `[Entity]` pour sélections

```typescript
import type { User, InsertUser, Offer, InsertOffer } from '@shared/schema';

// Création
const newUser: InsertUser = {
  email: 'user@example.com',
  firstName: 'John',
  // ...
};
const user = await storage.createUser(newUser);

// Sélection
const user: User | undefined = await storage.getUser(id);
```

### Migrations

**NE JAMAIS:**
- ❌ Créer migrations SQL manuelles
- ❌ Modifier directement `drizzle.config.ts`

**TOUJOURS:**
- ✅ Modifier schéma dans `shared/schema.ts`
- ✅ Utiliser `npm run db:push` pour appliquer changements
- ✅ Vérifier migrations générées dans `migrations/`

### Transactions

**Pattern:**
```typescript
import { withTransaction } from '../utils/database-helpers';
import type { DrizzleTransaction } from '../storage-poc';

// ✅ CORRECT - Transaction pour opérations multiples
const result = await withTransaction(async (tx) => {
  const offer = await storage.createOffer(offerData, tx);
  const project = await storage.createProject(projectData, tx);
  return { offer, project };
});

// Dans storage-poc.ts
async createOffer(offer: InsertOffer, tx?: DrizzleTransaction): Promise<Offer> {
  const dbInstance = tx || db;
  const [created] = await dbInstance.insert(offers).values(offer).returning();
  return created;
}
```

## 🔍 Requêtes Optimisées

### Éviter N+1 Queries

**❌ INCORRECT:**
```typescript
const offers = await storage.getOffers();
for (const offer of offers) {
  const user = await storage.getUser(offer.responsibleUserId); // N+1
}
```

**✅ CORRECT:**
```typescript
const offers = await storage.getOffers();
const userIds = [...new Set(offers.map(o => o.responsibleUserId))];
const users = await db.select()
  .from(users)
  .where(inArray(users.id, userIds));

const usersMap = new Map(users.map(u => [u.id, u]));
offers.forEach(offer => {
  offer.responsibleUser = usersMap.get(offer.responsibleUserId);
});
```

### Utiliser KpiRepository pour Analytics

**Pour requêtes complexes:**
```typescript
import { KpiRepository } from '../storage/analytics/KpiRepository';

const kpiRepo = new KpiRepository(storage);
const kpis = await kpiRepo.getConsolidatedKpis({
  startDate: new Date('2025-01-01'),
  endDate: new Date('2025-12-31')
});
```

### Pagination

**TOUJOURS:**
- ✅ Utiliser pagination pour grandes listes
- ✅ Limiter résultats par défaut (ex: 50)

```typescript
const { offers, total } = await storage.getOffersPaginated(
  search,
  status,
  limit || 50,
  offset || 0
);
```

## 🔒 Sécurité Base de Données

### Protection Injection SQL

**TOUJOURS:**
- ✅ Utiliser Drizzle ORM (paramètres préparés automatiques)
- ✅ Ne jamais concaténer SQL avec variables utilisateur
- ✅ Valider entrées avec Zod avant requête

### RBAC sur Requêtes

**Pattern:**
```typescript
// Dans storage-poc.ts
async getOffers(userId: string, userRole: string): Promise<Offer[]> {
  let query = db.select().from(offers);
  
  // Filtrage par rôle
  if (userRole !== 'admin') {
    query = query.where(eq(offers.responsibleUserId, userId));
  }
  
  return await query;
}
```

### Données Sensibles

**TOUJOURS:**
- ✅ Ne jamais logger données sensibles (passwords, tokens)
- ✅ Hash passwords avec bcrypt
- ✅ Masquer données sensibles dans réponses API

## 📊 Performance Base de Données

### Index

**Index existants:**
- ✅ Sur colonnes fréquemment requêtées (id, userId, status, etc.)
- ✅ Index composites pour requêtes complexes

**Ajouter index si nécessaire:**
```typescript
// Dans shared/schema.ts
export const offers = pgTable("offers", {
  // ...
  responsibleUserId: varchar("responsible_user_id", { length: 255 }),
  // ...
}, (table) => ({
  responsibleUserIdIdx: index("offers_responsible_user_id_idx").on(table.responsibleUserId),
  statusIdx: index("offers_status_idx").on(table.status)
}));
```

### Pool de Connexions

**Configuré dans:** `server/db.ts`

**Ne pas modifier** sauf nécessité spécifique.

### Requêtes Lentes

**Si requête > 20s:**
1. Analyser avec `EXPLAIN ANALYZE`
2. Vérifier index manquants
3. Optimiser avec CTE si nécessaire
4. Considérer cache si données peu changeantes

## 🧪 Tests Base de Données

### Pattern de Test

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db';
import { storage } from '../storage-poc';

describe('Storage', () => {
  beforeEach(async () => {
    // Nettoyer données de test
    await db.delete(offers);
  });
  
  it('should create offer', async () => {
    const offer = await storage.createOffer({
      name: 'Test Offer',
      // ...
    });
    
    expect(offer.id).toBeDefined();
    expect(offer.name).toBe('Test Offer');
  });
});
```

## 📝 Conventions Base de Données

### Naming
- **Tables:** `snake_case` (ex: `offers`, `project_tasks`)
- **Colonnes:** `snake_case` (ex: `responsible_user_id`, `created_at`)
- **Index:** `[table]_[column]_idx` (ex: `offers_status_idx`)

### Types
- **IDs:** `varchar(255)` (UUID strings)
- **Dates:** `timestamp` avec timezone
- **Montants:** `decimal` ou `numeric`
- **JSON:** `jsonb` pour données structurées

### Relations
- ✅ Utiliser `relations()` de Drizzle pour relations
- ✅ Définir foreign keys dans schéma
- ✅ Utiliser `onDelete: 'cascade'` si nécessaire


