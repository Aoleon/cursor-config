import type { MondayItem } from '../MondayService';

// Configuration de mapping Monday → Saxium
export interface MondayColumnMapping {
  mondayColumnId: string;
  saxiumField: string;
  type: 'text' | 'numbers' | 'date' | 'people' | 'location' | 'subitems' | 'subtasks' | 'long-text' | 'status' | 'dropdown' | 'timeline';
  required?: boolean;
  defaultValue?: any;
  description?: string;
  enumMapping?: Record<string, string>; // Pour status/dropdown: mapping valeurs Monday → enum Saxium
  transform?: string; // Transformations spéciales: booleanFromStatus, arrayWrap
  trueValues?: string[]; // Pour booleanFromStatus: valeurs considérées comme true
}

export interface MondaySplitterConfig {
  boardId: string;
  boardName: string;
  targetEntity?: 'ao' | 'project';
  description?: string;
  mappings: {
    base: MondayColumnMapping[];
    lots?: MondayColumnMapping[];
    contacts?: MondayColumnMapping[];
    masterEntities?: MondayColumnMapping[];
    address?: MondayColumnMapping[];
    metadata?: MondayColumnMapping[];
  };
  extractors?: {
    aoBase?: {
      enabled?: boolean;
      priority?: number;
      defaultValues?: {
        source?: string;
        menuiserieType?: string;
        status?: string;
      };
    };
    lots?: {
      enabled?: boolean;
      priority?: number;
      extractFromSubitems?: boolean;
    };
    contacts?: {
      enabled?: boolean;
      priority?: number;
      extractFromPeople?: boolean;
    };
    masters?: {
      enabled?: boolean;
      priority?: number;
      extractMaitreOuvrage?: boolean;
      extractMaitreOeuvre?: boolean;
    };
  };
  transformations?: {
    location?: {
      extractCity?: boolean;
      extractDepartement?: boolean;
      fallbackToAddress?: boolean;
    };
    dates?: {
      timezone?: string;
      parseFormats?: string[];
    };
    numbers?: {
      decimalSeparator?: string;
      removeSpaces?: boolean;
    };
  };
  validation?: {
    requiredFields?: string[];
    markAsDraftIfMissing?: string[];
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
  aoCreated: boolean; // Indique si l'AO a été créé (true) ou réutilisé (false)
  lotsCreated: number;
  contactsCreated: number;
  mastersCreated: number;
  diagnostics: SplitterDiagnostic[];
}
