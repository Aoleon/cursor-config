import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WebSocketProvider } from "@/providers/websocket-provider";
import { DateAlertsProvider } from "@/components/alerts/DateAlertsProvider";
import { useAuth } from "@/hooks/useAuth";
import ErrorBoundary from "@/components/ErrorBoundary";
import { useLocation, Redirect } from "wouter";
import { lazy, Suspense, useEffect } from "react";
import PageLoader from "@/components/PageLoader";

// Components chargés immédiatement (critiques pour auth et navigation)
import AppLayout from "@/components/layout/AppLayout";
import SmartLanding from "@/components/navigation/SmartLanding";
import BugReportButton from "@/components/BugReportButton";

// Pages chargées en lazy loading (toutes sauf login/not-found critiques)
const Login = lazy(() => import("@/pages/login"));
const NotFound = lazy(() => import("@/pages/not-found"));

// Dashboards
const Dashboard = lazy(() => import("@/pages/dashboard"));
const ExecutiveDashboard = lazy(() => import("@/pages/ExecutiveDashboard"));
const BEDashboard = lazy(() => import("@/pages/be-dashboard"));
const AdminSecurityDashboard = lazy(() => import("@/pages/AdminSecurityDashboard"));
const MondayMigrationDashboard = lazy(() => import("@/pages/monday-migration-dashboard"));
const MonitoringDashboard = lazy(() => import("@/pages/monitoring"));

// Offers & AOs
const Offers = lazy(() => import("@/pages/offers"));
const OfferDetail = lazy(() => import("@/pages/offer-detail"));
const CreateOffer = lazy(() => import("@/pages/create-offer"));
const CreateAO = lazy(() => import("@/pages/create-ao"));
const AoDetail = lazy(() => import("@/pages/ao-detail"));
const Chiffrage = lazy(() => import("@/pages/chiffrage"));
const ValidationList = lazy(() => import("@/pages/offers/validation-list"));
const TransformList = lazy(() => import("@/pages/offers/transform-list"));
const ChiffrageList = lazy(() => import("@/pages/offers/chiffrage-list"));

// Projects
const Projects = lazy(() => import("@/pages/projects"));
const ProjectDetail = lazy(() => import("@/pages/project-detail"));
const Planning = lazy(() => import("@/pages/planning"));
const ProjectPlanning = lazy(() => import("@/pages/projects/planning"));
const ProjectStudy = lazy(() => import("@/pages/projects/study"));
const ProjectSupply = lazy(() => import("@/pages/projects/supply"));
const ProjectWorksite = lazy(() => import("@/pages/projects/worksite"));
const ProjectSupport = lazy(() => import("@/pages/projects/support"));

// Workflow
const EtudeTechnique = lazy(() => import("@/pages/workflow/etude-technique"));
const ChiffrageWorkflow = lazy(() => import("@/pages/workflow/chiffrage"));
const EnvoiDevis = lazy(() => import("@/pages/workflow/envoi-devis"));
const PlanificationWorkflow = lazy(() => import("@/pages/workflow/planification"));
const ChantierWorkflow = lazy(() => import("@/pages/workflow/chantier"));

// Suppliers & Teams
const Teams = lazy(() => import("@/pages/teams"));
const Suppliers = lazy(() => import("@/pages/suppliers"));
const SupplierRequests = lazy(() => import("@/pages/supplier-requests"));
const SupplierPortal = lazy(() => import("@/pages/supplier-portal"));
const ComparaisonDevis = lazy(() => import("@/pages/comparaison-devis"));

// Batigest
const BatigestPage = lazy(() => import("@/pages/batigest"));
const BatigestDashboard = lazy(() => import("@/pages/batigest/dashboard"));
const PurchaseOrderGenerator = lazy(() => import("@/pages/batigest/purchase-order-generator"));
const ClientQuoteGenerator = lazy(() => import("@/pages/batigest/client-quote-generator"));

// Monday.com
const MondayImport = lazy(() => import("@/pages/monday/monday-import"));

// Settings & Admin
const Administration = lazy(() => import("@/pages/administration"));
const SettingsScoring = lazy(() => import("@/pages/settings-scoring"));
const TechnicalAlerts = lazy(() => import("@/pages/technical-alerts"));

// Chatbot
const ChatbotPage = lazy(() => import("@/pages/chatbot"));
const ChatbotDemo = lazy(() => import("@/pages/ChatbotDemo"));

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
    <Suspense fallback={<PageLoader message="Chargement de la page..." />}>
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
      <Route path="/dashboard/monitoring" component={() => <ProtectedRoute component={MonitoringDashboard} />} />
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
        <Redirect to="/offers" />
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
      {/* Phases projets - Routes statiques AVANT les routes dynamiques */}
      <Route path="/projects/study" component={() => <ProtectedRoute component={ProjectStudy} />} />
      <Route path="/projects/planning" component={() => <ProtectedRoute component={ProjectPlanning} />} />
      <Route path="/projects/supply" component={() => <ProtectedRoute component={ProjectSupply} />} />
      <Route path="/projects/worksite" component={() => <ProtectedRoute component={ProjectWorksite} />} />
      <Route path="/projects/support" component={() => <ProtectedRoute component={ProjectSupport} />} />
      {/* Routes dynamiques avec :id APRÈS les routes statiques */}
      <Route path="/projects" component={() => <ProtectedRoute component={Projects} />} />
      <Route path="/projects/:id" component={() => <ProtectedRoute component={ProjectDetail} />} />
      <Route path="/projects/:id/planning" component={() => <ProtectedRoute component={Planning} />} />
      
      {/* ============= ENTITÉS TRANSVERSALES ============= */}
      {/* ============= PROJETS - Phases post-signature chronologiques ============= */}
      <Route path="/teams" component={() => <ProtectedRoute component={Teams} />} />
      <Route path="/suppliers" component={() => <ProtectedRoute component={Suppliers} />} />
      <Route path="/supplier-requests" component={() => <ProtectedRoute component={SupplierRequests} />} />
      {/* REDIRECTION: BE Dashboard standardisé vers pattern /dashboard/* */}
      <Route path="/be-dashboard">
        <Redirect to="/dashboard/be" />
      </Route>
      
      {/* ============= ADMINISTRATION ============= */}
      <Route path="/administration" component={() => <ProtectedRoute component={Administration} />} />
      <Route path="/batigest" component={() => <ProtectedRoute component={BatigestPage} />} />
      <Route path="/batigest/dashboard" component={() => <ProtectedRoute component={BatigestDashboard} />} />
      <Route path="/batigest/purchase-order-generator" component={() => <ProtectedRoute component={PurchaseOrderGenerator} />} />
      <Route path="/batigest/client-quote-generator" component={() => <ProtectedRoute component={ClientQuoteGenerator} />} />
      
      {/* ============= MONDAY.COM INTEGRATION ============= */}
      <Route path="/monday/import" component={() => <ProtectedRoute component={MondayImport} />} />
      {/* Validation technique pour Julien LAMBOROT */}
      <Route path="/technical-alerts" component={() => <ProtectedRoute component={TechnicalAlerts} />} />
      {/* Configuration et paramètres */}
      <Route path="/settings/scoring" component={() => <ProtectedRoute component={SettingsScoring} />} />
      
      {/* ============= ASSISTANT IA - Chatbot full-page ============= */}
      <Route path="/chatbot" component={() => <ProtectedRoute component={ChatbotPage} />} />
      <Route path="/chatbot-demo" component={() => <ProtectedRoute component={ChatbotDemo} />} />
      
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
    </Suspense>
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
