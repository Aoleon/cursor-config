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
  Headphones
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
  { name: "Tableau de Bord", href: "/", icon: TrendingUp },
  { 
    name: "Appels d'Offre", 
    href: "/offers", 
    icon: FolderOpen,
    subItems: [
      { name: "Création dossier", href: "/offers/create", icon: FileText, description: "Import PDF + OCR + Création" },
      { name: "Chiffrage", href: "/offers/chiffrage", icon: Calculator, description: "Module de chiffrage détaillé" },
      { name: "Demandes fournisseurs", href: "/offers/suppliers", icon: Send, description: "Consultation fournisseurs" },
      { name: "Validation BE", href: "/offers/validation", icon: CheckCircle, description: "Validation fin d'études" },
      { name: "Transformation", href: "/offers/transform", icon: ArrowRight, description: "Passage en projet" },
    ]
  },
  { 
    name: "Projets", 
    href: "/projects", 
    icon: Projector,
    subItems: [
      { name: "Étude", href: "/projects/study", icon: Search, description: "Phase d'étude technique" },
      { name: "Planification", href: "/projects/planning", icon: Calendar, description: "Planning et jalons" },
      { name: "Approvisionnement", href: "/projects/supply", icon: Package, description: "Commandes et logistique" },
      { name: "Chantier", href: "/projects/worksite", icon: HardHat, description: "Suivi chantier" },
      { name: "SAV", href: "/projects/support", icon: Headphones, description: "Service après-vente" },
    ]
  },
  { name: "Équipes", href: "/teams", icon: Users },
  { name: "Fournisseurs", href: "/suppliers", icon: Truck },
];

const beNavigation = [
  { name: "Indicateurs BE", href: "/be-indicators", icon: TrendingUp },
  { name: "Priorités", href: "/priorities", icon: AlertTriangle },
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
    <aside className="w-64 bg-white shadow-card flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <Wrench className="text-white text-lg" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">JLM ERP</h1>
            <p className="text-sm text-gray-600">Menuiserie</p>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 mt-6 overflow-y-auto">
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
                        ? "bg-primary-light text-primary"
                        : "text-gray-700 hover:bg-gray-100"
                    )}
                    onClick={() => {
                      if (hasSubItems) {
                        toggleExpanded(item.name);
                      }
                    }}
                  >
                    <Link href={item.href} className="flex items-center flex-1">
                      <div className="flex items-center">
                        <item.icon
                          className={cn(
                            "mr-3 text-base",
                            isActive ? "text-primary" : "text-gray-400"
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
                    <div className="mt-1 ml-4 space-y-1">
                      {item.subItems?.map((subItem) => {
                        const isSubActive = location === subItem.href;
                        return (
                          <Link key={subItem.name} href={subItem.href}>
                            <div
                              className={cn(
                                "group flex items-center px-3 py-2 text-xs rounded-md transition-colors cursor-pointer",
                                isSubActive
                                  ? "bg-primary-light/50 text-primary"
                                  : "text-gray-600 hover:bg-gray-50"
                              )}
                              title={subItem.description}
                            >
                              <subItem.icon
                                className={cn(
                                  "mr-2 text-sm",
                                  isSubActive ? "text-primary" : "text-gray-400"
                                )}
                              />
                              <div className="flex flex-col">
                                <span className="font-medium">{subItem.name}</span>
                                <span className="text-xs text-gray-500 mt-0.5">
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
        
        <div className="mt-8 px-3">
          <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Bureau d'Études
          </h3>
          <div className="mt-2 space-y-1">
            {beNavigation.map((item) => {
              const isActive = location === item.href;
              return (
                <Link key={item.name} href={item.href}>
                  <div
                    className={cn(
                      "group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer",
                      isActive
                        ? "bg-primary-light text-primary"
                        : "text-gray-700 hover:bg-gray-100"
                    )}
                  >
                    <item.icon
                      className={cn(
                        "mr-3 text-base",
                        isActive ? "text-primary" : "text-gray-400"
                      )}
                    />
                    {item.name}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
      
      <div className="p-4">
        <div className="bg-gray-100 rounded-lg p-3">
          <div className="flex items-center space-x-3">
            <Avatar className="w-8 h-8">
              <AvatarImage src={(user as any)?.profileImageUrl || ''} alt={`${(user as any)?.firstName || ''} ${(user as any)?.lastName || ''}`} />
              <AvatarFallback>
                {`${(user as any)?.firstName?.[0] || ''}${(user as any)?.lastName?.[0] || 'U'}`}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {(user as any)?.firstName || ''} {(user as any)?.lastName || ''}
              </p>
              <p className="text-xs text-gray-600 truncate">
                {(user as any)?.role === 'admin' ? 'Administrateur' : 'Chef de projet'}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.location.href = "/api/logout"}
              className="text-gray-400 hover:text-gray-600"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}
