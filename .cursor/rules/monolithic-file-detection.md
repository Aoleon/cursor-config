# Détection Fichiers Monolithiques - Saxium

**Objectif:** Détecter les fichiers monolithiques (> 1000 lignes) et suggérer automatiquement un refactoring pour améliorer la maintenabilité.

## 🎯 Principe Fondamental

**IMPÉRATIF:** L'agent DOIT détecter les fichiers monolithiques et suggérer un refactoring pour améliorer la maintenabilité.

**Bénéfices:**
- ✅ Amélioration maintenabilité
- ✅ Réduction complexité
- ✅ Code plus modulaire
- ✅ Tests plus faciles

## 📊 Détection Fichiers Monolithiques

### 1. Identification Fichiers > 1000 Lignes

**TOUJOURS:**
- ✅ Détecter fichiers > 1000 lignes
- ✅ Analyser structure (classes, méthodes)
- ✅ Identifier responsabilités multiples
- ✅ Proposer refactoring

**Pattern:**
```typescript
// Détecter fichiers monolithiques
function detectMonolithicFiles(files: string[]): MonolithicFile[] {
  const monolithic: MonolithicFile[] = [];
  
  for (const file of files) {
    const lines = countLines(file);
    if (lines > 1000) {
      const analysis = analyzeFileStructure(file);
      monolithic.push({
        file,
        lines,
        classes: analysis.classes,
        methods: analysis.methods,
        responsibilities: analysis.responsibilities,
        refactoringSuggestions: generateRefactoringSuggestions(analysis)
      });
    }
  }
  
  return monolithic;
}
```

### 2. Analyse Structure

**TOUJOURS:**
- ✅ Compter classes et méthodes
- ✅ Identifier responsabilités
- ✅ Détecter code dupliqué
- ✅ Identifier dépendances

**Pattern:**
```typescript
// Analyser structure fichier
function analyzeFileStructure(file: string): FileAnalysis {
  const code = readFile(file);
  
  return {
    lines: countLines(code),
    classes: extractClasses(code),
    methods: extractMethods(code),
    responsibilities: identifyResponsibilities(code),
    duplicatedCode: detectDuplications(code),
    dependencies: extractDependencies(code)
  };
}
```

## 🔧 Suggestions Refactoring

### 1. Extraction Classes

**TOUJOURS:**
- ✅ Identifier classes avec > 500 lignes
- ✅ Suggérer extraction méthodes
- ✅ Suggérer extraction services
- ✅ Proposer structure modulaire

**Pattern:**
```typescript
// Suggérer extraction
function suggestClassExtraction(analysis: FileAnalysis): RefactoringSuggestion[] {
  const suggestions: RefactoringSuggestion[] = [];
  
  for (const cls of analysis.classes) {
    if (cls.lines > 500) {
      // Identifier méthodes à extraire
      const methodsToExtract = cls.methods.filter(m => m.lines > 50);
      
      suggestions.push({
        type: 'extract-class',
        target: cls.name,
        methods: methodsToExtract,
        newClass: `${cls.name}Helper`,
        estimatedReduction: calculateReduction(methodsToExtract)
      });
    }
  }
  
  return suggestions;
}
```

### 2. Extraction Services

**TOUJOURS:**
- ✅ Identifier responsabilités multiples
- ✅ Suggérer extraction services
- ✅ Proposer structure modulaire
- ✅ Documenter dépendances

**Pattern:**
```typescript
// Suggérer extraction service
function suggestServiceExtraction(analysis: FileAnalysis): RefactoringSuggestion[] {
  const suggestions: RefactoringSuggestion[] = [];
  
  // Identifier responsabilités
  const responsibilities = identifyResponsibilities(analysis);
  
  if (responsibilities.length > 3) {
    // Suggérer extraction services
    for (const responsibility of responsibilities.slice(1)) {
      suggestions.push({
        type: 'extract-service',
        responsibility,
        methods: getMethodsForResponsibility(analysis, responsibility),
        newService: `${responsibility}Service`,
        estimatedReduction: calculateReduction(getMethodsForResponsibility(analysis, responsibility))
      });
    }
  }
  
  return suggestions;
}
```

## 📈 Fichiers Monolithiques Identifiés

### Fichiers > 2000 Lignes

1. **PredictiveEngineService.ts** - 2763 lignes
   - Responsabilités: Prédictions revenus, risques, délais
   - Suggestion: Extraire en services séparés

2. **DateAlertDetectionService.ts** - 2167 lignes
   - Responsabilités: Détection retards, conflits, échéances, optimisations
   - Suggestion: Extraire en services séparés

3. **ChatbotOrchestrationService.ts** - 3552 lignes
   - Responsabilités: Orchestration chatbot, contexte, SQL
   - Suggestion: Extraire en services séparés

### Fichiers > 1000 Lignes

4. **ContextBuilderService.ts** - 2322 lignes
   - Responsabilités: Construction contexte, compression, validation
   - Suggestion: Extraire en services séparés

5. **StorageFacade.ts** - 3993 lignes
   - Responsabilités: Facade storage, délégation, cache
   - Suggestion: Extraire en repositories séparés

## 🎯 Stratégies Refactoring

### 1. Extraction Progressive

**TOUJOURS:**
- ✅ Extraire une responsabilité à la fois
- ✅ Tester après chaque extraction
- ✅ Valider pas de régression
- ✅ Documenter extraction

### 2. Structure Modulaire

**TOUJOURS:**
- ✅ Créer structure `services/{domain}/`
- ✅ Extraire services par domaine
- ✅ Maintenir interfaces claires
- ✅ Documenter dépendances

### 3. Tests Accompagnants

**TOUJOURS:**
- ✅ Créer tests pour services extraits
- ✅ Valider fonctionnalité préservée
- ✅ Vérifier pas de régression
- ✅ Documenter tests

## 🔗 Intégration

### Règles Associées

- `similar-code-detection.md` - Détection code similaire
- `migration-refactoring-manager.md` - Gestion refactoring
- `code-quality.md` - Standards qualité code

### Documentation

- `docs/architecture/SERVICES_CONSOLIDATION_AUDIT.md` - Audit services

## ✅ Checklist

**Détection:**
- [ ] Identifier fichiers > 1000 lignes
- [ ] Analyser structure et responsabilités
- [ ] Identifier code dupliqué
- [ ] Générer suggestions refactoring

**Refactoring:**
- [ ] Extraire une responsabilité à la fois
- [ ] Créer services/repositories séparés
- [ ] Tester après extraction
- [ ] Documenter changements

**Validation:**
- [ ] Vérifier pas de régression
- [ ] Valider tests passent
- [ ] Documenter structure finale

---

**Référence:** Fichiers monolithiques identifiés (PredictiveEngineService, DateAlertDetectionService, etc.)

