# Exécution Parallèle - Saxium

**Objectif:** Exécuter plusieurs opérations en parallèle pour améliorer les performances et réduire la latence.

## 🎯 Principe Fondamental

**IMPÉRATIF:** L'agent DOIT exécuter plusieurs opérations indépendantes en parallèle pour améliorer les performances et réduire la latence.

**Bénéfices:**
- ✅ Réduit la latence totale
- ✅ Améliore les performances de l'agent
- ✅ Optimise l'utilisation des ressources
- ✅ Accélère le développement
- ✅ Améliore l'expérience utilisateur

## 📋 Règles d'Exécution Parallèle

### 1. Parallélisation Automatique des Recherches

**TOUJOURS:**
- ✅ Exécuter plusieurs recherches en parallèle si indépendantes
- ✅ Paralléliser les recherches dans différents répertoires
- ✅ Paralléliser les recherches de différents types
- ✅ Optimiser le nombre de recherches parallèles

**Pattern:**
```typescript
// Paralléliser recherches automatiquement
async function parallelizeSearches(
  searches: SearchTask[],
  context: Context
): Promise<SearchResult[]> {
  // 1. Grouper recherches par dépendances
  const groups = groupSearchesByDependencies(searches);
  
  // 2. Exécuter groupes en parallèle
  const results: SearchResult[] = [];
  
  for (const group of groups) {
    // 3. Exécuter recherches du groupe en parallèle
    const groupResults = await Promise.all(
      group.map(search => executeSearch(search, context))
    );
    
    results.push(...groupResults);
  }
  
  return results;
}
```

### 2. Parallélisation Automatique des Lectures de Fichiers

**TOUJOURS:**
- ✅ Exécuter plusieurs lectures de fichiers en parallèle
- ✅ Paralléliser les lectures de fichiers indépendants
- ✅ Optimiser le nombre de lectures parallèles
- ✅ Gérer les erreurs de lecture en parallèle

**Pattern:**
```typescript
// Paralléliser lectures de fichiers automatiquement
async function parallelizeFileReads(
  files: string[],
  context: Context
): Promise<FileContent[]> {
  // 1. Filtrer fichiers valides
  const validFiles = await filterValidFiles(files);
  
  // 2. Grouper fichiers par taille (optimiser parallélisation)
  const groups = groupFilesBySize(validFiles);
  
  // 3. Exécuter lectures en parallèle par groupe
  const results: FileContent[] = [];
  
  for (const group of groups) {
    // 4. Exécuter lectures du groupe en parallèle
    const groupResults = await Promise.all(
      group.map(file => read_file(file).catch(error => ({
        file,
        error: error.message,
        content: null
      })))
    );
    
    results.push(...groupResults);
  }
  
  return results;
}
```

### 3. Parallélisation Automatique des Validations

**TOUJOURS:**
- ✅ Exécuter plusieurs validations en parallèle si indépendantes
- ✅ Paralléliser les validations de différents types
- ✅ Optimiser le nombre de validations parallèles
- ✅ Gérer les erreurs de validation en parallèle

**Pattern:**
```typescript
// Paralléliser validations automatiquement
async function parallelizeValidations(
  validations: ValidationTask[],
  context: Context
): Promise<ValidationResult[]> {
  // 1. Grouper validations par dépendances
  const groups = groupValidationsByDependencies(validations);
  
  // 2. Exécuter groupes en parallèle
  const results: ValidationResult[] = [];
  
  for (const group of groups) {
    // 3. Exécuter validations du groupe en parallèle
    const groupResults = await Promise.all(
      group.map(validation => executeValidation(validation, context))
    );
    
    results.push(...groupResults);
  }
  
  return results;
}
```

### 4. Parallélisation Automatique des Corrections

**TOUJOURS:**
- ✅ Exécuter plusieurs corrections en parallèle si indépendantes
- ✅ Paralléliser les corrections de différents types
- ✅ Optimiser le nombre de corrections parallèles
- ✅ Gérer les erreurs de correction en parallèle

**Pattern:**
```typescript
// Paralléliser corrections automatiquement
async function parallelizeCorrections(
  corrections: CorrectionTask[],
  context: Context
): Promise<CorrectionResult[]> {
  // 1. Grouper corrections par dépendances
  const groups = groupCorrectionsByDependencies(corrections);
  
  // 2. Exécuter groupes en parallèle
  const results: CorrectionResult[] = [];
  
  for (const group of groups) {
    // 3. Exécuter corrections du groupe en parallèle
    const groupResults = await Promise.all(
      group.map(correction => executeCorrection(correction, context))
    );
    
    results.push(...groupResults);
  }
  
  return results;
}
```

## 🔄 Workflow d'Exécution Parallèle

### Workflow: Exécuter Opérations en Parallèle

**Étapes:**
1. Analyser opérations pour dépendances
2. Grouper opérations indépendantes
3. Exécuter groupes en parallèle
4. Exécuter opérations du groupe en parallèle
5. Gérer erreurs en parallèle
6. Agréger résultats

**Pattern:**
```typescript
async function executeOperationsInParallel(
  operations: Operation[],
  context: Context
): Promise<OperationResult[]> {
  // 1. Analyser dépendances
  const dependencies = await analyzeDependencies(operations);
  
  // 2. Grouper opérations indépendantes
  const groups = groupOperationsByDependencies(operations, dependencies);
  
  // 3. Exécuter groupes séquentiellement (si dépendances)
  const results: OperationResult[] = [];
  
  for (const group of groups) {
    // 4. Exécuter opérations du groupe en parallèle
    const groupResults = await Promise.all(
      group.map(operation => executeOperation(operation, context))
    );
    
    results.push(...groupResults);
  }
  
  return results;
}
```

## ⚠️ Règles d'Exécution Parallèle

### Ne Jamais:

**BLOQUANT:**
- ❌ Paralléliser opérations avec dépendances
- ❌ Ignorer les limites de parallélisation
- ❌ Ne pas gérer les erreurs en parallèle
- ❌ Paralléliser opérations qui doivent être séquentielles

**TOUJOURS:**
- ✅ Paralléliser opérations indépendantes
- ✅ Respecter les limites de parallélisation
- ✅ Gérer les erreurs en parallèle
- ✅ Analyser dépendances avant parallélisation

## 📊 Checklist Exécution Parallèle

### Avant Parallélisation

- [ ] Analyser opérations pour dépendances
- [ ] Grouper opérations indépendantes
- [ ] Vérifier limites de parallélisation
- [ ] Planifier exécution parallèle

### Pendant Parallélisation

- [ ] Exécuter groupes en parallèle
- [ ] Exécuter opérations du groupe en parallèle
- [ ] Gérer erreurs en parallèle
- [ ] Surveiller performances

### Après Parallélisation

- [ ] Agréger résultats
- [ ] Valider résultats
- [ ] Documenter parallélisation

## 🔗 Références

- `@.cursor/rules/performance.md` - Optimisations performance
- `@.cursor/rules/auto-performance-detection.md` - Détection automatique des problèmes de performance
- `@.cursor/rules/context-optimization.md` - Gestion intelligente du contexte

---

**Note:** Cette règle garantit que l'agent exécute plusieurs opérations en parallèle pour améliorer les performances et réduire la latence.

