/**
 * Chiffrage Module Type Definitions
 * 
 * This module contains all type definitions related to chiffrage (pricing),
 * DPGF calculations, validation milestones, and quotations.
 */

import type { z } from 'zod';
import type {
  insertChiffrageElementSchema,
  insertDpgfDocumentSchema,
  insertValidationMilestoneSchema,
  ChiffrageElement,
  DpgfDocument,
  ValidationMilestone,
  Quotation
} from '@shared/schema';

// Request types
export type CreateChiffrageElementRequest = z.infer<typeof insertChiffrageElementSchema>;
export type UpdateChiffrageElementRequest = Partial<CreateChiffrageElementRequest>;

export type CreateDpgfDocumentRequest = z.infer<typeof insertDpgfDocumentSchema>;
export type UpdateDpgfDocumentRequest = Partial<CreateDpgfDocumentRequest>;

export type CreateValidationMilestoneRequest = z.infer<typeof insertValidationMilestoneSchema>;
export type UpdateValidationMilestoneRequest = Partial<CreateValidationMilestoneRequest>;

// Response types
export interface ChiffrageElementResponse extends ChiffrageElement {
  totalCost?: number;
  totalWithMargin?: number;
}

export interface DpgfDocumentResponse extends DpgfDocument {
  elements?: ChiffrageElementResponse[];
  totalHT?: number;
  totalTVA?: number;
  totalTTC?: number;
}

export interface ValidationMilestoneResponse extends ValidationMilestone {
  progress?: number;
}

// Query parameter types
export interface DpgfQueryParams {
  includeOptional?: boolean;
  tvaPercentage?: number;
  format?: 'json' | 'pdf';
}

export interface QuotationQueryParams {
  status?: string;
  includeElements?: boolean;
  limit?: number;
  offset?: number;
}

// Service types
export interface DpgfCalculation {
  elements: ChiffrageElementResponse[];
  subtotal: number;
  tva: number;
  total: number;
  margins: {
    labor: number;
    material: number;
    total: number;
  };
}

export interface QuotationSummary {
  offerId: string;
  quotationId: string;
  status: string;
  totalHT: number;
  totalTTC: number;
  elementCount: number;
  createdAt: Date;
  updatedAt?: Date;
}

// Validation types
export type MilestoneType = 
  | 'conformite_dtu'
  | 'conformite_technique_marche'
  | 'coherence_chiffrages'
  | 'validation_commerciale'
  | 'validation_technique';

export interface MilestoneUpdate {
  isCompleted: boolean;
  completedAt?: Date;
  completedBy?: string;
  notes?: string;
}

// Export types
export interface DpgfExportOptions {
  format: 'pdf' | 'excel';
  includeDetails: boolean;
  includeImages: boolean;
  language: 'fr' | 'en';
}