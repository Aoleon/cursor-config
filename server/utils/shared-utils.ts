/**
 * Utilitaires partagés pour Saxium
 * Fonctions communes réutilisables à travers les services
 */

import Decimal from 'decimal.js-light';

// ========================================
// GESTION DES DATES
// ========================================

/**
 * Parse une date de manière sécurisée avec fallback
 */
export function parseDateSafely(
  dateValue: any, 
  fallback: Date = new Date()
): Date {
  if (!dateValue) return fallback;
  
  // Si c'est déjà une Date
  if (dateValue instanceof Date) {
    return isNaN(dateValue.getTime()) ? fallback : dateValue;
  }
  
  // Si c'est un string
  if (typeof dateValue === 'string') {
    const parsed = new Date(dateValue);
    return isNaN(parsed.getTime()) ? fallback : parsed;
  }
  
  // Si c'est un timestamp
  if (typeof dateValue === 'number') {
    const parsed = new Date(dateValue);
    return isNaN(parsed.getTime()) ? fallback : parsed;
  }
  
  return fallback;
}

/**
 * Formate une date au format FR (dd/mm/yyyy)
 */
export function formatDateFR(date: Date | string | null | undefined): string {
  if (!date) return '';
  
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  
  return `${day}/${month}/${year}`;
}

/**
 * Calcule le nombre de jours ouvrés entre deux dates
 */
export function calculateWorkingDays(startDate: Date, endDate: Date): number {
  let count = 0;
  const current = new Date(startDate);
  
  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Exclure dimanche (0) et samedi (6)
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return count;
}

/**
 * Ajoute des jours ouvrés à une date
 */
export function addWorkingDays(startDate: Date, daysToAdd: number): Date {
  const result = new Date(startDate);
  let remainingDays = daysToAdd;
  
  while (remainingDays > 0) {
    result.setDate(result.getDate() + 1);
    const dayOfWeek = result.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      remainingDays--;
    }
  }
  
  return result;
}

// ========================================
// GESTION DES MONTANTS / CALCULS
// ========================================

/**
 * Parse un montant de manière sécurisée
 */
export function parseAmountSafely(
  value: any, 
  fallback: number = 0
): Decimal {
  if (value === null || value === undefined || value === '') {
    return new Decimal(fallback);
  }
  
  try {
    if (typeof value === 'string') {
      // Nettoyer le string (enlever espaces, remplacer virgule par point)
      const cleaned = value.trim().replace(/\s/g, '').replace(',', '.');
      return new Decimal(cleaned);
    }
    
    if (typeof value === 'number') {
      return new Decimal(value);
    }
    
    if (value instanceof Decimal) {
      return value;
    }
    
    return new Decimal(fallback);
  } catch (error) {
    return new Decimal(fallback);
  }
}

/**
 * Calcule TVA sur montant HT
 */
export function calculateTVA(
  montantHT: Decimal | number, 
  tauxTVA: number = 20
): Decimal {
  const ht = montantHT instanceof Decimal ? montantHT : new Decimal(montantHT);
  return ht.times(tauxTVA).div(100);
}

/**
 * Calcule montant TTC depuis HT
 */
export function calculateTTC(
  montantHT: Decimal | number, 
  tauxTVA: number = 20
): Decimal {
  const ht = montantHT instanceof Decimal ? montantHT : new Decimal(montantHT);
  const tva = calculateTVA(ht, tauxTVA);
  return ht.plus(tva);
}

/**
 * Formate un montant en euros
 */
export function formatMontantEuros(
  montant: Decimal | number | string, 
  includeSymbol: boolean = true
): string {
  const value = typeof montant === 'string' 
    ? parseFloat(montant) 
    : montant instanceof Decimal 
      ? montant.toNumber() 
      : montant;
  
  const formatted = value.toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  
  return includeSymbol ? `${formatted} €` : formatted;
}

// ========================================
// VALIDATION & TRANSFORMATION
// ========================================

/**
 * Nettoie et normalise un string
 */
export function normalizeString(str: string | null | undefined): string {
  if (!str) return '';
  return str.trim().replace(/\s+/g, ' ');
}

/**
 * Valide un email
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Génère un identifiant unique court
 */
export function generateShortId(prefix: string = ''): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 11);
  return prefix ? `${prefix}_${timestamp}_${randomPart}` : `${timestamp}_${randomPart}`;
}

/**
 * Tronque un texte avec ellipse
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

// ========================================
// CACHE & PERFORMANCE
// ========================================

/**
 * Classe Cache générique simple
 */
export class SimpleCache<T> {
  private cache: Map<string, { data: T; expiresAt: number }> = new Map();
  private defaultTTL: number;

  constructor(defaultTTLMinutes: number = 30) {
    this.defaultTTL = defaultTTLMinutes * 60 * 1000; // Convertir en ms
  }

  set(key: string, value: T, ttlMs?: number): void {
    const expiresAt = Date.now() + (ttlMs || this.defaultTTL);
    this.cache.set(key, { data: value, expiresAt });
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  clear(): void {
    this.cache.clear();
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  size(): number {
    // Nettoyer les entrées expirées avant de compter
    this.cleanExpired();
    return this.cache.size;
  }

  private cleanExpired(): void {
    const now = Date.now();
    Array.from(this.cache.entries()).forEach(([key, entry]) => {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    });
  }
}

/**
 * Mesure le temps d'exécution d'une fonction
 * Note: Pour logging automatique, utilisez plutôt logger.time() de @/utils/logger
 */
export async function measureExecutionTime<T>(
  fn: () => Promise<T> | T,
  label?: string
): Promise<{ result: T; duration: number }> {
  const start = Date.now();
  const result = await fn();
  const duration = Date.now() - start;
  
  // Logging retiré - utiliser logger.time() pour logs automatiques
  
  return { result, duration };
}

/**
 * Retry avec backoff exponentiel
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    backoffMultiplier?: number;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelayMs = 1000,
    maxDelayMs = 10000,
    backoffMultiplier = 2
  } = options;

  let lastError: Error;
  let delay = initialDelayMs;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        break;
      }
      
      await new Promise(resolve => setTimeout(resolve, delay));
      delay = Math.min(delay * backoffMultiplier, maxDelayMs);
    }
  }
  
  throw lastError!;
}

// ========================================
// ARRAYS & COLLECTIONS
// ========================================

/**
 * Groupe un array par une clé
 */
export function groupBy<T>(
  array: T[], 
  keyGetter: (item: T) => string | number
): Map<string | number, T[]> {
  const map = new Map<string | number, T[]>();
  
  array.forEach(item => {
    const key = keyGetter(item);
    const collection = map.get(key);
    if (!collection) {
      map.set(key, [item]);
    } else {
      collection.push(item);
    }
  });
  
  return map;
}

/**
 * Chunk un array en sous-arrays de taille donnée
 */
export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Retire les doublons d'un array
 */
export function unique<T>(array: T[], keyGetter?: (item: T) => any): T[] {
  if (!keyGetter) {
    return Array.from(new Set(array));
  }
  
  const seen = new Set();
  return array.filter(item => {
    const key = keyGetter(item);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

// ========================================
// ERROR HANDLING
// ========================================

/**
 * Extrait message d'erreur safe
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Erreur inconnue';
}

/**
 * Crée une erreur typée custom
 */
export class BusinessError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400,
    public metadata?: Record<string, any>
  ) {
    super(message);
    this.name = 'BusinessError';
  }
}
