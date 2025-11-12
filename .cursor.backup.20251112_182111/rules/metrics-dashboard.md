# Dashboard de Monitoring des Métriques - Saxium

**Référence:** [Cursor Rules Documentation](https://docs.cursor.com/context/rules)  
**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

Dashboard de monitoring des métriques des règles pour visualiser les performances et identifier les optimisations.

## 🎯 Principe Fondamental

**IMPÉRATIF:** L'agent DOIT utiliser un dashboard de monitoring pour visualiser les métriques et identifier les optimisations.

**Objectif:** Fournir une vue d'ensemble des performances des règles et des recommandations d'optimisation.

## 📊 Vue d'Ensemble des Performances

### Métriques Globales

| Métrique | Valeur | Évolution |
|----------|--------|-----------|
| Taux de succès global | 85% | +5% (vs dernière semaine) |
| Temps moyen d'exécution | 12 min | -2 min (vs dernière semaine) |
| Itérations moyennes | 3.2 | -0.5 (vs dernière semaine) |
| Tâches complétées | 150 | +20 (vs dernière semaine) |

### Top 5 Règles les Plus Efficaces

| Règle | Taux de Succès | Problèmes Résolus | Temps Moyen |
|-------|----------------|-------------------|-------------|
| `senior-architect-oversight.md` | 95% | 45 | 8 min |
| `client-consultant-oversight.md` | 92% | 38 | 6 min |
| Bundle "Autonomie" | 90% | 52 | 10 min |
| Bundle "Qualité" | 88% | 41 | 7 min |
| `iteration-unified.md` | 87% | 35 | 9 min |

### Bottom 5 Règles les Moins Efficaces

| Règle | Taux de Succès | Problèmes Non Résolus | Temps Moyen | Recommandation |
|-------|----------------|----------------------|-------------|----------------|
| `rule-x.md` | 45% | 12 | 25 min | Améliorer logique |
| `rule-y.md` | 52% | 8 | 20 min | Optimiser performance |
| `rule-z.md` | 58% | 6 | 18 min | Réviser approche |

## 📈 Recommandations d'Optimisation

### Recommandations Prioritaires

**Priorité Haute:**
1. **Améliorer `rule-x.md`** (Taux de succès: 45%)
   - Action: Réviser logique de la règle
   - Impact attendu: +30% taux de succès
   - Effort: Moyen

2. **Optimiser `rule-y.md`** (Temps: 20 min)
   - Action: Optimiser performance
   - Impact attendu: -10 min temps d'exécution
   - Effort: Faible

**Priorité Moyenne:**
3. **Réviser `rule-z.md`** (Taux de succès: 58%)
   - Action: Réviser approche
   - Impact attendu: +20% taux de succès
   - Effort: Moyen

### Recommandations de Réutilisation

**Patterns efficaces à réutiliser:**
- Pattern de `senior-architect-oversight.md` → Appliquer à autres règles de supervision
- Pattern de Bundle "Autonomie" → Créer autres bundles similaires
- Pattern de `iteration-unified.md` → Réutiliser dans autres règles d'itération

## 🔄 Workflow de Monitoring

### Workflow: Analyser Métriques et Générer Recommandations

**Étapes:**
1. Collecter métriques de toutes les règles
2. Calculer métriques globales
3. Identifier règles les plus/peu efficaces
4. Générer recommandations d'optimisation
5. Prioriser recommandations selon impact et effort
6. Présenter dashboard avec métriques et recommandations

## 🔗 Références

- `@.cursor/rules/rule-metrics.md` - Système de collecte de métriques
- `@.cursor/rules/rule-feedback-loop.md` - Feedback loop et auto-amélioration
- `@.cursor/rules/rule-self-improvement.md` - Auto-amélioration des règles

