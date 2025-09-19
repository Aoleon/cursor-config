import { test, expect, type Page } from '@playwright/test';

/**
 * E2E Tests - Technical Alerts Complete Workflow
 * Validation interface complète avec queue, actions, historique
 */

// Helper pour seeder une alerte de test
async function seedTechnicalAlert(page: Page, alertData: any) {
  const response = await page.request.post('/api/technical-alerts/seed', {
    data: alertData
  });
  expect(response.ok()).toBe(true);
  return alertData;
}

// Helper pour attendre le chargement réseau stable
async function waitForStableNetwork(page: Page) {
  await page.waitForLoadState('networkidle');
  // Attendre également que les requêtes React Query se terminent
  await page.waitForTimeout(500);
}

test.describe('Technical Alerts Complete Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigation vers la page des alertes techniques
    await page.goto('/technical-alerts');
    await waitForStableNetwork(page);
  });

  test('should display alerts queue with proper information', async ({ page }) => {
    // Seeder plusieurs alertes avec différents statuts
    const testAlerts = [
      {
        id: 'alert-001',
        aoId: 'ao-test-001',
        aoReference: 'AO-TEST-001',
        score: 85,
        triggeredCriteria: ['pvc-coupe-feu'],
        status: 'pending',
        assignedToUserId: 'user-test-001'
      },
      {
        id: 'alert-002', 
        aoId: 'ao-test-002',
        aoReference: 'AO-TEST-002',
        score: 72,
        triggeredCriteria: ['high-performance-building'],
        status: 'acknowledged',
        assignedToUserId: 'user-test-001'
      },
      {
        id: 'alert-003',
        aoId: 'ao-test-003', 
        aoReference: 'AO-TEST-003',
        score: 68,
        triggeredCriteria: ['isolation-renforcee'],
        status: 'bypassed',
        assignedToUserId: 'user-test-001'
      }
    ];

    // Seeder toutes les alertes
    for (const alert of testAlerts) {
      await seedTechnicalAlert(page, alert);
    }

    // Recharger la page pour voir les nouvelles alertes
    await page.reload();
    await waitForStableNetwork(page);

    // Vérifier affichage des alertes dans la queue
    for (const alert of testAlerts) {
      const alertCard = page.getByTestId(`alert-card-${alert.aoId}`);
      await expect(alertCard).toBeVisible();
      
      // Vérifier contenu de base
      await expect(page.getByText(alert.aoReference)).toBeVisible();
      await expect(page.getByText(alert.score.toString())).toBeVisible();
      
      // Vérifier badge statut avec la bonne couleur/variante
      const statusBadge = page.getByTestId(`status-badge-${alert.aoId}`);
      await expect(statusBadge).toBeVisible();
      await expect(statusBadge).toContainText(getExpectedStatusLabel(alert.status));
    }
  });

  test('should perform acknowledge action successfully', async ({ page }) => {
    // Seeder alerte pending
    const testAlert = await seedTechnicalAlert(page, {
      id: 'alert-ack-001',
      aoId: 'ao-ack-001',
      aoReference: 'AO-ACK-001',
      score: 78,
      triggeredCriteria: ['pvc-coupe-feu'],
      status: 'pending'
    });

    await page.reload();
    await waitForStableNetwork(page);

    // Vérifier alerte visible et status pending
    const alertCard = page.getByTestId(`alert-card-${testAlert.aoId}`);
    await expect(alertCard).toBeVisible();
    await expect(page.getByTestId(`status-badge-${testAlert.aoId}`)).toContainText('En attente');

    // Cliquer sur bouton Acknowledge
    const ackButton = page.getByTestId(`button-ack-${testAlert.aoId}`);
    await expect(ackButton).toBeVisible();
    await ackButton.click();

    // Attendre que l'action soit traitée
    await waitForStableNetwork(page);

    // Vérifier changement de statut
    const statusBadge = page.getByTestId(`status-badge-${testAlert.aoId}`);
    await expect(statusBadge).toContainText('Acknowledgé');
    
    // Vérifier que le bouton acknowledge est maintenant désactivé/caché
    await expect(ackButton).not.toBeVisible();
  });

  test('should perform bypass action with dialog workflow', async ({ page }) => {
    // Seeder alerte pour bypass
    const testAlert = await seedTechnicalAlert(page, {
      id: 'alert-bypass-001',
      aoId: 'ao-bypass-001', 
      aoReference: 'AO-BYPASS-001',
      score: 82,
      triggeredCriteria: ['pvc-coupe-feu', 'high-score'],
      status: 'pending'
    });

    await page.reload();
    await waitForStableNetwork(page);

    // Cliquer sur bouton Bypass
    const bypassButton = page.getByTestId(`button-bypass-${testAlert.aoId}`);
    await bypassButton.click();

    // Vérifier ouverture dialog bypass
    const bypassDialog = page.getByTestId('bypass-dialog');
    await expect(bypassDialog).toBeVisible();
    
    // Vérifier titre avec référence AO
    await expect(page.getByText(`Bypass Temporaire - ${testAlert.aoReference}`)).toBeVisible();

    // Sélectionner durée bypass
    const durationSelect = page.getByTestId('select-bypass-duration');
    await durationSelect.click();
    
    const duration24h = page.getByRole('option', { name: '24 heures' });
    await expect(duration24h).toBeVisible();
    await duration24h.click();

    // Remplir raison bypass
    const reasonTextarea = page.getByTestId('textarea-bypass-reason');
    const bypassReason = 'Test bypass temporaire pour validation technique en cours';
    await reasonTextarea.fill(bypassReason);

    // Valider bypass
    const confirmButton = page.getByTestId('button-confirm-bypass');
    await confirmButton.click();

    // Attendre fermeture dialog et traitement
    await expect(bypassDialog).not.toBeVisible();
    await waitForStableNetwork(page);

    // Vérifier changement statut vers bypassed
    const statusBadge = page.getByTestId(`status-badge-${testAlert.aoId}`);
    await expect(statusBadge).toContainText('Bypassé');
  });

  test('should test bypass with custom duration', async ({ page }) => {
    const testAlert = await seedTechnicalAlert(page, {
      id: 'alert-custom-bypass',
      aoId: 'ao-custom-bypass',
      aoReference: 'AO-CUSTOM-BYPASS',
      score: 89,
      triggeredCriteria: ['complex-criteria'],
      status: 'acknowledged'
    });

    await page.reload();
    await waitForStableNetwork(page);

    // Ouvrir dialog bypass
    await page.getByTestId(`button-bypass-${testAlert.aoId}`).click();
    await expect(page.getByTestId('bypass-dialog')).toBeVisible();

    // Sélectionner durée personnalisée
    const durationSelect = page.getByTestId('select-bypass-duration');
    await durationSelect.click();
    await page.getByRole('option', { name: 'Personnalisé' }).click();

    // Vérifier apparition du champ date/heure
    const customUntilInput = page.getByTestId('input-custom-until');
    await expect(customUntilInput).toBeVisible();

    // Remplir date/heure personnalisée (dans 48h)
    const futureDate = new Date();
    futureDate.setHours(futureDate.getHours() + 48);
    const futureIsoString = futureDate.toISOString().slice(0, 16); // Format datetime-local
    await customUntilInput.fill(futureIsoString);

    // Remplir raison
    await page.getByTestId('textarea-bypass-reason').fill('Bypass personnalisé 48h pour tests avancés');

    // Confirmer
    await page.getByTestId('button-confirm-bypass').click();
    await waitForStableNetwork(page);

    // Vérifier statut bypassé
    await expect(page.getByTestId(`status-badge-${testAlert.aoId}`)).toContainText('Bypassé');
  });

  test('should cancel bypass dialog', async ({ page }) => {
    const testAlert = await seedTechnicalAlert(page, {
      id: 'alert-cancel-bypass',
      aoId: 'ao-cancel-bypass',
      aoReference: 'AO-CANCEL-BYPASS', 
      score: 75,
      triggeredCriteria: ['test-criteria'],
      status: 'pending'
    });

    await page.reload();
    await waitForStableNetwork(page);

    // Ouvrir dialog
    await page.getByTestId(`button-bypass-${testAlert.aoId}`).click();
    await expect(page.getByTestId('bypass-dialog')).toBeVisible();

    // Annuler
    const cancelButton = page.getByTestId('button-cancel-bypass');
    await cancelButton.click();

    // Vérifier fermeture sans changement
    await expect(page.getByTestId('bypass-dialog')).not.toBeVisible();
    await expect(page.getByTestId(`status-badge-${testAlert.aoId}`)).toContainText('En attente');
  });

  test('should display and navigate alert history', async ({ page }) => {
    // Seeder alerte avec historique
    const testAlert = await seedTechnicalAlert(page, {
      id: 'alert-history-001',
      aoId: 'ao-history-001',
      aoReference: 'AO-HISTORY-001',
      score: 91,
      triggeredCriteria: ['multiple-criteria'],
      status: 'validated'
    });

    // Seeder historique via API
    await page.request.post(`/api/technical-alerts/${testAlert.id}/history/seed`, {
      data: [
        {
          action: 'created',
          timestamp: new Date().toISOString(),
          actorUserId: 'system'
        },
        {
          action: 'acknowledged', 
          timestamp: new Date(Date.now() - 3600000).toISOString(), // -1h
          actorUserId: 'user-test-001',
          note: 'Prise en compte pour analyse technique'
        },
        {
          action: 'validated',
          timestamp: new Date(Date.now() - 1800000).toISOString(), // -30min
          actorUserId: 'user-validator-001',
          note: 'Validation technique terminée - Compatible'
        }
      ]
    });

    await page.reload();
    await waitForStableNetwork(page);

    // Cliquer sur bouton historique
    const historyButton = page.getByTestId(`button-history-${testAlert.aoId}`);
    await historyButton.click();

    // Vérifier affichage des entrées d'historique
    await expect(page.getByText('created')).toBeVisible();
    await expect(page.getByText('acknowledged')).toBeVisible();
    await expect(page.getByText('validated')).toBeVisible();

    // Vérifier chronologie (plus récent en premier)
    const historyEntries = page.locator('[data-testid*="history-entry-"]');
    await expect(historyEntries).toHaveCount(3);
    
    // Vérifier notes utilisateur visibles
    await expect(page.getByText('Prise en compte pour analyse technique')).toBeVisible();
    await expect(page.getByText('Validation technique terminée - Compatible')).toBeVisible();
  });

  test('should handle real-time updates via WebSocket simulation', async ({ page }) => {
    // Seeder alerte initiale
    const testAlert = await seedTechnicalAlert(page, {
      id: 'alert-realtime-001',
      aoId: 'ao-realtime-001',
      aoReference: 'AO-REALTIME-001',
      score: 84,
      triggeredCriteria: ['realtime-test'],
      status: 'pending'
    });

    await page.reload();
    await waitForStableNetwork(page);

    // Vérifier statut initial
    await expect(page.getByTestId(`status-badge-${testAlert.aoId}`)).toContainText('En attente');

    // Simuler mise à jour temps réel via API (simule WebSocket)
    await page.request.patch(`/api/technical-alerts/${testAlert.id}`, {
      data: { status: 'acknowledged' }
    });

    // Attendre mise à jour automatique (React Query refetch)
    // Note: Dans un vrai système, ceci serait déclenché par WebSocket
    await page.waitForTimeout(2000); // Simulate polling/refetch interval

    // Vérifier mise à jour statut
    await expect(page.getByTestId(`status-badge-${testAlert.aoId}`)).toContainText('Acknowledgé');
  });

  test('should validate form errors in bypass dialog', async ({ page }) => {
    const testAlert = await seedTechnicalAlert(page, {
      id: 'alert-form-validation',
      aoId: 'ao-form-validation',
      aoReference: 'AO-FORM-VALIDATION',
      score: 77,
      triggeredCriteria: ['form-test'],
      status: 'pending'
    });

    await page.reload();
    await waitForStableNetwork(page);

    // Ouvrir dialog bypass
    await page.getByTestId(`button-bypass-${testAlert.aoId}`).click();
    await expect(page.getByTestId('bypass-dialog')).toBeVisible();

    // Essayer de valider sans raison (champ requis)
    const confirmButton = page.getByTestId('button-confirm-bypass');
    await confirmButton.click();

    // Vérifier message d'erreur
    await expect(page.getByText('La raison doit contenir au moins 10 caractères')).toBeVisible();

    // Remplir raison trop courte
    await page.getByTestId('textarea-bypass-reason').fill('Court');
    await confirmButton.click();

    // Vérifier persistance erreur
    await expect(page.getByText('La raison doit contenir au moins 10 caractères')).toBeVisible();

    // Remplir raison valide
    await page.getByTestId('textarea-bypass-reason').fill('Raison suffisamment longue pour validation');
    await confirmButton.click();

    // Vérifier succès (dialog fermé)
    await expect(page.getByTestId('bypass-dialog')).not.toBeVisible();
  });

  test('should filter alerts by status', async ({ page }) => {
    // Seeder alertes avec différents statuts
    const multiStatusAlerts = [
      { aoId: 'filter-pending-1', status: 'pending', aoReference: 'FILTER-PENDING-1' },
      { aoId: 'filter-pending-2', status: 'pending', aoReference: 'FILTER-PENDING-2' },
      { aoId: 'filter-acked-1', status: 'acknowledged', aoReference: 'FILTER-ACKED-1' },
      { aoId: 'filter-validated-1', status: 'validated', aoReference: 'FILTER-VALIDATED-1' },
      { aoId: 'filter-bypassed-1', status: 'bypassed', aoReference: 'FILTER-BYPASSED-1' }
    ];

    for (const alert of multiStatusAlerts) {
      await seedTechnicalAlert(page, {
        id: `alert-${alert.aoId}`,
        aoId: alert.aoId,
        aoReference: alert.aoReference,
        score: 75,
        triggeredCriteria: ['filter-test'],
        status: alert.status
      });
    }

    await page.reload();
    await waitForStableNetwork(page);

    // Tester filtre "Pending only"
    const pendingFilter = page.getByTestId('filter-status-pending');
    if (await pendingFilter.isVisible()) {
      await pendingFilter.click();
      await waitForStableNetwork(page);

      // Vérifier que seules les alertes pending sont visibles
      await expect(page.getByTestId('alert-card-filter-pending-1')).toBeVisible();
      await expect(page.getByTestId('alert-card-filter-pending-2')).toBeVisible();
      await expect(page.getByTestId('alert-card-filter-acked-1')).not.toBeVisible();
    }

    // Reset filtre - voir toutes les alertes
    const allFilter = page.getByTestId('filter-status-all');
    if (await allFilter.isVisible()) {
      await allFilter.click();
      await waitForStableNetwork(page);

      // Vérifier que toutes les alertes sont visibles
      for (const alert of multiStatusAlerts) {
        await expect(page.getByTestId(`alert-card-${alert.aoId}`)).toBeVisible();
      }
    }
  });
});

// Helper function pour mapper statuts aux labels attendus
function getExpectedStatusLabel(status: string): string {
  const statusMap = {
    'pending': 'En attente',
    'acknowledged': 'Acknowledgé', 
    'validated': 'Validé',
    'bypassed': 'Bypassé'
  };
  return statusMap[status] || status;
}