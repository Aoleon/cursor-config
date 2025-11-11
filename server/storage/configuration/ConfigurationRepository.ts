/**
 * Repository pour la gestion du module Configuration
 * 
 * Responsabilités :
 * - Gestion des batteries d'équipement (EquipmentBatteries)
 * - Gestion des objectifs de marge (MarginTargets)
 * 
 * Ces entités sont utilisées pour la gestion de configuration projet dans Monday.com
 * et le suivi des équipements et marges dans les projets.
 * 
 * Suit le pattern BaseRepository établi avec support transactionnel complet
 */

import { BaseRepository } from '../base/BaseRepository';
import { AppError, NotFoundError, ValidationError, AuthorizationError } from './utils/error-handler';
import { logger } from './utils/logger';
import { 
  equipmentBatteries,
  marginTargets,
  type EquipmentBattery, 
  type EquipmentBatteryInsert,
  type MarginTarget,
  type MarginTargetInsert
} from '@shared/schema';
import type { DrizzleTransaction, PaginationOptions, PaginatedResult, SearchFilters, SortOptions } from '../types';
import { eq, desc, and, SQL, asc } from 'drizzle-orm';
import { safeInsert, safeUpdate, safeDelete } from '../../utils/safe-query';

/**
 * Repository pour le module Configuration
 * Gère 2 entités : EquipmentBattery, MarginTarget
 * 
 * Note : Ce repository gère plusieurs entités selon le pattern établi par DocumentsRepository.
 * Les méthodes CRUD héritées sont utilisées pour EquipmentBattery (entité principale).
 * Les méthodes MarginTarget sont des méthodes supplémentaires.
 */
export class ConfigurationRepository extends BaseRepository<
  EquipmentBattery,
  EquipmentBatteryInsert,
  Partial<EquipmentBatteryInsert>
> {
  protected readonly tableName = 'equipment_batteries';
  protected readonly table = equipmentBatteries;
  protected readonly primaryKey = equipmentBatteries.id;

  /**
   * Constructeur
   * 
   * @param db - Instance Drizzle de la base de données
   * @param eventBus - Event bus optionnel pour notifications
   */
  constructor(db: unknown, eventBus?: unknown) {
    super('ConfigurationRepository', db, eventBus);
  }

  // ========================================
  // IMPLÉMENTATION DES MÉTHODES ABSTRAITES IRepository
  // ========================================

  /**
   * Récupère une batterie d'équipement par son ID (implémentation IRepository)
   */
  async findById(id: string, tx?: DrizzleTransaction): Promise<EquipmentBattery | undefined> {
    return this.getEquipmentBattery(id, tx);
  }

  /**
   * Récupère toutes les batteries d'équipement (implémentation IRepository)
   */
  async findAll(filters?: SearchFilters, tx?: DrizzleTransaction): Promise<EquipmentBattery[]> {
    return this.getEquipmentBatteries(undefined, tx);
  }

  /**
   * Récupère les batteries d'équipement avec pagination (implémentation IRepository)
   */
  async findPaginated(
    filters?: SearchFilters,
    pagination?: PaginationOptions,
    sort?: SortOptions,
    tx?: DrizzleTransaction
  ): Promise<PaginatedResult<EquipmentBattery>> {
    const allBatteries = await this.getEquipmentBatteries(undefined, tx);
    const total = allBatteries.length;
    
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 50;
    const offset = (page - 1) * limit;
    
    const paginatedBatteries = allBatteries.slice(offset, offset + limit);
    
    return this.createPaginatedResult(paginatedBatteries, total, pagination);
  }

  /**
   * Supprime plusieurs batteries d'équipement (implémentation IRepository)
   */
  async deleteMany(ids: string[], tx?: DrizzleTransaction): Promise<number> {
    let deleted = 0;
    for (const id of ids) {
      await this.deleteEquipmentBattery(id, tx);
      deleted++;
    }
    return deleted;
  }

  /**
   * Vérifie l'existence d'une batterie d'équipement (implémentation IRepository)
   */
  async exists(id: string, tx?: DrizzleTransaction): Promise<boolean> {
    const battery = await this.getEquipmentBattery(id, tx);
    return battery !== undefined;
  }

  // ========================================
  // EQUIPMENT BATTERIES - 5 MÉTHODES
  // ========================================

  /**
   * Récupère toutes les batteries d'équipement avec filtre optionnel par projet
   * Résultats triés par name (asc)
   * 
   * @param projectId - ID de projet optionnel (UUID) pour filtrer les batteries
   * @param tx - Transaction optionnelle
   * @returns Liste des batteries d'équipement triées par nom
   * 
   * @example
   * ```typescript
   * // Toutes les batteries d'un projet
   * const batteries = await repo.getEquipmentBatteries('550e8400-...');
   * batteries.forEach(b => {
   *   logger.info(`Batterie: ${b.name}, Marque: ${b.brand}`);
   * });
   * 
   * // Toutes les batteries (sans filtre)
   * const allBatteries = await repo.getEquipmentBatteries();
   * ```
   */
  async getEquipmentBatteries(
    projectId?: string,
    tx?: DrizzleTransaction
  ): Promise<EquipmentBattery[]> {
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        let query = dbToUse.select().from(equipmentBatteries);

        if (projectId) {
          const normalizedProjectId = this.normalizeId(projectId);
          query = query.where(eq(equipmentBatteries.assignedToProjectId, normalizedProjectId));
        }

        return await query.orderBy(asc(equipmentBatteries.name));
      },
      'getEquipmentBatteries',
      { projectId }
    );
  }

  /**
   * Récupère une batterie d'équipement par son ID
   * 
   * @param id - ID de la batterie (UUID)
   * @param tx - Transaction optionnelle
   * @returns La batterie trouvée ou undefined si non trouvée
   * 
   * @example
   * ```typescript
   * const battery = await repo.getEquipmentBattery('550e8400-...');
   * if (battery) {
   *   logger.info(`Batterie: ${battery.name}, Capacité: ${battery.capacity}`);
   * }
   * ```
   */
  async getEquipmentBattery(
    id: string,
    tx?: DrizzleTransaction
  ): Promise<EquipmentBattery | undefined> {
    const normalizedId = this.normalizeId(id);
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const [battery] = await dbToUse
          .select()
          .from(equipmentBatteries)
          .where(eq(equipmentBatteries.id, normalizedId))
          .limit(1);

        return battery;
      },
      'getEquipmentBattery',
      { id: normalizedId }
    );
  }

  /**
   * Crée une nouvelle batterie d'équipement
   * 
   * @param battery - Données de la batterie à créer
   * @param tx - Transaction optionnelle
   * @returns La batterie créée
   * 
   * @example
   * ```typescript
   * const newBattery = await repo.createEquipmentBattery({
   *   projectId: '550e8400-...',
   *   name: 'Batterie Lithium Pro',
   *   brand: 'Bosch',
   *   model: 'GBA 18V 6.0Ah',
   *   capacity: '6000',
   *   voltage: '18',
   *   quantity: 4,
   *   purchaseDate: new Date('2024-01-15'),
   *   warrantyEndDate: new Date('2027-01-15'),
   *   status: 'operational'
   * });
   * ```
   */
  async createEquipmentBattery(
    battery: EquipmentBatteryInsert,
    tx?: DrizzleTransaction
  ): Promise<EquipmentBattery> {
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const result = await safeInsert<EquipmentBattery[]>(
          'equipment_batteries',
          () => dbToUse.insert(equipmentBatteries).values(battery).returning(),
          { service: this.repositoryName, operation: 'createEquipmentBattery' }
        );

        const newBattery = result[0];
        if (!newBattery) {
          throw new AppError('Failed to create equipment battery', 500);
        }

        this.emitEvent('equipment_battery:created', { 
          id: newBattery.id, 
          projectId: newBattery.assignedToProjectId,
          name: newBattery.name
        });

        return newBattery;
      },
      'createEquipmentBattery',
      { projectId: battery.assignedToProjectId, name: battery.name }
    );
  }

  /**
   * Met à jour une batterie d'équipement existante
   * 
   * @param id - ID de la batterie (UUID)
   * @param battery - Données partielles à mettre à jour
   * @param tx - Transaction optionnelle
   * @returns La batterie mise à jour
   * @throws DatabaseError si la batterie n'existe pas
   * 
   * @example
   * ```typescript
   * const updated = await repo.updateEquipmentBattery('550e8400-...', {
   *   status: 'maintenance',
   *   lastMaintenanceDate: new Date(),
   *   notes: 'Révision annuelle effectuée'
   * });
   * ```
   */
  async updateEquipmentBattery(
    id: string,
    battery: Partial<EquipmentBatteryInsert>,
    tx?: DrizzleTransaction
  ): Promise<EquipmentBattery> {
    const normalizedId = this.normalizeId(id);
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const result = await safeUpdate<EquipmentBattery[]>(
          'equipment_batteries',
          () => dbToUse
            .update(equipmentBatteries)
            .set({ ...battery, updatedAt: new Date() })
            .where(eq(equipmentBatteries.id, normalizedId))
            .returning(),
          1,
          { service: this.repositoryName, operation: 'updateEquipmentBattery' }
        );

        const updatedBattery = result[0];
        if (!updatedBattery) {
          this.handleNotFound(normalizedId, 'updateEquipmentBattery');
        }

        this.emitEvent('equipment_battery:updated', { 
          id: updatedBattery.id,
          projectId: updatedBattery.assignedToProjectId
        });

        return updatedBattery;
      },
      'updateEquipmentBattery',
      { id: normalizedId }
    );
  }

  /**
   * Supprime une batterie d'équipement
   * 
   * @param id - ID de la batterie (UUID)
   * @param tx - Transaction optionnelle
   * @throws DatabaseError si la batterie n'existe pas
   * 
   * @example
   * ```typescript
   * await repo.deleteEquipmentBattery('550e8400-...');
   * ```
   */
  async deleteEquipmentBattery(
    id: string,
    tx?: DrizzleTransaction
  ): Promise<void> {
    const normalizedId = this.normalizeId(id);
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        await safeDelete(
          'equipment_batteries',
          () => dbToUse.delete(equipmentBatteries).where(eq(equipmentBatteries.id, normalizedId)),
          1,
          { service: this.repositoryName, operation: 'deleteEquipmentBattery' }
        );

        this.emitEvent('equipment_battery:deleted', { id: normalizedId });
      },
      'deleteEquipmentBattery',
      { id: normalizedId }
    );
  }

  // ========================================
  // MARGIN TARGETS - 5 MÉTHODES
  // ========================================

  /**
   * Récupère tous les objectifs de marge avec filtre optionnel par projet
   * Résultats triés par createdAt (desc)
   * 
   * @param projectId - ID de projet optionnel (UUID) pour filtrer les objectifs
   * @param tx - Transaction optionnelle
   * @returns Liste des objectifs de marge triés par date de création (plus récent en premier)
   * 
   * @example
   * ```typescript
   * // Tous les objectifs d'un projet
   * const targets = await repo.getMarginTargets('550e8400-...');
   * targets.forEach(t => {
   *   logger.info(`Objectif: ${t.targetPercentage}%, Marge réalisée: ${t.actualPercentage}%`);
   * });
   * 
   * // Tous les objectifs (sans filtre)
   * const allTargets = await repo.getMarginTargets();
   * ```
   */
  async getMarginTargets(
    projectId?: string,
    tx?: DrizzleTransaction
  ): Promise<MarginTarget[]> {
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        let query = dbToUse.select().from(marginTargets);

        if (projectId) {
          const normalizedProjectId = this.normalizeId(projectId);
          query = query.where(eq(marginTargets.projectId, normalizedProjectId));
        }

        return await query.orderBy(desc(marginTargets.createdAt));
      },
      'getMarginTargets',
      { projectId }
    );
  }

  /**
   * Récupère un objectif de marge par son ID
   * 
   * @param id - ID de l'objectif (UUID)
   * @param tx - Transaction optionnelle
   * @returns L'objectif trouvé ou undefined si non trouvé
   * 
   * @example
   * ```typescript
   * const target = await repo.getMarginTarget('550e8400-...');
   * if (target) {
   *   logger.info(`Objectif: ${target.targetPercentage}%, Statut: ${target.status}`);
   * }
   * ```
   */
  async getMarginTarget(
    id: string,
    tx?: DrizzleTransaction
  ): Promise<MarginTarget | undefined> {
    const normalizedId = this.normalizeId(id);
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const [target] = await dbToUse
          .select()
          .from(marginTargets)
          .where(eq(marginTargets.id, normalizedId))
          .limit(1);

        return target;
      },
      'getMarginTarget',
      { id: normalizedId }
    );
  }

  /**
   * Crée un nouvel objectif de marge
   * 
   * @param target - Données de l'objectif à créer
   * @param tx - Transaction optionnelle
   * @returns L'objectif créé
   * 
   * @example
   * ```typescript
   * const newTarget = await repo.createMarginTarget({
   *   projectId: '550e8400-...',
   *   offerId: '660e8400-...',
   *   targetPercentage: '18.50',
   *   category: 'menuiserie',
   *   periodStart: new Date('2024-01-01'),
   *   periodEnd: new Date('2024-12-31'),
   *   status: 'active',
   *   notes: 'Objectif annuel 2024'
   * });
   * ```
   */
  async createMarginTarget(
    target: MarginTargetInsert,
    tx?: DrizzleTransaction
  ): Promise<MarginTarget> {
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const result = await safeInsert<MarginTarget[]>(
          'margin_targets',
          () => dbToUse.insert(marginTargets).values(target).returning(),
          { service: this.repositoryName, operation: 'createMarginTarget' }
        );

        const newTarget = result[0];
        if (!newTarget) {
          throw new AppError('Failed to create margin target', 500);
        }

        this.emitEvent('margin_target:created', { 
          id: newTarget.id, 
          projectId: newTarget.projectId,
          targetPercentage: newTarget.targetMarginPercentage
        });

        return newTarget;
      },
      'createMarginTarget',
      { projectId: target.projectId, targetPercentage: target.targetMarginPercentage }
    );
  }

  /**
   * Met à jour un objectif de marge existant
   * 
   * @param id - ID de l'objectif (UUID)
   * @param target - Données partielles à mettre à jour
   * @param tx - Transaction optionnelle
   * @returns L'objectif mis à jour
   * @throws DatabaseError si l'objectif n'existe pas
   * 
   * @example
   * ```typescript
   * const updated = await repo.updateMarginTarget('550e8400-...', {
   *   actualPercentage: '19.20',
   *   status: 'achieved',
   *   achievedAt: new Date(),
   *   notes: 'Objectif dépassé de 0.7 points'
   * });
   * ```
   */
  async updateMarginTarget(
    id: string,
    target: Partial<MarginTargetInsert>,
    tx?: DrizzleTransaction
  ): Promise<MarginTarget> {
    const normalizedId = this.normalizeId(id);
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const result = await safeUpdate<MarginTarget[]>(
          'margin_targets',
          () => dbToUse
            .update(marginTargets)
            .set({ ...target, updatedAt: new Date() })
            .where(eq(marginTargets.id, normalizedId))
            .returning(),
          1,
          { service: this.repositoryName, operation: 'updateMarginTarget' }
        );

        const updatedTarget = result[0];
        if (!updatedTarget) {
          this.handleNotFound(normalizedId, 'updateMarginTarget');
        }

        this.emitEvent('margin_target:updated', { 
          id: updatedTarget.id,
          projectId: updatedTarget.projectId
        });

        return updatedTarget;
      },
      'updateMarginTarget',
      { id: normalizedId }
    );
  }

  /**
   * Supprime un objectif de marge
   * 
   * @param id - ID de l'objectif (UUID)
   * @param tx - Transaction optionnelle
   * @throws DatabaseError si l'objectif n'existe pas
   * 
   * @example
   * ```typescript
   * await repo.deleteMarginTarget('550e8400-...');
   * ```
   */
  async deleteMarginTarget(
    id: string,
    tx?: DrizzleTransaction
  ): Promise<void> {
    const normalizedId = this.normalizeId(id);
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        await safeDelete(
          'margin_targets',
          () => dbToUse.delete(marginTargets).where(eq(marginTargets.id, normalizedId)),
          1,
          { service: this.repositoryName, operation: 'deleteMarginTarget' }
        );

        this.emitEvent('margin_target:deleted', { id: normalizedId });
      },
      'deleteMarginTarget',
      { id: normalizedId }
    );
  }
}
