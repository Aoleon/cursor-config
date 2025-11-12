# Recherche Contextuelle Avancée - Saxium

**Objectif:** Optimiser la recherche et l'exploration du codebase pour améliorer les performances de l'agent

## 🎯 Stratégies de Recherche Contextuelle

### 1. Recherche Sémantique Stratégique

**Principe:** Utiliser `codebase_search` de manière stratégique pour comprendre le contexte avant modification.

**TOUJOURS:**
- ✅ Formuler des questions complètes et spécifiques
- ✅ Limiter la portée aux répertoires pertinents
- ✅ Utiliser plusieurs recherches pour différents aspects
- ✅ Analyser les résultats avant de modifier

**Patterns de Recherche:**
```typescript
// 1. Comprendre un concept complexe
codebase_search(
  "How does authentication work with Microsoft OAuth?",
  ["server/modules/auth"]
);

// 2. Trouver patterns similaires
codebase_search(
  "What are the patterns for error handling in routes?",
  ["server/modules"]
);

// 3. Explorer architecture
codebase_search(
  "How are services structured and initialized?",
  ["server/services"]
);

// 4. Comprendre dépendances
codebase_search(
  "What services depend on AIService?",
  ["server"]
);

// 5. Trouver usages d'un pattern
codebase_search(
  "Where is withErrorHandling used in services?",
  ["server/services"]
);
```

### 2. Recherche Exacte Ciblée

**Principe:** Utiliser `grep` pour trouver occurrences spécifiques après recherche sémantique.

**TOUJOURS:**
- ✅ Utiliser après recherche sémantique pour affiner
- ✅ Limiter aux fichiers pertinents
- ✅ Utiliser patterns regex appropriés
- ✅ Analyser contexte autour des matches

**Patterns de Recherche:**
```typescript
// 1. Trouver imports spécifiques
grep("import.*asyncHandler", "server/modules");

// 2. Trouver usages d'une fonction
grep("withErrorHandling", "server/services");

// 3. Trouver patterns d'erreur
grep("throw new Error", "server");

// 4. Trouver console.log
grep("console\\.(log|error)", "server");

// 5. Trouver types any
grep(": any", "server");
```

### 3. Recherche Hiérarchique

**Principe:** Rechercher de manière hiérarchique du général au spécifique.

**Workflow:**
1. **Niveau 1: Recherche générale** - Comprendre le concept
2. **Niveau 2: Recherche ciblée** - Trouver patterns similaires
3. **Niveau 3: Recherche exacte** - Trouver occurrences spécifiques
4. **Niveau 4: Lecture ciblée** - Lire fichiers pertinents

**Pattern:**
```typescript
async function hierarchicalSearch(topic: string, targetDirectories: string[]) {
  // Niveau 1: Recherche générale
  const generalResults = await codebase_search(
    `How does ${topic} work?`,
    targetDirectories
  );
  
  // Niveau 2: Recherche ciblée sur patterns
  const patternResults = await codebase_search(
    `What are the patterns for ${topic}?`,
    targetDirectories
  );
  
  // Niveau 3: Recherche exacte
  const exactResults = await grep(
    extractPattern(topic),
    targetDirectories
  );
  
  // Niveau 4: Lecture ciblée
  const relevantFiles = identifyRelevantFiles(
    generalResults,
    patternResults,
    exactResults
  );
  
  const fileContents = await Promise.all(
    relevantFiles.map(file => read_file(file))
  );
  
  return {
    general: generalResults,
    patterns: patternResults,
    exact: exactResults,
    files: fileContents
  };
}
```

### 4. Recherche Multi-Aspects

**Principe:** Rechercher plusieurs aspects d'un même sujet pour compréhension complète.

**Pattern:**
```typescript
async function multiAspectSearch(topic: string) {
  // Recherche architecture
  const architecture = await codebase_search(
    `How is ${topic} structured?`,
    ["server"]
  );
  
  // Recherche patterns
  const patterns = await codebase_search(
    `What are the patterns for ${topic}?`,
    ["server"]
  );
  
  // Recherche validation
  const validation = await codebase_search(
    `How is ${topic} validated?`,
    ["server"]
  );
  
  // Recherche erreurs
  const errors = await codebase_search(
    `How are errors handled in ${topic}?`,
    ["server"]
  );
  
  return {
    architecture,
    patterns,
    validation,
    errors
  };
}
```

## 🔍 Techniques de Recherche Avancées

### 1. Recherche par Similarité

**Principe:** Trouver code similaire à ce qui doit être modifié.

**Pattern:**
```typescript
async function findSimilarCode(targetCode: string, targetDirectories: string[]) {
  // 1. Extraire caractéristiques du code cible
  const features = extractFeatures(targetCode);
  
  // 2. Rechercher code avec caractéristiques similaires
  const similarCode = await codebase_search(
    `Find code that ${features.description}`,
    targetDirectories
  );
  
  // 3. Analyser similarité
  const similarity = analyzeSimilarity(targetCode, similarCode);
  
  // 4. Retourner code le plus similaire
  return similarity.sort((a, b) => b.score - a.score)[0];
}
```

### 2. Recherche par Patterns

**Principe:** Rechercher code suivant un pattern spécifique.

**Pattern:**
```typescript
async function findPattern(pattern: Pattern, targetDirectories: string[]) {
  // 1. Rechercher code suivant le pattern
  const results = await codebase_search(
    pattern.description,
    targetDirectories
  );
  
  // 2. Vérifier conformité au pattern
  const conforming = results.filter(result =>
    checkPatternConformance(result, pattern)
  );
  
  // 3. Retourner exemples conformes
  return conforming;
}
```

### 3. Recherche par Dépendances

**Principe:** Comprendre les dépendances avant modification.

**Pattern:**
```typescript
async function findDependencies(target: string) {
  // 1. Rechercher ce qui dépend de la cible
  const dependents = await codebase_search(
    `What depends on ${target}?`,
    ["server"]
  );
  
  // 2. Rechercher ce dont la cible dépend
  const dependencies = await codebase_search(
    `What does ${target} depend on?`,
    ["server"]
  );
  
  // 3. Analyser impact potentiel
  const impact = analyzeImpact(dependents, dependencies);
  
  return {
    dependents,
    dependencies,
    impact
  };
}
```

## 📊 Optimisation de la Recherche

### 1. Cache de Recherches

**Principe:** Mémoriser les résultats de recherches fréquentes.

**Pattern:**
```typescript
const searchCache = new Map<string, SearchResult>();

async function cachedSearch(
  query: string,
  directories: string[]
): Promise<SearchResult> {
  const cacheKey = `${query}:${directories.join(',')}`;
  
  // Vérifier cache
  if (searchCache.has(cacheKey)) {
    return searchCache.get(cacheKey)!;
  }
  
  // Effectuer recherche
  const result = await codebase_search(query, directories);
  
  // Mettre en cache
  searchCache.set(cacheKey, result);
  
  return result;
}
```

### 2. Recherche Parallèle

**Principe:** Effectuer plusieurs recherches en parallèle pour gagner du temps.

**Pattern:**
```typescript
async function parallelSearch(queries: SearchQuery[]): Promise<SearchResult[]> {
  // Effectuer toutes les recherches en parallèle
  const results = await Promise.all(
    queries.map(query =>
      codebase_search(query.text, query.directories)
    )
  );
  
  return results;
}
```

### 3. Recherche Incrémentale

**Principe:** Affiner progressivement la recherche.

**Pattern:**
```typescript
async function incrementalSearch(topic: string): Promise<SearchResult> {
  // 1. Recherche large
  let results = await codebase_search(topic, ["server"]);
  
  // 2. Affiner par répertoire
  const directories = identifyRelevantDirectories(results);
  results = await codebase_search(topic, directories);
  
  // 3. Affiner par fichier
  const files = identifyRelevantFiles(results);
  const fileResults = await Promise.all(
    files.map(file => read_file(file))
  );
  
  return {
    semantic: results,
    files: fileResults
  };
}
```

## 🎯 Application au Projet Saxium

### Recherches Spécifiques au Projet

**1. Recherche Patterns Route Modulaire**
```typescript
// Rechercher patterns de routes modulaires
codebase_search(
  "How are modular routes structured with factory pattern?",
  ["server/modules"]
);

// Rechercher exemples concrets
grep("export function create.*Router", "server/modules");
```

**2. Recherche Patterns Service**
```typescript
// Rechercher patterns de services
codebase_search(
  "How are services structured with withErrorHandling?",
  ["server/services"]
);

// Rechercher usages
grep("withErrorHandling", "server/services");
```

**3. Recherche Patterns Validation**
```typescript
// Rechercher patterns de validation
codebase_search(
  "How is Zod validation used with validateBody?",
  ["server/middleware", "server/modules"]
);

// Rechercher schemas
grep("z\\.object", "server");
```

**4. Recherche Patterns IA**
```typescript
// Rechercher patterns IA
codebase_search(
  "How are AI services structured and initialized?",
  ["server/services"]
);

// Rechercher usages
grep("getAIService", "server");
```

## 🔗 Références

### Documentation Essentielle
- `@.cursor/rules/agent-optimization.md` - Stratégies d'optimisation
- `@.cursor/rules/context-usage.md` - Utilisation optimale du contexte
- `@.cursor/rules/workflows.md` - Workflows détaillés

### Fichiers de Mémoire
- `@activeContext.md` - État actuel et focus
- `@systemPatterns.md` - Patterns architecturaux
- `@projectbrief.md` - Objectifs et périmètre

---

**Note:** Ces stratégies de recherche contextuelle améliorent significativement la compréhension du codebase et réduisent les erreurs de modification.

