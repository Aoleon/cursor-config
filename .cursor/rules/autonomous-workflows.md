# Workflows Autonomes - Saxium

**Objectif:** Maximiser l'autonomie de l'agent Cursor pour des runs plus longs et plus efficaces

## 🎯 Stratégies d'Autonomie

### 1. Planification Autonome des Tâches

**Principe:** L'agent doit être capable de planifier et exécuter des séquences de tâches complexes de manière autonome.

**TOUJOURS:**
- ✅ Décomposer les tâches complexes en sous-tâches
- ✅ Identifier les dépendances entre tâches
- ✅ Planifier l'ordre d'exécution optimal
- ✅ Valider chaque étape avant de continuer
- ✅ Documenter le plan d'exécution

**Pattern:**
```typescript
// 1. Analyser la tâche
const task = analyzeTask(userRequest);

// 2. Décomposer en sous-tâches
const subtasks = decomposeTask(task);

// 3. Identifier dépendances
const dependencies = identifyDependencies(subtasks);

// 4. Planifier ordre d'exécution
const executionPlan = planExecution(subtasks, dependencies);

// 5. Exécuter avec validation à chaque étape
for (const subtask of executionPlan) {
  const result = await executeSubtask(subtask);
  validateResult(result);
  if (!result.success) {
    await handleError(result, subtask);
  }
}
```

### 2. Validation et Auto-Correction

**Principe:** L'agent doit valider automatiquement ses actions et corriger les erreurs sans intervention humaine.

**TOUJOURS:**
- ✅ Valider les modifications avant de les appliquer
- ✅ Vérifier les types TypeScript après modifications
- ✅ Vérifier les tests après modifications
- ✅ Corriger automatiquement les erreurs détectées
- ✅ Documenter les corrections effectuées

**Pattern:**
```typescript
// 1. Modifier le code
const modifiedCode = applyModification(code, modification);

// 2. Valider immédiatement
const validation = await validateCode(modifiedCode);
if (!validation.success) {
  // 3. Auto-corriger
  const correctedCode = await autoCorrect(modifiedCode, validation.errors);
  
  // 4. Re-valider
  const revalidation = await validateCode(correctedCode);
  if (!revalidation.success) {
    // 5. Documenter et demander aide si nécessaire
    await documentIssue(correctedCode, revalidation.errors);
  }
}
```

### 3. Gestion des Erreurs et Récupération

**Principe:** L'agent doit gérer les erreurs de manière autonome et récupérer automatiquement.

**TOUJOURS:**
- ✅ Détecter les erreurs immédiatement
- ✅ Analyser le type d'erreur
- ✅ Appliquer la correction appropriée
- ✅ Réessayer avec correction
- ✅ Documenter les erreurs et corrections

**Pattern:**
```typescript
async function executeWithRecovery(operation: () => Promise<Result>): Promise<Result> {
  let attempts = 0;
  const maxAttempts = 3;
  
  while (attempts < maxAttempts) {
    try {
      const result = await operation();
      
      // Valider le résultat
      if (validateResult(result)) {
        return result;
      }
      
      // Résultat invalide, corriger et réessayer
      const correction = analyzeIssue(result);
      await applyCorrection(correction);
      attempts++;
      
    } catch (error) {
      // Analyser l'erreur
      const errorAnalysis = analyzeError(error);
      
      // Appliquer correction si possible
      if (errorAnalysis.canAutoCorrect) {
        await applyCorrection(errorAnalysis.correction);
        attempts++;
      } else {
        // Erreur non récupérable, documenter et arrêter
        await documentError(error, errorAnalysis);
        throw error;
      }
    }
  }
  
  throw new Error('Max attempts reached');
}
```

### 4. Apprentissage Continu avec Reflexion

**Principe:** L'agent doit apprendre de ses actions et améliorer ses performances de manière autonome avec réflexion verbale.

**TOUJOURS:**
- ✅ Analyser les résultats des actions précédentes
- ✅ Réfléchir verbalement sur ce qui a fonctionné et ce qui n'a pas fonctionné
- ✅ Identifier les patterns de succès
- ✅ Identifier les patterns d'échec
- ✅ Adapter les stratégies en fonction des résultats
- ✅ Consolider les connaissances en workflows réutilisables
- ✅ Documenter les apprentissages

**Pattern:**
```typescript
// Après chaque action avec réflexion
async function learnFromActionWithReflection(action: Action, result: Result) {
  // 1. Analyser le résultat
  const analysis = analyzeResult(result);
  
  // 2. Réfléchir sur l'action
  const reflection = await reflectOnAction(action, result);
  
  // 3. Identifier patterns
  if (analysis.success) {
    // Pattern de succès
    await recordSuccessPattern(action, result, reflection);
  } else {
    // Pattern d'échec
    await recordFailurePattern(action, result, reflection);
  }
  
  // 4. Adapter stratégies
  const adaptedStrategy = adaptStrategy(analysis, reflection);
  await updateStrategy(adaptedStrategy);
  
  // 5. Consolider si plusieurs succès similaires
  const similarSuccesses = await findSimilarSuccesses(action);
  if (similarSuccesses.length >= 3) {
    const consolidated = await consolidateKnowledge(similarSuccesses);
    await documentConsolidatedWorkflow(consolidated);
  }
  
  // 6. Documenter apprentissage
  await documentLearning(action, result, analysis, reflection);
}
```

**Référence:** `@.cursor/rules/advanced-learning.md` - Stratégies d'apprentissage avancées

### 5. Détection et Correction Automatique des Problèmes

**Principe:** L'agent doit détecter et corriger automatiquement les problèmes courants.

**Problèmes Courants à Détecter:**
- ✅ Erreurs de types TypeScript
- ✅ Erreurs de linting
- ✅ Code dupliqué
- ✅ Anti-patterns
- ✅ Violations de conventions
- ✅ Tests qui échouent

**Pattern:**
```typescript
async function detectAndFixIssues(code: string): Promise<string> {
  // 1. Détecter problèmes
  const issues = await detectIssues(code);
  
  // 2. Trier par priorité
  const sortedIssues = sortByPriority(issues);
  
  // 3. Corriger automatiquement
  let fixedCode = code;
  for (const issue of sortedIssues) {
    if (issue.canAutoFix) {
      fixedCode = await autoFix(fixedCode, issue);
    } else {
      // Documenter problème non auto-corrigeable
      await documentIssue(issue);
    }
  }
  
  // 4. Valider corrections
  const validation = await validateCode(fixedCode);
  if (!validation.success) {
    // Re-corriger si nécessaire
    return await detectAndFixIssues(fixedCode);
  }
  
  return fixedCode;
}
```

## 🔄 Workflows Autonomes

### Workflow 1: Modification Multi-Fichiers Autonome

**Objectif:** Modifier plusieurs fichiers de manière cohérente et autonome.

**Étapes:**
1. Analyser l'impact de la modification
2. Identifier tous les fichiers affectés
3. Planifier l'ordre de modification
4. Modifier chaque fichier avec validation
5. Vérifier la cohérence globale
6. Corriger les incohérences automatiquement

**Pattern:**
```typescript
async function modifyMultipleFiles(
  modification: Modification,
  affectedFiles: string[]
): Promise<ModificationResult> {
  // 1. Planifier modifications
  const plan = planModifications(modification, affectedFiles);
  
  // 2. Exécuter modifications
  const results: FileModificationResult[] = [];
  for (const filePlan of plan) {
    const result = await modifyFile(filePlan);
    results.push(result);
    
    // Valider après chaque modification
    if (!result.success) {
      // Corriger et réessayer
      const corrected = await autoCorrectFile(result);
      results.push(corrected);
    }
  }
  
  // 3. Vérifier cohérence globale
  const globalValidation = await validateGlobalConsistency(results);
  if (!globalValidation.success) {
    // Corriger incohérences
    const fixedResults = await fixInconsistencies(results, globalValidation);
    return { success: true, results: fixedResults };
  }
  
  return { success: true, results };
}
```

### Workflow 2: Refactoring Autonome

**Objectif:** Refactoriser le code de manière autonome en respectant les patterns du projet.

**Étapes:**
1. Identifier code à refactoriser
2. Analyser patterns existants
3. Planifier refactoring
4. Appliquer refactoring avec validation
5. Vérifier tests après refactoring
6. Documenter refactoring

**Pattern:**
```typescript
async function autonomousRefactoring(
  targetCode: string,
  refactoringType: RefactoringType
): Promise<RefactoringResult> {
  // 1. Identifier code à refactoriser
  const codeToRefactor = identifyCodeToRefactor(targetCode, refactoringType);
  
  // 2. Analyser patterns existants
  const existingPatterns = await analyzeExistingPatterns(targetCode);
  
  // 3. Planifier refactoring
  const refactoringPlan = planRefactoring(codeToRefactor, existingPatterns);
  
  // 4. Appliquer refactoring
  const refactoredCode = await applyRefactoring(targetCode, refactoringPlan);
  
  // 5. Valider refactoring
  const validation = await validateRefactoring(refactoredCode);
  if (!validation.success) {
    // Corriger et réessayer
    return await autonomousRefactoring(refactoredCode, refactoringType);
  }
  
  // 6. Vérifier tests
  const testResults = await runTests(refactoredCode);
  if (!testResults.success) {
    // Corriger tests si nécessaire
    const fixedCode = await fixTests(refactoredCode, testResults);
    return { success: true, code: fixedCode };
  }
  
  return { success: true, code: refactoredCode };
}
```

### Workflow 3: Migration Autonome

**Objectif:** Migrer du code legacy vers les nouveaux patterns de manière autonome.

**Étapes:**
1. Identifier code legacy
2. Analyser patterns cibles
3. Planifier migration
4. Migrer avec validation à chaque étape
5. Vérifier tests après migration
6. Documenter migration

**Pattern:**
```typescript
async function autonomousMigration(
  legacyCode: string,
  targetPattern: Pattern
): Promise<MigrationResult> {
  // 1. Identifier code legacy
  const legacyParts = identifyLegacyCode(legacyCode);
  
  // 2. Analyser patterns cibles
  const targetPatterns = await analyzeTargetPatterns(targetPattern);
  
  // 3. Planifier migration
  const migrationPlan = planMigration(legacyParts, targetPatterns);
  
  // 4. Migrer étape par étape
  let migratedCode = legacyCode;
  for (const step of migrationPlan) {
    migratedCode = await migrateStep(migratedCode, step);
    
    // Valider après chaque étape
    const validation = await validateMigration(migratedCode, step);
    if (!validation.success) {
      // Corriger et réessayer
      migratedCode = await fixMigration(migratedCode, validation);
    }
  }
  
  // 5. Vérifier tests
  const testResults = await runTests(migratedCode);
  if (!testResults.success) {
    // Corriger tests
    migratedCode = await fixTests(migratedCode, testResults);
  }
  
  return { success: true, code: migratedCode };
}
```

## 🛡️ Validation Automatique

### 1. Validation TypeScript

**TOUJOURS:**
- ✅ Vérifier types après chaque modification
- ✅ Corriger erreurs de types automatiquement
- ✅ Vérifier imports après modifications

**Pattern:**
```typescript
async function validateTypeScript(code: string): Promise<ValidationResult> {
  const errors = await checkTypeScript(code);
  
  if (errors.length === 0) {
    return { success: true };
  }
  
  // Auto-corriger si possible
  const fixedCode = await autoFixTypeScript(code, errors);
  const revalidation = await checkTypeScript(fixedCode);
  
  if (revalidation.length === 0) {
    return { success: true, code: fixedCode };
  }
  
  // Erreurs non auto-corrigeables
  return { success: false, errors: revalidation };
}
```

### 2. Validation Tests

**TOUJOURS:**
- ✅ Exécuter tests après modifications
- ✅ Corriger tests qui échouent
- ✅ Vérifier couverture de code

**Pattern:**
```typescript
async function validateTests(code: string): Promise<TestResult> {
  const testResults = await runTests(code);
  
  if (testResults.success) {
    return testResults;
  }
  
  // Analyser échecs
  const failures = analyzeTestFailures(testResults);
  
  // Corriger automatiquement si possible
  const fixedCode = await autoFixTests(code, failures);
  const retestResults = await runTests(fixedCode);
  
  return retestResults;
}
```

### 3. Validation Conventions

**TOUJOURS:**
- ✅ Vérifier conventions de code
- ✅ Vérifier patterns du projet
- ✅ Corriger violations automatiquement

**Pattern:**
```typescript
async function validateConventions(code: string): Promise<ConventionResult> {
  const violations = await checkConventions(code);
  
  if (violations.length === 0) {
    return { success: true };
  }
  
  // Auto-corriger violations
  const fixedCode = await autoFixConventions(code, violations);
  const revalidation = await checkConventions(fixedCode);
  
  if (revalidation.length === 0) {
    return { success: true, code: fixedCode };
  }
  
  return { success: false, violations: revalidation };
}
```

## 📊 Monitoring et Auto-Correction

### 1. Détection de Problèmes

**Problèmes à Détecter:**
- ✅ Erreurs de compilation
- ✅ Tests qui échouent
- ✅ Violations de conventions
- ✅ Code dupliqué
- ✅ Anti-patterns
- ✅ Dépendances manquantes

**Pattern:**
```typescript
async function detectProblems(codebase: string[]): Promise<Problem[]> {
  const problems: Problem[] = [];
  
  // Détecter différents types de problèmes
  problems.push(...await detectCompilationErrors(codebase));
  problems.push(...await detectTestFailures(codebase));
  problems.push(...await detectConventionViolations(codebase));
  problems.push(...await detectDuplicatedCode(codebase));
  problems.push(...await detectAntiPatterns(codebase));
  problems.push(...await detectMissingDependencies(codebase));
  
  return problems;
}
```

### 2. Auto-Correction

**TOUJOURS:**
- ✅ Corriger automatiquement les problèmes détectés
- ✅ Valider corrections
- ✅ Documenter corrections

**Pattern:**
```typescript
async function autoCorrectProblems(
  codebase: string[],
  problems: Problem[]
): Promise<CorrectionResult> {
  let correctedCodebase = codebase;
  
  for (const problem of problems) {
    if (problem.canAutoFix) {
      correctedCodebase = await applyFix(correctedCodebase, problem);
      
      // Valider correction
      const validation = await validateFix(correctedCodebase, problem);
      if (!validation.success) {
        // Documenter problème non auto-corrigeable
        await documentProblem(problem);
      }
    } else {
      // Documenter problème nécessitant intervention
      await documentProblem(problem);
    }
  }
  
  return { success: true, codebase: correctedCodebase };
}
```

## 🎯 Checklist Autonomie

### Avant de Commencer un Run Autonome

- [ ] Analyser la tâche complète
- [ ] Décomposer en sous-tâches
- [ ] Identifier dépendances
- [ ] Planifier ordre d'exécution
- [ ] Préparer stratégies de récupération
- [ ] Détecter anti-patterns dans fichiers cibles
- [ ] Préparer corrections automatiques

### Pendant le Run Autonome

- [ ] Détecter anti-patterns avant chaque modification
- [ ] Corriger anti-patterns automatiquement
- [ ] Valider chaque étape avant de continuer
- [ ] Détecter et corriger erreurs automatiquement
- [ ] Documenter actions importantes
- [ ] Adapter stratégies selon résultats
- [ ] Vérifier cohérence globale

### Après le Run Autonome

- [ ] Détecter anti-patterns dans code modifié
- [ ] Corriger anti-patterns automatiquement
- [ ] Valider toutes les modifications
- [ ] Vérifier tests passent
- [ ] Vérifier types TypeScript
- [ ] Vérifier pas de régression
- [ ] Documenter apprentissages
- [ ] Identifier améliorations futures

## 🛠️ Détection et Correction Automatique Avancée

### 1. Détection Proactive des Problèmes

**Avant Modification:**
```typescript
async function prepareFileForModification(filePath: string): Promise<string> {
  // 1. Lire fichier
  const code = await read_file(filePath);
  
  // 2. Détecter anti-patterns
  const antiPatterns = await detectAntiPatterns(code);
  
  // 3. Détecter problèmes potentiels
  const potentialIssues = await detectPotentialIssues(code);
  
  // 4. Corriger automatiquement
  let fixedCode = code;
  for (const issue of [...antiPatterns, ...potentialIssues]) {
    if (issue.canAutoFix) {
      fixedCode = await autoFix(fixedCode, issue);
    }
  }
  
  // 5. Valider corrections
  const validation = await validateCode(fixedCode);
  if (validation.success) {
    return fixedCode;
  }
  
  // 6. Re-corriger si nécessaire
  return await prepareFileForModification(filePath);
}
```

### 2. Validation Continue Pendant Modification

**Pattern:**
```typescript
async function modifyWithValidation(
  code: string,
  modification: Modification
): Promise<string> {
  // 1. Appliquer modification
  let modifiedCode = applyModification(code, modification);
  
  // 2. Valider immédiatement
  let validation = await validateModification(modifiedCode);
  
  // 3. Boucle de correction jusqu'à validation réussie
  let attempts = 0;
  while (!validation.success && attempts < 3) {
    // Détecter problèmes
    const issues = await detectIssues(modifiedCode);
    
    // Corriger automatiquement
    modifiedCode = await autoFix(modifiedCode, issues);
    
    // Re-valider
    validation = await validateModification(modifiedCode);
    attempts++;
  }
  
  if (!validation.success) {
    // Documenter problèmes non auto-corrigeables
    await documentIssues(modifiedCode, validation.errors);
  }
  
  return modifiedCode;
}
```

### 3. Détection de Code Dupliqué Intelligent

**Pattern:**
```typescript
async function detectAndRefactorDuplication(code: string): Promise<string> {
  // 1. Identifier code dupliqué
  const duplications = await detectDuplications(code);
  
  // 2. Analyser patterns de duplication
  const patterns = analyzeDuplicationPatterns(duplications);
  
  // 3. Extraire logique commune
  for (const pattern of patterns) {
    if (pattern.canExtract) {
      code = await extractCommonLogic(code, pattern);
    }
  }
  
  // 4. Valider refactoring
  const validation = await validateCode(code);
  if (!validation.success) {
    // Re-corriger si nécessaire
    return await detectAndRefactorDuplication(code);
  }
  
  return code;
}
```

### 4. Optimisation Automatique des Imports

**Pattern:**
```typescript
async function optimizeImports(code: string): Promise<string> {
  // 1. Détecter imports inutilisés
  const unusedImports = await detectUnusedImports(code);
  
  // 2. Détecter imports manquants
  const missingImports = await detectMissingImports(code);
  
  // 3. Organiser imports selon conventions
  const organizedImports = organizeImports(code, {
    remove: unusedImports,
    add: missingImports
  });
  
  return organizedImports;
}
```

### 5. Validation Multi-Niveaux

**Pattern:**
```typescript
async function validateMultiLevel(code: string): Promise<ValidationResult> {
  // Niveau 1: Syntaxe TypeScript
  const syntaxValidation = await validateTypeScript(code);
  if (!syntaxValidation.success) {
    return syntaxValidation;
  }
  
  // Niveau 2: Conventions du projet
  const conventionValidation = await validateConventions(code);
  if (!conventionValidation.success) {
    return conventionValidation;
  }
  
  // Niveau 3: Patterns du projet
  const patternValidation = await validatePatterns(code);
  if (!patternValidation.success) {
    return patternValidation;
  }
  
  // Niveau 4: Tests
  const testValidation = await validateTests(code);
  if (!testValidation.success) {
    return testValidation;
  }
  
  return { success: true };
}
```

## 🔗 Références

### Documentation Essentielle
- `@.cursor/rules/agent-optimization.md` - Stratégies d'optimisation
- `@.cursor/rules/advanced-learning.md` - **NOUVEAU** Stratégies d'apprentissage avancées
- `@.cursor/rules/context-usage.md` - Utilisation optimale du contexte
- `@.cursor/rules/workflows.md` - Workflows détaillés
- `@.cursor/rules/troubleshooting.md` - Guide résolution problèmes

### Fichiers de Mémoire
- `@activeContext.md` - État actuel et focus
- `@systemPatterns.md` - Patterns architecturaux
- `@projectbrief.md` - Objectifs et périmètre

---

**Note:** Ces workflows autonomes permettent à l'agent Cursor de travailler de manière plus indépendante et efficace sur des runs plus longs.

