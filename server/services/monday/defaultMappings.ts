import type { MondaySplitterConfig } from './types';

// Configuration par défaut pour le board "Modèle MEXT"
export const MODELE_MEXT_CONFIG: MondaySplitterConfig = {
  boardId: '8952933832',
  boardName: 'Modèle MEXT',
  targetEntity: 'ao',
  mappings: {
    base: [
      { mondayColumnId: 'name', saxiumField: 'name', type: 'text', required: true },
      { mondayColumnId: 'project_owner', saxiumField: 'ownerIds', type: 'people' },
      { mondayColumnId: 'project_status', saxiumField: 'status', type: 'text' },
      { mondayColumnId: 'project_budget', saxiumField: 'estimatedAmount', type: 'number' },
      { mondayColumnId: 'project_timeline', saxiumField: 'timeline', type: 'date' },
    ],
    lots: [
      { mondayColumnId: 'subtasks_mkq3f7tc', saxiumField: 'lots', type: 'subitems' },
    ],
    contacts: [
      { mondayColumnId: 'project_owner', saxiumField: 'contacts', type: 'people' },
    ],
  },
};

// Fonction pour obtenir la config d'un board
export function getBoardConfig(boardId: string): MondaySplitterConfig | null {
  if (boardId === '8952933832') {
    return MODELE_MEXT_CONFIG;
  }
  
  // TODO: Charger depuis DB ou configuration externe
  return null;
}
