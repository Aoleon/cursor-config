# Hook de Validation de Réponse Avant Arrêt - Saxium

**Objectif:** Garantir que l'agent ne s'arrête JAMAIS en mentionnant des "prochaines étapes" sans les planifier et exécuter immédiatement.

**Priorité:** CRITIQUE (P0)  
**Version:** 1.0.0  
**Date:** 2025-01-29

## 🎯 Principe Fondamental

**IMPÉRATIF ABSOLU:** L'agent DOIT valider automatiquement sa réponse AVANT TOUT arrêt et détecter si elle contient des mentions de "prochaines étapes", "tâches restantes", ou "actions futures".

**Si détection positive:** L'agent DOIT automatiquement planifier et exécuter ces étapes IMMÉDIATEMENT sans s'arrêter.

**Zéro Tolérance:** Aucun arrêt n'est autorisé tant que des prochaines étapes sont mentionnées.

---

## 📋 Hook de Validation Obligatoire

### 1. Point d'Injection du Hook

**IMPÉRATIF:** Ce hook DOIT être exécuté AVANT TOUT arrêt de l'agent, sans exception.

**Moments d'injection:**
- Avant de soumettre la réponse finale à l'utilisateur
- Avant de marquer un todo comme complété
- Avant de terminer une tâche
- Avant de s'arrêter après un checkpoint
- Avant toute pause volontaire

**Pattern:**
```typescript
// Hook exécuté AVANT TOUT arrêt
async function preStopValidationHook(
  agentResponse: string,
  context: Context
): Promise<ValidationResult> {
  // 1. OBLIGATOIRE: Valider réponse avant arrêt
  const validation = await validateResponseBeforeStop(agentResponse, context);
  
  // 2. Si validation échoue, FORCER continuation
  if (!validation.canStop) {
    logger.warn('❌ ARRÊT INTERDIT: Prochaines étapes détectées', {
      metadata: {
        detections: validation.detections,
        mustContinue: true
      }
    });
    
    // 3. FORCER planification et exécution automatique
    await forcePlanAndExecuteNextSteps(validation.detections, context);
    
    return {
      canStop: false,
      reason: 'Prochaines étapes détectées et exécutées',
      forcesContinuation: true
    };
  }
  
  // 4. Si validation réussit, autoriser arrêt
  return {
    canStop: true,
    reason: 'Aucune prochaine étape détectée, peut s\'arrêter'
  };
}
```

### 2. Détection Multi-Pattern Avancée

**IMPÉRATIF:** Utiliser des patterns de détection exhaustifs pour capturer TOUTES les mentions possibles.

**Catégories de Patterns:**

#### 2.1. Prochaines Étapes Explicites
```typescript
const nextStepsPatterns = [
  // Français
  /prochaines?\s+étapes?/i,
  /étapes?\s+suivantes?/i,
  /prochaines?\s+actions?/i,
  /actions?\s+suivantes?/i,
  /dans\s+les?\s+prochaines?\s+étapes?/i,
  /les?\s+étapes?\s+à\s+suivre/i,
  
  // Anglais
  /next\s+steps?/i,
  /following\s+steps?/i,
  /next\s+actions?/i,
  /upcoming\s+steps?/i,
  /steps?\s+to\s+follow/i
];
```

#### 2.2. Tâches Restantes
```typescript
const remainingTasksPatterns = [
  // Français
  /tâches?\s+restantes?/i,
  /tâches?\s+à\s+faire/i,
  /tâches?\s+à\s+compléter/i,
  /tâches?\s+à\s+réaliser/i,
  /il\s+reste(?:ra)?\s+à/i,
  /il\s+faudra(?:it)?/i,
  /reste(?:nt)?\s+à\s+faire/i,
  
  // Anglais
  /remaining\s+tasks?/i,
  /tasks?\s+to\s+do/i,
  /tasks?\s+to\s+complete/i,
  /need(?:s)?\s+to\s+be\s+done/i,
  /still\s+need(?:s)?\s+to/i
];
```

#### 2.3. Actions Futures
```typescript
const futureActionsPatterns = [
  // Français
  /ensuite/i,
  /plus\s+tard/i,
  /par\s+la\s+suite/i,
  /dans\s+un\s+second\s+temps/i,
  /dans\s+une\s+prochaine\s+itération/i,
  /ultérieurement/i,
  /à\s+l'avenir/i,
  /dans\s+le\s+futur/i,
  
  // Anglais
  /then/i,
  /later/i,
  /afterwards?/i,
  /subsequently/i,
  /in\s+the\s+future/i,
  /next\s+time/i
];
```

#### 2.4. Intentions Conditionnelles
```typescript
const conditionalIntentionsPatterns = [
  // Français
  /on\s+pourrait/i,
  /nous\s+pourrions/i,
  /il\s+serait\s+bien\s+de/i,
  /ce\s+serait\s+bien\s+de/i,
  /je\s+suggère\s+de/i,
  /je\s+recommande\s+de/i,
  
  // Anglais
  /we\s+could/i,
  /we\s+should/i,
  /it\s+would\s+be\s+good\s+to/i,
  /I\s+suggest(?:s)?/i,
  /I\s+recommend(?:s)?/i
];
```

#### 2.5. Listes Énumératives
```typescript
const enumerativeListsPatterns = [
  // Détection de listes numérotées/à puces suivant ces patterns
  /(?:prochaines?|suivantes?|restantes?)\s+\w+.*[:\n].*(?:\n\s*[-•*\d]+\s+.+){2,}/i,
  
  // Exemples:
  // "Prochaines étapes:\n1. ...\n2. ..."
  // "Tâches restantes:\n- ...\n- ..."
];
```

### 3. Algorithme de Validation

**IMPÉRATIF:** L'algorithme DOIT être exhaustif et ne JAMAIS manquer une mention.

**Pattern:**
```typescript
async function validateResponseBeforeStop(
  response: string,
  context: Context
): Promise<ValidationResult> {
  const detections: Detection[] = [];
  
  // 1. Analyser réponse avec TOUS les patterns
  const allPatterns = {
    nextSteps: nextStepsPatterns,
    remainingTasks: remainingTasksPatterns,
    futureActions: futureActionsPatterns,
    conditionalIntentions: conditionalIntentionsPatterns,
    enumerativeLists: enumerativeListsPatterns
  };
  
  // 2. Tester chaque catégorie
  for (const [category, patterns] of Object.entries(allPatterns)) {
    for (const pattern of patterns) {
      const matches = response.match(new RegExp(pattern, 'gi'));
      
      if (matches && matches.length > 0) {
        // 3. Extraire contexte autour de la détection
        const context = extractContextAroundMatch(response, matches[0]);
        
        // 4. Analyser intention (vraie mention vs simple référence)
        const intention = await analyzeIntention(context, matches[0]);
        
        if (intention.isRealMention) {
          detections.push({
            category,
            pattern: pattern.source,
            match: matches[0],
            context: context,
            intention: intention,
            severity: calculateSeverity(category, intention)
          });
        }
      }
    }
  }
  
  // 5. Si détections, extraire étapes mentionnées
  if (detections.length > 0) {
    const extractedSteps = await extractMentionedSteps(
      response,
      detections,
      context
    );
    
    return {
      canStop: false,
      detections,
      extractedSteps,
      reason: `${detections.length} mention(s) de prochaines étapes détectée(s)`,
      mustPlanAndExecute: true
    };
  }
  
  // 6. Aucune détection, peut s'arrêter
  return {
    canStop: true,
    detections: [],
    extractedSteps: [],
    reason: 'Aucune mention de prochaines étapes'
  };
}
```

### 4. Extraction Intelligente des Étapes

**IMPÉRATIF:** Extraire automatiquement les étapes mentionnées pour planification.

**Pattern:**
```typescript
async function extractMentionedSteps(
  response: string,
  detections: Detection[],
  context: Context
): Promise<ExtractedStep[]> {
  const steps: ExtractedStep[] = [];
  
  // 1. Pour chaque détection
  for (const detection of detections) {
    // 2. Extraire section autour de la détection
    const section = extractSectionAroundDetection(response, detection);
    
    // 3. Parser la section pour identifier étapes individuelles
    const individualSteps = parseStepsFromSection(section);
    
    // 4. Pour chaque étape identifiée
    for (const step of individualSteps) {
      // 5. Analyser complexité
      const complexity = await analyzeStepComplexity(step, context);
      
      // 6. Identifier dépendances
      const dependencies = await identifyStepDependencies(step, steps, context);
      
      // 7. Estimer durée
      const estimatedDuration = await estimateStepDuration(step, complexity, context);
      
      steps.push({
        id: generateStepId(),
        description: step,
        complexity,
        dependencies,
        estimatedDuration,
        category: detection.category,
        source: detection.match
      });
    }
  }
  
  return steps;
}
```

### 5. Planification et Exécution Automatiques

**IMPÉRATIF:** Planifier et exécuter IMMÉDIATEMENT les étapes extraites.

**Pattern:**
```typescript
async function forcePlanAndExecuteNextSteps(
  detections: Detection[],
  context: Context
): Promise<ExecutionResult> {
  logger.info('🚀 PLANIFICATION ET EXÉCUTION AUTOMATIQUES FORCÉES', {
    metadata: {
      detections: detections.length,
      timestamp: Date.now()
    }
  });
  
  // 1. Extraire étapes mentionnées
  const extractedSteps = await extractMentionedSteps(
    context.lastResponse,
    detections,
    context
  );
  
  // 2. Créer plan d'exécution
  const plan = await createExecutionPlan(extractedSteps, context);
  
  // 3. Créer todos pour chaque étape
  const todos = await createTodosForSteps(plan.steps, context);
  
  // 4. EXÉCUTER IMMÉDIATEMENT tous les todos
  const executionResult = await executeTodosImmediately(todos, context);
  
  // 5. Valider completion
  const validation = await validateStepsCompletion(
    extractedSteps,
    executionResult,
    context
  );
  
  // 6. Si non complété, réitérer
  if (!validation.allCompleted) {
    logger.warn('⚠️ Certaines étapes non complétées, réitération...', {
      metadata: {
        completed: validation.completedSteps.length,
        total: extractedSteps.length
      }
    });
    
    const remainingSteps = extractedSteps.filter(
      step => !validation.completedSteps.includes(step.id)
    );
    
    // Réitérer avec étapes restantes
    return await forcePlanAndExecuteNextSteps(
      detections,
      { ...context, remainingSteps }
    );
  }
  
  // 7. Toutes les étapes complétées
  logger.info('✅ TOUTES LES ÉTAPES COMPLÉTÉES', {
    metadata: {
      totalSteps: extractedSteps.length,
      totalDuration: Date.now() - context.startTime
    }
  });
  
  return {
    success: true,
    completed: true,
    steps: extractedSteps,
    executionResult,
    validation
  };
}
```

---

## 🔄 Workflow Complet du Hook

### Workflow: Validation Avant Arrêt

**Étapes obligatoires:**

```typescript
async function completePreStopWorkflow(
  agentResponse: string,
  context: Context
): Promise<StopDecision> {
  // ÉTAPE 1: Hook de validation (OBLIGATOIRE)
  const validation = await preStopValidationHook(agentResponse, context);
  
  // ÉTAPE 2: Si validation échoue, INTERDIRE arrêt
  if (!validation.canStop) {
    logger.warn('❌ ARRÊT INTERDIT PAR HOOK DE VALIDATION', {
      metadata: {
        reason: validation.reason,
        detections: validation.detections?.length || 0
      }
    });
    
    // ÉTAPE 3: Attendre fin d'exécution des étapes forcées
    // (déjà exécuté dans preStopValidationHook)
    
    // ÉTAPE 4: Re-valider après exécution
    const revalidation = await preStopValidationHook(
      context.lastResponse,
      context
    );
    
    if (!revalidation.canStop) {
      // Si encore des étapes, réitérer
      return await completePreStopWorkflow(
        context.lastResponse,
        context
      );
    }
    
    // ÉTAPE 5: Validation réussie, autoriser arrêt
    return {
      canStop: true,
      reason: 'Toutes les étapes complétées, arrêt autorisé'
    };
  }
  
  // ÉTAPE 6: Validation réussie dès le départ, autoriser arrêt
  return {
    canStop: true,
    reason: validation.reason
  };
}
```

---

## ⚠️ Règles Absolues du Hook

### Ne JAMAIS:

**INTERDIT ABSOLU:**
- ❌ Bypasser le hook de validation
- ❌ Ignorer les détections du hook
- ❌ S'arrêter malgré détections positives
- ❌ Marquer les étapes comme "à faire plus tard"
- ❌ Documenter les étapes sans les exécuter
- ❌ Créer des todos sans les exécuter immédiatement
- ❌ Mentionner des étapes futures dans la réponse

### TOUJOURS:

**OBLIGATOIRE:**
- ✅ Exécuter le hook AVANT TOUT arrêt
- ✅ Planifier automatiquement si détections
- ✅ Exécuter immédiatement les étapes planifiées
- ✅ Valider completion avant de continuer
- ✅ Réitérer jusqu'à aucune détection
- ✅ Logger toutes les détections
- ✅ Documenter décisions du hook

---

## 📊 Métriques du Hook

### Métriques à Tracker

```typescript
interface HookMetrics {
  // Détections
  totalDetections: number;
  detectionsPerCategory: Record<string, number>;
  averageDetectionsPerRun: number;
  
  // Exécutions forcées
  totalForcedExecutions: number;
  averageStepsPerExecution: number;
  totalStepsExecuted: number;
  
  // Performances
  averageValidationTime: number;
  averageExecutionTime: number;
  totalTimeSpentInHook: number;
  
  // Succès
  successRate: number; // % de runs où aucune détection après hook
  arretsPreventedRate: number; // % d'arrêts prématurés prévenus
  
  // Qualité
  falsePositiveRate: number; // % de détections non pertinentes
  falseNegativeRate: number; // % de mentions manquées (0% attendu)
}
```

### Objectifs de Performance

- **Détection:** 100% de rappel (aucune mention manquée)
- **Précision:** >95% (peu de faux positifs)
- **Temps de validation:** <500ms
- **Arrêts prévenus:** >90% des arrêts prématurés

---

## 🔗 Intégration avec Règles Existantes

### Intégration avec `persistent-execution.md`
- Le hook est appelé dans `checkBeforeStopping()`
- Si hook échoue, forcer continuation avec `forceContinuationIfNeeded()`

### Intégration avec `todo-completion.md`
- Le hook valide qu'aucune étape n'est mentionnée sans todo
- Si étapes sans todos détectées, créer et exécuter immédiatement

### Intégration avec `iterative-perfection.md`
- Le hook garantit que l'itération continue si étapes mentionnées
- Validation complète inclut validation du hook

### Intégration avec `core.md`
- Le hook est une règle P0 CRITIQUE
- Doit être toujours chargé et appliqué

---

## 🧪 Tests du Hook

### Tests de Non-Régression

```typescript
describe('Response Validation Hook', () => {
  it('DOIT détecter "prochaines étapes" explicites', async () => {
    const response = 'Tâche complétée. Prochaines étapes: 1. Test 2. Deploy';
    const result = await preStopValidationHook(response, context);
    
    expect(result.canStop).toBe(false);
    expect(result.detections.length).toBeGreaterThan(0);
  });
  
  it('DOIT détecter "il reste à faire"', async () => {
    const response = 'Code créé. Il reste à tester et documenter.';
    const result = await preStopValidationHook(response, context);
    
    expect(result.canStop).toBe(false);
    expect(result.detections.length).toBeGreaterThan(0);
  });
  
  it('DOIT détecter listes énumératives', async () => {
    const response = 'Terminé. Actions restantes:\n- Test\n- Deploy\n- Doc';
    const result = await preStopValidationHook(response, context);
    
    expect(result.canStop).toBe(false);
    expect(result.extractedSteps.length).toBe(3);
  });
  
  it('NE DOIT PAS détecter simples références', async () => {
    const response = 'J\'ai complété toutes les étapes demandées.';
    const result = await preStopValidationHook(response, context);
    
    expect(result.canStop).toBe(true);
    expect(result.detections.length).toBe(0);
  });
  
  it('DOIT forcer exécution automatique si détections', async () => {
    const response = 'Fait. Prochaines étapes: tester.';
    const spy = jest.spyOn(global, 'forcePlanAndExecuteNextSteps');
    
    await preStopValidationHook(response, context);
    
    expect(spy).toHaveBeenCalled();
  });
});
```

---

## 📝 Checklist d'Utilisation du Hook

### Avant Tout Arrêt

- [ ] Hook de validation exécuté
- [ ] Réponse analysée avec TOUS les patterns
- [ ] Détections identifiées et classifiées
- [ ] Si détections: étapes extraites
- [ ] Si détections: plan créé
- [ ] Si détections: todos créés
- [ ] Si détections: exécution immédiate lancée
- [ ] Re-validation effectuée après exécution
- [ ] Arrêt autorisé uniquement si aucune détection

---

## 🔗 Références

- `@.cursor/rules/persistent-execution.md` - Exécution persistante
- `@.cursor/rules/todo-completion.md` - Completion des todos
- `@.cursor/rules/iterative-perfection.md` - Itération jusqu'à perfection
- `@.cursor/rules/core.md` - Règles fondamentales

---

**Note:** Ce hook est CRITIQUE et DOIT être appliqué SANS EXCEPTION avant TOUT arrêt de l'agent.

**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29
