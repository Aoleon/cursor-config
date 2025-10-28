/**
 * Pattern Unit of Work pour gérer les transactions cross-entités
 * Permet de coordonner plusieurs opérations de repositories dans une seule transaction
 */

import type { DrizzleTransaction } from '../types';
import { withTransaction, type TransactionOptions } from '../../utils/database-helpers';
import { logger } from '../../utils/logger';

/**
 * Unit of Work pour coordonner plusieurs opérations dans une transaction
 * 
 * ARCHITECTURE CORRIGÉE: Cette classe utilise `withTransaction` correctement
 * en passant une closure qui contient tout le travail transactionnel.
 * 
 * Le pattern begin()/commit()/rollback() a été supprimé car il créait un deadlock
 * en wrappant withTransaction dans une Promise jamais résolue.
 * 
 * @example
 * ```typescript
 * const uow = new UnitOfWork(db);
 * 
 * await uow.execute(async (tx) => {
 *   // Créer une offre
 *   const offer = await offerRepository.create(offerData, tx);
 *   
 *   // Créer un AO lié
 *   await aoRepository.update(aoId, { offerId: offer.id }, tx);
 *   
 *   // commit automatique si pas d'erreur
 *   // rollback automatique si erreur
 * });
 * ```
 */
export class UnitOfWork {
  /**
   * Instance de la base de données
   */
  private readonly db: any;

  /**
   * Options de transaction
   */
  private readonly options: TransactionOptions;

  /**
   * Constructeur
   * 
   * @param db - Instance Drizzle de la base de données
   * @param options - Options de transaction optionnelles
   */
  constructor(db: any, options: TransactionOptions = {}) {
    this.db = db;
    this.options = options;
  }

  /**
   * Execute une fonction dans une transaction gérée automatiquement
   * 
   * Cette méthode utilise correctement `withTransaction` en passant
   * la closure utilisateur directement. Le commit/rollback est géré
   * automatiquement par withTransaction.
   * 
   * @param fn - Fonction à exécuter dans la transaction
   * @returns Le résultat de la fonction
   * 
   * @example
   * ```typescript
   * const result = await uow.execute(async (tx) => {
   *   const offer = await offerRepository.create(data, tx);
   *   await aoRepository.update(aoId, { offerId: offer.id }, tx);
   *   return offer;
   * });
   * ```
   */
  async execute<T>(fn: (tx: DrizzleTransaction) => Promise<T>): Promise<T> {
    logger.info('Démarrage d\'une Unit of Work', {
      metadata: {
        module: 'UnitOfWork',
        operation: 'execute'
      }
    });

    try {
      // Utilisation correcte de withTransaction : le callback contient tout le travail
      // Le commit est automatique si pas d'erreur, rollback automatique si erreur
      const result = await withTransaction(async (tx) => {
        return await fn(tx);
      }, this.options);

      logger.info('Unit of Work complétée avec succès', {
        metadata: {
          module: 'UnitOfWork',
          operation: 'execute'
        }
      });

      return result;
    } catch (error) {
      logger.error('Unit of Work échouée, rollback automatique', error as Error, {
        metadata: {
          module: 'UnitOfWork',
          operation: 'execute'
        }
      });
      throw error;
    }
  }
}

/**
 * Helper pour exécuter une opération avec Unit of Work
 * Simplifie le pattern try/catch/finally
 * 
 * @param db - Instance de la base de données
 * @param fn - Fonction à exécuter dans la transaction
 * @param options - Options de transaction
 * @returns Le résultat de la fonction
 * 
 * @example
 * ```typescript
 * const offer = await withUnitOfWork(db, async (tx) => {
 *   const offer = await offerRepository.create(data, tx);
 *   await aoRepository.update(aoId, { offerId: offer.id }, tx);
 *   return offer;
 * });
 * ```
 */
export async function withUnitOfWork<T>(
  db: any,
  fn: (tx: DrizzleTransaction) => Promise<T>,
  options?: TransactionOptions
): Promise<T> {
  const uow = new UnitOfWork(db, options);
  return uow.execute(fn);
}
