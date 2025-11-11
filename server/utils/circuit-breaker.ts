import { logger } from './logger';
import { withErrorHandling } from './utils/error-handler';

/**
 * Options de configuration du circuit breaker
 */
export interface CircuitBreakerOptions {
  /** Nombre d'échecs avant d'ouvrir le circuit (défaut: 5) */
  threshold?: number;
  /** Temps en ms avant de passer en half-open (défaut: 60000ms = 1min) */
  timeout?: number;
  /** Fenêtre de temps pour compter les échecs en ms (défaut: 60000ms) */
  errorWindow?: number;
  /** Callback quand le circuit s'ouvre */
  onOpen?: (name: string) => void;
  /** Callback quand le circuit se ferme */
  onClose?: (name: string) => void;
  /** Callback quand le circuit passe en half-open */
  onHalfOpen?: (name: string) => void;
}

/**
 * États possibles du circuit breaker
 */
export type CircuitState = 'closed' | 'open' | 'half-open';

/**
 * Enum CircuitState pour compatibilité
 */
export enum CircuitStateEnum {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half-open'
}

/**
 * Statistiques du circuit breaker pour monitoring
 */
export interface CircuitBreakerStats {
  state: CircuitState;
  failures: number;
  successes: number;
  totalRequests: number;
  lastFailureTime?: Date;
  lastSuccessTime?: Date;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
}

/**
 * Circuit Breaker pour éviter de surcharger les services externes
 */
export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failures: number = 0;
  private successes: number = 0;
  private totalRequests: number = 0;
  private consecutiveFailures: number = 0;
  private consecutiveSuccesses: number = 0;
  private lastFailureTime?: Date;
  private lastSuccessTime?: Date;
  private errorTimestamps: number[] = [];
  private halfOpenRequests: number = 0;
  private readonly maxHalfOpenRequests: number = 1;
  
  // Options avec valeurs par défaut
  private readonly threshold: number;
  private readonly timeout: number;
  private readonly errorWindow: number;
  private readonly onOpen?: (name: string) => void;
  private readonly onClose?: (name: string) => void;
  private readonly onHalfOpen?: (name: string) => void;
  
  constructor(
    private readonly name: string,
    options?: CircuitBreakerOptions
  ) {
    this.threshold = options?.threshold ?? 5;
    this.timeout = options?.timeout ?? 60000;
    this.errorWindow = options?.errorWindow ?? 60000;
    this.onOpen = options?.onOpen;
    this.onClose = options?.onClose;
    this.onHalfOpen = options?.onHalfOpen;
  }
  
  /**
   * Exécute une fonction avec protection du circuit breaker
   * @param fn Fonction à exécuter
   * @returns Résultat de la fonction ou throw une erreur
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Vérifier l'état du circuit
    const canExecute = this.canExecute();
    
    if (!canExecute) {
      this.totalRequests++;
      const error = new Error(`Circuit breaker is open for ${this.name}`);
      (error as any).circuitBreakerOpen = true;
      (error as any).circuitBreakerName = this.name;
      (error as any).nextRetryTime = this.getNextRetryTime();
      
      logger.warn('Circuit breaker rejected request', { metadata: {
          service: 'CircuitBreaker',
          operation: 'execute',
          circuitName: this.name,
          state: this.state,
          consecutiveFailures: this.consecutiveFailures
        }
            });
      
      throw error;
    }
    
    // Si en half-open, limiter le nombre de requêtes simultanées
    if (this.state === 'half-open') {
      this.halfOpenRequests++;
      
      if (this.halfOpenRequests > this.maxHalfOpenRequests) {
        this.halfOpenRequests--;
        const error = new Error(`Circuit breaker is testing recovery for ${this.name}`);
        (error as any).circuitBreakerTesting = true;
        throw error;
      }
    }
    
    this.totalRequests++;
    
    return withErrorHandling(
    async () => {

      // Exécuter la fonction
      const result = await fn();
      
      // Enregistrer le succès
      this.onSuccess();
      
      if (this.state === 'half-open') {
        this.halfOpenRequests--;
      }
      
      return result;
      
    
    },
    {
      operation: 'circuit',
      service: 'circuit-breaker',
      metadata: {
      });
    
    // Si fermé et trop d'échecs dans la fenêtre, ouvrir
    if (this.state === 'closed') {
      const recentErrors = this.getRecentErrorCount();
      if (recentErrors >= this.threshold) {
        this.transitionToOpen();
      }
    }
  }
  
  /**
   * Nettoie les anciens timestamps d'erreurs
   */
  private cleanOldErrors(): void {
    const now = Date.now();
    const cutoff = now - this.errorWindow;
    this.errorTimestamps = this.errorTimestamps.filter(ts => ts > cutoff);
  }
  
  /**
   * Compte le nombre d'erreurs récentes dans la fenêtre
   */
  private getRecentErrorCount(): number {
    this.cleanOldErrors();
    return this.errorTimestamps.length;
  }
  
  /**
   * Vérifie si on peut passer de open à half-open
   */
  private shouldTransitionToHalfOpen(): boolean {
    if (!this.lastFailureTime) {
      return true;
    }
    
    const timeSinceLastFailure = Date.now() - this.lastFailureTime.getTime();
    return timeSinceLastFailure >= this.timeout;
  }
  
  /**
   * Obtient le temps avant le prochain retry possible
   */
  private getNextRetryTime(): Date | null {
    if (this.state !== 'open' || !this.lastFailureTime) {
      return null;
    }
    
    return new Date(this.lastFailureTime.getTime() + this.timeout);
  }
  
  /**
   * Transition vers l'état closed
   */
  private transitionToClosed(): void {
    const previousState = this.state;
    this.state = 'closed';
    this.consecutiveFailures = 0;
    this.halfOpenRequests = 0;
    
    logger.info('Circuit breaker closed', { metadata: {
        service: 'CircuitBreaker',
        operation: 'transitionToClosed',
        circuitName: this.name,
        previousState,
        stats: this.getStats()
        }
            });
    
    if (this.onClose) {
      this.onClose(this.name);
    }
  }
  
  /**
   * Transition vers l'état open
   */
  private transitionToOpen(): void {
    const previousState = this.state;
    this.state = 'open';
    this.halfOpenRequests = 0;
    
    logger.warn('Circuit breaker opened', { metadata: {
        service: 'CircuitBreaker',
        operation: 'transitionToOpen',
        circuitName: this.name,
        previousState,
        consecutiveFailures: this.consecutiveFailures,
        stats: this.getStats()
        }
            });
    
    if (this.onOpen) {
      this.onOpen(this.name);
    }
  }
  
  /**
   * Transition vers l'état half-open
   */
  private transitionToHalfOpen(): void {
    const previousState = this.state;
    this.state = 'half-open';
    this.consecutiveSuccesses = 0;
    this.consecutiveFailures = 0;
    this.halfOpenRequests = 0;
    
    logger.info('Circuit breaker half-open', { metadata: {
        service: 'CircuitBreaker',
        operation: 'transitionToHalfOpen',
        circuitName: this.name,
        previousState,
        stats: this.getStats()
        }
            });
    
    if (this.onHalfOpen) {
      this.onHalfOpen(this.name);
    }
  }
  
  /**
   * Obtient les statistiques du circuit breaker
   */
  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      totalRequests: this.totalRequests,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      consecutiveFailures: this.consecutiveFailures,
      consecutiveSuccesses: this.consecutiveSuccesses
    };
  }
  
  /**
   * Réinitialise le circuit breaker
   */
  reset(): void {
    this.state = 'closed';
    this.failures = 0;
    this.successes = 0;
    this.totalRequests = 0;
    this.consecutiveFailures = 0;
    this.consecutiveSuccesses = 0;
    this.lastFailureTime = undefined;
    this.lastSuccessTime = undefined;
    this.errorTimestamps = [];
    this.halfOpenRequests = 0;
    
    logger.info('Circuit breaker reset', { metadata: {
        service: 'CircuitBreaker',
        operation: 'reset',
        circuitName: this.name
        }
            });
  }
  
  /**
   * Force l'ouverture du circuit
   */
  forceOpen(): void {
    this.transitionToOpen();
  }
  
  /**
   * Force la fermeture du circuit
   */
  forceClose(): void {
    this.transitionToClosed();
  }
}

/**
 * Gestionnaire global des circuit breakers
 */
export class CircuitBreakerManager {
  private static instance: CircuitBreakerManager;
  private readonly breakers: Map<string, CircuitBreaker> = new Map();
  
  private constructor() {}
  
  /**
   * Obtient l'instance singleton du manager
   */
  static getInstance(): CircuitBreakerManager {
    if (!CircuitBreakerManager.instance) {
      CircuitBreakerManager.instance = new CircuitBreakerManager();
    }
    return CircuitBreakerManager.instance;
  }
  
  /**
   * Obtient ou crée un circuit breaker
   */
  getBreaker(name: string, options?: CircuitBreakerOptions): CircuitBreaker {
    let breaker = this.breakers.get(name);
    
    if (!breaker) {
      breaker = new CircuitBreaker(name, options);
      this.breakers.set(name, breaker);
      
      logger.info('Circuit breaker created', { metadata: {
          service: 'CircuitBreakerManager',
          operation: 'getBreaker',
          circuitName: name
        }
            });
    }
    
    return breaker;
  }
  
  /**
   * Alias pour getBreaker (compatibilité)
   */
  getOrCreate(name: string, options?: CircuitBreakerOptions): CircuitBreaker {
    return this.getBreaker(name, options);
  }
  
  /**
   * Obtient les statistiques de tous les circuit breakers
   */
  getAllStats(): Record<string, CircuitBreakerStats> {
    const stats: Record<string, CircuitBreakerStats> = {};
    
    for (const [name, breaker] of Array.from(this.breakers)) {
      stats[name] = breaker.getStats();
    }
    
    return stats;
  }
  
  /**
   * Réinitialise tous les circuit breakers
   */
  resetAll(): void {
    for (const breaker of Array.from(this.breakers.values())) {
      breaker.reset();
    }
    
    logger.info('All circuit breakers reset', { metadata: {
        service: 'CircuitBreakerManager',
        operation: 'resetAll',
        count: this.breakers.size
        }
            });
  }
  
  /**
   * Supprime un circuit breaker
   */
  removeBreaker(name: string): void {
    this.breakers.delete(name);
  }
}

// Export instance globale pour compatibilité avec nouveau code
export const circuitBreakerManager = CircuitBreakerManager.getInstance();