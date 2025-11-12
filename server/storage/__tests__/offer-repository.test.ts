/**
 * Tests d'intégration pour OfferRepository
 * 
 * Objectif : Valider toutes les fonctionnalités avec une vraie base de données
 * - CRUD complet
 * - Filtres et recherche
 * - Pagination
 * - Intégration EventBus
 * - Gestion transactionnelle
 * - Edge cases et validation UUID
 * 
 * PROTECTION ANTI-RÉGRESSION : Ces tests garantissent la stabilité de l'architecture
 * 
 * @vitest-environment node
 */

import './integration-setup'; // Setup spécifique pour tests d'intégration (sans mocks)
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { OfferRepository } from '../commercial/OfferRepository';
import { db } from '../../db';
import { EventBus } from '../../eventBus';
import { offers, users, aos } from '../../../shared/schema';
import type { InsertOffer, Offer } from '../../../shared/schema';
import { eq, and } from 'drizzle-orm';
import { DatabaseError } from '../../utils/error-handler';

describe('OfferRepository Integration Tests', () => {
  let repository: OfferRepository;
  let eventBus: EventBus;
  let testUserId: string;
  let testAoId: string;
  let createdOfferIds: string[] = [];

  // ========================================
  // SETUP ET CLEANUP
  // ========================================

  beforeAll(async () => {
    // Créer l'instance EventBus
    eventBus = new EventBus();
    
    // Créer le repository avec nom, db et eventBus
    repository = new OfferRepository('OfferRepository', db, eventBus);

    // Créer un user de test
    const [user] = await db.insert(users).values({
      email: `test-offer-${Date.now()}@example.com`,
      firstName: 'Test',
      lastName: 'User',
      role: 'chiffreur',
    }).returning();
    testUserId = user.id;

    // Créer un AO de test avec tous les champs required
    const [ao] = await db.insert(aos).values({
      reference: `AO-TEST-${Date.now()}`,
      intituleOperation: 'AO Test Integration',
      client: 'Client Test',
      location: 'Paris',
      menuiserieType: 'fenetre',
      source: 'website',
      status: 'etude',
    }).returning();
    testAoId = ao.id;
  });

  afterAll(async () => {
    // Supprimer toutes les offers créées pendant les tests
    if (createdOfferIds.length > 0) {
      await db.delete(offers).where(
        eq(offers.id, createdOfferIds[0])
      );
      for (let i = 1; i < createdOfferIds.length; i++) {
        await db.delete(offers).where(eq(offers.id, createdOfferIds[i]));
      }
    }

    // Supprimer les offers liées au testUserId
    await db.delete(offers).where(eq(offers.responsibleUserId, testUserId));

    // Supprimer l'AO de test
    await db.delete(aos).where(eq(aos.id, testAoId));

    // Supprimer l'user de test
    await db.delete(users).where(eq(users.id, testUserId));
  });

  // Helper pour créer une offer de test valide
  const createValidOfferData = (overrides: Partial<InsertOffer> = {}): InsertOffer => {
    const timestamp = Date.now();
    return {
      reference: `OFFER-TEST-${timestamp}-${Math.random().toString(36).substring(7)}`,
      client: 'Client Test',
      location: 'Paris',
      menuiserieType: 'fenetre',
      intituleOperation: 'Test Offer',
      status: 'brouillon',
      responsibleUserId: testUserId,
      aoId: testAoId,
      ...overrides,
    };
  };

  // ========================================
  // TESTS CRUD (5 tests)
  // ========================================

  describe('CRUD Operations', () => {
    it('should create an offer with all required fields', async () => {
      const insertData = createValidOfferData({
        intituleOperation: 'Test Create Offer',
        status: 'brouillon',
      });

      const offer = await repository.create(insertData);
      createdOfferIds.push(offer.id);

      expect(offer).toBeDefined();
      expect(offer.id).toBeDefined();
      expect(offer.intituleOperation).toBe('Test Create Offer');
      expect(offer.status).toBe('brouillon');
      expect(offer.responsibleUserId).toBe(testUserId);
      expect(offer.aoId).toBe(testAoId);
      expect(offer.client).toBe('Client Test');
      expect(offer.location).toBe('Paris');
      expect(offer.menuiserieType).toBe('fenetre');
    });

    it('should find offer by id', async () => {
      const created = await repository.create(createValidOfferData({
        intituleOperation: 'Test Find By ID',
            }

                      }


                                }


                              }));
      createdOfferIds.push(created.id);

      const found = await repository.findById(created.id);

      expect(found).toBeDefined();
      expect(found!.id).toBe(created.id);
      expect(found!.intituleOperation).toBe('Test Find By ID');
      expect(found!.responsibleUserId).toBe(testUserId);
    });

    it('should update an offer', async () => {
      const created = await repository.create(createValidOfferData({
        intituleOperation: 'Test Update',
        status: 'brouillon',
            }

                      }


                                }


                              }));
      createdOfferIds.push(created.id);

      const updated = await repository.update(created.id, {
        status: 'en_cours_chiffrage',
        intituleOperation: 'Test Updated',
      });

      expect(updated.status).toBe('en_cours_chiffrage');
      expect(updated.intituleOperation).toBe('Test Updated');
      expect(updated.id).toBe(created.id);
    });

    it('should delete an offer', async () => {
      const created = await repository.create(createValidOfferData({
        intituleOperation: 'Test Delete',
            }

                      }


                                }


                              }));

      await repository.delete(created.id);

      const found = await repository.findById(created.id);
      expect(found).toBeUndefined();
    });

    it('should return undefined for non-existent id', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const found = await repository.findById(nonExistentId);

      expect(found).toBeUndefined();
    });
  });

  // ========================================
  // TESTS FILTRES (7 tests)
  // ========================================

  describe('Filters', () => {
    it('should filter by status', async () => {
      const offer1 = await repository.create(createValidOfferData({
        intituleOperation: 'Filter Test 1',
        status: 'brouillon',
            }

                      }


                                }


                              }));
      createdOfferIds.push(offer1.id);

      const offer2 = await repository.create(createValidOfferData({
        intituleOperation: 'Filter Test 2',
        status: 'en_cours_chiffrage',
            }

                      }


                                }


                              }));
      createdOfferIds.push(offer2.id);

      const brouillons = await repository.findAll({ status: 'brouillon' });
      const enCours = await repository.findAll({ status: 'en_cours_chiffrage' });

      expect(brouillons.length).toBeGreaterThan(0);
      expect(brouillons.every(o => o.status === 'brouillon')).toBe(true);
      expect(brouillons.some(o => o.id === offer1.id)).toBe(true);

      expect(enCours.length).toBeGreaterThan(0);
      expect(enCours.every(o => o.status === 'en_cours_chiffrage')).toBe(true);
      expect(enCours.some(o => o.id === offer2.id)).toBe(true);
    });

    it('should filter by responsibleUserId', async () => {
      const offer = await repository.create(createValidOfferData({
        intituleOperation: 'Filter Responsible User',
        responsibleUserId: testUserId,
            }

                      }


                                }


                              }));
      createdOfferIds.push(offer.id);

      const results = await repository.findAll({ responsibleUserId: testUserId });

      expect(results.length).toBeGreaterThan(0);
      expect(results.every(o => o.responsibleUserId === testUserId)).toBe(true);
      expect(results.some(o => o.id === offer.id)).toBe(true);
    });

    it('should filter by aoId', async () => {
      const offer = await repository.create(createValidOfferData({
        intituleOperation: 'Filter AO',
        aoId: testAoId,
            }

                      }


                                }


                              }));
      createdOfferIds.push(offer.id);

      const results = await repository.findAll({ aoId: testAoId });

      expect(results.length).toBeGreaterThan(0);
      expect(results.every(o => o.aoId === testAoId)).toBe(true);
      expect(results.some(o => o.id === offer.id)).toBe(true);
    });

    it('should filter by menuiserieType', async () => {
      const offer = await repository.create(createValidOfferData({
        intituleOperation: 'Filter Menuiserie Type',
        menuiserieType: 'porte',
            }

                      }


                                }


                              }));
      createdOfferIds.push(offer.id);

      const results = await repository.findAll({ menuiserieType: 'porte' });

      expect(results.length).toBeGreaterThan(0);
      expect(results.every(o => o.menuiserieType === 'porte')).toBe(true);
      expect(results.some(o => o.id === offer.id)).toBe(true);
    });

    it('should filter by search (reference, client, location)', async () => {
      const uniqueString = `SEARCH-${Date.now()}`;
      const offer = await repository.create(createValidOfferData({
        intituleOperation: 'Filter Search Test',
        reference: uniqueString,
            }

                      }


                                }


                              }));
      createdOfferIds.push(offer.id);

      const results = await repository.findAll({ search: uniqueString });

      expect(results.length).toBeGreaterThan(0);
      expect(results.some(o => o.id === offer.id)).toBe(true);
    });

    it('should filter by date range', async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const offer = await repository.create(createValidOfferData({
        intituleOperation: 'Filter Date Range',
            }

                      }


                                }


                              }));
      createdOfferIds.push(offer.id);

      const results = await repository.findAll({
        dateFrom: yesterday,
        dateTo: tomorrow,
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results.some(o => o.id === offer.id)).toBe(true);
    });

    it('should combine multiple filters', async () => {
      const offer = await repository.create(createValidOfferData({
        intituleOperation: 'Combined Filters',
        status: 'brouillon',
        responsibleUserId: testUserId,
        menuiserieType: 'fenetre',
            }

                      }


                                }


                              }));
      createdOfferIds.push(offer.id);

      const results = await repository.findAll({
        status: 'brouillon',
        responsibleUserId: testUserId,
        menuiserieType: 'fenetre',
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results.every(o =>
        o.status === 'brouillon' &&
        o.responsibleUserId === testUserId &&
        o.menuiserieType === 'fenetre'
      )).toBe(true);
      expect(results.some(o => o.id === offer.id)).toBe(true);
    });
  });

  // ========================================
  // TESTS PAGINATION (3 tests)
  // ========================================

  describe('Pagination', () => {
    it('should paginate results correctly', async () => {
      // Créer 15 offers pour tester la pagination
      const offerIds: string[] = [];
      for (let i = 0; i < 15; i++) {
        const offer = await repository.create(createValidOfferData({
          intituleOperation: `Pagination Test ${i}`,
              }

                        }


                                  }


                                }));
        offerIds.push(offer.id);
      }
      createdOfferIds.push(...offerIds);

      const page1 = await repository.findPaginated(
        { responsibleUserId: testUserId },
        { limit: 5, offset: 0 }
      );

      const page2 = await repository.findPaginated(
        { responsibleUserId: testUserId },
        { limit: 5, offset: 5 }
      );

      expect(page1.items.length).toBeLessThanOrEqual(5);
      expect(page2.items.length).toBeLessThanOrEqual(5);
      expect(page1.total).toBeGreaterThanOrEqual(15);
      expect(page1.limit).toBe(5);
      expect(page1.offset).toBe(0);
      expect(page2.offset).toBe(5);

      // Vérifier qu'il n'y a pas de doublons entre les pages
      const page1Ids = page1.items.map(o => o.id);
      const page2Ids = page2.items.map(o => o.id);
      const intersection = page1Ids.filter(id => page2Ids.includes(id));
      expect(intersection.length).toBe(0);
    });

    it('should return correct total count', async () => {
      const countBefore = await repository.count({ responsibleUserId: testUserId });

      const offer1 = await repository.create(createValidOfferData({
        intituleOperation: 'Count Test 1',
            }

                      }


                                }


                              }));
      const offer2 = await repository.create(createValidOfferData({
        intituleOperation: 'Count Test 2',
            }

                      }


                                }


                              }));
      createdOfferIds.push(offer1.id, offer2.id);

      const countAfter = await repository.count({ responsibleUserId: testUserId });

      expect(countAfter).toBe(countBefore + 2);

      const paginated = await repository.findPaginated(
        { responsibleUserId: testUserId },
        { limit: 10, offset: 0 }
      );

      expect(paginated.total).toBe(countAfter);
    });

    it('should handle empty results', async () => {
      const nonExistentUserId = '00000000-0000-0000-0000-000000000001';

      const results = await repository.findAll({ responsibleUserId: nonExistentUserId });
      expect(results.length).toBe(0);

      const paginated = await repository.findPaginated(
        { responsibleUserId: nonExistentUserId },
        { limit: 10, offset: 0 }
      );

      expect(paginated.items.length).toBe(0);
      expect(paginated.total).toBe(0);
      expect(paginated.hasNext).toBe(false);
      expect(paginated.hasPrevious).toBe(false);
    });
  });

  // ========================================
  // TESTS EVENTBUS (3 tests)
  // ========================================

  describe('EventBus Integration', () => {
    it('should emit offers:created event', async () => {
      const eventPromise = new Promise<unknown>((resolve) => {
        eventBus.once('event', (event: unknown) => {
          if (event.entity === 'offers' && event.type === 'created') {
            resolve(event);
          }
        });
      });

      const offer = await repository.create(createValidOfferData({
        intituleOperation: 'EventBus Create Test',
            }

                      }


                                }


                              }));
      createdOfferIds.push(offer.id);

      const event = await Promise.race([
        eventPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Event timeout')), 1000))
      ]);

      expect(event).toBeDefined();
      expect(event.entityId).toBe(offer.id);
    });

    it('should emit offers:updated event', async () => {
      const offer = await repository.create(createValidOfferData({
        intituleOperation: 'EventBus Update Test',
            }

                      }


                                }


                              }));
      createdOfferIds.push(offer.id);

      const eventPromise = new Pro<unknown>unknown>((resolve) => {
        eventBus.once('event', (e: unknown) => {
          if (event.entity === 'offers' && event.type === 'updated') {
            resolve(event);
          }
        });
      });

      await repository.update(offer.id, { status: 'en_cours_chiffrage' });

      const event = await Promise.race([
        eventPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Event timeout')), 1000))
      ]);

      expect(event).toBeDefined();
      expect(event.entityId).toBe(offer.id);
    });

    it('should emit offers:deleted event', async () => {
      const offer = await repository.create(createValidOfferData({
        intituleOperation: 'EventBus Delete Test',
            }

                      }


                                }


                              }));

      const eventPromise = new<unknown>unknown>unknown>((resolve) => {
        eventBus.once('event': unknown)unknunknown)any) => {
          if (event.entity === 'offers' && event.type === 'deleted') {
            resolve(event);
          }
        });
      });

      await repository.delete(offer.id);

      const event = await Promise.race([
        eventPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Event timeout')), 1000))
      ]);

      expect(event).toBeDefined();
      expect(event.entityId).toBe(offer.id);
    });
  });

  // ========================================
  // TESTS TRANSACTIONS (2 tests)
  // ========================================

  describe('Transactions', () => {
    it('should rollback on error within transaction', async () => {
      const testReference = `ROLLBACK-TEST-${Date.now()}`;
      
      try {
        await db.transaction(async (tx) => {
          const offer = await repository.create(createValidOfferData({
            reference: testReference,
            intituleOperation: 'Test Rollback',
          }), tx);

          expect(offer.id).toBeDefined();

          // Simuler une erreur pour provoquer le rollback
          throw new Error('Test rollback intentional error');
        });
      } catch (error) {
        // Erreur attendue
      }

      // Vérifier que l'offer n'existe pas (rollback réussi)
      const results = await repository.findAll({ search: testReference });
      expect(results.length).toBe(0);
    });

    it('should commit successfully within transaction', async () => {
      const testReference = `COMMIT-TEST-${Date.now()}`;
      let createdId: string | undefined;

      await db.transaction(async (tx) => {
        const offer = await repository.create(createValidOfferData({
          reference: testReference,
          intituleOperation: 'Test Commit',
        }), tx);

        createdId = offer.id;
        expect(offer.id).toBeDefined();

        // Pas d'erreur, le commit devrait réussir
      });

      // Vérifier que l'offer existe (commit réussi)
      expect(createdId).toBeDefined();
      const found = await repository.findById(createdId!);
      expect(found).toBeDefined();
      expect(found!.reference).toBe(testReference);

      // Cleanup
      createdOfferIds.push(createdId!);
    });
  });

  // ========================================
  // TESTS EDGE CASES (3+ tests)
  // ========================================

  describe('Edge Cases', () => {
    it('should handle empty filters', async () => {
      const results = await repository.findAll({});
      expect(Array.isArray(results)).toBe(true);
    });

    it('should normalize UUIDs correctly (uppercase to lowercase)', async () => {
      const offer = await repository.create(createValidOfferData({
        intituleOperation: 'UUID Normalization Test',
            }

                      }


                                }


                              }));
      createdOfferIds.push(offer.id);

      const uppercaseId = offer.id.toUpperCase();
      const found = await repository.findById(uppercaseId);

      expect(found).toBeDefined();
      expect(found!.id).toBe(offer.id.toLowerCase());
    });

    it('should throw on invalid UUID format', async () => {
      const invalidId = 'not-a-valid-uuid';

      await expect(async () => {
        await repository.findById(invalidId);
      }).rejects.toThrow(DatabaseError);

      await expect(async () => {
        await repository.findById(invalidId);
      }).rejects.toThrow(/Invalid UUID format/);
    });

    it('should handle exists() method correctly', async () => {
      const offer = await repository.create(createValidOfferData({
        intituleOperation: 'Exists Test',
            }

                      }


                                }


                              }));
      createdOfferIds.push(offer.id);

      const exists = await repository.exists(offer.id);
      expect(exists).toBe(true);

      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const notExists = await repository.exists(nonExistentId);
      expect(notExists).toBe(false);
    });

    it('should handle deleteMany with filters', async () => {
      const uniqueTag = `DELETE-MANY-${Date.now()}`;
      
      const offer1 = await repository.create(createValidOfferData({
        intituleOperation: uniqueTag,
        status: 'brouillon',
            }

                      }


                                }


                              }));
      const offer2 = await repository.create(createValidOfferData({
        intituleOperation: uniqueTag,
        status: 'brouillon',
            }

                      }


                                }


                              }));

      const deletedCount = await repository.deleteMany({
        search: uniqueTag,
        status: 'brouillon',
      });

      expect(deletedCount).toBe(2);

      const remaining = await repository.findAll({ search: uniqueTag });
      expect(remaining.length).toBe(0);
    });

    it('should handle createMany batch operation', async () => {
      const batchData: InsertOffer[] = [];
      for (let i = 0; i < 5; i++) {
        batchData.push(createValidOfferData({
          intituleOperation: `Batch Create ${i}`,
              }

                        }


                                  }


                                }));
      }

      const created = await repository.createMany(batchData);
      createdOfferIds.push(...created.map(o => o.id));

      expect(created.length).toBe(5);
      expect(created.every(o => o.id !== undefined)).toBe(true);
    });
  });
});
