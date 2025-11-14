# Guide d'Implémentation Pratique - Sub-Agents

**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

## 🎯 Vue d'Ensemble

Ce guide fournit des instructions pratiques pour implémenter et utiliser les sub-agents dans Cursor.

## 📋 Prérequis

### Fichiers de Configuration

Les fichiers suivants doivent exister et être à jour :

- ✅ `docs/AGENT_ROLES_CONFIG.json` - Configuration des rôles
- ✅ `docs/AGENT_COORDINATION_STATE.json` - État de coordination
- ✅ `docs/AGENT_TASKS_QUEUE.json` - File d'attente des tâches
- ✅ `docs/AGENT_EVENTS.json` - Historique des événements

### Règles Cursor

Les règles suivantes doivent être disponibles :

- ✅ `.cursor/rules/sub-agents-quick-activation.md` (P0)
- ✅ `.cursor/rules/sub-agents-orchestration.md` (P1)
- ✅ `.cursor/rules/sub-agents-roles.md` (P1)
- ✅ `.cursor/rules/sub-agents-communication.md` (P1)
- ✅ `.cursor/rules/sub-agents-usage-patterns.md` (P1)

## 🚀 Implémentation Pratique

### Étape 1: Activation Automatique

**Objectif:** Activer automatiquement les sub-agents pour les tâches complexes.

**Mécanisme:**
1. L'agent Cursor détecte la complexité de la tâche (première action)
2. Si seuils dépassés, activation automatique
3. Identification des rôles nécessaires
4. Orchestration immédiate

**Seuils d'activation:**
- > 3 todos OU
- > 5 dépendances OU
- > 200 lignes estimées OU
- > 5 fichiers à modifier OU
- > 3 validations distinctes OU
- Tâche de migration/refactoring OU
- Tâche avec risques élevés

**Référence:** `@.cursor/rules/sub-agents-quick-activation.md`

### Étape 2: Mise à Jour de l'État de Coordination

**Objectif:** Maintenir l'état de coordination à jour.

**Pattern:**
```typescript
// Lire état actuel
const stateFile = await readFile('docs/AGENT_COORDINATION_STATE.json');
const state = JSON.parse(stateFile);

// Mettre à jour état
state.state.currentTask = taskId;
state.state.activeRoles = ['coordinator', 'architect', 'developer'];
state.state.status = 'in-progress';
state.state.queues.developer.push({
  id: subtaskId,
  task: subtask,
  priority: 'high',
  assignedTo: 'developer'
});
state.lastUpdated = new Date().toISOString();

// Sauvegarder
await writeFile('docs/AGENT_COORDINATION_STATE.json', 
  JSON.stringify(state, null, 2));
```

### Étape 3: Ajout de Tâches à la File d'Attente

**Objectif:** Ajouter des tâches à la file d'attente globale.

**Pattern:**
```typescript
// Lire file d'attente
const queueFile = await readFile('docs/AGENT_TASKS_QUEUE.json');
const queue = JSON.parse(queueFile);

// Ajouter tâche
queue.queue.push({
  id: taskId,
  type: 'development',
  priority: 'high',
  status: 'pending',
  assignedTo: null,
  dependencies: [],
  estimatedTime: 180000,
  createdAt: new Date().toISOString()
});

// Mettre à jour métadonnées
queue.metadata.totalTasks++;
queue.metadata.pendingTasks++;
queue.metadata.priority.high++;
queue.lastUpdated = new Date().toISOString();

// Sauvegarder
await writeFile('docs/AGENT_TASKS_QUEUE.json', 
  JSON.stringify(queue, null, 2));
```

### Étape 4: Enregistrement d'Événements

**Objectif:** Enregistrer les événements pour suivi et analyse.

**Pattern:**
```typescript
// Lire événements
const eventsFile = await readFile('docs/AGENT_EVENTS.json');
const events = JSON.parse(eventsFile);

// Ajouter événement
const event = {
  id: `event-${Date.now()}`,
  type: 'task-started',
  role: 'coordinator',
  taskId: taskId,
  data: {
    complexity: 'high',
    roles: ['coordinator', 'architect', 'developer']
  },
  timestamp: new Date().toISOString(),
  severity: 'info'
};

events.events.push(event);

// Mettre à jour métadonnées
events.metadata.totalEvents++;
events.metadata.eventsByType[event.type] = 
  (events.metadata.eventsByType[event.type] || 0) + 1;
events.metadata.eventsByRole[event.role] = 
  (events.metadata.eventsByRole[event.role] || 0) + 1;
events.metadata.lastEventId = event.id;
events.metadata.lastEventTimestamp = event.timestamp;
events.lastUpdated = new Date().toISOString();

// Sauvegarder
await writeFile('docs/AGENT_EVENTS.json', 
  JSON.stringify(events, null, 2));
```

### Étape 5: Orchestration selon Workflow

**Objectif:** Exécuter le workflow approprié selon le type de tâche.

**Workflow Standard:**
```
1. Coordinator → Analyse tâche
2. Architect → Validation architecture
3. Developer → Implémentation
4. Tester → Validation et tests
5. Analyst → Analyse et optimisation
6. Architect → Review final
7. Coordinator → Consolidation
```

**Pattern:**
```typescript
// Workflow standard
async function executeStandardWorkflow(task: Task) {
  // 1. Coordinator analyse
  await updateState({ 
    currentTask: task.id, 
    activeRoles: ['coordinator'],
    status: 'analyzing'
  });
  const analysis = await coordinator.analyzeTask(task);
  
  // 2. Architect valide
  await updateState({ 
    activeRoles: ['coordinator', 'architect'],
    status: 'validating'
  });
  const architecture = await architect.validateArchitecture(task);
  
  // 3. Developer implémente
  await updateState({ 
    activeRoles: ['coordinator', 'architect', 'developer'],
    status: 'implementing'
  });
  const implementation = await developer.implement(task, architecture);
  
  // 4. Tester valide
  await updateState({ 
    activeRoles: ['coordinator', 'architect', 'developer', 'tester'],
    status: 'testing'
  });
  const tests = await tester.createTests(implementation);
  const validation = await tester.validate(implementation, tests);
  
  // 5. Analyst optimise
  await updateState({ 
    activeRoles: ['coordinator', 'architect', 'developer', 'tester', 'analyst'],
    status: 'optimizing'
  });
  const optimization = await analyst.analyze(implementation);
  
  // 6. Architect review
  await updateState({ 
    activeRoles: ['coordinator', 'architect'],
    status: 'reviewing'
  });
  const review = await architect.reviewFinal(implementation, optimization);
  
  // 7. Coordinator consolide
  await updateState({ 
    activeRoles: ['coordinator'],
    status: 'consolidating'
  });
  const result = await coordinator.consolidate({
    implementation,
    tests,
    validation,
    optimization,
    review
  });
  
  // Finaliser
  await updateState({ 
    status: 'completed',
    currentTask: null,
    activeRoles: []
  });
  
  return result;
}
```

## 📊 Exemples Concrets

### Exemple 1: Création de Route API

**Tâche:** "Créer une nouvelle route API pour gérer les devis"

**Activation:**
1. Détecte complexité moyenne (3-4 todos, ~150 lignes)
2. Active sub-agents automatiquement
3. Identifie rôles: Coordinator, Architect, Developer, Tester

**Exécution:**
1. Coordinator analyse et planifie
2. Architect valide architecture (pattern modulaire)
3. Developer crée route dans `server/modules/devis/routes.ts`
4. Tester crée tests unitaires
5. Architect review final
6. Coordinator consolide résultats

### Exemple 2: Correction de Bug

**Tâche:** "Corriger le bug de calcul des prix dans les devis"

**Activation:**
1. Détecte complexité simple (1-2 todos, ~50 lignes)
2. Active workflow quick-fix
3. Identifie rôles: Developer, Tester

**Exécution:**
1. Developer corrige bug
2. Tester valide correction rapidement

### Exemple 3: Refactoring Complexe

**Tâche:** "Refactorer le module de gestion des projets"

**Activation:**
1. Détecte complexité très élevée (> 10 todos, > 500 lignes)
2. Active sub-agents avec tous les rôles
3. Décompose en sous-tâches

**Exécution:**
1. Architect analyse et planifie refactoring
2. Analyst analyse code existant (dette technique, anti-patterns)
3. Developer refactore par étapes
4. Tester tests de régression après chaque étape
5. Architect valide architecture finale

## 🔧 Helpers Pratiques

### Helper 1: Mise à Jour État

```typescript
// Helper pour mettre à jour l'état de coordination
async function updateCoordinationState(updates: Partial<CoordinationState>) {
  const stateFile = await readFile('docs/AGENT_COORDINATION_STATE.json');
  const state = JSON.parse(stateFile);
  
  // Mettre à jour
  Object.assign(state.state, updates);
  state.lastUpdated = new Date().toISOString();
  
  // Sauvegarder
  await writeFile('docs/AGENT_COORDINATION_STATE.json', 
    JSON.stringify(state, null, 2));
}
```

### Helper 2: Ajout Tâche à File

```typescript
// Helper pour ajouter une tâche à la file
async function addTaskToQueue(task: Task) {
  const queueFile = await readFile('docs/AGENT_TASKS_QUEUE.json');
  const queue = JSON.parse(queueFile);
  
  queue.queue.push({
    id: task.id,
    type: task.type,
    priority: task.priority || 'medium',
    status: 'pending',
    assignedTo: null,
    dependencies: task.dependencies || [],
    estimatedTime: task.estimatedTime || 180000,
    createdAt: new Date().toISOString()
  });
  
  queue.metadata.totalTasks++;
  queue.metadata.pendingTasks++;
  queue.metadata.priority[task.priority || 'medium']++;
  queue.lastUpdated = new Date().toISOString();
  
  await writeFile('docs/AGENT_TASKS_QUEUE.json', 
    JSON.stringify(queue, null, 2));
}
```

### Helper 3: Enregistrement Événement

```typescript
// Helper pour enregistrer un événement
async function logEvent(
  type: string,
  role: string,
  taskId: string,
  data: any,
  severity: 'info' | 'warning' | 'error' = 'info'
) {
  const eventsFile = await readFile('docs/AGENT_EVENTS.json');
  const events = JSON.parse(eventsFile);
  
  const event = {
    id: `event-${Date.now()}`,
    type,
    role,
    taskId,
    data,
    timestamp: new Date().toISOString(),
    severity
  };
  
  events.events.push(event);
  events.metadata.totalEvents++;
  events.metadata.eventsByType[type] = 
    (events.metadata.eventsByType[type] || 0) + 1;
  events.metadata.eventsByRole[role] = 
    (events.metadata.eventsByRole[role] || 0) + 1;
  events.metadata.lastEventId = event.id;
  events.metadata.lastEventTimestamp = event.timestamp;
  events.lastUpdated = new Date().toISOString();
  
  await writeFile('docs/AGENT_EVENTS.json', 
    JSON.stringify(events, null, 2));
}
```

## ✅ Checklist d'Implémentation

### Avant Utilisation

- [ ] Vérifier que tous les fichiers JSON existent
- [ ] Vérifier que toutes les règles sont disponibles
- [ ] Tester activation automatique avec tâche complexe
- [ ] Vérifier mise à jour des fichiers JSON

### Pendant Utilisation

- [ ] Mettre à jour état de coordination régulièrement
- [ ] Enregistrer événements importants
- [ ] Suivre workflow approprié
- [ ] Communiquer entre rôles via fichiers JSON

### Après Utilisation

- [ ] Finaliser état de coordination
- [ ] Enregistrer événement de completion
- [ ] Consolider résultats
- [ ] Nettoyer fichiers JSON si nécessaire

## 🔗 Références

### Règles

- `@.cursor/rules/sub-agents-quick-activation.md` - Activation rapide
- `@.cursor/rules/sub-agents-orchestration.md` - Orchestration
- `@.cursor/rules/sub-agents-usage-patterns.md` - Patterns d'utilisation

### Documentation

- `@docs/SUB_AGENTS_QUICK_START.md` - Guide démarrage rapide
- `@docs/SUB_AGENTS_GUIDE.md` - Guide complet
- `@docs/AGENT_ROLES_CONFIG.json` - Configuration rôles

---

**Note:** Ce guide fournit des instructions pratiques pour implémenter les sub-agents. Adapter selon les besoins spécifiques du projet.

**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

