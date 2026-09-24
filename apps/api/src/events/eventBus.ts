import { EventEmitter } from 'node:events';
import {
  REALTIME_EVENTS,
  TicketUpdatedPayload,
  QueueUpdatedPayload,
  FootfallUpdatedPayload,
  PredictionUpdatedPayload,
  ServiceUpdatedPayload,
} from '@gatimaan/shared';

export interface AppEventMap {
  [REALTIME_EVENTS.TICKET_UPDATED]: TicketUpdatedPayload;
  [REALTIME_EVENTS.QUEUE_UPDATED]: QueueUpdatedPayload;
  [REALTIME_EVENTS.FOOTFALL_UPDATED]: FootfallUpdatedPayload;
  [REALTIME_EVENTS.PREDICTION_UPDATED]: PredictionUpdatedPayload;
  [REALTIME_EVENTS.SERVICE_UPDATED]: ServiceUpdatedPayload;
}

export class AppEventBus extends EventEmitter {
  emit<E extends keyof AppEventMap>(event: E, payload: AppEventMap[E]): boolean {
    return super.emit(event, payload);
  }

  on<E extends keyof AppEventMap>(event: E, listener: (payload: AppEventMap[E]) => void): this {
    return super.on(event, listener as (...args: unknown[]) => void);
  }

  off<E extends keyof AppEventMap>(event: E, listener: (payload: AppEventMap[E]) => void): this {
    return super.off(event, listener as (...args: unknown[]) => void);
  }

  once<E extends keyof AppEventMap>(event: E, listener: (payload: AppEventMap[E]) => void): this {
    return super.once(event, listener as (...args: unknown[]) => void);
  }
}

export const eventBus = new AppEventBus();
