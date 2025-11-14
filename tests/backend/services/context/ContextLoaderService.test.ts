/**
 * Tests for ContextLoaderService
 * 
 * Tests data loading from database for context generation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ContextLoaderService } from '../../../../server/services/context/ContextLoaderService';
import { NotFoundError } from '../../../../server/utils/error-handler';
import { db } from '../../../../server/db';
import { eq } from 'drizzle-orm';
import { aos, aoLots, offers, projects } from '@shared/schema';

// Mock database
vi.mock('../../../../server/db', () => ({
  db: {
    query: {
      aos: {
        findFirst: vi.fn()
      },
      offers: {
        findFirst: vi.fn()
      },
      projects: {
        findFirst: vi.fn()
      },
      aoLots: {
        findMany: vi.fn()
      }
    }
  }
}));

describe('ContextLoaderService', () => {
  let service: ContextLoaderService;

  beforeEach(() => {
    service = new ContextLoaderService();
    vi.clearAllMocks();
  });

  describe('loadAoData', () => {
    it('should load AO data with related lots', async () => {
      const aoId = 'test-ao-id';
      const mockAo = { id: aoId, reference: 'AO-001', status: 'etude' };
      const mockLots = [
        { id: 'lot-1', aoId, designation: 'Fenêtres PVC' },
        { id: 'lot-2', aoId, designation: 'Portes aluminium' }
      ];

      (db.query.aos.findFirst as any).mockResolvedValue(mockAo);
      (db.query.aoLots.findMany as any).mockResolvedValue(mockLots);

      const result = await service.loadAoData(aoId);

      expect(result.entity).toEqual(mockAo);
      expect(result.relatedLots).toEqual(mockLots);
      expect(db.query.aos.findFirst).toHaveBeenCalledWith({ where: eq(aos.id, aoId) });
    });

    it('should throw NotFoundError if AO not found', async () => {
      const aoId = 'non-existent-ao';
      (db.query.aos.findFirst as any).mockResolvedValue(null);

      await expect(service.loadAoData(aoId)).rejects.toThrow(NotFoundError);
      await expect(service.loadAoData(aoId)).rejects.toThrow(`Appel d'offres ${aoId} introuvable`);
    });
  });

  describe('loadOfferData', () => {
    it('should load offer data with related lots', async () => {
      const offerId = 'test-offer-id';
      const aoId = 'test-ao-id';
      const mockOffer = { id: offerId, aoId, reference: 'OFF-001', status: 'en_cours' };
      const mockLots = [
        { id: 'lot-1', aoId, designation: 'Fenêtres PVC' }
      ];

      (db.query.offers.findFirst as any).mockResolvedValue(mockOffer);
      (db.query.aoLots.findMany as any).mockResolvedValue(mockLots);

      const result = await service.loadOfferData(offerId);

      expect(result.entity).toEqual(mockOffer);
      expect(result.relatedLots).toEqual(mockLots);
    });

    it('should load offer without lots if aoId is missing', async () => {
      const offerId = 'test-offer-id';
      const mockOffer = { id: offerId, aoId: null, reference: 'OFF-001' };

      (db.query.offers.findFirst as any).mockResolvedValue(mockOffer);
      (db.query.aoLots.findMany as any).mockResolvedValue([]);

      const result = await service.loadOfferData(offerId);

      expect(result.entity).toEqual(mockOffer);
      expect(result.relatedLots).toEqual([]);
    });

    it('should throw NotFoundError if offer not found', async () => {
      const offerId = 'non-existent-offer';
      (db.query.offers.findFirst as any).mockResolvedValue(null);

      await expect(service.loadOfferData(offerId)).rejects.toThrow(NotFoundError);
    });
  });

  describe('loadProjectData', () => {
    it('should load project data', async () => {
      const projectId = 'test-project-id';
      const mockProject = { id: projectId, reference: 'PROJ-001', status: 'chantier' };

      (db.query.projects.findFirst as any).mockResolvedValue(mockProject);

      const result = await service.loadProjectData(projectId);

      expect(result.entity).toEqual(mockProject);
      expect(db.query.projects.findFirst).toHaveBeenCalledWith({ where: eq(projects.id, projectId) });
    });

    it('should throw NotFoundError if project not found', async () => {
      const projectId = 'non-existent-project';
      (db.query.projects.findFirst as any).mockResolvedValue(null);

      await expect(service.loadProjectData(projectId)).rejects.toThrow(NotFoundError);
    });
  });
});

