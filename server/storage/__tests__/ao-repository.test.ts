/**
 * Tests d'intégration pour AoRepository
 * 
 * Objectif : Valider toutes les fonctionnalités avec une vraie base de données
 * - CRUD complet
 * - Intégration Monday.com (findByMondayId, filters)
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

import './integration-setup';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { AoRepository } from '../commercial/AoRepository';
import { db } from '../../db';
import { EventBus } from '../../eventBus';
import { aos } from '../../../shared/schema';
import type { InsertAo, Ao } from '../../../shared/schema';
import { eq } from 'drizzle-orm';

describe('AoRepository Integration Tests', () => {
  let repository: AoRepository;
  let eventBus: EventBus;
  let createdAoIds: string[] = [];

  // ========================================
  // SETUP ET CLEANUP
  // ========================================

  beforeAll(async () => {
    // Créer l'instance EventBus
    eventBus = new EventBus();
    
    // Créer le repository avec nom, db et eventBus
    repository = new AoRepository('AoRepository', db, eventBus);
  });

  afterAll(async () => {
    // Supprimer tous les AOs créés pendant les tests
    if (createdAoIds.length > 0) {
      await db.delete(aos).where(eq(aos.id, createdAoIds[0]));
      for (let i = 1; i < createdAoIds.length; i++) {
        await db.delete(aos).where(eq(aos.id, createdAoIds[i]));
      }
    } );

  // Helper pour créer un AO de test valide
  const createValidAoData = (overrides: Partial<InsertAo> = {}): InsertAo => {
    const timestamp = Date.now();
    return {
      reference: `AO-TEST-${timestamp}-${Math.random().toString(36).substring(7)}`,
      intituleOperation: 'Test AO',
      client: 'Client Test',
      location: 'Paris',
      menuiserieType: 'fenetre',
      source: 'website',
      status: 'etude',
      ...overrides,
    };
  };

  // ========================================
  // TESTS CRUD (5 tests)
  // ========================================

  describe('CRUD Operations', () => {
    it('should create an AO with all required fields', async () => {
      const aoData = createValidAoData({
        intituleOperation: 'Test Create AO',
        status: 'etude',
      });

      const ao = await repository.create(aoData);
      createdAoIds.push(ao.id);

      expect(ao).toBeDefined();
      expect(ao.id).toBeDefined();
      expect(ao.reference).toBe(aoData.reference);
      expect(ao.intituleOperation).toBe('Test Create AO');
      expect(ao.menuiserieType).toBe('fenetre');
      expect(ao.source).toBe('website');
      expect(ao.status).toBe('etude');
      expect(ao.client).toBe('Client Test');
      expect(ao.location).toBe('Paris');
    });

    it('should find AO by id', async () => {
      const created = await repository.create(createValidAoData({
        intituleOperation: 'Test Find By ID',
            }

                      }


                                }


                              }));
      createdAoIds.push(created.id);

      const found = await repository.findById(created.id);

      expect(found).toBeDefined();
      expect(found!.id).toBe(created.id);
      expect(found!.intituleOperation).toBe('Test Find By ID');
      expect(found!.reference).toBe(created.reference);
    });

    it('should update an AO', async () => {
      const created = await repository.create(createValidAoData({
        intituleOperation: 'Test Update',
        status: 'etude',
            }

                      }


                                }


                              }));
      createdAoIds.push(created.id);

      const updated = await repository.update(created.id, {
        status: 'finalise',
        intituleOperation: 'Test Updated',
      });

      expect(updated.status).toBe('finalise');
      expect(updated.intituleOperation).toBe('Test Updated');
      expect(updated.id).toBe(created.id);
    });

    it('should delete an AO', async () => {
      const created = await repository.create(createValidAoData({
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
  // TESTS MONDAY.COM INTEGRATION (3 tests)
  // ========================================

  describe('Monday.com Integration', () => {
    it('should find AO by mondayId', async () => {
      const mondayId = `monday-${Date.now()}`;
      const aoData = createValidAoData({ mondayItemId: mondayId });

      const created = await repository.create(aoData);
      createdAoIds.push(created.id);

      const found = await repository.findByMondayId(mondayId);

      expect(found).toBeDefined();
      expect(found!.id).toBe(created.id);
      expect(found!.mondayItemId).toBe(mondayId);
    });

    it('should return undefined for non-existent mondayId', async () => {
      const nonExistentMondayId = `monday-nonexistent-${Date.now()}`;
      
      const found = await repository.findByMondayId(nonExistentMondayId);

      expect(found).toBeUndefined();
    });

    it('should handle multiple AOs with different mondayIds', async () => {
      const mondayId1 = `monday-1-${Date.now()}`;
      const mondayId2 = `monday-2-${Date.now()}`;

      const ao1 = await repository.create(createValidAoData({ 
        mondayItemId: mondayId1,
        intituleOperation: 'AO Monday 1',
            }

                      }


                                }


                              }));
      createdAoIds.push(ao1.id);

      const ao2 = await repository.create(createValidAoData({ 
        mondayItemId: mondayId2,
        intituleOperation: 'AO Monday 2',
            }

                      }


                                }


                              }));
      createdAoIds.push(ao2.id);

      const found1 = await repository.findByMondayId(mondayId1);
      const found2 = await repository.findByMondayId(mondayId2);

      expect(found1).toBeDefined();
      expect(found1!.id).toBe(ao1.id);
      expect(found1!.mondayItemId).toBe(mondayId1);

      expect(found2).toBeDefined();
      expect(found2!.id).toBe(ao2.id);
      expect(found2!.mondayItemId).toBe(mondayId2);
    });
  });

  // ========================================
  // TESTS FILTRES (6 tests)
  // ========================================

  describe('Filters', () => {
    it('should filter by status', async () => {
      const ao1 = await repository.create(createValidAoData({
        intituleOperation: 'Filter Status Test 1',
        status: 'etude',
            }

                      }


                                }


                              }));
      createdAoIds.push(ao1.id);

      const ao2 = await repository.create(createValidAoData({
        intituleOperation: 'Filter Status Test 2',
        status: 'finalise',
            }

                      }


                                }


                              }));
      createdAoIds.push(ao2.id);

      const etudeResults = await repository.findAll({ status: 'etude' });
      const finaliseResults = await repository.findAll({ status: 'finalise' });

      expect(etudeResults.length).toBeGreaterThan(0);
      expect(etudeResults.every(ao => ao.status === 'etude')).toBe(true);
      expect(etudeResults.some(ao => ao.id === ao1.id)).toBe(true);

      expect(finaliseResults.length).toBeGreaterThan(0);
      expect(finaliseResults.every(ao => ao.status === 'finalise')).toBe(true);
      expect(finaliseResults.some(ao => ao.id === ao2.id)).toBe(true);
    });

    it('should filter by menuiserieType', async () => {
      const ao1 = await repository.create(createValidAoData({
        intituleOperation: 'Filter Menuiserie Fenetre',
        menuiserieType: 'fenetre',
            }

                      }


                                }


                              }));
      createdAoIds.push(ao1.id);

      const ao2 = await repository.create(createValidAoData({
        intituleOperation: 'Filter Menuiserie Porte',
        menuiserieType: 'porte',
            }

                      }


                                }


                              }));
      createdAoIds.push(ao2.id);

      const fenetreResults = await repository.findAll({ menuiserieType: 'fenetre' });
      const porteResults = await repository.findAll({ menuiserieType: 'porte' });

      expect(fenetreResults.length).toBeGreaterThan(0);
      expect(fenetreResults.every(ao => ao.menuiserieType === 'fenetre')).toBe(true);
      expect(fenetreResults.some(ao => ao.id === ao1.id)).toBe(true);

      expect(porteResults.length).toBeGreaterThan(0);
      expect(porteResults.every(ao => ao.menuiserieType === 'porte')).toBe(true);
      expect(porteResults.some(ao => ao.id === ao2.id)).toBe(true);
    });

    it('should filter by source', async () => {
      const ao = await repository.create(createValidAoData({
        intituleOperation: 'Filter Source Test',
        source: 'mail',
            }

                      }


                                }


                              }));
      createdAoIds.push(ao.id);

      const results = await repository.findAll({ source: 'mail' });

      expect(results.length).toBeGreaterThan(0);
      expect(results.every(ao => ao.source === 'mail')).toBe(true);
      expect(results.some(ao => ao.id === ao.id)).toBe(true);
    });

    it('should filter by hasMondayId', async () => {
      // Créer AO avec mondayId
      const withMonday = await repository.create(
        createValidAoData({ 
          mondayItemId: `monday-${Date.now()}`,
          intituleOperation: 'AO with Monday ID',
              }

                        }


                                  }


                                }));
      createdAoIds.push(withMonday.id);

      // Créer AO sans mondayId
      const withoutMonday = await repository.create(createValidAoData({
        intituleOperation: 'AO without Monday ID',
            }

                      }


                                }


                              }));
      createdAoIds.push(withoutMonday.id);

      // Filter: hasMondayId = true
      const withMondayResults = await repository.findAll({ hasMondayId: true });
      expect(withMondayResults.some(ao => ao.id === withMonday.id)).toBe(true);
      expect(withMondayResults.every(ao => ao.mondayItemId !== null)).toBe(true);

      // Filter: hasMondayId = false
      const withoutMondayResults = await repository.findAll({ hasMondayId: false });
      expect(withoutMondayResults.some(ao => ao.id === withoutMonday.id)).toBe(true);
      expect(withoutMondayResults.every(ao => ao.mondayItemId === null)).toBe(true);
    });

    it('should filter by search (reference, client, location)', async () => {
      const uniqueString = `SEARCH-${Date.now()}`;
      const ao = await repository.create(createValidAoData({
        intituleOperation: 'Filter Search Test',
        reference: uniqueString,
            }

                      }


                                }


                              }));
      createdAoIds.push(ao.id);

      const results = await repository.findAll({ search: uniqueString });

      expect(results.length).toBeGreaterThan(0);
      expect(results.some(ao => ao.id === ao.id)).toBe(true);
    });

    it('should combine multiple filters', async () => {
      const ao = await repository.create(createValidAoData({
        intituleOperation: 'Combined Filters Test',
        status: 'etude',
        menuiserieType: 'fenetre',
        source: 'website',
            }

                      }


                                }


                              }));
      createdAoIds.push(ao.id);

      const results = await repository.findAll({
        status: 'etude',
        menuiserieType: 'fenetre',
        source: 'website',
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results.every(ao =>
        ao.status === 'etude' &&
        ao.menuiserieType === 'fenetre' &&
        ao.source === 'website'
      )).toBe(true);
      expect(results.some(ao => ao.id === ao.id)).toBe(true);
    });
  });

  // ========================================
  // TESTS PAGINATION (3 tests)
  // ========================================

  describe('Pagination', () => {
    it('should paginate results correctly', async () => {
      // Créer 15 AOs pour tester la pagination
      const aoIds: string[] = [];
      for (let i = 0; i < 15; i++) {
        const ao = await repository.create(createValidAoData({
          intituleOperation: `Pagination Test ${i}`,
              }

                        }


                                  }


                                }));
        aoIds.push(ao.id);
      }
      createdAoIds.push(...aoIds);

      const page1 = await repository.findPaginated(
        {},
        { limit: 5, offset: 0 }
      );

      const page2 = await repository.findPaginated(
        {},
        { limit: 5, offset: 5 }
      );

      expect(page1.items.length).toBeLessThanOrEqual(5);
      expect(page2.items.length).toBeLessThanOrEqual(5);
      expect(page1.total).toBeGreaterThanOrEqual(15);
      expect(page1.limit).toBe(5);
      expect(page1.offset).toBe(0);
      expect(page2.offset).toBe(5);

      // Vérifier qu'il n'y a pas de doublons entre les pages
      const page1Ids = page1.items.map(ao => ao.id);
      const page2Ids = page2.items.map(ao => ao.id);
      const intersection = page1Ids.filter(id => page2Ids.includes(id));
      expect(intersection.length).toBe(0);
    });

    it('should return correct total count', async () => {
      const countBefore = await repository.count();

      const ao1 = await repository.create(createValidAoData({
        intituleOperation: 'Count Test 1',
            }

                      }


                                }


                              }));
      const ao2 = await repository.create(createValidAoData({
        intituleOperation: 'Count Test 2',
            }

                      }


                                }


                              }));
      createdAoIds.push(ao1.id, ao2.id);

      const countAfter = await repository.count();

      expect(countAfter).toBe(countBefore + 2);

      const paginated = await repository.findPaginated({}, { limit: 10, offset: 0 });
      expect(paginated.total).toBe(countAfter);
    });

    it('should handle empty results', async () => {
      const nonExistentStatus = 'nonexistent_status' as unknown;
      
      const results = await repository.findPaginated(
        { status: nonExistentStatus },
        { limit: 10, offset: 0 }
      );

      expect(results.items.length).toBe(0);
      expect(results.total).toBe(0);
      expect(results.hasNext).toBe(false);
    });
  });

  // ========================================
  // TESTS EVENTBUS INTEGRATION (3 tests)
  // ========================================

  describe('EventBus Integration', () => {
    it('should emit aos:created event', async () => {
      const eventPromise = new Promise((resolve) => {
        eventBus.once('aos:created', resolve);
      });

      const ao = await repository.create(createValidAoData({
        intituleOperation: 'EventBus Create Test',
            }

                      }


                                }


                              }));
      createdAoIds.push(ao.id);

      const event = await eventPromise;
      expect(event).toBeDefined();
      expect((event as Ao).id).toBe(ao.id);
    });

    it('should emit aos:updated event', async () => {
      const created = await repository.create(createValidAoData({
        intituleOperation: 'EventBus Update Test',
            }

                      }


                                }


                              }));
      createdAoIds.push(created.id);

      const eventPromise = new Promise((resolve) => {
        eventBus.once('aos:updated', resolve);
      });

      await repository.update(created.id, {
        intituleOperation: 'EventBus Updated',
      });

      const event = await eventPromise;
      expect(event).toBeDefined();
      expect((event as Ao).id).toBe(created.id);
      expect((event as Ao).intituleOperation).toBe('EventBus Updated');
    });

    it('should emit aos:deleted event', async () => {
      const created = await repository.create(createValidAoData({
        intituleOperation: 'EventBus Delete Test',
            }

                      }


                                }


                              }));

      const eventPromise = new Promise((resolve) => {
        eventBus.once('aos:deleted', resolve);
      });

      await repository.delete(created.id);

      const event = await eventPromise;
      expect(event).toBeDefined();
      expect((event as { id: string }).id).toBe(created.id);
    });
  });

  // ========================================
  // TESTS TRANSACTIONS (2 tests)
  // ========================================

  describe('Transactions', () => {
    it('should rollback on error within transaction', async () => {
      const aoData = createValidAoData({ 
        reference: `TEST-ROLLBACK-${Date.now()}`,
      });

      try {
        await db.transaction(async (tx) => {
          const ao = await repository.create(aoData, tx);
          createdAoIds.push(ao.id);

          // Simuler une erreur
          throw new Error('Test rollback');
        });
      } catch (error) {
        // Expected error
      }

      // Vérifier que l'AO n'existe pas
      const aos = await repository.findAll();
      expect(aos.find(a => a.reference === aoData.reference)).toBeUndefined();
    });

    it('should commit successfully within transaction', async () => {
      let aoId: string | undefined;

      await db.transaction(async (tx) => {
        const ao = await repository.create(createValidAoData({
          intituleOperation: 'Transaction Commit Test',
        }), tx);
        aoId = ao.id;
        createdAoIds.push(ao.id);

        // Mettre à jour dans la même transaction
        await repository.update(ao.id, {
          intituleOperation: 'Transaction Updated',
        }, tx);
      });

      // Vérifier que l'AO existe et a été mis à jour
      const found = await repository.findById(aoId!);
      expect(found).toBeDefined();
      expect(found!.intituleOperation).toBe('Transaction Updated');
    });
  });

  // ========================================
  // TESTS EDGE CASES (3 tests)
  // ========================================

  describe('Edge Cases', () => {
    it('should handle empty filters', async () => {
      const results = await repository.findAll({});

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThanOrEqual(0);
    });

    it('should normalize UUIDs correctly', async () => {
      const created = await repository.create(createValidAoData({
        intituleOperation: 'UUID Normalization Test',
            }

                      }


                                }


                              }));
      createdAoIds.push(created.id);

      // Test avec UUID en majuscules et espaces
      const upperCaseId = `  ${created.id.toUpperCase()}  `;
      const found = await repository.findById(upperCaseId);

      expect(found).toBeDefined();
      expect(found!.id).toBe(created.id);
    });

    it('should throw on invalid UUID format', async () => {
      const invalidUUIDs = [
        'not-a-uuid',
        '12345',
        'abc-def-ghi',
        '550e8400-e29b-41d4-a716', // UUID incomplet
      ];

      for (const invalidId of invalidUUIDs) {
        await expect(repository.findById(invalidId))
          .rejects.toThrow();
      }
    });
  });
});
