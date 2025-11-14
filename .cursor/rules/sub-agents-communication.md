<!-- 
Context: sub-agents, communication, inter-agents, messages, coordination
Priority: P1
Auto-load: when task requires sub-agents coordination or communication
Dependencies: core.md, multi-agent-coordination.md, sub-agents-roles.md
-->

# Système de Sub-Agents - Communication - Saxium

**Objectif:** Définir le protocole de communication inter-agents avec format de messages structurés pour permettre la coordination efficace entre sub-agents.

**Référence:** [Cursor Rules Documentation](https://docs.cursor.com/context/rules)  
**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

## 🎯 Principe Fondamental

**IMPÉRATIF:** Les sub-agents DOIVENT communiquer via des messages structurés stockés dans des fichiers JSON partagés pour garantir la coordination et la traçabilité.

**Bénéfices:**
- ✅ Communication structurée et traçable
- ✅ Coordination efficace entre rôles
- ✅ Gestion des conflits
- ✅ Historique des communications
- ✅ Résolution automatique des problèmes

**Référence:** `@.cursor/rules/multi-agent-coordination.md` - Coordination multi-agents  
**Référence:** `@.cursor/rules/sub-agents-roles.md` - Rôles des sub-agents  
**Référence:** `@docs/AGENT_COORDINATION_STATE.json` - État coordination  
**Référence:** `@docs/AGENT_TASKS_QUEUE.json` - File d'attente tâches

## 📋 Format des Messages

### Structure de Base

**Tous les messages DOIVENT suivre cette structure:**

```typescript
interface AgentMessage {
  id: string;                    // Identifiant unique du message
  type: MessageType;             // Type de message (task, result, coordination, error, status)
  from: Role;                    // Rôle émetteur
  to: Role | Role[] | 'all';     // Rôle(s) destinataire(s)
  timestamp: string;              // Timestamp ISO 8601
  correlationId?: string;         // ID de corrélation pour messages liés
  priority: 'high' | 'medium' | 'low'; // Priorité du message
  payload: MessagePayload;        // Contenu du message (spécifique au type)
  metadata?: MessageMetadata;     // Métadonnées supplémentaires
}
```

### Types de Messages

#### 1. Message de Type `task`

**Utilisation:** Assigner une tâche à un rôle.

```typescript
interface TaskMessage extends AgentMessage {
  type: 'task';
  payload: {
    taskId: string;
    description: string;
    subtasks?: Subtask[];
    dependencies?: string[];      // IDs des tâches dépendantes
    estimatedTime?: number;      // Temps estimé en millisecondes
    deadline?: string;            // Deadline ISO 8601
    context?: Context;            // Contexte nécessaire pour la tâche
  };
}
```

**Exemple:**
```json
{
  "id": "msg-001",
  "type": "task",
  "from": "coordinator",
  "to": "developer",
  "timestamp": "2025-01-29T10:00:00Z",
  "correlationId": "task-001",
  "priority": "high",
  "payload": {
    "taskId": "task-001",
    "description": "Implémenter fonctionnalité X",
    "subtasks": [
      {
        "id": "subtask-001",
        "description": "Créer composant Y",
        "files": ["client/src/components/Y.tsx"]
      }
    ],
    "dependencies": [],
    "estimatedTime": 180000,
    "context": {
      "files": ["client/src/components/X.tsx"],
      "requirements": "Doit suivre patterns établis"
    }
  }
}
```

#### 2. Message de Type `result`

**Utilisation:** Communiquer le résultat d'une tâche.

```typescript
interface ResultMessage extends AgentMessage {
  type: 'result';
  payload: {
    taskId: string;
    success: boolean;
    result?: any;                 // Résultat de la tâche
    errors?: Error[];             // Erreurs rencontrées
    warnings?: Warning[];         // Avertissements
    filesModified?: string[];     // Fichiers modifiés
    metrics?: TaskMetrics;        // Métriques de la tâche
  };
}
```

**Exemple:**
```json
{
  "id": "msg-002",
  "type": "result",
  "from": "developer",
  "to": "coordinator",
  "timestamp": "2025-01-29T10:05:00Z",
  "correlationId": "task-001",
  "priority": "high",
  "payload": {
    "taskId": "task-001",
    "success": true,
    "result": {
      "componentCreated": true,
      "testsPassed": true
    },
    "filesModified": [
      "client/src/components/Y.tsx"
    ],
    "metrics": {
      "executionTime": 175000,
      "linesOfCode": 45
    }
  }
}
```

#### 3. Message de Type `coordination`

**Utilisation:** Coordonner l'exécution entre rôles.

```typescript
interface CoordinationMessage extends AgentMessage {
  type: 'coordination';
  payload: {
    action: 'start' | 'pause' | 'resume' | 'stop' | 'wait' | 'proceed';
    reason?: string;              // Raison de l'action
    dependencies?: string[];       // Dépendances à satisfaire
    nextRole?: Role;              // Prochain rôle à exécuter
    context?: Context;            // Contexte partagé
  };
}
```

**Exemple:**
```json
{
  "id": "msg-003",
  "type": "coordination",
  "from": "coordinator",
  "to": "all",
  "timestamp": "2025-01-29T10:06:00Z",
  "priority": "high",
  "payload": {
    "action": "proceed",
    "reason": "Tâche developer complétée, passer à tester",
    "nextRole": "tester",
    "context": {
      "completedTask": "task-001",
      "nextTask": "task-002"
    }
  }
}
```

#### 4. Message de Type `error`

**Utilisation:** Signaler une erreur nécessitant attention.

```typescript
interface ErrorMessage extends AgentMessage {
  type: 'error';
  payload: {
    errorId: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    error: {
      type: string;               // Type d'erreur
      message: string;             // Message d'erreur
      stack?: string;              // Stack trace
      context?: Context;           // Contexte de l'erreur
    };
    taskId?: string;               // Tâche associée
    recovery?: RecoveryPlan;       // Plan de récupération
  };
}
```

**Exemple:**
```json
{
  "id": "msg-004",
  "type": "error",
  "from": "developer",
  "to": ["coordinator", "architect"],
  "timestamp": "2025-01-29T10:07:00Z",
  "priority": "critical",
  "payload": {
    "errorId": "err-001",
    "severity": "high",
    "error": {
      "type": "TypeScriptError",
      "message": "Type 'X' is not assignable to type 'Y'",
      "context": {
        "file": "client/src/components/Y.tsx",
        "line": 42
      }
    },
    "taskId": "task-001",
    "recovery": {
      "action": "retry",
      "suggestedFix": "Corriger type dans interface"
    }
  }
}
```

#### 5. Message de Type `status`

**Utilisation:** Communiquer le statut d'une tâche ou d'un rôle.

```typescript
interface StatusMessage extends AgentMessage {
  type: 'status';
  payload: {
    status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'paused';
    taskId?: string;               // Tâche concernée
    progress?: number;             // Progression (0-100)
    estimatedTimeRemaining?: number; // Temps restant estimé
    message?: string;              // Message de statut
  };
}
```

**Exemple:**
```json
{
  "id": "msg-005",
  "type": "status",
  "from": "developer",
  "to": "coordinator",
  "timestamp": "2025-01-29T10:08:00Z",
  "priority": "medium",
  "payload": {
    "status": "in_progress",
    "taskId": "task-002",
    "progress": 60,
    "estimatedTimeRemaining": 120000,
    "message": "Implémentation en cours, 60% complété"
  }
}
```

## 🔄 Protocole de Communication

### 1. Envoi de Message

**TOUJOURS:**
- ✅ Créer message avec structure complète
- ✅ Générer ID unique pour le message
- ✅ Ajouter timestamp ISO 8601
- ✅ Définir priorité appropriée
- ✅ Ajouter correlationId si message lié
- ✅ Écrire dans fichier JSON approprié

**Pattern:**
```typescript
// Envoyer message
async function sendMessage(
  message: AgentMessage,
  context: Context
): Promise<void> {
  // 1. Valider structure message
  validateMessage(message);
  
  // 2. Générer ID si absent
  if (!message.id) {
    message.id = generateMessageId();
  }
  
  // 3. Ajouter timestamp si absent
  if (!message.timestamp) {
    message.timestamp = new Date().toISOString();
  }
  
  // 4. Écrire dans fichier approprié
  if (message.type === 'task') {
    await appendToQueue(message, context);
  } else if (message.type === 'coordination') {
    await updateCoordinationState(message, context);
  } else {
    await appendToMessages(message, context);
  }
  
  // 5. Notifier destinataires si nécessaire
  await notifyRecipients(message, context);
}
```

### 2. Réception de Message

**TOUJOURS:**
- ✅ Lire messages depuis fichiers JSON
- ✅ Filtrer messages selon rôle destinataire
- ✅ Trier par priorité et timestamp
- ✅ Traiter messages dans l'ordre
- ✅ Marquer messages comme traités

**Pattern:**
```typescript
// Recevoir messages
async function receiveMessages(
  role: Role,
  context: Context
): Promise<AgentMessage[]> {
  // 1. Lire fichiers JSON
  const coordinationState = await readCoordinationState(context);
  const tasksQueue = await readTasksQueue(context);
  
  // 2. Filtrer messages pour ce rôle
  const messages = [
    ...coordinationState.messages,
    ...tasksQueue.messages
  ].filter(msg => 
    msg.to === role || 
    msg.to === 'all' || 
    (Array.isArray(msg.to) && msg.to.includes(role))
  );
  
  // 3. Trier par priorité et timestamp
  messages.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
  });
  
  return messages;
}
```

### 3. Gestion des Conflits

**TOUJOURS:**
- ✅ Détecter conflits entre messages
- ✅ Résoudre conflits selon priorité
- ✅ Notifier rôles concernés
- ✅ Documenter résolution

**Pattern:**
```typescript
// Gérer conflits
async function handleConflicts(
  messages: AgentMessage[],
  context: Context
): Promise<ConflictResolution[]> {
  const conflicts: Conflict[] = [];
  const resolutions: ConflictResolution[] = [];
  
  // 1. Détecter conflits
  for (let i = 0; i < messages.length; i++) {
    for (let j = i + 1; j < messages.length; j++) {
      const conflict = detectConflict(messages[i], messages[j]);
      if (conflict) {
        conflicts.push(conflict);
      }
    }
  }
  
  // 2. Résoudre conflits
  for (const conflict of conflicts) {
    const resolution = await resolveConflict(conflict, context);
    resolutions.push(resolution);
    
    // 3. Notifier rôles concernés
    await notifyConflictResolution(resolution, context);
  }
  
  return resolutions;
}
```

## 📁 Fichiers de Communication

### 1. AGENT_COORDINATION_STATE.json

**Utilisation:** État partagé de coordination entre agents.

**Structure:**
- `state.currentTask`: Tâche actuelle
- `state.activeRoles`: Rôles actifs
- `state.queues`: Files d'attente par rôle
- `state.results`: Résultats intermédiaires
- `state.dependencies`: Dépendances entre tâches
- `state.conflicts`: Conflits détectés
- `state.status`: Statut global (idle, running, paused, error)

### 2. AGENT_TASKS_QUEUE.json

**Utilisation:** File d'attente globale des tâches.

**Structure:**
- `queue`: Liste des tâches en attente
- `metadata.totalTasks`: Nombre total de tâches
- `metadata.pendingTasks`: Tâches en attente
- `metadata.inProgressTasks`: Tâches en cours
- `metadata.completedTasks`: Tâches complétées
- `metadata.failedTasks`: Tâches échouées
- `metadata.priority`: Répartition par priorité

## ⚠️ Règles de Communication

### TOUJOURS:

- ✅ Utiliser format de message structuré
- ✅ Générer ID unique pour chaque message
- ✅ Ajouter timestamp ISO 8601
- ✅ Définir priorité appropriée
- ✅ Utiliser correlationId pour messages liés
- ✅ Écrire dans fichiers JSON appropriés
- ✅ Filtrer messages selon rôle destinataire
- ✅ Trier par priorité et timestamp
- ✅ Gérer conflits automatiquement

### NE JAMAIS:

- ❌ Envoyer message sans structure complète
- ❌ Ignorer priorité des messages
- ❌ Ne pas utiliser correlationId pour messages liés
- ❌ Écrire dans fichiers incorrects
- ❌ Ignorer conflits détectés
- ❌ Ne pas notifier destinataires

## 🚀 Fonctionnalités Avancées (Phase 4.1)

### 1. Types de Messages Avancés

**IMPÉRATIF:** Utiliser des types de messages avancés pour une communication plus riche.

**Types Avancés:**
- `request` - Demande d'action ou d'information
- `response` - Réponse à une demande
- `notification` - Notification d'événement
- `query` - Requête d'information
- `command` - Commande d'exécution
- `event` - Événement système

**Pattern:**
```typescript
// Types de messages avancés
interface RequestMessage extends AgentMessage {
  type: 'request';
  payload: {
    requestId: string;
    action: string;
    parameters?: Record<string, any>;
    expectedResponse?: string;
    timeout?: number;
  };
}

interface ResponseMessage extends AgentMessage {
  type: 'response';
  payload: {
    requestId: string;
    success: boolean;
    data?: any;
    error?: Error;
  };
}

interface NotificationMessage extends AgentMessage {
  type: 'notification';
  payload: {
    event: string;
    data?: any;
    severity?: 'info' | 'warning' | 'error';
  };
}
```

### 2. Corrélation de Messages

**IMPÉRATIF:** Utiliser la corrélation pour lier les messages entre eux.

**TOUJOURS:**
- ✅ Utiliser correlationId pour messages liés
- ✅ Créer chaîne de corrélation pour workflows
- ✅ Suivre corrélation dans historique
- ✅ Résoudre corrélation pour debugging

**Pattern:**
```typescript
// Corrélation de messages
async function correlateMessages(
  message: AgentMessage,
  context: Context
): Promise<CorrelatedMessages> {
  // 1. Charger messages corrélés
  const correlated = await loadCorrelatedMessages(
    message.correlationId,
    context
  );
  
  // 2. Construire chaîne de corrélation
  const correlationChain = buildCorrelationChain(
    message,
    correlated,
    context
  );
  
  // 3. Analyser corrélation
  const analysis = analyzeCorrelation(correlationChain, context);
  
  return {
    message,
    correlated,
    chain: correlationChain,
    analysis
  };
}

// Construire chaîne de corrélation
function buildCorrelationChain(
  message: AgentMessage,
  correlated: AgentMessage[],
  context: Context
): CorrelationChain {
  const chain: CorrelationChain = {
    root: message,
    messages: [message, ...correlated],
    relationships: []
  };
  
  // Identifier relations
  for (const msg of chain.messages) {
    if (msg.correlationId === message.correlationId) {
      chain.relationships.push({
        from: message.id,
        to: msg.id,
        type: 'correlated'
      });
    }
  }
  
  return chain;
}
```

### 3. Priorisation Avancée

**IMPÉRATIF:** Utiliser une priorisation avancée pour optimiser le traitement des messages.

**Niveaux de Priorité:**
- `critical` - Critique (traitement immédiat)
- `high` - Haute (traitement prioritaire)
- `medium` - Moyenne (traitement normal)
- `low` - Basse (traitement différé)

**Calcul de Priorité:**
```typescript
// Calculer priorité avancée
function calculateAdvancedPriority(
  message: AgentMessage,
  context: Context
): Priority {
  let score = 0;
  
  // 1. Priorité de base
  const basePriority: Record<string, number> = {
    'critical': 100,
    'high': 50,
    'medium': 25,
    'low': 10
  };
  score += basePriority[message.priority] || 25;
  
  // 2. Type de message
  const typePriority: Record<string, number> = {
    'error': 50,
    'coordination': 30,
    'task': 20,
    'status': 10
  };
  score += typePriority[message.type] || 10;
  
  // 3. Urgence (déjà en retard)
  if (message.payload?.deadline) {
    const deadline = new Date(message.payload.deadline);
    const now = new Date();
    if (deadline < now) {
      score += 50; // Urgent
    } else {
      const timeUntilDeadline = deadline.getTime() - now.getTime();
      if (timeUntilDeadline < 60 * 60 * 1000) { // < 1 heure
        score += 25; // Proche deadline
      }
    }
  }
  
  // 4. Dépendances critiques
  if (message.payload?.dependencies?.length > 0) {
    const criticalDependencies = await countCriticalDependencies(
      message.payload.dependencies,
      context
    );
    score += criticalDependencies * 10;
  }
  
  // Déterminer niveau final
  if (score >= 150) return 'critical';
  if (score >= 100) return 'high';
  if (score >= 50) return 'medium';
  return 'low';
}
```

### 4. Gestion des Timeouts

**IMPÉRATIF:** Gérer les timeouts pour éviter les blocages.

**TOUJOURS:**
- ✅ Définir timeout pour chaque message
- ✅ Surveiller timeouts
- ✅ Gérer expiration de timeout
- ✅ Notifier timeout aux rôles concernés

**Pattern:**
```typescript
// Gérer timeouts
class TimeoutManager {
  private timeouts: Map<string, Timeout> = new Map();
  
  async setTimeout(
    messageId: string,
    timeout: number,
    onTimeout: () => Promise<void>
  ): Promise<void> {
    const timeoutId = setTimeout(async () => {
      // 1. Vérifier si message toujours en attente
      const message = await loadMessage(messageId);
      if (message && message.status === 'pending') {
        // 2. Marquer comme timeout
        await markMessageAsTimeout(messageId);
        
        // 3. Exécuter callback timeout
        await onTimeout();
        
        // 4. Notifier rôles concernés
        await notifyTimeout(message, context);
      }
      
      // 5. Retirer timeout
      this.timeouts.delete(messageId);
    }, timeout);
    
    this.timeouts.set(messageId, {
      id: timeoutId,
      messageId,
      timeout,
      expiresAt: Date.now() + timeout
    });
  }
  
  async clearTimeout(messageId: string): Promise<void> {
    const timeout = this.timeouts.get(messageId);
    if (timeout) {
      clearTimeout(timeout.id);
      this.timeouts.delete(messageId);
    }
  }
  
  async checkTimeouts(): Promise<TimeoutCheckResult> {
    const now = Date.now();
    const expired: string[] = [];
    
    for (const [messageId, timeout] of this.timeouts.entries()) {
      if (timeout.expiresAt <= now) {
        expired.push(messageId);
      }
    }
    
    return {
      total: this.timeouts.size,
      expired,
      remaining: this.timeouts.size - expired.length
    };
  }
}
```

**Configuration Timeouts:**
```typescript
// Configuration timeouts par type
const TIMEOUT_CONFIG: Record<MessageType, number> = {
  'task': 30 * 60 * 1000,        // 30 minutes
  'result': 10 * 60 * 1000,      // 10 minutes
  'coordination': 5 * 60 * 1000,  // 5 minutes
  'error': 2 * 60 * 1000,        // 2 minutes
  'status': 1 * 60 * 1000,       // 1 minute
  'request': 15 * 60 * 1000,     // 15 minutes
  'response': 5 * 60 * 1000,     // 5 minutes
  'notification': 30 * 1000,     // 30 secondes
  'query': 10 * 60 * 1000,       // 10 minutes
  'command': 20 * 60 * 1000,     // 20 minutes
  'event': 1 * 60 * 1000         // 1 minute
};
```

## 🔗 Références

### Règles Intégrées

- `@.cursor/rules/multi-agent-coordination.md` - Coordination multi-agents
- `@.cursor/rules/sub-agents-roles.md` - Rôles des sub-agents
- `@.cursor/rules/sub-agents-orchestration.md` - Orchestration principale

### Fichiers de Communication

- `@docs/AGENT_COORDINATION_STATE.json` - État coordination
- `@docs/AGENT_TASKS_QUEUE.json` - File d'attente tâches
- `@docs/AGENT_EVENTS.json` - Événements (Phase 4.2)

---

**Note:** Ce fichier définit le protocole de communication inter-agents avec format de messages structurés, incluant les fonctionnalités avancées (types avancés, corrélation, priorisation, timeouts).

## 🚀 Communication Profonde Inter-Agents (NOUVEAU v3.0)

### 1. Communication Asynchrone avec Queue Messages

**IMPÉRATIF:** Implémenter communication asynchrone avec queue messages pour éviter blocages.

**TOUJOURS:**
- ✅ Utiliser queue messages pour communication asynchrone
- ✅ Gérer priorités dans queue
- ✅ Traiter messages dans ordre priorité
- ✅ Gérer timeouts et retry automatiques

**Pattern:**
```typescript
// Communication asynchrone avec queue
interface AsyncMessageQueue {
  queue: MessageQueue;
  priorityQueue: PriorityQueue;
  processing: Map<string, MessageProcessing>;
}

class AsyncCommunicationEngine {
  private messageQueue: MessageQueue = new MessageQueue();
  private priorityQueue: PriorityQueue = new PriorityQueue();
  
  async sendAsyncMessage(
    message: AgentMessage,
    context: Context
  ): Promise<void> {
    // 1. Ajouter à queue selon priorité
    if (message.priority === 'critical' || message.priority === 'high') {
      await this.priorityQueue.enqueue(message, context);
    } else {
      await this.messageQueue.enqueue(message, context);
    }
    
    // 2. Notifier destinataires (non-bloquant)
    await this.notifyRecipientsAsync(message, context);
  }
  
  async processMessageQueue(
    role: Role,
    context: Context
  ): Promise<void> {
    // 1. Traiter messages prioritaires d'abord
    while (await this.priorityQueue.hasMessages(role, context)) {
      const message = await this.priorityQueue.dequeue(role, context);
      await this.processMessage(message, context);
    }
    
    // 2. Traiter messages normaux
    while (await this.messageQueue.hasMessages(role, context)) {
      const message = await this.messageQueue.dequeue(role, context);
      await this.processMessage(message, context);
    }
  }
}
```

### 2. Partage Contexte Riche

**IMPÉRATIF:** Partager contexte riche entre agents (pas juste résultats).

**TOUJOURS:**
- ✅ Partager contexte complet (fichiers, état, historique)
- ✅ Partager insights et raisonnements
- ✅ Partager métriques et métadonnées
- ✅ Maintenir cohérence contexte partagé

**Pattern:**
```typescript
// Partage contexte riche
interface RichContext {
  files: FileContext[];
  state: AgentState;
  history: ExecutionHistory[];
  insights: Insight[];
  metrics: Metrics;
  metadata: RichMetadata;
}

interface DeepCommunication extends AgentMessage {
  messageType: 'context' | 'insight' | 'question' | 'result';
  payload: RichPayload; // Objets structurés, pas juste string
  sharedMemory: SharedMemoryRef;
  context: RichContext;
}

class RichContextSharing {
  async shareRichContext(
    sender: Role,
    receiver: Role,
    context: RichContext,
    context: Context
  ): Promise<void> {
    // 1. Construire contexte riche
    const richContext = await this.buildRichContext(context, context);
    
    // 2. Créer message avec contexte riche
    const message: DeepCommunication = {
      id: generateMessageId(),
      type: 'coordination',
      from: sender,
      to: receiver,
      timestamp: new Date().toISOString(),
      priority: 'high',
      messageType: 'context',
      payload: {
        context: richContext,
        files: context.files,
        state: context.state,
        history: context.history,
        insights: context.insights
      },
      sharedMemory: await this.getSharedMemoryRef(context),
      context: richContext
    };
    
    // 3. Envoyer message
    await this.sendMessage(message, context);
  }
  
  private async buildRichContext(
    context: Context,
    fullContext: Context
  ): Promise<RichContext> {
    return {
      files: await this.getRelevantFiles(context, fullContext),
      state: await this.getCurrentState(context),
      history: await this.getExecutionHistory(context),
      insights: await this.extractInsights(context, fullContext),
      metrics: await this.collectMetrics(context),
      metadata: await this.buildMetadata(context, fullContext)
    };
  }
}
```

### 3. Négociation Inter-Agents

**IMPÉRATIF:** Implémenter négociation inter-agents pour résolution conflits.

**TOUJOURS:**
- ✅ Détecter conflits entre agents
- ✅ Négocier résolution conflits
- ✅ Trouver compromis acceptables
- ✅ Documenter négociations

**Pattern:**
```typescript
// Négociation inter-agents
interface Negotiation {
  conflictId: string;
  participants: Role[];
  proposals: Proposal[];
  currentProposal: Proposal;
  status: 'negotiating' | 'agreed' | 'failed';
}

class InterAgentNegotiation {
  async negotiateConflict(
    conflict: Conflict,
    participants: Role[],
    context: Context
  ): Promise<NegotiationResult> {
    // 1. Créer négociation
    const negotiation: Negotiation = {
      conflictId: conflict.id,
      participants,
      proposals: [],
      currentProposal: null,
      status: 'negotiating'
    };
    
    // 2. Collecter propositions de chaque participant
    for (const participant of participants) {
      const proposal = await this.collectProposal(
        participant,
        conflict,
        context
      );
      negotiation.proposals.push(proposal);
    }
    
    // 3. Négocier compromis
    const compromise = await this.findCompromise(
      negotiation.proposals,
      conflict,
      context
    );
    
    // 4. Valider compromis avec participants
    const agreement = await this.validateCompromise(
      compromise,
      participants,
      context
    );
    
    if (agreement) {
      negotiation.status = 'agreed';
      negotiation.currentProposal = compromise;
    } else {
      negotiation.status = 'failed';
    }
    
    return {
      negotiation,
      result: agreement ? 'agreed' : 'failed',
      compromise: agreement ? compromise : null
    };
  }
}
```

### 4. Mémoire Partagée

**IMPÉRATIF:** Implémenter mémoire partagée accessible à tous agents.

**TOUJOURS:**
- ✅ Créer mémoire partagée accessible
- ✅ Synchroniser accès mémoire partagée
- ✅ Gérer versions mémoire partagée
- ✅ Valider cohérence mémoire partagée

**Pattern:**
```typescript
// Mémoire partagée
interface SharedMemory {
  id: string;
  data: Map<string, any>;
  version: number;
  lastUpdated: number;
  accessControl: AccessControl;
}

class SharedMemoryManager {
  private sharedMemory: Map<string, SharedMemory> = new Map();
  
  async createSharedMemory(
    name: string,
    initialData: any,
    context: Context
  ): Promise<SharedMemory> {
    const memory: SharedMemory = {
      id: generateMemoryId(),
      data: new Map(Object.entries(initialData)),
      version: 1,
      lastUpdated: Date.now(),
      accessControl: {
        read: ['all'],
        write: ['all']
      }
    };
    
    this.sharedMemory.set(name, memory);
    await this.saveSharedMemory(memory, context);
    
    return memory;
  }
  
  async readSharedMemory(
    name: string,
    key: string,
    role: Role,
    context: Context
  ): Promise<any> {
    const memory = this.sharedMemory.get(name);
    if (!memory) {
      throw new Error(`Shared memory ${name} not found`);
    }
    
    // Vérifier accès
    if (!this.hasReadAccess(memory, role)) {
      throw new Error(`Role ${role} does not have read access`);
    }
    
    return memory.data.get(key);
  }
  
  async writeSharedMemory(
    name: string,
    key: string,
    value: any,
    role: Role,
    context: Context
  ): Promise<void> {
    const memory = this.sharedMemory.get(name);
    if (!memory) {
      throw new Error(`Shared memory ${name} not found`);
    }
    
    // Vérifier accès
    if (!this.hasWriteAccess(memory, role)) {
      throw new Error(`Role ${role} does not have write access`);
    }
    
    // Écrire avec versioning
    memory.data.set(key, value);
    memory.version++;
    memory.lastUpdated = Date.now();
    
    await this.saveSharedMemory(memory, context);
  }
}
```

### 5. Synchronisation État Temps Réel

**IMPÉRATIF:** Synchroniser état entre agents en temps réel.

**TOUJOURS:**
- ✅ Synchroniser état entre agents
- ✅ Détecter changements état
- ✅ Notifier changements état
- ✅ Maintenir cohérence état

**Pattern:**
```typescript
// Synchronisation état temps réel
class RealTimeStateSync {
  private stateSubscriptions: Map<Role, Set<string>> = new Map();
  
  async subscribeToState(
    role: Role,
    stateKeys: string[],
    context: Context
  ): Promise<void> {
    if (!this.stateSubscriptions.has(role)) {
      this.stateSubscriptions.set(role, new Set());
    }
    
    const subscriptions = this.stateSubscriptions.get(role)!;
    for (const key of stateKeys) {
      subscriptions.add(key);
    }
  }
  
  async notifyStateChange(
    stateKey: string,
    newValue: any,
    context: Context
  ): Promise<void> {
    // Notifier tous les rôles abonnés
    for (const [role, subscriptions] of this.stateSubscriptions.entries()) {
      if (subscriptions.has(stateKey)) {
        await this.notifyRole(role, {
          type: 'state-change',
          key: stateKey,
          value: newValue,
          timestamp: Date.now()
        }, context);
      }
    }
  }
}
```

**Version:** 3.0.0  
**Dernière mise à jour:** 2025-01-29

