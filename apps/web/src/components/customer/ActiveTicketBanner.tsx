import React from 'react';
import { Link } from 'react-router-dom';
import { TicketDTO, TicketStatus } from '@gatimaan/shared';
import { Badge } from '../ui/Badge.js';

interface ActiveTicketBannerProps {
  ticket: TicketDTO;
  onDismiss?: () => void;
}

export function ActiveTicketBanner({ ticket, onDismiss }: ActiveTicketBannerProps) {
  const isCalled = ticket.status === TicketStatus.CALLED;

  return (
    <aside
      aria-label="Active Queue Token"
      className={`rounded-2xl p-4 sm:p-5 border transition-all duration-300 shadow-xs ${
        isCalled
          ? 'bg-amber-50 border-amber-300 text-amber-950 ring-2 ring-amber-400/30'
          : 'bg-slate-900 text-white border-slate-800'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center font-black font-mono text-xl shrink-0 ${
              isCalled
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white text-slate-900 shadow-xs'
            }`}
          >
            {ticket.ticketNumber}
          </div>

          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              {isCalled ? (
                <Badge variant="warning" size="sm" dot pulse>
                  PROCEED TO COUNTER #{ticket.counter?.counterNumber || ''}
                </Badge>
              ) : (
                <Badge variant="navy" size="sm" dot pulse className="bg-slate-800 text-slate-200 border-slate-700">
                  Active Token in Queue
                </Badge>
              )}
            </div>
            <h4
              className={`text-sm sm:text-base font-bold ${
                isCalled ? 'text-slate-900' : 'text-white'
              }`}
            >
              {ticket.service?.name || 'Center Service'}
            </h4>
            <p
              className={`text-xs ${
                isCalled ? 'text-slate-700 font-medium' : 'text-slate-300'
              }`}
            >
              {isCalled
                ? `Please proceed to Desk #${ticket.counter?.counterNumber || ''} (${ticket.counter?.name || 'Assigned Desk'})`
                : 'Track your live position and estimated waiting time'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className={`text-xs px-2.5 py-1.5 rounded-lg transition font-medium ${
                isCalled
                  ? 'text-slate-600 hover:bg-amber-100'
                  : 'text-slate-400 hover:bg-slate-800'
              }`}
            >
              Hide
            </button>
          )}

          <Link
            to={`/ticket/${ticket.id}`}
            className={`py-2 px-4 rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 shadow-xs ${
              isCalled
                ? 'bg-amber-700 text-white hover:bg-amber-800'
                : 'bg-white text-slate-900 hover:bg-slate-100'
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
