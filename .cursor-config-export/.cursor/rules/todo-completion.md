# Completion des Todos - Saxium

**Objectif:** Garantir que l'agent ne s'interrompt pas tant qu'il reste des todos en cours

## 🎯 Principe Fondamental

**IMPÉRATIF:** L'agent DOIT vérifier l'état des todos avant de s'arrêter et continuer jusqu'à completion de tous les todos.

**Problème identifié:** L'agent s'interrompt encore alors qu'il n'a pas terminé ses tâches ou annonce qu'il y a encore de prochaines étapes à réaliser alors qu'il devrait les planifier et poursuivre son exécution.

**Solution:** Détection automatique des mentions de "prochaines étapes", planification automatique, et exécution immédiate sans s'arrêter.

## 📋 Règles de Completion

### 1. Vérification Obligatoire Avant Arrêt

**TOUJOURS:**
- ✅ Vérifier l'état de tous les todos avant de s'arrêter
- ✅ Continuer jusqu'à completion de tous les todos en cours
- ✅ Ne pas s'interrompre tant qu'il reste des todos `in_progress` ou `pending`
- ✅ Marquer les todos comme `completed` uniquement après validation

**Pattern:**
```typescript
// Avant de s'arrêter
async function checkTodosBeforeStopping(): Promise<boolean> {
  const todos = await getTodos();
  const incompleteTodos = todos.filter(t => 
    t.status === 'in_progress' || t.status === 'pending'
  );
  
  if (incompleteTodos.length > 0) {
    logger.warn('Todos incomplets détectés', {
      metadata: {
        incompleteCount: incompleteTodos.length,
        todos: incompleteTodos.map(t => ({ id: t.id, content: t.content }))
      }
    });
    return false; // Ne pas s'arrêter
  }
  
  return true; // Peut s'arrêter
}
```

### 2. Exécution Séquentielle des Todos

**TOUJOURS:**
- ✅ Exécuter les todos dans l'ordre défini
- ✅ Respecter les dépendances entre todos
- ✅ Marquer todo comme `in_progress` au début
- ✅ Marquer todo comme `completed` après validation
- ✅ Gérer les erreurs sans interrompre la séquence

**Pattern:**
```typescript
async function executeTodosSequentially(todos: Todo[]): Promise<void> {
  for (const todo of todos) {
    // Vérifier si déjà complété
    if (todo.status === 'completed') {
      continue;
    }
    
    // Marquer en cours
    await markTodoInProgress(todo.id);
    
    try {
      // Exécuter todo
      const result = await executeTodo(todo);
      
      // Valider résultat
      const validation = await validateTodoResult(todo, result);
      if (validation.success) {
        await markTodoCompleted(todo.id);
      } else {
        // Corriger et réessayer
        const corrected = await autoCorrectTodo(todo, validation);
        await markTodoCompleted(todo.id);
      }
    } catch (error) {
      // Gérer erreur sans interrompre
      await handleTodoError(todo, error);
      // Continuer avec todo suivant
    }
  }
}
```

### 3. Gestion d'État Persistante

**TOUJOURS:**
- ✅ Sauvegarder l'état des todos après chaque todo complété
- ✅ Permettre reprise depuis le dernier todo complété
- ✅ Documenter progression des todos
- ✅ Valider intégrité de l'état avant reprise

**Pattern:**
```typescript
interface TodoState {
  planId: string;
  completedTodos: string[];
  currentTodo: string | null;
  todos: Todo[];
  lastUpdated: number;
}

async function saveTodoState(state: TodoState): Promise<void> {
  await persistState(state);
  logger.info('État todos sauvegardé', {
    metadata: {
      planId: state.planId,
      completedCount: state.completedTodos.length,
      totalCount: state.todos.length,
      currentTodo: state.currentTodo
    }
  });
}

async function resumeFromTodoState(planId: string): Promise<TodoState> {
  const state = await loadState(planId);
  if (!state) {
    throw new Error('État todos non trouvé');
  }
  
  // Valider intégrité
  const integrity = validateStateIntegrity(state);
  if (!integrity.valid) {
    throw new Error('État todos corrompu');
  }
  
  logger.info('Reprise depuis état todos', {
    metadata: {
      planId: state.planId,
      completedCount: state.completedTodos.length,
      totalCount: state.todos.length
    }
  });
  
  return state;
}
```

### 4. Validation de Completion

**TOUJOURS:**
- ✅ Valider que tous les todos sont complétés avant de s'arrêter
- ✅ Vérifier que les résultats sont cohérents
- ✅ Documenter la completion
- ✅ Générer rapport de completion

**Pattern:**
```typescript
async function validateCompletion(todos: Todo[]): Promise<CompletionResult> {
  const completedTodos = todos.filter(t => t.status === 'completed');
  const incompleteTodos = todos.filter(t => 
    t.status === 'in_progress' || t.status === 'pending'
  );
  
  if (incompleteTodos.length > 0) {
    return {
      completed: false,
      completedCount: completedTodos.length,
      totalCount: todos.length,
      incompleteTodos: incompleteTodos.map(t => ({
        id: t.id,
        content: t.content,
        status: t.status
      }))
    };
  }
  
  // Valider cohérence des résultats
  const consistency = await validateResultsConsistency(completedTodos);
  if (!consistency.valid) {
    return {
      completed: false,
      completedCount: completedTodos.length,
      totalCount: todos.length,
      consistencyIssues: consistency.issues
    };
  }
  
  return {
    completed: true,
    completedCount: completedTodos.length,
    totalCount: todos.length,
    results: completedTodos.map(t => t.result)
  };
}
```

## 🔄 Workflow de Completion

### Workflow: Exécuter Tous les Todos jusqu'à Completion

**Étapes:**
1. Charger tous les todos du plan
2. Vérifier état actuel (reprise si nécessaire)
3. Exécuter todos séquentiellement
4. Valider chaque todo après exécution
5. Sauvegarder état après chaque todo
6. Vérifier completion avant de s'arrêter
7. Générer rapport de completion

**Pattern:**
```typescript
async function executeAllTodosToCompletion(planId: string): Promise<CompletionResult> {
  // 1. Charger todos
  const todos = await loadTodos(planId);
  
  // 2. Charger ou créer état
  let state = await resumeFromTodoState(planId) || createInitialState(planId, todos);
  
  // 3. Filtrer todos non complétés
  const remainingTodos = todos.filter(t => 
    !state.completedTodos.includes(t.id)
  );
  
  // 4. Exécuter todos restants
  for (const todo of remainingTodos) {
    // Marquer en cours
    await markTodoInProgress(todo.id);
    state.currentTodo = todo.id;
    await saveTodoState(state);
    
    // Exécuter todo
    const result = await executeTodo(todo);
    
    // Valider résultat
    const validation = await validateTodoResult(todo, result);
    if (validation.success) {
      // Marquer complété
      await markTodoCompleted(todo.id);
      state.completedTodos.push(todo.id);
      state.currentTodo = null;
      await saveTodoState(state);
    } else {
      // Corriger et réessayer
      const corrected = await autoCorrectTodo(todo, validation);
      await markTodoCompleted(todo.id);
      state.completedTodos.push(todo.id);
      state.currentTodo = null;
      await saveTodoState(state);
    }
  }
  
  // 5. Valider completion
  const completion = await validateCompletion(todos);
  if (!completion.completed) {
    // Continuer avec todos incomplets
    return await executeAllTodosToCompletion(planId);
  }
  
  // 6. Générer rapport
  await generateCompletionReport(planId, completion);
  
  return completion;
}
```

## ⚠️ Règles Anti-Interruption

### Ne Jamais S'Arrêter Si:

**BLOQUANT:**
- ❌ Il reste des todos `in_progress`
- ❌ Il reste des todos `pending`
- ❌ La validation de completion échoue
- ❌ Il y a des erreurs non résolues
- ❌ L'agent mentionne des "prochaines étapes" sans les exécuter
- ❌ L'agent annonce des tâches restantes sans les planifier et exécuter
- ❌ L'agent mentionne qu'il va faire quelque chose "ensuite" ou "plus tard"

**TOUJOURS:**
- ✅ Vérifier état des todos avant de s'arrêter
- ✅ Continuer jusqu'à completion de tous les todos
- ✅ Détecter automatiquement les mentions de "prochaines étapes"
- ✅ Planifier automatiquement les prochaines étapes identifiées
- ✅ Exécuter immédiatement les prochaines étapes planifiées
- ✅ Documenter raison d'arrêt si nécessaire
- ✅ Sauvegarder état pour reprise

## 📊 Checklist Completion

### Avant de S'Arrêter

- [ ] Vérifier état de tous les todos
- [ ] S'assurer qu'il n'y a pas de todos `in_progress`
- [ ] S'assurer qu'il n'y a pas de todos `pending`
- [ ] Valider completion de tous les todos
- [ ] Vérifier qu'aucune mention de "prochaines étapes" n'a été détectée
- [ ] Vérifier qu'aucune mention de tâches restantes n'a été détectée
- [ ] Vérifier qu'aucune mention d'actions futures n'a été détectée
- [ ] Si des mentions sont détectées, planifier et exécuter automatiquement
- [ ] Sauvegarder état final
- [ ] Générer rapport de completion

### Pendant l'Exécution

- [ ] Marquer todo comme `in_progress` au début
- [ ] Exécuter todo complètement
- [ ] Valider résultat du todo
- [ ] Marquer todo comme `completed` après validation
- [ ] Sauvegarder état après chaque todo
- [ ] Continuer avec todo suivant

### En Cas d'Erreur

- [ ] Gérer erreur sans interrompre
- [ ] Corriger automatiquement si possible
- [ ] Documenter erreur si non auto-corrigeable
- [ ] Continuer avec todo suivant
- [ ] Ne pas s'arrêter à cause d'une erreur

## 🔗 Références

- `@.cursor/rules/long-term-autonomy.md` - Autonomie longue durée
- `@.cursor/rules/transversal-performance.md` - Performance transversale et autonomie
- `@.cursor/rules/autonomous-workflows.md` - Workflows autonomes
- `@.cursor/rules/core.md` - Règles fondamentales

---

**Note:** Ces règles garantissent que l'agent ne s'interrompt pas tant qu'il reste des todos en cours, assurant une completion complète des tâches planifiées.


