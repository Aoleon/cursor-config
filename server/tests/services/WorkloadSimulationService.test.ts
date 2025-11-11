/**
 * Tests unitaires pour WorkloadSimulationService
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorkloadSimulationService } from '../../services/WorkloadSimulationService';
import type { IStorage } from '../../storage-poc';

describe('WorkloadSimulationService', () => {
  let service: WorkloadSimulationService;
  let mockStorage: IStorage;

  beforeEach(() => {
    mockStorage = {
      getBeWorkload: vi.fn(),
      getTimeTracking: vi.fn()
    } as unknown as IStorage;

    service = new WorkloadSimulationService(mockStorage);
  });

  describe('simulateCharge', () => {
    it('should simulate workload correctly', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const mockBeWorkload = [
        {
          id: 'workload-1',
          userId: 'user-1',
          weekNumber: 1,
          year: 2024,
          plannedHours: '35.00',
          actualHours: '30.00'
        }
      ];

      const mockTimeTracking = [
        {
          id: 'tracking-1',
          userId: 'user-2',
          taskType: 'terrain',
          hours: '40.00',
          date: new Date('2024-01-15')
        }
      ];

      vi.mocked(mockStorage.getBeWorkload).mockResolvedValue(mockBeWorkload as any);
      vi.mocked(mockStorage.getTimeTracking).mockResolvedValue(mockTimeTracking as any);

      const result = await service.simulateCharge(startDate, endDate);

      expect(result.period.start).toEqual(startDate);
      expect(result.period.end).toEqual(endDate);
      expect(result.beWorkload.length).toBeGreaterThan(0);
      expect(result.fieldWorkload.length).toBeGreaterThan(0);
    });

    it('should detect bottlenecks correctly', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const mockBeWorkload = [
        {
          id: 'workload-1',
          userId: 'user-1',
          weekNumber: 1,
          year: 2024,
          plannedHours: '35.00',
          actualHours: '40.00' // > 100% utilisation
        }
      ];

      const mockTimeTracking = [
        {
          id: 'tracking-1',
          taskType: 'terrain',
          hours: '45.00', // > 40h/semaine
          date: new Date('2024-01-15')
        }
      ];

      vi.mocked(mockStorage.getBeWorkload).mockResolvedValue(mockBeWorkload as any);
      vi.mocked(mockStorage.getTimeTracking).mockResolvedValue(mockTimeTracking as any);

      const result = await service.simulateCharge(startDate, endDate);

      expect(result.bottlenecks.length).toBeGreaterThan(0);
      expect(result.bottlenecks.some(b => b.type === 'be')).toBe(true);
    });
  });
});

