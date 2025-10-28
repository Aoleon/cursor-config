import { Pool, neonConfig, PoolClient } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import { logger } from './utils/logger';

// ========================================
// CONFIGURATION WEBSOCKET NEON
// ========================================
neonConfig.webSocketConstructor = ws;

// Configuration fetch pour Neon (timeout et tentatives)
neonConfig.fetchConnectionCache = true;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// ========================================
// CONFIGURATION OPTIMISÉE DU POOL DE CONNEXIONS
// ========================================

/**
 * Pool Configuration Optimisée pour Agent Chatbot
 * 
 * Cette configuration est optimisée pour un agent chatbot qui fait de nombreuses
 * requêtes simultanées tout en maintenant l'efficacité et la stabilité.
 * 
 * Paramètres:
 * - max: 25 connexions max (équilibre entre performance et limites Neon)
 * - min: 5 connexions minimum toujours actives pour réduire la latence
 * - idleTimeoutMillis: 30s avant de fermer une connexion inactive
 * - connectionTimeoutMillis: 10s timeout pour obtenir une connexion
 * - maxUses: 7500 utilisations avant rotation de connexion (prévient memory leaks)
 * - allowExitOnIdle: true pour une fermeture propre
 */
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 25,                       // Maximum 25 connexions simultanées
  min: 5,                        // Minimum 5 connexions toujours actives
  idleTimeoutMillis: 30000,      // 30 secondes avant fermeture connexion inactive
  connectionTimeoutMillis: 10000, // 10 secondes timeout pour obtenir connexion
  maxUses: 7500,                 // Rotation après 7500 utilisations
  allowExitOnIdle: true          // Permet fermeture propre si inactif
});

// ========================================
// GESTION DES ERREURS DE POOL
// ========================================

/**
 * Gestion des erreurs critiques du pool
 * Log et notifications pour monitoring
 */
pool.on('error', (err: Error, client: PoolClient) => {
  logger.error('Erreur inattendue sur client pool inactif', {
    metadata: {
      module: 'DatabaseConfig',
      operation: 'handlePoolError',
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined
    }
  });
});

pool.on('connect', (client: PoolClient) => {
  logger.debug('Nouvelle connexion pool établie', {
    metadata: {
      module: 'DatabaseConfig',
      operation: 'handlePoolConnect'
    }
  });
});

pool.on('acquire', (client: PoolClient) => {
  // Log optionnel pour debug - peut être commenté en production
  // console.log('[DB Pool] Connexion acquise depuis le pool');
});

pool.on('remove', (client: PoolClient) => {
  logger.debug('Connexion retirée du pool', {
    metadata: {
      module: 'DatabaseConfig',
      operation: 'handlePoolRemove'
    }
  });
});

// ========================================
// INITIALISATION DRIZZLE ORM
// ========================================

/**
 * Instance Drizzle ORM avec pool optimisé
 * Tous les services utilisent cette instance unique
 */
export const db = drizzle({ client: pool, schema });

// ========================================
// FONCTION DE SANTÉ DU POOL
// ========================================

/**
 * Retourne les statistiques du pool pour monitoring
 */
export function getPoolStats() {
  return {
    totalConnections: pool.totalCount,
    idleConnections: pool.idleCount,
    waitingRequests: pool.waitingCount,
  };
}

// ========================================
// FONCTION DE FERMETURE PROPRE
// ========================================

/**
 * Fermeture propre du pool (à utiliser au shutdown)
 */
export async function closePool() {
  logger.info('Fermeture du pool de connexions', {
    metadata: {
      module: 'DatabaseConfig',
      operation: 'closePool',
      context: { action: 'shutdown' }
    }
  });
  await pool.end();
  logger.info('Pool de connexions fermé proprement', {
    metadata: {
      module: 'DatabaseConfig',
      operation: 'closePool',
      context: { status: 'closed' }
    }
  });
}