<!-- 
Context: timeout, long-operations, error-handling, resilience, checkpoints, retry
Priority: P1
Auto-load: when operations are long-running, when timeouts are detected, when optimizing resilience
Dependencies: core.md, quality-principles.md, error-recovery.md, task-decomposition.md
Description: "Gestion intelligente des timeouts avec décomposition automatique, checkpoints et retry avec backoff"
Tags: timeout, resilience, checkpoints, retry, long-operations
Score: 70
-->

# Gestion Intelligente des Timeouts - Saxium

**Objectif:** Gérer intelligemment les timeouts en détectant les opérations longues, en décomposant automatiquement les tâches, et en implémentant des checkpoints pour reprise.

**Référence:** [Cursor Rules Documentation](https://docs.cursor.com/context/rules)  
**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

## 🎯 Principe Fondamental

**IMPÉRATIF:** L'agent DOIT gérer intelligemment les timeouts en détectant les opérations longues, en décomposant automatiquement les tâches, et en implémentant des checkpoints pour reprise.

**Bénéfices:**
- ✅ Réduction des échecs dus aux timeouts
- ✅ Amélioration de la robustesse
- ✅ Reprise automatique après timeout
- ✅ Optimisation des opérations longues

**Référence:** `@.cursor/rules/error-recovery.md` - Récupération automatique après erreurs  
**Référence:** `@.cursor/rules/task-decomposition.md` - Décomposition des tâches

## 📋 Règles de Gestion des Timeouts

### 1. Détection Proactive des Opérations Longues

**TOUJOURS:**
- ✅ Estimer durée des opérations avant exécution
- ✅ Détecter opérations qui risquent de timeout
- ✅ Décomposer automatiquement si timeout probable
- ✅ Alerter si opération longue détectée

**Pattern:**
```typescript
// Détection proactive des opérations longues
interface OperationEstimate {
  operation: string;
  estimatedDuration: number; // en millisecondes
  timeoutRisk: 'low' | 'medium' | 'high';
  recommendedAction: 'proceed' | 'decompose' | 'optimize';
}

async function detectLongOperations(
  operation: Operation,
  context: Context
): Promise<OperationEstimate> {
  // 1. Estimer durée basée sur historique
  const estimatedDuration = await estimateDuration(operation, context);
  
  // 2. Comparer avec timeout configuré
  const timeout = getTimeoutForOperation(operation);
  const timeoutRisk = calculateTimeoutRisk(estimatedDuration, timeout);
  
  // 3. Recommander action
  let recommendedAction: 'proceed' | 'decompose' | 'optimize';
  if (timeoutRisk === 'high') {
    recommendedAction = 'decompose';
  } else if (timeoutRisk === 'medium') {
    recommendedAction = 'optimize';
  } else {
    recommendedAction = 'proceed';
  }
  
  return {
    operation: operation.id,
    estimatedDuration,
    timeoutRisk,
    recommendedAction
  };
}
```

### 2. Décomposition Automatique si Timeout Probable

**TOUJOURS:**
- ✅ Décomposer opérations longues en sous-opérations
- ✅ Exécuter sous-opérations séquentiellement avec checkpoints
- ✅ Valider chaque sous-opération avant de continuer
- ✅ Reprendre depuis dernier checkpoint si timeout

**Pattern:**
```typescript
// Décomposition automatique si timeout probable
async function executeWithTimeoutProtection(
  operation: Operation,
  context: Context
): Promise<OperationResult> {
  // 1. Détecter si opération longue
  const estimate = await detectLongOperations(operation, context);
  
  // 2. Si risque de timeout élevé, décomposer
  if (estimate.timeoutRisk === 'high' || estimate.recommendedAction === 'decompose') {
    return await executeDecomposed(operation, context);
  }
  
  // 3. Si risque moyen, optimiser
  if (estimate.timeoutRisk === 'medium' || estimate.recommendedAction === 'optimize') {
    const optimized = await optimizeOperation(operation, context);
    return await executeWithCheckpoints(optimized, context);
  }
  
  // 4. Sinon, exécuter normalement
  return await executeOperation(operation, context);
}

async function executeDecomposed(
  operation: Operation,
  context: Context
): Promise<OperationResult> {
  // 1. Décomposer en sous-opérations
  const subtasks = await decomposeOperation(operation, context);
  
  // 2. Exécuter avec checkpoints
  const results: OperationResult[] = [];
  for (const subtask of subtasks) {
    try {
      const result = await executeWithCheckpoint(subtask, context);
      results.push(result);
      
      // 3. Sauvegarder checkpoint
      await saveCheckpoint(operation.id, subtask.id, result, context);
    } catch (error) {
      if (isTimeoutError(error)) {
        // 4. Reprendre depuis dernier checkpoint
        const lastCheckpoint = await loadLastCheckpoint(operation.id, context);
        return await resumeFromCheckpoint(operation, lastCheckpoint, context);
      }
      throw error;
    }
  }
  
  return combineResults(results);
}
```

### 3. Checkpoints pour Reprise

**TOUJOURS:**
- ✅ Créer checkpoints réguliers pour opérations longues
- ✅ Sauvegarder état à chaque checkpoint
- ✅ Reprendre depuis dernier checkpoint si timeout
- ✅ Valider état avant reprise

**Pattern:**
```typescript
// Checkpoints pour reprise
interface Checkpoint {
  operationId: string;
  subtaskId: string;
  state: OperationState;
  timestamp: number;
  progress: number; // 0-100
}

async function executeWithCheckpoints(
  operation: Operation,
  context: Context
): Promise<OperationResult> {
  const checkpoints: Checkpoint[] = [];
  const checkpointInterval = 30000; // 30 secondes
  let lastCheckpoint = Date.now();
  
  try {
    const result = await executeOperationWithProgress(
      operation,
      (progress, state) => {
        // Créer checkpoint si interval écoulé
        if (Date.now() - lastCheckpoint > checkpointInterval) {
          const checkpoint: Checkpoint = {
            operationId: operation.id,
            subtaskId: operation.currentSubtask?.id || 'main',
            state,
            timestamp: Date.now(),
            progress
          };
          checkpoints.push(checkpoint);
          saveCheckpoint(checkpoint, context);
          lastCheckpoint = Date.now();
        }
      },
      context
    );
    
    return result;
  } catch (error) {
    if (isTimeoutError(error)) {
      // Reprendre depuis dernier checkpoint
      const lastCheckpoint = checkpoints[checkpoints.length - 1];
      if (lastCheckpoint) {
        logger.info('Reprise depuis checkpoint', {
          metadata: {
            operationId: operation.id,
            checkpoint: lastCheckpoint.subtaskId,
            progress: lastCheckpoint.progress
          }
        });
        return await resumeFromCheckpoint(operation, lastCheckpoint, context);
      }
    }
    throw error;
  }
}
```

### 4. Retry avec Backoff Exponentiel

**TOUJOURS:**
- ✅ Réessayer après timeout avec backoff exponentiel
- ✅ Augmenter timeout progressivement
- ✅ Limiter nombre de tentatives
- ✅ Documenter tentatives

**Pattern:**
```typescript
// Retry avec backoff exponentiel
async function executeWithRetry(
  operation: Operation,
  context: Context,
  maxAttempts: number = 3
): Promise<OperationResult> {
  let attempt = 0;
  let baseTimeout = getBaseTimeout(operation);
  
  while (attempt < maxAttempts) {
    try {
      // 1. Calculer timeout avec backoff exponentiel
      const timeout = baseTimeout * Math.pow(2, attempt);
      
      // 2. Exécuter avec timeout augmenté
      const result = await executeWithTimeout(operation, timeout, context);
      return result;
    } catch (error) {
      if (isTimeoutError(error) && attempt < maxAttempts - 1) {
        attempt++;
        logger.warn('Timeout, nouvelle tentative', {
          metadata: {
            operationId: operation.id,
            attempt,
            timeout: baseTimeout * Math.pow(2, attempt)
          }
        });
        
        // 3. Attendre avant retry (backoff)
        await sleep(Math.pow(2, attempt) * 1000);
      } else {
        throw error;
      }
    }
  }
  
  throw new Error('Max attempts reached');
}
```

### 5. Estimation du Temps Restant

**TOUJOURS:**
- ✅ Estimer temps restant pour opérations longues
- ✅ Afficher progression et temps restant
- ✅ Ajuster estimation selon progression réelle
- ✅ Alerter si temps restant > timeout

**Pattern:**
```typescript
// Estimation du temps restant
interface TimeEstimate {
  elapsed: number;
  remaining: number;
  progress: number; // 0-100
  estimatedCompletion: Date;
}

async function estimateRemainingTime(
  operation: Operation,
  startTime: number,
  progress: number,
  context: Context
): Promise<TimeEstimate> {
  // 1. Calculer temps écoulé
  const elapsed = Date.now() - startTime;
  
  // 2. Estimer temps total basé sur progression
  const estimatedTotal = progress > 0 
    ? (elapsed / progress) * 100
    : await estimateTotalDuration(operation, context);
  
  // 3. Calculer temps restant
  const remaining = estimatedTotal - elapsed;
  
  // 4. Vérifier si temps restant > timeout
  const timeout = getTimeoutForOperation(operation);
  if (remaining > timeout) {
    logger.warn('Temps restant estimé > timeout', {
      metadata: {
        operationId: operation.id,
        remaining,
        timeout,
        progress
      }
    });
  }
  
  return {
    elapsed,
    remaining: Math.max(0, remaining),
    progress,
    estimatedCompletion: new Date(Date.now() + remaining)
  };
}
```

## 🔄 Workflow de Gestion des Timeouts

### Workflow: Gérer Timeouts Intelligemment

**Étapes:**
1. Détecter opérations longues avant exécution
2. Décomposer si timeout probable
3. Exécuter avec checkpoints réguliers
4. Estimer temps restant
5. Reprendre depuis checkpoint si timeout
6. Retry avec backoff exponentiel si nécessaire

**Pattern:**
```typescript
async function handleTimeoutIntelligently(
  operation: Operation,
  context: Context
): Promise<OperationResult> {
  // 1. Détecter opération longue
  const estimate = await detectLongOperations(operation, context);
  
  // 2. Si risque élevé, décomposer
  if (estimate.timeoutRisk === 'high') {
    return await executeDecomposed(operation, context);
  }
  
  // 3. Exécuter avec checkpoints et retry
  return await executeWithRetry(
    operation,
    context,
    async (op) => {
      return await executeWithCheckpoints(op, context);
    }
  );
}
```

## ⚠️ Règles de Gestion des Timeouts

### Ne Jamais:

**BLOQUANT:**
- ❌ Ignorer opérations longues sans décomposition
- ❌ Ne pas créer checkpoints pour opérations longues
- ❌ Ne pas reprendre depuis checkpoint après timeout
- ❌ Ne pas retry avec backoff après timeout

**TOUJOURS:**
- ✅ Détecter opérations longues avant exécution
- ✅ Décomposer si timeout probable
- ✅ Créer checkpoints réguliers
- ✅ Reprendre depuis checkpoint si timeout
- ✅ Retry avec backoff exponentiel
- ✅ Estimer temps restant

## 📊 Checklist Gestion des Timeouts

### Avant Exécution

- [ ] Estimer durée de l'opération
- [ ] Détecter risque de timeout
- [ ] Décomposer si nécessaire
- [ ] Configurer checkpoints

### Pendant Exécution

- [ ] Créer checkpoints réguliers
- [ ] Estimer temps restant
- [ ] Surveiller progression
- [ ] Ajuster stratégie si nécessaire

### Après Timeout

- [ ] Charger dernier checkpoint
- [ ] Valider état sauvegardé
- [ ] Reprendre depuis checkpoint
- [ ] Retry avec backoff si nécessaire

## 🔗 Références

- `@.cursor/rules/error-recovery.md` - Récupération automatique après erreurs
- `@.cursor/rules/task-decomposition.md` - Décomposition des tâches
- `@.cursor/rules/persistent-execution.md` - Exécution persistante

---

**Note:** Cette règle garantit que les timeouts sont gérés intelligemment avec décomposition automatique, checkpoints et reprise.

**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

