import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import BeWorkloadChart from '@/components/dashboard/be-workload-chart'
import ValidationMilestones from '@/components/offers/validation-milestones'
import { useQuery } from '@tanstack/react-query'
import { BarChart3, Calendar, CheckCircle2, Users, Clock, TrendingUp } from 'lucide-react'

export default function BeDashboard() {
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null)

  const { data: offers = [] } = useQuery({
    queryKey: ['/api/offers']
  })

  const { data: stats } = useQuery({
    queryKey: ['/api/dashboard/stats']
  })

  const { data: currentUser } = useQuery({
    queryKey: ['/api/auth/user']
  })

  // Filtrer les offres assignées à l'utilisateur actuel ou à son équipe BE
  const myOffers = offers.filter((offer: any) => 
    offer.responsibleUserId === currentUser?.id || 
    ['en_chiffrage', 'en_validation'].includes(offer.status)
  )

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'nouveau':
        return 'bg-blue-100 text-blue-800'
      case 'en_chiffrage':
        return 'bg-yellow-100 text-yellow-800'
      case 'en_validation':
        return 'bg-orange-100 text-orange-800'
      case 'valide':
        return 'bg-green-100 text-green-800'
      case 'perdu':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'nouveau':
        return 'Nouveau'
      case 'en_chiffrage':
        return 'En Chiffrage'
      case 'en_validation':
        return 'En Validation'
      case 'valide':
        return 'Validé'
      case 'perdu':
        return 'Perdu'
      default:
        return status
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard BE</h1>
          <p className="text-muted-foreground">
            Gestion des charges de travail et suivi des jalons de validation
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          <span className="font-medium">
            {currentUser?.firstName} {currentUser?.lastName}
          </span>
          <Badge variant="outline">{currentUser?.role}</Badge>
        </div>
      </div>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Offres</p>
                <p className="text-2xl font-bold">{stats?.totalOffers || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-sm text-muted-foreground">En Chiffrage</p>
                <p className="text-2xl font-bold">{stats?.offersInPricing || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm text-muted-foreground">En Validation</p>
                <p className="text-2xl font-bold">{stats?.offersPendingValidation || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Charge BE</p>
                <p className="text-2xl font-bold">{stats?.beLoad || 0}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="workload" className="space-y-4">
        <TabsList>
          <TabsTrigger value="workload">Charge de Travail</TabsTrigger>
          <TabsTrigger value="milestones">Jalons de Validation</TabsTrigger>
          <TabsTrigger value="offers">Mes Dossiers</TabsTrigger>
        </TabsList>

        <TabsContent value="workload" className="space-y-4">
          <BeWorkloadChart />
        </TabsContent>

        <TabsContent value="milestones" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Sélectionner un Dossier</CardTitle>
                <CardDescription>
                  Choisissez un dossier d'offre pour gérer ses jalons de validation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {myOffers.map((offer: any) => (
                  <div
                    key={offer.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedOfferId === offer.id 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedOfferId(offer.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{offer.reference}</h4>
                        <p className="text-sm text-muted-foreground">
                          {offer.client} - {offer.location}
                        </p>
                      </div>
                      <Badge className={getStatusColor(offer.status)}>
                        {getStatusLabel(offer.status)}
                      </Badge>
                    </div>
                  </div>
                ))}

                {myOffers.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    Aucun dossier assigné
                  </p>
                )}
              </CardContent>
            </Card>

            <ValidationMilestones offerId={selectedOfferId} />
          </div>
        </TabsContent>

        <TabsContent value="offers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Mes Dossiers d'Offre</CardTitle>
              <CardDescription>
                Dossiers assignés ou en cours de traitement
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {myOffers.map((offer: any) => (
                  <div key={offer.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{offer.reference}</h4>
                      <p className="text-sm text-muted-foreground">
                        {offer.client} - {offer.location}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {offer.menuiserieType} - {offer.estimatedAmount}€
                      </p>
                      {offer.deadline && (
                        <p className="text-xs text-red-600">
                          Échéance: {new Date(offer.deadline).toLocaleDateString('fr-FR')}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Badge className={getStatusColor(offer.status)}>
                        {getStatusLabel(offer.status)}
                      </Badge>
                      
                      {offer.isPriority && (
                        <Badge variant="destructive">Prioritaire</Badge>
                      )}
                      
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setSelectedOfferId(offer.id)}
                      >
                        Voir Jalons
                      </Button>
                    </div>
                  </div>
                ))}

                {myOffers.length === 0 && (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      Aucun dossier assigné pour le moment
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}