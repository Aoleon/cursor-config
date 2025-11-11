/**
 * Tests unitaires pour TimeTrackingService
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TimeTrackingService } from '../../services/TimeTrackingService';
import type { IStorage } from '../../storage-poc';
import type { EventBus } from '../../eventBus';
import { NotFoundError, ValidationError } from '../../utils/error-handler';
import type { TimeTracking, InsertTimeTracking } from '../../../shared/schema';

describe('TimeTrackingService', () => {
  let service: TimeTrackingService;
  let mockStorage: IStorage;
  let mockEventBus: EventBus;

  beforeEach(() => {
    mockStorage = {
      getUser: vi.fn(),
      getProject: vi.fn(),
      getOffer: vi.fn(),
      createTimeTracking: vi.fn(),
      getProjectTimeTracking: vi.fn()
    } as unknown as IStorage;

    mockEventBus = {
      publish: vi.fn()
    } as unknown as EventBus;

    service = new TimeTrackingService(mockStorage, mockEventBus);
  });

  describe('recordTime', () => {
    it('should record time successfully', async () => {
      const timeData: InsertTimeTracking = {
        projectId: 'project-1',
        userId: 'user-1',
        taskType: 'be',
        hours: '8.5',
        date: new Date(),
        description: 'Études techniques'
      };

      const mockUser = { id: 'user-1', email: 'user@test.com' };
      const mockProject = { id: 'project-1', name: 'Test Project' };
      const mockTracking = { id: 'tracking-1', ...timeData };

      vi.mocked(mockStorage.getUser).mockResolvedValue(mockUser as unknown);
      vi.mocked(mockStorage.getProject).mockResolvedValue(mockProjas unknown)unknown);
      vi.mocked(mockStorage.createTimeTracking).mockResolvedValue(mockTracking as TimeTracking);

      const result = await service.recordTime(timeData);

      expect(mockStorage.getUser).toHaveBeenCalledWith('user-1');
      expect(mockStorage.getProject).toHaveBeenCalledWith('project-1');
      expect(mockStorage.createTimeTracking).toHaveBeenCalled();
      expect(result).toEqual(mockTracking);
    });

    it('should throw ValidationError if neither projectId nor offerId provided', async () => {
      const timeData: InsertTimeTracking = {
        userId: 'user-1',
        taskType: 'be',
        hours: '8.5',
        date: new Date()
      };

      await expect(service.recordTime(timeData)).rejects.toThrow(ValidationError);
    });
  });

  describe('getProjectTimeSummary', () => {
    it('should calculate time summary correctly', async () => {
      const projectId = 'project-1';
      const mockProject = { id: projectId, name: 'Test Project' };
      const mockEntries: TimeTracking[] = [
        {
          id: 'tracking-1',
          projectId,
          userId: 'user-1',
          taskType: 'be',
          hours: '8.0',
          date: new Date(),
          hourlyRate: '50.00'
        } as TimeTracking,
        {
          id: 'tracking-2',
          projectId,
          userId: 'user-1',
          taskType: 'admin',
          hours: '4.0',
          date: new Date(),
          hourlyRate: '40.00'
        } as TimeTracking
      ];

      vi.mocked(mockStorage.getProject).mockResolvedValue(mockas unknown) as unknown);
      vi.mocked(mockStorage.getProjectTimeTracking).mockResolvedValue(mockEntries);

      const result = await service.getProjectTimeSummary(projectId);

      expect(result.projectId).toBe(projectId);
      expect(result.totalHours).toBe(12);
      expect(result.hoursByType.be).toBe(8);
      expect(result.hoursByType.admin).toBe(4);
      expect(result.totalCost).toBe(8 * 50 + 4 * 40);
    });
  });
});

