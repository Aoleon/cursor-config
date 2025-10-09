import { test, expect } from '@playwright/test';
import { resetE2EState } from '../../helpers/api';
import { waitForPageLoad } from '../../helpers/navigation';
import { e2eSeeds } from '../../fixtures/e2e/test-data';

/**
 * Journey E2E: Parcours complet de l'AO au Chantier
 * 
 * Parcours testé:
 * AO (Création UI) → Offer (Transformation) → Chiffrage → Validation → Project → Planification → Chantier
 * 
 * Note: Ce test suit le parcours complet end-to-end de l'application Saxium,
 * en commençant par la création d'un AO via l'UI jusqu'au démarrage du chantier.
 */
test.describe('Journey: AO to Chantier - Parcours E2E Complet', () => {
  
  // Identifiants déterministes pour le test
  const testAoReference = 'E2E-AO-TEST-001';
  const testOfferReference = 'E2E-OFF-TEST-001';
  const testProjectReference = 'E2E-PROJ-TEST-001';
  
  test.beforeEach(async ({ page }) => {
    // Reset complet avant chaque test pour garantir un état propre
    // Ne PAS seed - on va créer l'AO via UI
    await resetE2EState(page);
    
    // Attendre que le reset soit complet
    await page.waitForTimeout(500);
  });

  test.afterEach(async ({ page }) => {
    // Cleanup complet après chaque test
    await resetE2EState(page);
  });

  test('should complete full journey from AO to Chantier', async ({ page }) => {
    // ==========================================
    // Phase 1: Création de l'AO via UI
    // ==========================================
    console.log('Phase 1: Création de l\'AO via UI');
    
    await page.goto('/create-ao');
    await waitForPageLoad(page);
    
    // Aller directement au formulaire manuel (onglet par défaut ou switch)
    const manualTab = page.locator('[value="manual"]');
    if (await manualTab.isVisible({ timeout: 2000 })) {
      await manualTab.click();
      await page.waitForTimeout(500);
    }
    
    // Remplir le formulaire avec les data-testid disponibles
    await page.locator('[data-testid="input-reference"]').fill(testAoReference);
    await page.locator('[data-testid="input-client"]').fill('Client Test E2E');
    await page.locator('[data-testid="input-location"]').fill('Paris 75001');
    
    // Sélectionner le département (SelectTrigger puis SelectItem)
    await page.locator('[data-testid="select-departement"]').click();
    await page.locator('[role="option"]').filter({ hasText: '50' }).first().click();
    
    // Sélectionner le type de menuiserie
    await page.locator('[data-testid="select-menuiserie-type"]').click();
    await page.locator('[role="option"]').filter({ hasText: 'Fenêtre' }).first().click();
    
    // Note: Le champ "source" n'a pas de data-testid mais a une valeur par défaut "website"
    // donc pas besoin de le remplir
    
    console.log('Formulaire AO rempli, soumission...');
    
    // Soumettre le formulaire
    const submitBtn = page.locator('[data-testid="button-create-ao"]');
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();
    
    // Vérifier la création réussie (redirection ou toast)
    await page.waitForTimeout(2000);
    
    // Vérifier qu'on est redirigé vers /offers
    await expect(page).toHaveURL(/\/offers/, { timeout: 5000 });
    console.log('✅ AO créé avec succès, redirection vers /offers');
    
    // ==========================================
    // Phase 2: Transformation AO → Offer
    // ==========================================
    console.log('Phase 2: Transformation AO → Offer');
    
    // Récupérer l'ID de l'AO créé via API
    const aosResponse = await page.request.get('/api/aos');
    const aosData = await aosResponse.json();
    const aos = Array.isArray(aosData) ? aosData : (aosData.data || []);
    const createdAo = aos.find((ao: any) => ao.reference === testAoReference);
    
    if (!createdAo) {
      throw new Error(`AO ${testAoReference} non trouvé après création`);
    }
    
    console.log(`AO trouvé avec ID: ${createdAo.id}`);
    
    // Naviguer vers create-offer avec l'aoId pour transformer l'AO en Offer
    // C'est le flow standard: /create-offer?aoId={id} ou sélection depuis la page
    await page.goto(`/create-offer?aoId=${createdAo.id}`);
    await waitForPageLoad(page);
    
    // Le formulaire devrait être pré-rempli avec les données de l'AO
    // Vérifier que la référence est pré-remplie
    await page.waitForTimeout(1000); // Laisser le temps au formulaire de se remplir
    
    const referenceInput = page.locator('input[name="reference"]').first();
    await expect(referenceInput).toHaveValue(/OFF-.*/, { timeout: 5000 });
    
    console.log('Formulaire Offer pré-rempli depuis AO, soumission...');
    
    // Soumettre pour créer l'Offer
    const createOfferBtn = page.locator('button[type="submit"]').filter({ hasText: /Créer|Enregistrer/i }).first();
    await expect(createOfferBtn).toBeVisible({ timeout: 5000 });
    await createOfferBtn.click();
    
    // Vérifier la création réussie
    await page.waitForTimeout(2000);
    await expect(page).toHaveURL(/\/offers/, { timeout: 5000 });
    
    console.log('✅ Offer créée depuis AO avec succès');
    
    // Récupérer l'Offer créée
    const offersResponse = await page.request.get('/api/offers');
    const offersData = await offersResponse.json();
    const offers = Array.isArray(offersData) ? offersData : (offersData.data || []);
    const createdOffer = offers.find((offer: any) => offer.aoId === createdAo.id);
    
    if (!createdOffer) {
      throw new Error('Offer non trouvée après création depuis AO');
    }
    
    console.log(`Offer trouvée avec ID: ${createdOffer.id}`);
    
    // ==========================================
    // Phase 3: Chiffrage de l'offre
    // ==========================================
    console.log('Phase 3: Chiffrage de l\'offre');
    
    await page.goto('/offers/chiffrage-list');
    await waitForPageLoad(page);
    
    // Vérifier que l'offre est visible
    const offerCard = page.locator(`[data-testid="card-offer-${createdOffer.id}"]`);
    await expect(offerCard).toBeVisible({ timeout: 10000 });
    
    console.log('✅ Offre visible dans chiffrage-list');
    
    // Simuler la complétion du chiffrage via API
    console.log('Complétion du chiffrage via API...');
    await page.request.patch(`/api/offers/${createdOffer.id}`, {
      data: {
        status: 'en_attente_validation',
        finalAmount: 48000,
      }
    });
    
    await page.waitForTimeout(500);
    
    // ==========================================
    // Phase 4: Validation de l'offre
    // ==========================================
    console.log('Phase 4: Navigation vers validation-list');
    
    await page.goto('/offers/validation-list');
    await waitForPageLoad(page);
    
    // Vérifier que l'offre apparaît dans la liste de validation
    const validationCard = page.locator(`[data-testid="card-offer-${createdOffer.id}"]`);
    await expect(validationCard).toBeVisible({ timeout: 10000 });
    
    console.log('✅ Offre visible dans validation-list');
    
    // Valider l'offre
    const validateBtn = validationCard.locator(`[data-testid="button-validate-${createdOffer.id}"]`);
    await expect(validateBtn).toBeVisible();
    
    console.log('Validation de l\'offre...');
    await validateBtn.click();
    await page.waitForTimeout(1000);
    
    // Vérifier que la validation a réussi (badge ou toast)
    const validatedBadge = page.locator('text=/Validée|fin d\'études validée/i').first();
    await expect(validatedBadge).toBeVisible({ timeout: 5000 });
    
    console.log('✅ Offre validée avec succès');
    
    // ==========================================
    // Phase 5: Création/Transformation en projet
    // ==========================================
    console.log('Phase 5: Transformation en projet');
    
    // Note: La transformation offer → project se fait via l'interface ou API
    // Pour ce test, on utilise l'API pour créer le projet lié à l'offre
    
    const projectData = {
      id: `e2e-project-from-ao-${createdAo.id}`,
      reference: testProjectReference,
      offerId: createdOffer.id,
      client: createdOffer.client || 'Client Test E2E',
      location: createdOffer.location || 'Paris 75001',
      status: 'planification',
      tasksCreated: false,
      teamsAssigned: false,
      datesValidated: false,
      suppliesOrdered: false,
      readyToStart: false
    };
    
    console.log('Création du projet via API...');
    await page.request.post('/api/test/seed/project', {
      data: projectData
    });
    
    // Vérifier que le projet est créé (via navigation vers planification)
    await page.goto('/workflow/planification');
    await waitForPageLoad(page);
    
    // Le projet devrait être visible dans planification
    const projectCard = page.locator(`[data-testid="card-project-${projectData.id}"]`);
    
    await expect(projectCard).toBeVisible({ timeout: 10000 });
    console.log('✅ Projet visible dans planification');
    
    // ==========================================
    // Phase 6: Planification du projet
    // ==========================================
    console.log('Phase 6: Gestion de la planification');
    
    // Vérifier les détails du projet
    const projectReference = projectCard.locator(`[data-testid="project-reference-${projectData.id}"]`);
    await expect(projectReference).toContainText(testProjectReference);
    
    // Vérifier les indicateurs de planification
    const tasksIndicator = projectCard.locator(`[data-testid="indicator-tasks-${projectData.id}"]`);
    await expect(tasksIndicator).toBeVisible();
    
    // Marquer le planning comme complet via API
    console.log('Complétion du planning via API...');
    await page.request.patch(`/api/projects/${projectData.id}`, {
      data: {
        tasksCreated: true,
        teamsAssigned: true,
        datesValidated: true,
        suppliesOrdered: true,
        readyToStart: true
      }
    });
    
    // Recharger la page pour voir les changements
    await page.reload();
    await waitForPageLoad(page);
    
    // Vérifier que les indicateurs sont maintenant verts
    const updatedProjectCard = page.locator(`[data-testid="card-project-${projectData.id}"]`);
    await expect(updatedProjectCard).toBeVisible();
    
    console.log('✅ Planning complété');
    
    // ==========================================
    // Phase 7: Démarrage du chantier
    // ==========================================
    console.log('Phase 7: Transition vers chantier');
    
    // Cliquer sur "Démarrer chantier" 
    const startChantierBtn = updatedProjectCard.locator(`[data-testid="button-start-chantier-${projectData.id}"]`);
    
    // Le bouton devrait être visible maintenant que le planning est complet
    await expect(startChantierBtn).toBeVisible({ timeout: 5000 });
    
    console.log('Démarrage du chantier...');
    await startChantierBtn.click();
    await page.waitForTimeout(1000);
    
    // Vérifier le toast de succès
    const successToast = page.locator('text=/Chantier démarré|phase chantier/i').first();
    await expect(successToast).toBeVisible({ timeout: 5000 });
    
    console.log('✅ Chantier démarré avec succès');
    
    // ==========================================
    // Phase 8: Vérification dans workflow chantier
    // ==========================================
    console.log('Phase 8: Vérification chantier');
    
    await page.goto('/workflow/chantier');
    await waitForPageLoad(page);
    
    // Le projet devrait maintenant être visible dans la page chantier
    const chantierCard = page.locator(`[data-testid="card-chantier-${projectData.id}"]`);
    await expect(chantierCard).toBeVisible({ timeout: 10000 });
    
    console.log('✅ Projet visible dans workflow chantier');
    
    // Vérifier les éléments du chantier
    const chantierReference = chantierCard.locator(`[data-testid="chantier-reference-${projectData.id}"]`);
    await expect(chantierReference).toContainText(testProjectReference);
    
    const chantierClient = chantierCard.locator(`[data-testid="chantier-client-${projectData.id}"]`);
    await expect(chantierClient).toBeVisible();
    
    // Vérifier le badge de status
    const statusBadge = chantierCard.locator(`[data-testid="status-badge-${projectData.id}"]`);
    await expect(statusBadge).toBeVisible();
    
    // Vérifier la barre de progression
    const progressBar = chantierCard.locator(`[data-testid="progress-bar-${projectData.id}"]`);
    await expect(progressBar).toBeVisible();
    
    const progressPercentage = chantierCard.locator(`[data-testid="progress-percentage-${projectData.id}"]`);
    await expect(progressPercentage).toBeVisible();
    
    // Vérifier les indicateurs de qualité
    const teamsIndicator = chantierCard.locator(`[data-testid="indicator-teams-present-${projectData.id}"]`);
    await expect(teamsIndicator).toBeVisible();
    
    const photosIndicator = chantierCard.locator(`[data-testid="indicator-photos-${projectData.id}"]`);
    await expect(photosIndicator).toBeVisible();
    
    const reportIndicator = chantierCard.locator(`[data-testid="indicator-report-${projectData.id}"]`);
    await expect(reportIndicator).toBeVisible();
    
    console.log('✅ Tous les indicateurs de chantier sont visibles');
    
    // Vérifier les statistiques du dashboard chantier
    const statsActifs = page.locator('[data-testid="stat-chantiers-actifs"]');
    await expect(statsActifs).toBeVisible();
    
    const statsValue = page.locator('[data-testid="stat-actifs-value"]');
    await expect(statsValue).toContainText(/[1-9]/); // Au moins 1 chantier actif
    
    console.log('✅ Statistiques chantier mises à jour');
    
    // ==========================================
    // Phase 9: Actions chantier (optionnel)
    // ==========================================
    console.log('Phase 9: Test des actions chantier');
    
    // Vérifier que les boutons d'action sont présents
    const photosBtn = chantierCard.locator(`[data-testid="button-photos-${projectData.id}"]`);
    await expect(photosBtn).toBeVisible();
    
    const progressReportBtn = chantierCard.locator(`[data-testid="button-progress-report-${projectData.id}"]`);
    await expect(progressReportBtn).toBeVisible();
    
    const pauseBtn = chantierCard.locator(`[data-testid="button-pause-${projectData.id}"]`);
    await expect(pauseBtn).toBeVisible();
    
    console.log('✅ Boutons d\'action chantier présents');
    
    // ==========================================
    // Fin du test
    // ==========================================
    console.log('✅✅✅ Journey E2E complet terminé avec succès: AO → Offer → Chiffrage → Validation → Project → Planning → Chantier ✅✅✅');
  });

  test('should verify navigation flow between workflow pages', async ({ page }) => {
    console.log('Test: Vérification du flux de navigation');
    
    // Seed un projet en planification
    await page.request.post('/api/test/seed/project', {
      data: {
        ...e2eSeeds.projects[0],
        id: 'e2e-nav-test-001',
        reference: 'PROJ-NAV-TEST-001',
        status: 'planification',
        tasksCreated: true,
        teamsAssigned: true,
        datesValidated: true,
        readyToStart: true
      }
    });
    
    // 1. Vérifier planification
    await page.goto('/workflow/planification');
    await waitForPageLoad(page);
    
    const planifCard = page.locator('[data-testid="card-project-e2e-nav-test-001"]');
    await expect(planifCard).toBeVisible({ timeout: 10000 });
    console.log('✅ Projet visible dans planification');
    
    // 2. Démarrer chantier
    const startBtn = planifCard.locator('[data-testid="button-start-chantier-e2e-nav-test-001"]');
    await expect(startBtn).toBeVisible();
    await startBtn.click();
    await page.waitForTimeout(1000);
    
    // 3. Vérifier dans chantier
    await page.goto('/workflow/chantier');
    await waitForPageLoad(page);
    
    const chantierCard = page.locator('[data-testid="card-chantier-e2e-nav-test-001"]');
    await expect(chantierCard).toBeVisible({ timeout: 10000 });
    console.log('✅ Navigation planification → chantier réussie');
    
    // Cleanup
    await page.request.delete('/api/test/seed/project/e2e-nav-test-001');
  });

  test('should handle offer workflow from chiffrage to validation', async ({ page }) => {
    console.log('Test: Workflow Offer - Chiffrage → Validation');
    
    // Créer une offre de test
    const testOfferId = 'e2e-offer-workflow-001';
    await page.request.post('/api/test/seed/offer', {
      data: {
        id: testOfferId,
        reference: 'OFF-WORKFLOW-TEST-001',
        titre: 'Offre Workflow Test',
        montantEstime: 25000,
        status: 'en_attente_fournisseurs',
        menuiserieType: 'fenetre',
        client: 'Client Workflow Test',
        location: 'Paris'
      }
    });
    
    // 1. Vérifier dans chiffrage-list
    await page.goto('/offers/chiffrage-list');
    await waitForPageLoad(page);
    
    const offerCard = page.locator(`[data-testid="card-offer-${testOfferId}"]`);
    await expect(offerCard).toBeVisible({ timeout: 10000 });
    console.log('✅ Offre visible dans chiffrage-list');
    
    // 2. Changer le status pour validation
    await page.request.patch(`/api/offers/${testOfferId}`, {
      data: {
        status: 'en_attente_validation',
        finalAmount: 25000
      }
    });
    
    // 3. Vérifier dans validation-list
    await page.goto('/offers/validation-list');
    await waitForPageLoad(page);
    
    const validationCard = page.locator(`[data-testid="card-offer-${testOfferId}"]`);
    await expect(validationCard).toBeVisible({ timeout: 10000 });
    console.log('✅ Offre visible dans validation-list');
    
    // 4. Valider l'offre
    const validateBtn = validationCard.locator(`[data-testid="button-validate-${testOfferId}"]`);
    await expect(validateBtn).toBeVisible();
    await validateBtn.click();
    await page.waitForTimeout(1000);
    
    const validatedBadge = page.locator('text=/Validée|fin d\'études validée/i').first();
    await expect(validatedBadge).toBeVisible({ timeout: 5000 });
    console.log('✅ Workflow offer complet: chiffrage → validation réussi');
    
    // Cleanup
    await page.request.delete(`/api/test/seed/offer/${testOfferId}`);
  });
});
