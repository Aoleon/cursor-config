# Decision Log - Saxium

**Journal des décisions techniques** importantes du projet Saxium.

## 📋 Décisions Techniques

### 1. Architecture Modulaire

**Date:** 2024-12  
**Statut:** 🔄 En cours

**Décision:** Migration progressive de `routes-poc.ts` (11,647 lignes) vers architecture modulaire (`server/modules/*`)

**Raison:**
- ✅ Maintenabilité améliorée
- ✅ Testabilité améliorée
- ✅ Réutilisabilité améliorée
- ✅ Réduction dette technique

**Pattern:**
```typescript
// server/modules/[module]/routes.ts
export function create[Module]Router(
  storage: IStorage,
  eventBus: EventBus
): Router {
  const router = Router();
  // Routes...
  return router;
}
```

**État:**
- ✅ Module `auth/` : Complété
- ✅ Module `documents/` : Complété
- 🔄 Module `chiffrage/` : En cours
- ⏳ Modules restants : À venir

**Références:**
- `@server/modules/README.md` - Architecture modulaire
- `@activeContext.md` - État migration actuelle

### 2. Logging Structuré

**Date:** 2024-11  
**Statut:** ✅ Complété

**Décision:** Remplacer `console.log`/`error` par logger structuré avec métadonnées

**Raison:**
- ✅ Traçabilité améliorée
- ✅ Debugging facilité
- ✅ Monitoring amélioré
- ✅ Correlation IDs pour traçage

**Pattern:**
```typescript
import { logger } from '../utils/logger';

logger.info('[Service] Action', {
  metadata: {
    module: 'ModuleName',
    operation: 'operationName',
    userId: req.user?.id,
    correlationId
  }
});
```

**État:**
- ✅ Logger structuré implémenté
- ✅ Migration en cours (routes AI migrées)
- 🔄 Migration progressive des autres routes

**Références:**
- `@server/utils/logger.ts` - Logger structuré
- `@server/utils/README-UTILS.md` - Guide utilisation

### 3. Gestion d'Erreurs Centralisée

**Date:** 2024-11  
**Statut:** ✅ Complété

**Décision:** Utiliser `asyncHandler` et erreurs typées pour gestion d'erreurs centralisée

**Raison:**
- ✅ Cohérence
- ✅ Logging structuré
- ✅ Réponses standardisées
- ✅ Réduction duplication

**Pattern:**
```typescript
import { asyncHandler } from '../utils/error-handler';
import { ValidationError, NotFoundError } from '../utils/error-handler';

router.post('/api/route', asyncHandler(async (req, res) => {
  if (!req.body.field) {
    throw new ValidationError('field requis');
  }
  // ...
}));
```

**État:**
- ✅ Middleware errorHandler centralisé
- ✅ Erreurs typées implémentées
- ✅ Routes AI migrées
- 🔄 Migration progressive des autres routes

**Références:**
- `@server/middleware/errorHandler.ts` - Middleware centralisé
- `@server/utils/error-handler.ts` - Utilitaires erreurs

### 4. Cache Intelligent IA

**Date:** 2024-12  
**Statut:** ✅ Complété

**Décision:** Implémenter cache intelligent avec TTL 24h pour requêtes IA

**Raison:**
- ✅ Réduction coûts API
- ✅ Amélioration performance
- ✅ Réduction latence

**Pattern:**
```typescript
const CACHE_EXPIRY_HOURS = 24;

async generateSQL(request: AiQueryRequest): Promise<AiQueryResponse> {
  const cacheKey = this.generateCacheKey(request);
  const cached = await this.getCachedResponse(cacheKey);
  if (cached) return cached;
  
  const result = await this.generateSQLInternal(request);
  await this.cacheResponse(cacheKey, result, CACHE_EXPIRY_HOURS);
  return result;
}
```

**État:**
- ✅ Cache implémenté dans AIService
- ✅ Cache implémenté dans BusinessContextService
- ✅ Invalidation automatique via EventBus

**Références:**
- `@server/services/AIService.ts` - Service IA avec cache
- `@.cursor/rules/performance.md` - Guide performance

### 5. Pipeline Parallèle Chatbot

**Date:** 2025-01  
**Statut:** ✅ Complété

**Décision:** Implémenter dispatch parallèle pour réduction latence chatbot

**Raison:**
- ✅ Réduction latence (~50%)
- ✅ Objectif < 3s atteint (~2.5s)

**Pattern:**
```typescript
async processQueryParallel(request: ChatbotQueryRequest): Promise<ChatbotQueryResponse> {
  // Dispatch parallèle : Contexte + Modèle simultané
  const [context, modelResponse] = await Promise.all([
    this.businessContextService.generateBusinessContext(contextRequest),
    this.aiService.generateSQL(aiRequest)
  ]);
  // ...
}
```

**État:**
- ✅ Pipeline parallèle implémenté
- ✅ Latence réduite de ~50%
- ✅ Objectif < 3s atteint

**Références:**
- `@server/services/ChatbotOrchestrationService.ts` - Orchestration chatbot
- `@activeContext.md` - Optimisations récentes

### 6. Circuit Breakers Services Externes

**Date:** 2024-12  
**Statut:** ✅ Complété

**Décision:** Implémenter circuit breakers pour services externes (Claude, GPT)

**Raison:**
- ✅ Résilience améliorée
- ✅ Performance (évite appels inutiles)
- ✅ Monitoring automatique

**Pattern:**
```typescript
const breaker = CircuitBreakerManager.getInstance().getBreaker('claude', {
  threshold: 5,
  timeout: 60000,
  onOpen: () => logger.warn('Circuit ouvert'),
  onClose: () => logger.info('Circuit fermé')
});

const result = await breaker.execute(() => externalService.call());
```

**État:**
- ✅ Circuit breakers implémentés
- ✅ Monitoring automatique
- ✅ Fallback intelligent

**Références:**
- `@server/services/AIService.ts` - Service IA avec circuit breakers
- `@server/utils/circuit-breaker.ts` - Utilitaires circuit breakers

### 7. Types Partagés (Shared Schema)

**Date:** 2024-10  
**Statut:** ✅ Complété

**Décision:** Centraliser types TypeScript dans `shared/schema.ts`

**Raison:**
- ✅ Cohérence frontend/backend
- ✅ Validation Zod intégrée
- ✅ Source unique de vérité

**Pattern:**
```typescript
// shared/schema.ts
export const users = pgTable("users", { /* ... */ });
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
```

**État:**
- ✅ Types partagés implémentés
- ✅ Utilisation généralisée
- ✅ Validation Zod intégrée

**Références:**
- `@shared/schema.ts` - Schéma complet
- `@systemPatterns.md` - Patterns architecturaux

### 8. TanStack Query pour Server State

**Date:** 2024-10  
**Statut:** ✅ Complété

**Décision:** Utiliser TanStack Query pour server state (pas Context API)

**Raison:**
- ✅ Cache intelligent
- ✅ Synchronisation automatique
- ✅ Performance améliorée
- ✅ DevTools intégrés

**Pattern:**
```typescript
const { data, isLoading } = useQuery({
  queryKey: ['entity', id],
  queryFn: () => apiRequest(`/api/entities/${id}`),
  staleTime: 5 * 60 * 1000
});
```

**État:**
- ✅ TanStack Query implémenté
- ✅ Utilisation généralisée
- ✅ Cache optimisé

**Références:**
- `@client/src/hooks/useOffer.ts` - Exemple hook
- `@.cursor/rules/frontend.md` - Règles frontend

## 📋 Décisions Métier

### 1. Workflow Validation

**Date:** 2024-11  
**Statut:** ✅ Complété

**Décision:** Jalons critiques obligatoires, autres optionnels

**Raison:**
- ✅ Flexibilité pour équipes
- ✅ Validation formelle des étapes critiques

**État:**
- ✅ Jalons critiques implémentés
- 🔄 Ajustement selon retours utilisateurs

### 2. Intégrations Prioritaires

**Date:** 2024-12  
**Statut:** ✅ Complété

**Décision:** Focus sur Monday.com et OneDrive (stables)

**Raison:**
- ✅ Intégrations actuelles fonctionnelles
- ✅ ROI élevé

**État:**
- ✅ Monday.com : Import/export bidirectionnel
- ✅ OneDrive : Synchronisation documents
- ⏳ Autres intégrations : À évaluer

## 🔄 Décisions en Révision

### 1. Optimisation Requêtes SQL

**Date:** 2025-01  
**Statut:** 🔄 En cours

**Question:** Optimiser toutes les requêtes N+1 ou accepter performance actuelle ?

**Décision actuelle:** Optimiser requêtes critiques uniquement

**Considérations:**
- ✅ Performance acceptable pour la plupart des cas
- ⚠️ Quelques requêtes lentes identifiées
- 🔄 Analyse continue nécessaire

### 2. Cache Distribué

**Date:** 2025-01  
**Statut:** ⏳ Planifié

**Question:** Implémenter Redis pour cache distribué ?

**Décision actuelle:** Pas prioritaire (cache local suffisant actuellement)

**Considérations:**
- ✅ Cache local fonctionne bien
- ⚠️ Nécessaire pour scalabilité future
- 🔄 Évaluer ROI

## 🔗 Références

- `@activeContext.md` - Décisions actives
- `@systemPatterns.md` - Patterns architecturaux
- `@progress.md` - État du projet

---

**Note:** Ce journal documente les décisions importantes du projet. Mettre à jour lors de nouvelles décisions significatives.


