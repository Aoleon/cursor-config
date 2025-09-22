// Authentication temporarily disabled for development
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Header from "@/components/layout/header";
import StatsCards from "@/components/dashboard/stats-cards";
import ConsolidatedKpiDashboard from "@/components/dashboard/consolidated-kpi-dashboard";
import UnifiedOffersDisplay from "@/components/offers/unified-offers-display";

export default function Dashboard() {
  // Authentication temporarily disabled for development
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <>
      <Header 
        title="Tableau de Bord"
        breadcrumbs={[
          { label: "Accueil", href: "/" },
          { label: "Tableau de Bord" }
        ]}
      />
      
      <div className="px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-fit grid-cols-2" data-testid="dashboard-tabs">
            <TabsTrigger value="overview" data-testid="tab-overview">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="kpis" data-testid="tab-kpis">KPIs Avancés</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-8" data-testid="overview-content">
            <StatsCards />
            <UnifiedOffersDisplay 
              showCreateButton={false} 
              title="Appels d'Offres Récents"
              endpoint="/api/offers"
            />
          </TabsContent>

          <TabsContent value="kpis" className="space-y-6" data-testid="kpis-content">
            <ConsolidatedKpiDashboard />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
