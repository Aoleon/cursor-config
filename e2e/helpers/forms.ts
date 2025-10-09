import type { Page, Locator } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * Helpers pour interagir avec les formulaires dans Saxium
 */

/**
 * Remplit un champ de formulaire par son data-testid
 */
export async function fillFormField(page: Page, testId: string, value: string): Promise<void> {
  const field = page.getByTestId(testId);
  await field.clear();
  await field.fill(value);
}

/**
 * Remplit plusieurs champs de formulaire en une seule opération
 */
export async function fillForm(page: Page, fields: Record<string, string>): Promise<void> {
  for (const [testId, value] of Object.entries(fields)) {
    await fillFormField(page, testId, value);
  }
}

/**
 * Sélectionne une option dans un select par son data-testid
 */
export async function selectOption(page: Page, selectTestId: string, optionValue: string): Promise<void> {
  const select = page.getByTestId(selectTestId);
  await select.click();
  
  // Pour les selects shadcn, l'option est dans un popover
  await page.getByRole('option', { name: new RegExp(optionValue, 'i') }).click();
}

/**
 * Coche ou décoche une checkbox
 */
export async function toggleCheckbox(page: Page, checkboxTestId: string, checked: boolean): Promise<void> {
  const checkbox = page.getByTestId(checkboxTestId);
  const isChecked = await checkbox.isChecked();
  
  if (isChecked !== checked) {
    await checkbox.click();
  }
}

/**
 * Sélectionne un bouton radio
 */
export async function selectRadio(page: Page, radioTestId: string): Promise<void> {
  await page.getByTestId(radioTestId).click();
}

/**
 * Soumet un formulaire via un bouton de soumission
 */
export async function submitForm(page: Page, submitButtonTestId: string): Promise<void> {
  await page.getByTestId(submitButtonTestId).click();
}

/**
 * Remplit et soumet un formulaire complet
 */
export async function fillAndSubmitForm(
  page: Page,
  fields: Record<string, string>,
  submitButtonTestId: string
): Promise<void> {
  await fillForm(page, fields);
  await submitForm(page, submitButtonTestId);
}

/**
 * Attend qu'un formulaire soit soumis avec succès (vérifie le toast ou la navigation)
 */
export async function waitForFormSubmission(page: Page, timeout = 10000): Promise<void> {
  // Attendre soit un toast de succès, soit une navigation
  await Promise.race([
    page.waitForSelector('[data-testid*="toast"]', { state: 'visible', timeout }),
    page.waitForURL('**/*', { timeout }),
  ]);
}

/**
 * Vérifie qu'un formulaire a des erreurs de validation
 */
export async function assertFormHasErrors(page: Page): Promise<void> {
  const errors = page.locator('[data-testid*="error"], .text-destructive, [role="alert"]');
  await expect(errors.first()).toBeVisible();
}

/**
 * Vérifie qu'un champ spécifique a une erreur
 */
export async function assertFieldHasError(page: Page, fieldTestId: string): Promise<void> {
  // Chercher l'erreur associée au champ
  const errorLocator = page.locator(`[data-testid="${fieldTestId}-error"]`)
    .or(page.locator(`[id="${fieldTestId}-error"]`))
    .or(page.locator(`[aria-describedby*="${fieldTestId}"]`).locator('.text-destructive'));
  
  await expect(errorLocator.first()).toBeVisible();
}

/**
 * Réinitialise un formulaire
 */
export async function resetForm(page: Page, resetButtonTestId: string = 'button-reset'): Promise<void> {
  await page.getByTestId(resetButtonTestId).click();
}

/**
 * Upload un fichier via un input file
 */
export async function uploadFile(page: Page, inputTestId: string, filePath: string): Promise<void> {
  const fileInput = page.getByTestId(inputTestId);
  await fileInput.setInputFiles(filePath);
}

/**
 * Upload plusieurs fichiers
 */
export async function uploadMultipleFiles(page: Page, inputTestId: string, filePaths: string[]): Promise<void> {
  const fileInput = page.getByTestId(inputTestId);
  await fileInput.setInputFiles(filePaths);
}

/**
 * Remplit un champ de date
 */
export async function fillDateField(page: Page, dateTestId: string, date: string): Promise<void> {
  // Format attendu: YYYY-MM-DD
  const field = page.getByTestId(dateTestId);
  
  // Si c'est un date picker shadcn
  await field.click();
  
  // Essayer de remplir directement
  await field.fill(date);
  
  // Si c'est un date picker, valider
  const confirmButton = page.getByRole('button', { name: /confirm|ok|valider/i });
  if (await confirmButton.count() > 0) {
    await confirmButton.click();
  }
}

/**
 * Remplit un champ textarea
 */
export async function fillTextarea(page: Page, textareaTestId: string, text: string): Promise<void> {
  const textarea = page.getByTestId(textareaTestId);
  await textarea.clear();
  await textarea.fill(text);
}

/**
 * Attend qu'un champ soit valide (pas d'erreur)
 */
export async function waitForFieldValid(page: Page, fieldTestId: string, timeout = 5000): Promise<void> {
  await page.waitForFunction(
    (testId) => {
      const errorEl = document.querySelector(`[data-testid="${testId}-error"]`);
      return !errorEl || errorEl.textContent === '';
    },
    fieldTestId,
    { timeout }
  );
}

/**
 * Clique sur un bouton dans un formulaire
 */
export async function clickFormButton(page: Page, buttonTestId: string): Promise<void> {
  await page.getByTestId(buttonTestId).click();
}

/**
 * Attend que le formulaire ne soit plus en état de soumission (loading)
 */
export async function waitForFormReady(page: Page, timeout = 10000): Promise<void> {
  await page.waitForFunction(() => {
    const submitButtons = document.querySelectorAll('[type="submit"], [data-testid*="submit"]');
    return Array.from(submitButtons).every(btn => !btn.hasAttribute('disabled'));
  }, { timeout }).catch(() => {
    // Ignore si pas de boutons de soumission trouvés
  });
}

/**
 * Vérifie qu'un formulaire est dans un état de chargement
 */
export async function assertFormLoading(page: Page): Promise<void> {
  const loadingIndicators = page.locator('[data-testid*="loading"], [aria-busy="true"], button[disabled]');
  await expect(loadingIndicators.first()).toBeVisible();
}
