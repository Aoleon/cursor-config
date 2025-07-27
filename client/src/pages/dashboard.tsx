// Authentication temporarily disabled for development
import { PhaseNavigation } from "@/components/navigation/phase-navigation";
import Header from "@/components/layout/header";
import StatsCards from "@/components/dashboard/stats-cards";
import OffersTable from "@/components/offers/offers-table";

export default function Dashboard() {
  // Authentication temporarily disabled for development

  return (
    <div className="min-h-screen flex bg-gray-50">
      <PhaseNavigation />
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
          <OffersTable showCreateButton={false} />
        </div>
      </main>
    </div>
  );
}
