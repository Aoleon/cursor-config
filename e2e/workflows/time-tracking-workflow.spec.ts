/**
 * Test E2E - Workflow Time Tracking
 * 
 * Teste le workflow complet de suivi de temps :
 * 1. Enregistrement de temps
 * 2. Récupération du résumé par projet
 */

import { test, expect } from '@playwright/test';
import { apiPost, apiGet, waitForApiReady } from '../helpers/api';

test.describe('Time Tracking Workflow', () => {
  let projectId: string;
  let trackingId: string;

  test.beforeAll(async ({ page }) => {
    // Attendre que l'API soit prête
    await waitForApiReady(page);
    
    // Créer un projet de test
    const project = await apiPost(page, '/api/projects', {
      name: 'Test Project Time',
      client: 'Test Client',
      location: 'Paris',
      status: 'en_cours'
    });
    projectId = project.id;
  });

  test('should record time for project', async ({ page }) => {
    const tracking = await apiPost(page, '/api/time-tracking', {
      projectId,
      userId: 'user-1',
      taskType: 'be',
      hours: '8.5',
      date: new Date().toISOString(),
      description: 'Études techniques fenêtres'
    });

    expect(tracking).toHaveProperty('id');
    expect(tracking.taskType).toBe('be');
    expect(tracking.hours).toBe('8.5');
    trackingId = tracking.id;
  });

  test('should get time summary for project', async ({ page }) => {
    const summary = await apiGet(page, `/api/projects/${projectId}/time-tracking/summary`);

    expect(summary).toHaveProperty('projectId');
    expect(summary).toHaveProperty('totalHours');
    expect(summary).toHaveProperty('hoursByType');
    expect(summary.hoursByType.be).toBeGreaterThanOrEqual(8.5);
  });

  test('should filter time tracking by task type', async ({ page }) => {
    // Enregistrer du temps admin
    await apiPost(page, '/api/time-tracking', {
      projectId,
      userId: 'user-1',
      taskType: 'admin',
      hours: '2.0',
      date: new Date().toISOString()
    });

    const beTime = await apiGet(page, `/api/time-tracking?projectId=${projectId}&taskType=be`);
    const adminTime = await apiGet(page, `/api/time-tracking?projectId=${projectId}&taskType=admin`);

    expect(beTime.every((t: any) => t.taskType === 'be')).toBe(true);
    expect(adminTime.every((t: any) => t.taskType === 'admin')).toBe(true);
  });
});

