import { test, expect } from '@playwright/test';
import { goToWorkflow, waitForPageLoad } from '../../helpers/navigation';
import { 
  assertNoLoadingState,
  assertModalOpen,
  assertModalClosed,
} from '../../helpers/assertions';
import { cleanupTestData, generateTestAO, createAOViaAPI } from '../../fixtures/e2e/test-data';

/**
 * Tests du workflow Envoi Devis - VERSION CORRIGÉE
 * 
 * ✅ Assertions strictes et inconditionnelles
 * ✅ Chaque test crée ses propres fixtures
 * ✅ Tests séparés pour état vide vs données
 * ✅ Fail-fast : échoue si élément attendu manquant
 * 
 * Ce workflow permet d'envoyer les devis aux clients, les relancer et les transformer en projets
 */

test.describe('Workflow Envoi Devis', () => {
  const createdIds: { aos?: string[] } = {};

  test.afterEach(async ({ page }) => {
    await cleanupTestData(page, createdIds);
  });

  // ===== NAVIGATION & CHARGEMENT =====

  test('devrait naviguer vers le workflow et afficher le titre', async ({ page }) => {
    await goToWorkflow(page, 'envoi-devis');
    
    // Vérifier le titre - DOIT être présent
    const title = page.getByRole('heading', { name: /envoi.*devis/i });
    await expect(title).toBeVisible();
    
    // Vérifier les breadcrumbs - DOIVENT être présents
    await expect(page.getByText('Tableau de bord')).toBeVisible();
    await expect(page.getByText('Envoi devis')).toBeVisible();
  });

  test('devrait charger la page sans erreurs console', async ({ page }) => {
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

  // ===== STATISTIQUES =====

  test('devrait afficher les 4 cartes de statistiques', async ({ page }) => {
    await goToWorkflow(page, 'envoi-devis');
    await waitForPageLoad(page);

    // Vérifier les 4 cartes de stats - DOIVENT être présentes
    await expect(page.getByTestId('stat-a-envoyer')).toBeVisible();
    await expect(page.getByTestId('stat-en-attente')).toBeVisible();
    await expect(page.getByTestId('stat-acceptes')).toBeVisible();
    await expect(page.getByTestId('stat-taux-conversion')).toBeVisible();

    // Vérifier les titres - DOIVENT contenir le texte attendu
    await expect(page.getByTestId('stat-a-envoyer')).toContainText('À envoyer');
    await expect(page.getByTestId('stat-en-attente')).toContainText('En attente');
    await expect(page.getByTestId('stat-acceptes')).toContainText('Acceptés');
    await expect(page.getByTestId('stat-taux-conversion')).toContainText('Taux conversion');
  });

  test('devrait afficher le taux de conversion à 42%', async ({ page }) => {
    await goToWorkflow(page, 'envoi-devis');
    await waitForPageLoad(page);

    const tauxCard = page.getByTestId('stat-taux-conversion');
    await expect(tauxCard).toContainText('42%');
  });

  // ===== ÉTATS D'AFFICHAGE =====

  test('devrait afficher un état vide si aucun devis prêt', async ({ page }) => {
    // NE PAS créer d'AO - tester vraiment l'état vide
    await goToWorkflow(page, 'envoi-devis');
    await waitForPageLoad(page);

    // L'état vide DOIT être présent
    const emptyState = page.getByTestId('empty-state');
    await expect(emptyState).toBeVisible();
    await expect(emptyState).toContainText(/aucun.*devis/i);
  });

  test('devrait afficher la liste des AOs avec devis prêts', async ({ page }) => {
    // Créer un AO avec status devis_pret
    const aoData = generateTestAO({
      status: 'devis_pret',
      montantTotal: 50000,
      devisSent: false
    });
    
    const aoId = await createAOViaAPI(page, aoData);
    createdIds.aos = [aoId];

    await goToWorkflow(page, 'envoi-devis');
    await waitForPageLoad(page);

    // L'AO DOIT être présent
    const aoCard = page.getByTestId(`card-ao-${aoId}`);
    await expect(aoCard).toBeVisible();
    
    // L'état vide NE DOIT PAS être présent
    const emptyState = page.getByTestId('empty-state');
    await expect(emptyState).not.toBeVisible();
  });

  // ===== AFFICHAGE DES AOs =====

  test('devrait afficher les informations d\'un AO correctement', async ({ page }) => {
    const aoData = generateTestAO({
      status: 'devis_pret',
      montantTotal: 75000,
      devisSent: false
    });
    
    const aoId = await createAOViaAPI(page, aoData);
    createdIds.aos = [aoId];

    await goToWorkflow(page, 'envoi-devis');
    await waitForPageLoad(page);

    // La carte AO DOIT être visible
    const aoCard = page.getByTestId(`card-ao-${aoId}`);
    await expect(aoCard).toBeVisible();
    
    // Vérifier référence - DOIT être présente
    const reference = page.getByTestId(`ao-reference-${aoId}`);
    await expect(reference).toBeVisible();
    await expect(reference).toContainText(aoData.reference);
    
    // Vérifier montant - DOIT être présent
    const montant = page.getByTestId(`ao-montant-${aoId}`);
    await expect(montant).toBeVisible();
  });

  // ===== TESTS DE BADGES =====

  test('devrait afficher le badge "En attente" pour un devis non envoyé', async ({ page }) => {
    const aoData = generateTestAO({
      status: 'devis_pret',
      devisSent: false
    });
    
    const aoId = await createAOViaAPI(page, aoData);
    createdIds.aos = [aoId];

    await goToWorkflow(page, 'envoi-devis');
    await waitForPageLoad(page);

    // Le badge DOIT être visible et contenir "En attente"
    const badge = page.getByTestId(`ao-status-badge-${aoId}`);
    await expect(badge).toBeVisible();
    await expect(badge).toContainText(/en attente/i);
  });

  test('devrait afficher le badge "Envoyé" pour un devis envoyé', async ({ page }) => {
    const aoData = generateTestAO({
      status: 'devis_pret',
      devisSent: true,
      sentAt: new Date().toISOString()
    });
    
    const aoId = await createAOViaAPI(page, aoData);
    createdIds.aos = [aoId];

    await goToWorkflow(page, 'envoi-devis');
    await waitForPageLoad(page);

    // Le badge DOIT être visible et contenir "Envoyé"
    const badge = page.getByTestId(`ao-status-badge-${aoId}`);
    await expect(badge).toBeVisible();
    await expect(badge).toContainText(/envoyé/i);
  });

  test('devrait afficher le badge "Accepté" pour un devis accepté', async ({ page }) => {
    const aoData = generateTestAO({
      status: 'devis_pret',
      devisSent: true,
      clientAccepted: true
    });
    
    const aoId = await createAOViaAPI(page, aoData);
    createdIds.aos = [aoId];

    await goToWorkflow(page, 'envoi-devis');
    await waitForPageLoad(page);

    // Le badge DOIT être visible et contenir "Accepté"
    const badge = page.getByTestId(`ao-status-badge-${aoId}`);
    await expect(badge).toBeVisible();
    await expect(badge).toContainText(/accepté/i);
  });

  test('devrait afficher le badge "Refusé" pour un devis refusé', async ({ page }) => {
    const aoData = generateTestAO({
      status: 'devis_pret',
      devisSent: true,
      clientRefused: true
    });
    
    const aoId = await createAOViaAPI(page, aoData);
    createdIds.aos = [aoId];

    await goToWorkflow(page, 'envoi-devis');
    await waitForPageLoad(page);

    // Le badge DOIT être visible et contenir "Refusé"
    const badge = page.getByTestId(`ao-status-badge-${aoId}`);
    await expect(badge).toBeVisible();
    await expect(badge).toContainText(/refusé/i);
  });

  // ===== ACTIONS - VISUALISER & TÉLÉCHARGER =====

  test('devrait toujours afficher les boutons Visualiser et Télécharger', async ({ page }) => {
    const aoData = generateTestAO({
      status: 'devis_pret'
    });
    
    const aoId = await createAOViaAPI(page, aoData);
    createdIds.aos = [aoId];

    await goToWorkflow(page, 'envoi-devis');
    await waitForPageLoad(page);

    // Les boutons DOIVENT être visibles
    const viewButton = page.getByTestId(`button-view-devis-${aoId}`);
    const downloadButton = page.getByTestId(`button-download-devis-${aoId}`);
    
    await expect(viewButton).toBeVisible();
    await expect(downloadButton).toBeVisible();
  });

  test('devrait ouvrir un nouvel onglet au clic sur Visualiser', async ({ page, context }) => {
    const aoData = generateTestAO({
      status: 'devis_pret'
    });
    
    const aoId = await createAOViaAPI(page, aoData);
    createdIds.aos = [aoId];

    await goToWorkflow(page, 'envoi-devis');
    await waitForPageLoad(page);

    const viewButton = page.getByTestId(`button-view-devis-${aoId}`);
    
    // Le bouton DOIT être visible
    await expect(viewButton).toBeVisible();
    
    // Écouter les nouveaux onglets
    const newPagePromise = context.waitForEvent('page');
    
    await viewButton.click();
    
    const newPage = await newPagePromise;
    
    // Vérifier l'URL - DOIT contenir le bon endpoint
    expect(newPage.url()).toContain(`/api/aos/${aoId}/devis/preview`);
    
    await newPage.close();
  });

  // ===== MODAL D'ENVOI =====

  test('devrait afficher le bouton "Envoyer le devis" pour un devis non envoyé', async ({ page }) => {
    const aoData = generateTestAO({
      status: 'devis_pret',
      devisSent: false
    });
    
    const aoId = await createAOViaAPI(page, aoData);
    createdIds.aos = [aoId];

    await goToWorkflow(page, 'envoi-devis');
    await waitForPageLoad(page);

    // Le bouton DOIT être visible
    const sendButton = page.getByTestId(`button-send-devis-${aoId}`);
    await expect(sendButton).toBeVisible();
  });

  test('devrait ouvrir le modal d\'envoi au clic sur "Envoyer le devis"', async ({ page }) => {
    const aoData = generateTestAO({
      status: 'devis_pret',
      devisSent: false
    });
    
    const aoId = await createAOViaAPI(page, aoData);
    createdIds.aos = [aoId];

    await goToWorkflow(page, 'envoi-devis');
    await waitForPageLoad(page);

    const sendButton = page.getByTestId(`button-send-devis-${aoId}`);
    
    // Le bouton DOIT être visible
    await expect(sendButton).toBeVisible();
    
    await sendButton.click();
    
    // Le modal DOIT s'ouvrir
    const modal = page.getByTestId('modal-send-devis');
    await expect(modal).toBeVisible();
    
    // Les 3 boutons de méthode d'envoi DOIVENT être visibles
    await expect(page.getByTestId('button-send-email')).toBeVisible();
    await expect(page.getByTestId('button-send-platform')).toBeVisible();
    await expect(page.getByTestId('button-send-manual')).toBeVisible();
    await expect(page.getByTestId('button-cancel-send')).toBeVisible();
  });

  test('devrait fermer le modal au clic sur Annuler', async ({ page }) => {
    const aoData = generateTestAO({
      status: 'devis_pret',
      devisSent: false
    });
    
    const aoId = await createAOViaAPI(page, aoData);
    createdIds.aos = [aoId];

    await goToWorkflow(page, 'envoi-devis');
    await waitForPageLoad(page);

    const sendButton = page.getByTestId(`button-send-devis-${aoId}`);
    await expect(sendButton).toBeVisible();
    
    await sendButton.click();
    
    const modal = page.getByTestId('modal-send-devis');
    await expect(modal).toBeVisible();
    
    // Cliquer sur Annuler
    await page.getByTestId('button-cancel-send').click();
    
    // Le modal DOIT se fermer
    await expect(modal).not.toBeVisible();
  });

  test('devrait envoyer le devis par email', async ({ page }) => {
    const aoData = generateTestAO({
      status: 'devis_pret',
      devisSent: false
    });
    
    const aoId = await createAOViaAPI(page, aoData);
    createdIds.aos = [aoId];

    await goToWorkflow(page, 'envoi-devis');
    await waitForPageLoad(page);

    const sendButton = page.getByTestId(`button-send-devis-${aoId}`);
    await expect(sendButton).toBeVisible();
    
    await sendButton.click();
    
    // Cliquer sur "Par email"
    await page.getByTestId('button-send-email').click();
    
    // Attendre le toast de succès
    await page.waitForTimeout(500);
    
    // Le modal DOIT se fermer
    const modal = page.getByTestId('modal-send-devis');
    await expect(modal).not.toBeVisible();
  });

  test('devrait envoyer le devis via plateforme', async ({ page }) => {
    const aoData = generateTestAO({
      status: 'devis_pret',
      devisSent: false
    });
    
    const aoId = await createAOViaAPI(page, aoData);
    createdIds.aos = [aoId];

    await goToWorkflow(page, 'envoi-devis');
    await waitForPageLoad(page);

    const sendButton = page.getByTestId(`button-send-devis-${aoId}`);
    await expect(sendButton).toBeVisible();
    
    await sendButton.click();
    
    // Cliquer sur "Via plateforme"
    await page.getByTestId('button-send-platform').click();
    
    // Attendre le toast
    await page.waitForTimeout(500);
    
    // Le modal DOIT se fermer
    const modal = page.getByTestId('modal-send-devis');
    await expect(modal).not.toBeVisible();
  });

  test('devrait marquer le devis comme envoyé manuellement', async ({ page }) => {
    const aoData = generateTestAO({
      status: 'devis_pret',
      devisSent: false
    });
    
    const aoId = await createAOViaAPI(page, aoData);
    createdIds.aos = [aoId];

    await goToWorkflow(page, 'envoi-devis');
    await waitForPageLoad(page);

    const sendButton = page.getByTestId(`button-send-devis-${aoId}`);
    await expect(sendButton).toBeVisible();
    
    await sendButton.click();
    
    // Cliquer sur "Envoi manuel"
    await page.getByTestId('button-send-manual').click();
    
    // Attendre le toast
    await page.waitForTimeout(500);
    
    // Le modal DOIT se fermer
    const modal = page.getByTestId('modal-send-devis');
    await expect(modal).not.toBeVisible();
  });

  // ===== RELANCE CLIENT =====

  test('devrait afficher le bouton Relancer pour un devis envoyé depuis >7 jours', async ({ page }) => {
    // Date d'envoi il y a 8 jours
    const sentDate = new Date();
    sentDate.setDate(sentDate.getDate() - 8);
    
    const aoData = generateTestAO({
      status: 'devis_pret',
      devisSent: true,
      sentAt: sentDate.toISOString(),
      clientResponse: false,
      relanceCount: 1
    });
    
    const aoId = await createAOViaAPI(page, aoData);
    createdIds.aos = [aoId];

    await goToWorkflow(page, 'envoi-devis');
    await waitForPageLoad(page);

    // Le bouton Relancer DOIT être visible
    const relancerButton = page.getByTestId(`button-relancer-${aoId}`);
    await expect(relancerButton).toBeVisible();
    await expect(relancerButton).toContainText(/relancer/i);
  });

  test('ne devrait PAS afficher le bouton Relancer pour un devis envoyé depuis <7 jours', async ({ page }) => {
    // Date d'envoi il y a 5 jours
    const sentDate = new Date();
    sentDate.setDate(sentDate.getDate() - 5);
    
    const aoData = generateTestAO({
      status: 'devis_pret',
      devisSent: true,
      sentAt: sentDate.toISOString(),
      clientResponse: false
    });
    
    const aoId = await createAOViaAPI(page, aoData);
    createdIds.aos = [aoId];

    await goToWorkflow(page, 'envoi-devis');
    await waitForPageLoad(page);

    // Le bouton Relancer NE DOIT PAS être visible
    const relancerButton = page.getByTestId(`button-relancer-${aoId}`);
    await expect(relancerButton).not.toBeVisible();
  });

  // ===== TRANSFORMATION EN PROJET =====

  test('devrait afficher le bouton "Transformer en projet" pour un devis accepté', async ({ page }) => {
    const aoData = generateTestAO({
      status: 'devis_pret',
      devisSent: true,
      clientAccepted: true
    });
    
    const aoId = await createAOViaAPI(page, aoData);
    createdIds.aos = [aoId];

    await goToWorkflow(page, 'envoi-devis');
    await waitForPageLoad(page);

    // Le bouton DOIT être visible
    const convertButton = page.getByTestId(`button-convert-${aoId}`);
    await expect(convertButton).toBeVisible();
    await expect(convertButton).toContainText(/transformer/i);
  });

  test('devrait rediriger vers la page de conversion au clic sur "Transformer en projet"', async ({ page }) => {
    const aoData = generateTestAO({
      status: 'devis_pret',
      devisSent: true,
      clientAccepted: true
    });
    
    const aoId = await createAOViaAPI(page, aoData);
    createdIds.aos = [aoId];

    await goToWorkflow(page, 'envoi-devis');
    await waitForPageLoad(page);

    const convertButton = page.getByTestId(`button-convert-${aoId}`);
    await expect(convertButton).toBeVisible();
    
    await convertButton.click();
    
    // Attendre la redirection
    await page.waitForURL(`**/aos/${aoId}/convert-to-project`, { timeout: 5000 }).catch(() => {
      // Si la redirection échoue, on vérifie quand même l'URL
    });
    
    // Vérifier l'URL - DOIT contenir le bon chemin
    expect(page.url()).toContain(`/aos/${aoId}/convert-to-project`);
  });

  // ===== INFORMATIONS DE SUIVI =====

  test('devrait afficher les informations de suivi pour un devis envoyé', async ({ page }) => {
    const sentDate = new Date();
    sentDate.setDate(sentDate.getDate() - 3);
    
    const aoData = generateTestAO({
      status: 'devis_pret',
      devisSent: true,
      sentAt: sentDate.toISOString(),
      relanceCount: 2
    });
    
    const aoId = await createAOViaAPI(page, aoData);
    createdIds.aos = [aoId];

    await goToWorkflow(page, 'envoi-devis');
    await waitForPageLoad(page);

    const aoCard = page.getByTestId(`card-ao-${aoId}`);
    
    // La carte DOIT être visible
    await expect(aoCard).toBeVisible();
    
    // Les informations de suivi DOIVENT être présentes
    await expect(aoCard).toContainText(/envoyé le/i);
    await expect(aoCard).toContainText(/jours/i);
    
    // Vérifier le nombre de relances si > 0
    if (aoData.relanceCount && aoData.relanceCount > 0) {
      await expect(aoCard).toContainText(/relances/i);
    }
  });

  // ===== CONTACT CLIENT =====

  test('devrait afficher les informations de contact du client', async ({ page }) => {
    const aoData = generateTestAO({
      status: 'devis_pret',
      contactEmail: 'client@test.com',
      contactPhone: '0123456789'
    });
    
    const aoId = await createAOViaAPI(page, aoData);
    createdIds.aos = [aoId];

    await goToWorkflow(page, 'envoi-devis');
    await waitForPageLoad(page);

    const aoCard = page.getByTestId(`card-ao-${aoId}`);
    
    // La carte DOIT être visible
    await expect(aoCard).toBeVisible();
    
    // Les informations de contact DOIVENT être présentes
    await expect(aoCard).toContainText(aoData.contactEmail!);
    await expect(aoCard).toContainText(aoData.contactPhone!);
  });
});
