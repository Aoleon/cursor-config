#!/usr/bin/env tsx
/**
 * Script de migration Phase 2: Critique
 * 
 * Objectifs:
 * 1. Migrer routes restantes de routes-poc.ts vers modules
 * 2. Migrer méthodes restantes de storage-poc.ts vers repositories
 * 3. Réduire types any progressivement
 * 
 * Usage: npm run migrate:phase2-critical
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { logger } from '../server/utils/logger';

const ROUTES_POC_PATH = join(process.cwd(), 'server/routes-poc.ts');
const STORAGE_POC_PATH = join(process.cwd(), 'server/storage-poc.ts');

interface MigrationPlan {
  routes: {
    file: string;
    routes: Array<{
      path: string;
      method: string;
      description: string;
      targetModule: string;
    }>;
  };
  storage: {
    file: string;
    methods: Array<{
      name: string;
      signature: string;
      targetRepository: string;
      difficulty: 'low' | 'medium' | 'high';
    }>;
  };
  types: {
    file: string;
    occurrences: Array<{
      line: number;
      content: string;
      suggestedType: string;
    }>;
  };
}

/**
 * Analyse routes-poc.ts pour identifier routes restantes
 */
function analyzeRoutesPoc(content: string): MigrationPlan['routes'] {
  const routes: MigrationPlan['routes']['routes'] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Identifier routes app.get/post/put/patch/delete
    const routeMatch = line.match(/app\.(get|post|put|patch|delete)\(['"]([^'"]+)['"]/);
    if (routeMatch) {
      const method = routeMatch[1].toUpperCase();
      const path = routeMatch[2];
      
      // Déterminer module cible
      let targetModule = 'monday';
      if (path.includes('/monday/')) {
        targetModule = 'monday';
      } else if (path.includes('/supplier-workflow/')) {
        targetModule = 'suppliers';
      } else if (path.includes('/ao-lots/')) {
        targetModule = 'commercial';
      }
      
      // Extraire description (commentaire ou ligne suivante)
      let description = '';
      if (i > 0 && lines[i - 1].trim().startsWith('//')) {
        description = lines[i - 1].trim().replace(/^\/\/\s*/, '');
      } else if (i > 0 && lines[i - 1].trim().startsWith('/**')) {
        // Extraire commentaire JSDoc
        let j = i - 1;
        while (j >= 0 && lines[j].trim().startsWith('*')) {
          description = lines[j].trim().replace(/^\*\s*/, '') + ' ' + description;
          j--;
        }
      }
      
      routes.push({
        path,
        method,
        description: description || `${method} ${path}`,
        targetModule
      });
    }
  }

  return {
    file: ROUTES_POC_PATH,
    routes
  };
}

/**
 * Analyse storage-poc.ts pour identifier méthodes restantes
 */
function analyzeStoragePoc(content: string): MigrationPlan['storage'] {
  const methods: MigrationPlan['storage']['methods'] = [];
  const lines = content.split('\n');

  // Identifier méthodes async dans l'interface IStorage
  let inIStorage = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.includes('export interface IStorage')) {
      inIStorage = true;
      continue;
    }
    
    if (inIStorage && line.includes('}')) {
      inIStorage = false;
      continue;
    }
    
    if (inIStorage) {
      // Identifier méthodes async
      const methodMatch = line.match(/(\w+)\([^)]*\):\s*Promise<[^>]+>/);
      if (methodMatch) {
        const methodName = methodMatch[1];
        
        // Déterminer repository cible
        let targetRepository = 'StorageFacade';
        let difficulty: 'low' | 'medium' | 'high' = 'medium';
        
        if (methodName.includes('User') || methodName.includes('user')) {
          targetRepository = 'UserRepository';
          difficulty = 'low';
        } else if (methodName.includes('Offer') || methodName.includes('offer')) {
          targetRepository = 'OfferRepository';
          difficulty = 'low';
        } else if (methodName.includes('Ao') || methodName.includes('ao')) {
          targetRepository = 'AoRepository';
          difficulty = 'low';
        } else if (methodName.includes('Project') || methodName.includes('project')) {
          targetRepository = 'ProductionRepository';
          difficulty = 'medium';
        } else if (methodName.includes('Supplier') || methodName.includes('supplier')) {
          targetRepository = 'SuppliersRepository';
          difficulty = 'medium';
        } else if (methodName.includes('Chiffrage') || methodName.includes('chiffrage')) {
          targetRepository = 'ChiffrageRepository';
          difficulty = 'low';
        } else if (methodName.includes('Date') || methodName.includes('date')) {
          targetRepository = 'DateIntelligenceRepository';
          difficulty = 'medium';
        } else if (methodName.includes('Document') || methodName.includes('document')) {
          targetRepository = 'DocumentsRepository';
          difficulty = 'low';
        } else if (methodName.includes('Contact') || methodName.includes('contact')) {
          targetRepository = 'ContactsRepository';
          difficulty = 'medium';
        } else if (methodName.includes('Sav') || methodName.includes('sav')) {
          targetRepository = 'SavRepository';
          difficulty = 'low';
        }
        
        methods.push({
          name: methodName,
          signature: line.trim(),
          targetRepository,
          difficulty
        });
      }
    }
  }

  return {
    file: STORAGE_POC_PATH,
    methods
  };
}

/**
 * Analyse types any dans les fichiers
 */
function analyzeTypesAny(content: string, filePath: string): MigrationPlan['types'] {
  const occurrences: MigrationPlan['types']['occurrences'] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Identifier types any
    const anyMatch = line.match(/: any\b/);
    if (anyMatch) {
      // Suggérer type approprié
      let suggestedType = 'unknown';
      
      if (line.includes('Promise<')) {
        suggestedType = 'Promise<unknown>';
      } else if (line.includes('Record<')) {
        suggestedType = 'Record<string, unknown>';
      } else if (line.includes('Array<')) {
        suggestedType = 'Array<unknown>';
      } else if (line.includes('event') || line.includes('Event')) {
        suggestedType = 'Event';
      } else if (line.includes('error') || line.includes('Error')) {
        suggestedType = 'Error';
      } else if (line.includes('data') || line.includes('Data')) {
        suggestedType = 'unknown';
      } else if (line.includes('result') || line.includes('Result')) {
        suggestedType = 'unknown';
      }
      
      occurrences.push({
        line: i + 1,
        content: line.trim(),
        suggestedType
      });
    }
  }

  return {
    file: filePath,
    occurrences
  };
}

/**
 * Génère plan de migration
 */
function generateMigrationPlan(): MigrationPlan {
  logger.info('📊 Analyse routes-poc.ts...');
  const routesPocContent = readFileSync(ROUTES_POC_PATH, 'utf-8');
  const routes = analyzeRoutesPoc(routesPocContent);
  
  logger.info('📊 Analyse storage-poc.ts...');
  const storagePocContent = readFileSync(STORAGE_POC_PATH, 'utf-8');
  const storage = analyzeStoragePoc(storagePocContent);
  
  logger.info('📊 Analyse types any...');
  const routesTypes = analyzeTypesAny(routesPocContent, ROUTES_POC_PATH);
  const storageTypes = analyzeTypesAny(storagePocContent, STORAGE_POC_PATH);
  
  return {
    routes,
    storage,
    types: {
      file: 'multiple',
      occurrences: [...routesTypes.occurrences, ...storageTypes.occurrences]
    }
  };
}

/**
 * Main
 */
function main() {
  logger.info('🚀 Démarrage migration Phase 2: Critique...');
  
  const plan = generateMigrationPlan();
  
  // Rapport
  logger.info('\n📊 PLAN DE MIGRATION PHASE 2: CRITIQUE');
  logger.info('='.repeat(60));
  
  logger.info(`\n📁 Routes restantes dans routes-poc.ts: ${plan.routes.routes.length}`);
  for (const route of plan.routes.routes) {
    logger.info(`  ${route.method} ${route.path}`);
    logger.info(`    → Module cible: ${route.targetModule}`);
    logger.info(`    Description: ${route.description}`);
  }
  
  logger.info(`\n📁 Méthodes restantes dans storage-poc.ts: ${plan.storage.methods.length}`);
  const byRepository = new Map<string, number>();
  for (const method of plan.storage.methods) {
    const count = byRepository.get(method.targetRepository) || 0;
    byRepository.set(method.targetRepository, count + 1);
  }
  
  for (const [repo, count] of byRepository.entries()) {
    logger.info(`  ${repo}: ${count} méthodes`);
  }
  
  logger.info(`\n📁 Types any restants: ${plan.types.occurrences.length}`);
  logger.info(`  routes-poc.ts: ${plan.types.occurrences.filter(o => o.file === ROUTES_POC_PATH).length}`);
  logger.info(`  storage-poc.ts: ${plan.types.occurrences.filter(o => o.file === STORAGE_POC_PATH).length}`);
  
  // Priorités
  logger.info('\n🎯 PRIORITÉS:');
  logger.info('  1. Migrer routes Monday.com vers module monday');
  logger.info('  2. Migrer méthodes storage vers repositories (priorité: low difficulty)');
  logger.info('  3. Réduire types any progressivement');
  
  logger.info('\n✅ Analyse terminée!');
  logger.info('💡 Consultez le plan de migration pour actions manuelles');
}

// Exécuter si appelé directement
main();

export { generateMigrationPlan, analyzeRoutesPoc, analyzeStoragePoc, analyzeTypesAny };

