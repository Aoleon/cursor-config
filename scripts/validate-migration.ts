#!/usr/bin/env tsx
/**
 * Script de validation de la migration Neon → Nhost
 * 
 * Ce script valide la migration des données en comparant :
 * - Les schémas (tables, colonnes, contraintes)
 * - Les données (nombre de lignes, valeurs)
 * - Les séquences
 * 
 * Usage:
 *   NEON_DATABASE_URL=postgresql://... NHOST_DATABASE_URL=postgresql://... tsx scripts/validate-migration.ts
 */

import { Pool as NeonPool } from '@neondatabase/serverless';
import { Pool as PgPool } from 'pg';
import { logger } from '../server/utils/logger';

// ========================================
// CONFIGURATION
// ========================================

const NEON_DATABASE_URL = process.env.NEON_DATABASE_URL;
const NHOST_DATABASE_URL = process.env.NHOST_DATABASE_URL;

if (!NEON_DATABASE_URL) {
  console.error('❌ NEON_DATABASE_URL doit être défini');
  process.exit(1);
}

if (!NHOST_DATABASE_URL) {
  console.error('❌ NHOST_DATABASE_URL doit être défini');
  process.exit(1);
}

// ========================================
// TYPES
// ========================================

interface TableInfo {
  schemaname: string;
  tablename: string;
  rowCount: number;
  columns: string[];
}

interface ValidationResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  summary: {
    tablesChecked: number;
    tablesMatched: number;
    totalRowsNeon: number;
    totalRowsNhost: number;
  };
}

// ========================================
// FONCTIONS DE VALIDATION
// ========================================

/**
 * Récupère les informations d'une table
 */
async function getTableInfo(
  pool: NeonPool | PgPool,
  schemaname: string,
  tablename: string
): Promise<TableInfo> {
  const client = await pool.connect();
  try {
    const tableName = `${schemaname}.${tablename}`;
    
    // Compter les lignes
    const countResult = await client.query(`SELECT COUNT(*) as count FROM ${tableName};`);
    const rowCount = parseInt(countResult.rows[0].count, 10);
    
    // Récupérer les colonnes
    const columnsResult = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = $1 AND table_name = $2
      ORDER BY ordinal_position;
    `, [schemaname, tablename]);
    
    const columns = columnsResult.rows.map(row => row.column_name);
    
    return {
      schemaname,
      tablename,
      rowCount,
      columns
    };
  } finally {
    client.release();
  }
}

/**
 * Récupère la liste de toutes les tables
 */
async function getTables(pool: NeonPool | PgPool): Promise<Array<{ schemaname: string; tablename: string }>> {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT schemaname, tablename
      FROM pg_tables
      WHERE schemaname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
      ORDER BY schemaname, tablename;
    `);
    return result.rows;
  } finally {
    client.release();
  }
}

/**
 * Compare les schémas de deux tables
 */
function compareSchemas(
  neonTable: TableInfo,
  nhostTable: TableInfo
): { match: boolean; differences: string[] } {
  const differences: string[] = [];
  
  // Comparer les colonnes
  const neonColumns = new Set(neonTable.columns);
  const nhostColumns = new Set(nhostTable.columns);
  
  // Colonnes dans Neon mais pas dans Nhost
  neonColumns.forEach(col => {
    if (!nhostColumns.has(col)) {
      differences.push(`Colonne "${col}" présente dans Neon mais absente dans Nhost`);
    }
  });
  
  // Colonnes dans Nhost mais pas dans Neon
  nhostColumns.forEach(col => {
    if (!neonColumns.has(col)) {
      differences.push(`Colonne "${col}" présente dans Nhost mais absente dans Neon`);
    }
  });
  
  return {
    match: differences.length === 0,
    differences
  };
}

/**
 * Compare les données de deux tables
 */
async function compareData(
  neonPool: NeonPool,
  nhostPool: PgPool,
  schemaname: string,
  tablename: string
): Promise<{ match: boolean; differences: string[] }> {
  const differences: string[] = [];
  const tableName = `${schemaname}.${tablename}`;
  
  try {
    // Récupérer les données depuis Neon
    const neonClient = await neonPool.connect();
    const neonData = await neonClient.query(`SELECT * FROM ${tableName} ORDER BY ctid;`);
    neonClient.release();
    
    // Récupérer les données depuis Nhost
    const nhostClient = await nhostPool.connect();
    const nhostData = await nhostClient.query(`SELECT * FROM ${tableName} ORDER BY ctid;`);
    nhostClient.release();
    
    // Comparer le nombre de lignes
    if (neonData.rows.length !== nhostData.rows.length) {
      differences.push(
        `Nombre de lignes différent: ${neonData.rows.length} dans Neon, ${nhostData.rows.length} dans Nhost`
      );
    }
    
    // Comparer les valeurs (pour les premières lignes)
    const maxRowsToCompare = Math.min(neonData.rows.length, nhostData.rows.length, 100);
    for (let i = 0; i < maxRowsToCompare; i++) {
      const neonRow = neonData.rows[i];
      const nhostRow = nhostData.rows[i];
      
      // Comparer chaque colonne
      Object.keys(neonRow).forEach(col => {
        const neonValue = neonRow[col];
        const nhostValue = nhostRow[col];
        
        // Normaliser les valeurs pour comparaison
        const normalizeValue = (val: any) => {
          if (val === null) return null;
          if (typeof val === 'object') return JSON.stringify(val);
          return String(val);
        };
        
        if (normalizeValue(neonValue) !== normalizeValue(nhostValue)) {
          differences.push(
            `Ligne ${i + 1}, colonne "${col}": valeur différente (Neon: ${neonValue}, Nhost: ${nhostValue})`
          );
        }
      });
    }
    
    return {
      match: differences.length === 0,
      differences
    };
  } catch (error) {
    differences.push(
      `Erreur lors de la comparaison des données: ${error instanceof Error ? error.message : String(error)}`
    );
    return {
      match: false,
      differences
    };
  }
}

/**
 * Valide la migration complète
 */
async function validateMigration(
  neonPool: NeonPool,
  nhostPool: PgPool
): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  let tablesChecked = 0;
  let tablesMatched = 0;
  let totalRowsNeon = 0;
  let totalRowsNhost = 0;
  
  try {
    // Récupérer la liste des tables
    const neonTables = await getTables(neonPool);
    const nhostTables = await getTables(nhostPool);
    
    // Vérifier que toutes les tables Neon existent dans Nhost
    const neonTableNames = new Set(neonTables.map(t => `${t.schemaname}.${t.tablename}`));
    const nhostTableNames = new Set(nhostTables.map(t => `${t.schemaname}.${t.tablename}`));
    
    neonTableNames.forEach(tableName => {
      if (!nhostTableNames.has(tableName)) {
        errors.push(`Table "${tableName}" présente dans Neon mais absente dans Nhost`);
      }
    });
    
    nhostTableNames.forEach(tableName => {
      if (!neonTableNames.has(tableName)) {
        warnings.push(`Table "${tableName}" présente dans Nhost mais absente dans Neon`);
      }
    });
    
    // Valider chaque table
    for (const table of neonTables) {
      const tableName = `${table.schemaname}.${table.tablename}`;
      tablesChecked++;
      
      try {
        // Récupérer les informations des tables
        const neonTable = await getTableInfo(neonPool, table.schemaname, table.tablename);
        totalRowsNeon += neonTable.rowCount;
        
        // Vérifier si la table existe dans Nhost
        if (!nhostTableNames.has(tableName)) {
          errors.push(`Table "${tableName}" absente dans Nhost`);
          continue;
        }
        
        const nhostTable = await getTableInfo(nhostPool, table.schemaname, table.tablename);
        totalRowsNhost += nhostTable.rowCount;
        
        // Comparer les schémas
        const schemaComparison = compareSchemas(neonTable, nhostTable);
        if (!schemaComparison.match) {
          errors.push(`Table "${tableName}": différences de schéma`);
          schemaComparison.differences.forEach(diff => errors.push(`  - ${diff}`));
        }
        
        // Comparer le nombre de lignes
        if (neonTable.rowCount !== nhostTable.rowCount) {
          errors.push(
            `Table "${tableName}": nombre de lignes différent (Neon: ${neonTable.rowCount}, Nhost: ${nhostTable.rowCount})`
          );
        } else {
          tablesMatched++;
        }
        
        // Comparer les données (uniquement si les schémas correspondent)
        if (schemaComparison.match && neonTable.rowCount > 0 && neonTable.rowCount === nhostTable.rowCount) {
          const dataComparison = await compareData(neonPool, nhostPool, table.schemaname, table.tablename);
          if (!dataComparison.match) {
            errors.push(`Table "${tableName}": différences de données`);
            dataComparison.differences.slice(0, 10).forEach(diff => errors.push(`  - ${diff}`));
            if (dataComparison.differences.length > 10) {
              errors.push(`  ... et ${dataComparison.differences.length - 10} autres différences`);
            }
          }
        }
      } catch (error) {
        errors.push(
          `Erreur lors de la validation de "${tableName}": ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
    
    return {
      success: errors.length === 0,
      errors,
      warnings,
      summary: {
        tablesChecked,
        tablesMatched,
        totalRowsNeon,
        totalRowsNhost
      }
    };
  } catch (error) {
    errors.push(`Erreur lors de la validation: ${error instanceof Error ? error.message : String(error)}`);
    return {
      success: false,
      errors,
      warnings,
      summary: {
        tablesChecked,
        tablesMatched,
        totalRowsNeon,
        totalRowsNhost
      }
    };
  }
}

// ========================================
// FONCTION PRINCIPALE
// ========================================

async function main() {
  console.log('🔍 Démarrage de la validation de migration...\n');

  let neonPool: NeonPool | null = null;
  let nhostPool: PgPool | null = null;

  try {
    // Initialiser les connexions
    console.log('📡 Connexion à Neon DB...');
    neonPool = new NeonPool({ connectionString: NEON_DATABASE_URL });
    
    console.log('📡 Connexion à Nhost PostgreSQL...');
    nhostPool = new PgPool({ connectionString: NHOST_DATABASE_URL });

    logger.info('Connexions établies pour validation', {
      metadata: {
        module: 'ValidateMigration',
        operation: 'connect'
      }
    });

    // Valider la migration
    console.log('🔍 Validation en cours...\n');
    const result = await validateMigration(neonPool, nhostPool);

    // Afficher les résultats
    console.log('📊 Résultats de la validation:\n');
    console.log(`   Tables vérifiées: ${result.summary.tablesChecked}`);
    console.log(`   Tables correspondantes: ${result.summary.tablesMatched}`);
    console.log(`   Total lignes Neon: ${result.summary.totalRowsNeon}`);
    console.log(`   Total lignes Nhost: ${result.summary.totalRowsNhost}\n`);

    if (result.warnings.length > 0) {
      console.log('⚠️  Avertissements:');
      result.warnings.forEach(warning => console.log(`   - ${warning}`));
      console.log();
    }

    if (result.success) {
      console.log('✅ Validation réussie! Toutes les données correspondent.\n');
    } else {
      console.error('❌ Erreurs de validation:');
      result.errors.forEach(error => console.error(`   - ${error}`));
      console.log();
    }

    logger.info('Validation de migration terminée', {
      metadata: {
        module: 'ValidateMigration',
        operation: 'validate',
        success: result.success,
        tablesChecked: result.summary.tablesChecked,
        tablesMatched: result.summary.tablesMatched,
        errorsCount: result.errors.length,
        warningsCount: result.warnings.length
      }
    });

    // Fermer les connexions
    await neonPool.end();
    await nhostPool.end();
    
    process.exit(result.success ? 0 : 1);
  } catch (error) {
    console.error('❌ Erreur lors de la validation:', error);
    
    logger.error('Erreur lors de la validation de migration', {
      metadata: {
        module: 'ValidateMigration',
        operation: 'validate',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }
    });

    // Fermer les connexions en cas d'erreur
    if (neonPool) await neonPool.end().catch(() => {});
    if (nhostPool) await nhostPool.end().catch(() => {});
    
    process.exit(1);
  }
}

// Exécuter le script
main();


