<!-- 
Context: prediction, problem-detection, risk-analysis, proactive, prevention, early-warning
Priority: P1
Auto-load: when analyzing code, when preventing problems, when optimizing quality
Dependencies: core.md, quality-principles.md, bug-prevention.md, preventive-validation.md
Score: 70
-->

# Prédiction Proactive des Problèmes - Saxium

**Objectif:** Prédire proactivement les problèmes futurs en analysant les patterns et en détectant les risques avant qu'ils ne se produisent.

**Référence:** [Cursor Rules Documentation](https://docs.cursor.com/context/rules)  
**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

## 🎯 Principe Fondamental

**IMPÉRATIF:** L'agent DOIT prédire proactivement les problèmes futurs en analysant les patterns et en détectant les risques avant qu'ils ne se produisent.

**Bénéfices:**
- ✅ Prévention des problèmes avant qu'ils ne se produisent
- ✅ Réduction des bugs et erreurs
- ✅ Amélioration de la qualité
- ✅ Optimisation continue

**Référence:** `@.cursor/rules/bug-prevention.md` - Détection proactive des bugs  
**Référence:** `@.cursor/rules/preventive-validation.md` - Validation préventive

## 📋 Règles de Prédiction Proactive

### 1. Analyse Prédictive des Risques

**TOUJOURS:**
- ✅ Analyser code pour identifier risques potentiels
- ✅ Détecter patterns de code à risque
- ✅ Évaluer probabilité de problèmes
- ✅ Prioriser risques selon impact

**Pattern:**
```typescript
// Analyse prédictive des risques
interface RiskAnalysis {
  risk: string;
  type: 'bug' | 'performance' | 'security' | 'maintainability';
  probability: number; // 0-1
  impact: 'low' | 'medium' | 'high' | 'critical';
  location: string;
  recommendation: string;
}

async function analyzePredictiveRisks(
  code: string,
  filePath: string,
  context: Context
): Promise<RiskAnalysis[]> {
  const risks: RiskAnalysis[] = [];
  
  // 1. Analyser patterns de code à risque
  const riskyPatterns = await detectRiskyPatterns(code, filePath);
  riskyPatterns.forEach(pattern => {
    risks.push({
      risk: pattern.description,
      type: pattern.type,
      probability: calculateProbability(pattern, context),
      impact: calculateImpact(pattern, context),
      location: pattern.location,
      recommendation: pattern.recommendation
    });
  });
  
  // 2. Analyser dépendances à risque
  const riskyDependencies = await detectRiskyDependencies(code, filePath, context);
  riskyDependencies.forEach(dep => {
    risks.push({
      risk: `Dépendance risquée: ${dep.name}`,
      type: dep.type,
      probability: dep.probability,
      impact: dep.impact,
      location: dep.location,
      recommendation: dep.recommendation
    });
  });
  
  // 3. Analyser changements récents à risque
  const riskyChanges = await detectRiskyChanges(filePath, context);
  riskyChanges.forEach(change => {
    risks.push({
      risk: `Changement risqué: ${change.description}`,
      type: change.type,
      probability: change.probability,
      impact: change.impact,
      location: change.location,
      recommendation: change.recommendation
    });
  });
  
  // 4. Trier par probabilité × impact
  return risks.sort((a, b) => 
    (b.probability * getImpactScore(b.impact)) - 
    (a.probability * getImpactScore(a.impact))
  );
}
```

### 2. Détection de Patterns d'Échec

**TOUJOURS:**
- ✅ Identifier patterns qui ont échoué dans le passé
- ✅ Détecter code similaire à code qui a échoué
- ✅ Alerter si pattern d'échec détecté
- ✅ Recommander alternatives

**Pattern:**
```typescript
// Détection de patterns d'échec
async function detectFailurePatterns(
  code: string,
  filePath: string,
  context: Context
): Promise<FailurePattern[]> {
  const failures: FailurePattern[] = [];
  
  // 1. Charger historique des échecs
  const failureHistory = await loadFailureHistory(context);
  
  // 2. Comparer code avec patterns d'échec
  failureHistory.forEach(failure => {
    const similarity = calculateSimilarity(code, failure.code);
    if (similarity > 0.8) {
      failures.push({
        pattern: failure.pattern,
        similarity,
        reason: failure.reason,
        location: failure.location,
        recommendation: failure.recommendation,
        alternative: failure.alternative
      });
    }
  });
  
  // 3. Analyser code pour patterns connus d'échec
  const knownFailurePatterns = await getKnownFailurePatterns(context);
  knownFailurePatterns.forEach(pattern => {
    if (matchesPattern(code, pattern)) {
      failures.push({
        pattern: pattern.name,
        similarity: 1.0,
        reason: pattern.reason,
        location: pattern.location,
        recommendation: pattern.recommendation,
        alternative: pattern.alternative
      });
    }
  });
  
  return failures;
}
```

### 3. Alertes Préventives

**TOUJOURS:**
- ✅ Générer alertes pour risques détectés
- ✅ Prioriser alertes selon probabilité × impact
- ✅ Recommander actions préventives
- ✅ Documenter alertes générées

**Pattern:**
```typescript
// Alertes préventives
async function generatePreventiveAlerts(
  risks: RiskAnalysis[],
  failures: FailurePattern[],
  context: Context
): Promise<PreventiveAlert[]> {
  const alerts: PreventiveAlert[] = [];
  
  // 1. Générer alertes pour risques critiques
  risks
    .filter(r => r.impact === 'critical' || r.probability > 0.8)
    .forEach(risk => {
      alerts.push({
        type: 'risk',
        severity: 'critical',
        message: `Risque détecté: ${risk.risk}`,
        location: risk.location,
        recommendation: risk.recommendation,
        action: 'fix-immediately'
      });
    });
  
  // 2. Générer alertes pour patterns d'échec
  failures.forEach(failure => {
    alerts.push({
      type: 'failure-pattern',
      severity: failure.similarity > 0.9 ? 'high' : 'medium',
      message: `Pattern d'échec détecté: ${failure.pattern}`,
      location: failure.location,
      recommendation: failure.recommendation,
      action: 'consider-alternative',
      alternative: failure.alternative
    });
  });
  
  // 3. Prioriser alertes
  return alerts.sort((a, b) => 
    getSeverityScore(b.severity) - getSeverityScore(a.severity)
  );
}
```

### 4. Recommandations Proactives

**TOUJOURS:**
- ✅ Générer recommandations basées sur risques
- ✅ Proposer alternatives pour code à risque
- ✅ Suggérer améliorations préventives
- ✅ Documenter recommandations

**Pattern:**
```typescript
// Recommandations proactives
async function generateProactiveRecommendations(
  risks: RiskAnalysis[],
  context: Context
): Promise<ProactiveRecommendation[]> {
  const recommendations: ProactiveRecommendation[] = [];
  
  risks.forEach(risk => {
    // 1. Recommandation selon type de risque
    switch (risk.type) {
      case 'bug':
        recommendations.push({
          type: 'bug-prevention',
          risk,
          recommendation: `Utiliser pattern ${risk.recommendation} pour éviter bug`,
          priority: risk.impact === 'critical' ? 'high' : 'medium',
          action: 'refactor-code'
        });
        break;
        
      case 'performance':
        recommendations.push({
          type: 'performance-optimization',
          risk,
          recommendation: `Optimiser ${risk.location} pour améliorer performance`,
          priority: 'medium',
          action: 'optimize-code'
        });
        break;
        
      case 'security':
        recommendations.push({
          type: 'security-hardening',
          risk,
          recommendation: `Sécuriser ${risk.location} selon ${risk.recommendation}`,
          priority: 'critical',
          action: 'secure-code'
        });
        break;
        
      case 'maintainability':
        recommendations.push({
          type: 'maintainability-improvement',
          risk,
          recommendation: `Refactoriser ${risk.location} pour améliorer maintenabilité`,
          priority: 'low',
          action: 'refactor-code'
        });
        break;
    }
  });
  
  return recommendations;
}
```

## 🔄 Workflow de Prédiction Proactive

### Workflow: Prédire Problèmes Proactivement

**Étapes:**
1. Analyser code pour risques potentiels
2. Détecter patterns d'échec
3. Générer alertes préventives
4. Générer recommandations proactives
5. Prioriser selon probabilité × impact
6. Documenter prédictions

**Pattern:**
```typescript
async function predictProblemsProactively(
  code: string,
  filePath: string,
  context: Context
): Promise<ProblemPrediction> {
  // 1. Analyser risques
  const risks = await analyzePredictiveRisks(code, filePath, context);
  
  // 2. Détecter patterns d'échec
  const failures = await detectFailurePatterns(code, filePath, context);
  
  // 3. Générer alertes
  const alerts = await generatePreventiveAlerts(risks, failures, context);
  
  // 4. Générer recommandations
  const recommendations = await generateProactiveRecommendations(risks, context);
  
  // 5. Calculer score de risque global
  const riskScore = calculateGlobalRiskScore(risks, failures);
  
  return {
    risks,
    failures,
    alerts,
    recommendations,
    riskScore,
    shouldProceed: riskScore < 0.7 // Seuil de risque acceptable
  };
}
```

## ⚠️ Règles de Prédiction Proactive

### Ne Jamais:

**BLOQUANT:**
- ❌ Ignorer risques détectés
- ❌ Ne pas générer alertes pour risques critiques
- ❌ Ne pas proposer alternatives pour code à risque
- ❌ Ne pas documenter prédictions

**TOUJOURS:**
- ✅ Analyser risques potentiels
- ✅ Détecter patterns d'échec
- ✅ Générer alertes préventives
- ✅ Proposer recommandations proactives
- ✅ Documenter prédictions

## 📊 Checklist Prédiction Proactive

### Avant Modification

- [ ] Analyser risques potentiels
- [ ] Détecter patterns d'échec
- [ ] Générer alertes préventives

### Pendant Modification

- [ ] Surveiller risques en temps réel
- [ ] Ajuster selon alertes
- [ ] Appliquer recommandations

### Après Modification

- [ ] Valider prédictions
- [ ] Documenter résultats
- [ ] Mettre à jour patterns d'échec

## 🔗 Références

- `@.cursor/rules/bug-prevention.md` - Détection proactive des bugs
- `@.cursor/rules/preventive-validation.md` - Validation préventive
- `@.cursor/rules/learning-memory.md` - Mémoire persistante des apprentissages

---

**Note:** Cette règle garantit que les problèmes sont prédits proactivement avant qu'ils ne se produisent, permettant une prévention efficace.

**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

