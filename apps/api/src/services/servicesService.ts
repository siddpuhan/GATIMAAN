import { CreateServiceInput, UpdateServiceInput, ServiceDTO, REALTIME_EVENTS } from '@gatimaan/shared';
import { prisma } from '../db/client.js';
import { NotFoundError, ConflictError } from '../errors/appErrors.js';
import { eventBus } from '../events/eventBus.js';

export class ServicesService {
  async listServices(includeInactive = true): Promise<ServiceDTO[]> {
    const where = includeInactive ? {} : { isActive: true };
    const services = await prisma.service.findMany({
      where,
      orderBy: [{ priority: 'asc' }, { code: 'asc' }],
    });

    return services.map((s) => ({
      id: s.id,
      code: s.code,
      name: s.name,
      description: s.description,
      prefix: s.prefix,
      avgDurationMinutes: s.avgDurationMinutes,
      priority: s.priority,
      isActive: s.isActive,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }));
  }

  async getServiceById(id: string): Promise<ServiceDTO> {
    const service = await prisma.service.findUnique({
      where: { id },
    });

    if (!service) {
      throw new NotFoundError(`Service with ID '${id}' not found`);
    }

    return {
      id: service.id,
      code: service.code,
      name: service.name,
      description: service.description,
      prefix: service.prefix,
      avgDurationMinutes: service.avgDurationMinutes,
      priority: service.priority,
      isActive: service.isActive,
      createdAt: service.createdAt,
      updatedAt: service.updatedAt,
    };
  }

  async createService(data: CreateServiceInput): Promise<ServiceDTO> {
    const existingCode = await prisma.service.findUnique({
      where: { code: data.code },
    });

    if (existingCode) {
      throw new ConflictError(`Service with code '${data.code}' already exists`);
    }

    const service = await prisma.service.create({
      data: {
        code: data.code,
        name: data.name,
        description: data.description ?? null,
        prefix: data.prefix,
        avgDurationMinutes: data.avgDurationMinutes ?? 15,
        priority: data.priority ?? 1,
        isActive: data.isActive ?? true,
      },
    });

    const dto: ServiceDTO = {
      id: service.id,
      code: service.code,
      name: service.name,
      description: service.description,
      prefix: service.prefix,
      avgDurationMinutes: service.avgDurationMinutes,
      priority: service.priority,
      isActive: service.isActive,
      createdAt: service.createdAt,
      updatedAt: service.updatedAt,
    };

    eventBus.emit(REALTIME_EVENTS.SERVICE_UPDATED, {
      service: dto,
      action: 'CREATED',
    });

    return dto;
  }

  async updateService(id: string, data: UpdateServiceInput): Promise<ServiceDTO> {
    await this.getServiceById(id);

    if (data.code) {
      const existing = await prisma.service.findUnique({
        where: { code: data.code },
      });
      if (existing && existing.id !== id) {
        throw new ConflictError(`Service with code '${data.code}' already exists`);
      }
    }

    const updated = await prisma.service.update({
      where: { id },
      data: {
        ...(data.code !== undefined && { code: data.code }),
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.prefix !== undefined && { prefix: data.prefix }),
        ...(data.avgDurationMinutes !== undefined && { avgDurationMinutes: data.avgDurationMinutes }),
        ...(data.priority !== undefined && { priority: data.priority }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });

    const dto: ServiceDTO = {
      id: updated.id,
      code: updated.code,
      name: updated.name,
      description: updated.description,
      prefix: updated.prefix,
      avgDurationMinutes: updated.avgDurationMinutes,
      priority: updated.priority,
      isActive: updated.isActive,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };

    eventBus.emit(REALTIME_EVENTS.SERVICE_UPDATED, {
      service: dto,
      action: 'UPDATED',
    });

    return dto;
  }

  async setServiceStatus(id: string, isActive: boolean): Promise<ServiceDTO> {
    await this.getServiceById(id);

    const updated = await prisma.service.update({
      where: { id },
      data: { isActive },
    });

    const dto: ServiceDTO = {
      id: updated.id,
      code: updated.code,
      name: updated.name,
      description: updated.description,
      prefix: updated.prefix,
      avgDurationMinutes: updated.avgDurationMinutes,
      priority: updated.priority,
      isActive: updated.isActive,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };

    eventBus.emit(REALTIME_EVENTS.SERVICE_UPDATED, {
      service: dto,
      action: 'STATUS_CHANGED',
    });

    return dto;
  }
}

export const servicesService = new ServicesService();
