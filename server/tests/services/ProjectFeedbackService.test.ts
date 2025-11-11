/**
 * Tests unitaires pour ProjectFeedbackService
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProjectFeedbackService } from '../../services/ProjectFeedbackService';
import type { IStorage } from '../../storage-poc';
import type { EventBus } from '../../eventBus';
import { NotFoundError, ValidationError } from '../../utils/error-handler';
import type { ProjectFeedbackTerrain, InsertProjectFeedbackTerrain } from '../../../shared/schema';

describe('ProjectFeedbackService', () => {
  let service: ProjectFeedbackService;
  let mockStorage: IStorage;
  let mockEventBus: EventBus;

  beforeEach(() => {
    mockStorage = {
      getProject: vi.fn(),
      createProjectFeedbackTerrain: vi.fn(),
      getProjectFeedbackTerrainById: vi.fn(),
      updateProjectFeedbackTerrain: vi.fn(),
      getUser: vi.fn()
    } as unknown as IStorage;

    mockEventBus = {
      publish: vi.fn()
    } as unknown as EventBus;

    service = new ProjectFeedbackService(mockStorage, mockEventBus);
  });

  describe('createFeedback', () => {
    it('should create feedback successfully', async () => {
      const projectId = 'project-1';
      const feedbackData: InsertProjectFeedbackTerrain = {
        projectId,
        reportedBy: 'user-1',
        feedbackType: 'erreur_plan',
        title: 'Erreur dans les plans',
        description: 'Description de l\'erreur',
        status: 'nouveau'
      };

      const mockProject = { id: projectId, name: 'Test Project' };
      const mockFeedback = { id: 'feedback-1', ...feedbackData };

      vi.mocked(mockStorage.getProject).mockResolvedValue(mockProject as unknown);
      vi.mocked(mockStorage.createProjectFeedbackTerrain).mockResolvedValue(mockFeedback as ProjectFeedbackTerrain);

      const result = await service.createFeedback(feedbackData);

      expect(mockStorage.getProject).toHaveBeenCalledWith(projectId);
      expect(mockStorage.createProjectFeedbackTerrain).toHaveBeenCalled();
      expect(mockEventBus.publish).toHaveBeenCalled();
      expect(result).toEqual(mockFeedback);
    });

    it('should throw NotFoundError if project does not exist', async () => {
      const feedbackData: InsertProjectFeedbackTerrain = {
        projectId: 'non-existent',
        reportedBy: 'user-1',
        feedbackType: 'erreur_plan',
        title: 'Test',
        description: 'Test',
        status: 'nouveau'
      };

      vi.mocked(mockStorage.getProject).mockResolvedValue(undefined);

      await expect(service.createFeedback(feedbackData)).rejects.toThrow(NotFoundError);
    });
  });

  describe('assignFeedback', () => {
    it('should assign feedback successfully', async () => {
      const feedbackId = 'feedback-1';
      const assignedTo = 'user-2';
      const mockFeedback = {
        id: feedbackId,
        projectId: 'project-1',
        status: 'nouveau'
      };
      const mockUser = { id: assignedTo, email: 'user2@test.com' };
      const updatedFeedback = { ...mockFeedback, assignedTo, status: 'en_cours' };

      vi.mocked(mockStorage.getProjectFeedbackTerrainById).mockResolvedValue(mockFeedback as ProjectFeedbackTerrain);
      vi.mocked(mockStorage.getUser).mockResolvedValue(mockUas unknown)unknown);
      vi.mocked(mockStorage.updateProjectFeedbackTerrain).mockResolvedValue(updatedFeedback as ProjectFeedbackTerrain);

      const result = await service.assignFeedback(feedbackId, assignedTo);

      expect(mockStorage.getProjectFeedbackTerrainById).toHaveBeenCalledWith(feedbackId);
      expect(mockStorage.getUser).toHaveBeenCalledWith(assignedTo);
      expect(mockStorage.updateProjectFeedbackTerrain).toHaveBeenCalled();
      expect(result.assignedTo).toBe(assignedTo);
      expect(result.status).toBe('en_cours');
    });
  });

  describe('resolveFeedback', () => {
    it('should resolve feedback successfully', async () => {
      const feedbackId = 'feedback-1';
      const resolvedBy = 'user-2';
      const resolutionNotes = 'Problème résolu';
      const mockFeedback = {
        id: feedbackId,
        projectId: 'project-1',
        assignedTo: 'user-2',
        status: 'en_cours'
      };
      const updatedFeedback = {
        ...mockFeedback,
        status: 'resolu',
        resolvedAt: new Date(),
        resolvedBy,
        resolutionNotes
      };

      vi.mocked(mockStorage.getProjectFeedbackTerrainById).mockResolvedValue(mockFeedback as ProjectFeedbackTerrain);
      vi.mocked(mockStorage.updateProjectFeedbackTerrain).mockResolvedValue(updatedFeedback as ProjectFeedbackTerrain);

      const result = await service.resolveFeedback(feedbackId, resolvedBy, resolutionNotes);

      expect(result.status).toBe('resolu');
      expect(result.resolvedBy).toBe(resolvedBy);
      expect(result.resolutionNotes).toBe(resolutionNotes);
    });

    it('should throw ValidationError if feedback is not assigned', async () => {
      const feedbackId = 'feedback-1';
      const mockFeedback = {
        id: feedbackId,
        projectId: 'project-1',
        assignedTo: null,
        status: 'nouveau'
      };

      vi.mocked(mockStorage.getProjectFeedbackTerrainById).mockResolvedValue(mockFeedback as ProjectFeedbackTerrain);

      await expect(
        service.resolveFeedback(feedbackId, 'user-1', 'Notes')
      ).rejects.toThrow(ValidationError);
    });
  });
});

