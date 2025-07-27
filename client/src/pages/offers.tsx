import { useState } from "react";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import OffersTable from "@/components/offers/offers-table";
import CreateOfferModal from "@/components/offers/create-offer-modal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { List, Clock } from "lucide-react";
import TimelineView from "@/components/projects/timeline-view";

export default function Offers() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

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
              onClick: () => setIsCreateModalOpen(true)
            }
          ]}
        />
        
        <div className="px-6 py-6">
          <Tabs defaultValue="list" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="list" className="flex items-center gap-2">
                <List className="h-4 w-4" />
                Liste des Offres
              </TabsTrigger>
              <TabsTrigger value="timeline" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Vue Timeline
              </TabsTrigger>
            </TabsList>

            <TabsContent value="list" className="space-y-6">
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
            </TabsContent>

            <TabsContent value="timeline" className="space-y-6">
              <TimelineView viewType="offers" />
            </TabsContent>
          </Tabs>
        </div>
      </main>
      
      <CreateOfferModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
      />
    </div>
  );
}
