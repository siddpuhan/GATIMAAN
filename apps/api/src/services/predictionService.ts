import {
  DemandLevel,
  GetPredictionQueryInput,
  PredictionSnapshotDTO,
  PredictionSummaryDTO,
  RecalculatePredictionResponseDTO,
  REALTIME_EVENTS,
} from '@gatimaan/shared';
import { prisma } from '../db/client.js';
import { etaService } from './etaService.js';
import { eventBus } from '../events/eventBus.js';

export class PredictionService {
  /**
   * Deterministically forecasts the next operational hour's footfall arrival count using
   * historical footfall_snapshots with Exponential Moving Average (EMA) / weighted recency.
   *
   * @param serviceId - Optional specific service ID
   * @param targetDate - Reference date (defaults to current time)
   */
  async predictNextHourFootfall(serviceId?: string, targetDate = new Date()): Promise<number> {
    const targetHour = (targetDate.getUTCHours() + 1) % 24;
    const targetDayOfWeek = targetDate.getUTCDay();

    // 1. Fetch matching historical snapshots for (targetHour, targetDayOfWeek)
    const matchingDaySnapshots = await prisma.footfallSnapshot.findMany({
      where: {
        hourOfDay: targetHour,
        dayOfWeek: targetDayOfWeek,
      },
      orderBy: { timestamp: 'desc' },
      take: 8,
      select: { countIn: true },
    });

    // 2. Fetch general hour snapshots for targetHour across all days
    const generalHourSnapshots = await prisma.footfallSnapshot.findMany({
      where: {
        hourOfDay: targetHour,
      },
      orderBy: { timestamp: 'desc' },
      take: 12,
      select: { countIn: true },
    });

    // Case A: Sufficient matching day-of-week historical data (>= 3 samples)
    if (matchingDaySnapshots.length >= 3) {
      let weightedSum = 0;
      let totalWeight = 0;
      const alpha = 0.8;

      matchingDaySnapshots.forEach((snap, idx) => {
        const weight = Math.pow(alpha, idx);
        weightedSum += snap.countIn * weight;
        totalWeight += weight;
      });

      const weightedAvg = totalWeight > 0 ? weightedSum / totalWeight : matchingDaySnapshots[0].countIn;
      return Math.max(0, Math.round(weightedAvg));
    }

    // Case B: Sparse matching day (1-2 samples), blend with general hour average
    if (matchingDaySnapshots.length > 0 && generalHourSnapshots.length > 0) {
      const matchAvg =
        matchingDaySnapshots.reduce((acc, s) => acc + s.countIn, 0) / matchingDaySnapshots.length;
      const generalAvg =
        generalHourSnapshots.reduce((acc, s) => acc + s.countIn, 0) / generalHourSnapshots.length;

      // 60% matching day weight, 40% general hour weight
      const blended = 0.6 * matchAvg + 0.4 * generalAvg;
      return Math.max(0, Math.round(blended));
    }

    // Case C: General hour snapshots available without day-of-week match
    if (generalHourSnapshots.length > 0) {
      const generalAvg =
        generalHourSnapshots.reduce((acc, s) => acc + s.countIn, 0) / generalHourSnapshots.length;
      return Math.max(0, Math.round(generalAvg));
    }

    // Case D: Zero historical snapshots available (cold start / fresh DB)
    // Fall back to deterministic baseline heuristic based on operating hours (9 AM - 6 PM UTC+5:30)
    const localHour = (targetDate.getHours() + 1) % 24;
    const isPeakHour = (localHour >= 10 && localHour <= 13) || (localHour >= 15 && localHour <= 17);
    const baseline = isPeakHour ? 25 : 12;

    return baseline;
  }

  /**
   * Estimates forward-looking wait time in seconds combining live queue depth,
   * active counter capacities, effective service duration, and projected incoming footfall.
   */
  estimateProjectedWaitSeconds(params: {
    waitingCount: number;
    activeCountersCount: number;
    effectiveDurationSeconds: number;
    servingTicketsCount: number;
    servingWorkloadSeconds: number;
    forecastedFootfall: number;
  }): number {
    const {
      waitingCount,
      activeCountersCount,
      effectiveDurationSeconds,
      servingTicketsCount,
      servingWorkloadSeconds,
      forecastedFootfall,
    } = params;

    const activeCounters = Math.max(1, activeCountersCount);

    // If queue is empty, no one is serving, and counters are online -> wait time is 0
    if (waitingCount === 0 && servingTicketsCount === 0 && activeCountersCount > 0) {
      return 0;
    }

    const liveWaitingWorkload = waitingCount * effectiveDurationSeconds;
    const liveTotalWorkload = liveWaitingWorkload + servingWorkloadSeconds;

    // Projected arrival workload over the next hour (assuming arrival distribution across the hour)
    // Forecasted footfall represents total arrivals for the center; allocate proportional arrival workload
    const arrivalWorkload = forecastedFootfall * effectiveDurationSeconds * 0.35;
    const totalProjectedWorkload = liveTotalWorkload + arrivalWorkload;

    return Math.max(0, Math.round(totalProjectedWorkload / activeCounters));
  }

  /**
   * Maps estimated wait time in seconds to canonical DemandLevel.
   * - LOW: <= 600s (10 min)
   * - MEDIUM: > 600s and <= 1500s (25 min)
   * - HIGH: > 1500s and <= 2700s (45 min)
   * - SURGE: > 2700s (> 45 min)
   */
  determineDemandLevel(estimatedWaitSeconds: number | null | undefined): DemandLevel {
    return etaService.determineDemandLevel(estimatedWaitSeconds);
  }

  /**
   * Generates deterministic, explainable operational recommendations based on demand tier and queue load.
   */
  generateRecommendation(params: {
    serviceName: string;
    demandLevel: DemandLevel;
    waitingCount: number;
    activeCountersCount: number;
    forecastedFootfall: number;
  }): string {
    const { serviceName, demandLevel, waitingCount, activeCountersCount } = params;

    if (activeCountersCount === 0) {
      return `No active counters online for ${serviceName} — recommend opening at least 1 service counter.`;
    }

    switch (demandLevel) {
      case DemandLevel.LOW:
        return 'Normal operating capacity. Service queue is flowing smoothly.';

      case DemandLevel.MEDIUM:
        if (activeCountersCount <= 1 && waitingCount > 4) {
          return `Moderate demand for ${serviceName} (${waitingCount} waiting) — monitor queue progression.`;
        }
        return 'Moderate demand — current counter capacity is adequate.';

      case DemandLevel.HIGH:
        if (activeCountersCount <= 1) {
          return `High congestion detected for ${serviceName} (${waitingCount} waiting) — recommend opening 1 additional counter.`;
        }
        return `High demand for ${serviceName} — maintain active service throughput and prioritize verification desks.`;

      case DemandLevel.SURGE:
        return `Surge capacity threshold reached (${waitingCount} waiting in queue) — recommend immediate dynamic counter reallocation for ${serviceName}.`;

      default:
        return 'Normal operating capacity.';
    }
  }

  /**
   * Computes a full prediction summary for a specific service.
   */
  async computeServicePrediction(service: {
    id: string;
    name: string;
    code: string;
    avgDurationMinutes: number;
  }): Promise<PredictionSummaryDTO> {
    const serviceId = service.id;
    const now = new Date();

    // 1. Gather live queue state and active counters
    const [waitingCount, activeCountersCount, servingTickets, recentStats, forecastedFootfall] =
      await Promise.all([
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
        etaService.getRecentServiceDuration(serviceId),
        this.predictNextHourFootfall(serviceId, now),
      ]);

    // 2. Compute effective duration and workloads
    const effectiveDurationSeconds = etaService.calculateEffectiveDuration(
      service.avgDurationMinutes || 15,
      recentStats.recentAvgSeconds,
      recentStats.sampleCount
    );

    const servingWorkloadSeconds = etaService.calculateServingWorkload(
      servingTickets,
      effectiveDurationSeconds,
      now
    );

    // 3. Compute projected wait seconds and demand level
    const predictedWaitSeconds = this.estimateProjectedWaitSeconds({
      waitingCount,
      activeCountersCount,
      effectiveDurationSeconds,
      servingTicketsCount: servingTickets.length,
      servingWorkloadSeconds,
      forecastedFootfall,
    });

    const demandLevel = this.determineDemandLevel(predictedWaitSeconds);

    // 4. Generate operational recommendation
    const recommendation = this.generateRecommendation({
      serviceName: service.name,
      demandLevel,
      waitingCount,
      activeCountersCount,
      forecastedFootfall,
    });

    return {
      serviceId,
      serviceName: service.name,
      serviceCode: service.code,
      waitingCount,
      activeCountersCount,
      forecastedFootfallNextHour: forecastedFootfall,
      predictedWaitSeconds,
      demandLevel,
      recommendation,
      timestamp: now.toISOString(),
    };
  }

  /**
   * Recalculates predictions for all active services, persists PredictionSnapshot records,
   * and dispatches realtime update events over the in-process event bus.
   */
  async recalculateAllPredictions(): Promise<RecalculatePredictionResponseDTO> {
    const activeServices = await prisma.service.findMany({
      where: { isActive: true },
      orderBy: { priority: 'asc' },
    });

    const predictions: PredictionSummaryDTO[] = [];
    const now = new Date();

    for (const service of activeServices) {
      const pred = await this.computeServicePrediction(service);
      predictions.push(pred);

      // Persist to database (safe insert)
      await prisma.predictionSnapshot.create({
        data: {
          serviceId: service.id,
          timestamp: now,
          predictedWaitSeconds: pred.predictedWaitSeconds,
          predictedFootfall: pred.forecastedFootfallNextHour,
          demandLevel: pred.demandLevel,
          recommendation: pred.recommendation,
        },
      });

      // Post-transaction realtime event emission
      eventBus.emit(REALTIME_EVENTS.PREDICTION_UPDATED, {
        serviceId: service.id,
        predictedWaitSeconds: pred.predictedWaitSeconds,
        demandLevel: pred.demandLevel,
        timestamp: now.toISOString(),
      });
    }

    return {
      success: true,
      totalServicesProcessed: predictions.length,
      predictions,
      generatedAt: now.toISOString(),
    };
  }

  /**
   * Retrieves the latest active predictions across all active services.
   */
  async getLatestPredictions(): Promise<PredictionSummaryDTO[]> {
    const activeServices = await prisma.service.findMany({
      where: { isActive: true },
      orderBy: { priority: 'asc' },
    });

    const predictions: PredictionSummaryDTO[] = [];
    for (const service of activeServices) {
      const pred = await this.computeServicePrediction(service);
      predictions.push(pred);
    }

    return predictions;
  }

  /**
   * Lists historical prediction snapshot records with optional date / service filtering.
   */
  async listSnapshots(query: GetPredictionQueryInput): Promise<PredictionSnapshotDTO[]> {
    let whereClause: Record<string, unknown> = {};

    if (query.serviceId) {
      whereClause.serviceId = query.serviceId;
    }

    if (query.date) {
      const startOfDay = new Date(`${query.date}T00:00:00.000Z`);
      const endOfDay = new Date(`${query.date}T23:59:59.999Z`);
      whereClause = {
        ...whereClause,
        timestamp: {
          gte: startOfDay,
          lte: endOfDay,
        },
      };
    }

    const snapshots = await prisma.predictionSnapshot.findMany({
      where: whereClause,
      include: {
        service: true,
      },
      orderBy: { timestamp: 'desc' },
      take: 100,
    });

    return snapshots.map((s) => ({
      id: s.id,
      serviceId: s.serviceId,
      timestamp: s.timestamp,
      predictedWaitSeconds: s.predictedWaitSeconds,
      predictedFootfall: s.predictedFootfall,
      demandLevel: s.demandLevel as DemandLevel,
      recommendation: s.recommendation,
      createdAt: s.createdAt,
      service: s.service
        ? {
            id: s.service.id,
            code: s.service.code,
            name: s.service.name,
            description: s.service.description,
            prefix: s.service.prefix,
            avgDurationMinutes: s.service.avgDurationMinutes,
            priority: s.service.priority,
            isActive: s.service.isActive,
            createdAt: s.service.createdAt,
            updatedAt: s.service.updatedAt,
          }
        : null,
    }));
  }
}

export const predictionService = new PredictionService();
