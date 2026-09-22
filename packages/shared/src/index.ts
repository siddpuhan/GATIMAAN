export const GATIMAAN_VERSION = '0.1.0';

export interface HealthCheckResponse {
  status: 'ok' | 'error';
  timestamp: string;
  uptime: number;
  version: string;
}

// Canonical User Roles (§1)
export enum UserRole {
  CUSTOMER = 'CUSTOMER',
  ADMIN = 'ADMIN',
}

// Canonical Ticket Lifecycle States (§5)
export enum TicketStatus {
  WAITING = 'WAITING',
  CALLED = 'CALLED',
  SERVING = 'SERVING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
  TRANSFERRED = 'TRANSFERRED',
}

// Canonical Hardware Device Types (§6)
export enum DeviceType {
  GATE = 'GATE',
  KIOSK = 'KIOSK',
  DISPLAY = 'DISPLAY',
}

// Canonical Footfall Ingestion Event Types (§7)
export enum FootfallEventType {
  IN = 'IN',
  OUT = 'OUT',
  SCAN = 'SCAN',
}

// Canonical Prediction Demand Levels (§7)
export enum DemandLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  SURGE = 'SURGE',
}

// Canonical Notification Channels (§10)
export enum NotificationChannel {
  SMS = 'SMS',
  WHATSAPP = 'WHATSAPP',
  WEB_PUSH = 'WEB_PUSH',
}

// Canonical Notification Dispatch Status (§10)
export enum NotificationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
}

// Authenticated User Context Interface
export interface AuthUser {
  id: string;
  clerkUserId: string;
  email: string;
  name: string | null;
  phone: string | null;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Zod Schemas & DTO Types for Services & Counters (Phase 4)
// ---------------------------------------------------------------------------
import { z } from 'zod';

export const CreateServiceSchema = z.object({
  code: z.string().min(2, 'Code must be at least 2 characters').max(10).trim().toUpperCase(),
  name: z.string().min(1, 'Name is required').max(100).trim(),
  description: z.string().max(500).trim().optional().nullable(),
  prefix: z.string().min(1, 'Prefix is required').max(5).trim().toUpperCase(),
  avgDurationMinutes: z.number().int().positive('Average duration must be positive').default(15),
  priority: z.number().int().min(1, 'Priority must be at least 1').default(1),
  isActive: z.boolean().default(true),
});

export type CreateServiceInput = z.infer<typeof CreateServiceSchema>;

export const UpdateServiceSchema = z.object({
  code: z.string().min(2).max(10).trim().toUpperCase().optional(),
  name: z.string().min(1).max(100).trim().optional(),
  description: z.string().max(500).trim().optional().nullable(),
  prefix: z.string().min(1).max(5).trim().toUpperCase().optional(),
  avgDurationMinutes: z.number().int().positive().optional(),
  priority: z.number().int().min(1).optional(),
  isActive: z.boolean().optional(),
});

export type UpdateServiceInput = z.infer<typeof UpdateServiceSchema>;

export const ServiceStatusSchema = z.object({
  isActive: z.boolean(),
});

export type ServiceStatusInput = z.infer<typeof ServiceStatusSchema>;

export interface ServiceDTO {
  id: string;
  code: string;
  name: string;
  description: string | null;
  prefix: string;
  avgDurationMinutes: number;
  priority: number;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export const CreateCounterSchema = z.object({
  counterNumber: z.number().int().positive('Counter number must be a positive integer'),
  name: z.string().min(1, 'Name is required').max(100).trim(),
  isActive: z.boolean().default(true),
});

export type CreateCounterInput = z.infer<typeof CreateCounterSchema>;

export const UpdateCounterSchema = z.object({
  counterNumber: z.number().int().positive().optional(),
  name: z.string().min(1).max(100).trim().optional(),
  isActive: z.boolean().optional(),
});

export type UpdateCounterInput = z.infer<typeof UpdateCounterSchema>;

export const CounterStatusSchema = z.object({
  isActive: z.boolean(),
});

export type CounterStatusInput = z.infer<typeof CounterStatusSchema>;

export interface CounterSessionDTO {
  id: string;
  counterId: string;
  userId: string;
  openedAt: Date | string;
  endedAt: Date | string | null;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  user?: {
    id: string;
    name: string | null;
    email: string;
  };
}

export interface CounterDTO {
  id: string;
  counterNumber: number;
  name: string;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CounterWithSessionDTO extends CounterDTO {
  currentSession: CounterSessionDTO | null;
}

