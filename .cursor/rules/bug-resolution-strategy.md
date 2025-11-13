# Stratégie Systématique de Résolution de Bugs - Saxium

**Objectif:** Systématiser la résolution de bugs avec stratégie structurée, priorisation intelligente et validation systématique.

**Référence:** [Cursor Rules Documentation](https://docs.cursor.com/context/rules)  
**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

## 🎯 Principe Fondamental

**IMPÉRATIF:** L'agent DOIT utiliser une stratégie systématique pour résoudre les bugs, avec priorisation intelligente, recherche cause racine et validation systématique.

**Problème identifié:** L'agent résout les bugs de manière ad-hoc, sans stratégie structurée, ce qui entraîne des résolutions inefficaces et des bugs récurrents.

**Solution:** Stratégie structurée avec méthodologie systématique, priorisation intelligente et validation complète.

**Bénéfices:**
- ✅ Résolution bugs plus rapide et ciblée
- ✅ Corrections validées et documentées
- ✅ Réduction bugs récurrents
- ✅ Amélioration continue basée sur apprentissages

**Référence:** `@.cursor/rules/root-cause-analysis.md` - Recherche systématique cause racine (IMPÉRATIF)  
**Référence:** `@.cursor/rules/bug-prevention.md` - Détection proactive des bugs  
**Référence:** `@.cursor/rules/error-recovery.md` - Récupération automatique après erreurs  
**Référence:** `@.cursor/rules/iterative-perfection.md` - Itération automatique jusqu'à perfection

## 📋 Méthodologie de Résolution de Bugs

### 1. Collecte d'Informations Complètes

**IMPÉRATIF:** Collecter toutes les informations nécessaires avant de résoudre le bug.

**TOUJOURS:**
- ✅ Collecter message d'erreur complet (stack trace, contexte)
- ✅ Collecter logs pertinents (avant, pendant, après erreur)
- ✅ Collecter contexte d'exécution (fichiers modifiés, dépendances)
- ✅ Collecter historique récent (changements, déploiements)
- ✅ Collecter métriques (performance, utilisation ressources)
- ✅ Chercher bugs similaires dans mémoire passée

**Pattern:**
```typescript
// Collecte d'informations complètes pour bug
interface BugContext {
  bug: Bug;
  error: Error;
  errorMessage: string;
  stackTrace: string;
  logs: LogEntry[];
  recentChanges: Change[];
  context: ExecutionContext;
  metrics: Metrics;
  similarBugs: SimilarBug[];
  reproductionSteps: string[];
}

async function collectBugContext(
  bug: Bug,
  context: Context
): Promise<BugContext> {
  // 1. Collecter erreur complète
  const errorMessage = bug.error?.message || bug.description;
  const stackTrace = bug.error?.stack || '';
  
  // 2. Collecter logs pertinents
  const logs = await collectRelevantLogs(bug, context, {
    before: 10 * 60 * 1000, // 10 minutes avant
    after: 5 * 60 * 1000    // 5 minutes après
  });
  
  // 3. Collecter changements récents
  const recentChanges = await collectRecentChanges(context, {
    timeframe: 48 * 60 * 60 * 1000 // 48 heures
  });
  
  // 4. Collecter contexte d'exécution
  const executionContext = await collectExecutionContext(context);
  
  // 5. Collecter métriques
  const metrics = await collectMetrics(context, {
    timeframe: 2 * 60 * 60 * 1000 // 2 heures
  });
  
  // 6. Chercher bugs similaires dans mémoire
  const similarBugs = await searchSimilarBugs(bug, context);
  
  // 7. Collecter étapes de reproduction
  const reproductionSteps = await collectReproductionSteps(bug, context);
  
  return {
    bug,
    error: bug.error,
    errorMessage,
    stackTrace,
    logs,
    recentChanges,
    context: executionContext,
    metrics,
    similarBugs,
    reproductionSteps
  };
}
```

### 2. Priorisation Intelligente des Bugs

**IMPÉRATIF:** Prioriser les bugs selon leur impact, urgence et criticité.

**TOUJOURS:**
- ✅ Analyser impact utilisateur
- ✅ Analyser impact système
- ✅ Analyser fréquence occurrence
- ✅ Analyser urgence business
- ✅ Classifier bug (critique, haute, moyenne, basse)
- ✅ Traiter bugs critiques en premier

**Pattern:**
```typescript
// Priorisation intelligente des bugs
interface BugPriority {
  bug: Bug;
  priority: 'critical' | 'high' | 'medium' | 'low';
  impact: {
    user: 'critical' | 'high' | 'medium' | 'low';
    system: 'critical' | 'high' | 'medium' | 'low';
    business: 'critical' | 'high' | 'medium' | 'low';
  };
  urgency: 'critical' | 'high' | 'medium' | 'low';
  frequency: 'very-high' | 'high' | 'medium' | 'low';
  score: number; // 0-100
}

async function prioritizeBug(
  bug: Bug,
  context: BugContext
): Promise<BugPriority> {
  // 1. Analyser impact utilisateur
  const userImpact = analyzeUserImpact(bug, context);
  
  // 2. Analyser impact système
  const systemImpact = analyzeSystemImpact(bug, context);
  
  // 3. Analyser impact business
  const businessImpact = analyzeBusinessImpact(bug, context);
  
  // 4. Analyser urgence
  const urgency = analyzeUrgency(bug, context);
  
  // 5. Analyser fréquence
  const frequency = analyzeFrequency(bug, context);
  
  // 6. Calculer score de priorité
  const score = calculatePriorityScore({
    userImpact,
    systemImpact,
    businessImpact,
    urgency,
    frequency
  });
  
  // 7. Déterminer priorité globale
  const priority = score >= 80 ? 'critical' :
                   score >= 60 ? 'high' :
                   score >= 40 ? 'medium' : 'low';
  
  return {
    bug,
    priority,
    impact: {
      user: userImpact,
      system: systemImpact,
      business: businessImpact
    },
    urgency,
    frequency,
    score
  };
}

// Classifier bug par type
function classifyBug(bug: Bug, context: BugContext): BugClassification {
  // 1. Type de bug
  let type: 'typescript' | 'runtime' | 'logic' | 'performance' | 'security' | 'integration';
  if (bug.error?.name === 'TypeError' || bug.error?.name === 'ReferenceError') {
    type = 'typescript';
  } else if (bug.error?.name === 'Error' && bug.error?.message.includes('timeout')) {
    type = 'performance';
  } else if (bug.error?.name === 'Error' && bug.error?.message.includes('security')) {
    type = 'security';
  } else {
    type = 'runtime';
  }
  
  // 2. Catégorie
  let category: 'backend' | 'frontend' | 'database' | 'integration' | 'ui';
  if (bug.location?.includes('server/')) {
    category = 'backend';
  } else if (bug.location?.includes('client/')) {
    category = 'frontend';
  } else if (bug.location?.includes('storage/') || bug.location?.includes('database')) {
    category = 'database';
  } else {
    category = 'integration';
  }
  
  // 3. Sévérité
  const severity = bug.priority === 'critical' ? 'critical' :
                   bug.priority === 'high' ? 'high' :
                   bug.priority === 'medium' ? 'medium' : 'low';
  
  return {
    type,
    category,
    severity,
    location: bug.location,
    affectedComponents: bug.affectedComponents || []
  };
}
```

### 3. Recherche Cause Racine (Intégration)

**IMPÉRATIF:** Rechercher systématiquement la cause racine avant de corriger.

**TOUJOURS:**
- ✅ Utiliser méthodologie root-cause-analysis
- ✅ Analyser avec 5 Why (minimum 3 niveaux)
- ✅ Analyser avec Ishikawa (toutes causes possibles)
- ✅ Valider cause identifiée
- ✅ Ne pas corriger sans cause racine identifiée

**Référence:** `@.cursor/rules/root-cause-analysis.md` - Recherche systématique cause racine (IMPÉRATIF)

**Pattern:**
```typescript
// Recherche cause racine pour bug
async function findRootCauseForBug(
  bug: Bug,
  context: BugContext
): Promise<RootCauseAnalysis> {
  // 1. Utiliser workflow recherche cause racine
  const rootCauseAnalysis = await rootCauseAnalysisWorkflow(
    bug.error || new Error(bug.description),
    context
  );
  
  // 2. Si cause racine trouvée et validée
  if (rootCauseAnalysis.validated && rootCauseAnalysis.rootCause) {
    return {
      bug,
      rootCause: rootCauseAnalysis.rootCause,
      validated: true,
      confidence: rootCauseAnalysis.confidence,
      analysis: rootCauseAnalysis.analysis,
      documentation: rootCauseAnalysis.documentation
    };
  }
  
  // 3. Si cause racine non validée, itérer
  logger.warn('Cause racine non validée pour bug, analyse plus approfondie nécessaire', {
    metadata: {
      bugId: bug.id,
      confidence: rootCauseAnalysis.confidence
    }
  });
  
  // 4. Collecter plus d'informations et réanalyser
  const enhancedContext = await enhanceBugContext(bug, context);
  return await findRootCauseForBug(bug, enhancedContext);
}
```

### 4. Planification de la Résolution

**IMPÉRATIF:** Planifier la résolution avant d'exécuter la correction.

**TOUJOURS:**
- ✅ Analyser cause racine identifiée
- ✅ Identifier solution appropriée
- ✅ Planifier étapes de correction
- ✅ Identifier risques et dépendances
- ✅ Planifier tests de validation
- ✅ Chercher solutions similaires passées

**Pattern:**
```typescript
// Planification de la résolution
interface ResolutionPlan {
  bug: Bug;
  rootCause: Cause;
  solution: Solution;
  steps: ResolutionStep[];
  risks: Risk[];
  dependencies: Dependency[];
  validationTests: Test[];
  estimatedTime: number;
  similarSolutions: SimilarSolution[];
}

async function planBugResolution(
  bug: Bug,
  rootCause: Cause,
  context: BugContext
): Promise<ResolutionPlan> {
  // 1. Chercher solutions similaires passées
  const similarSolutions = await searchSimilarSolutions(bug, rootCause, context);
  
  // 2. Si solution similaire efficace trouvée, réutiliser
  if (similarSolutions.length > 0 && similarSolutions[0].effectiveness > 0.8) {
    const adaptedSolution = await adaptSolution(
      similarSolutions[0].solution,
      bug,
      context
    );
    
    return {
      bug,
      rootCause,
      solution: adaptedSolution,
      steps: adaptedSolution.steps,
      risks: adaptedSolution.risks,
      dependencies: adaptedSolution.dependencies,
      validationTests: adaptedSolution.validationTests,
      estimatedTime: adaptedSolution.estimatedTime,
      similarSolutions
    };
  }
  
  // 3. Identifier solution appropriée
  const solution = await identifySolution(rootCause, bug, context);
  
  // 4. Planifier étapes de correction
  const steps = await planResolutionSteps(solution, bug, context);
  
  // 5. Identifier risques et dépendances
  const risks = await identifyRisks(solution, bug, context);
  const dependencies = await identifyDependencies(solution, bug, context);
  
  // 6. Planifier tests de validation
  const validationTests = await planValidationTests(solution, bug, context);
  
  // 7. Estimer temps de résolution
  const estimatedTime = estimateResolutionTime(steps, solution, context);
  
  return {
    bug,
    rootCause,
    solution,
    steps,
    risks,
    dependencies,
    validationTests,
    estimatedTime,
    similarSolutions
  };
}
```

### 5. Exécution de la Correction

**IMPÉRATIF:** Exécuter la correction selon le plan avec validation continue.

**TOUJOURS:**
- ✅ Exécuter étapes selon plan
- ✅ Valider après chaque étape
- ✅ Gérer risques identifiés
- ✅ Respecter dépendances
- ✅ Documenter modifications
- ✅ Itérer si nécessaire

**Pattern:**
```typescript
// Exécution de la correction
async function executeBugResolution(
  plan: ResolutionPlan,
  context: Context
): Promise<ResolutionResult> {
  const results: StepResult[] = [];
  let currentCode = await loadCode(plan.bug.location);
  
  // 1. Exécuter chaque étape
  for (const step of plan.steps) {
    // 2. Vérifier dépendances
    const dependenciesMet = await checkDependencies(step, plan.dependencies, context);
    if (!dependenciesMet.allMet) {
      logger.warn('Dépendances non satisfaites, attendre', {
        metadata: {
          stepId: step.id,
          missingDependencies: dependenciesMet.missing
        }
      });
      await waitForDependencies(dependenciesMet.missing, context);
    }
    
    // 3. Exécuter étape
    const stepResult = await executeStep(step, currentCode, context);
    results.push(stepResult);
    
    // 4. Valider étape
    const stepValidation = await validateStep(step, stepResult, context);
    if (!stepValidation.success) {
      logger.error('Étape échouée, corriger et réitérer', {
        metadata: {
          stepId: step.id,
          validation: stepValidation
        }
      });
      
      // Corriger et réitérer
      const corrected = await correctStep(step, stepResult, stepValidation, context);
      const retryResult = await executeStep(corrected, currentCode, context);
      results.push(retryResult);
    }
    
    // 5. Mettre à jour code
    currentCode = stepResult.code;
    
    // 6. Gérer risques
    await manageRisks(step, plan.risks, context);
  }
  
  return {
    plan,
    results,
    finalCode: currentCode,
    allStepsCompleted: results.every(r => r.success)
  };
}
```

### 6. Validation Systématique de la Correction

**IMPÉRATIF:** Valider systématiquement que la correction résout le bug.

**TOUJOURS:**
- ✅ Reproduire bug avant correction
- ✅ Appliquer correction
- ✅ Vérifier bug résolu
- ✅ Vérifier absence régression
- ✅ Valider tests passent
- ✅ Documenter validation

**Pattern:**
```typescript
// Validation systématique de la correction
interface BugResolutionValidation {
  bug: Bug;
  resolution: ResolutionResult;
  reproductionTest: TestResult;
  resolutionTest: TestResult;
  regressionTest: TestResult;
  unitTests: TestResult;
  e2eTests: TestResult;
  validated: boolean;
  confidence: number; // 0-1
}

async function validateBugResolution(
  bug: Bug,
  resolution: ResolutionResult,
  context: Context
): Promise<BugResolutionValidation> {
  // 1. Reproduire bug avant correction
  const reproductionTest = await reproduceBug(bug, context);
  
  if (!reproductionTest.success) {
    logger.warn('Impossible de reproduire bug, peut-être déjà résolu', {
      metadata: {
        bugId: bug.id,
        reproductionTest
      }
    });
  }
  
  // 2. Appliquer correction
  const correctedCode = resolution.finalCode;
  
  // 3. Vérifier bug résolu
  const resolutionTest = await testBugResolution(bug, correctedCode, context);
  
  // 4. Vérifier absence régression
  const regressionTest = await testRegression(correctedCode, bug, context);
  
  // 5. Valider tests unitaires
  const unitTests = await runUnitTests(correctedCode, bug.location, context);
  
  // 6. Valider tests E2E pertinents
  const e2eTests = await runRelevantE2ETests(correctedCode, bug, context);
  
  // 7. Calculer confiance
  const confidence = calculateValidationConfidence({
    reproductionTest,
    resolutionTest,
    regressionTest,
    unitTests,
    e2eTests
  });
  
  // 8. Valider si confiance > 0.9 et tous tests passent
  const validated = confidence > 0.9 &&
                    resolutionTest.success &&
                    regressionTest.noRegression &&
                    unitTests.allPass &&
                    e2eTests.allPass;
  
  return {
    bug,
    resolution,
    reproductionTest,
    resolutionTest,
    regressionTest,
    unitTests,
    e2eTests,
    validated,
    confidence
  };
}
```

### 7. Documentation Bug et Solution

**IMPÉRATIF:** Documenter systématiquement le bug résolu et la solution appliquée.

**TOUJOURS:**
- ✅ Documenter bug (description, symptômes, contexte)
- ✅ Documenter cause racine identifiée
- ✅ Documenter solution appliquée
- ✅ Documenter validation solution
- ✅ Documenter prévention récurrence
- ✅ Sauvegarder dans mémoire persistante

**Pattern:**
```typescript
// Documentation bug et solution
interface BugDocumentation {
  id: string;
  bug: {
    description: string;
    symptoms: string[];
    context: BugContext;
    priority: BugPriority;
    classification: BugClassification;
    timestamp: number;
  };
  rootCause: {
    description: string;
    analysis: RootCauseAnalysis;
    validation: CauseValidation;
    confidence: number;
  };
  solution: {
    description: string;
    implementation: string;
    plan: ResolutionPlan;
    execution: ResolutionResult;
    validation: BugResolutionValidation;
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
    similarBugs: string[];
    resolvedBy: string;
  };
}

async function documentBugResolution(
  bug: Bug,
  rootCause: Cause,
  solution: Solution,
  validation: BugResolutionValidation,
  context: Context
): Promise<BugDocumentation> {
  // 1. Créer documentation
  const documentation: BugDocumentation = {
    id: generateDocumentationId(),
    bug: {
      description: bug.description,
      symptoms: bug.symptoms,
      context: await collectBugContext(bug, context),
      priority: await prioritizeBug(bug, await collectBugContext(bug, context)),
      classification: classifyBug(bug, await collectBugContext(bug, context)),
      timestamp: Date.now()
    },
    rootCause: {
      description: rootCause.description,
      analysis: rootCause.analysis,
      validation: rootCause.validation,
      confidence: rootCause.validation.confidence
    },
    solution: {
      description: solution.description,
      implementation: solution.implementation,
      plan: solution.plan,
      execution: solution.execution,
      validation,
      effectiveness: validation.confidence
    },
    prevention: {
      measures: solution.preventionMeasures,
      rules: solution.preventionRules,
      monitoring: solution.monitoring
    },
    metadata: {
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tags: extractTags(bug, rootCause, solution),
      similarBugs: await findSimilarBugs(bug, context),
      resolvedBy: 'agent'
    }
  };
  
  // 2. Sauvegarder dans mémoire persistante
  await saveBugDocumentation(documentation, context);
  
  // 3. Indexer pour recherche rapide
  await indexBugDocumentation(documentation, context);
  
  // 4. Logger documentation
  logger.info('Bug résolu et documenté', {
    metadata: {
      documentationId: documentation.id,
      bugId: bug.id,
      rootCause: rootCause.description,
      solution: solution.description,
      effectiveness: validation.confidence
    }
  });
  
  return documentation;
}
```

### 8. Réutilisation Solutions Efficaces

**IMPÉRATIF:** Chercher et réutiliser les solutions efficaces des bugs passés.

**TOUJOURS:**
- ✅ Chercher bugs similaires dans mémoire avant résolution
- ✅ Comparer symptômes et contexte
- ✅ Réutiliser solutions efficaces
- ✅ Adapter au contexte actuel
- ✅ Valider solution adaptée

**Pattern:**
```typescript
// Réutilisation solutions efficaces
async function reuseEffectiveSolutions(
  bug: Bug,
  context: BugContext
): Promise<ReuseResult> {
  // 1. Chercher bugs similaires dans mémoire
  const similarBugs = await searchSimilarBugs(bug, context, {
    similarityThreshold: 0.7,
    maxResults: 10
  });
  
  if (similarBugs.length === 0) {
    return {
      reused: false,
      reason: 'no-similar-bugs-found'
    };
  }
  
  // 2. Comparer symptômes et contexte
  const bestMatch = findBestMatch(bug, similarBugs, context);
  
  if (bestMatch.similarity < 0.8) {
    return {
      reused: false,
      reason: 'similarity-too-low',
      bestMatch: bestMatch.bug
    };
  }
  
  // 3. Vérifier que solution était efficace
  if (bestMatch.bug.solution.effectiveness < 0.8) {
    return {
      reused: false,
      reason: 'solution-not-effective-enough',
      bestMatch: bestMatch.bug
    };
  }
  
  // 4. Adapter solution au contexte actuel
  const adaptedSolution = await adaptSolution(
    bestMatch.bug.solution,
    bug,
    context
  );
  
  // 5. Valider solution adaptée
  const validation = await validateAdaptedSolution(adaptedSolution, bug, context);
  
  if (validation.success) {
    return {
      reused: true,
      originalBug: bestMatch.bug,
      adaptedSolution,
      validation,
      similarity: bestMatch.similarity
    };
  }
  
  return {
    reused: false,
    reason: 'adapted-solution-validation-failed',
    bestMatch: bestMatch.bug
  };
}
```

## 🔄 Workflow de Résolution de Bugs

### Workflow: Résoudre Bug Systématiquement

**Étapes:**
1. **Collecter informations complètes** - Erreur, logs, contexte, historique
2. **Chercher bugs similaires passés** - Solutions efficaces, apprentissages
3. **Prioriser bug** - Impact, urgence, criticité
4. **Rechercher cause racine** - Méthodologie root-cause-analysis
5. **Planifier résolution** - Solution, étapes, risques, dépendances
6. **Exécuter correction** - Étapes selon plan avec validation continue
7. **Valider correction** - Reproduire, tester, vérifier régression
8. **Documenter bug et solution** - Enregistrer pour référence future
9. **Prévenir récurrence** - Créer règles préventives

**Pattern:**
```typescript
// Workflow complet résolution bug
async function resolveBugSystematically(
  bug: Bug,
  context: Context
): Promise<BugResolutionResult> {
  // 1. Collecter informations complètes
  const bugContext = await collectBugContext(bug, context);
  
  // 2. Chercher bugs similaires passés
  const reuseResult = await reuseEffectiveSolutions(bug, bugContext);
  
  if (reuseResult.reused && reuseResult.validation?.success) {
    logger.info('Solution réutilisée depuis bugs passés', {
      metadata: {
        originalBug: reuseResult.originalBug?.id,
        similarity: reuseResult.similarity,
        adaptedSolution: reuseResult.adaptedSolution?.description
      }
    });
    
    // Documenter réutilisation
    await documentBugResolution(
      bug,
      reuseResult.originalBug?.rootCause!,
      reuseResult.adaptedSolution!,
      reuseResult.validation!,
      context
    );
    
    return {
      bug,
      resolved: true,
      reused: true,
      solution: reuseResult.adaptedSolution,
      validation: reuseResult.validation,
      documentation: reuseResult.originalBug?.documentation
    };
  }
  
  // 3. Prioriser bug
  const priority = await prioritizeBug(bug, bugContext);
  
  // 4. Rechercher cause racine
  const rootCauseAnalysis = await findRootCauseForBug(bug, bugContext);
  
  if (!rootCauseAnalysis.validated) {
    logger.error('Cause racine non validée, impossible de résoudre bug', {
      metadata: {
        bugId: bug.id,
        confidence: rootCauseAnalysis.confidence
      }
    });
    
    return {
      bug,
      resolved: false,
      reused: false,
      reason: 'root-cause-not-validated',
      rootCauseAnalysis
    };
  }
  
  // 5. Planifier résolution
  const plan = await planBugResolution(bug, rootCauseAnalysis.rootCause!, bugContext);
  
  // 6. Exécuter correction
  const resolution = await executeBugResolution(plan, context);
  
  if (!resolution.allStepsCompleted) {
    logger.error('Résolution incomplète, certaines étapes ont échoué', {
      metadata: {
        bugId: bug.id,
        failedSteps: resolution.results.filter(r => !r.success).length
      }
    });
    
    // Itérer avec corrections
    return await resolveBugSystematically(bug, {
      ...context,
      previousResolution: resolution
    });
  }
  
  // 7. Valider correction
  const validation = await validateBugResolution(bug, resolution, context);
  
  if (!validation.validated) {
    logger.error('Validation échouée, correction peut-être incorrecte', {
      metadata: {
        bugId: bug.id,
        confidence: validation.confidence,
        resolutionTest: validation.resolutionTest.success,
        regressionTest: validation.regressionTest.noRegression
      }
    });
    
    // Réanalyser et corriger
    return await resolveBugSystematically(bug, {
      ...context,
      failedValidation: validation
    });
  }
  
  // 8. Documenter bug et solution
  const documentation = await documentBugResolution(
    bug,
    rootCauseAnalysis.rootCause!,
    plan.solution,
    validation,
    context
  );
  
  // 9. Prévenir récurrence
  await preventBugRecurrence(bug, rootCauseAnalysis.rootCause!, plan.solution, documentation, context);
  
  return {
    bug,
    resolved: true,
    reused: false,
    solution: plan.solution,
    validation,
    documentation,
    priority
  };
}
```

## ⚠️ Règles de Résolution de Bugs

### Ne Jamais:

**BLOQUANT:**
- ❌ Corriger bug sans rechercher cause racine
- ❌ Corriger bug sans prioriser
- ❌ Corriger bug sans planifier résolution
- ❌ Corriger bug sans valider correction
- ❌ Ne pas documenter bug résolu
- ❌ Ignorer bugs similaires passés

**TOUJOURS:**
- ✅ Rechercher cause racine systématiquement
- ✅ Prioriser bug selon impact/urgence
- ✅ Planifier résolution avant correction
- ✅ Valider correction systématiquement
- ✅ Documenter bug et solution
- ✅ Chercher bugs similaires avant résolution

## 📊 Checklist Résolution de Bugs

### Avant Résolution

- [ ] Collecter informations complètes (erreur, logs, contexte)
- [ ] Chercher bugs similaires passés
- [ ] Prioriser bug (impact, urgence, criticité)
- [ ] Rechercher cause racine (5 Why, Ishikawa)
- [ ] Valider cause identifiée
- [ ] Planifier résolution (solution, étapes, risques)

### Pendant Résolution

- [ ] Exécuter étapes selon plan
- [ ] Valider après chaque étape
- [ ] Gérer risques identifiés
- [ ] Respecter dépendances
- [ ] Documenter modifications

### Après Résolution

- [ ] Reproduire bug avant correction
- [ ] Vérifier bug résolu
- [ ] Vérifier absence régression
- [ ] Valider tests passent
- [ ] Documenter bug et solution
- [ ] Créer règles préventives
- [ ] Sauvegarder dans mémoire persistante

## 🔗 Références

- `@.cursor/rules/root-cause-analysis.md` - Recherche systématique cause racine (IMPÉRATIF)
- `@.cursor/rules/agent-performance-optimization.md` - Optimisation performances agent (priorisation intelligente)
- `@.cursor/rules/transversality-enhancement.md` - Amélioration transversalité agent (relations modules, patterns)
- `@.cursor/rules/bug-prevention.md` - Détection proactive des bugs
- `@.cursor/rules/error-recovery.md` - Récupération automatique après erreurs
- `@.cursor/rules/iterative-perfection.md` - Itération automatique jusqu'à perfection
- `@.cursor/rules/learning-memory.md` - Mémoire persistante des apprentissages

---

**Note:** Cette règle garantit que l'agent résout les bugs de manière systématique avec stratégie structurée, priorisation intelligente et validation complète.

**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

