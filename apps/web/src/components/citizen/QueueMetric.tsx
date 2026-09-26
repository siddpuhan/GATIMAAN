import React from 'react';

/**
 * QueueMetric (Phase U1): consistent presentation for the citizen queue
 * numbers that matter — queue position, estimated wait, desk number.
 * Numeric emphasis with a small uppercase label, designed to remain legible
 * at 320px width (stacks in a 3-col grid on mobile, larger on desktop).
 */
export function QueueMetric({
  label,
  value,
  hint,
  emphasis = 'default',
  className = '',
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  emphasis?: 'default' | 'strong';
  className?: string;
}) {
  return (
    <div className={`text-center p-3 rounded-xl bg-white border border-slate-200 ${className}`}>
      <span className="text-label text-slate-500 block uppercase tracking-wider font-bold">
        {label}
      </span>
      <span
        className={`font-mono font-black text-slate-900 block mt-0.5 ${
          emphasis === 'strong' ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl'
        }`}
      >
        {value}
      </span>
      {hint && <span className="text-caption text-slate-500 block mt-0.5">{hint}</span>}
    </div>
  );
}

/**
 * InfoRow (Phase U1): label/value detail rows for token metadata
 * (service code, priority, issued time, etc.). Replaces one-off flex rows.
 */
export function InfoRow({
  label,
  value,
  mono = false,
  className = '',
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 py-2 border-b border-slate-100 last:border-b-0 ${className}`}
    >
      <span className="text-label text-slate-500 uppercase tracking-wider font-semibold shrink-0">
        {label}
      </span>
      <span className={`text-xs font-semibold text-slate-800 text-right ${mono ? 'font-mono' : ''}`}>
        {value}
      </span>
    </div>
  );
}
