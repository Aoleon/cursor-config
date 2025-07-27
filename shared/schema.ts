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

// User storage table.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").default("user"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Enums
export const offerStatusEnum = pgEnum("offer_status", [
  "en_cours_chiffrage",
  "en_attente_validation", 
  "termine",
  "prioritaire"
]);

export const projectStatusEnum = pgEnum("project_status", [
  "etude",
  "planification",
  "approvisionnement",
  "chantier",
  "sav"
]);

export const menuiserieTypeEnum = pgEnum("menuiserie_type", [
  "fenetres_pvc",
  "fenetres_aluminium",
  "mur_rideau",
  "portes_bois",
  "portes_alu"
]);

// AO (Appel d'Offres) table
export const aos = pgTable("aos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reference: varchar("reference").notNull().unique(),
  client: varchar("client").notNull(),
  location: varchar("location").notNull(),
  description: text("description"),
  menuiserieType: menuiserieTypeEnum("menuiserie_type").notNull(),
  estimatedAmount: decimal("estimated_amount", { precision: 12, scale: 2 }),
  maitreOeuvre: varchar("maitre_oeuvre"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Offers table
export const offers = pgTable("offers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reference: varchar("reference").notNull().unique(),
  aoId: varchar("ao_id").references(() => aos.id),
  client: varchar("client").notNull(),
  location: varchar("location").notNull(),
  menuiserieType: menuiserieTypeEnum("menuiserie_type").notNull(),
  estimatedAmount: decimal("estimated_amount", { precision: 12, scale: 2 }),
  status: offerStatusEnum("status").default("en_cours_chiffrage"),
  responsibleUserId: varchar("responsible_user_id").references(() => users.id),
  deadline: timestamp("deadline"),
  isPriority: boolean("is_priority").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Projects table
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
  responsibleUserId: varchar("responsible_user_id").references(() => users.id),
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

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  offers: many(offers),
  projects: many(projects),
  tasks: many(projectTasks),
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
  project: one(projects),
  supplierRequests: many(supplierRequests),
  quotations: many(quotations),
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
  tasks: many(projectTasks),
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
