# Standards de Qualité Code - Saxium

**Standards stricts** pour garantir code de qualité exemplaire.

## 🎯 Objectif

Code **parfait** et **exemple en matière de qualité**. Chaque ligne de code doit respecter ces standards.

## 📋 Standards de Code

### 1. Types TypeScript Stricts

**TOUJOURS:**
- ✅ Types explicites (pas d'inférence implicite pour fonctions publiques)
- ✅ Types depuis `@shared/schema.ts` (pas de types dupliqués)
- ✅ `strict: true` dans tsconfig.json
- ✅ Pas de `any` (utiliser `unknown` si nécessaire)

**Exemples:**
```typescript
// ✅ EXCELLENT
function createUser(data: InsertUser): Promise<User> {
  // ...
}

// ❌ MAUVAIS
function createUser(data: any): any { // ❌
  // ...
}

// ✅ EXCELLENT - Type explicite même si inféré
async function getOffers(): Promise<(Offer & { user?: User })[]> {
  // ...
}
```

### 2. Validation Stricte

**TOUJOURS:**
- ✅ Validation Zod sur toutes les entrées (API, formulaires)
- ✅ Validation métier après validation technique
- ✅ Messages d'erreur clairs et actionnables
- ✅ Rejet des champs supplémentaires (`.strict()`)

**Exemples:**
```typescript
// ✅ EXCELLENT - Validation exhaustive
const schema = z.object({
  name: z.string()
    .min(1, 'Nom requis')
    .max(255, 'Nom trop long')
    .trim(),
  email: z.string()
    .email('Email invalide')
    .toLowerCase()
    .trim(),
  role: z.enum(['admin', 'user'], {
    errorMap: () => ({ message: 'Rôle invalide' })
  })
}).strict(); // Rejette champs supplémentaires

// Validation avec messages d'erreur structurés
const result = schema.safeParse(data);
if (!result.success) {
  throw new ValidationError('Données invalides', {
    errors: result.error.format(),
    fields: result.error.issues.map(i => i.path.join('.'))
  });
}
```

### 3. Gestion d'Erreurs Exhaustive

**TOUJOURS:**
- ✅ Tous les cas d'erreur couverts
- ✅ Erreurs typées explicites
- ✅ Messages d'erreur clairs
- ✅ Logging structuré pour debugging
- ✅ Propagation correcte des erreurs

**Exemples:**
```typescript
// ✅ EXCELLENT - Gestion exhaustive
async function processData(data: ProcessData): Promise<Result> {
  // Validation
  if (!data.field) {
    throw new ValidationError('field requis', {
      field: 'field',
      reason: 'required'
    });
  }

  // Opération avec gestion d'erreurs
  try {
    const result = await storage.method(data);
    
    // Validation résultat
    if (!result) {
      throw new NotFoundError('Résultat non trouvé');
    }

    return result;
  } catch (error) {
    // Logging structuré
    logger.error('[Service] Erreur traitement', error, {
      metadata: {
        operation: 'processData',
        data: { field: data.field },
        errorType: error.constructor.name
      }
    });

    // Propagation avec contexte
    if (error instanceof DatabaseError) {
      throw new DatabaseError('Erreur base de données', error);
    }
    
    throw error;
  }
}
```

### 4. Code Clair et Auto-Documenté

**TOUJOURS:**
- ✅ Noms de variables/fonctions explicites
- ✅ Fonctions courtes (< 100 lignes)
- ✅ Une responsabilité par fonction
- ✅ Documentation inline pour logique complexe
- ✅ Commentaires pour "pourquoi", pas "quoi"

**Exemples:**
```typescript
// ✅ EXCELLENT - Code clair
/**
 * Calcule la durée d'une phase en fonction du contexte projet
 * 
 * Applique les règles métier actives et les multiplicateurs contextuels
 * (complexité, saisonnalité, etc.)
 */
async calculatePhaseDuration(
  phase: ProjectStatus,
  context: ProjectContext,
  activeRules: DateIntelligenceRule[]
): Promise<PhaseDurationResult> {
  // Trouver règle applicable
  const applicableRule = this.findApplicableRule(phase, context, activeRules);
  
  if (!applicableRule) {
    return this.getDefaultDuration(phase, context);
  }

  // Calcul avec multiplicateurs
  const baseDuration = applicableRule.baseDuration || this.getDefaultBaseDuration(phase);
  const multiplierFactor = parseFloat(applicableRule.multiplierFactor?.toString() || "1.0");
  
  // Application multiplicateurs contextuels
  const finalDuration = this.applyContextualMultipliers(
    baseDuration * multiplierFactor,
    context
  );

  return {
    calculatedDuration: Math.round(finalDuration),
    appliedRule: applicableRule.name,
    confidence: this.calculateConfidence(applicableRule, context),
    factors: this.getAppliedFactors(context)
  };
}

// ❌ MAUVAIS - Code confus
async calc(p: string, c: any, r: any): Promise<any> { // ❌
  // ...
}
```

### 5. DRY (Don't Repeat Yourself)

**TOUJOURS:**
- ✅ Extraire code dupliqué en fonctions/utilitaires
- ✅ Réutiliser composants/services existants
- ✅ Patterns réutilisables documentés

**Exemples:**
```typescript
// ✅ EXCELLENT - Code réutilisable
// server/utils/shared-utils.ts
export function formatMontantEuros(montant: Decimal): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR'
  }).format(montant.toNumber());
}

// Utilisation
import { formatMontantEuros } from '@/utils/shared-utils';
const formatted = formatMontantEuros(montant);

// ❌ MAUVAIS - Code dupliqué
const formatted1 = new Intl.NumberFormat('fr-FR', { /* ... */ }).format(montant1); // ❌
const formatted2 = new Intl.NumberFormat('fr-FR', { /* ... */ }).format(montant2); // ❌
```

### 6. Séparation des Responsabilités

**TOUJOURS:**
- ✅ Une responsabilité par fonction/classe
- ✅ Séparation routes / services / storage
- ✅ Services métier isolés
- ✅ Utilitaires réutilisables

**Exemples:**
```typescript
// ✅ EXCELLENT - Séparation claire
// Route (contrôleur)
router.post('/api/offers',
  validateBody(createOfferSchema),
  asyncHandler(async (req, res) => {
    const offer = await offerService.createOffer(req.body);
    res.json({ success: true, data: offer });
  })
);

// Service (logique métier)
export class OfferService {
  async createOffer(data: InsertOffer): Promise<Offer> {
    // Validation métier
    await this.validateBusinessRules(data);
    
    // Création
    const offer = await storage.createOffer(data);
    
    // Événements
    eventBus.publish({ type: 'offer.created', entityId: offer.id });
    
    return offer;
  }
}

// Storage (accès données)
async createOffer(offer: InsertOffer): Promise<Offer> {
  const [created] = await db.insert(offers).values(offer).returning();
  return created;
}
```

### 7. Tests Exhaustifs

**TOUJOURS:**
- ✅ Tests pour tous les cas (succès, erreurs, limites)
- ✅ Tests unitaires (85% backend, 80% frontend)
- ✅ Tests E2E pour workflows critiques
- ✅ Tests de performance pour opérations critiques

**Exemples:**
```typescript
// ✅ EXCELLENT - Tests exhaustifs
describe('OfferService', () => {
  describe('createOffer', () => {
    it('should create offer successfully', async () => {
      const offer = await service.createOffer(validData);
      expect(offer.id).toBeDefined();
      expect(offer.name).toBe(validData.name);
    });

    it('should throw ValidationError on invalid data', async () => {
      await expect(service.createOffer(invalidData))
        .rejects.toThrow(ValidationError);
    });

    it('should throw ConflictError if offer already exists', async () => {
      vi.spyOn(storage, 'getOfferByReference').mockResolvedValue(existingOffer);
      
      await expect(service.createOffer({ ...validData, reference: existingOffer.reference }))
        .rejects.toThrow(ConflictError);
    });

    it('should publish event on creation', async () => {
      const publishSpy = vi.spyOn(eventBus, 'publish');
      
      await service.createOffer(validData);
      
      expect(publishSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'offer.created'
        })
      );
    });

    it('should log operation with metadata', async () => {
      const loggerSpy = vi.spyOn(logger, 'info');
      
      await service.createOffer(validData);
      
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('[OfferService]'),
        expect.objectContaining({
          metadata: expect.objectContaining({
            operation: 'createOffer'
          })
        })
      );
    });
  });
});
```

### 8. Performance Optimale

**TOUJOURS:**
- ✅ Cache intelligent avec invalidation
- ✅ Pagination pour listes
- ✅ Lazy loading pour code non critique
- ✅ Memoization pour calculs coûteux
- ✅ Optimisation requêtes SQL (éviter N+1)

**Exemples:**
```typescript
// ✅ EXCELLENT - Performance optimisée
// Cache avec invalidation
const cached = await cacheService.get(cacheKey);
if (cached) return cached;

const data = await generateData();
await cacheService.set(cacheKey, data, { ttl: 3600 });

// Pagination
const { entities, total } = await storage.getEntitiesPaginated(
  filters,
  limit || 50,
  offset || 0
);

// Memoization
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(data);
}, [data]);

// Optimisation SQL (pas N+1)
const userIds = [...new Set(offers.map(o => o.responsibleUserId))];
const users = await db.select().from(users).where(inArray(users.id, userIds));
const usersMap = new Map(users.map(u => [u.id, u]));
```

### 9. Documentation

**TOUJOURS:**
- ✅ Documentation inline pour logique complexe
- ✅ Types TypeScript comme documentation
- ✅ READMEs par module
- ✅ Commentaires pour "pourquoi", pas "quoi"

**Exemples:**
```typescript
// ✅ EXCELLENT - Documentation inline
/**
 * Service de gestion des offres avec validation métier complète
 * 
 * Gère le cycle de vie complet des offres :
 * - Création avec validation métier
 * - Transition entre statuts
 * - Génération DPGF
 * - Transformation en projet
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

### 10. Refactoring Continu

**TOUJOURS:**
- ✅ Refactoring continu (pas de big bang)
- ✅ Réduction dette technique progressive
- ✅ Amélioration patterns existants
- ✅ Migration progressive (pas de breaking changes)

**Exemples:**
```typescript
// ✅ EXCELLENT - Refactoring progressif
// Avant (legacy)
async function getData() {
  // Code complexe et dupliqué
}

// Après (refactorisé)
async function getData(): Promise<Data> {
  return withErrorHandling(
    async () => {
      const cached = await getCachedData();
      if (cached) return cached;
      
      const data = await generateData();
      await cacheData(data);
      return data;
    },
    { operation: 'getData', service: 'DataService' }
  );
}
```

## 🚫 Anti-Patterns à Éviter

### Code à Éviter

```typescript
// ❌ MAUVAIS - Types `any`
function process(data: any): any { // ❌
  // ...
}

// ❌ MAUVAIS - Pas de gestion d'erreurs
async function getData() {
  const data = await fetch('/api/data'); // ❌ Pas de try-catch
  return data.json();
}

// ❌ MAUVAIS - Code dupliqué
const formatted1 = format(data1); // ❌
const formatted2 = format(data2); // ❌ Duplication

// ❌ MAUVAIS - Fonction trop longue
async function processEverything() { // ❌ > 100 lignes
  // 200 lignes de code...
}

// ❌ MAUVAIS - Pas de validation
router.post('/api/route', async (req, res) => { // ❌ Pas de validation
  const data = req.body; // ❌ Pas de validation
  // ...
});

// ❌ MAUVAIS - SQL brut
const result = await db.query('SELECT * FROM users WHERE id = $1', [id]); // ❌

// ❌ MAUVAIS - console.log
console.log('Data:', data); // ❌ Utiliser logger

// ❌ MAUVAIS - try-catch dans route
router.post('/api/route', async (req, res) => { // ❌
  try {
    // ...
  } catch (error) {
    res.status(500).json({ error: 'Erreur' }); // ❌ Utiliser asyncHandler
  }
});
```

## ✅ Checklist Qualité Code

### Avant de Commiter

- [ ] Types TypeScript stricts (pas de `any`)
- [ ] Validation Zod sur toutes les entrées
- [ ] Gestion d'erreurs exhaustive
- [ ] Tests écrits et passent
- [ ] Code clair et auto-documenté
- [ ] Pas de code dupliqué
- [ ] Fonctions < 100 lignes
- [ ] Documentation inline pour logique complexe
- [ ] Performance optimisée (cache, pagination, etc.)
- [ ] Logging structuré avec métadonnées

### Code Review

- [ ] Respecte tous les standards de qualité
- [ ] Tests exhaustifs
- [ ] Documentation complète
- [ ] Performance optimisée
- [ ] Sécurité (validation, protection injection)
- [ ] Maintenabilité (code clair, DRY)

## 🔗 Références

- `@.cursor/rules/quality-principles.md` - Principes de qualité
- `@.cursor/rules/performance.md` - Guide performance
- `@.cursor/rules/testing.md` - Standards tests
- `@systemPatterns.md` - Patterns architecturaux

---

**Note:** Ces standards sont non négociables. Code qui ne respecte pas ces standards doit être refactorisé.





