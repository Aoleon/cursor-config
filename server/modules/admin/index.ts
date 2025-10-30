/**
 * Admin Module Entry Point
 * 
 * Exports the admin router for registration in the main application.
 * 
 * ⚠️ HIGH-PRIVILEGE MODULE
 * All routes in this module require admin/executive authentication.
 */

export { createAdminRouter } from './routes';
