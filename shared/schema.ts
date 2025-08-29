import { pgTable, varchar, text, timestamp, decimal, boolean, integer, jsonb, pgEnum, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ========================================
// ENUMS POUR POC UNIQUEMENT
// ========================================

// Départements français pour localisation
export const departementEnum = pgEnum("departement", [
  "01", "02", "03", "04", "05", "06", "07", "08", "09", "10",
  "11", "12", "13", "14", "15", "16", "17", "18", "19", "20",
  "21", "22", "23", "24", "25", "26", "27", "28", "29", "30",
  "31", "32", "33", "34", "35", "36", "37", "38", "39", "40",
  "41", "42", "43", "44", "45", "46", "47", "48", "49", "50",
  "51", "52", "53", "54", "55", "56", "57", "58", "59", "60",
  "61", "62", "63", "64", "65", "66", "67", "68", "69", "70",
  "71", "72", "73", "74", "75", "76", "77", "78", "79", "80",
  "81", "82", "83", "84", "85", "86", "87", "88", "89", "90",
  "91", "92", "93", "94", "95"
]);

// Types de menuiserie pour JLM (entreprise de POSE)
export const menuiserieTypeEnum = pgEnum("menuiserie_type", [
  "fenetre", "porte", "portail", "volet", "cloison", "verriere", "autre"
]);

// Sources des Appels d'Offres
export const aoSourceEnum = pgEnum("ao_source", [
  "mail", "phone", "website", "partner", "other"
]);

// Statuts des dossiers d'offre (workflow POC)
export const offerStatusEnum = pgEnum("offer_status", [
  "brouillon",           // Création en cours
  "en_cours_chiffrage",  // Chiffrage en cours
  "en_attente_validation", // Validation BE
  "fin_etudes_validee",  // Jalon "Fin d'études" validé
  "valide",              // Offre validée
  "signe",               // Offre signée par le client
  "transforme_en_projet", // Transformée en projet
  "termine",             // Dossier terminé
  "archive"              // Archivé
]);

// Statuts des projets (5 étapes POC)
export const projectStatusEnum = pgEnum("project_status", [
  "etude",              // Phase d'étude
  "planification",      // Planification
  "approvisionnement",  // Approvisionnement (simple)
  "chantier",           // Phase chantier
  "sav"                 // SAV (simple)
]);

// Statut charge BE (POC simplifié)
export const chargeStatusEnum = pgEnum("charge_status", [
  "disponible", "occupe", "surcharge"
]);

// Statut des tâches planning
export const taskStatusEnum = pgEnum("task_status", [
  "a_faire", "en_cours", "termine", "en_retard"
]);

// ========================================
// TABLES POC UNIQUEMENT
// ========================================

// Table des utilisateurs (simplifiée pour POC)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").default("technicien_be"), // POC : BE ou terrain
  isActive: boolean("is_active").default(true),
  chargeStatus: chargeStatusEnum("charge_status").default("disponible"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Appels d'Offres - Base pour éviter double saisie
export const aos = pgTable("aos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reference: varchar("reference").notNull().unique(),
  client: varchar("client").notNull(),
  location: varchar("location").notNull(),
  departement: departementEnum("departement").notNull(),
  maitreOeuvre: varchar("maitre_oeuvre"),
  menuiserieType: menuiserieTypeEnum("menuiserie_type").notNull(),
  montantEstime: decimal("montant_estime", { precision: 12, scale: 2 }),
  source: aoSourceEnum("source").notNull(),
  dateOS: timestamp("date_os"),
  description: text("description"),
  cctp: text("cctp"), // Cahier des Clauses Techniques Particulières
  delaiContractuel: integer("delai_contractuel"), // en jours
  isSelected: boolean("is_selected").default(false),
  selectionComment: text("selection_comment"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    referenceIdx: index("aos_reference_idx").on(table.reference),
  };
});

// Dossiers d'Offre & Chiffrage (cœur du POC)
export const offers = pgTable("offers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reference: varchar("reference").notNull().unique(),
  aoId: varchar("ao_id").references(() => aos.id), // Récupération assistée des données AO
  client: varchar("client").notNull(),
  location: varchar("location").notNull(),
  menuiserieType: menuiserieTypeEnum("menuiserie_type").notNull(),
  montantEstime: decimal("montant_estime", { precision: 12, scale: 2 }),
  montantFinal: decimal("montant_final", { precision: 12, scale: 2 }),
  status: offerStatusEnum("status").default("brouillon"),
  responsibleUserId: varchar("responsible_user_id").references(() => users.id),
  isPriority: boolean("is_priority").default(false), // Marquage priorité
  dpgfData: jsonb("dpgf_data"), // Document Provisoire de Gestion Financière
  batigestRef: varchar("batigest_ref"), // Connexion simulée Batigest
  finEtudesValidatedAt: timestamp("fin_etudes_validated_at"), // Jalon POC
  finEtudesValidatedBy: varchar("fin_etudes_validated_by").references(() => users.id),
  beHoursEstimated: decimal("be_hours_estimated", { precision: 8, scale: 2 }),
  beHoursActual: decimal("be_hours_actual", { precision: 8, scale: 2 }),
  deadline: timestamp("deadline"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    referenceIdx: index("offers_reference_idx").on(table.reference),
    statusIdx: index("offers_status_idx").on(table.status),
  };
});

// Projets (transformation dossier d'offre validé)
export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  offerId: varchar("offer_id").references(() => offers.id), // Lien avec dossier d'offre
  name: varchar("name").notNull(),
  client: varchar("client").notNull(),
  location: varchar("location").notNull(),
  status: projectStatusEnum("status").default("etude"), // 5 étapes POC
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  budget: decimal("budget", { precision: 12, scale: 2 }),
  responsibleUserId: varchar("responsible_user_id").references(() => users.id),
  chefTravaux: varchar("chef_travaux").references(() => users.id),
  progressPercentage: integer("progress_percentage").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tâches de projet pour planning partagé
export const projectTasks = pgTable("project_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id),
  name: varchar("name").notNull(),
  description: text("description"),
  status: taskStatusEnum("status").default("a_faire"),
  assignedUserId: varchar("assigned_user_id").references(() => users.id),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  estimatedHours: decimal("estimated_hours", { precision: 8, scale: 2 }),
  actualHours: decimal("actual_hours", { precision: 8, scale: 2 }),
  isJalon: boolean("is_jalon").default(false), // Jalon clé avec alertes
  position: integer("position"), // Pour glisser-déposer
  parentTaskId: varchar("parent_task_id"), // Self-reference will be added via foreign key
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Demandes de prix fournisseurs (simplifiées POC)
export const supplierRequests = pgTable("supplier_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  offerId: varchar("offer_id").references(() => offers.id),
  projectId: varchar("project_id").references(() => projects.id),
  supplierName: varchar("supplier_name").notNull(),
  supplierEmail: varchar("supplier_email"),
  supplierPhone: varchar("supplier_phone"),
  description: text("description"),
  requestedItems: jsonb("requested_items"), // Liste des éléments demandés
  status: varchar("status").default("envoyee"), // envoyee, recue, analysee
  sentAt: timestamp("sent_at").defaultNow(),
  responseAt: timestamp("response_at"),
  quotationAmount: decimal("quotation_amount", { precision: 12, scale: 2 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Ressources équipe (simplifiée POC)
export const teamResources = pgTable("team_resources", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id),
  userId: varchar("user_id").references(() => users.id), // Ressource interne
  externalName: varchar("external_name"), // Sous-traitant
  role: varchar("role"), // ex: "chef_equipe", "poseur", "sous_traitant"
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  chargeStatus: chargeStatusEnum("charge_status").default("disponible"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Indicateurs de charge BE (POC)
export const beWorkload = pgTable("be_workload", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  weekNumber: integer("week_number").notNull(),
  year: integer("year").notNull(),
  plannedHours: decimal("planned_hours", { precision: 8, scale: 2 }).default("35.00"),
  actualHours: decimal("actual_hours", { precision: 8, scale: 2 }).default("0.00"),
  dossierCount: integer("dossier_count").default(0),
  chargeLevel: chargeStatusEnum("charge_level").default("disponible"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    userWeekIdx: index("be_workload_user_week_idx").on(table.userId, table.weekNumber, table.year),
  };
});

// ========================================
// RELATIONS DRIZZLE
// ========================================

import { relations } from "drizzle-orm";

export const usersRelations = relations(users, ({ many }) => ({
  responsibleOffers: many(offers, { relationName: "responsible_user" }),
  validatedStudies: many(offers, { relationName: "fin_etudes_validator" }),
  responsibleProjects: many(projects, { relationName: "responsible_user" }),
  chefTravauxProjects: many(projects, { relationName: "chef_travaux" }),
  assignedTasks: many(projectTasks),
  teamResources: many(teamResources),
  beWorkload: many(beWorkload),
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
    relationName: "responsible_user",
  }),
  finEtudesValidator: one(users, {
    fields: [offers.finEtudesValidatedBy],
    references: [users.id],
    relationName: "fin_etudes_validator",
  }),
  projects: many(projects),
  supplierRequests: many(supplierRequests),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  offer: one(offers, {
    fields: [projects.offerId],
    references: [offers.id],
  }),
  responsibleUser: one(users, {
    fields: [projects.responsibleUserId],
    references: [users.id],
    relationName: "responsible_user",
  }),
  chefTravaux: one(users, {
    fields: [projects.chefTravaux],
    references: [users.id],
    relationName: "chef_travaux",
  }),
  tasks: many(projectTasks),
  teamResources: many(teamResources),
  supplierRequests: many(supplierRequests),
}));

export const projectTasksRelations = relations(projectTasks, ({ one, many }) => ({
  project: one(projects, {
    fields: [projectTasks.projectId],
    references: [projects.id],
  }),
  assignedUser: one(users, {
    fields: [projectTasks.assignedUserId],
    references: [users.id],
  }),
  parentTask: one(projectTasks, {
    fields: [projectTasks.parentTaskId],
    references: [projectTasks.id],
    relationName: "parent_task",
  }),
  subtasks: many(projectTasks, { relationName: "parent_task" }),
}));

export const supplierRequestsRelations = relations(supplierRequests, ({ one }) => ({
  offer: one(offers, {
    fields: [supplierRequests.offerId],
    references: [offers.id],
  }),
  project: one(projects, {
    fields: [supplierRequests.projectId],
    references: [projects.id],
  }),
}));

export const teamResourcesRelations = relations(teamResources, ({ one }) => ({
  project: one(projects, {
    fields: [teamResources.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [teamResources.userId],
    references: [users.id],
  }),
}));

export const beWorkloadRelations = relations(beWorkload, ({ one }) => ({
  user: one(users, {
    fields: [beWorkload.userId],
    references: [users.id],
  }),
}));

// ========================================
// TYPES TYPESCRIPT POUR POC
// ========================================

export type User = typeof users.$inferSelect;
export type UpsertUser = typeof users.$inferInsert;

export type Ao = typeof aos.$inferSelect;
export type InsertAo = typeof aos.$inferInsert;

export type Offer = typeof offers.$inferSelect;
export type InsertOffer = typeof offers.$inferInsert;

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

export type ProjectTask = typeof projectTasks.$inferSelect;
export type InsertProjectTask = typeof projectTasks.$inferInsert;

export type SupplierRequest = typeof supplierRequests.$inferSelect;
export type InsertSupplierRequest = typeof supplierRequests.$inferInsert;

export type TeamResource = typeof teamResources.$inferSelect;
export type InsertTeamResource = typeof teamResources.$inferInsert;

export type BeWorkload = typeof beWorkload.$inferSelect;
export type InsertBeWorkload = typeof beWorkload.$inferInsert;

// ========================================
// SCHÉMAS ZOD POUR VALIDATION POC
// ========================================

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

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

export const insertTeamResourceSchema = createInsertSchema(teamResources).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBeWorkloadSchema = createInsertSchema(beWorkload).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});