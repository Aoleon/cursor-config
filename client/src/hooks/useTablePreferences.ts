import { useState, useEffect, useCallback } from 'react';

export interface ColumnConfig {
  id: string;
  label: string;
  visible: boolean;
  order: number;
  sortable?: boolean;
  filterable?: boolean;
  width?: string;
}

export interface TablePreferences {
  columns: ColumnConfig[];
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  filters: Record<string, any>;
  viewMode?: 'table' | 'cards';
}

interface UseTablePreferencesOptions {
  tableId: string;
  defaultColumns: Omit<ColumnConfig, 'visible' | 'order'>[];
  defaultViewMode?: 'table' | 'cards';
}

export function useTablePreferences({
  tableId,
  defaultColumns,
  defaultViewMode = 'table'
}: UseTablePreferencesOptions) {
  const storageKey = `table-preferences-${tableId}`;

  const initializePreferences = useCallback((): TablePreferences => {
    const stored = localStorage.getItem(storageKey);
    
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as TablePreferences;
        
        // Fusionner avec les colonnes par défaut pour gérer les nouvelles colonnes
        const existingColumnIds = new Set(parsed.columns.map(c => c.id));
        const newColumns = defaultColumns.filter(c => !existingColumnIds.has(c.id));
        
        const mergedColumns = [
          ...parsed.columns,
          ...newColumns.map((c, idx) => ({
            ...c,
            visible: true,
            order: parsed.columns.length + idx
          }))
        ];

        return {
          ...parsed,
          columns: mergedColumns
        };
      } catch {
        // Si erreur de parsing, on reset
      }
    }

    // Préférences par défaut
    return {
      columns: defaultColumns.map((col, idx) => ({
        ...col,
        visible: true,
        order: idx
      })),
      filters: {},
      viewMode: defaultViewMode
    };
  }, [storageKey, defaultColumns, defaultViewMode]);

  const [preferences, setPreferences] = useState<TablePreferences>(initializePreferences);

  // Sauvegarder dans localStorage à chaque changement
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(preferences));
  }, [preferences, storageKey]);

  const updateColumnVisibility = useCallback((columnId: string, visible: boolean) => {
    setPreferences(prev => ({
      ...prev,
      columns: prev.columns.map(col =>
        col.id === columnId ? { ...col, visible } : col
      )
    }));
  }, []);

  const moveColumn = useCallback((columnId: string, direction: 'up' | 'down') => {
    setPreferences(prev => {
      const visibleColumns = prev.columns
        .filter(c => c.visible)
        .sort((a, b) => a.order - b.order);
      
      const columnIndex = visibleColumns.findIndex(c => c.id === columnId);
      if (columnIndex === -1) return prev;

      const newIndex = direction === 'up' ? columnIndex - 1 : columnIndex + 1;
      if (newIndex < 0 || newIndex >= visibleColumns.length) return prev;

      // Échanger les ordres
      const currentColumn = visibleColumns[columnIndex];
      const targetColumn = visibleColumns[newIndex];
      const tempOrder = currentColumn.order;
      currentColumn.order = targetColumn.order;
      targetColumn.order = tempOrder;

      return {
        ...prev,
        columns: prev.columns.map(col => {
          if (col.id === currentColumn.id) return currentColumn;
          if (col.id === targetColumn.id) return targetColumn;
          return col;
        })
      };
    });
  }, []);

  const updateSort = useCallback((columnId: string) => {
    setPreferences(prev => {
      if (prev.sortBy === columnId) {
        // Même colonne : inverser la direction ou désactiver
        if (prev.sortDirection === 'asc') {
          return { ...prev, sortDirection: 'desc' };
        } else {
          return { ...prev, sortBy: undefined, sortDirection: undefined };
        }
      } else {
        // Nouvelle colonne : trier ascendant
        return { ...prev, sortBy: columnId, sortDirection: 'asc' };
      }
    });
  }, []);

  const updateFilter = useCallback((columnId: string, value: any) => {
    setPreferences(prev => ({
      ...prev,
      filters: {
        ...prev.filters,
        [columnId]: value
      }
    }));
  }, []);

  const clearFilter = useCallback((columnId: string) => {
    setPreferences(prev => {
      const newFilters = { ...prev.filters };
      delete newFilters[columnId];
      return { ...prev, filters: newFilters };
    });
  }, []);

  const clearAllFilters = useCallback(() => {
    setPreferences(prev => ({ ...prev, filters: {} }));
  }, []);

  const setViewMode = useCallback((mode: 'table' | 'cards') => {
    setPreferences(prev => ({ ...prev, viewMode: mode }));
  }, []);

  const resetPreferences = useCallback(() => {
    // Supprimer d'abord le localStorage, puis réinitialiser avec les valeurs par défaut
    localStorage.removeItem(storageKey);
    const defaultPrefs: TablePreferences = {
      columns: defaultColumns.map((col, idx) => ({
        ...col,
        visible: true,
        order: idx
      })),
      filters: {},
      viewMode: defaultViewMode
    };
    setPreferences(defaultPrefs);
  }, [storageKey, defaultColumns, defaultViewMode]);

  const visibleColumns = preferences.columns
    .filter(c => c.visible)
    .sort((a, b) => a.order - b.order);

  return {
    preferences,
    visibleColumns,
    updateColumnVisibility,
    moveColumn,
    updateSort,
    updateFilter,
    clearFilter,
    clearAllFilters,
    setViewMode,
    resetPreferences
  };
}
