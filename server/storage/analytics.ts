import { eq, and, sql, gte, lte, count, sum, avg } from "drizzle-orm";
import { 
  projects, offers, aos, projectTimelines, users
} from "@shared/schema";
import { db } from "../db";
import { logger } from "../utils/logger";

// ========================================
// TYPES POUR LES RETOURS D'ANALYTICS
// ========================================

export interface ProjectStats {
  totalCount: number;
  byStatus: Record<string, { count: number; totalBudget: number; avgBudget: number }>;
  totalBudget: number;
  avgBudget: number;
}

export interface OfferStats {
  totalCount: number;
  byStatus: Record<string, { count: number; totalAmount: number; avgAmount: number }>;
  totalAmount: number;
  avgAmount: number;
}

export interface AOStats {
  totalCount: number;
  byDepartement: Record<string, number>;
}

export interface ConversionStats {
  aoToOffer: {
    totalAOs: number;
    totalOffersCreated: number;
    conversionRate: number;
    byUser?: Record<string, { aos: number; offers: number; rate: number }>;
  };
  offerToProject: {
    totalOffers: number;
    totalSignedOffers: number;
    conversionRate: number;
    byUser?: Record<string, { offers: number; signed: number; rate: number }>;
  };
}

export interface ProjectDelayStats {
  avgDelayDays: number;
  medianDelayDays: number;
  totalDelayed: number;
  criticalDelayed: number;
  byPhase: Record<string, { count: number; avgDelay: number }>;
}

export interface TeamPerformanceStats {
  userId: string;
  userName: string;
  projectCount: number;
  avgDelayDays: number;
  onTimeCount: number;
  onTimeRate: number;
}

// ========================================
// CLASSE ANALYTICSSSTORAGE - 6 MÉTHODES SQL
// ========================================

export class AnalyticsStorage {
  
  /**
   * Méthode 1/6: Statistiques des projets avec agrégations SQL
   */
  async getProjectStats(filters?: {
    dateFrom?: string;
    dateTo?: string;
    status?: string;
    responsibleUserId?: string;
    departement?: string;
  }): Promise<ProjectStats> {
    try {
      logger.debug('[AnalyticsStorage] getProjectStats - SQL aggregation', { metadata: { filters } });

      // Build WHERE conditions
      const conditions: any[] = [];
      if (filters?.dateFrom) {
        conditions.push(gte(projects.createdAt, new Date(filters.dateFrom)));
      }
      if (filters?.dateTo) {
        conditions.push(lte(projects.createdAt, new Date(filters.dateTo)));
      }
      if (filters?.status) {
        conditions.push(eq(projects.status, filters.status as any));
      }
      if (filters?.responsibleUserId) {
        conditions.push(eq(projects.responsibleUserId, filters.responsibleUserId));
      }
      if (filters?.departement) {
        conditions.push(eq(projects.departement, filters.departement as any));
      }

      // Query 1: Overall stats
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      const [overallStats] = await db
        .select({
          totalCount: count(),
          totalBudget: sum(projects.budget),
          avgBudget: avg(projects.budget)
        })
        .from(projects)
        .where(whereClause);

      // Query 2: Stats by status
      const statusStats = await db
        .select({
          status: projects.status,
          count: count(),
          totalBudget: sum(projects.budget),
          avgBudget: avg(projects.budget)
        })
        .from(projects)
        .where(whereClause)
        .groupBy(projects.status);

      // Build result
      const byStatus: Record<string, { count: number; totalBudget: number; avgBudget: number }> = {};
      for (const stat of statusStats) {
        if (stat.status) {
          byStatus[stat.status] = {
            count: Number(stat.count),
            totalBudget: Number(stat.totalBudget || 0),
            avgBudget: Number(stat.avgBudget || 0)
          };
        }
      }

      return {
        totalCount: Number(overallStats?.totalCount || 0),
        byStatus,
        totalBudget: Number(overallStats?.totalBudget || 0),
        avgBudget: Number(overallStats?.avgBudget || 0)
      };
    } catch (error) {
      logger.error('Error in getProjectStats', { metadata: { error } });
      throw error;
    }
  }

  /**
   * Méthode 2/6: Statistiques des offres avec agrégations SQL
   */
  async getOfferStats(filters?: {
    dateFrom?: string;
    dateTo?: string;
    status?: string;
    responsibleUserId?: string;
    departement?: string;
  }): Promise<OfferStats> {
    try {
      logger.debug('[AnalyticsStorage] getOfferStats - SQL aggregation', { metadata: { filters } });

      // Build WHERE conditions
      const conditions: any[] = [];
      if (filters?.dateFrom) {
        conditions.push(gte(offers.createdAt, new Date(filters.dateFrom)));
      }
      if (filters?.dateTo) {
        conditions.push(lte(offers.createdAt, new Date(filters.dateTo)));
      }
      if (filters?.status) {
        conditions.push(eq(offers.status, filters.status as any));
      }
      if (filters?.responsibleUserId) {
        conditions.push(eq(offers.responsibleUserId, filters.responsibleUserId));
      }
      if (filters?.departement) {
        conditions.push(eq(offers.departement, filters.departement));
      }

      // Query 1: Overall stats
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      const [overallStats] = await db
        .select({
          totalCount: count(),
          totalAmount: sum(offers.montantFinal),
          avgAmount: avg(offers.montantFinal)
        })
        .from(offers)
        .where(whereClause);

      // Query 2: Stats by status
      const statusStats = await db
        .select({
          status: offers.status,
          count: count(),
          totalAmount: sum(offers.montantFinal),
          avgAmount: avg(offers.montantFinal)
        })
        .from(offers)
        .where(whereClause)
        .groupBy(offers.status);

      // Build result
      const byStatus: Record<string, { count: number; totalAmount: number; avgAmount: number }> = {};
      for (const stat of statusStats) {
        if (stat.status) {
          byStatus[stat.status] = {
            count: Number(stat.count),
            totalAmount: Number(stat.totalAmount || 0),
            avgAmount: Number(stat.avgAmount || 0)
          };
        }
      }

      return {
        totalCount: Number(overallStats?.totalCount || 0),
        byStatus,
        totalAmount: Number(overallStats?.totalAmount || 0),
        avgAmount: Number(overallStats?.avgAmount || 0)
      };
    } catch (error) {
      logger.error('Error in getOfferStats', { metadata: { error } });
      throw error;
    }
  }

  /**
   * Méthode 3/6: Statistiques des AOs avec agrégations SQL
   */
  async getAOStats(filters?: {
    dateFrom?: string;
    dateTo?: string;
    departement?: string;
  }): Promise<AOStats> {
    try {
      logger.debug('[AnalyticsStorage] getAOStats - SQL aggregation', { metadata: { filters } });

      // Build WHERE conditions
      const conditions: any[] = [];
      if (filters?.dateFrom) {
        conditions.push(gte(aos.createdAt, new Date(filters.dateFrom)));
      }
      if (filters?.dateTo) {
        conditions.push(lte(aos.createdAt, new Date(filters.dateTo)));
      }
      if (filters?.departement) {
        conditions.push(eq(aos.departement, filters.departement as any));
      }

      // Query 1: Overall stats
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      const [overallStats] = await db
        .select({
          totalCount: count()
        })
        .from(aos)
        .where(whereClause);

      // Query 2: Stats by departement
      const deptStats = await db
        .select({
          departement: aos.departement,
          count: count()
        })
        .from(aos)
        .where(whereClause)
        .groupBy(aos.departement);

      // Build result
      const byDepartement: Record<string, number> = {};
      for (const stat of deptStats) {
        if (stat.departement) {
          byDepartement[stat.departement] = Number(stat.count);
        }
      }

      return {
        totalCount: Number(overallStats?.totalCount || 0),
        byDepartement
      };
    } catch (error) {
      logger.error('Error in getAOStats', { metadata: { error } });
      throw error;
    }
  }

  /**
   * Méthode 4/6: Statistiques de conversion avec agrégations SQL
   */
  async getConversionStats(period: {
    from: string;
    to: string;
  }, filters?: {
    userId?: string;
    departement?: string;
  }): Promise<ConversionStats> {
    try {
      logger.debug('[AnalyticsStorage] getConversionStats - SQL aggregation', { metadata: { period, filters } });

      const fromDate = new Date(period.from);
      const toDate = new Date(period.to);

      // Build WHERE conditions for AOs
      const aoConditions: any[] = [
        gte(aos.createdAt, fromDate),
        lte(aos.createdAt, toDate)
      ];
      if (filters?.departement) {
        aoConditions.push(eq(aos.departement, filters.departement as any));
      }

      // Build WHERE conditions for Offers
      const offerConditions: any[] = [
        gte(offers.createdAt, fromDate),
        lte(offers.createdAt, toDate)
      ];
      if (filters?.userId) {
        offerConditions.push(eq(offers.responsibleUserId, filters.userId));
      }
      if (filters?.departement) {
        offerConditions.push(eq(offers.departement, filters.departement));
      }

      // Query 1: AO to Offer conversion
      const [aoStats] = await db
        .select({
          totalAOs: count()
        })
        .from(aos)
        .where(and(...aoConditions));

      const [offerStats] = await db
        .select({
          totalOffers: count()
        })
        .from(offers)
        .where(and(...offerConditions));

      const totalAOs = Number(aoStats?.totalAOs || 0);
      const totalOffersCreated = Number(offerStats?.totalOffers || 0);
      const aoToOfferRate = totalAOs > 0 ? (totalOffersCreated / totalAOs) * 100 : 0;

      // Query 2: Offer to Project conversion
      const [signedOfferStats] = await db
        .select({
          totalSigned: count()
        })
        .from(offers)
        .where(and(...offerConditions, eq(offers.status, 'signe')));

      const totalSignedOffers = Number(signedOfferStats?.totalSigned || 0);
      const offerToProjectRate = totalOffersCreated > 0 ? (totalSignedOffers / totalOffersCreated) * 100 : 0;

      // Query 3: By user stats (if needed)
      let aoToOfferByUser: Record<string, { aos: number; offers: number; rate: number }> = {};
      let offerToProjectByUser: Record<string, { offers: number; signed: number; rate: number }> = {};

      if (filters?.userId || !filters) {
        // Offer stats by user
        const offersByUser = await db
          .select({
            userId: offers.responsibleUserId,
            totalOffers: count(),
            totalSigned: sum(sql`CASE WHEN ${offers.status} = 'signe' THEN 1 ELSE 0 END`)
          })
          .from(offers)
          .where(and(...offerConditions))
          .groupBy(offers.responsibleUserId);

        for (const stat of offersByUser) {
          if (stat.userId) {
            const offersCount = Number(stat.totalOffers);
            const signedCount = Number(stat.totalSigned || 0);
            offerToProjectByUser[stat.userId] = {
              offers: offersCount,
              signed: signedCount,
              rate: offersCount > 0 ? (signedCount / offersCount) * 100 : 0
            };
          }
        }
      }

      return {
        aoToOffer: {
          totalAOs,
          totalOffersCreated,
          conversionRate: aoToOfferRate,
          byUser: Object.keys(aoToOfferByUser).length > 0 ? aoToOfferByUser : undefined
        },
        offerToProject: {
          totalOffers: totalOffersCreated,
          totalSignedOffers,
          conversionRate: offerToProjectRate,
          byUser: Object.keys(offerToProjectByUser).length > 0 ? offerToProjectByUser : undefined
        }
      };
    } catch (error) {
      logger.error('Error in getConversionStats', { metadata: { error } });
      throw error;
    }
  }

  /**
   * Méthode 5/6: Statistiques de délais des projets avec agrégations SQL
   */
  async getProjectDelayStats(period: {
    from: string;
    to: string;
  }): Promise<ProjectDelayStats> {
    try {
      logger.debug('[AnalyticsStorage] getProjectDelayStats - SQL aggregation', { metadata: { period } });

      const fromDate = new Date(period.from);
      const toDate = new Date(period.to);

      // Query timelines with delay calculations
      const timelinesWithDelays = await db
        .select({
          phase: projectTimelines.phase,
          delayDays: sql<number>`CAST(EXTRACT(EPOCH FROM (${projectTimelines.actualEndDate} - ${projectTimelines.plannedEndDate})) / 86400 AS INTEGER)`
        })
        .from(projectTimelines)
        .where(
          and(
            gte(projectTimelines.plannedStartDate, fromDate),
            lte(projectTimelines.plannedStartDate, toDate),
            sql`${projectTimelines.plannedEndDate} IS NOT NULL`,
            sql`${projectTimelines.actualEndDate} IS NOT NULL`
          )
        );

      if (timelinesWithDelays.length === 0) {
        return {
          avgDelayDays: 0,
          medianDelayDays: 0,
          totalDelayed: 0,
          criticalDelayed: 0,
          byPhase: {}
        };
      }

      // Calculate stats
      const delays = timelinesWithDelays.map(t => Math.max(0, Number(t.delayDays) || 0));
      const totalDelayed = delays.filter(d => d > 0).length;
      const criticalDelayed = delays.filter(d => d > 7).length;
      const avgDelayDays = delays.reduce((a, b) => a + b, 0) / delays.length;
      
      // Median calculation
      const sortedDelays = [...delays].sort((a, b) => a - b);
      const medianDelayDays = sortedDelays[Math.floor(sortedDelays.length / 2)];

      // By phase
      const byPhase: Record<string, { count: number; avgDelay: number }> = {};
      const phaseGroups: Record<string, number[]> = {};
      
      for (const timeline of timelinesWithDelays) {
        const delay = Math.max(0, Number(timeline.delayDays) || 0);
        if (!phaseGroups[timeline.phase]) {
          phaseGroups[timeline.phase] = [];
        }
        phaseGroups[timeline.phase].push(delay);
      }

      for (const [phase, phaseDelays] of Object.entries(phaseGroups)) {
        byPhase[phase] = {
          count: phaseDelays.length,
          avgDelay: phaseDelays.reduce((a, b) => a + b, 0) / phaseDelays.length
        };
      }

      return {
        avgDelayDays,
        medianDelayDays,
        totalDelayed,
        criticalDelayed,
        byPhase
      };
    } catch (error) {
      logger.error('Error in getProjectDelayStats', { metadata: { error } });
      throw error;
    }
  }

  /**
   * Méthode 6/6: Statistiques de performance des équipes avec agrégations SQL
   */
  async getTeamPerformanceStats(period: {
    from: string;
    to: string;
  }): Promise<TeamPerformanceStats[]> {
    try {
      logger.debug('[AnalyticsStorage] getTeamPerformanceStats - SQL aggregation', { metadata: { period } });

      const fromDate = new Date(period.from);
      const toDate = new Date(period.to);

      // Query projects with their delays and users
      const projectsWithDelays = await db
        .select({
          userId: projects.responsibleUserId,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          delayDays: sql<number>`CAST(COALESCE(EXTRACT(EPOCH FROM (${projectTimelines.actualEndDate} - ${projectTimelines.plannedEndDate})) / 86400, 0) AS INTEGER)`
        })
        .from(projects)
        .leftJoin(users, eq(projects.responsibleUserId, users.id))
        .leftJoin(projectTimelines, eq(projects.id, projectTimelines.projectId))
        .where(
          and(
            gte(projects.createdAt, fromDate),
            lte(projects.createdAt, toDate),
            sql`${projects.responsibleUserId} IS NOT NULL`
          )
        );

      // Group by user
      const userStats: Record<string, {
        userName: string;
        delays: number[];
        onTimeCount: number;
      }> = {};

      for (const project of projectsWithDelays) {
        if (!project.userId) continue;
        
        if (!userStats[project.userId]) {
          const userName = project.firstName && project.lastName 
            ? `${project.firstName} ${project.lastName}`
            : project.email || 'Unknown';
          
          userStats[project.userId] = {
            userName,
            delays: [],
            onTimeCount: 0
          };
        }

        const delay = Math.max(0, Number(project.delayDays) || 0);
        userStats[project.userId].delays.push(delay);
        
        if (delay <= 1) { // <= 1 day = on time
          userStats[project.userId].onTimeCount++;
        }
      }

      // Build result
      const results = Object.entries(userStats).map(([userId, stats]) => {
        const avgDelayDays = stats.delays.length > 0 
          ? stats.delays.reduce((a, b) => a + b, 0) / stats.delays.length 
          : 0;
        const onTimeRate = stats.delays.length > 0 
          ? (stats.onTimeCount / stats.delays.length) * 100 
          : 0;

        return {
          userId,
          userName: stats.userName,
          projectCount: stats.delays.length,
          avgDelayDays,
          onTimeCount: stats.onTimeCount,
          onTimeRate
        };
      });

      return results.sort((a, b) => b.onTimeRate - a.onTimeRate);
    } catch (error) {
      logger.error('Error in getTeamPerformanceStats', { metadata: { error } });
      throw error;
    }
  }
}

// Export singleton instance
export const analyticsStorage = new AnalyticsStorage();
