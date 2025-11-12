# Détection Proactive de Code Similaire - Saxium

**Objectif:** Détecter automatiquement le code similaire existant avant de créer ou modifier du code pour éviter la duplication et réutiliser les patterns établis.

## 🎯 Principe Fondamental

**IMPÉRATIF:** Avant toute création ou modification de code, l'agent DOIT rechercher automatiquement du code similaire existant pour éviter la duplication et réutiliser les patterns établis.

**Bénéfices:**
- ✅ Évite la duplication de code
- ✅ Réutilise les patterns établis
- ✅ Améliore la cohérence du code
- ✅ Réduit le temps de développement
- ✅ Améliore la maintenabilité

## 📋 Règles de Détection Proactive

### 1. Recherche Automatique Avant Création

**TOUJOURS:**
- ✅ Rechercher automatiquement du code similaire avant de créer du nouveau code
- ✅ Analyser les patterns existants dans le projet
- ✅ Identifier les fonctions/services similaires existants
- ✅ Vérifier si la fonctionnalité existe déjà
- ✅ Réutiliser le code existant si possible

**Pattern:**
```typescript
// Avant de créer du nouveau code
async function detectSimilarCodeBeforeCreation(
  task: Task,
  context: Context
): Promise<SimilarCodeResult> {
  // 1. Extraire caractéristiques de la tâche
  const taskFeatures = extractTaskFeatures(task);
  
  // 2. Rechercher code similaire
  const similarCode = await codebase_search(
    `Find code that ${taskFeatures.description}`,
    context.targetDirectories
  );
  
  // 3. Rechercher patterns similaires
  const similarPatterns = await codebase_search(
    `What are the patterns for ${taskFeatures.pattern}?`,
    context.targetDirectories
  );
  
  // 4. Rechercher fonctionnalités similaires
  const similarFeatures = await codebase_search(
    `Where is ${taskFeatures.feature} implemented?`,
    context.targetDirectories
  );
  
  // 5. Analyser similarité
  const similarity = analyzeSimilarity(taskFeatures, {
    code: similarCode,
    patterns: similarPatterns,
    features: similarFeatures
  });
  
  // 6. Retourner résultats
  return {
    similarCode: similarity.code.filter(s => s.score > 0.7),
    similarPatterns: similarity.patterns.filter(p => p.score > 0.7),
    similarFeatures: similarity.features.filter(f => f.score > 0.7),
    recommendation: similarity.recommendation
  };
}
```

### 2. Détection de Duplication Avant Modification

**TOUJOURS:**
- ✅ Détecter code dupliqué avant modification
- ✅ Identifier logique commune à extraire
- ✅ Proposer refactoring si duplication détectée
- ✅ Extraire logique commune en fonctions/services
- ✅ Réutiliser code existant au lieu de dupliquer

**Pattern:**
```typescript
// Avant de modifier du code
async function detectDuplicationBeforeModification(
  code: string,
  context: Context
): Promise<DuplicationResult> {
  // 1. Extraire logique du code à modifier
  const codeLogic = extractLogic(code);
  
  // 2. Rechercher code similaire dans le projet
  const similarCode = await codebase_search(
    `Find code with similar logic: ${codeLogic.description}`,
    context.targetDirectories
  );
  
  // 3. Analyser duplication
  const duplication = analyzeDuplication(codeLogic, similarCode);
  
  // 4. Si duplication détectée, proposer refactoring
  if (duplication.score > 0.8) {
    return {
      hasDuplication: true,
      duplicatedCode: duplication.matches,
      recommendation: 'extract-common-logic',
      suggestedRefactoring: generateRefactoringSuggestion(codeLogic, duplication.matches)
    };
  }
  
  return {
    hasDuplication: false,
    recommendation: 'proceed-with-modification'
  };
}
```

### 3. Réutilisation Automatique de Code Existant

**TOUJOURS:**
- ✅ Réutiliser code existant si similaire (> 80% similarité)
- ✅ Adapter code existant au lieu de créer nouveau
- ✅ Réutiliser patterns établis du projet
- ✅ Réutiliser services/fonctions existants
- ✅ Documenter réutilisation

**Pattern:**
```typescript
// Réutiliser code existant si similaire
async function reuseExistingCodeIfSimilar(
  task: Task,
  context: Context
): Promise<ReuseResult> {
  // 1. Détecter code similaire
  const similarCode = await detectSimilarCodeBeforeCreation(task, context);
  
  // 2. Si code très similaire trouvé (> 80%)
  if (similarCode.similarCode.length > 0) {
    const bestMatch = similarCode.similarCode[0];
    
    if (bestMatch.score > 0.8) {
      // 3. Adapter code existant
      const adaptedCode = await adaptExistingCode(bestMatch.code, task);
      
      // 4. Valider adaptation
      const validation = await validateAdaptation(adaptedCode, task);
      
      if (validation.success) {
        return {
          reused: true,
          originalCode: bestMatch.code,
          adaptedCode: adaptedCode,
          validation: validation
        };
      }
    }
  }
  
  // 5. Si pas de code similaire, créer nouveau
  return {
    reused: false,
    recommendation: 'create-new-code'
  };
}
```

### 4. Suggestion Automatique de Patterns

**TOUJOURS:**
- ✅ Suggérer automatiquement les patterns établis
- ✅ Proposer implémentations basées sur code existant
- ✅ Éviter réinvention de la roue
- ✅ Améliorer cohérence du code

**Pattern:**
```typescript
// Suggérer patterns automatiquement
async function suggestPatternsAutomatically(
  task: Task,
  context: Context
): Promise<PatternSuggestion[]> {
  // 1. Identifier type de tâche
  const taskType = identifyTaskType(task);
  
  // 2. Rechercher patterns établis pour ce type
  const patterns = await codebase_search(
    `What are the established patterns for ${taskType}?`,
    context.targetDirectories
  );
  
  // 3. Rechercher exemples concrets
  const examples = await codebase_search(
    `Show me examples of ${taskType} implementation`,
    context.targetDirectories
  );
  
  // 4. Générer suggestions
  const suggestions = generatePatternSuggestions(taskType, patterns, examples);
  
  // 5. Trier par pertinence
  return suggestions.sort((a, b) => b.relevance - a.relevance);
}
```

## 🔄 Workflow de Détection Proactive

### Workflow: Détecter Code Similaire Avant Création/Modification

**Étapes:**
1. Extraire caractéristiques de la tâche
2. Rechercher code similaire dans le projet
3. Rechercher patterns similaires
4. Rechercher fonctionnalités similaires
5. Analyser similarité
6. Recommander réutilisation ou création
7. Adapter code existant si similaire
8. Créer nouveau code seulement si nécessaire

**Pattern:**
```typescript
async function detectSimilarCodeWorkflow(
  task: Task,
  context: Context
): Promise<CodeCreationResult> {
  // 1. Détecter code similaire
  const similarCode = await detectSimilarCodeBeforeCreation(task, context);
  
  // 2. Si code très similaire trouvé
  if (similarCode.similarCode.length > 0 && similarCode.similarCode[0].score > 0.8) {
    // 3. Réutiliser code existant
    const reuseResult = await reuseExistingCodeIfSimilar(task, context);
    
    if (reuseResult.reused) {
      return {
        action: 'reuse',
        code: reuseResult.adaptedCode,
        originalCode: reuseResult.originalCode,
        validation: reuseResult.validation
      };
    }
  }
  
  // 4. Si patterns similaires trouvés
  if (similarCode.similarPatterns.length > 0) {
    // 5. Suggérer patterns
    const suggestions = await suggestPatternsAutomatically(task, context);
    
    return {
      action: 'create-with-patterns',
      suggestions: suggestions,
      recommendedPattern: suggestions[0]
    };
  }
  
  // 6. Créer nouveau code
  return {
    action: 'create-new',
    recommendation: 'no-similar-code-found'
  };
}
```

## ⚠️ Règles Anti-Duplication

### Ne Jamais:

**BLOQUANT:**
- ❌ Créer du code sans rechercher code similaire
- ❌ Dupliquer code existant sans raison valable
- ❌ Ignorer patterns établis du projet
- ❌ Réinventer la roue si solution existe

**TOUJOURS:**
- ✅ Rechercher code similaire avant création
- ✅ Réutiliser code existant si similaire
- ✅ Suivre patterns établis du projet
- ✅ Documenter réutilisation ou création

## 📊 Checklist Détection Proactive

### Avant de Créer du Code

- [ ] Extraire caractéristiques de la tâche
- [ ] Rechercher code similaire dans le projet
- [ ] Rechercher patterns similaires
- [ ] Rechercher fonctionnalités similaires
- [ ] Analyser similarité (> 80% = réutiliser)
- [ ] Réutiliser code existant si similaire
- [ ] Adapter code existant si nécessaire
- [ ] Créer nouveau code seulement si nécessaire

### Avant de Modifier du Code

- [ ] Détecter code dupliqué
- [ ] Identifier logique commune
- [ ] Proposer refactoring si duplication
- [ ] Extraire logique commune
- [ ] Réutiliser code existant

### Pendant le Développement

- [ ] Suivre patterns établis
- [ ] Réutiliser fonctions/services existants
- [ ] Éviter duplication
- [ ] Documenter réutilisation

## 🔗 Références

- `@.cursor/rules/context-search.md` - Recherche contextuelle avancée
- `@.cursor/rules/examples.md` - Exemples concrets par type de tâche
- `@.cursor/rules/anti-patterns.md` - Anti-patterns consolidés
- `@.cursor/rules/core.md` - Règles fondamentales

---

**Note:** Cette règle garantit que l'agent détecte automatiquement le code similaire existant avant de créer ou modifier du code, évitant la duplication et améliorant la réutilisation.

