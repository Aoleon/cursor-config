# Guide Performance - Saxium

**Optimisations de performance** pour le projet Saxium.

## 🚀 Objectifs de Performance

### Latence
- **Chatbot IA:** < 3s (actuel ~2.5s ✅)
- **Pages frontend:** < 2s (actuel ~1.5s ✅)
- **Requêtes API:** < 100ms (actuel ~150ms 🔄)
- **Génération SQL:** < 2s
- **Contexte métier:** < 500ms

### Bundle Size
- **Frontend:** < 500KB gzipped (objectif)
- **Code splitting:** Par vendor (React, Radix, Charts, etc.)

### Base de Données
- **Requêtes simples:** < 100ms
- **Requêtes complexes:** < 20s (objectif)
- **Cache hit rate:** 70% (objectif)

## 📊 Optimisations Backend

### Cache Intelligent

```typescript
// Pattern cache avec TTL
import { getContextCacheService } from '../services/ContextCacheService';

const cacheService = getContextCacheService(storage);

async function getCachedData(key: string) {
  // Vérification cache
  const cached = await cacheService.get(key);
  if (cached) {
    logger.info('[Service] Cache hit', { metadata: { key } });
    return cached;
  }

  // Génération et mise en cache
  const data = await generateData();
  await cacheService.set(key, data, { ttl: 3600 }); // 1h
  return data;
}
```

### Circuit Breakers

```typescript
// Protection contre pannes externes
import { CircuitBreakerManager } from '../utils/circuit-breaker';

const breaker = CircuitBreakerManager.getInstance().getBreaker('service-name', {
  threshold: 5, // 5 erreurs avant ouverture
  timeout: 60000, // 60s avant réessai
  onOpen: () => logger.warn('Circuit ouvert'),
  onClose: () => logger.info('Circuit fermé')
});

const result = await breaker.execute(() => externalService.call());
```

### Optimisation Requêtes SQL

```typescript
// Éviter N+1 queries
// ❌ INCORRECT
const offers = await storage.getOffers();
for (const offer of offers) {
  const user = await storage.getUser(offer.responsibleUserId); // N+1
}

// ✅ CORRECT
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

### Pagination

```typescript
// Toujours paginer pour grandes listes
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
```

### Transactions Optimisées

```typescript
// Utiliser transactions pour opérations multiples
import { withTransaction } from '../utils/database-helpers';

const result = await withTransaction(async (tx) => {
  const entity1 = await storage.createEntity1(data1, tx);
  const entity2 = await storage.createEntity2(data2, tx);
  return { entity1, entity2 };
});
```

## 📊 Optimisations Frontend

### Lazy Loading

```typescript
// App.tsx - Lazy loading des pages
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

### Code Splitting (Vite)

```typescript
// vite.config.ts - Code splitting par vendor
rollupOptions: {
  output: {
    manualChunks: (id) => {
      if (id.includes('node_modules/react')) return 'vendor-react';
      if (id.includes('node_modules/@radix-ui')) return 'vendor-radix';
      if (id.includes('node_modules/recharts')) return 'vendor-charts';
      if (id.includes('node_modules/@tanstack/react-query')) return 'vendor-query';
      if (id.includes('node_modules')) return 'vendor-other';
    }
  }
}
```

### Memoization

```typescript
// Memoization pour calculs coûteux
import { useMemo, useCallback } from 'react';

const expensiveValue = useMemo(() => {
  return computeExpensiveValue(data);
}, [data]);

const handleClick = useCallback(() => {
  onAction(id);
}, [id, onAction]);
```

### TanStack Query Optimisation

```typescript
// Configuration optimale TanStack Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (anciennement cacheTime)
      retry: 1,
      refetchOnWindowFocus: false
    }
  }
});

// Utilisation avec staleTime spécifique
const { data } = useQuery({
  queryKey: ['offers', filters],
  queryFn: () => apiRequest('/api/offers', { params: filters }),
  staleTime: 2 * 60 * 1000, // 2 minutes pour données changeantes
  gcTime: 5 * 60 * 1000 // 5 minutes en cache
});
```

### Optimisation Listes

```typescript
// Utiliser OptimizedList pour grandes listes
import { OptimizedList } from '@/components/optimized/OptimizedList';

<OptimizedList
  items={items}
  renderItem={(item) => <ItemComponent item={item} />}
  keyExtractor={(item) => item.id}
/>
```

## 📊 Optimisations IA

### Cache Intelligent

```typescript
// Cache 24h pour requêtes IA
const CACHE_EXPIRY_HOURS = 24;

async generateSQL(request: AiQueryRequest): Promise<AiQueryResponse> {
  const cacheKey = this.generateCacheKey(request);
  
  // Vérification cache
  const cached = await this.getCachedResponse(cacheKey);
  if (cached) {
    logger.info('[AIService] Cache hit', { metadata: { cacheKey } });
    return cached;
  }

  // Génération et mise en cache
  const result = await this.generateSQLInternal(request);
  await this.cacheResponse(cacheKey, result, CACHE_EXPIRY_HOURS);
  return result;
}
```

### Dispatch Parallèle

```typescript
// Pipeline parallèle pour réduction latence
async processQueryParallel(request: ChatbotQueryRequest): Promise<ChatbotQueryResponse> {
  // Dispatch parallèle : Contexte + Modèle simultané
  const [context, modelResponse] = await Promise.all([
    this.businessContextService.generateBusinessContext(contextRequest),
    this.aiService.generateSQL(aiRequest)
  ]);

  // Traitement des résultats...
  return response;
}
```

### Preloading Background

```typescript
// Preloading pour prédictions
eventBus.integratePredictiveEngine(predictiveEngineService);

// Cycles de preloading
// - business_hours: Heures ouvrables
// - peak: Pics d'utilisation
// - weekend: Week-ends
// - nightly: Nuit
```

## 📊 Optimisations Base de Données

### Index

```typescript
// Ajouter index sur colonnes fréquemment requêtées
export const offers = pgTable("offers", {
  id: varchar("id", { length: 255 }).primaryKey(),
  responsibleUserId: varchar("responsible_user_id", { length: 255 }),
  status: offerStatusEnum("status"),
  // ...
}, (table) => ({
  responsibleUserIdIdx: index("offers_responsible_user_id_idx").on(table.responsibleUserId),
  statusIdx: index("offers_status_idx").on(table.status),
  createdAtIdx: index("offers_created_at_idx").on(table.createdAt)
}));
```

### Requêtes Optimisées

```typescript
// Utiliser KpiRepository pour requêtes complexes
import { KpiRepository } from '../storage/analytics/KpiRepository';

const kpiRepo = new KpiRepository(storage);
const kpis = await kpiRepo.getConsolidatedKpis({
  startDate: new Date('2025-01-01'),
  endDate: new Date('2025-12-31')
});
```

### Pool de Connexions

```typescript
// Configuré dans server/db.ts
// Ne pas modifier sauf nécessité spécifique
// Pool optimisé pour performance
```

## 📊 Monitoring Performance

### Logging Structuré

```typescript
// Logger avec métriques de performance
logger.info('[Service] Opération réussie', {
  metadata: {
    operation: 'method',
    duration: Date.now() - startTime,
    userId: req.user?.id,
    correlationId
  }
});
```

### Métriques

```typescript
// Suivre métriques de performance
const metrics = {
  latency: Date.now() - startTime,
  cacheHit: fromCache,
  tokensUsed: result.tokensUsed,
  modelUsed: result.modelUsed
};

await this.performanceMetrics.recordMetric({
  service: 'AIService',
  operation: 'generateSQL',
  metrics
});
```

## 🔗 Références

- `@activeContext.md` - État actuel des optimisations
- `@progress.md` - Métriques de performance
- `@systemPatterns.md` - Patterns de performance

---

**Note:** Ces optimisations sont appliquées progressivement. Vérifier `activeContext.md` pour l'état actuel.





