# Amélioration Transversalité Agent - Saxium

**Objectif:** Améliorer systématiquement la transversalité de l'agent pour comprendre et utiliser les relations entre modules, réutiliser les patterns établis et avoir une vision holistique multi-dimensionnelle du projet.

**Référence:** [Cursor Rules Documentation](https://docs.cursor.com/context/rules)  
**Version:** 2.0.0  
**Dernière mise à jour:** 2025-01-29

## 🎯 Principe Fondamental

**IMPÉRATIF:** L'agent DOIT améliorer systématiquement sa transversalité en comprenant les relations entre modules, en réutilisant les patterns établis et en développant une vision holistique multi-dimensionnelle du projet.

**Problème identifié:** L'agent a une compréhension limitée des relations transversales, ne réutilise pas systématiquement les patterns établis et n'a pas une vision holistique du projet.

**Solution:** Amélioration systématique de la transversalité avec détection automatique des relations, réutilisation systématique des patterns, vision holistique multi-dimensionnelle et compréhension profonde des interconnexions.

**Bénéfices:**
- ✅ Compréhension relations entre modules
- ✅ Réutilisation systématique patterns établis
- ✅ Vision globale du projet
- ✅ Coordination transversale améliorée
- ✅ Cohérence globale du code
- ✅ **NOUVEAU v2.0** Vision holistique multi-dimensionnelle
- ✅ **NOUVEAU v2.0** Compréhension profonde interconnexions système
- ✅ **NOUVEAU v2.0** Anticipation impacts transversaux complexes
- ✅ **NOUVEAU v2.0** Optimisation globale vs locale

**Référence:** `@.cursor/rules/transversal-performance.md` - Performance transversale (IMPÉRATIF)  
**Référence:** `@.cursor/rules/similar-code-detection.md` - Détection code similaire (IMPÉRATIF)  
**Référence:** `@.cursor/rules/holistic-analysis.md` - Analyse holistique (IMPÉRATIF - NOUVEAU)  
**Référence:** `@systemPatterns.md` - Patterns architecturaux (IMPÉRATIF)

## 🧠 Vision Holistique Transversale (NOUVEAU v2.0)

### Intégration Analyse Holistique dans Transversalité

**IMPÉRATIF:** La transversalité DOIT être enrichie par une analyse holistique multi-dimensionnelle pour une compréhension systémique complète.

**TOUJOURS:**
- ✅ **Analyser 6 dimensions simultanément** - Architecture, métier, UX, performance, qualité, évolution
- ✅ **Comprendre interconnexions complexes** - Relations non-évidentes entre dimensions
- ✅ **Anticiper effets en cascade multi-dimensionnels** - Impacts transversaux sur toutes dimensions
- ✅ **Aligner transversalité avec vision globale** - Cohérence stratégique projet
- ✅ **Optimiser transversalement** - Éviter optimisations locales sub-optimales globalement

**Pattern:**
```typescript
// Vision holistique transversale
interface HolisticTransversality {
  dimensionalAnalysis: DimensionalAnalysis[]; // 6 dimensions
  complexInterconnections: ComplexInterconnection[];
  cascadeEffects: MultiDimensionalCascade[];
  globalAlignment: GlobalAlignmentScore;
  transversalOptimization: TransversalOptimizationStrategy;
}

class HolisticTransversalityEngine {
  async analyzeHolisticallyTransversal(
    task: Task,
    modules: Module[],
    context: Context
  ): Promise<HolisticTransversality> {
    // 1. Analyser toutes dimensions simultanément
    const dimensionalAnalysis = await this.analyzeSixDimensions(
      task,
      modules,
      context
    );
    
    // 2. Comprendre interconnexions complexes
    const complexInterconnections = await this.understandComplexInterconnections(
      dimensionalAnalysis,
      modules
    );
    
    // 3. Anticiper effets en cascade multi-dimensionnels
    const cascadeEffects = await this.anticipateMultiDimensionalCascade(
      task,
      complexInterconnections
    );
    
    // 4. Aligner transversalité avec vision globale
    const globalAlignment = await this.alignWithGlobalVision(
      task,
      cascadeEffects
    );
    
    // 5. Optimiser transversalement
    const transversalOptimization = await this.optimizeTransversally(
      dimensionalAnalysis,
      complexInterconnections,
      cascadeEffects
    );
    
    return {
      dimensionalAnalysis,
      complexInterconnections,
      cascadeEffects,
      globalAlignment,
      transversalOptimization
    };
  }
  
  private async analyzeSixDimensions(
    task: Task,
    modules: Module[],
    context: Context
  ): Promise<DimensionalAnalysis[]> {
    // Analyser en parallèle les 6 dimensions
    return await Promise.all([
      this.analyzeArchitectureDimension(task, modules, context),
      this.analyzeBusinessDimension(task, modules, context),
      this.analyzeUXDimension(task, modules, context),
      this.analyzePerformanceDimension(task, modules, context),
      this.analyzeQualityDimension(task, modules, context),
      this.analyzeEvolutionDimension(task, modules, context)
    ]);
  }
  
  private async understandComplexInterconnections(
    dimensionalAnalysis: DimensionalAnalysis[],
    modules: Module[]
  ): Promise<ComplexInterconnection[]> {
    const interconnections: ComplexInterconnection[] = [];
    
    // Identifier interconnexions entre dimensions
    for (let i = 0; i < dimensionalAnalysis.length; i++) {
      for (let j = i + 1; j < dimensionalAnalysis.length; j++) {
        const interconnection = await this.findInterconnection(
          dimensionalAnalysis[i],
          dimensionalAnalysis[j],
          modules
        );
        if (interconnection) {
          interconnections.push(interconnection);
        }
      }
    }
    
    // Identifier interconnexions multi-dimensionnelles (3+ dimensions)
    const multiDimensional = await this.findMultiDimensionalInterconnections(
      dimensionalAnalysis,
      modules
    );
    interconnections.push(...multiDimensional);
    
    return interconnections;
  }
}
```

### Carte Mentale Transversale Multi-Dimensionnelle

**IMPÉRATIF:** Construire une carte mentale transversale qui intègre toutes les dimensions.

**TOUJOURS:**
- ✅ **Cartographier relations architecture <-> métier** - Alignement technique/business
- ✅ **Cartographier relations métier <-> UX** - Experience utilisateur alignée business
- ✅ **Cartographier relations architecture <-> performance** - Optimisations structurelles
- ✅ **Cartographier relations qualité <-> évolution** - Dette technique vs roadmap
- ✅ **Identifier points critiques multi-dimensionnels** - Zones sensibles transversales

**Pattern:**
```typescript
// Carte mentale transversale
interface TransversalMentalMap {
  dimensionalRelationships: DimensionalRelationship[];
  criticalJunctions: CriticalJunction[]; // Points critiques
  holisticPatterns: HolisticPattern[]; // Patterns transversaux
  emergentProperties: EmergentProperty[]; // Propriétés émergentes système
  systemInsights: SystemInsight[]; // Insights sur système global
}

class TransversalMentalMapBuilder {
  async buildMentalMap(
    holisticAnalysis: HolisticTransversality,
    context: Context
  ): Promise<TransversalMentalMap> {
    // 1. Cartographier relations dimensionnelles
    const dimensionalRelationships = await this.mapDimensionalRelationships(
      holisticAnalysis
    );
    
    // 2. Identifier points critiques
    const criticalJunctions = await this.identifyCriticalJunctions(
      dimensionalRelationships
    );
    
    // 3. Extraire patterns holistiques
    const holisticPatterns = await this.extractHolisticPatterns(
      holisticAnalysis,
      dimensionalRelationships
    );
    
    // 4. Identifier propriétés émergentes
    const emergentProperties = await this.identifyEmergentProperties(
      holisticAnalysis,
      criticalJunctions
    );
    
    // 5. Générer insights système
    const systemInsights = await this.generateSystemInsights(
      holisticAnalysis,
      holisticPatterns,
      emergentProperties
    );
    
    return {
      dimensionalRelationships,
      criticalJunctions,
      holisticPatterns,
      emergentProperties,
      systemInsights
    };
  }
}
```

## 📋 Améliorations Systématiques

### 1. Détection Automatique Relations Entre Modules (IMPÉRATIF)

**IMPÉRATIF:** Détecter automatiquement les relations entre modules avant toute modification.

**TOUJOURS:**
- ✅ **Identifier modules affectés automatiquement** (IMPÉRATIF - avant modification)
- ✅ **Comprendre relations entre modules** (IMPÉRATIF - dépendances, imports, exports)
- ✅ **Identifier services transversaux** (IMPÉRATIF - AIService, EventBus, Storage)
- ✅ **Identifier dépendances cross-cutting** (IMPÉRATIF - logging, validation, RBAC)
- ✅ **Analyser impacts transversaux** (IMPÉRATIF - avant modification)

**Pattern:**
```typescript
// Détection automatique relations entre modules
interface ModuleRelations {
  modules: Module[];
  relations: ModuleRelation[];
  transversalServices: TransversalService[];
  crossCuttingDependencies: CrossCuttingDependency[];
  impacts: TransversalImpact[];
}

class ModuleRelationDetector {
  // Détecter relations automatiquement
  async detectModuleRelations(
    task: Task,
    context: Context
  ): Promise<ModuleRelations> {
    // 1. Identifier modules affectés
    const affectedModules = await this.identifyAffectedModules(task, context);
    
    // 2. Comprendre relations entre modules
    const relations = await this.understandModuleRelations(affectedModules);
    
    // 3. Identifier services transversaux
    const transversalServices = await this.identifyTransversalServices(
      task,
      affectedModules
    );
    
    // 4. Identifier dépendances cross-cutting
    const crossCuttingDependencies = await this.identifyCrossCuttingDependencies(
      task,
      affectedModules
    );
    
    // 5. Analyser impacts transversaux
    const impacts = await this.analyzeTransversalImpacts(
      task,
      affectedModules,
      relations
    );
    
    return {
      modules: affectedModules,
      relations,
      transversalServices,
      crossCuttingDependencies,
      impacts
    };
  }
  
  private async identifyAffectedModules(
    task: Task,
    context: Context
  ): Promise<Module[]> {
    // Rechercher modules affectés par la tâche
    const moduleSearch = await codebase_search(
      `Which modules are affected by ${task.description}?`,
      ['server/modules']
    );
    
    // Analyser fichiers modifiés
    const modifiedFiles = task.files || [];
    const modules = new Set<string>();
    
    for (const file of modifiedFiles) {
      const module = this.extractModuleFromPath(file);
      if (module) {
        modules.add(module);
      }
    }
    
    // Rechercher modules via imports/exports
    const importModules = await this.findModulesViaImports(modifiedFiles);
    importModules.forEach(m => modules.add(m));
    
    return Array.from(modules).map(name => ({
      name,
      path: `server/modules/${name}`,
      files: await this.getModuleFiles(name)
    }));
  }
  
  private async understandModuleRelations(
    modules: Module[]
  ): Promise<ModuleRelation[]> {
    const relations: ModuleRelation[] = [];
    
    for (const module of modules) {
      // Analyser imports/exports
      const imports = await this.analyzeModuleImports(module);
      const exports = await this.analyzeModuleExports(module);
      
      // Identifier relations
      for (const imp of imports) {
        if (imp.from.startsWith('server/modules/')) {
          const relatedModule = this.extractModuleFromPath(imp.from);
          relations.push({
            from: module.name,
            to: relatedModule,
            type: 'import',
            dependency: imp.type
          });
        }
      }
      
      for (const exp of exports) {
        relations.push({
          from: module.name,
          to: exp.usedBy || 'external',
          type: 'export',
          dependency: exp.type
        });
      }
    }
    
    return relations;
  }
}
```

### 2. Réutilisation Systématique Patterns Établis (IMPÉRATIF)

**IMPÉRATIF:** Rechercher et réutiliser systématiquement les patterns établis avant de créer du nouveau code.

**TOUJOURS:**
- ✅ **Rechercher patterns établis avant création** (IMPÉRATIF - éviter réinvention)
- ✅ **Réutiliser patterns similaires** (>80% similarité)
- ✅ **Adapter patterns existants** au lieu de créer nouveaux
- ✅ **Suivre patterns architecturaux** du projet
- ✅ **Documenter réutilisation patterns**

**Pattern:**
```typescript
// Réutilisation systématique patterns établis
class PatternReuseManager {
  // Rechercher patterns établis
  async findEstablishedPatterns(
    task: Task,
    context: Context
  ): Promise<EstablishedPattern[]> {
    // 1. Identifier type de tâche
    const taskType = this.identifyTaskType(task);
    
    // 2. Rechercher patterns dans systemPatterns.md
    const systemPatterns = await this.loadSystemPatterns();
    const relevantPatterns = this.filterRelevantPatterns(
      systemPatterns,
      taskType
    );
    
    // 3. Rechercher patterns dans codebase
    const codebasePatterns = await codebase_search(
      `What are the established patterns for ${taskType}?`,
      ['server/modules', 'server/services']
    );
    
    // 4. Rechercher exemples concrets
    const examples = await codebase_search(
      `Show me examples of ${taskType} implementation`,
      ['server/modules']
    );
    
    // 5. Analyser similarité
    const patterns = this.analyzePatternSimilarity(
      relevantPatterns,
      codebasePatterns,
      examples,
      task
    );
    
    return patterns.filter(p => p.similarity > 0.7);
  }
  
  // Réutiliser pattern si similaire
  async reusePatternIfSimilar(
    task: Task,
    patterns: EstablishedPattern[]
  ): Promise<ReuseResult> {
    if (patterns.length === 0) {
      return {
        reused: false,
        reason: 'no-similar-patterns'
      };
    }
    
    // Trouver meilleur match
    const bestMatch = patterns[0];
    
    if (bestMatch.similarity > 0.8) {
      // Adapter pattern au contexte actuel
      const adapted = await this.adaptPattern(bestMatch.pattern, task);
      
      // Valider adaptation
      const validation = await this.validatePatternAdaptation(adapted, task);
      
      if (validation.success) {
        return {
          reused: true,
          originalPattern: bestMatch.pattern,
          adaptedPattern: adapted,
          validation,
          similarity: bestMatch.similarity
        };
      }
    }
    
    return {
      reused: false,
      reason: 'similarity-too-low-or-validation-failed',
      bestMatch: bestMatch.pattern
    };
  }
  
  private async loadSystemPatterns(): Promise<SystemPattern[]> {
    // Charger systemPatterns.md
    const systemPatternsContent = await read_file('systemPatterns.md');
    
    // Parser patterns
    return this.parseSystemPatterns(systemPatternsContent);
  }
}
```

### 3. Vision Globale Consolidée (IMPÉRATIF)

**IMPÉRATIF:** Maintenir une vision globale consolidée du projet pour comprendre le contexte complet.

**TOUJOURS:**
- ✅ **Charger fichiers mémoire projet** (IMPÉRATIF - projectbrief.md, activeContext.md, systemPatterns.md)
- ✅ **Comprendre architecture globale** (IMPÉRATIF - modules, services, dépendances)
- ✅ **Identifier domaines métier** (IMPÉRATIF - auth, documents, chiffrage, etc.)
- ✅ **Comprendre flux transversaux** (IMPÉRATIF - workflows, événements)
- ✅ **Maintenir vision à jour** (IMPÉRATIF - mise à jour régulière)

**Pattern:**
```typescript
// Vision globale consolidée
class GlobalVisionManager {
  private globalContext: GlobalContext | null = null;
  
  // Charger vision globale
  async loadGlobalVision(): Promise<GlobalContext> {
    if (this.globalContext && !this.isStale(this.globalContext)) {
      return this.globalContext;
    }
    
    // 1. Charger fichiers mémoire
    const [projectBrief, activeContext, systemPatterns, techContext] = await Promise.all([
      read_file('projectbrief.md'),
      read_file('activeContext.md'),
      read_file('systemPatterns.md'),
      read_file('techContext.md')
    ]);
    
    // 2. Comprendre architecture globale
    const architecture = await this.understandArchitecture(systemPatterns);
    
    // 3. Identifier domaines métier
    const businessDomains = await this.identifyBusinessDomains(projectBrief);
    
    // 4. Comprendre flux transversaux
    const transversalFlows = await this.understandTransversalFlows(activeContext);
    
    // 5. Construire vision globale
    this.globalContext = {
      projectBrief,
      activeContext,
      systemPatterns,
      techContext,
      architecture,
      businessDomains,
      transversalFlows,
      lastUpdated: Date.now()
    };
    
    return this.globalContext;
  }
  
  // Utiliser vision globale pour tâche
  async useGlobalVisionForTask(
    task: Task
  ): Promise<TaskContext> {
    const globalVision = await this.loadGlobalVision();
    
    // Identifier contexte pertinent
    const relevantContext = this.extractRelevantContext(
      globalVision,
      task
    );
    
    return {
      task,
      globalVision,
      relevantContext,
      moduleRelations: await this.detectModuleRelations(task, relevantContext),
      establishedPatterns: await this.findEstablishedPatterns(task, relevantContext)
    };
  }
}
```

### 4. Coordination Transversale Renforcée (IMPÉRATIF)

**IMPÉRATIF:** Coordonner systématiquement les modifications entre modules avec validation transversale.

**TOUJOURS:**
- ✅ **Planifier coordination avant modification** (IMPÉRATIF)
- ✅ **Valider cohérence transversale** (IMPÉRATIF - après chaque modification)
- ✅ **Gérer dépendances entre modules** (IMPÉRATIF)
- ✅ **Documenter décisions transversales** (IMPÉRATIF)
- ✅ **Valider cohérence globale** (IMPÉRATIF - après toutes modifications)

**Pattern:**
```typescript
// Coordination transversale renforcée
class TransversalCoordinationManager {
  // Planifier coordination
  async planTransversalCoordination(
    modifications: Modification[],
    context: TaskContext
  ): Promise<CoordinationPlan> {
    // 1. Analyser impacts transversaux
    const impacts = await this.analyzeTransversalImpacts(
      modifications,
      context.moduleRelations
    );
    
    // 2. Identifier ordre d'exécution
    const executionOrder = this.planExecutionOrder(
      modifications,
      context.moduleRelations.relations
    );
    
    // 3. Planifier validations transversales
    const validations = this.planTransversalValidations(
      modifications,
      executionOrder
    );
    
    return {
      modifications,
      executionOrder,
      validations,
      impacts
    };
  }
  
  // Exécuter avec coordination
  async executeWithCoordination(
    plan: CoordinationPlan,
    context: TaskContext
  ): Promise<CoordinationResult> {
    const results: ModificationResult[] = [];
    
    for (const step of plan.executionOrder) {
      // 1. Exécuter modification
      const result = await this.executeModification(step.modification);
      results.push(result);
      
      // 2. Valider cohérence transversale (IMPÉRATIF)
      const transversalValidation = await this.validateTransversalConsistency(
        results,
        step.modification,
        context.moduleRelations
      );
      
      if (!transversalValidation.success) {
        // Corriger incohérences
        await this.fixTransversalInconsistencies(
          results,
          transversalValidation.issues,
          context
        );
      }
      
      // 3. Valider dépendances
      await this.validateDependencies(
        step.modification,
        context.moduleRelations
      );
    }
    
    // 4. Valider cohérence globale (IMPÉRATIF)
    const globalValidation = await this.validateGlobalConsistency(
      results,
      context
    );
    
    return {
      success: globalValidation.success,
      results,
      coordination: plan,
      globalValidation
    };
  }
}
```

### 5. Détection Automatique Code Similaire Transversal (IMPÉRATIF)

**IMPÉRATIF:** Détecter automatiquement le code similaire dans tous les modules avant création/modification.

**TOUJOURS:**
- ✅ **Rechercher code similaire dans tous modules** (IMPÉRATIF - avant création)
- ✅ **Identifier patterns transversaux** (IMPÉRATIF - patterns utilisés dans plusieurs modules)
- ✅ **Réutiliser code similaire** (>80% similarité)
- ✅ **Éviter duplication transversale** (IMPÉRATIF)
- ✅ **Extraire logique commune** (IMPÉRATIF - si duplication détectée)

**Pattern:**
```typescript
// Détection automatique code similaire transversal
class TransversalCodeDetector {
  // Rechercher code similaire dans tous modules
  async findSimilarCodeAcrossModules(
    task: Task,
    context: TaskContext
  ): Promise<SimilarCodeResult> {
    // 1. Rechercher dans tous modules
    const allModules = context.globalVision.architecture.modules;
    const searchResults = await Promise.all(
      allModules.map(module =>
        codebase_search(
          `Find code similar to ${task.description}`,
          [module.path]
        )
      )
    );
    
    // 2. Analyser similarité
    const similarCode = this.analyzeSimilarityAcrossModules(
      searchResults,
      task
    );
    
    // 3. Identifier patterns transversaux
    const transversalPatterns = this.identifyTransversalPatterns(
      similarCode,
      allModules
    );
    
    return {
      similarCode: similarCode.filter(s => s.similarity > 0.7),
      transversalPatterns,
      recommendations: this.generateRecommendations(similarCode, transversalPatterns)
    };
  }
  
  // Réutiliser code similaire transversal
  async reuseTransversalCode(
    similarCode: SimilarCode[],
    task: Task
  ): Promise<ReuseResult> {
    if (similarCode.length === 0) {
      return {
        reused: false,
        reason: 'no-similar-code-found'
      };
    }
    
    // Trouver meilleur match
    const bestMatch = similarCode[0];
    
    if (bestMatch.similarity > 0.8) {
      // Adapter code au contexte actuel
      const adapted = await this.adaptCode(bestMatch.code, task);
      
      // Valider adaptation
      const validation = await this.validateAdaptation(adapted, task);
      
      if (validation.success) {
        return {
          reused: true,
          originalCode: bestMatch.code,
          adaptedCode: adapted,
          validation,
          similarity: bestMatch.similarity,
          module: bestMatch.module
        };
      }
    }
    
    return {
      reused: false,
      reason: 'similarity-too-low-or-validation-failed',
      bestMatch: bestMatch.code
    };
  }
}
```

## 🔄 Workflow d'Amélioration Transversalité

### Workflow: Améliorer Transversalité Systématiquement

**Étapes:**
1. **Charger vision globale** - projectbrief.md, activeContext.md, systemPatterns.md
2. **Détecter relations modules** - Modules affectés, relations, services transversaux
3. **Rechercher patterns établis** - Patterns dans systemPatterns.md et codebase
4. **Rechercher code similaire** - Code similaire dans tous modules
5. **Planifier coordination** - Ordre exécution, validations transversales
6. **Exécuter avec coordination** - Modifications coordonnées avec validation
7. **Valider cohérence globale** - Validation finale cohérence transversale

**Pattern:**
```typescript
// Workflow amélioration transversalité
async function improveTransversalitySystematically(
  task: Task,
  context: Context
): Promise<TransversalityResult> {
  // 1. Charger vision globale
  const visionManager = new GlobalVisionManager();
  const taskContext = await visionManager.useGlobalVisionForTask(task);
  
  // 2. Détecter relations modules
  const relationDetector = new ModuleRelationDetector();
  const moduleRelations = await relationDetector.detectModuleRelations(
    task,
    taskContext
  );
  
  // 3. Rechercher patterns établis
  const patternManager = new PatternReuseManager();
  const establishedPatterns = await patternManager.findEstablishedPatterns(
    task,
    taskContext
  );
  
  // 4. Rechercher code similaire transversal
  const codeDetector = new TransversalCodeDetector();
  const similarCode = await codeDetector.findSimilarCodeAcrossModules(
    task,
    taskContext
  );
  
  // 5. Réutiliser si possible
  let reuseResult: ReuseResult | null = null;
  if (similarCode.similarCode.length > 0) {
    reuseResult = await codeDetector.reuseTransversalCode(
      similarCode.similarCode,
      task
    );
  }
  
  if (reuseResult?.reused) {
    return {
      action: 'reuse',
      reusedCode: reuseResult.adaptedCode,
      originalCode: reuseResult.originalCode,
      moduleRelations,
      establishedPatterns
    };
  }
  
  // 6. Planifier coordination
  const coordinationManager = new TransversalCoordinationManager();
  const coordinationPlan = await coordinationManager.planTransversalCoordination(
    task.modifications || [],
    { ...taskContext, moduleRelations }
  );
  
  // 7. Exécuter avec coordination
  const coordinationResult = await coordinationManager.executeWithCoordination(
    coordinationPlan,
    { ...taskContext, moduleRelations }
  );
  
  return {
    action: 'execute',
    coordination: coordinationResult,
    moduleRelations,
    establishedPatterns,
    similarCode: similarCode.recommendations
  };
}
```

## ⚠️ Règles d'Amélioration Transversalité

### Ne Jamais:

**BLOQUANT:**
- ❌ Modifier sans comprendre relations modules
- ❌ Créer code sans rechercher patterns établis
- ❌ Ignorer code similaire dans autres modules
- ❌ Modifier sans coordination transversale
- ❌ Ignorer vision globale du projet

**TOUJOURS:**
- ✅ Comprendre relations modules avant modification
- ✅ Rechercher patterns établis avant création
- ✅ Réutiliser code similaire transversal
- ✅ Coordonner modifications entre modules
- ✅ Maintenir vision globale consolidée

## 📊 Checklist Amélioration Transversalité

### Avant Modification

- [ ] Charger vision globale (projectbrief.md, activeContext.md, systemPatterns.md)
- [ ] Détecter modules affectés
- [ ] Comprendre relations entre modules
- [ ] Identifier services transversaux
- [ ] Rechercher patterns établis
- [ ] Rechercher code similaire dans tous modules

### Pendant Modification

- [ ] Planifier coordination transversale
- [ ] Exécuter modifications coordonnées
- [ ] Valider cohérence transversale après chaque modification
- [ ] Réutiliser patterns établis
- [ ] Éviter duplication transversale

### Après Modification

- [ ] Valider cohérence globale
- [ ] Documenter décisions transversales
- [ ] Mettre à jour vision globale si nécessaire
- [ ] Documenter patterns réutilisés

## 🔗 Références

- `@.cursor/rules/agent-performance-optimization.md` - Optimisation performances agent (cache, parallélisation)
- `@.cursor/rules/transversal-performance.md` - Performance transversale (IMPÉRATIF)
- `@.cursor/rules/similar-code-detection.md` - Détection code similaire (IMPÉRATIF)
- `@systemPatterns.md` - Patterns architecturaux (IMPÉRATIF)
- `@projectbrief.md` - Objectifs et périmètre (IMPÉRATIF)
- `@activeContext.md` - État actuel et focus (IMPÉRATIF)
- `@techContext.md` - Stack technique (IMPÉRATIF)

---

**Note:** Cette règle garantit que l'agent améliore systématiquement sa transversalité en comprenant les relations entre modules, en réutilisant les patterns établis et en maintenant une vision globale consolidée.

**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

