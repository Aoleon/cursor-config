/**
 * Workspace Module Routes
 * 
 * This module provides workspace-specific data for different user roles:
 * - Project Manager workspace: tasks, offers, projects
 * - BE workspace: validation tasks, workload
 * - Travaux/SAV workspace: SAV tasks, worksite tasks
 * - Logistics workspace: deliveries, slots, receptions
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { isAuthenticated } from '../auth/routes';
import { rateLimits } from '../../middleware/rate-limiter';
import { sendSuccess } from '../../middleware/errorHandler';
import { logger } from '../../utils/logger';
import type { IStorage } from '../../storage-poc';
import type { EventBus } from '../../eventBus';

export function createWorkspaceRouter(storage: IStorage, eventBus: EventBus): Router {
  const router = Router();

  // ========================================
  // PROJECT MANAGER WORKSPACE
  // ========================================

  /**
   * GET /api/workspace/tasks
   * Get tasks/actions for project manager workspace
   */
  router.get(
    '/api/workspace/tasks',
    isAuthenticated,
    rateLimits.general,
    asyncHandler(async (req: Request, res: Response) => {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return sendSuccess(res, []);
      }

      const role = (req.user as any)?.role || 'chef_projet';

      // Fetch offers needing action
      const offers = (storage.getOffers && typeof storage.getOffers === 'function')
        ? await (storage.getOffers as () => Promise<any[]>)()
        : [];

      const tasks: any[] = [];

      // Tasks from offers
      for (const offer of offers) {
        if (offer.responsibleUserId !== userId) continue;

        // Validation task
        if (offer.status === 'en_attente_validation' && !offer.finEtudesValidatedAt) {
          tasks.push({
            id: `validation-${offer.id}`,
            type: 'validation',
            title: `Valider l'offre ${offer.reference}`,
            entityId: offer.id,
            entityType: 'offer',
            priority: offer.isPriority ? 'high' : 'medium',
            dueDate: offer.deadline
          });
        }

        // Chiffrage task
        if (offer.status === 'en_cours_chiffrage') {
          tasks.push({
            id: `chiffrage-${offer.id}`,
            type: 'chiffrage',
            title: `Chiffrer l'offre ${offer.reference}`,
            entityId: offer.id,
            entityType: 'offer',
            priority: offer.isPriority ? 'high' : 'medium',
            dueDate: offer.deadline
          });
        }

        // Transformation task
        if (offer.status === 'valide' && offer.finEtudesValidatedAt) {
          const allProjects = (storage.getProjects && typeof storage.getProjects === 'function')
            ? await (storage.getProjects as () => Promise<any[]>)()
            : [];
          const project = allProjects.find((p: any) => p.offerId === offer.id);

          if (!project) {
            tasks.push({
              id: `transform-${offer.id}`,
              type: 'transformation',
              title: `Transformer l'offre ${offer.reference} en projet`,
              entityId: offer.id,
              entityType: 'offer',
              priority: offer.isPriority ? 'high' : 'medium'
            });
          }
        }
      }

      // Tasks from projects
      const projects = (storage.getProjects && typeof storage.getProjects === 'function')
        ? await (storage.getProjects as () => Promise<any[]>())()
        : [];

      for (const project of projects) {
        if (project.responsibleUserId !== userId) continue;

        // Planning task
        if (project.status === 'planification' && !project.startDate) {
          tasks.push({
            id: `planning-${project.id}`,
            type: 'planning',
            title: `Planifier le projet ${project.name}`,
            entityId: project.id,
            entityType: 'project',
            priority: 'medium'
          });
        }
      }

      sendSuccess(res, tasks);
    })
  );

  // ========================================
  // BE WORKSPACE
  // ========================================

  /**
   * GET /api/workspace/be/validation-tasks
   * Get validation tasks for BE workspace
   */
  router.get(
    '/api/workspace/be/validation-tasks',
    isAuthenticated,
    rateLimits.general,
    asyncHandler(async (req: Request, res: Response) => {
      const userId = (req.user as any)?.id;

      // Fetch offers needing BE validation
      const offers = (storage.getOffers && typeof storage.getOffers === 'function')
        ? await (storage.getOffers as () => Promise<any[]>)()
        : [];

      const tasks: any[] = [];

      for (const offer of offers) {
        // Fin d'études validation
        if (offer.status === 'en_attente_validation' && !offer.finEtudesValidatedAt) {
          tasks.push({
            id: `fin-etudes-${offer.id}`,
            offerId: offer.id,
            offerReference: offer.reference || offer.id,
            client: offer.client || 'N/A',
            type: 'fin_etudes',
            priority: offer.isPriority ? 'high' : 'medium',
            deadline: offer.deadline,
            status: 'pending'
          });
        }

        // BE validation
        if (offer.status === 'en_attente_validation_be') {
          tasks.push({
            id: `be-validation-${offer.id}`,
            offerId: offer.id,
            offerReference: offer.reference || offer.id,
            client: offer.client || 'N/A',
            type: 'be_validation',
            priority: offer.isPriority ? 'high' : 'medium',
            deadline: offer.deadline,
            status: 'pending'
          });
        }
      }

      // Filter by user if specified
      const filteredTasks = userId
        ? tasks.filter(t => {
            // For now, show all tasks. In future, filter by assignment
            return true;
          })
        : tasks;

      sendSuccess(res, filteredTasks);
    })
  );

  // ========================================
  // TRAVAUX/SAV WORKSPACE
  // ========================================

  /**
   * GET /api/workspace/travaux/sav-tasks
   * Get SAV tasks for travaux workspace
   */
  router.get(
    '/api/workspace/travaux/sav-tasks',
    isAuthenticated,
    rateLimits.general,
    asyncHandler(async (req: Request, res: Response) => {
      const userId = (req.user as any)?.id;

      // Fetch SAV requests
      const savRequests = (storage.getSavRequests && typeof storage.getSavRequests === 'function')
        ? await (storage.getSavRequests as () => Promise<any[]>)()
        : [];

      const tasks: any[] = [];

      for (const request of savRequests) {
        if (request.status === 'termine' || request.status === 'annule') continue;

        tasks.push({
          id: request.id,
          type: request.type || 'demande',
          title: request.title || request.description || `Demande SAV #${request.id.slice(0, 8)}`,
          projectId: request.projectId,
          projectName: request.projectName,
          priority: request.priority || 'medium',
          status: request.status || 'en_attente',
          dueDate: request.dueDate || request.createdAt,
          assignedTo: request.assignedTo || request.assignedUserId
        });
      }

      sendSuccess(res, tasks);
    })
  );

  /**
   * GET /api/workspace/travaux/worksite-tasks
   * Get worksite tasks for travaux workspace
   */
  router.get(
    '/api/workspace/travaux/worksite-tasks',
    isAuthenticated,
    rateLimits.general,
    asyncHandler(async (req: Request, res: Response) => {
      const userId = (req.user as any)?.id;

      // Fetch projects in worksite phase
      const projects = (storage.getProjects && typeof storage.getProjects === 'function')
        ? await (storage.getProjects as () => Promise<any[]>)()
        : [];

      const tasks: any[] = [];

      for (const project of projects) {
        if (!['chantier', 'approvisionnement'].includes(project.status)) continue;

        // Check if user is assigned or responsible
        const isAssigned = project.responsibleUserId === userId || 
                          project.chefTravaux === userId ||
                          (project.chefTravauxUser as any)?.id === userId;

        if (!isAssigned && userId) continue;

        tasks.push({
          id: project.id,
          projectId: project.id,
          projectName: project.name,
          client: project.client || 'N/A',
          location: project.location || 'N/A',
          startDate: project.startDate,
          status: project.status,
          priority: project.isPriority ? 'high' : 'medium'
        });
      }

      sendSuccess(res, tasks);
    })
  );

  // ========================================
  // LOGISTICS WORKSPACE
  // ========================================

  // Note: Logistics routes are already in logistics module
  // These workspace routes just provide filtered views

  // ========================================
  // UNIFIED INBOX
  // ========================================

  /**
   * GET /api/workspace/inbox
   * Get unified inbox items for current user
   */
  router.get(
    '/api/workspace/inbox',
    isAuthenticated,
    rateLimits.general,
    asyncHandler(async (req: Request, res: Response) => {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return sendSuccess(res, []);
      }

      const role = (req.user as any)?.role || 'chef_projet';
      const inboxItems: any[] = [];

      // Get tasks from project manager workspace
      const offers = (storage.getOffers && typeof storage.getOffers === 'function')
        ? await (storage.getOffers as () => Promise<any[]>)()
        : [];

      for (const offer of offers) {
        if (offer.responsibleUserId !== userId) continue;

        // Validation task
        if (offer.status === 'en_attente_validation' && !offer.finEtudesValidatedAt) {
          inboxItems.push({
            id: `validation-${offer.id}`,
            type: 'validation',
            title: `Valider l'offre ${offer.reference}`,
            description: `Offre ${offer.reference} - ${offer.client}`,
            priority: offer.isPriority ? 'high' : 'medium',
            entityId: offer.id,
            entityType: 'offer',
            dueDate: offer.deadline,
            createdAt: offer.updatedAt || offer.createdAt,
            read: false,
            actionUrl: `/offers/${offer.id}`
          });
        }

        // Chiffrage task
        if (offer.status === 'en_cours_chiffrage') {
          inboxItems.push({
            id: `chiffrage-${offer.id}`,
            type: 'chiffrage',
            title: `Chiffrer l'offre ${offer.reference}`,
            description: `Offre ${offer.reference} - ${offer.client}`,
            priority: offer.isPriority ? 'high' : 'medium',
            entityId: offer.id,
            entityType: 'offer',
            dueDate: offer.deadline,
            createdAt: offer.updatedAt || offer.createdAt,
            read: false,
            actionUrl: `/offers/${offer.id}/chiffrage`
          });
        }
      }

      // Get projects tasks
      const projects = (storage.getProjects && typeof storage.getProjects === 'function')
        ? await (storage.getProjects as () => Promise<any[]>)()
        : [];

      for (const project of projects) {
        if (project.responsibleUserId !== userId) continue;

        // Planning task
        if (project.status === 'planification' && !project.startDate) {
          inboxItems.push({
            id: `planning-${project.id}`,
            type: 'planning',
            title: `Planifier le projet ${project.name}`,
            description: `Projet ${project.name} - ${project.client}`,
            priority: 'medium',
            entityId: project.id,
            entityType: 'project',
            createdAt: project.updatedAt || project.createdAt,
            read: false,
            actionUrl: `/projects/${project.id}`
          });
        }
      }

      // For BE role, add validation tasks
      if (role === 'technicien_be' || role === 'responsable_be') {
        for (const offer of offers) {
          if (offer.status === 'en_attente_validation' && !offer.finEtudesValidatedAt) {
            inboxItems.push({
              id: `be-validation-${offer.id}`,
              type: 'validation',
              title: `Valider fin d'études - ${offer.reference}`,
              description: `Offre ${offer.reference} - ${offer.client}`,
              priority: offer.isPriority ? 'high' : 'medium',
              entityId: offer.id,
              entityType: 'offer',
              dueDate: offer.deadline,
              createdAt: offer.updatedAt || offer.createdAt,
              read: false,
              actionUrl: `/offers/${offer.id}`
            });
          }
        }
      }

      sendSuccess(res, inboxItems);
    })
  );

  /**
   * POST /api/workspace/inbox/:id/read
   * Mark inbox item as read
   */
  router.post(
    '/api/workspace/inbox/:id/read',
    isAuthenticated,
    rateLimits.general,
    asyncHandler(async (req: Request, res: Response) => {
      // For now, just return success
      // In future, could store read status in database
      sendSuccess(res, { success: true });
    })
  );

  return router;
}

