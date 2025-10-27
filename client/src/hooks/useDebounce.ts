import { useEffect, useState } from 'react';

/**
 * Hook de debouncing pour optimiser les recherches et filtres
 * Réduit le nombre de requêtes API en attendant que l'utilisateur arrête de taper
 * 
 * @param value - Valeur à debouncer
 * @param delay - Délai en millisecondes (défaut: 300ms)
 * @returns Valeur debouncée
 * 
 * @example
 * const [searchTerm, setSearchTerm] = useState('');
 * const debouncedSearch = useDebounce(searchTerm, 500);
 * 
 * useQuery({
 *   queryKey: ['/api/search', debouncedSearch],
 *   enabled: debouncedSearch.length > 0
 * });
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Créer un timer qui mettra à jour la valeur après le délai
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Nettoyer le timer si value change avant la fin du délai
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook de throttling pour limiter la fréquence d'exécution d'une fonction
 * Utile pour les événements scroll, resize, etc.
 * 
 * @param callback - Fonction à throttler
 * @param delay - Délai minimum entre les appels (défaut: 200ms)
 */
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 200
): T {
  const [lastRun, setLastRun] = useState(Date.now());

  return ((...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastRun >= delay) {
      setLastRun(now);
      return callback(...args);
    }
  }) as T;
}
