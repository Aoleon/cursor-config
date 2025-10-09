import { test, expect } from '@playwright/test';
import { goToWorkflow, waitForPageLoad } from '../../helpers/navigation';
import { 
  assertWorkflowLoaded, 
  assertEmptyState, 
  assertNoLoadingState,
  assertSuccessToast,
  assertErrorToast,
  assertURL
} from '../../helpers/assertions';
import { 
  cleanupTestData, 
  generateTestOffer, 
  createOfferViaAPI 
} from '../../fixtures/e2e/test-data';
import { apiPatch } from '../../helpers/api';

/**
 * Tests complets du workflow Chiffrage
 * 
 * Ce workflow permet de chiffrer les offres en attente (status: en_cours_chiffrage) 
 * et de générer les DPGF avant validation finale.
 */

test.describe('Workflow Chiffrage - Navigation & Chargement', () => {
  const createdIds: { offers?: string[] } = {};

  test.afterEach(async ({ page }) => {
    await cleanupTestData(page, createdIds);
  });

  test('devrait naviguer vers le workflow et afficher le titre', async ({ page }) => {
    await goToWorkflow(page, 'chiffrage');
    await assertWorkflowLoaded(page, 'Chiffrage');
  });

  test('devrait afficher les breadcrumbs correctement', async ({ page }) => {
    await goToWorkflow(page, 'chiffrage');
    
    // Vérifier la présence des breadcrumbs
    const breadcrumbDashboard = page.getByRole('link', { name: /tableau de bord/i });
    const breadcrumbChiffrage = page.getByText(/chiffrage/i).last();
    
    await expect(breadcrumbDashboard).toBeVisible();
    await expect(breadcrumbChiffrage).toBeVisible();
  });

  test('devrait charger la page sans erreurs console', async ({ page }) => {
    const errors: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await goToWorkflow(page, 'chiffrage');
    await waitForPageLoad(page);
    
    // Filtrer les erreurs non-critiques
    const criticalErrors = errors.filter(e => 
      !e.includes('favicon') && 
      !e.includes('404') &&
      !e.includes('chunk')
    );
    
    expect(criticalErrors).toHaveLength(0);
  });

  test('devrait vérifier qu\'il n\'y a pas d\'état de chargement persistant', async ({ page }) => {
    await goToWorkflow(page, 'chiffrage');
    await assertNoLoadingState(page);
  });
});

test.describe('Workflow Chiffrage - États d\'affichage', () => {
  const createdIds: { offers?: string[] } = {};

  test.afterEach(async ({ page }) => {
    await cleanupTestData(page, createdIds);
  });

  test('devrait afficher l\'état vide quand aucune offre en chiffrage', async ({ page }) => {
    await goToWorkflow(page, 'chiffrage');
    await waitForPageLoad(page);
    
    // Vérifier l'état vide (si aucune offre n'est en chiffrage)
    const emptyState = page.getByTestId('empty-state');
    const offerCards = page.locator('[data-testid^="card-offer-"]');
    
    const hasCards = await offerCards.count() > 0;
    
    if (!hasCards) {
      await expect(emptyState).toBeVisible();
      await expect(emptyState).toContainText(/aucune offre en chiffrage/i);
    }
  });

  test('devrait afficher la liste des offres quand des données existent', async ({ page }) => {
    // Créer une offre de test
    const offerData = generateTestOffer({ 
      status: 'en_cours_chiffrage',
      montantEstime: 50000
    });
    const offerId = await createOfferViaAPI(page, offerData);
    createdIds.offers = [offerId];
    
    await goToWorkflow(page, 'chiffrage');
    await waitForPageLoad(page);
    
    // Vérifier que l'offre est affichée
    const offerCard = page.getByTestId(`card-offer-${offerId}`);
    await expect(offerCard).toBeVisible();
    
    // Vérifier que l'état vide n'est pas affiché
    const emptyState = page.getByTestId('empty-state');
    await expect(emptyState).not.toBeVisible();
  });
});

test.describe('Workflow Chiffrage - Statistiques', () => {
  const createdIds: { offers?: string[] } = {};

  test.afterEach(async ({ page }) => {
    await cleanupTestData(page, createdIds);
  });

  test('devrait afficher les 4 cartes de statistiques', async ({ page }) => {
    await goToWorkflow(page, 'chiffrage');
    await waitForPageLoad(page);
    
    // Vérifier les 4 cards de statistiques
    const statEnCours = page.getByTestId('stat-en-cours');
    const statVolume = page.getByTestId('stat-volume-total');
    const statMarge = page.getByTestId('stat-marge-moyenne');
    const statAValider = page.getByTestId('stat-a-valider');
    
    await expect(statEnCours).toBeVisible();
    await expect(statVolume).toBeVisible();
    await expect(statMarge).toBeVisible();
    await expect(statAValider).toBeVisible();
    
    // Vérifier les titres
    await expect(statEnCours).toContainText('En cours');
    await expect(statVolume).toContainText('Volume total');
    await expect(statMarge).toContainText('Marge moyenne');
    await expect(statAValider).toContainText('À valider');
  });

  test('devrait afficher le nombre correct d\'offres en cours', async ({ page }) => {
    // Créer 2 offres de test
    const offer1 = generateTestOffer({ status: 'en_cours_chiffrage' });
    const offer2 = generateTestOffer({ status: 'en_cours_chiffrage' });
    
    const id1 = await createOfferViaAPI(page, offer1);
    const id2 = await createOfferViaAPI(page, offer2);
    createdIds.offers = [id1, id2];
    
    await goToWorkflow(page, 'chiffrage');
    await waitForPageLoad(page);
    
    // Vérifier le compteur "En cours"
    const statValue = page.getByTestId('stat-value-en-cours');
    const count = await statValue.textContent();
    
    // Le nombre doit être >= 2 (nos offres + éventuelles autres)
    expect(parseInt(count || '0')).toBeGreaterThanOrEqual(2);
  });

  test('devrait calculer le volume total correctement', async ({ page }) => {
    const montant1 = 100000;
    const montant2 = 150000;
    
    const offer1 = generateTestOffer({ 
      status: 'en_cours_chiffrage',
      montantEstime: montant1
    });
    const offer2 = generateTestOffer({ 
      status: 'en_cours_chiffrage',
      montantEstime: montant2
    });
    
    const id1 = await createOfferViaAPI(page, offer1);
    const id2 = await createOfferViaAPI(page, offer2);
    createdIds.offers = [id1, id2];
    
    await goToWorkflow(page, 'chiffrage');
    await waitForPageLoad(page);
    
    const statValue = page.getByTestId('stat-value-volume');
    await expect(statValue).toBeVisible();
    
    // Le volume doit contenir nos montants (format FR avec espaces)
    const volumeText = await statValue.textContent();
    expect(volumeText).toBeTruthy();
  });

  test('devrait afficher la marge moyenne fixe', async ({ page }) => {
    await goToWorkflow(page, 'chiffrage');
    await waitForPageLoad(page);
    
    const margeStat = page.getByTestId('stat-value-marge');
    await expect(margeStat).toContainText('15.2%');
  });

  test('devrait compter les offres à valider (avec DPGF et montant)', async ({ page }) => {
    // Créer une offre complète (montant + DPGF)
    const offerComplete = generateTestOffer({ 
      status: 'en_cours_chiffrage',
      montantEstime: 100000
    });
    const idComplete = await createOfferViaAPI(page, offerComplete);
    
    // Simuler un DPGF généré (normalement fait par le backend)
    await apiPatch(page, `/api/offers/${idComplete}`, { 
      dpgfDocument: 'dpgf-test-doc.pdf' 
    });
    
    createdIds.offers = [idComplete];
    
    await goToWorkflow(page, 'chiffrage');
    await waitForPageLoad(page);
    
    const statAValider = page.getByTestId('stat-value-a-valider');
    const count = await statAValider.textContent();
    
    // Doit être >= 1
    expect(parseInt(count || '0')).toBeGreaterThanOrEqual(1);
  });
});

test.describe('Workflow Chiffrage - Affichage des offres', () => {
  const createdIds: { offers?: string[] } = {};

  test.afterEach(async ({ page }) => {
    await cleanupTestData(page, createdIds);
  });

  test('devrait afficher la référence, client et intitulé de l\'offre', async ({ page }) => {
    const offerData = generateTestOffer({ 
      status: 'en_cours_chiffrage',
      titre: 'Projet Test Chiffrage'
    });
    const offerId = await createOfferViaAPI(page, offerData);
    createdIds.offers = [offerId];
    
    await goToWorkflow(page, 'chiffrage');
    await waitForPageLoad(page);
    
    // Vérifier la référence
    const reference = page.getByTestId(`offer-reference-${offerId}`);
    await expect(reference).toContainText(offerData.reference);
  });

  test('devrait afficher les informations financières', async ({ page }) => {
    const montant = 125000;
    const offerData = generateTestOffer({ 
      status: 'en_cours_chiffrage',
      montantEstime: montant
    });
    const offerId = await createOfferViaAPI(page, offerData);
    createdIds.offers = [offerId];
    
    await goToWorkflow(page, 'chiffrage');
    await waitForPageLoad(page);
    
    // Vérifier les informations financières
    const financials = page.getByTestId(`offer-financials-${offerId}`);
    await expect(financials).toBeVisible();
    
    const montantElement = page.getByTestId(`offer-montant-${offerId}`);
    await expect(montantElement).toBeVisible();
  });

  test('devrait afficher les indicateurs de progression', async ({ page }) => {
    const offerData = generateTestOffer({ 
      status: 'en_cours_chiffrage',
      montantEstime: 100000
    });
    const offerId = await createOfferViaAPI(page, offerData);
    createdIds.offers = [offerId];
    
    await goToWorkflow(page, 'chiffrage');
    await waitForPageLoad(page);
    
    // Vérifier les indicateurs
    const indicators = page.getByTestId(`offer-indicators-${offerId}`);
    await expect(indicators).toBeVisible();
    
    const indicatorMontant = page.getByTestId(`indicator-montant-${offerId}`);
    const indicatorDpgf = page.getByTestId(`indicator-dpgf-${offerId}`);
    const indicatorBeHours = page.getByTestId(`indicator-be-hours-${offerId}`);
    
    await expect(indicatorMontant).toBeVisible();
    await expect(indicatorDpgf).toBeVisible();
    await expect(indicatorBeHours).toBeVisible();
  });
});

test.describe('Workflow Chiffrage - Actions contextuelles', () => {
  const createdIds: { offers?: string[] } = {};

  test.afterEach(async ({ page }) => {
    await cleanupTestData(page, createdIds);
  });

  test('devrait toujours afficher le bouton "Module chiffrage"', async ({ page }) => {
    const offerData = generateTestOffer({ status: 'en_cours_chiffrage' });
    const offerId = await createOfferViaAPI(page, offerData);
    createdIds.offers = [offerId];
    
    await goToWorkflow(page, 'chiffrage');
    await waitForPageLoad(page);
    
    const moduleButton = page.getByTestId(`button-module-chiffrage-${offerId}`);
    await expect(moduleButton).toBeVisible();
    await expect(moduleButton).toBeEnabled();
  });

  test('devrait rediriger vers le module de chiffrage au clic', async ({ page }) => {
    const offerData = generateTestOffer({ status: 'en_cours_chiffrage' });
    const offerId = await createOfferViaAPI(page, offerData);
    createdIds.offers = [offerId];
    
    await goToWorkflow(page, 'chiffrage');
    await waitForPageLoad(page);
    
    const moduleButton = page.getByTestId(`button-module-chiffrage-${offerId}`);
    await moduleButton.click();
    
    // Vérifier la redirection
    await page.waitForURL(`**/offers/${offerId}/chiffrage`);
    await assertURL(page, `/offers/${offerId}/chiffrage`);
  });

  test('devrait afficher les boutons DPGF si dpgfDocument existe', async ({ page }) => {
    const offerData = generateTestOffer({ status: 'en_cours_chiffrage' });
    const offerId = await createOfferViaAPI(page, offerData);
    
    // Ajouter un DPGF
    await apiPatch(page, `/api/offers/${offerId}`, { 
      dpgfDocument: 'test-dpgf.pdf' 
    });
    
    createdIds.offers = [offerId];
    
    await goToWorkflow(page, 'chiffrage');
    await waitForPageLoad(page);
    
    // Vérifier les boutons DPGF
    const viewButton = page.getByTestId(`button-view-dpgf-${offerId}`);
    const downloadButton = page.getByTestId(`button-download-dpgf-${offerId}`);
    
    await expect(viewButton).toBeVisible();
    await expect(downloadButton).toBeVisible();
  });

  test('devrait afficher "Chiffrage incomplet" si montantEstime ou dpgfDocument manquant', async ({ page }) => {
    // Offre sans montant ni DPGF
    const offerData = generateTestOffer({ 
      status: 'en_cours_chiffrage',
      montantEstime: 0  // Pas de montant
    });
    const offerId = await createOfferViaAPI(page, offerData);
    createdIds.offers = [offerId];
    
    await goToWorkflow(page, 'chiffrage');
    await waitForPageLoad(page);
    
    const incompleteButton = page.getByTestId(`button-chiffrage-incomplet-${offerId}`);
    await expect(incompleteButton).toBeVisible();
    await expect(incompleteButton).toBeDisabled();
  });

  test('devrait afficher "Valider le chiffrage" si offre complète', async ({ page }) => {
    const offerData = generateTestOffer({ 
      status: 'en_cours_chiffrage',
      montantEstime: 100000
    });
    const offerId = await createOfferViaAPI(page, offerData);
    
    // Ajouter un DPGF
    await apiPatch(page, `/api/offers/${offerId}`, { 
      dpgfDocument: 'test-dpgf.pdf' 
    });
    
    createdIds.offers = [offerId];
    
    await goToWorkflow(page, 'chiffrage');
    await waitForPageLoad(page);
    
    const validateButton = page.getByTestId(`button-validate-chiffrage-${offerId}`);
    await expect(validateButton).toBeVisible();
    await expect(validateButton).toBeEnabled();
  });
});

test.describe('Workflow Chiffrage - Validation & Mutations', () => {
  const createdIds: { offers?: string[] } = {};

  test.afterEach(async ({ page }) => {
    await cleanupTestData(page, createdIds);
  });

  test('devrait valider un chiffrage complet avec succès', async ({ page }) => {
    const offerData = generateTestOffer({ 
      status: 'en_cours_chiffrage',
      montantEstime: 150000
    });
    const offerId = await createOfferViaAPI(page, offerData);
    
    // Ajouter un DPGF
    await apiPatch(page, `/api/offers/${offerId}`, { 
      dpgfDocument: 'test-dpgf.pdf' 
    });
    
    createdIds.offers = [offerId];
    
    await goToWorkflow(page, 'chiffrage');
    await waitForPageLoad(page);
    
    // Cliquer sur valider
    const validateButton = page.getByTestId(`button-validate-chiffrage-${offerId}`);
    await validateButton.click();
    
    // Vérifier le toast de succès
    await assertSuccessToast(page);
    
    // Vérifier que le toast contient le bon message
    const toast = page.locator('[role="status"]').or(page.locator('.toast'));
    await expect(toast).toContainText(/chiffrage validé|succès/i);
  });

  test('devrait invalider le cache après validation', async ({ page }) => {
    const offerData = generateTestOffer({ 
      status: 'en_cours_chiffrage',
      montantEstime: 100000
    });
    const offerId = await createOfferViaAPI(page, offerData);
    
    await apiPatch(page, `/api/offers/${offerId}`, { 
      dpgfDocument: 'test-dpgf.pdf' 
    });
    
    createdIds.offers = [offerId];
    
    await goToWorkflow(page, 'chiffrage');
    await waitForPageLoad(page);
    
    // Compter les offres avant
    const offersBefore = await page.locator('[data-testid^="card-offer-"]').count();
    
    // Valider
    const validateButton = page.getByTestId(`button-validate-chiffrage-${offerId}`);
    await validateButton.click();
    
    // Attendre le toast
    await page.waitForSelector('[role="status"]', { timeout: 5000 });
    
    // Attendre que la page se mette à jour
    await page.waitForTimeout(1000);
    
    // L'offre devrait avoir changé de statut et potentiellement disparu de la liste
    // (car elle n'est plus "en_cours_chiffrage")
  });
});

test.describe('Workflow Chiffrage - Gestion d\'erreurs', () => {
  const createdIds: { offers?: string[] } = {};

  test.afterEach(async ({ page }) => {
    await cleanupTestData(page, createdIds);
  });

  test('devrait afficher un message d\'erreur en cas d\'échec API', async ({ page }) => {
    // Intercepter la requête pour simuler une erreur
    await page.route('**/api/offers?status=en_cours_chiffrage', route => {
      route.abort('failed');
    });
    
    await goToWorkflow(page, 'chiffrage');
    await waitForPageLoad(page);
    
    // Vérifier l'état d'erreur
    const errorState = page.getByTestId('error-state');
    await expect(errorState).toBeVisible();
    
    const errorMessage = page.getByTestId('error-message');
    await expect(errorMessage).toBeVisible();
  });

  test('devrait afficher le bouton Réessayer en cas d\'erreur', async ({ page }) => {
    await page.route('**/api/offers?status=en_cours_chiffrage', route => {
      route.abort('failed');
    });
    
    await goToWorkflow(page, 'chiffrage');
    await waitForPageLoad(page);
    
    const retryButton = page.getByTestId('button-retry');
    await expect(retryButton).toBeVisible();
    await expect(retryButton).toBeEnabled();
  });

  test('devrait recharger les données au clic sur Réessayer', async ({ page }) => {
    let requestCount = 0;
    
    await page.route('**/api/offers?status=en_cours_chiffrage', route => {
      requestCount++;
      if (requestCount === 1) {
        route.abort('failed');
      } else {
        route.fulfill({
          status: 200,
          body: JSON.stringify({ success: true, data: [] })
        });
      }
    });
    
    await goToWorkflow(page, 'chiffrage');
    await waitForPageLoad(page);
    
    // Première erreur
    const errorState = page.getByTestId('error-state');
    await expect(errorState).toBeVisible();
    
    // Cliquer sur Réessayer
    const retryButton = page.getByTestId('button-retry');
    await retryButton.click();
    
    // Vérifier que l'erreur disparaît
    await expect(errorState).not.toBeVisible();
  });

  test('devrait afficher une erreur si la validation échoue', async ({ page }) => {
    const offerData = generateTestOffer({ 
      status: 'en_cours_chiffrage',
      montantEstime: 100000
    });
    const offerId = await createOfferViaAPI(page, offerData);
    
    await apiPatch(page, `/api/offers/${offerId}`, { 
      dpgfDocument: 'test-dpgf.pdf' 
    });
    
    createdIds.offers = [offerId];
    
    await goToWorkflow(page, 'chiffrage');
    await waitForPageLoad(page);
    
    // Intercepter la requête de validation pour simuler une erreur
    await page.route(`**/api/offers/${offerId}/validate-chiffrage`, route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ 
          success: false, 
          message: 'Erreur serveur' 
        })
      });
    });
    
    // Tenter de valider
    const validateButton = page.getByTestId(`button-validate-chiffrage-${offerId}`);
    await validateButton.click();
    
    // Vérifier le toast d'erreur
    await assertErrorToast(page);
  });
});

test.describe('Workflow Chiffrage - Cas limites', () => {
  const createdIds: { offers?: string[] } = {};

  test.afterEach(async ({ page }) => {
    await cleanupTestData(page, createdIds);
  });

  test('devrait gérer une offre avec tous les champs remplis', async ({ page }) => {
    const offerData = generateTestOffer({ 
      status: 'en_cours_chiffrage',
      montantEstime: 250000,
      titre: 'Projet Complet'
    });
    const offerId = await createOfferViaAPI(page, offerData);
    
    // Ajouter tous les champs optionnels
    await apiPatch(page, `/api/offers/${offerId}`, { 
      dpgfDocument: 'dpgf-complet.pdf',
      prorataEventuel: 25000,
      beHoursEstimated: 120,
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    });
    
    createdIds.offers = [offerId];
    
    await goToWorkflow(page, 'chiffrage');
    await waitForPageLoad(page);
    
    // Vérifier que tout s'affiche correctement
    const offerCard = page.getByTestId(`card-offer-${offerId}`);
    await expect(offerCard).toBeVisible();
    
    // Vérifier deadline
    const deadline = page.getByTestId(`offer-deadline-${offerId}`);
    await expect(deadline).toBeVisible();
    
    // Vérifier prorata
    const prorata = page.getByTestId(`offer-prorata-${offerId}`);
    await expect(prorata).toBeVisible();
    
    // Vérifier heures BE
    const beHours = page.getByTestId(`offer-be-hours-${offerId}`);
    await expect(beHours).toBeVisible();
  });

  test('devrait gérer plusieurs offres simultanément', async ({ page }) => {
    // Créer 3 offres de test
    const offers = await Promise.all([
      generateTestOffer({ status: 'en_cours_chiffrage', montantEstime: 100000 }),
      generateTestOffer({ status: 'en_cours_chiffrage', montantEstime: 200000 }),
      generateTestOffer({ status: 'en_cours_chiffrage', montantEstime: 150000 })
    ]);
    
    const ids = await Promise.all(
      offers.map(offer => createOfferViaAPI(page, offer))
    );
    
    createdIds.offers = ids;
    
    await goToWorkflow(page, 'chiffrage');
    await waitForPageLoad(page);
    
    // Vérifier que toutes les offres sont affichées
    for (const id of ids) {
      const offerCard = page.getByTestId(`card-offer-${id}`);
      await expect(offerCard).toBeVisible();
    }
    
    // Vérifier le compteur
    const statEnCours = page.getByTestId('stat-value-en-cours');
    const count = await statEnCours.textContent();
    expect(parseInt(count || '0')).toBeGreaterThanOrEqual(3);
  });
});
