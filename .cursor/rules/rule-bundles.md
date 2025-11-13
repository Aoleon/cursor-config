# Bundles de Règles - Saxium

**Référence:** [Cursor Rules Documentation](https://docs.cursor.com/context/rules)  
**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

Système de bundles de règles pour optimiser le chargement en groupant des règles similaires et réduire la saturation du contexte.

## 🎯 Principe Fondamental

**IMPÉRATIF:** Les règles P1 similaires DOIVENT être groupées en bundles pour réduire le nombre de fichiers chargés tout en préservant toutes les fonctionnalités.

**Objectif:** Charger 1 bundle = 3 règles mais compté comme 1 fichier conceptuel pour optimiser le contexte.

**Bénéfices:**
- ✅ Réduction du nombre de fichiers chargés (3 règles → 1 bundle)
- ✅ Préservation de toutes les fonctionnalités
- ✅ Chargement plus rapide et efficace
- ✅ Meilleure organisation logique des règles

## 📦 Bundles Disponibles

### Bundle "Autonomie"

**Règles incluses:**
- `todo-completion.md` - Completion des todos
- `persistent-execution.md` - Exécution persistante
- `iteration-unified.md` - Itération unifiée avec coordination des rôles

**Cas d'usage:**
- Tâche complexe (> 3 todos)
- Run autonome
- Tâche nécessitant itération

**Score de priorité:** 85 (Critique)

**Quand charger:**
- Automatiquement pour tâches complexes
- Automatiquement pour runs autonomes
- Si itération nécessaire

### Bundle "Qualité"

**Règles incluses:**
- `preventive-validation.md` - Validation préventive
- `similar-code-detection.md` - Détection proactive de code similaire
- `bug-prevention.md` - Détection proactive des bugs

**Cas d'usage:**
- Création ou modification de code
- Tâche nécessitant validation stricte
- Tâche nécessitant qualité maximale

**Score de priorité:** 70 (Important)

**Quand charger:**
- Automatiquement pour création/modification de code
- Si validation stricte nécessaire
- Si qualité maximale requise

### Bundle "Performance"

**Règles incluses:**
- `auto-performance-detection.md` - Détection automatique des problèmes de performance
- `parallel-execution.md` - Exécution parallèle
- `batch-processing.md` - Traitement par lots

**Cas d'usage:**
- Tâche avec problèmes de performance potentiels
- Tâche avec opérations indépendantes
- Tâche avec tâches similaires multiples

**Score de priorité:** 60 (Utile)

**Quand charger:**
- Si problèmes de performance détectés
- Si opérations indépendantes identifiées
- Si tâches similaires multiples

### Bundle "Intelligence"

**Règles incluses:**
- `learning-memory.md` - Mémoire persistante des apprentissages
- `intelligent-model-selection.md` - Sélection intelligente du modèle IA
- `search-cache.md` - Cache intelligent des recherches

**Cas d'usage:**
- Tâche récurrente ou similaire
- Tâche nécessitant IA
- Tâche avec recherches répétitives

**Score de priorité:** 55 (Utile)

**Quand charger:**
- Si tâche récurrente
- Si tâche nécessitant IA
- Si recherches répétitives détectées

### Bundle "Robustesse"

**Règles incluses:**
- `error-recovery.md` - Récupération automatique après erreurs
- `conflict-detection.md` - Détection proactive des conflits
- `dependency-intelligence.md` - Intelligence des dépendances

**Cas d'usage:**
- Tâche avec erreurs détectées
- Tâche avec conflits potentiels
- Tâche avec dépendances complexes

**Score de priorité:** 50 (Utile)

**Quand charger:**
- Si erreur détectée
- Si conflit potentiel identifié
- Si dépendances complexes

## 📋 Pattern de Chargement des Bundles

```typescript
// Système de bundles de règles
interface RuleBundle {
  name: string;
  rules: string[];
  priority: number;
  useCases: string[];
  autoLoad: boolean;
}

class RuleBundleManager {
  private bundles: Map<string, RuleBundle> = new Map();
  
  constructor() {
    // Initialiser bundles
    this.bundles.set('autonomy', {
      name: 'Autonomie',
      rules: [
        'todo-completion.md',
        'persistent-execution.md',
        'iteration-unified.md'
      ],
      priority: 85,
      useCases: ['complex-task', 'autonomous-run', 'iteration-needed'],
      autoLoad: true
    });
    
    this.bundles.set('quality', {
      name: 'Qualité',
      rules: [
        'preventive-validation.md',
        'similar-code-detection.md',
        'bug-prevention.md'
      ],
      priority: 70,
      useCases: ['code-creation', 'code-modification', 'strict-validation'],
      autoLoad: true
    });
    
    this.bundles.set('performance', {
      name: 'Performance',
      rules: [
        'auto-performance-detection.md',
        'parallel-execution.md',
        'batch-processing.md'
      ],
      priority: 60,
      useCases: ['performance-issues', 'independent-operations', 'similar-tasks'],
      autoLoad: false
    });
    
    this.bundles.set('intelligence', {
      name: 'Intelligence',
      rules: [
        'learning-memory.md',
        'intelligent-model-selection.md',
        'search-cache.md'
      ],
      priority: 55,
      useCases: ['recurring-task', 'ai-needed', 'repetitive-searches'],
      autoLoad: false
    });
    
    this.bundles.set('robustness', {
      name: 'Robustesse',
      rules: [
        'error-recovery.md',
        'conflict-detection.md',
        'dependency-intelligence.md'
      ],
      priority: 50,
      useCases: ['error-detected', 'conflict-potential', 'complex-dependencies'],
      autoLoad: false
    });
  }
  
  async loadBundlesForTask(
    task: Task,
    context: Context,
    availableSlots: number
  ): Promise<string[]> {
    const loadedRules: string[] = [];
    const loadedBundles: string[] = [];
    
    // 1. Identifier bundles nécessaires
    const neededBundles = await this.identifyNeededBundles(task, context);
    
    // 2. Trier bundles par priorité
    const sortedBundles = neededBundles.sort((a, b) => 
      this.bundles.get(b)!.priority - this.bundles.get(a)!.priority
    );
    
    // 3. Charger bundles selon slots disponibles
    for (const bundleId of sortedBundles) {
      const bundle = this.bundles.get(bundleId)!;
      
      // Vérifier si on peut charger le bundle (1 slot pour 3 règles)
      if (loadedBundles.length < availableSlots) {
        loadedBundles.push(bundleId);
        loadedRules.push(...bundle.rules);
      }
    }
    
    return loadedRules;
  }
  
  async identifyNeededBundles(
    task: Task,
    context: Context
  ): Promise<string[]> {
    const neededBundles: string[] = [];
    
    // Analyser tâche pour identifier bundles nécessaires
    if (task.complexity === 'complex' || task.type === 'autonomous') {
      neededBundles.push('autonomy');
    }
    
    if (task.type === 'code-creation' || task.type === 'code-modification') {
      neededBundles.push('quality');
    }
    
    if (context.hasPerformanceIssues) {
      neededBundles.push('performance');
    }
    
    if (task.isRecurring || context.needsAI) {
      neededBundles.push('intelligence');
    }
    
    if (context.hasErrors || context.hasConflicts || context.hasComplexDependencies) {
      neededBundles.push('robustness');
    }
    
    return neededBundles;
  }
  
  getBundleRules(bundleId: string): string[] {
    const bundle = this.bundles.get(bundleId);
    return bundle ? bundle.rules : [];
  }
  
  getBundlePriority(bundleId: string): number {
    const bundle = this.bundles.get(bundleId);
    return bundle ? bundle.priority : 0;
  }
}
```

## 📊 Matrice de Chargement avec Bundles

| Type de Tâche | P0 | Bundles | Règles Individuelles | Total |
|---------------|----|---------|---------------------|-------|
| Simple | 3 | 0 | 1-2 (domaine) | 4-5 |
| Complexe | 3 | 1 (Autonomie) | 1-2 (domaine) + 2-3 (rôles) | 7-8 |
| Autonome | 3 | 1 (Autonomie) | 1-2 (domaine) + 2-3 (rôles) + 1 (Intelligence) | 8-9 |
| Création Code | 3 | 1 (Qualité) | 1 (domaine) | 5 |
| Performance | 3 | 1 (Performance) | 1 (domaine) | 5 |

**Note:** 1 bundle = 3 règles mais compté comme 1 fichier conceptuel

## ⚠️ Règles de Chargement des Bundles

### TOUJOURS:
- ✅ Charger bundles critiques (Autonomie) pour tâches complexes
- ✅ Charger bundles selon contexte réel de la tâche
- ✅ Prioriser bundles selon score de priorité
- ✅ Respecter limite maximale de fichiers (7-8 pour tâches complexes)
- ✅ Charger toutes les règles d'un bundle si bundle chargé

### NE JAMAIS:
- ❌ Charger bundle si toutes ses règles ne sont pas nécessaires
- ❌ Charger plus de bundles que slots disponibles
- ❌ Ignorer bundles critiques même si slots limités
- ❌ Charger bundles optionnels si slots limités

## 🔄 Détection Automatique des Bundles

### Détection par Type de Tâche

**Tâche Complexe:**
- Bundle "Autonomie" : Automatique (Score 85)

**Création/Modification Code:**
- Bundle "Qualité" : Automatique (Score 70)

**Problèmes de Performance:**
- Bundle "Performance" : Si détecté (Score 60)

**Tâche Récurrente:**
- Bundle "Intelligence" : Si détecté (Score 55)

**Erreurs/Conflits:**
- Bundle "Robustesse" : Si détecté (Score 50)

## 🔗 Références

- `@.cursor/rules/rule-prioritization.md` - Priorisation dynamique des règles
- `@.cursor/rules/load-strategy.md` - Stratégie de chargement optimisée
- `@.cursor/rules/context-detection.md` - Détection automatique du contexte


