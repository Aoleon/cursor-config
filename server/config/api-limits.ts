/**
 * Configuration centralisée pour tous les timeouts et limites d'API
 * Cette configuration permet de gérer de manière cohérente les limites
 * et comportements de retry pour tous les services externes
 */

export interface ModelConfig {
  timeout: number;
  maxRetries?: number;
  backoffMultiplier?: number;
}

export interface AIProviderConfig {
  timeout: number;
  maxRetries: number;
  backoffMultiplier: number;
  initialDelay?: number;
  maxDelay?: number;
  models?: Record<string, ModelConfig>;
  circuitBreaker?: {
    enabled: boolean;
    threshold: number;
    timeout: number;
  };
}

export interface DatabaseConfig {
  queryTimeout: number;
  transactionTimeout: number;
  connectionTimeout?: number;
  poolTimeout?: number;
  maxRetries?: number;
}

export interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour: number;
  burstLimit: number;
}

export const API_LIMITS = {
  ai: {
    claude: {
      timeout: 20000,        // 20s par tentative
      maxRetries: 3,
      backoffMultiplier: 1.5,
      initialDelay: 1000,    // 1s délai initial
      maxDelay: 10000,       // 10s délai maximum
      models: {
        'claude-sonnet-4-20250514': { 
          timeout: 20000,    // 20s pour Sonnet 4
          maxRetries: 3
        },
        'claude-opus-4': { 
          timeout: 35000,    // 35s pour Opus (modèle plus lourd)
          maxRetries: 2      // Moins de retries car plus coûteux
        },
        'claude-3-5-sonnet': {
          timeout: 15000,    // 15s pour l'ancienne version
          maxRetries: 3
        }
      },
      circuitBreaker: {
        enabled: true,
        threshold: 5,        // Ouvrir après 5 échecs consécutifs
        timeout: 60000       // Se refermer après 1 minute
      }
    } as AIProviderConfig,
    
    openai: {
      timeout: 15000,        // 15s par tentative
      maxRetries: 3,
      backoffMultiplier: 2,
      initialDelay: 1000,
      maxDelay: 10000,
      models: {
        'gpt-5': {
          timeout: 20000,    // 20s pour GPT-5
          maxRetries: 3
        },
        'gpt-4': {
          timeout: 15000,    // 15s pour GPT-4
          maxRetries: 3
        },
        'gpt-4-turbo': {
          timeout: 12000,    // 12s pour GPT-4 Turbo (plus rapide)
          maxRetries: 3
        },
        'gpt-3.5-turbo': {
          timeout: 8000,     // 8s pour GPT-3.5 (plus léger)
          maxRetries: 4      // Plus de retries car moins coûteux
        }
      },
      circuitBreaker: {
        enabled: true,
        threshold: 5,
        timeout: 60000
      }
    } as AIProviderConfig,
    
    // Configuration par défaut pour d'autres providers IA
    default: {
      timeout: 15000,
      maxRetries: 3,
      backoffMultiplier: 2,
      initialDelay: 1000,
      maxDelay: 10000,
      circuitBreaker: {
        enabled: true,
        threshold: 5,
        timeout: 60000
      }
    } as AIProviderConfig
  },
  
  database: {
    queryTimeout: 10000,        // 10s pour les requêtes
    transactionTimeout: 15000,  // 15s pour les transactions
    connectionTimeout: 5000,    // 5s pour établir la connexion
    poolTimeout: 30000,         // 30s pour obtenir une connexion du pool
    maxRetries: 2               // Retry limité pour la DB
  } as DatabaseConfig,
  
  // Limites de rate limiting par utilisateur
  rateLimit: {
    user: {
      requestsPerMinute: 20,
      requestsPerHour: 100,
      burstLimit: 5          // Rafale max de 5 requêtes
    } as RateLimitConfig,
    
    system: {
      requestsPerMinute: 100,
      requestsPerHour: 1000,
      burstLimit: 20
    } as RateLimitConfig
  },
  
  // Timeouts pour d'autres services
  services: {
    email: {
      timeout: 10000,
      maxRetries: 2
    },
    ocr: {
      timeout: 30000,        // OCR peut être lent
      maxRetries: 2
    },
    pdf: {
      timeout: 20000,
      maxRetries: 2
    },
    monday: {
      timeout: 15000,
      maxRetries: 3
    },
    batigest: {
      timeout: 10000,
      maxRetries: 3
    }
  },
  
  // Configuration globale de monitoring
  monitoring: {
    slowRequestThreshold: 3000,     // Requête lente > 3s
    criticalThreshold: 10000,       // Requête critique > 10s
    metricsEnabled: true,
    loggingLevel: process.env.NODE_ENV === 'production' ? 'warn' : 'info'
  }
} as const;

/**
 * Helper pour obtenir la configuration d'un modèle IA spécifique
 */
export function getModelConfig(
  provider: 'claude' | 'openai', 
  modelName?: string
): AIProviderConfig & { modelTimeout?: number } {
  const providerConfig = API_LIMITS.ai[provider] || API_LIMITS.ai.default;
  
  if (modelName && providerConfig.models?.[modelName]) {
    const modelConfig = providerConfig.models[modelName];
    return {
      ...providerConfig,
      modelTimeout: modelConfig.timeout,
      timeout: modelConfig.timeout || providerConfig.timeout,
      maxRetries: modelConfig.maxRetries || providerConfig.maxRetries
    };
  }
  
  return providerConfig;
}

/**
 * Helper pour obtenir les limites de rate limiting d'un utilisateur
 */
export function getUserRateLimit(userRole?: string): RateLimitConfig {
  // Les admins ont des limites système
  if (userRole === 'admin' || userRole === 'system') {
    return API_LIMITS.rateLimit.system;
  }
  
  return API_LIMITS.rateLimit.user;
}

/**
 * Helper pour vérifier si une requête est considérée comme lente
 */
export function isSlowRequest(duration: number): boolean {
  return duration > API_LIMITS.monitoring.slowRequestThreshold;
}

/**
 * Helper pour vérifier si une requête est critique
 */
export function isCriticalRequest(duration: number): boolean {
  return duration > API_LIMITS.monitoring.criticalThreshold;
}