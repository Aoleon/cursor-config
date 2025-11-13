# Priorisation Dynamique des Règles - Saxium

**Référence:** [Cursor Rules Documentation](https://docs.cursor.com/context/rules)  
**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

Système de priorisation dynamique des règles P1 pour optimiser le chargement et éviter la saturation du contexte tout en préservant la qualité.

## 🎯 Principe Fondamental

**IMPÉRATIF:** Les règles P1 DOIVENT être priorisées dynamiquement selon le contexte réel de la tâche pour limiter le chargement à 7-8 fichiers maximum pour les tâches complexes.

**Objectif:** Charger uniquement les règles les plus critiques et pertinentes pour la tâche en cours, en utilisant un système de scoring intelligent.

## 📊 Système de Scoring

### Facteurs de Score

Chaque règle P1 reçoit un score basé sur :

1. **Criticité (0-100)** : Importance de la règle pour la tâche
   - Critique : 80-100
   - Importante : 50-79
   - Utile : 20-49
   - Optionnelle : 0-19

2. **Pertinence Contextuelle (0-100)** : Adéquation avec le contexte de la tâche
   - Parfaitement adapté : 80-100
   - Bien adapté : 50-79
   - Partiellement adapté : 20-49
   - Peu adapté : 0-19

3. **Historique de Succès (0-100)** : Efficacité passée de la règle
   - Très efficace : 80-100
   - Efficace : 50-79
   - Moyennement efficace : 20-49
   - Peu efficace : 0-19

4. **Dépendances (0-50)** : Nombre de règles qui dépendent de celle-ci
   - Nombreuses dépendances : 40-50
   - Quelques dépendances : 20-39
   - Peu de dépendances : 0-19

**Score Total = (Criticité × 0.4) + (Pertinence × 0.3) + (Historique × 0.2) + (Dépendances × 0.1)**

### Seuils de Priorisation

- **Score ≥ 70** : Priorité Haute (toujours charger si contexte adapté)
- **Score 50-69** : Priorité Moyenne (charger si espace disponible)
- **Score 30-49** : Priorité Basse (charger uniquement si nécessaire)
- **Score < 30** : Priorité Très Basse (ne pas charger sauf demande explicite)

## 🔄 Priorisation Dynamique par Type de Tâche

### Tâche Simple (4-5 fichiers max)

**P0 (3 fichiers) :**
- `core.md`
- `quality-principles.md`
- `code-quality.md`

**P1 (1-2 fichiers) :**
- Règle domaine (backend/frontend/database/ai-services/testing) : Score 90
- Règle spécifique si nécessaire : Score 60+

### Tâche Complexe (7-8 fichiers max)

**P0 (3 fichiers) :** Toujours chargé

**P1 (4-5 fichiers) :** Priorisation dynamique

**Règles Critiques (Score ≥ 80) - Toujours charger :**
1. Règle domaine (backend/frontend/etc.) : Score 90
2. `senior-architect-oversight.md` : Score 85
3. `client-consultant-oversight.md` : Score 85
4. `todo-completion.md` : Score 80

**Règles Importantes (Score 60-79) - Charger selon contexte :**
5. `iteration-unified.md` : Score 75 (si itération nécessaire)
6. `persistent-execution.md` : Score 70 (si run autonome)
7. `preventive-validation.md` : Score 70 (si modification code)
8. `similar-code-detection.md` : Score 65 (si création/modification)

**Règles Utiles (Score 40-59) - Charger si espace disponible :**
9. `hard-coding-specialist.md` : Score 55 (si tâche complexe)
10. `auto-performance-detection.md` : Score 50 (si optimisation)
11. `bug-prevention.md` : Score 45 (si qualité critique)

**Règles Optionnelles (Score < 40) - Ne pas charger :**
- Autres règles P1 non listées ci-dessus

### Run Autonome (8-9 fichiers max)

**P0 (3 fichiers) :** Toujours chargé

**P1 (5-6 fichiers) :** Priorisation dynamique

**Règles Critiques (Score ≥ 80) - Toujours charger :**
1. Règle domaine : Score 90
2. `senior-architect-oversight.md` : Score 90
3. `client-consultant-oversight.md` : Score 85
4. `todo-completion.md` : Score 85
5. `persistent-execution.md` : Score 80
6. `iteration-unified.md` : Score 80

**Règles Importantes (Score 60-79) - Charger selon contexte :**
7. `learning-memory.md` : Score 70 (si tâche récurrente)
8. `preventive-validation.md` : Score 65 (si modification)
9. `similar-code-detection.md` : Score 60 (si création/modification)

## 📋 Pattern de Priorisation

```typescript
// Système de priorisation dynamique
interface RuleScore {
  rule: string;
  criticity: number;      // 0-100
  relevance: number;      // 0-100
  history: number;         // 0-100
  dependencies: number;    // 0-50
  totalScore: number;      // Calculé
}

class DynamicRulePrioritizer {
  async prioritizeRules(
    task: Task,
    context: Context,
    availableSlots: number
  ): Promise<string[]> {
    // 1. Calculer scores pour toutes les règles P1 pertinentes
    const ruleScores = await this.calculateRuleScores(task, context);
    
    // 2. Trier par score décroissant
    const sortedRules = ruleScores.sort((a, b) => b.totalScore - a.totalScore);
    
    // 3. Sélectionner règles selon slots disponibles
    const selectedRules: string[] = [];
    
    // Toujours charger règles critiques (score ≥ 80)
    const criticalRules = sortedRules.filter(r => r.totalScore >= 80);
    selectedRules.push(...criticalRules.map(r => r.rule));
    
    // Remplir slots restants avec règles importantes
    const remainingSlots = availableSlots - selectedRules.length;
    if (remainingSlots > 0) {
      const importantRules = sortedRules
        .filter(r => r.totalScore >= 60 && r.totalScore < 80)
        .slice(0, remainingSlots);
      selectedRules.push(...importantRules.map(r => r.rule));
    }
    
    // 4. Vérifier limite maximale
    if (selectedRules.length > availableSlots) {
      return selectedRules.slice(0, availableSlots);
    }
    
    return selectedRules;
  }
  
  async calculateRuleScores(
    task: Task,
    context: Context
  ): Promise<RuleScore[]> {
    const scores: RuleScore[] = [];
    
    // Pour chaque règle P1 pertinente
    for (const rule of this.getRelevantP1Rules(task, context)) {
      const criticity = await this.calculateCriticity(rule, task, context);
      const relevance = await this.calculateRelevance(rule, task, context);
      const history = await this.getHistoryScore(rule, context);
      const dependencies = await this.getDependencyScore(rule, context);
      
      const totalScore = 
        (criticity * 0.4) + 
        (relevance * 0.3) + 
        (history * 0.2) + 
        (dependencies * 0.1);
      
      scores.push({
        rule,
        criticity,
        relevance,
        history,
        dependencies,
        totalScore
      });
    }
    
    return scores;
  }
  
  async calculateCriticity(
    rule: string,
    task: Task,
    context: Context
  ): Promise<number> {
    // Règles critiques selon type de tâche
    const criticalRules = {
      'simple': ['domain-rule'],
      'complex': ['domain-rule', 'senior-architect-oversight', 'client-consultant-oversight', 'todo-completion'],
      'autonomous': ['domain-rule', 'senior-architect-oversight', 'client-consultant-oversight', 'todo-completion', 'persistent-execution', 'iteration-unified']
    };
    
    const taskType = this.detectTaskType(task, context);
    if (criticalRules[taskType]?.includes(rule)) {
      return 85;
    }
    
    // Règles importantes
    const importantRules = {
      'complex': ['iteration-unified', 'persistent-execution', 'preventive-validation'],
      'autonomous': ['learning-memory', 'preventive-validation', 'similar-code-detection']
    };
    
    if (importantRules[taskType]?.includes(rule)) {
      return 70;
    }
    
    // Règles utiles
    return 50;
  }
  
  async calculateRelevance(
    rule: string,
    task: Task,
    context: Context
  ): Promise<number> {
    // Analyser pertinence selon contexte
    const contextMatch = await this.analyzeContextMatch(rule, task, context);
    
    if (contextMatch === 'perfect') return 90;
    if (contextMatch === 'good') return 70;
    if (contextMatch === 'partial') return 50;
    return 30;
  }
  
  async getHistoryScore(
    rule: string,
    context: Context
  ): Promise<number> {
    // Récupérer historique de succès depuis métriques
    const metrics = await context.getRuleMetrics(rule);
    
    if (!metrics || metrics.totalUses === 0) {
      return 50; // Score neutre si pas d'historique
    }
    
    const successRate = metrics.successCount / metrics.totalUses;
    
    if (successRate >= 0.9) return 90;
    if (successRate >= 0.7) return 70;
    if (successRate >= 0.5) return 50;
    return 30;
  }
  
  async getDependencyScore(
    rule: string,
    context: Context
  ): Promise<number> {
    // Compter dépendances
    const dependencies = await context.getRuleDependencies(rule);
    
    if (dependencies.length >= 5) return 50;
    if (dependencies.length >= 3) return 35;
    if (dependencies.length >= 1) return 20;
    return 10;
  }
}
```

## ⚠️ Règles de Priorisation

### TOUJOURS:
- ✅ Prioriser règles critiques (score ≥ 80) en premier
- ✅ Respecter limite maximale de fichiers (7-8 pour tâches complexes)
- ✅ Utiliser historique de succès pour ajuster priorités
- ✅ Considérer dépendances entre règles
- ✅ Adapter priorités selon contexte réel de la tâche

### NE JAMAIS:
- ❌ Charger plus de 8 fichiers P1 pour une tâche complexe
- ❌ Ignorer règles critiques même si score bas
- ❌ Charger règles optionnelles si slots limités
- ❌ Ignorer historique de succès dans calcul

## 📊 Matrice de Priorisation par Type de Tâche

| Type de Tâche | P0 | P1 Critiques | P1 Importantes | P1 Utiles | Total Max |
|---------------|----|--------------|----------------|-----------|-----------|
| Simple | 3 | 1-2 | 0 | 0 | 5 |
| Complexe | 3 | 3-4 | 1-2 | 0 | 7-8 |
| Autonome | 3 | 4-5 | 2-3 | 0 | 8-9 |

## 🔗 Références

- `@.cursor/rules/priority.md` - Priorités statiques des règles
- `@.cursor/rules/load-strategy.md` - Stratégie de chargement optimisée
- `@.cursor/rules/context-detection.md` - Détection automatique du contexte
- `@.cursor/rules/rule-metrics.md` - Métriques des règles (historique)


