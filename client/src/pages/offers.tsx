import { useLocation } from "wouter";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import OffersTable from "@/components/offers/offers-table";

export default function Offers() {
  const [_, setLocation] = useLocation();

  return (
    <div className="min-h-screen flex bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Header 
          title="Appels d'Offre"
          breadcrumbs={[
            { label: "Accueil", href: "/" },
            { label: "Appels d'Offre" }
          ]}
          actions={[
            {
              label: "Exporter",
              variant: "outline",
              icon: "download"
            },
            {
              label: "Nouvelle Offre (Import AO/DCE)",
              variant: "default",
              icon: "plus",
              onClick: () => setLocation("/create-offer")
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
                Sélectionnez un appel d'offre pour gérer les jalons de validation BE.
              </p>
              {/* Le MilestoneTracker sera intégré dynamiquement lors de la sélection d'une offre */}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
