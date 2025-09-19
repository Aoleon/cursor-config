import { test, expect, type Page } from '@playwright/test';

/**
 * Tests End-to-End - Scénarios Ground Truth Menuiserie
 * Validation complète workflows avec données réelles menuiserie française
 * Phase 2.5 - Tests exhaustifs avec Playwright
 */

// Helper pour attendre le chargement complet d'une page
async function waitForPageLoad(page: Page, selector: string) {
  await page.waitForLoadState('networkidle');
  await page.waitForSelector(selector, { state: 'visible' });
}

// Helper pour remplir un formulaire AO
async function fillAOForm(page: Page, data: {
  title: string;
  client: string;
  location: string;
  type?: string;
  surface?: string;
  isHistorical?: boolean;
  protection?: string;
}) {
  await page.fill('[data-testid="input-ao-title"]', data.title);
  await page.fill('[data-testid="input-ao-client"]', data.client);
  await page.fill('[data-testid="input-ao-location"]', data.location);
  
  if (data.type) {
    await page.selectOption('[data-testid="select-ao-type"]', data.type);
  }
  
  if (data.surface) {
    await page.fill('[data-testid="input-surface"]', data.surface);
  }
  
  if (data.isHistorical) {
    await page.check('[data-testid="checkbox-batiment-historique"]');
    
    if (data.protection) {
      await page.selectOption('[data-testid="select-protection"]', data.protection);
    }
  }
}

// Configuration de base pour tous les tests
test.beforeEach(async ({ page }) => {
  // S'assurer que l'application est en mode test
  await page.goto('/');
  await waitForPageLoad(page, '[data-testid="dashboard-content"]');
});

describe('Scénarios Menuiserie Ground Truth', () => {

  // ========================================
  // SCÉNARIO COMPLET FENÊTRES PVC STANDARD
  // ========================================

  test('Projet fenêtres PVC - workflow complet avec intelligence temporelle', async ({ page }) => {
    // 1. Création AO fenêtres PVC standard
    await page.goto('/create-ao');
    await waitForPageLoad(page, '[data-testid="form-create-ao"]');
    
    await fillAOForm(page, {
      title: 'Fenêtres PVC Maison Individuelle Test E2E',
      client: 'Client Test PVC E2E',
      location: 'Test Location (75)',
      type: 'fenetre_pvc',
      surface: '25'
    });
    
    await page.click('[data-testid="button-save-ao"]');
    
    // Vérifier création réussie
    await expect(page.getByText('AO créé avec succès')).toBeVisible({ timeout: 5000 });
    
    // 2. Navigation vers intelligence temporelle
    await page.goto('/date-intelligence');
    await waitForPageLoad(page, '[data-testid="date-intelligence-dashboard"]');
    
    // Vérifier calcul automatique timeline
    const projectCard = page.getByTestId('project-card-latest').first();
    await expect(projectCard).toContainText('Fenêtres PVC', { timeout: 10000 });
    
    // Vérifier délais calculés selon règles menuiserie PVC standard
    await expect(projectCard.getByTestId('phase-passation')).toContainText('30 jours');
    await expect(projectCard.getByTestId('phase-etude')).toContainText('5 jours');
    await expect(projectCard.getByTestId('phase-appro-pvc')).toContainText('14 jours');
    await expect(projectCard.getByTestId('phase-chantier')).toContainText('3 jours');
    
    // Vérifier durée totale cohérente
    await expect(projectCard.getByTestId('total-duration')).toContainText('52 jours');
    
    // 3. Test modification planning via Gantt interactif
    await page.click('[data-testid="nav-gantt-view"]');
    await waitForPageLoad(page, '[data-testid="interactive-gantt-chart"]');
    
    // Identifier barre de chantier
    const ganttBar = page.getByTestId('gantt-bar-chantier').first();
    await expect(ganttBar).toBeVisible();
    
    // Simuler drag & drop pour décaler de 2 jours
    const targetSlot = page.getByTestId('gantt-date-slot-+2');
    await ganttBar.dragTo(targetSlot);
    
    // Vérifier mise à jour
    await expect(page.getByText('Planning mis à jour')).toBeVisible({ timeout: 3000 });
    
    // 4. Vérification détection automatique alertes
    await page.goto('/date-intelligence/alerts');
    await waitForPageLoad(page, '[data-testid="alerts-dashboard"]');
    
    // Simuler retard pour déclencher alerte (via bouton test)
    if (await page.getByTestId('button-simulate-delay').isVisible()) {
      await page.click('[data-testid="button-simulate-delay"]');
      
      // Vérifier génération alerte
      await expect(page.getByTestId('alert-delay-risk')).toBeVisible({ timeout: 5000 });
      await expect(page.getByText('Risque de retard détecté')).toBeVisible();
      
      // Vérifier suggestions d'actions
      await expect(page.getByText('Réaffecter équipe')).toBeVisible();
      await expect(page.getByText('Prolonger horaires')).toBeVisible();
    }
    
    // 5. Test gestion alerte - acknowledge
    const firstAlert = page.getByTestId('alert-item').first();
    await firstAlert.getByTestId('button-acknowledge-alert').click();
    
    const acknowledgeModal = page.getByTestId('modal-acknowledge-alert');
    await expect(acknowledgeModal).toBeVisible();
    
    await page.fill('[data-testid="input-acknowledgment-notes"]', 'Alerte prise en compte - équipe réaffectée');
    await page.click('[data-testid="button-confirm-acknowledge"]');
    
    await expect(page.getByText('Alerte acquittée')).toBeVisible({ timeout: 3000 });
  });

  // ========================================
  // SCÉNARIO BÂTIMENT HISTORIQUE ABF
  // ========================================

  test('Projet bâtiment historique - contraintes réglementaires ABF', async ({ page }) => {
    // 1. Création AO bâtiment historique
    await page.goto('/create-ao');
    await waitForPageLoad(page, '[data-testid="form-create-ao"]');
    
    await fillAOForm(page, {
      title: 'Restauration Château XVII Test E2E',
      client: 'Monuments Historiques Test',
      location: 'Château Test (37)',
      type: 'fenetre_bois',
      surface: '120',
      isHistorical: true,
      protection: 'monuments_historiques'
    });
    
    await page.click('[data-testid="button-save-ao"]');
    await expect(page.getByText('AO créé avec succès')).toBeVisible({ timeout: 5000 });
    
    // 2. Vérification application règles patrimoniales
    await page.goto('/date-intelligence');
    await waitForPageLoad(page, '[data-testid="date-intelligence-dashboard"]');
    
    const historicalProject = page.getByTestId('timeline-batiment-historique').first();
    await expect(historicalProject).toBeVisible({ timeout: 10000 });
    
    // Vérifier délais spécialisés patrimoine
    await expect(historicalProject.getByTestId('phase-passation')).toContainText('45 jours'); // Passation complexe
    await expect(historicalProject.getByTestId('phase-visa-abf')).toContainText('45 jours'); // VISA ABF
    await expect(historicalProject.getByTestId('phase-etude-patrimoine')).toContainText('21 jours'); // Étude spécialisée
    await expect(historicalProject.getByTestId('phase-appro-bois')).toContainText('45 jours'); // Matériaux patrimoine
    await expect(historicalProject.getByTestId('phase-chantier-patrimoine')).toContainText('15 jours'); // Pose spécialisée
    
    // Vérifier durée totale adaptée
    await expect(historicalProject.getByTestId('total-duration')).toContainText('171 jours');
    
    // 3. Vérification alertes échéances ABF
    await page.goto('/date-intelligence/alerts');
    await waitForPageLoad(page, '[data-testid="alerts-dashboard"]');
    
    // Chercher alerte deadline ABF (peut être générée automatiquement)
    const abfAlert = page.getByTestId('alert-deadline-abf');
    if (await abfAlert.isVisible()) {
      await expect(abfAlert).toContainText('Échéance VISA ABF');
      await expect(abfAlert.getByTestId('alert-severity')).toHaveText('critical');
      
      // Vérifier actions suggérées
      await expect(abfAlert.getByText('Préparer dossier ABF')).toBeVisible();
      await expect(abfAlert.getByText('Contacter architecte patrimoine')).toBeVisible();
    }
    
    // 4. Test workflow dossier ABF
    if (await page.getByTestId('button-prepare-abf-dossier').isVisible()) {
      await page.click('[data-testid="button-prepare-abf-dossier"]');
      
      const abfModal = page.getByTestId('modal-abf-dossier');
      await expect(abfModal).toBeVisible();
      
      // Vérifier checklist documents requis
      await expect(abfModal.getByText('Dossier technique')).toBeVisible();
      await expect(abfModal.getByText('Plans de restauration')).toBeVisible();
      await expect(abfModal.getByText('Échantillons matériaux')).toBeVisible();
      
      // Cocher documents préparés
      await page.check('[data-testid="checkbox-dossier-technique"]');
      await page.check('[data-testid="checkbox-plans-restauration"]');
      
      await page.click('[data-testid="button-save-abf-progress"]');
      await expect(page.getByText('Progression ABF sauvegardée')).toBeVisible();
    }
  });

  // ========================================
  // SCÉNARIO COMPLEXE HIVER MULTI-MATÉRIAUX
  // ========================================

  test('Projet complexe hiver - gestion contraintes météo et ressources', async ({ page }) => {
    // 1. Création projet complexe multi-matériaux
    await page.goto('/create-ao');
    await waitForPageLoad(page, '[data-testid="form-create-ao"]');
    
    await fillAOForm(page, {
      title: 'Projet Complexe Multi-Matériaux Hiver',
      client: 'Client Multi-Matériaux Test',
      location: 'Montagne Test (74)',
      type: 'multi_materiaux',
      surface: '85'
    });
    
    // Configurer saison hiver
    await page.selectOption('[data-testid="select-season"]', 'winter');
    await page.selectOption('[data-testid="select-weather-zone"]', 'montagne');
    await page.check('[data-testid="checkbox-travaux-exterieurs"]');
    
    await page.click('[data-testid="button-save-ao"]');
    await expect(page.getByText('AO créé avec succès')).toBeVisible();
    
    // 2. Vérification calculs contraintes hiver
    await page.goto('/date-intelligence');
    await waitForPageLoad(page, '[data-testid="date-intelligence-dashboard"]');
    
    const winterProject = page.getByTestId('project-card-winter').first();
    await expect(winterProject).toBeVisible({ timeout: 10000 });
    
    // Vérifier majorations hiver
    await expect(winterProject.getByTestId('phase-chantier')).toContainText('7 jours'); // vs 3-5 standard
    await expect(winterProject.getByTestId('weather-constraint')).toContainText('Contrainte météo hiver');
    await expect(winterProject.getByTestId('accessibility-constraint')).toContainText('Accès difficile montagne');
    
    // 3. Simulation conflit ressources
    await page.goto('/planning');
    await waitForPageLoad(page, '[data-testid="planning-overview"]');
    
    // Créer un deuxième projet avec même équipe
    await page.click('[data-testid="button-add-project-simulation"]');
    const simulationModal = page.getByTestId('modal-project-simulation');
    await expect(simulationModal).toBeVisible();
    
    await page.fill('[data-testid="input-simulation-title"]', 'Projet Conflit Équipe');
    await page.selectOption('[data-testid="select-required-team"]', 'equipe_pose_1');
    await page.fill('[data-testid="input-start-date"]', '2024-06-17'); // Overlap intentionnel
    
    await page.click('[data-testid="button-create-simulation"]');
    
    // Vérifier détection conflit
    await expect(page.getByTestId('conflict-alert')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Conflit de ressources détecté')).toBeVisible();
    
    // Vérifier suggestions résolution
    const conflictPanel = page.getByTestId('conflict-resolution-panel');
    await expect(conflictPanel.getByText('Décaler projet de 2 jours')).toBeVisible();
    await expect(conflictPanel.getByText('Affecter équipe alternative')).toBeVisible();
    
    // Appliquer résolution
    await page.click('[data-testid="button-apply-schedule-shift"]');
    await expect(page.getByText('Conflit résolu - Planning mis à jour')).toBeVisible();
  });

  // ========================================
  // SCÉNARIO PERFORMANCE CHARGE ÉLEVÉE
  // ========================================

  test('Performance dashboard avec nombreux projets', async ({ page }) => {
    // 1. Charger dashboard avec simulation charge élevée
    await page.goto('/date-intelligence?simulateLoad=50');
    await waitForPageLoad(page, '[data-testid="date-intelligence-dashboard"]');
    
    // Mesurer temps de chargement
    const startTime = Date.now();
    await page.waitForSelector('[data-testid="projects-grid"]', { state: 'visible' });
    const loadTime = Date.now() - startTime;
    
    // Vérifier performance acceptable
    expect(loadTime).toBeLessThan(3000); // < 3 secondes
    
    // 2. Vérifier affichage correct avec nombreux projets
    const projectCards = page.getByTestId('project-card');
    const cardCount = await projectCards.count();
    expect(cardCount).toBeGreaterThan(10); // Au moins 10 projets affichés
    
    // 3. Test filtrage rapide
    await page.fill('[data-testid="input-project-search"]', 'PVC');
    
    // Vérifier filtrage en temps réel
    await page.waitForTimeout(500); // Debounce
    const filteredCards = page.getByTestId('project-card');
    const filteredCount = await filteredCards.count();
    expect(filteredCount).toBeLessThan(cardCount); // Filtrage appliqué
    
    // 4. Test pagination
    if (await page.getByTestId('pagination-next').isVisible()) {
      await page.click('[data-testid="pagination-next"]');
      await expect(page.getByTestId('projects-grid')).toBeVisible();
      
      // Vérifier changement de page
      await expect(page.getByTestId('page-indicator')).toContainText('2');
    }
    
    // 5. Test détection alertes temps réel
    await page.goto('/date-intelligence/alerts');
    await waitForPageLoad(page, '[data-testid="alerts-dashboard"]');
    
    // Simuler détection périodique
    await page.click('[data-testid="button-run-detection"]');
    
    // Vérifier progression détection
    await expect(page.getByTestId('detection-progress')).toBeVisible();
    await expect(page.getByText('Analyse en cours')).toBeVisible();
    
    // Attendre fin détection
    await expect(page.getByText('Détection terminée')).toBeVisible({ timeout: 15000 });
    
    // Vérifier résultats
    const detectionSummary = page.getByTestId('detection-summary');
    await expect(detectionSummary.getByTestId('total-alerts')).toContainText(/\d+/);
    await expect(detectionSummary.getByTestId('critical-count')).toContainText(/\d+/);
  });

  // ========================================
  // SCÉNARIO OPTIMISATION PLANNING
  // ========================================

  test('Optimisation intelligente planning avec suggestions', async ({ page }) => {
    // 1. Charger projet avec potentiel d'optimisation
    await page.goto('/date-intelligence');
    await waitForPageLoad(page, '[data-testid="date-intelligence-dashboard"]');
    
    // Sélectionner projet pour optimisation
    const projectCard = page.getByTestId('project-card').first();
    await projectCard.click();
    
    // Ouvrir panel optimisation
    await page.click('[data-testid="button-optimize-timeline"]');
    const optimizationPanel = page.getByTestId('optimization-panel');
    await expect(optimizationPanel).toBeVisible();
    
    // 2. Vérifier suggestions automatiques
    await expect(optimizationPanel.getByTestId('suggestion-parallel-phases')).toBeVisible();
    await expect(optimizationPanel.getByText('Commencer approvisionnement pendant étude')).toBeVisible();
    await expect(optimizationPanel.getByTestId('estimated-gain')).toContainText('3 jours');
    
    await expect(optimizationPanel.getByTestId('suggestion-early-start')).toBeVisible();
    await expect(optimizationPanel.getByText('Avancer date de début')).toBeVisible();
    
    // 3. Évaluer faisabilité
    const parallelSuggestion = optimizationPanel.getByTestId('suggestion-parallel-phases');
    await expect(parallelSuggestion.getByTestId('feasibility')).toContainText('Élevée');
    await expect(parallelSuggestion.getByTestId('risk-level')).toContainText('Faible');
    
    // Voir détails prérequis
    await parallelSuggestion.getByTestId('button-view-details').click();
    const detailsModal = page.getByTestId('modal-optimization-details');
    await expect(detailsModal).toBeVisible();
    
    await expect(detailsModal.getByText('Spécifications partielles acceptées')).toBeVisible();
    await expect(detailsModal.getByText('Accord client pour commandes anticipées')).toBeVisible();
    
    // 4. Appliquer optimisation
    await page.click('[data-testid="button-apply-optimization"]');
    await expect(page.getByText('Optimisation appliquée')).toBeVisible({ timeout: 3000 });
    
    // Vérifier mise à jour timeline
    await page.click('[data-testid="button-close-modal"]');
    await expect(projectCard.getByTestId('optimized-badge')).toBeVisible();
    await expect(projectCard.getByTestId('gain-indicator')).toContainText('3 jours');
    
    // 5. Vérifier impact sur Gantt
    await page.click('[data-testid="nav-gantt-view"]');
    await waitForPageLoad(page, '[data-testid="interactive-gantt-chart"]');
    
    // Vérifier phases parallèles visibles
    const etudeBar = page.getByTestId('gantt-bar-etude');
    const approBar = page.getByTestId('gantt-bar-approvisionnement');
    
    await expect(etudeBar).toBeVisible();
    await expect(approBar).toBeVisible();
    
    // Vérifier overlap visuel
    const etudeBox = await etudeBar.boundingBox();
    const approBox = await approBar.boundingBox();
    
    expect(etudeBox && approBox).toBeTruthy();
    if (etudeBox && approBox) {
      // Vérifier que les barres se chevauchent (optimisation appliquée)
      const hasOverlap = (etudeBox.x < approBox.x + approBox.width) && 
                        (approBox.x < etudeBox.x + etudeBox.width);
      expect(hasOverlap).toBe(true);
    }
  });

  // ========================================
  // SCÉNARIO INTÉGRATION COMPLÈTE
  // ========================================

  test('Workflow intégral AO → Projet → Intelligence → Alertes → Résolution', async ({ page }) => {
    // 1. Création AO complète
    await page.goto('/create-ao');
    await fillAOForm(page, {
      title: 'Intégration Complète E2E Test',
      client: 'Client Intégration Test',
      location: 'Test Integration (75)',
      type: 'porte_alu',
      surface: '35'
    });
    
    await page.click('[data-testid="button-save-ao"]');
    await expect(page.getByText('AO créé avec succès')).toBeVisible();
    
    // 2. Transformation en offre
    await page.click('[data-testid="button-create-offer-from-ao"]');
    const offerModal = page.getByTestId('modal-create-offer');
    await expect(offerModal).toBeVisible();
    
    await page.fill('[data-testid="input-offer-reference"]', 'OFF-E2E-001');
    await page.fill('[data-testid="input-estimated-amount"]', '65000');
    await page.click('[data-testid="button-confirm-create-offer"]');
    
    await expect(page.getByText('Offre créée avec succès')).toBeVisible();
    
    // 3. Passage en projet
    await page.goto('/offers');
    await waitForPageLoad(page, '[data-testid="offers-list"]');
    
    const offerRow = page.getByText('OFF-E2E-001').first();
    await offerRow.click();
    
    await page.click('[data-testid="button-convert-to-project"]');
    await expect(page.getByText('Projet créé avec succès')).toBeVisible();
    
    // 4. Vérification intelligence temporelle automatique
    await page.goto('/date-intelligence');
    await waitForPageLoad(page, '[data-testid="date-intelligence-dashboard"]');
    
    const newProject = page.getByText('Intégration Complète E2E Test').first();
    await expect(newProject).toBeVisible({ timeout: 10000 });
    
    // Vérifier calcul automatique
    await expect(newProject.getByTestId('phase-etude')).toContainText(/\d+ jours/);
    await expect(newProject.getByTestId('phase-approvisionnement')).toContainText(/\d+ jours/);
    
    // 5. Simulation problème et détection alerte
    await page.click('[data-testid="nav-technical-alerts"]');
    await waitForPageLoad(page, '[data-testid="technical-alerts-page"]');
    
    await page.click('[data-testid="button-simulate-delay-scenario"]');
    await page.selectOption('[data-testid="select-delay-type"]', 'supplier_delay');
    await page.fill('[data-testid="input-delay-days"]', '5');
    await page.click('[data-testid="button-trigger-simulation"]');
    
    // 6. Vérification propagation dans système
    await page.goto('/date-intelligence/alerts');
    await waitForPageLoad(page, '[data-testid="alerts-dashboard"]');
    
    // Attendre génération alerte
    await expect(page.getByTestId('alert-supplier-delay')).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('Retard fournisseur détecté')).toBeVisible();
    
    // 7. Résolution et mise à jour cascade
    const supplierAlert = page.getByTestId('alert-supplier-delay');
    await supplierAlert.getByTestId('button-resolve-alert').click();
    
    const resolutionModal = page.getByTestId('modal-resolve-alert');
    await expect(resolutionModal).toBeVisible();
    
    await page.selectOption('[data-testid="select-resolution-action"]', 'replan_timeline');
    await page.fill('[data-testid="input-resolution-notes"]', 'Replanification avec fournisseur alternatif');
    await page.click('[data-testid="button-confirm-resolution"]');
    
    // 8. Vérification mise à jour timeline
    await page.goto('/date-intelligence');
    await waitForPageLoad(page, '[data-testid="date-intelligence-dashboard"]');
    
    const updatedProject = page.getByText('Intégration Complète E2E Test').first();
    
    // Vérifier badge de modification
    await expect(updatedProject.getByTestId('updated-badge')).toBeVisible();
    await expect(updatedProject.getByTestId('resolution-applied')).toContainText('Replanifié');
    
    // Vérifier nouvelles dates
    const newApproDate = await updatedProject.getByTestId('phase-approvisionnement').textContent();
    expect(newApproDate).toBeTruthy();
    
    // 9. Validation état final cohérent
    await page.click('[data-testid="nav-gantt-view"]');
    await waitForPageLoad(page, '[data-testid="interactive-gantt-chart"]');
    
    // Vérifier que le Gantt reflète les changements
    const updatedGantt = page.getByTestId('gantt-project-integration');
    await expect(updatedGantt).toBeVisible();
    await expect(updatedGantt.getByTestId('replan-indicator')).toBeVisible();
    
    // Vérifier cohérence chronologique
    const phases = await updatedGantt.getByTestId('gantt-bar').all();
    expect(phases.length).toBeGreaterThan(2); // Au moins étude, appro, chantier
  });
});