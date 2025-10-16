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
import type { Request, Response } from 'express';
import { isAuthenticated } from '../../replitAuth';
import { asyncHandler } from '../../middleware/errorHandler';
import { validateBody, validateParams, validateQuery } from '../../middleware/validation';
import { rateLimits } from '../../middleware/security';
import { sendSuccess, sendPaginatedSuccess } from '../../middleware/errorHandler';
import { ValidationError, NotFoundError } from '../../utils/error-handler';
import { logger } from '../../utils/logger';
import type { IStorage } from '../../storage-poc';
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
  projectStatusEnum
} from '@shared/schema';
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
    asyncHandler(async (req: any, res: Response) => {
      logger.info('[Projects] Récupération schéma projet', {
        metadata: {
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
        }
      });
    })
  );

  // Get project configuration
  router.get('/api/projects/config',
    isAuthenticated,
    asyncHandler(async (req: any, res: Response) => {
      logger.info('[Projects] Récupération configuration projet', {
        metadata: {
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
        }
      });
    })
  );

  // Get all projects with filters
  router.get('/api/projects',
    isAuthenticated,
    validateQuery(projectQuerySchema),
    asyncHandler(async (req: any, res: Response) => {
      const params: ProjectQueryParams = req.query;
      
      logger.info('[Projects] Récupération projets', {
        metadata: {
          route: '/api/projects',
          method: 'GET',
          status: params.status,
          search: params.search,
          userId: req.user?.id
        }
      });

      const projects = await storage.getProjects({
        ...params,
        includeArchived: params.includeArchived === 'true',
        limit: parseInt(req.query.limit),
        offset: parseInt(req.query.offset)
      });

      sendPaginatedSuccess(res, projects.data, projects.total);
    })
  );

  // Get single project
  router.get('/api/projects/:id',
    isAuthenticated,
    asyncHandler(async (req: any, res: Response) => {
      const { id } = req.params;
      
      logger.info('[Projects] Récupération projet', {
        metadata: {
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
    asyncHandler(async (req: any, res: Response) => {
      logger.info('[Projects] Création projet', {
        metadata: {
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
    asyncHandler(async (req: any, res: Response) => {
      const { id } = req.params;
      
      logger.info('[Projects] Mise à jour projet', {
        metadata: {
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
    asyncHandler(async (req: any, res: Response) => {
      const { projectId } = req.params;
      const params: ProjectTaskQueryParams = req.query;
      
      logger.info('[Projects] Récupération tâches projet', {
        metadata: {
          route: '/api/projects/:projectId/tasks',
          method: 'GET',
          projectId,
          status: params.status,
          userId: req.user?.id
        }
      });

      const tasks = await storage.getProjectTasks({
        projectId,
        ...params,
        includeSubtasks: params.includeSubtasks === 'true'
      });

      sendSuccess(res, tasks);
    })
  );

  // Create project task
  router.post('/api/projects/:projectId/tasks',
    isAuthenticated,
    validateBody(insertProjectTaskSchema),
    asyncHandler(async (req: any, res: Response) => {
      const { projectId } = req.params;
      
      logger.info('[Projects] Création tâche projet', {
        metadata: {
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
    asyncHandler(async (req: any, res: Response) => {
      const { id } = req.params;
      
      logger.info('[Projects] Mise à jour tâche', {
        metadata: {
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
    asyncHandler(async (req: any, res: Response) => {
      const params: ProjectTaskQueryParams = req.query;
      
      logger.info('[Projects] Récupération toutes tâches', {
        metadata: {
          route: '/api/tasks/all',
          method: 'GET',
          assignedTo: params.assignedTo,
          priority: params.priority,
          userId: req.user?.id
        }
      });

      const tasks = await storage.getAllTasks(params);
      sendSuccess(res, tasks);
    })
  );

  // ========================================
  // TIMELINE ROUTES
  // ========================================

  // Calculate project timeline
  router.post('/api/projects/:id/calculate-timeline',
    isAuthenticated,
    asyncHandler(async (req: any, res: Response) => {
      const { id } = req.params;
      const params: TimelineCalculationParams = {
        projectId: id,
        ...req.body
      };
      
      logger.info('[Projects] Calcul timeline projet', {
        metadata: {
          route: '/api/projects/:id/calculate-timeline',
          method: 'POST',
          projectId: id,
          userId: req.user?.id
        }
      });

      const timeline = await dateIntelligenceService.calculateProjectTimeline(params);
      
      // Save timeline to database
      await storage.createOrUpdateProjectTimeline({
        projectId: id,
        ...timeline
      });

      eventBus.emit('project:timeline:calculated', {
        projectId: id,
        totalDuration: timeline.totalDuration,
        userId: req.user?.id
      });

      sendSuccess(res, timeline);
    })
  );

  // Recalculate timeline from phase
  router.put('/api/projects/:id/recalculate-from/:phase',
    isAuthenticated,
    asyncHandler(async (req: any, res: Response) => {
      const { id, phase } = req.params;
      
      logger.info('[Projects] Recalcul timeline depuis phase', {
        metadata: {
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
    asyncHandler(async (req: any, res: Response) => {
      const { id } = req.params;
      
      logger.info('[Projects] Récupération durée étude', {
        metadata: {
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
    asyncHandler(async (req: any, res: Response) => {
      const { id } = req.params;
      const { estimatedDays, actualDays } = req.body;
      
      logger.info('[Projects] Mise à jour durée étude', {
        metadata: {
          route: '/api/projects/:id/study-duration',
          method: 'PATCH',
          projectId: id,
          estimatedDays,
          actualDays,
          userId: req.user?.id
        }
      });

      const update: any = {};
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
    asyncHandler(async (req: any, res: Response) => {
      const { projectId } = req.params;
      
      logger.info('[Projects] Récupération visa architecte', {
        metadata: {
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
    asyncHandler(async (req: any, res: Response) => {
      const { projectId } = req.params;
      
      logger.info('[Projects] Création visa architecte', {
        metadata: {
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
    asyncHandler(async (req: any, res: Response) => {
      const { id } = req.params;
      
      logger.info('[Projects] Mise à jour visa architecte', {
        metadata: {
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
    asyncHandler(async (req: any, res: Response) => {
      const { id } = req.params;
      
      logger.info('[Projects] Suppression visa architecte', {
        metadata: {
          route: '/api/visa-architecte/:id',
          method: 'DELETE',
          visaId: id,
          userId: req.user?.id
        }
      });

      await storage.deleteVisaArchitecte(id);
      res.status(204).send();
    })
  );

  // ========================================
  // VALIDATION ROUTES
  // ========================================

  // Check if project can proceed to planning
  router.get('/api/projects/:projectId/can-proceed-to-planning',
    isAuthenticated,
    asyncHandler(async (req: any, res: Response) => {
      const { projectId } = req.params;
      
      logger.info('[Projects] Vérification passage planification', {
        metadata: {
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
    })
  );

  // ========================================
  // SAV (AFTER-SALES SERVICE) ROUTES
  // ========================================

  // Get project reserves
  router.get('/api/projects/:projectId/reserves',
    isAuthenticated,
    asyncHandler(async (req: any, res: Response) => {
      const { projectId } = req.params;
      
      logger.info('[Projects] Récupération réserves projet', {
        metadata: {
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
    asyncHandler(async (req: any, res: Response) => {
      const { projectId } = req.params;
      
      logger.info('[Projects] Création réserve projet', {
        metadata: {
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
    asyncHandler(async (req: any, res: Response) => {
      const params: SAVQueryParams = req.query;
      
      logger.info('[Projects] Récupération interventions SAV', {
        metadata: {
          route: '/api/sav/interventions',
          method: 'GET',
          projectId: params.projectId,
          status: params.status,
          userId: req.user?.id
        }
      });

      const interventions = await storage.getSavInterventions(params);
      sendSuccess(res, interventions);
    })
  );

  // Create SAV intervention
  router.post('/api/sav/interventions',
    isAuthenticated,
    validateBody(insertSavInterventionSchema),
    asyncHandler(async (req: any, res: Response) => {
      logger.info('[Projects] Création intervention SAV', {
        metadata: {
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
    asyncHandler(async (req: any, res: Response) => {
      const params: SAVQueryParams = req.query;
      
      logger.info('[Projects] Récupération réclamations garantie', {
        metadata: {
          route: '/api/sav/warranty-claims',
          method: 'GET',
          projectId: params.projectId,
          status: params.status,
          userId: req.user?.id
        }
      });

      const claims = await storage.getSavWarrantyClaims(params);
      sendSuccess(res, claims);
    })
  );

  // Create warranty claim
  router.post('/api/sav/warranty-claims',
    isAuthenticated,
    validateBody(insertSavWarrantyClaimSchema),
    asyncHandler(async (req: any, res: Response) => {
      logger.info('[Projects] Création réclamation garantie', {
        metadata: {
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
    asyncHandler(async (req: any, res: Response) => {
      const { projectId } = req.params;
      
      logger.info('[Projects] Récupération contacts projet', {
        metadata: {
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
    asyncHandler(async (req: any, res: Response) => {
      const { projectId } = req.params;
      
      logger.info('[Projects] Mise à jour contacts projet', {
        metadata: {
          route: '/api/projects/:projectId/contacts',
          method: 'PUT',
          projectId,
          userId: req.user?.id
        }
      });

      const contacts = await storage.updateProjectContacts(projectId, req.body);
      sendSuccess(res, contacts);
    })
  );

  // ========================================
  // GANTT CHART ROUTES
  // ========================================

  // Get project sub-elements for Gantt
  router.get('/api/projects/:id/sub-elements',
    isAuthenticated,
    asyncHandler(async (req: any, res: Response) => {
      const { id } = req.params;
      
      logger.info('[Projects] Récupération sous-éléments Gantt', {
        metadata: {
          route: '/api/projects/:id/sub-elements',
          method: 'GET',
          projectId: id,
          userId: req.user?.id
        }
      });

      const tasks = await storage.getProjectTasks({ projectId: id, includeSubtasks: true });
      
      // Transform to Gantt format
      const ganttTasks: GanttTask[] = tasks.map(task => ({
        id: task.id,
        name: task.name,
        start: task.startDate,
        end: task.endDate,
        progress: task.progress || 0,
        dependencies: task.dependencies,
        resources: task.assignedTo ? [task.assignedTo] : [],
        children: task.subtasks?.map(st => ({
          id: st.id,
          name: st.name,
          start: st.startDate,
          end: st.endDate,
          progress: st.progress || 0,
          dependencies: st.dependencies,
          resources: st.assignedTo ? [st.assignedTo] : []
        }))
      }));

      sendSuccess(res, ganttTasks);
    })
  );

  // Create project sub-element for Gantt
  router.post('/api/projects/:id/sub-elements',
    isAuthenticated,
    asyncHandler(async (req: any, res: Response) => {
      const { id } = req.params;
      const { name, startDate, endDate, parentId, dependencies } = req.body;
      
      logger.info('[Projects] Création sous-élément Gantt', {
        metadata: {
          route: '/api/projects/:id/sub-elements',
          method: 'POST',
          projectId: id,
          name,
          userId: req.user?.id
        }
      });

      const task = await storage.createProjectTask({
        projectId: id,
        name,
        startDate,
        endDate,
        parentTaskId: parentId,
        dependencies,
        status: 'pending',
        priority: 'medium'
      });

      sendSuccess(res, task, 201);
    })
  );

  logger.info('[ProjectsModule] Routes initialisées', {
    metadata: {
      module: 'ProjectsModule',
      routes: [
        '/api/projects',
        '/api/projects/:id/tasks',
        '/api/projects/:id/timeline',
        '/api/projects/:id/visa-architecte',
        '/api/projects/:id/reserves',
        '/api/sav/interventions',
        '/api/sav/warranty-claims',
        '/api/projects/:id/contacts'
      ]
    }
  });

  return router;
}