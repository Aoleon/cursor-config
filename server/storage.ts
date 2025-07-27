import {
  users,
  offers,
  projects,
  aos,
  supplierRequests,
  quotations,
  projectTasks,
  beWorkload,
  validationMilestones,
  type User,
  type UpsertUser,
  type Offer,
  type InsertOffer,
  type Project,
  type InsertProject,
  type Ao,
  type InsertAo,
  type SupplierRequest,
  type InsertSupplierRequest,
  type Quotation,
  type InsertQuotation,
  type ProjectTask,
  type InsertProjectTask,
  type BeWorkload,
  type InsertBeWorkload,
  type ValidationMilestone,
  type InsertValidationMilestone,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc, count, and, or, like, sql } from "drizzle-orm";

export interface IStorage {
  // User operations  
  getUsers(): Promise<User[]>;
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // AO operations
  getAos(): Promise<Ao[]>;
  getAo(id: string): Promise<Ao | undefined>;
  createAo(ao: InsertAo): Promise<Ao>;
  
  // Offer operations
  getOffers(search?: string, status?: string): Promise<(Offer & { responsibleUser?: User; ao?: Ao })[]>;
  getOffer(id: string): Promise<(Offer & { responsibleUser?: User; ao?: Ao }) | undefined>;
  createOffer(offer: InsertOffer): Promise<Offer>;
  updateOffer(id: string, offer: Partial<InsertOffer>): Promise<Offer>;
  deleteOffer(id: string): Promise<void>;
  
  // Project operations
  getProjects(): Promise<(Project & { responsibleUser?: User; offer?: Offer })[]>;
  getProject(id: string): Promise<(Project & { responsibleUser?: User; offer?: Offer }) | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, project: Partial<InsertProject>): Promise<Project>;
  
  // Project task operations
  getProjectTasks(projectId: string): Promise<(ProjectTask & { assignedUser?: User })[]>;
  createProjectTask(task: InsertProjectTask): Promise<ProjectTask>;
  updateProjectTask(id: string, task: Partial<InsertProjectTask>): Promise<ProjectTask>;
  
  // Supplier request operations
  getSupplierRequests(offerId?: string): Promise<SupplierRequest[]>;
  createSupplierRequest(request: InsertSupplierRequest): Promise<SupplierRequest>;
  updateSupplierRequest(id: string, request: Partial<InsertSupplierRequest>): Promise<SupplierRequest>;
  
  // Quotation operations
  getQuotations(offerId?: string): Promise<Quotation[]>;
  createQuotation(quotation: InsertQuotation): Promise<Quotation>;
  updateQuotation(id: string, quotation: Partial<InsertQuotation>): Promise<Quotation>;
  
  // BE Workload operations - Solve "Aucune mesure de charge BE" issue
  getBeWorkload(weekNumber?: number, year?: number): Promise<(BeWorkload & { user?: User })[]>;
  createOrUpdateBeWorkload(workload: InsertBeWorkload): Promise<BeWorkload>;
  
  // Validation Milestones operations - Solve "Absence de jalon Fin d'études" issue  
  getValidationMilestones(offerId?: string, projectId?: string): Promise<(ValidationMilestone & { validator?: User })[]>;
  createValidationMilestone(milestone: InsertValidationMilestone): Promise<ValidationMilestone>;
  getAllValidationMilestones(): Promise<(ValidationMilestone & { assignedUser?: User; offer?: Offer })[]>;
  getValidationMilestonesByOffer(offerId: string): Promise<(ValidationMilestone & { assignedUser?: User })[]>;
  updateValidationMilestone(id: string, milestone: any): Promise<ValidationMilestone>;
  
  // Dashboard statistics
  getDashboardStats(): Promise<{
    totalOffers: number;
    offersInPricing: number;
    offersPendingValidation: number;
    beLoad: number;
  }>;
}

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
    const result = await db.select({
      id: aos.id,
      reference: aos.reference,
      client: aos.client,
      location: aos.location,
      departement: aos.departement,
      description: aos.description,
      menuiserieType: aos.menuiserieType,
      estimatedAmount: aos.estimatedAmount,
      maitreOeuvre: aos.maitreOeuvre,
      source: aos.source,
      dateOS: aos.dateOS,
      delaiContractuel: aos.delaiContractuel,
      cctp: aos.cctp,
      dpgf: aos.dpgf,
      isSelected: aos.isSelected,
      selectionComment: aos.selectionComment,
      createdAt: aos.createdAt,
      updatedAt: aos.updatedAt,
      submissionDeadline: aos.submissionDeadline
    }).from(aos).where(eq(aos.id, id));
    return result[0];
  }

  async createAo(ao: InsertAo): Promise<Ao> {
    const [created] = await db.insert(aos).values(ao).returning();
    return created;
  }

  // Offer operations
  async getOffers(search?: string, status?: string): Promise<(Offer & { responsibleUser?: User; ao?: Ao })[]> {    
    // Simplified query to avoid TypeScript errors
    const result = await db.select().from(offers).orderBy(desc(offers.createdAt));
    
    // Add related data separately to avoid complex join issues
    const enrichedOffers = await Promise.all(
      result.map(async (offer) => {
        const responsibleUser = offer.responsibleUserId 
          ? await this.getUser(offer.responsibleUserId)
          : undefined;
        const ao = offer.aoId 
          ? await this.getAo(offer.aoId) 
          : undefined;
        
        return {
          ...offer,
          responsibleUser,
          ao,
        };
      })
    );

    // Apply filtering
    let filteredOffers = enrichedOffers;
    
    if (search) {
      filteredOffers = filteredOffers.filter(offer =>
        offer.reference.toLowerCase().includes(search.toLowerCase()) ||
        offer.client.toLowerCase().includes(search.toLowerCase()) ||
        offer.location.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    if (status && status !== "tous") {
      filteredOffers = filteredOffers.filter(offer => offer.status === status);
    }
    
    return filteredOffers;
  }


  async getOffer(id: string): Promise<(Offer & { responsibleUser?: User; ao?: Ao }) | undefined> {
    const [result] = await db
      .select({
        id: offers.id,
        reference: offers.reference,
        aoId: offers.aoId,
        client: offers.client,
        location: offers.location,
        menuiserieType: offers.menuiserieType,
        estimatedAmount: offers.estimatedAmount,
        status: offers.status,
        responsibleUserId: offers.responsibleUserId,
        deadline: offers.deadline,
        isPriority: offers.isPriority,
        createdAt: offers.createdAt,
        updatedAt: offers.updatedAt,
        responsibleUser: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
          role: users.role,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        },
        ao: {
          id: aos.id,
          reference: aos.reference,
          client: aos.client,
          location: aos.location,
          description: aos.description,
          menuiserieType: aos.menuiserieType,
          estimatedAmount: aos.estimatedAmount,
          maitreOeuvre: aos.maitreOeuvre,
          createdAt: aos.createdAt,
          updatedAt: aos.updatedAt,
        },
      })
      .from(offers)
      .leftJoin(users, eq(offers.responsibleUserId, users.id))
      .leftJoin(aos, eq(offers.aoId, aos.id))
      .where(eq(offers.id, id));

    if (!result) return undefined;

    return {
      ...result,
      responsibleUser: result.responsibleUser?.id ? result.responsibleUser : undefined,
      ao: result.ao?.id ? result.ao : undefined,
    };
  }

  async createOffer(offer: InsertOffer): Promise<Offer> {
    const [created] = await db.insert(offers).values(offer).returning();
    return created;
  }

  async updateOffer(id: string, offer: Partial<InsertOffer>): Promise<Offer> {
    const [updated] = await db
      .update(offers)
      .set({ ...offer, updatedAt: new Date() })
      .where(eq(offers.id, id))
      .returning();
    return updated;
  }

  async deleteOffer(id: string): Promise<void> {
    await db.delete(offers).where(eq(offers.id, id));
  }

  // Project operations
  async getProjects(): Promise<(Project & { responsibleUser?: User; offer?: Offer })[]> {
    // Simplified query to avoid TypeScript errors
    const result = await db.select().from(projects).orderBy(desc(projects.createdAt));
    
    // Add related data separately 
    const enrichedProjects = await Promise.all(
      result.map(async (project) => {
        const responsibleUser = project.responsibleUserId 
          ? await this.getUser(project.responsibleUserId) 
          : undefined;
        const offer = project.offerId 
          ? await this.getOffer(project.offerId) 
          : undefined;
        
        return {
          ...project,
          responsibleUser,
          offer,
        };
      })
    );
    
    return enrichedProjects;
  }

  async getProject(id: string): Promise<(Project & { responsibleUser?: User; offer?: Offer }) | undefined> {
    const [result] = await db
      .select({
        id: projects.id,
        offerId: projects.offerId,
        name: projects.name,
        client: projects.client,
        location: projects.location,
        status: projects.status,
        startDate: projects.startDate,
        endDate: projects.endDate,
        budget: projects.budget,
        responsibleUserId: projects.responsibleUserId,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
        responsibleUser: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
          role: users.role,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        },
        offer: {
          id: offers.id,
          reference: offers.reference,
          aoId: offers.aoId,
          client: offers.client,
          location: offers.location,
          menuiserieType: offers.menuiserieType,
          estimatedAmount: offers.estimatedAmount,
          status: offers.status,
          responsibleUserId: offers.responsibleUserId,
          deadline: offers.deadline,
          isPriority: offers.isPriority,
          createdAt: offers.createdAt,
          updatedAt: offers.updatedAt,
        },
      })
      .from(projects)
      .leftJoin(users, eq(projects.responsibleUserId, users.id))
      .leftJoin(offers, eq(projects.offerId, offers.id))
      .where(eq(projects.id, id));

    if (!result) return undefined;

    return {
      ...result,
      responsibleUser: result.responsibleUser?.id ? result.responsibleUser : undefined,
      offer: result.offer?.id ? result.offer : undefined,
    };
  }

  async createProject(project: InsertProject): Promise<Project> {
    const [created] = await db.insert(projects).values(project).returning();
    return created;
  }

  async updateProject(id: string, project: Partial<InsertProject>): Promise<Project> {
    const [updated] = await db
      .update(projects)
      .set({ ...project, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return updated;
  }

  // Project task operations
  async getProjectTasks(projectId: string): Promise<(ProjectTask & { assignedUser?: User })[]> {
    const result = await db
      .select({
        id: projectTasks.id,
        projectId: projectTasks.projectId,
        name: projectTasks.name,
        description: projectTasks.description,
        startDate: projectTasks.startDate,
        endDate: projectTasks.endDate,
        assignedUserId: projectTasks.assignedUserId,
        status: projectTasks.status,
        progress: projectTasks.progress,
        createdAt: projectTasks.createdAt,
        updatedAt: projectTasks.updatedAt,
        assignedUser: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
          role: users.role,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        },
      })
      .from(projectTasks)
      .leftJoin(users, eq(projectTasks.assignedUserId, users.id))
      .where(eq(projectTasks.projectId, projectId))
      .orderBy(asc(projectTasks.startDate));

    return result.map(row => ({
      ...row,
      assignedUser: row.assignedUser?.id ? row.assignedUser : undefined,
    }));
  }

  async createProjectTask(task: InsertProjectTask): Promise<ProjectTask> {
    const [created] = await db.insert(projectTasks).values(task).returning();
    return created;
  }

  async updateProjectTask(id: string, task: Partial<InsertProjectTask>): Promise<ProjectTask> {
    const [updated] = await db
      .update(projectTasks)
      .set({ ...task, updatedAt: new Date() })
      .where(eq(projectTasks.id, id))
      .returning();
    return updated;
  }

  // Supplier request operations
  async getSupplierRequests(offerId?: string): Promise<SupplierRequest[]> {
    if (offerId) {
      return await db
        .select()
        .from(supplierRequests)
        .where(eq(supplierRequests.offerId, offerId))
        .orderBy(desc(supplierRequests.createdAt));
    }
    
    return await db
      .select()
      .from(supplierRequests)
      .orderBy(desc(supplierRequests.createdAt));
  }

  async createSupplierRequest(request: InsertSupplierRequest): Promise<SupplierRequest> {
    const [created] = await db.insert(supplierRequests).values(request).returning();
    return created;
  }

  async updateSupplierRequest(id: string, request: Partial<InsertSupplierRequest>): Promise<SupplierRequest> {
    const [updated] = await db
      .update(supplierRequests)
      .set({ ...request, updatedAt: new Date() })
      .where(eq(supplierRequests.id, id))
      .returning();
    return updated;
  }

  // Quotation operations
  async getQuotations(offerId?: string): Promise<Quotation[]> {
    if (offerId) {
      return await db
        .select()
        .from(quotations)
        .where(eq(quotations.offerId, offerId))
        .orderBy(desc(quotations.createdAt));
    }
    
    return await db
      .select()
      .from(quotations)
      .orderBy(desc(quotations.createdAt));
  }

  async createQuotation(quotation: InsertQuotation): Promise<Quotation> {
    const [created] = await db.insert(quotations).values(quotation).returning();
    return created;
  }

  async updateQuotation(id: string, quotation: Partial<InsertQuotation>): Promise<Quotation> {
    const [updated] = await db
      .update(quotations)
      .set({ ...quotation, updatedAt: new Date() })
      .where(eq(quotations.id, id))
      .returning();
    return updated;
  }

  // Dashboard statistics
  async getDashboardStats(): Promise<{
    totalOffers: number;
    offersInPricing: number;
    offersPendingValidation: number;
    beLoad: number;
  }> {
    const [totalOffers] = await db
      .select({ count: count() })
      .from(offers);

    const [offersInPricing] = await db
      .select({ count: count() })
      .from(offers)
      .where(eq(offers.status, "en_chiffrage"));

    const [offersPendingValidation] = await db
      .select({ count: count() })
      .from(offers)
      .where(eq(offers.status, "en_validation"));

    // Simple BE load calculation based on active offers
    const beLoad = Math.min(100, Math.round((totalOffers.count / 30) * 100));

    return {
      totalOffers: totalOffers.count,
      offersInPricing: offersInPricing.count,
      offersPendingValidation: offersPendingValidation.count,
      beLoad,
    };
  }

  // BE Workload operations - Solve "Aucune mesure de charge BE" issue from audit
  async getBeWorkload(weekNumber?: number, year?: number): Promise<(BeWorkload & { user?: User })[]> {
    let query = db
      .select({
        id: beWorkload.id,
        userId: beWorkload.userId,
        weekNumber: beWorkload.weekNumber,
        year: beWorkload.year,
        plannedHours: beWorkload.plannedHours,
        actualHours: beWorkload.actualHours,
        capacityHours: beWorkload.capacityHours,
        loadPercentage: beWorkload.loadPercentage,
        createdAt: beWorkload.createdAt,
        updatedAt: beWorkload.updatedAt,
        user: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
          role: users.role,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        },
      })
      .from(beWorkload)
      .leftJoin(users, eq(beWorkload.userId, users.id));

    const conditions = [];
    if (weekNumber) conditions.push(eq(beWorkload.weekNumber, weekNumber));
    if (year) conditions.push(eq(beWorkload.year, year));
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const result = await query.orderBy(asc(users.firstName));

    return result.map(row => ({
      ...row,
      user: row.user?.id ? row.user : undefined,
    }));
  }

  // Add missing methods for validation milestones
  async updateValidationMilestone(id: string, updates: Partial<InsertValidationMilestone>): Promise<ValidationMilestone> {
    const [updated] = await db
      .update(validationMilestones)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(validationMilestones.id, id))
      .returning();
    return updated;
  }

  async deleteValidationMilestone(id: string): Promise<void> {
    await db.delete(validationMilestones).where(eq(validationMilestones.id, id));
  }

  async createOrUpdateBeWorkload(workload: InsertBeWorkload): Promise<BeWorkload> {
    // Try to find existing record for user/week/year
    const existing = await db
      .select()
      .from(beWorkload)
      .where(
        and(
          eq(beWorkload.userId, workload.userId),
          eq(beWorkload.weekNumber, workload.weekNumber),
          eq(beWorkload.year, workload.year)
        )
      );

    if (existing.length > 0) {
      // Update existing record
      const [updated] = await db
        .update(beWorkload)
        .set({
          ...workload,
          loadPercentage: workload.capacityHours > 0 
            ? (workload.plannedHours / workload.capacityHours) * 100 
            : 0,
          updatedAt: new Date()
        })
        .where(eq(beWorkload.id, existing[0].id))
        .returning();
      return updated;
    } else {
      // Create new record
      const [created] = await db
        .insert(beWorkload)
        .values({
          ...workload,
          loadPercentage: workload.capacityHours > 0 
            ? (workload.plannedHours / workload.capacityHours) * 100 
            : 0
        })
        .returning();
      return created;
    }
  }

  // Validation Milestones operations - Solve "Absence de jalon Fin d'études" issue from audit
  async getValidationMilestones(offerId?: string, projectId?: string): Promise<(ValidationMilestone & { validator?: User })[]> {
    let query = db
      .select({
        id: validationMilestones.id,
        offerId: validationMilestones.offerId,
        projectId: validationMilestones.projectId,
        type: validationMilestones.type,
        validatedAt: validationMilestones.validatedAt,
        validatedBy: validationMilestones.validatedBy,
        comment: validationMilestones.comment,
        blockers: validationMilestones.blockers,
        createdAt: validationMilestones.createdAt,
        validator: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
          role: users.role,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        },
      })
      .from(validationMilestones)
      .leftJoin(users, eq(validationMilestones.validatedBy, users.id));

    const conditions = [];
    if (offerId) conditions.push(eq(validationMilestones.offerId, offerId));
    if (projectId) conditions.push(eq(validationMilestones.projectId, projectId));
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const result = await query.orderBy(desc(validationMilestones.validatedAt));

    return result.map(row => ({
      ...row,
      validator: row.validator?.id ? row.validator : undefined,
    }));
  }

  async createValidationMilestone(milestone: InsertValidationMilestone): Promise<ValidationMilestone> {
    const [created] = await db
      .insert(validationMilestones)
      .values(milestone)
      .returning();
    return created;
  }

  async getAllValidationMilestones(): Promise<(ValidationMilestone & { assignedUser?: User; offer?: Offer })[]> {
    const results = await db.select({
      milestone: validationMilestones,
      assignedUser: users,
      offer: offers
    })
    .from(validationMilestones)
    .leftJoin(users, eq(validationMilestones.assignedUserId, users.id))
    .leftJoin(offers, eq(validationMilestones.offerId, offers.id))
    .orderBy(desc(validationMilestones.createdAt));

    return results.map(row => ({
      ...row.milestone,
      assignedUser: row.assignedUser || undefined,
      offer: row.offer || undefined
    }));
  }

  async getValidationMilestonesByOffer(offerId: string): Promise<(ValidationMilestone & { assignedUser?: User })[]> {
    const results = await db.select({
      milestone: validationMilestones,
      assignedUser: users
    })
    .from(validationMilestones)
    .leftJoin(users, eq(validationMilestones.assignedUserId, users.id))
    .where(eq(validationMilestones.offerId, offerId))
    .orderBy(desc(validationMilestones.createdAt));

    return results.map(row => ({
      ...row.milestone,
      assignedUser: row.assignedUser || undefined
    }));
  }
}

export const storage = new DatabaseStorage();
