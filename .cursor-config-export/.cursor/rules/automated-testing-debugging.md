# Tests E2E et Débogage Automatisé - Saxium

**Objectif:** Intégrer le débogage automatique et les tests E2E dans toutes les phases de développement pour garantir la fonctionnalité

## 🎯 Stratégies d'Intégration Tests E2E

### 1. Tests E2E dans Toutes les Phases de Développement

**Principe:** Exécuter des tests E2E à chaque étape importante du développement pour valider la fonctionnalité.

**TOUJOURS:**
- ✅ Exécuter tests E2E après chaque modification importante
- ✅ Valider les workflows critiques avec tests E2E
- ✅ Détecter régressions immédiatement
- ✅ Corriger automatiquement les problèmes détectés
- ✅ Documenter les tests créés/modifiés

**Pattern:**
```typescript
// Workflow de développement avec tests E2E intégrés
async function developWithE2ETesting(
  feature: Feature,
  modifications: Modification[]
): Promise<DevelopmentResult> {
  // 1. Planifier développement
  const plan = planDevelopment(feature, modifications);
  
  // 2. Exécuter modifications avec validation continue
  const results: ModificationResult[] = [];
  for (const modification of plan.modifications) {
    // Appliquer modification
    const result = await applyModification(modification);
    results.push(result);
    
    // Valider TypeScript
    const tsValidation = await validateTypeScript(result.code);
    if (!tsValidation.success) {
      await autoFixTypeScriptErrors(result.code, tsValidation.errors);
    }
    
    // Exécuter tests unitaires pertinents
    const unitTests = await runRelevantUnitTests(modification);
    if (!unitTests.success) {
      await fixUnitTests(unitTests.failures);
    }
    
    // Exécuter tests E2E pertinents
    const e2eTests = await runRelevantE2ETests(modification);
    if (!e2eTests.success) {
      await debugAndFixE2ETests(e2eTests.failures, modification);
    }
  }
  
  // 3. Exécuter suite complète de tests E2E
  const fullE2ESuite = await runFullE2ESuite();
  if (!fullE2ESuite.success) {
    await debugAndFixE2EFailures(fullE2ESuite.failures);
  }
  
  // 4. Valider fonctionnalité complète
  const functionalityValidation = await validateFunctionality(feature);
  
  return {
    success: functionalityValidation.success,
    modifications: results,
    tests: {
      unit: unitTests,
      e2e: e2eTests,
      full: fullE2ESuite
    },
    validation: functionalityValidation
  };
}
```

### 2. Débogage Automatique Intégré

**Principe:** Détecter et corriger automatiquement les erreurs à chaque étape.

**TOUJOURS:**
- ✅ Détecter erreurs TypeScript automatiquement
- ✅ Détecter erreurs de tests automatiquement
- ✅ Corriger automatiquement les erreurs courantes
- ✅ Documenter erreurs non auto-corrigeables
- ✅ Valider corrections automatiquement

**Pattern:**
```typescript
// Débogage automatique intégré
async function autoDebug(code: string, context: Context): Promise<DebugResult> {
  // 1. Détecter erreurs TypeScript
  const tsErrors = await detectTypeScriptErrors(code);
  
  // 2. Détecter erreurs de linting
  const lintErrors = await detectLintingErrors(code);
  
  // 3. Détecter erreurs de tests
  const testErrors = await detectTestErrors(code, context);
  
  // 4. Corriger automatiquement
  let fixedCode = code;
  const fixes: Fix[] = [];
  
  // Corriger erreurs TypeScript
  for (const error of tsErrors) {
    if (error.canAutoFix) {
      const fix = await autoFixTypeScriptError(fixedCode, error);
      fixedCode = fix.code;
      fixes.push(fix);
    }
  }
  
  // Corriger erreurs de linting
  for (const error of lintErrors) {
    if (error.canAutoFix) {
      const fix = await autoFixLintingError(fixedCode, error);
      fixedCode = fix.code;
      fixes.push(fix);
    }
  }
  
  // Corriger erreurs de tests
  for (const error of testErrors) {
    if (error.canAutoFix) {
      const fix = await autoFixTestError(fixedCode, error, context);
      fixedCode = fix.code;
      fixes.push(fix);
    }
  }
  
  // 5. Valider corrections
  const validation = await validateCode(fixedCode);
  
  return {
    originalCode: code,
    fixedCode: fixedCode,
    fixes: fixes,
    remainingErrors: validation.errors,
    success: validation.success
  };
}
```

### 3. Tests E2E Automatiques par Type de Modification

**Principe:** Exécuter les tests E2E pertinents selon le type de modification.

**TOUJOURS:**
- ✅ Identifier tests E2E pertinents selon modification
- ✅ Exécuter tests E2E ciblés après modification
- ✅ Exécuter suite complète après modifications majeures
- ✅ Valider workflows critiques systématiquement
- ✅ Documenter résultats des tests

**Pattern:**
```typescript
// Sélection et exécution de tests E2E pertinents
async function runRelevantE2ETests(
  modification: Modification
): Promise<E2ETestResult> {
  // 1. Identifier tests E2E pertinents
  const relevantTests = identifyRelevantE2ETests(modification);
  
  // 2. Exécuter tests pertinents
  const results: TestResult[] = [];
  for (const test of relevantTests) {
    const result = await runE2ETest(test);
    results.push(result);
    
    // Si échec, déboguer automatiquement
    if (!result.success) {
      const debugResult = await debugE2ETestFailure(test, result, modification);
      if (debugResult.fixed) {
        // Re-exécuter test après correction
        const retryResult = await runE2ETest(test);
        results.push(retryResult);
      }
    }
  }
  
  // 3. Analyser résultats
  const analysis = analyzeE2ETestResults(results);
  
  return {
    tests: results,
    analysis: analysis,
    success: analysis.allPassed,
    failures: analysis.failures
  };
}

// Identification des tests E2E pertinents
function identifyRelevantE2ETests(modification: Modification): E2ETest[] {
  const relevantTests: E2ETest[] = [];
  
  // Tests selon type de modification
  if (modification.type === 'route') {
    // Tests de routes API
    relevantTests.push(...findE2ETestsByPattern('api', modification.path));
  }
  
  if (modification.type === 'component') {
    // Tests de composants UI
    relevantTests.push(...findE2ETestsByPattern('component', modification.component));
  }
  
  if (modification.type === 'workflow') {
    // Tests de workflows complets
    relevantTests.push(...findE2ETestsByPattern('workflow', modification.workflow));
  }
  
  // Tests critiques toujours inclus
  relevantTests.push(...getCriticalE2ETests());
  
  return relevantTests;
}
```

### 4. Débogage Automatique des Tests E2E

**Principe:** Déboguer automatiquement les échecs de tests E2E.

**TOUJOURS:**
- ✅ Analyser échecs de tests E2E automatiquement
- ✅ Identifier cause racine des échecs
- ✅ Corriger automatiquement si possible
- ✅ Documenter échecs non auto-corrigeables
- ✅ Re-exécuter tests après correction

**Pattern:**
```typescript
// Débogage automatique des échecs E2E
async function debugE2ETestFailure(
  test: E2ETest,
  result: TestResult,
  modification: Modification
): Promise<DebugResult> {
  // 1. Analyser échec
  const failureAnalysis = analyzeE2ETestFailure(test, result);
  
  // 2. Identifier cause racine
  const rootCause = identifyRootCause(failureAnalysis, modification);
  
  // 3. Corriger automatiquement si possible
  if (rootCause.canAutoFix) {
    const fix = await autoFixE2ETestFailure(rootCause, modification);
    
    // 4. Valider correction
    const validation = await validateFix(fix);
    
    if (validation.success) {
      return {
        fixed: true,
        fix: fix,
        rootCause: rootCause
      };
    }
  }
  
  // 5. Documenter échec non auto-corrigeable
  await documentE2ETestFailure(test, result, rootCause, modification);
  
  return {
    fixed: false,
    rootCause: rootCause,
    requiresManualFix: true
  };
}

// Analyse des échecs E2E
function analyzeE2ETestFailure(
  test: E2ETest,
  result: TestResult
): FailureAnalysis {
  const analysis: FailureAnalysis = {
    test: test,
    error: result.error,
    screenshots: result.screenshots,
    traces: result.traces,
    consoleErrors: result.consoleErrors,
    networkErrors: result.networkErrors,
    timing: result.timing
  };
  
  // Identifier type d'erreur
  if (result.error?.message.includes('timeout')) {
    analysis.errorType = 'timeout';
    analysis.suggestedFix = 'increaseTimeout';
  } else if (result.error?.message.includes('not found')) {
    analysis.errorType = 'elementNotFound';
    analysis.suggestedFix = 'updateSelectors';
  } else if (result.consoleErrors.length > 0) {
    analysis.errorType = 'consoleError';
    analysis.suggestedFix = 'fixConsoleError';
  } else if (result.networkErrors.length > 0) {
    analysis.errorType = 'networkError';
    analysis.suggestedFix = 'fixNetworkError';
  }
  
  return analysis;
}
```

## 🔄 Workflows de Test E2E Intégrés

### Workflow 1: Développement avec Validation Continue

**Objectif:** Développer avec validation continue via tests E2E.

**Étapes:**
1. Planifier développement avec tests
2. Appliquer modifications avec validation TypeScript
3. Exécuter tests unitaires pertinents
4. Exécuter tests E2E pertinents
5. Déboguer et corriger automatiquement
6. Exécuter suite complète de tests E2E
7. Valider fonctionnalité complète

**Pattern:**
```typescript
async function developWithContinuousValidation(
  feature: Feature
): Promise<DevelopmentResult> {
  // 1. Planifier avec tests
  const plan = planDevelopmentWithTests(feature);
  
  // 2. Exécuter modifications avec validation continue
  for (const step of plan.steps) {
    // Appliquer modification
    const result = await applyModification(step.modification);
    
    // Valider TypeScript
    await validateAndFixTypeScript(result.code);
    
    // Exécuter tests pertinents
    await runRelevantTests(step.modification);
    
    // Exécuter tests E2E pertinents
    await runRelevantE2ETests(step.modification);
    
    // Déboguer si nécessaire
    if (result.hasErrors) {
      await autoDebug(result.code, step.context);
    }
  }
  
  // 3. Exécuter suite complète
  await runFullTestSuite();
  
  // 4. Valider fonctionnalité
  return await validateFunctionality(feature);
}
```

### Workflow 2: Débogage Automatique des Tests E2E

**Objectif:** Déboguer automatiquement les échecs de tests E2E.

**Étapes:**
1. Exécuter tests E2E
2. Analyser échecs automatiquement
3. Identifier cause racine
4. Corriger automatiquement si possible
5. Re-exécuter tests après correction
6. Documenter échecs non auto-corrigeables

**Pattern:**
```typescript
async function autoDebugE2ETests(
  tests: E2ETest[],
  context: Context
): Promise<DebugResult> {
  // 1. Exécuter tests
  const results = await runE2ETests(tests);
  
  // 2. Analyser échecs
  const failures = results.filter(r => !r.success);
  
  if (failures.length === 0) {
    return { success: true, fixed: 0, remaining: 0 };
  }
  
  // 3. Déboguer chaque échec
  let fixed = 0;
  const remaining: TestFailure[] = [];
  
  for (const failure of failures) {
    const debugResult = await debugE2ETestFailure(
      failure.test,
      failure.result,
      context
    );
    
    if (debugResult.fixed) {
      fixed++;
      // Re-exécuter test
      const retryResult = await runE2ETest(failure.test);
      if (retryResult.success) {
        logger.info('Test E2E corrigé automatiquement', {
          metadata: { testId: failure.test.id }
        });
      }
    } else {
      remaining.push(failure);
    }
  }
  
  return {
    success: remaining.length === 0,
    fixed: fixed,
    remaining: remaining
  };
}
```

## 🛠️ Outils et Scripts

### 1. Script de Test E2E Automatique

**Pattern:**
```typescript
// scripts/auto-e2e-test.ts
async function autoE2ETest(modification: Modification): Promise<E2ETestResult> {
  // 1. Identifier tests pertinents
  const relevantTests = identifyRelevantE2ETests(modification);
  
  // 2. Exécuter tests
  const results = await runE2ETests(relevantTests);
  
  // 3. Analyser résultats
  const analysis = analyzeResults(results);
  
  // 4. Déboguer si nécessaire
  if (analysis.hasFailures) {
    const debugResult = await autoDebugE2ETests(
      analysis.failures.map(f => f.test),
      modification.context
    );
    
    // 5. Re-exécuter si corrections appliquées
    if (debugResult.fixed > 0) {
      const retryResults = await runE2ETests(
        debugResult.fixedTests
      );
      return { ...analysis, retryResults };
    }
  }
  
  return analysis;
}
```

### 2. Script de Débogage Automatique

**Pattern:**
```typescript
// scripts/auto-debug.ts
async function autoDebug(code: string): Promise<DebugResult> {
  // 1. Détecter erreurs
  const errors = await detectAllErrors(code);
  
  // 2. Corriger automatiquement
  let fixedCode = code;
  const fixes: Fix[] = [];
  
  for (const error of errors) {
    if (error.canAutoFix) {
      const fix = await autoFix(error, fixedCode);
      fixedCode = fix.code;
      fixes.push(fix);
    }
  }
  
  // 3. Valider corrections
  const validation = await validateCode(fixedCode);
  
  return {
    originalCode: code,
    fixedCode: fixedCode,
    fixes: fixes,
    remainingErrors: validation.errors,
    success: validation.success
  };
}
```

## 📊 Intégration dans Workflows de Développement

### 1. Avant Modification

**TOUJOURS:**
- ✅ Exécuter tests E2E existants pour baseline
- ✅ Identifier tests E2E pertinents à modifier
- ✅ Planifier tests E2E à créer si nécessaire

### 2. Pendant Modification

**TOUJOURS:**
- ✅ Valider TypeScript après chaque modification
- ✅ Exécuter tests unitaires pertinents
- ✅ Exécuter tests E2E pertinents après modification importante
- ✅ Déboguer automatiquement les erreurs détectées

### 3. Après Modification

**TOUJOURS:**
- ✅ Exécuter suite complète de tests E2E
- ✅ Déboguer automatiquement les échecs
- ✅ Valider fonctionnalité complète
- ✅ Documenter tests créés/modifiés

## 🎯 Application au Projet Saxium

### Tests E2E Existants à Utiliser

**1. Tests Workflow Complet**
- `e2e/workflows/fournisseur-quote-complete.spec.ts` - Workflow devis fournisseur
- `e2e/workflows/chiffrage.spec.ts` - Workflow chiffrage
- `e2e/workflows/planification.spec.ts` - Workflow planification
- `e2e/workflows/chatbot.spec.ts` - Workflow chatbot IA

**2. Tests User Journeys**
- `e2e/e2e/user-journeys.spec.ts` - Parcours utilisateur complets
- `tests/e2e/journeys/project-lifecycle.spec.ts` - Cycle de vie projet
- `tests/e2e/journeys/offer-maturation.spec.ts` - Maturation offre

**3. Tests Techniques**
- `tests/e2e/resilience.spec.ts` - Tests de résilience
- `tests/e2e/chatbot.spec.ts` - Tests chatbot
- `tests/e2e/chiffrage.spec.ts` - Tests chiffrage

### Scripts de Débogage Existants

**1. Auto Test Debug**
- `scripts/auto-test-debug.ts` - Détection et correction automatique erreurs TypeScript
- `npm run test:auto-debug` - Exécuter débogage automatique

**2. Tests E2E**
- `npm run test:e2e` - Exécuter tous les tests E2E
- `npm run test:e2e:debug` - Mode debug interactif
- `npm run test:e2e:headed` - Voir tests s'exécuter

## 🔗 Références

### Documentation Essentielle
- `@e2e/README.md` - Infrastructure tests E2E Playwright
- `@tests/e2e/README_E2E_TESTS.md` - Tests E2E détaillés
- `@docs/testing/AUTO_TEST_DEBUG_GUIDE.md` - Guide débogage automatique
- `@.cursor/rules/workflows.md` - Workflows détaillés

### Fichiers de Mémoire
- `@activeContext.md` - État actuel et focus
- `@systemPatterns.md` - Patterns architecturaux
- `@projectbrief.md` - Objectifs et périmètre

---

**Note:** Ces stratégies permettent à l'agent Cursor de déboguer et tester automatiquement dans toutes les phases de développement, garantissant que le code développé est fonctionnel.

