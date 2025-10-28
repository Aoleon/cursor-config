/**
 * Interface générique pour les repositories
 * Définit le contrat CRUD standard pour tous les storages de domaine
 */

import type { 
  DrizzleTransaction, 
  PaginationOptions, 
  PaginatedResult, 
  SearchFilters,
  SortOptions 
} from '../types';

/**
 * Interface générique de repository avec support CRUD complet
 * 
 * @template T - Type de l'entité gérée par le repository
 * @template TInsert - Type des données d'insertion (optionnel, défaut = Partial<T>)
 * @template TUpdate - Type des données de mise à jour (optionnel, défaut = Partial<T>)
 * @template TFilters - Type des filtres de recherche (optionnel, défaut = SearchFilters)
 * 
 * @example
 * ```typescript
 * interface OfferRepository extends IRepository<Offer, InsertOffer, Partial<InsertOffer>> {
 *   // Méthodes spécifiques au domaine Offer
 * }
 * ```
 */
export interface IRepository<
  T,
  TInsert = Partial<T>,
  TUpdate = Partial<T>,
  TFilters = SearchFilters
> {
  /**
   * Récupère une entité par son ID
   * 
   * @param id - Identifiant unique de l'entité
   * @param tx - Transaction optionnelle pour isolation
   * @returns L'entité trouvée ou undefined si non trouvée
   * 
   * @example
   * ```typescript
   * const offer = await repository.findById('offer-123');
   * ```
   */
  findById(id: string, tx?: DrizzleTransaction): Promise<T | undefined>;

  /**
   * Récupère toutes les entités avec filtres optionnels
   * 
   * @param filters - Filtres de recherche optionnels
   * @param tx - Transaction optionnelle pour isolation
   * @returns Liste des entités correspondant aux filtres
   * 
   * @example
   * ```typescript
   * const offers = await repository.findAll({ status: 'active', search: 'projet' });
   * ```
   */
  findAll(filters?: TFilters, tx?: DrizzleTransaction): Promise<T[]>;

  /**
   * Récupère les entités avec pagination
   * 
   * @param filters - Filtres de recherche optionnels
   * @param pagination - Options de pagination
   * @param sort - Options de tri optionnelles
   * @param tx - Transaction optionnelle pour isolation
   * @returns Résultat paginé avec métadonnées
   * 
   * @example
   * ```typescript
   * const result = await repository.findPaginated(
   *   { status: 'active' },
   *   { limit: 20, page: 1 },
   *   { field: 'createdAt', direction: 'desc' }
   * );
   * ```
   */
  findPaginated(
    filters?: TFilters,
    pagination?: PaginationOptions,
    sort?: SortOptions,
    tx?: DrizzleTransaction
  ): Promise<PaginatedResult<T>>;

  /**
   * Crée une nouvelle entité
   * 
   * @param data - Données de l'entité à créer
   * @param tx - Transaction optionnelle pour isolation
   * @returns L'entité créée avec son ID généré
   * 
   * @example
   * ```typescript
   * const newOffer = await repository.create({
   *   title: 'Nouveau projet',
   *   status: 'draft'
   * });
   * ```
   */
  create(data: TInsert, tx?: DrizzleTransaction): Promise<T>;

  /**
   * Crée plusieurs entités en batch
   * 
   * @param data - Tableau de données à créer
   * @param tx - Transaction optionnelle pour isolation
   * @returns Tableau des entités créées
   * 
   * @example
   * ```typescript
   * const offers = await repository.createMany([
   *   { title: 'Projet 1' },
   *   { title: 'Projet 2' }
   * ]);
   * ```
   */
  createMany(data: TInsert[], tx?: DrizzleTransaction): Promise<T[]>;

  /**
   * Met à jour une entité existante
   * 
   * @param id - Identifiant de l'entité à mettre à jour
   * @param data - Données partielles à mettre à jour
   * @param tx - Transaction optionnelle pour isolation
   * @returns L'entité mise à jour
   * @throws {Error} Si l'entité n'existe pas
   * 
   * @example
   * ```typescript
   * const updated = await repository.update('offer-123', {
   *   status: 'validated'
   * });
   * ```
   */
  update(id: string, data: TUpdate, tx?: DrizzleTransaction): Promise<T>;

  /**
   * Supprime une entité
   * 
   * @param id - Identifiant de l'entité à supprimer
   * @param tx - Transaction optionnelle pour isolation
   * @throws {Error} Si l'entité n'existe pas ou ne peut être supprimée
   * 
   * @example
   * ```typescript
   * await repository.delete('offer-123');
   * ```
   */
  delete(id: string, tx?: DrizzleTransaction): Promise<void>;

  /**
   * Supprime plusieurs entités selon des critères
   * 
   * @param filters - Filtres pour sélectionner les entités à supprimer
   * @param tx - Transaction optionnelle pour isolation
   * @returns Nombre d'entités supprimées
   * 
   * @example
   * ```typescript
   * const deleted = await repository.deleteMany({ status: 'archived' });
   * ```
   */
  deleteMany(filters: TFilters, tx?: DrizzleTransaction): Promise<number>;

  /**
   * Compte le nombre d'entités correspondant aux filtres
   * 
   * @param filters - Filtres de comptage optionnels
   * @param tx - Transaction optionnelle pour isolation
   * @returns Nombre d'entités
   * 
   * @example
   * ```typescript
   * const activeCount = await repository.count({ status: 'active' });
   * ```
   */
  count(filters?: TFilters, tx?: DrizzleTransaction): Promise<number>;

  /**
   * Vérifie l'existence d'une entité
   * 
   * @param id - Identifiant de l'entité
   * @param tx - Transaction optionnelle pour isolation
   * @returns true si l'entité existe, false sinon
   * 
   * @example
   * ```typescript
   * const exists = await repository.exists('offer-123');
   * ```
   */
  exists(id: string, tx?: DrizzleTransaction): Promise<boolean>;
}
