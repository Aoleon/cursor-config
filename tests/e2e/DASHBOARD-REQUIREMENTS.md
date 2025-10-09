# Dashboard Quality Metrics - Requirements

## Objectif
Créer dashboard pour visualiser métriques qualité tests Playwright et détecter régressions/trends.

## Data Sources
1. `test-results/metrics-latest.json` - Dernière exécution
2. `test-results/metrics-history.json` - Historique (100 dernières exécutions)
3. `test-results/baselines.json` - Baselines de référence (Tâche 8.1)

## Métriques à Afficher

### 1. Overview (KPIs globaux)
- **Total tests** : Nombre total tests
- **Pass rate** : % tests passés (vs threshold 95%)
- **Total duration** : Durée totale exécution
- **Flaky tests count** : Nombre tests flaky détectés

### 2. Suite Performance
**Par suite** :
- **Pass rate** : % tests passés
- **Avg duration** : Durée moyenne
- **p95 duration** : Percentile 95 (détecter outliers)
- **Flake rate** : % tests flaky

**Comparison vs Baseline** :
- Duration actuelle vs baseline (threshold)
- Pass rate actuelle vs target (95%)
- Alertes si dépassement

### 3. Trends (Historique)
**Graphiques** :
- **Pass rate trend** : Évolution pass rate dans le temps
- **Duration trend** : Évolution durée totale dans le temps
- **Flaky tests trend** : Évolution nombre flaky tests

**Data source** : `metrics-history.json` (100 dernières runs)

### 4. Flaky Tests Detection
**Liste** :
- Tests qui passent après retries
- Fréquence flakiness (combien de fois sur N runs)
- Actions suggérées (increase timeout, fix race condition)

**Critères flaky** :
- Test passe après 1+ retries
- Test passe <80% du temps sur N runs

### 5. Alertes/Notifications
**Conditions alerte** :
- Pass rate < 95% (threshold)
- Suite duration > baseline + 50%
- Nouveaux flaky tests détectés
- p95 duration > threshold

**Action** :
- Console warning
- CI/CD notification (GitHub Actions, Slack)
- Email (optionnel)

## Format Visualisation

### Option 1 : HTML Static Dashboard
**Avantages** :
- Généré automatiquement après chaque run
- Pas de serveur nécessaire
- Shareable (CI artifacts)

**Stack** :
- Chart.js / Recharts pour graphiques
- HTML/CSS/JS vanilla
- Template généré par script

### Option 2 : AnalyticsService Integration
**Avantages** :
- Intégration avec service existant
- API pour fetch métriques
- Peut persister en DB PostgreSQL

**Stack** :
- API routes Express
- PostgreSQL storage
- Frontend React dashboard

## Implementation Plan

### Phase 1 : Metrics Collection (Tâche 8.3 - COMPLÉTÉ)
- ✅ Custom reporter Playwright
- ✅ Persist metrics (latest + history JSON)
- ✅ Compute flaky tests, pass rate, percentiles

### Phase 2 : Dashboard Static HTML (Tâche 8.4)
- Générer HTML dashboard depuis metrics JSON
- Graphiques trends (Chart.js)
- Alerts/warnings visuels
- CI integration (artifact upload)

### Phase 3 : AnalyticsService Integration (Post-Tâche 8.4)
- API routes pour fetch métriques
- PostgreSQL persistence
- React dashboard intégré

## Files Generated

**Metrics Files** :
- `test-results/metrics-latest.json` - Dernière run
- `test-results/metrics-history.json` - Historique (100 runs)

**Dashboard Files** (Tâche 8.4) :
- `test-results/dashboard.html` - Dashboard HTML static
- `test-results/dashboard.css` - Styles
- `test-results/dashboard.js` - Scripts (charts, interactivity)

## Success Criteria

**Tâche 8.3** (Metrics Reporting) :
- ✅ Custom reporter fonctionnel
- ✅ Métriques persistées (latest + history)
- ✅ Compute pass rate, p95, flake rate
- ✅ Dashboard requirements définis

**Tâche 8.4** (Dashboard) :
- Dashboard HTML static généré
- Trends visualisés (pass rate, duration)
- Flaky tests identifiés
- Alertes si dépassement thresholds
