import { TicketStatus } from '@gatimaan/shared';

const ACTIVE_TICKET_KEY = 'gatimaan_active_ticket_id';

/**
 * Retrieves the stored active ticket ID from localStorage.
 */
export function getActiveTicketId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_TICKET_KEY);
  } catch {
    return null;
  }
}

/**
 * Persists the active ticket ID into localStorage.
 */
export function setActiveTicketId(ticketId: string): void {
  try {
    localStorage.setItem(ACTIVE_TICKET_KEY, ticketId);
  } catch {
    // Ignore storage quota errors in private browsing modes
  }
}

/**
 * Clears the active ticket ID from localStorage.
 */
export function clearActiveTicketId(): void {
  try {
    localStorage.removeItem(ACTIVE_TICKET_KEY);
  } catch {
    // Ignore
  }
}

/**
 * Checks if a ticket status represents an active, non-terminal state.
 */
export function isActiveStatus(status: TicketStatus | string): boolean {
  return (
    status === TicketStatus.WAITING ||
    status === TicketStatus.CALLED ||
    status === TicketStatus.SERVING
  );
}

/**
 * Checks if a ticket status represents a terminal state.
 */
export function isTerminalStatus(status: TicketStatus | string): boolean {
  return (
    status === TicketStatus.COMPLETED ||
    status === TicketStatus.CANCELLED ||
    status === TicketStatus.NO_SHOW
  );
}
