import { test, expect } from '@playwright/test';
import { resetE2EState, seedE2EData } from '../helpers/api';
import { e2eSeeds } from '../fixtures/e2e/test-data';

test.describe('E2E Seed Validation - Fix Critique Tâche 7.1', () => {
  test('Flow complet reset → seed → verify → reset fonctionne avec insert schemas', async ({ page }) => {
    // ========================================
    // ÉTAPE 1 : Reset initial (nettoie tout état précédent)
    // ========================================
    console.log('🔄 STEP 1: Reset E2E state...');
    await resetE2EState(page);
    console.log('✅ Reset initial completed');

    // ========================================
    // ÉTAPE 2 : Seed des données E2E avec IDs déterministes
    // ========================================
    console.log('\n📦 STEP 2: Seeding E2E data...');
    await seedE2EData(page);
    console.log('✅ Seeding completed');

    // ========================================
    // ÉTAPE 3 : Vérifier que les données ont été créées avec les bons IDs
    // ========================================
    console.log('\n🔍 STEP 3: Verifying created data...');
    
    // Vérifier AOs
    for (const ao of e2eSeeds.aos) {
      const response = await page.request.get(`/api/aos/${ao.id}`);
      expect(response.ok(), `AO ${ao.id} should exist`).toBeTruthy();
      
      const data = await response.json();
      expect(data.data?.id || data.id).toBe(ao.id);
      console.log(`✅ AO verified: ${ao.id}`);
    }

    // Vérifier Offers
    for (const offer of e2eSeeds.offers) {
      const response = await page.request.get(`/api/offers/${offer.id}`);
      expect(response.ok(), `Offer ${offer.id} should exist`).toBeTruthy();
      
      const data = await response.json();
      expect(data.data?.id || data.id).toBe(offer.id);
      console.log(`✅ Offer verified: ${offer.id}`);
    }

    // Vérifier Projects
    for (const project of e2eSeeds.projects) {
      const response = await page.request.get(`/api/projects/${project.id}`);
      expect(response.ok(), `Project ${project.id} should exist`).toBeTruthy();
      
      const data = await response.json();
      expect(data.data?.id || data.id).toBe(project.id);
      console.log(`✅ Project verified: ${project.id}`);
    }

    console.log('\n✅ All data verified successfully');

    // ========================================
    // ÉTAPE 4 : Reset final (nettoyage)
    // ========================================
    console.log('\n🧹 STEP 4: Final cleanup...');
    await resetE2EState(page);
    console.log('✅ Final reset completed');

    // ========================================
    // ÉTAPE 5 : Vérifier que les données ont été supprimées
    // ========================================
    console.log('\n🔍 STEP 5: Verifying data deletion...');
    
    for (const ao of e2eSeeds.aos) {
      const response = await page.request.get(`/api/aos/${ao.id}`);
      expect(response.status()).toBe(404);
      console.log(`✅ AO deleted: ${ao.id}`);
    }

    for (const offer of e2eSeeds.offers) {
      const response = await page.request.get(`/api/offers/${offer.id}`);
      expect(response.status()).toBe(404);
      console.log(`✅ Offer deleted: ${offer.id}`);
    }

    for (const project of e2eSeeds.projects) {
      const response = await page.request.get(`/api/projects/${project.id}`);
      expect(response.status()).toBe(404);
      console.log(`✅ Project deleted: ${project.id}`);
    }

    console.log('\n🎉 SUCCESS: Flow complet validé avec insert schemas !');
  });

  test('Routes de seed utilisent insert schemas et validations Zod', async ({ page }) => {
    console.log('🔍 Vérification validation insert schemas...');

    // Tester avec des données incomplètes pour vérifier que les defaults sont appliqués
    const testAOMinimal = {
      id: 'e2e-test-minimal-001',
      reference: 'AO-MINIMAL-001',
      client: 'Client Minimal',
      location: 'Paris',
      // Volontairement omettre menuiserieType et source pour tester les defaults
    };

    const response = await page.request.post('/api/test/seed/ao', {
      data: testAOMinimal
    });

    expect(response.ok(), 'Insert avec defaults devrait réussir').toBeTruthy();
    
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.id).toBe('e2e-test-minimal-001');
    
    // Vérifier que les defaults ont été appliqués
    expect(data.data.menuiserieType).toBeDefined();
    expect(data.data.source).toBeDefined();
    
    console.log('✅ Insert schema defaults appliqués correctement');

    // Cleanup
    await page.request.delete(`/api/test/seed/ao/${testAOMinimal.id}`);
    console.log('✅ Cleanup completed');
  });

  test('Routes de seed rejettent les IDs non-E2E', async ({ page }) => {
    console.log('🔍 Vérification validation IDs E2E...');

    const invalidAO = {
      id: 'invalid-id-123', // Ne commence pas par 'e2e-'
      reference: 'AO-INVALID-001',
      client: 'Client Invalid',
      location: 'Paris',
    };

    const response = await page.request.post('/api/test/seed/ao', {
      data: invalidAO
    });

    expect(response.status()).toBe(400);
    console.log('✅ ID non-E2E correctement rejeté');
  });
});
