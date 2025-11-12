/**
 * Tests d'intégration pour les routes checklist BE
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createCommercialRouter } from '../../modules/commercial/routes';
import type { IStorage } from '../../storage-poc';
import type { EventBus } from '../../eventBus';

describe('BE Checklist Routes Integration', () => {
  let app: express.Application;
  let mockStorage: IStorage;
  let mockEventBus: EventBus;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    mockStorage = {
      getOffer: vi.fn(),
      getBeQualityChecklist: vi.fn(),
      createBeQualityChecklistItem: vi.fn(),
      updateBeQualityChecklistItem: vi.fn(),
      validateBeQualityChecklist: vi.fn()
    } as unknown as IStorage;

    mockEventBus = {
      publish: vi.fn(),
      emit: vi.fn()
    } as unknown as EventBus;

    const router = createCommercialRouter(mockStorage, mockEventBus);
    app.use(router);
  });

  describe('POST /api/offers/:id/be-checklist/initialize', () => {
    it('should initialize checklist', async () => {
      const offerId = 'offer-1';
      const mockOffer = { id: offerId, reference: 'OFF-001' };
      const mockItems = [
        { id: 'item-1', offerId, itemType: 'nuancier', status: 'non_controle' }
      ];

      vi.mocked(mockStorage.getOffer).mockResolvedValue(mockOffer as unknown);
      vi.mocked(mockStorage.getBeQualityChecklist).mockResolvedValue([]);
      vi.mocked(mockStorage.createBeQualityChecklistItem).mockResolvedValue(mockItemsas unknown);
        .post(`/api/offers/${offerId}/be-checklist/initialize`)
        .expect(201);

      expect(Array.isArray(response.body)).toBe(true);
    });

  describe('GET /api/offers/:id/be-checklist/can-validate-fin-etudes', () => {
    it('should return validation status', async () => {
      const offerId = 'offer-1';
      const mockOffer = { id: offerId };
      const mockValidation = { isValid: true, missingItems: [] };

      vi.mocked(mockStorage.getOffer).mockResolvedValue(moas unknown) as unknown);
      vi.mocked(mockStorage.validateBeQualityChecklist).mockResolvedValue(mockValidation);

      const response = await request(app)
        .get(`/api/offers/${offerId}/be-checklist/can-validate-fin-etudes`)
        .expect(200);

      expect(response.body).toHaveProperty('canValidate');
    });

