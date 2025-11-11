/**
 * Test E2E - Workflow SAV complet
 * 
 * Teste le workflow complet SAV :
 * 1. Création d'une demande SAV
 * 2. Commande de matériel
 * 3. Planification RDV
 * 4. Validation quitus
 */

import { test, expect } from '@playwright/test';
import { apiPost, apiGet, apiPatch, waitForApiReady } from '../helpers/api';

test.describe('SAV Workflow', () => {
  let projectId: string;
  let demandeId: string;

  test.beforeAll(async ({ page }) => {
    // Attendre que l'API soit prête
    await waitForApiReady(page);
    
    // Créer un projet de test
    const project = await apiPost(page, '/api/projects', {
      name: 'Test Project SAV',
      client: 'Test Client',
      location: 'Paris',
      status: 'en_cours'
    });
    projectId = project.id;
  });

  test('should create SAV demande', async ({ page }) => {
    const demande = await apiPost(page, '/api/sav/demandes', {
      projectId,
      demandeType: 'garantie',
      source: 'email',
      description: 'Fenêtre qui ne ferme plus correctement',
      status: 'nouvelle',
      priority: 'moyenne'
    });

    expect(demande).toHaveProperty('id');
    expect(demande.reference).toMatch(/^SAV-/);
    expect(demande.demandeType).toBe('garantie');
    demandeId = demande.id;
  });

  test('should order material for demande', async ({ page }) => {
    const updated = await apiPatch(page, `/api/sav/demandes/${demandeId}/commande-materiel`, {
      materielId: 'materiel-1',
      dateLivraisonPrevue: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    });

    expect(updated.status).toBe('materiel_commande');
    expect(updated.materielId).toBe('materiel-1');
  });

  test('should schedule appointment after material delivery', async ({ page }) => {
    // Simuler livraison matériel
    await apiPatch(page, `/api/sav/demandes/${demandeId}`, {
      dateLivraisonReelle: new Date().toISOString(),
      status: 'materiel_livre'
    });

    // Planifier RDV
    const rdvDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    const updated = await apiPatch(page, `/api/sav/demandes/${demandeId}/planifier-rdv`, {
      rdvDate: rdvDate.toISOString()
    });

    expect(updated.status).toBe('rdv_planifie');
    expect(updated.rdvPlanifie).toBeTruthy();
  });

  test('should validate quitus', async ({ page }) => {
    // Simuler RDV effectué
    await apiPatch(page, `/api/sav/demandes/${demandeId}`, {
      rdvEffectue: new Date().toISOString(),
      status: 'en_intervention'
    });

    // Valider quitus
    const updated = await apiPatch(page, `/api/sav/demandes/${demandeId}/valider-quitus`, {
      quitusDate: new Date().toISOString()
    });

    expect(updated.quitusRecu).toBe(true);
    if (updated.demandeType === 'reserve') {
      expect(updated.reserveLevee).toBe(true);
    }
  });
});

