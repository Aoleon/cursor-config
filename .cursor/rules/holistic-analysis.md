# Analyse Holistique et Vision Globale - Saxium

<!-- 
Context: holistic-analysis, global-vision, multi-dimensional, systems-thinking, big-picture
Priority: P1
Auto-load: when task requires holistic understanding, systems thinking, or global vision
Dependencies: core.md, quality-principles.md, transversality-enhancement.md, meta-cognition.md, systemPatterns.md
-->

**Objectif:** Doter l'agent d'une capacité d'analyse holistique pour comprendre le système dans sa globalité, identifier les interdépendances complexes et prendre des décisions alignées avec la vision globale du projet.

**Référence:** [Cursor Rules Documentation](https://docs.cursor.com/context/rules)  
**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

## 🎯 Principe Fondamental

**IMPÉRATIF:** L'agent DOIT développer une pensée systémique et une vision holistique pour comprendre le projet dans sa globalité, au-delà des parties individuelles.

**Bénéfices:**
- ✅ Compréhension profonde des interconnexions système
- ✅ Vision globale multi-dimensionnelle du projet
- ✅ Identification des impacts en cascade
- ✅ Décisions alignées avec vision d'ensemble
- ✅ Prévention des effets secondaires imprévus
- ✅ Optimisation globale vs locale

**Référence:** `@.cursor/rules/transversality-enhancement.md` - Amélioration transversalité  
**Référence:** `@.cursor/rules/meta-cognition.md` - Méta-cognition  
**Référence:** `@systemPatterns.md` - Patterns architecturaux

## 📋 Dimensions de l'Analyse Holistique

### Dimension 1 : Architecture Système (System Architecture)

**IMPÉRATIF:** Comprendre l'architecture globale du système et ses composants majeurs.

**TOUJOURS:**
- ✅ **Cartographier architecture globale** (modules, services, couches)
- ✅ **Identifier composants critiques** (core services, shared utilities)
- ✅ **Comprendre flux de données** (end-to-end data flow)
- ✅ **Identifier patterns architecturaux** (DDD, event-driven, etc.)
- ✅ **Analyser dépendances système** (tight vs loose coupling)

**Pattern:**
```typescript
// Analyse architecture système
interface SystemArchitectureAnalysis {
  overview: ArchitectureOverview;
  criticalComponents: Component[];
  dataFlows: DataFlow[];
  architecturalPatterns: Pattern[];
  systemDependencies: Dependency[];
}

class HolisticArchitectureAnalyzer {
  // Analyser architecture système
  async analyzeSystemArchitecture(
    context: Context
  ): Promise<SystemArchitectureAnalysis> {
    // 1. Cartographier architecture globale
    const overview = await this.mapArchitectureOverview(context);
    
    // 2. Identifier composants critiques
    const criticalComponents = await this.identifyCriticalComponents(
      overview,
      context
    );
    
    // 3. Comprendre flux de données
    const dataFlows = await this.understandDataFlows(overview, context);
    
    // 4. Identifier patterns architecturaux
    const architecturalPatterns = await this.identifyArchitecturalPatterns(
      overview,
      context
    );
    
    // 5. Analyser dépendances système
    const systemDependencies = await this.analyzeSystemDependencies(
      overview,
      context
    );
    
    return {
      overview,
      criticalComponents,
      dataFlows,
      architecturalPatterns,
      systemDependencies
    };
  }
  
  private async mapArchitectureOverview(
    context: Context
  ): Promise<ArchitectureOverview> {
    // Rechercher structure globale
    const structure = await codebase_search(
      'What is the overall architecture and structure of this project?',
      []
    );
    
    // Identifier couches
    const layers = this.identifyLayers(structure, context);
    
    // Identifier modules
    const modules = await this.identifyModules(context);
    
    // Identifier services
    const services = await this.identifyServices(context);
    
    return {
      projectType: this.detectProjectType(context),
      layers,
      modules,
      services,
      mainPatterns: await this.detectMainPatterns(context)
    };
  }
  
  private async identifyCriticalComponents(
    overview: ArchitectureOverview,
    context: Context
  ): Promise<Component[]> {
    const components: Component[] = [];
    
    // Services critiques
    const criticalServices = [
      'AIService',
      'EventBus',
      'StorageFacade',
      'RBACService',
      'ChatbotOrchestrationService'
    ];
    
    for (const serviceName of criticalServices) {
      const component = await this.analyzeComponent(serviceName, context);
      if (component) {
        components.push({
          ...component,
          criticality: 'high',
          reason: 'Core service used across multiple modules'
        });
      }
    }
    
    return components;
  }
}
```

**NE JAMAIS:**
- ❌ Modifier architecture sans comprendre vision globale
- ❌ Ignorer composants critiques
- ❌ Négliger impacts sur flux de données

---

### Dimension 2 : Domaine Métier (Business Domain)

**IMPÉRATIF:** Comprendre le domaine métier et les règles business dans leur globalité.

**TOUJOURS:**
- ✅ **Comprendre contexte business** (industrie, processus, contraintes)
- ✅ **Identifier entités métier principales** (User, Project, Task, etc.)
- ✅ **Comprendre règles business** (validations, workflows, contraintes)
- ✅ **Identifier workflows métier** (end-to-end business processes)
- ✅ **Analyser contraintes métier** (réglementaires, organisationnelles)

**Pattern:**
```typescript
// Analyse domaine métier
interface BusinessDomainAnalysis {
  businessContext: BusinessContext;
  coreEntities: Entity[];
  businessRules: BusinessRule[];
  businessWorkflows: Workflow[];
  businessConstraints: Constraint[];
}

class HolisticBusinessAnalyzer {
  // Analyser domaine métier
  async analyzeBusinessDomain(
    context: Context
  ): Promise<BusinessDomainAnalysis> {
    // 1. Comprendre contexte business
    const businessContext = await this.understandBusinessContext(context);
    
    // 2. Identifier entités métier principales
    const coreEntities = await this.identifyCoreEntities(context);
    
    // 3. Comprendre règles business
    const businessRules = await this.understandBusinessRules(context);
    
    // 4. Identifier workflows métier
    const businessWorkflows = await this.identifyBusinessWorkflows(context);
    
    // 5. Analyser contraintes métier
    const businessConstraints = await this.analyzeBusinessConstraints(context);
    
    return {
      businessContext,
      coreEntities,
      businessRules,
      businessWorkflows,
      businessConstraints
    };
  }
  
  private async understandBusinessContext(
    context: Context
  ): Promise<BusinessContext> {
    // Lire documentation projet
    const projectBrief = await read_file('@projectbrief.md');
    const productContext = await read_file('@productContext.md');
    const audit = await read_file('@attached_assets/Audit process et fonctionnement JLM.txt');
    
    return {
      industry: 'BTP / Menuiserie',
      company: 'JLM Menuiserie',
      mainGoal: 'Gestion de projets et chantiers',
      keyProcesses: this.extractKeyProcesses(audit),
      stakeholders: this.extractStakeholders(productContext),
      challenges: this.extractChallenges(projectBrief)
    };
  }
}
```

**NE JAMAIS:**
- ❌ Développer fonctionnalités hors périmètre métier
- ❌ Ignorer règles business établies
- ❌ Négliger workflows métier existants

---

### Dimension 3 : Expérience Utilisateur (User Experience)

**IMPÉRATIF:** Comprendre l'expérience utilisateur dans sa globalité et les parcours utilisateurs complets.

**TOUJOURS:**
- ✅ **Identifier personas utilisateurs** (rôles, besoins, objectifs)
- ✅ **Comprendre parcours utilisateurs** (user journeys end-to-end)
- ✅ **Analyser points de friction** (pain points, difficultés)
- ✅ **Identifier opportunités d'amélioration UX** (quick wins, évolutions)
- ✅ **Valider cohérence UX globale** (design system, patterns UI)

**Pattern:**
```typescript
// Analyse expérience utilisateur
interface UserExperienceAnalysis {
  personas: Persona[];
  userJourneys: UserJourney[];
  painPoints: PainPoint[];
  uxOpportunities: UXOpportunity[];
  uxConsistency: UXConsistency;
}

class HolisticUXAnalyzer {
  // Analyser expérience utilisateur
  async analyzeUserExperience(
    context: Context
  ): Promise<UserExperienceAnalysis> {
    // 1. Identifier personas
    const personas = await this.identifyPersonas(context);
    
    // 2. Comprendre parcours utilisateurs
    const userJourneys = await this.understandUserJourneys(personas, context);
    
    // 3. Analyser points de friction
    const painPoints = await this.analyzePainPoints(userJourneys, context);
    
    // 4. Identifier opportunités UX
    const uxOpportunities = await this.identifyUXOpportunities(
      painPoints,
      context
    );
    
    // 5. Valider cohérence UX
    const uxConsistency = await this.validateUXConsistency(context);
    
    return {
      personas,
      userJourneys,
      painPoints,
      uxOpportunities,
      uxConsistency
    };
  }
}
```

**NE JAMAIS:**
- ❌ Modifier UX sans comprendre parcours complet
- ❌ Ignorer cohérence globale du design
- ❌ Négliger accessibilité

---

### Dimension 4 : Performance Système (System Performance)

**IMPÉRATIF:** Comprendre performance globale du système et identifier goulots d'étranglement.

**TOUJOURS:**
- ✅ **Analyser performance end-to-end** (latence, throughput, ressources)
- ✅ **Identifier goulots d'étranglement** (bottlenecks critiques)
- ✅ **Comprendre patterns de charge** (pics, tendances, variations)
- ✅ **Analyser scalabilité système** (limites actuelles, capacité future)
- ✅ **Identifier optimisations globales** (cache, async, batching)

**Pattern:**
```typescript
// Analyse performance système
interface SystemPerformanceAnalysis {
  endToEndPerformance: PerformanceMetrics;
  bottlenecks: Bottleneck[];
  loadPatterns: LoadPattern[];
  scalability: ScalabilityAnalysis;
  optimizations: GlobalOptimization[];
}

class HolisticPerformanceAnalyzer {
  // Analyser performance système
  async analyzeSystemPerformance(
    context: Context
  ): Promise<SystemPerformanceAnalysis> {
    // 1. Analyser performance end-to-end
    const endToEndPerformance = await this.analyzeEndToEndPerformance(context);
    
    // 2. Identifier goulots d'étranglement
    const bottlenecks = await this.identifyBottlenecks(
      endToEndPerformance,
      context
    );
    
    // 3. Comprendre patterns de charge
    const loadPatterns = await this.understandLoadPatterns(context);
    
    // 4. Analyser scalabilité
    const scalability = await this.analyzeScalability(
      endToEndPerformance,
      bottlenecks,
      context
    );
    
    // 5. Identifier optimisations globales
    const optimizations = await this.identifyGlobalOptimizations(
      bottlenecks,
      scalability,
      context
    );
    
    return {
      endToEndPerformance,
      bottlenecks,
      loadPatterns,
      scalability,
      optimizations
    };
  }
}
```

**NE JAMAIS:**
- ❌ Optimiser localement sans vision globale
- ❌ Ignorer impacts performance transversaux
- ❌ Créer nouveaux goulots d'étranglement

---

### Dimension 5 : Qualité et Dette Technique (Quality & Technical Debt)

**IMPÉRATIF:** Comprendre qualité globale du code et cartographier dette technique.

**TOUJOURS:**
- ✅ **Évaluer qualité globale code** (maintenabilité, lisibilité, testabilité)
- ✅ **Cartographier dette technique** (hotspots, code smells, duplications)
- ✅ **Identifier risques techniques** (dépendances obsolètes, patterns anti)
- ✅ **Prioriser remboursement dette** (impact, coût, urgence)
- ✅ **Suivre tendances qualité** (amélioration vs dégradation)

**Pattern:**
```typescript
// Analyse qualité et dette technique
interface QualityAndDebtAnalysis {
  globalQuality: QualityMetrics;
  technicalDebt: TechnicalDebtMap;
  technicalRisks: TechnicalRisk[];
  debtPrioritization: DebtPriority[];
  qualityTrends: QualityTrend[];
}

class HolisticQualityAnalyzer {
  // Analyser qualité et dette
  async analyzeQualityAndDebt(
    context: Context
  ): Promise<QualityAndDebtAnalysis> {
    // 1. Évaluer qualité globale
    const globalQuality = await this.evaluateGlobalQuality(context);
    
    // 2. Cartographier dette technique
    const technicalDebt = await this.mapTechnicalDebt(context);
    
    // 3. Identifier risques techniques
    const technicalRisks = await this.identifyTechnicalRisks(
      technicalDebt,
      context
    );
    
    // 4. Prioriser remboursement dette
    const debtPrioritization = await this.prioritizeDebtRepayment(
      technicalDebt,
      technicalRisks,
      context
    );
    
    // 5. Suivre tendances qualité
    const qualityTrends = await this.trackQualityTrends(context);
    
    return {
      globalQuality,
      technicalDebt,
      technicalRisks,
      debtPrioritization,
      qualityTrends
    };
  }
}
```

**NE JAMAIS:**
- ❌ Ignorer dette technique existante
- ❌ Ajouter dette technique sans justification
- ❌ Négliger tendances de dégradation

---

### Dimension 6 : Évolution et Maintenance (Evolution & Maintenance)

**IMPÉRATIF:** Comprendre trajectoire d'évolution du projet et anticiper besoins futurs.

**TOUJOURS:**
- ✅ **Comprendre roadmap produit** (fonctionnalités prévues, priorités)
- ✅ **Anticiper évolutions architecture** (migrations, refactorings majeurs)
- ✅ **Identifier besoins de maintenance** (updates, patches, optimisations)
- ✅ **Évaluer extensibilité système** (facilité ajout features)
- ✅ **Planifier améliorations continues** (quick wins, long-term goals)

**Pattern:**
```typescript
// Analyse évolution et maintenance
interface EvolutionAndMaintenanceAnalysis {
  productRoadmap: Roadmap;
  architectureEvolution: EvolutionPlan;
  maintenanceNeeds: MaintenanceNeed[];
  extensibility: ExtensibilityAssessment;
  continuousImprovement: ImprovementPlan;
}

class HolisticEvolutionAnalyzer {
  // Analyser évolution et maintenance
  async analyzeEvolutionAndMaintenance(
    context: Context
  ): Promise<EvolutionAndMaintenanceAnalysis> {
    // 1. Comprendre roadmap produit
    const productRoadmap = await this.understandProductRoadmap(context);
    
    // 2. Anticiper évolutions architecture
    const architectureEvolution = await this.anticipateArchitectureEvolution(
      productRoadmap,
      context
    );
    
    // 3. Identifier besoins de maintenance
    const maintenanceNeeds = await this.identifyMaintenanceNeeds(context);
    
    // 4. Évaluer extensibilité
    const extensibility = await this.evaluateExtensibility(context);
    
    // 5. Planifier améliorations continues
    const continuousImprovement = await this.planContinuousImprovement(
      productRoadmap,
      maintenanceNeeds,
      extensibility,
      context
    );
    
    return {
      productRoadmap,
      architectureEvolution,
      maintenanceNeeds,
      extensibility,
      continuousImprovement
    };
  }
}
```

**NE JAMAIS:**
- ❌ Ignorer roadmap produit
- ❌ Créer code non extensible
- ❌ Négliger maintenance préventive

---

## 🔄 Workflow d'Analyse Holistique Intégré

**IMPÉRATIF:** Intégrer analyse holistique dans workflow standard pour tâches complexes.

**Workflow Standard Enrichi:**

```typescript
// Workflow avec analyse holistique
async function executeTaskWithHolisticAnalysis(
  task: Task,
  context: Context
): Promise<TaskResult> {
  const holistic = new HolisticAnalysisEngine();
  
  // PHASE 1 : Analyse Holistique (Pré-Tâche)
  const analysis = await holistic.performHolisticAnalysis(task, context);
  logger.info('Holistic Analysis', { analysis });
  
  // Vérifier alignement avec vision globale
  await validateAlignmentWithGlobalVision(task, analysis);
  
  // PHASE 2 : Identification Impacts Multi-Dimensionnels
  const impacts = await holistic.identifyMultiDimensionalImpacts(
    task,
    analysis,
    context
  );
  logger.info('Multi-Dimensional Impacts', { impacts });
  
  // PHASE 3 : Optimisation Globale vs Locale
  const optimization = await holistic.optimizeGloballyVsLocally(
    task,
    impacts,
    context
  );
  logger.info('Global Optimization', { optimization });
  
  // PHASE 4 : Exécution avec Vision Globale
  const result = await executeTaskWithGlobalVision(
    task,
    optimization,
    context
  );
  
  // PHASE 5 : Validation Holistique (Post-Tâche)
  await holistic.validateHolistically(result, analysis, context);
  
  return result;
}

// Analyse holistique complète
class HolisticAnalysisEngine {
  async performHolisticAnalysis(
    task: Task,
    context: Context
  ): Promise<HolisticAnalysis> {
    // Analyser toutes les dimensions en parallèle
    const [
      architecture,
      business,
      ux,
      performance,
      quality,
      evolution
    ] = await Promise.all([
      new HolisticArchitectureAnalyzer().analyzeSystemArchitecture(context),
      new HolisticBusinessAnalyzer().analyzeBusinessDomain(context),
      new HolisticUXAnalyzer().analyzeUserExperience(context),
      new HolisticPerformanceAnalyzer().analyzeSystemPerformance(context),
      new HolisticQualityAnalyzer().analyzeQualityAndDebt(context),
      new HolisticEvolutionAnalyzer().analyzeEvolutionAndMaintenance(context)
    ]);
    
    return {
      architecture,
      business,
      ux,
      performance,
      quality,
      evolution,
      synthesisView: this.synthesizeHolisticView({
        architecture,
        business,
        ux,
        performance,
        quality,
        evolution
      })
    };
  }
  
  private synthesizeHolisticView(
    analysis: Partial<HolisticAnalysis>
  ): SynthesisView {
    // Créer vue synthétique multi-dimensionnelle
    return {
      bigPicture: this.createBigPicture(analysis),
      keyInterconnections: this.identifyKeyInterconnections(analysis),
      globalConstraints: this.identifyGlobalConstraints(analysis),
      strategicRecommendations: this.generateStrategicRecommendations(analysis),
      riskMap: this.createRiskMap(analysis)
    };
  }
}
```

---

## 📊 Métriques d'Analyse Holistique

**TOUJOURS tracker:**
- ✅ Couverture dimensionnelle (% dimensions analysées)
- ✅ Profondeur d'analyse (superficielle vs profonde)
- ✅ Interconnexions identifiées (nombre, pertinence)
- ✅ Alignement vision globale (score)
- ✅ Impacts évités (grâce à analyse holistique)

**Référence:** `@.cursor/rules/agent-metrics.md` - Métriques agent

---

## 🎯 Objectifs d'Excellence Holistique

**Standards:**
- ✅ Couverture dimensionnelle > 80% (au moins 5/6 dimensions)
- ✅ Profondeur d'analyse > 0.8
- ✅ Au moins 10 interconnexions clés identifiées
- ✅ Alignement vision globale > 0.9
- ✅ 0 impacts négatifs majeurs non anticipés

**Référence:** `@.cursor/rules/quality-principles.md` - Principes de qualité

---

**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29  
**Prochaine révision:** Selon feedback et résultats

