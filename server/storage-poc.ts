import { eq, desc, and, sql } from "drizzle-orm";
import { 
  users, aos, offers, projects, projectTasks, supplierRequests, teamResources, beWorkload,
  type User, type UpsertUser, 
  type Ao, type InsertAo,
  type Offer, type InsertOffer,
  type Project, type InsertProject,
  type ProjectTask, type InsertProjectTask,
  type SupplierRequest, type InsertSupplierRequest,
  type TeamResource, type InsertTeamResource,
  type BeWorkload, type InsertBeWorkload
} from "@shared/schema";
import { db } from "./db";

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
    const [newAo] = await db.insert(aos).values(ao).returning();
    return newAo;
  }

  // Offer operations (cœur du POC)
  async getOffers(search?: string, status?: string): Promise<(Offer & { responsibleUser?: User; ao?: Ao })[]> {
    let baseQuery = db.select().from(offers).orderBy(desc(offers.createdAt));

    // Apply filters if provided
    if (status) {
      baseQuery = baseQuery.where(eq(offers.status, status as any));
    }

    const baseOffers = await baseQuery;

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
    let query = db.select().from(supplierRequests).orderBy(desc(supplierRequests.createdAt));
    
    if (offerId) {
      query = query.where(eq(supplierRequests.offerId, offerId));
    }
    
    return await query;
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
    let query = db.select().from(teamResources).orderBy(desc(teamResources.createdAt));

    if (projectId) {
      query = query.where(eq(teamResources.projectId, projectId));
    }

    const baseResources = await query;

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
    let query = db.select().from(beWorkload).orderBy(beWorkload.year, beWorkload.weekNumber);

    if (weekNumber && year) {
      query = query.where(and(
        eq(beWorkload.weekNumber, weekNumber),
        eq(beWorkload.year, year)
      ));
    }

    const baseWorkload = await query;

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
}

// Export default instance
export const storage = new DatabaseStorage();