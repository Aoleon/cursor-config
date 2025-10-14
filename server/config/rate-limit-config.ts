/**
 * Rate Limit Configuration
 * 
 * Centralized configuration for rate limiting across the application
 */

export interface RateLimitConfig {
  windowMs: number;
  max: number;
  message: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: 'ip' | 'user' | 'ip+user' | 'custom';
  skipForRoles?: string[];
}

/**
 * Rate limit configurations for different endpoint categories
 * Times are in milliseconds, counts are absolute
 */
export const RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
  // High priority - Resource intensive endpoints
  chatbot: {
    windowMs: 60_000, // 1 minute
    max: 10,
    message: 'Limite chatbot atteinte. Maximum 10 requêtes par minute.',
    keyGenerator: 'ip+user',
    skipForRoles: ['admin', 'super_admin']
  },
  
  auth: {
    windowMs: 900_000, // 15 minutes
    max: 5,
    message: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.',
    skipSuccessfulRequests: true,
    keyGenerator: 'ip'
  },
  
  passwordReset: {
    windowMs: 3600_000, // 1 hour
    max: 3,
    message: 'Trop de demandes de réinitialisation. Maximum 3 par heure.',
    keyGenerator: 'ip'
  },
  
  ocr: {
    windowMs: 300_000, // 5 minutes
    max: 5,
    message: 'Limite OCR atteinte. Maximum 5 documents toutes les 5 minutes.',
    keyGenerator: 'ip+user'
  },
  
  documentAnalysis: {
    windowMs: 300_000, // 5 minutes
    max: 5,
    message: 'Limite d\'analyse atteinte. Maximum 5 analyses toutes les 5 minutes.',
    keyGenerator: 'ip+user'
  },
  
  // Medium priority - Regular operations
  supplierPortal: {
    windowMs: 60_000, // 1 minute
    max: 30,
    message: 'Limite portail fournisseur atteinte. Maximum 30 requêtes par minute.',
    keyGenerator: 'ip'
  },
  
  pdfGeneration: {
    windowMs: 60_000, // 1 minute
    max: 20,
    message: 'Limite génération PDF atteinte. Maximum 20 par minute.',
    keyGenerator: 'ip+user'
  },
  
  projects: {
    windowMs: 60_000, // 1 minute
    max: 100,
    message: 'Limite projets atteinte. Maximum 100 requêtes par minute.',
    keyGenerator: 'ip+user',
    skipForRoles: ['admin']
  },
  
  // Low priority - General API access
  general: {
    windowMs: 60_000, // 1 minute
    max: 100,
    message: 'Trop de requêtes. Veuillez ralentir.',
    keyGenerator: 'ip+user',
    skipForRoles: ['admin', 'super_admin']
  },
  
  upload: {
    windowMs: 60_000, // 1 minute
    max: 10,
    message: 'Trop d\'uploads. Maximum 10 fichiers par minute.',
    keyGenerator: 'ip+user'
  },
  
  creation: {
    windowMs: 60_000, // 1 minute
    max: 20,
    message: 'Trop de créations. Maximum 20 par minute.',
    keyGenerator: 'ip+user'
  },
  
  analytics: {
    windowMs: 60_000, // 1 minute
    max: 50,
    message: 'Trop de requêtes analytics. Maximum 50 par minute.',
    keyGenerator: 'ip+user'
  },
  
  email: {
    windowMs: 600_000, // 10 minutes
    max: 5,
    message: 'Trop d\'emails. Maximum 5 toutes les 10 minutes.',
    keyGenerator: 'ip+user'
  }
};

/**
 * Get rate limit config with environment-specific adjustments
 */
export function getRateLimitConfig(configName: string): RateLimitConfig {
  const config = RATE_LIMIT_CONFIGS[configName];
  
  if (!config) {
    // Return default config if not found
    return RATE_LIMIT_CONFIGS.general;
  }
  
  // In development, be more lenient
  if (process.env.NODE_ENV === 'development') {
    return {
      ...config,
      max: config.max * 2, // Double the limits in dev
      message: `[DEV] ${config.message}`
    };
  }
  
  return config;
}

/**
 * Dynamic rate limit adjustment based on time of day
 * Useful for handling peak vs off-peak hours
 */
export function getDynamicRateLimit(baseConfig: RateLimitConfig): RateLimitConfig {
  const hour = new Date().getHours();
  const isPeakHours = hour >= 9 && hour <= 18; // 9 AM to 6 PM
  
  if (isPeakHours) {
    // Slightly stricter during peak hours
    return {
      ...baseConfig,
      max: Math.floor(baseConfig.max * 0.8)
    };
  }
  
  // More lenient during off-peak
  return {
    ...baseConfig,
    max: Math.floor(baseConfig.max * 1.2)
  };
}

/**
 * Rate limit presets for common scenarios
 */
export const RATE_LIMIT_PRESETS = {
  strict: { multiplier: 0.5, message: 'Limite stricte appliquée' },
  normal: { multiplier: 1, message: 'Limite normale appliquée' },
  lenient: { multiplier: 2, message: 'Limite assouplie appliquée' },
  unlimited: { multiplier: 1000, message: 'Pas de limite appliquée' }
};

/**
 * Apply preset to a config
 */
export function applyPreset(
  configName: string, 
  preset: keyof typeof RATE_LIMIT_PRESETS
): RateLimitConfig {
  const baseConfig = getRateLimitConfig(configName);
  const presetConfig = RATE_LIMIT_PRESETS[preset];
  
  return {
    ...baseConfig,
    max: Math.floor(baseConfig.max * presetConfig.multiplier),
    message: `${presetConfig.message}: ${baseConfig.message}`
  };
}