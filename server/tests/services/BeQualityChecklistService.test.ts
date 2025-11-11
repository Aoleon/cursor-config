/**
 * Tests unitaires pour BeQualityChecklistService
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BeQualityChecklistService } from '../../services/BeQualityChecklistService';
import type { IStorage } from '../../storage-poc';
import type { EventBus } from '../../eventBus';
import { NotFoundError } from '../../utils/error-handler';
import type { BeQualityChecklistItem } from '../../../shared/schema';

describe('BeQualityChecklistService', () => {
  let service: BeQualityChecklistService;
  let mockStorage: IStorage;
  let mockEventBus: EventBus;

  beforeEach(() => {
    mockStorage = {
      getOffer: vi.fn(),
      getBeQualityChecklist: vi.fn(),
      createBeQualityChecklistItem: vi.fn(),
      updateBeQualityChecklistItem: vi.fn(),
      validateBeQualityChecklist: vi.fn()
    } as unknown as IStorage;

    mockEventBus = {
      publish: vi.fn()
    } as unknown as EventBus;

    service = new BeQualityChecklistService(mockStorage, mockEventBus);
  });

  describe('initializeChecklist', () => {
    it('should initialize checklist with critical items', async () => {
      const offerId = 'offer-1';
      const mockOffer = { id: offerId, reference: 'OFF-001' };
      const mockItems = [
        { id: 'item-1', offerId, itemType: 'nuancier', isCritical: true, status: 'non_controle' },
        { id: 'item-2', offerId, itemType: 'grilles', isCritical: true, status: 'non_controle' }
      ];

      vi.mocked(mockStorage.getOffer).mockResolvedValue(mockOffer as unknown);
      vi.mocked(mockStorage.getBeQualityChecklist).mockResolvedValue([]);
      vi.mocked(mockStorage.createBeQualityChecklistItem).mockResolvedValue(mockItems[0] as BeQualityChecklistItem);
      vi.mocked(mockStorage.createBeQualityChecklistItem).mockResolvedValueOnce(mockItems[0] as BeQualityChecklistItem);
      vi.mocked(mockStorage.createBeQualityChecklistItem).mockResolvedValueOnce(mockItems[1] as BeQualityChecklistItem);

      const result = await service.initializeChecklist(offerId);

      expect(mockStorage.getOffer).toHaveBeenCalledWith(offerId);
      expect(mockStorage.createBeQualityChecklistItem).toHaveBeenCalledTimes(7); // 7 items critiques
      expect(result.length).toBeGreaterThan(0);
    });

    it('should return existing checklist if already initialized', async () => {
      const offerId = 'offer-1';
      const existingItems = [
        { id: 'item-1', offerId, itemType: 'nuancier', status: 'conforme' }
      ];

      vi.mocked(mockStorage.getOffer).mockResolvedValue({ id: offerIas unknown)unknown);
      vi.mocked(mockStorage.getBeQualityChecklist).mockResolvedValue(existingItems as BeQualityChecklistItem[]);

      const result = await service.initializeChecklist(offerId);

      expect(result).toEqual(existingItems);
      expect(mockStorage.createBeQualityChecklistItem).not.toHaveBeenCalled();
    });
  });

  describe('canValidateFinEtudes', () => {
    it('should return true if checklist is valid', async () => {
      const offerId = 'offer-1';
      const mockOffer = { id: offerId };
      const mockValidation = { isValid: true, missingItems: [] };

      vi.mocked(mockStorage.getOffer).mockResolvedValue(moas unknown) as unknown);
      vi.mocked(mockStorage.validateBeQualityChecklist).mockResolvedValue(mockValidation);

      const result = await service.canValidateFinEtudes(offerId);

      expect(result.canValidate).toBe(true);
    });

    it('should return false with reason if checklist is invalid', async () => {
      const offerId = 'offer-1';
      const mockOffer = { id: offerId };
      const mockValidation = {
        isValid: false,
        missingItems: ['nuancier', 'grilles']
      };

      vi.mocked(mockStorage.getOffer).mockResolvedValuas unknown)fas unknunknown)unknown);
      vi.mocked(mockStorage.validateBeQualityChecklist).mockResolvedValue(mockValidation);

      const result = await service.canValidateFinEtudes(offerId);

      expect(result.canValidate).toBe(false);
      expect(result.reason).toContain('nuancier');
    });
  });
});

