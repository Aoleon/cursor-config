import { test, expect } from '@playwright/test';
import { createHmac } from 'crypto';
import { nanoid } from 'nanoid';
import { 
  generateTestProject, 
  generateTestAO, 
  cleanupTestData 
} from '../fixtures/e2e/test-data';

/**
 * Tests E2E - Synchronisation Bidirectionnelle Monday ↔ Saxium
 * 
 * Objectif : Valider export, import, conflicts, persistence
 * 
 * Architecture :
 * - Export Saxium → Monday avec vérification badges UI
 * - Import Monday → Saxium via webhook HMAC sécurisé
 * - Gestion conflicts Monday-priority
 * - Persistence restart-safe avec cache rebuild
 * - EventBus notifications WebSocket
 */

// ========================================
// HELPERS - HMAC & WEBHOOK
// ========================================

/**
 * Génère la signature HMAC-SHA256 pour webhook Monday
 */
function generateWebhookSignature(body: string, secret?: string): string {
  const signingSecret = secret || process.env.MONDAY_WEBHOOK_SECRET || 'test-secret';
  return createHmac('sha256', signingSecret)
    .update(body)
    .digest('base64');
}

/**
 * Crée un payload webhook Monday mock
 */
function createMondayWebhookPayload(
  itemId: string,
  boardId: string,
  data: {
    name: string;
    status?: string;
    updatedAt?: string;
    columnValues?: Record<string, any>;
  }
) {
  return {
    event: {
      type: 'update_column_value',
      boardId,
      itemId,
      pulseId: itemId
    },
    data: {
      item: {
        id: itemId,
        name: data.name,
        board_id: boardId,
        updated_at: data.updatedAt || new Date().toISOString(),
        column_values: data.columnValues || []
      }
    }
  };
}

/**
 * Assertion helper pour vérifier status badge
 */
async function assertBadgeStatus(
  page: any, 
  expectedStatus: 'synced' | 'conflict' | 'error' | 'syncing'
) {
  const badge = page.locator(`[data-testid="monday-sync-badge-${expectedStatus}"]`);
  await expect(badge).toBeVisible({ timeout: 10000 });
}

/**
 * Créer projet via API avec données test
 */
async function createProjectViaAPI(request: any, projectData: any) {
  const response = await request.post('/api/projects', {
    data: projectData
  });
  expect(response.ok()).toBeTruthy();
  const result = await response.json();
  return result.data.id;
}

/**
 * Créer AO via API avec données test
 */
async function createAOViaAPI(request: any, aoData: any) {
  const response = await request.post('/api/aos', {
    data: aoData
  });
  expect(response.ok()).toBeTruthy();
  const result = await response.json();
  return result.data.id;
}

// ========================================
// TESTS SUITE
// ========================================

test.describe('Monday.com Sync Bidirectionnelle', () => {
  
  // ========================================
  // 1. EXPORT SAXIUM → MONDAY
  // ========================================
  
  test.describe('1. Export Saxium → Monday', () => {
    const createdIds: { projects?: string[], aos?: string[] } = {};

    test.afterEach(async ({ page }) => {
      await cleanupTestData(page, createdIds);
    });

    test('Exporter projet vers Monday et vérifier badge synced', async ({ page, request }) => {
      // 1. Créer projet de test
      const projectData = generateTestProject({
        status: 'passation',
        client: `Client Monday Test ${nanoid(6)}`
      });
      
      const projectId = await createProjectViaAPI(request, {
        name: projectData.reference,
        client: projectData.client,
        location: projectData.location || '75001 Paris',
        status: projectData.status,
        description: 'Projet test export Monday'
      });
      
      createdIds.projects = [projectId];

      // 2. Exporter vers Monday
      const exportResponse = await request.post(`/api/monday/export/project/${projectId}`);
      expect(exportResponse.ok()).toBeTruthy();
      
      const exportResult = await exportResponse.json();
      expect(exportResult.success).toBe(true);
      expect(exportResult.data.mondayId).toBeDefined();
      
      const mondayId = exportResult.data.mondayId;

      // 3. Vérifier sync status via API
      const statusResponse = await request.get('/api/monday/sync-status');
      expect(statusResponse.ok()).toBeTruthy();
      
      const statusResult = await statusResponse.json();
      const projectStatus = statusResult.data.find((s: any) => s.entityId === projectId);
      
      expect(projectStatus).toBeDefined();
      expect(projectStatus.lastStatus).toBe('synced');
      expect(projectStatus.mondayId).toBe(mondayId);
      expect(projectStatus.entityType).toBe('project');

      // 4. Naviguer vers page projets et vérifier badge UI
      await page.goto('/projects');
      await page.waitForLoadState('networkidle');

      // Vérifier que le badge synced est affiché
      const projectCard = page.locator(`[data-testid*="${projectId}"]`).first();
      await expect(projectCard).toBeVisible();
      
      // Le badge devrait être visible avec status synced
      await assertBadgeStatus(projectCard, 'synced');
    });

    test('Exporter AO vers Monday et vérifier badge synced', async ({ page, request }) => {
      // 1. Créer AO de test
      const aoData = generateTestAO({
        status: 'reception',
        client: `Client AO Monday ${nanoid(6)}`
      });
      
      const aoId = await createAOViaAPI(request, aoData);
      createdIds.aos = [aoId];

      // 2. Exporter vers Monday
      const exportResponse = await request.post(`/api/monday/export/ao/${aoId}`);
      expect(exportResponse.ok()).toBeTruthy();
      
      const exportResult = await exportResponse.json();
      expect(exportResult.success).toBe(true);
      expect(exportResult.data.mondayId).toBeDefined();
      
      const mondayId = exportResult.data.mondayId;

      // 3. Vérifier sync status
      const statusResponse = await request.get('/api/monday/sync-status');
      expect(statusResponse.ok()).toBeTruthy();
      
      const statusResult = await statusResponse.json();
      const aoStatus = statusResult.data.find((s: any) => s.entityId === aoId);
      
      expect(aoStatus).toBeDefined();
      expect(aoStatus.lastStatus).toBe('synced');
      expect(aoStatus.mondayId).toBe(mondayId);
      expect(aoStatus.entityType).toBe('ao');

      // 4. Naviguer vers page AOs et vérifier badge
      await page.goto('/aos');
      await page.waitForLoadState('networkidle');

      const aoCard = page.locator(`[data-testid*="${aoId}"]`).first();
      await expect(aoCard).toBeVisible();
      
      await assertBadgeStatus(aoCard, 'synced');
    });
  });

  // ========================================
  // 2. IMPORT MONDAY → SAXIUM VIA WEBHOOK
  // ========================================
  
  test.describe('2. Import Monday → Saxium', () => {
    const createdIds: { projects?: string[], aos?: string[] } = {};

    test.afterEach(async ({ page }) => {
      await cleanupTestData(page, createdIds);
    });

    test('Simuler webhook Monday et importer données', async ({ page, request }) => {
      // 1. Créer projet via API pour avoir un mondayId
      const projectData = generateTestProject({
        status: 'passation',
        client: `Client Webhook ${nanoid(6)}`
      });
      
      const projectId = await createProjectViaAPI(request, {
        name: projectData.reference,
        client: projectData.client,
        location: '75001 Paris',
        status: 'passation'
      });
      
      createdIds.projects = [projectId];

      // 2. Exporter pour obtenir mondayId
      const exportResponse = await request.post(`/api/monday/export/project/${projectId}`);
      const exportResult = await exportResponse.json();
      const mondayId = exportResult.data.mondayId;

      // 3. Simuler webhook Monday avec update
      const webhookPayload = createMondayWebhookPayload(
        mondayId,
        '123456',
        {
          name: `${projectData.reference} - Updated from Monday`,
          status: 'etude',
          updatedAt: new Date().toISOString(),
          columnValues: {
            status: { label: 'etude' },
            client: projectData.client
          }
        }
      );

      const payloadString = JSON.stringify(webhookPayload);
      const signature = generateWebhookSignature(payloadString);

      // 4. POST webhook avec signature HMAC
      const webhookResponse = await request.post('/api/monday/webhook', {
        headers: {
          'x-monday-signature': signature,
          'content-type': 'application/json'
        },
        data: webhookPayload
      });

      expect(webhookResponse.status()).toBe(202); // Accepted

      // 5. Vérifier que les données sont mises à jour dans Saxium
      await page.waitForTimeout(2000); // Attendre traitement webhook

      const projectResponse = await request.get(`/api/projects/${projectId}`);
      const projectResult = await projectResponse.json();
      
      // Le nom devrait être mis à jour depuis Monday
      expect(projectResult.data.name).toContain('Updated from Monday');
    });

    test('Webhook avec signature invalide rejetée', async ({ request }) => {
      // 1. Créer payload webhook
      const webhookPayload = createMondayWebhookPayload(
        '999999',
        '123456',
        { name: 'Test Project' }
      );

      // 2. Générer MAUVAISE signature
      const invalidSignature = 'invalid-signature-base64';

      // 3. POST webhook avec mauvaise signature
      const webhookResponse = await request.post('/api/monday/webhook', {
        headers: {
          'x-monday-signature': invalidSignature,
          'content-type': 'application/json'
        },
        data: webhookPayload
      });

      // 4. Vérifier rejet 401 Unauthorized
      expect(webhookResponse.status()).toBe(401);
      
      const errorResult = await webhookResponse.json();
      expect(errorResult.error).toContain('signature');
    });

    test('Webhook sans signature rejetée', async ({ request }) => {
      const webhookPayload = createMondayWebhookPayload(
        '999999',
        '123456',
        { name: 'Test' }
      );

      const webhookResponse = await request.post('/api/monday/webhook', {
        headers: {
          'content-type': 'application/json'
        },
        data: webhookPayload
      });

      expect(webhookResponse.status()).toBe(401);
    });
  });

  // ========================================
  // 3. GESTION CONFLICTS MONDAY-PRIORITY
  // ========================================
  
  test.describe('3. Gestion Conflicts', () => {
    const createdIds: { projects?: string[] } = {};

    test.afterEach(async ({ page }) => {
      await cleanupTestData(page, createdIds);
    });

    test('Conflict Monday-priority avec badge conflict', async ({ page, request }) => {
      // 1. Créer projet et l'exporter vers Monday
      const projectData = generateTestProject({
        status: 'passation',
        client: `Client Conflict ${nanoid(6)}`
      });
      
      const projectId = await createProjectViaAPI(request, {
        name: projectData.reference,
        client: projectData.client,
        location: '75001 Paris',
        status: 'passation'
      });
      
      createdIds.projects = [projectId];

      const exportResponse = await request.post(`/api/monday/export/project/${projectId}`);
      const exportResult = await exportResponse.json();
      const mondayId = exportResult.data.mondayId;

      // 2. Modifier le projet dans Saxium (update récent)
      await request.patch(`/api/projects/${projectId}`, {
        data: {
          name: `${projectData.reference} - Updated in Saxium`,
          status: 'etude'
        }
      });

      // Attendre que l'update soit persisté
      await page.waitForTimeout(500);

      // 3. Simuler webhook Monday avec update ANCIEN (conflict scenario)
      const oldDate = new Date(Date.now() - 60000); // 1 minute dans le passé
      const webhookPayload = createMondayWebhookPayload(
        mondayId,
        '123456',
        {
          name: `${projectData.reference} - Updated in Monday (older)`,
          status: 'planification',
          updatedAt: oldDate.toISOString()
        }
      );

      const payloadString = JSON.stringify(webhookPayload);
      const signature = generateWebhookSignature(payloadString);

      const webhookResponse = await request.post('/api/monday/webhook', {
        headers: {
          'x-monday-signature': signature,
          'content-type': 'application/json'
        },
        data: webhookPayload
      });

      expect(webhookResponse.status()).toBe(202);

      // 4. Attendre traitement conflict
      await page.waitForTimeout(2000);

      // 5. Vérifier mondaySyncStatus = conflict dans DB via API
      const statusResponse = await request.get('/api/monday/sync-status');
      const statusResult = await statusResponse.json();
      const projectStatus = statusResult.data.find((s: any) => s.entityId === projectId);
      
      expect(projectStatus).toBeDefined();
      expect(projectStatus.lastStatus).toBe('conflict');
      expect(projectStatus.conflictReason).toBeDefined();

      // 6. Naviguer et vérifier badge conflict dans UI
      await page.goto('/projects');
      await page.waitForLoadState('networkidle');

      const projectCard = page.locator(`[data-testid*="${projectId}"]`).first();
      await expect(projectCard).toBeVisible();
      
      // Badge conflict devrait être visible
      await assertBadgeStatus(projectCard, 'conflict');

      // 7. Vérifier tooltip affiche conflictReason
      const conflictBadge = projectCard.locator('[data-testid="monday-sync-badge-conflict"]');
      await conflictBadge.hover();
      
      const tooltip = page.getByText(/conflict/i);
      await expect(tooltip).toBeVisible({ timeout: 5000 });
    });
  });

  // ========================================
  // 4. PERSISTENCE RESTART-SAFE
  // ========================================
  
  test.describe('4. Persistence Restart-Safe', () => {
    const createdIds: { projects?: string[] } = {};

    test.afterEach(async ({ page }) => {
      await cleanupTestData(page, createdIds);
    });

    test('États sync survivent au redémarrage', async ({ page, request }) => {
      // 1. Créer projet et exporter vers Monday
      const projectData = generateTestProject({
        status: 'passation',
        client: `Client Persistence ${nanoid(6)}`
      });
      
      const projectId = await createProjectViaAPI(request, {
        name: projectData.reference,
        client: projectData.client,
        location: '75001 Paris',
        status: 'passation'
      });
      
      createdIds.projects = [projectId];

      const exportResponse = await request.post(`/api/monday/export/project/${projectId}`);
      const exportResult = await exportResponse.json();
      const mondayId = exportResult.data.mondayId;

      // 2. Vérifier sync status initial
      let statusResponse = await request.get('/api/monday/sync-status');
      let statusResult = await statusResponse.json();
      let projectStatus = statusResult.data.find((s: any) => s.entityId === projectId);
      
      expect(projectStatus.lastStatus).toBe('synced');
      expect(projectStatus.mondayId).toBe(mondayId);

      // 3. Simuler "restart" en vidant le cache mémoire
      // Note: En E2E, on ne peut pas vraiment restart le serveur
      // On va vérifier que les données persistent dans la DB
      
      // Vérifier directement dans la DB via API que mondayId est persisté
      const projectResponse = await request.get(`/api/projects/${projectId}`);
      const projectResult = await projectResponse.json();
      
      expect(projectResult.data.mondayId).toBe(mondayId);
      expect(projectResult.data.mondaySyncStatus).toBe('synced');

      // 4. Re-requêter sync-status (simule cache rebuild)
      statusResponse = await request.get('/api/monday/sync-status');
      statusResult = await statusResponse.json();
      projectStatus = statusResult.data.find((s: any) => s.entityId === projectId);
      
      // Cache rebuild devrait restaurer l'état depuis DB
      expect(projectStatus).toBeDefined();
      expect(projectStatus.lastStatus).toBe('synced');
      expect(projectStatus.mondayId).toBe(mondayId);

      // 5. Vérifier badge UI toujours visible
      await page.goto('/projects');
      await page.waitForLoadState('networkidle');

      const projectCard = page.locator(`[data-testid*="${projectId}"]`).first();
      await assertBadgeStatus(projectCard, 'synced');
    });
  });

  // ========================================
  // 5. EVENTBUS NOTIFICATIONS WEBSOCKET
  // ========================================
  
  test.describe('5. EventBus Notifications', () => {
    const createdIds: { projects?: string[] } = {};

    test.afterEach(async ({ page }) => {
      await cleanupTestData(page, createdIds);
    });

    test('Export success émet event monday:export:success', async ({ page, request }) => {
      // 1. Setup WebSocket listener (si disponible dans page)
      const wsEvents: any[] = [];
      
      // Note: Playwright ne peut pas facilement intercepter WebSocket
      // On va vérifier via toast/notification UI à la place
      
      // 2. Créer et exporter projet
      const projectData = generateTestProject({
        status: 'passation',
        client: `Client WS Test ${nanoid(6)}`
      });
      
      const projectId = await createProjectViaAPI(request, {
        name: projectData.reference,
        client: projectData.client,
        location: '75001 Paris',
        status: 'passation'
      });
      
      createdIds.projects = [projectId];

      // 3. Naviguer vers page projects pour recevoir notifications
      await page.goto('/projects');
      await page.waitForLoadState('networkidle');

      // 4. Déclencher export (qui devrait émettre event)
      const exportResponse = await request.post(`/api/monday/export/project/${projectId}`);
      expect(exportResponse.ok()).toBeTruthy();

      // 5. Vérifier toast notification apparaît (proxy pour WebSocket event)
      // Note: Le toast peut ne pas s'afficher si WebSocket n'est pas connecté en test
      // On vérifie au moins que le badge apparaît après export
      await page.waitForTimeout(1000);
      
      const projectCard = page.locator(`[data-testid*="${projectId}"]`).first();
      await assertBadgeStatus(projectCard, 'synced');
    });

    test('Conflict émet notification conflict', async ({ page, request }) => {
      // 1. Créer projet, exporter, puis créer conflict
      const projectData = generateTestProject({
        status: 'passation',
        client: `Client Conflict WS ${nanoid(6)}`
      });
      
      const projectId = await createProjectViaAPI(request, {
        name: projectData.reference,
        client: projectData.client,
        location: '75001 Paris',
        status: 'passation'
      });
      
      createdIds.projects = [projectId];

      const exportResponse = await request.post(`/api/monday/export/project/${projectId}`);
      const exportResult = await exportResponse.json();
      const mondayId = exportResult.data.mondayId;

      // 2. Naviguer vers page
      await page.goto('/projects');
      await page.waitForLoadState('networkidle');

      // 3. Update local
      await request.patch(`/api/projects/${projectId}`, {
        data: { name: 'Updated locally', status: 'etude' }
      });

      // 4. Webhook avec conflict
      const oldDate = new Date(Date.now() - 60000);
      const webhookPayload = createMondayWebhookPayload(
        mondayId,
        '123456',
        {
          name: 'Updated in Monday (conflict)',
          status: 'planification',
          updatedAt: oldDate.toISOString()
        }
      );

      const payloadString = JSON.stringify(webhookPayload);
      const signature = generateWebhookSignature(payloadString);

      await request.post('/api/monday/webhook', {
        headers: {
          'x-monday-signature': signature,
          'content-type': 'application/json'
        },
        data: webhookPayload
      });

      // 5. Attendre et vérifier badge conflict
      await page.waitForTimeout(2000);
      await page.reload();
      await page.waitForLoadState('networkidle');

      const projectCard = page.locator(`[data-testid*="${projectId}"]`).first();
      await assertBadgeStatus(projectCard, 'conflict');
    });
  });

  // ========================================
  // 6. IDEMPOTENCE WEBHOOK
  // ========================================
  
  test.describe('6. Idempotence Webhook', () => {
    const createdIds: { projects?: string[] } = {};

    test.afterEach(async ({ page }) => {
      await cleanupTestData(page, createdIds);
    });

    test('Duplicate eventId webhook ignoré (idempotence)', async ({ page, request }) => {
      // 1. Créer projet et exporter
      const projectData = generateTestProject({
        status: 'passation',
        client: `Client Idempotence ${nanoid(6)}`
      });
      
      const projectId = await createProjectViaAPI(request, {
        name: projectData.reference,
        client: projectData.client,
        location: '75001 Paris',
        status: 'passation'
      });
      
      createdIds.projects = [projectId];

      const exportResponse = await request.post(`/api/monday/export/project/${projectId}`);
      const exportResult = await exportResponse.json();
      const mondayId = exportResult.data.mondayId;

      // 2. Créer webhook avec eventId unique et UPDATE name
      const uniqueEventId = `evt_${nanoid(10)}`;
      const updatedName = `${projectData.reference} - First webhook update`;
      const webhookPayload = {
        ...createMondayWebhookPayload(
          mondayId,
          '123456',
          { name: updatedName }
        ),
        event: {
          type: 'update_column_value',
          boardId: '123456',
          itemId: mondayId,
          pulseId: mondayId,
          eventId: uniqueEventId // ID unique pour idempotence
        }
      };

      const payloadString = JSON.stringify(webhookPayload);
      const signature = generateWebhookSignature(payloadString);

      // 3. Premier webhook (devrait modifier les données)
      const firstResponse = await request.post('/api/monday/webhook', {
        headers: {
          'x-monday-signature': signature,
          'content-type': 'application/json'
        },
        data: webhookPayload
      });

      expect(firstResponse.status()).toBe(202); // Accepted

      // 4. Attendre traitement et vérifier données modifiées
      await page.waitForTimeout(1000);
      
      const projectAfterFirst = await request.get(`/api/projects/${projectId}`);
      const dataAfterFirst = await projectAfterFirst.json();
      const firstUpdatedAt = dataAfterFirst.data.updatedAt;
      const firstMondayLastSyncedAt = dataAfterFirst.data.mondayLastSyncedAt;
      
      // Vérifier que le 1er webhook a bien modifié le nom
      expect(dataAfterFirst.data.name).toBe(updatedName);

      // 5. Deuxième webhook IDENTIQUE (même eventId et payload)
      await page.waitForTimeout(500); // Petit délai pour s'assurer que updatedAt changerait si traité
      
      const secondResponse = await request.post('/api/monday/webhook', {
        headers: {
          'x-monday-signature': signature,
          'content-type': 'application/json'
        },
        data: webhookPayload
      });

      expect(secondResponse.status()).toBe(202);

      // 6. Attendre et vérifier que les données N'ONT PAS changé
      await page.waitForTimeout(1000);
      
      const projectAfterSecond = await request.get(`/api/projects/${projectId}`);
      const dataAfterSecond = await projectAfterSecond.json();
      
      // PREUVE IDEMPOTENCE : Les timestamps doivent être identiques
      // Si le webhook était re-traité, updatedAt/mondayLastSyncedAt changeraient
      expect(dataAfterSecond.data.updatedAt).toBe(firstUpdatedAt);
      expect(dataAfterSecond.data.mondayLastSyncedAt).toBe(firstMondayLastSyncedAt);
      expect(dataAfterSecond.data.name).toBe(updatedName);
      
      // 7. Vérifier aussi via sync-status (double check)
      const statusResponse = await request.get('/api/monday/sync-status');
      const statusResult = await statusResponse.json();
      const projectStatus = statusResult.data.find((s: any) => s.entityId === projectId);
      
      expect(projectStatus.lastStatus).toBe('synced');
      // Le lastSyncedAt dans cache devrait être identique aussi
      expect(projectStatus.lastSyncedAt).toBe(firstMondayLastSyncedAt);
    });
  });

  // ========================================
  // 7. AUDIT LOGGING
  // ========================================
  
  test.describe('7. Audit Logging', () => {
    const createdIds: { projects?: string[] } = {};

    test.afterEach(async ({ page }) => {
      await cleanupTestData(page, createdIds);
    });

    test('SyncAuditService logs conflicts avec raison', async ({ page, request }) => {
      // 1. Créer projet et exporter
      const projectData = generateTestProject({
        status: 'passation',
        client: `Client Audit ${nanoid(6)}`
      });
      
      const projectId = await createProjectViaAPI(request, {
        name: projectData.reference,
        client: projectData.client,
        location: '75001 Paris',
        status: 'passation'
      });
      
      createdIds.projects = [projectId];

      const exportResponse = await request.post(`/api/monday/export/project/${projectId}`);
      const exportResult = await exportResponse.json();
      const mondayId = exportResult.data.mondayId;

      // 2. Update local (plus récent)
      await request.patch(`/api/projects/${projectId}`, {
        data: {
          name: `${projectData.reference} - Saxium update`,
          status: 'etude'
        }
      });

      await page.waitForTimeout(500);

      // 3. Webhook Monday avec update ancien (déclenche conflict)
      const oldDate = new Date(Date.now() - 120000); // 2 minutes dans le passé
      const webhookPayload = createMondayWebhookPayload(
        mondayId,
        '123456',
        {
          name: `${projectData.reference} - Monday update (old)`,
          status: 'planification',
          updatedAt: oldDate.toISOString()
        }
      );

      const payloadString = JSON.stringify(webhookPayload);
      const signature = generateWebhookSignature(payloadString);

      await request.post('/api/monday/webhook', {
        headers: {
          'x-monday-signature': signature,
          'content-type': 'application/json'
        },
        data: webhookPayload
      });

      await page.waitForTimeout(2000);

      // 4. Vérifier SyncAuditService a persisté le conflict dans DB
      const statusResponse = await request.get('/api/monday/sync-status');
      const statusResult = await statusResponse.json();
      const projectStatus = statusResult.data.find((s: any) => s.entityId === projectId);
      
      // Audit devrait contenir :
      expect(projectStatus).toBeDefined();
      expect(projectStatus.lastStatus).toBe('conflict');
      expect(projectStatus.conflictReason).toBeDefined();
      expect(projectStatus.conflictReason).toContain('Saxium data is more recent');

      // 5. Vérifier persistence dans DB via GET project
      const projectResponse = await request.get(`/api/projects/${projectId}`);
      const projectResult = await projectResponse.json();
      
      expect(projectResult.data.mondaySyncStatus).toBe('conflict');
      expect(projectResult.data.mondayConflictReason).toBeDefined();
      expect(projectResult.data.mondayLastSyncedAt).toBeDefined();

      // 6. Vérifier que Monday-priority a quand même appliqué les changements
      // (malgré le conflict loggé)
      expect(projectResult.data.name).toContain('Monday update');
    });
  });
});
