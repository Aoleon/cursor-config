/**
 * Tests unitaires pour PrevuVsReelService
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PrevuVsReelService } from '../../services/PrevuVsReelService';
import type { IStorage } from '../../storage-poc';
import { NotFoundError } from '../../utils/error-handler';
import type { Project, Offer } from '../../../shared/schema';

describe('PrevuVsReelService', () => {
  let service: PrevuVsReelService;
  let mockStorage: IStorage;

  beforeEach(() => {
    mockStorage = {
      getProject: vi.fn(),
      getOffer: vi.fn(),
      getProjectTimeTracking: vi.fn()
    } as unknown as IStorage;

    service = new PrevuVsReelService(mockStorage);
  });

  describe('compareProject', () => {
    it('should compare dates correctly', async () => {
      const projectId = 'project-1';
      const mockProject: Project = {
        id: projectId,
        name: 'Test Project',
        dateDebut: new Date('2024-01-15'),
        dateFin: new Date('2024-02-15'),
        montantHT: '100000.00'
      } as Project;

      const mockOffer: Offer = {
        id: 'offer-1',
        dateDebutPrevue: new Date('2024-01-01'),
        dateFinPrevue: new Date('2024-02-01'),
        montantHT: '95000.00'
      } as Offer;

      const mockTimeTracking = [
        {
          id: 'tracking-1',
          projectId,
          taskType: 'be',
          hours: '40.00',
          date: new Date()
        }
      ];

      vi.mocked(mockStorage.getProject).mockResolvedValue(mockProject);
      vi.mocked(mockStorage.getOffer).mockResolvedValue(mockOffer);
      vi.mocked(mockStorage.getProjectTimeTracking).mockResolvedValue(mockTimeTracking as any);

      const result = await service.compareProject(projectId);

      expect(result.projectId).toBe(projectId);
      expect(result.dates.variance.startDays).toBe(14); // 15 jan - 1 jan
      expect(result.dates.variance.endDays).toBe(14); // 15 fév - 1 fév
      expect(result.budget.variance).toBe(5000); // 100000 - 95000
      expect(result.hours.actual).toBe(40);
    });

    it('should throw NotFoundError if project does not exist', async () => {
      vi.mocked(mockStorage.getProject).mockResolvedValue(undefined);

      await expect(service.compareProject('non-existent')).rejects.toThrow(NotFoundError);
    });
  });
});

