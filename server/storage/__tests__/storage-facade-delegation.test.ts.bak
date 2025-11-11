/**
 * Tests d'intégration pour StorageFacade
 * 
 * Objectifs :
 * 1. Valider la délégation correcte aux repositories (OfferRepository et AoRepository)
 * 2. Valider le fallback sur legacy storage en cas d'erreur
 * 3. Garantir la compatibilité 100% avec l'ancienne interface
 * 4. Protection anti-régression pour l'architecture hybride
 * 
 * Organisation :
 * - Tests Offer Methods Delegation (8 méthodes)
 * - Tests AO Methods Delegation (7 méthodes)
 * - Tests Fallback Mechanism (3 tests)
 * - Tests Backward Compatibility (2 tests)
 */

import './integration-setup';
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { StorageFacade } from '../facade/StorageFacade';
import { db } from '../../db';
import { EventBus } from '../../eventBus';
import { offers, aos, users } from '../../../shared/schema';
import type { InsertOffer, InsertAo } from '../../../shared/schema';
import { eq } from 'drizzle-orm';

describe('StorageFacade Delegation Tests', () => {
  let facade: StorageFacade;
  let eventBus: EventBus;
  let testUserId: string;
  let testAoId: string;
  let createdOfferIds: string[] = [];
  let createdAoIds: string[] = [];
  
  beforeAll(async () => {
    eventBus = new EventBus();
    facade = new StorageFacade(eventBus, db);
    
    // Setup test data
    const [user] = await db.insert(users).values({
      email: `test-facade-${Date.now()}@example.com`,
      firstName: 'Test',
      lastName: 'Facade',
      role: 'chiffreur',
    }).returning();
    testUserId = user.id;
    
    const [ao] = await db.insert(aos).values({
      reference: `AO-FACADE-${Date.now()}`,
      intituleOperation: 'AO Test Facade',
      client: 'Client Test',
      location: 'Paris',
      menuiserieType: 'fenetre',
      source: 'website',
      status: 'etude',
    }).returning();
    testAoId = ao.id;
  });
  
  afterAll(async () => {
    // Cleanup dans l'ordre inverse
    for (const id of createdOfferIds) {
      await db.delete(offers).where(eq(offers.id, id));
    }
    for (const id of createdAoIds) {
      await db.delete(aos).where(eq(aos.id, id));
    }
    await db.delete(aos).where(eq(aos.id, testAoId));
    await db.delete(users).where(eq(users.id, testUserId));
  });
  
  // ========================================
  // OFFER METHODS DELEGATION (8 tests)
  // ========================================
  
  describe('Offer Methods Delegation', () => {
    describe('getOffers', () => {
      it('should delegate to OfferRepository and return repository results', async () => {
        // Créer une offre via facade
        const offerData: InsertOffer = {
          reference: `OFFER-GET-${Date.now()}`,
          client: 'Client Test',
          location: 'Paris',
          menuiserieType: 'fenetre',
          intituleOperation: 'Test Facade getOffers',
          status: 'brouillon',
          responsibleUserId: testUserId,
          aoId: testAoId,
        };
        
        const created = await facade.createOffer(offerData);
        createdOfferIds.push(created.id);
        
        // Appeler getOffers via facade avec filtre status
        const result = await facade.getOffers(undefined, 'brouillon');
        
        // Vérifier que l'offre créée est retournée
        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeGreaterThan(0);
        expect(result.some(o => o.id === created.id)).toBe(true);
      });

      it('should support search parameter', async () => {
        // Créer une offre avec référence unique
        const uniqueRef = `OFFER-SEARCH-${Date.now()}`;
        const offerData: InsertOffer = {
          reference: uniqueRef,
          client: 'Client Unique',
          location: 'Lyon',
          menuiserieType: 'porte',
          intituleOperation: 'Test Search',
          status: 'brouillon',
          responsibleUserId: testUserId,
          aoId: testAoId,
        };
        
        const created = await facade.createOffer(offerData);
        createdOfferIds.push(created.id);
        
        // Rechercher par référence partielle
        const result = await facade.getOffers(uniqueRef.substring(0, 15));
        
        // Vérifier que la recherche fonctionne
        expect(result).toBeDefined();
        expect(result.some(o => o.id === created.id)).toBe(true);
      });
    });
    
    describe('getOffersPaginated', () => {
      it('should delegate to OfferRepository.findPaginated', async () => {
        // Créer plusieurs offres
        for (let i = 0; i < 3; i++) {
          const offer = await facade.createOffer({
            reference: `OFFER-PAG-${Date.now()}-${i}`,
            client: 'Client Test',
            location: 'Paris',
            menuiserieType: 'fenetre',
            intituleOperation: `Test Pagination ${i}`,
            status: 'brouillon',
            responsibleUserId: testUserId,
            aoId: testAoId,
          });
          createdOfferIds.push(offer.id);
        }
        
        // Appeler pagination
        const result = await facade.getOffersPaginated(undefined, 'brouillon', 2, 0);
        
        // Vérifier la structure de retour
        expect(result).toBeDefined();
        expect(result).toHaveProperty('offers');
        expect(result).toHaveProperty('total');
        expect(result).toHaveProperty('limit');
        expect(result).toHaveProperty('offset');
        expect(Array.isArray(result.offers)).toBe(true);
        expect(result.limit).toBe(2);
        expect(result.offset).toBe(0);
      });

      it('should adapt pagination format correctly', async () => {
        // Récupérer avec pagination
        const result = await facade.getOffersPaginated(undefined, undefined, 10, 0);
        
        // Vérifier que la clé est "offers" et non "items" ou "data"
        expect(result).toHaveProperty('offers');
        expect(result).not.toHaveProperty('items');
        expect(result).not.toHaveProperty('data');
        expect(typeof result.total).toBe('number');
      });
    });
    
    describe('getOffer', () => {
      it('should delegate to OfferRepository.findById', async () => {
        // Créer une offre
        const created = await facade.createOffer({
          reference: `OFFER-FINDID-${Date.now()}`,
          client: 'Client Test',
          location: 'Paris',
          menuiserieType: 'fenetre',
          intituleOperation: 'Test FindById',
          status: 'brouillon',
          responsibleUserId: testUserId,
          aoId: testAoId,
        });
        createdOfferIds.push(created.id);
        
        // Récupérer par ID
        const found = await facade.getOffer(created.id);
        
        // Vérifier qu'elle est bien trouvée
        expect(found).toBeDefined();
        expect(found!.id).toBe(created.id);
        expect(found!.reference).toBe(created.reference);
      });

      it('should return undefined for non-existent offer', async () => {
        const result = await facade.getOffer('00000000-0000-0000-0000-000000000000');
        expect(result).toBeUndefined();
      });
    });
    
    describe('createOffer', () => {
      it('should delegate to OfferRepository.create', async () => {
        const offerData: InsertOffer = {
          reference: `OFFER-CREATE-${Date.now()}`,
          client: 'Client Test',
          location: 'Paris',
          menuiserieType: 'fenetre',
          intituleOperation: 'Test Create',
          status: 'brouillon',
          responsibleUserId: testUserId,
          aoId: testAoId,
        };
        
        const created = await facade.createOffer(offerData);
        createdOfferIds.push(created.id);
        
        // Vérifier que l'offre est bien créée
        expect(created).toBeDefined();
        expect(created.id).toBeDefined();
        expect(created.reference).toBe(offerData.reference);
        expect(created.client).toBe(offerData.client);
      });
    });
    
    describe('updateOffer', () => {
      it('should delegate to OfferRepository.update', async () => {
        // Créer une offre
        const created = await facade.createOffer({
          reference: `OFFER-UPDATE-${Date.now()}`,
          client: 'Client Original',
          location: 'Paris',
          menuiserieType: 'fenetre',
          intituleOperation: 'Test Update',
          status: 'brouillon',
          responsibleUserId: testUserId,
          aoId: testAoId,
        });
        createdOfferIds.push(created.id);
        
        // Mettre à jour
        const updated = await facade.updateOffer(created.id, {
          client: 'Client Modifié',
          status: 'etude_technique',
        });
        
        // Vérifier la mise à jour
        expect(updated).toBeDefined();
        expect(updated.id).toBe(created.id);
        expect(updated.client).toBe('Client Modifié');
        expect(updated.status).toBe('etude_technique');
      });
    });
    
    describe('deleteOffer', () => {
      it('should delegate to OfferRepository.delete', async () => {
        // Créer une offre
        const created = await facade.createOffer({
          reference: `OFFER-DELETE-${Date.now()}`,
          client: 'Client Test',
          location: 'Paris',
          menuiserieType: 'fenetre',
          intituleOperation: 'Test Delete',
          status: 'brouillon',
          responsibleUserId: testUserId,
          aoId: testAoId,
        });
        
        // Supprimer
        await facade.deleteOffer(created.id);
        
        // Vérifier que l'offre n'existe plus
        const found = await facade.getOffer(created.id);
        expect(found).toBeUndefined();
      });
    });
  });
  
  // ========================================
  // AO METHODS DELEGATION (7 tests)
  // ========================================
  
  describe('AO Methods Delegation', () => {
    describe('getAos', () => {
      it('should delegate to AoRepository.findAll and return results', async () => {
        // Créer un AO
        const aoData: InsertAo = {
          reference: `AO-GET-${Date.now()}`,
          intituleOperation: 'Test GetAos',
          client: 'Client Test',
          location: 'Paris',
          menuiserieType: 'fenetre',
          source: 'website',
          status: 'etude',
        };
        
        const created = await facade.createAo(aoData);
        createdAoIds.push(created.id);
        
        // Récupérer tous les AOs
        const result = await facade.getAos();
        
        // Vérifier que l'AO créé est retourné
        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
        expect(result.some(ao => ao.id === created.id)).toBe(true);
      });
    });
    
    describe('getAOsPaginated', () => {
      it('should delegate to AoRepository.findPaginated', async () => {
        // Créer quelques AOs
        for (let i = 0; i < 3; i++) {
          const ao = await facade.createAo({
            reference: `AO-PAG-${Date.now()}-${i}`,
            intituleOperation: `Test Pagination ${i}`,
            client: 'Client Test',
            location: 'Paris',
            menuiserieType: 'fenetre',
            source: 'website',
            status: 'etude',
          });
          createdAoIds.push(ao.id);
        }
        
        // Appeler pagination
        const result = await facade.getAOsPaginated(undefined, 'etude', 2, 0);
        
        // Vérifier la structure
        expect(result).toBeDefined();
        expect(result).toHaveProperty('aos');
        expect(result).toHaveProperty('total');
        expect(Array.isArray(result.aos)).toBe(true);
      });

      it('should adapt structure (items → aos)', async () => {
        const result = await facade.getAOsPaginated(undefined, undefined, 10, 0);
        
        // Vérifier que la clé est "aos" et non "items"
        expect(result).toHaveProperty('aos');
        expect(result).not.toHaveProperty('items');
        expect(typeof result.total).toBe('number');
      });
    });
    
    describe('getAo', () => {
      it('should delegate to AoRepository.findById', async () => {
        // Créer un AO
        const created = await facade.createAo({
          reference: `AO-FINDID-${Date.now()}`,
          intituleOperation: 'Test FindById',
          client: 'Client Test',
          location: 'Paris',
          menuiserieType: 'fenetre',
          source: 'website',
          status: 'etude',
        });
        createdAoIds.push(created.id);
        
        // Récupérer par ID
        const found = await facade.getAo(created.id);
        
        // Vérifier
        expect(found).toBeDefined();
        expect(found!.id).toBe(created.id);
        expect(found!.reference).toBe(created.reference);
      });

      it('should support transactional parameter', async () => {
        // Tester avec une transaction
        await db.transaction(async (tx) => {
          const ao = await facade.getAo(testAoId, tx);
          expect(ao).toBeDefined();
          expect(ao!.id).toBe(testAoId);
        });
      });
    });
    
    describe('getAOByMondayItemId', () => {
      it('should delegate to AoRepository.findByMondayId', async () => {
        const mondayId = `monday-facade-${Date.now()}`;
        
        // Créer un AO avec mondayId
        const ao = await facade.createAo({
          reference: `AO-MONDAY-${Date.now()}`,
          intituleOperation: 'Test Monday',
          client: 'Client Test',
          location: 'Paris',
          menuiserieType: 'fenetre',
          source: 'website',
          status: 'etude',
          mondayItemId: mondayId,
        });
        createdAoIds.push(ao.id);
        
        // Rechercher par mondayId
        const found = await facade.getAOByMondayItemId(mondayId);
        
        expect(found).toBeDefined();
        expect(found!.id).toBe(ao.id);
        expect(found!.mondayItemId).toBe(mondayId);
      });

      it('should return undefined for non-existent mondayId', async () => {
        const result = await facade.getAOByMondayItemId('nonexistent-monday-id-999999');
        expect(result).toBeUndefined();
      });
    });
    
    describe('createAo', () => {
      it('should delegate to AoRepository.create', async () => {
        const aoData: InsertAo = {
          reference: `AO-CREATE-${Date.now()}`,
          intituleOperation: 'Test Create',
          client: 'Client Test',
          location: 'Paris',
          menuiserieType: 'fenetre',
          source: 'website',
          status: 'etude',
        };
        
        const created = await facade.createAo(aoData);
        createdAoIds.push(created.id);
        
        // Vérifier
        expect(created).toBeDefined();
        expect(created.id).toBeDefined();
        expect(created.reference).toBe(aoData.reference);
        expect(created.client).toBe(aoData.client);
      });
    });
    
    describe('updateAo', () => {
      it('should delegate to AoRepository.update', async () => {
        // Créer un AO
        const created = await facade.createAo({
          reference: `AO-UPDATE-${Date.now()}`,
          intituleOperation: 'Test Update',
          client: 'Client Original',
          location: 'Paris',
          menuiserieType: 'fenetre',
          source: 'website',
          status: 'etude',
        });
        createdAoIds.push(created.id);
        
        // Mettre à jour
        const updated = await facade.updateAo(created.id, {
          client: 'Client Modifié',
          status: 'valide',
        });
        
        // Vérifier
        expect(updated).toBeDefined();
        expect(updated.id).toBe(created.id);
        expect(updated.client).toBe('Client Modifié');
        expect(updated.status).toBe('valide');
      });
    });
    
    describe('deleteAo', () => {
      it('should delegate to AoRepository.delete', async () => {
        // Créer un AO
        const created = await facade.createAo({
          reference: `AO-DELETE-${Date.now()}`,
          intituleOperation: 'Test Delete',
          client: 'Client Test',
          location: 'Paris',
          menuiserieType: 'fenetre',
          source: 'website',
          status: 'etude',
        });
        
        // Supprimer
        await facade.deleteAo(created.id);
        
        // Vérifier que l'AO n'existe plus
        const found = await facade.getAo(created.id);
        expect(found).toBeUndefined();
      });
    });
  });
  
  // ========================================
  // FALLBACK MECHANISM (3 tests)
  // ========================================
  
  describe('Fallback Mechanism', () => {
    it('should fallback to legacy when repository throws error', async () => {
      // Accéder aux repositories privés via type assertion
      const facadeWithPrivates = facade as any;
      
      // Créer un spy sur le repository pour simuler une erreur
      const repoSpy = vi.spyOn(facadeWithPrivates.offerRepository, 'findAll')
        .mockRejectedValueOnce(new Error('Repository error'));
      
      // Créer un spy sur legacy pour vérifier l'appel
      const legacySpy = vi.spyOn(facadeWithPrivates.legacyStorage, 'getOffers');
      
      // Appeler la méthode
      await facade.getOffers();
      
      // Vérifier que le repository a été appelé (et a échoué)
      expect(repoSpy).toHaveBeenCalled();
      
      // Vérifier que le fallback legacy a été appelé
      expect(legacySpy).toHaveBeenCalled();
      
      // Cleanup
      repoSpy.mockRestore();
      legacySpy.mockRestore();
    });

    it('should NOT fallback when repository succeeds', async () => {
      const facadeWithPrivates = facade as any;
      
      // Créer un spy sur legacy
      const legacySpy = vi.spyOn(facadeWithPrivates.legacyStorage, 'getOffers');
      
      // Appeler la méthode (devrait réussir avec le repository)
      await facade.getOffers();
      
      // Vérifier que legacy n'a PAS été appelé
      expect(legacySpy).not.toHaveBeenCalled();
      
      // Cleanup
      legacySpy.mockRestore();
    });

    it('should log warning when using fallback', async () => {
      const facadeWithPrivates = facade as any;
      
      // Spy sur le logger
      const loggerSpy = vi.spyOn(facadeWithPrivates.facadeLogger, 'warn');
      
      // Mock repository pour throw
      const repoSpy = vi.spyOn(facadeWithPrivates.aoRepository, 'findAll')
        .mockRejectedValueOnce(new Error('Test error'));
      
      // Appeler la méthode
      await facade.getAos();
      
      // Vérifier que le warning a été loggé
      expect(loggerSpy).toHaveBeenCalled();
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('AoRepository.findAll failed'),
        expect.any(Object)
      );
      
      // Cleanup
      repoSpy.mockRestore();
      loggerSpy.mockRestore();
    });
  });
  
  // ========================================
  // BACKWARD COMPATIBILITY (2 tests)
  // ========================================
  
  describe('Backward Compatibility', () => {
    it('should maintain same method signatures as IStorage', async () => {
      // Vérifier que toutes les méthodes clés existent
      expect(typeof facade.getOffers).toBe('function');
      expect(typeof facade.getOffersPaginated).toBe('function');
      expect(typeof facade.getOffer).toBe('function');
      expect(typeof facade.createOffer).toBe('function');
      expect(typeof facade.updateOffer).toBe('function');
      expect(typeof facade.deleteOffer).toBe('function');
      
      expect(typeof facade.getAos).toBe('function');
      expect(typeof facade.getAOsPaginated).toBe('function');
      expect(typeof facade.getAo).toBe('function');
      expect(typeof facade.getAOByMondayItemId).toBe('function');
      expect(typeof facade.createAo).toBe('function');
      expect(typeof facade.updateAo).toBe('function');
      expect(typeof facade.deleteAo).toBe('function');
    });

    it('should return same data structure as legacy', async () => {
      // Créer une offre
      const created = await facade.createOffer({
        reference: `OFFER-COMPAT-${Date.now()}`,
        client: 'Client Test',
        location: 'Paris',
        menuiserieType: 'fenetre',
        intituleOperation: 'Test Compatibility',
        status: 'brouillon',
        responsibleUserId: testUserId,
        aoId: testAoId,
      });
      createdOfferIds.push(created.id);
      
      // Vérifier la structure
      expect(created).toHaveProperty('id');
      expect(created).toHaveProperty('reference');
      expect(created).toHaveProperty('client');
      expect(created).toHaveProperty('status');
      expect(created).toHaveProperty('createdAt');
      expect(created).toHaveProperty('updatedAt');
      
      // Vérifier la pagination
      const paginated = await facade.getOffersPaginated(undefined, undefined, 10, 0);
      expect(paginated).toHaveProperty('offers');
      expect(paginated).toHaveProperty('total');
      expect(paginated).toHaveProperty('limit');
      expect(paginated).toHaveProperty('offset');
    });
  });
});
