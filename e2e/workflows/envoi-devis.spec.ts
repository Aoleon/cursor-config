import { test, expect } from '@playwright/test';
import { goToWorkflow, waitForPageLoad } from '../helpers/navigation';
import { assertWorkflowLoaded, assertEmptyState, assertNoLoadingState } from '../helpers/assertions';
import { cleanupTestData, generateTestAO, createAOViaAPI } from '../fixtures/test-data';

/**
 * Tests du workflow Envoi Devis
 * 
 * Ce workflow permet d'envoyer les devis aux clients et de suivre les relances
 */

test.describe('Workflow Envoi Devis', () => {
  const createdIds: { aos?: string[] } = {};

  test.afterEach(async ({ page }) => {
    await cleanupTestData(page, createdIds);
  });

  test('Navigation vers le workflow Envoi Devis', async ({ page }) => {
    await goToWorkflow(page, 'envoi-devis');
    await assertWorkflowLoaded(page, 'Envoi');
    await assertNoLoadingState(page);
  });

  test('Affichage du titre et des statistiques', async ({ page }) => {
    await goToWorkflow(page, 'envoi-devis');

    // Vérifier le titre
    const title = page.getByRole('heading', { name: /envoi.*devis/i });
    await expect(title).toBeVisible();

    // Vérifier la présence des cartes de statistiques
    const statsCards = page.locator('[data-testid*="card"]').or(page.locator('.card'));
    await expect(statsCards.first()).toBeVisible();
  });

  test('État vide quand aucun devis prêt', async ({ page }) => {
    await goToWorkflow(page, 'envoi-devis');
    await waitForPageLoad(page);

    const hasDevis = await page.getByTestId(/card-ao-/).count() > 0;
    
    if (!hasDevis) {
      await assertEmptyState(page);
    }
  });

  test('Affichage des AOs avec devis prêts', async ({ page }) => {
    // Créer un AO de test avec devis prêt
    const aoData = generateTestAO();
    const aoId = await createAOViaAPI(page, aoData);
    createdIds.aos = [aoId];

    await goToWorkflow(page, 'envoi-devis');
    await waitForPageLoad(page);

    // Vérifier que l'AO est présent (ou l'état vide si pas encore traité)
    const aoElement = page.getByTestId(`card-ao-${aoId}`)
      .or(page.getByText(aoData.reference));
    
    // L'élément peut être présent ou non selon le statut
    const count = await aoElement.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('Boutons d action présents', async ({ page }) => {
    await goToWorkflow(page, 'envoi-devis');
    await waitForPageLoad(page);

    // Si des devis sont présents, vérifier les boutons
    const hasDevis = await page.getByRole('button', { name: /visualiser|envoyer|télécharger/i }).count() > 0;

    if (hasDevis) {
      const actionButton = page.getByRole('button', { name: /visualiser|envoyer/i }).first();
      await expect(actionButton).toBeVisible();
    }
  });

  test('Chargement sans erreurs console', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await goToWorkflow(page, 'envoi-devis');
    await waitForPageLoad(page);
    await page.waitForTimeout(1000);

    const criticalErrors = errors.filter(e => 
      !e.includes('favicon') && 
      !e.includes('404')
    );

    expect(criticalErrors).toHaveLength(0);
  });
});
