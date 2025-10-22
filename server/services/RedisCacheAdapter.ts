import Redis, { Redis as RedisClient } from 'ioredis';
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
      throw new Error('REDIS_URL is required for RedisCacheAdapter');
    }

    this.client = new Redis(connectionString, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number) => {
        if (times > this.MAX_RECONNECT_ATTEMPTS) {
          logger.error('[RedisCacheAdapter] Max reconnect attempts reached', {
            metadata: {
              service: 'RedisCacheAdapter',
              operation: 'retryStrategy',
              attempts: times
            }
          });
          return null;
        }

        const delay = Math.min(times * 1000, 5000);
        logger.warn('[RedisCacheAdapter] Reconnecting to Redis', {
          metadata: {
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
      }
    });

    this.client.on('connect', () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      logger.info('[RedisCacheAdapter] Connected to Redis', {
        metadata: {
          service: 'RedisCacheAdapter',
          operation: 'connect'
        }
      });
    });

    this.client.on('ready', () => {
      logger.info('[RedisCacheAdapter] Redis client ready', {
        metadata: {
          service: 'RedisCacheAdapter',
          operation: 'ready'
        }
      });
    });

    this.client.on('error', (error) => {
      this.isConnected = false;
      logger.error('[RedisCacheAdapter] Redis connection error', {
        metadata: {
          service: 'RedisCacheAdapter',
          operation: 'error',
          error: error.message
        }
      });
    });

    this.client.on('close', () => {
      this.isConnected = false;
      logger.warn('[RedisCacheAdapter] Redis connection closed', {
        metadata: {
          service: 'RedisCacheAdapter',
          operation: 'close'
        }
      });
    });

    logger.info('[RedisCacheAdapter] Initialized', {
      metadata: {
        service: 'RedisCacheAdapter',
        operation: 'constructor',
        redisUrl: connectionString.replace(/:[^:]*@/, ':***@') // Mask password
      }
    });
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(key);
      
      if (value === null) {
        return null;
      }

      return JSON.parse(value) as T;
    } catch (error) {
      logger.error('[RedisCacheAdapter] Error getting key', {
        metadata: {
          service: 'RedisCacheAdapter',
          operation: 'get',
          key,
          error: error instanceof Error ? error.message : String(error)
        }
      });
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      await this.client.setex(key, ttlSeconds, serialized);
    } catch (error) {
      logger.error('[RedisCacheAdapter] Error setting key', {
        metadata: {
          service: 'RedisCacheAdapter',
          operation: 'set',
          key,
          ttlSeconds,
          error: error instanceof Error ? error.message : String(error)
        }
      });
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      logger.error('[RedisCacheAdapter] Error deleting key', {
        metadata: {
          service: 'RedisCacheAdapter',
          operation: 'del',
          key,
          error: error instanceof Error ? error.message : String(error)
        }
      });
    }
  }

  async flush(): Promise<void> {
    try {
      await this.client.flushdb();
      logger.info('[RedisCacheAdapter] Cache flushed', {
        metadata: {
          service: 'RedisCacheAdapter',
          operation: 'flush'
        }
      });
    } catch (error) {
      logger.error('[RedisCacheAdapter] Error flushing cache', {
        metadata: {
          service: 'RedisCacheAdapter',
          operation: 'flush',
          error: error instanceof Error ? error.message : String(error)
        }
      });
    }
  }

  async keys(): Promise<string[]> {
    try {
      return await this.client.keys('*');
    } catch (error) {
      logger.error('[RedisCacheAdapter] Error getting keys', {
        metadata: {
          service: 'RedisCacheAdapter',
          operation: 'keys',
          error: error instanceof Error ? error.message : String(error)
        }
      });
      return [];
    }
  }

  async size(): Promise<number> {
    try {
      return await this.client.dbsize();
    } catch (error) {
      logger.error('[RedisCacheAdapter] Error getting size', {
        metadata: {
          service: 'RedisCacheAdapter',
          operation: 'size',
          error: error instanceof Error ? error.message : String(error)
        }
      });
      return 0;
    }
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
    try {
      await this.client.quit();
      logger.info('[RedisCacheAdapter] Disconnected from Redis', {
        metadata: {
          service: 'RedisCacheAdapter',
          operation: 'disconnect'
        }
      });
    } catch (error) {
      logger.error('[RedisCacheAdapter] Error disconnecting', {
        metadata: {
          service: 'RedisCacheAdapter',
          operation: 'disconnect',
          error: error instanceof Error ? error.message : String(error)
        }
      });
    }
  }
}
