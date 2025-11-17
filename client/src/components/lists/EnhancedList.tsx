import { useState, ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Filter, X, ChevronDown, ChevronUp } from "lucide-react";
import { SkeletonList } from "@/components/ui/skeleton-list";
import { cn } from "@/lib/utils";

interface FilterOption {
  id: string;
  label: string;
  value: string;
}

interface FilterConfig {
  id: string;
  label: string;
  type: 'select' | 'multiselect' | 'date' | 'text';
  options?: FilterOption[];
  placeholder?: string;
}

interface EnhancedListProps<T> {
  title?: string;
  items: T[];
  isLoading?: boolean;
  renderItem: (item: T, index: number) => ReactNode;
  searchPlaceholder?: string;
  searchKeys?: (keyof T)[];
  filters?: FilterConfig[];
  onFilterChange?: (filters: Record<string, any>) => void;
  emptyMessage?: string;
  actions?: ReactNode;
  className?: string;
  showSearch?: boolean;
  showFilters?: boolean;
}

export function EnhancedList<T extends Record<string, any>>({
  title,
  items,
  isLoading = false,
  renderItem,
  searchPlaceholder = "Rechercher...",
  searchKeys = [],
  filters = [],
  onFilterChange,
  emptyMessage = "Aucun élément trouvé",
  actions,
  className = "",
  showSearch = true,
  showFilters = true
}: EnhancedListProps<T>) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);

  // Filter items based on search and filters
  const filteredItems = items.filter((item) => {
    // Search filter
    if (searchQuery && searchKeys.length > 0) {
      const matchesSearch = searchKeys.some((key) => {
        const value = item[key];
        if (value === null || value === undefined) return false;
        return String(value).toLowerCase().includes(searchQuery.toLowerCase());
      });
      if (!matchesSearch) return false;
    }

    // Custom filters
    for (const [filterId, filterValue] of Object.entries(activeFilters)) {
      if (filterValue === null || filterValue === undefined || filterValue === "") continue;
      
      const filterConfig = filters.find(f => f.id === filterId);
      if (!filterConfig) continue;

      const itemValue = item[filterId];
      
      if (filterConfig.type === 'multiselect') {
        const selectedValues = Array.isArray(filterValue) ? filterValue : [filterValue];
        if (!selectedValues.includes(itemValue)) return false;
      } else if (filterConfig.type === 'text') {
        if (!String(itemValue).toLowerCase().includes(String(filterValue).toLowerCase())) {
          return false;
        }
      } else {
        if (itemValue !== filterValue) return false;
      }
    }

    return true;
  });

  const handleFilterChange = (filterId: string, value: any) => {
    const newFilters = { ...activeFilters, [filterId]: value };
    setActiveFilters(newFilters);
    onFilterChange?.(newFilters);
  };

  const clearFilters = () => {
    setActiveFilters({});
    setSearchQuery("");
    onFilterChange?.({});
  };

  const activeFiltersCount = Object.values(activeFilters).filter(
    v => v !== null && v !== undefined && v !== ""
  ).length + (searchQuery ? 1 : 0);

  if (isLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        {title && <h2 className="text-2xl font-bold">{title}</h2>}
        <SkeletonList count={5} showHeader={false} />
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      {(title || actions) && (
        <div className="flex items-center justify-between">
          {title && <h2 className="text-2xl font-bold">{title}</h2>}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}

      {/* Search and Filters Bar */}
      {(showSearch || showFilters) && (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-4">
              {/* Search */}
              {showSearch && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={searchPlaceholder}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              )}

              {/* Filters */}
              {showFilters && filters.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowFiltersPanel(!showFiltersPanel)}
                      className="flex items-center gap-2"
                    >
                      <Filter className="h-4 w-4" />
                      Filtres
                      {activeFiltersCount > 0 && (
                        <Badge variant="secondary" className="ml-1">
                          {activeFiltersCount}
                        </Badge>
                      )}
                      {showFiltersPanel ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                    {activeFiltersCount > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearFilters}
                        className="flex items-center gap-2"
                      >
                        <X className="h-4 w-4" />
                        Réinitialiser
                      </Button>
                    )}
                  </div>

                  {showFiltersPanel && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2 border-t">
                      {filters.map((filter) => (
                        <div key={filter.id} className="space-y-2">
                          <label className="text-sm font-medium">{filter.label}</label>
                          {filter.type === 'select' || filter.type === 'multiselect' ? (
                            <Select
                              value={activeFilters[filter.id] || ""}
                              onValueChange={(value) => handleFilterChange(filter.id, value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={filter.placeholder || `Sélectionner ${filter.label}`} />
                              </SelectTrigger>
                              <SelectContent>
                                {filter.options?.map((option) => (
                                  <SelectItem key={option.id} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : filter.type === 'text' ? (
                            <Input
                              placeholder={filter.placeholder}
                              value={activeFilters[filter.id] || ""}
                              onChange={(e) => handleFilterChange(filter.id, e.target.value)}
                            />
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Count */}
      {filteredItems.length !== items.length && (
        <div className="text-sm text-on-surface-muted">
          {filteredItems.length} résultat{filteredItems.length > 1 ? 's' : ''} sur {items.length}
        </div>
      )}

      {/* Items List */}
      {filteredItems.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-on-surface-muted">{emptyMessage}</p>
            {activeFiltersCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="mt-4"
              >
                Réinitialiser les filtres
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredItems.map((item, index) => renderItem(item, index))}
        </div>
      )}
    </div>
  );
}

