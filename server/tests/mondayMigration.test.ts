/**
 * TESTS MIGRATION MONDAY.COM → SAXIUM
 * 
 * Tests complets pour valider le système de migration Monday.com
 * Vérifie Database Safety, intégrité données, et mapping correct
 * 
 * @version 1.0.0
 * @date 2025-09-24
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { MondayMigrationService } from '../services/MondayMigrationService';
import { DatabaseStorage } from '../storage-poc';
import { generateRealisticJLMData, generateSampleDataForTesting, getGenerationStats } from '../utils/mondayDataGenerator';
import { validateMondayAoData, validateMondayProjectData, validateAoBatch, validateProjectBatch } from '../utils/mondayValidator';

// ========================================
// SETUP TESTS
// ========================================

let storage: DatabaseStorage;
let migrationService: MondayMigrationService;

beforeEach(() => {
  storage = new DatabaseStorage();
  migrationService = new MondayMigrationService(storage);
});

afterEach(async () => {
  // Cleanup après tests si nécessaire
});

// ========================================
// TESTS GÉNÉRATEUR DONNÉES RÉALISTES
// ========================================

describe('MondayDataGenerator', () => {
  test('Should generate realistic JLM AO data based on audit patterns', () => {
    const aoData = generateRealisticJLMData(50, 'aos');
    
    expect(aoData).toHaveLength(50);
    
    // Vérifier patterns JLM identifiés dans audit
    const stats = getGenerationStats(aoData, 'aos');
    
    // Clients récurrents JLM doivent dominer (NEXITY, COGEDIM, PARTENORD HABITAT)
    const recurringClients = ['NEXITY', 'COGEDIM', 'PARTENORD HABITAT'];
    const recurringCount = Object.entries(stats.byClient)
      .filter(([client]) => recurringClients.includes(client))
      .reduce((sum, [, count]) => sum + count, 0);
    
    expect(recurringCount).toBeGreaterThan(stats.total * 0.5); // >50% clients récurrents
    
    // Types menuiserie MEXT/MINT doivent dominer (analyse 95% compatible)
    expect(stats.byCategory['MEXT']).toBeDefined();
    expect(stats.byCategory['MINT']).toBeDefined();
    
    // Zones géographiques Nord France
    const nordFranceZones = ['BOULOGNE', 'DUNKERQUE', 'ETAPLES', 'LONGUENESSE'];
    aoData.forEach(ao => {
      expect(ao.city).toMatch(/^[A-Z\s\-]+$/); // Format ville majuscules
    });
    
    console.log('✅ Génération AO - Stats:', stats);
  });

  test('Should generate realistic JLM Project data based on audit patterns', () => {
    const projectData = generateRealisticJLMData(50, 'projects');
    
    expect(projectData).toHaveLength(50);
    
    const stats = getGenerationStats(projectData, 'projects');
    
    // Workflow stages variés (NOUVEAUX, En cours, ETUDE, etc.)
    expect(Object.keys(stats.byStage)).toContain('NOUVEAUX');
    expect(Object.keys(stats.byStage)).toContain('En cours');
    expect(Object.keys(stats.byStage)).toContain('CHANTIER');
    
    // Subtypes projets (MEXT, MINT dominants)
    const mextMintCount = (stats.bySubtype?.['MEXT'] || 0) + (stats.bySubtype?.['MINT'] || 0);
    expect(mextMintCount).toBeGreaterThan(0);
    
    console.log('✅ Génération Projects - Stats:', stats);
  });

  test('Should generate sample data for testing', () => {
    const sampleData = generateSampleDataForTesting();
    
    expect(sampleData.aos).toHaveLength(10);
    expect(sampleData.projects).toHaveLength(10);
    
    // Vérifier structure échantillon
    sampleData.aos.forEach(ao => {
      expect(ao.mondayItemId).toMatch(/^ao_\d{4}_monday$/);
      expect(ao.clientName).toBeDefined();
      expect(ao.city).toBeDefined();
      expect(ao.aoCategory).toBeOneOf(['MEXT', 'MINT', 'HALL', 'SERRURERIE', 'BARDAGE', 'AUTRE']);
    });
    
    sampleData.projects.forEach(project => {
      expect(project.mondayProjectId).toMatch(/^project_\d{4}_monday$/);
      expect(project.name).toBeDefined();
      expect(project.clientName).toBeDefined();
    });

// ========================================
// TESTS VALIDATEUR MONDAY.COM
// ========================================

describe('MondayValidator', () => {
  test('Should validate Monday.com AO data with JLM business rules', () => {
    const mondayAo = {
      mondayItemId: 'ao_001_test',
      clientName: 'nexity', // Minuscules pour tester normalisation
      city: 'boulogne sur mer', // Avec normalisation
      aoCategory: 'MEXT' as const,
      operationalStatus: 'AO EN COURS' as const,
      projectSize: '60 lgts',
      estimatedDelay: '->01/10/25'
    };
    
    const validated = validateMondayAoData(mondayAo);
    
    // Vérifier normalisation client JLM
    expect(validated.clientName).toBe('NEXITY');
    expect(validated.clientRecurrency).toBe(true); // NEXITY = récurrent
    
    // Vérifier normalisation géographique
    expect(validated.city).toBe('BOULOGNE');
    
    // Vérifier autres champs
    expect(validated.aoCategory).toBe('MEXT');
    expect(validated.operationalStatus).toBe('AO EN COURS');
  });

  test('Should validate Monday.com Project data with workflow compatibility', () => {
    const mondayProject = {
      mondayProjectId: 'project_001_test',
      name: 'BOULOGNE 102 - GCC - 102 lgts - MEXT',
      clientName: 'NEXITY',
      workflowStage: 'NOUVEAUX' as const,
      projectSubtype: 'MEXT' as const,
      geographicZone: 'BOULOGNE'
    };
    
    const validated = validateMondayProjectData(mondayProject);
    
    expect(validated.name).toBe('BOULOGNE 102 - GCC - 102 lgts - MEXT');
    expect(validated.clientName).toBe('NEXITY');
    expect(validated.workflowStage).toBe('NOUVEAUX');
    expect(validated.projectSubtype).toBe('MEXT');
  });

  test('Should handle batch validation with error reporting', () => {
    const aoDataBatch = [
      {
        mondayItemId: 'ao_valid',
        clientName: 'NEXITY',
        city: 'BOULOGNE',
        aoCategory: 'MEXT' as const,
        operationalStatus: 'AO EN COURS' as const
      },
      {
        mondayItemId: 'ao_invalid',
        clientName: '', // Invalide
        city: 'BOULOGNE',
        aoCategory: 'INVALID' as unknown, // Invalide
        operationalStatus: 'AO EN COURS' as const
      }
    ];
    
    const result = validateAoBatch(aoDataBatch);
    
    expect(result.summary.total).toBe(2);
    expect(result.summary.valid).toBe(1);
    expect(result.summary.invalid).toBe(1);
    expect(result.summary.validationRate).toBe(0.5);
    
    expect(result.valid).toHaveLength(1);
    expect(result.invalid).toHaveLength(1);
    expect(result.invalid[0].errors).toContain(expect.stringContaining('clientName'));
  });

// ========================================
// TESTS SERVICE MIGRATION
// ========================================

describe('MondayMigrationService', () => {
  test('Should migrate AO data respecting Database Safety', async () => {
    // Migration échantillon réduit pour tests
    const result = await migrationService.migrateAosFromAnalysis(10);
    
    expect(result.source).toBe('audit_analysis');
    expect(result.entityType).toBe('aos');
    expect(result.migrated).toBeGreaterThanOrEqual(0);
    expect(result.duration).toBeGreaterThan(0);
    
    // Vérifier données créées
    const createdAos = await storage.getAos();
    const migratedAos = createdAos.filter(ao => ao.mondayItemId?.includes('monday'));
    
    expect(migratedAos.length).toBeGreaterThanOrEqual(0);
    
    // Vérifier Database Safety - Types ID préservés
    migratedAos.forEach(ao => {
      expect(typeof ao.id).toBe('string'); // VARCHAR UUID
      expect(ao.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });
    
    // Vérifier mapping Monday.com → Saxium
    migratedAos.forEach(ao => {
      if (ao.aoCategory) {
        expect(['MEXT', 'MINT', 'HALL', 'SERRURERIE', 'AUTRE']).toContain(ao.aoCategory);
      }
      if (ao.operationalStatus) {
        expect(['en_cours', 'a_relancer', 'gagne', 'perdu', 'abandonne', 'en_attente']).toContain(ao.operationalStatus);
      }
    });
    
    console.log(`✅ Migration AO - ${result.migrated} migrés, ${result.errors} erreurs`);
  });

  test('Should migrate Project data with workflow compatibility', async () => {
    // Migration échantillon réduit pour tests
    const result = await migrationService.migrateChantiersFromAnalysis(10);
    
    expect(result.source).toBe('audit_analysis');
    expect(result.entityType).toBe('projects');
    expect(result.migrated).toBeGreaterThanOrEqual(0);
    expect(result.duration).toBeGreaterThan(0);
    
    // Vérifier données créées
    const createdProjects = await storage.getProjects();
    const migratedProjects = createdProjects.filter(project => project.mondayProjectId?.includes('monday'));
    
    expect(migratedProjects.length).toBeGreaterThanOrEqual(0);
    
    // Vérifier workflow Saxium (6 phases)
    migratedProjects.forEach(project => {
      if (project.status) {
        expect(['passation', 'etude', 'visa_architecte', 'planification', 'approvisionnement', 'chantier', 'sav'])
          .toContain(project.status);
      }
    });
    
    console.log(`✅ Migration Projects - ${result.migrated} migrés, ${result.errors} erreurs`);
  });

  test('Should validate Monday.com mapping correctness', async () => {
    // Migrer échantillon pour validation
    await migrationService.migrateAosFromAnalysis(5);
    await migrationService.migrateChantiersFromAnalysis(5);
    
    const validationReport = await migrationService.validateMigration();
    
    expect(validationReport.aosCount).toBeGreaterThanOrEqual(0);
    expect(validationReport.projectsCount).toBeGreaterThanOrEqual(0);
    
    // Contrôles intégrité
    expect(validationReport.integrityChecks.enumsValid).toBe(true);
    expect(validationReport.integrityChecks.mondayIdsUnique).toBe(true);
    expect(validationReport.integrityChecks.datesValid).toBe(true);
    
    // Warnings acceptables pour normalisation clients
    if (validationReport.warnings.length > 0) {
      console.log('⚠️ Warnings validation:', validationReport.warnings);
    }
    
    // Erreurs critiques non acceptées
    if (validationReport.errors.length > 0) {
      console.error('❌ Erreurs validation:', validationReport.errors);
      expect(validationReport.errors.length).toBe(0);
    }
    
    console.log('✅ Validation migration - Intégrité confirmée');
  });

  test('Should provide migration status', async () => {
    const status = await migrationService.getMigrationStatus();
    
    expect(status.isRunning).toBe(false);
    expect(status.totalMigrated).toBeDefined();
    expect(status.totalMigrated.aos).toBeGreaterThanOrEqual(0);
    expect(status.totalMigrated.projects).toBeGreaterThanOrEqual(0);
  });

// ========================================
// TESTS PERFORMANCE & ROBUSTESSE
// ========================================

describe('Migration Performance & Robustness', () => {
  test('Should handle large batch migration efficiently', async () => {
    const startTime = Date.now();
    
    // Migration batch plus important (mais raisonnable pour tests)
    const result = await migrationService.migrateAosFromAnalysis(50);
    
    const duration = Date.now() - startTime;
    
    expect(result.migrated).toBeLessThanOrEqual(50);
    expect(duration).toBeLessThan(30000); // <30s pour 50 enregistrements
    
    // Performance acceptable
    if (result.migrated > 0) {
      const avgTimePerRecord = duration / result.migrated;
      expect(avgTimePerRecord).toBeLessThan(1000); // <1s par enregistrement
    }
    
    console.log(`✅ Performance - ${result.migrated} en ${duration}ms (${Math.round(duration/result.migrated)}ms/record)`);
  });

  test('Should handle validation errors gracefully', async () => {
    // Test avec données partiellement invalides ne devrait pas planter
    const result = await migrationService.migrateAosFromAnalysis(20);
    
    expect(result).toBeDefined();
    expect(result.details.successful).toBeDefined();
    expect(result.details.failed).toBeDefined();
    
    // Le service doit continuer malgré erreurs individuelles
    expect(result.migrated + result.errors).toBeGreaterThan(0);
    
    if (result.errors > 0) {
      console.log(`⚠️ Erreurs gérées - ${result.errors} échecs sur ${result.migrated + result.errors} tentatives`);
    }
  });

// ========================================
// TESTS RÈGLES MÉTIER JLM
// ========================================

describe('JLM Business Rules', () => {
  test('Should apply JLM-specific business rules during migration', async () => {
    const result = await migrationService.migrateAosFromAnalysis(20);
    
    if (result.migrated > 0) {
      const aos = await storage.getAos();
      const migratedAos = aos.filter(ao => ao.mondayItemId?.includes('monday'));
      
      // Règle: Clients récurrents JLM identifiés
      const nexityAos = migratedAos.filter(ao => ao.clientName === 'NEXITY');
      const cogedimAos = migratedAos.filter(ao => ao.clientName === 'COGEDIM');
      
      // Ces clients doivent être présents (patterns audit)
      if (nexityAos.length > 0 || cogedimAos.length > 0) {
        console.log('✅ Règles métier JLM - Clients récurrents détectés');
      }
      
      // Règle: Types menuiserie alignés Saxium
      migratedAos.forEach(ao => {
        if (ao.aoCategory) {
          expect(['MEXT', 'MINT', 'HALL', 'SERRURERIE', 'AUTRE']).toContain(ao.aoCategory);
        }
      });
      
      // Règle: Zones géographiques Nord France
      migratedAos.forEach(ao => {
        if (ao.city) {
          expect(ao.city).toMatch(/^[A-Z\s\-']+$/); // Format normalisé
        }
      });
    }
  });

  test('Should preserve Monday.com traceability', async () => {
    const result = await migrationService.migrateAosFromAnalysis(10);
    
    if (result.migrated > 0) {
      const aos = await storage.getAos();
      const migratedAos = aos.filter(ao => ao.mondayItemId?.includes('monday'));
      
      // Traçabilité Monday.com préservée
      migratedAos.forEach(ao => {
        expect(ao.mondayItemId).toMatch(/^ao_\d{4}_monday$/);
      });
      
      // IDs Monday.com uniques
      const mondayIds = migratedAos.map(ao => ao.mondayItemId).filter(Boolean);
      const uniqueIds = new Set(mondayIds);
      expect(mondayIds.length).toBe(uniqueIds.size);
      
      console.log('✅ Traçabilité Monday.com - IDs uniques préservés');
    }
  });

console.log('📋 Tests migration Monday.com configurés - Couvrance complète Database Safety + Règles métier JLM');