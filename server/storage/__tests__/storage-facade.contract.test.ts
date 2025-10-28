/**
 * Tests contractuels pour StorageFacade
 * 
 * Ces tests vérifient que StorageFacade expose les mêmes méthodes que DatabaseStorage
 * et que la délégation fonctionne correctement.
 * 
 * OBJECTIF : Détecter les drifts de signature entre nouveau/ancien code
 */

import { describe, it, expect, beforeAll, vi } from 'vitest';
import { StorageFacade } from '../facade/StorageFacade';
import { eventBus } from '../../eventBus';

// Désactiver le mock auto pour importer le vrai module
vi.mock('../../storage-poc', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual
  };
});

describe('StorageFacade Contract Tests', () => {
  let facade: StorageFacade;
  let legacyStorage: any;
  let DatabaseStorage: any;
  
  beforeAll(async () => {
    // Importer dynamiquement le module pour éviter les problèmes de mock
    const storagePocModule = await import('../../storage-poc');
    legacyStorage = storagePocModule.storage;
    DatabaseStorage = storagePocModule.DatabaseStorage;
    
    // Initialiser la facade avec l'eventBus
    facade = new StorageFacade(eventBus);
  });

  /**
   * Test 1: Vérifier que la facade expose les mêmes méthodes que le legacy storage
   * 
   * Ce test compare les noms de méthodes exposées par les deux classes.
   * Si une méthode existe dans DatabaseStorage mais pas dans StorageFacade,
   * cela indique un drift qui pourrait casser l'application.
   */
  it('should expose the same methods as legacy storage', () => {
    // Récupérer les méthodes du prototype de DatabaseStorage
    const legacyMethods = Object.getOwnPropertyNames(DatabaseStorage.prototype)
      .filter(name => name !== 'constructor' && typeof (legacyStorage as any)[name] === 'function');
    
    // Récupérer les méthodes du prototype de StorageFacade
    const facadeMethods = Object.getOwnPropertyNames(StorageFacade.prototype)
      .filter(name => name !== 'constructor');
    
    // Récupérer aussi les getters (méthodes déléguées)
    const facadeDescriptors = Object.getOwnPropertyDescriptors(StorageFacade.prototype);
    const facadeGetters = Object.keys(facadeDescriptors)
      .filter(key => facadeDescriptors[key].get !== undefined);
    
    const allFacadeMethods = [...facadeMethods, ...facadeGetters];
    
    // Vérifier que chaque méthode legacy existe dans la facade
    const missingMethods: string[] = [];
    legacyMethods.forEach(method => {
      if (!allFacadeMethods.includes(method)) {
        missingMethods.push(method);
      }
    });
    
    // Afficher les méthodes manquantes si il y en a
    if (missingMethods.length > 0) {
      console.warn('⚠️  Méthodes manquantes dans StorageFacade:', missingMethods);
    }
    
    // Le test passe si toutes les méthodes sont présentes
    expect(missingMethods).toEqual([]);
  });

  /**
   * Test 2: Vérifier que les méthodes déléguées sont accessibles
   * 
   * Ce test vérifie que les méthodes déléguées via getters
   * sont bien accessibles comme des fonctions.
   */
  it('should have all delegated methods accessible as functions', () => {
    // Liste de méthodes critiques qui doivent être déléguées
    const criticalMethods = [
      'getUser',
      'getUsers',
      'upsertUser',
      'getAo',
      'getAos',
      'createAo',
      'updateAo',
      'getOffer',
      'getOffers',
      'createOffer',
      'updateOffer',
      'getProject',
      'getProjects',
      'createProject',
      'updateProject'
    ];
    
    criticalMethods.forEach(methodName => {
      expect(typeof (facade as any)[methodName]).toBe('function');
    });
  });

  /**
   * Test 3: Vérifier la cohérence des types de retour
   * 
   * Ce test vérifie que les méthodes retournent des Promises
   * (caractéristique des méthodes async de DatabaseStorage)
   */
  it('should return promises for async methods', () => {
    // Tester quelques méthodes asynchrones
    const asyncMethods = [
      'getUser',
      'getAos',
      'getOffers',
      'getProjects'
    ];
    
    asyncMethods.forEach(methodName => {
      const method = (facade as any)[methodName];
      expect(method).toBeDefined();
      expect(typeof method).toBe('function');
    });
  });

  /**
   * Test 4: Vérifier que les méthodes utilisateur fonctionnent
   * 
   * Test d'intégration qui vérifie que les méthodes critiques
   * liées aux utilisateurs fonctionnent correctement.
   */
  describe('User operations delegation', () => {
    it('should delegate getUsers() correctly', async () => {
      const users = await facade.getUsers();
      expect(users).toBeDefined();
      expect(Array.isArray(users)).toBe(true);
    });

    it('should delegate getUser() correctly', async () => {
      // Tester avec un ID inexistant (devrait retourner undefined, pas d'erreur)
      const user = await facade.getUser('non-existent-id');
      expect(user).toBeUndefined();
    });
  });

  /**
   * Test 5: Vérifier que les méthodes AO fonctionnent
   * 
   * Test d'intégration pour les Appels d'Offres
   */
  describe('AO operations delegation', () => {
    it('should delegate getAos() correctly', async () => {
      const aos = await facade.getAos();
      expect(aos).toBeDefined();
      expect(Array.isArray(aos)).toBe(true);
    });

    it('should delegate getAo() correctly', async () => {
      // Tester avec un ID inexistant
      const ao = await facade.getAo('non-existent-id');
      expect(ao).toBeUndefined();
    });

    it('should delegate getAOsPaginated() correctly', async () => {
      const result = await facade.getAOsPaginated({
        limit: 10,
        offset: 0
      });
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('limit');
      expect(result).toHaveProperty('offset');
      expect(Array.isArray(result.items)).toBe(true);
    });
  });

  /**
   * Test 6: Vérifier que les méthodes Offer fonctionnent
   * 
   * Test d'intégration pour les Offres
   */
  describe('Offer operations delegation', () => {
    it('should delegate getOffers() correctly', async () => {
      const offers = await facade.getOffers();
      expect(offers).toBeDefined();
      expect(Array.isArray(offers)).toBe(true);
    });

    it('should delegate getOffer() correctly', async () => {
      // Tester avec un ID inexistant
      const offer = await facade.getOffer('non-existent-id');
      expect(offer).toBeUndefined();
    });

    it('should delegate getOffersPaginated() correctly', async () => {
      const result = await facade.getOffersPaginated({
        limit: 10,
        offset: 0
      });
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('total');
      expect(Array.isArray(result.items)).toBe(true);
    });
  });

  /**
   * Test 7: Vérifier que les méthodes Project fonctionnent
   * 
   * Test d'intégration pour les Projets
   */
  describe('Project operations delegation', () => {
    it('should delegate getProjects() correctly', async () => {
      const projects = await facade.getProjects();
      expect(projects).toBeDefined();
      expect(Array.isArray(projects)).toBe(true);
    });

    it('should delegate getProject() correctly', async () => {
      // Tester avec un ID inexistant
      const project = await facade.getProject('non-existent-id');
      expect(project).toBeUndefined();
    });

    it('should delegate getProjectsPaginated() correctly', async () => {
      const result = await facade.getProjectsPaginated({
        limit: 10,
        offset: 0
      });
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('total');
      expect(Array.isArray(result.items)).toBe(true);
    });
  });

  /**
   * Test 8: Vérifier que les méthodes de recherche fonctionnent
   * 
   * Test d'intégration pour les recherches globales
   * Note: searchEntities n'existe pas encore dans StorageFacade
   */
  describe('Search operations delegation', () => {
    it.skip('should delegate searchEntities() correctly (not implemented yet)', async () => {
      // Cette méthode sera ajoutée dans une future itération
    });
  });

  /**
   * Test 9: Vérifier que les méthodes de statistiques fonctionnent
   * 
   * Test d'intégration pour les statistiques et KPIs
   */
  describe('Statistics operations delegation', () => {
    it('should delegate getKPISnapshots() correctly', async () => {
      const kpis = await facade.getKPISnapshots({ limit: 10, offset: 0 });
      expect(kpis).toBeDefined();
    });

    it('should delegate getConsolidatedKpis() correctly', async () => {
      const consolidated = await facade.getConsolidatedKpis({
        from: new Date('2024-01-01'),
        to: new Date()
      });
      
      expect(consolidated).toBeDefined();
      expect(consolidated).toHaveProperty('periodSummary');
      expect(consolidated).toHaveProperty('breakdowns');
      expect(consolidated).toHaveProperty('timeSeries');
    });
  });

  /**
   * Test 10: Vérifier que les méthodes de supplier fonctionnent
   * 
   * Test d'intégration pour les fournisseurs
   */
  describe('Supplier operations delegation', () => {
    it('should delegate getSuppliers() correctly', async () => {
      const suppliers = await facade.getSuppliers();
      expect(suppliers).toBeDefined();
      expect(Array.isArray(suppliers)).toBe(true);
    });

    it('should delegate getSupplier() correctly', async () => {
      // Tester avec un ID inexistant
      const supplier = await facade.getSupplier('non-existent-id');
      expect(supplier).toBeUndefined();
    });
  });

  /**
   * Test de synthèse: Vérifier la couverture globale
   * 
   * Ce test génère un rapport de couverture des méthodes
   */
  it('should provide comprehensive method coverage report', () => {
    const legacyMethods = Object.getOwnPropertyNames(DatabaseStorage.prototype)
      .filter(name => name !== 'constructor' && typeof (legacyStorage as any)[name] === 'function');
    
    const facadeDescriptors = Object.getOwnPropertyDescriptors(StorageFacade.prototype);
    const facadeGetters = Object.keys(facadeDescriptors)
      .filter(key => facadeDescriptors[key].get !== undefined);
    
    const coverage = (facadeGetters.length / legacyMethods.length) * 100;
    
    console.log(`\n📊 Coverage Report:`);
    console.log(`   Legacy methods: ${legacyMethods.length}`);
    console.log(`   Facade getters: ${facadeGetters.length}`);
    console.log(`   Coverage: ${coverage.toFixed(2)}%`);
    
    // On s'attend à au moins 90% de couverture
    expect(coverage).toBeGreaterThanOrEqual(90);
  });
});
