/**
 * Projects Module Type Definitions
 * 
 * This module contains all type definitions related to project management,
 * tasks, timelines, SAV (after-sales service), and project contacts.
 */

import type { z } from 'zod';
import type {
  insertProjectSchema,
  insertProjectTaskSchema,
  insertProjectTimelineSchema,
  insertVisaArchitecteSchema,
  insertProjectReserveSchema,
  insertSavInterventionSchema,
  insertSavWarrantyClaimSchema,
  insertProjectContactsSchema,
  Project,
  ProjectTask,
  ProjectTimeline,
  VisaArchitecte,
  ProjectReserve,
  SavIntervention,
  SavWarrantyClaim,
  ProjectContacts,
  projectStatusEnum
} from '@shared/schema';

// Request types
export type CreateProjectRequest = z.infer<typeof insertProjectSchema>;
export type UpdateProjectRequest = Partial<CreateProjectRequest>;

export type CreateProjectTaskRequest = z.infer<typeof insertProjectTaskSchema>;
export type UpdateProjectTaskRequest = Partial<CreateProjectTaskRequest>;

export type CreateProjectTimelineRequest = z.infer<typeof insertProjectTimelineSchema>;
export type UpdateProjectTimelineRequest = Partial<CreateProjectTimelineRequest>;

export type CreateVisaArchitecteRequest = z.infer<typeof insertVisaArchitecteSchema>;
export type UpdateVisaArchitecteRequest = Partial<CreateVisaArchitecteRequest>;

export type CreateProjectReserveRequest = z.infer<typeof insertProjectReserveSchema>;
export type UpdateProjectReserveRequest = Partial<CreateProjectReserveRequest>;

export type CreateSavInterventionRequest = z.infer<typeof insertSavInterventionSchema>;
export type UpdateSavInterventionRequest = Partial<CreateSavInterventionRequest>;

export type CreateSavWarrantyClaimRequest = z.infer<typeof insertSavWarrantyClaimSchema>;
export type UpdateSavWarrantyClaimRequest = Partial<CreateSavWarrantyClaimRequest>;

export type CreateProjectContactsRequest = z.infer<typeof insertProjectContactsSchema>;
export type UpdateProjectContactsRequest = Partial<CreateProjectContactsRequest>;

// Response types
export interface ProjectResponse extends Project {
  tasks?: ProjectTaskResponse[];
  timeline?: ProjectTimelineResponse;
  completionPercentage?: number;
  daysRemaining?: number;
  isDelayed?: boolean;
}

export interface ProjectTaskResponse extends ProjectTask {
  subtasks?: ProjectTaskResponse[];
  dependencies?: string[];
  progress?: number;
  assignedResources?: string[];
}

export interface ProjectTimelineResponse extends ProjectTimeline {
  phases?: ProjectPhase[];
  milestones?: ProjectMilestone[];
  criticalPath?: string[];
  totalDuration?: number;
}

export interface VisaArchitecteResponse extends VisaArchitecte {
  projectName?: string;
  architectName?: string;
  remainingDays?: number;
}

export interface ProjectReserveResponse extends ProjectReserve {
  projectName?: string;
  resolutionTime?: number;
  cost?: number;
}

export interface SavInterventionResponse extends SavIntervention {
  projectName?: string;
  technicianName?: string;
  duration?: number;
  cost?: number;
}

export interface SavWarrantyClaimResponse extends SavWarrantyClaim {
  projectName?: string;
  claimStatus?: string;
  resolutionDays?: number;
}

// Query parameter types
export interface ProjectQueryParams {
  status?: z.infer<typeof projectStatusEnum>;
  clientId?: string;
  search?: string;
  includeArchived?: boolean;
  sortBy?: 'date' | 'status' | 'client' | 'deadline';
  limit?: number;
  offset?: number;
}

export interface ProjectTaskQueryParams {
  status?: 'pending' | 'in_progress' | 'completed' | 'blocked';
  assignedTo?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  includeSubtasks?: boolean;
}

export interface SAVQueryParams {
  projectId?: string;
  status?: 'pending' | 'in_progress' | 'resolved' | 'closed';
  type?: 'reserve' | 'intervention' | 'warranty';
  dateFrom?: Date;
  dateTo?: Date;
}

// Service types
export interface ProjectPhase {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  status: 'not_started' | 'in_progress' | 'completed';
  progress: number;
  dependencies?: string[];
}

export interface ProjectMilestone {
  id: string;
  name: string;
  date: Date;
  status: 'pending' | 'achieved' | 'missed';
  description?: string;
  deliverables?: string[];
}

export interface ProjectStatistics {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  delayedProjects: number;
  averageCompletionTime: number;
  averageDelay: number;
  clientSatisfactionRate?: number;
}

export interface ResourceAllocation {
  projectId: string;
  resourceId: string;
  resourceName: string;
  allocation: number; // percentage
  startDate: Date;
  endDate: Date;
  role: string;
}

export interface ProjectRisk {
  id: string;
  projectId: string;
  description: string;
  probability: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  mitigation?: string;
  status: 'identified' | 'mitigated' | 'occurred';
}

// Timeline calculation types
export interface TimelineCalculationParams {
  projectId: string;
  startDate?: Date;
  includeWeekends?: boolean;
  includeHolidays?: boolean;
  bufferPercentage?: number;
}

export interface TimelineCalculationResult {
  phases: ProjectPhase[];
  milestones: ProjectMilestone[];
  totalDuration: number;
  estimatedEndDate: Date;
  criticalPath: string[];
  risks: ProjectRisk[];
}

// Gantt chart types
export interface GanttTask {
  id: string;
  name: string;
  start: Date;
  end: Date;
  progress: number;
  dependencies?: string[];
  resources?: string[];
  color?: string;
  children?: GanttTask[];
}

export interface GanttConfig {
  viewMode: 'day' | 'week' | 'month' | 'quarter' | 'year';
  showDependencies: boolean;
  showResources: boolean;
  showProgress: boolean;
  showMilestones: boolean;
}

// Project template types
export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  phases: ProjectPhase[];
  tasks: ProjectTask[];
  estimatedDuration: number;
  category: string;
}

// Validation types
export interface ProjectValidation {
  canProceedToPlanning: boolean;
  missingRequirements?: string[];
  warnings?: string[];
  readiness: number; // percentage
}