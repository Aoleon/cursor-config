import type { Page, APIResponse } from '@playwright/test';
import { expect } from '@playwright/test';
import { e2eSeeds } from '../fixtures/e2e/test-data';

/**
 * Helpers pour les appels API directs dans les tests
 */

/**
 * Effectue un appel GET à l'API
 */
export async function apiGet<T = any>(page: Page, endpoint: string): Promise<T> {
  const response = await page.request.get(endpoint);
  expect(response.ok()).toBeTruthy();
  
  const data = await response.json();
  return data.data || data;
}

/**
 * Effectue un appel POST à l'API
 */
export async function apiPost<T = any>(page: Page, endpoint: string, data: any): Promise<T> {
  const response = await page.request.post(endpoint, {
    data,
  });
  
  expect(response.ok()).toBeTruthy();
  
  const result = await response.json();
  return result.data || result;
}

/**
 * Effectue un appel PUT à l'API
 */
export async function apiPut<T = any>(page: Page, endpoint: string, data: any): Promise<T> {
  const response = await page.request.put(endpoint, {
    data,
  });
  
  expect(response.ok()).toBeTruthy();
  
  const result = await response.json();
  return result.data || result;
}

/**
 * Effectue un appel PATCH à l'API
 */
export async function apiPatch<T = any>(page: Page, endpoint: string, data: any): Promise<T> {
  const response = await page.request.patch(endpoint, {
    data,
  });
  
  expect(response.ok()).toBeTruthy();
  
  const result = await response.json();
  return result.data || result;
}

/**
 * Effectue un appel DELETE à l'API
 */
export async function apiDelete(page: Page, endpoint: string): Promise<void> {
  const response = await page.request.delete(endpoint);
  expect(response.ok() || response.status() === 404).toBeTruthy();
}

/**
 * Effectue un appel API sans vérifier le statut (pour tester les erreurs)
 */
export async function apiRequest(
  page: Page,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  endpoint: string,
  data?: any
): Promise<APIResponse> {
  return await page.request.fetch(endpoint, {
    method,
    data,
  });
}

/**
 * Attend qu'une ressource soit disponible via l'API
 */
export async function waitForResource<T = any>(
  page: Page,
  endpoint: string,
  predicate: (data: T) => boolean,
  timeout = 10000
): Promise<T> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    try {
      const data = await apiGet<T>(page, endpoint);
      if (predicate(data)) {
        return data;
      }
    } catch (error) {
      // Continue waiting
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  throw new Error(`Resource at ${endpoint} did not match predicate within ${timeout}ms`);
}

/**
 * Crée une ressource via l'API et retourne son ID
 */
export async function createResource(page: Page, endpoint: string, data: any): Promise<string> {
  const result = await apiPost(page, endpoint, data);
  return result.id || result._id;
}

/**
 * Met à jour une ressource via l'API
 */
export async function updateResource(page: Page, endpoint: string, id: string, data: any): Promise<void> {
  await apiPatch(page, `${endpoint}/${id}`, data);
}

/**
 * Supprime une ressource via l'API
 */
export async function deleteResource(page: Page, endpoint: string, id: string): Promise<void> {
  await apiDelete(page, `${endpoint}/${id}`);
}

/**
 * Vérifie qu'une ressource existe
 */
export async function assertResourceExists(page: Page, endpoint: string, id: string): Promise<void> {
  const response = await page.request.get(`${endpoint}/${id}`);
  expect(response.ok()).toBeTruthy();
}

/**
 * Vérifie qu'une ressource n'existe pas
 */
export async function assertResourceNotExists(page: Page, endpoint: string, id: string): Promise<void> {
  const response = await page.request.get(`${endpoint}/${id}`);
  expect(response.status()).toBe(404);
}

/**
 * Récupère tous les éléments d'une collection
 */
export async function getAllResources<T = any>(page: Page, endpoint: string): Promise<T[]> {
  const data = await apiGet<T[]>(page, endpoint);
  return Array.isArray(data) ? data : [];
}

/**
 * Compte le nombre de ressources dans une collection
 */
export async function countResources(page: Page, endpoint: string): Promise<number> {
  const resources = await getAllResources(page, endpoint);
  return resources.length;
}

/**
 * Vérifie qu'une requête API retourne une erreur
 */
export async function assertApiError(
  page: Page,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  endpoint: string,
  expectedStatus: number,
  data?: any
): Promise<void> {
  const response = await apiRequest(page, method, endpoint, data);
  expect(response.status()).toBe(expectedStatus);
}

/**
 * Effectue un upload de fichier via l'API
 */
export async function apiUploadFile(
  page: Page,
  endpoint: string,
  filePath: string,
  fieldName = 'file'
): Promise<any> {
  const response = await page.request.post(endpoint, {
    multipart: {
      [fieldName]: {
        name: filePath.split('/').pop() || 'file',
        mimeType: 'application/octet-stream',
        buffer: Buffer.from(''), // Playwright gère automatiquement
      },
    },
  });
  
  expect(response.ok()).toBeTruthy();
  return await response.json();
}

/**
 * Vérifie le health check de l'API
 */
export async function assertApiHealthy(page: Page): Promise<void> {
  const response = await page.request.get('/api/health');
  expect(response.ok()).toBeTruthy();
}

/**
 * Attend que l'API soit prête
 */
export async function waitForApiReady(page: Page, timeout = 30000): Promise<void> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    try {
      const response = await page.request.get('/api/health');
      if (response.ok()) {
        return;
      }
    } catch (error) {
      // Continue waiting
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  throw new Error('API not ready within timeout');
}

/**
 * Normalise la réponse API (gère data wrapper ou réponse directe)
 */
function normalizeApiResponse(result: any): any[] {
  if (Array.isArray(result)) {
    return result;
  }
  if (result.data && Array.isArray(result.data)) {
    return result.data;
  }
  if (result.data) {
    return [result.data];
  }
  return [];
}

/**
 * Nettoie TOUS les projets en planification
 * Utile pour garantir un état vide avant les tests
 */
export async function cleanupAllPlanificationProjects(page: Page): Promise<void> {
  const response = await page.request.get('/api/projects?status=planification');
  if (!response.ok()) return;
  
  const result = await response.json();
  const projects = normalizeApiResponse(result);
  
  for (const project of projects) {
    await deleteResource(page, '/api/projects', project.id);
  }
}

/**
 * Nettoie TOUS les projets en chantier
 * Utile pour garantir un état vide avant les tests
 */
export async function cleanupAllChantierProjects(page: Page): Promise<void> {
  const response = await page.request.get('/api/projects?status=chantier');
  if (!response.ok()) return;
  
  const result = await response.json();
  const projects = normalizeApiResponse(result);
  
  for (const project of projects) {
    await deleteResource(page, '/api/projects', project.id);
  }
}

/**
 * Reset complet de l'état E2E
 * Supprime tous les AOs, Offers et Projects de test via routes de test
 * @param page - Page Playwright
 * @param seedIds - IDs des seeds à supprimer (optionnel, sinon utilise les IDs des seeds par défaut)
 */
export async function resetE2EState(page: Page, seedIds?: {
  aos?: string[];
  offers?: string[];
  projects?: string[];
}): Promise<void> {
  const idsToDelete = seedIds || {
    aos: e2eSeeds.aos.map(ao => ao.id!),
    offers: e2eSeeds.offers.map(offer => offer.id!),
    projects: e2eSeeds.projects.map(project => project.id!)
  };

  // Supprimer AOs via route de test
  if (idsToDelete.aos) {
    await Promise.allSettled(
      idsToDelete.aos.map(id =>
        page.request.delete(`/api/test/seed/ao/${id}`)
      )
    );
  }

  // Supprimer Offers via route de test
  if (idsToDelete.offers) {
    await Promise.allSettled(
      idsToDelete.offers.map(id =>
        page.request.delete(`/api/test/seed/offer/${id}`)
      )
    );
  }

  // Supprimer Projects via route de test
  if (idsToDelete.projects) {
    await Promise.allSettled(
      idsToDelete.projects.map(id =>
        page.request.delete(`/api/test/seed/project/${id}`)
      )
    );
  }
}

/**
 * Créer les seeds E2E dans la DB via routes de test
 * Utilise /api/test/seed/* qui acceptent les IDs déterministes
 * @param page - Page Playwright
 * @param seeds - Données des seeds à créer (optionnel, utilise e2eSeeds par défaut)
 */
export async function seedE2EData(page: Page, seeds?: {
  aos?: any[];
  offers?: any[];
  projects?: any[];
}): Promise<void> {
  const seedsToUse = seeds || e2eSeeds;

  // Créer AOs via route de test
  if (seedsToUse.aos) {
    const aoResults = await Promise.allSettled(
      seedsToUse.aos.map(ao =>
        page.request.post('/api/test/seed/ao', { data: ao })
      )
    );
    
    // Vérifier succès
    aoResults.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.ok()) {
        console.log(`✅ AO seed created: ${seedsToUse.aos![index].id}`);
      } else {
        console.error(`❌ Failed to seed AO: ${seedsToUse.aos![index].id}`, result);
      }
    });
  }

  // Créer Offers via route de test
  if (seedsToUse.offers) {
    const offerResults = await Promise.allSettled(
      seedsToUse.offers.map(offer =>
        page.request.post('/api/test/seed/offer', { data: offer })
      )
    );
    
    // Vérifier succès
    offerResults.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.ok()) {
        console.log(`✅ Offer seed created: ${seedsToUse.offers![index].id}`);
      } else {
        console.error(`❌ Failed to seed Offer: ${seedsToUse.offers![index].id}`, result);
      }
    });
  }

  // Créer Projects via route de test
  if (seedsToUse.projects) {
    const projectResults = await Promise.allSettled(
      seedsToUse.projects.map(project =>
        page.request.post('/api/test/seed/project', { data: project })
      )
    );
    
    // Vérifier succès
    projectResults.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.ok()) {
        console.log(`✅ Project seed created: ${seedsToUse.projects![index].id}`);
      } else {
        console.error(`❌ Failed to seed Project: ${seedsToUse.projects![index].id}`, result);
      }
    });
  }
}
