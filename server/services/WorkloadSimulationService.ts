/**
 * WorkloadSimulationService
 * Service de simulation de charge globale (BE + terrain)
 * 
 * Fonctionnalités :
 * - Simuler charge future
 * - Détecter goulots d'étranglement
 * - Projeter charge par semaine/mois
 */

import { withErrorHandling } from './utils/error-handler';
import { AppError, NotFoundError, ValidationError } from './utils/error-handler';
import type { IStorage } from '../storage-poc';
import { logger } from '../utils/logger';
import type { TimeTracking } from '@shared/schema';

export interface WorkloadSimulation {
  period: {
    start: Date;
    end: Date;
  };
  beWorkload: {
    userId: string;
    userName: string;
    plannedHours: number;
    actualHours: number;
    availableHours: number;
    utilization: number; // Pourcentage
  }[];
  fieldWorkload: {
    week: string; // YYYY-WW
    plannedHours: number;
    actualHours: number;
    availableHours: number;
    utilization: number;
  }[];
  bottlenecks: {
    type: 'be' | 'field';
    userId?: string;
    week?: string;
    severity: 'warning' | 'critical';
    message: string;
  }[];
}

export class WorkloadSimulationService {
  constructor(private storage: IStorage) {}

  /**
   * Simule la charge globale pour une période
   */
  async simulateCharge(startDate: Date, endDate: Date): Promise<WorkloadSimulation> {
    return withErrorHandling(
      async () => {
        // Récupérer charge BE
        const beWorkload = await this.storage.getBeWorkload();
        
        // Récupérer temps terrain
        const fieldTime = await this.storage.getTimeTracking({
          dateFrom: startDate,
          dateTo: endDate,
          taskType: 'terrain'
        });

        // Calculer charge BE par utilisateur
        const beByUser = beWorkload.map(w => {
          const planned = Number(w.plannedHours || 35);
          const actual = Number(w.actualHours || 0);
          const available = planned - actual;
          const utilization = planned > 0 ? (actual / planned) * 100 : 0;

          return {
                userId: w.userId,
            userName: '', // TODO: Récupérer nom utilisateur
            plannedHours: planned,
            actualHours: actual,
            availableHours: available,
            utilization
          };
        });

        // Calculer charge terrain par semaine
        const fieldByWeek = new Map<string, { planned: number; actual: number }>();
        
        for (const entry of fieldTime) {
          const week = this.getWeekKey(entry.date);
          const hours = Number(entry.hours);
          
          if (!fieldByWeek.has(week)) {
            fieldByWeek.set(week, { planned: 0, actual: hours });
          } else {
            const current = fieldByWeek.get(week)!;
            current.actual += hours;
          }

        const fieldWorkload = Array.from(fieldByWeek.entries()).map(([week, data]) => {
          const available = 40 - data.actual; // 40h/semaine standard
          const utilization = (data.actual / 40) * 100;

          return {
            week,
            plannedHours: data.planned,
            actualHours: data.actual,
            availableHours: available,
            utilization
          };
        });

        // Détecter goulots
        const bottlenecks = this.detectBottlenecks(beByUser, fieldWorkload);

        return {
          period: { start: startDate, end: endDate },
          beWorkload: beByUser,
          fieldWorkload,
          bottlenecks
        };
      },
      {
        service: 'WorkloadSimulationService',
        operation: 'simulateCharge'
      }
    );
  }

  /**
   * Détecte les goulots d'étranglement
   */
  private detectBottlenecks(
    beWorkload: WorkloadSimulation['beWorkload'],
    fieldWorkload: WorkloadSimulation['fieldWorkload']
  ): WorkloadSimulation['bottlenecks'] {
    const bottlenecks: WorkloadSimulation['bottlenecks'] = [];

    // Goulots BE (utilisation > 90%)
    for (const be of beWorkload) {
      if (be.utilization > 90) {
        bottlenecks.push({
          type: 'be',
          userId: be.userId,
          severity: be.utilization > 100 ? 'critical' : 'warning',
          message: `BE ${be.userName}: utilisation à ${be.utilization.toFixed(1)}%`
        });
      }

    // Goulots terrain (utilisation > 90%)
    for (const field of fieldWorkload) {
      if (field.utilization > 90) {
        bottlenecks.push({
          type: 'field',
          week: field.week,
          severity: field.utilization > 100 ? 'critical' : 'warning',
          message: `Terrain semaine ${field.week}: utilisation à ${field.utilization.toFixed(1)}%`
        });
      }

    return bottlenecks;
  }

  /**
   * Génère une clé semaine (YYYY-WW)
   */
  private getWeekKey(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    const year = d.getFullYear();
    const week = this.getWeekNumber(d);
    return `${year}-${String(week).padStart(2, '0')}`;
  }

  /**
   * Calcule le numéro de semaine
   */
  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }

// Export singleton instance
import { storage } from '../storage-poc';

export const workloadSimulationService = new WorkloadSimulationService(storage);

