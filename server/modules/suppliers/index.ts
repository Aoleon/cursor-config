/**
 * Suppliers Module
 * 
 * This module handles all supplier-related functionality including:
 * - Supplier management and specializations
 * - Supplier requests and invitations
 * - Quote sessions and analysis
 * - Document processing with OCR integration
 * - Email communications with suppliers
 */

export { createSuppliersRouter, default as suppliersRouter } from './routes';
export * from './types';