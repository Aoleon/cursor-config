# Guide de Testing Saxium

## 📋 Vue d'ensemble

Ce document décrit comment exécuter les tests dans le projet Saxium, notamment la suite de tests de régression Monday.com qui valide les 11 corrections critiques d'import.

## 🧪 Suites de Tests

### 1. Tests Monday.com Import Regression
**Fichier**: `tests/integration/monday-import-regression.test.ts`  
**Status**: ✅ 13/13 tests passing (100%)  
**Couverture**:
- Import Projects (CREATE/UPDATE events, upsert strategy, NULL handling)
- Import AOs/Offers (OFFER_CREATED/UPDATED events, upsert)
- Import Suppliers (no duplicates on re-import)
- Error handling (Zod validation, API failures, removeUndefined)
- EventBus telemetry (correct types, metadata, no "unknown" events)

### 2. Tests Backend
**Localisation**: `server/**/*.test.ts`, `tests/backend/**/*.test.ts`  
**Couverture**: Services, repositories, routes, utils

### 3. Tests Frontend
**Localisation**: `client/**/*.test.tsx`  
**Couverture**: Components, hooks, pages

## 🚀 Commandes de Test

### Tests Monday.com uniquement
```bash
npx vitest run --config vitest.backend.config.ts tests/integration/monday-import-regression.test.ts
```

### Tous les tests d'intégration
```bash
npx vitest run --config vitest.backend.config.ts tests/integration
```

### Tous les tests backend
```bash
npx vitest run --config vitest.backend.config.ts
```

### Tous les tests (backend + frontend)
```bash
npx vitest run
```

### Mode watch (développement)
```bash
npx vitest --config vitest.backend.config.ts
```

### Avec couverture de code
```bash
npx vitest run --coverage --config vitest.backend.config.ts
```

### Type checking TypeScript
```bash
npm run check
```

## 🔄 Pipeline CI/CD

### GitHub Actions
**Fichier**: `.github/workflows/ci.yml`  
**Déclenchement**: Push/PR sur branches `main` et `develop`

Le pipeline exécute automatiquement:
1. ✅ Type checking TypeScript (`npm run check`)
2. ✅ Tests Monday.com import regression
3. ✅ Tous les tests backend
4. ✅ Génération rapport de couverture
5. ✅ Upload artefacts de couverture (30 jours)

### Visualiser les résultats CI
1. Aller dans l'onglet **Actions** du repository GitHub
2. Sélectionner le workflow "CI - Monday.com Import Tests"
3. Voir les résultats de chaque job (test + lint)
4. Télécharger les rapports de couverture depuis les artefacts

## 📊 Seuils de Couverture

Configuration dans `vitest.backend.config.ts`:
```typescript
coverage: {
  thresholds: {
    global: {
      lines: 86,        // > 85% strict
      statements: 86,   // > 85% strict
      functions: 86,    // > 85% strict
      branches: 81      // > 80% strict
    }
  }
}
```

## 🐛 Debugging Tests

### Logs détaillés
Les tests Monday.com incluent une instrumentation DEBUG complète :
- Validation Zod avec détails des erreurs
- Tracking des appels storage (create/update)
- EventBus telemetry avec types et metadata

### Exécuter un test spécifique
```bash
npx vitest run --config vitest.backend.config.ts -t "should import projects successfully"
```

### Mode UI interactif
```bash
npx vitest --ui --config vitest.backend.config.ts
```

## 📝 Écrire de Nouveaux Tests

### Test d'intégration Monday.com
1. Ajouter dans `tests/integration/monday-import-regression.test.ts`
2. Suivre le pattern de mocking existant (storage, mondayService, eventBus)
3. Utiliser les fixtures de test dans `describe` blocks
4. Valider les événements EventBus émis

### Test backend
1. Créer `server/module-name/*.test.ts`
2. Utiliser Vitest + Supertest pour tests API
3. Mocker les dépendances avec `vi.mock()`
4. Suivre pattern AAA (Arrange, Act, Assert)

## ⚠️ Points d'Attention

### Tests Monday.com
- Les 11 corrections critiques sont validées production-ready
- EventBus unsubscribe fix résout listener accumulation
- Email/phone extraction normalisée (strings, pas objets)
- Dates AO acceptent `null` (`.nullable().optional()`)
- Pas de modification de `package.json` (restrictions de sécurité)

### Environnement de Test
- `NODE_ENV=test` configuré automatiquement
- Database mock avec MemStorage par défaut
- MSW pour mocker API externes si nécessaire

## 🔗 Ressources

- **Documentation Vitest**: https://vitest.dev
- **GitHub Actions**: https://docs.github.com/en/actions
- **Replit.md**: Section "Monday.com Import Regression Test Suite"
- **README-UTILS.md**: Guidelines server utils et error handling
