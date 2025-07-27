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
import Planning from "@/pages/planning";
import Teams from "@/pages/teams";
import Suppliers from "@/pages/suppliers";
import BEDashboard from "@/pages/be-dashboard";

function Router() {
  // Temporarily disable authentication for development
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/offers" component={Offers} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/projects" component={Projects} />
      <Route path="/planning" component={Planning} />
      <Route path="/teams" component={Teams} />
      <Route path="/suppliers" component={Suppliers} />
      <Route path="/be-dashboard" component={BEDashboard} />
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
