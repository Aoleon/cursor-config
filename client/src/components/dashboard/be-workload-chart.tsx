import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Users, Clock, TrendingUp, AlertTriangle } from 'lucide-react'

interface BeWorkload {
  id: string
  userId: string
  weekNumber: string
  year: string
  plannedHours: string
  actualHours: string
  capacityHours: string
  user?: {
    firstName: string
    lastName: string
    role: string
  }
}

export default function BeWorkloadChart() {
  const { data: workloadData = [], isLoading } = useQuery<BeWorkload[]>({
    queryKey: ['/api/be-workload']
  })

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ['/api/users?role=technicien_be,responsable_be']
  })

  const calculateWorkloadPercentage = (planned: string, capacity: string) => {
    const plannedNum = parseFloat(planned)
    const capacityNum = parseFloat(capacity)
    return capacityNum > 0 ? Math.round((plannedNum / capacityNum) * 100) : 0
  }

  const getWorkloadStatus = (percentage: number) => {
    if (percentage >= 100) return 'surchargé'
    if (percentage >= 80) return 'occupé'
    return 'disponible'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'surchargé':
        return 'bg-red-500'
      case 'occupé':
        return 'bg-yellow-500'
      default:
        return 'bg-green-500'
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'surchargé':
        return <Badge variant="destructive">Surchargé</Badge>
      case 'occupé':
        return <Badge className="bg-yellow-100 text-yellow-800">Occupé</Badge>
      default:
        return <Badge className="bg-green-100 text-green-800">Disponible</Badge>
    }
  }

  // Regrouper les données par utilisateur pour la semaine courante
  const getCurrentWeekWorkload = () => {
    const currentWeek = getWeekNumber(new Date())
    const currentYear = new Date().getFullYear().toString()
    
    return workloadData.filter((w) => 
      w.weekNumber === currentWeek.toString() && w.year === currentYear
    )
  }

  const currentWeekData = getCurrentWeekWorkload()

  // Calculer les statistiques globales
  const totalCapacity = currentWeekData.reduce((sum: number, w) => 
    sum + parseFloat(w.capacityHours), 0
  )
  
  const totalPlanned = currentWeekData.reduce((sum: number, w) => 
    sum + parseFloat(w.plannedHours), 0
  )

  const globalUtilization = totalCapacity > 0 ? Math.round((totalPlanned / totalCapacity) * 100) : 0

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Charge de Travail BE
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-gray-200 rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Statistiques globales */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Vue d'ensemble BE - Semaine {getWeekNumber(new Date())}
          </CardTitle>
          <CardDescription>
            Charge de travail du Bureau d'Étude
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold">{totalCapacity}h</div>
              <div className="text-sm text-muted-foreground">Capacité totale</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold">{totalPlanned}h</div>
              <div className="text-sm text-muted-foreground">Planifié</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold">{globalUtilization}%</div>
              <div className="text-sm text-muted-foreground">Utilisation</div>
            </div>
          </div>
          
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-2">
              <span>Charge globale</span>
              <span>{globalUtilization}%</span>
            </div>
            <Progress value={globalUtilization} className="h-3" />
          </div>
        </CardContent>
      </Card>

      {/* Détail par membre de l'équipe */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Charge par Membre de l'Équipe
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {users.map((user: any) => {
            const userWorkload = currentWeekData.find((w) => w.userId === user.id)
            
            if (!userWorkload) {
              return (
                <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                      {user.firstName[0]}{user.lastName[0]}
                    </div>
                    <div>
                      <h4 className="font-medium">{user.firstName} {user.lastName}</h4>
                      <p className="text-sm text-muted-foreground">{user.role}</p>
                    </div>
                  </div>
                  <Badge variant="outline">Pas de données</Badge>
                </div>
              )
            }

            const plannedHours = parseFloat(userWorkload.plannedHours)
            const capacityHours = parseFloat(userWorkload.capacityHours)
            const actualHours = parseFloat(userWorkload.actualHours || '0')
            const utilization = calculateWorkloadPercentage(userWorkload.plannedHours, userWorkload.capacityHours)
            const status = getWorkloadStatus(utilization)

            return (
              <div key={user.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      {user.firstName[0]}{user.lastName[0]}
                    </div>
                    <div>
                      <h4 className="font-medium">{user.firstName} {user.lastName}</h4>
                      <p className="text-sm text-muted-foreground">{user.role}</p>
                    </div>
                  </div>
                  {getStatusBadge(status)}
                </div>

                <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                  <div>
                    <span className="text-muted-foreground">Planifié:</span>
                    <div className="font-medium">{plannedHours}h</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Capacité:</span>
                    <div className="font-medium">{capacityHours}h</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Réalisé:</span>
                    <div className="font-medium">{actualHours}h</div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Charge</span>
                    <span>{utilization}%</span>
                  </div>
                  <Progress value={utilization} className="h-2" />
                </div>

                {status === 'surchargé' && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-red-600">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Risque de surcharge - redistribution recommandée</span>
                  </div>
                )}
              </div>
            )
          })}

          {currentWeekData.length === 0 && (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-muted-foreground">
                Aucune donnée de charge pour la semaine courante
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Fonction pour obtenir le numéro de semaine
function getWeekNumber(date: Date): number {
  const target = new Date(date.getTime())
  target.setHours(0, 0, 0, 0)
  target.setDate(target.getDate() + 3 - (target.getDay() + 6) % 7)
  const week1 = new Date(target.getFullYear(), 0, 4)
  return 1 + Math.round(((target.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7)
}