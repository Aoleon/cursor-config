# Exécution Persistante - Saxium

**Objectif:** Garantir que l'agent continue l'exécution sans interruption jusqu'à completion complète, même pour des runs très longs (plusieurs heures)

## 🎯 Principe Fondamental

**IMPÉRATIF:** L'agent DOIT continuer l'exécution jusqu'à completion complète, sans s'arrêter prématurément, même pour des runs de plusieurs heures.

**Problème identifié:** L'agent s'arrête régulièrement après 30-45 minutes maximum ou après 1000 tool calls, même s'il reste des tâches à accomplir.

**Solution:** Mécanismes stricts de vérification, continuation forcée, gestion proactive de la persistance, et contournement de la limite de 1000 tool calls avec checkpointing automatique.

**Référence:** `@.cursor/rules/tool-call-limit-workaround.md` - Contournement limite 1000 tool calls (IMPÉRATIF)

## 📋 Règles d'Exécution Persistante

### 1. Vérification Obligatoire Avant TOUT Arrêt

**IMPÉRATIF:** Avant TOUT arrêt, l'agent DOIT vérifier systématiquement :

**TOUJOURS:**
- ✅ Vérifier état de TOUS les todos (in_progress, pending, completed)
- ✅ Vérifier erreurs TypeScript non résolues
- ✅ Vérifier tests qui échouent
- ✅ Vérifier fonctionnalités incomplètes
- ✅ Vérifier problèmes détectés non résolus
- ✅ Vérifier validation complète réussie
- ✅ Vérifier qu'il n'y a pas de tâches en attente
- ✅ Vérifier qu'il n'y a pas de dépendances non satisfaites
- ✅ Vérifier qu'il n'y a pas de checkpoints en attente
- ✅ Vérifier qu'il n'y a pas de corrections en cours
- ✅ Vérifier nombre de tool calls (< 1000)
- ✅ Créer checkpoint automatique si tool calls > 900

**Pattern:**
```typescript
// Vérification exhaustive avant arrêt
async function checkBeforeStopping(): Promise<StopCheckResult> {
  const checks: CheckResult[] = [];
  
  // 1. Vérifier todos
  const todos = await getTodos();
  const incompleteTodos = todos.filter(t => 
    t.status === 'in_progress' || t.status === 'pending'
  );
  checks.push({
    name: 'todos',
    passed: incompleteTodos.length === 0,
    details: incompleteTodos.length > 0 ? {
      incompleteCount: incompleteTodos.length,
      todos: incompleteTodos.map(t => ({ id: t.id, content: t.content, status: t.status }))
    } : null
  });
  
  // 2. Vérifier erreurs TypeScript
  const tsErrors = await detectTypeScriptErrors();
  checks.push({
    name: 'typescript',
    passed: tsErrors.length === 0,
    details: tsErrors.length > 0 ? { errors: tsErrors } : null
  });
  
  // 3. Vérifier tests
  const testFailures = await detectTestFailures();
  checks.push({
    name: 'tests',
    passed: testFailures.length === 0,
    details: testFailures.length > 0 ? { failures: testFailures } : null
  });
  
  // 4. Vérifier fonctionnalités incomplètes
  const incompleteFeatures = await detectIncompleteFeatures();
  checks.push({
    name: 'features',
    passed: incompleteFeatures.length === 0,
    details: incompleteFeatures.length > 0 ? { features: incompleteFeatures } : null
  });
  
  // 5. Vérifier problèmes non résolus
  const unresolvedIssues = await detectUnresolvedIssues();
  checks.push({
    name: 'issues',
    passed: unresolvedIssues.length === 0,
    details: unresolvedIssues.length > 0 ? { issues: unresolvedIssues } : null
  });
  
  // 6. Vérifier validation complète
  const validation = await validateCompletely();
  checks.push({
    name: 'validation',
    passed: validation.perfect,
    details: !validation.perfect ? { issues: validation.issues } : null
  });
  
  // 7. Vérifier tâches en attente
  const pendingTasks = await detectPendingTasks();
  checks.push({
    name: 'pending-tasks',
    passed: pendingTasks.length === 0,
    details: pendingTasks.length > 0 ? { tasks: pendingTasks } : null
  });
  
  // 8. Vérifier dépendances non satisfaites
  const unsatisfiedDependencies = await detectUnsatisfiedDependencies();
  checks.push({
    name: 'dependencies',
    passed: unsatisfiedDependencies.length === 0,
    details: unsatisfiedDependencies.length > 0 ? { dependencies: unsatisfiedDependencies } : null
  });
  
  // 9. Vérifier checkpoints en attente
  const pendingCheckpoints = await detectPendingCheckpoints();
  checks.push({
    name: 'checkpoints',
    passed: pendingCheckpoints.length === 0,
    details: pendingCheckpoints.length > 0 ? { checkpoints: pendingCheckpoints } : null
  });
  
  // 10. Vérifier corrections en cours
  const inProgressCorrections = await detectInProgressCorrections();
  checks.push({
    name: 'corrections',
    passed: inProgressCorrections.length === 0,
    details: inProgressCorrections.length > 0 ? { corrections: inProgressCorrections } : null
  });
  
  // Résultat global
  const allPassed = checks.every(c => c.passed);
  const failedChecks = checks.filter(c => !c.passed);
  
  return {
    canStop: allPassed,
    checks,
    failedChecks,
    reason: allPassed ? 'Toutes les vérifications passées' : `Échec de ${failedChecks.length} vérification(s)`,
    details: failedChecks.map(c => ({ name: c.name, details: c.details }))
  };
}
```

### 2. Continuation Forcée si Vérifications Échouent

**IMPÉRATIF:** Si une vérification échoue, l'agent DOIT continuer automatiquement sans s'arrêter.

**TOUJOURS:**
- ✅ Si vérification échoue, continuer automatiquement
- ✅ Identifier tâches à accomplir
- ✅ Prioriser tâches selon criticité
- ✅ Exécuter tâches prioritaires immédiatement
- ✅ Ne pas s'arrêter tant que toutes les vérifications ne passent pas
- ✅ Documenter raison de continuation

**Pattern:**
```typescript
// Continuation forcée si vérifications échouent
async function forceContinuationIfNeeded(
  stopCheck: StopCheckResult
): Promise<ContinuationResult> {
  if (stopCheck.canStop) {
    return {
      continued: false,
      reason: 'Toutes les vérifications passées, peut s\'arrêter'
    };
  }
  
  // 1. Identifier tâches à accomplir
  const tasksToDo = identifyTasksFromFailedChecks(stopCheck.failedChecks);
  
  // 2. Prioriser tâches selon criticité
  const prioritizedTasks = prioritizeTasksByCriticality(tasksToDo);
  
  // 3. Exécuter tâches prioritaires
  logger.warn('Continuation forcée', {
    metadata: {
      failedChecks: stopCheck.failedChecks.length,
      tasksToDo: tasksToDo.length,
      prioritizedTasks: prioritizedTasks.length
    }
  });
  
  // 4. Exécuter tâches
  for (const task of prioritizedTasks) {
    await executeTask(task);
    
    // Re-vérifier après chaque tâche
    const recheck = await checkBeforeStopping();
    if (recheck.canStop) {
      return {
        continued: true,
        completed: true,
        tasksExecuted: prioritizedTasks.length,
        reason: 'Toutes les vérifications passées après continuation'
      };
    }
  }
  
  // 5. Si toujours des échecs, continuer avec prochaines tâches
  return {
    continued: true,
    completed: false,
    tasksExecuted: prioritizedTasks.length,
    remainingTasks: tasksToDo.length - prioritizedTasks.length,
    reason: 'Continuation en cours, tâches restantes à accomplir'
  };
}
```

### 3. Détection Proactive des Signes d'Arrêt Prématuré

**IMPÉRATIF:** Détecter automatiquement les signes d'arrêt prématuré et forcer la continuation.

**TOUJOURS:**
- ✅ Détecter si l'agent semble vouloir s'arrêter prématurément
- ✅ Détecter si le temps d'exécution est court (< 30 min) avec tâches restantes
- ✅ Détecter si l'agent n'a pas vérifié tous les todos
- ✅ Détecter si l'agent n'a pas validé complètement
- ✅ Détecter si l'agent n'a pas itéré jusqu'à perfection
- ✅ Détecter si l'agent mentionne des "prochaines étapes" ou "étapes suivantes" dans sa réponse
- ✅ Détecter si l'agent annonce qu'il y a des tâches restantes sans les exécuter
- ✅ Détecter si l'agent mentionne qu'il va faire quelque chose "ensuite" ou "plus tard"
- ✅ Forcer continuation si signes détectés
- ✅ Forcer planification et exécution automatique si prochaines étapes mentionnées

**Pattern:**
```typescript
// Détection proactive des signes d'arrêt prématuré
async function detectPrematureStopSigns(
  executionState: ExecutionState,
  context: Context
): Promise<PrematureStopDetection> {
  const signs: PrematureStopSign[] = [];
  
  // 1. Vérifier temps d'exécution
  const executionTime = Date.now() - executionState.startTime;
  const hasRemainingTasks = executionState.remainingTasks.length > 0;
  if (executionTime < 30 * 60 * 1000 && hasRemainingTasks) { // < 30 min
    signs.push({
      type: 'short-execution-time',
      severity: 'high',
      details: {
        executionTime: executionTime,
        remainingTasks: executionState.remainingTasks.length
      }
    });
  }
  
  // 2. Vérifier si todos non vérifiés
  const todosChecked = executionState.todosChecked;
  const todos = await getTodos();
  if (!todosChecked && todos.length > 0) {
    signs.push({
      type: 'todos-not-checked',
      severity: 'critical',
      details: {
        todosCount: todos.length
      }
    });
  }
  
  // 3. Vérifier si validation complète non effectuée
  const validationPerformed = executionState.validationPerformed;
  if (!validationPerformed) {
    signs.push({
      type: 'validation-not-performed',
      severity: 'critical',
      details: {}
    });
  }
  
  // 4. Vérifier si itération non complète
  const iterationComplete = executionState.iterationComplete;
  if (!iterationComplete && executionState.hasIssues) {
    signs.push({
      type: 'iteration-incomplete',
      severity: 'high',
      details: {
        issues: executionState.issues.length
      }
    });
  }
  
  // 5. Vérifier si tâches en attente non traitées
  const pendingTasksProcessed = executionState.pendingTasksProcessed;
  const pendingTasks = await detectPendingTasks();
  if (!pendingTasksProcessed && pendingTasks.length > 0) {
    signs.push({
      type: 'pending-tasks-not-processed',
      severity: 'high',
      details: {
        pendingTasks: pendingTasks.length
      }
    });
  }
  
  // 6. Détecter mentions de "prochaines étapes" dans la réponse de l'agent
  const agentResponse = context.lastAgentResponse || '';
  const mentionsNextSteps = detectMentionsOfNextSteps(agentResponse);
  const mentionsRemainingTasks = detectMentionsOfRemainingTasks(agentResponse);
  const mentionsFutureActions = detectMentionsOfFutureActions(agentResponse);
  
  if (mentionsNextSteps.detected || mentionsRemainingTasks.detected || mentionsFutureActions.detected) {
    signs.push({
      type: 'next-steps-mentioned',
      severity: 'critical',
      details: {
        mentionsNextSteps: mentionsNextSteps.detected,
        mentionsRemainingTasks: mentionsRemainingTasks.detected,
        mentionsFutureActions: mentionsFutureActions.detected,
        detectedPhrases: [
          ...mentionsNextSteps.phrases,
          ...mentionsRemainingTasks.phrases,
          ...mentionsFutureActions.phrases
        ]
      }
    });
  }
  
  return {
    detected: signs.length > 0,
    signs,
    requiresContinuation: signs.some(s => s.severity === 'critical' || s.severity === 'high'),
    nextStepsMentions: {
      mentionsNextSteps,
      mentionsRemainingTasks,
      mentionsFutureActions
    }
  };
}

// Détecter mentions de "prochaines étapes"
function detectMentionsOfNextSteps(response: string): DetectionResult {
  const patterns = [
    /prochaines étapes?/i,
    /étapes? suivantes?/i,
    /prochaine étape/i,
    /étape suivante/i,
    /next steps?/i,
    /following steps?/i,
    /prochaines actions?/i,
    /actions? suivantes?/i
  ];
  
  const detected = patterns.some(pattern => pattern.test(response));
  const phrases = patterns
    .map(pattern => response.match(pattern))
    .filter(match => match !== null)
    .map(match => match![0]);
  
  return { detected, phrases };
}

// Détecter mentions de tâches restantes
function detectMentionsOfRemainingTasks(response: string): DetectionResult {
  const patterns = [
    /tâches? restantes?/i,
    /tâches? à faire/i,
    /tâches? à compléter/i,
    /tâches? à réaliser/i,
    /remaining tasks?/i,
    /tasks? to do/i,
    /tasks? to complete/i,
    /il reste/i,
    /il reste encore/i,
    /il faudra/i,
    /il faudrait/i
  ];
  
  const detected = patterns.some(pattern => pattern.test(response));
  const phrases = patterns
    .map(pattern => response.match(pattern))
    .filter(match => match !== null)
    .map(match => match![0]);
  
  return { detected, phrases };
}

// Détecter mentions d'actions futures
function detectMentionsOfFutureActions(response: string): DetectionResult {
  const patterns = [
    /ensuite/i,
    /plus tard/i,
    /dans un second temps/i,
    /par la suite/i,
    /ultérieurement/i,
    /then/i,
    /later/i,
    /afterwards/i,
    /subsequently/i
  ];
  
  const detected = patterns.some(pattern => pattern.test(response));
  const phrases = patterns
    .map(pattern => response.match(pattern))
    .filter(match => match !== null)
    .map(match => match![0]);
  
  return { detected, phrases };
}

// Forcer planification et exécution automatique des prochaines étapes
async function forcePlanAndExecuteNextSteps(
  mentionsNextSteps: DetectionResult,
  mentionsRemainingTasks: DetectionResult,
  mentionsFutureActions: DetectionResult,
  context: Context
): Promise<void> {
  logger.info('Forçage de planification et exécution automatique des prochaines étapes.', {
    metadata: {
      mentionsNextSteps: mentionsNextSteps.detected,
      mentionsRemainingTasks: mentionsRemainingTasks.detected,
      mentionsFutureActions: mentionsFutureActions.detected
    }
  });
  
  // 1. Identifier les prochaines étapes mentionnées
  const nextSteps = await identifyNextStepsFromMentions(
    mentionsNextSteps,
    mentionsRemainingTasks,
    mentionsFutureActions,
    context
  );
  
  // 2. Planifier automatiquement ces étapes
  const plan = await autoPlanNextSteps(nextSteps, context);
  
  // 3. Créer todos pour ces étapes
  const todos = await createTodosForNextSteps(plan, context);
  
  // 4. Exécuter immédiatement ces todos
  await executeTodosImmediately(todos, context);
  
  // 5. Vérifier que toutes les étapes sont complétées
  const allCompleted = await verifyAllStepsCompleted(todos, context);
  
  if (!allCompleted) {
    // Si certaines étapes ne sont pas complétées, réitérer
    logger.warn('Certaines étapes ne sont pas complétées, réitération nécessaire.', {
      metadata: { todos: todos.length, completed: todos.filter(t => t.status === 'completed').length }
    });
    
    await forcePlanAndExecuteNextSteps(
      mentionsNextSteps,
      mentionsRemainingTasks,
      mentionsFutureActions,
      context
    );
  }
}
```

### 4. Mécanisme de Keep-Alive pour Runs Longs

**IMPÉRATIF:** Maintenir l'agent actif pendant les runs longs avec mécanismes de keep-alive.

**TOUJOURS:**
- ✅ Sauvegarder état régulièrement (toutes les 5-10 minutes)
- ✅ Créer checkpoint après chaque étape importante
- ✅ Vérifier progression régulièrement
- ✅ Détecter stagnation et forcer progression
- ✅ Maintenir contexte actif même pendant pauses
- ✅ Reprendre automatiquement après interruption

**Pattern:**
```typescript
// Mécanisme de keep-alive pour runs longs
class KeepAliveManager {
  private lastActivity: number = Date.now();
  private checkpoints: Checkpoint[] = [];
  private readonly CHECKPOINT_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private readonly STAGNATION_THRESHOLD = 10 * 60 * 1000; // 10 minutes
  
  async maintainKeepAlive(
    executionState: ExecutionState,
    context: Context
  ): Promise<KeepAliveResult> {
    const now = Date.now();
    const timeSinceLastActivity = now - this.lastActivity;
    
    // 1. Vérifier stagnation
    if (timeSinceLastActivity > this.STAGNATION_THRESHOLD) {
      logger.warn('Stagnation détectée, forcer progression', {
        metadata: {
          timeSinceLastActivity,
          executionState: {
            currentTask: executionState.currentTask,
            completedTasks: executionState.completedTasks.length,
            remainingTasks: executionState.remainingTasks.length
          }
        }
      });
      
      // Forcer progression
      await this.forceProgression(executionState, context);
    }
    
    // 2. Créer checkpoint si nécessaire
    if (timeSinceLastActivity > this.CHECKPOINT_INTERVAL) {
      await this.createCheckpoint(executionState, context);
    }
    
    // 3. Mettre à jour dernière activité
    this.lastActivity = now;
    
    return {
      active: true,
      lastActivity: this.lastActivity,
      checkpoints: this.checkpoints.length
    };
  }
  
  async createCheckpoint(
    executionState: ExecutionState,
    context: Context
  ): Promise<void> {
    const checkpoint: Checkpoint = {
      id: generateCheckpointId(),
      timestamp: Date.now(),
      executionState,
      context,
      todos: await getTodos(),
      issues: await detectAllIssues(),
      validation: await validateCompletely()
    };
    
    this.checkpoints.push(checkpoint);
    await persistCheckpoint(checkpoint);
    
    logger.info('Checkpoint créé', {
      metadata: {
        checkpointId: checkpoint.id,
        checkpointsCount: this.checkpoints.length
      }
    });
  }
  
  async forceProgression(
    executionState: ExecutionState,
    context: Context
  ): Promise<void> {
    // 1. Identifier prochaine tâche
    const nextTask = executionState.remainingTasks[0];
    if (!nextTask) {
      return;
    }
    
    // 2. Exécuter prochaine tâche
    logger.info('Progression forcée', {
      metadata: {
        taskId: nextTask.id,
        taskContent: nextTask.content
      }
    });
    
    await executeTask(nextTask);
    
    // 3. Mettre à jour état
    executionState.completedTasks.push(nextTask.id);
    executionState.remainingTasks = executionState.remainingTasks.slice(1);
    executionState.currentTask = null;
    this.lastActivity = Date.now();
  }
}
```

### 5. Gestion de la Mémoire et du Contexte pour Runs Longs

**IMPÉRATIF:** Gérer intelligemment la mémoire et le contexte pour éviter saturation pendant runs longs.

**TOUJOURS:**
- ✅ Optimiser contexte régulièrement (toutes les 15-20 minutes)
- ✅ Nettoyer contexte obsolète
- ✅ Conserver uniquement contexte essentiel
- ✅ Sauvegarder contexte important dans checkpoints
- ✅ Restaurer contexte depuis checkpoints si nécessaire
- ✅ Éviter saturation du contexte

**Pattern:**
```typescript
// Gestion de la mémoire et du contexte pour runs longs
class ContextManager {
  private readonly MAX_CONTEXT_SIZE = 50; // Maximum 50 fichiers en contexte
  private readonly OPTIMIZATION_INTERVAL = 15 * 60 * 1000; // 15 minutes
  private lastOptimization: number = Date.now();
  
  async optimizeContextForLongRun(
    currentContext: Context,
    executionState: ExecutionState
  ): Promise<OptimizedContext> {
    const now = Date.now();
    const timeSinceLastOptimization = now - this.lastOptimization;
    
    // 1. Optimiser si nécessaire
    if (timeSinceLastOptimization > this.OPTIMIZATION_INTERVAL) {
      return await this.optimizeContext(currentContext, executionState);
    }
    
    // 2. Vérifier taille contexte
    if (currentContext.files.length > this.MAX_CONTEXT_SIZE) {
      return await this.optimizeContext(currentContext, executionState);
    }
    
    return {
      context: currentContext,
      optimized: false
    };
  }
  
  async optimizeContext(
    currentContext: Context,
    executionState: ExecutionState
  ): Promise<OptimizedContext> {
    // 1. Identifier fichiers essentiels
    const essentialFiles = identifyEssentialFiles(
      currentContext.files,
      executionState
    );
    
    // 2. Sauvegarder contexte non essentiel dans checkpoint
    const nonEssentialFiles = currentContext.files.filter(
      f => !essentialFiles.includes(f)
    );
    await saveContextToCheckpoint(nonEssentialFiles, executionState);
    
    // 3. Nettoyer contexte
    const optimizedContext: Context = {
      ...currentContext,
      files: essentialFiles,
      metadata: {
        ...currentContext.metadata,
        optimizedAt: Date.now(),
        savedToCheckpoint: nonEssentialFiles.length
      }
    };
    
    this.lastOptimization = Date.now();
    
    logger.info('Contexte optimisé', {
      metadata: {
        originalSize: currentContext.files.length,
        optimizedSize: essentialFiles.length,
        savedToCheckpoint: nonEssentialFiles.length
      }
    });
    
    return {
      context: optimizedContext,
      optimized: true
    };
  }
  
  async restoreContextFromCheckpoint(
    checkpointId: string,
    currentContext: Context
  ): Promise<Context> {
    // 1. Charger checkpoint
    const checkpoint = await loadCheckpoint(checkpointId);
    if (!checkpoint) {
      return currentContext;
    }
    
    // 2. Restaurer contexte sauvegardé
    const restoredContext: Context = {
      ...currentContext,
      files: [
        ...currentContext.files,
        ...checkpoint.context.files
      ],
      metadata: {
        ...currentContext.metadata,
        restoredFromCheckpoint: checkpointId,
        restoredAt: Date.now()
      }
    };
    
    logger.info('Contexte restauré depuis checkpoint', {
      metadata: {
        checkpointId,
        restoredFiles: checkpoint.context.files.length
      }
    });
    
    return restoredContext;
  }
}
```

### 6. Workflow d'Exécution Persistante

**IMPÉRATIF:** Workflow complet pour garantir exécution persistante sans interruption.

**Pattern:**
```typescript
// Workflow d'exécution persistante
async function persistentExecutionWorkflow(
  plan: ExecutionPlan,
  context: Context
): Promise<ExecutionResult> {
  const keepAliveManager = new KeepAliveManager();
  const contextManager = new ContextManager();
  const executionState: ExecutionState = {
    planId: plan.id,
    startTime: Date.now(),
    currentTask: null,
    completedTasks: [],
    remainingTasks: plan.tasks,
    todosChecked: false,
    validationPerformed: false,
    iterationComplete: false,
    hasIssues: false,
    issues: [],
    pendingTasksProcessed: false
  };
  
  // Boucle principale d'exécution
  while (executionState.remainingTasks.length > 0 || !executionState.todosChecked) {
    // 1. Maintenir keep-alive
    await keepAliveManager.maintainKeepAlive(executionState, context);
    
    // 2. Optimiser contexte si nécessaire
    const optimizedContext = await contextManager.optimizeContextForLongRun(
      context,
      executionState
    );
    context = optimizedContext.context;
    
    // 3. Détecter signes d'arrêt prématuré
    const prematureStopSigns = await detectPrematureStopSigns(
      executionState,
      context
    );
    
    if (prematureStopSigns.detected && prematureStopSigns.requiresContinuation) {
      logger.warn('Signes d\'arrêt prématuré détectés, forcer continuation', {
        metadata: {
          signs: prematureStopSigns.signs
        }
      });
      
      // Si prochaines étapes mentionnées, forcer planification et exécution
      if (prematureStopSigns.nextStepsMentions) {
        const { mentionsNextSteps, mentionsRemainingTasks, mentionsFutureActions } = prematureStopSigns.nextStepsMentions;
        
        if (mentionsNextSteps.detected || mentionsRemainingTasks.detected || mentionsFutureActions.detected) {
          logger.warn('Prochaines étapes mentionnées, forcer planification et exécution automatique.', {
            metadata: {
              mentionsNextSteps: mentionsNextSteps.detected,
              mentionsRemainingTasks: mentionsRemainingTasks.detected,
              mentionsFutureActions: mentionsFutureActions.detected
            }
          });
          
          await forcePlanAndExecuteNextSteps(
            mentionsNextSteps,
            mentionsRemainingTasks,
            mentionsFutureActions,
            context
          );
        }
      }
      
      // Forcer continuation
      await forceContinuationFromSigns(prematureStopSigns, executionState, context);
    }
    
    // 4. Exécuter prochaine tâche
    if (executionState.remainingTasks.length > 0) {
      const task = executionState.remainingTasks[0];
      executionState.currentTask = task.id;
      
      // Exécuter tâche
      const result = await executeTask(task, context);
      
      // Mettre à jour état
      executionState.completedTasks.push(task.id);
      executionState.remainingTasks = executionState.remainingTasks.slice(1);
      executionState.currentTask = null;
      
      // Sauvegarder état
      await saveExecutionState(executionState);
    }
    
    // 5. Vérifier avant arrêt (toutes les 5 tâches)
    if (executionState.completedTasks.length % 5 === 0) {
      const stopCheck = await checkBeforeStopping();
      
      if (!stopCheck.canStop) {
        // Forcer continuation
        const continuation = await forceContinuationIfNeeded(stopCheck);
        
        if (continuation.continued) {
          logger.info('Continuation forcée', {
            metadata: {
              reason: continuation.reason,
              tasksExecuted: continuation.tasksExecuted
            }
          });
        }
      } else {
        // Marquer todos comme vérifiés
        executionState.todosChecked = true;
        
        // Valider complètement
        const validation = await validateCompletely();
        executionState.validationPerformed = true;
        executionState.iterationComplete = validation.perfect;
        
        if (validation.perfect) {
          // Toutes les vérifications passent, peut s'arrêter
          break;
        } else {
          // Itérer jusqu'à perfection
          await iterateToPerfection(executionState, context);
          executionState.iterationComplete = true;
        }
      }
    }
  }
  
  // 6. Vérification finale avant arrêt
  const finalCheck = await checkBeforeStopping();
  if (!finalCheck.canStop) {
    // Forcer continuation finale
    await forceContinuationIfNeeded(finalCheck);
    
    // Re-vérifier
    const recheck = await checkBeforeStopping();
    if (!recheck.canStop) {
      logger.error('Impossible de s\'arrêter, vérifications échouent', {
        metadata: {
          failedChecks: recheck.failedChecks
        }
      });
      
      // Continuer quand même avec prochaines tâches
      return await persistentExecutionWorkflow(plan, context);
    }
  }
  
  return {
    success: true,
    completed: true,
    executionTime: Date.now() - executionState.startTime,
    completedTasks: executionState.completedTasks.length,
    totalTasks: plan.tasks.length
  };
}
```

## ⚠️ Règles Anti-Interruption Strictes

### Ne Jamais S'Arrêter Si:

**BLOQUANT:**
- ❌ Les vérifications exhaustives avant arrêt échouent
- ❌ Le temps d'exécution est court (< 30-45 minutes) et des tâches restent
- ❌ Des todos sont `in_progress` ou `pending`
- ❌ L'itération n'est pas complète (erreurs, tests échoués, fonctionnalités incomplètes)
- ❌ Des erreurs non récupérables sont présentes
- ❌ Des conflits non résolus sont présents
- ❌ Des bugs potentiels non traités sont présents
- ❌ Le plan d'exécution n'est pas entièrement complété
- ❌ Les validations multi-rôles ne sont pas toutes réussies
- ❌ Le contexte est saturé ou non optimisé
- ❌ Une stagnation est détectée sans action forcée
- ❌ L'agent mentionne des "prochaines étapes" ou "étapes suivantes" dans sa réponse
- ❌ L'agent annonce qu'il y a des tâches restantes sans les exécuter
- ❌ L'agent mentionne qu'il va faire quelque chose "ensuite" ou "plus tard"
- ❌ L'agent mentionne des actions futures sans les planifier et exécuter immédiatement

**TOUJOURS:**
- ✅ Forcer la continuation et l'auto-correction en cas d'échec
- ✅ Maintenir les mécanismes de keep-alive et de sauvegarde
- ✅ Documenter les raisons d'un arrêt (uniquement si toutes les vérifications sont réussies)
- ✅ Sauvegarder l'état final avant un arrêt validé
- ✅ Détecter automatiquement les mentions de "prochaines étapes" et forcer planification/exécution
- ✅ Planifier automatiquement les prochaines étapes mentionnées
- ✅ Exécuter immédiatement les prochaines étapes planifiées
- ✅ Ne jamais s'arrêter si des prochaines étapes sont mentionnées

## ⚠️ Règles Anti-Interruption Strictes (Ancien)

### Ne JAMAIS S'Arrêter Si:

**BLOQUANT (Arrêt interdit):**
- ❌ Il reste des todos `in_progress` ou `pending`
- ❌ Il reste des erreurs TypeScript non résolues
- ❌ Il reste des tests qui échouent
- ❌ Il reste des fonctionnalités incomplètes
- ❌ La validation complète n'a pas été effectuée
- ❌ L'itération jusqu'à perfection n'est pas complète
- ❌ Il reste des problèmes non résolus
- ❌ Il reste des tâches en attente
- ❌ Il reste des dépendances non satisfaites
- ❌ Le temps d'exécution est court (< 30 min) avec tâches restantes
- ❌ Les vérifications avant arrêt n'ont pas toutes été effectuées
- ❌ Les signes d'arrêt prématuré sont détectés

**TOUJOURS:**
- ✅ Vérifier exhaustivement avant TOUT arrêt
- ✅ Forcer continuation si vérifications échouent
- ✅ Détecter signes d'arrêt prématuré
- ✅ Maintenir keep-alive pendant runs longs
- ✅ Optimiser contexte régulièrement
- ✅ Sauvegarder état régulièrement
- ✅ Continuer jusqu'à completion complète
- ✅ Documenter raison de continuation

## 📊 Checklist Exécution Persistante

### Avant TOUT Arrêt

- [ ] Vérifier état de TOUS les todos (in_progress, pending, completed)
- [ ] Vérifier erreurs TypeScript non résolues
- [ ] Vérifier tests qui échouent
- [ ] Vérifier fonctionnalités incomplètes
- [ ] Vérifier problèmes détectés non résolus
- [ ] Vérifier validation complète réussie
- [ ] Vérifier qu'il n'y a pas de tâches en attente
- [ ] Vérifier qu'il n'y a pas de dépendances non satisfaites
- [ ] Vérifier qu'il n'y a pas de checkpoints en attente
- [ ] Vérifier qu'il n'y a pas de corrections en cours
- [ ] Vérifier temps d'exécution (si < 30 min avec tâches restantes, continuer)
- [ ] Vérifier signes d'arrêt prématuré
- [ ] Vérifier qu'aucune mention de "prochaines étapes" n'a été détectée dans la réponse
- [ ] Vérifier qu'aucune mention de tâches restantes n'a été détectée
- [ ] Vérifier qu'aucune mention d'actions futures n'a été détectée
- [ ] Si des mentions sont détectées, planifier et exécuter automatiquement
- [ ] Si une vérification échoue, forcer continuation automatiquement

### Pendant l'Exécution

- [ ] Maintenir keep-alive régulièrement (toutes les 5 minutes)
- [ ] Créer checkpoint après chaque étape importante
- [ ] Optimiser contexte régulièrement (toutes les 15 minutes)
- [ ] Détecter stagnation et forcer progression
- [ ] Sauvegarder état régulièrement
- [ ] Vérifier progression régulièrement
- [ ] Détecter signes d'arrêt prématuré
- [ ] Détecter mentions de "prochaines étapes" dans la réponse
- [ ] Planifier automatiquement les prochaines étapes si mentionnées
- [ ] Exécuter immédiatement les prochaines étapes planifiées
- [ ] Forcer continuation si nécessaire

### En Cas de Stagnation

- [ ] Détecter stagnation (> 10 min sans activité)
- [ ] Identifier prochaine tâche à accomplir
- [ ] Forcer exécution de la prochaine tâche
- [ ] Mettre à jour dernière activité
- [ ] Continuer avec tâches suivantes

## 🔗 Références

- `@.cursor/rules/todo-completion.md` - Completion des todos
- `@.cursor/rules/iterative-perfection.md` - Itération jusqu'à perfection
- `@.cursor/rules/long-term-autonomy.md` - Autonomie longue durée
- `@.cursor/rules/autonomous-workflows.md` - Workflows autonomes
- `@.cursor/rules/context-optimization.md` - Optimisation du contexte

---

**Note:** Ces règles garantissent que l'agent continue l'exécution sans interruption jusqu'à completion complète, même pour des runs très longs (plusieurs heures).


