# Automatisation par Script - Saxium

**Objectif:** Détecter si une tâche est automatisable par script et créer/exécuter automatiquement le script si c'est plus rapide et efficace

## 🎯 Principe Fondamental

**IMPÉRATIF:** Avant toute implémentation, l'agent DOIT évaluer si la tâche est automatisable par script plutôt que par des actions manuelles.

**Critères d'Automatisation:**
1. **Répétitivité** - Tâche répétitive ou batch
2. **Rapidité** - Script serait plus rapide que actions manuelles
3. **Efficacité** - Script serait plus efficace (moins d'erreurs, plus fiable)
4. **Réutilisabilité** - Script pourrait être réutilisé

## 📋 Processus de Détection d'Automatisation

### Étape 1: Analyse de la Tâche pour Automatisation

**TOUJOURS:**
- ✅ Identifier si la tâche est répétitive
- ✅ Identifier si la tâche implique des opérations batch
- ✅ Identifier si la tâche implique des transformations de fichiers
- ✅ Identifier si la tâche implique des opérations système
- ✅ Identifier si la tâche implique des migrations ou refactorings

**Pattern:**
```typescript
interface TaskAutomationAnalysis {
  task: Task;
  isRepetitive: boolean;
  isBatchOperation: boolean;
  involvesFileTransformations: boolean;
  involvesSystemOperations: boolean;
  involvesMigrations: boolean;
  automationScore: number; // 0-10
  automationRecommendation: 'strong' | 'moderate' | 'weak' | 'none';
}

async function analyzeTaskForAutomation(
  task: Task
): Promise<TaskAutomationAnalysis> {
  // 1. Analyser répétitivité
  const isRepetitive = analyzeRepetitiveness(task);
  
  // 2. Analyser opérations batch
  const isBatchOperation = analyzeBatchOperations(task);
  
  // 3. Analyser transformations de fichiers
  const involvesFileTransformations = analyzeFileTransformations(task);
  
  // 4. Analyser opérations système
  const involvesSystemOperations = analyzeSystemOperations(task);
  
  // 5. Analyser migrations
  const involvesMigrations = analyzeMigrations(task);
  
  // 6. Calculer score d'automatisation
  let automationScore = 0;
  if (isRepetitive) automationScore += 3;
  if (isBatchOperation) automationScore += 2;
  if (involvesFileTransformations) automationScore += 2;
  if (involvesSystemOperations) automationScore += 2;
  if (involvesMigrations) automationScore += 1;
  
  // 7. Déterminer recommandation
  const automationRecommendation = automationScore >= 7 ? 'strong' :
                                   automationScore >= 5 ? 'moderate' :
                                   automationScore >= 3 ? 'weak' : 'none';
  
  return {
    task,
    isRepetitive,
    isBatchOperation,
    involvesFileTransformations,
    involvesSystemOperations,
    involvesMigrations,
    automationScore,
    automationRecommendation
  };
}
```

### Étape 2: Comparaison Script vs Actions Manuelles

**IMPÉRATIF:** Comparer script vs actions manuelles selon 4 critères.

**Pattern:**
```typescript
interface AutomationComparison {
  approach: 'script' | 'manual';
  speed: {
    score: number; // 0-10
    estimatedTime: number; // ms
    reasoning: string;
  };
  efficiency: {
    score: number; // 0-10
    errorRate: number; // 0-1
    reliability: 'low' | 'medium' | 'high';
    reasoning: string;
  };
  maintainability: {
    score: number; // 0-10
    reusability: 'low' | 'medium' | 'high';
    documentation: 'none' | 'basic' | 'comprehensive';
    reasoning: string;
  };
  robustness: {
    score: number; // 0-10
    errorHandling: 'none' | 'basic' | 'comprehensive';
    validation: 'none' | 'basic' | 'strict';
    reasoning: string;
  };
  overallScore: number;
  recommendation: 'script' | 'manual';
}

async function compareAutomationApproaches(
  task: Task,
  automationAnalysis: TaskAutomationAnalysis
): Promise<AutomationComparison[]> {
  const comparisons: AutomationComparison[] = [];
  
  // 1. Évaluer approche script
  const scriptApproach = await evaluateScriptApproach(task, automationAnalysis);
  comparisons.push(scriptApproach);
  
  // 2. Évaluer approche manuelle
  const manualApproach = await evaluateManualApproach(task, automationAnalysis);
  comparisons.push(manualApproach);
  
  // 3. Comparer et recommander
  const best = comparisons.sort((a, b) => b.overallScore - a.overallScore)[0];
  
  return comparisons.map(c => ({
    ...c,
    recommendation: c === best ? c.approach : undefined
  }));
}

async function evaluateScriptApproach(
  task: Task,
  automationAnalysis: TaskAutomationAnalysis
): Promise<AutomationComparison> {
  // 1. Estimer temps d'exécution script
  const estimatedTime = estimateScriptExecutionTime(task);
  
  // 2. Évaluer rapidité
  const speedScore = estimatedTime < 1000 ? 10 :
                     estimatedTime < 5000 ? 8 :
                     estimatedTime < 10000 ? 6 : 4;
  
  // 3. Évaluer efficacité
  const efficiencyScore = automationAnalysis.isRepetitive ? 10 :
                          automationAnalysis.isBatchOperation ? 9 :
                          automationAnalysis.involvesFileTransformations ? 8 : 6;
  
  // 4. Évaluer maintenabilité
  const maintainabilityScore = automationAnalysis.automationScore >= 7 ? 9 :
                               automationAnalysis.automationScore >= 5 ? 7 : 5;
  
  // 5. Évaluer robustesse
  const robustnessScore = 8; // Scripts peuvent avoir gestion d'erreurs complète
  
  // 6. Calculer score global
  const overallScore = (
    speedScore * 0.3 +
    efficiencyScore * 0.3 +
    maintainabilityScore * 0.2 +
    robustnessScore * 0.2
  );
  
  return {
    approach: 'script',
    speed: {
      score: speedScore,
      estimatedTime,
      reasoning: `Script estimé à ${estimatedTime}ms`
    },
    efficiency: {
      score: efficiencyScore,
      errorRate: 0.01, // Scripts ont taux d'erreur très faible
      reliability: 'high',
      reasoning: `Automatisation ${automationAnalysis.automationRecommendation}`
    },
    maintainability: {
      score: maintainabilityScore,
      reusability: 'high',
      documentation: 'comprehensive',
      reasoning: `Script réutilisable et documenté`
    },
    robustness: {
      score: robustnessScore,
      errorHandling: 'comprehensive',
      validation: 'strict',
      reasoning: `Script avec gestion d'erreurs complète`
    },
    overallScore,
    recommendation: overallScore >= 7 ? 'script' : undefined
  };
}

async function evaluateManualApproach(
  task: Task,
  automationAnalysis: TaskAutomationAnalysis
): Promise<AutomationComparison> {
  // 1. Estimer temps d'exécution manuel
  const estimatedTime = estimateManualExecutionTime(task);
  
  // 2. Évaluer rapidité
  const speedScore = estimatedTime < 5000 ? 6 :
                     estimatedTime < 10000 ? 4 :
                     estimatedTime < 30000 ? 2 : 1;
  
  // 3. Évaluer efficacité
  const efficiencyScore = automationAnalysis.isRepetitive ? 3 :
                          automationAnalysis.isBatchOperation ? 4 :
                          automationAnalysis.involvesFileTransformations ? 5 : 7;
  
  // 4. Évaluer maintenabilité
  const maintainabilityScore = 5; // Actions manuelles moins maintenables
  
  // 5. Évaluer robustesse
  const robustnessScore = 6; // Actions manuelles plus sujettes aux erreurs
  
  // 6. Calculer score global
  const overallScore = (
    speedScore * 0.3 +
    efficiencyScore * 0.3 +
    maintainabilityScore * 0.2 +
    robustnessScore * 0.2
  );
  
  return {
    approach: 'manual',
    speed: {
      score: speedScore,
      estimatedTime,
      reasoning: `Actions manuelles estimées à ${estimatedTime}ms`
    },
    efficiency: {
      score: efficiencyScore,
      errorRate: 0.1, // Actions manuelles ont taux d'erreur plus élevé
      reliability: 'medium',
      reasoning: `Actions manuelles moins efficaces pour tâches répétitives`
    },
    maintainability: {
      score: maintainabilityScore,
      reusability: 'low',
      documentation: 'basic',
      reasoning: `Actions manuelles moins maintenables`
    },
    robustness: {
      score: robustnessScore,
      errorHandling: 'basic',
      validation: 'basic',
      reasoning: `Actions manuelles plus sujettes aux erreurs`
    },
    overallScore,
    recommendation: overallScore >= 7 ? 'manual' : undefined
  };
}
```

### Étape 3: Création et Exécution Automatique du Script

**IMPÉRATIF:** Si script est recommandé, créer et exécuter automatiquement le script.

**Pattern:**
```typescript
interface ScriptCreationResult {
  scriptPath: string;
  scriptType: 'typescript' | 'bash' | 'powershell' | 'python';
  executionResult: {
    success: boolean;
    output: string;
    errors: string[];
    executionTime: number;
  };
}

async function createAndExecuteScript(
  task: Task,
  automationAnalysis: TaskAutomationAnalysis
): Promise<ScriptCreationResult> {
  // 1. Déterminer type de script
  const scriptType = determineScriptType(task, automationAnalysis);
  
  // 2. Générer code du script
  const scriptCode = await generateScriptCode(task, scriptType);
  
  // 3. Créer fichier script
  const scriptPath = await createScriptFile(task, scriptCode, scriptType);
  
  // 4. Exécuter script
  const executionResult = await executeScript(scriptPath, scriptType);
  
  // 5. Valider résultat
  if (!executionResult.success) {
    // Corriger et ré-exécuter si nécessaire
    const corrected = await correctScript(scriptPath, executionResult.errors);
    const retryResult = await executeScript(scriptPath, scriptType);
    return {
      scriptPath,
      scriptType,
      executionResult: retryResult
    };
  }
  
  return {
    scriptPath,
    scriptType,
    executionResult
  };
}

function determineScriptType(
  task: Task,
  automationAnalysis: TaskAutomationAnalysis
): 'typescript' | 'bash' | 'powershell' | 'python' {
  // TypeScript pour tâches Node.js/TypeScript
  if (task.involvesTypeScript || task.involvesNodeJS) {
    return 'typescript';
  }
  
  // Bash pour tâches système Unix/Linux
  if (task.involvesSystemOperations && process.platform !== 'win32') {
    return 'bash';
  }
  
  // PowerShell pour tâches système Windows
  if (task.involvesSystemOperations && process.platform === 'win32') {
    return 'powershell';
  }
  
  // Python pour tâches data/ML
  if (task.involvesDataProcessing || task.involvesML) {
    return 'python';
  }
  
  // TypeScript par défaut
  return 'typescript';
}

async function generateScriptCode(
  task: Task,
  scriptType: 'typescript' | 'bash' | 'powershell' | 'python'
): Promise<string> {
  // Générer code selon type de script et tâche
  const code = await generateCodeForTask(task, scriptType);
  
  // Ajouter gestion d'erreurs
  const codeWithErrorHandling = addErrorHandling(code, scriptType);
  
  // Ajouter logging
  const codeWithLogging = addLogging(codeWithErrorHandling, scriptType);
  
  // Ajouter documentation
  const codeWithDocumentation = addDocumentation(codeWithLogging, task, scriptType);
  
  return codeWithDocumentation;
}

async function createScriptFile(
  task: Task,
  scriptCode: string,
  scriptType: 'typescript' | 'bash' | 'powershell' | 'python'
): Promise<string> {
  // 1. Déterminer nom de fichier
  const fileName = generateScriptFileName(task, scriptType);
  
  // 2. Déterminer chemin
  const scriptPath = `scripts/${fileName}`;
  
  // 3. Créer fichier
  await writeFile(scriptPath, scriptCode);
  
  // 4. Rendre exécutable si nécessaire
  if (scriptType === 'bash' || scriptType === 'python') {
    await makeExecutable(scriptPath);
  }
  
  return scriptPath;
}

async function executeScript(
  scriptPath: string,
  scriptType: 'typescript' | 'bash' | 'powershell' | 'python'
): Promise<ExecutionResult> {
  const startTime = Date.now();
  
  try {
    let output: string;
    let errors: string[] = [];
    
    switch (scriptType) {
      case 'typescript':
        // Exécuter avec tsx
        const result = await runTerminalCommand(`tsx ${scriptPath}`);
        output = result.stdout;
        if (result.stderr) errors.push(result.stderr);
        break;
        
      case 'bash':
        const bashResult = await runTerminalCommand(`bash ${scriptPath}`);
        output = bashResult.stdout;
        if (bashResult.stderr) errors.push(bashResult.stderr);
        break;
        
      case 'powershell':
        const psResult = await runTerminalCommand(`powershell -ExecutionPolicy Bypass -File ${scriptPath}`);
        output = psResult.stdout;
        if (psResult.stderr) errors.push(psResult.stderr);
        break;
        
      case 'python':
        const pyResult = await runTerminalCommand(`python ${scriptPath}`);
        output = pyResult.stdout;
        if (pyResult.stderr) errors.push(pyResult.stderr);
        break;
    }
    
    const executionTime = Date.now() - startTime;
    
    return {
      success: errors.length === 0,
      output,
      errors,
      executionTime
    };
  } catch (error) {
    const executionTime = Date.now() - startTime;
    
    return {
      success: false,
      output: '',
      errors: [error.message],
      executionTime
    };
  }
}
```

## 🔄 Workflow Complet d'Automatisation

### Workflow: Automatiser Tâche par Script

**IMPÉRATIF:** Suivre ce workflow si automatisation par script est recommandée.

**Étapes:**
1. **Analyser tâche pour automatisation** - Identifier répétitivité, batch, transformations
2. **Comparer script vs manuel** - Évaluer selon 4 critères (rapidité, efficacité, maintenabilité, robustesse)
3. **Décider automatisation** - Si script recommandé, créer script
4. **Créer script** - Générer code avec gestion d'erreurs, logging, documentation
5. **Exécuter script** - Exécuter et valider résultat
6. **Corriger si nécessaire** - Corriger erreurs et ré-exécuter
7. **Documenter** - Documenter script créé et résultat

**Pattern:**
```typescript
async function automateTaskWithScript(task: Task): Promise<AutomationResult> {
  // 1. Analyser tâche pour automatisation
  const automationAnalysis = await analyzeTaskForAutomation(task);
  
  // 2. Comparer approches
  const comparisons = await compareAutomationApproaches(task, automationAnalysis);
  const scriptComparison = comparisons.find(c => c.approach === 'script');
  const manualComparison = comparisons.find(c => c.approach === 'manual');
  
  // 3. Décider automatisation
  if (scriptComparison && scriptComparison.overallScore >= manualComparison.overallScore) {
    // 4. Créer et exécuter script
    const scriptResult = await createAndExecuteScript(task, automationAnalysis);
    
    // 5. Valider résultat
    if (scriptResult.executionResult.success) {
      // 6. Documenter
      await documentScriptCreation(scriptResult, task);
      
      return {
        success: true,
        approach: 'script',
        scriptPath: scriptResult.scriptPath,
        executionResult: scriptResult.executionResult
      };
    } else {
      // Corriger et ré-exécuter
      const corrected = await correctAndRetryScript(scriptResult);
      return corrected;
    }
  } else {
    // Utiliser approche manuelle
    return {
      success: true,
      approach: 'manual',
      reasoning: 'Approche manuelle plus appropriée'
    };
  }
}
```

## 📊 Critères de Décision d'Automatisation

### Tâches Automatisables par Script

**Forte Recommandation (Score >= 7):**
- ✅ Tâches répétitives (migration, refactoring, nettoyage)
- ✅ Opérations batch (traitement de fichiers multiples)
- ✅ Transformations de fichiers (renommage, restructuration)
- ✅ Migrations de code (refactoring, restructuration)
- ✅ Nettoyage de code (suppression code mort, formatage)
- ✅ Génération de code (templates, scaffolding)

**Recommandation Modérée (Score 5-6):**
- ✅ Tâches avec opérations système (fichiers, processus)
- ✅ Tâches avec transformations de données
- ✅ Tâches avec validations multiples

**Recommandation Faible (Score 3-4):**
- ⚠️ Tâches ponctuelles simples
- ⚠️ Tâches nécessitant décisions contextuelles

### Tâches Non Automatisables

**Pas d'Automatisation:**
- ❌ Tâches nécessitant créativité
- ❌ Tâches nécessitant décisions complexes contextuelles
- ❌ Tâches ponctuelles très simples
- ❌ Tâches nécessitant interaction utilisateur

## 🎯 Checklist Automatisation

### Avant Création de Script

- [ ] Tâche analysée pour automatisation
- [ ] Score d'automatisation calculé
- [ ] Comparaison script vs manuel effectuée
- [ ] Script recommandé (score >= 7)
- [ ] Type de script déterminé (TypeScript, Bash, PowerShell, Python)

### Création de Script

- [ ] Code script généré
- [ ] Gestion d'erreurs ajoutée
- [ ] Logging ajouté
- [ ] Documentation ajoutée
- [ ] Fichier script créé dans `scripts/`
- [ ] Script rendu exécutable si nécessaire

### Exécution de Script

- [ ] Script exécuté
- [ ] Résultat validé
- [ ] Erreurs corrigées si nécessaire
- [ ] Script ré-exécuté si corrections
- [ ] Résultat final validé

### Documentation

- [ ] Script documenté
- [ ] Résultat documenté
- [ ] Raisonnement documenté
- [ ] Script ajouté à `package.json` si réutilisable

## 🔗 Références

### Documentation Essentielle
- `@.cursor/rules/pre-task-evaluation.md` - Évaluation préalable complète
- `@.cursor/rules/transversal-performance.md` - Performance transversale
- `@.cursor/rules/workflows.md` - Workflows détaillés
- `@scripts/` - Scripts existants pour référence

### Fichiers de Mémoire
- `@activeContext.md` - État actuel et focus
- `@systemPatterns.md` - Patterns architecturaux
- `@projectbrief.md` - Objectifs et périmètre

---

**Note:** Cette automatisation par script est intégrée dans le processus d'évaluation préalable. L'agent doit toujours évaluer si un script serait plus rapide et efficace avant d'entamer une tâche.



