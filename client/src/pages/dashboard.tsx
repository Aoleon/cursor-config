import { useQuery } from "@tanstack/react-query";
import { PhaseNavigation } from "@/components/navigation/phase-navigation";
import Header from "@/components/layout/header";
import ExecutiveDashboard from "@/components/dashboard/executive-dashboard";

export default function Dashboard() {
  // Authentication temporarily disabled for development

  return (
    <div className="min-h-screen flex bg-gray-50">
      <PhaseNavigation />
      <main className="flex-1 overflow-auto">
        <Header 
          title="Tableau de Bord Dirigeant"
          breadcrumbs={[
            { label: "Accueil", href: "/" },
            { label: "Tableau de Bord" }
          ]}
          actions={[
            {
              label: "Export PDF",
              variant: "outline",
              icon: "download"
            },
            {
              label: "Actualiser",
              variant: "default",
              icon: "refresh-cw"
            }
          ]}
        />
        
        <div className="px-6 py-6">
          <ExecutiveDashboard />
        </div>
      </main>
    </div>
  );
}
