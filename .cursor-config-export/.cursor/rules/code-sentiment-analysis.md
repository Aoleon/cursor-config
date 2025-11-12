<!-- 
Context: code-quality, sentiment-analysis, quality-metrics, code-smell, maintainability
Priority: P1
Auto-load: when analyzing code quality, when evaluating code, when improving maintainability
Dependencies: core.md, quality-principles.md, code-quality.md, auto-refactoring.md
Score: 60
-->

# Analyse de Sentiment du Code - Saxium

**Objectif:** Analyser le sentiment et la qualité du code généré pour évaluer automatiquement sa qualité et détecter les code smells.

**Référence:** [Cursor Rules Documentation](https://docs.cursor.com/context/rules)  
**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

## 🎯 Principe Fondamental

**IMPÉRATIF:** L'agent DOIT analyser le sentiment et la qualité du code généré pour évaluer automatiquement sa qualité et détecter les code smells.

**Bénéfices:**
- ✅ Évaluation automatique de la qualité
- ✅ Détection automatique des code smells
- ✅ Recommandations d'amélioration
- ✅ Métriques de qualité objectives

**Référence:** `@.cursor/rules/code-quality.md` - Standards qualité code  
**Référence:** `@.cursor/rules/auto-refactoring.md` - Auto-refactoring intelligent

## 📋 Règles d'Analyse de Sentiment

### 1. Score de Qualité Automatique

**TOUJOURS:**
- ✅ Calculer score de qualité pour code généré
- ✅ Évaluer selon multiples critères
- ✅ Générer score global (0-100)
- ✅ Détecter code de qualité insuffisante

**Pattern:**
```typescript
// Score de qualité automatique
interface QualityScore {
  overall: number; // 0-100
  maintainability: number; // 0-100
  readability: number; // 0-100
  performance: number; // 0-100
  testability: number; // 0-100
  security: number; // 0-100
  factors: QualityFactor[];
}

async function calculateQualityScore(
  code: string,
  filePath: string,
  context: Context
): Promise<QualityScore> {
  // 1. Analyser maintenabilité
  const maintainability = await analyzeMaintainability(code, filePath, context);
  
  // 2. Analyser lisibilité
  const readability = await analyzeReadability(code, filePath, context);
  
  // 3. Analyser performance
  const performance = await analyzePerformance(code, filePath, context);
  
  // 4. Analyser testabilité
  const testability = await analyzeTestability(code, filePath, context);
  
  // 5. Analyser sécurité
  const security = await analyzeSecurity(code, filePath, context);
  
  // 6. Calculer score global (moyenne pondérée)
  const overall = (
    maintainability.score * 0.3 +
    readability.score * 0.25 +
    performance.score * 0.2 +
    testability.score * 0.15 +
    security.score * 0.1
  );
  
  return {
    overall: Math.round(overall),
    maintainability: maintainability.score,
    readability: readability.score,
    performance: performance.score,
    testability: testability.score,
    security: security.score,
    factors: [
      ...maintainability.factors,
      ...readability.factors,
      ...performance.factors,
      ...testability.factors,
      ...security.factors
    ]
  };
}
```

### 2. Détection de Code Smell

**TOUJOURS:**
- ✅ Détecter code smells automatiquement
- ✅ Classifier types de code smells
- ✅ Évaluer sévérité de chaque smell
- ✅ Recommander corrections

**Pattern:**
```typescript
// Détection de code smell
interface CodeSmell {
  type: 'long-method' | 'large-class' | 'duplicate-code' | 'complex-condition' | 'magic-number' | 'dead-code';
  severity: 'low' | 'medium' | 'high' | 'critical';
  location: string;
  description: string;
  recommendation: string;
}

async function detectCodeSmells(
  code: string,
  filePath: string,
  context: Context
): Promise<CodeSmell[]> {
  const smells: CodeSmell[] = [];
  
  // 1. Détecter méthodes longues (> 50 lignes)
  const longMethods = detectLongMethods(code);
  longMethods.forEach(method => {
    smells.push({
      type: 'long-method',
      severity: method.lines > 100 ? 'high' : 'medium',
      location: method.location,
      description: `Méthode trop longue: ${method.lines} lignes`,
      recommendation: 'Extraire en sous-méthodes ou refactoriser'
    });
  });
  
  // 2. Détecter classes larges (> 500 lignes)
  const largeClasses = detectLargeClasses(code);
  largeClasses.forEach(cls => {
    smells.push({
      type: 'large-class',
      severity: cls.lines > 1000 ? 'critical' : 'high',
      location: cls.location,
      description: `Classe trop large: ${cls.lines} lignes`,
      recommendation: 'Diviser en plusieurs classes ou modules'
    });
  });
  
  // 3. Détecter code dupliqué
  const duplicates = await detectDuplicatedCode([code], context);
  duplicates.forEach(dup => {
    smells.push({
      type: 'duplicate-code',
      severity: dup.similarity > 0.9 ? 'high' : 'medium',
      location: dup.location,
      description: `Code dupliqué détecté (similarité: ${dup.similarity})`,
      recommendation: 'Extraire en fonction commune'
    });
  });
  
  // 4. Détecter conditions complexes
  const complexConditions = detectComplexConditions(code);
  complexConditions.forEach(condition => {
    smells.push({
      type: 'complex-condition',
      severity: condition.complexity > 5 ? 'high' : 'medium',
      location: condition.location,
      description: `Condition trop complexe (complexité: ${condition.complexity})`,
      recommendation: 'Simplifier ou extraire en fonction'
    });
  });
  
  // 5. Détecter nombres magiques
  const magicNumbers = detectMagicNumbers(code);
  magicNumbers.forEach(number => {
    smells.push({
      type: 'magic-number',
      severity: 'low',
      location: number.location,
      description: `Nombre magique détecté: ${number.value}`,
      recommendation: 'Extraire en constante nommée'
    });
  });
  
  // 6. Détecter code mort
  const deadCode = detectDeadCode(code, filePath, context);
  deadCode.forEach(dead => {
    smells.push({
      type: 'dead-code',
      severity: 'low',
      location: dead.location,
      description: `Code mort détecté: ${dead.description}`,
      recommendation: 'Supprimer code inutilisé'
    });
  });
  
  return smells;
}
```

### 3. Recommandations d'Amélioration

**TOUJOURS:**
- ✅ Générer recommandations basées sur analyse
- ✅ Prioriser recommandations selon impact
- ✅ Proposer corrections concrètes
- ✅ Documenter recommandations

**Pattern:**
```typescript
// Recommandations d'amélioration
async function generateImprovementRecommendations(
  qualityScore: QualityScore,
  codeSmells: CodeSmell[],
  context: Context
): Promise<ImprovementRecommendation[]> {
  const recommendations: ImprovementRecommendation[] = [];
  
  // 1. Recommandations basées sur score de qualité
  if (qualityScore.overall < 70) {
    recommendations.push({
      type: 'quality-improvement',
      priority: 'high',
      message: `Score de qualité faible: ${qualityScore.overall}/100`,
      action: 'improve-overall-quality',
      expectedImprovement: `Améliorer score à ${qualityScore.overall + 20}+`
    });
  }
  
  // 2. Recommandations basées sur code smells critiques
  codeSmells
    .filter(smell => smell.severity === 'critical' || smell.severity === 'high')
    .forEach(smell => {
      recommendations.push({
        type: 'code-smell-fix',
        priority: smell.severity === 'critical' ? 'critical' : 'high',
        message: `Code smell détecté: ${smell.type}`,
        action: smell.recommendation,
        expectedImprovement: `Éliminer code smell: ${smell.type}`
      });
    });
  
  // 3. Recommandations spécifiques par facteur
  qualityScore.factors
    .filter(factor => factor.score < 70)
    .forEach(factor => {
      recommendations.push({
        type: 'factor-improvement',
        priority: 'medium',
        message: `Améliorer ${factor.name}: ${factor.score}/100`,
        action: `improve-${factor.name}`,
        expectedImprovement: `Améliorer ${factor.name} à 80+`
      });
    });
  
  return recommendations.sort((a, b) => 
    getPriorityScore(b.priority) - getPriorityScore(a.priority)
  );
}
```

## 🔄 Workflow d'Analyse de Sentiment

### Workflow: Analyser Sentiment du Code

**Étapes:**
1. Calculer score de qualité
2. Détecter code smells
3. Générer recommandations
4. Prioriser améliorations
5. Documenter analyse

**Pattern:**
```typescript
async function analyzeCodeSentiment(
  code: string,
  filePath: string,
  context: Context
): Promise<CodeSentimentAnalysis> {
  // 1. Calculer score de qualité
  const qualityScore = await calculateQualityScore(code, filePath, context);
  
  // 2. Détecter code smells
  const codeSmells = await detectCodeSmells(code, filePath, context);
  
  // 3. Générer recommandations
  const recommendations = await generateImprovementRecommendations(
    qualityScore,
    codeSmells,
    context
  );
  
  // 4. Calculer sentiment global
  const sentiment = calculateSentiment(qualityScore, codeSmells);
  
  return {
    qualityScore,
    codeSmells,
    recommendations,
    sentiment,
    shouldImprove: qualityScore.overall < 70 || codeSmells.some(s => s.severity === 'critical')
  };
}
```

## ⚠️ Règles d'Analyse de Sentiment

### Ne Jamais:

**BLOQUANT:**
- ❌ Ignorer code smells détectés
- ❌ Ne pas générer recommandations pour code de qualité faible
- ❌ Ne pas documenter analyse
- ❌ Ne pas prioriser améliorations

**TOUJOURS:**
- ✅ Calculer score de qualité automatiquement
- ✅ Détecter code smells
- ✅ Générer recommandations d'amélioration
- ✅ Prioriser selon impact
- ✅ Documenter analyse complète

## 📊 Checklist Analyse de Sentiment

### Avant Analyse

- [ ] Préparer analyse de qualité
- [ ] Configurer détection de code smells
- [ ] Charger patterns de qualité

### Pendant Analyse

- [ ] Calculer score de qualité
- [ ] Détecter code smells
- [ ] Générer recommandations

### Après Analyse

- [ ] Documenter résultats
- [ ] Prioriser améliorations
- [ ] Appliquer améliorations si nécessaire

## 🔗 Références

- `@.cursor/rules/code-quality.md` - Standards qualité code
- `@.cursor/rules/auto-refactoring.md` - Auto-refactoring intelligent
- `@.cursor/rules/quality-principles.md` - Principes de qualité

---

**Note:** Cette règle garantit que le code est analysé automatiquement pour évaluer sa qualité et détecter les code smells.

**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

