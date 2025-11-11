/**
 * Commercial Module Type Definitions
 * 
 * This module contains all type definitions related to commercial operations:
 * - AOs (Appels d'Offres / Calls for Tenders)
 * - Offers (Offres Saxium)
 * - AO Contacts
 * - AO Lots and Supplier Management
 */

import type { z } from 'zod';
import type {
  insertAoSchema,
  insertOfferSchema,
  insertAoContactsSchema,
  Ao,
  Offer,
  AoContacts,
  AoLot,
  AoLotSupplier,
  aoSourceEnum,
  marcheTypeEnum,
  offerStatusEnum
} from '@shared/schema';

// ========================================
// REQUEST TYPES
// ========================================

// AO Request Types
export type CreateAoRequest = z.infer<typeof insertAoSchema>;
export type UpdateAoRequest = Partial<CreateAoRequest>;

export type CreateAoContactRequest = z.infer<typeof insertAoContactsSchema>;
export type UpdateAoContactRequest = Partial<CreateAoContactRequest>;

// Offer Request Types
export type CreateOfferRequest = z.infer<typeof insertOfferSchema>;
export type UpdateOfferRequest = Partial<CreateOfferRequest>;

// ========================================
// RESPONSE TYPES
// ========================================

// AO Response Types
export interface AoResponse extends Ao {
  lots?: AoLotResponse[];
  contacts?: AoContactsResponse[];
  documents?: AoDocumentInfo[];
  totalLots?: number;
  estimatedBudget?: number;
  daysUntilDeadline?: number;
}

export interface AoLotResponse extends AoLot {
  suppliers?: AoLotSupplierInfo[];
  selectedSupplier?: AoLotSupplierInfo;
  comparisonData?: LotComparisonData;
}

export interface AoContactsResponse extends AoContacts {
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
}

export interface AoDocumentInfo {
  id: string;
  name: string;
  url: string;
  category: string;
  uploadedAt: Date;
  size?: number;
}

export interface AoLotSupplierInfo {
  id: string;
  supplierId: string;
  supplierName: string;
  priceHT?: number;
  priceTTC?: number;
  deliveryDays?: number;
  score?: number;
  status: string;
  quotedAt?: Date;
}

export interface LotComparisonData {
  lotId: string;
  lotName: string;
  suppliers: SupplierComparison[];
  bestPrice?: SupplierComparison;
  bestDelivery?: SupplierComparison;
  recommended?: SupplierComparison;
}

export interface SupplierComparison {
  supplierId: string;
  supplierName: string;
  priceHT: number;
  priceTTC: number;
  deliveryDays: number;
  technicalScore?: number;
  overallScore?: number;
  strengths?: string[];
  weaknesses?: string[];
}

// Offer Response Types
export interface OfferResponse extends Offer {
  lots?: OfferLotInfo[];
  client?: ClientInfo;
  totalAmount?: number;
  progress?: number;
  daysInStatus?: number;
  canStartChiffrage?: boolean;
  canValidateStudies?: boolean;
  canTransformToProject?: boolean;
}

export interface OfferLotInfo {
  id: string;
  name: string;
  description?: string;
  status: string;
  priceHT?: number;
  supplierCount?: number;
}

export interface ClientInfo {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  type?: string;
}

// ========================================
// QUERY PARAMETER TYPES
// ========================================

export interface AoQueryParams {
  status?: string;
  source?: z.infer<typeof aoSourceEnum>;
  marcheType?: z.infer<typeof marcheTypeEnum>;
  search?: string;
  departement?: string;
  dateFrom?: Date;
  dateTo?: Date;
  sortBy?: 'date' | 'deadline' | 'budget' | 'status';
  limit?: number;
  offset?: number;
}

export interface OfferQueryParams {
  status?: z.infer<typeof offerStatusEnum>;
  search?: string;
  clientId?: string;
  aoId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  includeArchived?: boolean;
  sortBy?: 'date' | 'status' | 'amount' | 'deadline';
  limit?: number;
  offset?: number;
}

export interface AoContactsQueryParams {
  aoId?: string;
  contactId?: string;
  role?: string;
}

export interface SupplierRequestQueryParams {
  offerId?: string;
  supplierId?: string;
  status?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

// ========================================
// SERVICE TYPES
// ========================================

export interface AoStatistics {
  totalAos: number;
  activeAos: number;
  completedAos: number;
  averageResponseTime: number;
  successRate: number;
  bySource: Record<string, number>;
  byMarcheType: Record<string, number>;
}

export interface OfferStatistics {
  totalOffers: number;
  activeOffers: number;
  signedOffers: number;
  convertedToProjects: number;
  averageConversionTime: number;
  conversionRate: number;
  byStatus: Record<string, number>;
  totalAmount: number;
}

export interface ChiffrageStartParams {
  offerId: string;
  estimatedDuration?: number;
  assignedTo?: string;
  notes?: string;
}

export interface SupplierRequestParams {
  offerId: string;
  lotIds: string[];
  supplierIds: string[];
  deadline?: Date;
  message?: string;
}

export interface StudyValidationParams {
  offerId: string;
  validatedBy: string;
  notes?: string;
  attachments?: string[];
}

export interface ProjectTransformParams {
  offerId: string;
  projectName?: string;
  startDate?: Date;
  estimatedEndDate?: Date;
  assignedTeam?: string[];
}

export interface LotSupplierSelection {
  lotId: string;
  supplierId: string;
  selectedPriceHT: number;
  selectedPriceTTC: number;
  reason?: string;
  alternatives?: string[];
}

// ========================================
// WORKFLOW TYPES
// ========================================

export interface AoWorkflowStatus {
  aoId: string;
  currentPhase: 'reception' | 'etude' | 'chiffrage' | 'selection' | 'complete';
  completedSteps: string[];
  pendingSteps: string[];
  blockers?: string[];
  estimatedCompletion?: Date;
}

export interface OfferWorkflowStatus {
  offerId: string;
  currentStatus: z.infer<typeof offerStatusEnum>;
  availableActions: string[];
  completedMilestones: string[];
  pendingMilestones: string[];
  blockers?: string[];
  canProceed: boolean;
  nextStep?: string;
}

// ========================================
// VALIDATION TYPES
// ========================================

export interface AoValidation {
  isValid: boolean;
  errors?: string[];
  warnings?: string[];
  missingFields?: string[];
  completeness: number;
}

export interface OfferValidation {
  canStartChiffrage: boolean;
  canValidateStudies: boolean;
  canTransformToProject: boolean;
  missingRequirements?: string[];
  warnings?: string[];
  readiness: number;
}

// ========================================
// DOCUMENT TYPES
// ========================================

export interface AoDocumentUploadParams {
  aoId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  category: string;
}

export interface AoDocumentUploadResponse {
  uploadUrl: string;
  documentId: string;
  expiresAt: Date;
}

export interface AoDocumentConfirmation {
  documentId: string;
  objectKey: string;
  metadata?: Record<string, unknown>;
}
