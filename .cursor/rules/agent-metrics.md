# Tracking Automatique des Métriques Agent - Saxium

**Objectif:** Collecter automatiquement des métriques sur l'efficacité de l'agent pour identifier les patterns d'échec/succès et optimiser les performances.

## 🎯 Principe Fondamental

**IMPÉRATIF:** L'agent DOIT enregistrer automatiquement des métriques sur ses actions pour permettre l'analyse et l'optimisation continue.

**Bénéfices:**
- ✅ Mesure de l'efficacité réelle
- ✅ Identification des patterns d'échec
- ✅ Optimisation basée sur données réelles
- ✅ Amélioration continue

## 📊 Métriques à Tracker

### 1. Début de Tâche

**TOUJOURS:**
- ✅ Enregistrer timestamp début
- ✅ Identifier complexité tâche (simple/medium/complex)
- ✅ Compter nombre de todos
- ✅ Enregistrer description tâche

**Pattern:**
```typescript
// Au début de chaque tâche avec todos
const taskMetrics = {
  sessionId: generateUUID(),
  timestamp: new Date().toISOString(),
  task: {
    id: todo.id,
    description: todo.content,
    complexity: todos.length <= 3 ? 'simple' : todos.length <= 10 ? 'medium' : 'complex',
    todosCount: todos.length
  },
  performance: {
    toolCallsCount: 0,
    toolCallsByType: {},
    contextUsage: {
      filesLoaded: 0,
      rulesLoaded: 0
    }
  }
};
```

### 2. Tool Calls

**TOUJOURS:**
- ✅ Incrémenter compteur tool calls
- ✅ Tracker par type (read_file, search_replace, grep, etc.)
- ✅ Identifier tool calls redondants (même fichier lu plusieurs fois)

**Pattern:**
```typescript
// Avant chaque tool call
trackToolCall({
  type: 'read_file',
  target: 'server/services/MyService.ts',
  timestamp: Date.now()
});

// Détecter redondance
if (isRedundantToolCall(type, target)) {
  logWarning('Tool call redondant détecté');
}
```

### 3. Contexte

**TOUJOURS:**
- ✅ Compter fichiers chargés
- ✅ Compter règles chargées
- ✅ Estimer tokens utilisés
- ✅ Détecter saturation (> 80%)

**Pattern:**
```typescript
// Après chargement contexte
trackContextUsage({
  filesLoaded: contextFiles.length,
  rulesLoaded: loadedRules.length,
  estimatedTokens: estimateTokens(contextFiles, loadedRules)
});

// Alerter si saturation
if (estimatedTokens > 0.8 * MAX_TOKENS) {
  logWarning('Saturation contexte détectée (> 80%)');
}
```

### 4. Fin de Tâche

**TOUJOURS:**
- ✅ Enregistrer timestamp fin
- ✅ Calculer durée totale
- ✅ Enregistrer succès/échec
- ✅ Compter erreurs TypeScript avant/après
- ✅ Calculer score qualité code

**Pattern:**
```typescript
// À la fin de chaque tâche
const finalMetrics = {
  ...taskMetrics,
  performance: {
    ...taskMetrics.performance,
    durationMs: Date.now() - startTimestamp
  },
  quality: {
    success: !hasErrors,
    typescriptErrorsBefore: errorsBefore,
    typescriptErrorsAfter: errorsAfter,
    codeQualityScore: calculateQualityScore()
  },
  usage: {
    rulesUsed: loadedRules,
    searchesPerformed: searchCounts,
    filesModified: modifiedFiles
  }
};

// Sauvegarder métriques
saveMetrics(finalMetrics);
```

## 📝 Enregistrement des Métriques

### Format JSON

**Fichier:** `.cursor/agent-metrics.json` (append mode)

**Structure:**
```json
{
  "sessionId": "uuid",
  "timestamp": "2025-11-12T10:30:00Z",
  "task": {
    "id": "todo-123",
    "description": "Créer service X",
    "complexity": "medium",
    "todosCount": 5
  },
  "performance": {
    "durationMs": 45000,
    "toolCallsCount": 67,
    "toolCallsByType": {
      "read_file": 15,
      "search_replace": 12,
      "grep": 8,
      "codebase_search": 5
    },
    "contextUsage": {
      "filesLoaded": 12,
      "rulesLoaded": 7,
      "estimatedTokens": 45000
    }
  },
  "quality": {
    "success": true,
    "typescriptErrorsBefore": 2,
    "typescriptErrorsAfter": 0,
    "codeQualityScore": 85
  },
  "usage": {
    "rulesUsed": ["core.md", "backend.md", "similar-code-detection.md"],
    "searchesPerformed": {
      "codebase_search": 5,
      "grep": 8
    },
    "filesModified": ["server/services/MyService.ts"]
  },
  "efficiency": {
    "codeReused": true,
    "iterationsCount": 2,
    "proactiveDetections": 3
  }
}
```

### Sauvegarde

**TOUJOURS:**
- ✅ Sauvegarder après chaque tâche complétée
- ✅ Utiliser append mode (ne pas écraser)
- ✅ Valider format JSON avant sauvegarde
- ✅ Gérer erreurs de sauvegarde gracieusement

## 🔍 Analyse des Métriques

### Détection de Patterns

**TOUJOURS:**
- ✅ Identifier tool calls redondants
- ✅ Détecter saturation contexte fréquente
- ✅ Analyser règles peu utilisées
- ✅ Identifier patterns d'échec

**Pattern:**
```typescript
// Analyser métriques accumulées
const analysis = {
  redundantToolCalls: detectRedundantCalls(metrics),
  contextSaturation: detectSaturation(metrics),
  unusedRules: detectUnusedRules(metrics),
  failurePatterns: detectFailurePatterns(metrics)
};
```

### Recommandations

**TOUJOURS:**
- ✅ Générer recommandations basées sur métriques
- ✅ Prioriser recommandations par impact
- ✅ Documenter dans rapport d'analyse

## 🚨 Alertes

### Seuils d'Alerte

**TOUJOURS:**
- ✅ Alerter si performance dégradée (> 2x objectif)
- ✅ Alerter si qualité dégradée (< 80% succès)
- ✅ Alerter si saturation contexte (> 90%)
- ✅ Alerter si erreurs introduites (> 5 par tâche)

**Pattern:**
```typescript
// Vérifier seuils
if (durationMs > TARGET_DURATION * 2) {
  logAlert('Performance dégradée détectée');
}

if (successRate < 0.8) {
  logAlert('Qualité dégradée détectée');
}

if (estimatedTokens > MAX_TOKENS * 0.9) {
  logAlert('Saturation contexte critique (> 90%)');
}
```

## 🔗 Intégration

### Règles Associées

- `rule-usage-tracker.md` - Tracking usage règles
- `load-strategy.md` - Optimisation chargement
- `agent-optimization.md` - Optimisations basées métriques

### Documentation

- `docs/AGENT-METRICS.md` - Documentation complète métriques
- `docs/AGENT-IMPROVEMENTS-ANALYSIS.md` - Analyse résultats

## ✅ Checklist

**Avant chaque tâche:**
- [ ] Enregistrer début tâche avec métadonnées
- [ ] Initialiser compteurs tool calls
- [ ] Initialiser tracking contexte

**Pendant la tâche:**
- [ ] Tracker chaque tool call
- [ ] Détecter tool calls redondants
- [ ] Tracker usage contexte
- [ ] Détecter saturation contexte

**Après chaque tâche:**
- [ ] Enregistrer fin tâche
- [ ] Calculer métriques finales
- [ ] Sauvegarder métriques
- [ ] Générer recommandations si nécessaire

---

**Référence:** `@docs/AGENT-METRICS.md` - Documentation complète des métriques

