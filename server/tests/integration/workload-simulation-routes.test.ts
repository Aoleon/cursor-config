/**
 * Tests d'intégration pour les routes simulation charge
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createOpsRouter } from '../../modules/ops/routes';
import type { IStorage } from '../../storage-poc';
import type { EventBus } from '../../eventBus';

describe('Workload Simulation Routes Integration', () => {
  let app: express.Application;
  let mockStorage: IStorage;
  let mockEventBus: EventBus;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    mockStorage = {
      getBeWorkload: vi.fn(),
      getTimeTracking: vi.fn()
    } as unknown as IStorage;

    mockEventBus = {
      publish: vi.fn(),
      emit: vi.fn()
    } as unknown as EventBus;

    const router = createOpsRouter(mockStorage, mockEventBus);
    app.use(router);
  });

  describe('GET /api/workload/simulation', () => {
    it('should return simulation results', async () => {
      const startDate = new Date('2024-01-01').toISOString();
      const endDate = new Date('2024-01-31').toISOString();

      vi.mocked(mockStorage.getBeWorkload).mockResolvedValue([]);
      vi.mocked(mockStorage.getTimeTracking).mockResolvedValue([]);

      const response = await request(app)
        .get('/api/workload/simulation')
        .query({ startDate, endDate })
        .expect(200);

      expect(response.body).toHaveProperty('period');
      expect(response.body).toHaveProperty('beWorkload');
      expect(response.body).toHaveProperty('fieldWorkload');
    });
  });

  describe('GET /api/workload/current', () => {
    it('should return current workload', async () => {
      vi.mocked(mockStorage.getBeWorkload).mockResolvedValue([]);
      vi.mocked(mockStorage.getTimeTracking).mockResolvedValue([]);

      const response = await request(app)
        .get('/api/workload/current')
        .expect(200);

      expect(response.body).toHaveProperty('period');
    });
  });
});

