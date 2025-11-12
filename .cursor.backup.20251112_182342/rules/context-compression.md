<!-- 
Context: context-compression, optimization, performance, summarization, semantic-compression
Priority: P1
Auto-load: when context is large, when optimizing performance, when context saturation detected
Dependencies: core.md, quality-principles.md, context-optimization.md, intelligent-preloading.md
Score: 65
-->

# Compression Intelligente du Contexte - Saxium

**Objectif:** Compresser intelligemment le contexte pour réduire la taille sans perte d'information essentielle.

**Référence:** [Cursor Rules Documentation](https://docs.cursor.com/context/rules)  
**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

## 🎯 Principe Fondamental

**IMPÉRATIF:** L'agent DOIT compresser intelligemment le contexte pour réduire la taille sans perte d'information essentielle.

**Bénéfices:**
- ✅ Réduction significative de la taille du contexte
- ✅ Amélioration des performances
- ✅ Évite saturation du contexte
- ✅ Préservation de l'information essentielle

**Référence:** `@.cursor/rules/context-optimization.md` - Gestion intelligente du contexte  
**Référence:** `@.cursor/rules/intelligent-preloading.md` - Préchargement intelligent

## 📋 Règles de Compression Intelligente

### 1. Extraction des Informations Essentielles

**TOUJOURS:**
- ✅ Identifier informations essentielles vs non essentielles
- ✅ Extraire uniquement informations essentielles
- ✅ Préserver structure et relations
- ✅ Éliminer redondances

**Pattern:**
```typescript
// Extraction des informations essentielles
interface EssentialInfo {
  type: 'function' | 'interface' | 'class' | 'constant';
  name: string;
  signature: string;
  description: string;
  dependencies: string[];
  examples?: string[];
}

async function extractEssentialInfo(
  filePath: string,
  context: Context
): Promise<EssentialInfo[]> {
  const code = await read_file(filePath);
  const essential: EssentialInfo[] = [];
  
  // 1. Extraire fonctions publiques
  const publicFunctions = extractPublicFunctions(code);
  publicFunctions.forEach(func => {
    essential.push({
      type: 'function',
      name: func.name,
      signature: func.signature,
      description: func.description || extractDescription(func),
      dependencies: func.dependencies,
      examples: func.examples
    });
  });
  
  // 2. Extraire interfaces/types exportés
  const exportedTypes = extractExportedTypes(code);
  exportedTypes.forEach(type => {
    essential.push({
      type: 'interface',
      name: type.name,
      signature: type.signature,
      description: type.description,
      dependencies: type.dependencies
    });
  });
  
  // 3. Extraire constantes importantes
  const importantConstants = extractImportantConstants(code);
  importantConstants.forEach(constant => {
    essential.push({
      type: 'constant',
      name: constant.name,
      signature: constant.value,
      description: constant.description,
      dependencies: []
    });
  });
  
  return essential;
}
```

### 2. Résumé Automatique des Fichiers Longs

**TOUJOURS:**
- ✅ Résumer fichiers > 500 lignes
- ✅ Préserver structure et API publique
- ✅ Éliminer détails d'implémentation non essentiels
- ✅ Conserver exemples et documentation

**Pattern:**
```typescript
// Résumé automatique des fichiers longs
async function summarizeLongFile(
  filePath: string,
  maxLines: number = 200
): Promise<FileSummary> {
  const code = await read_file(filePath);
  const lines = code.split('\n');
  
  // Si fichier court, pas besoin de résumer
  if (lines.length <= maxLines) {
    return {
      original: code,
      summarized: code,
      compressionRatio: 1.0
    };
  }
  
  // 1. Extraire informations essentielles
  const essential = await extractEssentialInfo(filePath, {});
  
  // 2. Générer résumé structuré
  const summary = generateStructuredSummary(essential, code);
  
  // 3. Calculer ratio de compression
  const compressionRatio = summary.length / code.length;
  
  return {
    original: code,
    summarized: summary,
    compressionRatio,
    essentialInfo: essential
  };
}

function generateStructuredSummary(
  essential: EssentialInfo[],
  originalCode: string
): string {
  let summary = `// Résumé compressé du fichier\n\n`;
  
  // 1. En-tête avec métadonnées
  summary += `// Fichier: ${extractFilePath(originalCode)}\n`;
  summary += `// Lignes originales: ${originalCode.split('\n').length}\n`;
  summary += `// Lignes résumées: ${essential.length}\n\n`;
  
  // 2. Résumer chaque élément essentiel
  essential.forEach(info => {
    summary += `// ${info.type.toUpperCase()}: ${info.name}\n`;
    summary += `${info.signature}\n`;
    if (info.description) {
      summary += `// ${info.description}\n`;
    }
    if (info.dependencies.length > 0) {
      summary += `// Dépendances: ${info.dependencies.join(', ')}\n`;
    }
    if (info.examples && info.examples.length > 0) {
      summary += `// Exemple:\n${info.examples[0]}\n`;
    }
    summary += '\n';
  });
  
  return summary;
}
```

### 3. Compression Sémantique

**TOUJOURS:**
- ✅ Compresser code en préservant sémantique
- ✅ Éliminer commentaires redondants
- ✅ Simplifier expressions complexes
- ✅ Préserver logique métier

**Pattern:**
```typescript
// Compression sémantique
async function compressSemantically(
  code: string,
  context: Context
): Promise<CompressedCode> {
  // 1. Analyser structure sémantique
  const semanticStructure = analyzeSemanticStructure(code);
  
  // 2. Identifier redondances
  const redundancies = identifyRedundancies(semanticStructure);
  
  // 3. Compresser redondances
  let compressed = code;
  redundancies.forEach(redundancy => {
    compressed = compressRedundancy(compressed, redundancy);
  });
  
  // 4. Simplifier expressions complexes
  compressed = simplifyComplexExpressions(compressed);
  
  // 5. Éliminer commentaires redondants
  compressed = removeRedundantComments(compressed);
  
  return {
    original: code,
    compressed,
    compressionRatio: compressed.length / code.length,
    preservedSemantics: validateSemanticPreservation(code, compressed)
  };
}
```

### 4. Éviction Intelligente du Contexte

**TOUJOURS:**
- ✅ Identifier fichiers non essentiels dans contexte
- ✅ Éviter fichiers selon pertinence
- ✅ Conserver fichiers essentiels
- ✅ Rééquilibrer contexte si nécessaire

**Pattern:**
```typescript
// Éviction intelligente du contexte
async function evictContextIntelligently(
  currentContext: Context,
  maxSize: number,
  task: Task
): Promise<OptimizedContext> {
  // 1. Calculer taille actuelle
  const currentSize = calculateContextSize(currentContext);
  
  // 2. Si taille OK, pas besoin d'éviction
  if (currentSize <= maxSize) {
    return {
      context: currentContext,
      evicted: [],
      optimized: false
    };
  }
  
  // 3. Identifier fichiers à évincer
  const filesToEvict = identifyFilesToEvict(
    currentContext.files,
    task,
    currentSize - maxSize
  );
  
  // 4. Éviter fichiers non essentiels
  const optimizedContext = {
    ...currentContext,
    files: currentContext.files.filter(
      f => !filesToEvict.includes(f.path)
    )
  };
  
  return {
    context: optimizedContext,
    evicted: filesToEvict,
    optimized: true,
    sizeReduction: currentSize - calculateContextSize(optimizedContext)
  };
}
```

## 🔄 Workflow de Compression Intelligente

### Workflow: Compresser Contexte Intelligemment

**Étapes:**
1. Analyser taille et contenu du contexte
2. Extraire informations essentielles
3. Résumer fichiers longs
4. Compresser sémantiquement
5. Éviter fichiers non essentiels
6. Valider préservation de l'information

**Pattern:**
```typescript
async function compressContextIntelligently(
  context: Context,
  maxSize: number,
  task: Task
): Promise<CompressedContext> {
  // 1. Analyser contexte
  const analysis = analyzeContext(context);
  
  // 2. Si contexte petit, pas besoin de compression
  if (analysis.size <= maxSize) {
    return {
      context,
      compressed: false,
      compressionRatio: 1.0
    };
  }
  
  // 3. Extraire informations essentielles
  const essential = await extractEssentialInfoFromContext(context, task);
  
  // 4. Résumer fichiers longs
  const summarized = await Promise.all(
    context.files.map(async file => {
      if (file.lines > 500) {
        return await summarizeLongFile(file.path);
      }
      return { original: file.content, summarized: file.content };
    })
  );
  
  // 5. Compresser sémantiquement
  const compressed = await Promise.all(
    summarized.map(s => compressSemantically(s.summarized, context))
  );
  
  // 6. Éviter fichiers non essentiels
  const evicted = await evictContextIntelligently(
    { ...context, files: compressed },
    maxSize,
    task
  );
  
  return {
    context: evicted.context,
    compressed: true,
    compressionRatio: calculateCompressionRatio(context, evicted.context),
    evicted: evicted.evicted
  };
}
```

## ⚠️ Règles de Compression Intelligente

### Ne Jamais:

**BLOQUANT:**
- ❌ Perdre information essentielle lors compression
- ❌ Compresser fichiers critiques sans précaution
- ❌ Ignorer structure et relations
- ❌ Compresser au-delà de la limite de perte acceptable

**TOUJOURS:**
- ✅ Extraire informations essentielles
- ✅ Résumer fichiers longs intelligemment
- ✅ Préserver sémantique lors compression
- ✅ Valider préservation de l'information
- ✅ Éviter fichiers non essentiels

## 📊 Checklist Compression Intelligente

### Avant Compression

- [ ] Analyser taille et contenu du contexte
- [ ] Identifier informations essentielles
- [ ] Détecter fichiers longs à résumer

### Pendant Compression

- [ ] Extraire informations essentielles
- [ ] Résumer fichiers longs
- [ ] Compresser sémantiquement
- [ ] Éviter fichiers non essentiels

### Après Compression

- [ ] Valider préservation de l'information
- [ ] Vérifier taille du contexte compressé
- [ ] Documenter compression effectuée

## 🔗 Références

- `@.cursor/rules/context-optimization.md` - Gestion intelligente du contexte
- `@.cursor/rules/intelligent-preloading.md` - Préchargement intelligent
- `@.cursor/rules/performance.md` - Optimisations performance

---

**Note:** Cette règle garantit que le contexte est compressé intelligemment pour réduire la taille sans perte d'information essentielle.

**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

