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
  "fenetres_pvc",
  "fenetres_aluminium",
  "mur_rideau",
  "portes_bois",
  "portes_alu",
  "bardage"
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

// Project tasks table
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

// Table pour les jalons de validation (manquants selon audit)
export const validationMilestones = pgTable("validation_milestones", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  offerId: varchar("offer_id").references(() => offers.id),
  projectId: varchar("project_id").references(() => projects.id),
  type: varchar("type").notNull(), // "fin_etudes", "validation_technique", "validation_commerciale"
  validatedBy: varchar("validated_by").references(() => users.id).notNull(),
  validatedAt: timestamp("validated_at").defaultNow(),
  comment: text("comment"),
  blockers: text("blockers"), // problèmes identifiés
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  offers: many(offers),
  projects: many(projects),
  tasks: many(projectTasks),
  beWorkload: many(beWorkload),
  validationMilestones: many(validationMilestones),
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

export type InsertSupplierRequest = typeof supplierRequests.$inferInsert;
export type SupplierRequest = typeof supplierRequests.$inferSelect;

export type InsertQuotation = typeof quotations.$inferInsert;
export type Quotation = typeof quotations.$inferSelect;

export type InsertBeWorkload = typeof beWorkload.$inferInsert;
export type BeWorkload = typeof beWorkload.$inferSelect;

export type InsertValidationMilestone = typeof validationMilestones.$inferInsert;
export type ValidationMilestone = typeof validationMilestones.$inferSelect;

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

export const insertValidationMilestoneSchema = createInsertSchema(validationMilestones).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
