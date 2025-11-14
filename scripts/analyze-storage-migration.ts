/**
 * Script d'Analyse Migration storage-poc.ts → Repositories
 * 
 * Analyse les méthodes de storage-poc.ts et identifie celles qui peuvent être migrées
 * vers les repositories existants.
 * 
 * Usage: npm run analyze:storage-migration
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { logger } from '../server/utils/logger';

interface MethodInfo {
  name: string;
  signature: string;
  lines: number;
  repository?: string;
  migrated: boolean;
  canMigrate: boolean;
}

interface MigrationAnalysis {
  totalMethods: number;
  migratedMethods: number;
  migratableMethods: number;
  methods: MethodInfo[];
  recommendations: string[];
}

/**
 * Analyse les méthodes de storage-poc.ts
 */
function analyzeStorageMethods(): MigrationAnalysis {
  const storagePocPath = join(process.cwd(), 'server', 'storage-poc.ts');
  const content = readFileSync(storagePocPath, 'utf-8');
  
  const methods: MethodInfo[] = [];
  const recommendations: string[] = [];
  
  // Pattern pour détecter les méthodes async
  const methodPattern = /async\s+(\w+)\s*\([^)]*\)\s*:\s*Promise<[^>]+>/g;
  
  // Mapping des méthodes vers leurs repositories
  const repositoryMapping: Record<string, string> = {
    // User operations
    'getUsers': 'UserRepository',
    'getUser': 'UserRepository',
    'getUserByEmail': 'UserRepository',
    'getUserByUsername': 'UserRepository',
    'getUserByMicrosoftId': 'UserRepository',
    'createUser': 'UserRepository',
    'upsertUser': 'UserRepository',
    
    // Offer operations
    'getOffers': 'OfferRepository',
    'getOffersPaginated': 'OfferRepository',
    'getOffer': 'OfferRepository',
    'getOfferById': 'OfferRepository',
    'createOffer': 'OfferRepository',
    'updateOffer': 'OfferRepository',
    'deleteOffer': 'OfferRepository',
    
    // AO operations
    'getAos': 'AoRepository',
    'getAOsPaginated': 'AoRepository',
    'getAo': 'AoRepository',
    'getAOByMondayItemId': 'AoRepository',
    'createAo': 'AoRepository',
    'updateAo': 'AoRepository',
    'deleteAo': 'AoRepository',
    
    // Project operations
    'getProjects': 'ProductionRepository',
    'getProjectsPaginated': 'ProductionRepository',
    'getProject': 'ProductionRepository',
    'getProjectByMondayItemId': 'ProductionRepository',
    'createProject': 'ProductionRepository',
    'updateProject': 'ProductionRepository',
    
    // Supplier operations
    'getSuppliers': 'SuppliersRepository',
    'getSupplier': 'SuppliersRepository',
    'getSupplierByMondayItemId': 'SuppliersRepository',
    'createSupplier': 'SuppliersRepository',
    'updateSupplier': 'SuppliersRepository',
    'deleteSupplier': 'SuppliersRepository',
    
    // Chiffrage operations
    'getChiffrageElementsByOffer': 'ChiffrageRepository',
    'getChiffrageElementsByLot': 'ChiffrageRepository',
    'createChiffrageElement': 'ChiffrageRepository',
    'updateChiffrageElement': 'ChiffrageRepository',
    'deleteChiffrageElement': 'ChiffrageRepository',
    
    // Date Intelligence operations
    'getDateIntelligenceRules': 'DateIntelligenceRepository',
    'createDateIntelligenceRule': 'DateIntelligenceRepository',
    'getDateAlerts': 'DateIntelligenceRepository',
    'createDateAlert': 'DateIntelligenceRepository',
    
    // Documents operations
    'getDocumentsByEntity': 'DocumentsRepository',
    'updateDocument': 'DocumentsRepository',
    'deleteDocument': 'DocumentsRepository',
    
    // Contacts operations
    'getMaitresOuvrage': 'ContactsRepository',
    'getMaitreOuvrage': 'ContactsRepository',
    'findOrCreateMaitreOuvrage': 'ContactsRepository',
    'findOrCreateContact': 'ContactsRepository',
  };
  
  let match;
  while ((match = methodPattern.exec(content)) !== null) {
    const methodName = match[1];
    const repository = repositoryMapping[methodName];
    
    // Calculer approximativement le nombre de lignes de la méthode
    const methodStart = match.index;
    const nextMethodMatch = methodPattern.exec(content);
    const methodEnd = nextMethodMatch ? nextMethodMatch.index : content.length;
    methodPattern.lastIndex = methodStart; // Reset pour la prochaine itération
    
    const methodContent = content.substring(methodStart, methodEnd);
    const lines = methodContent.split('\n').length;
    
    methods.push({
      name: methodName,
      signature: match[0],
      lines,
      repository,
      migrated: false, // À déterminer en analysant StorageFacade
      canMigrate: !!repository
    });
  }
  
  // Analyser StorageFacade pour déterminer les méthodes déjà migrées
  const facadePath = join(process.cwd(), 'server', 'storage', 'facade', 'StorageFacade.ts');
  try {
    const facadeContent = readFileSync(facadePath, 'utf-8');
    
    methods.forEach(method => {
      // Vérifier si la méthode utilise le repository dans StorageFacade
      if (method.repository) {
        const repositoryPattern = new RegExp(`${method.repository}\\.\\w+`, 'g');
        const methodPattern = new RegExp(`async\\s+${method.name}\\s*\\(`, 'g');
        
        if (methodPattern.test(facadeContent) && repositoryPattern.test(facadeContent)) {
          method.migrated = true;
        }
      }
    });
  } catch (error) {
    logger.warn('Impossible de lire StorageFacade.ts', { error });
  }
  
  // Générer des recommandations
  const migratableMethods = methods.filter(m => m.canMigrate && !m.migrated);
  const migratedCount = methods.filter(m => m.migrated).length;
  
  if (migratableMethods.length > 0) {
    recommendations.push(`✅ ${migratableMethods.length} méthodes peuvent être migrées vers les repositories`);
    
    // Grouper par repository
    const byRepository = migratableMethods.reduce((acc, method) => {
      const repo = method.repository || 'Unknown';
      if (!acc[repo]) acc[repo] = [];
      acc[repo].push(method.name);
      return acc;
    }, {} as Record<string, string[]>);
    
    Object.entries(byRepository).forEach(([repo, methodNames]) => {
      recommendations.push(`  - ${repo}: ${methodNames.length} méthodes (${methodNames.slice(0, 5).join(', ')}${methodNames.length > 5 ? '...' : ''})`);
    });
  }
  
  const totalLines = methods.reduce((sum, m) => sum + m.lines, 0);
  recommendations.push(`📊 Total lignes de méthodes: ${totalLines}`);
  recommendations.push(`✅ Méthodes déjà migrées: ${migratedCount}/${methods.length}`);
  recommendations.push(`⏳ Méthodes à migrer: ${migratableMethods.length}/${methods.length}`);
  
  return {
    totalMethods: methods.length,
    migratedMethods: migratedCount,
    migratableMethods: migratableMethods.length,
    methods,
    recommendations
  };
}

/**
 * Génère un rapport d'analyse
 */
function generateReport(analysis: MigrationAnalysis): void {
  const reportPath = join(process.cwd(), 'docs', 'STORAGE_MIGRATION_ANALYSIS.md');
  
  let report = `# Analyse Migration storage-poc.ts → Repositories\n\n`;
  report += `**Date:** ${new Date().toISOString().split('T')[0]}\n`;
  report += `**Statut:** Analyse automatique\n\n`;
  report += `---\n\n`;
  
  report += `## 📊 Résumé\n\n`;
  report += `- **Total méthodes:** ${analysis.totalMethods}\n`;
  report += `- **Méthodes migrées:** ${analysis.migratedMethods} (${Math.round(analysis.migratedMethods / analysis.totalMethods * 100)}%)\n`;
  report += `- **Méthodes migrables:** ${analysis.migratableMethods} (${Math.round(analysis.migratableMethods / analysis.totalMethods * 100)}%)\n`;
  report += `- **Méthodes restantes:** ${analysis.totalMethods - analysis.migratedMethods - analysis.migratableMethods}\n\n`;
  
  report += `## 🎯 Recommandations\n\n`;
  analysis.recommendations.forEach(rec => {
    report += `${rec}\n`;
  });
  
  report += `\n## 📋 Méthodes Détailées\n\n`;
  report += `| Méthode | Repository | Migrée | Lignes |\n`;
  report += `|---------|------------|--------|--------|\n`;
  
  analysis.methods.forEach(method => {
    const migrated = method.migrated ? '✅' : '⏳';
    const repo = method.repository || '-';
    report += `| ${method.name} | ${repo} | ${migrated} | ${method.lines} |\n`;
  });
  
  writeFileSync(reportPath, report, 'utf-8');
  logger.info('Rapport d\'analyse généré', { path: reportPath });
}

// Exécution
if (require.main === module) {
  logger.info('Démarrage analyse migration storage-poc.ts');
  const analysis = analyzeStorageMethods();
  generateReport(analysis);
  logger.info('Analyse terminée', {
    totalMethods: analysis.totalMethods,
    migratedMethods: analysis.migratedMethods,
    migratableMethods: analysis.migratableMethods
  });
}

export { analyzeStorageMethods, generateReport };

