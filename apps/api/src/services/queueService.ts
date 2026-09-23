import {
  TicketDTO,
  QueuePositionDTO,
  IssueTicketInput,
  TicketStatus,
  REALTIME_EVENTS,
} from '@gatimaan/shared';
import { prisma } from '../db/client.js';
import { eventBus } from '../events/eventBus.js';
import {
  NotFoundError,
  ConflictError,
  BadRequestError,
} from '../errors/appErrors.js';

export class QueueService {
  /**
   * Helper to compute and emit the current queue state for a service.
   * Runs asynchronously outside of transactional critical paths.
   */
  private async emitQueueState(serviceId: string): Promise<void> {
    try {
      const waitingCount = await prisma.ticket.count({
        where: {
          serviceId,
          status: 'WAITING',
        },
      });

      const activeCountersCount = await prisma.counterSession.count({
        where: {
          isActive: true,
          endedAt: null,
        },
      });

      eventBus.emit(REALTIME_EVENTS.QUEUE_UPDATED, {
        serviceId,
        waitingCount,
        activeCountersCount,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.error(`[QueueService] Error emitting queue update for service ${serviceId}:`, err);
    }
  }

  /**
   * Concurrency-safe ticket issuance.
   * Locks the target Service row with FOR UPDATE inside a transaction to strictly
   * serialize sequential daily numbering per service without race conditions.
   */
  async issueTicket(
    input: IssueTicketInput,
    userId?: string | null
  ): Promise<TicketDTO> {
    const ticket = await prisma.$transaction(
      async (tx) => {
        // 1. Lock the service row for update to serialize daily sequence generation for this service
        const services = await tx.$queryRaw<
          Array<{ id: string; prefix: string; is_active: boolean }>
        >`SELECT id, prefix, is_active FROM "services" WHERE id = ${input.serviceId} FOR UPDATE`;

        if (!services || services.length === 0) {
          throw new NotFoundError(`Service with ID '${input.serviceId}' not found`);
        }

        const service = services[0];
        if (!service.is_active) {
          throw new BadRequestError(`Cannot issue ticket for inactive Service`);
        }

        // 2. Compute calendar day boundary in UTC
        const startOfDay = new Date();
        startOfDay.setUTCHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setUTCHours(23, 59, 59, 999);

        // 3. Find latest ticket issued today for this service
        const latestTickets = await tx.$queryRaw<Array<{ ticket_number: string }>>`
          SELECT ticket_number FROM "tickets"
          WHERE service_id = ${input.serviceId}
            AND created_at >= ${startOfDay}
            AND created_at <= ${endOfDay}
          ORDER BY created_at DESC
          LIMIT 1
        `;

        let nextSeq = 1;
        if (latestTickets && latestTickets.length > 0) {
          const lastNumber = latestTickets[0].ticket_number;
          const match = lastNumber.match(/(\d+)$/);
          if (match) {
            nextSeq = parseInt(match[1], 10) + 1;
          }
        }

        const paddedSeq = String(nextSeq).padStart(3, '0');
        const ticketNumber = `${service.prefix}${paddedSeq}`;

        // 4. Create the new WAITING ticket
        const created = await tx.ticket.create({
          data: {
            ticketNumber,
            serviceId: input.serviceId,
            userId: userId || null,
            priority: input.priority ?? 1,
            status: 'WAITING',
            issuedAt: new Date(),
          },
          include: {
            service: {
              select: {
                id: true,
                code: true,
                name: true,
                prefix: true,
                avgDurationMinutes: true,
              },
            },
            counter: {
              select: {
                id: true,
                counterNumber: true,
                name: true,
              },
            },
          },
        });

        return {
          id: created.id,
          ticketNumber: created.ticketNumber,
          serviceId: created.serviceId,
          counterId: created.counterId,
          userId: created.userId,
          status: created.status as TicketStatus,
          priority: created.priority,
          qrCode: created.qrCode,
          issuedAt: created.issuedAt,
          calledAt: created.calledAt,
          servedAt: created.servedAt,
          completedAt: created.completedAt,
          cancelledAt: created.cancelledAt,
          estimatedWaitSeconds: created.estimatedWaitSeconds,
          createdAt: created.createdAt,
          updatedAt: created.updatedAt,
          service: created.service,
          counter: created.counter,
        };
      },
      { maxWait: 15000, timeout: 15000 }
    );

    // Emit event strictly after transaction commit
    eventBus.emit(REALTIME_EVENTS.TICKET_UPDATED, {
      ticket,
      action: 'ISSUED',
    });
    void this.emitQueueState(ticket.serviceId);

    return ticket;
  }

  /**
   * Retrieve ticket by ID.
   */
  async getTicketById(ticketId: string): Promise<TicketDTO> {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        service: {
          select: {
            id: true,
            code: true,
            name: true,
            prefix: true,
            avgDurationMinutes: true,
          },
        },
        counter: {
          select: {
            id: true,
            counterNumber: true,
            name: true,
          },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundError(`Ticket with ID '${ticketId}' not found`);
    }

    return {
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      serviceId: ticket.serviceId,
      counterId: ticket.counterId,
      userId: ticket.userId,
      status: ticket.status as TicketStatus,
      priority: ticket.priority,
      qrCode: ticket.qrCode,
      issuedAt: ticket.issuedAt,
      calledAt: ticket.calledAt,
      servedAt: ticket.servedAt,
      completedAt: ticket.completedAt,
      cancelledAt: ticket.cancelledAt,
      estimatedWaitSeconds: ticket.estimatedWaitSeconds,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      service: ticket.service,
      counter: ticket.counter,
    };
  }

  /**
   * Calculate dynamic queue position and estimated wait time.
   */
  async getQueuePosition(ticketId: string): Promise<QueuePositionDTO> {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        service: {
          select: {
            id: true,
            name: true,
            avgDurationMinutes: true,
          },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundError(`Ticket with ID '${ticketId}' not found`);
    }

    if (ticket.status !== 'WAITING') {
      return {
        ticketId: ticket.id,
        ticketNumber: ticket.ticketNumber,
        serviceId: ticket.serviceId,
        serviceName: ticket.service.name,
        status: ticket.status as TicketStatus,
        position: 0,
        aheadCount: 0,
        estimatedWaitSeconds: null,
        issuedAt: ticket.issuedAt,
      };
    }

    // Count tickets ahead in WAITING status for the same service
    const aheadCount = await prisma.ticket.count({
      where: {
        serviceId: ticket.serviceId,
        status: 'WAITING',
        OR: [
          { priority: { gt: ticket.priority } },
          {
            priority: ticket.priority,
            createdAt: { lt: ticket.createdAt },
          },
        ],
      },
    });

    const position = aheadCount + 1;
    const estimatedWaitSeconds = aheadCount * ticket.service.avgDurationMinutes * 60;

    return {
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      serviceId: ticket.serviceId,
      serviceName: ticket.service.name,
      status: ticket.status as TicketStatus,
      position,
      aheadCount,
      estimatedWaitSeconds,
      issuedAt: ticket.issuedAt,
    };
  }

  /**
   * Concurrency-safe "Call Next" operation using SELECT ... FOR UPDATE SKIP LOCKED.
   * Atomically acquires the next waiting ticket and assigns it to the operator's active counter.
   */
  async callNextTicket(
    operatorUserId: string,
    counterId: string,
    serviceId?: string
  ): Promise<TicketDTO | null> {
    const ticket = await prisma.$transaction(
      async (tx) => {
        // 1. Verify operator has an active CounterSession on this counter
        const activeSession = await tx.counterSession.findFirst({
          where: {
            counterId,
            userId: operatorUserId,
            isActive: true,
            endedAt: null,
          },
          include: {
            counter: true,
          },
        });

        if (!activeSession) {
          throw new ConflictError(
            `Operator does not have an active session on Counter '${counterId}'`
          );
        }

        if (!activeSession.counter.isActive) {
          throw new BadRequestError(
            `Counter '${activeSession.counter.name}' is inactive`
          );
        }

        // 2. Ensure counter does not already have an unfinished ticket (CALLED or SERVING)
        const unfinishedTicket = await tx.ticket.findFirst({
          where: {
            counterId,
            status: { in: ['CALLED', 'SERVING'] },
          },
        });

        if (unfinishedTicket) {
          throw new ConflictError(
            `Counter '${activeSession.counter.name}' already has an active ticket (${unfinishedTicket.ticketNumber}) in ${unfinishedTicket.status} state. Complete or skip it before calling next.`
          );
        }

        // 3. Select next waiting ticket with FOR UPDATE SKIP LOCKED
        let nextWaiting: Array<{ id: string }>;
        if (serviceId) {
          nextWaiting = await tx.$queryRaw<Array<{ id: string }>>`
            SELECT id FROM "tickets"
            WHERE service_id = ${serviceId} AND status = 'WAITING'
            ORDER BY priority DESC, created_at ASC
            LIMIT 1
            FOR UPDATE SKIP LOCKED
          `;
        } else {
          nextWaiting = await tx.$queryRaw<Array<{ id: string }>>`
            SELECT id FROM "tickets"
            WHERE status = 'WAITING'
            ORDER BY priority DESC, created_at ASC
            LIMIT 1
            FOR UPDATE SKIP LOCKED
          `;
        }

        if (!nextWaiting || nextWaiting.length === 0) {
          return null;
        }

        const targetId = nextWaiting[0].id;

        // 4. Update status to CALLED, assign counter, set calledAt
        const updated = await tx.ticket.update({
          where: { id: targetId },
          data: {
            status: 'CALLED',
            counterId,
            calledAt: new Date(),
          },
          include: {
            service: {
              select: {
                id: true,
                code: true,
                name: true,
                prefix: true,
                avgDurationMinutes: true,
              },
            },
            counter: {
              select: {
                id: true,
                counterNumber: true,
                name: true,
              },
            },
          },
        });

        return {
          id: updated.id,
          ticketNumber: updated.ticketNumber,
          serviceId: updated.serviceId,
          counterId: updated.counterId,
          userId: updated.userId,
          status: updated.status as TicketStatus,
          priority: updated.priority,
          qrCode: updated.qrCode,
          issuedAt: updated.issuedAt,
          calledAt: updated.calledAt,
          servedAt: updated.servedAt,
          completedAt: updated.completedAt,
          cancelledAt: updated.cancelledAt,
          estimatedWaitSeconds: updated.estimatedWaitSeconds,
          createdAt: updated.createdAt,
          updatedAt: updated.updatedAt,
          service: updated.service,
          counter: updated.counter,
        };
      },
      { maxWait: 15000, timeout: 15000 }
    );

    // Emit event strictly after transaction commit if a ticket was called
    if (ticket) {
      eventBus.emit(REALTIME_EVENTS.TICKET_UPDATED, {
        ticket,
        action: 'CALLED',
      });
      void this.emitQueueState(ticket.serviceId);
    }

    return ticket;
  }

  /**
   * Transition ticket from CALLED to SERVING.
   */
  async serveTicket(
    operatorUserId: string,
    ticketId: string,
    counterId: string
  ): Promise<TicketDTO> {
    const ticket = await prisma.$transaction(
      async (tx) => {
        // 1. Verify operator has active CounterSession on this counter
        const activeSession = await tx.counterSession.findFirst({
          where: {
            counterId,
            userId: operatorUserId,
            isActive: true,
            endedAt: null,
          },
        });

        if (!activeSession) {
          throw new ConflictError(
            `Operator does not have an active session on Counter '${counterId}'`
          );
        }

        // 2. Lock ticket and verify ownership and state
        const tickets = await tx.$queryRaw<
          Array<{ id: string; status: string; counter_id: string | null }>
        >`SELECT id, status, counter_id FROM "tickets" WHERE id = ${ticketId} FOR UPDATE`;

        if (!tickets || tickets.length === 0) {
          throw new NotFoundError(`Ticket with ID '${ticketId}' not found`);
        }

        const t = tickets[0];

        if (t.counter_id !== counterId) {
          throw new ConflictError(`Ticket is assigned to another counter or unassigned`);
        }

        if (t.status !== 'CALLED') {
          throw new ConflictError(
            `Cannot serve ticket in '${t.status}' state. Must be 'CALLED'.`
          );
        }

        // 3. Ensure counter doesn't already have another ticket in SERVING state
        const alreadyServing = await tx.ticket.findFirst({
          where: {
            counterId,
            status: 'SERVING',
            id: { not: ticketId },
          },
        });

        if (alreadyServing) {
          throw new ConflictError(
            `Counter already has an active serving ticket (${alreadyServing.ticketNumber})`
          );
        }

        // 4. Update ticket to SERVING
        const served = await tx.ticket.update({
          where: { id: ticketId },
          data: {
            status: 'SERVING',
            servedAt: new Date(),
          },
          include: {
            service: {
              select: {
                id: true,
                code: true,
                name: true,
                prefix: true,
                avgDurationMinutes: true,
              },
            },
            counter: {
              select: {
                id: true,
                counterNumber: true,
                name: true,
              },
            },
          },
        });

        return {
          id: served.id,
          ticketNumber: served.ticketNumber,
          serviceId: served.serviceId,
          counterId: served.counterId,
          userId: served.userId,
          status: served.status as TicketStatus,
          priority: served.priority,
          qrCode: served.qrCode,
          issuedAt: served.issuedAt,
          calledAt: served.calledAt,
          servedAt: served.servedAt,
          completedAt: served.completedAt,
          cancelledAt: served.cancelledAt,
          estimatedWaitSeconds: served.estimatedWaitSeconds,
          createdAt: served.createdAt,
          updatedAt: served.updatedAt,
          service: served.service,
          counter: served.counter,
        };
      },
      { maxWait: 15000, timeout: 15000 }
    );

    // Emit event strictly after transaction commit
    eventBus.emit(REALTIME_EVENTS.TICKET_UPDATED, {
      ticket,
      action: 'SERVING',
    });
    void this.emitQueueState(ticket.serviceId);

    return ticket;
  }

  /**
   * Transition ticket from SERVING to COMPLETED.
   */
  async completeTicket(
    operatorUserId: string,
    ticketId: string,
    counterId: string
  ): Promise<TicketDTO> {
    const ticket = await prisma.$transaction(
      async (tx) => {
        // 1. Verify operator has active CounterSession on this counter
        const activeSession = await tx.counterSession.findFirst({
          where: {
            counterId,
            userId: operatorUserId,
            isActive: true,
            endedAt: null,
          },
        });

        if (!activeSession) {
          throw new ConflictError(
            `Operator does not have an active session on Counter '${counterId}'`
          );
        }

        // 2. Lock ticket and verify ownership and state
        const tickets = await tx.$queryRaw<
          Array<{ id: string; status: string; counter_id: string | null }>
        >`SELECT id, status, counter_id FROM "tickets" WHERE id = ${ticketId} FOR UPDATE`;

        if (!tickets || tickets.length === 0) {
          throw new NotFoundError(`Ticket with ID '${ticketId}' not found`);
        }

        const t = tickets[0];

        if (t.counter_id !== counterId) {
          throw new ConflictError(`Ticket is assigned to another counter`);
        }

        if (t.status !== 'SERVING') {
          throw new ConflictError(
            `Cannot complete ticket in '${t.status}' state. Must be 'SERVING'.`
          );
        }

        // 3. Update ticket to COMPLETED
        const completed = await tx.ticket.update({
          where: { id: ticketId },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
          },
          include: {
            service: {
              select: {
                id: true,
                code: true,
                name: true,
                prefix: true,
                avgDurationMinutes: true,
              },
            },
            counter: {
              select: {
                id: true,
                counterNumber: true,
                name: true,
              },
            },
          },
        });

        return {
          id: completed.id,
          ticketNumber: completed.ticketNumber,
          serviceId: completed.serviceId,
          counterId: completed.counterId,
          userId: completed.userId,
          status: completed.status as TicketStatus,
          priority: completed.priority,
          qrCode: completed.qrCode,
          issuedAt: completed.issuedAt,
          calledAt: completed.calledAt,
          servedAt: completed.servedAt,
          completedAt: completed.completedAt,
          cancelledAt: completed.cancelledAt,
          estimatedWaitSeconds: completed.estimatedWaitSeconds,
          createdAt: completed.createdAt,
          updatedAt: completed.updatedAt,
          service: completed.service,
          counter: completed.counter,
        };
      },
      { maxWait: 15000, timeout: 15000 }
    );

    // Emit event strictly after transaction commit
    eventBus.emit(REALTIME_EVENTS.TICKET_UPDATED, {
      ticket,
      action: 'COMPLETED',
    });
    void this.emitQueueState(ticket.serviceId);

    return ticket;
  }

  /**
   * Transition ticket from CALLED to NO_SHOW (skip).
   */
  async skipTicket(
    operatorUserId: string,
    ticketId: string,
    counterId: string
  ): Promise<TicketDTO> {
    const ticket = await prisma.$transaction(
      async (tx) => {
        // 1. Verify operator has active CounterSession on this counter
        const activeSession = await tx.counterSession.findFirst({
          where: {
            counterId,
            userId: operatorUserId,
            isActive: true,
            endedAt: null,
          },
        });

        if (!activeSession) {
          throw new ConflictError(
            `Operator does not have an active session on Counter '${counterId}'`
          );
        }

        // 2. Lock ticket and verify ownership and state
        const tickets = await tx.$queryRaw<
          Array<{ id: string; status: string; counter_id: string | null }>
        >`SELECT id, status, counter_id FROM "tickets" WHERE id = ${ticketId} FOR UPDATE`;

        if (!tickets || tickets.length === 0) {
          throw new NotFoundError(`Ticket with ID '${ticketId}' not found`);
        }

        const t = tickets[0];

        if (t.counter_id !== counterId) {
          throw new ConflictError(`Ticket is assigned to another counter`);
        }

        if (t.status !== 'CALLED') {
          throw new ConflictError(
            `Cannot skip ticket in '${t.status}' state. Must be 'CALLED'.`
          );
        }

        // 3. Update ticket to NO_SHOW
        const skipped = await tx.ticket.update({
          where: { id: ticketId },
          data: {
            status: 'NO_SHOW',
          },
          include: {
            service: {
              select: {
                id: true,
                code: true,
                name: true,
                prefix: true,
                avgDurationMinutes: true,
              },
            },
            counter: {
              select: {
                id: true,
                counterNumber: true,
                name: true,
              },
            },
          },
        });

        return {
          id: skipped.id,
          ticketNumber: skipped.ticketNumber,
          serviceId: skipped.serviceId,
          counterId: skipped.counterId,
          userId: skipped.userId,
          status: skipped.status as TicketStatus,
          priority: skipped.priority,
          qrCode: skipped.qrCode,
          issuedAt: skipped.issuedAt,
          calledAt: skipped.calledAt,
          servedAt: skipped.servedAt,
          completedAt: skipped.completedAt,
          cancelledAt: skipped.cancelledAt,
          estimatedWaitSeconds: skipped.estimatedWaitSeconds,
          createdAt: skipped.createdAt,
          updatedAt: skipped.updatedAt,
          service: skipped.service,
          counter: skipped.counter,
        };
      },
      { maxWait: 15000, timeout: 15000 }
    );

    // Emit event strictly after transaction commit
    eventBus.emit(REALTIME_EVENTS.TICKET_UPDATED, {
      ticket,
      action: 'SKIPPED',
    });
    void this.emitQueueState(ticket.serviceId);

    return ticket;
  }

  /**
   * Transition ticket from WAITING or CALLED to CANCELLED.
   */
  async cancelTicket(
    ticketId: string,
    _userId?: string | null
  ): Promise<TicketDTO> {
    const ticket = await prisma.$transaction(
      async (tx) => {
        const tickets = await tx.$queryRaw<
          Array<{ id: string; status: string }>
        >`SELECT id, status FROM "tickets" WHERE id = ${ticketId} FOR UPDATE`;

        if (!tickets || tickets.length === 0) {
          throw new NotFoundError(`Ticket with ID '${ticketId}' not found`);
        }

        const t = tickets[0];

        if (t.status !== 'WAITING' && t.status !== 'CALLED') {
          throw new ConflictError(
            `Cannot cancel ticket in '${t.status}' state. Only WAITING or CALLED tickets can be cancelled.`
          );
        }

        const cancelled = await tx.ticket.update({
          where: { id: ticketId },
          data: {
            status: 'CANCELLED',
            cancelledAt: new Date(),
          },
          include: {
            service: {
              select: {
                id: true,
                code: true,
                name: true,
                prefix: true,
                avgDurationMinutes: true,
              },
            },
            counter: {
              select: {
                id: true,
                counterNumber: true,
                name: true,
              },
            },
          },
        });

        return {
          id: cancelled.id,
          ticketNumber: cancelled.ticketNumber,
          serviceId: cancelled.serviceId,
          counterId: cancelled.counterId,
          userId: cancelled.userId,
          status: cancelled.status as TicketStatus,
          priority: cancelled.priority,
          qrCode: cancelled.qrCode,
          issuedAt: cancelled.issuedAt,
          calledAt: cancelled.calledAt,
          servedAt: cancelled.servedAt,
          completedAt: cancelled.completedAt,
          cancelledAt: cancelled.cancelledAt,
          estimatedWaitSeconds: cancelled.estimatedWaitSeconds,
          createdAt: cancelled.createdAt,
          updatedAt: cancelled.updatedAt,
          service: cancelled.service,
          counter: cancelled.counter,
        };
      },
      { maxWait: 15000, timeout: 15000 }
    );

    // Emit event strictly after transaction commit
    eventBus.emit(REALTIME_EVENTS.TICKET_UPDATED, {
      ticket,
      action: 'CANCELLED',
    });
    void this.emitQueueState(ticket.serviceId);

    return ticket;
  }
}

export const queueService = new QueueService();
