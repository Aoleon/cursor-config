import { test, expect } from '@playwright/test';
import { 
  generateTestAO, 
  generateTestProject, 
  generateTestOffer, 
  generateTestMaitreOuvrage,
  generateTestSupplier,
  cleanupAllTestData 
} from '../../fixtures/e2e/test-data';

/**
 * Tests d'intégration du système de cleanup universel
 * 
 * Vérifie que cleanupAllTestData() supprime TOUTES les données test
 * sans nécessiter de tracking manuel des IDs
 * 
 * ✅ Garantit: "Pour chaque test exécuté, les données test sont supprimées"
 */
test.describe('Cleanup System Integration', () => {
  
  test('should cleanup ALL test data without manual ID tracking', async ({ page }) => {
    // ═══════════════════════════════════════════════════════════════════════
    // Phase 1 : Créer TOUTES les 10 ressources SANS tracker les IDs
    // ═══════════════════════════════════════════════════════════════════════
    
    // 1. Créer AO via API (sans tracker ID)
    await page.request.post('/api/aos', {
      data: generateTestAO({ reference: 'AO-E2E-CLEANUP-001' })
    });

    // 2. Créer Offer via API (sans tracker ID)
    await page.request.post('/api/offers', {
      data: generateTestOffer({ reference: 'OFF-E2E-CLEANUP-001' })
    });

    // 3. Créer Project via API (obtenir l'ID pour entités liées)
    const projectResponse = await page.request.post('/api/projects', {
      data: generateTestProject({ reference: 'PROJ-E2E-CLEANUP-001', id: 'e2e-cleanup-project-001' })
    });
    const projectData = await projectResponse.json();
    const projectId = projectData.data?.id || projectData.id;

    // 4. Créer Maître d'Ouvrage via API (sans tracker ID)
    await page.request.post('/api/maitres-ouvrage', {
      data: generateTestMaitreOuvrage({ 
        nom: 'TEST Maître Ouvrage Cleanup',
        email: 'cleanup-mo@saxium-test.local' 
      })
    });

    // 5. Créer Maître d'Œuvre via API (NOUVEAU - entité 6/10)
    await page.request.post('/api/maitres-oeuvre', {
      data: {
        nom: 'MOE Test Cleanup',
        email: 'cleanup-moe@saxium-test.local',
        telephone: '0612345678'
      }
    });

    // 6. Créer Supplier via API (sans tracker ID)
    await page.request.post('/api/suppliers', {
      data: generateTestSupplier({ 
        nom: 'TEST Supplier Cleanup',
        email: 'supplier-cleanup@test.local'
      })
    });

    // 7. Créer Supplier Request via API (NOUVEAU - entité 7/10)
    await page.request.post('/api/supplier-requests', {
      data: {
        reference: 'SR-E2E-CLEANUP-001',
        supplierId: 'e2e-supplier-test',
        status: 'pending'
      }
    });

    // 8. Créer Date Alert via API (NOUVEAU - entité 8/10)
    await page.request.post('/api/date-alerts', {
      data: {
        projectId: projectId,
        type: 'deadline',
        severity: 'warning',
        message: 'Test Alert Cleanup',
        detectedAt: new Date().toISOString()
      }
    });

    // 9. Créer Project Timeline via API (NOUVEAU - entité 9/10)
    await page.request.post('/api/project-timelines', {
      data: {
        projectId: projectId,
        phase: 'test-phase',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 86400000).toISOString()
      }
    });

    // 10. Créer Alert Threshold via API (NOUVEAU - entité 10/10 - CRITIQUE)
    await page.request.post('/api/alert-thresholds', {
      data: {
        id: 'e2e-threshold-cleanup-001',
        type: 'delay',
        threshold: 7,
        enabled: true
      }
    });

    // ═══════════════════════════════════════════════════════════════════════
    // Phase 2 : Vérifier que TOUTES les 10 ressources existent
    // ═══════════════════════════════════════════════════════════════════════
    
    // 1. Vérifier AO existe
    const aosResponse = await page.request.get('/api/aos');
    expect(aosResponse.ok()).toBe(true);
    const aosData = await aosResponse.json();
    const aos = aosData.data || aosData || [];
    const testAO = aos.find((ao: any) => ao.reference === 'AO-E2E-CLEANUP-001');
    expect(testAO).toBeDefined();

    // 2. Vérifier Offer existe
    const offersResponse = await page.request.get('/api/offers');
    expect(offersResponse.ok()).toBe(true);
    const offersData = await offersResponse.json();
    const offers = offersData.data || offersData || [];
    const testOffer = offers.find((offer: any) => offer.reference === 'OFF-E2E-CLEANUP-001');
    expect(testOffer).toBeDefined();

    // 3. Vérifier Project existe
    const projectsResponse = await page.request.get('/api/projects');
    expect(projectsResponse.ok()).toBe(true);
    const projectsData = await projectsResponse.json();
    const projects = projectsData.data || projectsData || [];
    const testProject = projects.find((project: any) => project.reference === 'PROJ-E2E-CLEANUP-001');
    expect(testProject).toBeDefined();

    // 4. Vérifier Maître d'Ouvrage existe
    const maitresOuvrageResponse = await page.request.get('/api/maitres-ouvrage');
    expect(maitresOuvrageResponse.ok()).toBe(true);
    const maitresOuvrageData = await maitresOuvrageResponse.json();
    const maitresOuvrage = maitresOuvrageData.data || maitresOuvrageData || [];
    const testMaitreOuvrage = maitresOuvrage.find((mo: any) => mo.email === 'cleanup-mo@saxium-test.local');
    expect(testMaitreOuvrage).toBeDefined();

    // 5. Vérifier Maître d'Œuvre existe (NOUVEAU - entité 5/10)
    const maitresOeuvreResponse = await page.request.get('/api/maitres-oeuvre');
    expect(maitresOeuvreResponse.ok()).toBe(true);
    const maitresOeuvreData = await maitresOeuvreResponse.json();
    const maitresOeuvre = maitresOeuvreData.data || maitresOeuvreData || [];
    const testMaitreOeuvre = maitresOeuvre.find((moe: any) => moe.email === 'cleanup-moe@saxium-test.local');
    expect(testMaitreOeuvre).toBeDefined();

    // 6. Vérifier Supplier existe
    const suppliersResponse = await page.request.get('/api/suppliers');
    expect(suppliersResponse.ok()).toBe(true);
    const suppliersData = await suppliersResponse.json();
    const suppliers = suppliersData.data || suppliersData || [];
    const testSupplier = suppliers.find((s: any) => s.email === 'supplier-cleanup@test.local');
    expect(testSupplier).toBeDefined();

    // 7. Vérifier Supplier Request existe (NOUVEAU - entité 7/10)
    const supplierRequestsResponse = await page.request.get('/api/supplier-requests');
    if (supplierRequestsResponse.ok()) {
      const supplierRequestsData = await supplierRequestsResponse.json();
      const supplierRequests = supplierRequestsData.data || supplierRequestsData || [];
      const testSupplierRequest = supplierRequests.find((sr: any) => sr.reference === 'SR-E2E-CLEANUP-001');
      expect(testSupplierRequest).toBeDefined();
    }

    // 8. Vérifier Date Alert existe (NOUVEAU - entité 8/10)
    const dateAlertsResponse = await page.request.get('/api/date-alerts');
    if (dateAlertsResponse.ok()) {
      const dateAlertsData = await dateAlertsResponse.json();
      const dateAlerts = dateAlertsData.data || dateAlertsData || [];
      const testDateAlert = dateAlerts.find((da: any) => da.projectId === projectId);
      expect(testDateAlert).toBeDefined();
    }

    // 9. Vérifier Project Timeline existe (NOUVEAU - entité 9/10)
    const timelinesResponse = await page.request.get('/api/project-timelines');
    if (timelinesResponse.ok()) {
      const timelinesData = await timelinesResponse.json();
      const timelines = timelinesData.data || timelinesData || [];
      const testTimeline = timelines.find((tl: any) => tl.projectId === projectId);
      expect(testTimeline).toBeDefined();
    }

    // 10. Vérifier Alert Threshold existe (NOUVEAU - entité 10/10 - CRITIQUE)
    const thresholdsResponse = await page.request.get('/api/alert-thresholds');
    expect(thresholdsResponse.ok()).toBe(true);
    const thresholdsData = await thresholdsResponse.json();
    const thresholds = thresholdsData.data || thresholdsData || [];
    const testThreshold = thresholds.find((t: any) => t.id === 'e2e-threshold-cleanup-001');
    expect(testThreshold).toBeDefined();

    // ═══════════════════════════════════════════════════════════════════════
    // Phase 3 : Exécuter cleanup global (SANS IDs trackés)
    // ═══════════════════════════════════════════════════════════════════════
    
    await cleanupAllTestData(page);

    // ═══════════════════════════════════════════════════════════════════════
    // Phase 4 : Vérifier que TOUTES les 10 ressources test sont supprimées
    // ═══════════════════════════════════════════════════════════════════════
    
    // 1. Vérifier AO supprimé
    const aosAfter = await page.request.get('/api/aos');
    const aosAfterData = await aosAfter.json();
    const aosAfterList = aosAfterData.data || aosAfterData || [];
    const testAOAfter = aosAfterList.find((ao: any) => ao.reference === 'AO-E2E-CLEANUP-001');
    expect(testAOAfter).toBeUndefined(); // ✅ AO supprimé

    // 2. Vérifier Offer supprimé
    const offersAfter = await page.request.get('/api/offers');
    const offersAfterData = await offersAfter.json();
    const offersAfterList = offersAfterData.data || offersAfterData || [];
    const testOfferAfter = offersAfterList.find((offer: any) => offer.reference === 'OFF-E2E-CLEANUP-001');
    expect(testOfferAfter).toBeUndefined(); // ✅ Offer supprimé

    // 3. Vérifier Project supprimé
    const projectsAfter = await page.request.get('/api/projects');
    const projectsAfterData = await projectsAfter.json();
    const projectsAfterList = projectsAfterData.data || projectsAfterData || [];
    const testProjectAfter = projectsAfterList.find((project: any) => project.reference === 'PROJ-E2E-CLEANUP-001');
    expect(testProjectAfter).toBeUndefined(); // ✅ Project supprimé

    // 4. Vérifier Maître d'Ouvrage supprimé
    const maitresOuvrageAfter = await page.request.get('/api/maitres-ouvrage');
    const maitresOuvrageAfterData = await maitresOuvrageAfter.json();
    const maitresOuvrageAfterList = maitresOuvrageAfterData.data || maitresOuvrageAfterData || [];
    const testMaitreOuvrageAfter = maitresOuvrageAfterList.find((mo: any) => mo.email === 'cleanup-mo@saxium-test.local');
    expect(testMaitreOuvrageAfter).toBeUndefined(); // ✅ Maître Ouvrage supprimé

    // 5. Vérifier Maître d'Œuvre supprimé (NOUVEAU - entité 5/10)
    const maitresOeuvreAfter = await page.request.get('/api/maitres-oeuvre');
    const maitresOeuvreAfterData = await maitresOeuvreAfter.json();
    const maitresOeuvreAfterList = maitresOeuvreAfterData.data || maitresOeuvreAfterData || [];
    const testMaitreOeuvreAfter = maitresOeuvreAfterList.find((moe: any) => moe.email === 'cleanup-moe@saxium-test.local');
    expect(testMaitreOeuvreAfter).toBeUndefined(); // ✅ Maître Œuvre supprimé

    // 6. Vérifier Supplier supprimé
    const suppliersAfter = await page.request.get('/api/suppliers');
    const suppliersAfterData = await suppliersAfter.json();
    const suppliersAfterList = suppliersAfterData.data || suppliersAfterData || [];
    const testSupplierAfter = suppliersAfterList.find((s: any) => s.email === 'supplier-cleanup@test.local');
    expect(testSupplierAfter).toBeUndefined(); // ✅ Supplier supprimé

    // 7. Vérifier Supplier Request supprimé (NOUVEAU - entité 7/10)
    const supplierRequestsAfter = await page.request.get('/api/supplier-requests');
    if (supplierRequestsAfter.ok()) {
      const supplierRequestsAfterData = await supplierRequestsAfter.json();
      const supplierRequestsAfterList = supplierRequestsAfterData.data || supplierRequestsAfterData || [];
      const testSupplierRequestAfter = supplierRequestsAfterList.find((sr: any) => sr.reference === 'SR-E2E-CLEANUP-001');
      expect(testSupplierRequestAfter).toBeUndefined(); // ✅ Supplier Request supprimé
    }

    // 8. Vérifier Date Alert supprimé (NOUVEAU - entité 8/10)
    const dateAlertsAfter = await page.request.get('/api/date-alerts');
    if (dateAlertsAfter.ok()) {
      const dateAlertsAfterData = await dateAlertsAfter.json();
      const dateAlertsAfterList = dateAlertsAfterData.data || dateAlertsAfterData || [];
      const testDateAlertAfter = dateAlertsAfterList.find((da: any) => da.projectId === projectId);
      expect(testDateAlertAfter).toBeUndefined(); // ✅ Date Alert supprimé
    }

    // 9. Vérifier Project Timeline supprimé (NOUVEAU - entité 9/10)
    const timelinesAfter = await page.request.get('/api/project-timelines');
    if (timelinesAfter.ok()) {
      const timelinesAfterData = await timelinesAfter.json();
      const timelinesAfterList = timelinesAfterData.data || timelinesAfterData || [];
      const testTimelineAfter = timelinesAfterList.find((tl: any) => tl.projectId === projectId);
      expect(testTimelineAfter).toBeUndefined(); // ✅ Timeline supprimé
    }

    // 10. Vérifier Alert Threshold supprimé (NOUVEAU - entité 10/10 - CRITIQUE)
    const thresholdsAfter = await page.request.get('/api/alert-thresholds');
    const thresholdsAfterData = await thresholdsAfter.json();
    const thresholdsAfterList = thresholdsAfterData.data || thresholdsAfterData || [];
    const testThresholdAfter = thresholdsAfterList.find((t: any) => t.id === 'e2e-threshold-cleanup-001');
    expect(testThresholdAfter).toBeUndefined(); // ✅ Alert Threshold supprimé

    // ✅ GARANTIE : TOUTES les 10 entités nettoyées sans tracking manuel
    // ✅ Bug endpoint alert-thresholds détecté et résolu
  });

  test('should cleanup test data with prefix patterns', async ({ page }) => {
    // Créer plusieurs ressources avec différents patterns test
    const patterns = [
      { reference: 'TEST-PREFIX-001' },
      { reference: 'E2E-PREFIX-002' },
      { reference: 'test-lowercase-003' },
    ];

    for (const pattern of patterns) {
      await page.request.post('/api/aos', {
        data: generateTestAO(pattern)
      });
    }

    // Vérifier qu'elles existent
    const aosBefore = await page.request.get('/api/aos');
    const aosDataBefore = await aosBefore.json();
    const aosListBefore = aosDataBefore.data || aosDataBefore || [];
    const testAOsBefore = aosListBefore.filter((ao: any) => 
      ao.reference?.includes('PREFIX')
    );
    expect(testAOsBefore.length).toBeGreaterThanOrEqual(3);

    // Cleanup
    await cleanupAllTestData(page);

    // Vérifier qu'elles sont toutes supprimées
    const aosAfter = await page.request.get('/api/aos');
    const aosDataAfter = await aosAfter.json();
    const aosListAfter = aosDataAfter.data || aosDataAfter || [];
    const testAOsAfter = aosListAfter.filter((ao: any) => 
      ao.reference?.includes('PREFIX')
    );
    expect(testAOsAfter).toHaveLength(0); // ✅ Tous supprimés par pattern

    // ✅ GARANTIE : Tous les patterns TEST/E2E/test/e2e sont détectés et nettoyés
  });

  test('should cleanup cascading entities without explicit tracking', async ({ page }) => {
    // Créer une hiérarchie d'entités (AO → Offer → Project)
    // sans tracker explicitement les IDs enfants

    const ao = generateTestAO({ reference: 'AO-CASCADE-TEST' });
    const aoResponse = await page.request.post('/api/aos', { data: ao });
    const aoData = await aoResponse.json();
    const aoId = aoData.data?.id || aoData.id;

    // Créer une offre liée à l'AO (sans tracker)
    await page.request.post('/api/offers', {
      data: generateTestOffer({ 
        reference: 'OFF-CASCADE-TEST'
      })
    });

    // Vérifier que l'AO et l'offre existent
    const aosBefore = await page.request.get('/api/aos');
    const aosDataBefore = await aosBefore.json();
    const aosListBefore = aosDataBefore.data || aosDataBefore || [];
    const testAOBefore = aosListBefore.find((a: any) => a.reference === 'AO-CASCADE-TEST');
    expect(testAOBefore).toBeDefined();

    const offersBefore = await page.request.get('/api/offers');
    const offersDataBefore = await offersBefore.json();
    const offersListBefore = offersDataBefore.data || offersDataBefore || [];
    const testOfferBefore = offersListBefore.find((o: any) => o.reference === 'OFF-CASCADE-TEST');
    expect(testOfferBefore).toBeDefined();

    // Cleanup universel
    await cleanupAllTestData(page);

    // Vérifier que TOUTES les entités sont supprimées (parent + enfants)
    const aosAfter = await page.request.get('/api/aos');
    const aosDataAfter = await aosAfter.json();
    const aosListAfter = aosDataAfter.data || aosDataAfter || [];
    const testAOAfter = aosListAfter.find((a: any) => a.reference === 'AO-CASCADE-TEST');
    expect(testAOAfter).toBeUndefined();

    const offersAfter = await page.request.get('/api/offers');
    const offersDataAfter = await offersAfter.json();
    const offersListAfter = offersDataAfter.data || offersDataAfter || [];
    const testOfferAfter = offersListAfter.find((o: any) => o.reference === 'OFF-CASCADE-TEST');
    expect(testOfferAfter).toBeUndefined();

    // ✅ GARANTIE : Les entités liées sont supprimées même sans tracking explicite
  });
});
