# Résolution de Problèmes Avancée - Saxium

<!-- 
Context: problem-solving, advanced-techniques, systematic-resolution, creative-solutions
Priority: P1
Auto-load: when task involves complex problem solving or requires creative solutions
Dependencies: meta-cognition.md, cognitive-frameworks.md, systems-thinking.md, root-cause-analysis.md
-->

**Objectif:** Doter l'agent de techniques avancées de résolution de problèmes pour traiter efficacement les problèmes complexes, ambigus ou sans solution évidente.

**Référence:** [Cursor Rules Documentation](https://docs.cursor.com/context/rules)  
**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

## 🎯 Principe Fondamental

**IMPÉRATIF:** L'agent DOIT utiliser des techniques systématiques et créatives pour résoudre les problèmes complexes, en combinant analyse rigoureuse et pensée divergente.

**Bénéfices:**
- ✅ Résolution systématique problèmes complexes
- ✅ Solutions créatives et innovantes
- ✅ Approche structurée évitant tâtonnements
- ✅ Prévention récurrence problèmes
- ✅ Apprentissage continu from résolutions

**Référence:** `@.cursor/rules/root-cause-analysis.md` - Analyse cause racine  
**Référence:** `@.cursor/rules/cognitive-frameworks.md` - Frameworks cognitifs  
**Référence:** `@.cursor/rules/bug-resolution-strategy.md` - Stratégie résolution bugs

## 📋 Techniques de Résolution Avancées

### Technique 1 : Décomposition Récursive (Recursive Decomposition)

**Usage:** Décomposer problème complexe en sous-problèmes plus simples.

**TOUJOURS:**
- ✅ Décomposer jusqu'à sous-problèmes atomiques
- ✅ Résoudre chaque sous-problème indépendamment
- ✅ Recomposer solution globale
- ✅ Valider que recomposition résout problème initial

**Pattern:**
```typescript
// Décomposition récursive
interface ProblemDecomposition {
  originalProblem: Problem;
  subProblems: SubProblem[];
  solutions: Solution[];
  composition: CompositeSolution;
  validation: ValidationResult;
}

class RecursiveDecomposer {
  async decompose(problem: Problem): Promise<ProblemDecomposition> {
    // 1. Vérifier si problème est atomique
    if (await this.isAtomic(problem)) {
      return {
        originalProblem: problem,
        subProblems: [],
        solutions: [await this.solveDirect(problem)],
        composition: null,
        validation: null
      };
    }
    
    // 2. Décomposer en sous-problèmes
    const subProblems = await this.breakDown(problem);
    
    // 3. Résoudre récursivement chaque sous-problème
    const subSolutions = await Promise.all(
      subProblems.map(sp => this.decompose(sp))
    );
    
    // 4. Recomposer solution
    const composition = await this.compose(
      subSolutions.map(s => s.solutions).flat(),
      problem
    );
    
    // 5. Valider solution globale
    const validation = await this.validate(composition, problem);
    
    return {
      originalProblem: problem,
      subProblems,
      solutions: subSolutions.map(s => s.solutions).flat(),
      composition,
      validation
    };
  }
  
  private async isAtomic(problem: Problem): Promise<boolean> {
    // Un problème est atomique si:
    // - Solution évidente en 1 étape
    // - Pas de dépendances complexes
    // - Scope bien défini
    return (
      problem.complexity < 2 &&
      problem.dependencies.length === 0 &&
      problem.scope === 'well-defined'
    );
  }
}
```

**Exemple - Saxium:**
```typescript
// Problème: "Optimiser performance chatbot"
// Décomposition:
{
  subProblems: [
    'Optimiser latence AI calls',      // Atomique
    'Optimiser cache responses',        // Atomique
    'Optimiser parsing user input',     // Atomique
    'Optimiser context building'        // Peut être décomposé encore
  ]
}
```

---

### Technique 2 : Inversion du Problème (Problem Inversion)

**Usage:** Inverser le problème pour trouver solutions non-évidentes.

**TOUJOURS:**
- ✅ Formuler problème inversé
- ✅ Résoudre problème inversé
- ✅ Inverser solution pour obtenir solution originale
- ✅ Comparer avec solutions directes

**Pattern:**
```typescript
// Inversion problème
interface ProblemInversion {
  original: Problem;
  inverted: Problem;
  invertedSolution: Solution;
  originalSolution: Solution;
  insights: Insight[];
}

class ProblemInverter {
  async invert(problem: Problem): Promise<ProblemInversion> {
    // 1. Inverser problème
    const inverted = this.invertProblem(problem);
    // Ex: "Comment améliorer X?" → "Comment empirer X?"
    
    // 2. Résoudre problème inversé
    const invertedSolution = await this.solve(inverted);
    
    // 3. Inverser solution
    const originalSolution = this.invertSolution(invertedSolution);
    
    // 4. Extraire insights
    const insights = await this.extractInsights({
      original: problem,
      inverted,
      invertedSolution,
      originalSolution
    });
    
    return {
      original: problem,
      inverted,
      invertedSolution,
      originalSolution,
      insights
    };
  }
}
```

**Exemple - Saxium:**
```typescript
// Problème original: "Comment améliorer robustesse du chatbot?"
// Problème inversé: "Comment rendre chatbot plus fragile?"
// Solutions inversées:
{
  makeFragile: [
    'Ignorer validation inputs',
    'Pas de gestion erreurs',
    'Dépendances non-vérifiées',
    'Pas de timeouts'
  ],
  // Inversion → Solutions robustesse:
  makeRobust: [
    'Validation stricte inputs', // ← Insight!
    'Gestion erreurs exhaustive',
    'Vérification dépendances',
    'Timeouts adaptatifs'
  ]
}
```

---

### Technique 3 : Contraintes comme Opportunités (Constraints as Opportunities)

**Usage:** Transformer contraintes en opportunités d'innovation.

**TOUJOURS:**
- ✅ Lister toutes les contraintes
- ✅ Analyser chaque contrainte positivement
- ✅ Identifier opportunités dans contraintes
- ✅ Concevoir solutions exploitant contraintes

**Pattern:**
```typescript
// Contraintes comme opportunités
interface ConstraintOpportunity {
  constraint: Constraint;
  traditionalView: string;
  opportunityView: string;
  innovation: Innovation;
}

class ConstraintTransformer {
  async transformConstraints(
    constraints: Constraint[],
    problem: Problem
  ): Promise<ConstraintOpportunity[]> {
    return await Promise.all(
      constraints.map(async constraint => {
        // 1. Vue traditionnelle (négative)
        const traditionalView = this.analyzeAsLimitation(constraint);
        
        // 2. Vue opportunité (positive)
        const opportunityView = await this.analyzeAsOpportunity(constraint);
        
        // 3. Innovation exploitant contrainte
        const innovation = await this.designInnovation(
          constraint,
          opportunityView,
          problem
        );
        
        return {
          constraint,
          traditionalView,
          opportunityView,
          innovation
        };
      })
    );
  }
}
```

**Exemple - Saxium:**
```typescript
// Contrainte: "Limite contexte Cursor 1M tokens"
// Vue traditionnelle: "On ne peut pas tout charger"
// Vue opportunité: "Forcer sélection intelligente et optimisation"
// Innovation:
{
  name: 'Intelligent Context Management',
  features: [
    'Préchargement prédictif',
    'Compression sémantique',
    'Cache intelligent',
    'Lazy loading contextuel'
  ],
  result: 'Meilleure performance qu\'avec contexte illimité'
}
```

---

### Technique 4 : Analogies Cross-Domain (Cross-Domain Analogies)

**Usage:** Emprunter solutions de domaines différents.

**TOUJOURS:**
- ✅ Identifier domaines analogues
- ✅ Rechercher solutions dans domaines analogues
- ✅ Adapter solutions au contexte actuel
- ✅ Valider applicabilité

**Pattern:**
```typescript
// Analogies cross-domain
interface CrossDomainAnalogy {
  sourceDomain: Domain;
  targetDomain: Domain;
  analogy: Analogy;
  adaptedSolution: Solution;
  applicability: number;
}

class AnalogyFinder {
  async findAnalogies(
    problem: Problem,
    context: Context
  ): Promise<CrossDomainAnalogy[]> {
    // 1. Abstraire problème (niveau conceptuel)
    const abstractProblem = await this.abstract(problem);
    
    // 2. Identifier domaines analogues
    const analogousDomains = await this.findAnalogousDomains(
      abstractProblem,
      context
    );
    
    // 3. Rechercher solutions dans domaines analogues
    const analogies: CrossDomainAnalogy[] = [];
    
    for (const domain of analogousDomains) {
      const solutions = await this.findSolutionsInDomain(
        abstractProblem,
        domain
      );
      
      for (const solution of solutions) {
        const adapted = await this.adaptSolution(solution, context);
        const applicability = await this.assessApplicability(adapted, problem);
        
        if (applicability > 0.6) {
          analogies.push({
            sourceDomain: domain,
            targetDomain: context.domain,
            analogy: { abstract: abstractProblem, concrete: problem },
            adaptedSolution: adapted,
            applicability
          });
        }
      }
    }
    
    return analogies.sort((a, b) => b.applicability - a.applicability);
  }
}
```

**Exemple - Saxium:**
```typescript
// Problème: "Gestion files d'attente tâches async"
// Domaine source: "Restaurants - gestion commandes cuisine"
// Analogie:
{
  sourceDomain: 'Restaurant kitchen management',
  solutions: [
    'Priorisation commandes (urgentes vs normales)',
    'Stations parallèles (entrées, plats, desserts)',
    'Buffer entre prise commande et préparation'
  ],
  // Adaptation au contexte Saxium:
  adapted: [
    'Priorisation tâches (critiques vs normales)', // ← Insight!
    'Workers parallèles par type tâche',
    'Queue avec backpressure'
  ],
  applicability: 0.85
}
```

---

### Technique 5 : Pensée Divergente puis Convergente

**Usage:** Générer multiples solutions puis sélectionner optimale.

**Phase 1 - Divergente (Brainstorming):**
- ✅ Suspendre jugement
- ✅ Générer maximum d'idées
- ✅ Encourager créativité
- ✅ Pas de filtrage

**Phase 2 - Convergente (Sélection):**
- ✅ Évaluer chaque idée
- ✅ Filtrer selon critères
- ✅ Combiner meilleures idées
- ✅ Sélectionner solution optimale

**Pattern:**
```typescript
// Divergent-Convergent Thinking
interface DivergentConvergentProcess {
  divergentPhase: Idea[];
  evaluationCriteria: Criteria[];
  convergentPhase: EvaluatedIdea[];
  selectedSolution: Solution;
  combinedSolution?: Solution;
}

class DivergentConvergentThinker {
  async solve(problem: Problem, context: Context): Promise<DivergentConvergentProcess> {
    // PHASE 1: DIVERGENTE - Générer idées
    const ideas = await this.brainstorm(problem, context, {
      quantity: 20, // Minimum 20 idées
      quality: 'defer', // Ne pas juger pendant brainstorming
      creativity: 'high',
      timeLimit: '10 min'
    });
    
    // PHASE 2: CONVERGENTE - Évaluer et sélectionner
    const criteria = [
      { name: 'robustesse', weight: 0.4 },
      { name: 'maintenabilité', weight: 0.3 },
      { name: 'performance', weight: 0.3 }
    ];
    
    const evaluated = await Promise.all(
      ideas.map(idea => this.evaluate(idea, criteria, context))
    );
    
    // Sélectionner top 3
    const top3 = evaluated.sort((a, b) => b.score - a.score).slice(0, 3);
    
    // Essayer de combiner meilleures idées
    const combined = await this.tryCombine(top3, problem);
    
    return {
      divergentPhase: ideas,
      evaluationCriteria: criteria,
      convergentPhase: evaluated,
      selectedSolution: combined || top3[0].solution,
      combinedSolution: combined
    };
  }
}
```

---

## 🔄 Workflow Résolution Problèmes Avancé

**IMPÉRATIF:** Utiliser workflow systématique pour problèmes complexes.

**Workflow Complet:**

```typescript
// Workflow résolution avancé
async function solveAdvanced(
  problem: ComplexProblem,
  context: Context
): Promise<AdvancedSolution> {
  // ÉTAPE 1: ANALYSE PROBLÈME
  const analysis = await analyzeProblemDeeply(problem, context);
  
  // ÉTAPE 2: SÉLECTION TECHNIQUES
  const techniques = await selectTechniques(analysis, context);
  
  // ÉTAPE 3: APPLICATION TECHNIQUES EN PARALLÈLE
  const [
    decomposition,
    inversion,
    constraints,
    analogies,
    divergent
  ] = await Promise.all([
    techniques.includes('decomposition') 
      ? new RecursiveDecomposer().decompose(problem) 
      : null,
    techniques.includes('inversion') 
      ? new ProblemInverter().invert(problem) 
      : null,
    techniques.includes('constraints') 
      ? new ConstraintTransformer().transformConstraints(problem.constraints, problem) 
      : null,
    techniques.includes('analogies') 
      ? new AnalogyFinder().findAnalogies(problem, context) 
      : null,
    techniques.includes('divergent') 
      ? new DivergentConvergentThinker().solve(problem, context) 
      : null
  ]);
  
  // ÉTAPE 4: SYNTHÈSE SOLUTIONS
  const synthesis = await synthesizeSolutions({
    decomposition,
    inversion,
    constraints,
    analogies,
    divergent
  });
  
  // ÉTAPE 5: VALIDATION MULTI-CRITÈRES
  const validation = await validateMultiCriteria(
    synthesis.recommendedSolution,
    problem,
    context
  );
  
  // ÉTAPE 6: MÉTA-APPRENTISSAGE
  const metaLearning = await extractMetaLearning({
    problem,
    techniques,
    synthesis,
    validation
  });
  
  return {
    problem,
    techniquesUsed: techniques,
    solutions: synthesis.allSolutions,
    recommendedSolution: synthesis.recommendedSolution,
    validation,
    metaLearning
  };
}
```

---

## 💡 Exemples Concrets - Projet Saxium

### Exemple 1 : Résolution Bug Complexe ChatbotOrchestrationService

**Problème:** Timeouts aléatoires dans pipeline parallèle.

**Application Technique Décomposition:**

```typescript
// DÉCOMPOSITION RÉCURSIVE
{
  level1: 'Timeouts pipeline parallèle',
  level2: [
    'Timeout AI provider',
    'Timeout context building',
    'Timeout action execution'
  ],
  level3: {
    'Timeout AI provider': [
      'Latence réseau',
      'Quota rate limiting',
      'Réponse lente modèle'
    ],
    'Timeout context building': [
      'Requêtes DB lentes',
      'Cache misses',
      'Calculs synchrones'
    ]
  },
  // Solutions atomiques:
  solutions: [
    'Retry avec backoff exponentiel', // Pour latence réseau
    'Circuit breaker', // Pour rate limiting
    'Timeout adaptatif', // Pour réponses lentes
    'Optimiser requêtes DB', // Pour DB lentes
    'Préchargement cache', // Pour cache misses
    'Async context building' // Pour calculs sync
  ],
  // Solution composée optimale
  composed: 'Pipeline async + Circuit breaker + Timeout adaptatif + Cache'
}
```

### Exemple 2 : Innovation Feature Planning Chantier

**Problème:** Créer planning intelligent avec IA.

**Application Technique Analogies:**

```typescript
// ANALOGIES CROSS-DOMAIN
{
  analogousDomains: [
    'Project management software (MS Project)',
    'Calendar apps (Google Calendar)',
    'Manufacturing planning (MRP)',
    'Restaurant reservations'
  ],
  bestAnalogies: [
    {
      source: 'Manufacturing MRP',
      solution: 'Backward scheduling from deadline',
      adapted: 'Planifier chantier from date livraison en arrière',
      applicability: 0.9
    },
    {
      source: 'Google Calendar',
      solution: 'Smart suggestions based on patterns',
      adapted: 'Suggestions IA basées sur historique chantiers similaires',
      applicability: 0.85
    }
  ],
  innovation: 'Combinaison backward scheduling + IA prédictive'
}
```

### Exemple 3 : Optimisation Storage-POC.ts (3415 lignes)

**Problème:** Fichier monolithique difficile à maintenir.

**Application Technique Inversion:**

```typescript
// INVERSION PROBLÈME
{
  original: 'Comment refactorer storage-poc.ts efficacement?',
  inverted: 'Comment rendre storage-poc.ts encore plus difficile à maintenir?',
  invertedSolutions: [
    'Ajouter encore plus de responsabilités',
    'Mélanger encore plus les concerns',
    'Ajouter couplage fort',
    'Pas de documentation'
  ],
  // Inversion → Solutions refactoring:
  refactoringSolutions: [
    'Séparer responsabilités (SRP)', // ← Insight principal!
    'Découpler concerns (modules)',
    'Réduire couplage (interfaces)',
    'Documenter clairement'
  ],
  // Application concrète:
  strategy: {
    step1: 'Identifier responsabilités distinctes (15+ trouvées)',
    step2: 'Créer module par responsabilité (server/storage/*)',
    step3: 'Migrer progressivement fonction par fonction',
    step4: 'Valider tests après chaque migration'
  }
}
```

---

## 🎯 Matrice de Sélection Technique

**Guide de sélection selon type de problème:**

| Type Problème | Technique Recommandée | Frameworks | Complexité |
|---------------|----------------------|------------|-----------|
| **Complexe et flou** | Décomposition récursive | First Principles | High |
| **Besoin créativité** | Divergent-Convergent | Six Hats, Design Thinking | Medium-High |
| **Solution non-évidente** | Inversion | SWOT, First Principles | Medium |
| **Optimisation** | Contraintes → Opportunités | Systems Thinking | Medium |
| **Innovation** | Analogies cross-domain | Design Thinking | High |
| **Bug récurrent** | 5 Whys + Learning Memory | 5 Whys, OODA | Low-Medium |
| **Décision stratégique** | Multi-techniques | SWOT, Six Hats, Systems | High |

---

## 📊 Métriques Résolution Avancée

**TOUJOURS tracker:**
- ✅ Technique(s) utilisée(s)
- ✅ Temps résolution
- ✅ Qualité solution (robustesse, maintenabilité)
- ✅ Créativité solution (score 1-10)
- ✅ Récurrence problème évitée (oui/non)

---

## 🎓 Best Practices

**TOUJOURS:**
- ✅ Combiner au moins 2 techniques pour problèmes complexes
- ✅ Valider solution avec framework SWOT minimum
- ✅ Documenter raisonnement pour traçabilité
- ✅ Extraire meta-learning pour problèmes similaires futurs
- ✅ Préférer solutions robustes vs rapides

**NE JAMAIS:**
- ❌ Utiliser première solution venue
- ❌ Ignorer contraintes dans solution
- ❌ Négliger validation multi-critères
- ❌ Oublier documentation raisonnement

---

## 🎯 Objectifs d'Excellence

**Standards:**
- ✅ Au moins 2 techniques utilisées pour problèmes complexes
- ✅ Qualité solutions > 0.9
- ✅ Créativité solutions > 7/10
- ✅ Récurrence évitée > 90%
- ✅ Temps résolution optimal (pas de tâtonnement)

**Référence:** `@.cursor/rules/quality-principles.md` - Principes de qualité

---

**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29  
**Prochaine révision:** Selon feedback et résultats

