import { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import {
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  Settings,
  X,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useTablePreferences, ColumnConfig } from '@/hooks/useTablePreferences';
import { cn } from '@/lib/utils';

export interface DataTableColumn<T = any> {
  id: string;
  label: string;
  accessor?: keyof T | ((row: T) => any);
  render?: (value: any, row: T) => React.ReactNode;
  sortable?: boolean;
  filterable?: boolean;
  filterType?: 'text' | 'select' | 'date';
  filterOptions?: { label: string; value: any }[];
  width?: string;
}

export interface DataTableProps<T = any> {
  tableId: string;
  columns: DataTableColumn<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  rowClassName?: (row: T) => string;
  defaultViewMode?: 'table' | 'cards';
}

export function DataTable<T extends Record<string, any>>({
  tableId,
  columns,
  data,
  onRowClick,
  emptyMessage = 'Aucune donnée disponible',
  rowClassName,
  defaultViewMode = 'table'
}: DataTableProps<T>) {
  const [showColumnSettings, setShowColumnSettings] = useState(false);

  // Mémoriser les colonnes par défaut pour éviter de réinitialiser les préférences à chaque rendu
  const defaultColumns = useMemo(() => columns.map(col => ({
    id: col.id,
    label: col.label,
    sortable: col.sortable ?? true,
    filterable: col.filterable ?? true,
    width: col.width
  })), [columns]);

  const {
    preferences,
    visibleColumns,
    updateColumnVisibility,
    moveColumn,
    updateSort,
    updateFilter,
    clearFilter,
    clearAllFilters,
    resetPreferences
  } = useTablePreferences({
    tableId,
    defaultColumns,
    defaultViewMode
  });

  // Récupérer les colonnes visibles avec leur configuration complète
  const activeColumns = useMemo(() => {
    return visibleColumns
      .map(vc => columns.find(c => c.id === vc.id))
      .filter(Boolean) as DataTableColumn<T>[];
  }, [visibleColumns, columns]);

  // Appliquer le tri
  const sortedData = useMemo(() => {
    if (!preferences.sortBy) return data;

    const column = columns.find(c => c.id === preferences.sortBy);
    if (!column) return data;

    const sorted = [...data].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      if (typeof column.accessor === 'function') {
        aValue = column.accessor(a);
        bValue = column.accessor(b);
      } else if (column.accessor) {
        aValue = a[column.accessor];
        bValue = b[column.accessor];
      } else {
        aValue = a[column.id];
        bValue = b[column.id];
      }

      // Gérer les valeurs nulles/undefined
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return 1;
      if (bValue == null) return -1;

      // Comparaison
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return aValue.localeCompare(bValue, 'fr');
      }
      if (aValue < bValue) return -1;
      if (aValue > bValue) return 1;
      return 0;
    });

    return preferences.sortDirection === 'desc' ? sorted.reverse() : sorted;
  }, [data, preferences.sortBy, preferences.sortDirection, columns]);

  // Appliquer les filtres
  const filteredData = useMemo(() => {
    let filtered = sortedData;

    Object.entries(preferences.filters).forEach(([columnId, filterValue]) => {
      if (!filterValue || filterValue === '' || filterValue === 'all') return;

      const column = columns.find(c => c.id === columnId);
      if (!column) return;

      filtered = filtered.filter(row => {
        let value: any;
        
        if (typeof column.accessor === 'function') {
          value = column.accessor(row);
        } else if (column.accessor) {
          value = row[column.accessor];
        } else {
          value = row[columnId];
        }

        if (value == null) return false;

        // Filtre texte : recherche insensible à la casse
        if (column.filterType === 'text' || !column.filterType) {
          return String(value).toLowerCase().includes(String(filterValue).toLowerCase());
        }

        // Filtre select : égalité stricte
        if (column.filterType === 'select') {
          return value === filterValue;
        }

        // Filtre date : comparaison de dates
        if (column.filterType === 'date') {
          const dateValue = new Date(value);
          const filterDate = new Date(filterValue);
          return dateValue.toDateString() === filterDate.toDateString();
        }

        return true;
      });
    });

    return filtered;
  }, [sortedData, preferences.filters, columns]);

  const getValue = (row: T, column: DataTableColumn<T>) => {
    if (typeof column.accessor === 'function') {
      return column.accessor(row);
    }
    if (column.accessor) {
      return row[column.accessor];
    }
    return row[column.id];
  };

  const renderSortIcon = (columnId: string) => {
    if (preferences.sortBy !== columnId) {
      return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />;
    }
    return preferences.sortDirection === 'asc' ? (
      <ArrowUp className="ml-2 h-4 w-4" />
    ) : (
      <ArrowDown className="ml-2 h-4 w-4" />
    );
  };

  const renderFilter = (column: DataTableColumn<T>) => {
    const currentFilter = preferences.filters[column.id] || '';
    const hasFilter = currentFilter !== '' && currentFilter !== 'all';

    if (!column.filterable) return null;

    if (column.filterType === 'select' && column.filterOptions) {
      return (
        <div className="flex items-center gap-1">
          <Select
            value={currentFilter || 'all'}
            onValueChange={(value) => {
              if (value === 'all') {
                clearFilter(column.id);
              } else {
                updateFilter(column.id, value);
              }
            }}
          >
            <SelectTrigger className="h-8 text-xs" data-testid={`filter-${column.id}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              {column.filterOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hasFilter && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2"
              onClick={() => clearFilter(column.id)}
              data-testid={`clear-filter-${column.id}`}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      );
    }

    // Filtre texte par défaut
    return (
      <div className="flex items-center gap-1">
        <Input
          placeholder="Filtrer..."
          value={currentFilter}
          onChange={(e) => updateFilter(column.id, e.target.value)}
          className="h-8 text-xs"
          data-testid={`filter-input-${column.id}`}
        />
        {hasFilter && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2"
            onClick={() => clearFilter(column.id)}
            data-testid={`clear-filter-${column.id}`}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  };

  const activeFilterCount = Object.values(preferences.filters).filter(v => v && v !== 'all').length;

  return (
    <div className="space-y-4" data-testid={`data-table-${tableId}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {activeFilterCount > 0 && (
            <>
              <Badge variant="secondary" data-testid="active-filters-count">
                {activeFilterCount} filtre{activeFilterCount > 1 ? 's' : ''} actif{activeFilterCount > 1 ? 's' : ''}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                data-testid="button-clear-all-filters"
              >
                <X className="h-4 w-4 mr-1" />
                Effacer tout
              </Button>
            </>
          )}
        </div>

        <DropdownMenu open={showColumnSettings} onOpenChange={setShowColumnSettings}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" data-testid="button-column-settings">
              <Settings className="h-4 w-4 mr-2" />
              Colonnes
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <div className="px-2 py-2">
              <p className="text-sm font-medium mb-2">Colonnes visibles</p>
              {preferences.columns.map((col) => {
                const isVisible = col.visible;
                const visibleIndex = visibleColumns.findIndex(c => c.id === col.id);
                const canMoveUp = isVisible && visibleIndex > 0;
                const canMoveDown = isVisible && visibleIndex < visibleColumns.length - 1;

                return (
                  <div key={col.id} className="flex items-center gap-2 py-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => updateColumnVisibility(col.id, !isVisible)}
                      data-testid={`toggle-column-${col.id}`}
                    >
                      {isVisible ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        <EyeOff className="h-4 w-4 opacity-50" />
                      )}
                    </Button>
                    <span className={cn("flex-1 text-sm", !isVisible && "opacity-50")}>
                      {col.label}
                    </span>
                    {isVisible && (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => moveColumn(col.id, 'up')}
                          disabled={!canMoveUp}
                          data-testid={`move-up-${col.id}`}
                        >
                          <ChevronUp className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => moveColumn(col.id, 'down')}
                          disabled={!canMoveDown}
                          data-testid={`move-down-${col.id}`}
                        >
                          <ChevronDown className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={resetPreferences} data-testid="button-reset-preferences">
              Réinitialiser
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {activeColumns.map((column) => (
                <TableHead
                  key={column.id}
                  style={{ width: column.width }}
                  className="bg-muted/50"
                  data-testid={`header-${column.id}`}
                >
                  <div className="space-y-2">
                    {/* En-tête avec tri */}
                    <div className="flex items-center">
                      {column.sortable !== false ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 -ml-3 font-medium"
                          onClick={() => updateSort(column.id)}
                          data-testid={`sort-${column.id}`}
                        >
                          {column.label}
                          {renderSortIcon(column.id)}
                        </Button>
                      ) : (
                        <span className="font-medium">{column.label}</span>
                      )}
                    </div>

                    {/* Filtre */}
                    {column.filterable !== false && renderFilter(column)}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={activeColumns.length}
                  className="h-24 text-center"
                  data-testid="empty-state"
                >
                  <div className="text-muted-foreground">
                    <Filter className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    {emptyMessage}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((row, idx) => (
                <TableRow
                  key={idx}
                  className={cn(
                    onRowClick && "cursor-pointer hover:bg-muted/50",
                    rowClassName?.(row)
                  )}
                  onClick={() => onRowClick?.(row)}
                  data-testid={`row-${idx}`}
                >
                  {activeColumns.map((column) => {
                    const value = getValue(row, column);
                    const rendered = column.render ? column.render(value, row) : value;

                    return (
                      <TableCell key={column.id} data-testid={`cell-${idx}-${column.id}`}>
                        {rendered}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Statistiques */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div data-testid="table-stats">
          {filteredData.length === data.length ? (
            <span>{data.length} élément{data.length > 1 ? 's' : ''}</span>
          ) : (
            <span>
              {filteredData.length} sur {data.length} élément{data.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
