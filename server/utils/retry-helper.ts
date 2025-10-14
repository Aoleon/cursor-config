import { logger } from './logger';

/**
 * Options pour la configuration du système de retry
 */
export interface RetryOptions {
  /** Nombre maximum de tentatives (défaut: 3) */
  maxRetries?: number;
  /** Délai initial entre les tentatives en ms (défaut: 1000ms) */
  initialDelay?: number;
  /** Délai maximum entre les tentatives en ms (défaut: 10000ms) */
  maxDelay?: number;
  /** Multiplicateur pour le backoff exponentiel (défaut: 2) */
  backoffMultiplier?: number;
  /** Timeout pour chaque tentative en ms */
  timeout?: number;
  /** Condition pour déterminer si une erreur est retriable */
  retryCondition?: (error: any) => boolean;
  /** Fonction de callback appelée avant chaque retry */
  onRetry?: (attempt: number, delay: number, error: any) => void;
  /** Ajouter un jitter aléatoire au délai pour éviter le thundering herd */
  jitter?: boolean;
}

/**
 * Statistiques de retry pour le monitoring
 */
export interface RetryStats {
  attempts: number;
  totalDuration: number;
  lastError: any;
  succeeded: boolean;
  delays: number[];
}

/**
 * Détermine si une erreur est retriable par défaut
 * @param error L'erreur à évaluer
 * @returns true si l'erreur est retriable
 */
export function isRetryableError(error: any): boolean {
  // Ne pas retry sur les erreurs d'authentification et autorisation
  if (error.status === 401 || error.status === 403) {
    return false;
  }
  
  // Ne pas retry sur les erreurs de ressource non trouvée
  if (error.status === 404) {
    return false;
  }
  
  // Ne pas retry sur les erreurs de validation (bad request)
  if (error.status === 400) {
    return false;
  }
  
  // Retry sur les erreurs serveur (5xx)
  if (error.status >= 500 && error.status < 600) {
    return true;
  }
  
  // Retry sur les erreurs de rate limiting (429)
  if (error.status === 429) {
    return true;
  }
  
  // Retry sur les timeouts
  if (error.message?.toLowerCase().includes('timeout')) {
    return true;
  }
  
  // Retry sur les erreurs réseau
  if (error.code === 'ECONNRESET' || 
      error.code === 'ETIMEDOUT' || 
      error.code === 'ECONNREFUSED' ||
      error.code === 'ENOTFOUND' ||
      error.code === 'ENETUNREACH' ||
      error.message?.toLowerCase().includes('network')) {
    return true;
  }
  
  // Par défaut, ne pas retry
  return false;
}

/**
 * Calcule le délai de retry avec backoff exponentiel
 * @param attempt Numéro de la tentative (commence à 0)
 * @param options Options de retry
 * @returns Délai en millisecondes
 */
function calculateDelay(attempt: number, options: RetryOptions): number {
  const initialDelay = options.initialDelay ?? 1000;
  const backoffMultiplier = options.backoffMultiplier ?? 2;
  const maxDelay = options.maxDelay ?? 10000;
  
  // Calcul du délai avec backoff exponentiel
  let delay = initialDelay * Math.pow(backoffMultiplier, attempt);
  
  // Limiter au délai maximum
  delay = Math.min(delay, maxDelay);
  
  // Ajouter du jitter si activé (±25% du délai)
  if (options.jitter ?? true) {
    const jitterRange = delay * 0.25;
    const jitter = (Math.random() - 0.5) * 2 * jitterRange;
    delay = delay + jitter;
    delay = Math.max(delay, 0); // Assurer que le délai reste positif
  }
  
  return Math.floor(delay);
}

/**
 * Attendre un certain délai
 * @param ms Millisecondes à attendre
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Exécute une fonction avec un timeout
 * @param fn Fonction à exécuter
 * @param timeoutMs Timeout en millisecondes
 * @returns Promise qui se résout avec le résultat ou timeout
 */
async function withTimeout<T>(fn: () => Promise<T>, timeoutMs?: number): Promise<T> {
  if (!timeoutMs) {
    return fn();
  }
  
  const timeoutPromise = new Promise<T>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Operation timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });
  
  return Promise.race([fn(), timeoutPromise]);
}

/**
 * Exécute une fonction avec retry automatique et backoff exponentiel
 * @param fn Fonction async à exécuter
 * @param options Options de retry
 * @returns Promise avec le résultat ou throw la dernière erreur
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: RetryOptions
): Promise<T> {
  // Options par défaut - ne pas utiliser Required<> car timeout est optionnel
  const defaultOptions: RetryOptions = {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    retryCondition: isRetryableError,
    jitter: true,
    onRetry: () => {}
  };
  
  const opts: RetryOptions = {
    ...defaultOptions,
    ...options  // Override avec les options fournies
  };
  
  const stats: RetryStats = {
    attempts: 0,
    totalDuration: 0,
    lastError: null,
    succeeded: false,
    delays: []
  };
  
  const startTime = Date.now();
  let lastError: any = null;
  
  for (let attempt = 0; attempt <= (opts.maxRetries ?? 3); attempt++) {
    stats.attempts = attempt + 1;
    
    try {
      // Log de la tentative
      if (attempt > 0) {
        logger.info('Retry attempt', {
          metadata: {
            service: 'RetryHelper',
            operation: 'withRetry',
            attempt: attempt + 1,
            maxRetries: (opts.maxRetries ?? 3) + 1,
            delay: stats.delays[stats.delays.length - 1] || 0
          }
        });
      }
      
      // Exécuter la fonction avec timeout si spécifié
      const attemptStartTime = Date.now();
      const result = await withTimeout(fn, opts.timeout);
      
      // Succès !
      stats.succeeded = true;
      stats.totalDuration = Date.now() - startTime;
      
      if (attempt > 0) {
        logger.info('Retry succeeded', {
          metadata: {
            service: 'RetryHelper',
            operation: 'withRetry',
            attempt: attempt + 1,
            totalDuration: stats.totalDuration,
            totalAttempts: stats.attempts
          }
        });
      }
      
      return result;
      
    } catch (error) {
      lastError = error;
      stats.lastError = error;
      
      // Log de l'erreur
      logger.warn('Retry attempt failed', {
        metadata: {
          service: 'RetryHelper',
          operation: 'withRetry',
          attempt: attempt + 1,
          error: error instanceof Error ? error.message : String(error),
          errorCode: (error as any)?.code,
          errorStatus: (error as any)?.status
        }
      });
      
      // Vérifier si c'est la dernière tentative
      if (attempt >= (opts.maxRetries ?? 3)) {
        stats.totalDuration = Date.now() - startTime;
        
        logger.error('All retry attempts exhausted', {
          metadata: {
            service: 'RetryHelper',
            operation: 'withRetry',
            totalAttempts: stats.attempts,
            totalDuration: stats.totalDuration,
            delays: stats.delays,
            lastError: error instanceof Error ? error.message : String(error)
          }
        });
        
        // Enrichir l'erreur avec les statistiques de retry
        if (error instanceof Error) {
          (error as any).retryStats = stats;
        }
        
        throw error;
      }
      
      // Vérifier si l'erreur est retriable
      if (!(opts.retryCondition ?? isRetryableError)(error)) {
        logger.warn('Error not retriable, stopping retry', {
          metadata: {
            service: 'RetryHelper',
            operation: 'withRetry',
            attempt: attempt + 1,
            error: error instanceof Error ? error.message : String(error)
          }
        });
        
        stats.totalDuration = Date.now() - startTime;
        
        if (error instanceof Error) {
          (error as any).retryStats = stats;
        }
        
        throw error;
      }
      
      // Calculer le délai avant le prochain retry
      const delay = calculateDelay(attempt, opts);
      stats.delays.push(delay);
      
      // Callback avant le retry
      (opts.onRetry ?? (() => {}))(attempt + 1, delay, error);
      
      logger.info('Waiting before retry', {
        metadata: {
          service: 'RetryHelper',
          operation: 'withRetry',
          nextAttempt: attempt + 2,
          delayMs: delay,
          jitterEnabled: opts.jitter ?? true
        }
      });
      
      // Attendre avant le prochain retry
      await sleep(delay);
    }
  }
  
  // Ne devrait jamais arriver, mais au cas où
  throw lastError || new Error('Retry failed without error');
}

/**
 * Version simplifiée de withRetry pour des cas d'usage courants
 */
export async function retryWithExponentialBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  return withRetry(fn, {
    maxRetries,
    initialDelay: 1000,
    backoffMultiplier: 2,
    jitter: true
  });
}

/**
 * Retry avec une stratégie linéaire (délai constant)
 */
export async function retryWithLinearBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  return withRetry(fn, {
    maxRetries,
    initialDelay: delay,
    backoffMultiplier: 1, // Pas d'augmentation exponentielle
    jitter: false
  });
}

/**
 * Décorateur pour ajouter le retry automatique à une méthode de classe
 */
export function Retryable(options?: RetryOptions) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const boundMethod = originalMethod.bind(this);
      return withRetry(() => boundMethod(...args), options);
    };
    
    return descriptor;
  };
}