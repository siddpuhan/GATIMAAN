import { useEffect } from 'react';
import {
  REALTIME_EVENTS,
  REALTIME_TOPICS,
  TicketUpdatedPayload,
  QueueUpdatedPayload,
  FootfallUpdatedPayload,
  PredictionUpdatedPayload,
} from '@gatimaan/shared';
import { getSocket } from '../lib/socket.js';

/**
 * Subscribes to realtime updates for a specific ticket.
 */
export function useTicketSubscription(
  ticketId: string | null | undefined,
  onUpdate: (payload: TicketUpdatedPayload) => void
): void {
  useEffect(() => {
    if (!ticketId) return;

    const socket = getSocket();

    // Subscribe to ticket room
    socket.emit(REALTIME_TOPICS.TICKET_SUBSCRIBE, { ticketId });

    // Event listener
    const handleUpdate = (payload: TicketUpdatedPayload) => {
      if (payload?.ticket?.id === ticketId) {
        onUpdate(payload);
      }
    };

    socket.on(REALTIME_EVENTS.TICKET_UPDATED, handleUpdate);

    return () => {
      socket.off(REALTIME_EVENTS.TICKET_UPDATED, handleUpdate);
      socket.emit(REALTIME_TOPICS.TICKET_UNSUBSCRIBE, { ticketId });
    };
  }, [ticketId, onUpdate]);
}

/**
 * Subscribes to realtime updates for a specific service queue.
 */
export function useQueueSubscription(
  serviceId: string | null | undefined,
  onUpdate: (payload: QueueUpdatedPayload) => void
): void {
  useEffect(() => {
    if (!serviceId) return;

    const socket = getSocket();

    // Subscribe to queue room
    socket.emit(REALTIME_TOPICS.QUEUE_SUBSCRIBE, { serviceId });

    // Event listener
    const handleUpdate = (payload: QueueUpdatedPayload) => {
      if (payload?.serviceId === serviceId) {
        onUpdate(payload);
      }
    };

    socket.on(REALTIME_EVENTS.QUEUE_UPDATED, handleUpdate);

    return () => {
      socket.off(REALTIME_EVENTS.QUEUE_UPDATED, handleUpdate);
      socket.emit(REALTIME_TOPICS.QUEUE_UNSUBSCRIBE, { serviceId });
    };
  }, [serviceId, onUpdate]);
}

/**
 * Subscribes to global footfall updates.
 */
export function useFootfallSubscription(
  onUpdate: (payload: FootfallUpdatedPayload) => void
): void {
  useEffect(() => {
    const socket = getSocket();

    socket.emit(REALTIME_TOPICS.FOOTFALL_SUBSCRIBE);

    socket.on(REALTIME_EVENTS.FOOTFALL_UPDATED, onUpdate);

    return () => {
      socket.off(REALTIME_EVENTS.FOOTFALL_UPDATED, onUpdate);
      socket.emit(REALTIME_TOPICS.FOOTFALL_UNSUBSCRIBE);
    };
  }, [onUpdate]);
}

/**
 * Subscribes to prediction updates.
 */
export function usePredictionSubscription(
  onUpdate: (payload: PredictionUpdatedPayload) => void
): void {
  useEffect(() => {
    const socket = getSocket();

    socket.emit(REALTIME_TOPICS.PREDICTION_SUBSCRIBE);

    socket.on(REALTIME_EVENTS.PREDICTION_UPDATED, onUpdate);

    return () => {
      socket.off(REALTIME_EVENTS.PREDICTION_UPDATED, onUpdate);
      socket.emit(REALTIME_TOPICS.PREDICTION_UNSUBSCRIBE);
    };
  }, [onUpdate]);
}
