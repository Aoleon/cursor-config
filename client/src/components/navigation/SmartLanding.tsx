import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

// ========================================
// MAPPING RÔLES VERS DASHBOARDS
// ========================================

const ROLE_TO_DASHBOARD = {
  // DIRIGEANT / EXECUTIVE
  admin: "/dashboard/executive",
  
  // BUREAU D'ÉTUDE
  technicien_be: "/dashboard/be",
  responsable_be: "/dashboard/be",
  
  // TERRAIN / CHEFS DE PROJET
  chef_projet: "/dashboard",
  chef_travaux: "/dashboard",
  
  // FALLBACK SÉCURISÉ
  default: "/dashboard/executive"
} as const;

type UserRole = keyof typeof ROLE_TO_DASHBOARD | string;

// ========================================
// COMPOSANT SMART LANDING
// ========================================

interface SmartLandingProps {
  returnUrl?: string;
}

export default function SmartLanding({ returnUrl }: SmartLandingProps) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isLoading) {
      // Attendre la vérification d'authentification
      return;
    }

    if (!isAuthenticated) {
      // Rediriger vers login avec returnUrl si fourni
      const loginUrl = returnUrl 
        ? `/login?returnUrl=${encodeURIComponent(returnUrl)}`
        : "/login";
      setLocation(loginUrl);
      return;
    }

    // Utilisateur authentifié - déterminer la destination selon le rôle
    const userRole = (user as any)?.role as UserRole;
    let targetDashboard: string;

    if (userRole && userRole in ROLE_TO_DASHBOARD) {
      targetDashboard = ROLE_TO_DASHBOARD[userRole as keyof typeof ROLE_TO_DASHBOARD];
    } else {
      // Rôle non reconnu - utiliser le dashboard par défaut
      console.warn(`Rôle utilisateur non reconnu: ${userRole}. Redirection vers dashboard exécutif.`);
      targetDashboard = ROLE_TO_DASHBOARD.default;
    }

    // Si returnUrl fourni et valide, l'utiliser à la place
    if (returnUrl && returnUrl !== "/") {
      // Valider que returnUrl n'est pas une URL externe
      if (returnUrl.startsWith("/") && !returnUrl.startsWith("//")) {
        setLocation(returnUrl);
        return;
      }
    }

    // Redirection vers le dashboard approprié
    setLocation(targetDashboard);
  }, [isLoading, isAuthenticated, user, returnUrl, setLocation]);

  // ========================================
  // ÉTAT DE CHARGEMENT PENDANT REDIRECTION
  // ========================================

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">
            Redirection en cours...
          </h2>
          <p className="text-muted-foreground">
            {isLoading 
              ? "Vérification de votre authentification..." 
              : !isAuthenticated 
              ? "Redirection vers la page de connexion..."
              : "Accès à votre espace de travail..."}
          </p>
        </div>
      </div>
    </div>
  );
}

// ========================================
// HOOK UTILITAIRE POUR OBTENIR DASHBOARD PAR RÔLE
// ========================================

export function useRoleBasedDashboard(): string {
  const { user } = useAuth();
  const userRole = (user as any)?.role as UserRole;
  
  if (userRole && userRole in ROLE_TO_DASHBOARD) {
    return ROLE_TO_DASHBOARD[userRole as keyof typeof ROLE_TO_DASHBOARD];
  }
  
  return ROLE_TO_DASHBOARD.default;
}

// ========================================
// UTILITAIRE VALIDATION RÔLE
// ========================================

export function getUserRoleCategory(role: string): 'dirigeant' | 'be' | 'terrain' | 'unknown' {
  switch (role) {
    case 'admin':
      return 'dirigeant';
    case 'technicien_be':
    case 'responsable_be':
      return 'be';
    case 'chef_projet':
    case 'chef_travaux':
      return 'terrain';
    default:
      return 'unknown';
  }
}