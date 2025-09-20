import { test, expect, Page } from '@playwright/test';

// ========================================
// TESTS E2E WORKFLOW ALERTES MÉTIER COMPLET  
// ========================================

test.describe('Workflow Alertes Métier - E2E Complet', () => {
  let page: Page;

  test.beforeEach(async ({ page: p }) => {
    page = p;
    
    // Setup: Simuler connexion dirigeant avec alertes actives
    await page.goto('/');
    await page.getByTestId('input-email').fill('manager@saxium.com');
    await page.getByTestId('input-password').fill('password123');
    await page.getByTestId('button-login').click();
    
    await expect(page).toHaveURL('/dashboard');
    
    // Naviguer vers onglet Alertes
    await page.getByRole('tab', { name: /alertes/i }).click();
    await expect(page.getByTestId('business-alerts-overview')).toBeVisible();
  });

  // ========================================
  // TEST WORKFLOW COMPLET : VOIR → ACKNOWLEDGE → ASSIGNER → RÉSOUDRE
  // ========================================

  test('Workflow alertes métier complet bout-en-bout', async () => {
    // 1. Voir alertes - Overview et liste
    await expect(page.getByTestId('business-alerts-overview')).toBeVisible();
    await expect(page.getByTestId('business-alerts-list')).toBeVisible();
    
    // Vérifier métriques overview
    await expect(page.getByTestId('metric-total-alerts')).toBeVisible();
    await expect(page.getByTestId('metric-open-alerts')).toBeVisible();
    await expect(page.getByTestId('metric-critical-alerts')).toBeVisible();
    
    // Vérifier alertes dans la liste
    const alertsList = page.getByTestId('business-alerts-list');
    await expect(alertsList.getByTestId('alert-item-1')).toBeVisible();
    
    // 2. Accuser réception (Acknowledge) d'une alerte critique
    const criticalAlert = alertsList.getByTestId('alert-item-1');
    await expect(criticalAlert.getByTestId('severity-badge-critical')).toBeVisible();
    await expect(criticalAlert.getByTestId('status-badge-open')).toBeVisible();
    
    // Click acknowledge
    await criticalAlert.getByTestId('button-acknowledge-alert-1').click();
    
    // Modal acknowledge avec assignation
    await expect(page.getByTestId('modal-acknowledge-alert')).toBeVisible();
    await expect(page.getByText(/accuser réception de l'alerte/i)).toBeVisible();
    
    // Assigner à un utilisateur
    await page.getByTestId('select-assigned-to').selectOption('user2');
    await page.getByTestId('textarea-acknowledge-notes').fill('Prise en charge immédiate - équipe technique mobilisée');
    
    // Confirmer acknowledge
    await page.getByTestId('button-confirm-acknowledge').click();
    
    // Vérifier feedback acknowledge
    await expect(page.getByText(/alerte prise en compte/i)).toBeVisible();
    
    // 3. Vérifier changement status dans la liste
    await expect(criticalAlert.getByTestId('status-badge-acknowledged')).toBeVisible();
    await expect(criticalAlert.getByText('user2')).toBeVisible(); // Assigné
    await expect(criticalAlert.getByText(/prise en charge immédiate/i)).toBeVisible(); // Notes
    
    // 4. Résoudre l'alerte avec notes obligatoires
    await criticalAlert.getByTestId('button-resolve-alert-1').click();
    
    // Modal résolution
    await expect(page.getByTestId('modal-resolve-alert')).toBeVisible();
    await expect(page.getByText(/résoudre l'alerte/i)).toBeVisible();
    
    // Essayer de résoudre sans notes (doit échouer)
    await page.getByTestId('button-confirm-resolve').click();
    await expect(page.getByTestId('error-resolution-notes-required')).toBeVisible();
    await expect(page.getByText(/notes de résolution obligatoires/i)).toBeVisible();
    
    // Ajouter notes de résolution détaillées
    await page.getByTestId('textarea-resolution-notes').fill(
      'Problème résolu par redistribution des tâches et renforcement équipe technique. ' +
      'Marge projet remontée à 18% après optimisation coûts matériaux. ' +
      'Monitoring renforcé mis en place pour éviter récurrence.'
    );
    
    // Confirmer résolution
    await page.getByTestId('button-confirm-resolve').click();
    
    // Vérifier feedback résolution
    await expect(page.getByText(/alerte résolue avec succès/i)).toBeVisible();
    
    // 5. Vérifier status final resolved
    await expect(criticalAlert.getByTestId('status-badge-resolved')).toBeVisible();
    await expect(criticalAlert.getByTestId('resolved-by-info')).toBeVisible();
    await expect(criticalAlert.getByTestId('resolution-notes')).toBeVisible();
    await expect(criticalAlert.getByText(/problème résolu par redistribution/i)).toBeVisible();
    
    // 6. Vérifier mise à jour métriques overview
    const openAlertsCount = await page.getByTestId('metric-open-alerts').textContent();
    const resolvedAlertsCount = await page.getByTestId('metric-resolved-alerts').textContent();
    
    expect(parseInt(resolvedAlertsCount!)).toBeGreaterThan(0);
  });

  // ========================================
  // TESTS GESTION DIFFÉRENTS TYPES D'ALERTES
  // ========================================

  test('Workflow alertes rentabilité avec actions spécifiques', async () => {
    // Filtrer alertes rentabilité
    await page.getByTestId('filter-alert-type').selectOption('profitability');
    
    const profitabilityAlert = page.getByTestId('alert-item-profitability-1');
    await expect(profitabilityAlert).toBeVisible();
    
    // Vérifier détails spécifiques rentabilité
    await profitabilityAlert.click();
    await expect(page.getByTestId('alert-details-profitability')).toBeVisible();
    await expect(page.getByText(/marge projet inférieure/i)).toBeVisible();
    await expect(page.getByText(/seuil critique/i)).toBeVisible();
    
    // Vérifier actions recommandées
    await expect(page.getByTestId('recommended-actions')).toBeVisible();
    await expect(page.getByText(/optimiser coûts matériaux/i)).toBeVisible();
    await expect(page.getByText(/réviser tarification/i)).toBeVisible();
    
    // Acknowledge avec notes spécifiques
    await page.getByTestId('button-acknowledge-profitability').click();
    await page.getByTestId('select-assigned-to').selectOption('commercial-manager');
    await page.getByTestId('textarea-acknowledge-notes').fill(
      'Analyse coûts en cours. Négociation fournisseurs programmée. ' +
      'Révision tarifs segment premium prévue semaine prochaine.'
    );
    await page.getByTestId('button-confirm-acknowledge').click();
    
    await expect(page.getByText(/alerte rentabilité prise en compte/i)).toBeVisible();
  });

  test('Workflow alertes surcharge équipe avec redistribution', async () => {
    // Filtrer alertes équipe
    await page.getByTestId('filter-alert-type').selectOption('team_utilization');
    
    const teamAlert = page.getByTestId('alert-item-team-1');
    await expect(teamAlert).toBeVisible();
    
    // Vérifier détails surcharge équipe
    await teamAlert.click();
    await expect(page.getByTestId('alert-details-team')).toBeVisible();
    await expect(page.getByText(/surcharge équipe/i)).toBeVisible();
    await expect(page.getByText(/95%/i)).toBeVisible(); // Pourcentage charge
    
    // Vérifier suggestions optimisation
    await expect(page.getByTestId('optimization-suggestions')).toBeVisible();
    await expect(page.getByText(/redistribuer 15h/i)).toBeVisible();
    await expect(page.getByText(/équipe moins chargée/i)).toBeVisible();
    
    // Acknowledge avec plan action
    await page.getByTestId('button-acknowledge-team-alert').click();
    await page.getByTestId('select-assigned-to').selectOption('team-manager');
    await page.getByTestId('textarea-acknowledge-notes').fill(
      'Plan redistribution activé. Transfert 15h vers équipe Alpha. ' +
      'Réorganisation planning semaine 12. Suivi quotidien charge mis en place.'
    );
    await page.getByTestId('button-confirm-acknowledge').click();
    
    // Résolution après redistribution
    await page.getByTestId('button-resolve-team-alert').click();
    await page.getByTestId('textarea-resolution-notes').fill(
      'Redistribution terminée. Charge équipe ramenée à 82%. ' +
      'Nouveau système monitoring charge en temps réel opérationnel. ' +
      'Seuils ajustés pour prévention future.'
    );
    await page.getByTestId('button-confirm-resolve').click();
    
    await expect(page.getByText(/alerte équipe résolue/i)).toBeVisible();
  });

  test('Workflow alertes prédictives avec ajustement projets', async () => {
    // Filtrer alertes prédictives
    await page.getByTestId('filter-alert-type').selectOption('predictive_risk');
    
    const predictiveAlert = page.getByTestId('alert-item-predictive-1');
    await expect(predictiveAlert).toBeVisible();
    
    // Vérifier détails risque prédictif
    await predictiveAlert.click();
    await expect(page.getByTestId('alert-details-predictive')).toBeVisible();
    await expect(page.getByText(/risque projet élevé/i)).toBeVisible();
    await expect(page.getByText(/score: 88/100/i)).toBeVisible();
    
    // Vérifier prédictions et facteurs risque
    await expect(page.getByTestId('risk-factors')).toBeVisible();
    await expect(page.getByText(/complexité technique/i)).toBeVisible();
    await expect(page.getByText(/pression planning/i)).toBeVisible();
    await expect(page.getByText(/retard prévu: 15 jours/i)).toBeVisible();
    
    // Actions préventives recommandées
    await expect(page.getByTestId('preventive-actions')).toBeVisible();
    await expect(page.getByText(/renforcer équipe technique/i)).toBeVisible();
    await expect(page.getByText(/réviser planning/i)).toBeVisible();
    
    // Acknowledge avec plan mitigation
    await page.getByTestId('button-acknowledge-predictive').click();
    await page.getByTestId('select-assigned-to').selectOption('project-manager');
    await page.getByTestId('textarea-acknowledge-notes').fill(
      'Plan mitigation activé. Expert senior affecté au projet. ' +
      'Révision planning avec client programmée. Buffer 10 jours ajouté.'
    );
    await page.getByTestId('button-confirm-acknowledge').click();
    
    await expect(page.getByText(/alerte prédictive prise en compte/i)).toBeVisible();
  });

  // ========================================
  // TESTS CONFIGURATION SEUILS ALERTES
  // ========================================

  test('Configuration seuils alertes fonctionne', async () => {
    // Accéder configuration seuils
    await page.getByTestId('button-configure-thresholds').click();
    
    await expect(page.getByTestId('panel-threshold-configuration')).toBeVisible();
    await expect(page.getByText(/configuration seuils alertes/i)).toBeVisible();
    
    // Voir seuils existants
    await expect(page.getByTestId('threshold-list')).toBeVisible();
    await expect(page.getByTestId('threshold-item-project_margin')).toBeVisible();
    await expect(page.getByTestId('threshold-item-team_utilization')).toBeVisible();
    await expect(page.getByTestId('threshold-item-risk_score')).toBeVisible();
    
    // Modifier seuil marge projet
    await page.getByTestId('threshold-item-project_margin').getByTestId('button-edit-threshold').click();
    
    await expect(page.getByTestId('modal-edit-threshold')).toBeVisible();
    await page.getByTestId('input-threshold-value').fill('18');
    await page.getByTestId('button-save-threshold').click();
    
    await expect(page.getByText(/seuil marge projet mis à jour/i)).toBeVisible();
    
    // Créer nouveau seuil global
    await page.getByTestId('button-new-threshold').click();
    
    await expect(page.getByTestId('modal-new-threshold')).toBeVisible();
    await page.getByTestId('select-threshold-key').selectOption('global_margin');
    await page.getByTestId('input-threshold-value').fill('20');
    await page.getByTestId('select-threshold-operator').selectOption('greater_than');
    await page.getByTestId('button-save-new-threshold').click();
    
    await expect(page.getByText(/nouveau seuil créé/i)).toBeVisible();
    
    // Désactiver seuil temporairement
    await page.getByTestId('threshold-item-team_utilization').getByTestId('switch-threshold-active').click();
    
    await expect(page.getByText(/seuil désactivé/i)).toBeVisible();
  });

  // ========================================
  // TESTS PERFORMANCE WORKFLOW ALERTES
  // ========================================

  test('Workflow alertes performant avec grandes volumes', async () => {
    // Simuler 50 alertes
    await page.route('/api/alerts/business*', async route => {
      const alerts = Array.from({ length: 50 }, (_, i) => ({
        id: `alert${i}`,
        type: 'profitability',
        severity: i < 5 ? 'critical' : i < 15 ? 'high' : 'medium',
        status: i < 10 ? 'open' : i < 30 ? 'acknowledged' : 'resolved',
        entity_name: `Projet ${i}`,
        message: `Alerte ${i}`,
        created_at: new Date()
      }));
      await route.fulfill({ json: alerts });
    });
    
    await page.reload();
    
    // Vérifier affichage performant
    const startTime = Date.now();
    await expect(page.getByTestId('alerts-count')).toContainText('50 alertes');
    const renderTime = Date.now() - startTime;
    
    expect(renderTime).toBeLessThan(2000); // Rendu < 2s pour 50 alertes
    
    // Test pagination
    await expect(page.getByTestId('pagination-controls')).toBeVisible();
    await page.getByTestId('button-pagination-next').click();
    
    await expect(page.getByTestId('pagination-info')).toContainText('21-40 sur 50');
  });

  test('Filtrage et recherche alertes performants', async () => {
    // Test filtrage rapide
    await page.getByTestId('filter-status').selectOption('open');
    
    // Vérifier filtrage quasi-instantané
    await expect(page.getByTestId('alert-item-1')).toBeVisible();
    
    // Test recherche live
    await page.getByTestId('search-entity').fill('Projet École');
    
    // Vérifier résultats filtrés
    await expect(page.getByTestId('alert-item-profitability-1')).toBeVisible();
    await expect(page.getByText('Projet École Primaire')).toBeVisible();
    
    // Clear recherche
    await page.getByTestId('search-entity').fill('');
    await page.getByTestId('filter-status').selectOption('all');
    
    // Retour liste complète
    await expect(page.getByTestId('alerts-count')).toContainText('alertes');
  });

  // ========================================
  // TESTS NOTIFICATIONS EN TEMPS RÉEL
  // ========================================

  test('Notifications nouvelles alertes temps réel', async () => {
    // Dans un vrai test, on simulerait WebSocket/Server-Sent Events
    
    // Simuler arrivée nouvelle alerte critique
    await page.evaluate(() => {
      // Simulation notification browser
      window.dispatchEvent(new CustomEvent('new-business-alert', {
        detail: {
          id: 'alert_new',
          type: 'profitability',
          severity: 'critical',
          entity_name: 'Projet Urgence',
          message: 'Marge critique détectée'
        }
      }));
    });
    
    // Vérifier notification affichée
    await expect(page.getByTestId('notification-new-alert')).toBeVisible();
    await expect(page.getByText(/nouvelle alerte critique/i)).toBeVisible();
    
    // Click notification pour voir détails
    await page.getByTestId('notification-new-alert').click();
    
    // Redirection vers nouvelle alerte
    await expect(page.getByTestId('alert-item-alert_new')).toBeVisible();
    await expect(page.getByTestId('severity-badge-critical')).toBeVisible();
  });

  // ========================================
  // TESTS ACCESSIBILITÉ WORKFLOW
  // ========================================

  test('Workflow alertes accessible au clavier', async () => {
    // Navigation clavier dans liste
    await page.keyboard.press('Tab'); // Focus sur première alerte
    await expect(page.getByTestId('alert-item-1')).toBeFocused();
    
    // Activation acknowledge avec clavier
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('alert-details-1')).toBeVisible();
    
    // Navigation dans modal acknowledge
    await page.getByTestId('button-acknowledge-alert-1').focus();
    await page.keyboard.press('Enter');
    
    await expect(page.getByTestId('modal-acknowledge-alert')).toBeVisible();
    
    // Navigation champs modal
    await page.keyboard.press('Tab');
    await expect(page.getByTestId('select-assigned-to')).toBeFocused();
    
    // Fermeture modal avec Escape
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('modal-acknowledge-alert')).not.toBeVisible();
  });

  test('Messages ARIA pour lecteurs écran', async () => {
    // Vérifier labels ARIA
    await expect(page.getByRole('list', { name: /liste des alertes/i })).toBeVisible();
    
    const alertItems = page.getByRole('listitem');
    await expect(alertItems.first()).toHaveAttribute('aria-labelledby');
    
    // Vérifier états alertes annoncés
    const criticalAlert = page.getByTestId('alert-item-1');
    await expect(criticalAlert).toHaveAttribute('aria-describedby');
    
    // Boutons actions avec labels explicites
    const acknowledgeBtn = page.getByTestId('button-acknowledge-alert-1');
    await expect(acknowledgeBtn).toHaveAttribute('aria-label');
  });
});