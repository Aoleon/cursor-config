import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * Helpers pour la navigation dans l'application Saxium
 */

export type WorkflowType = 'chiffrage' | 'envoi-devis' | 'planification' | 'chantier' | 'chatbot';

/**
 * Mapping des workflows vers leurs URLs
 */
const WORKFLOW_PATHS: Record<WorkflowType, string> = {
  'chiffrage': '/workflow/chiffrage',
  'envoi-devis': '/workflow/envoi-devis',
  'planification': '/workflow/planification',
  'chantier': '/workflow/chantier',
  'chatbot': '/chatbot',
};

/**
 * Mapping des workflows vers les data-testid de leurs liens dans la sidebar
 */
const WORKFLOW_SIDEBAR_LINKS: Record<WorkflowType, string> = {
  'chiffrage': 'link-chiffrage',
  'envoi-devis': 'link-envoi-devis',
  'planification': 'link-planification',
  'chantier': 'link-chantier',
  'chatbot': 'link-chatbot',
};

/**
 * Navigue vers un workflow spécifique
 */
export async function goToWorkflow(page: Page, workflow: WorkflowType): Promise<void> {
  const path = WORKFLOW_PATHS[workflow];
  await page.goto(path);
  await waitForPageLoad(page);
}

/**
 * Clique sur un lien de la sidebar pour naviguer vers un workflow
 */
export async function clickSidebarLink(page: Page, linkText: string): Promise<void> {
  await page.getByTestId(`link-${linkText.toLowerCase().replace(/\s+/g, '-')}`).click();
  await waitForPageLoad(page);
}

/**
 * Navigue vers un workflow via la sidebar
 */
export async function goToWorkflowViaSidebar(page: Page, workflow: WorkflowType): Promise<void> {
  const testId = WORKFLOW_SIDEBAR_LINKS[workflow];
  await page.getByTestId(testId).click();
  await waitForPageLoad(page);
}

/**
 * Attend que la page soit complètement chargée
 * Vérifie que les indicateurs de chargement ont disparu et que le contenu est visible
 */
export async function waitForPageLoad(page: Page, timeout = 10000): Promise<void> {
  // Attendre que le réseau soit stable
  await page.waitForLoadState('networkidle', { timeout });
  
  // Attendre que les skeletons/loaders disparaissent si présents
  await page.waitForFunction(() => {
    const loaders = document.querySelectorAll('[data-testid*="loading"], [data-testid*="skeleton"]');
    return loaders.length === 0;
  }, { timeout: 5000 }).catch(() => {
    // Ignore si pas de loaders trouvés
  });
}

/**
 * Navigue vers le dashboard
 */
export async function goToDashboard(page: Page): Promise<void> {
  await page.goto('/dashboard');
  await waitForPageLoad(page);
}

/**
 * Navigue vers la page des AOs
 */
export async function goToAOs(page: Page): Promise<void> {
  await page.goto('/aos');
  await waitForPageLoad(page);
}

/**
 * Navigue vers la page des projets
 */
export async function goToProjects(page: Page): Promise<void> {
  await page.goto('/projects');
  await waitForPageLoad(page);
}

/**
 * Navigue vers la page des offres
 */
export async function goToOffers(page: Page): Promise<void> {
  await page.goto('/offers');
  await waitForPageLoad(page);
}

/**
 * Navigue vers la page de création d'AO
 */
export async function goToCreateAO(page: Page): Promise<void> {
  await page.goto('/create-ao');
  await waitForPageLoad(page);
}

/**
 * Navigue vers le détail d'un AO
 */
export async function goToAODetail(page: Page, aoId: string): Promise<void> {
  await page.goto(`/aos/${aoId}`);
  await waitForPageLoad(page);
}

/**
 * Navigue vers le détail d'un projet
 */
export async function goToProjectDetail(page: Page, projectId: string): Promise<void> {
  await page.goto(`/projects/${projectId}`);
  await waitForPageLoad(page);
}

/**
 * Navigue vers le détail d'une offre
 */
export async function goToOfferDetail(page: Page, offerId: string): Promise<void> {
  await page.goto(`/offers/${offerId}`);
  await waitForPageLoad(page);
}

/**
 * Retourne à la page précédente
 */
export async function goBack(page: Page): Promise<void> {
  await page.goBack();
  await waitForPageLoad(page);
}

/**
 * Rafraîchit la page
 */
export async function refresh(page: Page): Promise<void> {
  await page.reload();
  await waitForPageLoad(page);
}

/**
 * Vérifie que nous sommes sur la bonne page en vérifiant l'URL
 */
export async function assertOnPage(page: Page, expectedPath: string): Promise<void> {
  const currentUrl = new URL(page.url());
  expect(currentUrl.pathname).toBe(expectedPath);
}

/**
 * Attend qu'une navigation soit terminée
 */
export async function waitForNavigation(page: Page, timeout = 10000): Promise<void> {
  await page.waitForURL('**/*', { timeout });
  await waitForPageLoad(page);
}

/**
 * Ouvre un modal/dialog via un bouton
 */
export async function openModal(page: Page, buttonTestId: string): Promise<void> {
  await page.getByTestId(buttonTestId).click();
  
  // Attendre que le modal soit visible
  await page.waitForSelector('[role="dialog"]', { state: 'visible' });
}

/**
 * Ferme un modal/dialog
 */
export async function closeModal(page: Page): Promise<void> {
  // Chercher le bouton de fermeture ou ESC
  const closeButton = page.getByTestId('button-close-modal')
    .or(page.getByLabel('Close'))
    .or(page.locator('[aria-label="Close"]'));
  
  if (await closeButton.count() > 0) {
    await closeButton.first().click();
  } else {
    await page.keyboard.press('Escape');
  }

  // Attendre que le modal disparaisse
  await page.waitForSelector('[role="dialog"]', { state: 'hidden' });
}
