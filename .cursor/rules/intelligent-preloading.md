<!-- 
Context: preloading, performance, latency, prediction, caching, optimization
Priority: P1
Auto-load: when optimizing performance, when latency is high, when context is large
Dependencies: core.md, quality-principles.md, context-optimization.md, search-cache.md
Score: 60
-->

# Préchargement Intelligent - Saxium

**Objectif:** Précharger intelligemment les fichiers probables pour réduire la latence et améliorer les performances.

**Référence:** [Cursor Rules Documentation](https://docs.cursor.com/context/rules)  
**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

## 🎯 Principe Fondamental

**IMPÉRATIF:** L'agent DOIT précharger intelligemment les fichiers probables selon le contexte pour réduire la latence et améliorer les performances.

**Bénéfices:**
- ✅ Réduction significative de la latence
- ✅ Amélioration de la réactivité
- ✅ Optimisation de l'utilisation des ressources
- ✅ Expérience utilisateur améliorée

**Référence:** `@.cursor/rules/context-optimization.md` - Gestion intelligente du contexte  
**Référence:** `@.cursor/rules/search-cache.md` - Cache intelligent des recherches

## 📋 Règles de Préchargement Intelligent

### 1. Prédiction des Fichiers Probables

**TOUJOURS:**
- ✅ Analyser contexte pour prédire fichiers probables
- ✅ Utiliser historique pour améliorer prédictions
- ✅ Prioriser fichiers selon probabilité
- ✅ Précharger fichiers les plus probables

**Pattern:**
```typescript
// Prédiction des fichiers probables
interface FilePrediction {
  filePath: string;
  probability: number; // 0-1
  reason: string;
  priority: 'high' | 'medium' | 'low';
}

async function predictProbableFiles(
  task: Task,
  context: Context
): Promise<FilePrediction[]> {
  const predictions: FilePrediction[] = [];
  
  // 1. Analyser fichiers directement affectés
  const directlyAffected = identifyDirectlyAffectedFiles(task);
  directlyAffected.forEach(file => {
    predictions.push({
      filePath: file,
      probability: 0.95,
      reason: 'directly-affected',
      priority: 'high'
    });
  });
  
  // 2. Analyser dépendances probables
  const dependencies = await predictDependencies(directlyAffected, context);
  dependencies.forEach(dep => {
    predictions.push({
      filePath: dep.file,
      probability: dep.probability,
      reason: 'dependency',
      priority: dep.probability > 0.7 ? 'high' : 'medium'
    });
  });
  
  // 3. Utiliser historique pour améliorer prédictions
  const historical = await getHistoricalPatterns(task, context);
  historical.forEach(pattern => {
    predictions.push({
      filePath: pattern.file,
      probability: pattern.frequency,
      reason: 'historical-pattern',
      priority: pattern.frequency > 0.8 ? 'high' : 'medium'
    });
  });
  
  // 4. Trier par probabilité
  return predictions.sort((a, b) => b.probability - a.probability);
}
```

### 2. Préchargement Parallèle des Fichiers

**TOUJOURS:**
- ✅ Précharger fichiers en parallèle
- ✅ Limiter nombre de fichiers préchargés simultanément
- ✅ Prioriser fichiers haute probabilité
- ✅ Annuler préchargement si fichier non nécessaire

**Pattern:**
```typescript
// Préchargement parallèle des fichiers
async function preloadFilesIntelligently(
  predictions: FilePrediction[],
  maxConcurrent: number = 5
): Promise<PreloadedFiles> {
  // 1. Filtrer fichiers haute probabilité
  const highPriority = predictions
    .filter(p => p.priority === 'high')
    .slice(0, maxConcurrent);
  
  // 2. Précharger en parallèle
  const preloaded = await Promise.all(
    highPriority.map(async prediction => {
      try {
        const content = await read_file(prediction.filePath);
        return {
          filePath: prediction.filePath,
          content,
          preloaded: true,
          timestamp: Date.now()
        };
      } catch (error) {
        logger.warn('Échec préchargement fichier', {
          metadata: {
            filePath: prediction.filePath,
            error: error.message
          }
        });
        return {
          filePath: prediction.filePath,
          content: null,
          preloaded: false,
          error: error.message
        };
      }
    })
  );
  
  // 3. Mettre en cache fichiers préchargés
  await cachePreloadedFiles(preloaded.filter(f => f.preloaded));
  
  return {
    files: preloaded,
    count: preloaded.filter(f => f.preloaded).length,
    totalPredicted: predictions.length
  };
}
```

### 3. Cache Prédictif Basé sur Patterns

**TOUJOURS:**
- ✅ Identifier patterns de fichiers fréquemment utilisés ensemble
- ✅ Précharger fichiers selon patterns
- ✅ Mettre à jour patterns selon utilisation réelle
- ✅ Optimiser cache prédictif

**Pattern:**
```typescript
// Cache prédictif basé sur patterns
class PredictiveCache {
  private patterns: Map<string, FilePattern> = new Map();
  
  async predictFilesFromPattern(
    task: Task,
    context: Context
  ): Promise<string[]> {
    // 1. Identifier pattern correspondant
    const pattern = await identifyPattern(task, context);
    
    // 2. Si pattern connu, utiliser fichiers associés
    if (this.patterns.has(pattern.id)) {
      const knownPattern = this.patterns.get(pattern.id)!;
      return knownPattern.files.map(f => f.path);
    }
    
    // 3. Sinon, apprendre nouveau pattern
    const files = await predictFilesFromTask(task, context);
    await this.learnPattern(pattern.id, files, context);
    
    return files;
  }
  
  async learnPattern(
    patternId: string,
    files: string[],
    context: Context
  ): Promise<void> {
    const pattern: FilePattern = {
      id: patternId,
      files: files.map(path => ({ path, frequency: 1 })),
      lastUsed: Date.now(),
      successRate: 1.0
    };
    
    // Mettre à jour si pattern existe déjà
    if (this.patterns.has(patternId)) {
      const existing = this.patterns.get(patternId)!;
      pattern.files = mergeFileFrequencies(existing.files, pattern.files);
      pattern.successRate = calculateSuccessRate(existing, pattern);
    }
    
    this.patterns.set(patternId, pattern);
    await savePattern(pattern, context);
  }
}
```

### 4. Chargement Parallèle des Dépendances

**TOUJOURS:**
- ✅ Identifier dépendances avant chargement
- ✅ Charger dépendances en parallèle
- ✅ Optimiser ordre de chargement
- ✅ Éviter chargements redondants

**Pattern:**
```typescript
// Chargement parallèle des dépendances
async function loadDependenciesInParallel(
  filePath: string,
  context: Context
): Promise<DependencyFiles> {
  // 1. Identifier dépendances
  const dependencies = await identifyDependencies(filePath, context);
  
  // 2. Grouper par niveau de dépendance
  const grouped = groupDependenciesByLevel(dependencies);
  
  // 3. Charger chaque niveau en parallèle
  const loaded: Map<string, string> = new Map();
  
  for (const level of grouped.levels) {
    const levelFiles = await Promise.all(
      level.files.map(async dep => {
        // Vérifier si déjà chargé
        if (loaded.has(dep.path)) {
          return { path: dep.path, content: loaded.get(dep.path)! };
        }
        
        // Charger fichier
        const content = await read_file(dep.path);
        loaded.set(dep.path, content);
        return { path: dep.path, content };
      })
    );
    
    // Mettre en cache niveau chargé
    await cacheDependencyLevel(level.level, levelFiles, context);
  }
  
  return {
    files: Array.from(loaded.entries()).map(([path, content]) => ({
      path,
      content
    })),
    levels: grouped.levels.length
  };
}
```

### 5. Précompilation des Règles Fréquentes

**TOUJOURS:**
- ✅ Identifier règles fréquemment utilisées
- ✅ Précompiler règles fréquentes
- ✅ Mettre en cache règles précompilées
- ✅ Optimiser chargement des règles

**Pattern:**
```typescript
// Précompilation des règles fréquentes
async function precompileFrequentRules(
  context: Context
): Promise<PrecompiledRules> {
  // 1. Identifier règles fréquemment utilisées
  const frequentRules = await identifyFrequentRules(context);
  
  // 2. Précompiler règles
  const precompiled = await Promise.all(
    frequentRules.map(async rule => {
      const compiled = await compileRule(rule, context);
      return {
        rule: rule.path,
        compiled,
        timestamp: Date.now()
      };
    })
  );
  
  // 3. Mettre en cache règles précompilées
  await cachePrecompiledRules(precompiled, context);
  
  return {
    rules: precompiled,
    count: precompiled.length
  };
}
```

## 🔄 Workflow de Préchargement Intelligent

### Workflow: Précharger Fichiers Intelligemment

**Étapes:**
1. Analyser contexte de la tâche
2. Prédire fichiers probables
3. Prioriser fichiers selon probabilité
4. Précharger fichiers haute priorité en parallèle
5. Mettre en cache fichiers préchargés
6. Utiliser fichiers préchargés si nécessaires

**Pattern:**
```typescript
async function preloadIntelligently(
  task: Task,
  context: Context
): Promise<PreloadResult> {
  // 1. Prédire fichiers probables
  const predictions = await predictProbableFiles(task, context);
  
  // 2. Précharger fichiers haute priorité
  const preloaded = await preloadFilesIntelligently(
    predictions.filter(p => p.priority === 'high'),
    5 // max 5 fichiers en parallèle
  );
  
  // 3. Charger dépendances en parallèle
  const dependencies = await loadDependenciesInParallel(
    task.primaryFile,
    context
  );
  
  // 4. Précompiler règles fréquentes
  const rules = await precompileFrequentRules(context);
  
  // 5. Mettre en cache résultats
  await cachePreloadResults({
    predictions,
    preloaded,
    dependencies,
    rules
  }, context);
  
  return {
    predictions: predictions.length,
    preloaded: preloaded.count,
    dependencies: dependencies.files.length,
    rules: rules.count,
    cacheHit: preloaded.count > 0
  };
}
```

## ⚠️ Règles de Préchargement Intelligent

### Ne Jamais:

**BLOQUANT:**
- ❌ Précharger trop de fichiers simultanément
- ❌ Précharger fichiers non probables
- ❌ Ignorer historique pour prédictions
- ❌ Ne pas mettre en cache fichiers préchargés

**TOUJOURS:**
- ✅ Prédire fichiers probables selon contexte
- ✅ Précharger fichiers haute priorité
- ✅ Charger dépendances en parallèle
- ✅ Mettre en cache fichiers préchargés
- ✅ Utiliser historique pour améliorer prédictions

## 📊 Checklist Préchargement Intelligent

### Avant Tâche

- [ ] Analyser contexte de la tâche
- [ ] Prédire fichiers probables
- [ ] Prioriser fichiers selon probabilité
- [ ] Précharger fichiers haute priorité

### Pendant Tâche

- [ ] Utiliser fichiers préchargés si disponibles
- [ ] Charger dépendances en parallèle si nécessaire
- [ ] Mettre à jour patterns selon utilisation

### Après Tâche

- [ ] Documenter fichiers réellement utilisés
- [ ] Mettre à jour patterns prédictifs
- [ ] Optimiser cache prédictif

## 🔗 Références

- `@.cursor/rules/context-optimization.md` - Gestion intelligente du contexte
- `@.cursor/rules/search-cache.md` - Cache intelligent des recherches
- `@.cursor/rules/performance.md` - Optimisations performance

---

**Note:** Cette règle garantit que les fichiers probables sont préchargés intelligemment pour réduire la latence et améliorer les performances.

**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

