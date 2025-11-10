# Principes de Qualité - Saxium

**Philosophie:** Excellence technique, robustesse, performance et maintenabilité optimale

## 🎯 Vision de Qualité

Saxium doit être **parfait** et un **exemple en matière de qualité**. Chaque décision technique doit privilégier :
1. **Robustesse** - Résistance aux erreurs, gestion d'erreurs complète
2. **Performance** - Optimisation continue, latence minimale
3. **Maintenabilité** - Code clair, documenté, testé, évolutif

## 🏆 Standards d'Excellence

### Robustesse

**TOUJOURS:**
- ✅ Gestion d'erreurs exhaustive (tous les cas d'erreur couverts)
- ✅ Validation stricte de toutes les entrées (Zod)
- ✅ Protection contre les injections (SQL, XSS, etc.)
- ✅ Circuit breakers pour services externes
- ✅ Retry logic avec backoff exponentiel
- ✅ Timeouts sur toutes les opérations asynchrones
- ✅ Graceful degradation (fallback si service externe échoue)
- ✅ Logging structuré pour traçabilité complète
- ✅ Tests de charge et résilience

**NE JAMAIS:**
- ❌ Ignorer les erreurs potentielles
- ❌ Faire confiance aux entrées utilisateur
- ❌ Exécuter SQL brut
- ❌ Appels externes sans timeout
- ❌ Code sans gestion d'erreurs

### Performance

**TOUJOURS:**
- ✅ Cache intelligent avec invalidation automatique
- ✅ Pagination pour toutes les listes
- ✅ Lazy loading pour code non critique
- ✅ Memoization pour calculs coûteux
- ✅ Optimisation requêtes SQL (éviter N+1)
- ✅ Code splitting par vendor
- ✅ Compression gzip/brotli
- ✅ Index base de données sur colonnes fréquemment requêtées
- ✅ Monitoring performance continu

**NE JAMAIS:**
- ❌ Requêtes N+1
- ❌ Charger toutes les données en mémoire
- ❌ Bundle monolithique
- ❌ Requêtes SQL non optimisées
- ❌ Cache sans invalidation

### Maintenabilité

**TOUJOURS:**
- ✅ Code clair et auto-documenté
- ✅ Types TypeScript stricts (pas de `any`)
- ✅ Documentation inline pour logique complexe
- ✅ Tests unitaires (85% backend, 80% frontend)
- ✅ Tests E2E pour workflows critiques
- ✅ Architecture modulaire (separation of concerns)
- ✅ Patterns réutilisables documentés
- ✅ Conventions de code cohérentes
- ✅ Refactoring continu (réduction dette technique)

**NE JAMAIS:**
- ❌ Code dupliqué (DRY principle)
- ❌ Fonctions > 100 lignes (diviser si nécessaire)
- ❌ Types `any` (utiliser types stricts)
- ❌ Code mort ou commenté
- ❌ Magic numbers (utiliser constantes nommées)

## 📋 Principes de Développement

### 1. Code First, Optimize Later (mais toujours optimiser)

**Approche:**
1. Écrire code clair et fonctionnel
2. Tester et valider
3. Optimiser si nécessaire (profiling)
4. Documenter optimisations

**Règle:** Code clair > Code optimisé mais illisible

### 2. Fail Fast, Fail Explicitly

**Approche:**
- ✅ Validation stricte en entrée
- ✅ Erreurs typées explicites
- ✅ Messages d'erreur clairs
- ✅ Logging structuré pour debugging

**Règle:** Mieux vaut échouer tôt avec un message clair que de continuer avec des données invalides

### 3. Test-Driven Quality

**Approche:**
- ✅ Tests avant ou pendant développement
- ✅ Couverture minimale : 85% backend, 80% frontend
- ✅ Tests critiques : 95%+
- ✅ Tests E2E pour workflows complets

**Règle:** Code non testé = code non fiable

### 4. Documentation as Code

**Approche:**
- ✅ Documentation inline pour logique complexe
- ✅ READMEs par module
- ✅ Types TypeScript comme documentation
- ✅ Commentaires pour "pourquoi", pas "quoi"

**Règle:** Code doit être auto-documenté, documentation pour contexte

### 5. Continuous Refactoring

**Approche:**
- ✅ Refactoring continu (pas de big bang)
- ✅ Réduction dette technique progressive
- ✅ Amélioration patterns existants
- ✅ Migration progressive (pas de breaking changes)

**Règle:** Améliorer continuellement, ne pas attendre la dette technique

## 🔒 Standards de Robustesse

### Gestion d'Erreurs

```typescript
// ✅ EXCELLENT - Gestion d'erreurs exhaustive
import { asyncHandler } from '../utils/error-handler';
import { ValidationError, NotFoundError, DatabaseError } from '../utils/error-handler';
import { logger } from '../utils/logger';

router.post('/api/route',
  validateBody(schema), // Validation stricte
  asyncHandler(async (req, res) => {
    try {
      // Validation métier
      if (!req.body.field) {
        throw new ValidationError('field requis', {
          field: 'field',
          reason: 'required'
        });
      }

      // Opération avec gestion d'erreurs
      const result = await withErrorHandling(
        async () => {
          return await storage.method(req.body);
        },
        {
          operation: 'method',
          service: 'ServiceName',
          userId: req.user?.id
        }
      );

      logger.info('[Service] Opération réussie', {
        metadata: {
          operation: 'method',
          resultId: result.id,
          userId: req.user?.id
        }
      });

      res.json({ success: true, data: result });
    } catch (error) {
      // Erreurs capturées automatiquement par asyncHandler
      // Logging structuré automatique
      throw error; // Propagation pour middleware centralisé
    }
  })
);
```

### Validation Stricte

```typescript
// ✅ EXCELLENT - Validation exhaustive
import { z } from 'zod';

const schema = z.object({
  name: z.string()
    .min(1, 'Nom requis')
    .max(255, 'Nom trop long')
    .trim(),
  email: z.string()
    .email('Email invalide')
    .toLowerCase()
    .trim(),
  age: z.number()
    .int('Age doit être un entier')
    .min(0, 'Age doit être positif')
    .max(150, 'Age invalide'),
  role: z.enum(['admin', 'user'], {
    errorMap: () => ({ message: 'Rôle invalide' })
  })
}).strict(); // Rejette champs supplémentaires

// Validation avec messages d'erreur clairs
const result = schema.safeParse(data);
if (!result.success) {
  throw new ValidationError('Données invalides', {
    errors: result.error.format()
  });
}
```

### Protection Injection

```typescript
// ✅ EXCELLENT - Protection complète
// 1. Validation Zod (entrées)
const schema = z.object({
  query: z.string().min(1).max(500)
});

// 2. Utiliser SQLEngineService (jamais SQL brut)
const result = await sqlEngine.executeNaturalLanguageQuery({
  naturalLanguageQuery: req.body.query,
  userId: req.user.id,
  userRole: req.user.role
});

// 3. RBAC automatique
// 4. Whitelist tables/colonnes
// 5. Validation AST SQL
```

### Circuit Breakers

```typescript
// ✅ EXCELLENT - Résilience services externes
import { CircuitBreakerManager } from '../utils/circuit-breaker';

const breaker = CircuitBreakerManager.getInstance().getBreaker('service-name', {
  threshold: 5, // 5 erreurs avant ouverture
  timeout: 60000, // 60s avant réessai
  onOpen: () => {
    logger.warn('[Service] Circuit ouvert', {
      metadata: {
        service: 'service-name',
        reason: 'too_many_failures'
      }
    });
  },
  onClose: () => {
    logger.info('[Service] Circuit fermé', {
      metadata: {
        service: 'service-name',
        reason: 'recovered'
      }
    });
  }
});

// Utilisation avec fallback
try {
  const result = await breaker.execute(() => externalService.call());
  return result;
} catch (error) {
  // Fallback si circuit ouvert
  logger.warn('[Service] Utilisation fallback', {
    metadata: {
      service: 'service-name',
      error: error.message
    }
  });
  return getCachedResult() || getDefaultResult();
}
```

## ⚡ Standards de Performance

### Cache Intelligent

```typescript
// ✅ EXCELLENT - Cache avec invalidation automatique
import { getContextCacheService } from '../services/ContextCacheService';

const cacheService = getContextCacheService(storage);

async function getData(key: string, ttl: number = 3600) {
  // Vérification cache
  const cached = await cacheService.get(key);
  if (cached) {
    logger.debug('[Service] Cache hit', { metadata: { key } });
    return cached;
  }

  // Génération avec timeout
  const data = await Promise.race([
    generateData(),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), 10000)
    )
  ]);

  // Mise en cache avec TTL
  await cacheService.set(key, data, { ttl });
  
  logger.debug('[Service] Cache miss - données générées', {
    metadata: { key, ttl }
  });

  return data;
}

// Invalidation automatique via EventBus
eventBus.subscribe((event) => {
  if (event.type === 'entity.updated') {
    cacheService.invalidate(`entity:${event.entityId}`);
  }
});
```

### Optimisation Requêtes

```typescript
// ✅ EXCELLENT - Requête optimisée (pas N+1)
async getOffersWithUsers(): Promise<(Offer & { user: User })[]> {
  // 1. Récupérer toutes les offres
  const offers = await db.select().from(offers);
  
  // 2. Récupérer tous les utilisateurs en une requête
  const userIds = [...new Set(offers.map(o => o.responsibleUserId))];
  const users = await db.select()
    .from(users)
    .where(inArray(users.id, userIds));
  
  // 3. Créer map pour lookup O(1)
  const usersMap = new Map(users.map(u => [u.id, u]));
  
  // 4. Enrichir offres
  return offers.map(offer => ({
    ...offer,
    user: usersMap.get(offer.responsibleUserId)
  }));
}

// ✅ EXCELLENT - Utiliser KpiRepository pour requêtes complexes
import { KpiRepository } from '../storage/analytics/KpiRepository';

const kpiRepo = new KpiRepository(storage);
const kpis = await kpiRepo.getConsolidatedKpis({
  startDate,
  endDate
}); // CTE unique, pas N+1
```

### Pagination

```typescript
// ✅ EXCELLENT - Pagination avec total
async getEntitiesPaginated(
  filters: Filters,
  limit: number = 50,
  offset: number = 0
): Promise<{ entities: Entity[]; total: number; hasMore: boolean }> {
  // Requête optimisée avec count en parallèle
  const [entities, [{ count }]] = await Promise.all([
    db.select()
      .from(entities)
      .where(buildWhereClause(filters))
      .orderBy(desc(entities.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)` })
      .from(entities)
      .where(buildWhereClause(filters))
  ]);

  return {
    entities,
    total: Number(count),
    hasMore: offset + limit < Number(count)
  };
}
```

## 🛠️ Standards de Maintenabilité

### Code Clair

```typescript
// ✅ EXCELLENT - Code clair et auto-documenté
/**
 * Calcule la durée d'une phase de projet en fonction du contexte
 * 
 * @param phase - Phase du projet (etude, planification, etc.)
 * @param context - Contexte du projet (type, complexité, surface, etc.)
 * @param activeRules - Règles métier actives pour ce projet
 * @returns Durée calculée avec confiance et facteurs appliqués
 */
async calculatePhaseDuration(
  phase: ProjectStatus,
  context: ProjectContext,
  activeRules: DateIntelligenceRule[]
): Promise<PhaseDurationResult> {
  // 1. Trouver règle applicable
  const applicableRule = this.findApplicableRule(phase, context, activeRules);
  
  if (!applicableRule) {
    return this.getDefaultDuration(phase, context);
  }

  // 2. Calcul base avec multiplicateurs
  let baseDuration = applicableRule.baseDuration || this.getDefaultBaseDuration(phase);
  const multiplierFactor = parseFloat(applicableRule.multiplierFactor?.toString() || "1.0");
  
  // 3. Application des multiplicateurs contextuels
  const appliedFactors: AppliedFactor[] = [];
  let finalDuration = baseDuration * multiplierFactor;
  
  // Multiplicateur complexité
  const complexityMultiplier = this.getComplexityMultiplier(context.complexity);
  finalDuration *= complexityMultiplier;
  appliedFactors.push({
    name: 'complexity',
    value: complexityMultiplier,
    impact: complexityMultiplier > 1 ? 'negative' : 'positive',
    description: `Multiplicateur complexité: ${context.complexity}`
  });

  // ... autres facteurs

  return {
    calculatedDuration: Math.round(finalDuration),
    appliedRule: applicableRule.name,
    confidence: this.calculateConfidence(applicableRule, context),
    factors: appliedFactors
  };
}
```

### Types Stricts

```typescript
// ✅ EXCELLENT - Types stricts, pas de `any`
import type { User, InsertUser, Offer, InsertOffer } from '@shared/schema';

// Types explicites
function createUser(data: InsertUser): Promise<User> {
  // ...
}

// Types de retour explicites
async function getOffers(): Promise<(Offer & { user?: User })[]> {
  // ...
}

// ❌ MAUVAIS - Éviter `any`
function processData(data: any): any { // ❌
  // ...
}
```

### Tests Complets

```typescript
// ✅ EXCELLENT - Tests exhaustifs
describe('Service', () => {
  describe('method', () => {
    it('should handle success case', async () => {
      const result = await service.method(validParams);
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
    });

    it('should throw ValidationError on invalid input', async () => {
      await expect(service.method(invalidParams))
        .rejects.toThrow(ValidationError);
    });

    it('should throw NotFoundError when entity not found', async () => {
      vi.spyOn(storage, 'getEntity').mockResolvedValue(undefined);
      
      await expect(service.method({ id: 'non-existent' }))
        .rejects.toThrow(NotFoundError);
    });

    it('should handle database errors gracefully', async () => {
      vi.spyOn(storage, 'getEntity').mockRejectedValue(new Error('DB Error'));
      
      await expect(service.method(validParams))
        .rejects.toThrow(DatabaseError);
    });

    it('should log operation with metadata', async () => {
      const loggerSpy = vi.spyOn(logger, 'info');
      
      await service.method(validParams);
      
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Service]'),
        expect.objectContaining({
          metadata: expect.objectContaining({
            operation: 'method'
          })
        })
      );
    });
  });
});
```

### Documentation

```typescript
// ✅ EXCELLENT - Documentation inline
/**
 * Service de gestion des offres avec validation métier complète
 * 
 * @example
 * ```typescript
 * const offerService = new OfferService(storage, eventBus);
 * const offer = await offerService.createOffer({
 *   name: 'Offre Test',
 *   status: 'brouillon'
 * });
 * ```
 */
export class OfferService {
  /**
   * Crée une offre avec validation métier
   * 
   * @param data - Données de l'offre (validées avec Zod)
   * @returns Offre créée avec ID généré
   * @throws {ValidationError} Si données invalides
   * @throws {ConflictError} Si offre existe déjà
   */
  async createOffer(data: InsertOffer): Promise<Offer> {
    // ...
  }
}
```

## 📊 Métriques de Qualité

### Objectifs

- **Couverture tests:** 85% backend, 80% frontend (minimum)
- **Latence API:** < 100ms (objectif)
- **Latence chatbot:** < 3s (objectif)
- **Bundle size:** < 500KB gzipped
- **Code duplication:** < 3%
- **Complexité cyclomatique:** < 10 par fonction
- **Dette technique:** < 5% (mesurée)

### Monitoring

- ✅ Métriques performance en temps réel
- ✅ Alertes automatiques sur dégradation
- ✅ Logging structuré pour debugging
- ✅ Traçabilité complète (correlation IDs)

## 🔗 Références

- `@systemPatterns.md` - Patterns architecturaux
- `@.cursor/rules/performance.md` - Guide performance
- `@.cursor/rules/testing.md` - Standards tests
- `@activeContext.md` - État actuel qualité

---

**Note:** Ces principes guident toutes les décisions techniques. Toujours privilégier robustesse, performance et maintenabilité.


