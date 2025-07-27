import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  User,
  Filter,
  ChevronLeft,
  ChevronRight,
  Eye
} from 'lucide-react';
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isToday } from 'date-fns';
import { fr } from 'date-fns/locale';

interface TimelineViewProps {
  viewType?: 'offers' | 'projects' | 'milestones';
}

export default function TimelineView({ viewType = 'offers' }: TimelineViewProps) {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<string>('all');

  // Fetch data based on viewType
  const { data: offers = [] } = useQuery<any[]>({
    queryKey: ['/api/offers/'],
    enabled: viewType === 'offers',
  });

  const { data: projects = [] } = useQuery<any[]>({
    queryKey: ['/api/projects'],
    enabled: viewType === 'projects',
  });

  const { data: milestones = [] } = useQuery<any[]>({
    queryKey: ['/api/validation-milestones/'],
    enabled: viewType === 'milestones',
  });

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ['/api/users/'],
  });

  // Get week days
  const weekStart = startOfWeek(currentWeek, { locale: fr });
  const weekEnd = endOfWeek(currentWeek, { locale: fr });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Get timeline items based on viewType
  const getTimelineItems = () => {
    let items: any[] = [];
    
    switch (viewType) {
      case 'offers':
        items = offers.map(offer => ({
          id: offer.id,
          title: `${offer.reference} - ${offer.client}`,
          type: 'offer',
          status: offer.status,
          date: new Date(offer.deadline),
          user: offer.responsibleUser,
          priority: offer.isPriority,
          amount: offer.estimatedAmount,
          menuiserieType: offer.menuiserieType,
          raw: offer
        }));
        break;
        
      case 'projects':
        items = projects.map(project => ({
          id: project.id,
          title: `${project.reference} - ${project.name}`,
          type: 'project',
          status: project.status,
          date: new Date(project.endDate || project.startDate),
          user: project.responsibleUser,
          priority: false,
          progress: project.progress,
          raw: project
        }));
        break;
        
      case 'milestones':
        items = milestones.map(milestone => ({
          id: milestone.id,
          title: milestone.title,
          type: 'milestone',
          status: milestone.status,
          date: new Date(milestone.expectedCompletionDate),
          user: milestone.assignedUser,
          priority: milestone.milestoneType === 'fin_etudes',
          milestoneType: milestone.milestoneType,
          offer: milestone.offer,
          raw: milestone
        }));
        break;
        
      default:
        items = [];
    }

    // Apply filters
    if (selectedFilter !== 'all') {
      items = items.filter(item => item.status === selectedFilter);
    }

    if (selectedUser !== 'all') {
      items = items.filter(item => item.user?.id === selectedUser);
    }

    return items;
  };

  const timelineItems = getTimelineItems();

  // Get items for specific day
  const getItemsForDay = (day: Date) => {
    return timelineItems.filter(item => isSameDay(item.date, day));
  };

  // Navigate weeks
  const goToPreviousWeek = () => {
    setCurrentWeek(prev => addDays(prev, -7));
  };

  const goToNextWeek = () => {
    setCurrentWeek(prev => addDays(prev, 7));
  };

  const goToToday = () => {
    setCurrentWeek(new Date());
  };

  // Status colors
  const getStatusColor = (status: string, type: string) => {
    if (type === 'offer') {
      switch (status) {
        case 'nouveau': return 'bg-blue-100 text-blue-800 border-blue-200';
        case 'en_chiffrage': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        case 'en_validation': return 'bg-orange-100 text-orange-800 border-orange-200';
        case 'valide': return 'bg-green-100 text-green-800 border-green-200';
        case 'perdu': return 'bg-red-100 text-red-800 border-red-200';
        default: return 'bg-gray-100 text-gray-800 border-gray-200';
      }
    } else if (type === 'project') {
      switch (status) {
        case 'etude': return 'bg-blue-100 text-blue-800 border-blue-200';
        case 'planification': return 'bg-purple-100 text-purple-800 border-purple-200';
        case 'approvisionnement': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        case 'realisation': return 'bg-orange-100 text-orange-800 border-orange-200';
        case 'sav': return 'bg-green-100 text-green-800 border-green-200';
        default: return 'bg-gray-100 text-gray-800 border-gray-200';
      }
    } else if (type === 'milestone') {
      switch (status) {
        case 'en_attente': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        case 'en_cours': return 'bg-blue-100 text-blue-800 border-blue-200';
        case 'valide': return 'bg-green-100 text-green-800 border-green-200';
        case 'rejete': return 'bg-red-100 text-red-800 border-red-200';
        default: return 'bg-gray-100 text-gray-800 border-gray-200';
      }
    }
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getStatusLabel = (status: string, type: string) => {
    if (type === 'offer') {
      switch (status) {
        case 'nouveau': return 'Nouveau';
        case 'en_chiffrage': return 'En Chiffrage';
        case 'en_validation': return 'En Validation';
        case 'valide': return 'Validé';
        case 'perdu': return 'Perdu';
        default: return status;
      }
    } else if (type === 'project') {
      switch (status) {
        case 'etude': return 'Étude';
        case 'planification': return 'Planification';
        case 'approvisionnement': return 'Approvisionnement';
        case 'realisation': return 'Réalisation';
        case 'sav': return 'SAV';
        default: return status;
      }
    } else if (type === 'milestone') {
      switch (status) {
        case 'en_attente': return 'En Attente';
        case 'en_cours': return 'En Cours';
        case 'valide': return 'Validé';
        case 'rejete': return 'Rejeté';
        default: return status;
      }
    }
    return status;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'offer': return <Calendar className="h-4 w-4" />;
      case 'project': return <Clock className="h-4 w-4" />;
      case 'milestone': return <CheckCircle2 className="h-4 w-4" />;
      default: return <Eye className="h-4 w-4" />;
    }
  };

  const getFilterOptions = () => {
    switch (viewType) {
      case 'offers':
        return [
          { value: 'all', label: 'Tous les statuts' },
          { value: 'nouveau', label: 'Nouveau' },
          { value: 'en_chiffrage', label: 'En Chiffrage' },
          { value: 'en_validation', label: 'En Validation' },
          { value: 'valide', label: 'Validé' },
          { value: 'perdu', label: 'Perdu' }
        ];
      case 'projects':
        return [
          { value: 'all', label: 'Tous les statuts' },
          { value: 'etude', label: 'Étude' },
          { value: 'planification', label: 'Planification' },
          { value: 'approvisionnement', label: 'Approvisionnement' },
          { value: 'realisation', label: 'Réalisation' },
          { value: 'sav', label: 'SAV' }
        ];
      case 'milestones':
        return [
          { value: 'all', label: 'Tous les statuts' },
          { value: 'en_attente', label: 'En Attente' },
          { value: 'en_cours', label: 'En Cours' },
          { value: 'valide', label: 'Validé' },
          { value: 'rejete', label: 'Rejeté' }
        ];
      default:
        return [{ value: 'all', label: 'Tous' }];
    }
  };

  return (
    <div className="space-y-6">
      {/* Timeline Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Timeline {viewType === 'offers' ? 'Offres' : viewType === 'projects' ? 'Projets' : 'Jalons'}
            </CardTitle>
            
            <div className="flex items-center gap-2">
              {/* Filters */}
              <Select value={selectedFilter} onValueChange={setSelectedFilter}>
                <SelectTrigger className="w-40">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getFilterOptions().map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger className="w-40">
                  <User className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les utilisateurs</SelectItem>
                  {users.map((user: any) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.firstName} {user.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Week Navigation */}
              <div className="flex items-center gap-2 border rounded-md">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={goToPreviousWeek}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={goToToday}
                  className="px-3 h-8 text-xs font-medium"
                >
                  Aujourd'hui
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={goToNextWeek}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Timeline Grid */}
      <Card>
        <CardContent className="p-0">
          <div className="grid grid-cols-8 border-b">
            {/* Time column header */}
            <div className="p-4 bg-gray-50 border-r font-medium text-sm">
              Semaine du {format(weekStart, 'dd MMM', { locale: fr })}
            </div>
            
            {/* Day headers */}
            {weekDays.map((day) => (
              <div
                key={day.toISOString()}
                className={`p-4 text-center border-r text-sm font-medium ${
                  isToday(day) 
                    ? 'bg-blue-50 text-blue-900' 
                    : 'bg-gray-50 text-gray-700'
                }`}
              >
                <div>{format(day, 'EEE', { locale: fr })}</div>
                <div className={`text-lg ${isToday(day) ? 'font-bold' : ''}`}>
                  {format(day, 'd')}
                </div>
              </div>
            ))}
          </div>

          {/* Timeline Content */}
          <div className="min-h-96">
            <div className="grid grid-cols-8">
              {/* Time column */}
              <div className="border-r bg-gray-25">
                <div className="p-4 text-xs text-gray-500">
                  {timelineItems.length} élément{timelineItems.length > 1 ? 's' : ''}
                </div>
              </div>

              {/* Day columns */}
              {weekDays.map((day) => {
                const dayItems = getItemsForDay(day);
                
                return (
                  <div key={day.toISOString()} className="border-r min-h-96 p-2">
                    <div className="space-y-2">
                      {dayItems.map((item) => (
                        <div
                          key={item.id}
                          className={`p-2 rounded-md border-l-4 text-xs ${
                            item.priority 
                              ? 'border-l-red-500 bg-red-50' 
                              : 'border-l-transparent bg-white shadow-sm border'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            {getTypeIcon(item.type)}
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-gray-900 truncate">
                                {item.title}
                              </div>
                              
                              <div className="flex items-center gap-1 mt-1">
                                <Badge 
                                  variant="outline" 
                                  className={`text-xs px-1 py-0 ${getStatusColor(item.status, item.type)}`}
                                >
                                  {getStatusLabel(item.status, item.type)}
                                </Badge>
                                
                                {item.priority && (
                                  <AlertTriangle className="h-3 w-3 text-red-500" />
                                )}
                              </div>

                              {item.user && (
                                <div className="flex items-center gap-1 mt-1">
                                  <Avatar className="w-4 h-4">
                                    <AvatarImage src={item.user.profileImageUrl} />
                                    <AvatarFallback className="text-xs">
                                      {item.user.firstName?.[0]}{item.user.lastName?.[0]}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-xs text-gray-600 truncate">
                                    {item.user.firstName}
                                  </span>
                                </div>
                              )}

                              {item.amount && (
                                <div className="text-xs text-gray-600 mt-1">
                                  €{Number(item.amount).toLocaleString('fr-FR')}
                                </div>
                              )}

                              {item.progress !== undefined && (
                                <div className="text-xs text-gray-600 mt-1">
                                  {item.progress}% complété
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{timelineItems.length}</div>
            <div className="text-sm text-gray-600">
              Total {viewType === 'offers' ? 'offres' : viewType === 'projects' ? 'projets' : 'jalons'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">
              {timelineItems.filter(item => item.priority).length}
            </div>
            <div className="text-sm text-gray-600">Prioritaires</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {timelineItems.filter(item => 
                item.status === 'valide' || item.status === 'sav'
              ).length}
            </div>
            <div className="text-sm text-gray-600">Terminés</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">
              {timelineItems.filter(item => 
                ['en_chiffrage', 'en_validation', 'en_cours', 'realisation'].includes(item.status)
              ).length}
            </div>
            <div className="text-sm text-gray-600">En cours</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}