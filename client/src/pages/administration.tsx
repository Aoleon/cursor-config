import { Shield, Sparkles, Database, Settings, Users, Lock, Activity } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function Administration() {
  const adminModules = [
    {
      title: "Démo Chatbot IA",
      description: "Testez et configurez le chatbot IA intelligent de Saxium",
      href: "/chatbot-demo",
      icon: Sparkles,
      color: "bg-purple-500",
      stats: { label: "Requêtes", value: "12 presets" }
    },
    {
      title: "Batigest",
      description: "Interface de gestion et synchronisation avec Batigest",
      href: "/batigest",
      icon: Database,
      color: "bg-blue-500",
      stats: { label: "Modules", value: "6 actifs" }
    },
    {
      title: "Utilisateurs",
      description: "Gestion des comptes et permissions utilisateurs",
      href: "/admin/users",
      icon: Users,
      color: "bg-green-500",
      stats: { label: "Utilisateurs", value: "15 actifs" },
      disabled: true
    },
    {
      title: "Paramètres",
      description: "Configuration globale de l'application",
      href: "/admin/settings",
      icon: Settings,
      color: "bg-orange-500",
      stats: { label: "Paramètres", value: "24 configs" },
      disabled: true
    },
    {
      title: "Sécurité",
      description: "Gestion de la sécurité et des accès",
      href: "/admin/security",
      icon: Lock,
      color: "bg-red-500",
      stats: { label: "Sessions", value: "3 actives" },
      disabled: true
    },
    {
      title: "Monitoring",
      description: "Surveillance et performances du système",
      href: "/admin/monitoring",
      icon: Activity,
      color: "bg-indigo-500",
      stats: { label: "Uptime", value: "99.9%" },
      disabled: true
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
              <Shield className="text-white text-xl" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Administration</h1>
              <p className="text-gray-600 mt-1">
                Centre de contrôle et configuration de Saxium
              </p>
            </div>
          </div>
        </div>

        {/* Admin Modules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {adminModules.map((module) => (
            <Card 
              key={module.href}
              className={`hover:shadow-lg transition-shadow duration-200 ${
                module.disabled ? 'opacity-60' : ''
              }`}
              data-testid={`admin-module-${module.title.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className={`w-12 h-12 ${module.color} rounded-lg flex items-center justify-center`}>
                    <module.icon className="text-white text-xl" />
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">{module.stats.label}</p>
                    <p className="text-sm font-semibold text-gray-900">{module.stats.value}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <CardTitle className="text-lg mb-2">{module.title}</CardTitle>
                <CardDescription className="mb-4">{module.description}</CardDescription>
                <Link href={module.href}>
                  <Button 
                    className="w-full"
                    disabled={module.disabled}
                    variant={module.disabled ? "outline" : "default"}
                    data-testid={`admin-button-${module.title.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    {module.disabled ? 'Bientôt disponible' : 'Accéder'}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* System Info */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Informations système
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Version</p>
                <p className="font-semibold">Saxium v2.4.0</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Environnement</p>
                <p className="font-semibold">Production</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Base de données</p>
                <p className="font-semibold">PostgreSQL 15</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Dernière mise à jour</p>
                <p className="font-semibold">14 Oct 2025</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}