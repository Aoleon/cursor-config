/**
 * Tests d'intégration pour les routes feedback terrain
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createProjectsRouter } from '../../modules/projects/routes';
import type { IStorage } from '../../storage-poc';
import type { EventBus } from '../../eventBus';

describe('Project Feedback Routes Integration', () => {
  let app: express.Application;
  let mockStorage: IStorage;
  let mockEventBus: EventBus;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    mockStorage = {
      getProject: vi.fn(),
      createProjectFeedbackTerrain: vi.fn(),
      getProjectFeedbackTerrain: vi.fn(),
      getProjectFeedbackTerrainById: vi.fn(),
      updateProjectFeedbackTerrain: vi.fn()
    } as unknown as IStorage;

    mockEventBus = {
      publish: vi.fn(),
      emit: vi.fn()
    } as unknown as EventBus;

    const router = createProjectsRouter(mockStorage, mockEventBus);
    app.use(router);
  });

  describe('POST /api/projects/:id/feedback-terrain', () => {
    it('should create feedback successfully', async () => {
      const projectId = 'project-1';
      const mockProject = { id: projectId, name: 'Test Project' };
      const mockFeedback = {
        id: 'feedback-1',
        projectId,
        reportedBy: 'user-1',
        feedbackType: 'erreur_plan',
        title: 'Erreur dans les plans',
        description: 'Description',
        status: 'nouveau'
      };

      vi.mocked(mockStorage.getProject).mockResolvedValue(mockProject as unknown);
      vi.mocked(mockStorage.createProjectFeedbackTerrain).mockResolvedValue(mockFeedbas unknown)unknown);

      const response = await request(app)
        .post(`/api/projects/${projectId}/feedback-terrain`)
        .send({
          reportedBy: 'user-1',
          feedbackType: 'erreur_plan',
          title: 'Erreur dans les plans',
          description: 'Description',
          status: 'nouveau'
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(mockStorage.createProjectFeedbackTerrain).toHaveBeenCalled();
    });
  });

  describe('GET /api/projects/:id/feedback-terrain', () => {
    it('should return feedback list', async () => {
      const projectId = 'project-1';
      const mockFeedback = [{
        id: 'feedback-1',
        projectId,
        status: 'nouveau'
      }];

      vi.mocked(mockStorage.getProjectFeedbackTerrain).mockResolvedValue(mockFas unknown) as unknown);

      const response = await request(app)
        .get(`/api/projects/${projectId}/feedback-terrain`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });
});

