import { useLocation } from "wouter";
import Header from "@/components/layout/header";
import AOsTableView from "@/components/offers/aos-table-view";
import { Plus } from "lucide-react";

export default function AOsPage() {
  const [_, setLocation] = useLocation();

  return (
    <>
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
          <AOsTableView 
            showCreateButton={true} 
            title="Appels d'Offres"
            endpoint="/api/aos"
          />
        </div>
    </>
  );
}