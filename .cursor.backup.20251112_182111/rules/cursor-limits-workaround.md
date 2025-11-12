<!-- 
Context: cursor-limits, workaround, optimization, context-length, mcp-tools, file-size, multi-file-editing, monthly-quotas
Priority: P1
Auto-load: when approaching any Cursor limit, when optimizing performance, when large files detected
Dependencies: core.md, quality-principles.md, tool-call-limit-workaround.md, context-optimization.md, context-compression.md, cost-optimization.md
Description: "Système unifié de contournement de toutes les limites de Cursor avec optimisation globale"
Tags: cursor-limits, workaround, optimization, context-length, mcp-tools, file-size, multi-file-editing, monthly-quotas
Score: 95
-->

# Contournement Système Unifié des Limites Cursor - Saxium

**Objectif:** Système unifié de détection, surveillance et contournement de toutes les limites de Cursor avec optimisation globale.

**Référence:** [Cursor Rules Documentation](https://docs.cursor.com/context/rules)  
**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

## 🎯 Principe Fondamental

**IMPÉRATIF:** L'agent DOIT surveiller et contourner automatiquement toutes les limites de Cursor pour garantir une exécution optimale sans interruption.

**Limites identifiées:**
1. **1000 tool calls** - Limite d'appels d'outils par session
2. **200k tokens contexte** (1M avec Max Mode) - Limite de contexte
3. **40 outils MCP** - Limite d'outils MCP actifs
4. **Taille fichiers** - Fichiers volumineux incomplets
5. **Édition multi-fichiers** - Difficultés refactorisation multi-fichiers
6. **Requêtes mensuelles** - Limites selon plan (225 Sonnet 4, 550 Gemini, 650 GPT-4.1)
7. **Performance grands projets** - Ralentissements indexation

**Bénéfices:**
- ✅ Détection proactive de toutes les limites
- ✅ Contournement automatique optimisé
- ✅ Surveillance continue multi-limites
- ✅ Optimisation globale coordonnée
- ✅ Prévention des interruptions

**Référence:** `@.cursor/rules/tool-call-limit-workaround.md` - Contournement limite 1000 tool calls  
**Référence:** `@.cursor/rules/context-optimization.md` - Optimisation contexte  
**Référence:** `@.cursor/rules/context-compression.md` - Compression contexte  
**Référence:** `@.cursor/rules/cost-optimization.md` - Optimisation coûts

## 📋 Système de Surveillance Unifié

### 1. Surveillance Multi-Limites

**IMPÉRATIF:** L'agent DOIT surveiller toutes les limites simultanément.

**Pattern:**
```typescript
// Surveillance unifiée de toutes les limites
interface CursorLimitsMonitor {
  toolCalls: {
    current: number;
    limit: number;
    threshold: { warning: 800; critical: 900; emergency: 950 };
  };
  contextTokens: {
    current: number;
    limit: number; // 200k par défaut, 1M avec Max Mode
    threshold: { warning: 0.8; critical: 0.9; emergency: 0.95 };
    maxModeEnabled: boolean;
  };
  mcpTools: {
    current: number;
    limit: number; // 40
    threshold: { warning: 0.8; critical: 0.9; emergency: 0.95 };
  };
  fileSize: {
    maxRecommended: number; // ~50KB
    largeFiles: string[];
  };
  monthlyQuotas: {
    sonnet4: { used: number; limit: number; remaining: number };
    gemini: { used: number; limit: number; remaining: number };
    gpt41: { used: number; limit: number; remaining: number };
  };
}

class UnifiedLimitsMonitor {
  private monitor: CursorLimitsMonitor;
  
  async trackAllLimits(context: Context): Promise<LimitsStatus> {
    // 1. Surveiller tool calls
    await this.trackToolCalls(context);
    
    // 2. Surveiller contexte tokens
    await this.trackContextTokens(context);
    
    // 3. Surveiller outils MCP
    await this.trackMCPTools(context);
    
    // 4. Surveiller taille fichiers
    await this.trackFileSizes(context);
    
    // 5. Surveiller quotas mensuels
    await this.trackMonthlyQuotas(context);
    
    // 6. Détecter approche de limites
    const approachingLimits = this.detectApproachingLimits();
    
    // 7. Appliquer contournements si nécessaire
    if (approachingLimits.length > 0) {
      await this.applyWorkarounds(approachingLimits, context);
    }
    
    return {
      monitor: this.monitor,
      approachingLimits,
      status: this.calculateOverallStatus()
    };
  }
  
  private detectApproachingLimits(): ApproachingLimit[] {
    const approaching: ApproachingLimit[] = [];
    
    // Tool calls
    if (this.monitor.toolCalls.current >= this.monitor.toolCalls.threshold.warning) {
      approaching.push({
        type: 'tool-calls',
        severity: this.monitor.toolCalls.current >= this.monitor.toolCalls.threshold.emergency 
          ? 'emergency' 
          : this.monitor.toolCalls.current >= this.monitor.toolCalls.threshold.critical 
            ? 'critical' 
            : 'warning',
        current: this.monitor.toolCalls.current,
        limit: this.monitor.toolCalls.limit,
        remaining: this.monitor.toolCalls.limit - this.monitor.toolCalls.current
      });
    }
    
    // Context tokens
    const contextUsage = this.monitor.contextTokens.current / this.monitor.contextTokens.limit;
    if (contextUsage >= this.monitor.contextTokens.threshold.warning) {
      approaching.push({
        type: 'context-tokens',
        severity: contextUsage >= this.monitor.contextTokens.threshold.emergency 
          ? 'emergency' 
          : contextUsage >= this.monitor.contextTokens.threshold.critical 
            ? 'critical' 
            : 'warning',
        current: this.monitor.contextTokens.current,
        limit: this.monitor.contextTokens.limit,
        remaining: this.monitor.contextTokens.limit - this.monitor.contextTokens.current,
        usage: contextUsage
      });
    }
    
    // MCP Tools
    const mcpUsage = this.monitor.mcpTools.current / this.monitor.mcpTools.limit;
    if (mcpUsage >= this.monitor.mcpTools.threshold.warning) {
      approaching.push({
        type: 'mcp-tools',
        severity: mcpUsage >= this.monitor.mcpTools.threshold.emergency 
          ? 'emergency' 
          : mcpUsage >= this.monitor.mcpTools.threshold.critical 
            ? 'critical' 
            : 'warning',
        current: this.monitor.mcpTools.current,
        limit: this.monitor.mcpTools.limit,
        remaining: this.monitor.mcpTools.limit - this.monitor.mcpTools.current,
        usage: mcpUsage
      });
    }
    
    // File sizes
    if (this.monitor.fileSize.largeFiles.length > 0) {
      approaching.push({
        type: 'file-size',
        severity: 'warning',
        current: this.monitor.fileSize.largeFiles.length,
        limit: 0, // Pas de limite stricte, mais recommandation
        largeFiles: this.monitor.fileSize.largeFiles
      });
    }
    
    // Monthly quotas
    if (this.monitor.monthlyQuotas.sonnet4.remaining < 50) {
      approaching.push({
        type: 'monthly-quota-sonnet4',
        severity: this.monitor.monthlyQuotas.sonnet4.remaining < 10 ? 'critical' : 'warning',
        current: this.monitor.monthlyQuotas.sonnet4.used,
        limit: this.monitor.monthlyQuotas.sonnet4.limit,
        remaining: this.monitor.monthlyQuotas.sonnet4.remaining
      });
    }
    
    return approaching;
  }
}
```

## 🔧 Contournements par Type de Limite

### 1. Contournement Limite Tool Calls (1000)

**Référence:** `@.cursor/rules/tool-call-limit-workaround.md` - Détails complets

**Résumé:**
- Surveillance à 800, 900, 950 tool calls
- Checkpointing automatique
- Optimisation agressive (batching, cache, parallélisation)
- Continuation depuis checkpoint

### 2. Contournement Limite Contexte Tokens (200k/1M)

**IMPÉRATIF:** L'agent DOIT optimiser le contexte pour rester sous la limite.

**TOUJOURS:**
- ✅ Activer Max Mode si contexte > 160k tokens (80% de 200k)
- ✅ Compresser contexte si approche limite
- ✅ Éviter fichiers non pertinents
- ✅ Utiliser résumés pour fichiers longs
- ✅ Charger uniquement sections pertinentes

**Pattern:**
```typescript
// Contournement limite contexte tokens
async function workaroundContextTokens(
  context: Context,
  monitor: CursorLimitsMonitor
): Promise<ContextWorkaround> {
  const usage = monitor.contextTokens.current / monitor.contextTokens.limit;
  
  // 1. Si > 80% et Max Mode non activé, activer Max Mode
  if (usage > 0.8 && !monitor.contextTokens.maxModeEnabled) {
    await enableMaxMode(context);
    monitor.contextTokens.maxModeEnabled = true;
    monitor.contextTokens.limit = 1000000; // 1M tokens
  }
  
  // 2. Si > 90%, compresser contexte agressivement
  if (usage > 0.9) {
    await compressContextAggressively(context);
  }
  
  // 3. Si > 95%, évincer fichiers non essentiels
  if (usage > 0.95) {
    await evictNonEssentialFiles(context);
  }
  
  return {
    maxModeEnabled: monitor.contextTokens.maxModeEnabled,
    compressed: usage > 0.9,
    evicted: usage > 0.95
  };
}
```

**Référence:** `@.cursor/rules/context-compression.md` - Compression intelligente  
**Référence:** `@.cursor/rules/context-optimization.md` - Optimisation contexte

### 3. Contournement Limite Outils MCP (40)

**IMPÉRATIF:** L'agent DOIT désactiver les outils MCP non essentiels si approche de la limite.

**TOUJOURS:**
- ✅ Identifier outils MCP essentiels vs non essentiels
- ✅ Désactiver outils non essentiels si > 32 outils (80%)
- ✅ Utiliser serveurs MCP centralisés si possible
- ✅ Réactiver outils si espace disponible

**Pattern:**
```typescript
// Contournement limite outils MCP
async function workaroundMCPTools(
  context: Context,
  monitor: CursorLimitsMonitor
): Promise<MCPWorkaround> {
  const usage = monitor.mcpTools.current / monitor.mcpTools.limit;
  
  // 1. Si > 80%, identifier outils non essentiels
  if (usage > 0.8) {
    const nonEssentialTools = await identifyNonEssentialMCPTools(context);
    
    // 2. Désactiver outils non essentiels
    if (nonEssentialTools.length > 0) {
      await disableMCPTools(nonEssentialTools, context);
      monitor.mcpTools.current -= nonEssentialTools.length;
    }
  }
  
  // 3. Si > 90%, utiliser serveurs MCP centralisés
  if (usage > 0.9) {
    await useCentralizedMCPServers(context);
  }
  
  return {
    disabled: usage > 0.8,
    centralized: usage > 0.9,
    current: monitor.mcpTools.current,
    limit: monitor.mcpTools.limit
  };
}
```

### 4. Contournement Fichiers Volumineux

**IMPÉRATIF:** L'agent DOIT gérer les fichiers volumineux pour garantir envoi complet.

**TOUJOURS:**
- ✅ Détecter fichiers > 50KB
- ✅ Utiliser approche en deux étapes pour fichiers volumineux
- ✅ Charger sections pertinentes uniquement
- ✅ Utiliser résumés pour fichiers très longs

**Pattern:**
```typescript
// Contournement fichiers volumineux
async function workaroundLargeFiles(
  filePath: string,
  context: Context
): Promise<LargeFileWorkaround> {
  const fileSize = await getFileSize(filePath);
  const maxRecommended = 50 * 1024; // 50KB
  
  // 1. Si fichier volumineux, utiliser approche en deux étapes
  if (fileSize > maxRecommended) {
    // Étape 1: Question simple pour initier conversation
    await initiateConversationWithSimpleQuestion(filePath, context);
    
    // Étape 2: Coller contenu complet dans message suivant
    const fullContent = await read_file(filePath);
    await sendFullContentInNextMessage(fullContent, context);
    
    return {
      approach: 'two-step',
      fileSize,
      maxRecommended
    };
  }
  
  // 2. Si fichier très long, charger sections pertinentes
  if (fileSize > maxRecommended * 2) {
    const relevantSections = await extractRelevantSections(filePath, context);
    return {
      approach: 'section-based',
      fileSize,
      sections: relevantSections.length
    };
  }
  
  return {
    approach: 'normal',
    fileSize
  };
}
```

### 5. Contournement Édition Multi-Fichiers

**IMPÉRATIF:** L'agent DOIT diviser les refactorisations multi-fichiers en modules plus petits.

**TOUJOURS:**
- ✅ Diviser refactorisations en modules < 5 fichiers
- ✅ Gérer dépendances explicitement
- ✅ Valider chaque module avant suivant
- ✅ Utiliser scripts externes pour refactorisations complexes

**Pattern:**
```typescript
// Contournement édition multi-fichiers
async function workaroundMultiFileEditing(
  refactoring: MultiFileRefactoring,
  context: Context
): Promise<MultiFileWorkaround> {
  // 1. Diviser en modules < 5 fichiers
  const modules = divideIntoModules(refactoring.files, 5);
  
  // 2. Traiter chaque module séparément
  const results: ModuleResult[] = [];
  for (const module of modules) {
    // 3. Gérer dépendances
    const dependencies = await identifyDependencies(module, context);
    
    // 4. Valider module avant suivant
    const validation = await validateModule(module, dependencies, context);
    if (!validation.valid) {
      throw new Error(`Module validation failed: ${validation.errors.join(', ')}`);
    }
    
    // 5. Appliquer refactorisation module
    const result = await applyRefactoringToModule(module, context);
    results.push(result);
  }
  
  return {
    modules: modules.length,
    results,
    allCompleted: results.every(r => r.success)
  };
}
```

### 6. Contournement Quotas Mensuels

**IMPÉRATIF:** L'agent DOIT optimiser l'utilisation des modèles selon quotas restants.

**TOUJOURS:**
- ✅ Surveiller quotas mensuels en temps réel
- ✅ Utiliser modèles moins coûteux si quota faible
- ✅ Regrouper tâches similaires pour réduire requêtes
- ✅ Activer mode économie si quota critique

**Pattern:**
```typescript
// Contournement quotas mensuels
async function workaroundMonthlyQuotas(
  context: Context,
  monitor: CursorLimitsMonitor
): Promise<QuotaWorkaround> {
  const quotas = monitor.monthlyQuotas;
  
  // 1. Détecter quotas critiques
  const criticalQuotas: string[] = [];
  if (quotas.sonnet4.remaining < 10) criticalQuotas.push('sonnet4');
  if (quotas.gemini.remaining < 10) criticalQuotas.push('gemini');
  if (quotas.gpt41.remaining < 10) criticalQuotas.push('gpt41');
  
  // 2. Si quota critique, activer mode économie
  if (criticalQuotas.length > 0) {
    await enableEconomyMode(criticalQuotas, context);
  }
  
  // 3. Optimiser sélection modèle selon quotas
  const modelSelection = await optimizeModelSelectionByQuotas(quotas, context);
  
  // 4. Regrouper tâches similaires
  if (quotas.sonnet4.remaining < 50 || quotas.gemini.remaining < 50 || quotas.gpt41.remaining < 50) {
    await batchSimilarTasks(context);
  }
  
  return {
    criticalQuotas,
    economyModeEnabled: criticalQuotas.length > 0,
    modelSelection,
    batched: quotas.sonnet4.remaining < 50 || quotas.gemini.remaining < 50 || quotas.gpt41.remaining < 50
  };
}
```

**Référence:** `@.cursor/rules/cost-optimization.md` - Optimisation coûts  
**Référence:** `@.cursor/rules/intelligent-model-selection.md` - Sélection intelligente modèle

### 7. Contournement Performance Grands Projets

**IMPÉRATIF:** L'agent DOIT optimiser pour grands projets.

**TOUJOURS:**
- ✅ Utiliser `.cursorignore` pour exclure fichiers non pertinents
- ✅ Segmenter projets en sous-projets si nécessaire
- ✅ Optimiser ressources CPU/RAM
- ✅ Utiliser indexation sélective

**Pattern:**
```typescript
// Contournement performance grands projets
async function workaroundLargeProjectPerformance(
  projectPath: string,
  context: Context
): Promise<PerformanceWorkaround> {
  // 1. Vérifier .cursorignore
  const cursorignoreExists = await checkCursorignoreExists(projectPath);
  if (!cursorignoreExists) {
    await createOptimalCursorignore(projectPath, context);
  }
  
  // 2. Segmenter si projet très grand
  const projectSize = await calculateProjectSize(projectPath);
  if (projectSize > 1000000) { // > 1M lignes
    await segmentProjectIntoSubprojects(projectPath, context);
  }
  
  // 3. Optimiser indexation
  await optimizeIndexing(projectPath, context);
  
  return {
    cursorignoreCreated: !cursorignoreExists,
    segmented: projectSize > 1000000,
    optimized: true
  };
}
```

## 🔄 Système de Contournement Unifié

### Workflow: Contournement Automatique Multi-Limites

**Étapes:**
1. **Surveillance Continue** : Surveiller toutes les limites simultanément
2. **Détection Approche** : Détecter approche de chaque limite
3. **Priorisation** : Prioriser contournements selon criticité
4. **Application Coordonnée** : Appliquer contournements de manière coordonnée
5. **Optimisation Globale** : Optimiser globalement pour éviter conflits
6. **Validation** : Valider que contournements fonctionnent

**Pattern:**
```typescript
// Système de contournement unifié
async function applyUnifiedWorkarounds(
  context: Context
): Promise<UnifiedWorkaroundResult> {
  const monitor = new UnifiedLimitsMonitor();
  
  // 1. Surveiller toutes les limites
  const status = await monitor.trackAllLimits(context);
  
  // 2. Prioriser contournements selon criticité
  const prioritized = prioritizeWorkarounds(status.approachingLimits);
  
  // 3. Appliquer contournements coordonnés
  const workarounds: WorkaroundResult[] = [];
  for (const limit of prioritized) {
    let workaround: WorkaroundResult;
    
    switch (limit.type) {
      case 'tool-calls':
        workaround = await workaroundToolCalls(context, monitor);
        break;
      case 'context-tokens':
        workaround = await workaroundContextTokens(context, monitor);
        break;
      case 'mcp-tools':
        workaround = await workaroundMCPTools(context, monitor);
        break;
      case 'file-size':
        workaround = await workaroundLargeFiles(limit.largeFiles[0], context);
        break;
      case 'monthly-quota-sonnet4':
      case 'monthly-quota-gemini':
      case 'monthly-quota-gpt41':
        workaround = await workaroundMonthlyQuotas(context, monitor);
        break;
      default:
        workaround = { type: limit.type, applied: false };
    }
    
    workarounds.push(workaround);
  }
  
  // 4. Optimiser globalement
  await optimizeGlobally(workarounds, context);
  
  // 5. Valider contournements
  const validation = await validateWorkarounds(workarounds, context);
  
  return {
    status,
    workarounds,
    optimized: true,
    validated: validation.allValid
  };
}
```

## ⚠️ Règles de Contournement

### Ne Jamais:

**BLOQUANT:**
- ❌ Ignorer approche de limite
- ❌ Ne pas surveiller toutes les limites
- ❌ Appliquer contournements de manière isolée
- ❌ Ne pas optimiser globalement

**TOUJOURS:**
- ✅ Surveiller toutes les limites simultanément
- ✅ Détecter approche de chaque limite
- ✅ Prioriser contournements selon criticité
- ✅ Appliquer contournements coordonnés
- ✅ Optimiser globalement
- ✅ Valider contournements

## 📊 Checklist Contournement Unifié

### Surveillance Continue

- [ ] Surveiller tool calls (< 1000)
- [ ] Surveiller contexte tokens (< 200k/1M)
- [ ] Surveiller outils MCP (< 40)
- [ ] Surveiller taille fichiers (< 50KB recommandé)
- [ ] Surveiller quotas mensuels

### Contournements

- [ ] Tool calls > 800 → Optimiser, > 900 → Checkpoint
- [ ] Contexte > 80% → Activer Max Mode, > 90% → Compresser
- [ ] MCP Tools > 80% → Désactiver non essentiels
- [ ] Fichiers > 50KB → Approche deux étapes
- [ ] Refactorisation > 5 fichiers → Diviser en modules
- [ ] Quotas < 50 → Mode économie, < 10 → Critique

### Optimisation Globale

- [ ] Coordonner contournements
- [ ] Éviter conflits entre contournements
- [ ] Optimiser ressources globalement
- [ ] Valider tous les contournements

## 🔗 Références

- `@.cursor/rules/tool-call-limit-workaround.md` - Contournement limite 1000 tool calls
- `@.cursor/rules/context-optimization.md` - Optimisation contexte
- `@.cursor/rules/context-compression.md` - Compression contexte
- `@.cursor/rules/cost-optimization.md` - Optimisation coûts
- `@.cursor/rules/intelligent-model-selection.md` - Sélection intelligente modèle

---

**Note:** Ce système unifié garantit que toutes les limites de Cursor sont surveillées et contournées automatiquement avec optimisation globale.

**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

