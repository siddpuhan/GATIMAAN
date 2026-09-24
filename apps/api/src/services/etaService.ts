import { DemandLevel } from '@gatimaan/shared';
import { prisma } from '../db/client.js';

export interface TicketEtaResult {
  aheadCount: number;
  activeCountersCount: number;
  effectiveDurationSeconds: number;
  estimatedWaitSeconds: number;
  demandLevel: DemandLevel;
}

export interface ServiceEtaResult {
  serviceId: string;
  waitingCount: number;
  activeCountersCount: number;
  effectiveDurationSeconds: number;
  estimatedWaitSeconds: number;
  demandLevel: DemandLevel;
}

export class EtaService {
  /**
   * Maps estimated wait time in seconds to canonical DemandLevel.
   * - LOW: <= 10 min (600s)
   * - MEDIUM: > 10 min (600s) and <= 25 min (1500s)
   * - HIGH: > 25 min (1500s) and <= 45 min (2700s)
   * - SURGE: > 45 min (2700s)
   */
  determineDemandLevel(estimatedWaitSeconds: number | null | undefined): DemandLevel {
    if (estimatedWaitSeconds === null || estimatedWaitSeconds === undefined || estimatedWaitSeconds <= 600) {
      return DemandLevel.LOW;
    }
    if (estimatedWaitSeconds <= 1500) {
      return DemandLevel.MEDIUM;
    }
    if (estimatedWaitSeconds <= 2700) {
      return DemandLevel.HIGH;
    }
    return DemandLevel.SURGE;
  }

  /**
   * Calculates the rolling average service duration from recently completed tickets today.
   */
  async getRecentServiceDuration(
    serviceId: string,
    limit = 10
  ): Promise<{ recentAvgSeconds: number | null; sampleCount: number }> {
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);

    const recentCompleted = await prisma.ticket.findMany({
      where: {
        serviceId,
        status: 'COMPLETED',
        servedAt: { not: null },
        completedAt: { not: null, gte: startOfDay },
      },
      select: {
        servedAt: true,
        completedAt: true,
      },
      orderBy: { completedAt: 'desc' },
      take: limit,
    });

    if (recentCompleted.length === 0) {
      return { recentAvgSeconds: null, sampleCount: 0 };
    }

    const durations = recentCompleted
      .map((t) => {
        if (!t.servedAt || !t.completedAt) return 0;
        const diffMs = new Date(t.completedAt).getTime() - new Date(t.servedAt).getTime();
        return Math.max(0, diffMs / 1000);
      })
      .filter((d) => d > 0);

    if (durations.length === 0) {
      return { recentAvgSeconds: null, sampleCount: 0 };
    }

    const totalSeconds = durations.reduce((sum, d) => sum + d, 0);
    const avg = Math.round(totalSeconds / durations.length);

    return {
      recentAvgSeconds: avg,
      sampleCount: durations.length,
    };
  }

  /**
   * Computes effective service duration in seconds:
   * - If >= 3 completed samples exist today: 70% recent avg + 30% baseline
   * - Otherwise: 100% configured service baseline
   */
  calculateEffectiveDuration(
    baselineMinutes: number,
    recentAvgSeconds: number | null,
    sampleCount: number
  ): number {
    const baselineSeconds = Math.max(1, baselineMinutes) * 60;

    if (sampleCount >= 3 && recentAvgSeconds !== null && recentAvgSeconds > 0) {
      return Math.round(0.7 * recentAvgSeconds + 0.3 * baselineSeconds);
    }

    return baselineSeconds;
  }

  /**
   * Calculates remaining workload across tickets currently in SERVING state.
   */
  calculateServingWorkload(
    servingTickets: Array<{ servedAt: Date | string | null }>,
    effectiveDurationSeconds: number,
    now: Date = new Date()
  ): number {
    let totalRemaining = 0;

    for (const t of servingTickets) {
      if (!t.servedAt) continue;
      const elapsedSeconds = Math.max(0, (now.getTime() - new Date(t.servedAt).getTime()) / 1000);
      const remaining = Math.max(0, effectiveDurationSeconds - elapsedSeconds);
      totalRemaining += remaining;
    }

    return Math.round(totalRemaining);
  }

  /**
   * Pure deterministic ETA calculation formula.
   */
  computeEstimatedWaitSeconds(params: {
    aheadCount: number;
    activeCountersCount: number;
    effectiveDurationSeconds: number;
    servingTicketsCount: number;
    servingWorkloadSeconds: number;
  }): number {
    const {
      aheadCount,
      activeCountersCount,
      effectiveDurationSeconds,
      servingTicketsCount,
      servingWorkloadSeconds,
    } = params;

    const activeCounters = Math.max(1, activeCountersCount);

    // If no tickets ahead and an active counter is free (not serving), ETA is 0 (Immediate / Next)
    if (aheadCount === 0 && activeCountersCount > 0 && servingTicketsCount < activeCountersCount) {
      return 0;
    }

    const waitingWorkload = aheadCount * effectiveDurationSeconds;
    const totalWorkload = waitingWorkload + servingWorkloadSeconds;

    return Math.max(0, Math.round(totalWorkload / activeCounters));
  }

  /**
   * Calculates dynamic ETA for a specific ticket.
   */
  async calculateTicketEta(params: {
    ticketId?: string;
    serviceId: string;
    priority: number;
    createdAt: Date;
    aheadCount?: number;
  }): Promise<TicketEtaResult> {
    const { serviceId, priority, createdAt } = params;

    // 1. Fetch service baseline duration
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      select: { avgDurationMinutes: true },
    });
    const baselineMinutes = service?.avgDurationMinutes || 15;

    // 2. Fetch active counters count and currently serving tickets for this service
    const [activeCountersCount, servingTickets, recentStats] = await Promise.all([
      prisma.counterSession.count({
        where: {
          isActive: true,
          endedAt: null,
        },
      }),
      prisma.ticket.findMany({
        where: {
          serviceId,
          status: 'SERVING',
        },
        select: {
          servedAt: true,
        },
      }),
      this.getRecentServiceDuration(serviceId),
    ]);

    // 3. Compute aheadCount if not provided
    let aheadCount = params.aheadCount;
    if (aheadCount === undefined) {
      aheadCount = await prisma.ticket.count({
        where: {
          serviceId,
          status: 'WAITING',
          OR: [
            { priority: { gt: priority } },
            {
              priority,
              createdAt: { lt: createdAt },
            },
          ],
        },
      });
    }

    // 4. Determine effective duration
    const effectiveDurationSeconds = this.calculateEffectiveDuration(
      baselineMinutes,
      recentStats.recentAvgSeconds,
      recentStats.sampleCount
    );

    // 5. Compute serving workload
    const servingWorkloadSeconds = this.calculateServingWorkload(
      servingTickets,
      effectiveDurationSeconds
    );

    // 6. Compute total estimated wait seconds
    const estimatedWaitSeconds = this.computeEstimatedWaitSeconds({
      aheadCount,
      activeCountersCount,
      effectiveDurationSeconds,
      servingTicketsCount: servingTickets.length,
      servingWorkloadSeconds,
    });

    const demandLevel = this.determineDemandLevel(estimatedWaitSeconds);

    return {
      aheadCount,
      activeCountersCount,
      effectiveDurationSeconds,
      estimatedWaitSeconds,
      demandLevel,
    };
  }

  /**
   * Calculates dynamic ETA for the overall service queue (used for newly joining tickets and queue broadcast).
   */
  async calculateServiceEta(serviceId: string): Promise<ServiceEtaResult> {
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      select: { avgDurationMinutes: true },
    });
    const baselineMinutes = service?.avgDurationMinutes || 15;

    const [waitingCount, activeCountersCount, servingTickets, recentStats] = await Promise.all([
      prisma.ticket.count({
        where: {
          serviceId,
          status: 'WAITING',
        },
      }),
      prisma.counterSession.count({
        where: {
          isActive: true,
          endedAt: null,
        },
      }),
      prisma.ticket.findMany({
        where: {
          serviceId,
          status: 'SERVING',
        },
        select: {
          servedAt: true,
        },
      }),
      this.getRecentServiceDuration(serviceId),
    ]);

    const effectiveDurationSeconds = this.calculateEffectiveDuration(
      baselineMinutes,
      recentStats.recentAvgSeconds,
      recentStats.sampleCount
    );

    const servingWorkloadSeconds = this.calculateServingWorkload(
      servingTickets,
      effectiveDurationSeconds
    );

    const estimatedWaitSeconds = this.computeEstimatedWaitSeconds({
      aheadCount: waitingCount,
      activeCountersCount,
      effectiveDurationSeconds,
      servingTicketsCount: servingTickets.length,
      servingWorkloadSeconds,
    });

    const demandLevel = this.determineDemandLevel(estimatedWaitSeconds);

    return {
      serviceId,
      waitingCount,
      activeCountersCount,
      effectiveDurationSeconds,
      estimatedWaitSeconds,
      demandLevel,
    };
  }
}

export const etaService = new EtaService();
