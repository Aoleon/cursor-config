import { Pool as NeonPool, neonConfig, PoolClient as NeonPoolClient } from '@neondatabase/serverless';
import { AppError } from './utils/error-handler';
import { Pool as PgPool, PoolClient as PgPoolClient } from 'pg';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import ws from "ws";
import * as schema from "@shared/schema";
import { logger } from './utils/logger';

// ========================================
// DÉTECTION AUTOMATIQUE DU PROVIDER
// ========================================

/**
 * Détecte le type de provider PostgreSQL basé sur DATABASE_URL
 * - Neon: contient "neon.tech" ou utilise le protocole WebSocket
 * - Nhost/Standard PostgreSQL: format postgresql:// standard
 */
function detectDatabaseProvider(): 'neon' | 'nhost' | 'standard' {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    throw new AppError(
      "DATABASE_URL must be set. Did you forget to provision a database?",
    );
  }

  // Détection Neon (serverless avec WebSocket)
  if (databaseUrl.includes('neon.tech') || databaseUrl.includes('neon.tech')) {
    return 'neon';
  }

  // Détection Nhost (peut être identifié par le host ou le format)
  // Pour l'instant, on considère tout ce qui n'est pas Neon comme standard/Nhost
  return 'standard';
}

const dbProvider = detectDatabaseProvider();

logger.info('Provider de base de données détecté', { metadata: {
    module: 'DatabaseConfig',
    operation: 'detectProvider',
    provider: dbProvider,
    hasDatabaseUrl: !!process.env.DATABASE_URL
        }
            });

// ========================================
// CONFIGURATION WEBSOCKET NEON (si nécessaire)
// ========================================
if (dbProvider === 'neon') {
  neonConfig.webSocketConstructor = ws;
  neonConfig.fetchConnectionCache = true;
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
 * - max: 25 connexions max (équilibre entre performance et limites)
 * - min: 5 connexions minimum toujours actives pour réduire la latence
 * - idleTimeoutMillis: 30s avant de fermer une connexion inactive
 * - connectionTimeoutMillis: 10s timeout pour obtenir une connexion
 * - maxUses: 7500 utilisations avant rotation de connexion (prévient memory leaks)
 * - allowExitOnIdle: true pour une fermeture propre
 */
let pool: NeonPool | PgPool;

if (dbProvider === 'neon') {
  // Pool Neon (serverless avec WebSocket)
  pool = new NeonPool({ 
    connectionString: process.env.DATABASE_URL!,
    max: 25,                       // Maximum 25 connexions simultanées
    min: 5,                        // Minimum 5 connexions toujours actives
    idleTimeoutMillis: 30000,      // 30 secondes avant fermeture connexion inactive
    connectionTimeoutMillis: 10000, // 10 secondes timeout pour obtenir connexion
    maxUses: 7500,                 // Rotation après 7500 utilisations
    allowExitOnIdle: true          // Permet fermeture propre si inactif
  });
} else {
  // Pool PostgreSQL standard (Nhost ou autre)
  pool = new PgPool({ 
    connectionString: process.env.DATABASE_URL!,
    max: 25,                       // Maximum 25 connexions simultanées
    min: 5,                        // Minimum 5 connexions toujours actives
    idleTimeoutMillis: 30000,      // 30 secondes avant fermeture connexion inactive
    connectionTimeoutMillis: 10000, // 10 secondes timeout pour obtenir connexion
  });
}

export { pool };

// ========================================
// GESTION DES ERREURS DE POOL
// ========================================

/**
 * Gestion des erreurs critiques du pool
 * Log et notifications pour monitoring
 */
pool.on('error', (err: Error, client: NeonPoolClient | PgPoolClient) => {
  logger.error('Erreur inattendue sur client pool inactif', { metadata: {
      module: 'DatabaseConfig',
      operation: 'handlePoolError',
      provider: dbProvider,
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined
        }
            });
});

pool.on('connect', (client: NeonPoolClient | PgPoolClient) => {
  logger.debug('Nouvelle connexion pool établie', { metadata: {
      module: 'DatabaseConfig',
      operation: 'handlePoolConnect',
      provider: dbProvider
        }
            });
});

pool.on('acquire', (client: NeonPoolClient | PgPoolClient) => {
  // Log optionnel pour debug - peut être commenté en production
  // logger.info('[DB Pool] Connexion acquise depuis le pool');
});

pool.on('remove', (client: NeonPoolClient | PgPoolClient) => {
  logger.debug('Connexion retirée du pool', { metadata: {
      module: 'DatabaseConfig',
      operation: 'handlePoolRemove',
      provider: dbProvider
        }
            });
});

// ========================================
// INITIALISATION DRIZZLE ORM
// ========================================

/**
 * Instance Drizzle ORM avec pool optimisé
 * Tous les services utilisent cette instance unique
 * Utilise le bon driver selon le provider détecté
 */
export const db = dbProvider === 'neon' 
  ? drizzleNeon({ client: pool as NeonPool, schema })
  : drizzlePg({ client: pool as PgPool, schema });

// ========================================
// FONCTION DE SANTÉ DU POOL
// ========================================

/**
 * Retourne les statistiques du pool pour monitoring
 */
export function getPoolStats() {
  if (dbProvider === 'neon') {
    const neonPool = pool as NeonPool;
    return {
      provider: dbProvider,
      totalConnections: neonPool.totalCount,
      idleConnections: neonPool.idleCount,
      waitingRequests: neonPool.waitingCount,
    };
  } else {
    const pgPool = pool as PgPool;
    return {
      provider: dbProvider,
      totalConnections: pgPool.totalCount,
      idleConnections: pgPool.idleCount,
      waitingRequests: pgPool.waitingCount,
    };
  }
}

/**
 * Retourne le provider de base de données actuel
 */
export function getDatabaseProvider(): 'neon' | 'nhost' | 'standard' {
  return dbProvider;
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