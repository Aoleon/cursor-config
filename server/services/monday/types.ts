import type { MondayItem } from '../MondayService';

// Configuration de mapping Monday → Saxium
export interface MondayColumnMapping {
  mondayColumnId: string;
  saxiumField: string;
  type: 'text' | 'number' | 'date' | 'people' | 'location' | 'subitems' | 'long-text';
  required?: boolean;
  defaultValue?: any;
}

export interface MondaySplitterConfig {
  boardId: string;
  boardName: string;
  targetEntity: 'ao' | 'project';
  mappings: {
    base: MondayColumnMapping[];
    lots?: MondayColumnMapping[];
    contacts?: MondayColumnMapping[];
    masterEntities?: MondayColumnMapping[];
    address?: MondayColumnMapping[];
  };
}

// Contexte d'exécution du splitter
export interface SplitterContext {
  mondayItem: MondayItem;
  config: MondaySplitterConfig;
  extractedData: {
    baseAO?: any;
    lots?: any[];
    contacts?: any[];
    maitresOuvrage?: any[];
    maitresOeuvre?: any[];
    addresses?: any[];
  };
  diagnostics: SplitterDiagnostic[];
}

export interface SplitterDiagnostic {
  level: 'info' | 'warning' | 'error';
  extractor: string;
  message: string;
  data?: any;
}

// Résultat de l'éclatement
export interface SplitResult {
  success: boolean;
  aoId?: string;
  projectId?: string;
  lotsCreated: number;
  contactsCreated: number;
  mastersCreated: number;
  diagnostics: SplitterDiagnostic[];
}
