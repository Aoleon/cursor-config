<!-- 
Context: request-timeout, user-aborted, tool-call-timeout, long-operations, optimization
Priority: P0 (CRITICAL)
Auto-load: always (preventive), when long operations detected, when timeouts occur
Dependencies: core.md, quality-principles.md, tool-call-limit-workaround.md, timeout-management.md, persistent-execution.md
Description: "Prévention des abandons de requêtes (User aborted request) avec optimisation proactive des tool calls et décomposition automatique"
Tags: request-timeout, user-aborted, tool-call-optimization, timeout-prevention, long-operations
Score: 100
-->

# Prévention des Abandons de Requêtes - Saxium

**Objectif:** Éviter complètement les erreurs "User aborted request" en optimisant proactivement les tool calls, en décomposant automatiquement les opérations longues, et en implémentant des mécanismes de prévention.

**Référence:** [Cursor Rules Documentation](https://docs.cursor.com/context/rules)  
**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

## 🎯 Principe Fondamental

**IMPÉRATIF:** L'agent DOIT prévenir proactivement les abandons de requêtes en optimisant les tool calls, en décomposant les opérations longues, et en implémentant des mécanismes de prévention automatique.

**Problème identifié:** 
```
ERROR_USER_ABORTED_REQUEST
"User aborted request. Tool call ended before result was received"
```

**Causes principales:**
1. **Tool calls trop longs** (> 30-60 secondes)
2. **Opérations bloquantes** sans timeout
3. **Requêtes multiples séquentielles** au lieu de parallèles
4. **Recherches trop larges** sans limites
5. **Fichiers volumineux** lus en entier
6. **Opérations réseau** sans timeout
7. **Boucles infinies** ou très longues

**Solution:** Détection proactive, optimisation automatique, décomposition intelligente, et prévention systématique.

**Bénéfices:**
- ✅ Élimination complète des abandons de requêtes
- ✅ Optimisation automatique des tool calls
- ✅ Décomposition intelligente des opérations longues
- ✅ Timeouts configurables pour toutes les opérations
- ✅ Parallélisation automatique des opérations indépendantes
- ✅ Limites automatiques pour recherches et lectures

**Référence:** `@.cursor/rules/tool-call-limit-workaround.md` - Contournement limite 1000 tool calls  
**Référence:** `@.cursor/rules/timeout-management.md` - Gestion des timeouts  
**Référence:** `@.cursor/rules/persistent-execution.md` - Exécution persistante

## 📋 Règles de Prévention

### 1. Détection Proactive des Tool Calls Longs

**IMPÉRATIF:** L'agent DOIT détecter proactivement les tool calls qui risquent de timeout avant de les exécuter.

**TOUJOURS:**
- ✅ Estimer durée de chaque tool call avant exécution
- ✅ Détecter tool calls qui risquent de timeout (> 20 secondes estimé)
- ✅ Décomposer automatiquement si timeout probable
- ✅ Optimiser avant exécution si nécessaire
- ✅ Alerter si opération longue détectée

**Pattern:**
```typescript
// Détection proactive des tool calls longs
interface ToolCallEstimate {
  toolName: string;
  estimatedDuration: number; // ms
  timeoutRisk: 'low' | 'medium' | 'high' | 'critical';
  recommendedAction: 'execute' | 'optimize' | 'decompose' | 'skip';
  maxTimeout: number; // ms (30s par défaut)
}

class ToolCallTimeoutPrevention {
  private readonly MAX_TOOL_CALL_DURATION = 30000; // 30 secondes
  private readonly WARNING_THRESHOLD = 20000; // 20 secondes
  private readonly CRITICAL_THRESHOLD = 25000; // 25 secondes
  
  async estimateToolCallDuration(
    toolName: string,
    params: unknown,
    context: Context
  ): Promise<ToolCallEstimate> {
    // 1. Estimer durée selon type de tool call
    let estimatedDuration = 0;
    let timeoutRisk: 'low' | 'medium' | 'high' | 'critical' = 'low';
    let recommendedAction: 'execute' | 'optimize' | 'decompose' | 'skip' = 'execute';
    
    switch (toolName) {
      case 'read_file':
        // Lecture fichier: ~100ms par KB
        const fileSize = await estimateFileSize(params.path, context);
        estimatedDuration = fileSize * 100; // ms
        if (estimatedDuration > this.CRITICAL_THRESHOLD) {
          timeoutRisk = 'critical';
          recommendedAction = 'decompose'; // Lire par sections
        } else if (estimatedDuration > this.WARNING_THRESHOLD) {
          timeoutRisk = 'high';
          recommendedAction = 'optimize'; // Lire avec offset/limit
        }
        break;
        
      case 'codebase_search':
        // Recherche: ~500ms-5s selon complexité
        const searchComplexity = await estimateSearchComplexity(params.query, context);
        estimatedDuration = searchComplexity * 1000; // ms
        if (estimatedDuration > this.CRITICAL_THRESHOLD) {
          timeoutRisk = 'critical';
          recommendedAction = 'optimize'; // Limiter scope, utiliser cache
        } else if (estimatedDuration > this.WARNING_THRESHOLD) {
          timeoutRisk = 'high';
          recommendedAction = 'optimize'; // Optimiser requête
        }
        break;
        
      case 'grep':
        // Grep: ~200ms-3s selon taille
        const grepComplexity = await estimateGrepComplexity(params.pattern, context);
        estimatedDuration = grepComplexity * 500; // ms
        if (estimatedDuration > this.CRITICAL_THRESHOLD) {
          timeoutRisk = 'critical';
          recommendedAction = 'optimize'; // Limiter fichiers, utiliser cache
        }
        break;
        
      case 'run_terminal_cmd':
        // Commande terminal: variable, peut être très long
        const cmdComplexity = await estimateCommandComplexity(params.command, context);
        estimatedDuration = cmdComplexity * 2000; // ms
        if (estimatedDuration > this.CRITICAL_THRESHOLD) {
          timeoutRisk = 'critical';
          recommendedAction = 'decompose'; // Diviser en sous-commandes
        } else if (estimatedDuration > this.WARNING_THRESHOLD) {
          timeoutRisk = 'high';
          recommendedAction = 'optimize'; // Ajouter timeout, optimiser commande
        }
        break;
        
      default:
        // Par défaut: ~500ms
        estimatedDuration = 500;
        timeoutRisk = 'low';
    }
    
    return {
      toolName,
      estimatedDuration,
      timeoutRisk,
      recommendedAction,
      maxTimeout: this.MAX_TOOL_CALL_DURATION
    };
  }
  
  async preventTimeout(
    toolName: string,
    params: unknown,
    context: Context
  ): Promise<OptimizedToolCall> {
    // 1. Estimer durée
    const estimate = await this.estimateToolCallDuration(toolName, params, context);
    
    // 2. Si risque critique, décomposer
    if (estimate.timeoutRisk === 'critical' || estimate.recommendedAction === 'decompose') {
      return await this.decomposeToolCall(toolName, params, context);
    }
    
    // 3. Si risque élevé, optimiser
    if (estimate.timeoutRisk === 'high' || estimate.recommendedAction === 'optimize') {
      return await this.optimizeToolCall(toolName, params, context);
    }
    
    // 4. Sinon, exécuter normalement avec timeout
    return {
      toolName,
      params: this.addTimeoutToParams(params, estimate.maxTimeout),
      optimized: false,
      timeout: estimate.maxTimeout
    };
  }
}
```

### 2. Optimisation Automatique des Tool Calls

**IMPÉRATIF:** L'agent DOIT optimiser automatiquement les tool calls pour éviter les timeouts.

**TOUJOURS:**
- ✅ Limiter scope des recherches (directories, file types)
- ✅ Utiliser offset/limit pour lectures de fichiers
- ✅ Utiliser cache pour recherches redondantes
- ✅ Paralléliser opérations indépendantes
- ✅ Ajouter timeouts explicites à toutes les opérations
- ✅ Éviter lectures de fichiers volumineux en entier
- ✅ Optimiser requêtes de recherche

**Pattern:**
```typescript
// Optimisation automatique des tool calls
async function optimizeToolCall(
  toolName: string,
  params: unknown,
  context: Context
): Promise<OptimizedToolCall> {
  switch (toolName) {
    case 'read_file':
      // Optimiser lecture fichier
      return await optimizeReadFile(params, context);
      
    case 'codebase_search':
      // Optimiser recherche
      return await optimizeCodebaseSearch(params, context);
      
    case 'grep':
      // Optimiser grep
      return await optimizeGrep(params, context);
      
    case 'run_terminal_cmd':
      // Optimiser commande terminal
      return await optimizeTerminalCommand(params, context);
      
    default:
      // Ajouter timeout par défaut
      return {
        toolName,
        params: addTimeoutToParams(params, 30000),
        optimized: true,
        timeout: 30000
      };
  }
}

async function optimizeReadFile(
  params: { target_file: string },
  context: Context
): Promise<OptimizedToolCall> {
  const fileSize = await estimateFileSize(params.target_file, context);
  
  // Si fichier > 100KB, lire par sections
  if (fileSize > 100 * 1024) {
    return {
      toolName: 'read_file',
      params: {
        ...params,
        offset: 0,
        limit: 50 * 1024, // Lire 50KB à la fois
        optimized: true
      },
      optimized: true,
      timeout: 10000, // 10s max
      strategy: 'chunked'
    };
  }
  
  // Sinon, lire normalement avec timeout
  return {
    toolName: 'read_file',
    params: {
      ...params,
      timeout: 5000 // 5s max
    },
    optimized: true,
    timeout: 5000
  };
}

async function optimizeCodebaseSearch(
  params: { query: string; target_directories?: string[] },
  context: Context
): Promise<OptimizedToolCall> {
  // 1. Limiter scope si non spécifié
  if (!params.target_directories || params.target_directories.length === 0) {
    // Limiter aux répertoires pertinents
    params.target_directories = await identifyRelevantDirectories(params.query, context);
  }
  
  // 2. Vérifier cache
  const cacheKey = generateCacheKey('codebase_search', params);
  const cached = await getFromCache(cacheKey, context);
  if (cached) {
    return {
      toolName: 'codebase_search',
      params: params,
      optimized: true,
      timeout: 1000, // Cache: très rapide
      fromCache: true,
      cachedResult: cached
    };
  }
  
  // 3. Optimiser requête
  const optimizedQuery = await optimizeSearchQuery(params.query, context);
  
  return {
    toolName: 'codebase_search',
    params: {
      ...params,
      query: optimizedQuery,
      maxResults: 20, // Limiter résultats
      timeout: 15000 // 15s max
    },
    optimized: true,
    timeout: 15000
  };
}

async function optimizeGrep(
  params: { pattern: string; path?: string; glob?: string },
  context: Context
): Promise<OptimizedToolCall> {
  // 1. Limiter fichiers si non spécifié
  if (!params.path && !params.glob) {
    params.glob = await identifyRelevantFilesForGrep(params.pattern, context);
  }
  
  // 2. Vérifier cache
  const cacheKey = generateCacheKey('grep', params);
  const cached = await getFromCache(cacheKey, context);
  if (cached) {
    return {
      toolName: 'grep',
      params: params,
      optimized: true,
      timeout: 1000,
      fromCache: true,
      cachedResult: cached
    };
  }
  
  // 3. Limiter résultats
  return {
    toolName: 'grep',
    params: {
      ...params,
      head_limit: 100, // Limiter à 100 résultats
      timeout: 10000 // 10s max
    },
    optimized: true,
    timeout: 10000
  };
}

async function optimizeTerminalCommand(
  params: { command: string },
  context: Context
): Promise<OptimizedToolCall> {
  // 1. Ajouter timeout à commande
  const commandWithTimeout = addTimeoutToCommand(params.command, 30000);
  
  // 2. Détecter commandes longues
  const isLongCommand = await detectLongCommand(params.command, context);
  if (isLongCommand) {
    // Décomposer en sous-commandes
    return await decomposeCommand(params.command, context);
  }
  
  return {
    toolName: 'run_terminal_cmd',
    params: {
      ...params,
      command: commandWithTimeout,
      timeout: 30000 // 30s max
    },
    optimized: true,
    timeout: 30000
  };
}
```

### 3. Décomposition Automatique des Opérations Longues

**IMPÉRATIF:** L'agent DOIT décomposer automatiquement les opérations longues en sous-opérations plus courtes.

**TOUJOURS:**
- ✅ Détecter opérations qui nécessitent décomposition
- ✅ Diviser en sous-opérations < 20 secondes
- ✅ Exécuter sous-opérations séquentiellement avec checkpoints
- ✅ Combiner résultats des sous-opérations
- ✅ Gérer erreurs et reprises

**Pattern:**
```typescript
// Décomposition automatique des opérations longues
async function decomposeToolCall(
  toolName: string,
  params: unknown,
  context: Context
): Promise<DecomposedToolCall> {
  switch (toolName) {
    case 'read_file':
      return await decomposeReadFile(params, context);
      
    case 'codebase_search':
      return await decomposeCodebaseSearch(params, context);
      
    case 'run_terminal_cmd':
      return await decomposeTerminalCommand(params, context);
      
    default:
      // Par défaut, essayer de décomposer
      return await genericDecompose(toolName, params, context);
  }
}

async function decomposeReadFile(
  params: { target_file: string },
  context: Context
): Promise<DecomposedToolCall> {
  const fileSize = await estimateFileSize(params.target_file, context);
  const chunkSize = 50 * 1024; // 50KB par chunk
  const chunks = Math.ceil(fileSize / chunkSize);
  
  return {
    toolName: 'read_file',
    strategy: 'chunked',
    chunks: Array.from({ length: chunks }, (_, i) => ({
      toolName: 'read_file',
      params: {
        ...params,
        offset: i * chunkSize,
        limit: chunkSize
      },
      timeout: 5000 // 5s par chunk
    })),
    combine: async (results) => {
      // Combiner résultats des chunks
      return results.map(r => r.content).join('\n');
    }
  };
}

async function decomposeCodebaseSearch(
  params: { query: string; target_directories?: string[] },
  context: Context
): Promise<DecomposedToolCall> {
  // 1. Diviser en recherches par répertoire
  const directories = params.target_directories || await getAllDirectories(context);
  const maxDirsPerSearch = 5; // 5 répertoires par recherche
  
  const chunks: ToolCall[] = [];
  for (let i = 0; i < directories.length; i += maxDirsPerSearch) {
    chunks.push({
      toolName: 'codebase_search',
      params: {
        ...params,
        target_directories: directories.slice(i, i + maxDirsPerSearch)
      },
      timeout: 10000 // 10s par chunk
    });
  }
  
  return {
    toolName: 'codebase_search',
    strategy: 'directory-based',
    chunks,
    combine: async (results) => {
      // Combiner résultats des recherches
      const combined = new Map();
      for (const result of results) {
        for (const item of result.items || []) {
          if (!combined.has(item.path)) {
            combined.set(item.path, item);
          }
        }
      }
      return Array.from(combined.values());
    }
  };
}
```

### 4. Timeouts Explicites pour Toutes les Opérations

**IMPÉRATIF:** L'agent DOIT ajouter des timeouts explicites à toutes les opérations.

**TOUJOURS:**
- ✅ Définir timeout maximum pour chaque type de tool call
- ✅ Ajouter timeout à tous les paramètres
- ✅ Gérer timeouts gracieusement
- ✅ Retry avec backoff si timeout
- ✅ Logger timeouts pour analyse

**Pattern:**
```typescript
// Timeouts explicites pour toutes les opérations
const TOOL_CALL_TIMEOUTS = {
  read_file: 10000, // 10s
  codebase_search: 15000, // 15s
  grep: 10000, // 10s
  run_terminal_cmd: 30000, // 30s
  write: 5000, // 5s
  search_replace: 5000, // 5s
  list_dir: 3000, // 3s
  glob_file_search: 5000, // 5s
  default: 10000 // 10s par défaut
};

function addTimeoutToParams(
  params: unknown,
  timeout: number
): unknown {
  return {
    ...params,
    timeout,
    maxDuration: timeout
  };
}

async function executeWithTimeout<T>(
  toolCall: ToolCall,
  timeout: number
): Promise<T> {
  return Promise.race([
    executeToolCall(toolCall),
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error(`Tool call timeout after ${timeout}ms`)), timeout)
    )
  ]);
}
```

### 5. Parallélisation Automatique des Opérations Indépendantes

**IMPÉRATIF:** L'agent DOIT paralléliser automatiquement les opérations indépendantes pour réduire le temps total.

**TOUJOURS:**
- ✅ Détecter opérations indépendantes
- ✅ Exécuter en parallèle au lieu de séquentiellement
- ✅ Limiter parallélisme pour éviter surcharge
- ✅ Gérer erreurs en parallèle
- ✅ Combiner résultats

**Pattern:**
```typescript
// Parallélisation automatique
async function parallelizeIndependentOperations(
  operations: ToolCall[],
  context: Context
): Promise<ToolCallResult[]> {
  // 1. Détecter opérations indépendantes
  const independent = await detectIndependentOperations(operations, context);
  
  // 2. Grouper par dépendances
  const groups = await groupByDependencies(independent, context);
  
  // 3. Exécuter groupes en parallèle
  const results: ToolCallResult[] = [];
  for (const group of groups) {
    // Exécuter opérations du groupe en parallèle (max 5 simultanées)
    const groupResults = await Promise.all(
      group.slice(0, 5).map(op => executeWithTimeout(op, TOOL_CALL_TIMEOUTS[op.toolName] || TOOL_CALL_TIMEOUTS.default))
    );
    results.push(...groupResults);
  }
  
  return results;
}
```

## 🔄 Workflow de Prévention

### Workflow: Prévenir Abandons de Requêtes

**Étapes:**
1. **Estimation Proactive** : Estimer durée de chaque tool call
2. **Détection Risque** : Détecter tool calls à risque de timeout
3. **Optimisation Automatique** : Optimiser tool calls si nécessaire
4. **Décomposition** : Décomposer si risque critique
5. **Exécution avec Timeout** : Exécuter avec timeout explicite
6. **Gestion Erreurs** : Gérer timeouts gracieusement avec retry

**Pattern:**
```typescript
async function preventRequestAbort(
  toolCall: ToolCall,
  context: Context
): Promise<ToolCallResult> {
  const prevention = new ToolCallTimeoutPrevention();
  
  // 1. Estimer durée
  const estimate = await prevention.estimateToolCallDuration(
    toolCall.toolName,
    toolCall.params,
    context
  );
  
  // 2. Prévenir timeout
  const optimized = await prevention.preventTimeout(
    toolCall.toolName,
    toolCall.params,
    context
  );
  
  // 3. Si décomposé, exécuter chunks
  if (optimized.strategy === 'chunked' || optimized.chunks) {
    return await executeDecomposed(optimized, context);
  }
  
  // 4. Sinon, exécuter avec timeout
  try {
    return await executeWithTimeout(optimized, optimized.timeout);
  } catch (error) {
    if (isTimeoutError(error)) {
      // Retry avec décomposition si timeout
      const decomposed = await decomposeToolCall(
        toolCall.toolName,
        toolCall.params,
        context
      );
      return await executeDecomposed(decomposed, context);
    }
    throw error;
  }
}
```

## ⚠️ Règles de Prévention

### Ne Jamais:

**BLOQUANT:**
- ❌ Exécuter tool calls sans estimation de durée
- ❌ Ignorer tool calls à risque de timeout
- ❌ Lire fichiers volumineux en entier sans décomposition
- ❌ Exécuter recherches sans limites
- ❌ Exécuter commandes terminal sans timeout
- ❌ Exécuter opérations séquentiellement si parallélisables
- ❌ Ignorer timeouts

**TOUJOURS:**
- ✅ Estimer durée de chaque tool call
- ✅ Détecter tool calls à risque de timeout
- ✅ Optimiser automatiquement si nécessaire
- ✅ Décomposer si risque critique
- ✅ Ajouter timeouts explicites
- ✅ Paralléliser opérations indépendantes
- ✅ Utiliser cache pour recherches redondantes
- ✅ Limiter scope des recherches
- ✅ Gérer timeouts gracieusement

## 📊 Checklist Prévention

### Avant Chaque Tool Call

- [ ] Estimer durée du tool call
- [ ] Détecter risque de timeout
- [ ] Optimiser si nécessaire
- [ ] Décomposer si risque critique
- [ ] Ajouter timeout explicite
- [ ] Vérifier cache si applicable

### Optimisations Automatiques

- [ ] Limiter scope des recherches
- [ ] Utiliser offset/limit pour fichiers
- [ ] Utiliser cache pour recherches
- [ ] Paralléliser opérations indépendantes
- [ ] Ajouter timeouts à toutes les opérations
- [ ] Éviter lectures de fichiers volumineux

### Gestion Timeouts

- [ ] Détecter timeouts gracieusement
- [ ] Retry avec décomposition si timeout
- [ ] Logger timeouts pour analyse
- [ ] Ajuster timeouts selon historique

## 🔗 Références

- `@.cursor/rules/tool-call-limit-workaround.md` - Contournement limite 1000 tool calls
- `@.cursor/rules/timeout-management.md` - Gestion des timeouts
- `@.cursor/rules/persistent-execution.md` - Exécution persistante
- `@.cursor/rules/parallel-execution.md` - Exécution parallèle
- `@.cursor/rules/search-cache.md` - Cache intelligent des recherches

---

**Note:** Cette règle garantit que l'agent prévient proactivement les abandons de requêtes en optimisant automatiquement les tool calls et en décomposant les opérations longues.

**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

