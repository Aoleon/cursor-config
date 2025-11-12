# Détection Proactive des Conflits - Saxium

**Objectif:** Détecter automatiquement les conflits potentiels avant modification pour éviter les problèmes.

## 🎯 Principe Fondamental

**IMPÉRATIF:** L'agent DOIT détecter automatiquement les conflits potentiels avant modification pour éviter les problèmes.

**Bénéfices:**
- ✅ Évite les conflits avant qu'ils ne se produisent
- ✅ Améliore la stabilité du code
- ✅ Réduit les régressions
- ✅ Améliore la qualité du code
- ✅ Accélère le développement

## 📋 Règles de Détection Proactive

### 1. Détection Automatique des Conflits de Code

**TOUJOURS:**
- ✅ Détecter automatiquement les conflits de code potentiels
- ✅ Identifier les modifications concurrentes
- ✅ Analyser les impacts des conflits
- ✅ Proposer résolutions automatiques

**Pattern:**
```typescript
// Détecter conflits de code automatiquement
async function detectCodeConflicts(
  modification: Modification,
  context: Context
): Promise<ConflictDetection> {
  // 1. Identifier fichiers affectés
  const affectedFiles = identifyAffectedFiles(modification, context);
  
  // 2. Vérifier modifications concurrentes
  const concurrentModifications = await checkConcurrentModifications(
    affectedFiles,
    context
  );
  
  // 3. Analyser conflits potentiels
  const conflicts: Conflict[] = [];
  
  for (const file of affectedFiles) {
    // 4. Vérifier si fichier modifié récemment
    const recentModifications = await checkRecentModifications(file, context);
    
    // 5. Analyser chevauchements
    const overlaps = analyzeOverlaps(modification, recentModifications);
    
    if (overlaps.length > 0) {
      // 6. Identifier conflits potentiels
      const potentialConflicts = identifyPotentialConflicts(overlaps);
      
      conflicts.push(...potentialConflicts);
    }
  }
  
  return {
    conflicts: conflicts,
    hasConflicts: conflicts.length > 0,
    severity: calculateConflictSeverity(conflicts)
  };
}
```

### 2. Détection Automatique des Conflits de Dépendances

**TOUJOURS:**
- ✅ Détecter automatiquement les conflits de dépendances
- ✅ Identifier les dépendances incompatibles
- ✅ Analyser les impacts des conflits
- ✅ Proposer résolutions automatiques

**Pattern:**
```typescript
// Détecter conflits de dépendances automatiquement
async function detectDependencyConflicts(
  modification: Modification,
  context: Context
): Promise<DependencyConflictDetection> {
  // 1. Identifier dépendances de la modification
  const dependencies = extractDependencies(modification);
  
  // 2. Vérifier compatibilité des dépendances
  const compatibility = await checkDependencyCompatibility(dependencies, context);
  
  // 3. Identifier conflits de dépendances
  const conflicts: DependencyConflict[] = [];
  
  for (const dep of dependencies) {
    // 4. Vérifier versions existantes
    const existingVersions = await checkExistingVersions(dep, context);
    
    // 5. Analyser incompatibilités
    const incompatibilities = analyzeIncompatibilities(
      dep,
      existingVersions,
      compatibility
    );
    
    if (incompatibilities.length > 0) {
      conflicts.push({
        dependency: dep,
        incompatibilities: incompatibilities,
        severity: calculateDependencyConflictSeverity(incompatibilities)
      });
    }
  }
  
  return {
    conflicts: conflicts,
    hasConflicts: conflicts.length > 0,
    severity: calculateConflictSeverity(conflicts)
  };
}
```

### 3. Résolution Automatique des Conflits

**TOUJOURS:**
- ✅ Résoudre automatiquement les conflits si possible
- ✅ Proposer résolutions pour conflits complexes
- ✅ Valider résolutions
- ✅ Documenter résolutions

**Pattern:**
```typescript
// Résoudre conflits automatiquement
async function resolveConflicts(
  conflictDetection: ConflictDetection,
  context: Context
): Promise<ConflictResolution> {
  const resolutions: ConflictResolution[] = [];
  
  // 1. Pour chaque conflit
  for (const conflict of conflictDetection.conflicts) {
    // 2. Analyser conflit
    const analysis = analyzeConflict(conflict, context);
    
    // 3. Si résolution automatique possible
    if (analysis.autoResolvable) {
      // 4. Résoudre automatiquement
      const resolution = await autoResolveConflict(conflict, analysis, context);
      
      // 5. Valider résolution
      const validation = await validateResolution(resolution, context);
      
      if (validation.valid) {
        resolutions.push({
          conflict: conflict,
          resolution: resolution,
          autoResolved: true,
          validation: validation
        });
      } else {
        // 6. Si résolution automatique échoue, proposer résolution manuelle
        resolutions.push({
          conflict: conflict,
          resolution: null,
          autoResolved: false,
          suggestedResolution: proposeManualResolution(conflict, analysis),
          validation: validation
        });
      }
    } else {
      // 7. Proposer résolution manuelle
      resolutions.push({
        conflict: conflict,
        resolution: null,
        autoResolved: false,
        suggestedResolution: proposeManualResolution(conflict, analysis),
        validation: null
      });
    }
  }
  
  return {
    resolutions: resolutions,
    allResolved: resolutions.every(r => r.autoResolved),
    requiresManualIntervention: resolutions.some(r => !r.autoResolved)
  };
}
```

## 🔄 Workflow de Détection Proactive

### Workflow: Détecter et Résoudre Conflits

**Étapes:**
1. Détecter conflits de code
2. Détecter conflits de dépendances
3. Analyser conflits
4. Résoudre automatiquement si possible
5. Proposer résolutions pour conflits complexes
6. Valider résolutions
7. Documenter résolutions

**Pattern:**
```typescript
async function detectAndResolveConflicts(
  modification: Modification,
  context: Context
): Promise<ConflictHandlingResult> {
  // 1. Détecter conflits de code
  const codeConflicts = await detectCodeConflicts(modification, context);
  
  // 2. Détecter conflits de dépendances
  const dependencyConflicts = await detectDependencyConflicts(modification, context);
  
  // 3. Combiner conflits
  const allConflicts = {
    code: codeConflicts,
    dependencies: dependencyConflicts,
    hasConflicts: codeConflicts.hasConflicts || dependencyConflicts.hasConflicts
  };
  
  // 4. Si conflits détectés
  if (allConflicts.hasConflicts) {
    // 5. Résoudre conflits
    const resolution = await resolveConflicts(allConflicts, context);
    
    // 6. Si résolution automatique réussie
    if (resolution.allResolved) {
      // 7. Appliquer résolutions
      const applied = await applyResolutions(resolution.resolutions, context);
      
      return {
        conflictsDetected: true,
        resolution: resolution,
        applied: applied,
        requiresManualIntervention: false
      };
    } else {
      // 8. Si résolution manuelle nécessaire
      return {
        conflictsDetected: true,
        resolution: resolution,
        applied: null,
        requiresManualIntervention: true
      };
    }
  }
  
  // 9. Si aucun conflit, procéder
  return {
    conflictsDetected: false,
    resolution: null,
    applied: null,
    requiresManualIntervention: false
  };
}
```

## ⚠️ Règles de Détection Proactive

### Ne Jamais:

**BLOQUANT:**
- ❌ Modifier sans détecter conflits potentiels
- ❌ Ignorer conflits détectés
- ❌ Ne pas résoudre conflits automatiquement si possible
- ❌ Ne pas documenter conflits

**TOUJOURS:**
- ✅ Détecter conflits avant modification
- ✅ Résoudre automatiquement si possible
- ✅ Proposer résolutions pour conflits complexes
- ✅ Documenter conflits et résolutions

## 📊 Checklist Détection Proactive

### Avant Modification

- [ ] Détecter conflits de code potentiels
- [ ] Détecter conflits de dépendances potentiels
- [ ] Analyser conflits
- [ ] Résoudre automatiquement si possible

### Pendant Modification

- [ ] Surveiller conflits
- [ ] Résoudre conflits détectés
- [ ] Valider résolutions

### Après Modification

- [ ] Vérifier que conflits résolus
- [ ] Documenter conflits et résolutions
- [ ] Prévenir conflits futurs

## 🔗 Références

- `@.cursor/rules/preventive-validation.md` - Validation préventive
- `@.cursor/rules/dependency-intelligence.md` - Intelligence des dépendances
- `@.cursor/rules/core.md` - Règles fondamentales

---

**Note:** Cette règle garantit que l'agent détecte automatiquement les conflits potentiels avant modification pour éviter les problèmes.

