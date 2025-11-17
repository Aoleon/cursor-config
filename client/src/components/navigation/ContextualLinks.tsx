import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowRight, 
  ArrowLeft, 
  FileText, 
  ClipboardList, 
  Projector,
  Calendar,
  HardHat,
  Headphones,
  Truck,
  Calculator,
  CheckCircle,
  AlertTriangle
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface ContextualLinksProps {
  entityType: 'ao' | 'offer' | 'project';
  entityId: string;
  aoId?: string;
  offerId?: string;
  projectId?: string;
  className?: string;
}

export function ContextualLinks({ 
  entityType, 
  entityId, 
  aoId, 
  offerId, 
  projectId,
  className = ""
}: ContextualLinksProps) {
  const [, setLocation] = useLocation();
  const links: Array<{ label: string; href: string; icon: React.ReactNode; variant?: 'default' | 'outline' }> = [];

  // Fetch related entities if needed
  const { data: offer } = useQuery({
    queryKey: [`/api/offers/${offerId}`],
    enabled: !!offerId && entityType !== 'offer',
    select: (response: any) => response?.data
  });

  const { data: project } = useQuery({
    queryKey: [`/api/projects/${projectId}`],
    enabled: !!projectId && entityType !== 'project',
    select: (response: any) => response?.data
  });

  const { data: ao } = useQuery({
    queryKey: [`/api/aos/${aoId}`],
    enabled: !!aoId && entityType !== 'ao',
    select: (response: any) => response?.data
  });

  // Build links based on entity type and relationships
  if (entityType === 'ao') {
    // AO → Offre
    if (offerId || offer) {
      const id = offerId || offer?.id;
      links.push({
        label: `Offre ${offer?.reference || offerId?.slice(0, 8)}`,
        href: `/offers/${id}`,
        icon: <ClipboardList className="h-4 w-4" />,
        variant: 'default'
      });
    } else {
      links.push({
        label: "Créer une offre",
        href: `/create-offer?aoId=${entityId}`,
        icon: <ArrowRight className="h-4 w-4" />,
        variant: 'outline'
      });
    }

    // AO → Projet (via offre)
    if (projectId || project) {
      const id = projectId || project?.id;
      links.push({
        label: `Projet ${project?.name || projectId?.slice(0, 8)}`,
        href: `/projects/${id}`,
        icon: <Projector className="h-4 w-4" />,
        variant: 'default'
      });
    }
  }

  if (entityType === 'offer') {
    // Offre → AO
    if (aoId || offer?.aoId) {
      const id = aoId || offer?.aoId;
      links.push({
        label: `AO ${ao?.reference || id?.slice(0, 8)}`,
        href: `/aos/${id}`,
        icon: <FileText className="h-4 w-4" />,
        variant: 'outline'
      });
    }

    // Offre → Projet
    if (projectId || project) {
      const id = projectId || project?.id;
      links.push({
        label: `Projet ${project?.name || projectId?.slice(0, 8)}`,
        href: `/projects/${id}`,
        icon: <Projector className="h-4 w-4" />,
        variant: 'default'
      });
    } else if (offer?.status === 'valide' && offer?.finEtudesValidatedAt) {
      links.push({
        label: "Transformer en projet",
        href: `/offers/${entityId}/transform`,
        icon: <ArrowRight className="h-4 w-4" />,
        variant: 'default'
      });
    }

    // Actions rapides selon statut
    if (offer?.status === 'en_cours_chiffrage') {
      links.push({
        label: "Chiffrer",
        href: `/offers/${entityId}/chiffrage`,
        icon: <Calculator className="h-4 w-4" />,
        variant: 'outline'
      });
    }

    if (offer?.status === 'en_attente_validation' && !offer?.finEtudesValidatedAt) {
      links.push({
        label: "Valider fin d'études",
        href: `/offers/${entityId}#validation`,
        icon: <CheckCircle className="h-4 w-4" />,
        variant: 'outline'
      });
    }
  }

  if (entityType === 'project') {
    // Projet → Offre
    if (offerId || project?.offerId) {
      const id = offerId || project?.offerId;
      links.push({
        label: `Offre ${offer?.reference || id?.slice(0, 8)}`,
        href: `/offers/${id}`,
        icon: <ClipboardList className="h-4 w-4" />,
        variant: 'outline'
      });
    }

    // Projet → AO (via offre)
    if (aoId || offer?.aoId) {
      const id = aoId || offer?.aoId;
      links.push({
        label: `AO ${ao?.reference || id?.slice(0, 8)}`,
        href: `/aos/${id}`,
        icon: <FileText className="h-4 w-4" />,
        variant: 'outline'
      });
    }

    // Actions rapides selon phase
    if (project?.status === 'planification') {
      links.push({
        label: "Planning Gantt",
        href: `/projects/${entityId}/planning`,
        icon: <Calendar className="h-4 w-4" />,
        variant: 'outline'
      });
    }

    if (project?.status === 'chantier') {
      links.push({
        label: "Vue Chantier",
        href: `/projects/${entityId}#worksite`,
        icon: <HardHat className="h-4 w-4" />,
        variant: 'outline'
      });
    }

    // SAV si disponible
    links.push({
      label: "SAV",
      href: `/sav?projectId=${entityId}`,
      icon: <Headphones className="h-4 w-4" />,
      variant: 'outline'
    });

    // Logistique si disponible
    links.push({
      label: "Logistique",
      href: `/logistics?projectId=${entityId}`,
      icon: <Truck className="h-4 w-4" />,
      variant: 'outline'
    });
  }

  if (links.length === 0) {
    return null;
  }

  return (
    <div className={`flex items-center gap-2 flex-wrap ${className}`}>
      {links.map((link, index) => (
        <Link key={index} href={link.href}>
          <Button
            variant={link.variant || 'outline'}
            size="sm"
            className="flex items-center gap-2"
            onClick={(e) => {
              e.preventDefault();
              setLocation(link.href);
            }}
          >
            {link.icon}
            {link.label}
          </Button>
        </Link>
      ))}
    </div>
  );
}

interface EntityBreadcrumbProps {
  entityType: 'ao' | 'offer' | 'project';
  entityId: string;
  entityName: string;
  aoId?: string;
  offerId?: string;
  projectId?: string;
}

export function EntityBreadcrumb({
  entityType,
  entityId,
  entityName,
  aoId,
  offerId,
  projectId
}: EntityBreadcrumbProps) {
  const breadcrumbs: Array<{ label: string; href: string }> = [
    { label: "Accueil", href: "/" }
  ];

  // Build breadcrumb chain based on relationships
  if (entityType === 'project') {
    if (aoId) {
      breadcrumbs.push({ label: "Appels d'Offres", href: "/aos" });
      breadcrumbs.push({ label: `AO ${aoId.slice(0, 8)}`, href: `/aos/${aoId}` });
    }
    if (offerId) {
      breadcrumbs.push({ label: "Offres", href: "/offers" });
      breadcrumbs.push({ label: `Offre ${offerId.slice(0, 8)}`, href: `/offers/${offerId}` });
    }
    breadcrumbs.push({ label: "Projets", href: "/projects" });
    breadcrumbs.push({ label: entityName, href: `/projects/${entityId}` });
  } else if (entityType === 'offer') {
    if (aoId) {
      breadcrumbs.push({ label: "Appels d'Offres", href: "/aos" });
      breadcrumbs.push({ label: `AO ${aoId.slice(0, 8)}`, href: `/aos/${aoId}` });
    }
    breadcrumbs.push({ label: "Offres", href: "/offers" });
    breadcrumbs.push({ label: entityName, href: `/offers/${entityId}` });
  } else if (entityType === 'ao') {
    breadcrumbs.push({ label: "Appels d'Offres", href: "/aos" });
    breadcrumbs.push({ label: entityName, href: `/aos/${entityId}` });
  }

  return (
    <div className="flex items-center gap-2 text-sm text-on-surface-muted">
      {breadcrumbs.map((crumb, index) => (
        <div key={index} className="flex items-center gap-2">
          {index > 0 && <ArrowRight className="h-3 w-3" />}
          {index < breadcrumbs.length - 1 ? (
            <Link href={crumb.href} className="hover:text-primary transition-colors">
              {crumb.label}
            </Link>
          ) : (
            <span className="font-medium text-on-surface">{crumb.label}</span>
          )}
        </div>
      ))}
    </div>
  );
}

