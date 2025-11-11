# Checklists de Conformité - Saxium

**Référence:** [Cursor Rules Documentation](https://docs.cursor.com/context/rules)  
**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

Checklists de conformité par type de tâche pour garantir l'application des règles critiques avant tout arrêt.

## 🎯 Principe Fondamental

**IMPÉRATIF:** L'agent DOIT utiliser la checklist de conformité appropriée selon le type de tâche avant tout arrêt.

**Objectif:** Vérifier systématiquement que toutes les règles critiques sont appliquées et toutes les validations requises sont réussies.

## 📋 Checklists par Type de Tâche

### Checklist Tâche Simple (4-5 fichiers)

**Règles P0 (Toujours):**
- [ ] `core.md` - Règles fondamentales appliquées et validées
- [ ] `quality-principles.md` - Principes de qualité appliqués et validés
- [ ] `code-quality.md` - Standards qualité code appliqués et validés

**Règles P1 (Selon domaine):**
- [ ] Règle domaine (backend/frontend/database/ai-services/testing) appliquée et validée

**Validations Requises:**
- [ ] Validation TypeScript réussie (aucune erreur)
- [ ] Tests passent (si tests modifiés)
- [ ] Code conforme aux standards de qualité
- [ ] Aucun anti-pattern détecté

**Total:** 4-5 vérifications

### Checklist Tâche Complexe (7-8 fichiers)

**Règles P0 (Toujours):**
- [ ] `core.md` - Règles fondamentales appliquées et validées
- [ ] `quality-principles.md` - Principes de qualité appliqués et validés
- [ ] `code-quality.md` - Standards qualité code appliqués et validés

**Règles P1 Critiques:**
- [ ] Règle domaine (backend/frontend/database/ai-services/testing) appliquée et validée
- [ ] `senior-architect-oversight.md` - Supervision architecte appliquée et validée
- [ ] `client-consultant-oversight.md` - Validation business appliquée et validée
- [ ] Bundle "Autonomie" (todo-completion + persistent-execution + iteration-unified) appliqué et validé
- [ ] Bundle "Qualité" (preventive-validation + similar-code-detection + bug-prevention) appliqué et validé

**Validations Requises:**
- [ ] Validation TypeScript complète réussie
- [ ] Tous les tests passent (unitaires + E2E)
- [ ] Validation complète réussie
- [ ] Validation multi-rôles réussie
- [ ] Tous les todos complétés
- [ ] Aucune mention de "prochaines étapes" sans exécution
- [ ] Aucun anti-pattern détecté
- [ ] Aucune régression détectée

**Total:** 8-10 vérifications

### Checklist Run Autonome (8-9 fichiers)

**Règles P0 (Toujours):**
- [ ] `core.md` - Règles fondamentales appliquées et validées
- [ ] `quality-principles.md` - Principes de qualité appliqués et validés
- [ ] `code-quality.md` - Standards qualité code appliqués et validés

**Règles P1 Critiques:**
- [ ] Règle domaine (backend/frontend/database/ai-services/testing) appliquée et validée
- [ ] `senior-architect-oversight.md` - Supervision architecte appliquée et validée
- [ ] `client-consultant-oversight.md` - Validation business appliquée et validée
- [ ] Bundle "Autonomie" (todo-completion + persistent-execution + iteration-unified) appliqué et validé
- [ ] Bundle "Qualité" (preventive-validation + similar-code-detection + bug-prevention) appliqué et validé
- [ ] Bundle "Intelligence" (learning-memory + intelligent-model-selection + search-cache) appliqué et validé

**Validations Requises:**
- [ ] Validation TypeScript complète réussie
- [ ] Tous les tests passent (unitaires + E2E)
- [ ] Validation complète réussie
- [ ] Validation multi-rôles réussie
- [ ] Tous les todos complétés
- [ ] Exécution persistante validée
- [ ] Aucune mention de "prochaines étapes" sans exécution
- [ ] Vérification exhaustive avant arrêt réussie
- [ ] Aucun anti-pattern détecté
- [ ] Aucune régression détectée

**Total:** 10-12 vérifications

### Checklist Migration/Refactoring (8-9 fichiers)

**Règles P0 (Toujours):**
- [ ] `core.md` - Règles fondamentales appliquées et validées
- [ ] `quality-principles.md` - Principes de qualité appliqués et validés
- [ ] `code-quality.md` - Standards qualité code appliqués et validés

**Règles P1 Critiques:**
- [ ] Règle domaine appliquée et validée
- [ ] `senior-architect-oversight.md` - Supervision architecte appliquée et validée
- [ ] `client-consultant-oversight.md` - Validation business appliquée et validée
- [ ] `migration-refactoring-manager.md` - Supervision migration appliquée et validée
- [ ] Bundle "Qualité" appliqué et validé
- [ ] Bundle "Robustesse" (error-recovery + conflict-detection + dependency-intelligence) appliqué et validé

**Validations Requises:**
- [ ] Validation TypeScript complète réussie
- [ ] Tous les tests passent (unitaires + E2E)
- [ ] Aucune régression détectée
- [ ] Cohérence modules migrés validée
- [ ] Dépendances validées
- [ ] Aucun conflit détecté

**Total:** 9-11 vérifications

### Checklist Consolidation/Dette Technique (8-9 fichiers)

**Règles P0 (Toujours):**
- [ ] `core.md` - Règles fondamentales appliquées et validées
- [ ] `quality-principles.md` - Principes de qualité appliqués et validés
- [ ] `code-quality.md` - Standards qualité code appliqués et validés

**Règles P1 Critiques:**
- [ ] Règle domaine appliquée et validée
- [ ] `senior-architect-oversight.md` - Supervision architecte appliquée et validée
- [ ] `client-consultant-oversight.md` - Validation business appliquée et validée
- [ ] `tech-debt-manager.md` - Gestion dette technique appliquée et validée
- [ ] Bundle "Qualité" appliqué et validé

**Validations Requises:**
- [ ] Validation TypeScript complète réussie
- [ ] Tous les tests passent (unitaires + E2E)
- [ ] Services dupliqués identifiés et consolidés
- [ ] Fichiers monolithiques réduits
- [ ] Aucune régression détectée

**Total:** 8-10 vérifications

## 🔄 Workflow de Validation de Conformité

### Workflow: Utiliser Checklist Avant Arrêt

**Étapes:**
1. Identifier type de tâche
2. Charger checklist appropriée
3. Vérifier chaque item de la checklist
4. Détecter non-conformités
5. Tenter correction automatique si possible
6. Bloquer arrêt si non-conformité critique
7. Documenter conformité ou non-conformité

**Pattern:**
```typescript
// Utiliser checklist avant arrêt
async function useComplianceChecklistBeforeStop(
  task: Task,
  context: Context
): Promise<ChecklistResult> {
  // 1. Identifier type de tâche
  const taskType = await identifyTaskType(task, context);
  
  // 2. Charger checklist appropriée
  const checklist = await loadComplianceChecklist(taskType, context);
  
  // 3. Vérifier chaque item
  const results: ChecklistItemResult[] = [];
  for (const item of checklist.items) {
    const result = await checkComplianceItem(item, task, context);
    results.push(result);
  }
  
  // 4. Analyser résultats
  const failedItems = results.filter(r => !r.passed);
  const allPassed = failedItems.length === 0;
  
  // 5. Si non-conformité, tenter correction
  if (!allPassed) {
    const autoFix = await attemptAutoFixCompliance(failedItems, context);
    
    if (autoFix.allFixed) {
      // Re-vérifier après correction
      return await useComplianceChecklistBeforeStop(task, context);
    }
  }
  
  return {
    compliant: allPassed,
    checklist,
    results,
    failedItems,
    allowed: allPassed || !hasCriticalFailures(failedItems)
  };
}
```

## ⚠️ Règles d'Utilisation des Checklists

### TOUJOURS:
- ✅ Utiliser checklist appropriée selon type de tâche
- ✅ Vérifier chaque item de la checklist
- ✅ Documenter résultats de vérification
- ✅ Bloquer arrêt si items critiques échouent
- ✅ Tenter correction automatique si possible

### NE JAMAIS:
- ❌ S'arrêter sans utiliser checklist
- ❌ Ignorer items de la checklist
- ❌ S'arrêter si items critiques échouent
- ❌ Ignorer non-conformités détectées

## 🔗 Références

- `@.cursor/rules/rule-compliance-validation.md` - Système de validation de conformité
- `@.cursor/rules/core.md` - Règles fondamentales
- `@.cursor/rules/persistent-execution.md` - Exécution persistante
- `@.cursor/rules/todo-completion.md` - Completion des todos

