<!-- 
Context: validation, pipeline, cascade, early-detection, error-prevention, quality
Priority: P1
Auto-load: when validating code, when preventing errors, when ensuring quality
Dependencies: core.md, quality-principles.md, code-quality.md, preventive-validation.md
Score: 75
-->

# Pipeline de Validation en Cascade - Saxium

**Objectif:** Valider progressivement le code avec un pipeline en cascade pour détecter les erreurs tôt et optimiser la validation.

**Référence:** [Cursor Rules Documentation](https://docs.cursor.com/context/rules)  
**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

## 🎯 Principe Fondamental

**IMPÉRATIF:** L'agent DOIT valider progressivement le code avec un pipeline en cascade pour détecter les erreurs tôt et optimiser la validation.

**Bénéfices:**
- ✅ Détection précoce des erreurs
- ✅ Optimisation de la validation
- ✅ Réduction du temps de validation
- ✅ Amélioration de la qualité

**Référence:** `@.cursor/rules/preventive-validation.md` - Validation préventive  
**Référence:** `@.cursor/rules/code-quality.md` - Standards qualité code

## 📋 Règles de Pipeline de Validation

### 1. Validation Syntaxique (Niveau 1)

**TOUJOURS:**
- ✅ Valider syntaxe en premier (rapide)
- ✅ Arrêter si erreur syntaxique
- ✅ Corriger automatiquement si possible
- ✅ Continuer seulement si syntaxe valide

**Pattern:**
```typescript
// Validation syntaxique
async function validateSyntax(
  code: string,
  filePath: string
): Promise<SyntaxValidation> {
  // 1. Vérifier syntaxe TypeScript/JavaScript
  const syntaxErrors = await checkSyntax(code, filePath);
  
  if (syntaxErrors.length > 0) {
    // 2. Tenter correction automatique
    const autoFixed = await autoFixSyntax(code, syntaxErrors);
    
    if (autoFixed.fixed) {
      return {
        valid: true,
        code: autoFixed.code,
        errors: [],
        warnings: autoFixed.warnings,
        level: 'syntax',
        fixed: true
      };
    }
    
    return {
      valid: false,
      code,
      errors: syntaxErrors,
      warnings: [],
      level: 'syntax',
      fixed: false
    };
  }
  
  return {
    valid: true,
    code,
    errors: [],
    warnings: [],
    level: 'syntax',
    fixed: false
  };
}
```

### 2. Validation Sémantique (Niveau 2)

**TOUJOURS:**
- ✅ Valider sémantique après syntaxe
- ✅ Vérifier types et interfaces
- ✅ Vérifier imports et dépendances
- ✅ Arrêter si erreur sémantique critique

**Pattern:**
```typescript
// Validation sémantique
async function validateSemantics(
  code: string,
  filePath: string,
  context: Context
): Promise<SemanticValidation> {
  // 1. Vérifier types TypeScript
  const typeErrors = await checkTypes(code, filePath);
  
  // 2. Vérifier imports et dépendances
  const importErrors = await checkImports(code, filePath, context);
  
  // 3. Vérifier interfaces et signatures
  const interfaceErrors = await checkInterfaces(code, filePath);
  
  const allErrors = [...typeErrors, ...importErrors, ...interfaceErrors];
  
  if (allErrors.length > 0) {
    // Tenter correction automatique
    const autoFixed = await autoFixSemantics(code, allErrors, context);
    
    if (autoFixed.fixed) {
      return {
        valid: true,
        code: autoFixed.code,
        errors: [],
        warnings: autoFixed.warnings,
        level: 'semantic',
        fixed: true
      };
    }
    
    return {
      valid: false,
      code,
      errors: allErrors,
      warnings: [],
      level: 'semantic',
      fixed: false
    };
  }
  
  return {
    valid: true,
    code,
    errors: [],
    warnings: [],
    level: 'semantic',
    fixed: false
  };
}
```

### 3. Validation Logique (Niveau 3)

**TOUJOURS:**
- ✅ Valider logique après sémantique
- ✅ Vérifier cohérence logique
- ✅ Vérifier patterns et conventions
- ✅ Arrêter si erreur logique critique

**Pattern:**
```typescript
// Validation logique
async function validateLogic(
  code: string,
  filePath: string,
  context: Context
): Promise<LogicValidation> {
  // 1. Vérifier cohérence logique
  const logicErrors = await checkLogicConsistency(code, filePath);
  
  // 2. Vérifier patterns et conventions
  const patternErrors = await checkPatterns(code, filePath, context);
  
  // 3. Vérifier anti-patterns
  const antiPatternErrors = await checkAntiPatterns(code, filePath, context);
  
  const allErrors = [...logicErrors, ...patternErrors, ...antiPatternErrors];
  
  if (allErrors.length > 0) {
    // Tenter correction automatique
    const autoFixed = await autoFixLogic(code, allErrors, context);
    
    if (autoFixed.fixed) {
      return {
        valid: true,
        code: autoFixed.code,
        errors: [],
        warnings: autoFixed.warnings,
        level: 'logic',
        fixed: true
      };
    }
    
    return {
      valid: false,
      code,
      errors: allErrors,
      warnings: [],
      level: 'logic',
      fixed: false
    };
  }
  
  return {
    valid: true,
    code,
    errors: [],
    warnings: [],
    level: 'logic',
    fixed: false
  };
}
```

### 4. Validation en Cascade avec Arrêt Précoce

**TOUJOURS:**
- ✅ Valider niveau par niveau
- ✅ Arrêter à la première erreur critique
- ✅ Continuer seulement si niveau valide
- ✅ Optimiser temps de validation

**Pattern:**
```typescript
// Validation en cascade
async function validateInCascade(
  code: string,
  filePath: string,
  context: Context
): Promise<CascadeValidation> {
  const results: ValidationResult[] = [];
  
  // 1. Validation syntaxique (Niveau 1)
  const syntaxResult = await validateSyntax(code, filePath);
  results.push(syntaxResult);
  
  if (!syntaxResult.valid) {
    return {
      valid: false,
      results,
      stoppedAt: 'syntax',
      code: syntaxResult.code,
      canContinue: syntaxResult.fixed
    };
  }
  
  // 2. Validation sémantique (Niveau 2)
  const semanticResult = await validateSemantics(
    syntaxResult.code,
    filePath,
    context
  );
  results.push(semanticResult);
  
  if (!semanticResult.valid) {
    return {
      valid: false,
      results,
      stoppedAt: 'semantic',
      code: semanticResult.code,
      canContinue: semanticResult.fixed
    };
  }
  
  // 3. Validation logique (Niveau 3)
  const logicResult = await validateLogic(
    semanticResult.code,
    filePath,
    context
  );
  results.push(logicResult);
  
  if (!logicResult.valid) {
    return {
      valid: false,
      results,
      stoppedAt: 'logic',
      code: logicResult.code,
      canContinue: logicResult.fixed
    };
  }
  
  return {
    valid: true,
    results,
    stoppedAt: null,
    code: logicResult.code,
    canContinue: true
  };
}
```

### 5. Validation Parallèle des Parties Indépendantes

**TOUJOURS:**
- ✅ Identifier parties indépendantes
- ✅ Valider parties indépendantes en parallèle
- ✅ Combiner résultats de validation
- ✅ Optimiser temps de validation

**Pattern:**
```typescript
// Validation parallèle
async function validateInParallel(
  code: string,
  filePath: string,
  context: Context
): Promise<ParallelValidation> {
  // 1. Identifier parties indépendantes
  const independentParts = identifyIndependentParts(code);
  
  // 2. Valider chaque partie en parallèle
  const validationResults = await Promise.all(
    independentParts.map(part => 
      validateInCascade(part.code, `${filePath}:${part.range}`, context)
    )
  );
  
  // 3. Combiner résultats
  const combined = combineValidationResults(validationResults);
  
  return {
    valid: combined.valid,
    results: validationResults,
    combined,
    optimized: true
  };
}
```

### 6. Cache des Validations Réussies

**TOUJOURS:**
- ✅ Mettre en cache validations réussies
- ✅ Réutiliser cache pour code identique
- ✅ Invalider cache si code modifié
- ✅ Optimiser validations répétitives

**Pattern:**
```typescript
// Cache des validations
async function validateWithCache(
  code: string,
  filePath: string,
  context: Context
): Promise<CachedValidation> {
  // 1. Générer clé de cache
  const cacheKey = generateValidationCacheKey(code, filePath);
  
  // 2. Vérifier cache
  const cached = await getCachedValidation(cacheKey);
  if (cached && !isCacheExpired(cached)) {
    logger.info('Cache hit pour validation', {
      metadata: { filePath, cacheKey }
    });
    return {
      ...cached,
      fromCache: true
    };
  }
  
  // 3. Valider code
  const validation = await validateInCascade(code, filePath, context);
  
  // 4. Mettre en cache si valide
  if (validation.valid) {
    await cacheValidation(cacheKey, validation, context);
  }
  
  return {
    ...validation,
    fromCache: false
  };
}
```

## 🔄 Workflow de Pipeline de Validation

### Workflow: Valider en Cascade

**Étapes:**
1. Valider syntaxe (Niveau 1)
2. Si valide, valider sémantique (Niveau 2)
3. Si valide, valider logique (Niveau 3)
4. Arrêter à la première erreur critique
5. Tenter correction automatique si possible
6. Continuer seulement si correction réussie

**Pattern:**
```typescript
async function validateCodeWithPipeline(
  code: string,
  filePath: string,
  context: Context
): Promise<PipelineValidation> {
  // 1. Vérifier cache
  const cached = await validateWithCache(code, filePath, context);
  if (cached.fromCache) {
    return cached;
  }
  
  // 2. Valider en cascade
  const cascade = await validateInCascade(code, filePath, context);
  
  // 3. Si erreur, tenter correction et re-valider
  if (!cascade.valid && cascade.canContinue) {
    const corrected = await autoCorrectCode(
      cascade.code,
      cascade.results[cascade.results.length - 1].errors,
      context
    );
    
    // Re-valider code corrigé
    return await validateInCascade(corrected, filePath, context);
  }
  
  return cascade;
}
```

## ⚠️ Règles de Pipeline de Validation

### Ne Jamais:

**BLOQUANT:**
- ❌ Valider tous les niveaux si erreur critique au niveau 1
- ❌ Ignorer erreurs syntaxiques
- ❌ Ne pas tenter correction automatique
- ❌ Ne pas utiliser cache pour validations répétitives

**TOUJOURS:**
- ✅ Valider niveau par niveau en cascade
- ✅ Arrêter à la première erreur critique
- ✅ Tenter correction automatique si possible
- ✅ Utiliser cache pour validations réussies
- ✅ Valider parties indépendantes en parallèle

## 📊 Checklist Pipeline de Validation

### Avant Validation

- [ ] Vérifier cache pour code identique
- [ ] Préparer pipeline de validation
- [ ] Configurer correction automatique

### Pendant Validation

- [ ] Valider syntaxe (Niveau 1)
- [ ] Si valide, valider sémantique (Niveau 2)
- [ ] Si valide, valider logique (Niveau 3)
- [ ] Arrêter à la première erreur critique
- [ ] Tenter correction automatique si possible

### Après Validation

- [ ] Mettre en cache si validation réussie
- [ ] Documenter erreurs détectées
- [ ] Documenter corrections appliquées

## 🔗 Références

- `@.cursor/rules/preventive-validation.md` - Validation préventive
- `@.cursor/rules/code-quality.md` - Standards qualité code
- `@.cursor/rules/error-recovery.md` - Récupération automatique après erreurs

---

**Note:** Cette règle garantit que le code est validé progressivement avec un pipeline en cascade pour détecter les erreurs tôt et optimiser la validation.

**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

