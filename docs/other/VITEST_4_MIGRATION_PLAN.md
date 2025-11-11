# Plan de Migration Vitest 4.0 - Saxium

**Date:** 11 janvier 2025  
**Agent:** Update Manager  
**Status:** ⏳ **PLAN DE MIGRATION CRÉÉ**

---

## 📊 Analyse des Breaking Changes

### Breaking Changes Identifiés

#### 1. ⚠️ **CRITIQUE** - API `deps` Supprimée

**Problème:**
```typescript
// vitest.config.ts ligne 86
deps: {
  inline: ['@testing-library/user-event']  // ❌ SUPPRIMÉ dans Vitest 4.0
}
```

**Solution:**
```typescript
// Vitest 4.0 - Nouvelle API
deps: {
  optimizer: {
    web: {
      include: ['@testing-library/user-event']
    }
  }
}
```

**Impact:** MOYEN - Nécessite modification configuration

#### 2. Reporter `verbose` - Affichage Modifié

**Changement:**
- Reporter `verbose` affiche maintenant les tests en **liste plate** au lieu d'arborescent
- Pour arborescent, utiliser reporter `tree`

**Configuration actuelle:**
```typescript
reporters: [
  'verbose',  // ⚠️ Affichage modifié
  'json'
]
```

**Solution optionnelle:**
```typescript
reporters: [
  'tree',     // ✅ Arborescent (si souhaité)
  'json'
]
```

**Impact:** FAIBLE - Cosmétique uniquement

#### 3. Reporter `basic` Supprimé

**Status:** ✅ **NON UTILISÉ** dans le projet

**Impact:** AUCUN

#### 4. `workspace` → `projects`

**Status:** ✅ **NON UTILISÉ** dans le projet (pas de vitest.workspace.js)

**Impact:** AUCUN

#### 5. Snapshots avec Shadow Root

**Changement:**
- Snapshots incluant éléments personnalisés affichent maintenant shadow root
- Option `printShadowRoot: false` pour restaurer comportement précédent

**Status:** ⚠️ **À VÉRIFIER** - Si snapshots utilisés avec Web Components

**Impact:** FAIBLE - Si snapshots utilisés

---

## 🔧 Modifications Nécessaires

### Fichier 1: `vitest.config.ts`

**Ligne 85-87 - AVANT:**
```typescript
// Mock configurations
deps: {
  inline: ['@testing-library/user-event']  // ❌ SUPPRIMÉ
}
```

**APRÈS (Vitest 4.0):**
```typescript
// Mock configurations
deps: {
  optimizer: {
    web: {
      include: ['@testing-library/user-event']
    }
  }
}
```

**Ligne 78-81 - OPTIONNEL:**
```typescript
// Reporters pour CI/CD
reporters: [
  'tree',     // ✅ Arborescent (optionnel, remplace verbose)
  'json'
]
```

### Fichier 2: `vitest.backend.config.ts`

**Status:** ✅ **AUCUNE MODIFICATION** requise

### Fichier 3: `vitest.frontend.config.ts`

**Status:** ✅ **AUCUNE MODIFICATION** requise

---

## 📋 Plan d'Exécution

### Phase 1 : Préparation (5 min)

1. ✅ Backup créé
2. ✅ Configuration actuelle analysée
3. ✅ Breaking changes identifiés
4. ⏳ Créer branche de test

### Phase 2 : Migration Configuration (10 min)

1. ⏳ Modifier `vitest.config.ts` :
   - Remplacer `deps.inline` par `deps.optimizer.web.include`
   - Optionnel : Changer `verbose` → `tree` si arborescent souhaité

2. ⏳ Vérifier autres fichiers de configuration

### Phase 3 : Installation Vitest 4.0 (5 min)

1. ⏳ Installer vitest@4.0.8
2. ⏳ Installer @vitest/coverage-v8@4.0.8

### Phase 4 : Tests (30-60 min)

1. ⏳ Exécuter tests unitaires
2. ⏳ Exécuter tests intégration
3. ⏳ Exécuter tests E2E
4. ⏳ Vérifier couverture code

### Phase 5 : Validation (15 min)

1. ⏳ Vérifier tous les tests passent
2. ⏳ Vérifier couverture code maintenue
3. ⏳ Vérifier performance acceptable
4. ⏳ Documenter changements

---

## ⚠️ Risques Identifiés

### Risque MOYEN

1. **API `deps`** : Changement d'API peut nécessiter ajustements
2. **Comportement tests** : Changements internes peuvent affecter certains tests
3. **Performance** : Nouvelle version peut avoir impact performance

### Risque FAIBLE

1. **Reporter verbose** : Changement cosmétique uniquement
2. **Snapshots** : Impact seulement si Web Components utilisés

---

## 🧪 Tests à Exécuter

### Tests Unitaires

```bash
# Tests frontend
npx vitest --config vitest.frontend.config.ts

# Tests backend
npx vitest --config vitest.backend.config.ts

# Tests globaux
npx vitest --config vitest.config.ts
```

### Tests Intégration

```bash
npx vitest --config vitest.backend.config.ts tests/integration
```

### Tests E2E

```bash
# Tests E2E (si configurés avec Vitest)
npx vitest tests/e2e
```

### Couverture Code

```bash
npx vitest --coverage
```

---

## 📝 Checklist Migration

### Avant Migration

- [x] Backup créé
- [x] Configuration actuelle analysée
- [x] Breaking changes identifiés
- [x] Plan de migration créé
- [ ] Branche de test créée

### Pendant Migration

- [ ] Modifier `vitest.config.ts` (deps.inline → deps.optimizer)
- [ ] Optionnel : Modifier reporters (verbose → tree)
- [ ] Installer vitest@4.0.8
- [ ] Installer @vitest/coverage-v8@4.0.8
- [ ] Exécuter tests unitaires
- [ ] Exécuter tests intégration
- [ ] Exécuter tests E2E
- [ ] Vérifier couverture code

### Après Migration

- [ ] Tous les tests passent
- [ ] Couverture code maintenue
- [ ] Performance acceptable
- [ ] Documentation mise à jour
- [ ] Merge vers main si succès

---

## 🚀 Commandes de Migration

### Étape 1 : Créer Branche de Test

```bash
git checkout -b feat/vitest-4-migration
```

### Étape 2 : Modifier Configuration

Modifier `vitest.config.ts` selon plan ci-dessus.

### Étape 3 : Installer Vitest 4.0

```bash
npm install vitest@4.0.8 @vitest/coverage-v8@4.0.8
```

### Étape 4 : Exécuter Tests

```bash
# Tests complets
npx vitest --run

# Avec couverture
npx vitest --run --coverage
```

### Étape 5 : Rollback si Problème

```bash
git checkout main
git branch -D feat/vitest-4-migration
npm install vitest@3.2.4 @vitest/coverage-v8@3.2.4
```

---

## 📚 Ressources

- [Guide Migration Vitest 4.0](https://main.vitest.dev/guide/migration.html)
- [Changelog Vitest 4.0](https://github.com/vitest-dev/vitest/releases/tag/v4.0.0)
- [Documentation Vitest 4.0](https://vitest.dev/)

---

## 🎯 Recommandation

**PRIORITÉ MOYENNE** - Migration peut être effectuée dans branche de test

**Raison:**
- Breaking changes identifiés et solutions documentées
- Impact limité (principalement configuration)
- Rollback facile si problème

**Action suggérée:**
1. Créer branche de test
2. Appliquer modifications configuration
3. Installer Vitest 4.0
4. Exécuter suite complète de tests
5. Valider et merger si succès

---

**Dernière mise à jour:** 11 janvier 2025 - Update Manager

