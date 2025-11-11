/**
 * Test E2E - Workflow Feedback Terrain
 * 
 * Teste le workflow complet de feedback terrain :
 * 1. Création d'un feedback depuis le terrain
 * 2. Assignation à un utilisateur BE
 * 3. Résolution du feedback
 */

import { test, expect } from '@playwright/test';
import { apiPost, apiGet, apiPatch, waitForApiReady } from '../helpers/api';

test.describe('Feedback Terrain Workflow', () => {
  let projectId: string;
  let feedbackId: string;

  test.beforeAll(async ({ page }) => {
    // Attendre que l'API soit prête
    await waitForApiReady(page);
    
    // Créer un projet de test
    const project = await apiPost(page, '/api/projects', {
      name: 'Test Project Feedback',
      client: 'Test Client',
      location: 'Paris',
      status: 'en_cours'
    });
    projectId = project.id;
  });

  test('should create feedback from terrain', async ({ page }) => {
    const feedback = await apiPost(page, `/api/projects/${projectId}/feedback-terrain`, {
      reportedBy: 'user-terrain-1',
      feedbackType: 'erreur_plan',
      title: 'Erreur dans les plans de fenêtres',
      description: 'Les dimensions des fenêtres ne correspondent pas au chantier',
      status: 'nouveau',
      priority: 'haute'
    });

    expect(feedback).toHaveProperty('id');
    expect(feedback.feedbackType).toBe('erreur_plan');
    expect(feedback.status).toBe('nouveau');
    feedbackId = feedback.id;
  });

  test('should assign feedback to BE user', async ({ page }) => {
    const updated = await apiPatch(page, `/api/projects/${projectId}/feedback-terrain/${feedbackId}`, {
      assignedTo: 'user-be-1',
      status: 'en_cours'
    });

    expect(updated.assignedTo).toBe('user-be-1');
    expect(updated.status).toBe('en_cours');
  });

  test('should resolve feedback', async ({ page }) => {
    const resolved = await apiPatch(page, `/api/projects/${projectId}/feedback-terrain/${feedbackId}`, {
      status: 'resolu',
      resolvedBy: 'user-be-1',
      resolutionNotes: 'Plans corrigés et validés'
    });

    expect(resolved.status).toBe('resolu');
    expect(resolved.resolvedBy).toBe('user-be-1');
    expect(resolved.resolutionNotes).toBeTruthy();
  });

  test('should list all feedbacks for project', async ({ page }) => {
    const feedbacks = await apiGet(page, `/api/projects/${projectId}/feedback-terrain`);

    expect(Array.isArray(feedbacks)).toBe(true);
    expect(feedbacks.length).toBeGreaterThan(0);
    expect(feedbacks.some((f: any) => f.id === feedbackId)).toBe(true);
  });
});

