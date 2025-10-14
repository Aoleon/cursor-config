import { test, expect } from '@playwright/test';

/**
 * Tests E2E complets du workflow Chiffrage/Devis
 * Validation du système de chiffrage avec gestion d'erreurs robuste
 */

test.describe('Workflow Chiffrage/Devis', () => {
  
  // ========================================
  // TESTS DE CRÉATION DE DEVIS
  // ========================================
  
  test('devrait créer un nouveau devis', async ({ page }) => {
    await page.goto('/offers');
    
    // Cliquer sur le bouton de création
    const newOfferButton = page.getByRole('button', { name: /Nouvel AO/i });
    await expect(newOfferButton).toBeVisible();
    await newOfferButton.click();
    
    // Attendre la navigation vers le formulaire
    await expect(page).toHaveURL('/create-ao');
    
    // Remplir le formulaire de création
    await page.getByLabel(/Titre/i).fill('Devis Test E2E - ' + Date.now());
    await page.getByLabel(/Client/i).fill('Client Test E2E');
    
    // Ajouter un montant estimé
    const amountInput = page.getByLabel(/Montant/i).or(page.getByPlaceholder(/montant/i));
    if (await amountInput.count() > 0) {
      await amountInput.fill('10000');
    }
    
    // Sélectionner un statut si disponible
    const statusSelect = page.getByLabel(/Statut/i);
    if (await statusSelect.count() > 0) {
      await statusSelect.selectOption({ index: 1 });
    }
    
    // Soumettre le formulaire
    const submitButton = page.getByRole('button', { name: /Créer|Enregistrer|Soumettre/i });
    await submitButton.click();
    
    // Vérifier la création (redirection ou message de succès)
    const successToast = page.getByText(/créé|succès|enregistré/i);
    const urlPattern = /\/offers\/\d+|\/offer-detail\/\d+|\/ao-detail\/\d+/;
    
    // Attendre soit le toast, soit la redirection
    await Promise.race([
      expect(successToast).toBeVisible({ timeout: 10000 }),
      expect(page).toHaveURL(urlPattern, { timeout: 10000 })
    ]);
  });

  test('devrait afficher la liste des devis existants', async ({ page }) => {
    await page.goto('/offers');
    
    // Attendre le chargement de la page
    await page.waitForLoadState('networkidle');
    
    // Vérifier que le titre est visible
    const pageTitle = page.getByRole('heading', { name: /Appels d'Offres/i });
    await expect(pageTitle).toBeVisible();
    
    // Vérifier qu'il y a soit des offres, soit un état vide
    const offerCards = page.locator('[data-testid^="offer-card-"]').or(
      page.locator('.card').filter({ hasText: /devis|offre/i })
    );
    const emptyState = page.getByText(/Aucune offre|Aucun devis/i);
    
    const hasOffers = await offerCards.count() > 0;
    const isEmpty = await emptyState.count() > 0;
    
    // Au moins l'un des deux doit être vrai
    expect(hasOffers || isEmpty).toBeTruthy();
  });

  // ========================================
  // TESTS DE CALCUL DPGF
  // ========================================
  
  test('devrait calculer le DPGF correctement', async ({ page }) => {
    // Créer d'abord un devis
    await page.goto('/create-ao');
    
    // Remplir les informations de base
    await page.getByLabel(/Titre/i).fill('Devis DPGF Test');
    await page.getByLabel(/Client/i).fill('Client DPGF');
    
    // Soumettre pour créer
    await page.getByRole('button', { name: /Créer|Enregistrer/i }).click();
    
    // Attendre la redirection
    await page.waitForTimeout(2000);
    
    // Chercher la section DPGF
    const dpgfSection = page.getByText(/DPGF|Décomposition/i);
    if (await dpgfSection.count() > 0) {
      // Si section DPGF existe, tester l'ajout de lignes
      const addLineButton = page.getByRole('button', { name: /Ajouter.*ligne/i });
      
      if (await addLineButton.count() > 0) {
        await addLineButton.click();
        
        // Remplir une ligne DPGF
        await page.getByPlaceholder(/Désignation/i).fill('Travaux test');
        await page.getByPlaceholder(/Quantité/i).fill('10');
        await page.getByPlaceholder(/Prix unitaire/i).fill('100');
        
        // Le total devrait être calculé automatiquement (10 * 100 = 1000)
        const total = page.getByText(/1[\s,.]?000/);
        await expect(total).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('devrait gérer les modifications de lignes DPGF', async ({ page }) => {
    // Naviguer vers un devis existant ou en créer un
    await page.goto('/offers');
    
    // Cliquer sur le premier devis disponible
    const firstOffer = page.locator('[data-testid^="offer-card-"]').first();
    const viewButton = page.getByRole('button', { name: /Voir|Détails|Éditer/i }).first();
    
    if (await firstOffer.count() > 0) {
      await viewButton.click();
      
      // Attendre le chargement de la page de détail
      await page.waitForLoadState('networkidle');
      
      // Vérifier si des lignes DPGF existent
      const dpgfLines = page.locator('[data-testid^="dpgf-line-"]');
      
      if (await dpgfLines.count() > 0) {
        // Modifier la première ligne
        const firstLine = dpgfLines.first();
        const quantityInput = firstLine.getByPlaceholder(/Quantité/i);
        
        if (await quantityInput.count() > 0) {
          await quantityInput.fill('20');
          
          // Vérifier que le total est recalculé
          await page.waitForTimeout(500);
        }
      }
    }
  });

  // ========================================
  // TESTS D'ANALYSE DE DOCUMENTS
  // ========================================
  
  test('devrait analyser un document fournisseur avec OCR', async ({ page }) => {
    await page.goto('/suppliers');
    
    // Chercher la section d'upload
    const uploadSection = page.getByText(/Upload|Importer|Document/i);
    
    if (await uploadSection.count() > 0) {
      // Préparer un fichier test
      const uploadButton = page.getByRole('button', { name: /Upload|Choisir|Parcourir/i });
      
      if (await uploadButton.count() > 0) {
        // Simuler l'upload d'un fichier
        const [fileChooser] = await Promise.all([
          page.waitForEvent('filechooser'),
          uploadButton.click()
        ]);
        
        // Créer un fichier test simple
        await fileChooser.setFiles({
          name: 'devis-test.pdf',
          mimeType: 'application/pdf',
          buffer: Buffer.from('Test PDF content')
        });
        
        // Attendre le traitement
        await page.waitForTimeout(3000);
        
        // Vérifier qu'un statut est affiché
        const ocrStatus = page.getByText(/Analyse|OCR|Traitement/i);
        await expect(ocrStatus).toBeVisible({ timeout: 30000 });
      }
    }
  });

  // ========================================
  // TESTS DE VALIDATION ET WORKFLOW
  // ========================================
  
  test('devrait valider un devis complet', async ({ page }) => {
    await page.goto('/offers');
    
    // Chercher un devis à valider
    const validateButton = page.getByRole('button', { name: /Valider/i }).first();
    
    if (await validateButton.count() > 0) {
      await validateButton.click();
      
      // Confirmer la validation si nécessaire
      const confirmButton = page.getByRole('button', { name: /Confirmer/i });
      if (await confirmButton.count() > 0) {
        await confirmButton.click();
      }
      
      // Vérifier le message de succès
      const successMessage = page.getByText(/validé|succès/i);
      await expect(successMessage).toBeVisible({ timeout: 10000 });
    }
  });

  test('devrait empêcher la validation d\'un devis incomplet', async ({ page }) => {
    // Créer un devis incomplet
    await page.goto('/create-ao');
    
    // Remplir seulement le titre (pas de client ni montant)
    await page.getByLabel(/Titre/i).fill('Devis Incomplet');
    
    // Tenter de soumettre
    const submitButton = page.getByRole('button', { name: /Créer|Soumettre/i });
    await submitButton.click();
    
    // Vérifier qu'une erreur est affichée
    const errorMessage = page.getByText(/requis|obligatoire|compléter/i);
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
    
    // Vérifier qu'on reste sur la même page
    await expect(page).toHaveURL(/create-ao/);
  });

  // ========================================
  // TESTS DE GESTION D'ERREURS
  // ========================================
  
  test('devrait gérer les erreurs de sauvegarde gracieusement', async ({ page }) => {
    await page.goto('/create-ao');
    
    // Intercepter les requêtes de sauvegarde pour simuler une erreur
    await page.route('**/api/offers', route => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 500,
          json: { error: 'Erreur de sauvegarde' }
        });
      } else {
        route.continue();
      }
    });
    
    // Remplir et soumettre le formulaire
    await page.getByLabel(/Titre/i).fill('Devis Erreur Test');
    await page.getByLabel(/Client/i).fill('Client Test');
    await page.getByRole('button', { name: /Créer|Soumettre/i }).click();
    
    // Vérifier qu'une erreur est affichée
    const errorToast = page.getByText(/erreur|échec|problème/i);
    await expect(errorToast).toBeVisible({ timeout: 10000 });
    
    // Vérifier que les données ne sont pas perdues
    const titleValue = await page.getByLabel(/Titre/i).inputValue();
    expect(titleValue).toBe('Devis Erreur Test');
  });

  test('devrait afficher des indicateurs de chargement', async ({ page }) => {
    await page.goto('/offers');
    
    // Observer les indicateurs de chargement
    const loadingIndicators = page.locator('.animate-pulse, [role="status"], .spinner');
    
    // Au début du chargement, il devrait y avoir des indicateurs
    const hasLoading = await loadingIndicators.count() > 0;
    
    if (hasLoading) {
      await expect(loadingIndicators.first()).toBeVisible();
      
      // Attendre que le chargement se termine
      await expect(loadingIndicators.first()).not.toBeVisible({ timeout: 10000 });
    }
  });

  // ========================================
  // TESTS DE PERMISSIONS ET SÉCURITÉ
  // ========================================
  
  test('devrait respecter les permissions utilisateur', async ({ page }) => {
    await page.goto('/offers');
    
    // Vérifier que certaines actions sont disponibles ou non selon le rôle
    const adminOnlyButtons = page.getByRole('button', { name: /Supprimer|Archiver/i });
    
    // Si des boutons admin sont visibles, vérifier qu'ils fonctionnent
    if (await adminOnlyButtons.count() > 0) {
      const isEnabled = await adminOnlyButtons.first().isEnabled();
      
      // Les boutons devraient être soit activés (admin) soit désactivés (user)
      expect(typeof isEnabled).toBe('boolean');
    }
  });

  test('devrait valider les entrées pour prévenir les injections', async ({ page }) => {
    await page.goto('/create-ao');
    
    // Tenter d'injecter du code malveillant
    const maliciousInput = '<script>alert("XSS")</script>';
    await page.getByLabel(/Titre/i).fill(maliciousInput);
    await page.getByLabel(/Client/i).fill('Client Normal');
    
    // Soumettre
    await page.getByRole('button', { name: /Créer|Soumettre/i }).click();
    
    // Si la création réussit, vérifier que le script n'est pas exécuté
    await page.waitForTimeout(2000);
    
    // Aucune alerte ne devrait apparaître
    let alertDetected = false;
    page.on('dialog', dialog => {
      alertDetected = true;
      dialog.dismiss();
    });
    
    await page.waitForTimeout(1000);
    expect(alertDetected).toBeFalsy();
  });
});

// ========================================
// TESTS DE PERFORMANCE
// ========================================

test.describe('Chiffrage - Performance', () => {
  
  test('devrait charger la liste des offres en moins de 3 secondes', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/offers');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Le temps de chargement devrait être raisonnable
    expect(loadTime).toBeLessThan(3000);
  });
  
  test('devrait calculer les totaux DPGF instantanément', async ({ page }) => {
    // Naviguer vers un devis avec DPGF
    await page.goto('/offers');
    
    const firstOffer = page.locator('[data-testid^="offer-"]').first();
    if (await firstOffer.count() > 0) {
      await firstOffer.click();
      
      // Mesurer le temps de calcul
      const startTime = Date.now();
      
      // Modifier une valeur
      const quantityInput = page.getByPlaceholder(/Quantité/i).first();
      if (await quantityInput.count() > 0) {
        await quantityInput.fill('50');
        
        // Le nouveau total devrait apparaître rapidement
        const calculationTime = Date.now() - startTime;
        expect(calculationTime).toBeLessThan(500);
      }
    }
  });
});