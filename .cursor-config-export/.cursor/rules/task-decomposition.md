<!-- 
Context: task-decomposition, complex-tasks, subtasks, sequential-thinking, background-agent, structured-task-lists, autonomy, planning
Priority: P1
Auto-load: when task is complex (> 3 todos, > 5 dependencies, > 200 lines estimated, > 5 files) or requires decomposition or autonomous run
Dependencies: core.md, quality-principles.md, code-quality.md, senior-architect-oversight.md, autonomous-workflows.md, parallel-execution.md
-->

# Décomposition des Tâches - Saxium

**Objectif:** Décomposer automatiquement les tâches complexes en sous-tâches gérables selon les recommandations officielles de Cursor, avec intégration du Background Agent et pensée séquentielle.

**Référence:** [Cursor Agent Planning Documentation](https://docs.cursor.com/guides/agent-planning)  
**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

## 🎯 Principe Fondamental

**IMPÉRATIF:** L'agent DOIT décomposer automatiquement les tâches complexes en sous-tâches gérables avec des critères de taille optimale, une pensée séquentielle, des listes de tâches structurées avec dépendances, et l'intégration du Background Agent de Cursor.

**Bénéfices:**
- ✅ Sous-tâches de taille optimale (max 50 lignes, max 3 fichiers)
- ✅ Décomposition avec pensée séquentielle (étapes logiques)
- ✅ Listes de tâches structurées avec dépendances explicites
- ✅ Intégration Background Agent pour tâches différées
- ✅ Validation de chaque étape avant la suivante
- ✅ Gestion automatique des dépendances

**Référence:** `@Docs Cursor Agent Planning` - Documentation officielle Cursor

## 📋 Critères de Décomposition

### 1. Taille Optimale des Sous-Tâches

**TOUJOURS:**
- ✅ Sous-tâche max 50 lignes de code
- ✅ Sous-tâche max 3 fichiers modifiés
- ✅ Sous-tâche max 5 dépendances externes
- ✅ Sous-tâche max 200 lignes estimées totales
- ✅ Validation de la taille avant création de sous-tâche

**Pattern:**
```typescript
// Valider taille optimale avant création sous-tâche
function validateSubtaskSize(subtask: Subtask): boolean {
  const size = {
    linesOfCode: estimateLinesOfCode(subtask),
    filesModified: subtask.files.length,
    externalDependencies: countDependencies(subtask),
    totalEstimatedLines: estimateTotalLines(subtask)
  };
  
  return (
    size.linesOfCode <= 50 &&
    size.filesModified <= 3 &&
    size.externalDependencies <= 5 &&
    size.totalEstimatedLines <= 200
  );
}
```

### 2. Complexité et Seuils de Décomposition

**Décomposer automatiquement si:**
- ✅ Tâche > 5 dépendances
- ✅ Tâche > 200 lignes estimées
- ✅ Tâche > 5 fichiers à modifier
- ✅ Tâche nécessite > 3 validations distinctes
- ✅ Tâche implique > 2 rôles différents

**Pattern:**
```typescript
// Détecter nécessité de décomposition
function shouldDecompose(task: Task): boolean {
  const complexity = {
    dependencies: countDependencies(task),
    estimatedLines: estimateLines(task),
    filesToModify: countFiles(task),
    validations: countValidations(task),
    roles: countRoles(task)
  };
  
  return (
    complexity.dependencies > 5 ||
    complexity.estimatedLines > 200 ||
    complexity.filesToModify > 5 ||
    complexity.validations > 3 ||
    complexity.roles > 2
  );
}
```

### 3. Détection Automatique de la Nécessité de Décomposer

**TOUJOURS:**
- ✅ Analyser complexité avant création de todos
- ✅ Détecter automatiquement seuils de décomposition
- ✅ Décomposer récursivement si sous-tâche trop complexe
- ✅ Valider taille de chaque sous-tâche créée

**Pattern:**
```typescript
// Détection automatique et décomposition récursive
async function autoDecomposeTask(
  task: Task,
  context: Context
): Promise<Subtask[]> {
  // 1. Analyser complexité
  const complexity = analyzeComplexity(task, context);
  
  // 2. Si nécessite décomposition
  if (shouldDecompose(task)) {
    // 3. Décomposer en sous-tâches
    const subtasks = await decomposeWithSequentialThinking(task, complexity, context);
    
    // 4. Valider taille de chaque sous-tâche
    const validatedSubtasks = subtasks.map(subtask => {
      if (!validateSubtaskSize(subtask)) {
        // 5. Re-décomposer si trop complexe
        return autoDecomposeTask(subtask, context);
      }
      return subtask;
    });
    
    return validatedSubtasks.flat();
  }
  
  // 6. Si pas de décomposition nécessaire, retourner tâche unique
  return [task];
}
```

## 🔄 Décomposition avec Pensée Séquentielle

### Principe

**IMPÉRATIF:** Utiliser la pensée séquentielle recommandée par Cursor pour décomposer les problèmes en étapes logiques.

**Référence:** `@Docs Cursor Sequential Thinking` - Documentation officielle Cursor

### 1. Décomposition en Étapes Logiques

**TOUJOURS:**
- ✅ Identifier étapes logiques séquentielles
- ✅ Valider chaque étape avant la suivante
- ✅ Gérer dépendances entre étapes
- ✅ Documenter séquence d'exécution

**Pattern:**
```typescript
// Décomposition avec pensée séquentielle
async function decomposeWithSequentialThinking(
  task: Task,
  complexity: Complexity,
  context: Context
): Promise<Subtask[]> {
  // 1. Identifier étapes logiques
  const logicalSteps = identifyLogicalSteps(task, complexity, context);
  
  // 2. Créer sous-tâches pour chaque étape
  const subtasks: Subtask[] = [];
  
  for (let i = 0; i < logicalSteps.length; i++) {
    const step = logicalSteps[i];
    const previousSteps = logicalSteps.slice(0, i);
    
    // 3. Créer sous-tâche avec dépendances
    const subtask = createSubtask(step, {
      dependsOn: previousSteps.map(s => s.id),
      validateBeforeNext: true,
      sequential: true
    });
    
    subtasks.push(subtask);
  }
  
  // 4. Valider séquence
  validateSequence(subtasks);
  
  return subtasks;
}
```

### 2. Validation de Chaque Étape

**TOUJOURS:**
- ✅ Valider étape avant de passer à la suivante
- ✅ Détecter erreurs et corriger avant continuation
- ✅ Documenter validation de chaque étape

**Pattern:**
```typescript
// Validation séquentielle
async function executeSequentialSubtasks(
  subtasks: Subtask[],
  context: Context
): Promise<ExecutionResult> {
  const results: StepResult[] = [];
  
  for (const subtask of subtasks) {
    // 1. Exécuter sous-tâche
    const result = await executeSubtask(subtask, context);
    
    // 2. Valider résultat
    const validation = await validateStepResult(result, subtask, context);
    
    if (!validation.success) {
      // 3. Corriger et réessayer
      const corrected = await correctAndRetry(subtask, validation, context);
      results.push(corrected);
    } else {
      results.push(result);
    }
    
    // 4. Documenter validation
    await documentStepValidation(subtask, validation, context);
  }
  
  return { results, allValidated: results.every(r => r.validation.success) };
}
```

### 3. Gestion des Dépendances

**TOUJOURS:**
- ✅ Identifier dépendances explicites entre sous-tâches
- ✅ Respecter ordre d'exécution selon dépendances
- ✅ Valider dépendances avant exécution

**Pattern:**
```typescript
// Gestion dépendances
function resolveDependencies(subtasks: Subtask[]): Subtask[] {
  // 1. Construire graphe de dépendances
  const dependencyGraph = buildDependencyGraph(subtasks);
  
  // 2. Trier topologiquement
  const sorted = topologicalSort(dependencyGraph);
  
  // 3. Valider pas de cycles
  if (hasCycles(dependencyGraph)) {
    throw new Error('Cycle détecté dans les dépendances');
  }
  
  return sorted;
}
```

## 🤖 Intégration Background Agent

### Principe

**IMPÉRATIF:** Identifier et planifier les tâches pouvant être exécutées en arrière-plan avec le Background Agent de Cursor.

**Référence:** `@Docs Cursor Background Agent` - Documentation officielle Cursor

### 1. Identification des Tâches Background

**TOUJOURS:**
- ✅ Identifier tâches pouvant être exécutées en arrière-plan
- ✅ Identifier tâches différées non bloquantes
- ✅ Identifier tâches de longue durée (> 5 minutes)

**Critères pour Background Agent:**
- ✅ Tâche non bloquante pour suite du workflow
- ✅ Tâche de longue durée (> 5 minutes)
- ✅ Tâche indépendante (pas de dépendances critiques)
- ✅ Tâche pouvant être reprise après interruption

**Pattern:**
```typescript
// Identifier tâches pour Background Agent
function identifyBackgroundTasks(subtasks: Subtask[]): BackgroundTask[] {
  return subtasks
    .filter(subtask => {
      return (
        !subtask.isBlocking &&
        subtask.estimatedDuration > 5 * 60 * 1000 && // > 5 minutes
        !subtask.hasCriticalDependencies &&
        subtask.canResumeAfterInterruption
      );
    })
    .map(subtask => ({
      subtask,
      priority: calculateBackgroundPriority(subtask),
      estimatedDuration: subtask.estimatedDuration
    }));
}
```

### 2. Planification des Tâches Différées

**TOUJOURS:**
- ✅ Planifier exécution en arrière-plan
- ✅ Gérer état et reprise après interruption
- ✅ Surveiller progression des tâches background

**Pattern:**
```typescript
// Planifier tâches background
async function planBackgroundTasks(
  backgroundTasks: BackgroundTask[],
  context: Context
): Promise<BackgroundPlan> {
  // 1. Prioriser tâches background
  const prioritized = prioritizeBackgroundTasks(backgroundTasks);
  
  // 2. Planifier exécution
  const plan = prioritized.map(task => ({
    task,
    schedule: calculateSchedule(task, context),
    state: {
      status: 'pending',
      checkpoint: null,
      resumeAfterInterruption: true
    }
  }));
  
  // 3. Sauvegarder plan
  await saveBackgroundPlan(plan, context);
  
  return { plan, totalTasks: plan.length };
}
```

### 3. Gestion de l'État et de la Reprise

**TOUJOURS:**
- ✅ Sauvegarder état régulièrement (checkpoints)
- ✅ Reprendre après interruption
- ✅ Gérer erreurs et récupération

**Pattern:**
```typescript
// Gestion état et reprise
async function executeBackgroundTaskWithResume(
  task: BackgroundTask,
  context: Context
): Promise<BackgroundResult> {
  let state = await loadBackgroundState(task.id, context);
  
  // 1. Reprendre depuis checkpoint si interruption
  if (state.status === 'interrupted' && state.checkpoint) {
    state = await resumeFromCheckpoint(task, state.checkpoint, context);
  }
  
  // 2. Exécuter avec checkpoints réguliers
  const result = await executeWithCheckpoints(
    task,
    state,
    context,
    {
      checkpointInterval: 5 * 60 * 1000, // Toutes les 5 minutes
      onCheckpoint: async (checkpoint) => {
        await saveBackgroundState(task.id, checkpoint, context);
      }
    }
  );
  
  // 3. Sauvegarder état final
  await saveBackgroundState(task.id, { status: 'completed', result }, context);
  
  return result;
}
```

## 📋 Listes de Tâches Structurées

### Principe

**IMPÉRATIF:** Générer automatiquement des listes de tâches structurées avec dépendances explicites comme recommandé par Cursor.

**Référence:** `@Docs Cursor Agent Planning` - Documentation officielle Cursor

### 1. Génération Automatique de Listes de Tâches

**TOUJOURS:**
- ✅ Générer listes de tâches avec dépendances
- ✅ Structurer selon pensée séquentielle
- ✅ Inclure métadonnées (priorité, durée, rôles)

**Pattern:**
```typescript
// Générer liste de tâches structurée
async function generateStructuredTaskList(
  task: Task,
  context: Context
): Promise<StructuredTaskList> {
  // 1. Décomposer avec pensée séquentielle
  const subtasks = await decomposeWithSequentialThinking(task, analyzeComplexity(task, context), context);
  
  // 2. Résoudre dépendances
  const orderedSubtasks = resolveDependencies(subtasks);
  
  // 3. Générer liste structurée
  const taskList: StructuredTaskList = {
    mainTask: task,
    subtasks: orderedSubtasks.map((subtask, index) => ({
      id: subtask.id,
      order: index + 1,
      description: subtask.description,
      dependsOn: subtask.dependsOn,
      priority: calculatePriority(subtask, context),
      estimatedDuration: subtask.estimatedDuration,
      roles: subtask.roles,
      files: subtask.files,
      validations: subtask.validations,
      canRunInBackground: subtask.canRunInBackground
    })),
    totalDuration: calculateTotalDuration(orderedSubtasks),
    criticalPath: identifyCriticalPath(orderedSubtasks)
  };
  
  return taskList;
}
```

### 2. Mise en File d'Attente des Messages

**TOUJOURS:**
- ✅ Mettre en file d'attente messages pour tâches de longue haleine
- ✅ Gérer priorité des messages
- ✅ Surveiller progression

**Pattern:**
```typescript
// Mise en file d'attente
async function queueMessagesForLongRunningTasks(
  taskList: StructuredTaskList,
  context: Context
): Promise<MessageQueue> {
  const queue: QueuedMessage[] = [];
  
  for (const subtask of taskList.subtasks) {
    if (subtask.estimatedDuration > 10 * 60 * 1000) { // > 10 minutes
      queue.push({
        subtask,
        priority: subtask.priority,
        scheduledAt: calculateSchedule(subtask, context),
        status: 'pending',
        progress: 0
      });
    }
  }
  
  // Trier par priorité
  queue.sort((a, b) => b.priority - a.priority);
  
  await saveMessageQueue(queue, context);
  
  return { queue, totalMessages: queue.length };
}
```

### 3. Suivi Structuré des Tâches de Longue Haleine

**TOUJOURS:**
- ✅ Suivre progression de chaque tâche
- ✅ Documenter checkpoints réguliers
- ✅ Gérer interruptions et reprise

**Pattern:**
```typescript
// Suivi structuré
async function trackLongRunningTask(
  subtask: Subtask,
  context: Context
): Promise<TrackingResult> {
  const tracking = {
    subtaskId: subtask.id,
    startTime: Date.now(),
    checkpoints: [] as Checkpoint[],
    progress: 0,
    status: 'running' as const
  };
  
  // 1. Exécuter avec suivi
  const result = await executeWithTracking(
    subtask,
    tracking,
    context,
    {
      onProgress: async (progress) => {
        tracking.progress = progress;
        await saveTracking(tracking, context);
      },
      onCheckpoint: async (checkpoint) => {
        tracking.checkpoints.push(checkpoint);
        await saveTracking(tracking, context);
      }
    }
  );
  
  // 2. Finaliser suivi
  tracking.status = 'completed';
  tracking.endTime = Date.now();
  await saveTracking(tracking, context);
  
  return { tracking, result };
}
```

## 🔄 Workflow de Décomposition

### Workflow: Décomposer Tâche Complexe

**Étapes:**
1. **Analyser complexité** : Évaluer si décomposition nécessaire
2. **Décomposer avec pensée séquentielle** : Créer étapes logiques
3. **Valider taille** : Vérifier taille optimale de chaque sous-tâche
4. **Résoudre dépendances** : Ordonner selon dépendances
5. **Identifier tâches background** : Identifier opportunités Background Agent
6. **Générer liste structurée** : Créer liste avec dépendances
7. **Planifier exécution** : Planifier ordre et parallélisation

**Pattern:**
```typescript
// Workflow complet de décomposition
async function decomposeComplexTask(
  task: Task,
  context: Context
): Promise<DecompositionResult> {
  // 1. Analyser complexité
  const complexity = analyzeComplexity(task, context);
  
  // 2. Détecter nécessité de décomposition
  if (!shouldDecompose(task)) {
    return { subtasks: [task], structured: false };
  }
  
  // 3. Décomposer avec pensée séquentielle
  const subtasks = await decomposeWithSequentialThinking(task, complexity, context);
  
  // 4. Valider et re-décomposer si nécessaire
  const validatedSubtasks = await Promise.all(
    subtasks.map(async (subtask) => {
      if (!validateSubtaskSize(subtask)) {
        return await autoDecomposeTask(subtask, context);
      }
      return [subtask];
    })
  );
  
  const allSubtasks = validatedSubtasks.flat();
  
  // 5. Résoudre dépendances
  const orderedSubtasks = resolveDependencies(allSubtasks);
  
  // 6. Identifier tâches background
  const backgroundTasks = identifyBackgroundTasks(orderedSubtasks);
  
  // 7. Générer liste structurée
  const structuredList = await generateStructuredTaskList(
    { ...task, subtasks: orderedSubtasks },
    context
  );
  
  // 8. Planifier exécution
  const executionPlan = await planExecution(
    orderedSubtasks,
    backgroundTasks,
    context
  );
  
  return {
    subtasks: orderedSubtasks,
    structured: true,
    structuredList,
    backgroundTasks,
    executionPlan
  };
}
```

## ⚠️ Règles de Décomposition

### Ne Jamais:

**BLOQUANT:**
- ❌ Créer sous-tâches > 50 lignes de code
- ❌ Créer sous-tâches > 3 fichiers modifiés
- ❌ Ignorer dépendances entre sous-tâches
- ❌ Ne pas valider taille avant création
- ❌ Ne pas utiliser pensée séquentielle
- ❌ Ne pas générer listes structurées avec dépendances
- ❌ Ignorer opportunités Background Agent

**TOUJOURS:**
- ✅ Valider taille optimale avant création
- ✅ Utiliser pensée séquentielle pour décomposition
- ✅ Générer listes structurées avec dépendances
- ✅ Identifier opportunités Background Agent
- ✅ Valider chaque étape avant la suivante
- ✅ Gérer dépendances explicitement
- ✅ Re-décomposer si sous-tâche trop complexe

## 📊 Checklist Décomposition

### Avant Décomposition

- [ ] Analyser complexité de la tâche
- [ ] Détecter nécessité de décomposition
- [ ] Identifier étapes logiques séquentielles
- [ ] Identifier dépendances

### Pendant Décomposition

- [ ] Décomposer avec pensée séquentielle
- [ ] Valider taille de chaque sous-tâche
- [ ] Re-décomposer si sous-tâche trop complexe
- [ ] Résoudre dépendances
- [ ] Identifier tâches background

### Après Décomposition

- [ ] Générer liste structurée avec dépendances
- [ ] Planifier exécution
- [ ] Mettre en file d'attente messages si nécessaire
- [ ] Documenter décomposition

## 🔗 Références

### Documentation Cursor Officielle

- `@Docs Cursor Agent Planning` - Planification et décomposition des tâches
- `@Docs Cursor Sequential Thinking` - Pensée séquentielle
- `@Docs Cursor Background Agent` - Exécution en arrière-plan

### Règles Intégrées

- `@.cursor/rules/senior-architect-oversight.md` - Supervision architecte sénior (décomposition dans `decomposeRequest()` et `createInitialTodos()`)
- `@.cursor/rules/autonomous-workflows.md` - Workflows autonomes (décomposition améliorée)
- `@.cursor/rules/parallel-execution.md` - Exécution parallèle (intégration Background Agent)

---

**Note:** Cette règle garantit une décomposition optimale des tâches complexes selon les recommandations officielles de Cursor, avec intégration du Background Agent et pensée séquentielle.

**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

