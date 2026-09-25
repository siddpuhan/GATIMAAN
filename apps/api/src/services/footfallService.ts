import {
  DeviceDTO,
  FootfallEventType,
  IngestFootfallInput,
  IngestFootfallResponseDTO,
  BatchIngestFootfallInput,
  BatchIngestFootfallResponseDTO,
  FootfallSummaryDTO,
  FootfallSnapshotDTO,
  REALTIME_EVENTS,
} from '@gatimaan/shared';
import { prisma } from '../db/client.js';
import { eventBus } from '../events/eventBus.js';

export class FootfallService {
  /**
   * Calculates the current live net occupancy for today's operating period.
   * Total IN minus Total OUT. Strictly clamped at >= 0 (never negative).
   */
  async getCurrentOccupancy(): Promise<number> {
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);

    const [countIn, countOut] = await Promise.all([
      prisma.footfallEvent.count({
        where: {
          eventType: 'IN',
          occurredAt: { gte: startOfDay },
        },
      }),
      prisma.footfallEvent.count({
        where: {
          eventType: 'OUT',
          occurredAt: { gte: startOfDay },
        },
      }),
    ]);

    return Math.max(0, countIn - countOut);
  }

  /**
   * Ingests a single footfall event from an authorized IoT hardware device / simulator.
   * Fully idempotent: duplicate (deviceId, clientEventId) records are detected and skipped
   * without creating duplicate database rows or duplicate Socket.IO broadcasts.
   */
  async ingestEvent(
    device: DeviceDTO,
    input: IngestFootfallInput
  ): Promise<IngestFootfallResponseDTO> {
    const occurredAt = input.occurredAt ? new Date(input.occurredAt) : new Date();

    // 1. Check for existing event for idempotency
    const existing = await prisma.footfallEvent.findUnique({
      where: {
        deviceId_clientEventId: {
          deviceId: device.id,
          clientEventId: input.clientEventId,
        },
      },
    });

    if (existing) {
      const currentOccupancy = await this.getCurrentOccupancy();
      return {
        success: true,
        eventId: existing.id,
        clientEventId: existing.clientEventId,
        eventType: existing.eventType as FootfallEventType,
        currentOccupancy,
        isDuplicate: true,
        processedAt: new Date().toISOString(),
      };
    }

    // 2. Insert new event (wrapped in try-catch in case of race-condition unique collision)
    let created;
    try {
      created = await prisma.footfallEvent.create({
        data: {
          deviceId: device.id,
          clientEventId: input.clientEventId,
          eventType: input.eventType,
          occurredAt,
          metadata: input.metadata ? JSON.parse(JSON.stringify(input.metadata)) : undefined,
        },
      });
    } catch (err: unknown) {
      // Handle Prisma P2002 unique constraint race condition
      const errorMsg = err instanceof Error ? err.message : String(err);
      if (errorMsg.includes('Unique constraint') || (err as { code?: string })?.code === 'P2002') {
        const duplicate = await prisma.footfallEvent.findUnique({
          where: {
            deviceId_clientEventId: {
              deviceId: device.id,
              clientEventId: input.clientEventId,
            },
          },
        });
        const currentOccupancy = await this.getCurrentOccupancy();
        return {
          success: true,
          eventId: duplicate?.id || 'duplicate',
          clientEventId: input.clientEventId,
          eventType: input.eventType,
          currentOccupancy,
          isDuplicate: true,
          processedAt: new Date().toISOString(),
        };
      }
      throw err;
    }

    // 3. Compute live occupancy and emit realtime update
    const currentOccupancy = await this.getCurrentOccupancy();

    if (input.eventType === FootfallEventType.IN || input.eventType === FootfallEventType.OUT) {
      eventBus.emit(REALTIME_EVENTS.FOOTFALL_UPDATED, {
        eventType: input.eventType,
        gateId: device.deviceId,
        currentOccupancy,
        timestamp: occurredAt.toISOString(),
      });
    }

    return {
      success: true,
      eventId: created.id,
      clientEventId: created.clientEventId,
      eventType: created.eventType as FootfallEventType,
      currentOccupancy,
      isDuplicate: false,
      processedAt: new Date().toISOString(),
    };
  }

  /**
   * Ingests a batch of footfall events from a device reconnecting after offline buffering.
   * Processes all events, skips duplicates, and emits a single consolidated realtime update.
   */
  async ingestBatch(
    device: DeviceDTO,
    input: BatchIngestFootfallInput
  ): Promise<BatchIngestFootfallResponseDTO> {
    let inserted = 0;
    let duplicates = 0;
    let lastInsertedEventType: FootfallEventType | null = null;
    let lastOccurredAt: Date = new Date();

    for (const item of input.events) {
      const occurredAt = item.occurredAt ? new Date(item.occurredAt) : new Date();

      const existing = await prisma.footfallEvent.findUnique({
        where: {
          deviceId_clientEventId: {
            deviceId: device.id,
            clientEventId: item.clientEventId,
          },
        },
      });

      if (existing) {
        duplicates++;
        continue;
      }

      try {
        await prisma.footfallEvent.create({
          data: {
            deviceId: device.id,
            clientEventId: item.clientEventId,
            eventType: item.eventType,
            occurredAt,
            metadata: item.metadata ? JSON.parse(JSON.stringify(item.metadata)) : undefined,
          },
        });
        inserted++;
        lastInsertedEventType = item.eventType;
        lastOccurredAt = occurredAt;
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        if (errorMsg.includes('Unique constraint') || (err as { code?: string })?.code === 'P2002') {
          duplicates++;
        } else {
          throw err;
        }
      }
    }

    const currentOccupancy = await this.getCurrentOccupancy();

    // If new physical footfall events were inserted, broadcast the updated state
    if (inserted > 0 && lastInsertedEventType) {
      eventBus.emit(REALTIME_EVENTS.FOOTFALL_UPDATED, {
        eventType: lastInsertedEventType,
        gateId: device.deviceId,
        currentOccupancy,
        timestamp: lastOccurredAt.toISOString(),
      });
    }

    return {
      success: true,
      totalReceived: input.events.length,
      inserted,
      duplicates,
      currentOccupancy,
    };
  }

  /**
   * Retrieves summary footfall telemetry metrics for the current operational day.
   */
  async getFootfallSummary(): Promise<FootfallSummaryDTO> {
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);

    const [eventsToday, latestEvent] = await Promise.all([
      prisma.footfallEvent.findMany({
        where: {
          occurredAt: { gte: startOfDay },
        },
        select: {
          eventType: true,
          occurredAt: true,
        },
        orderBy: { occurredAt: 'asc' },
      }),
      prisma.footfallEvent.findFirst({
        orderBy: { occurredAt: 'desc' },
        select: { occurredAt: true },
      }),
    ]);

    let countIn = 0;
    let countOut = 0;
    let runningOccupancy = 0;
    let peakOccupancy = 0;

    for (const ev of eventsToday) {
      if (ev.eventType === 'IN') {
        countIn++;
        runningOccupancy++;
      } else if (ev.eventType === 'OUT') {
        countOut++;
        runningOccupancy = Math.max(0, runningOccupancy - 1);
      }
      if (runningOccupancy > peakOccupancy) {
        peakOccupancy = runningOccupancy;
      }
    }

    return {
      currentOccupancy: Math.max(0, countIn - countOut),
      todayCountIn: countIn,
      todayCountOut: countOut,
      peakOccupancyToday: peakOccupancy,
      lastEventAt: latestEvent?.occurredAt || null,
    };
  }

  /**
   * Generates or updates an hourly FootfallSnapshot record.
   */
  async generateSnapshot(targetDate = new Date()): Promise<FootfallSnapshotDTO> {
    const startOfHour = new Date(targetDate);
    startOfHour.setUTCMinutes(0, 0, 0);
    const endOfHour = new Date(startOfHour);
    endOfHour.setUTCHours(endOfHour.getUTCHours() + 1);

    const [countIn, countOut] = await Promise.all([
      prisma.footfallEvent.count({
        where: {
          eventType: 'IN',
          occurredAt: { gte: startOfHour, lt: endOfHour },
        },
      }),
      prisma.footfallEvent.count({
        where: {
          eventType: 'OUT',
          occurredAt: { gte: startOfHour, lt: endOfHour },
        },
      }),
    ]);

    const netOccupancy = Math.max(0, countIn - countOut);

    // Find existing snapshot for this hour bucket or create a new one
    const existing = await prisma.footfallSnapshot.findFirst({
      where: {
        timestamp: startOfHour,
      },
    });

    let snapshot;
    if (existing) {
      snapshot = await prisma.footfallSnapshot.update({
        where: { id: existing.id },
        data: {
          countIn,
          countOut,
          netOccupancy,
        },
      });
    } else {
      snapshot = await prisma.footfallSnapshot.create({
        data: {
          timestamp: startOfHour,
          hourOfDay: startOfHour.getUTCHours(),
          dayOfWeek: startOfHour.getUTCDay(),
          countIn,
          countOut,
          netOccupancy,
        },
      });
    }

    return {
      id: snapshot.id,
      timestamp: snapshot.timestamp,
      hourOfDay: snapshot.hourOfDay,
      dayOfWeek: snapshot.dayOfWeek,
      countIn: snapshot.countIn,
      countOut: snapshot.countOut,
      netOccupancy: snapshot.netOccupancy,
      createdAt: snapshot.createdAt,
    };
  }

  /**
   * Lists historical footfall snapshots.
   */
  async listSnapshots(dateStr?: string): Promise<FootfallSnapshotDTO[]> {
    let whereClause = {};

    if (dateStr) {
      const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
      const endOfDay = new Date(`${dateStr}T23:59:59.999Z`);
      whereClause = {
        timestamp: {
          gte: startOfDay,
          lte: endOfDay,
        },
      };
    }

    const snapshots = await prisma.footfallSnapshot.findMany({
      where: whereClause,
      orderBy: { timestamp: 'desc' },
      take: 100,
    });

    return snapshots.map((s) => ({
      id: s.id,
      timestamp: s.timestamp,
      hourOfDay: s.hourOfDay,
      dayOfWeek: s.dayOfWeek,
      countIn: s.countIn,
      countOut: s.countOut,
      netOccupancy: s.netOccupancy,
      createdAt: s.createdAt,
    }));
  }
}

export const footfallService = new FootfallService();
