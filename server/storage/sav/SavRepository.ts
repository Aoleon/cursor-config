/**
 * Repository pour la gestion du module SAV (Service Après-Vente)
 * 
 * Responsabilités :
 * - Gestion des interventions SAV (savInterventions)
 * 
 * Ce repository gère les interventions SAV liées aux projets.
 * Une intervention SAV peut être liée à une réserve de projet ou être indépendante.
 * 
 * Suit le pattern BaseRepository établi avec support transactionnel complet
 */

import { BaseRepository } from '../base/BaseRepository';
import { AppError, NotFoundError, ValidationError, AuthorizationError } from './utils/error-handler';
import { logger } from './utils/logger';
import { 
  savInterventions,
  type SavIntervention, 
  type InsertSavIntervention
} from '@shared/schema';
import type { DrizzleTransaction, PaginationOptions, PaginatedResult, SearchFilters, SortOptions } from '../types';
import { eq, desc, asc } from 'drizzle-orm';
import { safeInsert, safeUpdate, safeDelete } from '../../utils/safe-query';

/**
 * Repository pour le module SAV
 * Gère les interventions SAV liées aux projets
 * 
 * @extends BaseRepository<SavIntervention, InsertSavIntervention, Partial<InsertSavIntervention>>
 * 
 * @example
 * ```typescript
 * const savRepo = new SavRepository(db, eventBus);
 * 
 * // Récupérer toutes les interventions d'un projet
 * const interventions = await savRepo.getSavInterventions('project-uuid');
 * 
 * // Créer une nouvelle intervention
 * const newIntervention = await savRepo.createSavIntervention({
 *   projectId: 'project-uuid',
 *   interventionNumber: 'SAV-2024-001',
 *   title: 'Réparation fenêtre',
 *   description: 'Remplacement vitrage cassé',
 *   interventionType: 'repair',
 *   priority: 'elevee',
 *   status: 'requested',
 *   requestDate: new Date(),
 *   plannedDate: new Date('2024-12-01'),
 *   requestedBy: 'client-name',
 *   assignedTeam: 'team-uuid'
 * });
 * ```
 */
export class SavRepository extends BaseRepository<
  SavIntervention,
  InsertSavIntervention,
  Partial<InsertSavIntervention>
> {
  protected readonly tableName = 'sav_interventions';
  protected readonly table = savInterventions;
  protected readonly primaryKey = savInterventions.id;

  /**
   * Constructeur
   * 
   * @param db - Instance Drizzle de la base de données
   * @param eventBus - Event bus optionnel pour notifications
   */
  constructor(db: unknown, eventBus?: unknown) {
    super('SavRepository', db, eventBus);
  }

  // ========================================
  // IMPLÉMENTATION DES MÉTHODES ABSTRAITES IRepository
  // ========================================

  /**
   * Récupère une intervention SAV par son ID (implémentation IRepository)
   * 
   * @param id - ID de l'intervention (UUID)
   * @param tx - Transaction optionnelle pour support transactionnel
   * @returns L'intervention SAV ou undefined si non trouvée
   * 
   * @example
   * ```typescript
   * const intervention = await repo.findById('550e8400-...');
   * if (intervention) {
   *   logger.info(`Intervention: ${intervention.title}`);
   * }
   * ```
   */
  async findById(id: string, tx?: DrizzleTransaction): Promise<SavIntervention | undefined> {
    return this.getSavIntervention(id, tx);
  }

  /**
   * Récupère toutes les interventions SAV (implémentation IRepository)
   * 
   * @param filters - Filtres de recherche (non utilisé pour l'instant)
   * @param tx - Transaction optionnelle pour support transactionnel
   * @returns Liste de toutes les interventions SAV triées par createdAt desc
   * 
   * @example
   * ```typescript
   * const allInterventions = await repo.findAll();
   * logger.info(`Total interventions: ${allInterventions.length}`);
   * ```
   */
  async findAll(filters?: SearchFilters, tx?: DrizzleTransaction): Promise<SavIntervention[]> {
    return this.getAllSavInterventions(tx);
  }

  /**
   * Récupère les interventions SAV avec pagination (implémentation IRepository)
   * 
   * @param filters - Filtres de recherche (non utilisé pour l'instant)
   * @param pagination - Options de pagination
   * @param sort - Options de tri (non utilisé, tri par défaut : createdAt desc)
   * @param tx - Transaction optionnelle
   * @returns Résultat paginé avec interventions et métadonnées
   * 
   * @example
   * ```typescript
   * const result = await repo.findPaginated(
   *   {},
   *   { page: 1, limit: 20 }
   * );
   * logger.info(`Page 1: ${result.data.length} interventions sur ${result.total}`);
   * ```
   */
  async findPaginated(
    filters?: SearchFilters,
    pagination?: PaginationOptions,
    sort?: SortOptions,
    tx?: DrizzleTransaction
  ): Promise<PaginatedResult<SavIntervention>> {
    const allInterventions = await this.getAllSavInterventions(tx);
    const total = allInterventions.length;
    
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 50;
    const offset = (page - 1) * limit;
    
    const paginatedInterventions = allInterventions.slice(offset, offset + limit);
    
    return this.createPaginatedResult(paginatedInterventions, total, pagination);
  }

  /**
   * Supprime plusieurs interventions SAV (implémentation IRepository)
   * 
   * @param ids - Liste des IDs d'interventions à supprimer
   * @param tx - Transaction optionnelle
   * @returns Nombre d'interventions supprimées
   * 
   * @example
   * ```typescript
   * const deleted = await repo.deleteMany([
   *   '550e8400-...',
   *   '660f9500-...'
   * ]);
   * logger.info(`${deleted} interventions supprimées`);
   * ```
   */
  async deleteMany(ids: string[], tx?: DrizzleTransaction): Promise<number> {
    let deleted = 0;
    for (const id of ids) {
      await this.deleteSavIntervention(id, tx);
      deleted++;
    }
    return deleted;
  }

  /**
   * Vérifie l'existence d'une intervention SAV (implémentation IRepository)
   * 
   * @param id - ID de l'intervention (UUID)
   * @param tx - Transaction optionnelle
   * @returns true si l'intervention existe, false sinon
   * 
   * @example
   * ```typescript
   * const exists = await repo.exists('550e8400-...');
   * if (!exists) {
   *   logger.info('Intervention introuvable');
   * }
   * ```
   */
  async exists(id: string, tx?: DrizzleTransaction): Promise<boolean> {
    const intervention = await this.getSavIntervention(id, tx);
    return intervention !== undefined;
  }

  // ========================================
  // SAV INTERVENTIONS - 5 MÉTHODES PRINCIPALES
  // ========================================

  /**
   * Récupère toutes les interventions SAV d'un projet
   * Résultats filtrés par projectId et triés par createdAt (desc)
   * 
   * @param projectId - ID du projet (UUID) pour filtrer les interventions
   * @param tx - Transaction optionnelle pour support transactionnel
   * @returns Liste des interventions SAV triées par date de création (plus récentes en premier)
   * 
   * @example
   * ```typescript
   * // Toutes les interventions d'un projet
   * const interventions = await repo.getSavInterventions('550e8400-...');
   * interventions.forEach(i => {
   *   logger.info(`${i.interventionNumber}: ${i.title} (${i.status})`);
   * });
   * 
   * // Dans une transaction
   * await withTransaction(db, async (tx) => {
   *   const interventions = await repo.getSavInterventions('550e8400-...', tx);
   *   // ...
   * });
   * ```
   */
  async getSavInterventions(
    projectId: string,
    tx?: DrizzleTransaction
  ): Promise<SavIntervention[]> {
    const normalizedProjectId = this.normalizeId(projectId);
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const results = await dbToUse
          .select()
          .from(savInterventions)
          .where(eq(savInterventions.projectId, normalizedProjectId))
          .orderBy(desc(savInterventions.createdAt));

        return results;
      },
      'getSavInterventions',
      { projectId: normalizedProjectId }
    );
  }

  /**
   * Récupère une intervention SAV par son ID
   * 
   * @param id - ID de l'intervention (UUID)
   * @param tx - Transaction optionnelle pour support transactionnel
   * @returns L'intervention SAV ou undefined si non trouvée
   * 
   * @example
   * ```typescript
   * const intervention = await repo.getSavIntervention('550e8400-...');
   * if (intervention) {
   *   logger.info(`Intervention: ${intervention.title}`);
   *   logger.info(`Status: ${intervention.status}`);
   *   logger.info(`Priorité: ${intervention.priority}`);
   * }
   * 
   * // Dans une transaction
   * await withTransaction(db, async (tx) => {
   *   const intervention = await repo.getSavIntervention('550e8400-...', tx);
   *   if (!intervention) {
   *     throw new NotFoundError('Intervention not found');
   *   }
   * });
   * ```
   */
  async getSavIntervention(
    id: string,
    tx?: DrizzleTransaction
  ): Promise<SavIntervention | undefined> {
    const normalizedId = this.normalizeId(id);
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const [intervention] = await dbToUse
          .select()
          .from(savInterventions)
          .where(eq(savInterventions.id, normalizedId))
          .limit(1);

        return intervention;
      },
      'getSavIntervention',
      { id: normalizedId }
    );
  }

  /**
   * Crée une nouvelle intervention SAV
   * 
   * @param intervention - Données de l'intervention à créer
   * @param tx - Transaction optionnelle pour support transactionnel
   * @returns L'intervention créée avec son ID
   * 
   * @example
   * ```typescript
   * const newIntervention = await repo.createSavIntervention({
   *   projectId: '550e8400-...',
   *   interventionNumber: 'SAV-2024-001',
   *   title: 'Réparation fenêtre',
   *   description: 'Remplacement vitrage cassé suite tempête',
   *   interventionType: 'repair',
   *   priority: 'elevee',
   *   status: 'requested',
   *   requestDate: new Date(),
   *   plannedDate: new Date('2024-12-01'),
   *   requestedBy: 'M. Dupont',
   *   assignedTeam: 'team-uuid'
   * });
   * 
   * logger.info(`Intervention créée: ${newIntervention.id}`);
   * 
   * // Dans une transaction
   * await withTransaction(db, async (tx) => {
   *   const intervention = await repo.createSavIntervention({
   *     projectId: '550e8400-...',
   *     // ... autres champs
   *   }, tx);
   *   
   *   // Créer une réclamation garantie associée
   *   await warrantyRepo.createWarrantyClaim({
   *     interventionId: intervention.id,
   *     // ...
   *   }, tx);
   * });
   * ```
   */
  async createSavIntervention(
    intervention: InsertSavIntervention,
    tx?: DrizzleTransaction
  ): Promise<SavIntervention> {
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const result = await safeInsert<SavIntervention[]>(
          'sav_interventions',
          () => dbToUse.insert(savInterventions).values({
            ...intervention,
            createdAt: new Date(),
            updatedAt: new Date()
          }).returning(),
          { service: this.repositoryName, operation: 'createSavIntervention' }
        );

        const newIntervention = result[0];
        if (!newIntervention) {
          throw new AppError('Failed to create SAV intervention', 500);
        }

        this.emitEvent('sav_intervention:created', { 
          id: newIntervention.id,
          projectId: newIntervention.projectId,
          interventionNumber: newIntervention.interventionNumber,
          interventionType: newIntervention.interventionType,
          priority: newIntervention.priority,
          status: newIntervention.status
        });

        return newIntervention;
      },
      'createSavIntervention',
      { 
        projectId: intervention.projectId,
        interventionNumber: intervention.interventionNumber
      }
    );
  }

  /**
   * Met à jour une intervention SAV
   * 
   * @param id - ID de l'intervention (UUID)
   * @param intervention - Données partielles à mettre à jour
   * @param tx - Transaction optionnelle pour support transactionnel
   * @returns L'intervention mise à jour
   * @throws DatabaseError si l'intervention n'existe pas
   * 
   * @example
   * ```typescript
   * // Mettre à jour le statut et la date de complétion
   * const updated = await repo.updateSavIntervention('550e8400-...', {
   *   status: 'completed',
   *   completedDate: new Date(),
   *   resolutionNotes: 'Vitrage remplacé, problème résolu'
   * });
   * 
   * logger.info(`Intervention mise à jour: ${updated.status}`);
   * 
   * // Dans une transaction
   * await withTransaction(db, async (tx) => {
   *   const intervention = await repo.updateSavIntervention(
   *     '550e8400-...',
   *     { status: 'in_progress', assignedTechnician: 'tech-uuid' },
   *     tx
   *   );
   *   
   *   // Créer une entrée d'historique
   *   await historyRepo.createHistoryEntry({
   *     interventionId: intervention.id,
   *     action: 'status_changed',
   *     // ...
   *   }, tx);
   * });
   * ```
   */
  async updateSavIntervention(
    id: string,
    intervention: Partial<InsertSavIntervention>,
    tx?: DrizzleTransaction
  ): Promise<SavIntervention> {
    const normalizedId = this.normalizeId(id);
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const result = await safeUpdate<SavIntervention[]>(
          'sav_interventions',
          () => dbToUse
            .update(savInterventions)
            .set({
              ...intervention,
              updatedAt: new Date()
            })
            .where(eq(savInterventions.id, normalizedId))
            .returning(),
          1
        );

        const updatedIntervention = result[0];
        if (!updatedIntervention) {
          this.handleNotFound(normalizedId, 'updateSavIntervention');
        }

        this.emitEvent('sav_intervention:updated', { 
          id: updatedIntervention.id,
          projectId: updatedIntervention.projectId,
          changes: intervention
        });

        return updatedIntervention;
      },
      'updateSavIntervention',
      { id: normalizedId, changes: Object.keys(intervention) }
    );
  }

  /**
   * Supprime une intervention SAV
   * 
   * @param id - ID de l'intervention (UUID)
   * @param tx - Transaction optionnelle pour support transactionnel
   * @returns void
   * 
   * @example
   * ```typescript
   * await repo.deleteSavIntervention('550e8400-...');
   * logger.info('Intervention supprimée');
   * 
   * // Dans une transaction avec cascade
   * await withTransaction(db, async (tx) => {
   *   // Supprimer d'abord les réclamations garantie associées
   *   const claims = await warrantyRepo.getClaimsByIntervention('550e8400-...', tx);
   *   for (const claim of claims) {
   *     await warrantyRepo.deleteWarrantyClaim(claim.id, tx);
   *   }
   *   
   *   // Puis supprimer l'intervention
   *   await repo.deleteSavIntervention('550e8400-...', tx);
   * });
   * ```
   */
  async deleteSavIntervention(id: string, tx?: DrizzleTransaction): Promise<void> {
    const normalizedId = this.normalizeId(id);
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        await safeDelete(
          'sav_interventions',
          () => dbToUse.delete(savInterventions).where(eq(savInterventions.id, normalizedId)),
          1
        );

        this.emitEvent('sav_intervention:deleted', { id: normalizedId });
      },
      'deleteSavIntervention',
      { id: normalizedId }
    );
  }

  // ========================================
  // MÉTHODES HELPER PRIVÉES
  // ========================================

  /**
   * Helper privé : Récupère toutes les interventions SAV
   * Utilisé par findAll() et findPaginated()
   * Résultats triés par createdAt (desc)
   */
  private async getAllSavInterventions(tx?: DrizzleTransaction): Promise<SavIntervention[]> {
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        return await dbToUse
          .select()
          .from(savInterventions)
          .orderBy(desc(savInterventions.createdAt));
      },
      'getAllSavInterventions',
      {}
    );
  }
}
