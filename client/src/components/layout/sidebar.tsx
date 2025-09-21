import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
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
  BarChart3
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
}

const navigation: NavigationItem[] = [
  // ============= DASHBOARDS STANDARDISÉS ============= //
  { name: "Dashboard Dirigeant", href: "/dashboard/executive", icon: BarChart3 },
  { name: "Dashboard BE", href: "/dashboard/be", icon: Settings },
  
  // ============= WORKFLOW AVANT-VENTE ============= //
  { 
    name: "Workflow AO", 
    href: "/workflow/etude-technique", 
    icon: FolderOpen,
    subItems: [
      { name: "Étude technique", href: "/workflow/etude-technique", icon: FileText, description: "Analyse AO et faisabilité" },
      { name: "Demandes fournisseurs", href: "/supplier-requests", icon: Send, description: "Sollicitation prix fournisseurs" },
      { name: "Chiffrage", href: "/offers/chiffrage", icon: Calculator, description: "Calcul coûts et marges" },
      { name: "Validation BE", href: "/offers/validation", icon: CheckCircle, description: "Validation technique finale" },
      { name: "Transformation", href: "/offers/transform", icon: ArrowRight, description: "Conversion en projet" },
    ]
  },
  
  // ============= GESTION OFFRES ============= //
  { name: "Gestion Offres", href: "/offers", icon: ClipboardList },
  
  // ============= PROJETS POST-SIGNATURE ============= //
  { 
    name: "Projets", 
    href: "/projects", 
    icon: Projector,
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
  { name: "Batigest", href: "/batigest", icon: Database },
];


export default function Sidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

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
              const isActive = location === item.href || location.startsWith(item.href + "/");
              const isExpanded = expandedItems.includes(item.name);
              const hasSubItems = item.subItems && item.subItems.length > 0;

              return (
                <div key={item.name}>
                  <div
                    className={cn(
                      "group flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer",
                      isActive
                        ? "bg-secondary text-on-secondary"
                        : "text-on-surface hover:bg-surface-muted"
                    )}
                    onClick={() => {
                      if (hasSubItems) {
                        toggleExpanded(item.name);
                      }
                    }}
                    data-testid={`nav-item-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <Link href={item.href} className="flex items-center flex-1" data-testid={`nav-link-${item.name.toLowerCase().replace(/\s+/g, '-')}`}>
                      <div className="flex items-center">
                        <item.icon
                          className={cn(
                            "mr-3 text-base",
                            isActive ? "text-on-secondary" : "text-muted-foreground"
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
                  
                  {hasSubItems && isExpanded && (
                    <div className="mt-1 ml-4 space-y-1" data-testid={`nav-subitems-${item.name.toLowerCase().replace(/\s+/g, '-')}`}>
                      {item.subItems?.map((subItem) => {
                        const isSubActive = location === subItem.href;
                        return (
                          <Link key={subItem.name} href={subItem.href} data-testid={`nav-sublink-${subItem.name.toLowerCase().replace(/\s+/g, '-')}`}>
                            <div
                              className={cn(
                                "group flex items-center px-3 py-2 text-xs rounded-md transition-colors cursor-pointer",
                                isSubActive
                                  ? "bg-secondary/50 text-on-secondary"
                                  : "text-on-surface-muted hover:bg-surface-muted"
                              )}
                              title={subItem.description}
                              data-testid={`nav-subitem-${subItem.name.toLowerCase().replace(/\s+/g, '-')}`}
                            >
                              <subItem.icon
                                className={cn(
                                  "mr-2 text-sm",
                                  isSubActive ? "text-on-secondary" : "text-muted-foreground"
                                )}
                              />
                              <div className="flex flex-col">
                                <span className="font-medium">{subItem.name}</span>
                                <span className="text-xs text-muted-foreground mt-0.5">
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
