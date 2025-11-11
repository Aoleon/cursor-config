/**
 * Repository pour la gestion du module Users et ressources humaines
 * 
 * Responsabilités :
 * - Gestion des utilisateurs (Users)
 * - Gestion des ressources d'équipe (TeamResources)
 * - Gestion de la charge BE (BeWorkload)
 * - Gestion des labels employés (EmployeeLabels)
 * - Gestion des assignations de labels (EmployeeLabelAssignments)
 * 
 * OPTIMISATIONS CRITIQUES :
 * - Utilise leftJoin pour relations user (évite N+1 queries)
 * - Une seule requête pour getTeamResources avec users
 * - Une seule requête pour getBeWorkload avec users
 * 
 * Suit le pattern BaseRepository établi avec support transactionnel complet
 */

import { BaseRepository } from '../base/BaseRepository';
import { AppError, NotFoundError, ValidationError, AuthorizationError } from './utils/error-handler';
import { logger } from './utils/logger';
import { 
  users,
  teamResources,
  beWorkload,
  employeeLabels,
  employeeLabelAssignments,
  type User, 
  type UpsertUser,
  type TeamResource,
  type InsertTeamResource,
  type BeWorkload,
  type InsertBeWorkload,
  type EmployeeLabel,
  type EmployeeLabelInsert,
  type EmployeeLabelAssignment,
  type EmployeeLabelAssignmentInsert
} from '@shared/schema';
import type { DrizzleTransaction, PaginationOptions, PaginatedResult, SearchFilters, SortOptions } from '../types';
import { eq, desc, and, SQL, asc } from 'drizzle-orm';
import { safeInsert, safeUpdate, safeDelete } from '../../utils/safe-query';

/**
 * Type enrichi pour TeamResource avec relation user (optimisé avec leftJoin)
 */
export type TeamResourceWithUser = TeamResource & { user?: User };

/**
 * Type enrichi pour BeWorkload avec relation user (optimisé avec leftJoin)
 */
export type BeWorkloadWithUser = BeWorkload & { user?: User };

/**
 * Repository pour le module Users et ressources humaines
 * Gère 5 entités : User, TeamResource, BeWorkload, EmployeeLabel, EmployeeLabelAssignment
 * 
 * OPTIMISATIONS :
 * - getTeamResources : leftJoin users au lieu de N+1 queries
 * - getBeWorkload : leftJoin users au lieu de N+1 queries
 */
export class UserRepository extends BaseRepository<
  User,
  UpsertUser,
  Partial<UpsertUser>
> {
  protected readonly tableName = 'users';
  protected readonly table = users;
  protected readonly primaryKey = users.id;

  /**
   * Constructeur
   * 
   * @param db - Instance Drizzle de la base de données
   * @param eventBus - Event bus optionnel pour notifications
   */
  constructor(db: unknown, eventBus?: unknown) {
    super('UserRepository', db, eventBus);
  }

  // ========================================
  // IMPLÉMENTATION DES MÉTHODES ABSTRAITES IRepository
  // ========================================

  /**
   * Récupère un utilisateur par son ID (implémentation IRepository)
   */
  async findById(id: string, tx?: DrizzleTransaction): Promise<User | undefined> {
    return this.getUser(id, tx);
  }

  /**
   * Récupère tous les utilisateurs (implémentation IRepository)
   */
  async findAll(filters?: SearchFilters, tx?: DrizzleTransaction): Promise<User[]> {
    return this.getUsers(tx);
  }

  /**
   * Récupère les utilisateurs avec pagination (implémentation IRepository)
   */
  async findPaginated(
    filters?: SearchFilters,
    pagination?: PaginationOptions,
    sort?: SortOptions,
    tx?: DrizzleTransaction
  ): Promise<PaginatedResult<User>> {
    const allUsers = await this.getUsers(tx);
    const total = allUsers.length;
    
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 50;
    const offset = (page - 1) * limit;
    
    const paginatedUsers = allUsers.slice(offset, offset + limit);
    
    return this.createPaginatedResult(paginatedUsers, total, pagination);
  }

  /**
   * Supprime plusieurs utilisateurs (implémentation IRepository)
   */
  async deleteMany(ids: string[], tx?: DrizzleTransaction): Promise<number> {
    const dbToUse = this.getDb(tx);
    let deleted = 0;

    return this.executeQuery(
      async () => {
        for (const id of ids) {
          const normalizedId = this.normalizeId(id);
          await safeDelete(
            'users',
            () => dbToUse.delete(users).where(eq(users.id, normalizedId)),
            undefined,
            { service: this.repositoryName, operation: 'deleteMany' }
          );
          deleted++;
        }
        return deleted;
      },
      'deleteMany',
      { count: ids.length }
    );
  }

  /**
   * Vérifie l'existence d'un utilisateur (implémentation IRepository)
   */
  async exists(id: string, tx?: DrizzleTransaction): Promise<boolean> {
    const user = await this.getUser(id, tx);
    return user !== undefined;
  }

  // ========================================
  // USERS - 2 MÉTHODES
  // ========================================

  /**
   * Récupère tous les utilisateurs
   * 
   * @param tx - Transaction optionnelle
   * @returns Liste de tous les utilisateurs
   * 
   * @example
   * ```typescript
   * const users = await repo.getUsers();
   * logger.info(`${users.length} utilisateurs trouvés`);
   * ```
   */
  async getUsers(tx?: DrizzleTransaction): Promise<User[]> {
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        return await dbToUse.select().from(users);
      },
      'getUsers',
      {}
    );
  }

  /**
   * Récupère un utilisateur par son ID
   * 
   * @param id - ID de l'utilisateur (UUID)
   * @param tx - Transaction optionnelle
   * @returns L'utilisateur trouvé ou undefined si non trouvé
   * 
   * @example
   * ```typescript
   * const user = await repo.getUser('550e8400-...');
   * if (user) {
   *   logger.info(`Utilisateur: ${user.firstName} ${user.lastName}`);
   * }
   * ```
   */
  async getUser(id: string, tx?: DrizzleTransaction): Promise<User | undefined> {
    const normalizedId = this.normalizeId(id);
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const [user] = await dbToUse
          .select()
          .from(users)
          .where(eq(users.id, normalizedId))
          .limit(1);

        return user;
      },
      'getUser',
      { id: normalizedId }
    );
  }

  /**
   * Récupère un utilisateur par son email
   * 
   * @param email - Email de l'utilisateur
   * @param tx - Transaction optionnelle
   * @returns L'utilisateur trouvé ou undefined si non trouvé
   */
  async getUserByEmail(email: string, tx?: DrizzleTransaction): Promise<User | undefined> {
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const [user] = await dbToUse
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        return user;
      },
      'getUserByEmail',
      { email }
    );
  }

  /**
   * Récupère un utilisateur par son username
   * 
   * @param username - Username de l'utilisateur
   * @param tx - Transaction optionnelle
   * @returns L'utilisateur trouvé ou undefined si non trouvé
   */
  async getUserByUsername(username: string, tx?: DrizzleTransaction): Promise<User | undefined> {
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const [user] = await dbToUse
          .select()
          .from(users)
          .where(eq(users.username, username))
          .limit(1);

        return user;
      },
      'getUserByUsername',
      { username }
    );
  }

  /**
   * Récupère un utilisateur par son Microsoft ID
   * 
   * @param microsoftId - Microsoft ID de l'utilisateur
   * @param tx - Transaction optionnelle
   * @returns L'utilisateur trouvé ou undefined si non trouvé
   */
  async getUserByMicrosoftId(microsoftId: string, tx?: DrizzleTransaction): Promise<User | undefined> {
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const [user] = await dbToUse
          .select()
          .from(users)
          .where(eq(users.microsoftId, microsoftId))
          .limit(1);

        return user;
      },
      'getUserByMicrosoftId',
      { microsoftId }
    );
  }

  /**
   * Crée un nouvel utilisateur
   * 
   * @param userData - Données de l'utilisateur à créer
   * @param tx - Transaction optionnelle
   * @returns L'utilisateur créé
   */
  async createUser(userData: Partial<UpsertUser>, tx?: DrizzleTransaction): Promise<User> {
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const [user] = await safeInsert(
          'users',
          () => dbToUse.insert(users).values(userData).returning(),
          undefined,
          { service: this.repositoryName, operation: 'createUser' }
        );
        return user;
      },
      'createUser',
      {}
    );
  }

  /**
   * Crée ou met à jour un utilisateur (upsert)
   * 
   * @param userData - Données de l'utilisateur
   * @param tx - Transaction optionnelle
   * @returns L'utilisateur créé ou mis à jour
   */
  async upsertUser(userData: UpsertUser, tx?: DrizzleTransaction): Promise<User> {
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const [user] = await dbToUse
          .insert(users)
          .values(userData)
          .onConflictDoUpdate({
            target: users.id,
            set: {
              ...userData,
              updatedAt: new Date(),
            },
          })
          .returning();

        return user;
      },
      'upsertUser',
      {}
    );
  }

  // ========================================
  // TEAM RESOURCES - 3 MÉTHODES
  // ========================================

  /**
   * Récupère les ressources d'équipe avec filtres optionnels
   * OPTIMISÉ : Utilise leftJoin pour éviter N+1 queries sur users
   * 
   * @param projectId - ID de projet optionnel (UUID)
   * @param tx - Transaction optionnelle
   * @returns Liste des ressources d'équipe avec user associé (1 seule requête)
   * 
   * @example
   * ```typescript
   * // Toutes les ressources d'un projet (1 requête avec leftJoin)
   * const resources = await repo.getTeamResources('550e8400-...');
   * resources.forEach(r => {
   *   logger.info(`Ressource: ${r.role}, User: ${r.user?.firstName}`);
   * });
   * 
   * // Toutes les ressources (1 requête)
   * const allResources = await repo.getTeamResources();
   * ```
   */
  async getTeamResources(
    projectId?: string,
    tx?: DrizzleTransaction
  ): Promise<TeamResourceWithUser[]> {
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        let query = dbToUse
          .select({
            id: teamResources.id,
            projectId: teamResources.projectId,
            userId: teamResources.userId,
            externalName: teamResources.externalName,
            role: teamResources.role,
            startDate: teamResources.startDate,
            endDate: teamResources.endDate,
            chargeStatus: teamResources.chargeStatus,
            isActive: teamResources.isActive,
            createdAt: teamResources.createdAt,
            updatedAt: teamResources.updatedAt,
            user: users
          })
          .from(teamResources)
          .leftJoin(users, eq(teamResources.userId, users.id));

        if (projectId) {
          const normalizedProjectId = this.normalizeId(projectId);
          query = query.where(eq(teamResources.projectId, normalizedProjectId)) as typeof query;
        }

        query = query.orderBy(desc(teamResources.createdAt)) as typeof query;

        const results = await query;

        return results.map(: unknown)unknown) => ({
          id: row.id,
          projectId: row.projectId,
          userId: row.userId,
          externalName: row.externalName,
          role: row.role,
          startDate: row.startDate,
          endDate: row.endDate,
          chargeStatus: row.chargeStatus,
          isActive: row.isActive,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          user: row.user || undefined
              }

                        }


                                  }


                                }));
      },
      'getTeamResources',
      { projectId }
    );
  }

  /**
   * Crée une nouvelle ressource d'équipe
   * 
   * @param resource - Données de la ressource à créer
   * @param tx - Transaction optionnelle
   * @returns La ressource créée
   * 
   * @example
   * ```typescript
   * const newResource = await repo.createTeamResource({
   *   projectId: '550e8400-...',
   *   userId: '660e8400-...',
   *   role: 'chef_equipe',
   *   startDate: new Date(),
   *   chargeStatus: 'occupe'
   * });
   * ```
   */
  async createTeamResource(
    resource: InsertTeamResource,
    tx?: DrizzleTransaction
  ): Promise<TeamResource> {
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const result = await safeInsert<TeamResource[]>(
          'team_resources',
          () => dbToUse.insert(teamResources).values(resource).returning(),
          { service: this.repositoryName, operation: 'createTeamResource' }
        );

        const newResource = result[0];
        if (!newResource) {
          throw new AppError('Failed to create team resource', 500);
        }

        this.emitEvent('team_resource:created', { 
          id: newResource.id, 
          projectId: newResource.projectId,
          userId: newResource.userId
        });

        return newResource;
      },
      'createTeamResource',
      { projectId: resource.projectId }
    );
  }

  /**
   * Met à jour une ressource d'équipe existante
   * 
   * @param id - ID de la ressource (UUID)
   * @param resource - Données partielles à mettre à jour
   * @param tx - Transaction optionnelle
   * @returns La ressource mise à jour
   * @throws DatabaseError si la ressource n'existe pas
   * 
   * @example
   * ```typescript
   * const updated = await repo.updateTeamResource('550e8400-...', {
   *   chargeStatus: 'disponible',
   *   endDate: new Date()
   * });
   * ```
   */
  async updateTeamResource(
    id: string,
    resource: Partial<InsertTeamResource>,
    tx?: DrizzleTransaction
  ): Promise<TeamResource> {
    const normalizedId = this.normalizeId(id);
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const result = await safeUpdate<TeamResource[]>(
          'team_resources',
          () => dbToUse
            .update(teamResources)
            .set({ ...resource, updatedAt: new Date() })
            .where(eq(teamResources.id, normalizedId))
            .returning(),
          1,
          { service: this.repositoryName, operation: 'updateTeamResource' }
        );

        const updated = result[0];
        if (!updated) {
          this.handleNotFound(normalizedId, 'updateTeamResource');
        }

        this.emitEvent('team_resource:updated', { 
          id: updated.id, 
          projectId: updated.projectId 
        });

        return updated;
      },
      'updateTeamResource',
      { id: normalizedId }
    );
  }

  // ========================================
  // BE WORKLOAD - 2 MÉTHODES
  // ========================================

  /**
   * Récupère la charge BE avec filtres optionnels
   * OPTIMISÉ : Utilise leftJoin pour éviter N+1 queries sur users
   * 
   * @param weekNumber - Numéro de semaine optionnel (1-53)
   * @param year - Année optionnelle (ex: 2024)
   * @param tx - Transaction optionnelle
   * @returns Liste de charges BE avec user associé (1 seule requête)
   * 
   * @example
   * ```typescript
   * // Charge BE d'une semaine spécifique (1 requête avec leftJoin)
   * const workload = await repo.getBeWorkload(42, 2024);
   * workload.forEach(w => {
   *   logger.info(`User: ${w.user?.firstName}, Charge: ${w.chargeLevel}`);
   * });
   * 
   * // Toute la charge BE (1 requête)
   * const allWorkload = await repo.getBeWorkload();
   * ```
   */
  async getBeWorkload(
    weekNumber?: number,
    year?: number,
    tx?: DrizzleTransaction
  ): Promise<BeWorkloadWithUser[]> {
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const conditions: SQL[] = [];

        if (weekNumber !== undefined && year !== undefined) {
          conditions.push(eq(beWorkload.weekNumber, weekNumber));
          conditions.push(eq(beWorkload.year, year));
        }

        let query = dbToUse
          .select({
            id: beWorkload.id,
            userId: beWorkload.userId,
            weekNumber: beWorkload.weekNumber,
            year: beWorkload.year,
            plannedHours: beWorkload.plannedHours,
            actualHours: beWorkload.actualHours,
            dossierCount: beWorkload.dossierCount,
            chargeLevel: beWorkload.chargeLevel,
            notes: beWorkload.notes,
            createdAt: beWorkload.createdAt,
            updatedAt: beWorkload.updatedAt,
            user: users
          })
          .from(beWorkload)
          .leftJoin(users, eq(beWorkload.userId, users.id));

        if (conditions.length > 0) {
          query = query.where(and(...conditions)) as typeof query;
        }

        query = query.orderBy(asc(beWorkload.year), asc(beWorkload.weekNumber)) as typeof query;

        const results = await query;

        return results.: unknown)unknown)unknown) => ({
          id: row.id,
          userId: row.userId,
          weekNumber: row.weekNumber,
          year: row.year,
          plannedHours: row.plannedHours,
          actualHours: row.actualHours,
          dossierCount: row.dossierCount,
          chargeLevel: row.chargeLevel,
          notes: row.notes,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          user: row.user || undefined
              }

                        }


                                  }


                                }));
      },
      'getBeWorkload',
      { weekNumber, year }
    );
  }

  /**
   * Crée ou met à jour une charge BE
   * Vérifie si une entrée existe déjà pour userId + weekNumber + year
   * 
   * @param workload - Données de la charge BE
   * @param tx - Transaction optionnelle
   * @returns La charge BE créée ou mise à jour
   * 
   * @example
   * ```typescript
   * // Première fois : création
   * const newWorkload = await repo.createOrUpdateBeWorkload({
   *   userId: '550e8400-...',
   *   weekNumber: 42,
   *   year: 2024,
   *   plannedHours: '35.00',
   *   chargeLevel: 'occupe'
   * });
   * 
   * // Deuxième fois (même userId/week/year) : mise à jour
   * const updated = await repo.createOrUpdateBeWorkload({
   *   userId: '550e8400-...',
   *   weekNumber: 42,
   *   year: 2024,
   *   actualHours: '40.00',
   *   chargeLevel: 'surcharge'
   * });
   * ```
   */
  async createOrUpdateBeWorkload(
    workload: InsertBeWorkload,
    tx?: DrizzleTransaction
  ): Promise<BeWorkload> {
    const normalizedUserId = this.normalizeId(workload.userId);
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const [existingWorkload] = await dbToUse
          .select()
          .from(beWorkload)
          .where(and(
            eq(beWorkload.userId, normalizedUserId),
            eq(beWorkload.weekNumber, workload.weekNumber),
            eq(beWorkload.year, workload.year)
          ))
          .limit(1);

        if (existingWorkload) {
          const result = await safeUpdate<BeWorkload[]>(
            'be_workload',
            () => dbToUse
              .update(beWorkload)
              .set({ ...workload, updatedAt: new Date() })
              .where(eq(beWorkload.id, existingWorkload.id))
              .returning(),
            1,
            { service: this.repositoryName, operation: 'createOrUpdateBeWorkload' }
          );

          const updated = result[0];
          if (!updated) {
            throw new AppError('Failed to update BE workload', 500);
          }

          this.emitEvent('be_workload:updated', { 
            id: updated.id, 
            userId: updated.userId,
            weekNumber: updated.weekNumber,
            year: updated.year
          });

          return updated;
        } else {
          const result = await safeInsert<BeWorkload[]>(
            'be_workload',
            () => dbToUse.insert(beWorkload).values(workload).returning(),
            { service: this.repositoryName, operation: 'createOrUpdateBeWorkload' }
          );

          const newWorkload = result[0];
          if (!newWorkload) {
            throw new AppError('Failed to create BE workload', 500);
          }

          this.emitEvent('be_workload:created', { 
            id: newWorkload.id, 
            userId: newWorkload.userId,
            weekNumber: newWorkload.weekNumber,
            year: newWorkload.year
          });

          return newWorkload;
        }
      },
      'createOrUpdateBeWorkload',
      { userId: normalizedUserId, weekNumber: workload.weekNumber, year: workload.year }
    );
  }

  // ========================================
  // EMPLOYEE LABELS - 4 MÉTHODES
  // ========================================

  /**
   * Récupère les labels employés avec filtre optionnel par catégorie
   * Résultats triés par category, name
   * 
   * @param category - Catégorie optionnelle (ex: 'level', 'specialization', 'role')
   * @param tx - Transaction optionnelle
   * @returns Liste des labels employés triés
   * 
   * @example
   * ```typescript
   * // Tous les labels d'une catégorie
   * const levelLabels = await repo.getEmployeeLabels('level');
   * 
   * // Tous les labels
   * const allLabels = await repo.getEmployeeLabels();
   * ```
   */
  async getEmployeeLabels(
    category?: string,
    tx?: DrizzleTransaction
  ): Promise<EmployeeLabel[]> {
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        let query = dbToUse.select().from(employeeLabels);

        if (category) {
          query = query.where(eq(employeeLabels.category, category)) as typeof query;
        }

        query = query.orderBy(
          asc(employeeLabels.category),
          asc(employeeLabels.name)
        ) as typeof query;

        return await query;
      },
      'getEmployeeLabels',
      { category }
    );
  }

  /**
   * Crée un nouveau label employé
   * 
   * @param label - Données du label à créer
   * @param tx - Transaction optionnelle
   * @returns Le label créé
   * 
   * @example
   * ```typescript
   * const newLabel = await repo.createEmployeeLabel({
   *   name: 'Expert MEXT',
   *   shortName: 'Exp',
   *   category: 'specialization',
   *   color: '#ff6b6b',
   *   backgroundColor: '#ffe0e0',
   *   level: 5
   * });
   * ```
   */
  async createEmployeeLabel(
    label: EmployeeLabelInsert,
    tx?: DrizzleTransaction
  ): Promise<EmployeeLabel> {
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const result = await safeInsert<EmployeeLabel[]>(
          'employee_labels',
          () => dbToUse.insert(employeeLabels).values(label).returning(),
          { service: this.repositoryName, operation: 'createEmployeeLabel' }
        );

        const newLabel = result[0];
        if (!newLabel) {
          throw new AppError('Failed to create employee label', 500);
        }

        this.emitEvent('employee_label:created', { 
          id: newLabel.id, 
          name: newLabel.name,
          category: newLabel.category
        });

        return newLabel;
      },
      'createEmployeeLabel',
      { name: label.name, category: label.category }
    );
  }

  /**
   * Met à jour un label employé existant
   * 
   * @param id - ID du label (UUID)
   * @param label - Données partielles à mettre à jour
   * @param tx - Transaction optionnelle
   * @returns Le label mis à jour
   * @throws DatabaseError si le label n'existe pas
   * 
   * @example
   * ```typescript
   * const updated = await repo.updateEmployeeLabel('550e8400-...', {
   *   color: '#00ff00',
   *   displayOrder: 1
   * });
   * ```
   */
  async updateEmployeeLabel(
    id: string,
    label: Partial<EmployeeLabelInsert>,
    tx?: DrizzleTransaction
  ): Promise<EmployeeLabel> {
    const normalizedId = this.normalizeId(id);
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const result = await safeUpdate<EmployeeLabel[]>(
          'employee_labels',
          () => dbToUse
            .update(employeeLabels)
            .set({ ...label, updatedAt: new Date() })
            .where(eq(employeeLabels.id, normalizedId))
            .returning(),
          1,
          { service: this.repositoryName, operation: 'updateEmployeeLabel' }
        );

        const updated = result[0];
        if (!updated) {
          this.handleNotFound(normalizedId, 'updateEmployeeLabel');
        }

        this.emitEvent('employee_label:updated', { 
          id: updated.id, 
          name: updated.name 
        });

        return updated;
      },
      'updateEmployeeLabel',
      { id: normalizedId }
    );
  }

  /**
   * Supprime un label employé
   * 
   * @param id - ID du label (UUID)
   * @param tx - Transaction optionnelle
   * @throws DatabaseError si le label n'existe pas
   * 
   * @example
   * ```typescript
   * await repo.deleteEmployeeLabel('550e8400-...');
   * ```
   */
  async deleteEmployeeLabel(id: string, tx?: DrizzleTransaction): Promise<void> {
    const normalizedId = this.normalizeId(id);
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        await safeDelete(
          'employee_labels',
          () => dbToUse.delete(employeeLabels).where(eq(employeeLabels.id, normalizedId)),
          undefined,
          { service: this.repositoryName, operation: 'deleteEmployeeLabel' }
        );

        this.emitEvent('employee_label:deleted', { id: normalizedId });
      },
      'deleteEmployeeLabel',
      { id: normalizedId }
    );
  }

  // ========================================
  // EMPLOYEE LABEL ASSIGNMENTS - 3 MÉTHODES
  // ========================================

  /**
   * Récupère les assignations de labels avec filtre optionnel par utilisateur
   * Résultats triés par createdAt (desc)
   * 
   * @param userId - ID utilisateur optionnel (UUID)
   * @param tx - Transaction optionnelle
   * @returns Liste des assignations de labels triées
   * 
   * @example
   * ```typescript
   * // Toutes les assignations d'un utilisateur
   * const userAssignments = await repo.getEmployeeLabelAssignments('550e8400-...');
   * 
   * // Toutes les assignations
   * const allAssignments = await repo.getEmployeeLabelAssignments();
   * ```
   */
  async getEmployeeLabelAssignments(
    userId?: string,
    tx?: DrizzleTransaction
  ): Promise<EmployeeLabelAssignment[]> {
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        let query = dbToUse.select().from(employeeLabelAssignments);

        if (userId) {
          const normalizedUserId = this.normalizeId(userId);
          query = query.where(eq(employeeLabelAssignments.userId, normalizedUserId)) as typeof query;
        }

        query = query.orderBy(desc(employeeLabelAssignments.createdAt)) as typeof query;

        return await query;
      },
      'getEmployeeLabelAssignments',
      { userId }
    );
  }

  /**
   * Crée une nouvelle assignation de label
   * 
   * @param assignment - Données de l'assignation à créer
   * @param tx - Transaction optionnelle
   * @returns L'assignation créée
   * 
   * @example
   * ```typescript
   * const newAssignment = await repo.createEmployeeLabelAssignment({
   *   userId: '550e8400-...',
   *   labelId: '660e8400-...',
   *   assignedByUserId: '770e8400-...',
   *   validFrom: new Date(),
   *   isPermanent: true
   * });
   * ```
   */
  async createEmployeeLabelAssignment(
    assignment: EmployeeLabelAssignmentInsert,
    tx?: DrizzleTransaction
  ): Promise<EmployeeLabelAssignment> {
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const result = await safeInsert<EmployeeLabelAssignment[]>(
          'employee_label_assignments',
          () => dbToUse.insert(employeeLabelAssignments).values(assignment).returning(),
          { service: this.repositoryName, operation: 'createEmployeeLabelAssignment' }
        );

        const newAssignment = result[0];
        if (!newAssignment) {
          throw new AppError('Failed to create employee label assignment', 500);
        }

        this.emitEvent('employee_label_assignment:created', { 
          id: newAssignment.id, 
          userId: newAssignment.userId,
          labelId: newAssignment.labelId
        });

        return newAssignment;
      },
      'createEmployeeLabelAssignment',
      { userId: assignment.userId, labelId: assignment.labelId }
    );
  }

  /**
   * Supprime une assignation de label
   * 
   * @param id - ID de l'assignation (UUID)
   * @param tx - Transaction optionnelle
   * @throws DatabaseError si l'assignation n'existe pas
   * 
   * @example
   * ```typescript
   * await repo.deleteEmployeeLabelAssignment('550e8400-...');
   * ```
   */
  async deleteEmployeeLabelAssignment(id: string, tx?: DrizzleTransaction): Promise<void> {
    const normalizedId = this.normalizeId(id);
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        await safeDelete(
          'employee_label_assignments',
          () => dbToUse.delete(employeeLabelAssignments).where(eq(employeeLabelAssignments.id, normalizedId)),
          undefined,
          { service: this.repositoryName, operation: 'deleteEmployeeLabelAssignment' }
        );

        this.emitEvent('employee_label_assignment:deleted', { id: normalizedId });
      },
      'deleteEmployeeLabelAssignment',
      { id: normalizedId }
    );
  }
}
