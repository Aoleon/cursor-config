import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '@/lib/queryClient'
import { useToast } from '@/hooks/use-toast'
import { 
  Calendar, 
  Clock, 
  Users, 
  AlertTriangle, 
  Plus,
  Edit,
  Trash2,
  BarChart3,
  Target
} from 'lucide-react'

interface Intervention {
  id: string
  projectId: string
  projectName: string
  client: string
  assignedUserId: string
  assignedUser?: any
  plannedStartDate: Date
  plannedEndDate: Date
  estimatedHours: number
  status: 'planifie' | 'en_cours' | 'termine' | 'reporte'
  priority: 'basse' | 'normale' | 'haute' | 'critique'
  description?: string
  skills: string[]
}

interface InterventionCardProps {
  intervention: Intervention
  onMove: (intervention: Intervention, newStatus: string, newAssignee?: string) => void
  onEdit: (intervention: Intervention) => void
}

function InterventionCard({ intervention, onMove, onEdit }: InterventionCardProps) {
  const [isDragging, setIsDragging] = useState(false)

  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true)
    e.dataTransfer.setData('application/json', JSON.stringify(intervention))
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragEnd = () => {
    setIsDragging(false)
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critique': return 'bg-red-500'
      case 'haute': return 'bg-orange-500'
      case 'normale': return 'bg-blue-500'
      case 'basse': return 'bg-gray-500'
      default: return 'bg-gray-400'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planifie': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'en_cours': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'termine': return 'bg-green-100 text-green-800 border-green-200'
      case 'reporte': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('fr-FR', { 
      day: '2-digit', 
      month: '2-digit' 
    })
  }

  return (
    <Card
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={`cursor-move transition-all duration-200 hover:shadow-md ${
        isDragging ? 'opacity-50 scale-95' : ''
      } border-l-4 ${getPriorityColor(intervention.priority)}`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-sm font-medium">
              {intervention.projectName}
            </CardTitle>
            <CardDescription className="text-xs">
              {intervention.client}
            </CardDescription>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={() => onEdit(intervention)}
          >
            <Edit className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0 space-y-2">
        {intervention.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {intervention.description}
          </p>
        )}
        
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>{formatDate(intervention.plannedStartDate)} - {formatDate(intervention.plannedEndDate)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{intervention.estimatedHours}h</span>
          </div>
        </div>

        {intervention.assignedUser && (
          <div className="flex items-center gap-2">
            <Avatar className="h-5 w-5">
              <AvatarImage src={intervention.assignedUser?.profileImageUrl} />
              <AvatarFallback className="text-xs">
                {intervention.assignedUser?.firstName?.[0] || '?'}{intervention.assignedUser?.lastName?.[0] || '?'}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs">
              {intervention.assignedUser?.firstName || ''} {intervention.assignedUser?.lastName || ''}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <Badge className={`text-xs ${getStatusColor(intervention.status)}`}>
            {intervention.status.replace('_', ' ').toUpperCase()}
          </Badge>
          
          <Badge variant="outline" className="text-xs">
            {intervention.priority.toUpperCase()}
          </Badge>
        </div>

        {intervention.skills.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {intervention.skills.map((skill, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {skill}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface WorkloadColumnProps {
  title: string
  status: string
  interventions: Intervention[]
  users: any[]
  onDrop: (intervention: Intervention, newStatus: string, newAssignee?: string) => void
  onEdit: (intervention: Intervention) => void
}

function WorkloadColumn({ title, status, interventions, users, onDrop, onEdit }: WorkloadColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [selectedAssignee, setSelectedAssignee] = useState<string>('')

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    try {
      const intervention = JSON.parse(e.dataTransfer.getData('application/json'))
      if (intervention) {
        onDrop(intervention, status, selectedAssignee || undefined)
      }
    } catch (error) {
      console.error('Error parsing dropped data:', error)
    }
  }

  const columnInterventions = interventions.filter(intervention => intervention.status === status)
  const totalHours = columnInterventions.reduce((sum, intervention) => sum + intervention.estimatedHours, 0)

  return (
    <div
      className={`flex-1 min-w-80 max-w-sm bg-gray-50 rounded-lg p-4 transition-all duration-200 ${
        isDragOver ? 'ring-2 ring-blue-400 bg-blue-50' : ''
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm">{title}</h3>
          <Badge variant="secondary">{columnInterventions.length}</Badge>
        </div>
        
        <div className="text-xs text-muted-foreground">
          {totalHours}h total
        </div>
      </div>

      {status === 'planifie' && (
        <div className="mb-3">
          <Select value={selectedAssignee} onValueChange={setSelectedAssignee}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Assigner à..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Aucune assignation</SelectItem>
              {users.map(user => (
                <SelectItem key={user.id} value={user.id}>
                  {user.firstName} {user.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {columnInterventions.map(intervention => (
          <InterventionCard
            key={intervention.id}
            intervention={intervention}
            onMove={onDrop}
            onEdit={onEdit}
          />
        ))}
        
        {columnInterventions.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Aucune intervention
          </div>
        )}
      </div>
    </div>
  )
}

interface ResourceCalculatorProps {
  interventions: Intervention[]
  users: any[]
}

function ResourceCalculator({ interventions, users }: ResourceCalculatorProps) {
  const calculations = useMemo(() => {
    const totalHours = interventions.reduce((sum, intervention) => sum + intervention.estimatedHours, 0)
    const activeInterventions = interventions.filter(i => i.status === 'en_cours' || i.status === 'planifie')
    const activeHours = activeInterventions.reduce((sum, intervention) => sum + intervention.estimatedHours, 0)
    
    // Calcul par utilisateur
    const userWorkload = users.map(user => {
      const userInterventions = interventions.filter(i => i.assignedUserId === user.id)
      const userHours = userInterventions.reduce((sum, intervention) => sum + intervention.estimatedHours, 0)
      const capacity = 35 // 35h par semaine
      const loadPercentage = capacity > 0 ? Math.round((userHours / capacity) * 100) : 0
      
      return {
        user,
        hours: userHours,
        interventions: userInterventions.length,
        loadPercentage,
        status: loadPercentage > 100 ? 'surchargé' : loadPercentage > 80 ? 'occupé' : 'disponible'
      }
    })
    
    // Calcul des ressources nécessaires
    const hoursPerWeek = 35
    const requiredPeople = Math.ceil(activeHours / hoursPerWeek)
    const availablePeople = users.filter(u => userWorkload.find(uw => uw.user.id === u.id)?.loadPercentage < 100).length
    
    return {
      totalHours,
      activeHours,
      requiredPeople,
      availablePeople,
      userWorkload,
      isOverloaded: requiredPeople > availablePeople
    }
  }, [interventions, users])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Statistiques globales */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Analyse de Charge
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {calculations.activeHours}h
              </div>
              <div className="text-sm text-muted-foreground">
                Charge active
              </div>
            </div>
            
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {calculations.totalHours}h
              </div>
              <div className="text-sm text-muted-foreground">
                Charge totale
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
            <div>
              <div className="font-semibold">Ressources nécessaires</div>
              <div className="text-sm text-muted-foreground">
                Pour la charge active
              </div>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold">
                {calculations.requiredPeople} personnes
              </div>
              {calculations.isOverloaded && (
                <Badge variant="destructive" className="text-xs">
                  Surcharge détectée
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charge par utilisateur */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Charge par Personne
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {calculations.userWorkload.map(({ user, hours, interventions, loadPercentage, status }) => (
            <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.profileImageUrl} />
                  <AvatarFallback className="text-xs">
                    {user.firstName?.[0]}{user.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium text-sm">
                    {user.firstName} {user.lastName}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {interventions} interventions • {hours}h
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="font-semibold">{loadPercentage}%</div>
                <Badge 
                  variant={status === 'surchargé' ? 'destructive' : status === 'occupé' ? 'secondary' : 'outline'}
                  className="text-xs"
                >
                  {status}
                </Badge>
              </div>
            </div>
          ))}
          
          {calculations.userWorkload.length === 0 && (
            <div className="text-center py-4 text-muted-foreground">
              Aucune ressource assignée
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function WorkloadPlanner() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [editingIntervention, setEditingIntervention] = useState<Intervention | null>(null)

  // Mock data for interventions - in real app, this would come from API
  const mockInterventions: Intervention[] = [
    {
      id: '1',
      projectId: 'proj-1',
      projectName: 'Rénovation Mairie Caen',
      client: 'Mairie de Caen',
      assignedUserId: 'user-sylvie',
      plannedStartDate: new Date('2024-02-05'),
      plannedEndDate: new Date('2024-02-15'),
      estimatedHours: 40,
      status: 'planifie',
      priority: 'haute',
      description: 'Installation fenêtres PVC',
      skills: ['menuiserie', 'pvc']
    },
    {
      id: '2',
      projectId: 'proj-2', 
      projectName: 'Résidence Les Jardins',
      client: 'SCI Les Jardins',
      assignedUserId: 'user-nicolas',
      plannedStartDate: new Date('2024-02-01'),
      plannedEndDate: new Date('2024-02-10'),
      estimatedHours: 35,
      status: 'en_cours',
      priority: 'normale',
      description: 'Pose portes d\'entrée',
      skills: ['menuiserie', 'serrurerie']
    }
  ]

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ['/api/users?role=chef_travaux,technicien_be']
  })

  const updateInterventionMutation = useMutation({
    mutationFn: async ({ interventionId, updates }: { interventionId: string, updates: any }) => {
      // In real app, this would call the API
      return Promise.resolve({ ...updates, id: interventionId })
    },
    onSuccess: () => {
      toast({
        title: "Intervention mise à jour",
        description: "L'intervention a été modifiée avec succès"
      })
    }
  })

  const handleDrop = (intervention: Intervention, newStatus: string, newAssignee?: string) => {
    const updates = {
      status: newStatus,
      ...(newAssignee && { assignedUserId: newAssignee })
    }
    
    updateInterventionMutation.mutate({
      interventionId: intervention.id,
      updates
    })
  }

  const columns = [
    { title: 'Planifiées', status: 'planifie' },
    { title: 'En Cours', status: 'en_cours' },
    { title: 'Terminées', status: 'termine' },
    { title: 'Reportées', status: 'reporte' }
  ]

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Plan de Charge Chantier</h2>
          <p className="text-muted-foreground">
            Gestion visuelle des interventions et calcul des ressources
          </p>
        </div>
        
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle Intervention
        </Button>
      </div>

      {/* Tableau Kanban des interventions */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map(column => (
          <WorkloadColumn
            key={column.status}
            title={column.title}
            status={column.status}
            interventions={mockInterventions}
            users={users}
            onDrop={handleDrop}
            onEdit={setEditingIntervention}
          />
        ))}
      </div>

      {/* Calculateur de ressources */}
      <ResourceCalculator 
        interventions={mockInterventions}
        users={users}
      />
    </div>
  )
}