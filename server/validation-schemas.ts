/**
 * Schémas de validation Zod pour les routes API
 * Centralise tous les schémas de validation pour sécuriser les endpoints POST/PUT/PATCH
 */

import { z } from "zod";
import { offerStatusEnum, projectStatusEnum, menuiserieTypeEnum } from "../shared/schema";

// ======================================
// Schémas pour les routes d'offres
// ======================================

// POST /api/offers/:id/start-chiffrage
export const startChiffrageSchema = z.object({
  notes: z.string().trim().max(1000, "Notes trop longues").optional(),
  responsibleId: z.string().uuid("ID responsable invalide").optional(),
  targetDate: z.string().datetime().optional()
}).strict();

// POST /api/offers/:id/request-suppliers  
export const requestSuppliersSchema = z.object({
  supplierIds: z.array(z.string().uuid("ID fournisseur invalide")).min(1, "Au moins un fournisseur requis"),
  lotIds: z.array(z.string().uuid("ID lot invalide")).optional(),
  message: z.string().trim().min(1, "Message requis").max(2000, "Message trop long").optional(),
  deadline: z.string().datetime().optional()
}).strict();

// POST /api/offers/:id/validate-studies
export const validateStudiesSchema = z.object({
  validated: z.boolean(),
  notes: z.string().trim().max(1000, "Notes trop longues").optional(),
  validatedBy: z.string().uuid("ID validateur invalide").optional()
}).strict();

// POST /api/offers/create-with-structure
export const createOfferWithStructureSchema = z.object({
  nom: z.string().trim().min(1, "Nom requis").max(255, "Nom trop long"),
  reference: z.string().trim().min(1, "Référence requise").max(100, "Référence trop longue"),
  maitre_ouvrage_id: z.string().uuid("ID maître d'ouvrage invalide").optional(),
  maitre_oeuvre_id: z.string().uuid("ID maître d'œuvre invalide").optional(),
  montant: z.number().positive("Montant doit être positif").finite().optional(),
  date_limite: z.string().datetime().optional(),
  status: z.enum(offerStatusEnum.enumValues).optional(),
  uploadedFiles: z.array(z.object({
    name: z.string(),
    path: z.string(),
    size: z.number().positive(),
    type: z.string()
  })).optional(),
  creationMethod: z.enum(["manual", "import", "template"]).optional()
}).strict();

// POST /api/offers/:id/convert-to-project
export const convertToProjectSchema = z.object({
  projectName: z.string().trim().min(1, "Nom du projet requis").max(255, "Nom trop long"),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  budget: z.number().positive("Budget doit être positif").finite().optional(),
  notes: z.string().trim().max(2000, "Notes trop longues").optional()
}).strict();

// PATCH /api/offers/:id/validate-studies
export const patchValidateStudiesSchema = z.object({
  finEtudesValidatedAt: z.string().datetime().optional(),
  status: z.enum(offerStatusEnum.enumValues).optional(),
  notes: z.string().trim().max(1000, "Notes trop longues").optional()
}).strict();

// POST /api/offers/:id/transform-to-project
export const transformToProjectSchema = z.object({
  projectData: z.object({
    name: z.string().trim().min(1, "Nom requis").max(255, "Nom trop long"),
    startDate: z.string().datetime(),
    plannedEndDate: z.string().datetime().optional(),
    budget: z.number().positive("Budget doit être positif").finite(),
    description: z.string().trim().max(2000, "Description trop longue").optional()
  }),
  keepOfferActive: z.boolean().optional()
}).strict();

// ======================================
// Schémas pour les routes de projets
// ======================================

// POST /api/projects
export const createProjectSchema = z.object({
  name: z.string().trim().min(1, "Nom requis").max(255, "Nom trop long"),
  offerId: z.string().uuid("ID offre invalide").optional(),
  aoId: z.string().uuid("ID AO invalide").optional(),
  clientName: z.string().trim().min(1, "Nom client requis").max(255, "Nom trop long"),
  startDate: z.coerce.date(),
  plannedEndDate: z.coerce.date().optional(),
  status: z.enum(projectStatusEnum.enumValues).default("passation"),
  budget: z.number().positive("Budget doit être positif").finite().optional(),
  description: z.string().trim().max(2000, "Description trop longue").optional(),
  contactEmail: z.string().email("Email invalide").optional(),
  contactPhone: z.string().trim().max(20, "Numéro trop long").optional(),
  address: z.string().trim().max(500, "Adresse trop longue").optional(),
  maitre_ouvrage_id: z.string().uuid("ID maître d'ouvrage invalide").optional(),
  maitre_oeuvre_id: z.string().uuid("ID maître d'œuvre invalide").optional()
}).strict();

// PATCH /api/projects/:id
export const updateProjectSchema = createProjectSchema.partial().strict();

// POST /api/projects/:projectId/tasks
export const createProjectTaskSchema = z.object({
  name: z.string().trim().min(1, "Nom requis").max(255, "Nom trop long"),
  description: z.string().trim().max(1000, "Description trop longue").optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  status: z.enum(["a_faire", "en_cours", "termine", "en_retard"]).default("a_faire"),
  assignedTo: z.string().uuid("ID assigné invalide").optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  dependencies: z.array(z.string().uuid()).optional()
}).strict();

// ======================================
// Schémas pour les routes workflow
// ======================================

// POST /api/aos/:id/validate-etude
export const validateEtudeSchema = z.object({
  validated: z.boolean(),
  validatedBy: z.string().uuid("ID validateur invalide").optional(),
  notes: z.string().trim().max(1000, "Notes trop longues").optional(),
  nextStep: z.enum(["chiffrage", "demande_fournisseurs", "attente"]).optional()
}).strict();

// POST /api/aos/:id/validate-chiffrage
export const validateChiffrageSchema = z.object({
  validated: z.boolean(),
  amount: z.number().positive("Montant doit être positif").finite(),
  margin: z.number().min(0).max(100, "Marge doit être entre 0 et 100").optional(),
  validatedBy: z.string().uuid("ID validateur invalide").optional(),
  notes: z.string().trim().max(1000, "Notes trop longues").optional()
}).strict();

// POST /api/aos/:id/relance
export const relanceSchema = z.object({
  type: z.enum(["email", "phone", "courrier"]),
  recipient: z.string().trim().min(1, "Destinataire requis").max(255),
  message: z.string().trim().min(1, "Message requis").max(2000, "Message trop long"),
  scheduledDate: z.string().datetime().optional(),
  priority: z.enum(["low", "medium", "high"]).default("medium")
}).strict();

// POST /api/projects/:id/validate-planning
export const validatePlanningSchema = z.object({
  validated: z.boolean(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  milestones: z.array(z.object({
    name: z.string().trim().min(1).max(255),
    date: z.string().datetime()
  })).optional(),
  notes: z.string().trim().max(1000, "Notes trop longues").optional()
}).strict();

// POST /api/projects/:id/start-chantier
export const startChantierSchema = z.object({
  actualStartDate: z.string().datetime(),
  siteManager: z.string().uuid("ID chef de chantier invalide").optional(),
  safetyOfficer: z.string().uuid("ID responsable sécurité invalide").optional(),
  notes: z.string().trim().max(1000, "Notes trop longues").optional()
}).strict();

// POST /api/projects/:id/finish
export const finishProjectSchema = z.object({
  actualEndDate: z.string().datetime(),
  finalAmount: z.number().positive("Montant final doit être positif").finite(),
  completionReport: z.string().trim().max(5000, "Rapport trop long").optional(),
  satisfactionScore: z.number().min(0).max(10).optional(),
  notes: z.string().trim().max(1000, "Notes trop longues").optional()
}).strict();

// ======================================
// Schémas pour les routes documents
// ======================================

// POST /api/ocr/process-pdf
export const processPdfSchema = z.object({
  options: z.object({
    language: z.enum(["fra", "eng", "deu", "spa"]).default("fra"),
    dpi: z.number().min(72).max(600).default(300),
    extractTables: z.boolean().default(true),
    extractImages: z.boolean().default(false)
  }).optional()
}).strict();

// POST /api/ocr/create-ao-from-pdf
export const createAoFromPdfSchema = z.object({
  options: z.object({
    autoDetectLots: z.boolean().default(true),
    extractContacts: z.boolean().default(true),
    language: z.enum(["fra", "eng"]).default("fra")
  }).optional(),
  metadata: z.object({
    source: z.enum(["email", "upload", "scan"]).optional(),
    receivedDate: z.string().datetime().optional()
  }).optional()
}).strict();

// POST /api/documents/analyze
export const analyzeDocumentSchema = z.object({
  entityType: z.enum(["offer", "project", "ao", "supplier"]),
  entityId: z.string().uuid("ID entité invalide"),
  category: z.enum(["ao_pdf", "cctp", "plans", "devis_client", "devis_fournisseur", "bon_commande", 
                    "facture", "photo_chantier", "rapport_avancement", "correspondance", 
                    "certification", "notice_technique", "autre"]).optional(),
  extractMetadata: z.boolean().default(true)
}).strict();

// POST /api/pdf/dpgf/:offerId
export const generateDpgfOptionsSchema = z.object({
  includeDetails: z.boolean().default(true),
  includeSignatures: z.boolean().default(false),
  format: z.enum(["A4", "Letter"]).default("A4"),
  language: z.enum(["fr", "en"]).default("fr")
}).strict();

// POST /api/objects/upload
export const uploadObjectSchema = z.object({
  category: z.enum(["document", "image", "video", "archive", "other"]).default("document"),
  entityType: z.enum(["offer", "project", "ao", "supplier"]).optional(),
  entityId: z.string().uuid("ID entité invalide").optional(),
  tags: z.array(z.string().trim().max(50)).max(10, "Maximum 10 tags").optional(),
  metadata: z.record(z.string(), z.any()).optional()
}).strict();

// POST /api/templates
export const createTemplateSchema = z.object({
  name: z.string().trim().min(1, "Nom requis").max(255, "Nom trop long"),
  type: z.enum(["devis", "facture", "bon_commande", "contrat", "rapport", "courrier"]),
  content: z.string().trim().min(1, "Contenu requis"),
  variables: z.array(z.string()).optional(),
  category: z.string().trim().max(100).optional(),
  isActive: z.boolean().default(true)
}).strict();

// PUT /api/templates/:id
export const updateTemplateSchema = createTemplateSchema.partial().strict();

// ======================================
// Schémas pour les routes fournisseurs
// ======================================

// POST /api/supplier-workflow/documents/upload
export const uploadSupplierDocumentSchema = z.object({
  supplierId: z.string().uuid("ID fournisseur invalide"),
  documentType: z.enum(["devis", "catalogue", "certification", "conditions", "autre"]),
  sessionId: z.string().uuid("ID session invalide").optional(),
  metadata: z.record(z.string(), z.any()).optional()
}).strict();

// POST /api/supplier-documents/:id/analyze
export const analyzeSupplierDocumentSchema = z.object({
  extractPrices: z.boolean().default(true),
  extractProducts: z.boolean().default(true),
  detectAnomalies: z.boolean().default(false),
  compareWithHistorical: z.boolean().default(false)
}).strict();

// POST /api/supplier-quote-analysis/:id/approve
export const approveQuoteAnalysisSchema = z.object({
  approved: z.boolean(),
  notes: z.string().trim().max(1000, "Notes trop longues").optional(),
  adjustments: z.array(z.object({
    itemId: z.string().uuid(),
    newPrice: z.number().positive().finite(),
    reason: z.string().trim().max(500)
  })).optional()
}).strict();

// POST /api/supplier-workflow/sessions/:sessionId/invite
export const inviteToSessionSchema = z.object({
  supplierIds: z.array(z.string().uuid("ID fournisseur invalide")).min(1, "Au moins un fournisseur requis"),
  message: z.string().trim().max(2000, "Message trop long").optional(),
  deadline: z.string().datetime(),
  attachments: z.array(z.string()).optional()
}).strict();

// ======================================
// Schémas pour les routes d'authentification
// ======================================

// POST /api/login/basic
export const basicLoginSchema = z.object({
  username: z.string().trim().min(1, "Nom d'utilisateur requis").max(100),
  password: z.string().min(1, "Mot de passe requis")
}).strict();

// ======================================
// Export des types TypeScript dérivés
// ======================================

export type StartChiffrageInput = z.infer<typeof startChiffrageSchema>;
export type RequestSuppliersInput = z.infer<typeof requestSuppliersSchema>;
export type ValidateStudiesInput = z.infer<typeof validateStudiesSchema>;
export type CreateOfferWithStructureInput = z.infer<typeof createOfferWithStructureSchema>;
export type ConvertToProjectInput = z.infer<typeof convertToProjectSchema>;
export type PatchValidateStudiesInput = z.infer<typeof patchValidateStudiesSchema>;
export type TransformToProjectInput = z.infer<typeof transformToProjectSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type CreateProjectTaskInput = z.infer<typeof createProjectTaskSchema>;
export type ValidateEtudeInput = z.infer<typeof validateEtudeSchema>;
export type ValidateChiffrageInput = z.infer<typeof validateChiffrageSchema>;
export type RelanceInput = z.infer<typeof relanceSchema>;
export type ValidatePlanningInput = z.infer<typeof validatePlanningSchema>;
export type StartChantierInput = z.infer<typeof startChantierSchema>;
export type FinishProjectInput = z.infer<typeof finishProjectSchema>;
export type ProcessPdfInput = z.infer<typeof processPdfSchema>;
export type CreateAoFromPdfInput = z.infer<typeof createAoFromPdfSchema>;
export type AnalyzeDocumentInput = z.infer<typeof analyzeDocumentSchema>;
export type GenerateDpgfOptionsInput = z.infer<typeof generateDpgfOptionsSchema>;
export type UploadObjectInput = z.infer<typeof uploadObjectSchema>;
export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;
export type UploadSupplierDocumentInput = z.infer<typeof uploadSupplierDocumentSchema>;
export type AnalyzeSupplierDocumentInput = z.infer<typeof analyzeSupplierDocumentSchema>;
export type ApproveQuoteAnalysisInput = z.infer<typeof approveQuoteAnalysisSchema>;
export type InviteToSessionInput = z.infer<typeof inviteToSessionSchema>;
export type BasicLoginInput = z.infer<typeof basicLoginSchema>;