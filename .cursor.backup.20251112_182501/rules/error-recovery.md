# Récupération Automatique après Erreurs - Saxium

**Objectif:** Récupérer automatiquement après erreurs pour améliorer la robustesse et l'autonomie de l'agent.

## 🎯 Principe Fondamental

**IMPÉRATIF:** L'agent DOIT récupérer automatiquement après erreurs pour améliorer la robustesse et l'autonomie.

**Bénéfices:**
- ✅ Améliore la robustesse de l'agent
- ✅ Réduit les échecs non récupérés
- ✅ Améliore l'autonomie de l'agent
- ✅ Accélère le développement
- ✅ Améliore l'expérience utilisateur

## 📋 Règles de Récupération Automatique

### 1. Détection Automatique des Erreurs

**TOUJOURS:**
- ✅ Détecter automatiquement les erreurs
- ✅ Classifier les types d'erreurs
- ✅ Analyser la cause des erreurs
- ✅ Identifier les stratégies de récupération

**Pattern:**
```typescript
// Détecter erreurs automatiquement
async function detectErrors(
  error: Error,
  context: Context
): Promise<ErrorAnalysis> {
  // 1. Classifier type d'erreur
  const errorType = classifyError(error);
  
  // 2. Analyser cause de l'erreur
  const cause = analyzeErrorCause(error, context);
  
  // 3. Identifier stratégies de récupération
  const recoveryStrategies = identifyRecoveryStrategies(errorType, cause);
  
  // 4. Prioriser stratégies
  const prioritized = prioritizeRecoveryStrategies(recoveryStrategies);
  
  return {
    error: error,
    type: errorType,
    cause: cause,
    strategies: prioritized,
    recoverable: prioritized.length > 0
  };
}
```

### 2. Récupération Automatique selon Type d'Erreur

**TOUJOURS:**
- ✅ Récupérer automatiquement selon type d'erreur
- ✅ Appliquer stratégies de récupération appropriées
- ✅ Réessayer avec corrections
- ✅ Documenter récupération

**Types d'Erreurs et Stratégies:**
- **TypeScript Error** → Corriger types, réessayer
- **Test Failure** → Corriger code, réexécuter tests
- **Dependency Error** → Installer dépendances, réessayer
- **Timeout Error** → Augmenter timeout ou optimiser, réessayer
- **Network Error** → Retry avec backoff, réessayer
- **Validation Error** → Corriger validation, réessayer

**Pattern:**
```typescript
// Récupérer automatiquement selon type d'erreur
async function recoverFromError(
  errorAnalysis: ErrorAnalysis,
  context: Context
): Promise<RecoveryResult> {
  // 1. Sélectionner meilleure stratégie
  const strategy = selectBestRecoveryStrategy(errorAnalysis.strategies);
  
  // 2. Appliquer stratégie de récupération
  const recovery = await applyRecoveryStrategy(strategy, errorAnalysis, context);
  
  // 3. Valider récupération
  const validation = await validateRecovery(recovery, context);
  
  // 4. Si récupération réussie
  if (validation.success) {
    // 5. Réessayer opération
    const retry = await retryOperation(recovery, context);
    
    return {
      recovered: true,
      strategy: strategy,
      recovery: recovery,
      retry: retry,
      validation: validation
    };
  }
  
  // 6. Si récupération échouée, essayer stratégie suivante
  if (errorAnalysis.strategies.length > 1) {
    return await recoverFromError({
      ...errorAnalysis,
      strategies: errorAnalysis.strategies.slice(1)
    }, context);
  }
  
  return {
    recovered: false,
    strategy: null,
    recovery: null,
    retry: null,
    validation: validation
  };
}
```

### 3. Retry Intelligent avec Backoff

**TOUJOURS:**
- ✅ Réessayer automatiquement avec backoff exponentiel
- ✅ Limiter nombre de tentatives
- ✅ Adapter backoff selon type d'erreur
- ✅ Documenter tentatives

**Pattern:**
```typescript
// Retry intelligent avec backoff
async function retryWithBackoff(
  operation: () => Promise<Result>,
  maxAttempts: number = 3,
  context: Context
): Promise<Result> {
  let attempt = 0;
  let lastError: Error | null = null;
  
  while (attempt < maxAttempts) {
    try {
      // 1. Exécuter opération
      const result = await operation();
      
      // 2. Si succès, retourner résultat
      if (result.success) {
        return result;
      }
      
      // 3. Si échec, analyser erreur
      lastError = result.error;
      const errorAnalysis = await detectErrors(lastError, context);
      
      // 4. Si récupérable, récupérer
      if (errorAnalysis.recoverable) {
        const recovery = await recoverFromError(errorAnalysis, context);
        
        if (recovery.recovered) {
          // 5. Réessayer avec récupération
          attempt++;
          const backoff = calculateBackoff(attempt, errorAnalysis.type);
          await sleep(backoff);
          continue;
        }
      }
      
      // 6. Si non récupérable, arrêter
      break;
    } catch (error) {
      // 7. Analyser erreur
      lastError = error instanceof Error ? error : new Error(String(error));
      const errorAnalysis = await detectErrors(lastError, context);
      
      // 8. Si récupérable, récupérer et réessayer
      if (errorAnalysis.recoverable && attempt < maxAttempts - 1) {
        const recovery = await recoverFromError(errorAnalysis, context);
        
        if (recovery.recovered) {
          attempt++;
          const backoff = calculateBackoff(attempt, errorAnalysis.type);
          await sleep(backoff);
          continue;
        }
      }
      
      // 9. Si non récupérable ou max tentatives, arrêter
      break;
    }
  }
  
  // 10. Retourner échec final
  return {
    success: false,
    error: lastError,
    attempts: attempt + 1
  };
}
```

### 4. Apprentissage des Erreurs

**TOUJOURS:**
- ✅ Enregistrer erreurs et récupérations
- ✅ Analyser patterns d'erreurs
- ✅ Améliorer stratégies de récupération
- ✅ Éviter erreurs récurrentes

**Pattern:**
```typescript
// Apprendre des erreurs
async function learnFromErrors(
  error: Error,
  recovery: RecoveryResult,
  context: Context
): Promise<void> {
  // 1. Enregistrer erreur et récupération
  await recordError({
    error: error,
    recovery: recovery,
    timestamp: Date.now(),
    context: context
  });
  
  // 2. Analyser pattern d'erreur
  const pattern = analyzeErrorPattern(error, recovery);
  
  // 3. Mettre à jour stratégies de récupération
  if (recovery.recovered) {
    await improveRecoveryStrategy(pattern, recovery.strategy);
  } else {
    await documentUnrecoverableError(pattern, error);
  }
  
  // 4. Prévenir erreurs récurrentes
  await preventRecurringErrors(pattern, context);
}
```

## 🔄 Workflow de Récupération Automatique

### Workflow: Récupérer Automatiquement après Erreur

**Étapes:**
1. Détecter erreur
2. Classifier type d'erreur
3. Analyser cause de l'erreur
4. Identifier stratégies de récupération
5. Appliquer meilleure stratégie
6. Valider récupération
7. Réessayer opération
8. Apprendre de l'erreur

**Pattern:**
```typescript
async function handleErrorWithRecovery(
  error: Error,
  operation: () => Promise<Result>,
  context: Context
): Promise<Result> {
  // 1. Détecter erreur
  const errorAnalysis = await detectErrors(error, context);
  
  // 2. Si récupérable
  if (errorAnalysis.recoverable) {
    // 3. Récupérer
    const recovery = await recoverFromError(errorAnalysis, context);
    
    // 4. Si récupération réussie
    if (recovery.recovered) {
      // 5. Réessayer opération
      const retry = await retryWithBackoff(operation, 3, context);
      
      // 6. Apprendre de l'erreur
      await learnFromErrors(error, recovery, context);
      
      return retry;
    }
  }
  
  // 7. Si non récupérable, documenter et retourner échec
  await learnFromErrors(error, { recovered: false }, context);
  
  return {
    success: false,
    error: error,
    attempts: 1
  };
}
```

## ⚠️ Règles de Récupération Automatique

### Ne Jamais:

**BLOQUANT:**
- ❌ Ignorer les erreurs sans tentative de récupération
- ❌ Ne pas réessayer après récupération
- ❌ Ne pas apprendre des erreurs
- ❌ Ne pas documenter les erreurs

**TOUJOURS:**
- ✅ Détecter erreurs automatiquement
- ✅ Récupérer automatiquement si possible
- ✅ Réessayer avec corrections
- ✅ Apprendre des erreurs

## 📊 Checklist Récupération Automatique

### Avant Opération

- [ ] Préparer stratégies de récupération
- [ ] Configurer retry avec backoff
- [ ] Préparer validation de récupération

### Pendant Opération

- [ ] Détecter erreurs automatiquement
- [ ] Classifier type d'erreur
- [ ] Analyser cause de l'erreur
- [ ] Appliquer stratégie de récupération

### Après Erreur

- [ ] Valider récupération
- [ ] Réessayer opération
- [ ] Apprendre de l'erreur
- [ ] Documenter erreur et récupération

## 🔗 Références

- `@.cursor/rules/iterative-perfection.md` - Itération automatique jusqu'à perfection
- `@.cursor/rules/learning-memory.md` - Mémoire persistante des apprentissages
- `@.cursor/rules/core.md` - Règles fondamentales

---

**Note:** Cette règle garantit que l'agent récupère automatiquement après erreurs pour améliorer la robustesse et l'autonomie.

