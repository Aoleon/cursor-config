<!-- 
Context: sub-agents, orchestration, coordination, planning, dependencies
Priority: P1
Auto-load: when task requires sub-agents orchestration or complex multi-role coordination
Dependencies: core.md, multi-agent-coordination.md, sub-agents-roles.md, sub-agents-communication.md, task-decomposition.md
-->

# Système de Sub-Agents - Orchestration - Saxium

**Objectif:** Définir l'orchestrateur principal qui analyse les tâches, identifie les rôles nécessaires, planifie l'exécution et gère les dépendances pour permettre l'exécution autonome de maxi runs.

**Référence:** [Cursor Rules Documentation](https://docs.cursor.com/context/rules)  
**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

## 🎯 Principe Fondamental

**IMPÉRATIF:** L'orchestrateur principal DOIT analyser automatiquement les tâches, identifier les rôles nécessaires, planifier l'exécution et gérer les dépendances pour orchestrer l'exécution de manière autonome.

**Bénéfices:**
- ✅ Analyse automatique des tâches
- ✅ Identification intelligente des rôles
- ✅ Planification optimisée de l'exécution
- ✅ Gestion automatique des dépendances
- ✅ Coordination séquentielle/parallèle
- ✅ Exécution autonome de maxi runs

**Référence:** `@.cursor/rules/multi-agent-coordination.md` - Coordination multi-agents  
**Référence:** `@.cursor/rules/sub-agents-roles.md` - Rôles des sub-agents  
**Référence:** `@.cursor/rules/sub-agents-communication.md` - Communication inter-agents  
**Référence:** `@.cursor/rules/task-decomposition.md` - Décomposition des tâches

## 📋 Fonctionnalités de l'Orchestrateur

### 1. Analyse de Tâche

**IMPÉRATIF:** Analyser automatiquement la tâche pour déterminer sa complexité, son type et ses besoins.

**TOUJOURS:**
- ✅ Analyser complexité de la tâche
- ✅ Identifier type de tâche (développement, test, analyse, refactoring)
- ✅ Identifier dépendances
- ✅ Estimer temps d'exécution
- ✅ Identifier risques potentiels

**Pattern:**
```typescript
// Analyse de tâche
async function analyzeTask(
  task: Task,
  context: Context
): Promise<TaskAnalysis> {
  // 1. Analyser complexité
  const complexity = await analyzeComplexity(task, context);
  
  // 2. Identifier type
  const type = identifyTaskType(task, context);
  
  // 3. Identifier dépendances
  const dependencies = await identifyDependencies(task, context);
  
  // 4. Estimer temps
  const estimatedTime = estimateExecutionTime(task, complexity, context);
  
  // 5. Identifier risques
  const risks = await identifyRisks(task, complexity, dependencies, context);
  
  return {
    taskId: task.id,
    complexity,
    type,
    dependencies,
    estimatedTime,
    risks,
    requiresSubAgents: complexity.level === 'high' || complexity.level === 'very-high'
  };
}

// Analyser complexité
async function analyzeComplexity(
  task: Task,
  context: Context
): Promise<Complexity> {
  const metrics = {
    todos: task.todos?.length || 0,
    estimatedLines: estimateLinesOfCode(task, context),
    filesToModify: countFilesToModify(task, context),
    dependencies: countDependencies(task, context),
    validations: countValidations(task, context)
  };
  
  let level: 'simple' | 'medium' | 'high' | 'very-high' = 'simple';
  let score = 0;
  
  // Calculer score de complexité
  if (metrics.todos > 10) score += 3;
  else if (metrics.todos > 5) score += 2;
  else if (metrics.todos > 3) score += 1;
  
  if (metrics.estimatedLines > 500) score += 3;
  else if (metrics.estimatedLines > 200) score += 2;
  else if (metrics.estimatedLines > 50) score += 1;
  
  if (metrics.filesToModify > 10) score += 3;
  else if (metrics.filesToModify > 5) score += 2;
  else if (metrics.filesToModify > 3) score += 1;
  
  if (metrics.dependencies > 5) score += 2;
  else if (metrics.dependencies > 3) score += 1;
  
  // Déterminer niveau
  if (score >= 8) level = 'very-high';
  else if (score >= 5) level = 'high';
  else if (score >= 2) level = 'medium';
  else level = 'simple';
  
  return { level, score, metrics };
}
```

### 2. Identification des Rôles Nécessaires

**IMPÉRATIF:** Identifier automatiquement les rôles nécessaires selon l'analyse de la tâche.

**TOUJOURS:**
- ✅ Utiliser analyse de tâche pour identifier rôles
- ✅ Consulter configuration des rôles (`@docs/AGENT_ROLES_CONFIG.json`)
- ✅ Identifier rôles selon type et complexité
- ✅ Respecter dépendances entre rôles
- ✅ Optimiser nombre de rôles (pas de sur-engineering)

**Pattern:**
```typescript
// Identifier rôles nécessaires
async function identifyRequiredRoles(
  analysis: TaskAnalysis,
  context: Context
): Promise<Role[]> {
  const roles: Role[] = [];
  const rolesConfig = await loadRolesConfig(context);
  
  // 1. Toujours inclure Coordinator pour orchestration
  if (analysis.requiresSubAgents) {
    roles.push('coordinator');
  }
  
  // 2. Identifier selon type de tâche
  switch (analysis.type) {
    case 'development':
    case 'refactoring':
      roles.push('architect'); // Validation architecture
      roles.push('developer'); // Implémentation
      if (analysis.complexity.level === 'high' || analysis.complexity.level === 'very-high') {
        roles.push('tester'); // Tests obligatoires
      }
      break;
      
    case 'testing':
      roles.push('tester');
      if (analysis.complexity.level === 'high') {
        roles.push('developer'); // Pour corrections si nécessaire
      }
      break;
      
    case 'analysis':
    case 'optimization':
      roles.push('analyst');
      if (analysis.complexity.level === 'high') {
        roles.push('architect'); // Validation architecture
      }
      break;
  }
  
  // 3. Identifier selon complexité
  if (analysis.complexity.level === 'very-high') {
    // Tous les rôles pour tâches très complexes
    if (!roles.includes('architect')) roles.push('architect');
    if (!roles.includes('developer')) roles.push('developer');
    if (!roles.includes('tester')) roles.push('tester');
    if (!roles.includes('analyst')) roles.push('analyst');
  }
  
  // 4. Identifier selon risques
  if (analysis.risks.length > 0) {
    if (!roles.includes('analyst')) roles.push('analyst');
    if (analysis.risks.some(r => r.severity === 'critical')) {
      if (!roles.includes('architect')) roles.push('architect');
    }
  }
  
  // 5. Dédupliquer rôles
  return [...new Set(roles)];
}
```

### 3. Planification d'Exécution

**IMPÉRATIF:** Planifier automatiquement l'exécution selon les rôles identifiés et les dépendances.

**TOUJOURS:**
- ✅ Planifier exécution séquentielle/parallèle
- ✅ Respecter dépendances entre rôles
- ✅ Optimiser parallélisation quand possible
- ✅ Intégrer avec décomposition des tâches
- ✅ Gérer timeouts et retries

**Pattern:**
```typescript
// Planifier exécution
async function planExecution(
  task: Task,
  analysis: TaskAnalysis,
  roles: Role[],
  context: Context
): Promise<ExecutionPlan> {
  // 1. Décomposer tâche si complexe
  let decomposition = null;
  if (analysis.complexity.level === 'high' || analysis.complexity.level === 'very-high') {
    decomposition = await decomposeTask(task, context);
  }
  
  // 2. Créer plan d'exécution
  const plan: ExecutionPlan = {
    taskId: task.id,
    roles,
    steps: [],
    dependencies: [],
    parallelizable: [],
    estimatedDuration: analysis.estimatedTime,
    timeout: analysis.estimatedTime * 2 // Timeout = 2x temps estimé
  };
  
  // 3. Planifier selon workflow standard
  const workflow = selectWorkflow(analysis.type, analysis.complexity, context);
  
  for (const step of workflow.steps) {
    if (roles.includes(step.role)) {
      const executionStep: ExecutionStep = {
        order: step.order,
        role: step.role,
        action: step.action,
        dependsOn: step.dependsOn || [],
        subtasks: decomposition?.subtasks.filter(s => 
          identifyRoleForSubtask(s, context) === step.role
        ) || [],
        estimatedTime: estimateStepTime(step, analysis, context),
        timeout: estimateStepTime(step, analysis, context) * 1.5,
        retries: 2
      };
      
      plan.steps.push(executionStep);
    }
  }
  
  // 4. Identifier étapes parallélisables
  plan.parallelizable = identifyParallelizableSteps(plan.steps);
  
  // 5. Résoudre dépendances
  plan.dependencies = resolveDependencies(plan.steps);
  
  return plan;
}

// Sélectionner workflow
function selectWorkflow(
  type: TaskType,
  complexity: Complexity,
  context: Context
): Workflow {
  const workflowsConfig = loadWorkflowsConfig(context);
  
  if (complexity.level === 'simple') {
    return workflowsConfig.workflows['quick-fix'];
  } else if (type === 'refactoring') {
    return workflowsConfig.workflows['refactoring'];
  } else {
    return workflowsConfig.workflows['standard'];
  }
}
```

### 4. Gestion des Dépendances

**IMPÉRATIF:** Gérer automatiquement les dépendances entre rôles et tâches.

**TOUJOURS:**
- ✅ Identifier dépendances entre rôles
- ✅ Identifier dépendances entre tâches
- ✅ Résoudre ordre d'exécution selon dépendances
- ✅ Détecter cycles dans dépendances
- ✅ Gérer dépendances non satisfaites

**Pattern:**
```typescript
// Gérer dépendances
async function manageDependencies(
  plan: ExecutionPlan,
  context: Context
): Promise<DependencyResolution> {
  // 1. Construire graphe de dépendances
  const dependencyGraph = buildDependencyGraph(plan.steps);
  
  // 2. Détecter cycles
  const cycles = detectCycles(dependencyGraph);
  if (cycles.length > 0) {
    throw new Error(`Cycles détectés dans les dépendances: ${cycles.map(c => c.join(' -> ')).join(', ')}`);
  }
  
  // 3. Trier topologiquement
  const sortedSteps = topologicalSort(dependencyGraph);
  
  // 4. Valider dépendances satisfaites
  const unsatisfied = validateDependencies(sortedSteps, context);
  if (unsatisfied.length > 0) {
    // 5. Résoudre dépendances non satisfaites
    await resolveUnsatisfiedDependencies(unsatisfied, context);
  }
  
  // 6. Mettre à jour plan avec ordre résolu
  plan.steps = sortedSteps;
  
  return {
    resolved: true,
    sortedSteps,
    cycles: [],
    unsatisfied: []
  };
}
```

### 5. Coordination Séquentielle/Parallèle

**IMPÉRATIF:** Coordonner l'exécution séquentielle et parallèle selon les dépendances.

**TOUJOURS:**
- ✅ Exécuter séquentiellement les étapes avec dépendances
- ✅ Exécuter en parallèle les étapes indépendantes
- ✅ Gérer synchronisation entre étapes parallèles
- ✅ Optimiser temps d'exécution total

**Pattern:**
```typescript
// Coordonner exécution séquentielle/parallèle
async function coordinateExecution(
  plan: ExecutionPlan,
  context: Context
): Promise<ExecutionResult> {
  const results: StepResult[] = [];
  const completedSteps = new Set<string>();
  
  // 1. Exécuter étapes séquentielles
  for (const step of plan.steps) {
    // 2. Vérifier dépendances satisfaites
    const dependenciesSatisfied = step.dependsOn.every(dep => 
      completedSteps.has(dep)
    );
    
    if (!dependenciesSatisfied) {
      // Attendre dépendances
      await waitForDependencies(step.dependsOn, completedSteps, context);
    }
    
    // 3. Exécuter étape
    const result = await executeStep(step, context);
    results.push(result);
    completedSteps.add(step.role);
    
    // 4. Partager résultats
    await shareResults(result, plan.roles, context);
  }
  
  // 5. Exécuter étapes parallélisables
  const parallelResults = await Promise.all(
    plan.parallelizable
      .filter(step => {
        // Vérifier dépendances satisfaites
        return step.dependsOn.every(dep => completedSteps.has(dep));
      })
      .map(step => executeStep(step, context))
  );
  results.push(...parallelResults);
  
  // 6. Consolider résultats
  return consolidateResults(results, context);
}
```

## 🔄 Workflow d'Orchestration

### Workflow Complet

1. **Analyser tâche** → Complexité, type, dépendances, risques
2. **Identifier rôles nécessaires** → Selon analyse
3. **Décomposer tâche** → Si complexe (intégration task-decomposition)
4. **Planifier exécution** → Séquentielle/parallèle selon dépendances
5. **Gérer dépendances** → Résoudre ordre d'exécution
6. **Coordonner exécution** → Exécuter selon plan
7. **Consolider résultats** → Résultat final unifié

**Pattern:**
```typescript
// Workflow complet d'orchestration
async function orchestrateTask(
  task: Task,
  context: Context
): Promise<OrchestrationResult> {
  // 1. Analyser tâche
  const analysis = await analyzeTask(task, context);
  
  // 2. Identifier rôles nécessaires
  const roles = await identifyRequiredRoles(analysis, context);
  
  // 3. Planifier exécution
  const plan = await planExecution(task, analysis, roles, context);
  
  // 4. Gérer dépendances
  const dependencyResolution = await manageDependencies(plan, context);
  
  // 5. Coordonner exécution
  const executionResult = await coordinateExecution(plan, context);
  
  // 6. Consolider résultats
  return {
    success: executionResult.success,
    taskId: task.id,
    roles,
    plan,
    results: executionResult.results,
    duration: executionResult.duration,
    metrics: executionResult.metrics
  };
}
```

## ⚠️ Règles d'Orchestration

### TOUJOURS:

- ✅ Analyser tâche avant orchestration
- ✅ Identifier rôles nécessaires automatiquement
- ✅ Planifier exécution selon dépendances
- ✅ Gérer dépendances automatiquement
- ✅ Coordonner séquentielle/parallèle
- ✅ Gérer erreurs et récupération
- ✅ Consolider résultats

### NE JAMAIS:

- ❌ Orchestrer sans analyser tâche
- ❌ Ignorer identification automatique des rôles
- ❌ Ne pas planifier exécution
- ❌ Ignorer dépendances
- ❌ Exécuter séquentiellement si parallélisation possible
- ❌ Ignorer erreurs sans récupération

## 🔗 Références

### Règles Intégrées

- `@.cursor/rules/multi-agent-coordination.md` - Coordination multi-agents
- `@.cursor/rules/sub-agents-roles.md` - Rôles des sub-agents
- `@.cursor/rules/sub-agents-communication.md` - Communication inter-agents
- `@.cursor/rules/task-decomposition.md` - Décomposition des tâches
- `@.cursor/rules/sub-agents-workflows.md` - Workflows standards

### Configuration

- `@docs/AGENT_ROLES_CONFIG.json` - Configuration des rôles
- `@docs/AGENT_COORDINATION_STATE.json` - État coordination
- `@docs/AGENT_TASKS_QUEUE.json` - File d'attente tâches

---

**Note:** Ce fichier définit l'orchestrateur principal pour l'exécution autonome de maxi runs avec sub-agents.

**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

