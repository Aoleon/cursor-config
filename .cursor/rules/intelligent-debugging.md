# Debugging Intelligent - Saxium

<!-- 
Context: debugging, error-analysis, troubleshooting, root-cause, intelligent-debugging
Priority: P1
Auto-load: when task involves debugging, error resolution, or troubleshooting
Dependencies: root-cause-analysis.md, meta-cognition.md, systems-thinking.md, bug-resolution-strategy.md, advanced-problem-solving.md
-->

**Objectif:** Doter l'agent de capacités de debugging intelligentes combinant analyse systématique, intuition basée sur l'expérience et techniques avancées de diagnostic.

**Référence:** [Cursor Rules Documentation](https://docs.cursor.com/context/rules)  
**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

## 🎯 Principe Fondamental

**IMPÉRATIF:** L'agent DOIT approcher le debugging de manière intelligente et systématique, en combinant analyse rigoureuse, expérience passée et techniques avancées.

**Bénéfices:**
- ✅ Debugging plus rapide et efficace
- ✅ Identification cause racine systématique
- ✅ Solutions robustes évitant récurrence
- ✅ Apprentissage continu from bugs
- ✅ Prévention bugs similaires futurs

**Référence:** `@.cursor/rules/root-cause-analysis.md` - Analyse cause racine  
**Référence:** `@.cursor/rules/bug-resolution-strategy.md` - Stratégie résolution  
**Référence:** `@.cursor/rules/advanced-problem-solving.md` - Résolution avancée

## 📋 Niveaux de Debugging Intelligent

### Niveau 1 : Diagnostic Rapide (Quick Diagnosis)

**Usage:** Pour erreurs simples et évidentes.

**TOUJOURS:**
- ✅ Lire message d'erreur complètement
- ✅ Vérifier stack trace
- ✅ Identifier ligne exacte
- ✅ Vérifier learning memory pour erreur similaire
- ✅ Appliquer solution connue si disponible

**Pattern:**
```typescript
// Diagnostic rapide
interface QuickDiagnosis {
  error: Error;
  stackTrace: StackFrame[];
  similarErrors: SimilarError[];
  knownSolution: Solution | null;
  diagnosis: string;
}

class QuickDiagnoser {
  async diagnose(error: Error, context: Context): Promise<QuickDiagnosis> {
    // 1. Parser erreur et stack
    const stackTrace = await this.parseStackTrace(error);
    
    // 2. Rechercher erreurs similaires
    const similarErrors = await this.searchSimilarErrors(error, context);
    
    // 3. Vérifier si solution connue
    const knownSolution = similarErrors.length > 0 
      ? await this.retrieveKnownSolution(similarErrors[0])
      : null;
    
    // 4. Diagnostiquer
    const diagnosis = knownSolution 
      ? `Erreur connue: ${knownSolution.description}`
      : await this.analyzeNewError(error, stackTrace);
    
    return {
      error,
      stackTrace,
      similarErrors,
      knownSolution,
      diagnosis
    };
  }
}
```

---

### Niveau 2 : Analyse Cause Racine (Root Cause Analysis)

**Usage:** Pour bugs récurrents ou complexes.

**TOUJOURS:**
- ✅ Utiliser 5 Whys pour descendre jusqu'à cause racine
- ✅ Analyser contexte complet du bug
- ✅ Identifier contributing factors
- ✅ Valider cause racine avec tests
- ✅ Corriger cause racine (pas symptômes)

**Pattern:**
```typescript
// Analyse cause racine debugging
interface RootCauseDebugging {
  symptom: Error;
  whyChain: WhyLevel[];
  rootCause: RootCause;
  contributingFactors: Factor[];
  solution: RootCauseSolution;
  validation: ValidationTest;
}

class RootCauseDebugger {
  async debug(error: Error, context: Context): Promise<RootCauseDebugging> {
    // 1. Appliquer 5 Whys
    const whyChain = await this.applyFiveWhys(error, context);
    
    // 2. Identifier cause racine
    const rootCause = whyChain[whyChain.length - 1].cause;
    
    // 3. Identifier facteurs contributifs
    const contributingFactors = await this.identifyContributingFactors(
      error,
      whyChain,
      context
    );
    
    // 4. Concevoir solution cause racine
    const solution = await this.designRootCauseSolution(
      rootCause,
      contributingFactors
    );
    
    // 5. Créer test validant correction
    const validation = await this.createValidationTest(
      error,
      rootCause,
      solution
    );
    
    return {
      symptom: error,
      whyChain,
      rootCause,
      contributingFactors,
      solution,
      validation
    };
  }
}
```

**Exemple - Saxium:**
```typescript
// Symptôme: "TypeError: Cannot read property 'id' of undefined"
// 5 Whys:
{
  why1: 'user object is undefined',
  why2: 'Middleware auth n\'a pas populé req.user',
  why3: 'Token JWT invalide',
  why4: 'Token expiré pas vérifié avant utilisation',
  why5: 'Pas de validation expiration token', // ← ROOT CAUSE
  solution: 'Ajouter validation expiration dans middleware auth',
  prevention: 'Pattern: Toujours valider expiration tokens JWT'
}
```

---

### Niveau 3 : Debugging Systémique (Systemic Debugging)

**Usage:** Pour bugs résultant d'interactions systémiques complexes.

**TOUJOURS:**
- ✅ Cartographier système complet autour du bug
- ✅ Identifier boucles de rétroaction impliquées
- ✅ Analyser timing et race conditions
- ✅ Comprendre état système global
- ✅ Tester correction dans contexte système complet

**Pattern:**
```typescript
// Debugging systémique
interface SystemicDebugging {
  error: Error;
  systemMap: SystemMap;
  feedbackLoops: FeedbackLoop[];
  raceConditions: RaceCondition[];
  systemState: SystemState;
  systemicSolution: SystemicSolution;
}

class SystemicDebugger {
  async debug(error: Error, context: Context): Promise<SystemicDebugging> {
    // 1. Cartographier système autour de l'erreur
    const systemMap = await this.mapSystemAroundError(error, context);
    
    // 2. Identifier boucles rétroaction
    const feedbackLoops = await this.identifyFeedbackLoops(systemMap);
    
    // 3. Analyser race conditions potentielles
    const raceConditions = await this.analyzeRaceConditions(
      error,
      systemMap,
      context
    );
    
    // 4. Capturer état système
    const systemState = await this.captureSystemState(error, context);
    
    // 5. Concevoir solution systémique
    const systemicSolution = await this.designSystemicSolution({
      error,
      systemMap,
      feedbackLoops,
      raceConditions,
      systemState
    });
    
    return {
      error,
      systemMap,
      feedbackLoops,
      raceConditions,
      systemState,
      systemicSolution
    };
  }
}
```

**Exemple - Saxium:**
```typescript
// Erreur: "Inconsistent cache state"
// Analyse systémique:
{
  systemMap: {
    components: ['CacheService', 'EventBus', 'StorageFacade'],
    interactions: [
      'EventBus.emit(update) → CacheService.invalidate()',
      'StorageFacade.save() → EventBus.emit()',
      'CacheService.get() → StorageFacade.get()'
    ]
  },
  feedbackLoop: {
    type: 'reinforcing',
    description: 'Cache miss → DB read → Event → Cache invalidate → More cache miss',
    problem: 'Boucle renforcante causant thrashing'
  },
  raceCondition: {
    detected: true,
    scenario: 'Event invalidation arrive avant cache set',
    timing: 'Async operations non-coordonnées'
  },
  // Solution systémique:
  solution: {
    approach: 'Coordination async operations',
    implementation: [
      'Versioning cache entries',
      'Atomic cache operations',
      'Event ordering garanteed',
      'Optimistic locking'
    ],
    validation: 'Tests concurrence + monitoring cache hit ratio'
  }
}
```

---

### Niveau 4 : Debugging Prédictif (Predictive Debugging)

**Usage:** Anticiper bugs avant qu'ils ne se produisent.

**TOUJOURS:**
- ✅ Analyser patterns de bugs passés
- ✅ Identifier zones à risque (hotspots)
- ✅ Prédire bugs potentiels
- ✅ Implémenter préventions
- ✅ Monitorer métriques prédictives

**Pattern:**
```typescript
// Debugging prédictif
interface PredictiveDebugging {
  historicalBugs: Bug[];
  bugPatterns: BugPattern[];
  riskHotspots: Hotspot[];
  predictedBugs: PredictedBug[];
  preventions: Prevention[];
}

class PredictiveDebugger {
  async predict(
    codebase: Codebase,
    history: BugHistory
  ): Promise<PredictiveDebugging> {
    // 1. Analyser bugs historiques
    const historicalBugs = await this.loadBugHistory(history);
    
    // 2. Extraire patterns de bugs
    const bugPatterns = await this.extractBugPatterns(historicalBugs);
    
    // 3. Identifier zones à risque
    const riskHotspots = await this.identifyRiskHotspots(
      codebase,
      bugPatterns
    );
    
    // 4. Prédire bugs potentiels
    const predictedBugs = await this.predictPotentialBugs(
      riskHotspots,
      bugPatterns,
      codebase
    );
    
    // 5. Concevoir préventions
    const preventions = await Promise.all(
      predictedBugs.map(bug => this.designPrevention(bug, codebase))
    );
    
    return {
      historicalBugs,
      bugPatterns,
      riskHotspots,
      predictedBugs,
      preventions
    };
  }
}
```

**Exemple - Saxium:**
```typescript
// Analyse prédictive bugs Saxium
{
  bugPatterns: [
    {
      pattern: 'Undefined property access',
      frequency: 'high',
      locations: ['Services AI', 'Routes API', 'Storage'],
      rootCause: 'Validation optionnelle insuffisante'
    },
    {
      pattern: 'Async/await errors',
      frequency: 'medium',
      locations: ['Service orchestration', 'Pipeline parallèle'],
      rootCause: 'Error handling dans promises'
    }
  ],
  predictedBugs: [
    {
      location: 'ChatbotOrchestrationService.processMessage',
      bug: 'Potential race condition in parallel pipeline',
      confidence: 0.75,
      prevention: 'Add mutex/semaphore pour operations critiques'
    },
    {
      location: 'StorageFacade.batchOperations',
      bug: 'Transaction rollback peut laisser state inconsistent',
      confidence: 0.65,
      prevention: 'Implement two-phase commit ou saga pattern'
    }
  ]
}
```

---

## 🔧 Workflow Debugging Intelligent Complet

**IMPÉRATIF:** Utiliser workflow structuré selon complexité bug.

**Workflow Adaptatif:**

```typescript
// Workflow debugging intelligent
async function debugIntelligently(
  error: Error,
  context: Context
): Promise<DebugSolution> {
  // ÉTAPE 1: CLASSIFICATION ERREUR
  const classification = await classifyError(error, context);
  
  // ÉTAPE 2: SÉLECTION NIVEAU DEBUGGING
  const level = selectDebuggingLevel(classification);
  
  // ÉTAPE 3: APPLICATION NIVEAU APPROPRIÉ
  let solution: DebugSolution;
  
  switch (level) {
    case 'quick':
      // Diagnostic rapide
      const quick = await new QuickDiagnoser().diagnose(error, context);
      solution = quick.knownSolution 
        ? await applyKnownSolution(quick.knownSolution)
        : await escalateToNext(error, context);
      break;
      
    case 'root-cause':
      // Analyse cause racine
      const rootCause = await new RootCauseDebugger().debug(error, context);
      solution = await implementSolution(rootCause.solution);
      break;
      
    case 'systemic':
      // Debugging systémique
      const systemic = await new SystemicDebugger().debug(error, context);
      solution = await implementSystemicSolution(systemic.systemicSolution);
      break;
      
    case 'predictive':
      // Debugging prédictif + correction
      const predictive = await new PredictiveDebugger().predict(
        context.codebase,
        context.bugHistory
      );
      solution = await implementWithPrevention(error, predictive.preventions);
      break;
  }
  
  // ÉTAPE 4: VALIDATION SOLUTION
  const validation = await validateSolution(solution, error, context);
  
  // ÉTAPE 5: MÉTA-APPRENTISSAGE
  const metaLearning = await learnFromDebugging({
    error,
    level,
    solution,
    validation
  });
  
  // ÉTAPE 6: SAUVEGARDE POUR FUTUR
  await saveDebugLearning(metaLearning);
  
  return {
    error,
    level,
    solution,
    validation,
    metaLearning
  };
}
```

---

## 💡 Techniques Avancées de Debugging

### Technique 1 : Binary Search Debugging

**Usage:** Localiser bug par dichotomie dans code.

**Pattern:**
```typescript
// Binary search debugging
async function binarySearchDebug(
  code: CodeRange,
  error: Error
): Promise<BugLocation> {
  // Diviser code en 2 moitiés
  const [half1, half2] = divide(code);
  
  // Tester première moitié
  const half1Works = await testCode(half1);
  
  if (!half1Works) {
    // Bug dans première moitié → récursion
    return await binarySearchDebug(half1, error);
  } else {
    // Bug dans deuxième moitié → récursion
    return await binarySearchDebug(half2, error);
  }
}
```

### Technique 2 : Rubber Duck Debugging (avec Méta-Cognition)

**Usage:** Expliquer problème pour clarifier pensée.

**Pattern:**
```typescript
// Rubber duck avec méta-cognition
async function rubberDuckDebug(
  problem: Problem,
  context: Context
): Promise<Insight[]> {
  const insights: Insight[] = [];
  
  // Expliquer étape par étape
  const explanation = await this.explainProblemStepByStep(problem);
  
  // Identifier moments de confusion
  const confusions = explanation.filter(step => step.clarity < 0.7);
  
  // Insights souvent dans moments de confusion
  for (const confusion of confusions) {
    const insight = await this.analyzeConfusion(confusion, problem);
    if (insight) insights.push(insight);
  }
  
  return insights;
}
```

### Technique 3 : Time-Travel Debugging

**Usage:** Analyser état système à différents points dans le temps.

**Pattern:**
```typescript
// Time-travel debugging
interface TimeTravelDebugging {
  timeline: TimelineEvent[];
  criticalMoments: Moment[];
  stateAtMoments: SystemState[];
  divergencePoint: Moment; // Moment où état diverge d'attendu
  solution: Solution;
}

class TimeTravelDebugger {
  async debug(
    error: Error,
    context: Context
  ): Promise<TimeTravelDebugging> {
    // 1. Reconstruire timeline
    const timeline = await this.reconstructTimeline(error, context);
    
    // 2. Identifier moments critiques
    const criticalMoments = await this.identifyCriticalMoments(timeline);
    
    // 3. Capturer état à chaque moment
    const stateAtMoments = await Promise.all(
      criticalMoments.map(m => this.captureStateAt(m, context))
    );
    
    // 4. Identifier point de divergence
    const divergencePoint = await this.findDivergencePoint(
      stateAtMoments,
      context.expectedBehavior
    );
    
    // 5. Corriger à point de divergence
    const solution = await this.correctAtDivergence(divergencePoint);
    
    return {
      timeline,
      criticalMoments,
      stateAtMoments,
      divergencePoint,
      solution
    };
  }
}
```

---

## 🎯 Strategies Debugging par Type d'Erreur

### Erreurs TypeScript

**Stratégie:**
```typescript
{
  step1: 'Lire erreur TypeScript complètement',
  step2: 'Vérifier types impliqués',
  step3: 'Comprendre expected vs actual type',
  step4: 'Tracer origine de type incorrect',
  step5: 'Corriger à la source (pas casting)',
  validation: 'Type-check doit passer'
}
```

### Erreurs Runtime

**Stratégie:**
```typescript
{
  step1: 'Analyser stack trace complet',
  step2: 'Identifier ligne exacte erreur',
  step3: 'Vérifier état variables à ce point',
  step4: 'Tracer flow jusqu\'à état problématique',
  step5: 'Corriger avec validation',
  prevention: 'Ajouter assertions ou validation préventive'
}
```

### Erreurs Async/Promise

**Stratégie:**
```typescript
{
  step1: 'Vérifier tous await présents',
  step2: 'Vérifier error handling (.catch ou try-catch)',
  step3: 'Analyser chaîne promises',
  step4: 'Vérifier race conditions',
  step5: 'Implémenter error handling robuste',
  pattern: 'Utiliser asyncHandler pour routes'
}
```

### Erreurs Base de Données

**Stratégie:**
```typescript
{
  step1: 'Lire erreur DB (constraint violation, etc.)',
  step2: 'Analyser requête SQL générée (si ORM)',
  step3: 'Vérifier données input',
  step4: 'Vérifier schéma DB',
  step5: 'Corriger requête ou validation',
  validation: 'Test avec données edge cases'
}
```

---

## 💡 Exemples Concrets - Projet Saxium

### Exemple 1 : Debug Timeout Pipeline ChatbotOrchestrationService

**Erreur:** `TimeoutError: Pipeline exceeded 30s timeout`

**Application Debugging Systémique:**

```typescript
// ANALYSE SYSTÉMIQUE
{
  systemMap: {
    components: [
      'ChatbotOrchestrationService',
      'AIService (Claude/GPT)',
      'ContextBuilder',
      'ActionExecutor'
    ],
    parallelOperations: [
      'AI call',
      'Context building',
      'Action validation'
    ]
  },
  
  // Identification goulot
  bottleneck: {
    component: 'AIService',
    operation: 'generateResponse',
    averageLatency: '25s', // ← Problème!
    variability: 'high' // 5s à 45s
  },
  
  // Cause racine systémique
  rootCause: 'Pas de timeout adaptatif par provider AI',
  
  // Solution systémique
  solution: {
    level1: 'Timeout adaptatif par provider (Claude: 20s, GPT: 15s)',
    level2: 'Fallback automatique si timeout (Claude → GPT)',
    level3: 'Circuit breaker si provider down',
    level4: 'Cache responses fréquentes',
    validation: 'P99 latency < 10s'
  },
  
  // Prévention future
  prevention: {
    monitoring: 'Track P50, P95, P99 latency par provider',
    alerting: 'Alert si P95 > 15s',
    autoScaling: 'Load balancing entre providers'
  }
}
```

### Exemple 2 : Debug Memory Leak StorageFacade

**Erreur:** `Memory usage gradually increasing over time`

**Application Time-Travel Debugging:**

```typescript
// TIME-TRAVEL ANALYSIS
{
  timeline: [
    { time: 'T0', memoryUsage: '150MB', operation: 'Server start' },
    { time: 'T+1h', memoryUsage: '180MB', operation: '100 requests' },
    { time: 'T+2h', memoryUsage: '220MB', operation: '200 requests' },
    { time: 'T+4h', memoryUsage: '310MB', operation: '400 requests' }
  ],
  
  // Pattern détecté
  pattern: 'Linear growth ~40MB/100 requests',
  
  // Moments critiques
  criticalMoments: [
    'Après chaque batch operation',
    'Cache non-invalidé après operation'
  ],
  
  // Point de divergence
  divergencePoint: {
    moment: 'Batch operations completion',
    expected: 'Memory released after operation',
    actual: 'Memory retained (leak)',
    cause: 'Event listeners non-cleaned'
  },
  
  // Solution
  solution: {
    fix: 'Cleanup event listeners after operation',
    implementation: 'Use WeakMap for event handlers',
    validation: 'Memory usage stable après 1000 requests'
  }
}
```

### Exemple 3 : Debug Race Condition EventBus

**Erreur:** `Intermittent: Events processed out of order`

**Application Debugging Systémique:**

```typescript
// RACE CONDITION ANALYSIS
{
  scenario: {
    event1: 'project.updated',
    event2: 'project.cache.invalidate',
    expected: 'event1 → event2',
    actual: 'Parfois event2 → event1'
  },
  
  // Analyse timing
  timingAnalysis: {
    event1Processing: '50ms average',
    event2Processing: '10ms average',
    problem: 'event2 plus rapide peut finir avant event1',
    concurrency: 'Events processed in parallel'
  },
  
  // Cause racine
  rootCause: 'EventBus pas de garantie ordering',
  
  // Solution systémique
  solution: {
    approach: 'Event ordering garanteed',
    implementation: [
      'Sequential processing pour events liés',
      'Dependency graph pour events',
      'Versioning optimistic',
      'Event correlation ID'
    ],
    validation: 'Tests concurrence 1000 iterations'
  },
  
  // Prévention généralisée
  prevention: {
    pattern: 'Toujours définir dépendances entre events',
    validation: 'Tests race conditions pour toute async operation',
    monitoring: 'Track event ordering violations'
  }
}
```

---

## 🧪 Debugging REPL Intégré (Conceptuel)

**Capacités de debugging interactif:**

```typescript
// REPL debugging conceptuel
class DebugREPL {
  // Inspecter variable
  async inspect(variableName: string, context: Context): Promise<any> {
    return await evaluateInContext(variableName, context);
  }
  
  // Exécuter code test
  async execute(code: string, context: Context): Promise<any> {
    return await safeExecute(code, context);
  }
  
  // Poser point d'arrêt conceptuel
  async breakpoint(location: CodeLocation, condition?: string): Promise<void> {
    await setConceptualBreakpoint(location, condition);
  }
  
  // Analyser heap
  async analyzeHeap(): Promise<HeapSnapshot> {
    return await captureHeapSnapshot();
  }
}
```

---

## 📊 Métriques Debugging Intelligent

**TOUJOURS tracker:**
- ✅ Temps moyen résolution par niveau
- ✅ Taux succès première tentative
- ✅ Récurrence bugs évitée
- ✅ Qualité solutions (robustesse)
- ✅ Apprentissages extraits

**Tableau de bord:**
```typescript
{
  quickDiagnosis: {
    avgTime: '2 min',
    successRate: 0.85,
    recurrence: 0.1
  },
  rootCauseAnalysis: {
    avgTime: '15 min',
    successRate: 0.95,
    recurrence: 0.02
  },
  systemicDebugging: {
    avgTime: '45 min',
    successRate: 0.98,
    recurrence: 0.01
  }
}
```

---

## 🎯 Objectifs d'Excellence Debugging

**Standards:**
- ✅ Succès première tentative > 90%
- ✅ Temps résolution optimal (pas de tâtonnement)
- ✅ Récurrence évitée > 95%
- ✅ Cause racine identifiée > 90% (pas symptôme)
- ✅ Au moins 1 apprentissage par bug complexe

**Référence:** `@.cursor/rules/quality-principles.md` - Principes de qualité

---

## 🔗 Intégration avec Autres Capacités

### Avec Méta-Cognition
- Auto-évaluer stratégie debugging
- Apprendre de bugs résolus/non-résolus
- Identifier biais dans diagnostic

### Avec Systems Thinking
- Comprendre bugs systémiques
- Identifier boucles causant bugs
- Leviers optimaux pour corrections

### Avec Cognitive Frameworks
- 5 Whys pour cause racine
- First Principles pour solutions innovantes
- OODA Loop pour debugging itératif

### Avec Holistic Analysis
- Impacts corrections multi-dimensionnels
- Validation holistique solutions
- Prévention bugs transversaux

---

**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29  
**Prochaine révision:** Selon feedback et résultats

