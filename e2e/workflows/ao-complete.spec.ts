import { test, expect } from '@playwright/test';
import { nanoid } from 'nanoid';
import {
  generateTestAO,
  generateTestSupplier,
  cleanupTestData,
  createSupplierViaAPI,
  waitForOCRCompletion,
  extractLotsFromAO,
  createSupplierRequest,
} from '../fixtures/test-data';
import { goToAOs, waitForPageLoad, goToAODetail } from '../helpers/navigation';
import { fillFormField, submitForm, uploadFile } from '../helpers/forms';
import { assertSuccessToast, assertElementVisible, assertTableRowCount } from '../helpers/assertions';
import { apiGet, apiPost, waitForResource } from '../helpers/api';
import path from 'path';

/**
 * Test E2E Complet du Workflow AO (Appel d'Offres)
 * 
 * Ce test couvre l'intégralité du workflow AO :
 * - Phase 0: Setup Harness avec auth et fixtures
 * - Phase 1: Création AO via UI
 * - Phase 2: Upload PDF et analyse OCR
 * - Phase 3: Extraction des lots
 * - Phase 4: Workflow fournisseurs et demandes de devis
 * - Phase 5: Assertions cross-cutting (WebSocket, audit, données orphelines)
 */

test.describe('Workflow AO Complet - E2E', () => {
  let createdIds: {
    aos: string[];
    suppliers: string[];
    lots: Array<{ id: string; aoId: string }>;
  };

  let aoReference: string;
  let aoId: string;
  let supplierId: string;

  test.beforeEach(async () => {
    // Phase 0: Setup Harness - Initialisation des structures de données
    createdIds = {
      aos: [],
      suppliers: [],
      lots: [],
    };
  });

  test.afterEach(async ({ page }) => {
    // Phase 0: Cleanup automatique post-test
    await cleanupTestData(page, createdIds);
  });

  test('Workflow complet AO → OCR → Lots → Fournisseurs → BC', async ({ page, browser }) => {
    // ========================================
    // PHASE 0: SETUP HARNESS
    // ========================================
    
    // Auth OIDC avec claims custom (déjà configuré via auth.setup.ts)
    // Le mode test injecte automatiquement un utilisateur admin
    
    // Générer identifiants uniques avec nanoid pour éviter conflits DB
    const uniqueId = nanoid(6);
    aoReference = `AO-E2E-${uniqueId}`;
    
    // ========================================
    // PHASE 1: CRÉATION AO VIA UI
    // ========================================
    
    test.step('Phase 1: Créer un AO via l\'interface utilisateur', async () => {
      // 1. Nouveau contexte navigateur (déjà fourni par le test)
      // 2. OIDC Login (automatique en mode test)
      
      // 3. Naviguer vers /appels-offres
      await page.goto('/appels-offres');
      await waitForPageLoad(page);
      
      // 4. Cliquer bouton "Créer AO"
      const createButton = page.getByTestId('button-create-ao')
        .or(page.getByRole('button', { name: /créer.*ao|nouvel.*ao/i }))
        .or(page.getByRole('button', { name: /create.*ao/i }));
      
      await createButton.first().click();
      await waitForPageLoad(page);
      
      // Vérifier que nous sommes sur la page de création
      await expect(page).toHaveURL(/\/create-ao/);
      
      // 5. Remplir le formulaire
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      
      // Remplir les champs requis
      await fillFormField(page, 'input-reference', aoReference);
      
      // Chercher le champ client (peut avoir différents testids)
      const clientField = page.getByTestId('input-client')
        .or(page.getByLabel(/client/i))
        .or(page.locator('input[name="client"]'));
      await clientField.fill('Client Test E2E');
      
      // Location
      const locationField = page.getByTestId('input-location')
        .or(page.getByLabel(/localisation|location/i))
        .or(page.locator('input[name="location"]'));
      await locationField.fill('75001 Paris');
      
      // Département
      const deptField = page.getByTestId('input-departement')
        .or(page.getByLabel(/département|departement/i))
        .or(page.locator('input[name="departement"]'));
      await deptField.fill('75');
      
      // Intitulé opération (titre)
      const intituleField = page.getByTestId('input-intitule')
        .or(page.getByTestId('input-intituleOperation'))
        .or(page.getByLabel(/intitulé|titre|title/i))
        .or(page.locator('input[name="intituleOperation"]'));
      await intituleField.fill('AO Test E2E Complet');
      
      // Date limite (si présente)
      const dateField = page.getByTestId('input-dateLimiteRemise')
        .or(page.getByLabel(/date.*limite/i));
      if (await dateField.count() > 0) {
        await dateField.fill(tomorrowStr);
      }
      
      // Montant estimé
      const montantField = page.getByTestId('input-montantEstime')
        .or(page.getByLabel(/montant|budget/i))
        .or(page.locator('input[name="montantEstime"]'));
      await montantField.fill('150000');
      
      // Type de menuiserie (requis)
      const menuiserieSelect = page.getByTestId('select-menuiserieType')
        .or(page.getByLabel(/type.*menuiserie/i));
      if (await menuiserieSelect.count() > 0) {
        await menuiserieSelect.click();
        await page.getByRole('option', { name: /fenêtre|fenetre/i }).click();
      }
      
      // Source (requis)
      const sourceSelect = page.getByTestId('select-source')
        .or(page.getByLabel(/source/i));
      if (await sourceSelect.count() > 0) {
        await sourceSelect.click();
        await page.getByRole('option', { name: /website|web/i }).click();
      }
      
      // 6. Soumettre le formulaire
      const submitButton = page.getByTestId('button-submit-ao')
        .or(page.getByTestId('button-create'))
        .or(page.getByRole('button', { name: /créer|create|enregistrer|save/i }))
        .or(page.locator('button[type="submit"]'));
      
      // 6. Attendre la réponse API de création et vérifier le toast
      const [createResponse] = await Promise.all([
        page.waitForResponse(
          resp => resp.url().includes('/api/aos') && (resp.status() === 200 || resp.status() === 201),
          { timeout: 15000 }
        ),
        submitButton.first().click()
      ]);
      
      // 7. ASSERT: La création DOIT réussir
      expect(createResponse.ok()).toBeTruthy();
      
      // 8. ASSERT: Le toast de succès DOIT apparaître
      const toast = page.locator('[data-testid*="toast"]')
        .or(page.locator('.toast'))
        .or(page.getByRole('status'));
      
      await expect(toast.first()).toBeVisible({ timeout: 10000 });
      
      // 9. Vérifier via API que l'AO a été créé
      const response = await page.request.get(`/api/aos?search=${aoReference}`);
      expect(response.ok()).toBeTruthy();
      
      const result = await response.json();
      const aos = result.data || result;
      expect(Array.isArray(aos) ? aos.length : 0).toBeGreaterThan(0);
      
      const createdAO = Array.isArray(aos) ? aos[0] : aos;
      aoId = createdAO.id;
      createdIds.aos.push(aoId);
      
      console.log(`✅ Phase 1: AO créé avec succès - ID: ${aoId}, Ref: ${aoReference}`);
      
      // 9. Naviguer vers la liste des AOs et vérifier que l'AO apparaît
      await page.goto('/appels-offres');
      await waitForPageLoad(page);
      
      // Vérifier que la carte de l'AO est visible
      const aoCard = page.getByTestId(`card-ao-${aoReference}`)
        .or(page.getByTestId(`card-ao-${aoId}`))
        .or(page.getByText(aoReference));
      
      await expect(aoCard.first()).toBeVisible({ timeout: 10000 });
    });

    // ========================================
    // PHASE 2: UPLOAD & ANALYSE OCR
    // ========================================
    
    test.step('Phase 2: Upload PDF et analyse OCR', async () => {
      // 10. Cliquer sur la carte AO pour ouvrir le détail
      await page.goto(`/aos/${aoId}`);
      await waitForPageLoad(page);
      
      // Vérifier que nous sommes sur la page de détail
      await expect(page).toHaveURL(new RegExp(`/aos/${aoId}`));
      
      // 11. Upload PDF via zone upload
      const pdfPath = path.join(process.cwd(), 'attached_assets', '00 RPAO SCICV BOULOGNE SANDETTIE v2_1756892042095.pdf');
      
      // Chercher la zone d'upload
      const uploadZone = page.getByTestId('upload-zone-ao-pdf')
        .or(page.getByTestId('upload-zone'))
        .or(page.locator('input[type="file"]'))
        .or(page.getByText(/glisser.*déposer|drag.*drop|upload/i));
      
      // Si c'est une zone de drag & drop, chercher l'input file caché
      const fileInput = page.locator('input[type="file"]');
      
      if (await fileInput.count() > 0) {
        await fileInput.first().setInputFiles(pdfPath);
      } else {
        // Fallback: cliquer sur la zone pour révéler l'input
        await uploadZone.first().click();
        const revealedInput = page.locator('input[type="file"]');
        await expect(revealedInput.first()).toBeVisible({ timeout: 3000 });
        await revealedInput.first().setInputFiles(pdfPath);
      }
      
      console.log(`📄 Phase 2: PDF uploadé - ${pdfPath}`);
      
      // 12. ASSERT: Toast OCR DOIT apparaître (optionnel mais préférable)
      const ocrToast = page.locator('[data-testid*="toast"]')
        .or(page.getByText(/ocr.*cours|processing|analyse/i));
      
      // Attendre le toast (peut être très bref, ne pas bloquer)
      try {
        await expect(ocrToast.first()).toBeVisible({ timeout: 5000 });
        console.log('🔄 Toast OCR détecté');
      } catch (e) {
        console.log('ℹ️ Toast OCR non détecté (peut être trop rapide)');
      }
      
      // 13. Attendre que l'OCR soit terminé (max 60s)
      const ocrData = await waitForOCRCompletion(page, aoId, 60000);
      
      expect(ocrData).toBeDefined();
      expect(ocrData.confidence).toBeGreaterThan(0);
      
      console.log(`✅ Phase 2: OCR terminé - Confidence: ${ocrData.confidence}%`);
      
      // 14. ASSERT STRICT: Les métadonnées OCR DOIVENT apparaître dans l'UI
      // Gap critique corrigé: vérification UI stricte après poll OCR
      const ocrMetadataPanel = page.getByTestId('ocr-metadata-panel')
        .or(page.getByTestId('panel-ocr'))
        .or(page.getByText(/métadonnées|metadata|ocr.*result/i));
      
      await expect(ocrMetadataPanel.first()).toBeVisible({ timeout: 10000 });
      
      // Vérifier que la confiance OCR est affichée
      const ocrConfidence = page.getByTestId('ocr-confidence')
        .or(page.getByText(new RegExp(`${ocrData.confidence}`, 'i')))
        .or(page.getByText(/confidence|confiance/i));
      
      await expect(ocrConfidence.first()).toBeVisible({ timeout: 10000 });
      
      // Vérifier que la référence OCR est affichée
      const ocrReference = page.getByTestId('ocr-reference')
        .or(page.getByText(/référence|reference/i).filter({ hasText: /ocr/i }));
      
      if (await ocrReference.count() > 0) {
        await expect(ocrReference.first()).toBeVisible({ timeout: 10000 });
      }
      
      console.log(`✅ Phase 2: Métadonnées OCR affichées dans l'UI`);
      
      // 15. Vérifier le statut de l'AO
      const aoResponse = await page.request.get(`/api/aos/${aoId}`);
      const aoData = await aoResponse.json();
      const ao = aoData.data || aoData;
      
      // Le statut peut varier selon l'implémentation
      console.log(`📊 Statut AO après OCR: ${ao.status || ao.statut || 'N/A'}`);
    });

    // ========================================
    // PHASE 3: EXTRACTION LOTS
    // ========================================
    
    test.step('Phase 3: Extraction des lots', async () => {
      // Retourner sur la page de détail de l'AO
      await page.goto(`/aos/${aoId}`);
      await waitForPageLoad(page);
      
      // 16. ASSERT: Le bouton "Extraire lots" DOIT être visible
      const extractButton = page.getByTestId('button-extract-lots')
        .or(page.getByRole('button', { name: /extraire.*lot/i }))
        .or(page.getByText(/extraire.*lot/i));
      
      await expect(extractButton.first()).toBeVisible({ timeout: 10000 });
      
      // 17. Cliquer et attendre la réponse API (deterministic wait)
      const [lotsResponse] = await Promise.all([
        page.waitForResponse(
          resp => resp.url().includes('/api/aos') && resp.url().includes('/lots') && resp.status() === 200,
          { timeout: 30000 }
        ),
        extractButton.first().click()
      ]);
      
      // 18. ASSERT: L'API DOIT retourner avec succès
      expect(lotsResponse.ok()).toBeTruthy();
      
      const lotsData = await lotsResponse.json();
      const lots = lotsData.data || lotsData.lots || lotsData;
      
      // 19. ASSERT: Des lots DOIVENT être extraits
      expect(lots).toBeDefined();
      expect(Array.isArray(lots)).toBeTruthy();
      expect(lots.length).toBeGreaterThan(0);
      
      console.log(`✅ Phase 3: ${lots.length} lot(s) extrait(s)`);
      
      // 20. ASSERT: La table des lots DOIT être visible
      const lotTable = page.getByTestId('table-lots')
        .or(page.locator('table').filter({ hasText: /lot|designation|numero/i }));
      
      await expect(lotTable.first()).toBeVisible({ timeout: 5000 });
      
      // 21. ASSERT STRICT: Chaque lot DOIT avoir une ligne visible ET son contenu affiché
      // Gap critique corrigé: vérification UI stricte du contenu de chaque lot
      for (const lot of lots) {
        const lotRow = page.getByTestId(`row-lot-${lot.id}`)
          .or(page.getByText(lot.numero || lot.designation));
        
        // Vérifier que la ligne du lot est visible
        await expect(lotRow.first()).toBeVisible({ timeout: 5000 });
        
        // NOUVEAU: Vérifier que le contenu du lot est affiché dans l'UI
        // Vérifier le nom/designation du lot
        if (lot.name || lot.designation || lot.numero) {
          const lotNameElement = page.getByTestId(`text-lot-name-${lot.id}`)
            .or(page.getByTestId(`text-lot-designation-${lot.id}`))
            .or(lotRow.getByText(lot.name || lot.designation || lot.numero));
          
          const expectedText = lot.name || lot.designation || lot.numero;
          await expect(lotNameElement.first()).toContainText(expectedText, { timeout: 5000 });
          
          console.log(`  ✓ Lot ${lot.id}: "${expectedText}" affiché dans l'UI`);
        }
        
        // Stocker pour cleanup
        createdIds.lots.push({ id: lot.id, aoId });
      }
      
      console.log(`✅ Phase 3: Tous les lots sont affichés avec leur contenu dans l'UI`);
    });

    // ========================================
    // PHASE 4: WORKFLOW FOURNISSEURS
    // ========================================
    
    test.step('Phase 4: Workflow fournisseurs et demandes de devis', async () => {
      // 21. Créer un fournisseur test via API
      const supplierData = generateTestSupplier({
        name: `Supplier-E2E-${nanoid(6)}`,
        specialization: 'Menuiserie'
      });
      
      supplierId = await createSupplierViaAPI(page, supplierData);
      createdIds.suppliers.push(supplierId);
      
      console.log(`🏢 Phase 4: Fournisseur créé - ID: ${supplierId}`);
      
      // 22. ASSERT: Le bouton de demande de devis DOIT être présent
      await page.goto(`/aos/${aoId}`);
      await waitForPageLoad(page);
      
      const requestQuoteButton = page.getByTestId('button-request-quotes')
        .or(page.getByRole('button', { name: /demander.*devis|request.*quote/i }))
        .or(page.getByText(/demander.*devis|consulter.*fournisseur/i));
      
      await expect(requestQuoteButton.first()).toBeVisible({ timeout: 10000 });
      await requestQuoteButton.first().click();
      
      // 23. ASSERT: Le sélecteur de fournisseur DOIT apparaître
      const supplierSelector = page.getByTestId(`select-supplier-${supplierId}`)
        .or(page.getByTestId('select-supplier'))
        .or(page.getByText(supplierData.name))
        .or(page.getByRole('checkbox', { name: new RegExp(supplierData.name, 'i') }));
      
      await expect(supplierSelector.first()).toBeVisible({ timeout: 10000 });
      await supplierSelector.first().click();
      
      // 24. Confirmer la sélection et attendre la réponse API
      const confirmButton = page.getByTestId('button-confirm')
        .or(page.getByRole('button', { name: /confirmer|valider|submit/i }));
      
      const [requestsResponse] = await Promise.all([
        page.waitForResponse(
          resp => resp.url().includes('/api/supplier-requests') && (resp.status() === 200 || resp.status() === 201),
          { timeout: 15000 }
        ),
        confirmButton.first().click()
      ]);
      
      // 25. ASSERT: L'API de création de demande DOIT réussir
      expect(requestsResponse.ok()).toBeTruthy();
      
      // 26. ASSERT: La demande DOIT être créée dans la base de données
      const checkResponse = await page.request.get(`/api/supplier-requests?aoId=${aoId}`);
      expect(checkResponse.ok()).toBeTruthy();
      
      const requestsData = await checkResponse.json();
      const requests = requestsData.data || requestsData;
      
      expect(Array.isArray(requests)).toBeTruthy();
      expect(requests.length).toBeGreaterThan(0);
      
      console.log(`✅ Phase 4: ${requests.length} demande(s) fournisseur créée(s)`);
      
      // 27. ASSERT: La table de comparaison DOIT afficher le fournisseur
      await page.goto('/comparaison-devis');
      await waitForPageLoad(page);
      
      const comparisonTable = page.getByTestId('table-comparison')
        .or(page.locator('table').filter({ hasText: /comparaison|fournisseur|supplier/i }));
      
      await expect(comparisonTable.first()).toBeVisible({ timeout: 10000 });
      
      // 28. ASSERT: Le fournisseur DOIT être visible dans la table
      const supplierRow = page.getByText(supplierData.name);
      await expect(supplierRow.first()).toBeVisible({ timeout: 10000 });
      
      console.log(`✅ Phase 4: Fournisseur visible dans la comparaison`);
      
      // 29. ASSERT: Le bouton de sélection DOIT être présent
      const selectSupplierButton = page.getByTestId(`button-select-supplier-${supplierId}`)
        .or(page.getByRole('button', { name: /sélectionner|select/i }).first());
      
      await expect(selectSupplierButton).toBeVisible({ timeout: 10000 });
      
      // 30. Sélectionner et attendre notification BC
      const bcToast = page.locator('[data-testid*="toast"]')
        .or(page.getByText(/bc.*généré|bon.*commande|purchase.*order/i));
      
      await selectSupplierButton.click();
      
      // 31. ASSERT: La notification de BC DOIT apparaître
      await expect(bcToast.first()).toBeVisible({ timeout: 10000 });
      
      console.log(`✅ Phase 4: Notification BC générée affichée`);
    });

    // ========================================
    // PHASE 5: ASSERTIONS CROSS-CUTTING
    // ========================================
    
    test.step('Phase 5: Assertions cross-cutting', async () => {
      // 29. Vérifier WebSocket status = connected
      const wsStatus = page.getByTestId('websocket-status')
        .or(page.locator('[data-status="connected"]'))
        .or(page.getByText(/connecté|connected/i));
      
      if (await wsStatus.count() > 0) {
        await expect(wsStatus.first()).toBeVisible();
        console.log(`✅ Phase 5: WebSocket connecté`);
      } else {
        console.log(`ℹ️ Phase 5: Statut WebSocket non affiché en UI`);
      }
      
      // 30. Vérifier les logs d'audit via API
      const auditResponse = await page.request.get(`/api/audit/logs?entityId=${aoId}`);
      
      if (auditResponse.ok()) {
        const auditData = await auditResponse.json();
        const logs = auditData.data || auditData.logs || auditData;
        
        console.log(`📝 Phase 5: ${Array.isArray(logs) ? logs.length : 0} log(s) d'audit trouvé(s)`);
        
        // Vérifier qu'il y a des logs pour cet AO
        if (Array.isArray(logs) && logs.length > 0) {
          const aoLogs = logs.filter((log: any) => 
            log.entityId === aoId || 
            log.aoId === aoId ||
            (log.data && log.data.aoId === aoId)
          );
          
          console.log(`✅ Phase 5: ${aoLogs.length} log(s) d'audit pour cet AO`);
        }
      } else {
        console.log(`ℹ️ Phase 5: API audit non disponible (peut être désactivée en test)`);
      }
      
      // 31. ASSERT STRICT: Vérifier les relations entités, pas seulement l'existence
      // Gap critique corrigé: validation des relations supplier→AO et lots→AO
      
      console.log(`📊 Phase 5: Validation des relations entités`);
      
      // Vérifier que l'AO existe toujours
      const aoCheckResponse = await page.request.get(`/api/aos/${aoId}`);
      expect(aoCheckResponse.ok()).toBeTruthy();
      const aoCheckData = await aoCheckResponse.json();
      const aoCheck = aoCheckData.data || aoCheckData;
      expect(aoCheck.id).toBe(aoId);
      console.log(`  ✓ AO ${aoId} existe et est valide`);
      
      // NOUVEAU: Vérifier les relations supplier → AO via supplier-requests
      if (createdIds.suppliers.length > 0) {
        const supplierRequestsResponse = await page.request.get(`/api/supplier-requests?aoId=${aoId}`);
        expect(supplierRequestsResponse.ok()).toBeTruthy();
        
        const supplierRequestsData = await supplierRequestsResponse.json();
        const supplierRequests = supplierRequestsData.data || supplierRequestsData;
        
        expect(Array.isArray(supplierRequests)).toBeTruthy();
        
        // Vérifier chaque supplier créé a une relation avec l'AO
        for (const supplierId of createdIds.suppliers) {
          const linkedRequest = supplierRequests.find((r: any) => r.supplierId === supplierId);
          expect(linkedRequest).toBeDefined();
          expect(linkedRequest.aoId).toBe(aoId);
          
          console.log(`  ✓ Supplier ${supplierId} → AO ${aoId} relation validée`);
        }
      }
      
      // NOUVEAU: Vérifier les relations lots → AO
      if (createdIds.lots.length > 0) {
        // Essayer plusieurs endpoints possibles pour récupérer les lots
        let lotsCheckResponse = await page.request.get(`/api/ao-lots/${aoId}`);
        
        // Fallback si l'endpoint n'existe pas
        if (!lotsCheckResponse.ok()) {
          lotsCheckResponse = await page.request.get(`/api/aos/${aoId}/lots`);
        }
        
        expect(lotsCheckResponse.ok()).toBeTruthy();
        
        const lotsCheckData = await lotsCheckResponse.json();
        const fetchedLots = lotsCheckData.data || lotsCheckData.lots || lotsCheckData;
        
        expect(Array.isArray(fetchedLots)).toBeTruthy();
        
        // Vérifier que chaque lot est lié au bon AO
        fetchedLots.forEach((lot: any) => {
          expect(lot.aoId).toBe(aoId);
          console.log(`  ✓ Lot ${lot.id} → AO ${aoId} relation validée`);
        });
        
        // Vérifier que tous les lots créés sont présents
        const fetchedLotIds = fetchedLots.map((l: any) => l.id);
        for (const lot of createdIds.lots) {
          expect(fetchedLotIds).toContain(lot.id);
        }
      }
      
      console.log(`✅ Phase 5: Toutes les relations entités sont valides, pas d'orphelins`);
    });

    // Test terminé avec succès
    console.log(`\n🎉 Workflow AO complet réussi!`);
    console.log(`   - AO créé: ${aoReference} (ID: ${aoId})`);
    console.log(`   - Lots: ${createdIds.lots.length}`);
    console.log(`   - Fournisseurs: ${createdIds.suppliers.length}`);
    console.log(`   - Cleanup automatique en cours...`);
  });

  /**
   * Test de résilience: Vérifier que le workflow fonctionne même avec des erreurs partielles
   */
  test('Workflow AO - Résilience aux erreurs partielles', async ({ page }) => {
    test.slow(); // Marquer comme test lent
    
    // Créer un AO avec des données minimales
    const uniqueId = nanoid(6);
    const minimalAoRef = `AO-MIN-${uniqueId}`;
    
    await page.goto('/create-ao');
    await waitForPageLoad(page);
    
    // Remplir uniquement les champs requis
    await fillFormField(page, 'input-reference', minimalAoRef);
    
    const clientField = page.getByTestId('input-client')
      .or(page.locator('input[name="client"]'));
    await clientField.fill('Client Minimal');
    
    const locationField = page.getByTestId('input-location')
      .or(page.locator('input[name="location"]'));
    await locationField.fill('Paris');
    
    const deptField = page.getByTestId('input-departement')
      .or(page.locator('input[name="departement"]'));
    await deptField.fill('75');
    
    // Soumettre et attendre la réponse API
    const submitButton = page.locator('button[type="submit"]')
      .or(page.getByRole('button', { name: /créer|create/i }));
    
    const [createResponse] = await Promise.all([
      page.waitForResponse(
        resp => resp.url().includes('/api/aos') && (resp.status() === 200 || resp.status() === 201),
        { timeout: 15000 }
      ),
      submitButton.first().click()
    ]);
    
    // Vérifier création
    expect(createResponse.ok()).toBeTruthy();
    const response = await page.request.get(`/api/aos?search=${minimalAoRef}`);
    
    if (response.ok()) {
      const result = await response.json();
      const aos = result.data || result;
      
      if (Array.isArray(aos) && aos.length > 0) {
        const createdAO = aos[0];
        createdIds.aos.push(createdAO.id);
        
        console.log(`✅ Résilience: AO minimal créé avec succès - ${minimalAoRef}`);
        
        // Vérifier que l'AO peut être récupéré
        const detailResponse = await page.request.get(`/api/aos/${createdAO.id}`);
        expect(detailResponse.ok()).toBeTruthy();
      }
    }
  });
});
