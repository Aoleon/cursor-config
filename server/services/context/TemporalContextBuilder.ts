/**
 * TEMPORAL CONTEXT BUILDER - Temporal Context Construction
 * 
 * Extracted from BusinessContextService to reduce file size.
 * Handles temporal context building (seasonality, BTP constraints).
 * 
 * Target LOC: ~150-200
 */

import { logger } from '../../utils/logger';

// Calendrier BTP français 2025
const BTP_CALENDAR_2025 = {
  holidays: [
    { start: "2025-07-01", end: "2025-08-31", impact: "Ralentissement général chantiers" },
    { start: "2025-12-20", end: "2025-01-06", impact: "Arrêt quasi-total activité" }
  ],
  peak_seasons: [
    { months: [3, 4, 5], demand_factor: 1.3, lead_time_factor: 1.2 },
    { months: [9, 10, 11], demand_factor: 1.4, lead_time_factor: 1.3 }
  ],
  weather_constraints: [
    { months: [11, 12, 1, 2], affected_phases: ["chantier"], impact_factor: 1.5 }
  ]
};

export interface TemporalContext {
  current_period: string;
  seasonality_factors: {
    is_peak_season: boolean;
    demand_factor?: number;
    lead_time_factor?: number;
  };
  weather_constraints: {
    affected_phases: string[];
    impact_factor?: number;
  };
  upcoming_holidays: Array<{
    start: string;
    end: string;
    impact: string;
  }>;
  btp_calendar_notes: string[];
}

export class TemporalContextBuilder {
  /**
   * Construit le contexte temporel
   */
  buildTemporalContext(): TemporalContext {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    // Déterminer la période actuelle
    let currentPeriod = 'normal';
    if (month >= 3 && month <= 5) {
      currentPeriod = 'haute_saison_printemps';
    } else if (month >= 9 && month <= 11) {
      currentPeriod = 'haute_saison_automne';
    } else if (month >= 7 && month <= 8) {
      currentPeriod = 'conges_ete';
    } else if (month === 12 || month === 1) {
      currentPeriod = 'conges_hiver';
    }

    // Facteurs de saisonnalité
    const peakSeason = BTP_CALENDAR_2025.peak_seasons.find(ps => ps.months.includes(month));
    const isPeakSeason = !!peakSeason;

    // Contraintes météorologiques
    const weatherConstraint = BTP_CALENDAR_2025.weather_constraints.find(wc => wc.months.includes(month));

    // Vacances à venir
    const upcomingHolidays = BTP_CALENDAR_2025.holidays.filter(h => {
      const holidayStart = new Date(h.start);
      const holidayEnd = new Date(h.end);
      return holidayStart >= now || (holidayStart <= now && holidayEnd >= now);
    });

    // Notes calendrier BTP
    const btpNotes: string[] = [];
    if (isPeakSeason && peakSeason) {
      btpNotes.push(`Haute saison: demande multipliée par ${peakSeason.demand_factor}, délais allongés de ${((peakSeason.lead_time_factor - 1) * 100).toFixed(0)}%`);
    }
    if (weatherConstraint) {
      btpNotes.push(`Contraintes météo: phases ${weatherConstraint.affected_phases.join(', ')} impactées (facteur ${weatherConstraint.impact_factor})`);
    }
    if (upcomingHolidays.length > 0) {
      btpNotes.push(`Vacances à venir: ${upcomingHolidays.map(h => `${h.start} - ${h.end}`).join(', ')}`);
    }

    return {
      current_period: currentPeriod,
      seasonality_factors: {
        is_peak_season: isPeakSeason,
        demand_factor: peakSeason?.demand_factor,
        lead_time_factor: peakSeason?.lead_time_factor
      },
      weather_constraints: {
        affected_phases: weatherConstraint?.affected_phases || [],
        impact_factor: weatherConstraint?.impact_factor
      },
      upcoming_holidays: upcomingHolidays,
      btp_calendar_notes: btpNotes
    };
  }
}

