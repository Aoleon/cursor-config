/**
 * Repository pour la gestion de la Production (domaine Production)
 * 
 * Responsabilités :
 * - CRUD complet des Projects
 * - Gestion des ProjectTasks
 * - Gestion des ProjectReserves (SAV)
 * - Gestion des ProjectContacts
 * - Gestion des ProjectTimelines
 * - Gestion des ProjectSubElements
 * - Recherche et filtrage
 * - Pagination des résultats
 * - Lookup par Monday ID (intégration Monday.com)
 * 
 * Suit le pattern BaseRepository établi
 */

import { BaseRepository } from '../base/BaseRepository';
import { AppError, NotFoundError, ValidationError, AuthorizationError } from '../../utils/error-handler';
import { 
  projects, 
  projectTasks, 
  projectReserves, 
  projectContacts, 
  projectTimelines, 
  projectSubElements,
  users,
  offers,
  type Project, 
  type InsertProject,
  type ProjectTask,
  type InsertProjectTask,
  type ProjectReserve,
  type InsertProjectReserve,
  type ProjectContacts,
  type InsertProjectContacts,
  type ProjectTimeline,
  type InsertProjectTimeline,
  type ProjectSubElement,
  type ProjectSubElementInsert
} from '@shared/schema';
import type { DrizzleTransaction, PaginationOptions, PaginatedResult, SearchFilters, SortOptions } from '../types';
import { eq, and, desc, ilike, or, count as drizzleCount, isNull, isNotNull, gte, lte, type SQL } from 'drizzle-orm';

/**
 * Filtres spécifiques aux Projects
 */
export interface ProjectFilters extends SearchFilters {
  status?: string;
  responsibleUserId?: string;
  offerId?: string;
}

/**
 * Repository pour les Projects et entités liées
 * Hérite des méthodes CRUD de BaseRepository
 */
export class ProductionRepository extends BaseRepository<
  Project,
  InsertProject,
  Partial<InsertProject>,
  ProjectFilters
> {
  protected readonly tableName = 'projects';
  protected readonly table = projects;
  protected readonly primaryKey = projects.id;

  // ========================================
  // PROJECTS CORE
  // ========================================

  /**
   * Trouve un projet par son ID avec relations
   * 
   * @param id - ID du projet (UUID)
   * @param tx - Transaction optionnelle
   * @returns Le projet avec ses relations ou undefined
   */
  async findById(id: string, tx?: DrizzleTransaction): Promise<Project | undefined> {
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
      { projectId: normalizedId }
    );
  }

  /**
   * Trouve tous les projets avec filtres optionnels
   * 
   * @param filters - Filtres de recherche
   * @param tx - Transaction optionnelle
   * @returns Liste des projets correspondants
   */
  async findAll(filters?: ProjectFilters, tx?: DrizzleTransaction): Promise<Project[]> {
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        let query = dbToUse.select().from(this.table);

        const conditions = this.buildWhereConditions(filters);
        if (conditions.length > 0) {
          query = query.where(and(...conditions)) as typeof query;
        }

        query = query.orderBy(desc(projects.createdAt)) as typeof query;

        return await query;
      },
      'findAll',
      { filters }
    );
  }

  /**
   * Trouve les projets avec pagination
   * 
   * @param filters - Filtres de recherche
   * @param pagination - Options de pagination
   * @param sort - Options de tri
   * @param tx - Transaction optionnelle
   * @returns Résultat paginé
   */
  async findPaginated(
    filters?: ProjectFilters,
    pagination?: PaginationOptions,
    sort?: SortOptions,
    tx?: DrizzleTransaction
  ): Promise<PaginatedResult<Project>> {
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
          const sortField = (projects as Record<string, unknown>)[sort.field];
          if (sortField) {
            dataQuery = dataQuery.orderBy(direction === 'asc' ? sortField : desc(sortField)) as typeof dataQuery;
          }
        } else {
          dataQuery = dataQuery.orderBy(desc(projects.createdAt)) as typeof dataQuery;
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
   * Trouve un projet par son Monday ID
   * Méthode spécifique pour l'intégration Monday.com
   * 
   * @param mondayId - ID Monday.com du projet
   * @param tx - Transaction optionnelle
   * @returns Le projet correspondant ou undefined
   */
  async findByMondayId(mondayId: string, tx?: DrizzleTransaction): Promise<Project | undefined> {
    if (!mondayId || mondayId.trim() === '') {
      throw new AppError('Monday ID cannot be empty', 500);
    }

    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const result = await dbToUse
          .select()
          .from(this.table)
          .where(eq(projects.mondayItemId, mondayId))
          .limit(1);

        return result[0];
      },
      'findByMondayId',
      { mondayId }
    );
  }

  /**
   * Met à jour le Monday ID d'un projet
   * Méthode spécifique pour l'intégration Monday.com
   * 
   * @param projectId - ID du projet
   * @param mondayId - ID Monday.com à assigner
   * @param tx - Transaction optionnelle
   * @returns Le projet mis à jour
   */
  async updateMondayId(projectId: string, mondayId: string, tx?: DrizzleTransaction): Promise<Project> {
    const normalizedId = this.normalizeId(projectId);
    
    if (!mondayId || mondayId.trim() === '') {
      throw new AppError('Monday ID cannot be empty', 500);
    }

    return this.update(normalizedId, { mondayItemId: mondayId } as Partial<InsertProject>, tx);
  }

  /**
   * Trouve les projets sans Monday ID (pour export vers Monday.com)
   * 
   * @param limit - Nombre maximum de projets à retourner
   * @param tx - Transaction optionnelle
   * @returns Liste des projets sans Monday ID
   */
  async findToExport(limit?: number, tx?: DrizzleTransaction): Promise<Project[]> {
    const dbToUse = this.getDb(tx);
    const maxLimit = limit || 100;

    return this.executeQuery(
      async () => {
        let query = dbToUse
          .select()
          .from(this.table)
          .where(isNull(projects.mondayItemId))
          .orderBy(desc(projects.createdAt));

        if (maxLimit) {
          query = query.limit(maxLimit) as typeof query;
        }

        return await query;
      },
      'findToExport',
      { limit: maxLimit }
    );
  }

  /**
   * Trouve tous les projets liés à une offre
   * 
   * @param offerId - ID de l'offre
   * @param tx - Transaction optionnelle
   * @returns Liste des projets liés
   */
  async findByOffer(offerId: string, tx?: DrizzleTransaction): Promise<Project[]> {
    const normalizedOfferId = this.normalizeId(offerId);
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        return await dbToUse
          .select()
          .from(this.table)
          .where(eq(projects.offerId, normalizedOfferId))
          .orderBy(desc(projects.createdAt));
      },
      'findByOffer',
      { offerId: normalizedOfferId }
    );
  }

  // ========================================
  // PROJECT TASKS
  // ========================================

  /**
   * Trouve toutes les tâches d'un projet
   * 
   * @param projectId - ID du projet
   * @param tx - Transaction optionnelle
   * @returns Liste des tâches du projet
   */
  async findTasksByProject(projectId: string, tx?: DrizzleTransaction): Promise<ProjectTask[]> {
    const normalizedId = this.normalizeId(projectId);
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        return await dbToUse
          .select()
          .from(projectTasks)
          .where(eq(projectTasks.projectId, normalizedId))
          .orderBy(projectTasks.position, projectTasks.createdAt);
      },
      'findTasksByProject',
      { projectId: normalizedId }
    );
  }

  /**
   * Trouve toutes les tâches (tous projets)
   * 
   * @param tx - Transaction optionnelle
   * @returns Liste de toutes les tâches
   */
  async findAllTasks(tx?: DrizzleTransaction): Promise<ProjectTask[]> {
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        return await dbToUse
          .select()
          .from(projectTasks)
          .orderBy(desc(projectTasks.createdAt));
      },
      'findAllTasks',
      {}
    );
  }

  /**
   * Crée une nouvelle tâche
   * 
   * @param task - Données de la tâche à créer
   * @param tx - Transaction optionnelle
   * @returns La tâche créée
   */
  async createTask(task: InsertProjectTask, tx?: DrizzleTransaction): Promise<ProjectTask> {
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const result = await dbToUse
          .insert(projectTasks)
          .values(task)
          .returning();

        if (!result || result.length === 0) {
          throw new AppError('Failed to create project task', 500);
        }

        return result[0];
      },
      'createTask',
      { projectId: task.projectId }
    );
  }

  /**
   * Met à jour une tâche
   * 
   * @param id - ID de la tâche
   * @param data - Données à mettre à jour
   * @param tx - Transaction optionnelle
   * @returns La tâche mise à jour
   */
  async updateTask(
    id: string,
    data: Partial<InsertProjectTask>,
    tx?: DrizzleTransaction
  ): Promise<ProjectTask> {
    const normalizedId = this.normalizeId(id);
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const result = await dbToUse
          .update(projectTasks)
          .set({ ...data, updatedAt: new Date() })
          .where(eq(projectTasks.id, normalizedId))
          .returning();

        if (!result || result.length === 0) {
          throw new AppError(`Project task with ID ${normalizedId} not found`, 500);
        }

        return result[0];
      },
      'updateTask',
      { taskId: normalizedId }
    );
  }

  // ========================================
  // PROJECT RESERVES (SAV)
  // ========================================

  /**
   * Trouve toutes les réserves d'un projet
   * 
   * @param projectId - ID du projet
   * @param tx - Transaction optionnelle
   * @returns Liste des réserves du projet
   */
  async findReservesByProject(projectId: string, tx?: DrizzleTransaction): Promise<ProjectReserve[]> {
    const normalizedId = this.normalizeId(projectId);
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        return await dbToUse
          .select()
          .from(projectReserves)
          .where(eq(projectReserves.projectId, normalizedId))
          .orderBy(desc(projectReserves.detectedDate));
      },
      'findReservesByProject',
      { projectId: normalizedId }
    );
  }

  /**
   * Trouve une réserve par son ID
   * 
   * @param id - ID de la réserve
   * @param tx - Transaction optionnelle
   * @returns La réserve ou undefined
   */
  async findReserveById(id: string, tx?: DrizzleTransaction): Promise<ProjectReserve | undefined> {
    const normalizedId = this.normalizeId(id);
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const result = await dbToUse
          .select()
          .from(projectReserves)
          .where(eq(projectReserves.id, normalizedId))
          .limit(1);

        return result[0];
      },
      'findReserveById',
      { reserveId: normalizedId }
    );
  }

  /**
   * Crée une nouvelle réserve
   * 
   * @param reserve - Données de la réserve à créer
   * @param tx - Transaction optionnelle
   * @returns La réserve créée
   */
  async createReserve(reserve: InsertProjectReserve, tx?: DrizzleTransaction): Promise<ProjectReserve> {
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const result = await dbToUse
          .insert(projectReserves)
          .values(reserve)
          .returning();

        if (!result || result.length === 0) {
          throw new AppError('Failed to create project reserve', 500);
        }

        return result[0];
      },
      'createReserve',
      { projectId: reserve.projectId }
    );
  }

  /**
   * Met à jour une réserve
   * 
   * @param id - ID de la réserve
   * @param data - Données à mettre à jour
   * @param tx - Transaction optionnelle
   * @returns La réserve mise à jour
   */
  async updateReserve(
    id: string,
    data: Partial<InsertProjectReserve>,
    tx?: DrizzleTransaction
  ): Promise<ProjectReserve> {
    const normalizedId = this.normalizeId(id);
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const result = await dbToUse
          .update(projectReserves)
          .set({ ...data, updatedAt: new Date() })
          .where(eq(projectReserves.id, normalizedId))
          .returning();

        if (!result || result.length === 0) {
          throw new AppError(`Project reserve with ID ${normalizedId} not found`, 500);
        }

        return result[0];
      },
      'updateReserve',
      { reserveId: normalizedId }
    );
  }

  /**
   * Supprime une réserve
   * 
   * @param id - ID de la réserve
   * @param tx - Transaction optionnelle
   * @returns Nombre de réserves supprimées
   */
  async deleteReserve(id: string, tx?: DrizzleTransaction): Promise<number> {
    const normalizedId = this.normalizeId(id);
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const result = await dbToUse
          .delete(projectReserves)
          .where(eq(projectReserves.id, normalizedId));

        return result.rowCount || 0;
      },
      'deleteReserve',
      { reserveId: normalizedId }
    );
  }

  // ========================================
  // PROJECT CONTACTS
  // ========================================

  /**
   * Trouve tous les contacts d'un projet
   * 
   * @param projectId - ID du projet
   * @param tx - Transaction optionnelle
   * @returns Liste des contacts du projet
   */
  async findContactsByProject(projectId: string, tx?: DrizzleTransaction): Promise<ProjectContacts[]> {
    const normalizedId = this.normalizeId(projectId);
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        return await dbToUse
          .select()
          .from(projectContacts)
          .where(eq(projectContacts.project_id, normalizedId))
          .orderBy(desc(projectContacts.createdAt));
      },
      'findContactsByProject',
      { projectId: normalizedId }
    );
  }

  /**
   * Crée un nouveau contact pour un projet
   * 
   * @param contact - Données du contact à créer
   * @param tx - Transaction optionnelle
   * @returns Le contact créé
   */
  async createContact(contact: InsertProjectContacts, tx?: DrizzleTransaction): Promise<ProjectContacts> {
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const result = await dbToUse
          .insert(projectContacts)
          .values(contact)
          .returning();

        if (!result || result.length === 0) {
          throw new AppError('Failed to create project contact', 500);
        }

        return result[0];
      },
      'createContact',
      { projectId: contact.project_id }
    );
  }

  /**
   * Supprime un contact
   * 
   * @param id - ID du contact
   * @param tx - Transaction optionnelle
   * @returns Nombre de contacts supprimés
   */
  async deleteContact(id: string, tx?: DrizzleTransaction): Promise<number> {
    const normalizedId = this.normalizeId(id);
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const result = await dbToUse
          .delete(projectContacts)
          .where(eq(projectContacts.id, normalizedId));

        return result.rowCount || 0;
      },
      'deleteContact',
      { contactId: normalizedId }
    );
  }

  // ========================================
  // PROJECT TIMELINES
  // ========================================

  /**
   * Trouve toutes les timelines d'un projet
   * 
   * @param projectId - ID du projet
   * @param tx - Transaction optionnelle
   * @returns Liste des timelines du projet
   */
  async findTimelinesByProject(projectId: string, tx?: DrizzleTransaction): Promise<ProjectTimeline[]> {
    const normalizedId = this.normalizeId(projectId);
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        return await dbToUse
          .select()
          .from(projectTimelines)
          .where(eq(projectTimelines.projectId, normalizedId))
          .orderBy(projectTimelines.plannedStartDate);
      },
      'findTimelinesByProject',
      { projectId: normalizedId }
    );
  }

  /**
   * Crée une nouvelle timeline
   * 
   * @param data - Données de la timeline à créer
   * @param tx - Transaction optionnelle
   * @returns La timeline créée
   */
  async createTimeline(data: InsertProjectTimeline, tx?: DrizzleTransaction): Promise<ProjectTimeline> {
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const result = await dbToUse
          .insert(projectTimelines)
          .values(data)
          .returning();

        if (!result || result.length === 0) {
          throw new AppError('Failed to create project timeline', 500);
        }

        return result[0];
      },
      'createTimeline',
      { projectId: data.projectId }
    );
  }

  /**
   * Met à jour une timeline
   * 
   * @param id - ID de la timeline
   * @param data - Données à mettre à jour
   * @param tx - Transaction optionnelle
   * @returns La timeline mise à jour
   */
  async updateTimeline(
    id: string,
    data: Partial<InsertProjectTimeline>,
    tx?: DrizzleTransaction
  ): Promise<ProjectTimeline> {
    const normalizedId = this.normalizeId(id);
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const result = await dbToUse
          .update(projectTimelines)
          .set({ ...data, updatedAt: new Date() })
          .where(eq(projectTimelines.id, normalizedId))
          .returning();

        if (!result || result.length === 0) {
          throw new AppError(`Project timeline with ID ${normalizedId} not found`, 500);
        }

        return result[0];
      },
      'updateTimeline',
      { timelineId: normalizedId }
    );
  }

  /**
   * Supprime une timeline
   * 
   * @param id - ID de la timeline
   * @param tx - Transaction optionnelle
   * @returns Nombre de timelines supprimées
   */
  async deleteTimeline(id: string, tx?: DrizzleTransaction): Promise<number> {
    const normalizedId = this.normalizeId(id);
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const result = await dbToUse
          .delete(projectTimelines)
          .where(eq(projectTimelines.id, normalizedId));

        return result.rowCount || 0;
      },
      'deleteTimeline',
      { timelineId: normalizedId }
    );
  }

  // ========================================
  // PROJECT SUB ELEMENTS
  // ========================================

  /**
   * Trouve tous les sous-éléments (optionnellement filtrés par projet)
   * 
   * @param projectId - ID du projet optionnel
   * @param tx - Transaction optionnelle
   * @returns Liste des sous-éléments
   */
  async findSubElements(projectId?: string, tx?: DrizzleTransaction): Promise<ProjectSubElement[]> {
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        let query = dbToUse.select().from(projectSubElements);

        if (projectId) {
          const normalizedId = this.normalizeId(projectId);
          query = query.where(eq(projectSubElements.projectId, normalizedId)) as typeof query;
        }

        return await query.orderBy(projectSubElements.code, projectSubElements.name);
      },
      'findSubElements',
      { projectId }
    );
  }

  /**
   * Trouve un sous-élément par son ID
   * 
   * @param id - ID du sous-élément
   * @param tx - Transaction optionnelle
   * @returns Le sous-élément ou undefined
   */
  async findSubElementById(id: string, tx?: DrizzleTransaction): Promise<ProjectSubElement | undefined> {
    const normalizedId = this.normalizeId(id);
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const result = await dbToUse
          .select()
          .from(projectSubElements)
          .where(eq(projectSubElements.id, normalizedId))
          .limit(1);

        return result[0];
      },
      'findSubElementById',
      { subElementId: normalizedId }
    );
  }

  /**
   * Crée un nouveau sous-élément
   * 
   * @param element - Données du sous-élément à créer
   * @param tx - Transaction optionnelle
   * @returns Le sous-élément créé
   */
  async createSubElement(element: ProjectSubElementInsert, tx?: DrizzleTransaction): Promise<ProjectSubElement> {
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const result = await dbToUse
          .insert(projectSubElements)
          .values(element)
          .returning();

        if (!result || result.length === 0) {
          throw new AppError('Failed to create project sub element', 500);
        }

        return result[0];
      },
      'createSubElement',
      { projectId: element.projectId }
    );
  }

  /**
   * Met à jour un sous-élément
   * 
   * @param id - ID du sous-élément
   * @param data - Données à mettre à jour
   * @param tx - Transaction optionnelle
   * @returns Le sous-élément mis à jour
   */
  async updateSubElement(
    id: string,
    data: Partial<ProjectSubElementInsert>,
    tx?: DrizzleTransaction
  ): Promise<ProjectSubElement> {
    const normalizedId = this.normalizeId(id);
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const result = await dbToUse
          .update(projectSubElements)
          .set({ ...data, updatedAt: new Date() })
          .where(eq(projectSubElements.id, normalizedId))
          .returning();

        if (!result || result.length === 0) {
          throw new AppError(`Project sub element with ID ${normalizedId} not found`, 500);
        }

        return result[0];
      },
      'updateSubElement',
      { subElementId: normalizedId }
    );
  }

  /**
   * Supprime un sous-élément
   * 
   * @param id - ID du sous-élément
   * @param tx - Transaction optionnelle
   * @returns Nombre de sous-éléments supprimés
   */
  async deleteSubElement(id: string, tx?: DrizzleTransaction): Promise<number> {
    const normalizedId = this.normalizeId(id);
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const result = await dbToUse
          .delete(projectSubElements)
          .where(eq(projectSubElements.id, normalizedId));

        return result.rowCount || 0;
      },
      'deleteSubElement',
      { subElementId: normalizedId }
    );
  }

  // ========================================
  // HELPER METHODS
  // ========================================

  /**
   * Construit les conditions WHERE pour le filtrage
   * 
   * @param filters - Filtres à appliquer
   * @returns Array de conditions Drizzle
   */
  protected buildWhereConditions(filters?: ProjectFilters): SQL[] {
    if (!filters) return [];

    const conditions: SQL[] = [];

    if (filters.status) {
      conditions.push(eq(projects.status, filters.status as typeof projects.status.enumValues[number]));
    }

    if (filters.responsibleUserId) {
      const normalizedUserId = this.normalizeId(filters.responsibleUserId);
      conditions.push(eq(projects.responsibleUserId, normalizedUserId));
    }

    if (filters.offerId) {
      const normalizedOfferId = this.normalizeId(filters.offerId);
      conditions.push(eq(projects.offerId, normalizedOfferId));
    }

    if (filters.search) {
      const searchPattern = `%${filters.search}%`;
      conditions.push(
        or(
          ilike(projects.name, searchPattern),
          ilike(projects.client, searchPattern),
          ilike(projects.location, searchPattern)
        )
      );
    }

    if (filters.dateFrom) {
      const fromDate = typeof filters.dateFrom === 'string' ? new Date(filters.dateFrom) : filters.dateFrom;
      conditions.push(gte(projects.startDate, fromDate));
    }

    if (filters.dateTo) {
      const toDate = typeof filters.dateTo === 'string' ? new Date(filters.dateTo) : filters.dateTo;
      conditions.push(lte(projects.endDate, toDate));
    }

    return conditions;
  }

  /**
   * Compte le nombre de projets correspondant aux filtres
   * 
   * @param filters - Filtres de recherche
   * @param tx - Transaction optionnelle
   * @returns Nombre de projets
   */
  async count(filters?: ProjectFilters, tx?: DrizzleTransaction): Promise<number> {
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
   * Supprime plusieurs projets selon des filtres
   * 
   * @param filters - Filtres pour identifier les projets à supprimer
   * @param tx - Transaction optionnelle
   * @returns Nombre de projets supprimés
   */
  async deleteMany(filters: ProjectFilters, tx?: DrizzleTransaction): Promise<number> {
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const conditions = this.buildWhereConditions(filters);
        if (conditions.length === 0) {
          throw new AppError('Cannot delete all projects without filters - safety check', 500);
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
   * Vérifie si un projet existe
   * 
   * @param id - ID du projet
   * @param tx - Transaction optionnelle
   * @returns true si le projet existe, false sinon
   */
  async exists(id: string, tx?: DrizzleTransaction): Promise<boolean> {
    const normalizedId = this.normalizeId(id);
    const dbToUse = this.getDb(tx);

    return this.executeQuery(
      async () => {
        const result = await dbToUse
          .select({ id: this.primaryKey })
          .from(this.table)
          .where(eq(this.primaryKey, normalizedId))
          .limit(1);

        return result.length > 0;
      },
      'exists',
      { projectId: normalizedId }
    );
  }
