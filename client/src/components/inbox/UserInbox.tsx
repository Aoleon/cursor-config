import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Bell,
  CheckCircle,
  AlertTriangle,
  Clock,
  FileText,
  Calculator,
  ArrowRight,
  HardHat,
  Headphones,
  Truck,
  X,
  Loader2
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface InboxItem {
  id: string;
  type: 'validation' | 'chiffrage' | 'transformation' | 'planning' | 'sav' | 'worksite' | 'logistics' | 'alert';
  title: string;
  description?: string;
  priority: 'high' | 'medium' | 'low';
  entityId: string;
  entityType: 'offer' | 'project' | 'sav' | 'delivery';
  dueDate?: string;
  createdAt: string;
  read: boolean;
  actionUrl: string;
}

export function UserInbox() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);

  // Fetch inbox items
  const { data: items = [], isLoading, refetch } = useQuery<InboxItem[]>({
    queryKey: ['/api/workspace/inbox', { userId: (user as any)?.id }],
    select: (response: any) => response?.data || [],
    enabled: !!(user as any)?.id && open,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Mark item as read
  const markAsRead = async (itemId: string) => {
    try {
      await apiRequest('POST', `/api/workspace/inbox/${itemId}/read`);
      refetch();
    } catch (error) {
      console.error('Error marking item as read:', error);
    }
  };

  // Handle item click
  const handleItemClick = (item: InboxItem) => {
    markAsRead(item.id);
    setLocation(item.actionUrl);
    setOpen(false);
  };

  // Get icon for item type
  const getItemIcon = (type: InboxItem['type']) => {
    const iconClass = "h-4 w-4";
    switch (type) {
      case 'validation':
        return <CheckCircle className={iconClass} />;
      case 'chiffrage':
        return <Calculator className={iconClass} />;
      case 'transformation':
        return <ArrowRight className={iconClass} />;
      case 'planning':
        return <Clock className={iconClass} />;
      case 'sav':
        return <Headphones className={iconClass} />;
      case 'worksite':
        return <HardHat className={iconClass} />;
      case 'logistics':
        return <Truck className={iconClass} />;
      case 'alert':
        return <AlertTriangle className={iconClass} />;
      default:
        return <FileText className={iconClass} />;
    }
  };

  // Get priority badge variant
  const getPriorityVariant = (priority: InboxItem['priority']) => {
    switch (priority) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
    }
  };

  // Sort items: unread first, then by priority, then by date
  const sortedItems = [...items].sort((a, b) => {
    if (a.read !== b.read) return a.read ? 1 : -1;
    if (a.priority !== b.priority) {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const unreadCount = items.filter(item => !item.read).length;
  const urgentCount = items.filter(item => !item.read && item.priority === 'high').length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h3 className="font-semibold">Notifications</h3>
            {urgentCount > 0 && (
              <p className="text-sm text-error">
                {urgentCount} {urgentCount === 1 ? 'action urgente' : 'actions urgentes'}
              </p>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                // Mark all as read
                await Promise.all(
                  items.filter(item => !item.read).map(item => markAsRead(item.id))
                );
                refetch();
              }}
            >
              Tout marquer lu
            </Button>
          )}
        </div>
        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : sortedItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <Bell className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-sm text-on-surface-muted">Aucune notification</p>
            </div>
          ) : (
            <div className="divide-y">
              {sortedItems.map((item, index) => (
                <div
                  key={item.id}
                  className={`p-4 hover:bg-surface-muted transition-colors cursor-pointer ${
                    !item.read ? 'bg-primary/5' : ''
                  }`}
                  onClick={() => handleItemClick(item)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 ${
                      item.priority === 'high' ? 'text-error' :
                      item.priority === 'medium' ? 'text-warning' :
                      'text-muted-foreground'
                    }`}>
                      {getItemIcon(item.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className={`text-sm font-medium ${!item.read ? 'font-semibold' : ''}`}>
                          {item.title}
                        </p>
                        {!item.read && (
                          <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                        )}
                      </div>
                      {item.description && (
                        <p className="text-xs text-on-surface-muted mb-2 line-clamp-2">
                          {item.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={getPriorityVariant(item.priority)} className="text-xs">
                          {item.priority === 'high' ? 'Urgent' : item.priority === 'medium' ? 'Moyen' : 'Faible'}
                        </Badge>
                        {item.dueDate && (
                          <span className="text-xs text-on-surface-muted">
                            Échéance: {format(new Date(item.dueDate), 'dd/MM/yyyy', { locale: fr })}
                          </span>
                        )}
                        <span className="text-xs text-on-surface-muted">
                          {format(new Date(item.createdAt), 'dd/MM à HH:mm', { locale: fr })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        {sortedItems.length > 0 && (
          <>
            <Separator />
            <div className="p-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => {
                  setLocation('/workspace/project-manager');
                  setOpen(false);
                }}
              >
                Voir toutes les actions
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

