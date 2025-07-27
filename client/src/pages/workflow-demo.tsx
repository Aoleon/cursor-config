import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowRight, 
  FileText, 
  Calculator, 
  Calendar, 
  Users, 
  CheckCircle,
  Clock,
  Euro,
  Building,
  Truck
} from "lucide-react";
import { PhaseNavigation } from "@/components/navigation/phase-navigation";
import Header from "@/components/layout/header";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function WorkflowDemo() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0);
  
  // Récupération des données réelles
  const { data: aos } = useQuery({ queryKey: ['/api/aos'] });
  const { data: offers } = useQuery({ queryKey: ['/api/offers'] });
  const { data: projects } = useQuery({ queryKey: ['/api/projects'] });
  const { data: users } = useQuery({ queryKey: ['/api/users'] });

  // Mutation pour créer une offre depuis un AO
  const createOfferFromAO = useMutation({
    mutationFn: async (aoId: string) => {
      const ao = aos?.find((a: any) => a.id === aoId);
      if (!ao) throw new Error("AO non trouvé");
      
      return apiRequest("/api/offers", "POST", {
        reference: `OFF-${Date.now()}`,
        title: ao.title,
        clientName: ao.clientName,
        location: ao.location,
        estimatedAmount: ao.estimatedAmount,
        aoId: ao.id,
        status: "nouveau",
        priority: false,
        responsibleUserId: "user-pierre"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/offers'] });
      toast({ title: "Offre créée avec succès", description: "L'offre a été générée à partir de l'AO" });
      setCurrentStep(1);
    }
  });

  // Mutation pour faire évoluer le statut d'une offre
  const updateOfferStatus = useMutation({
    mutationFn: async ({ offerId, status }: { offerId: string, status: string }) => {
      return apiRequest(`/api/offers/${offerId}`, "PATCH", { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/offers'] });
      toast({ title: "Statut mis à jour", description: "L'offre progresse dans le workflow" });
      setCurrentStep(prev => prev + 1);
    }
  });

  // Mutation pour créer un projet depuis une offre validée
  const createProjectFromOffer = useMutation({
    mutationFn: async (offerId: string) => {
      const offer = offers?.find((o: any) => o.id === offerId);
      if (!offer) throw new Error("Offre non trouvée");
      
      return apiRequest("/api/projects", "POST", {
        name: offer.title,
        description: `Projet généré depuis l'offre ${offer.reference}`,
        clientName: offer.clientName,
        location: offer.location,
        estimatedBudget: offer.estimatedAmount,
        offerId: offer.id,
        status: "etude",
        startDate: new Date().toISOString().split('T')[0],
        estimatedEndDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      toast({ title: "Projet créé", description: "Le projet est maintenant en phase d'étude" });
      setCurrentStep(4);
    }
  });

  const workflowSteps = [
    {
      id: 0,
      title: "1. Appel d'Offres (AO)",
      phase: "Commercial",
      description: "Réception et traitement des AO",
      color: "bg-blue-50 border-blue-200",
      icon: FileText,
      data: aos?.slice(0, 3) || []
    },
    {
      id: 1,
      title: "2. Création d'Offre",
      phase: "Commercial",
      description: "Génération automatique depuis l'AO",
      color: "bg-green-50 border-green-200",
      icon: Calculator,
      data: offers?.filter((o: any) => o.status === "nouveau").slice(0, 2) || []
    },
    {
      id: 2,
      title: "3. Chiffrage BE",
      phase: "Étude",
      description: "Bureau d'Étude - Calcul des coûts",
      color: "bg-purple-50 border-purple-200",
      icon: Euro,
      data: offers?.filter((o: any) => o.status === "en_chiffrage").slice(0, 2) || []
    },
    {
      id: 3,
      title: "4. Validation",
      phase: "Étude",
      description: "Validation technique et commerciale",
      color: "bg-orange-50 border-orange-200",
      icon: CheckCircle,
      data: offers?.filter((o: any) => o.status === "en_validation").slice(0, 2) || []
    },
    {
      id: 4,
      title: "5. Projet Actif",
      phase: "Planification",
      description: "Transformation en projet de production",
      color: "bg-emerald-50 border-emerald-200",
      icon: Building,
      data: projects?.slice(0, 3) || []
    }
  ];

  const getCurrentStepData = () => workflowSteps[currentStep];

  return (
    <div className="min-h-screen flex bg-gray-50">
      <PhaseNavigation />
      <main className="flex-1 overflow-auto">
        <Header 
          title="Workflow Complet JLM"
          breadcrumbs={[
            { label: "Accueil", href: "/" },
            { label: "Démonstration Workflow" }
          ]}
        />
        
        <div className="px-6 py-6 space-y-6">
          {/* Timeline horizontale */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowRight className="h-5 w-5" />
                Processus Métier Complet - De l'AO au Projet
              </CardTitle>
              <CardDescription>
                Suivez le workflow complet d'une menuiserie avec des données réelles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center mb-6">
                {workflowSteps.map((step, index) => (
                  <div key={step.id} className="flex flex-col items-center">
                    <div className={`
                      w-12 h-12 rounded-full flex items-center justify-center
                      ${index <= currentStep 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-200 text-gray-500'
                      }
                    `}>
                      {(() => {
                        const IconComponent = step.icon;
                        return <IconComponent className="h-6 w-6" />;
                      })()}
                    </div>
                    <div className="text-xs mt-2 text-center max-w-[120px]">
                      <div className="font-medium">{step.title}</div>
                      <Badge variant="outline" className="mt-1 text-xs">
                        {step.phase}
                      </Badge>
                    </div>
                    {index < workflowSteps.length - 1 && (
                      <ArrowRight className={`
                        h-4 w-4 absolute mt-6 ml-16
                        ${index < currentStep ? 'text-blue-600' : 'text-gray-300'}
                      `} />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Détails de l'étape courante */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className={getCurrentStepData().color}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {(() => {
                    const IconComponent = getCurrentStepData().icon;
                    return <IconComponent className="h-5 w-5" />;
                  })()}
                  {getCurrentStepData().title}
                </CardTitle>
                <CardDescription>{getCurrentStepData().description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {getCurrentStepData().data.map((item: any, index: number) => (
                    <div key={index} className="p-3 bg-white rounded-lg border">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">
                            {item.title || item.name || item.reference}
                          </div>
                          <div className="text-sm text-gray-600">
                            {item.clientName && `Client: ${item.clientName}`}
                            {item.location && ` • ${item.location}`}
                          </div>
                          {item.estimatedAmount && (
                            <div className="text-sm text-green-600 font-medium">
                              {item.estimatedAmount.toLocaleString('fr-FR')} €
                            </div>
                          )}
                        </div>
                        {item.status && (
                          <Badge variant={
                            item.status === 'valide' ? 'default' :
                            item.status === 'en_validation' ? 'secondary' :
                            'outline'
                          }>
                            {item.status.replace('_', ' ')}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Actions disponibles */}
            <Card>
              <CardHeader>
                <CardTitle>Actions Disponibles</CardTitle>
                <CardDescription>
                  Utilisez les boutons ci-dessous pour faire progresser le workflow
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {currentStep === 0 && aos && aos.length > 0 && (
                  <Button 
                    onClick={() => createOfferFromAO.mutate(aos[0].id)}
                    disabled={createOfferFromAO.isPending}
                    className="w-full"
                  >
                    <Calculator className="h-4 w-4 mr-2" />
                    Créer une Offre depuis l'AO
                  </Button>
                )}

                {currentStep === 1 && offers && (
                  <Button 
                    onClick={() => {
                      const newOffer = offers.find((o: any) => o.status === "nouveau");
                      if (newOffer) {
                        updateOfferStatus.mutate({ 
                          offerId: newOffer.id, 
                          status: "en_chiffrage" 
                        });
                      }
                    }}
                    disabled={updateOfferStatus.isPending}
                    className="w-full"
                  >
                    <Euro className="h-4 w-4 mr-2" />
                    Démarrer le Chiffrage BE
                  </Button>
                )}

                {currentStep === 2 && offers && (
                  <Button 
                    onClick={() => {
                      const offerInPricing = offers.find((o: any) => o.status === "en_chiffrage");
                      if (offerInPricing) {
                        updateOfferStatus.mutate({ 
                          offerId: offerInPricing.id, 
                          status: "en_validation" 
                        });
                      }
                    }}
                    disabled={updateOfferStatus.isPending}
                    className="w-full"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Envoyer en Validation
                  </Button>
                )}

                {currentStep === 3 && offers && (
                  <div className="space-y-2">
                    <Button 
                      onClick={() => {
                        const offerInValidation = offers.find((o: any) => o.status === "en_validation");
                        if (offerInValidation) {
                          updateOfferStatus.mutate({ 
                            offerId: offerInValidation.id, 
                            status: "valide" 
                          });
                        }
                      }}
                      disabled={updateOfferStatus.isPending}
                      className="w-full"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Valider l'Offre
                    </Button>
                    <Button 
                      onClick={() => {
                        const validatedOffer = offers.find((o: any) => o.status === "valide");
                        if (validatedOffer) {
                          createProjectFromOffer.mutate(validatedOffer.id);
                        }
                      }}
                      disabled={createProjectFromOffer.isPending}
                      variant="outline"
                      className="w-full"
                    >
                      <Building className="h-4 w-4 mr-2" />
                      Créer le Projet
                    </Button>
                  </div>
                )}

                <div className="pt-4 border-t">
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                      disabled={currentStep === 0}
                      size="sm"
                    >
                      Étape Précédente
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => setCurrentStep(Math.min(4, currentStep + 1))}
                      disabled={currentStep === 4}
                      size="sm"
                    >
                      Étape Suivante
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Statistiques temps réel */}
          <Card>
            <CardHeader>
              <CardTitle>Statistiques Temps Réel</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {aos?.length || 0}
                  </div>
                  <div className="text-sm text-gray-600">AO Reçus</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {offers?.length || 0}
                  </div>
                  <div className="text-sm text-gray-600">Offres Actives</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {offers?.filter((o: any) => o.status === "en_chiffrage").length || 0}
                  </div>
                  <div className="text-sm text-gray-600">En Chiffrage</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {projects?.length || 0}
                  </div>
                  <div className="text-sm text-gray-600">Projets</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}