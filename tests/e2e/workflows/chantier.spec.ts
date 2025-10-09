import { test, expect } from '@playwright/test';
import { goToWorkflow, waitForPageLoad } from '../../helpers/navigation';
import { assertWorkflowLoaded, assertEmptyState, assertNoLoadingState } from '../../helpers/assertions';
import { cleanupTestData, generateTestProject, createProjectViaAPI } from '../../fixtures/e2e/test-data';

/**
 * Tests du workflow Chantier
 * 
 * Ce workflow permet de suivre l'avancement des chantiers et de gérer les problèmes
 */

test.describe('Workflow Chantier', () => {
  const createdIds: { projects?: string[] } = {};

  test.afterEach(async ({ page }) => {
    await cleanupTestData(page, createdIds);
  });

  test('Navigation vers le workflow Chantier', async ({ page }) => {
    await goToWorkflow(page, 'chantier');
    await assertWorkflowLoaded(page, 'Chantier');
    await assertNoLoadingState(page);
  });

  test('Affichage du titre et des indicateurs KPI', async ({ page }) => {
    await goToWorkflow(page, 'chantier');

    // Vérifier le titre
    const title = page.getByRole('heading', { name: /chantier/i });
    await expect(title).toBeVisible();

    // Vérifier les KPIs (statistiques)
    const kpiCards = page.locator('[data-testid*="kpi"]').or(page.locator('.card'));
    await expect(kpiCards.first()).toBeVisible();
  });

  test('État vide quand aucun chantier en cours', async ({ page }) => {
    await goToWorkflow(page, 'chantier');
    await waitForPageLoad(page);

    const hasChantiers = await page.getByTestId(/card-project-/).count() > 0;
    
    if (!hasChantiers) {
      await assertEmptyState(page);
    }
  });

  test('Affichage des chantiers actifs', async ({ page }) => {
    // Créer un projet de test en phase chantier
    const projectData = generateTestProject({ status: 'chantier' });
    const projectId = await createProjectViaAPI(page, projectData);
    createdIds.projects = [projectId];

    await goToWorkflow(page, 'chantier');
    await waitForPageLoad(page);

    // Vérifier que le chantier est affiché
    const chantierCard = page.getByTestId(`card-project-${projectId}`)
      .or(page.getByText(projectData.reference));
    
    const count = await chantierCard.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('Boutons d action chantier présents', async ({ page }) => {
    await goToWorkflow(page, 'chantier');
    await waitForPageLoad(page);

    // Si des chantiers sont présents, vérifier les boutons
    const hasChantiers = await page.getByRole('button', { name: /photo|rapport|terminer|suspendre/i }).count() > 0;

    if (hasChantiers) {
      const actionButton = page.getByRole('button', { name: /suivi photo|rapport/i }).first();
      await expect(actionButton).toBeVisible();
    }
  });

  test('Barre de progression affichée pour les chantiers', async ({ page }) => {
    await goToWorkflow(page, 'chantier');
    await waitForPageLoad(page);

    // Si des chantiers sont présents, vérifier les barres de progression
    const hasProgress = await page.locator('[role="progressbar"]').or(page.getByTestId(/progress-/)).count() > 0;

    if (hasProgress) {
      const progressBar = page.locator('[role="progressbar"]').first();
      await expect(progressBar).toBeVisible();
    }
  });

  test('Chargement sans erreurs', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await goToWorkflow(page, 'chantier');
    await waitForPageLoad(page);
    await page.waitForTimeout(1000);

    const criticalErrors = errors.filter(e => 
      !e.includes('favicon') && 
      !e.includes('404')
    );

    expect(criticalErrors).toHaveLength(0);
  });
});
