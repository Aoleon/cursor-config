/**
 * Types communs pour le système de storage modulaire
 * Utilisés par tous les repositories pour assurer la cohérence
 */

import type { NeonTransaction } from 'drizzle-orm/neon-serverless';
import type { ExtractTablesWithRelations } from 'drizzle-orm';
import type * as schema from '@shared/schema';

/**
 * Type pour les transactions Drizzle
 * Utilisé de manière cohérente dans tous les repositories
 */
export type DrizzleTransaction = NeonTransaction<typeof schema, ExtractTablesWithRelations<typeof schema>>;

/**
 * Options de pagination pour les requêtes
 */
export interface PaginationOptions {
  /**
   * Nombre d'éléments à retourner
   * @default 50
   */
  limit?: number;
  
  /**
   * Décalage à partir duquel commencer
   * @default 0
   */
  offset?: number;
  
  /**
   * Numéro de page (alternatif à offset)
   * Si fourni, offset sera calculé automatiquement
   */
  page?: number;
}

/**
 * Options de tri pour les requêtes
 */
export interface SortOptions {
  /**
   * Champ sur lequel trier
   */
  field: string;
  
  /**
   * Direction du tri
   * @default 'asc'
   */
  direction?: 'asc' | 'desc';
}

/**
 * Filtres de recherche génériques
 */
export interface SearchFilters {
  /**
   * Recherche textuelle (s'applique aux champs texte)
   */
  search?: string;
  
  /**
   * Filtre par statut
   */
  status?: string;
  
  /**
   * Filtre par utilisateur responsable
   */
  userId?: string;
  
  /**
   * Filtre par date de début
   */
  dateFrom?: Date | string;
  
  /**
   * Filtre par date de fin
   */
  dateTo?: Date | string;
  
  /**
   * Filtres additionnels spécifiques au domaine
   */
  [key: string]: any;
}

/**
 * Résultat paginé générique
 */
export interface PaginatedResult<T> {
  /**
   * Données de la page courante
   */
  items: T[];
  
  /**
   * Nombre total d'éléments (tous filtres appliqués)
   */
  total: number;
  
  /**
   * Nombre d'éléments par page
   */
  limit: number;
  
  /**
   * Décalage de la page courante
   */
  offset: number;
  
  /**
   * Numéro de page courante (basé sur 1)
   */
  page: number;
  
  /**
   * Nombre total de pages
   */
  totalPages: number;
  
  /**
   * Y a-t-il une page suivante ?
   */
  hasNext: boolean;
  
  /**
   * Y a-t-il une page précédente ?
   */
  hasPrevious: boolean;
}

/**
 * Contexte transactionnel pour passer une transaction active
 */
export interface TransactionContext {
  /**
   * Transaction Drizzle active
   */
  tx: DrizzleTransaction;
  
  /**
   * Nom de l'opération (pour logging)
   */
  operation?: string;
  
  /**
   * Métadonnées additionnelles
   */
  metadata?: Record<string, any>;
}

/**
 * Options pour les opérations de repository
 */
export interface RepositoryOptions {
  /**
   * Transaction optionnelle
   */
  tx?: DrizzleTransaction;
  
  /**
   * ID de l'utilisateur effectuant l'opération (pour audit)
   */
  userId?: string;
  
  /**
   * Activer le logging détaillé
   */
  verbose?: boolean;
}

/**
 * Résultat d'une opération de création/mise à jour
 */
export interface OperationResult<T> {
  /**
   * Succès de l'opération
   */
  success: boolean;
  
  /**
   * Données résultantes
   */
  data?: T;
  
  /**
   * Message d'erreur si échec
   */
  error?: string;
  
  /**
   * Métadonnées additionnelles
   */
  metadata?: Record<string, any>;
}

/**
 * Helper pour créer un résultat paginé
 */
export function createPaginatedResult<T>(
  items: T[],
  total: number,
  options: PaginationOptions
): PaginatedResult<T> {
  const limit = options.limit || 50;
  const offset = options.page ? (options.page - 1) * limit : (options.offset || 0);
  const page = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit);
  
  return {
    items,
    total,
    limit,
    offset,
    page,
    totalPages,
    hasNext: page < totalPages,
    hasPrevious: page > 1
  };
}
