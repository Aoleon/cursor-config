# Stabilité des Tests - Saxium

**Objectif:** Réduire les tests flaky (échecs aléatoires) pour améliorer la fiabilité de la suite de tests.

## 🎯 Principe Fondamental

**IMPÉRATIF:** L'agent DOIT créer des tests stables et non flaky pour garantir la fiabilité de la suite de tests.

**Bénéfices:**
- ✅ Réduction tests flaky (95% → 100% stabilité)
- ✅ Fiabilité CI/CD améliorée
- ✅ Confiance dans les tests
- ✅ Réduction temps debug tests

## 📊 Détection Tests Flaky

### 1. Identification Patterns Flaky

**TOUJOURS:**
- ✅ Détecter tests avec échecs aléatoires
- ✅ Identifier causes communes (timing, état partagé, dépendances)
- ✅ Analyser historique échecs
- ✅ Proposer corrections

**Pattern:**
```typescript
// Détecter tests flaky
function detectFlakyTests(testResults: TestResult[]) {
  const flakyTests = [];
  
  for (const test of testResults) {
    // Test avec échecs aléatoires
    if (test.failureRate > 0 && test.failureRate < 1) {
      flakyTests.push({
        name: test.name,
        failureRate: test.failureRate,
        causes: analyzeCauses(test),
        fixes: proposeFixes(test)
      });
    }
  }
  
  return flakyTests;
}
```

### 2. Causes Communes

**TOUJOURS:**
- ✅ Détecter problèmes de timing (setTimeout, waitFor)
- ✅ Détecter état partagé entre tests
- ✅ Détecter dépendances externes (API, DB)
- ✅ Détecter ordre d'exécution dépendant

**Pattern:**
```typescript
// Analyser causes flaky
function analyzeCauses(test: TestResult) {
  const causes = [];
  
  // Timing issues
  if (test.code.includes('setTimeout') || test.code.includes('waitFor')) {
    causes.push({
      type: 'timing',
      issue: 'Dépendance timing non fiable',
      fix: 'Utiliser waitFor avec timeout approprié'
    });
  }
  
  // Shared state
  if (test.usesSharedState) {
    causes.push({
      type: 'shared-state',
      issue: 'État partagé entre tests',
      fix: 'Isoler état ou utiliser beforeEach/afterEach'
    });
  }
  
  // External dependencies
  if (test.hasExternalDeps) {
    causes.push({
      type: 'external-deps',
      issue: 'Dépendances externes non mockées',
      fix: 'Mocker dépendances externes'
    });
  }
  
  return causes;
}
```

## 🔧 Corrections Automatiques

### 1. Isolation État

**TOUJOURS:**
- ✅ Utiliser beforeEach/afterEach pour isolation
- ✅ Éviter variables globales
- ✅ Nettoyer état après chaque test
- ✅ Utiliser factories pour données de test

**Pattern:**
```typescript
// Avant (flaky)
let sharedData: any;

test('test 1', () => {
  sharedData = createData();
  // ...
});

test('test 2', () => {
  // Utilise sharedData - peut être modifié par test 1
  expect(sharedData).toBeDefined();
});

// Après (stable)
test('test 1', () => {
  const data = createData();
  // ...
});

test('test 2', () => {
  const data = createData(); // Données isolées
  expect(data).toBeDefined();
});
```

### 2. Mocking Dépendances Externes

**TOUJOURS:**
- ✅ Mocker appels API externes
- ✅ Mocker accès base de données
- ✅ Mocker services externes
- ✅ Utiliser fixtures pour données de test

**Pattern:**
```typescript
// Avant (flaky)
test('fetch data', async () => {
  const data = await fetchFromAPI(); // Dépendance externe
  expect(data).toBeDefined();
});

// Après (stable)
test('fetch data', async () => {
  vi.mock('./api', () => ({
    fetchFromAPI: vi.fn().mockResolvedValue({ id: 1, name: 'test' })
  }));
  
  const data = await fetchFromAPI();
  expect(data).toBeDefined();
});
```

### 3. Gestion Timing

**TOUJOURS:**
- ✅ Utiliser waitFor avec timeout approprié
- ✅ Éviter setTimeout/retry manuels
- ✅ Utiliser fake timers si applicable
- ✅ Attendre conditions plutôt que délais fixes

**Pattern:**
```typescript
// Avant (flaky)
test('async operation', async () => {
  await doAsyncOperation();
  await new Promise(resolve => setTimeout(resolve, 1000)); // Timing fixe
  expect(result).toBeDefined();
});

// Après (stable)
test('async operation', async () => {
  await doAsyncOperation();
  await waitFor(() => {
    expect(result).toBeDefined();
  }, { timeout: 5000 });
});
```

### 4. Ordre Indépendant

**TOUJOURS:**
- ✅ Éviter dépendances entre tests
- ✅ Utiliser test.only/test.skip avec précaution
- ✅ Éviter tests qui dépendent d'autres tests
- ✅ Utiliser describe.only si nécessaire

**Pattern:**
```typescript
// Avant (flaky)
test('create user', () => {
  const user = createUser();
  global.userId = user.id; // Dépendance globale
});

test('update user', () => {
  updateUser(global.userId); // Dépend de test précédent
});

// Après (stable)
test('create user', () => {
  const user = createUser();
  expect(user.id).toBeDefined();
});

test('update user', () => {
  const user = createUser(); // Indépendant
  const updated = updateUser(user.id);
  expect(updated).toBeDefined();
});
```

## 📈 Validation Stabilité

### 1. Tests de Stabilité

**TOUJOURS:**
- ✅ Exécuter tests multiples fois
- ✅ Vérifier taux de succès > 99%
- ✅ Identifier tests encore flaky
- ✅ Documenter résultats

**Pattern:**
```typescript
// Tester stabilité
async function testStability(testName: string, iterations: number = 10) {
  let successes = 0;
  
  for (let i = 0; i < iterations; i++) {
    try {
      await runTest(testName);
      successes++;
    } catch (error) {
      // Échec
    }
  }
  
  const stability = (successes / iterations) * 100;
  
  return {
    testName,
    stability: `${stability.toFixed(1)}%`,
    isStable: stability >= 99
  };
}
```

### 2. Monitoring CI/CD

**TOUJOURS:**
- ✅ Tracker échecs aléatoires dans CI
- ✅ Identifier tests avec échecs fréquents
- ✅ Alerter si nouveau test flaky
- ✅ Documenter patterns d'échec

## 🎯 Règles Spécifiques

### Tests E2E

**TOUJOURS:**
- ✅ Utiliser waitFor pour éléments DOM
- ✅ Mocker API externes
- ✅ Utiliser données de test isolées
- ✅ Nettoyer état après chaque test

### Tests Backend

**TOUJOURS:**
- ✅ Utiliser transactions pour isolation DB
- ✅ Mocker services externes
- ✅ Utiliser factories pour données
- ✅ Nettoyer DB après chaque test

### Tests Frontend

**TOUJOURS:**
- ✅ Utiliser render isolé
- ✅ Mocker hooks/composants externes
- ✅ Utiliser waitFor pour async
- ✅ Nettoyer DOM après chaque test

## 🔗 Intégration

### Règles Associées

- `testing.md` - Patterns tests généraux
- `automated-testing-debugging.md` - Debug tests automatisé
- `iterative-perfection.md` - Itération jusqu'à perfection

### Documentation

- `docs/project/activeContext.md` - Tests flaky identifiés
- `docs/AGENT-METRICS.md` - Métriques tests

## ✅ Checklist

**Avant création test:**
- [ ] Identifier dépendances externes
- [ ] Planifier isolation état
- [ ] Prévoir mocking nécessaire
- [ ] Éviter dépendances entre tests

**Pendant création test:**
- [ ] Isoler état (beforeEach/afterEach)
- [ ] Mocker dépendances externes
- [ ] Utiliser waitFor pour async
- [ ] Éviter timing fixes

**Après création test:**
- [ ] Exécuter test multiple fois
- [ ] Vérifier stabilité > 99%
- [ ] Documenter si flaky détecté
- [ ] Corriger causes identifiées

---

**Référence:** `@docs/project/activeContext.md` - Tests flaky E2E identifiés

