# Détection et Implémentation TODOs - Saxium

**Objectif:** Détecter les TODOs dans le code et suggérer automatiquement leur implémentation pour réduire la dette technique.

## 🎯 Principe Fondamental

**IMPÉRATIF:** L'agent DOIT détecter les TODOs et suggérer leur implémentation pour réduire la dette technique.

**Bénéfices:**
- ✅ Réduction dette technique
- ✅ Code complet et fonctionnel
- ✅ Amélioration qualité
- ✅ Fonctionnalités complètes

## 📊 Détection TODOs

### 1. Identification TODOs

**TOUJOURS:**
- ✅ Détecter `// TODO:`, `// FIXME:`, `// XXX:`
- ✅ Analyser contexte (méthode, classe, service)
- ✅ Identifier dépendances
- ✅ Proposer implémentation

**Pattern:**
```typescript
// Détecter TODOs
function detectTODOs(code: string): TODO[] {
  const todos: TODO[] = [];
  const lines = code.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Détecter TODO
    const todoMatch = line.match(/\/\/\s*(TODO|FIXME|XXX):\s*(.+)/i);
    if (todoMatch) {
      const context = extractContext(code, i);
      todos.push({
        line: i + 1,
        type: todoMatch[1].toUpperCase(),
        description: todoMatch[2],
        context,
        implementation: suggestImplementation(context, todoMatch[2])
      });
    }
  }
  
  return todos;
}
```

### 2. Analyse Contexte

**TOUJOURS:**
- ✅ Analyser méthode contenant TODO
- ✅ Analyser paramètres disponibles
- ✅ Analyser dépendances
- ✅ Identifier patterns similaires

**Pattern:**
```typescript
// Analyser contexte TODO
function analyzeTODOContext(code: string, lineNumber: number): TODOContext {
  const context = {
    method: extractMethod(code, lineNumber),
    class: extractClass(code, lineNumber),
    service: extractService(code, lineNumber),
    parameters: extractParameters(code, lineNumber),
    dependencies: extractDependencies(code, lineNumber),
    similarPatterns: findSimilarPatterns(code, lineNumber)
  };
  
  return context;
}
```

## 🔧 Suggestions Implémentation

### 1. TODOs Méthodes Stub

**Détection:**
```typescript
// Pattern à détecter
private async evaluateDeadlineThresholds(thresholds: AlertThreshold[]): Promise<string[]> {
  // TODO: Implémenter évaluation échéances
  return [];
}
```

**Suggestion:**
```typescript
// ✅ Implémentation suggérée
private async evaluateDeadlineThresholds(thresholds: AlertThreshold[]): Promise<string[]> {
  const alertsCreated: string[] = [];
  
  for (const threshold of thresholds) {
    if (threshold.type !== 'deadline') continue;
    
    // Récupérer échéances dans période
    const deadlines = await this.storage.getDeadlines({
      daysAhead: Number(threshold.thresholdValue)
    });
    
    // Évaluer chaque échéance
    for (const deadline of deadlines) {
      if (this.evaluateCondition(deadline.daysRemaining, threshold.operator, Number(threshold.thresholdValue))) {
        const alertId = await this.createDeadlineAlert(threshold, deadline);
        alertsCreated.push(alertId);
      }
    }
  }
  
  return alertsCreated;
}
```

### 2. TODOs Contexte Utilisateur

**Détection:**
```typescript
// Pattern à détecter
'system', // TODO: Récupérer userId réel
'system', // TODO: Récupérer userRole réel
```

**Suggestion:**
```typescript
// ✅ Implémentation suggérée
// Extraire depuis request ou context
const userId = request.userId || context.userId || 'system';
const userRole = request.userRole || context.userRole || 'system';
```

### 3. TODOs Complexité

**Détection:**
```typescript
// Pattern à détecter
'complex' // TODO: Déterminer complexité
```

**Suggestion:**
```typescript
// ✅ Implémentation suggérée
const complexity = this.detectComplexity(request) || 
                   (request.complexity as 'simple' | 'medium' | 'complex') || 
                   'medium';
```

## 📈 TODOs Identifiés

### DateAlertDetectionService.ts

1. **evaluateDeadlineThresholds** - Ligne 2026
   - TODO: Implémenter évaluation échéances
   - Suggestion: Implémenter avec patterns similaires (evaluateProfitabilityThresholds)

2. **evaluateRevenueForecastThresholds** - Ligne 2031
   - TODO: Implémenter évaluation prévisions revenus
   - Suggestion: Utiliser PredictiveEngineService

3. **evaluateProjectDelayThresholds** - Ligne 2036
   - TODO: Implémenter évaluation retards projets
   - Suggestion: Utiliser detectDelayRisks existant

4. **evaluateBudgetOverrunThresholds** - Ligne 2041
   - TODO: Implémenter évaluation dépassements budget
   - Suggestion: Utiliser analytics existants

### ContextBuilderService.ts

5. **userId réel** - Ligne 201
   - TODO: Récupérer userId réel
   - Suggestion: Extraire depuis request/context

6. **userRole réel** - Ligne 202
   - TODO: Récupérer userRole réel
   - Suggestion: Extraire depuis request/context

7. **Complexité** - Ligne 204
   - TODO: Déterminer complexité
   - Suggestion: Détecter automatiquement

## 🎯 Stratégies Implémentation

### 1. Réutilisation Code Existant

**TOUJOURS:**
- ✅ Identifier méthodes similaires
- ✅ Réutiliser patterns existants
- ✅ Adapter selon contexte
- ✅ Documenter réutilisation

### 2. Utilisation Services Existants

**TOUJOURS:**
- ✅ Identifier services pertinents
- ✅ Utiliser méthodes existantes
- ✅ Adapter interfaces si nécessaire
- ✅ Documenter intégration

### 3. Implémentation Complète

**TOUJOURS:**
- ✅ Implémenter fonctionnalité complète
- ✅ Ajouter gestion erreurs
- ✅ Ajouter logging
- ✅ Ajouter tests

## 🔗 Intégration

### Règles Associées

- `code-quality.md` - Standards qualité code
- `preventive-validation.md` - Validation préventive
- `tech-debt-manager.md` - Gestion dette technique

### Documentation

- `docs/TYPESCRIPT_ERRORS_DIAGNOSTIC.md` - Diagnostic erreurs

## ✅ Checklist

**Détection:**
- [ ] Détecter tous les TODOs
- [ ] Analyser contexte chaque TODO
- [ ] Identifier dépendances
- [ ] Générer suggestions

**Implémentation:**
- [ ] Réutiliser code existant si possible
- [ ] Utiliser services existants
- [ ] Implémenter fonctionnalité complète
- [ ] Ajouter tests

**Validation:**
- [ ] Vérifier fonctionnalité
- [ ] Valider tests passent
- [ ] Documenter implémentation

---

**Référence:** TODOs identifiés dans DateAlertDetectionService, ContextBuilderService

