/**
 * Repository pour la gestion des Fournisseurs (domaine Suppliers)
 * 
 * Responsabilités :
 * - CRUD complet des Suppliers
 * - Gestion des SupplierRequests
 * - Gestion des SupplierSpecializations
 * - Gestion des SupplierQuoteSessions
 * - Gestion des SupplierDocuments
 * - Gestion des SupplierQuoteAnalyses
 * - Gestion des AoLotSuppliers
 * - Recherche et filtrage
 * - Pagination des résultats
 * - Workflow complet fournisseurs
 * 
 * Suit le pattern BaseRepository établi
 */

import { BaseRepository } from '../base/BaseRepository';
import { AppError, NotFoundError, ValidationError, AuthorizationError } from './utils/error-handler';
import { 
  suppliers,
  supplierRequests,
  supplierSpecializations,
  supplierQuoteSessions,
  aoLotSuppliers,
  supplierDocuments,
  supplierQuoteAnalysis,
  users,
  aos,
  aoLots,
  type Supplier,
  type InsertSupplier,
  type SupplierRequest,
  type InsertSupplierRequest,
  type SupplierSpecializations,
  type InsertSupplierSpecializations,
  type SupplierQuoteSession,
  type InsertSupplierQuoteSession,
  type AoLotSupplier,
  type InsertAoLotSupplier,
  type SupplierDocument,
  type InsertSupplierDocument,
  type SupplierQuoteAnalysis,
  type InsertSupplierQuoteAnalysis
} from '@shared/schema';
import type { DrizzleTransaction, PaginationOptions, PaginatedResult, SearchFilters, SortOptions } from '../types';
import { eq, and, desc, ilike, or, count as drizzleCount, isNull, isNotNull } from 'drizzle-orm';

/**
 * Filtres spécifiques aux Suppliers
 */
export interface SupplierFilters extends SearchFilters {
  status?: string;
  specialization?: string;
  departement?: string;
}

/**
 * Filtres pour SupplierRequests
 */
export interface SupplierRequestFilters extends SearchFilters {
  offerId?: string;
  projectId?: string;
  status?: string;
}

/**
 * Filtres pour SupplierQuoteSessions
 */
export interface QuoteSessionFilters extends SearchFilters {
  aoId?: string;
  aoLotId?: string;
  supplierId?: string;
  status?: string;
}

/**
 * Filtres pour SupplierDocuments
 */
export interface SupplierDocumentFilters extends SearchFilters {
  sessionId?: string;
  supplierId?: string;
  aoLotId?: string;
  status?: string;
}

/**
 * Filtres pour SupplierQuoteAnalyses
 */
export interface QuoteAnalysisFilters extends SearchFilters {
  documentId?: string;
  sessionId?: string;
  status?: string;
}

/**
 * Statut du workflow fournisseurs pour un AO
 */
export interface SupplierWorkflowStatus {
  aoId: string;
  totalLots: number;
  lotsWithSuppliers: number;
  totalSessions: number;
  activeSessions: number;
  completedSessions: number;
  totalDocuments: number;
  analyzedDocuments: number;
  pendingAnalysis: number;
  sessions: Array<{
    id: string;
    lotId: string;
    supplierId: string;
    status: string;
    documentCount: number;
    analysisCount: number;
  }>;
}

/**
 * Repository pour les Suppliers et entités liées
 * Hérite des méthodes CRUD de BaseRepository
 */
export class SuppliersRepository extends BaseRepository<
  Supplier,
  InsertSupplier,
  Partial<InsertSupplier>,
  SupplierFilters
> {
  protected readonly tableName = 'suppliers';
  protected readonly table = suppliers;
  protected readonly primaryKey = suppliers.id;

  // ========================================
  // SUPPLIERS CORE
  // ========================================

  /**
   * Trouve un fournisseur par son ID
   * 
   * @param id - ID du fournisseur (UUID)
   * @param tx - Transaction optionnelle
   * @returns Le fournisseur ou undefined
   */
  async findById(id: string, tx?: DrizzleTransaction): Promise<Supplier | undefined> {
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
      { supplierId: normalizedId }
    );
  }

  /**
   * Trouve tous les fournisseurs avec filtres optionnels
   * 
   * @param filters - Filtres de recherche
   * @param tx - Transaction optionnelle
   * @returns Liste des fournisseurs correspondants
   */
  async findAll(filters?: SupplierFilters, tx?: DrizzleTransaction): Promise<Supplier[]> {
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        let query = dbToUse.select().from(this.table);

        const conditions = this.buildWhereConditions(filters);
        if (conditions.length > 0) {
          query = query.where(and(...conditions)) as typeof query;
        }

        query = query.orderBy(desc(suppliers.createdAt)) as typeof query;

        return await query;
      },
      'findAll',
      { filters }
    );
  }

  /**
   * Trouve les fournisseurs avec pagination
   * 
   * @param filters - Filtres de recherche
   * @param pagination - Options de pagination
   * @param sort - Options de tri
   * @param tx - Transaction optionnelle
   * @returns Résultat paginé
   */
  async findPaginated(
    filters?: SupplierFilters,
    pagination?: PaginationOptions,
    sort?: SortOptions,
    tx?: DrizzleTransaction
  ): Promise<PaginatedResult<Supplier>> {
    const dbToUse = this.getDb(tx);
    const limit = pagination?.limit || 50;
    const offset = pagination?.offset || 0;

    return this.executeQuery(
      async () => {
        const conditions = this.buildWhereConditions(filters);
        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        let dataQuery = dbToUse.select().from(this.table);
        if (whereClause) {
          dataQuery = dataQuery.where(whereClause) as typeof dataQuery;
        }

        if (sort?.field) {
          const direction = sort.direction === 'asc' ? 'asc' : 'desc';
          const sortField = (suppliers as any)[sort.field];
          if (sortField) {
            dataQuery = dataQuery.orderBy(direction === 'asc' ? sortField : desc(sortField)) as typeof dataQuery;
          }
        } else {
          dataQuery = dataQuery.orderBy(desc(suppliers.createdAt)) as typeof dataQuery;
        }

        dataQuery = dataQuery.limit(limit).offset(offset) as typeof dataQuery;

        let countQuery = dbToUse.select({ count: drizzleCount() }).from(this.table);
        if (whereClause) {
          countQuery = countQuery.where(whereClause) as typeof countQuery;
        }

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
   * Compte le nombre de fournisseurs correspondant aux filtres
   * 
   * @param filters - Filtres de recherche
   * @param tx - Transaction optionnelle
   * @returns Nombre de fournisseurs
   */
  async count(filters?: SupplierFilters, tx?: DrizzleTransaction): Promise<number> {
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
   * Vérifie l'existence d'un fournisseur
   * 
   * @param id - ID du fournisseur
   * @param tx - Transaction optionnelle
   * @returns true si le fournisseur existe
   */
  async exists(id: string, tx?: DrizzleTransaction): Promise<boolean> {
    const normalizedId = this.normalizeId(id);
    const supplier = await this.findById(normalizedId, tx);
    return supplier !== undefined;
  }

  /**
   * Supprime plusieurs fournisseurs selon des critères
   * 
   * @param filters - Filtres pour sélectionner les fournisseurs à supprimer
   * @param tx - Transaction optionnelle
   * @returns Nombre de fournisseurs supprimés
   */
  async deleteMany(filters: SupplierFilters, tx?: DrizzleTransaction): Promise<number> {
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const conditions = this.buildWhereConditions(filters);
        if (conditions.length === 0) {
          throw new AppError('deleteMany requires at least one filter condition for safety', 500);
        }

        const result = await dbToUse
          .delete(this.table)
          .where(and(...conditions));

        return result.rowCount || 0;
      },
      'deleteMany',
      { filters }
    );
  }

  /**
   * Construit les conditions WHERE pour le filtrage des fournisseurs
   */
  protected buildWhereConditions(filters?: SupplierFilters): any[] {
    if (!filters) return [];

    const conditions: any[] = [];

    if (filters.search) {
      conditions.push(
        or(
          ilike(suppliers.name, `%${filters.search}%`),
          ilike(suppliers.email, `%${filters.search}%`),
          ilike(suppliers.contact, `%${filters.search}%`)
        )
      );
    }

    if (filters.status) {
      conditions.push(eq(suppliers.status, filters.status as any));
    }

    if (filters.specialization) {
      conditions.push(ilike(suppliers.specialties as any, `%${filters.specialization}%`));
    }

    return conditions;
  }

  // ========================================
  // SUPPLIER REQUESTS
  // ========================================

  /**
   * Trouve les demandes fournisseurs avec filtres optionnels
   * 
   * @param filters - Filtres de recherche
   * @param tx - Transaction optionnelle
   * @returns Liste des demandes fournisseurs
   */
  async findSupplierRequests(
    filters?: SupplierRequestFilters,
    tx?: DrizzleTransaction
  ): Promise<SupplierRequest[]> {
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        let query = dbToUse.select().from(supplierRequests);

        const conditions: any[] = [];
        if (filters?.offerId) {
          conditions.push(eq(supplierRequests.offerId, filters.offerId));
        }
        if (filters?.projectId) {
          conditions.push(eq(supplierRequests.projectId, filters.projectId));
        }
        if (filters?.status) {
          conditions.push(eq(supplierRequests.status, filters.status));
        }

        if (conditions.length > 0) {
          query = query.where(and(...conditions)) as typeof query;
        }

        query = query.orderBy(desc(supplierRequests.createdAt)) as typeof query;

        return await query;
      },
      'findSupplierRequests',
      { filters }
    );
  }

  /**
   * Crée une nouvelle demande fournisseur
   * 
   * @param request - Données de la demande
   * @param tx - Transaction optionnelle
   * @returns La demande créée
   */
  async createSupplierRequest(
    request: InsertSupplierRequest,
    tx?: DrizzleTransaction
  ): Promise<SupplierRequest> {
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const result = await dbToUse
          .insert(supplierRequests)
          .values(request)
          .returning();

        return result[0];
      },
      'createSupplierRequest',
      { request }
    );
  }

  /**
   * Met à jour une demande fournisseur
   * 
   * @param id - ID de la demande
   * @param data - Données à mettre à jour
   * @param tx - Transaction optionnelle
   * @returns La demande mise à jour
   */
  async updateSupplierRequest(
    id: string,
    data: Partial<InsertSupplierRequest>,
    tx?: DrizzleTransaction
  ): Promise<SupplierRequest> {
    const normalizedId = this.normalizeId(id);
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const result = await dbToUse
          .update(supplierRequests)
          .set({ ...data, updatedAt: new Date() })
          .where(eq(supplierRequests.id, normalizedId))
          .returning();

        if (!result[0]) {
          throw new AppError(`SupplierRequest with ID ${normalizedId} not found`, 500);
        }

        return result[0];
      },
      'updateSupplierRequest',
      { id: normalizedId, data }
    );
  }

  // ========================================
  // SUPPLIER SPECIALIZATIONS
  // ========================================

  /**
   * Trouve les spécialisations des fournisseurs
   * 
   * @param supplierId - ID du fournisseur (optionnel)
   * @param tx - Transaction optionnelle
   * @returns Liste des spécialisations
   */
  async findSpecializations(
    supplierId?: string,
    tx?: DrizzleTransaction
  ): Promise<SupplierSpecializations[]> {
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        let query = dbToUse.select().from(supplierSpecializations);

        if (supplierId) {
          const normalizedId = this.normalizeId(supplierId);
          query = query.where(eq(supplierSpecializations.supplier_id, normalizedId)) as typeof query;
        }

        query = query.orderBy(desc(supplierSpecializations.createdAt)) as typeof query;

        return await query;
      },
      'findSpecializations',
      { supplierId }
    );
  }

  /**
   * Crée une nouvelle spécialisation fournisseur
   * 
   * @param spec - Données de la spécialisation
   * @param tx - Transaction optionnelle
   * @returns La spécialisation créée
   */
  async createSpecialization(
    spec: InsertSupplierSpecializations,
    tx?: DrizzleTransaction
  ): Promise<SupplierSpecializations> {
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const result = await dbToUse
          .insert(supplierSpecializations)
          .values(spec)
          .returning();

        return result[0];
      },
      'createSpecialization',
      { spec }
    );
  }

  /**
   * Met à jour une spécialisation fournisseur
   * 
   * @param id - ID de la spécialisation
   * @param data - Données à mettre à jour
   * @param tx - Transaction optionnelle
   * @returns La spécialisation mise à jour
   */
  async updateSpecialization(
    id: string,
    data: Partial<InsertSupplierSpecializations>,
    tx?: DrizzleTransaction
  ): Promise<SupplierSpecializations> {
    const normalizedId = this.normalizeId(id);
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const result = await dbToUse
          .update(supplierSpecializations)
          .set({ ...data, updatedAt: new Date() })
          .where(eq(supplierSpecializations.id, normalizedId))
          .returning();

        if (!result[0]) {
          throw new AppError(`SupplierSpecialization with ID ${normalizedId} not found`, 500);
        }

        return result[0];
      },
      'updateSpecialization',
      { id: normalizedId, data }
    );
  }

  /**
   * Supprime une spécialisation fournisseur
   * 
   * @param id - ID de la spécialisation
   * @param tx - Transaction optionnelle
   */
  async deleteSpecialization(id: string, tx?: DrizzleTransaction): Promise<void> {
    const normalizedId = this.normalizeId(id);
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const result = await dbToUse
          .delete(supplierSpecializations)
          .where(eq(supplierSpecializations.id, normalizedId));

        if (result.rowCount === 0) {
          throw new AppError(`SupplierSpecialization with ID ${normalizedId} not found`, 500);
        }
      },
      'deleteSpecialization',
      { id: normalizedId }
    );
  }

  // ========================================
  // SUPPLIER QUOTE SESSIONS
  // ========================================

  /**
   * Trouve les sessions de devis avec relations
   * 
   * @param aoId - ID de l'AO (optionnel)
   * @param aoLotId - ID du lot (optionnel)
   * @param tx - Transaction optionnelle
   * @returns Liste des sessions avec relations
   */
  async findQuoteSessions(
    aoId?: string,
    aoLotId?: string,
    tx?: DrizzleTransaction
  ): Promise<SupplierQuoteSession[]> {
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        let query = dbToUse.select().from(supplierQuoteSessions);

        const conditions: any[] = [];
        if (aoId) {
          const normalizedAoId = this.normalizeId(aoId);
          conditions.push(eq(supplierQuoteSessions.aoId, normalizedAoId));
        }
        if (aoLotId) {
          const normalizedLotId = this.normalizeId(aoLotId);
          conditions.push(eq(supplierQuoteSessions.aoLotId, normalizedLotId));
        }

        if (conditions.length > 0) {
          query = query.where(and(...conditions)) as typeof query;
        }

        query = query.orderBy(desc(supplierQuoteSessions.createdAt)) as typeof query;

        return await query;
      },
      'findQuoteSessions',
      { aoId, aoLotId }
    );
  }

  /**
   * Trouve une session de devis par son ID
   * 
   * @param id - ID de la session
   * @param tx - Transaction optionnelle
   * @returns La session avec relations ou undefined
   */
  async findQuoteSessionById(
    id: string,
    tx?: DrizzleTransaction
  ): Promise<SupplierQuoteSession | undefined> {
    const normalizedId = this.normalizeId(id);
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const result = await dbToUse
          .select()
          .from(supplierQuoteSessions)
          .where(eq(supplierQuoteSessions.id, normalizedId))
          .limit(1);

        return result[0];
      },
      'findQuoteSessionById',
      { sessionId: normalizedId }
    );
  }

  /**
   * Trouve une session de devis par son token d'accès
   * 
   * @param token - Token d'accès
   * @param tx - Transaction optionnelle
   * @returns La session correspondante ou undefined
   */
  async findQuoteSessionByToken(
    token: string,
    tx?: DrizzleTransaction
  ): Promise<SupplierQuoteSession | undefined> {
    if (!token || token.trim() === '') {
      throw new AppError('Access token cannot be empty', 500);
    }

    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const result = await dbToUse
          .select()
          .from(supplierQuoteSessions)
          .where(eq(supplierQuoteSessions.accessToken, token))
          .limit(1);

        return result[0];
      },
      'findQuoteSessionByToken',
      { token }
    );
  }

  /**
   * Crée une nouvelle session de devis
   * 
   * @param session - Données de la session
   * @param tx - Transaction optionnelle
   * @returns La session créée
   */
  async createQuoteSession(
    session: InsertSupplierQuoteSession,
    tx?: DrizzleTransaction
  ): Promise<SupplierQuoteSession> {
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const result = await dbToUse
          .insert(supplierQuoteSessions)
          .values(session)
          .returning();

        return result[0];
      },
      'createQuoteSession',
      { session }
    );
  }

  /**
   * Met à jour une session de devis
   * 
   * @param id - ID de la session
   * @param data - Données à mettre à jour
   * @param tx - Transaction optionnelle
   * @returns La session mise à jour
   */
  async updateQuoteSession(
    id: string,
    data: Partial<InsertSupplierQuoteSession>,
    tx?: DrizzleTransaction
  ): Promise<SupplierQuoteSession> {
    const normalizedId = this.normalizeId(id);
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const result = await dbToUse
          .update(supplierQuoteSessions)
          .set({ ...data, updatedAt: new Date() })
          .where(eq(supplierQuoteSessions.id, normalizedId))
          .returning();

        if (!result[0]) {
          throw new AppError(`SupplierQuoteSession with ID ${normalizedId} not found`, 500);
        }

        return result[0];
      },
      'updateQuoteSession',
      { id: normalizedId, data }
    );
  }

  /**
   * Supprime une session de devis
   * 
   * @param id - ID de la session
   * @param tx - Transaction optionnelle
   */
  async deleteQuoteSession(id: string, tx?: DrizzleTransaction): Promise<void> {
    const normalizedId = this.normalizeId(id);
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const result = await dbToUse
          .delete(supplierQuoteSessions)
          .where(eq(supplierQuoteSessions.id, normalizedId));

        if (result.rowCount === 0) {
          throw new AppError(`SupplierQuoteSession with ID ${normalizedId} not found`, 500);
        }
      },
      'deleteQuoteSession',
      { id: normalizedId }
    );
  }

  // ========================================
  // SUPPLIERS BY LOT
  // ========================================

  /**
   * Trouve les fournisseurs sélectionnés pour un lot
   * 
   * @param aoLotId - ID du lot AO
   * @param tx - Transaction optionnelle
   * @returns Liste des fournisseurs sélectionnés
   */
  async findSuppliersByLot(
    aoLotId: string,
    tx?: DrizzleTransaction
  ): Promise<AoLotSupplier[]> {
    const normalizedLotId = this.normalizeId(aoLotId);
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const result = await dbToUse
          .select()
          .from(aoLotSuppliers)
          .where(eq(aoLotSuppliers.aoLotId, normalizedLotId))
          .orderBy(aoLotSuppliers.priority);

        return result;
      },
      'findSuppliersByLot',
      { aoLotId: normalizedLotId }
    );
  }

  // ========================================
  // SUPPLIER DOCUMENTS
  // ========================================

  /**
   * Trouve les documents fournisseurs avec filtres
   * 
   * @param sessionId - ID de session (optionnel)
   * @param supplierId - ID du fournisseur (optionnel)
   * @param tx - Transaction optionnelle
   * @returns Liste des documents
   */
  async findDocuments(
    sessionId?: string,
    supplierId?: string,
    tx?: DrizzleTransaction
  ): Promise<SupplierDocument[]> {
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        let query = dbToUse.select().from(supplierDocuments);

        const conditions: any[] = [];
        if (sessionId) {
          const normalizedSessionId = this.normalizeId(sessionId);
          conditions.push(eq(supplierDocuments.sessionId, normalizedSessionId));
        }
        if (supplierId) {
          const normalizedSupplierId = this.normalizeId(supplierId);
          conditions.push(eq(supplierDocuments.supplierId, normalizedSupplierId));
        }

        if (conditions.length > 0) {
          query = query.where(and(...conditions)) as typeof query;
        }

        query = query.orderBy(desc(supplierDocuments.uploadedAt)) as typeof query;

        return await query;
      },
      'findDocuments',
      { sessionId, supplierId }
    );
  }

  /**
   * Trouve un document par son ID
   * 
   * @param id - ID du document
   * @param tx - Transaction optionnelle
   * @returns Le document ou undefined
   */
  async findDocumentById(
    id: string,
    tx?: DrizzleTransaction
  ): Promise<SupplierDocument | undefined> {
    const normalizedId = this.normalizeId(id);
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const result = await dbToUse
          .select()
          .from(supplierDocuments)
          .where(eq(supplierDocuments.id, normalizedId))
          .limit(1);

        return result[0];
      },
      'findDocumentById',
      { documentId: normalizedId }
    );
  }

  /**
   * Crée un nouveau document fournisseur
   * 
   * @param document - Données du document
   * @param tx - Transaction optionnelle
   * @returns Le document créé
   */
  async createDocument(
    document: InsertSupplierDocument,
    tx?: DrizzleTransaction
  ): Promise<SupplierDocument> {
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const result = await dbToUse
          .insert(supplierDocuments)
          .values(document)
          .returning();

        return result[0];
      },
      'createDocument',
      { document }
    );
  }

  /**
   * Met à jour un document fournisseur
   * 
   * @param id - ID du document
   * @param data - Données à mettre à jour
   * @param tx - Transaction optionnelle
   * @returns Le document mis à jour
   */
  async updateDocument(
    id: string,
    data: Partial<InsertSupplierDocument>,
    tx?: DrizzleTransaction
  ): Promise<SupplierDocument> {
    const normalizedId = this.normalizeId(id);
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const result = await dbToUse
          .update(supplierDocuments)
          .set({ ...data, updatedAt: new Date() })
          .where(eq(supplierDocuments.id, normalizedId))
          .returning();

        if (!result[0]) {
          throw new AppError(`SupplierDocument with ID ${normalizedId} not found`, 500);
        }

        return result[0];
      },
      'updateDocument',
      { id: normalizedId, data }
    );
  }

  /**
   * Supprime un document fournisseur
   * 
   * @param id - ID du document
   * @param tx - Transaction optionnelle
   */
  async deleteDocument(id: string, tx?: DrizzleTransaction): Promise<void> {
    const normalizedId = this.normalizeId(id);
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const result = await dbToUse
          .delete(supplierDocuments)
          .where(eq(supplierDocuments.id, normalizedId));

        if (result.rowCount === 0) {
          throw new AppError(`SupplierDocument with ID ${normalizedId} not found`, 500);
        }
      },
      'deleteDocument',
      { id: normalizedId }
    );
  }

  // ========================================
  // SUPPLIER QUOTE ANALYSES
  // ========================================

  /**
   * Trouve les analyses de devis avec filtres
   * 
   * @param documentId - ID du document (optionnel)
   * @param sessionId - ID de session (optionnel)
   * @param tx - Transaction optionnelle
   * @returns Liste des analyses
   */
  async findQuoteAnalyses(
    documentId?: string,
    sessionId?: string,
    tx?: DrizzleTransaction
  ): Promise<SupplierQuoteAnalysis[]> {
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        let query = dbToUse.select().from(supplierQuoteAnalysis);

        const conditions: any[] = [];
        if (documentId) {
          const normalizedDocId = this.normalizeId(documentId);
          conditions.push(eq(supplierQuoteAnalysis.documentId, normalizedDocId));
        }
        if (sessionId) {
          const normalizedSessionId = this.normalizeId(sessionId);
          conditions.push(eq(supplierQuoteAnalysis.sessionId, normalizedSessionId));
        }

        if (conditions.length > 0) {
          query = query.where(and(...conditions)) as typeof query;
        }

        query = query.orderBy(desc(supplierQuoteAnalysis.createdAt)) as typeof query;

        return await query;
      },
      'findQuoteAnalyses',
      { documentId, sessionId }
    );
  }

  /**
   * Trouve une analyse de devis par son ID
   * 
   * @param id - ID de l'analyse
   * @param tx - Transaction optionnelle
   * @returns L'analyse ou undefined
   */
  async findQuoteAnalysisById(
    id: string,
    tx?: DrizzleTransaction
  ): Promise<SupplierQuoteAnalysis | undefined> {
    const normalizedId = this.normalizeId(id);
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const result = await dbToUse
          .select()
          .from(supplierQuoteAnalysis)
          .where(eq(supplierQuoteAnalysis.id, normalizedId))
          .limit(1);

        return result[0];
      },
      'findQuoteAnalysisById',
      { analysisId: normalizedId }
    );
  }

  /**
   * Crée une nouvelle analyse de devis
   * 
   * @param analysis - Données de l'analyse
   * @param tx - Transaction optionnelle
   * @returns L'analyse créée
   */
  async createQuoteAnalysis(
    analysis: InsertSupplierQuoteAnalysis,
    tx?: DrizzleTransaction
  ): Promise<SupplierQuoteAnalysis> {
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const result = await dbToUse
          .insert(supplierQuoteAnalysis)
          .values(analysis)
          .returning();

        return result[0];
      },
      'createQuoteAnalysis',
      { analysis }
    );
  }

  /**
   * Met à jour une analyse de devis
   * 
   * @param id - ID de l'analyse
   * @param data - Données à mettre à jour
   * @param tx - Transaction optionnelle
   * @returns L'analyse mise à jour
   */
  async updateQuoteAnalysis(
    id: string,
    data: Partial<InsertSupplierQuoteAnalysis>,
    tx?: DrizzleTransaction
  ): Promise<SupplierQuoteAnalysis> {
    const normalizedId = this.normalizeId(id);
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const result = await dbToUse
          .update(supplierQuoteAnalysis)
          .set({ ...data, updatedAt: new Date() })
          .where(eq(supplierQuoteAnalysis.id, normalizedId))
          .returning();

        if (!result[0]) {
          throw new AppError(`SupplierQuoteAnalysis with ID ${normalizedId} not found`, 500);
        }

        return result[0];
      },
      'updateQuoteAnalysis',
      { id: normalizedId, data }
    );
  }

  /**
   * Supprime une analyse de devis
   * 
   * @param id - ID de l'analyse
   * @param tx - Transaction optionnelle
   */
  async deleteQuoteAnalysis(id: string, tx?: DrizzleTransaction): Promise<void> {
    const normalizedId = this.normalizeId(id);
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const result = await dbToUse
          .delete(supplierQuoteAnalysis)
          .where(eq(supplierQuoteAnalysis.id, normalizedId));

        if (result.rowCount === 0) {
          throw new AppError(`SupplierQuoteAnalysis with ID ${normalizedId} not found`, 500);
        }
      },
      'deleteQuoteAnalysis',
      { id: normalizedId }
    );
  }

  // ========================================
  // SUPPLIER WORKFLOW STATUS
  // ========================================

  /**
   * Récupère le statut complet du workflow fournisseurs pour un AO
   * 
   * @param aoId - ID de l'AO
   * @param tx - Transaction optionnelle
   * @returns Statut complet du workflow
   */
  async getWorkflowStatus(
    aoId: string,
    tx?: DrizzleTransaction
  ): Promise<SupplierWorkflowStatus> {
    const normalizedAoId = this.normalizeId(aoId);
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        // Récupérer tous les lots de l'AO
        const lots = await dbToUse
          .select()
          .from(aoLots)
          .where(eq(aoLots.aoId, normalizedAoId));

        const totalLots = lots.length;

        // Récupérer les lots avec fournisseurs assignés
        const lotsWithSuppliers = await dbToUse
          .select({ lotId: aoLotSuppliers.aoLotId })
          .from(aoLotSuppliers)
          .where(eq(aoLotSuppliers.aoId, normalizedAoId))
          .groupBy(aoLotSuppliers.aoLotId);

        // Récupérer toutes les sessions de devis
        const sessions = await dbToUse
          .select()
          .from(supplierQuoteSessions)
          .where(eq(supplierQuoteSessions.aoId, normalizedAoId));

        const totalSessions = sessions.length;
        const activeSessions = sessions.filter((s: SupplierQuoteSession) => s.status === 'active').length;
        const completedSessions = sessions.filter((s: SupplierQuoteSession) => s.status === 'completed').length;

        // Récupérer tous les documents
        const documents = await dbToUse
          .select()
          .from(supplierDocuments)
          .innerJoin(
            supplierQuoteSessions,
            eq(supplierDocuments.sessionId, supplierQuoteSessions.id)
          )
          .where(eq(supplierQuoteSessions.aoId, normalizedAoId));

        const totalDocuments = documents.length;

        // Récupérer toutes les analyses
        const analyses = await dbToUse
          .select()
          .from(supplierQuoteAnalysis)
          .innerJoin(
            supplierQuoteSessions,
            eq(supplierQuoteAnalysis.sessionId, supplierQuoteSessions.id)
          )
          .where(eq(supplierQuoteSessions.aoId, normalizedAoId));

        const analyzedDocuments = analyses.filter((a: any) => a.supplier_quote_analysis.status === 'completed').length;
        const pendingAnalysis = analyses.filter((a: any) => a.supplier_quote_analysis.status === 'pending').length;

        // Construire les détails des sessions
        const sessionDetails = await Promise.all(
          sessions.map(async (session: SupplierQuoteSession) => {
            const sessionDocs = await dbToUse
              .select({ count: drizzleCount() })
              .from(supplierDocuments)
              .where(eq(supplierDocuments.sessionId, session.id));

            const sessionAnalyses = await dbToUse
              .select({ count: drizzleCount() })
              .from(supplierQuoteAnalysis)
              .where(eq(supplierQuoteAnalysis.sessionId, session.id));

            return {
              id: session.id,
              lotId: session.aoLotId,
              supplierId: session.supplierId,
              status: session.status as string,
              documentCount: sessionDocs[0]?.count || 0,
              analysisCount: sessionAnalyses[0]?.count || 0
            };
          })
        );

        return {
          aoId: normalizedAoId,
          totalLots,
          lotsWithSuppliers: lotsWithSuppliers.length,
          totalSessions,
          activeSessions,
          completedSessions,
          totalDocuments,
          analyzedDocuments,
          pendingAnalysis,
          sessions: sessionDetails
        };
      },
      'getWorkflowStatus',
      { aoId: normalizedAoId }
    );
  }
}
