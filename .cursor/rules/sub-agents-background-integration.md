<!-- 
Context: sub-agents, background-agent, persistence, state-management, interruption-recovery
Priority: P1
Auto-load: when task requires background execution or long-running tasks with sub-agents
Dependencies: core.md, sub-agents-orchestration.md, persistent-execution.md, task-decomposition.md
-->

# Système de Sub-Agents - Intégration Background Agent - Saxium

**Objectif:** Intégrer le Background Agent de Cursor avec le système de sub-agents pour permettre l'exécution de tâches différées, la gestion d'état persistante et la reprise après interruption.

**Référence:** [Cursor Rules Documentation](https://docs.cursor.com/context/rules)  
**Référence:** [Cursor Background Agent Documentation](https://docs.cursor.com/guides/background-agent)  
**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

## 🎯 Principe Fondamental

**IMPÉRATIF:** Le système de sub-agents DOIT intégrer le Background Agent de Cursor pour identifier les tâches différées, gérer l'état persistante et reprendre après interruption.

**Bénéfices:**
- ✅ Exécution de tâches différées non bloquantes
- ✅ Gestion d'état persistante pour runs longs
- ✅ Reprise automatique après interruption
- ✅ Surveillance de progression des tâches background
- ✅ Optimisation des ressources

**Référence:** `@.cursor/rules/sub-agents-orchestration.md` - Orchestration principale  
**Référence:** `@.cursor/rules/persistent-execution.md` - Exécution persistante  
**Référence:** `@.cursor/rules/task-decomposition.md` - Décomposition des tâches

## 📋 Fonctionnalités d'Intégration

### 1. Identification des Tâches pour Background Agent

**IMPÉRATIF:** Identifier automatiquement les tâches pouvant être exécutées en arrière-plan.

**TOUJOURS:**
- ✅ Identifier tâches non bloquantes
- ✅ Identifier tâches de longue durée (> 5 minutes)
- ✅ Identifier tâches indépendantes
- ✅ Identifier tâches pouvant être reprises après interruption

**Pattern:**
```typescript
// Identifier tâches pour Background Agent
async function identifyBackgroundTasks(
  plan: ExecutionPlan,
  context: Context
): Promise<BackgroundTask[]> {
  const backgroundTasks: BackgroundTask[] = [];
  
  for (const step of plan.steps) {
    // 1. Vérifier critères pour Background Agent
    const isBackgroundCandidate = await checkBackgroundCriteria(step, context);
    
    if (isBackgroundCandidate) {
      backgroundTasks.push({
        stepId: step.order,
        role: step.role,
        action: step.action,
        subtasks: step.subtasks,
        estimatedDuration: step.estimatedTime,
        canResumeAfterInterruption: true,
        isBlocking: false,
        priority: calculateBackgroundPriority(step, context)
      });
    }
  }
  
  return backgroundTasks;
}

// Vérifier critères Background Agent
async function checkBackgroundCriteria(
  step: ExecutionStep,
  context: Context
): Promise<boolean> {
  // 1. Tâche non bloquante
  if (step.isBlocking) return false;
  
  // 2. Tâche de longue durée (> 5 minutes)
  if (step.estimatedTime < 5 * 60 * 1000) return false;
  
  // 3. Tâche indépendante (pas de dépendances critiques)
  if (step.dependsOn.some(dep => isCriticalDependency(dep, context))) {
    return false;
  }
  
  // 4. Tâche pouvant être reprise après interruption
  if (!step.canResumeAfterInterruption) return false;
  
  return true;
}
```

**Critères pour Background Agent:**
- ✅ Tâche non bloquante pour suite du workflow
- ✅ Tâche de longue durée (> 5 minutes)
- ✅ Tâche indépendante (pas de dépendances critiques)
- ✅ Tâche pouvant être reprise après interruption
- ✅ Tâche avec état sauvegardable

### 2. Gestion d'État Persistante

**IMPÉRATIF:** Gérer l'état persistante pour permettre la reprise après interruption.

**TOUJOURS:**
- ✅ Sauvegarder état régulièrement (checkpoints)
- ✅ Sauvegarder état avant interruption
- ✅ Restaurer état après interruption
- ✅ Gérer état par rôle et par tâche

**Pattern:**
```typescript
// Gérer état persistante
class BackgroundStateManager {
  private readonly CHECKPOINT_INTERVAL = 5 * 60 * 1000; // 5 minutes
  
  async saveState(
    taskId: string,
    role: Role,
    state: BackgroundState,
    context: Context
  ): Promise<void> {
    // 1. Créer checkpoint
    const checkpoint: Checkpoint = {
      taskId,
      role,
      timestamp: Date.now(),
      state,
      progress: state.progress || 0,
      completedSubtasks: state.completedSubtasks || [],
      remainingSubtasks: state.remainingSubtasks || []
    };
    
    // 2. Sauvegarder dans fichier JSON
    await saveCheckpoint(checkpoint, context);
    
    // 3. Mettre à jour état coordination
    await updateCoordinationState({
      taskId,
      role,
      checkpoint: checkpoint.id,
      status: 'running'
    }, context);
  }
  
  async loadState(
    taskId: string,
    role: Role,
    context: Context
  ): Promise<BackgroundState | null> {
    // 1. Charger dernier checkpoint
    const checkpoint = await loadLastCheckpoint(taskId, role, context);
    
    if (!checkpoint) {
      return null;
    }
    
    // 2. Restaurer état
    return {
      ...checkpoint.state,
      checkpointId: checkpoint.id,
      restoredAt: Date.now()
    };
  }
  
  async createCheckpoint(
    taskId: string,
    role: Role,
    state: BackgroundState,
    context: Context
  ): Promise<void> {
    // Créer checkpoint régulier
    await this.saveState(taskId, role, state, context);
    
    // Logger checkpoint
    logger.info('Checkpoint créé', {
      metadata: {
        taskId,
        role,
        progress: state.progress,
        checkpointInterval: this.CHECKPOINT_INTERVAL
      }
    });
  }
}
```

### 3. Reprise après Interruption

**IMPÉRATIF:** Reprendre automatiquement l'exécution après interruption.

**TOUJOURS:**
- ✅ Détecter interruption
- ✅ Charger dernier checkpoint
- ✅ Reprendre depuis checkpoint
- ✅ Valider état restauré
- ✅ Continuer exécution

**Pattern:**
```typescript
// Reprendre après interruption
async function resumeAfterInterruption(
  taskId: string,
  role: Role,
  context: Context
): Promise<ResumeResult> {
  // 1. Charger état sauvegardé
  const stateManager = new BackgroundStateManager();
  const savedState = await stateManager.loadState(taskId, role, context);
  
  if (!savedState) {
    // Pas d'état sauvegardé, démarrer depuis le début
    return {
      resumed: false,
      reason: 'No saved state found',
      startFromBeginning: true
    };
  }
  
  // 2. Valider état restauré
  const validation = await validateRestoredState(savedState, context);
  if (!validation.valid) {
    // État invalide, démarrer depuis le début
    logger.warn('État restauré invalide, démarrage depuis le début', {
      metadata: {
        taskId,
        role,
        validationErrors: validation.errors
      }
    });
    
    return {
      resumed: false,
      reason: 'Invalid restored state',
      startFromBeginning: true,
      validationErrors: validation.errors
    };
  }
  
  // 3. Reprendre depuis checkpoint
  logger.info('Reprise depuis checkpoint', {
    metadata: {
      taskId,
      role,
      checkpointId: savedState.checkpointId,
      progress: savedState.progress
    }
  });
  
  // 4. Continuer exécution
  const result = await continueExecutionFromCheckpoint(
    taskId,
    role,
    savedState,
    context
  );
  
  return {
    resumed: true,
    checkpointId: savedState.checkpointId,
    progress: savedState.progress,
    result
  };
}
```

### 4. Surveillance de Progression

**IMPÉRATIF:** Surveiller la progression des tâches background.

**TOUJOURS:**
- ✅ Suivre progression de chaque tâche
- ✅ Détecter stagnation
- ✅ Détecter erreurs
- ✅ Notifier progression aux autres rôles

**Pattern:**
```typescript
// Surveiller progression
class BackgroundProgressMonitor {
  private progressHistory: Map<string, ProgressEntry[]> = new Map();
  
  async monitorProgress(
    taskId: string,
    role: Role,
    context: Context
  ): Promise<MonitoringResult> {
    // 1. Charger progression actuelle
    const currentProgress = await getCurrentProgress(taskId, role, context);
    
    // 2. Ajouter à historique
    const history = this.progressHistory.get(`${taskId}-${role}`) || [];
    history.push({
      timestamp: Date.now(),
      progress: currentProgress.progress,
      status: currentProgress.status
    });
    this.progressHistory.set(`${taskId}-${role}`, history);
    
    // 3. Détecter stagnation
    const stagnation = detectStagnation(history);
    if (stagnation.detected) {
      logger.warn('Stagnation détectée', {
        metadata: {
          taskId,
          role,
          stagnationDuration: stagnation.duration
        }
      });
      
      // Notifier autres rôles
      await notifyStagnation(taskId, role, stagnation, context);
    }
    
    // 4. Détecter erreurs
    if (currentProgress.status === 'error') {
      logger.error('Erreur détectée dans tâche background', {
        metadata: {
          taskId,
          role,
          error: currentProgress.error
        }
      });
      
      // Notifier autres rôles
      await notifyError(taskId, role, currentProgress.error, context);
    }
    
    // 5. Notifier progression
    await notifyProgress(taskId, role, currentProgress, context);
    
    return {
      progress: currentProgress.progress,
      status: currentProgress.status,
      stagnation,
      errors: currentProgress.status === 'error' ? [currentProgress.error] : []
    };
  }
}
```

## 🔄 Workflow d'Intégration Background Agent

### Workflow Complet

1. **Identifier tâches background** → Selon critères
2. **Planifier exécution background** → Priorisation et scheduling
3. **Sauvegarder état initial** → Checkpoint initial
4. **Exécuter tâches background** → Avec checkpoints réguliers
5. **Surveiller progression** → Détection stagnation/erreurs
6. **Gérer interruption** → Sauvegarde état et reprise
7. **Consolider résultats** → Résultats finaux

**Pattern:**
```typescript
// Workflow complet d'intégration Background Agent
async function executeWithBackgroundAgent(
  plan: ExecutionPlan,
  context: Context
): Promise<BackgroundExecutionResult> {
  // 1. Identifier tâches background
  const backgroundTasks = await identifyBackgroundTasks(plan, context);
  
  // 2. Planifier exécution background
  const backgroundPlan = await planBackgroundExecution(
    backgroundTasks,
    context
  );
  
  // 3. Exécuter tâches foreground (bloquantes)
  const foregroundResults = await executeForegroundTasks(plan, context);
  
  // 4. Exécuter tâches background (non bloquantes)
  const backgroundResults = await executeBackgroundTasks(
    backgroundPlan,
    context
  );
  
  // 5. Consolider résultats
  return {
    foreground: foregroundResults,
    background: backgroundResults,
    totalDuration: calculateTotalDuration(foregroundResults, backgroundResults)
  };
}
```

## ⚠️ Règles d'Intégration Background Agent

### TOUJOURS:

- ✅ Identifier tâches pour Background Agent
- ✅ Sauvegarder état régulièrement (checkpoints)
- ✅ Gérer reprise après interruption
- ✅ Surveiller progression des tâches background
- ✅ Notifier progression aux autres rôles
- ✅ Gérer erreurs et récupération

### NE JAMAIS:

- ❌ Exécuter tâches bloquantes en background
- ❌ Ignorer sauvegarde d'état
- ❌ Ne pas gérer reprise après interruption
- ❌ Ignorer stagnation détectée
- ❌ Ne pas notifier progression

## 🔗 Références

### Règles Intégrées

- `@.cursor/rules/sub-agents-orchestration.md` - Orchestration principale
- `@.cursor/rules/persistent-execution.md` - Exécution persistante
- `@.cursor/rules/task-decomposition.md` - Décomposition des tâches

### Documentation Cursor

- `@Docs Cursor Background Agent` - Documentation officielle Background Agent

---

**Note:** Ce fichier définit l'intégration du Background Agent de Cursor avec le système de sub-agents pour l'exécution de tâches différées et la gestion d'état persistante.

**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

