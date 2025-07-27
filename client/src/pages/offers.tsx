import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import OffersTable from "@/components/offers/offers-table";

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
        
        <div className="px-6 py-6">
          <OffersTable showCreateButton={true} />
        </div>
      </main>
    </div>
  );
}
