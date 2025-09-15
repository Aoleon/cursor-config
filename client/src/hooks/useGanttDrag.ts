import { useState, useRef, useCallback, useEffect } from "react";
import { addDays, differenceInDays, isAfter, isBefore, addWeeks, subWeeks, addMonths, subMonths } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import type { GanttItem, ViewMode, ResizeHandle } from "@/types/gantt";

export interface DragPreview {
  itemId: string;
  originalStartDate: Date;
  originalEndDate: Date;
  previewStartDate: Date;
  previewEndDate: Date;
  isValidPosition: boolean;
  willNavigate: boolean;
  targetPeriod?: Date;
}

export interface UseGanttDragProps {
  ganttItems: GanttItem[];
  periodStart: Date;
  periodEnd: Date;
  totalDays: number;
  viewMode: ViewMode;
  currentPeriod: Date;
  linkMode: boolean;
  onDateUpdate?: (itemId: string, newStartDate: Date, newEndDate: Date, type: 'project' | 'milestone' | 'task') => void;
  onPeriodChange?: (newPeriod: Date) => void;
}

export interface UseGanttDragReturn {
  // États du drag
  draggedItem: string | null;
  resizeItem: { id: string; handle: ResizeHandle } | null;
  dragOffset: number;
  dragPreview: DragPreview | null;
  
  // Handlers pour le drag
  handleDragStart: (e: React.DragEvent, itemId: string) => void;
  handleDrop: (e: React.DragEvent) => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDragEnd: () => void;
  
  // Handlers pour le resize
  handleResizeStart: (e: React.MouseEvent, itemId: string, handle: 'start' | 'end') => void;
  
  // Ref pour le container Gantt
  ganttRef: React.RefObject<HTMLDivElement>;
  
  // Navigation automatique
  isNavigating: boolean;
}

const NAVIGATION_THRESHOLD = 50; // pixels du bord pour déclencher la navigation
const NAVIGATION_DELAY = 500; // délai en ms avant navigation

export function useGanttDrag({
  ganttItems,
  periodStart,
  periodEnd,
  totalDays,
  viewMode,
  currentPeriod,
  linkMode,
  onDateUpdate,
  onPeriodChange
}: UseGanttDragProps): UseGanttDragReturn {
  
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [resizeItem, setResizeItem] = useState<{ id: string; handle: ResizeHandle } | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [dragPreview, setDragPreview] = useState<DragPreview | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  
  const ganttRef = useRef<HTMLDivElement>(null);
  const navigationTimeoutRef = useRef<number | ReturnType<typeof setTimeout> | null>(null);
  const dragDataRef = useRef<{ lastX: number; lastY: number }>({ lastX: 0, lastY: 0 });
  
  const { toast } = useToast();

  // Utilitaire pour calculer la date depuis une position X
  const getDateFromPosition = useCallback((clientX: number, allowExtended = true): { date: Date; isOutOfBounds: boolean; side?: 'left' | 'right' } => {
    if (!ganttRef.current) return { date: new Date(), isOutOfBounds: true };
    
    const rect = ganttRef.current.getBoundingClientRect();
    const relativeX = clientX - rect.left - dragOffset;
    const dayWidth = rect.width / totalDays;
    
    // Position en jours (peut être négative ou > totalDays)
    const dayPosition = relativeX / dayWidth;
    
    if (allowExtended) {
      // Calcul étendu pour le drag latéral
      const dayIndex = Math.floor(dayPosition);
      const targetDate = addDays(periodStart, dayIndex);
      
      const isOutOfBounds = dayIndex < 0 || dayIndex >= totalDays;
      const side = dayIndex < 0 ? 'left' : dayIndex >= totalDays ? 'right' : undefined;
      
      return { date: targetDate, isOutOfBounds, side };
    } else {
      // Calcul limité aux bornes visibles (pour compatibilité)
      const dayIndex = Math.max(0, Math.min(totalDays - 1, Math.floor(dayPosition)));
      const targetDate = addDays(periodStart, dayIndex);
      
      return { date: targetDate, isOutOfBounds: false };
    }
  }, [dragOffset, totalDays, periodStart]);

  // Calcul de preview pendant le drag
  const calculateDragPreview = useCallback((clientX: number): DragPreview | null => {
    if (!draggedItem) return null;
    
    const item = ganttItems.find(i => i.id === draggedItem);
    if (!item) return null;
    
    const { date: newStartDate, isOutOfBounds, side } = getDateFromPosition(clientX, true);
    const duration = differenceInDays(item.endDate, item.startDate);
    const newEndDate = addDays(newStartDate, duration);
    
    // Déterminer si une navigation sera nécessaire
    let willNavigate = false;
    let targetPeriod: Date | undefined;
    
    if (isOutOfBounds && side && onPeriodChange) {
      willNavigate = true;
      if (side === 'left') {
        targetPeriod = viewMode === 'week' ? subWeeks(currentPeriod, 1) : subMonths(currentPeriod, 1);
      } else {
        targetPeriod = viewMode === 'week' ? addWeeks(currentPeriod, 1) : addMonths(currentPeriod, 1);
      }
    }
    
    // Validation de la position (pas de chevauchements critiques, etc.)
    const isValidPosition = true; // TODO: ajouter logique de validation plus sophistiquée
    
    return {
      itemId: draggedItem,
      originalStartDate: item.startDate,
      originalEndDate: item.endDate,
      previewStartDate: newStartDate,
      previewEndDate: newEndDate,
      isValidPosition,
      willNavigate,
      targetPeriod
    };
  }, [draggedItem, ganttItems, getDateFromPosition, currentPeriod, viewMode, onPeriodChange]);

  // Navigation automatique lors du drag vers les bords
  const handleAutoNavigation = useCallback((clientX: number) => {
    if (!ganttRef.current || !onPeriodChange || isNavigating) return;
    
    const rect = ganttRef.current.getBoundingClientRect();
    const relativeX = clientX - rect.left;
    
    // Vérifier si on est proche des bords
    const isNearLeftEdge = relativeX < NAVIGATION_THRESHOLD;
    const isNearRightEdge = relativeX > rect.width - NAVIGATION_THRESHOLD;
    
    if (isNearLeftEdge || isNearRightEdge) {
      // Annuler la navigation précédente s'il y en a une
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
      
      // Programmer la navigation
      navigationTimeoutRef.current = setTimeout(() => {
        setIsNavigating(true);
        
        const newPeriod = isNearLeftEdge 
          ? (viewMode === 'week' ? subWeeks(currentPeriod, 1) : subMonths(currentPeriod, 1))
          : (viewMode === 'week' ? addWeeks(currentPeriod, 1) : addMonths(currentPeriod, 1));
        
        onPeriodChange(newPeriod);
        
        toast({
          title: `Navigation ${isNearLeftEdge ? 'précédente' : 'suivante'}`,
          description: `Période ${viewMode === 'week' ? 'semaine' : 'mois'} changée`,
        });
        
        // Reset l'état de navigation après un délai
        setTimeout(() => setIsNavigating(false), 300);
      }, NAVIGATION_DELAY);
    } else {
      // Annuler la navigation si on s'éloigne des bords
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
        navigationTimeoutRef.current = null;
      }
    }
  }, [ganttRef, onPeriodChange, isNavigating, currentPeriod, viewMode, toast]);

  // Gestion du drag start
  const handleDragStart = useCallback((e: React.DragEvent, itemId: string) => {
    if (linkMode) return; // Pas de drag en mode liaison
    
    setDraggedItem(itemId);
    e.dataTransfer.effectAllowed = 'move';
    
    const rect = ganttRef.current?.getBoundingClientRect();
    if (rect) {
      const relativeX = e.clientX - rect.left;
      const dayWidth = rect.width / totalDays;
      setDragOffset(relativeX % dayWidth);
    }
    
    // Stocker la position initiale
    dragDataRef.current = { lastX: e.clientX, lastY: e.clientY };
  }, [linkMode, totalDays]);

  // Gestion du drag over (pour preview et navigation)
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedItem) return;
    
    // Mettre à jour la position de suivi
    dragDataRef.current = { lastX: e.clientX, lastY: e.clientY };
    
    // Calculer et mettre à jour le preview
    const preview = calculateDragPreview(e.clientX);
    setDragPreview(preview);
    
    // Gérer la navigation automatique
    handleAutoNavigation(e.clientX);
  }, [draggedItem, calculateDragPreview, handleAutoNavigation]);

  // Gestion du drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedItem || !ganttRef.current) return;

    // Annuler toute navigation en cours
    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current);
      navigationTimeoutRef.current = null;
    }

    const { date: newStartDate } = getDateFromPosition(e.clientX, true);
    const item = ganttItems.find(i => i.id === draggedItem);
    
    if (item && onDateUpdate) {
      const duration = differenceInDays(item.endDate, item.startDate);
      const newEndDate = addDays(newStartDate, duration);
      
      onDateUpdate(draggedItem, newStartDate, newEndDate, item.type);
      
      toast({
        title: "Élément déplacé",
        description: `${item.name} repositionné avec succès`,
      });
    }
    
    // Nettoyer l'état de drag
    setDraggedItem(null);
    setDragOffset(0);
    setDragPreview(null);
  }, [draggedItem, ganttItems, onDateUpdate, getDateFromPosition, toast]);

  // Gestion de la fin du drag (annulation)
  const handleDragEnd = useCallback(() => {
    // Annuler toute navigation en cours
    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current);
      navigationTimeoutRef.current = null;
    }
    
    // Nettoyer l'état de drag
    setDraggedItem(null);
    setDragOffset(0);
    setDragPreview(null);
  }, []);

  // Gestion du resize start
  const handleResizeStart = useCallback((e: React.MouseEvent, itemId: string, handle: 'start' | 'end') => {
    e.stopPropagation();
    setResizeItem({ id: itemId, handle });
  }, []);

  // Gestion du resize via mouse move
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (resizeItem && ganttRef.current) {
      const { date: newDate, isOutOfBounds } = getDateFromPosition(e.clientX, false);
      
      // Pour le resize, on reste dans les bornes visibles
      if (!isOutOfBounds) {
        const item = ganttItems.find(i => i.id === resizeItem.id);
        
        if (item && onDateUpdate) {
          if (resizeItem.handle === 'start') {
            if (isBefore(newDate, item.endDate)) {
              onDateUpdate(resizeItem.id, newDate, item.endDate, item.type);
            }
          } else {
            if (isAfter(newDate, item.startDate)) {
              onDateUpdate(resizeItem.id, item.startDate, newDate, item.type);
            }
          }
        }
      }
    }
  }, [resizeItem, ganttItems, onDateUpdate, getDateFromPosition]);

  const handleMouseUp = useCallback(() => {
    setResizeItem(null);
  }, []);

  // Effect pour gérer les événements mouse pour le resize
  useEffect(() => {
    if (resizeItem) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizeItem, handleMouseMove, handleMouseUp]);

  // Nettoyage lors du démontage
  useEffect(() => {
    return () => {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
    };
  }, []);

  return {
    // États
    draggedItem,
    resizeItem,
    dragOffset,
    dragPreview,
    
    // Handlers drag
    handleDragStart,
    handleDrop,
    handleDragOver,
    handleDragEnd,
    
    // Handlers resize
    handleResizeStart,
    
    // Ref
    ganttRef,
    
    // Navigation
    isNavigating
  };
}