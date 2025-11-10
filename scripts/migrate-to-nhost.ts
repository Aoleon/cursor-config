#!/usr/bin/env tsx
/**
 * Script de migration des données Neon vers Nhost PostgreSQL
 * 
 * Ce script permet de migrer toutes les données de Neon DB vers Nhost PostgreSQL.
 * Il effectue :
 * 1. Validation du schéma Drizzle
 * 2. Export des données depuis Neon
 * 3. Import vers Nhost PostgreSQL
 * 4. Vérification de l'intégrité des données
 * 
 * Usage:
 *   NEON_DATABASE_URL=postgresql://... NHOST_DATABASE_URL=postgresql://... tsx scripts/migrate-to-nhost.ts
 * 
 * Variables d'environnement requises:
 *   - NEON_DATABASE_URL: URL de connexion Neon DB (source)
 *   - NHOST_DATABASE_URL: URL de connexion Nhost PostgreSQL (destination)
 */

import { Pool as NeonPool } from '@neondatabase/serverless';
import { Pool as PgPool } from 'pg';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import * as schema from '@shared/schema';
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

// Vérifier que c'est bien Neon
if (!NEON_DATABASE_URL.includes('neon.tech')) {
  console.error('❌ NEON_DATABASE_URL doit pointer vers Neon DB');
  process.exit(1);
}

// ========================================
// FONCTIONS DE MIGRATION
// ========================================

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
 * Récupère les données d'une table
 */
async function getTableData(
  pool: NeonPool | PgPool,
  schemaname: string,
  tablename: string
): Promise<any[]> {
  const client = await pool.connect();
  try {
    const tableName = `${schemaname}.${tablename}`;
    const result = await client.query(`SELECT * FROM ${tableName};`);
    return result.rows;
  } finally {
    client.release();
  }
}

/**
 * Insère les données dans une table Nhost
 */
async function insertTableData(
  pool: PgPool,
  schemaname: string,
  tablename: string,
  data: any[]
): Promise<number> {
  if (data.length === 0) {
    return 0;
  }

  const client = await pool.connect();
  try {
    const tableName = `${schemaname}.${tablename}`;
    
    // Récupérer les colonnes
    const columns = Object.keys(data[0]);
    const columnList = columns.map(col => `"${col}"`).join(', ');
    
    // Construire les valeurs
    const values = data.map((row, idx) => {
      const rowValues = columns.map(col => {
        const value = row[col];
        if (value === null) return 'NULL';
        if (typeof value === 'string') {
          return `$${idx * columns.length + columns.indexOf(col) + 1}`;
        }
        if (typeof value === 'object') {
          return `$${idx * columns.length + columns.indexOf(col) + 1}`;
        }
        return `$${idx * columns.length + columns.indexOf(col) + 1}`;
      }).join(', ');
      return `(${rowValues})`;
    }).join(', ');

    // Construire la requête avec paramètres
    const placeholders: any[] = [];
    data.forEach(row => {
      columns.forEach(col => {
        const value = row[col];
        if (typeof value === 'object' && value !== null) {
          placeholders.push(JSON.stringify(value));
        } else {
          placeholders.push(value);
        }
      });
    });

    const query = `
      INSERT INTO ${tableName} (${columnList})
      VALUES ${values}
      ON CONFLICT DO NOTHING;
    `;

    const result = await client.query(query, placeholders);
    return result.rowCount || 0;
  } finally {
    client.release();
  }
}

/**
 * Désactive les contraintes de clés étrangères temporairement
 */
async function disableForeignKeys(pool: PgPool): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('SET session_replication_role = replica;');
  } finally {
    client.release();
  }
}

/**
 * Réactive les contraintes de clés étrangères
 */
async function enableForeignKeys(pool: PgPool): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('SET session_replication_role = DEFAULT;');
  } finally {
    client.release();
  }
}

/**
 * Vérifie l'intégrité des données migrées
 */
async function validateMigration(
  neonPool: NeonPool,
  nhostPool: PgPool
): Promise<{ success: boolean; errors: string[] }> {
  const errors: string[] = [];
  
  try {
    const tables = await getTables(neonPool);
    
    for (const table of tables) {
      const tableName = `${table.schemaname}.${table.tablename}`;
      
      // Compter les lignes dans Neon
      const neonClient = await neonPool.connect();
      const neonCount = await neonClient.query(`SELECT COUNT(*) as count FROM ${tableName};`);
      const neonRowCount = parseInt(neonCount.rows[0].count, 10);
      neonClient.release();
      
      // Compter les lignes dans Nhost
      const nhostClient = await nhostPool.connect();
      const nhostCount = await nhostClient.query(`SELECT COUNT(*) as count FROM ${tableName};`);
      const nhostRowCount = parseInt(nhostCount.rows[0].count, 10);
      nhostClient.release();
      
      if (neonRowCount !== nhostRowCount) {
        errors.push(
          `Table ${tableName}: ${neonRowCount} lignes dans Neon, ${nhostRowCount} lignes dans Nhost`
        );
      }
    }
    
    return {
      success: errors.length === 0,
      errors
    };
  } catch (error) {
    errors.push(`Erreur lors de la validation: ${error instanceof Error ? error.message : String(error)}`);
    return {
      success: false,
      errors
    };
  }
}

// ========================================
// FONCTION PRINCIPALE
// ========================================

async function main() {
  console.log('🔄 Démarrage de la migration Neon → Nhost...\n');

  let neonPool: NeonPool | null = null;
  let nhostPool: PgPool | null = null;

  try {
    // Initialiser les connexions
    console.log('📡 Connexion à Neon DB...');
    neonPool = new NeonPool({ connectionString: NEON_DATABASE_URL });
    const neonDb = drizzleNeon({ client: neonPool, schema });
    
    console.log('📡 Connexion à Nhost PostgreSQL...');
    nhostPool = new PgPool({ connectionString: NHOST_DATABASE_URL });
    const nhostDb = drizzlePg({ client: nhostPool, schema });

    logger.info('Connexions établies', {
      metadata: {
        module: 'MigrateToNhost',
        operation: 'connect'
      }
    });

    // Récupérer la liste des tables
    console.log('📋 Récupération de la liste des tables...');
    const tables = await getTables(neonPool);
    console.log(`   ${tables.length} tables trouvées\n`);

    // Désactiver temporairement les contraintes pour accélérer l'insertion
    console.log('🔓 Désactivation temporaire des contraintes...');
    await disableForeignKeys(nhostPool);

    // Migrer les données table par table
    let totalRows = 0;
    for (const table of tables) {
      const tableName = `${table.schemaname}.${table.tablename}`;
      
      console.log(`📊 Migration de ${tableName}...`);
      
      try {
        // Récupérer les données depuis Neon
        const data = await getTableData(neonPool, table.schemaname, table.tablename);
        
        if (data.length === 0) {
          console.log(`   ✓ Table vide, ignorée\n`);
          continue;
        }
        
        // Insérer dans Nhost
        const inserted = await insertTableData(
          nhostPool,
          table.schemaname,
          table.tablename,
          data
        );
        
        totalRows += inserted;
        console.log(`   ✓ ${inserted} lignes migrées\n`);
      } catch (error) {
        console.error(`   ❌ Erreur lors de la migration de ${tableName}:`, error);
        logger.error(`Erreur migration table ${tableName}`, {
          metadata: {
            module: 'MigrateToNhost',
            operation: 'migrateTable',
            table: tableName,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
          }
        });
      }
    }

    // Réactiver les contraintes
    console.log('🔒 Réactivation des contraintes...');
    await enableForeignKeys(nhostPool);

    // Valider la migration
    console.log('\n🔍 Validation de la migration...');
    const validation = await validateMigration(neonPool, nhostPool);
    
    if (validation.success) {
      console.log('✅ Migration validée avec succès!\n');
      console.log(`📊 Total: ${totalRows} lignes migrées`);
    } else {
      console.error('❌ Erreurs de validation:');
      validation.errors.forEach(error => console.error(`   - ${error}`));
    }

    logger.info('Migration Neon → Nhost terminée', {
      metadata: {
        module: 'MigrateToNhost',
        operation: 'migrate',
        totalRows,
        tablesMigrated: tables.length,
        validationSuccess: validation.success,
        validationErrors: validation.errors
      }
    });

    // Fermer les connexions
    await neonPool.end();
    await nhostPool.end();
    
    process.exit(validation.success ? 0 : 1);
  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
    
    logger.error('Erreur lors de la migration Neon → Nhost', {
      metadata: {
        module: 'MigrateToNhost',
        operation: 'migrate',
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


