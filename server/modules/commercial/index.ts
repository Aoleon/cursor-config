/**
 * Commercial Module
 * 
 * This module handles all commercial-related functionality including:
 * - AOs (Appels d'Offres / Calls for Tenders) management
 * - Offers (Offres Saxium) management and lifecycle
 * - AO Contacts management
 * - AO Lots and supplier management
 * - Supplier requests and quotations
 * - Supplier comparison and selection
 */

export { createCommercialRouter, default as commercialRouter } from './routes';
export * from './types';
