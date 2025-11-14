# Frameworks Cognitifs Avancés - Saxium

<!-- 
Context: cognitive-frameworks, advanced-thinking, problem-solving, decision-making, reasoning
Priority: P1
Auto-load: when task requires advanced cognitive reasoning or complex problem solving
Dependencies: meta-cognition.md, holistic-analysis.md, autonomous-decision-making.md
-->

**Objectif:** Doter l'agent de frameworks cognitifs avancés pour structurer sa pensée, résoudre des problèmes complexes et prendre des décisions optimales de manière systématique.

**Référence:** [Cursor Rules Documentation](https://docs.cursor.com/context/rules)  
**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

## 🎯 Principe Fondamental

**IMPÉRATIF:** L'agent DOIT utiliser des frameworks cognitifs structurés pour organiser sa pensée, analyser les problèmes de manière systématique et prendre des décisions robustes.

**Bénéfices:**
- ✅ Pensée structurée et systématique
- ✅ Résolution de problèmes méthodique
- ✅ Décisions robustes et justifiées
- ✅ Réduction des biais cognitifs
- ✅ Amélioration continue des processus
- ✅ Traçabilité du raisonnement

**Référence:** `@.cursor/rules/meta-cognition.md` - Méta-cognition  
**Référence:** `@.cursor/rules/holistic-analysis.md` - Analyse holistique  
**Référence:** `@.cursor/rules/autonomous-decision-making.md` - Prise de décision autonome

## 📋 Frameworks Cognitifs Disponibles

### Framework 1 : First Principles Thinking (Pensée par Premiers Principes)

**Usage:** Déconstruire problèmes complexes en vérités fondamentales.

**QUAND utiliser:**
- Problème complexe sans solution évidente
- Besoin de repenser approche from scratch
- Remise en question d'hypothèses établies

**TOUJOURS:**
- ✅ Identifier et challenger toutes les hypothèses
- ✅ Déconstruire jusqu'aux vérités fondamentales
- ✅ Reconstruire solution from first principles
- ✅ Valider que chaque étape est logiquement solide

**Pattern:**
```typescript
// First Principles Thinking
interface FirstPrinciplesAnalysis {
  problem: Problem;
  assumptions: Assumption[];
  fundamentalTruths: FundamentalTruth[];
  reconstruction: Solution;
  validation: ValidationResult;
}

class FirstPrinciplesFramework {
  async analyze(problem: Problem): Promise<FirstPrinciplesAnalysis> {
    // 1. Identifier toutes les hypothèses
    const assumptions = await this.identifyAssumptions(problem);
    
    // 2. Challenger chaque hypothèse
    const validatedAssumptions = await this.challengeAssumptions(assumptions);
    
    // 3. Identifier vérités fondamentales
    const fundamentalTruths = await this.extractFundamentalTruths(
      problem,
      validatedAssumptions
    );
    
    // 4. Reconstruire solution
    const reconstruction = await this.reconstructSolution(
      fundamentalTruths,
      problem
    );
    
    // 5. Valider logique
    const validation = await this.validateLogic(reconstruction);
    
    return {
      problem,
      assumptions,
      fundamentalTruths,
      reconstruction,
      validation
    };
  }
}
```

**Exemple d'application:**
```typescript
// Problème: "Comment optimiser performance du chatbot?"
// First Principles:
// - Vérité 1: Performance = latence + throughput + ressources
// - Vérité 2: Latence dépend de I/O, calcul, réseau
// - Vérité 3: Optimisation peut être async, cache, parallélisation
// → Solution reconstruite: Pipeline async + cache intelligent + parallélisation
```

---

### Framework 2 : OODA Loop (Observe-Orient-Decide-Act)

**Usage:** Cycles rapides d'adaptation et de décision.

**QUAND utiliser:**
- Environnement changeant rapidement
- Besoin d'adaptation continue
- Situations nécessitant agilité

**TOUJOURS:**
- ✅ **Observe** - Collecter données actuelles du contexte
- ✅ **Orient** - Analyser données avec contexte et expérience
- ✅ **Decide** - Prendre décision basée sur analyse
- ✅ **Act** - Exécuter décision rapidement
- ✅ Boucler continuellement pour adapter

**Pattern:**
```typescript
// OODA Loop
interface OODAIteration {
  observe: Observation;
  orient: Orientation;
  decide: Decision;
  act: Action;
  feedback: Feedback;
}

class OODALoopFramework {
  async iterate(context: Context): Promise<OODAIteration> {
    // OBSERVE: Collecter données
    const observe = await this.observeCurrentState(context);
    
    // ORIENT: Analyser avec contexte et expérience
    const orient = await this.orientWithExperience(
      observe,
      context.experience,
      context.mentalModels
    );
    
    // DECIDE: Prendre décision
    const decide = await this.makeDecision(orient, context.objectives);
    
    // ACT: Exécuter
    const act = await this.executeAction(decide, context);
    
    // FEEDBACK: Collecter retours pour prochaine itération
    const feedback = await this.collectFeedback(act, context);
    
    return { observe, orient, decide, act, feedback };
  }
  
  async runContinuousLoop(
    context: Context,
    stopCondition: () => boolean
  ): Promise<OODAIteration[]> {
    const iterations: OODAIteration[] = [];
    
    while (!stopCondition()) {
      const iteration = await this.iterate(context);
      iterations.push(iteration);
      
      // Mettre à jour contexte avec feedback
      context = await this.updateContext(context, iteration.feedback);
      
      // Adapter vitesse de loop selon situation
      await this.adaptLoopSpeed(context, iteration);
    }
    
    return iterations;
  }
}
```

---

### Framework 3 : Six Thinking Hats (6 Chapeaux de Réflexion)

**Usage:** Explorer problème sous 6 perspectives différentes.

**QUAND utiliser:**
- Besoin d'explorer toutes les perspectives
- Décision importante nécessitant réflexion complète
- Éviter biais de perspective unique

**Les 6 Chapeaux:**
1. **🤍 Blanc (Facts)** - Données, faits, informations objectives
2. **🔴 Rouge (Emotions)** - Intuitions, sentiments, réactions émotionnelles
3. **⚫ Noir (Critique)** - Risques, problèmes, points négatifs
4. **💛 Jaune (Optimisme)** - Avantages, opportunités, points positifs
5. **💚 Vert (Créativité)** - Idées nouvelles, alternatives, créativité
6. **🔵 Bleu (Process)** - Vue d'ensemble, organisation, méta-niveau

**Pattern:**
```typescript
// Six Thinking Hats
interface SixHatsAnalysis {
  whiteFacts: FactualAnalysis;
  redEmotions: EmotionalAnalysis;
  blackCritique: CriticalAnalysis;
  yellowOptimism: OptimisticAnalysis;
  greenCreativity: CreativeAnalysis;
  blueProcess: ProcessAnalysis;
  synthesis: ComprehensiveSynthesis;
}

class SixThinkingHatsFramework {
  async analyze(problem: Problem, context: Context): Promise<SixHatsAnalysis> {
    // 🤍 Chapeau Blanc - Faits
    const whiteFacts = await this.analyzeFactually(problem, context);
    
    // 🔴 Chapeau Rouge - Émotions/Intuitions
    const redEmotions = await this.analyzeEmotionally(problem, context);
    
    // ⚫ Chapeau Noir - Critique/Risques
    const blackCritique = await this.analyzeCritically(problem, context);
    
    // 💛 Chapeau Jaune - Optimisme/Opportunités
    const yellowOptimism = await this.analyzeOptimistically(problem, context);
    
    // 💚 Chapeau Vert - Créativité/Alternatives
    const greenCreativity = await this.analyzeCreatively(problem, context);
    
    // 🔵 Chapeau Bleu - Process/Meta
    const blueProcess = await this.analyzeProcessually(
      { whiteFacts, redEmotions, blackCritique, yellowOptimism, greenCreativity },
      problem
    );
    
    // Synthèse complète
    const synthesis = await this.synthesizeAllPerspectives({
      whiteFacts,
      redEmotions,
      blackCritique,
      yellowOptimism,
      greenCreativity,
      blueProcess
    });
    
    return {
      whiteFacts,
      redEmotions,
      blackCritique,
      yellowOptimism,
      greenCreativity,
      blueProcess,
      synthesis
    };
  }
}
```

---

### Framework 4 : SWOT Analysis (Forces-Faiblesses-Opportunités-Menaces)

**Usage:** Évaluation stratégique complète.

**QUAND utiliser:**
- Décision stratégique importante
- Évaluation de solution ou approche
- Planification stratégique

**Pattern:**
```typescript
// SWOT Analysis
interface SWOTAnalysis {
  strengths: Strength[];      // Forces internes
  weaknesses: Weakness[];     // Faiblesses internes
  opportunities: Opportunity[]; // Opportunités externes
  threats: Threat[];          // Menaces externes
  strategicInsights: StrategicInsight[];
}

class SWOTFramework {
  async analyze(
    subject: AnalysisSubject,
    context: Context
  ): Promise<SWOTAnalysis> {
    // Facteurs internes
    const strengths = await this.identifyStrengths(subject, context);
    const weaknesses = await this.identifyWeaknesses(subject, context);
    
    // Facteurs externes
    const opportunities = await this.identifyOpportunities(subject, context);
    const threats = await this.identifyThreats(subject, context);
    
    // Insights stratégiques
    const strategicInsights = await this.generateStrategicInsights({
      strengths,
      weaknesses,
      opportunities,
      threats
    });
    
    return {
      strengths,
      weaknesses,
      opportunities,
      threats,
      strategicInsights
    };
  }
}
```

---

### Framework 5 : 5 Whys (5 Pourquoi)

**Usage:** Analyse cause racine profonde.

**QUAND utiliser:**
- Besoin d'identifier cause racine d'un problème
- Bug ou erreur récurrente
- Amélioration continue

**Pattern:**
```typescript
// 5 Whys
interface FiveWhysAnalysis {
  problem: Problem;
  whyChain: WhyLevel[];
  rootCause: RootCause;
  solutions: Solution[];
}

class FiveWhysFramework {
  async analyze(problem: Problem, context: Context): Promise<FiveWhysAnalysis> {
    const whyChain: WhyLevel[] = [];
    let currentProblem = problem;
    
    // Itérer jusqu'à 5 fois (ou jusqu'à cause racine)
    for (let i = 0; i < 5 && !this.isRootCause(currentProblem); i++) {
      const why = await this.askWhy(currentProblem, context);
      whyChain.push({
        level: i + 1,
        question: `Why ${currentProblem.description}?`,
        answer: why.answer,
        evidence: why.evidence
      });
      currentProblem = why.underlyingProblem;
    }
    
    const rootCause = await this.identifyRootCause(whyChain, context);
    const solutions = await this.proposeSolutions(rootCause, context);
    
    return { problem, whyChain, rootCause, solutions };
  }
}
```

---

### Framework 6 : Design Thinking (5 Étapes)

**Usage:** Approche centrée utilisateur pour innovation.

**QUAND utiliser:**
- Développement nouvelle fonctionnalité
- Amélioration UX
- Innovation produit

**Les 5 Étapes:**
1. **Empathize** - Comprendre utilisateurs profondément
2. **Define** - Définir problème clairement
3. **Ideate** - Générer idées multiples
4. **Prototype** - Créer prototypes rapides
5. **Test** - Tester et itérer

**Pattern:**
```typescript
// Design Thinking
interface DesignThinkingProcess {
  empathize: EmpathyInsights;
  define: ProblemDefinition;
  ideate: Ideas[];
  prototype: Prototypes[];
  test: TestResults;
  iteration: IterationPlan;
}

class DesignThinkingFramework {
  async process(
    userNeed: UserNeed,
    context: Context
  ): Promise<DesignThinkingProcess> {
    // 1. EMPATHIZE - Comprendre utilisateurs
    const empathize = await this.empathizeWithUsers(userNeed, context);
    
    // 2. DEFINE - Définir problème
    const define = await this.defineProblem(empathize, context);
    
    // 3. IDEATE - Générer idées
    const ideate = await this.generateIdeas(define, context);
    
    // 4. PROTOTYPE - Créer prototypes
    const prototype = await this.createPrototypes(ideate, context);
    
    // 5. TEST - Tester prototypes
    const test = await this.testPrototypes(prototype, context);
    
    // ITERATE - Planifier itération
    const iteration = await this.planIteration(test, define);
    
    return { empathize, define, ideate, prototype, test, iteration };
  }
}
```

---

## 🔄 Sélection Automatique du Framework

**IMPÉRATIF:** L'agent DOIT sélectionner automatiquement le framework le plus adapté au contexte.

**Pattern:**
```typescript
// Sélection automatique framework
class CognitiveFrameworkSelector {
  async selectFramework(
    task: Task,
    context: Context
  ): Promise<CognitiveFramework> {
    const analysis = await this.analyzeTaskCharacteristics(task, context);
    
    // Critères de sélection
    if (analysis.needsDeconstruction) {
      return new FirstPrinciplesFramework();
    } else if (analysis.needsRapidAdaptation) {
      return new OODALoopFramework();
    } else if (analysis.needsMultiplePerspectives) {
      return new SixThinkingHatsFramework();
    } else if (analysis.needsStrategicEvaluation) {
      return new SWOTFramework();
    } else if (analysis.needsRootCauseAnalysis) {
      return new FiveWhysFramework();
    } else if (analysis.needsUserCenteredInnovation) {
      return new DesignThinkingFramework();
    } else {
      // Par défaut: First Principles
      return new FirstPrinciplesFramework();
    }
  }
}
```

---

## 📊 Combinaison de Frameworks

**IMPÉRATIF:** Combiner plusieurs frameworks pour analyses complexes.

**Pattern:**
```typescript
// Combinaison frameworks
class MultiFrameworkAnalyzer {
  async analyzeWithMultipleFrameworks(
    problem: ComplexProblem,
    context: Context
  ): Promise<MultiFrameworkAnalysis> {
    // Analyse parallèle avec plusieurs frameworks
    const [
      firstPrinciples,
      sixHats,
      swot
    ] = await Promise.all([
      new FirstPrinciplesFramework().analyze(problem),
      new SixThinkingHatsFramework().analyze(problem, context),
      new SWOTFramework().analyze(problem, context)
    ]);
    
    // Synthèse multi-frameworks
    const synthesis = await this.synthesizeFrameworks({
      firstPrinciples,
      sixHats,
      swot
    });
    
    return {
      firstPrinciples,
      sixHats,
      swot,
      synthesis,
      recommendation: await this.generateRecommendation(synthesis)
    };
  }
}
```

---

## 🎯 Métriques Frameworks Cognitifs

**TOUJOURS tracker:**
- ✅ Framework utilisé par tâche
- ✅ Pertinence du framework choisi
- ✅ Qualité de l'analyse framework
- ✅ Impact décisions prises via framework
- ✅ Temps d'exécution framework

---

## 📈 Objectifs d'Excellence

**Standards:**
- ✅ Framework approprié sélectionné > 90% des cas
- ✅ Qualité analyse framework > 0.85
- ✅ Décisions basées sur frameworks > 0.9 de succès
- ✅ Temps exécution framework < 10% temps total tâche
- ✅ Traçabilité raisonnement framework complète

**Référence:** `@.cursor/rules/quality-principles.md` - Principes de qualité

---

**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29  
**Prochaine révision:** Selon feedback et résultats

