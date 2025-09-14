import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WebSocketProvider } from "@/providers/websocket-provider";
import { useAuth } from "@/hooks/useAuth";
import ErrorBoundary from "@/components/ErrorBoundary";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import Offers from "@/pages/offers";
import AOsPage from "@/pages/aos";
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
import ValidationBE from "@/pages/validation-be";
import SupplierRequests from "@/pages/supplier-requests";
import ChiffrageList from "@/pages/offers/chiffrage-list";
import ValidationList from "@/pages/offers/validation-list";
import TransformList from "@/pages/offers/transform-list";
import BatigestPage from "@/pages/batigest";

function ProtectedRoute({ component: Component }: { component: React.ComponentType<any> }) {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Landing />;
  }
  
  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/offers" component={() => <ProtectedRoute component={Offers} />} />
      <Route path="/aos" component={() => <ProtectedRoute component={AOsPage} />} />
      <Route path="/create-offer" component={() => <ProtectedRoute component={CreateOffer} />} />
      <Route path="/create-ao" component={() => <ProtectedRoute component={CreateAO} />} />
      <Route path="/offers/:id" component={() => <ProtectedRoute component={OfferDetail} />} />
      <Route path="/offers/:id/edit" component={() => <ProtectedRoute component={AoDetail} />} />
      <Route path="/offers/:id/chiffrage" component={() => <ProtectedRoute component={Chiffrage} />} />
      {/* Sous-étapes des Appels d'Offres */}
      <Route path="/offers/import" component={() => <ProtectedRoute component={ImportOCR} />} />
      <Route path="/offers/create" component={() => <ProtectedRoute component={CreateAO} />} />
      <Route path="/offers/suppliers-pending" component={() => <ProtectedRoute component={SuppliersPending} />} />
      <Route path="/offers/chiffrage" component={() => <ProtectedRoute component={ChiffrageList} />} />
      <Route path="/offers/suppliers" component={() => <ProtectedRoute component={Suppliers} />} />
      <Route path="/offers/validation" component={() => <ProtectedRoute component={ValidationList} />} />
      <Route path="/offers/transform" component={() => <ProtectedRoute component={TransformList} />} />
      <Route path="/projects" component={() => <ProtectedRoute component={Projects} />} />
      <Route path="/projects/:id" component={() => <ProtectedRoute component={ProjectDetail} />} />
      <Route path="/projects/:id/planning" component={() => <ProtectedRoute component={Planning} />} />
      {/* Sous-étapes des Projets */}
      <Route path="/projects/study" component={() => <ProtectedRoute component={Projects} />} />
      <Route path="/projects/planning" component={() => <ProtectedRoute component={ProjectPlanning} />} />
      <Route path="/projects/supply" component={() => <ProtectedRoute component={Suppliers} />} />
      <Route path="/projects/worksite" component={() => <ProtectedRoute component={Projects} />} />
      <Route path="/projects/support" component={() => <ProtectedRoute component={Projects} />} />
      {/* Routes du workflow */}
      <Route path="/workflow/etude-technique" component={() => <ProtectedRoute component={EtudeTechnique} />} />
      <Route path="/workflow/chiffrage" component={() => <ProtectedRoute component={ChiffrageWorkflow} />} />
      <Route path="/workflow/envoi-devis" component={() => <ProtectedRoute component={EnvoiDevis} />} />
      <Route path="/workflow/planification" component={() => <ProtectedRoute component={PlanificationWorkflow} />} />
      <Route path="/workflow/chantier" component={() => <ProtectedRoute component={ChantierWorkflow} />} />
      <Route path="/teams" component={() => <ProtectedRoute component={Teams} />} />
      <Route path="/suppliers" component={() => <ProtectedRoute component={Suppliers} />} />
      <Route path="/supplier-requests" component={() => <ProtectedRoute component={SupplierRequests} />} />
      <Route path="/be-dashboard" component={() => <ProtectedRoute component={BEDashboard} />} />
      <Route path="/batigest" component={() => <ProtectedRoute component={BatigestPage} />} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WebSocketProvider>
            <Toaster />
            <Router />
          </WebSocketProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
