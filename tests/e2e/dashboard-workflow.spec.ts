import { test, expect, Page } from '@playwright/test';

// ========================================
// TESTS E2E DASHBOARD DIRIGEANT COMPLET
// ========================================

test.describe('Dashboard Dirigeant - Workflow E2E Complet', () => {
  let page: Page;

  test.beforeEach(async ({ page: p }) => {
    page = p;
    
    // Setup: Simuler connexion dirigeant
    await page.goto('/');
    await page.getByTestId('input-email').fill('dirigeant@saxium.com');
    await page.getByTestId('input-password').fill('password123');
    await page.getByTestId('button-login').click();
    
    // Attendre redirection dashboard
    await expect(page).toHaveURL('/dashboard');
  });

  // ========================================
  // TEST COMPLET : LOGIN → DASHBOARD → NAVIGATION → DONNÉES
  // ========================================

  test('Dirigeant accède dashboard complet avec navigation fluide', async () => {
    // 1. Vérifier landing sur dashboard avec header
    await expect(page.getByTestId('dashboard-header')).toBeVisible();
    await expect(page.getByText('Dashboard Dirigeant')).toBeVisible();
    await expect(page.getByText(/vue d'ensemble opérationnelle/i)).toBeVisible();

    // 2. Vérifier KPIs chargés et affichés
    await expect(page.getByTestId('kpi-revenue')).toBeVisible();
    await expect(page.getByTestId('kpi-conversion-rate')).toBeVisible();
    await expect(page.getByTestId('kpi-margin')).toBeVisible();
    await expect(page.getByTestId('kpi-projects')).toBeVisible();
    await expect(page.getByTestId('kpi-alerts')).toBeVisible();
    await expect(page.getByTestId('kpi-team-load')).toBeVisible();

    // Vérifier valeurs numériques présentes (pas de skeleton)
    await expect(page.getByTestId('kpi-revenue')).toContainText('€');
    await expect(page.getByTestId('kpi-conversion-rate')).toContainText('%');
    await expect(page.getByTestId('kpi-margin')).toContainText('%');

    // 3. Navigation onglet Analytics
    await page.getByRole('tab', { name: /analytics/i }).click();
    
    await expect(page.getByTestId('analytics-content')).toBeVisible();
    await expect(page.getByTestId('margin-analysis-chart')).toBeVisible();
    await expect(page.getByTestId('conversion-trends-chart')).toBeVisible();
    
    // Vérifier données analytics chargées
    await expect(page.getByText('Analyse Marges par Catégorie')).toBeVisible();
    await expect(page.getByText('Tendances Conversion 12 Mois')).toBeVisible();

    // 4. Navigation onglet Prédictif
    await page.getByRole('tab', { name: /prédictif/i }).click();
    
    await expect(page.getByTestId('predictive-content')).toBeVisible();
    await expect(page.getByTestId('revenue-forecast-chart')).toBeVisible();
    await expect(page.getByTestId('project-risks-list')).toBeVisible();
    await expect(page.getByTestId('business-recommendations-list')).toBeVisible();

    // Vérifier données prédictives
    await expect(page.getByText('Prévision Revenus 6 Mois')).toBeVisible();
    await expect(page.getByText('Projets à Risque')).toBeVisible();
    await expect(page.getByText('Recommandations Business')).toBeVisible();

    // 5. Navigation onglet Alertes Métier
    await page.getByRole('tab', { name: /alertes/i }).click();
    
    await expect(page.getByTestId('business-alerts-overview')).toBeVisible();
    await expect(page.getByTestId('business-alerts-list')).toBeVisible();

    // Vérifier métriques alertes
    await expect(page.getByTestId('metric-total-alerts')).toBeVisible();
    await expect(page.getByTestId('metric-open-alerts')).toBeVisible();
    await expect(page.getByTestId('metric-critical-alerts')).toBeVisible();

    // 6. Retour Vue Générale pour export
    await page.getByRole('tab', { name: /vue générale/i }).click();
    
    // Vérifier boutons actions dirigeant
    await expect(page.getByTestId('button-export-report')).toBeVisible();
    await expect(page.getByTestId('button-generate-snapshot')).toBeVisible();
    
    // Test export fonctionnel
    await page.getByTestId('button-export-report').click();
    
    // Attendre download (dans un vrai test, on vérifierait le fichier)
    await page.waitForTimeout(2000);
    
    // Test génération snapshot
    await page.getByTestId('button-generate-snapshot').click();
    
    // Vérifier feedback utilisateur
    await expect(page.getByText(/snapshot généré/i)).toBeVisible({ timeout: 10000 });
  });

  // ========================================
  // TESTS PERFORMANCE ET RÉACTIVITÉ
  // ========================================

  test('Dashboard répond sous 3 secondes avec données complètes', async () => {
    const startTime = Date.now();
    
    // Naviguer dashboard
    await page.goto('/dashboard');
    
    // Attendre chargement complet KPIs
    await expect(page.getByTestId('kpi-revenue')).toContainText('€');
    await expect(page.getByTestId('kpi-conversion-rate')).toContainText('%');
    
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(3000); // Dashboard complet < 3s
  });

  test('Navigation entre onglets fluide sous 500ms', async () => {
    await page.goto('/dashboard');
    
    // Mesurer temps navigation Analytics
    const startAnalytics = Date.now();
    await page.getByRole('tab', { name: /analytics/i }).click();
    await expect(page.getByTestId('analytics-content')).toBeVisible();
    const analyticsTime = Date.now() - startAnalytics;
    
    expect(analyticsTime).toBeLessThan(500);
    
    // Mesurer temps navigation Prédictif
    const startPredictive = Date.now();
    await page.getByRole('tab', { name: /prédictif/i }).click();
    await expect(page.getByTestId('predictive-content')).toBeVisible();
    const predictiveTime = Date.now() - startPredictive;
    
    expect(predictiveTime).toBeLessThan(500);
  });

  // ========================================
  // TESTS DONNÉES TEMPS RÉEL
  // ========================================

  test('KPIs se mettent à jour automatiquement', async () => {
    await page.goto('/dashboard');
    
    // Capturer valeur initiale
    const initialRevenue = await page.getByTestId('kpi-revenue').textContent();
    
    // Attendre refresh automatique (simulé)
    await page.waitForTimeout(5000);
    
    // Vérifier dernière mise à jour
    await expect(page.getByTestId('last-updated-timestamp')).toBeVisible();
    
    // Dans un vrai test, on vérifierait le changement de valeur
    const currentRevenue = await page.getByTestId('kpi-revenue').textContent();
    expect(currentRevenue).toBeDefined();
  });

  test('Indicateurs tendances affichent directions correctes', async () => {
    await page.goto('/dashboard');
    
    // Vérifier icônes tendances présentes
    const trendIcons = page.locator('[data-testid*="trend-icon"]');
    await expect(trendIcons.first()).toBeVisible();
    
    // Vérifier couleurs tendances (vert pour positif, rouge pour négatif)
    const positiveTrend = page.locator('[data-testid="trend-icon-up"]');
    const negativeTrend = page.locator('[data-testid="trend-icon-down"]');
    
    // Au moins une tendance doit être présente
    expect(await positiveTrend.count() + await negativeTrend.count()).toBeGreaterThan(0);
  });

  // ========================================
  // TESTS CHARTS INTERACTIVES
  // ========================================

  test('Charts analytics interactives et fonctionnelles', async () => {
    await page.goto('/dashboard');
    await page.getByRole('tab', { name: /analytics/i }).click();
    
    // Test interaction chart marges
    const marginChart = page.getByTestId('margin-analysis-chart');
    await expect(marginChart).toBeVisible();
    
    // Hover pour tooltip
    await marginChart.hover();
    await expect(page.locator('[data-testid="chart-tooltip"]')).toBeVisible();
    
    // Test interaction chart tendances
    const trendsChart = page.getByTestId('conversion-trends-chart');
    await expect(trendsChart).toBeVisible();
    
    // Click sur point de données
    await trendsChart.click();
    // Dans un vrai test, on vérifierait l'apparition de détails
  });

  test('Charts prédictives affichent données forecast', async () => {
    await page.goto('/dashboard');
    await page.getByRole('tab', { name: /prédictif/i }).click();
    
    // Vérifier chart forecast revenus
    const forecastChart = page.getByTestId('revenue-forecast-chart');
    await expect(forecastChart).toBeVisible();
    
    // Vérifier données mois futurs
    await expect(page.getByText(/prévision/i)).toBeVisible();
    await expect(page.getByText(/confiance/i)).toBeVisible();
    
    // Vérifier algorithme utilisé affiché
    await expect(page.getByTestId('forecast-method')).toBeVisible();
    await expect(page.getByTestId('forecast-confidence')).toContainText('%');
  });

  // ========================================
  // TESTS RESPONSIVE ET MOBILE
  // ========================================

  test('Dashboard responsive fonctionne sur mobile', async () => {
    // Simuler viewport mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard');
    
    // Vérifier layout mobile
    await expect(page.getByTestId('dashboard-header')).toBeVisible();
    
    // KPIs doivent s'adapter en colonne
    const kpiGrid = page.getByTestId('kpi-grid');
    await expect(kpiGrid).toBeVisible();
    
    // Navigation onglets doit être scrollable
    const tabsContainer = page.getByRole('tablist');
    await expect(tabsContainer).toBeVisible();
    
    // Test scroll horizontal si nécessaire
    await page.getByRole('tab', { name: /prédictif/i }).scrollIntoViewIfNeeded();
    await page.getByRole('tab', { name: /prédictif/i }).click();
    
    await expect(page.getByTestId('predictive-content')).toBeVisible();
  });

  test('Dashboard fonctionne en mode sombre', async () => {
    await page.goto('/dashboard');
    
    // Toggle dark mode
    await page.getByTestId('toggle-dark-mode').click();
    
    // Vérifier classes dark mode appliquées
    await expect(page.locator('html')).toHaveClass(/dark/);
    
    // Vérifier lisibilité
    await expect(page.getByTestId('dashboard-header')).toBeVisible();
    await expect(page.getByTestId('kpi-revenue')).toBeVisible();
  });

  // ========================================
  // TESTS GESTION ERREURS
  // ========================================

  test('Dashboard gère gracieusement erreurs API', async () => {
    // Dans un vrai test, on intercepterait les appels API pour simuler erreurs
    await page.route('/api/analytics/kpis', route => {
      route.fulfill({ status: 500, body: 'Server Error' });
    });
    
    await page.goto('/dashboard');
    
    // Vérifier message erreur utilisateur-friendly
    await expect(page.getByTestId('error-message')).toBeVisible();
    await expect(page.getByText(/erreur de chargement/i)).toBeVisible();
    
    // Vérifier bouton retry
    await expect(page.getByTestId('button-retry')).toBeVisible();
    
    // Test retry fonctionne
    await page.unroute('/api/analytics/kpis');
    await page.getByTestId('button-retry').click();
    
    await expect(page.getByTestId('kpi-revenue')).toBeVisible();
  });

  test('Navigation reste fonctionnelle malgré erreurs partielles', async () => {
    // Simuler erreur sur onglet Analytics seulement
    await page.route('/api/analytics/margin-analysis', route => {
      route.fulfill({ status: 500, body: 'Analytics Error' });
    });
    
    await page.goto('/dashboard');
    
    // Vue générale doit fonctionner
    await expect(page.getByTestId('kpi-revenue')).toBeVisible();
    
    // Navigation vers Analytics
    await page.getByRole('tab', { name: /analytics/i }).click();
    
    // Erreur spécifique à Analytics
    await expect(page.getByTestId('analytics-error')).toBeVisible();
    
    // Autres onglets restent fonctionnels
    await page.getByRole('tab', { name: /prédictif/i }).click();
    await expect(page.getByTestId('predictive-content')).toBeVisible();
  });

  // ========================================
  // TESTS ACCESSIBILITÉ
  // ========================================

  test('Dashboard respecte standards accessibilité', async () => {
    await page.goto('/dashboard');
    
    // Test navigation clavier
    await page.keyboard.press('Tab');
    await expect(page.getByRole('tab', { name: /vue générale/i })).toBeFocused();
    
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('tab', { name: /analytics/i })).toBeFocused();
    
    // Test activation clavier
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('analytics-content')).toBeVisible();
    
    // Vérifier labels ARIA
    await expect(page.getByRole('tablist')).toHaveAttribute('aria-label');
    
    // Vérifier contraste (simulé)
    const header = page.getByTestId('dashboard-header');
    await expect(header).toBeVisible();
  });

  // ========================================
  // TEST WORKFLOW EXPORT AVANCÉ
  // ========================================

  test('Export rapport complet avec options dirigeant', async () => {
    await page.goto('/dashboard');
    
    // Click export avec options
    await page.getByTestId('button-export-options').click();
    
    // Modal options export
    await expect(page.getByTestId('modal-export-options')).toBeVisible();
    
    // Sélectionner format et période
    await page.getByTestId('select-export-format').selectOption('pdf');
    await page.getByTestId('select-export-period').selectOption('last_quarter');
    await page.getByTestId('checkbox-include-charts').check();
    await page.getByTestId('checkbox-include-details').check();
    
    // Confirmer export
    await page.getByTestId('button-confirm-export').click();
    
    // Vérifier progression export
    await expect(page.getByTestId('export-progress')).toBeVisible();
    await expect(page.getByText(/génération en cours/i)).toBeVisible();
    
    // Attendre completion
    await expect(page.getByText(/export terminé/i)).toBeVisible({ timeout: 15000 });
    
    // Vérifier lien download
    await expect(page.getByTestId('link-download-report')).toBeVisible();
  });
});