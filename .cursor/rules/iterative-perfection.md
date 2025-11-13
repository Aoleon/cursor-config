# Itération Automatique jusqu'à Perfection - Saxium

**Objectif:** Garantir que l'agent itère automatiquement jusqu'à ce qu'une tâche soit parfaitement complétée, sans erreurs, tests qui passent, et fonctionnalité complète.

## 🎯 Principe Fondamental

**IMPÉRATIF:** L'agent DOIT itérer automatiquement jusqu'à ce que la tâche soit parfaitement complétée, sans erreurs, tests qui passent, et fonctionnalité complète.

**Critères de Perfection:**
- ✅ Aucune erreur TypeScript
- ✅ Tous les tests passent (unitaires + E2E)
- ✅ Fonctionnalité complète (tous les éléments requis implémentés)
- ✅ Aucun anti-pattern détecté
- ✅ Validation complète réussie
- ✅ Aucune régression détectée

## 📋 Règles d'Itération Automatique

### 1. Détection Automatique des Problèmes

**TOUJOURS:**
- ✅ Détecter tous les types de problèmes après chaque modification
- ✅ Analyser les erreurs TypeScript
- ✅ Analyser les échecs de tests
- ✅ Détecter les fonctionnalités incomplètes
- ✅ Détecter les erreurs parallèles (découvertes par tests)
- ✅ Détecter les anti-patterns
- ✅ Documenter tous les problèmes détectés

**Pattern:**
```typescript
// Détecter tous les types de problèmes
async function detectAllIssues(code: string, context: Context): Promise<Issue[]> {
  const issues: Issue[] = [];
  
  // 1. Erreurs TypeScript
  const tsErrors = await detectTypeScriptErrors(code);
  issues.push(...tsErrors.map(e => ({
    type: 'typescript',
    severity: 'error',
    error: e,
    canAutoFix: e.canAutoFix
  })));
  
  // 2. Erreurs de tests
  const testFailures = await detectTestFailures(code, context);
  issues.push(...testFailures.map(f => ({
    type: 'test',
    severity: 'error',
    failure: f,
    canAutoFix: f.canAutoFix
  })));
  
  // 3. Fonctionnalités incomplètes
  const incompleteFeatures = await detectIncompleteFeatures(code, context);
  issues.push(...incompleteFeatures.map(f => ({
    type: 'incomplete',
    severity: 'warning',
    feature: f,
    canAutoFix: f.canAutoFix
  })));
  
  // 4. Erreurs parallèles (découvertes par tests)
  const parallelErrors = await detectParallelErrors(code, context);
  issues.push(...parallelErrors.map(e => ({
    type: 'parallel',
    severity: 'error',
    error: e,
    canAutoFix: e.canAutoFix
  })));
  
  // 5. Anti-patterns
  const antiPatterns = await detectAntiPatterns(code);
  issues.push(...antiPatterns.map(p => ({
    type: 'anti-pattern',
    severity: 'warning',
    pattern: p,
    canAutoFix: p.canAutoFix
  })));
  
  return issues;
}
```

### 2. Itération Automatique jusqu'à Perfection

**TOUJOURS:**
- ✅ Itérer automatiquement jusqu'à ce que tous les problèmes soient résolus
- ✅ Corriger automatiquement tous les problèmes auto-corrigeables
- ✅ Valider après chaque itération
- ✅ Documenter les problèmes non auto-corrigeables
- ✅ Ne pas s'arrêter tant qu'il reste des problèmes
- ✅ Limiter le nombre d'itérations (max 10) pour éviter boucles infinies

**Pattern:**
```typescript
// Itérer jusqu'à ce que tout soit parfait
async function iterateToPerfection(
  task: Task,
  context: Context
): Promise<PerfectionResult> {
  let iteration = 0;
  const maxIterations = 10;
  let currentCode = await loadCode(task);
  const iterationHistory: IterationHistory[] = [];
  
  while (iteration < maxIterations) {
    // 1. Détecter tous les problèmes
    const issues = await detectAllIssues(currentCode, context);
    
    // 2. Si aucun problème, valider complètement
    if (issues.length === 0) {
      const fullValidation = await validateCompletely(currentCode, task);
      if (fullValidation.perfect) {
        return {
          success: true,
          perfect: true,
          iterations: iteration,
          code: currentCode,
          history: iterationHistory
        };
      }
      // Si validation échoue, continuer à itérer
      issues.push(...fullValidation.issues);
    }
    
    // 3. Documenter itération
    iterationHistory.push({
      iteration,
      issues: issues.length,
      code: currentCode,
      timestamp: Date.now()
    });
    
    // 4. Corriger automatiquement tous les problèmes
    const correctedCode = await autoFixAllIssues(currentCode, issues);
    
    // 5. Valider corrections
    const validation = await validateCode(correctedCode);
    if (!validation.success) {
      // Si correction échoue, documenter et continuer
      await documentUnfixableIssues(issues, validation);
    }
    
    // 6. Mettre à jour code et itérer
    currentCode = correctedCode;
    iteration++;
    
    // 7. Sauvegarder état à chaque itération
    await saveIterationState(task, iteration, currentCode, issues);
  }
  
  // Si max iterations atteint, documenter état final
  const remainingIssues = await detectAllIssues(currentCode, context);
  return {
    success: false,
    perfect: false,
    iterations: iteration,
    code: currentCode,
    remainingIssues,
    history: iterationHistory
  };
}
```

### 3. Validation Complète Avant Arrêt

**TOUJOURS:**
- ✅ Valider TypeScript complètement
- ✅ Exécuter tous les tests (unitaires + E2E)
- ✅ Valider fonctionnalité complète
- ✅ Détecter anti-patterns
- ✅ Vérifier absence de régressions
- ✅ Ne s'arrêter que si validation complète réussie

**Pattern:**
```typescript
// Valider complètement avant de s'arrêter
async function validateCompletely(
  code: string,
  task: Task
): Promise<CompleteValidation> {
  const validation: CompleteValidation = {
    perfect: true,
    issues: []
  };
  
  // 1. Validation TypeScript
  const tsValidation = await validateTypeScript(code);
  if (!tsValidation.success) {
    validation.perfect = false;
    validation.issues.push(...tsValidation.errors.map(e => ({
      type: 'typescript',
      severity: 'error',
      error: e
    })));
  }
  
  // 2. Validation tests unitaires
  const unitTests = await runAllUnitTests(code);
  if (!unitTests.success) {
    validation.perfect = false;
    validation.issues.push(...unitTests.failures.map(f => ({
      type: 'test-unit',
      severity: 'error',
      failure: f
    })));
  }
  
  // 3. Validation tests E2E
  const e2eTests = await runAllE2ETests(code);
  if (!e2eTests.success) {
    validation.perfect = false;
    validation.issues.push(...e2eTests.failures.map(f => ({
      type: 'test-e2e',
      severity: 'error',
      failure: f
    })));
  }
  
  // 4. Validation fonctionnalité complète
  const featureValidation = await validateFeatureCompleteness(code, task);
  if (!featureValidation.complete) {
    validation.perfect = false;
    validation.issues.push(...featureValidation.missingElements.map(e => ({
      type: 'incomplete',
      severity: 'warning',
      element: e
    })));
  }
  
  // 5. Validation anti-patterns
  const antiPatterns = await detectAntiPatterns(code);
  if (antiPatterns.length > 0) {
    validation.perfect = false;
    validation.issues.push(...antiPatterns.map(p => ({
      type: 'anti-pattern',
      severity: 'warning',
      pattern: p
    })));
  }
  
  // 6. Vérification régressions
  const regressions = await detectRegressions(code, task);
  if (regressions.length > 0) {
    validation.perfect = false;
    validation.issues.push(...regressions.map(r => ({
      type: 'regression',
      severity: 'error',
      regression: r
    })));
  }
  
  return validation;
}
```

### 4. Gestion des Problèmes Découverts Après Implémentation (RENFORCÉE)

**IMPÉRATIF:** Utiliser stratégie systématique de résolution bugs pour problèmes découverts.

**TOUJOURS:**
- ✅ Détecter problèmes découverts par tests
- ✅ **Utiliser stratégie systématique résolution bugs** (IMPÉRATIF)
- ✅ **Rechercher cause racine systématiquement** (IMPÉRATIF - avant correction)
- ✅ **Prioriser problèmes** selon impact et urgence
- ✅ **Planifier résolution** avant correction
- ✅ Corriger automatiquement si possible
- ✅ **Valider correction systématiquement** (IMPÉRATIF)
- ✅ Re-tester pour valider correction
- ✅ **Documenter problèmes et solutions** (IMPÉRATIF)
- ✅ Itérer jusqu'à résolution complète

**Référence:** `@.cursor/rules/bug-resolution-strategy.md` - Stratégie systématique résolution bugs (IMPÉRATIF)  
**Référence:** `@.cursor/rules/root-cause-analysis.md` - Recherche systématique cause racine (IMPÉRATIF)

**Pattern:**
```typescript
// Détecter et corriger problèmes découverts après implémentation
async function handlePostImplementationIssues(
  code: string,
  testResults: TestResults,
  context: Context
): Promise<FixedCode> {
  let fixedCode = code;
  let iteration = 0;
  const maxIterations = 5;
  
  while (iteration < maxIterations) {
    // 1. Analyser résultats de tests
    const issues = analyzeTestResults(testResults);
    
    // 2. Si aucun problème, c'est bon !
    if (issues.length === 0) {
      return {
        code: fixedCode,
        fixed: true,
        iterations: iteration
      };
    }
    
    // 3. Pour chaque problème détecté, utiliser stratégie systématique
    for (const issue of issues) {
      // 4. Prioriser problème
      const priority = await prioritizeIssue(issue, context);
      
      // 5. Rechercher cause racine systématiquement (IMPÉRATIF)
      const rootCauseAnalysis = await rootCauseAnalysisWorkflow(
        issue.error || new Error(issue.description),
        context
      );
      
      if (!rootCauseAnalysis.validated || !rootCauseAnalysis.rootCause) {
        logger.warn('Cause racine non validée, problème nécessite analyse plus approfondie', {
          metadata: {
            issueId: issue.id,
            confidence: rootCauseAnalysis.confidence
          }
        });
        await documentUnfixableIssue(issue, rootCauseAnalysis);
        continue;
      }
      
      // 6. Planifier résolution
      const resolutionPlan = await planBugResolution(
        { id: issue.id, description: issue.description, error: issue.error },
        rootCauseAnalysis.rootCause,
        context
      );
      
      // 7. Exécuter correction selon plan
      const resolution = await executeBugResolution(resolutionPlan, context);
      
      // 8. Valider correction systématiquement
      const validation = await validateBugResolution(
        { id: issue.id, description: issue.description, error: issue.error },
        resolution,
        context
      );
      
      if (validation.validated) {
        fixedCode = resolution.finalCode;
        
        // 9. Documenter bug et solution
        await documentBugResolution(
          { id: issue.id, description: issue.description, error: issue.error },
          rootCauseAnalysis.rootCause,
          resolutionPlan.solution,
          validation,
          context
        );
      } else {
        // Si validation échoue, documenter
        await documentUnfixableIssue(issue, rootCauseAnalysis);
      }
    }
    
    // 10. Re-exécuter tous les tests
    testResults = await runAllTests(fixedCode);
    iteration++;
  }
  
  return {
    code: fixedCode,
    fixed: false,
    iterations: iteration,
    remainingIssues: analyzeTestResults(testResults)
  };
}
```

### 5. Correction Automatique de Tous les Problèmes

**TOUJOURS:**
- ✅ Corriger automatiquement tous les problèmes auto-corrigeables
- ✅ Valider chaque correction
- ✅ Documenter corrections appliquées
- ✅ Documenter problèmes non auto-corrigeables
- ✅ Réessayer avec corrections

**Pattern:**
```typescript
// Corriger automatiquement tous les problèmes
async function autoFixAllIssues(
  code: string,
  issues: Issue[]
): Promise<string> {
  let fixedCode = code;
  const fixes: Fix[] = [];
  const unfixable: Issue[] = [];
  
  // 1. Trier problèmes par priorité
  const sortedIssues = sortIssuesByPriority(issues);
  
  // 2. Pour chaque problème
  for (const issue of sortedIssues) {
    if (issue.canAutoFix) {
      // 3. Corriger automatiquement
      const fix = await autoFix(issue, fixedCode);
      fixedCode = fix.code;
      fixes.push(fix);
      
      // 4. Valider correction
      const validation = await validateFix(fix);
      if (!validation.success) {
        // Si correction échoue, documenter
        unfixable.push(issue);
      }
    } else {
      // Documenter problème non auto-corrigeable
      unfixable.push(issue);
    }
  }
  
  // 5. Documenter corrections et problèmes non résolus
  await documentFixes(fixes);
  await documentUnfixableIssues(unfixable);
  
  return fixedCode;
}
```

## 🔄 Workflow d'Itération Automatique

### Workflow: Itérer jusqu'à Perfection

**Étapes:**
1. Détecter tous les problèmes (TypeScript, tests, fonctionnalités, anti-patterns)
2. Si aucun problème, valider complètement
3. Si validation complète réussie, arrêter (perfection atteinte)
4. Sinon, corriger automatiquement tous les problèmes
5. Valider corrections
6. Itérer jusqu'à perfection ou max iterations
7. Documenter état final

**Pattern:**
```typescript
async function iterateToPerfectionWorkflow(
  task: Task,
  context: Context
): Promise<PerfectionResult> {
  let iteration = 0;
  const maxIterations = 10;
  let currentCode = await loadCode(task);
  const iterationHistory: IterationHistory[] = [];
  
  while (iteration < maxIterations) {
    // 1. Détecter tous les problèmes
    const issues = await detectAllIssues(currentCode, context);
    
    // 2. Si aucun problème, valider complètement
    if (issues.length === 0) {
      const fullValidation = await validateCompletely(currentCode, task);
      if (fullValidation.perfect) {
        // Perfection atteinte !
        return {
          success: true,
          perfect: true,
          iterations: iteration,
          code: currentCode,
          history: iterationHistory
        };
      }
      // Si validation échoue, continuer à itérer
      issues.push(...fullValidation.issues);
    }
    
    // 3. Documenter itération
    iterationHistory.push({
      iteration,
      issues: issues.length,
      code: currentCode,
      timestamp: Date.now()
    });
    
    // 4. Corriger automatiquement tous les problèmes
    const correctedCode = await autoFixAllIssues(currentCode, issues);
    
    // 5. Valider corrections
    const validation = await validateCode(correctedCode);
    if (!validation.success) {
      // Si correction échoue, documenter et continuer
      await documentUnfixableIssues(issues, validation);
    }
    
    // 6. Mettre à jour code et itérer
    currentCode = correctedCode;
    iteration++;
    
    // 7. Sauvegarder état à chaque itération
    await saveIterationState(task, iteration, currentCode, issues);
  }
  
  // Si max iterations atteint, documenter état final
  const remainingIssues = await detectAllIssues(currentCode, context);
  return {
    success: false,
    perfect: false,
    iterations: iteration,
    code: currentCode,
    remainingIssues,
    history: iterationHistory
  };
}
```

## ⚠️ Règles Anti-Interruption

### Ne Jamais S'Arrêter Si:

**BLOQUANT:**
- ❌ Il reste des erreurs TypeScript
- ❌ Il reste des tests qui échouent
- ❌ Il reste des fonctionnalités incomplètes
- ❌ Il reste des anti-patterns
- ❌ La validation complète échoue
- ❌ Il y a des régressions détectées

**TOUJOURS:**
- ✅ Détecter tous les problèmes avant de s'arrêter
- ✅ Itérer jusqu'à ce que tous les problèmes soient résolus
- ✅ Valider complètement avant de s'arrêter
- ✅ Documenter problèmes non résolus si max iterations atteint
- ✅ Sauvegarder état pour reprise

## 📊 Checklist Itération jusqu'à Perfection

### Avant de S'Arrêter

- [ ] Détecter tous les problèmes (TypeScript, tests, fonctionnalités, anti-patterns)
- [ ] S'assurer qu'il n'y a pas d'erreurs TypeScript
- [ ] S'assurer que tous les tests passent (unitaires + E2E)
- [ ] S'assurer que la fonctionnalité est complète
- [ ] S'assurer qu'il n'y a pas d'anti-patterns
- [ ] Valider complètement (validation complète réussie)
- [ ] Vérifier absence de régressions
- [ ] Sauvegarder état final
- [ ] Générer rapport de perfection

### Pendant l'Itération

- [ ] Détecter tous les problèmes à chaque itération
- [ ] Corriger automatiquement tous les problèmes auto-corrigeables
- [ ] Valider chaque correction
- [ ] Documenter corrections appliquées
- [ ] Documenter problèmes non auto-corrigeables
- [ ] Sauvegarder état à chaque itération
- [ ] Continuer jusqu'à perfection ou max iterations

### En Cas de Problème

- [ ] Identifier cause racine du problème
- [ ] Corriger automatiquement si possible
- [ ] Re-tester pour valider correction
- [ ] Documenter problème si non auto-corrigeable
- [ ] Continuer à itérer jusqu'à résolution
- [ ] Ne pas s'arrêter à cause d'un problème

## 🔗 Références

- `@.cursor/rules/bug-resolution-strategy.md` - Stratégie systématique résolution bugs (IMPÉRATIF - si bug détecté)
- `@.cursor/rules/root-cause-analysis.md` - Recherche systématique cause racine (IMPÉRATIF - si bug détecté)
- `@.cursor/rules/todo-completion.md` - Completion des todos
- `@.cursor/rules/automated-testing-debugging.md` - Tests E2E et débogage automatisé
- `@.cursor/rules/auto-detection.md` - Détection automatique des anti-patterns
- `@.cursor/rules/autonomous-workflows.md` - Workflows autonomes
- `@.cursor/rules/core.md` - Règles fondamentales

---

**Note:** Ces règles garantissent que l'agent itère automatiquement jusqu'à ce que la tâche soit parfaitement complétée, sans erreurs, tests qui passent, et fonctionnalité complète.

