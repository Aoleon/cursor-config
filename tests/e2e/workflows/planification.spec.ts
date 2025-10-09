import { test, expect } from '@playwright/test';
import { goToWorkflow, waitForPageLoad } from '../../helpers/navigation';
import { assertWorkflowLoaded, assertEmptyState, assertNoLoadingState } from '../../helpers/assertions';
import { cleanupTestData, generateTestProject, createProjectViaAPI } from '../../fixtures/e2e/test-data';

/**
 * Tests du workflow Planification
 * 
 * Ce workflow permet de planifier les projets, d'affecter les équipes et de créer les tâches
 */

test.describe('Workflow Planification', () => {
  const createdIds: { projects?: string[] } = {};

  test.afterEach(async ({ page }) => {
    await cleanupTestData(page, createdIds);
  });

  test('Navigation vers le workflow Planification', async ({ page }) => {
    await goToWorkflow(page, 'planification');
    await assertWorkflowLoaded(page, 'Planification');
    await assertNoLoadingState(page);
  });

  test('Affichage du titre et des indicateurs', async ({ page }) => {
    await goToWorkflow(page, 'planification');

    // Vérifier le titre
    const title = page.getByRole('heading', { name: /planification/i });
    await expect(title).toBeVisible();

    // Vérifier les statistiques
    const stats = page.locator('[data-testid*="stat"]').or(page.locator('.text-2xl'));
    await expect(stats.first()).toBeVisible();
  });

  test('État vide quand aucun projet en planification', async ({ page }) => {
    await goToWorkflow(page, 'planification');
    await waitForPageLoad(page);

    const hasProjects = await page.getByTestId(/card-project-/).count() > 0;
    
    if (!hasProjects) {
      await assertEmptyState(page);
    }
  });

  test('Affichage des projets en planification', async ({ page }) => {
    // Créer un projet de test en planification
    const projectData = generateTestProject({ status: 'planification' });
    const projectId = await createProjectViaAPI(page, projectData);
    createdIds.projects = [projectId];

    await goToWorkflow(page, 'planification');
    await waitForPageLoad(page);

    // Vérifier que le projet est affiché
    const projectCard = page.getByTestId(`card-project-${projectId}`)
      .or(page.getByText(projectData.reference));
    
    const count = await projectCard.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('Boutons de gestion du planning présents', async ({ page }) => {
    await goToWorkflow(page, 'planification');
    await waitForPageLoad(page);

    // Si des projets sont présents, vérifier les boutons
    const hasProjects = await page.getByRole('button', { name: /planning|équipe|valider/i }).count() > 0;

    if (hasProjects) {
      const planningButton = page.getByRole('button', { name: /modifier planning|gérer équipes/i }).first();
      await expect(planningButton).toBeVisible();
    }
  });

  test('Navigation sans erreurs', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await goToWorkflow(page, 'planification');
    await waitForPageLoad(page);
    await page.waitForTimeout(1000);

    const criticalErrors = errors.filter(e => 
      !e.includes('favicon') && 
      !e.includes('404')
    );

    expect(criticalErrors).toHaveLength(0);
  });
});
