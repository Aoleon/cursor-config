/**
 * Facade unifiée pour le système de storage
 * 
 * Cette facade expose l'interface IStorage existante et délègue toutes les opérations
 * au DatabaseStorage (storage-poc.ts) pour l'instant.
 * 
 * Au fur et à mesure de la migration, les méthodes seront progressivement redirigées
 * vers les nouveaux repositories modulaires tout en maintenant la compatibilité.
 */

import type { IStorage, DatabaseStorage as DatabaseStorageType, DrizzleTransaction } from '../../storage-poc';
import { DatabaseStorage } from '../../storage-poc';
import type { EventBus } from '../../eventBus';
import { logger } from '../../utils/logger';
import { db } from '../../db';
import { OfferRepository, type OfferFilters } from '../commercial/OfferRepository';
import { AoRepository, type AoFilters } from '../commercial/AoRepository';
import { ProductionRepository } from '../production/ProductionRepository';
import { SuppliersRepository } from '../suppliers/SuppliersRepository';
import { ChiffrageRepository } from '../chiffrage/ChiffrageRepository';
import { DateIntelligenceRepository } from '../date-intelligence/DateIntelligenceRepository';
import type { Offer, InsertOffer, Ao, InsertAo, User, ChiffrageElement, InsertChiffrageElement, DpgfDocument, InsertDpgfDocument, ValidationMilestone, InsertValidationMilestone, DateIntelligenceRule, InsertDateIntelligenceRule, DateAlert, InsertDateAlert } from '@shared/schema';

/**
 * Facade de storage qui unifie l'accès aux données
 * 
 * Pour l'instant, cette classe délègue simplement toutes les opérations
 * au DatabaseStorage existant via un Proxy transparent. Au fur et à mesure 
 * de la refactorisation, nous remplacerons progressivement les implémentations 
 * par les nouveaux repositories modulaires.
 * 
 * Pattern de migration progressive:
 * 1. Toutes les routes utilisent storageFacade au lieu de storage
 * 2. On implémente un nouveau repository (ex: OfferRepository)
 * 3. On remplace l'implémentation dans la facade pour ce domaine
 * 4. Les routes continuent de fonctionner sans changement
 * 
 * @example
 * ```typescript
 * // Avant (ancien code)
 * import { storage } from './storage-poc';
 * const offer = await storage.getOffer(id);
 * 
 * // Après (nouveau code)
 * import { storageFacade } from './storage/facade/StorageFacade';
 * const offer = await storageFacade.getOffer(id);
 * ```
 */
export class StorageFacade {
  /**
   * Instance du storage legacy (storage-poc.ts)
   * Toutes les méthodes délèguent à cette instance pour l'instant
   */
  private readonly legacyStorage: IStorage;

  /**
   * Instance de la base de données
   * Utilisée pour instancier les nouveaux repositories modulaires
   */
  private readonly db: any;

  /**
   * Event bus pour les notifications
   */
  private readonly eventBus: EventBus;

  /**
   * Logger contextualisé pour la facade
   */
  private readonly facadeLogger = logger.child('StorageFacade');

  /**
   * Nouveaux repositories modulaires
   */
  private readonly offerRepository: OfferRepository;
  private readonly aoRepository: AoRepository;
  private readonly productionRepository: ProductionRepository;
  private readonly suppliersRepository: SuppliersRepository;
  private readonly chiffrageRepository: ChiffrageRepository;
  private readonly dateIntelligenceRepository: DateIntelligenceRepository;

  /**
   * Constructeur
   * 
   * @param dbInstance - Instance de la base de données (par défaut : db global)
   * @param eventBus - Event bus pour les notifications
   */
  constructor(eventBus: EventBus, dbInstance: any = db) {
    this.db = dbInstance;
    this.eventBus = eventBus;
    // Double cast nécessaire : DatabaseStorage n'implémente pas encore toutes les méthodes de IStorage
    // durant la migration progressive. Les méthodes manquantes seront ajoutées au fur et à mesure
    // ou supprimées de IStorage si obsolètes. Pattern standard pour migration progressive.
    this.legacyStorage = new DatabaseStorage(eventBus) as unknown as IStorage;
    
    // Instancier les nouveaux repositories
    this.offerRepository = new OfferRepository(this.db, this.eventBus);
    this.aoRepository = new AoRepository(this.db, this.eventBus);
    this.productionRepository = new ProductionRepository(this.db, this.eventBus);
    this.suppliersRepository = new SuppliersRepository(this.db, this.eventBus);
    this.chiffrageRepository = new ChiffrageRepository(this.db, this.eventBus);
    this.dateIntelligenceRepository = new DateIntelligenceRepository(this.db, this.eventBus);
    
    this.facadeLogger.info('StorageFacade initialisée avec repositories modulaires', {
      metadata: {
        module: 'StorageFacade',
        operation: 'constructor',
        status: 'hybrid_mode',
        hasDb: !!this.db,
        hasEventBus: !!this.eventBus,
        repositories: ['OfferRepository', 'AoRepository', 'ProductionRepository', 'SuppliersRepository', 'ChiffrageRepository', 'DateIntelligenceRepository']
      }
    });
  }

  /**
   * Retourne l'instance legacy storage
   * Utilisé pour délégation transparente de toutes les méthodes
   */
  private getStorage(): IStorage {
    return this.legacyStorage;
  }

  // ========================================
  // PATTERN DE DÉLÉGATION TRANSPARENT
  // ========================================
  //
  // Au lieu d'implémenter manuellement chaque méthode de IStorage (100+ méthodes),
  // nous utilisons un système de délégation transparent via des getters.
  // 
  // Cela nous permet de :
  // 1. Avoir une façade fonctionnelle immédiatement
  // 2. Migrer progressivement les méthodes vers les nouveaux repositories
  // 3. Maintenir la compatibilité avec l'interface IStorage
  //
  // Pour migrer une méthode spécifique vers un nouveau repository:
  // 1. Déclarer une méthode explicite qui overrides le getter
  // 2. Utiliser le nouveau repository dans cette méthode
  //
  // Exemple:
  // ```typescript
  // async getOffer(id: string) {
  //   // Migration vers nouveau repository
  //   return this.offerRepository!.findById(id);
  // }
  // ```
  
  // User operations
  get getUsers() { return this.legacyStorage.getUsers.bind(this.legacyStorage); }
  get getUser() { return this.legacyStorage.getUser.bind(this.legacyStorage); }
  get upsertUser() { return this.legacyStorage.upsertUser.bind(this.legacyStorage); }

  // ========================================
  // AO OPERATIONS - Déléguées vers AoRepository
  // ========================================

  /**
   * Récupère tous les AOs
   * Utilise AoRepository avec fallback sur legacy
   */
  async getAos(): Promise<Ao[]> {
    try {
      const aos = await this.aoRepository.findAll();
      this.facadeLogger.info('AOs récupérés via AoRepository', {
        metadata: { count: aos.length, module: 'StorageFacade', operation: 'getAos' }
      });
      return aos;
    } catch (error) {
      this.facadeLogger.warn('AoRepository.findAll failed, falling back to legacy', {
        metadata: { error, module: 'StorageFacade', operation: 'getAos' }
      });
      return await this.legacyStorage.getAos();
    }
  }

  /**
   * Récupère les AOs paginés avec recherche et filtre de statut
   * Utilise AoRepository avec fallback sur legacy
   */
  async getAOsPaginated(
    search?: string, 
    status?: string, 
    limit: number = 20, 
    offset: number = 0
  ): Promise<{ aos: Array<Ao>, total: number }> {
    try {
      const filters: AoFilters = {};
      if (search) filters.search = search;
      if (status) filters.status = status;

      const result = await this.aoRepository.findPaginated(
        filters,
        { limit, offset }
      );

      return {
        aos: result.items,
        total: result.total
      };
    } catch (error) {
      this.facadeLogger.warn('AoRepository.findPaginated failed, falling back to legacy', {
        metadata: { error, search, status, limit, offset, module: 'StorageFacade', operation: 'getAOsPaginated' }
      });
      return await this.legacyStorage.getAOsPaginated(search, status, limit, offset);
    }
  }

  /**
   * Récupère un AO par ID
   * Utilise AoRepository avec fallback sur legacy
   */
  async getAo(id: string, tx?: DrizzleTransaction): Promise<Ao | undefined> {
    try {
      const ao = await this.aoRepository.findById(id, tx);
      if (ao) {
        this.facadeLogger.info('AO récupéré via AoRepository', {
          metadata: { aoId: id, module: 'StorageFacade', operation: 'getAo' }
        });
      }
      return ao;
    } catch (error) {
      this.facadeLogger.warn('AoRepository.findById failed, falling back to legacy', {
        metadata: { error, aoId: id, module: 'StorageFacade', operation: 'getAo' }
      });
      return await this.legacyStorage.getAo(id, tx);
    }
  }

  /**
   * Récupère un AO par Monday Item ID
   * Utilise AoRepository avec fallback sur legacy
   */
  async getAOByMondayItemId(mondayItemId: string, tx?: DrizzleTransaction): Promise<Ao | undefined> {
    try {
      const ao = await this.aoRepository.findByMondayId(mondayItemId, tx);
      if (ao) {
        this.facadeLogger.info('AO récupéré par Monday ID via AoRepository', {
          metadata: { mondayItemId, aoId: ao.id, module: 'StorageFacade', operation: 'getAOByMondayItemId' }
        });
      }
      return ao;
    } catch (error) {
      this.facadeLogger.warn('AoRepository.findByMondayId failed, falling back to legacy', {
        metadata: { error, mondayItemId, module: 'StorageFacade', operation: 'getAOByMondayItemId' }
      });
      return await this.legacyStorage.getAOByMondayItemId(mondayItemId, tx);
    }
  }

  /**
   * Crée un nouvel AO
   * Utilise AoRepository avec fallback sur legacy
   */
  async createAo(ao: InsertAo, tx?: DrizzleTransaction): Promise<Ao> {
    try {
      const created = await this.aoRepository.create(ao, tx);
      this.facadeLogger.info('AO créé via AoRepository', {
        metadata: { aoId: created.id, module: 'StorageFacade', operation: 'createAo' }
      });
      return created;
    } catch (error) {
      this.facadeLogger.warn('AoRepository.create failed, falling back to legacy', {
        metadata: { error, module: 'StorageFacade', operation: 'createAo' }
      });
      return await this.legacyStorage.createAo(ao, tx);
    }
  }

  /**
   * Met à jour un AO
   * Utilise AoRepository avec fallback sur legacy
   */
  async updateAo(id: string, ao: Partial<InsertAo>, tx?: DrizzleTransaction): Promise<Ao> {
    try {
      const updated = await this.aoRepository.update(id, ao, tx);
      this.facadeLogger.info('AO mis à jour via AoRepository', {
        metadata: { aoId: id, module: 'StorageFacade', operation: 'updateAo' }
      });
      return updated;
    } catch (error) {
      this.facadeLogger.warn('AoRepository.update failed, falling back to legacy', {
        metadata: { error, aoId: id, module: 'StorageFacade', operation: 'updateAo' }
      });
      return await this.legacyStorage.updateAo(id, ao, tx);
    }
  }

  /**
   * Supprime un AO
   * Utilise AoRepository avec fallback sur legacy
   */
  async deleteAo(id: string, tx?: DrizzleTransaction): Promise<void> {
    try {
      await this.aoRepository.delete(id, tx);
      this.facadeLogger.info('AO supprimé via AoRepository', {
        metadata: { aoId: id, module: 'StorageFacade', operation: 'deleteAo' }
      });
    } catch (error) {
      this.facadeLogger.warn('AoRepository.delete failed, falling back to legacy', {
        metadata: { error, aoId: id, module: 'StorageFacade', operation: 'deleteAo' }
      });
      await this.legacyStorage.deleteAo(id, tx);
    }
  }

  // ========================================
  // OFFER OPERATIONS - Déléguées vers OfferRepository
  // ========================================

  /**
   * Récupère les offres avec recherche et filtre de statut
   * Utilise OfferRepository avec fallback sur legacy
   */
  async getOffers(search?: string, status?: string): Promise<Offer[]> {
    try {
      const filters: OfferFilters = {};
      if (search) filters.search = search;
      if (status) filters.status = status;

      const offers = await this.offerRepository.findAll(filters);
      
      this.facadeLogger.info('[StorageFacade] getOffers - Using OfferRepository', {
        metadata: {
          module: 'StorageFacade',
          operation: 'getOffers',
          count: offers.length,
          filters
        }
      });
      
      return offers;
    } catch (error) {
      this.facadeLogger.warn('[StorageFacade] getOffers - Fallback to legacy', {
        metadata: {
          module: 'StorageFacade',
          operation: 'getOffers',
          error: error instanceof Error ? error.message : 'Unknown error',
          search,
          status
        }
      });
      return await this.legacyStorage.getOffers(search, status);
    }
  }

  /**
   * Récupère les offres paginées
   * Utilise OfferRepository avec fallback sur legacy
   */
  async getOffersPaginated(
    search?: string, 
    status?: string, 
    limit: number = 20, 
    offset: number = 0
  ): Promise<{ offers: Offer[], total: number, limit: number, offset: number }> {
    try {
      const filters: OfferFilters = {};
      if (search) filters.search = search;
      if (status) filters.status = status;

      const result = await this.offerRepository.findPaginated(
        filters,
        { limit, offset }
      );

      this.facadeLogger.info('[StorageFacade] getOffersPaginated - Using OfferRepository', {
        metadata: {
          module: 'StorageFacade',
          operation: 'getOffersPaginated',
          count: result.items.length,
          total: result.total,
          filters
        }
      });

      return {
        offers: result.items,
        total: result.total,
        limit,
        offset
      };
    } catch (error) {
      this.facadeLogger.warn('[StorageFacade] getOffersPaginated - Fallback to legacy', {
        metadata: {
          module: 'StorageFacade',
          operation: 'getOffersPaginated',
          error: error instanceof Error ? error.message : 'Unknown error',
          search,
          status,
          limit,
          offset
        }
      });
      const legacyResult = await this.legacyStorage.getOffersPaginated(search, status, limit, offset);
      // Ensure legacy result has limit and offset for type consistency
      return {
        ...legacyResult,
        limit,
        offset
      };
    }
  }

  /**
   * Récupère les offres et AOs combinés paginés
   * Fallback direct sur legacy car nécessite une logique complexe
   */
  get getCombinedOffersPaginated() { 
    return this.legacyStorage.getCombinedOffersPaginated.bind(this.legacyStorage); 
  }

  /**
   * Récupère une offre par ID
   * Utilise OfferRepository avec fallback sur legacy
   */
  async getOffer(id: string): Promise<Offer | undefined> {
    try {
      const offer = await this.offerRepository.findById(id);
      
      this.facadeLogger.info('[StorageFacade] getOffer - Using OfferRepository', {
        metadata: {
          module: 'StorageFacade',
          operation: 'getOffer',
          id,
          found: !!offer
        }
      });
      
      return offer;
    } catch (error) {
      this.facadeLogger.warn('[StorageFacade] getOffer - Fallback to legacy', {
        metadata: {
          module: 'StorageFacade',
          operation: 'getOffer',
          id,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
      return await this.legacyStorage.getOffer(id);
    }
  }

  /**
   * Alias pour getOffer
   * Délègue simplement à getOffer
   */
  async getOfferById(id: string): Promise<Offer | undefined> {
    return this.getOffer(id);
  }

  /**
   * Crée une nouvelle offre
   * Utilise OfferRepository avec fallback sur legacy
   */
  async createOffer(offer: InsertOffer): Promise<Offer> {
    try {
      const created = await this.offerRepository.create(offer);
      this.facadeLogger.info('Offre créée via OfferRepository', {
        metadata: { offerId: created.id, module: 'StorageFacade', operation: 'createOffer' }
      });
      return created;
    } catch (error) {
      this.facadeLogger.warn('OfferRepository.create failed, falling back to legacy', {
        metadata: { error, module: 'StorageFacade', operation: 'createOffer' }
      });
      return await this.legacyStorage.createOffer(offer);
    }
  }

  /**
   * Met à jour une offre
   * Utilise OfferRepository avec fallback sur legacy
   */
  async updateOffer(id: string, offer: Partial<InsertOffer>): Promise<Offer> {
    try {
      const updated = await this.offerRepository.update(id, offer);
      this.facadeLogger.info('Offre mise à jour via OfferRepository', {
        metadata: { offerId: id, module: 'StorageFacade', operation: 'updateOffer' }
      });
      return updated;
    } catch (error) {
      this.facadeLogger.warn('OfferRepository.update failed, falling back to legacy', {
        metadata: { error, offerId: id, module: 'StorageFacade', operation: 'updateOffer' }
      });
      return await this.legacyStorage.updateOffer(id, offer);
    }
  }

  /**
   * Supprime une offre
   * Utilise OfferRepository avec fallback sur legacy
   */
  async deleteOffer(id: string): Promise<void> {
    try {
      await this.offerRepository.delete(id);
      this.facadeLogger.info('Offre supprimée via OfferRepository', {
        metadata: { offerId: id, module: 'StorageFacade', operation: 'deleteOffer' }
      });
    } catch (error) {
      this.facadeLogger.warn('OfferRepository.delete failed, falling back to legacy', {
        metadata: { error, offerId: id, module: 'StorageFacade', operation: 'deleteOffer' }
      });
      await this.legacyStorage.deleteOffer(id);
    }
  }

  // ========================================
  // PROJECT OPERATIONS - Déléguées vers ProductionRepository
  // ========================================

  /**
   * Récupère tous les projets avec recherche et filtre de statut
   * Utilise ProductionRepository avec fallback sur legacy
   */
  async getProjects(search?: string, status?: string) {
    try {
      const filters: any = {};
      if (search) filters.search = search;
      if (status) filters.status = status;
      
      const projects = await this.productionRepository.findAll(filters);
      
      this.facadeLogger.info('[StorageFacade] getProjects - Using ProductionRepository', {
        metadata: { module: 'StorageFacade', operation: 'getProjects', count: projects.length }
      });
      
      return projects;
    } catch (error) {
      this.facadeLogger.warn('[StorageFacade] getProjects - Fallback to legacy', {
        metadata: { module: 'StorageFacade', operation: 'getProjects', error: error instanceof Error ? error.message : 'Unknown' }
      });
      return await this.legacyStorage.getProjects(search, status);
    }
  }

  /**
   * Récupère les projets paginés
   * Utilise ProductionRepository avec fallback sur legacy
   */
  async getProjectsPaginated(search?: string, status?: string, limit: number = 20, offset: number = 0) {
    try {
      const filters: any = {};
      if (search) filters.search = search;
      if (status) filters.status = status;
      
      const result = await this.productionRepository.findPaginated(filters, { limit, offset });
      
      this.facadeLogger.info('[StorageFacade] getProjectsPaginated - Using ProductionRepository', {
        metadata: { module: 'StorageFacade', operation: 'getProjectsPaginated', count: result.items.length, total: result.total }
      });
      
      return {
        projects: result.items,
        total: result.total,
        limit,
        offset
      };
    } catch (error) {
      this.facadeLogger.warn('[StorageFacade] getProjectsPaginated - Fallback to legacy', {
        metadata: { module: 'StorageFacade', operation: 'getProjectsPaginated', error: error instanceof Error ? error.message : 'Unknown' }
      });
      return await this.legacyStorage.getProjectsPaginated(search, status, limit, offset);
    }
  }

  /**
   * Récupère un projet par ID
   * Utilise ProductionRepository avec fallback sur legacy
   */
  async getProject(id: string) {
    try {
      const project = await this.productionRepository.findById(id);
      
      this.facadeLogger.info('[StorageFacade] getProject - Using ProductionRepository', {
        metadata: { module: 'StorageFacade', operation: 'getProject', id, found: !!project }
      });
      
      return project;
    } catch (error) {
      this.facadeLogger.warn('[StorageFacade] getProject - Fallback to legacy', {
        metadata: { module: 'StorageFacade', operation: 'getProject', id, error: error instanceof Error ? error.message : 'Unknown' }
      });
      return await this.legacyStorage.getProject(id);
    }
  }

  get getProjectsByOffer() { return this.legacyStorage.getProjectsByOffer.bind(this.legacyStorage); }

  /**
   * Crée un nouveau projet
   * Utilise ProductionRepository avec fallback sur legacy
   */
  async createProject(project: any) {
    try {
      const created = await this.productionRepository.create(project);
      
      this.facadeLogger.info('[StorageFacade] createProject - Using ProductionRepository', {
        metadata: { module: 'StorageFacade', operation: 'createProject', id: created.id }
      });
      
      return created;
    } catch (error) {
      this.facadeLogger.warn('[StorageFacade] createProject - Fallback to legacy', {
        metadata: { module: 'StorageFacade', operation: 'createProject', error: error instanceof Error ? error.message : 'Unknown' }
      });
      return await this.legacyStorage.createProject(project);
    }
  }

  /**
   * Met à jour un projet
   * Utilise ProductionRepository avec fallback sur legacy
   */
  async updateProject(id: string, project: any) {
    try {
      const updated = await this.productionRepository.update(id, project);
      
      this.facadeLogger.info('[StorageFacade] updateProject - Using ProductionRepository', {
        metadata: { module: 'StorageFacade', operation: 'updateProject', id }
      });
      
      return updated;
    } catch (error) {
      this.facadeLogger.warn('[StorageFacade] updateProject - Fallback to legacy', {
        metadata: { module: 'StorageFacade', operation: 'updateProject', id, error: error instanceof Error ? error.message : 'Unknown' }
      });
      return await this.legacyStorage.updateProject(id, project);
    }
  }
  get updateProjectMondayId() { return this.legacyStorage.updateProjectMondayId.bind(this.legacyStorage); }
  get updateAOMondayId() { return this.legacyStorage.updateAOMondayId.bind(this.legacyStorage); }
  get getProjectsToExport() { return this.legacyStorage.getProjectsToExport.bind(this.legacyStorage); }
  get getAOsToExport() { return this.legacyStorage.getAOsToExport.bind(this.legacyStorage); }

  // Project task operations
  get getProjectTasks() { return this.legacyStorage.getProjectTasks.bind(this.legacyStorage); }
  get getAllTasks() { return this.legacyStorage.getAllTasks.bind(this.legacyStorage); }
  get createProjectTask() { return this.legacyStorage.createProjectTask.bind(this.legacyStorage); }
  get updateProjectTask() { return this.legacyStorage.updateProjectTask.bind(this.legacyStorage); }

  // ========================================
  // SUPPLIER OPERATIONS - Déléguées vers SuppliersRepository
  // ========================================

  /**
   * Récupère tous les fournisseurs avec recherche et filtre de statut
   * Utilise SuppliersRepository avec fallback sur legacy
   */
  async getSuppliers(search?: string, status?: string) {
    try {
      const filters: any = {};
      if (search) filters.search = search;
      if (status) filters.status = status;
      
      const suppliers = await this.suppliersRepository.findAll(filters);
      
      this.facadeLogger.info('[StorageFacade] getSuppliers - Using SuppliersRepository', {
        metadata: { module: 'StorageFacade', operation: 'getSuppliers', count: suppliers.length }
      });
      
      return suppliers;
    } catch (error) {
      this.facadeLogger.warn('[StorageFacade] getSuppliers - Fallback to legacy', {
        metadata: { module: 'StorageFacade', operation: 'getSuppliers', error: error instanceof Error ? error.message : 'Unknown' }
      });
      return await this.legacyStorage.getSuppliers(search, status);
    }
  }

  /**
   * Récupère un fournisseur par ID
   * Utilise SuppliersRepository avec fallback sur legacy
   */
  async getSupplier(id: string) {
    try {
      const supplier = await this.suppliersRepository.findById(id);
      
      this.facadeLogger.info('[StorageFacade] getSupplier - Using SuppliersRepository', {
        metadata: { module: 'StorageFacade', operation: 'getSupplier', id, found: !!supplier }
      });
      
      return supplier;
    } catch (error) {
      this.facadeLogger.warn('[StorageFacade] getSupplier - Fallback to legacy', {
        metadata: { module: 'StorageFacade', operation: 'getSupplier', id, error: error instanceof Error ? error.message : 'Unknown' }
      });
      return await this.legacyStorage.getSupplier(id);
    }
  }

  /**
   * Crée un nouveau fournisseur
   * Utilise SuppliersRepository avec fallback sur legacy
   */
  async createSupplier(supplier: any) {
    try {
      const created = await this.suppliersRepository.create(supplier);
      
      this.facadeLogger.info('[StorageFacade] createSupplier - Using SuppliersRepository', {
        metadata: { module: 'StorageFacade', operation: 'createSupplier', id: created.id }
      });
      
      return created;
    } catch (error) {
      this.facadeLogger.warn('[StorageFacade] createSupplier - Fallback to legacy', {
        metadata: { module: 'StorageFacade', operation: 'createSupplier', error: error instanceof Error ? error.message : 'Unknown' }
      });
      return await this.legacyStorage.createSupplier(supplier);
    }
  }

  /**
   * Met à jour un fournisseur
   * Utilise SuppliersRepository avec fallback sur legacy
   */
  async updateSupplier(id: string, supplier: any) {
    try {
      const updated = await this.suppliersRepository.update(id, supplier);
      
      this.facadeLogger.info('[StorageFacade] updateSupplier - Using SuppliersRepository', {
        metadata: { module: 'StorageFacade', operation: 'updateSupplier', id }
      });
      
      return updated;
    } catch (error) {
      this.facadeLogger.warn('[StorageFacade] updateSupplier - Fallback to legacy', {
        metadata: { module: 'StorageFacade', operation: 'updateSupplier', id, error: error instanceof Error ? error.message : 'Unknown' }
      });
      return await this.legacyStorage.updateSupplier(id, supplier);
    }
  }

  /**
   * Supprime un fournisseur
   * Utilise SuppliersRepository avec fallback sur legacy
   */
  async deleteSupplier(id: string) {
    try {
      await this.suppliersRepository.delete(id);
      
      this.facadeLogger.info('[StorageFacade] deleteSupplier - Using SuppliersRepository', {
        metadata: { module: 'StorageFacade', operation: 'deleteSupplier', id }
      });
    } catch (error) {
      this.facadeLogger.warn('[StorageFacade] deleteSupplier - Fallback to legacy', {
        metadata: { module: 'StorageFacade', operation: 'deleteSupplier', id, error: error instanceof Error ? error.message : 'Unknown' }
      });
      await this.legacyStorage.deleteSupplier(id);
    }
  }

  // Supplier request operations
  get getSupplierRequests() { return this.legacyStorage.getSupplierRequests.bind(this.legacyStorage); }
  get createSupplierRequest() { return this.legacyStorage.createSupplierRequest.bind(this.legacyStorage); }
  get updateSupplierRequest() { return this.legacyStorage.updateSupplierRequest.bind(this.legacyStorage); }

  // Team resource operations
  get getTeamResources() { return this.legacyStorage.getTeamResources.bind(this.legacyStorage); }
  get createTeamResource() { return this.legacyStorage.createTeamResource.bind(this.legacyStorage); }
  get updateTeamResource() { return this.legacyStorage.updateTeamResource.bind(this.legacyStorage); }

  // BE Workload operations
  get getBeWorkload() { return this.legacyStorage.getBeWorkload.bind(this.legacyStorage); }
  get createOrUpdateBeWorkload() { return this.legacyStorage.createOrUpdateBeWorkload.bind(this.legacyStorage); }

  // Dashboard statistics
  get getDashboardStats() { return this.legacyStorage.getDashboardStats.bind(this.legacyStorage); }
  get getConsolidatedKpis() { return this.legacyStorage.getConsolidatedKpis.bind(this.legacyStorage); }

  // ========================================
  // CHIFFRAGE OPERATIONS - Déléguées vers ChiffrageRepository
  // ========================================

  /**
   * Récupère les éléments de chiffrage pour une offre
   * Utilise ChiffrageRepository avec fallback sur legacy
   */
  async getChiffrageElementsByOffer(offerId: string): Promise<ChiffrageElement[]> {
    try {
      const elements = await this.chiffrageRepository.getChiffrageElementsByOffer(offerId);
      this.facadeLogger.info('Chiffrage elements récupérés via ChiffrageRepository', {
        metadata: { offerId, count: elements.length, module: 'StorageFacade', operation: 'getChiffrageElementsByOffer' }
      });
      return elements;
    } catch (error) {
      this.facadeLogger.warn('ChiffrageRepository.getChiffrageElementsByOffer failed, falling back to legacy', {
        metadata: { error, offerId, module: 'StorageFacade', operation: 'getChiffrageElementsByOffer' }
      });
      return await this.legacyStorage.getChiffrageElementsByOffer(offerId);
    }
  }

  /**
   * Récupère les éléments de chiffrage pour un lot
   * Utilise ChiffrageRepository avec fallback sur legacy
   */
  async getChiffrageElementsByLot(lotId: string): Promise<ChiffrageElement[]> {
    try {
      const elements = await this.chiffrageRepository.getChiffrageElementsByLot(lotId);
      this.facadeLogger.info('Chiffrage elements récupérés via ChiffrageRepository', {
        metadata: { lotId, count: elements.length, module: 'StorageFacade', operation: 'getChiffrageElementsByLot' }
      });
      return elements;
    } catch (error) {
      this.facadeLogger.warn('ChiffrageRepository.getChiffrageElementsByLot failed, falling back to legacy', {
        metadata: { error, lotId, module: 'StorageFacade', operation: 'getChiffrageElementsByLot' }
      });
      return await this.legacyStorage.getChiffrageElementsByLot(lotId);
    }
  }

  /**
   * Crée un nouvel élément de chiffrage
   * Utilise ChiffrageRepository avec fallback sur legacy
   */
  async createChiffrageElement(element: InsertChiffrageElement): Promise<ChiffrageElement> {
    try {
      const created = await this.chiffrageRepository.createChiffrageElement(element);
      this.facadeLogger.info('Chiffrage element créé via ChiffrageRepository', {
        metadata: { id: created.id, offerId: created.offerId, module: 'StorageFacade', operation: 'createChiffrageElement' }
      });
      return created;
    } catch (error) {
      this.facadeLogger.warn('ChiffrageRepository.createChiffrageElement failed, falling back to legacy', {
        metadata: { error, module: 'StorageFacade', operation: 'createChiffrageElement' }
      });
      return await this.legacyStorage.createChiffrageElement(element);
    }
  }

  /**
   * Met à jour un élément de chiffrage
   * Utilise ChiffrageRepository avec fallback sur legacy
   */
  async updateChiffrageElement(id: string, element: Partial<InsertChiffrageElement>): Promise<ChiffrageElement> {
    try {
      const updated = await this.chiffrageRepository.updateChiffrageElement(id, element);
      this.facadeLogger.info('Chiffrage element mis à jour via ChiffrageRepository', {
        metadata: { id, module: 'StorageFacade', operation: 'updateChiffrageElement' }
      });
      return updated;
    } catch (error) {
      this.facadeLogger.warn('ChiffrageRepository.updateChiffrageElement failed, falling back to legacy', {
        metadata: { error, id, module: 'StorageFacade', operation: 'updateChiffrageElement' }
      });
      return await this.legacyStorage.updateChiffrageElement(id, element);
    }
  }

  /**
   * Supprime un élément de chiffrage
   * Utilise ChiffrageRepository avec fallback sur legacy
   */
  async deleteChiffrageElement(id: string): Promise<void> {
    try {
      await this.chiffrageRepository.deleteChiffrageElement(id);
      this.facadeLogger.info('Chiffrage element supprimé via ChiffrageRepository', {
        metadata: { id, module: 'StorageFacade', operation: 'deleteChiffrageElement' }
      });
    } catch (error) {
      this.facadeLogger.warn('ChiffrageRepository.deleteChiffrageElement failed, falling back to legacy', {
        metadata: { error, id, module: 'StorageFacade', operation: 'deleteChiffrageElement' }
      });
      await this.legacyStorage.deleteChiffrageElement(id);
    }
  }

  /**
   * Récupère le document DPGF pour une offre
   * Utilise ChiffrageRepository avec fallback sur legacy
   */
  async getDpgfDocumentByOffer(offerId: string): Promise<DpgfDocument | null> {
    try {
      const dpgf = await this.chiffrageRepository.getDpgfDocumentByOffer(offerId);
      this.facadeLogger.info('DPGF document récupéré via ChiffrageRepository', {
        metadata: { offerId, found: !!dpgf, module: 'StorageFacade', operation: 'getDpgfDocumentByOffer' }
      });
      return dpgf;
    } catch (error) {
      this.facadeLogger.warn('ChiffrageRepository.getDpgfDocumentByOffer failed, falling back to legacy', {
        metadata: { error, offerId, module: 'StorageFacade', operation: 'getDpgfDocumentByOffer' }
      });
      return await this.legacyStorage.getDpgfDocumentByOffer(offerId);
    }
  }

  /**
   * Crée un nouveau document DPGF
   * Utilise ChiffrageRepository avec fallback sur legacy
   */
  async createDpgfDocument(dpgf: InsertDpgfDocument): Promise<DpgfDocument> {
    try {
      const created = await this.chiffrageRepository.createDpgfDocument(dpgf);
      this.facadeLogger.info('DPGF document créé via ChiffrageRepository', {
        metadata: { id: created.id, offerId: created.offerId, module: 'StorageFacade', operation: 'createDpgfDocument' }
      });
      return created;
    } catch (error) {
      this.facadeLogger.warn('ChiffrageRepository.createDpgfDocument failed, falling back to legacy', {
        metadata: { error, module: 'StorageFacade', operation: 'createDpgfDocument' }
      });
      return await this.legacyStorage.createDpgfDocument(dpgf);
    }
  }

  /**
   * Met à jour un document DPGF
   * Utilise ChiffrageRepository avec fallback sur legacy
   */
  async updateDpgfDocument(id: string, dpgf: Partial<InsertDpgfDocument>): Promise<DpgfDocument> {
    try {
      const updated = await this.chiffrageRepository.updateDpgfDocument(id, dpgf);
      this.facadeLogger.info('DPGF document mis à jour via ChiffrageRepository', {
        metadata: { id, module: 'StorageFacade', operation: 'updateDpgfDocument' }
      });
      return updated;
    } catch (error) {
      this.facadeLogger.warn('ChiffrageRepository.updateDpgfDocument failed, falling back to legacy', {
        metadata: { error, id, module: 'StorageFacade', operation: 'updateDpgfDocument' }
      });
      return await this.legacyStorage.updateDpgfDocument(id, dpgf);
    }
  }

  /**
   * Supprime un document DPGF
   * Utilise ChiffrageRepository avec fallback sur legacy
   */
  async deleteDpgfDocument(id: string): Promise<void> {
    try {
      await this.chiffrageRepository.deleteDpgfDocument(id);
      this.facadeLogger.info('DPGF document supprimé via ChiffrageRepository', {
        metadata: { id, module: 'StorageFacade', operation: 'deleteDpgfDocument' }
      });
    } catch (error) {
      this.facadeLogger.warn('ChiffrageRepository.deleteDpgfDocument failed, falling back to legacy', {
        metadata: { error, id, module: 'StorageFacade', operation: 'deleteDpgfDocument' }
      });
      await this.legacyStorage.deleteDpgfDocument(id);
    }
  }

  // AO Lots operations
  get getAoLots() { return this.legacyStorage.getAoLots.bind(this.legacyStorage); }
  get createAoLot() { return this.legacyStorage.createAoLot.bind(this.legacyStorage); }
  get updateAoLot() { return this.legacyStorage.updateAoLot.bind(this.legacyStorage); }
  get deleteAoLot() { return this.legacyStorage.deleteAoLot.bind(this.legacyStorage); }

  // Maîtres d'ouvrage operations
  get getMaitresOuvrage() { return this.legacyStorage.getMaitresOuvrage.bind(this.legacyStorage); }
  get getMaitreOuvrage() { return this.legacyStorage.getMaitreOuvrage.bind(this.legacyStorage); }
  get createMaitreOuvrage() { return this.legacyStorage.createMaitreOuvrage.bind(this.legacyStorage); }
  get updateMaitreOuvrage() { return this.legacyStorage.updateMaitreOuvrage.bind(this.legacyStorage); }
  get deleteMaitreOuvrage() { return this.legacyStorage.deleteMaitreOuvrage.bind(this.legacyStorage); }

  // Maîtres d'œuvre operations
  get getMaitresOeuvre() { return this.legacyStorage.getMaitresOeuvre.bind(this.legacyStorage); }
  get getMaitreOeuvre() { return this.legacyStorage.getMaitreOeuvre.bind(this.legacyStorage); }
  get createMaitreOeuvre() { return this.legacyStorage.createMaitreOeuvre.bind(this.legacyStorage); }
  get updateMaitreOeuvre() { return this.legacyStorage.updateMaitreOeuvre.bind(this.legacyStorage); }
  get deleteMaitreOeuvre() { return this.legacyStorage.deleteMaitreOeuvre.bind(this.legacyStorage); }

  // Contact deduplication methods
  get findOrCreateMaitreOuvrage() { return this.legacyStorage.findOrCreateMaitreOuvrage.bind(this.legacyStorage); }
  get findOrCreateMaitreOeuvre() { return this.legacyStorage.findOrCreateMaitreOeuvre.bind(this.legacyStorage); }
  get findOrCreateContact() { return this.legacyStorage.findOrCreateContact.bind(this.legacyStorage); }
  get linkAoContact() { return this.legacyStorage.linkAoContact.bind(this.legacyStorage); }

  // Contacts Maître d'Œuvre operations
  get getContactsMaitreOeuvre() { return this.legacyStorage.getContactsMaitreOeuvre.bind(this.legacyStorage); }
  get createContactMaitreOeuvre() { return this.legacyStorage.createContactMaitreOeuvre.bind(this.legacyStorage); }
  get updateContactMaitreOeuvre() { return this.legacyStorage.updateContactMaitreOeuvre.bind(this.legacyStorage); }
  get deleteContactMaitreOeuvre() { return this.legacyStorage.deleteContactMaitreOeuvre.bind(this.legacyStorage); }

  // AO-Contacts liaison operations
  get getAoContacts() { return this.legacyStorage.getAoContacts.bind(this.legacyStorage); }
  get createAoContact() { return this.legacyStorage.createAoContact.bind(this.legacyStorage); }
  get deleteAoContact() { return this.legacyStorage.deleteAoContact.bind(this.legacyStorage); }

  // Project-Contacts liaison operations
  get getProjectContacts() { return this.legacyStorage.getProjectContacts.bind(this.legacyStorage); }
  get createProjectContact() { return this.legacyStorage.createProjectContact.bind(this.legacyStorage); }
  get deleteProjectContact() { return this.legacyStorage.deleteProjectContact.bind(this.legacyStorage); }

  /**
   * Récupère les jalons de validation pour une offre
   * Utilise ChiffrageRepository avec fallback sur legacy
   */
  async getValidationMilestones(offerId: string): Promise<ValidationMilestone[]> {
    try {
      const milestones = await this.chiffrageRepository.getValidationMilestones(offerId);
      this.facadeLogger.info('Validation milestones récupérés via ChiffrageRepository', {
        metadata: { offerId, count: milestones.length, module: 'StorageFacade', operation: 'getValidationMilestones' }
      });
      return milestones;
    } catch (error) {
      this.facadeLogger.warn('ChiffrageRepository.getValidationMilestones failed, falling back to legacy', {
        metadata: { error, offerId, module: 'StorageFacade', operation: 'getValidationMilestones' }
      });
      return await this.legacyStorage.getValidationMilestones(offerId);
    }
  }

  /**
   * Crée un nouveau jalon de validation
   * Utilise ChiffrageRepository avec fallback sur legacy
   */
  async createValidationMilestone(milestone: InsertValidationMilestone): Promise<ValidationMilestone> {
    try {
      const created = await this.chiffrageRepository.createValidationMilestone(milestone);
      this.facadeLogger.info('Validation milestone créé via ChiffrageRepository', {
        metadata: { id: created.id, offerId: created.offerId, module: 'StorageFacade', operation: 'createValidationMilestone' }
      });
      return created;
    } catch (error) {
      this.facadeLogger.warn('ChiffrageRepository.createValidationMilestone failed, falling back to legacy', {
        metadata: { error, module: 'StorageFacade', operation: 'createValidationMilestone' }
      });
      return await this.legacyStorage.createValidationMilestone(milestone);
    }
  }

  /**
   * Met à jour un jalon de validation
   * Utilise ChiffrageRepository avec fallback sur legacy
   */
  async updateValidationMilestone(id: string, milestone: Partial<InsertValidationMilestone>): Promise<ValidationMilestone> {
    try {
      const updated = await this.chiffrageRepository.updateValidationMilestone(id, milestone);
      this.facadeLogger.info('Validation milestone mis à jour via ChiffrageRepository', {
        metadata: { id, module: 'StorageFacade', operation: 'updateValidationMilestone' }
      });
      return updated;
    } catch (error) {
      this.facadeLogger.warn('ChiffrageRepository.updateValidationMilestone failed, falling back to legacy', {
        metadata: { error, id, module: 'StorageFacade', operation: 'updateValidationMilestone' }
      });
      return await this.legacyStorage.updateValidationMilestone(id, milestone);
    }
  }

  /**
   * Supprime un jalon de validation
   * Utilise ChiffrageRepository avec fallback sur legacy
   */
  async deleteValidationMilestone(id: string): Promise<void> {
    try {
      await this.chiffrageRepository.deleteValidationMilestone(id);
      this.facadeLogger.info('Validation milestone supprimé via ChiffrageRepository', {
        metadata: { id, module: 'StorageFacade', operation: 'deleteValidationMilestone' }
      });
    } catch (error) {
      this.facadeLogger.warn('ChiffrageRepository.deleteValidationMilestone failed, falling back to legacy', {
        metadata: { error, id, module: 'StorageFacade', operation: 'deleteValidationMilestone' }
      });
      await this.legacyStorage.deleteValidationMilestone(id);
    }
  }

  // Visa Architecte operations
  get getVisaArchitecte() { return this.legacyStorage.getVisaArchitecte.bind(this.legacyStorage); }
  get createVisaArchitecte() { return this.legacyStorage.createVisaArchitecte.bind(this.legacyStorage); }
  get updateVisaArchitecte() { return this.legacyStorage.updateVisaArchitecte.bind(this.legacyStorage); }
  get deleteVisaArchitecte() { return this.legacyStorage.deleteVisaArchitecte.bind(this.legacyStorage); }

  // Technical Alerts operations (toutes les méthodes IStorage)
  get enqueueTechnicalAlert() { return this.legacyStorage.enqueueTechnicalAlert.bind(this.legacyStorage); }
  get listTechnicalAlerts() { return this.legacyStorage.listTechnicalAlerts.bind(this.legacyStorage); }
  get getTechnicalAlert() { return this.legacyStorage.getTechnicalAlert.bind(this.legacyStorage); }
  get acknowledgeTechnicalAlert() { return this.legacyStorage.acknowledgeTechnicalAlert.bind(this.legacyStorage); }
  get validateTechnicalAlert() { return this.legacyStorage.validateTechnicalAlert.bind(this.legacyStorage); }
  get bypassTechnicalAlert() { return this.legacyStorage.bypassTechnicalAlert.bind(this.legacyStorage); }
  get getActiveBypassForAo() { return this.legacyStorage.getActiveBypassForAo.bind(this.legacyStorage); }
  get listTechnicalAlertHistory() { return this.legacyStorage.listTechnicalAlertHistory.bind(this.legacyStorage); }
  get addTechnicalAlertHistory() { return this.legacyStorage.addTechnicalAlertHistory.bind(this.legacyStorage); }
  get listAoSuppressionHistory() { return this.legacyStorage.listAoSuppressionHistory.bind(this.legacyStorage); }

  // Technical Scoring operations
  get getScoringConfig() { return this.legacyStorage.getScoringConfig.bind(this.legacyStorage); }
  get updateScoringConfig() { return this.legacyStorage.updateScoringConfig.bind(this.legacyStorage); }

  // Material Color Alert Rules operations
  get getMaterialColorRules() { return this.legacyStorage.getMaterialColorRules.bind(this.legacyStorage); }
  get setMaterialColorRules() { return this.legacyStorage.setMaterialColorRules.bind(this.legacyStorage); }

  // Project Timeline operations
  get getProjectTimelines() { return this.legacyStorage.getProjectTimelines.bind(this.legacyStorage); }
  get getAllProjectTimelines() { return this.legacyStorage.getAllProjectTimelines.bind(this.legacyStorage); }
  get createProjectTimeline() { return this.legacyStorage.createProjectTimeline.bind(this.legacyStorage); }
  get updateProjectTimeline() { return this.legacyStorage.updateProjectTimeline.bind(this.legacyStorage); }
  get deleteProjectTimeline() { return this.legacyStorage.deleteProjectTimeline.bind(this.legacyStorage); }

  // ========================================
  // DATE INTELLIGENCE OPERATIONS - Déléguées vers DateIntelligenceRepository
  // ========================================

  /**
   * Récupère les règles actives avec filtres optionnels
   * Utilise DateIntelligenceRepository avec fallback sur legacy
   */
  async getActiveRules(filters?: { phase?: string, projectType?: string }): Promise<DateIntelligenceRule[]> {
    try {
      const rules = await this.dateIntelligenceRepository.getActiveRules(filters);
      this.facadeLogger.info('Rules actives récupérées via DateIntelligenceRepository', {
        metadata: { count: rules.length, filters, module: 'StorageFacade', operation: 'getActiveRules' }
      });
      return rules;
    } catch (error) {
      this.facadeLogger.warn('DateIntelligenceRepository.getActiveRules failed, falling back to legacy', {
        metadata: { error, filters, module: 'StorageFacade', operation: 'getActiveRules' }
      });
      return await this.legacyStorage.getActiveRules(filters);
    }
  }

  /**
   * Récupère toutes les règles d'intelligence de dates
   * Utilise DateIntelligenceRepository avec fallback sur legacy
   */
  async getAllRules(): Promise<DateIntelligenceRule[]> {
    try {
      const rules = await this.dateIntelligenceRepository.getAllRules();
      this.facadeLogger.info('Toutes les règles récupérées via DateIntelligenceRepository', {
        metadata: { count: rules.length, module: 'StorageFacade', operation: 'getAllRules' }
      });
      return rules;
    } catch (error) {
      this.facadeLogger.warn('DateIntelligenceRepository.getAllRules failed, falling back to legacy', {
        metadata: { error, module: 'StorageFacade', operation: 'getAllRules' }
      });
      return await this.legacyStorage.getAllRules();
    }
  }

  /**
   * Récupère une règle par son ID
   * Utilise DateIntelligenceRepository avec fallback sur legacy
   */
  async getRule(id: string): Promise<DateIntelligenceRule | undefined> {
    try {
      const rule = await this.dateIntelligenceRepository.getRule(id);
      if (rule) {
        this.facadeLogger.info('Règle récupérée via DateIntelligenceRepository', {
          metadata: { id, module: 'StorageFacade', operation: 'getRule' }
        });
      }
      return rule;
    } catch (error) {
      this.facadeLogger.warn('DateIntelligenceRepository.getRule failed, falling back to legacy', {
        metadata: { error, id, module: 'StorageFacade', operation: 'getRule' }
      });
      return await this.legacyStorage.getRule(id);
    }
  }

  /**
   * Crée une nouvelle règle d'intelligence de dates
   * Utilise DateIntelligenceRepository avec fallback sur legacy
   */
  async createRule(data: InsertDateIntelligenceRule): Promise<DateIntelligenceRule> {
    try {
      const created = await this.dateIntelligenceRepository.createRule(data);
      this.facadeLogger.info('Règle créée via DateIntelligenceRepository', {
        metadata: { id: created.id, name: created.name, module: 'StorageFacade', operation: 'createRule' }
      });
      return created;
    } catch (error) {
      this.facadeLogger.warn('DateIntelligenceRepository.createRule failed, falling back to legacy', {
        metadata: { error, module: 'StorageFacade', operation: 'createRule' }
      });
      return await this.legacyStorage.createRule(data);
    }
  }

  /**
   * Met à jour une règle d'intelligence de dates
   * Utilise DateIntelligenceRepository avec fallback sur legacy
   */
  async updateRule(id: string, data: Partial<InsertDateIntelligenceRule>): Promise<DateIntelligenceRule> {
    try {
      const updated = await this.dateIntelligenceRepository.updateRule(id, data);
      this.facadeLogger.info('Règle mise à jour via DateIntelligenceRepository', {
        metadata: { id, module: 'StorageFacade', operation: 'updateRule' }
      });
      return updated;
    } catch (error) {
      this.facadeLogger.warn('DateIntelligenceRepository.updateRule failed, falling back to legacy', {
        metadata: { error, id, module: 'StorageFacade', operation: 'updateRule' }
      });
      return await this.legacyStorage.updateRule(id, data);
    }
  }

  /**
   * Supprime une règle d'intelligence de dates
   * Utilise DateIntelligenceRepository avec fallback sur legacy
   */
  async deleteRule(id: string): Promise<void> {
    try {
      await this.dateIntelligenceRepository.deleteRule(id);
      this.facadeLogger.info('Règle supprimée via DateIntelligenceRepository', {
        metadata: { id, module: 'StorageFacade', operation: 'deleteRule' }
      });
    } catch (error) {
      this.facadeLogger.warn('DateIntelligenceRepository.deleteRule failed, falling back to legacy', {
        metadata: { error, id, module: 'StorageFacade', operation: 'deleteRule' }
      });
      await this.legacyStorage.deleteRule(id);
    }
  }

  /**
   * Récupère les alertes de dates avec filtres optionnels
   * Utilise DateIntelligenceRepository avec fallback sur legacy
   */
  async getDateAlerts(filters?: { entityType?: string, entityId?: string, status?: string }): Promise<DateAlert[]> {
    try {
      const alerts = await this.dateIntelligenceRepository.getDateAlerts(filters);
      this.facadeLogger.info('Alertes de dates récupérées via DateIntelligenceRepository', {
        metadata: { count: alerts.length, filters, module: 'StorageFacade', operation: 'getDateAlerts' }
      });
      return alerts;
    } catch (error) {
      this.facadeLogger.warn('DateIntelligenceRepository.getDateAlerts failed, falling back to legacy', {
        metadata: { error, filters, module: 'StorageFacade', operation: 'getDateAlerts' }
      });
      return await this.legacyStorage.getDateAlerts(filters);
    }
  }

  /**
   * Récupère une alerte de date par son ID
   * Utilise DateIntelligenceRepository avec fallback sur legacy
   */
  async getDateAlert(id: string): Promise<DateAlert | undefined> {
    try {
      const alert = await this.dateIntelligenceRepository.getDateAlert(id);
      if (alert) {
        this.facadeLogger.info('Alerte de date récupérée via DateIntelligenceRepository', {
          metadata: { id, module: 'StorageFacade', operation: 'getDateAlert' }
        });
      }
      return alert;
    } catch (error) {
      this.facadeLogger.warn('DateIntelligenceRepository.getDateAlert failed, falling back to legacy', {
        metadata: { error, id, module: 'StorageFacade', operation: 'getDateAlert' }
      });
      return await this.legacyStorage.getDateAlert(id);
    }
  }

  /**
   * Crée une nouvelle alerte de date
   * Utilise DateIntelligenceRepository avec fallback sur legacy
   */
  async createDateAlert(data: InsertDateAlert): Promise<DateAlert> {
    try {
      const created = await this.dateIntelligenceRepository.createDateAlert(data);
      this.facadeLogger.info('Alerte de date créée via DateIntelligenceRepository', {
        metadata: { id: created.id, title: created.title, module: 'StorageFacade', operation: 'createDateAlert' }
      });
      return created;
    } catch (error) {
      this.facadeLogger.warn('DateIntelligenceRepository.createDateAlert failed, falling back to legacy', {
        metadata: { error, module: 'StorageFacade', operation: 'createDateAlert' }
      });
      return await this.legacyStorage.createDateAlert(data);
    }
  }

  /**
   * Met à jour une alerte de date
   * Utilise DateIntelligenceRepository avec fallback sur legacy
   */
  async updateDateAlert(id: string, data: Partial<InsertDateAlert>): Promise<DateAlert> {
    try {
      const updated = await this.dateIntelligenceRepository.updateDateAlert(id, data);
      this.facadeLogger.info('Alerte de date mise à jour via DateIntelligenceRepository', {
        metadata: { id, module: 'StorageFacade', operation: 'updateDateAlert' }
      });
      return updated;
    } catch (error) {
      this.facadeLogger.warn('DateIntelligenceRepository.updateDateAlert failed, falling back to legacy', {
        metadata: { error, id, module: 'StorageFacade', operation: 'updateDateAlert' }
      });
      return await this.legacyStorage.updateDateAlert(id, data);
    }
  }

  /**
   * Supprime une alerte de date
   * Utilise DateIntelligenceRepository avec fallback sur legacy
   */
  async deleteDateAlert(id: string): Promise<void> {
    try {
      await this.dateIntelligenceRepository.deleteDateAlert(id);
      this.facadeLogger.info('Alerte de date supprimée via DateIntelligenceRepository', {
        metadata: { id, module: 'StorageFacade', operation: 'deleteDateAlert' }
      });
    } catch (error) {
      this.facadeLogger.warn('DateIntelligenceRepository.deleteDateAlert failed, falling back to legacy', {
        metadata: { error, id, module: 'StorageFacade', operation: 'deleteDateAlert' }
      });
      await this.legacyStorage.deleteDateAlert(id);
    }
  }

  /**
   * Acquitte une alerte de date
   * Utilise DateIntelligenceRepository avec fallback sur legacy
   */
  async acknowledgeAlert(id: string, userId: string): Promise<boolean> {
    try {
      const result = await this.dateIntelligenceRepository.acknowledgeAlert(id, userId);
      this.facadeLogger.info('Alerte acquittée via DateIntelligenceRepository', {
        metadata: { id, userId, module: 'StorageFacade', operation: 'acknowledgeAlert' }
      });
      return result;
    } catch (error) {
      this.facadeLogger.warn('DateIntelligenceRepository.acknowledgeAlert failed, falling back to legacy', {
        metadata: { error, id, userId, module: 'StorageFacade', operation: 'acknowledgeAlert' }
      });
      return await this.legacyStorage.acknowledgeAlert(id, userId);
    }
  }

  /**
   * Résout une alerte de date
   * Utilise DateIntelligenceRepository avec fallback sur legacy
   */
  async resolveAlert(id: string, userId: string, actionTaken?: string): Promise<boolean> {
    try {
      const result = await this.dateIntelligenceRepository.resolveAlert(id, userId, actionTaken);
      this.facadeLogger.info('Alerte résolue via DateIntelligenceRepository', {
        metadata: { id, userId, actionTaken, module: 'StorageFacade', operation: 'resolveAlert' }
      });
      return result;
    } catch (error) {
      this.facadeLogger.warn('DateIntelligenceRepository.resolveAlert failed, falling back to legacy', {
        metadata: { error, id, userId, actionTaken, module: 'StorageFacade', operation: 'resolveAlert' }
      });
      return await this.legacyStorage.resolveAlert(id, userId, actionTaken);
    }
  }

  // Analytics operations
  get createKPISnapshot() { return this.legacyStorage.createKPISnapshot.bind(this.legacyStorage); }
  get getKPISnapshots() { return this.legacyStorage.getKPISnapshots.bind(this.legacyStorage); }
  get getLatestKPISnapshot() { return this.legacyStorage.getLatestKPISnapshot.bind(this.legacyStorage); }
  get createBusinessMetric() { return this.legacyStorage.createBusinessMetric.bind(this.legacyStorage); }
  get getBusinessMetrics() { return this.legacyStorage.getBusinessMetrics.bind(this.legacyStorage); }
  get getMetricTimeSeries() { return this.legacyStorage.getMetricTimeSeries.bind(this.legacyStorage); }
  get createPerformanceBenchmark() { return this.legacyStorage.createPerformanceBenchmark.bind(this.legacyStorage); }
  get getBenchmarks() { return this.legacyStorage.getBenchmarks.bind(this.legacyStorage); }
  get getTopPerformers() { return this.legacyStorage.getTopPerformers.bind(this.legacyStorage); }
  get getAnalyticsSnapshots() { return this.legacyStorage.getAnalyticsSnapshots.bind(this.legacyStorage); }
  get createAnalyticsSnapshot() { return this.legacyStorage.createAnalyticsSnapshot.bind(this.legacyStorage); }
  get getMonthlyRevenueHistory() { return this.legacyStorage.getMonthlyRevenueHistory.bind(this.legacyStorage); }
  get getProjectDelayHistory() { return this.legacyStorage.getProjectDelayHistory.bind(this.legacyStorage); }
  get getTeamLoadHistory() { return this.legacyStorage.getTeamLoadHistory.bind(this.legacyStorage); }
  get saveForecastSnapshot() { return this.legacyStorage.saveForecastSnapshot.bind(this.legacyStorage); }
  get listForecastSnapshots() { return this.legacyStorage.listForecastSnapshots.bind(this.legacyStorage); }
  get getSectorBenchmarks() { return this.legacyStorage.getSectorBenchmarks.bind(this.legacyStorage); }

  // Business Alerts operations (méthodes correctes de IStorage)
  get createBusinessAlert() { return this.legacyStorage.createBusinessAlert.bind(this.legacyStorage); }
  get getBusinessAlertById() { return this.legacyStorage.getBusinessAlertById.bind(this.legacyStorage); }
  get listBusinessAlerts() { return this.legacyStorage.listBusinessAlerts.bind(this.legacyStorage); }
  get updateBusinessAlertStatus() { return this.legacyStorage.updateBusinessAlertStatus.bind(this.legacyStorage); }
  // dismissBusinessAlert n'existe pas dans IStorage - commenté pour éviter erreur LSP
  // get dismissBusinessAlert() { return this.legacyStorage.dismissBusinessAlert.bind(this.legacyStorage); }

  // Alert Thresholds operations (méthodes correctes de IStorage)
  get getActiveThresholds() { return this.legacyStorage.getActiveThresholds.bind(this.legacyStorage); }
  get getThresholdById() { return this.legacyStorage.getThresholdById.bind(this.legacyStorage); }
  get createThreshold() { return this.legacyStorage.createThreshold.bind(this.legacyStorage); }
  get updateThreshold() { return this.legacyStorage.updateThreshold.bind(this.legacyStorage); }
  get deactivateThreshold() { return this.legacyStorage.deactivateThreshold.bind(this.legacyStorage); }
  get listThresholds() { return this.legacyStorage.listThresholds.bind(this.legacyStorage); }

  // SAV operations  
  get getProjectReserves() { return this.legacyStorage.getProjectReserves.bind(this.legacyStorage); }
  get createProjectReserve() { return this.legacyStorage.createProjectReserve.bind(this.legacyStorage); }
  get updateProjectReserve() { return this.legacyStorage.updateProjectReserve.bind(this.legacyStorage); }
  get getSavInterventions() { return this.legacyStorage.getSavInterventions.bind(this.legacyStorage); }
  get createSavIntervention() { return this.legacyStorage.createSavIntervention.bind(this.legacyStorage); }
  get updateSavIntervention() { return this.legacyStorage.updateSavIntervention.bind(this.legacyStorage); }
  get getSavWarrantyClaims() { return this.legacyStorage.getSavWarrantyClaims.bind(this.legacyStorage); }
  get createSavWarrantyClaim() { return this.legacyStorage.createSavWarrantyClaim.bind(this.legacyStorage); }
  get updateSavWarrantyClaim() { return this.legacyStorage.updateSavWarrantyClaim.bind(this.legacyStorage); }

  // Metrics Business operations
  get getMetricsBusiness() { return this.legacyStorage.getMetricsBusiness.bind(this.legacyStorage); }
  get getMetricsBusinessById() { return this.legacyStorage.getMetricsBusinessById.bind(this.legacyStorage); }
  get createMetricsBusiness() { return this.legacyStorage.createMetricsBusiness.bind(this.legacyStorage); }
  get updateMetricsBusiness() { return this.legacyStorage.updateMetricsBusiness.bind(this.legacyStorage); }
  get deleteMetricsBusiness() { return this.legacyStorage.deleteMetricsBusiness.bind(this.legacyStorage); }

  // Temps Pose operations
  get getTempsPose() { return this.legacyStorage.getTempsPose.bind(this.legacyStorage); }
  get getTempsPoseById() { return this.legacyStorage.getTempsPoseById.bind(this.legacyStorage); }
  get createTempsPose() { return this.legacyStorage.createTempsPose.bind(this.legacyStorage); }
  get updateTempsPose() { return this.legacyStorage.updateTempsPose.bind(this.legacyStorage); }
  get deleteTempsPose() { return this.legacyStorage.deleteTempsPose.bind(this.legacyStorage); }

  // Supplier specializations
  get getSupplierSpecializations() { return this.legacyStorage.getSupplierSpecializations.bind(this.legacyStorage); }
  get createSupplierSpecialization() { return this.legacyStorage.createSupplierSpecialization.bind(this.legacyStorage); }
  get updateSupplierSpecialization() { return this.legacyStorage.updateSupplierSpecialization.bind(this.legacyStorage); }
  get deleteSupplierSpecialization() { return this.legacyStorage.deleteSupplierSpecialization.bind(this.legacyStorage); }

  // Supplier quote sessions
  get getSupplierQuoteSessions() { return this.legacyStorage.getSupplierQuoteSessions.bind(this.legacyStorage); }
  get getSupplierQuoteSession() { return this.legacyStorage.getSupplierQuoteSession.bind(this.legacyStorage); }
  get createSupplierQuoteSession() { return this.legacyStorage.createSupplierQuoteSession.bind(this.legacyStorage); }
  get updateSupplierQuoteSession() { return this.legacyStorage.updateSupplierQuoteSession.bind(this.legacyStorage); }

  // AO Lot Suppliers
  get getAoLotSuppliers() { return this.legacyStorage.getAoLotSuppliers.bind(this.legacyStorage); }
  get createAoLotSupplier() { return this.legacyStorage.createAoLotSupplier.bind(this.legacyStorage); }
  get updateAoLotSupplier() { return this.legacyStorage.updateAoLotSupplier.bind(this.legacyStorage); }
  get deleteAoLotSupplier() { return this.legacyStorage.deleteAoLotSupplier.bind(this.legacyStorage); }

  // Supplier Documents
  get getSupplierDocuments() { return this.legacyStorage.getSupplierDocuments.bind(this.legacyStorage); }
  get createSupplierDocument() { return this.legacyStorage.createSupplierDocument.bind(this.legacyStorage); }
  get updateSupplierDocument() { return this.legacyStorage.updateSupplierDocument.bind(this.legacyStorage); }

  // Supplier Quote Analysis
  get getSupplierQuoteAnalyses() { return this.legacyStorage.getSupplierQuoteAnalyses.bind(this.legacyStorage); }
  get createSupplierQuoteAnalysis() { return this.legacyStorage.createSupplierQuoteAnalysis.bind(this.legacyStorage); }
  get updateSupplierQuoteAnalysis() { return this.legacyStorage.updateSupplierQuoteAnalysis.bind(this.legacyStorage); }

  // Equipment Batteries
  get getEquipmentBatteries() { return this.legacyStorage.getEquipmentBatteries.bind(this.legacyStorage); }
  get getEquipmentBattery() { return this.legacyStorage.getEquipmentBattery.bind(this.legacyStorage); }
  get createEquipmentBattery() { return this.legacyStorage.createEquipmentBattery.bind(this.legacyStorage); }
  get updateEquipmentBattery() { return this.legacyStorage.updateEquipmentBattery.bind(this.legacyStorage); }
  get deleteEquipmentBattery() { return this.legacyStorage.deleteEquipmentBattery.bind(this.legacyStorage); }

  // Margin Targets
  get getMarginTargets() { return this.legacyStorage.getMarginTargets.bind(this.legacyStorage); }
  get getMarginTarget() { return this.legacyStorage.getMarginTarget.bind(this.legacyStorage); }
  get createMarginTarget() { return this.legacyStorage.createMarginTarget.bind(this.legacyStorage); }
  get updateMarginTarget() { return this.legacyStorage.updateMarginTarget.bind(this.legacyStorage); }
  get deleteMarginTarget() { return this.legacyStorage.deleteMarginTarget.bind(this.legacyStorage); }

  // Project Sub-Elements
  get getProjectSubElements() { return this.legacyStorage.getProjectSubElements.bind(this.legacyStorage); }
  get getProjectSubElement() { return this.legacyStorage.getProjectSubElement.bind(this.legacyStorage); }
  get createProjectSubElement() { return this.legacyStorage.createProjectSubElement.bind(this.legacyStorage); }
  get updateProjectSubElement() { return this.legacyStorage.updateProjectSubElement.bind(this.legacyStorage); }
  get deleteProjectSubElement() { return this.legacyStorage.deleteProjectSubElement.bind(this.legacyStorage); }

  // Classification Tags
  get getClassificationTags() { return this.legacyStorage.getClassificationTags.bind(this.legacyStorage); }
  get getClassificationTag() { return this.legacyStorage.getClassificationTag.bind(this.legacyStorage); }
  get createClassificationTag() { return this.legacyStorage.createClassificationTag.bind(this.legacyStorage); }
  get updateClassificationTag() { return this.legacyStorage.updateClassificationTag.bind(this.legacyStorage); }
  get deleteClassificationTag() { return this.legacyStorage.deleteClassificationTag.bind(this.legacyStorage); }

  // Entity Tags
  get getEntityTags() { return this.legacyStorage.getEntityTags.bind(this.legacyStorage); }
  get createEntityTag() { return this.legacyStorage.createEntityTag.bind(this.legacyStorage); }
  get deleteEntityTag() { return this.legacyStorage.deleteEntityTag.bind(this.legacyStorage); }

  // Employee Labels
  get getEmployeeLabels() { return this.legacyStorage.getEmployeeLabels.bind(this.legacyStorage); }
  get getEmployeeLabel() { return this.legacyStorage.getEmployeeLabel.bind(this.legacyStorage); }
  get createEmployeeLabel() { return this.legacyStorage.createEmployeeLabel.bind(this.legacyStorage); }
  get updateEmployeeLabel() { return this.legacyStorage.updateEmployeeLabel.bind(this.legacyStorage); }
  get deleteEmployeeLabel() { return this.legacyStorage.deleteEmployeeLabel.bind(this.legacyStorage); }

  // Employee Label Assignments
  get getEmployeeLabelAssignments() { return this.legacyStorage.getEmployeeLabelAssignments.bind(this.legacyStorage); }
  get createEmployeeLabelAssignment() { return this.legacyStorage.createEmployeeLabelAssignment.bind(this.legacyStorage); }
  get deleteEmployeeLabelAssignment() { return this.legacyStorage.deleteEmployeeLabelAssignment.bind(this.legacyStorage); }

  // Bug Reports (si implémenté dans IStorage)
  get createBugReport() { return this.legacyStorage.createBugReport.bind(this.legacyStorage); }

  // Batigest operations (si implémenté dans IStorage)
  get getPurchaseOrders() { return this.legacyStorage.getPurchaseOrders.bind(this.legacyStorage); }
  get getPurchaseOrder() { return this.legacyStorage.getPurchaseOrder.bind(this.legacyStorage); }
  get createPurchaseOrder() { return this.legacyStorage.createPurchaseOrder.bind(this.legacyStorage); }
  get updatePurchaseOrder() { return this.legacyStorage.updatePurchaseOrder.bind(this.legacyStorage); }
  get getClientQuotes() { return this.legacyStorage.getClientQuotes.bind(this.legacyStorage); }
  get getClientQuote() { return this.legacyStorage.getClientQuote.bind(this.legacyStorage); }
  get createClientQuote() { return this.legacyStorage.createClientQuote.bind(this.legacyStorage); }
  get updateClientQuote() { return this.legacyStorage.updateClientQuote.bind(this.legacyStorage); }
  // listBatigestExports n'existe pas dans IStorage - commenté pour éviter erreur LSP
  // get listBatigestExports() { return this.legacyStorage.listBatigestExports.bind(this.legacyStorage); }
  get createBatigestExport() { return this.legacyStorage.createBatigestExport.bind(this.legacyStorage); }
  get updateBatigestExport() { return this.legacyStorage.updateBatigestExport.bind(this.legacyStorage); }
}

/**
 * Instance singleton de la facade de storage
 * À utiliser dans toutes les routes à la place de l'ancien `storage`
 * 
 * @example
 * ```typescript
 * import { storageFacade } from './storage/facade/StorageFacade';
 * 
 * // Utilisation dans les routes
 * router.get('/api/offers/:id', async (req, res) => {
 *   const offer = await storageFacade.getOffer(req.params.id);
 *   res.json(offer);
 * });
 * ```
 */
let storageFacadeInstance: StorageFacade | null = null;

/**
 * Initialise et retourne le singleton de la facade de storage
 * 
 * @param eventBus - Event bus pour les notifications
 * @returns Instance du StorageFacade
 */
export function initStorageFacade(eventBus: EventBus): StorageFacade {
  if (!storageFacadeInstance) {
    storageFacadeInstance = new StorageFacade(eventBus);
  }
  return storageFacadeInstance;
}

/**
 * Retourne l'instance du StorageFacade
 * @throws {Error} Si la facade n'a pas été initialisée
 */
export function getStorageFacade(): StorageFacade {
  if (!storageFacadeInstance) {
    throw new Error('StorageFacade not initialized. Call initStorageFacade first.');
  }
  return storageFacadeInstance;
}
