/**
 * Service Retry avec Exponential Backoff
 * Gère les tentatives automatiques pour services externes instables
 */
import { logger } from './logger';
import { withErrorHandling } from './utils/error-handler';

export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  retryableErrors?: Array<string | RegExp>;
  onRetry?: (attempt: number, error: Error) => void;
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'onRetry'>> = {
  maxAttempts: 3,
  initialDelayMs: 1000,      // 1 seconde
  maxDelayMs: 30000,          // 30 secondes max
  backoffMultiplier: 2,
  retryableErrors: [
    /ECONNREFUSED/,
    /ETIMEDOUT/,
    /ENOTFOUND/,
    /network/i,
    /timeout/i,
    /503/,
    /429/  // Rate limiting
  ]
};

/**
 * Détermine si l'erreur est retryable
 */
function isRetryableError(error: Error, retryableErrors: Array<string | RegExp>): boolean {
  const errorMessage = error.message || '';
  return retryableErrors.some(pattern => {
    if (typeof pattern === 'string') {
      return errorMessage.includes(pattern);
    }
    return pattern.test(errorMessage);
  });
}

/**
 * Calcule le délai avec exponential backoff + jitter
 */
function calculateDelay(attempt: number, options: Required<Omit<RetryOptions, 'onRetry'>>): number {
  const exponentialDelay = options.initialDelayMs * Math.pow(options.backoffMultiplier, attempt - 1);
  const cappedDelay = Math.min(exponentialDelay, options.maxDelayMs);
  // Ajouter jitter (±20%) pour éviter thundering herd
  const jitter = cappedDelay * 0.2 * (Math.random() - 0.5);
  return Math.floor(cappedDelay + jitter);
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Exécute une fonction avec retry automatique
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    return withErrorHandling(
    async () => {

      const result = await fn();
      
      if (attempt > 1) {
        logger.info('Retry successful', {
          metadata: {
            module: 'RetryService',
            operation: 'withRetry',
            attempt,
            totalAttempts: opts.maxAttempts
          }
        });
      }
      
      return result;
    
    },
    {
      operation: 'isRetryableError',
      service: 'retry-service',
      metadata: {}
    }
  );
      
      // Vérifier si l'erreur est retryable
      if (!isRetryableError(lastError, opts.retryableErrors)) {
        logger.warn('Non-retryable error encountered', {
          metadata: {
            module: 'RetryService',
            operation: 'withRetry',
            error: lastError.message,
            attempt
          }
        });
        throw lastError;
      }
      
      // Calculer délai et attendre
      const delayMs = calculateDelay(attempt, opts);
      
      logger.warn('Retrying after error', {
        metadata: {
          module: 'RetryService',
          operation: 'withRetry',
          attempt,
          maxAttempts: opts.maxAttempts,
          delayMs,
          error: lastError.message
        }
      });
      
      if (options.onRetry) {
        options.onRetry(attempt, lastError);
      }
      
      await sleep(delayMs);
    }
  }
  
  // TypeScript safety - ne devrait jamais arriver ici
  throw lastError!;
}

/**
 * Classe RetryService pour configuration globale
 */
export class RetryService {
  constructor(private defaultOptions: RetryOptions = {}) {}
  
  async execute<T>(fn: () => Promise<T>, options?: RetryOptions): Promise<T> {
    return withRetry(fn, { ...this.defaultOptions, ...options });
  }
}

// Export instance par défaut
export const retryService = new RetryService();
