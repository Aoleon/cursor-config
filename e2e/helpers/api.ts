import type { Page, APIResponse } from '@playwright/test';
import { expect } from '@playwright/test';

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
