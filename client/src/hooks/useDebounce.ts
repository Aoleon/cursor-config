import { useEffect, useState, useRef, useCallback } from 'react';

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
 * @returns Fonction throttlée stable (ne change pas entre renders)
 * 
 * @example
 * const handleScroll = useThrottle(() => {
 *   console.log('Scroll event');
 * }, 200);
 * 
 * useEffect(() => {
 *   window.addEventListener('scroll', handleScroll);
 *   return () => window.removeEventListener('scroll', handleScroll);
 * }, [handleScroll]); // handleScroll est stable, pas de re-registration
 */
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 200
): T {
  // Utiliser useRef pour éviter les re-renders
  const lastRunRef = useRef(Date.now());
  const callbackRef = useRef(callback);

  // Mettre à jour la ref du callback à chaque render
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Mémoiser la fonction throttlée pour qu'elle reste stable
  return useCallback(
    ((...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastRunRef.current >= delay) {
        lastRunRef.current = now;
        return callbackRef.current(...args);
      }
    }) as T,
    [delay]
  );
}
