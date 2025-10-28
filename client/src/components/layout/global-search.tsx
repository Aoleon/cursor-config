import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Search, FileText, Briefcase, FolderOpen, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchResult {
  id: string;
  type: 'ao' | 'offer' | 'project';
  reference: string;
  title: string;
  subtitle?: string;
  location?: string;
  status?: string;
  createdAt?: string;
}

interface SearchResponse {
  query: string;
  total: number;
  results: SearchResult[];
  breakdown: {
    aos: number;
    offers: number;
    projects: number;
  };
}

export function GlobalSearch() {
  const [_, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Keyboard shortcut: Cmd/Ctrl + K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 0);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const { data, isLoading } = useQuery<SearchResponse>({
    queryKey: ['/api/search/global', { query: debouncedQuery }],
    enabled: debouncedQuery.length >= 2 && open,
    staleTime: 30000, // Cache for 30s
  });

  const getTypeIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'ao':
        return <FileText className="h-4 w-4" />;
      case 'offer':
        return <Briefcase className="h-4 w-4" />;
      case 'project':
        return <FolderOpen className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: SearchResult['type']) => {
    switch (type) {
      case 'ao':
        return 'AO';
      case 'offer':
        return 'Offre';
      case 'project':
        return 'Projet';
    }
  };

  const navigateToResult = (result: SearchResult) => {
    switch (result.type) {
      case 'ao':
        setLocation(`/aos/${result.id}`);
        break;
      case 'offer':
        setLocation(`/offers/${result.id}`);
        break;
      case 'project':
        setLocation(`/projects/${result.id}`);
        break;
    }
    setOpen(false);
    setSearchQuery('');
  };

  const clearSearch = () => {
    setSearchQuery('');
    inputRef.current?.focus();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[300px] justify-between text-muted-foreground"
          data-testid="global-search-trigger"
        >
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            <span className="text-sm">Rechercher...</span>
          </div>
          <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
            <span className="text-xs">⌘</span>K
          </kbd>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Input
              ref={inputRef}
              placeholder="Rechercher AOs, Offres, Projets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              data-testid="global-search-input"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={clearSearch}
                data-testid="clear-search"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
          <CommandList>
            {searchQuery.length < 2 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Tapez au moins 2 caractères pour rechercher
              </div>
            ) : isLoading ? (
              <div className="py-6 text-center text-sm">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto" />
              </div>
            ) : !data || data.results.length === 0 ? (
              <CommandEmpty>Aucun résultat trouvé</CommandEmpty>
            ) : (
              <>
                {/* Breakdown */}
                <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/50">
                  <span className="text-xs text-muted-foreground">
                    {data.total} résultat{data.total > 1 ? 's' : ''}
                  </span>
                  {data.breakdown.aos > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {data.breakdown.aos} AO{data.breakdown.aos > 1 ? 's' : ''}
                    </Badge>
                  )}
                  {data.breakdown.offers > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {data.breakdown.offers} Offre{data.breakdown.offers > 1 ? 's' : ''}
                    </Badge>
                  )}
                  {data.breakdown.projects > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {data.breakdown.projects} Projet{data.breakdown.projects > 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>

                {/* Results grouped by type */}
                {['ao', 'offer', 'project'].map((type) => {
                  const typeResults = data.results.filter((r) => r.type === type);
                  if (typeResults.length === 0) return null;

                  return (
                    <CommandGroup key={type} heading={getTypeLabel(type as SearchResult['type'])}>
                      {typeResults.map((result) => (
                        <CommandItem
                          key={result.id}
                          value={result.id}
                          onSelect={() => navigateToResult(result)}
                          className="cursor-pointer"
                          data-testid={`search-result-${result.type}-${result.id}`}
                        >
                          <div className="flex items-start gap-3 w-full">
                            <div className="mt-0.5">
                              {getTypeIcon(result.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm truncate">
                                  {result.title}
                                </span>
                                {result.status && (
                                  <Badge variant="outline" className="text-xs shrink-0">
                                    {result.status}
                                  </Badge>
                                )}
                              </div>
                              {result.subtitle && (
                                <p className="text-xs text-muted-foreground truncate">
                                  {result.subtitle}
                                </p>
                              )}
                              {result.location && (
                                <p className="text-xs text-muted-foreground truncate">
                                  📍 {result.location}
                                </p>
                              )}
                            </div>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  );
                })}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
