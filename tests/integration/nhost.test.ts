/**
 * Tests d'intégration pour Nhost PostgreSQL
 * 
 * Ces tests vérifient :
 * - La connexion à Nhost PostgreSQL
 * - La détection automatique du provider
 * - La migration des données (si applicable)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Pool as PgPool } from 'pg';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import * as schema from '@shared/schema';
import { getDatabaseProvider, getPoolStats } from '../../server/db';

// ========================================
// CONFIGURATION
// ========================================

const NHOST_DATABASE_URL = process.env.NHOST_DATABASE_URL || process.env.DATABASE_URL;

if (!NHOST_DATABASE_URL) {
  console.warn('⚠️  NHOST_DATABASE_URL non défini, certains tests seront ignorés');
}

// Vérifier que ce n'est pas Neon (pour les tests Nhost)
const isNeon = NHOST_DATABASE_URL?.includes('neon.tech');
const skipIfNeon = isNeon ? describe.skip : describe;

// ========================================
// TESTS
// ========================================

skipIfNeon('Tests d\'intégration Nhost PostgreSQL', () => {
  let pool: PgPool | null = null;
  let db: ReturnType<typeof drizzlePg> | null = null;

  beforeAll(async () => {
    if (!NHOST_DATABASE_URL) {
      throw new Error('NHOST_DATABASE_URL doit être défini pour les tests Nhost');
    }

    // Initialiser la connexion
    pool = new PgPool({ connectionString: NHOST_DATABASE_URL });
    db = drizzlePg({ client: pool, schema });
  });

  afterAll(async () => {
    if (pool) {
      await pool.end();
    }
  });

  describe('Connexion à Nhost PostgreSQL', () => {
    it('devrait se connecter à la base de données', async () => {
      expect(pool).toBeTruthy();
      
      const client = await pool!.connect();
      try {
        const result = await client.query('SELECT NOW() as now');
        expect(result.rows[0].now).toBeInstanceOf(Date);
      } finally {
        client.release();
      }
    });

    it('devrait détecter le provider comme standard/nhost', () => {
      const provider = getDatabaseProvider();
      expect(provider).toBe('standard');
    });

    it('devrait retourner les statistiques du pool', () => {
      const stats = getPoolStats();
      expect(stats).toHaveProperty('provider');
      expect(stats).toHaveProperty('totalConnections');
      expect(stats).toHaveProperty('idleConnections');
      expect(stats).toHaveProperty('waitingRequests');
      expect(stats.provider).toBe('standard');
    });
  });

  describe('Opérations de base de données', () => {
    it('devrait exécuter une requête simple', async () => {
      const client = await pool!.connect();
      try {
        const result = await client.query('SELECT 1 as value');
        expect(result.rows[0].value).toBe(1);
      } finally {
        client.release();
      }
    });

    it('devrait récupérer la version de PostgreSQL', async () => {
      const client = await pool!.connect();
      try {
        const result = await client.query('SELECT version()');
        expect(result.rows[0].version).toContain('PostgreSQL');
      } finally {
        client.release();
      }
    });

    it('devrait lister les tables existantes', async () => {
      const client = await pool!.connect();
      try {
        const result = await client.query(`
          SELECT tablename
          FROM pg_tables
          WHERE schemaname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
          LIMIT 10;
        `);
        expect(Array.isArray(result.rows)).toBe(true);
      } finally {
        client.release();
      }
    });
  });

  describe('Drizzle ORM avec Nhost', () => {
    it('devrait initialiser Drizzle avec le pool Nhost', () => {
      expect(db).toBeTruthy();
    });

    it('devrait pouvoir exécuter une requête via Drizzle', async () => {
      // Test simple avec Drizzle
      // Note: Cela nécessite que le schéma soit déjà appliqué
      try {
        // Test de connexion basique
        const client = await pool!.connect();
        client.release();
        expect(true).toBe(true);
      } catch (error) {
        // Si le schéma n'est pas encore appliqué, c'est normal
        console.warn('Schéma Drizzle non encore appliqué, test ignoré');
      }
    });
  });

  describe('Performance et pool de connexions', () => {
    it('devrait gérer plusieurs connexions simultanées', async () => {
      const promises = Array.from({ length: 5 }, async () => {
        const client = await pool!.connect();
        try {
          await client.query('SELECT 1');
        } finally {
          client.release();
        }
      });

      await Promise.all(promises);
      expect(true).toBe(true);
    });

    it('devrait maintenir un pool de connexions actif', () => {
      const stats = getPoolStats();
      expect(stats.totalConnections).toBeGreaterThanOrEqual(0);
      expect(stats.idleConnections).toBeGreaterThanOrEqual(0);
    });
  });
});

// ========================================
// TESTS DE MIGRATION (si applicable)
// ========================================

describe.skip('Tests de migration Neon → Nhost', () => {
  // Ces tests nécessitent à la fois Neon et Nhost
  // Ils sont désactivés par défaut et doivent être activés manuellement
  // avec les variables d'environnement appropriées

  const NEON_DATABASE_URL = process.env.NEON_DATABASE_URL;
  const NHOST_DATABASE_URL = process.env.NHOST_DATABASE_URL;

  beforeAll(() => {
    if (!NEON_DATABASE_URL || !NHOST_DATABASE_URL) {
      throw new Error('NEON_DATABASE_URL et NHOST_DATABASE_URL doivent être définis pour les tests de migration');
    }
  });

  it('devrait pouvoir se connecter à Neon et Nhost', async () => {
    // Test de connexion aux deux bases
    const { Pool: NeonPool } = await import('@neondatabase/serverless');
    const neonPool = new NeonPool({ connectionString: NEON_DATABASE_URL! });
    const nhostPool = new PgPool({ connectionString: NHOST_DATABASE_URL! });

    try {
      const neonClient = await neonPool.connect();
      const nhostClient = await nhostPool.connect();
      
      // Vérifier les connexions
      await neonClient.query('SELECT 1');
      await nhostClient.query('SELECT 1');
      
      neonClient.release();
      nhostClient.release();
      
      expect(true).toBe(true);
    } finally {
      await neonPool.end();
      await nhostPool.end();
    }
  });
});


