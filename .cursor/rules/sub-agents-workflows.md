<!-- 
Context: sub-agents, workflows, patterns, error-handling, recovery
Priority: P1
Auto-load: when task requires sub-agents workflows or standard execution patterns
Dependencies: core.md, sub-agents-orchestration.md, sub-agents-roles.md, sub-agents-communication.md
-->

# Système de Sub-Agents - Workflows Standards - Saxium

**Objectif:** Définir les workflows standards réutilisables pour l'exécution de tâches avec sub-agents, incluant la gestion d'erreurs et la récupération.

**Référence:** [Cursor Rules Documentation](https://docs.cursor.com/context/rules)  
**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

## 🎯 Principe Fondamental

**IMPÉRATIF:** Le système de sub-agents DOIT utiliser des workflows standards réutilisables pour garantir la cohérence et la qualité de l'exécution.

**Bénéfices:**
- ✅ Workflows réutilisables et testés
- ✅ Gestion d'erreurs standardisée
- ✅ Récupération automatique
- ✅ Patterns éprouvés
- ✅ Cohérence entre exécutions

**Référence:** `@.cursor/rules/sub-agents-orchestration.md` - Orchestration principale  
**Référence:** `@.cursor/rules/sub-agents-roles.md` - Rôles des sub-agents  
**Référence:** `@docs/AGENT_ROLES_CONFIG.json` - Configuration des rôles (workflows)

## 📋 Workflows Standards

### 1. Workflow Standard (Développement Complet)

**Utilisation:** Tâches de développement complètes nécessitant tous les rôles.

**Étapes:**
1. **Coordinator** → Analyse tâche et identification rôles
2. **Architect** → Validation architecture et priorisation
3. **Developer** → Implémentation
4. **Tester** → Validation et tests
5. **Analyst** → Analyse et optimisation
6. **Architect** → Review final
7. **Coordinator** → Consolidation résultats

**Pattern:**
```typescript
// Workflow standard
async function executeStandardWorkflow(
  task: Task,
  context: Context
): Promise<WorkflowResult> {
  const results: StepResult[] = [];
  
  try {
    // 1. Coordinator - Analyse
    const coordinatorResult = await executeStep('coordinator', {
      action: 'analyze-task',
      task
    }, context);
    results.push(coordinatorResult);
    
    // 2. Architect - Validation
    const architectResult = await executeStep('architect', {
      action: 'validate-architecture',
      task,
      dependsOn: coordinatorResult
    }, context);
    results.push(architectResult);
    
    // 3. Developer - Implémentation
    const developerResult = await executeStep('developer', {
      action: 'implement',
      task,
      dependsOn: architectResult
    }, context);
    results.push(developerResult);
    
    // 4. Tester - Validation
    const testerResult = await executeStep('tester', {
      action: 'test',
      task,
      dependsOn: developerResult
    }, context);
    results.push(testerResult);
    
    // 5. Analyst - Analyse
    const analystResult = await executeStep('analyst', {
      action: 'analyze',
      task,
      dependsOn: [developerResult, testerResult]
    }, context);
    results.push(analystResult);
    
    // 6. Architect - Review final
    const architectReviewResult = await executeStep('architect', {
      action: 'review-final',
      task,
      dependsOn: [developerResult, testerResult, analystResult]
    }, context);
    results.push(architectReviewResult);
    
    // 7. Coordinator - Consolidation
    const coordinatorConsolidationResult = await executeStep('coordinator', {
      action: 'consolidate-results',
      task,
      dependsOn: results
    }, context);
    results.push(coordinatorConsolidationResult);
    
    return {
      success: true,
      results,
      workflow: 'standard'
    };
  } catch (error) {
    return await handleWorkflowError(error, results, context);
  }
}
```

### 2. Workflow Quick Fix (Correction Rapide)

**Utilisation:** Corrections simples ne nécessitant que Developer et Tester.

**Étapes:**
1. **Developer** → Correction directe
2. **Tester** → Validation rapide

**Pattern:**
```typescript
// Workflow quick fix
async function executeQuickFixWorkflow(
  task: Task,
  context: Context
): Promise<WorkflowResult> {
  const results: StepResult[] = [];
  
  try {
    // 1. Developer - Correction
    const developerResult = await executeStep('developer', {
      action: 'fix',
      task
    }, context);
    results.push(developerResult);
    
    // 2. Tester - Validation rapide
    const testerResult = await executeStep('tester', {
      action: 'quick-validation',
      task,
      dependsOn: developerResult
    }, context);
    results.push(testerResult);
    
    return {
      success: testerResult.success,
      results,
      workflow: 'quick-fix'
    };
  } catch (error) {
    return await handleWorkflowError(error, results, context);
  }
}
```

### 3. Workflow Refactoring (Refactoring Complexe)

**Utilisation:** Refactoring complexe nécessitant analyse approfondie.

**Étapes:**
1. **Architect** → Analyse architecture et planification
2. **Analyst** → Analyse code existant et identification améliorations
3. **Developer** → Refactoring
4. **Tester** → Tests de régression
5. **Architect** → Validation architecture finale

**Pattern:**
```typescript
// Workflow refactoring
async function executeRefactoringWorkflow(
  task: Task,
  context: Context
): Promise<WorkflowResult> {
  const results: StepResult[] = [];
  
  try {
    // 1. Architect - Analyse et planification
    const architectPlanResult = await executeStep('architect', {
      action: 'analyze-and-plan',
      task
    }, context);
    results.push(architectPlanResult);
    
    // 2. Analyst - Analyse code existant
    const analystResult = await executeStep('analyst', {
      action: 'analyze-existing-code',
      task,
      dependsOn: architectPlanResult
    }, context);
    results.push(analystResult);
    
    // 3. Developer - Refactoring
    const developerResult = await executeStep('developer', {
      action: 'refactor',
      task,
      dependsOn: [architectPlanResult, analystResult]
    }, context);
    results.push(developerResult);
    
    // 4. Tester - Tests de régression
    const testerResult = await executeStep('tester', {
      action: 'regression-tests',
      task,
      dependsOn: developerResult
    }, context);
    results.push(testerResult);
    
    // 5. Architect - Validation finale
    const architectValidationResult = await executeStep('architect', {
      action: 'validate-architecture-final',
      task,
      dependsOn: [developerResult, testerResult]
    }, context);
    results.push(architectValidationResult);
    
    return {
      success: architectValidationResult.success,
      results,
      workflow: 'refactoring'
    };
  } catch (error) {
    return await handleWorkflowError(error, results, context);
  }
}
```

## 🔄 Gestion d'Erreurs et Récupération

### 1. Gestion d'Erreurs Standardisée

**IMPÉRATIF:** Gérer les erreurs de manière standardisée dans tous les workflows.

**TOUJOURS:**
- ✅ Capturer toutes les erreurs
- ✅ Classifier erreurs (critique, haute, moyenne, basse)
- ✅ Logger erreurs avec contexte
- ✅ Notifier autres rôles
- ✅ Tenter récupération automatique

**Pattern:**
```typescript
// Gérer erreurs workflow
async function handleWorkflowError(
  error: Error,
  results: StepResult[],
  context: Context
): Promise<WorkflowResult> {
  // 1. Classifier erreur
  const errorClassification = classifyError(error, context);
  
  // 2. Logger erreur
  logger.error('Erreur dans workflow', error, {
    metadata: {
      errorType: errorClassification.type,
      severity: errorClassification.severity,
      results: results.length,
      context
    }
  });
  
  // 3. Notifier autres rôles
  await notifyErrorToRoles(error, errorClassification, context);
  
  // 4. Tenter récupération
  if (errorClassification.recoverable) {
    const recoveryResult = await attemptRecovery(
      error,
      errorClassification,
      results,
      context
    );
    
    if (recoveryResult.success) {
      return {
        success: true,
        results: [...results, recoveryResult.result],
        workflow: 'recovered',
        recovery: recoveryResult
      };
    }
  }
  
  // 5. Retourner résultat d'échec
  return {
    success: false,
    results,
    error: {
      type: errorClassification.type,
      severity: errorClassification.severity,
      message: error.message,
      stack: error.stack
    },
    workflow: 'failed'
  };
}
```

### 2. Récupération Automatique

**IMPÉRATIF:** Tenter récupération automatique selon type d'erreur.

**TOUJOURS:**
- ✅ Identifier stratégie de récupération
- ✅ Tenter récupération selon stratégie
- ✅ Valider récupération
- ✅ Continuer workflow si récupération réussie

**Pattern:**
```typescript
// Tenter récupération
async function attemptRecovery(
  error: Error,
  classification: ErrorClassification,
  results: StepResult[],
  context: Context
): Promise<RecoveryResult> {
  // 1. Identifier stratégie de récupération
  const recoveryStrategy = identifyRecoveryStrategy(
    error,
    classification,
    context
  );
  
  // 2. Tenter récupération selon stratégie
  switch (recoveryStrategy.type) {
    case 'retry':
      return await retryStep(recoveryStrategy, results, context);
      
    case 'rollback':
      return await rollbackStep(recoveryStrategy, results, context);
      
    case 'skip':
      return await skipStep(recoveryStrategy, results, context);
      
    case 'alternative':
      return await useAlternativeApproach(
        recoveryStrategy,
        results,
        context
      );
      
    default:
      return {
        success: false,
        reason: 'No recovery strategy found'
      };
  }
}

// Retry step
async function retryStep(
  strategy: RecoveryStrategy,
  results: StepResult[],
  context: Context
): Promise<RecoveryResult> {
  const maxRetries = strategy.maxRetries || 3;
  let attempts = 0;
  
  while (attempts < maxRetries) {
    attempts++;
    
    try {
      // Réessayer étape
      const result = await executeStep(
        strategy.role,
        strategy.action,
        context
      );
      
      if (result.success) {
        return {
          success: true,
          result,
          attempts,
          strategy: 'retry'
        };
      }
    } catch (retryError) {
      if (attempts >= maxRetries) {
        return {
          success: false,
          reason: `Max retries (${maxRetries}) reached`,
          attempts
        };
      }
      
      // Attendre avant réessai
      await wait(1000 * attempts); // Backoff exponentiel
    }
  }
  
  return {
    success: false,
    reason: 'Max retries reached',
    attempts
  };
}
```

## 📊 Patterns Réutilisables

### 1. Pattern de Validation

**Utilisation:** Valider résultats entre étapes.

```typescript
// Pattern validation
async function validateStepResult(
  result: StepResult,
  expected: ExpectedResult,
  context: Context
): Promise<ValidationResult> {
  const validations: ValidationCheck[] = [];
  
  // 1. Valider succès
  validations.push({
    check: 'success',
    passed: result.success === expected.success,
    message: result.success ? 'Success validated' : 'Success expected but failed'
  });
  
  // 2. Valider résultats
  if (expected.result) {
    validations.push({
      check: 'result',
      passed: deepEqual(result.result, expected.result),
      message: 'Result matches expected'
    });
  }
  
  // 3. Valider fichiers modifiés
  if (expected.filesModified) {
    validations.push({
      check: 'files',
      passed: arraysEqual(result.filesModified, expected.filesModified),
      message: 'Files modified match expected'
    });
  }
  
  const allPassed = validations.every(v => v.passed);
  
  return {
    valid: allPassed,
    validations,
    result: allPassed ? 'valid' : 'invalid'
  };
}
```

### 2. Pattern de Partage de Résultats

**Utilisation:** Partager résultats entre rôles.

```typescript
// Pattern partage résultats
async function shareResultsBetweenRoles(
  result: StepResult,
  targetRoles: Role[],
  context: Context
): Promise<void> {
  // 1. Créer message de résultat
  const message: AgentMessage = {
    id: generateMessageId(),
    type: 'result',
    from: result.role,
    to: targetRoles,
    timestamp: new Date().toISOString(),
    correlationId: result.taskId,
    priority: 'high',
    payload: {
      taskId: result.taskId,
      success: result.success,
      result: result.result,
      filesModified: result.filesModified,
      metrics: result.metrics
    }
  };
  
  // 2. Envoyer message
  await sendMessage(message, context);
  
  // 3. Mettre à jour état coordination
  await updateCoordinationState({
    taskId: result.taskId,
    role: result.role,
    status: result.success ? 'completed' : 'failed',
    result: result.result
  }, context);
}
```

## ⚠️ Règles des Workflows

### TOUJOURS:

- ✅ Utiliser workflows standards quand approprié
- ✅ Gérer erreurs de manière standardisée
- ✅ Tenter récupération automatique
- ✅ Valider résultats entre étapes
- ✅ Partager résultats entre rôles
- ✅ Logger toutes les actions importantes

### NE JAMAIS:

- ❌ Ignorer erreurs sans gestion
- ❌ Ne pas tenter récupération si possible
- ❌ Ne pas valider résultats
- ❌ Ne pas partager résultats entre rôles
- ❌ Utiliser workflow inapproprié

## 🔗 Références

### Règles Intégrées

- `@.cursor/rules/sub-agents-orchestration.md` - Orchestration principale
- `@.cursor/rules/sub-agents-roles.md` - Rôles des sub-agents
- `@.cursor/rules/sub-agents-communication.md` - Communication inter-agents
- `@.cursor/rules/error-recovery.md` - Récupération automatique après erreurs

### Configuration

- `@docs/AGENT_ROLES_CONFIG.json` - Configuration des rôles (workflows)

---

**Note:** Ce fichier définit les workflows standards réutilisables pour l'exécution de tâches avec sub-agents, incluant la gestion d'erreurs et la récupération.

**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

