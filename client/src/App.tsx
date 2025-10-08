import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WebSocketProvider } from "@/providers/websocket-provider";
import { DateAlertsProvider } from "@/components/alerts/DateAlertsProvider";
import { useAuth } from "@/hooks/useAuth";
import ErrorBoundary from "@/components/ErrorBoundary";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import { useLocation, Redirect } from "wouter";
import { useEffect } from "react";
import Dashboard from "@/pages/dashboard";
import Offers from "@/pages/offers";
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
import ProjectPlanning from "@/pages/projects/planning";
// Import des composants spécialisés par phase projet
import ProjectStudy from "@/pages/projects/study";
import ProjectSupply from "@/pages/projects/supply";
import ProjectWorksite from "@/pages/projects/worksite";
import ProjectSupport from "@/pages/projects/support";
// Import des pages offers
import ValidationList from "@/pages/offers/validation-list";
import TransformList from "@/pages/offers/transform-list";
import ChiffrageList from "@/pages/offers/chiffrage-list";
// Import des pages workflow
import EtudeTechnique from "@/pages/workflow/etude-technique";
import ChiffrageWorkflow from "@/pages/workflow/chiffrage";
import EnvoiDevis from "@/pages/workflow/envoi-devis";
import PlanificationWorkflow from "@/pages/workflow/planification";
import ChantierWorkflow from "@/pages/workflow/chantier";
// import ValidationBE from "@/pages/validation-be"; // Not used
import SupplierRequests from "@/pages/supplier-requests";
import BatigestPage from "@/pages/batigest";
import SettingsScoring from "@/pages/settings-scoring";
import TechnicalAlerts from "@/pages/technical-alerts";
// Import des pages Intelligence Temporelle - (DateIntelligenceDashboard maintenant intégré dans ExecutiveDashboard)
// Import du Dashboard Dirigeant
import ExecutiveDashboard from "@/pages/ExecutiveDashboard";
// Import du Dashboard Admin Sécurité
import AdminSecurityDashboard from "@/pages/AdminSecurityDashboard";
// Import du Dashboard Migration Monday.com
import MondayMigrationDashboard from "@/pages/monday-migration-dashboard";
// Import de la navigation intelligente
import SmartLanding from "@/components/navigation/SmartLanding";
import AppLayout from "@/components/layout/AppLayout";
// Import du portail fournisseur
import SupplierPortal from "@/pages/supplier-portal";
// Import de la comparaison des devis
import ComparaisonDevis from "@/pages/comparaison-devis";
// Import du chatbot full-page
import ChatbotPage from "@/pages/chatbot";
import BugReportButton from "@/components/BugReportButton";

function ProtectedRoute({ component: Component, showSidebar = true }: { component: React.ComponentType<any>; showSidebar?: boolean }) {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  
  // Utiliser useEffect pour éviter la mise à jour d'état pendant le render
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation("/login");
    }
  }, [isLoading, isAuthenticated, setLocation]);
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    // Afficher le loading pendant la redirection
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  return (
    <AppLayout showSidebar={showSidebar}>
      <Component />
    </AppLayout>
  );
}

function Router() {
  return (
    <Switch>
      {/* REDIRECTION AVEC RETURN URL: Support pour authentification */}
      <Route path="/login">
        {() => {
          const searchParams = new URLSearchParams(window.location.search);
          const returnUrl = searchParams.get('returnUrl');
          if (returnUrl) {
            // Si returnUrl fourni mais utilisateur déjà connecté, rediriger
            return <SmartLanding returnUrl={returnUrl} />;
          }
          return <Login />;
        }}
      </Route>
      {/* ============= DASHBOARDS STANDARDISÉS - Pattern cohérent /dashboard/* ============= */}
      <Route path="/dashboard/executive" component={() => <ProtectedRoute component={ExecutiveDashboard} />} />
      <Route path="/dashboard/be" component={() => <ProtectedRoute component={BEDashboard} />} />
      <Route path="/dashboard/admin-security" component={() => <ProtectedRoute component={AdminSecurityDashboard} />} />
      <Route path="/dashboard/monday-migration" component={() => <ProtectedRoute component={MondayMigrationDashboard} />} />
      {/* REDIRECTION INTELLIGENTE: Page d'accueil avec détection de rôle */}
      <Route path="/">
        <SmartLanding />
      </Route>
      {/* COMPATIBILITÉ: Ancien dashboard principal maintenu temporairement */}
      <Route path="/dashboard" component={() => <ProtectedRoute component={Dashboard} />} />
      {/* REDIRECTION: DateIntelligenceDashboard maintenant intégré dans ExecutiveDashboard */}
      <Route path="/dashboard/date-intelligence">
        <Redirect to="/dashboard/executive?tab=intelligence" />
      </Route>
      {/* ============= WORKFLOW - Processus avant-vente AO → Offre ============= */}
      <Route path="/workflow/etude-technique" component={() => <ProtectedRoute component={EtudeTechnique} />} />
      <Route path="/workflow/chiffrage" component={() => <ProtectedRoute component={ChiffrageWorkflow} />} />
      <Route path="/workflow/envoi-devis" component={() => <ProtectedRoute component={EnvoiDevis} />} />
      <Route path="/workflow/planification" component={() => <ProtectedRoute component={PlanificationWorkflow} />} />
      <Route path="/workflow/chantier" component={() => <ProtectedRoute component={ChantierWorkflow} />} />
      
      {/* ============= APPELS D'OFFRE - Redirections vers workflow cohérent ============= */}
      <Route path="/aos">
        <Redirect to="/workflow/etude-technique" />
      </Route>
      <Route path="/aos/:id" component={() => <ProtectedRoute component={AoDetail} />} />
      <Route path="/aos/:id/edit" component={() => <ProtectedRoute component={AoDetail} />} />
      {/* Route pour la comparaison des devis fournisseurs */}
      <Route path="/comparaison-devis/:aoLotId" component={() => <ProtectedRoute component={ComparaisonDevis} />} />
      
      {/* ============= OFFERS - Gestion lifecycle offres ============= */}
      <Route path="/offers" component={() => <ProtectedRoute component={Offers} />} />
      <Route path="/create-offer" component={() => <ProtectedRoute component={CreateOffer} />} />
      <Route path="/create-ao" component={() => <ProtectedRoute component={CreateAO} />} />
      {/* Sous-étapes des Appels d'Offres - Routes statiques AVANT routes dynamiques */}
      <Route path="/offers/validation" component={() => <ProtectedRoute component={ValidationList} />} />
      <Route path="/offers/transform" component={() => <ProtectedRoute component={TransformList} />} />
      <Route path="/offers/chiffrage" component={() => <ProtectedRoute component={ChiffrageList} />} />
      {/* Routes dynamiques avec :id APRÈS les routes statiques */}
      <Route path="/offers/:id" component={() => <ProtectedRoute component={OfferDetail} />} />
      <Route path="/offers/:id/edit" component={() => <ProtectedRoute component={AoDetail} />} />
      <Route path="/offers/:id/chiffrage" component={() => <ProtectedRoute component={Chiffrage} />} />
      <Route path="/offers/create" component={() => <ProtectedRoute component={CreateAO} />} />
      <Route path="/offers/suppliers" component={() => <ProtectedRoute component={Suppliers} />} />
      <Route path="/projects" component={() => <ProtectedRoute component={Projects} />} />
      <Route path="/projects/:id" component={() => <ProtectedRoute component={ProjectDetail} />} />
      <Route path="/projects/:id/planning" component={() => <ProtectedRoute component={Planning} />} />
      {/* Phases projets - Composants spécialisés par phase chronologique */}
      <Route path="/projects/study" component={() => <ProtectedRoute component={ProjectStudy} />} />
      <Route path="/projects/planning" component={() => <ProtectedRoute component={ProjectPlanning} />} />
      <Route path="/projects/supply" component={() => <ProtectedRoute component={ProjectSupply} />} />
      <Route path="/projects/worksite" component={() => <ProtectedRoute component={ProjectWorksite} />} />
      <Route path="/projects/support" component={() => <ProtectedRoute component={ProjectSupport} />} />
      
      {/* ============= ENTITÉS TRANSVERSALES ============= */}
      {/* ============= PROJETS - Phases post-signature chronologiques ============= */}
      <Route path="/teams" component={() => <ProtectedRoute component={Teams} />} />
      <Route path="/suppliers" component={() => <ProtectedRoute component={Suppliers} />} />
      <Route path="/supplier-requests" component={() => <ProtectedRoute component={SupplierRequests} />} />
      {/* REDIRECTION: BE Dashboard standardisé vers pattern /dashboard/* */}
      <Route path="/be-dashboard">
        <Redirect to="/dashboard/be" />
      </Route>
      <Route path="/batigest" component={() => <ProtectedRoute component={BatigestPage} />} />
      {/* Validation technique pour Julien LAMBOROT */}
      <Route path="/technical-alerts" component={() => <ProtectedRoute component={TechnicalAlerts} />} />
      {/* Configuration et paramètres */}
      <Route path="/settings/scoring" component={() => <ProtectedRoute component={SettingsScoring} />} />
      
      {/* ============= ASSISTANT IA - Chatbot full-page ============= */}
      <Route path="/chatbot" component={() => <ProtectedRoute component={ChatbotPage} />} />
      
      {/* ============= REDIRECTIONS GRACIEUSES - Intelligence Temporelle ============= */}
      {/* REDIRECTIONS GRACIEUSES: Intelligence Temporelle maintenant intégrée dans Executive Dashboard */}
      <Route path="/date-intelligence">
        <Redirect to="/dashboard/executive?tab=intelligence" />
      </Route>
      <Route path="/date-intelligence/alerts">
        <Redirect to="/dashboard/executive?tab=intelligence" />
      </Route>
      <Route path="/date-intelligence/rules">
        <Redirect to="/dashboard/executive?tab=intelligence" />
      </Route>
      <Route path="/date-intelligence/gantt">
        <Redirect to="/dashboard/executive?tab=intelligence" />
      </Route>
      <Route path="/date-intelligence/performance">
        <Redirect to="/dashboard/executive?tab=intelligence" />
      </Route>
      
      {/* ============= PORTAIL FOURNISSEUR - Accès public sécurisé ============= */}
      <Route path="/supplier-portal/:token">
        {(params) => <SupplierPortal />}
      </Route>
      
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
            <DateAlertsProvider enableRealtimeToasts={true}>
              <Toaster />
              <BugReportButton />
              <Router />
            </DateAlertsProvider>
          </WebSocketProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
