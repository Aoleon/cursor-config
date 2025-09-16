import type { User } from "@shared/schema";

// Type unifié pour tous les éléments Gantt basé sur les types du schema
export interface GanttItem {
  id: string;
  name: string;
  type: 'project' | 'milestone' | 'task';
  startDate: Date | undefined;
  endDate: Date | undefined;
  status: string;
  responsibleUserId?: string | null;
  responsibleUser?: User;
  progress?: number;
  isJalon?: boolean | null;
  projectId?: string;
  parentTaskId?: string; // Ajout pour la hiérarchie des tâches
  dependencies?: string[];
  priority?: 'tres_faible' | 'faible' | 'normale' | 'elevee' | 'critique';
  estimatedHours?: number | string | null;
  actualHours?: number | string | null;
  hasValidDates?: boolean; // Flag pour indiquer si l'élément a des dates valides pour le rendu des barres
}

export type ViewMode = 'week' | 'month';
export type ResizeHandle = 'start' | 'end' | null;

export interface PeriodInfo {
  periodStart: Date;
  periodEnd: Date;
  periodDays: Date[];
  totalDays: number;
  monthWeeksCount: number;
}