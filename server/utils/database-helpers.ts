/**
 * Database helpers with robust transaction management
 * Provides safe wrappers for database operations with automatic retry and rollback
 */

import { db } from '../db';
import { logger } from './logger';
import { DatabaseError } from './error-handler';
import { sql } from 'drizzle-orm';
import type { ExtractTablesWithRelations } from 'drizzle-orm';
import type { NeonTransaction, NeonQueryResultHKT } from 'drizzle-orm/neon-serverless';
import type * as schema from '@shared/schema';

// Type definitions for Drizzle transactions
type DrizzleTransaction = NeonTransaction<typeof schema, ExtractTablesWithRelations<typeof schema>>;
type TransactionCallback<T> = (tx: DrizzleTransaction) => Promise<T>;

// Error codes that are retryable
const RETRYABLE_ERROR_CODES = [
  '40001', // serialization_failure (deadlock)
  '40P01', // deadlock_detected
  '55P03', // lock_not_available
  '57014', // query_canceled (timeout)
  '08006', // connection_failure
  '08003', // connection_does_not_exist
  '08001', // sqlclient_unable_to_establish_sqlconnection
  '25006', // read_only_sql_transaction
];

// Error codes that indicate connection issues
const CONNECTION_ERROR_CODES = [
  '08000', // connection_exception
  '08003', // connection_does_not_exist
  '08006', // connection_failure
  '08001', // sqlclient_unable_to_establish_sqlconnection
  '08004', // sqlserver_rejected_establishment_of_sqlconnection
  '57P01', // admin_shutdown
  '57P02', // crash_shutdown
  '57P03', // cannot_connect_now
];

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as unknown).code;
    return RETRYABLE_ERROR_CODES.includes(code);
  }
  
  // Check for specific error messages
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return (
    message.includes('deadlock') ||
    message.includes('lock timeout') ||
    message.includes('connection') ||
    message.includes('timeout') ||
    message.includes('serialization failure') ||
    message.includes('could not connect') ||
    message.includes('connection terminated')
  );
}

/**
 * Check if an error is a connection error
 */
export function isConnectionError(error: unknown): boolean {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code?: string }).code;
    return CONNECTION_ERROR_CODES.includes(code);
  }
  
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return (
    message.includes('connection') ||
    message.includes('econnrefused') ||
    message.includes('enotfound') ||
    message.includes('etimedout') ||
    message.includes('socket')
  );
}

/**
 * Get a human-readable error message from a database error
 */
export function getDatabaseErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code?: string }).code;
    
    // PostgreSQL error codes to human-readable messages
    const errorMessages: Record<string, string> = {
      '23505': 'Cette donnée existe déjà (violation de contrainte d\'unicité)',
      '23503': 'Référence à une donnée qui n\'existe pas (violation de clé étrangère)',
      '23502': 'Donnée requise manquante (violation de contrainte NOT NULL)',
      '23514': 'Donnée invalide (violation de contrainte CHECK)',
      '22001': 'Donnée trop longue pour le champ',
      '22003': 'Valeur numérique hors limites',
      '22007': 'Format de date invalide',
      '22008': 'Valeur de date/heure hors limites',
      '22012': 'Division par zéro',
      '22P02': 'Syntaxe invalide pour le type',
      '42601': 'Erreur de syntaxe SQL',
      '42703': 'Colonne inexistante',
      '42P01': 'Table inexistante',
      '57014': 'Requête annulée (timeout dépassé)',
      '40001': 'Transaction en conflit, veuillez réessayer',
      '40P01': 'Conflit de verrouillage détecté, veuillez réessayer',
      '55P03': 'Ressource verrouillée, veuillez réessayer',
    };
    
    if (errorMessages[code]) {
      return errorMessages[code];
    }
  
  // Generic message
  if (error instanceof Error) {
    return `Erreur de base de données: ${error.message}`;
  }
  
  return 'Une erreur de base de données inattendue s\'est produite';
}

/**
 * Options for transaction execution
 */
export interface TransactionOptions {
  retries?: number;
  timeout?: number; // in milliseconds
  retryDelay?: number; // base delay between retries in milliseconds
  isolationLevel?: 'read uncommitted' | 'read committed' | 'repeatable read' | 'serializable';
}

// Mapping des isolation levels pour la compatibilité
const isolationLevelMap = {
  'READ UNCOMMITTED': 'read uncommitted',
  'READ COMMITTED': 'read committed',
  'REPEATABLE READ': 'repeatable read',
  'SERIALIZABLE': 'serializable',
  'read uncommitted': 'read uncommitted',
  'read committed': 'read committed',
  'repeatable read': 'repeatable read',
  'serializable': 'serializable'
} as const;

/**
 * Execute a database transaction with automatic retry and rollback
 * 
 * Supporte deux signatures :
 * 1. withTransaction(callback, options) - utilise le db global
 * 2. withTransaction(dbInstance, callback, options) - utilise l'instance db fournie
 * 
 * @param dbOrCallback - Instance DB ou callback de transaction
 * @param callbackOrOptions - Callback ou options de transaction
 * @param options - Options de transaction (si db est fourni)
 * @returns The result of the transaction
 * @throws DatabaseError if the transaction fails after all retries
 */
export async function withTransaction<T>(
  dbOrCallback: unknown | TransactionCallback<T>,
  callbackOrOptions?: TransactionCallback<T> | TransactionOptions,
  options?: TransactionOptions
): Promise<T> {
  // Déterminer si db est fourni ou non
  let dbInstance: unknown;
  let callback: TransactionCallback<T>;
  let opts: TransactionOptions;
  
  if (typeof dbOrCallback === 'function') {
    // Ancien format : withTransaction(callback, options)
    dbInstance = db;
    callback = dbOrCallback;
    opts = (callbackOrOptions as TransactionOptions) || {};
  } else {
    // Nouveau format : withTransaction(db, callback, options)
    dbInstance = dbOrCallback;
    callback = callbackOrOptions as TransactionCallback<T>;
    opts = options || {};
  }
  
  const {
    retries = 3,
    timeout = 30000, // 30 seconds default
    retryDelay = 100,
    isolationLevel = 'read committed'
  } = opts;
  
  let lastError: Error | undefined;
  const startTime = Date.now();
  
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      // Log transaction start
      logger.debug('Starting database transaction', { metadata: {
          module: 'DatabaseHelpers',
          operation: 'withTransaction',
          attempt: attempt + 1,
          maxRetries: retries,
          timeout,
          isolationLevel,
          usingCustomDb: dbInstance !== db
              }
            });
      
      // Execute transaction with timeout and isolation level
      const result = await dbInstance.transaction(async (tx) => {
        // Set transaction isolation level - Convert to uppercase for SQL
        const sqlIsolationLevel = isolationLevel.toUpperCase().replace(/ /g, ' ');
        await tx.execute(sql.raw(`SET TRANSACTION ISOLATION LEVEL ${sqlIsolationLevel}`));
        
        // Set transaction timeout
        if (timeout) {
          await tx.execute(sql.raw(`SET LOCAL statement_timeout = ${timeout}`));
        }
        
        // Execute the callback - tx is already a DrizzleTransaction type
        return await callback(tx as DrizzleTransaction);
      }, {
        isolationLevel, // Drizzle expects lowercase
        deferrable: false,
        readOnly: false
      });
      
      // Log success
      const duration = Date.now() - startTime;
      logger.info('Database transaction completed successfully', { metadata: {
          module: 'DatabaseHelpers',
          operation: 'withTransaction',
          duration,
          attempt: attempt + 1
              }
            });
      
      return result;
    } catch (error: unknown) {
      lastError = error;
      
      // Check if error is retryable
      const retryable = error?.code === '40001' || error?.code === '40P01'; // Serialization failure or deadlock
      
      if (retryable && attempt < retries - 1) {
        const delay = retryDelay * Math.pow(2, attempt); // Exponential backoff
        logger.warn('Database transaction failed, retrying', { metadata: {
                  module: 'DatabaseHelpers',
                  operation: 'withTransaction',
            attempt: attempt + 1,
            maxRetries: retries,
            errorCode: error?.code,
            delay
                }
                              });
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // Log final failure
      logger.error('Database transaction failed permanently', lastError, { metadata: {
          module: 'DatabaseHelpers',
          operation: 'withTransaction',
          attempt: attempt + 1,
          maxRetries: retries,
          duration,
          retryable,
          errorCode: (error as { code?: string }).code
              }
      });
      
      break;
    }
  
  // Throw a proper DatabaseError with context
  const message = getDatabaseErrorMessage(lastError);
  throw new DatabaseError(message, lastError);
}

/**
 * Execute a database transaction with automatic savepoints for nested transactions
 * 
 * @param parentTx - The parent transaction (if this is a nested transaction)
 * @param callback - The transaction logic to execute
 * @param options - Configuration options for the transaction
 * @returns The result of the transaction
 */
export async function withSavepoint<T>(
  parentTx: DrizzleTransaction,
  callback: TransactionCallback<T>,
  savepointName?: string
): Promise<T> {
  const name = savepointName || `sp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    // Create savepoint
    await parentTx.execute(sql.raw(`SAVEPOINT ${name}`));
    
    logger.debug('Created database savepoint', { metadata: {
        module: 'DatabaseHelpers',
        operation: 'withSavepoint',
        savepointName: name
            }
            });
    
    // Execute callback
    const result = await callback(parentTx);
    
    // Release savepoint on success
    await parentTx.execute(sql.raw(`RELEASE SAVEPOINT ${name}`));
    
    logger.debug('Released database savepoint', { metadata: {
        module: 'DatabaseHelpers',
        operation: 'withSavepoint',
        savepointName: name
            }
            });
    
    return result;
  } catch (error) {
    // Rollback to savepoint on error
    await parentTx.execute(sql.raw(`ROLLBACK TO SAVEPOINT ${name}`));
    
    logger.error('Database savepoint rolled back', { metadata: {
        module: 'DatabaseHelpers',
        operation: 'withSavepoint',
        savepointName: name,
        error: error instanceof Error ? error.message : String(error)
            }
            });
    
    throw error;
  }

/**
 * Batch execute multiple database operations in a single transaction
 * 
 * @param operations - Array of operations to execute
 * @param options - Configuration options for the transaction
 * @returns Array of results from each operation
 */
export async function withBatchTransaction<T>(
  operations: Array<(tx: DrizzleTransaction) => Promise<T>>,
  options: TransactionOptions = {}
): Promise<T[]> {
  return withTransaction(async (tx) => {
    const results: T[] = [];
    
    for (let i = 0; i < operations.length; i++) {
      await withErrorHandling(
    async () => {

        const result = await operations[i](tx);
        results.push(result);
      
    },
    {
      operation: 'serialization_failure',
      service: 'database-helpers',
      metadata: {
      });
    }
    
    return results;
  }, options);
}

/**
 * Check database connection health
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  return withErrorHandling(
    async () => {

    await db.execute(sql`SELECT 1`);
    return true;
  
    },
    {
      operation: 'serialization_failure',
      service: 'database-helpers',
      metadata: {
      });
}

/**
 * Wait for database to be available
 */
export async function waitForDatabase(
  maxWaitTime: number = 30000,
  checkInterval: number = 1000
): Promise<void> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitTime) {
    if (await checkDatabaseHealth()) {
      logger.info('Database connection established', { metadata: {
          module: 'DatabaseHelpers',
          operation: 'waitForDatabase',
          waitTime: Date.now() - startTime
              }
                  });