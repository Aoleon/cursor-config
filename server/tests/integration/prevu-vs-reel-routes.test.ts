/**
 * Tests d'intégration pour les routes prévu vs réel
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createAnalyticsRouter } from '../../modules/analytics/routes';
import type { IStorage } from '../../storage-poc';
import type { EventBus } from '../../eventBus';

describe('Prévu vs Réel Routes Integration', () => {
  let app: express.Application;
  let mockStorage: IStorage;
  let mockEventBus: EventBus;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    mockStorage = {
      getProject: vi.fn(),
      getOffer: vi.fn(),
      getProjects: vi.fn(),
      getProjectTimeTracking: vi.fn()
    } as unknown as IStorage;

    mockEventBus = {
      publish: vi.fn(),
      emit: vi.fn()
    } as unknown as EventBus;

    const router = createAnalyticsRouter(mockStorage, mockEventBus);
    app.use(router);
  });

  describe('GET /api/analytics/projects/:id/prevu-vs-reel', () => {
    it('should return comparison for project', async () => {
      const projectId = 'project-1';
      const mockProject = {
        id: projectId,
        name: 'Test Project',
        dateDebut: new Date('2024-01-15'),
        dateFin: new Date('2024-02-15'),
        montantHT: '100000.00'
      };
      const mockOffer = {
        id: 'offer-1',
        dateDebutPrevue: new Date('2024-01-01'),
        dateFinPrevue: new Date('2024-02-01'),
        montantHT: '95000.00'
      };
      const mockTimeTracking = [
        {
          id: 'tracking-1',
          projectId,
          taskType: 'be',
          hours: '40.00',
          date: new Date()
        }
      ];

      vi.mocked(mockStorage.getProject).mockResolvedValue(mockProject as unknown);
      vi.mocked(mockStorage.getOffer).mockResolvedValue(mockOfas unknown);
      const response = await request(app)
        .get(`/api/analytics/projects/${projectId}/prevu-vs-reel`)
        .expect(200);

      expect(response.body).toHaveProperty('projectId');
      expect(response.body).toHaveProperty('dates');
      expect(response.body).toHaveProperty('budget');
      expect(response.body).toHaveProperty('hours');
    });

