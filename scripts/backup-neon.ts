#!/usr/bin/env tsx
/**
 * Script de backup complet de la base de données Neon
 * 
 * Ce script permet de créer un backup complet de la base Neon avant migration vers Nhost.
 * Il exporte :
 * - Le schéma complet (tables, contraintes, index, etc.)
 * - Les données de toutes les tables
 * - Les séquences et valeurs
 * 
 * Usage:
 *   tsx scripts/backup-neon.ts [--output=backup.sql]
 */

import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from '@shared/schema';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { logger } from '../server/utils/logger';

// ========================================
// CONFIGURATION
// ========================================

const DATABASE_URL = process.env.DATABASE_URL;
const OUTPUT_DIR = process.env.BACKUP_OUTPUT_DIR || './backups';
const BACKUP_FILENAME = process.env.BACKUP_FILENAME || `neon-backup-${new Date().toISOString().replace(/:/g, '-')}.sql`;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL doit être défini dans les variables d\'environnement');
  process.exit(1);
}

// Vérifier que c'est bien une base Neon
if (!DATABASE_URL.includes('neon.tech')) {
  console.error('❌ Ce script est conçu uniquement pour Neon DB');
  console.error('   DATABASE_URL ne contient pas "neon.tech"');
  process.exit(1);
}

// ========================================
// FONCTIONS DE BACKUP
// ========================================

/**
 * Récupère le schéma complet de la base de données
 */
async function getSchema(pool: Pool): Promise<string> {
  const client = await pool.connect();
  try {
    // Récupérer toutes les définitions de tables
    const tablesQuery = `
      SELECT 
        schemaname,
        tablename,
        tableowner
      FROM pg_tables
      WHERE schemaname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
      ORDER BY schemaname, tablename;
    `;

    const tables = await client.query(tablesQuery);
    
    let schemaSQL = '-- ========================================\n';
    schemaSQL += '-- BACKUP SCHEMA NEON\n';
    schemaSQL += `-- Date: ${new Date().toISOString()}\n`;
    schemaSQL += `-- Database: ${DATABASE_URL.split('@')[1]?.split('/')[1] || 'unknown'}\n`;
    schemaSQL += '-- ========================================\n\n';

    // Pour chaque table, récupérer la définition complète
    for (const table of tables.rows) {
      const tableName = `${table.schemaname}.${table.tablename}`;
      
      // Récupérer la définition CREATE TABLE
      const createTableQuery = `
        SELECT pg_get_tabledef('${tableName}'::regclass) as definition;
      `;
      
      try {
        const result = await client.query(createTableQuery);
        if (result.rows[0]?.definition) {
          schemaSQL += `\n-- Table: ${tableName}\n`;
          schemaSQL += result.rows[0].definition + ';\n\n';
        }
      } catch (error) {
        console.warn(`⚠️  Impossible de récupérer la définition de ${tableName}`);
      }

      // Récupérer les index
      const indexesQuery = `
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE schemaname = $1 AND tablename = $2;
      `;
      
      const indexes = await client.query(indexesQuery, [table.schemaname, table.tablename]);
      for (const index of indexes.rows) {
        schemaSQL += `${index.indexdef};\n`;
      }
    }

    return schemaSQL;
  } finally {
    client.release();
  }
}

/**
 * Récupère les données de toutes les tables
 */
async function getData(pool: Pool): Promise<string> {
  const client = await pool.connect();
  try {
    // Récupérer toutes les tables
    const tablesQuery = `
      SELECT schemaname, tablename
      FROM pg_tables
      WHERE schemaname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
      ORDER BY schemaname, tablename;
    `;

    const tables = await client.query(tablesQuery);
    let dataSQL = '\n-- ========================================\n';
    dataSQL += '-- DONNÉES\n';
    dataSQL += '-- ========================================\n\n';

    for (const table of tables.rows) {
      const tableName = `${table.schemaname}.${table.tablename}`;
      
      // Compter les lignes
      const countResult = await client.query(`SELECT COUNT(*) as count FROM ${tableName};`);
      const rowCount = parseInt(countResult.rows[0].count, 10);

      if (rowCount === 0) {
        dataSQL += `-- Table ${tableName}: 0 lignes\n\n`;
        continue;
      }

      dataSQL += `-- Table ${tableName}: ${rowCount} lignes\n`;
      
      // Récupérer les données
      const dataResult = await client.query(`SELECT * FROM ${tableName};`);
      
      if (dataResult.rows.length > 0) {
        // Générer les INSERT statements
        const columns = Object.keys(dataResult.rows[0]);
        const columnList = columns.map(col => `"${col}"`).join(', ');
        
        dataSQL += `INSERT INTO ${tableName} (${columnList}) VALUES\n`;
        
        const values = dataResult.rows.map((row, idx) => {
          const rowValues = columns.map(col => {
            const value = row[col];
            if (value === null) return 'NULL';
            if (typeof value === 'string') {
              return `'${value.replace(/'/g, "''")}'`;
            }
            if (typeof value === 'object') {
              return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
            }
            return String(value);
          }).join(', ');
          
          return `  (${rowValues})${idx < dataResult.rows.length - 1 ? ',' : ';'}`;
        }).join('\n');
        
        dataSQL += values + '\n\n';
      }
    }

    return dataSQL;
  } finally {
    client.release();
  }
}

/**
 * Récupère les séquences et leurs valeurs actuelles
 */
async function getSequences(pool: Pool): Promise<string> {
  const client = await pool.connect();
  try {
    const sequencesQuery = `
      SELECT schemaname, sequencename, last_value
      FROM pg_sequences
      WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
      ORDER BY schemaname, sequencename;
    `;

    const sequences = await client.query(sequencesQuery);
    
    if (sequences.rows.length === 0) {
      return '\n-- Aucune séquence trouvée\n';
    }

    let sequencesSQL = '\n-- ========================================\n';
    sequencesSQL += '-- SÉQUENCES\n';
    sequencesSQL += '-- ========================================\n\n';

    for (const seq of sequences.rows) {
      const seqName = `${seq.schemaname}.${seq.sequencename}`;
      sequencesSQL += `SELECT setval('${seqName}', ${seq.last_value}, true);\n`;
    }

    return sequencesSQL;
  } finally {
    client.release();
  }
}

// ========================================
// FONCTION PRINCIPALE
// ========================================

async function main() {
  console.log('🔄 Démarrage du backup Neon DB...\n');

  try {
    // Créer le répertoire de backup si nécessaire
    await mkdir(OUTPUT_DIR, { recursive: true });

    // Initialiser la connexion
    const pool = new Pool({ connectionString: DATABASE_URL });
    const db = drizzle({ client: pool, schema });

    logger.info('Connexion à Neon DB établie', {
      metadata: {
        module: 'BackupNeon',
        operation: 'connect'
      }
    });

    console.log('📋 Récupération du schéma...');
    const schemaSQL = await getSchema(pool);

    console.log('📊 Récupération des données...');
    const dataSQL = await getData(pool);

    console.log('🔢 Récupération des séquences...');
    const sequencesSQL = await getSequences(pool);

    // Assembler le backup complet
    const fullBackup = schemaSQL + dataSQL + sequencesSQL;

    // Sauvegarder dans un fichier
    const outputPath = join(OUTPUT_DIR, BACKUP_FILENAME);
    await writeFile(outputPath, fullBackup, 'utf-8');

    console.log(`\n✅ Backup créé avec succès: ${outputPath}`);
    console.log(`📦 Taille: ${(fullBackup.length / 1024).toFixed(2)} KB\n`);

    logger.info('Backup Neon DB terminé avec succès', {
      metadata: {
        module: 'BackupNeon',
        operation: 'backup',
        outputPath,
        sizeKB: (fullBackup.length / 1024).toFixed(2)
      }
    });

    // Fermer la connexion
    await pool.end();
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors du backup:', error);
    
    logger.error('Erreur lors du backup Neon DB', {
      metadata: {
        module: 'BackupNeon',
        operation: 'backup',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }
    });

    process.exit(1);
  }
}

// Exécuter le script
main();


