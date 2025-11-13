# Recherche Systématique de Cause Racine - Saxium

**Objectif:** Systématiser la recherche de cause racine et sa résolution pour éviter corrections superficielles et problèmes récurrents.

**Référence:** [Cursor Rules Documentation](https://docs.cursor.com/context/rules)  
**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

## 🎯 Principe Fondamental

**IMPÉRATIF:** L'agent DOIT systématiquement rechercher la cause racine de tout problème avant de le corriger, et valider que la cause identifiée est correcte.

**Problème identifié:** L'agent traite souvent les symptômes au lieu des causes, ce qui entraîne des corrections inefficaces et des problèmes récurrents.

**Solution:** Méthodologie systématique de recherche cause racine avec validation et documentation.

**Bénéfices:**
- ✅ Corrections ciblent causes racines (plus efficaces)
- ✅ Réduction problèmes récurrents
- ✅ Amélioration continue basée sur apprentissages
- ✅ Base de connaissances causes et solutions

**Référence:** `@.cursor/rules/error-recovery.md` - Récupération automatique après erreurs  
**Référence:** `@.cursor/rules/learning-memory.md` - Mémoire persistante des apprentissages  
**Référence:** `@.cursor/rules/troubleshooting.md` - Guide troubleshooting

## 📋 Méthodologie de Recherche Cause Racine

### 1. Collecte d'Informations Complètes

**IMPÉRATIF:** Collecter toutes les informations nécessaires avant d'analyser la cause.

**TOUJOURS:**
- ✅ Collecter message d'erreur complet (stack trace, contexte)
- ✅ Collecter logs pertinents (avant, pendant, après erreur)
- ✅ Collecter contexte d'exécution (fichiers modifiés, dépendances)
- ✅ Collecter historique récent (changements, déploiements)
- ✅ Collecter métriques (performance, utilisation ressources)
- ✅ Chercher causes similaires dans mémoire passée

**Pattern:**
```typescript
// Collecte d'informations complètes
interface ProblemContext {
  error: Error;
  errorMessage: string;
  stackTrace: string;
  logs: LogEntry[];
  recentChanges: Change[];
  context: ExecutionContext;
  metrics: Metrics;
  similarProblems: SimilarProblem[];
}

async function collectProblemContext(
  error: Error,
  context: Context
): Promise<ProblemContext> {
  // 1. Collecter erreur complète
  const errorMessage = error.message;
  const stackTrace = error.stack || '';
  
  // 2. Collecter logs pertinents
  const logs = await collectRelevantLogs(error, context, {
    before: 5 * 60 * 1000, // 5 minutes avant
    after: 2 * 60 * 1000    // 2 minutes après
  });
  
  // 3. Collecter changements récents
  const recentChanges = await collectRecentChanges(context, {
    timeframe: 24 * 60 * 60 * 1000 // 24 heures
  });
  
  // 4. Collecter contexte d'exécution
  const executionContext = await collectExecutionContext(context);
  
  // 5. Collecter métriques
  const metrics = await collectMetrics(context, {
    timeframe: 1 * 60 * 60 * 1000 // 1 heure
  });
  
  // 6. Chercher problèmes similaires dans mémoire
  const similarProblems = await searchSimilarProblems(error, context);
  
  return {
    error,
    errorMessage,
    stackTrace,
    logs,
    recentChanges,
    context: executionContext,
    metrics,
    similarProblems
  };
}
```

### 2. Méthode 5 Why (Pourquoi en Profondeur)

**IMPÉRATIF:** Utiliser la méthode 5 Why pour analyser en profondeur jusqu'à la cause racine.

**TOUJOURS:**
- ✅ Poser "Pourquoi ?" minimum 3 fois (idéalement 5)
- ✅ Ne pas s'arrêter à la première cause trouvée
- ✅ Valider chaque niveau avant de continuer
- ✅ Documenter chaque niveau d'analyse

**Pattern:**
```typescript
// Méthode 5 Why
interface WhyAnalysis {
  level: number;
  question: string;
  answer: string;
  validated: boolean;
  nextLevel?: WhyAnalysis;
}

async function analyzeWith5Why(
  problem: Problem,
  context: ProblemContext
): Promise<WhyAnalysis> {
  const analysis: WhyAnalysis[] = [];
  let currentLevel = 1;
  let currentProblem = problem;
  
  // 1. Analyser jusqu'à cause racine (minimum 3 niveaux, idéalement 5)
  while (currentLevel <= 5) {
    // 2. Poser question "Pourquoi ?"
    const question = `Pourquoi ${currentProblem.description} ?`;
    
    // 3. Analyser cause possible
    const answer = await analyzeWhy(currentProblem, context, analysis);
    
    // 4. Valider cause identifiée
    const validated = await validateCause(answer, context);
    
    // 5. Documenter niveau
    const levelAnalysis: WhyAnalysis = {
      level: currentLevel,
      question,
      answer,
      validated
    };
    
    analysis.push(levelAnalysis);
    
    // 6. Si cause racine trouvée (pas de cause sous-jacente), arrêter
    if (isRootCause(answer, context)) {
      break;
    }
    
    // 7. Passer au niveau suivant
    currentProblem = {
      description: answer,
      type: currentProblem.type,
      context: context
    };
    currentLevel++;
  }
  
  // 8. Valider analyse complète
  const rootCause = analysis[analysis.length - 1];
  const completeValidation = await validateRootCause(rootCause, analysis, context);
  
  return {
    analysis,
    rootCause,
    validated: completeValidation.valid,
    depth: analysis.length
  };
}
```

### 3. Diagramme Ishikawa (Causes Multiples)

**IMPÉRATIF:** Analyser toutes les causes possibles, pas seulement la première trouvée.

**TOUJOURS:**
- ✅ Identifier toutes les catégories de causes possibles
- ✅ Analyser chaque catégorie systématiquement
- ✅ Prioriser causes selon probabilité et impact
- ✅ Valider chaque cause identifiée

**Pattern:**
```typescript
// Diagramme Ishikawa
interface IshikawaCategory {
  name: string;
  causes: Cause[];
  probability: number;
  impact: 'low' | 'medium' | 'high' | 'critical';
}

interface Cause {
  description: string;
  category: string;
  probability: number;
  impact: 'low' | 'medium' | 'high' | 'critical';
  validated: boolean;
  isRootCause: boolean;
}

async function analyzeWithIshikawa(
  problem: Problem,
  context: ProblemContext
): Promise<IshikawaAnalysis> {
  // 1. Définir catégories standard (6M)
  const categories = [
    'Méthode',      // Processus, procédures
    'Matériel',     // Outils, équipements
    'Main-d\'œuvre', // Compétences, formation
    'Milieu',       // Environnement, contexte
    'Mesure',       // Métriques, monitoring
    'Management'    // Gestion, organisation
  ];
  
  // 2. Analyser chaque catégorie
  const categoryAnalyses: IshikawaCategory[] = [];
  for (const category of categories) {
    const causes = await analyzeCategory(category, problem, context);
    
    categoryAnalyses.push({
      name: category,
      causes,
      probability: calculateCategoryProbability(causes),
      impact: calculateCategoryImpact(causes)
    });
  }
  
  // 3. Identifier causes racines (probabilité × impact élevés)
  const rootCauses = identifyRootCauses(categoryAnalyses);
  
  // 4. Valider causes racines identifiées
  const validatedRootCauses = await validateRootCauses(rootCauses, context);
  
  // 5. Prioriser causes racines
  const prioritized = prioritizeRootCauses(validatedRootCauses);
  
  return {
    categories: categoryAnalyses,
    rootCauses: prioritized,
    validated: validatedRootCauses.every(c => c.validated),
    totalCauses: categoryAnalyses.reduce((sum, cat) => sum + cat.causes.length, 0)
  };
}
```

### 4. Validation de la Cause Identifiée

**IMPÉRATIF:** Valider systématiquement que la cause identifiée est correcte avant de corriger.

**TOUJOURS:**
- ✅ Reproduire problème avec cause identifiée
- ✅ Tester que correction résout problème
- ✅ Vérifier qu'aucune autre cause n'est présente
- ✅ Documenter validation

**Pattern:**
```typescript
// Validation cause identifiée
interface CauseValidation {
  cause: Cause;
  reproductionTest: TestResult;
  correctionTest: TestResult;
  otherCausesCheck: CheckResult;
  validated: boolean;
  confidence: number; // 0-1
}

async function validateRootCause(
  cause: Cause,
  problem: Problem,
  context: ProblemContext
): Promise<CauseValidation> {
  // 1. Reproduire problème avec cause identifiée
  const reproductionTest = await reproduceProblemWithCause(cause, context);
  
  // 2. Si reproduction réussie, cause probablement correcte
  if (!reproductionTest.success) {
    return {
      cause,
      reproductionTest,
      correctionTest: { success: false },
      otherCausesCheck: { checked: false },
      validated: false,
      confidence: 0.3
    };
  }
  
  // 3. Appliquer correction pour cause identifiée
  const correction = await applyCorrectionForCause(cause, context);
  
  // 4. Tester que correction résout problème
  const correctionTest = await testCorrection(correction, problem, context);
  
  // 5. Vérifier qu'aucune autre cause n'est présente
  const otherCausesCheck = await checkOtherCauses(cause, problem, context);
  
  // 6. Calculer confiance
  const confidence = calculateConfidence(
    reproductionTest,
    correctionTest,
    otherCausesCheck
  );
  
  // 7. Valider si confiance > 0.8
  const validated = confidence > 0.8 && 
                    correctionTest.success && 
                    otherCausesCheck.noOtherCauses;
  
  return {
    cause,
    reproductionTest,
    correctionTest,
    otherCausesCheck,
    validated,
    confidence
  };
}
```

### 5. Documentation Cause et Solution

**IMPÉRATIF:** Documenter systématiquement la cause racine identifiée et la solution appliquée.

**TOUJOURS:**
- ✅ Documenter problème (symptôme)
- ✅ Documenter cause racine identifiée
- ✅ Documenter solution appliquée
- ✅ Documenter validation solution
- ✅ Documenter prévention récurrence

**Pattern:**
```typescript
// Documentation cause et solution
interface RootCauseDocumentation {
  id: string;
  problem: {
    description: string;
    symptoms: string[];
    context: ProblemContext;
    timestamp: number;
  };
  rootCause: {
    description: string;
    category: string;
    analysis: WhyAnalysis | IshikawaAnalysis;
    validation: CauseValidation;
    confidence: number;
  };
  solution: {
    description: string;
    implementation: string;
    validation: TestResult;
    effectiveness: number; // 0-1
  };
  prevention: {
    measures: string[];
    rules: string[];
    monitoring: string[];
  };
  metadata: {
    createdAt: number;
    updatedAt: number;
    tags: string[];
    similarProblems: string[];
  };
}

async function documentRootCause(
  problem: Problem,
  rootCause: Cause,
  solution: Solution,
  context: ProblemContext
): Promise<RootCauseDocumentation> {
  // 1. Créer documentation
  const documentation: RootCauseDocumentation = {
    id: generateDocumentationId(),
    problem: {
      description: problem.description,
      symptoms: problem.symptoms,
      context,
      timestamp: Date.now()
    },
    rootCause: {
      description: rootCause.description,
      category: rootCause.category,
      analysis: rootCause.analysis,
      validation: rootCause.validation,
      confidence: rootCause.validation.confidence
    },
    solution: {
      description: solution.description,
      implementation: solution.implementation,
      validation: solution.validation,
      effectiveness: solution.effectiveness
    },
    prevention: {
      measures: solution.preventionMeasures,
      rules: solution.preventionRules,
      monitoring: solution.monitoring
    },
    metadata: {
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tags: extractTags(problem, rootCause, solution),
      similarProblems: await findSimilarProblems(problem, context)
    }
  };
  
  // 2. Sauvegarder dans mémoire persistante
  await saveRootCauseDocumentation(documentation, context);
  
  // 3. Indexer pour recherche rapide
  await indexDocumentation(documentation, context);
  
  // 4. Logger documentation
  logger.info('Cause racine documentée', {
    metadata: {
      documentationId: documentation.id,
      problem: problem.description,
      rootCause: rootCause.description,
      confidence: rootCause.validation.confidence
    }
  });
  
  return documentation;
}
```

### 6. Réutilisation Apprentissages

**IMPÉRATIF:** Chercher et réutiliser les apprentissages des causes passées avant d'analyser.

**TOUJOURS:**
- ✅ Chercher causes similaires dans mémoire avant analyse
- ✅ Comparer symptômes et contexte
- ✅ Réutiliser solutions efficaces
- ✅ Adapter au contexte actuel

**Pattern:**
```typescript
// Réutilisation apprentissages
async function reusePastLearnings(
  problem: Problem,
  context: ProblemContext
): Promise<ReuseResult> {
  // 1. Chercher problèmes similaires dans mémoire
  const similarProblems = await searchSimilarProblems(problem, context, {
    similarityThreshold: 0.7,
    maxResults: 10
  });
  
  if (similarProblems.length === 0) {
    return {
      reused: false,
      reason: 'no-similar-problems-found'
    };
  }
  
  // 2. Comparer symptômes et contexte
  const bestMatch = findBestMatch(problem, similarProblems, context);
  
  if (bestMatch.similarity < 0.8) {
    return {
      reused: false,
      reason: 'similarity-too-low',
      bestMatch: bestMatch.problem
    };
  }
  
  // 3. Vérifier que solution était efficace
  if (bestMatch.problem.solution.effectiveness < 0.8) {
    return {
      reused: false,
      reason: 'solution-not-effective-enough',
      bestMatch: bestMatch.problem
    };
  }
  
  // 4. Adapter solution au contexte actuel
  const adaptedSolution = await adaptSolution(
    bestMatch.problem.solution,
    problem,
    context
  );
  
  // 5. Valider solution adaptée
  const validation = await validateAdaptedSolution(adaptedSolution, problem, context);
  
  if (validation.success) {
    return {
      reused: true,
      originalProblem: bestMatch.problem,
      adaptedSolution,
      validation,
      similarity: bestMatch.similarity
    };
  }
  
  return {
    reused: false,
    reason: 'adapted-solution-validation-failed',
    bestMatch: bestMatch.problem
  };
}
```

## 🔄 Workflow de Recherche Cause Racine

### Workflow: Rechercher Cause Racine Systématiquement

**Étapes:**
1. **Collecter informations complètes** - Erreur, logs, contexte, historique
2. **Chercher apprentissages passés** - Problèmes similaires, solutions efficaces
3. **Analyser avec 5 Why** - Pourquoi en profondeur (minimum 3 niveaux)
4. **Analyser avec Ishikawa** - Toutes causes possibles
5. **Identifier cause racine** - Prioriser selon probabilité × impact
6. **Valider cause identifiée** - Reproduire, tester correction
7. **Corriger cause racine** - Appliquer solution ciblée
8. **Valider correction** - Vérifier résolution problème
9. **Documenter cause et solution** - Enregistrer pour référence future
10. **Prévenir récurrence** - Créer règles préventives

**Pattern:**
```typescript
// Workflow complet recherche cause racine
async function rootCauseAnalysisWorkflow(
  error: Error,
  context: Context
): Promise<RootCauseAnalysisResult> {
  // 1. Collecter informations complètes
  const problemContext = await collectProblemContext(error, context);
  
  // 2. Chercher apprentissages passés
  const reuseResult = await reusePastLearnings(
    { description: error.message, symptoms: [error.message] },
    problemContext
  );
  
  if (reuseResult.reused && reuseResult.validation?.success) {
    logger.info('Solution réutilisée depuis apprentissages passés', {
      metadata: {
        originalProblem: reuseResult.originalProblem?.id,
        similarity: reuseResult.similarity,
        adaptedSolution: reuseResult.adaptedSolution?.description
      }
    });
    
    return {
      rootCause: reuseResult.originalProblem?.rootCause,
      solution: reuseResult.adaptedSolution,
      validated: true,
      reused: true,
      documentation: reuseResult.originalProblem?.documentation
    };
  }
  
  // 3. Analyser avec 5 Why
  const whyAnalysis = await analyzeWith5Why(
    { description: error.message, symptoms: [error.message] },
    problemContext
  );
  
  // 4. Analyser avec Ishikawa
  const ishikawaAnalysis = await analyzeWithIshikawa(
    { description: error.message, symptoms: [error.message] },
    problemContext
  );
  
  // 5. Identifier cause racine (combiner analyses)
  const rootCause = identifyRootCauseFromAnalyses(
    whyAnalysis,
    ishikawaAnalysis,
    problemContext
  );
  
  // 6. Valider cause identifiée
  const validation = await validateRootCause(rootCause, 
    { description: error.message, symptoms: [error.message] },
    problemContext
  );
  
  if (!validation.validated) {
    logger.warn('Cause racine non validée, analyse plus approfondie nécessaire', {
      metadata: {
        rootCause: rootCause.description,
        confidence: validation.confidence,
        reproductionTest: validation.reproductionTest.success
      }
    });
    
    // Itérer avec plus d'informations
    return await rootCauseAnalysisWorkflow(error, {
      ...context,
      previousAnalysis: { whyAnalysis, ishikawaAnalysis, validation }
    });
  }
  
  // 7. Corriger cause racine
  const solution = await applyRootCauseCorrection(rootCause, problemContext);
  
  // 8. Valider correction
  const correctionValidation = await validateCorrection(solution, error, context);
  
  if (!correctionValidation.success) {
    logger.error('Correction échouée, cause racine peut-être incorrecte', {
      metadata: {
        rootCause: rootCause.description,
        solution: solution.description,
        validation: correctionValidation
      }
    });
    
    // Réanalyser avec nouvelles informations
    return await rootCauseAnalysisWorkflow(error, {
      ...context,
      failedCorrection: { solution, validation: correctionValidation }
    });
  }
  
  // 9. Documenter cause et solution
  const documentation = await documentRootCause(
    { description: error.message, symptoms: [error.message] },
    rootCause,
    solution,
    problemContext
  );
  
  // 10. Prévenir récurrence
  await preventRecurrence(rootCause, solution, documentation, context);
  
  return {
    rootCause,
    solution,
    validated: true,
    reused: false,
    documentation,
    confidence: validation.confidence
  };
}
```

## ⚠️ Règles de Recherche Cause Racine

### Ne Jamais:

**BLOQUANT:**
- ❌ Corriger sans rechercher cause racine
- ❌ S'arrêter à la première cause trouvée
- ❌ Corriger sans valider cause identifiée
- ❌ Ne pas documenter cause et solution
- ❌ Ignorer apprentissages passés

**TOUJOURS:**
- ✅ Rechercher cause racine systématiquement
- ✅ Analyser minimum 3 niveaux de profondeur
- ✅ Valider cause identifiée avant correction
- ✅ Documenter cause et solution
- ✅ Chercher apprentissages passés avant analyse

## 📊 Checklist Recherche Cause Racine

### Avant Correction

- [ ] Collecter informations complètes (erreur, logs, contexte)
- [ ] Chercher apprentissages passés (problèmes similaires)
- [ ] Analyser avec 5 Why (minimum 3 niveaux)
- [ ] Analyser avec Ishikawa (toutes causes possibles)
- [ ] Identifier cause racine (prioriser probabilité × impact)

### Validation Cause

- [ ] Reproduire problème avec cause identifiée
- [ ] Tester que correction résout problème
- [ ] Vérifier qu'aucune autre cause n'est présente
- [ ] Valider confiance > 0.8

### Correction et Documentation

- [ ] Appliquer correction ciblée cause racine
- [ ] Valider correction efficace
- [ ] Documenter cause et solution
- [ ] Créer règles préventives
- [ ] Sauvegarder dans mémoire persistante

## 🔗 Références

- `@.cursor/rules/bug-resolution-strategy.md` - Stratégie systématique résolution bugs (IMPÉRATIF - utilise recherche cause racine)
- `@.cursor/rules/error-recovery.md` - Récupération automatique après erreurs
- `@.cursor/rules/iterative-perfection.md` - Itération automatique jusqu'à perfection
- `@.cursor/rules/learning-memory.md` - Mémoire persistante des apprentissages
- `@.cursor/rules/troubleshooting.md` - Guide troubleshooting

---

**Note:** Cette règle garantit que l'agent recherche systématiquement la cause racine de tout problème avant de le corriger, évitant ainsi les corrections superficielles et les problèmes récurrents.

**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

