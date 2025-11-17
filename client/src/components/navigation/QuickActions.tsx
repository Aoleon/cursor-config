import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Plus,
  FileText,
  ClipboardList,
  Projector,
  Calculator,
  Settings,
  HardHat,
  Headphones,
  Truck,
  Calendar,
  CheckCircle,
  AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickAction {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  href: string;
  badge?: string;
  variant?: 'default' | 'outline' | 'secondary';
}

interface QuickActionsProps {
  className?: string;
  maxVisible?: number;
  showLabels?: boolean;
}

export function QuickActions({ 
  className = "",
  maxVisible = 6,
  showLabels = true
}: QuickActionsProps) {
  const [, setLocation] = useLocation();
  const [expanded, setExpanded] = useState(false);

  const actions: QuickAction[] = [
    {
      id: 'create-ao',
      label: 'Nouvel AO',
      description: 'Créer un appel d\'offres',
      icon: <FileText className="h-4 w-4" />,
      href: '/create-ao',
      variant: 'default'
    },
    {
      id: 'create-offer',
      label: 'Nouvelle Offre',
      description: 'Créer une offre',
      icon: <ClipboardList className="h-4 w-4" />,
      href: '/create-offer',
      variant: 'default'
    },
    {
      id: 'create-project',
      label: 'Nouveau Projet',
      description: 'Créer un projet',
      icon: <Projector className="h-4 w-4" />,
      href: '/projects/create',
      variant: 'default'
    },
    {
      id: 'chiffrage',
      label: 'Chiffrage',
      description: 'Accéder au chiffrage',
      icon: <Calculator className="h-4 w-4" />,
      href: '/offers/chiffrage',
      variant: 'outline'
    },
    {
      id: 'validation',
      label: 'Validation BE',
      description: 'Validations en attente',
      icon: <Settings className="h-4 w-4" />,
      href: '/offers/validation',
      variant: 'outline'
    },
    {
      id: 'sav',
      label: 'SAV',
      description: 'Service Après-Vente',
      icon: <Headphones className="h-4 w-4" />,
      href: '/sav',
      variant: 'outline'
    },
    {
      id: 'logistics',
      label: 'Logistique',
      description: 'Livraisons et réceptions',
      icon: <Truck className="h-4 w-4" />,
      href: '/logistics',
      variant: 'outline'
    },
    {
      id: 'worksites',
      label: 'Chantiers',
      description: 'Vue chantiers',
      icon: <HardHat className="h-4 w-4" />,
      href: '/projects?status=chantier',
      variant: 'outline'
    }
  ];

  const visibleActions = expanded ? actions : actions.slice(0, maxVisible);
  const hasMore = actions.length > maxVisible;

  return (
    <div className={cn("flex items-center gap-2 flex-wrap", className)}>
      {visibleActions.map((action) => (
        <Button
          key={action.id}
          variant={action.variant || 'outline'}
          size="sm"
          onClick={() => setLocation(action.href)}
          className="flex items-center gap-2"
          title={action.description}
        >
          {action.icon}
          {showLabels && <span>{action.label}</span>}
          {action.badge && (
            <Badge variant="secondary" className="ml-1">
              {action.badge}
            </Badge>
          )}
        </Button>
      ))}
      {hasMore && !expanded && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(true)}
          className="flex items-center gap-1"
        >
          <Plus className="h-4 w-4" />
          {showLabels && <span>Plus</span>}
        </Button>
      )}
      {expanded && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(false)}
          className="flex items-center gap-1"
        >
          Moins
        </Button>
      )}
    </div>
  );
}

