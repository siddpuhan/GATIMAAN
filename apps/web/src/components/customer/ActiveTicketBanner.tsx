import React from 'react';
import { Link } from 'react-router-dom';
import { TicketDTO, TicketStatus } from '@gatimaan/shared';

interface ActiveTicketBannerProps {
  ticket: TicketDTO;
  onDismiss?: () => void;
}

export function ActiveTicketBanner({ ticket, onDismiss }: ActiveTicketBannerProps) {
  const isCalled = ticket.status === TicketStatus.CALLED;

  return (
    <aside
      aria-label="Active Queue Pass"
      className={`rounded-2xl p-4 sm:p-5 border transition-all duration-300 shadow-sm ${
        isCalled
          ? 'bg-amber-500/15 border-amber-400 ring-2 ring-amber-400/40 text-amber-950'
          : 'bg-blue-600 text-white border-blue-700'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center font-black font-mono text-xl shrink-0 ${
              isCalled ? 'bg-amber-500 text-white shadow-xs animate-bounce' : 'bg-white text-blue-700 shadow-xs'
            }`}
          >
            {ticket.ticketNumber}
          </div>

          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  isCalled
                    ? 'bg-amber-200 text-amber-900 font-mono'
                    : 'bg-blue-500/80 text-white border border-blue-400/50'
                }`}
              >
                {isCalled ? '🔔 Now Called to Desk' : 'Active Pass in Queue'}
              </span>
            </div>
            <h4
              className={`text-sm sm:text-base font-bold ${
                isCalled ? 'text-gray-900' : 'text-white'
              }`}
            >
              {ticket.service?.name || 'Center Service'}
            </h4>
            <p
              className={`text-xs ${
                isCalled ? 'text-gray-700 font-medium' : 'text-blue-100'
              }`}
            >
              {isCalled
                ? `Proceed to Desk #${ticket.counter?.counterNumber || ''} (${ticket.counter?.name || 'Assigned Counter'})`
                : 'Track your live position and estimated wait time'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className={`text-xs px-2.5 py-1.5 rounded-lg transition ${
                isCalled
                  ? 'text-gray-600 hover:bg-amber-200/50'
                  : 'text-blue-200 hover:bg-blue-700/50'
              }`}
            >
              Hide
            </button>
          )}

          <Link
            to={`/ticket/${ticket.id}`}
            className={`py-2 px-4 rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 shadow-xs ${
              isCalled
                ? 'bg-amber-600 text-white hover:bg-amber-700'
                : 'bg-white text-blue-700 hover:bg-blue-50'
            }`}
          >
            <span>View Live Pass</span>
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </div>
    </aside>
  );
}
