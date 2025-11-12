# Migration Modulaire - Saxium

**Objectif:** Guider la migration progressive de `routes-poc.ts` vers architecture modulaire pour améliorer la maintenabilité.

## 🎯 Principe Fondamental

**IMPÉRATIF:** L'agent DOIT suivre les patterns de migration modulaire établis pour garantir la cohérence et éviter les régressions.

**Bénéfices:**
- ✅ Réduction complexité (11,647 lignes → modules < 500 lignes)
- ✅ Amélioration maintenabilité
- ✅ Réduction erreurs LSP
- ✅ Architecture claire et évolutive

## 📊 État Migration Actuel

### Modules Complétés

**TOUJOURS:**
- ✅ Module `auth/` - Authentification complète
- ✅ Module `documents/` - OCR et documents fonctionnels
- ✅ Référencer ces modules comme exemples

### Modules En Cours

**TOUJOURS:**
- 🔄 Module `chiffrage/` - Migration en cours
- ⏳ Module `suppliers/` - À venir
- ⏳ Module `projects/` - À venir
- ⏳ Module `analytics/` - À venir

## 🔧 Patterns de Migration

### 1. Structure Module

**TOUJOURS:**
- ✅ Créer structure: `server/modules/{module}/`
- ✅ Créer `routes.ts` avec routes du module
- ✅ Créer `services.ts` si services spécifiques
- ✅ Créer `types.ts` si types spécifiques
- ✅ Créer `README.md` pour documentation

**Pattern:**
```typescript
// Structure module
server/modules/
  {module}/
    routes.ts      // Routes du module
    services.ts    // Services spécifiques (optionnel)
    types.ts      // Types spécifiques (optionnel)
    README.md     // Documentation
```

### 2. Extraction Routes

**TOUJOURS:**
- ✅ Identifier routes liées au module dans `routes-poc.ts`
- ✅ Extraire routes vers `server/modules/{module}/routes.ts`
- ✅ Utiliser patterns Express établis (asyncHandler, validation)
- ✅ Maintenir compatibilité API (pas de breaking changes)

**Pattern:**
```typescript
// Avant (routes-poc.ts)
router.post('/api/chiffrage', asyncHandler(async (req, res) => {
  // ...
}));

// Après (server/modules/chiffrage/routes.ts)
import { Router } from 'express';
import { asyncHandler } from '../../utils/error-handler';

const router = Router();

router.post('/', asyncHandler(async (req, res) => {
  // ...
}));

export default router;
```

### 3. Intégration Module

**TOUJOURS:**
- ✅ Importer module dans `server/routes-index.ts`
- ✅ Monter routes avec préfixe approprié
- ✅ Tester routes migrées
- ✅ Documenter intégration

**Pattern:**
```typescript
// server/routes-index.ts
import chiffrageRoutes from './modules/chiffrage/routes';

// Monter routes
app.use('/api/chiffrage', chiffrageRoutes);
```

### 4. Suppression Routes Dupliquées

**TOUJOURS:**
- ✅ Vérifier routes migrées fonctionnent
- ✅ Supprimer routes dupliquées dans `routes-poc.ts`
- ✅ Vérifier pas de régressions
- ✅ Documenter suppression

**Pattern:**
```typescript
// Après migration complète
// Supprimer de routes-poc.ts:
// router.post('/api/chiffrage', ...); // Migré vers modules/chiffrage
```

## 📈 Validation Migration

### 1. Tests Routes Migrées

**TOUJOURS:**
- ✅ Tester toutes routes migrées
- ✅ Vérifier compatibilité API
- ✅ Tester cas limites
- ✅ Valider pas de régressions

**Pattern:**
```typescript
// Tester routes migrées
describe('Module chiffrage routes', () => {
  test('POST /api/chiffrage', async () => {
    const response = await request(app)
      .post('/api/chiffrage')
      .send({ /* ... */ });
    
    expect(response.status).toBe(200);
    // ...
  });
});
```

### 2. Vérification Erreurs LSP

**TOUJOURS:**
- ✅ Vérifier erreurs LSP après migration
- ✅ Objectif: réduction erreurs (30 → 1)
- ✅ Corriger erreurs introduites
- ✅ Documenter amélioration

### 3. Validation Cohérence

**TOUJOURS:**
- ✅ Vérifier patterns cohérents entre modules
- ✅ Vérifier structure similaire
- ✅ Vérifier documentation complète
- ✅ Valider architecture globale

## 🎯 Règles Spécifiques

### Module Chiffrage (En Cours)

**TOUJOURS:**
- ✅ Suivre patterns modules `auth/` et `documents/`
- ✅ Extraire routes chiffrage
- ✅ Tester intégration
- ✅ Documenter migration

### Modules À Venir

**TOUJOURS:**
- ✅ Prioriser selon complexité
- ✅ Suivre patterns établis
- ✅ Tester chaque module avant suivant
- ✅ Documenter progression

### Routes-POC.ts

**TOUJOURS:**
- ✅ Ne pas modifier sauf nécessité
- ✅ Supprimer routes migrées progressivement
- ✅ Documenter routes restantes
- ✅ Planifier migration complète

## 🔗 Intégration

### Règles Associées

- `backend.md` - Patterns Express
- `migration-refactoring-manager.md` - Gestion migration
- `similar-code-detection.md` - Détection code similaire

### Documentation

- `docs/project/activeContext.md` - État migration
- `docs/architecture/SERVICES_CONSOLIDATION_AUDIT.md` - Audit services

## ✅ Checklist

**Avant migration module:**
- [ ] Analyser routes dans `routes-poc.ts`
- [ ] Identifier routes liées au module
- [ ] Planifier structure module
- [ ] Référencer modules existants comme exemples

**Pendant migration:**
- [ ] Créer structure module
- [ ] Extraire routes vers module
- [ ] Intégrer module dans `routes-index.ts`
- [ ] Tester routes migrées

**Après migration:**
- [ ] Vérifier pas de régressions
- [ ] Supprimer routes dupliquées dans `routes-poc.ts`
- [ ] Documenter migration
- [ ] Vérifier erreurs LSP réduites

---

**Référence:** `@docs/project/activeContext.md` - Migration modulaire en cours

