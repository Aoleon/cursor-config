import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import type { LucideIcon } from "lucide-react";
import { 
  Wrench, 
  FolderOpen, 
  Calculator, 
  Projector, 
  Calendar, 
  Users, 
  Truck, 
  TrendingUp, 
  AlertTriangle,
  LogOut,
  ChevronDown,
  ChevronRight,
  FileText,
  Upload,
  ClipboardList,
  DollarSign,
  Send,
  CheckCircle,
  ArrowRight,
  Search,
  Building,
  Package,
  HardHat,
  Headphones,
  Database,
  Settings,
  CalendarDays,
  BarChart3,
  Bot,
  Sparkles,
  Shield
} from "lucide-react";

interface SubMenuItem {
  name: string;
  href: string;
  icon: LucideIcon;
  description: string;
}

interface NavigationItem {
  name: string;
  href: string;
  icon: LucideIcon;
  subItems?: SubMenuItem[];
  relatedPaths?: string[]; // Chemins associés qui doivent activer ce parent
}

const navigation: NavigationItem[] = [
  // ============= DASHBOARDS STANDARDISÉS ============= //
  { name: "Dashboard Dirigeant", href: "/dashboard/executive", icon: BarChart3 },
  { name: "Dashboard BE", href: "/dashboard/be", icon: Settings },
  
  // ============= GESTION OFFRES ============= //
  { 
    name: "Gestion Offres", 
    href: "/offers", 
    icon: ClipboardList,
    relatedPaths: ["/offers", "/workflow", "/offers/chiffrage", "/offers/validation", "/offers/transform", "/supplier-requests"],
    subItems: [
      { name: "Étude technique", href: "/workflow/etude-technique", icon: FileText, description: "Analyse AO et faisabilité" },
      { name: "Demandes fournisseurs", href: "/supplier-requests", icon: Send, description: "Sollicitation prix fournisseurs" },
      { name: "Chiffrage", href: "/offers/chiffrage", icon: Calculator, description: "Calcul coûts et marges" },
      { name: "Validation BE", href: "/offers/validation", icon: CheckCircle, description: "Validation technique finale" },
      { name: "Transformation", href: "/offers/transform", icon: ArrowRight, description: "Conversion en projet" },
    ]
  },
  
  // ============= PROJETS POST-SIGNATURE ============= //
  { 
    name: "Projets", 
    href: "/projects", 
    icon: Projector,
    relatedPaths: ["/projects"],
    subItems: [
      { name: "Étude", href: "/projects/study", icon: Search, description: "Phase d'étude technique détaillée" },
      { name: "Planification", href: "/projects/planning", icon: Calendar, description: "Planning exécution et jalons" },
      { name: "Approvisionnement", href: "/projects/supply", icon: Package, description: "Commandes matières et logistique" },
      { name: "Chantier", href: "/projects/worksite", icon: HardHat, description: "Suivi installation chantier" },
      { name: "SAV", href: "/projects/support", icon: Headphones, description: "Support et service après-vente" },
    ]
  },
  
  // ============= RESSOURCES TRANSVERSALES ============= //
  { name: "Équipes", href: "/teams", icon: Users },
  { name: "Fournisseurs", href: "/suppliers", icon: Truck },
  
  // ============= ADMINISTRATION ============= //
  { 
    name: "Administration", 
    href: "/administration", 
    icon: Shield,
    relatedPaths: ["/administration", "/chatbot-demo", "/batigest", "/monday"],
    subItems: [
      { name: "Démo Chatbot IA", href: "/chatbot-demo", icon: Sparkles, description: "Test du chatbot IA Saxium" },
      { name: "Import Monday.com", href: "/monday/import", icon: Upload, description: "Importer données Monday.com" },
      { name: "Batigest", href: "/batigest", icon: Database, description: "Interface de gestion Batigest" },
      { name: "Dashboard Batigest", href: "/batigest/dashboard", icon: BarChart3, description: "Suivi synchronisation Batigest" },
      { name: "Bons de Commande", href: "/batigest/purchase-order-generator", icon: FileText, description: "Générer bons de commande fournisseur" },
    ]
  },
];


export default function Sidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  // ========================================
  // LOGIQUE INTELLIGENTE ÉTATS ACTIFS
  // ========================================
  
  const isDirectlyActive = (href: string): boolean => {
    return location === href;
  };
  
  const isPathRelated = (item: NavigationItem): boolean => {
    // Vérifier si la route courante correspond au href principal
    if (location === item.href || location.startsWith(item.href + "/")) {
      return true;
    }
    
    // Vérifier les chemins associés (relatedPaths)
    if (item.relatedPaths) {
      return item.relatedPaths.some(path => 
        location === path || location.startsWith(path + "/")
      );
    }
    
    return false;
  };
  
  const hasActiveSubItem = (item: NavigationItem): boolean => {
    if (!item.subItems) return false;
    return item.subItems.some(subItem => 
      location === subItem.href || location.startsWith(subItem.href + "/")
    );
  };
  
  const isParentActive = (item: NavigationItem): boolean => {
    return isPathRelated(item) || hasActiveSubItem(item);
  };

  // ========================================
  // AUTO-EXPANSION GROUPES AVEC ENFANTS ACTIFS
  // ========================================
  
  useEffect(() => {
    navigation.forEach((item) => {
      if (item.subItems && isParentActive(item)) {
        setExpandedItems(prev => 
          prev.includes(item.name) ? prev : [...prev, item.name]
        );
      }
    });
  }, [location]);

  const toggleExpanded = (itemName: string) => {
    setExpandedItems(prev => 
      prev.includes(itemName)
        ? prev.filter(name => name !== itemName)
        : [...prev, itemName]
    );
  };

  return (
    <aside className="flex w-64 bg-surface shadow-card flex-col" data-testid="sidebar">
      <div className="p-6 border-b border">
        <div className="flex items-center space-x-3" data-testid="sidebar-brand">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <Wrench className="text-on-primary text-lg" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-on-surface" data-testid="brand-title">Saxium</h1>
            <p className="text-sm text-on-surface-muted" data-testid="brand-subtitle">Business</p>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 mt-6 overflow-y-auto" data-testid="sidebar-navigation">
        <div className="px-3">
          <div className="space-y-1">
            {navigation.map((item) => {
              const isDirectActive = isDirectlyActive(item.href);
              const isParentActiveState = isParentActive(item);
              const isExpanded = expandedItems.includes(item.name);
              const hasSubItems = item.subItems && item.subItems.length > 0;
              const hasActiveChild = hasActiveSubItem(item);

              return (
                <div key={item.name}>
                  <div
                    className={cn(
                      "group flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                      isDirectActive
                        ? "bg-secondary text-on-secondary shadow-sm"
                        : isParentActiveState && hasActiveChild
                        ? "bg-secondary/30 text-on-secondary border-l-2 border-secondary"
                        : "text-on-surface hover:bg-surface-muted hover:shadow-sm"
                    )}
                    role="button"
                    tabIndex={0}
                    aria-expanded={hasSubItems ? isExpanded : undefined}
                    aria-label={`${item.name}${hasSubItems ? (isExpanded ? ' (développé)' : ' (réduit)') : ''}`}
                    onClick={() => {
                      if (hasSubItems) {
                        toggleExpanded(item.name);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        if (hasSubItems) {
                          toggleExpanded(item.name);
                        }
                      }
                    }}
                    data-testid={`nav-item-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <Link href={item.href} className="flex items-center flex-1" data-testid={`nav-link-${item.name.toLowerCase().replace(/\s+/g, '-')}`}>
                      <div className="flex items-center">
                        <item.icon
                          className={cn(
                            "mr-3 text-base",
                            isDirectActive ? "text-on-secondary" : 
                            isParentActiveState && hasActiveChild ? "text-on-secondary" : 
                            "text-muted-foreground"
                          )}
                        />
                        {item.name}
                      </div>
                    </Link>
                    {hasSubItems && (
                      <button
                        className="ml-auto p-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpanded(item.name);
                        }}
                        data-testid={`button-expand-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>
                  
                  {hasSubItems && (
                    <div 
                      className={cn(
                        "mt-1 ml-4 space-y-1 overflow-hidden transition-all duration-300 ease-in-out",
                        isExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                      )}
                      data-testid={`nav-subitems-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                      role="group"
                      aria-label={`Sous-éléments de ${item.name}`}
                    >
                      {item.subItems?.map((subItem) => {
                        const isSubActive = location === subItem.href || location.startsWith(subItem.href + "/");
                        return (
                          <Link key={subItem.name} href={subItem.href} data-testid={`nav-sublink-${subItem.name.toLowerCase().replace(/\s+/g, '-')}`}>
                            <div
                              className={cn(
                                "group flex items-center px-3 py-2 text-xs rounded-md transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                                isSubActive
                                  ? "bg-secondary text-on-secondary border-l-2 border-secondary ml-2 shadow-sm"
                                  : "text-on-surface-muted hover:bg-surface-muted hover:shadow-sm"
                              )}
                              title={subItem.description}
                              data-testid={`nav-subitem-${subItem.name.toLowerCase().replace(/\s+/g, '-')}`}
                              role="button"
                              tabIndex={0}
                              aria-label={`${subItem.name} - ${subItem.description}`}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  window.location.href = subItem.href;
                                }
                              }}
                            >
                              <subItem.icon
                                className={cn(
                                  "mr-2 text-sm",
                                  isSubActive ? "text-on-secondary" : "text-muted-foreground"
                                )}
                              />
                              <div className="flex flex-col">
                                <span className={cn(
                                  "font-medium",
                                  isSubActive ? "text-on-secondary" : "text-on-surface"
                                )}>{subItem.name}</span>
                                <span className={cn(
                                  "text-xs mt-0.5",
                                  isSubActive ? "text-on-secondary/70" : "text-muted-foreground"
                                )}>
                                  {subItem.description}
                                </span>
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </nav>
      
      <div className="p-4" data-testid="sidebar-user-section">
        <div className="bg-surface-muted rounded-lg p-3">
          <div className="flex items-center space-x-3">
            <Avatar className="w-8 h-8" data-testid="user-avatar">
              <AvatarImage src={(user as any)?.profileImageUrl || ''} alt={`${(user as any)?.firstName || ''} ${(user as any)?.lastName || ''}`} />
              <AvatarFallback>
                {`${(user as any)?.firstName?.[0] || ''}${(user as any)?.lastName?.[0] || 'U'}`}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-on-surface truncate" data-testid="user-name">
                {(user as any)?.firstName || ''} {(user as any)?.lastName || ''}
              </p>
              <p className="text-xs text-on-surface-muted truncate" data-testid="user-role">
                {(user as any)?.role === 'admin' ? 'Administrateur' : 'Chef de projet'}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.location.href = "/api/logout"}
              className="text-muted-foreground hover:text-on-surface-muted"
              data-testid="button-logout"
              title="Se déconnecter"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}
