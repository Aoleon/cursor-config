// Authentication temporarily disabled for development
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import StatsCards from "@/components/dashboard/stats-cards";
import UnifiedOffersDisplay from "@/components/offers/unified-offers-display";

export default function Dashboard() {
  // Authentication temporarily disabled for development

  return (
    <div className="min-h-screen flex bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Header 
          title="Tableau de Bord"
          breadcrumbs={[
            { label: "Accueil", href: "/" },
            { label: "Tableau de Bord" }
          ]}
        />
        
        <div className="px-6 py-6 space-y-8">
          <StatsCards />
          <UnifiedOffersDisplay 
            showCreateButton={false} 
            title="Appels d'Offres Récents"
            endpoint="/api/offers"
          />
        </div>
      </main>
    </div>
  );
}
