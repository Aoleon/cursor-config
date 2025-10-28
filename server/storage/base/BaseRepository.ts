/**
 * Classe abstraite de base pour les repositories
 * Fournit les fonctionnalités communes : logging, gestion d'erreurs, helpers
 * ARCHITECTURE CORRIGÉE : Implémentations concrètes des méthodes CRUD
 */

import type { Logger } from '../../utils/logger';
import { logger as rootLogger } from '../../utils/logger';
import { DatabaseError } from '../../utils/error-handler';
import { safeQuery, safeInsert, safeUpdate, safeDelete } from '../../utils/safe-query';
import type { 
  DrizzleTransaction, 
  PaginationOptions, 
  PaginatedResult, 
  SearchFilters,
  SortOptions,
  RepositoryOptions
} from '../types';
import { createPaginatedResult } from '../types';
import type { IRepository } from './IRepository';
import { eq, inArray, sql, and } from 'drizzle-orm';

/**
 * Classe abstraite de base pour tous les repositories
 * 
 * ARCHITECTURE CORRIGÉE :
 * - Les propriétés abstraites `table` et `primaryKey` permettent aux classes dérivées
 *   de fournir leur table Drizzle et leur colonne ID
 * - Les méthodes CRUD concrètes `create()`, `update()`, `delete()` sont implémentées
 *   en utilisant les helpers `safeInsert/safeUpdate/safeDelete`
 * - Les repositories dérivés n'ont plus besoin de réimplémenter ces méthodes de base
 * 
 * Fournit :
 * - Logger contextualisé avec le nom du repository
 * - Gestion d'erreurs unifiée avec typed errors
 * - Helpers pour requêtes communes (pagination, search, filters)
 * - Méthodes utilitaires pour validation et transformation
 * - Implémentations CRUD concrètes réutilisables
 * 
 * @template T - Type de l'entité gérée
 * @template TInsert - Type des données d'insertion
 * @template TUpdate - Type des données de mise à jour
 * @template TFilters - Type des filtres de recherche
 * 
 * @example
 * ```typescript
 * class OfferRepository extends BaseRepository<Offer, InsertOffer, Partial<InsertOffer>> {
 *   protected readonly tableName = 'offers';
 *   protected readonly table = offers;
 *   protected readonly primaryKey = offers.id;
 *   
 *   constructor(db: DrizzleDb, eventBus: EventBus) {
 *     super('OfferRepository', db, eventBus);
 *   }
 *   
 *   // Les méthodes create(), update(), delete() sont déjà implémentées !
 *   // Il suffit d'implémenter les méthodes spécifiques comme findById()
 *   
 *   async findById(id: string, tx?: DrizzleTransaction): Promise<Offer | undefined> {
 *     return this.executeQuery(
 *       () => this.getDb(tx).query.offers.findFirst({ where: eq(offers.id, id) }),
 *       'findById',
 *       { id }
 *     );
 *   }
 * }
 * ```
 */
export abstract class BaseRepository<
  T,
  TInsert = Partial<T>,
  TUpdate = Partial<T>,
  TFilters = SearchFilters
> implements IRepository<T, TInsert, TUpdate, TFilters> {
  /**
   * Logger contextualisé pour ce repository
   */
  protected readonly logger: Logger;

  /**
   * Nom du repository (pour logging et erreurs)
   */
  protected readonly repositoryName: string;

  /**
   * Instance de la base de données
   */
  protected readonly db: any;

  /**
   * Event bus optionnel pour notifications
   */
  protected readonly eventBus?: any;

  /**
   * Nom de la table (doit être défini par les classes dérivées)
   */
  protected abstract readonly tableName: string;

  /**
   * Table Drizzle (doit être définie par les classes dérivées)
   * 
   * @example
   * ```typescript
   * protected readonly table = offers; // import { offers } from '@shared/schema'
   * ```
   */
  protected abstract readonly table: any;

  /**
   * Colonne de clé primaire (doit être définie par les classes dérivées)
   * 
   * @example
   * ```typescript
   * protected readonly primaryKey = offers.id;
   * ```
   */
  protected abstract readonly primaryKey: any;

  /**
   * Constructeur de base
   * 
   * @param repositoryName - Nom du repository (pour logging)
   * @param db - Instance Drizzle de la base de données
   * @param eventBus - Event bus optionnel pour notifications
   */
  constructor(repositoryName: string, db: any, eventBus?: any) {
    this.repositoryName = repositoryName;
    this.db = db;
    this.eventBus = eventBus;
    this.logger = rootLogger.child(repositoryName);
  }

  /**
   * Retourne l'instance DB appropriée (transaction ou DB principale)
   */
  protected getDb(tx?: DrizzleTransaction): any {
    return tx || this.db;
  }

  /**
   * Exécute une requête avec gestion d'erreurs et logging
   * 
   * @param queryFn - Fonction de requête à exécuter
   * @param operation - Nom de l'opération (pour logging)
   * @param metadata - Métadonnées additionnelles pour logging
   */
  protected async executeQuery<R>(
    queryFn: () => Promise<R>,
    operation: string,
    metadata?: Record<string, any>
  ): Promise<R> {
    try {
      this.logger.debug(`Executing ${operation}`, {
        metadata: {
          module: this.repositoryName,
          operation,
          ...metadata
        }
      });

      const result = await safeQuery(queryFn, {
        service: this.repositoryName,
        operation
      });

      this.logger.debug(`${operation} completed successfully`, {
        metadata: {
          module: this.repositoryName,
          operation
        }
      });

      return result;
    } catch (error) {
      this.logger.error(`${operation} failed`, error as Error, {
        metadata: {
          module: this.repositoryName,
          operation,
          ...metadata
        }
      });
      throw error;
    }
  }

  /**
   * Helper pour construire un résultat paginé
   */
  protected createPaginatedResult<R>(
    items: R[],
    total: number,
    pagination?: PaginationOptions
  ): PaginatedResult<R> {
    return createPaginatedResult(items, total, pagination || {});
  }

  /**
   * Helper pour valider qu'un ID n'est pas vide
   */
  protected validateId(id: string, operation: string): void {
    if (!id || id.trim() === '') {
      throw new DatabaseError(
        `ID invalide pour l'opération ${operation} dans ${this.repositoryName}`
      );
    }
  }

  /**
   * Normalise un ID pour l'utiliser dans les requêtes avec validation UUID stricte
   * 
   * VALIDATION STRICTE UUID :
   * - Accepte uniquement les strings (number sera supporté plus tard pour serial IDs)
   * - Trim et lowercase automatique
   * - Validation format UUID canonique (8-4-4-4-12 caractères hexadécimaux)
   * - Throw DatabaseError en cas d'échec de validation
   * 
   * @param id - ID à normaliser (doit être un string UUID)
   * @returns L'ID normalisé (lowercase, trimmed, validé)
   * @throws DatabaseError si le type n'est pas string ou si le format UUID est invalide
   * 
   * @example
   * ```typescript
   * // Valide
   * normalizeId('550e8400-e29b-41d4-a716-446655440000') // => '550e8400-e29b-41d4-a716-446655440000'
   * normalizeId('550E8400-E29B-41D4-A716-446655440000') // => '550e8400-e29b-41d4-a716-446655440000'
   * normalizeId('  550e8400-e29b-41d4-a716-446655440000  ') // => '550e8400-e29b-41d4-a716-446655440000'
   * 
   * // Invalide - throw DatabaseError
   * normalizeId(123) // Type invalide
   * normalizeId('not-a-uuid') // Format invalide
   * normalizeId('550e8400-e29b-41d4-a716') // Format incomplet
   * ```
   */
  protected normalizeId(id: string | number): string {
    // Étape 1 : Validation du type (accepter uniquement string)
    if (typeof id !== 'string') {
      throw new DatabaseError(
        `Invalid ID type for ${this.repositoryName}: expected string (UUID), received ${typeof id}. ` +
        `Operation: normalizeId`
      );
    }
    
    // Étape 2 : Trim et lowercase
    const normalized = id.trim().toLowerCase();
    
    // Étape 3 : Validation format UUID (regex canonique RFC 4122)
    // Format : 8-4-4-4-12 caractères hexadécimaux
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
    
    if (!uuidRegex.test(normalized)) {
      throw new DatabaseError(
        `Invalid UUID format for ${this.repositoryName}: "${normalized}". ` +
        `Expected format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (lowercase hex). ` +
        `Operation: normalizeId`
      );
    }
    
    return normalized;
  }

  /**
   * Helper pour gérer les entités non trouvées
   */
  protected handleNotFound(id: string, operation: string): never {
    const message = `Entité non trouvée: ${id} dans ${this.repositoryName}`;
    this.logger.warn(message, {
      metadata: {
        module: this.repositoryName,
        operation,
        entityId: id
      }
    });
    throw new DatabaseError(message);
  }

  /**
   * Émet un événement via l'event bus si disponible
   */
  protected emitEvent(eventName: string, data: any): void {
    if (this.eventBus) {
      try {
        this.eventBus.emit(eventName, data);
        this.logger.debug(`Event emitted: ${eventName}`, {
          metadata: {
            module: this.repositoryName,
            event: eventName
          }
        });
      } catch (error) {
        this.logger.warn(`Failed to emit event: ${eventName}`, {
          metadata: {
            module: this.repositoryName,
            event: eventName,
            error: error instanceof Error ? error.message : String(error)
          }
        });
      }
    }
  }

  /**
   * IMPLÉMENTATION CONCRÈTE : Créer une nouvelle entité
   * 
   * Utilise le helper `safeInsert` pour gérer les contraintes et erreurs
   * 
   * @param data - Données d'insertion
   * @param tx - Transaction optionnelle
   * @returns L'entité créée
   * 
   * @example
   * ```typescript
   * const offer = await offerRepository.create({ 
   *   title: 'Test', 
   *   status: 'draft' 
   * });
   * ```
   */
  async create(data: TInsert, tx?: DrizzleTransaction): Promise<T> {
    this.logger.debug('Creating entity', {
      metadata: {
        module: this.repositoryName,
        operation: 'create'
      }
    });

    const dbInstance = this.getDb(tx);
    
    const result = await safeInsert<T[]>(
      this.tableName,
      () => dbInstance.insert(this.table).values(data).returning(),
      {
        service: this.repositoryName,
        operation: 'create'
      }
    );

    if (!result || result.length === 0) {
      throw new DatabaseError(
        `Échec de la création dans ${this.repositoryName}: aucun enregistrement retourné`
      );
    }

    this.emitEvent(`${this.tableName}:created`, result[0]);
    
    return result[0];
  }

  /**
   * IMPLÉMENTATION CONCRÈTE : Créer plusieurs entités en batch
   * 
   * @param data - Tableau de données d'insertion
   * @param tx - Transaction optionnelle
   * @returns Les entités créées
   */
  async createMany(data: TInsert[], tx?: DrizzleTransaction): Promise<T[]> {
    this.logger.debug('Creating multiple entities', {
      metadata: {
        module: this.repositoryName,
        operation: 'createMany',
        count: data.length
      }
    });

    if (data.length === 0) {
      return [];
    }

    const dbInstance = this.getDb(tx);
    
    const result = await safeInsert<T[]>(
      this.tableName,
      () => dbInstance.insert(this.table).values(data).returning(),
      {
        service: this.repositoryName,
        operation: 'createMany'
      }
    );

    this.emitEvent(`${this.tableName}:created:batch`, result);
    
    return result;
  }

  /**
   * IMPLÉMENTATION CONCRÈTE : Mettre à jour une entité existante
   * 
   * Utilise le helper `safeUpdate` pour gérer les conflits et erreurs
   * 
   * @param id - Identifiant de l'entité
   * @param data - Données de mise à jour
   * @param tx - Transaction optionnelle
   * @returns L'entité mise à jour
   * 
   * @example
   * ```typescript
   * const offer = await offerRepository.update('123', { 
   *   status: 'published' 
   * });
   * ```
   */
  async update(id: string, data: TUpdate, tx?: DrizzleTransaction): Promise<T> {
    this.validateId(id, 'update');

    // Normaliser l'ID avant de l'utiliser dans la requête
    const normalizedId = this.normalizeId(id);

    this.logger.debug('Updating entity', {
      metadata: {
        module: this.repositoryName,
        operation: 'update',
        entityId: id
      }
    });

    const dbInstance = this.getDb(tx);
    
    const result = await safeUpdate<T[]>(
      this.tableName,
      () => dbInstance
        .update(this.table)
        .set(data)
        .where(eq(this.primaryKey, normalizedId))
        .returning(),
      1, // Expected count
      {
        service: this.repositoryName,
        operation: 'update'
      }
    );

    if (!result || result.length === 0) {
      this.handleNotFound(id, 'update');
    }

    this.emitEvent(`${this.tableName}:updated`, result[0]);
    
    return result[0];
  }

  /**
   * IMPLÉMENTATION CONCRÈTE : Supprimer une entité
   * 
   * Utilise le helper `safeDelete` pour gérer les dépendances et erreurs
   * 
   * @param id - Identifiant de l'entité
   * @param tx - Transaction optionnelle
   * 
   * @example
   * ```typescript
   * await offerRepository.delete('123');
   * ```
   */
  async delete(id: string, tx?: DrizzleTransaction): Promise<void> {
    this.validateId(id, 'delete');

    // Normaliser l'ID avant de l'utiliser dans la requête
    const normalizedId = this.normalizeId(id);

    this.logger.debug('Deleting entity', {
      metadata: {
        module: this.repositoryName,
        operation: 'delete',
        entityId: id
      }
    });

    const dbInstance = this.getDb(tx);
    
    const result = await safeDelete<T[]>(
      this.tableName,
      () => dbInstance
        .delete(this.table)
        .where(eq(this.primaryKey, normalizedId))
        .returning(),
      1, // Expected count
      {
        service: this.repositoryName,
        operation: 'delete'
      }
    );

    if (!result || result.length === 0) {
      this.handleNotFound(id, 'delete');
    }

    this.emitEvent(`${this.tableName}:deleted`, { id });
  }

  /**
   * IMPLÉMENTATION CONCRÈTE : Soft delete - marque un enregistrement comme supprimé sans le détruire
   * 
   * @param id - ID de l'enregistrement à soft delete
   * @param tx - Transaction optionnelle
   * @returns L'enregistrement mis à jour
   * 
   * IMPORTANT: Cette méthode nécessite que la table ait un champ `deletedAt: timestamp`
   * Si la table n'a pas ce champ, cette méthode throw une erreur
   * 
   * @example
   * ```typescript
   * const offer = await offerRepository.softDelete('123');
   * ```
   */
  async softDelete(id: string, tx?: DrizzleTransaction): Promise<T> {
    this.validateId(id, 'softDelete');
    const normalizedId = this.normalizeId(id);
    
    const hasDeletedAt = 'deletedAt' in this.table;
    if (!hasDeletedAt) {
      throw new DatabaseError(
        `Table ${this.tableName} does not support soft delete (missing deletedAt field)`
      );
    }
    
    this.logger.debug('Soft deleting entity', {
      metadata: {
        module: this.repositoryName,
        operation: 'softDelete',
        entityId: id
      }
    });

    const dbInstance = this.getDb(tx);
    
    const result = await safeUpdate<T[]>(
      this.tableName,
      () => dbInstance
        .update(this.table)
        .set({ deletedAt: new Date() } as any)
        .where(eq(this.primaryKey, normalizedId))
        .returning(),
      1,
      {
        service: this.repositoryName,
        operation: 'softDelete'
      }
    );
    
    if (!result || result.length === 0) {
      throw new DatabaseError(
        `${this.tableName} not found for soft delete`,
        'NOT_FOUND',
        { id: normalizedId }
      );
    }
    
    this.emitEvent(`${this.tableName}:soft_deleted`, result[0]);
    
    return result[0];
  }

  /**
   * IMPLÉMENTATION CONCRÈTE : Restore - restaure un enregistrement soft deleted
   * 
   * @param id - ID de l'enregistrement à restaurer
   * @param tx - Transaction optionnelle
   * @returns L'enregistrement restauré
   * 
   * @example
   * ```typescript
   * const offer = await offerRepository.restore('123');
   * ```
   */
  async restore(id: string, tx?: DrizzleTransaction): Promise<T> {
    this.validateId(id, 'restore');
    const normalizedId = this.normalizeId(id);
    
    this.logger.debug('Restoring soft deleted entity', {
      metadata: {
        module: this.repositoryName,
        operation: 'restore',
        entityId: id
      }
    });

    const dbInstance = this.getDb(tx);
    
    const result = await safeUpdate<T[]>(
      this.tableName,
      () => dbInstance
        .update(this.table)
        .set({ deletedAt: null } as any)
        .where(eq(this.primaryKey, normalizedId))
        .returning(),
      1,
      {
        service: this.repositoryName,
        operation: 'restore'
      }
    );
    
    if (!result || result.length === 0) {
      throw new DatabaseError(
        `${this.tableName} not found for restore`,
        'NOT_FOUND',
        { id: normalizedId }
      );
    }
    
    this.emitEvent(`${this.tableName}:restored`, result[0]);
    
    return result[0];
  }

  /**
   * IMPLÉMENTATION CONCRÈTE : Update many - met à jour plusieurs enregistrements avec les mêmes données
   * 
   * @param ids - Tableau d'IDs à mettre à jour
   * @param data - Données de mise à jour
   * @param tx - Transaction optionnelle
   * @returns Les enregistrements mis à jour
   * 
   * NOTE: Tous les enregistrements seront mis à jour avec les mêmes données
   * PERFORMANCE: Utilise une seule query UPDATE au lieu de N queries
   * 
   * @example
   * ```typescript
   * const offers = await offerRepository.updateMany(
   *   ['id1', 'id2', 'id3'],
   *   { status: 'archived' }
   * );
   * ```
   */
  async updateMany(ids: string[], data: TUpdate, tx?: DrizzleTransaction): Promise<T[]> {
    if (ids.length === 0) {
      return [];
    }
    
    const normalizedIds = ids.map(id => this.normalizeId(id));
    
    this.logger.debug('Updating multiple entities', {
      metadata: {
        module: this.repositoryName,
        operation: 'updateMany',
        count: ids.length
      }
    });

    const dbInstance = this.getDb(tx);
    
    const result = await safeUpdate<T[]>(
      this.tableName,
      () => dbInstance
        .update(this.table)
        .set(data)
        .where(inArray(this.primaryKey, normalizedIds))
        .returning(),
      ids.length,
      {
        service: this.repositoryName,
        operation: 'updateMany'
      }
    );
    
    result.forEach(record => this.emitEvent(`${this.tableName}:updated`, record));
    
    this.logger.info(`Updated ${result.length} records`, {
      metadata: {
        module: this.repositoryName,
        operation: 'updateMany',
        count: result.length
      }
    });
    
    return result;
  }

  /**
   * IMPLÉMENTATION CONCRÈTE : Upsert - créer ou mettre à jour un enregistrement
   * 
   * @param data - Données à insérer
   * @param conflictTarget - Champ unique pour détecter le conflit (ex: 'email', 'reference')
   * @param tx - Transaction optionnelle
   * @returns L'enregistrement créé ou mis à jour
   * 
   * COMPORTEMENT:
   * - Si le record existe (conflit sur conflictTarget), il est mis à jour
   * - Sinon, il est créé
   * 
   * @example
   * ```typescript
   * const offer = await offerRepository.upsert(
   *   { reference: 'REF-001', title: 'Test' },
   *   'reference'
   * );
   * ```
   */
  async upsert(
    data: TInsert,
    conflictTarget: keyof TInsert,
    tx?: DrizzleTransaction
  ): Promise<T> {
    this.logger.debug('Upserting entity', {
      metadata: {
        module: this.repositoryName,
        operation: 'upsert',
        conflictTarget: conflictTarget as string
      }
    });

    const dbInstance = this.getDb(tx);
    
    const result = await this.executeQuery(
      () => dbInstance
        .insert(this.table)
        .values(data)
        .onConflictDoUpdate({
          target: this.table[conflictTarget as string],
          set: data
        })
        .returning(),
      'upsert',
      { conflictTarget: conflictTarget as string }
    );
    
    if (!result || result.length === 0) {
      throw new DatabaseError(
        `${this.tableName} upsert failed`,
        'UPSERT_FAILED',
        { data, conflictTarget: conflictTarget as string }
      );
    }
    
    this.emitEvent(`${this.tableName}:upserted`, result[0]);
    
    return result[0];
  }

  /**
   * IMPLÉMENTATION CONCRÈTE : Count - compte les enregistrements avec filtres optionnels
   * 
   * @param filters - Filtres optionnels (WHERE clauses)
   * @param tx - Transaction optionnelle
   * @returns Le nombre d'enregistrements
   * 
   * USAGE:
   * - count() : compte tous les enregistrements
   * - count({ status: 'active' }) : compte avec filtres
   * 
   * @example
   * ```typescript
   * const total = await offerRepository.count();
   * const activeCount = await offerRepository.count({ status: 'active' });
   * ```
   */
  async count(filters?: Record<string, any>, tx?: DrizzleTransaction): Promise<number> {
    this.logger.debug('Counting entities', {
      metadata: {
        module: this.repositoryName,
        operation: 'count',
        hasFilters: !!filters
      }
    });

    const dbInstance = this.getDb(tx);
    
    let query = dbInstance.select({ count: sql<number>`count(*)` }).from(this.table);
    
    if (filters && Object.keys(filters).length > 0) {
      const whereConditions = Object.entries(filters).map(([key, value]) => {
        return eq(this.table[key], value);
      });
      
      if (whereConditions.length > 0) {
        query = query.where(and(...whereConditions));
      }
    }
    
    const result = await this.executeQuery(
      () => query,
      'count',
      { filters }
    );
    
    return result[0]?.count || 0;
  }

  /**
   * IMPLÉMENTATION CONCRÈTE : Archive - archive un enregistrement
   * 
   * @param id - ID de l'enregistrement à archiver
   * @param tx - Transaction optionnelle
   * @returns L'enregistrement archivé
   * 
   * IMPORTANT: Cette méthode nécessite que la table ait un champ `isArchived: boolean`
   * Si la table n'a pas ce champ, cette méthode throw une erreur
   * 
   * @example
   * ```typescript
   * const offer = await offerRepository.archive('123');
   * ```
   */
  async archive(id: string, tx?: DrizzleTransaction): Promise<T> {
    this.validateId(id, 'archive');
    const normalizedId = this.normalizeId(id);
    
    const hasIsArchived = 'isArchived' in this.table;
    if (!hasIsArchived) {
      throw new DatabaseError(
        `Table ${this.tableName} does not support archiving (missing isArchived field)`
      );
    }
    
    this.logger.debug('Archiving entity', {
      metadata: {
        module: this.repositoryName,
        operation: 'archive',
        entityId: id
      }
    });

    const dbInstance = this.getDb(tx);
    
    const result = await safeUpdate<T[]>(
      this.tableName,
      () => dbInstance
        .update(this.table)
        .set({ isArchived: true } as any)
        .where(eq(this.primaryKey, normalizedId))
        .returning(),
      1,
      {
        service: this.repositoryName,
        operation: 'archive'
      }
    );
    
    if (!result || result.length === 0) {
      throw new DatabaseError(
        `${this.tableName} not found for archiving`,
        'NOT_FOUND',
        { id: normalizedId }
      );
    }
    
    this.emitEvent(`${this.tableName}:archived`, result[0]);
    
    return result[0];
  }

  /**
   * IMPLÉMENTATION CONCRÈTE : Unarchive - désarchive un enregistrement
   * 
   * @param id - ID de l'enregistrement à désarchiver
   * @param tx - Transaction optionnelle
   * @returns L'enregistrement désarchivé
   * 
   * @example
   * ```typescript
   * const offer = await offerRepository.unarchive('123');
   * ```
   */
  async unarchive(id: string, tx?: DrizzleTransaction): Promise<T> {
    this.validateId(id, 'unarchive');
    const normalizedId = this.normalizeId(id);
    
    this.logger.debug('Unarchiving entity', {
      metadata: {
        module: this.repositoryName,
        operation: 'unarchive',
        entityId: id
      }
    });

    const dbInstance = this.getDb(tx);
    
    const result = await safeUpdate<T[]>(
      this.tableName,
      () => dbInstance
        .update(this.table)
        .set({ isArchived: false } as any)
        .where(eq(this.primaryKey, normalizedId))
        .returning(),
      1,
      {
        service: this.repositoryName,
        operation: 'unarchive'
      }
    );
    
    if (!result || result.length === 0) {
      throw new DatabaseError(
        `${this.tableName} not found for unarchiving`,
        'NOT_FOUND',
        { id: normalizedId }
      );
    }
    
    this.emitEvent(`${this.tableName}:unarchived`, result[0]);
    
    return result[0];
  }

  /**
   * Méthodes abstraites à implémenter par les classes dérivées
   * 
   * Ces méthodes sont spécifiques à chaque domaine et ne peuvent pas
   * être implémentées de manière générique
   */
  abstract findById(id: string, tx?: DrizzleTransaction): Promise<T | undefined>;
  abstract findAll(filters?: TFilters, tx?: DrizzleTransaction): Promise<T[]>;
  abstract findPaginated(
    filters?: TFilters,
    pagination?: PaginationOptions,
    sort?: SortOptions,
    tx?: DrizzleTransaction
  ): Promise<PaginatedResult<T>>;
  abstract deleteMany(filters: TFilters, tx?: DrizzleTransaction): Promise<number>;
  abstract exists(id: string, tx?: DrizzleTransaction): Promise<boolean>;
}
