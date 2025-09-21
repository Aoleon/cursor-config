import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '@/lib/queryClient'
import { useToast } from '@/hooks/use-toast'
import { 
  Calendar, 
  Clock, 
  Users, 
  AlertTriangle, 
  CheckCircle2,
  ArrowRight,
  GripVertical
} from 'lucide-react'

type ProjectStatus = 'etude' | 'planification' | 'approvisionnement' | 'chantier' | 'sav'

interface KanbanColumn {
  id: ProjectStatus
  title: string
  color: string
  icon: React.ReactNode
}

const columns: KanbanColumn[] = [
  {
    id: 'etude',
    title: 'Étude',
    color: 'bg-primary/10 border-primary/20',
    icon: <Calendar className="h-4 w-4 text-primary" />
  },
  {
    id: 'planification', 
    title: 'Planification',
    color: 'bg-warning/10 border-warning/20',
    icon: <Clock className="h-4 w-4 text-warning" />
  },
  {
    id: 'approvisionnement',
    title: 'Approvisionnement', 
    color: 'bg-accent/10 border-accent/20',
    icon: <Users className="h-4 w-4 text-accent" />
  },
  {
    id: 'chantier',
    title: 'Chantier',
    color: 'bg-success/10 border-success/20', 
    icon: <CheckCircle2 className="h-4 w-4 text-success" />
  },
  {
    id: 'sav',
    title: 'SAV',
    color: 'bg-surface-muted border-border',
    icon: <AlertTriangle className="h-4 w-4 text-on-surface-muted" />
  }
]

interface ProjectCardProps {
  project: any
  onStatusChange: (projectId: string, newStatus: ProjectStatus) => void
}

function ProjectCard({ project, onStatusChange }: ProjectCardProps) {
  const [isDragging, setIsDragging] = useState(false)

  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true)
    e.dataTransfer.setData('text/plain', project.id)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragEnd = () => {
    setIsDragging(false)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'etude': return 'bg-primary'
      case 'planification': return 'bg-warning'
      case 'approvisionnement': return 'bg-accent'
      case 'chantier': return 'bg-success' 
      case 'sav': return 'bg-secondary'
      default: return 'bg-surface-muted'
    }
  }

  return (
    <Card
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={`cursor-move transition-all duration-200 hover:shadow-md ${
        isDragging ? 'opacity-50 scale-95' : ''
      }`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">{project.name}</CardTitle>
          <GripVertical className="h-4 w-4 text-on-surface-muted" />
        </div>
        <CardDescription className="text-xs">
          {project.client} - {project.location}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pt-0 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Budget:</span>
          <span className="font-medium">{project.budget}€</span>
        </div>
        
        {project.startDate && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Début:</span>
            <span>{new Date(project.startDate).toLocaleDateString('fr-FR')}</span>
          </div>
        )}
        
        {project.endDate && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Fin:</span>
            <span>{new Date(project.endDate).toLocaleDateString('fr-FR')}</span>
          </div>
        )}

        {project.responsibleUser && (
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={project.responsibleUser.profileImageUrl} />
              <AvatarFallback className="text-xs">
                {project.responsibleUser.firstName?.[0]}{project.responsibleUser.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground">
              {project.responsibleUser.firstName} {project.responsibleUser.lastName}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <Badge className={`text-xs ${getStatusColor(project.status)} text-white`}>
            {columns.find(col => col.id === project.status)?.title || project.status}
          </Badge>
          
          <div className="flex gap-1">
            {project.status !== 'sav' && (
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                onClick={() => {
                  const currentIndex = columns.findIndex(col => col.id === project.status)
                  if (currentIndex < columns.length - 1) {
                    onStatusChange(project.id, columns[currentIndex + 1].id)
                  }
                }}
              >
                <ArrowRight className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface KanbanColumnProps {
  column: KanbanColumn
  projects: any[]
  onStatusChange: (projectId: string, newStatus: ProjectStatus) => void
}

function KanbanColumn({ column, projects, onStatusChange }: KanbanColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false)

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
    
    const projectId = e.dataTransfer.getData('text/plain')
    if (projectId) {
      onStatusChange(projectId, column.id)
    }
  }

  const columnProjects = projects.filter(project => project.status === column.id)

  return (
    <div
      className={`flex-1 min-w-80 max-w-sm ${column.color} rounded-lg p-4 transition-all duration-200 ${
        isDragOver ? 'ring-2 ring-blue-400 scale-105' : ''
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex items-center gap-2 mb-4">
        {column.icon}
        <h3 className="font-semibold text-sm">{column.title}</h3>
        <Badge variant="secondary" className="ml-auto">
          {columnProjects.length}
        </Badge>
      </div>
      
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {columnProjects.map(project => (
          <ProjectCard
            key={project.id}
            project={project}
            onStatusChange={onStatusChange}
          />
        ))}
        
        {columnProjects.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Aucun projet dans cette étape
          </div>
        )}
      </div>
    </div>
  )
}

export default function KanbanBoard() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: projects = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/projects']
  })

  const updateProjectMutation = useMutation({
    mutationFn: async ({ projectId, status }: { projectId: string, status: ProjectStatus }) => {
      return await apiRequest(`/api/projects/${projectId}`, 'PATCH', { status })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] })
      toast({
        title: "Projet mis à jour",
        description: "Le statut du projet a été modifié avec succès"
      })
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le projet",
        variant: "destructive"
      })
    }
  })

  const handleStatusChange = (projectId: string, newStatus: ProjectStatus) => {
    updateProjectMutation.mutate({ projectId, status: newStatus })
  }

  // Calcul des statistiques
  const totalProjects = projects.length
  const projectsByStatus = columns.map(column => ({
    ...column,
    count: projects.filter((p: any) => p.status === column.id).length
  }))

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Chargement des projets...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Statistiques */}
      <div className="flex items-center gap-4 p-4 bg-white rounded-lg border">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <span className="font-medium">Total projets:</span>
          <Badge variant="outline">{totalProjects}</Badge>
        </div>
        
        {projectsByStatus.map(stat => (
          <div key={stat.id} className="flex items-center gap-2">
            {stat.icon}
            <span className="text-sm">{stat.title}:</span>
            <Badge variant="secondary">{stat.count}</Badge>
          </div>
        ))}
      </div>

      {/* Tableau Kanban */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map(column => (
          <KanbanColumn
            key={column.id}
            column={column}
            projects={projects}
            onStatusChange={handleStatusChange}
          />
        ))}
      </div>

      {totalProjects === 0 && (
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-on-surface-muted mx-auto mb-4" />
          <h3 className="text-lg font-medium text-on-surface mb-2">Aucun projet</h3>
          <p className="text-muted-foreground">
            Créez votre premier projet à partir d'une offre validée
          </p>
        </div>
      )}
    </div>
  )
}