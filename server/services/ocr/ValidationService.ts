/**
 * VALIDATION SERVICE - OCR Field Validation and Correction
 * 
 * Extracted from ocrService.ts to reduce file size.
 * Handles field validation and correction for OCR results.
 * 
 * Target LOC: ~200-300
 */

import { logger } from '../../utils/logger';
import { contextualOCREngine } from '../ContextualOCREngine';
import type { AOFieldsExtracted, SupplierQuoteFields, FieldCorrection } from '@shared/schema';

export interface ValidationResult {
  correctedFields: AOFieldsExtracted | SupplierQuoteFields;
  corrections: FieldCorrection[];
  validationScore: number;
}

export class ValidationService {
  /**
   * Valide et corrige automatiquement les champs extraits
   */
  async validateAndCorrectFields(
    fields: AOFieldsExtracted | SupplierQuoteFields,
    documentType: 'ao' | 'supplier_quote'
  ): Promise<ValidationResult> {
    try {
      logger.info('Validation et correction champs', {
        metadata: {
          service: 'ValidationService',
          operation: 'validateAndCorrectFields',
          documentType: documentType
        }
      });
      
      const contextualResult = await (contextualOCREngine as any).enhanceOCRFields(fields, documentType);
      
      const validationScore = this.calculateValidationScore(contextualResult.validationErrors);
      
      logger.info('Validation terminée', {
        metadata: {
          service: 'ValidationService',
          operation: 'validateAndCorrectFields',
          documentType: documentType,
          validationScore: validationScore,
          correctionsCount: contextualResult.suggestedCorrections.length
        }
      });
      
      return {
        correctedFields: contextualResult.extractedFields,
        corrections: contextualResult.suggestedCorrections,
        validationScore
      };
    } catch (error) {
      logger.error('[ValidationService] Erreur lors de la validation et correction des champs', {
        metadata: {
          service: 'ValidationService',
          operation: 'validateAndCorrectFields',
          documentType,
          error: error instanceof Error ? error.message : String(error)
        }
      });
      return {
        correctedFields: fields,
        corrections: [],
        validationScore: 0.5
      };
    }
  }

  /**
   * Calcule un score de validation basé sur les erreurs
   */
  private calculateValidationScore(validationErrors: Array<{ fieldName: string; message: string }>): number {
    if (validationErrors.length === 0) {
      return 1.0;
    }
    
    // Score décroissant selon le nombre d'erreurs
    const baseScore = 1.0;
    const penaltyPerError = 0.1;
    const score = Math.max(0, baseScore - (validationErrors.length * penaltyPerError));
    
    return score;
  }
}

