/**
 * Projects Module Routes
 * 
 * This module handles all project-related routes including:
 * - Project management (CRUD operations)
 * - Project tasks and subtasks
 * - Timeline calculations and management
 * - SAV (after-sales service) operations
 * - Visa architecte management
 * - Project contacts
 */

import { Router } from 'express';
import { withErrorHandling } from './utils/error-handler';
import type { Request, Response } from 'express';
import { isAuthenticated } from '../../replitAuth';
import { asyncHandler, createError } from '../../middleware/errorHandler';
import { validateBody, validateParams, validateQuery, commonParamSchemas } from '../../middleware/validation';
import { rateLimits } from '../../middleware/rate-limiter';
import { sendSuccess, sendPaginatedSuccess } from '../../middleware/errorHandler';
import { ValidationError, NotFoundError } from '../../utils/error-handler';
import { logger } from '../../utils/logger';
import type { IStorage } from '../../storage-poc';
// storageFacade import removed - using injected storage parameter
import type { EventBus } from '../../eventBus';
import { z } from 'zod';
import {
  insertProjectSchema,
  insertProjectTaskSchema,
  insertProjectTimelineSchema,
  insertVisaArchitecteSchema,
  insertProjectReserveSchema,
  insertSavInterventionSchema,
  insertSavWarrantyClaimSchema,
  insertProjectContactsSchema,
  insertTempsPoseSchema,
  projectStatusEnum
} from '@shared/schema';
import { insertProjectFeedbackTerrainSchema } from '../../validation-schemas';
import { projectFeedbackService } from '../../services/ProjectFeedbackService';
import { DateIntelligenceService } from '../../services/DateIntelligenceService';
import type {
  ProjectQueryParams,
  ProjectTaskQueryParams,
  SAVQueryParams,
  TimelineCalculationParams,
  TimelineCalculationResult,
  ProjectValidation,
  GanttTask
} from './types';

// Validation schemas
const projectQuerySchema = z.object({
  status: z.enum(["passation", "etude", "visa_architecte", "planification", "approvisionnement", "chantier", "sav"]).optional(),
  clientId: z.string().uuid().optional(),
  search: z.string().optional(),
  includeArchived: z.enum(['true', 'false']).optional().default('false'),
  sortBy: z.enum(['date', 'status', 'client', 'deadline']).optional(),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  offset: z.coerce.number().min(0).optional().default(0)
});

const taskQuerySchema = z.object({
  status: z.enum(['pending', 'in_progress', 'completed', 'blocked']).optional(),
  assignedTo: z.string().uuid().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  includeSubtasks: z.enum(['true', 'false']).optional().default('false')
});

const savQuerySchema = z.object({
  projectId: z.string().uuid().optional(),
  status: z.enum(['pending', 'in_progress', 'resolved', 'closed']).optional(),
  type: z.enum(['reserve', 'intervention', 'warranty']).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional()
});

export function createProjectsRouter(storage: IStorage, eventBus: EventBus): Router {
  const router = Router();
  
  // Initialize services
  const dateIntelligenceService = new DateIntelligenceService(storage);

  // ========================================
  // PROJECT MANAGEMENT ROUTES
  // ========================================

  // Get project schema
  router.get('/api/projects/schema',
    isAuthenticated,
    asyncHandler(async (req: Request, res: Response) => {
      logger.info('[Projects] Récupération schéma projet', { metadata: {

          route: '/api/projects/schema',
          method: 'GET',
          userId: req.user?.id
      }
    });

      res.json({
        success: true,
        data: {
          statuses: ['etude', 'planifie', 'chantier', 'reception', 'sav', 'cloture'],
          priorities: ['low', 'medium', 'high', 'urgent'],
          phases: ['preparation', 'execution', 'finition', 'reception']
        
      });
          }
        })
      );

  // Get project configuration
  router.get('/api/projects/config',
    isAuthenticated,
    asyncHandler(async (req: Request, res: Response) => {
      logger.info('[Projects] Récupération configuration projet', { metadata: {

          route: '/api/projects/config',
          method: 'GET',
          userId: req.user?.id
      }
    });

      res.json({
        success: true,
        data: {
          workingDaysPerWeek: 5,
          hoursPerDay: 8,
          defaultBufferPercentage: 10,
          enableWeekendWork: false,
          holidays: [] // Could be loaded from configuration
        
      });
          }
        })
      );

  // Get all projects with filters
  router.get('/api/projects',
    isAuthenticated,
    validateQuery(projectQuerySchema),
    asyncHandler(async (req: Request, res: Response) => {
      const params: ProjectQueryParams = req.query;
      
      logger.info('[Projects] Récupération projets', { metadata: {

          route: '/api/projects',
          method: 'GET',
          status: params.status,
          search: params.search,
          userId: req.user?.id
      }
    });

      const limit = Number(params.limit) || 20;
      const offset = Number(params.offset) || 0;

      const { projects: paginatedProjects, total } = await storage.getProjectsPaginated(
        params.search as string | undefined,
        params.status,
        limit,
        offset
      );

      sendPaginatedSuccess(res, paginatedProjects, {
        page: Math.floor(offset / limit) + 1,
        limit,
        total
      });
          }
        })
      );

  // Get single project
  router.get('/api/projects/:id',
    isAuthenticated,
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = req.params;
      
      logger.info('[Projects] Récupération projet', { metadata: {

          route: '/api/projects/:id',
          method: 'GET',
          projectId: id,
          userId: req.user?.id
      }
    });

      const project = await storage.getProject(id);
      if (!project) {
        throw new NotFoundError('Projet', id);
      }

      sendSuccess(res, project);
              })
            );
  // Create project
  router.post('/api/projects',
    isAuthenticated,
    rateLimits.creation,
    validateBody(insertProjectSchema),
    asyncHandler(async (req: Request, res: Response) => {
      logger.info('[Projects] Création projet', { metadata: {

          route: '/api/projects',
          method: 'POST',
          name: req.body.name,
          userId: req.user?.id
      }
    });

      const project = await storage.createProject({
        ...req.body,
        createdBy: req.user?.id
      });

      // Initialize timeline if requested
      if (req.body.initializeTimeline) {
        await dateIntelligenceService.generateProjectTimeline(project.id);
      }

      eventBus.emit('project:created', {
        projectId: project.id,
        name: project.name,
        userId: req.user?.id
      });

      sendSuccess(res, project, 201);
              })
            );
  // Update project
  router.patch('/api/projects/:id',
    isAuthenticated,
    validateBody(insertProjectSchema.partial()),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = req.params;
      
      logger.info('[Projects] Mise à jour projet', { metadata: {

          route: '/api/projects/:id',
          method: 'PATCH',
          projectId: id,
          userId: req.user?.id
      }
    });

      const project = await storage.updateProject(id, req.body);
      
      eventBus.emit('project:updated', {
        projectId: id,
        changes: Object.keys(req.body),
        userId: req.user?.id
      });

      sendSuccess(res, project);
              })
            );
  // ========================================
  // PROJECT TASKS ROUTES
  // ========================================

  // Get project tasks
  router.get('/api/projects/:projectId/tasks',
    isAuthenticated,
    validateQuery(taskQuerySchema),
    asyncHandler(async (req: Request, res: Response) => {
      const { projectId } = req.params;
      const params: ProjectTaskQueryParams = req.query;
      
      logger.info('[Projects] Récupération tâches projet', { metadata: {

          route: '/api/projects/:projectId/tasks',
          method: 'GET',
          projectId,
          status: params.status,
          userId: req.user?.id
      }
    });

      const tasks = await storage.getProjectTasks(projectId);

      sendSuccess(res, tasks);
              })
            );
  // Create project task
  router.post('/api/projects/:projectId/tasks',
    isAuthenticated,
    validateBody(insertProjectTaskSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const { projectId } = req.params;
      
      logger.info('[Projects] Création tâche projet', { metadata: {

          route: '/api/projects/:projectId/tasks',
          method: 'POST',
          projectId,
          taskName: req.body.name,
          userId: req.user?.id
      }
    });

      const task = await storage.createProjectTask({
        ...req.body,
        projectId
      });

      eventBus.emit('project:task:created', {
        projectId,
        taskId: task.id,
        taskName: task.name,
        userId: req.user?.id
      });

      sendSuccess(res, task, 201);
              })
            );
  // Update task
  router.patch('/api/tasks/:id',
    isAuthenticated,
    validateBody(insertProjectTaskSchema.partial()),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = req.params;
      
      logger.info('[Projects] Mise à jour tâche', { metadata: {

          route: '/api/tasks/:id',
          method: 'PATCH',
          taskId: id,
          userId: req.user?.id
      }
    });

      const task = await storage.updateProjectTask(id, req.body);
      sendSuccess(res, task);
              })
            );
  // Get all tasks across projects
  router.get('/api/tasks/all',
    isAuthenticated,
    validateQuery(taskQuerySchema),
    asyncHandler(async (req: Request, res: Response) => {
      const params: ProjectTaskQueryParams = req.query;
      
      logger.info('[Projects] Récupération toutes tâches', { metadata: {

          route: '/api/tasks/all',
          method: 'GET',
          assignedTo: params.assignedTo,
          priority: params.priority,
          userId: req.user?.id
      }
    });

      const tasks = await storage.getAllTasks();
      sendSuccess(res, tasks);
              })
            );
  // ========================================
  // TIMELINE ROUTES
  // ========================================

  // Calculate project timeline
  router.post('/api/projects/:id/calculate-timeline',
    isAuthenticated,
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = req.params;
      const params: TimelineCalculationParams = {
        projectId: id,
        ...req.body
      };
      
      logger.info('[Projects] Calcul timeline projet', { metadata: {

          route: '/api/projects/:id/calculate-timeline',
          method: 'POST',
          projectId: id,
          userId: req.user?.id
      }
    });

      const timeline = await dateIntelligenceService.calculateProjectTimeline(params);
      
      // Save timeline to database
      await storage.createProjectTimeline({
        projectId: id,
        phases: timeline.phases as unknown,
        milestones: timeline.milestoas unknown, unknown,
        totalDuration: timeline.totalDuration,
        estimatedEndDate: timeline.estimatedEndDate,
        criticalPath: timeline.criticalPath
      });

      eventBus.emit('project:timeline:calculated', {
        projectId: id,
        totalDuration: timeline.totalDuration,
        userId: req.user?.id
      });

      sendSuccess(res, timeline);
          }
        })
      );

  // Recalculate timeline from phase
  router.put('/api/projects/:id/recalculate-from/:phase',
    isAuthenticated,
    asyncHandler(async (req: Request, res: Response) => {
      const { id, phase } = req.params;
      
      logger.info('[Projects] Recalcul timeline depuis phase', { metadata: {

          route: '/api/projects/:id/recalculate-from/:phase',
          method: 'PUT',
          projectId: id,
          phase,
          userId: req.user?.id
      }
    });

      const timeline = await dateIntelligenceService.recalculateFromPhase(id, phase);
      sendSuccess(res, timeline);
              })
            );
  // Get project study duration
  router.get('/api/projects/:id/study-duration',
    isAuthenticated,
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = req.params;
      
      logger.info('[Projects] Récupération durée étude', { metadata: {

          route: '/api/projects/:id/study-duration',
          method: 'GET',
          projectId: id,
          userId: req.user?.id
      }
    });

      const project = await storage.getProject(id);
      if (!project) {
        throw new NotFoundError('Projet', id);
      }

      const studyDuration = {
        estimatedDays: project.estimatedStudyDays || 10,
        actualDays: project.actualStudyDays,
        startDate: project.studyStartDate,
        endDate: project.studyEndDate,
        isCompleted: project.status !== 'etude'
      };

      sendSuccess(res, studyDuration);
              })
            );
  // Update project study duration
  router.patch('/api/projects/:id/study-duration',
    isAuthenticated,
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = req.params;
      const { estimatedDays, actualDays } = req.body;
      
      logger.info('[Projects] Mise à jour durée étude', { metadata: {

          route: '/api/projects/:id/study-duration',
          method: 'PATCH',
          projectId: id,
          estimatedDays,
          actualDays,
          userId: req.user?.id
      }
    });

      const update: unknown = {};
      if (estimatedDays !== undefined) update.estimatedStudyDays = estimatedDays;
      if (actualDays !== undefined) update.actualStudyDays = actualDays;

      const project = await storage.updateProject(id, update);
      sendSuccess(res, project);
              })
            );
  // ========================================
  // VISA ARCHITECTE ROUTES
  // ========================================

  // Get visa architecte for project
  router.get('/api/projects/:projectId/visa-architecte',
    isAuthenticated,
    asyncHandler(async (req: Request, res: Response) => {
      const { projectId } = req.params;
      
      logger.info('[Projects] Récupération visa architecte', { metadata: {

          route: '/api/projects/:projectId/visa-architecte',
          method: 'GET',
          projectId,
          userId: req.user?.id
      }
    });

      const visas = await storage.getVisaArchitecte(projectId);
      sendSuccess(res, visas);
              })
            );
  // Create visa architecte
  router.post('/api/projects/:projectId/visa-architecte',
    isAuthenticated,
    validateBody(insertVisaArchitecteSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const { projectId } = req.params;
      
      logger.info('[Projects] Création visa architecte', { metadata: {

          route: '/api/projects/:projectId/visa-architecte',
          method: 'POST',
          projectId,
          userId: req.user?.id
      }
    });

      const visa = await storage.createVisaArchitecte({
        ...req.body,
        projectId
      });

      eventBus.emit('project:visa:created', {
        projectId,
        visaId: visa.id,
        userId: req.user?.id
      });

      sendSuccess(res, visa, 201);
              })
            );
  // Update visa architecte
  router.patch('/api/visa-architecte/:id',
    isAuthenticated,
    validateBody(insertVisaArchitecteSchema.partial()),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = req.params;
      
      logger.info('[Projects] Mise à jour visa architecte', { metadata: {

          route: '/api/visa-architecte/:id',
          method: 'PATCH',
          visaId: id,
          userId: req.user?.id
      }
    });

      const visa = await storage.updateVisaArchitecte(id, req.body);
      sendSuccess(res, visa);
              })
            );
  // Delete visa architecte
  router.delete('/api/visa-architecte/:id',
    isAuthenticated,
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = req.params;
      
      logger.info('[Projects] Suppression visa architecte', { metadata: {

          route: '/api/visa-architecte/:id',
          method: 'DELETE',
          visaId: id,
          userId: req.user?.id
      }
    });

      await storage.deleteVisaArchitecte(id);
      res.status(204).send();
          }
        })
      );

  // ========================================
  // VALIDATION ROUTES
  // ========================================

  // Check if project can proceed to planning
  router.get('/api/projects/:projectId/can-proceed-to-planning',
    isAuthenticated,
    asyncHandler(async (req: Request, res: Response) => {
      const { projectId } = req.params;
      
      logger.info('[Projects] Vérification passage planification', { metadata: {

          route: '/api/projects/:projectId/can-proceed-to-planning',
          method: 'GET',
          projectId,
          userId: req.user?.id
      }
    });

      const project = await storage.getProject(projectId);
      if (!project) {
        throw new NotFoundError('Projet', projectId);
      }

      const validation: ProjectValidation = {
        canProceedToPlanning: false,
        missingRequirements: [],
        warnings: [],
        readiness: 0
      };

      // Check requirements
      const requirements = [];
      if (!project.contractSigned) requirements.push('Contrat non signé');
      if (!project.depositReceived) requirements.push('Acompte non reçu');
      if (!project.technicalValidation) requirements.push('Validation technique manquante');
      if (!project.clientApproval) requirements.push('Approbation client manquante');

      validation.missingRequirements = requirements;
      validation.readiness = Math.round(((4 - requirements.length) / 4) * 100);
      validation.canProceedToPlanning = requirements.length === 0;

      sendSuccess(res, validation);
          }
        })
      );

  // ========================================
  // SAV (AFTER-SALES SERVICE) ROUTES
  // ========================================

  // Get project reserves
  router.get('/api/projects/:projectId/reserves',
    isAuthenticated,
    asyncHandler(async (req: Request, res: Response) => {
      const { projectId } = req.params;
      
      logger.info('[Projects] Récupération réserves projet', { metadata: {

          route: '/api/projects/:projectId/reserves',
          method: 'GET',
          projectId,
          userId: req.user?.id
      }
    });

      const reserves = await storage.getProjectReserves(projectId);
      sendSuccess(res, reserves);
              })
            );
  // Create project reserve
  router.post('/api/projects/:projectId/reserves',
    isAuthenticated,
    validateBody(insertProjectReserveSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const { projectId } = req.params;
      
      logger.info('[Projects] Création réserve projet', { metadata: {

          route: '/api/projects/:projectId/reserves',
          method: 'POST',
          projectId,
          type: req.body.type,
          userId: req.user?.id
      }
    });

      const reserve = await storage.createProjectReserve({
        ...req.body,
        projectId
      });

      eventBus.emit('project:reserve:created', {
        projectId,
        reserveId: reserve.id,
        userId: req.user?.id
      });

      sendSuccess(res, reserve, 201);
              })
            );
  // Get SAV interventions
  router.get('/api/sav/interventions',
    isAuthenticated,
    validateQuery(savQuerySchema),
    asyncHandler(async (req: Request, res: Response) => {
      const params: SAVQueryParams = req.query;
      
      logger.info('[Projects] Récupération interventions SAV', { metadata: {

          route: '/api/sav/interventions',
          method: 'GET',
          projectId: params.projectId,
          status: params.status,
          userId: req.user?.id
      }
    });

      // Filter interventions by params if projectId is provided
      if (!params.projectId) {
        throw new ValidationError('projectId requis pour récupérer les interventions SAV');
      }
      
      const interventions = await storage.getSavInterventions(params.projectId);
      sendSuccess(res, interventions);
              })
            );
  // Create SAV intervention
  router.post('/api/sav/interventions',
    isAuthenticated,
    validateBody(insertSavInterventionSchema),
    asyncHandler(async (req: Request, res: Response) => {
      logger.info('[Projects] Création intervention SAV', { metadata: {

          route: '/api/sav/interventions',
          method: 'POST',
          projectId: req.body.projectId,
          type: req.body.type,
          userId: req.user?.id
      }
    });

      const intervention = await storage.createSavIntervention({
        ...req.body,
        createdBy: req.user?.id
      });

      eventBus.emit('sav:intervention:created', {
        interventionId: intervention.id,
        projectId: intervention.projectId,
        userId: req.user?.id
      });

      sendSuccess(res, intervention, 201);
              })
            );
  // Get warranty claims
  router.get('/api/sav/warranty-claims',
    isAuthenticated,
    validateQuery(savQuerySchema),
    asyncHandler(async (req: Request, res: Response) => {
      const params: SAVQueryParams = req.query;
      
      logger.info('[Projects] Récupération réclamations garantie', { metadata: {

          route: '/api/sav/warranty-claims',
          method: 'GET',
          projectId: params.projectId,
          status: params.status,
          userId: req.user?.id
      }
    });

      // For warranty claims, we need to query all SAV interventions first
      // then get claims for each intervention
      // For now, return empty array if no specific intervention ID is provided
      const claims: unknown[] = [];
      sendSuccess(res, claims);
              })
            );
  // Create warranty claim
  router.post('/api/sav/warranty-claims',
    isAuthenticated,
    validateBody(insertSavWarrantyClaimSchema),
    asyncHandler(async (req: Request, res: Response) => {
      logger.info('[Projects] Création réclamation garantie', { metadata: {

          route: '/api/sav/warranty-claims',
          method: 'POST',
          projectId: req.body.projectId,
          userId: req.user?.id
      }
    });

      const claim = await storage.createSavWarrantyClaim({
        ...req.body,
        createdBy: req.user?.id
      });

      eventBus.emit('sav:warranty:created', {
        claimId: claim.id,
        projectId: claim.projectId,
        userId: req.user?.id
      });

      sendSuccess(res, claim, 201);
              })
            );
  // ========================================
  // PROJECT CONTACTS ROUTES
  // ========================================

  // Get project contacts
  router.get('/api/projects/:projectId/contacts',
    isAuthenticated,
    asyncHandler(async (req: Request, res: Response) => {
      const { projectId } = req.params;
      
      logger.info('[Projects] Récupération contacts projet', { metadata: {

          route: '/api/projects/:projectId/contacts',
          method: 'GET',
          projectId,
          userId: req.user?.id
      }
    });

      const contacts = await storage.getProjectContacts(projectId);
      sendSuccess(res, contacts);
              })
            );
  // Update project contacts
  router.put('/api/projects/:projectId/contacts',
    isAuthenticated,
    validateBody(insertProjectContactsSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const { projectId } = req.params;
      
      logger.info('[Projects] Mise à jour contacts projet', { metadata: {

          route: '/api/projects/:projectId/contacts',
          method: 'PUT',
          projectId,
          userId: req.user?.id
      }
    });

      // Create or update project contacts
      const contacts = await storage.createProjectContact({
        ...req.body,
        projectId
      });
      sendSuccess(res, contacts);
              })
            );

  // ========================================
  // PROJECT SUB-ELEMENTS ROUTES (Monday.com Integration)
  // ========================================

  /**
   * GET /api/projects/:id/sub-elements
   * Get all sub-elements for a project
   */
  router.get('/api/projects/:id/sub-elements',
    isAuthenticated,
    rateLimits.general,
    validateParams(commonParamSchemas.id),
    asyncHandler(async (req: Request, res: Response) => {
      const { id: projectId } = req.params;
      
      logger.info('[Projects] Récupération sous-éléments projet', { metadata: {

          route: '/api/projects/:id/sub-elements',
          method: 'GET',
          projectId,
          userId: req.user?.id
      }
    });

      try {
        const subElements = await storage.getProjectSubElements(projectId);
        sendSuccess(res, subElements);
      
      } catch (error) {
        logger.error('Erreur', { metadata: {

            service: 'projects',
                  error: error instanceof Error ? error.message : String(error)
      }
    });
        throw new NotFoundError('Sous-éléments du projet', projectId);
                        }

                      }));

  /**
   * GET /api/project-sub-elements/:id
   * Get single project sub-element by ID
   */
  router.get('/api/project-sub-elements/:id',
    isAuthenticated,
    rateLimits.general,
    validateParams(commonParamSchemas.id),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = req.params;
      
      logger.info('[Projects] Récupération sous-élément projet', { metadata: {

          route: '/api/project-sub-elements/:id',
          method: 'GET',
          subElementId: id,
          userId: req.user?.id
      }
    });

      try {
        const subElement = await storage.getProjectSubElement(id);
        if (!subElement) {
          throw new NotFoundError('Sous-élément de projet', id);
        }
        sendSuccess(res, subElement);
      } catch (error) {
        logger.error('Erreur', { metadata: {

            service: 'projects',
                  error: error instanceof Error ? error.message : String(error)
      }
    });
        throw error;
                        }

                      }));

  /**
   * POST /api/projects/:id/sub-elements
   * Create new project sub-element
   */
  router.post('/api/projects/:id/sub-elements',
    isAuthenticated,
    rateLimits.creation,
    validateParams(commonParamSchemas.id),
    validateBody(z.object({
      name: z.string().min(1),
      category: z.string().min(1),
      parentElementId: z.string().uuid().optional(),
      description: z.string().optional(),
      status: z.enum(['planned', 'in_progress', 'completed', 'cancelled']).default('planned'),
      priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
      estimatedDuration: z.number().positive().optional(),
      estimatedCost: z.number().positive().optional()
    })),
    asyncHandler(async (req: Request, res: Response) => {
      const { id: projectId } = req.params;
      
      logger.info('[Projects] Création sous-élément projet', { metadata: {

          route: '/api/projects/:id/sub-elements',
          method: 'POST',
          projectId,
          name: req.body.name,
          category: req.body.category,
          userId: req.user?.id
      }
    });

      try {
        const subElement = await storage.createProjectSubElement({
          ...req.body,
          projectId
        });
        
        eventBus.emit('project:sub-element:created', {
          projectId,
          subElementId: subElement.id,
          userId: req.user?.id
        });
        
        sendSuccess(res, subElement, 'Sous-élément de projet créé avec succès');
      } catch (error) {
        logger.error('Erreur', { metadata: {

            service: 'projects',
                  error: error instanceof Error ? error.message : String(error)
      }
    });
        throw new ValidationError('Erreur lors de la création du sous-élément de projet');
                        }

                      }));

  // ========================================
  // PROJECT TIMELINES ROUTES
  // ========================================

  /**
   * GET /api/project-timelines
   * Get project timelines with filters
   */
  router.get('/api/project-timelines',
    isAuthenticated,
    validateQuery(z.object({
      phases: z.array(z.string()).optional(),
      statuses: z.array(z.string()).optional(),
      projectId: z.string().optional()
    }).optional()),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const query = req.query || {};
        const phases = Array.isArray(query.phases) ? query.phases as string[] : query.phases ? [query.phases as string] : undefined;
        const statuses = Array.isArray(query.statuses) ? query.statuses as string[] : query.statuses ? [query.statuses as string] : undefined;
        const projectId = query.projectId as string | undefined;
        
        logger.info('[Projects] Récupération timelines avec filtres', { metadata: {
 
            route: '/api/project-timelines',
            method: 'GET',
                  filters: req.query,
                  userId: req.user?.id
      }
    });
        
        // Récupérer toutes les timelines depuis le storage
        let timelines = await storage.getAllProjectTimelines();
        
        // Appliquer les filtres
        if (phases && phases.length > 0) {
          timelines = timelines.filter(t => phases.includes(t.phase));
        }
        
        if (statuses && statuses.length > 0) {
          logger.warn('[Projects] Filtrage par statuts non implémenté', { metadata: {
 reason: 'relation project manquante'
      }
    });
        }
        
        if (projectId) {
          timelines = timelines.filter(t => t.projectId === projectId);
        }
        
        const result = {
          data: timelines,
          metadata: {
            totalTimelines: timelines.length,
            activeProjects: timelines.filter(t => 
              t.projectId !== null
            ).length,
            filtersApplied: Object.keys(req.query || {}).length,
            retrievedAt: new Date()
          }
        };
        
        sendSuccess(res, result);
      
        } catch (error) {
      logger.error('Erreur', { metadata: {

          service: 'projects',
          error: error instanceof Error ? error.message : String(error)
      }
    });
      throw createError.database("Erreur lors de la récupération des temps de pose");
                        }

                      }));

  /**
   * POST /api/temps-pose
   * Create new temps de pose entry
   */
  router.post('/api/temps-pose',
    isAuthenticated,
    rateLimits.creation,
    validateBody(insertTempsPoseSchema),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const tempsData = req.body;
        
        logger.info('[Projects] Création temps de pose', { metadata: {
 
            route: '/api/temps-pose',
            method: 'POST',
            data: tempsData,
                  userId: req.user?.id
      }
    });
        
        const newTemps = await storage.createTempsPose(tempsData);
        sendSuccess(res, newTemps, 201);
      } catch (error) {
        logger.error('Erreur', { metadata: {

            service: 'projects',
                  error: error instanceof Error ? error.message : String(error)
      }
    });
        throw createError.database("Erreur lors de la création du temps de pose");
                        }

                      }));

  /**
   * GET /api/temps-pose/:id
   * Get single temps de pose by ID
   */
  router.get('/api/temps-pose/:id',
    isAuthenticated,
    validateParams(commonParamSchemas.id),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        
        logger.info('[Projects] Récupération temps de pose par ID', { metadata: {
 
            route: '/api/temps-pose/:id',
            method: 'GET',
            id,
                  userId: req.user?.id
      }
    });
        
        const temps = await storage.getTempsPoseById(id);
        if (!temps) {
          throw createError.notFound("Temps de pose non trouvé");
        }
        sendSuccess(res, temps);
      
        } catch (error) {
      logger.error('Erreur', { metadata: {

          service: 'projects',
          error: error instanceof Error ? error.message : String(error)
      }
    });
      throw error;
                        }

                      }));

  /**
   * PUT /api/temps-pose/:id
   * Update temps de pose
   */
  router.put('/api/temps-pose/:id',
    isAuthenticated,
    rateLimits.general,
    validateParams(commonParamSchemas.id),
    validateBody(insertTempsPoseSchema.partial()),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const updateData = req.body;
        
        logger.info('[Projects] Mise à jour temps de pose', { metadata: {
 
            route: '/api/temps-pose/:id',
            method: 'PUT',
            id,
            updateData,
                  userId: req.user?.id
      }
    });
        
        const updatedTemps = await storage.updateTempsPose(id, updateData);
        sendSuccess(res, updatedTemps, "Temps de pose mis à jour avec succès");
      } catch (error) {
        logger.error('Erreur', { metadata: {

            service: 'projects',
                  error: error instanceof Error ? error.message : String(error)
      }
    });
        throw createError.database("Erreur lors de la mise à jour du temps de pose");
                        }

                      }));

  /**
   * DELETE /api/temps-pose/:id
   * Delete temps de pose
   */
  router.delete('/api/temps-pose/:id',
    isAuthenticated,
    rateLimits.general,
    validateParams(commonParamSchemas.id),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        
        logger.info('[Projects] Suppression temps de pose', { metadata: {
 
            route: '/api/temps-pose/:id',
            method: 'DELETE',
            id,
                  userId: req.user?.id
      }
    });
        
        await storage.deleteTempsPose(id);
        sendSuccess(res, null, "Temps de pose supprimé avec succès");
      } catch (error) {
        logger.error('Erreur', { metadata: {

            service: 'projects',
                  error: error instanceof Error ? error.message : String(error)
      }
    });
        throw createError.database("Erreur lors de la suppression du temps de pose");
                        }

                      }));

  // ========================================
  // FEEDBACK TERRAIN ROUTES
  // ========================================

  // POST /api/projects/:id/feedback-terrain
  router.post('/api/projects/:id/feedback-terrain',
    isAuthenticated,
    rateLimits.creation,
    validateParams(commonParamSchemas.uuid),
    validateBody(insertProjectFeedbackTerrainSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const projectId = req.params.id;
      const feedback = await projectFeedbackService.createFeedback({
        ...req.body,
        projectId
      });
      return sendSuccess(res, feedback, 201);
          }
        })
      );

  // GET /api/projects/:id/feedback-terrain
  router.get('/api/projects/:id/feedback-terrain',
    isAuthenticated,
    validateParams(commonParamSchemas.uuid),
    validateQuery(z.object({
      status: z.enum(['nouveau', 'en_cours', 'resolu', 'ignore']).optional(),
      feedbackType: z.enum(['erreur_plan', 'oublis', 'retour_prix', 'probleme_technique', 'amelioration']).optional(),
      severity: z.enum(['tres_faible', 'faible', 'normale', 'elevee', 'critique']).optional()
    })),
    asyncHandler(async (req: Request, res: Response) => {
      const projectId = req.params.id;
      const filters = {
        status: req.query.status as string | undefined,
        feedbackType: req.query.feedbackType as string | undefined,
        severity: req.query.severity as string | undefined
      };
      const feedbacks = await storage.getProjectFeedbackTerrain(projectId, filters);
      return sendSuccess(res, feedbacks);
          }
        })
      );

  // PATCH /api/projects/:id/feedback-terrain/:feedbackId/assign
  router.patch('/api/projects/:id/feedback-terrain/:feedbackId/assign',
    isAuthenticated,
    rateLimits.general,
    validateParams(z.object({
      id: z.string().uuid(),
      feedbackId: z.string().uuid()
    })),
    validateBody(z.object({
      assignedTo: z.string().uuid()
    })),
    asyncHandler(async (req: Request, res: Response) => {
      const { feedbackId } = req.params;
      const { assignedTo } = req.body;
      const feedback = await projectFeedbackService.assignFeedback(feedbackId, assignedTo);
      return sendSuccess(res, feedback);
          }
        })
      );

  // PATCH /api/projects/:id/feedback-terrain/:feedbackId/resolve
  router.patch('/api/projects/:id/feedback-terrain/:feedbackId/resolve',
    isAuthenticated,
    rateLimits.general,
    validateParams(z.object({
      id: z.string().uuid(),
      feedbackId: z.string().uuid()
    })),
    validateBody(z.object({
      resolutionNotes: z.string().min(1)
    })),
    asyncHandler(async (req: Request, res: Response) => {
      const { feedbackId } = req.params;
      const { resolutionNotes } = req.body;
      const userId = req.user?.id || '';
      const feedback = await projectFeedbackService.resolveFeedback(feedbackId, userId, resolutionNotes);
      return sendSuccess(res, feedback);
          }
        })
      );

  logger.info('[ProjectsModule] Routes initialisées', { metadata: {

      module: 'ProjectsModule',
      routes: [
        '/api/projects',
        '/api/projects/:id/tasks',
        '/api/projects/:id/timeline',
        '/api/projects/:id/visa-architecte',
        '/api/projects/:id/reserves',
        '/api/sav/interventions',
        '/api/sav/warranty-claims',
        '/api/projects/:id/contacts',
        '/api/projects/:id/sub-elements',
        '/api/project-sub-elements/:id',
        '/api/project-timelines',
        '/api/project-timelines/:id',
        '/api/performance-metrics',
        '/api/temps-pose',
        '/api/temps-pose/:id',
        '/api/projects/:id/feedback-terrain'
      ]
      }
    });

  return router;
}