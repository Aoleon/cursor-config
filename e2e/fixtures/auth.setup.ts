import { test as setup, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

/**
 * Configuration de l'authentification pour les tests E2E Saxium
 * 
 * En mode test (NODE_ENV=test), l'application utilise une authentification basique
 * qui bypass l'OIDC standard pour faciliter les tests automatisés.
 */

export const STORAGE_STATE_PATH = 'e2e/.auth/user.json';

/**
 * Vérifie si l'utilisateur est authentifié
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  try {
    const response = await page.request.get('/api/test/auth-status');
    if (response.ok()) {
      const data = await response.json();
      return data.authenticated === true;
    }
  } catch (error) {
    console.log('Error checking auth status:', error);
  }
  return false;
}

/**
 * Authentifie l'utilisateur de test
 * En mode test, l'authentification est automatique via le middleware testAuthBypass
 */
export async function authenticateTestUser(page: Page): Promise<void> {
  // En mode test, naviguer vers n'importe quelle page API crée automatiquement la session
  await page.goto('/api/test/auth-status');
  
  const authStatus = await isAuthenticated(page);
  if (!authStatus) {
    throw new Error('Failed to authenticate test user');
  }

  console.log('Test user authenticated successfully');
}

/**
 * Setup global - Authentifie l'utilisateur avant tous les tests
 * Ce setup est exécuté une fois et sauvegarde l'état de la session
 */
setup('authenticate', async ({ page }) => {
  // Vérifier que nous sommes en mode test
  await page.goto('/');
  
  // L'authentification est automatique en mode test
  await authenticateTestUser(page);

  // Vérifier que nous avons accès aux endpoints protégés
  const response = await page.request.get('/api/analytics/kpis/');
  expect(response.ok()).toBeTruthy();

  // Sauvegarder l'état de la session pour réutilisation
  await page.context().storageState({ path: STORAGE_STATE_PATH });
});

/**
 * Helper pour attendre que l'authentification soit prête
 */
export async function waitForAuth(page: Page, timeout = 5000): Promise<void> {
  await page.waitForFunction(() => {
    return fetch('/api/test/auth-status')
      .then(r => r.json())
      .then(data => data.authenticated === true)
      .catch(() => false);
  }, { timeout });
}

/**
 * Obtient les informations de l'utilisateur de test
 */
export async function getTestUser(page: Page) {
  const response = await page.request.get('/api/test/auth-status');
  if (!response.ok()) {
    throw new Error('Failed to get test user info');
  }
  const data = await response.json();
  return data.user;
}
