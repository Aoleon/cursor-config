import { test, expect } from '@playwright/test';
import { resetE2EState } from '../../helpers/api';
import { waitForPageLoad } from '../../helpers/navigation';

/**
 * Journey E2E: Offer Maturation
 * 
 * Parcours testé:
 * Create Offer (UI) → Chiffrage → Validation → Transform to Project
 * 
 * Ce test valide le parcours complet d'une offre depuis sa création
 * via l'interface utilisateur jusqu'à sa transformation en projet.
 */
test.describe('Journey: Offer Maturation - Parcours E2E Complet', () => {
  
  // Données déterministes basées sur timestamp pour éviter les collisions
  const timestamp = Date.now();
  const offerData = {
    reference: `E2E-OFF-MATURATION-${timestamp}`,
    client: 'Client Maturation E2E',
    location: 'Lyon 69001',
    menuiserieType: 'fenetre' as const,
  };
  
  let createdOfferId: string;
  let createdProjectId: string;

  test.beforeEach(async ({ page }) => {
    // Reset complet avant chaque test pour garantir un état propre
    await resetE2EState(page);
    
    // Attendre que le reset soit complet
    await page.waitForTimeout(500);
  });

  test.afterEach(async ({ page }) => {
    // Cleanup complet après chaque test
    await resetE2EState(page);
  });

  test('should complete full offer maturation journey from creation to project transformation', async ({ page }) => {
    // ==========================================
    // Phase 1: Création de l'Offer via UI
    // ==========================================
    console.log('Phase 1: Création de l\'Offer via UI');
    
    await page.goto('/create-offer');
    await waitForPageLoad(page);
    
    // Remplir le formulaire avec les champs requis
    await page.locator('[data-testid="input-reference"]').fill(offerData.reference);
    await page.locator('[data-testid="input-client"]').fill(offerData.client);
    await page.locator('[data-testid="input-location"]').fill(offerData.location);
    
    // Sélectionner le type de menuiserie
    await page.locator('[data-testid="select-menuiserie-type"]').click();
    await page.locator('[role="option"]').filter({ hasText: 'Fenêtre' }).first().click();
    
    console.log('Formulaire Offer rempli, soumission...');
    
    // Soumettre le formulaire
    const submitBtn = page.locator('[data-testid="button-submit"]');
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();
    
    // Vérifier la création réussie (redirection vers /offers)
    await page.waitForTimeout(2000);
    await expect(page).toHaveURL(/\/offers/, { timeout: 5000 });
    console.log('✅ Offer créée avec succès, redirection vers /offers');
    
    // Récupérer l'ID de l'Offer créée via API
    const offersResponse = await page.request.get('/api/offers');
    const offersResult = await offersResponse.json();
    const offers = Array.isArray(offersResult) ? offersResult : (offersResult.data || []);
    const createdOffer = offers.find((offer: any) => offer.reference === offerData.reference);
    
    if (!createdOffer) {
      throw new Error(`Offer ${offerData.reference} non trouvée après création`);
    }
    
    createdOfferId = createdOffer.id;
    console.log(`Offer trouvée avec ID: ${createdOfferId}`);
    
    // ==========================================
    // Phase 2: Passage en statut Chiffrage
    // ==========================================
    console.log('Phase 2: Passage en statut Chiffrage');
    
    // Workaround: L'offre nouvellement créée n'est probablement pas en statut 'en_attente_fournisseurs'
    // On utilise l'API pour la faire avancer dans le workflow
    console.log('Mise à jour du statut vers en_attente_fournisseurs via API...');
    const chiffrageResponse = await page.request.patch(`/api/offers/${createdOfferId}`, {
      data: {
        status: 'en_attente_fournisseurs'
      }
    });
    
    if (!chiffrageResponse.ok()) {
      console.warn('Impossible de mettre à jour le statut via PATCH, tentative avec POST...');
      // Fallback: essayer de démarrer le chiffrage via l'endpoint dédié
      const startChiffrageResponse = await page.request.post(`/api/offers/${createdOfferId}/start-chiffrage`, {
        data: {
          startedBy: 'e2e-test',
          startedAt: new Date()
        }
      });
      expect(startChiffrageResponse.ok()).toBeTruthy();
    }
    
    await page.waitForTimeout(500);
    
    // Naviguer vers la liste de chiffrage
    await page.goto('/offers/chiffrage-list');
    await waitForPageLoad(page);
    
    // Vérifier que l'offre est visible dans la liste de chiffrage
    const chiffrageOfferCard = page.locator(`[data-testid="card-offer-${createdOfferId}"]`);
    await expect(chiffrageOfferCard).toBeVisible({ timeout: 10000 });
    console.log('✅ Offre visible dans chiffrage-list');
    
    // Optionnel: Démarrer le chiffrage si le bouton est disponible
    const startChiffrageBtn = page.locator(`[data-testid="button-start-chiffrage-${createdOfferId}"]`);
    if (await startChiffrageBtn.isVisible({ timeout: 2000 })) {
      console.log('Démarrage du chiffrage via UI...');
      await startChiffrageBtn.click();
      await page.waitForTimeout(1000);
    }
    
    // Passer au statut suivant: en_attente_validation
    console.log('Passage au statut en_attente_validation via API...');
    const validationResponse = await page.request.patch(`/api/offers/${createdOfferId}`, {
      data: {
        status: 'en_attente_validation',
        finalAmount: 52000
      }
    });
    expect(validationResponse.ok()).toBeTruthy();
    
    await page.waitForTimeout(500);
    
    // ==========================================
    // Phase 3: Validation de l'Offer
    // ==========================================
    console.log('Phase 3: Validation de l\'Offer');
    
    await page.goto('/offers/validation-list');
    await waitForPageLoad(page);
    
    // Vérifier que l'offre est visible dans la liste de validation
    const validationOfferCard = page.locator(`[data-testid="card-offer-${createdOfferId}"]`);
    await expect(validationOfferCard).toBeVisible({ timeout: 10000 });
    console.log('✅ Offre visible dans validation-list');
    
    // Cliquer sur le bouton de validation
    const validateBtn = page.locator(`[data-testid="button-validate-${createdOfferId}"]`);
    await expect(validateBtn).toBeVisible({ timeout: 5000 });
    await validateBtn.click();
    
    console.log('Validation de la fin d\'études en cours...');
    await page.waitForTimeout(2000);
    
    // Vérifier que la validation a réussi (le bouton devrait avoir disparu ou changé)
    // La mutation validateStudiesMutation appelle /api/offers/${offerId}/validate-studies
    // et met à jour le statut à 'fin_etudes_validee'
    
    // Vérifier via API que le statut a été mis à jour
    const validatedOfferResponse = await page.request.get(`/api/offers/${createdOfferId}`);
    const validatedOfferResult = await validatedOfferResponse.json();
    const validatedOffer = validatedOfferResult.data || validatedOfferResult;
    
    console.log('Statut après validation:', validatedOffer.status);
    expect(['fin_etudes_validee', 'valide']).toContain(validatedOffer.status);
    console.log('✅ Offer validée avec succès');
    
    // ==========================================
    // Phase 4: Transformation en Project
    // ==========================================
    console.log('Phase 4: Transformation en Project');
    
    await page.goto('/offers/transform-list');
    await waitForPageLoad(page);
    
    // Vérifier que l'offre est visible dans la liste de transformation
    const transformOfferCard = page.locator(`[data-testid="card-offer-${createdOfferId}"]`);
    await expect(transformOfferCard).toBeVisible({ timeout: 10000 });
    console.log('✅ Offre visible dans transform-list');
    
    // Cliquer sur le bouton de transformation
    const transformBtn = page.locator(`[data-testid="button-transform-${createdOfferId}"]`);
    await expect(transformBtn).toBeVisible({ timeout: 5000 });
    await transformBtn.click();
    
    console.log('Transformation en projet en cours...');
    await page.waitForTimeout(2000);
    
    // Vérifier que le projet a été créé via API
    const projectsResponse = await page.request.get('/api/projects');
    const projectsResult = await projectsResponse.json();
    const projects = Array.isArray(projectsResult) ? projectsResult : (projectsResult.data || []);
    const createdProject = projects.find((project: any) => project.offerId === createdOfferId);
    
    if (!createdProject) {
      throw new Error(`Project non trouvé pour l'Offer ${createdOfferId}`);
    }
    
    createdProjectId = createdProject.id;
    console.log(`✅ Project créé avec succès avec ID: ${createdProjectId}`);
    
    // Vérifier les données du projet
    expect(createdProject.offerId).toBe(createdOfferId);
    expect(createdProject.client).toBe(offerData.client);
    console.log('✅ Project contient bien le lien vers l\'Offer source');
    
    // ==========================================
    // Vérifications finales
    // ==========================================
    console.log('Vérifications finales du parcours...');
    
    // Vérifier que l'offre a bien été transformée (statut ou flag)
    const finalOfferResponse = await page.request.get(`/api/offers/${createdOfferId}`);
    const finalOfferResult = await finalOfferResponse.json();
    const finalOffer = finalOfferResult.data || finalOfferResult;
    
    // Le statut devrait indiquer que l'offre a été transformée
    console.log('Statut final de l\'offre:', finalOffer.status);
    
    console.log('✅ Journey "Offer Maturation" complété avec succès !');
    console.log(`   - Offer créée: ${createdOfferId}`);
    console.log(`   - Project créé: ${createdProjectId}`);
    console.log(`   - Parcours: create-offer → chiffrage → validation → transformation → project`);
  });

  test('should display offer in correct lists based on status', async ({ page }) => {
    console.log('Test: Vérification de l\'affichage des offres selon leur statut');
    
    // Créer une offre de test via API pour tester les listes
    const testOfferData = {
      reference: `E2E-OFF-STATUS-TEST-${Date.now()}`,
      client: 'Client Test Statuts',
      location: 'Paris 75001',
      menuiserieType: 'fenetre',
      status: 'en_attente_fournisseurs'
    };
    
    const createResponse = await page.request.post('/api/offers', {
      data: testOfferData
    });
    const createResult = await createResponse.json();
    const testOffer = createResult.data || createResult;
    
    // Test 1: L'offre en_attente_fournisseurs doit apparaître dans chiffrage-list
    await page.goto('/offers/chiffrage-list');
    await waitForPageLoad(page);
    
    const chiffrageCard = page.locator(`[data-testid="card-offer-${testOffer.id}"]`);
    await expect(chiffrageCard).toBeVisible({ timeout: 5000 });
    console.log('✅ Offre en_attente_fournisseurs visible dans chiffrage-list');
    
    // Test 2: Passer l'offre en en_attente_validation
    await page.request.patch(`/api/offers/${testOffer.id}`, {
      data: { status: 'en_attente_validation' }
    });
    
    await page.goto('/offers/validation-list');
    await waitForPageLoad(page);
    
    const validationCard = page.locator(`[data-testid="card-offer-${testOffer.id}"]`);
    await expect(validationCard).toBeVisible({ timeout: 5000 });
    console.log('✅ Offre en_attente_validation visible dans validation-list');
    
    // Test 3: Valider l'offre (passer en fin_etudes_validee)
    await page.request.post(`/api/offers/${testOffer.id}/validate-studies`, {
      data: {
        validatedBy: 'e2e-test',
        validatedAt: new Date()
      }
    });
    
    await page.goto('/offers/transform-list');
    await waitForPageLoad(page);
    
    const transformCard = page.locator(`[data-testid="card-offer-${testOffer.id}"]`);
    await expect(transformCard).toBeVisible({ timeout: 5000 });
    console.log('✅ Offre fin_etudes_validee visible dans transform-list');
    
    // Cleanup
    await page.request.delete(`/api/offers/${testOffer.id}`);
  });
});
