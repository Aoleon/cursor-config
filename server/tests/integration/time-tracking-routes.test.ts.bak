/**
 * Tests d'intégration pour les routes time tracking
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createOpsRouter } from '../../modules/ops/routes';
import type { IStorage } from '../../storage-poc';
import type { EventBus } from '../../eventBus';

describe('Time Tracking Routes Integration', () => {
  let app: express.Application;
  let mockStorage: IStorage;
  let mockEventBus: EventBus;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    mockStorage = {
      getUser: vi.fn(),
      getProject: vi.fn(),
      createTimeTracking: vi.fn(),
      getTimeTracking: vi.fn(),
      getProjectTimeTracking: vi.fn()
    } as unknown as IStorage;

    mockEventBus = {
      publish: vi.fn(),
      emit: vi.fn()
    } as unknown as EventBus;

    const router = createOpsRouter(mockStorage, mockEventBus);
    app.use(router);
  });

  describe('POST /api/time-tracking', () => {
    it('should record time successfully', async () => {
      const mockUser = { id: 'user-1', email: 'user@test.com' };
      const mockProject = { id: 'project-1', name: 'Test Project' };
      const mockTracking = {
        id: 'tracking-1',
        projectId: 'project-1',
        userId: 'user-1',
        taskType: 'be',
        hours: '8.5',
        date: new Date()
      };

      vi.mocked(mockStorage.getUser).mockResolvedValue(mockUser as any);
      vi.mocked(mockStorage.getProject).mockResolvedValue(mockProject as any);
      vi.mocked(mockStorage.createTimeTracking).mockResolvedValue(mockTracking as any);

      const response = await request(app)
        .post('/api/time-tracking')
        .send({
          projectId: 'project-1',
          userId: 'user-1',
          taskType: 'be',
          hours: '8.5',
          date: new Date().toISOString(),
          description: 'Études techniques'
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
    });
  });

  describe('GET /api/projects/:id/time-tracking/summary', () => {
    it('should return time summary', async () => {
      const projectId = 'project-1';
      const mockProject = { id: projectId, name: 'Test Project' };
      const mockEntries = [
        {
          id: 'tracking-1',
          projectId,
          taskType: 'be',
          hours: '8.0',
          date: new Date()
        }
      ];

      vi.mocked(mockStorage.getProject).mockResolvedValue(mockProject as any);
      vi.mocked(mockStorage.getProjectTimeTracking).mockResolvedValue(mockEntries as any);

      const response = await request(app)
        .get(`/api/projects/${projectId}/time-tracking/summary`)
        .expect(200);

      expect(response.body).toHaveProperty('projectId');
      expect(response.body).toHaveProperty('totalHours');
    });
  });
});

