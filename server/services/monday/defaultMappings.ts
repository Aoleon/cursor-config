import type { MondaySplitterConfig } from './types';
import * as fs from 'fs';
import * as path from 'path';

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
      { mondayColumnId: 'project_budget', saxiumField: 'estimatedAmount', type: 'numbers' },
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

/**
 * Fonction pour obtenir la config d'un board
 * 1. Cherche un fichier JSON dans boardConfigs/{boardId}.json
 * 2. Sinon utilise la config hardcodée (Modèle MEXT)
 * 3. Sinon retourne null
 */
export function getBoardConfig(boardId: string): MondaySplitterConfig | null {
  // 1. Essayer de charger depuis fichier JSON
  try {
    const configPath = path.join(__dirname, 'boardConfigs', `ao-planning-${boardId}.json`);
    if (fs.existsSync(configPath)) {
      const configData = fs.readFileSync(configPath, 'utf-8');
      const config = JSON.parse(configData) as MondaySplitterConfig;
      return config;
    }
  } catch (error: any) {
    console.warn(`Failed to load board config from file for ${boardId}:`, error.message);
  }
  
  // 2. Fallback vers config hardcodée
  if (boardId === '8952933832') {
    return MODELE_MEXT_CONFIG;
  }
  
  // 3. Aucune config trouvée
  return null;
}
