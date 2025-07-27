import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { FolderOpen, Calculator, Clock, TrendingUp } from "lucide-react";

export default function StatsCards() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-16 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const cardsData = [
    {
      title: "Dossiers Actifs",
      value: stats?.totalOffers || 0,
      icon: FolderOpen,
      iconBg: "bg-primary-light",
      iconColor: "text-primary",
      footer: "+12% ce mois",
      footerColor: "text-success"
    },
    {
      title: "En Chiffrage",
      value: stats?.offersInPricing || 0,
      icon: Calculator,
      iconBg: "bg-accent-light",
      iconColor: "text-accent",
      footer: "Moyenne: 3.2 jours",
      footerColor: "text-gray-600"
    },
    {
      title: "En Attente Validation",
      value: stats?.offersPendingValidation || 0,
      icon: Clock,
      iconBg: "bg-yellow-100",
      iconColor: "text-yellow-600",
      footer: "2 prioritaires",
      footerColor: "text-warning"
    },
    {
      title: "Charge BE",
      value: `${stats?.beLoad || 0}%`,
      icon: TrendingUp,
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
      showProgress: true,
      progressValue: stats?.beLoad || 0
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cardsData.map((card, index) => (
        <Card key={index} className="shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{card.title}</p>
                <p className="text-3xl font-bold text-gray-900">{card.value}</p>
              </div>
              <div className={`w-12 h-12 ${card.iconBg} rounded-lg flex items-center justify-center`}>
                <card.icon className={`${card.iconColor} text-xl`} />
              </div>
            </div>
            <div className="mt-4">
              {card.showProgress ? (
                <div className="w-full">
                  <Progress value={card.progressValue} className="h-2" />
                </div>
              ) : (
                <span className={`text-sm ${card.footerColor}`}>
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
