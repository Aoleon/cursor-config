import { eq, desc, and, sql, gte, lte, count, sum, avg } from "drizzle-orm";
import { 
  users, aos, offers, projects, projectTasks, supplierRequests, teamResources, beWorkload,
  chiffrageElements, dpgfDocuments, aoLots, maitresOuvrage, maitresOeuvre, contactsMaitreOeuvre,
  validationMilestones,
  type User, type UpsertUser, 
  type Ao, type InsertAo,
  type Offer, type InsertOffer,
  type Project, type InsertProject,
  type ProjectTask, type InsertProjectTask,
  type SupplierRequest, type InsertSupplierRequest,
  type TeamResource, type InsertTeamResource,
  type BeWorkload, type InsertBeWorkload,
  type ChiffrageElement, type InsertChiffrageElement,
  type DpgfDocument, type InsertDpgfDocument,
  type AoLot, type InsertAoLot,
  type MaitreOuvrage, type InsertMaitreOuvrage,
  type MaitreOeuvre, type InsertMaitreOeuvre,
  type ContactMaitreOeuvre, type InsertContactMaitreOeuvre,
  type ValidationMilestone, type InsertValidationMilestone
} from "@shared/schema";
import { db } from "./db";

// ========================================
// TYPES POUR KPIs CONSOLIDÉS
// ========================================

export interface ConsolidatedKpis {
  periodSummary: {
    conversionRate: number;
    forecastRevenue: number;
    teamLoadPercentage: number;
    averageDelayDays: number;
    expectedMarginPercentage: number;
    totalDelayedTasks: number;
    totalOffers: number;
    totalWonOffers: number;
  };
  breakdowns: {
    conversionByUser: Record<string, { rate: number; offersCount: number; wonCount: number }>;
    loadByUser: Record<string, { percentage: number; hours: number; capacity: number }>;
    marginByCategory: Record<string, number>;
  };
  timeSeries: Array<{
    date: string;
    offersCreated: number;
    offersWon: number;
    forecastRevenue: number;
    teamLoadHours: number;
  }>;
}

// ========================================
// INTERFACE DE STOCKAGE POC UNIQUEMENT
// ========================================

export interface IStorage {
  // User operations
  getUsers(): Promise<User[]>;
  getUser(id: string): Promise<User | undefined>;
  upsertUser(userData: UpsertUser): Promise<User>;
  
  // AO operations - Base pour éviter double saisie
  getAos(): Promise<Ao[]>;
  getAo(id: string): Promise<Ao | undefined>;
  createAo(ao: InsertAo): Promise<Ao>;
  updateAo(id: string, ao: Partial<InsertAo>): Promise<Ao>;
  
  // Offer operations - Cœur du POC
  getOffers(search?: string, status?: string): Promise<(Offer & { responsibleUser?: User; ao?: Ao })[]>;
  getOffer(id: string): Promise<(Offer & { responsibleUser?: User; ao?: Ao }) | undefined>;
  createOffer(offer: InsertOffer): Promise<Offer>;
  updateOffer(id: string, offer: Partial<InsertOffer>): Promise<Offer>;
  deleteOffer(id: string): Promise<void>;
  
  // Project operations - 5 étapes POC
  getProjects(): Promise<(Project & { responsibleUser?: User; offer?: Offer })[]>;
  getProject(id: string): Promise<(Project & { responsibleUser?: User; offer?: Offer }) | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, project: Partial<InsertProject>): Promise<Project>;
  
  // Project task operations - Planning partagé
  getProjectTasks(projectId: string): Promise<(ProjectTask & { assignedUser?: User })[]>;
  getAllTasks(): Promise<(ProjectTask & { assignedUser?: User })[]>;
  createProjectTask(task: InsertProjectTask): Promise<ProjectTask>;
  updateProjectTask(id: string, task: Partial<InsertProjectTask>): Promise<ProjectTask>;
  
  // Supplier request operations - Demandes prix simplifiées
  getSupplierRequests(offerId?: string): Promise<SupplierRequest[]>;
  createSupplierRequest(request: InsertSupplierRequest): Promise<SupplierRequest>;
  updateSupplierRequest(id: string, request: Partial<InsertSupplierRequest>): Promise<SupplierRequest>;
  
  // Team resource operations - Gestion équipes simplifiée
  getTeamResources(projectId?: string): Promise<(TeamResource & { user?: User })[]>;
  createTeamResource(resource: InsertTeamResource): Promise<TeamResource>;
  updateTeamResource(id: string, resource: Partial<InsertTeamResource>): Promise<TeamResource>;
  
  // BE Workload operations - Indicateurs charge BE
  getBeWorkload(weekNumber?: number, year?: number): Promise<(BeWorkload & { user?: User })[]>;
  createOrUpdateBeWorkload(workload: InsertBeWorkload): Promise<BeWorkload>;
  
  // Dashboard statistics POC
  getDashboardStats(): Promise<{
    totalOffers: number;
    offersInPricing: number;
    offersPendingValidation: number;
    beLoad: number;
  }>;

  // KPI consolidés avec métriques de performance temps réel
  getConsolidatedKpis(params: {
    from: string;      // ISO date
    to: string;        // ISO date  
    granularity: 'day' | 'week';
    segment?: string;   // Pour futures segmentations (BE, région, etc.)
  }): Promise<ConsolidatedKpis>;
  
  // Chiffrage Elements operations - Module de chiffrage POC
  getChiffrageElementsByOffer(offerId: string): Promise<ChiffrageElement[]>;
  createChiffrageElement(element: InsertChiffrageElement): Promise<ChiffrageElement>;
  updateChiffrageElement(id: string, element: Partial<InsertChiffrageElement>): Promise<ChiffrageElement>;
  deleteChiffrageElement(id: string): Promise<void>;
  
  // DPGF Documents operations - Document Provisoire de Gestion Financière POC
  getDpgfDocumentByOffer(offerId: string): Promise<DpgfDocument | null>;
  createDpgfDocument(dpgf: InsertDpgfDocument): Promise<DpgfDocument>;
  updateDpgfDocument(id: string, dpgf: Partial<InsertDpgfDocument>): Promise<DpgfDocument>;
  deleteDpgfDocument(id: string): Promise<void>;
  
  // AO Lots operations - Gestion des lots d'AO
  getAoLots(aoId: string): Promise<AoLot[]>;
  createAoLot(lot: InsertAoLot): Promise<AoLot>;
  updateAoLot(id: string, lot: Partial<InsertAoLot>): Promise<AoLot>;
  deleteAoLot(id: string): Promise<void>;
  
  // Maîtres d'ouvrage operations
  getMaitresOuvrage(): Promise<MaitreOuvrage[]>;
  getMaitreOuvrage(id: string): Promise<MaitreOuvrage | undefined>;
  createMaitreOuvrage(maitreOuvrage: InsertMaitreOuvrage): Promise<MaitreOuvrage>;
  updateMaitreOuvrage(id: string, maitreOuvrage: Partial<InsertMaitreOuvrage>): Promise<MaitreOuvrage>;
  deleteMaitreOuvrage(id: string): Promise<void>;
  
  // Maîtres d'œuvre operations
  getMaitresOeuvre(): Promise<(MaitreOeuvre & { contacts?: ContactMaitreOeuvre[] })[]>;
  getMaitreOeuvre(id: string): Promise<(MaitreOeuvre & { contacts?: ContactMaitreOeuvre[] }) | undefined>;
  createMaitreOeuvre(maitreOeuvre: InsertMaitreOeuvre): Promise<MaitreOeuvre>;
  updateMaitreOeuvre(id: string, maitreOeuvre: Partial<InsertMaitreOeuvre>): Promise<MaitreOeuvre>;
  deleteMaitreOeuvre(id: string): Promise<void>;
  
  // Contacts maître d'œuvre operations
  getContactsMaitreOeuvre(maitreOeuvreId: string): Promise<ContactMaitreOeuvre[]>;
  createContactMaitreOeuvre(contact: InsertContactMaitreOeuvre): Promise<ContactMaitreOeuvre>;
  updateContactMaitreOeuvre(id: string, contact: Partial<InsertContactMaitreOeuvre>): Promise<ContactMaitreOeuvre>;
  deleteContactMaitreOeuvre(id: string): Promise<void>;
  
  // Validation Milestones operations - Jalons de validation
  getValidationMilestones(offerId: string): Promise<ValidationMilestone[]>;
  createValidationMilestone(milestone: InsertValidationMilestone): Promise<ValidationMilestone>;
  updateValidationMilestone(id: string, milestone: Partial<InsertValidationMilestone>): Promise<ValidationMilestone>;
  deleteValidationMilestone(id: string): Promise<void>;
  
  // Additional helper methods for conversion workflow
  getOfferById(id: string): Promise<Offer | undefined>;
  getProjectsByOffer(offerId: string): Promise<Project[]>;
}

// ========================================
// IMPLÉMENTATION STORAGE POC
// ========================================

export class DatabaseStorage implements IStorage {
  // User operations
  async getUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
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
  }

  // AO operations
  async getAos(): Promise<Ao[]> {
    return await db.select().from(aos).orderBy(desc(aos.createdAt));
  }

  async getAo(id: string): Promise<Ao | undefined> {
    const [ao] = await db.select().from(aos).where(eq(aos.id, id));
    return ao;
  }

  async createAo(ao: InsertAo): Promise<Ao> {
    try {
      const [newAo] = await db.insert(aos).values(ao).returning();
      return newAo;
    } catch (error: any) {
      // Gestion spécifique des erreurs de contrainte d'unicité PostgreSQL
      if (error.code === '23505' && error.constraint) {
        if (error.constraint.includes('reference')) {
          const duplicateError = new Error(`La référence '${ao.reference}' existe déjà. Veuillez choisir une autre référence.`);
          (duplicateError as any).code = 'DUPLICATE_REFERENCE';
          (duplicateError as any).field = 'reference';
          (duplicateError as any).value = ao.reference;
          throw duplicateError;
        }
        // Autres contraintes d'unicité si nécessaire
        const duplicateError = new Error(`Cette valeur existe déjà dans la base de données.`);
        (duplicateError as any).code = 'DUPLICATE_VALUE';
        throw duplicateError;
      }
      
      // Re-lancer l'erreur si ce n'est pas une contrainte d'unicité
      throw error;
    }
  }

  async updateAo(id: string, ao: Partial<InsertAo>): Promise<Ao> {
    const [updatedAo] = await db.update(aos)
      .set({ ...ao, updatedAt: new Date() })
      .where(eq(aos.id, id))
      .returning();
    return updatedAo;
  }

  // Offer operations (cœur du POC)
  async getOffers(search?: string, status?: string): Promise<(Offer & { responsibleUser?: User; ao?: Ao })[]> {
    // Apply filters if provided
    let baseOffers;
    if (status) {
      baseOffers = await db.select().from(offers).where(eq(offers.status, status as any)).orderBy(desc(offers.createdAt));
    } else {
      baseOffers = await db.select().from(offers).orderBy(desc(offers.createdAt));
    }

    // Fetch related data separately to avoid complex joins
    const result = [];
    for (const offer of baseOffers) {
      let responsibleUser = undefined;
      let ao = undefined;

      if (offer.responsibleUserId) {
        responsibleUser = await this.getUser(offer.responsibleUserId);
      }
      if (offer.aoId) {
        ao = await this.getAo(offer.aoId);
      }

      result.push({ ...offer, responsibleUser, ao });
    }

    return result;
  }

  async getOffer(id: string): Promise<(Offer & { responsibleUser?: User; ao?: Ao }) | undefined> {
    const [offer] = await db.select().from(offers).where(eq(offers.id, id));
    if (!offer) return undefined;

    let responsibleUser = undefined;
    let ao = undefined;

    if (offer.responsibleUserId) {
      responsibleUser = await this.getUser(offer.responsibleUserId);
    }
    if (offer.aoId) {
      ao = await this.getAo(offer.aoId);
    }

    return { ...offer, responsibleUser, ao };
  }

  async createOffer(offer: InsertOffer): Promise<Offer> {
    const [newOffer] = await db.insert(offers).values(offer).returning();
    return newOffer;
  }

  async updateOffer(id: string, offer: Partial<InsertOffer>): Promise<Offer> {
    const [updatedOffer] = await db
      .update(offers)
      .set({ ...offer, updatedAt: new Date() })
      .where(eq(offers.id, id))
      .returning();
    return updatedOffer;
  }

  async deleteOffer(id: string): Promise<void> {
    await db.delete(offers).where(eq(offers.id, id));
  }

  // Project operations (5 étapes POC)
  async getProjects(): Promise<(Project & { responsibleUser?: User; offer?: Offer })[]> {
    const baseProjects = await db.select().from(projects).orderBy(desc(projects.createdAt));

    const result = [];
    for (const project of baseProjects) {
      let responsibleUser = undefined;
      let offer = undefined;

      if (project.responsibleUserId) {
        responsibleUser = await this.getUser(project.responsibleUserId);
      }
      if (project.offerId) {
        offer = await this.getOffer(project.offerId);
      }

      result.push({ ...project, responsibleUser, offer });
    }

    return result;
  }

  async getProject(id: string): Promise<(Project & { responsibleUser?: User; offer?: Offer }) | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    if (!project) return undefined;

    let responsibleUser = undefined;
    let offer = undefined;

    if (project.responsibleUserId) {
      responsibleUser = await this.getUser(project.responsibleUserId);
    }
    if (project.offerId) {
      offer = await this.getOffer(project.offerId);
    }

    return { ...project, responsibleUser, offer };
  }

  async createProject(project: InsertProject): Promise<Project> {
    const [newProject] = await db.insert(projects).values(project).returning();
    return newProject;
  }

  async updateProject(id: string, project: Partial<InsertProject>): Promise<Project> {
    const [updatedProject] = await db
      .update(projects)
      .set({ ...project, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return updatedProject;
  }

  // Project task operations (planning partagé)
  async getProjectTasks(projectId: string): Promise<(ProjectTask & { assignedUser?: User })[]> {
    const baseTasks = await db
      .select()
      .from(projectTasks)
      .where(eq(projectTasks.projectId, projectId))
      .orderBy(projectTasks.position);

    const result = [];
    for (const task of baseTasks) {
      let assignedUser = undefined;

      if (task.assignedUserId) {
        assignedUser = await this.getUser(task.assignedUserId);
      }

      result.push({ ...task, assignedUser });
    }

    return result;
  }

  async createProjectTask(task: InsertProjectTask): Promise<ProjectTask> {
    const [newTask] = await db.insert(projectTasks).values(task).returning();
    return newTask;
  }

  async getAllTasks(): Promise<(ProjectTask & { assignedUser?: User })[]> {
    const baseTasks = await db
      .select()
      .from(projectTasks)
      .orderBy(projectTasks.startDate);

    const result = [];
    for (const task of baseTasks) {
      let assignedUser = undefined;

      if (task.assignedUserId) {
        assignedUser = await this.getUser(task.assignedUserId);
      }

      // 🔍 DEBUG - Vérifier les champs DB bruts avant mapping  
      console.log('🔍 STORAGE getAllTasks - Raw DB task:', {
        id: task.id,
        name: task.name,
        projectId: task.projectId,
        parentTaskId: task.parentTaskId,
        hasProjectId: !!task.projectId,
        hasParentTaskId: !!task.parentTaskId,
        allKeys: Object.keys(task)
      });

      result.push({ ...task, assignedUser });
    }

    console.log('🔍 STORAGE getAllTasks - Final result summary:', {
      totalTasks: result.length,
      tasksWithParentId: result.filter(t => t.parentTaskId).length,
      tasksWithProjectId: result.filter(t => t.projectId).length
    });

    return result;
  }

  async updateProjectTask(id: string, task: Partial<InsertProjectTask>): Promise<ProjectTask> {
    const [updatedTask] = await db
      .update(projectTasks)
      .set({ ...task, updatedAt: new Date() })
      .where(eq(projectTasks.id, id))
      .returning();
    return updatedTask;
  }

  // Supplier request operations (demandes prix simplifiées)
  async getSupplierRequests(offerId?: string): Promise<SupplierRequest[]> {
    if (offerId) {
      return await db.select().from(supplierRequests)
        .where(eq(supplierRequests.offerId, offerId))
        .orderBy(desc(supplierRequests.createdAt));
    }
    
    return await db.select().from(supplierRequests).orderBy(desc(supplierRequests.createdAt));
  }

  async createSupplierRequest(request: InsertSupplierRequest): Promise<SupplierRequest> {
    const [newRequest] = await db.insert(supplierRequests).values(request).returning();
    return newRequest;
  }

  async updateSupplierRequest(id: string, request: Partial<InsertSupplierRequest>): Promise<SupplierRequest> {
    const [updatedRequest] = await db
      .update(supplierRequests)
      .set({ ...request, updatedAt: new Date() })
      .where(eq(supplierRequests.id, id))
      .returning();
    return updatedRequest;
  }

  // Team resource operations (gestion équipes simplifiée)
  async getTeamResources(projectId?: string): Promise<(TeamResource & { user?: User })[]> {
    let baseResources;
    if (projectId) {
      baseResources = await db.select().from(teamResources)
        .where(eq(teamResources.projectId, projectId))
        .orderBy(desc(teamResources.createdAt));
    } else {
      baseResources = await db.select().from(teamResources).orderBy(desc(teamResources.createdAt));
    }

    const result = [];
    for (const resource of baseResources) {
      let user = undefined;

      if (resource.userId) {
        user = await this.getUser(resource.userId);
      }

      result.push({ ...resource, user });
    }

    return result;
  }

  async createTeamResource(resource: InsertTeamResource): Promise<TeamResource> {
    const [newResource] = await db.insert(teamResources).values(resource).returning();
    return newResource;
  }

  async updateTeamResource(id: string, resource: Partial<InsertTeamResource>): Promise<TeamResource> {
    const [updatedResource] = await db
      .update(teamResources)
      .set({ ...resource, updatedAt: new Date() })
      .where(eq(teamResources.id, id))
      .returning();
    return updatedResource;
  }

  // BE Workload operations (indicateurs charge BE)
  async getBeWorkload(weekNumber?: number, year?: number): Promise<(BeWorkload & { user?: User })[]> {
    let baseWorkload;
    if (weekNumber && year) {
      baseWorkload = await db.select().from(beWorkload)
        .where(and(
          eq(beWorkload.weekNumber, weekNumber),
          eq(beWorkload.year, year)
        ))
        .orderBy(beWorkload.year, beWorkload.weekNumber);
    } else {
      baseWorkload = await db.select().from(beWorkload).orderBy(beWorkload.year, beWorkload.weekNumber);
    }

    const result = [];
    for (const workload of baseWorkload) {
      const user = await this.getUser(workload.userId);
      result.push({ ...workload, user });
    }

    return result;
  }

  async createOrUpdateBeWorkload(workload: InsertBeWorkload): Promise<BeWorkload> {
    const [existingWorkload] = await db
      .select()
      .from(beWorkload)
      .where(and(
        eq(beWorkload.userId, workload.userId),
        eq(beWorkload.weekNumber, workload.weekNumber),
        eq(beWorkload.year, workload.year)
      ));

    if (existingWorkload) {
      const [updatedWorkload] = await db
        .update(beWorkload)
        .set({ ...workload, updatedAt: new Date() })
        .where(eq(beWorkload.id, existingWorkload.id))
        .returning();
      return updatedWorkload;
    } else {
      const [newWorkload] = await db.insert(beWorkload).values(workload).returning();
      return newWorkload;
    }
  }

  // Dashboard statistics POC
  async getDashboardStats(): Promise<{
    totalOffers: number;
    offersInPricing: number;
    offersPendingValidation: number;
    beLoad: number;
  }> {
    const [totalOffers] = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(offers);

    const [offersInPricing] = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(offers)
      .where(eq(offers.status, "en_cours_chiffrage"));

    const [offersPendingValidation] = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(offers)
      .where(eq(offers.status, "en_attente_validation"));

    // Calcul simplifié de la charge BE
    const [beLoadResult] = await db
      .select({ 
        avgLoad: sql<number>`cast(avg(CASE WHEN charge_level = 'surcharge' THEN 100 WHEN charge_level = 'occupe' THEN 75 ELSE 25 END) as int)` 
      })
      .from(beWorkload);

    return {
      totalOffers: totalOffers.count,
      offersInPricing: offersInPricing.count,
      offersPendingValidation: offersPendingValidation.count,
      beLoad: beLoadResult.avgLoad || 25,
    };
  }

  // KPI consolidés avec métriques de performance temps réel
  async getConsolidatedKpis(params: {
    from: string;
    to: string;
    granularity: 'day' | 'week';
    segment?: string;
  }): Promise<ConsolidatedKpis> {
    const fromDate = new Date(params.from);
    const toDate = new Date(params.to);
    
    // ========================================
    // 1. CALCUL TAUX DE CONVERSION
    // ========================================
    
    // Offres totales dans la période
    const [totalOffersInPeriod] = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(offers)
      .where(and(
        gte(offers.createdAt, fromDate),
        lte(offers.createdAt, toDate)
      ));

    // Offres gagnées dans la période (utilise updatedAt comme approximation de la date de signature)
    const [wonOffersInPeriod] = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(offers)
      .where(and(
        gte(offers.updatedAt, fromDate),
        lte(offers.updatedAt, toDate),
        sql`status IN ('signe', 'transforme_en_projet', 'termine')`
      ));

    const conversionRate = totalOffersInPeriod.count > 0 
      ? (wonOffersInPeriod.count / totalOffersInPeriod.count) * 100 
      : 0;

    // ========================================
    // 2. CA PRÉVISIONNEL (FORECAST REVENUE)
    // ========================================
    
    // Probabilités par statut selon spécifications
    const statusProbabilities = {
      'en_attente_fournisseurs': 0.2,
      'en_cours_chiffrage': 0.35,
      'en_attente_validation': 0.55,
      'fin_etudes_validee': 0.7,
      'valide': 0.85,
      'signe': 1.0
    };

    // Calcul CA prévisionnel pondéré
    const forecastRevenueQuery = await db
      .select({
        totalRevenue: sql<number>`COALESCE(SUM(
          COALESCE(montant_final, montant_propose, montant_estime, 0) * 
          CASE status
            WHEN 'en_attente_fournisseurs' THEN 0.2
            WHEN 'en_cours_chiffrage' THEN 0.35
            WHEN 'en_attente_validation' THEN 0.55
            WHEN 'fin_etudes_validee' THEN 0.7
            WHEN 'valide' THEN 0.85
            WHEN 'signe' THEN 1.0
            ELSE 0
          END
        ), 0)`
      })
      .from(offers)
      .where(and(
        gte(offers.createdAt, fromDate),
        lte(offers.createdAt, toDate),
        sql`status IN ('en_attente_fournisseurs', 'en_cours_chiffrage', 'en_attente_validation', 'fin_etudes_validee', 'valide', 'signe')`
      ));

    const forecastRevenue = forecastRevenueQuery[0]?.totalRevenue || 0;

    // ========================================
    // 3. CHARGE ÉQUIPES BE
    // ========================================
    
    // Capacité théorique (35h/semaine par BE actif)
    const [activeBeCount] = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(users)
      .where(and(
        eq(users.isActive, true),
        sql`role LIKE '%be%' OR role LIKE '%technicien%'`
      ));

    const weeksBetween = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24 * 7));
    const totalCapacityHours = (activeBeCount.count || 1) * 35 * weeksBetween;

    // Charge BE planifiée (basée sur beWorkload et heures estimées des offres)
    const [totalPlannedHours] = await db
      .select({
        totalHours: sql<number>`COALESCE(SUM(be_hours_estimated), 0)`
      })
      .from(offers)
      .where(and(
        gte(offers.createdAt, fromDate),
        lte(offers.createdAt, toDate),
        sql`be_hours_estimated IS NOT NULL`
      ));

    const teamLoadPercentage = totalCapacityHours > 0 
      ? Math.min((totalPlannedHours.totalHours / totalCapacityHours) * 100, 100)
      : 0;

    // ========================================
    // 4. INDICATEURS DE RETARDS
    // ========================================
    
    // Tâches en retard
    const [delayedTasksQuery] = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(projectTasks)
      .innerJoin(projects, eq(projectTasks.projectId, projects.id))
      .innerJoin(offers, eq(projects.offerId, offers.id))
      .where(and(
        gte(offers.createdAt, fromDate),
        lte(offers.createdAt, toDate),
        sql`(project_tasks.status = 'en_retard' OR (project_tasks.end_date IS NOT NULL AND project_tasks.end_date < NOW() AND project_tasks.status != 'termine'))`
      ));

    // Calcul moyenne des jours de retard  
    const averageDelayQuery = await db
      .select({
        avgDelay: sql<number>`COALESCE(AVG(EXTRACT(DAY FROM (NOW() - end_date))), 0)`
      })
      .from(projectTasks)
      .innerJoin(projects, eq(projectTasks.projectId, projects.id))
      .innerJoin(offers, eq(projects.offerId, offers.id))
      .where(and(
        gte(offers.createdAt, fromDate),
        lte(offers.createdAt, toDate),
        sql`(project_tasks.end_date IS NOT NULL AND project_tasks.end_date < NOW() AND project_tasks.status != 'termine')`
      ));

    const averageDelayDays = Math.max(averageDelayQuery[0]?.avgDelay || 0, 0);
    const totalDelayedTasks = delayedTasksQuery.count;

    // ========================================
    // 5. MARGE ATTENDUE
    // ========================================
    
    // Calcul marge depuis chiffrage détaillé
    const marginQuery = await db
      .select({
        totalRevenue: sql<number>`COALESCE(SUM(total_price), 0)`,
        totalCost: sql<number>`COALESCE(SUM(total_price / (1 + margin_percentage/100)), 0)`
      })
      .from(chiffrageElements)
      .innerJoin(offers, eq(chiffrageElements.offerId, offers.id))
      .where(and(
        gte(offers.createdAt, fromDate),
        lte(offers.createdAt, toDate)
      ));

    const totalRevenue = marginQuery[0]?.totalRevenue || 0;
    const totalCost = marginQuery[0]?.totalCost || 0;
    
    // Fallback sur taux_marge si pas de chiffrage détaillé
    const [fallbackMarginQuery] = await db
      .select({
        avgMargin: sql<number>`COALESCE(AVG(taux_marge), 20)`
      })
      .from(offers)
      .where(and(
        gte(offers.createdAt, fromDate),
        lte(offers.createdAt, toDate),
        sql`taux_marge IS NOT NULL`
      ));

    const expectedMarginPercentage = totalRevenue > 0 
      ? ((totalRevenue - totalCost) / totalRevenue) * 100
      : fallbackMarginQuery.avgMargin || 20;

    // ========================================
    // 6. BREAKDOWNS (analyse détaillée)
    // ========================================
    
    // Conversion par utilisateur  
    const conversionByUserQuery = await db
      .select({
        userId: offers.responsibleUserId,
        firstName: users.firstName,
        lastName: users.lastName,
        totalOffers: sql<number>`cast(count(*) as int)`,
        wonOffers: sql<number>`cast(sum(CASE WHEN status IN ('signe', 'transforme_en_projet', 'termine') THEN 1 ELSE 0 END) as int)`
      })
      .from(offers)
      .leftJoin(users, eq(offers.responsibleUserId, users.id))
      .where(and(
        gte(offers.createdAt, fromDate),
        lte(offers.createdAt, toDate)
      ))
      .groupBy(offers.responsibleUserId, users.firstName, users.lastName);

    const conversionByUser: Record<string, { rate: number; offersCount: number; wonCount: number }> = {};
    conversionByUserQuery.forEach(row => {
      if (row.userId) {
        const userName = `${row.firstName || ''} ${row.lastName || ''}`.trim() || `User ${row.userId}`;
        conversionByUser[userName] = {
          rate: row.totalOffers > 0 ? (row.wonOffers / row.totalOffers) * 100 : 0,
          offersCount: row.totalOffers,
          wonCount: row.wonOffers
        };
      }
    });

    // Charge par utilisateur (simplifié)
    const loadByUserQuery = await db
      .select({
        userId: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        totalHours: sql<number>`COALESCE(SUM(COALESCE(be_hours_estimated, 0)), 0)`
      })
      .from(users)
      .leftJoin(offers, eq(users.id, offers.responsibleUserId))
      .where(and(
        eq(users.isActive, true),
        sql`role LIKE '%be%' OR role LIKE '%technicien%'`,
        gte(offers.createdAt, fromDate),
        lte(offers.createdAt, toDate)
      ))
      .groupBy(users.id, users.firstName, users.lastName);

    const loadByUser: Record<string, { percentage: number; hours: number; capacity: number }> = {};
    const individualCapacity = 35 * weeksBetween;
    
    loadByUserQuery.forEach(row => {
      const userName = `${row.firstName || ''} ${row.lastName || ''}`.trim() || `User ${row.userId}`;
      const percentage = individualCapacity > 0 ? Math.min((row.totalHours / individualCapacity) * 100, 100) : 0;
      loadByUser[userName] = {
        percentage,
        hours: row.totalHours,
        capacity: individualCapacity
      };
    });

    // Marge par catégorie (menuiserie)
    const marginByCategoryQuery = await db
      .select({
        category: offers.menuiserieType,
        avgMargin: sql<number>`COALESCE(AVG(
          CASE WHEN montant_final > 0 AND montant_estime > 0 
          THEN ((montant_final - montant_estime) / montant_final * 100)
          ELSE taux_marge
          END
        ), 20)`
      })
      .from(offers)
      .where(and(
        gte(offers.createdAt, fromDate),
        lte(offers.createdAt, toDate)
      ))
      .groupBy(offers.menuiserieType);

    const marginByCategory: Record<string, number> = {};
    marginByCategoryQuery.forEach(row => {
      if (row.category) {
        marginByCategory[row.category] = row.avgMargin;
      }
    });

    // ========================================
    // 7. SÉRIES TEMPORELLES
    // ========================================
    
    // Génération des dates selon granularité
    const timeSeries: Array<{
      date: string;
      offersCreated: number;
      offersWon: number;
      forecastRevenue: number;
      teamLoadHours: number;
    }> = [];

    const currentDate = new Date(fromDate);
    const incrementDays = params.granularity === 'week' ? 7 : 1;

    while (currentDate <= toDate) {
      const periodStart = new Date(currentDate);
      const periodEnd = new Date(currentDate.getTime() + (incrementDays * 24 * 60 * 60 * 1000));

      // Offres créées dans cette période
      const [offersCreatedInPeriod] = await db
        .select({ count: sql<number>`cast(count(*) as int)` })
        .from(offers)
        .where(and(
          gte(offers.createdAt, periodStart),
          lte(offers.createdAt, periodEnd)
        ));

      // Offres gagnées dans cette période (utilise updatedAt comme approximation de la date de signature)
      const [offersWonInPeriod] = await db
        .select({ count: sql<number>`cast(count(*) as int)` })
        .from(offers)
        .where(and(
          gte(offers.updatedAt, periodStart),
          lte(offers.updatedAt, periodEnd),
          sql`status IN ('signe', 'transforme_en_projet', 'terme')`
        ));

      // CA prévisionnel de la période
      const [forecastForPeriod] = await db
        .select({
          revenue: sql<number>`COALESCE(SUM(
            COALESCE(montant_final, montant_propose, montant_estime, 0) * 
            CASE status
              WHEN 'en_attente_fournisseurs' THEN 0.2
              WHEN 'en_cours_chiffrage' THEN 0.35
              WHEN 'en_attente_validation' THEN 0.55
              WHEN 'fin_etudes_validee' THEN 0.7
              WHEN 'valide' THEN 0.85
              WHEN 'signe' THEN 1.0
              ELSE 0
            END
          ), 0)`
        })
        .from(offers)
        .where(and(
          gte(offers.createdAt, periodStart),
          lte(offers.createdAt, periodEnd)
        ));

      // Charge workload de la période
      const [loadForPeriod] = await db
        .select({
          hours: sql<number>`COALESCE(SUM(be_hours_estimated), 0)`
        })
        .from(offers)
        .where(and(
          gte(offers.createdAt, periodStart),
          lte(offers.createdAt, periodEnd)
        ));

      timeSeries.push({
        date: periodStart.toISOString().split('T')[0],
        offersCreated: offersCreatedInPeriod.count,
        offersWon: offersWonInPeriod.count,
        forecastRevenue: forecastForPeriod.revenue || 0,
        teamLoadHours: loadForPeriod.hours || 0
      });

      currentDate.setTime(currentDate.getTime() + (incrementDays * 24 * 60 * 60 * 1000));
    }

    // ========================================
    // 8. RETOUR DES KPIs CONSOLIDÉS
    // ========================================
    
    return {
      periodSummary: {
        conversionRate,
        forecastRevenue,
        teamLoadPercentage,
        averageDelayDays,
        expectedMarginPercentage,
        totalDelayedTasks,
        totalOffers: totalOffersInPeriod.count,
        totalWonOffers: wonOffersInPeriod.count
      },
      breakdowns: {
        conversionByUser,
        loadByUser,
        marginByCategory
      },
      timeSeries
    };
  }

  // Chiffrage Elements operations - Module de chiffrage POC
  async getChiffrageElementsByOffer(offerId: string): Promise<ChiffrageElement[]> {
    return await db.select().from(chiffrageElements)
      .where(eq(chiffrageElements.offerId, offerId))
      .orderBy(chiffrageElements.position, chiffrageElements.createdAt);
  }

  async createChiffrageElement(element: InsertChiffrageElement): Promise<ChiffrageElement> {
    const [newElement] = await db.insert(chiffrageElements).values(element).returning();
    return newElement;
  }

  async updateChiffrageElement(id: string, element: Partial<InsertChiffrageElement>): Promise<ChiffrageElement> {
    const [updatedElement] = await db
      .update(chiffrageElements)
      .set({ ...element, updatedAt: new Date() })
      .where(eq(chiffrageElements.id, id))
      .returning();
    return updatedElement;
  }

  async deleteChiffrageElement(id: string): Promise<void> {
    await db.delete(chiffrageElements).where(eq(chiffrageElements.id, id));
  }

  // DPGF Documents operations - Document Provisoire de Gestion Financière POC
  async getDpgfDocumentByOffer(offerId: string): Promise<DpgfDocument | null> {
    const [dpgf] = await db.select().from(dpgfDocuments)
      .where(eq(dpgfDocuments.offerId, offerId))
      .orderBy(desc(dpgfDocuments.createdAt));
    return dpgf || null;
  }

  async createDpgfDocument(dpgf: InsertDpgfDocument): Promise<DpgfDocument> {
    const [newDpgf] = await db.insert(dpgfDocuments).values(dpgf).returning();
    return newDpgf;
  }

  async updateDpgfDocument(id: string, dpgf: Partial<InsertDpgfDocument>): Promise<DpgfDocument> {
    const [updatedDpgf] = await db
      .update(dpgfDocuments)
      .set({ ...dpgf, updatedAt: new Date() })
      .where(eq(dpgfDocuments.id, id))
      .returning();
    return updatedDpgf;
  }

  async deleteDpgfDocument(id: string): Promise<void> {
    await db.delete(dpgfDocuments).where(eq(dpgfDocuments.id, id));
  }

  // AO Lots operations - Gestion des lots d'AO
  async getAoLots(aoId: string): Promise<AoLot[]> {
    return await db.select().from(aoLots)
      .where(eq(aoLots.aoId, aoId))
      .orderBy(aoLots.numero);
  }

  async createAoLot(lot: InsertAoLot): Promise<AoLot> {
    const [newLot] = await db.insert(aoLots).values(lot).returning();
    return newLot;
  }

  async updateAoLot(id: string, lot: Partial<InsertAoLot>): Promise<AoLot> {
    const [updatedLot] = await db.update(aoLots)
      .set({ ...lot, updatedAt: new Date() })
      .where(eq(aoLots.id, id))
      .returning();
    return updatedLot;
  }

  async deleteAoLot(id: string): Promise<void> {
    await db.delete(aoLots).where(eq(aoLots.id, id));
  }

  // Maîtres d'ouvrage operations
  async getMaitresOuvrage(): Promise<MaitreOuvrage[]> {
    return await db.select().from(maitresOuvrage)
      .where(eq(maitresOuvrage.isActive, true))
      .orderBy(maitresOuvrage.nom);
  }

  async getMaitreOuvrage(id: string): Promise<MaitreOuvrage | undefined> {
    const [maitreOuvrage] = await db.select().from(maitresOuvrage)
      .where(eq(maitresOuvrage.id, id));
    return maitreOuvrage;
  }

  async createMaitreOuvrage(maitreOuvrageData: InsertMaitreOuvrage): Promise<MaitreOuvrage> {
    const [newMaitreOuvrage] = await db.insert(maitresOuvrage)
      .values(maitreOuvrageData)
      .returning();
    return newMaitreOuvrage;
  }

  async updateMaitreOuvrage(id: string, maitreOuvrageData: Partial<InsertMaitreOuvrage>): Promise<MaitreOuvrage> {
    const [updatedMaitreOuvrage] = await db.update(maitresOuvrage)
      .set({ ...maitreOuvrageData, updatedAt: new Date() })
      .where(eq(maitresOuvrage.id, id))
      .returning();
    return updatedMaitreOuvrage;
  }

  async deleteMaitreOuvrage(id: string): Promise<void> {
    // Soft delete
    await db.update(maitresOuvrage)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(maitresOuvrage.id, id));
  }

  // Maîtres d'œuvre operations
  async getMaitresOeuvre(): Promise<(MaitreOeuvre & { contacts?: ContactMaitreOeuvre[] })[]> {
    const maitresOeuvreList = await db.select().from(maitresOeuvre)
      .where(eq(maitresOeuvre.isActive, true))
      .orderBy(maitresOeuvre.nom);
    
    // Charger les contacts pour chaque maître d'œuvre
    const result = [];
    for (const maitreOeuvre of maitresOeuvreList) {
      const contacts = await this.getContactsMaitreOeuvre(maitreOeuvre.id);
      result.push({ ...maitreOeuvre, contacts });
    }
    
    return result;
  }

  async getMaitreOeuvre(id: string): Promise<(MaitreOeuvre & { contacts?: ContactMaitreOeuvre[] }) | undefined> {
    const [maitreOeuvre] = await db.select().from(maitresOeuvre)
      .where(eq(maitresOeuvre.id, id));
    
    if (!maitreOeuvre) return undefined;
    
    const contacts = await this.getContactsMaitreOeuvre(id);
    return { ...maitreOeuvre, contacts };
  }

  async createMaitreOeuvre(maitreOeuvreData: InsertMaitreOeuvre): Promise<MaitreOeuvre> {
    const [newMaitreOeuvre] = await db.insert(maitresOeuvre)
      .values(maitreOeuvreData)
      .returning();
    return newMaitreOeuvre;
  }

  async updateMaitreOeuvre(id: string, maitreOeuvreData: Partial<InsertMaitreOeuvre>): Promise<MaitreOeuvre> {
    const [updatedMaitreOeuvre] = await db.update(maitresOeuvre)
      .set({ ...maitreOeuvreData, updatedAt: new Date() })
      .where(eq(maitresOeuvre.id, id))
      .returning();
    return updatedMaitreOeuvre;
  }

  async deleteMaitreOeuvre(id: string): Promise<void> {
    // Soft delete
    await db.update(maitresOeuvre)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(maitresOeuvre.id, id));
  }

  // Contacts maître d'œuvre operations
  async getContactsMaitreOeuvre(maitreOeuvreId: string): Promise<ContactMaitreOeuvre[]> {
    return await db.select().from(contactsMaitreOeuvre)
      .where(and(
        eq(contactsMaitreOeuvre.maitreOeuvreId, maitreOeuvreId),
        eq(contactsMaitreOeuvre.isActive, true)
      ))
      .orderBy(contactsMaitreOeuvre.nom);
  }

  async createContactMaitreOeuvre(contactData: InsertContactMaitreOeuvre): Promise<ContactMaitreOeuvre> {
    const [newContact] = await db.insert(contactsMaitreOeuvre)
      .values(contactData)
      .returning();
    return newContact;
  }

  async updateContactMaitreOeuvre(id: string, contactData: Partial<InsertContactMaitreOeuvre>): Promise<ContactMaitreOeuvre> {
    const [updatedContact] = await db.update(contactsMaitreOeuvre)
      .set({ ...contactData, updatedAt: new Date() })
      .where(eq(contactsMaitreOeuvre.id, id))
      .returning();
    return updatedContact;
  }

  async deleteContactMaitreOeuvre(id: string): Promise<void> {
    // Soft delete
    await db.update(contactsMaitreOeuvre)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(contactsMaitreOeuvre.id, id));
  }

  // Validation Milestones operations
  async getValidationMilestones(offerId: string): Promise<ValidationMilestone[]> {
    return await db.select().from(validationMilestones)
      .where(eq(validationMilestones.offerId, offerId))
      .orderBy(validationMilestones.createdAt);
  }

  async createValidationMilestone(milestoneData: InsertValidationMilestone): Promise<ValidationMilestone> {
    const [newMilestone] = await db.insert(validationMilestones)
      .values(milestoneData)
      .returning();
    return newMilestone;
  }

  async updateValidationMilestone(id: string, milestoneData: Partial<InsertValidationMilestone>): Promise<ValidationMilestone> {
    const [updatedMilestone] = await db.update(validationMilestones)
      .set({ ...milestoneData, updatedAt: new Date() })
      .where(eq(validationMilestones.id, id))
      .returning();
    return updatedMilestone;
  }

  async deleteValidationMilestone(id: string): Promise<void> {
    await db.delete(validationMilestones)
      .where(eq(validationMilestones.id, id));
  }

  // Additional helper methods for conversion workflow
  async getOfferById(id: string): Promise<Offer | undefined> {
    const [offer] = await db.select().from(offers).where(eq(offers.id, id));
    return offer;
  }

  async getProjectsByOffer(offerId: string): Promise<Project[]> {
    return await db.select().from(projects).where(eq(projects.offerId, offerId));
  }
}

// Export default instance
export const storage = new DatabaseStorage();