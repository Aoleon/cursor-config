<!-- 
Context: multi-agent, coordination, orchestration, collaboration, task-distribution, sub-agents, roles
Priority: P1
Auto-load: when task is very complex requiring multiple specialized agents or sub-agents coordination
Dependencies: core.md, quality-principles.md, senior-architect-oversight.md, task-decomposition.md, sub-agents-roles.md
-->

# Coordination Multi-Agents - Saxium

**Objectif:** Coordonner plusieurs agents spécialisés (sub-agents) pour résoudre des tâches très complexes de manière collaborative avec identification automatique des rôles et planification d'exécution.

**Référence:** [Cursor Rules Documentation](https://docs.cursor.com/context/rules)  
**Version:** 2.0.0  
**Dernière mise à jour:** 2025-01-29

## 🎯 Principe Fondamental

**IMPÉRATIF:** Pour des tâches très complexes, l'agent DOIT orchestrer plusieurs agents spécialisés (sub-agents) pour résoudre la tâche de manière collaborative avec identification automatique des rôles et planification d'exécution.

**Bénéfices:**
- ✅ Résolution de tâches très complexes
- ✅ Expertise spécialisée par rôle (Architect, Developer, Tester, Analyst, Coordinator)
- ✅ Collaboration efficace entre rôles
- ✅ Partage de contexte structuré
- ✅ Identification automatique des rôles nécessaires
- ✅ Planification d'exécution optimisée
- ✅ Intégration avec décomposition des tâches

**Référence:** `@.cursor/rules/senior-architect-oversight.md` - Supervision architecte sénior  
**Référence:** `@.cursor/rules/task-decomposition.md` - Décomposition des tâches  
**Référence:** `@.cursor/rules/sub-agents-roles.md` - Rôles des sub-agents  
**Référence:** `@docs/AGENT_ROLES_CONFIG.json` - Configuration des rôles

## 📋 Règles de Coordination

### 1. Identification Automatique des Rôles Nécessaires

**IMPÉRATIF:** Identifier automatiquement les rôles nécessaires selon la tâche.

**TOUJOURS:**
- ✅ Analyser tâche pour identifier rôles nécessaires
- ✅ Utiliser configuration des rôles (`@docs/AGENT_ROLES_CONFIG.json`)
- ✅ Identifier rôles selon type de tâche (développement, test, analyse, refactoring)
- ✅ Identifier rôles selon complexité (simple, complexe, très complexe)
- ✅ Identifier rôles selon dépendances
- ✅ Assigner sous-tâches aux rôles appropriés

**Pattern d'Identification:**
```typescript
// Identification automatique des rôles nécessaires
async function identifyRequiredRoles(
  task: Task,
  context: Context
): Promise<Role[]> {
  const roles: Role[] = [];
  
  // 1. Toujours inclure Coordinator pour orchestration
  roles.push('coordinator');
  
  // 2. Analyser type de tâche
  if (task.type === 'development' || task.type === 'refactoring') {
    roles.push('architect'); // Validation architecture
    roles.push('developer'); // Implémentation
  }
  
  if (task.type === 'testing' || task.requiresTests) {
    roles.push('tester'); // Tests et validation
  }
  
  if (task.type === 'analysis' || task.hasIssues) {
    roles.push('analyst'); // Analyse et optimisation
  }
  
  // 3. Analyser complexité
  if (task.complexity === 'high' || task.complexity === 'very-high') {
    roles.push('architect'); // Supervision obligatoire
  }
  
  // 4. Analyser dépendances
  if (task.dependencies.length > 0) {
    roles.push('coordinator'); // Gestion dépendances
  }
  
  // 5. Dédupliquer rôles
  return [...new Set(roles)];
}
```

**Critères d'Identification:**
- **Tâche simple** (< 3 todos, < 50 lignes) → Developer uniquement
- **Tâche complexe** (3-10 todos, 50-200 lignes) → Architect + Developer + Tester
- **Tâche très complexe** (> 10 todos, > 200 lignes) → Tous les rôles
- **Tâche avec problèmes** → Analyst obligatoire
- **Tâche de refactoring** → Architect + Developer + Analyst
- **Tâche de test** → Tester obligatoire

### 2. Planification d'Exécution Multi-Agents

**IMPÉRATIF:** Planifier automatiquement l'exécution selon les rôles identifiés et les dépendances.

**TOUJOURS:**
- ✅ Planifier exécution séquentielle/parallèle selon dépendances
- ✅ Respecter ordre de validation (Architect → Developer → Tester → Analyst)
- ✅ Gérer dépendances entre rôles
- ✅ Optimiser parallélisation quand possible
- ✅ Intégrer avec décomposition des tâches

**Pattern de Planification:**
```typescript
// Planification d'exécution multi-agents
async function planMultiAgentExecution(
  task: Task,
  roles: Role[],
  context: Context
): Promise<ExecutionPlan> {
  // 1. Décomposer tâche avec task-decomposition
  const decomposition = await decomposeTask(task, context);
  
  // 2. Créer plan d'exécution
  const plan: ExecutionPlan = {
    taskId: task.id,
    roles,
    steps: [],
    dependencies: [],
    parallelizable: []
  };
  
  // 3. Planifier selon workflow standard
  if (roles.includes('coordinator')) {
    plan.steps.push({
      order: 1,
      role: 'coordinator',
      action: 'analyze-task',
      subtasks: decomposition.subtasks
    });
  }
  
  if (roles.includes('architect')) {
    plan.steps.push({
      order: 2,
      role: 'architect',
      action: 'validate-architecture',
      dependsOn: ['coordinator']
    });
  }
  
  if (roles.includes('developer')) {
    plan.steps.push({
      order: 3,
      role: 'developer',
      action: 'implement',
      dependsOn: ['architect']
    });
  }
  
  if (roles.includes('tester')) {
    plan.steps.push({
      order: 4,
      role: 'tester',
      action: 'test',
      dependsOn: ['developer']
    });
  }
  
  if (roles.includes('analyst')) {
    plan.steps.push({
      order: 5,
      role: 'analyst',
      action: 'analyze',
      dependsOn: ['developer', 'tester']
    });
  }
  
  // 4. Identifier étapes parallélisables
  plan.parallelizable = identifyParallelizableSteps(plan.steps);
  
  return plan;
}
```

**Ordre d'Exécution Standard:**
1. **Coordinator** → Analyse tâche et identification rôles
2. **Architect** → Validation architecture et priorisation
3. **Developer** → Implémentation
4. **Tester** → Validation et tests
5. **Analyst** → Analyse et optimisation
6. **Architect** → Review final
7. **Coordinator** → Consolidation résultats

### 3. Intégration avec Décomposition des Tâches

**IMPÉRATIF:** Intégrer automatiquement avec la décomposition des tâches pour optimiser l'exécution.

**TOUJOURS:**
- ✅ Décomposer tâche complexe en sous-tâches gérables
- ✅ Assigner sous-tâches aux rôles appropriés
- ✅ Respecter critères de taille optimale (max 50 lignes, max 3 fichiers)
- ✅ Gérer dépendances entre sous-tâches
- ✅ Utiliser pensée séquentielle pour structurer

**Pattern d'Intégration:**
```typescript
// Intégration avec décomposition des tâches
async function coordinateWithTaskDecomposition(
  task: Task,
  roles: Role[],
  context: Context
): Promise<CoordinatedDecomposition> {
  // 1. Décomposer tâche
  const decomposition = await decomposeTask(task, context);
  
  // 2. Assigner sous-tâches aux rôles
  const assignments: RoleAssignment[] = [];
  
  for (const subtask of decomposition.subtasks) {
    // 3. Identifier rôle approprié pour sous-tâche
    const role = identifyRoleForSubtask(subtask, roles, context);
    
    assignments.push({
      subtask,
      role,
      priority: calculatePriority(subtask, role),
      estimatedTime: estimateTime(subtask, role)
    });
  }
  
  // 4. Résoudre dépendances
  const orderedAssignments = resolveDependencies(assignments);
  
  // 5. Planifier exécution
  const executionPlan = await planExecution(orderedAssignments, context);
  
  return {
    decomposition,
    assignments: orderedAssignments,
    executionPlan
  };
}
```

### 4. Orchestration des Agents

**TOUJOURS:**
- ✅ Orchestrer exécution séquentielle/parallèle
- ✅ Gérer dépendances entre agents
- ✅ Partager résultats entre agents
- ✅ Valider résultats de chaque agent
- ✅ Gérer erreurs et récupération

**Pattern d'Orchestration:**
```typescript
// Orchestration des agents
async function orchestrateAgents(
  plan: ExecutionPlan,
  context: Context
): Promise<OrchestrationResult> {
  const results: AgentResult[] = [];
  
  // 1. Exécuter étapes séquentielles
  for (const step of plan.steps) {
    if (step.dependsOn.length > 0) {
      // 2. Vérifier dépendances satisfaites
      const dependenciesSatisfied = checkDependencies(
        step.dependsOn,
        results
      );
      
      if (!dependenciesSatisfied) {
        throw new Error(`Dépendances non satisfaites pour ${step.role}`);
      }
    }
    
    // 3. Exécuter étape
    const result = await executeStep(step, context);
    results.push(result);
    
    // 4. Partager résultats avec autres agents
    await shareResults(result, plan.roles, context);
  }
  
  // 5. Exécuter étapes parallélisables
  const parallelResults = await Promise.all(
    plan.parallelizable.map(step => executeStep(step, context))
  );
  results.push(...parallelResults);
  
  // 6. Consolider résultats
  return consolidateResults(results, context);
}
```

### 5. Communication Inter-Agents

**TOUJOURS:**
- ✅ Partager contexte essentiel
- ✅ Communiquer résultats intermédiaires
- ✅ Résoudre conflits entre agents
- ✅ Consolider résultats finaux
- ✅ Utiliser fichiers JSON pour communication structurée

**Référence:** `@.cursor/rules/sub-agents-communication.md` - Communication inter-agents  
**Référence:** `@docs/AGENT_COORDINATION_STATE.json` - État coordination  
**Référence:** `@docs/AGENT_TASKS_QUEUE.json` - File d'attente tâches

## 🔄 Workflow de Coordination Amélioré

### Workflow Standard avec Identification Automatique

1. **Analyser tâche complexe** → Identifier complexité, type, dépendances
2. **Identifier rôles nécessaires automatiquement** → Selon type et complexité
3. **Décomposer tâche en sous-tâches** → Intégration avec task-decomposition
4. **Planifier exécution** → Séquentielle/parallèle selon dépendances
5. **Assigner sous-tâches aux rôles** → Selon capacités et expertise
6. **Orchestrer exécution** → Coordination entre rôles
7. **Communiquer résultats** → Partage structuré entre agents
8. **Consolider résultats** → Résultat final unifié

**Pattern:**
```typescript
// Workflow complet de coordination amélioré
async function coordinateMultiAgents(
  task: Task,
  context: Context
): Promise<CoordinationResult> {
  // 1. Analyser tâche
  const analysis = await analyzeTask(task, context);
  
  // 2. Identifier rôles nécessaires automatiquement
  const roles = await identifyRequiredRoles(analysis, context);
  
  // 3. Décomposer tâche avec intégration task-decomposition
  const decomposition = await coordinateWithTaskDecomposition(
    task,
    roles,
    context
  );
  
  // 4. Planifier exécution
  const plan = await planMultiAgentExecution(
    task,
    roles,
    context
  );
  
  // 5. Orchestrer exécution
  const orchestration = await orchestrateAgents(plan, context);
  
  // 6. Consolider résultats
  return consolidateResults(orchestration, context);
}
```

## ⚠️ Règles

### TOUJOURS:

- ✅ Identifier automatiquement rôles nécessaires
- ✅ Planifier exécution selon dépendances
- ✅ Intégrer avec décomposition des tâches
- ✅ Coordonner exécution entre rôles
- ✅ Partager contexte structuré
- ✅ Consolider résultats
- ✅ Gérer erreurs et récupération

### NE JAMAIS:

- ❌ Ignorer coordination nécessaire
- ❌ Ne pas identifier rôles automatiquement
- ❌ Ne pas planifier exécution
- ❌ Ne pas intégrer avec décomposition des tâches
- ❌ Ne pas partager contexte
- ❌ Ignorer dépendances entre agents
- ❌ Ignorer erreurs sans récupération

## 🔗 Références

### Règles Intégrées

- `@.cursor/rules/senior-architect-oversight.md` - Supervision architecte
- `@.cursor/rules/task-decomposition.md` - Décomposition des tâches
- `@.cursor/rules/sub-agents-roles.md` - Rôles des sub-agents
- `@.cursor/rules/sub-agents-orchestration.md` - Orchestration principale
- `@.cursor/rules/sub-agents-communication.md` - Communication inter-agents

### Configuration

- `@docs/AGENT_ROLES_CONFIG.json` - Configuration des rôles
- `@docs/AGENT_COORDINATION_STATE.json` - État coordination
- `@docs/AGENT_TASKS_QUEUE.json` - File d'attente tâches

---

**Note:** Cette règle a été améliorée avec identification automatique des rôles, planification d'exécution et intégration avec la décomposition des tâches.

**Version:** 2.0.0  
**Dernière mise à jour:** 2025-01-29

