/**
 * Repository pour la gestion des Offres (domaine Commercial)
 * 
 * Responsabilités :
 * - CRUD complet des offres
 * - Recherche et filtrage des offres
 * - Pagination des résultats
 * - Mapping avec relations (user responsable, AO lié)
 * 
 * Suit le pattern BaseRepository établi
 */

import { BaseRepository } from '../base/BaseRepository';
import { offers, aos, users, type Offer, type InsertOffer } from '@shared/schema';
import type { DrizzleTransaction, PaginationOptions, PaginatedResult, SearchFilters, SortOptions } from '../types';
import { eq, and, desc, ilike, or, count as drizzleCount } from 'drizzle-orm';
import { safeQuery } from '../../utils/safe-query';

/**
 * Filtres spécifiques aux offres
 */
export interface OfferFilters extends SearchFilters {
  status?: string;
  responsibleUserId?: string;
  aoId?: string;
  menuiserieType?: string;
}

/**
 * Repository pour les offres
 * Hérite des méthodes CRUD de BaseRepository
 */
export class OfferRepository extends BaseRepository<
  Offer,
  InsertOffer,
  Partial<InsertOffer>,
  OfferFilters
> {
  protected readonly tableName = 'offers';
  protected readonly table = offers;
  protected readonly primaryKey = offers.id;

  /**
   * Trouve une offre par son ID avec relations
   * 
   * @param id - ID de l'offre (UUID)
   * @param tx - Transaction optionnelle
   * @returns L'offre avec ses relations ou undefined
   */
  async findById(id: string, tx?: DrizzleTransaction): Promise<Offer | undefined> {
    const normalizedId = this.normalizeId(id);
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const result = await dbToUse
          .select()
          .from(this.table)
          .where(eq(this.primaryKey, normalizedId))
          .limit(1);

        return result[0];
      },
      'findById',
      { offerId: normalizedId }
    );
  }

  /**
   * Trouve toutes les offres avec filtres optionnels
   * 
   * @param filters - Filtres de recherche
   * @param tx - Transaction optionnelle
   * @returns Liste des offres correspondantes
   */
  async findAll(filters?: OfferFilters, tx?: DrizzleTransaction): Promise<Offer[]> {
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        let query = dbToUse.select().from(this.table);

        // Appliquer les filtres
        const conditions = this.buildWhereConditions(filters);
        if (conditions.length > 0) {
          query = query.where(and(...conditions)) as typeof query;
        }

        // Tri par défaut : plus récentes en premier
        query = query.orderBy(desc(offers.createdAt)) as typeof query;

        return await query;
      },
      'findAll',
      { filters }
    );
  }

  /**
   * Trouve les offres avec pagination
   * 
   * @param filters - Filtres de recherche
   * @param pagination - Options de pagination
   * @param sort - Options de tri
   * @param tx - Transaction optionnelle
   * @returns Résultat paginé
   */
  async findPaginated(
    filters?: OfferFilters,
    pagination?: PaginationOptions,
    sort?: SortOptions,
    tx?: DrizzleTransaction
  ): Promise<PaginatedResult<Offer>> {
    const dbToUse = this.getDb(tx);
    const limit = pagination?.limit || 50;
    const offset = pagination?.offset || 0;

    return this.executeQuery(
      async () => {
        // Construire les conditions WHERE
        const conditions = this.buildWhereConditions(filters);
        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        // Requête de données paginées
        let dataQuery = dbToUse.select().from(this.table);
        if (whereClause) {
          dataQuery = dataQuery.where(whereClause) as typeof dataQuery;
        }

        // Appliquer le tri
        if (sort?.field) {
          const direction = sort.direction === 'asc' ? 'asc' : 'desc';
          const sortField = (offers as any)[sort.field];
          if (sortField) {
            dataQuery = dataQuery.orderBy(direction === 'asc' ? sortField : desc(sortField)) as typeof dataQuery;
          }
        } else {
          dataQuery = dataQuery.orderBy(desc(offers.createdAt)) as typeof dataQuery;
        }

        dataQuery = dataQuery.limit(limit).offset(offset) as typeof dataQuery;

        // Requête de comptage total
        let countQuery = dbToUse.select({ count: drizzleCount() }).from(this.table);
        if (whereClause) {
          countQuery = countQuery.where(whereClause) as typeof countQuery;
        }

        // Exécuter les deux requêtes en parallèle
        const [items, countResult] = await Promise.all([
          dataQuery,
          countQuery
        ]);

        const total = countResult[0]?.count || 0;

        return this.createPaginatedResult(items, total, pagination || {});
      },
      'findPaginated',
      { filters, limit, offset }
    );
  }

  /**
   * Compte le nombre d'offres correspondant aux filtres
   * 
   * @param filters - Filtres de recherche
   * @param tx - Transaction optionnelle
   * @returns Nombre d'offres
   */
  async count(filters?: OfferFilters, tx?: DrizzleTransaction): Promise<number> {
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        let query = dbToUse.select({ count: drizzleCount() }).from(this.table);

        const conditions = this.buildWhereConditions(filters);
        if (conditions.length > 0) {
          query = query.where(and(...conditions)) as typeof query;
        }

        const result = await query;
        return result[0]?.count || 0;
      },
      'count',
      { filters }
    );
  }

  /**
   * Supprime plusieurs offres selon des filtres
   * 
   * @param filters - Filtres pour identifier les offres à supprimer
   * @param tx - Transaction optionnelle
   * @returns Nombre d'offres supprimées
   */
  async deleteMany(filters: OfferFilters, tx?: DrizzleTransaction): Promise<number> {
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const conditions = this.buildWhereConditions(filters);
        if (conditions.length === 0) {
          throw new Error('deleteMany requires at least one filter condition for safety');
        }

        const result = await dbToUse
          .delete(this.table)
          .where(and(...conditions))
          .returning();

        const deletedCount = result.length;
        this.emitEvent(`${this.tableName}:deleted:batch`, { count: deletedCount, filters });
        
        return deletedCount;
      },
      'deleteMany',
      { filters }
    );
  }

  /**
   * Vérifie si une offre existe
   * 
   * @param id - ID de l'offre
   * @param tx - Transaction optionnelle
   * @returns true si l'offre existe
   */
  async exists(id: string, tx?: DrizzleTransaction): Promise<boolean> {
    const normalizedId = this.normalizeId(id);
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const result = await dbToUse
          .select({ id: offers.id })
          .from(this.table)
          .where(eq(this.primaryKey, normalizedId))
          .limit(1);

        return result.length > 0;
      },
      'exists',
      { offerId: normalizedId }
    );
  }

  /**
   * Construit les conditions WHERE pour les requêtes
   * 
   * @param filters - Filtres à appliquer
   * @returns Tableau de conditions Drizzle
   */
  private buildWhereConditions(filters?: OfferFilters): any[] {
    if (!filters) return [];

    const conditions: any[] = [];

    // Filtre par statut
    if (filters.status) {
      conditions.push(eq(offers.status, filters.status as any));
    }

    // Filtre par utilisateur responsable
    if (filters.responsibleUserId) {
      conditions.push(eq(offers.responsibleUserId, filters.responsibleUserId));
    }

    // Filtre par AO lié
    if (filters.aoId) {
      conditions.push(eq(offers.aoId, filters.aoId));
    }

    // Filtre par type de menuiserie
    if (filters.menuiserieType) {
      conditions.push(eq(offers.menuiserieType, filters.menuiserieType as any));
    }

    // Recherche textuelle (reference, client, location)
    if (filters.search) {
      const searchPattern = `%${filters.search}%`;
      conditions.push(
        or(
          ilike(offers.reference, searchPattern),
          ilike(offers.client, searchPattern),
          ilike(offers.location, searchPattern)
        )
      );
    }

    // Filtres de dates
    if (filters.dateFrom) {
      const fromDate = typeof filters.dateFrom === 'string' 
        ? new Date(filters.dateFrom) 
        : filters.dateFrom;
      conditions.push(eq(offers.createdAt, fromDate));
    }

    if (filters.dateTo) {
      const toDate = typeof filters.dateTo === 'string' 
        ? new Date(filters.dateTo) 
        : filters.dateTo;
      conditions.push(eq(offers.createdAt, toDate));
    }

    return conditions;
  }
}
