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

### ✅ Phase 1 : Metrics Collection (Tâche 8.3 - COMPLÉTÉ)
- ✅ Custom reporter Playwright
- ✅ Persist metrics (latest + history JSON)
- ✅ Compute flaky tests, pass rate, percentiles

### ✅ Phase 2 : Dashboard Static HTML (Tâche 8.4 - COMPLÉTÉ)
- ✅ Script `tests/tools/generate-dashboard.ts` créé
- ✅ HTML dashboard généré depuis metrics JSON (avec fallback baselines)
- ✅ Graphiques trends Chart.js (pass rate, duration, flaky tests)
- ✅ Alerts/warnings visuels (pass rate, duration, flaky tests)
- ✅ CI integration documentation (GitHub Actions workflow example)
- ✅ Documentation complète dans `tests/e2e/README.md`

### 🔜 Phase 3 : AnalyticsService Integration (Post-Tâche 8.4)
- API routes pour fetch métriques
- PostgreSQL persistence
- React dashboard intégré

## Implementation Status

### Tâche 8.4 - Automated Dashboard & Trends : ✅ COMPLÉTÉE

**Fichiers créés** :
- ✅ `tests/tools/generate-dashboard.ts` - Script générateur dashboard HTML

**Fichiers modifiés** :
- ✅ `tests/e2e/README.md` - Section "📊 Dashboard Generation" ajoutée
- ✅ `tests/e2e/DASHBOARD-REQUIREMENTS.md` - Implementation status mis à jour

**Features implémentées** :

1. **Dashboard HTML Statique** :
   - ✅ Génération automatique depuis JSON artifacts
   - ✅ Self-contained (Chart.js via CDN)
   - ✅ Responsive design (CSS Grid)
   - ✅ Gradients et badges colorés

2. **Overview KPIs** :
   - ✅ Pass Rate avec status coloré (success/danger)
   - ✅ Total Tests count
   - ✅ Total Duration (secondes)
   - ✅ Flaky Tests count avec alerte

3. **Suite Performance** :
   - ✅ Per-suite pass rate avec badge coloré
   - ✅ Avg duration display
   - ✅ P95 duration avec comparaison baseline
   - ✅ Flake rate (si > 0%)

4. **Trends Visualisés** :
   - ✅ Pass Rate Trend (Chart.js line chart)
   - ✅ Duration Trend (Chart.js line chart)
   - ✅ Flaky Tests Trend (Chart.js bar chart)
   - ✅ Threshold line (95%) sur graphique pass rate

5. **Flaky Tests Detection** :
   - ✅ Liste complète des tests flaky
   - ✅ Recommandations d'actions
   - ✅ Message de succès si aucun flaky

6. **Alertes Régressions** :
   - ✅ Pass rate < 95% → alerte DANGER
   - ✅ Suite duration > baseline + 50% → alerte WARNING
   - ✅ Nouveaux flaky tests → alerte WARNING
   - ✅ Message de succès si aucune alerte

7. **CI/CD Integration** :
   - ✅ Script exécutable : `npx tsx tests/tools/generate-dashboard.ts`
   - ✅ GitHub Actions workflow example documenté
   - ✅ Artifacts upload configuration
   - ✅ Documentation complète pour CI/CD

**Data Sources supportées** :
- ✅ `test-results/baselines.json` (requis)
- ✅ `test-results/metrics-latest.json` (optionnel, fallback sur baselines)
- ✅ `test-results/metrics-history.json` (optionnel, pour trends)

**Commande d'utilisation** :
```bash
# Génération rapide
npx tsx tests/tools/generate-dashboard.ts

# Workflow complet
npx playwright test && npx tsx tests/tools/generate-dashboard.ts && open test-results/dashboard.html
```

**Acceptance Criteria - Tous Remplis ✅** :
1. ✅ Dashboard fonctionnel (HTML statique généré automatiquement)
2. ✅ Trends visualisés (pass rate, duration, flakiness via Chart.js)
3. ✅ Alertes régressions/flaky tests (section Alerts + badges colorés)
4. ✅ CI integration (documentation GitHub Actions + artifacts)

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
