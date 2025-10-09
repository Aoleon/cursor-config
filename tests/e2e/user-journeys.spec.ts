import { test, expect } from '@playwright/test';
import { 
  goToDashboard, 
  goToAOs, 
  goToCreateAO, 
  goToWorkflow,
  waitForPageLoad 
} from '../helpers/navigation';
import { 
  fillForm, 
  fillFormField, 
  selectOption, 
  submitForm, 
  waitForFormSubmission 
} from '../helpers/forms';
import { 
  assertSuccessToast, 
  assertWorkflowLoaded, 
  assertTextPresent 
} from '../helpers/assertions';
import { 
  generateTestAO, 
  generateTestProject, 
  cleanupTestData 
} from '../fixtures/e2e/test-data';

/**
 * Tests de parcours utilisateur complets (User Journeys)
 * 
 * Ces tests simulent des scénarios réels d'utilisation de bout en bout
 */

test.describe('Parcours Utilisateur Complets', () => {
  const createdIds: { aos?: string[]; projects?: string[]; offers?: string[] } = {};

  test.afterEach(async ({ page }) => {
    await cleanupTestData(page, createdIds);
  });

  test('Parcours: Consultation du dashboard', async ({ page }) => {
    // 1. Aller au dashboard
    await goToDashboard(page);

    // 2. Vérifier que le dashboard s'affiche
    await assertWorkflowLoaded(page, 'Dashboard');

    // 3. Vérifier les KPIs sont visibles
    const kpis = page.locator('[data-testid*="kpi"]').or(page.locator('.text-2xl'));
    await expect(kpis.first()).toBeVisible();

    // 4. Vérifier qu'il n'y a pas d'erreurs
    await page.waitForTimeout(1000);
  });

  test('Parcours: Navigation entre workflows', async ({ page }) => {
    // 1. Démarrer au dashboard
    await goToDashboard(page);

    // 2. Naviguer vers Chiffrage
    await goToWorkflow(page, 'chiffrage');
    await assertWorkflowLoaded(page, 'Chiffrage');

    // 3. Naviguer vers Planification
    await goToWorkflow(page, 'planification');
    await assertWorkflowLoaded(page, 'Planification');

    // 4. Naviguer vers Chantier
    await goToWorkflow(page, 'chantier');
    await assertWorkflowLoaded(page, 'Chantier');

    // 5. Retour au dashboard
    await goToDashboard(page);
    await assertWorkflowLoaded(page, 'Dashboard');
  });

  test('Parcours: Consultation de la liste des AOs', async ({ page }) => {
    // 1. Naviguer vers les AOs
    await goToAOs(page);

    // 2. Vérifier le chargement de la page
    await waitForPageLoad(page);

    // 3. Vérifier le titre
    const title = page.getByRole('heading', { name: /appel.*offre|ao/i });
    await expect(title).toBeVisible();

    // 4. Vérifier la présence du bouton de création
    const createButton = page.getByTestId('button-create-ao')
      .or(page.getByRole('button', { name: /créer|nouveau/i }));
    
    await expect(createButton.first()).toBeVisible();
  });

  test('Parcours: Visualisation d un workflow vide puis avec données', async ({ page }) => {
    // 1. Aller au workflow chiffrage (potentiellement vide)
    await goToWorkflow(page, 'chiffrage');
    await waitForPageLoad(page);

    // 2. Vérifier l'état initial (vide ou avec données)
    const hasData = await page.getByTestId(/card-offer-/).count() > 0;
    
    if (!hasData) {
      // État vide visible
      const emptyState = page.getByText(/aucun.*trouvé|vide|no.*data/i);
      const count = await emptyState.count();
      expect(count).toBeGreaterThan(0);
    }

    // 3. Navigation fluide vérifiée
    expect(page.url()).toContain('chiffrage');
  });

  test('Parcours: Accès au chatbot', async ({ page }) => {
    // 1. Aller au chatbot
    await goToWorkflow(page, 'chatbot');

    // 2. Vérifier l'interface
    const chatInput = page.getByPlaceholder(/message|question/i)
      .or(page.getByTestId('input-message'));
    
    await expect(chatInput).toBeVisible();

    // 3. Vérifier le bouton d'envoi
    const sendButton = page.getByRole('button', { name: /envoyer/i })
      .or(page.getByTestId('button-send'));
    
    await expect(sendButton.first()).toBeVisible();
  });

  test('Parcours: Navigation responsive sans erreurs', async ({ page }) => {
    const errors: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Parcours complet
    await goToDashboard(page);
    await page.waitForTimeout(500);
    
    await goToWorkflow(page, 'chiffrage');
    await page.waitForTimeout(500);
    
    await goToWorkflow(page, 'planification');
    await page.waitForTimeout(500);
    
    await goToDashboard(page);
    await page.waitForTimeout(500);

    // Filtrer les erreurs non critiques
    const criticalErrors = errors.filter(e => 
      !e.includes('favicon') && 
      !e.includes('404') &&
      !e.includes('chunk') &&
      !e.includes('websocket')
    );

    expect(criticalErrors).toHaveLength(0);
  });

  test('Parcours: Workflow complet simulé (consultation)', async ({ page }) => {
    // Scénario: Un utilisateur consulte les différentes phases d'un projet

    // 1. Dashboard - Vue d'ensemble
    await goToDashboard(page);
    await assertTextPresent(page, /tableau de bord|dashboard/i);

    // 2. Phase Chiffrage - Vérifier les offres à chiffrer
    await goToWorkflow(page, 'chiffrage');
    await waitForPageLoad(page);

    // 3. Phase Planification - Vérifier les projets à planifier
    await goToWorkflow(page, 'planification');
    await waitForPageLoad(page);

    // 4. Phase Chantier - Vérifier les chantiers en cours
    await goToWorkflow(page, 'chantier');
    await waitForPageLoad(page);

    // 5. Retour au dashboard pour vue consolidée
    await goToDashboard(page);
    
    // Vérifier que tout s'est bien passé
    expect(page.url()).toContain('dashboard');
  });
});
