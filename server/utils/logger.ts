/**
 * Service de logging structuré pour Saxium
 * Remplace les console.log dispersés avec un système unifié et configurable
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';
type LogContext = {
  service?: string;
  userId?: string;
  traceId?: string;
  metadata?: Record<string, any>;
};

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
}

class Logger {
  private serviceName: string;
  private minLevel: LogLevel;
  private isDevelopment: boolean;

  // Mappage des niveaux pour filtrage
  private static readonly LEVEL_PRIORITY: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
    fatal: 4
  };

  constructor(serviceName: string = 'Saxium') {
    this.serviceName = serviceName;
    this.isDevelopment = process.env.NODE_ENV !== 'production';
    this.minLevel = this.isDevelopment ? 'debug' : 'info';
  }

  /**
   * Détermine si un log doit être affiché selon le niveau minimum
   */
  private shouldLog(level: LogLevel): boolean {
    return Logger.LEVEL_PRIORITY[level] >= Logger.LEVEL_PRIORITY[this.minLevel];
  }

  /**
   * Formate un log de manière structurée
   */
  private formatLog(entry: LogEntry): string {
    if (this.isDevelopment) {
      // Format lisible pour développement
      const emoji = this.getLevelEmoji(entry.level);
      const timestamp = new Date(entry.timestamp).toLocaleTimeString('fr-FR');
      const contextStr = entry.context?.service ? `[${entry.context.service}]` : `[${this.serviceName}]`;
      const traceStr = entry.context?.traceId ? ` (trace:${entry.context.traceId.substring(0, 8)})` : '';
      const metaStr = entry.context?.metadata ? ` ${JSON.stringify(entry.context.metadata)}` : '';
      
      return `${emoji} ${timestamp} ${contextStr}${traceStr} ${entry.message}${metaStr}`;
    } else {
      // Format JSON pour production (facilite parsing par outils monitoring)
      return JSON.stringify(entry);
    }
  }

  /**
   * Emoji pour visualisation rapide du niveau
   */
  private getLevelEmoji(level: LogLevel): string {
    const emojis: Record<LogLevel, string> = {
      debug: '🔍',
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌',
      fatal: '🚨'
    };
    return emojis[level];
  }

  /**
   * Méthode centrale de logging
   */
  private log(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: {
        service: context?.service || this.serviceName,
        ...context
      }
    };

    if (error) {
      entry.error = {
        message: error.message,
        stack: error.stack,
        code: (error as any).code
      };
    }

    const formatted = this.formatLog(entry);

    // Routing vers console appropriée
    switch (level) {
      case 'debug':
      case 'info':
        console.log(formatted);
        break;
      case 'warn':
        console.warn(formatted);
        break;
      case 'error':
      case 'fatal':
        console.error(formatted);
        break;
    }
  }

  /**
   * Méthodes publiques pour chaque niveau
   */
  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  error(message: string, errorOrContext?: Error | LogContext, context?: LogContext): void {
    if (errorOrContext instanceof Error) {
      this.log('error', message, context, errorOrContext);
    } else {
      this.log('error', message, errorOrContext);
    }
  }

  fatal(message: string, errorOrContext?: Error | LogContext, context?: LogContext): void {
    if (errorOrContext instanceof Error) {
      this.log('fatal', message, context, errorOrContext);
    } else {
      this.log('fatal', message, errorOrContext);
    }
  }

  /**
   * Crée un logger enfant avec un service spécifique
   */
  child(serviceName: string): Logger {
    return new Logger(serviceName);
  }

  /**
   * Timer pour mesurer performance (remplace console.time/timeEnd)
   */
  time(label: string): () => void {
    const start = Date.now();
    return () => {
      const duration = Date.now() - start;
      this.debug(`${label} completed in ${duration}ms`, {
        metadata: { duration, label }
      });
    };
  }
}

// Export logger global par défaut
export const logger = new Logger('Saxium');

// Export classe pour créer des loggers spécifiques
export { Logger };

// Export types pour usage externe
export type { LogLevel, LogContext, LogEntry };
