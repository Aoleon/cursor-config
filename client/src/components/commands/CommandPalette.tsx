import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { 
  Command, 
  CommandInput, 
  CommandList, 
  CommandEmpty, 
  CommandGroup, 
  CommandItem 
} from "@/components/ui/command";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  FileText, 
  ClipboardList, 
  Projector,
  Calculator,
  Settings,
  Users,
  Truck,
  HardHat,
  Headphones,
  Plus,
  ArrowRight,
  Calendar
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  category: string;
  icon: React.ReactNode;
  action: () => void;
  keywords?: string[];
  badge?: string;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [, setLocation] = useLocation();

  // Fetch recent items for quick access
  const { data: recentOffers = [] } = useQuery({
    queryKey: ['/api/offers', { limit: 5, sort: 'updatedAt' }],
    select: (response: any) => response?.data || []
  });

  const { data: recentProjects = [] } = useQuery({
    queryKey: ['/api/projects', { limit: 5, sort: 'updatedAt' }],
    select: (response: any) => response?.data || []
  });

  // Build command items
  const commands = useMemo<CommandItem[]>(() => {
    const items: CommandItem[] = [
      // Navigation
      {
        id: 'nav-dashboard',
        label: 'Tableau de bord',
        category: 'Navigation',
        icon: <Settings className="h-4 w-4" />,
        action: () => {
          setLocation('/dashboard');
          setOpen(false);
        },
        keywords: ['dashboard', 'accueil', 'home']
      },
      {
        id: 'nav-workspace-pm',
        label: 'Mon Espace - Chef de Projet',
        category: 'Navigation',
        icon: <FileText className="h-4 w-4" />,
        action: () => {
          setLocation('/workspace/project-manager');
          setOpen(false);
        },
        keywords: ['workspace', 'espace', 'chef projet']
      },
      {
        id: 'nav-workspace-be',
        label: 'Espace BE',
        category: 'Navigation',
        icon: <Settings className="h-4 w-4" />,
        action: () => {
          setLocation('/workspace/be');
          setOpen(false);
        },
        keywords: ['be', 'bureau études', 'validation']
      },
      {
        id: 'nav-workspace-travaux',
        label: 'Espace Travaux/SAV',
        category: 'Navigation',
        icon: <HardHat className="h-4 w-4" />,
        action: () => {
          setLocation('/workspace/travaux-sav');
          setOpen(false);
        },
        keywords: ['travaux', 'sav', 'chantier']
      },
      {
        id: 'nav-workspace-logistics',
        label: 'Espace Logistique',
        category: 'Navigation',
        icon: <Truck className="h-4 w-4" />,
        action: () => {
          setLocation('/workspace/logistics');
          setOpen(false);
        },
        keywords: ['logistique', 'livraison', 'transport']
      },

      // Création
      {
        id: 'create-ao',
        label: 'Créer un Appel d\'Offres',
        description: 'Nouvel AO',
        category: 'Création',
        icon: <Plus className="h-4 w-4" />,
        action: () => {
          setLocation('/create-ao');
          setOpen(false);
        },
        keywords: ['ao', 'appel offre', 'nouveau', 'créer']
      },
      {
        id: 'create-offer',
        label: 'Créer une Offre',
        description: 'Nouvelle offre de chiffrage',
        category: 'Création',
        icon: <ClipboardList className="h-4 w-4" />,
        action: () => {
          setLocation('/create-offer');
          setOpen(false);
        },
        keywords: ['offre', 'chiffrage', 'nouveau', 'créer']
      },
      {
        id: 'create-project',
        label: 'Créer un Projet',
        description: 'Nouveau projet',
        category: 'Création',
        icon: <Projector className="h-4 w-4" />,
        action: () => {
          setLocation('/projects/create');
          setOpen(false);
        },
        keywords: ['projet', 'nouveau', 'créer']
      },

      // Actions Rapides
      {
        id: 'quick-chiffrage',
        label: 'Chiffrage',
        description: 'Accéder au chiffrage',
        category: 'Actions Rapides',
        icon: <Calculator className="h-4 w-4" />,
        action: () => {
          setLocation('/offers/chiffrage');
          setOpen(false);
        },
        keywords: ['chiffrage', 'calcul', 'prix']
      },
      {
        id: 'quick-validation',
        label: 'Validation BE',
        description: 'Validations en attente',
        category: 'Actions Rapides',
        icon: <Settings className="h-4 w-4" />,
        action: () => {
          setLocation('/offers/validation');
          setOpen(false);
        },
        keywords: ['validation', 'be', 'bureau études']
      },
      {
        id: 'quick-sav',
        label: 'SAV',
        description: 'Service Après-Vente',
        category: 'Actions Rapides',
        icon: <Headphones className="h-4 w-4" />,
        action: () => {
          setLocation('/sav');
          setOpen(false);
        },
        keywords: ['sav', 'support', 'après vente']
      },
      {
        id: 'quick-logistics',
        label: 'Logistique',
        description: 'Livraisons et réceptions',
        category: 'Actions Rapides',
        icon: <Truck className="h-4 w-4" />,
        action: () => {
          setLocation('/logistics');
          setOpen(false);
        },
        keywords: ['logistique', 'livraison', 'transport']
      },

      // Offres récentes
      ...recentOffers.slice(0, 5).map((offer: any) => ({
        id: `offer-${offer.id}`,
        label: `Offre ${offer.reference}`,
        description: offer.client,
        category: 'Offres Récentes',
        icon: <ClipboardList className="h-4 w-4" />,
        action: () => {
          setLocation(`/offers/${offer.id}`);
          setOpen(false);
        },
        keywords: ['offre', offer.reference, offer.client],
        badge: offer.status
      })),

      // Projets récents
      ...recentProjects.slice(0, 5).map((project: any) => ({
        id: `project-${project.id}`,
        label: `Projet ${project.name}`,
        description: project.client,
        category: 'Projets Récents',
        icon: <Projector className="h-4 w-4" />,
        action: () => {
          setLocation(`/projects/${project.id}`);
          setOpen(false);
        },
        keywords: ['projet', project.name, project.client],
        badge: project.status
      }))
    ];

    return items;
  }, [recentOffers, recentProjects, setLocation]);

  // Filter commands based on search
  const filteredCommands = useMemo(() => {
    if (!search) return commands;

    const searchLower = search.toLowerCase();
    return commands.filter(cmd => {
      const matchesLabel = cmd.label.toLowerCase().includes(searchLower);
      const matchesDescription = cmd.description?.toLowerCase().includes(searchLower);
      const matchesKeywords = cmd.keywords?.some(k => k.toLowerCase().includes(searchLower));
      return matchesLabel || matchesDescription || matchesKeywords;
    });
  }, [commands, search]);

  // Group by category
  const groupedCommands = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {};
    filteredCommands.forEach(cmd => {
      if (!groups[cmd.category]) {
        groups[cmd.category] = [];
      }
      groups[cmd.category].push(cmd);
    });
    return groups;
  }, [filteredCommands]);

  // Keyboard shortcut: Cmd+K or Ctrl+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="p-0 max-w-2xl">
        <Command className="rounded-lg border-none shadow-lg">
          <CommandInput
            placeholder="Rechercher une commande, une page, une action..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList className="max-h-[400px] overflow-y-auto p-2">
            <CommandEmpty>Aucun résultat trouvé.</CommandEmpty>
            {Object.entries(groupedCommands).map(([category, items]) => (
              <CommandGroup key={category} heading={category}>
                {items.map((item) => (
                  <CommandItem
                    key={item.id}
                    onSelect={item.action}
                    className="flex items-center gap-3 px-2 py-2 rounded-md cursor-pointer aria-selected:bg-primary aria-selected:text-on-primary"
                  >
                      <div className="flex items-center justify-center w-8 h-8 rounded bg-surface-muted">
                        {item.icon}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{item.label}</span>
                          {item.badge && (
                            <Badge variant="secondary" className="text-xs">
                              {item.badge}
                            </Badge>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-xs text-muted-foreground">{item.description}</p>
                        )}
                      </div>
                      <ArrowRight className="h-4 w-4 opacity-50" />
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
          </CommandList>
          <div className="flex items-center justify-between border-t px-3 py-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
                <span className="text-xs">⌘</span>K
              </kbd>
              <span>pour ouvrir</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
                ↑↓
              </kbd>
              <span>pour naviguer</span>
            </div>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

