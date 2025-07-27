import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Home, 
  FileText, 
  FolderOpen, 
  Calendar, 
  Users, 
  TrendingUp,
  LogOut
} from "lucide-react";

export default function Header() {
  const [location] = useLocation();
  const { user } = useAuth();

  const isBeUser = (user as any)?.role === "responsable_be" || (user as any)?.role === "technicien_be";

  const navigation = [
    { name: "Accueil", href: "/", icon: Home },
    { name: "Dossiers d'Offre", href: "/offers", icon: FileText },
    { name: "Projets", href: "/projects", icon: FolderOpen },
    { name: "Planning", href: "/planning", icon: Calendar },
    { name: "Équipes", href: "/teams", icon: Users },
  ];

  // Add BE Dashboard for authorized users
  if (isBeUser) {
    navigation.push({
      name: "Tableau de Bord BE",
      href: "/be-dashboard",
      icon: TrendingUp
    });
  }

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">JLM</span>
                </div>
                <span className="font-semibold text-gray-900">ERP Menuiserie</span>
              </div>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex space-x-8">
            {navigation.map((item) => {
              const isActive = location === item.href;
              const Icon = item.icon;
              
              return (
                <Link key={item.name} href={item.href}>
                  <div
                    className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-primary-light text-primary border-b-2 border-primary"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>
                    {item.name === "Tableau de Bord BE" && (
                      <Badge variant="secondary" className="ml-1 text-xs">BE</Badge>
                    )}
                  </div>
                </Link>
              );
            })}
          </nav>

          {/* User menu */}
          <div className="flex items-center space-x-4">
            {user && (
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">
                    {(user as any).firstName} {(user as any).lastName}
                  </div>
                  <div className="text-xs text-gray-500">
                    {(user as any).role === "responsable_be" ? "Responsable BE" : ""}
                    {(user as any).role === "technicien_be" ? "Technicien BE" : ""}
                    {(user as any).role === "chef_projet" ? "Chef de Projet" : ""}
                    {(user as any).role === "chef_travaux" ? "Chef de Travaux" : ""}
                    {(user as any).role === "admin" ? "Administrateur" : ""}
                  </div>
                </div>
                <Avatar className="w-8 h-8">
                  <AvatarImage 
                    src={(user as any).profileImageUrl} 
                    alt={`${(user as any).firstName} ${(user as any).lastName}`} 
                  />
                  <AvatarFallback>
                    {`${(user as any).firstName?.[0] || ''}${(user as any).lastName?.[0] || ''}`}
                  </AvatarFallback>
                </Avatar>
              </div>
            )}
            
            <Button 
              variant="outline" 
              size="sm" 
              asChild
              className="text-gray-600 hover:text-gray-900"
            >
              <a href="/api/logout">
                <LogOut className="w-4 h-4 mr-2" />
                Déconnexion
              </a>
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile navigation */}
      <div className="md:hidden">
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t border-gray-200">
          {navigation.map((item) => {
            const isActive = location === item.href;
            const Icon = item.icon;
            
            return (
              <Link key={item.name} href={item.href}>
                <div
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium ${
                    isActive
                      ? "bg-primary-light text-primary"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.name}</span>
                  {item.name === "Tableau de Bord BE" && (
                    <Badge variant="secondary" className="ml-1 text-xs">BE</Badge>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}