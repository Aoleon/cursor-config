import { test, expect } from '@playwright/test';
import { goToWorkflow, waitForPageLoad } from '../../helpers/navigation';
import { assertWorkflowLoaded, assertEmptyState, assertNoLoadingState } from '../../helpers/assertions';
import { cleanupTestData, generateTestOffer, createOfferViaAPI } from '../../fixtures/e2e/test-data';

/**
 * Tests du workflow Chiffrage
 * 
 * Ce workflow permet de chiffrer les offres en attente et de générer les DPGF
 */

test.describe('Workflow Chiffrage', () => {
  const createdIds: { offers?: string[] } = {};

  test.afterEach(async ({ page }) => {
    // Nettoyage automatique après chaque test
    await cleanupTestData(page, createdIds);
  });

  test('Navigation vers le workflow Chiffrage', async ({ page }) => {
    // Naviguer vers le workflow
    await goToWorkflow(page, 'chiffrage');

    // Vérifier que le workflow est chargé
    await assertWorkflowLoaded(page, 'Chiffrage');

    // Vérifier qu'il n'y a pas d'état de chargement
    await assertNoLoadingState(page);
  });

  test('Affichage du titre et des éléments de base', async ({ page }) => {
    await goToWorkflow(page, 'chiffrage');

    // Vérifier le titre principal
    const title = page.getByRole('heading', { name: /chiffrage/i });
    await expect(title).toBeVisible();

    // Vérifier la présence de la breadcrumb
    const breadcrumb = page.locator('[data-testid*="breadcrumb"]').or(page.locator('nav[aria-label="breadcrumb"]'));
    await expect(breadcrumb).toBeVisible();
  });

  test('État vide quand aucune offre en chiffrage', async ({ page }) => {
    await goToWorkflow(page, 'chiffrage');
    await waitForPageLoad(page);

    // Si aucune offre en chiffrage, vérifier l'état vide
    const hasOffers = await page.getByTestId(/card-offer-/).count() > 0;
    
    if (!hasOffers) {
      await assertEmptyState(page);
    }
  });

  test('Affichage des offres en chiffrage', async ({ page }) => {
    // Créer une offre de test en chiffrage
    const offerData = generateTestOffer({ status: 'en_cours_chiffrage' });
    const offerId = await createOfferViaAPI(page, offerData);
    createdIds.offers = [offerId];

    // Naviguer vers le workflow
    await goToWorkflow(page, 'chiffrage');
    await waitForPageLoad(page);

    // Vérifier que l'offre est affichée
    const offerCard = page.getByTestId(`card-offer-${offerId}`).or(page.getByText(offerData.reference));
    await expect(offerCard).toBeVisible();
  });

  test('Bouton module chiffrage est présent', async ({ page }) => {
    // Créer une offre de test
    const offerData = generateTestOffer({ status: 'en_cours_chiffrage' });
    const offerId = await createOfferViaAPI(page, offerData);
    createdIds.offers = [offerId];

    await goToWorkflow(page, 'chiffrage');
    await waitForPageLoad(page);

    // Vérifier que le bouton du module de chiffrage est présent
    const calculatorButton = page.getByRole('button', { name: /module chiffrage/i })
      .or(page.getByTestId('button-calculator'));
    
    await expect(calculatorButton.first()).toBeVisible();
  });

  test('Navigation responsive sans erreurs', async ({ page }) => {
    await goToWorkflow(page, 'chiffrage');
    
    // Attendre que la page soit stable
    await waitForPageLoad(page);

    // Capturer les erreurs console
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Attendre un peu pour capturer les erreurs
    await page.waitForTimeout(2000);

    // Vérifier qu'il n'y a pas d'erreurs critiques
    const criticalErrors = errors.filter(e => 
      !e.includes('favicon') && 
      !e.includes('404') &&
      !e.includes('chunk')
    );

    expect(criticalErrors).toHaveLength(0);
  });
});
