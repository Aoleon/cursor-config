# Auto-Continuation Prochaines Étapes - Saxium

<!-- 
Context: [autonomy, continuation, next-steps, auto-execution]
Priority: P0
Auto-load: [always]
Dependencies: [core.md, persistent-execution.md, autonomous-decision-making.md, todo-completion.md]
Score: 100
-->

**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

**Objectif:** Garantir que l'agent détecte automatiquement les "prochaines étapes" mentionnées dans sa réponse et les exécute immédiatement sans s'arrêter.

## 🎯 Principe Fondamental

**IMPÉRATIF:** L'agent DOIT analyser sa propre réponse AVANT de la finaliser pour détecter toute mention de "prochaines étapes", créer automatiquement des todos pour ces étapes, et les exécuter immédiatement sans s'arrêter.

**Problème identifié:** L'agent mentionne souvent des "prochaines étapes" dans sa réponse mais s'arrête sans les exécuter, violant ainsi l'autonomie continue.

**Solution:** Détection automatique AVANT finalisation de réponse, extraction des étapes mentionnées, création automatique de todos, et exécution immédiate sans interruption.

## 🔴 Workflow Obligatoire AVANT Finalisation de Réponse

### ÉTAPE 1 - Analyse Préventive (OBLIGATOIRE)

**AVANT de finaliser toute réponse, l'agent DOIT:**

1. **Analyser le contenu de la réponse générée** pour détecter les patterns suivants:

**Patterns français (DÉTECTION RENFORCÉE):**
- "prochaines étapes", "étapes suivantes", "next steps"
- "tâches restantes", "il reste", "il faudra", "actions à faire"
- "ensuite", "plus tard", "dans un second temps", "then", "later"
- "à faire", "restant", "prochaine action", "action suivante"
- "il reste à", "il faudrait", "il serait nécessaire"
- "dans un prochain temps", "ultérieurement", "par la suite"
- "une fois que", "après avoir", "une fois terminé"
- "services restants", "fichiers restants", "migrations restantes"
- "continuer avec", "poursuivre avec", "passer à"

**Patterns anglais:**
- "next steps", "following steps", "remaining tasks"
- "to do", "remaining", "next action", "following action"
- "it remains to", "it would be necessary", "should be done"
- "in a next time", "later", "subsequently"
- "once", "after", "once completed"
- "remaining services", "remaining files", "remaining migrations"
- "continue with", "proceed with", "move to"

**Patterns contextuels:**
- Phrases contenant "prochaine" + action (ex: "prochaine migration")
- Phrases contenant "reste" + action (ex: "reste à migrer")
- Phrases contenant "faudra" + action (ex: "faudra vérifier")
- Phrases contenant "ensuite" + action (ex: "ensuite migrer")
- Listes numérotées ou à puces contenant des actions futures
- Sections "Prochaines étapes" ou "Next steps" dans la réponse

**Pattern:**
```typescript
// Analyse préventive AVANT finalisation
async function analyzeResponseBeforeFinalization(
  response: string,
  context: Context
): Promise<AnalysisResult> {
  const nextStepsPhrases = [
    // Français
    'prochaines étapes', 'étapes suivantes', 'next steps',
    'tâches restantes', 'il reste', 'il faudra', 'actions à faire',
    'ensuite', 'plus tard', 'dans un second temps', 'then', 'later',
    'à faire', 'restant', 'prochaine action', 'action suivante',
    'il reste à', 'il faudrait', 'il serait nécessaire',
    'dans un prochain temps', 'ultérieurement', 'par la suite',
    'une fois que', 'après avoir', 'une fois terminé',
    'services restants', 'fichiers restants', 'migrations restantes',
    'continuer avec', 'poursuivre avec', 'passer à',
    // Anglais
    'next steps', 'following steps', 'remaining tasks',
    'to do', 'remaining', 'next action', 'following action',
    'it remains to', 'it would be necessary', 'should be done',
    'in a next time', 'later', 'subsequently',
    'once', 'after', 'once completed',
    'remaining services', 'remaining files', 'remaining migrations',
    'continue with', 'proceed with', 'move to'
  ];
  
  const detectedPhrases: string[] = [];
  let detected = false;
  
  const lowerResponse = response.toLowerCase();
  
  // Détection simple
  for (const phrase of nextStepsPhrases) {
    if (lowerResponse.includes(phrase.toLowerCase())) {
      detected = true;
      detectedPhrases.push(phrase);
    }
  }
  
  // Détection contextuelle (regex)
  const contextualPatterns = [
    /prochaine\s+\w+/i,  // "prochaine migration"
    /reste\s+à\s+\w+/i,  // "reste à migrer"
    /faudra\s+\w+/i,     // "faudra vérifier"
    /ensuite\s+\w+/i,    // "ensuite migrer"
    /^\s*[0-9]+\.\s*(.+)$/gm,  // Listes numérotées
    /^\s*[-*]\s*(.+)$/gm       // Listes à puces
  ];
  
  for (const pattern of contextualPatterns) {
    const matches = response.match(pattern);
    if (matches && matches.length > 0) {
      detected = true;
      detectedPhrases.push(...matches);
    }
  }
  
  // Détection sections "Prochaines étapes"
  const sectionPatterns = [
    /##\s*prochaines\s+étapes/i,
    /##\s*next\s+steps/i,
    /###\s*prochaines\s+étapes/i,
    /###\s*next\s+steps/i
  ];
  
  for (const pattern of sectionPatterns) {
    if (pattern.test(response)) {
      detected = true;
      detectedPhrases.push('Section "Prochaines étapes" détectée');
    }
  }
  
  return {
    detected,
    detectedPhrases,
    response
  };
}
```

### ÉTAPE 2 - Extraction Automatique des Étapes (OBLIGATOIRE)

**Si des mentions sont détectées, l'agent DOIT:**

1. **Extraire toutes les étapes mentionnées** de manière exhaustive
2. **Identifier les actions concrètes** à effectuer
3. **Créer un plan structuré** pour ces étapes

**Pattern:**
```typescript
// Extraction automatique des étapes
async function extractNextSteps(
  response: string,
  detectedPhrases: string[],
  context: Context
): Promise<NextStep[]> {
  const steps: NextStep[] = [];
  
  // 1. Extraire depuis sections "Prochaines étapes"
  const sectionMatch = response.match(/##\s*prochaines\s+étapes[\s\S]*?(?=##|$)/i);
  if (sectionMatch) {
    const sectionContent = sectionMatch[0];
    const listItems = sectionContent.match(/^\s*[-*0-9]+\.\s*(.+)$/gm);
    if (listItems) {
      for (const item of listItems) {
        const action = item.replace(/^\s*[-*0-9]+\.\s*/, '').trim();
        steps.push({
          id: generateStepId(),
          action,
          source: 'section',
          priority: 'high'
        });
      }
    }
  }
  
  // 2. Extraire depuis phrases contextuelles
  for (const phrase of detectedPhrases) {
    const actionMatch = phrase.match(/(?:reste|faudra|ensuite|prochaine)\s+(?:à\s+)?(.+)/i);
    if (actionMatch) {
      steps.push({
        id: generateStepId(),
        action: actionMatch[1].trim(),
        source: 'contextual',
        priority: 'medium'
      });
    }
  }
  
  // 3. Extraire depuis listes dans le texte
  const listPattern = /(?:^|\n)\s*[-*0-9]+\.\s*(.+?)(?=\n|$)/gm;
  const listMatches = response.matchAll(listPattern);
  for (const match of listMatches) {
    const action = match[1].trim();
    // Filtrer les actions qui ne sont pas déjà complétées
    if (!action.match(/^(?:✅|✓|fait|done|completed)/i)) {
      steps.push({
        id: generateStepId(),
        action,
        source: 'list',
        priority: 'medium'
      });
    }
  }
  
  return steps;
}
```

### ÉTAPE 3 - Création Automatique de Todos (OBLIGATOIRE)

**L'agent DOIT:**

1. **Créer un todo pour chaque étape identifiée**
2. **Définir les priorités** selon l'importance
3. **Identifier les dépendances** entre étapes
4. **Logger la création** des todos

**Pattern:**
```typescript
// Création automatique de todos
async function createTodosFromNextSteps(
  steps: NextStep[],
  context: Context
): Promise<Todo[]> {
  const todos: Todo[] = [];
  
  for (const step of steps) {
    // Créer todo avec contenu détaillé
    const todo: Todo = {
      id: generateTodoId(),
      content: step.action,
      status: 'pending',
      priority: step.priority,
      metadata: {
        source: step.source,
        detectedFrom: 'auto-continuation-next-steps',
        timestamp: new Date().toISOString()
      }
    };
    
    todos.push(todo);
    
    // Logger création
    logger.info('Todo créé automatiquement depuis "prochaines étapes"', {
      metadata: {
        todoId: todo.id,
        action: step.action,
        source: step.source
      }
    });
  }
  
  return todos;
}
```

### ÉTAPE 4 - Exécution Immédiate (OBLIGATOIRE)

**L'agent DOIT:**

1. **Exécuter immédiatement** tous les todos créés
2. **Ne pas s'arrêter** tant que tous les todos ne sont pas complétés
3. **Vérifier la completion** de chaque étape
4. **Continuer jusqu'à completion complète**

**Pattern:**
```typescript
// Exécution immédiate des todos
async function executeNextStepsImmediately(
  todos: Todo[],
  context: Context
): Promise<ExecutionResult> {
  logger.info('Début exécution immédiate des prochaines étapes', {
    metadata: {
      todosCount: todos.length,
      todos: todos.map(t => ({ id: t.id, content: t.content }))
    }
  });
  
  const results: TodoResult[] = [];
  
  for (const todo of todos) {
    // Marquer comme in_progress
    await updateTodoStatus(todo.id, 'in_progress');
    
    // Exécuter le todo
    const result = await executeTodo(todo, context);
    results.push(result);
    
    // Marquer comme completed si succès
    if (result.success) {
      await updateTodoStatus(todo.id, 'completed');
    } else {
      // Si échec, logger et continuer avec les autres
      logger.warn('Échec exécution todo depuis "prochaines étapes"', {
        metadata: {
          todoId: todo.id,
          action: todo.content,
          error: result.error
        }
      });
    }
  }
  
  // Vérifier que tous sont complétés
  const allCompleted = results.every(r => r.success);
  
  if (!allCompleted) {
    logger.warn('Certaines prochaines étapes n\'ont pas été complétées', {
      metadata: {
        total: todos.length,
        completed: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      }
    });
  }
  
  return {
    success: allCompleted,
    todosExecuted: todos.length,
    todosCompleted: results.filter(r => r.success).length,
    results
  };
}
```

## 🔄 Workflow Complet Intégré

### Workflow: Détection → Extraction → Création → Exécution

**Étapes (Workflow Complet):**

1. **AVANT finalisation de réponse:**
   - Analyser le contenu de la réponse générée
   - Détecter toute mention de "prochaines étapes"
   - Si détecté, NE PAS finaliser la réponse

2. **Si détection positive:**
   - Extraire toutes les étapes mentionnées
   - Créer des todos pour chaque étape
   - Logger la détection et l'action prise

3. **Exécution immédiate:**
   - Exécuter tous les todos créés
   - Ne pas s'arrêter tant que tous ne sont pas complétés
   - Vérifier la completion de chaque étape

4. **Après exécution:**
   - Vérifier que toutes les étapes sont complétées
   - Mettre à jour la réponse avec le statut d'exécution
   - Finaliser la réponse uniquement si toutes les étapes sont complétées

**Pattern:**
```typescript
// Workflow complet intégré
async function autoContinuationWorkflow(
  response: string,
  context: Context
): Promise<WorkflowResult> {
  // ÉTAPE 1: Analyse préventive
  const analysis = await analyzeResponseBeforeFinalization(response, context);
  
  if (!analysis.detected) {
    // Aucune mention détectée, finaliser réponse normalement
    return {
      shouldFinalize: true,
      intercepted: false,
      reason: 'Aucune mention de "prochaines étapes" détectée'
    };
  }
  
  // ÉTAPE 2: Extraction des étapes
  logger.warn('Mention de "prochaines étapes" détectée, interception automatique', {
    metadata: {
      detectedPhrases: analysis.detectedPhrases,
      responseLength: response.length
    }
  });
  
  const steps = await extractNextSteps(response, analysis.detectedPhrases, context);
  
  // ÉTAPE 3: Création de todos
  const todos = await createTodosFromNextSteps(steps, context);
  
  // ÉTAPE 4: Exécution immédiate
  const executionResult = await executeNextStepsImmediately(todos, context);
  
  // ÉTAPE 5: Mise à jour réponse
  const updatedResponse = await updateResponseWithExecutionStatus(
    response,
    executionResult,
    context
  );
  
  return {
    shouldFinalize: executionResult.success,
    intercepted: true,
    reason: 'Prochaines étapes détectées et exécutées automatiquement',
    stepsExtracted: steps.length,
    todosCreated: todos.length,
    todosCompleted: executionResult.todosCompleted,
    updatedResponse: executionResult.success ? updatedResponse : response
  };
}
```

## ⚠️ Règles Anti-Interruption Renforcées

### Ne JAMAIS S'Arrêter Si:

**BLOQUANT (TOUJOURS VRAI):**
- ❌ La réponse contient "prochaines étapes" ou équivalents
- ❌ La réponse contient "il reste" ou "il faudra"
- ❌ La réponse contient des listes d'actions futures
- ❌ La réponse contient une section "Prochaines étapes"
- ❌ Des todos ont été créés depuis les "prochaines étapes" et ne sont pas tous complétés

**RÈGLE ABSOLUE:**
**Si l'agent mentionne des "prochaines étapes" dans sa réponse, il DOIT les planifier et les exécuter immédiatement. Aucun arrêt n'est autorisé tant que ces étapes ne sont pas complétées. Toute violation de cette règle est considérée comme un bug critique.**

## 📊 Checklist Auto-Continuation

### AVANT Finalisation de Réponse

- [ ] Analyser le contenu de la réponse générée
- [ ] Détecter toute mention de "prochaines étapes"
- [ ] Si détecté, intercepter et ne pas finaliser

### Si Détection Positive

- [ ] Extraire toutes les étapes mentionnées
- [ ] Créer des todos pour chaque étape
- [ ] Logger la détection et l'action prise

### Pendant Exécution

- [ ] Exécuter tous les todos créés
- [ ] Ne pas s'arrêter tant que tous ne sont pas complétés
- [ ] Vérifier la completion de chaque étape

### Après Exécution

- [ ] Vérifier que toutes les étapes sont complétées
- [ ] Mettre à jour la réponse avec le statut d'exécution
- [ ] Finaliser la réponse uniquement si toutes les étapes sont complétées

## 🔗 Intégration avec Autres Règles

### Intégration avec `persistent-execution.md`

**Synergie:**
- Cette règle détecte les "prochaines étapes" mentionnées
- `persistent-execution.md` garantit la continuation jusqu'à completion
- Les deux règles garantissent l'exécution complète sans interruption

### Intégration avec `autonomous-decision-making.md`

**Synergie:**
- Cette règle détecte les "prochaines étapes" mentionnées
- `autonomous-decision-making.md` garantit la prise de décision autonome
- Les deux règles garantissent l'autonomie continue totale

### Intégration avec `todo-completion.md`

**Synergie:**
- Cette règle crée des todos depuis les "prochaines étapes"
- `todo-completion.md` garantit que tous les todos sont complétés
- Les deux règles garantissent l'exécution complète

## 📚 Exemples Concrets

### Exemple 1: Migration Services

**Réponse générée:**
```
Services migrés: 2/27 (7%)

Prochaines étapes:
- Migrer les 25 services restants vers StorageFacade
- Vérifier que tous les tests passent
- Continuer avec d'autres tâches de la Phase 2
```

**Traitement Automatique:**
1. **Détection:** Section "Prochaines étapes" détectée
2. **Extraction:** 3 étapes identifiées
3. **Création:** 3 todos créés automatiquement
4. **Exécution:** Tous les todos exécutés immédiatement
5. **Résultat:** Migration continue sans interruption

### Exemple 2: Phrases Contextuelles

**Réponse générée:**
```
La migration progresse. Il reste à migrer 25 services et il faudra vérifier les tests ensuite.
```

**Traitement Automatique:**
1. **Détection:** "Il reste" et "il faudra" détectés
2. **Extraction:** 2 actions identifiées ("migrer 25 services", "vérifier les tests")
3. **Création:** 2 todos créés automatiquement
4. **Exécution:** Tous les todos exécutés immédiatement
5. **Résultat:** Continuation automatique sans interruption

## 🔗 Références

- `@.cursor/rules/core.md` - Règles fondamentales
- `@.cursor/rules/persistent-execution.md` - Exécution persistante
- `@.cursor/rules/autonomous-decision-making.md` - Prise de décision autonome
- `@.cursor/rules/todo-completion.md` - Completion des todos

---

**Note:** Cette règle garantit que l'agent détecte automatiquement les "prochaines étapes" mentionnées dans sa réponse et les exécute immédiatement sans s'arrêter, maximisant ainsi l'autonomie continue.

