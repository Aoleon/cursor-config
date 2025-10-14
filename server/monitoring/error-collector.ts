/**
 * Service de collecte centralisée des erreurs
 * Capture, catégorise et analyse toutes les erreurs de l'application
 */

import { logger } from '../utils/logger';

// ========================================
// TYPES ET INTERFACES
// ========================================

export type ErrorLevel = 'critical' | 'error' | 'warning';
export type ErrorCategory = 'database' | 'api' | 'validation' | 'auth' | 'system' | 'business' | 'external';

export interface ErrorContext {
  userId?: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  ip?: string;
  userAgent?: string;
  sessionId?: string;
  details?: any;
}

export interface ErrorEvent {
  id: string;
  timestamp: Date;
  level: ErrorLevel;
  category: ErrorCategory;
  message: string;
  errorCode?: string;
  stack?: string;
  context?: ErrorContext;
  fingerprint: string;  // Pour grouper les erreurs similaires
  count: number;  // Nombre d'occurrences de cette erreur
}

export interface ErrorMetrics {
  totalErrors: number;
  errorsByCategory: Record<ErrorCategory, number>;
  errorsByLevel: Record<ErrorLevel, number>;
  errorRate: number;  // Erreurs par minute
  topErrors: Array<{
    fingerprint: string;
    message: string;
    count: number;
    lastSeen: Date;
    category: ErrorCategory;
  }>;
  recentErrors: ErrorEvent[];
}

export interface TimeWindowMetrics {
  window: string;
  startTime: Date;
  endTime: Date;
  totalErrors: number;
  errorRate: number;
  errorsByCategory: Record<ErrorCategory, number>;
  errorsByLevel: Record<ErrorLevel, number>;
}

// ========================================
// CLASSE PRINCIPALE ERROR COLLECTOR
// ========================================

export class ErrorCollector {
  private events: ErrorEvent[] = [];
  private errorGroups = new Map<string, ErrorEvent>();  // Groupement par fingerprint
  private metrics = new Map<string, number>();
  private timeWindows = {
    '1min': [] as ErrorEvent[],
    '5min': [] as ErrorEvent[],
    '1hour': [] as ErrorEvent[],
    '24hours': [] as ErrorEvent[]
  };
  private maxEventsPerWindow = 10000;  // Limite pour éviter fuite mémoire
  private cleanupInterval: NodeJS.Timeout;
  private alertCallbacks: ((event: ErrorEvent) => void)[] = [];

  constructor() {
    // Nettoyage périodique des anciennes erreurs (toutes les minutes)
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldEvents();
    }, 60000);
  }

  /**
   * Capture une nouvelle erreur
   */
  capture(error: Error | any, context?: ErrorContext): ErrorEvent {
    const event = this.createEvent(error, context);
    
    // Ajouter à la liste des événements
    this.events.push(event);
    
    // Mettre à jour les groupes d'erreurs
    this.updateErrorGroup(event);
    
    // Mettre à jour les fenêtres temporelles
    this.updateTimeWindows(event);
    
    // Mettre à jour les métriques
    this.updateMetrics(event);
    
    // Déclencher les callbacks d'alerte
    this.triggerAlerts(event);
    
    // Log l'erreur
    this.logError(event);
    
    return event;
  }

  /**
   * Crée un événement d'erreur à partir d'une erreur
   */
  private createEvent(error: Error | any, context?: ErrorContext): ErrorEvent {
    const message = error?.message || String(error);
    const stack = error?.stack;
    const errorCode = error?.code;
    
    // Déterminer le niveau et la catégorie
    const level = this.determineErrorLevel(error, context);
    const category = this.determineErrorCategory(error, message, context);
    
    // Générer un fingerprint pour grouper les erreurs similaires
    const fingerprint = this.generateFingerprint(message, stack, category);
    
    // Vérifier si cette erreur existe déjà
    const existingGroup = this.errorGroups.get(fingerprint);
    
    return {
      id: this.generateEventId(),
      timestamp: new Date(),
      level,
      category,
      message,
      errorCode,
      stack,
      context,
      fingerprint,
      count: existingGroup ? existingGroup.count + 1 : 1
    };
  }

  /**
   * Détermine le niveau de sévérité d'une erreur
   */
  private determineErrorLevel(error: any, context?: ErrorContext): ErrorLevel {
    // Critical : Erreurs système, DB down, services critiques
    if (
      error?.fatal ||
      error?.code === 'ECONNREFUSED' ||
      error?.message?.includes('database') && error?.message?.includes('connection') ||
      error?.message?.includes('circuit breaker open') ||
      context?.statusCode === 503
    ) {
      return 'critical';
    }
    
    // Warning : Validation, rate limits, erreurs utilisateur
    if (
      error?.statusCode === 400 ||
      error?.statusCode === 422 ||
      error?.statusCode === 429 ||
      error?.code === 'VALIDATION_ERROR' ||
      error?.message?.includes('validation') ||
      error?.message?.includes('rate limit')
    ) {
      return 'warning';
    }
    
    // Error par défaut
    return 'error';
  }

  /**
   * Détermine la catégorie d'une erreur
   */
  private determineErrorCategory(error: any, message: string, context?: ErrorContext): ErrorCategory {
    const lowerMessage = message.toLowerCase();
    const endpoint = context?.endpoint?.toLowerCase() || '';
    
    // Database
    if (
      error?.code === 'DATABASE_ERROR' ||
      lowerMessage.includes('database') ||
      lowerMessage.includes('query') ||
      lowerMessage.includes('connection') ||
      lowerMessage.includes('pool')
    ) {
      return 'database';
    }
    
    // Auth
    if (
      error?.code === 'AUTHENTICATION_ERROR' ||
      error?.code === 'AUTHORIZATION_ERROR' ||
      lowerMessage.includes('auth') ||
      lowerMessage.includes('token') ||
      lowerMessage.includes('permission') ||
      endpoint.includes('/auth')
    ) {
      return 'auth';
    }
    
    // API
    if (
      error?.code === 'EXTERNAL_SERVICE_ERROR' ||
      lowerMessage.includes('api') ||
      lowerMessage.includes('external') ||
      lowerMessage.includes('timeout') ||
      lowerMessage.includes('circuit breaker')
    ) {
      return 'api';
    }
    
    // Validation
    if (
      error?.code === 'VALIDATION_ERROR' ||
      lowerMessage.includes('validation') ||
      lowerMessage.includes('invalid') ||
      lowerMessage.includes('required')
    ) {
      return 'validation';
    }
    
    // Business
    if (
      lowerMessage.includes('business') ||
      lowerMessage.includes('workflow') ||
      lowerMessage.includes('process')
    ) {
      return 'business';
    }
    
    // External
    if (
      lowerMessage.includes('openai') ||
      lowerMessage.includes('anthropic') ||
      lowerMessage.includes('sendgrid') ||
      lowerMessage.includes('external')
    ) {
      return 'external';
    }
    
    // System par défaut
    return 'system';
  }

  /**
   * Génère un fingerprint pour grouper les erreurs similaires
   */
  private generateFingerprint(message: string, stack?: string, category?: ErrorCategory): string {
    // Normaliser le message (retirer les valeurs dynamiques)
    const normalizedMessage = message
      .replace(/\d+/g, 'N')  // Remplacer nombres
      .replace(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, 'UUID')  // UUIDs
      .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, 'IP')  // IPs
      .slice(0, 100);  // Limiter la longueur
    
    // Extraire la première ligne significative du stack
    const stackLine = stack?.split('\n')[1]?.trim().slice(0, 100) || '';
    
    // Combiner pour créer le fingerprint
    return `${category}:${normalizedMessage}:${stackLine}`;
  }

  /**
   * Met à jour le groupe d'erreurs
   */
  private updateErrorGroup(event: ErrorEvent): void {
    const existing = this.errorGroups.get(event.fingerprint);
    
    if (existing) {
      existing.count = event.count;
      existing.timestamp = event.timestamp;
    } else {
      this.errorGroups.set(event.fingerprint, { ...event });
    }
  }

  /**
   * Met à jour les fenêtres temporelles
   */
  private updateTimeWindows(event: ErrorEvent): void {
    // Ajouter à toutes les fenêtres
    Object.keys(this.timeWindows).forEach(window => {
      (this.timeWindows as any)[window].push(event);
    });
  }

  /**
   * Met à jour les métriques
   */
  private updateMetrics(event: ErrorEvent): void {
    // Total errors
    this.incrementMetric('total_errors');
    
    // Par catégorie
    this.incrementMetric(`category_${event.category}`);
    
    // Par niveau
    this.incrementMetric(`level_${event.level}`);
    
    // Par heure
    const hour = new Date().getHours();
    this.incrementMetric(`hour_${hour}`);
  }

  /**
   * Incrémente une métrique
   */
  private incrementMetric(key: string, value: number = 1): void {
    this.metrics.set(key, (this.metrics.get(key) || 0) + value);
  }

  /**
   * Nettoie les anciennes erreurs
   */
  private cleanupOldEvents(): void {
    const now = Date.now();
    
    // Nettoyer fenêtre 1 minute
    this.timeWindows['1min'] = this.timeWindows['1min'].filter(e => 
      now - e.timestamp.getTime() < 60000
    );
    
    // Nettoyer fenêtre 5 minutes
    this.timeWindows['5min'] = this.timeWindows['5min'].filter(e => 
      now - e.timestamp.getTime() < 300000
    );
    
    // Nettoyer fenêtre 1 heure
    this.timeWindows['1hour'] = this.timeWindows['1hour'].filter(e => 
      now - e.timestamp.getTime() < 3600000
    );
    
    // Nettoyer fenêtre 24 heures
    this.timeWindows['24hours'] = this.timeWindows['24hours'].filter(e => 
      now - e.timestamp.getTime() < 86400000
    );
    
    // Limiter la taille totale des événements
    if (this.events.length > this.maxEventsPerWindow) {
      this.events = this.events.slice(-this.maxEventsPerWindow);
    }
  }

  /**
   * Déclenche les alertes si nécessaire
   */
  private triggerAlerts(event: ErrorEvent): void {
    this.alertCallbacks.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        logger.error('Erreur lors du déclenchement d\'alerte', error as Error);
      }
    });
  }

  /**
   * Log l'erreur
   */
  private logError(event: ErrorEvent): void {
    const logMessage = `[${event.category.toUpperCase()}] ${event.message}`;
    const logContext = {
      service: 'ErrorCollector',
      metadata: {
        errorId: event.id,
        category: event.category,
        level: event.level,
        fingerprint: event.fingerprint,
        count: event.count,
        ...event.context
      }
    };

    switch (event.level) {
      case 'critical':
        logger.fatal(logMessage, undefined, logContext);
        break;
      case 'error':
        logger.error(logMessage, new Error(event.message), logContext);
        break;
      case 'warning':
        logger.warn(logMessage, logContext);
        break;
    }
  }

  /**
   * Génère un ID unique pour l'événement
   */
  private generateEventId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }

  /**
   * Enregistre un callback pour les alertes
   */
  onAlert(callback: (event: ErrorEvent) => void): void {
    this.alertCallbacks.push(callback);
  }

  // ========================================
  // MÉTHODES PUBLIQUES POUR RÉCUPÉRER LES DONNÉES
  // ========================================

  /**
   * Récupère les métriques globales
   */
  getMetrics(): ErrorMetrics {
    const errorsByCategory: Record<ErrorCategory, number> = {
      database: this.metrics.get('category_database') || 0,
      api: this.metrics.get('category_api') || 0,
      validation: this.metrics.get('category_validation') || 0,
      auth: this.metrics.get('category_auth') || 0,
      system: this.metrics.get('category_system') || 0,
      business: this.metrics.get('category_business') || 0,
      external: this.metrics.get('category_external') || 0
    };

    const errorsByLevel: Record<ErrorLevel, number> = {
      critical: this.metrics.get('level_critical') || 0,
      error: this.metrics.get('level_error') || 0,
      warning: this.metrics.get('level_warning') || 0
    };

    // Top errors (10 plus fréquentes)
    const topErrors = Array.from(this.errorGroups.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map(e => ({
        fingerprint: e.fingerprint,
        message: e.message,
        count: e.count,
        lastSeen: e.timestamp,
        category: e.category
      }));

    // Erreurs récentes (20 dernières)
    const recentErrors = this.events.slice(-20).reverse();

    // Calcul du taux d'erreur (dernière minute)
    const errorRate = this.calculateErrorRate('1min');

    return {
      totalErrors: this.metrics.get('total_errors') || 0,
      errorsByCategory,
      errorsByLevel,
      errorRate,
      topErrors,
      recentErrors
    };
  }

  /**
   * Récupère les métriques d'une fenêtre temporelle
   */
  getTimeWindowMetrics(window: keyof typeof this.timeWindows): TimeWindowMetrics {
    const events = this.timeWindows[window];
    const now = new Date();
    
    const windowDurations = {
      '1min': 60000,
      '5min': 300000,
      '1hour': 3600000,
      '24hours': 86400000
    };
    
    const duration = windowDurations[window];
    const startTime = new Date(now.getTime() - duration);
    
    const errorsByCategory: Record<ErrorCategory, number> = {} as any;
    const errorsByLevel: Record<ErrorLevel, number> = {} as any;
    
    events.forEach(event => {
      errorsByCategory[event.category] = (errorsByCategory[event.category] || 0) + 1;
      errorsByLevel[event.level] = (errorsByLevel[event.level] || 0) + 1;
    });
    
    return {
      window,
      startTime,
      endTime: now,
      totalErrors: events.length,
      errorRate: events.length / (duration / 60000),  // Erreurs par minute
      errorsByCategory,
      errorsByLevel
    };
  }

  /**
   * Récupère les erreurs selon des critères
   */
  getErrors(options: {
    category?: ErrorCategory;
    level?: ErrorLevel;
    limit?: number;
    since?: Date;
  }): ErrorEvent[] {
    let filtered = [...this.events];
    
    if (options.category) {
      filtered = filtered.filter(e => e.category === options.category);
    }
    
    if (options.level) {
      filtered = filtered.filter(e => e.level === options.level);
    }
    
    if (options.since) {
      filtered = filtered.filter(e => e.timestamp >= options.since);
    }
    
    if (options.limit) {
      filtered = filtered.slice(-options.limit);
    }
    
    return filtered.reverse();
  }

  /**
   * Calcule le taux d'erreur
   */
  private calculateErrorRate(window: keyof typeof this.timeWindows): number {
    const events = this.timeWindows[window];
    const windowMinutes = {
      '1min': 1,
      '5min': 5,
      '1hour': 60,
      '24hours': 1440
    };
    
    return events.length / windowMinutes[window];
  }

  /**
   * Réinitialise les métriques
   */
  reset(): void {
    this.events = [];
    this.errorGroups.clear();
    this.metrics.clear();
    Object.keys(this.timeWindows).forEach(window => {
      (this.timeWindows as any)[window] = [];
    });
  }

  /**
   * Nettoie et arrête le service
   */
  dispose(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.reset();
  }
}

// Instance singleton
let errorCollectorInstance: ErrorCollector | null = null;

export function getErrorCollector(): ErrorCollector {
  if (!errorCollectorInstance) {
    errorCollectorInstance = new ErrorCollector();
  }
  return errorCollectorInstance;
}