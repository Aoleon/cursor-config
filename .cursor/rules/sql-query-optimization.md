# Optimisation Requêtes SQL - Saxium

**Objectif:** Détecter et optimiser automatiquement les requêtes SQL lentes pour améliorer les performances.

## 🎯 Principe Fondamental

**IMPÉRATIF:** L'agent DOIT détecter et optimiser les requêtes SQL lentes avant qu'elles ne causent des problèmes de performance.

**Bénéfices:**
- ✅ Réduction latence requêtes SQL (> 20s → < 2s)
- ✅ Détection proactive requêtes N+1
- ✅ Optimisation automatique index
- ✅ Amélioration performance globale

## 📊 Détection Requêtes Lentes

### 1. Identification Requêtes > 20s

**TOUJOURS:**
- ✅ Détecter requêtes SQL avec durée > 20s
- ✅ Analyser plan d'exécution
- ✅ Identifier bottlenecks (scans séquentiels, jointures coûteuses)
- ✅ Proposer optimisations

**Pattern:**
```typescript
// Détecter requêtes lentes
async function detectSlowQueries(query: string, duration: number) {
  if (duration > 20000) { // > 20s
    const analysis = {
      query,
      duration,
      issues: [],
      optimizations: []
    };
    
    // Analyser plan d'exécution
    const explainPlan = await explainQuery(query);
    
    // Identifier problèmes
    if (explainPlan.hasSeqScan) {
      analysis.issues.push('Scan séquentiel détecté');
      analysis.optimizations.push('Créer index sur colonnes filtrées');
    }
    
    if (explainPlan.hasNestedLoop) {
      analysis.issues.push('Boucle imbriquée coûteuse');
      analysis.optimizations.push('Optimiser jointure ou créer index');
    }
    
    return analysis;
  }
}
```

### 2. Détection Requêtes N+1

**TOUJOURS:**
- ✅ Détecter patterns N+1 dans code
- ✅ Identifier boucles avec requêtes DB
- ✅ Proposer eager loading ou batch loading
- ✅ Optimiser avec JOIN ou IN queries

**Pattern:**
```typescript
// Détecter requêtes N+1
function detectNPlusOneQueries(code: string) {
  const issues = [];
  
  // Pattern: boucle avec requête DB
  const loopPattern = /for\s*\([^)]+\)\s*\{[^}]*await\s+.*\.(find|findOne|query)/;
  
  if (loopPattern.test(code)) {
    issues.push({
      type: 'N+1',
      location: findLocation(code, loopPattern),
      suggestion: 'Utiliser eager loading ou batch query'
    });
  }
  
  return issues;
}
```

### 3. Analyse Index Manquants

**TOUJOURS:**
- ✅ Analyser colonnes utilisées dans WHERE
- ✅ Analyser colonnes utilisées dans JOIN
- ✅ Identifier index manquants
- ✅ Proposer création index

**Pattern:**
```typescript
// Analyser index manquants
async function analyzeMissingIndexes(query: string) {
  const whereColumns = extractWhereColumns(query);
  const joinColumns = extractJoinColumns(query);
  
  const existingIndexes = await getExistingIndexes();
  const missingIndexes = [];
  
  for (const column of [...whereColumns, ...joinColumns]) {
    if (!hasIndex(existingIndexes, column)) {
      missingIndexes.push({
        table: column.table,
        column: column.name,
        type: 'btree', // ou 'gin', 'gist' selon type
        suggestion: `CREATE INDEX idx_${column.table}_${column.name} ON ${column.table}(${column.name})`
      });
    }
  }
  
  return missingIndexes;
}
```

## 🔧 Optimisations Automatiques

### 1. Création Index Automatique

**TOUJOURS:**
- ✅ Créer index sur colonnes filtrées fréquemment
- ✅ Créer index composite pour requêtes multi-colonnes
- ✅ Utiliser index partiels si applicable
- ✅ Documenter index créés

**Pattern:**
```typescript
// Créer index automatiquement
async function createIndexAutomatically(missingIndex: MissingIndex) {
  const migration = {
    up: `CREATE INDEX ${missingIndex.name} ON ${missingIndex.table}(${missingIndex.columns.join(', ')})`,
    down: `DROP INDEX ${missingIndex.name}`
  };
  
  // Créer migration Drizzle
  await createMigration(migration);
  
  logger.info(`Index créé: ${missingIndex.name}`);
}
```

### 2. Optimisation Requêtes

**TOUJOURS:**
- ✅ Remplacer scans séquentiels par index scans
- ✅ Optimiser jointures (INNER vs LEFT)
- ✅ Utiliser LIMIT pour pagination
- ✅ Éviter SELECT * (sélectionner colonnes nécessaires)

**Pattern:**
```typescript
// Optimiser requête
function optimizeQuery(query: string, analysis: QueryAnalysis) {
  let optimized = query;
  
  // Remplacer SELECT * par colonnes spécifiques
  if (query.includes('SELECT *')) {
    const columns = extractNeededColumns(query);
    optimized = optimized.replace('SELECT *', `SELECT ${columns.join(', ')}`);
  }
  
  // Ajouter LIMIT si manquant
  if (!query.includes('LIMIT') && analysis.isListQuery) {
    optimized += ' LIMIT 100';
  }
  
  // Optimiser jointures
  if (analysis.hasExpensiveJoin) {
    optimized = optimizeJoin(optimized);
  }
  
  return optimized;
}
```

### 3. Eager Loading

**TOUJOURS:**
- ✅ Détecter relations chargées dans boucles
- ✅ Utiliser eager loading (with, include)
- ✅ Utiliser batch loading pour collections
- ✅ Éviter requêtes N+1

**Pattern:**
```typescript
// Optimiser avec eager loading
async function optimizeWithEagerLoading(originalCode: string) {
  // Détecter pattern N+1
  const nPlusOne = detectNPlusOneQueries(originalCode);
  
  if (nPlusOne.length > 0) {
    // Remplacer par eager loading
    const optimized = originalCode.replace(
      /for\s*\([^)]+\)\s*\{[^}]*await\s+.*\.find/,
      'const items = await db.query(...).with(relations)'
    );
    
    return optimized;
  }
  
  return originalCode;
}
```

## 📈 Validation Performance

### 1. Benchmark Requêtes

**TOUJOURS:**
- ✅ Mesurer durée avant optimisation
- ✅ Mesurer durée après optimisation
- ✅ Vérifier amélioration > 50%
- ✅ Documenter résultats

**Pattern:**
```typescript
// Benchmark requête
async function benchmarkQuery(query: string, optimized: string) {
  const before = await measureQuery(query);
  const after = await measureQuery(optimized);
  
  const improvement = ((before.duration - after.duration) / before.duration) * 100;
  
  return {
    before: before.duration,
    after: after.duration,
    improvement: `${improvement.toFixed(1)}%`,
    success: improvement > 50
  };
}
```

### 2. Vérification Index

**TOUJOURS:**
- ✅ Vérifier index utilisé dans EXPLAIN
- ✅ Vérifier index scan vs seq scan
- ✅ Vérifier coût réduit
- ✅ Valider amélioration

**Pattern:**
```typescript
// Vérifier utilisation index
async function verifyIndexUsage(query: string, indexName: string) {
  const explain = await explainQuery(query);
  
  return {
    usesIndex: explain.plan.includes(indexName),
    scanType: explain.scanType, // 'Index Scan' vs 'Seq Scan'
    cost: explain.cost,
    rows: explain.rows
  };
}
```

## 🎯 Règles Spécifiques

### Requêtes avec WHERE

**TOUJOURS:**
- ✅ Vérifier index sur colonnes WHERE
- ✅ Utiliser index composite si plusieurs colonnes
- ✅ Éviter fonctions sur colonnes indexées

### Requêtes avec JOIN

**TOUJOURS:**
- ✅ Vérifier index sur colonnes JOIN
- ✅ Utiliser INNER JOIN si possible (plus rapide)
- ✅ Éviter CROSS JOIN

### Requêtes avec ORDER BY

**TOUJOURS:**
- ✅ Vérifier index sur colonnes ORDER BY
- ✅ Utiliser index composite (WHERE + ORDER BY)
- ✅ Éviter ORDER BY sur colonnes non indexées

### Requêtes avec GROUP BY

**TOUJOURS:**
- ✅ Vérifier index sur colonnes GROUP BY
- ✅ Utiliser index composite si possible
- ✅ Considérer index partiel si filtres fréquents

## 🔗 Intégration

### Règles Associées

- `performance.md` - Optimisations performance générales
- `database.md` - Patterns base de données
- `auto-performance-detection.md` - Détection performance

### Documentation

- `docs/project/activeContext.md` - Problèmes identifiés
- `docs/AGENT-METRICS.md` - Métriques performance

## ✅ Checklist

**Avant création/modification requête SQL:**
- [ ] Analyser colonnes utilisées (WHERE, JOIN, ORDER BY)
- [ ] Vérifier index existants
- [ ] Identifier requêtes N+1 potentielles
- [ ] Proposer optimisations

**Pendant optimisation:**
- [ ] Créer index si nécessaire
- [ ] Optimiser requête (éviter SELECT *, ajouter LIMIT)
- [ ] Utiliser eager loading si applicable
- [ ] Documenter changements

**Après optimisation:**
- [ ] Benchmark avant/après
- [ ] Vérifier utilisation index
- [ ] Valider amélioration > 50%
- [ ] Documenter résultats

---

**Référence:** `@docs/project/activeContext.md` - Problèmes SQL lentes identifiés

