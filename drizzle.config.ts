import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

/**
 * Détecte le type de provider PostgreSQL basé sur DATABASE_URL
 * - Neon: contient "neon.tech" (utilise neon-serverless)
 * - Nhost/Standard PostgreSQL: format postgresql:// standard (utilise node-postgres)
 */
function detectDatabaseProvider(): 'neon' | 'standard' {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    throw new Error("DATABASE_URL must be set");
  }

  // Détection Neon (serverless avec WebSocket)
  if (databaseUrl.includes('neon.tech')) {
    return 'neon';
  }

  // Tout le reste est considéré comme PostgreSQL standard (Nhost ou autre)
  return 'standard';
}

const dbProvider = detectDatabaseProvider();

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  // Note: drizzle-kit détecte automatiquement le driver selon le dialect
  // Pas besoin de spécifier le driver explicitement
});
