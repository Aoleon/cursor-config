import { useLocation } from "wouter";
import { useMemo } from "react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface RouteConfig {
  path: string;
  label: string;
  parent?: string;
  getData?: (params: Record<string, string>) => Promise<{ name: string }> | { name: string };
}

// ========================================
// CONFIGURATION ROUTES MÉTIER FRANÇAISE
// ========================================

const ROUTE_CONFIG: Record<string, RouteConfig> = {
  // ============= DASHBOARDS ============= //
  "/dashboard/executive": {
    path: "/dashboard/executive",
    label: "Dashboard Dirigeant",
    parent: "/"
  },
  "/dashboard/be": {
    path: "/dashboard/be", 
    label: "Dashboard BE",
    parent: "/"
  },
  "/dashboard": {
    path: "/dashboard",
    label: "Dashboard Terrain",
    parent: "/"
  },

  // ============= WORKFLOW AO ============= //
  "/workflow": {
    path: "/workflow",
    label: "Workflow AO",
    parent: "/"
  },
  "/workflow/etude-technique": {
    path: "/workflow/etude-technique",
    label: "Étude Technique", 
    parent: "/workflow"
  },
  "/supplier-requests": {
    path: "/supplier-requests",
    label: "Demandes Fournisseurs",
    parent: "/workflow"
  },

  // ============= OFFERS (partie du workflow) ============= //
  "/offers": {
    path: "/offers",
    label: "Gestion Offres",
    parent: "/"
  },
  "/offers/chiffrage": {
    path: "/offers/chiffrage",
    label: "Chiffrage",
    parent: "/workflow"
  },
  "/offers/validation": {
    path: "/offers/validation", 
    label: "Validation BE",
    parent: "/workflow"
  },
  "/offers/transform": {
    path: "/offers/transform",
    label: "Transformation",
    parent: "/workflow"
  },
  "/offers/chiffrage-list": {
    path: "/offers/chiffrage-list",
    label: "Liste Chiffrage",
    parent: "/workflow"
  },
  "/offers/validation-list": {
    path: "/offers/validation-list",
    label: "Liste Validation",
    parent: "/workflow"
  },
  "/offers/transform-list": {
    path: "/offers/transform-list",
    label: "Liste Transformation", 
    parent: "/workflow"
  },

  // ============= PROJETS ============= //
  "/projects": {
    path: "/projects",
    label: "Projets",
    parent: "/"
  },
  "/projects/study": {
    path: "/projects/study",
    label: "Étude",
    parent: "/projects"
  },
  "/projects/planning": {
    path: "/projects/planning",
    label: "Planification",
    parent: "/projects"
  },
  "/projects/supply": {
    path: "/projects/supply", 
    label: "Approvisionnement",
    parent: "/projects"
  },
  "/projects/worksite": {
    path: "/projects/worksite",
    label: "Chantier", 
    parent: "/projects"
  },
  "/projects/support": {
    path: "/projects/support",
    label: "SAV",
    parent: "/projects"
  },

  // ============= ENTITÉS TRANSVERSALES ============= //
  "/teams": {
    path: "/teams",
    label: "Équipes",
    parent: "/"
  },
  "/suppliers": {
    path: "/suppliers",
    label: "Fournisseurs", 
    parent: "/"
  },
  "/batigest": {
    path: "/batigest",
    label: "Batigest",
    parent: "/"
  }
};

// ========================================
// MAPPING ONGLETS EXECUTIVE DASHBOARD
// ========================================

const EXECUTIVE_TAB_LABELS: Record<string, string> = {
  "overview": "Vue d'ensemble",
  "intelligence": "Intelligence Temporelle", 
  "analytics": "Analytics",
  "configuration": "Configuration"
};

// ========================================
// HOOK USEBREADCRUMBS INTELLIGENT
// ========================================

export function useBreadcrumbs(): BreadcrumbItem[] {
  const [location] = useLocation();

  return useMemo(() => {
    const breadcrumbs: BreadcrumbItem[] = [];
    
    // Toujours commencer par "Accueil"
    breadcrumbs.push({ label: "Accueil", href: "/" });

    // Parser l'URL courante pour extraire le chemin et les query params
    const [currentPath, queryString] = location.split('?');
    const searchParams = new URLSearchParams(queryString || '');

    // Debugging temporaire pour synchronisation Executive Dashboard
    if (currentPath === '/dashboard/executive') {
      // Forcer re-évaluation pour éviter race condition
      const tabValue = searchParams.get('tab');
      console.log('Executive breadcrumbs sync:', { currentPath, queryString, tabValue });
    }

    // Trouver la configuration de route correspondante
    let routeConfig = ROUTE_CONFIG[currentPath];
    
    // Si pas de match exact, essayer de trouver une route parente
    if (!routeConfig) {
      // Essayer les routes dynamiques (ex: /projects/123 -> /projects)
      const pathSegments = currentPath.split('/').filter(Boolean);
      for (let i = pathSegments.length; i > 0; i--) {
        const testPath = '/' + pathSegments.slice(0, i).join('/');
        if (ROUTE_CONFIG[testPath]) {
          routeConfig = ROUTE_CONFIG[testPath];
          break;
        }
      }
    }

    if (routeConfig) {
      // Construire la hiérarchie en remontant les parents
      const hierarchy: RouteConfig[] = [];
      let current: RouteConfig | undefined = routeConfig;
      
      while (current) {
        hierarchy.unshift(current);
        current = current.parent ? ROUTE_CONFIG[current.parent] : undefined;
      }

      // Ajouter chaque niveau de la hiérarchie (sauf "Accueil" déjà ajouté)
      hierarchy.forEach((config, index) => {
        if (config.path !== "/") {
          const isLast = index === hierarchy.length - 1;
          breadcrumbs.push({
            label: config.label,
            href: isLast ? undefined : config.path
          });
        }
      });
    } else {
      // Route non configurée, utiliser le chemin comme label de fallback
      const pathSegments = currentPath.split('/').filter(Boolean);
      if (pathSegments.length > 0) {
        const fallbackLabel = pathSegments[pathSegments.length - 1]
          .replace(/-/g, ' ')
          .replace(/\b\w/g, l => l.toUpperCase());
        breadcrumbs.push({ label: fallbackLabel });
      }
    }

    // ========================================
    // GESTION SPÉCIALE EXECUTIVE DASHBOARD TABS
    // ========================================
    
    if (currentPath === '/dashboard/executive' && searchParams.has('tab')) {
      const tabValue = searchParams.get('tab');
      const tabLabel = EXECUTIVE_TAB_LABELS[tabValue || ''];
      
      if (tabLabel) {
        // Remplacer le dernier breadcrumb par un lien vers la page principale
        const lastCrumb = breadcrumbs[breadcrumbs.length - 1];
        if (lastCrumb && !lastCrumb.href) {
          lastCrumb.href = '/dashboard/executive';
        }
        
        // Ajouter l'onglet comme dernier élément
        breadcrumbs.push({ label: tabLabel });
        console.log('Tab breadcrumb ajouté:', tabLabel);
      }
    }

    // ========================================
    // GESTION ROUTES DYNAMIQUES AVEC ID
    // ========================================
    
    // Pour les routes avec ID (ex: /projects/123, /offers/456)
    const dynamicMatch = currentPath.match(/\/(\w+)\/([a-zA-Z0-9-]+)$/);
    if (dynamicMatch && breadcrumbs.length > 1) {
      const [, entityType, entityId] = dynamicMatch;
      
      // Ajouter l'ID comme dernier élément si ce n'est pas déjà fait
      const lastCrumb = breadcrumbs[breadcrumbs.length - 1];
      if (lastCrumb && lastCrumb.href) {
        // Le dernier breadcrumb a un href, donc ajouter l'entité
        breadcrumbs.push({ 
          label: `${entityType.charAt(0).toUpperCase() + entityType.slice(1)} ${entityId}`
        });
      }
    }

    return breadcrumbs;
  }, [location]);
}

// ========================================
// HOOK COMPLÉMENTAIRE POUR TITRE PAGE
// ========================================

export function usePageTitle(): string {
  const [location] = useLocation();
  
  return useMemo(() => {
    const [currentPath, queryString] = location.split('?');
    const searchParams = new URLSearchParams(queryString || '');
    
    const routeConfig = ROUTE_CONFIG[currentPath];
    if (routeConfig) {
      // Gestion spéciale Executive Dashboard avec tabs
      if (currentPath === '/dashboard/executive' && searchParams.has('tab')) {
        const tabValue = searchParams.get('tab');
        const tabLabel = EXECUTIVE_TAB_LABELS[tabValue || ''];
        return tabLabel || routeConfig.label;
      }
      
      return routeConfig.label;
    }
    
    // Fallback pour routes non configurées
    const pathSegments = currentPath.split('/').filter(Boolean);
    if (pathSegments.length > 0) {
      return pathSegments[pathSegments.length - 1]
        .replace(/-/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
    }
    
    return "Saxium Business";
  }, [location]);
}