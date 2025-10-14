/**
 * Rate Limit Monitoring Utilities
 * 
 * Tracks and reports rate limit violations for security monitoring
 */

import { logger } from './logger';

// In-memory store for rate limit violations (in production, use Redis or DB)
interface RateLimitViolation {
  endpoint: string;
  userId?: string;
  userEmail?: string;
  ip?: string;
  timestamp: Date;
  count: number;
}

class RateLimitMonitor {
  private violations = new Map<string, RateLimitViolation>();
  private alertThresholds = {
    warningCount: 10, // Warn after 10 violations from same source
    criticalCount: 50, // Critical alert after 50 violations
    timeWindow: 3600000 // 1 hour window
  };

  /**
   * Record a rate limit violation
   */
  recordViolation(endpoint: string, userId?: string, userEmail?: string, ip?: string): void {
    const key = userId ? `user:${userId}:${endpoint}` : `ip:${ip}:${endpoint}`;
    const existing = this.violations.get(key);
    
    if (existing) {
      const timeSinceFirst = Date.now() - existing.timestamp.getTime();
      
      // Reset counter if outside time window
      if (timeSinceFirst > this.alertThresholds.timeWindow) {
        this.violations.set(key, {
          endpoint,
          userId,
          userEmail,
          ip,
          timestamp: new Date(),
          count: 1
        });
      } else {
        existing.count++;
        this.checkAlertThresholds(existing);
      }
    } else {
      this.violations.set(key, {
        endpoint,
        userId,
        userEmail,
        ip,
        timestamp: new Date(),
        count: 1
      });
    }
  }

  /**
   * Check if alert thresholds are exceeded
   */
  private checkAlertThresholds(violation: RateLimitViolation): void {
    if (violation.count >= this.alertThresholds.criticalCount) {
      logger.error('[RateLimitMonitor] CRITICAL: Excessive rate limit violations', {
        metadata: {
          violation: {
            endpoint: violation.endpoint,
            userId: violation.userId,
            userEmail: violation.userEmail,
            ip: violation.ip,
            count: violation.count,
            timestamp: violation.timestamp
          },
          alert: 'CRITICAL',
          action: 'Possible attack or abuse detected'
        }
      });
      
      // TODO: Send alert to administrators
      // TODO: Consider automatic temporary IP/user ban
      
    } else if (violation.count >= this.alertThresholds.warningCount) {
      logger.warn('[RateLimitMonitor] WARNING: Multiple rate limit violations', {
        metadata: {
          violation: {
            endpoint: violation.endpoint,
            userId: violation.userId,
            userEmail: violation.userEmail,
            ip: violation.ip,
            count: violation.count,
            timestamp: violation.timestamp
          },
          alert: 'WARNING'
        }
      });
    }
  }

  /**
   * Get statistics for monitoring dashboard
   */
  getStatistics(): {
    totalViolations: number;
    violationsByEndpoint: Record<string, number>;
    topViolators: Array<{ key: string; count: number }>;
    recentViolations: RateLimitViolation[];
  } {
    const now = Date.now();
    const stats = {
      totalViolations: 0,
      violationsByEndpoint: {} as Record<string, number>,
      topViolators: [] as Array<{ key: string; count: number }>,
      recentViolations: [] as RateLimitViolation[]
    };

    // Clean up old violations and collect stats
    const activeViolations: Array<[string, RateLimitViolation]> = [];
    
    this.violations.forEach((violation, key) => {
      const age = now - violation.timestamp.getTime();
      
      if (age > this.alertThresholds.timeWindow) {
        this.violations.delete(key);
      } else {
        activeViolations.push([key, violation]);
        stats.totalViolations += violation.count;
        
        // Count by endpoint
        if (!stats.violationsByEndpoint[violation.endpoint]) {
          stats.violationsByEndpoint[violation.endpoint] = 0;
        }
        stats.violationsByEndpoint[violation.endpoint] += violation.count;
      }
    });

    // Get top violators
    stats.topViolators = activeViolations
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .map(([key, violation]) => ({
        key,
        count: violation.count
      }));

    // Get recent violations (last 10)
    stats.recentViolations = activeViolations
      .sort((a, b) => b[1].timestamp.getTime() - a[1].timestamp.getTime())
      .slice(0, 10)
      .map(([_, violation]) => violation);

    return stats;
  }

  /**
   * Clear all violation records (for testing)
   */
  clearViolations(): void {
    this.violations.clear();
    logger.info('[RateLimitMonitor] All violation records cleared');
  }

  /**
   * Export violations for analysis
   */
  exportViolations(): RateLimitViolation[] {
    return Array.from(this.violations.values());
  }
}

// Singleton instance
const monitor = new RateLimitMonitor();

/**
 * Public function to monitor rate limit violations
 */
export function monitorRateLimit(
  endpoint: string, 
  userId?: string,
  userEmail?: string,
  ip?: string
): void {
  // Log the rate limit event
  logger.warn('[RateLimit] Rate limit exceeded', {
    metadata: {
      endpoint,
      userId,
      userEmail,
      ip,
      timestamp: new Date().toISOString(),
      event: 'rate_limit_exceeded'
    }
  });
  
  // Record in monitor
  monitor.recordViolation(endpoint, userId, userEmail, ip);
  
  // Increment metrics counter (for future integration with metrics service)
  incrementRateLimitMetric(endpoint);
}

/**
 * Get rate limit statistics
 */
export function getRateLimitStats() {
  return monitor.getStatistics();
}

/**
 * Clear rate limit violations (testing only)
 */
export function clearRateLimitViolations() {
  if (process.env.NODE_ENV !== 'production') {
    monitor.clearViolations();
  }
}

/**
 * Export violations for analysis
 */
export function exportRateLimitViolations() {
  return monitor.exportViolations();
}

/**
 * Increment rate limit metric (for future metrics integration)
 */
function incrementRateLimitMetric(endpoint: string): void {
  // TODO: Integrate with metrics service when available
  // For now, just log it
  logger.debug('[RateLimitMonitor] Metric incremented', {
    metadata: {
      metric: 'rate_limit_exceeded',
      endpoint,
      timestamp: new Date().toISOString()
    }
  });
}

/**
 * Generate rate limit report
 */
export function generateRateLimitReport(): string {
  const stats = getRateLimitStats();
  const report = [
    '=== Rate Limit Violation Report ===',
    `Generated: ${new Date().toISOString()}`,
    `Total Violations: ${stats.totalViolations}`,
    '',
    'Violations by Endpoint:',
    ...Object.entries(stats.violationsByEndpoint).map(
      ([endpoint, count]) => `  ${endpoint}: ${count}`
    ),
    '',
    'Top Violators:',
    ...stats.topViolators.map(
      (v, i) => `  ${i + 1}. ${v.key}: ${v.count} violations`
    ),
    '',
    'Recent Violations:',
    ...stats.recentViolations.map(v => 
      `  ${v.timestamp.toISOString()} - ${v.endpoint} - ${v.userId || v.ip} (${v.count} total)`
    )
  ].join('\n');
  
  return report;
}

// Periodic cleanup (run every hour)
setInterval(() => {
  const stats = monitor.getStatistics();
  if (stats.totalViolations > 0) {
    logger.info('[RateLimitMonitor] Hourly stats', {
      metadata: {
        totalViolations: stats.totalViolations,
        uniqueEndpoints: Object.keys(stats.violationsByEndpoint).length,
        topViolator: stats.topViolators[0]
      }
    });
  }
}, 3600000); // 1 hour