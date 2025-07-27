import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  decimal,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Enums based on JLM audit real workflows - Defined first to avoid initialization errors
export const userRoleEnum = pgEnum("user_role", [
  "admin",
  "chef_projet", 
  "technicien_be",
  "responsable_be",
  "avant_vente",
  "production",
  "chef_travaux"
]);

// User storage table.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: userRoleEnum("role").default("technicien_be"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
export const offerStatusEnum = pgEnum("offer_status", [
  "nouveau",
  "en_chiffrage",
  "en_validation", 
  "valide",
  "perdu"
]);

export const projectStatusEnum = pgEnum("project_status", [
  "etude",
  "planification",
  "approvisionnement",
  "realisation",
  "sav"
]);

export const menuiserieTypeEnum = pgEnum("menuiserie_type", [
  "fenetres",
  "portes", 
  "bardage",
  "mur_rideau",
  "autre"
]);

export const aoSourceEnum = pgEnum("ao_source", [
  "BOMP",
  "Marche_Online",
  "France_Marche",
  "Contact_Direct",
  "Fournisseur"
]);

export const departementEnum = pgEnum("departement", [
  "14", "50", "62", "76", "80", "59", "autres"
]);

// AO (Appel d'Offres) table - Enhanced based on JLM audit
export const aos = pgTable("aos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reference: varchar("reference").notNull().unique(),
  client: varchar("client").notNull(),
  location: varchar("location").notNull(),
  departement: departementEnum("departement").notNull(),
  description: text("description"),
  menuiserieType: menuiserieTypeEnum("menuiserie_type").notNull(),
  estimatedAmount: decimal("estimated_amount", { precision: 12, scale: 2 }),
  maitreOeuvre: varchar("maitre_oeuvre"),
  source: aoSourceEnum("source").notNull(),
  dateOS: timestamp("date_os"),
  delaiContractuel: integer("delai_contractuel"), // en jours
  cctp: text("cctp"), // Cahier des Clauses Techniques Particulières
  dpgf: jsonb("dpgf"), // Décomposition du Prix Global et Forfaitaire
  isSelected: boolean("is_selected").default(false),
  selectionComment: text("selection_comment"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Offers table - Enhanced to solve double-entry problem identified in audit
export const offers = pgTable("offers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reference: varchar("reference").notNull().unique(),
  aoId: varchar("ao_id").references(() => aos.id),
  client: varchar("client").notNull(),
  location: varchar("location").notNull(),
  menuiserieType: menuiserieTypeEnum("menuiserie_type").notNull(),
  estimatedAmount: decimal("estimated_amount", { precision: 12, scale: 2 }),
  finalAmount: decimal("final_amount", { precision: 12, scale: 2 }),
  status: offerStatusEnum("status").default("nouveau"),
  responsibleUserId: varchar("responsible_user_id").references(() => users.id),
  deadline: timestamp("deadline"),
  isPriority: boolean("is_priority").default(false),
  
  // Champs pour résoudre le problème de double saisie Batigest -> DPGF
  dpgfData: jsonb("dpgf_data"), // Données DPGF pour éviter double saisie
  batigestRef: varchar("batigest_ref"), // Référence Batigest
  
  // Jalon "Fin d'études" manquant identifié dans l'audit
  finEtudesValidatedAt: timestamp("fin_etudes_validated_at"),
  finEtudesValidatedBy: varchar("fin_etudes_validated_by").references(() => users.id),
  
  // BE charge tracking (problème identifié : absence de mesure charge BE)
  beHoursEstimated: decimal("be_hours_estimated", { precision: 8, scale: 2 }),
  beHoursActual: decimal("be_hours_actual", { precision: 8, scale: 2 }),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Projects table - Enhanced to track real workflows from audit
export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  offerId: varchar("offer_id").references(() => offers.id),
  name: varchar("name").notNull(),
  client: varchar("client").notNull(),
  location: varchar("location").notNull(),
  status: projectStatusEnum("status").default("etude"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  budget: decimal("budget", { precision: 12, scale: 2 }),
  
  // Chef de travaux France gère 15-25 chantiers (problème identifié : single point of failure)
  responsibleUserId: varchar("responsible_user_id").references(() => users.id), // France
  chefTravaux: varchar("chef_travaux").references(() => users.id), // Explicite
  
  // PPSPS automatisé sur Monday selon audit
  ppspsGenerated: boolean("ppsps_generated").default(false),
  ppspsDate: timestamp("ppsps_date"),
  
  // Gestion des réserves (problème identifié dans SAV)
  reservesCount: integer("reserves_count").default(0),
  reservesResolved: integer("reserves_resolved").default(0),
  
  // Dates importantes pour éviter les problèmes "dates introuvables" de l'audit
  dateReception: timestamp("date_reception"),
  dateFacturation: timestamp("date_facturation"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Project tasks table - Enhanced with BE and Pose workload planning
export const projectTasks = pgTable("project_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").references(() => projects.id).notNull(),
  name: varchar("name").notNull(),
  description: text("description"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  assignedUserId: varchar("assigned_user_id").references(() => users.id),
  status: varchar("status").default("not_started"),
  progress: integer("progress").default(0),
  
  // Planification des charges par équipe
  bePersonsNeeded: integer("be_persons_needed").default(0), // Nombre de personnes BE nécessaires
  avPersonsNeeded: integer("av_persons_needed").default(0), // Nombre de personnes Avant-Vente nécessaires
  productionPersonsNeeded: integer("production_persons_needed").default(0), // Nombre de personnes Production nécessaires
  beHoursEstimated: decimal("be_hours_estimated", { precision: 8, scale: 2 }).default("0"), // Heures BE estimées
  avHoursEstimated: decimal("av_hours_estimated", { precision: 8, scale: 2 }).default("0"), // Heures AV estimées
  productionHoursEstimated: decimal("production_hours_estimated", { precision: 8, scale: 2 }).default("0"), // Heures Production estimées
  priority: varchar("priority").default("normale"), // basse, normale, haute, critique
  skills: text("skills").array().default(sql`'{}'::text[]`), // compétences requises
  
  // Gestion des handoffs et buffers pour timeline
  phase: varchar("phase").default("etude"), // etude, planification, approvisionnement, chantier, sav
  nextPhase: varchar("next_phase"), // phase suivante planifiée
  handoffDate: timestamp("handoff_date"), // date de transmission à la phase suivante
  bufferDays: integer("buffer_days").default(0), // jours de buffer avant handoff
  dependencies: text("dependencies").array().default(sql`'{}'::text[]`), // IDs des tâches précédentes
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Table pour gérer les phases de projet et leurs handoffs
export const projectPhases = pgTable("project_phases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").references(() => projects.id).notNull(),
  phase: varchar("phase").notNull(), // etude, planification, approvisionnement, chantier, sav
  responsibleTeam: varchar("responsible_team").notNull(), // be, av, production
  responsibleUserId: varchar("responsible_user_id").references(() => users.id),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  actualStartDate: timestamp("actual_start_date"),
  actualEndDate: timestamp("actual_end_date"),
  status: varchar("status").default("planned"), // planned, in_progress, completed, delayed
  bufferDays: integer("buffer_days").default(0),
  nextPhase: varchar("next_phase"),
  handoffCompleted: boolean("handoff_completed").default(false),
  handoffNotes: text("handoff_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Supplier price requests table
export const supplierRequests = pgTable("supplier_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  offerId: varchar("offer_id").references(() => offers.id),
  supplierName: varchar("supplier_name").notNull(),
  description: text("description"),
  requestedAmount: decimal("requested_amount", { precision: 12, scale: 2 }),
  responseAmount: decimal("response_amount", { precision: 12, scale: 2 }),
  status: varchar("status").default("pending"),
  requestDate: timestamp("request_date").defaultNow(),
  responseDate: timestamp("response_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Quotations table
export const quotations = pgTable("quotations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  offerId: varchar("offer_id").references(() => offers.id).notNull(),
  title: varchar("title").notNull(),
  content: jsonb("content"),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }),
  status: varchar("status").default("draft"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Table pour traquer la charge BE (problème majeur identifié dans l'audit)
export const beWorkload = pgTable("be_workload", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  weekNumber: integer("week_number").notNull(),
  year: integer("year").notNull(),
  capacityHours: decimal("capacity_hours", { precision: 8, scale: 2 }).default("35"), // 35h/semaine
  plannedHours: decimal("planned_hours", { precision: 8, scale: 2 }).default("0"),
  actualHours: decimal("actual_hours", { precision: 8, scale: 2 }).default("0"),
  loadPercentage: decimal("load_percentage", { precision: 5, scale: 2 }).default("0"), // %
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Table pour traquer la charge Avant-Vente
export const avWorkload = pgTable("av_workload", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  weekNumber: integer("week_number").notNull(),
  year: integer("year").notNull(),
  capacityHours: decimal("capacity_hours", { precision: 8, scale: 2 }).default("35"), // 35h/semaine
  plannedHours: decimal("planned_hours", { precision: 8, scale: 2 }).default("0"),
  actualHours: decimal("actual_hours", { precision: 8, scale: 2 }).default("0"),
  loadPercentage: decimal("load_percentage", { precision: 5, scale: 2 }).default("0"), // %
  availability: varchar("availability").default("disponible"), // disponible, partiellement_disponible, indisponible
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Table pour traquer la charge des équipes de production (nouveau besoin identifié)
export const productionWorkload = pgTable("production_workload", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  weekNumber: integer("week_number").notNull(),
  year: integer("year").notNull(),
  capacityHours: decimal("capacity_hours", { precision: 8, scale: 2 }).default("35"), // 35h/semaine
  plannedHours: decimal("planned_hours", { precision: 8, scale: 2 }).default("0"),
  actualHours: decimal("actual_hours", { precision: 8, scale: 2 }).default("0"),
  loadPercentage: decimal("load_percentage", { precision: 5, scale: 2 }).default("0"), // %
  availability: varchar("availability").default("disponible"), // disponible, partiellement_disponible, indisponible
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Table pour les jalons de validation (manquants selon audit)
export const validationMilestones = pgTable("validation_milestones", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  offerId: varchar("offer_id").references(() => offers.id),
  projectId: varchar("project_id").references(() => projects.id),
  type: varchar("type").notNull(), // "fin_etudes", "validation_technique", "validation_commerciale"
  title: varchar("title").notNull(),
  description: text("description"),
  expectedCompletionDate: timestamp("expected_completion_date").notNull(),
  assignedUserId: varchar("assigned_user_id").references(() => users.id),
  status: varchar("status").notNull().default("en_attente"), // "en_attente", "en_cours", "valide", "rejete"
  milestoneType: varchar("milestone_type").notNull(),
  validatedAt: timestamp("validated_at"),
  validatedBy: varchar("validated_by").references(() => users.id),
  completedAt: timestamp("completed_at"),
  comment: text("comment"),
  blockers: text("blockers"), // problèmes identifiés
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Interventions table pour le plan de charge chantier
export const interventions = pgTable("interventions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").references(() => projects.id).notNull(),
  assignedUserId: varchar("assigned_user_id").references(() => users.id),
  plannedStartDate: timestamp("planned_start_date").notNull(),
  plannedEndDate: timestamp("planned_end_date").notNull(),
  estimatedHours: decimal("estimated_hours", { precision: 8, scale: 2 }).notNull(),
  status: varchar("status").default("planifie"), // planifie, en_cours, termine, reporte
  priority: varchar("priority").default("normale"), // basse, normale, haute, critique
  description: text("description"),
  skills: text("skills").array().default(sql`'{}'::text[]`), // compétences requises
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  offers: many(offers),
  projects: many(projects),
  tasks: many(projectTasks),
  beWorkload: many(beWorkload),
  avWorkload: many(avWorkload),
  productionWorkload: many(productionWorkload),
  validationMilestones: many(validationMilestones),
  interventions: many(interventions),
}));

export const aosRelations = relations(aos, ({ many }) => ({
  offers: many(offers),
}));

export const offersRelations = relations(offers, ({ one, many }) => ({
  ao: one(aos, {
    fields: [offers.aoId],
    references: [aos.id],
  }),
  responsibleUser: one(users, {
    fields: [offers.responsibleUserId],
    references: [users.id],
  }),
  finEtudesValidator: one(users, {
    fields: [offers.finEtudesValidatedBy],
    references: [users.id],
  }),
  project: one(projects),
  supplierRequests: many(supplierRequests),
  quotations: many(quotations),
  validationMilestones: many(validationMilestones),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  offer: one(offers, {
    fields: [projects.offerId],
    references: [offers.id],
  }),
  responsibleUser: one(users, {
    fields: [projects.responsibleUserId],
    references: [users.id],
  }),
  chefTravauxUser: one(users, {
    fields: [projects.chefTravaux],
    references: [users.id],
  }),
  tasks: many(projectTasks),
  validationMilestones: many(validationMilestones),
  interventions: many(interventions),
}));

export const projectTasksRelations = relations(projectTasks, ({ one }) => ({
  project: one(projects, {
    fields: [projectTasks.projectId],
    references: [projects.id],
  }),
  assignedUser: one(users, {
    fields: [projectTasks.assignedUserId],
    references: [users.id],
  }),
}));

export const supplierRequestsRelations = relations(supplierRequests, ({ one }) => ({
  offer: one(offers, {
    fields: [supplierRequests.offerId],
    references: [offers.id],
  }),
}));

export const quotationsRelations = relations(quotations, ({ one }) => ({
  offer: one(offers, {
    fields: [quotations.offerId],
    references: [offers.id],
  }),
}));

export const beWorkloadRelations = relations(beWorkload, ({ one }) => ({
  user: one(users, {
    fields: [beWorkload.userId],
    references: [users.id],
  }),
}));

export const avWorkloadRelations = relations(avWorkload, ({ one }) => ({
  user: one(users, {
    fields: [avWorkload.userId],
    references: [users.id],
  }),
}));

export const productionWorkloadRelations = relations(productionWorkload, ({ one }) => ({
  user: one(users, {
    fields: [productionWorkload.userId],
    references: [users.id],
  }),
}));

export const validationMilestonesRelations = relations(validationMilestones, ({ one }) => ({
  offer: one(offers, {
    fields: [validationMilestones.offerId],
    references: [offers.id],
  }),
  project: one(projects, {
    fields: [validationMilestones.projectId],
    references: [projects.id],
  }),
  validator: one(users, {
    fields: [validationMilestones.validatedBy],
    references: [users.id],
  }),
}));

export const interventionsRelations = relations(interventions, ({ one }) => ({
  project: one(projects, {
    fields: [interventions.projectId],
    references: [projects.id],
  }),
  assignedUser: one(users, {
    fields: [interventions.assignedUserId],
    references: [users.id],
  }),
}));

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;



export type InsertAo = typeof aos.$inferInsert;
export type Ao = typeof aos.$inferSelect;

export type InsertOffer = typeof offers.$inferInsert;
export type Offer = typeof offers.$inferSelect;

export type InsertProject = typeof projects.$inferInsert;
export type Project = typeof projects.$inferSelect;

export type InsertProjectTask = typeof projectTasks.$inferInsert;
export type ProjectTask = typeof projectTasks.$inferSelect;

export type InsertProjectPhase = typeof projectPhases.$inferInsert;
export type ProjectPhase = typeof projectPhases.$inferSelect;

export type InsertSupplierRequest = typeof supplierRequests.$inferInsert;
export type SupplierRequest = typeof supplierRequests.$inferSelect;

export type InsertQuotation = typeof quotations.$inferInsert;
export type Quotation = typeof quotations.$inferSelect;

export type InsertBeWorkload = typeof beWorkload.$inferInsert;
export type BeWorkload = typeof beWorkload.$inferSelect;

export type InsertAvWorkload = typeof avWorkload.$inferInsert;
export type AvWorkload = typeof avWorkload.$inferSelect;

export type InsertProductionWorkload = typeof productionWorkload.$inferInsert;
export type ProductionWorkload = typeof productionWorkload.$inferSelect;

export type InsertValidationMilestone = typeof validationMilestones.$inferInsert;
export type ValidationMilestone = typeof validationMilestones.$inferSelect;

export type InsertIntervention = typeof interventions.$inferInsert;
export type Intervention = typeof interventions.$inferSelect;

// Tables de chiffrage et costing
export const pricingComponents = pgTable("pricing_components", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  offerId: varchar("offer_id").references(() => offers.id).notNull(),
  category: varchar("category").notNull(), // "menuiserie", "pose", "fourniture", "transport"
  subCategory: varchar("sub_category"), // "fenetre", "porte", "cloison", etc.
  description: text("description").notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  unit: varchar("unit").notNull().default("u"), // "u", "m2", "ml", "kg"
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
  supplierPrice: decimal("supplier_price", { precision: 10, scale: 2 }),
  margin: decimal("margin", { precision: 5, scale: 2 }), // Pourcentage de marge
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const supplierQuotations = pgTable("supplier_quotations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  offerId: varchar("offer_id").references(() => offers.id).notNull(),
  supplierName: varchar("supplier_name").notNull(),
  reference: varchar("reference"), // Référence fournisseur
  quotationDate: timestamp("quotation_date"),
  validityDays: integer("validity_days").default(30),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status").notNull().default("en_attente"), // "en_attente", "recu", "valide", "refuse"
  documentPath: text("document_path"), // Chemin vers le devis PDF
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const quotationItems = pgTable("quotation_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  quotationId: varchar("quotation_id").references(() => supplierQuotations.id).notNull(),
  description: text("description").notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  unit: varchar("unit").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
  deliveryTime: varchar("delivery_time"), // Délai de livraison
  createdAt: timestamp("created_at").defaultNow(),
});

export const costTemplates = pgTable("cost_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  category: varchar("category").notNull(), // "menuiserie_int", "menuiserie_ext", "bardage"
  description: text("description"),
  components: jsonb("components").notNull(), // Structure des composants par défaut
  isActive: boolean("is_active").default(true),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const laborRates = pgTable("labor_rates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  category: varchar("category").notNull(), // "be", "pose", "transport"
  skillLevel: varchar("skill_level").notNull(), // "junior", "senior", "expert"
  hourlyRate: decimal("hourly_rate", { precision: 8, scale: 2 }).notNull(),
  socialCharges: decimal("social_charges", { precision: 5, scale: 2 }).default(sql`50.0`), // Pourcentage
  isActive: boolean("is_active").default(true),
  validFrom: timestamp("valid_from").defaultNow(),
  validTo: timestamp("valid_to"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations pour les tables de chiffrage
export const pricingComponentsRelations = relations(pricingComponents, ({ one }) => ({
  offer: one(offers, {
    fields: [pricingComponents.offerId],
    references: [offers.id],
  }),
}));

export const supplierQuotationsRelations = relations(supplierQuotations, ({ one, many }) => ({
  offer: one(offers, {
    fields: [supplierQuotations.offerId],
    references: [offers.id],
  }),
  items: many(quotationItems),
}));

export const quotationItemsRelations = relations(quotationItems, ({ one }) => ({
  quotation: one(supplierQuotations, {
    fields: [quotationItems.quotationId],
    references: [supplierQuotations.id],
  }),
}));

export const costTemplatesRelations = relations(costTemplates, ({ one }) => ({
  createdBy: one(users, {
    fields: [costTemplates.createdBy],
    references: [users.id],
  }),
}));

// Types pour le chiffrage
export type PricingComponent = typeof pricingComponents.$inferSelect;
export type InsertPricingComponent = typeof pricingComponents.$inferInsert;
export type SupplierQuotation = typeof supplierQuotations.$inferSelect;
export type InsertSupplierQuotation = typeof supplierQuotations.$inferInsert;
export type QuotationItem = typeof quotationItems.$inferSelect;
export type InsertQuotationItem = typeof quotationItems.$inferInsert;
export type CostTemplate = typeof costTemplates.$inferSelect;
export type InsertCostTemplate = typeof costTemplates.$inferInsert;
export type LaborRate = typeof laborRates.$inferSelect;
export type InsertLaborRate = typeof laborRates.$inferInsert;

// Insert schemas
export const insertAoSchema = createInsertSchema(aos).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOfferSchema = createInsertSchema(offers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProjectTaskSchema = createInsertSchema(projectTasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSupplierRequestSchema = createInsertSchema(supplierRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertQuotationSchema = createInsertSchema(quotations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBeWorkloadSchema = createInsertSchema(beWorkload).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAvWorkloadSchema = createInsertSchema(avWorkload).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProductionWorkloadSchema = createInsertSchema(productionWorkload).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Schémas Zod pour le chiffrage
export const insertPricingComponentSchema = createInsertSchema(pricingComponents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSupplierQuotationSchema = createInsertSchema(supplierQuotations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertQuotationItemSchema = createInsertSchema(quotationItems).omit({
  id: true,
  createdAt: true,
});

export const insertCostTemplateSchema = createInsertSchema(costTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLaborRateSchema = createInsertSchema(laborRates).omit({
  id: true,
  createdAt: true,
});

export const insertInterventionSchema = createInsertSchema(interventions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
