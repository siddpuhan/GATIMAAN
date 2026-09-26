import React from 'react';
import { Link } from 'react-router-dom';
import { TicketDTO, TicketStatus } from '@gatimaan/shared';

interface ActiveTicketBannerProps {
  ticket: TicketDTO;
  onDismiss?: () => void;
}

export function ActiveTicketBanner({ ticket, onDismiss }: ActiveTicketBannerProps) {
  const isCalled = ticket.status === TicketStatus.CALLED;
  const isServing = ticket.status === TicketStatus.SERVING;

  return (
    <aside
      aria-label="Active Queue Pass"
      className={`w-full rounded-2xl border p-5 sm:p-6 transition-all duration-200 shadow-sm relative overflow-hidden ${
        isCalled
          ? 'bg-[#1C1408] border-amber-500/40 text-white ring-1 ring-amber-500/20'
          : 'bg-[#0B1220] border-slate-800 text-white'
      }`}
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        {/* Left & Center Information */}
        <div className="space-y-3 min-w-0">
          {/* Eyebrow & Status Indicator */}
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">
              Active Queue Pass
            </span>

            <span className="text-slate-600 hidden sm:inline">•</span>

            {isCalled ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 bg-amber-950/80 px-2.5 py-0.5 rounded-full border border-amber-500/40">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                PROCEED TO COUNTER #{ticket.counter?.counterNumber || ''}
              </span>
            ) : isServing ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-400 bg-blue-950/80 px-2.5 py-0.5 rounded-full border border-blue-500/40">
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                Now Serving at Counter #{ticket.counter?.counterNumber || ''}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Active in Queue
              </span>
            )}
          </div>

          {/* Token Number & Service Name */}
          <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-4">
            <span className="font-mono font-black text-2xl sm:text-3xl lg:text-4xl text-white tracking-tight whitespace-nowrap">
              {ticket.ticketNumber}
            </span>
            <span className="text-base sm:text-lg font-bold text-slate-200 truncate">
              {ticket.service?.name || 'Center Public Service'}
            </span>
          </div>

          {/* Supporting Explainer */}
          <p className="text-xs sm:text-sm text-slate-400 font-normal leading-relaxed max-w-2xl">
            {isCalled
              ? `Your token has been summoned! Please proceed immediately to Desk #${ticket.counter?.counterNumber || ''} (${ticket.counter?.name || 'Assigned Counter'}).`
              : isServing
              ? 'Your token is currently being processed at the counter desk.'
              : 'Track your live position and estimated waiting time in the digital queue.'}
          </p>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3 shrink-0 self-start sm:self-end lg:self-center pt-2 lg:pt-0">
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="text-xs text-slate-400 hover:text-white px-3 py-2 rounded-lg transition font-medium cursor-pointer"
            >
              Hide
            </button>
          )}

          <Link
            to={`/ticket/${ticket.id}`}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition inline-flex items-center gap-2 shadow-sm ${
              isCalled
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            <span>View Live Pass</span>
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </div>
    </aside>
  );
}
