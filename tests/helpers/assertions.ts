import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * Assertions personnalisées pour les tests Saxium
 */

/**
 * Vérifie qu'un workflow est chargé correctement
 */
export async function assertWorkflowLoaded(page: Page, workflowName: string): Promise<void> {
  // Vérifier que le titre du workflow est affiché
  const title = page.getByRole('heading', { name: new RegExp(workflowName, 'i') });
  await expect(title).toBeVisible();
  
  // Vérifier qu'il n'y a pas d'indicateurs de chargement
  const loaders = page.locator('[data-testid*="loading"], [data-testid*="skeleton"]');
  await expect(loaders).toHaveCount(0);
}

/**
 * Vérifie qu'il n'y a pas d'erreurs console
 */
export async function assertNoConsoleErrors(page: Page): Promise<void> {
  const errors: string[] = [];
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  page.on('pageerror', error => {
    errors.push(error.message);
  });

  // Attendre un peu pour capturer les erreurs potentielles
  await page.waitForTimeout(1000);

  if (errors.length > 0) {
    throw new Error(`Console errors found:\n${errors.join('\n')}`);
  }
}

/**
 * Vérifie qu'un certain nombre d'éléments sont affichés
 */
export async function assertDataDisplayed(page: Page, itemTestId: string, count: number): Promise<void> {
  const items = page.getByTestId(new RegExp(`^${itemTestId}`));
  await expect(items).toHaveCount(count);
}

/**
 * Vérifie qu'un message de succès est affiché (toast)
 */
export async function assertSuccessToast(page: Page, message?: string): Promise<void> {
  const toast = page.locator('[data-testid*="toast"]').or(page.locator('.toast'));
  await expect(toast).toBeVisible();
  
  if (message) {
    await expect(toast).toContainText(message);
  }
}

/**
 * Vérifie qu'un message d'erreur est affiché (toast)
 */
export async function assertErrorToast(page: Page, message?: string): Promise<void> {
  const toast = page.locator('[data-testid*="toast"][data-type="error"]')
    .or(page.locator('.toast-error'))
    .or(page.locator('[role="alert"]'));
  
  await expect(toast).toBeVisible();
  
  if (message) {
    await expect(toast).toContainText(message);
  }
}

/**
 * Vérifie qu'une page affiche un état vide (no data)
 */
export async function assertEmptyState(page: Page): Promise<void> {
  const emptyState = page.getByTestId('empty-state')
    .or(page.getByText(/aucun.*trouvé|no.*found|vide|empty/i));
  
  await expect(emptyState).toBeVisible();
}

/**
 * Vérifie qu'un élément spécifique est visible
 */
export async function assertElementVisible(page: Page, testId: string): Promise<void> {
  await expect(page.getByTestId(testId)).toBeVisible();
}

/**
 * Vérifie qu'un élément spécifique n'est pas visible
 */
export async function assertElementNotVisible(page: Page, testId: string): Promise<void> {
  await expect(page.getByTestId(testId)).not.toBeVisible();
}

/**
 * Vérifie qu'un texte est présent sur la page
 */
export async function assertTextPresent(page: Page, text: string | RegExp): Promise<void> {
  await expect(page.getByText(text)).toBeVisible();
}

/**
 * Vérifie qu'un texte n'est pas présent sur la page
 */
export async function assertTextNotPresent(page: Page, text: string | RegExp): Promise<void> {
  await expect(page.getByText(text)).not.toBeVisible();
}

/**
 * Vérifie qu'un tableau contient un certain nombre de lignes
 */
export async function assertTableRowCount(page: Page, count: number, tableTestId?: string): Promise<void> {
  const selector = tableTestId 
    ? `[data-testid="${tableTestId}"] tbody tr`
    : 'table tbody tr';
  
  const rows = page.locator(selector);
  await expect(rows).toHaveCount(count);
}

/**
 * Vérifie qu'un badge a un certain statut
 */
export async function assertBadgeStatus(page: Page, badgeTestId: string, status: string): Promise<void> {
  const badge = page.getByTestId(badgeTestId);
  await expect(badge).toContainText(status);
}

/**
 * Vérifie qu'un formulaire est valide (pas d'erreurs)
 */
export async function assertFormValid(page: Page): Promise<void> {
  const errors = page.locator('[data-testid*="error"], .text-destructive, [role="alert"]');
  await expect(errors).toHaveCount(0);
}

/**
 * Vérifie qu'un bouton est désactivé
 */
export async function assertButtonDisabled(page: Page, buttonTestId: string): Promise<void> {
  await expect(page.getByTestId(buttonTestId)).toBeDisabled();
}

/**
 * Vérifie qu'un bouton est activé
 */
export async function assertButtonEnabled(page: Page, buttonTestId: string): Promise<void> {
  await expect(page.getByTestId(buttonTestId)).toBeEnabled();
}

/**
 * Vérifie que la navigation est correcte (URL)
 */
export async function assertURL(page: Page, expectedPath: string): Promise<void> {
  const url = new URL(page.url());
  expect(url.pathname).toBe(expectedPath);
}

/**
 * Vérifie qu'une carte/card est visible avec un titre spécifique
 */
export async function assertCardVisible(page: Page, cardTitle: string): Promise<void> {
  const card = page.locator('[data-testid*="card"]', { hasText: cardTitle })
    .or(page.locator('.card', { hasText: cardTitle }));
  
  await expect(card).toBeVisible();
}

/**
 * Vérifie qu'un modal/dialog est ouvert
 */
export async function assertModalOpen(page: Page, modalTitle?: string): Promise<void> {
  const dialog = page.locator('[role="dialog"]');
  await expect(dialog).toBeVisible();
  
  if (modalTitle) {
    await expect(dialog).toContainText(modalTitle);
  }
}

/**
 * Vérifie qu'un modal/dialog est fermé
 */
export async function assertModalClosed(page: Page): Promise<void> {
  const dialog = page.locator('[role="dialog"]');
  await expect(dialog).not.toBeVisible();
}

/**
 * Vérifie qu'une valeur statistique est affichée
 */
export async function assertStatValue(page: Page, statTestId: string, expectedValue: string | number): Promise<void> {
  const stat = page.getByTestId(statTestId);
  await expect(stat).toContainText(expectedValue.toString());
}

/**
 * Vérifie qu'un graphique/chart est chargé
 */
export async function assertChartLoaded(page: Page, chartTestId: string): Promise<void> {
  const chart = page.getByTestId(chartTestId);
  await expect(chart).toBeVisible();
  
  // Vérifier qu'il contient des éléments SVG (recharts)
  const svg = chart.locator('svg');
  await expect(svg).toBeVisible();
}

/**
 * Vérifie qu'une liste contient un élément spécifique
 */
export async function assertListContains(page: Page, listTestId: string, itemText: string): Promise<void> {
  const list = page.getByTestId(listTestId);
  await expect(list.getByText(itemText)).toBeVisible();
}

/**
 * Vérifie que la page ne contient pas de chargements en cours
 */
export async function assertNoLoadingState(page: Page): Promise<void> {
  const loaders = page.locator('[data-testid*="loading"], [data-testid*="skeleton"], [aria-busy="true"]');
  await expect(loaders).toHaveCount(0);
}
