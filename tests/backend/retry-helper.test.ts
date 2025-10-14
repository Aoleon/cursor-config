import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { withRetry, isRetryableError, retryWithExponentialBackoff } from '../../server/utils/retry-helper';

describe('Retry Helper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('isRetryableError', () => {
    it('should not retry on 401 Unauthorized', () => {
      const error: any = { status: 401 };
      expect(isRetryableError(error)).toBe(false);
    });

    it('should not retry on 403 Forbidden', () => {
      const error: any = { status: 403 };
      expect(isRetryableError(error)).toBe(false);
    });

    it('should not retry on 404 Not Found', () => {
      const error: any = { status: 404 };
      expect(isRetryableError(error)).toBe(false);
    });

    it('should not retry on 400 Bad Request', () => {
      const error: any = { status: 400 };
      expect(isRetryableError(error)).toBe(false);
    });

    it('should retry on 500 Internal Server Error', () => {
      const error: any = { status: 500 };
      expect(isRetryableError(error)).toBe(true);
    });

    it('should retry on 429 Rate Limited', () => {
      const error: any = { status: 429 };
      expect(isRetryableError(error)).toBe(true);
    });

    it('should retry on timeout errors', () => {
      const error = new Error('Request timed out');
      expect(isRetryableError(error)).toBe(true);
    });

    it('should retry on network errors', () => {
      const error: any = new Error('Network error');
      error.code = 'ECONNRESET';
      expect(isRetryableError(error)).toBe(true);
    });
  });

  describe('withRetry', () => {
    it('should succeed on first try', async () => {
      const mockFn = vi.fn().mockResolvedValue('success');
      const result = await withRetry(mockFn);
      
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and succeed on second try', async () => {
      const mockFn = vi.fn()
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockResolvedValueOnce('success');
      
      const promise = withRetry(mockFn, {
        maxRetries: 2,
        initialDelay: 100,
        backoffMultiplier: 2
      });
      
      // Fast-forward through the delay
      await vi.runAllTimersAsync();
      
      const result = await promise;
      
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should respect maxRetries and throw after all attempts', async () => {
      const error = new Error('Persistent timeout');
      const mockFn = vi.fn().mockRejectedValue(error);
      
      const promise = withRetry(mockFn, {
        maxRetries: 2,
        initialDelay: 100
      });
      
      // Fast-forward through all delays
      await vi.runAllTimersAsync();
      
      await expect(promise).rejects.toThrow('Persistent timeout');
      expect(mockFn).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should use exponential backoff', async () => {
      const mockFn = vi.fn()
        .mockRejectedValueOnce(new Error('Timeout 1'))
        .mockRejectedValueOnce(new Error('Timeout 2'))
        .mockRejectedValueOnce(new Error('Timeout 3'))
        .mockResolvedValueOnce('success');
      
      const onRetry = vi.fn();
      
      const promise = withRetry(mockFn, {
        maxRetries: 3,
        initialDelay: 100,
        backoffMultiplier: 2,
        jitter: false, // Disable jitter for predictable testing
        onRetry
      });
      
      // Run all timers to completion
      await vi.runAllTimersAsync();
      
      const result = await promise;
      
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(4); // Initial + 3 retries
      
      // Check that onRetry was called with increasing delays
      expect(onRetry).toHaveBeenCalledTimes(3);
      expect(onRetry).toHaveBeenNthCalledWith(1, 1, 100, expect.any(Error));
      expect(onRetry).toHaveBeenNthCalledWith(2, 2, 200, expect.any(Error));
      expect(onRetry).toHaveBeenNthCalledWith(3, 3, 400, expect.any(Error));
    });

    it('should respect maxDelay', async () => {
      const mockFn = vi.fn()
        .mockRejectedValueOnce(new Error('Timeout 1'))
        .mockRejectedValueOnce(new Error('Timeout 2'))
        .mockRejectedValueOnce(new Error('Timeout 3'))
        .mockResolvedValueOnce('success');
      
      const onRetry = vi.fn();
      
      const promise = withRetry(mockFn, {
        maxRetries: 3,
        initialDelay: 1000,
        backoffMultiplier: 10, // Very high multiplier
        maxDelay: 2000, // But capped at 2000ms
        jitter: false,
        onRetry
      });
      
      await vi.runAllTimersAsync();
      
      const result = await promise;
      
      expect(result).toBe('success');
      
      // Check that delays are capped at maxDelay
      expect(onRetry).toHaveBeenNthCalledWith(1, 1, 1000, expect.any(Error));
      expect(onRetry).toHaveBeenNthCalledWith(2, 2, 2000, expect.any(Error)); // Capped
      expect(onRetry).toHaveBeenNthCalledWith(3, 3, 2000, expect.any(Error)); // Capped
    });

    it('should not retry non-retriable errors', async () => {
      const error: any = new Error('Bad Request');
      error.status = 400;
      
      const mockFn = vi.fn().mockRejectedValue(error);
      
      await expect(withRetry(mockFn)).rejects.toThrow('Bad Request');
      expect(mockFn).toHaveBeenCalledTimes(1); // No retries
    });

    it('should respect custom retryCondition', async () => {
      const customError = new Error('Custom error');
      const mockFn = vi.fn().mockRejectedValue(customError);
      
      const retryCondition = vi.fn().mockReturnValue(false);
      
      await expect(
        withRetry(mockFn, { retryCondition })
      ).rejects.toThrow('Custom error');
      
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(retryCondition).toHaveBeenCalledWith(customError);
    });

    it('should handle timeout with retry', async () => {
      const mockFn = vi.fn()
        .mockImplementationOnce(() => new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Operation timed out')), 2000)
        ))
        .mockResolvedValueOnce('success');
      
      const promise = withRetry(mockFn, {
        maxRetries: 1,
        timeout: 1000,
        initialDelay: 100
      });
      
      await vi.runAllTimersAsync();
      
      const result = await promise;
      
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should add jitter to delays when enabled', async () => {
      const mockFn = vi.fn()
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockResolvedValueOnce('success');
      
      const onRetry = vi.fn();
      
      // Mock Math.random to return a predictable value
      const originalRandom = Math.random;
      Math.random = vi.fn().mockReturnValue(0.5);
      
      const promise = withRetry(mockFn, {
        maxRetries: 1,
        initialDelay: 1000,
        jitter: true,
        onRetry
      });
      
      await vi.runAllTimersAsync();
      
      await promise;
      
      // With jitter, delay should be 1000 ± 25%
      expect(onRetry).toHaveBeenCalledWith(1, 1000, expect.any(Error));
      
      Math.random = originalRandom;
    });
  });

  describe('retryWithExponentialBackoff', () => {
    it('should use default exponential backoff settings', async () => {
      const mockFn = vi.fn()
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockResolvedValueOnce('success');
      
      const promise = retryWithExponentialBackoff(mockFn);
      
      await vi.runAllTimersAsync();
      
      const result = await promise;
      
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('retry stats', () => {
    it('should include retry stats in the error when all attempts fail', async () => {
      const error = new Error('Persistent error');
      const mockFn = vi.fn().mockRejectedValue(error);
      
      const promise = withRetry(mockFn, {
        maxRetries: 2,
        initialDelay: 100
      });
      
      await vi.runAllTimersAsync();
      
      try {
        await promise;
        expect.fail('Should have thrown');
      } catch (err: any) {
        expect(err.retryStats).toBeDefined();
        expect(err.retryStats.attempts).toBe(3);
        expect(err.retryStats.succeeded).toBe(false);
        expect(err.retryStats.delays).toHaveLength(2);
        expect(err.retryStats.lastError).toBe(error);
        expect(err.retryStats.totalDuration).toBeGreaterThan(0);
      }
    });
  });
});