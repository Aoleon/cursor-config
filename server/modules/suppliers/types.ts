/**
 * Suppliers Module Type Definitions
 * 
 * This module contains all type definitions related to supplier management,
 * quote analysis, supplier sessions, and document processing.
 */

import type { z } from 'zod';
import type {
  insertSupplierSchema,
  insertSupplierRequestSchema,
  insertSupplierSpecializationsSchema,
  insertSupplierQuoteSessionSchema,
  insertAoLotSupplierSchema,
  insertSupplierDocumentSchema,
  insertSupplierQuoteAnalysisSchema,
  Supplier,
  SupplierRequest,
  SupplierQuoteSession,
  AoLotSupplier,
  SupplierDocument,
  SupplierQuoteAnalysis
} from '@shared/schema';

// Request types
export type CreateSupplierRequest = z.infer<typeof insertSupplierSchema>;
export type UpdateSupplierRequest = Partial<CreateSupplierRequest>;

export type CreateSupplierRequestRequest = z.infer<typeof insertSupplierRequestSchema>;
export type UpdateSupplierRequestRequest = Partial<CreateSupplierRequestRequest>;

export type CreateSupplierSpecializationRequest = z.infer<typeof insertSupplierSpecializationsSchema>;
export type UpdateSupplierSpecializationRequest = Partial<CreateSupplierSpecializationRequest>;

export type CreateQuoteSessionRequest = z.infer<typeof insertSupplierQuoteSessionSchema>;
export type UpdateQuoteSessionRequest = Partial<CreateQuoteSessionRequest>;

export type CreateAoLotSupplierRequest = z.infer<typeof insertAoLotSupplierSchema>;
export type UpdateAoLotSupplierRequest = Partial<CreateAoLotSupplierRequest>;

export type CreateSupplierDocumentRequest = z.infer<typeof insertSupplierDocumentSchema>;
export type UpdateSupplierDocumentRequest = Partial<CreateSupplierDocumentRequest>;

export type CreateQuoteAnalysisRequest = z.infer<typeof insertSupplierQuoteAnalysisSchema>;
export type UpdateQuoteAnalysisRequest = Partial<CreateQuoteAnalysisRequest>;

// Response types
export interface SupplierResponse extends Supplier {
  specializations?: string[];
  activeQuotes?: number;
  rating?: number;
}

export interface SupplierRequestResponse extends SupplierRequest {
  supplierName?: string;
  offerReference?: string;
  responseTime?: number;
}

export interface QuoteSessionResponse extends SupplierQuoteSession {
  supplier?: SupplierResponse;
  documents?: SupplierDocumentResponse[];
  analysis?: QuoteAnalysisResponse;
  lots?: AoLotSupplierResponse[];
}

export interface AoLotSupplierResponse extends AoLotSupplier {
  lotName?: string;
  suppliers?: SupplierResponse[];
}

export interface SupplierDocumentResponse extends SupplierDocument {
  analysisStatus?: 'pending' | 'processing' | 'completed' | 'failed';
  extractedData?: unknown;
  ocrConfidence?: number;
}

export interface QuoteAnalysisResponse extends SupplierQuoteAnalysis {
  comparisonData?: QuoteComparison;
  recommendations?: string[];
  score?: number;
}

// Query parameter types
export interface SupplierQueryParams {
  search?: string;
  specialization?: string;
  status?: 'active' | 'inactive' | 'pending';
  limit?: number;
  offset?: number;
}

export interface SupplierRequestQueryParams {
  offerId?: string;
  supplierId?: string;
  status?: string;
  sortBy?: 'date' | 'deadline' | 'status';
}

export interface QuoteSessionQueryParams {
  aoId?: string;
  supplierId?: string;
  status?: 'draft' | 'sent' | 'received' | 'analyzing' | 'approved' | 'rejected';
  includeAnalysis?: boolean;
}

// Service types
export interface QuoteComparison {
  sessionId: string;
  supplierId: string;
  supplierName: string;
  totalHT: number;
  totalTTC: number;
  deliveryTime: number;
  qualityScore: number;
  priceScore: number;
  ranking: number;
  strengths: string[];
  weaknesses: string[];
}

export interface SupplierInvitation {
  sessionId: string;
  supplierId: string;
  aoId: string;
  aoLotId?: string;
  emailSent: boolean;
  inviteToken: string;
  expiresAt: Date;
}

export interface SupplierWorkflowStatus {
  aoId: string;
  totalSuppliers: number;
  invitedSuppliers: number;
  respondedSuppliers: number;
  analyzedQuotes: number;
  pendingQuotes: number;
  completionPercentage: number;
}

export interface OCRAnalysisResult {
  documentId: string;
  extractedText: string;
  confidence: number;
  extractedFields: {
    reference?: string;
    supplierName?: string;
    totalHT?: number;
    totalTTC?: number;
    deliveryDate?: Date;
    paymentTerms?: string;
    items?: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
      total: number;
    }>;
  };
  warnings?: string[];
}

// Email types
export interface SupplierEmailData {
  supplierId: string;
  supplierEmail: string;
  supplierName: string;
  aoReference: string;
  aoDescription: string;
  deadline: Date;
  inviteLink: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType: string;
  }>;
}

// Validation types
export interface SupplierValidation {
  isValid: boolean;
  errors?: string[];
  warnings?: string[];
}

export interface QuoteValidation {
  documentId: string;
  isComplete: boolean;
  missingFields?: string[];
  anomalies?: Array<{
    field: string;
    issue: string;
    severity: 'low' | 'medium' | 'high';
  }>;
}