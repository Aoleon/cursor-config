/**
 * Repository pour la gestion du module Documents
 * 
 * Responsabilités :
 * - Gestion des sessions de devis fournisseurs (SupplierQuoteSession)
 * - Gestion des documents fournisseurs (SupplierDocument)
 * - Gestion des analyses OCR de devis (SupplierQuoteAnalysis)
 * - Gestion des bons de commande (PurchaseOrder)
 * - Gestion des devis clients (ClientQuote)
 * 
 * Suit le pattern BaseRepository établi avec support transactionnel complet
 */

import { BaseRepository } from '../base/BaseRepository';
import { AppError, NotFoundError, ValidationError, AuthorizationError } from './utils/error-handler';
import { logger } from './utils/logger';
import { 
  supplierDocuments,
  supplierQuoteSessions,
  supplierQuoteAnalysis,
  purchaseOrders,
  clientQuotes,
  type SupplierDocument, 
  type InsertSupplierDocument,
  type SupplierQuoteSession,
  type InsertSupplierQuoteSession,
  type SupplierQuoteAnalysis,
  type InsertSupplierQuoteAnalysis,
  type PurchaseOrder,
  type InsertPurchaseOrder,
  type ClientQuote,
  type InsertClientQuote
} from '@shared/schema';
import type { DrizzleTransaction, PaginationOptions, PaginatedResult, SearchFilters, SortOptions } from '../types';
import { eq, desc, and, ilike, SQL } from 'drizzle-orm';
import { safeInsert, safeUpdate, safeDelete } from '../../utils/safe-query';

/**
 * Repository pour le module Documents
 * Gère 5 entités principales : SupplierDocument, SupplierQuoteSession, SupplierQuoteAnalysis, PurchaseOrder, ClientQuote
 * 
 * Note : Ce repository ne suit pas exactement le pattern BaseRepository standard car il gère
 * plusieurs entités. Les méthodes CRUD héritées sont utilisées pour SupplierDocument.
 */
export class DocumentsRepository extends BaseRepository<
  SupplierDocument,
  InsertSupplierDocument,
  Partial<InsertSupplierDocument>
> {
  protected readonly tableName = 'supplier_documents';
  protected readonly table = supplierDocuments;
  protected readonly primaryKey = supplierDocuments.id;

  /**
   * Constructeur
   * 
   * @param db - Instance Drizzle de la base de données
   * @param eventBus - Event bus optionnel pour notifications
   */
  constructor(db: unknown, eventBus?: unknown) {
    super('DocumentsRepository', db, eventBus);
  }

  // ========================================
  // IMPLÉMENTATION DES MÉTHODES ABSTRAITES IRepository
  // ========================================

  /**
   * Récupère un document fournisseur par son ID (implémentation IRepository)
   */
  async findById(id: string, tx?: DrizzleTransaction): Promise<SupplierDocument | undefined> {
    return this.getSupplierDocument(id, tx);
  }

  /**
   * Récupère tous les documents fournisseurs (implémentation IRepository)
   */
  async findAll(filters?: SearchFilters, tx?: DrizzleTransaction): Promise<SupplierDocument[]> {
    return this.getSupplierDocuments(undefined, undefined, tx);
  }

  /**
   * Récupère les documents fournisseurs avec pagination (implémentation IRepository)
   */
  async findPaginated(
    filters?: SearchFilters,
    pagination?: PaginationOptions,
    sort?: SortOptions,
    tx?: DrizzleTransaction
  ): Promise<PaginatedResult<SupplierDocument>> {
    const documents = await this.getSupplierDocuments(undefined, undefined, tx);
    const total = documents.length;
    
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 50;
    const offset = (page - 1) * limit;
    
    const paginatedDocs = documents.slice(offset, offset + limit);
    
    return this.createPaginatedResult(paginatedDocs, total, pagination);
  }

  /**
   * Supprime plusieurs documents fournisseurs (implémentation IRepository)
   */
  async deleteMany(ids: string[], tx?: DrizzleTransaction): Promise<number> {
    let deleted = 0;
    for (const id of ids) {
      await this.deleteSupplierDocument(id, tx);
      deleted++;
    }
    return deleted;
  }

  /**
   * Vérifie l'existence d'un document fournisseur (implémentation IRepository)
   */
  async exists(id: string, tx?: DrizzleTransaction): Promise<boolean> {
    const doc = await this.getSupplierDocument(id, tx);
    return doc !== undefined;
  }

  // ========================================
  // SUPPLIER DOCUMENTS - 5 MÉTHODES
  // ========================================

  /**
   * Récupère tous les documents fournisseurs avec filtres optionnels
   * Résultats triés par uploadedAt (desc)
   * 
   * @param sessionId - ID de session optionnel (UUID)
   * @param supplierId - ID de fournisseur optionnel (UUID)
   * @param tx - Transaction optionnelle
   * @returns Liste des documents fournisseurs triés par date d'upload
   * 
   * @example
   * ```typescript
   * // Tous les documents d'une session
   * const docs = await repo.getSupplierDocuments('550e8400-...');
   * 
   * // Tous les documents d'un fournisseur
   * const docs = await repo.getSupplierDocuments(undefined, '550e8400-...');
   * 
   * // Tous les documents d'une session ET d'un fournisseur
   * const docs = await repo.getSupplierDocuments('550e8400-...', '660e8400-...');
   * ```
   */
  async getSupplierDocuments(
    sessionId?: string,
    supplierId?: string,
    tx?: DrizzleTransaction
  ): Promise<SupplierDocument[]> {
    const dbToUse = this.getDb(tx);
    const conditions: SQL[] = [];

    if (sessionId) {
      const normalizedSessionId = this.normalizeId(sessionId);
      conditions.push(eq(supplierDocuments.sessionId, normalizedSessionId));
    }

    if (supplierId) {
      const normalizedSupplierId = this.normalizeId(supplierId);
      conditions.push(eq(supplierDocuments.supplierId, normalizedSupplierId));
    }

    return this.executeQuery(
      async () => {
        let query = dbToUse.select().from(supplierDocuments);

        if (conditions.length > 0) {
          query = query.where(and(...conditions));
        }

        return await query.orderBy(desc(supplierDocuments.uploadedAt));
      },
      'getSupplierDocuments',
      { sessionId, supplierId }
    );
  }

  /**
   * Récupère un document fournisseur par son ID
   * 
   * @param id - ID du document (UUID)
   * @param tx - Transaction optionnelle
   * @returns Le document trouvé ou undefined si non trouvé
   * 
   * @example
   * ```typescript
   * const doc = await repo.getSupplierDocument('550e8400-...');
   * if (doc) {
   *   logger.info(`Document: ${doc.originalName}, uploadé le ${doc.uploadedAt}`);
   * }
   * ```
   */
  async getSupplierDocument(
    id: string,
    tx?: DrizzleTransaction
  ): Promise<SupplierDocument | undefined> {
    const normalizedId = this.normalizeId(id);
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const [document] = await dbToUse
          .select()
          .from(supplierDocuments)
          .where(eq(supplierDocuments.id, normalizedId))
          .limit(1);

        return document;
      },
      'getSupplierDocument',
      { id: normalizedId }
    );
  }

  /**
   * Crée un nouveau document fournisseur
   * 
   * @param document - Données du document à créer
   * @param tx - Transaction optionnelle
   * @returns Le document créé
   * 
   * @example
   * ```typescript
   * const newDoc = await repo.createSupplierDocument({
   *   sessionId: '550e8400-...',
   *   supplierId: '660e8400-...',
   *   aoLotId: '770e8400-...',
   *   filename: 'devis_2024.pdf',
   *   originalName: 'Devis menuiserie.pdf',
   *   mimeType: 'application/pdf',
   *   fileSize: 1024000,
   *   documentType: 'devis',
   *   objectStoragePath: '/uploads/devis_2024.pdf'
   * });
   * ```
   */
  async createSupplierDocument(
    document: InsertSupplierDocument,
    tx?: DrizzleTransaction
  ): Promise<SupplierDocument> {
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const result = await safeInsert<SupplierDocument[]>(
          'supplier_documents',
          () => dbToUse.insert(supplierDocuments).values(document).returning(),
          { service: this.repositoryName, operation: 'createSupplierDocument' }
        );

        const newDocument = result[0];
        if (!newDocument) {
          throw new AppError('Failed to create supplier document', 500);
        }

        this.emitEvent('supplier_document:created', { 
          id: newDocument.id, 
          sessionId: newDocument.sessionId,
          supplierId: newDocument.supplierId
        });

        return newDocument;
      },
      'createSupplierDocument',
      { sessionId: document.sessionId, supplierId: document.supplierId }
    );
  }

  /**
   * Met à jour un document fournisseur existant
   * 
   * @param id - ID du document (UUID)
   * @param document - Données partielles à mettre à jour
   * @param tx - Transaction optionnelle
   * @returns Le document mis à jour
   * @throws DatabaseError si le document n'existe pas
   * 
   * @example
   * ```typescript
   * const updated = await repo.updateSupplierDocument('550e8400-...', {
   *   status: 'validated',
   *   validatedAt: new Date(),
   *   validatedBy: 'user-123'
   * });
   * ```
   */
  async updateSupplierDocument(
    id: string,
    document: Partial<InsertSupplierDocument>,
    tx?: DrizzleTransaction
  ): Promise<SupplierDocument> {
    const normalizedId = this.normalizeId(id);
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const result = await safeUpdate<SupplierDocument[]>(
          'supplier_documents',
          () => dbToUse
            .update(supplierDocuments)
            .set({ ...document, updatedAt: new Date() })
            .where(eq(supplierDocuments.id, normalizedId))
            .returning(),
          1,
          { service: this.repositoryName, operation: 'updateSupplierDocument' }
        );

        const updatedDocument = result[0];
        if (!updatedDocument) {
          this.handleNotFound(normalizedId, 'updateSupplierDocument');
        }

        this.emitEvent('supplier_document:updated', { 
          id: updatedDocument.id,
          sessionId: updatedDocument.sessionId
        });

        return updatedDocument;
      },
      'updateSupplierDocument',
      { id: normalizedId }
    );
  }

  /**
   * Supprime un document fournisseur
   * 
   * @param id - ID du document (UUID)
   * @param tx - Transaction optionnelle
   * @throws DatabaseError si le document n'existe pas
   * 
   * @example
   * ```typescript
   * await repo.deleteSupplierDocument('550e8400-...');
   * ```
   */
  async deleteSupplierDocument(
    id: string,
    tx?: DrizzleTransaction
  ): Promise<void> {
    const normalizedId = this.normalizeId(id);
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        await safeDelete(
          'supplier_documents',
          () => dbToUse.delete(supplierDocuments).where(eq(supplierDocuments.id, normalizedId)),
          1,
          { service: this.repositoryName, operation: 'deleteSupplierDocument' }
        );

        this.emitEvent('supplier_document:deleted', { id: normalizedId });
      },
      'deleteSupplierDocument',
      { id: normalizedId }
    );
  }

  // ========================================
  // SUPPLIER QUOTE SESSIONS - 5 MÉTHODES
  // ========================================

  /**
   * Récupère toutes les sessions de devis fournisseurs avec filtres optionnels
   * Résultats triés par createdAt (desc)
   * 
   * @param aoId - ID de l'AO optionnel (UUID)
   * @param aoLotId - ID du lot optionnel (UUID)
   * @param tx - Transaction optionnelle
   * @returns Liste des sessions triées par date de création
   * 
   * @example
   * ```typescript
   * // Toutes les sessions d'un AO
   * const sessions = await repo.getSupplierQuoteSessions('550e8400-...');
   * 
   * // Toutes les sessions d'un lot
   * const sessions = await repo.getSupplierQuoteSessions(undefined, '660e8400-...');
   * 
   * // Toutes les sessions d'un AO ET d'un lot
   * const sessions = await repo.getSupplierQuoteSessions('550e8400-...', '660e8400-...');
   * ```
   */
  async getSupplierQuoteSessions(
    aoId?: string,
    aoLotId?: string,
    tx?: DrizzleTransaction
  ): Promise<SupplierQuoteSession[]> {
    const dbToUse = this.getDb(tx);
    const conditions: SQL[] = [];

    if (aoId) {
      const normalizedAoId = this.normalizeId(aoId);
      conditions.push(eq(supplierQuoteSessions.aoId, normalizedAoId));
    }

    if (aoLotId) {
      const normalizedAoLotId = this.normalizeId(aoLotId);
      conditions.push(eq(supplierQuoteSessions.aoLotId, normalizedAoLotId));
    }

    return this.executeQuery(
      async () => {
        let query = dbToUse.select().from(supplierQuoteSessions);

        if (conditions.length > 0) {
          query = query.where(and(...conditions));
        }

        return await query.orderBy(desc(supplierQuoteSessions.createdAt));
      },
      'getSupplierQuoteSessions',
      { aoId, aoLotId }
    );
  }

  /**
   * Récupère une session de devis fournisseur par son ID
   * 
   * @param id - ID de la session (UUID)
   * @param tx - Transaction optionnelle
   * @returns La session trouvée ou undefined si non trouvée
   * 
   * @example
   * ```typescript
   * const session = await repo.getSupplierQuoteSession('550e8400-...');
   * if (session) {
   *   logger.info(`Session: ${session.accessToken}, expire le ${session.tokenExpiresAt}`);
   * }
   * ```
   */
  async getSupplierQuoteSession(
    id: string,
    tx?: DrizzleTransaction
  ): Promise<SupplierQuoteSession | undefined> {
    const normalizedId = this.normalizeId(id);
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const [session] = await dbToUse
          .select()
          .from(supplierQuoteSessions)
          .where(eq(supplierQuoteSessions.id, normalizedId))
          .limit(1);

        return session;
      },
      'getSupplierQuoteSession',
      { id: normalizedId }
    );
  }

  /**
   * Crée une nouvelle session de devis fournisseur
   * 
   * @param session - Données de la session à créer
   * @param tx - Transaction optionnelle
   * @returns La session créée
   * 
   * @example
   * ```typescript
   * const newSession = await repo.createSupplierQuoteSession({
   *   aoId: '550e8400-...',
   *   aoLotId: '660e8400-...',
   *   supplierId: '770e8400-...',
   *   accessToken: 'abc123xyz789',
   *   tokenExpiresAt: new Date('2024-12-31'),
   *   status: 'active'
   * });
   * ```
   */
  async createSupplierQuoteSession(
    session: InsertSupplierQuoteSession,
    tx?: DrizzleTransaction
  ): Promise<SupplierQuoteSession> {
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const result = await safeInsert<SupplierQuoteSession[]>(
          'supplier_quote_sessions',
          () => dbToUse.insert(supplierQuoteSessions).values(session).returning(),
          { service: this.repositoryName, operation: 'createSupplierQuoteSession' }
        );

        const newSession = result[0];
        if (!newSession) {
          throw new AppError('Failed to create supplier quote session', 500);
        }

        this.emitEvent('supplier_quote_session:created', { 
          id: newSession.id, 
          aoId: newSession.aoId,
          supplierId: newSession.supplierId
        });

        return newSession;
      },
      'createSupplierQuoteSession',
      { aoId: session.aoId, supplierId: session.supplierId }
    );
  }

  /**
   * Met à jour une session de devis fournisseur existante
   * 
   * @param id - ID de la session (UUID)
   * @param session - Données partielles à mettre à jour
   * @param tx - Transaction optionnelle
   * @returns La session mise à jour
   * @throws DatabaseError si la session n'existe pas
   * 
   * @example
   * ```typescript
   * const updated = await repo.updateSupplierQuoteSession('550e8400-...', {
   *   status: 'submitted',
   *   submittedAt: new Date(),
   *   lastAccessAt: new Date()
   * });
   * ```
   */
  async updateSupplierQuoteSession(
    id: string,
    session: Partial<InsertSupplierQuoteSession>,
    tx?: DrizzleTransaction
  ): Promise<SupplierQuoteSession> {
    const normalizedId = this.normalizeId(id);
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const result = await safeUpdate<SupplierQuoteSession[]>(
          'supplier_quote_sessions',
          () => dbToUse
            .update(supplierQuoteSessions)
            .set({ ...session, updatedAt: new Date() })
            .where(eq(supplierQuoteSessions.id, normalizedId))
            .returning(),
          1,
          { service: this.repositoryName, operation: 'updateSupplierQuoteSession' }
        );

        const updatedSession = result[0];
        if (!updatedSession) {
          this.handleNotFound(normalizedId, 'updateSupplierQuoteSession');
        }

        this.emitEvent('supplier_quote_session:updated', { 
          id: updatedSession.id,
          status: updatedSession.status
        });

        return updatedSession;
      },
      'updateSupplierQuoteSession',
      { id: normalizedId }
    );
  }

  /**
   * Supprime une session de devis fournisseur
   * 
   * @param id - ID de la session (UUID)
   * @param tx - Transaction optionnelle
   * @throws DatabaseError si la session n'existe pas
   * 
   * @example
   * ```typescript
   * await repo.deleteSupplierQuoteSession('550e8400-...');
   * ```
   */
  async deleteSupplierQuoteSession(
    id: string,
    tx?: DrizzleTransaction
  ): Promise<void> {
    const normalizedId = this.normalizeId(id);
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        await safeDelete(
          'supplier_quote_sessions',
          () => dbToUse.delete(supplierQuoteSessions).where(eq(supplierQuoteSessions.id, normalizedId)),
          1,
          { service: this.repositoryName, operation: 'deleteSupplierQuoteSession' }
        );

        this.emitEvent('supplier_quote_session:deleted', { id: normalizedId });
      },
      'deleteSupplierQuoteSession',
      { id: normalizedId }
    );
  }

  // ========================================
  // SUPPLIER QUOTE ANALYSIS - 3 MÉTHODES
  // ========================================

  /**
   * Récupère une analyse OCR de devis fournisseur par son ID
   * 
   * @param id - ID de l'analyse (UUID)
   * @param tx - Transaction optionnelle
   * @returns L'analyse trouvée ou undefined si non trouvée
   * 
   * @example
   * ```typescript
   * const analysis = await repo.getSupplierQuoteAnalysis('550e8400-...');
   * if (analysis) {
   *   logger.info(`Analyse: confidence ${analysis.confidence}%, montant HT ${analysis.totalAmountHT}`);
   * }
   * ```
   */
  async getSupplierQuoteAnalysis(
    id: string,
    tx?: DrizzleTransaction
  ): Promise<SupplierQuoteAnalysis | undefined> {
    const normalizedId = this.normalizeId(id);
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const [analysis] = await dbToUse
          .select()
          .from(supplierQuoteAnalysis)
          .where(eq(supplierQuoteAnalysis.id, normalizedId))
          .limit(1);

        return analysis;
      },
      'getSupplierQuoteAnalysis',
      { id: normalizedId }
    );
  }

  /**
   * Crée une nouvelle analyse OCR de devis fournisseur
   * 
   * @param analysis - Données de l'analyse à créer
   * @param tx - Transaction optionnelle
   * @returns L'analyse créée
   * 
   * @example
   * ```typescript
   * const newAnalysis = await repo.createSupplierQuoteAnalysis({
   *   documentId: '550e8400-...',
   *   sessionId: '660e8400-...',
   *   aoLotId: '770e8400-...',
   *   status: 'completed',
   *   confidence: '92.50',
   *   totalAmountHT: '12500.00',
   *   totalAmountTTC: '15000.00',
   *   vatRate: '20.00',
   *   analysisEngine: 'tesseract'
   * });
   * ```
   */
  async createSupplierQuoteAnalysis(
    analysis: InsertSupplierQuoteAnalysis,
    tx?: DrizzleTransaction
  ): Promise<SupplierQuoteAnalysis> {
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const result = await safeInsert<SupplierQuoteAnalysis[]>(
          'supplier_quote_analysis',
          () => dbToUse.insert(supplierQuoteAnalysis).values(analysis).returning(),
          { service: this.repositoryName, operation: 'createSupplierQuoteAnalysis' }
        );

        const newAnalysis = result[0];
        if (!newAnalysis) {
          throw new AppError('Failed to create supplier quote analysis', 500);
        }

        this.emitEvent('supplier_quote_analysis:created', { 
          id: newAnalysis.id, 
          documentId: newAnalysis.documentId,
          sessionId: newAnalysis.sessionId
        });

        return newAnalysis;
      },
      'createSupplierQuoteAnalysis',
      { documentId: analysis.documentId, sessionId: analysis.sessionId }
    );
  }

  /**
   * Met à jour une analyse OCR de devis fournisseur existante
   * 
   * @param id - ID de l'analyse (UUID)
   * @param analysis - Données partielles à mettre à jour
   * @param tx - Transaction optionnelle
   * @returns L'analyse mise à jour
   * @throws DatabaseError si l'analyse n'existe pas
   * 
   * @example
   * ```typescript
   * const updated = await repo.updateSupplierQuoteAnalysis('550e8400-...', {
   *   status: 'reviewed',
   *   reviewedAt: new Date(),
   *   reviewedBy: 'user-123',
   *   manualCorrections: { totalAmountHT: '12600.00' }
   * });
   * ```
   */
  async updateSupplierQuoteAnalysis(
    id: string,
    analysis: Partial<InsertSupplierQuoteAnalysis>,
    tx?: DrizzleTransaction
  ): Promise<SupplierQuoteAnalysis> {
    const normalizedId = this.normalizeId(id);
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const result = await safeUpdate<SupplierQuoteAnalysis[]>(
          'supplier_quote_analysis',
          () => dbToUse
            .update(supplierQuoteAnalysis)
            .set({ ...analysis, updatedAt: new Date() })
            .where(eq(supplierQuoteAnalysis.id, normalizedId))
            .returning(),
          1,
          { service: this.repositoryName, operation: 'updateSupplierQuoteAnalysis' }
        );

        const updatedAnalysis = result[0];
        if (!updatedAnalysis) {
          this.handleNotFound(normalizedId, 'updateSupplierQuoteAnalysis');
        }

        this.emitEvent('supplier_quote_analysis:updated', { 
          id: updatedAnalysis.id,
          status: updatedAnalysis.status
        });

        return updatedAnalysis;
      },
      'updateSupplierQuoteAnalysis',
      { id: normalizedId }
    );
  }

  // ========================================
  // PURCHASE ORDERS - 4 MÉTHODES
  // ========================================

  /**
   * Récupère tous les bons de commande avec filtres optionnels
   * Résultats triés par orderDate (desc)
   * 
   * @param filters - Filtres optionnels
   * @param filters.supplierId - ID du fournisseur (UUID)
   * @param filters.status - Statut du bon de commande
   * @param tx - Transaction optionnelle
   * @returns Liste des bons de commande triés par date de commande
   * 
   * @example
   * ```typescript
   * // Tous les bons de commande d'un fournisseur
   * const orders = await repo.getPurchaseOrders({ supplierId: '550e8400-...' });
   * 
   * // Tous les bons de commande avec statut 'draft'
   * const orders = await repo.getPurchaseOrders({ status: 'draft' });
   * 
   * // Combinaison de filtres
   * const orders = await repo.getPurchaseOrders({ 
   *   supplierId: '550e8400-...', 
   *   status: 'sent' 
   * });
   * ```
   */
  async getPurchaseOrders(
    filters?: { supplierId?: string; status?: string },
    tx?: DrizzleTransaction
  ): Promise<PurchaseOrder[]> {
    const dbToUse = this.getDb(tx);
    const conditions: unknown[] = [];

    if (filters?.supplierId) {
      const normalizedSupplierId = this.normalizeId(filters.supplierId);
      conditions.push(eq(purchaseOrders.supplierId, normalizedSupplierId));
    }

    if (filters?.status) {
      conditions.push(eq(purchaseOrders.status, filters.status) as unknown);
    }

    return this.executeQuery(
      async () => {
        let query = dbToUse.select().from(purchaseOrders);

        if (conditions.length > 0) {
          query = query.where(and(...conditions)) as unknown;
        }

        return await query.orderBy(desc(purchaseOrders.createdAt));
      },
      'getPurchaseOrders',
      { filters }
    );
  }

  /**
   * Récupère un bon de commande par son ID
   * 
   * @param id - ID du bon de commande (UUID)
   * @param tx - Transaction optionnelle
   * @returns Le bon de commande trouvé ou undefined si non trouvé
   * 
   * @example
   * ```typescript
   * const order = await repo.getPurchaseOrder('550e8400-...');
   * if (order) {
   *   logger.info(`Bon de commande: ${order.reference}, montant TTC ${order.totalTTC}`);
   * }
   * ```
   */
  async getPurchaseOrder(
    id: string,
    tx?: DrizzleTransaction
  ): Promise<PurchaseOrder | undefined> {
    const normalizedId = this.normalizeId(id);
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const [order] = await dbToUse
          .select()
          .from(purchaseOrders)
          .where(eq(purchaseOrders.id, normalizedId))
          .limit(1);

        return order;
      },
      'getPurchaseOrder',
      { id: normalizedId }
    );
  }

  /**
   * Crée un nouveau bon de commande
   * 
   * @param order - Données du bon de commande à créer
   * @param tx - Transaction optionnelle
   * @returns Le bon de commande créé
   * 
   * @example
   * ```typescript
   * const newOrder = await repo.createPurchaseOrder({
   *   reference: 'BC-2024-001',
   *   supplierId: '550e8400-...',
   *   supplierName: 'Menuiseries Pro',
   *   supplierEmail: 'contact@menuiseries-pro.fr',
   *   totalHT: '10000.00',
   *   totalTVA: '2000.00',
   *   totalTTC: '12000.00',
   *   orderDate: new Date(),
   *   status: 'draft'
   * });
   * ```
   */
  async createPurchaseOrder(
    order: InsertPurchaseOrder,
    tx?: DrizzleTransaction
  ): Promise<PurchaseOrder> {
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const result = await safeInsert<PurchaseOrder[]>(
          'purchase_orders',
          () => dbToUse.insert(purchaseOrders).values(order).returning(),
          { service: this.repositoryName, operation: 'createPurchaseOrder' }
        );

        const newOrder = result[0];
        if (!newOrder) {
          throw new AppError('Failed to create purchase order', 500);
        }

        this.emitEvent('purchase_order:created', { 
          id: newOrder.id, 
          reference: newOrder.reference,
          supplierId: newOrder.supplierId
        });

        return newOrder;
      },
      'createPurchaseOrder',
      { reference: order.reference }
    );
  }

  /**
   * Met à jour un bon de commande existant
   * 
   * @param id - ID du bon de commande (UUID)
   * @param order - Données partielles à mettre à jour
   * @param tx - Transaction optionnelle
   * @returns Le bon de commande mis à jour
   * @throws DatabaseError si le bon de commande n'existe pas
   * 
   * @example
   * ```typescript
   * const updated = await repo.updatePurchaseOrder('550e8400-...', {
   *   status: 'sent',
   *   sentAt: new Date(),
   *   sentBy: 'user-123'
   * });
   * ```
   */
  async updatePurchaseOrder(
    id: string,
    order: Partial<InsertPurchaseOrder>,
    tx?: DrizzleTransaction
  ): Promise<PurchaseOrder> {
    const normalizedId = this.normalizeId(id);
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const result = await safeUpdate<PurchaseOrder[]>(
          'purchase_orders',
          () => dbToUse
            .update(purchaseOrders)
            .set({ ...order, updatedAt: new Date() })
            .where(eq(purchaseOrders.id, normalizedId))
            .returning(),
          1,
          { service: this.repositoryName, operation: 'updatePurchaseOrder' }
        );

        const updatedOrder = result[0];
        if (!updatedOrder) {
          this.handleNotFound(normalizedId, 'updatePurchaseOrder');
        }

        this.emitEvent('purchase_order:updated', { 
          id: updatedOrder.id,
          status: updatedOrder.status
        });

        return updatedOrder;
      },
      'updatePurchaseOrder',
      { id: normalizedId }
    );
  }

  // ========================================
  // CLIENT QUOTES - 4 MÉTHODES
  // ========================================

  /**
   * Récupère tous les devis clients avec filtres optionnels
   * Résultats triés par quoteDate (desc)
   * 
   * @param filters - Filtres optionnels
   * @param filters.clientName - Nom du client (recherche partielle insensible à la casse)
   * @param filters.status - Statut du devis
   * @param tx - Transaction optionnelle
   * @returns Liste des devis clients triés par date de devis
   * 
   * @example
   * ```typescript
   * // Tous les devis d'un client (recherche partielle)
   * const quotes = await repo.getClientQuotes({ clientName: 'Dupont' });
   * 
   * // Tous les devis avec statut 'accepted'
   * const quotes = await repo.getClientQuotes({ status: 'accepted' });
   * 
   * // Combinaison de filtres
   * const quotes = await repo.getClientQuotes({ 
   *   clientName: 'Dupont', 
   *   status: 'sent' 
   * });
   * ```
   */
  async getClientQuotes(
    filters?: { clientName?: string; status?: string },
    tx?: DrizzleTransaction
  ): Promise<ClientQuote[]> {
    const dbToUse = this.getDb(tx);
    const condit: unknown[]ny[] = [];

    if (filters?.clientName) {
      conditions.push(ilike(clientQuotes.clientName, `%${filters.clientName}%`));
    }

    if (filters?.status) {
      conditions.push(eq(clientQuotes.status, filters.statas unknown)unknown);
    }

    return this.executeQuery(
      async () => {
        let query = dbToUse.select().from(clientQuotes);

        if (conditions.length > 0) {
          query = query.where(and(...conditionas unknown;unknown;
        }

        return await query.orderBy(desc(clientQuotes.createdAt));
      },
      'getClientQuotes',
      { filters }
    );
  }

  /**
   * Récupère un devis client par son ID
   * 
   * @param id - ID du devis (UUID)
   * @param tx - Transaction optionnelle
   * @returns Le devis trouvé ou undefined si non trouvé
   * 
   * @example
   * ```typescript
   * const quote = await repo.getClientQuote('550e8400-...');
   * if (quote) {
   *   logger.info(`Devis: ${quote.reference}, montant TTC ${quote.totalTTC}, marge ${quote.tauxMarge}%`);
   * }
   * ```
   */
  async getClientQuote(
    id: string,
    tx?: DrizzleTransaction
  ): Promise<ClientQuote | undefined> {
    const normalizedId = this.normalizeId(id);
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const [quote] = await dbToUse
          .select()
          .from(clientQuotes)
          .where(eq(clientQuotes.id, normalizedId))
          .limit(1);

        return quote;
      },
      'getClientQuote',
      { id: normalizedId }
    );
  }

  /**
   * Crée un nouveau devis client
   * 
   * @param quote - Données du devis à créer
   * @param tx - Transaction optionnelle
   * @returns Le devis créé
   * 
   * @example
   * ```typescript
   * const newQuote = await repo.createClientQuote({
   *   reference: 'DC-2024-001',
   *   clientName: 'M. Dupont',
   *   clientEmail: 'dupont@example.com',
   *   clientAddress: '123 Rue de la Paix, 75001 Paris',
   *   totalHT: '15000.00',
   *   totalTVA: '3000.00',
   *   totalTTC: '18000.00',
   *   marge: '5000.00',
   *   tauxMarge: '33.33',
   *   quoteDate: new Date(),
   *   validUntil: new Date('2024-12-31'),
   *   status: 'draft'
   * });
   * ```
   */
  async createClientQuote(
    quote: InsertClientQuote,
    tx?: DrizzleTransaction
  ): Promise<ClientQuote> {
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const result = await safeInsert<ClientQuote[]>(
          'client_quotes',
          () => dbToUse.insert(clientQuotes).values(quote).returning(),
          { service: this.repositoryName, operation: 'createClientQuote' }
        );

        const newQuote = result[0];
        if (!newQuote) {
          throw new AppError('Failed to create client quote', 500);
        }

        this.emitEvent('client_quote:created', { 
          id: newQuote.id, 
          reference: newQuote.reference,
          clientName: newQuote.clientName
        });

        return newQuote;
      },
      'createClientQuote',
      { reference: quote.reference }
    );
  }

  /**
   * Met à jour un devis client existant
   * 
   * @param id - ID du devis (UUID)
   * @param quote - Données partielles à mettre à jour
   * @param tx - Transaction optionnelle
   * @returns Le devis mis à jour
   * @throws DatabaseError si le devis n'existe pas
   * 
   * @example
   * ```typescript
   * const updated = await repo.updateClientQuote('550e8400-...', {
   *   status: 'sent',
   *   sentAt: new Date(),
   *   sentBy: 'user-123'
   * });
   * ```
   */
  async updateClientQuote(
    id: string,
    quote: Partial<InsertClientQuote>,
    tx?: DrizzleTransaction
  ): Promise<ClientQuote> {
    const normalizedId = this.normalizeId(id);
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const result = await safeUpdate<ClientQuote[]>(
          'client_quotes',
          () => dbToUse
            .update(clientQuotes)
            .set({ ...quote, updatedAt: new Date() })
            .where(eq(clientQuotes.id, normalizedId))
            .returning(),
          1,
          { service: this.repositoryName, operation: 'updateClientQuote' }
        );

        const updatedQuote = result[0];
        if (!updatedQuote) {
          this.handleNotFound(normalizedId, 'updateClientQuote');
        }

        this.emitEvent('client_quote:updated', { 
          id: updatedQuote.id,
          status: updatedQuote.status
        });

        return updatedQuote;
      },
      'updateClientQuote',
      { id: normalizedId }
    );
  }
}
