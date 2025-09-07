import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import Offers from "@/pages/offers";
import Pricing from "@/pages/pricing";
import Projects from "@/pages/projects";
import ProjectDetail from "@/pages/project-detail";
import Planning from "@/pages/planning";
import Teams from "@/pages/teams";
import Suppliers from "@/pages/suppliers";
import BEDashboard from "@/pages/be-dashboard";
import OfferDetail from "@/pages/offer-detail";
import CreateOffer from "@/pages/create-offer";
import CreateAO from "@/pages/create-ao";
import AoDetail from "@/pages/ao-detail";
import Chiffrage from "@/pages/chiffrage";
// Import des nouvelles pages pour les sous-étapes
import ImportOCR from "@/pages/offers/import";
import ProjectPlanning from "@/pages/projects/planning";
// Import des pages workflow
import EtudeTechnique from "@/pages/workflow/etude-technique";
import SuppliersPending from "@/pages/workflow/suppliers-pending";
import ChiffrageWorkflow from "@/pages/workflow/chiffrage";
import EnvoiDevis from "@/pages/workflow/envoi-devis";
import PlanificationWorkflow from "@/pages/workflow/planification";
import ChantierWorkflow from "@/pages/workflow/chantier";

function Router() {
  // Temporarily disable authentication for development
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/offers" component={Offers} />
      <Route path="/create-offer" component={CreateOffer} />
      <Route path="/create-ao" component={CreateAO} />
      <Route path="/offers/:id" component={OfferDetail} />
      <Route path="/offers/:id/edit" component={AoDetail} />
      <Route path="/offers/:id/chiffrage" component={Chiffrage} />
      {/* Sous-étapes des Appels d'Offres */}
      <Route path="/offers/import" component={ImportOCR} />
      <Route path="/offers/create" component={CreateAO} />
      <Route path="/offers/suppliers-pending" component={SuppliersPending} />
      <Route path="/offers/chiffrage" component={ChiffrageWorkflow} />
      <Route path="/offers/suppliers" component={Suppliers} />
      <Route path="/offers/validation" component={BEDashboard} />
      <Route path="/offers/transform" component={CreateOffer} />
      <Route path="/projects" component={Projects} />
      <Route path="/projects/:id" component={ProjectDetail} />
      <Route path="/projects/:id/planning" component={Planning} />
      {/* Sous-étapes des Projets */}
      <Route path="/projects/study" component={Projects} />
      <Route path="/projects/planning" component={ProjectPlanning} />
      <Route path="/projects/supply" component={Suppliers} />
      <Route path="/projects/worksite" component={Projects} />
      <Route path="/projects/support" component={Projects} />
      {/* Routes du workflow */}
      <Route path="/workflow/etude-technique" component={EtudeTechnique} />
      <Route path="/workflow/chiffrage" component={ChiffrageWorkflow} />
      <Route path="/workflow/envoi-devis" component={EnvoiDevis} />
      <Route path="/workflow/planification" component={PlanificationWorkflow} />
      <Route path="/workflow/chantier" component={ChantierWorkflow} />
      <Route path="/teams" component={Teams} />
      <Route path="/suppliers" component={Suppliers} />
      <Route path="/be-dashboard" component={BEDashboard} />
      <Route path="/be-indicators" component={BEDashboard} />
      <Route path="/priorities" component={BEDashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
