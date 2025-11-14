/**
 * PDF PARSER - PDF Document Processing
 * 
 * Extracted from ocrService.ts to reduce file size.
 * Handles PDF text extraction and parsing.
 * 
 * Target LOC: ~400-500
 */

import type pdfParse from 'pdf-parse';
import { logger } from '../../utils/logger';
import { AppError } from '../../utils/error-handler';
import { contextualOCREngine, type ContextualOCRResult } from '../ContextualOCREngine';
import type { AOFieldsExtracted, TechnicalScoringResult } from '@shared/schema';
// AO_PATTERNS importé via ocrService

// Imports dynamiques pour éviter les erreurs d'initialisation
let pdfParseModule: typeof pdfParse | null = null;
let isInitializingPdfParse = false;

// Initialisation dynamique des modules avec protection contre les race conditions
const initializeModules = async (): Promise<void> => {
  if (pdfParseModule) {
    return;
  }
  
  if (isInitializingPdfParse) {
    while (isInitializingPdfParse && !pdfParseModule) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    return;
  }
  
  try {
    isInitializingPdfParse = true;
    logger.info('Initialisation module pdf-parse', {
      metadata: {
        service: 'PDFParser',
        operation: 'initializeModules'
      }
    });
    
    const pdfParseImport = await import('pdf-parse');
    pdfParseModule = pdfParseImport.default || pdfParseImport;
    
    if (typeof pdfParseModule !== 'function') {
      throw new AppError('pdf-parse module not properly imported', 500);
    }
    
    logger.info('Module pdf-parse initialisé avec succès', {
      metadata: {
        service: 'PDFParser',
        operation: 'initializeModules'
      }
    });
    isInitializingPdfParse = false;
  } catch (error) {
    isInitializingPdfParse = false;
    logger.info('Tentative initialisation fallback pdf-parse', {
      metadata: {
        service: 'PDFParser',
        operation: 'initializeModules'
      }
    });
    
    try {
      const { default: pdfParse } = await import('pdf-parse');
      pdfParseModule = pdfParse;
      logger.info('Initialisation fallback pdf-parse réussie', {
        metadata: {
          service: 'PDFParser',
          operation: 'initializeModules'
        }
      });
    } catch (fallbackError) {
      pdfParseModule = null;
      logger.info('Continuation avec traitement OCR uniquement', {
        metadata: {
          service: 'PDFParser',
          operation: 'initializeModules',
          error: fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
        }
      });
    }
  }
};

export interface PDFParseResult {
  extractedText: string;
  confidence: number;
  processedFields: AOFieldsExtracted;
  technicalScoring?: TechnicalScoringResult;
  contextualResult?: ContextualOCRResult;
  rawData: unknown;
}

export class PDFParser {
  /**
   * Extrait le texte natif depuis un PDF
   */
  async extractNativeText(pdfBuffer: Buffer): Promise<string> {
    try {
      if (!pdfParseModule) {
        logger.info('pdf-parse non initialisé, appel initializeModules', {
          metadata: {
            service: 'PDFParser',
            operation: 'extractNativeText'
          }
        });
        await initializeModules();
      }
      
      if (!pdfParseModule) {
        logger.info('Module pdf-parse indisponible, skip extraction texte natif', {
          metadata: {
            service: 'PDFParser',
            operation: 'extractNativeText'
          }
        });
        return '';
      }
      
      logger.info('Extraction texte natif depuis PDF', {
        metadata: {
          service: 'PDFParser',
          operation: 'extractNativeText'
        }
      });
      
      const data = await pdfParseModule(pdfBuffer);
      const extractedText = data.text || '';
      
      logger.info('Extraction texte natif terminée', {
        metadata: {
          service: 'PDFParser',
          operation: 'extractNativeText',
          charactersExtracted: extractedText.length
        }
      });
      
      return extractedText;
    } catch (error) {
      logger.error('[PDFParser] Erreur lors de l\'extraction du texte natif', {
        metadata: {
          service: 'PDFParser',
          operation: 'extractNativeText',
          error: error instanceof Error ? error.message : String(error)
        }
      });
      return '';
    }
  }

  /**
   * Parse les champs AO depuis le texte extrait
   * Note: Cette méthode délègue à ocrService pour l'instant
   * TODO: Extraire complètement la logique de parsing
   */
  async parseAOFields(text: string, parseAOFieldsFn: (text: string) => Promise<AOFieldsExtracted>): Promise<AOFieldsExtracted> {
    return await parseAOFieldsFn(text);
  }

  /**
   * Traite un PDF et retourne les résultats
   */
  async processPDF(
    pdfBuffer: Buffer,
    parseAOFieldsFn: (text: string) => Promise<AOFieldsExtracted>,
    computeTechnicalScoringFn: (specialCriteria?: unknown, reference?: string) => Promise<TechnicalScoringResult | undefined>
  ): Promise<PDFParseResult> {
    try {
      logger.info('Démarrage traitement PDF', {
        metadata: {
          service: 'PDFParser',
          operation: 'processPDF'
        }
      });
      
      await initializeModules();
      
      logger.info('Tentative extraction texte natif PDF', {
        metadata: {
          service: 'PDFParser',
          operation: 'processPDF'
        }
      });
      
      const nativeText = await this.extractNativeText(pdfBuffer);
      
      if (nativeText && nativeText.length > 100) {
        logger.info('PDF avec texte natif détecté', {
          metadata: {
            service: 'PDFParser',
            operation: 'processPDF',
            textLength: nativeText.length
          }
        });
        
        let processedFields = await this.parseAOFields(nativeText, parseAOFieldsFn);
        
        logger.info('Application moteur contextuel pour AO', {
          metadata: {
            service: 'PDFParser',
            operation: 'processPDF'
          }
        });
        
        let contextualResult: ContextualOCRResult | undefined;
        let finalConfidence = 95;
        
        try {
          const contextualResultTemp = await contextualOCREngine.enhanceOCRFields(processedFields, 'ao');
          contextualResult = contextualResultTemp;
          
          if (contextualResult) {
            const enhancedFields = contextualResult.extractedFields as AOFieldsExtracted;
            processedFields = { ...processedFields, ...enhancedFields };
            
            processedFields.contextualMetadata = {
              processingMethod: 'contextual_enhanced',
              similarAOsFound: contextualResult.mappingResults.filter(m => m.source === 'context_inferred').length,
              confidenceBoost: contextualResult.contextualScore * 10,
              autoCompletedFromContext: contextualResult.autoCompletedFields,
              validationFlags: contextualResult.validationErrors.map(e => e.fieldName)
            };
            
            finalConfidence = Math.min(100, 95 + (contextualResult.contextualScore * 5));
            
            logger.info('Amélioration contextuelle AO terminée', {
              metadata: {
                service: 'PDFParser',
                operation: 'processPDF',
                contextualScore: contextualResult.contextualScore,
                fieldsMappedCount: contextualResult.mappingResults.length
              }
            });
          }
        } catch (error) {
          logger.warn('[PDFParser] Le moteur contextuel a échoué, utilisation des champs de base', {
            metadata: {
              service: 'PDFParser',
              operation: 'processPDF',
              error: error instanceof Error ? error.message : String(error)
            }
          });
        }
        
        const technicalScoring = await computeTechnicalScoringFn(processedFields.specialCriteria, processedFields.reference);
        
        return {
          extractedText: nativeText,
          confidence: finalConfidence,
          processedFields,
          technicalScoring,
          contextualResult,
          rawData: { 
            method: 'native-text',
            contextualEnhanced: !!contextualResult
          }
        };
      }
      
      throw new AppError('PDF scanné détecté, fallback OCR requis', 400);
    } catch (error) {
      logger.error('[PDFParser] Erreur traitement PDF', {
        metadata: {
          service: 'PDFParser',
          operation: 'processPDF',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      
      if (error instanceof Error) {
        if (error.message.includes('pdf-parse')) {
          throw new AppError(`Erreur lors du traitement OCR - Module PDF non initialisé: ${error.message}`, 500);
        } else if (error.message.includes('fallback OCR requis')) {
          throw error;
        } else {
          throw new AppError(`Erreur lors du traitement OCR - Erreur générale: ${error.message}`, 500);
        }
      } else {
        throw new AppError(`Erreur lors du traitement OCR - Erreur inconnue: ${String(error)}`, 500);
      }
    }
  }
}

