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
  date,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ========================================
// ENUMS DEFINITIONS
// ========================================

export const userRoleEnum = pgEnum("user_role", [
  "admin", "chef_projet", "technicien_be", "responsable_be", "chef_travaux"
]);

export const aoStatusEnum = pgEnum("ao_status", [
  "received", "under_review", "selected", "rejected"
]);

export const menuiserieTypeEnum = pgEnum("menuiserie_type", [
  "fenetres", "portes", "bardage", "mur_rideau", "autre"
]);

export const departementEnum = pgEnum("departement", [
  "14", "50", "62", "76", "80", "59", "autres"
]);

export const offerStatusEnum = pgEnum("offer_status", [
  "draft", "pricing_in_progress", "waiting_validation", "sent", "accepted", "rejected"
]);

export const projectStatusEnum = pgEnum("project_status", [
  "planned", "in_progress", "on_hold", "completed", "cancelled"
]);

export const supplierStatusEnum = pgEnum("supplier_status", [
  "actif", "inactif", "suspendu", "blackliste"
]);

export const purchaseOrderStatusEnum = pgEnum("purchase_order_status", [
  "draft", "sent", "acknowledged", "partial_delivered", "delivered", "invoiced", "cancelled"
]);

export const deliveryStatusEnum = pgEnum("delivery_status", [
  "scheduled", "in_transit", "delivered", "partial", "cancelled", "returned"
]);

export const invoiceTypeEnum = pgEnum("invoice_type", [
  "customer", "supplier", "advance", "final", "credit_note"
]);

export const invoiceStatusEnum = pgEnum("invoice_status", [
  "draft", "sent", "received", "paid", "overdue", "disputed", "cancelled"
]);

export const employeeStatusEnum = pgEnum("employee_status", [
  "active", "inactive", "on_leave", "terminated"
]);

export const contractTypeEnum = pgEnum("contract_type", [
  "cdi", "cdd", "interim", "apprentice", "stage"
]);

export const leaveTypeEnum = pgEnum("leave_type", [
  "vacation", "sick", "personal", "training", "maternity", "paternity"
]);

export const leaveStatusEnum = pgEnum("leave_status", [
  "pending", "approved", "rejected", "cancelled"
]);

export const epiTypeEnum = pgEnum("epi_type", [
  "casque", "chaussures_securite", "gants", "gilet_haute_visibilite", 
  "lunettes_protection", "masque", "harnais", "autre"
]);

export const epiStatusEnum = pgEnum("epi_status", [
  "available", "assigned", "maintenance", "worn_out", "lost"
]);

export const timesheetStatusEnum = pgEnum("timesheet_status", [
  "draft", "submitted", "approved", "rejected"
]);

export const trainingStatusEnum = pgEnum("training_status", [
  "planned", "in_progress", "completed", "cancelled", "expired"
]);

export const documentCategoryEnum = pgEnum("document_category", [
  "ao", "offer", "project", "invoice", "contract", "certification", 
  "technical", "administrative", "rh", "epi", "training"
]);

export const documentAccessLevelEnum = pgEnum("document_access_level", [
  "public", "restricted", "confidential", "admin_only"
]);

export const anomalyStatusEnum = pgEnum("anomaly_status", [
  "reported", "acknowledged", "in_progress", "resolved", "closed"
]);

export const anomalySeverityEnum = pgEnum("anomaly_severity", [
  "low", "medium", "high", "critical"
]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "ao_received", "offer_deadline", "milestone_due", "delivery_delay", 
  "invoice_overdue", "training_due", "medical_visit_due", "anomaly_critical"
]);

export const kpiTypeEnum = pgEnum("kpi_type", [
  "be_workload", "ao_conversion", "delivery_delay", "invoice_payment", 
  "project_profitability", "team_productivity", "quality_issues"
]);

// ========================================
// TABLES DEFINITIONS
// ========================================

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: text("role").default("technicien_be"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Enum pour les sources AO existant
export const aoSourceEnum = pgEnum("ao_source", [
  "mail", "phone", "website", "partner", "other"
]);

export const aos = pgTable("aos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  departement: departementEnum("departement").notNull(),
  reference: varchar("reference").notNull(),
  client: varchar("client").notNull(),
  location: varchar("location").notNull(),
  source: aoSourceEnum("source").notNull(),
  dateOS: timestamp("date_os"),
  description: text("description"),
  menuiserieType: menuiserieTypeEnum("menuiserie_type").notNull(),
  estimatedAmount: decimal("estimated_amount", { precision: 12, scale: 2 }),
  maitreOeuvre: varchar("maitre_oeuvre"),
  delaiContractuel: integer("delai_contractuel"),
  cctp: text("cctp"),
  dpgf: jsonb("dpgf"),
  isSelected: boolean("is_selected").default(false),
  selectionComment: text("selection_comment"),
}, (table) => {
  return {
    referenceIdx: index("aos_reference_idx").on(table.reference),
  };
});

export const offers = pgTable("offers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  reference: varchar("reference").notNull(),
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
  dpgfData: jsonb("dpgf_data"),
  batigestRef: varchar("batigest_ref"),
  finEtudesValidatedAt: timestamp("fin_etudes_validated_at"),
  finEtudesValidatedBy: varchar("fin_etudes_validated_by").references(() => users.id),
  beHoursEstimated: decimal("be_hours_estimated", { precision: 8, scale: 2 }),
  beHoursActual: decimal("be_hours_actual", { precision: 8, scale: 2 }),
}, (table) => {
  return {
    referenceIdx: index("offers_reference_idx").on(table.reference),
  };
});

export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  offerId: varchar("offer_id").references(() => offers.id),
  name: varchar("name").notNull(),
  client: varchar("client").notNull(),
  location: varchar("location").notNull(),
  status: projectStatusEnum("status").default("etude"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  budget: decimal("budget", { precision: 12, scale: 2 }),
  responsibleUserId: varchar("responsible_user_id").references(() => users.id),
  chefTravaux: varchar("chef_travaux").references(() => users.id),
  ppspsGenerated: boolean("ppsps_generated").default(false),
  ppspsDate: timestamp("ppsps_date"),
  reservesCount: integer("reserves_count").default(0),
  reservesResolved: integer("reserves_resolved").default(0),
  dateReception: timestamp("date_reception"),
  dateFacturation: timestamp("date_facturation"),
});

export const projectTasks = pgTable("project_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").references(() => projects.id).notNull(),
  name: varchar("name").notNull(),
  description: text("description"),
  assignedUserId: varchar("assigned_user_id").references(() => users.id),
  status: varchar("status").default("pending"),
  priority: varchar("priority").default("medium"),
  startDate: timestamp("start_date"),
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  estimatedHours: decimal("estimated_hours", { precision: 5, scale: 2 }),
  actualHours: decimal("actual_hours", { precision: 5, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const supplierRequests = pgTable("supplier_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  offerId: varchar("offer_id").references(() => offers.id),
  supplierName: varchar("supplier_name").notNull(),
  contact: varchar("contact"),
  email: varchar("email"),
  description: text("description").notNull(),
  requestedDate: timestamp("requested_date").defaultNow(),
  responseDate: timestamp("response_date"),
  status: varchar("status").default("pending"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const quotations = pgTable("quotations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  supplierRequestId: varchar("supplier_request_id").references(() => supplierRequests.id),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  vatRate: decimal("vat_rate", { precision: 5, scale: 2 }).default("20"),
  deliveryDelay: integer("delivery_delay"),
  validityDate: timestamp("validity_date"),
  conditions: text("conditions"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const beWorkload = pgTable("be_workload", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  weekNumber: integer("week_number").notNull(),
  year: integer("year").notNull(),
  capacityHours: decimal("capacity_hours", { precision: 5, scale: 2 }).notNull().default("35"),
  plannedHours: decimal("planned_hours", { precision: 5, scale: 2 }).default("0"),
  actualHours: decimal("actual_hours", { precision: 5, scale: 2 }).default("0"),
  loadPercentage: decimal("load_percentage", { precision: 5, scale: 2 }).default("0"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    userWeekIdx: index("be_workload_user_week_idx").on(table.userId, table.weekNumber, table.year),
  };
});

export const validationMilestones = pgTable("validation_milestones", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  offerId: varchar("offer_id").references(() => offers.id),
  projectId: varchar("project_id").references(() => projects.id),
  type: varchar("type").notNull(),
  validatedBy: varchar("validated_by").references(() => users.id).notNull(),
  validatedAt: timestamp("validated_at"),
  comment: text("comment"),
  blockers: text("blockers"),
});

export const interventions = pgTable("interventions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").references(() => projects.id).notNull(),
  assignedUserId: varchar("assigned_user_id").references(() => users.id).notNull(),
  title: varchar("title").notNull(),
  description: text("description"),
  scheduledDate: timestamp("scheduled_date"),
  duration: integer("duration"),
  status: varchar("status").default("scheduled"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ========================================
// NOUVEAUX MODULES - TABLES
// ========================================

export const suppliers = pgTable("suppliers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  contact: varchar("contact"),
  email: varchar("email"),
  phone: varchar("phone"),
  address: text("address"),
  siret: varchar("siret"),
  specialties: text("specialties").array().default(sql`'{}'::text[]`),
  status: supplierStatusEnum("status").default("actif"),
  paymentTerms: integer("payment_terms").default(30),
  deliveryDelay: integer("delivery_delay").default(15),
  rating: decimal("rating", { precision: 3, scale: 2 }).default("0"),
  totalOrders: integer("total_orders").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const purchaseOrders = pgTable("purchase_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reference: varchar("reference").notNull().unique(),
  supplierId: varchar("supplier_id").references(() => suppliers.id).notNull(),
  projectId: varchar("project_id").references(() => projects.id),
  offerId: varchar("offer_id").references(() => offers.id),
  status: purchaseOrderStatusEnum("status").default("draft"),
  orderDate: timestamp("order_date").defaultNow(),
  expectedDeliveryDate: timestamp("expected_delivery_date"),
  actualDeliveryDate: timestamp("actual_delivery_date"),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }),
  vatAmount: decimal("vat_amount", { precision: 12, scale: 2 }),
  deliveryAddress: text("delivery_address"),
  notes: text("notes"),
  arcReceived: boolean("arc_received").default(false),
  arcDate: timestamp("arc_date"),
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const purchaseOrderItems = pgTable("purchase_order_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  purchaseOrderId: varchar("purchase_order_id").references(() => purchaseOrders.id).notNull(),
  description: text("description").notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 3 }).notNull(),
  unit: varchar("unit").default("pcs"),
  unitPrice: decimal("unit_price", { precision: 12, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 12, scale: 2 }).notNull(),
  deliveredQuantity: decimal("delivered_quantity", { precision: 10, scale: 3 }).default("0"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const deliveries = pgTable("deliveries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  purchaseOrderId: varchar("purchase_order_id").references(() => purchaseOrders.id).notNull(),
  reference: varchar("reference").notNull(),
  status: deliveryStatusEnum("status").default("scheduled"),
  scheduledDate: timestamp("scheduled_date"),
  deliveredDate: timestamp("delivered_date"),
  receivedBy: varchar("received_by").references(() => users.id),
  deliveryNote: text("delivery_note"),
  qualityCheck: boolean("quality_check").default(false),
  conformityIssues: text("conformity_issues"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const invoices = pgTable("invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reference: varchar("reference").notNull().unique(),
  type: invoiceTypeEnum("type").notNull(),
  status: invoiceStatusEnum("status").default("draft"),
  projectId: varchar("project_id").references(() => projects.id),
  supplierId: varchar("supplier_id").references(() => suppliers.id),
  clientName: varchar("client_name"),
  issueDate: timestamp("issue_date").defaultNow(),
  dueDate: timestamp("due_date"),
  paidDate: timestamp("paid_date"),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
  vatAmount: decimal("vat_amount", { precision: 12, scale: 2 }).default("0"),
  paidAmount: decimal("paid_amount", { precision: 12, scale: 2 }).default("0"),
  remainingAmount: decimal("remaining_amount", { precision: 12, scale: 2 }),
  paymentTerms: integer("payment_terms").default(30),
  notes: text("notes"),
  externalReference: varchar("external_reference"),
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const invoiceItems = pgTable("invoice_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceId: varchar("invoice_id").references(() => invoices.id).notNull(),
  description: text("description").notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 3 }).notNull(),
  unitPrice: decimal("unit_price", { precision: 12, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 12, scale: 2 }).notNull(),
  vatRate: decimal("vat_rate", { precision: 5, scale: 2 }).default("20"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const employees = pgTable("employees", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  employeeNumber: varchar("employee_number").notNull().unique(),
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  email: varchar("email").unique(),
  phone: varchar("phone"),
  address: text("address"),
  birthDate: date("birth_date"),
  hireDate: date("hire_date").notNull(),
  terminationDate: date("termination_date"),
  status: employeeStatusEnum("status").default("active"),
  contractType: contractTypeEnum("contract_type").notNull(),
  position: varchar("position").notNull(),
  department: varchar("department"),
  weeklyHours: decimal("weekly_hours", { precision: 5, scale: 2 }).default("35"),
  hourlyRate: decimal("hourly_rate", { precision: 8, scale: 2 }),
  skills: text("skills").array().default(sql`'{}'::text[]`),
  certifications: text("certifications").array().default(sql`'{}'::text[]`),
  medicalVisitDate: date("medical_visit_date"),
  medicalVisitDue: date("medical_visit_due"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const leaves = pgTable("leaves", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").references(() => employees.id).notNull(),
  type: leaveTypeEnum("type").notNull(),
  status: leaveStatusEnum("status").default("pending"),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  totalDays: decimal("total_days", { precision: 5, scale: 2 }).notNull(),
  reason: text("reason"),
  medicalCertificate: boolean("medical_certificate").default(false),
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  comments: text("comments"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const epis = pgTable("epis", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: epiTypeEnum("type").notNull(),
  brand: varchar("brand"),
  model: varchar("model"),
  size: varchar("size"),
  status: epiStatusEnum("status").default("available"),
  assignedTo: varchar("assigned_to").references(() => employees.id),
  assignedDate: timestamp("assigned_date"),
  purchaseDate: date("purchase_date"),
  expiryDate: date("expiry_date"),
  cost: decimal("cost", { precision: 8, scale: 2 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const timesheets = pgTable("timesheets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").references(() => employees.id).notNull(),
  projectId: varchar("project_id").references(() => projects.id),
  date: date("date").notNull(),
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  breakDuration: integer("break_duration").default(0),
  totalHours: decimal("total_hours", { precision: 5, scale: 2 }),
  overtimeHours: decimal("overtime_hours", { precision: 5, scale: 2 }).default("0"),
  description: text("description"),
  location: varchar("location"),
  gpsCoordinates: text("gps_coordinates"),
  status: timesheetStatusEnum("status").default("draft"),
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const trainings = pgTable("trainings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").references(() => employees.id).notNull(),
  title: varchar("title").notNull(),
  description: text("description"),
  provider: varchar("provider"),
  status: trainingStatusEnum("status").default("planned"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  cost: decimal("cost", { precision: 8, scale: 2 }),
  isMandatory: boolean("is_mandatory").default(false),
  certificateObtained: boolean("certificate_obtained").default(false),
  expiryDate: date("expiry_date"),
  renewalRequired: boolean("renewal_required").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  category: documentCategoryEnum("category").notNull(),
  description: text("description"),
  filePath: varchar("file_path").notNull(),
  mimeType: varchar("mime_type"),
  fileSize: integer("file_size"),
  version: varchar("version").default("1.0"),
  accessLevel: documentAccessLevelEnum("access_level").default("restricted"),
  aoId: varchar("ao_id").references(() => aos.id),
  offerId: varchar("offer_id").references(() => offers.id),
  projectId: varchar("project_id").references(() => projects.id),
  employeeId: varchar("employee_id").references(() => employees.id),
  uploadedBy: varchar("uploaded_by").references(() => users.id).notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  archivedAt: timestamp("archived_at"),
  archivedBy: varchar("archived_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const anomalies = pgTable("anomalies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").references(() => projects.id).notNull(),
  reportedBy: varchar("reported_by").references(() => users.id).notNull(),
  title: varchar("title").notNull(),
  description: text("description").notNull(),
  severity: anomalySeverityEnum("severity").default("medium"),
  status: anomalyStatusEnum("status").default("reported"),
  location: varchar("location"),
  gpsCoordinates: text("gps_coordinates"),
  photos: text("photos").array().default(sql`'{}'::text[]`),
  assignedTo: varchar("assigned_to").references(() => users.id),
  expectedResolutionDate: timestamp("expected_resolution_date"),
  actualResolutionDate: timestamp("actual_resolution_date"),
  resolutionNotes: text("resolution_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  type: notificationTypeEnum("type").notNull(),
  title: varchar("title").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false),
  actionUrl: varchar("action_url"),
  priority: varchar("priority").default("normal"),
  aoId: varchar("ao_id").references(() => aos.id),
  offerId: varchar("offer_id").references(() => offers.id),
  projectId: varchar("project_id").references(() => projects.id),
  scheduledFor: timestamp("scheduled_for"),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const kpis = pgTable("kpis", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: kpiTypeEnum("type").notNull(),
  name: varchar("name").notNull(),
  value: decimal("value", { precision: 12, scale: 4 }).notNull(),
  target: decimal("target", { precision: 12, scale: 4 }),
  unit: varchar("unit"),
  period: varchar("period"),
  periodDate: date("period_date").notNull(),
  departement: varchar("departement"),
  userId: varchar("user_id").references(() => users.id),
  projectId: varchar("project_id").references(() => projects.id),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ========================================
// TYPES - AFTER ALL TABLES
// ========================================

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

export type InsertIntervention = typeof interventions.$inferInsert;
export type Intervention = typeof interventions.$inferSelect;

// Nouveaux types
export type InsertSupplier = typeof suppliers.$inferInsert;
export type Supplier = typeof suppliers.$inferSelect;

export type InsertPurchaseOrder = typeof purchaseOrders.$inferInsert;
export type PurchaseOrder = typeof purchaseOrders.$inferSelect;

export type InsertPurchaseOrderItem = typeof purchaseOrderItems.$inferInsert;
export type PurchaseOrderItem = typeof purchaseOrderItems.$inferSelect;

export type InsertDelivery = typeof deliveries.$inferInsert;
export type Delivery = typeof deliveries.$inferSelect;

export type InsertInvoice = typeof invoices.$inferInsert;
export type Invoice = typeof invoices.$inferSelect;

export type InsertInvoiceItem = typeof invoiceItems.$inferInsert;
export type InvoiceItem = typeof invoiceItems.$inferSelect;

export type InsertEmployee = typeof employees.$inferInsert;
export type Employee = typeof employees.$inferSelect;

export type InsertLeave = typeof leaves.$inferInsert;
export type Leave = typeof leaves.$inferSelect;

export type InsertEpi = typeof epis.$inferInsert;
export type Epi = typeof epis.$inferSelect;

export type InsertTimesheet = typeof timesheets.$inferInsert;
export type Timesheet = typeof timesheets.$inferSelect;

export type InsertTraining = typeof trainings.$inferInsert;
export type Training = typeof trainings.$inferSelect;

export type InsertDocument = typeof documents.$inferInsert;
export type Document = typeof documents.$inferSelect;

export type InsertAnomaly = typeof anomalies.$inferInsert;
export type Anomaly = typeof anomalies.$inferSelect;

export type InsertNotification = typeof notifications.$inferInsert;
export type Notification = typeof notifications.$inferSelect;

export type InsertKpi = typeof kpis.$inferInsert;
export type Kpi = typeof kpis.$inferSelect;

// ========================================
// SCHEMAS D'INSERTION - AFTER ALL TABLES & TYPES
// ========================================

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

export const insertInterventionSchema = createInsertSchema(interventions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSupplierSchema = createInsertSchema(suppliers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPurchaseOrderSchema = createInsertSchema(purchaseOrders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPurchaseOrderItemSchema = createInsertSchema(purchaseOrderItems).omit({
  id: true,
  createdAt: true,
});

export const insertDeliverySchema = createInsertSchema(deliveries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInvoiceItemSchema = createInsertSchema(invoiceItems).omit({
  id: true,
  createdAt: true,
});

export const insertEmployeeSchema = createInsertSchema(employees).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLeaveSchema = createInsertSchema(leaves).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEpiSchema = createInsertSchema(epis).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTimesheetSchema = createInsertSchema(timesheets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTrainingSchema = createInsertSchema(trainings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAnomalySchema = createInsertSchema(anomalies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const insertKpiSchema = createInsertSchema(kpis).omit({
  id: true,
  createdAt: true,
});

// ========================================
// RELATIONS - AT THE END AFTER EVERYTHING
// ========================================

export const usersRelations = relations(users, ({ many }) => ({
  offers: many(offers),
  projects: many(projects),
  projectTasks: many(projectTasks),
  beWorkload: many(beWorkload),
  validationMilestones: many(validationMilestones),
  interventions: many(interventions),
  purchaseOrders: many(purchaseOrders),
  leaves: many(leaves),
  timesheets: many(timesheets),
  documents: many(documents),
  anomalies: many(anomalies),
  notifications: many(notifications),
  kpis: many(kpis),
}));

export const aosRelations = relations(aos, ({ many }) => ({
  offers: many(offers),
  documents: many(documents),
  notifications: many(notifications),
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
  projects: many(projects),
  supplierRequests: many(supplierRequests),
  validationMilestones: many(validationMilestones),
  purchaseOrders: many(purchaseOrders),
  documents: many(documents),
  notifications: many(notifications),
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
  interventions: many(interventions),
  validationMilestones: many(validationMilestones),
  purchaseOrders: many(purchaseOrders),
  invoices: many(invoices),
  timesheets: many(timesheets),
  documents: many(documents),
  anomalies: many(anomalies),
  notifications: many(notifications),
  kpis: many(kpis),
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

export const supplierRequestsRelations = relations(supplierRequests, ({ one, many }) => ({
  offer: one(offers, {
    fields: [supplierRequests.offerId],
    references: [offers.id],
  }),
  quotations: many(quotations),
}));

export const quotationsRelations = relations(quotations, ({ one }) => ({
  supplierRequest: one(supplierRequests, {
    fields: [quotations.supplierRequestId],
    references: [supplierRequests.id],
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

export const suppliersRelations = relations(suppliers, ({ many }) => ({
  purchaseOrders: many(purchaseOrders),
  invoices: many(invoices),
}));

export const purchaseOrdersRelations = relations(purchaseOrders, ({ one, many }) => ({
  supplier: one(suppliers, {
    fields: [purchaseOrders.supplierId],
    references: [suppliers.id],
  }),
  project: one(projects, {
    fields: [purchaseOrders.projectId],
    references: [projects.id],
  }),
  offer: one(offers, {
    fields: [purchaseOrders.offerId],
    references: [offers.id],
  }),
  createdByUser: one(users, {
    fields: [purchaseOrders.createdBy],
    references: [users.id],
  }),
  items: many(purchaseOrderItems),
  deliveries: many(deliveries),
}));

export const purchaseOrderItemsRelations = relations(purchaseOrderItems, ({ one }) => ({
  purchaseOrder: one(purchaseOrders, {
    fields: [purchaseOrderItems.purchaseOrderId],
    references: [purchaseOrders.id],
  }),
}));

export const deliveriesRelations = relations(deliveries, ({ one }) => ({
  purchaseOrder: one(purchaseOrders, {
    fields: [deliveries.purchaseOrderId],
    references: [purchaseOrders.id],
  }),
  receivedByUser: one(users, {
    fields: [deliveries.receivedBy],
    references: [users.id],
  }),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  project: one(projects, {
    fields: [invoices.projectId],
    references: [projects.id],
  }),
  supplier: one(suppliers, {
    fields: [invoices.supplierId],
    references: [suppliers.id],
  }),
  createdByUser: one(users, {
    fields: [invoices.createdBy],
    references: [users.id],
  }),
  items: many(invoiceItems),
}));

export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceItems.invoiceId],
    references: [invoices.id],
  }),
}));

export const employeesRelations = relations(employees, ({ one, many }) => ({
  user: one(users, {
    fields: [employees.userId],
    references: [users.id],
  }),
  leaves: many(leaves),
  epis: many(epis),
  timesheets: many(timesheets),
  trainings: many(trainings),
  documents: many(documents),
}));

export const leavesRelations = relations(leaves, ({ one }) => ({
  employee: one(employees, {
    fields: [leaves.employeeId],
    references: [employees.id],
  }),
  approvedByUser: one(users, {
    fields: [leaves.approvedBy],
    references: [users.id],
  }),
}));

export const episRelations = relations(epis, ({ one }) => ({
  assignedEmployee: one(employees, {
    fields: [epis.assignedTo],
    references: [employees.id],
  }),
}));

export const timesheetsRelations = relations(timesheets, ({ one }) => ({
  employee: one(employees, {
    fields: [timesheets.employeeId],
    references: [employees.id],
  }),
  project: one(projects, {
    fields: [timesheets.projectId],
    references: [projects.id],
  }),
  approvedByUser: one(users, {
    fields: [timesheets.approvedBy],
    references: [users.id],
  }),
}));

export const trainingsRelations = relations(trainings, ({ one }) => ({
  employee: one(employees, {
    fields: [trainings.employeeId],
    references: [employees.id],
  }),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  ao: one(aos, {
    fields: [documents.aoId],
    references: [aos.id],
  }),
  offer: one(offers, {
    fields: [documents.offerId],
    references: [offers.id],
  }),
  project: one(projects, {
    fields: [documents.projectId],
    references: [projects.id],
  }),
  employee: one(employees, {
    fields: [documents.employeeId],
    references: [employees.id],
  }),
  uploadedByUser: one(users, {
    fields: [documents.uploadedBy],
    references: [users.id],
  }),
  archivedByUser: one(users, {
    fields: [documents.archivedBy],
    references: [users.id],
  }),
}));

export const anomaliesRelations = relations(anomalies, ({ one }) => ({
  project: one(projects, {
    fields: [anomalies.projectId],
    references: [projects.id],
  }),
  reportedByUser: one(users, {
    fields: [anomalies.reportedBy],
    references: [users.id],
  }),
  assignedToUser: one(users, {
    fields: [anomalies.assignedTo],
    references: [users.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
  ao: one(aos, {
    fields: [notifications.aoId],
    references: [aos.id],
  }),
  offer: one(offers, {
    fields: [notifications.offerId],
    references: [offers.id],
  }),
  project: one(projects, {
    fields: [notifications.projectId],
    references: [projects.id],
  }),
}));

export const kpisRelations = relations(kpis, ({ one }) => ({
  user: one(users, {
    fields: [kpis.userId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [kpis.projectId],
    references: [projects.id],
  }),
}));