import { memo, useCallback, useMemo } from 'react';

/**
 * Composant de liste optimisé avec virtualisation pour grandes listes
 * Utilise React.memo pour éviter les re-renders inutiles
 */

interface OptimizedListItemProps<T> {
  item: T;
  index: number;
  renderItem: (item: T, index: number) => React.ReactNode;
}

/**
 * Item de liste mémoïsé - ne re-render que si item change
 */
const OptimizedListItem = memo(function OptimizedListItem<T>({
  item,
  index,
  renderItem,
}: OptimizedListItemProps<T>) {
  return <>{renderItem(item, index)}</>;
}, (prevProps: OptimizedListItemProps<any>, nextProps: OptimizedListItemProps<any>) => {
  // Comparaison personnalisée pour éviter les re-renders inutiles
  return prevProps.item === nextProps.item && prevProps.index === nextProps.index;
}) as <T>(props: OptimizedListItemProps<T>) => JSX.Element;

interface OptimizedListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T, index: number) => string | number;
  className?: string;
  emptyMessage?: string;
  loading?: boolean;
  loadingComponent?: React.ReactNode;
}

/**
 * Liste optimisée avec memo et keying intelligent
 * 
 * @example
 * <OptimizedList
 *   items={offers}
 *   keyExtractor={(offer) => offer.id}
 *   renderItem={(offer) => <OfferCard offer={offer} />}
 *   emptyMessage="Aucune offre disponible"
 * />
 */
export function OptimizedList<T>({
  items,
  renderItem,
  keyExtractor,
  className = '',
  emptyMessage = 'Aucun élément à afficher',
  loading = false,
  loadingComponent,
}: OptimizedListProps<T>) {
  // Mémoiser le rendu pour éviter les recalculs
  const renderedItems = useMemo(() => {
    return items.map((item, index) => (
      <OptimizedListItem
        key={keyExtractor(item, index)}
        item={item}
        index={index}
        renderItem={renderItem}
      />
    ));
  }, [items, keyExtractor, renderItem]);

  if (loading) {
    return loadingComponent || (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return <div className={className}>{renderedItems}</div>;
}

/**
 * Hook pour créer un renderItem mémoïsé
 * Évite que renderItem change à chaque render et cause des re-renders inutiles
 * 
 * @example
 * const renderOffer = useOptimizedRenderItem(
 *   (offer: Offer) => <OfferCard offer={offer} />,
 *   []
 * );
 */
export function useOptimizedRenderItem<T>(
  renderFn: (item: T, index: number) => React.ReactNode,
  deps: any[] = []
) {
  return useCallback(renderFn, deps);
}

/**
 * Hook pour créer un keyExtractor mémoïsé
 * 
 * @example
 * const keyExtractor = useOptimizedKeyExtractor(
 *   (offer: Offer) => offer.id,
 *   []
 * );
 */
export function useOptimizedKeyExtractor<T>(
  keyFn: (item: T, index: number) => string | number,
  deps: any[] = []
) {
  return useCallback(keyFn, deps);
}
