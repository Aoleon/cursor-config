/**
 * Projects Module
 * 
 * This module handles all project-related functionality including:
 * - Project management and lifecycle
 * - Task management and subtasks
 * - Timeline calculations and scheduling
 * - SAV (after-sales service) operations
 * - Visa architecte management
 * - Project contacts management
 */

export { createProjectsRouter, default as projectsRouter } from './routes';
export * from './types';