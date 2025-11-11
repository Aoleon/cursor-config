/**
 * Test E2E - Workflow Checklist BE
 * 
 * Teste le workflow complet de checklist BE :
 * 1. Initialisation de la checklist
 * 2. Vérification des items
 * 3. Validation pour fin d'études
 */

import { test, expect } from '@playwright/test';
import { apiPost, apiGet, apiPatch, waitForApiReady } from '../helpers/api';

test.describe('BE Checklist Workflow', () => {
  let offerId: string;
  let checklistItemId: string;

  test.beforeAll(async ({ page }) => {
    // Attendre que l'API soit prête
    await waitForApiReady(page);
    
    // Créer une offre de test
    const offer = await apiPost(page, '/api/offers', {
      aoId: 'ao-test-1',
      reference: 'OFF-TEST-001',
      client: 'Test Client',
      location: 'Paris',
      status: 'en_etude'
    });
    offerId = offer.id;
  });

  test('should initialize checklist', async ({ page }) => {
    const items = await apiPost(page, `/api/offers/${offerId}/be-checklist/initialize`, {});

    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBeGreaterThan(0);
    expect(items.some((item: any) => item.itemType === 'nuancier')).toBe(true);
    checklistItemId = items[0].id;
  });

  test('should check checklist item', async ({ page }) => {
    const updated = await apiPatch(page, `/api/offers/${offerId}/be-checklist/${checklistItemId}`, {
      status: 'conforme',
      notes: 'Nuancier validé par le client'
    });

    expect(updated.status).toBe('conforme');
    expect(updated.checkedBy).toBeTruthy();
  });

  test('should validate checklist for fin d\'études', async ({ page }) => {
    // Vérifier que tous les items critiques sont conformes
    const checklist = await apiGet(page, `/api/offers/${offerId}/be-checklist`);
    
    // Marquer tous les items critiques comme conformes
    for (const item of checklist.items) {
      if (item.isCritical && item.status !== 'conforme') {
        await apiPatch(page, `/api/offers/${offerId}/be-checklist/${item.id}`, {
          status: 'conforme'
        });
      }
    }

    // Vérifier que la validation est possible
    const canValidate = await apiGet(page, `/api/offers/${offerId}/be-checklist/can-validate-fin-etudes`);
    expect(canValidate.canValidate).toBe(true);
  });
});

