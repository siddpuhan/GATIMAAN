import React from 'react';

/**
 * LiveIndicator (Phase U1): communicates Socket.IO realtime connection state
 * to citizens in plain language. Never color-only: each state pairs an icon,
 * a dot/animation, and an explicit text label.
 *
 * These are presentation primitives ONLY — no socket logic lives here.
 * State values are intended to be fed by `useSocketConnection` (see hooks).
 */
export type LiveState = 'live' | 'updating' | 'reconnecting' | 'offline';

const LIVE_STATE_CONFIG: Record<
  LiveState,
  { label: string; dotClass: string; textClass: string; animate: boolean }
> = {
  live: {
    label: 'Live',
    dotClass: 'bg-emerald-600',
    textClass: 'text-emerald-800',
    animate: true,
  },
  updating: {
    label: 'Updating…',
    dotClass: 'bg-slate-900',
    textClass: 'text-slate-700',
    animate: true,
  },
  reconnecting: {
    label: 'Reconnecting…',
    dotClass: 'bg-amber-500',
    textClass: 'text-amber-800',
    animate: true,
  },
  offline: {
    label: 'Connection unavailable',
    dotClass: 'bg-slate-400',
    textClass: 'text-slate-600',
    animate: false,
  },
};

export function LiveIndicator({
  state,
  className = '',
}: {
  state: LiveState;
  className?: string;
}) {
  const config = LIVE_STATE_CONFIG[state];

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${config.textClass} ${className}`}
      role="status"
      aria-live="polite"
    >
      <span
        className={`w-2 h-2 rounded-full ${config.dotClass} ${config.animate ? 'animate-citizen-pulse' : ''}`}
        aria-hidden="true"
      />
      <span>{config.label}</span>
    </span>
  );
}
