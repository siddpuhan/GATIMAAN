import React from 'react';
import { Badge } from '../ui/Badge.js';
import type { BadgeSize } from '../ui/Badge.js';

/**
 * StatusBadge (Phase U1): canonical citizen-facing ticket/queue status display.
 *
 * Maps ONLY real backend states from @gatimaan/shared TicketStatus onto
 * status colors. No invented states. Color is never the only signal —
 * every badge carries a dot plus an explicit text label.
 *
 *   WAITING    → neutral-navy "Waiting"      (in queue)
 *   CALLED     → amber "Called"              (approaching/attention)
 *   SERVING    → green "Serving"             (active)
 *   COMPLETED  → green "Completed"           (success)
 *   CANCELLED  → neutral "Cancelled"
 *   NO_SHOW    → red "No-Show"
 *   TRANSFERRED→ navy "Transferred"
 */
export type CitizenStatus =
  | 'WAITING'
  | 'CALLED'
  | 'SERVING'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW'
  | 'TRANSFERRED';

const STATUS_CONFIG: Record<
  CitizenStatus,
  { label: string; variant: 'navy' | 'success' | 'warning' | 'destructive' | 'neutral'; pulse: boolean }
> = {
  WAITING: { label: 'Waiting', variant: 'navy', pulse: true },
  CALLED: { label: 'Called', variant: 'warning', pulse: true },
  SERVING: { label: 'Serving', variant: 'success', pulse: true },
  COMPLETED: { label: 'Completed', variant: 'success', pulse: false },
  CANCELLED: { label: 'Cancelled', variant: 'neutral', pulse: false },
  NO_SHOW: { label: 'No-Show', variant: 'destructive', pulse: false },
  TRANSFERRED: { label: 'Transferred', variant: 'navy', pulse: false },
};

/** Friendly labels for service availability (derived from service.isActive). */
export type ServiceAvailability = 'AVAILABLE' | 'UNAVAILABLE';

export function StatusBadge({
  status,
  size = 'md',
  className = '',
}: {
  status: CitizenStatus;
  size?: BadgeSize;
  className?: string;
}) {
  const config = STATUS_CONFIG[status];
  return (
    <Badge
      variant={config.variant}
      size={size}
      dot
      pulse={config.pulse}
      className={className}
    >
      {config.label}
    </Badge>
  );
}

export function ServiceAvailabilityBadge({
  availability,
  size = 'sm',
  className = '',
}: {
  availability: ServiceAvailability;
  size?: BadgeSize;
  className?: string;
}) {
  return availability === 'AVAILABLE' ? (
    <Badge variant="success" size={size} dot pulse className={className}>
      Available
    </Badge>
  ) : (
    <Badge variant="neutral" size={size} dot className={className}>
      Unavailable
    </Badge>
  );
}
