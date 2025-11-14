/**
 * Safe query wrappers for database operations
 * Provides error handling and transformation for simple queries
 */

import { db } from '../db';
import { logger } from './logger';
import { DatabaseError } from './error-handler';
import { isRetryableError, getDatabaseErrorMessage } from './database-helpers';
import { withRetry } from './retry-helper';
import { withErrorHandling } from './error-handler';
import { sql } from 'drizzle-orm';

/**
 * Options for safe query execution
 */
export interface SafeQueryOptions {
  retries?: number;
  timeout?: number; // in milliseconds
  retryDelay?: number; // base delay between retries in milliseconds
  logQuery?: boolean; // whether to log the query for debugging
  service?: string; // service name for logging context
  operation?: string; // operation name for logging context
}

/**
 * Execute a single database query with error handling and retry logic
 * 
 * @param queryFn - The query function to execute
 * @param options - Configuration options for the query
 * @returns The result of the query
 * @throws DatabaseError if the query fails after all retries
 */
export async function safeQuery<T>(
  queryFn: () => Promise<T>,
  options: SafeQueryOptions = {}
): Promise<T> {
  const {
    retries = 3,
    timeout = 10000, // 10 seconds default
    retryDelay = 100,
    logQuery = false,
    service = 'SafeQuery',
    operation = 'executeQuery'
  } = options;
  
  const startTime = Date.now();
  
  return withRetry(
    async () => {
      // Log query start if requested
      if (logQuery) {
        logger.debug('Executing database query', {
          service,
          metadata: {
            operation,
            maxRetries: retries,
            timeout
          }
        });
      }
      
      // Create a promise that rejects after timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Query timeout after ${timeout}ms`));
        }, timeout);
      });
      
      // Race between query and timeout
      const result = await Promise.race([
        queryFn(),
        timeoutPromise
      ]);
      
      // Log success
      const duration = Date.now() - startTime;
      if (logQuery) {
        logger.info('Database query completed successfully', {
          service,
          metadata: {
            operation,
            duration
          }
        });
      }
      
      // Monitor slow queries (> 20s)
      if (duration >= 20000) {
        const { getSQLPerformanceMonitor } = await import('../services/SQLPerformanceMonitor');
        const monitor = getSQLPerformanceMonitor();
        monitor.recordQuery(
          {
            query: operation,
            duration,
            tablesQueried: [],
            executionPlan: undefined
          },
          {
            service,
            operation
          }
        );
      }
      
      return result;
    },
    {
      maxRetries: retries,
      initialDelay: retryDelay,
      backoffMultiplier: 2,
      retryCondition: (error: unknown) => {
        const err = error as Error & { code?: string };
        // Retry on serialization failure or deadlock
        return err.code === '40001' || err.code === '40P01' || isRetryableError(error);
      },
      onRetry: (attempt: number, delay: number, error: unknown) => {
        const err = error as Error & { code?: string };
        logger.warn('Database query failed, retrying', {
          service,
          metadata: {
            operation,
            attempt: attempt + 1,
            maxRetries: retries,
            errorCode: err.code,
            delay
          }
        });
      }
    }
  ).catch((error: unknown) => {
    // Type guard for Postgres error
    type PostgresError = Error & { 
      code?: string; 
      detail?: string; 
      constraint?: string; 
      table?: string; 
      column?: string;
    };
    
    const lastError = error instanceof Error 
      ? (error as PostgresError)
      : new Error(String(error)) as PostgresError;
    
    // Log final failure with Postgres error details
    const duration = Date.now() - startTime;
    logger.error('Database query failed permanently', lastError, {
      service,
      metadata: {
        operation,
        maxRetries: retries,
        duration,
        // Expose Postgres error details for debugging
        errorCode: lastError.code,
        errorDetail: lastError.detail,
        errorConstraint: lastError.constraint,
        errorTable: lastError.table,
        errorColumn: lastError.column,
        errorMessage: lastError.message
      }
    });
    
    // Transform to user-friendly error message
    const message = getDatabaseErrorMessage(lastError);
    throw new DatabaseError(message, lastError);
  });
}

/**
 * Execute multiple database queries in parallel with error handling
 * 
 * @param queries - Array of query functions to execute
 * @param options - Configuration options for the queries
 * @returns Array of results from each query
 * @throws DatabaseError if unknown query fails after all retries
 */
export async function safeBatch<T>(
  queries: Array<() => Promise<T>>,
  options: SafeQueryOptions = {}
): Promise<T[]> {
  const {
    service = 'SafeBatch',
    operation = 'executeBatch',
    ...queryOptions
  } = options;
  
  const startTime = Date.now();
  
  return withErrorHandling(
    async () => {
      logger.debug('Executing batch queries', {
        service,
        metadata: {
          operation,
          queryCount: queries.length
        }
      });
      
      // Execute all queries in parallel with individual error handling
      const results = await Promise.all(
        queries.map((queryFn, index) => 
          safeQuery(queryFn, {
            ...queryOptions,
            service,
            operation: `${operation}_query_${index + 1}`
          })
        )
      );
      
      const duration = Date.now() - startTime;
      logger.info('Batch queries completed successfully', {
        service,
        metadata: {
          operation,
          queryCount: queries.length,
          duration
        }
      });
      
      return results;
    },
    {
      operation,
      service,
      metadata: {
        queryCount: queries.length
      }
    }
  );
}

/**
 * Execute a query with structured error handling and metrics
 * Useful for wrapping existing query methods
 * 
 * @param context - Context information for logging and error handling
 * @param queryFn - The query function to execute
 * @returns The result of the query
 */
export async function executeWithMetrics<T>(
  context: {
    service: string;
    operation: string;
    userId?: string;
    metadata?: Record<string, unknown>;
  },
  queryFn: () => Promise<T>
): Promise<T> {
  return withErrorHandling(
    async () => {
      return await safeQuery(queryFn, {
        service: context.service,
        operation: context.operation,
        logQuery: true
      });
    },
    {
      operation: context.operation,
      service: context.service,
      userId: context.userId,
      metadata: context.metadata
    }
  );
}

/**
 * Helper to safely get a single record or null
 * Wraps query to handle not found gracefully
 * 
 * @param queryFn - The query function that might return undefined
 * @param entityName - Name of the entity for error messages
 * @param options - Query options
 * @returns The record or null
 */
export async function safeGetOne<T>(
  queryFn: () => Promise<T | undefined>,
  entityName: string = 'Record',
  options: SafeQueryOptions = {}
): Promise<T | null> {
  try {
    const result = await safeQuery(queryFn, options);
    return result ?? null;
  } catch (error) {
    // Retourner null au lieu de throw pour cette fonction utilitaire
    logger.error(`Error getting ${entityName}`, { metadata: {
        service: 'SafeQuery',
        operation: 'safeGetOne',
        entityName,
        error: error instanceof Error ? error.message : String(error)
            }
                                    });
    return null;
  }
}

/**
 * Helper to safely count records
 * Returns 0 on error instead of throwing
 * 
 * @param queryFn - The count query function
 * @param options - Query options
 * @returns The count or 0
 */
export async function safeCount(
  queryFn: () => Promise<number>,
  options: SafeQueryOptions = {}
): Promise<number> {
  try {
    return await safeQuery(queryFn, options);
  } catch (error) {
    // Retourner 0 au lieu de throw pour cette fonction utilitaire
    logger.error('Error counting records', { metadata: {
        service: 'SafeQuery',
        operation: 'safeCount',
        error: error instanceof Error ? error.message : String(error)
            }
                                    });
    return 0;
  }
}

/**
 * Helper to safely check if a record exists
 * Returns false on error instead of throwing
 * 
 * @param queryFn - The existence check query function
 * @param options - Query options
 * @returns True if exists, false otherwise
 */
export async function safeExists(
  queryFn: () => Promise<boolean | { exists: boolean }>,
  options: SafeQueryOptions = {}
): Promise<boolean> {
  try {
    const result = await safeQuery(queryFn, options);
    if (typeof result === 'boolean') {
      return result;
    }
    return result?.exists ?? false;
  } catch (error) {
    // Retourner false au lieu de throw pour cette fonction utilitaire
    logger.error('Error checking existence', { metadata: {
        service: 'SafeQuery',
        operation: 'safeExists',
        error: error instanceof Error ? error.message : String(error)
            }
                                    });
    return false;
  }
}

/**
 * Execute a database health check query
 * Used to verify database connectivity
 */
export async function healthCheck(): Promise<boolean> {
  try {
    await safeQuery(
      () => db.execute(sql`SELECT 1 as health`),
      {
        retries: 1,
        timeout: 5000,
        service: 'HealthCheck',
        operation: 'ping'
      }
    );
    return true;
  } catch (error) {
    // Retourner false au lieu de throw pour health check
    logger.error('Health check failed', { metadata: {
        service: 'SafeQuery',
        operation: 'healthCheck',
        error: error instanceof Error ? error.message : String(error)
      }
    });
    return false;
  }
}

/**
 * Wrapper for insert operations with conflict handling
 */
export async function safeInsert<T>(
  tableName: string,
  insertFn: () => Promise<T>,
  options: SafeQueryOptions = {}
): Promise<T> {
  return withErrorHandling(
    async () => {
      return await safeQuery(insertFn, {
        ...options,
        service: options.service || 'SafeInsert',
        operation: options.operation || `insert_${tableName}`
      });
    },
    {
      operation: options.operation || `insert_${tableName}`,
      service: options.service || 'SafeInsert',
      metadata: {
        tableName
      }
    }
  );
}

/**
 * Wrapper for delete operations with safety check
 */
export async function safeDelete<T>(
  tableName: string,
  deleteFn: () => Promise<T>,
  expectedCount?: number,
  options: SafeQueryOptions = {}
): Promise<T> {
  const result = await safeQuery(deleteFn, {
    ...options,
    service: options.service || 'SafeDelete',
    operation: options.operation || `delete_${tableName}`
  });
  
  // Check if delete affected expected number of rows
  if (expectedCount !== undefined && Array.isArray(result) && result.length !== expectedCount) {
    logger.warn('Delete affected unexpected number of rows', {
      service: options.service || 'SafeDelete',
      metadata: {
        operation: options.operation || `delete_${tableName}`,
        expectedCount,
        actualCount: result.length
      }
    });
  }
  
  return result;
}

// All utilities are already exported inline above