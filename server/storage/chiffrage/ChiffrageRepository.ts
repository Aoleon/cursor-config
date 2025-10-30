/**
 * Repository pour la gestion du module Chiffrage
 * 
 * Responsabilités :
 * - Gestion des éléments de chiffrage (ChiffrageElement)
 * - Gestion des documents DPGF (Document Provisoire de Gestion Financière)
 * - Gestion des jalons de validation (ValidationMilestone)
 * 
 * Suit le pattern BaseRepository établi avec support transactionnel complet
 */

import { BaseRepository } from '../base/BaseRepository';
import { 
  chiffrageElements, 
  dpgfDocuments, 
  validationMilestones,
  type ChiffrageElement, 
  type InsertChiffrageElement,
  type DpgfDocument,
  type InsertDpgfDocument,
  type ValidationMilestone,
  type InsertValidationMilestone
} from '@shared/schema';
import type { DrizzleTransaction } from '../types';
import { eq, desc, and } from 'drizzle-orm';
import { safeInsert, safeUpdate, safeDelete } from '../../utils/safe-query';

/**
 * Repository pour le module Chiffrage
 * Gère 3 entités principales : ChiffrageElement, DpgfDocument, ValidationMilestone
 * 
 * Note : Ce repository ne suit pas exactement le pattern BaseRepository standard car il gère
 * plusieurs entités. Les méthodes CRUD héritées ne sont pas utilisées directement.
 */
export class ChiffrageRepository extends BaseRepository<
  ChiffrageElement,
  InsertChiffrageElement,
  Partial<InsertChiffrageElement>
> {
  protected readonly tableName = 'chiffrage_elements';
  protected readonly table = chiffrageElements;
  protected readonly primaryKey = chiffrageElements.id;

  /**
   * Constructeur
   * 
   * @param db - Instance Drizzle de la base de données
   * @param eventBus - Event bus optionnel pour notifications
   */
  constructor(db: any, eventBus?: any) {
    super('ChiffrageRepository', db, eventBus);
  }

  // ========================================
  // CHIFFRAGE ELEMENTS - 5 MÉTHODES
  // ========================================

  /**
   * Récupère tous les éléments de chiffrage pour une offre donnée
   * Résultats triés par position puis date de création
   * 
   * @param offerId - ID de l'offre (UUID)
   * @param tx - Transaction optionnelle
   * @returns Liste des éléments de chiffrage
   * 
   * @example
   * ```typescript
   * const elements = await repo.getChiffrageElementsByOffer('550e8400-...');
   * console.log(`Trouvé ${elements.length} éléments de chiffrage`);
   * ```
   */
  async getChiffrageElementsByOffer(
    offerId: string, 
    tx?: DrizzleTransaction
  ): Promise<ChiffrageElement[]> {
    const normalizedOfferId = this.normalizeId(offerId);
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        return await dbToUse
          .select()
          .from(chiffrageElements)
          .where(eq(chiffrageElements.offerId, normalizedOfferId))
          .orderBy(chiffrageElements.position, chiffrageElements.createdAt);
      },
      'getChiffrageElementsByOffer',
      { offerId: normalizedOfferId }
    );
  }

  /**
   * Récupère tous les éléments de chiffrage pour un lot donné
   * Résultats triés par position puis date de création
   * 
   * @param lotId - ID du lot AO (UUID)
   * @param tx - Transaction optionnelle
   * @returns Liste des éléments de chiffrage
   * 
   * @example
   * ```typescript
   * const elements = await repo.getChiffrageElementsByLot('550e8400-...');
   * console.log(`Trouvé ${elements.length} éléments pour le lot`);
   * ```
   */
  async getChiffrageElementsByLot(
    lotId: string,
    tx?: DrizzleTransaction
  ): Promise<ChiffrageElement[]> {
    const normalizedLotId = this.normalizeId(lotId);
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        return await dbToUse
          .select()
          .from(chiffrageElements)
          .where(eq(chiffrageElements.lotId, normalizedLotId))
          .orderBy(chiffrageElements.position, chiffrageElements.createdAt);
      },
      'getChiffrageElementsByLot',
      { lotId: normalizedLotId }
    );
  }

  /**
   * Crée un nouvel élément de chiffrage
   * 
   * @param element - Données de l'élément à créer
   * @param tx - Transaction optionnelle
   * @returns L'élément créé
   * 
   * @example
   * ```typescript
   * const newElement = await repo.createChiffrageElement({
   *   offerId: '550e8400-...',
   *   category: 'menuiseries_exterieures',
   *   designation: 'Fenêtre PVC double vitrage',
   *   unit: 'm²',
   *   quantity: '10.5',
   *   unitPrice: '250.00',
   *   totalPrice: '2625.00'
   * });
   * ```
   */
  async createChiffrageElement(
    element: InsertChiffrageElement,
    tx?: DrizzleTransaction
  ): Promise<ChiffrageElement> {
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const result = await safeInsert<ChiffrageElement[]>(
          'chiffrage_elements',
          () => dbToUse.insert(chiffrageElements).values(element).returning(),
          { service: this.repositoryName, operation: 'createChiffrageElement' }
        );

        const newElement = result[0];
        if (!newElement) {
          throw new Error('Failed to create chiffrage element');
        }

        this.emitEvent('chiffrage_element:created', { 
          id: newElement.id, 
          offerId: newElement.offerId,
          lotId: newElement.lotId
        });

        return newElement;
      },
      'createChiffrageElement',
      { offerId: element.offerId, lotId: element.lotId }
    );
  }

  /**
   * Met à jour un élément de chiffrage existant
   * 
   * @param id - ID de l'élément (UUID)
   * @param element - Données partielles à mettre à jour
   * @param tx - Transaction optionnelle
   * @returns L'élément mis à jour
   * @throws DatabaseError si l'élément n'existe pas
   * 
   * @example
   * ```typescript
   * const updated = await repo.updateChiffrageElement('550e8400-...', {
   *   quantity: '12.0',
   *   totalPrice: '3000.00'
   * });
   * ```
   */
  async updateChiffrageElement(
    id: string,
    element: Partial<InsertChiffrageElement>,
    tx?: DrizzleTransaction
  ): Promise<ChiffrageElement> {
    const normalizedId = this.normalizeId(id);
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const result = await safeUpdate<ChiffrageElement[]>(
          'chiffrage_elements',
          () => dbToUse
            .update(chiffrageElements)
            .set({ ...element, updatedAt: new Date() })
            .where(eq(chiffrageElements.id, normalizedId))
            .returning(),
          1,
          { service: this.repositoryName, operation: 'updateChiffrageElement' }
        );

        const updatedElement = result[0];
        if (!updatedElement) {
          this.handleNotFound(normalizedId, 'updateChiffrageElement');
        }

        this.emitEvent('chiffrage_element:updated', { 
          id: updatedElement.id,
          offerId: updatedElement.offerId,
          lotId: updatedElement.lotId
        });

        return updatedElement;
      },
      'updateChiffrageElement',
      { id: normalizedId }
    );
  }

  /**
   * Supprime un élément de chiffrage
   * 
   * @param id - ID de l'élément (UUID)
   * @param tx - Transaction optionnelle
   * @throws DatabaseError si l'élément n'existe pas
   * 
   * @example
   * ```typescript
   * await repo.deleteChiffrageElement('550e8400-...');
   * ```
   */
  async deleteChiffrageElement(
    id: string,
    tx?: DrizzleTransaction
  ): Promise<void> {
    const normalizedId = this.normalizeId(id);
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const result = await safeDelete<ChiffrageElement[]>(
          'chiffrage_elements',
          () => dbToUse
            .delete(chiffrageElements)
            .where(eq(chiffrageElements.id, normalizedId))
            .returning(),
          1,
          { service: this.repositoryName, operation: 'deleteChiffrageElement' }
        );

        if (result.length === 0) {
          this.handleNotFound(normalizedId, 'deleteChiffrageElement');
        }

        this.emitEvent('chiffrage_element:deleted', { id: normalizedId });
      },
      'deleteChiffrageElement',
      { id: normalizedId }
    );
  }

  // ========================================
  // DPGF DOCUMENTS - 4 MÉTHODES
  // ========================================

  /**
   * Récupère le document DPGF le plus récent pour une offre donnée
   * 
   * @param offerId - ID de l'offre (UUID)
   * @param tx - Transaction optionnelle
   * @returns Le document DPGF le plus récent ou null si aucun
   * 
   * @example
   * ```typescript
   * const dpgf = await repo.getDpgfDocumentByOffer('550e8400-...');
   * if (dpgf) {
   *   console.log(`DPGF version ${dpgf.version}, total HT: ${dpgf.totalHT}`);
   * }
   * ```
   */
  async getDpgfDocumentByOffer(
    offerId: string,
    tx?: DrizzleTransaction
  ): Promise<DpgfDocument | null> {
    const normalizedOfferId = this.normalizeId(offerId);
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const [dpgf] = await dbToUse
          .select()
          .from(dpgfDocuments)
          .where(eq(dpgfDocuments.offerId, normalizedOfferId))
          .orderBy(desc(dpgfDocuments.createdAt))
          .limit(1);

        return dpgf || null;
      },
      'getDpgfDocumentByOffer',
      { offerId: normalizedOfferId }
    );
  }

  /**
   * Crée un nouveau document DPGF
   * 
   * @param dpgf - Données du document à créer
   * @param tx - Transaction optionnelle
   * @returns Le document créé
   * 
   * @example
   * ```typescript
   * const newDpgf = await repo.createDpgfDocument({
   *   offerId: '550e8400-...',
   *   version: '1.0',
   *   status: 'brouillon',
   *   totalHT: '25000.00',
   *   totalTVA: '5000.00',
   *   totalTTC: '30000.00'
   * });
   * ```
   */
  async createDpgfDocument(
    dpgf: InsertDpgfDocument,
    tx?: DrizzleTransaction
  ): Promise<DpgfDocument> {
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const result = await safeInsert<DpgfDocument[]>(
          'dpgf_documents',
          () => dbToUse.insert(dpgfDocuments).values(dpgf).returning(),
          { service: this.repositoryName, operation: 'createDpgfDocument' }
        );

        const newDpgf = result[0];
        if (!newDpgf) {
          throw new Error('Failed to create DPGF document');
        }

        this.emitEvent('dpgf_document:created', { 
          id: newDpgf.id, 
          offerId: newDpgf.offerId,
          version: newDpgf.version
        });

        return newDpgf;
      },
      'createDpgfDocument',
      { offerId: dpgf.offerId, version: dpgf.version }
    );
  }

  /**
   * Met à jour un document DPGF existant
   * 
   * @param id - ID du document (UUID)
   * @param dpgf - Données partielles à mettre à jour
   * @param tx - Transaction optionnelle
   * @returns Le document mis à jour
   * @throws DatabaseError si le document n'existe pas
   * 
   * @example
   * ```typescript
   * const updated = await repo.updateDpgfDocument('550e8400-...', {
   *   status: 'valide',
   *   validatedBy: 'user-id',
   *   validatedAt: new Date()
   * });
   * ```
   */
  async updateDpgfDocument(
    id: string,
    dpgf: Partial<InsertDpgfDocument>,
    tx?: DrizzleTransaction
  ): Promise<DpgfDocument> {
    const normalizedId = this.normalizeId(id);
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const result = await safeUpdate<DpgfDocument[]>(
          'dpgf_documents',
          () => dbToUse
            .update(dpgfDocuments)
            .set({ ...dpgf, updatedAt: new Date() })
            .where(eq(dpgfDocuments.id, normalizedId))
            .returning(),
          1,
          { service: this.repositoryName, operation: 'updateDpgfDocument' }
        );

        const updatedDpgf = result[0];
        if (!updatedDpgf) {
          this.handleNotFound(normalizedId, 'updateDpgfDocument');
        }

        this.emitEvent('dpgf_document:updated', { 
          id: updatedDpgf.id,
          offerId: updatedDpgf.offerId,
          status: updatedDpgf.status
        });

        return updatedDpgf;
      },
      'updateDpgfDocument',
      { id: normalizedId }
    );
  }

  /**
   * Supprime un document DPGF
   * 
   * @param id - ID du document (UUID)
   * @param tx - Transaction optionnelle
   * @throws DatabaseError si le document n'existe pas
   * 
   * @example
   * ```typescript
   * await repo.deleteDpgfDocument('550e8400-...');
   * ```
   */
  async deleteDpgfDocument(
    id: string,
    tx?: DrizzleTransaction
  ): Promise<void> {
    const normalizedId = this.normalizeId(id);
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const result = await safeDelete<DpgfDocument[]>(
          'dpgf_documents',
          () => dbToUse
            .delete(dpgfDocuments)
            .where(eq(dpgfDocuments.id, normalizedId))
            .returning(),
          1,
          { service: this.repositoryName, operation: 'deleteDpgfDocument' }
        );

        if (result.length === 0) {
          this.handleNotFound(normalizedId, 'deleteDpgfDocument');
        }

        this.emitEvent('dpgf_document:deleted', { id: normalizedId });
      },
      'deleteDpgfDocument',
      { id: normalizedId }
    );
  }

  // ========================================
  // VALIDATION MILESTONES - 4 MÉTHODES
  // ========================================

  /**
   * Récupère tous les jalons de validation pour une offre donnée
   * Résultats triés par date de création
   * 
   * @param offerId - ID de l'offre (UUID)
   * @param tx - Transaction optionnelle
   * @returns Liste des jalons de validation
   * 
   * @example
   * ```typescript
   * const milestones = await repo.getValidationMilestones('550e8400-...');
   * console.log(`Trouvé ${milestones.length} jalons de validation`);
   * ```
   */
  async getValidationMilestones(
    offerId: string,
    tx?: DrizzleTransaction
  ): Promise<ValidationMilestone[]> {
    const normalizedOfferId = this.normalizeId(offerId);
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        return await dbToUse
          .select()
          .from(validationMilestones)
          .where(eq(validationMilestones.offerId, normalizedOfferId))
          .orderBy(validationMilestones.createdAt);
      },
      'getValidationMilestones',
      { offerId: normalizedOfferId }
    );
  }

  /**
   * Crée un nouveau jalon de validation
   * 
   * @param milestone - Données du jalon à créer
   * @param tx - Transaction optionnelle
   * @returns Le jalon créé
   * 
   * @example
   * ```typescript
   * const milestone = await repo.createValidationMilestone({
   *   offerId: '550e8400-...',
   *   milestoneType: 'conformite_dtu',
   *   isCompleted: false
   * });
   * ```
   */
  async createValidationMilestone(
    milestone: InsertValidationMilestone,
    tx?: DrizzleTransaction
  ): Promise<ValidationMilestone> {
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const result = await safeInsert<ValidationMilestone[]>(
          'validation_milestones',
          () => dbToUse.insert(validationMilestones).values(milestone).returning(),
          { service: this.repositoryName, operation: 'createValidationMilestone' }
        );

        const newMilestone = result[0];
        if (!newMilestone) {
          throw new Error('Failed to create validation milestone');
        }

        this.emitEvent('validation_milestone:created', { 
          id: newMilestone.id, 
          offerId: newMilestone.offerId,
          projectId: newMilestone.projectId,
          milestoneType: newMilestone.milestoneType
        });

        return newMilestone;
      },
      'createValidationMilestone',
      { 
        offerId: milestone.offerId, 
        projectId: milestone.projectId,
        milestoneType: milestone.milestoneType 
      }
    );
  }

  /**
   * Met à jour un jalon de validation existant
   * 
   * @param id - ID du jalon (UUID)
   * @param milestone - Données partielles à mettre à jour
   * @param tx - Transaction optionnelle
   * @returns Le jalon mis à jour
   * @throws DatabaseError si le jalon n'existe pas
   * 
   * @example
   * ```typescript
   * const updated = await repo.updateValidationMilestone('550e8400-...', {
   *   isCompleted: true,
   *   completedBy: 'user-id',
   *   completedAt: new Date(),
   *   comment: 'Validation effectuée avec succès'
   * });
   * ```
   */
  async updateValidationMilestone(
    id: string,
    milestone: Partial<InsertValidationMilestone>,
    tx?: DrizzleTransaction
  ): Promise<ValidationMilestone> {
    const normalizedId = this.normalizeId(id);
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const result = await safeUpdate<ValidationMilestone[]>(
          'validation_milestones',
          () => dbToUse
            .update(validationMilestones)
            .set({ ...milestone, updatedAt: new Date() })
            .where(eq(validationMilestones.id, normalizedId))
            .returning(),
          1,
          { service: this.repositoryName, operation: 'updateValidationMilestone' }
        );

        const updatedMilestone = result[0];
        if (!updatedMilestone) {
          this.handleNotFound(normalizedId, 'updateValidationMilestone');
        }

        this.emitEvent('validation_milestone:updated', { 
          id: updatedMilestone.id,
          offerId: updatedMilestone.offerId,
          projectId: updatedMilestone.projectId,
          isCompleted: updatedMilestone.isCompleted
        });

        return updatedMilestone;
      },
      'updateValidationMilestone',
      { id: normalizedId }
    );
  }

  /**
   * Supprime un jalon de validation
   * 
   * @param id - ID du jalon (UUID)
   * @param tx - Transaction optionnelle
   * @throws DatabaseError si le jalon n'existe pas
   * 
   * @example
   * ```typescript
   * await repo.deleteValidationMilestone('550e8400-...');
   * ```
   */
  async deleteValidationMilestone(
    id: string,
    tx?: DrizzleTransaction
  ): Promise<void> {
    const normalizedId = this.normalizeId(id);
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const result = await safeDelete<ValidationMilestone[]>(
          'validation_milestones',
          () => dbToUse
            .delete(validationMilestones)
            .where(eq(validationMilestones.id, normalizedId))
            .returning(),
          1,
          { service: this.repositoryName, operation: 'deleteValidationMilestone' }
        );

        if (result.length === 0) {
          this.handleNotFound(normalizedId, 'deleteValidationMilestone');
        }

        this.emitEvent('validation_milestone:deleted', { id: normalizedId });
      },
      'deleteValidationMilestone',
      { id: normalizedId }
    );
  }

  // ========================================
  // MÉTHODES HÉRITÉES NON UTILISÉES
  // ========================================

  /**
   * @deprecated Ce repository gère plusieurs entités - utiliser les méthodes spécifiques
   */
  async findById(id: string, tx?: DrizzleTransaction): Promise<ChiffrageElement | undefined> {
    throw new Error('Use getChiffrageElementsByOffer, getDpgfDocumentByOffer, or getValidationMilestones instead');
  }

  /**
   * @deprecated Ce repository gère plusieurs entités - utiliser les méthodes spécifiques
   */
  async findAll(filters?: any, tx?: DrizzleTransaction): Promise<ChiffrageElement[]> {
    throw new Error('Use getChiffrageElementsByOffer, getDpgfDocumentByOffer, or getValidationMilestones instead');
  }

  /**
   * @deprecated Ce repository gère plusieurs entités - utiliser les méthodes spécifiques
   */
  async findPaginated(
    filters?: any,
    pagination?: any,
    sort?: any,
    tx?: DrizzleTransaction
  ): Promise<any> {
    throw new Error('Use getChiffrageElementsByOffer, getDpgfDocumentByOffer, or getValidationMilestones instead');
  }

  /**
   * @deprecated Ce repository gère plusieurs entités - utiliser les méthodes spécifiques
   */
  async deleteMany(filters: any, tx?: DrizzleTransaction): Promise<number> {
    throw new Error('Use deleteChiffrageElement, deleteDpgfDocument, or deleteValidationMilestone instead');
  }

  /**
   * @deprecated Ce repository gère plusieurs entités - utiliser les méthodes spécifiques
   */
  async exists(id: string, tx?: DrizzleTransaction): Promise<boolean> {
    throw new Error('Use specific existence checks for each entity type');
  }

  /**
   * @deprecated Ce repository gère plusieurs entités - utiliser les méthodes spécifiques
   */
  async count(filters?: any, tx?: DrizzleTransaction): Promise<number> {
    throw new Error('Count not implemented for multi-entity repository');
  }
}
