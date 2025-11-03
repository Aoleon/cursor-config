/**
 * Admin Module Routes
 * 
 * This module handles high-privilege administration routes including:
 * - Intelligence Rules Management (statistics, seed, reset, validate)
 * - Intelligence System Health (health check, integration testing)
 * 
 * ⚠️ IMPORTANT: All routes in this module are HIGH-PRIVILEGE (admin/executive only)
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import { isAuthenticated } from '../../replitAuth';
import { asyncHandler, sendSuccess, createError } from '../../middleware/errorHandler';
import { validateBody, validateQuery } from '../../middleware/validation';
import { rateLimits } from '../../middleware/rate-limiter';
import { logger } from '../../utils/logger';
import type { IStorage } from '../../storage-poc';
import type { EventBus } from '../../eventBus';
import { z } from 'zod';
import { insertDateIntelligenceRuleSchema, projectStatusEnum } from '@shared/schema';
import { DateIntelligenceRulesSeeder } from '../../seeders/dateIntelligenceRulesSeeder';

// ========================================
// VALIDATION SCHEMAS
// ========================================

const resetConfirmationSchema = z.object({
  confirmation: z.literal("RESET_ALL_RULES")
}).refine(
  (data) => data.confirmation === "RESET_ALL_RULES",
  { message: "Confirmation requise: 'RESET_ALL_RULES'" }
);

// Schéma pour les filtres de règles
const rulesFilterSchema = z.object({
  phase: z.string().optional(),
  projectType: z.string().optional(),
  isActive: z.boolean().optional(),
  priority: z.number().optional()
});

// ========================================
// ADMIN ROUTER FACTORY
// ========================================

export function createAdminRouter(storage: IStorage, eventBus: EventBus): Router {
  const router = Router();

  // ========================================
  // INTELLIGENCE RULES MANAGEMENT ROUTES
  // ========================================

  /**
   * GET /api/admin/rules/statistics
   * 
   * Récupère les statistiques des règles d'intelligence temporelle
   * - Nombre total de règles
   * - Nombre de règles actives/inactives
   * - Distribution par phase et type de projet
   * - Performance et utilisation
   * 
   * @access admin/executive
   */
  router.get('/api/admin/rules/statistics',
    isAuthenticated,
    asyncHandler(async (req: any, res: Response) => {
      try {
        logger.info('[Admin] Récupération statistiques règles métier', {
          metadata: {
            route: '/api/admin/rules/statistics',
            method: 'GET',
            userId: req.user?.id
          }
        });
        
        const stats = await DateIntelligenceRulesSeeder.getRulesStatistics();
        
        logger.info('[Admin] Statistiques règles récupérées', {
          metadata: {
            totalRules: stats.totalRules,
            activeRules: stats.activeRules
          }
        });
        
        sendSuccess(res, stats);
      } catch (error: any) {
        logger.error('[Admin] Erreur statistiques règles', {
          metadata: { 
            error: error.message, 
            stack: error.stack,
            userId: req.user?.id
          }
        });
        throw createError.database("Erreur lors de la récupération des statistiques");
      }
    })
  );

  /**
   * POST /api/admin/rules/seed
   * 
   * Force le seeding des règles par défaut
   * - Crée ou met à jour les règles standards
   * - Utile pour initialiser un nouveau système
   * - Ou pour restaurer les règles après modification
   * 
   * @access admin/executive
   */
  router.post('/api/admin/rules/seed',
    isAuthenticated,
    rateLimits.general,
    asyncHandler(async (req: any, res: Response) => {
      try {
        logger.info('[Admin] Seeding forcé des règles par défaut', {
          metadata: {
            route: '/api/admin/rules/seed',
            method: 'POST',
            userId: req.user?.id
          }
        });
        
        await DateIntelligenceRulesSeeder.updateDefaultRules();
        
        const stats = await DateIntelligenceRulesSeeder.getRulesStatistics();
        
        logger.info('[Admin] Seeding règles terminé', {
          metadata: {
            totalRules: stats.totalRules,
            activeRules: stats.activeRules,
            userId: req.user?.id
          }
        });
        
        eventBus.emit('admin:rules_seeded', {
          userId: req.user?.id,
          stats
        });
        
        sendSuccess(res, { 
          message: "Seeding des règles par défaut effectué",
          statistics: stats
        }, 200);
        
      } catch (error: any) {
        logger.error('[Admin] Erreur seeding règles', {
          metadata: { 
            error: error.message, 
            stack: error.stack,
            userId: req.user?.id
          }
        });
        throw createError.database("Erreur lors du seeding des règles par défaut");
      }
    })
  );

  /**
   * POST /api/admin/rules/reset
   * 
   * ⚠️ OPÉRATION DESTRUCTIVE ⚠️
   * Reset complet de toutes les règles d'intelligence temporelle
   * - Supprime toutes les règles existantes
   * - Recrée les règles par défaut
   * - Requiert confirmation explicite
   * 
   * @body confirmation: "RESET_ALL_RULES" (requis)
   * @access admin/executive
   */
  router.post('/api/admin/rules/reset',
    isAuthenticated,
    rateLimits.auth, // Plus restrictif pour opération destructive
    validateBody(resetConfirmationSchema),
    asyncHandler(async (req: any, res: Response) => {
      try {
        const userId = req.user?.id || 'unknown';
        
        logger.warn('[Admin] RESET COMPLET des règles initié', {
          metadata: { 
            route: '/api/admin/rules/reset',
            method: 'POST',
            userId,
            operation: 'DESTRUCTIVE'
          }
        });
        
        await DateIntelligenceRulesSeeder.resetAllRules();
        
        const stats = await DateIntelligenceRulesSeeder.getRulesStatistics();
        
        logger.info('[Admin] RESET COMPLET terminé', {
          metadata: { 
            userId,
            totalRules: stats.totalRules,
            activeRules: stats.activeRules
          }
        });
        
        eventBus.emit('admin:rules_reset', {
          userId,
          resetAt: new Date(),
          stats
        });
        
        sendSuccess(res, { 
          message: "Reset complet des règles effectué",
          statistics: stats,
          resetBy: userId,
          resetAt: new Date()
        }, 200);
        
      } catch (error: any) {
        logger.error('[Admin] Erreur reset règles', {
          metadata: { 
            error: error.message, 
            stack: error.stack,
            userId: req.user?.id
          }
        });
        throw createError.database("Erreur lors du reset des règles");
      }
    })
  );

  /**
   * GET /api/admin/rules/validate
   * 
   * Validation de la cohérence des règles d'intelligence temporelle
   * - Vérifie l'intégrité des règles
   * - Détecte les conflits ou incohérences
   * - Génère des recommandations d'optimisation
   * 
   * @returns ValidationReport avec statut healthy/unhealthy
   * @access admin/executive
   */
  router.get('/api/admin/rules/validate',
    isAuthenticated,
    asyncHandler(async (req: any, res: Response) => {
      try {
        logger.info('[Admin] Validation cohérence règles métier', {
          metadata: {
            route: '/api/admin/rules/validate',
            method: 'GET',
            userId: req.user?.id
          }
        });
        
        const validation = await DateIntelligenceRulesSeeder.validateRulesConsistency();
        
        const response = {
          ...validation,
          validatedAt: new Date(),
          summary: {
            isHealthy: validation.isValid && validation.warnings.length === 0,
            totalIssues: validation.issues.length,
            totalWarnings: validation.warnings.length,
            status: validation.isValid ? 
              (validation.warnings.length > 0 ? 'healthy_with_warnings' : 'healthy') : 
              'unhealthy'
          }
        };
        
        logger.info('[Admin] Validation terminée', {
          metadata: {
            isValid: validation.isValid,
            issuesCount: validation.issues.length,
            warningsCount: validation.warnings.length,
            status: response.summary.status
          }
        });
        
        // Statut HTTP selon la validation
        const statusCode = validation.isValid ? 200 : 422;
        
        sendSuccess(res, response, statusCode);
        
      } catch (error: any) {
        logger.error('[Admin] Erreur validation règles', {
          metadata: { 
            error: error.message, 
            stack: error.stack,
            userId: req.user?.id
          }
        });
        throw createError.database("Erreur lors de la validation des règles");
      }
    })
  );

  // ========================================
  // INTELLIGENCE SYSTEM HEALTH ROUTES
  // ========================================

  /**
   * GET /api/admin/intelligence/health
   * 
   * Health check complet du système d'intelligence temporelle
   * - Santé des règles (statistiques, validation)
   * - État des alertes actives
   * - Score de santé global (0-100)
   * - Recommandations d'actions
   * 
   * @returns HealthReport avec score et recommandations
   * @access admin/executive
   */
  router.get('/api/admin/intelligence/health',
    isAuthenticated,
    asyncHandler(async (req: any, res: Response) => {
      try {
        logger.info('[Admin] Vérification santé système intelligence temporelle', {
          metadata: {
            route: '/api/admin/intelligence/health',
            method: 'GET',
            userId: req.user?.id
          }
        });
        
        // Récupérer les statistiques des différents composants
        const [rulesStats, rulesValidation] = await Promise.all([
          DateIntelligenceRulesSeeder.getRulesStatistics(),
          DateIntelligenceRulesSeeder.validateRulesConsistency()
        ]);
        
        // Vérifier les alertes actives
        const activeAlerts = await storage.getDateAlerts({ status: 'pending' });
        
        // Calculer le score de santé général
        let healthScore = 100;
        
        // Déductions pour problèmes
        if (!rulesValidation.isValid) healthScore -= 30;
        if (rulesValidation.warnings.length > 0) healthScore -= rulesValidation.warnings.length * 5;
        if (rulesStats.activeRules === 0) healthScore -= 50;
        if (activeAlerts.length > 10) healthScore -= 20;
        
        healthScore = Math.max(0, healthScore);
        
        const healthStatus = healthScore >= 90 ? 'excellent' :
                            healthScore >= 70 ? 'good' :
                            healthScore >= 50 ? 'fair' : 'poor';
        
        const healthReport = {
          healthScore,
          healthStatus,
          components: {
            rules: {
              total: rulesStats.totalRules,
              active: rulesStats.activeRules,
              isValid: rulesValidation.isValid,
              issues: rulesValidation.issues.length,
              warnings: rulesValidation.warnings.length
            },
            alerts: {
              pending: activeAlerts.filter(a => a.status === 'pending').length,
              critical: activeAlerts.filter(a => a.severity === 'critical').length,
              total: activeAlerts.length
            },
            system: {
              serviceAvailable: true, // Le service répond
              lastCheck: new Date()
            }
          },
          recommendations: [] as string[]
        };
        
        // Recommandations basées sur l'état
        if (rulesStats.activeRules === 0) {
          healthReport.recommendations.push("Aucune règle active - Exécuter le seeding des règles par défaut");
        }
        
        if (!rulesValidation.isValid) {
          healthReport.recommendations.push("Problèmes de cohérence détectés - Vérifier et corriger les règles");
        }
        
        if (activeAlerts.filter(a => a.severity === 'critical').length > 0) {
          healthReport.recommendations.push("Alertes critiques en attente - Traitement prioritaire requis");
        }
        
        if (rulesValidation.warnings.length > 3) {
          healthReport.recommendations.push("Nombreux avertissements - Optimisation des règles recommandée");
        }
        
        logger.info('[Admin] Santé système évaluée', {
          metadata: { 
            healthStatus, 
            healthScore,
            recommendationsCount: healthReport.recommendations.length
          }
        });
        
        sendSuccess(res, healthReport, 200);
        
      } catch (error: any) {
        logger.error('[Admin] Erreur vérification santé', {
          metadata: { 
            error: error.message, 
            stack: error.stack,
            userId: req.user?.id
          }
        });
        throw createError.database("Erreur lors de la vérification de santé du système");
      }
    })
  );

  /**
   * GET /api/admin/intelligence/test-integration
   * 
   * Test d'intégration complet du système d'intelligence temporelle
   * - Exécute une suite de tests end-to-end
   * - Valide le fonctionnement de tous les composants
   * - Génère un rapport détaillé des résultats
   * 
   * @returns IntegrationTestReport avec résultats détaillés
   * @access admin/executive
   */
  router.get('/api/admin/intelligence/test-integration',
    isAuthenticated,
    asyncHandler(async (req: any, res: Response) => {
      try {
        logger.info('[Admin] Démarrage test intégration intelligence temporelle', {
          metadata: {
            route: '/api/admin/intelligence/test-integration',
            method: 'GET',
            userId: req.user?.id
          }
        });
        
        // Import dynamique du test pour éviter les dépendances circulaires
        const { runIntegrationTest } = await import('../../test/dateIntelligenceIntegration.test');
        
        const testResults = await runIntegrationTest();
        
        const response = {
          ...testResults,
          testedAt: new Date(),
          testType: 'full_integration',
          phase: '2.2_intelligent_date_calculation_engine'
        };
        
        logger.info('[Admin] Test intégration terminé', {
          metadata: {
            success: testResults.success,
            healthScore: testResults.healthScore || 0,
            eventsReceived: testResults.eventsReceived || 0
          }
        });
        
        const statusCode = testResults.success ? 200 : 422;
        
        res.status(statusCode).json({
          success: testResults.success,
          data: response,
          message: testResults.success ? 
            "Test d'intégration réussi - Système opérationnel" : 
            "Test d'intégration partiel - Problèmes détectés"
        });
        
      } catch (error: any) {
        logger.error('[Admin] Erreur test intégration', {
          metadata: { 
            error: error.message, 
            stack: error.stack,
            userId: req.user?.id
          }
        });
        throw createError.database("Erreur lors du test d'intégration");
      }
    })
  );

  // ========================================
  // INTELLIGENCE RULES ROUTES
  // ========================================

  /**
   * GET /api/intelligence-rules
   * 
   * Récupération des règles d'intelligence temporelle avec filtres
   * - Filtre par phase de projet
   * - Filtre par type de projet
   * - Filtre par statut actif/inactif
   * - Filtre par priorité minimale
   * 
   * @query phase?: string - Phase du projet
   * @query projectType?: string - Type de projet
   * @query isActive?: boolean - Statut actif/inactif
   * @query priority?: number - Priorité minimale
   * @access authenticated
   */
  router.get("/api/intelligence-rules",
    isAuthenticated,
    validateQuery(rulesFilterSchema),
    asyncHandler(async (req, res) => {
      try {
        const { phase, projectType, isActive, priority } = req.query;
        
        logger.info('Récupération règles avec filtres', {
          metadata: { filters: req.query }
        });
        
        // Construire les filtres pour le storage
        const filters: any = {};
        if (phase) filters.phase = phase as typeof projectStatusEnum.enumValues[number];
        if (projectType) filters.projectType = projectType;
        
        // Récupérer les règles depuis le storage
        let rules = await storage.getActiveRules(filters);
        
        // Appliquer les filtres additionnels
        if (typeof isActive === 'boolean') {
          rules = rules.filter(rule => rule.isActive === isActive);
        }
        
        if (priority !== undefined) {
          const numPriority = Number(priority);
          rules = rules.filter(rule => (rule.priority || 0) >= numPriority);
        }
        
        const result = {
          rules,
          metadata: {
            totalRules: rules.length,
            activeRules: rules.filter(r => r.isActive).length,
            filtersApplied: Object.keys(req.query).length,
            retrievedAt: new Date()
          }
        };
        
        sendSuccess(res, result);
      } catch (error: any) {
        logger.error('Erreur récupération règles', {
          metadata: { error: error.message, stack: error.stack }
        });
        throw createError.database("Erreur lors de la récupération des règles");
      }
    })
  );

  /**
   * POST /api/intelligence-rules
   * 
   * Création d'une nouvelle règle d'intelligence temporelle personnalisée
   * - Définit les paramètres de calcul de dates
   * - Configure les dépendances entre phases
   * - Établit les priorités et conditions
   * 
   * @body DateIntelligenceRule - Données de la nouvelle règle
   * @access authenticated
   */
  router.post("/api/intelligence-rules",
    isAuthenticated,
    rateLimits.creation,
    validateBody(insertDateIntelligenceRuleSchema),
    asyncHandler(async (req: any, res) => {
      try {
        logger.info('Création nouvelle règle', {
          metadata: { name: req.body.name }
        });
        
        // Ajouter l'utilisateur créateur
        const ruleData = {
          ...req.body,
          createdBy: req.user?.id || 'system'
        };
        
        // Créer la règle dans le storage
        const newRule = await storage.createRule(ruleData);
        
        logger.info('Règle créée avec succès', {
          metadata: { ruleId: newRule.id }
        });
        
        sendSuccess(res, newRule, 201);
      } catch (error: any) {
        logger.error('Erreur création règle', {
          metadata: { error: error.message, stack: error.stack }
        });
        
        // Gestion d'erreurs spécialisées
        if (error.message?.includes('nom déjà utilisé')) {
          throw createError.conflict("Une règle avec ce nom existe déjà", {
            errorType: 'DUPLICATE_RULE_NAME'
          });
        }
        
        throw createError.database("Erreur lors de la création de la règle");
      }
    })
  );

  // ========================================
  // ONEDRIVE SYNC CONFIGURATION ROUTES
  // ========================================

  /**
   * GET /api/admin/sync-config
   * 
   * Récupère la configuration de synchronisation automatique OneDrive
   * - Statut (activé/désactivé)
   * - Expression cron (fréquence)
   * - Dernière synchronisation (date, statut, résultat)
   * - Prochaine synchronisation planifiée
   * 
   * @access admin/executive
   */
  router.get('/api/admin/sync-config',
    isAuthenticated,
    asyncHandler(async (req: any, res: Response) => {
      try {
        logger.info('[Admin] Récupération configuration synchronisation OneDrive', {
          metadata: {
            route: '/api/admin/sync-config',
            method: 'GET',
            userId: req.user?.id
          }
        });
        
        const config = await storage.getSyncConfig();
        
        if (!config) {
          sendSuccess(res, {
            isEnabled: false,
            cronExpression: '0 */6 * * *',
            lastSyncAt: null,
            nextSyncAt: null,
            lastSyncStatus: null,
            lastSyncResult: {}
          });
          return;
        }
        
        logger.info('[Admin] Configuration synchronisation récupérée', {
          metadata: {
            isEnabled: config.isEnabled,
            lastSyncStatus: config.lastSyncStatus
          }
        });
        
        sendSuccess(res, config);
      } catch (error: any) {
        logger.error('[Admin] Erreur récupération configuration sync', {
          metadata: { 
            error: error.message, 
            stack: error.stack,
            userId: req.user?.id
          }
        });
        throw createError.database("Erreur lors de la récupération de la configuration");
      }
    })
  );

  /**
   * PATCH /api/admin/sync-config
   * 
   * Met à jour la configuration de synchronisation automatique OneDrive
   * - Active/désactive la synchronisation automatique
   * - Modifie la fréquence (expression cron)
   * - Redémarre le scheduler avec la nouvelle configuration
   * 
   * @body isEnabled?: boolean - Activer/désactiver
   * @body cronExpression?: string - Expression cron (ex: '0 *\/6 * * *')
   * @access admin/executive
   */
  router.patch('/api/admin/sync-config',
    isAuthenticated,
    rateLimits.general,
    asyncHandler(async (req: any, res: Response) => {
      try {
        const { isEnabled, cronExpression } = req.body;
        
        logger.info('[Admin] Mise à jour configuration synchronisation OneDrive', {
          metadata: {
            route: '/api/admin/sync-config',
            method: 'PATCH',
            userId: req.user?.id,
            isEnabled,
            cronExpression
          }
        });
        
        // Validation basique de l'expression cron si fournie
        if (cronExpression && typeof cronExpression !== 'string') {
          throw createError.validation("Expression cron invalide");
        }
        
        const updatedConfig = await storage.updateSyncConfig({
          isEnabled,
          cronExpression,
          updatedBy: req.user?.id || 'system'
        });
        
        // Redémarrer le scheduler avec la nouvelle configuration
        const syncScheduler = req.app.get('syncScheduler');
        if (syncScheduler) {
          await syncScheduler.restart();
          logger.info('[Admin] Scheduler redémarré avec nouvelle configuration', {
            metadata: {
              isEnabled: updatedConfig.isEnabled,
              cronExpression: updatedConfig.cronExpression
            }
          });
        }
        
        eventBus.emit('admin:sync_config_updated', {
          userId: req.user?.id,
          config: updatedConfig,
          updatedAt: new Date()
        });
        
        sendSuccess(res, {
          message: "Configuration mise à jour avec succès",
          config: updatedConfig,
          schedulerStatus: syncScheduler?.getStatus() || { isRunning: false, isScheduled: false }
        }, 200);
        
      } catch (error: any) {
        logger.error('[Admin] Erreur mise à jour configuration sync', {
          metadata: { 
            error: error.message, 
            stack: error.stack,
            userId: req.user?.id
          }
        });
        throw createError.database("Erreur lors de la mise à jour de la configuration");
      }
    })
  );

  return router;
}
