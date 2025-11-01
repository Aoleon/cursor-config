/**
 * Configuration Module Routes
 * 
 * Handles application configuration endpoints including:
 * - Technical Scoring configuration
 * - Material-Color rules settings
 * - Equipment Batteries (Monday.com integration)
 * - Margin Targets
 * - Classification Tags and Entity Tags
 */

import { Router } from 'express';
import type { IStorage } from '../../storage-poc';
import { isAuthenticated } from '../../replitAuth';
import { validateBody, validateParams, validateQuery, commonParamSchemas } from '../../middleware/validation';
import { rateLimits } from '../../middleware/rate-limiter';
import { sendSuccess, createError, asyncHandler } from '../../middleware/errorHandler';
import { logger } from '../../utils/logger';
import { z } from 'zod';
import {
  technicalScoringConfigSchema,
  type TechnicalScoringConfig,
  materialColorAlertRuleSchema,
  type MaterialColorAlertRule
} from '@shared/schema';
import { ScoringService } from '../../services/scoringService';

/**
 * Middleware: Check if user is admin or responsable
 */
const isAdminOrResponsible = (req: any, res: any, next: any) => {
  const user = req.user || req.session?.user;
  
  if (!user) {
    return res.status(401).json({ 
      message: "Authentification requise" 
    });
  }
  
  if (!user.role || (user.role !== 'admin' && user.role !== 'responsable')) {
    return res.status(403).json({ 
      message: "Accès refusé. Rôle admin ou responsable requis." 
    });
  }
  
  next();
};

/**
 * Middleware: Check if user is responsable_be or admin
 */
const requireTechnicalValidationRole = (req: any, res: any, next: any) => {
  const userRole = req.session?.user?.role;
  if (!userRole || !['responsable_be', 'admin'].includes(userRole)) {
    return res.status(403).json({
      success: false,
      message: "Accès refusé. Rôle 'responsable_be' ou 'admin' requis."
    });
  }
  next();
};

/**
 * Score preview schema
 */
const scorePreviewSchema = z.object({
  specialCriteria: z.object({
    batimentPassif: z.boolean(),
    isolationRenforcee: z.boolean(),
    precadres: z.boolean(),
    voletsExterieurs: z.boolean(),
    coupeFeu: z.boolean(),
    evidences: z.record(z.array(z.string())).optional()
  }),
  config: technicalScoringConfigSchema.optional()
});

/**
 * Factory function to create Configuration routes with dependency injection
 */
export function createConfigurationRoutes(storage: IStorage) {
  const router = Router();

  // ========================================
  // TECHNICAL SCORING ROUTES
  // ========================================

  // GET /api/scoring-config - Retrieve scoring configuration
  router.get("/api/scoring-config", 
    isAuthenticated,
    isAdminOrResponsible,
    asyncHandler(async (req, res) => {
      logger.info('Récupération configuration scoring', {
        metadata: { endpoint: 'GET /api/scoring-config' }
      });
      
      const config = await storage.getScoringConfig();
      
      logger.info('Configuration scoring récupérée', {
        metadata: { config }
      });
      
      res.json({
        success: true,
        data: config
      });
    })
  );

  // PATCH /api/scoring-config - Update scoring configuration
  router.patch("/api/scoring-config",
    isAuthenticated,
    isAdminOrResponsible,
    validateBody(technicalScoringConfigSchema),
    asyncHandler(async (req, res) => {
      logger.info('Mise à jour configuration scoring', {
        metadata: { endpoint: 'PATCH /api/scoring-config', data: req.body }
      });
      
      const config: TechnicalScoringConfig = req.body;
      
      // Business validation
      const totalWeight = Object.values(config.weights).reduce((sum, weight) => sum + weight, 0);
      if (totalWeight === 0) {
        return res.status(400).json({
          success: false,
          message: "Au moins un critère doit avoir un poids supérieur à 0"
        });
      }
      
      await storage.updateScoringConfig(config);
      
      logger.info('Configuration scoring mise à jour avec succès', {
        metadata: { config }
      });
      
      res.json({
        success: true,
        message: "Configuration mise à jour avec succès",
        data: config
      });
    })
  );

  // POST /api/score-preview - Calculate score preview
  router.post("/api/score-preview",
    isAuthenticated,
    isAdminOrResponsible,
    validateBody(scorePreviewSchema),
    asyncHandler(async (req, res) => {
      logger.info('Calcul aperçu scoring', {
        metadata: { endpoint: 'POST /api/score-preview', criteria: req.body }
      });
      
      const { specialCriteria, config } = req.body;
      
      const scoringConfig = config || await storage.getScoringConfig();
      const result = ScoringService.compute(specialCriteria, scoringConfig);
      
      logger.info('Résultat aperçu scoring calculé', {
        metadata: { result }
        });
      
      res.json({
        success: true,
        data: {
          result,
          usedConfig: scoringConfig,
          inputCriteria: specialCriteria
        }
      });
    })
  );

  // ========================================
  // MATERIAL-COLOR RULES ROUTES
  // ========================================

  // GET /api/settings/material-color-rules - Retrieve material-color rules
  router.get('/api/settings/material-color-rules', 
    isAuthenticated, 
    requireTechnicalValidationRole,
    asyncHandler(async (req, res) => {
      logger.info('Récupération règles matériaux-couleurs', {
        metadata: { endpoint: 'GET /api/settings/material-color-rules' }
      });
      
      const rules = await storage.getMaterialColorRules();
      logger.info('Règles matériaux-couleurs récupérées', {
        metadata: { count: rules.length }
      });
      
      res.json({
        success: true,
        data: rules,
        total: rules.length
      });
    })
  );

  // PUT /api/settings/material-color-rules - Update material-color rules
  router.put('/api/settings/material-color-rules',
    isAuthenticated,
    requireTechnicalValidationRole,
    validateBody(z.array(materialColorAlertRuleSchema)),
    asyncHandler(async (req, res) => {
      logger.info('Mise à jour règles matériaux-couleurs', {
        metadata: { endpoint: 'PUT /api/settings/material-color-rules', newRules: req.body }
      });
      
      const newRules: MaterialColorAlertRule[] = req.body;
      
      // Validate unique IDs
      const ruleIds = newRules.map(rule => rule.id);
      const uniqueIds = new Set(ruleIds);
      if (ruleIds.length !== uniqueIds.size) {
        return res.status(400).json({
          success: false,
          message: 'Erreur de validation: Des IDs de règles sont dupliqués'
        });
      }
      
      await storage.setMaterialColorRules(newRules);
      
      logger.info('Règles matériaux-couleurs mises à jour avec succès', {
        metadata: { count: newRules.length }
      });
      
      res.json({
        success: true,
        message: `${newRules.length} règles matériaux-couleurs mises à jour avec succès`,
        data: newRules
      });
    })
  );

  // ========================================
  // EQUIPMENT BATTERIES ROUTES
  // ========================================

  router.get('/api/equipment-batteries',
    isAuthenticated,
    rateLimits.general,
    validateQuery(z.object({
      projectId: z.string().uuid().optional(),
      limit: z.coerce.number().default(50),
      offset: z.coerce.number().default(0)
    })),
    asyncHandler(async (req, res) => {
      const { projectId } = req.query;
      const batteries = await storage.getEquipmentBatteries(projectId as string | undefined);
      sendSuccess(res, batteries);
    })
  );

  router.get('/api/equipment-batteries/:id',
    isAuthenticated,
    rateLimits.general,
    validateParams(commonParamSchemas.id),
    asyncHandler(async (req, res) => {
      const { id } = req.params;
      const battery = await storage.getEquipmentBattery(id);
      if (!battery) {
        throw createError.notFound('Batterie', id);
      }
      sendSuccess(res, battery);
    })
  );

  router.post('/api/equipment-batteries',
    isAuthenticated,
    rateLimits.creation,
    validateBody(z.object({
      name: z.string().min(1),
      brand: z.string().optional(),
      projectId: z.string().uuid(),
      capacity: z.number().positive().optional(),
      voltage: z.number().positive().optional(),
      batteryType: z.string().optional(),
      quantity: z.number().positive().default(1),
      location: z.string().optional(),
      status: z.enum(['active', 'maintenance', 'retired']).default('active'),
      notes: z.string().optional()
    })),
    asyncHandler(async (req, res) => {
      const battery = await storage.createEquipmentBattery(req.body);
      sendSuccess(res, battery);
    })
  );

  router.put('/api/equipment-batteries/:id',
    isAuthenticated,
    rateLimits.general,
    validateParams(commonParamSchemas.id),
    validateBody(z.object({
      name: z.string().min(1).optional(),
      brand: z.string().optional(),
      capacity: z.number().positive().optional(),
      voltage: z.number().positive().optional(),
      batteryType: z.string().optional(),
      quantity: z.number().positive().optional(),
      location: z.string().optional(),
      status: z.enum(['active', 'maintenance', 'retired']).optional(),
      notes: z.string().optional()
    })),
    asyncHandler(async (req, res) => {
      const { id } = req.params;
      const battery = await storage.updateEquipmentBattery(id, req.body);
      sendSuccess(res, battery);
    })
  );

  router.delete('/api/equipment-batteries/:id',
    isAuthenticated,
    rateLimits.general,
    validateParams(commonParamSchemas.id),
    asyncHandler(async (req, res) => {
      const { id } = req.params;
      await storage.deleteEquipmentBattery(id);
      sendSuccess(res, null);
    })
  );

  // ========================================
  // MARGIN TARGETS ROUTES
  // ========================================

  router.get('/api/margin-targets',
    isAuthenticated,
    rateLimits.general,
    validateQuery(z.object({
      projectId: z.string().uuid().optional(),
      userId: z.string().uuid().optional(),
      teamId: z.string().uuid().optional(),
      limit: z.coerce.number().default(50),
      offset: z.coerce.number().default(0)
    })),
    asyncHandler(async (req, res) => {
      const { projectId } = req.query;
      const targets = await storage.getMarginTargets(projectId as string | undefined);
      sendSuccess(res, targets);
    })
  );

  router.get('/api/margin-targets/:id',
    isAuthenticated,
    rateLimits.general,
    validateParams(commonParamSchemas.id),
    asyncHandler(async (req, res) => {
      const { id } = req.params;
      const target = await storage.getMarginTarget(id);
      if (!target) {
        throw createError.notFound('Objectif de marge', id);
      }
      sendSuccess(res, target);
    })
  );

  router.post('/api/margin-targets',
    isAuthenticated,
    rateLimits.creation,
    validateBody(z.object({
      name: z.string().min(1),
      projectId: z.string().uuid().optional(),
      userId: z.string().uuid().optional(),
      teamId: z.string().uuid().optional(),
      targetMarginPercentage: z.number().min(0).max(100),
      targetPeriodStart: z.string().datetime(),
      targetPeriodEnd: z.string().datetime(),
      category: z.string().optional(),
      description: z.string().optional(),
      isActive: z.boolean().default(true)
    })),
    asyncHandler(async (req, res) => {
      const target = await storage.createMarginTarget({
        ...req.body,
        targetPeriodStart: new Date(req.body.targetPeriodStart),
        targetPeriodEnd: new Date(req.body.targetPeriodEnd)
      });
      sendSuccess(res, target);
    })
  );

  router.put('/api/margin-targets/:id',
    isAuthenticated,
    rateLimits.general,
    validateParams(commonParamSchemas.id),
    validateBody(z.object({
      name: z.string().min(1).optional(),
      targetMarginPercentage: z.number().min(0).max(100).optional(),
      targetPeriodStart: z.string().datetime().optional(),
      targetPeriodEnd: z.string().datetime().optional(),
      category: z.string().optional(),
      description: z.string().optional(),
      isActive: z.boolean().optional()
    })),
    asyncHandler(async (req, res) => {
      const { id } = req.params;
      const updateData = { ...req.body };
      if (req.body.targetPeriodStart) updateData.targetPeriodStart = new Date(req.body.targetPeriodStart);
      if (req.body.targetPeriodEnd) updateData.targetPeriodEnd = new Date(req.body.targetPeriodEnd);
      
      const target = await storage.updateMarginTarget(id, updateData);
      sendSuccess(res, target);
    })
  );

  router.delete('/api/margin-targets/:id',
    isAuthenticated,
    rateLimits.general,
    validateParams(commonParamSchemas.id),
    asyncHandler(async (req, res) => {
      const { id } = req.params;
      await storage.deleteMarginTarget(id);
      sendSuccess(res, null);
    })
  );

  // ========================================
  // CLASSIFICATION TAGS ROUTES
  // ========================================

  router.get('/api/tags/classification',
    isAuthenticated,
    rateLimits.general,
    validateQuery(z.object({
      category: z.string().optional(),
      limit: z.coerce.number().default(50),
      offset: z.coerce.number().default(0)
    })),
    asyncHandler(async (req, res) => {
      const { category } = req.query;
      const tags = await storage.getClassificationTags(category as string | undefined);
      sendSuccess(res, tags);
    })
  );

  router.get('/api/tags/classification/:id',
    isAuthenticated,
    rateLimits.general,
    validateParams(commonParamSchemas.id),
    asyncHandler(async (req, res) => {
      const { id } = req.params;
      const tag = await storage.getClassificationTag(id);
      if (!tag) {
        throw createError.notFound('Tag de classification', id);
      }
      sendSuccess(res, tag);
    })
  );

  router.post('/api/tags/classification',
    isAuthenticated,
    rateLimits.creation,
    validateBody(z.object({
      name: z.string().min(1),
      category: z.string().min(1),
      color: z.string().optional(),
      description: z.string().optional(),
      isActive: z.boolean().default(true)
    })),
    asyncHandler(async (req, res) => {
      const tag = await storage.createClassificationTag(req.body);
      sendSuccess(res, tag);
    })
  );

  router.put('/api/tags/classification/:id',
    isAuthenticated,
    rateLimits.general,
    validateParams(commonParamSchemas.id),
    validateBody(z.object({
      name: z.string().min(1).optional(),
      category: z.string().min(1).optional(),
      color: z.string().optional(),
      description: z.string().optional(),
      isActive: z.boolean().optional()
    })),
    asyncHandler(async (req, res) => {
      const { id } = req.params;
      const tag = await storage.updateClassificationTag(id, req.body);
      sendSuccess(res, tag);
    })
  );

  router.delete('/api/tags/classification/:id',
    isAuthenticated,
    rateLimits.general,
    validateParams(commonParamSchemas.id),
    asyncHandler(async (req, res) => {
      const { id } = req.params;
      await storage.deleteClassificationTag(id);
      sendSuccess(res, null);
    })
  );

  // ========================================
  // ENTITY TAGS ROUTES
  // ========================================

  router.get('/api/tags/entity',
    isAuthenticated,
    rateLimits.general,
    validateQuery(z.object({
      entityType: z.string().optional(),
      entityId: z.string().uuid().optional(),
      limit: z.coerce.number().default(50),
      offset: z.coerce.number().default(0)
    })),
    asyncHandler(async (req, res) => {
      const { entityType, entityId } = req.query;
      const entityTags = await storage.getEntityTags(entityType as string | undefined, entityId as string | undefined);
      sendSuccess(res, entityTags);
    })
  );

  router.post('/api/tags/entity',
    isAuthenticated,
    rateLimits.creation,
    validateBody(z.object({
      entityType: z.string().min(1),
      entityId: z.string().uuid(),
      tagId: z.string().uuid(),
      assignedBy: z.string().uuid().optional()
    })),
    asyncHandler(async (req, res) => {
      const entityTag = await storage.createEntityTag(req.body);
      sendSuccess(res, entityTag);
    })
  );

  router.delete('/api/tags/entity/:id',
    isAuthenticated,
    rateLimits.general,
    validateParams(commonParamSchemas.id),
    asyncHandler(async (req, res) => {
      const { id } = req.params;
      await storage.deleteEntityTag(id);
      sendSuccess(res, null);
    })
  );

  logger.info('✅ Configuration routes created', {
    metadata: {
      module: 'Configuration',
      operation: 'createRoutes',
      routeCount: 23
    }
  });

  return router;
}
