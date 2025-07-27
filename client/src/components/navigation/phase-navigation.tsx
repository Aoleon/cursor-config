import { useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  ChevronDown, 
  ChevronRight,
  FileSearch,
  Calculator,
  Truck,
  Hammer,
  Wrench,
  Users,
  Building,
  BarChart3,
  Calendar,
  ClipboardList,
  TrendingUp,
  Package,
  Settings,
  FileText,
  Target,
  Gauge,
  BookOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface NavigationItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  isImplemented: boolean;
  description?: string;
}

interface PhaseSection {
  phase: string;
  title: string;
  description: string;
  color: string;
  items: NavigationItem[];
  isExpanded?: boolean;
}

const phaseNavigation: PhaseSection[] = [
  {
    phase: "dashboard",
    title: "Vue d'ensemble",
    description: "Tableaux de bord et indicateurs généraux",
    color: "bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100",
    items: [
      { title: "Tableau de bord", href: "/", icon: BarChart3, isImplemented: true, description: "Vue d'ensemble générale" },
      { title: "Indicateurs BE", href: "/be-dashboard", icon: TrendingUp, isImplemented: true, description: "Charge et performance Bureau d'Étude" },
      { title: "Planning Ressources", href: "/resource-planning", icon: Calendar, isImplemented: true, description: "Vue hebdomadaire des ressources" }
    ]
  },
  {
    phase: "commercial",
    title: "Phase Commerciale",
    description: "Prospection, AOs et développement commercial",
    color: "bg-green-100 text-green-900 dark:bg-green-900 dark:text-green-100",
    items: [
      { title: "Appels d'Offres", href: "/aos", icon: FileSearch, isImplemented: false, description: "Gestion des AOs entrants" },
      { title: "Offres", href: "/offers", icon: FileText, isImplemented: true, description: "Dossiers d'offres et suivi" },
      { title: "CRM Prospects", href: "/prospects", icon: Users, isImplemented: false, description: "Gestion relation client" },
      { title: "Historique Commercial", href: "/sales-history", icon: TrendingUp, isImplemented: false, description: "Suivi performances commerciales" }
    ]
  },
  {
    phase: "etude",
    title: "Phase d'Étude",
    description: "Bureau d'étude, chiffrage et validation technique",
    color: "bg-purple-100 text-purple-900 dark:bg-purple-900 dark:text-purple-100",
    items: [
      { title: "Chiffrage", href: "/pricing", icon: Calculator, isImplemented: true, description: "Outils de chiffrage et devis" },
      { title: "Plans & Dessins", href: "/drawings", icon: BookOpen, isImplemented: false, description: "Gestion des plans techniques" },
      { title: "Jalons Validation", href: "/milestones-timeline", icon: Target, isImplemented: true, description: "Suivi des jalons d'étude" },
      { title: "Charge BE", href: "/be-workload", icon: Gauge, isImplemented: false, description: "Planification charge Bureau d'Étude" }
    ]
  },
  {
    phase: "planification",
    title: "Phase Planification",
    description: "Planification projet et allocation ressources",
    color: "bg-orange-100 text-orange-900 dark:bg-orange-900 dark:text-orange-100",
    items: [
      { title: "Planning Projet", href: "/planning", icon: Calendar, isImplemented: true, description: "Timeline et phases projet" },
      { title: "Projets", href: "/projects", icon: Building, isImplemented: true, description: "Gestion des projets actifs" },
      { title: "Équipes", href: "/teams", icon: Users, isImplemented: true, description: "Gestion des équipes" },
      { title: "Allocation Ressources", href: "/resource-allocation", icon: ClipboardList, isImplemented: false, description: "Répartition des ressources" }
    ]
  },
  {
    phase: "approvisionnement",
    title: "Phase Approvisionnement",
    description: "Achats, fournisseurs et logistique",
    color: "bg-yellow-100 text-yellow-900 dark:bg-yellow-900 dark:text-yellow-100",
    items: [
      { title: "Fournisseurs", href: "/suppliers", icon: Truck, isImplemented: true, description: "Gestion fournisseurs" },
      { title: "Commandes", href: "/orders", icon: Package, isImplemented: false, description: "Suivi des commandes" },
      { title: "Stock", href: "/inventory", icon: Package, isImplemented: false, description: "Gestion des stocks" },
      { title: "Livraisons", href: "/deliveries", icon: Truck, isImplemented: false, description: "Planning livraisons" }
    ]
  },
  {
    phase: "production",
    title: "Phase Production",
    description: "Atelier, chantier et réalisation",
    color: "bg-red-100 text-red-900 dark:bg-red-900 dark:text-red-100",
    items: [
      { title: "Planning Atelier", href: "/workshop", icon: Hammer, isImplemented: false, description: "Planification atelier" },
      { title: "Suivi Chantier", href: "/construction", icon: Building, isImplemented: false, description: "Suivi des chantiers" },
      { title: "Contrôle Qualité", href: "/quality", icon: Target, isImplemented: false, description: "Contrôles et validations" },
      { title: "Temps Passés", href: "/timetracking", icon: Calendar, isImplemented: false, description: "Suivi des temps" }
    ]
  },
  {
    phase: "sav",
    title: "Phase SAV",
    description: "Service après-vente et maintenance",
    color: "bg-indigo-100 text-indigo-900 dark:bg-indigo-900 dark:text-indigo-100",
    items: [
      { title: "Interventions", href: "/interventions", icon: Wrench, isImplemented: false, description: "Gestion des interventions SAV" },
      { title: "Garanties", href: "/warranties", icon: FileText, isImplemented: false, description: "Suivi des garanties" },
      { title: "Retours Client", href: "/feedback", icon: Users, isImplemented: false, description: "Feedbacks et réclamations" },
      { title: "Maintenance", href: "/maintenance", icon: Settings, isImplemented: false, description: "Maintenance préventive" }
    ]
  }
];

export function PhaseNavigation() {
  const [location] = useLocation();
  const [expandedPhases, setExpandedPhases] = useState<string[]>(["dashboard", "commercial", "etude", "planification"]);

  const togglePhase = (phase: string) => {
    setExpandedPhases(prev => 
      prev.includes(phase) 
        ? prev.filter(p => p !== phase)
        : [...prev, phase]
    );
  };

  const isActive = (href: string) => {
    if (href === "/") return location === "/";
    return location.startsWith(href);
  };

  return (
    <div className="w-80 bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 h-screen overflow-y-auto">
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          JLM ERP - Navigation par Phases
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Organisation selon l'audit workflow
        </p>
      </div>

      <div className="p-2">
        {phaseNavigation.map((section) => (
          <div key={section.phase} className="mb-2">
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-between p-3 h-auto",
                section.color,
                "hover:opacity-80"
              )}
              onClick={() => togglePhase(section.phase)}
            >
              <div className="text-left">
                <div className="font-medium text-sm">{section.title}</div>
                <div className="text-xs opacity-80 mt-1">{section.description}</div>
              </div>
              {expandedPhases.includes(section.phase) ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>

            {expandedPhases.includes(section.phase) && (
              <div className="mt-1 ml-2">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link key={item.href} href={item.href}>
                      <Button
                        variant="ghost"
                        className={cn(
                          "w-full justify-start p-2 h-auto mb-1",
                          isActive(item.href) && "bg-gray-100 dark:bg-gray-800",
                          !item.isImplemented && "opacity-50"
                        )}
                      >
                        <div className="flex items-start space-x-3 w-full">
                          <Icon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <div className="text-left flex-1">
                            <div className="text-sm font-medium flex items-center space-x-2">
                              <span>{item.title}</span>
                              {!item.isImplemented && (
                                <span className="text-xs bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded text-gray-600 dark:text-gray-300">
                                  À venir
                                </span>
                              )}
                            </div>
                            {item.description && (
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {item.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </Button>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      <Separator className="mx-4 my-4" />
      
      <div className="p-4 bg-gray-50 dark:bg-gray-900 mx-2 rounded-lg">
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
          Légende des phases
        </h3>
        <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
          <div>• <strong>Commerciale:</strong> AOs → Offres → Négociation</div>
          <div>• <strong>Étude:</strong> Chiffrage → Plans → Validation</div>
          <div>• <strong>Planification:</strong> Planning → Ressources</div>
          <div>• <strong>Appro:</strong> Achats → Fournisseurs → Stock</div>
          <div>• <strong>Production:</strong> Atelier → Chantier → Livraison</div>
          <div>• <strong>SAV:</strong> Support → Garanties → Maintenance</div>
        </div>
      </div>
    </div>
  );
}