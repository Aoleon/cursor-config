# Gestionnaire de Mises à Jour - Saxium

**Objectif:** Garantir que l'agent utilise systématiquement les dernières versions disponibles des packages npm et outils, avec un pilotage structuré et sécurisé des mises à jour.

## 🎯 Principe Fondamental

**IMPÉRATIF:** L'agent DOIT agir comme un gestionnaire de mises à jour qui détecte, analyse, planifie et exécute les mises à jour de manière structurée et sécurisée.

**Bénéfices:**
- ✅ Utilisation systématique des dernières versions disponibles
- ✅ Détection automatique des mises à jour disponibles
- ✅ Analyse complète des risques avant application
- ✅ Planification structurée par phases
- ✅ Validation automatique après chaque mise à jour
- ✅ Rollback automatique en cas de problème
- ✅ Documentation complète des mises à jour effectuées

## 📋 Responsabilités du Gestionnaire de Mises à Jour

### 1. Détection Automatique des Mises à Jour

**TOUJOURS:**
- ✅ Vérifier automatiquement les versions disponibles via npm outdated ou API npm
- ✅ Comparer versions installées vs dernières versions disponibles
- ✅ Catégoriser par type (PATCH, MINOR, MAJOR)
- ✅ Détecter les outils système (Node.js, TypeScript, etc.)
- ✅ Générer rapport structuré des mises à jour disponibles

**Pattern:**
```typescript
// Détecter mises à jour disponibles automatiquement
async function detectAvailableUpdates(
  packageJson: PackageJson,
  context: Context
): Promise<UpdateDetection> {
  // 1. Vérifier packages npm
  const npmUpdates = await checkNpmUpdates(packageJson);
  
  // 2. Vérifier outils système
  const systemTools = await checkSystemTools();
  
  // 3. Catégoriser par type
  const categorized = categorizeUpdates([...npmUpdates, ...systemTools]);
  
  // 4. Générer rapport structuré
  return {
    patch: categorized.patch,
    minor: categorized.minor,
    major: categorized.major,
    total: categorized.all.length,
    packages: categorized.all,
    systemTools: systemTools,
    timestamp: Date.now()
  };
}

// Vérifier mises à jour npm
async function checkNpmUpdates(
  packageJson: PackageJson
): Promise<PackageUpdate[]> {
  // 1. Exécuter npm outdated
  const outdatedResult = await execCommand('npm outdated --json');
  
  // 2. Parser résultats
  const outdated = JSON.parse(outdatedResult.stdout);
  
  // 3. Convertir en format structuré
  return Object.entries(outdated).map(([name, info]: [string, any]) => ({
    name,
    current: info.current,
    wanted: info.wanted,
    latest: info.latest,
    type: calculateUpdateType(info.current, info.latest),
    location: info.location,
    dependent: info.dependent
  }));
}

// Catégoriser mises à jour par type
function categorizeUpdates(
  updates: Update[]
): CategorizedUpdates {
  const patch: Update[] = [];
  const minor: Update[] = [];
  const major: Update[] = [];
  
  for (const update of updates) {
    if (update.type === 'PATCH') {
      patch.push(update);
    } else if (update.type === 'MINOR') {
      minor.push(update);
    } else if (update.type === 'MAJOR') {
      major.push(update);
    }
  }
  
  return {
    patch,
    minor,
    major,
    all: [...patch, ...minor, ...major]
  };
}

// Calculer type de mise à jour
function calculateUpdateType(
  current: string,
  latest: string
): 'PATCH' | 'MINOR' | 'MAJOR' {
  const currentVersion = parseVersion(current);
  const latestVersion = parseVersion(latest);
  
  if (latestVersion.major > currentVersion.major) {
    return 'MAJOR';
  } else if (latestVersion.minor > currentVersion.minor) {
    return 'MINOR';
  } else {
    return 'PATCH';
  }
}
```

**Références:**
- `@docs/other/DEPENDENCY_UPDATE_STATUS.md` - État actuel des mises à jour
- `@docs/other/DEPENDENCY_AUDIT.md` - Audit des dépendances
- `@docs/other/DEPENDENCY_UPDATE_GUIDE.md` - Guide de mise à jour

### 2. Analyse des Risques et Breaking Changes

**TOUJOURS:**
- ✅ Analyser les changelogs pour détecter breaking changes
- ✅ Évaluer l'impact sur le codebase existant
- ✅ Calculer un score de risque par mise à jour
- ✅ Identifier les dépendances affectées
- ✅ Générer recommandations par mise à jour

**Pattern:**
```typescript
// Analyser risques et breaking changes
async function analyzeUpdateRisks(
  update: Update,
  context: Context
): Promise<RiskAnalysis> {
  // 1. Analyser changelog
  const changelog = await fetchChangelog(update.package, update.version);
  const breakingChanges = extractBreakingChanges(changelog);
  
  // 2. Analyser impact codebase
  const impact = await analyzeCodebaseImpact(update, context);
  
  // 3. Calculer score de risque
  const riskScore = calculateRiskScore(breakingChanges, impact);
  
  // 4. Générer recommandation
  const recommendation = generateRecommendation(riskScore, breakingChanges, impact);
  
  return {
    update,
    breakingChanges,
    impact,
    riskScore,
    recommendation,
    safeToUpdate: riskScore < 3 && breakingChanges.length === 0
  };
}

// Extraire breaking changes du changelog
function extractBreakingChanges(
  changelog: string
): BreakingChange[] {
  const breakingChanges: BreakingChange[] = [];
  
  // Patterns de détection
  const patterns = [
    /BREAKING CHANGE:?\s*(.+)/gi,
    /⚠️\s*Breaking:?\s*(.+)/gi,
    /\[BREAKING\]\s*(.+)/gi
  ];
  
  for (const pattern of patterns) {
    const matches = changelog.matchAll(pattern);
    for (const match of matches) {
      breakingChanges.push({
        description: match[1].trim(),
        severity: 'high',
        affected: extractAffectedAreas(match[1])
      });
    }
  }
  
  return breakingChanges;
}

// Analyser impact sur codebase
async function analyzeCodebaseImpact(
  update: Update,
  context: Context
): Promise<CodebaseImpact> {
  // 1. Rechercher utilisations du package
  const usages = await codebase_search(
    `Where is ${update.name} used?`,
    []
  );
  
  // 2. Analyser fichiers affectés
  const affectedFiles = usages.map(u => u.file);
  
  // 3. Estimer complexité migration
  const migrationComplexity = estimateMigrationComplexity(
    update,
    affectedFiles,
    context
  );
  
  // 4. Identifier dépendances affectées
  const affectedDependencies = await identifyAffectedDependencies(
    update,
    context
  );
  
  return {
    usages: usages.length,
    affectedFiles: affectedFiles.length,
    migrationComplexity,
    affectedDependencies,
    estimatedEffort: calculateEstimatedEffort(migrationComplexity, affectedFiles.length)
  };
}

// Calculer score de risque
function calculateRiskScore(
  breakingChanges: BreakingChange[],
  impact: CodebaseImpact
): number {
  let score = 0;
  
  // Breaking changes (0-5 points)
  score += breakingChanges.length * 2;
  if (breakingChanges.length > 0) {
    score += 1; // Bonus pour présence de breaking changes
  }
  
  // Impact codebase (0-3 points)
  if (impact.affectedFiles > 50) {
    score += 3;
  } else if (impact.affectedFiles > 20) {
    score += 2;
  } else if (impact.affectedFiles > 5) {
    score += 1;
  }
  
  // Complexité migration (0-2 points)
  if (impact.migrationComplexity === 'high') {
    score += 2;
  } else if (impact.migrationComplexity === 'medium') {
    score += 1;
  }
  
  return Math.min(score, 10); // Max 10
}

// Générer recommandation
function generateRecommendation(
  riskScore: number,
  breakingChanges: BreakingChange[],
  impact: CodebaseImpact
): UpdateRecommendation {
  if (riskScore < 3 && breakingChanges.length === 0) {
    return {
      action: 'UPDATE_SAFE',
      priority: 'high',
      reason: 'Mise à jour sûre, pas de breaking changes',
      estimatedTime: '5-10 minutes'
    };
  } else if (riskScore < 5 && breakingChanges.length > 0) {
    return {
      action: 'UPDATE_WITH_CAUTION',
      priority: 'medium',
      reason: 'Breaking changes détectés, nécessite tests',
      estimatedTime: `${impact.estimatedEffort} minutes`,
      requiresTests: true
    };
  } else {
    return {
      action: 'DEFER_UPDATE',
      priority: 'low',
      reason: 'Risque élevé, breaking changes importants',
      estimatedTime: 'N/A',
      requiresPlanning: true
    };
  }
}
```

**Référence:** `@.cursor/rules/dependency-intelligence.md` - Intelligence des dépendances

### 3. Planification Structurée des Mises à Jour

**TOUJOURS:**
- ✅ Créer un plan de mise à jour par phases (PATCH → MINOR → MAJOR)
- ✅ Prioriser selon risque et impact
- ✅ Gérer les dépendances entre mises à jour
- ✅ Créer des scripts automatisés pour chaque phase
- ✅ Générer plan de rollback pour chaque phase

**Pattern:**
```typescript
// Planifier mises à jour structurées
async function planUpdates(
  updates: Update[],
  context: Context
): Promise<UpdatePlan> {
  // 1. Analyser risques pour chaque mise à jour
  const riskAnalyses = await Promise.all(
    updates.map(update => analyzeUpdateRisks(update, context))
  );
  
  // 2. Grouper par phase
  const phases = {
    phase1: riskAnalyses.filter(a => 
      a.update.type === 'PATCH' && a.riskScore < 3
    ),
    phase2: riskAnalyses.filter(a => 
      a.update.type === 'MINOR' && a.riskScore < 5
    ),
    phase3: riskAnalyses.filter(a => 
      a.update.type === 'MAJOR' || a.riskScore >= 5
    )
  };
  
  // 3. Prioriser dans chaque phase
  const prioritized = prioritizeWithinPhases(phases);
  
  // 4. Générer scripts
  const scripts = generateUpdateScripts(prioritized);
  
  // 5. Générer plan de rollback
  const rollbackPlan = generateRollbackPlan(prioritized);
  
  return {
    phases: prioritized,
    scripts,
    estimatedTime: calculateEstimatedTime(prioritized),
    rollbackPlan,
    totalUpdates: updates.length,
    safeUpdates: phases.phase1.length,
    riskyUpdates: phases.phase3.length
  };
}

// Prioriser dans chaque phase
function prioritizeWithinPhases(
  phases: PhasedUpdates
): PrioritizedPhases {
  return {
    phase1: phases.phase1.sort((a, b) => {
      // Prioriser par risque croissant
      if (a.riskScore !== b.riskScore) {
        return a.riskScore - b.riskScore;
      }
      // Puis par impact décroissant
      return b.impact.affectedFiles - a.impact.affectedFiles;
    }),
    phase2: phases.phase2.sort((a, b) => {
      // Prioriser par risque croissant
      if (a.riskScore !== b.riskScore) {
        return a.riskScore - b.riskScore;
      }
      // Puis par impact décroissant
      return b.impact.affectedFiles - a.impact.affectedFiles;
    }),
    phase3: phases.phase3.sort((a, b) => {
      // Prioriser par impact décroissant (mises à jour majeures)
      if (b.impact.affectedFiles !== a.impact.affectedFiles) {
        return b.impact.affectedFiles - a.impact.affectedFiles;
      }
      // Puis par risque croissant
      return a.riskScore - b.riskScore;
    })
  };
}

// Générer scripts de mise à jour
function generateUpdateScripts(
  prioritized: PrioritizedPhases
): UpdateScripts {
  const scripts: UpdateScript[] = [];
  
  // Phase 1: PATCH (sûres)
  if (prioritized.phase1.length > 0) {
    const packages = prioritized.phase1.map(a => 
      `${a.update.name}@${a.update.latest}`
    ).join(' \\\n  ');
    
    scripts.push({
      phase: 1,
      name: 'Phase 1: PATCH Updates (Safe)',
      command: `npm install \\\n  ${packages}`,
      packages: prioritized.phase1.map(a => a.update.name),
      estimatedTime: '5-10 minutes',
      risk: 'low'
    });
  }
  
  // Phase 2: MINOR (avec précaution)
  if (prioritized.phase2.length > 0) {
    const packages = prioritized.phase2.map(a => 
      `${a.update.name}@${a.update.latest}`
    ).join(' \\\n  ');
    
    scripts.push({
      phase: 2,
      name: 'Phase 2: MINOR Updates (With Caution)',
      command: `npm install \\\n  ${packages}`,
      packages: prioritized.phase2.map(a => a.update.name),
      estimatedTime: '10-15 minutes',
      risk: 'medium',
      requiresTests: true
    });
  }
  
  // Phase 3: MAJOR (planification requise)
  if (prioritized.phase3.length > 0) {
    for (const analysis of prioritized.phase3) {
      scripts.push({
        phase: 3,
        name: `Phase 3: ${analysis.update.name} MAJOR Update`,
        command: `npm install ${analysis.update.name}@${analysis.update.latest}`,
        packages: [analysis.update.name],
        estimatedTime: `${analysis.impact.estimatedEffort} minutes`,
        risk: 'high',
        requiresPlanning: true,
        requiresTests: true,
        breakingChanges: analysis.breakingChanges
      });
    }
  }
  
  return { scripts, totalPhases: scripts.length };
}

// Générer plan de rollback
function generateRollbackPlan(
  prioritized: PrioritizedPhases
): RollbackPlan {
  const rollbackSteps: RollbackStep[] = [];
  
  // Pour chaque phase, créer étape de rollback
  for (const analysis of [...prioritized.phase1, ...prioritized.phase2, ...prioritized.phase3]) {
    rollbackSteps.push({
      package: analysis.update.name,
      currentVersion: analysis.update.current,
      targetVersion: analysis.update.latest,
      rollbackCommand: `npm install ${analysis.update.name}@${analysis.update.current}`,
      backupLocation: `package.json.backup.${Date.now()}`
    });
  }
  
  return {
    steps: rollbackSteps,
    globalRollback: `git checkout package.json package-lock.json && npm install`
  };
}
```

**Référence:** `@docs/other/DEPENDENCY_UPDATE_GUIDE.md` - Guide de mise à jour avec phases

### 4. Exécution et Validation

**TOUJOURS:**
- ✅ Exécuter les mises à jour de manière sécurisée
- ✅ Valider après chaque mise à jour (compilation, tests)
- ✅ Détecter les régressions immédiatement
- ✅ Rollback automatique si problème critique
- ✅ Documenter chaque mise à jour effectuée

**Pattern:**
```typescript
// Exécuter mise à jour de manière sécurisée
async function executeUpdate(
  update: Update,
  context: Context
): Promise<UpdateResult> {
  // 1. Backup état actuel
  await backupCurrentState(context);
  
  // 2. Installer mise à jour
  const installResult = await installUpdate(update);
  
  if (!installResult.success) {
    return {
      success: false,
      error: installResult.error,
      rollback: await rollback(context)
    };
  }
  
  // 3. Valider compilation
  const compilationResult = await validateCompilation(context);
  
  // 4. Exécuter tests
  const testResult = await runTests(context);
  
  // 5. Si problème, rollback
  if (!compilationResult.success || !testResult.success) {
    await rollback(context);
    return {
      success: false,
      error: 'Validation failed',
      compilation: compilationResult,
      tests: testResult,
      rollback: await rollback(context)
    };
  }
  
  // 6. Documenter mise à jour
  await documentUpdate(update, context);
  
  return {
    success: true,
    update,
    compilation: compilationResult,
    tests: testResult,
    timestamp: Date.now()
  };
}

// Backup état actuel
async function backupCurrentState(
  context: Context
): Promise<BackupResult> {
  const timestamp = Date.now();
  
  // 1. Backup package.json
  await execCommand(`cp package.json package.json.backup.${timestamp}`);
  
  // 2. Backup package-lock.json
  await execCommand(`cp package-lock.json package-lock.json.backup.${timestamp}`);
  
  // 3. Git commit si disponible
  try {
    await execCommand('git add package.json package-lock.json');
    await execCommand(`git commit -m "Backup before update ${timestamp}"`);
  } catch (error) {
    // Git non disponible, continuer avec backups locaux
  }
  
  return {
    timestamp,
    packageJson: `package.json.backup.${timestamp}`,
    packageLock: `package-lock.json.backup.${timestamp}`
  };
}

// Installer mise à jour
async function installUpdate(
  update: Update
): Promise<InstallResult> {
  try {
    const result = await execCommand(
      `npm install ${update.name}@${update.latest}`
    );
    
    return {
      success: true,
      output: result.stdout,
      error: null
    };
  } catch (error) {
    return {
      success: false,
      output: null,
      error: error.message
    };
  }
}

// Valider compilation
async function validateCompilation(
  context: Context
): Promise<CompilationResult> {
  try {
    const result = await execCommand('npm run check');
    
    return {
      success: result.exitCode === 0,
      errors: extractTypeScriptErrors(result.stdout),
      warnings: extractTypeScriptWarnings(result.stdout)
    };
  } catch (error) {
    return {
      success: false,
      errors: [error.message],
      warnings: []
    };
  }
}

// Exécuter tests
async function runTests(
  context: Context
): Promise<TestResult> {
  try {
    // 1. Tests unitaires si disponibles
    const unitTests = await execCommand('npm test -- --run');
    
    // 2. Tests E2E si disponibles
    const e2eTests = await execCommand('npx playwright test --reporter=list');
    
    return {
      success: unitTests.exitCode === 0 && e2eTests.exitCode === 0,
      unitTests: {
        passed: extractPassedTests(unitTests.stdout),
        failed: extractFailedTests(unitTests.stdout)
      },
      e2eTests: {
        passed: extractPassedTests(e2eTests.stdout),
        failed: extractFailedTests(e2eTests.stdout)
      }
    };
  } catch (error) {
    return {
      success: false,
      unitTests: { passed: [], failed: [error.message] },
      e2eTests: { passed: [], failed: [] }
    };
  }
}

// Rollback
async function rollback(
  context: Context
): Promise<RollbackResult> {
  try {
    // 1. Restaurer package.json
    const backupFiles = await glob('package.json.backup.*');
    if (backupFiles.length > 0) {
      const latestBackup = backupFiles.sort().reverse()[0];
      await execCommand(`cp ${latestBackup} package.json`);
    }
    
    // 2. Restaurer package-lock.json
    const lockBackups = await glob('package-lock.json.backup.*');
    if (lockBackups.length > 0) {
      const latestLockBackup = lockBackups.sort().reverse()[0];
      await execCommand(`cp ${latestLockBackup} package-lock.json`);
    }
    
    // 3. Réinstaller dépendances
    await execCommand('npm install');
    
    return {
      success: true,
      restored: true
    };
  } catch (error) {
    return {
      success: false,
      restored: false,
      error: error.message
    };
  }
}
```

**Référence:** `@.cursor/rules/senior-architect-oversight.md` - Supervision architecte sénior pour validation

### 5. Intégration avec Règles Existantes

**Intégrations:**

#### Intégration avec `dependency-intelligence.md`

**Workflow Collaboratif Update Manager + Dependency Intelligence:**

**Étapes:**
1. **Update Manager** : Détecte mises à jour disponibles
2. **Dependency Intelligence** : Analyse dépendances avant mise à jour
3. **Update Manager** : Planifie mise à jour selon analyse dépendances
4. **Dependency Intelligence** : Valide dépendances après mise à jour

**Pattern:**
```typescript
// Intégration Update Manager + Dependency Intelligence
async function updateWithDependencyIntelligence(
  update: Update,
  context: Context
): Promise<UpdateResult> {
  // 1. Update Manager : Détecter mise à jour
  const updateDetection = await detectAvailableUpdates(packageJson, context);
  
  // 2. Dependency Intelligence : Analyser dépendances
  const dependencyAnalysis = await analyzeDependenciesAutomatically(
    { type: 'update', package: update.name },
    context
  );
  
  // 3. Update Manager : Planifier selon analyse dépendances
  const updatePlan = await planUpdates(
    [update],
    { ...context, dependencyAnalysis }
  );
  
  // 4. Update Manager : Exécuter mise à jour
  const updateResult = await executeUpdate(update, context);
  
  // 5. Dependency Intelligence : Valider dépendances après mise à jour
  const dependencyValidation = await validateDependenciesAfterModification(
    { type: 'update', package: update.name },
    dependencyAnalysis.direct,
    context
  );
  
  return {
    update: updateResult,
    dependencyAnalysis,
    dependencyValidation,
    success: updateResult.success && dependencyValidation.valid
  };
}
```

**Référence:** `@.cursor/rules/dependency-intelligence.md` - Intelligence des dépendances

#### Intégration avec `senior-architect-oversight.md`

**Workflow Collaboratif Update Manager + Architecte Sénior:**

**Étapes:**
1. **Update Manager** : Détecte et planifie mises à jour
2. **Architecte Sénior** : Valide qualité technique et architecture
3. **Update Manager** : Exécute mise à jour
4. **Architecte Sénior** : Review code après mise à jour

**Pattern:**
```typescript
// Intégration Update Manager + Architecte Sénior
async function updateWithArchitectSupervision(
  update: Update,
  context: Context
): Promise<SupervisedUpdateResult> {
  // 1. Update Manager : Détecter et planifier
  const updatePlan = await planUpdates([update], context);
  
  // 2. Architecte Sénior : Valider plan
  const architectValidation = await performArchitectCodeReview(
    updatePlan,
    context
  );
  
  if (!architectValidation.approved) {
    return {
      success: false,
      reason: 'Architectural validation failed',
      architectValidation
    };
  }
  
  // 3. Update Manager : Exécuter
  const updateResult = await executeUpdate(update, context);
  
  // 4. Architecte Sénior : Review après mise à jour
  const postUpdateReview = await performArchitectCodeReview(
    updateResult,
    context
  );
  
  return {
    success: updateResult.success && postUpdateReview.approved,
    update: updateResult,
    architectValidation,
    postUpdateReview
  };
}
```

**Référence:** `@.cursor/rules/senior-architect-oversight.md` - Supervision architecte sénior

#### Intégration avec `tech-debt-manager.md`

**Workflow Collaboratif Update Manager + Tech Debt Manager:**

**Étapes:**
1. **Update Manager** : Détecte mises à jour disponibles
2. **Tech Debt Manager** : Identifie dette technique liée aux packages obsolètes
3. **Update Manager** : Coordonne avec élimination de dette technique
4. **Tech Debt Manager** : Valide consolidation après mise à jour

**Pattern:**
```typescript
// Intégration Update Manager + Tech Debt Manager
async function updateWithTechDebtCoordination(
  update: Update,
  context: Context
): Promise<CoordinatedUpdateResult> {
  // 1. Update Manager : Détecter mise à jour
  const updateDetection = await detectAvailableUpdates(packageJson, context);
  
  // 2. Tech Debt Manager : Identifier dette technique liée
  const debtAnalysis = await identifyDuplicatedServices(
    updateDetection.packages,
    context
  );
  
  // 3. Update Manager : Planifier avec coordination dette technique
  const updatePlan = await planUpdates(
    [update],
    { ...context, debtAnalysis }
  );
  
  // 4. Update Manager : Exécuter mise à jour
  const updateResult = await executeUpdate(update, context);
  
  // 5. Tech Debt Manager : Valider consolidation
  const consolidationValidation = await planServiceConsolidation(
    debtAnalysis.duplicatedServices,
    targetArchitecture,
    context
  );
  
  return {
    update: updateResult,
    debtAnalysis,
    consolidationValidation,
    success: updateResult.success && consolidationValidation.ready
  };
}
```

**Référence:** `@.cursor/rules/tech-debt-manager.md` - Gestionnaire dette technique

## 🔄 Workflow de Gestion des Mises à Jour

### Workflow: Détection et Mise à Jour Complète

**Étapes:**
1. **Détection** : Détecter mises à jour disponibles
2. **Analyse** : Analyser risques et breaking changes
3. **Planification** : Planifier par phases
4. **Validation Architecte** : Valider avec architecte sénior
5. **Exécution** : Exécuter mises à jour par phases
6. **Validation** : Valider après chaque phase
7. **Documentation** : Documenter mises à jour effectuées

**Pattern:**
```typescript
async function manageUpdatesCompletely(
  context: Context
): Promise<UpdateManagementResult> {
  // 1. Détection
  const detection = await detectAvailableUpdates(packageJson, context);
  
  if (detection.total === 0) {
    return {
      success: true,
      message: 'No updates available',
      detection
    };
  }
  
  // 2. Analyse risques
  const riskAnalyses = await Promise.all(
    detection.packages.map(update => analyzeUpdateRisks(update, context))
  );
  
  // 3. Planification
  const plan = await planUpdates(detection.packages, context);
  
  // 4. Validation Architecte
  const architectValidation = await performArchitectCodeReview(plan, context);
  
  if (!architectValidation.approved) {
    return {
      success: false,
      reason: 'Architectural validation failed',
      plan,
      architectValidation
    };
  }
  
  // 5. Exécution par phases
  const results: UpdateResult[] = [];
  
  for (const phase of plan.phases.phase1) {
    const result = await executeUpdate(phase.update, context);
    results.push(result);
    
    if (!result.success) {
      return {
        success: false,
        reason: 'Phase 1 update failed',
        results,
        rollback: await rollback(context)
      };
    }
  }
  
  // 6. Validation après Phase 1
  const phase1Validation = await validateCompilation(context);
  const phase1Tests = await runTests(context);
  
  if (!phase1Validation.success || !phase1Tests.success) {
    return {
      success: false,
      reason: 'Phase 1 validation failed',
      results,
      rollback: await rollback(context)
    };
  }
  
  // 7. Documentation
  await documentUpdates(results, context);
  
  return {
    success: true,
    detection,
    plan,
    results,
    architectValidation,
    phase1Validation,
    phase1Tests
  };
}
```

### Workflow: Détection Proactive (Avant Développement)

**Quand:** Avant chaque développement significatif

**Étapes:**
1. **Détection Automatique** : Détecter mises à jour disponibles
2. **Analyse Rapide** : Analyser risques rapidement
3. **Proposition** : Proposer plan de mise à jour si nécessaire
4. **Validation Utilisateur** : Utilisateur valide ou agent applique automatiquement

**Pattern:**
```typescript
async function detectUpdatesProactively(
  context: Context
): Promise<ProactiveDetectionResult> {
  // 1. Détection automatique
  const detection = await detectAvailableUpdates(packageJson, context);
  
  // 2. Analyse rapide (seulement PATCH et MINOR)
  const quickAnalysis = await Promise.all(
    detection.packages
      .filter(u => u.type === 'PATCH' || u.type === 'MINOR')
      .map(update => analyzeUpdateRisks(update, context))
  );
  
  // 3. Filtrer mises à jour sûres
  const safeUpdates = quickAnalysis.filter(a => a.safeToUpdate);
  
  // 4. Proposer plan si mises à jour sûres disponibles
  if (safeUpdates.length > 0) {
    const plan = await planUpdates(
      safeUpdates.map(a => a.update),
      context
    );
    
    return {
      hasUpdates: true,
      safeUpdates: safeUpdates.length,
      plan,
      recommendation: 'Apply safe updates before development'
    };
  }
  
  return {
    hasUpdates: false,
    safeUpdates: 0,
    plan: null,
    recommendation: 'No safe updates available'
  };
}
```

### Workflow: Détection sur Demande

**Quand:** Utilisateur demande explicitement

**Étapes:**
1. **Vérification Complète** : Exécuter vérification complète
2. **Rapport Détaillé** : Générer rapport détaillé
3. **Plan d'Action** : Proposer plan d'action
4. **Exécution** : Exécuter selon validation utilisateur

**Pattern:**
```typescript
async function checkUpdatesOnDemand(
  context: Context
): Promise<OnDemandCheckResult> {
  // 1. Vérification complète
  const detection = await detectAvailableUpdates(packageJson, context);
  
  // 2. Analyse complète pour toutes les mises à jour
  const fullAnalysis = await Promise.all(
    detection.packages.map(update => analyzeUpdateRisks(update, context))
  );
  
  // 3. Générer rapport détaillé
  const report = generateDetailedReport(detection, fullAnalysis);
  
  // 4. Proposer plan d'action
  const plan = await planUpdates(detection.packages, context);
  
  return {
    detection,
    analysis: fullAnalysis,
    report,
    plan,
    recommendations: generateRecommendations(fullAnalysis, plan)
  };
}
```

## ⚠️ Règles de Gestion des Mises à Jour

### Ne Jamais:

**BLOQUANT:**
- ❌ Mettre à jour sans analyser risques
- ❌ Mettre à jour sans planifier
- ❌ Mettre à jour sans valider après
- ❌ Ignorer breaking changes détectés
- ❌ Ne pas créer backup avant mise à jour
- ❌ Ne pas valider compilation après mise à jour
- ❌ Ne pas exécuter tests après mise à jour

**TOUJOURS:**
- ✅ Analyser risques avant mise à jour
- ✅ Planifier par phases
- ✅ Créer backup avant mise à jour
- ✅ Valider compilation après mise à jour
- ✅ Exécuter tests après mise à jour
- ✅ Documenter chaque mise à jour
- ✅ Rollback automatique si problème

## 📊 Checklist Gestion des Mises à Jour

### Avant Mise à Jour

- [ ] Détecter mises à jour disponibles
- [ ] Analyser risques et breaking changes
- [ ] Planifier par phases
- [ ] Valider avec architecte sénior
- [ ] Créer backup (package.json, package-lock.json)
- [ ] Préparer plan de rollback

### Pendant Mise à Jour

- [ ] Exécuter mise à jour par phases
- [ ] Valider compilation après chaque phase
- [ ] Exécuter tests après chaque phase
- [ ] Détecter régressions immédiatement
- [ ] Documenter changements

### Après Mise à Jour

- [ ] Valider compilation complète
- [ ] Exécuter tests complets (unitaires + E2E)
- [ ] Valider avec architecte sénior
- [ ] Documenter mise à jour complète
- [ ] Mettre à jour documentation (DEPENDENCY_UPDATE_STATUS.md)
- [ ] Nettoyer backups anciens

## 🔗 Références

- `@docs/other/DEPENDENCY_UPDATE_STATUS.md` - État actuel des mises à jour
- `@docs/other/DEPENDENCY_AUDIT.md` - Audit des dépendances
- `@docs/other/DEPENDENCY_UPDATE_GUIDE.md` - Guide de mise à jour
- `@scripts/update-phase-1.sh` - Script existant pour référence
- `@.cursor/rules/dependency-intelligence.md` - Intelligence des dépendances
- `@.cursor/rules/senior-architect-oversight.md` - Supervision architecte sénior
- `@.cursor/rules/tech-debt-manager.md` - Gestionnaire dette technique

---

**Note:** Cette règle garantit que l'agent utilise systématiquement les dernières versions disponibles des packages npm et outils, avec un pilotage structuré et sécurisé des mises à jour.

