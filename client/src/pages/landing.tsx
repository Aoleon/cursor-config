import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wrench, FileText, Calendar, Users, BarChart3, Zap } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-light to-white">
      <div className="container mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center space-x-3 mb-6">
            <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center">
              <Wrench className="text-white text-2xl" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900">JLM ERP</h1>
              <p className="text-xl text-gray-600">Solution de gestion pour menuiserie</p>
            </div>
          </div>
          <p className="text-lg text-gray-700 max-w-2xl mx-auto">
            Digitalisez et optimisez la gestion de vos dossiers d'offre, 
            le chiffrage et le suivi de projet avec notre solution ERP 
            spécialement conçue pour les entreprises de menuiserie.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          <Card className="border-0 shadow-card hover:shadow-card-hover transition-shadow">
            <CardHeader>
              <FileText className="w-12 h-12 text-primary mb-4" />
              <CardTitle>Gestion des Dossiers d'Offre</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Créez et gérez vos appels d'offre avec récupération assistée des données AO. 
                Éliminez la double saisie et fluidifiez votre workflow.
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-card hover:shadow-card-hover transition-shadow">
            <CardHeader>
              <BarChart3 className="w-12 h-12 text-primary mb-4" />
              <CardTitle>Module de Chiffrage</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Intégrez votre chiffrage directement dans l'application. 
                Éditez vos devis et DPGF simplement et efficacement.
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-card hover:shadow-card-hover transition-shadow">
            <CardHeader>
              <Calendar className="w-12 h-12 text-primary mb-4" />
              <CardTitle>Planning Projet</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Visualisez et gérez vos projets avec un planning partagé. 
                Suivez les étapes clés et optimisez vos ressources.
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-card hover:shadow-card-hover transition-shadow">
            <CardHeader>
              <Users className="w-12 h-12 text-primary mb-4" />
              <CardTitle>Gestion des Équipes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Gérez vos équipes internes et sous-traitants. 
                Visualisez la charge de travail et optimisez l'affectation.
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-card hover:shadow-card-hover transition-shadow">
            <CardHeader>
              <Zap className="w-12 h-12 text-primary mb-4" />
              <CardTitle>Bureau d'Étude</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Suivez la charge du Bureau d'Étude avec des indicateurs visuels. 
                Priorisez les dossiers et optimisez les délais.
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-card hover:shadow-card-hover transition-shadow">
            <CardHeader>
              <FileText className="w-12 h-12 text-primary mb-4" />
              <CardTitle>Workflow Auditable</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Bénéficiez d'un workflow visible et traçable. 
                Validez les jalons et assurez un suivi complet de vos projets.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <Card className="border-0 shadow-card bg-primary text-white max-w-2xl mx-auto">
            <CardContent className="pt-6">
              <h2 className="text-2xl font-bold mb-4">Prêt à digitaliser votre menuiserie ?</h2>
              <p className="text-primary-foreground/90 mb-6">
                Connectez-vous pour accéder à votre espace de travail 
                et commencer à optimiser vos processus métier.
              </p>
              <Button 
                size="lg" 
                variant="secondary"
                onClick={() => window.location.href = "/login"}
                className="bg-white text-primary hover:bg-gray-100"
                data-testid="button-login"
              >
                Se connecter
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
