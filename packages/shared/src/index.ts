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
