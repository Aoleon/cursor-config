import Redis, { Redis as RedisClient } from 'ioredis';
import { withErrorHandling } from './utils/error-handler';
import { AppError, NotFoundError, ValidationError, AuthorizationError } from './utils/error-handler';
import { logger } from '../utils/logger';
import type { ICacheAdapter } from './CacheService';

// ========================================
// REDIS CACHE ADAPTER
// ========================================

export class RedisCacheAdapter implements ICacheAdapter {
  private client: RedisClient;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 5;

  constructor(redisUrl?: string) {
    const connectionString = redisUrl || process.env.REDIS_URL;

    if (!connectionString) {
      throw new AppError('REDIS_URL is required for RedisCacheAdapter', 500);
    }

    this.client = new Redis(connectionString, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number) => {
        if (times > this.MAX_RECONNECT_ATTEMPTS) {
          logger.error('[RedisCacheAdapter] Max reconnect attempts reached', { metadata: {
              service: 'RedisCacheAdapter',
                    operation: 'retryStrategy',
              attempts: times 

                  }
 
              
                                                                                                                                                                                                                                                                                    });
          return null;
        }
        const delay = Math.min(times * 1000, 5000);
        logger.warn('[RedisCacheAdapter] Reconnecting to Redis', { metadata: {
            service: 'RedisCacheAdapter',
                  operation: 'retryStrategy',
            attempt: times,
            delayMs: delay 

                }
 
              
                                                                                                                                                                                                                                                                                    });
        return delay;
      },
      reconnectOnError: (err) => {
        const targetErrors = ['READONLY', 'ECONNREFUSED', 'ETIMEDOUT'];
        return targetErrors.some(targetError => err.message.includes(targetError));
      });

    this.client.on('connect', () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      logger.info('[RedisCacheAdapter] Connected to Redis', { metadata: {
          service: 'RedisCacheAdapter',
          operation: 'connect' 

              }
 
              
                                                                                                                                                                                                                                                                                    });

    this.client.on('ready', () => {
      logger.info('[RedisCacheAdapter] Redis client ready', { metadata: {
          service: 'RedisCacheAdapter',
          operation: 'ready' 

              }
 
              
                                                                                                                                                                                                                                                                                    });

    this.client.on('error', (error) => {
      this.isConnected = false;
      logger.error('[RedisCacheAdapter] Redis connection error', { metadata: {
          service: 'RedisCacheAdapter',
          operation: 'error',
          error: error.message 

              }
 
              
                                                                                                                                                                                                                                                                                    });

    this.client.on('close', () => {
      this.isConnected = false;
      logger.warn('[RedisCacheAdapter] Redis connection closed', { metadata: {
          service: 'RedisCacheAdapter',
          operation: 'close' 

              }
 
              
                                                                                                                                                                                                                                                                                    });

    logger.info('[RedisCacheAdapter] Initialized', { metadata: {
        service: 'RedisCacheAdapter',
        operation: 'constructor',
        redisUrl: connectionString.replace(/:[^:]*@/, ':***@') // Mask password 
              
            }
 
              
            });
  }
  async get<T>(key: string): Promise<T | null> {
    return withErrorHandling(
    async () => {

      const value = await this.client.get(key);
      
      if (value === null) {
        return null;
      }

      return JSON.parse(value) as T;
    
    },
    {
      operation: 'constructor',
      service: 'RedisCacheAdapter',
      metadata: {
      });
      return null;
    }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    return withErrorHandling(
    async () => {

      const serialized = JSON.stringify(value);
      await this.client.setex(key, ttlSeconds, serialized);
    
    },
    {
      operation: 'constructor',
      service: 'RedisCacheAdapter',
      metadata: {}
    } );
    }

  async del(key: string): Promise<void> {
    return withErrorHandling(
    async () => {

      await this.client.del(key);
    
    },
    {
      operation: 'constructor',
      service: 'RedisCacheAdapter',
      metadata: {
      });
    }

  async flush(): Promise<void> {
    return withErrorHandling(
    async () => {

      await this.client.flushdb();
      logger.info('[RedisCacheAdapter] Cache flushed', { metadata: {
          service: 'RedisCacheAdapter',
          operation: 'flush'
            });
    },
    {
      operation: 'constructor',
      service: 'RedisCacheAdapter',
      metadata: {}
    } );
    }

  async keys(): Promise<string[]> {
    return withErrorHandling(
    async () => {

      return await this.client.keys('*');
    
    },
    {
      operation: 'constructor',
      service: 'RedisCacheAdapter',
      metadata: {
      });
      return [];
    }

  async size(): Promise<number> {
    return withErrorHandling(
    async () => {

      return await this.client.dbsize();
    
    },
    {
      operation: 'constructor',
      service: 'RedisCacheAdapter',
      metadata: {
      });
      return 0;
    }

  /**
   * Check if Redis is connected and ready
   */
  isReady(): boolean {
    return this.isConnected && this.client.status === 'ready';
  }

  /**
   * Gracefully disconnect from Redis
   */
  async disconnect(): Promise<void> {
    return withErrorHandling(
    async () => {

      await this.client.quit();
      logger.info('[RedisCacheAdapter] Disconnected from Redis', { metadata: {
          service: 'RedisCacheAdapter',
          operation: 'disconnect'
            });
    },
    {
      operation: 'constructor',
      service: 'RedisCacheAdapter',
      metadata: {}
    } );
    }
