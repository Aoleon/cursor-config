<!-- 
Context: tool-calls, limits, workaround, checkpointing, continuation, optimization
Priority: P1
Auto-load: when tool calls approach limit (> 800), when long-running tasks detected
Dependencies: core.md, quality-principles.md, persistent-execution.md, task-decomposition.md, timeout-management.md
Description: "Contournement de la limite de 1000 tool calls avec checkpointing et continuation intelligente"
Tags: tool-calls, limits, checkpointing, continuation, optimization
Score: 90
-->

# Contournement Limite 1000 Tool Calls - Saxium

**Objectif:** Contourner la limite de 1000 tool calls de Cursor en implémentant un système de checkpointing, continuation intelligente et optimisation des tool calls.

**Référence:** [Cursor Rules Documentation](https://docs.cursor.com/context/rules)  
**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

## 🎯 Principe Fondamental

**IMPÉRATIF:** L'agent DOIT détecter l'approche de la limite de 1000 tool calls et implémenter automatiquement un contournement avec checkpointing et continuation.

**Problème identifié:** L'agent s'arrête après 1000 tool calls, même s'il reste des tâches à accomplir.

**Solution:** Système de checkpointing automatique, continuation intelligente, et optimisation des tool calls.

**Bénéfices:**
- ✅ Continuation au-delà de 1000 tool calls
- ✅ Checkpointing automatique pour reprise
- ✅ Optimisation des tool calls
- ✅ Batching intelligent des opérations
- ✅ Reprise transparente après limite

**Référence:** `@.cursor/rules/persistent-execution.md` - Exécution persistante  
**Référence:** `@.cursor/rules/task-decomposition.md` - Décomposition des tâches  
**Référence:** `@.cursor/rules/timeout-management.md` - Gestion des timeouts  
**Référence:** `@.cursor/rules/cursor-limits-workaround.md` - Système unifié de contournement (intègre cette règle)

## 📋 Règles de Contournement

### 1. Détection Proactive de l'Approche de la Limite

**IMPÉRATIF:** L'agent DOIT surveiller le nombre de tool calls et détecter l'approche de la limite.

**TOUJOURS:**
- ✅ Surveiller nombre de tool calls en temps réel
- ✅ Détecter approche de limite (> 800 tool calls)
- ✅ Alerter si limite proche (> 900 tool calls)
- ✅ Préparer checkpoint automatique si limite critique (> 950 tool calls)

**Pattern:**
```typescript
// Surveillance proactive des tool calls
interface ToolCallMonitor {
  currentCount: number;
  limit: number;
  threshold: {
    warning: number; // 800
    critical: number; // 900
    emergency: number; // 950
  };
  checkpoints: Checkpoint[];
}

class ToolCallLimitMonitor {
  private monitor: ToolCallMonitor = {
    currentCount: 0,
    limit: 1000,
    threshold: {
      warning: 800,
      critical: 900,
      emergency: 950
    },
    checkpoints: []
  };
  
  async trackToolCall(toolName: string, context: Context): Promise<void> {
    this.monitor.currentCount++;
    
    // 1. Détecter approche de limite
    if (this.monitor.currentCount >= this.monitor.threshold.emergency) {
      await this.handleEmergencyLimit(context);
    } else if (this.monitor.currentCount >= this.monitor.threshold.critical) {
      await this.handleCriticalLimit(context);
    } else if (this.monitor.currentCount >= this.monitor.threshold.warning) {
      await this.handleWarningLimit(context);
    }
  }
  
  async handleWarningLimit(context: Context): Promise<void> {
    logger.warn('Approche limite tool calls', {
      metadata: {
        current: this.monitor.currentCount,
        limit: this.monitor.limit,
        remaining: this.monitor.limit - this.monitor.currentCount
      }
    });
    
    // Optimiser tool calls restants
    await this.optimizeRemainingToolCalls(context);
  }
  
  async handleCriticalLimit(context: Context): Promise<void> {
    logger.warn('Limite critique tool calls approchée', {
      metadata: {
        current: this.monitor.currentCount,
        limit: this.monitor.limit,
        remaining: this.monitor.limit - this.monitor.currentCount
      }
    });
    
    // Créer checkpoint automatique
    await this.createAutomaticCheckpoint(context);
    
    // Optimiser agressivement tool calls
    await this.optimizeAggressively(context);
  }
  
  async handleEmergencyLimit(context: Context): Promise<void> {
    logger.error('Limite d\'urgence tool calls atteinte', {
      metadata: {
        current: this.monitor.currentCount,
        limit: this.monitor.limit,
        remaining: this.monitor.limit - this.monitor.currentCount
      }
    });
    
    // Créer checkpoint d'urgence
    const checkpoint = await this.createEmergencyCheckpoint(context);
    
    // Préparer continuation
    await this.prepareContinuation(checkpoint, context);
  }
}
```

### 2. Checkpointing Automatique

**IMPÉRATIF:** L'agent DOIT créer des checkpoints automatiques avant d'atteindre la limite.

**TOUJOURS:**
- ✅ Créer checkpoint à 900 tool calls (critique)
- ✅ Créer checkpoint à 950 tool calls (urgence)
- ✅ Sauvegarder état complet (todos, contexte, progression)
- ✅ Documenter checkpoint pour reprise

**Pattern:**
```typescript
// Checkpointing automatique
interface Checkpoint {
  id: string;
  timestamp: number;
  toolCallCount: number;
  todos: Todo[];
  context: ContextSnapshot;
  progress: ProgressSnapshot;
  nextSteps: NextStep[];
  continuationInstructions: string;
}

async function createAutomaticCheckpoint(
  context: Context
): Promise<Checkpoint> {
  // 1. Capturer état complet
  const checkpoint: Checkpoint = {
    id: generateCheckpointId(),
    timestamp: Date.now(),
    toolCallCount: getCurrentToolCallCount(),
    todos: await getTodos(),
    context: {
      currentTask: context.currentTask,
      completedTasks: context.completedTasks,
      pendingTasks: context.pendingTasks,
      errors: context.errors,
      warnings: context.warnings
    },
    progress: {
      completionRate: calculateCompletionRate(context),
      completedTodos: context.completedTodos.length,
      totalTodos: context.totalTodos,
      currentPhase: identifyCurrentPhase(context)
    },
    nextSteps: await identifyNextSteps(context),
    continuationInstructions: generateContinuationInstructions(context)
  };
  
  // 2. Sauvegarder checkpoint
  await saveCheckpoint(checkpoint, context);
  
  // 3. Créer fichier de continuation
  await createContinuationFile(checkpoint, context);
  
  logger.info('Checkpoint créé automatiquement', {
    metadata: {
      checkpointId: checkpoint.id,
      toolCallCount: checkpoint.toolCallCount,
      completionRate: checkpoint.progress.completionRate
    }
  });
  
  return checkpoint;
}

async function createEmergencyCheckpoint(
  context: Context
): Promise<Checkpoint> {
  // Checkpoint d'urgence avec instructions de continuation explicites
  const checkpoint = await createAutomaticCheckpoint(context);
  
  // Ajouter instructions de continuation explicites
  checkpoint.continuationInstructions = `
# CONTINUATION URGENTE - Limite Tool Calls Atteinte

**Checkpoint ID:** ${checkpoint.id}
**Tool Calls:** ${checkpoint.toolCallCount}/1000
**Completion:** ${(checkpoint.progress.completionRate * 100).toFixed(1)}%

## État Actuel

**Todos:**
${checkpoint.todos.map(t => `- [${t.status}] ${t.content}`).join('\n')}

**Prochaine Étape:** ${checkpoint.nextSteps[0]?.description || 'Voir instructions ci-dessous'}

## Instructions de Continuation

1. **Reprendre depuis checkpoint:** Utiliser \`@.cursor/checkpoints/${checkpoint.id}.md\`
2. **Continuer tâches:** Exécuter todos restants dans l'ordre
3. **Vérifier état:** Valider que tous les todos sont complétés
4. **Finaliser:** Compléter toutes les tâches restantes

**IMPORTANT:** Ne pas recréer les todos déjà complétés. Continuer uniquement les todos restants.
  `;
  
  await saveCheckpoint(checkpoint, context);
  await createContinuationFile(checkpoint, context);
  
  return checkpoint;
}
```

### 3. Optimisation Agressive des Tool Calls

**IMPÉRATIF:** L'agent DOIT optimiser agressivement les tool calls restants pour maximiser l'efficacité.

**TOUJOURS:**
- ✅ Batch les opérations similaires
- ✅ Combiner recherches multiples en une seule
- ✅ Utiliser cache pour éviter recherches redondantes
- ✅ Paralléliser opérations indépendantes
- ✅ Éliminer tool calls non essentiels

**Pattern:**
```typescript
// Optimisation agressive des tool calls
async function optimizeAggressively(
  context: Context
): Promise<OptimizationResult> {
  const optimizations: Optimization[] = [];
  
  // 1. Batch opérations similaires
  const batchedOperations = await batchSimilarOperations(context);
  if (batchedOperations.saved > 0) {
    optimizations.push({
      type: 'batching',
      saved: batchedOperations.saved,
      description: `Batching de ${batchedOperations.count} opérations`
    });
  }
  
  // 2. Combiner recherches multiples
  const combinedSearches = await combineMultipleSearches(context);
  if (combinedSearches.saved > 0) {
    optimizations.push({
      type: 'search-combination',
      saved: combinedSearches.saved,
      description: `Combinaison de ${combinedSearches.count} recherches`
    });
  }
  
  // 3. Utiliser cache pour recherches redondantes
  const cachedResults = await useCacheForRedundantSearches(context);
  if (cachedResults.saved > 0) {
    optimizations.push({
      type: 'cache-usage',
      saved: cachedResults.saved,
      description: `Cache utilisé pour ${cachedResults.count} recherches`
    });
  }
  
  // 4. Paralléliser opérations indépendantes
  const parallelized = await parallelizeIndependentOperations(context);
  if (parallelized.saved > 0) {
    optimizations.push({
      type: 'parallelization',
      saved: parallelized.saved,
      description: `Parallélisation de ${parallelized.count} opérations`
    });
  }
  
  // 5. Éliminer tool calls non essentiels
  const eliminated = await eliminateNonEssentialToolCalls(context);
  if (eliminated.saved > 0) {
    optimizations.push({
      type: 'elimination',
      saved: eliminated.saved,
      description: `Élimination de ${eliminated.count} tool calls non essentiels`
    });
  }
  
  const totalSaved = optimizations.reduce((sum, opt) => sum + opt.saved, 0);
  
  return {
    optimizations,
    totalSaved,
    estimatedRemaining: getCurrentToolCallCount() - totalSaved
  };
}
```

### 4. Continuation Intelligente

**IMPÉRATIF:** L'agent DOIT pouvoir continuer après avoir atteint la limite en reprenant depuis le checkpoint.

**TOUJOURS:**
- ✅ Détecter checkpoint existant au démarrage
- ✅ Reprendre depuis dernier checkpoint
- ✅ Continuer todos restants
- ✅ Valider état avant continuation
- ✅ Documenter continuation

**Pattern:**
```typescript
// Continuation intelligente après limite
async function continueAfterLimit(
  context: Context
): Promise<ContinuationResult> {
  // 1. Détecter checkpoint existant
  const checkpoint = await findLatestCheckpoint(context);
  
  if (!checkpoint) {
    return {
      continued: false,
      reason: 'No checkpoint found'
    };
  }
  
  // 2. Valider checkpoint
  const validation = await validateCheckpoint(checkpoint, context);
  if (!validation.valid) {
    return {
      continued: false,
      reason: 'Checkpoint invalid',
      errors: validation.errors
    };
  }
  
  // 3. Restaurer état depuis checkpoint
  const restoredState = await restoreStateFromCheckpoint(checkpoint, context);
  
  // 4. Continuer todos restants
  const remainingTodos = checkpoint.todos.filter(
    t => t.status === 'pending' || t.status === 'in_progress'
  );
  
  logger.info('Reprise depuis checkpoint', {
    metadata: {
      checkpointId: checkpoint.id,
      remainingTodos: remainingTodos.length,
      completionRate: checkpoint.progress.completionRate
    }
  });
  
  // 5. Exécuter todos restants
  const continuationResult = await executeRemainingTodos(
    remainingTodos,
    restoredState,
    context
  );
  
  // 6. Documenter continuation
  await documentContinuation(checkpoint, continuationResult, context);
  
  return {
    continued: true,
    checkpoint,
    restoredState,
    continuationResult,
    completed: continuationResult.allCompleted
  };
}

// Détection automatique au démarrage
async function detectAndResumeCheckpoint(
  context: Context
): Promise<boolean> {
  const checkpoint = await findLatestCheckpoint(context);
  
  if (checkpoint && checkpoint.progress.completionRate < 1.0) {
    logger.info('Checkpoint détecté, reprise automatique', {
      metadata: {
        checkpointId: checkpoint.id,
        completionRate: checkpoint.progress.completionRate
      }
    });
    
    await continueAfterLimit(context);
    return true;
  }
  
  return false;
}
```

### 5. Batching Intelligent des Tool Calls

**IMPÉRATIF:** L'agent DOIT batch intelligemment les tool calls pour réduire le nombre total.

**TOUJOURS:**
- ✅ Grouper recherches similaires
- ✅ Combiner lectures de fichiers indépendants
- ✅ Batch opérations de validation
- ✅ Optimiser ordre des tool calls

**Pattern:**
```typescript
// Batching intelligent des tool calls
class ToolCallBatcher {
  private batchQueue: Map<string, ToolCall[]> = new Map();
  private batchSize: number = 5;
  private batchTimeout: number = 1000; // 1 seconde
  
  async addToBatch(
    toolCall: ToolCall,
    context: Context
  ): Promise<ToolCallResult> {
    const batchKey = this.getBatchKey(toolCall);
    
    // 1. Ajouter à queue de batch
    if (!this.batchQueue.has(batchKey)) {
      this.batchQueue.set(batchKey, []);
    }
    this.batchQueue.get(batchKey)!.push(toolCall);
    
    // 2. Si batch plein, exécuter
    if (this.batchQueue.get(batchKey)!.length >= this.batchSize) {
      return await this.executeBatch(batchKey, context);
    }
    
    // 3. Sinon, attendre timeout ou batch plein
    return await this.waitAndExecuteBatch(batchKey, context);
  }
  
  private getBatchKey(toolCall: ToolCall): string {
    // Grouper par type et similarité
    if (toolCall.type === 'read_file') {
      return `read_file:${toolCall.params.length}`;
    }
    if (toolCall.type === 'codebase_search') {
      return `codebase_search:${toolCall.params.query.substring(0, 50)}`;
    }
    return toolCall.type;
  }
  
  private async executeBatch(
    batchKey: string,
    context: Context
  ): Promise<ToolCallResult> {
    const batch = this.batchQueue.get(batchKey)!;
    this.batchQueue.delete(batchKey);
    
    // Exécuter batch en parallèle
    const results = await Promise.all(
      batch.map(tc => this.executeToolCall(tc, context))
    );
    
    logger.info('Batch exécuté', {
      metadata: {
        batchKey,
        batchSize: batch.length,
        saved: batch.length - 1 // -1 car on compte le batch comme 1 tool call
      }
    });
    
    return results[0]; // Retourner premier résultat
  }
}
```

### 6. Scripts Externes pour Opérations Longues

**IMPÉRATIF:** L'agent DOIT utiliser des scripts externes pour les opérations longues qui nécessitent beaucoup de tool calls.

**TOUJOURS:**
- ✅ Identifier opérations nécessitant beaucoup de tool calls
- ✅ Créer scripts externes pour ces opérations
- ✅ Exécuter scripts au lieu de tool calls multiples
- ✅ Intégrer résultats des scripts

**Pattern:**
```typescript
// Utiliser scripts externes pour opérations longues
async function useExternalScriptForLongOperation(
  operation: LongOperation,
  context: Context
): Promise<ScriptResult> {
  // 1. Estimer tool calls nécessaires
  const estimatedToolCalls = await estimateToolCallsForOperation(
    operation,
    context
  );
  
  // 2. Si > 100 tool calls, utiliser script externe
  if (estimatedToolCalls > 100) {
    // 3. Créer script externe
    const script = await createExternalScript(operation, context);
    
    // 4. Exécuter script (1 tool call au lieu de 100+)
    const result = await run_terminal_cmd(
      `node scripts/${script.name}.js`,
      context
    );
    
    // 5. Intégrer résultats
    const integrated = await integrateScriptResults(result, context);
    
    logger.info('Script externe utilisé pour opération longue', {
      metadata: {
        operation: operation.name,
        estimatedToolCalls,
        actualToolCalls: 1,
        saved: estimatedToolCalls - 1
      }
    });
    
    return integrated;
  }
  
  // 6. Sinon, exécuter normalement
  return await executeOperationNormally(operation, context);
}
```

## 🔄 Workflow de Contournement

### Workflow: Contourner Limite 1000 Tool Calls

**Étapes:**
1. **Surveillance Continue** : Surveiller nombre de tool calls
2. **Détection Approche Limite** : Détecter à 800, 900, 950 tool calls
3. **Optimisation Agressive** : Optimiser tool calls restants
4. **Checkpointing Automatique** : Créer checkpoint à 900/950
5. **Continuation Préparée** : Préparer instructions de continuation
6. **Reprise Automatique** : Reprendre depuis checkpoint si limite atteinte

**Pattern:**
```typescript
async function workaroundToolCallLimit(
  context: Context
): Promise<WorkaroundResult> {
  const monitor = new ToolCallLimitMonitor();
  
  // 1. Surveiller tool calls
  await monitor.trackToolCall('current', context);
  
  // 2. Si approche limite, optimiser
  if (monitor.isApproachingLimit()) {
    const optimization = await optimizeAggressively(context);
    
    // 3. Si toujours proche limite, créer checkpoint
    if (monitor.isCritical()) {
      const checkpoint = await createAutomaticCheckpoint(context);
      
      // 4. Préparer continuation
      await prepareContinuation(checkpoint, context);
      
      return {
        optimized: true,
        checkpointCreated: true,
        checkpoint,
        optimization,
        continuationReady: true
      };
    }
    
    return {
      optimized: true,
      checkpointCreated: false,
      optimization
    };
  }
  
  return {
    optimized: false,
    checkpointCreated: false
  };
}
```

## ⚠️ Règles de Contournement

### Ne Jamais:

**BLOQUANT:**
- ❌ Ignorer approche de limite
- ❌ Ne pas créer checkpoint avant limite
- ❌ Ne pas optimiser tool calls restants
- ❌ Ne pas préparer continuation

**TOUJOURS:**
- ✅ Surveiller nombre de tool calls
- ✅ Détecter approche de limite
- ✅ Optimiser agressivement si nécessaire
- ✅ Créer checkpoint automatique
- ✅ Préparer continuation
- ✅ Reprendre depuis checkpoint si limite atteinte

## 📊 Checklist Contournement

### Surveillance Continue

- [ ] Surveiller nombre de tool calls en temps réel
- [ ] Détecter approche de limite (> 800)
- [ ] Alerter si limite proche (> 900)

### Optimisation Agressive

- [ ] Batch opérations similaires
- [ ] Combiner recherches multiples
- [ ] Utiliser cache pour recherches redondantes
- [ ] Paralléliser opérations indépendantes
- [ ] Éliminer tool calls non essentiels

### Checkpointing

- [ ] Créer checkpoint à 900 tool calls
- [ ] Créer checkpoint d'urgence à 950 tool calls
- [ ] Sauvegarder état complet
- [ ] Documenter checkpoint

### Continuation

- [ ] Détecter checkpoint au démarrage
- [ ] Valider checkpoint
- [ ] Restaurer état depuis checkpoint
- [ ] Continuer todos restants
- [ ] Documenter continuation

## 🔗 Références

- `@.cursor/rules/persistent-execution.md` - Exécution persistante
- `@.cursor/rules/task-decomposition.md` - Décomposition des tâches
- `@.cursor/rules/timeout-management.md` - Gestion des timeouts
- `@.cursor/rules/parallel-execution.md` - Exécution parallèle
- `@.cursor/rules/batch-processing.md` - Traitement par lots

---

**Note:** Cette règle garantit que l'agent peut continuer au-delà de la limite de 1000 tool calls grâce au checkpointing automatique et à la continuation intelligente.

**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

