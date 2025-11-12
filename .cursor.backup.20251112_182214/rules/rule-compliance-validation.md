# Validation de Conformité des Règles - Saxium

**Référence:** [Cursor Rules Documentation](https://docs.cursor.com/context/rules)  
**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

Système de validation automatique de conformité des règles pour garantir que les règles critiques sont appliquées avant tout arrêt.

## 🎯 Principe Fondamental

**IMPÉRATIF:** L'agent DOIT valider automatiquement la conformité aux règles critiques avant tout arrêt pour garantir la qualité et éviter les interruptions prématurées.

**Objectif:** Vérifier que toutes les règles critiques sont appliquées et que toutes les validations requises sont réussies avant de permettre un arrêt.

**Bénéfices:**
- ✅ Garantit application des règles critiques
- ✅ Détecte non-conformité avant arrêt
- ✅ Évite interruptions prématurées
- ✅ Améliore qualité globale

## 📋 Système de Validation de Conformité

### 1. Checklist de Conformité Avant Arrêt

**IMPÉRATIF:** Vérifier automatiquement la conformité avant tout arrêt.

**TOUJOURS:**
- ✅ Vérifier que toutes les règles critiques sont appliquées
- ✅ Vérifier que toutes les validations requises sont réussies
- ✅ Vérifier qu'aucune règle critique n'est ignorée
- ✅ Détecter non-conformité avec alertes
- ✅ Bloquer arrêt si non-conformité détectée

**Pattern:**
```typescript
// Validation de conformité avant arrêt
interface ComplianceCheck {
  rule: string;
  required: boolean;
  applied: boolean;
  validated: boolean;
  issues: string[];
}

async function validateRuleCompliance(
  task: Task,
  context: Context
): Promise<ComplianceValidationResult> {
  const checks: ComplianceCheck[] = [];
  
  // 1. Vérifier règles P0 (toujours requises)
  const p0Rules = ['core.md', 'quality-principles.md', 'code-quality.md'];
  for (const rule of p0Rules) {
    const applied = await checkRuleApplied(rule, context);
    const validated = await validateRuleApplication(rule, context);
    
    checks.push({
      rule,
      required: true,
      applied,
      validated,
      issues: applied && validated ? [] : [`Règle ${rule} non appliquée ou non validée`]
    });
  }
  
  // 2. Vérifier règles P1 critiques selon contexte
  const criticalP1Rules = await identifyCriticalP1Rules(task, context);
  for (const rule of criticalP1Rules) {
    const applied = await checkRuleApplied(rule, context);
    const validated = await validateRuleApplication(rule, context);
    
    checks.push({
      rule,
      required: true,
      applied,
      validated,
      issues: applied && validated ? [] : [`Règle ${rule} non appliquée ou non validée`]
    });
  }
  
  // 3. Vérifier validations requises
  const requiredValidations = await identifyRequiredValidations(task, context);
  for (const validation of requiredValidations) {
    const passed = await checkValidationPassed(validation, context);
    
    checks.push({
      rule: validation.name,
      required: true,
      applied: passed,
      validated: passed,
      issues: passed ? [] : [`Validation ${validation.name} échouée`]
    });
  }
  
  // 4. Analyser résultats
  const failedChecks = checks.filter(c => !c.applied || !c.validated);
  const allPassed = failedChecks.length === 0;
  
  return {
    compliant: allPassed,
    checks,
    failedChecks,
    issues: failedChecks.flatMap(c => c.issues),
    recommendation: allPassed ? 'proceed-with-stop' : 'fix-compliance-issues'
  };
}
```

### 2. Détection de Non-Conformité

**IMPÉRATIF:** Détecter automatiquement la non-conformité et générer des alertes.

**TOUJOURS:**
- ✅ Détecter règles critiques non appliquées
- ✅ Détecter validations requises échouées
- ✅ Générer alertes pour chaque non-conformité
- ✅ Bloquer arrêt si non-conformité critique
- ✅ Documenter toutes les non-conformités

**Pattern:**
```typescript
// Détection de non-conformité
async function detectNonCompliance(
  checks: ComplianceCheck[],
  context: Context
): Promise<NonComplianceResult> {
  const nonCompliances: NonCompliance[] = [];
  
  for (const check of checks) {
    if (!check.applied || !check.validated) {
      // 1. Identifier type de non-conformité
      const type = !check.applied ? 'rule-not-applied' : 'validation-failed';
      
      // 2. Évaluer criticité
      const severity = check.required ? 'critical' : 'warning';
      
      // 3. Générer alerte
      const alert = await generateComplianceAlert(check, type, severity, context);
      
      nonCompliances.push({
        rule: check.rule,
        type,
        severity,
        alert,
        issues: check.issues,
        canAutoFix: await canAutoFixNonCompliance(check, context)
      });
    }
  }
  
  // 4. Bloquer arrêt si non-conformité critique
  const criticalNonCompliances = nonCompliances.filter(nc => nc.severity === 'critical');
  const shouldBlock = criticalNonCompliances.length > 0;
  
  return {
    detected: nonCompliances.length > 0,
    nonCompliances,
    criticalCount: criticalNonCompliances.length,
    shouldBlock,
    recommendation: shouldBlock ? 'block-stop' : 'warn-and-continue'
  };
}
```

### 3. Correction Automatique de Non-Conformité

**IMPÉRATIF:** Corriger automatiquement les non-conformités si possible.

**TOUJOURS:**
- ✅ Tenter correction automatique des non-conformités
- ✅ Valider corrections appliquées
- ✅ Documenter corrections réussies
- ✅ Documenter non-conformités non auto-corrigeables
- ✅ Réitérer validation après correction

**Pattern:**
```typescript
// Correction automatique de non-conformité
async function autoFixNonCompliance(
  nonCompliances: NonCompliance[],
  context: Context
): Promise<AutoFixResult> {
  const fixed: NonCompliance[] = [];
  const unfixable: NonCompliance[] = [];
  
  for (const nonCompliance of nonCompliances) {
    if (nonCompliance.canAutoFix) {
      // 1. Tenter correction automatique
      const fixResult = await attemptAutoFix(nonCompliance, context);
      
      if (fixResult.success) {
        // 2. Valider correction
        const validation = await validateFix(fixResult, context);
        
        if (validation.valid) {
          fixed.push(nonCompliance);
        } else {
          unfixable.push(nonCompliance);
        }
      } else {
        unfixable.push(nonCompliance);
      }
    } else {
      unfixable.push(nonCompliance);
    }
  }
  
  return {
    fixed: fixed.length,
    unfixable: unfixable.length,
    fixedNonCompliances: fixed,
    unfixableNonCompliances: unfixable,
    allFixed: unfixable.length === 0
  };
}
```

## 🔄 Workflow de Validation de Conformité

### Workflow: Valider Conformité Avant Arrêt

**Étapes:**
1. Identifier règles critiques selon contexte
2. Vérifier application de toutes les règles critiques
3. Vérifier validation de toutes les validations requises
4. Détecter non-conformités
5. Tenter correction automatique si possible
6. Bloquer arrêt si non-conformité critique non résolue
7. Documenter conformité ou non-conformité

**Pattern:**
```typescript
// Workflow complet de validation de conformité
async function validateComplianceBeforeStop(
  task: Task,
  context: Context
): Promise<ComplianceWorkflowResult> {
  // 1. Valider conformité
  const compliance = await validateRuleCompliance(task, context);
  
  // 2. Si conforme, permettre arrêt
  if (compliance.compliant) {
    return {
      allowed: true,
      compliant: true,
      checks: compliance.checks
    };
  }
  
  // 3. Détecter non-conformités
  const nonCompliance = await detectNonCompliance(compliance.checks, context);
  
  // 4. Tenter correction automatique
  if (nonCompliance.detected) {
    const autoFix = await autoFixNonCompliance(nonCompliance.nonCompliances, context);
    
    // 5. Re-valider après correction
    if (autoFix.allFixed) {
      const reValidation = await validateRuleCompliance(task, context);
      
      if (reValidation.compliant) {
        return {
          allowed: true,
          compliant: true,
          checks: reValidation.checks,
          autoFixed: true
        };
      }
    }
  }
  
  // 6. Bloquer arrêt si non-conformité critique
  if (nonCompliance.shouldBlock) {
    return {
      allowed: false,
      compliant: false,
      checks: compliance.checks,
      nonCompliances: nonCompliance.nonCompliances,
      reason: 'critical-non-compliance-detected'
    };
  }
  
  // 7. Avertir mais permettre arrêt si non-critique
  return {
    allowed: true,
    compliant: false,
    checks: compliance.checks,
    nonCompliances: nonCompliance.nonCompliances,
    warning: true
  };
}
```

## ⚠️ Règles de Validation de Conformité

### TOUJOURS:
- ✅ Valider conformité avant tout arrêt
- ✅ Vérifier application de toutes les règles critiques
- ✅ Vérifier validation de toutes les validations requises
- ✅ Détecter non-conformités automatiquement
- ✅ Tenter correction automatique si possible
- ✅ Bloquer arrêt si non-conformité critique

### NE JAMAIS:
- ❌ S'arrêter sans validation de conformité
- ❌ Ignorer règles critiques non appliquées
- ❌ Ignorer validations requises échouées
- ❌ S'arrêter si non-conformité critique détectée
- ❌ Ignorer alertes de non-conformité

## 📊 Checklist de Conformité par Type de Tâche

### Tâche Simple

**Règles critiques à vérifier:**
- [ ] `core.md` appliqué et validé
- [ ] `quality-principles.md` appliqué et validé
- [ ] `code-quality.md` appliqué et validé
- [ ] Règle domaine (backend/frontend/etc.) appliquée et validée
- [ ] Validation TypeScript réussie
- [ ] Tests passent (si tests modifiés)

### Tâche Complexe

**Règles critiques à vérifier:**
- [ ] Toutes les règles de tâche simple
- [ ] `senior-architect-oversight.md` appliqué et validé
- [ ] `client-consultant-oversight.md` appliqué et validé
- [ ] Bundle "Autonomie" appliqué et validé
- [ ] Bundle "Qualité" appliqué et validé
- [ ] Validation complète réussie
- [ ] Validation multi-rôles réussie
- [ ] Tous les todos complétés

### Run Autonome

**Règles critiques à vérifier:**
- [ ] Toutes les règles de tâche complexe
- [ ] Bundle "Intelligence" appliqué et validé
- [ ] Exécution persistante validée
- [ ] Aucune mention de "prochaines étapes" sans exécution
- [ ] Validation exhaustive avant arrêt réussie

## 🔗 Références

- `@.cursor/rules/core.md` - Règles fondamentales
- `@.cursor/rules/persistent-execution.md` - Exécution persistante
- `@.cursor/rules/todo-completion.md` - Completion des todos
- `@.cursor/rules/compliance-checklists.md` - Checklists de conformité par type de tâche

