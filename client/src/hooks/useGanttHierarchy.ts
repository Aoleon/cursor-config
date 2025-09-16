import { useState, useMemo, useCallback } from "react";
import type { GanttItem } from "@/types/gantt";

export interface HierarchyItem extends GanttItem {
  level: number; // 0 = projet, 1 = tâche, 2 = sous-tâche
  hasChildren: boolean;
  parentId?: string;
  children?: HierarchyItem[];
  childrenIds?: string[]; // Pour optimiser les lookups
}

export interface UseGanttHierarchyProps {
  ganttItems: GanttItem[];
  defaultExpandedItems?: string[];
}

export interface UseGanttHierarchyReturn {
  // État de l'expansion
  expandedItems: Set<string>;
  toggleExpanded: (itemId: string) => void;
  isExpanded: (itemId: string) => boolean;
  expandAll: () => void;
  collapseAll: () => void;
  
  // Structure hiérarchique
  hierarchyItems: HierarchyItem[];
  visibleItems: HierarchyItem[];
  
  // Utilitaires
  getItemLevel: (itemId: string) => number;
  hasChildren: (itemId: string) => boolean;
  getChildrenCount: (itemId: string, includeNested?: boolean) => number;
  
  // Statistiques
  totalItems: number;
  visibleItemsCount: number;
  expandedItemsCount: number;
}

export function useGanttHierarchy({
  ganttItems,
  defaultExpandedItems = []
}: UseGanttHierarchyProps): UseGanttHierarchyReturn {
  
  // État des éléments expandés
  const [expandedItems, setExpandedItems] = useState<Set<string>>(
    new Set(defaultExpandedItems)
  );
  
  // Transformation des données plates en structure hiérarchique
  const hierarchyItems: HierarchyItem[] = useMemo(() => {
    // Index pour accès rapide
    const itemsById = new Map<string, HierarchyItem>();
    const childrenByParent = new Map<string, string[]>();
    
    // Première passe : créer les items hiérarchiques et indexer
    ganttItems.forEach(item => {
      const hierarchyItem: HierarchyItem = {
        ...item,
        level: 0, // sera calculé plus tard
        hasChildren: false,
        children: [],
        childrenIds: []
      };
      
      itemsById.set(item.id, hierarchyItem);
    });
    
    // Deuxième passe : établir les relations parent-enfant
    ganttItems.forEach(item => {
      let parentId: string | undefined;
      
      // Déterminer le parent selon le type d'élément
      if (item.type === 'task' && item.projectId) {
        // Tâche : parent = projet OU parent task si parentTaskId existe
        parentId = item.parentTaskId || item.projectId;
      } else if (item.type === 'milestone' && item.projectId) {
        // Jalon : parent = projet
        parentId = item.projectId;
      }
      // Les projets n'ont pas de parent (level 0)
      
      if (parentId && itemsById.has(parentId)) {
        const parentItem = itemsById.get(parentId)!;
        const childItem = itemsById.get(item.id)!;
        
        // Établir la relation
        childItem.parentId = parentId;
        parentItem.hasChildren = true;
        parentItem.children!.push(childItem);
        parentItem.childrenIds!.push(item.id);
        
        // Indexer pour le lookup rapide
        if (!childrenByParent.has(parentId)) {
          childrenByParent.set(parentId, []);
        }
        childrenByParent.get(parentId)!.push(item.id);
      }
    });
    
    // Troisième passe : calculer les niveaux hiérarchiques
    const calculateLevel = (item: HierarchyItem, level: number = 0): void => {
      item.level = level;
      if (item.children) {
        item.children.forEach(child => calculateLevel(child, level + 1));
      }
    };
    
    // Identifier les items racine (projets sans parent)
    const rootItems = Array.from(itemsById.values()).filter(item => !item.parentId);
    
    // Calculer les niveaux à partir des racines
    rootItems.forEach(item => calculateLevel(item));
    
    // Trier les items : projets d'abord, puis par dates (null-safe)
    const sortItems = (items: HierarchyItem[]): HierarchyItem[] => {
      return items.sort((a, b) => {
        // D'abord par type (projets en premier)
        if (a.type !== b.type) {
          const typeOrder = { 'project': 0, 'task': 1, 'milestone': 2 };
          return typeOrder[a.type] - typeOrder[b.type];
        }
        
        // Puis par date de début avec protection null safety
        const aTime = a.startDate?.getTime();
        const bTime = b.startDate?.getTime();
        
        // Si l'un ou l'autre n'a pas de date, tri par nom
        if (aTime === undefined && bTime === undefined) {
          return a.name.localeCompare(b.name);
        }
        if (aTime === undefined) return 1; // a après b
        if (bTime === undefined) return -1; // a avant b
        
        // Comparaison normale des dates
        return aTime - bTime;
      });
    };
    
    // Fonction récursive pour trier toute la hiérarchie
    const sortHierarchy = (item: HierarchyItem): void => {
      if (item.children && item.children.length > 0) {
        item.children = sortItems(item.children);
        item.children.forEach(sortHierarchy);
      }
    };
    
    // Trier et retourner seulement les items racine
    const sortedRoots = sortItems(rootItems);
    sortedRoots.forEach(sortHierarchy);
    
    // 🔍 DEBUG FINAL - Log des résultats de transformation
    const itemsWithChildren = Array.from(itemsById.values()).filter(item => item.hasChildren);
    console.log('🔍 useGanttHierarchy - Final Results:', {
      totalItems: Array.from(itemsById.values()).length,
      rootItems: sortedRoots.length,
      itemsWithChildren: itemsWithChildren.length,
      itemsWithChildrenDetails: itemsWithChildren.map(i => ({
        id: i.id,
        name: i.name,
        hasChildren: i.hasChildren,
        childrenCount: i.children?.length || 0,
        childrenIds: i.childrenIds
      })),
      relations: Array.from(childrenByParent.entries()).map(([parentId, childIds]) => ({
        parentId,
        parentName: itemsById.get(parentId)?.name,
        childIds,
        childCount: childIds.length
      }))
    });
    
    // ⚠️ BUG CRITIQUE IDENTIFIÉ ET CORRIGÉ !
    // PROBLÈME: On retournait seulement les rootItems, mais les éléments avec hasChildren 
    // peuvent être des enfants et ne pas être des rootItems !
    // SOLUTION: Retourner TOUS les items transformés pour que hierarchyItems.some(hasChildren) fonctionne
    
    // Pour éviter de casser la logique existante, on retourne tous les items triés
    const allTransformedItems = Array.from(itemsById.values());
    
    console.log('🔍 BUG FIX - Correction critique useGanttHierarchy:', {
      previousReturnCount: sortedRoots.length, // Seulement les roots
      newReturnCount: allTransformedItems.length, // TOUS les items
      itemsWithChildrenInRoots: sortedRoots.filter(i => i.hasChildren).length,
      itemsWithChildrenInAll: allTransformedItems.filter(i => i.hasChildren).length,
      shouldNowWork: allTransformedItems.some(i => i.hasChildren)
    });
    
    return allTransformedItems; // ✅ CORRECTION: Retourner TOUS les items
  }, [ganttItems]);
  
  // Calculer les items visibles selon l'état d'expansion
  const visibleItems: HierarchyItem[] = useMemo(() => {
    const visible: HierarchyItem[] = [];
    
    const addVisibleItems = (items: HierarchyItem[]): void => {
      items.forEach(item => {
        visible.push(item);
        
        // Si l'item est expanded et a des enfants, les ajouter récursivement
        if (expandedItems.has(item.id) && item.children && item.children.length > 0) {
          addVisibleItems(item.children);
        }
      });
    };
    
    addVisibleItems(hierarchyItems);
    return visible;
  }, [hierarchyItems, expandedItems]);
  
  // Actions d'expansion/collapse
  const toggleExpanded = useCallback((itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  }, []);
  
  const isExpanded = useCallback((itemId: string) => {
    return expandedItems.has(itemId);
  }, [expandedItems]);
  
  const expandAll = useCallback(() => {
    const allItemsWithChildren = new Set<string>();
    
    const collectExpandableItems = (items: HierarchyItem[]): void => {
      items.forEach(item => {
        if (item.hasChildren) {
          allItemsWithChildren.add(item.id);
        }
        if (item.children) {
          collectExpandableItems(item.children);
        }
      });
    };
    
    collectExpandableItems(hierarchyItems);
    setExpandedItems(allItemsWithChildren);
  }, [hierarchyItems]);
  
  const collapseAll = useCallback(() => {
    setExpandedItems(new Set());
  }, []);
  
  // Utilitaires
  const getItemLevel = useCallback((itemId: string): number => {
    const findItem = (items: HierarchyItem[]): HierarchyItem | null => {
      for (const item of items) {
        if (item.id === itemId) return item;
        if (item.children) {
          const found = findItem(item.children);
          if (found) return found;
        }
      }
      return null;
    };
    
    const item = findItem(hierarchyItems);
    return item?.level || 0;
  }, [hierarchyItems]);
  
  const hasChildren = useCallback((itemId: string): boolean => {
    const findItem = (items: HierarchyItem[]): HierarchyItem | null => {
      for (const item of items) {
        if (item.id === itemId) return item;
        if (item.children) {
          const found = findItem(item.children);
          if (found) return found;
        }
      }
      return null;
    };
    
    const item = findItem(hierarchyItems);
    return item?.hasChildren || false;
  }, [hierarchyItems]);
  
  const getChildrenCount = useCallback((itemId: string, includeNested: boolean = false): number => {
    const findItem = (items: HierarchyItem[]): HierarchyItem | null => {
      for (const item of items) {
        if (item.id === itemId) return item;
        if (item.children) {
          const found = findItem(item.children);
          if (found) return found;
        }
      }
      return null;
    };
    
    const item = findItem(hierarchyItems);
    if (!item || !item.children) return 0;
    
    if (!includeNested) {
      return item.children.length;
    }
    
    // Compter récursivement tous les descendants
    const countDescendants = (items: HierarchyItem[]): number => {
      let count = items.length;
      items.forEach(child => {
        if (child.children) {
          count += countDescendants(child.children);
        }
      });
      return count;
    };
    
    return countDescendants(item.children);
  }, [hierarchyItems]);
  
  // Statistiques
  const totalItems = ganttItems.length;
  const visibleItemsCount = visibleItems.length;
  const expandedItemsCount = expandedItems.size;
  
  return {
    // État
    expandedItems,
    toggleExpanded,
    isExpanded,
    expandAll,
    collapseAll,
    
    // Structure
    hierarchyItems,
    visibleItems,
    
    // Utilitaires
    getItemLevel,
    hasChildren,
    getChildrenCount,
    
    // Statistiques
    totalItems,
    visibleItemsCount,
    expandedItemsCount
  };
}