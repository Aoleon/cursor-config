<!-- 
Context: refactoring, code-quality, duplication, optimization, patterns, maintainability
Priority: P1
Auto-load: when detecting code duplication, when optimizing code, when improving maintainability
Dependencies: core.md, quality-principles.md, code-quality.md, similar-code-detection.md
Score: 65
-->

# Auto-Refactoring Intelligent - Saxium

**Objectif:** Refactoriser automatiquement le code pour éliminer la duplication, appliquer les patterns établis et améliorer la maintenabilité.

**Référence:** [Cursor Rules Documentation](https://docs.cursor.com/context/rules)  
**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

## 🎯 Principe Fondamental

**IMPÉRATIF:** L'agent DOIT refactoriser automatiquement le code pour éliminer la duplication, appliquer les patterns établis et améliorer la maintenabilité.

**Bénéfices:**
- ✅ Élimination automatique de la duplication
- ✅ Application automatique des patterns
- ✅ Amélioration de la maintenabilité
- ✅ Optimisation continue du code

**Référence:** `@.cursor/rules/similar-code-detection.md` - Détection de code similaire  
**Référence:** `@.cursor/rules/code-quality.md` - Standards qualité code

## 📋 Règles d'Auto-Refactoring

### 1. Détection Automatique de Code Dupliqué

**TOUJOURS:**
- ✅ Détecter code dupliqué automatiquement
- ✅ Identifier similarités > 80%
- ✅ Grouper code similaire
- ✅ Proposer extraction en fonction commune

**Pattern:**
```typescript
// Détection automatique de code dupliqué
async function detectDuplicatedCode(
  codebase: string[],
  context: Context
): Promise<Duplication[]> {
  const duplications: Duplication[] = [];
  
  // 1. Comparer tous les fichiers deux à deux
  for (let i = 0; i < codebase.length; i++) {
    for (let j = i + 1; j < codebase.length; j++) {
      const similarity = await calculateSimilarity(
        codebase[i],
        codebase[j]
      );
      
      if (similarity > 0.8) {
        duplications.push({
          file1: codebase[i],
          file2: codebase[j],
          similarity,
          commonCode: extractCommonCode(codebase[i], codebase[j]),
          recommendation: 'extract-common-function'
        });
      }
    }
  }
  
  // 2. Détecter duplication dans même fichier
  codebase.forEach(file => {
    const internalDuplications = detectInternalDuplications(file);
    internalDuplications.forEach(dup => {
      duplications.push({
        file1: file,
        file2: file,
        similarity: dup.similarity,
        commonCode: dup.commonCode,
        recommendation: 'extract-common-function'
      });
    });
  });
  
  return duplications;
}
```

### 2. Extraction Automatique de Fonctions Communes

**TOUJOURS:**
- ✅ Extraire code dupliqué en fonction commune
- ✅ Générer fonction réutilisable
- ✅ Remplacer duplications par appels fonction
- ✅ Valider refactoring effectué

**Pattern:**
```typescript
// Extraction automatique de fonctions communes
async function extractCommonFunction(
  duplication: Duplication,
  context: Context
): Promise<RefactoringResult> {
  // 1. Analyser code commun
  const commonCode = duplication.commonCode;
  const functionName = generateFunctionName(commonCode, context);
  
  // 2. Générer fonction commune
  const commonFunction = generateCommonFunction(
    commonCode,
    functionName,
    context
  );
  
  // 3. Remplacer duplications par appels
  const refactoredFiles = await Promise.all([
    replaceWithFunctionCall(duplication.file1, commonCode, functionName),
    replaceWithFunctionCall(duplication.file2, commonCode, functionName)
  ]);
  
  // 4. Créer fichier utilitaire si nécessaire
  const utilityFile = await createUtilityFile(
    commonFunction,
    context
  );
  
  // 5. Valider refactoring
  const validation = await validateRefactoring(
    refactoredFiles,
    utilityFile,
    context
  );
  
  return {
    success: validation.valid,
    refactoredFiles,
    utilityFile,
    functionName,
    eliminatedLines: calculateEliminatedLines(duplication)
  };
}
```

### 3. Application Automatique de Patterns Établis

**TOUJOURS:**
- ✅ Détecter code ne suivant pas patterns établis
- ✅ Appliquer patterns automatiquement
- ✅ Valider application de patterns
- ✅ Documenter patterns appliqués

**Pattern:**
```typescript
// Application automatique de patterns
async function applyEstablishedPatterns(
  code: string,
  filePath: string,
  context: Context
): Promise<PatternApplication> {
  // 1. Charger patterns établis du projet
  const establishedPatterns = await loadEstablishedPatterns(context);
  
  // 2. Détecter code ne suivant pas patterns
  const violations = await detectPatternViolations(
    code,
    establishedPatterns,
    context
  );
  
  // 3. Appliquer patterns automatiquement
  let refactoredCode = code;
  const appliedPatterns: string[] = [];
  
  for (const violation of violations) {
    const pattern = establishedPatterns.find(
      p => p.id === violation.patternId
    );
    
    if (pattern && pattern.canAutoApply) {
      refactoredCode = await applyPattern(
        refactoredCode,
        pattern,
        violation.location
      );
      appliedPatterns.push(pattern.name);
    }
  }
  
  // 4. Valider application
  const validation = await validatePatternApplication(
    refactoredCode,
    appliedPatterns,
    context
  );
  
  return {
    success: validation.valid,
    code: refactoredCode,
    appliedPatterns,
    violations: violations.length - appliedPatterns.length
  };
}
```

### 4. Simplification Automatique de Code Complexe

**TOUJOURS:**
- ✅ Détecter code complexe (cyclomatic complexity > 10)
- ✅ Simplifier automatiquement si possible
- ✅ Extraire fonctions pour réduire complexité
- ✅ Valider simplification

**Pattern:**
```typescript
// Simplification automatique
async function simplifyComplexCode(
  code: string,
  filePath: string,
  context: Context
): Promise<SimplificationResult> {
  // 1. Analyser complexité
  const complexity = analyzeComplexity(code);
  
  // 2. Si complexité acceptable, pas besoin de simplification
  if (complexity.cyclomatic <= 10) {
    return {
      simplified: false,
      code,
      complexity: complexity.cyclomatic
    };
  }
  
  // 3. Identifier parties à simplifier
  const partsToSimplify = identifyComplexParts(code, complexity);
  
  // 4. Simplifier chaque partie
  let simplifiedCode = code;
  const extractedFunctions: string[] = [];
  
  for (const part of partsToSimplify) {
    const simplified = await simplifyPart(part, context);
    simplifiedCode = replacePart(simplifiedCode, part, simplified);
    if (simplified.extractedFunction) {
      extractedFunctions.push(simplified.extractedFunction);
    }
  }
  
  // 5. Valider simplification
  const newComplexity = analyzeComplexity(simplifiedCode);
  const validation = await validateSimplification(
    simplifiedCode,
    complexity,
    newComplexity,
    context
  );
  
  return {
    simplified: validation.valid,
    code: simplifiedCode,
    complexity: newComplexity.cyclomatic,
    extractedFunctions,
    reduction: complexity.cyclomatic - newComplexity.cyclomatic
  };
}
```

### 5. Optimisation Automatique des Imports

**TOUJOURS:**
- ✅ Détecter imports inutilisés
- ✅ Détecter imports dupliqués
- ✅ Organiser imports selon conventions
- ✅ Optimiser imports automatiquement

**Pattern:**
```typescript
// Optimisation automatique des imports
async function optimizeImports(
  code: string,
  filePath: string,
  context: Context
): Promise<ImportOptimization> {
  // 1. Analyser imports
  const imports = analyzeImports(code);
  
  // 2. Détecter imports inutilisés
  const unused = detectUnusedImports(imports, code);
  
  // 3. Détecter imports dupliqués
  const duplicates = detectDuplicateImports(imports);
  
  // 4. Organiser imports selon conventions
  const organized = organizeImports(imports, context);
  
  // 5. Générer code optimisé
  const optimizedCode = generateOptimizedCode(
    code,
    organized,
    unused,
    duplicates
  );
  
  return {
    optimized: true,
    code: optimizedCode,
    removedUnused: unused.length,
    removedDuplicates: duplicates.length,
    organized: true
  };
}
```

## 🔄 Workflow d'Auto-Refactoring

### Workflow: Refactoriser Automatiquement

**Étapes:**
1. Détecter code dupliqué
2. Extraire fonctions communes
3. Appliquer patterns établis
4. Simplifier code complexe
5. Optimiser imports
6. Valider refactoring complet

**Pattern:**
```typescript
async function autoRefactor(
  code: string,
  filePath: string,
  context: Context
): Promise<AutoRefactoringResult> {
  let refactoredCode = code;
  const refactorings: Refactoring[] = [];
  
  // 1. Détecter et éliminer duplication
  const duplications = await detectDuplicatedCode([code], context);
  for (const dup of duplications) {
    const result = await extractCommonFunction(dup, context);
    if (result.success) {
      refactoredCode = result.refactoredFiles[0];
      refactorings.push({
        type: 'extract-common-function',
        description: `Extraction de ${result.functionName}`,
        eliminatedLines: result.eliminatedLines
      });
    }
  }
  
  // 2. Appliquer patterns établis
  const patterns = await applyEstablishedPatterns(refactoredCode, filePath, context);
  if (patterns.success) {
    refactoredCode = patterns.code;
    refactorings.push({
      type: 'apply-patterns',
      description: `Application de ${patterns.appliedPatterns.join(', ')}`,
      eliminatedLines: 0
    });
  }
  
  // 3. Simplifier code complexe
  const simplification = await simplifyComplexCode(refactoredCode, filePath, context);
  if (simplification.simplified) {
    refactoredCode = simplification.code;
    refactorings.push({
      type: 'simplify-complexity',
      description: `Réduction complexité de ${simplification.reduction}`,
      eliminatedLines: 0
    });
  }
  
  // 4. Optimiser imports
  const imports = await optimizeImports(refactoredCode, filePath, context);
  if (imports.optimized) {
    refactoredCode = imports.code;
    refactorings.push({
      type: 'optimize-imports',
      description: `Suppression de ${imports.removedUnused} imports inutilisés`,
      eliminatedLines: imports.removedUnused
    });
  }
  
  return {
    success: true,
    code: refactoredCode,
    refactorings,
    totalEliminatedLines: refactorings.reduce((sum, r) => sum + r.eliminatedLines, 0)
  };
}
```

## ⚠️ Règles d'Auto-Refactoring

### Ne Jamais:

**BLOQUANT:**
- ❌ Refactoriser sans validation
- ❌ Ignorer code dupliqué détecté
- ❌ Ne pas appliquer patterns établis
- ❌ Ne pas simplifier code complexe

**TOUJOURS:**
- ✅ Détecter code dupliqué automatiquement
- ✅ Extraire fonctions communes
- ✅ Appliquer patterns établis
- ✅ Simplifier code complexe
- ✅ Optimiser imports
- ✅ Valider refactoring complet

## 📊 Checklist Auto-Refactoring

### Avant Refactoring

- [ ] Détecter code dupliqué
- [ ] Identifier patterns à appliquer
- [ ] Analyser complexité du code

### Pendant Refactoring

- [ ] Extraire fonctions communes
- [ ] Appliquer patterns établis
- [ ] Simplifier code complexe
- [ ] Optimiser imports

### Après Refactoring

- [ ] Valider refactoring complet
- [ ] Vérifier tests passent
- [ ] Documenter refactorings effectués

## 🔗 Références

- `@.cursor/rules/similar-code-detection.md` - Détection de code similaire
- `@.cursor/rules/code-quality.md` - Standards qualité code
- `@.cursor/rules/patterns.md` - Patterns établis du projet

---

**Note:** Cette règle garantit que le code est refactorisé automatiquement pour éliminer la duplication, appliquer les patterns et améliorer la maintenabilité.

**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

