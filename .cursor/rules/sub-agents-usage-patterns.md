<!-- 
Context: sub-agents, usage-patterns, practical-examples, integration
Priority: P1
Auto-load: when using sub-agents or when task requires multi-role coordination
Dependencies: core.md, sub-agents-orchestration.md, sub-agents-quick-activation.md, sub-agents-roles.md
-->

# Patterns d'Utilisation des Sub-Agents - Saxium

**Objectif:** Fournir des patterns pratiques et concrets pour utiliser efficacement les sub-agents dans Cursor.

**Référence:** [Cursor Rules Documentation](https://docs.cursor.com/context/rules)  
**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

## 🎯 Principe Fondamental

**IMPÉRATIF:** Utiliser les patterns d'utilisation pour activer et coordonner efficacement les sub-agents selon le type de tâche.

**Bénéfices:**
- ✅ Activation rapide et correcte
- ✅ Coordination efficace entre rôles
- ✅ Exécution optimisée
- ✅ Réutilisation de patterns éprouvés

**Référence:** `@.cursor/rules/sub-agents-quick-activation.md` - Activation rapide  
**Référence:** `@.cursor/rules/sub-agents-orchestration.md` - Orchestration principale  
**Référence:** `@docs/SUB_AGENTS_QUICK_START.md` - Guide démarrage rapide

## 📋 Patterns d'Activation

### Pattern 1: Activation Automatique (Recommandé)

**Quand utiliser:** Pour toutes les tâches complexes

**Pattern:**
```
1. L'agent détecte automatiquement la complexité
2. Si seuils dépassés (> 3 todos, > 200 lignes, etc.)
3. Activation automatique des sub-agents
4. Identification des rôles nécessaires
5. Orchestration immédiate
```

**Exemple:**
```
Utilisateur: "Créer une nouvelle fonctionnalité complète de gestion des devis avec validation, tests et documentation"

Agent:
1. Détecte complexité élevée (> 3 todos, > 200 lignes)
2. Active automatiquement sub-agents
3. Identifie rôles: Coordinator, Architect, Developer, Tester
4. Orchestre exécution selon workflow standard
```

### Pattern 2: Activation Manuelle

**Quand utiliser:** Pour forcer l'activation ou pour tâches spécifiques

**Pattern:**
```
Référencer explicitement: @.cursor/rules/sub-agents-quick-activation.md
```

**Exemple:**
```
Utilisateur: "@.cursor/rules/sub-agents-quick-activation.md Créer un nouveau module d'authentification"

Agent:
1. Charge règles d'activation rapide
2. Active sub-agents même si complexité moyenne
3. Orchestre avec tous les rôles appropriés
```

## 🔄 Patterns d'Orchestration

### Pattern 1: Workflow Standard (Développement Complet)

**Quand utiliser:** Pour développement de fonctionnalités complètes

**Séquence:**
1. **Coordinator** → Analyse tâche, identifie rôles
2. **Architect** → Valide architecture, priorise
3. **Developer** → Implémente code
4. **Tester** → Crée tests, valide
5. **Analyst** → Analyse, optimise
6. **Architect** → Review final
7. **Coordinator** → Consolide résultats

**Pattern:**
```typescript
// Workflow standard activé automatiquement
async function standardWorkflow(task: Task) {
  // 1. Coordinator analyse
  const analysis = await coordinator.analyzeTask(task);
  const roles = await coordinator.identifyRoles(analysis);
  
  // 2. Architect valide
  const architecture = await architect.validateArchitecture(task);
  const priorities = await architect.prioritize(analysis);
  
  // 3. Developer implémente
  const implementation = await developer.implement(task, architecture);
  
  // 4. Tester valide
  const tests = await tester.createTests(implementation);
  const validation = await tester.validate(implementation, tests);
  
  // 5. Analyst optimise
  const optimization = await analyst.analyze(implementation);
  const improvements = await analyst.optimize(optimization);
  
  // 6. Architect review
  const review = await architect.reviewFinal(implementation, improvements);
  
  // 7. Coordinator consolide
  return await coordinator.consolidate({
    implementation,
    tests,
    validation,
    optimization,
    review
  });
}
```

### Pattern 2: Workflow Quick Fix (Correction Rapide)

**Quand utiliser:** Pour corrections simples et rapides

**Séquence:**
1. **Developer** → Correction directe
2. **Tester** → Validation rapide

**Pattern:**
```typescript
// Workflow quick fix pour corrections simples
async function quickFixWorkflow(task: Task) {
  // 1. Developer corrige
  const fix = await developer.fix(task);
  
  // 2. Tester valide rapidement
  const validation = await tester.validateQuick(fix);
  
  return { fix, validation };
}
```

### Pattern 3: Workflow Refactoring

**Quand utiliser:** Pour refactoring complexe

**Séquence:**
1. **Architect** → Analyse architecture, planifie
2. **Analyst** → Analyse code existant
3. **Developer** → Refactore
4. **Tester** → Tests de régression
5. **Architect** → Valide architecture finale

**Pattern:**
```typescript
// Workflow refactoring pour refactoring complexe
async function refactoringWorkflow(task: Task) {
  // 1. Architect analyse et planifie
  const plan = await architect.analyzeAndPlan(task);
  
  // 2. Analyst analyse code existant
  const analysis = await analyst.analyzeExistingCode(task);
  
  // 3. Developer refactore
  const refactored = await developer.refactor(task, plan, analysis);
  
  // 4. Tester tests de régression
  const regressionTests = await tester.regressionTests(refactored);
  
  // 5. Architect valide architecture finale
  const finalValidation = await architect.validateFinal(refactored);
  
  return { refactored, regressionTests, finalValidation };
}
```

## 🎯 Patterns par Type de Tâche

### Pattern 1: Création de Fonctionnalité

**Rôles nécessaires:** Coordinator, Architect, Developer, Tester

**Pattern:**
```
1. Coordinator analyse et planifie
2. Architect valide architecture
3. Developer implémente
4. Tester crée tests
5. Architect review final
```

### Pattern 2: Correction de Bug

**Rôles nécessaires:** Analyst, Developer, Tester

**Pattern:**
```
1. Analyst recherche cause racine
2. Developer corrige
3. Tester valide correction
```

### Pattern 3: Optimisation Performance

**Rôles nécessaires:** Analyst, Architect, Developer

**Pattern:**
```
1. Analyst analyse performance
2. Architect valide optimisations
3. Developer implémente optimisations
```

### Pattern 4: Migration/Refactoring

**Rôles nécessaires:** Architect, Analyst, Developer, Tester

**Pattern:**
```
1. Architect planifie migration
2. Analyst analyse code existant
3. Developer migre/refactore
4. Tester tests de régression
5. Architect valide final
```

## 📊 Patterns de Communication

### Pattern 1: Communication via Fichiers JSON

**Quand utiliser:** Pour coordination entre rôles

**Fichiers:**
- `docs/AGENT_COORDINATION_STATE.json` - État coordination
- `docs/AGENT_TASKS_QUEUE.json` - File d'attente
- `docs/AGENT_EVENTS.json` - Événements

**Pattern:**
```typescript
// Lire état coordination
const state = await readFile('docs/AGENT_COORDINATION_STATE.json');
const coordinationState = JSON.parse(state);

// Mettre à jour état
coordinationState.state.currentTask = taskId;
coordinationState.state.activeRoles = roles;
coordinationState.state.status = 'in-progress';

// Sauvegarder
await writeFile('docs/AGENT_COORDINATION_STATE.json', 
  JSON.stringify(coordinationState, null, 2));
```

### Pattern 2: Communication via Messages

**Quand utiliser:** Pour communication directe entre rôles

**Pattern:**
```typescript
// Envoyer message
const message = {
  type: 'task',
  from: 'coordinator',
  to: 'developer',
  task: taskId,
  data: taskData,
  timestamp: Date.now()
};

// Sauvegarder dans événements
await appendEvent(message);
```

## 🔧 Patterns d'Intégration

### Pattern 1: Intégration avec Task Decomposition

**Quand utiliser:** Pour tâches très complexes nécessitant décomposition

**Pattern:**
```
1. Détecter complexité très élevée
2. Activer sub-agents
3. Décomposer tâche en sous-tâches
4. Assigner sous-tâches aux rôles appropriés
5. Orchestrer exécution
```

**Référence:** `@.cursor/rules/task-decomposition.md`

### Pattern 2: Intégration avec Persistent Execution

**Quand utiliser:** Pour runs longs nécessitant persistance

**Pattern:**
```
1. Activer sub-agents
2. Sauvegarder état régulièrement
3. Reprendre après interruption
4. Continuer orchestration
```

**Référence:** `@.cursor/rules/persistent-execution.md`

### Pattern 3: Intégration avec Multi-Chat Coordination

**Quand utiliser:** Pour coordination entre plusieurs chats Cursor

**Pattern:**
```
1. Vérifier zones de travail
2. Activer sub-agents si nécessaire
3. Coordonner avec autres chats
4. Éviter conflits
```

**Référence:** `@.cursor/rules/multi-chat-coordination.md`

## ⚡ Optimisations

### Pattern 1: Parallélisation

**Quand utiliser:** Pour étapes indépendantes

**Pattern:**
```typescript
// Exécuter étapes indépendantes en parallèle
const [architectResult, analystResult] = await Promise.all([
  architect.validateArchitecture(task),
  analyst.analyzeCode(task)
]);
```

### Pattern 2: Cache Intelligent

**Quand utiliser:** Pour éviter recalculs

**Pattern:**
```typescript
// Mettre en cache résultats d'analyse
const cacheKey = `analysis-${task.id}`;
const cached = await getCache(cacheKey);
if (cached) return cached;

const analysis = await analyzeTask(task);
await setCache(cacheKey, analysis);
return analysis;
```

## ⚠️ Règles d'Utilisation

### TOUJOURS:

- ✅ Utiliser activation automatique pour tâches complexes
- ✅ Suivre workflows standards selon type de tâche
- ✅ Communiquer via fichiers JSON pour coordination
- ✅ Paralléliser étapes indépendantes
- ✅ Sauvegarder état régulièrement

### NE JAMAIS:

- ❌ Ignorer activation automatique si complexité élevée
- ❌ Utiliser workflow inapproprié
- ❌ Ignorer communication entre rôles
- ❌ Exécuter séquentiellement si parallélisation possible
- ❌ Ne pas sauvegarder état

## 🔗 Références

### Règles Intégrées

- `@.cursor/rules/sub-agents-quick-activation.md` - Activation rapide
- `@.cursor/rules/sub-agents-orchestration.md` - Orchestration principale
- `@.cursor/rules/sub-agents-roles.md` - Rôles des sub-agents
- `@.cursor/rules/sub-agents-communication.md` - Communication inter-agents

### Documentation

- `@docs/SUB_AGENTS_QUICK_START.md` - Guide démarrage rapide
- `@docs/SUB_AGENTS_GUIDE.md` - Guide complet
- `@docs/AGENT_ROLES_CONFIG.json` - Configuration rôles

---

**Note:** Ces patterns fournissent des exemples concrets pour utiliser efficacement les sub-agents. Adapter selon le contexte spécifique de la tâche.

**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

