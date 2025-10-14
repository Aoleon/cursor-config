/**
 * Documents Module
 * 
 * This module handles all document-related functionality including:
 * - OCR processing for PDFs and images
 * - PDF generation from templates
 * - Document analysis and classification
 * - Object storage management
 * - Template management and rendering
 */

export { createDocumentsRouter, default as documentsRouter } from './routes';
export * from './types';