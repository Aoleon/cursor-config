# Optimisation Intelligente du Contexte - Saxium

**Objectif:** Gérer intelligemment le contexte pour éviter la saturation et optimiser les performances de l'agent.

## 🎯 Principe Fondamental

**IMPÉRATIF:** L'agent DOIT gérer intelligemment le contexte pour éviter la saturation et optimiser les performances.

**Bénéfices:**
- ✅ Évite la saturation du contexte
- ✅ Optimise les performances de l'agent
- ✅ Charge uniquement les fichiers pertinents
- ✅ Évite les fichiers obsolètes ou non pertinents
- ✅ Améliore la qualité des réponses

## 📋 Règles d'Optimisation du Contexte

### 1. Détection Automatique des Fichiers Pertinents

**TOUJOURS:**
- ✅ Identifier automatiquement les fichiers pertinents
- ✅ Charger uniquement les fichiers nécessaires
- ✅ Éviter les fichiers obsolètes ou non pertinents
- ✅ Prioriser les fichiers récemment modifiés
- ✅ Éviter les fichiers dupliqués

**Pattern:**
```typescript
// Détecter fichiers pertinents automatiquement
async function detectRelevantFiles(
  task: Task,
  context: Context
): Promise<RelevantFiles> {
  // 1. Identifier fichiers directement affectés
  const directlyAffected = identifyDirectlyAffectedFiles(task);
  
  // 2. Identifier dépendances
  const dependencies = await identifyDependencies(directlyAffected);
  
  // 3. Identifier fichiers de référence
  const references = await identifyReferenceFiles(task, context);
  
  // 4. Filtrer fichiers obsolètes
  const filtered = filterObsoleteFiles([...directlyAffected, ...dependencies, ...references]);
  
  // 5. Prioriser par pertinence
  const prioritized = prioritizeByRelevance(filtered, task);
  
  // 6. Limiter nombre de fichiers (éviter saturation)
  const limited = limitFileCount(prioritized, MAX_CONTEXT_FILES);
  
  return {
    files: limited,
    count: limited.length,
    totalConsidered: filtered.length
  };
}
```

### 2. Éviction Intelligente du Contexte

**TOUJOURS:**
- ✅ Éviter les fichiers non pertinents du contexte
- ✅ Remplacer les fichiers obsolètes par nouveaux
- ✅ Conserver uniquement les fichiers essentiels
- ✅ Éviter les fichiers dupliqués

**Pattern:**
```typescript
// Éviter contexte intelligemment
async function evictContextIntelligently(
  currentContext: Context,
  newFiles: File[],
  maxFiles: number
): Promise<OptimizedContext> {
  // 1. Identifier fichiers essentiels (ne jamais évincer)
  const essentialFiles = identifyEssentialFiles(currentContext);
  
  // 2. Identifier fichiers obsolètes (peuvent être évincés)
  const obsoleteFiles = identifyObsoleteFiles(currentContext);
  
  // 3. Identifier fichiers dupliqués (peuvent être évincés)
  const duplicateFiles = identifyDuplicateFiles(currentContext);
  
  // 4. Calculer espace disponible
  const availableSpace = maxFiles - essentialFiles.length;
  
  // 5. Sélectionner nouveaux fichiers à ajouter
  const filesToAdd = selectFilesToAdd(newFiles, availableSpace);
  
  // 6. Éviter fichiers obsolètes et dupliqués
  const filesToEvict = [...obsoleteFiles, ...duplicateFiles].slice(0, filesToAdd.length);
  
  // 7. Créer contexte optimisé
  const optimizedContext = {
    files: [
      ...essentialFiles,
      ...currentContext.files.filter(f => !filesToEvict.includes(f)),
      ...filesToAdd
    ].slice(0, maxFiles),
    metadata: {
      evicted: filesToEvict.length,
      added: filesToAdd.length,
      essential: essentialFiles.length
    }
  };
  
  return optimizedContext;
}
```

### 3. Priorisation Dynamique du Contexte

**TOUJOURS:**
- ✅ Prioriser les fichiers par pertinence
- ✅ Prioriser les fichiers récemment modifiés
- ✅ Prioriser les fichiers avec dépendances
- ✅ Dép prioriser les fichiers obsolètes

**Pattern:**
```typescript
// Prioriser contexte dynamiquement
async function prioritizeContextDynamically(
  files: File[],
  task: Task,
  context: Context
): Promise<PrioritizedFiles> {
  // 1. Calculer score de pertinence pour chaque fichier
  const scoredFiles = files.map(file => ({
    file: file,
    score: calculateRelevanceScore(file, task, context)
  }));
  
  // 2. Trier par score décroissant
  const sorted = scoredFiles.sort((a, b) => b.score - a.score);
  
  // 3. Grouper par priorité
  const prioritized = {
    high: sorted.filter(f => f.score > 0.8),
    medium: sorted.filter(f => f.score > 0.5 && f.score <= 0.8),
    low: sorted.filter(f => f.score <= 0.5)
  };
  
  return prioritized;
}

// Calculer score de pertinence
function calculateRelevanceScore(
  file: File,
  task: Task,
  context: Context
): number {
  let score = 0;
  
  // Pertinence directe (fichier directement affecté)
  if (isDirectlyAffected(file, task)) {
    score += 0.5;
  }
  
  // Dépendances (fichier avec dépendances)
  if (hasDependencies(file, context)) {
    score += 0.2;
  }
  
  // Récent (fichier récemment modifié)
  if (isRecentlyModified(file)) {
    score += 0.15;
  }
  
  // Référence (fichier de référence)
  if (isReferenceFile(file, task)) {
    score += 0.1;
  }
  
  // Obsolète (pénalité)
  if (isObsolete(file)) {
    score -= 0.3;
  }
  
  return Math.max(0, Math.min(1, score));
}
```

### 4. Détection Proactive de Saturation et Réduction Automatique (RENFORCÉ)

**IMPÉRATIF:** Détecter saturation proactive et agir automatiquement selon seuils.

**TOUJOURS:**
- ✅ **Détecter saturation proactive** (IMPÉRATIF - surveillance continue)
- ✅ **Agir automatiquement selon seuils** (IMPÉRATIF):
  - >60% utilisation → Éviction fichiers non essentiels
  - >70% utilisation → Compression fichiers volumineux
  - >80% utilisation → Activation Max Mode automatique
- ✅ Réduire automatiquement si saturation
- ✅ Conserver uniquement fichiers essentiels
- ✅ Éviter fichiers non pertinents
- ✅ **Compression automatique fichiers volumineux** (NOUVEAU)
- ✅ **Max Mode automatique si nécessaire** (NOUVEAU)

**Pattern:**
```typescript
// Réduire contexte si saturation
async function reduceContextIfSaturated(
  context: Context,
  maxFiles: number
): Promise<ReducedContext> {
  // 1. Vérifier si saturation
  if (context.files.length <= maxFiles) {
    return {
      context: context,
      reduced: false,
      reason: 'no-saturation'
    };
  }
  
  // 2. Identifier fichiers essentiels
  const essentialFiles = identifyEssentialFiles(context);
  
  // 3. Identifier fichiers à évincer
  const filesToEvict = context.files
    .filter(f => !essentialFiles.includes(f))
    .sort((a, b) => calculateRelevanceScore(a) - calculateRelevanceScore(b))
    .slice(0, context.files.length - maxFiles);
  
  // 4. Créer contexte réduit
  const reducedContext = {
    files: context.files.filter(f => !filesToEvict.includes(f)),
    metadata: {
      originalCount: context.files.length,
      reducedCount: context.files.length - filesToEvict.length,
      evicted: filesToEvict.length
    }
  };
  
  return {
    context: reducedContext,
    reduced: true,
    reason: 'saturation-detected',
    evictedFiles: filesToEvict
  };
}
```

## 🔄 Workflow d'Optimisation du Contexte

### Workflow: Optimiser Contexte Avant Action

**Étapes:**
1. Détecter fichiers pertinents pour la tâche
2. Charger uniquement fichiers nécessaires
3. Prioriser fichiers par pertinence
4. Détecter saturation du contexte
5. Réduire contexte si saturation
6. Éviter fichiers obsolètes et dupliqués
7. Conserver fichiers essentiels

**Pattern:**
```typescript
async function optimizeContextBeforeAction(
  task: Task,
  currentContext: Context,
  maxFiles: number = 20
): Promise<OptimizedContext> {
  // 1. Détecter fichiers pertinents
  const relevantFiles = await detectRelevantFiles(task, currentContext);
  
  // 2. Prioriser fichiers
  const prioritized = await prioritizeContextDynamically(relevantFiles.files, task, currentContext);
  
  // 3. Sélectionner fichiers à charger
  const filesToLoad = [
    ...prioritized.high,
    ...prioritized.medium.slice(0, maxFiles - prioritized.high.length)
  ].map(f => f.file);
  
  // 4. Créer contexte optimisé
  let optimizedContext = {
    files: filesToLoad.slice(0, maxFiles),
    metadata: {
      totalConsidered: relevantFiles.totalConsidered,
      loaded: filesToLoad.length,
      highPriority: prioritized.high.length,
      mediumPriority: prioritized.medium.length
    }
  };
  
  // 5. Vérifier saturation
  if (optimizedContext.files.length > maxFiles) {
    const reduced = await reduceContextIfSaturated(optimizedContext, maxFiles);
    optimizedContext = reduced.context;
  }
  
  return optimizedContext;
}
```

## ⚠️ Règles d'Optimisation du Contexte

### Ne Jamais:

**BLOQUANT:**
- ❌ Charger trop de fichiers (saturation)
- ❌ Charger fichiers obsolètes ou non pertinents
- ❌ Ignorer saturation du contexte
- ❌ Charger fichiers dupliqués

**TOUJOURS:**
- ✅ Charger uniquement fichiers pertinents
- ✅ Prioriser fichiers par pertinence
- ✅ Réduire contexte si saturation
- ✅ Éviter fichiers obsolètes et dupliqués

## 📊 Checklist Optimisation du Contexte

### Avant Action

- [ ] Détecter fichiers pertinents pour la tâche
- [ ] Prioriser fichiers par pertinence
- [ ] Limiter nombre de fichiers (éviter saturation)
- [ ] Éviter fichiers obsolètes et dupliqués

### Pendant Action

- [ ] Surveiller saturation du contexte
- [ ] Réduire contexte si saturation
- [ ] Conserver fichiers essentiels

### Après Action

- [ ] Valider que contexte était optimal
- [ ] Documenter optimisations appliquées

## 🔗 Références

- `@.cursor/rules/context-usage.md` - Utilisation optimale du contexte
- `@.cursor/rules/context-detection.md` - Détection automatique du contexte
- `@.cursor/rules/load-strategy.md` - Stratégie de chargement optimisée

---

**Note:** Cette règle garantit que l'agent gère intelligemment le contexte pour éviter la saturation et optimiser les performances.

