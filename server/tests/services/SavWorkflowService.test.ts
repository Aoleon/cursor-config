/**
 * Tests unitaires pour SavWorkflowService
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SavWorkflowService } from '../../services/SavWorkflowService';
import type { IStorage } from '../../storage-poc';
import type { EventBus } from '../../eventBus';
import { NotFoundError, ValidationError } from '../../utils/error-handler';
import type { SavDemande, InsertSavDemande } from '../../../shared/schema';

describe('SavWorkflowService', () => {
  let service: SavWorkflowService;
  let mockStorage: IStorage;
  let mockEventBus: EventBus;

  beforeEach(() => {
    mockStorage = {
      getProject: vi.fn(),
      createSavDemande: vi.fn(),
      getSavDemande: vi.fn(),
      updateSavDemande: vi.fn()
    } as unknown as IStorage;

    mockEventBus = {
      publish: vi.fn()
    } as unknown as EventBus;

    service = new SavWorkflowService(mockStorage, mockEventBus);
  });

  describe('createDemande', () => {
    it('should create demande with generated reference', async () => {
      const demandeData: InsertSavDemande = {
        projectId: 'project-1',
        reference: '', // Sera généré
        demandeType: 'garantie',
        source: 'email',
        description: 'Problème fenêtre',
        status: 'nouvelle'
      };

      const mockProject = { id: 'project-1', name: 'Test Project' };
      const mockDemande = {
        id: 'demande-1',
        ...demandeData,
        reference: 'SAV-2024-01-0001'
      };

      vi.mocked(mockStorage.getProject).mockResolvedValue(mockProject as unknown);
      vi.mocked(mockStorage.createSavDemande).mockResolvedValue(mockDemande as SavDemande);

      const result = await service.createDemande(demandeData);

      expect(mockStorage.getProject).toHaveBeenCalledWith('project-1');
      expect(mockStorage.createSavDemande).toHaveBeenCalled();
      expect(result.reference).toMatch(/^SAV-\d{4}-\d{2}-\d{4}$/);
    });
  });

  describe('commandeMateriel', () => {
    it('should update demande with material order', async () => {
      const demandeId = 'demande-1';
      const materielId = 'materiel-1';
      const dateLivraison = new Date();
      const mockDemande = {
        id: demandeId,
        projectId: 'project-1',
        reference: 'SAV-2024-01-0001',
        status: 'materiel_necessaire'
      };
      const updatedDemande = {
        ...mockDemande,
        materielId,
        dateLivraisonPrevue: dateLivraison,
        status: 'materiel_commande'
      };

      vi.mocked(mockStorage.getSavDemande).mockResolvedValue(mockDemande as SavDemande);
      vi.mocked(mockStorage.updateSavDemande).mockResolvedValue(updatedDemande as SavDemande);

      const result = await service.commandeMateriel(demandeId, materielId, dateLivraison);

      expect(result.status).toBe('materiel_commande');
      expect(result.materielId).toBe(materielId);
    });
  });

  describe('planifierRdv', () => {
    it('should schedule appointment successfully', async () => {
      const demandeId = 'demande-1';
      const rdvDate = new Date();
      const mockDemande = {
        id: demandeId,
        projectId: 'project-1',
        materielNecessaire: true,
        dateLivraisonReelle: new Date(),
        status: 'materiel_livre'
      };
      const updatedDemande = {
        ...mockDemande,
        rdvPlanifie: rdvDate,
        status: 'rdv_planifie'
      };

      vi.mocked(mockStorage.getSavDemande).mockResolvedValue(mockDemande as SavDemande);
      vi.mocked(mockStorage.updateSavDemande).mockResolvedValue(updatedDemande as SavDemande);

      const result = await service.planifierRdv(demandeId, rdvDate);

      expect(result.status).toBe('rdv_planifie');
      expect(result.rdvPlanifie).toEqual(rdvDate);
    });

    it('should throw ValidationError if material not delivered', async () => {
      const demandeId = 'demande-1';
      const mockDemande = {
        id: demandeId,
        materielNecessaire: true,
        dateLivraisonReelle: null,
        status: 'materiel_commande'
      };

      vi.mocked(mockStorage.getSavDemande).mockResolvedValue(mockDemande as SavDemande);

      await expect(
        service.planifierRdv(demandeId, new Date())
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('validerQuitus', () => {
    it('should validate quitus successfully', async () => {
      const demandeId = 'demande-1';
      const quitusDate = new Date();
      const mockDemande = {
        id: demandeId,
        projectId: 'project-1',
        demandeType: 'reserve',
        rdvEffectue: new Date(),
        status: 'en_intervention'
      };
      const updatedDemande = {
        ...mockDemande,
        quitusRecu: true,
        quitusDate,
        reserveLevee: true,
        status: 'reserve_levee'
      };

      vi.mocked(mockStorage.getSavDemande).mockResolvedValue(mockDemande as SavDemande);
      vi.mocked(mockStorage.updateSavDemande).mockResolvedValue(updatedDemande as SavDemande);

      const result = await service.validerQuitus(demandeId, quitusDate);

      expect(result.quitusRecu).toBe(true);
      expect(result.reserveLevee).toBe(true);
    });
  });
});

