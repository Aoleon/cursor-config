/**
 * Tests d'intégration pour les routes SAV workflow
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createAftersalesRouter } from '../../modules/aftersales/routes';
import type { IStorage } from '../../storage-poc';
import type { EventBus } from '../../eventBus';

describe('SAV Workflow Routes Integration', () => {
  let app: express.Application;
  let mockStorage: IStorage;
  let mockEventBus: EventBus;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    mockStorage = {
      getProject: vi.fn(),
      createSavDemande: vi.fn(),
      getSavDemande: vi.fn(),
      updateSavDemande: vi.fn()
    } as unknown as IStorage;

    mockEventBus = {
      publish: vi.fn(),
      emit: vi.fn()
    } as unknown as EventBus;

    const router = createAftersalesRouter(mockStorage, mockEventBus);
    app.use(router);
  });

  describe('POST /api/sav/demandes', () => {
    it('should create demande successfully', async () => {
      const mockProject = { id: 'project-1', name: 'Test Project' };
      const mockDemande = {
        id: 'demande-1',
        projectId: 'project-1',
        reference: 'SAV-2024-01-0001',
        demandeType: 'garantie',
        source: 'email',
        description: 'Problème fenêtre',
        status: 'nouvelle'
      };

      vi.mocked(mockStorage.getProject).mockResolvedValue(mockProject as unknown);
      vi.mocked(mockStorage.createSavDemande).mockResolvedValue(mockDemaas unknown);
        .post('/api/sav/demandes')
        .send({
          projectId: 'project-1',
          demandeType: 'garantie',
          source: 'email',
          description: 'Problème fenêtre',
          status: 'nouvelle'
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.reference).toMatch(/^SAV-/);
    });

  describe('PATCH /api/sav/demandes/:id/commande-materiel', () => {
    it('should update demande with material order', async () => {
      const demandeId = 'demande-1';
      const mockDemande = {
        id: demandeId,
        projectId: 'project-1',
        status: 'materiel_necessaire'
      };
      const updatedDemande = {
        ...mockDemande,
        materielId: 'materiel-1',
        status: 'materiel_commande'
      };

      vi.mocked(mockStorage.getSavDemande).mockResolvedValue(mockas unknown) as unknown);
      vi.mocked(mockStorage.updateSavDemande).mockResolvedValue(updas unknown)aas unknunknown);
      const response = await request(app)
        .patch(`/api/sav/demandes/${demandeId}/commande-materiel`)
        .send({
          materielId: 'materiel-1',
          dateLivraisonPrevue: new Date().toISOString()
        })
        .expect(200);

      expect(response.body.status).toBe('materiel_commande');
    });

