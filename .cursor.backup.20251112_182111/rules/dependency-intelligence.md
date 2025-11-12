# Intelligence des Dépendances - Saxium

**Objectif:** Comprendre et gérer intelligemment les dépendances pour éviter les régressions et améliorer la stabilité.

## 🎯 Principe Fondamental

**IMPÉRATIF:** L'agent DOIT comprendre et gérer intelligemment les dépendances pour éviter les régressions et améliorer la stabilité.

**Bénéfices:**
- ✅ Évite les régressions
- ✅ Améliore la stabilité
- ✅ Comprend les impacts des modifications
- ✅ Valide les dépendances avant modification
- ✅ Détecte les dépendances manquantes

## 📋 Règles d'Intelligence des Dépendances

### 1. Analyse Automatique des Dépendances

**TOUJOURS:**
- ✅ Analyser automatiquement les dépendances avant modification
- ✅ Identifier toutes les dépendances (directes et indirectes)
- ✅ Comprendre les impacts des modifications
- ✅ Valider que les dépendances existent

**Pattern:**
```typescript
// Analyser dépendances automatiquement
async function analyzeDependenciesAutomatically(
  modification: Modification,
  context: Context
): Promise<DependencyAnalysis> {
  // 1. Identifier dépendances directes
  const directDependencies = identifyDirectDependencies(modification);
  
  // 2. Identifier dépendances indirectes
  const indirectDependencies = await identifyIndirectDependencies(
    directDependencies,
    context
  );
  
  // 3. Analyser impacts
  const impacts = await analyzeImpacts(
    modification,
    [...directDependencies, ...indirectDependencies]
  );
  
  // 4. Valider existence des dépendances
  const validation = await validateDependencyExistence(
    [...directDependencies, ...indirectDependencies]
  );
  
  // 5. Identifier dépendances manquantes
  const missingDependencies = identifyMissingDependencies(validation);
  
  return {
    direct: directDependencies,
    indirect: indirectDependencies,
    impacts: impacts,
    validation: validation,
    missing: missingDependencies
  };
}
```

### 2. Détection Automatique des Régressions Potentielles

**TOUJOURS:**
- ✅ Détecter automatiquement les régressions potentielles
- ✅ Identifier les modifications qui pourraient casser des dépendances
- ✅ Proposer corrections préventives
- ✅ Valider que les modifications ne cassent pas les dépendances

**Pattern:**
```typescript
// Détecter régressions potentielles automatiquement
async function detectPotentialRegressions(
  modification: Modification,
  dependencies: Dependency[],
  context: Context
): Promise<RegressionDetection> {
  // 1. Analyser modification pour changements de signature
  const signatureChanges = analyzeSignatureChanges(modification);
  
  // 2. Identifier dépendances affectées par changements
  const affectedDependencies = identifyAffectedDependencies(
    signatureChanges,
    dependencies
  );
  
  // 3. Détecter régressions potentielles
  const potentialRegressions: PotentialRegression[] = [];
  
  for (const dep of affectedDependencies) {
    // 4. Analyser si changement casse dépendance
    const wouldBreak = await wouldBreakDependency(signatureChanges, dep);
    
    if (wouldBreak) {
      // 5. Identifier impact
      const impact = await analyzeImpact(dep, context);
      
      // 6. Proposer correction préventive
      const correction = proposePreventiveCorrection(signatureChanges, dep);
      
      potentialRegressions.push({
        dependency: dep,
        impact: impact,
        correction: correction,
        severity: calculateSeverity(impact)
      });
    }
  }
  
  return {
    regressions: potentialRegressions,
    hasCriticalRegressions: potentialRegressions.some(r => r.severity === 'critical')
  };
}
```

### 3. Validation Automatique des Dépendances Après Modification

**TOUJOURS:**
- ✅ Valider automatiquement les dépendances après modification
- ✅ Vérifier que les dépendances fonctionnent toujours
- ✅ Détecter les régressions réelles
- ✅ Corriger automatiquement si possible

**Pattern:**
```typescript
// Valider dépendances après modification automatiquement
async function validateDependenciesAfterModification(
  modification: Modification,
  dependencies: Dependency[],
  context: Context
): Promise<DependencyValidation> {
  // 1. Exécuter tests pour dépendances
  const testResults = await runDependencyTests(dependencies, context);
  
  // 2. Analyser résultats
  const analysis = analyzeTestResults(testResults);
  
  // 3. Détecter régressions réelles
  const regressions = detectRealRegressions(analysis, dependencies);
  
  // 4. Si régressions détectées
  if (regressions.length > 0) {
    // 5. Corriger automatiquement si possible
    const corrections = await autoCorrectRegressions(regressions, modification);
    
    // 6. Re-valider après corrections
    const revalidation = await validateDependenciesAfterModification(
      corrections.modifiedModification,
      dependencies,
      context
    );
    
    return {
      valid: revalidation.valid,
      regressions: regressions,
      corrections: corrections,
      revalidation: revalidation
    };
  }
  
  return {
    valid: true,
    regressions: [],
    corrections: null,
    revalidation: null
  };
}
```

### 4. Gestion Automatique des Dépendances Manquantes

**TOUJOURS:**
- ✅ Détecter automatiquement les dépendances manquantes
- ✅ Proposer installations automatiques
- ✅ Valider que les dépendances sont compatibles
- ✅ Documenter les dépendances ajoutées

**Pattern:**
```typescript
// Gérer dépendances manquantes automatiquement
async function handleMissingDependencies(
  missingDependencies: MissingDependency[],
  context: Context
): Promise<DependencyManagement> {
  // 1. Pour chaque dépendance manquante
  const managed: ManagedDependency[] = [];
  
  for (const missing of missingDependencies) {
    // 2. Chercher package disponible
    const availablePackage = await findAvailablePackage(missing);
    
    if (availablePackage) {
      // 3. Vérifier compatibilité
      const compatibility = await checkCompatibility(availablePackage, context);
      
      if (compatibility.compatible) {
        // 4. Proposer installation
        const installation = proposeInstallation(availablePackage, compatibility);
        
        managed.push({
          missing: missing,
          package: availablePackage,
          compatibility: compatibility,
          installation: installation,
          action: 'install'
        });
      } else {
        // 5. Proposer alternative
        const alternative = proposeAlternative(missing, compatibility);
        
        managed.push({
          missing: missing,
          package: null,
          compatibility: compatibility,
          installation: null,
          alternative: alternative,
          action: 'alternative'
        });
      }
    } else {
      // 6. Documenter dépendance manquante
      managed.push({
        missing: missing,
        package: null,
        compatibility: null,
        installation: null,
        action: 'document'
      });
    }
  }
  
  return {
    managed: managed,
    toInstall: managed.filter(m => m.action === 'install'),
    alternatives: managed.filter(m => m.action === 'alternative'),
    toDocument: managed.filter(m => m.action === 'document')
  };
}
```

## 🔄 Workflow d'Intelligence des Dépendances

### Workflow: Gérer Dépendances Intelligemment

**Étapes:**
1. Analyser dépendances avant modification
2. Détecter régressions potentielles
3. Proposer corrections préventives
4. Appliquer modifications
5. Valider dépendances après modification
6. Détecter régressions réelles
7. Corriger automatiquement si possible
8. Gérer dépendances manquantes

**Pattern:**
```typescript
async function manageDependenciesIntelligently(
  modification: Modification,
  context: Context
): Promise<DependencyManagementResult> {
  // 1. Analyser dépendances
  const analysis = await analyzeDependenciesAutomatically(modification, context);
  
  // 2. Si dépendances manquantes
  if (analysis.missing.length > 0) {
    const management = await handleMissingDependencies(analysis.missing, context);
    
    // 3. Installer dépendances si nécessaire
    if (management.toInstall.length > 0) {
      await installDependencies(management.toInstall);
    }
  }
  
  // 4. Détecter régressions potentielles
  const regressionDetection = await detectPotentialRegressions(
    modification,
    [...analysis.direct, ...analysis.indirect],
    context
  );
  
  // 5. Si régressions potentielles critiques
  if (regressionDetection.hasCriticalRegressions) {
    // 6. Appliquer corrections préventives
    const correctedModification = await applyPreventiveCorrections(
      modification,
      regressionDetection.regressions
    );
    
    modification = correctedModification;
  }
  
  // 7. Appliquer modification
  const result = await applyModification(modification, context);
  
  // 8. Valider dépendances après modification
  const validation = await validateDependenciesAfterModification(
    modification,
    [...analysis.direct, ...analysis.indirect],
    context
  );
  
  return {
    analysis: analysis,
    regressionDetection: regressionDetection,
    validation: validation,
    result: result
  };
}
```

## ⚠️ Règles d'Intelligence des Dépendances

### Ne Jamais:

**BLOQUANT:**
- ❌ Modifier sans analyser dépendances
- ❌ Ignorer régressions potentielles
- ❌ Ignorer dépendances manquantes
- ❌ Ne pas valider dépendances après modification

**TOUJOURS:**
- ✅ Analyser dépendances avant modification
- ✅ Détecter régressions potentielles
- ✅ Valider dépendances après modification
- ✅ Gérer dépendances manquantes

## 📊 Checklist Intelligence des Dépendances

### Avant Modification

- [ ] Analyser dépendances (directes et indirectes)
- [ ] Détecter régressions potentielles
- [ ] Proposer corrections préventives
- [ ] Gérer dépendances manquantes

### Après Modification

- [ ] Valider dépendances
- [ ] Détecter régressions réelles
- [ ] Corriger automatiquement si possible
- [ ] Documenter modifications

## 🔗 Références

- `@.cursor/rules/preventive-validation.md` - Validation préventive
- `@.cursor/rules/iterative-perfection.md` - Itération automatique jusqu'à perfection
- `@.cursor/rules/core.md` - Règles fondamentales

---

**Note:** Cette règle garantit que l'agent comprend et gère intelligemment les dépendances pour éviter les régressions et améliorer la stabilité.

