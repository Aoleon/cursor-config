/**
 * Enhanced database configuration with robust error handling and monitoring
 * Provides connection pool management with automatic recovery
 */

import { Pool, neonConfig, PoolClient } from '@neondatabase/serverless';
import { withErrorHandling } from './utils/error-handler';
import { AppError, NotFoundError, ValidationError, AuthorizationError } from './utils/error-handler';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as schema from '@shared/schema';
import { logger } from '../utils/logger';
import { EventEmitter } from 'events';

// ========================================
// CONFIGURATION WEBSOCKET NEON
// ========================================
neonConfig.webSocketConstructor = ws;
neonConfig.fetchConnectionCache = true;

// ========================================
// CONNECTION STATE MANAGEMENT
// ========================================

class ConnectionManager extends EventEmitter {
  private pool: Pool | null = null;
  private isConnected: boolean = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private reconnectDelay: number = 1000; // Start with 1 second
  private maxReconnectDelay: number = 30000; // Max 30 seconds
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private connectionStats = {
    totalConnections: 0,
    failedConnections: 0,
    successfulQueries: 0,
    failedQueries: 0,
    lastError: null as Date | null,
    lastSuccess: null as Date | null,
    uptime: Date.now()
  };

  constructor() {
    super();
    this.initializePool();
    this.startHealthCheck();
    this.setupProcessHandlers();
  }

  /**
   * Initialize the connection pool with enhanced configuration
   */
  private initializePool(): void {
    if (!process.env.DATABASE_URL) {
      const error = new Error('DATABASE_URL must be set. Did you forget to provision a database?');
      logger.fatal('Database configuration error', error, { metadata: {
          module: 'DatabaseConfig',
          operation: 'initializePool'
              });
      throw error;
    }

    return withErrorHandling(
    async () => {

      // Create pool with optimized settings
      this.pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 25,                       // Maximum 25 connexions simultanées
        min: 5,                        // Minimum 5 connexions toujours actives
        idleTimeoutMillis: 30000,      // 30 secondes avant fermeture connexion inactive
        connectionTimeoutMillis: 10000, // 10 secondes timeout pour obtenir connexion
        maxUses: 7500,                 // Rotation après 7500 utilisations
        allowExitOnIdle: true,          // Permet fermeture propre si inactif
        query_timeout: 30000,           // 30 seconds query timeout
        statement_timeout: 30000,       // 30 seconds statement timeout
      });

      this.attachPoolListeners();
      this.isConnected = true;
      this.connectionStats.lastSuccess = new Date();
      
      logger.info('Database pool initialized successfully', { metadata: {
          module: 'DatabaseConfig',
          operation: 'initializePool',
          poolSize: 25,
          minConnections: 5
        }
            });

    
    },
    {
      operation: 'now',
      service: 'config',
      metadata: {
                                                                                }
                                                                              });

    // Connection lifecycle events
    this.pool.on('connect', (client: PoolClient) => {
      this.connectionStats.totalConnections++;
      
      logger.debug('New pool connection established', { metadata: {
          module: 'DatabaseConfig',
          operation: 'poolConnect',
          totalConnections: this.connectionStats.totalConnections
        }
            });
      
      this.emit('connect', client);
    });

    this.pool.on('acquire', (client: PoolClient) => {
      // Debug level - too verbose for production
      if (process.env.NODE_ENV === 'development') {
        logger.debug('Connection acquired from pool', { metadata: {
            module: 'DatabaseConfig',
            operation: 'poolAcquire'
        }
            });
                                                                              }
                                                                            });

    this.pool.on('remove', (client: PoolClient) => {
      logger.debug('Connection removed from pool', { metadata: {
          module: 'DatabaseConfig',
          operation: 'poolRemove'
        }
            });
    });
  }

  /**
   * Check if error is critical and requires reconnection
   */
  private isCriticalError(error: Error): boolean {
    const criticalMessages = [
      'connection terminated',
      'connection lost',
      'econnrefused',
      'enotfound',
      'etimedout',
      'pool destroyed',
      'database system is shutting down',
      'fatal',
      'panic'
    ];

    const message = error.message.toLowerCase();
    return criticalMessages.some(msg => message.includes(msg));
  }

  /**
   * Handle initialization errors
   */
  private handleInitializationError(error: unknown): void {
    this.isConnected = false;
    this.connectionStats.lastError = new Date();
    
    logger.error('Failed to initialize database pool', error as Error, { metadata: {
        module: 'DatabaseConfig',
        operation: 'initializePool'
                                }
                              });

    // Schedule reconnection attempt
    this.handleReconnection();
  }

  /**
   * Handle reconnection with exponential backoff
   */
  private handleReconnection(): void {
    // Clear existing timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    // Check max attempts
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.fatal('Maximum reconnection attempts reached', undefined, { metadata: {
          module: 'DatabaseConfig',
          operation: 'handleReconnection',
          attempts: this.reconnectAttempts
              });
      
      this.emit('maxReconnectAttemptsReached');
      return;
    }

    // Calculate delay with exponential backoff
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts),
      this.maxReconnectDelay
    );

    logger.info('Scheduling database reconnection', { metadata: {
        module: 'DatabaseConfig',
        operation: 'handleReconnection',
        attempt: this.reconnectAttempts + 1,
        delayMs: delay
        }
            });

    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.reconnect();
    }, delay);
  }

  /**
   * Attempt to reconnect to the database
   */
  private async reconnect(): Promise<void> {
    logger.info('Attempting database reconnection', { metadata: {
        module: 'DatabaseConfig',
        operation: 'reconnect',
        attempt: this.reconnectAttempts
        }
            });

    return withErrorHandling(
    async () => {

      // Close existing pool if any
      if (this.pool) {
        try {
          await this.pool.end();
        } catch (error) {
          logger.error('Error closing pool', { metadata: {
              module: 'DatabaseConfig',
              operation: 'disconnect',
              error: error instanceof Error ? error.message : String(error)

      });
        }
      }
    },
    {
      operation: 'disconnect',
      service: 'config',
      metadata: {
                                                                                }
                                                                              });
  }

  /**
   * Test database connection
   */
  private async testConnection(): Promise<void> {
    if (!this.pool) {
      throw new AppError('Pool not initialized', 500);
    }

    const client = await this.pool.connect();
    return withErrorHandling(
    async () => {
      try {
        await client.query('SELECT 1');
        this.connectionStats.successfulQueries++;
        this.connectionStats.lastSuccess = new Date();
      } finally {
        client.release();
      }
    },
    {
      operation: 'testConnection',
      service: 'config',
      metadata: {
      });
  }

  /**
   * Start periodic health checks
   */
  private startHealthCheck(): void {
    // Clear existing interval
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // Health check every 30 seconds
    this.healthCheckInterval = setInterval(async () => {
      if (!this.isConnected || !this.pool) {
        return;
      }

      try {
        await this.testConnection();
      } catch (error) {
        logger.error('Health check failed', { metadata: {
            module: 'DatabaseConfig',
            operation: 'healthCheck',
            error: error instanceof Error ? error.message : String(error)
        }
            });
        
        if (this.isCriticalError(error as Error)) {
          this.isConnected = false;
          this.handleReconnection();
        }
      }
}, 30000); // 30 seconds;
  }

  /**
   * Setup process event handlers for graceful shutdown
   */
  private setupProcessHandlers(): void {
    const gracefulShutdown = async (signal: string) => {
      logger.info('Received shutdown signal, closing database pool', { metadata: {
          module: 'DatabaseConfig',
          operation: 'gracefulShutdown',
          signal
                                }
                              });

      await this.close();
      process.exit(0);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.fatal('Uncaught exception in database config', error, { metadata: {
          module: 'DatabaseConfig',
          operation: 'uncaughtException'
              });
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.fatal('Unhandled promise rejection in database config', reason as Error, { metadata: {
          module: 'DatabaseConfig',
          operation: 'unhandledRejection',
          promise: String(promise)
              });
    });
  }

  /**
   * Get the current pool instance
   */
  getPool(): Pool | null {
    return this.pool;
  }

  /**
   * Get connection statistics
   */
  getStats() {
    if (!this.pool) {
      return {
        ...this.connectionStats,
        poolStats: {
          totalConnections: 0,
          idleConnections: 0,
          waitingRequests: 0
        }
      };
    }

    return {
      ...this.connectionStats,
      poolStats: {
        totalConnections: this.pool.totalCount,
        idleConnections: this.pool.idleCount,
        waitingRequests: this.pool.waitingCount
      },
      uptime: Date.now() - this.connectionStats.uptime,
      isConnected: this.isConnected
    };
  }

  /**
   * Check if database is connected
   */
  isReady(): boolean {
    return this.isConnected && this.pool !== null;
  }

  /**
   * Close the database pool
   */
  async close(): Promise<void> {
    // Clear timers
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // Close pool
    if (this.pool) {
      logger.info('Closing database pool', { metadata: {
          module: 'DatabaseConfig',
          operation: 'close'
        }
            });

      return withErrorHandling(
    async () => {

        await this.pool.end();
        logger.info('Database pool closed successfully', { metadata: {
            module: 'DatabaseConfig',
            operation: 'close'

      });
      
    },
    {
      operation: 'now',
      service: 'config',
      metadata: {
                                                                                }
                                                                              });

      this.pool = null;
      this.isConnected = false;
      this.emit('closed');
    }
  }
}

// ========================================
// SINGLETON INSTANCE
// ========================================

// Create singleton connection manager
const connectionManager = new ConnectionManager();

// Export pool getter (for compatibility)
export const getPool = () => connectionManager.getPool();

// Export database instance with enhanced pool
export const db = drizzle({ 
  client: connectionManager.getPool() as Pool, 
  schema 
});

// Export connection manager methods
export const getPoolStats = () => connectionManager.getStats();
export const isDatabaseReady = () => connectionManager.isReady();
export const closePool = () => connectionManager.close();

// Export connection manager for event handling
export { connectionManager };

// Re-export the original db instance for compatibility
export { db as enhancedDb };