/**
 * Test E2E - Workflow Prévu vs Réel
 * 
 * Teste le workflow de comparaison prévu vs réel :
 * 1. Comparaison pour un projet
 * 2. Comparaison globale
 */

import { test, expect } from '@playwright/test';
import { apiGet, apiPost, waitForApiReady } from '../helpers/api';

test.describe('Prévu vs Réel Workflow', () => {
  let projectId: string;

  test.beforeAll(async ({ page }) => {
    // Attendre que l'API soit prête
    await waitForApiReady(page);
    
    // Créer un projet avec dates prévues et réelles
    const project = await apiPost(page, '/api/projects', {
      name: 'Test Project Prévu vs Réel',
      client: 'Test Client',
      location: 'Paris',
      status: 'en_cours',
      dateDebut: new Date('2024-01-15').toISOString(),
      dateFin: new Date('2024-02-15').toISOString(),
      montantHT: '100000.00'
    });
    projectId = project.id;
  });

  test('should compare project prevu vs reel', async ({ page }) => {
    const comparison = await apiGet(page, `/api/analytics/projects/${projectId}/prevu-vs-reel`);

    expect(comparison).toHaveProperty('projectId');
    expect(comparison).toHaveProperty('dates');
    expect(comparison).toHaveProperty('budget');
    expect(comparison).toHaveProperty('hours');
    
    // Vérifier structure dates
    expect(comparison.dates).toHaveProperty('planned');
    expect(comparison.dates).toHaveProperty('actual');
    expect(comparison.dates).toHaveProperty('variance');
    
    // Vérifier structure budget
    expect(comparison.budget).toHaveProperty('planned');
    expect(comparison.budget).toHaveProperty('actual');
    expect(comparison.budget).toHaveProperty('variance');
    
    // Vérifier structure hours
    expect(comparison.hours).toHaveProperty('planned');
    expect(comparison.hours).toHaveProperty('actual');
    expect(comparison.hours).toHaveProperty('variance');
  });

  test('should get global comparison', async ({ page }) => {
    const global = await apiGet(page, '/api/analytics/prevu-vs-reel/global');

    expect(global).toHaveProperty('comparisons');
    expect(global).toHaveProperty('summary');
    expect(Array.isArray(global.comparisons)).toBe(true);
    
    // Vérifier summary
    expect(global.summary).toHaveProperty('totalProjects');
    expect(global.summary).toHaveProperty('averageVariance');
    expect(global.summary.averageVariance).toHaveProperty('dates');
    expect(global.summary.averageVariance).toHaveProperty('budget');
    expect(global.summary.averageVariance).toHaveProperty('hours');
  });

  test('should filter global comparison by project IDs', async ({ page }) => {
    const global = await apiGet(page, `/api/analytics/prevu-vs-reel/global?projectIds[]=${projectId}`);

    expect(global).toHaveProperty('comparisons');
    expect(Array.isArray(global.comparisons)).toBe(true);
    if (global.comparisons.length > 0) {
      expect(global.comparisons.some((c: any) => c.projectId === projectId)).toBe(true);
    }
  });
});

