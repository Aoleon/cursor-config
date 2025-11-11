# Standardisation des Métadonnées - Saxium

**Objectif:** Standardiser le format des métadonnées dans tous les fichiers de règles pour permettre une détection et un chargement automatiques optimaux.

**Référence:** [Cursor Rules Documentation](https://docs.cursor.com/context/rules)  
**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

## 🎯 Principe Fondamental

**IMPÉRATIF:** Tous les fichiers de règles DOIVENT inclure des métadonnées standardisées en en-tête pour permettre la détection et le chargement automatiques.

**Bénéfices:**
- ✅ Détection automatique optimale
- ✅ Chargement intelligent selon contexte
- ✅ Gestion des dépendances automatique
- ✅ Priorisation dynamique facilitée
- ✅ Maintenance simplifiée

**Référence:** `@.cursor/rules/context-detection.md` - Détection automatique du contexte

## 📋 Format Standard des Métadonnées

### Structure Complète

```markdown
<!-- 
Context: [context1, context2, context3]
Priority: P0|P1|P2
Auto-load: [condition1, condition2]
Dependencies: [rule1.md, rule2.md]
Exclusions: [rule3.md] (optionnel)
Score: [default-score] (optionnel)
Bundle: [bundle-id] (optionnel)
-->
```

### Champs Obligatoires

1. **Context** : Liste de contextes où la règle est pertinente
   - Exemples: `backend`, `frontend`, `complex-tasks`, `autonomous-run`
   - Format: Liste séparée par virgules

2. **Priority** : Priorité de la règle
   - Valeurs: `P0` (toujours), `P1` (selon contexte), `P2` (sur demande)

3. **Auto-load** : Conditions de chargement automatique
   - Format: Liste de conditions séparées par virgules
   - Exemples: `when editing server/**/*.ts`, `when task is complex (> 3 todos)`

4. **Dependencies** : Règles dont celle-ci dépend
   - Format: Liste de fichiers séparés par virgules
   - Exemples: `core.md, quality-principles.md`

### Champs Optionnels

5. **Exclusions** : Règles à ne pas charger en même temps
   - Format: Liste de fichiers séparés par virgules
   - Utilisé pour éviter conflits ou redondances

6. **Score** : Score de priorité par défaut (0-100)
   - Utilisé pour priorisation dynamique
   - Surchargé par calcul dynamique si disponible

7. **Bundle** : Bundle auquel la règle appartient
   - Format: ID du bundle
   - Exemples: `autonomy`, `quality`, `performance`

## 📝 Exemples de Métadonnées Standardisées

### Règle P0 (Core)

```markdown
<!-- 
Context: all, core, fundamental
Priority: P0
Auto-load: always
Dependencies: []
-->
```

### Règle P1 (Backend)

```markdown
<!-- 
Context: backend, server, routes, api, middleware
Priority: P1
Auto-load: when editing server/**/*.ts
Dependencies: core.md, quality-principles.md, code-quality.md
Score: 90
-->
```

### Règle P1 (Task Decomposition)

```markdown
<!-- 
Context: task-decomposition, complex-tasks, subtasks, sequential-thinking, background-agent, structured-task-lists, autonomy, planning
Priority: P1
Auto-load: when task is complex (> 3 todos, > 5 dependencies, > 200 lines estimated, > 5 files) or requires decomposition or autonomous run
Dependencies: core.md, quality-principles.md, code-quality.md, senior-architect-oversight.md, autonomous-workflows.md, parallel-execution.md
Score: 82
Bundle: autonomy
-->
```

### Règle P1 (Senior Architect)

```markdown
<!-- 
Context: supervision, prioritization, piloting, code-review, architecture, complex-tasks, autonomous-runs
Priority: P1
Auto-load: when task is complex (> 3 todos) or autonomous run
Dependencies: core.md, quality-principles.md, code-quality.md, iterative-perfection.md, todo-completion.md, bug-prevention.md, quality-checklist.md, client-consultant-oversight.md
Score: 85
-->
```

## 🔄 Validation des Métadonnées

### Vérification Automatique

**TOUJOURS:**
- ✅ Vérifier présence métadonnées dans chaque fichier
- ✅ Valider format des métadonnées
- ✅ Vérifier cohérence des dépendances
- ✅ Détecter dépendances circulaires

**Pattern:**
```typescript
// Validation des métadonnées
interface RuleMetadata {
  context: string[];
  priority: 'P0' | 'P1' | 'P2';
  autoLoad: string[];
  dependencies: string[];
  exclusions?: string[];
  score?: number;
  bundle?: string;
}

async function validateRuleMetadata(
  ruleFile: string
): Promise<ValidationResult> {
  // 1. Extraire métadonnées
  const metadata = await extractMetadata(ruleFile);
  
  // 2. Valider champs obligatoires
  if (!metadata.context || !metadata.priority || !metadata.autoLoad || !metadata.dependencies) {
    return {
      valid: false,
      errors: ['Champs obligatoires manquants']
    };
  }
  
  // 3. Valider format
  if (!['P0', 'P1', 'P2'].includes(metadata.priority)) {
    return {
      valid: false,
      errors: ['Priorité invalide']
    };
  }
  
  // 4. Vérifier dépendances existent
  const missingDeps = await checkDependenciesExist(metadata.dependencies);
  if (missingDeps.length > 0) {
    return {
      valid: false,
      errors: [`Dépendances manquantes: ${missingDeps.join(', ')}`]
    };
  }
  
  // 5. Vérifier pas de dépendances circulaires
  const circular = await detectCircularDependencies(ruleFile, metadata.dependencies);
  if (circular.length > 0) {
    return {
      valid: false,
      errors: [`Dépendances circulaires détectées: ${circular.join(', ')}`]
    };
  }
  
  return {
    valid: true,
    metadata
  };
}
```

## 📊 Matrice de Métadonnées

### Règles P0

| Règle | Context | Priority | Auto-load | Dependencies |
|-------|---------|----------|-----------|--------------|
| core.md | all, core, fundamental | P0 | always | [] |
| quality-principles.md | all, quality | P0 | always | core.md |
| code-quality.md | all, quality, standards | P0 | always | core.md, quality-principles.md |

### Règles P1 - Domaines

| Règle | Context | Priority | Auto-load | Dependencies | Score |
|-------|---------|----------|-----------|--------------|-------|
| backend.md | backend, server, routes, api | P1 | when editing server/**/*.ts | core.md, quality-principles.md, code-quality.md | 90 |
| frontend.md | frontend, react, components | P1 | when editing client/src/**/*.tsx | core.md, quality-principles.md, code-quality.md | 90 |
| database.md | database, drizzle, schema | P1 | when editing shared/schema.ts or server/storage/** | core.md, quality-principles.md, code-quality.md | 85 |

### Règles P1 - Autonomie

| Règle | Context | Priority | Auto-load | Dependencies | Score | Bundle |
|-------|---------|----------|-----------|--------------|-------|--------|
| task-decomposition.md | task-decomposition, complex-tasks, subtasks | P1 | when task is complex (> 3 todos) or autonomous run | core.md, senior-architect-oversight.md, autonomous-workflows.md | 82 | autonomy |
| todo-completion.md | todos, completion, autonomy | P1 | when task has > 3 todos | core.md, quality-principles.md | 80 | autonomy |
| persistent-execution.md | execution, autonomy, long-runs | P1 | when autonomous run or complex task | core.md, todo-completion.md | 80 | autonomy |

## ⚠️ Règles de Métadonnées

### Ne Jamais:

**BLOQUANT:**
- ❌ Créer fichier de règle sans métadonnées
- ❌ Utiliser format non standardisé
- ❌ Ignorer dépendances
- ❌ Créer dépendances circulaires

**TOUJOURS:**
- ✅ Inclure métadonnées standardisées en en-tête
- ✅ Utiliser format standard
- ✅ Déclarer toutes les dépendances
- ✅ Valider métadonnées avant commit

## 🔗 Références

- `@.cursor/rules/context-detection.md` - Détection automatique du contexte
- `@.cursor/rules/load-strategy.md` - Stratégie de chargement optimisée
- `@.cursor/rules/rule-prioritization.md` - Priorisation dynamique des règles

---

**Note:** Cette standardisation permet une détection et un chargement automatiques optimaux des règles selon le contexte.

**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

