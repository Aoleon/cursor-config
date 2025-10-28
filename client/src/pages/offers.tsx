import { useLocation } from "wouter";
import Header from "@/components/layout/header";
import OffersTableView from "@/components/offers/offers-table-view";
import { Plus } from "lucide-react";

export default function Offers() {
  const [_, setLocation] = useLocation();

  return (
    <>
      <Header 
        title="Offres"
        breadcrumbs={[
          { label: "Accueil", href: "/" },
          { label: "Offres" }
        ]}
        actions={[
          {
            label: "Nouvelle Offre",
            variant: "default",
            icon: "plus",
            onClick: () => setLocation("/create-offer")
          }
        ]}
      />
      
      <div className="px-6 py-6">
        <OffersTableView 
          showCreateButton={true} 
          title="Offres"
          endpoint="/api/offers"
        />
      </div>
    </>
  );
}
