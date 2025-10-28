/**
 * Setup pour les tests d'intégration
 * 
 * Contrairement au setup backend standard qui utilise des mocks,
 * ce setup configure l'environnement pour utiliser une VRAIE base de données
 * pour valider l'intégration complète de bout en bout.
 */

import { vi } from 'vitest';

// Configuration de l'environnement de test avec vraie DB
process.env.NODE_ENV = 'test';

// Utiliser la vraie DATABASE_URL (connexion à la DB de développement ou test)
// IMPORTANT: Ces tests modifient une vraie base de données
if (!process.env.DATABASE_URL) {
  console.warn('⚠️  DATABASE_URL non définie - les tests d\'intégration pourraient échouer');
}

// DÉMOCK la base de données qui a été mockée par tests/backend/setup.ts
// Ceci permet d'utiliser la vraie implémentation de Drizzle pour les tests d'intégration
vi.doUnmock('../../db');
