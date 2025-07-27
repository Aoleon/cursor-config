import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import OffersTable from "@/components/offers/offers-table";
import MilestoneTracker from "@/components/validation/milestone-tracker";

export default function Offers() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Header 
          title="Dossiers d'Offre"
          breadcrumbs={[
            { label: "Accueil", href: "/" },
            { label: "Dossiers d'Offre" }
          ]}
          actions={[
            {
              label: "Exporter",
              variant: "outline",
              icon: "download"
            },
            {
              label: "Nouveau Dossier",
              variant: "default",
              icon: "plus",
              action: "create-offer"
            }
          ]}
        />
        
        <div className="px-6 py-6 space-y-6">
          <OffersTable showCreateButton={true} />
          
          {/* Section de validation des jalons pour les BE - Résout le problème "Absence de jalon Fin d'études" */}
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Suivi des Jalons de Validation
            </h3>
            <div className="bg-white p-4 rounded-lg border">
              <p className="text-sm text-gray-600 mb-4">
                Sélectionnez un dossier d'offre pour gérer les jalons de validation BE.
              </p>
              {/* Le MilestoneTracker sera intégré dynamiquement lors de la sélection d'une offre */}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
