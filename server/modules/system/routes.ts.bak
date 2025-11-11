/**
 * System Module Routes
 * 
 * This module handles core system routes including:
 * - Health checks and monitoring
 * - User management
 * - Global search
 * - Object storage (file uploads/downloads)
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import { isAuthenticated } from '../../replitAuth';
import { asyncHandler } from '../../middleware/errorHandler';
import { validateParams, validateQuery, commonParamSchemas } from '../../middleware/validation';
import { sendSuccess, createError } from '../../middleware/errorHandler';
import { NotFoundError } from '../../utils/error-handler';
import { logger } from '../../utils/logger';
import type { IStorage } from '../../storage-poc';
import { z } from 'zod';
import { db, getPoolStats } from '../../db';
import { sql, eq, or, ilike } from 'drizzle-orm';
import { aos, offers, projects } from '@shared/schema';
import { circuitBreakerManager } from '../../utils/circuit-breaker';
import { ObjectStorageService } from '../../objectStorage';

// ========================================
// VALIDATION SCHEMAS
// ========================================

const globalSearchSchema = z.object({
  query: z.string().min(1, 'Query is required'),
  limit: z.coerce.number().int().positive().max(100).optional().default(20)
});

// ========================================
// HEALTH CHECK HELPERS
// ========================================

async function checkDatabaseHealth() {
  try {
    const start = Date.now();
    await db.execute(sql`SELECT 1`);
    return {
      status: 'healthy',
      responseTime: Date.now() - start
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

function checkCacheHealth() {
  return {
    status: 'healthy',
    type: 'memory'
  };
}

async function checkMondayHealth() {
  if (!process.env.MONDAY_API_KEY) {
    return {
      status: 'not_configured',
      responseTime: 0
    };
  }

  try {
    const start = Date.now();
    const mondayBreaker = circuitBreakerManager.getOrCreate('monday');
    
    await mondayBreaker.execute(async () => {
      return true;
    });
    
    return {
      status: 'healthy',
      responseTime: Date.now() - start
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function checkOpenAIHealth() {
  if (!process.env.OPENAI_API_KEY) {
    return {
      status: 'not_configured',
      responseTime: 0
    };
  }

  try {
    const start = Date.now();
    const openaiBreaker = circuitBreakerManager.getOrCreate('openai');
    
    await openaiBreaker.execute(async () => {
      return true;
    });
    
    return {
      status: 'healthy',
      responseTime: Date.now() - start
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function checkSendGridHealth() {
  if (!process.env.SENDGRID_API_KEY) {
    return {
      status: 'not_configured',
      responseTime: 0
    };
  }

  try {
    const start = Date.now();
    const sendgridBreaker = circuitBreakerManager.getOrCreate('sendgrid');
    
    await sendgridBreaker.execute(async () => {
      return true;
    });
    
    return {
      status: 'healthy',
      responseTime: Date.now() - start
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// ========================================
// FACTORY FUNCTION - Dependency Injection Pattern
// ========================================

export function createSystemRoutes(storage: IStorage, eventBus: any) {
  const router = Router();

  // ========================================
  // HEALTH CHECK ROUTE
  // ========================================

  router.get("/api/health", asyncHandler(async (req, res) => {
    const healthCheckStart = Date.now();
    
    // Check database
    const databaseHealth = await checkDatabaseHealth();
    
    // Check external services (in parallel)
    const [mondayHealth, openaiHealth, sendgridHealth] = await Promise.all([
      checkMondayHealth(),
      checkOpenAIHealth(),
      checkSendGridHealth()
    ]);
    
    const health = {
      status: databaseHealth.status === 'healthy' ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      services: {
        database: databaseHealth,
        cache: checkCacheHealth(),
        externalApis: {
          monday: mondayHealth,
          openai: openaiHealth,
          sendgrid: sendgridHealth
        }
      },
      metrics: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        poolStats: getPoolStats(),
        healthCheckDuration: Date.now() - healthCheckStart
      },
      circuitBreakers: circuitBreakerManager.getAllStats()
    };
    
    const isHealthy = databaseHealth.status === 'healthy';
    
    logger.info('[Health] Health check effectué', {
      metadata: {
        route: '/api/health',
        method: 'GET',
        status: health.status,
        duration: health.metrics.healthCheckDuration,
        externalServicesHealth: {
          monday: mondayHealth.status,
          openai: openaiHealth.status,
          sendgrid: sendgridHealth.status
        }
      }
    });
    
    res.status(isHealthy ? 200 : 503).json(health);
  }));

  // ========================================
  // USER ROUTES
  // ========================================

  router.get("/api/users", isAuthenticated, asyncHandler(async (req, res) => {
    const users = await storage.getUsers();
    logger.info('[Users] Liste utilisateurs récupérée', { 
      metadata: { 
        route: '/api/users',
        method: 'GET',
        count: users.length,
        userId: req.user?.id
      }
    });
    res.json(users);
  }));

  router.get("/api/users/:id", 
    isAuthenticated, 
    validateParams(commonParamSchemas.id),
    asyncHandler(async (req, res) => {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        throw createError.notFound('Utilisateur', req.params.id);
      }
      sendSuccess(res, user);
    })
  );

  // ========================================
  // GLOBAL SEARCH ROUTE
  // ========================================

  router.get("/api/search/global",
    isAuthenticated,
    validateQuery(globalSearchSchema),
    asyncHandler(async (req, res) => {
      const { query, limit } = req.query;
      const searchTerm = String(query);
      const searchPattern = `%${searchTerm}%`;
      
      // Ensure limit is a valid number
      let limitNum = Number(limit ?? 20);
      if (!Number.isFinite(limitNum) || limitNum <= 0 || limitNum > 100) {
        limitNum = 20;
      }

      // Search in AOs with SQL ILIKE (optimized)
      const matchingAos = await db
        .select({
          id: aos.id,
          reference: aos.reference,
          intituleOperation: aos.intituleOperation,
          client: aos.client,
          location: aos.location,
          city: aos.city,
          status: aos.status,
          createdAt: aos.createdAt
        })
        .from(aos)
        .where(
          or(
            ilike(sql`COALESCE(${aos.reference}, '')`, searchPattern),
            ilike(sql`COALESCE(${aos.intituleOperation}, '')`, searchPattern),
            ilike(sql`COALESCE(${aos.client}, '')`, searchPattern),
            ilike(sql`COALESCE(${aos.location}, '')`, searchPattern),
            ilike(sql`COALESCE(${aos.city}, '')`, searchPattern)
          )
        )
        .limit(limitNum);

      // Search in Offers
      const matchingOffers = await db
        .select({
          id: offers.id,
          reference: offers.reference,
          intituleOperation: offers.intituleOperation,
          client: offers.client,
          location: offers.location,
          status: offers.status,
          createdAt: offers.createdAt
        })
        .from(offers)
        .where(
          or(
            ilike(sql`COALESCE(${offers.reference}, '')`, searchPattern),
            ilike(sql`COALESCE(${offers.intituleOperation}, '')`, searchPattern),
            ilike(sql`COALESCE(${offers.client}, '')`, searchPattern),
            ilike(sql`COALESCE(${offers.location}, '')`, searchPattern)
          )
        )
        .limit(limitNum);

      // Search in Projects
      const matchingProjects = await db
        .select({
          id: projects.id,
          reference: projects.reference,
          name: projects.name,
          client: projects.client,
          location: projects.location,
          status: projects.status,
          createdAt: projects.createdAt
        })
        .from(projects)
        .where(
          or(
            ilike(sql`COALESCE(${projects.reference}, '')`, searchPattern),
            ilike(sql`COALESCE(${projects.name}, '')`, searchPattern),
            ilike(sql`COALESCE(${projects.client}, '')`, searchPattern),
            ilike(sql`COALESCE(${projects.location}, '')`, searchPattern)
          )
        )
        .limit(limitNum);

      logger.info('[Search] Global search effectuée', {
        metadata: {
          route: '/api/search/global',
          method: 'GET',
          query: searchTerm,
          results: {
            aos: matchingAos.length,
            offers: matchingOffers.length,
            projects: matchingProjects.length
          }
        }
      });

      res.json({
        success: true,
        data: {
          aos: matchingAos,
          offers: matchingOffers,
          projects: matchingProjects,
          total: matchingAos.length + matchingOffers.length + matchingProjects.length
        }
      });
    })
  );

  // ========================================
  // OBJECT STORAGE ROUTES
  // ========================================

  router.post("/api/objects/upload", 
    isAuthenticated, 
    asyncHandler(async (req, res) => {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      
      logger.info('[ObjectStorage] URL upload générée', { 
        metadata: { userId: req.user?.id } 
      });
      
      res.json({ success: true, data: { uploadURL } });
    })
  );

  router.get("/api/objects/:objectPath/*splat", 
    isAuthenticated, 
    asyncHandler(async (req, res) => {
      const objectStorageService = new ObjectStorageService();
      const objectPath = `/${req.params.objectPath}`;
      
      // Check if object exists
      const exists = await objectStorageService.objectExists(objectPath);
      if (!exists) {
        throw new NotFoundError("File not found");
      }
      
      logger.info('[ObjectStorage] Objet servi', { 
        metadata: { objectPath, userId: req.user?.id } 
      });
      
      // Download and serve object
      await objectStorageService.downloadObject(objectPath, res);
    })
  );

  return router;
}

// Log module initialization
logger.info('[SystemModule] Module System initialized', {
  metadata: {
    routes: [
      '/api/health',
      '/api/users',
      '/api/users/:id',
      '/api/search/global',
      '/api/objects/upload',
      '/api/objects/:objectPath/*splat'
    ]
  }
});
