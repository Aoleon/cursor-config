import { useLocation } from "wouter";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import UnifiedOffersDisplay from "@/components/offers/unified-offers-display";
import { Plus } from "lucide-react";

export default function AOsPage() {
  const [_, setLocation] = useLocation();

  return (
    <div className="min-h-screen flex bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Header 
          title="Appels d'Offres"
          breadcrumbs={[
            { label: "Accueil", href: "/" },
            { label: "Appels d'Offres" }
          ]}
          actions={[
            {
              label: "Nouvel AO",
              variant: "default",
              icon: "plus",
              onClick: () => setLocation("/create-ao")
            }
          ]}
        />
        
        <div className="px-6 py-6">
          <UnifiedOffersDisplay 
            showCreateButton={true} 
            title="Appels d'Offres"
            endpoint="/api/aos"
          />
        </div>
      </main>
    </div>
  );
}