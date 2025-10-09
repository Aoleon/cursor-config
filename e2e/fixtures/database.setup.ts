import type { Page } from '@playwright/test';

/**
 * Helpers pour gérer la base de données de test
 * 
 * Ces helpers permettent de préparer et nettoyer la base de données
 * entre les tests pour garantir l'isolation et la reproductibilité.
 */

/**
 * Interface pour les options de nettoyage
 */
export interface CleanupOptions {
  aos?: boolean;
  projects?: boolean;
  offers?: boolean;
  contacts?: boolean;
  suppliers?: boolean;
  keepTestData?: boolean; // Garde les données créées pendant le test
}

/**
 * Nettoie les données de test de la base de données
 * Supprime uniquement les données créées par les tests (identifiables par 'TEST' dans la référence)
 */
export async function cleanupDatabase(page: Page, options: CleanupOptions = {}): Promise<void> {
  const {
    aos = true,
    projects = true,
    offers = true,
    contacts = false,
    suppliers = false,
  } = options;

  const cleanupPromises: Promise<any>[] = [];

  if (aos) {
    cleanupPromises.push(
      page.request.delete('/api/test/cleanup/aos')
    );
  }

  if (projects) {
    cleanupPromises.push(
      page.request.delete('/api/test/cleanup/projects')
    );
  }

  if (offers) {
    cleanupPromises.push(
      page.request.delete('/api/test/cleanup/offers')
    );
  }

  if (contacts) {
    cleanupPromises.push(
      page.request.delete('/api/test/cleanup/contacts')
    );
  }

  if (suppliers) {
    cleanupPromises.push(
      page.request.delete('/api/test/cleanup/suppliers')
    );
  }

  await Promise.allSettled(cleanupPromises);
}

/**
 * Réinitialise la base de données à un état connu pour les tests
 */
export async function resetDatabase(page: Page): Promise<void> {
  // Nettoie toutes les données de test
  await cleanupDatabase(page, {
    aos: true,
    projects: true,
    offers: true,
    contacts: true,
    suppliers: true,
  });

  // Optionnel: Peut charger des données de seed si nécessaire
  // await seedTestData(page);
}

/**
 * Vérifie que la base de données est accessible
 */
export async function checkDatabaseConnection(page: Page): Promise<boolean> {
  try {
    const response = await page.request.get('/api/test/db-health');
    return response.ok();
  } catch (error) {
    console.error('Database connection check failed:', error);
    return false;
  }
}

/**
 * Compte le nombre d'enregistrements dans une table (pour les tests)
 */
export async function countRecords(
  page: Page,
  table: 'aos' | 'projects' | 'offers' | 'contacts' | 'suppliers'
): Promise<number> {
  try {
    const response = await page.request.get(`/api/test/count/${table}`);
    if (response.ok()) {
      const data = await response.json();
      return data.count || 0;
    }
  } catch (error) {
    console.error(`Failed to count ${table}:`, error);
  }
  return 0;
}

/**
 * Seed des données de test minimales
 */
export async function seedMinimalTestData(page: Page): Promise<void> {
  // Cette fonction peut être étendue pour charger des données de base nécessaires
  // Par exemple: des utilisateurs, des configurations, etc.
  console.log('Seeding minimal test data...');
  
  // Exemple: Créer un client de test par défaut
  await page.request.post('/api/test/seed/minimal', {
    data: {
      includeDefaultClient: true,
      includeDefaultSupplier: true,
    }
  });
}

/**
 * Exécute une transaction de test isolée
 */
export async function runInTransaction<T>(
  page: Page,
  callback: () => Promise<T>
): Promise<T> {
  // Commence une transaction
  await page.request.post('/api/test/transaction/begin');
  
  try {
    const result = await callback();
    // Commit si succès
    await page.request.post('/api/test/transaction/commit');
    return result;
  } catch (error) {
    // Rollback si erreur
    await page.request.post('/api/test/transaction/rollback');
    throw error;
  }
}

/**
 * Attend que la base de données soit prête
 */
export async function waitForDatabase(page: Page, timeout = 10000): Promise<void> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (await checkDatabaseConnection(page)) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  throw new Error('Database not ready within timeout');
}
