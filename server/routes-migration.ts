/**
 * ROUTES API MIGRATION MONDAY.COM → SAXIUM
 * 
 * Routes REST pour gérer la migration des données Monday.com vers Saxium
 * Utilise MondayMigrationService basé sur analyses gap détaillées
 * 
 * Endpoints:
 * - POST /api/migration/aos-planning : Migre AO_Planning (911 lignes)
 * - POST /api/migration/chantiers : Migre CHANTIERS (1000 lignes)  
 * - GET /api/migration/status : Statut migration actuel
 * - POST /api/migration/validate : Validation post-migration
 * 
 * @version 1.0.0
 * @date 2025-09-24
 */

import express from 'express';
import { z } from 'zod';
import { MondayMigrationService } from './services/MondayMigrationService';
import { DatabaseStorage } from './storage-poc';
import { validateBody } from './middleware/validation';

// ========================================
// INITIALISATION SERVICE MIGRATION
// ========================================

const storage = new DatabaseStorage();
const mondayMigrationService = new MondayMigrationService(storage);

export const migrationRoutes = express.Router();

// ========================================
// SCHÉMAS VALIDATION REQUÊTES
// ========================================

const migrationRequestSchema = z.object({
  count: z.number()
    .int('Count doit être un entier')
    .min(1, 'Minimum 1 enregistrement')
    .max(10000, 'Maximum 10000 enregistrements')
    .optional()
    .default(100),
  dryRun: z.boolean().optional().default(false)
});

const validationRequestSchema = z.object({
  detailed: z.boolean().optional().default(false)
});

// ========================================
// ROUTES MIGRATION AO_PLANNING
// ========================================

/**
 * POST /api/migration/aos-planning
 * Migre les données AO_Planning Monday.com (911 lignes analysées)
 */
migrationRoutes.post('/aos-planning',
  validateBody(migrationRequestSchema),
  async (req, res) => {
    try {
      const { count, dryRun } = req.body;

      console.log(`[Migration API] Démarrage migration AO_Planning - ${count} enregistrements, dryRun: ${dryRun}`);

      if (dryRun) {
        // Mode simulation - génère et valide sans insérer
        const { generateRealisticJLMData } = await import('./utils/mondayDataGenerator');
        const { validateAoBatch } = await import('./utils/mondayValidator');
        
        const sampleData = generateRealisticJLMData(Math.min(count, 10), 'aos');
        const validation = validateAoBatch(sampleData);
        
        return res.json({
          success: true,
          dryRun: true,
          simulation: {
            generated: sampleData.length,
            validation: validation.summary,
            sampleData: validation.valid.slice(0, 3) // 3 premiers pour aperçu
          }
        });
      }

      // Migration réelle
      const result = await mondayMigrationService.migrateAosFromAnalysis(count);
      
      res.json({
        success: true,
        migration: result,
        message: `Migration AO_Planning terminée - ${result.migrated} migrés, ${result.errors} erreurs`
      });

    } catch (error) {
      console.error('[Migration API] Erreur migration AO_Planning:', error);
      
      res.status(500).json({
        success: false,
        error: 'Erreur migration AO_Planning',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }
);

// ========================================
// ROUTES MIGRATION CHANTIERS
// ========================================

/**
 * POST /api/migration/chantiers
 * Migre les données CHANTIERS Monday.com (1000 lignes analysées)
 */
migrationRoutes.post('/chantiers',
  validateBody(migrationRequestSchema),
  async (req, res) => {
    try {
      const { count, dryRun } = req.body;

      console.log(`[Migration API] Démarrage migration CHANTIERS - ${count} enregistrements, dryRun: ${dryRun}`);

      if (dryRun) {
        // Mode simulation - génère et valide sans insérer
        const { generateRealisticJLMData } = await import('./utils/mondayDataGenerator');
        const { validateProjectBatch } = await import('./utils/mondayValidator');
        
        const sampleData = generateRealisticJLMData(Math.min(count, 10), 'projects');
        const validation = validateProjectBatch(sampleData);
        
        return res.json({
          success: true,
          dryRun: true,
          simulation: {
            generated: sampleData.length,
            validation: validation.summary,
            sampleData: validation.valid.slice(0, 3) // 3 premiers pour aperçu
          }
        });
      }

      // Migration réelle
      const result = await mondayMigrationService.migrateChantiersFromAnalysis(count);
      
      res.json({
        success: true,
        migration: result,
        message: `Migration CHANTIERS terminée - ${result.migrated} migrés, ${result.errors} erreurs`
      });

    } catch (error) {
      console.error('[Migration API] Erreur migration CHANTIERS:', error);
      
      res.status(500).json({
        success: false,
        error: 'Erreur migration CHANTIERS',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }
);

// ========================================
// ROUTES STATUT MIGRATION
// ========================================

/**
 * GET /api/migration/status
 * Retourne le statut actuel des migrations
 */
migrationRoutes.get('/status', async (req, res) => {
  try {
    const status = await mondayMigrationService.getMigrationStatus();
    
    res.json({
      success: true,
      status,
      message: status.isRunning ? 'Migration en cours' : 'Aucune migration active'
    });

  } catch (error) {
    console.error('[Migration API] Erreur récupération statut:', error);
    
    res.status(500).json({
      success: false,
      error: 'Erreur récupération statut migration',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// ========================================
// ROUTES VALIDATION POST-MIGRATION
// ========================================

/**
 * POST /api/migration/validate
 * Lance validation post-migration avec contrôles intégrité
 */
migrationRoutes.post('/validate',
  validateBody(validationRequestSchema),
  async (req, res) => {
    try {
      const { detailed } = req.body;

      console.log('[Migration API] Démarrage validation post-migration');

      const validation = await mondayMigrationService.validateMigration();
      
      const response: any = {
        success: true,
        validation: {
          summary: {
            aosCount: validation.aosCount,
            projectsCount: validation.projectsCount,
            totalMigrated: validation.aosCount + validation.projectsCount
          },
          integrityChecks: validation.integrityChecks,
          issues: {
            errorsCount: validation.errors.length,
            warningsCount: validation.warnings.length
          }
        },
        message: `Validation terminée - ${validation.errors.length} erreurs, ${validation.warnings.length} warnings`
      };

      // Détails complets si demandés
      if (detailed) {
        response.validation.details = {
          errors: validation.errors,
          warnings: validation.warnings
        };
      }

      res.json(response);

    } catch (error) {
      console.error('[Migration API] Erreur validation:', error);
      
      res.status(500).json({
        success: false,
        error: 'Erreur validation migration',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }
);

// ========================================
// ROUTES MIGRATION COMPLÈTE
// ========================================

/**
 * POST /api/migration/full
 * Lance migration complète AO_Planning + CHANTIERS
 */
migrationRoutes.post('/full',
  validateBody(z.object({
    aosCount: z.number().optional().default(911),
    projectsCount: z.number().optional().default(1000),
    dryRun: z.boolean().optional().default(false)
  })),
  async (req, res) => {
    try {
      const { aosCount, projectsCount, dryRun } = req.body;

      console.log(`[Migration API] Démarrage migration complète - AO:${aosCount}, Projects:${projectsCount}, dryRun:${dryRun}`);

      if (dryRun) {
        return res.json({
          success: true,
          dryRun: true,
          plan: {
            aosToMigrate: aosCount,
            projectsToMigrate: projectsCount,
            totalRecords: aosCount + projectsCount,
            estimatedDuration: '~5-10 minutes'
          }
        });
      }

      const results = [];
      let totalMigrated = 0;
      let totalErrors = 0;

      // Migration séquentielle pour éviter surcharge
      if (aosCount > 0) {
        console.log('[Migration API] Phase 1/2 - Migration AO_Planning');
        const aosResult = await mondayMigrationService.migrateAosFromAnalysis(aosCount);
        results.push({ type: 'aos', result: aosResult });
        totalMigrated += aosResult.migrated;
        totalErrors += aosResult.errors;
      }

      if (projectsCount > 0) {
        console.log('[Migration API] Phase 2/2 - Migration CHANTIERS');
        const projectsResult = await mondayMigrationService.migrateChantiersFromAnalysis(projectsCount);
        results.push({ type: 'projects', result: projectsResult });
        totalMigrated += projectsResult.migrated;
        totalErrors += projectsResult.errors;
      }

      // Validation finale
      console.log('[Migration API] Validation finale migration complète');
      const validation = await mondayMigrationService.validateMigration();

      res.json({
        success: true,
        fullMigration: {
          results,
          summary: {
            totalMigrated,
            totalErrors,
            validationPassed: validation.errors.length === 0
          },
          validation: {
            aosCount: validation.aosCount,
            projectsCount: validation.projectsCount,
            integrityChecks: validation.integrityChecks,
            issues: {
              errors: validation.errors.length,
              warnings: validation.warnings.length
            }
          }
        },
        message: `Migration complète terminée - ${totalMigrated} migrés, ${totalErrors} erreurs`
      });

    } catch (error) {
      console.error('[Migration API] Erreur migration complète:', error);
      
      res.status(500).json({
        success: false,
        error: 'Erreur migration complète',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }
);

// ========================================
// ROUTES UTILITAIRES
// ========================================

/**
 * GET /api/migration/sample-data
 * Génère échantillon données Monday.com pour tests
 */
migrationRoutes.get('/sample-data', async (req, res) => {
  try {
    const { generateSampleDataForTesting, getGenerationStats } = await import('./utils/mondayDataGenerator');
    
    const sampleData = generateSampleDataForTesting();
    
    res.json({
      success: true,
      sampleData,
      stats: {
        aos: getGenerationStats(sampleData.aos, 'aos'),
        projects: getGenerationStats(sampleData.projects, 'projects')
      }
    });

  } catch (error) {
    console.error('[Migration API] Erreur génération échantillon:', error);
    
    res.status(500).json({
      success: false,
      error: 'Erreur génération données échantillon',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * DELETE /api/migration/reset
 * Reset migration (supprime données migrées) - ATTENTION DESTRUCTEUR
 */
migrationRoutes.delete('/reset', async (req, res) => {
  try {
    // Protection - seulement en développement
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        error: 'Reset interdit en production'
      });
    }

    console.log('[Migration API] ATTENTION - Reset données migration demandé');

    // TODO: Implémenter reset si nécessaire
    // Nécessiterait méthodes deleteAo, deleteProject dans storage

    res.json({
      success: true,
      message: 'Reset non implémenté - protection données',
      note: 'Pour reset complet, utiliser npm run db:reset'
    });

  } catch (error) {
    console.error('[Migration API] Erreur reset:', error);
    
    res.status(500).json({
      success: false,
      error: 'Erreur reset migration',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

console.log('[Migration Routes] Routes migration Monday.com initialisées');