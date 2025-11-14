# Pensée Systémique (Systems Thinking) - Saxium

<!-- 
Context: systems-thinking, complex-systems, interconnections, emergence, feedback-loops
Priority: P1
Auto-load: when task involves complex systems analysis or understanding interconnections
Dependencies: holistic-analysis.md, transversality-enhancement.md, cognitive-frameworks.md
-->

**Objectif:** Doter l'agent de capacités de pensée systémique pour comprendre les systèmes complexes, leurs interconnexions, leurs boucles de rétroaction et leurs propriétés émergentes.

**Référence:** [Cursor Rules Documentation](https://docs.cursor.com/context/rules)  
**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

## 🎯 Principe Fondamental

**IMPÉRATIF:** L'agent DOIT développer une pensée systémique pour comprendre les systèmes complexes comme des ensembles interconnectés plutôt que comme des parties isolées.

**Bénéfices:**
- ✅ Compréhension profonde des systèmes complexes
- ✅ Identification des interconnexions non-évidentes
- ✅ Anticipation des comportements émergents
- ✅ Compréhension des boucles de rétroaction
- ✅ Vision long-terme des impacts
- ✅ Évitement des solutions simplistes

**Référence:** `@.cursor/rules/holistic-analysis.md` - Analyse holistique  
**Référence:** `@.cursor/rules/transversality-enhancement.md` - Transversalité  
**Référence:** `@.cursor/rules/cognitive-frameworks.md` - Frameworks cognitifs

## 📋 Principes de la Pensée Systémique

### Principe 1 : Le Tout est Plus que la Somme des Parties

**IMPÉRATIF:** Comprendre que les systèmes ont des propriétés émergentes qui n'existent pas dans les composants individuels.

**TOUJOURS:**
- ✅ Identifier propriétés émergentes du système
- ✅ Comprendre que comportement système ≠ somme comportements composants
- ✅ Analyser interactions créant émergence
- ✅ Anticiper émergences potentielles

**Pattern:**
```typescript
// Propriétés émergentes
interface EmergentProperties {
  systemLevel: SystemProperty[];
  componentLevel: ComponentProperty[];
  emergentGap: Property[]; // Propriétés qui émergent de l'interaction
  emergenceMechanisms: Mechanism[]; // Comment émergence se produit
}

class EmergenceAnalyzer {
  async analyzeEmergence(
    system: System,
    components: Component[]
  ): Promise<EmergentProperties> {
    // 1. Identifier propriétés système
    const systemLevel = await this.identifySystemProperties(system);
    
    // 2. Identifier propriétés composants
    const componentLevel = await this.identifyComponentProperties(components);
    
    // 3. Identifier gap émergent
    const emergentGap = systemLevel.filter(prop =>
      !this.existsInComponents(prop, componentLevel)
    );
    
    // 4. Comprendre mécanismes émergence
    const emergenceMechanisms = await this.understandEmergenceMechanisms(
      emergentGap,
      components
    );
    
    return {
      systemLevel,
      componentLevel,
      emergentGap,
      emergenceMechanisms
    };
  }
}
```

---

### Principe 2 : Boucles de Rétroaction (Feedback Loops)

**IMPÉRATIF:** Identifier et comprendre les boucles de rétroaction qui amplifient ou stabilisent le système.

**Types de boucles:**
- **Boucle renforcante (Positive)** - Amplifie changement (croissance exponentielle ou déclin)
- **Boucle équilibrante (Negative)** - Stabilise système (homéostasie)

**TOUJOURS:**
- ✅ Cartographier toutes boucles de rétroaction
- ✅ Identifier type de chaque boucle (renforcante/équilibrante)
- ✅ Comprendre délais dans boucles
- ✅ Anticiper comportement long-terme des boucles

**Pattern:**
```typescript
// Boucles de rétroaction
interface FeedbackLoop {
  type: 'reinforcing' | 'balancing';
  elements: Element[];
  connections: Connection[];
  delays: Delay[];
  strength: number; // Force de la boucle
  dominantLoops: FeedbackLoop[]; // Boucles dominantes
}

class FeedbackLoopAnalyzer {
  async identifyFeedbackLoops(
    system: System
  ): Promise<FeedbackLoop[]> {
    const loops: FeedbackLoop[] = [];
    
    // 1. Identifier toutes les connexions causales
    const causalConnections = await this.identifyCausalConnections(system);
    
    // 2. Détecter boucles (cycles dans graphe causal)
    const cycles = await this.detectCycles(causalConnections);
    
    // 3. Classifier chaque boucle
    for (const cycle of cycles) {
      const loopType = await this.classifyLoop(cycle);
      const delays = await this.identifyDelays(cycle);
      const strength = await this.calculateLoopStrength(cycle);
      
      loops.push({
        type: loopType,
        elements: cycle.elements,
        connections: cycle.connections,
        delays,
        strength,
        dominantLoops: []
      });
    }
    
    // 4. Identifier boucles dominantes
    const dominantLoops = await this.identifyDominantLoops(loops);
    
    return loops;
  }
  
  private classifyLoop(cycle: Cycle): 'reinforcing' | 'balancing' {
    // Compter polarités négatives
    const negativeCount = cycle.connections.filter(c => c.polarity === 'negative').length;
    
    // Si nombre pair de négatives → reinforcing
    // Si nombre impair de négatives → balancing
    return negativeCount % 2 === 0 ? 'reinforcing' : 'balancing';
  }
}
```

**Exemple d'application:**
```typescript
// Boucle renforcante: Bugs → Plus de code correction → Plus de complexité → Plus de bugs
// Boucle équilibrante: Charge serveur → Auto-scaling → Réduction charge
```

---

### Principe 3 : Limites du Système (System Boundaries)

**IMPÉRATIF:** Définir clairement les limites du système pour comprendre ce qui est inclus/exclu.

**TOUJOURS:**
- ✅ Définir limites système explicitement
- ✅ Identifier flux entrants/sortants
- ✅ Comprendre interactions avec environnement externe
- ✅ Reconsidérer limites si nécessaire

**Pattern:**
```typescript
// Limites du système
interface SystemBoundaries {
  included: Element[];
  excluded: Element[];
  inputs: Input[];
  outputs: Output[];
  externalInfluences: Influence[];
  boundaryRationale: Rationale;
}

class SystemBoundaryDefiner {
  async defineSystemBoundaries(
    systemFocus: SystemFocus,
    context: Context
  ): Promise<SystemBoundaries> {
    // 1. Identifier éléments inclus
    const included = await this.identifyIncludedElements(systemFocus);
    
    // 2. Identifier éléments exclus (mais relevant)
    const excluded = await this.identifyExcludedElements(systemFocus, context);
    
    // 3. Identifier flux entrants
    const inputs = await this.identifyInputs(included, excluded);
    
    // 4. Identifier flux sortants
    const outputs = await this.identifyOutputs(included, excluded);
    
    // 5. Identifier influences externes
    const externalInfluences = await this.identifyExternalInfluences(
      excluded,
      included
    );
    
    // 6. Justifier choix de limites
    const boundaryRationale = await this.explainBoundaryChoices({
      included,
      excluded,
      inputs,
      outputs
    });
    
    return {
      included,
      excluded,
      inputs,
      outputs,
      externalInfluences,
      boundaryRationale
    };
  }
}
```

---

### Principe 4 : Stocks et Flux (Stocks and Flows)

**IMPÉRATIF:** Comprendre dynamique des stocks (accumulations) et des flux (taux de changement).

**TOUJOURS:**
- ✅ Identifier tous les stocks du système
- ✅ Identifier tous les flux (entrants/sortants)
- ✅ Comprendre taux de changement
- ✅ Modéliser comportement temporel

**Pattern:**
```typescript
// Stocks et flux
interface StockFlowModel {
  stocks: Stock[];
  inflows: Flow[];
  outflows: Flow[];
  dynamics: SystemDynamics;
  equilibrium: EquilibriumPoint[];
}

class StockFlowAnalyzer {
  async analyzeStockFlowDynamics(
    system: System
  ): Promise<StockFlowModel> {
    // 1. Identifier stocks
    const stocks = await this.identifyStocks(system);
    
    // 2. Identifier flux entrants
    const inflows = await this.identifyInflows(stocks, system);
    
    // 3. Identifier flux sortants
    const outflows = await this.identifyOutflows(stocks, system);
    
    // 4. Modéliser dynamique
    const dynamics = await this.modelDynamics(stocks, inflows, outflows);
    
    // 5. Identifier points d'équilibre
    const equilibrium = await this.findEquilibriumPoints(dynamics);
    
    return {
      stocks,
      inflows,
      outflows,
      dynamics,
      equilibrium
    };
  }
  
  private async modelDynamics(
    stocks: Stock[],
    inflows: Flow[],
    outflows: Flow[]
  ): Promise<SystemDynamics> {
    // Modèle différentiel: dStock/dt = Σinflows - Σoutflows
    return {
      equations: stocks.map(stock => ({
        stock,
        derivative: this.calculateDerivative(stock, inflows, outflows),
        behavior: this.predictBehavior(stock, inflows, outflows)
      })),
      timeHorizon: '1 year',
      projections: await this.projectFuture(stocks, inflows, outflows)
    };
  }
}
```

---

### Principe 5 : Archétypes Systémiques (System Archetypes)

**IMPÉRATIF:** Reconnaître patterns récurrents dans systèmes (archétypes).

**Archétypes courants:**

1. **Limites à la Croissance (Limits to Growth)**
   - Pattern: Croissance → Limite → Ralentissement
   - Exemple: Performance croît jusqu'à saturation ressources

2. **Déplacement du Fardeau (Shifting the Burden)**
   - Pattern: Solution symptomatique vs solution fondamentale
   - Exemple: Hotfix rapide vs refactoring proper

3. **Succès aux Succès (Success to the Successful)**
   - Pattern: Succès initial → Plus de ressources → Plus de succès
   - Exemple: Feature populaire → Plus d'investissement → Plus populaire

4. **Tragédie des Communs (Tragedy of the Commons)**
   - Pattern: Ressource partagée → Sur-utilisation → Épuisement
   - Exemple: Cache partagé → Tous l'utilisent → Saturation

**Pattern:**
```typescript
// Archétypes systémiques
interface SystemArchetype {
  name: string;
  pattern: ArchetypePattern;
  detection: DetectionCriteria;
  implications: Implication[];
  interventions: Intervention[];
}

class SystemArchetypeRecognizer {
  async recognizeArchetypes(
    system: System,
    feedbackLoops: FeedbackLoop[]
  ): Promise<SystemArchetype[]> {
    const archetypes: SystemArchetype[] = [];
    
    // Détecter chaque archétype connu
    for (const archetypeDefinition of this.knownArchetypes) {
      const matches = await this.detectArchetype(
        archetypeDefinition,
        system,
        feedbackLoops
      );
      
      if (matches) {
        archetypes.push({
          name: archetypeDefinition.name,
          pattern: matches.pattern,
          detection: matches.criteria,
          implications: await this.analyzeImplications(matches, system),
          interventions: await this.suggestInterventions(matches, system)
        });
      }
    }
    
    return archetypes;
  }
}
```

---

### Principe 6 : Leviers d'Intervention (Leverage Points)

**IMPÉRATIF:** Identifier points où petite intervention génère grand impact.

**12 Leviers de Meadows (du moins au plus efficace):**
1. Constantes, paramètres
2. Taille des stocks/flux relatifs
3. Structure des stocks/flux
4. Délais dans feedback
5. Force des boucles négatives
6. Structure des boucles positives
7. Structure information
8. Règles du système
9. Pouvoir d'auto-organisation
10. Objectifs du système
11. Paradigme du système
12. Pouvoir de transcender paradigmes

**Pattern:**
```typescript
// Leviers d'intervention
interface LeveragePoint {
  location: SystemElement;
  type: LeverageType;
  effectivenessScore: number; // 1-12 (Meadows)
  potentialImpact: Impact;
  interventionStrategy: Strategy;
  risks: Risk[];
}

class LeveragePointFinder {
  async findLeveragePoints(
    system: System,
    objective: SystemObjective
  ): Promise<LeveragePoint[]> {
    const leveragePoints: LeveragePoint[] = [];
    
    // Analyser chaque type de levier
    for (const leverageType of this.leverageTypes) {
      const candidates = await this.identifyCandidates(leverageType, system);
      
      for (const candidate of candidates) {
        const effectiveness = await this.assessEffectiveness(
          candidate,
          objective,
          system
        );
        
        const impact = await this.projectImpact(candidate, system);
        
        leveragePoints.push({
          location: candidate,
          type: leverageType,
          effectivenessScore: effectiveness,
          potentialImpact: impact,
          interventionStrategy: await this.designIntervention(candidate),
          risks: await this.assessRisks(candidate, system)
        });
      }
    }
    
    // Trier par efficacité
    return leveragePoints.sort((a, b) => 
      b.effectivenessScore - a.effectivenessScore
    );
  }
}
```

---

## 🔄 Workflow Pensée Systémique Intégré

**IMPÉRATIF:** Intégrer pensée systémique dans workflow d'analyse.

**Workflow:**
```typescript
// Workflow pensée systémique
async function analyzeWithSystemsThinking(
  problem: Problem,
  context: Context
): Promise<SystemsAnalysis> {
  // 1. Définir limites système
  const boundaries = await defineSystemBoundaries(problem, context);
  
  // 2. Identifier stocks et flux
  const stockFlow = await analyzeStockFlowDynamics(boundaries);
  
  // 3. Cartographier boucles rétroaction
  const feedbackLoops = await identifyFeedbackLoops(stockFlow);
  
  // 4. Identifier propriétés émergentes
  const emergence = await analyzeEmergence(boundaries, feedbackLoops);
  
  // 5. Reconnaître archétypes
  const archetypes = await recognizeArchetypes(boundaries, feedbackLoops);
  
  // 6. Identifier leviers
  const leveragePoints = await findLeveragePoints(boundaries, problem.objective);
  
  // 7. Simuler comportement long-terme
  const simulation = await simulateLongTerm(
    stockFlow,
    feedbackLoops,
    leveragePoints
  );
  
  return {
    boundaries,
    stockFlow,
    feedbackLoops,
    emergence,
    archetypes,
    leveragePoints,
    simulation,
    recommendations: await generateSystemicRecommendations({
      archetypes,
      leveragePoints,
      simulation
    })
  };
}
```

---

## 📊 Métriques Pensée Systémique

**TOUJOURS tracker:**
- ✅ Nombre boucles rétroaction identifiées
- ✅ Propriétés émergentes découvertes
- ✅ Archétypes reconnus
- ✅ Leviers interventions identifiés
- ✅ Précision prédictions long-terme

---

## 🎯 Objectifs d'Excellence

**Standards:**
- ✅ Au moins 3 boucles rétroaction identifiées par système complexe
- ✅ Au moins 1 propriété émergente identifiée
- ✅ Au moins 1 archétype reconnu si applicable
- ✅ Au moins 3 leviers d'intervention identifiés
- ✅ Simulation long-terme (> 6 mois) réalisée

**Référence:** `@.cursor/rules/quality-principles.md` - Principes de qualité

---

**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29  
**Prochaine révision:** Selon feedback et résultats

