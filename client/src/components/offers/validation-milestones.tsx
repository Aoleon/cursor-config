import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react'
import { apiRequest } from '@/lib/queryClient'

interface ValidationMilestone {
  id: string
  offerId: string
  milestoneType: string
  isCompleted: boolean
  completedBy?: string
  completedAt?: string
  comment?: string
  blockers?: string
  createdAt: string
  updatedAt: string
}

interface ValidationMilestonesProps {
  offerId: string | null
}

const MILESTONE_TYPES = [
  { key: 'fin_etudes', label: 'Fin d\'Études', description: 'Validation complète des études techniques' },
  { key: 'validation_technique', label: 'Validation Technique', description: 'Approbation des spécifications techniques' },
  { key: 'validation_commercial', label: 'Validation Commerciale', description: 'Validation des conditions commerciales' },
  { key: 'preparation_production', label: 'Préparation Production', description: 'Préparatifs pour la phase de production' }
]

export default function ValidationMilestones({ offerId }: ValidationMilestonesProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [selectedMilestone, setSelectedMilestone] = useState<string | null>(null)
  const [comment, setComment] = useState('')
  const [blockers, setBlockers] = useState('')

  const { data: milestones = [], isLoading } = useQuery<ValidationMilestone[]>({
    queryKey: ['/api/validation-milestones', offerId],
    enabled: !!offerId
  })

  const { data: offer } = useQuery<any>({
    queryKey: ['/api/offers', offerId],
    enabled: !!offerId
  })

  const updateMilestoneMutation = useMutation({
    mutationFn: async (data: {
      milestoneId: string
      isCompleted: boolean
      comment?: string
      blockers?: string
    }) => {
      return await apiRequest(`/api/validation-milestones/${data.milestoneId}`, 'PATCH', {
        isCompleted: data.isCompleted,
        comment: data.comment,
        blockers: data.blockers
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/validation-milestones'] })
      queryClient.invalidateQueries({ queryKey: ['/api/offers'] })
      toast({
        title: 'Jalon mis à jour',
        description: 'Le jalon de validation a été mis à jour avec succès.'
      })
      setComment('')
      setBlockers('')
      setSelectedMilestone(null)
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour le jalon.',
        variant: 'destructive'
      })
    }
  })

  const createMilestonesMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/validation-milestones/init', 'POST', { offerId })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/validation-milestones'] })
      toast({
        title: 'Jalons initialisés',
        description: 'Les jalons de validation ont été créés pour cette offre.'
      })
    },
    onError: () => {
      toast({
        title: 'Erreur',
        description: 'Impossible de créer les jalons.',
        variant: 'destructive'
      })
    }
  })

  if (!offerId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Suivi des Jalons de Validation
          </CardTitle>
          <CardDescription>
            Gestion des étapes clés de validation des dossiers d'offre
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Sélectionnez un dossier d'offre pour gérer les jalons de validation
          </p>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Chargement des jalons...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const getMilestoneStatus = (milestoneType: string) => {
    const milestone = milestones.find((m) => m.milestoneType === milestoneType)
    if (!milestone) return 'not_created'
    if (milestone.blockers) return 'blocked'
    if (milestone.isCompleted) return 'completed'
    return 'pending'
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'blocked':
        return <XCircle className="h-5 w-5 text-red-600" />
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-600" />
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-400" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Validé</Badge>
      case 'blocked':
        return <Badge variant="destructive">Bloqué</Badge>
      case 'pending':
        return <Badge variant="secondary">En cours</Badge>
      default:
        return <Badge variant="outline">Non créé</Badge>
    }
  }

  const handleMilestoneToggle = (milestoneType: string, currentStatus: string) => {
    const milestone = milestones.find((m) => m.milestoneType === milestoneType)
    if (!milestone) return

    if (currentStatus === 'completed') {
      // Décompléter
      updateMilestoneMutation.mutate({
        milestoneId: milestone.id,
        isCompleted: false
      })
    } else {
      // Marquer comme sélectionné pour validation
      setSelectedMilestone(milestone.id)
    }
  }

  const handleValidation = () => {
    if (!selectedMilestone) return

    updateMilestoneMutation.mutate({
      milestoneId: selectedMilestone,
      isCompleted: true,
      comment,
      blockers: blockers || undefined
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5" />
          Suivi des Jalons de Validation
        </CardTitle>
        <CardDescription>
          {offer?.reference} - {offer?.client}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {milestones.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground mb-4">
              Aucun jalon de validation créé pour cette offre
            </p>
            <Button 
              onClick={() => createMilestonesMutation.mutate()}
              disabled={createMilestonesMutation.isPending}
            >
              Initialiser les Jalons
            </Button>
          </div>
        ) : (
          <>
            {MILESTONE_TYPES.map(milestoneType => {
              const status = getMilestoneStatus(milestoneType.key)
              const milestone = milestones.find((m) => m.milestoneType === milestoneType.key)
              
              return (
                <div key={milestoneType.key} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(status)}
                    <div>
                      <h4 className="font-medium">{milestoneType.label}</h4>
                      <p className="text-sm text-muted-foreground">{milestoneType.description}</p>
                      {milestone?.comment && (
                        <p className="text-xs text-blue-600 mt-1">💬 {milestone.comment}</p>
                      )}
                      {milestone?.blockers && (
                        <p className="text-xs text-red-600 mt-1">🚫 {milestone.blockers}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(status)}
                    {milestone && (
                      <Checkbox
                        checked={status === 'completed'}
                        onCheckedChange={() => handleMilestoneToggle(milestoneType.key, status)}
                        disabled={updateMilestoneMutation.isPending}
                      />
                    )}
                  </div>
                </div>
              )
            })}

            {selectedMilestone && (
              <Card className="mt-6 border-blue-200 bg-blue-50">
                <CardHeader>
                  <CardTitle className="text-lg">Validation du Jalon</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Commentaire de validation</label>
                    <Textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Détails sur la validation..."
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Blockers identifiés (optionnel)</label>
                    <Textarea
                      value={blockers}
                      onChange={(e) => setBlockers(e.target.value)}
                      placeholder="Décrivez les éventuels blockers..."
                      className="mt-1"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleValidation}
                      disabled={updateMilestoneMutation.isPending}
                    >
                      {blockers ? 'Marquer comme Bloqué' : 'Valider le Jalon'}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setSelectedMilestone(null)}
                    >
                      Annuler
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}