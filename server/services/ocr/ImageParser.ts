/**
 * IMAGE PARSER - Image Document Processing
 * 
 * Extracted from ocrService.ts to reduce file size.
 * Handles image OCR processing using Tesseract.
 * 
 * Target LOC: ~300-400
 */

import { createWorker } from 'tesseract.js';
import sharp from 'sharp';
import { logger } from '../../utils/logger';
import { AppError } from '../../utils/error-handler';

export interface ImageParseResult {
  extractedText: string;
  confidence: number;
  rawData: unknown;
}

export class ImageParser {
  private tesseractWorker: unknown = null;

  /**
   * Initialise le worker Tesseract
   */
  async initialize(): Promise<void> {
    try {
      if (this.tesseractWorker) {
        return;
      }

      logger.info('Initialisation Tesseract worker', {
        metadata: {
          service: 'ImageParser',
          operation: 'initialize'
        }
      });

      this.tesseractWorker = await createWorker('fra');
      
      logger.info('Tesseract worker initialisé', {
        metadata: {
          service: 'ImageParser',
          operation: 'initialize'
        }
      });
    } catch (error) {
      logger.error('[ImageParser] Erreur initialisation Tesseract', {
        metadata: {
          service: 'ImageParser',
          operation: 'initialize',
          error: error instanceof Error ? error.message : String(error)
        }
      });
      throw new AppError(`Erreur initialisation Tesseract: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }

  /**
   * Prépare une image pour l'OCR
   */
  private async prepareImage(imageBuffer: Buffer): Promise<Buffer> {
    try {
      const processed = await sharp(imageBuffer)
        .greyscale()
        .normalize()
        .sharpen()
        .toBuffer();
      
      return processed;
    } catch (error) {
      logger.error('[ImageParser] Erreur préparation image', {
        metadata: {
          service: 'ImageParser',
          operation: 'prepareImage',
          error: error instanceof Error ? error.message : String(error)
        }
      });
      return imageBuffer; // Retourner l'image originale en cas d'erreur
    }
  }

  /**
   * Traite une image avec OCR
   */
  async processImage(imageBuffer: Buffer): Promise<ImageParseResult> {
    try {
      if (!this.tesseractWorker) {
        await this.initialize();
      }

      logger.info('Démarrage traitement image OCR', {
        metadata: {
          service: 'ImageParser',
          operation: 'processImage'
        }
      });

      const preparedImage = await this.prepareImage(imageBuffer);
      
      const worker = this.tesseractWorker as Awaited<ReturnType<typeof createWorker>>;
      const { data } = await worker.recognize(preparedImage);
      
      const extractedText = data.text || '';
      const confidence = data.confidence || 0;

      logger.info('Traitement image OCR terminé', {
        metadata: {
          service: 'ImageParser',
          operation: 'processImage',
          textLength: extractedText.length,
          confidence
        }
      });

      return {
        extractedText,
        confidence,
        rawData: {
          method: 'tesseract-ocr',
          words: (data as any).words?.length || 0
        }
      };
    } catch (error) {
      logger.error('[ImageParser] Erreur traitement image OCR', {
        metadata: {
          service: 'ImageParser',
          operation: 'processImage',
          error: error instanceof Error ? error.message : String(error)
        }
      });
      
      throw new AppError(`Erreur traitement image OCR: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }

  /**
   * Nettoie les ressources
   */
  async cleanup(): Promise<void> {
    try {
      if (this.tesseractWorker) {
        const worker = this.tesseractWorker as Awaited<ReturnType<typeof createWorker>>;
        await worker.terminate();
        this.tesseractWorker = null;
        
        logger.info('Tesseract worker terminé', {
          metadata: {
            service: 'ImageParser',
            operation: 'cleanup'
          }
        });
      }
    } catch (error) {
      logger.error('[ImageParser] Erreur cleanup', {
        metadata: {
          service: 'ImageParser',
          operation: 'cleanup',
          error: error instanceof Error ? error.message : String(error)
        }
      });
    }
  }
}

