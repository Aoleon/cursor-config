import type { User } from "@shared/schema";

// Type unifié pour tous les éléments Gantt basé sur les types du schema
export interface GanttItem {
  id: string;
  name: string;
  type: 'project' | 'milestone' | 'task';
  startDate: Date;
  endDate: Date;
  status: string;
  responsibleUserId?: string | null;
  responsibleUser?: User;
  progress?: number;
  isJalon?: boolean | null;
  projectId?: string;
  dependencies?: string[];
  priority?: 'tres_faible' | 'faible' | 'normale' | 'elevee' | 'critique';
  estimatedHours?: number | string | null;
  actualHours?: number | string | null;
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