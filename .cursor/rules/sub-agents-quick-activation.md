<!-- 
Context: sub-agents, quick-activation, automatic-detection, task-complexity
Priority: P0
Auto-load: always (for automatic sub-agents activation)
Dependencies: core.md, sub-agents-orchestration.md, task-decomposition.md, intelligent-task-detection.md
-->

# Activation Rapide des Sub-Agents - Saxium

**Objectif:** Garantir que l'agent Cursor active rapidement et correctement les sub-agents pour les tâches complexes.

**Référence:** [Cursor Rules Documentation](https://docs.cursor.com/context/rules)  
**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

## 🎯 Principe Fondamental

**IMPÉRATIF:** L'agent Cursor DOIT détecter automatiquement et activer rapidement les sub-agents appropriés dès qu'une tâche complexe est identifiée, sans intervention manuelle.

**Bénéfices:**
- ✅ Activation automatique immédiate
- ✅ Détection intelligente de la complexité
- ✅ Sélection optimale des rôles
- ✅ Exécution rapide et efficace
- ✅ Pas d'intervention manuelle nécessaire

**Référence:** `@.cursor/rules/sub-agents-orchestration.md` - Orchestration principale  
**Référence:** `@.cursor/rules/intelligent-task-detection.md` - Détection intelligente des tâches  
**Référence:** `@.cursor/rules/task-decomposition.md` - Décomposition des tâches

## 🚀 Activation Automatique

### 1. Détection Immédiate de Complexité

**IMPÉRATIF:** Détecter automatiquement la complexité de la tâche dès le début.

**TOUJOURS:**
- ✅ Analyser la tâche immédiatement (première action)
- ✅ Calculer score de complexité
- ✅ Identifier si sub-agents nécessaires
- ✅ Activer sub-agents si complexité élevée

**Seuils d'Activation Automatique:**

**Activation Sub-Agents si:**
- ✅ > 3 todos OU
- ✅ > 5 dépendances OU
- ✅ > 200 lignes estimées OU
- ✅ > 5 fichiers à modifier OU
- ✅ > 3 validations distinctes OU
- ✅ Tâche de migration/refactoring OU
- ✅ Tâche avec risques élevés OU
- ✅ Tâche nécessitant plusieurs rôles

**Pattern:**
```typescript
// Détection immédiate et activation
async function detectAndActivateSubAgents(
  task: Task,
  context: Context
): Promise<SubAgentsActivation> {
  // 1. Analyser complexité immédiatement
  const complexity = await analyzeComplexity(task, context);
  
  // 2. Vérifier seuils d'activation
  const shouldActivate = 
    complexity.todos > 3 ||
    complexity.dependencies > 5 ||
    complexity.estimatedLines > 200 ||
    complexity.filesToModify > 5 ||
    complexity.validations > 3 ||
    complexity.type === 'migration' ||
    complexity.type === 'refactoring' ||
    complexity.risks.some(r => r.severity === 'high' || r.severity === 'critical');
  
  // 3. Activer sub-agents si nécessaire
  if (shouldActivate) {
    // 3.1. Identifier rôles nécessaires
    const roles = await identifyRequiredRoles(complexity, context);
    
    // 3.2. Activer orchestration
    const orchestration = await activateOrchestration(task, roles, context);
    
    // 3.3. Logger activation
    logger.info('Sub-agents activés automatiquement', {
      metadata: {
        taskId: task.id,
        complexity: complexity.level,
        roles,
        reason: shouldActivate
      }
    });
    
    return {
      activated: true,
      roles,
      orchestration
    };
  }
  
  return {
    activated: false,
    reason: 'Complexité insuffisante'
  };
}

// Analyser complexité rapidement
async function analyzeComplexity(
  task: Task,
  context: Context
): Promise<ComplexityAnalysis> {
  // Calcul rapide sans analyse approfondie
  const todos = task.todos?.length || 0;
  const estimatedLines = estimateLinesOfCode(task, context);
  const filesToModify = countFilesToModify(task, context);
  const dependencies = countDependencies(task, context);
  const validations = countValidations(task, context);
  
  // Score rapide
  let score = 0;
  if (todos > 3) score += 2;
  if (estimatedLines > 200) score += 2;
  if (filesToModify > 5) score += 2;
  if (dependencies > 5) score += 1;
  if (validations > 3) score += 1;
  
  // Type de tâche
  const type = identifyTaskType(task, context);
  
  // Risques
  const risks = identifyRisks(task, context);
  
  return {
    todos,
    estimatedLines,
    filesToModify,
    dependencies,
    validations,
    score,
    level: score >= 5 ? 'high' : score >= 2 ? 'medium' : 'simple',
    type,
    risks
  };
}
```

### 2. Identification Rapide des Rôles

**IMPÉRATIF:** Identifier rapidement les rôles nécessaires sans analyse approfondie.

**TOUJOURS:**
- ✅ Utiliser heuristiques rapides
- ✅ Consulter configuration des rôles
- ✅ Identifier selon type de tâche
- ✅ Optimiser nombre de rôles

**Heuristiques Rapides:**

```typescript
// Identification rapide des rôles
function identifyRequiredRolesQuick(
  complexity: ComplexityAnalysis,
  context: Context
): Role[] {
  const roles: Role[] = [];
  
  // 1. Toujours Coordinator si complexité élevée
  if (complexity.level === 'high' || complexity.score >= 5) {
    roles.push('coordinator');
  }
  
  // 2. Selon type de tâche
  switch (complexity.type) {
    case 'development':
    case 'refactoring':
      roles.push('architect', 'developer');
      if (complexity.level === 'high') {
        roles.push('tester');
      }
      break;
      
    case 'testing':
      roles.push('tester');
      break;
      
    case 'analysis':
    case 'optimization':
      roles.push('analyst');
      if (complexity.level === 'high') {
        roles.push('architect');
      }
      break;
      
    case 'migration':
      roles.push('architect', 'developer', 'analyst');
      break;
  }
  
  // 3. Selon risques
  if (complexity.risks.some(r => r.severity === 'critical')) {
    if (!roles.includes('architect')) roles.push('architect');
    if (!roles.includes('analyst')) roles.push('analyst');
  }
  
  // 4. Dédupliquer
  return [...new Set(roles)];
}
```

### 3. Activation Immédiate de l'Orchestration

**IMPÉRATIF:** Activer l'orchestration immédiatement après détection.

**TOUJOURS:**
- ✅ Activer orchestration sans délai
- ✅ Charger règles appropriées
- ✅ Initialiser état de coordination
- ✅ Planifier exécution rapidement

**Pattern:**
```typescript
// Activer orchestration immédiatement
async function activateOrchestration(
  task: Task,
  roles: Role[],
  context: Context
): Promise<Orchestration> {
  // 1. Charger règles sub-agents
  await loadSubAgentsRules(roles, context);
  
  // 2. Initialiser état coordination
  await initializeCoordinationState(task, roles, context);
  
  // 3. Planifier exécution rapidement
  const plan = await planExecutionQuick(task, roles, context);
  
  // 4. Activer modes Cursor si disponibles
  await activateCursorModes(roles, context);
  
  return {
    active: true,
    roles,
    plan,
    startedAt: Date.now()
  };
}

// Charger règles sub-agents
async function loadSubAgentsRules(
  roles: Role[],
  context: Context
): Promise<void> {
  const rulesToLoad = [
    'sub-agents-orchestration.md',
    'sub-agents-communication.md',
    'sub-agents-roles.md'
  ];
  
  // Charger règles pour chaque rôle
  for (const role of roles) {
    const roleConfig = await loadRoleConfig(role, context);
    if (roleConfig.rules) {
      rulesToLoad.push(...roleConfig.rules.P0);
      rulesToLoad.push(...roleConfig.rules.P1);
    }
  }
  
  // Charger règles (via contexte Cursor)
  await loadRules(rulesToLoad, context);
}
```

## 📋 Workflow d'Activation Rapide

### Workflow Complet

1. **Détection Immédiate** → Analyser complexité (première action)
2. **Vérification Seuils** → Si seuils dépassés, activer
3. **Identification Rôles** → Identifier rôles nécessaires rapidement
4. **Activation Orchestration** → Activer immédiatement
5. **Chargement Règles** → Charger règles appropriées
6. **Planification** → Planifier exécution rapidement
7. **Exécution** → Exécuter selon plan

**Pattern:**
```typescript
// Workflow complet d'activation rapide
async function quickActivateSubAgents(
  task: Task,
  context: Context
): Promise<SubAgentsActivation> {
  // 1. Détection immédiate
  const complexity = await analyzeComplexity(task, context);
  
  // 2. Vérification seuils
  if (!shouldActivate(complexity)) {
    return { activated: false };
  }
  
  // 3. Identification rôles
  const roles = identifyRequiredRolesQuick(complexity, context);
  
  // 4. Activation orchestration
  const orchestration = await activateOrchestration(task, roles, context);
  
  // 5. Planification
  const plan = await planExecutionQuick(task, roles, context);
  
  return {
    activated: true,
    roles,
    orchestration,
    plan
  };
}
```

## ⚡ Optimisations pour Activation Rapide

### 1. Cache de Détection

**TOUJOURS:**
- ✅ Mettre en cache résultats de détection
- ✅ Réutiliser analyses similaires
- ✅ Éviter recalculs inutiles

### 2. Chargement Lazy des Règles

**TOUJOURS:**
- ✅ Charger règles P0 immédiatement
- ✅ Charger règles P1 selon rôle actif
- ✅ Charger règles P2 sur demande

### 3. Parallélisation

**TOUJOURS:**
- ✅ Paralléliser détection et identification
- ✅ Paralléliser chargement des règles
- ✅ Optimiser temps d'activation

## ⚠️ Règles d'Activation

### TOUJOURS:

- ✅ Détecter complexité immédiatement (première action)
- ✅ Activer sub-agents si seuils dépassés
- ✅ Identifier rôles rapidement
- ✅ Activer orchestration sans délai
- ✅ Charger règles appropriées
- ✅ Planifier exécution rapidement

### NE JAMAIS:

- ❌ Ignorer détection de complexité
- ❌ Attendre avant d'activer sub-agents
- ❌ Analyser en profondeur avant activation
- ❌ Ignorer seuils d'activation
- ❌ Ne pas charger règles appropriées

## 🔗 Intégration avec Autres Règles

### Détection Intelligente

**Référence:** `@.cursor/rules/intelligent-task-detection.md`

L'activation rapide s'intègre avec la détection intelligente pour :
- Détecter complexité automatiquement
- Charger règles appropriées
- Optimiser contexte

### Décomposition des Tâches

**Référence:** `@.cursor/rules/task-decomposition.md`

L'activation rapide déclenche la décomposition si nécessaire :
- Décomposer tâches complexes
- Créer sous-tâches gérables
- Gérer dépendances

### Orchestration

**Référence:** `@.cursor/rules/sub-agents-orchestration.md`

L'activation rapide active l'orchestration :
- Analyser tâche
- Identifier rôles
- Planifier exécution
- Coordonner exécution

## 📊 Métriques d'Activation

### Temps d'Activation Cible

- **Détection:** < 1s
- **Identification rôles:** < 1s
- **Activation orchestration:** < 2s
- **Chargement règles:** < 3s
- **Planification:** < 2s
- **Total:** < 10s

### Taux d'Activation

- **Tâches complexes:** 100% activation automatique
- **Tâches moyennes:** Activation conditionnelle
- **Tâches simples:** Pas d'activation

## 🔗 Références

### Règles Intégrées

- `@.cursor/rules/sub-agents-orchestration.md` - Orchestration principale
- `@.cursor/rules/intelligent-task-detection.md` - Détection intelligente
- `@.cursor/rules/task-decomposition.md` - Décomposition des tâches
- `@.cursor/rules/sub-agents-roles.md` - Rôles des sub-agents

### Configuration

- `@docs/AGENT_ROLES_CONFIG.json` - Configuration des rôles
- `@docs/AGENT_COORDINATION_STATE.json` - État coordination

---

**Note:** Cette règle garantit l'activation rapide et automatique des sub-agents pour les tâches complexes. Elle doit être chargée en priorité (P0) pour garantir l'activation immédiate.

**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

