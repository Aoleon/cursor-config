# Plan Phase 2 - Élimination Dette Technique (Suite)

**Date:** 2025-01-29  
**Statut:** Planification et développement en cours  
**Objectif:** Continuer l'élimination de la dette technique après Phase 1

---

## 📊 État Actuel Post-Phase 1

### Réalisations Phase 1 ✅

1. ✅ **routes-poc.ts supprimé** (11,998 → 0 lignes)
2. ✅ **ContextBuilderService découpé** (services de base créés)
3. ✅ **SQLPerformanceMonitor créé** (détection requêtes lentes)
4. ✅ **Documentation normalisée** (README modules, template, OpenAPI)
5. ✅ **CacheInvalidationService créé** (règles centralisées)
6. ✅ **Tests de base créés** (ContextLoaderService, ContextMetricsService)
7. ✅ **TechnicalDebtMetricsService créé** (métriques de dette)

### Dette Technique Restante

| Catégorie | Occurrences | Priorité |
|-----------|-------------|----------|
| **storage-poc.ts** | 3414 lignes | 🔴 P1 |
| **StorageFacade.ts** | 3992 lignes | 🔴 P1 |
| **ChatbotOrchestrationService.ts** | 3315 lignes | 🟠 P2 |
| **ocrService.ts** | 3219 lignes | 🟠 P2 |
| **BusinessContextService.ts** | 3173 lignes | 🟠 P2 |
| **Types `any`** | 264 occurrences | 🟡 P3 |
| **console.log/error** | 189 occurrences | 🟡 P3 |
| **Fichiers >2000 lignes** | ~10 fichiers | 🟠 P2 |

---

## 🎯 Plan Phase 2

### P1 - Fichiers Monolithiques Critiques (Priorité 1)

#### 1.1 Réduire storage-poc.ts (3414 → <1000 lignes)

**Objectif:** Migrer les méthodes vers les repositories existants

**Actions:**
- [x] Plan de migration créé (`docs/STORAGE_MIGRATION_PLAN.md`)
- [ ] Script d'analyse créé (`scripts/analyze-storage-migration.ts`)
- [ ] Migrer méthodes Offer vers OfferRepository
- [ ] Migrer méthodes AO vers AoRepository
- [ ] Migrer méthodes Project vers ProductionRepository
- [ ] Migrer méthodes Supplier vers SuppliersRepository
- [ ] Migrer méthodes Chiffrage vers ChiffrageRepository
- [ ] Migrer méthodes Contacts vers ContactsRepository
- [ ] Supprimer méthodes migrées de storage-poc.ts
- [ ] Tests de non-régression

**Résultat attendu:**
- `storage-poc.ts` : 3414 → <1000 lignes (-70%)
- `StorageFacade.ts` : Utilise uniquement repositories

#### 1.2 Réduire StorageFacade.ts (3992 → <2000 lignes)

**Objectif:** Simplifier la facade en supprimant les délégations vers legacy

**Actions:**
- [ ] Analyser méthodes qui délèguent encore vers legacyStorage
- [ ] Migrer ces méthodes vers repositories
- [ ] Supprimer délégations legacy
- [ ] Tests de non-régression

**Résultat attendu:**
- `StorageFacade.ts` : 3992 → <2000 lignes (-50%)

### P2 - Services Monolithiques (Priorité 2)

#### 2.1 Découper ChatbotOrchestrationService (3315 lignes)

**Objectif:** Extraire sous-services spécialisés

**Actions:**
- [ ] Analyser responsabilités du service
- [ ] Créer ChatbotContextService (gestion contexte)
- [ ] Créer ChatbotResponseService (génération réponses)
- [ ] Créer ChatbotRoutingService (routage messages)
- [ ] Migrer méthodes vers sous-services
- [ ] Tests de non-régression

**Résultat attendu:**
- `ChatbotOrchestrationService.ts` : 3315 → <1000 lignes (-70%)
- 3-4 sous-services créés

#### 2.2 Découper ocrService.ts (3219 lignes)

**Objectif:** Extraire parsers et validators

**Actions:**
- [ ] Analyser structure du service
- [ ] Créer OCRParserService (parsing documents)
- [ ] Créer OCRValidatorService (validation résultats)
- [ ] Créer OCRFormatterService (formatage sortie)
- [ ] Migrer méthodes vers sous-services
- [ ] Tests de non-régression

**Résultat attendu:**
- `ocrService.ts` : 3219 → <1000 lignes (-70%)
- 3-4 sous-services créés

#### 2.3 Découper BusinessContextService (3173 lignes)

**Objectif:** Extraire builders spécialisés

**Actions:**
- [ ] Analyser méthodes de construction
- [ ] Créer BusinessContextBuilder (contexte business)
- [ ] Créer TechnicalContextBuilder (contexte technique)
- [ ] Créer RelationalContextBuilder (contexte relationnel)
- [ ] Migrer méthodes vers builders
- [ ] Tests de non-régression

**Résultat attendu:**
- `BusinessContextService.ts` : 3173 → <1000 lignes (-70%)
- 3-4 builders créés

### P3 - Qualité Code (Priorité 3)

#### 3.1 Remplacer types `any` (264 → <50)

**Objectif:** Type-safety complet

**Actions:**
- [ ] Analyser occurrences de `any`
- [ ] Prioriser par impact (API publiques d'abord)
- [ ] Remplacer par types appropriés
- [ ] Documenter cas exceptionnels
- [ ] Tests de non-régression

**Résultat attendu:**
- Types `any` : 264 → <50 (-81%)

#### 3.2 Remplacer console.log/error (189 → <20)

**Objectif:** Utiliser logger partout

**Actions:**
- [ ] Analyser occurrences de console.log/error
- [ ] Remplacer par logger approprié
- [ ] Garder console.log uniquement dans tests/scripts
- [ ] Tests de non-régression

**Résultat attendu:**
- `console.log/error` : 189 → <20 (-89%)

---

## 📋 Checklist Phase 2

### P1 - Fichiers Monolithiques Critiques

- [ ] storage-poc.ts < 1000 lignes
- [ ] StorageFacade.ts < 2000 lignes
- [ ] Toutes les méthodes migrées vers repositories
- [ ] Tests de non-régression passent

### P2 - Services Monolithiques

- [ ] ChatbotOrchestrationService < 1000 lignes
- [ ] ocrService.ts < 1000 lignes
- [ ] BusinessContextService < 1000 lignes
- [ ] Sous-services créés et testés

### P3 - Qualité Code

- [ ] Types `any` < 50
- [ ] console.log/error < 20
- [ ] Tests de non-régression passent

---

## 🎯 Objectifs Finaux Phase 2

- **storage-poc.ts:** 3414 → <1000 lignes (-70%)
- **StorageFacade.ts:** 3992 → <2000 lignes (-50%)
- **Services monolithiques:** 3 services < 1000 lignes chacun
- **Types `any`:** 264 → <50 (-81%)
- **console.log/error:** 189 → <20 (-89%)
- **0 régression fonctionnelle**
- **Couverture tests:** ≥85% backend

---

## 📝 Notes

- La migration doit être progressive pour éviter les régressions
- Chaque étape doit être testée individuellement
- Les métriques doivent être suivies via TechnicalDebtMetricsService
- La documentation doit être mise à jour à chaque étape

---

## 🔗 Références

- **Plan migration storage:** `docs/STORAGE_MIGRATION_PLAN.md`
- **Script analyse:** `scripts/analyze-storage-migration.ts`
- **Métriques dette:** `server/services/TechnicalDebtMetricsService.ts`

