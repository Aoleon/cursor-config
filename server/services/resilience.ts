/**
 * Centralized resilience configuration for external services
 * 
 * Provides preconfigured retry + circuit breaker wrappers for all external APIs:
 * - Monday.com
 * - OpenAI (GPT, Claude)
 * - SendGrid
 * 
 * Each provider has tuned configuration for optimal resilience.
 */

import { retryService, type RetryOptions } from '../utils/retry-service.js';
import { circuitBreakerManager, type CircuitBreakerOptions } from '../utils/circuit-breaker.js';
import { logger } from '../utils/logger.js';

// ========================================
// CONFIGURATION PAR SERVICE
// ========================================

/**
 * Monday.com: Lower backoff for rate limits, higher retry count
 */
const MONDAY_RETRY_CONFIG: Partial<RetryOptions> = {
  maxAttempts: 5,
  initialDelayMs: 500,  // 500ms initial
  maxDelayMs: 10000,     // 10s max
};

/**
 * Monday.com: Lower threshold for rate limits
 */
const MONDAY_CIRCUIT_CONFIG: CircuitBreakerOptions = {
  threshold: 3,          // 3 errors triggers open
  timeout: 60000,        // 60s before half-open
  errorWindow: 30000,    // 30s window for counting errors
};

/**
 * OpenAI: Longer timeouts for completions, moderate retries
 */
const OPENAI_RETRY_CONFIG: Partial<RetryOptions> = {
  maxAttempts: 3,
  initialDelayMs: 1000,  // 1s initial
  maxDelayMs: 30000,     // 30s max
};

/**
 * OpenAI: Higher threshold for expensive completions
 */
const OPENAI_CIRCUIT_CONFIG: CircuitBreakerOptions = {
  threshold: 5,          // 5 errors triggers open
  timeout: 120000,       // 120s before half-open
  errorWindow: 60000,    // 60s window for counting errors
};

/**
 * SendGrid: Lower retries to avoid duplicate emails
 */
const SENDGRID_RETRY_CONFIG: Partial<RetryOptions> = {
  maxAttempts: 2,
  initialDelayMs: 1000,  // 1s initial
  maxDelayMs: 5000,      // 5s max
};

/**
 * SendGrid: Lower threshold to prevent duplicate sends
 */
const SENDGRID_CIRCUIT_CONFIG: CircuitBreakerOptions = {
  threshold: 2,          // 2 errors triggers open
  timeout: 60000,        // 60s before half-open
  errorWindow: 60000,    // 60s window for counting errors
};

// ========================================
// CIRCUIT BREAKER INITIALIZATION
// ========================================

/**
 * Initialize all circuit breakers with provider-specific configurations
 * Called once at module load
 */
function initializeCircuitBreakers() {
  // Register Monday.com breaker
  circuitBreakerManager.getBreaker('monday', MONDAY_CIRCUIT_CONFIG);
  
  // Register OpenAI breakers (gpt, claude, openai)
  circuitBreakerManager.getBreaker('gpt', OPENAI_CIRCUIT_CONFIG);
  circuitBreakerManager.getBreaker('claude', OPENAI_CIRCUIT_CONFIG);
  circuitBreakerManager.getBreaker('openai', OPENAI_CIRCUIT_CONFIG);
  
  // Register SendGrid breaker
  circuitBreakerManager.getBreaker('sendgrid', SENDGRID_CIRCUIT_CONFIG);
  
  logger.info('Circuit breakers initialized', {
    metadata: {
      service: 'Resilience',
      operation: 'initializeCircuitBreakers',
      providers: ['monday', 'gpt', 'claude', 'openai', 'sendgrid']
    }
  });
}

// Initialize breakers at module load
initializeCircuitBreakers();

// ========================================
// MODEL NORMALIZATION
// ========================================

/**
 * Normalize OpenAI model names to fixed breaker keys
 * - All GPT variants (gpt-4, gpt-4o-mini, etc.) -> 'gpt'
 * - All Claude variants (claude-3, claude-2, etc.) -> 'claude'
 * - Others -> 'openai'
 */
function normalizeModelName(model?: string): 'gpt' | 'claude' | 'openai' {
  if (!model) {
    return 'openai';
  }
  
  const lowerModel = model.toLowerCase();
  
  if (lowerModel.includes('gpt')) {
    return 'gpt';
  }
  
  if (lowerModel.includes('claude')) {
    return 'claude';
  }
  
  return 'openai';
}

// ========================================
// WRAPPERS PRÉCONFIGURÉS
// ========================================

/**
 * Execute Monday.com API call with retry + circuit breaker
 */
export async function executeMonday<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<T> {
  const breaker = circuitBreakerManager.getBreaker('monday');
  
  try {
    return await breaker.execute(async () => {
      return await retryService.execute(operation, MONDAY_RETRY_CONFIG);
    });
  } catch (error) {
    logger.error('Monday.com operation failed after retries', {
      metadata: {
        service: 'Resilience',
        provider: 'monday',
        operation: operationName,
        error: error instanceof Error ? error.message : String(error)
      }
    });
    throw error;
  }
}

/**
 * Execute OpenAI API call with retry + circuit breaker
 * Automatically normalizes model names to fixed breaker keys
 */
export async function executeOpenAI<T>(
  operation: () => Promise<T>,
  operationName: string,
  model?: string
): Promise<T> {
  // Normalize model name to fixed breaker key
  const breakerName = normalizeModelName(model);
  const breaker = circuitBreakerManager.getBreaker(breakerName);
  
  try {
    return await breaker.execute(async () => {
      return await retryService.execute(operation, OPENAI_RETRY_CONFIG);
    });
  } catch (error) {
    logger.error('OpenAI operation failed after retries', {
      metadata: {
        service: 'Resilience',
        provider: breakerName,
        operation: operationName,
        model: model,
        normalizedModel: breakerName,
        error: error instanceof Error ? error.message : String(error)
      }
    });
    throw error;
  }
}

/**
 * Execute SendGrid email dispatch with retry + circuit breaker
 */
export async function executeSendGrid<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<T> {
  const breaker = circuitBreakerManager.getBreaker('sendgrid');
  
  try {
    return await breaker.execute(async () => {
      return await retryService.execute(operation, SENDGRID_RETRY_CONFIG);
    });
  } catch (error) {
    logger.error('SendGrid operation failed after retries', {
      metadata: {
        service: 'Resilience',
        provider: 'sendgrid',
        operation: operationName,
        error: error instanceof Error ? error.message : String(error)
      }
    });
    throw error;
  }
}

// ========================================
// MONITORING HELPERS
// ========================================

/**
 * Get resilience stats for all providers
 */
export function getResilienceStats() {
  return {
    circuitBreakers: circuitBreakerManager.getAllStats(),
    retryService: {
      // Add retry service stats if available
      configured: true,
      providers: ['monday', 'openai', 'gpt', 'claude', 'sendgrid']
    }
  };
}

/**
 * Reset all circuit breakers (useful for testing)
 */
export function resetAllBreakers() {
  circuitBreakerManager.resetAll();
  logger.info('All circuit breakers reset', {
    metadata: {
      service: 'Resilience',
      operation: 'resetAllBreakers'
    }
  });
}
