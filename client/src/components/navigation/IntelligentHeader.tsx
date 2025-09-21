import { Button } from "@/components/ui/button";
import { WebSocketStatus } from "@/components/ui/websocket-status";
import { 
  Breadcrumb, 
  BreadcrumbItem, 
  BreadcrumbLink, 
  BreadcrumbList, 
  BreadcrumbPage, 
  BreadcrumbSeparator 
} from "@/components/ui/breadcrumb";
import { Download, Plus, FileText, Settings, Home } from "lucide-react";
import { useBreadcrumbs, usePageTitle } from "@/hooks/useBreadcrumbs";
import { Link, useLocation } from "wouter";

// ========================================
// INTERFACE HEADER INTELLIGENT
// ========================================

interface IntelligentHeaderProps {
  // Override automatique si besoin
  title?: string;
  breadcrumbs?: Array<{
    label: string;
    href?: string;
  }>;
  actions?: Array<{
    label: string;
    variant?: "default" | "outline" | "secondary";
    icon?: string;
    action?: string;
    onClick?: () => void;
  }>;
  // Nouvelles props pour customisation
  hideBreadcrumbs?: boolean;
  showHomeIcon?: boolean;
  className?: string;
}

// ========================================
// COMPOSANT HEADER INTELLIGENT
// ========================================

export default function IntelligentHeader({ 
  title: customTitle, 
  breadcrumbs: customBreadcrumbs, 
  actions = [],
  hideBreadcrumbs = false,
  showHomeIcon = true,
  className = ""
}: IntelligentHeaderProps) {
  
  // ========================================
  // GÉNÉRATION AUTOMATIQUE BREADCRUMBS
  // ========================================
  
  const autoBreadcrumbs = useBreadcrumbs();
  const autoTitle = usePageTitle();
  
  // ========================================
  // FIX EXECUTIVE DASHBOARD BREADCRUMBS
  // ========================================
  
  const [location] = useLocation();
  const isExecutiveDashboard = location.startsWith('/dashboard/executive');
  
  // Force-override pour Executive Dashboard avec tabs
  const getExecutiveBreadcrumbs = () => {
    if (!isExecutiveDashboard) return null;
    
    const breadcrumbs = [
      { label: "Accueil", href: "/" }
    ];
    
    // Détecter l'onglet actif depuis URL
    const urlParams = new URLSearchParams(location.split('?')[1] || '');
    const activeTab = urlParams.get('tab');
    
    // DEBUG: Ajouter logging pour diagnostiquer
    console.log('Executive Dashboard Override:', { location, activeTab, urlParams: Object.fromEntries(urlParams) });
    
    if (activeTab) {
      // Si onglet actif, Dashboard Dirigeant devient un lien vers la page principale
      breadcrumbs.push({ label: "Dashboard Dirigeant", href: "/dashboard/executive" });
      
      // Ajouter le segment tab spécifique
      const tabLabels: Record<string, string> = {
        "intelligence": "Intelligence Temporelle",
        "analytics": "Analytics",  
        "configuration": "Configuration"
      };
      
      const tabLabel = tabLabels[activeTab];
      if (tabLabel) {
        breadcrumbs.push({ label: tabLabel });
        console.log('Executive tab breadcrumb ajouté:', tabLabel);
      } else {
        console.log('Aucun label trouvé pour tab:', activeTab);
      }
    } else {
      // Pas d'onglet, Dashboard Dirigeant est la page courante
      breadcrumbs.push({ label: "Dashboard Dirigeant" });
    }
    
    console.log('Final Executive breadcrumbs:', breadcrumbs);
    return breadcrumbs;
  };
  
  // Utiliser breadcrumbs personnalisés, Executive fix, ou automatiques
  const executiveBreadcrumbs = getExecutiveBreadcrumbs();
  const effectiveBreadcrumbs = customBreadcrumbs || executiveBreadcrumbs || autoBreadcrumbs;
  const effectiveTitle = customTitle || autoTitle;

  // ========================================
  // GESTION ICÔNES ACTIONS
  // ========================================
  
  const getIcon = (iconName?: string) => {
    switch (iconName) {
      case "download": return <Download className="w-4 h-4" />;
      case "plus": return <Plus className="w-4 h-4" />;
      case "file": return <FileText className="w-4 h-4" />;
      case "settings": return <Settings className="w-4 h-4" />;
      case "home": return <Home className="w-4 h-4" />;
      default: return null;
    }
  };

  const handleActionClick = (action?: string, onClick?: () => void) => {
    if (onClick) {
      onClick();
    } else if (action) {
      console.log(`Action: ${action}`);
      // Handle predefined actions here
    }
  };

  // ========================================
  // RENDU BREADCRUMBS INTELLIGENT
  // ========================================
  
  const renderBreadcrumbs = () => {
    if (hideBreadcrumbs || effectiveBreadcrumbs.length <= 1) {
      return null;
    }

    return (
      <Breadcrumb className="mt-1" data-testid="intelligent-breadcrumbs">
        <BreadcrumbList>
          {effectiveBreadcrumbs.map((crumb, index) => (
            <div key={index} className="flex items-center">
              {index > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem>
                {crumb.href ? (
                  <BreadcrumbLink 
                    asChild
                    data-testid={`breadcrumb-link-${crumb.label?.toLowerCase().replace(/\s+/g, '-') || 'unknown'}`}
                  >
                    <Link href={crumb.href} className="flex items-center gap-1">
                      {index === 0 && showHomeIcon && <Home className="w-3 h-3" />}
                      {crumb.label}
                    </Link>
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage 
                    data-testid={`breadcrumb-page-${crumb.label?.toLowerCase().replace(/\s+/g, '-') || 'unknown'}`}
                    className="flex items-center gap-1"
                  >
                    {index === 0 && showHomeIcon && <Home className="w-3 h-3" />}
                    {crumb.label}
                  </BreadcrumbPage>
                )}
              </BreadcrumbItem>
            </div>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
    );
  };

  // ========================================
  // RENDU PRINCIPAL
  // ========================================

  return (
    <div className={`bg-white dark:bg-background border-b border-gray-200 dark:border-border px-4 sm:px-6 py-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl font-bold text-on-surface dark:text-foreground truncate" data-testid="intelligent-header-title">
            {effectiveTitle}
          </h1>
          {renderBreadcrumbs()}
        </div>
        
        <div className="flex items-center gap-3 ml-4">
          <WebSocketStatus 
            variant="badge" 
            showLabel={false} 
            data-testid="header-websocket-status" 
          />
          
          {actions.length > 0 && (
            <div className="flex flex-wrap items-center gap-2" data-testid="header-actions">
              {actions.map((action, index) => (
                <Button
                  key={index}
                  variant={action.variant || "default"}
                  onClick={() => handleActionClick(action.action, action.onClick)}
                  className="flex items-center gap-2"
                  data-testid={`button-${action.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  {getIcon(action.icon)}
                  <span className="hidden sm:inline">{action.label}</span>
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ========================================
// COMPOSANT LAYOUT AVEC HEADER INTELLIGENT
// ========================================

interface PageLayoutProps {
  children: React.ReactNode;
  title?: string;
  actions?: IntelligentHeaderProps['actions'];
  hideBreadcrumbs?: boolean;
  className?: string;
}

export function PageLayout({ 
  children, 
  title, 
  actions, 
  hideBreadcrumbs = false,
  className = ""
}: PageLayoutProps) {
  return (
    <div className={`min-h-screen bg-background ${className}`}>
      <IntelligentHeader 
        title={title}
        actions={actions}
        hideBreadcrumbs={hideBreadcrumbs}
      />
      <main className="p-6">
        {children}
      </main>
    </div>
  );
}