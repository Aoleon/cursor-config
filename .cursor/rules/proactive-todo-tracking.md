# Suivi Proactif des Todos - Saxium

<!-- 
Context: todo-tracking, proactive-monitoring, automatic-detection, progress-tracking, completion-automation
Priority: P1
Auto-load: when task requires todo tracking, progress monitoring, or automatic completion detection
Dependencies: todo-completion.md, intelligent-todo-planning.md, memory-management-advanced.md, persistent-execution.md
-->

**Objectif:** Doter l'agent de capacités de suivi proactif des todos pour détecter automatiquement blocages, anticiper retards, suggérer optimisations et garantir completion complète de tous les todos.

**Référence:** [Cursor Rules Documentation](https://docs.cursor.com/context/rules)  
**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

## 🎯 Principe Fondamental

**IMPÉRATIF:** L'agent DOIT suivre proactivement l'état de tous les todos, détecter problèmes avant qu'ils deviennent critiques et garantir completion 100% avant arrêt.

**Bénéfices:**
- ✅ Détection précoce blocages
- ✅ Anticipation retards
- ✅ Intervention proactive
- ✅ Optimisation continue progression
- ✅ Garantie completion complète
- ✅ 0 todos orphelins ou oubliés

**Référence:** `@.cursor/rules/todo-completion.md` - Completion todos  
**Référence:** `@.cursor/rules/intelligent-todo-planning.md` - Planification intelligente  
**Référence:** `@.cursor/rules/memory-management-advanced.md` - Gestion mémoire

## 📋 Niveaux de Suivi Proactif

### Niveau 1 : Monitoring Continu (Continuous Monitoring)

**IMPÉRATIF:** Monitorer constamment état de tous les todos.

**TOUJOURS:**
- ✅ Vérifier état tous les todos régulièrement (toutes les 5 min)
- ✅ Tracker temps passé sur todo in_progress
- ✅ Comparer progression vs estimation
- ✅ Détecter stagnation (pas de changement > 10 min)
- ✅ Monitorer dépendances bloquées

**Pattern:**
```typescript
// Monitoring continu todos
interface ContinuousTodoMonitoring {
  todos: MonitoredTodo[];
  currentlyActive: string | null;
  lastUpdate: number;
  progressRate: number; // Todos/heure
  stagnationDetected: boolean;
  alerts: Alert[];
}

interface MonitoredTodo extends Todo {
  startedAt?: number;
  timeSpent?: number;
  lastStatusChange: number;
  progressUpdates: ProgressUpdate[];
  stagnant: boolean;
  blockers: Blocker[];
}

class ContinuousTodoMonitor {
  private monitoringInterval: NodeJS.Timeout;
  private state: ContinuousTodoMonitoring;
  
  // Démarrer monitoring continu
  async startMonitoring(todos: Todo[]): Promise<void> {
    this.state = {
      todos: todos.map(t => ({
        ...t,
        lastStatusChange: Date.now(),
        progressUpdates: [],
        stagnant: false,
        blockers: []
      })),
      currentlyActive: todos.find(t => t.status === 'in_progress')?.id || null,
      lastUpdate: Date.now(),
      progressRate: 0,
      stagnationDetected: false,
      alerts: []
    };
    
    // Monitoring toutes les 2 minutes
    this.monitoringInterval = setInterval(async () => {
      await this.monitor();
    }, 2 * 60 * 1000);
    
    logger.info('Todo Monitoring Started', {
      totalTodos: todos.length,
      monitoringInterval: '2 min'
    });
  }
  
  private async monitor(): Promise<void> {
    // 1. Récupérer état actuel todos
    const currentTodos = await this.getCurrentTodos();
    
    // 2. Détecter changements
    const changes = await this.detectChanges(this.state.todos, currentTodos);
    
    // 3. Mettre à jour monitoring
    await this.updateMonitoring(currentTodos, changes);
    
    // 4. Détecter stagnation
    const stagnation = await this.detectStagnation(currentTodos);
    if (stagnation) {
      await this.handleStagnation(stagnation);
    }
    
    // 5. Détecter blocages
    const blockers = await this.detectBlockers(currentTodos);
    if (blockers.length > 0) {
      await this.handleBlockers(blockers);
    }
    
    // 6. Calculer progression
    const progress = await this.calculateProgress(currentTodos);
    
    // 7. Générer alertes si nécessaire
    await this.generateAlerts(progress, stagnation, blockers);
  }
  
  private async detectStagnation(
    todos: MonitoredTodo[]
  ): Promise<StagnationDetection | null> {
    const inProgress = todos.find(t => t.status === 'in_progress');
    
    if (!inProgress) return null;
    
    const timeSinceLastChange = Date.now() - inProgress.lastStatusChange;
    
    // Stagnation si > 10 min sans changement
    if (timeSinceLastChange > 10 * 60 * 1000) {
      return {
        todo: inProgress,
        timeSinceLastChange,
        possibleCauses: await this.analyzePossibleCauses(inProgress),
        recommendations: await this.generateRecommendations(inProgress)
      };
    }
    
    return null;
  }
}
```

---

### Niveau 2 : Détection Automatique Blocages (Automatic Blocker Detection)

**IMPÉRATIF:** Détecter automatiquement tous types de blocages.

**Types de blocages:**
1. **Dépendance bloquante** - Todo attend autre todo
2. **Ressource manquante** - Fichier, service, API non disponible
3. **Erreur bloquante** - Erreur TypeScript ou runtime
4. **Décision requise** - Besoin choix utilisateur (éviter!)
5. **Complexité excessive** - Todo trop complexe pour exécuter

**Pattern:**
```typescript
// Détection automatique blocages
interface BlockerDetection {
  blockers: Blocker[];
  affectedTodos: string[]; // IDs
  severity: 'low' | 'medium' | 'high' | 'critical';
  resolutions: Resolution[];
}

interface Blocker {
  type: 'dependency' | 'resource' | 'error' | 'decision' | 'complexity';
  description: string;
  affectedTodo: string;
  detectedAt: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  autoResolvable: boolean;
  resolution?: Resolution;
}

class AutoBlockerDetector {
  async detect(todos: MonitoredTodo[]): Promise<BlockerDetection> {
    const blockers: Blocker[] = [];
    
    // 1. Détecter blocages dépendances
    const dependencyBlockers = await this.detectDependencyBlockers(todos);
    blockers.push(...dependencyBlockers);
    
    // 2. Détecter ressources manquantes
    const resourceBlockers = await this.detectResourceBlockers(todos);
    blockers.push(...resourceBlockers);
    
    // 3. Détecter erreurs bloquantes
    const errorBlockers = await this.detectErrorBlockers(todos);
    blockers.push(...errorBlockers);
    
    // 4. Détecter besoins décision
    const decisionBlockers = await this.detectDecisionBlockers(todos);
    blockers.push(...decisionBlockers);
    
    // 5. Détecter complexité excessive
    const complexityBlockers = await this.detectComplexityBlockers(todos);
    blockers.push(...complexityBlockers);
    
    // 6. Proposer résolutions
    const resolutions = await Promise.all(
      blockers.map(b => this.proposeResolution(b, todos))
    );
    
    // 7. Auto-résoudre si possible
    for (let i = 0; i < blockers.length; i++) {
      if (blockers[i].autoResolvable) {
        await this.autoResolve(blockers[i], resolutions[i]);
      }
    }
    
    return {
      blockers,
      affectedTodos: [...new Set(blockers.map(b => b.affectedTodo))],
      severity: this.calculateSeverity(blockers),
      resolutions
    };
  }
  
  private async detectDependencyBlockers(
    todos: MonitoredTodo[]
  ): Promise<Blocker[]> {
    const blockers: Blocker[] = [];
    
    for (const todo of todos) {
      if (todo.status === 'pending' && todo.dependencies?.length > 0) {
        const unmetDependencies = todo.dependencies.filter(depId => {
          const dep = todos.find(t => t.id === depId);
          return dep && dep.status !== 'completed';
        });
        
        if (unmetDependencies.length > 0) {
          blockers.push({
            type: 'dependency',
            description: `Todo "${todo.content}" bloqué par ${unmetDependencies.length} dépendances non-complétées`,
            affectedTodo: todo.id,
            detectedAt: Date.now(),
            severity: 'medium',
            autoResolvable: false // Doit compléter dépendances d'abord
          });
        }
      }
    }
    
    return blockers;
  }
}
```

---

### Niveau 3 : Alertes Intelligentes (Smart Alerts)

**IMPÉRATIF:** Générer alertes intelligentes pour guider agent vers completion.

**Types d'alertes:**
1. **Alerte Stagnation** - Pas de progrès > 10 min
2. **Alerte Retard** - Dépassement estimation > 50%
3. **Alerte Blocage** - Todo bloqué détecté
4. **Alerte Incompletion** - Tentative arrêt avec todos pending
5. **Alerte Qualité** - Tests échouent ou erreurs lint

**Pattern:**
```typescript
// Alertes intelligentes
interface SmartAlert {
  type: 'stagnation' | 'delay' | 'blocker' | 'incompletion' | 'quality';
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  affectedTodos: string[];
  recommendations: Recommendation[];
  autoActions: AutoAction[];
  timestamp: number;
}

class SmartAlertGenerator {
  async generateAlerts(
    monitoring: ContinuousTodoMonitoring,
    context: Context
  ): Promise<SmartAlert[]> {
    const alerts: SmartAlert[] = [];
    
    // Alerte 1: Stagnation
    if (monitoring.stagnationDetected) {
      alerts.push({
        type: 'stagnation',
        severity: 'warning',
        message: 'Stagnation détectée sur todo in_progress',
        affectedTodos: [monitoring.currentlyActive],
        recommendations: [
          'Décomposer todo en sous-tâches plus petites',
          'Rechercher aide dans mémoire long-terme',
          'Utiliser framework résolution problèmes'
        ],
        autoActions: [
          { action: 'search-memory', params: { query: monitoring.currentlyActive } },
          { action: 'suggest-decomposition', params: { todoId: monitoring.currentlyActive } }
        ],
        timestamp: Date.now()
      });
    }
    
    // Alerte 2: Tentative arrêt avec pending
    const pendingTodos = monitoring.todos.filter(t => 
      t.status === 'pending' || t.status === 'in_progress'
    );
    if (pendingTodos.length > 0 && context.attemptingToStop) {
      alerts.push({
        type: 'incompletion',
        severity: 'critical',
        message: `ARRÊT INTERDIT: ${pendingTodos.length} todos non-complétés`,
        affectedTodos: pendingTodos.map(t => t.id),
        recommendations: [
          'Compléter tous les todos avant arrêt',
          'Si vraiment nécessaire, marquer comme cancelled avec raison'
        ],
        autoActions: [
          { action: 'prevent-stop', params: {} },
          { action: 'resume-execution', params: { todoId: pendingTodos[0].id } }
        ],
        timestamp: Date.now()
      });
    }
    
    // Alerte 3: Retard significatif
    const delay = await this.calculateDelay(monitoring);
    if (delay > 0.5) { // > 50% retard
      alerts.push({
        type: 'delay',
        severity: 'error',
        message: `Retard significatif détecté: +${Math.round(delay * 100)}%`,
        affectedTodos: monitoring.todos.filter(t => t.status !== 'completed').map(t => t.id),
        recommendations: [
          'Revoir estimations restantes',
          'Simplifier todos si possible',
          'Paralléliser todos indépendants'
        ],
        autoActions: [
          { action: 'reestimate', params: {} },
          { action: 'suggest-simplification', params: {} }
        ],
        timestamp: Date.now()
      });
    }
    
    return alerts;
  }
}
```

---

### Niveau 4 : Completion Proactive (Proactive Completion)

**IMPÉRATIF:** Compléter proactivement todos dès que critères satisfaits.

**TOUJOURS:**
- ✅ Détecter automatiquement quand todo est complété (même sans update explicite)
- ✅ Valider completion avec critères objectifs
- ✅ Marquer completed automatiquement si validé
- ✅ Mettre à jour plan et passer au suivant
- ✅ Sauvegarder learnings du todo complété

**Pattern:**
```typescript
// Completion proactive
interface ProactiveCompletion {
  todoId: string;
  completionDetected: boolean;
  completionCriteria: CompletionCriteria;
  validation: ValidationResult;
  autoCompleted: boolean;
  nextTodo: string | null;
}

class ProactiveCompleter {
  // Détecter completion automatiquement
  async detectCompletion(
    todo: MonitoredTodo,
    context: Context
  ): Promise<ProactiveCompletion> {
    // 1. Définir critères completion
    const criteria = await this.defineCompletionCriteria(todo, context);
    
    // 2. Vérifier critères
    const validation = await this.validateCriteria(criteria, context);
    
    // 3. Déterminer si complété
    const completionDetected = validation.allSatisfied;
    
    // 4. Auto-compléter si validé
    let autoCompleted = false;
    let nextTodo: string | null = null;
    
    if (completionDetected && todo.status !== 'completed') {
      // Marquer completed
      await this.markCompleted(todo);
      autoCompleted = true;
      
      // Identifier next todo
      nextTodo = await this.identifyNextTodo(todo);
      
      // Démarrer next todo automatiquement
      if (nextTodo) {
        await this.startNextTodo(nextTodo);
      }
      
      logger.info('Todo Auto-Completed', {
        todoId: todo.id,
        content: todo.content,
        nextTodo
      });
    }
    
    return {
      todoId: todo.id,
      completionDetected,
      completionCriteria: criteria,
      validation,
      autoCompleted,
      nextTodo
    };
  }
  
  private async defineCompletionCriteria(
    todo: Todo,
    context: Context
  ): Promise<CompletionCriteria> {
    // Critères génériques
    const criteria: CompletionCriteria = {
      codeImplemented: false,
      testsPass: false,
      noLintErrors: false,
      noTypeErrors: false,
      documentationAdded: false,
      reviewCompleted: false
    };
    
    // Adapter critères selon type de todo
    if (todo.content.includes('créer') || todo.content.includes('implémenter')) {
      criteria.codeImplemented = true;
      criteria.testsPass = true;
      criteria.noLintErrors = true;
    } else if (todo.content.includes('corriger') || todo.content.includes('fix')) {
      criteria.testsPass = true;
      criteria.noTypeErrors = true;
    } else if (todo.content.includes('documenter')) {
      criteria.documentationAdded = true;
    }
    
    return criteria;
  }
  
  private async validateCriteria(
    criteria: CompletionCriteria,
    context: Context
  ): Promise<ValidationResult> {
    const results: Record<string, boolean> = {};
    
    // Valider chaque critère activé
    for (const [criterion, required] of Object.entries(criteria)) {
      if (required) {
        results[criterion] = await this.validateCriterion(criterion, context);
      }
    }
    
    const allSatisfied = Object.values(results).every(v => v === true);
    const satisfied = Object.entries(results).filter(([_, v]) => v).length;
    const total = Object.values(criteria).filter(v => v).length;
    
    return {
      allSatisfied,
      satisfied,
      total,
      percentage: (satisfied / total) * 100,
      failedCriteria: Object.entries(results)
        .filter(([_, v]) => !v)
        .map(([k, _]) => k)
    };
  }
}
```

---

### Niveau 5 : Anticipation et Intervention (Anticipation & Intervention)

**IMPÉRATIF:** Anticiper problèmes avant qu'ils surviennent et intervenir proactivement.

**TOUJOURS:**
- ✅ Prédire retards potentiels basés sur progression actuelle
- ✅ Anticiper blocages futurs basés sur dépendances
- ✅ Identifier risques d'incompletion basés sur patterns
- ✅ Intervenir avant que problème devienne critique
- ✅ Suggérer optimisations proactives

**Pattern:**
```typescript
// Anticipation et intervention
interface AnticipationAndIntervention {
  predictions: Prediction[];
  interventions: Intervention[];
  optimizations: Optimization[];
  preventions: Prevention[];
}

class ProactiveIntervenor {
  async anticipateAndIntervene(
    monitoring: ContinuousTodoMonitoring,
    context: Context
  ): Promise<AnticipationAndIntervention> {
    // 1. Prédire problèmes futurs
    const predictions = await this.predictFutureProblems(monitoring, context);
    
    // 2. Décider interventions nécessaires
    const interventions = await this.decideInterventions(predictions);
    
    // 3. Exécuter interventions
    for (const intervention of interventions) {
      await this.executeIntervention(intervention, context);
    }
    
    // 4. Suggérer optimisations
    const optimizations = await this.suggestOptimizations(monitoring);
    
    // 5. Implémenter préventions
    const preventions = await this.implementPreventions(predictions);
    
    return {
      predictions,
      interventions,
      optimizations,
      preventions
    };
  }
  
  private async predictFutureProblems(
    monitoring: ContinuousTodoMonitoring,
    context: Context
  ): Promise<Prediction[]> {
    const predictions: Prediction[] = [];
    
    // Prédiction 1: Retard final
    const currentRate = monitoring.progressRate;
    const remaining = monitoring.todos.filter(t => 
      t.status !== 'completed'
    ).length;
    const estimatedTimeRemaining = remaining / currentRate;
    
    if (estimatedTimeRemaining > context.timeAvailable) {
      predictions.push({
        type: 'delay',
        description: 'Risque de ne pas finir tous les todos dans temps disponible',
        probability: 0.8,
        impact: 'high',
        timeToOccurrence: estimatedTimeRemaining - context.timeAvailable
      });
    }
    
    // Prédiction 2: Blocage futur
    const upcomingDependencies = await this.analyzeUpcomingDependencies(
      monitoring.todos
    );
    for (const dep of upcomingDependencies) {
      if (dep.risk > 0.6) {
        predictions.push({
          type: 'blocker',
          description: `Todo "${dep.todoId}" risque d'être bloqué par dépendances`,
          probability: dep.risk,
          impact: 'medium',
          timeToOccurrence: dep.estimatedTimeUntil
        });
      }
    }
    
    // Prédiction 3: Incompletion
    if (monitoring.todos.some(t => t.content.includes('à définir'))) {
      predictions.push({
        type: 'incompletion',
        description: 'Certains todos manquent de détails précis',
        probability: 0.7,
        impact: 'medium',
        timeToOccurrence: 0
      });
    }
    
    return predictions;
  }
  
  private async executeIntervention(
    intervention: Intervention,
    context: Context
  ): Promise<void> {
    logger.info('Executing Proactive Intervention', {
      type: intervention.type,
      reason: intervention.reason
    });
    
    switch (intervention.type) {
      case 'decompose-complex-todo':
        await this.decomposeComplexTodo(intervention.target, context);
        break;
        
      case 'simplify-scope':
        await this.simplifyScope(intervention.target, context);
        break;
        
      case 'parallelize-independent':
        await this.parallelizeIndependent(intervention.targets);
        break;
        
      case 'seek-help-memory':
        await this.seekHelpFromMemory(intervention.target);
        break;
        
      case 'escalate-complexity':
        await this.escalateToSubAgents(intervention.target);
        break;
    }
  }
}
```

---

## 🔄 Workflow Suivi Proactif Complet

**IMPÉRATIF:** Workflow de suivi intégré pendant toute exécution.

**Workflow:**

```typescript
// Workflow suivi proactif complet
async function proactiveTrackingWorkflow(
  todos: Todo[],
  context: Context
): Promise<TrackingResult> {
  // PHASE 1: INITIALISATION MONITORING
  await continuousMonitor.startMonitoring(todos);
  
  // PHASE 2: MONITORING CONTINU (background)
  const monitoring = continuousMonitor.state;
  
  // PHASE 3: EXÉCUTION AVEC SUIVI
  for (const phase of executionPlan.phases) {
    for (const todo of phase.todos) {
      // Marquer in_progress
      await updateTodoStatus(todo.id, 'in_progress');
      
      // Exécuter todo
      const result = await executeTodo(todo, context);
      
      // DÉTECTION AUTOMATIQUE COMPLETION
      const completion = await proactiveCompleter.detectCompletion(
        todo,
        context
      );
      
      if (completion.completionDetected) {
        // Auto-compléter
        await updateTodoStatus(todo.id, 'completed');
        
        // Sauvegarder learning
        await memoryManager.save({
          type: 'todo-completion',
          content: {
            todo,
            duration: result.duration,
            issues: result.issues,
            learnings: result.learnings
          }
        });
        
        // Passer au suivant automatiquement
        if (completion.nextTodo) {
          continue; // Loop gérera next todo
        }
      }
      
      // DÉTECTION BLOCAGES
      const blockers = await autoBlockerDetector.detect([todo]);
      if (blockers.blockers.length > 0) {
        await handleBlockers(blockers, todo);
      }
    }
  }
  
  // PHASE 4: VALIDATION FINALE
  const finalValidation = await validateAllCompleted(todos);
  
  if (!finalValidation.allCompleted) {
    // ALERTE CRITIQUE
    await generateCriticalAlert('Todos incomplets détectés', {
      incomplete: finalValidation.incompleteTodos
    });
    
    // FORCER CONTINUATION
    await forceContinuation(finalValidation.incompleteTodos);
  }
  
  // PHASE 5: ARRÊT MONITORING
  await continuousMonitor.stopMonitoring();
  
  return {
    allCompleted: finalValidation.allCompleted,
    monitoring: monitoring,
    learnings: await extractTrackingLearnings(monitoring)
  };
}
```

---

## 💡 Exemples Concrets - Projet Saxium

### Exemple 1 : Détection Stagnation Migration Routes

**Scénario:** Todo "Migrer groupe Auth routes" stagnant depuis 12 min.

**Détection et Intervention:**

```typescript
// DÉTECTION
const stagnation = {
  todo: {
    id: '2',
    content: 'Migrer groupe Auth routes (login, logout, verify)',
    status: 'in_progress',
    timeSinceLastChange: 12 * 60 * 1000 // 12 min
  },
  possibleCauses: [
    'Complexité sous-estimée',
    'Dépendances non-identifiées',
    'Erreurs bloquantes'
  ]
};

// INTERVENTION AUTOMATIQUE
const intervention = {
  action: 'decompose-and-replan',
  steps: [
    // 1. Vérifier erreurs
    'Check linter errors → 3 erreurs TypeScript trouvées',
    
    // 2. Corriger erreurs d'abord
    'Create sub-todo: Corriger 3 erreurs TypeScript',
    
    // 3. Décomposer si toujours bloqué
    'Si correction pas suffit, décomposer:',
    '  - Migrer route login',
    '  - Migrer route logout',
    '  - Migrer route verify'
  ],
  expectedUnblock: '5 min'
};

// RÉSULTAT
const result = {
  stagnationResolved: true,
  timeToResolve: 7 * 60 * 1000, // 7 min
  learning: 'Pattern: Toujours vérifier erreurs si stagnation > 10min'
};
```

### Exemple 2 : Anticipation Retard Consolidation Services

**Scénario:** Progression 30% après 50% temps estimé.

**Anticipation et Ajustement:**

```typescript
// ANTICIPATION
const prediction = {
  currentProgress: 0.30, // 30% complété
  timeElapsed: 0.50, // 50% temps écoulé
  projectedCompletion: 0.60, // Seulement 60% si rythme continue
  risk: 'high',
  estimatedDelay: '+67%' // 40% manquant avec 50% temps restant
};

// INTERVENTIONS AUTOMATIQUES
const interventions = [
  {
    action: 'reestimate-remaining',
    result: 'Estimation ajustée: +40 min total'
  },
  {
    action: 'simplify-scope',
    result: 'Todos basse priorité marqués optional'
  },
  {
    action: 'parallelize',
    result: '2 todos indépendants identifiés pour parallélisation'
  },
  {
    action: 'seek-optimization',
    result: 'Pattern mémoire trouvé: "Consolidation incrémentale + tests continus"'
  }
];

// PLAN ADAPTÉ
const adaptedPlan = {
  approach: 'Focus sur critical path + simplification scope',
  expectedCompletion: '95%' // Réaliste avec adaptations
};
```

### Exemple 3 : Prévention Incompletion Debug Performance

**Scénario:** Tentative arrêt avec 3 todos pending.

**Prévention Automatique:**

```typescript
// DÉTECTION TENTATIVE ARRÊT
const incompletionDetection = {
  attemptingStop: true,
  pendingTodos: [
    { id: '4', content: 'Valider optimisations en production' },
    { id: '5', content: 'Documenter changements' },
    { id: '6', content: 'Mettre à jour métriques monitoring' }
  ],
  severity: 'critical'
};

// ALERTE CRITIQUE GÉNÉRÉE
const alert = {
  type: 'incompletion',
  severity: 'critical',
  message: '🚨 ARRÊT INTERDIT: 3 todos non-complétés',
  actions: [
    'Prévenir arrêt',
    'Forcer continuation',
    'Marquer todo 4 in_progress automatiquement'
  ]
};

// EXÉCUTION FORCÉE
const forcedExecution = {
  action: 'force-continue',
  todosToComplete: incompletionDetection.pendingTodos,
  estimatedTimeRemaining: '15 min',
  commitment: 'Ne s\'arrêtera pas avant completion 100%'
};
```

---

## 📊 Dashboard Suivi Proactif

**Affichage en temps réel:**

```typescript
// Dashboard suivi todos
interface TodoDashboard {
  overview: {
    total: number;
    completed: number;
    inProgress: number;
    pending: number;
    blocked: number;
    cancelled: number;
  };
  progress: {
    percentage: number;
    rate: number; // Todos/heure
    estimatedCompletion: Date;
    onTrack: boolean;
  };
  alerts: {
    stagnation: number;
    blockers: number;
    delays: number;
    quality: number;
  };
  recommendations: string[];
}

// Exemple dashboard
const dashboard: TodoDashboard = {
  overview: {
    total: 12,
    completed: 7,
    inProgress: 1,
    pending: 3,
    blocked: 1,
    cancelled: 0
  },
  progress: {
    percentage: 58.3,
    rate: 3.5, // 3.5 todos/heure
    estimatedCompletion: new Date(Date.now() + 1.5 * 60 * 60 * 1000),
    onTrack: true
  },
  alerts: {
    stagnation: 0,
    blockers: 1,
    delays: 0,
    quality: 0
  },
  recommendations: [
    'Débloquer todo #8 (dépendance sur todo #5)',
    'Considérer paralléliser todos #9 et #10 (indépendants)'
  ]
};
```

---

## 🎯 Règles Anti-Interruption Renforcées

**IMPÉRATIF:** Garantir que agent ne s'arrête JAMAIS avec todos incomplets.

**Règles:**

```typescript
// Règles anti-interruption
const antiInterruptionRules = {
  // RÈGLE 1: Vérification avant TOUT arrêt
  rule1: {
    trigger: 'before-stop-attempt',
    check: async () => {
      const todos = await getCurrentTodos();
      const incomplete = todos.filter(t => 
        t.status === 'pending' || t.status === 'in_progress'
      );
      
      if (incomplete.length > 0) {
        // PRÉVENIR ARRÊT
        await preventStop();
        
        // ALERTE CRITIQUE
        await generateCriticalAlert(
          `ARRÊT INTERDIT: ${incomplete.length} todos incomplets`,
          { todos: incomplete }
        );
        
        // FORCER CONTINUATION
        await forceContinuation(incomplete[0]);
        
        return false; // Arrêt refusé
      }
      
      return true; // Arrêt autorisé
    }
  },
  
  // RÈGLE 2: Détection mention "prochaines étapes"
  rule2: {
    trigger: 'response-generation',
    check: async (response: string) => {
      const nextStepPhrases = [
        'prochaines étapes',
        'il reste',
        'il faudra',
        'ensuite',
        'plus tard'
      ];
      
      const mentionsNextSteps = nextStepPhrases.some(phrase =>
        response.toLowerCase().includes(phrase)
      );
      
      if (mentionsNextSteps) {
        // EXTRAIRE étapes mentionnées
        const steps = await extractMentionedSteps(response);
        
        // CRÉER TODOS AUTOMATIQUEMENT
        await createTodosFromSteps(steps);
        
        // EXÉCUTER IMMÉDIATEMENT
        await executeNewTodos(steps);
        
        return false; // Arrêt refusé - étapes à faire
      }
      
      return true; // Pas de next steps → OK
    }
  },
  
  // RÈGLE 3: Validation exhaustive finale
  rule3: {
    trigger: 'final-validation',
    check: async () => {
      const validations = {
        allTodosCompleted: await checkAllTodosCompleted(),
        noLintErrors: await checkNoLintErrors(),
        allTestsPass: await checkAllTestsPass(),
        noTypeErrors: await checkNoTypeErrors(),
        documentationComplete: await checkDocumentation()
      };
      
      const allValid = Object.values(validations).every(v => v);
      
      if (!allValid) {
        const failed = Object.entries(validations)
          .filter(([_, v]) => !v)
          .map(([k, _]) => k);
        
        await generateCriticalAlert(
          `Validation finale échouée: ${failed.join(', ')}`,
          { failed }
        );
        
        await forceCorrectionBeforeStop(failed);
        
        return false;
      }
      
      return true;
    }
  }
};
```

---

## 📊 Métriques Suivi Proactif

**TOUJOURS tracker:**
- ✅ Taux détection blocages (100% idéal)
- ✅ Temps détection stagnation (< 10 min idéal)
- ✅ Précision prédictions retards (> 85%)
- ✅ Taux prévention incompletions (100% idéal)
- ✅ Interventions proactives réussies (> 90%)

---

## 🎯 Objectifs d'Excellence

**Standards:**
- ✅ 100% todos complétés (0 incomplet)
- ✅ Détection blocage < 5 min après occurrence
- ✅ Stagnation détectée < 10 min
- ✅ Prédiction retards > 85% précision
- ✅ Interventions proactives > 90% succès
- ✅ 0 arrêt avec todos pending (JAMAIS)

**Référence:** `@.cursor/rules/quality-principles.md` - Principes de qualité

---

**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29  
**Prochaine révision:** Selon feedback et résultats

