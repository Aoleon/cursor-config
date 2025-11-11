#!/usr/bin/env tsx
/**
 * Script de diagnostic pour vérifier la configuration du projet
 * Vérifie les prérequis pour npm run check et le lancement du serveur
 */

import { existsSync, readFileSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';

interface DiagnosticResult {
  check: string;
  status: 'ok' | 'warning' | 'error';
  message: string;
  fix?: string;
}

const results: DiagnosticResult[] = [];

// Couleurs pour la console
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function checkFile(filePath: string, description: string, required: boolean = true): DiagnosticResult {
  const exists = existsSync(filePath);
  if (!exists && required) {
    return {
      check: description,
      status: 'error',
      message: `Fichier manquant: ${filePath}`,
      fix: required ? `Créer le fichier ${filePath}` : undefined,
    };
  }
  if (!exists && !required) {
    return {
      check: description,
      status: 'warning',
      message: `Fichier optionnel manquant: ${filePath}`,
    };
  }
  return {
    check: description,
    status: 'ok',
    message: `Fichier présent: ${filePath}`,
  };
}

function checkEnvVar(envVar: string, description: string, required: boolean = true): DiagnosticResult {
  const value = process.env[envVar];
  if (!value && required) {
    return {
      check: description,
      status: 'error',
      message: `Variable d'environnement manquante: ${envVar}`,
      fix: `Définir ${envVar} dans .env.local`,
    };
  }
  if (!value && !required) {
    return {
      check: description,
      status: 'warning',
      message: `Variable d'environnement optionnelle manquante: ${envVar}`,
    };
  }
  // Masquer les valeurs sensibles
  const displayValue = envVar.includes('SECRET') || envVar.includes('PASSWORD') 
    ? '***' 
    : value;
  return {
    check: description,
    status: 'ok',
    message: `${envVar}=${displayValue}`,
  };
}

function checkTypeScript(): DiagnosticResult {
  try {
    log('\n🔍 Vérification TypeScript...', colors.cyan);
    const output = execSync('npm run check 2>&1', { 
      encoding: 'utf-8',
      stdio: 'pipe',
      timeout: 30000,
    });
    
    // Compter les erreurs
    const errorMatches = output.match(/error TS\d+/g);
    const errorCount = errorMatches ? errorMatches.length : 0;
    
    if (errorCount === 0) {
      return {
        check: 'TypeScript Compilation',
        status: 'ok',
        message: 'Aucune erreur TypeScript détectée',
      };
    }
    
    // Extraire les premières erreurs
    const firstErrors = output
      .split('\n')
      .filter(line => line.includes('error TS'))
      .slice(0, 5)
      .join('\n');
    
    return {
      check: 'TypeScript Compilation',
      status: 'error',
      message: `${errorCount} erreur(s) TypeScript détectée(s)`,
      fix: `Corriger les erreurs TypeScript. Premières erreurs:\n${firstErrors}`,
    };
  } catch (error: any) {
    const output = error.stdout || error.stderr || error.message || '';
    const errorMatches = output.match(/error TS\d+/g);
    const errorCount = errorMatches ? errorMatches.length : 0;
    
    return {
      check: 'TypeScript Compilation',
      status: 'error',
      message: `Erreur lors de la compilation TypeScript: ${errorCount} erreur(s)`,
      fix: 'Vérifier les erreurs TypeScript avec: npm run check',
    };
  }
}

function checkImports(): DiagnosticResult {
  try {
    const indexContent = readFileSync('server/index.ts', 'utf-8');
    
    // Vérifier que AppError est importé
    if (indexContent.includes('new AppError') && !indexContent.includes('import') || 
        (indexContent.includes('new AppError') && !indexContent.includes('AppError'))) {
      const hasAppErrorImport = indexContent.match(/import.*AppError.*from/);
      if (!hasAppErrorImport) {
        return {
          check: 'Imports manquants',
          status: 'error',
          message: 'AppError utilisé mais non importé dans server/index.ts',
          fix: "Ajouter 'AppError' à l'import depuis './utils/error-handler'",
        };
      }
    }
    
    return {
      check: 'Imports manquants',
      status: 'ok',
      message: 'Aucun import manquant détecté dans server/index.ts',
    };
  } catch (error) {
    return {
      check: 'Imports manquants',
      status: 'warning',
      message: 'Impossible de vérifier les imports',
    };
  }
}

function checkDatabaseConnection(): DiagnosticResult {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return {
      check: 'Connexion Base de Données',
      status: 'error',
      message: 'DATABASE_URL non définie',
      fix: 'Définir DATABASE_URL dans .env.local',
    };
  }
  
  // Vérifier le format de l'URL
  if (!databaseUrl.startsWith('postgresql://') && !databaseUrl.startsWith('postgres://')) {
    return {
      check: 'Connexion Base de Données',
      status: 'error',
      message: 'Format DATABASE_URL invalide',
      fix: 'DATABASE_URL doit commencer par postgresql:// ou postgres://',
    };
  }
  
  return {
    check: 'Connexion Base de Données',
    status: 'ok',
    message: 'DATABASE_URL configurée (connexion non testée)',
  };
}

function checkDockerServices(): DiagnosticResult {
  try {
    const output = execSync('docker compose ps 2>&1', { 
      encoding: 'utf-8',
      stdio: 'pipe',
      timeout: 5000,
    });
    
    if (output.includes('Up') || output.includes('running')) {
      return {
        check: 'Services Docker',
        status: 'ok',
        message: 'Services Docker détectés',
      };
    }
    
    return {
      check: 'Services Docker',
      status: 'warning',
      message: 'Aucun service Docker en cours d\'exécution',
      fix: 'Démarrer les services avec: docker compose up -d',
    };
  } catch (error) {
    return {
      check: 'Services Docker',
      status: 'warning',
      message: 'Docker Compose non disponible ou services non démarrés',
      fix: 'Installer Docker Compose ou démarrer les services',
    };
  }
}

async function main() {
  log('🔍 Diagnostic du projet Saxium', colors.blue);
  log('=' .repeat(60), colors.blue);
  
  // Charger les variables d'environnement depuis .env.local si disponible
  if (existsSync('.env.local')) {
    try {
      const envContent = readFileSync('.env.local', 'utf-8');
      envContent.split('\n').forEach(line => {
        const match = line.match(/^([^#=]+)=(.*)$/);
        if (match) {
          const [, key, value] = match;
          process.env[key.trim()] = value.trim();
        }
      });
    } catch (error) {
      log('⚠️  Impossible de charger .env.local', colors.yellow);
    }
  }
  
  // 1. Vérifier les fichiers essentiels
  log('\n📁 Vérification des fichiers...', colors.cyan);
  results.push(checkFile('package.json', 'package.json'));
  results.push(checkFile('tsconfig.json', 'tsconfig.json'));
  results.push(checkFile('.env.local', '.env.local', false));
  results.push(checkFile('env.local.example', 'env.local.example'));
  results.push(checkFile('server/index.ts', 'server/index.ts'));
  results.push(checkFile('server/utils/error-handler.ts', 'server/utils/error-handler.ts'));
  
  // 2. Vérifier les variables d'environnement
  log('\n🔐 Vérification des variables d\'environnement...', colors.cyan);
  results.push(checkEnvVar('DATABASE_URL', 'DATABASE_URL', false));
  results.push(checkEnvVar('PORT', 'PORT', false));
  results.push(checkEnvVar('NODE_ENV', 'NODE_ENV', false));
  
  // 3. Vérifier les imports
  log('\n📦 Vérification des imports...', colors.cyan);
  results.push(checkImports());
  
  // 4. Vérifier TypeScript
  results.push(checkTypeScript());
  
  // 5. Vérifier la base de données
  log('\n🗄️  Vérification de la base de données...', colors.cyan);
  results.push(checkDatabaseConnection());
  
  // 6. Vérifier Docker (optionnel)
  log('\n🐳 Vérification Docker...', colors.cyan);
  results.push(checkDockerServices());
  
  // Afficher les résultats
  log('\n' + '='.repeat(60), colors.blue);
  log('📊 RÉSULTATS DU DIAGNOSTIC', colors.blue);
  log('='.repeat(60), colors.blue);
  
  const errors = results.filter(r => r.status === 'error');
  const warnings = results.filter(r => r.status === 'warning');
  const ok = results.filter(r => r.status === 'ok');
  
  log(`\n✅ OK: ${ok.length}`, colors.green);
  log(`⚠️  Warnings: ${warnings.length}`, colors.yellow);
  log(`❌ Erreurs: ${errors.length}`, colors.red);
  
  // Afficher les détails
  if (ok.length > 0) {
    log('\n✅ Vérifications réussies:', colors.green);
    ok.forEach(r => {
      log(`  ✓ ${r.check}: ${r.message}`, colors.green);
    });
  }
  
  if (warnings.length > 0) {
    log('\n⚠️  Avertissements:', colors.yellow);
    warnings.forEach(r => {
      log(`  ⚠ ${r.check}: ${r.message}`, colors.yellow);
    });
  }
  
  if (errors.length > 0) {
    log('\n❌ Erreurs critiques:', colors.red);
    errors.forEach(r => {
      log(`  ✗ ${r.check}: ${r.message}`, colors.red);
      if (r.fix) {
        log(`    💡 Solution: ${r.fix}`, colors.cyan);
      }
    });
  }
  
  // Résumé final
  log('\n' + '='.repeat(60), colors.blue);
  if (errors.length === 0) {
    log('✅ Le projet est prêt ! Vous pouvez lancer le serveur.', colors.green);
    log('\nCommandes utiles:', colors.cyan);
    log('  npm run dev          # Démarrer le serveur en développement', colors.reset);
    log('  npm run check         # Vérifier TypeScript', colors.reset);
    log('  npm run db:push       # Appliquer les migrations DB', colors.reset);
  } else {
    log('❌ Des erreurs critiques doivent être corrigées avant de lancer le serveur.', colors.red);
    log('\nActions recommandées:', colors.cyan);
    errors.forEach((r, i) => {
      if (r.fix) {
        log(`  ${i + 1}. ${r.fix}`, colors.reset);
      }
    });
    process.exit(1);
  }
  
  log('='.repeat(60) + '\n', colors.blue);
}

main().catch(error => {
  log(`\n❌ Erreur fatale: ${error.message}`, colors.red);
  console.error(error);
  process.exit(1);
});

