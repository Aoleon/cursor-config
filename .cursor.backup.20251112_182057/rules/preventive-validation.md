# Validation Préventive - Saxium

**Objectif:** Valider et analyser les impacts avant modification pour prévenir les erreurs et éviter les régressions.

## 🎯 Principe Fondamental

**IMPÉRATIF:** L'agent DOIT valider et analyser les impacts avant toute modification pour prévenir les erreurs et éviter les régressions.

**Bénéfices:**
- ✅ Préviens les erreurs avant qu'elles ne se produisent
- ✅ Évite les régressions
- ✅ Identifie les impacts potentiels
- ✅ Valide les dépendances avant modification
- ✅ Améliore la qualité du code

## 📋 Règles de Validation Préventive

### 1. Analyse d'Impact Avant Modification

**TOUJOURS:**
- ✅ Analyser les impacts potentiels avant modification
- ✅ Identifier les fichiers affectés
- ✅ Identifier les dépendances
- ✅ Identifier les risques potentiels
- ✅ Valider la faisabilité de la modification

**Pattern:**
```typescript
// Analyser impact avant modification
async function analyzeImpactBeforeModification(
  modification: Modification,
  context: Context
): Promise<ImpactAnalysis> {
  // 1. Identifier fichiers affectés
  const affectedFiles = await identifyAffectedFiles(modification, context);
  
  // 2. Analyser dépendances
  const dependencies = await analyzeDependencies(modification, affectedFiles);
  
  // 3. Identifier risques potentiels
  const risks = await identifyRisks(modification, dependencies);
  
  // 4. Valider faisabilité
  const feasibility = await validateFeasibility(modification, risks);
  
  // 5. Générer rapport d'impact
  return {
    affectedFiles: affectedFiles,
    dependencies: dependencies,
    risks: risks,
    feasibility: feasibility,
    recommendation: generateRecommendation(risks, feasibility)
  };
}
```

### 2. Validation des Dépendances Avant Modification

**TOUJOURS:**
- ✅ Valider toutes les dépendances avant modification
- ✅ Vérifier que les dépendances existent
- ✅ Vérifier que les dépendances sont compatibles
- ✅ Identifier les dépendances manquantes
- ✅ Valider les imports avant modification

**Pattern:**
```typescript
// Valider dépendances avant modification
async function validateDependenciesBeforeModification(
  modification: Modification,
  context: Context
): Promise<DependencyValidation> {
  // 1. Extraire dépendances de la modification
  const dependencies = extractDependencies(modification);
  
  // 2. Vérifier existence des dépendances
  const existenceCheck = await checkDependencyExistence(dependencies);
  
  // 3. Vérifier compatibilité des dépendances
  const compatibilityCheck = await checkDependencyCompatibility(dependencies);
  
  // 4. Identifier dépendances manquantes
  const missingDependencies = identifyMissingDependencies(
    dependencies,
    existenceCheck,
    compatibilityCheck
  );
  
  // 5. Valider imports
  const importValidation = await validateImports(modification, dependencies);
  
  return {
    dependencies: dependencies,
    existenceCheck: existenceCheck,
    compatibilityCheck: compatibilityCheck,
    missingDependencies: missingDependencies,
    importValidation: importValidation,
    valid: existenceCheck.allExist && compatibilityCheck.allCompatible && importValidation.valid
  };
}
```

### 3. Détection Proactive des Problèmes Potentiels

**TOUJOURS:**
- ✅ Détecter les problèmes potentiels avant modification
- ✅ Identifier les risques de régression
- ✅ Identifier les risques de performance
- ✅ Identifier les risques de sécurité
- ✅ Proposer solutions préventives

**Pattern:**
```typescript
// Détecter problèmes potentiels
async function detectPotentialProblems(
  modification: Modification,
  context: Context
): Promise<ProblemDetection> {
  // 1. Analyser modification pour problèmes potentiels
  const potentialProblems: PotentialProblem[] = [];
  
  // 2. Détecter risques de régression
  const regressionRisks = await detectRegressionRisks(modification, context);
  potentialProblems.push(...regressionRisks);
  
  // 3. Détecter risques de performance
  const performanceRisks = await detectPerformanceRisks(modification, context);
  potentialProblems.push(...performanceRisks);
  
  // 4. Détecter risques de sécurité
  const securityRisks = await detectSecurityRisks(modification, context);
  potentialProblems.push(...securityRisks);
  
  // 5. Détecter risques de type
  const typeRisks = await detectTypeRisks(modification, context);
  potentialProblems.push(...typeRisks);
  
  // 6. Trier par sévérité
  const sortedProblems = sortBySeverity(potentialProblems);
  
  // 7. Proposer solutions préventives
  const preventiveSolutions = await proposePreventiveSolutions(sortedProblems);
  
  return {
    problems: sortedProblems,
    solutions: preventiveSolutions,
    hasCriticalProblems: sortedProblems.some(p => p.severity === 'critical')
  };
}
```

### 4. Validation Préventive des Types

**TOUJOURS:**
- ✅ Valider les types avant modification
- ✅ Vérifier la compatibilité des types
- ✅ Identifier les risques de type
- ✅ Proposer corrections préventives

**Pattern:**
```typescript
// Valider types préventivement
async function validateTypesPreventively(
  modification: Modification,
  context: Context
): Promise<TypeValidation> {
  // 1. Extraire types de la modification
  const types = extractTypes(modification);
  
  // 2. Vérifier existence des types
  const existenceCheck = await checkTypeExistence(types, context);
  
  // 3. Vérifier compatibilité des types
  const compatibilityCheck = await checkTypeCompatibility(types, context);
  
  // 4. Identifier risques de type
  const typeRisks = identifyTypeRisks(types, existenceCheck, compatibilityCheck);
  
  // 5. Proposer corrections préventives
  const corrections = await proposeTypeCorrections(typeRisks);
  
  return {
    types: types,
    existenceCheck: existenceCheck,
    compatibilityCheck: compatibilityCheck,
    risks: typeRisks,
    corrections: corrections,
    valid: existenceCheck.allExist && compatibilityCheck.allCompatible
  };
}
```

### 5. Validation Préventive des Tests

**TOUJOURS:**
- ✅ Valider les tests avant modification
- ✅ Vérifier que les tests existent
- ✅ Vérifier que les tests sont à jour
- ✅ Identifier les tests à mettre à jour
- ✅ Proposer tests préventifs

**Pattern:**
```typescript
// Valider tests préventivement
async function validateTestsPreventively(
  modification: Modification,
  context: Context
): Promise<TestValidation> {
  // 1. Identifier tests affectés
  const affectedTests = await identifyAffectedTests(modification, context);
  
  // 2. Vérifier existence des tests
  const existenceCheck = await checkTestExistence(affectedTests);
  
  // 3. Vérifier que les tests sont à jour
  const upToDateCheck = await checkTestUpToDate(affectedTests, modification);
  
  // 4. Identifier tests à mettre à jour
  const testsToUpdate = identifyTestsToUpdate(affectedTests, upToDateCheck);
  
  // 5. Proposer tests préventifs
  const preventiveTests = await proposePreventiveTests(modification, context);
  
  return {
    affectedTests: affectedTests,
    existenceCheck: existenceCheck,
    upToDateCheck: upToDateCheck,
    testsToUpdate: testsToUpdate,
    preventiveTests: preventiveTests,
    valid: existenceCheck.allExist && upToDateCheck.allUpToDate
  };
}
```

## 🔄 Workflow de Validation Préventive

### Workflow: Valider Avant Modification

**Étapes:**
1. Analyser impact de la modification
2. Valider dépendances
3. Détecter problèmes potentiels
4. Valider types
5. Valider tests
6. Générer rapport de validation
7. Proposer solutions préventives
8. Appliquer corrections préventives
9. Procéder à la modification

**Pattern:**
```typescript
async function validateBeforeModification(
  modification: Modification,
  context: Context
): Promise<PreventiveValidationResult> {
  // 1. Analyser impact
  const impactAnalysis = await analyzeImpactBeforeModification(modification, context);
  
  // 2. Valider dépendances
  const dependencyValidation = await validateDependenciesBeforeModification(modification, context);
  
  // 3. Détecter problèmes potentiels
  const problemDetection = await detectPotentialProblems(modification, context);
  
  // 4. Valider types
  const typeValidation = await validateTypesPreventively(modification, context);
  
  // 5. Valider tests
  const testValidation = await validateTestsPreventively(modification, context);
  
  // 6. Générer rapport
  const report = generateValidationReport({
    impact: impactAnalysis,
    dependencies: dependencyValidation,
    problems: problemDetection,
    types: typeValidation,
    tests: testValidation
  });
  
  // 7. Si problèmes critiques détectés
  if (problemDetection.hasCriticalProblems || !dependencyValidation.valid || !typeValidation.valid) {
    // 8. Proposer solutions préventives
    const solutions = await proposePreventiveSolutions(report);
    
    return {
      valid: false,
      report: report,
      solutions: solutions,
      recommendation: 'apply-preventive-solutions'
    };
  }
  
  // 9. Si validation réussie, procéder
  return {
    valid: true,
    report: report,
    recommendation: 'proceed-with-modification'
  };
}
```

## ⚠️ Règles de Validation Préventive

### Ne Jamais:

**BLOQUANT:**
- ❌ Modifier sans analyser impact
- ❌ Modifier sans valider dépendances
- ❌ Ignorer problèmes potentiels
- ❌ Modifier sans valider types
- ❌ Modifier sans valider tests

**TOUJOURS:**
- ✅ Analyser impact avant modification
- ✅ Valider dépendances avant modification
- ✅ Détecter problèmes potentiels
- ✅ Valider types avant modification
- ✅ Valider tests avant modification
- ✅ Appliquer corrections préventives

## 📊 Checklist Validation Préventive

### Avant Modification

- [ ] Analyser impact de la modification
- [ ] Identifier fichiers affectés
- [ ] Identifier dépendances
- [ ] Valider dépendances
- [ ] Détecter problèmes potentiels
- [ ] Valider types
- [ ] Valider tests
- [ ] Générer rapport de validation
- [ ] Appliquer corrections préventives si nécessaire

### Pendant Modification

- [ ] Suivre validations préventives
- [ ] Appliquer corrections préventives
- [ ] Valider à chaque étape
- [ ] Documenter modifications

### Après Modification

- [ ] Valider que modifications respectent validations
- [ ] Vérifier que problèmes prévenus ne se sont pas produits
- [ ] Documenter validations préventives
- [ ] Mettre à jour validations si nécessaire

## 🔗 Références

- `@.cursor/rules/iterative-perfection.md` - Itération automatique jusqu'à perfection
- `@.cursor/rules/automated-testing-debugging.md` - Tests E2E et débogage automatisé
- `@.cursor/rules/core.md` - Règles fondamentales

---

**Note:** Cette règle garantit que l'agent valide et analyse les impacts avant toute modification, prévenant les erreurs et évitant les régressions.

