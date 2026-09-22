import {
  CreateCounterInput,
  UpdateCounterInput,
  CounterDTO,
  CounterWithSessionDTO,
  CounterSessionDTO,
} from '@gatimaan/shared';
import { prisma } from '../db/client.js';
import { NotFoundError, ConflictError, BadRequestError } from '../errors/appErrors.js';

export class CountersService {
  async listCounters(): Promise<CounterWithSessionDTO[]> {
    const counters = await prisma.counter.findMany({
      include: {
        counterSessions: {
          where: { isActive: true, endedAt: null },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: { openedAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { counterNumber: 'asc' },
    });

    return counters.map((c) => {
      const activeSession = c.counterSessions[0] || null;
      return {
        id: c.id,
        counterNumber: c.counterNumber,
        name: c.name,
        isActive: c.isActive,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        currentSession: activeSession
          ? {
              id: activeSession.id,
              counterId: activeSession.counterId,
              userId: activeSession.userId,
              openedAt: activeSession.openedAt,
              endedAt: activeSession.endedAt,
              isActive: activeSession.isActive,
              createdAt: activeSession.createdAt,
              updatedAt: activeSession.updatedAt,
              user: activeSession.user,
            }
          : null,
      };
    });
  }

  async getCounterById(id: string): Promise<CounterWithSessionDTO> {
    const counter = await prisma.counter.findUnique({
      where: { id },
      include: {
        counterSessions: {
          where: { isActive: true, endedAt: null },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: { openedAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!counter) {
      throw new NotFoundError(`Counter with ID '${id}' not found`);
    }

    const activeSession = counter.counterSessions[0] || null;

    return {
      id: counter.id,
      counterNumber: counter.counterNumber,
      name: counter.name,
      isActive: counter.isActive,
      createdAt: counter.createdAt,
      updatedAt: counter.updatedAt,
      currentSession: activeSession
        ? {
            id: activeSession.id,
            counterId: activeSession.counterId,
            userId: activeSession.userId,
            openedAt: activeSession.openedAt,
            endedAt: activeSession.endedAt,
            isActive: activeSession.isActive,
            createdAt: activeSession.createdAt,
            updatedAt: activeSession.updatedAt,
            user: activeSession.user,
          }
        : null,
    };
  }

  async createCounter(data: CreateCounterInput): Promise<CounterDTO> {
    const existing = await prisma.counter.findUnique({
      where: { counterNumber: data.counterNumber },
    });

    if (existing) {
      throw new ConflictError(`Counter with number '${data.counterNumber}' already exists`);
    }

    const counter = await prisma.counter.create({
      data: {
        counterNumber: data.counterNumber,
        name: data.name,
        isActive: data.isActive ?? true,
      },
    });

    return {
      id: counter.id,
      counterNumber: counter.counterNumber,
      name: counter.name,
      isActive: counter.isActive,
      createdAt: counter.createdAt,
      updatedAt: counter.updatedAt,
    };
  }

  async updateCounter(id: string, data: UpdateCounterInput): Promise<CounterDTO> {
    await this.getCounterById(id);

    if (data.counterNumber !== undefined) {
      const existing = await prisma.counter.findUnique({
        where: { counterNumber: data.counterNumber },
      });
      if (existing && existing.id !== id) {
        throw new ConflictError(`Counter with number '${data.counterNumber}' already exists`);
      }
    }

    const updated = await prisma.counter.update({
      where: { id },
      data: {
        ...(data.counterNumber !== undefined && { counterNumber: data.counterNumber }),
        ...(data.name !== undefined && { name: data.name }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });

    return {
      id: updated.id,
      counterNumber: updated.counterNumber,
      name: updated.name,
      isActive: updated.isActive,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  async setCounterStatus(id: string, isActive: boolean): Promise<CounterDTO> {
    await this.getCounterById(id);

    const updated = await prisma.counter.update({
      where: { id },
      data: { isActive },
    });

    return {
      id: updated.id,
      counterNumber: updated.counterNumber,
      name: updated.name,
      isActive: updated.isActive,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  async openCounterSession(counterId: string, userId: string): Promise<CounterSessionDTO> {
    return await prisma.$transaction(async (tx) => {
      const counter = await tx.counter.findUnique({
        where: { id: counterId },
      });

      if (!counter) {
        throw new NotFoundError(`Counter with ID '${counterId}' not found`);
      }

      if (!counter.isActive) {
        throw new BadRequestError(`Cannot open inactive Counter '${counter.name}'`);
      }

      const activeSession = await tx.counterSession.findFirst({
        where: {
          counterId,
          isActive: true,
          endedAt: null,
        },
      });

      if (activeSession) {
        throw new ConflictError(`Counter '${counter.name}' already has an active open session`);
      }

      const newSession = await tx.counterSession.create({
        data: {
          counterId,
          userId,
          openedAt: new Date(),
          isActive: true,
          endedAt: null,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return {
        id: newSession.id,
        counterId: newSession.counterId,
        userId: newSession.userId,
        openedAt: newSession.openedAt,
        endedAt: newSession.endedAt,
        isActive: newSession.isActive,
        createdAt: newSession.createdAt,
        updatedAt: newSession.updatedAt,
        user: newSession.user,
      };
    });
  }

  async closeCounterSession(counterId: string): Promise<CounterSessionDTO> {
    return await prisma.$transaction(async (tx) => {
      const counter = await tx.counter.findUnique({
        where: { id: counterId },
      });

      if (!counter) {
        throw new NotFoundError(`Counter with ID '${counterId}' not found`);
      }

      const activeSession = await tx.counterSession.findFirst({
        where: {
          counterId,
          isActive: true,
          endedAt: null,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      if (!activeSession) {
        throw new ConflictError(`Counter '${counter.name}' does not have an active open session to close`);
      }

      const closedSession = await tx.counterSession.update({
        where: { id: activeSession.id },
        data: {
          endedAt: new Date(),
          isActive: false,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return {
        id: closedSession.id,
        counterId: closedSession.counterId,
        userId: closedSession.userId,
        openedAt: closedSession.openedAt,
        endedAt: closedSession.endedAt,
        isActive: closedSession.isActive,
        createdAt: closedSession.createdAt,
        updatedAt: closedSession.updatedAt,
        user: closedSession.user,
      };
    });
  }
}

export const countersService = new CountersService();
