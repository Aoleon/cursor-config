/**
 * Repository pour la gestion des Appels d'Offres (domaine Commercial)
 * 
 * Responsabilités :
 * - CRUD complet des AOs
 * - Recherche et filtrage des AOs
 * - Pagination des résultats
 * - Lookup par Monday ID (intégration Monday.com)
 * - Mapping avec relations
 * 
 * Suit le pattern BaseRepository établi
 */

import { BaseRepository } from '../base/BaseRepository';
import { aos, type Ao, type InsertAo } from '@shared/schema';
import type { DrizzleTransaction, PaginationOptions, PaginatedResult, SearchFilters, SortOptions } from '../types';
import { eq, and, desc, ilike, or, count as drizzleCount, isNull, isNotNull } from 'drizzle-orm';
import { safeQuery } from '../../utils/safe-query';

/**
 * Filtres spécifiques aux AOs
 */
export interface AoFilters extends SearchFilters {
  status?: string;
  responsibleUserId?: string;
  menuiserieType?: string;
  source?: string;
  hasMondayId?: boolean;
}

/**
 * Repository pour les Appels d'Offres
 * Hérite des méthodes CRUD de BaseRepository
 */
export class AoRepository extends BaseRepository<
  Ao,
  InsertAo,
  Partial<InsertAo>,
  AoFilters
> {
  protected readonly tableName = 'aos';
  protected readonly table = aos;
  protected readonly primaryKey = aos.id;

  /**
   * Trouve un AO par son ID avec relations
   * 
   * @param id - ID de l'AO (UUID)
   * @param tx - Transaction optionnelle
   * @returns L'AO avec ses relations ou undefined
   */
  async findById(id: string, tx?: DrizzleTransaction): Promise<Ao | undefined> {
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
      { aoId: normalizedId }
    );
  }

  /**
   * Trouve un AO par son Monday ID
   * Méthode spécifique pour l'intégration Monday.com
   * 
   * @param mondayId - ID Monday.com de l'AO
   * @param tx - Transaction optionnelle
   * @returns L'AO correspondant ou undefined
   */
  async findByMondayId(mondayId: string, tx?: DrizzleTransaction): Promise<Ao | undefined> {
    if (!mondayId || mondayId.trim() === '') {
      throw new Error('Monday ID cannot be empty');
    }

    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const result = await dbToUse
          .select()
          .from(this.table)
          .where(eq(aos.mondayItemId, mondayId))
          .limit(1);

        return result[0];
      },
      'findByMondayId',
      { mondayId }
    );
  }

  /**
   * Trouve tous les AOs avec filtres optionnels
   * 
   * @param filters - Filtres de recherche
   * @param tx - Transaction optionnelle
   * @returns Liste des AOs correspondants
   */
  async findAll(filters?: AoFilters, tx?: DrizzleTransaction): Promise<Ao[]> {
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        let query = dbToUse.select().from(this.table);

        // Appliquer les filtres
        const conditions = this.buildWhereConditions(filters);
        if (conditions.length > 0) {
          query = query.where(and(...conditions)) as typeof query;
        }

        // Tri par défaut : plus récents en premier
        query = query.orderBy(desc(aos.createdAt)) as typeof query;

        return await query;
      },
      'findAll',
      { filters }
    );
  }

  /**
   * Trouve les AOs avec pagination
   * 
   * @param filters - Filtres de recherche
   * @param pagination - Options de pagination
   * @param sort - Options de tri
   * @param tx - Transaction optionnelle
   * @returns Résultat paginé
   */
  async findPaginated(
    filters?: AoFilters,
    pagination?: PaginationOptions,
    sort?: SortOptions,
    tx?: DrizzleTransaction
  ): Promise<PaginatedResult<Ao>> {
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
          const sortField = (aos as any)[sort.field];
          if (sortField) {
            dataQuery = dataQuery.orderBy(direction === 'asc' ? sortField : desc(sortField)) as typeof dataQuery;
          }
        } else {
          dataQuery = dataQuery.orderBy(desc(aos.createdAt)) as typeof dataQuery;
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
   * Compte le nombre d'AOs correspondant aux filtres
   * 
   * @param filters - Filtres de recherche
   * @param tx - Transaction optionnelle
   * @returns Nombre d'AOs
   */
  async count(filters?: AoFilters, tx?: DrizzleTransaction): Promise<number> {
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
   * Supprime plusieurs AOs selon des filtres
   * 
   * @param filters - Filtres pour identifier les AOs à supprimer
   * @param tx - Transaction optionnelle
   * @returns Nombre d'AOs supprimés
   */
  async deleteMany(filters: AoFilters, tx?: DrizzleTransaction): Promise<number> {
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
   * Vérifie si un AO existe
   * 
   * @param id - ID de l'AO
   * @param tx - Transaction optionnelle
   * @returns true si l'AO existe
   */
  async exists(id: string, tx?: DrizzleTransaction): Promise<boolean> {
    const normalizedId = this.normalizeId(id);
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const result = await dbToUse
          .select({ id: aos.id })
          .from(this.table)
          .where(eq(this.primaryKey, normalizedId))
          .limit(1);

        return result.length > 0;
      },
      'exists',
      { aoId: normalizedId }
    );
  }

  /**
   * Trouve tous les AOs qui n'ont pas encore été exportés vers Monday.com
   * Utile pour la synchronisation
   * 
   * @param limit - Nombre maximum d'AOs à retourner
   * @param tx - Transaction optionnelle
   * @returns Liste des AOs sans Monday ID
   */
  async findPendingMondayExport(limit: number = 100, tx?: DrizzleTransaction): Promise<Ao[]> {
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        return await dbToUse
          .select()
          .from(this.table)
          .where(isNull(aos.mondayItemId))
          .orderBy(desc(aos.createdAt))
          .limit(limit);
      },
      'findPendingMondayExport',
      { limit }
    );
  }

  /**
   * Construit les conditions WHERE pour les requêtes
   * 
   * @param filters - Filtres à appliquer
   * @returns Tableau de conditions Drizzle
   */
  private buildWhereConditions(filters?: AoFilters): any[] {
    if (!filters) return [];

    const conditions: any[] = [];

    // Filtre par statut
    if (filters.status) {
      conditions.push(eq(aos.status, filters.status as any));
    }

    // Note: AOs n'ont pas de champ responsibleUserId dans la base de données
    // Ce filtre est ignoré pour les AOs

    // Filtre par type de menuiserie
    if (filters.menuiserieType) {
      conditions.push(eq(aos.menuiserieType, filters.menuiserieType as any));
    }

    // Filtre par source
    if (filters.source) {
      conditions.push(eq(aos.source, filters.source as any));
    }

    // Filtre par présence/absence de Monday ID
    if (filters.hasMondayId !== undefined) {
      if (filters.hasMondayId) {
        conditions.push(isNotNull(aos.mondayItemId));
      } else {
        conditions.push(isNull(aos.mondayItemId));
      }
    }

    // Recherche textuelle (reference, client, location)
    if (filters.search) {
      const searchPattern = `%${filters.search}%`;
      conditions.push(
        or(
          ilike(aos.reference, searchPattern),
          ilike(aos.client, searchPattern),
          ilike(aos.location, searchPattern)
        )
      );
    }

    // Filtres de dates
    if (filters.dateFrom) {
      const fromDate = typeof filters.dateFrom === 'string' 
        ? new Date(filters.dateFrom) 
        : filters.dateFrom;
      conditions.push(eq(aos.createdAt, fromDate));
    }

    if (filters.dateTo) {
      const toDate = typeof filters.dateTo === 'string' 
        ? new Date(filters.dateTo) 
        : filters.dateTo;
      conditions.push(eq(aos.createdAt, toDate));
    }

    return conditions;
  }
}
