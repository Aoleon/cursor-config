import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { FolderOpen, Calculator, Clock, TrendingUp } from "lucide-react";

export default function StatsCards() {
  const { data: stats = {}, isLoading, isError, error } = useQuery({
    queryKey: ["/api/dashboard/stats"],
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" data-testid="stats-cards-loading">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse" data-testid={`stats-card-skeleton-${i}`}>
            <CardContent className="p-6">
              <div className="h-16 bg-surface-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" data-testid="stats-cards-error">
        <Card className="col-span-full">
          <CardContent className="p-6 text-center">
            <div className="text-error mb-2">⚠️</div>
            <p className="text-sm text-on-surface-muted" data-testid="stats-error-message">
              Impossible de charger les statistiques. 
              {error && ` (${(error as Error).message})`}
            </p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-2 text-sm text-primary hover:underline"
              data-testid="button-reload-stats"
            >
              Réessayer
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const cardsData = [
    {
      title: "Dossiers Actifs",
      value: (stats as any)?.totalOffers || 0,
      icon: FolderOpen,
      iconBg: "bg-primary-light",
      iconColor: "text-primary",
      footer: "+12% ce mois",
      footerColor: "text-success"
    },
    {
      title: "En Chiffrage",
      value: (stats as any)?.offersInPricing || 0,
      icon: Calculator,
      iconBg: "bg-accent-light",
      iconColor: "text-accent",
      footer: "Moyenne: 3.2 jours",
      footerColor: "text-on-surface-muted"
    },
    {
      title: "En Attente Validation",
      value: (stats as any)?.offersPendingValidation || 0,
      icon: Clock,
      iconBg: "bg-warning/10",
      iconColor: "text-warning",
      footer: "2 prioritaires",
      footerColor: "text-warning"
    },
    {
      title: "Charge BE",
      value: `${(stats as any)?.beLoad || 0}%`,
      icon: TrendingUp,
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
      showProgress: true,
      progressValue: (stats as any)?.beLoad || 0
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" data-testid="stats-cards">
      {cardsData.map((card, index) => (
        <Card key={index} className="shadow-card" data-testid={`stats-card-${card.title.toLowerCase().replace(/\s+/g, '-')}`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-on-surface-muted" data-testid={`stats-title-${card.title.toLowerCase().replace(/\s+/g, '-')}`}>
                  {card.title}
                </p>
                <p className="text-3xl font-bold text-on-surface" data-testid={`stats-value-${card.title.toLowerCase().replace(/\s+/g, '-')}`}>
                  {card.value}
                </p>
              </div>
              <div className={`w-12 h-12 ${card.iconBg} rounded-lg flex items-center justify-center`}>
                <card.icon className={`${card.iconColor} text-xl`} />
              </div>
            </div>
            <div className="mt-4">
              {card.showProgress ? (
                <div className="w-full" data-testid={`stats-progress-${card.title.toLowerCase().replace(/\s+/g, '-')}`}>
                  <Progress value={card.progressValue} className="h-2" />
                </div>
              ) : (
                <span className={`text-sm ${card.footerColor}`} data-testid={`stats-footer-${card.title.toLowerCase().replace(/\s+/g, '-')}`}>
                  {card.footer}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
