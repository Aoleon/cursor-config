/**
 * Test E2E - Workflow Simulation Charge
 * 
 * Teste le workflow de simulation de charge :
 * 1. Simulation sur une période
 * 2. Charge actuelle
 * 3. Détection de goulots d'étranglement
 */

import { test, expect } from '@playwright/test';
import { apiGet, waitForApiReady } from '../helpers/api';

test.describe('Workload Simulation Workflow', () => {
  test.beforeAll(async ({ page }) => {
    // Attendre que l'API soit prête
    await waitForApiReady(page);
  });
  test('should simulate workload for period', async ({ page }) => {
    const startDate = new Date('2024-01-01').toISOString();
    const endDate = new Date('2024-01-31').toISOString();

    const simulation = await apiGet(page, `/api/workload/simulation?startDate=${startDate}&endDate=${endDate}`);

    expect(simulation).toHaveProperty('period');
    expect(simulation).toHaveProperty('beWorkload');
    expect(simulation).toHaveProperty('fieldWorkload');
    expect(simulation).toHaveProperty('bottlenecks');
    expect(Array.isArray(simulation.beWorkload)).toBe(true);
    expect(Array.isArray(simulation.fieldWorkload)).toBe(true);
  });

  test('should get current workload', async ({ page }) => {
    const current = await apiGet(page, '/api/workload/current');

    expect(current).toHaveProperty('period');
    expect(current.period.start).toBeTruthy();
    expect(current.period.end).toBeTruthy();
  });

  test('should detect bottlenecks', async ({ page }) => {
    const startDate = new Date().toISOString();
    const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const result = await apiGet(page, `/api/workload/bottlenecks?startDate=${startDate}&endDate=${endDate}`);

    expect(result).toHaveProperty('bottlenecks');
    expect(Array.isArray(result.bottlenecks)).toBe(true);
    
    // Vérifier la structure des goulots
    if (result.bottlenecks.length > 0) {
      const bottleneck = result.bottlenecks[0];
      expect(bottleneck).toHaveProperty('type');
      expect(bottleneck).toHaveProperty('userId');
      expect(bottleneck).toHaveProperty('utilization');
    }
  });
});

