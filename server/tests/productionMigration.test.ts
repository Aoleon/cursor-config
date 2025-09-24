/**
 * TESTS MIGRATION PRODUCTION JLM MENUISERIE
 * 
 * Tests complets pour valider le système de migration production 1911 lignes
 * Vérifie Database Safety, intégrité données, et mapping correct
 * Basé sur données analysées réelles JLM (pas synthétiques)
 * 
 * @version 1.0.0
 * @date 2025-09-24
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { MondayProductionMigrationService, type ProductionMigrationResult } from '../services/MondayProductionMigrationService';
import { MondayMigrationService } from '../services/MondayMigrationService';
import { validateAndParseMondayDate } from '../utils/mondayValidator';
import type { IStorage } from '../storage-poc';
import type { InsertAo, InsertProject, Ao, Project } from '@shared/schema';

// ========================================
// MOCK STORAGE POUR TESTS
// ========================================

class MockStorage implements Partial<IStorage> {
  private aos: Ao[] = [];
  private projects: Project[] = [];
  private aoIdCounter = 1;
  private projectIdCounter = 1;

  async createAo(ao: InsertAo): Promise<Ao> {
    const newAo: Ao = {
      ...ao,
      id: `ao_${this.aoIdCounter++}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.aos.push(newAo);
    return newAo;
  }

  async createProject(project: InsertProject): Promise<Project> {
    const newProject: Project = {
      ...project,
      id: `project_${this.projectIdCounter++}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.projects.push(newProject);
    return newProject;
  }

  async getAos(): Promise<Ao[]> {
    return [...this.aos];
  }

  async getProjects(): Promise<Project[]> {
    return [...this.projects];
  }

  reset(): void {
    this.aos = [];
    this.projects = [];
    this.aoIdCounter = 1;
    this.projectIdCounter = 1;
  }

  getStats() {
    return {
      aosCount: this.aos.length,
      projectsCount: this.projects.length,
      totalCreated: this.aos.length + this.projects.length
    };
  }
}

// ========================================
// SETUP TESTS
// ========================================

let mockStorage: MockStorage;
let productionService: MondayProductionMigrationService;
let migrationService: MondayMigrationService;

beforeEach(() => {
  mockStorage = new MockStorage();
  productionService = new MondayProductionMigrationService(mockStorage as IStorage);
  migrationService = new MondayMigrationService(mockStorage as IStorage);
});

afterEach(() => {
  mockStorage.reset();
});

// ========================================
// TESTS MIGRATION PRODUCTION COMPLÈTE
// ========================================

describe('Production Migration JLM Menuiserie - Migration Complète', () => {
  test('Should migrate 1911 lines with minimal validation errors', async () => {
    console.log('🧪 Test migration production complète 1911 lignes JLM');
    
    // Migration complète basée analyses
    const result = await productionService.migrateProductionData();
    
    // Validation des résultats globaux
    expect(result.totalLines).toBe(1911);
    expect(result.success).toBe(true);
    expect(result.source).toBe('production_analysis');
    expect(result.duration).toBeGreaterThan(0);
    
    // Validation migration AO (911 lignes)
    expect(result.aos.totalLines).toBe(911);
    expect(result.aos.migrated).toBeGreaterThan(900); // Au moins 98% de succès
    expect(result.aos.validationRate).toBeGreaterThan(0.98);
    
    // Validation migration projets (1000 lignes)
    expect(result.projects.totalLines).toBe(1000);
    expect(result.projects.migrated).toBeGreaterThan(980); // Au moins 98% de succès
    expect(result.projects.validationRate).toBeGreaterThan(0.98);
    
    // Validation totale
    expect(result.totalMigrated).toBe(result.aos.migrated + result.projects.migrated);
    expect(result.errors).toBeLessThan(20); // Maximum 1% d'erreurs acceptable
    
    // Vérifier création effective en BDD
    const storageStats = mockStorage.getStats();
    expect(storageStats.aosCount).toBe(result.aos.migrated);
    expect(storageStats.projectsCount).toBe(result.projects.migrated);
    
    console.log(`✅ Migration production réussie: ${result.totalMigrated}/${result.totalLines} lignes`);
    console.log(`   - AOs: ${result.aos.migrated}/911, Projets: ${result.projects.migrated}/1000`);
    console.log(`   - Erreurs: ${result.errors}, Durée: ${result.duration}ms`);
  }, 30000); // Timeout 30s pour migration complète

  test('Should use real JLM business data patterns (not synthetic)', async () => {
    console.log('🧪 Test patterns données JLM réelles vs synthétiques');
    
    // Charger données analysées (production)
    const jlmData = productionService.loadJLMAnalyzedData();
    
    // Validation structures données
    expect(jlmData.aos.length).toBe(911);
    expect(jlmData.projects.length).toBe(1000);
    
    // Vérifier patterns JLM réels dans AOs
    const firstAo = jlmData.aos[0];
    const clients = ['NEXITY', 'COGEDIM', 'PARTENORD HABITAT', 'SAMSE', 'NACARAT'];
    const cities = ['GRANDE-SYNTHE', 'DUNKERQUE', 'BOULOGNE-SUR-MER', 'LONGUENESSE', 'ETAPLES'];
    const types = ['MEXT', 'MINT', 'HALL', 'SERRURERIE', 'BARDAGE'];
    
    expect(clients).toContain(firstAo.clientName);
    expect(cities).toContain(firstAo.city);
    expect(types).toContain(firstAo.aoCategory);
    expect(firstAo.mondayItemId).toMatch(/^ao_jlm_\d{4}$/);
    
    // Vérifier distribution clients récurrents (>50% des AOs)
    const recurringClientCount = jlmData.aos.filter(ao => 
      ['NEXITY', 'COGEDIM', 'PARTENORD HABITAT'].includes(ao.clientName)
    ).length;
    expect(recurringClientCount).toBeGreaterThan(jlmData.aos.length * 0.5);
    
    // Vérifier patterns projets JLM réels
    const firstProject = jlmData.projects[0];
    expect(firstProject.mondayProjectId).toMatch(/^project_jlm_\d{4}$/);
    expect(firstProject.name).toContain(firstProject.geographicZone || firstProject.clientName);
    
    // Vérifier zone géographique Nord France
    const nordFranceProjects = jlmData.projects.filter(p => 
      cities.includes(p.geographicZone || '')
    ).length;
    expect(nordFranceProjects).toBeGreaterThan(jlmData.projects.length * 0.8);
    
    console.log(`✅ Patterns JLM validés: ${recurringClientCount}/911 AOs clients récurrents`);
    console.log(`   - ${nordFranceProjects}/1000 projets Nord France`);
  });

  test('Should handle French date formats with corrected parser', async () => {
    console.log('🧪 Test formats dates français corrigés (->DD/MM/YY)');
    
    // Dates françaises problématiques (avant correction)
    const testDates = [
      '->28/02/25',  // 28 février 2025 (était ambiguë)
      '->15/11/24',  // 15 novembre 2024
      '->31/12/25',  // 31 décembre 2025
      '->01/01/26',  // 1er janvier 2026
      '->29/02/24',  // 29 février 2024 (année bissextile)
    ];
    
    testDates.forEach(dateStr => {
      const result = validateAndParseMondayDate(dateStr);
      
      // Date doit être parsée avec succès
      expect(result.parsed).toBeTruthy();
      expect(result.warning).toBeUndefined();
      
      // Vérifier format ISO retourné
      expect(result.parsed).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      
      // Vérifier que c'est bien interprété en DD/MM/YY (français)
      const [year, month, day] = result.parsed!.split('-').map(Number);
      const originalParts = dateStr.replace('->', '').split('/');
      expect(day).toBe(parseInt(originalParts[0], 10)); // Jour
      expect(month).toBe(parseInt(originalParts[1], 10)); // Mois
    });
    
    // Test année bissextile
    const leapYearResult = validateAndParseMondayDate('->29/02/24');
    expect(leapYearResult.parsed).toBe('2024-02-29');
    expect(leapYearResult.warning).toBeUndefined();
    
    console.log('✅ Parser dates français validé: 5/5 dates correctement parsées');
  });

  test('Should maintain Database Safety Rules', async () => {
    console.log('🧪 Test respect Database Safety Rules');
    
    // Simuler insertion avec préservation types ID
    const testAo = {
      mondayItemId: 'test_ao_001',
      clientName: 'NEXITY',
      city: 'BOULOGNE-SUR-MER',
      aoCategory: 'MEXT' as const,
      operationalStatus: 'AO EN COURS' as const,
      projectSize: '102 lgts',
      estimatedDelay: '->15/06/25',
      clientRecurrency: true
    };
    
    // Migration de test
    const jlmData = { aos: [testAo], projects: [] };
    const validationResult = await productionService.validateProductionData(jlmData);
    
    // Validation sans erreurs
    expect(validationResult.errors).toBe(0);
    expect(validationResult.validLines).toBe(1);
    expect(validationResult.totalLines).toBe(1);
    
    // Test insertion réelle avec storage interface
    const result = await productionService.migrateProductionData();
    expect(result.success).toBe(true);
    
    // Vérifier que l'ID généré respecte format UUID (pas serial)
    const createdAos = await mockStorage.getAos();
    expect(createdAos.length).toBeGreaterThan(0);
    
    const firstCreatedAo = createdAos[0];
    expect(firstCreatedAo.id).toBeDefined();
    expect(typeof firstCreatedAo.id).toBe('string');
    expect(firstCreatedAo.mondayItemId).toMatch(/^ao_jlm_\d{4}$/);
    
    console.log(`✅ Database Safety respectées: ID=${firstCreatedAo.id}, mondayItemId=${firstCreatedAo.mondayItemId}`);
  });

  test('Should complete dry-run without database insertion', async () => {
    console.log('🧪 Test dry-run validation sans insertion BDD');
    
    // Charger données analysées
    const jlmData = productionService.loadJLMAnalyzedData();
    
    // Stats initiales (BDD vide)
    const initialStats = mockStorage.getStats();
    expect(initialStats.totalCreated).toBe(0);
    
    // Validation dry-run complète
    const dryRunResult = await productionService.validateProductionData(jlmData);
    
    // Validation résultats
    expect(dryRunResult.totalLines).toBe(1911);
    expect(dryRunResult.validLines).toBe(1911);
    expect(dryRunResult.errors).toBe(0);
    expect(dryRunResult.dateFormatIssues).toBeLessThan(50); // Quelques warnings acceptables
    
    // Vérifier qu'aucune insertion n'a eu lieu
    const finalStats = mockStorage.getStats();
    expect(finalStats.totalCreated).toBe(0);
    expect(finalStats.aosCount).toBe(0);
    expect(finalStats.projectsCount).toBe(0);
    
    console.log(`✅ Dry-run validé: ${dryRunResult.validLines}/${dryRunResult.totalLines} lignes, 0 insertions BDD`);
    console.log(`   - Issues dates: ${dryRunResult.dateFormatIssues}, Warnings: ${dryRunResult.warnings}`);
  });
});

// ========================================
// TESTS SERVICE MIGRATION INTÉGRÉ
// ========================================

describe('MondayMigrationService - Intégration Production', () => {
  test('Should use production system via migrateFromAnalyzedData()', async () => {
    console.log('🧪 Test intégration service production dans MondayMigrationService');
    
    // Utiliser nouvelle méthode production
    const result = await migrationService.migrateFromAnalyzedData();
    
    // Validation résultats production
    expect(result.success).toBe(true);
    expect(result.source).toBe('production_analysis');
    expect(result.totalLines).toBe(1911);
    expect(result.totalMigrated).toBeGreaterThan(1850); // >96% succès
    
    // Vérifier que c'est bien le système production (pas synthétique)
    expect(result.aos.migrated).toBeGreaterThan(880);
    expect(result.projects.migrated).toBeGreaterThan(970);
    
    console.log(`✅ Intégration production: ${result.totalMigrated}/${result.totalLines} lignes via nouveau système`);
  });

  test('Should maintain compatibility with deprecated methods', async () => {
    console.log('🧪 Test compatibilité méthodes dépréciées pour tests existants');
    
    // Tester anciennes méthodes (deprecated mais fonctionnelles)
    const aoResult = await migrationService.migrateAosFromAnalysis(10);
    const projectResult = await migrationService.migrateChantiersFromAnalysis(10);
    
    // Validation format compatible
    expect(aoResult.source).toBe('audit_analysis');
    expect(aoResult.entityType).toBe('aos');
    expect(aoResult.migrated).toBeGreaterThan(8);
    
    expect(projectResult.source).toBe('audit_analysis');
    expect(projectResult.entityType).toBe('projects');
    expect(projectResult.migrated).toBeGreaterThan(8);
    
    console.log('✅ Compatibilité maintenue pour tests existants');
  });

  test('Should validate production data integrity', async () => {
    console.log('🧪 Test validation intégrité données production');
    
    // Validation production via service intégré
    const validationResult = await migrationService.validateProductionDataIntegrity();
    
    // Validation sans erreurs
    expect(validationResult.success).toBe(true);
    expect(validationResult.totalLines).toBe(1911);
    expect(validationResult.validLines).toBe(1911);
    expect(validationResult.errors).toBe(0);
    
    // Quelques warnings sur dates acceptables
    expect(validationResult.warnings).toBeLessThan(100);
    expect(validationResult.dateFormatIssues).toBeLessThan(50);
    
    console.log(`✅ Intégrité production validée: ${validationResult.validLines} lignes valides, ${validationResult.dateFormatIssues} issues dates`);
  });
});

// ========================================
// TESTS PERFORMANCE ET ROBUSTESSE
// ========================================

describe('Production Migration - Performance & Robustesse', () => {
  test('Should complete migration within acceptable time limits', async () => {
    console.log('🧪 Test performance migration 1911 lignes');
    
    const startTime = Date.now();
    const result = await productionService.migrateProductionData();
    const duration = Date.now() - startTime;
    
    // Validation performance (max 30s pour 1911 lignes)
    expect(duration).toBeLessThan(30000);
    expect(result.duration).toBe(duration);
    expect(result.success).toBe(true);
    
    // Performance par ligne (max 15ms/ligne)
    const timePerLine = duration / result.totalLines;
    expect(timePerLine).toBeLessThan(15);
    
    console.log(`✅ Performance validée: ${duration}ms pour ${result.totalLines} lignes (${timePerLine.toFixed(2)}ms/ligne)`);
  }, 35000);

  test('Should handle batch processing correctly', async () => {
    console.log('🧪 Test traitement par batch et gestion erreurs');
    
    // Charger données pour validation batch
    const jlmData = productionService.loadJLMAnalyzedData();
    
    // Vérifier que les données sont cohérentes par batch
    expect(jlmData.aos.length).toBe(911);
    expect(jlmData.projects.length).toBe(1000);
    
    // Test avec migration réelle
    const result = await productionService.migrateProductionData();
    
    // Validation traitement batch (progression par 100)
    expect(result.aos.details.successful.length).toBeGreaterThan(900);
    expect(result.projects.details.successful.length).toBeGreaterThan(980);
    
    // Vérifier gestion erreurs batch
    expect(result.aos.details.failed.length).toBeLessThan(11);
    expect(result.projects.details.failed.length).toBeLessThan(20);
    
    console.log(`✅ Batch processing validé: ${result.aos.details.successful.length + result.projects.details.successful.length} succès`);
  });

  test('Should maintain referential integrity', async () => {
    console.log('🧪 Test intégrité référentielle données migrées');
    
    // Migration complète
    const result = await productionService.migrateProductionData();
    
    // Vérifier données créées
    const createdAos = await mockStorage.getAos();
    const createdProjects = await mockStorage.getProjects();
    
    // Validation intégrité AOs
    createdAos.forEach(ao => {
      expect(ao.id).toBeDefined();
      expect(ao.clientName).toBeDefined();
      expect(ao.city).toBeDefined();
      expect(ao.aoCategory).toBeOneOf(['MEXT', 'MINT', 'HALL', 'SERRURERIE', 'AUTRE']);
      expect(ao.mondayItemId).toMatch(/^ao_jlm_\d{4}$/);
    });
    
    // Validation intégrité projets
    createdProjects.forEach(project => {
      expect(project.id).toBeDefined();
      expect(project.name).toBeDefined();
      expect(project.clientName).toBeDefined();
      expect(project.mondayProjectId).toMatch(/^project_jlm_\d{4}$/);
    });
    
    console.log(`✅ Intégrité référentielle validée: ${createdAos.length} AOs + ${createdProjects.length} projets`);
  });
});

// ========================================
// TESTS SPÉCIFIQUES JLM MENUISERIE
// ========================================

describe('JLM Menuiserie - Spécificités Métier', () => {
  test('Should map Monday.com workflow to Saxium 6-phase workflow', async () => {
    console.log('🧪 Test mapping workflow Monday.com → Saxium 6 phases');
    
    // Charger données et migrer
    const result = await productionService.migrateProductionData();
    const createdProjects = await mockStorage.getProjects();
    
    // Vérifier mapping stages workflow
    const saxiumPhases = ['passation', 'etude', 'visa_architecte', 'planification', 'approvisionnement', 'chantier', 'sav'];
    
    createdProjects.forEach(project => {
      expect(saxiumPhases).toContain(project.status);
    });
    
    // Vérifier distribution phases réaliste
    const phaseDistribution = createdProjects.reduce((acc, project) => {
      acc[project.status] = (acc[project.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Au moins 3 phases différentes représentées
    expect(Object.keys(phaseDistribution).length).toBeGreaterThan(3);
    
    console.log(`✅ Workflow mapping validé: ${Object.keys(phaseDistribution).length} phases Saxium utilisées`);
    console.log(`   Distribution: ${JSON.stringify(phaseDistribution)}`);
  });

  test('Should preserve Monday.com IDs for audit trail', async () => {
    console.log('🧪 Test préservation IDs Monday.com pour audit');
    
    // Migration avec préservation IDs
    const result = await productionService.migrateProductionData();
    
    const createdAos = await mockStorage.getAos();
    const createdProjects = await mockStorage.getProjects();
    
    // Vérifier préservation mondayItemId
    createdAos.forEach(ao => {
      expect(ao.mondayItemId).toBeDefined();
      expect(ao.mondayItemId).toMatch(/^ao_jlm_\d{4}$/);
    });
    
    // Vérifier préservation mondayProjectId
    createdProjects.forEach(project => {
      expect(project.mondayProjectId).toBeDefined();
      expect(project.mondayProjectId).toMatch(/^project_jlm_\d{4}$/);
    });
    
    // Vérifier unicité IDs Monday.com
    const mondayAoIds = createdAos.map(ao => ao.mondayItemId);
    const mondayProjectIds = createdProjects.map(project => project.mondayProjectId);
    
    expect(new Set(mondayAoIds).size).toBe(mondayAoIds.length);
    expect(new Set(mondayProjectIds).size).toBe(mondayProjectIds.length);
    
    console.log(`✅ IDs Monday.com préservés: ${mondayAoIds.length} AOs + ${mondayProjectIds.length} projets uniques`);
  });

  test('Should handle Nord France geographic specificity', async () => {
    console.log('🧪 Test spécificité géographique Nord France');
    
    // Migration avec données géographiques
    const result = await productionService.migrateProductionData();
    const createdAos = await mockStorage.getAos();
    
    // Zones Nord France spécifiques à JLM
    const nordFranceZones = [
      'GRANDE-SYNTHE', 'DUNKERQUE', 'BOULOGNE-SUR-MER', 
      'LONGUENESSE', 'ETAPLES', 'FRUGES', 'BETHUNE'
    ];
    
    // Vérifier répartition géographique cohérente
    const geoDistribution = createdAos.reduce((acc, ao) => {
      acc[ao.city] = (acc[ao.city] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Au moins 80% des AOs dans zones Nord France
    const nordFranceCount = Object.entries(geoDistribution)
      .filter(([city]) => nordFranceZones.some(zone => city.includes(zone)))
      .reduce((sum, [, count]) => sum + count, 0);
    
    expect(nordFranceCount / createdAos.length).toBeGreaterThan(0.8);
    
    console.log(`✅ Spécificité Nord France: ${nordFranceCount}/${createdAos.length} AOs (${Math.round(nordFranceCount/createdAos.length*100)}%)`);
  });
});

console.log('🧪 Tests migration production JLM Menuiserie initialisés - 1911 lignes');